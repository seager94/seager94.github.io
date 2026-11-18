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
  const row = h('<div class="slider' + (name === 'y' ? ' y' : '') + '"><label for="sl-' + name + '">' + mx(name) + '<span class="m"> = <span class="val">' + value + '</span></span></label>' +
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

/* ---------- like terms: helpers ---------- */
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
// Two sliders side by side, or stacked on narrow screens (side by side they are wider than a phone).
const sliderHost = ctl => { if (matchMedia('(max-width:34rem)').matches) return ctl; const w = h('<div class="sl2"></div>'); ctl.append(w); return w; };

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

// Sort chips into labelled boxes. Items whose bin is 'tray' are decoys that should stay out.
function sorter(cfg) {
  return function (stage, ctl, ctx) {
    const items = cfg.items, place = items.map(() => 'tray');
    let sel = null, locked = false;
    const bins = h('<div class="bins' + (cfg.cls ? ' ' + cfg.cls : '') + '">' + cfg.bins.map(b => '<div class="bin" data-drop="' + b[0] + '"><button type="button" class="bin-h">' + b[1] + '</button><div class="bin-c"></div></div>').join('') + '</div>');
    const tray = h('<div class="chips" data-drop="tray"></div>');
    stage.append(bins); ctl.append(tray);
    const hostOf = w => w === 'tray' ? tray : $('.bin[data-drop="' + w + '"] .bin-c', bins);
    const chips = items.map((it, i) => {
      const c = h('<button type="button" class="chip" aria-label="' + it.e.replace(/-/g, 'minus ') + '">' + mx(it.e) + '</button>');
      c.onclick = () => { if (locked) return; sel = sel === i ? null : i; draw(); };
      draggable(c, { accept: cfg.bins.map(b => b[0]).concat('tray'), onDrop: t => move(i, t.getAttribute('data-drop')) });
      return c;
    });
    function move(i, where) {
      if (locked) return;
      place[i] = where; sel = null;
      chips.forEach(c => c.classList.remove('bad'));
      draw(); ctx.touch(cfg.ready(place));
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
        return cfg.why(wrong, place);
      },
      win: cfg.win,
      won() { locked = true; chips.forEach((c, i) => { c.classList.remove('sel'); if (place[i] !== 'tray') c.classList.add('good'); }); },
      solve() { items.forEach((it, i) => { place[i] = it.bin; }); sel = null; chips.forEach(c => c.classList.remove('bad')); draw(); }
    };
  };
}

const SIGN_ITEMS = [
  { e: '4a', bin: 'a' }, { e: '+a', bin: 'tray' }, { e: '+3', bin: 'k' },
  { e: '-a', bin: 'a' }, { e: '+5', bin: 'tray' }, { e: '-5', bin: 'k' }
];
const LIKE_ITEMS = [
  { e: '3xy', bin: 'xy' }, { e: '-x', bin: 'x' }, { e: '10', bin: 'k' }, { e: 'y', bin: 'y' },
  { e: '-yx', bin: 'xy' }, { e: '7x', bin: 'x' }, { e: '-6', bin: 'k' }, { e: '-4y', bin: 'y' }
];

/* ---------- cards ---------- */

const cards = [

/* 1 */ {
  prompt: 'Each blue bag holds ' + mx('x') + ' marbles. Each purple bag holds ' + mx('y') + ' marbles. Make the mat hold 10 marbles.',
  sub: 'The bags are see-through. Use the two sliders.',
  build(stage, ctl, ctx) {
    let x = 1, y = 2;
    const mat = h('<div class="mat"></div>'), live = h('<div class="live"></div>');
    stage.append(mat, live);
    function draw() {
      mat.innerHTML = '<div class="it bagit">' + bagSvg('x', x) + '</div><div class="it bagit">' + bagSvg('y', y) + '</div>' + marbles(2);
      live.innerHTML = mx('x + y + 2') + '<small>' + x + ' + ' + y + ' + 2 = <b>' + (x + y + 2) + '</b> marbles</small>';
    }
    const sl2 = sliderHost(ctl);
    const sx = makeSlider(sl2, 'x', 0, 10, x, v => { x = v; draw(); ctx.touch(true); });
    const sy = makeSlider(sl2, 'y', 0, 10, y, v => { y = v; draw(); ctx.touch(true); });
    draw();
    return {
      check() {
        const t = x + y + 2;
        return t === 10 ? true : 'The mat holds ' + x + ' + ' + y + ' + 2 = ' + t + ' marbles. You need 10, so the bags need ' + (t < 10 ? 'more' : 'fewer') + ' marbles.';
      },
      win() {
        const o = x === 3 ? [6, 2] : [3, 5];
        return mx('x = ' + x) + ' and ' + mx('y = ' + y) + ' works. So does ' + mx('x = ' + o[0]) + ', ' + mx('y = ' + o[1]) + '. ' +
          mx('x') + ' and ' + mx('y') + ' are two separate numbers. They can be equal, but they don’t have to be. That is why the bags are different colours.';
      },
      solve() { sx.set(3); sy.set(5); }
    };
  }
},

/* 2 */ {
  prompt: 'This mat shows ' + mx('2x + 3y + x + 2') + '. Put things of the same kind together.',
  sub: 'Drag each thing into a box, or tap it and then tap a box. Use one box for each kind.',
  build(stage, ctl, ctx) {
    const kinds = ['x', 'x', 'y', 'y', 'y', 'x', 'm', 'm'];
    const NAME = { x: 'blue bags', y: 'purple bags', m: 'loose marbles' };
    const place = kinds.map(() => 'tray');
    let sel = null, locked = false;
    const tray = h('<div class="mat droppable low" data-drop="tray"></div>');
    const grp = h('<div class="grp3">' + [0, 1, 2].map(g => '<div class="bin" data-drop="g' + g + '"><div class="bin-c"></div><div class="glab"></div></div>').join('') + '</div>');
    const live = h('<div class="live"></div>');
    stage.append(tray, grp, live);
    const hostOf = w => w === 'tray' ? tray : $('[data-drop="' + w + '"] .bin-c', grp);
    const items = kinds.map((k, i) => {
      const b = h('<button type="button" class="it ' + (k === 'm' ? 'smb' : 'sbag') + '" aria-label="' + (k === 'm' ? 'Loose marble' : k === 'x' ? 'Blue bag' : 'Purple bag') + '">' + (k === 'm' ? SVG_MARBLE : bagSvg(k)) + '</button>');
      b.onclick = () => { if (locked) return; sel = sel === i ? null : i; draw(); };
      draggable(b, { accept: ['tray', 'g0', 'g1', 'g2'], ghost: () => k === 'm' ? SVG_MARBLE : bagSvg(k), onDrop: t => move(i, t.getAttribute('data-drop')) });
      return b;
    });
    function move(i, where) {
      if (locked) return;
      place[i] = where; sel = null;
      items.forEach(b => b.classList.remove('bad'));
      draw(); ctx.touch(place.every(p => p !== 'tray'));
    }
    const label = g => {
      const n = k => kinds.filter((kk, i) => kk === k && place[i] === g).length;
      const parts = [];
      if (n('x')) parts.push((n('x') === 1 ? '' : n('x')) + 'x');
      if (n('y')) parts.push((n('y') === 1 ? '' : n('y')) + 'y');
      if (n('m')) parts.push(String(n('m')));
      return parts.join(' + ');
    };
    function draw() {
      items.forEach((b, i) => { const host = hostOf(place[i]); if (b.parentNode !== host) host.append(b); b.classList.toggle('sel', sel === i); });
      const empty = $('.mat-empty', tray), all = place.every(p => p !== 'tray');
      if (all && !empty) tray.append(h('<span class="mat-empty">Everything is in a box</span>'));
      if (!all && empty) empty.remove();
      const labs = [0, 1, 2].map(g => label('g' + g));
      grp.querySelectorAll('.glab').forEach((el, g) => { el.innerHTML = labs[g] ? mx(labs[g]) : ''; });
      live.innerHTML = all ? '<span class="lab">Your boxes show</span>' + mx(labs.filter(Boolean).join(' + ')) : '';
    }
    grp.querySelectorAll('.bin').forEach(b => b.addEventListener('click', e => { if (!e.target.closest('.it') && sel != null) move(sel, b.getAttribute('data-drop')); }));
    tray.addEventListener('click', e => { if (!e.target.closest('.it') && sel != null) move(sel, 'tray'); });
    draw();
    return {
      check() {
        for (const g of ['g0', 'g1', 'g2']) {
          const ks = new Set(kinds.filter((k, i) => place[i] === g));
          if (ks.size < 2) continue;
          kinds.forEach((k, i) => { if (place[i] === g) items[i].classList.add('bad'); });
          if (ks.has('x') && ks.has('y')) return 'Blue and purple bags can hold different numbers.';
          return 'A marble is just 1. A bag holds an unknown number.';
        }
        const split = ['x', 'y', 'm'].find(k => new Set(kinds.map((kk, i) => kk === k ? place[i] : null).filter(Boolean)).size > 1);
        if (!split) return true;
        kinds.forEach((k, i) => { if (k === split) items[i].classList.add('bad'); });
        return 'The ' + NAME[split] + ' are split across two boxes. Put every thing of one kind in the same box.';
      },
      win: () => 'The mat is ' + mx('3x + 3y + 2') + '. ' + mx('2x + x = 3x') + ' because every blue bag holds the same number. Terms like these, with the same letter, are called like terms. The purple bags and the marbles can’t join them.',
      won() { locked = true; sel = null; draw(); },
      solve() { kinds.forEach((k, i) => { place[i] = k === 'x' ? 'g0' : k === 'y' ? 'g1' : 'g2'; }); sel = null; items.forEach(b => b.classList.remove('bad')); draw(); }
    };
  }
},

/* 3 */ {
  prompt: 'Jo says ' + mx('2x + 3') + ' is the same as ' + mx('5x') + '. Drag the slider. When are they equal?',
  build(stage, ctl, ctx) {
    let x = 3;
    const duo = h('<div class="duo"><div><div class="mat l"></div><div class="live ll"></div></div><div><div class="mat r"></div><div class="live rl"></div></div></div>');
    const note = h('<div class="live"></div>');
    stage.append(duo, note);
    const bags = n => ('<div class="it sbag">' + bagSvg('x', x) + '</div>').repeat(n);
    function draw() {
      $('.l', duo).innerHTML = bags(2) + marbles(3);
      $('.r', duo).innerHTML = bags(5);
      $('.ll', duo).innerHTML = mx('2x + 3') + '<small class="in">= 2 × ' + x + ' + 3 = <b>' + (2 * x + 3) + '</b></small>';
      $('.rl', duo).innerHTML = mx('5x') + '<small class="in">= 5 × ' + x + ' = <b>' + 5 * x + '</b></small>';
      const eq = 2 * x + 3 === 5 * x;
      note.innerHTML = 'When ' + mx('x = ' + x) + ': <b class="' + (eq ? 'ok' : 'no') + '">' + (eq ? 'equal' : 'not equal') + '</b>';
    }
    makeSlider(ctl, 'x', 0, 10, x, v => { x = v; draw(); });
    const ch = makeChoices(ctl, ['For every value of ' + mx('x'), 'Only when ' + mx('x = 1'), 'For no value of ' + mx('x'), 'Only when ' + mx('x = 0')], ctx);
    $('.choices', ctl).classList.add('four');
    draw();
    const why = [
      'Try ' + mx('x = 3') + ': ' + mx('2x + 3') + ' is 9, but ' + mx('5x') + ' is 15. They don’t match there.',
      '',
      'Drag the slider through every value from 0 to 10. Watch for the word “equal”.',
      'At ' + mx('x = 0') + ', ' + mx('2x + 3') + ' is 3 but ' + mx('5x') + ' is 0.'
    ];
    return {
      check() { const s = ch.sel()[0]; if (s === 1) return true; ch.mark(s, 'bad'); return why[s]; },
      win: () => 'Only at ' + mx('x = 1') + ', when a bag happens to hold 1 marble. Expressions that are the same must match for every value, so ' + mx('2x + 3') + ' is not ' + mx('5x') + '. The 3 loose marbles are not bags, and ' + mx('2x + 3') + ' can’t be made shorter.',
      won() { ch.mark(1, 'good'); ch.lock(); },
      solve() { ch.set([1]); }
    };
  }
},

/* 4 */ {
  prompt: 'Lee says ' + mx('2x + 3y = 5xy') + '. What is ' + mx('2x + 3y') + ' in its simplest form?',
  sub: mx('5xy') + ' means 5 × ' + mx('x') + ' × ' + mx('y') + '. Use the sliders to test.',
  build(stage, ctl, ctx) {
    let x = 1, y = 1;
    const mat = h('<div class="mat"></div>'), duo = h('<div class="duo"><div class="live l"></div><div class="live r"></div></div>');
    stage.append(mat, duo);
    function draw() {
      mat.innerHTML = ('<div class="it sbag">' + bagSvg('x', x) + '</div>').repeat(2) + ('<div class="it sbag">' + bagSvg('y', y) + '</div>').repeat(3);
      $('.l', duo).innerHTML = mx('2x + 3y') + '<small class="in">= 2 × ' + x + ' + 3 × ' + y + ' = <b>' + (2 * x + 3 * y) + '</b></small>';
      $('.r', duo).innerHTML = mx('5xy') + '<small class="in">= 5 × ' + x + ' × ' + y + ' = <b>' + 5 * x * y + '</b></small>';
    }
    const sl2 = sliderHost(ctl);
    makeSlider(sl2, 'x', 1, 6, x, v => { x = v; draw(); });
    makeSlider(sl2, 'y', 1, 6, y, v => { y = v; draw(); });
    const ch = makeChoices(ctl, [mx('5xy'), mx('5x'), mx('6xy'), mx('2x + 3y') + ' <small>It can’t be made shorter.</small>'], ctx);
    $('.choices', ctl).classList.add('four');
    draw();
    return {
      check() {
        const s = ch.sel()[0];
        if (s === 3) return true;
        ch.mark(s, 'bad');
        if (s === 0) {
          const p = 2 * x + 3 * y !== 5 * x * y ? { x, y } : { x: 2, y: 3 };
          return 'They match at ' + at({ x: 1, y: 1 }, ['x', 'y']) + ', but at ' + at(p, ['x', 'y']) + ', ' + mx('2x + 3y') + ' is ' + (2 * p.x + 3 * p.y) + ' and ' + mx('5xy') + ' is ' + 5 * p.x * p.y + '. Adding bags never multiplies them.';
        }
        if (s === 1) return mx('5x') + ' counts the purple bags as blue ones. At ' + at({ x: 2, y: 5 }, ['x', 'y']) + ', ' + mx('2x + 3y') + ' is 19, but ' + mx('5x') + ' is 10.';
        return mx('6xy') + ' multiplies 2 by 3 and ' + mx('x') + ' by ' + mx('y') + '. At ' + at({ x: 2, y: 3 }, ['x', 'y']) + ', ' + mx('2x + 3y') + ' is 13, but ' + mx('6xy') + ' is 36.';
      },
      win: () => mx('2x + 3y') + ' is already as short as it gets. Blue and purple bags can hold different numbers, so ' + mx('2x') + ' and ' + mx('3y') + ' are unlike terms. ' + mx('5xy') + ' only matches for a few lucky values.',
      won() { ch.mark(3, 'good'); ch.lock(); },
      solve() { ch.set([3]); }
    };
  }
},

/* 5 */ {
  prompt: 'This mat shows ' + mx('5x + 4') + '. Take away ' + mx('2x') + '.',
  sub: 'Tap things on the mat to take them off.',
  build(stage, ctl, ctx) {
    let bags = 5, loose = 4, locked = false;
    const mat = h('<div class="mat"></div>'), live = h('<div class="live"></div>');
    stage.append(mat, live);
    const reset = h('<div class="tray"><button type="button" class="linkbtn">Put everything back</button></div>');
    ctl.append(reset);
    $('button', reset).onclick = () => { if (locked) return; bags = 5; loose = 4; draw(); ctx.touch(false); };
    function draw() {
      mat.replaceChildren();
      for (let i = 0; i < bags; i++) {
        const b = h('<button type="button" class="it bagit" aria-label="Blue bag, tap to take it off">' + bagSvg('x') + '</button>');
        b.onclick = () => { if (locked) return; bags--; draw(); ctx.touch(true); };
        mat.append(b);
      }
      if (loose) {
        const g = h('<div class="mbs"></div>');
        for (let i = 0; i < loose; i++) {
          const m = h('<button type="button" class="it mbit" aria-label="Marble, tap to take it off">' + SVG_MARBLE + '</button>');
          m.onclick = () => { if (locked) return; loose--; draw(); ctx.touch(true); };
          g.append(m);
        }
        mat.append(g);
      }
      if (!bags && !loose) mat.append(h('<span class="mat-empty">The mat is empty</span>'));
      const parts = [];
      if (bags) parts.push((bags === 1 ? '' : bags) + 'x');
      if (loose) parts.push(String(loose));
      live.innerHTML = '<span class="lab">The mat shows</span>' + mx(parts.join(' + ') || '0');
    }
    draw();
    return {
      check() {
        if (bags === 3 && loose === 4) return true;
        if (loose < 4 && bags === 5) return mx('2x') + ' means 2 bags, each holding ' + mx('x') + ' marbles. It isn’t 2 loose marbles. Put the marbles back and take away bags.';
        if (loose < 4) return 'The loose marbles aren’t part of ' + mx('2x') + '. Only bags should come off. Put the marbles back.';
        if (bags > 3) return 'You have taken away ' + plural(5 - bags, 'bag') + '. ' + mx('2x') + ' is 2 bags.';
        return 'You have taken away ' + (5 - bags) + ' bags. ' + mx('2x') + ' is only 2 bags.';
      },
      win: () => mx('5x + 4 − 2x = 3x + 4') + '. Five bags take away two bags leaves three bags, whatever ' + mx('x') + ' is. The 4 marbles are a different kind, so they stay as they are.',
      won() { locked = true; },
      solve() { bags = 3; loose = 4; draw(); }
    };
  }
},

/* 6 */ {
  prompt: 'Simplify ' + mx('6x + 5 − 4x') + '.',
  sub: 'Combine the like terms. Type your answer.',
  build: simpCard({
    expr: '6x + 5 - 4x', ans: '2x + 5',
    wrong: [
      [{ x: 10, '': 5 }, mx('10x') + ' adds the ' + mx('4x') + ', but there is a minus in front of it: ' + mx('6x − 4x') + '. Six bags take away four bags.'],
      [{ x: 2, '': -5 }, 'The minus belongs to the ' + mx('4x') + ', not the 5. The 5 keeps its plus sign.'],
      [{ x: 6, '': 1 }, 'The ' + mx('-4') + ' is part of the term ' + mx('-4x') + ', so it combines with ' + mx('6x') + ', not with the 5.'],
      [{ x: 7 }, 'The 5 has no letter, so it can’t join the ' + mx('x') + ' terms to make ' + mx('7x') + '. Five loose marbles are not five bags.'],
      [{ '': 7 }, 'The ' + mx('x') + ' terms and the 5 are unlike terms, so they can’t be added to make 7.']
    ],
    win: () => mx('6x − 4x = 2x') + ', and the 5 stays as it is: ' + mx('2x + 5') + '. The minus sign belongs to the ' + mx('4x') + ', so 4 bags are taken away.'
  })
},

/* 7 */ {
  prompt: 'Split ' + mx('4a + 3 − a − 5') + ' into its terms. Each term keeps the sign in front of it.',
  sub: 'Drag each term into a box, or tap it and then tap a box. Two cards are not terms of this expression: leave them out.',
  build: sorter({
    items: SIGN_ITEMS,
    bins: [['a', 'Terms with ' + mx('a')], ['k', 'Number terms']],
    ready: place => place.filter(p => p !== 'tray').length >= 4,
    why(wrong, place) {
      const dec = wrong.find(i => SIGN_ITEMS[i].bin === 'tray');
      if (dec != null) return SIGN_ITEMS[dec].e === '+a'
        ? 'Look at the sign just before the ' + mx('a') + ' on its own. It is a minus, so the term is ' + mx('-a') + ', not ' + mx('+a') + '.'
        : 'Look at the sign just before the 5. It is a minus, so the term is ' + mx('-5') + ', not ' + mx('+5') + '.';
      const left = wrong.find(i => place[i] === 'tray');
      if (left != null) return mx(SIGN_ITEMS[left].e) + ' is a term of the expression too. It needs a box.';
      const it = SIGN_ITEMS[wrong[0]];
      return it.bin === 'a' ? mx(it.e) + ' has the letter ' + mx('a') + ', so it goes with the ' + mx('a') + ' terms.' : mx(it.e) + ' has no letter, so it is a number term.';
    },
    win: () => 'The ' + mx('a') + ' terms are ' + mx('4a') + ' and ' + mx('-a') + '. The number terms are ' + mx('+3') + ' and ' + mx('-5') + '. A sign travels with the term just after it.'
  })
},

/* 8 */ {
  prompt: 'Simplify ' + mx('4a + 3 − a − 5') + '.',
  sub: 'Use the terms you just sorted: ' + mx('4a, +3, -a, -5') + '.',
  build: simpCard({
    expr: '4a + 3 - a - 5', ans: '3a - 2',
    wrong: [
      [{ a: 5, '': -2 }, 'The ' + mx('a') + ' has a minus in front of it. The term is ' + mx('-a') + ', so it is ' + mx('4a − a') + ', not ' + mx('4a + a') + '.'],
      [{ a: 3, '': 8 }, 'The 5 has a minus in front of it: ' + mx('3 − 5') + ', not ' + mx('3 + 5') + '.'],
      [{ a: 3, '': 2 }, 'You have 3 and take away 5. That is more than you have, so the number term goes below zero.'],
      [{ a: 5, '': 8 }, 'Both minus signs went missing. The terms are ' + mx('4a, +3, -a') + ' and ' + mx('-5') + '.'],
      [{ a: 4, '': -2 }, mx('a') + ' on its own means ' + mx('1a') + '. So ' + mx('4a − a') + ' is ' + mx('4a − 1a') + ', not ' + mx('4a') + '.'],
      [{ a: 1 }, 'The ' + mx('a') + ' terms and the number terms are unlike terms, so they can’t be squashed into one term.']
    ],
    win: () => mx('4a − a = 3a') + ', because ' + mx('a') + ' means ' + mx('1a') + '. And ' + mx('3 − 5 = -2') + '. So ' + mx('4a + 3 − a − 5 = 3a − 2') + '.'
  })
},

/* 9 */ {
  prompt: 'Simplify ' + mx('3x − 2y − 5x + 6y') + '.',
  sub: 'A term can end up with a negative number in front.',
  build: simpCard({
    expr: '3x - 2y - 5x + 6y', ans: '-2x + 4y',
    wrong: [
      [{ x: 8, y: 4 }, 'The ' + mx('5x') + ' has a minus in front of it: ' + mx('3x − 5x') + ', not ' + mx('3x + 5x') + '.'],
      [{ x: 2, y: 4 }, mx('3x − 5x') + ': you have 3 and take away 5. That is more than you have, so the ' + mx('x') + ' term goes below zero.'],
      [{ x: -2, y: 8 }, 'The ' + mx('2y') + ' has a minus in front of it: ' + mx('-2y + 6y') + ', not ' + mx('2y + 6y') + '.'],
      [{ x: -2, y: -4 }, 'The ' + mx('6y') + ' has a plus in front of it: ' + mx('-2y + 6y') + '. Take away 2 and add 6. Is that below zero?'],
      [{ x: 8, y: 8 }, 'Both minus signs went missing. The terms are ' + mx('3x, -2y, -5x') + ' and ' + mx('+6y') + '.'],
      [{ x: 2, y: -4 }, 'Both signs are the wrong way round. Work out ' + mx('3x − 5x') + ' and ' + mx('-2y + 6y') + ' again. Which one goes below zero?']
    ],
    win: () => mx('3x − 5x = -2x') + ' and ' + mx('-2y + 6y = 4y') + ', so the answer is ' + mx('-2x + 4y') + '. Writing ' + mx('4y − 2x') + ' is just as good: each term keeps its sign.'
  })
},

/* 10 */ {
  prompt: 'Which expression is equivalent to ' + mx('5x + 2y − 3x + y') + '?',
  sub: 'Each card shows its value for the slider settings. Try several settings.',
  build(stage, ctl, ctx) {
    let x = 1, y = 1;
    const ORIG = '5x + 2y - 3x + y', OPTS = ['2x + 3y', '8x + 3y', '2x + 2y', '5xy'];
    const val = (s, p) => evalT(parseLin(s), p);
    const live = h('<div class="live big"></div>');
    stage.append(live);
    const sl2 = sliderHost(ctl);
    makeSlider(sl2, 'x', 1, 10, x, v => { x = v; draw(); });
    makeSlider(sl2, 'y', 1, 10, y, v => { y = v; draw(); });
    const ch = makeChoices(ctl, OPTS.map(o => mx(o) + '<small class="cv"></small>'), ctx);
    $('.choices', ctl).classList.add('four');
    const cvs = ctl.querySelectorAll('.cv');
    function draw() {
      live.innerHTML = mx(ORIG) + '<small>= <b>' + val(ORIG, { x, y }) + '</b> when ' + at({ x, y }, ['x', 'y']) + '</small>';
      cvs.forEach((c, i) => { c.textContent = '= ' + val(OPTS[i], { x, y }); });
    }
    draw();
    const why = ['', mx('8x + 3y') + ' adds the ' + mx('3x') + ', but it has a minus in front: ' + mx('5x − 3x') + ', not ' + mx('5x + 3x') + '. ',
      mx('2x + 2y') + ' forgets the last ' + mx('y') + '. ' + mx('y') + ' on its own means ' + mx('1y') + ', so ' + mx('2y + y') + ' is more than ' + mx('2y') + '. ',
      mx('5xy') + ' adds unlike terms. '];
    return {
      check() {
        const s = ch.sel()[0];
        if (s === 0) return true;
        ch.mark(s, 'bad');
        const p = [{ x, y }].concat(TESTS).find(q => val(ORIG, q) !== val(OPTS[s], q));
        return why[s] + 'At ' + at(p, ['x', 'y']) + ', the original is ' + val(ORIG, p) + ' but ' + mx(OPTS[s]) + ' is ' + val(OPTS[s], p) + '.';
      },
      win: () => mx('2x + 3y') + ' matches at every setting. Sliders can only test some values, but collecting like terms shows why it works for all of them: ' + mx('5x − 3x = 2x') + ' and ' + mx('2y + y = 3y') + '.',
      won() { ch.mark(0, 'good'); ch.lock(); },
      solve() { ch.set([0]); }
    };
  }
},

/* 11 */ {
  prompt: 'Noah simplified ' + mx('4x + 3y − 2x − y') + ' and got ' + mx('2x + 4y') + '. Set the sliders to prove he is wrong.',
  sub: 'Find values of ' + mx('x') + ' and ' + mx('y') + ' where the two give different numbers.',
  build(stage, ctl, ctx) {
    let x = 3, y = 0;
    const ORIG = '4x + 3y - 2x - y', NOAH = '2x + 4y';
    const val = s => evalT(parseLin(s), { x, y });
    const duo = h('<div class="duo"><div class="live l"></div><div class="live r"></div></div>'), note = h('<div class="live"></div>');
    stage.append(duo, note);
    function draw() {
      $('.l', duo).innerHTML = '<span class="lab">Original</span>' + mx(ORIG) + '<small class="in">= <b>' + val(ORIG) + '</b></small>';
      $('.r', duo).innerHTML = '<span class="lab">Noah</span>' + mx(NOAH) + '<small class="in">= <b>' + val(NOAH) + '</b></small>';
      const eq = val(ORIG) === val(NOAH);
      note.innerHTML = 'When ' + at({ x, y }, ['x', 'y']) + ': <b class="' + (eq ? 'ok' : 'no') + '">' + (eq ? 'they match' : 'they don’t match') + '</b>';
    }
    const sl2 = sliderHost(ctl);
    const sx = makeSlider(sl2, 'x', 0, 10, x, v => { x = v; draw(); ctx.touch(true); });
    const sy = makeSlider(sl2, 'y', 0, 10, y, v => { y = v; draw(); ctx.touch(true); });
    draw();
    return {
      check() {
        if (val(ORIG) !== val(NOAH)) return true;
        return 'At ' + at({ x, y }, ['x', 'y']) + ' both give ' + val(ORIG) + '. A match here proves nothing. When ' + mx('y = 0') + ' every ' + mx('y') + ' term is 0, so try changing ' + mx('y') + '.';
      },
      win: () => 'At ' + at({ x, y }, ['x', 'y']) + ' the original is ' + val(ORIG) + ' but Noah’s is ' + val(NOAH) + '. One setting where they differ proves they are not equivalent. Noah dropped the minus on ' + mx('-y') + ': ' + mx('3y − y = 2y') + ', so the answer is ' + mx('2x + 2y') + '.',
      solve() { sx.set(3); sy.set(2); }
    };
  }
},

/* 12 */ {
  prompt: 'Sort the terms. Each one goes with the term it is like.',
  sub: 'Drag each card into a box, or tap it and then tap a box.',
  build: sorter({
    items: LIKE_ITEMS, cls: 'four',
    bins: [['x', 'Like ' + mx('3x')], ['y', 'Like ' + mx('5y')], ['k', 'Like ' + mx('2')], ['xy', 'Like ' + mx('xy')]],
    ready: place => place.every(p => p !== 'tray'),
    why(wrong, place) {
      const i = wrong[0], it = LIKE_ITEMS[i], p = place[i], e = mx(it.e);
      let m;
      if (it.bin === 'xy' && it.e.includes('yx')) m = e + ' means a number times ' + mx('y') + ' times ' + mx('x') + '. That is the same as times ' + mx('x') + ' times ' + mx('y') + ', so ' + mx('yx') + ' is like ' + mx('xy') + '.';
      else if (it.bin === 'xy') m = e + ' has both letters multiplied. That is a different kind from ' + mx('x') + ' alone or ' + mx('y') + ' alone.';
      else if (it.bin === 'k') m = e + ' has no letter, so it goes with the plain numbers.';
      else if (p === 'xy') m = e + ' has only one letter. An ' + mx('xy') + ' term needs both ' + mx('x') + ' and ' + mx('y') + '.';
      else if (p === 'k') m = e + ' has a letter, so its value changes when the letter changes. It isn’t a plain number.';
      else m = e + ' has the letter ' + mx(it.bin) + '. ' + mx('x') + ' and ' + mx('y') + ' can be different numbers, so ' + mx('x') + ' terms and ' + mx('y') + ' terms are unlike.';
      return (wrong.length === 1 ? '1 card is' : wrong.length + ' cards are') + ' in the wrong box. ' + m;
    },
    win: () => 'Like terms have exactly the same letter part. The number and sign in front don’t matter, so ' + mx('-x') + ' and ' + mx('7x') + ' are like terms. ' + mx('yx') + ' and ' + mx('xy') + ' are like terms too.'
  })
},

/* 13 */ {
  prompt: 'Three students simplify ' + mx('6x − 2y + 3 − x + 5y') + '. Who is right?',
  sub: 'Choose Agree or Disagree for each one.',
  build(stage, ctl, ctx) {
    stage.hidden = true;
    const claims = [
      { who: 'Lena', say: '“I got ' + mx('7x + 7y + 3') + '. I added up the ' + mx('x') + ' terms and the ' + mx('y') + ' terms.”', agree: false, hint: 'Look at the sign in front of each term. Test her answer and the original with ' + at({ x: 1, y: 1 }, ['x', 'y']) + '.', why: 'The minus signs went missing. ' + mx('6x − x = 5x') + ' and ' + mx('-2y + 5y = 3y') + '.' },
      { who: 'Tom', say: '“I got ' + mx('3 + 3y + 5x') + '. My terms are just in a different order.”', agree: true, hint: 'Does changing the order of the terms change the total? Simplify the original yourself and compare.', why: 'Right. ' + mx('5x') + ', ' + mx('3y') + ' and 3 in any order give the same total.' },
      { who: 'Priya', say: '“I got ' + mx('5x + 3y + 3') + ', and 5 + 3 + 3 = 11, so it’s ' + mx('11xy') + '.”', agree: false, hint: 'Test her first answer and her last answer with ' + at({ x: 2, y: 1 }, ['x', 'y']) + '. Do they match?', why: mx('5x + 3y + 3') + ' was right, then she added unlike terms. At ' + at({ x: 2, y: 1 }, ['x', 'y']) + ', ' + mx('5x + 3y + 3') + ' is 16 but ' + mx('11xy') + ' is 22.' }
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
    const explain = (i, cls, txt) => { rows[i].row.classList.add(cls); const w = $('.why', rows[i].row); if (w) w.remove(); rows[i].row.append(h('<p class="why">' + txt + '</p>')); };
    ctl.append(list);
    return {
      check() {
        const wrong = claims.map((c, i) => pick[i] !== c.agree ? i : -1).filter(i => i >= 0);
        if (!wrong.length) return true;
        wrong.forEach(i => explain(i, 'bad', claims[i].hint));
        return wrong.length === 1 ? 'Look again at what ' + claims[wrong[0]].who + ' said. The note under it gives a hint.'
                                  : 'Look again at ' + wrong.map(i => claims[i].who).join(' and ') + '. The notes under them give hints.';
      },
      win: () => 'Tom has it. Lena dropped the signs on ' + mx('-x') + ' and ' + mx('-2y') + ', and Priya added unlike terms. Only like terms combine, and each term keeps its sign.',
      won() { locked = true; claims.forEach((c, i) => { rows[i].row.classList.remove('bad'); explain(i, 'good', c.why); rows[i].btns.forEach(b => { b.disabled = true; }); }); },
      solve() { claims.forEach((c, i) => { pick[i] = c.agree; paint(i); }); }
    };
  }
}
];

const SECTIONS = [[0, 'Two kinds of bag'], [2, 'Unlike terms'], [4, 'Taking away'], [6, 'Signs'], [9, 'Same or not?'], [11, 'Wrap-up']];

// Finish screen: sets the prompt, sub-line and recap for this lesson.
function drawFinish() {
  promptEl.textContent = 'You can only combine like terms.';
  subEl.hidden = false; subEl.textContent = 'Like terms have exactly the same letter part. Four things to remember:';
  ctl.replaceChildren(); stage.hidden = false;
  const mini = o => '<svg viewBox="-5 -10 76 83" aria-hidden="true">' + bagG(0, 0, o) + '</svg>';
  stage.replaceChildren(h('<ul class="recap">' +
    '<li><span class="art">' + mini({ tag: 'x' }) + mini({ tag: 'x' }) + '</span><span>Like terms are things of the same kind, so they can be added or taken away: ' + mx('2x + x = 3x') + ' and ' + mx('5x − 2x = 3x') + '.</span></li>' +
    '<li><span class="art">' + mini({ tag: 'x' }) + mini({ tag: 'y', y: true }) + '</span><span>Unlike terms stay apart. ' + mx('2x + 3y') + ' and ' + mx('2x + 3') + ' can’t be shortened, and ' + mx('2x + 3y') + ' is not ' + mx('5xy') + '.</span></li>' +
    '<li><span class="art"><span class="tile var still">−a</span></span><span>A sign belongs to the term just after it. The terms of ' + mx('4a + 3 − a − 5') + ' are ' + mx('4a, +3, −a') + ' and ' + mx('−5') + ', so it simplifies to ' + mx('3a − 2') + '.</span></li>' +
    '<li><span class="art"><span class="tile var still">x</span><span class="tile var still y">y</span></span><span>Equivalent expressions match for every value. One setting where two expressions differ proves they are not equivalent.</span></li></ul>'));
}
