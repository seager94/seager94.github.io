# Card lessons

Short, Brilliant-style lessons: one idea per card, problem first, feedback aimed at each
mistake. Published at `seager94.github.io/cards/`, with the course map at `cards/index.html`.

## How it fits together

| File | What it is |
|---|---|
| `src/card_frame.html` | The shared frame: the look, the card engine and the embedded maths font. Change the style here once and every lesson picks it up on the next build. |
| `src/lessons.json` | Units, lesson order and settings (title, year, AC9 code, version). |
| `src/lessons/<slug>/lesson.js` | One lesson's helpers, components and `cards` array, its `SECTIONS`, and `drawFinish()` for the finish screen. |
| `src/lessons/<slug>/lesson.css` | Styles used only by that lesson. |
| `src/map_template.html` | The course map page. |
| `build_cards.py` | Builds `<slug>.html`, `lessons.json` and `index.html` from the files above. |
| `check_cards.py` | Click-tests every card in a headless browser. Also runs on pull requests into `lesson-gen`. |
| `<slug>.html`, `index.html`, `lessons.json` | Built output. Don't edit these by hand. |

## Everyday commands (from the repo folder)

```
py cards/build_cards.py
py cards/check_cards.py
py cards/check_cards.py substitution
```

`check_cards.py` needs Playwright for Python (`py -m pip install playwright`). On Windows it uses the installed Microsoft Edge.

## Updating a lesson

1. Edit `src/lessons/<slug>/lesson.js` (or `lesson.css`).
2. If the card list changed (cards added, removed or reordered), raise that lesson's `version` in `src/lessons.json`. Students then start it again from card 1; its tick on the map stays.
3. Build, check, commit the source and the built files together.

The address `cards/<slug>.html` never changes, so the map and any links shared with classes keep working.

## Adding a lesson

1. Make `src/lessons/<slug>/lesson.js` and `lesson.css` (copy the closest existing lesson).
2. Add it to `lessons` and to a unit's `lessons` list in `src/lessons.json`.
3. Build and check.

## Card options

A card is `{ prompt, sub, build(stage, ctl, ctx) }`, and `build` returns `{ check(attempt), win(), won(), solve() }`.
`check` returns `true` or the feedback for that specific wrong answer. Optional on a card:

- `why`: HTML (or a function returning HTML) for the Why? panel after a correct answer.
- `reset: false`: hide Start over on that card.
- `bridge: true`: a screen between groups of cards that names the idea just met (no check, not scored). Optional
  `show(stage)` draws a still diagram under the text.
- `then: { prompt, sub, why, reset, build(stage, ctl, ctx, part1) }`: a two-part card. Once part 1 is right,
  Continue opens part 2 on the same card: part 1's prompt shrinks to a ticked recap line, the stage (diagram)
  stays, and part 2's controls replace part 1's. `build` gets part 1's controller, so part 2 can read or extend
  what the student built. Part 1's controller can add `recap()` returning HTML for the recap line (default: its
  prompt). The card counts as right first time only if both parts were.
- `from: '<lesson slug>'`: Level Checks only. The lesson the question comes from, for the review list at the end.

Every `lesson.js` starts with the `$` and `h` helpers; the frame's engine uses them.

## Level Checks

A unit's Level Check is a page like a lesson, with `"kind": "check"` in `src/lessons.json` and the unit's
`"check": "<slug>"` pointing at it. It goes live on the map as soon as `src/lessons/<slug>/lesson.js` exists;
until then the map shows a dashed Coming soon node. In a Level Check there is no Show me: a first wrong answer
gets its feedback and Try again, a second shows the answer and moves on. The finish screen (drawn by the frame,
so a check needs no `drawFinish`) gives the score and lists each lesson the questions came from, linking the
ones with a miss.

## Building one page

`py cards/build_cards.py --only <slug>` rebuilds just that page (the map and lessons.json are left alone).

## Progress kept in the browser

- `card-lesson:<slug>:v<version>`: where the student is in a lesson.
- `card-lesson:<slug>:done`: written when every card is done (date, first-try count). The map shows a tick from this, for lessons and Level Checks.

Both stay on one device and browser. There is no class view yet.
