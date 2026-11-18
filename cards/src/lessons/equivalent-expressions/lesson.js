/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const h = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');

// "2(n + 3)" -> maths markup. Single lower-case letters, including the n in 3n, become variables.
function mx(s) {
  return '<span class="m">' + String(s).replace(/(^|[^a-z])([a-z])(?![a-z])/g, '$1<i class="v">$2</i>') + '</span>';
}

/* ---------- drawn objects ---------- */
function marbleG(cx, cy, r, cls) {
  return '<g class="mb' + (cls ? ' ' + cls : '') + '"><circle class="mb-b" cx="' + cx + '" cy="' + cy + '" r="' + r + '"/>' +
    '<ellipse class="mb-h" cx="' + (cx - r * 0.32) + '" cy="' + (cy - r * 0.36) + '" rx="' + (r * 0.28) + '" ry="' + (r * 0.18) + '"/></g>';
}
// A 62 x 70 bag with its top-left corner at (x, y). o.inside = n draws a see-through bag holding n marbles.
function bagG(x, y, o) {
  o = o || {};
  const xray = o.inside != null;
  let g = '<g class="bag' + (xray ? ' xray' : '') + '" transform="translate(' + x + ',' + y + ')">' +
    '<path class="bag-neck" d="M20 16 L15 4 Q23 9 31 4 Q39 9 47 4 L42 16 Z"/>' +
    '<path class="bag-body" d="M19 15 C8 25 3 40 5 52 C7 64 18 69 31 69 C44 69 55 64 57 52 C59 40 54 25 43 15 Z"/>' +
    '<rect class="bag-tie" x="17" y="12" width="28" height="6.5" rx="3.2"/>';
  if (xray) {
    for (let k = 0; k < o.inside; k++) {
      const row = Math.floor(k / 4), inRow = Math.min(4, o.inside - row * 4), col = k % 4;
      g += marbleG(31 + (col - (inRow - 1) / 2) * 11, 59 - row * 11, 5);
    }
  } else if (o.body) {
    g += '<text class="bag-txt" x="31" y="53" text-anchor="middle">' + o.body + '</text>';
  }
  if (o.tag) g += '<g class="bag-tag"><line x1="44" y1="14" x2="52" y2="8"/><rect x="45" y="-7" width="21" height="19" rx="5"/><text x="55.5" y="7.5" text-anchor="middle">' + o.tag + '</text></g>';
  return g + '</g>';
}
const SVG_MARBLE = '<svg viewBox="0 0 30 30" aria-hidden="true">' + marbleG(15, 15, 12.5) + '</svg>';
const svgBag = o => '<svg viewBox="-5 -10 76 83" aria-hidden="true">' + bagG(0, 0, o) + '</svg>';
const GEAR = '<svg viewBox="-24 -24 48 48" aria-hidden="true"><g fill="#fff"><circle r="13"/>' +
  [0, 1, 2, 3, 4, 5, 6, 7].map(i => '<rect x="-4.5" y="-21" width="9" height="11" rx="2" transform="rotate(' + i * 45 + ')"/>').join('') +
  '</g><circle r="5.5" fill="#2B2D2F"/></svg>';

/* ---------- drag engine (pointer events: mouse, touch, pen) ---------- */
function dropAt(x, y, accept) {
  for (const n of document.elementsFromPoint(x, y)) {
    const t = n.closest ? n.closest('[data-drop]') : null;
    if (t && accept.includes(t.getAttribute('data-drop'))) return t;
  }
  return null;
}
function draggable(node, opt) {
  node.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (node.disabled) return;
    const sx = e.clientX, sy = e.clientY;
    let g = null, hot = null;
    const move = ev => {
      if (!g) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 7) return;
        if (opt.ghost) g = h('<div>' + opt.ghost() + '</div>');
        else { g = node.cloneNode(true); g.removeAttribute('id'); g.style.width = node.getBoundingClientRect().width + 'px'; }
        g.classList.add('drag-ghost');
        document.body.append(g);
        node.classList.add('dragging');
      }
      g.style.left = ev.clientX + 'px';
      g.style.top = ev.clientY + 'px';
      const t = dropAt(ev.clientX, ev.clientY, opt.accept);
      if (t !== hot) { if (hot) hot.classList.remove('drop-hot'); hot = t; if (hot) hot.classList.add('drop-hot'); }
    };
    const end = ev => {
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerup', end);
      node.removeEventListener('pointercancel', end);
      if (!g) return;                       // it was a tap: the click handler deals with it
      g.remove();
      node.classList.remove('dragging');
      if (hot) hot.classList.remove('drop-hot');
      const stop = c => { c.stopImmediatePropagation(); c.preventDefault(); };
      node.addEventListener('click', stop, true);
      setTimeout(() => node.removeEventListener('click', stop, true), 60);
      if (ev.type === 'pointerup' && hot) opt.onDrop(hot, ev);
    };
    try { node.setPointerCapture(e.pointerId); } catch (_) {}
    node.addEventListener('pointermove', move);
    node.addEventListener('pointerup', end);
    node.addEventListener('pointercancel', end);
  });
}

/* ---------- components ---------- */
function makeScale(host, o) {
  o = o || {};
  const wrap = h('<div class="scale-wrap"><svg class="scale" viewBox="16 66 528 218" role="img" aria-label="Balance scale">' +
    '<rect class="sc-ink" x="205" y="262" width="150" height="14" rx="7"/><path class="sc-ink" d="M280 212 L310 264 L250 264 Z"/>' +
    '<g class="sc-beam"><rect class="sc-ink" x="102" y="208" width="356" height="13" rx="6.5"/></g>' +
    '<g class="sc-pan"><rect class="sc-ink" x="104" y="184" width="12" height="30" rx="3"/><rect class="sc-hit" x="20" y="62" width="180" height="140" rx="16"/><rect class="sc-plate" x="25" y="178" width="170" height="11" rx="5.5"/><g class="sc-load"></g></g>' +
    '<g class="sc-pan"><rect class="sc-ink" x="444" y="184" width="12" height="30" rx="3"/><rect class="sc-hit" x="360" y="62" width="180" height="140" rx="16"/><rect class="sc-plate" x="365" y="178" width="170" height="11" rx="5.5"/><g class="sc-load"></g></g>' +
    '<circle class="sc-pivot" cx="280" cy="214.5" r="9"/></svg>' +
    '<div class="eqbar"><div class="eq-l"></div><div class="eq-m"></div><div class="eq-r"></div></div></div>');
  const svg = $('svg', wrap), beam = $('.sc-beam', wrap), pans = wrap.querySelectorAll('.sc-pan');
  if (o.dropRight) $('.sc-hit', pans[1]).setAttribute('data-drop', 'pan');
  if (o.onRemove) svg.addEventListener('click', e => { if (e.target.closest('.mb.rm')) o.onRemove(); });
  host.append(wrap);

  function loadHTML(cx, L) {
    const bags = L.bags || [], n = L.loose || 0;
    const cols = bags.length ? (bags.length > 1 ? 2 : 3) : 5;
    const used = Math.min(n, cols);
    const bw = bags.length * 62 + Math.max(0, bags.length - 1) * 6, lw = used * 26;
    let x = cx - (bw + (bw && lw ? 10 : 0) + lw) / 2, out = '';
    bags.forEach(b => { out += bagG(x, 109, b); x += 68; });
    if (bw && lw) x += 4;
    for (let k = 0; k < n; k++) {
      const row = Math.floor(k / cols), inRow = Math.min(cols, n - row * cols), col = k % cols;
      out += marbleG(x + (used - inRow) * 13 + col * 26 + 13, 165 - row * 26, 12.3, L.removable ? 'rm' : '');
    }
    return out;
  }
  return {
    // L and R: { bags: [bag options], loose: n, weight: n, removable: bool }
    update(L, R) {
      $('.sc-load', pans[0]).innerHTML = loadHTML(110, L);
      $('.sc-load', pans[1]).innerHTML = loadHTML(450, R);
      const diff = R.weight - L.weight;
      const a = 10 * Math.tanh(diff / 3) * Math.PI / 180;      // positive: right side goes down
      const dy = 170 * Math.sin(a), dx = 170 * (1 - Math.cos(a));
      beam.style.transform = 'rotate(' + a + 'rad)';
      pans[0].style.transform = 'translate(' + dx + 'px,' + (-dy) + 'px)';
      pans[1].style.transform = 'translate(' + (-dx) + 'px,' + dy + 'px)';
      svg.classList.toggle('level', diff === 0);
      svg.setAttribute('aria-label', 'Balance scale. ' + (diff === 0 ? 'It is balanced.' : diff > 0 ? 'The right side is heavier.' : 'The left side is heavier.'));
    },
    bar(l, m, r, ok, word) {
      $('.eq-l', wrap).innerHTML = l;
      const mid = $('.eq-m', wrap);
      mid.innerHTML = m; mid.classList.toggle('ok', !!ok); mid.classList.toggle('word', !!word);
      $('.eq-r', wrap).innerHTML = r;
    }
  };
}

function makeSlider(host, name, min, max, value, onInput) {
  const row = h('<div class="slider"><label for="sl-' + name + '"><span class="m"><i class="v">' + name + '</i> = <span class="val">' + value + '</span></span></label>' +
    '<span class="end">' + min + '</span><input id="sl-' + name + '" type="range" min="' + min + '" max="' + max + '" step="1" value="' + value + '"><span class="end">' + max + '</span></div>');
  const inp = $('input', row), out = $('.val', row);
  const paint = () => { out.textContent = inp.value; inp.style.setProperty('--fill', ((inp.value - min) / (max - min) * 100) + '%'); };
  inp.addEventListener('input', () => { paint(); onInput(+inp.value); });
  paint();
  host.append(row);
  return { value: () => +inp.value, set(v) { inp.value = v; paint(); onInput(+v); } };
}

function makeChoices(host, items, ctx, multi) {
  const wrap = h('<div class="choices" role="group"></div>');
  const btns = items.map(html => {
    const b = h('<button type="button" class="choice" aria-pressed="false">' + html + '</button>');
    b.onclick = () => {
      if (multi) b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true');
      else btns.forEach(x => x.setAttribute('aria-pressed', x === b));
      btns.forEach(x => x.classList.remove('bad', 'good'));
      ctx.touch(sel().length > 0);
    };
    wrap.append(b);
    return b;
  });
  const sel = () => btns.map((b, i) => b.getAttribute('aria-pressed') === 'true' ? i : -1).filter(i => i >= 0);
  host.append(wrap);
  return {
    sel,
    mark: (i, c) => btns[i].classList.add(c),
    set: arr => btns.forEach((b, i) => b.setAttribute('aria-pressed', arr.includes(i))),
    lock: () => btns.forEach(b => { b.disabled = true; })
  };
}

function makeAnswer(host, label, ctx) {
  const row = h('<div class="answer"><label for="ans">' + label + '</label><input id="ans" type="text" inputmode="numeric" autocomplete="off" maxlength="5"></div>');
  const inp = $('input', row);
  inp.addEventListener('input', () => { inp.classList.remove('bad', 'good'); ctx.touch(inp.value.trim() !== ''); });
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ctx.submit(); } });
  host.append(row);
  return {
    value: () => { const v = inp.value.trim(); return /^\d+$/.test(v) ? +v : NaN; },
    mark: c => inp.classList.add(c),
    set: v => { inp.value = v; },
    lock: () => { inp.disabled = true; }
  };
}

// Tile expression builder. Tiles alternate operand, operator, operand ...
const tileKind = t => /^[a-z]$/.test(t) ? 'var' : /^\d+$/.test(t) ? 'num' : 'op';
const tileName = t => t === '+' ? 'plus' : t === '×' ? 'times' : t;
function evalToks(toks, v, val) {
  if (!toks.length || toks.length % 2 === 0) return null;
  const a = [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (i % 2 === 0) { if (t === v) a.push(val); else if (/^\d+$/.test(t)) a.push(+t); else return null; }
    else { if (t !== '+' && t !== '×') return null; a.push(t); }
  }
  let sum = 0, cur = a[0];
  for (let i = 1; i < a.length; i += 2) { if (a[i] === '×') cur *= a[i + 1]; else { sum += cur; cur = a[i + 1]; } }
  return sum + cur;
}
function makeBuilder(stripHost, trayHost, tiles, ctx) {
  const MAX = 11;
  const strip = h('<div class="strip" data-drop="strip"></div>');
  const tray = h('<div class="tiles"></div>');
  let toks = [], locked = false;
  function insert(t, at) {
    if (locked || toks.length >= MAX) return;
    toks.splice(at == null ? toks.length : at, 0, t);
    draw(); ctx.touch(true);
  }
  function draw() {
    strip.replaceChildren();
    if (!toks.length) strip.append(h('<span class="ph">Your expression goes here</span>'));
    toks.forEach((t, i) => {
      const b = h('<button type="button" class="tile ' + tileKind(t) + '" aria-label="' + tileName(t) + ', tap to remove">' + t + '</button>');
      b.onclick = () => { if (locked) return; toks.splice(i, 1); draw(); ctx.touch(toks.length > 0); };
      strip.append(b);
    });
  }
  tiles.forEach(t => {
    const b = h('<button type="button" class="tile ' + tileKind(t) + '" aria-label="Add ' + tileName(t) + '">' + t + '</button>');
    b.onclick = () => insert(t);
    draggable(b, { accept: ['strip'], onDrop(target, ev) {
      const at = [...strip.querySelectorAll('.tile')].findIndex(k => { const r = k.getBoundingClientRect(); return ev.clientX < r.left + r.width / 2; });
      insert(t, at < 0 ? null : at);
    } });
    tray.append(b);
  });
  draw();
  stripHost.append(strip);
  trayHost.append(tray);
  return { toks: () => toks.slice(), set(a) { toks = a.slice(); draw(); }, lock() { locked = true; } };
}

function makePattern(host, n0) {
  const node = h('<div class="pat" role="img"></div>'), read = h('<div class="readout"></div>');
  host.append(node, read);
  function set(n) {
    node.innerHTML = '<span class="pt e"></span><span class="pat-mid"><span class="pat-row">' + '<span class="pt n"></span>'.repeat(n) +
      '</span><span class="brace"></span><span class="brace-l">' + mx('n') + ' = ' + n + '</span></span><span class="pt e"></span>';
    node.setAttribute('aria-label', plural(n, 'blue tile') + ' in a row, with one yellow tile on each end');
    read.innerHTML = 'Tiles altogether: <b>' + (n + 2) + '</b>';
  }
  set(n0);
  return { set };
}

const numTile = n => '<span class="tile num still pop">' + n + '</span>';
function makeMachine(host, rule, onFeed) {
  const node = h('<div class="mach"><div class="m-slot m-in" data-drop="hopper"><span class="cap">in</span></div><div class="m-pipe"></div>' +
    '<div class="m-body">' + GEAR + '</div><div class="m-pipe"></div><div class="m-slot m-out"><span class="cap">out</span></div></div>');
  const log = h('<div class="m-log" aria-live="polite"></div>');
  host.append(node, log);
  const inS = $('.m-in', node), outS = $('.m-out', node), body = $('.m-body', node);
  const fed = [];
  let busy = false;
  const put = (slot, html) => { const old = $('.tile', slot); if (old) old.remove(); if (html) slot.append(h(html)); };
  return {
    fed,
    feed(n) {
      if (busy) return;
      busy = true;
      put(inS, numTile(n)); put(outS, null);
      body.classList.remove('run'); void body.offsetWidth; body.classList.add('run');
      setTimeout(() => {
        put(inS, null); put(outS, numTile(rule(n)));
        fed.push(n);
        log.append(h('<span class="pair pop">' + n + ' → ' + rule(n) + '</span>'));
        while (log.children.length > 6) log.firstElementChild.remove();
        busy = false;
        if (onFeed) onFeed();
      }, 600);
    }
  };
}

// Two machines side by side, fed the same n. A and B are { s, f }: s is how the expression is written, f gives its value
// (f is null while a built expression is unfinished). The working sits directly under each output.
const subst = (s, v) => s.replace(/(\d)(?=[a-z(])/g, '$1 × ').replace(/[a-z]/g, v);
function makeTwin(host, A, B, v0) {
  const node = h('<div class="twin" role="img"></div>');
  const add = cls => { const e = h('<div class="' + cls + '"></div>'); node.append(e); return e; };
  const body = () => { const e = add('tw-body'); e.innerHTML = GEAR + '<span class="tw-lab"></span>'; return $('.tw-lab', e); };
  const lab = [], out = [], calc = [];
  lab[0] = body(); const inp = add('tw-in'); lab[1] = body();
  add('tw-pipe'); add('tw-gap'); add('tw-pipe');
  out[0] = add('tw-out'); const sign = add('tw-sign'); out[1] = add('tw-out');
  calc[0] = add('tw-calc'); add('tw-gap'); calc[1] = add('tw-calc');
  host.append(node);
  const ex = [A, B];
  let v = v0;
  function draw() {
    const r = ex.map(e => e && e.f ? e.f(v) : null);
    ex.forEach((e, k) => {
      lab[k].innerHTML = e && e.s ? mx(e.s) : '?';
      out[k].innerHTML = r[k] == null ? '<span class="tile op still">?</span>' : '<span class="tile num still">' + r[k] + '</span>';
      calc[k].innerHTML = r[k] == null ? '' : mx(subst(e.s, v) + ' = ' + r[k]);
    });
    inp.innerHTML = mx('n = ' + v);
    const both = r[0] != null && r[1] != null, same = both && r[0] === r[1];
    sign.className = 'tw-sign' + (both ? (same ? ' same' : ' diff') : '');
    sign.textContent = both ? (same ? '=' : '≠') : '';
    const say = k => (ex[k] && ex[k].s ? ex[k].s : 'the empty machine') + ' gives ' + (r[k] == null ? 'nothing yet' : r[k]);
    node.setAttribute('aria-label', 'Two machines. When n is ' + v + ', ' + say(0) + ' and ' + say(1) + '.');
  }
  draw();
  return { set(n) { v = n; draw(); }, setB(e) { ex[1] = e; draw(); } };
}

/* ---------- cards ---------- */
const E = {
  nnn: { s: 'n + n + n', f: n => 3 * n },
  n3: { s: '3n', f: n => 3 * n },
  np3: { s: 'n + 3', f: n => n + 3 },
  p3n: { s: '3 + n', f: n => 3 + n },
  br: { s: '2(n + 3)', f: n => 2 * (n + 3) },
  nb: { s: '2n + 3', f: n => 2 * n + 3 },
  t2: { s: 'n × 2', f: n => n * 2 },
  p2: { s: 'n + 2', f: n => n + 2 },
  t4: { s: 'n × 4', f: n => n * 4 },
  p9: { s: 'n + 9', f: n => n + 9 }
};
const TEST = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const OPTS = ['Always equal', 'Sometimes equal', 'Never equal'];

// Two machines on one slider, then always / sometimes / never (cards 1 to 3).
function twinChoice(cfg) {
  return function (stage, ctl, ctx) {
    const tw = makeTwin(stage, cfg.A, cfg.B, cfg.start);
    makeSlider(ctl, 'n', 0, 10, cfg.start, v => tw.set(v));
    const ch = makeChoices(ctl, OPTS, ctx);
    ctl.lastElementChild.classList.add('c3');
    return {
      check() { const s = ch.sel()[0]; if (s === cfg.ans) return true; ch.mark(s, 'bad'); return cfg.why[s]; },
      win: cfg.win,
      won() { ch.mark(cfg.ans, 'good'); ch.lock(); },
      solve() { ch.set([cfg.ans]); }
    };
  };
}

// The given expression in the left machine, the student's tile expression in the right one (cards 11 and 12).
function buildTwin(cfg) {
  return function (stage, ctl, ctx) {
    const A = cfg.A;
    const tw = makeTwin(stage, A, null, cfg.start);
    makeSlider(ctl, 'n', 0, 10, cfg.start, v => tw.set(v));
    let bd = null;
    const show = () => { const t = bd.toks(); tw.setB({ s: t.join(' '), f: evalToks(t, 'n', 0) == null ? null : v => evalToks(t, 'n', v) }); };
    bd = makeBuilder(ctl, ctl, cfg.tiles, { touch(r) { ctx.touch(r); show(); }, submit: ctx.submit });
    show();
    const g = v => evalToks(bd.toks(), 'n', v);
    const same = f => TEST.every(v => g(v) === f(v));
    return {
      check() {
        const t = bd.toks();
        if (g(0) == null) return 'That isn’t a complete expression yet. Put + or × between each pair of tiles.';
        if (same(A.f)) return true;
        if (!t.includes('n')) return 'Your expression has no ' + mx('n') + ', so its output never changes. The output of ' + mx(A.s) + ' changes when ' + mx('n') + ' changes.';
        for (const w of cfg.wrong) if (same(w.f)) return w.say;
        const hit = TEST.find(v => g(v) === A.f(v)), d = TEST.find(v => v > 0 && g(v) !== A.f(v));
        return (hit != null ? 'They match at ' + mx('n = ' + hit) + ', but one match isn’t enough. ' : '') +
          'At ' + mx('n = ' + d) + ', ' + mx(A.s) + ' gives ' + A.f(d) + ' but yours gives ' + g(d) + '.';
      },
      win: () => cfg.win(bd.toks().join(' ')),
      won() { bd.lock(); },
      solve() { bd.set(cfg.ans); show(); }
    };
  };
}

const cards = [

/* 1 */ {
  prompt: 'Two machines get the same input. Do ' + mx('n + n + n') + ' and ' + mx('3n') + ' give the same output?',
  sub: 'One slider feeds the same ' + mx('n') + ' into both machines. Try lots of values.',
  build: twinChoice({
    A: E.nnn, B: E.n3, start: 4, ans: 0,
    why: ['',
      'Which value made them different? Slide from 0 to 10 and watch the sign between the two outputs.',
      'At ' + mx('n = 4') + ' both machines give 12, so they match at least once. “Never” can’t be right.'],
    win: () => 'Always. ' + mx('3n') + ' means 3 × ' + mx('n') + ', and ' + mx('n + n + n') + ' is three lots of ' + mx('n') + '. So they match for every ' + mx('n') + ', even values off the slider. Expressions like this are called <b>equivalent</b>.'
  })
},

/* 2 */ {
  prompt: 'Do ' + mx('n + 3') + ' and ' + mx('3 + n') + ' give the same output?',
  sub: 'Slide ' + mx('n') + ' and watch both outputs.',
  build: twinChoice({
    A: E.np3, B: E.p3n, start: 5, ans: 0,
    why: ['',
      'Which value made them different? Slide through every value and watch the sign. Does the order matter when you add two numbers?',
      'At ' + mx('n = 5') + ' both machines give 8, so they do match.'],
    win: () => 'Always. You can add in either order: 5 + 3 and 3 + 5 are both 8. So ' + mx('n + 3') + ' and ' + mx('3 + n') + ' are equivalent.'
  })
},

/* 3 */ {
  prompt: 'Do ' + mx('2(n + 3)') + ' and ' + mx('2n + 3') + ' give the same output?',
  sub: 'Slide ' + mx('n') + ' and watch both outputs.',
  build: twinChoice({
    A: E.br, B: E.nb, start: 1, ans: 2,
    why: [
      'At ' + mx('n = 1') + ', ' + mx('2(n + 3)') + ' gives 2 × (1 + 3) = 8, but ' + mx('2n + 3') + ' gives 2 × 1 + 3 = 5. They are not always equal.',
      'Which value made them match? Slide through every value and watch the gap between the two outputs. Does it ever close?',
      ''],
    win: () => 'Never. ' + mx('2(n + 3)') + ' is two lots of ' + mx('n + 3') + ', so the 3 is counted twice. ' + mx('2n + 3') + ' counts the 3 only once. They use the same numbers, but they are different expressions.'
  })
},

/* 4 */ {
  prompt: 'The left machine always gives more. How many more?',
  sub: 'Slide ' + mx('n') + ' and compare the two outputs each time.',
  build(stage, ctl, ctx) {
    const tw = makeTwin(stage, E.br, E.nb, 4);
    makeSlider(ctl, 'n', 0, 10, 4, v => tw.set(v));
    const ans = makeAnswer(ctl, 'Left output minus right output', ctx);
    return {
      check(attempt) {
        const v = ans.value();
        if (v === 3) return true;
        ans.mark('bad');
        if (isNaN(v)) return 'Type a whole number, using digits only.';
        if (v === 0) return 'The outputs are never the same, so the difference can’t be 0.';
        if (v === 6) return 'The brackets do make two 3s, which is 6. But ' + mx('2n + 3') + ' has a 3 as well. At ' + mx('n = 1') + ' the outputs are 8 and 5.';
        return attempt < 2 ? 'Pick any value of ' + mx('n') + '. Take the right output away from the left output.'
                           : 'Set the slider to ' + mx('n = 1') + '. Read both outputs, then take the right one away from the left one.';
      },
      win: () => '3, for every value of ' + mx('n') + '. ' + mx('(n + 3) + (n + 3)') + ' has two 3s and ' + mx('2n + 3') + ' has one. A gap that never closes means the two are never equal.',
      won() { ans.mark('good'); ans.lock(); },
      solve() { ans.set(3); }
    };
  }
},

/* 5 */ {
  prompt: 'Both machines give 4 when ' + mx('n = 2') + '. What does that tell you about ' + mx('n × 2') + ' and ' + mx('n + 2') + '?',
  build(stage, ctl, ctx) {
    makeTwin(stage, E.t2, E.p2, 2);
    const ch = makeChoices(ctl, ['They are equivalent.', 'One match isn’t enough to tell.', 'They aren’t equivalent, because they look different.'], ctx);
    const why = [
      'They match at ' + mx('n = 2') + ', but equivalent means the same output for <b>every</b> value of ' + mx('n') + '. So far you have seen one value.',
      '',
      'Looks don’t decide it. ' + mx('n + n + n') + ' and ' + mx('3n') + ' look different, but they are equivalent. Only testing values can settle it, and so far you have one value.'
    ];
    return {
      check() { const s = ch.sel()[0]; if (s === 1) return true; ch.mark(s, 'bad'); return why[s]; },
      win: () => 'Right. One matching value doesn’t make two expressions equivalent. A match at one value can be a coincidence. Next, test other values.',
      won() { ch.mark(1, 'good'); ch.lock(); },
      solve() { ch.set([1]); }
    };
  }
},

/* 6 */ {
  prompt: 'Now prove that ' + mx('n × 2') + ' and ' + mx('n + 2') + ' are not equivalent.',
  sub: 'Move the slider to a value of ' + mx('n') + ' where the machines give different outputs.',
  build(stage, ctl, ctx) {
    let n = 2;
    const tw = makeTwin(stage, E.t2, E.p2, n);
    const sl = makeSlider(ctl, 'n', 0, 10, n, v => { n = v; tw.set(v); ctx.touch(true); });
    return {
      check: () => n !== 2 ? true : 'At ' + mx('n = 2') + ' both machines still give 4. That is the trap value. Try any other value.',
      win: () => 'At ' + mx('n = ' + n) + ', ' + mx('n × 2') + ' gives ' + 2 * n + ' but ' + mx('n + 2') + ' gives ' + (n + 2) + '. One value where they differ is enough to prove they are not equivalent. ' + mx('n = 2') + ' is the only value where they match.',
      solve() { sl.set(3); }
    };
  }
},

/* 7 */ {
  prompt: 'No machines this time. Find a value of ' + mx('n') + ' that proves ' + mx('n × 3') + ' and ' + mx('n + 6') + ' are not equivalent.',
  build(stage, ctl, ctx) {
    stage.append(h('<div class="tray"><span class="note">' + mx('n × 3') + '</span><span class="note">' + mx('n + 6') + '</span></div>'));
    const ans = makeAnswer(ctl, mx('n') + ' =', ctx);
    return {
      check() {
        const v = ans.value();
        if (isNaN(v)) { ans.mark('bad'); return 'Type a whole number, using digits only.'; }
        if (v === 3) { ans.mark('bad'); return 'At ' + mx('n = 3') + ', 3 × 3 = 9 and 3 + 6 = 9. They match there, so this value can’t prove anything. Try another.'; }
        return true;
      },
      win: () => { const v = ans.value(); return 'At ' + mx('n = ' + v) + ', ' + v + ' × 3 = ' + 3 * v + ' but ' + v + ' + 6 = ' + (v + 6) + '. Different outputs, so the expressions are not equivalent. ' + mx('n = 3') + ' is the one value that could have fooled you.'; },
      won() { ans.mark('good'); ans.lock(); },
      solve() { ans.set(1); }
    };
  }
},

/* 8 */ {
  prompt: 'These two match at exactly one whole number. Find it.',
  sub: 'Slide ' + mx('n') + ' until both machines give the same output.',
  build(stage, ctl, ctx) {
    let n = 0;
    const tw = makeTwin(stage, E.t4, E.p9, n);
    const sl = makeSlider(ctl, 'n', 0, 10, n, v => { n = v; tw.set(v); ctx.touch(true); });
    return {
      check() {
        if (n === 3) return true;
        const a = 4 * n, b = n + 9;
        return 'At ' + mx('n = ' + n) + ' the outputs are ' + a + ' and ' + b + '. ' + mx('n × 4') + (a < b ? ' is still smaller, so try a bigger ' : ' has gone past, so try a smaller ') + mx('n') + '.';
      },
      win: () => 'At ' + mx('n = 3') + ' both give 12. At every other value they differ. They are <b>sometimes</b> equal, and that means they are <b>not</b> equivalent.',
      solve() { sl.set(3); }
    };
  }
},

/* 9 */ {
  prompt: 'Sort the pairs. Are the two expressions always, sometimes or never equal?',
  sub: 'Test values in your head. Drag each pair into a box, or tap a pair, then tap a box.',
  build(stage, ctl, ctx) {
    const items = [
      { a: 'n + n', b: '2n', bin: 'always', no: {
        some: 'Which value made them differ? ' + mx('n + n') + ' is two lots of ' + mx('n') + '. What does ' + mx('2n') + ' mean?',
        never: 'At ' + mx('n = 1') + ' both give 2, so they do match. Test some more values.' } },
      { a: '3n', b: 'n + 8', bin: 'some', no: {
        always: 'At ' + mx('n = 1') + ' they give 3 and 9, so they don’t always match.',
        never: 'Try ' + mx('n = 4') + ': 3 × 4 = 12 and 4 + 8 = 12. They do match once.' } },
      { a: 'n + 1', b: 'n + 4', bin: 'never', no: {
        always: 'At ' + mx('n = 1') + ' they give 2 and 5, so they don’t always match.',
        some: 'Which value made them match? How far apart are the outputs at each value?' } },
      { a: '5 + n', b: 'n + 5', bin: 'always', no: {
        some: 'Which value made them differ? Does the order matter when you add two numbers?',
        never: 'At ' + mx('n = 1') + ' both give 6, so they do match. Test some more values.' } },
      { a: '2(n + 1)', b: '2n + 1', bin: 'never', no: {
        always: 'At ' + mx('n = 1') + ' they give 4 and 3. The brackets double the 1 as well.',
        some: 'Which value made them match? ' + mx('2(n + 1)') + ' counts the 1 twice. How far apart are the outputs?' } },
      { a: '2n', b: 'n + 5', bin: 'some', no: {
        always: 'At ' + mx('n = 1') + ' they give 2 and 6, so they don’t always match.',
        never: 'Try ' + mx('n = 5') + ': 2 × 5 = 10 and 5 + 5 = 10. They do match once.' } }
    ];
    const place = items.map(() => 'tray');
    let sel = null, locked = false;
    const bins = h('<div class="bins b3">' + [['always', 'Always equal'], ['some', 'Sometimes equal'], ['never', 'Never equal']].map(b =>
      '<div class="bin" data-drop="' + b[0] + '"><button type="button" class="bin-h">' + b[1] + '</button><div class="bin-c"></div></div>').join('') + '</div>');
    const tray = h('<div class="chips" data-drop="tray"></div>');
    stage.append(bins); ctl.append(tray);
    const hostOf = w => w === 'tray' ? tray : $('.bin[data-drop=' + w + '] .bin-c', bins);
    const chips = items.map((it, i) => {
      const c = h('<button type="button" class="chip pc">' + mx(it.a) + '<small>and</small>' + mx(it.b) + '</button>');
      c.onclick = () => { if (locked) return; sel = sel === i ? null : i; draw(); };
      draggable(c, { accept: ['always', 'some', 'never', 'tray'], onDrop: t => move(i, t.getAttribute('data-drop')) });
      return c;
    });
    function move(i, where) {
      if (locked) return;
      place[i] = where; sel = null;
      chips.forEach(c => c.classList.remove('bad'));
      draw(); ctx.touch(place.every(p => p !== 'tray'));
    }
    function draw() {
      chips.forEach((c, i) => { const host = hostOf(place[i]); if (c.parentNode !== host) host.append(c); c.classList.toggle('sel', sel === i); });
    }
    bins.querySelectorAll('.bin').forEach(b => b.addEventListener('click', e => { if (!e.target.closest('.chip') && sel != null) move(sel, b.getAttribute('data-drop')); }));
    tray.addEventListener('click', e => { if (!e.target.closest('.chip') && sel != null) move(sel, 'tray'); });
    draw();
    return {
      check() {
        const wrong = items.map((it, i) => place[i] !== it.bin ? i : -1).filter(i => i >= 0);
        if (!wrong.length) return true;
        wrong.forEach(i => chips[i].classList.add('bad'));
        const f = items[wrong[0]];
        return plural(wrong.length, 'pair') + (wrong.length === 1 ? ' is' : ' are') + ' in the wrong box. ' + mx(f.a) + ' and ' + mx(f.b) + ': ' + f.no[place[wrong[0]]];
      },
      win: () => 'Only the “always equal” pairs are equivalent. A pair that is sometimes equal is not equivalent, however lucky the match. A “never equal” pair has a gap that never closes.',
      won() { locked = true; chips.forEach(c => { c.classList.remove('sel'); c.classList.add('good'); }); },
      solve() { items.forEach((it, i) => { place[i] = it.bin; }); sel = null; chips.forEach(c => c.classList.remove('bad')); draw(); }
    };
  }
},

/* 10 */ {
  prompt: 'A cinema ticket costs ' + mx('n') + ' dollars. Tap every expression that gives the cost of 4 tickets.',
  build(stage, ctl, ctx) {
    stage.hidden = true;
    const ch = makeChoices(ctl, [mx('n + n + n + n'), mx('4 × n'), mx('n + 4'), mx('n × 4')], ctx, true);
    return {
      check() {
        const s = ch.sel(), has = i => s.includes(i);
        if (has(2)) { ch.mark(2, 'bad'); return mx('n + 4') + ' is one ticket plus $4. Test ' + mx('n = 10') + ': 4 tickets cost $40, but 10 + 4 = 14.'; }
        const left = [0, 1, 3].filter(i => !has(i)).length;
        if (!left) return true;
        return 'You found ' + (3 - left) + ', but there ' + (left === 1 ? 'is 1 more' : 'are ' + left + ' more') + '. Test the ones you left out with ' + mx('n = 10') + ': 4 tickets at $10 cost $40. Adding and multiplying can both count 4 lots.';
      },
      win: () => 'All three are equivalent: whatever the price, they give the same cost. If a ticket costs $10, each one gives $40. ' + mx('n + 4') + ' gives $14.',
      won() { [0, 1, 3].forEach(i => ch.mark(i, 'good')); ch.lock(); },
      solve() { ch.set([0, 1, 3]); }
    };
  }
},

/* 11 */ {
  prompt: 'Build an expression equivalent to ' + mx('3n + 4') + '. Test it, then check.',
  build: buildTwin({
    A: { s: '3n + 4', f: n => 3 * n + 4 }, start: 2,
    tiles: ['n', '+', '×', '1', '2', '3', '4'],
    ans: ['n', '+', 'n', '+', 'n', '+', '4'],
    wrong: [
      { f: n => 3 * n, say: 'Your machine gives 3 lots of ' + mx('n') + ', which is the ' + mx('3n') + ' part. ' + mx('3n + 4') + ' adds 4 as well.' },
      { f: n => n + 7, say: mx('3n') + ' means 3 × ' + mx('n') + ', not 3 + ' + mx('n') + '. At ' + mx('n = 2') + ', ' + mx('3n + 4') + ' gives 10 but yours gives 9.' }
    ],
    win: e => { const alt = ['n + n + n + 4', '4 + 3 × n', '3 × n + 4'].filter(x => x !== e); return mx(e) + ' matches ' + mx('3n + 4') + ' for every ' + mx('n') + ', so they are equivalent. Other forms work too, such as ' + mx(alt[0]) + ' and ' + mx(alt[1]) + '.'; }
  })
},

/* 12 */ {
  prompt: 'No bracket tile. Build an expression equivalent to ' + mx('2(n + 3)') + '.',
  build: buildTwin({
    A: E.br, start: 1,
    tiles: ['n', '+', '×', '1', '2', '3'],
    ans: ['n', '+', '3', '+', 'n', '+', '3'],
    wrong: [
      { f: n => 2 * n + 3, say: 'That gives the same as ' + mx('2n + 3') + ', the machine that never matched. In ' + mx('2(n + 3)') + ' the 3 is doubled too.' },
      { f: n => n + 3, say: 'That is one lot of ' + mx('n + 3') + '. ' + mx('2(n + 3)') + ' means two lots.' },
      { f: n => n + 6, say: 'You doubled the 3 but not the ' + mx('n') + '. Two lots of ' + mx('n + 3') + ' has ' + mx('n') + ' in it twice.' }
    ],
    win: e => mx(e) + ' matches ' + mx('2(n + 3)') + ' for every ' + mx('n') + '. Two lots of ' + mx('n + 3') + ' can be written ' + mx('n + 3 + n + 3') + ' or ' + mx('2 × n + 3 + 3') + '. Both are equivalent to it.'
  })
},

/* 13 */ {
  prompt: 'Who is right about equivalent expressions?',
  sub: 'Choose Agree or Disagree for each one.',
  build(stage, ctl, ctx) {
    stage.hidden = true;
    const claims = [
      { who: 'Lena', say: '“' + mx('n × 2') + ' and ' + mx('n + 2') + ' both give 4 when ' + mx('n = 2') + ', so they’re equivalent.”', agree: false, hint: 'Is one matching value enough? Test ' + mx('n = 3') + ' in both.', why: 'One matching value isn’t enough. At ' + mx('n = 3') + ' they give 6 and 5.' },
      { who: 'Tom', say: '“' + mx('2(n + 3)') + ' and ' + mx('2n + 3') + ' give 8 and 5 when ' + mx('n = 1') + ', so they aren’t equivalent.”', agree: true, hint: 'Check his numbers at ' + mx('n = 1') + '. What does one value where they differ tell you?', why: 'One value where they differ is enough to show two expressions are not equivalent.' },
      { who: 'Priya', say: '“' + mx('n + 3') + ' and ' + mx('3 + n') + ' look different, so they can’t be equivalent.”', agree: false, hint: 'Does looking different decide it? Test a few values in both.', why: 'Looks don’t decide it. They give the same output for every ' + mx('n') + ', because you can add in either order.' }
    ];
    const pick = claims.map(() => null);
    let locked = false;
    const list = h('<div class="claims"></div>');
    const rows = claims.map((c, i) => {
      const row = h('<div class="claim"><span class="av" aria-hidden="true">' + c.who[0] + '</span><p><span class="who">' + c.who + ':</span> ' + c.say + '</p><div class="yn" role="group" aria-label="' + c.who + '">' +
        '<button type="button" aria-pressed="false">Agree</button><button type="button" aria-pressed="false">Disagree</button></div></div>');
      const btns = row.querySelectorAll('.yn button');
      btns.forEach((b, k) => { b.onclick = () => { if (locked) return; pick[i] = k === 0; paint(i); ctx.touch(pick.every(p => p !== null)); }; });
      list.append(row);
      return { row, btns };
    });
    function paint(i) {
      const r = rows[i];
      r.btns[0].setAttribute('aria-pressed', pick[i] === true);
      r.btns[1].setAttribute('aria-pressed', pick[i] === false);
      r.row.classList.remove('bad', 'good');
      const w = $('.why', r.row); if (w) w.remove();
    }
    const explain = (i, cls) => {
      rows[i].row.classList.add(cls);
      const w = $('.why', rows[i].row); if (w) w.remove();
      rows[i].row.append(h('<p class="why">' + (cls === 'bad' ? claims[i].hint : claims[i].why) + '</p>'));
    };
    ctl.append(list);
    return {
      check() {
        const wrong = claims.map((c, i) => pick[i] !== c.agree ? i : -1).filter(i => i >= 0);
        if (!wrong.length) return true;
        wrong.forEach(i => explain(i, 'bad'));
        return wrong.length === 1 ? 'Look again at what ' + claims[wrong[0]].who + ' said. The note under it gives a hint.'
                                  : 'Look again at ' + wrong.map(i => claims[i].who).join(' and ') + '. The notes under them give hints.';
      },
      win: () => 'Tom has it. Lena trusted one matching value, and Priya judged by looks. Two expressions are equivalent when they give the same number for every value of the variable. One match proves nothing; one mismatch proves they are not equivalent.',
      won() { locked = true; claims.forEach((c, i) => { rows[i].row.classList.remove('bad'); explain(i, 'good'); rows[i].btns.forEach(b => { b.disabled = true; }); }); },
      solve() { claims.forEach((c, i) => { pick[i] = c.agree; paint(i); }); }
    };
  }
}
];

const SECTIONS = [[0, 'Two machines'], [4, 'One value is not enough'], [8, 'Sort and build'], [12, 'Wrap-up']];

// Finish screen: sets the prompt, sub-line and recap for this lesson.
function drawFinish() {
  promptEl.textContent = 'Two expressions are equivalent when they give the same number for every value of the variable.';
  subEl.hidden = false; subEl.textContent = 'Four things to remember:';
  ctl.replaceChildren(); stage.hidden = false;
  const t = (k, x) => '<span class="tile ' + k + ' still">' + x + '</span>';
  stage.replaceChildren(h('<ul class="recap">' +
    '<li><span class="art">' + t('num', 3) + t('var', 'n') + '</span><span>' + mx('n + n + n') + ' and ' + mx('3n') + ' are equivalent: three lots of ' + mx('n') + ' is 3 × ' + mx('n') + ' for every ' + mx('n') + '.</span></li>' +
    '<li><span class="art">' + t('var', 'n') + t('op', '+') + t('num', 3) + '</span><span>You can add in either order, so ' + mx('n + 3') + ' and ' + mx('3 + n') + ' are equivalent.</span></li>' +
    '<li><span class="art">' + t('op', '=') + t('op', '?') + '</span><span>One matching value is not enough. ' + mx('n × 2') + ' and ' + mx('n + 2') + ' both give 4 at ' + mx('n = 2') + ', but not at ' + mx('n = 3') + '.</span></li>' +
    '<li><span class="art">' + t('op', '≠') + '</span><span>One value where they differ proves two expressions are not equivalent, like ' + mx('2(n + 3)') + ' and ' + mx('2n + 3') + ' at ' + mx('n = 1') + '.</span></li></ul>'));
}
