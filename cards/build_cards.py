"""Build the card lessons and the course map.

    py cards/build_cards.py               build every page and the map
    py cards/build_cards.py --only <slug>  build one page only (used while editing a lesson)

Reads  cards/src/card_frame.html   shared frame: look, engine, fonts
       cards/src/lessons.json      units, order and settings for every lesson
       cards/src/lessons/<slug>/   lesson.js (helpers, cards, sections, finish) and lesson.css
Writes cards/<slug>.html           one self-contained page per lesson
       cards/lessons.json          published list of lessons (slug, title, unit, href)
       cards/index.html            the course map

Each lesson's address is cards/<slug>.html and never carries a version, so the map and
any shared links keep working when a lesson is updated. Raise "version" in
src/lessons.json when a lesson's card list changes: students then start that lesson
from the first card, but its tick on the map stays.
"""
import html
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'src')


def read(*p):
    with open(os.path.join(*p), encoding='utf-8') as f:
        return f.read()


def write(path, text):
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)


def has_source(slug):
    return os.path.exists(os.path.join(SRC, 'lessons', slug, 'lesson.js'))


def main():
    only = sys.argv[sys.argv.index('--only') + 1] if '--only' in sys.argv else None
    manifest = json.loads(read(SRC, 'lessons.json'))
    frame = read(SRC, 'card_frame.html')
    lessons = manifest['lessons']
    # A unit's Level Check ("check": slug) goes live once its source folder exists; until then the map says Coming soon.
    checks = {u['id']: u['check'] for u in manifest['units'] if u.get('check') and has_source(u['check'])}
    order = []          # every page in course order: each unit's lessons, then its Level Check
    for u in manifest['units']:
        order += u['lessons'] + ([checks[u['id']]] if u['id'] in checks else [])
    missing = [s for s in order if s not in lessons]
    if missing:
        raise SystemExit('In units but not in lessons: ' + ', '.join(missing))
    if only and only not in order:
        raise SystemExit('Not in the course: ' + only)

    published = {'title': manifest['title'], 'intro': manifest.get('intro', ''), 'units': [], 'lessons': {}}
    for u in manifest['units']:
        published['units'].append({'id': u['id'], 'title': u['title'], 'year': u['year'], 'lessons': u['lessons'],
                                   'check': checks.get(u['id'])})

    for i, slug in enumerate(order):
        L = lessons[slug]
        nxt = order[i + 1] if i + 1 < len(order) else None
        config = {
            'slug': slug, 'title': L['title'], 'version': L['version'], 'map': 'index.html',
            'next': {'title': lessons[nxt]['title'], 'href': nxt + '.html'} if nxt else None,
        }
        if L.get('kind') == 'check':
            unit = next(u for u in manifest['units'] if u.get('check') == slug)
            config['kind'] = 'check'
            config['review'] = {s: lessons[s]['title'] for s in unit['lessons']}
        published['lessons'][slug] = {'title': L['title'], 'description': L['description'], 'year': L['year'],
                                      'ac9': L['ac9'], 'version': L['version'], 'href': slug + '.html',
                                      'kind': L.get('kind', 'lesson')}
        if only and slug != only:
            continue
        meta = '\n'.join('<meta name="%s" content="%s">' % (k, html.escape(str(v), quote=True)) for k, v in [
            ('description', L['description']), ('lesson-id', slug),
            ('lesson-format', 'card-check' if L.get('kind') == 'check' else 'card'),
            ('lesson-version', L['version']), ('ac9-descriptor', L['ac9']),
            ('sa-year', L['year']), ('sa-strand', L['strand'])])
        page = (frame
                .replace('{{TITLE}}', html.escape(L['title']))
                .replace('{{HEAD_META}}', meta)
                .replace('{{LESSON_CSS}}', read(SRC, 'lessons', slug, 'lesson.css'))
                .replace('{{LESSON_CONFIG}}', json.dumps(config, ensure_ascii=False))
                .replace('{{LESSON_JS}}', read(SRC, 'lessons', slug, 'lesson.js')))
        write(os.path.join(HERE, slug + '.html'), page)
        print('built', slug + '.html')

    if only:
        return

    write(os.path.join(HERE, 'lessons.json'), json.dumps(published, indent=1, ensure_ascii=False) + '\n')
    mp = (read(SRC, 'map_template.html')
          .replace('{{TITLE}}', html.escape(manifest['title']))
          .replace('{{INTRO}}', html.escape(manifest.get('intro', '')))
          .replace('{{MAP_JSON}}', json.dumps(published, ensure_ascii=False)))
    write(os.path.join(HERE, 'index.html'), mp)
    print('built index.html and lessons.json:', len(order) - len(checks), 'lessons and', len(checks),
          'Level Checks in', len(manifest['units']), 'units')


if __name__ == '__main__':
    main()
