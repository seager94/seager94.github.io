/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const h = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');

// "y = 2 × x + 1" -> maths markup. Single lower-case letters become variables; y gets its own colour.
function mx(s) {
  return '<span class="m">' + String(s).split(' ').map(t => /^[a-z]$/.test(t) ? '<i class="v' + (t === 'y' ? ' y' : '') + '">' + t + '</i>' : t).join(' ') + '</span>';
}

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
        g = node.cloneNode(true); g.removeAttribute('id'); g.style.width = node.getBoundingClientRect().width + 'px';
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
function makeSlider(host, name, min, max, value, onInput) {
  const row = h('<div class="slider"><label for="sl-' + name + '"><span class="m"><i class="v">' + name + '</i> = <span class="val">' + value + '</span></span></label>' +
    '<span class="end">' + min + '</span><input id="sl-' + name + '" type="range" min="' + min + '" max="' + max + '" step="1" value="' + value + '"><span class="end">' + max + '</span></div>');
  const inp = $('input', row), out = $('.val', row);
  const paint = () => { out.textContent = inp.value; inp.style.setProperty('--fill', ((inp.value - min) / (max - min) * 100) + '%'); };
  inp.addEventListener('input', () => { paint(); onInput(+inp.value); });
  paint();
  host.append(row);
  return { value: () => +inp.value };
}

function makeChoices(host, items, ctx) {
  const wrap = h('<div class="choices" role="group"></div>');
  const btns = items.map(html => {
    const b = h('<button type="button" class="choice" aria-pressed="false">' + html + '</button>');
    b.onclick = () => {
      btns.forEach(x => x.setAttribute('aria-pressed', x === b));
      btns.forEach(x => x.classList.remove('bad', 'good'));
      ctx.touch(true);
    };
    wrap.append(b);
    return b;
  });
  host.append(wrap);
  return {
    sel: () => btns.map((b, i) => b.getAttribute('aria-pressed') === 'true' ? i : -1).filter(i => i >= 0),
    mark: (i, c) => btns[i].classList.add(c),
    set: arr => btns.forEach((b, i) => { b.classList.remove('bad'); b.setAttribute('aria-pressed', arr.includes(i)); }),
    lock: () => btns.forEach(b => { b.disabled = true; })
  };
}
// A one-answer choice card: right is the index of the correct choice, why[i] the feedback for each wrong one.
function choiceCtl(ch, right, why, win) {
  return {
    check() { const s = ch.sel()[0]; if (s === right) return true; ch.mark(s, 'bad'); return why[s]; },
    win,
    won() { ch.mark(right, 'good'); ch.lock(); },
    solve() { ch.set([right]); }
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
    set: v => { inp.value = v; inp.classList.remove('bad'); },
    lock: () => { inp.disabled = true; }
  };
}
const DIGITS = 'Type a whole number, using digits only.';

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
// Number tiles that feed a machine.
function feedTray(host, mc, nums) {
  const tray = h('<div class="tiles"></div>');
  nums.forEach(n => {
    const b = h('<button type="button" class="tile num" aria-label="Feed in ' + n + '">' + n + '</button>');
    b.onclick = () => mc.feed(n);
    draggable(b, { accept: ['hopper'], onDrop: () => mc.feed(n) });
    tray.append(b);
  });
  host.append(tray);
  return { lock: () => tray.querySelectorAll('button').forEach(b => { b.disabled = true; }) };
}

// Table of values, one row per input. heads: header HTML for each column. rows: arrays of cell values; '?' marks the cell being asked about.
// The extra last column holds the step between outputs, drawn on the line between two rows.
function makeTable(host, heads, rows) {
  const t = h('<table class="tov"><thead><tr>' + heads.map(x => '<th>' + x + '</th>').join('') + '<th class="step"></th></tr></thead><tbody></tbody></table>');
  const body = $('tbody', t);
  const cell = v => v === '?' ? '<td class="ask">?</td>' : '<td>' + (v == null ? '' : v) + '</td>';
  const trs = rows.map(r => { const tr = h('<tr>' + r.map(cell).join('') + '<td class="step"></td></tr>'); body.append(tr); return tr; });
  host.append(t);
  return {
    set(i, j, v) { const c = trs[i].children[j]; c.className = 'pop'; c.textContent = v; },
    steps(list) { trs.forEach((tr, i) => { tr.lastElementChild.innerHTML = i && list[i - 1] ? '<span>' + list[i - 1] + '</span>' : ''; }); }
  };
}
// The same table laid across the page: an x row and a y row. hi marks one column green (the answer, in a Why? panel).
const rowTable = (xs, ys, heads, hi) => { const c = (v, i) => '<td' + (i === hi ? ' class="hi"' : v === '?' ? ' class="ask"' : '') + '>' + v + '</td>';
  return '<table class="tov across"><tr><th>' + (heads ? heads[0] : mx('x')) + '</th>' + xs.map(c).join('') +
    '</tr><tr><th>' + (heads ? heads[1] : mx('y')) + '</th>' + ys.map(c).join('') + '</tr></table>'; };

// Small first-quadrant grid. Tap a crossing to place a point, tap a point to remove it, or drag a point to move it.
// o: { xmax, ymax, fixed: points already drawn, max: most points the student may place }
function makeGrid(host, o, onChange) {
  const X = o.xmax, Y = o.ymax, ux = 30, uy = 15, L = 30, T = 24, W = X * ux, H = Y * uy, max = o.max || 8;
  const fixed = o.fixed || [];
  let pts = [], locked = false, drag = null;
  const svg = h('<svg class="grid" viewBox="0 0 ' + (L + W + 24) + ' ' + (T + H + 22) + '" role="img">' + gridBack(X, Y, ux, uy, L, T) + '<g class="g-pts"></g></svg>');
  const layer = $('.g-pts', svg), read = h('<div class="readout"></div>'), wrap = h('<div class="gwrap"></div>');
  wrap.append(svg, read);
  host.append(wrap);
  const cxy = p => 'cx="' + (L + p[0] * ux) + '" cy="' + (T + H - p[1] * uy) + '"';
  const fmt = p => '(' + p[0] + ', ' + p[1] + ')';
  function draw() {
    layer.innerHTML = fixed.map(p => '<circle class="g-p fx" r="5.5" ' + cxy(p) + '/>').join('') + pts.map(p => '<circle class="g-p' + (locked ? ' ok' : '') + '" r="6.5" ' + cxy(p) + '/>').join('');
    read.innerHTML = pts.length ? 'Your point: <span class="m">' + pts.map(fmt).join('&nbsp; ') + '</span>' : 'Tap a crossing to place a point';
    svg.setAttribute('aria-label', 'Grid with ' + plural(fixed.length + pts.length, 'point') + (pts.length ? '. Yours: ' + pts.map(fmt).join(', ') : ''));
  }
  const change = () => { draw(); if (onChange) onChange(pts.length); };
  const snap = e => {
    const m = svg.getScreenCTM(); if (!m) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    const a = Math.round((p.x - L) / ux), b = Math.round((T + H - p.y) / uy);
    return a >= 0 && a <= X && b >= 0 && b <= Y ? [a, b] : null;
  };
  const at = (a, b) => pts.findIndex(p => p[0] === a && p[1] === b);
  const isFixed = s => fixed.some(p => p[0] === s[0] && p[1] === s[1]);
  svg.addEventListener('pointerdown', e => {
    if (locked || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const s = snap(e); if (!s || isFixed(s)) return;
    e.preventDefault();
    const k = at(s[0], s[1]);
    if (k >= 0) drag = { k, moved: false };
    else { if (pts.length >= max) pts.pop(); pts.push(s); drag = { k: pts.length - 1, moved: true }; change(); }
    try { svg.setPointerCapture(e.pointerId); } catch (_) {}
  });
  svg.addEventListener('pointermove', e => {
    if (!drag) return;
    const s = snap(e); if (!s || at(s[0], s[1]) >= 0 || isFixed(s)) return;
    pts[drag.k] = s; drag.moved = true; change();
  });
  const end = e => {
    if (!drag) return;
    if (e.type === 'pointerup' && !drag.moved) { pts.splice(drag.k, 1); change(); }
    drag = null;
  };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
  draw();
  return { pts: () => pts.map(p => p.slice()), set(a) { pts = a.map(p => p.slice()); draw(); }, lock() { locked = true; svg.classList.add('locked'); draw(); } };
}
// Grid lines, axes and numbers, shared by the live grid and the small still one in the Why? panel.
function gridBack(X, Y, ux, uy, L, T) {
  const W = X * ux, H = Y * uy;
  let bg = '<rect class="g-bg" x="' + L + '" y="' + T + '" width="' + W + '" height="' + H + '"/>';
  for (let i = 1; i <= X; i++) bg += '<line class="g-l" x1="' + (L + i * ux) + '" y1="' + T + '" x2="' + (L + i * ux) + '" y2="' + (T + H) + '"/>' +
    '<text class="g-n" x="' + (L + i * ux) + '" y="' + (T + H + 15) + '" text-anchor="middle">' + i + '</text>';
  for (let j = 1; j <= Y; j++) bg += '<line class="g-l" x1="' + L + '" y1="' + (T + H - j * uy) + '" x2="' + (L + W) + '" y2="' + (T + H - j * uy) + '"/>' +
    (j % 2 ? '' : '<text class="g-n" x="' + (L - 6) + '" y="' + (T + H - j * uy + 4) + '" text-anchor="end">' + j + '</text>');
  return bg + '<text class="g-n" x="' + (L - 6) + '" y="' + (T + H + 15) + '" text-anchor="end">0</text>' +
    '<path class="g-ax" d="M' + L + ' ' + (T - 8) + 'V' + (T + H) + 'H' + (L + W + 8) + '"/>' +
    '<text class="g-v gx" x="' + (L + W + 12) + '" y="' + (T + H + 5) + '">x</text><text class="g-v gy" x="' + (L + 7) + '" y="' + (T - 5) + '">y</text>';
}
// Still grid for a Why? panel: grey points, one green point with its coordinates beside it, and the up-and-across step drawn in.
function gridStill(X, Y, pts, hi) {
  const ux = 30, uy = 10, L = 30, T = 22, H = Y * uy;
  const px = p => L + p[0] * ux, py = p => T + H - p[1] * uy, last = pts[pts.length - 1];
  return '<svg class="grid still fit" viewBox="0 0 ' + (L + X * ux + 24) + ' ' + (T + H + 20) + '" style="width:100%;max-height:168px" role="img" aria-label="Grid of the points, with (' + hi[0] + ', ' + hi[1] + ') in green">' +
    gridBack(X, Y, ux, uy, L, T) +
    '<path class="g-step" d="M' + px(last) + ' ' + py(last) + 'H' + px(hi) + 'V' + py(hi) + '"/>' +
    '<text class="g-sl" x="' + (px(last) + px(hi)) / 2 + '" y="' + (py(last) + 13) + '" text-anchor="middle">1</text>' +
    '<text class="g-sl" x="' + (px(hi) + 6) + '" y="' + ((py(last) + py(hi)) / 2 + 4) + '">2</text>' +
    pts.map(p => '<circle class="g-p fx" r="5" cx="' + px(p) + '" cy="' + py(p) + '"/>').join('') +
    '<circle class="g-p ok" r="6" cx="' + px(hi) + '" cy="' + py(hi) + '"/>' +
    '<text class="g-lab" x="' + (px(hi) - 10) + '" y="' + (py(hi) + 2) + '" text-anchor="end">(' + hi[0] + ', ' + hi[1] + ')</text></svg>';
}

/* ---------- matchstick patterns ---------- */
// 'hex' is hexagons in a row, 'tri' is triangles in a row. Neighbours share a stick.
// Stick 0 is the part that stays the same. Group k (k = 1 ... n) is the part that step k adds.
const HEX_W = 51.96, HEX_H = 60, TRI_S = 40, TRI_H = 34.64;
function stickList(kind, n) {
  const out = [];
  if (kind === 'hex') {
    out.push({ g: 0, a: [0, 45, 0, 15] });
    for (let k = 1; k <= n; k++) {
      const x = (k - 1) * HEX_W, m = x + HEX_W / 2, r = x + HEX_W;
      [[x, 15, m, 0], [m, 0, r, 15], [r, 15, r, 45], [r, 45, m, 60], [m, 60, x, 45]].forEach(a => out.push({ g: k, a }));
    }
    return out;
  }
  const s = TRI_S, B = j => [j * s, TRI_H], T = j => [(j + 0.5) * s, 0];
  out.push({ g: 0, a: [0, TRI_H, s / 2, 0] });
  for (let k = 1; k <= n; k++) {
    if (k % 2) { const j = (k - 1) / 2; out.push({ g: k, a: B(j).concat(B(j + 1)) }, { g: k, a: T(j).concat(B(j + 1)) }); }
    else { const j = k / 2; out.push({ g: k, a: T(j - 1).concat(T(j)) }, { g: k, a: B(j).concat(T(j)) }); }
  }
  return out;
}
// o.max sets the drawing width (so the pattern grows instead of shrinking), o.colour shows yellow = stays, blue = grows,
// o.labels writes how many sticks each part has, o.fit = px makes a still picture that fills the width up to that height.
function sticksSVG(kind, n, o) {
  o = o || {};
  const max = o.max || n, hex = kind === 'hex', P = 12, padL = o.labels && hex ? 26 : P;
  const lab = o.labels && !hex ? 24 : 0;
  const W = (hex ? max * HEX_W : (max + 1) * TRI_S / 2) + padL + P, H = (hex ? HEX_H : TRI_H) + 2 * P + lab;
  const size = o.fit ? 'width:100%;max-height:' + o.fit + 'px' : 'width:' + (W * (o.scale || 0.085)).toFixed(1) + 'rem';
  let g = '<svg class="sticks' + (o.fit ? ' fit' : '') + '" viewBox="' + (-padL) + ' ' + (-P) + ' ' + W + ' ' + H + '" style="' + size + '" role="img" aria-label="Step ' + n + ': ' +
    plural(n, hex ? 'hexagon' : 'triangle') + ' made of matchsticks, in a row">';
  stickList(kind, n).forEach(st => {
    const L = 'x1="' + st.a[0] + '" y1="' + st.a[1] + '" x2="' + st.a[2] + '" y2="' + st.a[3] + '"';
    g += '<g class="stk' + (o.colour ? (st.g ? ' v' : ' k') : '') + (o.grow != null && st.g > o.grow ? ' grow' : '') + '"><line class="st-o" ' + L + '/><line class="st-i" ' + L + '/></g>';
  });
  if (o.labels && hex) {
    g += '<text class="st-lab k" x="-14" y="36">1</text>';
    for (let k = 1; k <= n; k++) g += '<text class="st-lab v" x="' + (k - 0.5) * HEX_W + '" y="36">5</text>';
  } else if (o.labels) {
    const y = TRI_H + 26;
    g += '<text class="st-lab k" x="0" y="' + y + '">1</text>';
    for (let k = 1; k <= n; k++) g += '<text class="st-lab v" x="' + k * TRI_S / 2 + '" y="' + y + '">2</text>';
  }
  return g + '</svg>';
}
function makeSticks(host, kind, n0, o) {
  o = Object.assign({}, o);
  const box = h('<div class="stk-box"></div>');
  host.append(box);
  let n = n0, prev = null;
  const draw = () => { box.innerHTML = sticksSVG(kind, n, Object.assign({}, o, { grow: prev })); };
  draw();
  return {
    set(v) { prev = v > n ? n : null; n = v; draw(); },
    colour(on) { o.colour = on; prev = null; draw(); }
  };
}

// Tile pattern: a yellow base of 3 tiles with a blue column of n tiles standing on each end.
// view 'tom' outlines two towers and the tile between them; 'parts' and 'tom' with o.nums write the count beside each group.
function towerSVG(n, o) {
  o = o || {};
  const max = o.max || n, p = 22, c = 19, ML = o.nums ? 26 : 8, MT = o.nums && o.view === 'tom' ? 4 : 6, MB = o.nums ? 22 : 6;
  const W = 2 * p + c, H = max * p + c, top = (max - n) * p;
  const cell = (col, y, cls) => '<rect class="pc ' + cls + '" x="' + col * p + '" y="' + y + '" width="' + c + '" height="' + c + '" rx="3"/>';
  const box = (col, y, rows) => '<rect class="grp" x="' + (col * p - 3.5) + '" y="' + (y - 3.5) + '" width="' + (c + 7) + '" height="' + ((rows - 1) * p + c + 7) + '" rx="5"/>';
  const size = o.fit ? 'width:100%;max-height:' + o.fit + 'px' : '';
  let g = '<svg class="tower' + (o.fit ? ' fit' : '') + '" viewBox="' + (-ML) + ' ' + (-MT) + ' ' + (W + 2 * ML) + ' ' + (H + MT + MB) + '"' + (size ? ' style="' + size + '"' : ' style="--ar:' + ((W + 2 * ML) / (H + MT + MB)).toFixed(3) + '"') +
    ' role="img" aria-label="Step ' + n + ': a base of 3 yellow tiles with a column of ' + plural(n, 'blue tile') + ' on each end">';
  for (let r = 0; r < n; r++) g += cell(0, top + r * p, 'v') + cell(2, top + r * p, 'v');
  for (let k = 0; k < 3; k++) g += cell(k, max * p, 'k');
  const midY = top + (n * p) / 2 + 2;
  if (o.view === 'tom') {
    g += box(0, top, n + 1) + box(2, top, n + 1) + box(1, max * p, 1);
    if (o.nums) g += '<text class="tlab" x="-9" y="' + (midY + p / 2 + 4) + '" text-anchor="end">' + (n + 1) + '</text><text class="tlab" x="' + (W + 9) + '" y="' + (midY + p / 2 + 4) + '">' + (n + 1) + '</text>' +
      '<text class="tlab" x="' + (p + c / 2) + '" y="' + (H + 20) + '" text-anchor="middle">1</text>';
  } else if (o.nums) {
    g += '<text class="tlab v" x="-7" y="' + (midY + 4) + '" text-anchor="end">' + n + '</text><text class="tlab v" x="' + (W + 7) + '" y="' + (midY + 4) + '">' + n + '</text>' +
      '<text class="tlab k" x="' + (p + c / 2) + '" y="' + (H + 18) + '" text-anchor="middle">3</text>';
  }
  return g + '</svg>';
}
const towerRule = n => 3 + 2 * n;
// The tower pattern with a slider and a running total (cards 4 and 8).
function towerStage(stage, ctl, n0, view) {
  const row = h('<div class="tw-row"><div></div><div class="readout"></div></div>'), [box, rd] = row.children;
  stage.append(row);
  const show = v => { box.innerHTML = towerSVG(v, { max: 5, view }); rd.innerHTML = 'Step ' + v + '<br>Tiles altogether: <b>' + towerRule(v) + '</b>'; };
  show(n0);
  makeSlider(ctl, 'n', 1, 5, n0, show);
}

// Three students each make a claim; the student agrees or disagrees with each.
function makeClaims(host, claims, ctx) {
  const pick = claims.map(() => null);
  let locked = false;
  const list = h('<div class="claims tight"></div>');
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
    const w = $('.claim-note', r.row); if (w) w.remove();
  }
  const explain = (i, cls, txt) => { rows[i].row.classList.add(cls); const w = $('.claim-note', rows[i].row); if (w) w.remove(); rows[i].row.append(h('<p class="claim-note">' + txt + '</p>')); };
  host.append(list);
  return {
    wrong: () => claims.map((c, i) => pick[i] !== c.agree ? i : -1).filter(i => i >= 0),
    hint: i => explain(i, 'bad', claims[i].hint),
    finish() { locked = true; claims.forEach((c, i) => { rows[i].row.classList.remove('bad'); explain(i, 'good', c.why); rows[i].btns.forEach(b => { b.disabled = true; }); }); },
    solve() { claims.forEach((c, i) => { pick[i] = c.agree; paint(i); }); }
  };
}

// Why? panel: a small picture, then at most two lines of working.
const whyBox = (fig, lines) => '<div class="whyfig">' + fig + '</div>' + lines.map(l => '<p class="whyline">' + l + '</p>').join('');
const tableHTML = (heads, rows, steps) => { const d = document.createElement('div'); makeTable(d, heads, rows).steps(steps); d.firstElementChild.classList.add('sm'); return d.innerHTML; };

/* ---------- cards ---------- */
const hexRule = n => 1 + 5 * n;
const MACH = x => 4 * x + 3;                   // the hidden machine on card 5
const KAYAK = x => 5 * x + 6;                  // card 7: $6 booking fee, $5 an hour
const DOTS = [[1, 4], [2, 6], [3, 8], [4, 10]]; // card 9: y = 2 × x + 2
const pt = p => '<span class="m">(' + p[0] + ', ' + p[1] + ')</span>';

const cards = [

/* 1 */ {
  bridge: true,
  prompt: 'Level Check: Patterns and rules',
  sub: 'There are 8 questions, mixed from the two lessons in this unit. You get two tries at each one, then it shows the answer and moves on.'
},

/* 2 */ {
  from: 'growing-patterns',
  prompt: 'Each step adds one more hexagon. How many matchsticks does each new hexagon add?',
  sub: 'The slider sets the step number, ' + mx('n') + '. Step ' + mx('n') + ' has ' + mx('n') + ' hexagons in a row.',
  why: () => whyBox(sticksSVG('hex', 2, { colour: true, labels: true, fit: 120 }), [
    'A hexagon alone has 6 sides, but a new one joins on, so its left side is already there.',
    'That leaves 5 new matchsticks for each new hexagon.']),
  build(stage, ctl, ctx) {
    const pat = makeSticks(stage, 'hex', 2, { max: 6 });
    makeSlider(ctl, 'n', 1, 6, 2, v => pat.set(v));
    const ans = makeAnswer(ctl, 'Matchsticks for each new hexagon', ctx);
    return {
      pat,
      check(attempt) {
        const v = ans.value();
        if (v === 5) return true;
        ans.mark('bad');
        if (isNaN(v)) return DIGITS;
        if (v === 6) return 'A hexagon on its own has 6 sides. Look at where the new hexagon joins on. Is its left side already there?';
        if (v === 11) return '11 is every matchstick in step 2. Count only the ones that appear when you go from step 2 to step 3.';
        if (v === 1) return 'One more hexagon appears each time. How many matchsticks does it take to draw it?';
        return 'Move the slider up by one and count only the matchsticks that appear.';
      },
      win: () => '5. The new hexagon borrows its left side from the hexagon before it, so it needs only 5 more.',
      recap: () => 'Each new hexagon adds 5 matchsticks.',
      won() { ans.mark('good'); ans.lock(); },
      solve() { ans.set(5); }
    };
  },
  then: {
    prompt: 'How many matchsticks are there in step 20?',
    sub: 'The slider stops at 6, so you can’t draw step 20. Find a rule.',
    why: () => whyBox(sticksSVG('hex', 3, { colour: true, labels: true, fit: 120 }), [
      '1 yellow stick stays. Each hexagon adds a blue group of 5: step ' + mx('n') + ' has ' + mx('1 + 5 × n') + '.',
      'Step 20: ' + mx('1 + 5 × 20 = 1 + 100 = 101') + '.']),
    build(stage, ctl, ctx, p1) {
      makeSlider(ctl, 'n', 1, 6, 2, v => p1.pat.set(v));
      p1.pat.set(2);
      const ans = makeAnswer(ctl, 'Matchsticks in step 20', ctx);
      return {
        check(attempt) {
          const v = ans.value();
          if (v === 101) return true;
          ans.mark('bad');
          if (isNaN(v)) return DIGITS;
          if (v === 120) return '120 is 6 × 20, which gives every hexagon 6 sticks of its own. Neighbours share a stick, so each hexagon adds only 5.';
          if (v === 100) return '5 × 20 = 100 counts the sticks each hexagon adds. Look at the far left of the pattern. Which stick is missing?';
          if (v === 25) return '20 + 5 adds 5 just once. Step 20 has 20 hexagons, and each one adds 5.';
          if (v === 106) return '106 is 6 + 5 × 20. The first hexagon is one of the 20, so that counts its 5 sticks twice.';
          if (v === 96) return '96 is 1 + 5 × 19. Step 20 has 20 hexagons, not 19.';
          return attempt < 2 ? 'Find the part that stays the same and the part that grows. Step 1 has 6 sticks and step 2 has 11.'
                             : 'One stick starts the pattern, then every hexagon adds 5. How many hexagons are in step 20?';
        },
        win: () => mx('1 + 5 × 20 = 101') + '. One stick starts the pattern, then each of the 20 hexagons adds 5.',
        won() { ans.mark('good'); ans.lock(); p1.pat.colour(true); },
        solve() { ans.set(101); }
      };
    }
  }
},

/* 3 */ {
  from: 'tables-to-rules',
  prompt: 'Which rule fits every row of this table?',
  why: () => whyBox(tableHTML(['Input ' + mx('x'), mx('3 × x'), 'Output ' + mx('y')], [1, 2, 3, 4].map(x => [x, 3 * x, 3 * x + 4]), ['+3', '+3', '+3']), [
    'The inputs go up by 1 and the outputs go up by 3, so the rule multiplies by 3.',
    'Each output is 4 more than ' + mx('3 × x') + ', so ' + mx('y = 3 × x + 4') + '. Row 4: 3 × 4 + 4 = 16.']),
  build(stage, ctl, ctx) {
    const tb = makeTable(stage, ['Input ' + mx('x'), 'Output ' + mx('y')], [[1, 7], [2, 10], [3, 13], [4, 16]]);
    const ch = makeChoices(ctl, [mx('y = x + 3'), mx('y = 7 × x'), mx('y = 3 × x'), mx('y = 3 × x + 4')], ctx);
    const c = choiceCtl(ch, 3, [
      'The outputs do go up by 3, but that is the step down the column. Test row 1: 1 + 3 = 4, and the output is 7.',
      'It works for row 1, because 7 × 1 = 7. Test row 2: 7 × 2 = 14, and the output is 10.',
      mx('3 × x') + ' gives 3, 6, 9, 12. Compare those with the outputs. How much is missing each time?'
    ], () => mx('y = 3 × x + 4') + ' fits every row: 3 × 1 + 4 = 7 and 3 × 4 + 4 = 16. The step of 3 tells you to multiply by 3, not to add 3.');
    const won = c.won;
    c.won = () => { won(); tb.steps(['+3', '+3', '+3']); };
    return c;
  }
},

/* 4 */ {
  from: 'growing-patterns',
  prompt: 'Build an expression for the number of tiles in step ' + mx('n') + '.',
  sub: 'Each blue column has ' + mx('n') + ' tiles. Drag or tap tiles into the box. Tap one in the box to remove it.',
  why: () => whyBox(towerSVG(4, { nums: true, fit: 150 }), [
    'The 3 yellow tiles stay the same. The two blue columns grow: each one has ' + mx('n') + ' tiles.',
    'Step 4: 3 + 2 × 4 = 11. Step ' + mx('n') + ': ' + mx('3 + 2 × n') + '.']),
  build(stage, ctl, ctx) {
    towerStage(stage, ctl, 2);
    const bd = makeBuilder(stage, ctl, ['n', '+', '×', '1', '2', '3'], ctx);
    const eq = (t, f) => [2, 5, 11].every(v => evalToks(t, 'n', v) === f(v));
    return {
      check() {
        const t = bd.toks();
        if (evalToks(t, 'n', 5) == null) return 'That isn’t a complete expression yet. Put + or × between each pair of tiles.';
        if (eq(t, towerRule)) return true;
        if (!t.includes('n')) return 'Your expression has no ' + mx('n') + ', so it gives the same total at every step. The columns grow, so ' + mx('n') + ' must be in it.';
        if (eq(t, v => 2 * v)) return 'That counts the two blue columns. What about the yellow tiles along the bottom?';
        if (eq(t, v => v + 3)) return 'That is the yellow base and one blue column. How many blue columns are there?';
        if (eq(t, v => v + 2)) return mx('n + 2') + ' is “add 2 each time” written with a letter, but it only adds 2 once. Test it with ' + mx('n = 2') + ': 2 + 2 = 4, but step 2 has 7 tiles.';
        if (eq(t, v => 3 * v)) return 'The 3 yellow tiles don’t grow, so they are not multiplied by ' + mx('n') + '. Test it with ' + mx('n = 2') + ': 3 × 2 = 6, but step 2 has 7 tiles.';
        if (eq(t, v => 2 * v + 1)) return 'Close: the blue part is right. Count the yellow tiles again. Step 1 has 5 tiles altogether.';
        const v = [2, 1, 3, 4, 5, 11].find(k => evalToks(t, 'n', k) !== towerRule(k));
        return 'Test it with ' + mx('n = ' + v) + '. Step ' + v + ' has ' + towerRule(v) + ' tiles, but your expression gives ' + evalToks(t, 'n', v) + '.';
      },
      win: () => mx(bd.toks().join(' ')) + ' works: 3 yellow tiles that stay the same, plus 2 blue columns of ' + mx('n') + ' tiles.',
      won() { bd.lock(); },
      solve() { bd.set(['3', '+', '2', '×', 'n']); }
    };
  }
},

/* 5 */ {
  from: 'tables-to-rules',
  prompt: 'This machine hides a rule. Feed it some inputs, then work out what it gives for 10.',
  sub: 'Tap a number, or drag it into the machine. There is no 10 tile: you need the rule.',
  why: () => whyBox('<div class="why-mach"><span class="tile num still">10</span><span class="m">→</span><span class="mbox">× 4, then + 3</span><span class="m">→</span><span class="tile num still">43</span></div>' +
    rowTable([1, 2, 3, 4, 5, 10], [1, 2, 3, 4, 5, 10].map(MACH), null, 5), [
    'Inputs up by 1, outputs up by 4: multiply by 4. Then 4 × 1 = 4 and 1 gives 7, so add 3.',
    mx('y = 4 × x + 3') + ', so 10 gives 4 × 10 + 3 = 43.']),
  build(stage, ctl, ctx) {
    const mc = makeMachine(stage, MACH);
    const tray = feedTray(ctl, mc, [1, 2, 3, 4, 5]);
    const ans = makeAnswer(ctl, 'When 10 goes in, out comes', ctx);
    return {
      check(attempt) {
        const v = ans.value();
        if (v === 43) return true;
        ans.mark('bad');
        if (isNaN(v)) return DIGITS;
        if (mc.fed.length < 2) return 'Feed the machine at least two inputs that are next to each other, such as 1 and 2. Then look at how the output changes.';
        if (v === 14) return '14 is 10 + 4. The 4 is how much the outputs go up each time, not what the machine adds to an input. Test it: 1 + 4 = 5, but 1 gives 7.';
        if (v === 27) return '27 is 4 more than the output for 5, so it is the output for 6. Input 10 is further on than that.';
        if (v === 40) return '40 is 4 × 10, the first part of the rule. Test it on input 1: 4 × 1 = 4, but 1 gives 7. What else does the machine do?';
        if (v === 46) return '46 is double the output for 5. Doubling the input doesn’t double the output here: 1 gives 7, but 2 gives 11, not 14.';
        if (v === 52) return '52 is 4 × 13: you added 3 before you multiplied. The machine multiplies first, then adds.';
        if (v === 13) return '13 is 10 + 3. The machine also multiplies. How much do the outputs go up by each time?';
        return attempt < 2 ? 'Feed in 1, 2 and 3. How much does the output go up each time? That tells you what to multiply by.'
                           : 'The outputs go up by 4, so start with 4 × the input. How much more than 4 × 1 is the output for 1?';
      },
      win: () => '43. The outputs go up by 4, so the rule multiplies by 4, then adds 3: ' + mx('y = 4 × x + 3') + ', and 4 × 10 + 3 = 43.',
      won() { ans.mark('good'); ans.lock(); tray.lock(); },
      solve() { ans.set(43); }
    };
  }
},

/* 6 */ {
  from: 'growing-patterns',
  prompt: 'Three students wrote rules for these matchstick triangles. Who is right?',
  sub: 'Step ' + mx('n') + ' has ' + mx('n') + ' triangles in a row. Choose Agree or Disagree for each one.',
  why: () => whyBox(sticksSVG('tri', 3, { colour: true, labels: true, fit: 110 }), [
    'Step 3 is 1 + 2 + 2 + 2 = 7. One stick starts the pattern, then each triangle adds 2: ' + mx('1 + 2 × n') + '.',
    'Zac counts 3 flat and 3 + 1 sloping: ' + mx('n + n + 1') + ', equivalent to ' + mx('1 + 2 × n') + '.']),
  build(stage, ctl, ctx) {
    stage.append(h('<div class="steps3">' + [1, 2, 3].map(n => '<figure>' + sticksSVG('tri', n, { scale: 0.065 }) + '<figcaption>Step ' + n + '</figcaption></figure>').join('') + '</div>'));
    const cl = makeClaims(ctl, [
      { who: 'Mia', say: '“Add 2 each time. That takes me straight to step 40.”', agree: false, hint: 'How many times would Mia have to add 2 to get from step 1 to step 40?', why: 'That takes 39 jumps. ' + mx('1 + 2 × n') + ' gets there in one go.' },
      { who: 'Dan', say: '“It’s ' + mx('3 × n') + ', because a triangle has 3 sides.”', agree: false, hint: 'Test Dan’s rule on step 2. Count the sticks in the picture.', why: 'Neighbours share a side. Step 2 has 5 sticks, not 6.' },
      { who: 'Zac', say: '“It’s ' + mx('n + n + 1') + ': ' + mx('n') + ' flat sticks and ' + mx('n + 1') + ' sloping ones.”', agree: true, hint: 'Test Zac’s rule on step 3. Count the flat sticks, then the sloping ones.', why: 'Step 3: 3 flat and 4 sloping makes 7.' }
    ], ctx);
    const NAMES = ['Mia', 'Dan', 'Zac'];
    return {
      check() {
        const wrong = cl.wrong();
        if (!wrong.length) return true;
        wrong.forEach(cl.hint);
        return wrong.length === 1 ? 'Look again at what ' + NAMES[wrong[0]] + ' said. The note under it gives a hint.'
                                  : 'Look again at ' + wrong.map(i => NAMES[i]).join(' and ') + '. The notes under them give hints.';
      },
      win: () => 'Zac has it. Dan forgot the shared sides. Mia described the change from step to step, not a rule for any step.',
      won() { cl.finish(); },
      solve() { cl.solve(); }
    };
  }
},

/* 7 */ {
  from: 'tables-to-rules',
  prompt: 'Hiring a kayak costs a booking fee plus the same price for each hour. What do 8 hours cost?',
  sub: mx('x') + ' is the number of hours. ' + mx('y') + ' is the total cost in dollars. The table skips some hours.',
  why: () => whyBox(tableHTML(['Hours ' + mx('x'), mx('5 × x'), 'Cost ($) ' + mx('y')], [[1, 5, 11], [2, 10, 16], [3, 15, 21], [8, 40, '<b class="hi">46</b>']], ['+5', '+5', '']), [
    'Each extra hour adds $5: multiply by 5. One hour is $11 and 5 × 1 = 5, so the fee is $6.',
    mx('y = 5 × x + 6') + ', so 8 hours cost 5 × 8 + 6 = 46 dollars.']),
  build(stage, ctl, ctx) {
    const tb = makeTable(stage, ['Hours ' + mx('x'), 'Cost ($) ' + mx('y')], [[1, 11], [2, 16], [3, 21], [8, '?']]);
    const ans = makeAnswer(ctl, 'Cost of 8 hours ($)', ctx);
    return {
      check(attempt) {
        const v = ans.value();
        if (v === 46) return true;
        ans.mark('bad');
        if (isNaN(v)) return DIGITS;
        if (v === 26) return '26 is $5 more than the row above, so it is the cost of 4 hours. The hours jump from 3 to 8 here. Find the rule that links hours to cost.';
        if (v === 40) return '40 is 5 × 8, the cost of the hours alone. Test that idea on 1 hour: 5 × 1 = 5, but it costs $11. What is missing?';
        if (v === 13) return '13 is 8 + 5. The $5 is added for every hour, not once. Test it: 1 + 5 = 6, but 1 hour costs $11.';
        if (v === 88) return '88 is 11 × 8, which charges $11 for every hour. The second hour only added $5. The $11 includes the booking fee.';
        if (v === 56) return '56 is $10 too much. Test your rule on 1 hour first: it must give $11.';
        return attempt < 2 ? 'How much does each extra hour add? Use that to build a rule, then test it on a row you know.'
                           : 'Each hour adds $5, so start with 5 × ' + mx('x') + '. How much more than 5 × 1 is the cost of 1 hour?';
      },
      win: () => '$46. Each hour adds $5 and the booking fee is $6, so ' + mx('y = 5 × x + 6') + ' and 5 × 8 + 6 = 46.',
      won() { tb.set(3, 1, 46); ans.mark('good'); ans.lock(); },
      solve() { ans.set(46); }
    };
  }
},

/* 8 */ {
  from: 'growing-patterns',
  prompt: 'Tom sees two towers with one tile between them. Which expression is Tom’s?',
  sub: 'Move the slider to see how each of Tom’s groups grows.',
  why: () => whyBox(towerSVG(3, { view: 'tom', nums: true, fit: 140 }), [
    'Each tower is a blue column of ' + mx('n') + ' tiles with 1 yellow tile under it. In step 3 that is 4 + 4 + 1 = 9.',
    mx('n + 1 + n + 1 + 1') + ' has two lots of ' + mx('n') + ' and three 1s, so it is equivalent to ' + mx('3 + 2 × n') + '.']),
  build(stage, ctl, ctx) {
    towerStage(stage, ctl, 3, 'tom');
    const ch = makeChoices(ctl, [mx('n + n + 1'), mx('n + 1 + n + 1 + 1'), mx('3 × n'), mx('n + 1 + n + 1')], ctx);
    return choiceCtl(ch, 1, [
      'Each tower is taller than ' + mx('n') + ': it has a yellow tile under its blue column. Test step 3: 3 + 3 + 1 = 7, but there are 9 tiles.',
      '',
      'The three groups are not all ' + mx('n') + ' tall. The middle group is always 1 tile, and each tower has one more tile than ' + mx('n') + '.',
      'That is the two towers. Tom also sees the tile between them.'
    ], () => 'Each tower is ' + mx('n + 1') + ' tiles, plus the tile between them. Same tiles as ' + mx('3 + 2 × n') + ', grouped another way: the two are equivalent.');
  }
},

/* 9 */ {
  from: 'tables-to-rules',
  prompt: 'The table’s first four rows are plotted. Plot the point for input 5.',
  sub: 'Tap the grid to place your point. Drag to move it.',
  why: () => whyBox(gridStill(6, 14, DOTS, [5, 12]), [
    'Each point is 1 across and 2 up from the one before, so from ' + pt([4, 10]) + ' the next point is ' + pt([5, 12]) + '.',
    'The rule agrees: ' + mx('y = 2 × x + 2') + ', and 2 × 5 + 2 = 12.']),
  build(stage, ctl, ctx) {
    const duo = h('<div class="duo"></div>');
    stage.append(duo);
    duo.append(h(rowTable([1, 2, 3, 4, 5], [4, 6, 8, 10, '?'])));
    const gr = makeGrid(duo, { xmax: 6, ymax: 14, fixed: DOTS, max: 1 }, n => ctx.touch(n > 0));
    return {
      check(attempt) {
        const p = gr.pts()[0];
        if (p[0] === 5 && p[1] === 12) return true;
        if (p[0] !== 5) return 'Your point is ' + p[0] + ' across. Input 5 means 5 across.';
        if (p[1] === 11) return 'From ' + pt([4, 10]) + ', your point goes up 1. How far up does each step between the other points go?';
        if (p[1] === 10) return 'That is level with ' + pt([4, 10]) + ', but the points climb as they go across. How far does each step climb?';
        if (p[1] === 7) return '7 is 5 + 2, which adds the step to the input. The step of 2 is from one output to the next: start from 10.';
        if (p[1] === 5) return 'Your point is as high as its input. Go up to the output instead. What comes after 4, 6, 8, 10?';
        return attempt < 2 ? 'Look at how far up each point is from the one before it. Your point should follow the same steps.'
                           : 'The outputs are 4, 6, 8, 10. What is the next one? Go 5 across and that far up.';
      },
      win: () => pt([5, 12]) + '. Each point is 1 across and 2 up from the one before, so the points sit in a straight line.',
      won() { gr.lock(); },
      solve() { gr.set([[5, 12]]); }
    };
  }
}
];

const SECTIONS = [[0, 'Level Check']];
