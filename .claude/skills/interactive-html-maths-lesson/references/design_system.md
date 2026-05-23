# Design System

Visual design specification for interactive HTML maths lessons. The template `assets/lesson_template.html` implements all of this — this document is the prose reference for understanding *why* and for adapting cleanly.

## Colour palette

CSS variables defined at the top of the template (`:root`):

| Name | Value | Use |
|---|---|---|
| `--navy` | `#1F4D54` (dark teal) | Headings, primary text emphasis, header bar |
| `--navy-dark` | `#143438` | Hover state for primary buttons |
| `--coral` | `#BE5837` (terracotta) | Accent, badges, step numbers, summary banners, problem numbers |
| `--coral-soft` | `#f5d8cb` | Highlighted state for variable terms in drag-sort |
| `--bg` | `#F3F5F8` | Page background, problem card backgrounds in default sections |
| `--hint-bg` | `#DDE5F5` | Hint footers, vocab example backgrounds, blue info boxes |
| `--card` | `#ffffff` | Section card background |
| `--border` | `#d8dde6` | Card and input borders |
| `--text` | `#2a2a2a` | Body text |
| `--muted` | `#6b7280` | Secondary descriptive text |
| `--good` | `#2f9e6b` | Correct answer state, single-chilli badge |
| `--good-soft` | `#dff5e8` | Correct answer input background |
| `--bad` | `#d24a4a` | Incorrect answer state |
| `--bad-soft` | `#fde2e2` | Incorrect answer input background |

The variable names `--navy` and `--coral` are kept for backward compatibility with existing CSS — these now hold teal and terracotta values respectively. Don't rename the variables; just update the hex if the palette ever shifts again.

**Note on house style:** PowerPoint resources currently use the older navy `#1D2B5E` / coral `#E8485A` palette. HTML lessons moved to teal/terracotta as of May 2026. The PowerPoint house style is on track to migrate to match HTML; until that happens, HTML and PowerPoint deliverables will look visually distinct.

## Difficulty tier colours

Three additional tints used only for the YOU DO practice sections:

| Tier | Background | Left accent | Badge background |
|---|---|---|---|
| 🌶 Building | `#ecf5ed` (pale mint) | `#6ba87c` (5px solid) | `#2f9e6b` (with white text) |
| 🌶🌶 Stretch | `#fdf3dc` (pale wheat) | `#c89638` | `#c89714` |
| 🌶🌶🌶 Mastery | `#fde4d6` (pale terracotta) | `#d57350` | `#d65a3a` |

Cool-to-warm progression rather than full traffic-light red. The Mastery tier's terracotta tones (`#fde4d6` / `#d57350`) are deliberately *similar but not identical* to the highlight terracotta in the main palette (`#BE5837`) — they share the warm-earth family so the lesson reads as one visual suite without the practice section blending into the rest of the page.

The Checkpoint section (Quick check, Section 7) uses a separate scheme: `#f7faff` background with `var(--navy)` left accent — visually distinct from the chilli tiers since it's pre-independent-practice.

The Retrieval (Section 0) and Exit ticket (Section 11) sections share a bookend treatment: pale teal-tinted background `#eaf0f1` with `var(--navy)` left accent and a teal-coloured tag (🧠 for retrieval, 🎯 for exit). Together they frame the lesson.

## Typography

- **Headings (h2)**: `Georgia, "Times New Roman", serif`, bold, `var(--navy)` (dark teal). Section titles all use this.
- **Section number badge**: 32×32 `var(--coral)` (terracotta) square with white text, font-family `-apple-system, sans-serif` (so the number reads as system).
- **Body**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`, 16px / 1.55 line-height.
- **Inline maths (.expr class)**: `Georgia, Cambria, serif`, slightly increased letter-spacing. Variables (`.var` class) are italicised within this.
- **Phase banner labels**: Georgia bold, uppercase, 1.5rem, `var(--coral)` (terracotta), letter-spaced.
- **Difficulty badges**: 0.7rem uppercase, letter-spaced, bold sans-serif on coloured pill background.

## Mathematical typography

This is the most failure-prone part — get it wrong and the lesson looks unprofessional. The user has a hard rule on this.

### Fractions

Always stacked using the `.frac` / `.num` / `.den` structure. **Never write `3/4` or `a/b` inline.**

```html
<span class="frac">
  <span class="num">3</span>
  <span class="den">4</span>
</span>
```

CSS uses inline-flex column with `vertical-align: middle` so the fraction centres on the math axis. The bar between numerator and denominator is a `border-bottom` on `.num`.

When a fraction precedes a variable (e.g. `(3/4)k`), the variable goes after the fraction span as a separate inline element:

```html
<span class="frac"><span class="num">3</span><span class="den">4</span></span><span class="var">k</span>
```

### Variables

Wrapped in `<span class="var">x</span>` — italic styling. Important to wrap each variable individually so the italic applies correctly and so the answer-display regex in JavaScript can identify them.

### Operators

- Subtraction / negation: `−` (Unicode minus, U+2212) — NOT a hyphen `-`. The hyphen looks too thin.
- Multiplication: implicit (e.g. `3x`) or `×` (U+00D7) when needed explicitly.
- Equals: `=` is fine, surrounded by spaces.

### Greek letters and powers

Greek letters: use Unicode directly (`α`, `β`, `θ`, `π`, `Σ`). They render correctly in Georgia.

Powers: `<sup>2</sup>`. Style is inherited so it works in `.expr` blocks.

## Layout

- **Max page width**: 1100px, with 24px horizontal padding.
- **Section cards**: 14px border-radius, 28px padding, white background, subtle shadow.
- **Section gap**: 22px between cards.
- **Phase banner**: 38px top margin to create breathing room between phases.
- **Sticky progress bar**: top of viewport with `position: sticky; top: 0`.

## Animation / interaction

- Drag-and-drop ghost: 1.06× scale, drop shadow, slight opacity (0.92), follows pointer.
- Wrong drop: 0.45s shake animation, red flash, then return to source strip.
- Correct answer: green border + soft green background on input.
- Worked example step reveal: opacity fade from 0.35 to 1 over 0.3s.
- Vocab card flip: 0.55s rotateY(180deg) with preserve-3d.

## Responsive behaviour

- At ≤ 600px viewport: section padding reduces, headings shrink, vocab grid collapses to fewer columns naturally via `grid-template-columns: repeat(auto-fit, minmax(175px, 1fr))`.
- Bucket grids in drag-sort collapse to single column on mobile.
- Phase banner labels shrink.
- Print styles: progress bar and interactive controls hidden, all worked-example steps revealed, sections border on plain white.

## Common mistakes to avoid

- Using `a/b` instead of stacked fractions.
- Forgetting to wrap variables in `.var`.
- Hyphens `-` where minus signs `−` belong.
- Putting punctuation `)` `.` `,` immediately after `</strong>` in centred text — they can wrap to their own line. Either include inside the strong or restructure.
- Adding new colours instead of reusing the palette variables.
- Hardcoding colours instead of `var(--name)` references.
