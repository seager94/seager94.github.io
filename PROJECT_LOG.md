# Project Log — Interactive HTML Maths Lesson Library

*Decisions, deferrals, and standing rules for the AC9 7–10 lesson library.*
*This is the third memory layer. It is NOT lesson state and NOT process docs (see "Where things live" below).*

Last updated: 2026-05-30

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

- **Y8 Space files carry NO metadata block.** All 10 `y8_space_*` files have empty `lesson-id` / `ac9-descriptor` / `ac9-elaborations`. In the map their descriptors are *inferred* and elaborations are `TODO: backfill (file meta missing)`. The `parallel_lines_angle_reasoning` → AC9M8SP02 tag is unconfirmed. → backfill the meta blocks in the files.
- **Year-7 in-file meta backfill.** Several published Y7 files have `TODO` elaborations; two have `TODO` **descriptors**: `y7_alg_07` (likely AC9M7A02) and `y7_num_12`. Also TODO-elaboration files: `y7_alg_05`, `y7_mea_02/03/04/05/07/08/10/11`. (Sheet has the numbers; the *files* need them written in.)
- **Strand-code convention drift:** `spa` (Y7) vs `space` (Y8), `prb` vs `pro`. Rule for now: match the siblings already in each folder. Whole-repo reconciliation is separate housekeeping.
- **SA Mapping sheet** in the workbook is still a placeholder (SA CU → AC9 codes never populated). Low priority — SA CU is already per-row on the Lessons sheet.

## Housekeeping (pending)

- **Bin 3 files** (decided 2026-05-30, not yet run): `year-9/probability/probability_rule_choice_lesson_AC9M9P01_AC9M9P02.html` (off-convention; Y9 to be built fresh), `like_terms_lesson_11.html` (repo root), `lesson-drafts/y7_test_lesson.html`. → `git rm` + commit.
- **Retired Y8 Measurement enrichment ideas** (dropped from the map by the re-map rule; re-add as Planned if still wanted): `applying_circle_formulas`, `pythagoras_in_context`, `scale_and_proportion_in_design`, `modelling_currency_exchange_and_phone_plans`, and a 2nd rates lesson. All seven M-descriptors remain covered without them.

## Build backlog (by priority)

1. **Finish Year 8** — Algebra `#06` (1), Statistics (6), Probability (4), + Y8 SP03 3D coordinates (1). ≈12 lessons.
2. **Year 9** — nothing built yet (bar the binned orphan). ≈48 lessons, strand by strand.
3. **Year 10** — only the legacy Algebra folder exists; regenerate Algebra to the advanced plan + build Number/Measurement/Space/Statistics/Probability. ≈54 lessons.
4. **Y7 SP03 transformations** — once the transformation interactive component exists.
5. **Curriculum index page** — needs a `lessonmap.json` export (does not exist yet); build from the master.

---

## Changelog

### 2026-05-30 — Reconciliation + file consolidation
- Reconciled the map against the repo: **70 → 104 Published**, 117 Planned, 221 rows. Was recording only 24.
- Fixed Coverage Report status formulas (were pointed at column M / Prerequisites; now N / Status).
- Re-mapped four divergent strands from file meta: Y7 Probability (4), Y7 Space (7 + 2 SP03 Planned), Y8 Measurement (13, complete), Y8 Space (10 + 2 Planned; meta inferred).
- Consolidated 7 scattered copies → one master (`lessonmap.xlsx` on `main`); archived 5 stale copies; gitignored the reconcile output; merged `lesson-gen` → `main`; refreshed the project mirror.
- Established the file-topology, branch, and chat-convention rules above.
