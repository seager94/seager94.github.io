# Payload mode — two-stage lesson generation

**Status:** pilot (Y8 Statistics). Classic full-HTML mode remains available and is still the
right mode for lessons needing bespoke full-page interactives (e.g. the Y7 transformation
component). Payload mode is the default for standard-shape lessons.

**Why.** ~85–90% of every generated lesson is invariant boilerplate (CSS + locked JS + section
structure). In payload mode the model emits only the topic content as JSON; the deterministic
assembler stitches it into the frozen frame. Output tokens per lesson collapse (removes the
32k runner ceiling), locked functions become physically unregressable, and quote-fragile
answers are structurally safe (JSON encoding, `</` escaped).

**Install locations:**
- This spec: `C:\Users\sdavi\.claude\skills\interactive-html-maths-lesson\references\payload-spec.md`
- Frame: `...\interactive-html-maths-lesson\assets\lesson_frame.html` (built once — see below)
- Assembler: `C:\Users\sdavi\projects\seager94.github.io\assemble_lesson.py`

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
    "retrieval":  [ {"q": "…", "a": "…", "hint": "…"}, … ],
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

```powershell
python C:\Users\sdavi\projects\seager94.github.io\assemble_lesson.py --frame C:\Users\sdavi\.claude\skills\interactive-html-maths-lesson\assets\lesson_frame.html *.payload.json
python C:\Users\sdavi\projects\seager94.github.io\qa_lessons.py *.html
```

Assembler guarantees: every frame slot resolved (else FAIL, nothing written), accordion count
badges computed from array lengths, arrays serialised with `</` escaped so no content can
terminate the script block, and an `assembled` meta stamp recording assembler version, date
and source payload. The click test (wrong → red, right → green) is still mandatory.

## 3. Building the frame (one-time, on the Dell, AFTER patches 0–3 are applied)

Run interactively and watch it:

```powershell
cd C:\Users\sdavi\.claude\skills\interactive-html-maths-lesson
claude "Read references\payload-spec.md in full. Create assets\lesson_frame.html as an exact copy of assets\lesson_template.html in which ONLY the following are replaced by {{SLOT:name}} tokens: the <title> text ({{SLOT:title}}); the content value of each of the eight curriculum meta tags ({{SLOT:meta_lesson_id}}, {{SLOT:meta_ac9_descriptor}}, {{SLOT:meta_ac9_descriptor_text}}, {{SLOT:meta_ac9_elaborations}}, {{SLOT:meta_sa_year}}, {{SLOT:meta_sa_strand}}, {{SLOT:meta_mapping_note}}, {{SLOT:meta_sa_conceptual_understanding}}); the header h1, subtitle and badge ({{SLOT:header_title}}, {{SLOT:header_subtitle}}, {{SLOT:header_badge}}); the topic-specific inner HTML of the retrieval intro, the Why-this-matters section, the vocab cards, the Section 3 sort chips-and-buckets, the worked example, and the We Do intro (name these slots section0_intro, section_warmup, vocab_cards, sort_activity, worked_example, we_do_intro); the numeric question-count text in the Stretch and Mastery accordion badges ({{SLOT:count_practice2}}, {{SLOT:count_practice3}}); and the ENTIRE block of const problem-array declarations in the script, replaced by a single {{SLOT:js_arrays}} token — the INITIALISE calls below it stay exactly as they are. Insert {{SLOT:strategy_section}} on its own line immediately before the exit-ticket section and {{SLOT:strategy_js}} on its own line at the end of the script before the closing tag. Insert {{SLOT:assembly_stamp}} on its own line directly after the template-version meta tag. Change NOTHING else — no CSS, no function bodies, no section order. Finally, add an HTML comment manifest at the very top of lesson_frame.html listing every slot name, stating which are html-fragment slots, and documenting the exact object shape each array expects (copy the shapes from the arrays you removed, including matchTerms). Then print the manifest."
```

Sanity before first use:

```powershell
Select-String -Path assets\lesson_frame.html -Pattern '\{\{SLOT:' | Measure-Object -Line
Select-String -Path assets\lesson_frame.html -Pattern 'function buildPractice' | Measure-Object -Line
```

Expect ~22 slot lines and exactly 1 buildPractice. The first pilot payload is the live smoke
test — the assembler refuses to write anything if the frame and payload disagree.

## 4. Task-line template (payload mode)

Identical to the classic pattern (metadata block, visual requirement, strategy, overwrite
language all still mandatory) with the mode, output and filename changed:

```
Use the interactive-html-maths-lesson skill in payload mode: read references/payload-spec.md and the slot manifest at the top of assets/lesson_frame.html, then emit ONLY a content payload JSON for a [YEAR] [STRAND] lesson on [TOPIC]. Follow the I Do / We Do / You Do gradual release structure. Set curriculum metadata exactly: [full 8-field block as usual]. [VISUAL REQUIREMENT]. [PEDAGOGY]. [EXAMPLES]. [STRATEGY]. Building, Stretch and Mastery practice tiers, auto-marked, 10/6/4 questions. Reference the SA Curriculum (Mathematics R-10 Prototype 2). Do not emit an HTML file. Do not check for existing files - create this payload fresh and overwrite if a file with this name already exists. Save as [ID]_[topic]_v2.payload.json in the current directory.
```

## 5. SKILL.md addition (paste under "Workflow")

```markdown
### Payload mode (two-stage generation)

If the request says "payload mode", do NOT produce an HTML file. Read
`references/payload-spec.md` and the slot manifest at the top of
`assets/lesson_frame.html`, then emit a single `<lesson-id>_<topic>_vN.payload.json`
conforming to payload_version 1: metadata, title/header, one HTML fragment per
manifest slot, and every problem array. All maths-typography, pedagogy, tier and
metadata rules apply unchanged inside the fragments. The deterministic assembler
(`assemble_lesson.py`) builds the final lesson — never write CSS, framework
JavaScript, or boilerplate into the payload.
```

## 6. Pilot scope and exit criteria

Pilot = Y8 Statistics (6 planned lessons, standard-shape). Success = all six assemble, pass
`qa_lessons.py`, pass the click test, and per-lesson generation time/tokens drop materially
vs classic mode. If it holds, payload mode becomes the batch default and classic mode is
reserved for bespoke-interactive lessons; if it doesn't, nothing else in the pipeline changed.
