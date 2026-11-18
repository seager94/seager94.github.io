/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const h = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');

// "b + b + 3" -> maths markup. Single lower-case letters become variables.
function mx(s) {
  return '<span class="m">' + String(s).split(' ').map(t => /^[a-z]$/.test(t) ? '<i class="v">' + t + '</i>' : t).join(' ') + '</span>';
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

/* ---------- growing-pattern components ---------- */
const NARROW = () => window.matchMedia('(max-width:34rem)').matches;
// Matchstick patterns: 'sq' is squares in a row, 'tri' is triangles in a row.
// Stick 0 is the part that stays the same. Group k (k = 1 ... n) is the part that step k adds.
const STK = 40, TRI_H = 34.64, STK_PAD = 12;
function stickList(kind, n) {
  const s = STK, out = [{ g: 0, a: kind === 'sq' ? [0, 0, 0, s] : [0, TRI_H, s / 2, 0] }];
  const B = j => [j * s, TRI_H], T = j => [(j + 0.5) * s, 0];
  for (let k = 1; k <= n; k++) {
    if (kind === 'sq') out.push({ g: k, a: [(k - 1) * s, 0, k * s, 0] }, { g: k, a: [(k - 1) * s, s, k * s, s] }, { g: k, a: [k * s, 0, k * s, s] });
    else if (k % 2) { const j = (k - 1) / 2; out.push({ g: k, a: B(j).concat(B(j + 1)) }, { g: k, a: T(j).concat(B(j + 1)) }); }
    else { const j = k / 2; out.push({ g: k, a: T(j - 1).concat(T(j)) }, { g: k, a: B(j).concat(T(j)) }); }
  }
  return out;
}
// o.max sets the drawing width (so the pattern grows instead of shrinking), o.colour shows yellow = stays, blue = grows,
// o.labels writes 1 and 3 under the squares, o.tap lets each stick be tapped as it is counted.
function sticksSVG(kind, n, o) {
  o = o || {};
  const max = o.max || n, P = STK_PAD, sq = kind === 'sq';
  const lab = o.labels && sq ? 26 : 0;
  const W = (sq ? max * STK : (max + 1) * STK / 2) + 2 * P, H = (sq ? STK : TRI_H) + 2 * P + lab;
  let g = '<svg class="sticks' + (o.tap ? ' tap' : '') + '" viewBox="' + (-P) + ' ' + (-P) + ' ' + W + ' ' + H + '" style="width:' + (W * (o.scale || 0.085)).toFixed(1) + 'rem" ' +
    (o.tap ? 'role="group"' : 'role="img"') + ' aria-label="Step ' + n + ': ' + plural(n, sq ? 'square' : 'triangle') + ' made of matchsticks, in a row">';
  stickList(kind, n).forEach((st, i) => {
    const L = 'x1="' + st.a[0] + '" y1="' + st.a[1] + '" x2="' + st.a[2] + '" y2="' + st.a[3] + '"';
    g += '<g class="stk' + (o.colour ? (st.g ? ' v' : ' k') : '') + (o.grow != null && st.g > o.grow ? ' grow' : '') + '" data-i="' + i + '"' +
      (o.tap ? ' tabindex="0" role="button" aria-label="Matchstick"' : '') + '>' +
      (o.tap ? '<line class="st-hit" ' + L + '/>' : '') + '<line class="st-o" ' + L + '/><line class="st-i" ' + L + '/></g>';
  });
  if (lab) {
    const y = STK + 24;
    g += '<text class="st-lab k" x="0" y="' + y + '">1</text>';
    for (let k = 1; k <= n; k++) g += '<text class="st-lab v" x="' + (k - 0.5) * STK + '" y="' + y + '">3</text>';
  }
  return g + '</svg>';
}
function makeSticks(host, kind, n0, o) {
  o = Object.assign({}, o);
  const box = h('<div class="stk-box"></div>');
  host.append(box);
  let n = n0, prev = null;
  const marked = new Set();
  function draw() {
    box.innerHTML = sticksSVG(kind, n, Object.assign({}, o, { grow: prev }));
    if (o.tap) box.querySelectorAll('.stk').forEach(g => { const on = marked.has(+g.dataset.i); g.classList.toggle('done', on); g.setAttribute('aria-pressed', on); });
  }
  if (o.tap) {
    const tog = (g, refocus) => {
      const i = +g.dataset.i;
      if (marked.has(i)) marked.delete(i); else marked.add(i);
      prev = null; draw();
      if (refocus) $('.stk[data-i="' + i + '"]', box).focus();
    };
    box.addEventListener('click', e => { const g = e.target.closest('.stk'); if (g) tog(g, false); });
    box.addEventListener('keydown', e => {
      const g = e.target.closest('.stk');
      if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); tog(g, true); }
    });
  }
  draw();
  return {
    set(v) { prev = v > n ? n : null; n = v; draw(); },
    colour(on) { o.colour = on; prev = null; draw(); },
    clear() { marked.clear(); draw(); }
  };
}

// Plus-shaped tile pattern: a yellow centre and four blue arms of n tiles. view 'lena' or 'tom' outlines how each student groups it.
// num writes that number beside each group (in place of the letter) and 1 on the centre tile, for the Why? panels.
function plusSVG(n, view, max, num) {
  const p = 22, c = 19, M = 26, G = (2 * max + 1) * p - (p - c), o = (max - n) * p;
  const X = k => o + k * p, mid = X(n) + c / 2;
  const cell = (r, k, cls) => '<rect class="pc ' + cls + '" x="' + X(k) + '" y="' + X(r) + '" width="' + c + '" height="' + c + '" rx="3"/>';
  const box = (k0, r0, k1, r1) => '<rect class="grp" x="' + (X(k0) - 3.5) + '" y="' + (X(r0) - 3.5) + '" width="' + ((k1 - k0) * p + c + 7) + '" height="' + ((r1 - r0) * p + c + 7) + '" rx="5"/>';
  const lab = (x, y, a) => '<text class="plab' + (num != null ? ' num' : '') + '" x="' + x + '" y="' + y + '" text-anchor="' + (a || 'middle') + '">' + (num != null ? num : 'n') + '</text>';
  let g = '<svg class="plus" viewBox="' + (-M) + ' ' + (-M) + ' ' + (G + 2 * M) + ' ' + (G + 2 * M) + '" role="img" aria-label="Step ' + n + ': a yellow centre tile with four blue arms of ' + plural(n, 'tile') + '">';
  for (let k = 0; k <= 2 * n; k++) if (k !== n) g += cell(n, k, 'v') + cell(k, n, 'v');
  g += cell(n, n, 'k');
  if (num != null) g += '<text class="pone" x="' + mid + '" y="' + (mid + 5) + '" text-anchor="middle">1</text>';
  if (view === 'lena') {
    g += box(n, 0, n, n - 1) + box(n, n + 1, n, 2 * n) + box(0, n, n - 1, n) + box(n + 1, n, 2 * n, n);
    g += lab(mid, X(0) - 9) + lab(mid, X(2 * n) + c + (num != null ? 23 : 19)) + lab(X(0) - 9, mid + 5, 'end') + lab(X(2 * n) + c + 9, mid + 5, 'start');
  } else if (view === 'tom') {
    g += box(0, n, 2 * n, n) + box(n, 0, n, n - 1) + box(n, n + 1, n, 2 * n);
    g += lab(mid, X(0) - 9) + lab(mid, X(2 * n) + c + (num != null ? 23 : 19)) + lab((X(0) + X(n - 1) + c) / 2, X(n) - 9) + lab((X(n + 1) + X(2 * n) + c) / 2, X(n) - 9);
  }
  return g + '</svg>';
}

// Table of values. given[i] fills column i; every other column gets a box to type in.
function makeTable(host, steps, given, ctx) {
  // On a narrow screen the table stands upright, one row per step, so it fits the width.
  const up = NARROW();
  const t = up ? h('<table class="tbl v"><tr><th>Step ' + mx('n') + '</th><th>Matchsticks</th></tr></table>')
               : h('<table class="tbl"><tr><th scope="row">Step ' + mx('n') + '</th></tr><tr><th scope="row">Matchsticks</th></tr></table>');
  let r1 = t.rows[0], r2 = t.rows[1], boxes = [];
  const td = (html, cls) => { const c = document.createElement('td'); if (cls) c.className = cls; c.innerHTML = html; return c; };
  const ready = () => boxes.every(b => b.value.trim() !== '');
  const row = () => { const r = t.insertRow(); r1 = r2 = r; };
  steps.forEach((s, i) => {
    if (i && s - steps[i - 1] > 1) { if (up) { row(); r1.append(td('⋮'), td('⋮')); } else { r1.append(td('…', 'gap')); r2.append(td('…', 'gap')); } }
    if (up) row();
    r1.append(td(s));
    if (given[i] != null) { r2.append(td(given[i])); return; }
    const inp = h('<input type="text" inputmode="numeric" autocomplete="off" maxlength="4" aria-label="Matchsticks at step ' + s + '">');
    inp.addEventListener('input', () => { inp.classList.remove('bad', 'good'); ctx.touch(ready()); });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ctx.submit(); } });
    const c = td(''); c.append(inp); r2.append(c);
    boxes.push(inp);
  });
  host.append(t);
  return {
    vals: () => boxes.map(b => { const v = b.value.trim(); return /^\d+$/.test(v) ? +v : NaN; }),
    mark: (k, cls) => boxes[k].classList.add(cls),
    set: arr => arr.forEach((v, k) => { boxes[k].value = v; boxes[k].classList.remove('bad'); }),
    lock: () => boxes.forEach(b => { b.disabled = true; })
  };
}
const stepTable = (steps, f) => h('<table class="tbl v"><tr><th>Step</th><th>Matchsticks</th></tr>' + steps.map(s => '<tr><td>' + s + '</td><td>' + f(s) + '</td></tr>').join('') + '</table>');

// Small first-quadrant grid. Tap to place a point (one per step, snapped to whole numbers); keep the pointer down to drag it.
function makeGrid(host, o) {
  const L = 40, T = 12, UX = 50, UY = 15, XM = o.xmax, YM = o.ymax;
  const W = L + XM * UX + 18, H = T + YM * UY + 38;
  const X = x => L + x * UX, Y = y => T + (YM - y) * UY;
  const ln = (x1, y1, x2, y2, cls) => '<line class="' + cls + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/>';
  let s = '<svg class="grid' + (o.small ? ' sm' : '') + '" viewBox="0 0 ' + W + ' ' + H + '" style="--ar:' + (W / H).toFixed(4) + '" role="img" aria-label="Grid with step number across and matchsticks up"><rect class="g-bg" x="' + L + '" y="' + T + '" width="' + XM * UX + '" height="' + YM * UY + '"/>';
  for (let x = 1; x <= XM; x++) s += ln(X(x), Y(0), X(x), Y(YM), 'gl');
  for (let y = 1; y <= YM; y++) s += ln(X(0), Y(y), X(XM), Y(y), 'gl');
  s += ln(X(0), Y(0), X(XM), Y(0), 'gl ax') + ln(X(0), Y(0), X(0), Y(YM), 'gl ax');
  for (let x = 0; x <= XM; x++) s += '<text class="g-num" x="' + X(x) + '" y="' + (Y(0) + 16) + '" text-anchor="middle">' + x + '</text>';
  for (let y = 2; y <= YM; y += 2) s += '<text class="g-num" x="' + (X(0) - 6) + '" y="' + (Y(y) + 4) + '" text-anchor="end">' + y + '</text>';
  s += '<text class="g-tt" x="' + X(XM / 2) + '" y="' + (H - 4) + '" text-anchor="middle">Step</text>';
  s += '<text class="g-tt" x="12" y="' + Y(YM / 2) + '" text-anchor="middle" transform="rotate(-90 12 ' + Y(YM / 2) + ')">Matchsticks</text>';
  s += '<g class="g-fit"></g><g class="g-pts"></g></svg>';
  const svg = h(s);
  host.append(svg);
  const ptsG = $('.g-pts', svg), fitG = $('.g-fit', svg);
  const pts = {};
  let active = null, locked = false;
  function draw(bad) {
    ptsG.innerHTML = Object.keys(pts).map(k => {
      const x = +k, y = pts[k];
      return '<circle class="g-pt' + (bad && bad.includes(x) ? ' bad' : '') + '" cx="' + X(x) + '" cy="' + Y(y) + '" r="6.5"/>' +
        (x === active ? '<text class="g-lab" x="' + (X(x) + 10) + '" y="' + (Y(y) - 8) + '">(' + x + ', ' + y + ')</text>' : '');
    }).join('');
  }
  function place(e) {
    const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
    const x = Math.min(o.x1, Math.max(o.x0, Math.round((q.x - L) / UX)));
    const y = Math.min(YM, Math.max(0, Math.round(YM - (q.y - T) / UY)));
    if (pts[x] === y && active === x) return;
    pts[x] = y; active = x;
    draw(); o.onChange();
  }
  svg.addEventListener('pointerdown', e => {
    if (locked || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    try { svg.setPointerCapture(e.pointerId); } catch (_) {}
    place(e);
    const mv = ev => place(ev);
    const up = () => { svg.removeEventListener('pointermove', mv); svg.removeEventListener('pointerup', up); svg.removeEventListener('pointercancel', up); };
    svg.addEventListener('pointermove', mv);
    svg.addEventListener('pointerup', up);
    svg.addEventListener('pointercancel', up);
  });
  return {
    pts,
    set(obj) { Object.assign(pts, obj); active = null; draw(); },
    clear() { if (locked) return; Object.keys(pts).forEach(k => delete pts[k]); active = null; draw(); },
    mark: bad => draw(bad),
    fit(x0, y0, x1, y1) { fitG.innerHTML = ln(X(x0), Y(y0), X(x1), Y(y1), 'g-fitl'); },
    lock() { locked = true; active = null; draw(); svg.classList.add('locked'); }
  };
}

/* ---------- Why? panel pictures: still, with the numbers written beside the objects ---------- */
const wy = (pic, lines) => '<div class="wy"><div class="wy-pic">' + pic + '</div><div class="wy-t">' + lines.map(l => '<p>' + l + '</p>').join('') + '</div></div>';
const wyN = (x, y, t, c, a) => '<text class="wy-n' + (c ? ' ' + c : '') + '" x="' + x + '" y="' + y + '"' + (a ? ' style="text-anchor:' + a + '"' : '') + '>' + t + '</text>';
const wyW = (x, y, t, a) => '<text class="wy-w" x="' + x + '" y="' + y + '"' + (a ? ' style="text-anchor:' + a + '"' : '') + '>' + t + '</text>';
const wyBrace = (x0, x1, y) => '<path class="wy-br" d="M' + x0 + ' ' + y + ' v6 H' + x1 + ' v-6"/>';
const WY_N = '<tspan class="wy-v">n</tspan>';
// Still matchstick picture. o.cls(stick) gives each stick its colour class (default: yellow start, blue groups),
// o.gap = k leaves a gap with dots after group k (for a step too long to draw), o.notes is extra SVG, o.pad makes room for it.
function whySticks(kind, n, o) {
  o = o || {};
  const P = STK_PAD, sq = kind === 'sq', GAP = o.gap ? STK : 0;
  const pad = Object.assign({ l: 0, r: 0, t: 0, b: 0 }, o.pad);
  const W = (sq ? n * STK : (n + 1) * STK / 2) + GAP + pad.l + pad.r + 2 * P, H = (sq ? STK : TRI_H) + pad.t + pad.b + 2 * P;
  let g = '<svg class="sticks wy-s" viewBox="' + (-P - pad.l) + ' ' + (-P - pad.t) + ' ' + W + ' ' + H + '" style="width:' + Math.round(W * (o.scale || 1.6)) + 'px" role="img" aria-label="' + o.label + '">';
  stickList(kind, n).forEach(st => {
    const dx = o.gap && st.g > o.gap ? GAP : 0, c = o.cls ? o.cls(st) : (st.g ? 'v' : 'k');
    const L = 'x1="' + (st.a[0] + dx) + '" y1="' + st.a[1] + '" x2="' + (st.a[2] + dx) + '" y2="' + st.a[3] + '"';
    g += '<g class="stk' + (c ? ' ' + c : '') + '"><line class="st-o" ' + L + '/><line class="st-i" ' + L + '/></g>';
  });
  if (o.gap) g += wyN(o.gapX || o.gap * STK + GAP / 2 + 2, (sq ? STK : TRI_H) / 2 + 3, '…');
  return g + (o.notes || '') + '</svg>';
}
// 1 under the yellow stick and 3 under each blue group of the squares pattern.
const sqNotes = n => wyN(0, 62, '1', 'k') + Array.from({ length: n }, (_, k) => wyN((k + 0.5) * STK, 62, '3', 'v')).join('');
// A step too long to draw: the yellow stick, two groups, a gap, the last group, and a count under the blue part.
const longSq = (txt, label) => whySticks('sq', 3, { gap: 2, pad: { b: 46 }, label, notes: wyN(0, 62, '1', 'k') + wyBrace(14, 156, 52) + wyN(85, 82, txt, 'v') });
const longTri = (txt, label) => whySticks('tri', 3, { gap: 2, gapX: 76, pad: { l: 14, r: 10, b: 44 }, label, notes: wyN(-2, 16, '1', 'k', 'end') + wyBrace(4, 116, TRI_H + 12) + wyN(60, TRI_H + 42, txt, 'v') });
// Still graph of the squares pattern with the dashed line through it. extra is more SVG, drawn under the points.
const GX = x => 40 + x * 50, GY = y => 12 + (16 - y) * 15;
const SQ_PTS = { 1: 4, 2: 7, 3: 10, 4: 13 };
function stillGrid(pts, extra) {
  const box = document.createElement('div');
  const gr = makeGrid(box, { xmax: 5, ymax: 16, x0: 1, x1: 4, small: true, onChange() {} });
  gr.set(pts); gr.fit(0, 1, 5, 16); gr.lock();
  if (extra) $('.g-fit', box).insertAdjacentHTML('beforeend', extra);
  return box.innerHTML;
}
// A stair from the point at step x up 3 and across to the next point, with +3 beside the climb.
const stair = x => '<path class="wy-gd" d="M' + GX(x) + ' ' + GY(sqRule(x)) + ' V' + GY(sqRule(x + 1)) + ' H' + GX(x + 1) + '"/>' +
  '<text class="wy-gl" x="' + (GX(x) - 7) + '" y="' + (GY(sqRule(x) + 1.5) + 6) + '" text-anchor="end">+3</text>';
const sqTable = (steps, mark) => '<table class="tbl wy-tbl"><tr><th scope="row">Step ' + mx('n') + '</th>' + steps.map(s => s ? '<td>' + s + '</td>' : '<td class="gap">…</td>').join('') +
  '</tr><tr><th scope="row">Matchsticks</th>' + steps.map(s => s ? '<td' + (mark(s) ? ' class="' + mark(s) + '"' : '') + '>' + sqRule(s) + '</td>' : '<td class="gap">…</td>').join('') + '</tr></table>';

/* ---------- cards ---------- */
const sqRule = n => 1 + 3 * n;
const triRule = n => 1 + 2 * n;
const plusRule = n => 1 + 4 * n;
// Squares pattern with the colours on, a slider and a live sum under it (cards 4 and 6).
function colourPattern(stage, ctl, n0, sum) {
  const pat = makeSticks(stage, 'sq', n0, { max: 8, colour: true, scale: 0.08 });
  const rd = h('<div class="readout"></div>');
  stage.append(rd);
  const show = v => { pat.set(v); rd.innerHTML = sum(v); };
  show(n0);
  makeSlider(ctl, 'n', 1, 8, n0, show);
}
// For a tile expression that is wrong: the first value of n where it misses the pattern.
const missAt = (t, rule, list) => list.find(k => evalToks(t, 'n', k) !== rule(k));

const cards = [

/* 1 */ {
  prompt: 'Each step of this pattern adds one more square. How many matchsticks does each new square need?',
  sub: 'Knowing what each new square costs in matchsticks lets you work out any row without building it. The slider sets the step number, ' + mx('n') + '. Step ' + mx('n') + ' has ' + mx('n') + ' squares in a row.',
  why: () => wy(whySticks('sq', 3, { cls: st => st.g === 3 ? 'v' : '', pad: { t: 16, b: 18, r: 14 }, label: 'Step 3. The three matchsticks of the newest square are numbered 1, 2 and 3.',
      notes: wyN(100, -9, '1', 'v') + wyN(133, 25, '2', 'v') + wyN(100, 60, '3', 'v') }),
    ['Step 2 has 7 matchsticks. Step 3 has 10.', mx('10 − 7 = 3') + ' new sticks. The left side of the new square was already there.']),
  build(stage, ctl, ctx) {
    const pat = makeSticks(stage, 'sq', 2, { max: 8 });
    makeSlider(ctl, 'n', 1, 8, 2, v => pat.set(v));
    const ans = makeAnswer(ctl, 'Matchsticks for each new square', ctx);
    return {
      check(attempt) {
        const v = ans.value();
        if (v === 3) return true;
        ans.mark('bad');
        if (isNaN(v)) return 'Type a whole number, using digits only.';
        if (v === 4) return 'A square on its own has 4 sides. Look at where the new square joins on. Is its left side already there?';
        return attempt < 2 ? 'Move the slider up by one and count only the matchsticks that appear.'
                           : 'Move the slider from 2 to 3. Which sides of the new square are new, and which side was already there?';
      },
      win: () => '3: a top, a bottom and a right side. The new square borrows its left side from the square before it.',
      won() { ans.mark('good'); ans.lock(); },
      solve() { ans.set(3); }
    };
  }
},

/* 2 */ {
  prompt: 'How many matchsticks are there in step 4?',
  sub: 'Tap each matchstick as you count it, so you don’t count one twice. Tap again to undo.',
  why: () => wy(whySticks('sq', 4, { cls: () => '', pad: { t: 16, b: 18, r: 58 }, label: 'Step 4: 4 matchsticks on top, 4 on the bottom and 5 upright.',
      notes: wyW(80, -11, '4 on top') + wyW(80, 60, '4 on the bottom') + wyW(170, 24, '5 upright', 'start') }),
    ['Count in three groups: ' + mx('4 + 4 + 5 = 13') + '.', 'An upright stick between two squares is used by both of them, but it is still one stick.']),
  build(stage, ctl, ctx) {
    const pat = makeSticks(stage, 'sq', 4, { max: 4, tap: true, scale: 0.12 });
    const tray = h('<div class="tray"><button type="button" class="linkbtn">Clear my taps</button></div>');
    tray.firstChild.onclick = () => pat.clear();
    stage.append(tray);
    const ans = makeAnswer(ctl, 'Matchsticks in step 4', ctx);
    return {
      check(attempt) {
        const v = ans.value();
        if (v === 13) return true;
        ans.mark('bad');
        if (isNaN(v)) return 'Type a whole number, using digits only.';
        if (v === 16) return '16 gives each square 4 sticks of its own. Squares side by side share the stick between them, so that stick only counts once.';
        if (v === 12) return 'Did you count the very first stick, on the far left?';
        if (v === 14) return 'Check you didn’t count a shared stick twice.';
        return attempt < 2 ? 'Tap every stick once, then count the faded ones.'
                           : 'Count the upright sticks first (there are 5), then the flat ones along the top and the bottom.';
      },
      win: () => '13. Four separate squares would need 16 sticks, but the 3 sticks between neighbouring squares are shared, so 16 − 3 = 13.',
      won() { ans.mark('good'); ans.lock(); },
      solve() { ans.set(13); }
    };
  }
},

/* 3 */ {
  prompt: 'Here is step 4 again, coloured in. Which sum matches the colours?',
  why: () => wy(whySticks('sq', 4, { pad: { b: 22 }, notes: sqNotes(4), label: 'Step 4 in colour: 1 yellow stick, then 4 blue groups of 3.' }),
    ['The yellow stick is 1. Each blue group is 3 sticks: a top, a bottom and a right side.', mx('1 + 3 + 3 + 3 + 3 = 13')]),
  build(stage, ctl, ctx) {
    makeSticks(stage, 'sq', 4, { max: 4, colour: true, scale: 0.12 });
    const ch = makeChoices(ctl, [mx('4 + 4 + 4 + 4'), mx('1 + 3 + 3 + 3 + 3'), mx('3 + 3 + 3 + 3'), mx('4 + 3 + 3 + 3')], ctx);
    const why = [
      mx('4 + 4 + 4 + 4') + ' is 16. That gives every square 4 sticks of its own, but neighbours share a stick. The colours show 1 yellow stick, then blue groups.',
      '',
      mx('3 + 3 + 3 + 3') + ' is 12. That counts the blue groups but leaves out the yellow stick.',
      mx('4 + 3 + 3 + 3') + ' is 13 too, and it is a fair way to see the pattern. But the colours show 1 yellow stick on its own, then the blue groups.'
    ];
    return {
      check() { const s = ch.sel()[0]; if (s === 1) return true; ch.mark(s, 'bad'); return why[s]; },
      win: () => mx('1 + 3 + 3 + 3 + 3 = 13') + '. The yellow stick is the part that stays the same. The blue part grows: one group of 3 for each square.',
      won() { ch.mark(1, 'good'); ch.lock(); },
      solve() { ch.set([1]); }
    };
  }
},

/* 4 */ {
  prompt: 'Which expression gives the number of matchsticks in step ' + mx('n') + '?',
  sub: 'The yellow stick stays the same. The blue groups of 3 grow.',
  why: () => wy(whySticks('sq', 4, { pad: { b: 48 }, label: 'Step 4 in colour: 1 yellow stick, then 4 blue groups of 3.',
      notes: sqNotes(4) + wyBrace(8, 152, 68) + wyN(80, 96, WY_N + ' = 4 groups of 3', 'v') }),
    ['Step 4: ' + mx('1 + 3 + 3 + 3 + 3') + ' is ' + mx('1 + 3 × 4') + '.', 'Step ' + mx('n') + ' has ' + mx('n') + ' groups of 3, so it has ' + mx('1 + 3 × n') + ' sticks.']),
  build(stage, ctl, ctx) {
    colourPattern(stage, ctl, 4, v => mx(['1'].concat(Array(v).fill('3')).join(' + ') + ' = ' + sqRule(v)));
    const ch = makeChoices(ctl, [mx('n + 3'), mx('1 + 3 × n'), mx('4 × n'), mx('3 × n')], ctx);
    const why = [
      mx('n + 3') + ' adds 3 to the step number just once. Test it with ' + mx('n = 4') + ': 4 + 3 = 7, but step 4 has 13 sticks.',
      '',
      mx('4 × n') + ' gives each square 4 sticks. Test it with ' + mx('n = 4') + ': 4 × 4 = 16, but step 4 has 13, because neighbours share a stick.',
      mx('3 × n') + ' counts the blue groups. Test it with ' + mx('n = 4') + ': 3 × 4 = 12. The yellow stick is missing.'
    ];
    return {
      check() { const s = ch.sel()[0]; if (s === 1) return true; ch.mark(s, 'bad'); return why[s]; },
      win: () => mx('1 + 3 × n') + '. The 1 is the yellow stick that stays the same. The ' + mx('3 × n') + ' is the ' + mx('n') + ' blue groups of 3 that grow.',
      won() { ch.mark(1, 'good'); ch.lock(); },
      solve() { ch.set([1]); }
    };
  }
},

/* 5 (bridge) */ {
  bridge: true,
  prompt: 'The expression ' + mx('1 + 3 × n') + ' you just chose is called a <b>rule</b>.',
  sub: 'A rule links the step number, ' + mx('n') + ', to the number of matchsticks in that step.',
  show(stage) { stage.append(h('<div class="stk-box">' + whySticks('sq', 3, { pad: { b: 22 }, notes: sqNotes(3), scale: 1.7, label: 'Step 3 in colour: 1 yellow stick, then 3 blue groups of 3.' }) + '</div>')); }
},

/* 6 */ {
  prompt: 'Step 50 has 50 squares. How many matchsticks does it need?',
  sub: 'The slider stops at 8, so you can’t draw step 50. Use the rule instead.',
  why: () => wy(longSq('50 groups of 3', 'Step 50, too long to draw in full: 1 yellow stick, then 50 blue groups of 3.'),
    ['Blue sticks: ' + mx('3 × 50 = 150') + '.', 'Add the yellow stick: ' + mx('1 + 150 = 151') + '.']),
  build(stage, ctl, ctx) {
    colourPattern(stage, ctl, 4, v => mx('1 + 3 × ' + v + ' = ' + sqRule(v)));
    const ans = makeAnswer(ctl, 'Matchsticks in step 50', ctx);
    return {
      check(attempt) {
        const v = ans.value();
        if (v === 151) return true;
        ans.mark('bad');
        if (isNaN(v)) return 'Type a whole number, using digits only.';
        if (v === 150) return '3 × 50 = 150 is only the blue groups. Which part of the pattern is missing?';
        if (v === 200) return '200 is 4 × 50, which gives every square 4 sticks. Neighbours share a stick, so each square only adds 3.';
        if (v === 53) return '50 + 3 adds 3 just once. Step 50 has 50 blue groups of 3, so you need 3 × 50.';
        if (v === 153) return '153 is 3 × 51. Step 50 has 50 blue groups of 3, not 51, plus 1 yellow stick.';
        return attempt < 2 ? 'Put ' + mx('n = 50') + ' into ' + mx('1 + 3 × n') + '.'
                           : 'Work out 3 × 50 for the blue groups, then add 1 for the yellow stick.';
      },
      win: () => mx('1 + 3 × 50 = 1 + 150 = 151') + '. You didn’t draw 50 squares. The rule takes you straight to any step.',
      won() { ans.mark('good'); ans.lock(); },
      solve() { ans.set(151); },
      recap: () => 'Step 50 needs ' + mx('1 + 3 × 50 = 151') + ' matchsticks.'
    };
  },
  then: {
    prompt: 'Another step needs 61 matchsticks. Which step is it?',
    sub: 'Work backwards through the rule ' + mx('1 + 3 × n') + '.',
    why: () => wy(longSq('60 sticks = 20 groups of 3', 'A step with 61 matchsticks: 1 yellow stick, then 60 blue sticks in 20 groups of 3.'),
      ['Take off the yellow stick: ' + mx('61 − 1 = 60') + ' blue sticks.', 'Share them into groups of 3: ' + mx('60 ÷ 3 = 20') + ', so ' + mx('n = 20') + '.']),
    build(stage, ctl, ctx) {
      const ans = makeAnswer(ctl, 'Step number', ctx);
      return {
        check(attempt) {
          const v = ans.value();
          if (v === 20) return true;
          ans.mark('bad');
          if (isNaN(v)) return 'Type a whole number, using digits only.';
          if (v === 184) return '184 is ' + mx('1 + 3 × 61') + '. That uses 61 as the step number. Here 61 is the matchsticks, and the step is what you are finding.';
          if (v === 60) return '61 − 1 = 60 is the number of blue sticks. How many groups of 3 make 60?';
          if (v === 61) return '61 is the number of matchsticks. Each step adds 3 of them, so the step number is much smaller.';
          const tip = attempt < 2 ? '' : ' Take 1 off for the yellow stick, then count the groups of 3 in what is left.';
          return 'Test it with the rule. Step ' + v + ' needs ' + mx('1 + 3 × ' + v + ' = ' + sqRule(v)) + ' matchsticks, not 61.' + tip;
        },
        win: () => 'Step 20. Check it with the rule: ' + mx('1 + 3 × 20 = 61') + '.',
        won() { ans.mark('good'); ans.lock(); },
        solve() { ans.set(20); }
      };
    }
  }
},

/* 7 */ {
  prompt: 'Fill in the table of values for the matchstick pattern.',
  sub: 'Step 1 is done for you. Step 10 is past the end of the slider.',
  why: () => wy(sqTable([1, 2, 3, 4, 5, 0, 10], s => s > 1 ? 'ok' : ''),
    ['Each step adds one blue group of 3, so the table climbs by 3: 4, 7, 10, 13, 16.', 'Step 10 skips ahead, so use the rule: ' + mx('1 + 3 × 10 = 31') + '.']),
  build(stage, ctl, ctx) {
    const pat = makeSticks(stage, 'sq', 2, { max: 8, colour: true, labels: true });
    makeSlider(ctl, 'n', 1, 8, 2, v => pat.set(v));
    const S = [2, 3, 4, 5, 10];
    const tb = makeTable(ctl, [1, 2, 3, 4, 5, 10], { 0: 4 }, ctx);
    return {
      check() {
        const v = tb.vals();
        const empty = S.map((s, k) => isNaN(v[k]) ? k : -1).filter(k => k >= 0);
        if (empty.length) { empty.forEach(k => tb.mark(k, 'bad')); return 'Fill every box with a whole number, using digits only.'; }
        const bad = S.map((s, k) => v[k] !== sqRule(s) ? k : -1).filter(k => k >= 0);
        if (!bad.length) return true;
        bad.forEach(k => tb.mark(k, 'bad'));
        const k = bad[0], s = S[k], x = v[k];
        if (x === 4 * s) return 'Step ' + s + ' is not ' + x + '. That gives every square 4 sticks of its own. Neighbours share a stick, so each new square adds only 3.';
        if (x === 3 * s) return 'Step ' + s + ' is not ' + x + '. That counts the blue groups of 3 but leaves out the yellow stick.';
        if (s === 10 && x === 2 * v[3]) return 'Step 10 isn’t double step 5. Two copies of step 5 would have two yellow sticks. Step 10 has one yellow stick and 10 blue groups of 3.';
        if (s === 10) return 'Check step 10. It has 1 yellow stick and 10 blue groups of 3. Use the rule ' + mx('1 + 3 × n') + '.';
        return 'Check step ' + s + '. It has 1 yellow stick and ' + s + ' blue groups of 3. Move the slider to ' + s + ' to see it.';
      },
      win: () => 'The table goes 4, 7, 10, 13, 16: up 3 each time. Step 10 is ' + mx('1 + 3 × 10 = 31') + '.',
      won() { S.forEach((s, k) => tb.mark(k, 'good')); tb.lock(); },
      solve() { tb.set(S.map(sqRule)); }
    };
  }
},

/* 8 */ {
  prompt: 'Kai says the rule is “add 3 each time”. To reach step 50, how many times would Kai add 3?',
  sub: 'Kai starts at step 1, which has 4 matchsticks.',
  why: () => {
    const cell = (v, s) => '<span class="cell"><span class="pair">' + v + '</span><small>step ' + s + '</small></span>';
    const j = k => '<span class="jump">+3<small>jump ' + k + '</small></span>';
    return wy('<div class="chain">' + cell(4, 1) + j(1) + cell(7, 2) + j(2) + cell(10, 3) + j(3) + cell(13, 4) + '</div>',
      ['Step 4 is 3 jumps from step 1. The number of jumps is always one less than the step number.', 'Step 50: ' + mx('50 − 1 = 49') + ' jumps.']);
  },
  build(stage, ctl, ctx) {
    const cell = (v, s) => '<span class="cell"><span class="pair">' + v + '</span><small>' + s + '</small></span>';
    const j = '<span class="jump">+3</span>';
    stage.append(h('<div class="say"><b>Kai:</b> “The rule is add 3 each time.”</div>'),
      h('<div class="chain">' + cell(4, 'step 1') + j + cell(7, 'step 2') + j + cell(10, 'step 3') + j + cell(13, 'step 4') + '<span class="jump">+3 … +3</span>' + cell('?', 'step 50') + '</div>'));
    const ans = makeAnswer(ctl, 'Times Kai adds 3', ctx);
    return {
      check(attempt) {
        const v = ans.value();
        if (v === 49) return true;
        ans.mark('bad');
        if (isNaN(v)) return 'Type a whole number, using digits only.';
        if (v === 50) return 'Count the jumps, not the steps. From step 1 to step 3 is only 2 jumps.';
        if (v === 151) return '151 is how many matchsticks step 50 has. The question is how many times Kai adds 3 to get there.';
        return attempt < 2 ? 'Each +3 moves Kai one step along. How many moves from step 1 to step 50?'
                           : 'Step 1 to step 4 is 3 jumps. Step 1 to step 10 is 9 jumps. What about step 50?';
      },
      win: () => '49 times: 4 and then 49 threes makes 151. “Add 3 each time” is true, but it only tells you how to get from one step to the next. The rule ' + mx('1 + 3 × n') + ' goes straight to any step: ' + mx('1 + 3 × 50 = 151') + '.',
      won() { ans.mark('good'); ans.lock(); },
      solve() { ans.set(49); }
    };
  }
},

/* 9 (bridge) */ {
  bridge: true,
  prompt: 'Your table pairs each step with its matchsticks. A pair written like (2,&nbsp;7) is called an <b>ordered pair</b>.',
  sub: 'The step number comes first, then the matchsticks.',
  show(stage) { stage.append(h(sqTable([1, 2, 3, 4], s => s === 2 ? 'hl' : '').replace('<td>2</td>', '<td class="hl">2</td>'))); }
},

/* 10 */ {
  prompt: 'Plot the table on the grid: one point for each step from 1 to 4.',
  sub: 'Tap the grid to place a point, or drag to move it. Go across to the step, then up to the matchsticks.',
  why: () => wy(stillGrid(SQ_PTS, '<path class="wy-gd" d="M' + GX(2) + ' ' + GY(0) + ' V' + GY(7) + ' M' + GX(0) + ' ' + GY(7) + ' H' + GX(2) + '"/>' +
      '<text class="wy-gl" x="' + (GX(2) + 11) + '" y="' + (GY(7) + 19) + '">(2, 7)</text>'),
    ['Step 2 has 7 matchsticks. Go across to 2, then up to 7. That point is (2,&nbsp;7).', 'The other points work the same way: (1,&nbsp;4), (3,&nbsp;10) and (4,&nbsp;13).']),
  build(stage, ctl, ctx) {
    const want = { 1: 4, 2: 7, 3: 10, 4: 13 };
    const wrap = h('<div class="gwrap"></div>');
    stage.append(wrap);
    wrap.append(stepTable([1, 2, 3, 4], x => want[x]));
    const gr = makeGrid(wrap, { xmax: 5, ymax: 16, x0: 1, x1: 4, small: NARROW(), onChange: () => ctx.touch(true) });
    const tray = h('<div class="tray"><button type="button" class="linkbtn">Clear the points</button></div>');
    tray.firstChild.onclick = () => { gr.clear(); ctx.touch(false); };
    ctl.append(tray);
    return {
      check() {
        const P = gr.pts, all = [1, 2, 3, 4];
        const miss = all.filter(x => P[x] == null);
        if (miss.length) return 'Plot a point for every step from 1 to 4. Still missing: step ' + miss.join(', step ') + '.';
        const bad = all.filter(x => P[x] !== want[x]);
        if (!bad.length) return true;
        gr.mark(bad);
        if (bad.every(x => P[x] === x)) return 'Your points are as high as the step number. Each point should be as high as the number of matchsticks.';
        const x = bad[0];
        return (bad.length === 1 ? 'The red point is' : 'The red points are') + ' not right yet. Your step ' + x + ' point is up at ' + P[x] + '. Check step ' + x + ' in the table: go across to the step, then up to the matchsticks.';
      },
      win: () => 'The points (1, 4), (2, 7), (3, 10) and (4, 13) line up. A ruler laid through them touches every one.',
      won() { gr.fit(0, 1, 5, 16); gr.lock(); },
      solve() { gr.set(want); }
    };
  }
},

/* 11 */ {
  prompt: 'The points lie on a straight line. Why?',
  why: () => wy(stillGrid(SQ_PTS, stair(1) + stair(2) + stair(3)),
    ['From each point to the next, go across 1 step and up 3 matchsticks.', 'Every stair is the same size, so the points stay in line.']),
  build(stage, ctl, ctx) {
    const gr = makeGrid(stage, { xmax: 5, ymax: 16, x0: 1, x1: 4, small: true, onChange() {} });
    gr.set(SQ_PTS); gr.fit(0, 1, 5, 16); gr.lock();
    const ch = makeChoices(ctl, ['The step numbers go up by 1 each time.', 'Each step adds the same number of matchsticks.', 'Matchsticks are straight, so the graph is straight.', 'Every pattern makes a straight line.'], ctx);
    const why = [
      'That is true for every pattern, even ones whose points curve. Look at how much higher each point is than the one before.',
      '',
      'The shape of a matchstick doesn’t matter. The graph shows the totals. Look at how much higher each point is than the one before.',
      'Not every pattern does. If a pattern added 1, then 2, then 3, its points would bend into a curve. What is special about this one?'
    ];
    return {
      check() { const s = ch.sel()[0]; if (s === 1) return true; ch.mark(s, 'bad'); return why[s]; },
      win: () => 'Each step adds 3, so each point is 3 higher than the last. The same climb every time makes a straight line. Back at step 0 the line meets 1: the yellow stick.',
      won() { ch.mark(1, 'good'); ch.lock(); },
      solve() { ch.set([1]); },
      recap: () => 'Each step adds the same number of matchsticks, so the points lie on a straight line.',
      gr
    };
  },
  then: {
    prompt: 'The pattern keeps going. How high will the point for step 5 be?',
    why: () => wy(stillGrid(Object.assign({ 5: 16 }, SQ_PTS), stair(4) + '<circle class="wy-new" cx="' + GX(5) + '" cy="' + GY(16) + '" r="11"/>'),
      ['Step 4 is at 13. One more step climbs 3 more: ' + mx('13 + 3 = 16') + '.', 'The rule agrees: ' + mx('1 + 3 × 5 = 16') + '.']),
    build(stage, ctl, ctx, p1) {
      const ans = makeAnswer(ctl, 'Matchsticks at step 5', ctx);
      return {
        check(attempt) {
          const v = ans.value();
          if (v === 16) return true;
          ans.mark('bad');
          if (isNaN(v)) return 'Type a whole number, using digits only.';
          if (v === 13) return '13 is the height at step 4. The line keeps climbing, so step 5 is higher.';
          if (v === 14) return '13 + 1 goes up by 1. Look at the gap between any two points: how much higher is each one?';
          if (v === 17) return '13 + 4 gives the new square 4 sticks of its own. It shares a side, so the climb is 3.';
          if (v === 15) return '3 × 5 = 15 counts the five blue groups. The yellow stick is missing.';
          if (v === 20) return '4 × 5 = 20 gives every square 4 sticks of its own. Neighbours share a stick.';
          if (v === 5) return '5 is the step number, which is how far across the point is. How far up is it?';
          return attempt < 2 ? 'Each point is 3 higher than the one before it. Start from the point (4,&nbsp;13).'
                             : 'Step 4 is at 13. Step 5 is one more climb of 3.';
        },
        win: () => '16. The new point (5,&nbsp;16) sits on the same line, 3 higher than (4,&nbsp;13).',
        won() { ans.mark('good'); ans.lock(); p1.gr.set({ 5: 16 }); },
        solve() { ans.set(16); }
      };
    }
  }
},

/* 12 (bridge) */ {
  bridge: true,
  prompt: 'A pattern that adds the same amount at every step is called a <b>linear</b> pattern.',
  sub: 'The matchstick squares add 3 each time, so their points lie on a straight line.',
  show(stage) { stage.append(h('<div class="stk-box">' + stillGrid(SQ_PTS, stair(1) + stair(2) + stair(3)) + '</div>')); }
},

/* 13 */ {
  prompt: 'Lena sees a centre and four arms. Build her rule for step ' + mx('n') + '.',
  sub: 'Drag or tap tiles into the box. Tap one in the box to remove it.',
  why: () => wy(plusSVG(3, 'lena', 3, 3),
    ['At step 3, ' + mx('n = 3') + ': 1 centre tile and 4 arms of 3 tiles. ' + mx('1 + 4 × 3 = 13') + '.', 'At step ' + mx('n') + ' each arm has ' + mx('n') + ' tiles, so the total is ' + mx('1 + 4 × n') + '.']),
  build(stage, ctl, ctx) {
    const row = h('<div class="plus-row"><div></div><div class="readout"></div></div>'), [box, rd] = row.children;
    stage.append(row);
    const show = v => { box.innerHTML = plusSVG(v, 'lena', 4); rd.innerHTML = 'Tiles altogether:<br><b>' + plusRule(v) + '</b>'; };
    show(3);
    makeSlider(ctl, 'n', 1, 4, 3, show);
    const bd = makeBuilder(stage, ctl, ['n', '+', '×', '1', '2', '3', '4'], ctx);
    const eq = (t, f) => [2, 5, 11].every(v => evalToks(t, 'n', v) === f(v));
    return {
      check() {
        const t = bd.toks();
        if (evalToks(t, 'n', 5) == null) return 'That isn’t a complete expression yet. Put + or × between each pair of tiles.';
        if (eq(t, plusRule)) return true;
        if (!t.includes('n')) return 'Your expression has no ' + mx('n') + ', so it gives the same total at every step. The arms grow, so ' + mx('n') + ' must be in it.';
        if (eq(t, v => 4 * v)) return 'That counts the four blue arms. What about the yellow centre tile?';
        if (eq(t, v => v + 1)) return 'That is one arm and the centre. There are four arms, each with ' + mx('n') + ' tiles.';
        if (eq(t, v => v + 4) || eq(t, v => v + 5)) return 'That uses ' + mx('n') + ' only once. Each of the 4 arms has ' + mx('n') + ' tiles, so ' + mx('n') + ' is needed four times.';
        const v = missAt(t, plusRule, [3, 2, 4, 1, 5, 11]);
        return 'Test it with ' + mx('n = ' + v) + '. Step ' + v + ' has ' + plusRule(v) + ' tiles, but your expression gives ' + evalToks(t, 'n', v) + '.';
      },
      win: () => mx(bd.toks().join(' ')) + ' works: 1 yellow centre tile plus 4 arms of ' + mx('n') + ' tiles.',
      won() { bd.lock(); },
      solve() { bd.set(['1', '+', '4', '×', 'n']); }
    };
  }
},

/* 14 */ {
  prompt: 'Tom sees one long row and two short arms. Which expression is Tom’s?',
  why: () => wy(plusSVG(3, 'tom', 3, 3),
    ['At step 3, ' + mx('n = 3') + '. Long row: ' + mx('3 + 1 + 3') + '. Short arms: ' + mx('3 + 3') + '. Total: ' + mx('3 + 1 + 3 + 3 + 3 = 13') + '.', 'Write ' + mx('n') + ' in place of each 3: ' + mx('n + 1 + n + n + n') + '.']),
  build(stage, ctl, ctx) {
    const row = h('<div class="plus-row"><div></div><div class="readout"></div></div>'), [box, rd] = row.children;
    stage.append(row);
    const show = v => { box.innerHTML = plusSVG(v, 'tom', 4); rd.innerHTML = 'Tiles altogether:<br><b>' + plusRule(v) + '</b>'; };
    show(3);
    makeSlider(ctl, 'n', 1, 4, 3, show);
    const ch = makeChoices(ctl, [mx('n + 1 + n'), mx('n + 1 + n + n + n'), mx('n + 1 + n + 2'), mx('4 × n')], ctx);
    const why = [
      'That is only Tom’s long row: ' + mx('n') + ' tiles, the centre, then ' + mx('n') + ' more. He also sees the two short arms, up and down.',
      '',
      'The short arms aren’t 1 tile each. Move the slider: they grow, so each one has ' + mx('n') + ' tiles.',
      mx('4 × n') + ' leaves out the yellow centre tile. Tom counts it as part of his long row.'
    ];
    return {
      check() { const s = ch.sel()[0]; if (s === 1) return true; ch.mark(s, 'bad'); return why[s]; },
      win: () => 'Tom’s long row is ' + mx('n + 1 + n') + '. Add the two short arms and you get ' + mx('n + 1 + n + n + n') + '.',
      won() { ch.mark(1, 'good'); ch.lock(); },
      solve() { ch.set([1]); }
    };
  }
},

/* 15 */ {
  prompt: 'Lena wrote ' + mx('1 + 4 × n') + '. Tom wrote ' + mx('n + 1 + n + n + n') + '. Do they always give the same number?',
  why: () => wy('<div class="wy-duo"><figure>' + plusSVG(2, 'lena', 2, 2) + '<figcaption>Lena: ' + mx('1 + 4 × 2 = 9') + '</figcaption></figure><figure>' +
      plusSVG(2, 'tom', 2, 2) + '<figcaption>Tom: ' + mx('2 + 1 + 2 + 2 + 2 = 9') + '</figcaption></figure></div>',
    ['At step 2, both expressions give 9.', 'Both count the centre once and an arm of ' + mx('n') + ' four times, so they match at every step.']),
  build(stage, ctl, ctx) {
    const duo = h('<div class="duo"><div><div class="pl"></div><div class="readout"></div></div><div><div class="pl"></div><div class="readout"></div></div></div>');
    stage.append(duo);
    const [a, b] = duo.children;
    const show = v => {
      $('.pl', a).innerHTML = plusSVG(v, 'lena', 4); $('.readout', a).innerHTML = '<span class="who">Lena</span> ' + mx('1 + 4 × ' + v + ' = ' + plusRule(v));
      $('.pl', b).innerHTML = plusSVG(v, 'tom', 4); $('.readout', b).innerHTML = '<span class="who">Tom</span> ' + mx([v, 1, v, v, v].join(' + ') + ' = ' + (v + 1 + v + v + v));
    };
    show(3);
    makeSlider(ctl, 'n', 1, 4, 3, show);
    const ch = makeChoices(ctl, ['Only for small steps. Big steps might not match.', 'Yes, for every step. Same tiles, grouped differently.', 'No. Tom’s has more parts, so it is bigger.', 'Only when ' + mx('n = 1') + '.'], ctx);
    const why = [
      'Count the lots of ' + mx('n') + ' in Tom’s expression. How many are in Lena’s?',
      '',
      'More parts doesn’t mean more tiles. Move the slider and compare the two totals each time.',
      'Move the slider to ' + mx('n = 4') + ' and compare the two totals.'
    ];
    return {
      check() { const s = ch.sel()[0]; if (s === 1) return true; ch.mark(s, 'bad'); return why[s]; },
      win: () => 'Always. Tom has four lots of ' + mx('n') + ' and a 1, and ' + mx('n + n + n + n') + ' is ' + mx('4 × n') + '. Expressions that always give the same value are called equivalent.',
      won() { ch.mark(1, 'good'); ch.lock(); },
      solve() { ch.set([1]); }
    };
  }
},

/* 16 */ {
  prompt: 'Triangles in a row. Build an expression for the matchsticks in step ' + mx('n') + '.',
  sub: 'Step ' + mx('n') + ' has ' + mx('n') + ' triangles. What stays the same, and what grows?',
  why: () => wy(whySticks('tri', 3, { pad: { l: 14, t: 18, b: 20 }, scale: 1.7, label: 'Step 3 in colour: 1 yellow stick, then 3 blue groups of 2.',
      notes: wyN(-2, 16, '1', 'k', 'end') + wyN(20, TRI_H + 24, '2', 'v') + wyN(40, -11, '2', 'v') + wyN(60, TRI_H + 24, '2', 'v') }),
    ['At step 3, ' + mx('n = 3') + ': ' + mx('1 + 2 + 2 + 2') + ' is ' + mx('1 + 2 × 3 = 7') + '.', 'Each new triangle shares a side, so it adds only 2 sticks. Step ' + mx('n') + ' has ' + mx('1 + 2 × n') + '.']),
  build(stage, ctl, ctx) {
    const pat = makeSticks(stage, 'tri', 3, { max: 8, scale: 0.08 });
    makeSlider(ctl, 'n', 1, 8, 3, v => pat.set(v));
    const bd = makeBuilder(stage, ctl, ['n', '+', '×', '1', '2', '3'], ctx);
    const eq = (t, f) => [2, 5, 11].every(v => evalToks(t, 'n', v) === f(v));
    return {
      check() {
        const t = bd.toks();
        if (evalToks(t, 'n', 5) == null) return 'That isn’t a complete expression yet. Put + or × between each pair of tiles.';
        if (eq(t, triRule)) return true;
        if (!t.includes('n')) return 'Your expression has no ' + mx('n') + ', so it gives the same total at every step. The row grows, so ' + mx('n') + ' must be in it.';
        if (eq(t, v => v + 2)) return mx('n + 2') + ' is “add 2 each time” written with a letter, but it only adds 2 once. Test it with ' + mx('n = 3') + ': 3 + 2 = 5, but step 3 has 7 matchsticks.';
        if (eq(t, v => 3 * v)) return 'That gives every triangle 3 sticks of its own. Neighbouring triangles share a stick. Test it with ' + mx('n = 3') + ': 3 × 3 = 9, but step 3 has 7 matchsticks.';
        if (eq(t, v => 2 * v)) return 'Close. Each new triangle adds 2 sticks. Test it with ' + mx('n = 1') + ': does 1 triangle have 2 sticks?';
        const v = missAt(t, triRule, [3, 2, 5, 4, 1, 6, 7, 8, 11]);
        return 'Test it with ' + mx('n = ' + v) + '. Step ' + v + ' has ' + triRule(v) + ' matchsticks, but your expression gives ' + evalToks(t, 'n', v) + '.';
      },
      win: () => mx(bd.toks().join(' ')) + ' works. In colour: 1 yellow stick to start, then a blue group of 2 for each triangle.',
      won() { bd.lock(); pat.colour(true); },
      solve() { bd.set(['1', '+', '2', '×', 'n']); },
      recap: () => 'Your rule for the triangles: ' + mx(bd.toks().join(' ')) + '.'
    };
  },
  then: {
    prompt: 'Use your rule. How many matchsticks does step 25 need?',
    why: () => wy(longTri('25 groups of 2', 'Step 25, too long to draw in full: 1 yellow stick, then 25 blue groups of 2.'),
      ['Blue sticks: ' + mx('2 × 25 = 50') + '.', 'Add the yellow stick: ' + mx('1 + 50 = 51') + '.']),
    build(stage, ctl, ctx) {
      const ans = makeAnswer(ctl, 'Matchsticks in step 25', ctx);
      return {
        check(attempt) {
          const v = ans.value();
          if (v === 51) return true;
          ans.mark('bad');
          if (isNaN(v)) return 'Type a whole number, using digits only.';
          if (v === 50) return '2 × 25 = 50 is only the blue groups. Which stick is missing?';
          if (v === 75) return '75 is 3 × 25, which gives every triangle 3 sticks of its own. Neighbours share a stick, so each triangle adds only 2.';
          if (v === 27) return '25 + 2 adds 2 just once. Step 25 has 25 blue groups of 2, so you need 2 × 25.';
          if (v === 52) return '52 is 2 × 26. Step 25 has 25 blue groups of 2, not 26, plus 1 yellow stick.';
          if (v === 76) return '76 is 1 + 3 × 25, the rule for the squares. A new triangle adds only 2 sticks.';
          return attempt < 2 ? 'Put ' + mx('n = 25') + ' into your rule.'
                             : 'Work out 2 × 25 for the blue groups, then add 1 for the yellow stick.';
        },
        win: () => mx('1 + 2 × 25 = 1 + 50 = 51') + '. The rule reaches step 25 without drawing 25 triangles.',
        won() { ans.mark('good'); ans.lock(); },
        solve() { ans.set(51); }
      };
    }
  }
},

/* 17 */ {
  prompt: 'Three students wrote rules for the matchstick squares. Who is right?',
  sub: 'Choose Agree or Disagree for each one.',
  why: () => wy(whySticks('sq', 2, { cls: () => '', pad: { t: 16, b: 18, r: 58 }, label: 'Step 2: 2 matchsticks on top, 2 on the bottom and 3 upright.',
      notes: wyW(40, -11, '2 on top') + wyW(40, 60, '2 on the bottom') + wyW(90, 24, '3 upright', 'start') }),
    ['Test each rule on step 2, which has 7 sticks. Leo: ' + mx('2 + 2 + 3 = 7') + ', a match.', 'Ruby: ' + mx('4 × 2 = 8') + ', one too many. Kai has to start from step 1 and add 3.']),
  build(stage, ctl, ctx) {
    stage.hidden = true;
    const claims = [
      { who: 'Kai', say: '“The rule is add 3 each time. That’s all you need for step 50.”', agree: false, hint: 'How many times would Kai add 3 to reach step 50? Does his rule go straight to any step?', why: 'Adding 3 only gets you to the next step: step 50 takes 49 jumps. ' + mx('1 + 3 × n') + ' gets there in one go.' },
      { who: 'Ruby', say: '“It’s ' + mx('4 × n') + ', because a square has 4 sides.”', agree: false, hint: 'Test Ruby’s rule on step 2. Count the sticks in two squares side by side.', why: 'Neighbouring squares share a side. Step 2 has 7 sticks, not 8.' },
      { who: 'Leo', say: '“It’s ' + mx('n + n + n + 1') + ': ' + mx('n') + ' on top, ' + mx('n') + ' on the bottom, ' + mx('n + 1') + ' standing up.”', agree: true, hint: 'Test Leo’s rule on step 2. Count the sticks on top, on the bottom and standing up.', why: 'The same sticks, grouped another way. It is equivalent to ' + mx('1 + 3 × n') + '.' }
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
      win: () => 'Leo has it. His ' + mx('n + n + n + 1') + ' is equivalent to ' + mx('1 + 3 × n') + '. Ruby forgot the shared sides. Kai described the change, not a rule for any step.',
      won() { locked = true; claims.forEach((c, i) => { rows[i].row.classList.remove('bad'); explain(i, 'good', c.why); rows[i].btns.forEach(b => { b.disabled = true; }); }); },
      solve() { claims.forEach((c, i) => { pick[i] = c.agree; paint(i); }); }
    };
  }
}
];

const SECTIONS = [[0, 'Matchsticks'], [4, 'Any step'], [8, 'Graph'], [11, 'Two ways'], [15, 'Wrap-up']];

// Finish screen: sets the prompt, sub-line and recap for this lesson.
function drawFinish() {
  promptEl.textContent = 'A rule tells you any step without drawing it.';
  subEl.hidden = false; subEl.textContent = 'Four things to remember:';
  ctl.replaceChildren(); stage.hidden = false;
  const dots = '<svg viewBox="0 0 60 50" aria-hidden="true"><path d="M4 2 V46 H58" fill="none" stroke="#2B2D2F" stroke-width="2"/><line class="g-fitl" x1="4" y1="43" x2="56" y2="4"/>' +
    [12, 24, 36, 48].map(x => '<circle class="g-pt" cx="' + x + '" cy="' + (43 - (x - 4) * 0.75) + '" r="3.5"/>').join('') + '</svg>';
  stage.replaceChildren(h('<ul class="recap">' +
    '<li><span class="art">' + sticksSVG('sq', 2, { colour: true }) + '</span><span>Look for the part that stays the same and the part that grows. In the squares, 1 stick stays and each step adds 3.</span></li>' +
    '<li><span class="art"><span class="tile num still">3</span><span class="tile var still">n</span></span><span>A rule links the step number to the total. ' + mx('1 + 3 × n') + ' gives step 50 in one go: 151. “Add 3 each time” only gets you to the next step.</span></li>' +
    '<li><span class="art">' + dots + '</span><span>When each step adds the same amount, the points on a graph lie on a straight line.</span></li>' +
    '<li><span class="art">' + plusSVG(1, 'none', 1) + '</span><span>Seeing a pattern another way gives an equivalent expression. ' + mx('1 + 4 × n') + ' and ' + mx('n + 1 + n + n + n') + ' always give the same number.</span></li></ul>'));
}
