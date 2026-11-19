/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const h = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');

// "4a + 3 - a" -> maths markup. Every lower-case letter is a variable (y gets its own colour); "-" becomes a minus sign.
function mx(s) {
  return '<span class="m">' + String(s).replace(/-/g, '−').replace(/[a-z]/g, c => '<i class="v' + (c === 'y' ? ' y' : '') + '">' + c + '</i>') + '</span>';
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
  let g = '<g class="bag' + (o.y ? ' y' : '') + (xray ? ' xray' : '') + '" transform="translate(' + x + ',' + y + ')">' +
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

/* ---------- components ---------- */
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

/* ---------- like terms ---------- */
// Bags for this lesson: kind 'x' is a blue bag, kind 'y' a purple bag. inside = n draws it see-through.
const bagSvg = (kind, inside) => svgBag({ tag: kind, y: kind === 'y', inside });
const marbles = n => '<div class="mbs">' + ('<div class="it smb">' + SVG_MARBLE + '</div>').repeat(n) + '</div>';
const num = n => n < 0 ? '−' + (-n) : String(n);

// Typed linear expressions: "4a + 3 - a - 5" -> [{c: 4, v: 'a'}, {c: 3, v: ''}, {c: -1, v: 'a'}, {c: -5, v: ''}]. null if unreadable.
function parseLin(s) {
  s = String(s).replace(/[−–]/g, '-').replace(/[×*·]/g, '').replace(/\s+/g, '').toLowerCase();
  if (!s) return null;
  const re = /([+-])?(\d+)?([a-z]*)/y, out = [];
  let i = 0;
  while (i < s.length) {
    re.lastIndex = i;
    const m = re.exec(s);
    if (!m || (!m[2] && !m[3]) || (!m[1] && out.length)) return null;
    out.push({ c: (m[1] === '-' ? -1 : 1) * (m[2] ? +m[2] : 1), v: m[3].split('').sort().join('') });
    i = re.lastIndex;
  }
  return out;
}
const collect = t => { const m = {}; t.forEach(z => { m[z.v] = (m[z.v] || 0) + z.c; }); Object.keys(m).forEach(k => { if (!m[k]) delete m[k]; }); return m; };
const same = (a, b) => [...new Set(Object.keys(a).concat(Object.keys(b)))].every(k => (a[k] || 0) === (b[k] || 0));
const isSimple = t => new Set(t.map(z => z.v)).size === t.length && t.every(z => z.c !== 0);
const evalT = (t, vals) => t.reduce((s, z) => s + z.c * z.v.split('').reduce((p, l) => p * (vals[l] != null ? vals[l] : 3), 1), 0);
const fmtT = t => t.map((z, i) => { const a = Math.abs(z.c), body = (a === 1 && z.v ? '' : a) + z.v; return i === 0 ? (z.c < 0 ? '−' : '') + body : (z.c < 0 ? ' − ' : ' + ') + body; }).join('');
const TESTS = [{ a: 2, x: 2, y: 3 }, { a: 5, x: 5, y: 1 }, { a: 1, x: 1, y: 4 }];
const at = (p, letters) => mx(letters.map(l => l + ' = ' + p[l]).join(', '));

function makeExpr(host, label, ctx) {
  const row = h('<div class="answer"><label for="ex">' + label + '</label><input id="ex" class="wide" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="32"></div>');
  const prev = h('<div class="live"></div>');
  const inp = $('input', row);
  const paint = () => {
    const t = parseLin(inp.value);
    prev.innerHTML = !inp.value.trim() ? '<small>Type terms like 3x or −2. Use the minus key for −.</small>' : t ? '<span class="lab">You typed</span>' + mx(fmtT(t)) : '<small>The marker can’t read that yet.</small>';
  };
  inp.addEventListener('input', () => { inp.classList.remove('bad', 'good'); paint(); ctx.touch(inp.value.trim() !== ''); });
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ctx.submit(); } });
  paint();
  host.append(row, prev);
  return {
    terms: () => parseLin(inp.value),
    mark: c => inp.classList.add(c),
    set: v => { inp.value = v; paint(); },
    lock: () => { inp.disabled = true; }
  };
}

// "Simplify ..." card. Any equivalent answer in simplest form is accepted; wrong: [[collected terms, feedback], ...].
function simpCard(cfg) {
  return function (stage, ctl, ctx) {
    stage.append(h('<div class="live big">' + mx(cfg.expr) + '</div>'));
    const ex = makeExpr(ctl, 'Simplest form', ctx);
    const orig = parseLin(cfg.expr), want = collect(orig);
    const letters = [...new Set(cfg.expr.replace(/[^a-z]/g, ''))].sort();
    function judge() {
      const t = ex.terms();
      if (!t) return 'The marker can’t read that. Type terms like ' + mx('3x') + ' or ' + mx('-2') + ', joined by + or −.';
      const got = collect(t);
      if (same(got, want)) return isSimple(t) ? true : 'That has the right value, but it still has like terms to combine. Write each kind of term only once.';
      if (Object.keys(got).some(k => k.length > 1)) return 'Your answer has letters multiplied together, like ' + mx('xy') + '. Adding terms never multiplies their letters. Unlike terms just stay apart.';
      if (Object.keys(got).some(k => k && !letters.includes(k))) return 'Your answer uses a letter that isn’t in ' + mx(cfg.expr) + '.';
      const w = cfg.wrong.find(p => same(p[0], got));
      if (w) return w[1];
      const p = TESTS.find(q => evalT(t, q) !== evalT(orig, q));
      return 'Test it with ' + at(p, letters) + '. ' + mx(cfg.expr) + ' gives ' + num(evalT(orig, p)) + ', but your answer gives ' + num(evalT(t, p)) + '.';
    }
    return {
      check() { const r = judge(); if (r !== true) ex.mark('bad'); return r; },
      win: cfg.win,
      won() { ex.mark('good'); ex.lock(); },
      solve() { ex.set(cfg.ans); }
    };
  };
}

/* ---------- area model ---------- */
// A rectangle drawn to scale: height a, length cut into parts. Drag the bottom edge (a), the split line (p) or the right edge (q),
// or tap the ruler beside them. Blue parts are lengths in x, yellow parts are known numbers, a hatched part has been cut off.
// spec: { a, aLab, total, parts: [{ x, len, kind, area, hl, hlLab }], top: [{ x, len, lab }], bot, ticks, split, qFrom, grid }
function makeArea(host, o) {
  const drag = o.drag || {};
  const node = h('<div class="am" style="--ml:' + o.maxLen + ';--ma:' + o.maxA + ';--ah:' + (o.h || 6.5) + 'rem">' +
    '<div class="am-top"></div><div class="am-side"></div><div class="am-rect"><div class="am-parts" role="img"></div></div><div class="am-bot"></div></div>');
  const top = $('.am-top', node), side = $('.am-side', node), rect = $('.am-rect', node), partsEl = $('.am-parts', node), bot = $('.am-bot', node);
  const NAMES = { a: 'Height', p: 'Split line', q: 'Right edge' };
  const handles = {};
  let spec = null, locked = false;
  const val = k => k === 'a' ? spec.a : k === 'p' ? spec.split : spec.total - spec.qFrom;
  function set(k, v) {
    if (locked) return;
    v = Math.max(drag[k][0], Math.min(drag[k][1], Math.round(v)));
    if (v !== val(k)) o.onDrag(k, v);
  }
  function at(k, ev) {
    const r = rect.getBoundingClientRect(), u = r.width / spec.total;
    set(k, k === 'a' ? (ev.clientY - r.top) / u : (ev.clientX - r.left) / u - (k === 'q' ? spec.qFrom : 0));
  }
  function start(k, el, e, jump) {
    if (locked || !spec || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
    const move = ev => at(k, ev);
    const end = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', end); el.removeEventListener('pointercancel', end); };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    if (jump) at(k, e);                    // a tap on the ruler moves the edge straight there
  }
  Object.keys(drag).forEach(k => {
    const b = h('<button type="button" class="am-h am-h-' + k + '" role="slider" aria-label="' + ((o.names && o.names[k]) || NAMES[k]) + '" aria-valuemin="' + drag[k][0] + '" aria-valuemax="' + drag[k][1] + '"></button>');
    b.addEventListener('pointerdown', e => start(k, b, e, false));
    b.addEventListener('keydown', e => {
      const d = { ArrowRight: 1, ArrowLeft: -1, ArrowUp: k === 'a' ? -1 : 1, ArrowDown: k === 'a' ? 1 : -1 }[e.key];
      if (d && spec) { e.preventDefault(); set(k, val(k) + d); }
    });
    rect.append(b);
    handles[k] = b;
  });
  if (drag.a) { side.classList.add('track'); side.addEventListener('pointerdown', e => start('a', side, e, true)); }
  const hk = drag.p ? 'p' : drag.q ? 'q' : null;
  if (hk) { top.classList.add('track'); top.addEventListener('pointerdown', e => start(hk, top, e, true)); }
  host.append(node);
  const pos = (x, len) => 'left:calc(var(--u) * ' + x + ');width:calc(var(--u) * ' + len + ')';
  const lens = list => (list || []).map(t => '<span class="am-len" style="' + pos(t.x, t.len) + '">' + t.lab + '</span>').join('');
  const plain = s => String(s == null ? '' : s).replace(/<[^>]*>/g, '');
  return {
    draw(s) {
      spec = s;
      rect.style.width = 'calc(var(--u) * ' + s.total + ')';
      rect.style.height = 'calc(var(--u) * ' + s.a + ')';
      partsEl.innerHTML = s.parts.map(p => '<div class="am-part ' + p.kind + (p.kind === 'var' && s.grid === false ? ' plain' : '') + '" style="' + pos(p.x, p.len) + '">' +
          (p.hl ? '<div class="am-hl" style="height:calc(var(--u) * ' + p.hl + ')">' + (p.hlLab || '') + '</div>' : '') +
          '<span class="am-lab">' + (p.area == null ? '' : p.area) + '</span></div>').join('') +
        (s.ticks || []).map(t => '<div class="am-tick" style="left:calc(var(--u) * ' + t + ')"></div>').join('');
      top.innerHTML = lens(s.top);
      bot.innerHTML = lens(s.bot);
      side.innerHTML = '<span class="am-len" style="height:calc(var(--u) * ' + s.a + ')">' + s.aLab + '</span>';
      if (handles.a) { handles.a.style.top = 'calc(var(--u) * ' + s.a + ')'; handles.a.setAttribute('aria-valuenow', s.a); }
      if (handles.p) { handles.p.style.left = 'calc(var(--u) * ' + s.split + ')'; handles.p.setAttribute('aria-valuenow', s.split); }
      if (handles.q) { handles.q.style.left = 'calc(var(--u) * ' + s.total + ')'; handles.q.setAttribute('aria-valuenow', s.total - s.qFrom); }
      partsEl.setAttribute('aria-label', 'Rectangle, ' + plain(s.aLab) + ' tall and ' + s.top.map(t => plain(t.lab)).join(' plus ') + ' long. Areas inside: ' +
        s.parts.map(p => plain(p.area) || 'not shown').join(', ') + '.');
    },
    lock() { locked = true; node.classList.add('locked'); }
  };
}

// Parts laid end to end along the length, as in a(b + c).
function lay(a, aLab, parts, extra) {
  let x = 0;
  const ps = parts.map(p => { const q = Object.assign({ x: x }, p); x += p.len; return q; });
  return Object.assign({ a: a, aLab: aLab, total: x, parts: ps, top: ps.map(p => ({ x: p.x, len: p.len, lab: p.lab })), split: ps[0].len, qFrom: ps[0].len }, extra);
}
// A strip cut off the end of the length, as in a(b − c). o: { lab, keepLab, cutLab, keep, cut, ticks }
function layCut(a, aLab, len, cut, o) {
  return { a: a, aLab: aLab, total: len, ticks: o.ticks,
    parts: [{ x: 0, len: len - cut, kind: 'var', area: o.keep }, { x: len - cut, len: cut, kind: 'cut', area: o.cut }],
    top: [{ x: 0, len: len - cut, lab: o.keepLab }, { x: len - cut, len: cut, lab: o.cutLab }],
    bot: [{ x: 0, len: len, lab: o.lab }] };
}

// Answer boxes inside an expression: mx('3(x + 4) = {}x + {}'). Each box takes a whole number, negatives allowed.
function makeBlanks(host, html, ctx, onInput) {
  const row = h('<div class="answer blanks">' + html.replace(/\{\}/g, '<input type="text" autocomplete="off" spellcheck="false" maxlength="4">') + '</div>');
  const inps = [...row.querySelectorAll('input')];
  inps.forEach((inp, i) => {
    inp.setAttribute('aria-label', 'Box ' + (i + 1) + ' of ' + inps.length);
    inp.addEventListener('input', () => { inps.forEach(n => n.classList.remove('bad', 'good')); ctx.touch(inps.every(n => n.value.trim() !== '')); if (onInput) onInput(); });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ctx.submit(); } });
  });
  host.append(row);
  const num = s => { s = s.trim().replace(/^[−–]/, '-'); return /^-?\d+$/.test(s) ? +s : NaN; };
  return {
    vals: () => inps.map(n => num(n.value)),
    mark: c => inps.forEach(n => n.classList.add(c)),
    set(a) { a.forEach((v, i) => { inps[i].value = v; }); if (onInput) onInput(); },
    lock: () => inps.forEach(n => { n.disabled = true; })
  };
}

const dec = v => String(+v.toFixed(2));
const term = c => (c === 1 ? '' : dec(c)) + 'x';

/* ---------- Why? panel diagrams ---------- */
// Maths inside an SVG <text>: letters italic (y purple), "-" as a minus sign.
const st = s => String(s).replace(/-/g, '−').replace(/[a-z]/g, c => '<tspan class="sv' + (c === 'y' ? ' y' : '') + '">' + c + '</tspan>');
// A row of see-through bags and loose marbles. items: { k: 'x' | 'y' | 'm', inside: n, off: true (taken away) }
function whyBags(items) {
  let x = 0, g = '';
  items.forEach(it => {
    let s, cross;
    if (it.k === 'm') { s = marbleG(x + 12, 57, 11); cross = 'M' + (x + 2) + ' 67 L' + (x + 22) + ' 47'; x += 27; }
    else { s = bagG(x, 0, { tag: it.k, y: it.k === 'y', inside: it.inside }); cross = 'M' + (x + 4) + ' 68 L' + (x + 58) + ' 8'; x += 72; }
    g += it.off ? '<g class="w-off">' + s + '</g><path class="w-x" d="' + cross + '"/>' : s;
  });
  return '<svg class="wsvg bags" viewBox="-4 -12 ' + (x + 6) + ' 86" aria-hidden="true">' + g + '</svg>';
}
// A small area model. parts: [{ w, kind: 'v' | 'n' | 'c', top, area }], w in any unit; o.bot labels the whole length; o.W, o.H size it.
function whyArea(a, parts, o) {
  o = o || {};
  const L = 38, T = 24, W = o.W || 290, H = o.H || 64, sum = parts.reduce((s, p) => s + p.w, 0);
  let x = L, g = '';
  parts.forEach(p => {
    const w = W * p.w / sum;
    g += '<rect class="wa-' + p.kind + '" x="' + x + '" y="' + T + '" width="' + w + '" height="' + H + '"/>' +
      '<text x="' + (x + w / 2) + '" y="' + (T - 7) + '" text-anchor="middle">' + st(p.top) + '</text>' +
      '<text class="wa-a" x="' + (x + w / 2) + '" y="' + (T + H / 2 + 6) + '" text-anchor="middle">' + st(p.area) + '</text>';
    x += w;
  });
  g += '<rect class="wa-o" x="' + L + '" y="' + T + '" width="' + W + '" height="' + H + '"/>' +
    '<text x="' + (L - 9) + '" y="' + (T + H / 2 + 5) + '" text-anchor="end">' + a + '</text>';
  if (o.bot) g += '<path class="wa-b" d="M' + L + ' ' + (T + H + 5) + ' v6 h' + W + ' v-6"/><text x="' + (L + W / 2) + '" y="' + (T + H + 27) + '" text-anchor="middle">' + st(o.bot) + '</text>';
  return '<svg class="wsvg area" viewBox="0 0 340 ' + (o.bot ? 122 : 96) + '" aria-hidden="true">' + g + '</svg>';
}
// Terms sorted into their kinds: rows of [kind, [terms], total].
const whyTerms = rows => '<div class="wt">' + rows.map(r => '<div class="wt-row"><span class="wt-k">' + r[0] + '</span>' +
  r[1].map(t => '<span class="wt-c ' + r[3] + '">' + mx(t) + '</span>').join('') + '<span class="wt-eq">make</span><b>' + mx(r[2]) + '</b></div>').join('') + '</div>';
const wl = (...lines) => lines.map(l => '<p class="wl">' + l + '</p>').join('');

const SIGN = 'The minus is already in front of the box. Type the strip’s area with no sign.';
const LT = 'like-terms', AM = 'area-model-expansion';

/* ---------- cards ---------- */

const cards = [

/* 1 */ {
  bridge: true,
  prompt: 'Level Check: Expressions in Year 8',
  sub: 'There are 8 questions, mixed from Like terms and Expanding with the area model. After two tries, the check shows the answer and moves on.'
},

/* 2: unlike terms stay apart (adding unlike terms, 5xy) */ {
  from: LT,
  prompt: 'This mat shows ' + mx('3x + 2y + 4') + '. What is it in simplest form?',
  sub: 'Each blue bag holds ' + mx('x') + ' marbles. Each purple bag holds ' + mx('y') + ' marbles.',
  why: () => whyBags([{ k: 'x', inside: 2 }, { k: 'x', inside: 2 }, { k: 'x', inside: 2 }, { k: 'y', inside: 5 }, { k: 'y', inside: 5 }, { k: 'm' }, { k: 'm' }, { k: 'm' }, { k: 'm' }]) +
    wl('Try ' + mx('x = 2') + ' and ' + mx('y = 5') + ': the mat holds 3 × 2 + 2 × 5 + 4 = 20 marbles.',
       mx('9xy') + ' would be 9 × 2 × 5 = 90. Three kinds of thing stay as three terms: ' + mx('3x + 2y + 4') + '.'),
  build(stage, ctl, ctx) {
    stage.append(h('<div class="mat">' + ('<div class="it sbag">' + bagSvg('x') + '</div>').repeat(3) + ('<div class="it sbag">' + bagSvg('y') + '</div>').repeat(2) + marbles(4) + '</div>'));
    const ch = makeChoices(ctl, [mx('9xy'), mx('5x + 4'), mx('3x + 2y + 4') + ' <small>It can’t be made shorter.</small>', mx('5xy + 4')], ctx);
    $('.choices', ctl).classList.add('four');
    const why = [
      'That adds 3 + 2 + 4 and pushes the letters together. Try ' + mx('x = 2') + ', ' + mx('y = 5') + ': the mat holds 3 × 2 + 2 × 5 + 4 = 20 marbles, but ' + mx('9xy') + ' is 9 × 2 × 5 = 90.',
      'That counts the purple bags as blue ones. A purple bag holds ' + mx('y') + ' marbles, and ' + mx('y') + ' can be a different number from ' + mx('x') + '.',
      '',
      'Adding blue bags to purple bags never multiplies ' + mx('x') + ' by ' + mx('y') + '. Try ' + mx('x = 2') + ', ' + mx('y = 5') + ': ' + mx('3x + 2y') + ' is 6 + 10 = 16, but ' + mx('5xy') + ' is 5 × 2 × 5 = 50.'
    ];
    return {
      check() { const s = ch.sel()[0]; if (s === 2) return true; ch.mark(s, 'bad'); return why[s]; },
      win: () => mx('3x + 2y + 4') + ' is already in simplest form. Blue bags, purple bags and loose marbles are three different kinds, so none of these are like terms.',
      won() { ch.mark(2, 'good'); ch.lock(); },
      solve() { ch.set([2]); }
    };
  }
},

/* 3: build the rectangle, then expand it */ {
  from: AM,
  prompt: 'Build a rectangle for ' + mx('4(x + 3)') + '.',
  sub: 'The blue length is ' + mx('x') + '. Drag the bottom edge to set the height, and the right edge to set the yellow length.',
  why: () => whyArea(4, [{ w: 5, kind: 'v', top: 'x', area: '' }, { w: 3, kind: 'n', top: '3', area: '' }]) +
    wl('The number outside the bracket, 4, is the height.', 'The bracket, ' + mx('x + 3') + ', is the length: a blue ' + mx('x') + ' and a yellow 3.'),
  build(stage, ctl, ctx) {
    const X = 5;
    let a = 1, q = 6, shown = false;
    const am = makeArea(stage, { maxLen: 13, maxA: 6, h: 9, drag: { a: [1, 6], q: [1, 8] }, names: { q: 'Yellow length' },
      onDrag(k, v) { if (k === 'a') a = v; else q = v; draw(); ctx.touch(true); } });
    const live = h('<div class="live"></div>');
    stage.append(live);
    function draw() {
      am.draw(lay(a, String(a), [{ len: X, kind: 'var', lab: mx('x'), area: shown ? mx(term(a)) : '' }, { len: q, kind: 'num', lab: q, area: shown ? a * q : '' }], { grid: false }));
      live.innerHTML = '<span class="lab">Your rectangle</span>' + mx(a + '(x + ' + q + ')');
    }
    draw();
    return {
      check() {
        if (a === 4 && q === 3) return true;
        if (a === 3 && q === 4) return 'That is ' + mx('3(x + 4)') + '. The number outside the bracket, 4, is the height. The bracket, ' + mx('x + 3') + ', is the length.';
        if (a !== 4) return 'The height is the number outside the bracket: 4. Yours is ' + a + '.';
        return 'The height is right. The length is ' + mx('x + 3') + ', so the yellow part should be 3 long. Yours is ' + q + '.';
      },
      win: () => 'Height 4, length ' + mx('x + 3') + '. The number outside the bracket is the height, and the bracket is the length.',
      won() { am.lock(); },
      solve() { a = 4; q = 3; draw(); },
      recap: () => 'You built ' + mx('4(x + 3)') + ': height 4, length ' + mx('x + 3') + '.',
      reveal() { shown = true; draw(); }
    };
  },
  then: {
    prompt: 'Now write its area without brackets.',
    reset: false,
    why: () => whyArea(4, [{ w: 5, kind: 'v', top: 'x', area: '4x' }, { w: 3, kind: 'n', top: '3', area: '12' }]) +
      wl('Blue part: 4 × ' + mx('x = 4x') + '. Yellow part: 4 × 3 = 12.', 'The 4 multiplies both parts, so ' + mx('4(x + 3) = 4x + 12') + '.'),
    build(stage, ctl, ctx, p1) {
      const bl = makeBlanks(ctl, mx('4(x + 3) = {}x + {}'), ctx);
      return {
        check() {
          const [c, k] = bl.vals();
          if (isNaN(c) || isNaN(k)) { bl.mark('bad'); return 'Type a whole number in each box.'; }
          if (c === 4 && k === 12) return true;
          bl.mark('bad');
          if (c === 4 && k === 3) return 'You multiplied the ' + mx('x') + ' by 4 but not the 3. The yellow part is 4 tall and 3 long, so its area is 4 × 3, not 3.';
          if (c === 4 && k === 7) return '7 is 4 + 3. The yellow part is 4 by 3, so multiply.';
          if (c === 4) return 'The ' + mx('4x') + ' is right. Now the yellow part: it is 4 tall and 3 long.';
          if (c === 1 && k === 12) return 'The 12 is right. The blue part is 4 rows of ' + mx('x') + ', so the 4 multiplies the ' + mx('x') + ' too.';
          return 'The blue part is 4 rows of ' + mx('x') + '. The first box is how many ' + mx('x') + ' that makes.';
        },
        win: () => mx('4(x + 3) = 4x + 12') + '. The 4 multiplies both the ' + mx('x') + ' and the 3: the areas are now written inside the rectangle.',
        won() { bl.mark('good'); bl.lock(); p1.reveal(); },
        solve() { bl.set([4, 12]); }
      };
    }
  }
},

/* 4: collecting with signs, constant goes below zero */ {
  from: LT,
  prompt: 'Simplify ' + mx('5x + 3 − 2x − 7') + '.',
  sub: 'Combine the like terms. Type your answer.',
  why: () => whyTerms([[mx('x') + ' terms', ['5x', '-2x'], '3x', 'v'], ['Numbers', ['+3', '-7'], '-4', 'n']]) +
    wl('Each term keeps the sign in front of it: ' + mx('5x − 2x = 3x') + ' and 3 − 7 = −4.', 'So ' + mx('5x + 3 − 2x − 7 = 3x − 4') + '.'),
  build: simpCard({
    expr: '5x + 3 - 2x - 7', ans: '3x - 4',
    wrong: [
      [{ x: 7, '': -4 }, 'The ' + mx('2x') + ' has a minus in front of it: ' + mx('5x − 2x') + ', not ' + mx('5x + 2x') + '.'],
      [{ x: 3, '': 4 }, '3 − 7: you have 3 and take away 7. That is more than you have, so the number goes below zero.'],
      [{ x: 3, '': 10 }, 'The 7 has a minus in front of it: 3 − 7, not 3 + 7.'],
      [{ x: 3, '': -10 }, 'The 3 has a plus in front of it. The numbers are +3 and −7. What is 3 − 7?'],
      [{ x: 7, '': 10 }, 'Both minus signs went missing. The terms are ' + mx('5x, +3, -2x') + ' and −7.'],
      [{ x: 7, '': 4 }, 'Look at the sign in front of each term. The terms are ' + mx('5x, +3, -2x') + ' and −7.'],
      [{ x: -1 }, 'The 3 and the 7 have no letter, so they can’t join the ' + mx('x') + ' terms. Loose marbles are not bags.'],
      [{ '': -1 }, 'The ' + mx('x') + ' terms and the plain numbers are unlike terms. Keep them as two separate terms.']
    ],
    win: () => mx('5x − 2x = 3x') + ' and 3 − 7 = −4, so the answer is ' + mx('3x − 4') + '. The minus signs belong to the ' + mx('2x') + ' and the 7.'
  })
},

/* 5: expanding with a subtraction */ {
  from: AM,
  prompt: 'Expand ' + mx('3(2x − 5)') + '.',
  sub: 'The blue length is ' + mx('2x') + ' with 5 cut off the end.',
  why: () => whyArea(3, [{ w: 7, kind: 'v', top: '2x - 5', area: '6x - 15' }, { w: 5, kind: 'c', top: '5', area: '15' }], { bot: '2x' }) +
    wl('Whole rectangle: 3 × ' + mx('2x = 6x') + '. Strip cut off: 3 × 5 = 15.', 'What is left is ' + mx('3(2x − 5) = 6x − 15') + '.'),
  build(stage, ctl, ctx) {
    let solved = false;
    const am = makeArea(stage, { maxLen: 12, maxA: 3 });
    const bl = makeBlanks(ctl, mx('3(2x − 5) = {}x − {}'), ctx);
    function draw() {
      am.draw(layCut(3, '3', 12, 5, { lab: mx('2x'), keepLab: mx('2x − 5'), cutLab: '5', keep: solved ? mx('6x − 15') : '?', cut: solved ? '15' : '?', ticks: [6] }));
    }
    draw();
    return {
      check() {
        const [c, k] = bl.vals();
        if (isNaN(c) || isNaN(k)) { bl.mark('bad'); return 'Type a whole number in each box.'; }
        if (c === 6 && k === 15) return true;
        bl.mark('bad');
        if (c === 6 && k < 0) return SIGN;
        if (c === 6 && k === 5) return 'You multiplied the ' + mx('2x') + ' by 3 but not the 5. The strip cut off is 3 tall and 5 long, so its area is 3 × 5, not 5.';
        if (c === 6 && k === 8) return '8 is 3 + 5. The strip cut off is 3 by 5, so multiply.';
        if (c === 6) return 'The ' + mx('6x') + ' is right. Now find the area of the strip cut off: it is 3 tall and 5 long.';
        if (c === 5) return '5 is 3 + 2. The whole rectangle is 3 rows of ' + mx('2x') + ', so multiply: 3 × ' + mx('2x') + '.';
        if (c === 3) return 'The whole length is ' + mx('2x') + ', not ' + mx('x') + '. Three rows of ' + mx('2x') + ' make how many ' + mx('x') + '?';
        return 'Start with the whole rectangle, before the cut. It is 3 by ' + mx('2x') + '. How many ' + mx('x') + ' is that?';
      },
      win: () => mx('3(2x − 5) = 6x − 15') + ': the whole rectangle, 3 × ' + mx('2x = 6x') + ', minus the 3 by 5 strip.',
      won() { solved = true; bl.mark('good'); bl.lock(); draw(); },
      solve() { bl.set([6, 15]); }
    };
  }
},

/* 6: taking away like terms on the mat (2x is two bags, y is one purple bag) */ {
  from: LT,
  prompt: 'This mat shows ' + mx('4x + 2y + 3') + '. Take away ' + mx('2x + y') + '.',
  sub: 'Tap things on the mat to take them off.',
  why: () => whyBags([{ k: 'x', inside: 3 }, { k: 'x', inside: 3 }, { k: 'x', inside: 3, off: true }, { k: 'x', inside: 3, off: true }, { k: 'y', inside: 2 }, { k: 'y', inside: 2, off: true }, { k: 'm' }, { k: 'm' }, { k: 'm' }]) +
    wl(mx('4x − 2x = 2x') + ' and ' + mx('2y − y = y') + '. The 3 loose marbles stay.',
       'Try ' + mx('x = 3') + ', ' + mx('y = 2') + ': 19 marbles take away 8 leaves 11, and ' + mx('2x + y + 3') + ' is 6 + 2 + 3 = 11.'),
  build(stage, ctl, ctx) {
    let bx = 4, by = 2, loose = 3, locked = false;
    const mat = h('<div class="mat tall"></div>'), live = h('<div class="live"></div>');
    stage.append(mat, live);
    const reset = h('<div class="tray"><button type="button" class="linkbtn">Put everything back</button></div>');
    ctl.append(reset);
    $('button', reset).onclick = () => { if (locked) return; bx = 4; by = 2; loose = 3; draw(); ctx.touch(false); };
    const bagBtn = (kind, take) => {
      const b = h('<button type="button" class="it mbag" aria-label="' + (kind === 'x' ? 'Blue' : 'Purple') + ' bag, tap to take it off">' + bagSvg(kind) + '</button>');
      b.onclick = () => { if (locked) return; take(); draw(); ctx.touch(true); };
      return b;
    };
    function draw() {
      mat.replaceChildren();
      for (let i = 0; i < bx; i++) mat.append(bagBtn('x', () => { bx--; }));
      for (let i = 0; i < by; i++) mat.append(bagBtn('y', () => { by--; }));
      if (loose) {
        const g = h('<div class="mbs"></div>');
        for (let i = 0; i < loose; i++) {
          const m = h('<button type="button" class="it mbit" aria-label="Marble, tap to take it off">' + SVG_MARBLE + '</button>');
          m.onclick = () => { if (locked) return; loose--; draw(); ctx.touch(true); };
          g.append(m);
        }
        mat.append(g);
      }
      if (!bx && !by && !loose) mat.append(h('<span class="mat-empty">The mat is empty</span>'));
      const parts = [];
      if (bx) parts.push((bx === 1 ? '' : bx) + 'x');
      if (by) parts.push((by === 1 ? '' : by) + 'y');
      if (loose) parts.push(String(loose));
      live.innerHTML = '<span class="lab">The mat shows</span>' + mx(parts.join(' + ') || '0');
    }
    draw();
    return {
      check() {
        const tx = 4 - bx, ty = 2 - by;
        if (tx === 2 && ty === 1 && loose === 3) return true;
        if (loose < 3 && tx === 0 && ty === 0) return mx('2x') + ' means 2 blue bags, each holding ' + mx('x') + ' marbles. It isn’t 2 loose marbles. Put the marbles back and take away bags.';
        if (loose < 3) return 'There is no plain number in ' + mx('2x + y') + ', so no loose marbles come off. Put the marbles back.';
        if (tx === 3 && ty === 0) return 'You took 3 blue bags. ' + mx('2x + y') + ' is not ' + mx('3x') + ': the ' + mx('y') + ' is a purple bag, a different kind.';
        if (tx !== 2) return 'You have taken away ' + plural(tx, 'blue bag') + '. ' + mx('2x') + ' is 2 blue bags.';
        if (ty === 0) return 'The blue bags are right. ' + mx('y') + ' on its own means ' + mx('1y') + ': take away one purple bag too.';
        return 'You took both purple bags. ' + mx('y') + ' on its own means ' + mx('1y') + ', which is one purple bag.';
      },
      win: () => 'Taking ' + mx('2x') + ' from ' + mx('4x') + ' leaves ' + mx('2x') + '. Taking ' + mx('y') + ' from ' + mx('2y') + ' leaves ' + mx('y') + '. The 3 marbles stay, so the mat shows ' + mx('2x + y + 3') + '.',
      won() { locked = true; },
      solve() { bx = 2; by = 1; loose = 3; draw(); }
    };
  }
},

/* 7: factorising with the highest common factor */ {
  from: AM,
  prompt: 'This rectangle has area ' + mx('8x + 12') + '. Drag its height to factorise it.',
  sub: 'The areas stay the same, so the lengths change. Find the biggest height that gives no decimals in the lengths.',
  why: () => whyArea(4, [{ w: 4, kind: 'v', top: '2x', area: '8x' }, { w: 3, kind: 'n', top: '3', area: '12' }]) +
    wl('4 is the biggest number that divides both 8 and 12, so it is the height.', mx('8x') + ' ÷ 4 = ' + mx('2x') + ' and 12 ÷ 4 = 3, so ' + mx('8x + 12 = 4(2x + 3)') + '.'),
  build(stage, ctl, ctx) {
    const X = 1;
    let a = 1;
    const am = makeArea(stage, { maxLen: 20, maxA: 6, h: 10, drag: { a: [1, 6] }, onDrag(k, v) { a = v; draw(); ctx.touch(true); } });
    const live = h('<div class="live"></div>');
    stage.append(live);
    function draw() {
      const c = 8 / a, k = 12 / a;
      am.draw(lay(a, String(a), [{ len: c * X, kind: 'var', lab: mx(term(c)), area: mx('8x') }, { len: k, kind: 'num', lab: dec(k), area: '12' }], { grid: false }));
      live.innerHTML = mx('8x + 12 = ' + a + '(' + term(c) + ' + ' + dec(k) + ')');
    }
    draw();
    const why = {
      1: 'Height 1 always works, because ' + mx('8x + 12 = 1(8x + 12)') + '. That doesn’t simplify anything. Look for a bigger height.',
      2: mx('2(4x + 6)') + ' has no decimals, but 4 and 6 still share a factor. A bigger height also works.',
      3: 'The blue length is ' + mx('2.67x') + ', a decimal. 3 divides 12 but it does not divide 8.',
      5: 'The lengths are ' + mx('1.6x') + ' and 2.4. 5 does not divide 8 or 12.',
      6: 'The yellow length is 2, but the blue length is ' + mx('1.33x') + '. 6 divides 12 but it does not divide 8.'
    };
    return {
      check() { return a === 4 ? true : why[a]; },
      win: () => 'Height 4 gives lengths ' + mx('2x') + ' and 3, so ' + mx('8x + 12 = 4(2x + 3)') + '. 4 is the highest common factor of 8 and 12.',
      won() { am.lock(); },
      solve() { a = 4; draw(); }
    };
  }
},

/* 8: two letters, a negative term, and y meaning 1y */ {
  from: LT,
  prompt: 'Simplify ' + mx('2x + 5y − 6x − y') + '.',
  sub: 'A term can end up with a negative number in front.',
  why: () => whyTerms([[mx('x') + ' terms', ['2x', '-6x'], '-4x', 'v'], [mx('y') + ' terms', ['+5y', '-y'], '4y', 'y']]) +
    wl(mx('2x − 6x = -4x') + ', and ' + mx('-y') + ' means ' + mx('-1y') + ', so ' + mx('5y − y = 4y') + '.', 'So ' + mx('2x + 5y − 6x − y = -4x + 4y') + '.'),
  build: simpCard({
    expr: '2x + 5y - 6x - y', ans: '-4x + 4y',
    wrong: [
      [{ x: 8, y: 4 }, 'The ' + mx('6x') + ' has a minus in front of it: ' + mx('2x − 6x') + ', not ' + mx('2x + 6x') + '.'],
      [{ x: 4, y: 4 }, mx('2x − 6x') + ': you have 2 and take away 6. That is more than you have, so the ' + mx('x') + ' term goes below zero.'],
      [{ x: -4, y: 6 }, 'The last ' + mx('y') + ' has a minus in front of it: ' + mx('5y − y') + ', not ' + mx('5y + y') + '.'],
      [{ x: -4, y: 5 }, mx('-y') + ' means ' + mx('-1y') + ': one purple bag taken away. ' + mx('5y − 1y') + ' is not ' + mx('5y') + '.'],
      [{ x: 8, y: 6 }, 'Both minus signs went missing. The terms are ' + mx('2x, +5y, -6x') + ' and ' + mx('-y') + '.'],
      [{ x: 4, y: 6 }, 'Look at the sign in front of each term. The terms are ' + mx('2x, +5y, -6x') + ' and ' + mx('-y') + '.'],
      [{ x: -4, y: -4 }, 'The ' + mx('5y') + ' has a plus in front of it: ' + mx('5y − y') + '. Take 1 away from 5. Is that below zero?'],
      [{ x: 4, y: -4 }, 'Both signs are the wrong way round. Work out ' + mx('2x − 6x') + ' and ' + mx('5y − y') + ' again. Which one goes below zero?']
    ],
    win: () => mx('2x − 6x = -4x') + ' and ' + mx('5y − y = 4y') + ', so the answer is ' + mx('-4x + 4y') + '. Writing ' + mx('4y − 4x') + ' is just as good: each term keeps its sign.'
  })
},

/* 9: expanded and factorised forms of the same expression */ {
  from: AM,
  prompt: 'Tap every expression that equals ' + mx('6x + 12') + '.',
  sub: 'Expand each one to check.',
  why: () => '<div class="w2">' + whyArea(6, [{ w: 4, kind: 'v', top: 'x', area: '6x' }, { w: 3, kind: 'n', top: '2', area: '12' }], { W: 150 }) +
    whyArea(3, [{ w: 4, kind: 'v', top: '2x', area: '6x' }, { w: 3, kind: 'n', top: '4', area: '12' }], { H: 32 }) + '</div>' +
    wl(mx('6(x + 2)') + ' and ' + mx('3(2x + 4)') + ' are two rectangles with the same areas inside: ' + mx('6x') + ' and 12.',
       'In ' + mx('6(x + 12)') + ' the 6 multiplies the 12 as well, which gives ' + mx('6x + 72') + '.'),
  build(stage, ctl, ctx) {
    stage.hidden = true;
    const ch = makeChoices(ctl, [mx('6(x + 2)'), mx('6(x + 12)'), mx('3(2x + 4)'), mx('2(3x + 12)')], ctx, true);
    return {
      check() {
        const s = ch.sel(), has = i => s.includes(i);
        const bad = [1, 3].filter(has);
        if (!bad.length && has(0) && has(2)) return true;
        bad.forEach(i => ch.mark(i, 'bad'));
        const msg = [];
        if (has(1)) msg.push(mx('6(x + 12)') + ' expands to ' + mx('6x + 72') + '. The 6 multiplies the 12 too, so the bracket needs 12 ÷ 6 = 2.');
        if (has(3)) msg.push(mx('2(3x + 12)') + ' expands to ' + mx('6x + 24') + '. The 2 multiplies the 12 too.');
        if (msg.length) return msg.join(' ');
        if (!has(0)) return 'Expand ' + mx('6(x + 2)') + ' yourself: 6 × ' + mx('x') + ' and 6 × 2. Does it match?';
        return 'Expand ' + mx('3(2x + 4)') + ' yourself: 3 × ' + mx('2x') + ' and 3 × 4. Does it match?';
      },
      win: () => mx('6(x + 2)') + ' and ' + mx('3(2x + 4)') + ' both equal ' + mx('6x + 12') + '. ' + mx('6(x + 2)') + ' uses the highest common factor, 6, so it is fully factorised.',
      won() { ch.mark(0, 'good'); ch.mark(2, 'good'); ch.lock(); },
      solve() { ch.set([0, 2]); }
    };
  }
}
];

const SECTIONS = [[0, 'Level Check']];
