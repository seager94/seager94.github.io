/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const h = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');

// "3(x + 4)" -> maths markup. Every lower-case letter becomes a variable, so pass maths only, never words.
function mx(s) {
  return '<span class="m">' + String(s).replace(/[a-z]/g, t => '<i class="v">' + t + '</i>') + '</span>';
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

const neg = n => n < 0 ? '(−' + (-n) + ')' : String(n);
const dec = v => String(+v.toFixed(2));
const term = c => (c === 1 ? '' : dec(c)) + 'x';
// Live line under a rectangle: its true area for this x, and what the student's two boxes give for the same x.
function checkLine(lab, calc, area, vals, x, minus) {
  const c = vals[0], k = vals[1];
  let out = '<span class="lab">' + lab + '</span>' + mx(calc + ' = ' + area);
  if (!isNaN(c) && !isNaN(k)) {
    const v = minus ? c * x - k : c * x + k;
    out += '<small>Your answer: ' + mx(c + ' × ' + x + (minus ? ' − ' : ' + ') + neg(k) + ' = ' + neg(v)) + ' <b>' + (v === area ? 'matches' : 'does not match') + '</b></small>';
  }
  return out;
}
const SIGN = 'The minus is already in front of the box. Type the strip’s area with no sign.';

// Why? panels: the card's rectangle, small and still, beside one or two lines of working.
// o: { maxLen, maxA, h } as for makeArea (h in rem). Returns HTML.
function stillArea(o, spec) {
  const d = document.createElement('div');
  makeArea(d, o).draw(spec);
  const w = Math.min(20, 4.6 + o.maxLen * o.h / o.maxA);
  return '<div class="wy-am" style="width:' + w.toFixed(2) + 'rem">' + d.innerHTML + '</div>';
}
function whyBox(pic, lines) {
  return '<div class="wy"><div class="wy-pic">' + pic + '</div><div class="wy-txt">' + lines.map(l => '<p>' + l + '</p>').join('') + '</div></div>';
}
// A still rectangle with one line of maths under it, for bridge screens.
function bridgeArea(stage, o, spec, line) {
  const am = makeArea(stage, o);
  am.draw(spec); am.lock();
  stage.append(h('<div class="live">' + line + '</div>'));
}

/* ---------- cards ---------- */

const cards = [

/* 1 */ {
  prompt: 'Find the area of this 3 by 14 rectangle.',
  sub: 'Three $14 tickets cost 3 × 14 dollars, and splitting the 14 makes that easy. Drag the split line to cut the rectangle into two parts that are easier to multiply.',
  why: () => whyBox(stillArea({ maxLen: 14, maxA: 3, h: 4.2 }, lay(3, '3', [
      { len: 5, kind: 'num', lab: '5', area: mx('3 × 5') + '<small>= 15</small>' },
      { len: 9, kind: 'num', lab: '9', area: mx('3 × 9') + '<small>= 27</small>' }])), [
    'A cut does not add or remove any squares, so every split gives the same total. Split at 5: ' + mx('15 + 27 = 42') + '.',
    'Splitting at 10 is the handy one, because 3 × 10 is easy: ' + mx('30 + 12 = 42') + '.'
  ]),
  build(stage, ctl, ctx) {
    let p = 7;
    const am = makeArea(stage, { maxLen: 14, maxA: 3, drag: { p: [2, 12] }, onDrag(k, v) { p = v; draw(); } });
    const ans = makeAnswer(ctl, 'Area of the whole rectangle', ctx);
    function draw() {
      const q = 14 - p;
      am.draw(lay(3, '3', [{ len: p, kind: 'num', lab: p, area: mx('3 × ' + p) + '<small>= ' + 3 * p + '</small>' },
                           { len: q, kind: 'num', lab: q, area: mx('3 × ' + q) + '<small>= ' + 3 * q + '</small>' }]));
    }
    draw();
    return {
      check() {
        const v = ans.value(), q = 14 - p;
        if (v === 42) return true;
        ans.mark('bad');
        if (isNaN(v)) return 'Type a whole number, using digits only.';
        if (v === 34) return '34 is 3 × 10 + 4, which leaves the 4 unmultiplied. The 4-long part is 3 rows tall, so its area is 3 × 4 = 12. (34 is also the distance around the edge, not the area.)';
        if (v === 3 * p + q || v === p + 3 * q) return 'You multiplied one part by 3 but not the other. Both parts are 3 squares tall, so each one is 3 × its length.';
        if (v === 3 * p || v === 3 * q) return 'That is the area of one part. Add the areas of both parts.';
        if (v === 17) return '3 + 14 adds the side lengths. Area counts the squares inside, so multiply.';
        return 'Work out each part, 3 × ' + p + ' and 3 × ' + q + ', then add them.';
      },
      win: () => '3 × 14 = 42. A split at 10 makes it easy: 3 × 10 + 3 × 4 = 30 + 12 = 42. Any split gives 42, because the rectangle itself never changes.',
      won() { ans.mark('good'); ans.lock(); p = 10; draw(); am.lock(); },
      solve() { ans.set(42); }
    };
  }
},

/* 2 */ {
  prompt: 'The rectangle is 3 by ' + mx('(10 + 4)') + '. Which calculation gives its area?',
  why: () => whyBox(stillArea({ maxLen: 14, maxA: 3, h: 4.2 }, lay(3, '3', [
      { len: 10, kind: 'num', lab: '10', area: mx('3 × 10') }, { len: 4, kind: 'num', lab: '4', area: mx('3 × 4') }])), [
    'Count by rows: 3 rows, each with 10 + 4 squares. That is ' + mx('3 × (10 + 4)') + '.',
    'Count by parts: ' + mx('3 × 10 + 3 × 4') + '. They are the same squares, so both counts are 42.'
  ]),
  build(stage, ctl, ctx) {
    const am = makeArea(stage, { maxLen: 14, maxA: 3 });
    const draw = shown => am.draw(lay(3, '3', [{ len: 10, kind: 'num', lab: '10', area: shown ? '30' : '' }, { len: 4, kind: 'num', lab: '4', area: shown ? '12' : '' }]));
    draw(false);
    const ch = makeChoices(ctl, [mx('3 × 10 + 4'), mx('3 × 10 + 3 × 4'), mx('3 + 10 × 4'), mx('3 × 10 × 4')], ctx);
    const why = [
      mx('3 × 10 + 4') + ' is 34. It counts only one row of the 4-long part, but that part has 3 rows: 3 × 4 = 12.',
      '',
      mx('3 + 10 × 4') + ' is 43. The 3 has to multiply, not add: each part is 3 rows tall.',
      mx('3 × 10 × 4') + ' is 120, far more than 42. The two parts sit side by side, so their areas are added.'
    ];
    return {
      check() { const s = ch.sel()[0]; if (s === 1) return true; ch.mark(s, 'bad'); return why[s]; },
      win: () => mx('3 × (10 + 4) = 3 × 10 + 3 × 4') + '. The 3 multiplies <b>both</b> parts of the length, the 10 and the 4. This is called the distributive law.',
      won() { ch.mark(1, 'good'); ch.lock(); draw(true); },
      solve() { ch.set([1]); }
    };
  }
},

/* 3 */ {
  bridge: true,
  prompt: 'You cut the rectangle into two parts, multiplied each part by 3, then added. Multiplying every part of a sum like this is called the <b>distributive law</b>.',
  show(stage) {
    bridgeArea(stage, { maxLen: 14, maxA: 3, h: 5 }, lay(3, '3', [{ len: 10, kind: 'num', lab: '10', area: '30' }, { len: 4, kind: 'num', lab: '4', area: '12' }]),
      mx('3 × (10 + 4) = 3 × 10 + 3 × 4'));
  }
},

/* 4 */ {
  prompt: 'This rectangle is 3 by ' + mx('(x + 4)') + '. Write its area without brackets.',
  sub: 'Drag the slider to change ' + mx('x') + '. The area of each part is written inside it.',
  why: () => whyBox(stillArea({ maxLen: 9, maxA: 3, h: 4.2 }, lay(3, '3', [
      { len: 5, kind: 'var', lab: mx('x'), area: mx('3x') }, { len: 4, kind: 'num', lab: '4', area: '12' }])), [
    'Blue part: 3 rows, each ' + mx('x') + ' long. ' + mx('x + x + x = 3x') + '.',
    'Yellow part: 3 rows of 4. ' + mx('4 + 4 + 4 = 12') + '.'
  ]),
  then: {
    prompt: 'The slider stops at 10. Use ' + mx('3x + 12') + ' to find the area when ' + mx('x = 20') + '.',
    reset: false,
    why: () => whyBox(stillArea({ maxLen: 24, maxA: 3, h: 2.4 }, lay(3, '3', [
        { len: 20, kind: 'var', lab: mx('x = 20'), area: '60' }, { len: 4, kind: 'num', lab: '4', area: '12' }], { grid: false })), [
      '3 rows of 20 is 60, and 3 rows of 4 is 12: ' + mx('60 + 12 = 72') + '.',
      'The bracket form agrees: ' + mx('3 × (20 + 4) = 3 × 24 = 72') + '.'
    ]),
    build(stage, ctl, ctx, p1) {
      const ans = makeAnswer(ctl, 'Area when ' + mx('x = 20'), ctx);
      return {
        check() {
          const v = ans.value();
          if (v === 72) return true;
          ans.mark('bad');
          if (isNaN(v)) return 'Type a whole number, using digits only.';
          if (v === 332) return mx('3x') + ' means 3 × ' + mx('x') + ', not a 3 written in front of the 20. 3 × 20 = 60, then add 12.';
          if (v === 60) return 'That is the blue part, 3 × 20. Add the yellow part, which is still 12.';
          if (v === 32) return '20 + 12 counts one row of the blue part. It has 3 rows: 3 × 20.';
          if (v === 64) return 'You added 4, the yellow length. The yellow area is 3 × 4 = 12.';
          if (v === 35) return '3 + 20 + 12 adds the 3. ' + mx('3x') + ' means 3 × ' + mx('x') + ', so multiply: 3 × 20.';
          return 'Swap the ' + mx('x') + ' for 20: work out 3 × 20, then add 12.';
        },
        win: () => mx('3 × 20 + 12 = 72') + '. The expansion gives the area for any ' + mx('x') + ', even one too long for the slider.',
        won() { ans.mark('good'); ans.lock(); p1.live.innerHTML = '<span class="lab">Whole area</span>' + mx('3 × (20 + 4) = 72'); },
        solve() { ans.set(72); }
      };
    }
  },
  build(stage, ctl, ctx) {
    let x = 5, solved = false;
    const am = makeArea(stage, { maxLen: 14, maxA: 3 });
    const live = h('<div class="live"></div>');
    stage.append(live);
    makeSlider(ctl, 'x', 2, 10, x, v => { x = v; draw(); });
    const bl = makeBlanks(ctl, mx('3(x + 4) = {}x + {}'), ctx);
    function draw() {
      am.draw(lay(3, '3', [{ len: x, kind: 'var', lab: mx('x'), area: solved ? mx('3x') : mx('3 × x') + '<small>= ' + 3 * x + '</small>' },
                           { len: 4, kind: 'num', lab: '4', area: solved ? '12' : mx('3 × 4') + '<small>= 12</small>' }]));
      live.innerHTML = '<span class="lab">Whole area</span>' + mx('3 × (' + x + ' + 4) = ' + 3 * (x + 4));
    }
    draw();
    return {
      check() {
        const [c, k] = bl.vals();
        if (isNaN(c) || isNaN(k)) { bl.mark('bad'); return 'Type a whole number in each box.'; }
        if (c === 3 && k === 12) return true;
        bl.mark('bad');
        if (c === 3 && k === 4) return 'You multiplied the ' + mx('x') + ' by 3 but not the 4. Look at the yellow part: it is 3 tall and 4 long, so its area is 3 × 4, not 4.';
        if (c === 3 && k === 7) return '7 is 3 + 4. The yellow part is 3 by 4, so multiply.';
        if (c === 3) return 'The ' + mx('3x') + ' is right. Now the yellow part: it is 3 tall and 4 long.';
        return 'The blue part is 3 rows of ' + mx('x') + '. The first box is how many ' + mx('x') + ' that makes.';
      },
      win: () => mx('3(x + 4) = 3x + 12') + '. Check it: when ' + mx('x = ' + x) + ', 3 × ' + x + ' + 12 = ' + (3 * x + 12) + ', the same as the whole rectangle. The 3 multiplies both the ' + mx('x') + ' and the 4.',
      won() { solved = true; draw(); bl.mark('good'); bl.lock(); },
      solve() { bl.set([3, 12]); },
      recap: () => mx('3(x + 4) = 3x + 12'),
      live
    };
  }
},

/* 5 */ {
  prompt: 'Kai says ' + mx('3(x + 4) = 3x + 4') + '. Drag the slider. For which values of ' + mx('x') + ' is Kai right?',
  why: () => whyBox(stillArea({ maxLen: 9, maxA: 3, h: 4.2 }, lay(3, '3', [
      { len: 5, kind: 'var', lab: mx('x'), area: mx('3x') }, { len: 4, kind: 'num', lab: '4', area: '12', hl: 1, hlLab: 'Kai’s 4' }])), [
    'Kai counted one yellow row, 4. The other two rows hold 4 + 4 = 8 more squares.',
    'Those 8 squares are there for every ' + mx('x') + '. When ' + mx('x = 1') + ' it is 15 against 7, and when ' + mx('x = 10') + ' it is 42 against 34.'
  ]),
  build(stage, ctl, ctx) {
    let x = 5;
    const am = makeArea(stage, { maxLen: 14, maxA: 3, h: 4.5 });
    const live = h('<div class="live"></div>');
    stage.append(live);
    makeSlider(ctl, 'x', 1, 10, x, v => { x = v; draw(); });
    const ch = makeChoices(ctl, ['Every value of ' + mx('x'), 'Only small values of ' + mx('x'), 'Only when ' + mx('x = 4'), 'No value of ' + mx('x')], ctx);
    function draw() {
      am.draw(lay(3, '3', [{ len: x, kind: 'var', lab: mx('x'), area: mx('3x') },
                           { len: 4, kind: 'num', lab: '4', area: mx('3 × 4 = 12'), hl: 1, hlLab: 'Kai’s 4' }]));
      live.innerHTML = '<span class="lab">Rectangle</span>' + mx('3 × (' + x + ' + 4) = ' + 3 * (x + 4)) + '<small>Kai: ' + mx('3 × ' + x + ' + 4 = ' + (3 * x + 4)) + '</small>';
    }
    draw();
    const why = [
      'Try ' + mx('x = 5') + ': the rectangle is 27, but Kai’s expression gives 19.',
      'Try ' + mx('x = 1') + ': the rectangle is 15, but Kai gets 7. Now try a large value.',
      'When ' + mx('x = 4') + ' the rectangle is 24, but Kai gets 16.',
      ''
    ];
    return {
      check() { const s = ch.sel()[0]; if (s === 3) return true; ch.mark(s, 'bad'); return why[s]; },
      win: () => 'No value. Kai counted one row of the yellow part, not 3 rows, so Kai is always 8 short. ' + mx('3(x + 4) = 3x + 12') + '.',
      won() { ch.mark(3, 'good'); ch.lock(); },
      solve() { ch.set([3]); }
    };
  }
},

/* 6 */ {
  prompt: 'Build a rectangle for ' + mx('2(x + 5)') + '.',
  why: () => whyBox(stillArea({ maxLen: 9, maxA: 2, h: 3 }, lay(2, '2', [
      { len: 4, kind: 'var', lab: mx('x'), area: mx('2x') }, { len: 5, kind: 'num', lab: '5', area: '10' }], { grid: false })), [
    'A rectangle’s area is height × length. In ' + mx('2(x + 5)') + ' the 2 is the height and ' + mx('x + 5') + ' is the length.',
    'Swapping them gives ' + mx('5(x + 2) = 5x + 10') + ', a different rectangle: its blue part is ' + mx('5x') + ', not ' + mx('2x') + '.'
  ]),
  sub: 'The blue length is ' + mx('x') + '. Drag the bottom edge to set the height, and the right edge to set the yellow length.',
  build(stage, ctl, ctx) {
    const X = 4;
    let a = 1, q = 2;
    const am = makeArea(stage, { maxLen: 12, maxA: 6, h: 12, drag: { a: [1, 6], q: [1, 8] }, names: { q: 'Yellow length' },
      onDrag(k, v) { if (k === 'a') a = v; else q = v; draw(); ctx.touch(true); } });
    const live = h('<div class="live"></div>');
    stage.append(live);
    function draw() {
      am.draw(lay(a, String(a), [{ len: X, kind: 'var', lab: mx('x'), area: mx(term(a)) }, { len: q, kind: 'num', lab: q, area: a * q }], { grid: false }));
      live.innerHTML = '<span class="lab">Your rectangle</span>' + mx(a + '(x + ' + q + ')');
    }
    draw();
    return {
      check() {
        if (a === 2 && q === 5) return true;
        if (a === 5 && q === 2) return 'That is ' + mx('5(x + 2)') + '. The number outside the bracket, 2, is the height. The bracket, ' + mx('x + 5') + ', is the length.';
        if (a !== 2) return 'The height is the number outside the bracket: 2. Yours is ' + a + '.';
        return 'The height is right. The length is ' + mx('x + 5') + ', so the yellow part should be 5 long. Yours is ' + q + '.';
      },
      win: () => 'Height 2, length ' + mx('x + 5') + '. The areas inside are ' + mx('2x') + ' and 10, so ' + mx('2(x + 5) = 2x + 10') + '. The number outside the bracket is the height, and it multiplies both parts.',
      won() { am.lock(); },
      solve() { a = 2; q = 5; draw(); }
    };
  }
},

/* 7 */ {
  bridge: true,
  prompt: 'You wrote the area of ' + mx('3(x + 4)') + ' as ' + mx('3x + 12') + ', with no brackets. Removing the brackets like this is called <b>expanding</b>.',
  show(stage) {
    bridgeArea(stage, { maxLen: 9, maxA: 3, h: 5 }, lay(3, '3', [{ len: 5, kind: 'var', lab: mx('x'), area: mx('3x') }, { len: 4, kind: 'num', lab: '4', area: '12' }]),
      mx('3(x + 4) = 3x + 12'));
  }
},

/* 8 */ {
  prompt: 'Expand ' + mx('5(2x + 1)') + '.',
  why: () => whyBox(stillArea({ maxLen: 7, maxA: 5, h: 6 }, lay(5, '5', [
      { len: 3, kind: 'var', lab: mx('x'), area: mx('5x') }, { len: 3, kind: 'var', lab: mx('x'), area: mx('5x') }, { len: 1, kind: 'num', lab: '1', area: '5' }])), [
    'The blue length ' + mx('2x') + ' is two lengths of ' + mx('x') + '. Each blue strip is 5 tall, so each holds ' + mx('5x') + '.',
    mx('5x + 5x = 10x') + ', and the yellow part is 5 × 1 = 5.'
  ]),
  sub: 'The blue length is ' + mx('2x') + ', two lengths of ' + mx('x') + '. Use the slider to test your answer.',
  build(stage, ctl, ctx) {
    let x = 3, solved = false;
    const am = makeArea(stage, { maxLen: 13, maxA: 5 });
    const live = h('<div class="live"></div>');
    stage.append(live);
    makeSlider(ctl, 'x', 1, 6, x, v => { x = v; draw(); });
    const bl = makeBlanks(ctl, mx('5(2x + 1) = {}x + {}'), ctx, () => draw());
    function draw() {
      am.draw(lay(5, '5', [{ len: 2 * x, kind: 'var', lab: mx('2x'), area: solved ? mx('10x') : '?' }, { len: 1, kind: 'num', lab: '1', area: solved ? '5' : '?' }], { ticks: [x] }));
      live.innerHTML = checkLine('Rectangle', '5 × (2 × ' + x + ' + 1)', 5 * (2 * x + 1), bl.vals(), x, false);
    }
    draw();
    return {
      check() {
        const [c, k] = bl.vals();
        if (isNaN(c) || isNaN(k)) { bl.mark('bad'); return 'Type a whole number in each box.'; }
        if (c === 10 && k === 5) return true;
        bl.mark('bad');
        if (c === 10 && k === 1) return 'You multiplied the ' + mx('2x') + ' by 5 but not the 1. The yellow part is 5 tall and 1 long, so its area is 5 × 1, not 1.';
        if (c === 10 && k === 6) return '6 is 5 + 1. The yellow part is 5 by 1, so multiply.';
        if (c === 10) return 'The ' + mx('10x') + ' is right. The yellow part is 5 tall and 1 long: what is its area?';
        if (c === 7) return '7 is 5 + 2. The blue part is 5 rows of ' + mx('2x') + ', so multiply: 5 × ' + mx('2x') + '.';
        return 'The blue part is 5 tall and ' + mx('2x') + ' long. Its area is 5 × ' + mx('2x') + '. How many ' + mx('x') + ' is that?';
      },
      win: () => mx('5(2x + 1) = 10x + 5') + '. Five rows of ' + mx('2x') + ' make ' + mx('10x') + ', and five rows of 1 make 5. It matches the rectangle for every value of ' + mx('x') + '.',
      won() { solved = true; bl.mark('good'); bl.lock(); draw(); },
      solve() { bl.set([10, 5]); }
    };
  }
},

/* 9 */ {
  prompt: 'Tap every expansion that is correct.',
  why: () => whyBox(stillArea({ maxLen: 6, maxA: 5, h: 5.5 }, lay(5, '5', [
      { len: 3, kind: 'var', lab: mx('x'), area: mx('5x') }, { len: 3, kind: 'num', lab: '3', area: '15' }])), [
    'The yellow part of ' + mx('5(x + 3)') + ' is 5 by 3, so it holds 15 squares. 8 is only 5 + 3.',
    'Test with ' + mx('x = 3') + ': ' + mx('5 × (3 + 3) = 30') + '. ' + mx('5 × 3 + 15 = 30') + ' matches, but ' + mx('5 × 3 + 8 = 23') + ' does not.'
  ]),
  sub: 'Picture each one as a rectangle.',
  build(stage, ctl, ctx) {
    stage.hidden = true;
    const ch = makeChoices(ctl, [mx('2(x + 6) = 2x + 12'), mx('4(x + 1) = 4x + 1'), mx('3(2x + 5) = 6x + 15'), mx('5(x + 3) = 5x + 8')], ctx, true);
    return {
      check() {
        const s = ch.sel(), has = i => s.includes(i);
        const bad = [1, 3].filter(has);
        if (!bad.length && has(0) && has(2)) return true;
        bad.forEach(i => ch.mark(i, 'bad'));
        const msg = [];
        if (has(1)) msg.push(mx('4x + 1') + ' multiplies only the ' + mx('x') + '. The second part is 4 tall and 1 long, so its area is 4: ' + mx('4(x + 1) = 4x + 4') + '.');
        if (has(3)) msg.push(mx('5x + 8') + ' adds 5 and 3. The second part is 5 by 3, so ' + mx('5(x + 3) = 5x + 15') + '.');
        if (msg.length) return msg.join(' ');
        if (!has(0)) return 'Expand ' + mx('2(x + 6)') + ' yourself: 2 × ' + mx('x') + ' and 2 × 6. Does it match?';
        return 'Expand ' + mx('3(2x + 5)') + ' yourself: 3 × ' + mx('2x') + ' and 3 × 5. Does it match?';
      },
      win: () => 'Two are correct. In the other two, the number outside the bracket did not multiply the second term: ' + mx('4(x + 1) = 4x + 4') + ' and ' + mx('5(x + 3) = 5x + 15') + '.',
      won() { ch.mark(0, 'good'); ch.mark(2, 'good'); ch.lock(); },
      solve() { ch.set([0, 2]); }
    };
  }
},

/* 10 */ {
  prompt: 'Expand ' + mx('4(x − 2)') + '.',
  why: () => whyBox(stillArea({ maxLen: 7, maxA: 4, h: 4.4 }, layCut(4, '4', 7, 2, { lab: mx('x'), keepLab: mx('x − 2'), cutLab: '2', keep: mx('4x − 8'), cut: '8' })), [
    'Before the cut, the rectangle is 4 by ' + mx('x') + ', so it holds ' + mx('4x') + '.',
    'The strip is 4 rows of 2, so 8 comes off: ' + mx('4x − 8') + '. The 4 multiplies the 2 because the strip is 4 rows tall.'
  ]),
  then: {
    prompt: 'Now the strip cut off is 3 long. Expand ' + mx('4(x − 3)') + '.',
    reset: false,
    why: () => whyBox(stillArea({ maxLen: 8, maxA: 4, h: 4.4 }, layCut(4, '4', 8, 3, { lab: mx('x'), keepLab: mx('x − 3'), cutLab: '3', keep: mx('4x − 12'), cut: '12' })), [
      'The whole rectangle is still 4 by ' + mx('x') + ', so it holds ' + mx('4x') + '. The strip is now 4 rows of 3, which is 12.',
      'Check with ' + mx('x = 8') + ': ' + mx('4 × (8 − 3) = 20') + ' and ' + mx('4 × 8 − 12 = 20') + '.'
    ]),
    build(stage, ctl, ctx, p1) {
      const X = 8;
      let solved = false;
      const bl = makeBlanks(ctl, mx('4(x − 3) = 4x − {}'), ctx);
      function draw() {
        p1.am.draw(layCut(4, '4', X, 3, { lab: mx('x'), keepLab: mx('x − 3'), cutLab: '3', keep: solved ? mx('4x − 12') : mx('4(x − 3)'), cut: solved ? '12' : '?' }));
        p1.live.innerHTML = '<span class="lab">Blue part when ' + mx('x = ' + X) + '</span>' + mx('4 × (' + X + ' − 3) = ' + 4 * (X - 3));
      }
      draw();
      return {
        check() {
          const k = bl.vals()[0];
          if (isNaN(k)) { bl.mark('bad'); return 'Type a whole number in the box.'; }
          if (k === 12) return true;
          bl.mark('bad');
          if (k < 0) return SIGN;
          if (k === 3) return 'You multiplied the ' + mx('x') + ' by 4 but not the 3. The strip is 4 rows tall and 3 long, so its area is 4 × 3, not 3.';
          if (k === 8) return '8 was the old strip, 4 × 2. This strip is 3 long, so its area is 4 × 3.';
          if (k === 7) return '7 is 4 + 3. The strip is 4 by 3, so multiply.';
          if (k === 1) return '1 is 4 − 3. The strip is 4 by 3: multiply to get its area.';
          return 'Only the strip changed. It is 4 tall and 3 long. What is its area?';
        },
        win: () => mx('4(x − 3) = 4x − 12') + '. A longer strip takes more away: 12 this time, not 8.',
        won() { solved = true; bl.mark('good'); bl.lock(); draw(); },
        solve() { bl.set([12]); }
      };
    }
  },
  sub: 'A 4 by 2 strip is cut off the end of a 4 by ' + mx('x') + ' rectangle. Use the slider to test your answer.',
  build(stage, ctl, ctx) {
    let x = 7, solved = false;
    const am = makeArea(stage, { maxLen: 10, maxA: 4, h: 5.5 });
    const live = h('<div class="live"></div>');
    stage.append(live);
    makeSlider(ctl, 'x', 5, 10, x, v => { x = v; draw(); });
    const bl = makeBlanks(ctl, mx('4(x − 2) = {}x − {}'), ctx, () => draw());
    function draw() {
      am.draw(layCut(4, '4', x, 2, { lab: mx('x'), keepLab: mx('x − 2'), cutLab: '2', keep: solved ? mx('4x − 8') : mx('4(x − 2)'), cut: solved ? '8' : mx('4 × 2') }));
      live.innerHTML = checkLine('Blue part', '4 × (' + x + ' − 2)', 4 * (x - 2), bl.vals(), x, true);
    }
    draw();
    return {
      check() {
        const [c, k] = bl.vals();
        if (isNaN(c) || isNaN(k)) { bl.mark('bad'); return 'Type a whole number in each box.'; }
        if (c === 4 && k === 8) return true;
        bl.mark('bad');
        if (c === 4 && k === 2) return 'You multiplied the ' + mx('x') + ' by 4 but not the 2. The strip is 4 by 2, so its area is 4 × 2, not 2.';
        if (c === 4 && k < 0) return SIGN;
        if (c === 4 && k === 6) return '6 is 4 + 2. The strip is 4 by 2, so multiply.';
        if (c === 4) return 'The ' + mx('4x') + ' is right. Now find the area of the strip cut off.';
        return 'Start with the whole rectangle, before the cut. It is 4 by ' + mx('x') + '. What is its area?';
      },
      win: () => mx('4(x − 2) = 4x − 8') + ': the whole ' + mx('4x') + ' minus the 4 by 2 strip. When ' + mx('x = ' + x) + ': 4 × ' + (x - 2) + ' = ' + 4 * (x - 2) + ' and ' + 4 * x + ' − 8 = ' + (4 * x - 8) + '.',
      won() { solved = true; bl.mark('good'); bl.lock(); draw(); },
      solve() { bl.set([4, 8]); },
      recap: () => mx('4(x − 2) = 4x − 8'),
      am, live
    };
  }
},

/* 11 */ {
  prompt: 'Expand ' + mx('2(3x − 4)') + '.',
  why: () => whyBox(stillArea({ maxLen: 9, maxA: 2, h: 3 }, layCut(2, '2', 9, 4, { lab: mx('3x'), keepLab: mx('3x − 4'), cutLab: '4', keep: mx('6x − 8'), cut: '8', ticks: [3, 6] })), [
    'The whole length ' + mx('3x') + ' is three lengths of ' + mx('x') + ', each 2 tall: ' + mx('2x + 2x + 2x = 6x') + '.',
    'The strip is 2 rows of 4, so 8 comes off: ' + mx('6x − 8') + '.'
  ]),
  sub: 'The blue length is ' + mx('3x') + ' with 4 cut off. Use the slider to test your answer.',
  build(stage, ctl, ctx) {
    let x = 3, solved = false;
    const am = makeArea(stage, { maxLen: 15, maxA: 2 });
    const live = h('<div class="live"></div>');
    stage.append(live);
    makeSlider(ctl, 'x', 2, 5, x, v => { x = v; draw(); });
    const bl = makeBlanks(ctl, mx('2(3x − 4) = {}x − {}'), ctx, () => draw());
    function draw() {
      am.draw(layCut(2, '2', 3 * x, 4, { lab: mx('3x'), keepLab: mx('3x − 4'), cutLab: '4', keep: solved ? mx('6x − 8') : '?', cut: solved ? '8' : '?', ticks: [x, 2 * x] }));
      live.innerHTML = checkLine('Blue part', '2 × (3 × ' + x + ' − 4)', 2 * (3 * x - 4), bl.vals(), x, true);
    }
    draw();
    return {
      check() {
        const [c, k] = bl.vals();
        if (isNaN(c) || isNaN(k)) { bl.mark('bad'); return 'Type a whole number in each box.'; }
        if (c === 6 && k === 8) return true;
        bl.mark('bad');
        if (c === 6 && k === 4) return 'You multiplied the ' + mx('3x') + ' by 2 but not the 4. The strip is 2 by 4, so its area is 2 × 4, not 4.';
        if (c === 6 && k < 0) return SIGN;
        if (c === 6 && k === 6) return 'That 6 is 2 + 4. The strip is 2 by 4, so multiply.';
        if (c === 6) return 'The ' + mx('6x') + ' is right. Now the strip that is cut off: 2 tall and 4 long.';
        if (c === 5) return '5 is 2 + 3. The whole rectangle is 2 rows of ' + mx('3x') + ', so multiply: 2 × ' + mx('3x') + '.';
        return 'The whole rectangle is 2 tall and ' + mx('3x') + ' long. Its area is 2 × ' + mx('3x') + '. How many ' + mx('x') + ' is that?';
      },
      win: () => mx('2(3x − 4) = 6x − 8') + '. The whole rectangle is 2 × ' + mx('3x') + ' = ' + mx('6x') + ', and the strip removed is 2 × 4 = 8.',
      won() { solved = true; bl.mark('good'); bl.lock(); draw(); },
      solve() { bl.set([6, 8]); }
    };
  }
},

/* 12 */ {
  prompt: 'Now go backwards. Build a rectangle with area ' + mx('2x + 4') + '.',
  why: () => whyBox(stillArea({ maxLen: 6, maxA: 2, h: 3 }, lay(2, '2', [
      { len: 4, kind: 'var', lab: mx('x'), area: mx('2x') }, { len: 2, kind: 'num', lab: '2', area: '4' }], { grid: false })), [
    'Both parts share one height. ' + mx('2x') + ' is 2 × ' + mx('x') + ' and 4 is 2 × 2, so a height of 2 fits both.',
    'That leaves lengths ' + mx('x') + ' and 2. Expand to check: ' + mx('2(x + 2) = 2x + 4') + '.'
  ]),
  sub: 'The blue length is ' + mx('x') + '. Drag the bottom edge and the right edge until the areas inside match.',
  build(stage, ctl, ctx) {
    const X = 4;
    let a = 1, q = 1;
    const am = makeArea(stage, { maxLen: 12, maxA: 6, h: 12, drag: { a: [1, 6], q: [1, 8] }, names: { q: 'Yellow length' },
      onDrag(k, v) { if (k === 'a') a = v; else q = v; draw(); ctx.touch(true); } });
    const live = h('<div class="live"></div>');
    stage.append(live);
    function draw() {
      am.draw(lay(a, String(a), [{ len: X, kind: 'var', lab: mx('x'), area: mx(term(a)) }, { len: q, kind: 'num', lab: q, area: a * q }], { grid: false }));
      live.innerHTML = '<span class="lab">Your area</span>' + mx(term(a) + ' + ' + a * q) + ' &nbsp; <span class="lab">Target</span>' + mx('2x + 4');
    }
    draw();
    return {
      check() {
        if (a === 2 && q === 2) return true;
        if (a === 1 && q === 4) return 'The yellow part is right, but the blue part is only ' + mx('x') + '. You need ' + mx('2x') + ', so how tall must it be?';
        if (a !== 2) return 'The blue part is ' + a + ' tall and ' + mx('x') + ' long, so its area is ' + mx(term(a)) + '. You need ' + mx('2x') + '. Set the height first.';
        return 'The blue part is right. The yellow part is 2 × ' + q + ' = ' + 2 * q + '. You need 4.';
      },
      win: () => 'Height 2 and length ' + mx('x + 2') + ' give areas ' + mx('2x') + ' and 4. So ' + mx('2x + 4 = 2(x + 2)') + '. Writing a sum as a product like this is called factorising.',
      won() { am.lock(); },
      solve() { a = 2; q = 2; draw(); }
    };
  }
},

/* 13 */ {
  prompt: 'This rectangle has area ' + mx('6x + 9') + '. Drag its height to factorise it.',
  why: () => whyBox(stillArea({ maxLen: 7, maxA: 3, h: 4.2 }, lay(3, '3', [
      { len: 4, kind: 'var', lab: mx('2x'), area: mx('6x') }, { len: 3, kind: 'num', lab: '3', area: '9' }], { grid: false })), [
    'Factors of 6: 1, 2, 3, 6. Factors of 9: 1, 3, 9. The biggest number in both lists is 3.',
    'Divide each area by the height to get its length: ' + mx('6x ÷ 3 = 2x') + ' and ' + mx('9 ÷ 3 = 3') + '.'
  ]),
  then: {
    prompt: 'Check it. When ' + mx('x = 2') + ', what is the area of the whole rectangle?',
    sub: 'Use ' + mx('6x + 9') + ' or ' + mx('3(2x + 3)') + '. They should agree.',
    reset: false,
    why: () => whyBox(stillArea({ maxLen: 7, maxA: 3, h: 4.2 }, lay(3, '3', [
        { len: 4, kind: 'var', lab: mx('2x = 4'), area: '12' }, { len: 3, kind: 'num', lab: '3', area: '9' }])), [
      'When ' + mx('x = 2') + ', the blue length ' + mx('2x') + ' is 4. The rectangle is 3 by 7, which is 21 squares.',
      'Counting the two parts finds the same squares: ' + mx('6 × 2 + 9 = 12 + 9 = 21') + '.'
    ]),
    build(stage, ctl, ctx, p1) {
      const ans = makeAnswer(ctl, 'Area when ' + mx('x = 2'), ctx);
      return {
        check() {
          const v = ans.value();
          if (v === 21) return true;
          ans.mark('bad');
          if (isNaN(v)) return 'Type a whole number, using digits only.';
          if (v === 71) return mx('6x') + ' means 6 × ' + mx('x') + ', not a 6 with a 2 written after it. 6 × 2 = 12, then add 9.';
          if (v === 12) return 'That is the blue part, 6 × 2. Add the yellow part, 9.';
          if (v === 17) return '6 + 2 + 9 adds the 6 and the 2. ' + mx('6x') + ' means 6 × ' + mx('x') + ', so the blue part is 6 × 2 = 12.';
          if (v === 7) return '7 is the length, 2 × 2 + 3. The rectangle is 3 tall, so multiply the length by 3.';
          if (v === 15) return 'Check each number. The blue length ' + mx('2x') + ' is 2 × 2 = 4, not 2, and the yellow area is 9, not 3.';
          return 'Swap each ' + mx('x') + ' for 2: 6 × 2 + 9. Or use the rectangle: 3 tall and 2 × 2 + 3 long.';
        },
        win: () => 'Both forms give 21: ' + mx('6 × 2 + 9 = 21') + ' and ' + mx('3 × (2 × 2 + 3) = 3 × 7 = 21') + '. Factorising changes how the expression is written, not its value.',
        won() {
          ans.mark('good'); ans.lock();
          p1.am.draw(lay(3, '3', [{ len: 4, kind: 'var', lab: mx('2 × 2 = 4'), area: '12' }, { len: 3, kind: 'num', lab: '3', area: '9' }], { grid: false }));
          p1.live.innerHTML = '<span class="lab">When ' + mx('x = 2') + '</span>' + mx('12 + 9 = 21') + ' &nbsp; ' + mx('3 × 7 = 21');
        },
        solve() { ans.set(21); }
      };
    }
  },
  sub: 'The areas stay the same, so the lengths change. Find the biggest height that gives no decimals in the lengths.',
  build(stage, ctl, ctx) {
    const X = 2;
    let a = 1;
    const am = makeArea(stage, { maxLen: 21, maxA: 6, h: 10, drag: { a: [1, 6] }, onDrag(k, v) { a = v; draw(); ctx.touch(true); } });
    const live = h('<div class="live"></div>');
    stage.append(live);
    function draw() {
      const c = 6 / a, k = 9 / a;
      am.draw(lay(a, String(a), [{ len: c * X, kind: 'var', lab: mx(term(c)), area: mx('6x') }, { len: k, kind: 'num', lab: dec(k), area: '9' }], { grid: false }));
      live.innerHTML = mx('6x + 9 = ' + a + '(' + term(c) + ' + ' + dec(k) + ')');
    }
    draw();
    const why = {
      1: 'Height 1 always works, because ' + mx('6x + 9 = 1(6x + 9)') + '. That doesn’t simplify anything. Look for a bigger height.',
      2: 'The yellow length is 9 ÷ 2 = 4.5, a decimal. 2 does not divide 9.',
      4: 'The lengths are ' + mx('1.5x') + ' and 2.25. 4 does not divide 6 or 9.',
      5: 'The lengths are ' + mx('1.2x') + ' and 1.8. 5 does not divide 6 or 9.',
      6: 'The blue length is ' + mx('x') + ', but the yellow length is 9 ÷ 6 = 1.5. 6 does not divide 9.'
    };
    return {
      check() { return a === 3 ? true : why[a]; },
      win: () => 'Height 3 gives lengths ' + mx('2x') + ' and 3, so ' + mx('6x + 9 = 3(2x + 3)') + '. 3 is the highest common factor of 6 and 9: the biggest number that divides both.',
      won() { am.lock(); },
      solve() { a = 3; draw(); },
      recap: () => mx('6x + 9 = 3(2x + 3)'),
      am, live
    };
  }
},

/* 14 */ {
  bridge: true,
  prompt: 'You started with the areas, ' + mx('6x + 9') + ', and found the height and length, ' + mx('3(2x + 3)') + '. Putting the brackets back like this is called <b>factorising</b>. It is expanding in reverse.',
  show(stage) {
    bridgeArea(stage, { maxLen: 7, maxA: 3, h: 5 }, lay(3, '3', [{ len: 4, kind: 'var', lab: mx('2x'), area: mx('6x') }, { len: 3, kind: 'num', lab: '3', area: '9' }], { grid: false }),
      mx('6x + 9 = 3(2x + 3)'));
  }
},

/* 15 */ {
  prompt: 'Tap every expression that equals ' + mx('4x + 8') + '.',
  why: () => whyBox(
    stillArea({ maxLen: 4, maxA: 4, h: 4.2 }, lay(4, '4', [{ len: 2, kind: 'var', lab: mx('x'), area: mx('4x') }, { len: 2, kind: 'num', lab: '2', area: '8' }], { grid: false })) +
    stillArea({ maxLen: 8, maxA: 2, h: 2.1 }, lay(2, '2', [{ len: 4, kind: 'var', lab: mx('2x'), area: mx('4x') }, { len: 4, kind: 'num', lab: '4', area: '8' }], { grid: false })), [
    'Both rectangles hold ' + mx('4x') + ' and 8, so ' + mx('4(x + 2)') + ' and ' + mx('2(2x + 4)') + ' both equal ' + mx('4x + 8') + '.',
    mx('4(x + 8)') + ' would hold ' + mx('4 × 8 = 32') + ' in its yellow part, and ' + mx('8(x + 1)') + ' would hold ' + mx('8x') + ' in its blue part.'
  ]),
  sub: 'Expand each one to check.',
  build(stage, ctl, ctx) {
    stage.hidden = true;
    const ch = makeChoices(ctl, [mx('4(x + 2)'), mx('4(x + 8)'), mx('2(2x + 4)'), mx('8(x + 1)')], ctx, true);
    return {
      check() {
        const s = ch.sel(), has = i => s.includes(i);
        const bad = [1, 3].filter(has);
        if (!bad.length && has(0) && has(2)) return true;
        bad.forEach(i => ch.mark(i, 'bad'));
        const msg = [];
        if (has(1)) msg.push(mx('4(x + 8)') + ' expands to ' + mx('4x + 32') + '. The 4 multiplies the 8 too, so the bracket needs 8 ÷ 4 = 2.');
        if (has(3)) msg.push(mx('8(x + 1)') + ' expands to ' + mx('8x + 8') + '. Its ' + mx('x') + ' term is ' + mx('8x') + ', not ' + mx('4x') + '.');
        if (msg.length) return msg.join(' ');
        if (!has(0)) return 'Expand ' + mx('4(x + 2)') + ' yourself: 4 × ' + mx('x') + ' and 4 × 2. Does it match?';
        return 'Expand ' + mx('2(2x + 4)') + ' yourself: 2 × ' + mx('2x') + ' and 2 × 4. Does it match?';
      },
      win: () => mx('4(x + 2)') + ' and ' + mx('2(2x + 4)') + ' both equal ' + mx('4x + 8') + '. ' + mx('4(x + 2)') + ' uses the highest common factor, 4, so it is called fully factorised.',
      won() { ch.mark(0, 'good'); ch.mark(2, 'good'); ch.lock(); },
      solve() { ch.set([0, 2]); }
    };
  }
},

/* 16 */ {
  prompt: 'Three students expand ' + mx('4(2x + 5)') + '. Who is right?',
  why: () => whyBox(stillArea({ maxLen: 9, maxA: 4, h: 4.8 }, lay(4, '4', [
      { len: 4, kind: 'var', lab: mx('2x'), area: mx('8x') }, { len: 5, kind: 'num', lab: '5', area: '20', hl: 1, hlLab: 'Mia’s 5' }], { grid: false })), [
    'Mia’s 5 is one row of the yellow part. It has 4 rows: ' + mx('4 × 5 = 20') + '.',
    'Lena can’t join the two parts into ' + mx('28x') + ': the blue area changes with ' + mx('x') + ', but the yellow area is always 20.'
  ]),
  sub: 'Choose Agree or Disagree for each one.',
  build(stage, ctl, ctx) {
    stage.hidden = true;
    const claims = [
      { who: 'Mia', say: '“' + mx('4(2x + 5) = 8x + 5') + '. The 4 goes with the ' + mx('2x') + ', because that’s the term next to it.”', agree: false, hint: 'Picture a rectangle 4 tall. What is the area of the part that is 5 long?', why: 'The 4 multiplies the whole bracket. On a rectangle 4 tall, the part 5 long has area 4 × 5 = 20, not 5.' },
      { who: 'Tom', say: '“' + mx('4(2x + 5) = 8x + 20') + '. The rectangle is 4 tall, so both parts get multiplied by 4.”', agree: true, hint: 'Test Tom’s answer and ' + mx('4(2x + 5)') + ' with ' + mx('x = 1') + '. Do they match?', why: 'This is the distributive law: 4 × ' + mx('2x') + ' + 4 × 5.' },
      { who: 'Lena', say: '“It’s ' + mx('8x + 20') + ', and that simplifies to ' + mx('28x') + '.”', agree: false, hint: 'Test ' + mx('8x + 20') + ' and ' + mx('28x') + ' with ' + mx('x = 2') + '. Do they match?', why: mx('8x') + ' and 20 are not like terms, so they can’t be added. When ' + mx('x = 2') + ', ' + mx('8x + 20') + ' is 36 but ' + mx('28x') + ' is 56.' }
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
      win: () => 'Tom has it. Mia multiplied only the first term in the bracket, and Lena added terms that are not alike. ' + mx('4(2x + 5) = 8x + 20') + ': the number outside multiplies every term inside.',
      won() { locked = true; claims.forEach((c, i) => { rows[i].row.classList.remove('bad'); explain(i, 'good', c.why); rows[i].btns.forEach(b => { b.disabled = true; }); }); },
      solve() { claims.forEach((c, i) => { pick[i] = c.agree; paint(i); }); }
    };
  }
}
];

const SECTIONS = [[0, 'Numbers'], [2, 'Letters'], [6, 'Expanding'], [9, 'Subtraction'], [11, 'Factorising'], [13, 'Two forms'], [15, 'Wrap-up']];

// Finish screen: sets the prompt, sub-line and recap for this lesson.
function drawFinish() {
  promptEl.textContent = 'To expand a bracket, multiply every term inside it.';
  subEl.hidden = false; subEl.textContent = 'Four things to remember:';
  ctl.replaceChildren(); stage.hidden = false;
  // Small area models: 'split' a(b + c), 'row' the one-row trap, 'cut' a strip removed.
  const mini = t => '<svg class="mini" viewBox="0 0 46 30" aria-hidden="true">' +
    (t === 'cut' ? '<rect class="v" x="2" y="2" width="30" height="26"/><rect class="c" x="32" y="2" width="12" height="26"/>'
                 : '<rect class="v" x="2" y="2" width="26" height="26"/><rect class="n" x="28" y="2" width="16" height="26"/>') +
    (t === 'row' ? '<rect class="o" x="28" y="2" width="16" height="8.7"/>' : '') + '<rect class="o" x="2" y="2" width="42" height="26"/></svg>';
  stage.replaceChildren(h('<ul class="recap">' +
    '<li><span class="art">' + mini('split') + '</span><span>' + mx('a(b + c)') + ' is the area of a rectangle split into two parts, so it equals ' + mx('ab + ac') + '.</span></li>' +
    '<li><span class="art">' + mini('row') + '</span><span>The number outside multiplies <b>every</b> term: ' + mx('3(x + 4) = 3x + 12') + ', not ' + mx('3x + 4') + '.</span></li>' +
    '<li><span class="art">' + mini('cut') + '</span><span>A minus sign works the same way. Cut a strip off: ' + mx('4(x − 2) = 4x − 8') + '.</span></li>' +
    '<li><span class="art">' + mini('split') + '</span><span>Factorising runs it backwards. Use the highest common factor as the height: ' + mx('6x + 9 = 3(2x + 3)') + '.</span></li></ul>'));
}
