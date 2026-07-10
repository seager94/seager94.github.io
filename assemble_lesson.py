#!/usr/bin/env python3
"""
assemble_lesson.py — deterministic assembler for two-stage lesson generation

Stitches a content payload (JSON, emitted by Claude Code) into the frozen
lesson frame (assets/lesson_frame.html). The frame carries ALL boilerplate —
CSS, locked JS framework, section structure — so the model never re-emits it
and can never regress it.

Usage (from a batch folder):
    python C:\\Users\\sdavi\\projects\\seager94.github.io\\assemble_lesson.py ^
        --frame C:\\Users\\sdavi\\.claude\\skills\\interactive-html-maths-lesson\\assets\\lesson_frame.html ^
        *.payload.json

Slot grammar in the frame:  {{SLOT:name}}
Resolution order per slot name:
    meta_<field>       -> payload["meta"]["<field>"]  (hyphens in field = underscores in slot)
    title              -> payload["title"]
    header_title / header_subtitle / header_badge -> payload["header"][...]
    count_<array>      -> len(payload["arrays"]["<array>"])   (accordion badges)
    js_arrays          -> payload["arrays"] serialised as const declarations
    assembly_stamp     -> generated meta tag (assembler version + date + payload file)
    anything else      -> payload["html"]["<name>"]  (raw HTML fragment)

Hard failures (exit non-zero, no file written for that payload):
    - unknown payload_version
    - any frame slot the payload cannot supply
    - any {{SLOT: token left in the output after substitution
    - meta field empty or containing TODO/TBC/TBD
    - a practice problem with an empty q, or an empty a (use 'TEXT' for open response)

The serialiser escapes '</' as '<\\/' so no q/a/hint string can ever terminate
the <script> block, and JSON string encoding makes apostrophes/quotes in
answers structurally safe (the inline-onclick fragility class, removed at source).
"""

import argparse
import glob
import json
import re
import sys
from datetime import datetime

ASSEMBLER_VERSION = "1.0"
SLOT_RE = re.compile(r"\{\{SLOT:([A-Za-z0-9_]+)\}\}")
PLACEHOLDER_RE = re.compile(r"\bTODO\b|\bTBC\b|\bTBD\b", re.I)

REQUIRED_META = [
    "lesson-id", "ac9-descriptor", "ac9-descriptor-text", "ac9-elaborations",
    "sa-year", "sa-strand", "mapping-note", "sa-conceptual-understanding",
]


def serialise_arrays(arrays):
    """Emit const declarations. json.dumps output is valid JS; '</' is escaped
    so the payload can never break out of the <script> block."""
    parts = []
    for name, items in arrays.items():
        if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", name):
            raise ValueError(f"array name is not a valid JS identifier: {name!r}")
        js = json.dumps(items, ensure_ascii=False, indent=2)
        js = js.replace("</", "<\\/")
        parts.append(f"const {name} = {js};")
    return "\n\n  ".join(parts)


def validate_problems(arrays, errors, warnings):
    for name, items in arrays.items():
        if not isinstance(items, list):
            errors.append(f"arrays.{name} is not a list")
            continue
        for i, p in enumerate(items, 1):
            if not isinstance(p, dict):
                continue  # non-problem arrays (e.g. matchTerms) pass through untyped
            if "a" in p:
                if not str(p.get("q", "")).strip():
                    errors.append(f"{name}[{i}]: empty question")
                if not str(p.get("a", "")).strip():
                    errors.append(f"{name}[{i}]: empty answer (use 'TEXT' for open response)")
                if not str(p.get("hint", "")).strip():
                    warnings.append(f"{name}[{i}]: no hint")


def resolve_slot(name, payload, payload_file):
    if name == "js_arrays":
        return serialise_arrays(payload.get("arrays", {}))
    if name == "assembly_stamp":
        return (f'<meta name="assembled" content="assemble_lesson.py v{ASSEMBLER_VERSION} '
                f'{datetime.now():%Y-%m-%d} from {payload_file}">')
    if name == "title":
        return payload["title"]
    if name.startswith("header_"):
        return payload["header"][name[len("header_"):]]
    if name.startswith("meta_"):
        return payload["meta"][name[len("meta_"):].replace("_", "-")]
    if name.startswith("count_"):
        return str(len(payload["arrays"][name[len("count_"):]]))
    return payload["html"][name]


def assemble(frame_text, payload_path):
    errors, warnings = [], []
    with open(payload_path, encoding="utf-8") as f:
        payload = json.load(f)

    if payload.get("payload_version") != 1:
        return None, [f"unknown payload_version: {payload.get('payload_version')!r}"], []

    meta = payload.get("meta", {})
    for field in REQUIRED_META:
        val = str(meta.get(field, "")).strip()
        if not val:
            errors.append(f"meta.{field} missing or empty")
        elif PLACEHOLDER_RE.search(val):
            errors.append(f"meta.{field} is a placeholder: '{val[:50]}'")

    validate_problems(payload.get("arrays", {}), errors, warnings)

    out = frame_text
    missing = []
    for slot in sorted(set(SLOT_RE.findall(frame_text))):
        try:
            value = resolve_slot(slot, payload, payload_path)
        except (KeyError, ValueError) as e:
            missing.append(f"frame needs slot '{slot}' — payload cannot supply it ({e})")
            continue
        out = out.replace("{{SLOT:" + slot + "}}", str(value))
    errors.extend(missing)

    leftover = SLOT_RE.findall(out)
    if leftover:
        errors.append(f"unresolved slot tokens remain in output: {sorted(set(leftover))}")

    fname = payload.get("filename", "")
    if not fname.endswith(".html"):
        errors.append(f"payload.filename missing or not .html: {fname!r}")

    return (fname, out), errors, warnings


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--frame", required=True, help="path to lesson_frame.html")
    ap.add_argument("payloads", nargs="+", help="*.payload.json (wildcards OK)")
    args = ap.parse_args()

    with open(args.frame, encoding="utf-8") as f:
        frame_text = f.read()
    if not SLOT_RE.search(frame_text):
        sys.exit(f"FAIL: no {{{{SLOT:...}}}} tokens found in {args.frame} — is this the frame, "
                 f"or the original template?")

    paths = []
    for pat in args.payloads:
        paths.extend(sorted(glob.glob(pat)))
    if not paths:
        sys.exit("no payload files matched")

    any_fail = False
    for p in paths:
        try:
            result, errors, warnings = assemble(frame_text, p)
        except json.JSONDecodeError as e:
            result, errors, warnings = None, [f"invalid JSON: {e}"], []

        if errors:
            any_fail = True
            print(f"[FAIL] {p}")
            for e in errors:
                print(f"    ✗ {e}")
        else:
            fname, html = result
            with open(fname, "w", encoding="utf-8") as f:
                f.write(html)
            kb = len(html.encode("utf-8")) // 1024
            print(f"[OK]   {p} -> {fname} ({kb} KB)")
        for w in warnings:
            print(f"    ! {w}")

    print("\nNext: python qa_lessons.py *.html  then click-test.")
    sys.exit(1 if any_fail else 0)


if __name__ == "__main__":
    main()
