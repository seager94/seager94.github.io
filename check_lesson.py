#!/usr/bin/env python3
"""
check_lesson.py - automated browser check for one interactive HTML lesson.

Drives the lesson in headless Chromium (Playwright) and replaces most of the
manual red/green click test. Per lesson it checks:

  Structure     Section 0 warm-up has 2-3 unscored questions; exit ticket exists;
                Building/Stretch/Mastery counts (WARN unless 10/6/4); no TODO in
                any <meta>; lesson-focus meta and the visible curriculum panel
                match the lessonmap row for this lesson-id.
  Marking       every auto-marked question: wrong answer -> red, stored answer ->
                green; every misconception (fb) entry displays its message; the
                progress counter reaches N / N.
  Interactions  every accordion, step reveal, proof, flip card, drag-sort, match
                and order list - with the mouse, then drag-sorts, matches and
                order lists again under iPad touch emulation.
  Figures       per inline SVG: FAIL if a <text> box leaves the SVG viewport,
                WARN if two <text> boxes overlap; every SVG goes into one
                contact sheet (check-output/<lesson-id>-figures.png).
  Console       FAIL on any console error or uncaught page error.
  QA scripts    runs qa_lessons.py and verify_answers.py on the file.

Writes check-output/<lesson-id>-report.md and exits 1 on any FAIL.

Usage:
    python check_lesson.py year-9/measurement/y9_mea_01_..._v2.html
    python check_lesson.py lesson.html --lessonmap lessonmap.json --out-dir check-output

Setup (once):
    pip install playwright==1.56.0   (pinned to match .github/workflows/lesson-checks.yml)
    python -m playwright install chromium
"""

import argparse
import base64
import html
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent

TIER_TARGETS = [("Building", 1, 10), ("Stretch", 2, 6), ("Mastery", 3, 4)]

# Drag-sort widgets: chip selector + its answer attribute, bucket selector + its attribute.
# A chip is placed correctly when chip.closest(bucket).dataset[bucket_attr] == chip.dataset[chip_attr].
DRAG_SORTS = [
    {"name": "bucket sort", "chip": ".term-chip[data-type]", "chip_attr": "type",
     "bucket": ".bucket[data-bucket]", "bucket_attr": "bucket"},
    {"name": "always/sometimes/never sort", "chip": ".asn-chip[data-truth]", "chip_attr": "truth",
     "bucket": ".asn-bucket[data-truth]", "bucket_attr": "truth"},
]

# A misdrop bounces back after a 600 ms shake, so wait a little longer before re-checking.
BOUNCE_MS = 750
TEXT_EDGE_TOL = 1.0      # px a <text> box may poke past the SVG edge (anti-aliasing)
OVERLAP_MIN_PX = 2.0     # both overlap dimensions must exceed this ...
OVERLAP_MIN_FRAC = 0.25  # ... and the vertical overlap must exceed this share of the shorter box


# ---------------------------------------------------------------- report ----

class Report:
    AREAS = ["Structure", "Marking", "Interactions (mouse)", "Interactions (iPad touch)",
             "Figures", "Console", "QA scripts"]

    def __init__(self):
        self.items = []   # (level, area, message)
        self.notes = {}   # area -> list of info lines
        self.raw = {}     # title -> raw text block for the report

    def add(self, level, area, msg):
        self.items.append((level, area, msg))

    def fail(self, area, msg): self.add("FAIL", area, msg)
    def warn(self, area, msg): self.add("WARN", area, msg)
    def ok(self, area, msg): self.add("PASS", area, msg)
    def info(self, area, msg): self.add("INFO", area, msg)

    def level(self, area=None):
        levels = {lv for lv, a, _ in self.items if area is None or a == area}
        if "FAIL" in levels:
            return "FAIL"
        if "WARN" in levels:
            return "WARN"
        return "PASS" if levels else "SKIP"

    def of(self, area, *levels):
        return [m for lv, a, m in self.items if a == area and lv in levels]

    def of_all(self, level):
        return [m for lv, _, m in self.items if lv == level]


# ------------------------------------------------------------ text utils ----

def norm(s):
    """Whitespace/typography-insensitive comparison form (entities, nbsp, curly quotes, dashes)."""
    s = html.unescape(s or "")
    s = s.replace(" ", " ").replace("’", "'").replace("‘", "'")
    s = s.replace("“", '"').replace("”", '"').replace("–", "-").replace("—", "-")
    return re.sub(r"\s+", " ", s).strip().rstrip(" .")


CODE_RE = r"(?:AC9M\d+)?([A-Z]{1,2}\d{2})\b"   # AC9M8ST02 or ST02 -> ST02


def elab_map(s, codes):
    """'AC9M8ST02: 1,2,3,4; AC9M8ST01: 2' and '1,2,3,4 (ST02); 2 (ST01)' -> {'ST02': {1,2,3,4}, 'ST01': {2}}.
    A part that names no descriptor belongs to the only descriptor (None if there are several)."""
    default = re.search(CODE_RE, codes[0]).group(1) if len(codes) == 1 and re.search(CODE_RE, codes[0]) else None
    out = {}
    for part in re.split(r"[;|]", s or ""):
        code = re.search(CODE_RE, part)
        nums = re.findall(r"\d+", re.sub(CODE_RE, " ", part))
        if nums:
            out.setdefault(code.group(1) if code else default, set()).update(int(n) for n in nums)
    return out


def read_metas(text):
    metas = {}
    text = re.sub(r"<!--.*?-->", "", text, flags=re.S)   # payload builds carry template docs in comments
    for tag in re.findall(r"<meta\b[^>]*>", text, re.I):
        name = re.search(r'\bname\s*=\s*"([^"]*)"', tag, re.I)
        content = re.search(r'\bcontent\s*=\s*"([^"]*)"', tag, re.I)
        metas[(name.group(1) if name else tag).lower()] = (content.group(1) if content else "", tag)
    return metas


def diff_hint(got, want):
    """Show both strings from just before the first difference."""
    a, b = norm(got), norm(want)
    i = next((k for k in range(min(len(a), len(b))) if a[k] != b[k]), min(len(a), len(b)))
    cut = lambda s: ("…" if i > 25 else "") + short(s[max(0, i - 25):], 60)
    return f"lesson '{cut(a)}' vs lessonmap '{cut(b)}'"


def short(s, n=70):
    s = re.sub(r"\s+", " ", s or "").strip()
    return s if len(s) <= n else s[: n - 1] + "…"


# ------------------------------------------------------- static checks ------

def check_static(text, lessonmap_path, rep):
    area = "Structure"
    metas = read_metas(text)

    todo = [n for n, (c, tag) in metas.items() if "TODO" in tag.upper()]
    for n in todo:
        rep.fail(area, f'TODO in <meta name="{n}">')
    if not todo:
        rep.ok(area, f"no TODO in {len(metas)} meta tags")

    lesson_id = metas.get("lesson-id", ("", ""))[0].strip()
    if not lesson_id:
        rep.fail(area, '<meta name="lesson-id"> missing or empty')

    row = None
    try:
        data = json.loads(Path(lessonmap_path).read_text(encoding="utf-8"))
        rows = data["lessons"] if isinstance(data, dict) else data
        row = next((r for r in rows if r.get("id") == lesson_id), None)
        if lesson_id and row is None:
            rep.fail(area, f"lesson-id {lesson_id} has no row in {lessonmap_path}")
    except (OSError, ValueError, KeyError) as e:
        rep.fail(area, f"cannot read lessonmap {lessonmap_path}: {e}")

    if row:
        focus = metas.get("lesson-focus", ("", ""))[0]
        if norm(focus) == norm(row.get("lesson_focus", "")):
            rep.ok(area, "lesson-focus meta matches lessonmap row")
        else:
            rep.fail(area, f"lesson-focus meta differs from lessonmap row: {diff_hint(focus, row.get('lesson_focus', ''))}")
        # Other metas vs row: not in the brief's FAIL list, so WARN only.
        expect = {
            "sa-year": str(row.get("year", "")),
            "sa-strand": row.get("strand", ""),
            "sa-conceptual-understanding": row.get("sa_conceptual_understanding", ""),
            "mapping-note": row.get("mapping_note", ""),
        }
        for name, want in expect.items():
            got = metas.get(name, ("", ""))[0]
            if want and norm(got) != norm(want):
                rep.warn(area, f"meta {name} '{short(got, 50)}' differs from lessonmap '{short(want, 50)}'")
        got_codes = set(re.findall(r"AC9\w+", metas.get("ac9-descriptor", ("", ""))[0]))
        if got_codes != set(row.get("ac9_descriptors", [])):
            rep.warn(area, f"meta ac9-descriptor {sorted(got_codes)} differs from lessonmap {row.get('ac9_descriptors')}")
        codes = row.get("ac9_descriptors", [])
        if elab_map(metas.get("ac9-elaborations", ("", ""))[0], codes) != elab_map(str(row.get("elaborations", "")), codes):
            rep.warn(area, f"meta ac9-elaborations differs from lessonmap '{row.get('elaborations')}'")
    return lesson_id, row


def check_panel(panel, row, rep):
    """panel: {label: value} from the visible curriculum panel."""
    area = "Structure"
    if not panel:
        rep.fail(area, "visible curriculum panel (.cl-row) not found")
        return
    if not row:
        return

    def get(label_re):
        for k, v in panel.items():
            if re.search(label_re, k, re.I):
                return v
        return None

    checks = []
    v = get(r"year.*strand")
    if v is None:
        checks.append("Year & Strand row missing")
    elif not (re.search(rf"\bYear\s*{re.escape(str(row['year']))}\b", v) and norm(row["strand"]).lower() in norm(v).lower()):
        checks.append(f"Year & Strand shows '{short(v, 40)}', row is Year {row['year']} {row['strand']}")
    v = get(r"conceptual")
    if v is None:
        checks.append("Conceptual understanding row missing")
    elif norm(v) != norm(row.get("sa_conceptual_understanding", "")):
        checks.append(f"Conceptual understanding '{short(v, 50)}' differs from row")
    v = get(r"descriptor")
    if v is None:
        checks.append("AC9 descriptor row missing")
    elif set(re.findall(r"AC9\w+", v)) != set(row.get("ac9_descriptors", [])):
        checks.append(f"AC9 descriptor codes {sorted(set(re.findall(r'AC9[A-Z0-9]+', v)))} differ from row {row.get('ac9_descriptors')}")
    v = get(r"elaboration")
    if v is None:
        checks.append("Elaborations row missing")
    elif elab_map(v, row.get("ac9_descriptors", [])) != elab_map(str(row.get("elaborations", "")), row.get("ac9_descriptors", [])):
        checks.append(f"Elaborations '{v}' differ from row '{row.get('elaborations')}'")
    v = get(r"focus")
    if v is None:
        checks.append("Lesson focus row missing")
    elif norm(v) != norm(row.get("lesson_focus", "")):
        checks.append(f"Lesson focus differs from row: {diff_hint(v, row.get('lesson_focus', ''))}")

    for c in checks:
        rep.fail(area, "curriculum panel: " + c)
    if not checks:
        rep.ok(area, "curriculum panel matches lessonmap row (year/strand, CU, descriptors, elaborations, focus)")


# -------------------------------------------------------- browser bits ------

JS_STRUCTURE = r"""
() => {
  const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
  const secs = [...document.querySelectorAll('section')];
  const byNum = n => secs.find(s => txt(s.querySelector('h2 .sec-num')) === n);
  const sec0 = document.querySelector('section.retrieval') || byNum('0');
  const exit = document.querySelector('section.exit-ticket') ||
               secs.find(s => /exit ticket/i.test(txt(s.querySelector('h2'))));
  const qids = s => s ? [...s.querySelectorAll('input.problem-input')].map(i => i.id.slice(4)) : [];
  const tiers = {};
  [1, 2, 3].forEach(n => {
    const s = document.querySelector('section.difficulty-' + n);
    tiers[n] = s ? s.querySelectorAll('.problem').length : null;
  });
  const panel = {};
  document.querySelectorAll('.cl-row').forEach(r => {
    const l = r.querySelector('.cl-label'), v = r.querySelector('.cl-value');
    if (l && v) panel[txt(l)] = txt(v);
  });
  return {
    sec0: sec0 ? { problems: sec0.querySelectorAll('.problem').length, ids: qids(sec0) } : null,
    exit: exit ? { problems: exit.querySelectorAll('.problem').length } : null,
    tiers, panel,
  };
}
"""

JS_SHOWN = r"""
el => {
  for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
  }
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}
"""


def class_of(page, selector):
    return page.eval_on_selector(selector, "e => e.className") or ""


def ensure_pair_in_view(page, a, b):
    """Scroll so both locators are inside the viewport; return their (fresh) boxes."""
    a.scroll_into_view_if_needed()
    ba, bb = a.bounding_box(), b.bounding_box()
    vh = page.viewport_size["height"]
    top, bottom = min(ba["y"], bb["y"]), max(ba["y"] + ba["height"], bb["y"] + bb["height"])
    if top < 0 or bottom > vh:
        # behavior 'instant' overrides a lesson's `html { scroll-behavior: smooth }`. Older Chromium
        # (e.g. build 1194) animates a plain scrollBy for ~1 s, so the boxes would be read mid-scroll
        # and the drag aimed at where the chip and bucket used to be.
        page.evaluate("dy => window.scrollBy({top: dy, behavior: 'instant'})", (top + bottom) / 2 - vh / 2)
        page.wait_for_timeout(50)
        ba, bb = a.bounding_box(), b.bounding_box()
    return ba, bb


def centre(box):
    return box["x"] + box["width"] / 2, box["y"] + box["height"] / 2


def drag(page, src, dst, mode, cdp=None):
    (x, y), (tx, ty) = centre(src), centre(dst)
    steps = 10
    if mode == "mouse":
        page.mouse.move(x, y)
        page.mouse.down()
        page.mouse.move(tx, ty, steps=steps)
        page.mouse.up()
    else:  # real touch events through the input pipeline (honours touch-action, pointercancel)
        cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": y}]})
        for i in range(1, steps + 1):
            f = i / steps
            cdp.send("Input.dispatchTouchEvent", {"type": "touchMove",
                     "touchPoints": [{"x": x + (tx - x) * f, "y": y + (ty - y) * f}]})
        # Hold still before lifting, as a finger does. Lifting mid-move reads as a fling,
        # and Chromium then swallows the next tap as "stop the fling" (a checker artefact).
        page.wait_for_timeout(120)
        cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": tx, "y": ty}]})
        cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})


def press(loc, mode):
    if mode == "mouse":
        loc.click()
    else:
        loc.tap()


def run_drag_sorts(page, rep, area, mode, cdp=None):
    for fam in DRAG_SORTS:
        n = page.evaluate(
            "([sel, pre]) => { const c = [...document.querySelectorAll(sel)];"
            " c.forEach((e, i) => e.dataset.ckid = pre + i); return c.length; }",
            [fam["chip"], fam["chip_attr"]])
        if not n:
            continue
        placed_js = ("([sel, ca, bsel, ba]) => [...document.querySelectorAll(sel)].map(c => {"
                     " const b = c.closest(bsel); return [c.dataset.ckid, c.dataset[ca], b ? b.dataset[ba] : null]; })")
        args = [fam["chip"], fam["chip_attr"], fam["bucket"], fam["bucket_attr"]]
        failures = []
        for _ in range(n + 2):
            todo = [(cid, want) for cid, want, got in page.evaluate(placed_js, args) if got != want]
            if not todo:
                break
            cid, want = todo[0]
            chip = page.locator(f'[data-ckid="{cid}"]')
            bucket = page.locator(f'{fam["bucket"].split("[")[0]}[data-{fam["bucket_attr"]}="{want}"]').first
            if bucket.count() == 0:
                failures.append(f"no bucket for answer '{want}'")
                break
            label = short(chip.text_content(), 40)
            try:
                b_chip, b_bucket = ensure_pair_in_view(page, chip, bucket)
                drag(page, b_chip, b_bucket, mode, cdp)
            except Exception as e:  # noqa: BLE001 - report, keep checking
                failures.append(f"could not drag '{label}': {short(str(e), 80)}")
                break
            page.wait_for_timeout(60)
            got = dict((c, g) for c, _, g in page.evaluate(placed_js, args)).get(cid)
            if got != want:
                page.wait_for_timeout(BOUNCE_MS)
                failures.append(f"'{label}' dropped on '{want}' did not stay there")
                break
        final = page.evaluate(placed_js, args)
        wrong = [c for c, want, got in final if got != want]
        if wrong or failures:
            rep.fail(area, f"{fam['name']}: {n - len(wrong)}/{n} chips sorted"
                     + (f" - {failures[0]}" if failures else ""))
        else:
            rep.ok(area, f"{fam['name']}: all {n} chips dragged into the right bucket")


def run_matches(page, rep, area, mode):
    n = page.evaluate("() => { const c = [...document.querySelectorAll('.match-chip[data-group]')];"
                      " c.forEach((e, i) => e.dataset.ckmatch = i); return c.length; }")
    if not n:
        return
    state_js = ("() => [...document.querySelectorAll('.match-chip[data-group]')]"
                ".map(c => [c.dataset.ckmatch, c.dataset.group, /\\bmatched-/.test(c.className)])")
    problem = None
    for _ in range(n):
        open_ = [(i, g) for i, g, m in page.evaluate(state_js) if not m]
        if not open_:
            break
        i, g = open_[0]
        partner = next((j for j, h in open_[1:] if h == g), None)
        if partner is None:
            problem = f"chip group {g} has no unmatched partner"
            break
        try:
            press(page.locator(f'[data-ckmatch="{i}"]'), mode)
            press(page.locator(f'[data-ckmatch="{partner}"]'), mode)
        except Exception as e:  # noqa: BLE001
            problem = f"could not press match chip: {short(str(e), 80)}"
            break
        st = {k: m for k, _, m in page.evaluate(state_js)}
        if not (st[i] and st[partner]):
            problem = f"pair in group {g} not marked as matched"
            break
    done = sum(1 for _, _, m in page.evaluate(state_js) if m)
    if problem or done != n:
        rep.fail(area, f"match: {done}/{n} chips matched" + (f" - {problem}" if problem else ""))
    else:
        fb = page.locator("#matchFeedback")
        extra = f" (feedback: '{short(fb.text_content(), 50)}')" if fb.count() else ""
        rep.ok(area, f"match: all {n // 2} pairs matched{extra}")


def run_order_lists(page, rep, area, mode):
    lists = page.evaluate("() => [...document.querySelectorAll('.order-list')]"
                          ".filter(l => l.querySelector('.order-card[data-correct-pos]')).map(l => l.id)")
    for lid in lists:
        if not lid:
            rep.warn(area, "order list without an id - skipped")
            continue
        lst = page.locator(f'[id="{lid}"]')
        n = lst.locator(".order-card").count()
        try:
            for pos in range(1, n + 1):
                for _ in range(n):
                    idx = page.evaluate(
                        "([id, p]) => [...document.getElementById(id).children]"
                        ".findIndex(c => c.dataset.correctPos == p)", [lid, pos])
                    if idx <= pos - 1:
                        break
                    press(lst.locator(f'.order-card[data-correct-pos="{pos}"] .order-buttons button').first, mode)
            block = lst.locator("xpath=..")
            press(block.locator(".order-check").first, mode)
        except Exception as e:  # noqa: BLE001
            rep.fail(area, f"order list {lid}: could not complete - {short(str(e), 80)}")
            continue
        good = lst.locator(".order-card.correct").count()
        if good == n:
            rep.ok(area, f"order list {lid}: all {n} cards ordered and marked correct")
        else:
            rep.fail(area, f"order list {lid}: {good}/{n} cards marked correct after ordering")


def run_mouse_interactions(page, rep):
    area = "Interactions (mouse)"

    # Accordions (tier sections) - closed ones open; an open one closes and reopens.
    heads = page.locator(".tier-accordion > .accordion-head")
    for k in range(heads.count()):
        head = heads.nth(k)
        sec_id = head.evaluate("h => h.closest('.tier-accordion').id")
        is_open = lambda: head.evaluate("h => h.closest('.tier-accordion').classList.contains('open')")
        seq = [False, True] if is_open() else [True]
        ok = True
        for want in seq:
            head.click()
            page.wait_for_timeout(80)
            if is_open() != want:
                ok = False
        body_visible = head.evaluate("h => { const b = h.parentElement.querySelector('.accordion-body');"
                                     " return !b || getComputedStyle(b).display !== 'none'; }")
        if ok and body_visible:
            rep.ok(area, f"accordion #{sec_id} toggles and its body shows")
        else:
            rep.fail(area, f"accordion #{sec_id} did not toggle open/closed correctly")
    for k in range(page.locator("details").count()):
        d = page.locator("details").nth(k)
        if not d.evaluate("d => d.open"):
            d.locator("summary").first.click()
        if d.evaluate("d => d.open"):
            rep.ok(area, f"<details> '{short(d.locator('summary').first.text_content(), 30)}' opens")
        else:
            rep.fail(area, f"<details> '{short(d.locator('summary').first.text_content(), 30)}' did not open")

    # Step reveals (worked examples)
    btns = page.locator(".reveal-btn")
    for k in range(btns.count()):
        b = btns.nth(k)
        bid = b.get_attribute("id") or f"reveal-btn {k + 1}"
        if not b.is_visible():
            rep.info(area, f"{bid} not visible (teacher mode only?) - skipped")
            continue
        clicks = 0
        while b.is_visible() and b.is_enabled() and clicks < 20:
            b.click()
            clicks += 1
        hidden = b.evaluate("b => { const w = b.closest('.worked') || b.parentElement;"
                            " return [...w.querySelectorAll('.step')].filter(s => !s.classList.contains('visible')).map(s => s.id); }")
        total = b.evaluate("b => (b.closest('.worked') || b.parentElement).querySelectorAll('.step').length")
        if hidden or b.is_enabled():
            rep.fail(area, f"{bid}: after {clicks} clicks, steps still hidden: {hidden or '(button still enabled)'}")
        else:
            rep.ok(area, f"{bid}: {total} steps revealed in {clicks} clicks")

    # Proofs (step-through SVG builds)
    ctrls = page.locator(".proof-controls")
    for k in range(ctrls.count()):
        c = ctrls.nth(k)
        nxt = c.locator("button", has_text=re.compile("next", re.I)).first
        if nxt.count() == 0:
            rep.warn(area, f"proof {k + 1}: no Next button found")
            continue
        clicks = 0
        while nxt.is_enabled() and clicks < 40:
            nxt.click()
            clicks += 1
        res = c.evaluate("c => { const s = c.closest('section') || document;"
                         " const n = s.querySelector('#proofStepNum'), t = s.querySelector('#proofStepTotal');"
                         " const layers = [...s.querySelectorAll('.proof-layer')];"
                         " return { num: n && n.textContent.trim(), total: t && t.textContent.trim(),"
                         "   hidden: layers.filter(l => !l.classList.contains('visible')).length, layers: layers.length }; }")
        if nxt.is_enabled() or res["hidden"] or (res["num"] and res["num"] != res["total"]):
            rep.fail(area, f"proof {k + 1}: stopped at step {res['num']}/{res['total']} with {res['hidden']} layer(s) hidden")
        else:
            rep.ok(area, f"proof {k + 1}: stepped to {res['num'] or clicks + 1}/{res['total'] or '?'}, all {res['layers']} layers shown")

    # Flip cards
    cards = page.locator(".vocab")
    if cards.count():
        flipped = 0
        for k in range(cards.count()):
            cards.nth(k).click()
            flipped += cards.nth(k).evaluate("c => c.classList.contains('flipped')")
        (rep.ok if flipped == cards.count() else rep.fail)(area, f"flip cards: {flipped}/{cards.count()} flip on click")

    run_drag_sorts(page, rep, area, "mouse")
    run_matches(page, rep, area, "mouse")
    run_order_lists(page, rep, area, "mouse")


def progress(page):
    el = page.locator("#progressLabel")
    if el.count() == 0:
        return None
    m = re.search(r"(\d+)\s*/\s*(\d+)", el.text_content() or "")
    return (int(m.group(1)), int(m.group(2))) if m else None


def run_marking(page, rep, sec0_ids):
    area = "Marking"
    keys = page.evaluate("() => ({ key: typeof answerKey !== 'undefined' ? answerKey : null,"
                         " fb: typeof fbKey !== 'undefined' ? fbKey : null,"
                         " total: typeof totalProblems !== 'undefined' ? totalProblems : null })")
    if not keys["key"]:
        rep.fail(area, "answerKey not found - cannot read stored answers")
        return
    answer_key, fb_key = keys["key"], keys["fb"] or {}
    ids = page.evaluate("() => [...document.querySelectorAll('input.problem-input')].map(i => i.id.slice(4))")

    def state(idx):
        cls = page.eval_on_selector(f'[id="inp-{idx}"]', "e => e.className")
        return "correct" if "incorrect" not in cls and "correct" in cls else ("incorrect" if "incorrect" in cls else "none")

    def submit(idx, value):
        inp = page.locator(f'[id="inp-{idx}"]')
        inp.fill(value)
        inp.locator("xpath=..").locator(".check-btn").click()
        return state(idx)

    marked, text_qs, bad = 0, 0, 0
    for idx in ids:
        exp = answer_key.get(idx)
        if exp is None:
            rep.fail(area, f"{idx}: no stored answer in answerKey")
            bad += 1
            continue
        if exp == "TEXT":
            text_qs += 1
            continue
        if page.locator(f'[id="inp-{idx}"]').locator("xpath=..").locator(".check-btn").count() == 0:
            rep.fail(area, f"{idx}: auto-marked but has no Check button")
            bad += 1
            continue
        wrong = page.evaluate(
            "exp => ['qzx', '-987654.321', '#wrong#'].find(c => answerMatches(c, exp) === false) || null", exp)
        before = progress(page)
        try:
            s_wrong = submit(idx, wrong) if wrong is not None else "skipped"
            s_right = submit(idx, exp)
        except Exception as e:  # noqa: BLE001
            rep.fail(area, f"{idx}: could not answer - {short(str(e), 90)}")
            bad += 1
            continue
        after = progress(page)
        if s_wrong not in ("incorrect", "skipped"):
            rep.fail(area, f"{idx}: wrong answer '{wrong}' gave state '{s_wrong}', expected incorrect")
            bad += 1
        if s_right != "correct":
            rep.fail(area, f"{idx}: stored answer '{short(exp, 40)}' gave state '{s_right}', expected correct")
            bad += 1
        if idx in sec0_ids and before != after:
            rep.fail("Structure", f"warm-up question {idx} is scored (progress {'/'.join(map(str, before))} -> {'/'.join(map(str, after))})")
        marked += 1
    if marked and not bad:
        rep.ok(area, f"{marked} auto-marked questions: wrong -> red, stored answer -> green")
    if text_qs:
        rep.info(area, f"{text_qs} open-response (TEXT) question(s) not auto-marked")

    p = progress(page)
    total = keys["total"]
    if p is None:
        rep.fail(area, "progress counter #progressLabel not found")
    elif p[0] == p[1] == total and total:
        rep.ok(area, f"progress counter reached {p[0]} / {p[1]}")
    else:
        rep.fail(area, f"progress counter shows {p[0]} / {p[1]} after all answers correct (totalProblems = {total})")

    # Misconception feedback - after the progress check, because these answers are wrong.
    n_fb, fb_bad = 0, 0
    for idx, entries in fb_key.items():
        if page.locator(f'[id="inp-{idx}"]').count() == 0:
            rep.fail(area, f"misconception key {idx} has no matching question")
            fb_bad += 1
            continue
        for answer, msg in entries.items():
            n_fb += 1
            s = submit(idx, answer)
            box = page.locator(f'[id="fb-{idx}"]')
            shown = box.count() and box.is_visible()
            text = box.text_content() if box.count() else ""
            if s != "incorrect":
                rep.fail(area, f"{idx}: misconception answer '{answer}' is marked {s}, so its feedback can never show")
                fb_bad += 1
            elif not shown:
                rep.fail(area, f"{idx}: misconception '{answer}' - feedback box not displayed")
                fb_bad += 1
            elif norm(text) != norm(msg):
                rep.fail(area, f"{idx}: misconception '{answer}' shows '{short(text, 50)}' instead of its own message")
                fb_bad += 1
        submit(idx, answer_key[idx])   # leave the question green
    if n_fb and not fb_bad:
        rep.ok(area, f"all {n_fb} misconception feedback entries display")
    elif not fb_key:
        rep.info(area, "no misconception feedback (fbKey) in this lesson")


JS_FIGURES = r"""
(shownSrc) => {
  const shown = eval(shownSrc);
  const svgs = [...document.querySelectorAll('svg')].filter(s => !s.parentElement.closest('svg'));
  return svgs.map((s, i) => {
    s.dataset.ckfig = i;
    const r = s.getBoundingClientRect();
    const sec = s.closest('section');
    const h = sec && sec.querySelector('h2');
    const where = h ? [...h.childNodes].map(n => n.textContent).join(' ').replace(/\s+/g, ' ').trim() : 'outside sections';
    const label = s.getAttribute('aria-label') || (s.querySelector('title') || {}).textContent || '';
    const vis = shown(s);
    const texts = vis ? [...s.querySelectorAll('text')].filter(t => t.textContent.trim() && shown(t)).map(t => {
      const b = t.getBoundingClientRect();
      return { t: t.textContent.replace(/\s+/g, ' ').trim(), l: b.left, tp: b.top, r: b.right, b: b.bottom };
    }) : [];
    return { i, where, label, vis, box: { l: r.left, tp: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }, texts };
  });
}
"""


def run_figures(page, rep, out_png, browser):
    area = "Figures"
    # Reveal hint/answer boxes that hold figures, so their SVGs render too.
    page.evaluate("() => document.querySelectorAll('.hint-box, .answer-box').forEach(b => {"
                  " if (b.querySelector('svg') && !b.classList.contains('visible')) {"
                  "   const p = b.closest('.problem'); const k = b.classList.contains('hint-box') ? '.hint-link' : '.answer-link';"
                  "   const btn = p && p.querySelector(k); if (btn) btn.click(); } })")
    page.wait_for_timeout(100)
    figs = page.evaluate(JS_FIGURES, JS_SHOWN)
    shots, hidden, n_fail, n_warn = [], 0, 0, 0
    for f in figs:
        if not f["vis"]:
            hidden += 1
            continue
        tag = f"SVG {f['i'] + 1} ({short(f['where'], 45)})"
        bx, issues = f["box"], []
        for t in f["texts"]:
            out = max(bx["l"] - t["l"], t["r"] - bx["r"], bx["tp"] - t["tp"], t["b"] - bx["b"])
            if out > TEXT_EDGE_TOL:
                rep.fail(area, f"{tag}: text '{short(t['t'], 30)}' extends {out:.0f}px outside the SVG viewport")
                issues.append("FAIL")
                n_fail += 1
        ts = f["texts"]
        for a in range(len(ts)):
            for b in range(a + 1, len(ts)):
                p, q = ts[a], ts[b]
                ix = min(p["r"], q["r"]) - max(p["l"], q["l"])
                iy = min(p["b"], q["b"]) - max(p["tp"], q["tp"])
                hmin = min(p["b"] - p["tp"], q["b"] - q["tp"])
                if ix > OVERLAP_MIN_PX and iy > OVERLAP_MIN_PX and iy > OVERLAP_MIN_FRAC * hmin:
                    rep.warn(area, f"{tag}: text '{short(p['t'], 25)}' overlaps '{short(q['t'], 25)}'")
                    issues.append("WARN")
                    n_warn += 1
        try:
            png = page.locator(f'svg[data-ckfig="{f["i"]}"]').screenshot()
        except Exception as e:  # noqa: BLE001
            rep.warn(area, f"{tag}: screenshot failed - {short(str(e), 60)}")
            continue
        shots.append({"n": f["i"] + 1, "where": f["where"], "label": f["label"], "png": png,
                      "w": round(bx["w"]), "h": round(bx["h"]),
                      "status": "FAIL" if "FAIL" in issues else ("WARN" if issues else "")})
    checked = len(figs) - hidden
    if checked and not n_fail:
        rep.ok(area, f"{checked} rendered SVGs: no text outside the viewport")
    if checked and not n_warn:
        rep.ok(area, f"{checked} rendered SVGs: no overlapping text")
    if hidden:
        rep.info(area, f"{hidden} SVG(s) not rendered after all interactions (hidden widgets) - not checked")
    if not figs:
        rep.info(area, "no inline SVGs in this lesson")
    if shots:
        contact_sheet(browser, shots, out_png)
        rep.info(area, f"contact sheet of {len(shots)} SVGs: {out_png.as_posix()}")


def contact_sheet(browser, shots, out_png):
    cells = []
    for s in shots:
        b64 = base64.b64encode(s["png"]).decode()
        cls = {"FAIL": "fail", "WARN": "warn"}.get(s["status"], "")
        badge = f'<span class="badge {cls}">{s["status"]}</span>' if s["status"] else ""
        cap = html.escape(f'#{s["n"]} · {s["where"]}')
        sub = html.escape(f'{s["w"]}×{s["h"]}px' + (f' · {s["label"]}' if s["label"] else ""))
        cells.append(f'<figure class="{cls}"><div class="img"><img src="data:image/png;base64,{b64}"></div>'
                     f'<figcaption>{badge}{cap}<small>{sub}</small></figcaption></figure>')
    doc = ("<!doctype html><meta charset='utf-8'><style>"
           "body{margin:0;padding:16px;background:#eef0f3;font:13px system-ui,sans-serif;color:#1f2a37}"
           ".grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}"
           "figure{margin:0;background:#fff;border:2px solid #d5d9e0;border-radius:8px;padding:8px}"
           "figure.fail{border-color:#c0392b}figure.warn{border-color:#d4a017}"
           ".img{display:flex;align-items:center;justify-content:center;min-height:120px}"
           "img{max-width:100%;max-height:340px}"
           "figcaption{margin-top:6px}small{display:block;color:#6b7280}"
           ".badge{color:#fff;border-radius:4px;padding:1px 5px;margin-right:6px;font-weight:700}"
           ".badge.fail{background:#c0392b}.badge.warn{background:#b8860b}"
           "</style><div class='grid'>" + "".join(cells) + "</div>")
    page = browser.new_page(viewport={"width": 1400, "height": 800})
    page.set_content(doc)
    page.wait_for_function("() => [...document.images].every(i => i.complete)")
    out_png.parent.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(out_png), full_page=True)
    page.close()


def run_browser(lesson, rep, out_png, row, headed):
    from playwright.sync_api import sync_playwright

    url = lesson.resolve().as_uri()
    errors = []

    def watch(page, ctx_name):
        page.on("console", lambda m: m.type == "error" and errors.append(f"[{ctx_name}] console: {m.text}"))
        page.on("pageerror", lambda e: errors.append(f"[{ctx_name}] uncaught: {e}"))

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not headed)

        # ---- desktop / mouse pass
        ctx = browser.new_context(viewport={"width": 1280, "height": 900}, reduced_motion="reduce")
        ctx.set_default_timeout(5000)
        page = ctx.new_page()
        watch(page, "desktop")
        page.goto(url, wait_until="load")
        page.wait_for_timeout(300)

        s = page.evaluate(JS_STRUCTURE)
        area = "Structure"
        if not s["sec0"]:
            rep.fail(area, "no Section 0 retrieval warm-up")
        elif 2 <= s["sec0"]["problems"] <= 3:
            rep.ok(area, f"Section 0 warm-up has {s['sec0']['problems']} questions")
        else:
            rep.fail(area, f"Section 0 warm-up has {s['sec0']['problems']} questions (expected 2-3)")
        if not s["exit"]:
            rep.fail(area, "no exit ticket section")
        elif s["exit"]["problems"] == 0:
            rep.fail(area, "exit ticket has no questions")
        else:
            rep.ok(area, f"exit ticket has {s['exit']['problems']} questions")
        counts = []
        for name, n, target in TIER_TARGETS:
            got = s["tiers"].get(str(n), s["tiers"].get(n))
            counts.append(f"{name} {got if got is not None else 'missing'}")
            if got != target:
                rep.warn(area, f"{name} tier has {got if got is not None else 'no section'} questions (target {target})")
        rep.info(area, "tier counts: " + " / ".join(counts) + " (target 10 / 6 / 4)")
        check_panel(s["panel"], row, rep)

        run_mouse_interactions(page, rep)
        run_marking(page, rep, set(s["sec0"]["ids"]) if s["sec0"] else set())
        run_figures(page, rep, out_png, browser)
        ctx.close()

        # ---- iPad touch pass
        ipad = dict(p.devices["iPad (gen 7)"])
        ipad.pop("default_browser_type", None)
        ctx = browser.new_context(**ipad, reduced_motion="reduce")
        ctx.set_default_timeout(5000)
        page = ctx.new_page()
        watch(page, "iPad")
        page.goto(url, wait_until="load")
        page.wait_for_timeout(300)
        cdp = ctx.new_cdp_session(page)
        area = "Interactions (iPad touch)"
        before = len(rep.items)
        run_drag_sorts(page, rep, area, "touch", cdp)
        run_matches(page, rep, area, "touch")
        run_order_lists(page, rep, area, "touch")
        if len(rep.items) == before:
            rep.info(area, "no drag-sort, match or order widgets to test")
        ctx.close()
        browser.close()

    seen = []
    for e in errors:
        if e not in seen:
            seen.append(e)
    for e in seen[:15]:
        rep.fail("Console", short(e, 200))
    if len(seen) > 15:
        rep.fail("Console", f"... and {len(seen) - 15} more console errors")
    if not seen:
        rep.ok("Console", "no console errors (desktop and iPad passes)")


# -------------------------------------------------------- QA scripts --------

def run_qa_scripts(lesson, rep):
    area = "QA scripts"
    env = dict(os.environ, PYTHONIOENCODING="utf-8")
    for script in ("qa_lessons.py", "verify_answers.py"):
        path = ROOT / script
        if not path.exists():
            rep.fail(area, f"{script} not found next to check_lesson.py")
            continue
        r = subprocess.run([sys.executable, str(path), str(lesson)], cwd=ROOT, env=env,
                           capture_output=True, text=True, encoding="utf-8", errors="replace")
        out = (r.stdout + r.stderr).strip()
        rep.raw[f"{script} (exit {r.returncode})"] = out
        if script == "qa_lessons.py":
            for line in out.splitlines():
                line = line.strip()
                if line.startswith("✗"):
                    rep.fail(area, "qa_lessons: " + line[1:].strip())
                elif line.startswith("!"):
                    rep.warn(area, "qa_lessons: " + line[1:].strip())
            if r.returncode == 0 and not rep.of(area, "FAIL", "WARN"):
                rep.ok(area, "qa_lessons.py: PASS")
            elif r.returncode != 0 and not rep.of(area, "FAIL"):
                rep.fail(area, f"qa_lessons.py exited {r.returncode}")
        else:
            for line in out.splitlines():
                if "MISMATCH" in line and "SUMMARY" not in line:
                    rep.fail(area, "verify_answers: " + line.strip())
            m = re.search(r"SUMMARY: (\d+) verified OK, (\d+) MISMATCH, (\d+) manual", out)
            n = re.search(r":\s*(\d+) stored answers", out)
            if r.returncode != 0 and not m:
                rep.fail(area, f"verify_answers.py exited {r.returncode}")
            elif m:
                okc, bad, man = map(int, m.groups())
                if not bad:
                    rep.ok(area, f"verify_answers.py: {okc} verified, 0 mismatches, {man} manual")
            if n and n.group(1) == "0":
                rep.info(area, "verify_answers.py parsed 0 stored answers (it reads q:'...' literals only; "
                               "payload-mode JSON arrays are not parsed)")


# ------------------------------------------------------------ output --------

ICON = {"PASS": "✅", "WARN": "⚠️", "FAIL": "❌", "INFO": "ℹ️", "SKIP": "➖"}


def print_summary(rep, lesson, lesson_id):
    print(f"\ncheck_lesson: {lesson}  [{lesson_id}]")
    for area in Report.AREAS:
        lv = rep.level(area)
        print(f"  [{lv}] {area}")
        for m in rep.of(area, "FAIL"):
            print(f"      FAIL {m}")
        for m in rep.of(area, "WARN"):
            print(f"      WARN {m}")
    n_f, n_w = len([1 for i in rep.items if i[0] == "FAIL"]), len([1 for i in rep.items if i[0] == "WARN"])
    print(f"\nOVERALL: {rep.level()}  ({n_f} FAIL, {n_w} WARN)")


def write_report(rep, lesson, lesson_id, out_md, out_png, elapsed):
    lines = [f"# Lesson check: {lesson_id}", "",
             f"- File: `{lesson.as_posix()}`",
             f"- Checked: {time.strftime('%Y-%m-%d %H:%M')} ({elapsed:.0f}s, headless Chromium + iPad (gen 7) touch emulation)",
             f"- **Overall: {rep.level()}** ({len(rep.of_all('FAIL'))} FAIL, {len(rep.of_all('WARN'))} WARN)",
             f"- Figures contact sheet: `{out_png.name}`" if out_png.exists() else "- Figures contact sheet: none (no rendered SVGs)",
             "", "| Area | Result | FAIL | WARN |", "|---|---|---|---|"]
    for area in Report.AREAS:
        lv = rep.level(area)
        lines.append(f"| {area} | {ICON[lv]} {lv} | {len(rep.of(area, 'FAIL'))} | {len(rep.of(area, 'WARN'))} |")
    for area in Report.AREAS:
        items = [(lv, m) for lv, a, m in rep.items if a == area]
        if not items:
            continue
        lines += ["", f"## {area}", ""]
        order = {"FAIL": 0, "WARN": 1, "PASS": 2, "INFO": 3}
        for lv, m in sorted(items, key=lambda x: order[x[0]]):
            lines.append(f"- {ICON[lv]} **{lv}** {m}")
    for title, raw in rep.raw.items():
        lines += ["", f"<details><summary>{title} output</summary>", "", "```", raw, "```", "", "</details>"]
    out_md.parent.mkdir(parents=True, exist_ok=True)
    out_md.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except AttributeError:
            pass
    ap = argparse.ArgumentParser(description="Automated browser check for one lesson HTML file.")
    ap.add_argument("lesson", help="lesson .html file")
    ap.add_argument("--lessonmap", default=str(ROOT / "lessonmap.json"), help="lessonmap.json (default: repo copy)")
    ap.add_argument("--out-dir", default="check-output", help="output folder (default: check-output)")
    ap.add_argument("--headed", action="store_true", help="show the browser (debugging)")
    args = ap.parse_args()

    lesson = Path(args.lesson)
    if not lesson.is_file():
        sys.exit(f"not a file: {lesson}")
    t0 = time.time()
    rep = Report()
    text = lesson.read_text(encoding="utf-8", errors="replace")
    lesson_id, row = check_static(text, args.lessonmap, rep)
    if not lesson_id:
        m = re.match(r"(y\d+_[a-z]+_\d+)", lesson.name)
        lesson_id = m.group(1) if m else lesson.stem
    out_dir = Path(args.out_dir)
    out_png = out_dir / f"{lesson_id}-figures.png"
    out_md = out_dir / f"{lesson_id}-report.md"
    if out_png.exists():
        out_png.unlink()

    try:
        run_browser(lesson, rep, out_png, row, args.headed)
    except Exception as e:  # noqa: BLE001 - a crash is a FAIL, not a silent pass
        rep.fail("Console", f"browser check crashed: {type(e).__name__}: {short(str(e), 200)}")
    run_qa_scripts(lesson, rep)

    print_summary(rep, lesson, lesson_id)
    write_report(rep, lesson, lesson_id, out_md, out_png, time.time() - t0)
    print(f"Report: {out_md.as_posix()}")
    sys.exit(1 if rep.level() == "FAIL" else 0)


if __name__ == "__main__":
    main()
