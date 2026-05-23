# Pedagogical Strategies — Catalogue

Strategies that can be incorporated into an interactive HTML lesson **beyond** the core template patterns (vocab cards, drag-sort, match, worked example, practice problems, exit ticket).

The standard template already gives a complete lesson. Strategies in this catalogue are **enrichments** that slot into the WE DO or YOU DO phase (occasionally the AS A CLASS phase) when the topic genuinely benefits from a particular pedagogical move. They are not required — many lessons ship well without any of them.

## How to use this catalogue

**This file is loaded only when the user explicitly opts into enrichment** — by using the word "enriched", "enrichment", or "rich lesson"; by naming a specific strategy ("with a hinge question", "use error analysis"); or by asking which strategies fit a topic. For ordinary lesson requests, the standard template is used and this file is not consulted.

When triggered:

1. **You're reading the catalogue now.** Look through the 17 entries.
2. **Propose 2–3 candidates** to the user that fit the topic and lesson position. Give a one-line rationale for each.
3. **Let the user pick.** Strategy selection is a pedagogical decision — the teacher's expertise lives there, not in an algorithm.
4. If the user picks a strategy marked ✅ **kit available**, read the matching file in `assets/strategies/` and adapt the pattern.
5. If they pick a 📝 **documented pattern**, build from the notes in this catalogue.

**Shortcut:** if the user named a specific strategy in their original request, skip the proposal step and go straight to that strategy's implementation. The proposal is only needed when the user has signalled enrichment-interest without specifying which one.

## Strategy selection guidance

A rough heuristic by lesson purpose — *not* a fixed mapping:

| Lesson purpose | First-look strategies |
|---|---|
| Introducing a new concept | Notice and wonder, Estimation ladder, Vocab cards (already in template) |
| Building procedural fluency | Faded worked examples, Order the steps, Error analysis |
| Consolidating a known procedure | Error analysis, Compare two solutions, Hinge question |
| Surfacing misconceptions | Hinge question, Always/Sometimes/Never, Two truths and a lie |
| Developing reasoning / generalisation | Always/Sometimes/Never, Which one doesn't belong, Goal-free |
| Building strategic flexibility | Problem strings, Compare two solutions, Multiple representations |
| Revision before assessment | Error analysis, Compare two solutions, Hinge question |

When two strategies could both work, prefer the one with a **kit** — implementation cost is much lower.

---

## Strategies

### 1. Hinge Question ✅ kit available

**Purpose.** A single multiple-choice question (typically 4 options) where each distractor is engineered to reveal a specific misconception. Student clicks an option, sees feedback tailored to that choice.

**When to use.** End of I DO / start of YOU DO as a fast formative check, OR as the entire AS A CLASS phase for a short revision lesson. Dylan Wiliam's hinge-point concept — informs the *next* teaching move.

**Topic profile.** Any topic with well-known misconceptions. Highest leverage on procedures (sign errors, off-by-one errors) and definitions (confusing "factor" and "multiple").

**Position in lesson.** Section 7 (replacing or augmenting Quick Check), or a Section 4.5 between AS A CLASS and I DO.

**Implementation.** `assets/strategies/hinge_question.html`

**Examples.**
- Year 8 like terms: "Simplify 2*x* + 3*x*". A) 5*x*²  B) 5*x*  C) 6*x*²  D) 6*x* — three distinct misconceptions surfaced.
- Year 11 Methods, derivatives: "*d*/*dx*(*x*³)". A) 3*x*²  B) *x*²  C) 3*x*³  D) *x*²/3 — power-rule vs other algorithms.
- Year 9 Pythagoras: "Legs 6 and 8 — find hypotenuse". A) 14  B) 10  C) 100  D) 28 — added-not-squared, correct, forgot-to-square-root, doubled.

---

### 2. Error Analysis ✅ kit available

**Purpose.** A pre-written incorrect solution is shown. Students identify which line contains the error, then write the correction.

**When to use.** After the I DO, before independent practice. Cognitive-load research (Sweller, Renkl) shows this consistently beats simply doing more correct examples for procedural topics. Particularly powerful for sign-error-prone topics.

**Topic profile.** Procedural topics where mistakes are visible line-by-line. Solving equations, simplifying expressions, surd manipulation, indices, fractions, balancing chemical equations (cross-curricular).

**Position in lesson.** Section 6 (WE DO) — replacing or alongside the co-produced solve.

**Implementation.** `assets/strategies/error_analysis.html`

**Examples.**
- Year 9 solving equations: 4-line solution with a sign error in step 2 of subtracting from both sides.
- Year 10 surds: "simplify √48" written as √48 = √(6 × 8) = √6 × √8 — the error is choosing non-square factors.
- Year 11 Methods, factoring: a quadratic factored with one sign wrong.

---

### 3. Faded Worked Examples ✅ kit available

**Purpose.** A sequence of 3–4 worked examples where each one removes a little more scaffolding than the last. First: fully worked. Second: one step blank (student fills in). Third: two steps blank. Fourth: fully independent.

**When to use.** When a procedure has 3+ steps and you want to scaffold the transition from I DO to fully independent. Strong cognitive-load research backing (Renkl).

**Topic profile.** Multi-step procedures. Solving equations, applying Pythagoras, completing the square, integration by substitution, two-way table calculations.

**Position in lesson.** Replaces the standard Section 5 (I DO) and Section 6 (WE DO) with a faded sequence. The Quick Check (Section 7) onward is unchanged.

**Implementation.** `assets/strategies/faded_examples.html`

**Examples.**
- Year 9 Pythagoras: ex 1 fully worked (legs 3,4), ex 2 squaring step blank (legs 6,8), ex 3 squaring and summing steps blank (legs 5,12), ex 4 fully blank (legs 9,40).
- Year 11 Methods, quadratic formula: progressively more steps left to the student.

---

### 4. Order the Steps ✅ kit available

**Purpose.** A correct solution is shown with the lines in jumbled order. Students drag the cards into the correct sequence.

**When to use.** Procedural fluency check, especially when *sequence* matters and students often skip or reorder steps. Also excellent for geometric reasoning (logical chain) and statistical procedure (data → calculation → interpretation).

**Topic profile.** Multi-step procedures. Solving equations, completing geometric proofs, formal hypothesis testing in Specialist, simplifying complex expressions.

**Position in lesson.** Section 6 (WE DO) variant, or an extra section between Section 5 and Section 6.

**Implementation.** `assets/strategies/order_the_steps.html`

**Examples.**
- Year 8 solving equations: 5 jumbled cards for "solve 3*x* + 7 = 22".
- Year 11 Methods, factor and zero-product: jumbled steps for solving *x*² − 5*x* + 6 = 0.
- Year 9 angle reasoning: jumbled steps in a "find the missing angle" proof with reasons.

---

### 5. Always / Sometimes / Never ✅ kit available

**Purpose.** A drag-sort variant with **three** buckets instead of two. Students classify each claim as always, sometimes, or never true. The "sometimes" bucket is the pedagogically richest — it surfaces edge cases.

**When to use.** When generalisation or definitions are central. Forces students to test claims, find counter-examples, and articulate domain conditions.

**Topic profile.** Geometry (special-quadrilateral relationships, symmetry claims), number properties (primes, divisibility), algebra (when an identity holds), early calculus (continuity, differentiability), statistics (effects of outliers).

**Position in lesson.** Section 3 (replacing or alongside the standard drag-sort) or Section 4.

**Implementation.** `assets/strategies/always_sometimes_never.html`

**Examples.**
- Year 9 quadrilaterals: "A rectangle has 4 lines of symmetry" (sometimes — only squares), "A square is a rectangle" (always), "A trapezium has parallel diagonals" (never).
- Year 11 Methods, functions: "If *f*'(*a*) = 0 then *f* has a max or min at *a*" (sometimes — also inflections), "*f*(*x*) = *x*² is differentiable everywhere" (always).
- Year 8 number: "A prime number is odd" (sometimes — 2), "*n*² ≥ *n*" (sometimes — fails for 0 < *n* < 1).

---

### 6. Which One Doesn't Belong ✅ kit available

**Purpose.** Four items in a 2×2 grid; *every* one is defensibly the odd one out for some reason. Students click their pick and justify.

**When to use.** Opening hook (alternative to warm-up) or consolidation. Surfaces multiple ways of seeing the same concept. Originated by Christopher Danielson; see [wodb.ca](https://wodb.ca) for hundreds of examples.

**Topic profile.** Anything with multiple defining properties. Numbers (parity, primality, factorisation, square-ness), shapes (sides, angles, symmetry), graphs (intercepts, gradient, shape).

**Position in lesson.** Section 1 (warm-up replacement) or Section 4.

**Implementation.** `assets/strategies/which_one_doesnt_belong.html`

**Examples.**
- Year 8 numbers: 9, 16, 25, 43 — each defensible (only single-digit / only even / only ends in 5 / only non-square-and-prime).
- Year 9 shapes: square, rhombus, kite, trapezium — properties of symmetry, parallel sides, equal sides.
- Year 11 functions: four graphs differing in intercepts, gradient signs, shape.

---

### 7. Two Truths and a Lie ✅ kit available

**Purpose.** Three statements about a concept; identify the false one and explain why.

**When to use.** Vocabulary consolidation, end of I DO. Lighter-weight than hinge question — fewer options, faster check.

**Topic profile.** Vocabulary-heavy or definition-heavy lessons. Statistical terms, geometric properties, function properties, index/log laws.

**Position in lesson.** Section 2 (replacing or alongside vocab cards) or Section 7.

**Implementation.** `assets/strategies/two_truths_and_a_lie.html`

**Examples.**
- Year 9 indices: "x⁰ = 1 for non-zero x" / "x³ × x² = x⁵" (both true) / "(x³)² = x⁵" (the lie — should be x⁶).
- Year 10 statistics: claims about mean and median.
- Year 11 Methods: claims about derivatives or domain/range.

---

### 8. Compare Two Solutions ✅ kit available

**Purpose.** Two correct methods shown side-by-side. Students answer "what's the same? what's different? which is more efficient and when?"

**When to use.** Builds strategic flexibility. Powerful when there are two distinct approaches to the same problem (algebraic vs graphical, factoring vs formula, direct vs converse, calculator vs mental).

**Topic profile.** Topics with multiple valid methods. Solving quadratics, applying Pythagoras vs trigonometry, mean vs median for skewed data, substitution vs elimination, percentages (multiplier vs build-from-10%).

**Position in lesson.** Section 5 (I DO variant) or Section 8 (consolidation after independent practice).

**Implementation.** `assets/strategies/compare_two_solutions.html`

**Examples.**
- Year 10 percentages: 15% of $80 via decimal multiplier (0.15 × 80) vs build-up (10% + 5%).
- Year 11 Methods, quadratics: factoring vs quadratic formula on x² − 5x + 6.
- Year 9 Pythagoras: algebraic application vs scaled-known-triple (recognising 3-4-5 or 5-12-13 patterns).

---

### 9. Self-Explanation Between Steps ✅ kit available

**Purpose.** Between each step of a worked example, the student must type *why* the previous step works before the next step reveals.

**When to use.** When understanding the rationale matters as much as executing the procedure. Strong effect size in cognitive-science meta-analyses (Chi et al.).

**Topic profile.** Conceptually loaded procedures. Geometric proofs, algebraic manipulation involving identities, calculus rules, balancing equations.

**Position in lesson.** Section 5 (I DO) variant — replaces the standard worked example.

**Implementation.** `assets/strategies/self_explanation.html`

**Examples.**
- Year 8 solving equations: 3x + 7 = 22 — prompts at each step ask why subtract from both sides, why divide not subtract, why check at the end.
- Year 11 Methods, chain rule: prompts asking why we identify inner / outer function first.
- Year 9 surds: prompts asking why we choose the largest perfect-square factor.

---

### 10. Problem Strings (Harris / Fosnot) ✅ kit available

**Purpose.** A short sequence of related problems revealed one at a time. Each problem scaffolds a flexible mental strategy that applies to the next.

**When to use.** Number-talk style mental computation lessons. Builds number sense and strategy flexibility. See Pam Harris's "Problem Strings" or Cathy Fosnot's work.

**Topic profile.** Mental computation, scaling, doubling/halving, partial products, distributive thinking, fraction equivalence. Less suited to formal procedure topics.

**Position in lesson.** Could replace the entire I DO + WE DO phase. Or as Section 1 (warm-up).

**Implementation.** `assets/strategies/problem_strings.html`

**Examples.**
- Year 7 mental multiplication: 25 × 4 → 25 × 8 → 25 × 80 → 25 × 76. Scaffolds compensation strategy.
- Year 8 fractions: 1/2 + 1/4 → 1/2 + 1/8 → 1/2 + 3/8 → 3/4 + 3/8. Scaffolds common-denominator thinking.
- Year 9 percentages: 10% of 80 → 5% of 80 → 15% of 80 → 17.5% of 80. Builds the build-from-10% strategy.

---

### 11. Multiple Representations ✅ kit available

**Purpose.** Same situation shown as four representations simultaneously: equation, table, graph, word context. Clicking any piece highlights the equivalent piece in the other three.

**When to use.** When fluency *across* representations is the learning goal. Particularly powerful for functions, linear relationships, ratio/proportion, probability distributions.

**Topic profile.** Functions, linear/quadratic relationships, ratios, probability, statistics, financial maths.

**Position in lesson.** Section 4 (concept exploration) — replaces match component.

**Implementation.** `assets/strategies/multiple_representations.html`

**Examples.**
- Year 9 linear: y = 2x + 1 shown as equation, t-table, line graph, and taxi-fare context ($1 flag-fall + $2/km).
- Year 10 quadratic: y = x² shown as equation, t-table, parabola, area-of-a-square context.
- Year 8 proportion: y = 3x shown as equation, ratio table, line through origin, and "$3 per item" context.

**Adaptation cost.** The kit's link-id approach generalises easily — change the table rows, graph points, and word context, keep the JS pattern. The biggest custom work is the SVG graph (~20 minutes for a clean adaptation).

---

### 12. Notice and Wonder ✅ kit available

**Purpose.** A striking image, diagram, or expression is shown with two text inputs: "I notice…" and "I wonder…".

**When to use.** Section 1 (warm-up) for any topic. Low-floor entry, builds mathematical authorship. Annie Fetter / Math Forum.

**Topic profile.** Universal — any topic, any year level.

**Position in lesson.** Section 1.

**Implementation.** `assets/strategies/notice_and_wonder.html`

**Examples.**
- Year 9 statistics: a dot plot with an interesting cluster or outlier — students notice shape, wonder about cause.
- Year 8 geometry: a striking visual pattern (tiling, hexagonal arrangement) — students notice structure, wonder how it grows.
- Year 11 Methods: a graph with no equation labelled — students notice features (intercepts, symmetry, asymptotes).

---

### 13. Goal-Free Problems ✅ kit available

**Purpose.** A scenario is set up but no specific question is asked. Students decide what to find out.

**When to use.** Extension / challenge for fast finishers. Pure open inquiry. Cognitive-load research backing for novice→expert development (Sweller).

**Topic profile.** Geometry (find as many relationships as you can), statistics (here's a dataset — what does it tell you?), algebra (here's a graph — describe it).

**Position in lesson.** Section 10 (Mastery tier) variant, or a Section 11.5 extension.

**Implementation.** `assets/strategies/goal_free_problems.html`

**Examples.**
- Year 9 measurement: a labelled trapezium — perimeter, area, diagonal, comparison to a rectangle, scaling.
- Year 10 statistics: a 10-number dataset — mean, median, range, IQR, shape, outliers, comparisons.
- Year 11 Methods: a function graph with marked intercepts — domain, range, asymptotes, where positive/negative.

---

### 14. Estimation Ladder ✅ kit available

**Purpose.** Before computing anything, students place their estimate on a "too low / about right / too high" continuum *and* type a numeric estimate. Reveals number sense before procedural work.

**When to use.** Section 1 (warm-up) for problems where reasonable estimation is possible. Pairs beautifully with the Estimation 180 style.

**Topic profile.** Measurement, percentages, large numbers, scientific notation, contextual word problems.

**Position in lesson.** Section 1, or a tiny extension to Section 5 (I DO) — estimate first, then solve.

**Implementation.** `assets/strategies/estimation_ladder.html`

**Examples.**
- Year 9 measurement: estimate the height of a 6-storey building (anchor: storey ≈ 3 m).
- Year 10 percentages: estimate $1000 invested at 6% for 10 years.
- Year 8 large numbers: estimate the population of Adelaide / the distance to the moon.

---

### 15. Build the Expression ✅ kit available

**Purpose.** Click number tiles, variable tiles, and operator tiles to **construct** an expression matching a description ("two more than three times *x*"). The inverse of "simplify".

**When to use.** Translating between English and algebra. Year 7–8 algebra introduction. Word problems.

**Topic profile.** Algebraic expressions, equation modelling, function notation.

**Position in lesson.** Section 4 or 6.

**Implementation.** `assets/strategies/build_the_expression.html`

**Examples.**
- Year 7 algebra: "two more than three times x" → 3x + 2 (or 2 + 3x — both accepted).
- Year 8: "five less than y" → y − 5; "double the sum of n and 5" → 2(n+5) or 2n+10.
- Year 9: building expressions with brackets and powers.

**Accepting equivalent forms.** The `data-expected` attribute accepts a comma-separated list, so multiple correct forms can be specified. Whitespace and × signs are stripped before comparison.

---

### 16. Slider Parameter Widget ✅ kit available

**Purpose.** A range input varies one (or more) parameter of a function. The diagram or graph updates live as the student drags.

**When to use.** When understanding *parameter influence* is the goal. Transformations of graphs, geometric scaling, sensitivity analysis in statistics.

**Topic profile.** Functions and graph transformations, trigonometric graphs (amplitude / period), circle geometry (radius), normal distribution (Specialist).

**Position in lesson.** Section 5 (I DO) — replacing the static worked example with a dynamic exploration. Students do the exploration themselves before any formal definition.

**Implementation.** `assets/strategies/slider_parameter_widget.html`

**Examples.**
- Year 9 linear: y = mx + c with sliders for m and c. Includes a "match the target line" challenge.
- Year 10 quadratic: y = a(x − h)² + k with sliders for a, h, k.
- Year 11 Methods trig: y = A sin(Bx) with sliders for A and B.

**Adaptation cost.** The kit's structure is highly reusable — change the slider ranges, the equation display, and the renderLine() function (recompute SVG path from new parameter values). ~15 minutes for a clean adaptation to a different function.

---

### 17. Geometric Proof / Dissection ✅ kit available

**Purpose.** A step-by-step visual proof revealed through click-to-advance SVG layers. Each click adds a layer to the diagram until the proof is complete.

**When to use.** When a theorem has an elegant visual proof. Strong "aha" moment if well-built. Rare — most topics don't have one.

**Topic profile.** Pythagoras (square dissection), area formulas (parallelogram from rectangle), sum of consecutive integers (Gauss), completing the square (geometric).

**Position in lesson.** Section 5 (I DO) — *before* the algebraic worked example, motivating the formula geometrically.

**Implementation.** `assets/strategies/geometric_proof.html`

**Examples.**
- Year 9 Pythagoras (kit demo): squares on a 3-4-5 triangle, revealing 9 + 16 = 25 then generalising.
- Year 8 area: rectangle → parallelogram dissection showing area = base × height.
- Year 10 completing the square: geometric rearrangement showing x² + bx = (x + b/2)² − (b/2)².

**Adaptation cost.** This is the most theorem-specific kit. The SVG layers are bespoke to the proof being shown — adaptation typically means new SVG work (~25 minutes). The reveal mechanism (proof-layer class + step controls) transfers cleanly to any theorem.

---

## Adding a new strategy

To extend this catalogue:

1. Pick a stable number (next integer).
2. Choose ✅ kit available or 📝 documented status. If a kit, also add `assets/strategies/<snake_case_name>.html` with a runnable demo.
3. Follow the schema: Purpose, When to use, Topic profile, Position in lesson, Implementation, Examples (2–3).
4. Keep entries to roughly 10–15 lines so the full catalogue stays scannable.

Strategies that turn out to be rarely used can be downgraded from kit to documented (just remove the kit file). Strategies that are heavily used should remain near the top of the file for fast discovery.
