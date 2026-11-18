"""Click-test every card lesson in a headless browser.

    py cards/check_cards.py              # all lessons
    py cards/check_cards.py substitution # one lesson

Needs Playwright for Python (py -m pip install playwright). On Windows it drives the
installed Microsoft Edge; elsewhere it uses Playwright's Chromium.

For every card it checks that:
  - Check starts switched off (nothing to check yet)
  - the "Show me" state is accepted by the card's own check
  - nothing needs scrolling at 1366 x 650, before or after answering
  - nothing spills sideways at 390 wide (phone)
It also checks a wrong-then-right flow on the first typed-answer card it finds, the
finish screen, the course map, and that no page logs an error.
Exit code 1 if anything fails.
"""
import json
import os
import pathlib
import sys

from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
LAPTOP = {'width': 1366, 'height': 650}
PHONE = {'width': 390, 'height': 844}
SLACK = 2  # px of rounding allowed


def launch(p):
    if os.name == 'nt':
        try:
            return p.chromium.launch(channel='msedge', headless=True)
        except Exception:
            pass
    return p.chromium.launch(headless=True)


CARD_PROBE = """async (k) => {
  const T = window.__T, m = document.getElementById('main');
  const wait = ms => new Promise(r => setTimeout(r, ms));
  T.go(k); await wait(80);
  const out = { startOff: document.getElementById('primary').disabled, bridge: !!T.cards[k].bridge };
  out.startOver = m.scrollHeight - m.clientHeight;
  if (!out.bridge) {
    try { T.ctrl.solve(); await wait(80); out.solveOk = T.ctrl.check(1) === true; } catch (e) { out.err = String(e); }
    try { T.finishCard('good', true); } catch (e) { out.err = out.err || String(e); }
    await wait(150);
  }
  out.winOver = m.scrollHeight - m.clientHeight;
  out.sideways = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  return out;
}"""


def check_lesson(browser, slug):
    problems, n = [], 0
    url = (HERE / (slug + '.html')).as_uri() + '?test'
    for vp in (LAPTOP, PHONE):
        ctx = browser.new_context(viewport=vp)
        page = ctx.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        page.goto(url)
        page.wait_for_timeout(300)
        n = page.evaluate('window.__T.cards.length')
        for k in range(n):
            r = page.evaluate(CARD_PROBE, k)
            tag = 'card %d' % (k + 1)
            if vp is LAPTOP:
                if not r['bridge'] and not r['startOff']:
                    problems.append(tag + ': Check is on before any answer')
                if not r['bridge'] and not r.get('solveOk'):
                    problems.append(tag + ': the Show me state is not accepted by check' + (' (' + r['err'] + ')' if r.get('err') else ''))
                if r['startOver'] > SLACK:
                    problems.append('%s: needs %dpx of scrolling at 1366 x 650' % (tag, r['startOver']))
                if r['winOver'] > SLACK:
                    problems.append('%s: needs %dpx of scrolling after answering at 1366 x 650' % (tag, r['winOver']))
            elif r['sideways'] > SLACK:
                problems.append('%s: %dpx wider than a 390px phone' % (tag, r['sideways']))
        page.evaluate('window.__T.go(window.__T.cards.length)')
        page.wait_for_timeout(150)
        if vp is LAPTOP:
            if page.inner_text('#count') != 'Finished':
                problems.append('finish screen did not open')
            if not page.inner_text('#primary').startswith(('Next lesson', 'Back to the course map')):
                problems.append('finish screen has no Next lesson / course map button')
        if errors:
            problems.append('%dpx wide: page errors: %s' % (vp['width'], ' | '.join(sorted(set(errors))[:3])))
        ctx.close()
    return n, problems


FLOW = """async () => {
  const T = window.__T, wait = ms => new Promise(r => setTimeout(r, ms));
  for (let k = 0; k < T.cards.length; k++) {
    T.go(k); await wait(60);
    const inp = document.querySelector('#ctl input:not([type=range]), #stage input:not([type=range])');
    if (!inp) continue;
    inp.value = '987654'; inp.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(40);
    const primary = document.getElementById('primary');
    if (primary.disabled) continue;
    primary.click(); await wait(80);
    const dock = document.getElementById('dock').className, label = primary.textContent;
    primary.click(); await wait(80);                       // Try again
    const back = T.mode, label2 = primary.textContent;
    return { card: k + 1, dock, label, back, label2 };
  }
  return null;
}"""


def check_flow(browser, slug):
    ctx = browser.new_context(viewport=LAPTOP)
    page = ctx.new_page()
    page.goto((HERE / (slug + '.html')).as_uri() + '?test')
    page.wait_for_timeout(300)
    r = page.evaluate(FLOW)
    ctx.close()
    if r is None:
        return []
    out = []
    if 'bad' not in r['dock'] or r['label'] != 'Try again':
        out.append('card %d: a wrong typed answer does not show the amber sheet with Try again' % r['card'])
    if r['back'] != 'check' or r['label2'] != 'Check':
        out.append('card %d: Try again does not return to Check' % r['card'])
    return out


def check_map(browser):
    ctx = browser.new_context(viewport=LAPTOP)
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto((HERE / 'index.html').as_uri())
    page.wait_for_timeout(200)
    links = page.eval_on_selector_all('.node a', 'as => as.map(a => a.getAttribute("href"))')
    nexts = page.eval_on_selector_all('.node.next', 'n => n.length')
    ctx.close()
    published = json.loads((HERE / 'lessons.json').read_text(encoding='utf-8'))
    out = []
    want = [published['lessons'][s]['href'] for u in published['units'] for s in u['lessons']]
    if links != want:
        out.append('course map links do not match lessons.json')
    if nexts != 1:
        out.append('course map should highlight exactly one suggested lesson (found %d)' % nexts)
    out += ['course map error: ' + e for e in errors]
    return out


def main():
    published = json.loads((HERE / 'lessons.json').read_text(encoding='utf-8'))
    slugs = sys.argv[1:] or [s for u in published['units'] for s in u['lessons']]
    failed = 0
    with sync_playwright() as p:
        browser = launch(p)
        for slug in slugs:
            n, problems = check_lesson(browser, slug)
            problems += check_flow(browser, slug)
            failed += bool(problems)
            print('%-26s %2d cards  %s' % (slug, n, 'ok' if not problems else '%d problem(s)' % len(problems)))
            for pr in problems:
                print('    - ' + pr)
        if not sys.argv[1:]:
            mp = check_map(browser)
            failed += bool(mp)
            print('%-26s %s' % ('course map', 'ok' if not mp else ''))
            for pr in mp:
                print('    - ' + pr)
        browser.close()
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
