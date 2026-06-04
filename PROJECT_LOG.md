# Project Log — Interactive HTML Maths Lesson Library

*Decisions, deferrals, and standing rules for the AC9 7–10 lesson library.*
*This is the third memory layer. It is NOT lesson state and NOT process docs (see "Where things live" below).*

Last updated: 2026-06-01

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
- ~~**Y9 Algebra A03–A06 forward renumber.**~~ **RESOLVED 2026-06-01** by the 18-lesson re-map (see changelog). Rows 07–18 now renumber cleanly behind the built 01–06; descriptors run A03→A04→A05→A06 in order.

## Build backlog (by priority)

1. **Finish Year 8** — Algebra `#06` (1), Statistics (6), Probability (4), + Y8 SP03 3D coordinates (1). ≈12 lessons.
2. **Year 9** — Algebra 01–18 **complete and published** (full strand). All other Y9 strands still to build: ≈29 lessons across Measurement (12), Space (7), Statistics (6), Probability (4).
3. **Year 10** — only the legacy Algebra folder exists; regenerate Algebra to the advanced plan + build Number/Measurement/Space/Statistics/Probability. ≈54 lessons.
4. **Y7 SP03 transformations** — once the transformation interactive component exists.
5. **Curriculum index page** — needs a `lessonmap.json` export (does not exist yet); build from the master.

---

## Changelog

### 2026-06-04 — Y9 Algebra 07–18 built, published; strand complete
- **All 12 remaining lessons (07–18) built locally and published** to `year-9/algebra/`, completing the Y9 Algebra strand (01–18). Map rows 129–140 flipped Planned→Published with live URLs and generation dates; map now **122 Published, 100 Planned, 222 rows**. Metadata confirmed present in each file's `<meta>` per generation summaries.
- **Everything ran local, not on the runner.** The Actions runner failed the whole `y9-alg-03` batch on the 32k output-token ceiling (every task, not just one); the same lessons build cleanly one-at-a-time locally — including 18, the four-family SVG lesson flagged as the heaviest. Confirms the ceiling is a *runner-side* problem (extra context in the checkout), not per-lesson output size. Root-cause investigation split into its own chat. Build/publish flow used: write `tasks.txt` → `run-batch.ps1` local → review → push to `lesson-gen` → merge to `main`.
- **Two transient failures during the runs, both recovered by simple rerun:** lesson 14 dropped a socket mid-build (network, not size); reran solo and succeeded. No template changes needed.
- **Workflow learnings:** (1) the browser-download step for batch `.txt` files repeatedly failed silently, causing stale-`tasks.txt` reruns of already-built lessons — switched to writing `tasks.txt` directly (VS Code new file, or PowerShell `Set-Content`), no download in the loop. (2) Always verify `tasks.txt` contents (`Select-String "lesson-id is"`) before running, to catch a failed copy before wasting compute. (3) `run-batch.ps1` skips `#`-prefixed lines (confirmed line 9) as well as blanks. (4) `tasks.txt` should not live in the repo — gitignore candidate.

### 2026-06-01 — Y9 Algebra re-planned to 18 lessons; 07–10 drafted to run
- **Found the real Y9-Algebra batch files** (uploaded to the repo, not stored in the project): `y9-alg-01`/`-02` = lessons 01–06 (the published set), plus drafted `y9-alg-03`/`-04` carrying a **13-lesson** decomposition (07–13). The 13-lesson build diverged from the map's 17-row plan and, on review, under-covered the curriculum.
- **Decision: go to an 18-lesson plan (07–18), thoroughness over compression.** Two genuine content gaps in the 13-lesson version are filled: **parallel & perpendicular lines** (A03 elaboration 2, new `y9_alg_09`) and **families of functions** (A06 elaboration 3, new `y9_alg_18`). A05 modelling and A06 transformations each restored from 1 compressed lesson back to 3. Gradient kept as its own lesson (`y9_alg_07`), which is what pushed the total from 17 to 18. A04 decomposition adopted from the uploaded files (graph / graphical-numerical solve / algebraic solve), with the moon-phase First Nations elaboration (A04 e7) folded into `y9_alg_11`.
- **Quality fixes applied to carried-over lines:** `y9_alg_12` (algebraic solving) now requires a small parabola figure (it was the only solving lesson without one); the modelling and transformation lessons (`13`–`18`) are tagged `auto-marked + open-ended` so generalisation/evaluation items aren't forced through the Check button.
- **Batch files rewritten** to the 18-lesson plan, grouped by descriptor: `y9-alg-03` = 07–10 (A03 + first A04), `y9-alg-04` = 11–12 (rest of A04), `y9-alg-05` = 13–15 (A05), `y9-alg-06` = 16–18 (A06). `y9-alg-03` runs first; the SVG-heavy lessons (11, 17, 18) are the likely 32k-token-cap repeat offenders — build locally if one comes back truncated.
- **Lessonmap rewritten** (rows 129–140): old Planned 07–17 replaced with the 18-lesson plan, Measurement+ shifted down one row. All 07–18 left as **Planned** (not yet built) — `Planned`→`Published` flip and `<meta>` confirmation is the closeout pass after the batches run. Map now: **110 Published, 112 Planned, 222 rows.**
- **Resolved** the open "Y9 Algebra A03–A06 forward renumber" debt — the 18-plan renumbers 07–18 cleanly behind the built 01–06.

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
