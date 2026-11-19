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

/* ---------- flowcharts ---------- */
// Steps are strings such as '× 2'. undo('× 2') is '÷ 2'.
const OPS = { '+': (v, k) => v + k, '−': (v, k) => v - k, '×': (v, k) => v * k, '÷': (v, k) => v / k };
const UNDO = { '+': '−', '−': '+', '×': '÷', '÷': '×' };
const runStep = (v, s) => OPS[s[0]](v, +s.slice(2));
const runAll = (v, steps) => steps.reduce(runStep, v);
const undo = s => UNDO[s[0]] + s.slice(1);
const fmt = v => { const r = Math.round(v * 100) / 100; return (Math.abs(v - r) < 1e-9 ? String(r) : r + '…').replace('-', '−'); };
// "3x + 7" -> maths markup. Every lower-case letter becomes a variable.
const ex = s => '<span class="m">' + String(s).replace(/[a-z]/g, c => '<i class="v">' + c + '</i>') + '</span>';
const nt = v => '<span class="tile num still">' + fmt(v) + '</span>';
const XT = '<span class="tile var still">x</span>', QT = '<span class="tile var still">?</span>';
const caps = (n, a, b) => [a].concat(Array(n - 1).fill(''), [b]);
// "3 × 2 = 6, then 6 + 5 = 11"
function trace(v, steps) {
  return steps.map(s => { const w = runStep(v, s), t = fmt(v) + ' ' + s + ' = ' + fmt(w); v = w; return t; }).join(', then ');
}

// A flowchart: value boxes joined by step boxes, left to right. o.vals: html for each value box (one more than the steps).
// o.steps: step text, or null for an empty box a step can be dropped into. o.caps: caption over each value box. o.after: html after the last box.
function makeFlow(host, o) {
  const node = h('<div class="flow"></div>'), vals = [], steps = [];
  o.vals.forEach((_, i) => {
    if (i) {
      const s = o.steps[i - 1];
      const st = h(s == null ? '<div class="f-step slot" data-drop="s' + (i - 1) + '"></div>' : '<div class="f-step">' + ex(s) + '</div>');
      steps.push(st);
      node.append(h('<span class="f-arr"></span>'), st, h('<span class="f-arr"></span>'));
    }
    const c = o.caps && o.caps[i];
    const vb = h('<div class="f-val">' + (c ? '<span class="cap">' + c + '</span>' : '') + '<span class="f-v"></span></div>');
    vals.push(vb);
    node.append(vb);
  });
  if (o.after) node.append(h('<span class="f-after">' + o.after + '</span>'));
  host.append(node);
  const val = (i, html, cls) => { $('.f-v', vals[i]).innerHTML = html || ''; vals[i].classList.remove('bad', 'good'); if (cls) vals[i].classList.add(cls); };
  o.vals.forEach((v, i) => val(i, v));
  return { node, vals, steps, val };
}

// Step tiles that go into a flowchart's empty step boxes: drag onto a box, or tap to fill the next empty one.
// Each tile can be used once. Tap a placed step to send it back. onChange(order) runs after every change.
function makeOrder(flow, trayHost, chips, ctx, onChange) {
  const put = flow.steps.map(() => null);
  let locked = false;
  const tray = h('<div class="tiles"></div>');
  const order = () => put.map(i => i == null ? null : chips[i]);
  const btns = chips.map((c, i) => {
    const b = h('<button type="button" class="tile op" aria-label="Step ' + c + '">' + ex(c) + '</button>');
    b.onclick = () => { const k = put.indexOf(null); if (k >= 0) place(i, k); };
    draggable(b, { accept: put.map((_, k) => 's' + k), onDrop: t => place(i, +t.getAttribute('data-drop').slice(1)) });
    tray.append(b);
    return b;
  });
  function place(i, k) { if (locked) return; put[k] = i; draw(); ctx.touch(put.every(p => p != null)); }
  function draw() {
    flow.steps.forEach((st, k) => {
      st.replaceChildren();
      if (put[k] == null) return;
      const b = h('<button type="button" class="tile op" aria-label="Step ' + chips[put[k]] + ', tap to take it out">' + ex(chips[put[k]]) + '</button>');
      b.onclick = () => { if (locked) return; put[k] = null; draw(); ctx.touch(false); };
      st.append(b);
    });
    btns.forEach((b, i) => { b.disabled = locked || put.includes(i); });
    onChange(order());
  }
  draw();
  trayHost.append(tray);
  return { order, set(a) { a.forEach((s, k) => { put[k] = chips.indexOf(s); }); draw(); }, lock() { locked = true; draw(); } };
}

// Feedback for a reverse machine that isn't right. fwd: the machine's steps. out: what came out. ord: the student's steps.
function reverseWhy(fwd, out, ord) {
  const ans = fwd.map(undo).reverse();
  const bad = ord.find(s => !ans.includes(s));
  if (bad) return fwd.includes(bad)
    ? ex(bad) + ' repeats a step of the machine instead of undoing it. To undo ' + ex(bad) + ', use ' + ex(undo(bad)) + '.'
    : ex(bad) + ' would undo ' + ex(undo(bad)) + ', but the machine has no ' + ex(undo(bad)) + ' step.';
  const r = runAll(out, ord);
  const back = Number.isInteger(r) && r >= 0 ? ' Yours gives ' + r + '. Run ' + r + ' forwards: ' + trace(r, fwd) + ', not ' + out + '.' : ' Your steps don’t even give a whole number.';
  if (ord.join('|') === fwd.map(undo).join('|'))
    return 'You undid the steps in the same order as the machine. ' + ex(fwd[fwd.length - 1]) + ' happened last, so undo it first.' + back;
  const k = ord.findIndex((s, i) => s !== ans[i]);
  return 'Undo the last step first. Step ' + (k + 1) + ' of your reverse machine should undo ' + ex(fwd[fwd.length - 1 - k]) + '.' + back;
}

/* ---------- still pictures for Why? panels and bridges ---------- */
// A still machine, drawn as an SVG so it scales down on a phone. o.steps: the machine's steps. o.vals: what is in each
// box ('' empty, '?' unknown). o.back: add a second row with the same numbers and, under each step, the step that
// undoes it (arrows point left). o.from: first box of that second row (default 0). o.caps: caption over each top box.
// o.mark / o.mark2: { box: 'good' | 'bad' } for the top / second row. o.notes: { box: text } under a top-row box.
const SX = s => '<tspan class="sf-x">' + s + '</tspan>';
function stillFlow(o) {
  const n = o.steps.length, BW = 54, BH = 44, SW = 60, SH = 36, AW = n >= 3 ? 18 : 22, U = BW + SW + 2 * AW;
  const W = BW + n * U + 2, top = o.caps ? 20 : 2, mark = o.mark || {}, mark2 = o.mark2 || {}, notes = o.notes || {};
  const noted = Object.keys(notes).length > 0, y2 = top + BH + (noted ? 36 : 22), from = o.from || 0;
  const H = (o.back ? y2 + BH : top + BH + (noted ? 20 : 0)) + 4;
  const box = (i, y, v, m) => {
    const x = 1 + i * U, q = v === '?';
    let g = '<rect class="sf-box' + (m ? ' ' + m : '') + '" x="' + x + '" y="' + y + '" width="' + BW + '" height="' + BH + '" rx="12"/>';
    if (v !== '' && v != null) g += '<rect class="' + (q ? 'sf-qd' : 'sf-td') + '" x="' + (x + 6) + '" y="' + (y + 9) + '" width="' + (BW - 12) + '" height="' + (BH - 15) + '" rx="8"/>' +
      '<rect class="' + (q ? 'sf-q' : 'sf-t') + '" x="' + (x + 6) + '" y="' + (y + 6) + '" width="' + (BW - 12) + '" height="' + (BH - 15) + '" rx="8"/>' +
      '<text class="sf-n' + (q ? ' q' : '') + (String(v).length > 2 ? ' sm' : '') + '" x="' + (x + BW / 2) + '" y="' + (y + 27) + '">' + v + '</text>';
    return g;
  };
  const arrow = (x1, x2, y, left) => left
    ? '<path class="sf-a" d="M' + x2 + ' ' + y + 'H' + (x1 + 6) + '"/><path class="sf-ah" d="M' + x1 + ' ' + y + 'l8 -6v12z"/>'
    : '<path class="sf-a" d="M' + x1 + ' ' + y + 'H' + (x2 - 6) + '"/><path class="sf-ah" d="M' + x2 + ' ' + y + 'l-8 -6v12z"/>';
  const step = (i, y, t, back) => {
    const x = 1 + i * U + BW + AW, cy = y + BH / 2;
    return arrow(x - AW + 3, x - 3, cy, back) + arrow(x + SW + 3, x + SW + AW - 3, cy, back) +
      '<rect class="' + (back ? 'sf-u' : 'sf-s') + '" x="' + x + '" y="' + (cy - SH / 2) + '" width="' + SW + '" height="' + SH + '" rx="11"/>' +
      '<text class="' + (back ? 'sf-ut' : 'sf-st') + '" x="' + (x + SW / 2) + '" y="' + (cy + 6.5) + '">' + t + '</text>';
  };
  let g = '';
  o.vals.forEach((v, i) => {
    if (o.caps && o.caps[i]) g += '<text class="sf-c" x="' + (1 + i * U + BW / 2) + '" y="13">' + o.caps[i] + '</text>';
    g += box(i, top, v, mark[i]);
    if (notes[i]) g += '<text class="sf-c" x="' + (1 + i * U + BW / 2) + '" y="' + (top + BH + 15) + '">' + notes[i] + '</text>';
    if (i < n) g += step(i, top, o.steps[i], false);
    if (o.back && i >= from) { g += box(i, y2, v, mark2[i]); if (i < n) g += step(i, y2, undo(o.steps[i]), true); }
  });
  return '<svg class="sf" viewBox="0 0 ' + W + ' ' + H + '" style="max-width:' + (W * (o.scale || 1) / 16).toFixed(2) + 'rem" role="img" aria-label="' + o.label + '">' + g + '</svg>';
}
// A machine run forwards from v, and (back) undone underneath. Describes itself for screen readers.
function stillRun(v, steps, o) {
  o = o || {};
  const vals = [v]; steps.forEach(s => vals.push(runStep(vals[vals.length - 1], s)));
  const shown = vals.map((x, i) => (o.show && o.show[i] != null) ? o.show[i] : String(x));
  const label = 'Forwards: ' + trace(v, steps) + '.' + (o.back ? ' Backwards: ' + trace(vals[vals.length - 1], steps.slice(o.from || 0).map(undo).reverse()) + '.' : '');
  return stillFlow(Object.assign({ steps, vals: shown, label }, o));
}
const whyBox = (fig, lines) => '<div class="wy-fig">' + fig + '</div>' + lines.map(l => '<p class="wy-ln">' + l + '</p>').join('');

/* ---------- cards ---------- */
// The machine on top, and an empty reverse machine under it that the student fills with steps (cards 5, 7, 9 and 15).
function reverseCard(cfg) {
  return function (stage, ctl, ctx) {
    const n = cfg.fwd.length, ans = cfg.fwd.map(undo).reverse();
    stage.append(h('<p class="f-lab">The machine</p>'));
    const fwdFlow = makeFlow(stage, { vals: cfg.fvals || [QT].concat(Array(n - 1).fill(''), [nt(cfg.out)]), steps: cfg.fwd, caps: caps(n, 'in', 'out') });
    stage.append(h('<p class="f-lab">Your reverse machine</p>'));
    const rev = makeFlow(stage, { vals: [nt(cfg.out)].concat(Array(n).fill('')), steps: ans.map(() => null), caps: caps(n, 'start', cfg.capEnd || 'went in') });
    const od = makeOrder(rev, ctl, cfg.chips, ctx, ord => {
      // Stop at the first value that isn't a whole number: it is shown in red and the boxes after it stay empty.
      let v = cfg.out, ok = true;
      ord.forEach((s, k) => {
        if (ok && s) { v = runStep(v, s); ok = Number.isInteger(v) && v >= 0; rev.val(k + 1, nt(v), ok ? '' : 'bad'); }
        else { ok = false; rev.val(k + 1, ''); }
      });
    });
    return {
      check() { const ord = od.order(); return ord.join('|') === ans.join('|') ? true : reverseWhy(cfg.fwd, cfg.out, ord); },
      win: cfg.win,
      won() { od.lock(); rev.val(n, nt(runAll(cfg.out, ans)), 'good'); },
      solve() { od.set(ans); },
      recap: cfg.recap, fwdFlow, rev
    };
  };
}
// A student's working, shown in a box with their initial.
const said = (who, say) => h('<div class="claim"><span class="av" aria-hidden="true">' + who[0] + '</span><p><span class="who">' + who + ':</span> ' + say + '</p></div>');

const cards = [

/* 1 */ {
  prompt: 'A number went into this machine and 17 came out. What number went in?',
  sub: 'You often know a final total, like a taxi fare, and need the number that went in. Drag numbers into the machine, or tap them, to test them.',
  why: () => whyBox(stillRun(6, ['× 2', '+ 5'], { caps: ['in', '', 'out'], mark: { 2: 'good' } }), [
    '6 × 2 = 12, then 12 + 5 = 17.',
    'A bigger input gives a bigger output: 5 gives 15 and 7 gives 19. So 6 is the only input that gives 17.'
  ]),
  build(stage, ctl, ctx) {
    const STEPS = ['× 2', '+ 5'];
    const fl = makeFlow(stage, { vals: ['', '', ''], steps: STEPS, caps: ['in', '', 'out'] });
    fl.vals[0].setAttribute('data-drop', 'hopper');
    const log = h('<div class="m-log" aria-live="polite"></div>');
    stage.append(log);
    let busy = false;
    function feed(n) {
      if (busy) return;
      busy = true;
      fl.val(0, numTile(n)); fl.val(1, ''); fl.val(2, '');
      setTimeout(() => fl.val(1, numTile(runStep(n, STEPS[0]))), 350);
      setTimeout(() => {
        const out = runAll(n, STEPS);
        fl.val(2, numTile(out));
        log.append(h('<span class="pair pop">' + n + ' → ' + out + '</span>'));
        while (log.children.length > 6) log.firstElementChild.remove();
        busy = false;
      }, 700);
    }
    const tray = h('<div class="tiles"></div>');
    for (let n = 1; n <= 9; n++) {
      const b = h('<button type="button" class="tile num" aria-label="Feed in ' + n + '">' + n + '</button>');
      b.onclick = () => feed(n);
      draggable(b, { accept: ['hopper'], onDrop: () => feed(n) });
      tray.append(b);
    }
    ctl.append(tray);
    const ans = makeAnswer(ctl, 'The number that went in', ctx);
    return {
      check() {
        const v = ans.value();
        if (v === 6) return true;
        ans.mark('bad');
        if (isNaN(v)) return 'Type a whole number, using digits only.';
        if (v === 12) return '12 is the middle number: 12 + 5 = 17. But 12 is what came out of the ' + ex('× 2') + ' step, not what went in.';
        return 'Feed ' + v + ' in: ' + trace(v, STEPS) + '. That isn’t 17, so try a ' + (runAll(v, STEPS) < 17 ? 'bigger' : 'smaller') + ' number.';
      },
      win: () => '6 goes in: 6 × 2 = 12, then 12 + 5 = 17. Guessing worked, but it would be slow if 517 came out. The next cards find the input without guessing.',
      won() { ans.mark('good'); ans.lock(); },
      solve() { ans.set(6); }
    };
  }
},

/* 2 */ {
  why: () => whyBox(stillRun(6, ['× 2', '+ 5'], { show: { 0: '?' }, back: true, from: 1, mark2: { 1: 'good' } }), [
    'Forwards, the ' + ex('+ 5') + ' step did 12 + 5 = 17.',
    'Backwards, 17 − 5 = 12. Subtracting 5 is the inverse operation of adding 5.'
  ]),
  prompt: 'Work backwards from 17. What number was there just before the ' + ex('+ 5') + ' step?',
  build(stage, ctl, ctx) {
    const fl = makeFlow(stage, { vals: ['', QT, nt(17)], steps: ['× 2', '+ 5'], caps: ['in', '', 'out'] });
    const ans = makeAnswer(ctl, 'Just before ' + ex('+ 5'), ctx);
    return {
      check(attempt) {
        const v = ans.value();
        if (v === 12) return true;
        ans.mark('bad');
        if (isNaN(v)) return 'Type a whole number, using digits only.';
        if (v === 22) return '22 + 5 = 27, not 17. Adding 5 again goes the wrong way. To get back to the number before ' + ex('+ 5') + ', do the opposite.';
        if (v === 6) return '6 is the number that went in. This card asks for the middle number: the one that ' + ex('+ 5') + ' turned into 17.';
        return v + ' + 5 = ' + (v + 5) + ', not 17.' + (attempt >= 2 ? ' Which number plus 5 makes 17?' : '');
      },
      win: () => '12, because 12 + 5 = 17. Taking away 5 undoes adding 5: 17 − 5 = 12. Adding and subtracting are inverse operations.',
      won() { ans.mark('good'); ans.lock(); fl.val(1, nt(12)); },
      solve() { ans.set(12); }
    };
  }
},

/* 3 */ {
  why: () => whyBox(stillRun(6, ['× 2', '+ 5'], { back: true, mark2: { 0: 'good' } }), [
    '12 came out of the ' + ex('× 2') + ' step, so 12 is double the input. Half of 12 is 6: 12 ÷ 2 = 6.',
    'Check forwards: 6 × 2 = 12, then 12 + 5 = 17.'
  ]),
  prompt: 'Now undo the ' + ex('× 2') + ' step. What number went in?',
  build(stage, ctl, ctx) {
    const fl = makeFlow(stage, { vals: [QT, nt(12), nt(17)], steps: ['× 2', '+ 5'], caps: ['in', '', 'out'] });
    const ans = makeAnswer(ctl, 'The number that went in', ctx);
    return {
      check() {
        const v = ans.value();
        if (v === 6) return true;
        ans.mark('bad');
        if (isNaN(v)) return 'Type a whole number, using digits only.';
        if (v === 24) return '24 × 2 = 48, not 12. Multiplying again goes the wrong way. What undoes doubling?';
        if (v === 10) return '10 is 12 − 2. Taking away 2 undoes ' + ex('+ 2') + ', not ' + ex('× 2') + '. Check: 10 × 2 = 20, not 12.';
        return v + ' × 2 = ' + (2 * v) + ', not 12. Which number doubles to make 12?';
      },
      win: () => '6, because 12 ÷ 2 = 6. Dividing by 2 undoes multiplying by 2. You undid ' + ex('+ 5') + ', then ' + ex('× 2') + ': the last step first.',
      won() { ans.mark('good'); ans.lock(); fl.val(0, nt(6)); },
      solve() { ans.set(6); }
    };
  }
},

/* 4 */ {
  bridge: true,
  prompt: 'You undid ' + ex('+ 5') + ', then ' + ex('× 2') + ': the last step first. Working backwards through a machine like this is called <b>backtracking</b>.',
  sub: 'Each step is undone by its inverse operation.',
  show(stage) { stage.append(h('<div class="sf-wrap">' + stillRun(6, ['× 2', '+ 5'], { back: true, scale: 1.25 }) + '</div>')); }
},

/* 5 */ {
  prompt: 'Build a reverse machine that turns 17 back into the number that went in.',
  sub: 'Drag or tap steps into the boxes. Tap a placed step to remove it.',
  why: () => whyBox(stillRun(6, ['× 2', '+ 5'], { back: true, mark2: { 0: 'good' } }), [
    '17 is double the input, plus 5. The 5 went on last, so it comes off first: 17 − 5 = 12.',
    'Now 12 is double the input, so 12 ÷ 2 = 6. Each undo step sits under the step it undoes.'
  ]),
  build: reverseCard({
    fwd: ['× 2', '+ 5'], out: 17, chips: ['+ 5', '÷ 2', '− 5', '× 2'],
    win: () => '17 − 5 = 12, then 12 ÷ 2 = 6. The machine added 5 last, so the reverse machine takes 5 away first.',
    recap: () => 'Your reverse machine: ' + ex('− 5') + ', then ' + ex('÷ 2') + '. It turned 17 back into 6.'
  }),
  then: {
    prompt: 'The same machine now gives 29. Use your reverse machine: what number went in?',
    why: () => whyBox(stillRun(12, ['× 2', '+ 5'], { back: true, mark2: { 0: 'good' } }), [
      'Backwards: 29 − 5 = 24, then 24 ÷ 2 = 12.',
      'Check forwards: 12 × 2 = 24, then 24 + 5 = 29. The undo steps stay the same for any output. Only the numbers change.'
    ]),
    build(stage, ctl, ctx, p1) {
      const FWD = ['× 2', '+ 5'];
      p1.fwdFlow.val(2, nt(29));
      p1.rev.val(0, nt(29)); p1.rev.val(1, ''); p1.rev.val(2, '');
      const ans = makeAnswer(ctl, 'The number that went in', ctx);
      return {
        check() {
          const v = ans.value();
          if (v === 12) return true;
          ans.mark('bad');
          if (isNaN(v)) return 'Type a whole number, using digits only.';
          if (v === 24) return '24 is 29 − 5. That undoes ' + ex('+ 5') + ', but ' + ex('× 2') + ' still needs undoing. Use the ' + ex('÷ 2') + ' step as well.';
          if (v === 6) return '6 went in when 17 came out. This time 29 came out, so start your reverse machine at 29.';
          if (v === 34) return '34 is 29 + 5. Your reverse machine takes 5 away first.';
          if (v === 48) return '48 is 24 × 2. Your reverse machine divides by 2 to undo ' + ex('× 2') + '.';
          if (v === 63) return '63 is 29 run forwards: 29 × 2 = 58, then 58 + 5 = 63. 29 is what came out, so run it through your reverse machine.';
          return 'Check it: ' + trace(v, FWD) + ', not 29. Start at 29 and follow your reverse machine: ' + ex('− 5') + ', then ' + ex('÷ 2') + '.';
        },
        win: () => 'Same reverse machine, new number: 29 − 5 = 24, then 24 ÷ 2 = 12. No guessing needed.',
        won() { ans.mark('good'); ans.lock(); p1.rev.val(1, nt(24)); p1.rev.val(2, nt(12), 'good'); },
        solve() { ans.set(12); }
      };
    }
  }
},

/* 6 */ {
  why: () => whyBox(stillRun(4, ['× 2', '+ 6'], { caps: ['in', '', 'out'], mark: { 2: 'bad' }, notes: { 2: 'not 20' } }), [
    '4 × 2 = 8, then 8 + 6 = 14. The machine gave 20, so 4 did not go in.',
    '20 is double the input, plus 6. Kai halved 20 while the extra 6 was still on it.'
  ]),
  prompt: 'Kai backtracked this machine. Check Kai’s answer: what comes out when 4 goes in?',
  build(stage, ctl, ctx) {
    const fl = makeFlow(stage, { vals: [QT, '', nt(20)], steps: ['× 2', '+ 6'], caps: ['in', '', 'out'] });
    ctl.append(said('Kai', '“I undid the steps in the same order as the machine: 20 ÷ 2 = 10, then 10 − 6 = 4. So 4 went in.”'));
    const ans = makeAnswer(ctl, 'When 4 goes in, out comes', ctx);
    return {
      check() {
        const v = ans.value();
        if (v === 14) return true;
        ans.mark('bad');
        if (isNaN(v)) return 'Type a whole number, using digits only.';
        if (v === 20) return 'Don’t take Kai’s word for it. Put 4 through the ' + ex('× 2') + ' step first, then the ' + ex('+ 6') + ' step.';
        if (v === 8) return '8 is what comes out of the ' + ex('× 2') + ' step. The machine still has to ' + ex('+ 6') + '.';
        if (v === 10) return '10 is 4 + 6. The machine doubles first, then adds 6. Start with 4 × 2.';
        return 'Start with 4 × 2, then add 6 to the result.';
      },
      win: () => '4 × 2 = 8, then 8 + 6 = 14, not 20. So Kai is wrong. Kai undid ' + ex('× 2') + ' first, but ' + ex('× 2') + ' happened first, so it should be undone last.',
      won() { ans.mark('good'); ans.lock(); fl.val(0, nt(4)); fl.val(1, nt(8)); fl.val(2, nt(14), 'bad'); },
      solve() { ans.set(14); }
    };
  }
},

/* 7 */ {
  why: () => whyBox(stillRun(7, ['× 2', '+ 6'], { back: true, mark2: { 0: 'good' } }), [
    '20 is double the input, plus 6. Take the 6 off first: 20 − 6 = 14.',
    'Now 14 is double the input: 14 ÷ 2 = 7. Kai’s order gave 4, and 4 runs forwards to 14, not 20.'
  ]),
  prompt: 'Fix Kai’s reverse machine so it turns 20 back into the right input.',
  sub: 'Kai used ' + ex('÷ 2') + ', then ' + ex('− 6') + '. Drag or tap the steps into the boxes.',
  build: reverseCard({
    fwd: ['× 2', '+ 6'], out: 20, chips: ['÷ 2', '− 6'],
    win: () => '20 − 6 = 14, then 14 ÷ 2 = 7. Check it forwards: 7 × 2 = 14, then 14 + 6 = 20. Same steps as Kai, but in reverse order.'
  })
},

/* 8 */ {
  why: () => whyBox(stillRun(2, ['× 3', '+ 7'], { caps: [SX('x') + ' = 2', '', ''] }), [
    'Try any number for ' + ex('x') + ', say ' + ex('x = 2') + '. The machine gives 2 × 3 = 6, then 6 + 7 = 13.',
    ex('3x + 7') + ' with ' + ex('x = 2') + ' is 3 × 2 + 7 = 13 as well. The machine does the same thing as the expression.'
  ]),
  prompt: 'In ' + ex('3x + 7 = 19') + ', a number ' + ex('x') + ' goes into a machine and 19 comes out. Build the machine.',
  sub: ex('3x') + ' means 3 × ' + ex('x') + '. Drag or tap two steps into the boxes, in order.',
  build(stage, ctl, ctx) {
    const fl = makeFlow(stage, { vals: [XT, '', ''], steps: [null, null], caps: ['in', '', 'out'], after: ex('= 19') });
    // The expression after each step: 'x' then '3x' then '3x + 7'.
    const sym = (e, s) => {
      const k = s.slice(2);
      if (s[0] === '+') return e + ' + ' + k;
      return e.includes('+') ? '(' + e + ') × ' + k : e === 'x' ? k + 'x' : (+e.slice(0, -1) * k) + 'x';
    };
    const od = makeOrder(fl, ctl, ['+ 7', '× 7', '× 3', '+ 3'], ctx, ord => {
      let e = 'x', ok = true;
      ord.forEach((s, k) => {
        if (ok && s) { e = sym(e, s); fl.val(k + 1, ex(e)); }
        else { ok = false; fl.val(k + 1, ''); }
      });
    });
    return {
      check() {
        const ord = od.order();
        if (ord.join('|') === '× 3|+ 7') return true;
        if (ord.includes('+ 3')) return ex('+ 3') + ' isn’t in ' + ex('3x + 7') + '. The 3 in ' + ex('3x') + ' multiplies: ' + ex('3x') + ' means 3 × ' + ex('x') + '.';
        if (ord.includes('× 7')) return 'The 7 in ' + ex('3x + 7') + ' is added, not multiplied. Use ' + ex('+ 7') + '.';
        return 'Your machine adds 7 first, then multiplies by 3. Test it with ' + ex('x = 2') + ': (2 + 7) × 3 = 27, but 3 × 2 + 7 = 13. In ' + ex('3x + 7') + ', multiplying comes first.';
      },
      win: () => 'First ' + ex('× 3') + ' turns ' + ex('x') + ' into ' + ex('3x') + ', then ' + ex('+ 7') + ' gives ' + ex('3x + 7') + '. Multiplication comes before addition, so ' + ex('× 3') + ' is the first step.',
      won() { od.lock(); },
      solve() { od.set(['× 3', '+ 7']); }
    };
  }
},

/* 9 */ {
  why: () => whyBox(stillRun(4, ['× 3', '+ 7'], { caps: [SX('x') + ' = 4', '', ''], back: true, mark2: { 0: 'good' } }), [
    '19 is 3 lots of ' + ex('x') + ', plus 7. Take the 7 off: 19 − 7 = 12, so 3 lots of ' + ex('x') + ' make 12.',
    '12 ÷ 3 = 4, so ' + ex('x = 4') + '.'
  ]),
  prompt: 'Now backtrack. Build the reverse machine that turns 19 back into ' + ex('x') + '.',
  sub: 'Drag or tap steps into the boxes.',
  build: reverseCard({
    fwd: ['× 3', '+ 7'], out: 19, chips: ['÷ 7', '− 7', '− 3', '÷ 3'], fvals: [XT, ex('3x'), nt(19)], capEnd: ex('x'),
    win: () => '19 − 7 = 12, then 12 ÷ 3 = 4. So ' + ex('x = 4') + ' solves ' + ex('3x + 7 = 19') + '.'
  })
},

/* 10 */ {
  why: () => whyBox(stillRun(4, ['× 3', '+ 7'], { caps: [SX('x') + ' = 4', '', ''], mark: { 2: 'good' } }), [
    'The machine works out ' + ex('3x + 7') + ' with 4 in place of ' + ex('x') + ': 3 × 4 + 7 = 12 + 7 = 19.',
    'The equation says ' + ex('3x + 7') + ' is 19, and with ' + ex('x = 4') + ' it is.'
  ]),
  prompt: 'Check ' + ex('x = 4') + ' by running it forwards. What comes out?',
  build(stage, ctl, ctx) {
    const fl = makeFlow(stage, { vals: [nt(4), '', ''], steps: ['× 3', '+ 7'], caps: ['in', '', 'out'] });
    const ans = makeAnswer(ctl, 'Out comes', ctx);
    return {
      check() {
        const v = ans.value();
        if (v === 19) return true;
        ans.mark('bad');
        if (isNaN(v)) return 'Type a whole number, using digits only.';
        if (v === 33) return '33 is (4 + 7) × 3. The machine multiplies by 3 first: start with 4 × 3.';
        if (v === 12) return '12 is what comes out of the ' + ex('× 3') + ' step. Now do ' + ex('+ 7') + '.';
        if (v === 28) return 'The first step is ' + ex('× 3') + ', not × 7. The 7 is added at the end.';
        return 'Start with 4 × 3, then add 7 to the result.';
      },
      win: () => '4 × 3 = 12, then 12 + 7 = 19. It matches, so ' + ex('x = 4') + ' is right. Running your answer forwards is how you check backtracking.',
      won() { ans.mark('good'); ans.lock(); fl.val(1, nt(12)); fl.val(2, nt(19), 'good'); },
      solve() { ans.set(19); }
    };
  }
},

/* 11 */ {
  bridge: true,
  prompt: 'Running 4 forwards put it in place of ' + ex('x') + '. That is <b>substitution</b>, and it shows that ' + ex('x = 4') + ' is the <b>solution</b> of ' + ex('3x + 7 = 19') + '.',
  sub: 'Backtrack to find a solution. Substitute to check it.',
  show(stage) { stage.append(h('<div class="sf-wrap">' + stillRun(4, ['× 3', '+ 7'], { caps: [SX('x') + ' = 4', '', ''], mark: { 2: 'good' }, scale: 1.25 }) + '</div>')); }
},

/* 12 */ {
  why: () => whyBox(stillRun(9, ['× 3', '+ 7'], { caps: [SX('x') + ' = 9', '', ''], mark: { 2: 'bad' }, notes: { 2: 'not 25' } }), [
    'Put 9 in place of ' + ex('x') + ': 3 × 9 + 7 = 27 + 7 = 34.',
    'The equation needs 25, and 34 is too big. So the solution must be smaller than 9.'
  ]),
  prompt: 'Lena solved ' + ex('3x + 7 = 25') + ' and got ' + ex('x = 9') + '. Run 9 forwards. Is Lena right?',
  build(stage, ctl, ctx) {
    const fl = makeFlow(stage, { vals: [nt(9), '', ''], steps: ['× 3', '+ 7'], caps: ['in', '', 'out'] });
    ctl.append(said('Lena', '“25 − 7 = 18, then 18 ÷ 2 = 9. So ' + ex('x = 9') + '.”'));
    const ch = makeChoices(ctl, ['Yes. 9 gives 25.', 'No. 9 gives 34.', 'No. 9 gives 48.', 'No. 9 gives 27.'], ctx);
    const why = [
      'Run 9 through the machine: start with 9 × 3, then add 7. Does that make 25?',
      '',
      '48 is (9 + 7) × 3. The machine multiplies by 3 first, then adds 7.',
      '27 is what comes out of the ' + ex('× 3') + ' step. The machine then adds 7.'
    ];
    return {
      check() { const s = ch.sel()[0]; if (s === 1) return true; ch.mark(s, 'bad'); return why[s]; },
      win: () => '9 × 3 = 27, then 27 + 7 = 34, not 25. Lena undid ' + ex('+ 7') + ' correctly, then divided by 2. The machine multiplies by 3, so she needed ' + ex('÷ 3') + '.',
      won() { ch.mark(1, 'good'); ch.lock(); fl.val(1, nt(27)); fl.val(2, nt(34), 'bad'); },
      solve() { ch.set([1]); }
    };
  }
},

/* 13 */ {
  why: () => whyBox(stillRun(6, ['× 3', '+ 7'], { caps: [SX('x') + ' = 6', '', ''], back: true, mark2: { 0: 'good' } }), [
    '25 is 3 lots of ' + ex('x') + ', plus 7. Take the 7 off: 25 − 7 = 18, so 3 lots of ' + ex('x') + ' make 18.',
    '18 ÷ 3 = 6, so ' + ex('x = 6') + '. Substitute to check: 3 × 6 + 7 = 18 + 7 = 25.'
  ]),
  prompt: 'So what is the right value of ' + ex('x') + ' in ' + ex('3x + 7 = 25') + '?',
  sub: 'Backtrack from 25, then check your answer forwards.',
  build(stage, ctl, ctx) {
    const STEPS = ['× 3', '+ 7'];
    const fl = makeFlow(stage, { vals: [XT, '', nt(25)], steps: STEPS, caps: ['in', '', 'out'] });
    const ans = makeAnswer(ctl, ex('x') + ' =', ctx);
    return {
      check() {
        const v = ans.value();
        if (v === 6) return true;
        ans.mark('bad');
        if (isNaN(v)) return 'Type a whole number, using digits only.';
        if (v === 9) return 'That is Lena’s answer, and it gives 34. Undo ' + ex('× 3') + ' with ' + ex('÷ 3') + '.';
        if (v === 18) return '18 is 25 − 7. That undoes ' + ex('+ 7') + ', but ' + ex('× 3') + ' still needs undoing.';
        if (v === 32) return '32 is 25 + 7. To undo ' + ex('+ 7') + ', take 7 away.';
        return 'Check it: ' + trace(v, STEPS) + ', not 25. Undo ' + ex('+ 7') + ' first, then ' + ex('× 3') + '.';
      },
      win: () => '25 − 7 = 18, then 18 ÷ 3 = 6. Check: 6 × 3 = 18, then 18 + 7 = 25.',
      won() { ans.mark('good'); ans.lock(); fl.val(0, nt(6)); fl.val(1, nt(18)); },
      solve() { ans.set(6); }
    };
  }
},

/* 14 */ {
  why: () => whyBox(stillRun(5, ['× 3', '+ 4'], { show: { 2: '$19' }, caps: ['km', '', 'cost'], back: true, mark2: { 0: 'good' } }), [
    'The $19 is $3 for each kilometre, plus $4 to start. Take off the $4: 19 − 4 = 15, so the kilometres cost $15.',
    'At $3 each, $15 pays for 15 ÷ 3 = 5 km.'
  ]),
  prompt: 'A taxi charges $3 for each kilometre, plus $4 to start. Ella’s trip cost $19. How far did she go?',
  build(stage, ctl, ctx) {
    const STEPS = ['× 3', '+ 4'];
    const fl = makeFlow(stage, { vals: [QT, '', '<span class="tile num still">$19</span>'], steps: STEPS, caps: ['km', '', 'cost'] });
    const ans = makeAnswer(ctl, 'Kilometres', ctx);
    return {
      check() {
        const v = ans.value();
        if (v === 5) return true;
        ans.mark('bad');
        if (isNaN(v)) return 'Type a whole number, using digits only.';
        if (v === 15) return '$15 is the cost of the kilometres, once the $4 start fee is taken off. Each kilometre costs $3.';
        if (v === 23) return '23 is 19 + 4. The $4 was added to the fare, so take it away.';
        return v + ' km costs ' + v + ' × 3 = $' + (3 * v) + ', then $' + (3 * v) + ' + $4 = $' + (3 * v + 4) + '. That isn’t $19.';
      },
      win: () => '19 − 4 = 15, then 15 ÷ 3 = 5. Ella went 5 km. Check: 5 × 3 = 15, then 15 + 4 = 19.',
      won() { ans.mark('good'); ans.lock(); fl.val(0, nt(5)); fl.val(1, nt(15)); },
      solve() { ans.set(5); },
      recap: () => 'Ella’s $19 trip was 5 km: 19 − 4 = 15, then 15 ÷ 3 = 5.',
      fl
    };
  },
  then: {
    prompt: 'Ella’s next trip in the same taxi is 8 km. What does it cost?',
    why: () => whyBox(stillRun(8, ['× 3', '+ 4'], { show: { 2: '$28' }, caps: ['km', '', 'cost'], mark: { 2: 'good' } }), [
      'You know the kilometres this time, so run the machine forwards: 8 × 3 = 24, then 24 + 4 = 28.',
      'The $19 trip gave you the output, so you backtracked. This trip gives you the input, so you go forwards.'
    ]),
    build(stage, ctl, ctx, p1) {
      const fl = p1.fl;
      fl.val(0, nt(8)); fl.val(1, ''); fl.val(2, QT);
      const ans = makeAnswer(ctl, 'The trip costs $', ctx);
      return {
        check() {
          const v = ans.value();
          if (v === 28) return true;
          ans.mark('bad');
          if (isNaN(v)) return 'Type a whole number, using digits only.';
          if (v === 24) return '$24 pays for the 8 kilometres: 8 × 3 = 24. The $4 to start still has to be added.';
          if (v === 36) return '36 is (8 + 4) × 3. The machine multiplies by 3 first, then adds 4.';
          if (v === 20) return '20 is 24 − 4. Going forwards, the $4 to start is added, not taken away.';
          if (v === 15) return '15 is 8 + 3 + 4. Each kilometre costs $3, so 8 km costs 8 × 3.';
          if (v === 12) return '12 is 8 + 4. The kilometres cost $3 each, so start with 8 × 3.';
          if (v === 5 || v === 19) return 'That was the first trip. This trip is 8 km, so put 8 in and run the machine forwards.';
          return 'This time you know the kilometres, not the cost. Put 8 in and run the machine forwards: ' + ex('× 3') + ', then ' + ex('+ 4') + '.';
        },
        win: () => '8 × 3 = 24, then 24 + 4 = 28, so the trip costs $28. You knew the input this time, so there was nothing to undo.',
        won() { ans.mark('good'); ans.lock(); fl.val(1, nt(24)); fl.val(2, '<span class="tile num still">$28</span>', 'good'); },
        solve() { ans.set(28); }
      };
    }
  }
},

/* 15 */ {
  prompt: 'Stretch: this machine has three steps, and 11 came out. Build the reverse machine.',
  sub: 'Drag or tap steps into the boxes.',
  why: () => whyBox(stillRun(6, ['× 3', '+ 4', '÷ 2'], { back: true, mark2: { 0: 'good' } }), [
    'The last step was ' + ex('÷ 2') + ', so 11 is half of the number before it: 11 × 2 = 22.',
    'Then 22 − 4 = 18 and 18 ÷ 3 = 6. Each undo step sits under the step it undoes.'
  ]),
  build: reverseCard({
    fwd: ['× 3', '+ 4', '÷ 2'], out: 11, chips: ['÷ 3', '÷ 2', '× 2', '− 4'],
    win: () => '11 × 2 = 22, then 22 − 4 = 18, then 18 ÷ 3 = 6. Check: 6 × 3 = 18, 18 + 4 = 22, 22 ÷ 2 = 11. More steps, same rule: undo each one, last step first.',
    recap: () => 'Your reverse machine: ' + ex('× 2') + ', then ' + ex('− 4') + ', then ' + ex('÷ 3') + '. It turned 11 back into 6.'
  }),
  then: {
    prompt: 'A new last step, ' + ex('− 1') + ', is added to the machine, so 10 comes out. What must the reverse machine do first?',
    why: () => whyBox(stillRun(6, ['× 3', '+ 4', '÷ 2', '− 1'], { back: true, mark2: { 0: 'good' } }), [
      ex('− 1') + ' is now the last thing the machine does, so it is undone first: 10 + 1 = 11.',
      'From 11, the rest is the reverse machine you built: 11 × 2 = 22, 22 − 4 = 18, 18 ÷ 3 = 6.'
    ]),
    build(stage, ctl, ctx) {
      const FWD = ['× 3', '+ 4', '÷ 2', '− 1'], REV = ['+ 1', '× 2', '− 4', '÷ 3'];
      const op = s => '<span class="tile op still">' + ex(s) + '</span>';
      stage.replaceChildren(h('<p class="f-lab">The new machine</p>'));
      makeFlow(stage, { vals: [QT, '', '', '', nt(10)], steps: FWD, caps: caps(4, 'in', 'out') }).node.classList.add('tight');
      stage.append(h('<p class="f-lab">The new reverse machine</p>'));
      const rev = makeFlow(stage, { vals: [nt(10), '', '', '', ''], steps: REV.map(() => null), caps: caps(4, 'start', 'went in') });
      rev.node.classList.add('tight');
      rev.steps.forEach((st, k) => { st.removeAttribute('data-drop'); if (k) st.innerHTML = op(REV[k]); });
      const ch = makeChoices(ctl, REV.slice(0, 2).concat(['− 1', '÷ 3']).map(ex), ctx);
      ctl.lastElementChild.classList.add('row4');
      const why = [
        '',
        ex('× 2') + ' undoes ' + ex('÷ 2') + ', which used to be the last step. Now ' + ex('− 1') + ' is last, so it is undone first.',
        ex('− 1') + ' repeats the new step instead of undoing it: 10 − 1 = 9, but the number before the ' + ex('− 1') + ' step was 11.',
        ex('÷ 3') + ' undoes ' + ex('× 3') + ', the machine’s first step. The first step is undone last.'
      ];
      return {
        check() { const s = ch.sel()[0]; if (s === 0) return true; ch.mark(s, 'bad'); return why[s]; },
        win: () => ex('+ 1') + ' undoes ' + ex('− 1') + ', the new last step: 10 + 1 = 11. Whichever step is done last, its undo goes first.',
        won() {
          ch.mark(0, 'good'); ch.lock();
          rev.steps[0].innerHTML = op(REV[0]);
          let v = 10; REV.forEach((s, k) => { v = runStep(v, s); rev.val(k + 1, nt(v), k === 3 ? 'good' : ''); });
        },
        solve() { ch.set([0]); }
      };
    }
  }
},

/* 16 */ {
  why: () => whyBox(stillRun(6, ['× 2', '+ 8'], { back: true, mark2: { 0: 'good' } }), [
    '20 is double the input, plus 8. Take the 8 off first: 20 − 8 = 12. Then halve: 12 ÷ 2 = 6.',
    'Only 6 runs forwards to 20. Noah’s 2 gives 12, and Priya’s 56 gives 120.'
  ]),
  prompt: 'A machine does ' + ex('× 2') + ', then ' + ex('+ 8') + '. 20 came out. Three students backtrack it. Who is right?',
  sub: 'Choose Agree or Disagree for each one.',
  build(stage, ctl, ctx) {
    stage.hidden = true;
    const claims = [
      { who: 'Noah', say: '“Undo them in the same order: 20 ÷ 2 = 10, then 10 − 8 = 2.”', agree: false, why: 'Run 2 forwards: 2 × 2 = 4, then 4 + 8 = 12, not 20. The last step has to be undone first.',
        hint: 'Did Noah undo the last step first? Run 2 forwards through ' + ex('× 2') + ', then ' + ex('+ 8') + '.' },
      { who: 'Priya', say: '“Go backwards: 20 + 8 = 28, then 28 × 2 = 56.”', agree: false, why: 'Adding 8 again doesn’t undo ' + ex('+ 8') + '. Run 56 forwards: 56 × 2 = 112, then 112 + 8 = 120.',
        hint: 'Did Priya undo each step? Run 56 forwards through ' + ex('× 2') + ', then ' + ex('+ 8') + '.' },
      { who: 'Lily', say: '“Undo the last step first: 20 − 8 = 12, then 12 ÷ 2 = 6. Check: 6 × 2 + 8 = 20.”', agree: true, why: 'Every step is undone, last step first, and the check gives 20.',
        hint: 'Did Lily undo each step, last step first? Run 6 forwards yourself.' }
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
    // A wrong pick gets a hint that doesn't give the verdict away; the full reason shows once the card is won.
    const explain = (i, cls) => {
      const w = $('.why', rows[i].row); if (w) w.remove();
      rows[i].row.classList.add(cls);
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
      win: () => 'Lily has it. Noah kept the same order. Priya reversed the order but didn’t undo the steps. Undo each step, last step first, then check.',
      won() { locked = true; claims.forEach((c, i) => { rows[i].row.classList.remove('bad'); explain(i, 'good'); rows[i].btns.forEach(b => { b.disabled = true; }); }); },
      solve() { claims.forEach((c, i) => { pick[i] = c.agree; paint(i); }); }
    };
  }
}
];

const SECTIONS = [[0, 'Undo a step'], [3, 'Reverse order'], [7, 'Equations'], [10, 'Check and solve'], [14, 'Three steps'], [15, 'Wrap-up']];

// Finish screen: sets the prompt, sub-line and recap for this lesson.
function drawFinish() {
  promptEl.textContent = 'To find the input, run the machine backwards.';
  subEl.hidden = false; subEl.textContent = 'This is called backtracking. Four things to remember:';
  ctl.replaceChildren(); stage.hidden = false;
  const st = s => '<span class="tile op still">' + s + '</span>';
  stage.replaceChildren(h('<ul class="recap">' +
    '<li><span class="art">' + st('+ 5') + st('− 5') + '</span><span>Every step has an inverse that undoes it. ' + ex('− 5') + ' undoes ' + ex('+ 5') + ', and ' + ex('÷ 2') + ' undoes ' + ex('× 2') + '.</span></li>' +
    '<li><span class="art">' + st('− 5') + st('÷ 2') + '</span><span>Undo the steps in reverse order: the last step is undone first. Undoing them in the same order gives the wrong input.</span></li>' +
    '<li><span class="art">' + st('× 3') + st('+ 7') + '</span><span>An equation like ' + ex('3x + 7 = 19') + ' is a machine. Backtrack from 19: 19 − 7 = 12, then 12 ÷ 3 = 4.</span></li>' +
    '<li><span class="art"><span class="tile num still">4</span><span class="tile num still">19</span></span><span>Check by running your answer forwards: 4 × 3 = 12, then 12 + 7 = 19.</span></li></ul>'));
}
