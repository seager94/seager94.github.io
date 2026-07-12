# Project Log — Interactive HTML Maths Lesson Library

*Decisions, deferrals, and standing rules for the AC9 7–10 lesson library.*
*This is the third memory layer. It is NOT lesson state and NOT process docs (see "Where things live" below).*

Last updated: 2026-07-10

---

## Where things live (the three layers)

Nothing important should live only in a chat. Each kind of knowledge has one home:

- **Lesson state** → `lessonmap.xlsx` (the Coverage Report sheet is the live status). One row per planned lesson; Status/URL/elaborations live here.
- **Process & style** → the claude.ai **project instructions** + the `interactive-html-maths-lesson` skill (`SKILL.md`, `references/`). How lessons are built.
- **Decisions, backlog, deferrals** → **this file.**

## File topology — the single-master rule

- **Master:** `lessonmap.xlsx`, in the repo, on the **`main`** branch (trunk + what GitHub Pages serves). This is the only authoritative copy.
- **`lesson-gen` branch:** generation/working branch. After any change to the master, merge `lesson-gen` → `main` (fast-forward) so trunk and the published site agree.
- **Project upload (claude.ai):** a *mirror* only, zero authority. It is the copy Claude reads to draft tasks.txt. **Re-upload it from the master after every change**, or new chats draft from stale data.
- **`lessonmap_reconciled.xlsx`:** generated output of `reconcile_lessonmap.py` (it reads the master, writes this for review). Never a master. Gitignored.
- **`_lessonmap_archive/`:** retired copies, kept for history. Not read by anything.

> Why this rule exists: on 2026-05-30 we found 7 scattered copies under 4 different names, with the pipeline reading a 22-May copy while the current work sat in Downloads. One master + one mirror prevents that.

## Chat convention

One chat per work-unit — a batch, a strand review, a skill change, a reconciliation. Name it for the unit (e.g. `Y9 Algebra — batch`, `Skill — Check-button fix`). Open by naming the slice and pointing at this log; close by updating `lessonmap.xlsx` + this log.

---

## Standing decisions

- **2026-05-30 — Re-map rule.** When the built lessons on disk diverge from the planned decomposition, built lessons *supersede* the planned rows for any descriptor they cover; only genuine descriptor-gaps are kept as Planned. Tags + elaborations are pulled from each file's `<meta>` block where present (authoritative), inferred only when the file has none.
- **2026-05-30 — Y7 Space & Probability kept, not regenerated.** Both were sound, deliberately-scoped builds (confirmed against AC9 + the 22-May scoping decision); re-mapped rather than rebuilt.
- **2026-05-30 — Y10 Algebra legacy set: regenerate, don't retrofit.** The 12 on-disk files are the old foundational set; the current Y10 plan is advanced. Rows stay Planned; files get overwritten on regeneration.
- **Branch model:** master on `main`; `lesson-gen` merges up after map changes. (GitHub Actions runs "Use workflow from `lesson-gen`".)

## Deferred items (with reasons)

- **Y7 SP03 transformations (2 lessons)** — deferred: elaborations need a built transformation interactive (drag/reflect/rotate on a Cartesian grid), a component build of its own. Rows `y7_spa_08`, `y7_spa_09` (Planned).
- **Y8 SP03 3D coordinates (1 lesson)** — only uncovered Y8 Space descriptor. Row `y8_space_12` (Planned).
- **First Nations lessons** — Y7 Space SP01 E6 (artworks/cultural maps) and a Y7 Probability lesson — deferred for dedicated, culturally-respectful treatment, not batch lines.

## Open debts (quality / consistency)

- **verify_answers.py extraction is line-based - multi-line practice objects are invisible.** Confirmed 2026-07-12 on y8_mea_13 + y8_num_11: both store 32/33 answers as one-key-per-line objects (q: and a: on separate lines), so the same-line q/a regex (line 90) finds zero stored answers. Original faded/explorer-wiring hypothesis wrong - pure formatting. FIXED 2026-07-12: extract() now whole-text finditer (line numbers derived from match offset); y8_mea_13/y8_num_11 report 32/33 answers (all MANUAL - rates/tax, outside Tier-1 formulas). Regression: y8_num_09 still 35 answers; its 3 MISMATCHes are the known prose-misparse false positives (stored values are the 2026-07-10 corrections) - killed properly by the data-verify lift.
- **Y8 Space files carry NO metadata block.** All 10 `y8_space_*` files have empty `lesson-id` / `ac9-descriptor` / `ac9-elaborations`. In the map their descriptors are *inferred* and elaborations are `TODO: backfill (file meta missing)`. The `parallel_lines_angle_reasoning` → AC9M8SP02 tag is unconfirmed. → backfill the meta blocks in the files.
- **Year-7 in-file meta backfill.** Several published Y7 files have `TODO` elaborations; two have `TODO` **descriptors**: `y7_alg_07` (likely AC9M7A02) and `y7_num_12`. Also TODO-elaboration files: `y7_alg_05`, `y7_mea_02/03/04/05/07/08/10/11`. (Sheet has the numbers; the *files* need them written in.)
- **Strand-code convention drift:** `spa` (Y7) vs `space` (Y8), `prb` vs `pro`. Rule for now: match the siblings already in each folder. Whole-repo reconciliation is separate housekeeping.
- **SA Mapping sheet** in the workbook is still a placeholder (SA CU → AC9 codes never populated). Low priority — SA CU is already per-row on the Lessons sheet.

## Housekeeping (pending)

- **Bin 3 files** (decided 2026-05-30, not yet run): `year-9/probability/probability_rule_choice_lesson_AC9M9P01_AC9M9P02.html` (off-convention; Y9 to be built fresh), `like_terms_lesson_11.html` (repo root), `lesson-drafts/y7_test_lesson.html`. → `git rm` + commit.
- **Retired Y8 Measurement enrichment ideas** (dropped from the map by the re-map rule; re-add as Planned if still wanted): `applying_circle_formulas`, `pythagoras_in_context`, `scale_and_proportion_in_design`, `modelling_currency_exchange_and_phone_plans`, and a 2nd rates lesson. All seven M-descriptors remain covered without them.
- **Y9 Algebra A03–A06 forward renumber.** The built 01–06 inserted a dedicated index-laws lesson, displacing the planned gradient/distance/quadratics/modelling/transformations sequence (old rows 128–139) down by one+. Those rows are still Planned but their `Lesson #` no longer aligns with the built sequence. → dedicated Y9-Algebra reconciliation pass to renumber.

## Build backlog (by priority)

1. **Finish Year 8** — Algebra `#06` (1), Statistics (6), Probability (4), + Y8 SP03 3D coordinates (1). ≈12 lessons.
2. **Year 9** — Algebra 01–06 published; remainder (Algebra 07+ and all other strands) still to build. ≈42 lessons.
3. **Year 10** — only the legacy Algebra folder exists; regenerate Algebra to the advanced plan + build Number/Measurement/Space/Statistics/Probability. ≈54 lessons.
4. **Y7 SP03 transformations** — once the transformation interactive component exists.
5. **Curriculum index page** — needs a `lessonmap.json` export (export exists and is tracked on main as of 2026-07-10; build the page from it); build from the master.

---

## Changelog

### 2026-05-31 — Y9 Algebra 01–06 + pipeline batch-hide fix
- **Fixed the remote batch over-build bug.** The GitHub Actions workflow was building all lessons in a batch on every task line, because `claude -p` reads outside its working dir by design (confirmed vs Claude Code docs) — the agent found `batches/<name>.txt` and "completed the unit". Fix: the workflow now reads task lines into memory, moves `batches/` out of the checkout during generation, then restores it before commit. Proven across two remote batches.
- **Year 9 Algebra 01–06 built, validated, published** to `year-9/algebra/`. y9_alg_01–02 + 04–06 via remote batches; y9_alg_03 built locally after it alone hit Claude Code's 32k output-token ceiling on the runner (raising `CLAUDE_CODE_MAX_OUTPUT_TOKENS` is unreliable — multiple open bugs; not used). All six click-tested (Check buttons red/green).
- **Re-mapped Y9 Algebra rows 123–128** per the built-supersedes-planned rule: built decomposition (index laws split across 01–03, then expanding/special-products/factorising 04–06) superseded the planned numbering. Tags/elaborations pulled from each file's `<meta>` block (authoritative). Map now: 110 Published, 111 Planned, 221 rows.
- Merged `lesson-gen` → `main` (fast-forward); refreshed the project mirror.

### 2026-05-31 — Standing decision: batch-vs-plan cross-check
- **Before any batch tasks.txt is drafted, the planned lessonmap rows for that year+strand must be read and the batch numbering reconciled against them.** Divergence (different lesson count, reordered/shifted descriptors) is flagged with before/after rows and decided *before* generation — never discovered at closeout. (Origin: this batch's 01–06 collided with 17 pre-planned Y9 Algebra rows because it was drafted without checking the plan.) Also recorded in project instructions.

### 2026-05-30 — Reconciliation + file consolidation
- Reconciled the map against the repo: **70 → 104 Published**, 117 Planned, 221 rows. Was recording only 24.
- Fixed Coverage Report status formulas (were pointed at column M / Prerequisites; now N / Status).
- Re-mapped four divergent strands from file meta: Y7 Probability (4), Y7 Space (7 + 2 SP03 Planned), Y8 Measurement (13, complete), Y8 Space (10 + 2 Planned; meta inferred).
- Consolidated 7 scattered copies → one master (`lessonmap.xlsx` on `main`); archived 5 stale copies; gitignored the reconcile output; merged `lesson-gen` → `main`; refreshed the project mirror.
- Established the file-topology, branch, and chat-convention rules above.

## 2026-06-07 — Year 10 Algebra Batch 1 published (y10_alg_01–10)

**Strand opened:** Year 10 Algebra (AC9M10A01, AC9M10A02). All 20 planned rows reconciled against AC9 + SA Prototype 2 before drafting — plan was clean, 23/23 elaborations covered across 20 lessons, no decomposition divergence. Batch 1 = L01–L10.

**Published (lesson-gen → main, live on Pages):**
- L01 expanding special products — Error Analysis
- L02 factorising quadratics (AC method) — Order the Steps
- L03 completing the square — Faded Examples (+ parabola SVG, turning point)
- L04 solving quadratics + formula — Hinge Question on discriminant (mapping-note: Implied — formula not in an AC9 elaboration)
- L05 negative exponents — Always/Sometimes/Never
- L06 simultaneous graphically — Slider Parameter Widget (match-the-target)
- L07 simultaneous algebraically — Faded Examples (elimination)
- L08 modelling — Multiple Representations (explorer, not auto-marked); incl. Weme/Warlpiri investigation
- L09 graphing inequalities — Hinge Question on shading conventions
- L10 feasible regions — plain template (tiered practice is the interactive core)

**Strategy rule applied:** interactive + self-marking only; open-response strategies (notice/wonder, goal-free, compare-two-solutions, self-explanation) deliberately excluded per Sam.

**Collision cleaned up:** the old pre-pipeline Year 10 Algebra files (one/two-step equations, index laws, single brackets, etc.) were squatting on y10_alg_02–11 with different topics. Removed 15 files (11 HTML, 2 PDF worksheets, Substitution_Interactive_Lesson.html, placeholder.txt) in commit before the batch merge. Link-search step was skipped — low risk (pre-lessonmap experiment files) but a year-10 index, if one exists, should be re-checked for dead links.

**Known quirks to revisit (cosmetic, not blockers):**
- L05: Quick Check answer `a^6/4` trips formatAnswerDisplay's fraction regex → reveal renders 6/4 stacked. Auto-mark works. Load-bearing function left untouched. Swap the question later if it bothers students.
- L09: model self-corrected several SVG boundary/polygon coordinates by eye during the build. Re-confirm each shaded region sits on the test-point side. NEEDS A LIVE EYEBALL.

**Pipeline notes this run:**
- L07 first attempt died on an API socket drop (~9 min in) — run-batch printed "Task complete" anyway (it does so regardless of claude -p success). Single-line re-run succeeded. Treat sub-5-min builds / socket errors as failed regardless of the completion line.
- normaliseAnswer additive rewrites this batch: L02 accepts (x-5)^2 ↔ (x-5)(x-5); L06 strips parens + accepts Unicode minus for coordinate pairs.

**Lessonmap:** y10_alg_01–10 flipped to Published, Generated date 2026-06-07, URLs set. Tally 120 Published / 101 Planned.

**Next:** Batch 2 = y10_alg_11–20 (A03/A04/A05 — exponential functions, growth/decay incl. finance, digital-tool experimentation). Strategy propose-and-pick still pending for those.

## 2026-06-08 — Year 10 Algebra Batch 2 published (y10_alg_11–20)

**Strand completed:** Year 10 Algebra is now fully built (L01–L20). Batch 2 covered AC9M10A03/A04/A05 — exponential functions, growth/decay (incl. finance), and digital-tool experimentation. Plan reconciled against AC9 + SA Prototype 2 before drafting; no decomposition divergence.

**Published (lesson-gen → main, live on Pages):**
- L11 introducing exponential functions — Hinge Question
- L12 features of exponential graphs — Always/Sometimes/Never (Slider widget deliberately dropped — SVG-heavy, low marking value)
- L13 solving exponential equations — Faded Examples (incl. First Nations Ranger feral-animal contexts)
- L14 choosing linear/quadratic/exponential models — Hinge Question
- L15 exponential growth and decay — Error Analysis
- L16 compound interest modelling — Faded Examples (finance flagship)
- L17 carbon dating + applied decay — Two Truths and a Lie
- L18 intersections with digital tools — Estimation Ladder (bisection)
- L19 circle equations and transformations — Error Analysis (centre sign-flip); three labelled-grid circle SVGs
- L20 intervals and iterative methods — Order the Steps (bisection)

**Strategy re-weighting:** mid-batch, picks were re-weighted toward auto-marking strategies; open-response/discussion-dependent strategies stay excluded. Propose-and-pick (Sam selects) unchanged.

**L16 compound-interest cent-drift bug (found + fixed):** the model rounded the intermediate (1+r/n) before applying the exponent, drifting the final answer by a few cents in every multi-compounding (daily/monthly/quarterly) answer; annual (n=1) was safe. Recomputed all 24 money answers in Python; four were wrong and fixed: S2 daily 6749.29→6749.13, S6 quarterly 10408.86→10408.83, F3 monthly worked line 13610.34→13608.39, M5 difference 38.69→38.61. Added ±5c tolerance to the faded-input checker (checkInline) — but NOT to the locked checkAnswer, which stays exact-match.

**New tool — `verify_answers.py` (repo root, committed):** Tier-1 answer checker. Recomputes compound interest A=P(1+r/n)^(nt), simple interest, and constant-% growth/decay straight from each question's prose, extracts every stored `a:'...'` answer, and flags any drift beyond tolerance; anything it can't parse is listed as MANUAL (never silently passed). Wildcard-expanding, so `python verify_answers.py y10_alg_*.html` sweeps a whole strand. **Rounding-awareness patch:** questions saying "nearest whole/dollar" (or whole-number stored answers) compare at ±$0.50 instead of ±1c — kills the false-positive class (caught three L15 "nearest whole" answers that were correct). Strand-wide sweep of all 20 lessons ran clean: zero real answer errors. Future lift (not done): have the skill emit `data-verify="compound:P=…,r=…,n=…,t=…"` metadata so the checker reads parameters instead of parsing prose — would also reach faded calc-box and difference questions Tier 1 can't.

**Hard lessons this batch (process):**
- **Excel-lock silent-save trap.** A map flip via openpyxl silently did nothing because lessonmap.xlsx was open in Excel (file locked; save threw nothing, wrote nothing). The committed map sat stale at 120/101 while everyone believed it was 130/91 — surfaced only at the merge. → flip script now REOPENS the file after saving and prints the on-disk tally to confirm persistence; close Excel before any flip.
- **The 20-file gate.** Batch 2c built only L18 and L20 — L19 was silently skipped by the run (never generated). A merge was attempted at 17/20 on the branch, which (combined with the stale map) produced a long binary-merge tangle. → `git ls-files year-10/algebra/ | Measure-Object -Line` must equal the expected count BEFORE any map flip or merge. L19 rebuilt fine on a single-line re-run (equation notation spelled out as "x squared plus y squared" to dodge any superscript-glyph risk in the prompt).
- **Binary merge conflict on lessonmap.xlsx recurs on every lesson-gen→main merge.** Git can't auto-merge .xlsx. Resolution that works: `git checkout lesson-gen -- lessonmap.xlsx` (pull the file from the named branch — unambiguous, unlike --ours/--theirs, which resolved to the WRONG side here and staged the stale 120/101). A broken `.gitattributes` line (`merge=theirs`, no such driver) was created then removed. → proper `merge=ours`-driver guard still TO DO.

**Lessonmap:** y10_alg_11–20 flipped to Published, Generated date 2026-06-08, URLs set, reopen-after-save confirmed on disk. Tally 130 Published / 91 Planned.

**Open debt carried forward:**
- L09 + L19 machine-drawn SVG geometry needs a live browser eyeball (shaded regions / circle centre+radius placement sitting correctly). L05 `a^6/4` fraction-reveal cosmetic quirk still open.
- L20 share/medicine threshold questions (n=9, n=12): function values confirmed in Python, threshold-vs-answer wording still wants an eyeball.
- ~~`.gitattributes merge=ours` guard for lessonmap.xlsx~~ RETIRED 2026-07-10: obsolete under single-editing-home-on-main (map is edited only on main; lesson-gen fast-forwards to match, so the lesson-gen -> main binary-merge path no longer exists).
- Sweep Y9 and earlier finance lessons for the same multi-compounding intermediate-rounding drift.

**Next:** Y10 Algebra complete. Remaining Y10 strands (Number/Measurement/Space/Statistics/Probability) and the Y9/Y8 backlog per build-backlog priorities.

## 2026-07-10 (session 2) — Pipeline hardening pass (post-pilot)

Nine-step run order executed after the payload pilot. All closed.

**Structural changes:**
- **Skill has ONE physical copy now.** The installed path `C:\Users\sdavi\.claude\skills\interactive-html-maths-lesson` is a directory junction into the repo's `.claude/skills/` copy. Editing the repo edits the installed skill; the sync step is dead. The pre-junction folder is parked at `...\interactive-html-maths-lesson.bak` — delete after the next successful lesson build through the junction.
- **`lessonmap.json` tracked on main** (was committed at close-out 2026-07-09; verified, refreshed). Unblocks the curriculum index page.
- **Execution policy set permanently:** `CurrentUser = RemoteSigned`. Per-terminal Bypass ritual dead. Side effect (wanted): browser-downloaded .ps1 stays blocked until `Unblock-File`.
- **`check-ascii.ps1`** (projects root): scans all .ps1 for non-ASCII. Rule: run against any new .ps1 before first execution. Deployed `run-batch-v2.ps1` cleaned (21 chars — em-dashes and ≥ in comments/notes).
- **`close-out.ps1`** (projects root): scripted close-out. Checks branch, optional 20-file gate (`-LessonFolder`/`-ExpectedCount`), ASCII sweep, JSON export (catches Excel-lock), commit-landed proof (the silent-non-commit trap), branch levelling, both-branches-same-hash proof. `-Commit -Message "..."` to ship; bare = check-only. Proven live both modes.

**Frame + QA (the "Year" fix and the gate that enforces it):**
- Frame curriculum panel and footer now prefix the literal "Year " before the bare `meta_sa_year` slot ("Year 8 · Statistics", was "8 · Statistics").
- `qa_lessons.py` gained a FAIL-class visible-panel check: panel `cl-value` row must read "Year N · Strand" matching the meta, and every AC9 code in meta must appear in the visible body. Closes the pilot's blind spot (gate checked `<head>` only). Proof-of-failure run: both pilots FAILed on the stale panel before re-assembly — gate works.
- Both pilots re-assembled through the fixed frame from retained payloads, QA-passed, click-tested, republished. Cheap re-assembly worked exactly as designed — **keep payload JSONs forever** (rule now in payload-spec).

**payload-spec.md rewritten:** status pilot→proven; full 29-slot inventory verified against the frame; slot changelog (the five post-pilot slots); **`meta_lesson_focus` documented — it was in the frame and manifest but missing from the spec schema; any payload written from the old spec alone would have failed assembly.** Bare-year rule documented ("Year " lives in the frame, never in the slot value). Frame is a maintained artefact — edit directly, never rebuild from template.

**Retrofit audit (149 published lessons, all three symptom classes):**
- Unicode dash inside stored answers: **0 files.** No retrofit needed — dash class closed with data. (Dashes in script display strings are house typography, not faults.)
- Fraction-reveal (`^` + `/` in answers): 3 files — y10_alg_03, y10_alg_05 (already logged), y10_alg_17. Cosmetic reveal-display only; marking unaffected. Logged, not touched.
- Cent-drift sweep (verify_answers.py over Y7/Y8 finance lessons): **y8_num_09 had 3 genuinely wrong Mastery answers** (multi-step percentage chains: 9270→9183, 5539.32→5555.44, 96219→93443 — one contradicted the question's own hint). Hand-recomputed, fixed, click-tested, republished. Y10 finance-sweep debt from 2026-06-08 now covered for Y7/Y8; Y9 has no finance lessons built yet.

**Open debts added/refreshed:**
- verify_answers.py misparsed the y8_num_09 const-% questions (wrong P/r extracted from prose) — verdicts were right, parameters weren't. Strengthens the case for the `data-verify` metadata lift already logged 2026-06-08.
- y10_alg_03 / y10_alg_17 join y10_alg_05 on the fraction-reveal cosmetic list.
- `.bak` skill folder deletion pending first junction build.
