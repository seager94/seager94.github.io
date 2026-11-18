/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const h = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');

// "b + b + 3" -> maths markup. Single lower-case letters become variables, and so does the letter in "3b".
function mx(s) {
  return '<span class="m">' + String(s).split(' ').map(t => /^[a-z]$/.test(t) ? '<i class="v">' + t + '</i>'
    : /^\d+[a-z]$/.test(t) ? t.slice(0, -1) + '<i class="v">' + t.slice(-1) + '</i>' : t).join(' ') + '</span>';
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
  // onRemove is told which pan the tapped marble sits on: 'L' or 'R'.
  if (o.onRemove) svg.addEventListener('click', e => { const m = e.target.closest('.mb.rm'); if (m) o.onRemove(m.closest('.sc-pan') === pans[1] ? 'R' : 'L'); });
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
    raw: () => inp.value.trim(),
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

/* ---------- cards ---------- */
// Shrink a balance so the controls under it fit without scrolling.
const compact = (stage, vh = 25) => { $('.scale-wrap', stage).style.width = 'min(100%, 30rem, calc(' + vh + 'vh * 2.42))'; };
// The left pan of b + L: one bag (hidden or see-through) and L loose marbles.
const bagSide = (L, inside, open, removable) => ({ bags: [open ? { tag: 'b', inside } : { tag: 'b', body: '?' }], loose: L, weight: inside + L, removable });
const lhsOf = L => mx(L ? 'b + ' + L : 'b');

// Number line from 0 to 14. A jump of `hop` to the left starts at x; the target is the yellow dot.
function makeHop(host, hop, target) {
  const X = v => 30 + v * 500 / 14;
  let ticks = '';
  for (let v = 0; v <= 14; v++) ticks += '<line class="nl-tick" x1="' + X(v) + '" y1="88" x2="' + X(v) + '" y2="100"/><text class="nl-num" x="' + X(v) + '" y="124" text-anchor="middle">' + v + '</text>';
  const svg = h('<svg class="hop" viewBox="0 0 560 132" role="img"><defs><marker id="nl-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#2B2D2F"/></marker></defs>' +
    '<line class="nl-axis" x1="18" y1="94" x2="542" y2="94"/>' + ticks +
    '<circle class="nl-t" cx="' + X(target) + '" cy="94" r="9"/><g class="nl-move"></g></svg>');
  host.append(svg);
  return {
    set(x) {
      const a = X(x), b = X(x - hop), m = (a + b) / 2;
      $('.nl-move', svg).innerHTML = '<path class="nl-arc" d="M' + a + ' 80 Q' + m + ' 20 ' + b + ' 82" marker-end="url(#nl-ah)"/>' +
        '<text class="nl-lab" x="' + m + '" y="42" text-anchor="middle">− ' + hop + '</text>' +
        '<circle class="nl-x" cx="' + a + '" cy="94" r="13"/><text class="nl-xt" x="' + a + '" y="100" text-anchor="middle">x</text>';
      svg.setAttribute('aria-label', 'Number line. A jump of ' + hop + ' to the left from ' + x + ' lands on ' + (x - hop) + '. The target is ' + target + '.');
    }
  };
}

// One line of working: choose an operation and a number, and it is done to both sides.
function makeStep(stage, ctl, lhs, rhs, ctx) {
  const OPS = ['+', '−', '×', '÷'], NAMES = { '+': 'add', '−': 'subtract', '×': 'multiply by', '÷': 'divide by' };
  let op = null, k = null, fin = '', locked = false;
  const work = h('<div class="work"></div>');
  stage.append(work);
  const row = h('<div class="answer"><span>Do</span><div class="yn" role="group" aria-label="Operation"></div><input type="text" inputmode="numeric" autocomplete="off" maxlength="3" aria-label="Number"><span>to both sides</span></div>');
  const yn = $('.yn', row), inp = $('input', row);
  const btns = OPS.map(o => {
    const b = h('<button type="button" aria-pressed="false" aria-label="' + NAMES[o] + '">' + o + '</button>');
    b.onclick = () => { if (!locked) { op = o; paint(); } };
    yn.append(b);
    return b;
  });
  inp.addEventListener('input', () => { const v = inp.value.trim(); k = /^\d+$/.test(v) ? +v : null; paint(); });
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ctx.submit(); } });
  ctl.append(row);
  const line = (l, r, cls) => '<span class="l' + (cls ? ' ' + cls : '') + '">' + l + '</span><span class="' + (cls || '') + '">=</span><span class="r' + (cls ? ' ' + cls : '') + '">' + r + '</span>';
  const blank = '<span class="blank">?</span>';
  function paint() {
    btns.forEach((b, i) => b.setAttribute('aria-pressed', OPS[i] === op));
    const tail = ' ' + (op ? '<span class="m">' + op + '</span>' : blank) + ' ' + (k == null ? blank : '<span class="m">' + k + '</span>');
    work.innerHTML = line(mx(lhs), mx(rhs)) + line(mx(lhs) + tail, mx(rhs) + tail) + fin;
    ctx.touch(op != null && k != null);
  }
  paint();
  return {
    op: () => op, k: () => k,
    set(o, n) { op = o; k = n; inp.value = n; paint(); },
    finish(l, r) { fin = line(mx(l), mx(r), 'fin'); paint(); },
    lock() { locked = true; inp.disabled = true; btns.forEach(b => { b.disabled = true; }); }
  };
}

const cards = [

/* 1 */ {
  prompt: 'Take the 4 loose marbles off the left only. Then what is true?',
  build(stage, ctl, ctx) {
    const BAG = 7, R = 11;
    let L = 4, ch = null;
    const ready = () => ctx.touch(L === 0 && ch.sel().length > 0);
    const take = side => { if (side === 'L' && L > 0) { L--; draw(); ready(); } };
    const sc = makeScale(stage, { onRemove: take });
    compact(stage, 21);
    function draw() {
      const bal = BAG + L === R;
      sc.update(bagSide(L, BAG, false, true), { loose: R, weight: R });
      sc.bar(lhsOf(L), bal ? '=' : '≠', mx(R), bal);
    }
    const tray = h('<div class="tray"><button type="button" class="linkbtn">Take one off the left</button></div>');
    $('button', tray).onclick = () => take('L');
    ctl.append(tray);
    ch = makeChoices(ctl, [mx('b = 11'), 'The bag holds fewer than 11 marbles', 'The bag holds more than 11 marbles', 'The scale still balances'], { touch: ready });
    const why = [
      'The scale is not level any more, so the bag does not balance 11 marbles now. Which side went down?',
      '',
      'Look at which side went down. The heavier side sinks.',
      'Look at the scale: it tipped. The left side lost 4 marbles and the right side lost none.'
    ];
    draw();
    return {
      check() { const s = ch.sel()[0]; if (s === 1) return true; ch.mark(s, 'bad'); return why[s]; },
      win: () => 'The bag side rose, so the bag holds fewer than 11. Changing one side only breaks the balance, which is why ' + mx('b = 11') + ' is wrong.',
      won() { ch.mark(1, 'good'); ch.lock(); },
      solve() { L = 0; draw(); ch.set([1]); }
    };
  }
},

/* 2 */ {
  prompt: 'Same scale, ' + mx('b + 4 = 11') + '. Get the bag on its own and keep the scale level.',
  sub: 'Tap marbles on either side to take them off, or use the buttons.',
  build(stage, ctl, ctx) {
    const BAG = 7;
    let L = 4, R = 11, open = false;
    const take = side => {
      if (open) return;
      if (side === 'L' && L > 0) L--; else if (side === 'R' && R > 0) R--; else return;
      draw(); ctx.touch(true);
    };
    const sc = makeScale(stage, { onRemove: take });
    compact(stage);
    function draw() {
      const bal = BAG + L === R;
      sc.update(bagSide(L, BAG, open, !open), { loose: R, weight: R, removable: !open });
      sc.bar(lhsOf(L), bal ? '=' : '≠', mx(R), bal);
    }
    const tray = h('<div class="tray"><button type="button" class="linkbtn">Take one off the left</button><button type="button" class="linkbtn">Take one off the right</button><button type="button" class="linkbtn">Put them all back</button></div>');
    const [bl, br, bb] = tray.querySelectorAll('button');
    bl.onclick = () => take('L');
    br.onclick = () => take('R');
    bb.onclick = () => { if (!open) { L = 4; R = 11; draw(); ctx.touch(false); } };
    ctl.append(tray);
    draw();
    return {
      check() {
        if (L === 0 && R === BAG) return true;
        const offL = 4 - L, offR = 11 - R;
        if (BAG + L === R) return 'Still level, because you took ' + plural(offL, 'marble') + ' off each side. The bag isn’t on its own yet, so keep going.';
        if (BAG + L < R) return 'The bag side went up. You took ' + offL + ' off the left but only ' + offR + ' off the right. Take the same number off each side.';
        return 'The bag side went down. You took ' + offR + ' off the right but only ' + offL + ' off the left. Put them all back and take the same number off each side.';
      },
      win: () => 'Taking 4 off both sides kept the scale level, and now the bag balances 7 marbles. So ' + mx('b = 7') + '. Check: 7 + 4 = 11.',
      won() { open = true; draw(); },
      solve() { L = 0; R = BAG; draw(); }
    };
  }
},

/* 3 */ {
  prompt: 'Three bags balance 12 marbles: ' + mx('3b = 12') + '. How many marbles are in one bag?',
  sub: mx('3b') + ' means 3 × ' + mx('b') + '. Share both sides into 3 equal groups.',
  build(stage, ctl, ctx) {
    let pile = 12, each = 0, open = false;
    const board = h('<div class="share"><div class="pile"></div><div class="groups" role="img"></div><div class="live"></div></div>');
    stage.append(board);
    const tray = h('<div class="tray"><button type="button" class="src tap">' + SVG_MARBLE + '<span>Share out<small>one marble to each group</small></span></button><button type="button" class="linkbtn">Start again</button></div>');
    const [deal, reset] = tray.querySelectorAll('button');
    deal.onclick = () => { if (pile >= 3 && !open) { pile -= 3; each++; draw(); } };
    reset.onclick = () => { if (!open) { pile = 12; each = 0; draw(); } };
    ctl.append(tray);
    const ans = makeAnswer(ctl, mx('b') + ' =', ctx);
    function draw() {
      $('.pile', board).innerHTML = pile ? '<span class="lab">' + pile + ' to share</span>' + SVG_MARBLE.repeat(pile) : '<span class="lab">All 12 marbles shared</span>';
      $('.groups', board).innerHTML = ('<div class="grp">' + svgBag(open ? { tag: 'b', inside: each } : { tag: 'b', body: '?' }) + '<span class="eqs">=</span><div class="mbs">' + SVG_MARBLE.repeat(each) + '</div></div>').repeat(3);
      $('.groups', board).setAttribute('aria-label', '3 groups, each with one bag and ' + plural(each, 'marble'));
      $('.live', board).innerHTML = '<small>' + (pile ? 'Each group has ' + plural(each, 'marble') + '. ' + pile + ' still to share.' : 'Each group: 1 bag and ' + plural(each, 'marble') + '.') + '</small>';
      deal.disabled = pile < 3 || open;
    }
    draw();
    return {
      check() {
        const v = ans.value();
        if (v === 4) return true;
        ans.mark('bad');
        if (isNaN(v)) return 'Type a whole number, using digits only.';
        if (v === 9) return '9 is 12 − 3. But there are no loose marbles on the bag side to take away: the 3 counts bags. Share the 12 marbles between the 3 bags.';
        if (v === 15) return '15 is 12 + 3. One bag holds less than all 12 marbles, not more. Share the 12 between the 3 bags.';
        if (v === 36) return '36 is 12 × 3. One bag holds less than all 12 marbles, not more. Share the 12 between the 3 bags.';
        if (v === 12) return '12 marbles balance all three bags together. One bag gets one of the 3 equal shares.';
        return pile ? 'Keep sharing until no marbles are left, then count the marbles in one group.'
                    : 'Count the marbles next to one bag. Check: 3 × ' + v + ' = ' + 3 * v + ', not 12.';
      },
      win: () => 'Each bag gets 4, so ' + mx('b = 4') + '. Sharing into 3 equal groups divides both sides by 3: 12 ÷ 3 = 4.',
      won() { pile = 0; each = 4; open = true; draw(); ans.mark('good'); ans.lock(); },
      solve() { pile = 0; each = 4; draw(); ans.set(4); }
    };
  }
},

/* 4 */ {
  prompt: 'Is 6 a solution of ' + mx('b + 4 = 11') + '?',
  sub: 'A solution is a number that makes the equation true. Test 6 by putting it in place of ' + mx('b') + '.',
  build(stage, ctl, ctx) {
    const live = h('<div class="live"><small>Try ' + mx('b = 6') + '</small></div>');
    stage.append(h('<div class="note">' + mx('b + 4 = 11') + '</div>'), live);
    const ch = makeChoices(ctl, ['Yes. 6 and 4 make 11.', 'No. 6 + 4 = 10, and 10 is not 11.', 'Yes. 6 is close enough to the answer.', 'You can’t tell without solving it first.'], ctx);
    const why = [
      'Work out 6 + 4 and compare it with 11.',
      '',
      'A solution makes both sides exactly equal, not nearly equal. Work out 6 + 4 and compare it with 11.',
      'You can test a number without solving: put it in place of ' + mx('b') + ' and see whether both sides match.'
    ];
    return {
      check() { const s = ch.sel()[0]; if (s === 1) return true; ch.mark(s, 'bad'); return why[s]; },
      win: () => 'No. 6 + 4 = 10, not 11, so 6 is not a solution. Putting a number in place of the letter is called substitution. It checks any answer: 7 + 4 = 11, so 7 is the solution.',
      won() { ch.mark(1, 'good'); ch.lock(); live.innerHTML = mx('6 + 4 = 10 ≠ 11') + '<small>' + mx('7 + 4 = 11') + '</small>'; },
      solve() { ch.set([1]); }
    };
  }
},

/* 5 */ {
  prompt: 'Which value of ' + mx('b') + ' is a solution of ' + mx('5b = 35') + '?',
  sub: mx('5b') + ' means 5 × ' + mx('b') + '. Substitute each value and see whether you get 35.',
  build(stage, ctl, ctx) {
    stage.append(h('<div class="note">' + mx('5b = 35') + '</div>'));
    const ch = makeChoices(ctl, [mx('b = 30'), mx('b = 7'), mx('b = 40'), mx('b = 175')], ctx);
    const why = [
      'Check: 5 × 30 = 150, not 35. 30 is 35 − 5, but ' + mx('5b') + ' is 5 lots of ' + mx('b') + ', not ' + mx('b') + ' and 5 more. Taking away 5 doesn’t undo multiplying by 5.',
      '',
      'Check: 5 × 40 = 200, not 35. 40 is 35 + 5. Five bags hold 35 marbles altogether, so one bag holds less than 35.',
      'Check: 5 × 175 = 875, not 35. 175 is 35 × 5. One bag holds less than all 35 marbles.'
    ];
    return {
      check() { const s = ch.sel()[0]; if (s === 1) return true; ch.mark(s, 'bad'); return why[s]; },
      win: () => '5 × 7 = 35, so ' + mx('b = 7') + ' is the solution. The equation multiplies by 5, so dividing by 5 undoes it: 35 ÷ 5 = 7.',
      won() { ch.mark(1, 'good'); ch.lock(); },
      solve() { ch.set([1]); }
    };
  }
},

/* 6 */ {
  prompt: mx('x − 3 = 5') + '. Slide ' + mx('x') + ' until a jump back of 3 lands on the yellow 5.',
  sub: 'Start at ' + mx('x') + ' and jump 3 to the left.',
  build(stage, ctl, ctx) {
    let x = 11;
    const nl = makeHop(stage, 3, 5), live = h('<div class="live"></div>');
    stage.append(live);
    function draw() {
      nl.set(x);
      live.innerHTML = mx('x − 3') + '<small>' + x + ' − 3 = ' + (x - 3) + (x - 3 === 5 ? ', which is 5' : ', not 5') + '</small>';
    }
    const sl = makeSlider(ctl, 'x', 3, 14, x, v => { x = v; draw(); ctx.touch(true); });
    draw();
    return {
      check(attempt) {
        if (x === 8) return true;
        const land = x - 3, left = land < 5;
        return 'Starting at ' + x + ', a jump back of 3 lands on ' + land + '. That is ' + (left ? 'left' : 'right') + ' of 5, so start further ' + (left ? 'right' : 'left') + '.' +
          (attempt >= 2 ? ' Or work backwards: start at 5 and jump 3 to the right.' : '');
      },
      win: () => mx('x = 8') + '. To get from 5 back to ' + mx('x') + ', jump the other way: 5 + 3 = 8. Adding 3 undoes subtracting 3. Check: 8 − 3 = 5.',
      won() { $('input', ctl).disabled = true; },
      solve() { sl.set(8); }
    };
  }
},

/* 7 */ {
  prompt: mx('n ÷ 2 = 7') + '. Work backwards from 7 to find ' + mx('n') + '.',
  sub: 'The top row shows what happens to ' + mx('n') + '. Undo it, starting from 7.',
  build(stage, ctl, ctx) {
    const flow = h('<div class="flow" role="img" aria-label="Forwards: n, divide by 2, gives 7. Backwards: start at 7 and undo the step."></div>');
    const draw = (n, op) => {
      flow.innerHTML = '<span class="fcap">Forwards</span><span class="tile var still">n</span><span class="farr">→</span><span class="fop">÷ 2</span><span class="farr">→</span><span class="tile num still">7</span>' +
        '<span class="fcap">Backwards</span>' + (n ? '<span class="tile num still pop">' + n + '</span>' : '<span class="fq">?</span>') + '<span class="farr">←</span>' +
        (op ? '<span class="fop pop">' + op + '</span>' : '<span class="fop fq">?</span>') + '<span class="farr">←</span><span class="tile num still">7</span>';
    };
    draw();
    stage.append(flow);
    const ans = makeAnswer(ctl, mx('n') + ' =', ctx);
    return {
      check() {
        const v = ans.value(), f = parseFloat(ans.raw().replace(',', '.'));
        if (v === 14) return true;
        ans.mark('bad');
        if (f === 3.5) return '7 ÷ 2 = 3.5 divides by 2 again. Going backwards, you need the opposite of dividing by 2.';
        if (isNaN(v)) return 'Type a whole number, using digits only.';
        if (v === 5) return '5 is 7 − 2. Check: 5 ÷ 2 = 2.5, not 7. The step divides by 2, so subtracting doesn’t undo it.';
        if (v === 9) return '9 is 7 + 2. Check: 9 ÷ 2 = 4.5, not 7. Adding undoes subtracting, but this step divides by 2.';
        if (v < 7) return 'Halving ' + mx('n') + ' gives 7, so ' + mx('n') + ' must be bigger than 7.';
        return 'Check: ' + v + ' ÷ 2 = ' + v / 2 + ', not 7. What undoes dividing by 2?';
      },
      win: () => 'Doubling undoes halving: 7 × 2 = 14, so ' + mx('n = 14') + '. Check: 14 ÷ 2 = 7.',
      won() { draw(14, '× 2'); ans.mark('good'); ans.lock(); },
      solve() { ans.set(14); }
    };
  }
},

/* 8 */ {
  prompt: 'You took 4 marbles off both sides of this scale. Which line of working records that move?',
  build(stage, ctl, ctx) {
    const sc = makeScale(stage);
    compact(stage);
    const draw = done => {
      sc.update(bagSide(done ? 0 : 4, 7, done, false), { loose: done ? 7 : 11, weight: done ? 7 : 11 });
      sc.bar(lhsOf(done ? 0 : 4), '=', mx(done ? 7 : 11), true);
    };
    draw(false);
    const ch = makeChoices(ctl, [mx('b + 4 − 4 = 11'), mx('b + 4 = 11 − 4'), mx('b + 4 − 4 = 11 − 4'), mx('b = 11 + 4')], ctx);
    const why = [
      'This takes 4 off the left only. That is the move that tipped the scale, because the right still has 11.',
      'This takes 4 off the right only. The scale would tip the other way.',
      '',
      'Adding 4 to the 11 puts more marbles on the right. Taking 4 off the left has to be matched by taking 4 off the right.'
    ];
    return {
      check() { const s = ch.sel()[0]; if (s === 2) return true; ch.mark(s, 'bad'); return why[s]; },
      win: () => mx('b + 4 − 4 = 11 − 4') + ' takes 4 off both sides, so the next line is ' + mx('b = 7') + '. Each line of working records the scale, and each line must still balance.',
      won() { ch.mark(2, 'good'); ch.lock(); draw(true); },
      solve() { ch.set([2]); }
    };
  }
},

/* 9 */ {
  prompt: 'Solve ' + mx('6x = 42') + '. What can you do to both sides to leave ' + mx('x') + ' on its own?',
  sub: mx('6x') + ' means 6 × ' + mx('x') + '. Choose an operation and type a number.',
  build(stage, ctl, ctx) {
    const st = makeStep(stage, ctl, '6x', '42', ctx);
    return {
      check() {
        const o = st.op(), n = st.k();
        if (o === '÷' && n === 6) return true;
        if (o === '−') return mx('6x − ' + n) + ' still has 6 lots of ' + mx('x') + ' in it. Subtracting undoes adding, but ' + mx('6x') + ' is 6 × ' + mx('x') + '. What undoes multiplying by 6?';
        if (o === '+') return 'Adding ' + n + ' makes the left side bigger and still leaves 6 lots of ' + mx('x') + '. What undoes multiplying by 6?';
        if (o === '×') return 'Multiplying by ' + n + ' gives more lots of ' + mx('x') + ', not fewer. You need the opposite of multiplying.';
        return 'Dividing is the right move, but ' + mx('6x') + ' ÷ ' + n + ' doesn’t leave exactly one ' + mx('x') + '. Divide by the number that multiplies ' + mx('x') + '.';
      },
      win: () => mx('6x ÷ 6 = 42 ÷ 6') + ', so ' + mx('x = 7') + '. Check: 6 × 7 = 42.',
      won() { st.finish('x', '7'); st.lock(); },
      solve() { st.set('÷', 6); }
    };
  }
},

/* 10 */ {
  prompt: 'Kai solved ' + mx('5x = 30') + ' like this. What went wrong?',
  build(stage, ctl, ctx) {
    stage.append(h('<div class="work"><span class="l">' + mx('5x') + '</span><span>=</span><span class="r">' + mx('30') + '</span>' +
      '<span class="l">' + mx('5x − 5') + '</span><span>=</span><span class="r">' + mx('30 − 5') + '</span>' +
      '<span class="l">' + mx('x') + '</span><span>=</span><span class="r">' + mx('25') + '</span></div>'));
    const ch = makeChoices(ctl, [
      'Nothing. ' + mx('x = 25') + ' is right.',
      'Kai took 5 off one side only.',
      mx('5x') + ' is 5 × ' + mx('x') + ', so taking 5 away doesn’t leave ' + mx('x') + '. Kai should divide both sides by 5.',
      'Kai should add 5 to both sides instead.'
    ], ctx);
    const why = [
      'Check by substituting: 5 × 25 = 125, not 30. So 25 is not a solution.',
      'Kai took 5 off both sides, so line 2 still balances. The mistake is the last line: ' + mx('5x − 5') + ' is not ' + mx('x') + '.',
      '',
      mx('5x + 5 = 35') + ' still has 5 lots of ' + mx('x') + '. Adding doesn’t undo multiplying either.'
    ];
    return {
      check() { const s = ch.sel()[0]; if (s === 2) return true; ch.mark(s, 'bad'); return why[s]; },
      win: () => mx('5x ÷ 5 = 30 ÷ 5') + ', so ' + mx('x = 6') + '. Check: 5 × 6 = 30. When the letter is multiplied, divide both sides. Don’t subtract.',
      won() { ch.mark(2, 'good'); ch.lock(); },
      solve() { ch.set([2]); }
    };
  }
},

/* 11 */ {
  prompt: 'Solve ' + mx('x − 6 = 9') + '. What can you do to both sides to leave ' + mx('x') + ' on its own?',
  sub: 'Choose an operation and type a number.',
  build(stage, ctl, ctx) {
    const st = makeStep(stage, ctl, 'x − 6', '9', ctx);
    return {
      check() {
        const o = st.op(), n = st.k();
        if (o === '+' && n === 6) return true;
        if (o === '−') return 'Taking away another ' + n + ' moves further from ' + mx('x') + '. The left side is ' + mx('x') + ' with 6 taken away. What puts the 6 back?';
        if (o === '×' || o === '÷') return mx('x − 6') + ' is ' + mx('x') + ' with 6 taken away. Nothing was multiplied or divided, so use the opposite of taking away.';
        return 'Adding is the right move, but adding ' + n + ' leaves ' + (n < 6 ? mx('x − ' + (6 - n)) : mx('x + ' + (n - 6))) + ', not ' + mx('x') + ' on its own. Add back exactly what was taken away.';
      },
      win: () => mx('x − 6 + 6 = 9 + 6') + ', so ' + mx('x = 15') + '. Check: 15 − 6 = 9.',
      won() { st.finish('x', '15'); st.lock(); },
      solve() { st.set('+', 6); }
    };
  }
},

/* 12 */ {
  prompt: '4 movie tickets cost $48 altogether. Each ticket costs ' + mx('t') + ' dollars, so ' + mx('4t = 48') + '. What does one ticket cost?',
  build(stage, ctl, ctx) {
    stage.append(h('<div class="tiles" role="img" aria-label="4 tickets of t dollars each equal 48 dollars">' + '<span class="tile var still">t</span>'.repeat(4) + '<span class="eqs">=</span><span class="tile num still">48</span></div>'),
      h('<div class="live"><small>4 tickets at ' + mx('t') + ' dollars each = $48</small></div>'));
    const ans = makeAnswer(ctl, 'One ticket costs $', ctx);
    return {
      check() {
        const v = ans.value();
        if (v === 12) return true;
        ans.mark('bad');
        if (isNaN(v)) return 'Type a whole number of dollars, using digits only.';
        if (v === 44) return '$44 is 48 − 4. Check: 4 × 44 = 176, not 48. The 4 counts tickets, so share the $48 between them.';
        if (v === 52) return '$52 is 48 + 4. One ticket costs less than all four together.';
        if (v === 192) return '$192 is 48 × 4. One ticket costs less than all four together.';
        if (v === 48) return '$48 pays for all 4 tickets. What does one cost?';
        return 'Check by substituting: 4 × ' + v + ' = ' + 4 * v + ', not 48. Share the $48 equally between the 4 tickets.';
      },
      win: () => mx('4t ÷ 4 = 48 ÷ 4') + ', so ' + mx('t = 12') + '. One ticket costs $12. Check: 4 × 12 = 48.',
      won() { ans.mark('good'); ans.lock(); },
      solve() { ans.set(12); }
    };
  }
},

/* 13 */ {
  prompt: 'Three students solve ' + mx('4x = 20') + ' in different ways. Who is right?',
  sub: 'Choose Agree or Disagree for each one.',
  build(stage, ctl, ctx) {
    stage.hidden = true;
    const claims = [
      { who: 'Lena', say: '“Take 4 off both sides: ' + mx('4x − 4 = 20 − 4') + ', so ' + mx('x = 16') + '.”', agree: false, hint: 'Lena: substitute her answer into ' + mx('4x = 20') + '. Is it true?', why: 'Check: 4 × 16 = 64, not 20. Both sides were treated the same, but ' + mx('4x') + ' means 4 × ' + mx('x') + ', and subtracting doesn’t undo multiplying.' },
      { who: 'Omar', say: '“Divide both sides by 4: ' + mx('4x ÷ 4 = 20 ÷ 4') + ', so ' + mx('x = 5') + '.”', agree: true, hint: 'Omar: what undoes multiplying by 4?', why: 'The same move on both sides, and dividing by 4 undoes multiplying by 4. Check: 4 × 5 = 20.' },
      { who: 'Tess', say: '“I tried numbers until one worked. 4 × 5 = 20, so ' + mx('x = 5') + '.”', agree: true, hint: 'Tess: does her answer make ' + mx('4x = 20') + ' true?', why: 'Substituting shows 5 makes the equation true, so 5 is the solution. Dividing gets there faster when the numbers are big.' }
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
    const explain = (i, cls) => { rows[i].row.classList.add(cls); if (!$('.why', rows[i].row)) rows[i].row.append(h('<p class="why">' + claims[i].why + '</p>')); };
    ctl.append(list);
    return {
      check() {
        const wrong = claims.map((c, i) => pick[i] !== c.agree ? i : -1).filter(i => i >= 0);
        if (!wrong.length) return true;
        return (wrong.length === 1 ? '1 choice needs another look. ' : wrong.length + ' choices need another look. ') + wrong.map(i => claims[i].hint).join(' ');
      },
      win: () => 'Omar and Tess are right, and substituting proves it: 4 × 5 = 20. Lena kept the balance but subtracted. To undo × 4, divide both sides by 4.',
      won() { locked = true; claims.forEach((c, i) => { rows[i].row.classList.remove('bad'); explain(i, 'good'); rows[i].btns.forEach(b => { b.disabled = true; }); }); },
      solve() { claims.forEach((c, i) => { pick[i] = c.agree; paint(i); }); }
    };
  }
}
];

const SECTIONS = [[0, 'Balance'], [3, 'Check it'], [5, 'Undo it'], [7, 'Write it'], [12, 'Wrap-up']];

// Finish screen: sets the prompt, sub-line and recap for this lesson.
function drawFinish() {
  promptEl.textContent = 'An equation is a balance.';
  subEl.hidden = false; subEl.textContent = 'Four things to remember:';
  ctl.replaceChildren(); stage.hidden = false;
  const mini = o => '<svg viewBox="-5 -10 76 83" aria-hidden="true">' + bagG(0, 0, o) + '</svg>';
  stage.replaceChildren(h('<ul class="recap">' +
    '<li><span class="art">' + mini({ tag: 'b', body: '?' }) + '</span><span>Whatever you do to one side, do to the other. Change one side only and the scale tips.</span></li>' +
    '<li><span class="art"><span class="tile op still">×</span><span class="tile op still">÷</span></span><span>Undo what was done to the letter. Subtract to undo adding, divide to undo multiplying: ' + mx('3b = 12') + ' gives ' + mx('b = 4') + ', not 9.</span></li>' +
    '<li><span class="art">' + mini({ tag: 'b', inside: 7 }) + '</span><span>The solution is the number that makes the equation true. Check it by substituting: 7 + 4 = 11.</span></li>' +
    '<li><span class="art"><span class="tile var still">b</span><span class="tile op still">=</span><span class="tile num still">7</span></span><span>Write each move as a line of working: ' + mx('b + 4 − 4 = 11 − 4') + ', so ' + mx('b = 7') + '.</span></li></ul>'));
}
