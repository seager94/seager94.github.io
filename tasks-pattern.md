# tasks.txt — Task Prompt Pattern

This is the canonical pattern for tasks.txt entries. Use as a template for new batches.

> **Why this doc was rewritten (2026-05-25).** Three recurring faults all traced back to
> this file being vague: lessons shipped with `TODO` metadata, geometry lessons shipped with
> no diagrams, and lessons defaulted to a flat base template with no enrichment. The fix is
> here: the metadata block, the visual requirement, and strategy selection are now part of
> the **Required structure** — not optional extras. A task line that omits them is incomplete.

## Required structure (every task line)

Every task line is ONE line and contains these parts, in this order:

```
Use the interactive-html-maths-lesson skill to build a [YEAR] interactive HTML lesson on [TOPIC]. Follow the I Do / We Do / You Do gradual release structure. Set curriculum metadata exactly: lesson-id is [ID]; ac9-descriptor is [AC9 CODE]; ac9-descriptor text is '[FULL DESCRIPTOR TEXT]'; ac9-elaborations is [NUMBERS, e.g. 1,3]; sa-year is [YEAR]; sa-strand is [STRAND]; mapping-note is [Strict/etc]; sa-conceptual-understanding is '[FULL CU STATEMENT]'. [VISUAL REQUIREMENT — see rule below; mandatory for geometric, coordinate, measurement, statistical and graphical topics]. [PEDAGOGICAL FRAMING — opening hook or principle]. [SPECIFIC EXAMPLES — 3-6 core examples]. [STRETCH/MASTERY GUIDANCE]. [STRATEGY — the deliberately chosen enrichment(s), named explicitly]. Building, Stretch and Mastery practice tiers, auto-marked. Reference the SA Curriculum (Mathematics R-10 Prototype 2). Do not check for existing files - create this lesson fresh and overwrite if a file with this name already exists. Save as [FILENAME] in the current directory.
```

Three parts of that line are non-negotiable and are the reason this doc exists:

### 1. The curriculum metadata block — MANDATORY

The skill populates the lesson's `<meta>` tags **field by field, by name**. Any field not
supplied by name is left as a `TODO` placeholder in the published file. Prose does not work —
"this lesson maps to AC9M7SP03" will NOT populate the metadata. Use the literal phrase
`Set curriculum metadata exactly:` followed by every field, named exactly as below:

| Field name (use verbatim) | Example value |
|---|---|
| `lesson-id` | `y7_spa_08` |
| `ac9-descriptor` | `AC9M7SP03` |
| `ac9-descriptor text` | the full ACARA descriptor sentence, in single quotes |
| `ac9-elaborations` | the elaboration **numbers**, e.g. `1,3` — never "TBC", never "confirm later" |
| `sa-year` | `7` |
| `sa-strand` | `Space` |
| `mapping-note` | `Strict` (or as appropriate) |
| `sa-conceptual-understanding` | the full SA CU statement, in single quotes |

**Never defer.** Writing `ac9-elaborations is TODO: confirm against lesson-map` produces a
lesson with a literal TODO in its visible Curriculum link panel. State the actual numbers.
Pull them from `lessonmap.xlsx` / the AC9 curriculum data *before* drafting the task line.

### 2. The visual requirement — MANDATORY for visual topics

The base template is algebra-shaped and produces text + typed answers by default. It will
NOT add diagrams unless the task line explicitly demands them. The skill **can** render
clean inline SVG figures (proven: the circles and angle-sum lessons) — but only when asked.

A visual instruction is **required** when the topic is geometric, coordinate-based,
measurement, statistical, or graphical. Examples of topics that MUST carry a visual clause:
transformations, classifying shapes, angles, circles, area/volume, nets, Cartesian graphs,
linear relationships, dot plots / stem-and-leaf / distributions, probability spaces.

Be specific about the figure — name what must be drawn:

> "Every worked example and every I Do must include a labelled Cartesian grid drawn as an
> inline SVG figure — axes drawn and labelled, gridlines and unit numbers shown, pre-image
> in one colour and image in a contrasting colour, vertices labelled with coordinates."

For non-visual topics (mental computation, pure algebraic manipulation, vocabulary) a visual
clause is not required — but say so to yourself deliberately, don't just forget it.

### 3. Strategy selection — DELIBERATE, not "if any"

The 17-strategy catalogue (`references/strategies.md`) is **opt-in**: the skill only builds a
strategy if the task line names it. "Mention a strategy if one fits" is too weak — it
defaults lessons to the flat base template.

For every lesson, make a deliberate choice:

1. Identify the lesson's **purpose** — introducing a concept / building fluency /
   consolidating / surfacing misconceptions / developing reasoning / strategic flexibility /
   revision. (See the selection table in `strategies.md`.)
2. Pick **1–2 strategies** that genuinely serve that purpose and lesson position. Prefer
   strategies with a working kit (all 17 currently have one).
3. **Name them explicitly** in the task line — e.g. "Include a Which One Doesn't Belong as
   the warm-up" or "Use Compare Two Solutions in the consolidation phase."
4. Choosing **no** strategy is allowed — but it must be a decision, recorded as such, not an
   omission. A bare base-template lesson is the exception, not the default.

## Filename convention

`y[YEAR]_[STRAND]_[NN]_[topic_snake_case]_v[VERSION].html`

Where:
- `[YEAR]` — `7`, `8`, `9`, `10`
- `[STRAND]` — `alg`, `mea`, `num`, `prb`, `space`, `sta`
- `[NN]` — two-digit lesson number within the unit
- `[topic_snake_case]` — descriptive topic
- `[VERSION]` — `v2`, `v3` etc. when regenerating

Example: `y10_alg_05_translating_word_problems_v2.html`

For SACE Stage 1/2 use: `methods_s1_NN_topic_v2.html` or `methods_s2_NN_topic_v2.html`.

> **Note on the `_v2` suffix and strand codes.** Existing folders are inconsistent — the
> Year 7 Space and Probability lessons have no `_v2` suffix and use `spa`/`prb`, while other
> strands carry `_v2` and use `mea`/`sta`. When adding to an existing strand folder, **match
> the siblings already there** rather than this convention, so each folder stays internally
> consistent. Reconciling the whole repo to one convention is a separate housekeeping task.

## Working example (proven to work — 2026-05-22 Statistics batch)

```
Use the interactive-html-maths-lesson skill to build a Year 7 Statistics lesson on calculating the mean, median, mode and range. Follow the I Do / We Do / You Do gradual release structure. Set curriculum metadata exactly: lesson-id is y7_sta_01; ac9-descriptor is AC9M7ST01; ac9-descriptor text is 'acquire data sets for discrete and continuous numerical variables and calculate the range, median, mean and mode; make and justify decisions about which measures of central tendency provide useful insights into the nature of the distribution of data'; ac9-elaborations is 1,3; sa-year is 7; sa-strand is Statistics; mapping-note is Strict; sa-conceptual-understanding is 'Variation in data can be measured and used to describe and compare data sets'. Render the four measures being read off a labelled dot plot as an inline SVG figure. This lesson delivers elaborations E1 and E3: using measures of centre to summarise a data set including comments on symmetry or skew, and recognising that different data sets can share the same measures of central tendency. Core contexts are everyday discrete data such as goals scored per game; include a pair of data sets engineered to share the same mean and median. Three I Do worked examples. Include a Which One Doesn't Belong warm-up on four small data sets. Building, Stretch and Mastery practice tiers, auto-marked. Reference the SA Curriculum (Mathematics R-10 Prototype 2). Do not check for existing files - create this lesson fresh and overwrite if a file with this name already exists. Save as y7_sta_01_calculating_mean_median_mode_range_v2.html in the current directory.
```

## Things to include for richer lessons

- **Pedagogical framing sentence** — a punchy opening idea the lesson revolves around
- **Real-world context** — finance, sport, science, depending on year level and topic
- **Specific core examples** — at minimum 3-4 well-chosen ones; the skill uses them as the spine
- **Watershed flags** — if a lesson is foundational, say so ("watershed lesson — make the I Do and We Do thorough")
- **Misconception flags** — name the common error; pairs naturally with the Error Analysis strategy
- **Stretch hooks** — if the lesson previews a future concept, say so
- **Subject-area connections** — Methods preview hooks for Year 10 high achievers, etc.

## Things to AVOID in task prompts

- ❌ Prose curriculum mentions ("this maps to AC9M7SP03") — they do NOT populate metadata; use the named `Set curriculum metadata exactly:` block
- ❌ Deferring elaboration numbers ("confirm later", "TBC") — produces TODO text in the published lesson
- ❌ Omitting a visual instruction on a geometric / coordinate / measurement / statistical / graphical topic
- ❌ Leaving strategy to chance — choose deliberately and name it, or consciously choose none
- ❌ "Save in this folder" — use an explicit path or "the current directory"
- ❌ Skipping the explicit overwrite language (causes batch hang)
- ❌ Asking for multi-lesson sequences in one task (one lesson per task line)
- ❌ Asking the skill to do the maths from scratch without examples (gives generic results)
- ❌ Vague pedagogy ("make it interactive" — say what *kind* of interactive)

## Pre-flight check before running a batch

For each task line, confirm:

- [ ] `Set curriculum metadata exactly:` block present, all 8 fields named, elaboration numbers stated (no TODO)
- [ ] Visual requirement present if the topic is geometric / coordinate / measurement / statistical / graphical
- [ ] At least one strategy named, OR a conscious decision to use none
- [ ] Filename matches the siblings in the destination folder
- [ ] Explicit overwrite language present
- [ ] One lesson only on this line
