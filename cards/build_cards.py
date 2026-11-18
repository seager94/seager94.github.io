"""Build the card lessons and the course map.

    py cards/build_cards.py

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

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'src')


def read(*p):
    with open(os.path.join(*p), encoding='utf-8') as f:
        return f.read()


def write(path, text):
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)


def main():
    manifest = json.loads(read(SRC, 'lessons.json'))
    frame = read(SRC, 'card_frame.html')
    order = [s for u in manifest['units'] for s in u['lessons']]
    lessons = manifest['lessons']
    missing = [s for s in order if s not in lessons]
    if missing:
        raise SystemExit('In units but not in lessons: ' + ', '.join(missing))

    published = {'title': manifest['title'], 'intro': manifest.get('intro', ''), 'units': [], 'lessons': {}}
    for u in manifest['units']:
        published['units'].append({'id': u['id'], 'title': u['title'], 'year': u['year'], 'lessons': u['lessons']})

    for i, slug in enumerate(order):
        L = lessons[slug]
        nxt = order[i + 1] if i + 1 < len(order) else None
        config = {
            'slug': slug, 'title': L['title'], 'version': L['version'], 'map': 'index.html',
            'next': {'title': lessons[nxt]['title'], 'href': nxt + '.html'} if nxt else None,
        }
        meta = '\n'.join('<meta name="%s" content="%s">' % (k, html.escape(str(v), quote=True)) for k, v in [
            ('description', L['description']), ('lesson-id', slug), ('lesson-format', 'card'),
            ('lesson-version', L['version']), ('ac9-descriptor', L['ac9']),
            ('sa-year', L['year']), ('sa-strand', L['strand'])])
        page = (frame
                .replace('{{TITLE}}', html.escape(L['title']))
                .replace('{{HEAD_META}}', meta)
                .replace('{{LESSON_CSS}}', read(SRC, 'lessons', slug, 'lesson.css'))
                .replace('{{LESSON_CONFIG}}', json.dumps(config, ensure_ascii=False))
                .replace('{{LESSON_JS}}', read(SRC, 'lessons', slug, 'lesson.js')))
        write(os.path.join(HERE, slug + '.html'), page)
        published['lessons'][slug] = {'title': L['title'], 'description': L['description'], 'year': L['year'],
                                      'ac9': L['ac9'], 'version': L['version'], 'href': slug + '.html'}
        print('built', slug + '.html')

    write(os.path.join(HERE, 'lessons.json'), json.dumps(published, indent=1, ensure_ascii=False) + '\n')
    mp = (read(SRC, 'map_template.html')
          .replace('{{TITLE}}', html.escape(manifest['title']))
          .replace('{{INTRO}}', html.escape(manifest.get('intro', '')))
          .replace('{{MAP_JSON}}', json.dumps(published, ensure_ascii=False)))
    write(os.path.join(HERE, 'index.html'), mp)
    print('built index.html and lessons.json:', len(order), 'lessons in', len(manifest['units']), 'units')


if __name__ == '__main__':
    main()
