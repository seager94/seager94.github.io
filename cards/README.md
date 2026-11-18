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
- `bridge: true`: a text-only screen between groups of cards (no check, not scored).

## Progress kept in the browser

- `card-lesson:<slug>:v<version>`: where the student is in a lesson.
- `card-lesson:<slug>:done`: written when every card is done (date, first-try count). The map shows a tick from this.

Both stay on one device and browser. There is no class view yet.
