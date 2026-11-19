/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const h = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');

// "b + b + 3" -> maths markup. Single lower-case letters become variables; y gets its own colour.
function mx(s) {
  return '<span class="m">' + String(s).split(' ').map(t => /^[a-z]$/.test(t) ? '<i class="v' + (t === 'y' ? ' y' : '') + '">' + t + '</i>' : t).join(' ') + '</span>';
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
  let busy = false, timer = 0;
  const put = (slot, html) => { const old = $('.tile', slot); if (old) old.remove(); if (html) slot.append(h(html)); };
  return {
    fed,
    feed(n) {
      if (busy) return;
      busy = true;
      put(inS, numTile(n)); put(outS, null);
      body.classList.remove('run'); void body.offsetWidth; body.classList.add('run');
      timer = setTimeout(() => {
        put(inS, null); put(outS, numTile(rule(n)));
        fed.push(n);
        log.append(h('<span class="pair pop">' + n + ' → ' + rule(n) + '</span>'));
        while (log.children.length > 6) log.firstElementChild.remove();
        busy = false;
        if (onFeed) onFeed();
      }, 600);
    },
    // Stop any run and show fixed tiles in the two slots.
    still(inHTML, outHTML) { clearTimeout(timer); busy = false; body.classList.remove('run'); put(inS, inHTML); put(outS, outHTML); }
  };
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
    insert(at, r) { const tr = h('<tr class="pop">' + r.map(cell).join('') + '<td class="step"></td></tr>'); body.insertBefore(tr, trs[at] || null); trs.splice(at, 0, tr); },
    steps(list) { trs.forEach((tr, i) => { tr.lastElementChild.innerHTML = i && list[i - 1] ? '<span>' + list[i - 1] + '</span>' : ''; }); }
  };
}
// The same table laid across the page: an x row and a y row.
const rowTable = (xs, ys) => '<table class="tov across"><tr><th>' + mx('x') + '</th>' + xs.map(v => '<td>' + v + '</td>').join('') +
  '</tr><tr><th>' + mx('y') + '</th>' + ys.map(v => '<td>' + v + '</td>').join('') + '</tr></table>';

// Small first-quadrant grid. Tap a crossing to place a point, tap a point to remove it, or drag a point to move it.
// o: { xmax, ymax, fixed: points already drawn, max: most points the student may place }
function makeGrid(host, o, onChange) {
  const X = o.xmax, Y = o.ymax, ux = 30, uy = 15, L = 30, T = 24, W = X * ux, H = Y * uy, max = o.max || 8;
  const fixed = o.fixed || [];
  let pts = [], locked = false, drag = null;
  let bg = '<rect class="g-bg" x="' + L + '" y="' + T + '" width="' + W + '" height="' + H + '"/>';
  for (let i = 1; i <= X; i++) bg += '<line class="g-l" x1="' + (L + i * ux) + '" y1="' + T + '" x2="' + (L + i * ux) + '" y2="' + (T + H) + '"/>' +
    '<text class="g-n" x="' + (L + i * ux) + '" y="' + (T + H + 15) + '" text-anchor="middle">' + i + '</text>';
  for (let j = 1; j <= Y; j++) bg += '<line class="g-l" x1="' + L + '" y1="' + (T + H - j * uy) + '" x2="' + (L + W) + '" y2="' + (T + H - j * uy) + '"/>' +
    (j % 2 ? '' : '<text class="g-n" x="' + (L - 6) + '" y="' + (T + H - j * uy + 4) + '" text-anchor="end">' + j + '</text>');
  bg += '<text class="g-n" x="' + (L - 6) + '" y="' + (T + H + 15) + '" text-anchor="end">0</text>' +
    '<path class="g-ax" d="M' + L + ' ' + (T - 8) + 'V' + (T + H) + 'H' + (L + W + 8) + '"/>' +
    '<text class="g-v gx" x="' + (L + W + 12) + '" y="' + (T + H + 5) + '">x</text><text class="g-v gy" x="' + (L + 7) + '" y="' + (T - 5) + '">y</text>';
  const svg = h('<svg class="grid" viewBox="0 0 ' + (L + W + 24) + ' ' + (T + H + 22) + '" role="img">' + bg + '<g class="g-pts"></g></svg>');
  const layer = $('.g-pts', svg), read = h('<div class="readout"></div>'), wrap = h('<div class="gwrap"></div>');
  wrap.append(svg, read);
  host.append(wrap);
  const cxy = p => 'cx="' + (L + p[0] * ux) + '" cy="' + (T + H - p[1] * uy) + '"';
  const fmt = p => '(' + p[0] + ', ' + p[1] + ')';
  function draw() {
    const mine = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    layer.innerHTML = fixed.map(p => '<circle class="g-p fx" r="5.5" ' + cxy(p) + '/>').join('') + pts.map(p => '<circle class="g-p" r="6.5" ' + cxy(p) + '/>').join('');
    read.innerHTML = mine.length ? (mine.length === 1 ? 'Your point: ' : 'Your points: ') + '<span class="m">' + mine.map(fmt).join('&nbsp; ') + '</span>' : 'Tap a crossing to place a point';
    svg.setAttribute('aria-label', 'Grid with ' + plural(fixed.length + pts.length, 'point') + (mine.length ? '. Yours: ' + mine.map(fmt).join(', ') : ''));
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
  return { pts: () => pts.map(p => p.slice()), set(a) { pts = a.map(p => p.slice()); draw(); }, lock() { locked = true; svg.classList.add('locked'); } };
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

/* ---------- cards ---------- */
const RULE = x => 2 * x + 1;                    // the hidden machine: y = 2 × x + 1
const IN5 = [1, 2, 3, 4, 5];
const ROWS5 = IN5.map(x => [x, RULE(x)]);
const HEADS = ['Input ' + mx('x'), 'Output ' + mx('y')];
const STEPS = ['+2', '+2', '+2', '+2', '+2'];
const RULE_TILES = ['x', '+', '×', '1', '2', '3'];
const same = (t, f) => [1, 2, 3, 5, 11].every(v => evalToks(t, 'x', v) === f(v));
const andList = a => a.length < 2 ? String(a[0]) : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
const pt = p => '<span class="m">(' + p[0] + ', ' + p[1] + ')</span>';
// A table beside a "y =" tile strip, for building a rule.
function ruleStage(stage, ctl, ctx, heads, rows) {
  const duo = h('<div class="duo"></div>'), row = h('<div class="rule-row">' + mx('y =') + '</div>');
  stage.append(duo);
  const tb = makeTable(duo, heads, rows);
  duo.append(row);
  return { tb, bd: makeBuilder(row, ctl, RULE_TILES, ctx) };
}

/* ---------- still pictures for Why? panels and bridges ---------- */
// A picture beside one or two lines of working.
const wy = (pic, lines) => '<div class="wy"><div class="wy-pic">' + pic + '</div><div class="wy-t">' + lines.map(l => '<p>' + l + '</p>').join('') + '</div></div>';
// The table of values, still. o.steps: labels between rows; o.ok / o.k: [row, column] cells to tint green (the answer) / yellow (a known number).
function stillTable(heads, rows, o) {
  o = o || {};
  const d = document.createElement('div');
  const tb = makeTable(d, heads, rows);
  if (o.steps) tb.steps(o.steps);
  const tint = (list, cls) => (list || []).forEach(c => d.querySelector('tbody').rows[c[0]].cells[c[1]].classList.add(cls));
  tint(o.ok, 'ok'); tint(o.k, 'k');
  return d.innerHTML;
}
// A table laid across the page. rows: [header HTML, values]. ok: index of the row to tint green.
const stillAcross = (rows, ok) => '<table class="tov across">' + rows.map((r, i) => '<tr><th>' + r[0] + '</th>' + r[1].map(v => '<td' + (i === ok ? ' class="ok"' : '') + '>' + v + '</td>').join('') + '</tr>').join('') + '</table>';
// The machine with one number in each slot.
const qTile = '<span class="tile op still">?</span>';
const stillMach = (a, b) => '<div class="mach" role="img" aria-label="' + a + ' goes in, ' + b + ' comes out"><div class="m-slot"><span class="cap">in</span><span class="tile num still">' + a + '</span></div><div class="m-pipe"></div>' +
  '<div class="m-body">' + GEAR + '</div><div class="m-pipe"></div><div class="m-slot"><span class="cap">out</span><span class="tile num still">' + b + '</span></div></div>';
// The grid with points already on it. extra: SVG drawn on top. GX and GY turn grid numbers into SVG units.
const GX = x => 30 + x * 30, GY = y => 234 - y * 15;
function stillGrid(fixed, extra) {
  const d = document.createElement('div');
  makeGrid(d, { xmax: 6, ymax: 14, fixed });
  const svg = $('svg', d);
  svg.classList.add('locked');
  return svg.outerHTML.slice(0, -6) + (extra || '') + '</svg>';
}

const cards = [

/* 1 */ {
  prompt: 'This machine hides a rule. Feed it the inputs 1 to 5 to fill the table.',
  sub: 'Crack a hidden rule, like how a film site sets its prices, and you can predict any cost. Drag a number into the machine, or tap it.',
  why: () => wy(stillMach(3, 7), [
    'The machine does the same thing to every number, so an input always gives the same output. Feed in 3 and you get 7 every time.',
    'Writing each pair as a row, in order, lets you compare the outputs: 3, 5, 7, 9, 11.'
  ]),
  build(stage, ctl, ctx) {
    const duo = h('<div class="duo"><div class="grow"></div></div>');
    stage.append(duo);
    const mc = makeMachine(duo.firstElementChild, RULE, () => { const x = mc.fed[mc.fed.length - 1]; tb.set(x - 1, 1, RULE(x)); ctx.touch(true); });
    $('.m-log', duo).hidden = true;
    const tb = makeTable(duo, HEADS, IN5.map(x => [x, null]));
    const tray = feedTray(ctl, mc, IN5);
    const missing = () => IN5.filter(x => !mc.fed.includes(x));
    return {
      check() {
        const m = missing();
        if (!m.length) return true;
        return 'The table still has ' + (m.length === 1 ? 'a gap for input ' : 'gaps for inputs ') + andList(m) + '. Feed ' + (m.length === 1 ? 'it' : 'them') + ' to the machine.';
      },
      win: () => 'Each row pairs an input with its output: 1 → 3, 2 → 5, 3 → 7, 4 → 9 and 5 → 11. Next, hunt for the rule that makes them.',
      won() { tray.lock(); },
      solve() { missing().forEach(x => { mc.fed.push(x); tb.set(x - 1, 1, RULE(x)); }); }
    };
  }
},

/* 2 */ {
  prompt: 'Read down the output column. How much does the output go up by each time?',
  why: () => wy(stillTable(HEADS, ROWS5, { steps: STEPS }), [
    'Take each output from the one below it: ' + mx('5 − 3 = 2') + ', ' + mx('7 − 5 = 2') + ', ' + mx('9 − 7 = 2') + ' and ' + mx('11 − 9 = 2') + '.',
    'Every jump is 2. So each time 1 more goes in, 2 more comes out.'
  ]),
  build(stage, ctl, ctx) {
    const tb = makeTable(stage, HEADS, ROWS5);
    const ans = makeAnswer(ctl, 'Each output goes up by', ctx);
    return {
      check() {
        const v = ans.value();
        if (v === 2) return true;
        ans.mark('bad');
        if (isNaN(v)) return 'Type a whole number, using digits only.';
        if (v === 1) return 'The inputs go up by 1. Look at the outputs instead: 3, 5, 7, 9, 11.';
        if (v === 3) return '3 is the first output. How far is it from 3 to 5?';
        if (v === 11) return '11 is the last output. Find the jump from one output to the next: 5 − 3, then 7 − 5.';
        return 'Work out 5 − 3, then 7 − 5. Is the jump the same each time?';
      },
      win: () => 'Up by 2 each time: 3, 5, 7, 9, 11. The inputs go up by 1, and the outputs go up by 2.',
      won() { tb.steps(STEPS); ans.mark('good'); ans.lock(); },
      solve() { ans.set(2); }
    };
  }
},

/* 3 */ {
  prompt: 'What will the machine give when 6 goes in?',
  why: () => wy(stillTable(HEADS, ROWS5.concat([[6, 13]]), { steps: STEPS, ok: [[5, 1]] }), [
    'The input goes up by 1 again, from 5 to 6, so the output goes up by 2 again.',
    mx('11 + 2 = 13')
  ]),
  build(stage, ctl, ctx) {
    const tb = makeTable(stage, HEADS, ROWS5.concat([[6, '?']]));
    tb.steps(STEPS.slice(0, 4));
    const ans = makeAnswer(ctl, 'When 6 goes in, out comes', ctx);
    return {
      check() {
        const v = ans.value();
        if (v === 13) return true;
        ans.mark('bad');
        if (isNaN(v)) return 'Type a whole number, using digits only.';
        if (v === 8) return '8 is 6 + 2. Adding 2 to the input doesn’t match the table: 5 + 2 = 7, but 5 gives 11. The step of 2 is between outputs, not added to the input.';
        if (v === 12) return '12 is 2 × 6. Check that idea against the table: 2 × 5 = 10, but 5 gives 11.';
        if (v === 11) return '11 is the output for 5. Input 6 is the next row down.';
        return 'Find the output for 5 in the table. How does the output change from one row to the next?';
      },
      win: () => '13, because 11 + 2 = 13. Adding 2 down the column works here, but only one row at a time. To jump straight to any input, you need a rule that links the input to its output.',
      won() { tb.set(5, 1, 13); tb.steps(STEPS); ans.mark('good'); ans.lock(); },
      solve() { ans.set(13); }
    };
  }
},

/* 4 */ {
  prompt: 'The outputs go up by 2, just like ' + mx('2 × x') + ' does. How much more than ' + mx('2 × x') + ' is each output?',
  sub: 'Compare across each row.',
  why: () => wy(stillTable(['Input ' + mx('x'), mx('2 × x'), 'Output ' + mx('y')], IN5.map(x => [x, 2 * x, RULE(x)]), { steps: STEPS }), [
    'Each time ' + mx('x') + ' goes up by 1, ' + mx('2 × x') + ' goes up by 2. The outputs go up by 2 as well, so the two columns stay the same distance apart.',
    'That distance is 1 in every row: ' + mx('3 − 2') + ', ' + mx('5 − 4') + ', ' + mx('7 − 6') + ', ' + mx('9 − 8') + ' and ' + mx('11 − 10') + '.'
  ]),
  build(stage, ctl, ctx) {
    const tb = makeTable(stage, ['Input ' + mx('x'), mx('2 × x'), 'Output ' + mx('y')], IN5.map(x => [x, 2 * x, RULE(x)]));
    tb.steps(STEPS);
    const ans = makeAnswer(ctl, 'Each output is ' + mx('2 × x') + ' plus', ctx);
    return {
      check() {
        const v = ans.value();
        if (v === 1) return true;
        ans.mark('bad');
        if (isNaN(v)) return 'Type a whole number, using digits only.';
        if (v === 2) return '2 is the step down the column. Compare across a row instead: how much bigger is the output than the ' + mx('2 × x') + ' number beside it?';
        if (v === 3) return '3 is the output for 1, not the difference. Compare it with the ' + mx('2 × x') + ' number in the same row.';
        if (v === 0) return 'Then each output would equal 2 × ' + mx('x') + '. But 2 × 1 = 2, and the output is 3.';
        return 'Pick one row. Take the ' + mx('2 × x') + ' number away from the output. Does every row give the same answer?';
      },
      win: () => 'Every output is 1 more than ' + mx('2 × x') + ': 2 × 3 = 6 and 6 + 1 = 7. The step of 2 told you to multiply by 2.',
      won() { ans.mark('good'); ans.lock(); },
      solve() { ans.set(1); }
    };
  }
},

/* 5 */ {
  prompt: 'Build the machine’s rule: how do you get ' + mx('y') + ' from ' + mx('x') + '?',
  sub: 'Drag tiles into the box, or tap them. Tap a tile in the box to remove it.',
  why: () => wy(stillTable(['Input ' + mx('x'), mx('2 × x + 1'), 'Output ' + mx('y')], IN5.map(x => [x, '2 × ' + x + ' + 1', RULE(x)]), { ok: IN5.map((x, i) => [i, 2]) }), [
    'Test the rule on every row. It gives the machine’s output each time, so it is the machine’s rule.',
    'A rule that fits only some rows is not the rule: ' + mx('x + 2') + ' fits row 1 (1 + 2 = 3) but not row 2 (2 + 2 = 4, not 5).'
  ]),
  build(stage, ctl, ctx) {
    const { tb, bd } = ruleStage(stage, ctl, ctx, HEADS, ROWS5);
    tb.steps(STEPS);
    return {
      check() {
        const t = bd.toks();
        if (evalToks(t, 'x', 5) == null) return 'That isn’t a complete rule yet. Put + or × between each pair of tiles.';
        if (same(t, RULE)) return true;
        if (!t.includes('x')) return 'Your rule has no ' + mx('x') + ', so it gives the same output for every input. The output has to change when the input changes.';
        if (same(t, x => x + 2)) return mx('x + 2') + ' adds 2 to the input. But the 2 is the step down the output column, not what happens to each input. Test row 3: 3 + 2 = 5, but the machine gave 7.';
        if (same(t, x => 2 * x)) return mx('2 × x') + ' gives 2, 4, 6, 8, 10. Compare those with the outputs in the table. What is missing?';
        if (same(t, x => x + 1)) return mx('x + 1') + ' gives 2, 3, 4, 5, 6. Test row 3: 3 + 1 = 4, but the machine gave 7.';
        const v = [3, 1, 5, 2, 4, 11].find(k => evalToks(t, 'x', k) !== RULE(k));
        return 'Test it with ' + mx('x = ' + v) + '. The machine gives ' + RULE(v) + ', but your rule gives ' + evalToks(t, 'x', v) + '.';
      },
      win: () => mx('y = ' + bd.toks().join(' ')) + '. The outputs go up by 2, so the rule multiplies by 2. Then add 1 to match the first row: 2 × 1 + 1 = 3. ' + mx('x + x + 1') + ' is the same rule.',
      won() { bd.lock(); },
      solve() { bd.set(['2', '×', 'x', '+', '1']); }
    };
  }
},

/* 6 (bridge) */ {
  bridge: true,
  prompt: 'Your rule adds the same 1 whatever the input. A number added on its own like this is called a <b>constant</b>: it stays the same for every input.',
  sub: 'The input and the output change from row to row, so ' + mx('x') + ' and ' + mx('y') + ' are variables.',
  show(stage) { stage.append(h('<div class="br-pic">' + stillTable(['Input ' + mx('x'), mx('2 × x'), 'Constant', 'Output ' + mx('y')], IN5.map(x => [x, 2 * x, '+ 1', RULE(x)]), { k: IN5.map((x, i) => [i, 2]) }) + '</div>')); }
},

/* 7 */ {
  prompt: 'Use your rule to predict the output for 10. Then the machine will check.',
  sub: 'The rule is ' + mx('y = 2 × x + 1') + '.',
  why: () => wy(stillMach(10, 21), [
    'Put 10 in place of ' + mx('x') + ': ' + mx('y = 2 × 10 + 1') + '.',
    'Multiply first, then add: ' + mx('20 + 1 = 21') + '.'
  ]),
  then: {
    prompt: 'Now go backwards. The machine gives out 15. What number went in?',
    sub: 'The rule is still ' + mx('y = 2 × x + 1') + '.',
    why: () => wy(stillMach(7, 15), [
      'Undo the rule, last thing first. Undo the adding: ' + mx('15 − 1 = 14') + '. Undo the multiplying: ' + mx('14 ÷ 2 = 7') + '.',
      'Check by going forwards: ' + mx('2 × 7 + 1 = 15') + '.'
    ]),
    build(stage, ctl, ctx, p1) {
      const { mc, tb } = p1.kit;
      tb.set(5, 1, 21);
      tb.insert(5, ['?', 15]);
      mc.still(qTile, numTile(15));
      const ans = makeAnswer(ctl, 'Out comes 15 when the input is', ctx);
      return {
        check() {
          const v = ans.value();
          if (v === 7) return true;
          ans.mark('bad');
          if (isNaN(v)) return 'Type a whole number, using digits only.';
          if (v === 31) return '31 is 2 × 15 + 1: you put 15 in as the input. This time 15 is the output. Which input gives 15?';
          if (v === 30) return '30 is 2 × 15. This time 15 is the output, not the input. Which input gives 15?';
          if (v === 8) return '8 comes from 15 + 1 = 16, then halving. The rule added 1, so undo it by taking 1 away first.';
          if (v === 14) return '14 is 15 − 1. That undoes the adding. Now undo the multiplying by 2.';
          if (v === 13) return '13 is 15 − 2. The 2 in the rule multiplies, so taking 2 away doesn’t undo it. Test 13: 2 × 13 + 1 = 27, not 15.';
          if (v === 15) return '15 is the output. Test it as an input: 2 × 15 + 1 = 31, not 15.';
          return 'Test ' + v + ': 2 × ' + v + ' + 1 = ' + RULE(v) + ', not 15. Try a ' + (v < 7 ? 'bigger' : 'smaller') + ' input.';
        },
        win: () => '7 went in, because 2 × 7 + 1 = 15. A rule works backwards too: take away the 1, then halve.',
        won() { tb.set(5, 0, 7); mc.still(numTile(7), numTile(15)); ans.mark('good'); ans.lock(); },
        solve() { ans.set(7); }
      };
    }
  },
  build(stage, ctl, ctx) {
    const duo = h('<div class="duo"><div class="grow"></div></div>');
    stage.append(duo);
    const mc = makeMachine(duo.firstElementChild, RULE, () => tb.set(5, 1, 21));
    $('.m-log', duo).hidden = true;
    const tb = makeTable(duo, HEADS, ROWS5.concat([[10, '?']]));
    tb.steps(STEPS.slice(0, 4));
    const ans = makeAnswer(ctl, 'When 10 goes in, out comes', ctx);
    return {
      check() {
        const v = ans.value();
        if (v === 21) return true;
        ans.mark('bad');
        if (isNaN(v)) return 'Type a whole number, using digits only.';
        if (v === 12) return '12 is 10 + 2. “Add 2” is how the outputs change down the column, not what the machine does to an input. Put 10 into ' + mx('y = 2 × x + 1') + '.';
        if (v === 13) return '13 is 2 more than 11, so it is the output for 6. Input 10 is further down than that.';
        if (v === 20) return '20 is 2 × 10, only the first part of the rule. What does the rest of the rule tell you to do?';
        if (v === 22) return '22 is 2 × 11: you added before you multiplied. The rule multiplies first, then adds.';
        return 'Put 10 in place of ' + mx('x') + ' in ' + mx('2 × x + 1') + '. Multiply first, then add.';
      },
      win: () => 'The machine gives 21 as well: 2 × 10 + 1 = 21. The rule jumped straight there, without feeding in 6, 7, 8 and 9 first.',
      won() { ans.mark('good'); ans.lock(); mc.feed(10); },
      solve() { ans.set(21); },
      kit: { mc, tb },
      recap: () => 'Input 10 gives output 21, because ' + mx('2 × 10 + 1 = 21') + '.'
    };
  }
},

/* 8 */ {
  prompt: 'Same machine. This table skips some inputs. What is the output for 5?',
  why: () => wy(stillTable(HEADS, [[1, 3], [2, 5], [5, 11], [10, 21]], { ok: [[2, 1]] }), [
    'The rule gives it straight away: ' + mx('y = 2 × 5 + 1 = 11') + '.',
    'The steps agree. From input 2 to input 5 is 3 steps of 1, and each step adds 2 to the output: ' + mx('5 + 3 × 2 = 11') + '.'
  ]),
  build(stage, ctl, ctx) {
    const tb = makeTable(stage, HEADS, [[1, 3], [2, 5], [5, '?'], [10, 21]]);
    const ans = makeAnswer(ctl, 'When 5 goes in, out comes', ctx);
    return {
      check() {
        const v = ans.value();
        if (v === 11) return true;
        ans.mark('bad');
        if (isNaN(v)) return 'Type a whole number, using digits only.';
        if (v === 7) return '7 is 2 more than the output above. But adding 2 down the column only works when the inputs go up by 1. Here they jump from 2 to 5. Use the rule ' + mx('y = 2 × x + 1') + ' instead.';
        if (v === 10) return '10 is 2 × 5, only the first part of the rule. What does the rest of the rule tell you to do?';
        if (v === 6) return '6 is 5 + 1. The rule multiplies by 2 first, then adds 1.';
        return 'Put 5 into the rule ' + mx('y = 2 × x + 1') + '.';
      },
      win: () => '11, because 2 × 5 + 1 = 11. Adding 2 to the output above would give 7, which is wrong. The rule still works when the inputs skip.',
      won() { tb.set(2, 1, 11); ans.mark('good'); ans.lock(); },
      solve() { ans.set(11); }
    };
  }
},

/* 9 */ {
  why: () => wy(stillTable(HEADS, [[1, 3], [2, 5], [5, 11], [10, 21]], { steps: ['+2', '+6', '+10'] }), [
    'The inputs jump by 1, then 3, then 5. Each 1 in the input adds 2 to the output: ' + mx('1 × 2 = 2') + ', ' + mx('3 × 2 = 6') + ' and ' + mx('5 × 2 = 10') + '.',
    'So the rule still multiplies by 2, and ' + mx('y = 2 × x + 1') + ' gives 3, 5, 11 and 21.'
  ]),
  prompt: 'Down this column the outputs go up by 2, then 6, then 10. Which rule fits every row?',
  build(stage, ctl, ctx) {
    makeTable(stage, HEADS, [[1, 3], [2, 5], [5, 11], [10, 21]]).steps(['+2', '+6', '+10']);
    const ch = makeChoices(ctl, ['Add 2 to the output above', mx('y = 2 × x + 1'), mx('y = x + 2'), mx('y = 3 × x')], ctx);
    const why = [
      'Start at 5 and add 2: you get 7, but the output for 5 is 11. Adding 2 down the column only works when the inputs go up by 1. A rule has to turn each input into its own output.',
      '',
      'Test the row 5 → 11: 5 + 2 = 7, not 11.',
      'It works for 1 → 3. Test 2 → 5: 3 × 2 = 6, not 5.'
    ];
    return {
      check() { const s = ch.sel()[0]; if (s === 1) return true; ch.mark(s, 'bad'); return why[s]; },
      win: () => 'Only ' + mx('y = 2 × x + 1') + ' fits every row: 2 × 5 + 1 = 11 and 2 × 10 + 1 = 21. The step down the column changed because the inputs skipped. The rule did not change.',
      won() { ch.mark(1, 'good'); ch.lock(); },
      solve() { ch.set([1]); }
    };
  }
},

/* 10 */ {
  why: () => wy(stillTable(['Films ' + mx('x'), mx('3 × x'), 'Cost ($) ' + mx('y')], [1, 2, 3, 4].map(x => [x, 3 * x, 3 * x + 2]), { steps: ['+3', '+3', '+3'] }), [
    'The cost goes up $3 for each film, so the films alone cost ' + mx('3 × x') + ' dollars.',
    'Every total is $2 more than that: ' + mx('5 − 3') + ', ' + mx('8 − 6') + ', ' + mx('11 − 9') + ' and ' + mx('14 − 12') + '. That $2 is the joining fee.'
  ]),
  then: {
    prompt: 'Use your rule. What is the total cost of 10 films?',
    why: () => wy(stillTable(['Films ' + mx('x'), mx('3 × x'), 'Fee ($)', 'Cost ($) ' + mx('y')], [[10, 30, 2, 32]], { ok: [[0, 3]], k: [[0, 2]] }), [
      'Put 10 in place of ' + mx('x') + ': ' + mx('y = 3 × 10 + 2') + '.',
      'Ten films at $3 each is $30. Add the $2 joining fee: ' + mx('30 + 2 = 32') + '.'
    ]),
    build(stage, ctl, ctx, p1) {
      const tb = p1.tb;
      tb.insert(4, [10, '?']);
      const ans = makeAnswer(ctl, 'Total cost of 10 films: $', ctx);
      return {
        check() {
          const v = ans.value();
          if (v === 32) return true;
          ans.mark('bad');
          if (isNaN(v)) return 'Type a whole number, using digits only.';
          if (v === 30) return '$30 is 3 × 10, the films alone. The joining fee still has to be paid.';
          if (v === 50) return '$50 is 10 × $5. But the $5 for one film already includes the $2 joining fee, and you pay that fee only once.';
          if (v === 17) return '$17 is 3 more than the row above, so it is the cost of 5 films. For 10 films, use the rule.';
          if (v === 15) return '15 is 10 + 3 + 2. Each film costs $3, so multiply 10 by 3 before you add the fee.';
          if (v === 23) return '23 is 2 × 10 + 3. The 3 is the price of each film and the 2 is the fee: 3 × 10 + 2.';
          if (v === 36) return '36 is 3 × (10 + 2). Multiply first, then add: 3 × 10, then + 2.';
          return 'Put 10 in place of ' + mx('x') + ' in ' + mx('y = 3 × x + 2') + '. Multiply first, then add.';
        },
        win: () => '$32, because 3 × 10 + 2 = 32. The rule gave the cost without filling in the rows for 5 to 9 films.',
        won() { tb.set(4, 1, 32); ans.mark('good'); ans.lock(); },
        solve() { ans.set(32); }
      };
    }
  },
  prompt: 'A film site charges a joining fee plus the same price for each film. Build the rule for the total cost.',
  sub: mx('x') + ' is the number of films. ' + mx('y') + ' is the total cost in dollars.',
  build(stage, ctl, ctx) {
    const f = x => 3 * x + 2;
    const { tb, bd } = ruleStage(stage, ctl, ctx, ['Films ' + mx('x'), 'Cost ($) ' + mx('y')], [1, 2, 3, 4].map(x => [x, f(x)]));
    return {
      check() {
        const t = bd.toks();
        if (evalToks(t, 'x', 5) == null) return 'That isn’t a complete rule yet. Put + or × between each pair of tiles.';
        if (same(t, f)) return true;
        if (!t.includes('x')) return 'Your rule has no ' + mx('x') + ', so every number of films would cost the same. The cost has to change when ' + mx('x') + ' changes.';
        if (same(t, x => x + 3)) return mx('x + 3') + ' adds the step to the number of films. Test 2 films: 2 + 3 = 5, but the table says $8. The cost goes up $3 for each film, so multiply by 3.';
        if (same(t, x => 3 * x)) return mx('3 × x') + ' is the cost of the films alone. Test 1 film: 3 × 1 = 3, but the table says $5. Add the joining fee.';
        if (same(t, x => 2 * x + 3)) return 'Test 2 films: 2 × 2 + 3 = 7, but the table says $8. The cost goes up $3 for each film, so multiply by 3.';
        const v = [2, 1, 4, 3, 11].find(k => evalToks(t, 'x', k) !== f(k));
        return 'Test it with ' + mx('x = ' + v) + '. The cost is $' + f(v) + ', but your rule gives ' + evalToks(t, 'x', v) + '.';
      },
      win: () => mx('y = ' + bd.toks().join(' ')) + '. Each film adds $3, so multiply by 3. One film costs $5 and 3 × 1 = 3, so the joining fee is $2.',
      won() { tb.steps(['+3', '+3', '+3']); bd.lock(); },
      solve() { bd.set(['3', '×', 'x', '+', '2']); },
      tb,
      recap: () => 'The rule is ' + mx('y = ' + bd.toks().join(' ')) + ': $3 for each film, plus a $2 joining fee.'
    };
  }
},

/* 11 */ {
  why: () => wy(stillGrid(ROWS5, '<path class="wy-gd" d="M' + GX(3) + ' ' + GY(0) + 'V' + GY(7) + 'M' + GX(0) + ' ' + GY(7) + 'H' + GX(3) + '"/><text class="wy-gl" x="' + (GX(3) + 10) + '" y="' + (GY(7) + 17) + '">(3, 7)</text>'), [
    'Take the row 3 → 7. Go across to the input, 3, then up to the output, 7. That point is ' + pt([3, 7]) + '.',
    'The other rows work the same way: ' + pt([1, 3]) + ', ' + pt([2, 5]) + ', ' + pt([4, 9]) + ' and ' + pt([5, 11]) + '.'
  ]),
  prompt: 'Plot each row of the machine’s table as a point.',
  sub: 'Go across to the input, then up to the output. Tap to place or remove a point. Drag to move one.',
  build(stage, ctl, ctx) {
    const duo = h('<div class="duo"></div>');
    stage.append(duo);
    makeTable(duo, HEADS, ROWS5);
    const gr = makeGrid(duo, { xmax: 6, ymax: 14 }, n => ctx.touch(n > 0));
    const key = p => p[0] + ',' + p[1];
    return {
      check() {
        const P = gr.pts(), want = ROWS5.map(key);
        const extra = P.filter(p => !want.includes(key(p))), missing = ROWS5.filter(r => !P.some(p => key(p) === key(r)));
        if (!extra.length && !missing.length) return true;
        const sw = extra.find(p => ROWS5.some(r => r[0] === p[1] && r[1] === p[0]));
        if (sw) return pt(sw) + ' is ' + sw[0] + ' across and ' + sw[1] + ' up. The input goes across and the output goes up. Which number in that row is the input?';
        if (extra.length) {
          const p = extra[0], r = ROWS5.find(q => q[0] === p[0]);
          return r ? 'Your point ' + pt(p) + ' has the right input, but not the right height. Check the output for ' + r[0] + ' in the table.'
                   : 'Your point ' + pt(p) + ' has input ' + p[0] + ', which isn’t in the table.';
        }
        return 'Those points are right. ' + plural(missing.length, 'more row') + ' of the table still need' + (missing.length === 1 ? 's' : '') + ' a point.';
      },
      win: () => 'Each row is a point: ' + pt([1, 3]) + ', ' + pt([2, 5]) + ', ' + pt([3, 7]) + ', ' + pt([4, 9]) + ' and ' + pt([5, 11]) + '. Every step of 1 across goes 2 up, so the points line up.',
      won() { gr.lock(); },
      solve() { gr.set(ROWS5); }
    };
  }
},

/* 12 */ {
  why: () => wy(stillGrid(ROWS5, '<path class="wy-gd" d="M' + GX(5) + ' ' + GY(11) + 'H' + GX(6) + 'V' + GY(13) + '"/><circle class="wy-new" r="6.5" cx="' + GX(6) + '" cy="' + GY(13) + '"/>' +
      '<text class="wy-gs" x="' + (GX(5.5)) + '" y="' + (GY(11) + 15) + '" text-anchor="middle">+1</text><text class="wy-gs" x="' + (GX(6) + 5) + '" y="' + (GY(12) + 4) + '">+2</text>'), [
    'Every point is 1 across and 2 up from the one before. From ' + pt([5, 11]) + ': ' + mx('5 + 1 = 6') + ' across and ' + mx('11 + 2 = 13') + ' up.',
    'The rule gives the same point: ' + mx('2 × 6 + 1 = 13') + '.'
  ]),
  prompt: 'These points come from ' + mx('y = 2 × x + 1') + '. Plot the point for input 6.',
  sub: 'Look at how the points step up. Tap the grid to place your point.',
  build(stage, ctl, ctx) {
    const gr = makeGrid(stage, { xmax: 6, ymax: 14, fixed: ROWS5, max: 1 }, n => ctx.touch(n > 0));
    return {
      check(attempt) {
        const p = gr.pts()[0];
        if (p[0] === 6 && p[1] === 13) return true;
        if (p[0] !== 6) return 'Your point is ' + p[0] + ' across. Input 6 means 6 across.';
        if (p[1] === 12) return 'From ' + pt([5, 11]) + ', your point goes up 1. How far up does each step between the other points go?';
        if (p[1] === 11) return 'That is level with ' + pt([5, 11]) + ', but the points climb as they go across. How far does each step climb?';
        if (p[1] === 14) return 'From ' + pt([5, 11]) + ', your point goes up 3. How far up does each step between the other points go?';
        return attempt < 2 ? 'Look at how far up each point is from the one before it. Your point should follow the same steps.'
                           : 'Use the rule: put 6 in place of ' + mx('x') + ' in ' + mx('2 × x + 1') + '.';
      },
      win: () => pt([6, 13]) + '. Each point is 1 across and 2 up from the one before, so the points sit in a straight line. The rule agrees: 2 × 6 + 1 = 13.',
      won() { gr.lock(); },
      solve() { gr.set([[6, 13]]); }
    };
  }
},

/* 13 (bridge) */ {
  bridge: true,
  prompt: 'You went across to the input, then up to the output. The grid you plotted on is called the <b>Cartesian plane</b>.',
  sub: mx('x') + ' is measured across and ' + mx('y') + ' is measured up.',
  show(stage) { stage.append(h('<div class="br-pic">' + stillGrid(ROWS5) + '</div>')); }
},

/* 14 */ {
  prompt: 'Match each table to its rule.',
  why: () => '<div class="wy-trio">' + [
      ['A', [1, 2, 3, 4], x => 2 * x + 3, 'Inputs +1, outputs +2', 'y = 2 × x + 3'],
      ['B', [2, 4, 6, 8], x => x + 2, 'Inputs +2, outputs +2', 'y = x + 2'],
      ['C', [1, 2, 3, 4], x => 3 * x + 1, 'Inputs +1, outputs +3', 'y = 3 × x + 1']
    ].map(t => '<figure><b>Table ' + t[0] + '</b>' + rowTable(t[1], t[1].map(t[2])) + '<figcaption>' + t[3] + '<br>' + mx(t[4]) + '</figcaption></figure>').join('') + '</div>' +
    '<div class="wy-t"><p>When the inputs go up by 1, the step between outputs is the multiplier: 2 for table A and 3 for table C.</p>' +
    '<p>In table B the inputs go up by 2 and so do the outputs. Each extra 1 in gives 1 extra out, so nothing is multiplied: ' + mx('2 + 2 = 4') + ', ' + mx('4 + 2 = 6') + '.</p></div>',
  sub: 'Drag each rule under a table, or tap a rule and then a table. Test a row before you decide.',
  build(stage, ctl, ctx) {
    const NAME = ['A', 'B', 'C'];
    const tabs = [
      { xs: [1, 2, 3, 4], f: x => 2 * x + 3 },
      { xs: [2, 4, 6, 8], f: x => x + 2 },
      { xs: [1, 2, 3, 4], f: x => 3 * x + 1 }
    ];
    const rules = [
      { e: 'y = 3 × x + 1', t: 2, f: x => 3 * x + 1, sum: x => '3 × ' + x + ' + 1' },
      { e: 'y = x + 2', t: 1, f: x => x + 2, sum: x => x + ' + 2' },
      { e: 'y = 2 × x + 3', t: 0, f: x => 2 * x + 3, sum: x => '2 × ' + x + ' + 3' }
    ];
    const place = rules.map(() => 'tray');
    let sel = null, locked = false;
    const bins = h('<div class="bins three">' + tabs.map((tb, k) => '<div class="bin" data-drop="s' + k + '"><span class="bin-t">Table ' + NAME[k] + '</span>' +
      rowTable(tb.xs, tb.xs.map(tb.f)) + '<div class="bin-c"></div></div>').join('') + '</div>');
    const tray = h('<div class="chips" data-drop="tray"></div>');
    stage.append(bins); ctl.append(tray);
    const hostOf = w => w === 'tray' ? tray : $('.bin[data-drop=' + w + '] .bin-c', bins);
    const chips = rules.map((r, i) => {
      const c = h('<button type="button" class="chip">' + mx(r.e) + '</button>');
      c.onclick = () => { if (locked) return; sel = sel === i ? null : i; draw(); };
      draggable(c, { accept: ['s0', 's1', 's2', 'tray'], onDrop: t => move(i, t.getAttribute('data-drop')) });
      return c;
    });
    function move(i, where) {
      if (locked) return;
      if (where !== 'tray') place.forEach((p, j) => { if (p === where && j !== i) place[j] = 'tray'; });
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
        const wrong = rules.map((r, i) => place[i] !== 's' + r.t ? i : -1).filter(i => i >= 0);
        if (!wrong.length) return true;
        wrong.forEach(i => chips[i].classList.add('bad'));
        wrong.sort((a, b) => (place[b] === 's1') - (place[a] === 's1'));   // table B holds the column-step trap: explain it first
        const r = rules[wrong[0]], k = +place[wrong[0]].slice(1), tb = tabs[k];
        const x = tb.xs.find(v => r.f(v) !== tb.f(v));
        let msg = 'Test ' + mx(r.e) + ' on table ' + NAME[k] + '. When ' + mx('x = ' + x) + ', ' + r.sum(x) + ' = ' + r.f(x) + ', but the table says ' + tb.f(x) + '.';
        if (k === 1) msg += ' Table B goes up by 2 down the column, but its inputs go up by 2 as well.';
        if (k === 0 && r.t === 1) msg += ' Table A goes up by 2 while its inputs go up by 1. What does that tell you about its rule?';
        return msg;
      },
      win: () => 'A is ' + mx('y = 2 × x + 3') + ', B is ' + mx('y = x + 2') + ' and C is ' + mx('y = 3 × x + 1') + '. Table B goes up by 2 down the column, yet its rule doesn’t multiply by 2, because its inputs jump by 2 as well. Always test a rule on a row.',
      won() { locked = true; chips.forEach(c => { c.classList.remove('sel'); c.classList.add('good'); }); },
      solve() { rules.forEach((r, i) => { place[i] = 's' + r.t; }); sel = null; chips.forEach(c => c.classList.remove('bad')); draw(); }
    };
  }
},

/* 15 */ {
  why: () => wy(stillAcross([[mx('x'), [1, 2, 3, 4]], [mx('4 × x'), [4, 8, 12, 16]], [mx('y'), [6, 10, 14, 18]]]), [
    'The inputs go up by 1 and the outputs go up by 4, so the rule multiplies by 4: ' + mx('4 × x') + ' gives 4, 8, 12, 16.',
    'Every output is 2 more than that, so ' + mx('y = 4 × x + 2') + '. Tom’s rule fits all four rows.'
  ]),
  prompt: 'Three students give a rule for this table. Agree or disagree with each one.',
  build(stage, ctl, ctx) {
    stage.hidden = true;
    const tab = h(rowTable([1, 2, 3, 4], [6, 10, 14, 18]));
    tab.style.alignSelf = 'center';
    ctl.append(tab);
    const claims = [
      { who: 'Leo', say: '“The outputs go up by 4, so the rule is: add 4.”', agree: false, hint: 'Could “add 4” give the output for 50 without every row before it?', why: 'That only gets the next row, and it breaks when the inputs skip.' },
      { who: 'Priya', say: '“The outputs go up by 4, so the rule is ' + mx('y = x + 4') + '.”', agree: false, hint: 'Test Priya’s rule on row 1.', why: 'Row 1: 1 + 4 = 5, not 6. The step of 4 is a multiplier.' },
      { who: 'Tom', say: '“The step is 4, so 4 × ' + mx('x') + '. Row 1 needs 2 more: ' + mx('y = 4 × x + 2') + '.”', agree: true, hint: 'Test Tom’s rule on row 3.', why: 'It links input to output. Check row 3: 4 × 3 + 2 = 14.' }
    ];
    const pick = claims.map(() => null);
    let locked = false;
    const list = h('<div class="claims" style="gap:.45rem"></div>');
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
    const explain = (i, cls, txt) => { rows[i].row.classList.add(cls); const w = $('.why', rows[i].row); if (w) w.remove(); rows[i].row.append(h('<p class="why">' + (txt || claims[i].why) + '</p>')); };
    ctl.append(list);
    return {
      check() {
        const wrong = claims.map((c, i) => pick[i] !== c.agree ? i : -1).filter(i => i >= 0);
        if (!wrong.length) return true;
        wrong.forEach(i => explain(i, 'bad', claims[i].hint));
        return wrong.length === 1 ? 'Look again at what ' + claims[wrong[0]].who + ' said. The note under it gives a hint.'
                                  : 'Look again at ' + andList(wrong.map(i => claims[i].who)) + '. The notes under them give hints.';
      },
      win: () => 'Tom has it: a rule turns any input straight into its output. For 50, 4 × 50 + 2 = 202.',
      won() { locked = true; claims.forEach((c, i) => { rows[i].row.classList.remove('bad'); explain(i, 'good'); rows[i].btns.forEach(b => { b.disabled = true; }); }); },
      solve() { claims.forEach((c, i) => { pick[i] = c.agree; paint(i); }); }
    };
  }
}
];

const SECTIONS = [[0, 'The machine'], [3, 'Finding the rule'], [5, 'Using the rule'], [7, 'Skipping inputs'], [9, 'A new table'], [10, 'Graphing'], [12, 'Wrap-up']];

// Finish screen: sets the prompt, sub-line and recap for this lesson.
function drawFinish() {
  promptEl.textContent = 'A rule links each input to its output.';
  subEl.hidden = false; subEl.textContent = 'Four things to remember:';
  ctl.replaceChildren(); stage.hidden = false;
  const dots = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M4 2V36H38" fill="none" stroke="#2B2D2F" stroke-width="2.5"/><circle cx="12" cy="29" r="3.5" fill="#2B2D2F"/><circle cx="21" cy="20" r="3.5" fill="#2B2D2F"/><circle cx="30" cy="11" r="3.5" fill="#2B2D2F"/></svg>';
  stage.replaceChildren(h('<ul class="recap">' +
    '<li><span class="art"><span class="tile var still">x</span><span class="m">→</span><span class="tile yv still">y</span></span><span>A rule like ' + mx('y = 2 × x + 1') + ' turns any input straight into its output: 2 × 10 + 1 = 21.</span></li>' +
    '<li><span class="art"><span class="m">+2</span></span><span>When the inputs go up by 1, the step between outputs is the multiplier. Then check the first row to find what to add.</span></li>' +
    '<li><span class="art"><span class="m">+2 +6</span></span><span>Adding the step down the column is a pattern, not a rule. It breaks as soon as the inputs skip.</span></li>' +
    '<li><span class="art">' + dots + '</span><span>Each row is a point: across to the input, up to the output. Equal steps put the points in a straight line.</span></li></ul>'));
}
