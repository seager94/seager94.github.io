# Payload mode — two-stage lesson generation

**Status:** proven (2026-07-10 pilot: y8_sta_01, y8_sta_02 published live). Payload mode is
the batch default for standard-shape lessons. Classic full-HTML mode remains the right mode
for lessons needing bespoke full-page interactives (simulations, matching builds, open-ended
investigations — e.g. Y8 Statistics L03–L06, the Y7 transformation component).

**Why.** ~85–90% of every generated lesson is invariant boilerplate (CSS + locked JS + section
structure). In payload mode the model emits only the topic content as JSON; the deterministic
assembler stitches it into the frozen frame. Output tokens per lesson collapse (removes the
32k runner ceiling), locked functions become physically unregressable, and quote-fragile
answers are structurally safe (JSON encoding, `</` escaped).

**Install locations:**
- This spec: `.claude/skills/interactive-html-maths-lesson/references/payload-spec.md` (repo)
- Frame: `.claude/skills/interactive-html-maths-lesson/assets/lesson_frame.html` (repo)
- Assembler: `assemble_lesson.py` (repo root)
- The installed skill path `C:\Users\sdavi\.claude\skills\interactive-html-maths-lesson` is a
  directory junction into the repo copy (created 2026-07-10). There is ONE physical copy;
  editing the repo edits the installed skill.

---

## 1. Payload schema (payload_version 1)

One file per lesson: `y8_sta_NN_topic_v2.payload.json`

```json
{
  "payload_version": 1,
  "filename": "y8_sta_01_collecting_and_classifying_data_v2.html",
  "title": "Collecting and Classifying Data — Year 8",
  "header": { "title": "…", "subtitle": "…", "badge": "Year 8 · Statistics" },
  "meta": {
    "lesson-id": "y8_sta_01",
    "lesson-focus": "one-line focus statement for the lesson",
    "ac9-descriptor": "AC9M8ST01",
    "ac9-descriptor-text": "full ACARA descriptor sentence",
    "ac9-elaborations": "1,3",
    "sa-year": "8",
    "sa-strand": "Statistics",
    "mapping-note": "Strict",
    "sa-conceptual-understanding": "full SA CU statement"
  },
  "html": {
    "<one entry per HTML slot named in the frame manifest>": "raw HTML fragment"
  },
  "arrays": {
    "retrieval":  [ {"q": "…", "a": "…", "hint": "…", "verify": "… (optional)", "fb": {… (optional)}}, … ],
    "matchTerms": [ …shape per frame manifest… ],
    "weDo":       [ … ],
    "checkpoint": [ … ],
    "practice1":  [ … ],
    "practice2":  [ … ],
    "practice3":  [ … ],
    "exitProbs":  [ … ]
  }
}
```

**Full slot inventory (29 slots, verified against the frame 2026-07-10):**

Metadata (9): `meta_lesson_id`, `meta_lesson_focus`, `meta_ac9_descriptor`,
`meta_ac9_descriptor_text`, `meta_ac9_elaborations`, `meta_sa_year`, `meta_sa_strand`,
`meta_mapping_note`, `meta_sa_conceptual_understanding`

Title/header (4): `title`, `header_title`, `header_subtitle`, `header_badge`

Section text (9): `section0_intro`, `section_warmup`, `section3_heading`, `section3_desc`,
`section4_heading`, `section6_heading`, `vocab_cards`, `sort_activity`, `we_do_intro`

Content (2): `worked_example`, `footer_title`

Strategy (2): `strategy_section`, `strategy_js` (both may be `""`)

### Optional per-question keys (2026-07-12, template-version 2026-07-12.1)

Any question object in any array may carry two optional keys. Both are inert to the frame's
locked functions; omitting them gives exactly the pre-2026-07-12 behaviour.

- **`verify`** - machine-readable parameters so `verify_answers.py` recomputes the answer from
  parameters instead of parsing prose. String format: `"type:key=value,key=value,..."`.
  Types and required keys (r always a DECIMAL, not a percent; n optional, default 1):
  - `"compound:P=5000,r=0.045,n=12,t=3"` - A = P(1+r/n)^(nt)
  - `"simple:P=2000,r=0.05,t=3"` - I = Prt (checker accepts interest OR balance)
  - `"growth:P=10000,r=0.05,t=3"` / `"decay:P=30000,r=0.08,t=4"` - P(1 +/- r)^t
  EMIT on every question whose stored answer is computed by one of these formulas
  (compound/simple interest, constant-% growth or decay). Do not emit on threshold,
  difference, multiplier-only, or conceptual questions.

- **`fb`** - misconception feedback map: `{"wrong answer": "targeted feedback", ...}`.
  When a student checks an incorrect answer that matches a key (matched via answerMatches -
  numeric equivalence, $ and comma tolerance, term reordering all apply), the feedback shows
  in a coral box under the input. OPTIONAL - emit only where a wrong answer has a nameable
  cause worth naming (e.g. decimal-shift errors, order-of-operations, adding unlike terms,
  decay-instead-of-growth). One or two mapped answers per question maximum; feedback names
  the error and points to the fix in one sentence, never gives the answer.


Machine-filled by the assembler — never in the payload: `js_arrays`, `count_practice2`,
`count_practice3`, `assembly_stamp`

**Slot changelog:**
- 2026-07-10 (post-pilot tokenisation fixes): added `section3_heading`, `section3_desc`,
  `section4_heading`, `section6_heading`, `footer_title` — the pilot found these hardcoded
  to the algebra template example. Payloads written before this date lack them and will
  fail assembly against the current frame. `meta_lesson_focus` also confirmed in the frame
  (was absent from the original spec schema).

**Bare-year rule (2026-07-10):** `sa-year` is the bare number (`"8"`). The frame prefixes
the literal word "Year " in the visible curriculum panel and footer. Never write
"Year 8" into `sa-year` or `footer_title`-adjacent content — you'd get "Year Year 8",
and `qa_lessons.py` now FAILs any lesson whose visible panel doesn't read
"Year N · Strand" matching the meta.

Rules for the generating model:
- **The frame manifest is authoritative.** Read the HTML comment at the top of
  `lesson_frame.html` — it lists every slot name and the exact object shape of each array.
  Supply every listed slot; the assembler hard-fails on any gap.
- **All maths typography rules apply inside fragments and q/hint strings** — stacked `.frac`,
  `.var` spans, U+2212 minus, `<sup>` powers. Inline SVG figures go inside the relevant
  `html` fragment or `q` string exactly as they would in classic mode.
- **Answers (`a`)** are plain strings in the keyboard form students type (hyphen minus, `/`
  fractions, `^` powers) or `'TEXT'` for open response. Never empty.
- **Metadata**: real values only — the assembler rejects TODO/TBC/TBD.
- **Do not emit any HTML file, any CSS, or any framework JavaScript.** The payload JSON is
  the entire deliverable.
- Strategy enrichment: put the adapted kit's section markup in `html.strategy_section` and
  its script in `html.strategy_js` (both may be `""` when the lesson uses no strategy).

## 2. Assembling and gating (batch folder)

Run FROM the batch folder — the assembler writes output HTML to the current working
directory:

```powershell
python C:\Users\sdavi\projects\seager94.github.io\assemble_lesson.py --frame C:\Users\sdavi\.claude\skills\interactive-html-maths-lesson\assets\lesson_frame.html *.payload.json
python C:\Users\sdavi\projects\seager94.github.io\qa_lessons.py *.html
```

Assembler guarantees: every frame slot resolved (else FAIL, nothing written), accordion count
badges computed from array lengths, arrays serialised with `</` escaped so no content can
terminate the script block, and an `assembled` meta stamp recording assembler version, date
and source payload.

QA gate (updated 2026-07-10): in addition to the original checks, `qa_lessons.py` now FAILs
on meta/panel mismatch — the visible curriculum panel must show "Year N · Strand" matching
the meta tags, and every AC9 code in the meta must appear in the visible body. (The pilot
proved the old gate checked `<head>` meta only; a hardcoded panel sailed through.)

The click test (wrong → red, right → green) is still mandatory.

**Keep the payloads.** Payload JSONs are the cheap-rebuild source: any frame improvement can
be rolled out to every payload-built lesson by re-running the assembler. Batch folders under
`overnight-lessons\` retain them; do not delete after publish.

## 3. Frame history (do not rebuild)

The frame was built once (2026-07-08, via the tokenisation prompt archived in git history of
this file) and then hand-fixed during the pilot when three sections were found still
hardcoded. It is a maintained artefact now — edit it directly (VS Code, watching for glyph
corruption) and bump slots here when you do. Rebuilding it from the template would discard
the pilot fixes.

Sanity after any frame edit:

```powershell
Select-String -Path assets\lesson_frame.html -Pattern '\{\{SLOT:' | Measure-Object -Line
Select-String -Path assets\lesson_frame.html -Pattern 'function buildPractice' | Measure-Object -Line
```

Expect 29 unique slots (32 slot lines — three slots appear twice) and exactly 1 buildPractice.

## 4. Task-line template (payload mode)

Identical to the classic pattern (metadata block, visual requirement, strategy, overwrite
language all still mandatory) with the mode, output and filename changed: