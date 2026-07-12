---
name: interactive-html-maths-lesson
description: Build single-file interactive HTML lessons for secondary mathematics teaching. Use this skill whenever the user (a maths teacher) asks for an interactive lesson, HTML lesson, browser-based lesson, smartboard lesson, in-class digital lesson, web lesson, or any classroom resource that combines vocabulary, worked examples, and student practice in one self-contained HTML file. Also use when the user says "build me a lesson on X", "make an interactive [topic] lesson", references the "lesson template", or asks for a maths teaching resource with interactive elements like drag-and-drop sorting, click-to-match, vocab flip cards, auto-marked practice problems, or chilli-tiered difficulty practice. The output is always one .html file with embedded CSS and JavaScript using the navy/coral/light-grey house style and the I do / We do / You do gradual release pedagogical structure. This skill is the user's preferred workflow for HTML lessons — invoke it eagerly rather than building HTML lessons from scratch.
---

# Interactive HTML Maths Lesson

A skill for building single-file interactive HTML lessons for secondary mathematics teaching, in the user's established house style.

## When this fits

The user wants a lesson their students can open in any browser — on a smartboard for whole-class teaching, on student laptops for individual work, or both. The deliverable is always one HTML file with embedded CSS and JavaScript. No external dependencies, no internet required at runtime, works offline on school networks.

## Core JS plumbing — copy verbatim

The following functions in `assets/lesson_template.html` are load-bearing infrastructure that has been carefully debugged. They must be copied into every generated lesson **exactly as written in the template**. Do not refactor, "improve", optimise, or reimplement them — even if a different approach looks cleaner.

- `buildPractice`
- `checkAnswer`
- `answerMatches`
- `formatAnswerDisplay`
- `updateProgress`
- `toggleHint`
- `toggleAnswer`
- `toggleTier`

What varies per lesson is the **data**, not the **plumbing**: the `retrieval`, `weDo`, `checkpoint`, `practice1`, `practice2`, `practice3`, and `exitProbs` arrays, plus the worked-example / we-do / drag-sort / matching content. Everything else is fixed.

Historical reason: a prior generation rewrote `buildPractice` to use `JSON.stringify(p.a)` inside an inline `onclick` attribute, which broke every Check button in that lesson due to HTML attribute quote-collision. The current `buildPractice` avoids inline event handlers entirely to prevent any future variant of this class of bug.

## Workflow

### 1. Read the template first

Start by reading `assets/lesson_template.html`. This is the canonical structure — header, sticky progress bar, phase banners, section cards, all CSS, all JavaScript framework (problem checking, progress tracking, drag-and-drop, teacher mode, etc). Do not rebuild this from scratch — adapt it.

The template currently contains a complete worked example (Year 10 Collecting Like Terms). Use it as both structural reference and inspiration for the patterns. When adapting for a new topic, replace topic-specific content but keep the framework code intact.

### 2. Capture curriculum metadata (required)

Every lesson must carry curriculum metadata in two parallel places, populated from the task prompt:

- **`<meta>` tags in `<head>`** — machine-readable for coverage audits and lesson-map sync
- **`<details class="curriculum-link">` block before the footer** — human-readable expandable panel for teachers and curriculum reviewers

Both must contain the same values. Required fields:

| Field | Example | Source |
|---|---|---|
| `lesson-id` | `y7_num_11` | Task prompt (matches `lesson-map.xlsx` Lesson ID) |
| `ac9-descriptor` | `AC9M7N06` (or comma-list `AC9M7N07, AC9M7N09` for dual-tag) | Task prompt |
| `ac9-elaborations` | `3,4` or `all` or `—` (when mapping is implied) | Task prompt |
| `sa-year` | `7` | Task prompt |
| `sa-strand` | `Number` | Task prompt |
| `sa-conceptual-understanding` | The full statement from the SA Curriculum Prototype | Task prompt |
| `lesson-focus` | One-line teaching focus | Task prompt |
| `mapping-note` | One of: `Strict` / `Implied` / `Strict + cross-tag` / `Adapted (SA)` / `Created (SA)` | Task prompt |

If the task prompt omits any of these, **proceed with the lesson but mark the missing field with `TODO:` in both the meta tag and the visible panel** — don't fabricate curriculum mappings. A `TODO:` is a visible flag for the teacher to fix during review; a fabricated value is a quiet error in the audit trail.

### 3. Confirm scope before generating

If the user's request leaves anything ambiguous, ask before generating. Common things to clarify:

- Year level and curriculum context (e.g. Year 9 SA Curriculum vs Year 12 SACE Methods)
- Topic and any subtopic restriction
- What was covered in the previous lesson (so the new one references prior knowledge naturally)
- Difficulty range (single-chilli only? all three tiers? challenge content?)
- Any sections to skip (some lessons don't need vocab cards; some don't need a We Do)
- Number of problems per practice tier (default is 10 Building / 6 Stretch / 4 Mastery — adjust if the user wants more or fewer)
- Number of retrieval warm-up questions (default 3) and what prior knowledge they should cover

If the request is detailed enough already, skip the questions and build.

### 4. Propose enrichment strategies (only on explicit request)

**The standard template is the default.** Most lesson requests build using just the base structure (Sections 1–11 as documented in "Pedagogical structure" below). Do NOT propose strategies for an ordinary lesson request — that adds friction and clutters the chat.

**Strategy proposal IS triggered when the user's request includes any of:**

- The word **"enriched"**, **"enrichment"**, or the phrase **"rich lesson"** (the primary opt-in signal)
- A **named strategy** from the catalogue — e.g. "with a hinge question", "include error analysis", "use always-sometimes-never", "with faded examples", "with order-the-steps"
- A **direct strategy question** — e.g. "what strategies would work for X?", "which enrichments fit this topic?" — in which case propose without building yet

**When triggered, the flow is:**

1. Read `references/strategies.md`.
2. Propose 2–3 candidates that fit the topic and lesson position, with a one-line rationale each. Let the user pick — strategy selection is a pedagogical decision that depends on cohort, prior knowledge, and lesson purpose. Don't auto-select.
3. Build using the chosen strategy as one extra section, typically inserted in the AS A CLASS, WE DO, or YOU DO phase. Renumber subsequent sections accordingly.

**If the user named a specific strategy** (e.g. "with a hinge question"), skip the proposal step — go straight to that strategy's kit in `assets/strategies/` (if ✅) or build from the documented pattern in `strategies.md` (if 📝).

**For all other lesson requests:** skip this step entirely and proceed to step 5.

### 5. Adapt content section by section

Walk through the template in order, replacing topic-specific content. The section structure is fixed (see "Pedagogical Structure" below) — what changes is the content within each section. The annotations in the template indicate what to swap.

Topics to write content for, by section:
- **Section 0 (Retrieval warm-up):** 2–3 quick-recall questions on the *prerequisite* skills for today's lesson. These should be answerable in ~30 seconds each. Pull from prior lessons in the same unit where possible.
- **Section 1 (Why this matters):** A real-world scenario, ideally a finance one if it fits naturally. Two-column layout — left side tells the story, right side connects it to the algebra. Should be readable in 30 seconds.
- **Sections 2–4 (AS A CLASS):** vocabulary cards, a sort interactive, a match interactive.
- **Section 5 (I Do):** one worked example with three reveal steps.
- **Section 6 (We Do):** one collaborative example broken into 2–3 sub-prompts.
- **Section 7 (Quick check):** 2 questions confirming the routine.
- **Sections 8–10 (You Do tiers):** Building (≈10 questions), Stretch (≈6), Mastery (≈4 word-problems or trickier setups).
- **Section 11 (Exit ticket):** 2–3 questions, including one open-response (`a: 'TEXT'`) that surfaces a common misconception or asks the student to explain *why* something works.

For maths content:
- Variables go in `<span class="var">x</span>` (italic styling)
- Fractions go in `<span class="frac"><span class="num">3</span><span class="den">4</span></span>` (stacked notation) — NEVER inline like `3/4`
- Operators use proper Unicode: minus `−` (U+2212) not hyphen, multiplication `×` or implicit
- Greek letters use Unicode directly (α, β, θ, π)
- Superscripts use `<sup>` (e.g. `x<sup>2</sup>`)

### 6. Wire up the JavaScript data

Each practice/exit/checkpoint/we-do section has a corresponding array in the script block. The `buildPractice` function is generic — pass the array, container ID, and prefix character (R for Retrieval, P for Practice 1 / Building, S for Practice 2 / Stretch, C for Practice 3 / Mastery / Challenge, Q for Quick check, W for We do, E for Exit). Use `{ noCount: true }` for We Do problems and Retrieval problems (co-produced or prior-knowledge — shouldn't affect the student's individual progress score for *today's* lesson content).

Two optional per-question keys (see payload-spec.md for full syntax; identical in classic mode):
**`verify`** - REQUIRED on every compound-interest, simple-interest, and constant-% growth/decay
question: machine-readable parameters (`verify: 'compound:P=5000,r=0.045,n=12,t=3'`, r as a
decimal) so the answer checker recomputes from parameters instead of parsing prose.
**`fb`** - optional misconception feedback: `fb: { '21': 'Multiplication before addition - 5 x 3 first, then + 2.' }`
maps predictable wrong answers to one-sentence targeted feedback (names the error, points to the
fix, never reveals the answer). Emit only where a wrong answer has a nameable cause.

For open-response questions (qualitative explanations rather than numerical/algebraic answers), set `a: 'TEXT'`. This switches off auto-marking and shows a "Type your explanation" placeholder; the user collects these verbally or visually.

### 7. Save and present

Save to `/mnt/user-data/outputs/<topic>_lesson.html` and use the `present_files` tool to make the file available for download.

## Pedagogical structure

The lesson follows a fixed phase order. Phase banners with Georgia-bold monospace labels demarcate the transitions. The numbering across all sections is sequential (0 through ~11), so renumber if you add or skip sections.

| Phase | Default sections | Purpose |
|---|---|---|
| (Retrieval warm-up) | 0 | 2–3 quick recall questions on prior-knowledge prerequisites — distinct visual treatment, matches Exit ticket as a bookend |
| (Hook) | 1 | "Why this matters" — real-world scenario that's secretly the lesson's maths; explains the relevance in 3–5 sentences |
| **AS A CLASS** | 2, 3, 4 | Vocabulary cards + 2 concept-building interactives (e.g. sort, match) |
| **I DO** | 5 | Teacher works one example aloud; 3-step reveal (identify → apply → verify) |
| **WE DO** | 6 | Class solves one together, broken into 2–3 sub-prompts; teacher fills in |
| **YOU DO** | 7–10 | Quick check (1) → three tiered independent practice sections (3 chillies, accordion-collapsible) |
| (Exit ticket) | 11 | Closing formative assessment, 2–3 questions including one open-response — matches Retrieval visually as the closing bookend |

The Quick Check (Section 7) sits within YOU DO but visually distinct — teal left accent, ✋ "Stop & check" tag, and a stop banner at the bottom asking students to pause for a class check before continuing.

The three practice tiers (Sections 8–10) are **collapsible accordions**. Building is expanded by default; Stretch and Mastery are collapsed with a question-count badge ("6 questions") visible alongside the tier title. Students tap to expand. This reduces scrolling, gives a metacognitive moment ("which tier am I starting with?"), and lets the teacher see at a glance which tier each student has opened. The progress counter still counts all problems regardless of whether their tier is open — a student who completes only Building correctly will show e.g. 12/24, honestly communicating "you did half of what was available."

The Retrieval warm-up (Section 0) and Exit ticket (Section 11) share a deliberate visual treatment — both use a pale teal-tinted background with a teal left accent and a coloured tag (🧠 for retrieval, 🎯 for exit). They are bookends, framing the lesson.

## Design system

See `references/design_system.md` for the full spec. Critical points:

- **Palette (HTML lessons)**: teal `#1F4D54` (authority — header, section pills, vocab fronts), terracotta `#BE5837` (highlight — buttons, badges, summary banners), light grey `#F3F5F8` background, hint blue `#DDE5F5`
- **Note on house style:** PowerPoint resources currently use the older navy `#1D2B5E` / coral `#E8485A` palette. HTML lessons have moved to teal/terracotta as of May 2026. The PowerPoint house style is on track to migrate to match HTML; until that happens, HTML lessons and PowerPoint resources will look visually distinct.
- **Typography**: Georgia bold for headings; system sans-serif for body; the `.expr` class (Georgia serif) for inline maths
- **Difficulty tiers**: pale mint / wheat / terracotta backgrounds (these tier accents are independent of the highlight palette and do not need changing), coloured left-border accent, chilli stickers (🌶 / 🌶🌶 / 🌶🌶🌶), bold pill badges (●○○ Building / ●●○ Stretch / ●●● Mastery)
- **Bookend treatment**: Retrieval (Section 0) and Exit ticket (Section 11) share a pale teal-tinted background with teal left accent. Together they frame the lesson.
- **Maths typography**: fractions always stacked using `.frac`; variables italicised via `.var`; never use raw `a/b` notation

## Component library

See `references/components.md` for usage. The template implements all of these — usually you adapt rather than rebuild:

- Vocab flip card
- Drag-and-drop sort (Pointer Events for touch + mouse)
- Click-to-match pairs
- Worked example with step reveal
- Practice problem (input + Check + hint + answer toggle)
- Checkpoint section with stop banner
- Accordion practice tiers (collapsible Building / Stretch / Mastery)
- Bookend sections (Retrieval + Exit ticket — matching teal-tinted treatment)
- Teacher mode toggle
- Sticky progress bar
- Draggable-vertex constant-area triangle (DGS-style interactive)

## Enrichment strategies

See `references/strategies.md` for the full catalogue of pedagogical strategies that can be layered onto the template — hinge questions, error analysis, faded worked examples, order-the-steps, always/sometimes/never, and a dozen more. Five have working implementation kits in `assets/strategies/`; the rest are documented patterns ready to build on demand.

**Loading rule:** only read `strategies.md` when workflow step 4 is triggered (the user said "enriched"/"rich lesson", named a specific strategy, or asked which enrichments would fit). For ordinary lesson requests, ignore this file — it adds context cost without benefit.

## Variations the user commonly asks for

- **Foundation-only**: keep only the Building (single-chilli) practice tier; drop Sections 9 and 10 (Stretch and Mastery), or leave them in the accordion but collapsed
- **No vocab section**: skip Section 2 if the topic doesn't introduce new terms
- **No retrieval**: skip Section 0 if this is the very first lesson in a unit (renumber subsequent sections accordingly)
- **Multiple worked examples**: duplicate Section 5 with a different problem
- **Two We Do problems**: duplicate Section 6 — one easier, one harder
- **Real-world data theme**: replace abstract symbols with contextual values throughout
- **All tiers open by default**: remove `.open` class from `#tier1`, and don't add it to `#tier2`/`#tier3` — but the default (Building open) is recommended

## What NOT to do

- **No external dependencies.** Don't link to CDNs, web fonts, or external scripts. The lesson must work offline.
- **No inline fractions.** Always use the stacked `.frac` structure — never write `3/4` or `a/b` in display text.
- **Don't auto-mark open-response.** Use `a: 'TEXT'` for qualitative explanations.
- **Don't strand punctuation after `<strong>`.** Brackets and full stops after `</strong>` can wrap to their own line in centred text. Either put the punctuation inside the strong, or restructure the sentence.
- **Don't reproduce copyrighted worksheet content verbatim.** If the user shows a previous lesson from a publisher (e.g. Gina Wilson, MathsPathway), use it as conceptual reference only — generate fresh problems and prose.
- **Don't fabricate curriculum metadata.** If the task prompt omits an AC9 code, elaboration list, SA year, or lesson focus, write `TODO:` into that meta tag and the visible panel — never invent the mapping. The audit trail depends on this.
- **Don't skip the gradual release structure.** The phase order is part of the pedagogy. If the user asks for a "shorter" lesson, prefer trimming problems per section over removing whole phases.

## House style alignment with user's broader work

The user's PowerPoint resources use the older navy/coral palette with light-grey backgrounds, Georgia headings, and a 3-step worked example structure. HTML lessons have moved to a teal/terracotta palette as of May 2026, and the broader house style is on track to migrate to match. Until that migration is complete, HTML lessons and PowerPoints will visually differ in their primary colours but share the same typography, structural patterns, and pedagogical conventions.

## Known backlog

- **Print polish (May 2026 smoke test):** Vocab flip-cards (Section 2) print the back face mirrored/upside-down because the CSS `rotateY(180deg)` is captured by print rendering. Fix would be a `@media print` rule that either hides flipped backs or renders both faces side-by-side. Browser experience is unaffected.
- **Print polish (May 2026 smoke test):** The `<details class="curriculum-link">` panel can paginate ahead of the Exit ticket section in print output, putting curriculum metadata between the practice tiers and the closing exit ticket. Browser order is correct; only print is wrong. Fix is likely a `break-before: page` rule on the curriculum-link panel or `break-inside: avoid` on the exit ticket section.
