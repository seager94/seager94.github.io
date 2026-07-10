# Template patch spec — lesson_template.html JS hardening

**Apply to:** `C:\Users\sdavi\.claude\skills\interactive-html-maths-lesson\assets\lesson_template.html`
(the installed copy — NOT the claude.ai project copy, which is stale pre-2026-05-18).

**Protocol:** these change locked functions, so follow the established rule — apply, build ONE
trial lesson, click-verify (wrong → red, right → green), then commit to the skill + repo copy +
refresh the project mirror, and log in skill-update-log.md. Bump the version stamp (Patch 0).

**Not touched:** `answerMatches` (it carries the reordered-factors patch and per-batch additive
rewrites that exist only in the installed copy), all CSS, all section structure, `toggleTier`,
drag-and-drop, teacher mode.

---

## Patch 0 — template version stamp (new)

**Why.** Lessons currently carry no record of which template version built them. After any
template fix you can't query which of the 130+ published lessons predate it. One meta tag fixes
that forever; `qa_lessons.py` and the lessonmap exporter can then report template vintage.

**Add to `<head>`, alongside the curriculum meta tags:**

```html
<meta name="template-version" content="2026-07-08.1">
```

**Add to SKILL.md adaptation rules:** "Never remove or alter the `template-version` meta tag —
copy it through verbatim." Bump the content value on every future template change.

---

## Patch 1 — stop inlining expected answers into onclick attributes

**Why.** `buildPractice` currently writes each expected answer into an HTML attribute string:

```js
onclick="checkAnswer('${idx}', '${p.a}', ...)"
```

Any answer containing an apostrophe, quote, or backslash breaks that attribute and the Check
button dies silently — the lesson looks fine until a student clicks. With Number, Statistics
and Probability strands queued (worded answers, coordinate pairs, intervals), the odds of a
generated answer containing `'` rise sharply. Registry lookup removes the sink entirely, and
stays backward-compatible with strategy kits that still call the 3-argument form.

**1a. Near the STATE block at the top of the script, add:**

```js
const answerKey = {};        // idx -> expected answer (single source for Check buttons)
const noCountSet = new Set(); // idx values excluded from the progress score
```

**1b. In `buildPractice`, register each problem before building its card.** After
`const idx = prefix + (i + 1);` add:

```js
answerKey[idx] = p.a;
if (options.noCount) noCountSet.add(idx);
```

**1c. In the same function, replace the Check-button line:**

OLD:
```js
${p.a !== 'TEXT' ? `<button class="check-btn" onclick="checkAnswer('${idx}', '${p.a}', ${options.noCount ? 'true' : 'false'})">Check</button>` : ''}
```

NEW:
```js
${p.a !== 'TEXT' ? `<button class="check-btn" onclick="checkAnswer('${idx}')">Check</button>` : ''}
```

**1d. Make `checkAnswer` resolve from the registry when called with one argument** (kits
calling the old 3-arg form keep working):

OLD:
```js
function checkAnswer(idx, expected, noCount) {
  const input = document.getElementById('inp-' + idx);
```

NEW:
```js
function checkAnswer(idx, expected, noCount) {
  if (expected === undefined || expected === null) expected = answerKey[idx];
  if (noCount === undefined || noCount === null) noCount = noCountSet.has(idx);
  const input = document.getElementById('inp-' + idx);
```

---

## Patch 2 — normalise typographic minus in student input

**Why.** Every lesson *displays* the typographic minus − (U+2212) per the house typography
rules, but `normaliseAnswer` doesn't map it to the hyphen students' stored answers use. A
student who copies from a hint, or whose iPad keyboard emits an en-dash, gets a correct answer
marked wrong. L06 patched this per-lesson; this makes it template-level. It does not loosen
marking — a dash is unambiguous as a minus here.

OLD:
```js
function normaliseAnswer(s) {
  return (s || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/\*/g, '')
    .replace(/^\+/, '');  // strip leading +
}
```

NEW:
```js
function normaliseAnswer(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[\u2212\u2013\u2014]/g, '-')  // typographic minus / en / em dash -> hyphen
    .replace(/\s+/g, '')
    .replace(/\*/g, '')
    .replace(/^\+/, '');  // strip leading +
}
```

---

## Patch 3 — formatAnswerDisplay: fix the `a^6/4` false-stack, render exponents

**Why.** The fraction regex fires on the `6/4` inside `a^6/4` and stacks it under `a^` — the
L05 known quirk. Also, `^` in answers is currently shown literally (`x^2`), which matters now
that the exponential strand exists. Fix guards exponent-adjacent fractions (no lookbehind —
Safari-safe for older iPads), then converts remaining `^n` to superscript.

OLD (step 2 of the function):
```js
r = r.replace(/(-?\d+)\/(\d+)/g, (_, n, d) => {
  const neg = n.startsWith('-');
  const num = neg ? n.slice(1) : n;
  return (neg ? '− ' : '') + `<span class="frac"><span class="num">${num}</span><span class="den">${d}</span></span>`;
});
```

NEW (replaces step 2, and adds a step 2.5 immediately after it):
```js
r = r.replace(/(\^)?(-?\d+)\/(\d+)/g, (m, caret, n, d) => {
  if (caret) return m;  // exponent like a^6/4 — do not stack, handled below
  const neg = n.startsWith('-');
  const num = neg ? n.slice(1) : n;
  return (neg ? '− ' : '') + `<span class="frac"><span class="num">${num}</span><span class="den">${d}</span></span>`;
});
// Step 2.5: remaining carets become superscripts (a^6/4 -> a<sup>6</sup>/4, x^2 -> x<sup>2</sup>)
r = r.replace(/\^(-?\d+)/g, '<sup>$1</sup>');
```

Known cosmetic note: a negative exponent (`x^-2`) will get operator spacing inside the `<sup>`
from step 3. Readable, rare; leave unless it bothers anyone.

---

## Deployment order

1. Close Excel / editors. Apply patches to the **installed** template on the Dell.
2. Build one trial lesson locally (single-line tasks.txt). Click-verify, including: an answer
   containing an apostrophe (Patch 1), typing − from the character picker (Patch 2), and an
   exponent answer reveal (Patch 3).
3. Run `python qa_lessons.py <trial>.html` — locked-function check confirms nothing regressed.
4. Copy the patched skill to the repo's `.claude/skills/` (Actions runner) and re-upload the
   skill folder to the claude.ai project so all three copies match. Log in skill-update-log.md.
