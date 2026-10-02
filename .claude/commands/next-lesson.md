---
description: Pick the next Planned lesson from lessonmap.json, propose strategies, then build it and open a PR into lesson-gen
argument-hint: [optional lesson-id to override selection]
---
You are building ONE lesson for the seager94.github.io library.
Hard rules: never open or read batches/, tasks.txt or any task list. Never edit lessonmap.xlsx or lessonmap.json. Never mark anything Published. Never commit to main.

PHASE 1 - SELECT (no building)
If a lesson-id was given ($ARGUMENTS), use that row and go to step 7.
1. Run git fetch origin and read lessonmap.json from origin/lesson-gen.
2. Keep rows with status Planned.
3. Drop rows with any prerequisite that is not Published.
4. Drop rows already in progress: the row's filename already exists on origin/lesson-gen, or a remote branch or open PR contains the lesson-id.
5. Drop parked rows: y7_spa_08, y7_spa_09.
6. Choose by priority: Y9 Measurement, then Y9 Space, then Y9 Statistics, then Y9 Probability; lowest lesson_num first within a strand. If none of these remain, stop and ask me for the next priority.
7. Report the chosen row (id, topic, descriptors, elaborations, lesson_focus, prerequisite status) plus the next two candidates.

PHASE 2 - DRAFT AND PROPOSE (wait for me)
8. Read tasks-pattern.md and draft the full task line to its Required structure. Take every metadata field from the row and the curriculum JSONs verbatim, including the full descriptor text and CU statement. Supply lesson-focus verbatim from the row. Include the mandatory visual clause for geometric, measurement, statistical or graphical topics, 3-6 core examples, and Stretch/Mastery guidance. Use a finance context where it fits naturally. Never demand an answer form the marker cannot enforce.
9. Read references/strategies.md. Propose 2-3 strategies that fit the lesson's purpose, with a one-line rationale each. Prefer auto-marked, interactive strategies and exclude open-response or discussion-dependent ones.
10. Recommend payload or classic mode, and Sonnet (kit-covered visuals) or Opus (novel interactive widgets).
11. STOP. Show the draft task line with a [STRATEGY] placeholder and wait for my pick and edits. Do not build until I reply.

PHASE 3 - BUILD
12. Insert my chosen strategies and build with the interactive-html-maths-lesson skill, using the row's filename and the repo's existing folder convention. In payload mode, save the payload JSON to payloads/year-N/<strand>/ and assemble it with assemble_lesson.py.
13. Run qa_lessons.py. Run verify_answers.py if any answers are formula-computed. Confirm the lesson-focus meta tag and the visible panel both match the row. Fix any failures.
14. Run python check_lesson.py <lesson path> (first time only: pip install playwright, then python -m playwright install chromium). It also runs qa_lessons.py and verify_answers.py, and writes check-output/<lesson-id>-report.md and check-output/<lesson-id>-figures.png. Fix every FAIL in the lesson (in payload mode, fix the payload JSON and re-assemble), never in check_lesson.py, and re-run until there is no FAIL. Fix WARNs where you can; list the rest in the PR. Open the figures contact sheet and look at every figure yourself. Do not commit check-output/ (it is gitignored).
15. Commit to a new branch named with the lesson-id and open a PR into lesson-gen. In the PR description, list the lesson-id, strategies, mode, model, QA results, the check_lesson.py summary (the overall line and results table from the report, plus every FAIL/WARN line), and "Browser red/green click-test pending (Sam)".
16. The PR triggers the Lesson checks workflow, which re-runs check_lesson.py and uploads check-output/ as the lesson-check-output artifact. Find its run (gh run list --workflow lesson-checks.yml --branch <branch> --limit 1), wait for it with gh run watch <run-id>, get the artifact id (gh api repos/{owner}/{repo}/actions/runs/<run-id>/artifacts --jq '.artifacts[] | select(.name=="lesson-check-output") | .id'), then gh pr edit to add "Figures contact sheet: https://github.com/<owner>/<repo>/actions/runs/<run-id>/artifacts/<artifact-id> (<lesson-id>-figures.png inside)". If the workflow FAILs, fix the lesson and push again.
