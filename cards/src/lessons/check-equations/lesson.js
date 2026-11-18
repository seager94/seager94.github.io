/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const h = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
// "3b + 4 = 19" -> maths markup. Every lower-case letter becomes a variable, so pass maths only, never words.
const mx = s => '<span class="m">' + String(s).replace(/[a-z]/g, c => '<i class="v">' + c + '</i>') + '</span>';

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

/* ---------- one-step balance (from one-step-equations) ---------- */
// Shrink a balance so the controls under it fit without scrolling.
const compact = (stage, vh = 25) => { $('.scale-wrap', stage).style.width = 'min(100%, 30rem, calc(' + vh + 'vh * 2.42))'; };
// The left pan of b + L: one bag (hidden or see-through) and L loose marbles.
const bagSide = (L, inside, open, removable) => ({ bags: [open ? { tag: 'b', inside } : { tag: 'b', body: '?' }], loose: L, weight: inside + L, removable });
const lhsOf = L => mx(L ? 'b + ' + L : 'b');

/* ---------- two-step balance (from two-step-equations) ---------- */
// Pans drawn smaller than the default so three bags and loose marbles fit on one side.
const BF = 0.7, MS = 21, MR = 9.6;
function leftLoad(cx, bags, loose, odd) {
  const bw = bags.length * 62 * BF + Math.max(0, bags.length - 1) * 4, lw = Math.ceil(loose / 4) * MS;
  let x = cx - (bw + (bw && lw ? 6 : 0) + lw) / 2, out = '';
  bags.forEach(b => { out += '<g transform="translate(' + x + ',129) scale(' + BF + ')">' + bagG(0, 0, b) + '</g>'; x += 62 * BF + 4; });
  if (bw && lw) x += 2;
  for (let k = 0; k < loose; k++) out += marbleG(x + Math.floor(k / 4) * MS + MS / 2, 177 - MR - (k % 4) * MS, MR, k >= loose - odd ? 'odd' : '');
  return out;
}
// groups > 0 draws the marbles shared into that many dashed groups, with the leftovers outlined in amber.
function rightLoad(cx, n, groups, odd) {
  let out = '';
  if (!groups) {
    const cols = Math.min(n, 7);
    for (let k = 0; k < n; k++) {
      const row = Math.floor(k / cols), inRow = Math.min(cols, n - row * cols), col = k % cols;
      out += marbleG(cx + (col - (inRow - 1) / 2) * MS, 177 - MR - row * MS, MR);
    }
    return out;
  }
  const g = Math.floor((n - odd) / groups), GAP = 8;
  const blocks = Array(groups).fill(g).filter(b => b > 0).concat(odd ? [odd] : []);
  const colsOf = b => Math.ceil(b / 4), tot = blocks.reduce((a, b) => a + colsOf(b), 0);
  const s = Math.min(MS, (176 - GAP * (blocks.length - 1)) / tot);
  let x = cx - (tot * s + GAP * (blocks.length - 1)) / 2;
  blocks.forEach((b, bi) => {
    const isOdd = odd && bi === blocks.length - 1, cols = colsOf(b), rows = Math.min(4, b);
    if (!isOdd) out += '<rect class="grp" x="' + (x - 2) + '" y="' + (175 - rows * s) + '" width="' + (cols * s + 4) + '" height="' + (rows * s + 2) + '" rx="6"/>';
    for (let k = 0; k < b; k++) out += marbleG(x + Math.floor(k / 4) * s + s / 2, 177 - s / 2 - (k % 4) * s, s * 0.46, isOdd ? 'odd' : '');
    x += cols * s + GAP;
  });
  return out;
}
function paintPans(stage, l, r) { const p = stage.querySelectorAll('.sc-load'); p[0].innerHTML = l; p[1].innerHTML = r; }
const lhsText = (nb, v, loose) => (nb > 1 ? nb : '') + v + (loose ? ' + ' + loose : '');

// Bags plus loose marbles balancing loose marbles. Two actions, always applied to both sides:
// take a marble off, and share each side into one group per bag. Sharing fails while the loose marbles won't split evenly.
// cfg: { v, nb, loose, right, ans }
function makeSolver(stage, ctl, ctx, cfg) {
  const sc = makeScale(stage), live = h('<div class="live"></div>');
  stage.append(live);
  const row = h('<div class="btnrow"></div>');
  const shareB = h('<button type="button" class="act"></button>'), takeB = h('<button type="button" class="act">Take 1 marble off each side</button>');
  const again = h('<button type="button" class="linkbtn">Start again</button>');
  row.append(shareB, takeB, again);
  ctl.append(row);
  const v = cfg.v;
  let st, fail, locked = false, shown = false;
  const lhs = () => lhsText(st.bags, v, st.loose);
  const solved = () => st.bags === 1 && st.loose === 0;
  function start() { st = { bags: cfg.nb, loose: cfg.loose, right: cfg.right }; fail = false; draw(); }
  function draw() {
    const odd = fail ? st.right % st.bags : 0;
    sc.update({ weight: 0 }, { weight: 0 });
    paintPans(stage, leftLoad(110, Array.from({ length: st.bags }, () => shown ? { tag: v, inside: st.right } : { tag: v }), st.loose, odd),
      rightLoad(450, st.right, fail ? st.bags : 0, odd));
    sc.bar(mx(lhs()) + '<small>' + plural(st.bags, 'bag') + (st.loose ? ', ' + st.loose + ' loose' : '') + '</small>', '=',
      mx(String(st.right)) + '<small>' + plural(st.right, 'marble') + '</small>', true);
    live.innerHTML = fail ? '<small class="warn">' + st.loose + ' ÷ ' + st.bags + ' and ' + st.right + ' ÷ ' + st.bags + ' each leave ' + odd + ' over, so the groups aren’t equal.</small>' : '';
    shareB.textContent = 'Share each side into ' + (st.bags > 1 ? st.bags : cfg.nb) + ' groups';
    shareB.disabled = locked || st.bags === 1;
    takeB.disabled = locked || st.loose === 0;
    again.hidden = locked;
  }
  shareB.onclick = () => {
    if (locked || st.bags === 1) return;
    const N = st.bags;
    if (st.loose % N) fail = true;
    else { fail = false; st = { bags: 1, loose: st.loose / N, right: st.right / N }; }
    draw(); ctx.touch(true);
  };
  takeB.onclick = () => {
    if (locked || !st.loose) return;
    fail = false; st.loose--; st.right--;
    draw(); ctx.touch(true);
  };
  again.onclick = () => { if (!locked) { start(); ctx.touch(false); } };
  start();
  return {
    check() {
      if (solved()) return true;
      const N = st.bags, L = st.loose;
      if (fail) return 'The bags share out, one per group, but ' + plural(L, 'loose marble') + ' can’t be split equally into ' + N + ' groups. Take the loose marbles off both sides first.';
      if (!L) return 'Nothing is loose now, only bags. Share each side into ' + N + ' groups.';
      if (N === 1) return 'One bag and ' + plural(L, 'loose marble') + ' balance ' + st.right + '. Take the loose marbles off both sides.';
      return 'There ' + (L === 1 ? 'is' : 'are') + ' still ' + plural(L, 'loose marble') + ' next to the bags. Take ' + (L === 1 ? 'it' : 'them') + ' off both sides before you share.';
    },
    won() { locked = true; shown = true; draw(); },
    solve() { st = { bags: 1, loose: 0, right: cfg.ans }; fail = false; draw(); }
  };
}

// Written lines with typed blanks. rows: [left side, right side or null for a blank]
function makeWork(host, rows, ctx) {
  const g = h('<div class="work"></div>'), ins = [];
  const ready = () => ins.every(i => i.value.trim() !== '');
  rows.forEach(([l, r]) => {
    g.append(h('<span class="l">' + mx(l) + '</span>'), h('<span>=</span>'));
    if (r != null) { g.append(h('<span class="r">' + mx(String(r)) + '</span>')); return; }
    const inp = h('<input type="text" inputmode="numeric" autocomplete="off" maxlength="5" aria-label="' + l + ' equals">');
    inp.addEventListener('input', () => { ins.forEach(i => i.classList.remove('bad', 'good')); ctx.touch(ready()); });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ctx.submit(); } });
    ins.push(inp); g.append(inp);
  });
  host.append(g);
  return {
    vals: () => ins.map(i => /^\d+$/.test(i.value.trim()) ? +i.value.trim() : NaN),
    mark: (k, c) => ins[k].classList.add(c),
    set: (k, x) => { ins[k].value = x; },
    lock: () => ins.forEach(i => { i.disabled = true; })
  };
}

/* ---------- flowcharts (from backtracking) ---------- */
// Steps are strings such as '× 2'. undo('× 2') is '÷ 2'.
const OPS = { '+': (v, k) => v + k, '−': (v, k) => v - k, '×': (v, k) => v * k, '÷': (v, k) => v / k };
const UNDO = { '+': '−', '−': '+', '×': '÷', '÷': '×' };
const runStep = (v, s) => OPS[s[0]](v, +s.slice(2));
const runAll = (v, steps) => steps.reduce(runStep, v);
const undo = s => UNDO[s[0]] + s.slice(1);
const fmt = v => { const r = Math.round(v * 100) / 100; return (Math.abs(v - r) < 1e-9 ? String(r) : r + '…').replace('-', '−'); };
// Yellow tile: a known number. Blue tile: the unknown, shown as ? until it is found, then as its value. The letter goes in the caption.
const nt = v => '<span class="tile num still">' + fmt(v) + '</span>';
const vt = v => '<span class="tile var still val">' + v + '</span>';
const QT = vt('?');
const caps = (n, a, b) => [a].concat(Array(n - 1).fill(''), [b]);
// "3 × 2 = 6, then 6 + 5 = 11"
function trace(v, steps) {
  return steps.map(s => { const w = runStep(v, s), t = fmt(v) + ' ' + s + ' = ' + fmt(w); v = w; return t; }).join(', then ');
}

// A flowchart: value boxes joined by step boxes, left to right. o.vals: html for each value box (one more than the steps).
// o.steps: step text, or null for an empty box a step can be dropped into. o.caps: caption over each value box.
function makeFlow(host, o) {
  const node = h('<div class="flow"></div>'), vals = [], steps = [];
  o.vals.forEach((_, i) => {
    if (i) {
      const s = o.steps[i - 1];
      const st = h(s == null ? '<div class="f-step slot" data-drop="s' + (i - 1) + '"></div>' : '<div class="f-step">' + mx(s) + '</div>');
      steps.push(st);
      node.append(h('<span class="f-arr"></span>'), st, h('<span class="f-arr"></span>'));
    }
    const c = o.caps && o.caps[i];
    const vb = h('<div class="f-val">' + (c ? '<span class="cap">' + c + '</span>' : '') + '<span class="f-v"></span></div>');
    vals.push(vb);
    node.append(vb);
  });
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
    const b = h('<button type="button" class="tile op" aria-label="Step ' + c + '">' + mx(c) + '</button>');
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
      const b = h('<button type="button" class="tile op" aria-label="Step ' + chips[put[k]] + ', tap to take it out">' + mx(chips[put[k]]) + '</button>');
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
    ? mx(bad) + ' repeats a step of the machine instead of undoing it. To undo ' + mx(bad) + ', use ' + mx(undo(bad)) + '.'
    : mx(bad) + ' would undo ' + mx(undo(bad)) + ', but the machine has no ' + mx(undo(bad)) + ' step.';
  const r = runAll(out, ord);
  const back = Number.isInteger(r) && r >= 0 ? ' Yours gives ' + r + '. Run ' + r + ' forwards: ' + trace(r, fwd) + ', not ' + out + '.' : ' Your steps don’t even give a whole number.';
  if (ord.join('|') === fwd.map(undo).join('|'))
    return 'You undid the steps in the same order as the machine. ' + mx(fwd[fwd.length - 1]) + ' happened last, so undo it first.' + back;
  const k = ord.findIndex((s, i) => s !== ans[i]);
  return 'Undo the last step first. Step ' + (k + 1) + ' of your reverse machine should undo ' + mx(fwd[fwd.length - 1 - k]) + '.' + back;
}

// The machine on top, and an empty reverse machine under it that the student fills with steps.
function reverseCard(cfg) {
  return function (stage, ctl, ctx) {
    const n = cfg.fwd.length, ans = cfg.fwd.map(undo).reverse();
    stage.append(h('<p class="f-lab">The machine</p>'));
    const fw = makeFlow(stage, { vals: [QT].concat(Array(n - 1).fill(''), [nt(cfg.out)]), steps: cfg.fwd, caps: caps(n, 'in', 'out') });
    stage.append(h('<p class="f-lab">Your reverse machine</p>'));
    const rev = makeFlow(stage, { vals: [nt(cfg.out)].concat(Array(n).fill('')), steps: ans.map(() => null), caps: caps(n, 'start', 'went in') });
    const od = makeOrder(rev, ctl, cfg.chips, ctx, ord => {
      // Stop at the first value that isn't a whole number: it is shown in amber and the boxes after it stay empty.
      let v = cfg.out, ok = true;
      ord.forEach((s, k) => {
        if (ok && s) { v = runStep(v, s); ok = Number.isInteger(v) && v >= 0; rev.val(k + 1, nt(v), ok ? '' : 'bad'); }
        else { ok = false; rev.val(k + 1, ''); }
      });
    });
    return {
      check() { const ord = od.order(); return ord.join('|') === ans.join('|') ? true : reverseWhy(cfg.fwd, cfg.out, ord); },
      win: cfg.win,
      won() { const x = runAll(cfg.out, ans); od.lock(); rev.val(n, nt(x), 'good'); fw.val(0, vt(x)); },
      solve() { od.set(ans); }
    };
  };
}

/* ---------- stories (from equations-from-stories) ---------- */
// Bar model of a bill: a one-off amount (yellow) plus equal blocks that depend on the letter (blue), under a bar for the total.
// o: { unit, fixed, total, max, letter, q (label for the unknown part), cap, fixedCap, totalCap }. set(null) hides the blocks, set(n) shows n of them.
function makeBar(host, o) {
  const node = h('<div class="bm" role="img"><div class="bm-row"><div class="bm-tot"></div></div><div class="bm-row bm-built"></div><div class="bm-caps"></div><span class="bm-line"></span></div>');
  const pc = x => (x / o.max * 100) + '%';
  const tot = $('.bm-tot', node);
  tot.style.width = pc(o.total); tot.innerHTML = o.totalCap;
  $('.bm-line', node).style.left = pc(o.total);
  host.append(node);
  const cell = (cls, w, html) => '<span class="' + cls + '" style="width:' + pc(w) + '">' + html + '</span>';
  function set(n) {
    let row = cell('bm-b f', o.fixed, '$' + o.fixed);
    if (n == null) row += cell('bm-b q', o.total - o.fixed, o.q);
    else for (let k = 0; k < n; k++) row += cell('bm-b u', o.unit, '$' + o.unit);
    $('.bm-built', node).innerHTML = row;
    $('.bm-caps', node).innerHTML = cell('', o.fixed, o.fixedCap) + cell('', n == null ? o.total - o.fixed : o.unit * n, n == null ? o.cap : mx(o.letter + ' = ' + n));
    node.classList.toggle('ok', n != null && o.fixed + o.unit * n === o.total);
    node.setAttribute('aria-label', '$' + o.fixed + ' ' + o.fixedCap + (n == null ? ' plus an unknown amount' : ' plus ' + plural(n, 'block') + ' of $' + o.unit) + ', compared with ' + o.totalCap + '.');
  }
  return { set };
}
const story = (stage, html) => stage.append(h('<div class="story">' + html + '</div>'));

/* ---------- Why? panels: the diagram redrawn small with its values, then one or two lines of working ---------- */
const whyBox = (art, l1, l2) => '<div class="wy">' + art + '<p>' + l1 + '</p>' + (l2 ? '<p>' + l2 + '</p>' : '') + '</div>';
// nb bags that each hold val (the number on the bag, the letter on its tag), plus loose marbles, against `right`:
// drawn as marbles up to 21, as a yellow number tile beyond that. rel is '=' or '≠'.
function whyBal(v, nb, val, loose, right, rel) {
  let x = 6, g = '';
  for (let i = 0; i < nb; i++) { g += '<g transform="translate(' + x + ',16) scale(.8)">' + bagG(0, 0, { tag: v, body: String(val) }) + '</g>'; x += 56; }
  for (let k = 0; k < loose; k++) g += marbleG(x + 11 + Math.floor(k / 3) * 18, 62 - (k % 3) * 18, 8);
  if (loose) x += Math.ceil(loose / 3) * 18 + 8;
  g += '<text class="wy-rel" x="' + (x + 16) + '" y="54" text-anchor="middle">' + (rel || '=') + '</text>';
  x += 34;
  if (right <= 21) {
    for (let k = 0; k < right; k++) g += marbleG(x + 9 + (k % 7) * 18, 62 - Math.floor(k / 7) * 18, 8);
    x += Math.min(7, right) * 18;
  } else {
    g += '<rect class="wy-num" x="' + x + '" y="24" width="58" height="44" rx="10"/><text class="wy-numt" x="' + (x + 29) + '" y="54" text-anchor="middle">' + right + '</text>';
    x += 58;
  }
  const W = x + 6;
  return '<svg class="wy-svg" viewBox="0 0 ' + W + ' 78" style="width:100%;max-width:' + (W / 13).toFixed(1) + 'rem" role="img" aria-label="' +
    plural(nb, 'bag') + ' holding ' + val + ' each' + (loose ? ', and ' + plural(loose, 'loose marble') : '') + (rel === '≠' ? ', which is not ' : ', balancing ') + right + '">' + g + '</svg>';
}
// A machine with every value filled in: the input on a blue tile (its name in the caption), the rest yellow.
function whyFlow(cap, x, steps) {
  const box = document.createElement('div');
  let v = x;
  makeFlow(box, { vals: [vt(x)].concat(steps.map(s => { v = runStep(v, s); return nt(v); })), steps, caps: caps(steps.length, cap, '') });
  return box.innerHTML;
}
function whyBar(cfg, n) {
  const box = document.createElement('div');
  makeBar(box, cfg).set(n);
  return box.innerHTML;
}

/* ---------- cards ---------- */
const BIKE = { unit: 5, fixed: 8, total: 43, max: 43, letter: 'h', fixedCap: 'helmet', totalCap: '$43 paid', cap: '$5 for each hour' };
const POOL = { unit: 6, fixed: 15, total: 57, max: 57, letter: 's', fixedCap: 'locker key', totalCap: '$57 paid', cap: '$6 for each swim' };
const BIKE_STORY = 'A shop hires out bikes for $5 an hour, plus $8 once for a helmet. Zara paid $43. Let ' + mx('h') + ' be the number of hours.';

const cards = [

/* 1 */ {
  bridge: true,
  prompt: 'Level Check: Equations',
  sub: '10 questions, mixed from the four Equations lessons. After two tries, the answer is shown and you move on.'
},

/* 2: one-step, balance */ {
  from: 'one-step-equations',
  prompt: 'The scale shows ' + mx('b + 5 = 13') + '. Get the bag on its own and keep the scale level.',
  sub: 'Tap marbles on either side to take them off, or use the buttons.',
  why: () => whyBox(whyBal('b', 1, 8, 5, 13), mx('b + 5 − 5 = 13 − 5') + ': take 5 off both sides and the scale stays level.', mx('b = 8') + '. Check: 8 + 5 = 13.'),
  build(stage, ctl, ctx) {
    const BAG = 8, L0 = 5, R0 = 13;
    let L = L0, R = R0, open = false;
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
    bb.onclick = () => { if (!open) { L = L0; R = R0; draw(); ctx.touch(false); } };
    ctl.append(tray);
    draw();
    return {
      check() {
        if (L === 0 && R === BAG) return true;
        const offL = L0 - L, offR = R0 - R;
        if (BAG + L === R) return 'Still level, because you took ' + plural(offL, 'marble') + ' off each side. The bag isn’t on its own yet, so keep going.';
        if (BAG + L < R) return 'The bag side went up. You took ' + offL + ' off the left but only ' + offR + ' off the right. Take the same number off each side.';
        return 'The bag side went down. You took ' + offR + ' off the right but only ' + offL + ' off the left. Put them all back and take the same number off each side.';
      },
      win: () => 'Taking 5 off both sides kept the scale level, and the bag balances 8 marbles. So ' + mx('b = 8') + '. Check: 8 + 5 = 13.',
      won() { open = true; draw(); },
      solve() { L = 0; R = BAG; draw(); }
    };
  }
},

/* 3: backtracking, typed */ {
  from: 'backtracking',
  prompt: 'This machine multiplies by 4, then adds 3. Out comes 39. What number went in?',
  why: () => whyBox(whyFlow('in', 9, ['× 4', '+ 3']), 'Backwards, last step first: 39 − 3 = 36, then 36 ÷ 4 = 9.', 'Check forwards: 9 × 4 = 36, then 36 + 3 = 39.'),
  build(stage, ctl, ctx) {
    const STEPS = ['× 4', '+ 3'];
    const fl = makeFlow(stage, { vals: [QT, '', nt(39)], steps: STEPS, caps: ['in', '', 'out'] });
    const ans = makeAnswer(ctl, 'The number that went in', ctx);
    return {
      check() {
        const v = ans.value();
        if (v === 9) return true;
        ans.mark('bad');
        if (isNaN(v)) return 'Type a whole number using digits. If you got a decimal, you undid the ' + mx('× 4') + ' first. The ' + mx('+ 3') + ' happened last, so undo it first.';
        if (v === 36) return '36 is the number just before the ' + mx('+ 3') + ' step. Now undo the ' + mx('× 4') + ' step too.';
        if (v === 42) return '42 is 39 + 3. Adding 3 again goes the wrong way. To undo ' + mx('+ 3') + ', take 3 away.';
        if (v === 144 || v === 156 || v === 168) return 'To undo ' + mx('× 4') + ', divide by 4. You multiplied.';
        return 'Run ' + v + ' forwards: ' + trace(v, STEPS) + ', not 39.';
      },
      win: () => '39 − 3 = 36, then 36 ÷ 4 = 9. The machine added 3 last, so you undo that first.',
      won() { ans.mark('good'); ans.lock(); fl.val(0, vt(9)); fl.val(1, nt(36)); },
      solve() { ans.set(9); }
    };
  }
},

/* 4: stories, choice then typed */ {
  from: 'equations-from-stories',
  prompt: 'Which equation matches this story?',
  why: () => whyBox(whyBar(Object.assign({ q: mx('5h') }, BIKE), null), '$5 for each of the ' + mx('h') + ' hours is ' + mx('5h') + '. The $8 is paid once, and together they make $43.', mx('5h + 8 = 43')),
  build(stage, ctl, ctx) {
    story(stage, BIKE_STORY);
    const ch = makeChoices(ctl, [mx('8h + 5 = 43'), mx('5h + 8 = 43'), mx('5h = 43 + 8'), mx('h + 5 + 8 = 43')], ctx);
    const why = [
      mx('8h') + ' charges $8 for every hour. Read the story again: which amount is paid once, and which is paid for every hour?',
      '',
      'Zara paid $43 altogether, and that already includes the $8 helmet. So the hours cost less than $43, not 43 + 8.',
      mx('h + 5 + 8') + ' adds ' + mx('h') + ' only once, as if each hour cost $1. Each hour costs $5. What do ' + mx('h') + ' hours cost?'
    ];
    return {
      check() { const s = ch.sel()[0]; if (s === 1) return true; ch.mark(s, 'bad'); return why[s]; },
      win: () => mx('5h + 8 = 43') + ': $5 for each of the ' + mx('h') + ' hours, plus $8 once, makes $43.',
      won() { ch.mark(1, 'good'); ch.lock(); },
      solve() { ch.set([1]); },
      recap: () => 'The story says ' + mx('5h + 8 = 43') + '.'
    };
  },
  then: {
    prompt: 'Solve ' + mx('5h + 8 = 43') + '. How many hours did Zara hire the bike for?',
    why: () => whyBox(whyBar(BIKE, 7), 'Take off the helmet: ' + mx('5h = 43 − 8 = 35') + '.', 'Then ' + mx('h = 35 ÷ 5 = 7') + '. Check: 5 × 7 + 8 = 43.'),
    build(stage, ctl, ctx) {
      const bar = makeBar(stage, Object.assign({ q: mx('5h') }, BIKE));
      bar.set(null);
      const ans = makeAnswer(ctl, mx('h') + ' =', ctx);
      return {
        check() {
          const v = ans.value();
          if (v === 7) return true;
          ans.mark('bad');
          if (isNaN(v)) return 'Type a whole number using digits. If you got a decimal, you divided first. Take off the $8 before you divide.';
          if (v === 35) return '35 is what the hours cost: 43 − 8 = 35. But ' + mx('h') + ' is the number of hours. How many 5s make 35?';
          if (v === 43) return '43 is the total Zara paid. ' + mx('h') + ' is the number of hours.';
          if (v === 51) return '51 is 43 + 8. The $43 already includes the helmet, so take the $8 off.';
          if (v === 30) return '30 is 35 − 5. But ' + mx('5h') + ' means 5 × ' + mx('h') + ', so divide 35 by 5 instead of subtracting 5.';
          const p = 5 * v + 8;
          return 'Check it in the story: ' + plural(v, 'hour') + ' would cost 5 × ' + v + ' + 8 = $' + p + ', not $43. So Zara had the bike for ' + (p > 43 ? 'fewer' : 'more') + ' hours.';
        },
        win: () => mx('h = 7') + '. Take off the helmet: 43 − 8 = 35. Then 35 ÷ 5 = 7. Zara had the bike for 7 hours. Check: 5 × 7 + 8 = 43.',
        won() { bar.set(7); ans.mark('good'); ans.lock(); },
        solve() { ans.set(7); }
      };
    }
  }
},

/* 5: two-step, balance */ {
  from: 'two-step-equations',
  prompt: 'Find ' + mx('b') + ' in ' + mx('3b + 4 = 19') + '.',
  sub: 'Each button does the same thing to both sides. Use them in the order you think works.',
  why: () => whyBox(whyBal('b', 3, 5, 4, 19), 'Take the 4 loose marbles off both sides: ' + mx('3b = 15') + '.', 'Share both sides into 3 groups: ' + mx('b = 15 ÷ 3 = 5') + '. Check: 3 × 5 + 4 = 19.'),
  build(stage, ctl, ctx) {
    return Object.assign(makeSolver(stage, ctl, ctx, { v: 'b', nb: 3, loose: 4, right: 19, ans: 5 }), {
      win: () => mx('b = 5') + '. Taking 4 off both sides gave ' + mx('3b = 15') + ', which shares into 3 groups of 5. Check: 3 × 5 + 4 = 19.'
    });
  }
},

/* 6: one-step, choice */ {
  from: 'one-step-equations',
  prompt: 'Which value of ' + mx('n') + ' is a solution of ' + mx('3n = 36') + '?',
  why: () => whyBox(whyBal('n', 3, 12, 0, 36), mx('3n') + ' means 3 × ' + mx('n') + ': three bags. Divide both sides by 3.', mx('n = 36 ÷ 3 = 12') + '. Check: 3 × 12 = 36.'),
  build(stage, ctl, ctx) {
    stage.hidden = true;
    const ch = makeChoices(ctl, [mx('n = 6'), mx('n = 33'), mx('n = 12'), mx('n = 108')], ctx);
    const why = [
      mx('3n') + ' is not a number in the thirties. It means 3 × ' + mx('n') + '. Check: 3 × 6 = 18, not 36.',
      '33 is 36 − 3. Check: 3 × 33 = 99, not 36. ' + mx('3n') + ' is 3 lots of ' + mx('n') + ', so taking away 3 doesn’t undo it.',
      '',
      '108 is 36 × 3. Check: 3 × 108 = 324, not 36. What undoes multiplying by 3?'
    ];
    return {
      check() { const s = ch.sel()[0]; if (s === 2) return true; ch.mark(s, 'bad'); return why[s]; },
      win: () => '3 × 12 = 36, so ' + mx('n = 12') + '. The equation multiplies by 3, so dividing by 3 undoes it: 36 ÷ 3 = 12.',
      won() { ch.mark(2, 'good'); ch.lock(); },
      solve() { ch.set([2]); }
    };
  }
},

/* 7: backtracking, reverse machine */ {
  from: 'backtracking',
  prompt: 'This machine multiplies by 5, then subtracts 4, and 31 came out. Build the reverse machine.',
  sub: 'Drag or tap steps into the boxes. Tap a placed step to remove it.',
  why: () => whyBox(whyFlow('in', 7, ['× 5', '− 4']), 'Backwards, last step first: 31 + 4 = 35, then 35 ÷ 5 = 7.', 'Check forwards: 7 × 5 = 35, then 35 − 4 = 31.'),
  build: reverseCard({
    fwd: ['× 5', '− 4'], out: 31, chips: ['÷ 5', '− 4', '+ 4', '× 5'],
    win: () => '31 + 4 = 35, then 35 ÷ 5 = 7. The machine subtracted 4 last, so the reverse machine adds 4 first.'
  })
},

/* 8: stories, choice */ {
  from: 'equations-from-stories',
  prompt: 'In this story, what does ' + mx('6s') + ' mean?',
  why: () => whyBox(whyBar(POOL, 7), mx('s') + ' is a number, the number of swims, so ' + mx('6s') + ' is $6 × that number: the blue part.', 'With ' + mx('s = 7') + ': 6 × 7 = $42 for swims, and 42 + 15 = 57.'),
  build(stage, ctl, ctx) {
    story(stage, 'A pool charges $6 for each swim, plus $15 once for a locker key. Noor has paid $57. Let ' + mx('s') + ' be the number of swims, so ' + mx('6s + 15 = 57') + '.');
    const ch = makeChoices(ctl, ['6 swims', 'The dollars Noor paid for swims', 'The price of one swim', '6 more than the number of swims'], ctx);
    const why = [
      '“6 swims” reads ' + mx('s') + ' as the word swims. But ' + mx('s') + ' is a number: the number of swims. What does $6 times that number give?',
      '',
      'One swim costs $6, and the story already says so. ' + mx('6s') + ' multiplies that $6 by the number of swims.',
      '6 more than the number of swims would be ' + mx('s + 6') + '. But ' + mx('6s') + ' means 6 × ' + mx('s') + '.'
    ];
    return {
      check() { const s = ch.sel()[0]; if (s === 1) return true; ch.mark(s, 'bad'); return why[s]; },
      win: () => mx('6s') + ' means 6 × the number of swims: the dollars Noor paid for swims. The letter stands for a number, not for the word “swims”.',
      won() { ch.mark(1, 'good'); ch.lock(); },
      solve() { ch.set([1]); }
    };
  }
},

/* 9: two-step, written lines */ {
  from: 'two-step-equations',
  prompt: 'Fill in the lines to solve ' + mx('8n + 3 = 43') + '.',
  why: () => whyBox(whyFlow(mx('n'), 5, ['× 8', '+ 3']), 'Subtract 3 from both sides: ' + mx('8n = 40') + '.', 'Divide both sides by 8: ' + mx('n = 5') + '. Check: 8 × 5 + 3 = 43.'),
  build(stage, ctl, ctx) {
    const wk = makeWork(stage, [['8n + 3', 43], ['8n', null], ['n', null]], ctx);
    return {
      check() {
        const [a, b] = wk.vals();
        if (isNaN(a) || isNaN(b)) { wk.mark(isNaN(a) ? 0 : 1, 'bad'); return 'Type whole numbers, using digits only.'; }
        if (a !== 40) {
          wk.mark(0, 'bad');
          if (a === 46) return 'You added 3. The equation has ' + mx('+ 3') + ', so subtract 3 from both sides: 43 − 3.';
          if (a === 43) return 'The left side lost its ' + mx('+ 3') + ', so take 3 off the right side too: 43 − 3.';
          if (a === 5) return '5 is ' + mx('n') + ', but this line is ' + mx('8n') + ': all 8 lots together. What is left on the right after taking off the 3?';
          return 'To get from ' + mx('8n + 3') + ' to ' + mx('8n') + ', subtract 3 from both sides: 43 − 3 = ?';
        }
        wk.mark(0, 'good');
        if (b === 5) return true;
        wk.mark(1, 'bad');
        if (b === 320) return 'To undo × 8, divide by 8. ' + mx('8n') + ' means 8 × ' + mx('n') + ', so ' + mx('n') + ' is 40 ÷ 8.';
        if (b === 32) return mx('8n') + ' means 8 × ' + mx('n') + ', not 8 + ' + mx('n') + '. Divide 40 by 8 instead of subtracting 8.';
        if (b === 40) return '40 is still ' + mx('8n') + ', all eight together. Divide both sides by 8.';
        return 'Divide both sides by 8: 40 ÷ 8 = ?';
      },
      win: () => mx('8n = 40') + ', then ' + mx('n = 5') + '. Subtract the 3 first, then divide by 8. Check: 8 × 5 + 3 = 43.',
      won() { wk.mark(0, 'good'); wk.mark(1, 'good'); wk.lock(); },
      solve() { wk.set(0, 40); wk.set(1, 5); }
    };
  }
},

/* 10: one-step, typed */ {
  from: 'one-step-equations',
  prompt: mx('n ÷ 4 = 6') + '. What is ' + mx('n') + '?',
  why: () => whyBox(whyFlow(mx('n'), 24, ['÷ 4']), 'Multiplying by 4 undoes dividing by 4: ' + mx('n ÷ 4 × 4 = 6 × 4') + '.', mx('n = 24') + '. Check: 24 ÷ 4 = 6.'),
  build(stage, ctl, ctx) {
    const fl = makeFlow(stage, { vals: [QT, nt(6)], steps: ['÷ 4'], caps: [mx('n'), ''] });
    const ans = makeAnswer(ctl, mx('n') + ' =', ctx);
    return {
      check() {
        const v = ans.value(), f = parseFloat(ans.raw().replace(',', '.'));
        if (v === 24) return true;
        ans.mark('bad');
        if (f === 1.5) return '6 ÷ 4 = 1.5 divides by 4 again. Going backwards, you need the opposite of dividing by 4.';
        if (isNaN(v)) return 'Type a whole number, using digits only.';
        if (v === 2) return '2 is 6 − 4. Check: 2 ÷ 4 = 0.5, not 6. The step divides by 4, so subtracting doesn’t undo it.';
        if (v === 10) return '10 is 6 + 4. Check: 10 ÷ 4 = 2.5, not 6. Adding undoes subtracting, but this step divides by 4.';
        if (v <= 6) return 'Dividing ' + mx('n') + ' by 4 gives 6, so ' + mx('n') + ' must be bigger than 6.';
        return 'Check: ' + v + ' ÷ 4 = ' + fmt(v / 4) + ', not 6. What undoes dividing by 4?';
      },
      win: () => 'Multiplying by 4 undoes dividing by 4: 6 × 4 = 24, so ' + mx('n = 24') + '. Check: 24 ÷ 4 = 6.',
      won() { ans.mark('good'); ans.lock(); fl.val(0, vt(24)); },
      solve() { ans.set(24); }
    };
  }
},

/* 11: two-step, check by substitution */ {
  from: 'two-step-equations',
  prompt: 'Ruby says ' + mx('x = 9') + ' is the solution of ' + mx('4x + 6 = 38') + '. Is Ruby right?',
  why: () => whyBox(whyBal('x', 4, 9, 6, 38, '≠'), 'Four bags of 9 and 6 loose: 4 × 9 + 6 = 36 + 6 = 42, not 38.', 'The solution is ' + mx('x = 8') + ': 4 × 8 + 6 = 32 + 6 = 38.'),
  build(stage, ctl, ctx) {
    stage.hidden = true;
    const ch = makeChoices(ctl, ['Yes. 4 × 9 + 6 = 38', 'No. 49 + 6 = 55', 'No. 4 × 9 + 6 = 42', 'No. 4 + 9 + 6 = 19'], ctx);
    const why = [
      'Work it out: 4 × 9 = 36, then 36 + 6. Is that 38?',
      mx('4x') + ' is not 4 with the 9 written after it. It means 4 × ' + mx('x') + ', so with ' + mx('x = 9') + ' it is 4 × 9 = 36, not 49.',
      '',
      mx('4x') + ' means 4 × ' + mx('x') + ', not 4 + ' + mx('x') + '. With ' + mx('x = 9') + ' it is 4 × 9 = 36.'
    ];
    return {
      check() { const s = ch.sel()[0]; if (s === 2) return true; ch.mark(s, 'bad'); return why[s]; },
      win: () => '4 × 9 + 6 = 42, not 38, so 9 is not the solution. Solving gives ' + mx('4x = 32') + ', so ' + mx('x = 8') + '. Check: 4 × 8 + 6 = 38.',
      won() { ch.mark(2, 'good'); ch.lock(); },
      solve() { ch.set([2]); }
    };
  }
}
];

const SECTIONS = [[0, 'Level Check']];
