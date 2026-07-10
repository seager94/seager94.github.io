#!/usr/bin/env python3
"""
qa_lessons.py — post-batch QA gate for generated interactive HTML lessons

Run after a batch, before renaming/publishing. Catches, per file:

  FAIL-class (blocks publish):
    - file smaller than the plausible-lesson floor (default 30 KB)
    - any of the 8 locked framework functions missing
    - 'TODO' anywhere in a <meta> tag (the y7-elaborations failure class)
    - a required curriculum <meta> field missing or empty

  WARN-class (eyeball before publish):
    - external dependency: http(s):// inside src= / <link href= / @import
      (lessons must run offline)
    - 'TODO' anywhere else in the file
    - an expected answer wired into an onclick that contains a quote/backslash
      (breaks the Check button silently — the inline-answer fragility)
    - practice answers that are empty strings

Usage:
    python qa_lessons.py *.html
    python qa_lessons.py y10_num_*.html --min-kb 25
Exit code: 0 all pass, 1 any FAIL (so it can gate a script).
"""

import argparse
import glob
import re
import sys

LOCKED_FUNCTIONS = [
    "buildPractice", "checkAnswer", "answerMatches", "formatAnswerDisplay",
    "updateProgress", "toggleHint", "toggleAnswer", "toggleTier",
]

REQUIRED_META = [
    "lesson-id", "ac9-descriptor", "ac9-elaborations",
    "sa-year", "sa-strand", "mapping-note", "sa-conceptual-understanding",
]

META_RE = re.compile(r'<meta\s+name="([^"]+)"\s+content="([^"]*)"', re.I)
EXTERNAL_RE = re.compile(r'(?:src\s*=\s*["\']|<link[^>]+href\s*=\s*["\']|@import\s+["\'(]+)\s*(https?://[^"\')\s]+)', re.I)
ONCLICK_ANSWER_RE = re.compile(r"checkAnswer\('[^']*',\s*'([^']*)'")
ANSWER_FIELD_RE = re.compile(r"""\ba\s*:\s*(['"])(.*?)\1""")


def qa_file(path, min_bytes):
    fails, warns = [], []
    try:
        with open(path, encoding="utf-8", errors="replace") as f:
            text = f.read()
    except OSError as e:
        return [f"unreadable: {e}"], []

    size = len(text.encode("utf-8", errors="replace"))
    if size < min_bytes:
        fails.append(f"only {size // 1024} KB — smaller than a plausible lesson (floor {min_bytes // 1024} KB)")

    for fn in LOCKED_FUNCTIONS:
        # toggleTier only exists on templates with accordion tiers; missing => warn not fail
        if f"function {fn}" not in text:
            (warns if fn == "toggleTier" else fails).append(f"locked function missing: {fn}")

    metas = {m.group(1).lower(): m.group(2) for m in META_RE.finditer(text)}
    for field in REQUIRED_META:
        val = metas.get(field, None)
        if val is None or not val.strip():
            fails.append(f"<meta name=\"{field}\"> missing or empty")
        elif "TODO" in val.upper() or val.strip().upper() in {"TBC", "TBD"}:
            fails.append(f"<meta name=\"{field}\"> is a placeholder: '{val[:50]}'")

    # TODO outside meta tags
    stripped = META_RE.sub("", text)
    for m in re.finditer(r".{0,40}TODO.{0,40}", stripped):
        warns.append(f"TODO in body: …{m.group(0).strip()}…")
        break  # one example is enough

    for m in EXTERNAL_RE.finditer(text):
        warns.append(f"external dependency (must work offline): {m.group(1)[:70]}")

    for m in ONCLICK_ANSWER_RE.finditer(text):
        ans = m.group(1)
        if "\\" in ans or '"' in ans:
            warns.append(f"answer wired into onclick contains quote/backslash — Check button may be broken: '{ans[:40]}'")

    empties = [m for m in ANSWER_FIELD_RE.finditer(text) if not m.group(2).strip()]
    if empties:
        warns.append(f"{len(empties)} practice answer(s) are empty strings")

    return fails, warns


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="+", help="lesson HTML files (wildcards OK)")
    ap.add_argument("--min-kb", type=int, default=30)
    args = ap.parse_args()

    paths = []
    for pat in args.files:
        paths.extend(sorted(glob.glob(pat)))
    if not paths:
        sys.exit("no files matched")

    any_fail = False
    for p in paths:
        fails, warns = qa_file(p, args.min_kb * 1024)
        verdict = "FAIL" if fails else ("WARN" if warns else "PASS")
        any_fail |= bool(fails)
        print(f"[{verdict}] {p}")
        for f in fails:
            print(f"    ✗ {f}")
        for w in warns:
            print(f"    ! {w}")

    print(f"\n{len(paths)} file(s) checked — {'FAILURES PRESENT' if any_fail else 'no failures'}.")
    print("Reminder: this gate does NOT replace the click test (wrong answer → red, right answer → green).")
    sys.exit(1 if any_fail else 0)


if __name__ == "__main__":
    main()
