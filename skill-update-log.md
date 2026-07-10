
## 2026-07-08 — Template patches 0-3, payload frame, pipeline tooling

**Template (installed + repo + mirror synced):**
- Patch 0: template-version meta stamp (2026-07-08.1)
- Patch 1a/1b/1d: answer registry (answerKey/noCountSet + checkAnswer fallback). 1c skipped — installed template already used the safe addEventListener closure, not inline onclick.
- Patch 2: normaliseAnswer maps U+2212/en/em dash to hyphen. Applied by hand in VS Code — the tool repeatedly corrupted the dash glyphs; \u escapes are mandatory.
- Patch 3: formatAnswerDisplay guards exponent-adjacent fractions (fixes L05 a^6/4 false-stack) and renders ^n as <sup>. answerMatches untouched.
- Trial-validated (y9 index-laws throwaway): marking red/green works, exponents render as superscripts, qa gate PASS.

**Payload mode (pilot infra):**
- assets/lesson_frame.html — frozen tokenised frame (24 slots, buildPractice intact). Note: template ships a lesson-focus meta tag, not ac9-descriptor-text; frame slot is meta_lesson_focus accordingly.
- references/payload-spec.md, assemble_lesson.py — two-stage generation. Not yet proven end-to-end; first proof is the Y8 Statistics pilot.

**Tooling (repo root):** qa_lessons.py (post-batch gate), export_lessonmap_json.py (map->json + --check integrity gate).

**Runner note:** run-batch-v2.ps1 had em-dash chars that broke PowerShell's parser; must be pure ASCII. Deployed copy needs re-issue before next real batch.

