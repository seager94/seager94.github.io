---
description: Autonomous /next-lesson for the nightly cloud routine - picks the next Planned lesson, chooses strategies, builds it and opens a PR into lesson-gen with no human input
---
You are building ONE lesson for the seager94.github.io library, unattended. There is no human in this session: never stop to ask a question or wait for a reply. Where /next-lesson would ask, follow the rule given here instead.
Hard rules: never open or read batches/, tasks.txt or any task list. Never edit lessonmap.xlsx or lessonmap.json. Never mark anything Published. Never commit to main or lesson-gen directly. Never merge anything (no git merge, no gh pr merge, no auto-merge). Never edit .github/ or check_lesson.py.

PHASE 0 - SET UP
1. Routines clone main by default. Run git fetch origin, then git checkout lesson-gen (tracking origin/lesson-gen), and confirm you are on lesson-gen at origin/lesson-gen before doing anything else.
2. Check whether gh works (gh auth status). If it does not, use whatever GitHub tool the session provides for PRs, and skip any step below that needs gh only for reading CI.

PHASE 1 - SELECT (no building)
There is no lesson-id override: always select from the map.
3. Read lessonmap.json from lesson-gen.
4. Keep rows with status Planned.
5. Drop rows with any prerequisite that is not Published.
6. Drop rows already in progress: the row's filename already exists on lesson-gen, or any branch listed by git ls-remote --heads origin has a name containing the lesson-id. If gh works, also drop rows whose lesson-id appears in an open PR (gh pr list --state open --search <lesson-id>).
7. Drop parked rows: y7_spa_08, y7_spa_09.
8. Choose by priority: Y9 Measurement, then Y9 Space, then Y9 Statistics, then Y9 Probability; lowest lesson_num first within a strand.
9. If no row is eligible, stop here: print a short summary (how many Planned rows there were and why each priority strand had nothing eligible), create no branch and open no PR.
10. Record the chosen row (id, topic, descriptors, elaborations, lesson_focus, prerequisite status) plus the next two candidates, for the PR description.

PHASE 2 - DRAFT AND CHOOSE (no stop)
11. Read tasks-pattern.md and draft the full task line to its Required structure. Take every metadata field from the row and the curriculum JSONs verbatim, including the full descriptor text and CU statement. Supply lesson-focus verbatim from the row. Include the mandatory visual clause for geometric, measurement, statistical or graphical topics, 3-6 core examples, and Stretch/Mastery guidance. Use a finance context where it fits naturally. Never demand an answer form the marker cannot enforce.
12. Strategies. Read strategy-queue.md on lesson-gen and ignore lines starting with #.
    - If it has a line <lesson-id>: <strategies> for the chosen lesson-id, use those strategies exactly as written, in the placements given. Do not add, drop or substitute any. Source = queue.
    - Otherwise read .claude/skills/interactive-html-maths-lesson/references/strategies.md and choose 1-2 strategies that fit the lesson's purpose. Prefer auto-marked, interactive strategies and exclude open-response or discussion-dependent ones. Write a 2-3 sentence rationale that cites the research evidence given for each strategy in strategies.md. Source = chosen.
13. Mode: payload for standard-shape lessons; classic if a chosen strategy needs a bespoke interactive widget that the payload kit cannot express. Record the model this session is running as, and note whether the build used kit-covered visuals (Sonnet-suitable) or novel interactive widgets (Opus-suitable).
14. Insert the strategies into the task line in place of [STRATEGY].

PHASE 3 - BUILD
15. Create and check out a new branch named claude/<lesson-id> from lesson-gen.
16. Build with the interactive-html-maths-lesson skill, using the row's filename and the repo's existing folder convention. In payload mode, save the payload JSON to payloads/year-N/<strand>/ and assemble it with assemble_lesson.py.
17. Run qa_lessons.py. Run verify_answers.py if any answers are formula-computed. Confirm the lesson-focus meta tag and the visible panel both match the row. Fix any failures.
18. Check for Playwright 1.56.0 (the version pinned in .github/workflows/lesson-checks.yml): python -c "import importlib.metadata as m; assert m.version('playwright') == '1.56.0'" and python -m playwright install chromium. If either fails, try pip install playwright==1.56.0 once and retry; if it still fails, skip this step, record "check_lesson.py not run locally: Playwright unavailable - relying on the Lesson checks workflow" for the PR, and go to step 19.
    If Playwright is available, run python check_lesson.py <lesson path>. It also runs qa_lessons.py and verify_answers.py, and writes check-output/<lesson-id>-report.md and check-output/<lesson-id>-figures.png. Fix every FAIL in the lesson (in payload mode, fix the payload JSON and re-assemble), never in check_lesson.py, and re-run until there is no FAIL. Fix WARNs where you can; list the rest in the PR. Open the figures contact sheet and look at every figure yourself. Do not commit check-output/ (it is gitignored).
19. Commit to claude/<lesson-id> and push it to origin.
20. Open a PR from claude/<lesson-id> into lesson-gen (gh pr create --base lesson-gen --head claude/<lesson-id>), never into main. The description must open with these items, in this order:
    - Lesson-id (with topic, and the next two candidates).
    - Strategies, and whether they came from the queue or were chosen; if chosen, the 2-3 sentence rationale.
    - Mode (payload or classic) and why.
    - Model this session ran as.
    - QA and checker results: qa_lessons.py and verify_answers.py results; the check_lesson.py summary (the overall line and results table from the report, plus every FAIL/WARN line), or the Playwright-unavailable note from step 18.
    - "Browser spot-check pending (Sam)"
    Then the full task line used for the build.
21. If gh works, find the Lesson checks run (gh run list --workflow lesson-checks.yml --branch claude/<lesson-id> --limit 1), wait for it with gh run watch <run-id>, get the artifact id (gh api repos/{owner}/{repo}/actions/runs/<run-id>/artifacts --jq '.artifacts[] | select(.name=="lesson-check-output") | .id'), then gh pr edit to append "Figures contact sheet: https://github.com/<owner>/<repo>/actions/runs/<run-id>/artifacts/<artifact-id> (<lesson-id>-figures.png inside)". If the workflow FAILs, fix the lesson, push again to the same branch and re-check. If gh does not work, add a line to the PR saying the workflow result was not read by the routine.

IF THE BUILD CANNOT BE COMPLETED
22. If any step after step 15 cannot be completed (the build fails, a FAIL survives three fix-and-rerun rounds, a required script errors, or anything else blocks you), do not give up silently: commit whatever exists on claude/<lesson-id> (never check-output/), push it, and open a draft PR into lesson-gen (gh pr create --draft --base lesson-gen). Its description opens with the same items as step 20 as far as they are known, then a "What failed" section with the failing step, the exact error or FAIL lines, and what you tried.
