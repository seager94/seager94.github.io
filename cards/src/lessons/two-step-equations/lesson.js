/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const h = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');

// "3b + 2" -> maths markup. A lower-case letter, alone or after a number, becomes a variable.
function mx(s) {
  return '<span class="m">' + String(s).split(' ').map(t => /^\d*[a-z]$/.test(t) ? t.slice(0, -1) + '<i class="v">' + t.slice(-1) + '</i>' : t).join(' ') + '</span>';
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

/* ---------- this lesson: a balance you solve on ---------- */
// Pans drawn smaller than the default so three bags and seven marbles fit on one side.
const BF = 0.7, MS = 21, MR = 9.6;
function leftLoad(cx, bags, loose, odd) {
  const bw = bags.length * 62 * BF + Math.max(0, bags.length - 1) * 4, lw = Math.ceil(loose / 4) * MS;
  let x = cx - (bw + (bw && lw ? 6 : 0) + lw) / 2, out = '';
  bags.forEach(b => { out += '<g transform="translate(' + x + ',129) scale(' + BF + ')">' + bagG(0, 0, b) + '</g>'; x += 62 * BF + 4; });
  if (bw && lw) x += 2;
  for (let k = 0; k < loose; k++) out += marbleG(x + Math.floor(k / 4) * MS + MS / 2, 177 - MR - (k % 4) * MS, MR, k >= loose - odd ? 'odd' : '');
  return out;
}
// groups > 0 draws the marbles shared into that many dashed groups, with the leftovers outlined in red.
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
const chain = log => '<span class="chain">' + log.map((e, i) => (i ? '<span class="arr"><small>' + e.op + '</small>→</span>' : '') + mx(e.eq)).join('') + '</span>';

// Bags plus loose marbles balancing loose marbles. Two actions, always applied to both sides:
// take marbles off, and share each side into one group per bag. Sharing fails while the loose marbles won't split evenly.
// cfg: { v, nb, loose, right, ans, steps (buttons act as written steps), shareFirst (hide take-off until sharing is tried) }
function makeSolver(stage, ctl, ctx, cfg) {
  const sc = makeScale(stage), live = h('<div class="live"></div>');
  stage.append(live);
  const row = h('<div class="btnrow"></div>');
  const shareB = h('<button type="button" class="act"></button>'), takeB = h('<button type="button" class="act"></button>');
  const again = h('<button type="button" class="linkbtn">Start again</button>');
  row.append(shareB, takeB, again);
  ctl.append(row);
  const v = cfg.v;
  let st, fail, log, tried = false, locked = false, shown = false;
  const lhs = () => lhsText(st.bags, v, st.loose);
  const solved = () => st.bags === 1 && st.loose === 0;
  function start() { st = { bags: cfg.nb, loose: cfg.loose, right: cfg.right }; fail = false; log = [{ eq: lhs() + ' = ' + st.right }]; draw(); }
  function draw() {
    const odd = fail ? st.right % st.bags : 0;
    sc.update({ weight: 0 }, { weight: 0 });
    paintPans(stage, leftLoad(110, Array.from({ length: st.bags }, () => shown ? { tag: v, inside: st.right } : { tag: v }), st.loose, odd),
      rightLoad(450, st.right, fail ? st.bags : 0, odd));
    sc.bar(mx(lhs()) + '<small>' + plural(st.bags, 'bag') + (st.loose ? ', ' + st.loose + ' loose' : '') + '</small>', '=',
      mx(String(st.right)) + '<small>' + plural(st.right, 'marble') + '</small>', true);
    const warn = fail ? '<small class="warn">' + st.loose + ' ÷ ' + st.bags + ' and ' + st.right + ' ÷ ' + st.bags + ' each leave ' + odd + ' over, so the groups aren’t equal.</small>' : '';
    live.innerHTML = (cfg.steps ? chain(log) : '') + warn;
    shareB.textContent = cfg.steps ? 'Divide both sides by ' + cfg.nb : 'Share each side into ' + (st.bags > 1 ? st.bags : cfg.nb) + ' groups';
    takeB.textContent = cfg.steps ? 'Subtract ' + cfg.loose + ' from both sides' : 'Take 1 marble off each side';
    takeB.hidden = !!cfg.shareFirst && !tried;
    shareB.disabled = locked || st.bags === 1;
    takeB.disabled = locked || st.loose === 0;
    again.hidden = locked;
  }
  shareB.onclick = () => {
    if (locked || st.bags === 1) return;
    tried = true;
    const N = st.bags;
    if (st.loose % N) fail = true;
    else { fail = false; st = { bags: 1, loose: st.loose / N, right: st.right / N }; log.push({ op: '÷ ' + N, eq: lhs() + ' = ' + st.right }); }
    draw(); ctx.touch(true);
  };
  takeB.onclick = () => {
    if (locked || !st.loose) return;
    const k = cfg.steps ? st.loose : 1;
    fail = false; st.loose -= k; st.right -= k;
    log.push({ op: '− ' + k, eq: lhs() + ' = ' + st.right });
    draw(); ctx.touch(true);
  };
  again.onclick = () => { if (!locked) { start(); ctx.touch(false); } };
  start();
  return {
    check() {
      if (solved()) return true;
      const N = st.bags, L = st.loose;
      if (fail) return 'The bags share out, one per group, but ' + plural(L, 'loose marble') + ' can’t be split equally into ' + N + ' groups. ' +
        (cfg.steps ? 'Subtract ' + L + ' from both sides first.' : 'Take the loose marbles off both sides first.');
      if (!L) return 'Nothing is loose now, only bags. ' + (cfg.steps ? 'Divide both sides by ' + N + '.' : 'Share each side into ' + N + ' groups.');
      if (N === 1) return 'One bag and ' + plural(L, 'loose marble') + ' balance ' + st.right + '. Take the loose marbles off both sides.';
      return 'There ' + (L === 1 ? 'is' : 'are') + ' still ' + plural(L, 'loose marble') + ' next to the bags. Take ' + (L === 1 ? 'it' : 'them') + ' off both sides before you share.';
    },
    won() { locked = true; shown = true; draw(); },
    solve() {
      st = { bags: 1, loose: 0, right: cfg.ans }; fail = false; tried = true;
      log = [log[0], { op: '− ' + cfg.loose, eq: lhsText(cfg.nb, v, 0) + ' = ' + (cfg.right - cfg.loose) }, { op: '÷ ' + cfg.nb, eq: v + ' = ' + cfg.ans }];
      draw();
    }
  };
}
const solverCard = (cfg, win) => (stage, ctl, ctx) => Object.assign(makeSolver(stage, ctl, ctx, cfg), { win });

// n see-through bags holding `inside` each, plus loose marbles, on a mat.
function bagMat(stage, n, v, inside, loose, label) {
  const mat = h('<div class="mat"></div>');
  mat.innerHTML = ('<div class="it bagit">' + svgBag({ tag: v, inside }) + '</div>').repeat(n) + '<div class="mbs">' + ('<div class="it mbit">' + SVG_MARBLE + '</div>').repeat(loose) + '</div>';
  stage.append(mat, h('<div class="live">' + label + '</div>'));
}

// Written lines with typed blanks. rows: [step note, left side, right side or null for a blank]
function makeWork(host, rows, ctx) {
  const g = h('<div class="work"></div>'), ins = [];
  const ready = () => ins.every(i => i.value.trim() !== '');
  rows.forEach(([op, l, r]) => {
    g.append(h('<span class="op">' + op + '</span>'), h('<span class="l">' + mx(l) + '</span>'), h('<span>=</span>'));
    if (r != null) { g.append(h('<span>' + mx(String(r)) + '</span>')); return; }
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

// A written equation a·v + c = r (or c + a·v = r when o.first) with a typed answer.
function solveCard(o) {
  return function (stage, ctl, ctx) {
    const lhs = o.first ? o.c + ' + ' + o.a + o.v : o.a + o.v + ' + ' + o.c;
    stage.append(h('<div class="eqbig">' + mx(lhs + ' = ' + o.r) + '</div>'));
    const ans = makeAnswer(ctl, mx(o.v + ' ='), ctx);
    const sub = x => o.first ? o.c + ' + ' + o.a + ' × ' + x : o.a + ' × ' + x + ' + ' + o.c;
    return {
      check() {
        const x = ans.value();
        if (x === o.ans) return true;
        ans.mark('bad');
        if (isNaN(x)) return 'Type a whole number using digits. If you got a decimal, you probably divided first. Subtract ' + o.c + ' from both sides before you divide.';
        const t = o.extra && o.extra(x);
        if (t) return t;
        if (x === o.r - o.c) return mx(o.a + o.v + ' = ' + x) + ' is right so far, but ' + x + ' is all ' + o.a + ' lots of ' + mx(o.v) + ' together. Divide both sides by ' + o.a + ', not just the ' + mx(o.a + o.v) + '.';
        if (x === o.r + o.c) return 'You added ' + o.c + '. To undo ' + mx('+ ' + o.c) + ', subtract ' + o.c + ' from both sides.';
        if (x === o.r - o.c - o.a) return mx(o.a + o.v) + ' means ' + o.a + ' × ' + mx(o.v) + ', not ' + o.a + ' + ' + mx(o.v) + '. Divide by ' + o.a + ' instead of subtracting ' + o.a + '.';
        return 'Test ' + mx(o.v + ' = ' + x) + ': ' + sub(x) + ' = ' + (o.a * x + o.c) + ', not ' + o.r + '.';
      },
      win: o.win,
      won() { ans.mark('good'); ans.lock(); },
      solve() { ans.set(o.ans); },
      recap: o.recap
    };
  };
}

/* ---------- still diagrams for Why? panels and bridges ---------- */
const whyBox = (fig, lines) => '<div class="why-fig">' + fig + '</div>' + lines.map(l => '<p class="why-ln">' + l + '</p>').join('');
const xbags = (n, k) => Array.from({ length: n }, () => ({ inside: k }));
// A still balance: see-through bags and loose marbles on the left, marbles on the right (in dashed groups when groups > 0).
// l and r are written under the pans.
function stillBalance(bags, loose, right, groups, l, r) {
  const d = document.createElement('div'), sc = makeScale(d);
  sc.update({ weight: 0 }, { weight: 0 });
  // The number in each bag is written above it, at the same positions leftLoad uses.
  const bw = bags.length * 62 * BF + Math.max(0, bags.length - 1) * 4, lw = Math.ceil(loose / 4) * MS;
  const x0 = 110 - (bw + (bw && lw ? 6 : 0) + lw) / 2;
  const nums = bags.map((b, i) => '<text class="sc-n" x="' + (x0 + i * (62 * BF + 4) + 31 * BF) + '" y="125" text-anchor="middle">' + b.inside + '</text>').join('');
  paintPans(d, leftLoad(110, bags, loose, 0) + nums, rightLoad(450, right, groups, 0));
  sc.bar(l, '=', r, true);
  return '<div class="still-scale">' + d.innerHTML + '</div>';
}
// n see-through bags of `inside` and some loose marbles, a number under each, then "= total".
function matFig(n, inside, loose, total) {
  const bw = 68, cols = Math.ceil(loose / 3), lx = n * bw + 8, lw = cols * 22, W = lx + lw + 96;
  let g = '';
  for (let i = 0; i < n; i++) g += bagG(i * bw, 0, { inside }) + '<text class="fig-n" x="' + (i * bw + 31) + '" y="93" text-anchor="middle">' + inside + '</text>';
  for (let k = 0; k < loose; k++) g += marbleG(lx + Math.floor(k / 3) * 22 + 11, 58 - (k % 3) * 22, 9.5);
  g += '<text class="fig-n" x="' + (lx + lw / 2) + '" y="93" text-anchor="middle">' + loose + '</text>' +
    '<text class="fig-eq" x="' + (lx + lw + 22) + '" y="50" text-anchor="middle">=</text>' +
    '<rect class="fig-num" x="' + (lx + lw + 40) + '" y="24" width="50" height="38" rx="9"/><text class="fig-nt" x="' + (lx + lw + 65) + '" y="50" text-anchor="middle">' + total + '</text>';
  return '<svg class="fig" style="max-width:' + W * 1.1 + 'px" viewBox="-3 0 ' + (W + 3) + ' 100" role="img" aria-label="' + n + ' bags of ' + inside + ' marbles and ' + loose + ' loose marbles make ' + total + '">' + g + '</svg>';
}
// Bar of k equal parts worth val each (the letter's value is written on each part) and one known part c, with the total underneath.
function barFig(k, val, c, total, v, first) {
  const w = 54, cw = 48, W = k * w + cw, x0 = first ? cw : 0, cx = first ? 0 : k * w, tw = 54;
  let g = '';
  for (let i = 0; i < k; i++) g += '<rect class="fig-var" x="' + (x0 + i * w + 2) + '" y="2" width="' + (w - 4) + '" height="40" rx="8"/><text class="fig-vt" x="' + (x0 + i * w + w / 2) + '" y="29" text-anchor="middle">' + val + '</text>';
  g += '<rect class="fig-num" x="' + (cx + 2) + '" y="2" width="' + (cw - 4) + '" height="40" rx="8"/><text class="fig-nt" x="' + (cx + cw / 2) + '" y="29" text-anchor="middle">' + c + '</text>';
  return '<svg class="fig" style="max-width:' + (W + 92) * 1.1 + 'px" viewBox="0 0 ' + (W + 92) + ' 98" role="img" aria-label="' + k + ' equal parts of ' + val + ' and one part of ' + c + ' make ' + total + '">' + g +
    '<path class="fig-br" d="M4 48 V58 H' + (W - 4) + ' V48"/>' +
    '<rect class="fig-num" x="' + (W / 2 - tw / 2) + '" y="60" width="' + tw + '" height="36" rx="9"/><text class="fig-nt" x="' + W / 2 + '" y="85" text-anchor="middle">' + total + '</text>' +
    '<text class="fig-lab" x="' + (W + 12) + '" y="29"><tspan class="fig-v">' + v + '</tspan> = ' + val + '</text></svg>';
}
// t tickets at $12 and the $5 fee, with the total paid underneath. The count of tickets is the unknown.
function ticketFig(t, total) {
  const w = 58, cw = 48, T = t * w, W = T + cw;
  let g = '<path class="fig-br" d="M4 28 V18 H' + (T - 4) + ' V28"/><text class="fig-lab" x="' + T / 2 + '" y="12" text-anchor="middle"><tspan class="fig-v">t</tspan> = ' + t + ' tickets</text>' +
    '<text class="fig-cap" x="' + (T + cw / 2) + '" y="24" text-anchor="middle">fee</text>';
  for (let i = 0; i < t; i++) g += '<rect class="fig-num" x="' + (i * w + 2) + '" y="32" width="' + (w - 4) + '" height="40" rx="8"/><text class="fig-nt" x="' + (i * w + w / 2) + '" y="59" text-anchor="middle">$12</text>';
  g += '<rect class="fig-num" x="' + (T + 2) + '" y="32" width="' + (cw - 4) + '" height="40" rx="8"/><text class="fig-nt" x="' + (T + cw / 2) + '" y="59" text-anchor="middle">$5</text>' +
    '<path class="fig-br" d="M4 78 V88 H' + (W - 4) + ' V78"/>' +
    '<rect class="fig-num" x="' + (W / 2 - 33) + '" y="90" width="66" height="36" rx="9"/><text class="fig-nt" x="' + W / 2 + '" y="115" text-anchor="middle">$' + total + '</text>';
  return '<svg class="fig" style="max-width:' + Math.max(W, 250) * 1.15 + 'px" viewBox="' + Math.min(0, (W - 250) / 2) + ' 0 ' + Math.max(W, 250) + ' 128" role="img" aria-label="' + t + ' tickets at $12 each and the $5 fee make $' + total + '">' + g + '</svg>';
}
// The × 5 then + 2 machine: forwards along the top row, backwards with the inverse operations along the bottom row.
function flowFig(inp, mid, out) {
  const X = [112, 192, 272, 352, 432];
  const tile = (x, y, n, cls) => '<rect class="' + (cls === 'v' ? 'fig-var' : 'fig-num') + '" x="' + (x - 23) + '" y="' + (y - 20) + '" width="46" height="40" rx="9"/><text class="' + (cls === 'v' ? 'fig-vt' : 'fig-nt') + '" x="' + x + '" y="' + (y + 7) + '" text-anchor="middle">' + n + '</text>';
  const op = (x, y, t) => '<rect class="fig-op" x="' + (x - 30) + '" y="' + (y - 17) + '" width="60" height="34" rx="17"/><text class="fig-ot" x="' + x + '" y="' + (y + 7) + '" text-anchor="middle">' + t + '</text>';
  const arr = (a, b, y) => '<path class="fig-arr" d="M' + a + ' ' + y + ' H' + b + '"/><path class="fig-ah" d="M' + b + ' ' + y + ' l' + (b > a ? -7 : 7) + ' -5 v10 Z"/>';
  const row = (y, cap, o1, o2, fwd) => '<text class="fig-cap" x="78" y="' + (y + 5) + '" text-anchor="end">' + cap + '</text>' +
    tile(X[0], y, inp, 'v') + op(X[1], y, o1) + tile(X[2], y, mid) + op(X[3], y, o2) + tile(X[4], y, out) +
    [[X[0] + 26, X[1] - 33], [X[1] + 33, X[2] - 26], [X[2] + 26, X[3] - 33], [X[3] + 33, X[4] - 26]].map(p => fwd ? arr(p[0], p[1], y) : arr(p[1], p[0], y)).join('');
  return '<svg class="fig" style="max-width:31rem" viewBox="0 0 460 112" role="img" aria-label="Forwards: ' + inp + ' times 5 is ' + mid + ', plus 2 is ' + out + '. Backwards: ' + out + ' minus 2 is ' + mid + ', divided by 5 is ' + inp + '.">' +
    row(24, 'Forwards', '× 5', '+ 2', true) + row(86, 'Backwards', '÷ 5', '− 2', false) + '</svg>';
}
const workLines = rows => '<div class="wl">' + rows.map(r => '<span class="l' + (r[2] ? ' fin' : '') + '">' + r[0] + '</span><span' + (r[2] ? ' class="fin"' : '') + '>=</span><span class="r' + (r[2] ? ' fin' : '') + '">' + r[1] + '</span>').join('') + '</div>';
const sm = t => '<small>' + t + '</small>';

/* ---------- cards ---------- */

const cards = [

/* 1 */ {
  prompt: 'Find ' + mx('b') + '. Start by sharing each side into 3 equal groups.',
  sub: 'Three tickets plus a $2 booking fee cost $14: the same puzzle as this scale. The scale shows ' + mx('3b + 2 = 14') + '. ' + mx('3b') + ' means 3 × ' + mx('b') + ', three bags.',
  why: () => whyBox(stillBalance(xbags(3, 4), 2, 14, 0, mx('3 × 4 + 2') + sm(mx('b = 4') + ' in each bag'), mx('14') + sm('14 marbles')), [
    '2 of the 14 marbles balance the 2 loose ones. The other 14 − 2 = 12 balance the 3 bags.',
    'The bags are equal, so each holds 12 ÷ 3 = 4. Check: 3 × 4 + 2 = 14.']),
  build: solverCard({ v: 'b', nb: 3, loose: 2, right: 14, ans: 4, shareFirst: true },
    () => mx('b = 4') + '. Sharing first left 2 over on each side. Taking 2 off both sides gave ' + mx('3b = 12') + ', which shares into 3 groups of 4.')
},

/* 2 */ {
  prompt: 'You took 2 marbles off each side of ' + mx('3b + 2 = 14') + '. Which equation matches the scale now?',
  why: () => whyBox(stillBalance(xbags(3, 4), 0, 12, 3, mx('3 × 4') + sm(mx('b = 4') + ' in each bag'), mx('12') + sm('3 groups of 4')), [
    'Left side: ' + mx('3b + 2 − 2') + ' leaves ' + mx('3b') + '. Right side: 14 − 2 = 12.',
    'The same 2 came off both sides, so they still balance: ' + mx('3b = 12') + '.']),
  build(stage, ctl, ctx) {
    const sc = makeScale(stage);
    sc.update({ weight: 0 }, { weight: 0 });
    paintPans(stage, leftLoad(110, [{ tag: 'b' }, { tag: 'b' }, { tag: 'b' }], 0, 0), rightLoad(450, 12, 0, 0));
    sc.bar('3 bags', 'balanced', '12 marbles', true, true);
    const ch = makeChoices(ctl, [mx('3b = 12'), mx('3b + 2 = 12'), mx('3b = 14'), mx('b = 12')], ctx);
    const why = [
      '',
      'The ' + mx('+ 2') + ' was the 2 loose marbles. You took them off, so the ' + mx('+ 2') + ' has gone.',
      '2 marbles came off the right side as well. Count the marbles on the right now.',
      'There are still 3 bags on the left. The marbles on the right balance all 3 bags together, not just one bag.'
    ];
    return {
      check() { const s = ch.sel()[0]; if (s === 0) return true; ch.mark(s, 'bad'); return why[s]; },
      win: () => mx('3b = 12') + '. Taking 2 off both sides kept the scale level and removed the ' + mx('+ 2') + '. Only bags are left, so sharing works now.',
      won() { ch.mark(0, 'good'); ch.lock(); },
      solve() { ch.set([0]); }
    };
  }
},

/* 3 */ {
  prompt: 'Find ' + mx('b') + ' in ' + mx('2b + 5 = 17') + '.',
  sub: 'Use the buttons in whatever order you think works.',
  why: () => whyBox(stillBalance(xbags(2, 6), 5, 17, 0, mx('2 × 6 + 5') + sm(mx('b = 6') + ' in each bag'), mx('17') + sm('17 marbles')), [
    '5 of the 17 marbles balance the 5 loose ones. The other 17 − 5 = 12 balance the 2 bags.',
    'Each bag holds 12 ÷ 2 = 6. Sharing first fails because 5 and 17 don’t split into 2 equal groups.']),
  build: solverCard({ v: 'b', nb: 2, loose: 5, right: 17, ans: 6 },
    () => mx('b = 6') + '. Once the loose marbles are off both sides, ' + mx('2b = 12') + ' shares into 2 groups of 6.')
},

/* 4 */ {
  bridge: true,
  prompt: 'You found each solution in two moves: take off the loose marbles, then share. An equation that needs two moves is called a <b>two-step equation</b>.',
  sub: mx('3b + 2 = 14') + ' is a two-step equation. Its solution is 4, because 3 × 4 + 2 = 14.',
  show(stage) { stage.append(h(stillBalance(xbags(3, 4), 2, 14, 0, mx('3 × 4 + 2'), mx('14')))); }
},

/* 5 */ {
  prompt: 'Now solve ' + mx('3x + 7 = 19') + ' in two steps.',
  sub: 'Each button does the same thing to both sides and writes the new line.',
  why: () => whyBox(stillBalance(xbags(3, 4), 7, 19, 0, mx('3 × 4 + 7') + sm(mx('x = 4') + ' in each bag'), mx('19') + sm('19 marbles')), [
    'Subtracting 7 undoes the ' + mx('+ 7') + ': ' + mx('3x + 7 − 7 = 19 − 7') + ', so ' + mx('3x = 12') + '.',
    'Dividing by 3 undoes the × 3: ' + mx('3x ÷ 3 = 12 ÷ 3') + ', so ' + mx('x = 4') + '.']),
  build: solverCard({ v: 'x', nb: 3, loose: 7, right: 19, ans: 4, steps: true },
    () => mx('x = 4') + '. Subtracting 7 from both sides gave ' + mx('3x = 12') + '. Dividing both sides by 3 gave ' + mx('x = 4') + '. Each line you wrote matches the balance at that moment.')
},

/* 6 */ {
  prompt: 'Check ' + mx('x = 4') + ' in ' + mx('3x + 7 = 19') + '. With 4 in each bag, how many marbles are on the left side?',
  why: () => whyBox(matFig(3, 4, 7, 19), [
    'Put 4 in place of ' + mx('x') + ': ' + mx('3x + 7') + ' becomes 3 × 4 + 7 = 12 + 7 = 19.',
    'The right side of the equation is 19 too. Both sides match, so 4 is the solution.']),
  build(stage, ctl, ctx) {
    bagMat(stage, 3, 'x', 4, 7, mx('3x + 7') + '<small>with ' + mx('x = 4') + '</small>');
    const ans = makeAnswer(ctl, 'Marbles on the left', ctx);
    return {
      check() {
        const x = ans.value();
        if (x === 19) return true;
        ans.mark('bad');
        if (isNaN(x)) return 'Type a whole number, using digits only.';
        if (x === 12) return '12 is the marbles in the bags. Add the 7 loose ones.';
        if (x === 14) return mx('3x') + ' means 3 × ' + mx('x') + ': three bags of 4, not 3 + 4.';
        if (x === 33) return 'Only the bags hold 4 each. The 7 loose marbles are counted once: 4 + 4 + 4 + 7.';
        if (x === 11) return 'There are 3 bags, not 1. Count 4 + 4 + 4 + 7.';
        return 'Count it up: 4 + 4 + 4 + 7 = ?';
      },
      win: () => '3 × 4 + 7 = 19, the same as the right side, so ' + mx('x = 4') + ' is correct. Putting your answer back in to check it is called substitution.',
      won() { ans.mark('good'); ans.lock(); },
      solve() { ans.set(19); }
    };
  }
},

/* 7 */ {
  prompt: 'Tom solved ' + mx('2b + 5 = 17') + ' and got ' + mx('b = 12') + '. With 12 in each bag, how many marbles are on the left?',
  why: () => whyBox(matFig(2, 12, 5, 29), [
    'Substituting 12 gives 2 × 12 + 5 = 29. The right side is 17, so 12 is not the solution.',
    'Substituting 6 gives 2 × 6 + 5 = 17. Both sides match, so 6 is the solution.']),
  sub: 'Tom’s working: “Divide the ' + mx('2b') + ' by 2, so ' + mx('b + 5 = 17') + ', so ' + mx('b = 12') + '.”',
  build(stage, ctl, ctx) {
    bagMat(stage, 2, 'b', 12, 5, mx('2b + 5') + '<small>with ' + mx('b = 12') + '</small>');
    const ans = makeAnswer(ctl, 'Marbles on the left', ctx);
    return {
      check() {
        const x = ans.value();
        if (x === 29) return true;
        ans.mark('bad');
        if (isNaN(x)) return 'Type a whole number, using digits only.';
        if (x === 17) return '17 is what the left side should be if Tom is right. Work it out: 12 + 12 + 5.';
        if (x === 24) return '24 is the marbles in the two bags. Add the 5 loose marbles.';
        if (x === 19) return mx('2b') + ' means 2 × ' + mx('b') + ': two bags of 12, not 2 + 12.';
        if (x === 34) return 'Only the bags hold 12 each. The 5 loose marbles are counted once: 12 + 12 + 5.';
        return 'Count it up: two bags of 12 and 5 loose. 12 + 12 + 5 = ?';
      },
      win: () => '2 × 12 + 5 = 29, not 17, so Tom is wrong. He divided only the ' + mx('2b') + ' and left the 5 and the 17 alone. Take off the 5 first: ' + mx('2b = 12') + ', so ' + mx('b = 6') + '.',
      won() { ans.mark('good'); ans.lock(); },
      solve() { ans.set(29); }
    };
  }
},

/* 8 */ {
  prompt: 'This machine multiplies by 5, then adds 2. Out comes 37. What number went in?',
  why: () => whyBox(flowFig(7, 35, 37), [
    'The last thing the machine did was + 2, so the number before that was 37 − 2 = 35.',
    '35 is 5 times the number that went in, so it was 35 ÷ 5 = 7.']),
  build(stage, ctl, ctx) {
    stage.append(h('<div class="mach"><div class="m-slot"><span class="cap">in</span><span class="tile var still">?</span></div><div class="m-pipe"></div>' +
      '<div class="m-body sm"><span class="mop">× 5</span></div><div class="m-pipe"></div><div class="m-body sm"><span class="mop">+ 2</span></div><div class="m-pipe"></div>' +
      '<div class="m-slot"><span class="cap">out</span><span class="tile num still">37</span></div></div>'));
    const ans = makeAnswer(ctl, 'The number that went in', ctx);
    return {
      check() {
        const x = ans.value();
        if (x === 7) return true;
        ans.mark('bad');
        if (isNaN(x)) return 'Type a whole number using digits. If you got a decimal, you undid the × 5 first. Undo the + 2 first.';
        if (x === 35) return '35 is what came out of the × 5 part. Undo that too: 35 ÷ 5.';
        if (x === 39) return 'To undo + 2, subtract 2. You added it.';
        if (x === 175 || x === 183 || x === 185 || x === 195) return 'To undo × 5, divide by 5. You multiplied.';
        return 'Test it: ' + x + ' × 5 = ' + 5 * x + ', then + 2 gives ' + (5 * x + 2) + ', not 37.';
      },
      win: () => '37 − 2 = 35, then 35 ÷ 5 = 7. The machine did + 2 last, so you undo it first. It is the same order as the balance: take off the loose marbles, then share.',
      won() { ans.mark('good'); ans.lock(); },
      solve() { ans.set(7); },
      recap: () => 'Out came 37, so 7 went in: 37 − 2 = 35, then 35 ÷ 5 = 7.'
    };
  },
  then: {
    prompt: 'Same machine. This time 52 comes out. What number went in?',
    why: () => whyBox(flowFig(10, 50, 52), [
      'Before the + 2 the number was 52 − 2 = 50. Before the × 5 it was 50 ÷ 5 = 10.',
      'The machine has not changed, so the undoing has not changed: subtract 2, then divide by 5.']),
    build(stage, ctl, ctx) {
      stage.querySelectorAll('.m-slot .tile')[1].textContent = '52';
      const ans = makeAnswer(ctl, 'The number that went in', ctx);
      return {
        check() {
          const x = ans.value();
          if (x === 10) return true;
          ans.mark('bad');
          if (isNaN(x)) return 'Type a whole number using digits. If you got a decimal, you undid the × 5 first. Undo the + 2 first.';
          if (x === 50) return '50 is what came out of the × 5 part. Undo that too: 50 ÷ 5.';
          if (x === 54) return 'To undo + 2, subtract 2. You added it.';
          if (x === 250 || x === 260 || x === 270) return 'To undo × 5, divide by 5. You multiplied.';
          if (x === 7) return '7 went in when 37 came out. Now 52 comes out, so start from 52 and undo the + 2.';
          return 'Test it: ' + x + ' × 5 = ' + 5 * x + ', then + 2 gives ' + (5 * x + 2) + ', not 52.';
        },
        win: () => '52 − 2 = 50, then 50 ÷ 5 = 10. A different number came out, but you undo it the same way: subtract 2, then divide by 5.',
        won() { ans.mark('good'); ans.lock(); },
        solve() { ans.set(10); }
      };
    }
  }
},

/* 9 */ {
  bridge: true,
  prompt: 'You undid the + 2 with − 2 and the × 5 with ÷ 5. These are the <b>inverse operations</b>, used in reverse order: last done, first undone.',
  show(stage) { stage.append(h(flowFig(7, 35, 37))); }
},

/* 10 */ {
  prompt: 'No balance this time. Fill in the steps to solve ' + mx('4n + 3 = 23') + '.',
  why: () => whyBox(barFig(4, 5, 3, 23, 'n'), [
    mx('4n + 3') + ' is 4 equal parts and 3 more. Take the 3 off the total: 23 − 3 = 20.',
    'The 20 is the 4 equal parts together, so each part is 20 ÷ 4 = 5.']),
  build(stage, ctl, ctx) {
    const wk = makeWork(stage, [['', '4n + 3', 23], ['subtract 3 from both sides', '4n', null], ['divide both sides by 4', 'n', null]], ctx);
    return {
      check() {
        const [a, b] = wk.vals();
        if (isNaN(a) || isNaN(b)) { wk.mark(isNaN(a) ? 0 : 1, 'bad'); return 'Type whole numbers, using digits only.'; }
        if (a !== 20) {
          wk.mark(0, 'bad');
          if (a === 26) return 'You added 3. The equation has ' + mx('+ 3') + ', so subtract 3 from both sides: 23 − 3.';
          if (a === 23) return 'Take 3 off the right side too, or the sides no longer balance: 23 − 3.';
          return 'Subtract 3 from both sides: 23 − 3 = ?';
        }
        wk.mark(0, 'good');
        if (b === 5) return true;
        wk.mark(1, 'bad');
        if (b === 80) return 'To undo × 4, divide by 4. ' + mx('4n') + ' means 4 × ' + mx('n') + ', so ' + mx('n') + ' is 20 ÷ 4.';
        if (b === 16) return mx('4n') + ' means 4 × ' + mx('n') + ', not 4 + ' + mx('n') + '. Divide 20 by 4 instead of subtracting 4.';
        if (b === 20) return '20 is still ' + mx('4n') + ', all four together. Divide both sides by 4.';
        return 'Divide both sides by 4: 20 ÷ 4 = ?';
      },
      win: () => mx('4n = 20') + ', then ' + mx('n = 5') + '. These lines are the balance steps written down: take off the loose 3, then share into 4. Check: 4 × 5 + 3 = 23.',
      won() { wk.mark(0, 'good'); wk.mark(1, 'good'); wk.lock(); },
      solve() { wk.set(0, 20); wk.set(1, 5); },
      recap: () => mx('4n + 3 = 23') + ': subtract 3, then divide by 4, so ' + mx('n = 5') + '.'
    };
  },
  then: {
    prompt: 'Check ' + mx('n = 5') + '. Which line shows that 5 is the solution of ' + mx('4n + 3 = 23') + '?',
    reset: false,
    why: () => whyBox(workLines([[mx('4n + 3'), '23'], ['4 × 5 + 3', '23'], ['20 + 3', '23'], ['23', '23', true]]), [
      mx('4n') + ' means 4 × ' + mx('n') + ', so substituting 5 gives 4 × 5. Both sides come to 23, so 5 is the solution.']),
    build(stage, ctl, ctx) {
      const ch = makeChoices(ctl, [mx('45 + 3 = 48'), mx('4 + 5 + 3 = 12'), mx('4 × 5 + 3 = 23'), mx('4 × 23 + 3 = 95')], ctx);
      const why = [
        mx('4n') + ' means 4 × ' + mx('n') + ', not the digits 4 and 5 side by side. With 5 in place of ' + mx('n') + ', it is 4 × 5.',
        mx('4n') + ' means 4 × ' + mx('n') + ', not 4 + ' + mx('n') + '. With 5 in place of ' + mx('n') + ', it is 4 × 5.',
        '',
        'That puts 23 in place of ' + mx('n') + '. 23 is the right-hand side. The number to test is 5.'
      ];
      return {
        check() { const s = ch.sel()[0]; if (s === 2) return true; ch.mark(s, 'bad'); return why[s]; },
        win: () => 'Substituting 5 for ' + mx('n') + ' gives 4 × 5 + 3 = 23, and the right side is 23. Both sides match, so 5 is the solution.',
        won() { ch.mark(2, 'good'); ch.lock(); },
        solve() { ch.set([2]); }
      };
    }
  }
},

/* 11 */ {
  prompt: 'To solve ' + mx('5m + 4 = 39') + ', what should you do first?',
  why: () => whyBox(barFig(5, 7, 4, 39, 'm'), [
    'The 4 is added on after the 5 equal parts, so it comes off first: 39 − 4 = 35.',
    'Then the 35 splits into the 5 equal parts: 35 ÷ 5 = 7.']),
  build(stage, ctl, ctx) {
    stage.hidden = true;
    const ch = makeChoices(ctl, ['Divide both sides by 5', 'Subtract 4 from both sides', 'Divide the ' + mx('5m') + ' by 5', 'Subtract 5 from both sides'], ctx);
    const why = [
      'Dividing first means sharing the loose 4 into 5 groups as well. 4 ÷ 5 and 39 ÷ 5 aren’t whole numbers.',
      '',
      'That gives ' + mx('m + 4 = 39') + ', but only one part changed. The 4 and the 39 weren’t divided, so the sides no longer balance.',
      'The 5 in ' + mx('5m') + ' isn’t loose. ' + mx('5m') + ' means 5 × ' + mx('m') + ', five bags. Which part is loose?'
    ];
    return {
      check() { const s = ch.sel()[0]; if (s === 1) return true; ch.mark(s, 'bad'); return why[s]; },
      win: () => 'Subtract 4 first: ' + mx('5m = 35') + '. Then divide both sides by 5: ' + mx('m = 7') + '. Check: 5 × 7 + 4 = 39.',
      won() { ch.mark(1, 'good'); ch.lock(); },
      solve() { ch.set([1]); }
    };
  }
},

/* 12 */ {
  prompt: 'Solve this equation. What is ' + mx('k') + '?',
  sub: 'Write your steps on paper if you like. Type only the answer.',
  why: () => whyBox(barFig(6, 8, 5, 53, 'k'), [
    'Subtracting 5 undoes the ' + mx('+ 5') + ': 53 − 5 = 48, the 6 equal parts together.',
    'Dividing by 6 undoes the × 6: 48 ÷ 6 = 8 in each part.']),
  build: solveCard({ v: 'k', a: 6, c: 5, r: 53, ans: 8,
    win: () => 'Subtract 5 from both sides: ' + mx('6k = 48') + '. Divide both sides by 6: ' + mx('k = 8') + '. Check: 6 × 8 + 5 = 53.' })
},

/* 13 */ {
  prompt: 'The number is written first this time. What is ' + mx('p') + '?',
  why: () => whyBox(barFig(4, 6, 7, 31, 'p', true), [
    'Adding gives the same total in either order, so ' + mx('7 + 4p') + ' equals ' + mx('4p + 7') + '.',
    'Take off the 7: 31 − 7 = 24. Share into 4 equal parts: 24 ÷ 4 = 6.']),
  build: solveCard({ v: 'p', a: 4, c: 7, r: 31, ans: 6, first: true,
    win: () => 'The 7 is still the loose part, even written first. Subtract 7: ' + mx('4p = 24') + '. Divide by 4: ' + mx('p = 6') + '. Check: 7 + 4 × 6 = 31.' })
},

/* 14 */ {
  prompt: 'Concert tickets cost $12 each, plus a $5 booking fee per order. Kiri paid $41. How many tickets did Kiri buy?',
  sub: 'If ' + mx('t') + ' is the number of tickets, then ' + mx('12t + 5 = 41') + '.',
  why: () => whyBox(ticketFig(3, 41), [
    'The fee is paid once, so take it off first: $41 − $5 = $36 for the tickets.',
    'Each ticket is $12, and $36 ÷ $12 = 3 tickets.']),
  then: {
    prompt: 'Another order cost $65. How many tickets were in it?',
    sub: 'Same price and fee, so now ' + mx('12t + 5 = 65') + '.',
    why: () => whyBox(ticketFig(5, 65), [
      'Take off the fee: $65 − $5 = $60 for the tickets.',
      '$60 ÷ $12 = 5 tickets. Check: 5 × $12 + $5 = $65.']),
    build(stage, ctl, ctx) {
      stage.replaceChildren();
      return solveCard({ v: 't', a: 12, c: 5, r: 65, ans: 5,
        extra: x => x === 60 ? '$60 is what the tickets cost altogether, once the $5 fee is taken off. Each ticket costs $12.'
          : x === 70 ? 'The $5 fee is part of the $65, so take it off: subtract 5.'
          : x === 48 ? mx('12t') + ' means 12 × ' + mx('t') + '. Divide the $60 by 12 instead of subtracting 12.'
          : x === 3 ? '3 tickets was Kiri’s order: 3 × $12 + $5 = $41, not $65. Start from $65 this time.'
          : 'Test ' + mx('t = ' + x) + ': ' + x + ' tickets cost 12 × ' + x + ' = $' + 12 * x + ', plus the $5 fee makes $' + (12 * x + 5) + ', not $65.',
        win: () => 'Take off the $5 fee: ' + mx('12t = 60') + '. Divide by the $12 price: ' + mx('t = 5') + '. The total changed but the two steps did not. Check: 5 × $12 + $5 = $65.' })(stage, ctl, ctx);
    }
  },
  build: solveCard({ v: 't', a: 12, c: 5, r: 41, ans: 3,
    recap: () => 'Kiri paid $41: ' + mx('12t + 5 = 41') + ', so ' + mx('t = 3') + ' tickets.',
    extra: x => x === 36 ? '$36 is what the tickets cost altogether, once the $5 fee is taken off. Each ticket costs $12.'
      : x === 46 ? 'The $5 fee is part of the $41, so take it off: subtract 5.'
      : x === 24 ? mx('12t') + ' means 12 × ' + mx('t') + '. Divide the $36 by 12 instead of subtracting 12.'
      : 'Test ' + mx('t = ' + x) + ': ' + x + ' tickets cost 12 × ' + x + ' = $' + 12 * x + ', plus the $5 fee makes $' + (12 * x + 5) + ', not $41.',
    win: () => 'Take off the $5 fee: ' + mx('12t = 36') + '. Divide by the $12 price: ' + mx('t = 3') + '. Check: 3 × $12 + $5 = $41.' })
},

/* 15 */ {
  prompt: 'Three students solve ' + mx('5x + 3 = 28') + '. Who is right?',
  sub: 'Choose Agree or Disagree for each one.',
  why: () => whyBox(barFig(5, 5, 3, 28, 'x'), [
    'Substitution settles it. Priya’s 5: 5 × 5 + 3 = 28. Leo’s 25: 5 × 25 + 3 = 128.',
    'Zoe’s order fails because the 3 is not one of the 5 equal parts. Take it off first: 28 − 3 = 25, then 25 ÷ 5 = 5.']),
  build(stage, ctl, ctx) {
    stage.hidden = true;
    const claims = [
      { who: 'Leo', say: '“Divide the ' + mx('5x') + ' by 5: ' + mx('x + 3 = 28') + ', so ' + mx('x = 25') + '.”', agree: false, hint: 'Leo: substitute his answer into ' + mx('5x + 3 = 28') + '. Is it true?', why: 'Leo divided only one term. Test it: 5 × 25 + 3 = 128, not 28.' },
      { who: 'Priya', say: '“Subtract 3 from both sides: ' + mx('5x = 25') + '. Divide both sides by 5: ' + mx('x = 5') + '.”', agree: true, hint: 'Priya: did she do the same thing to both sides each time?', why: 'Check: 5 × 5 + 3 = 28.' },
      { who: 'Zoe', say: '“Divide both sides by 5 first. 28 ÷ 5 isn’t a whole number, so there’s no answer.”', agree: false, hint: 'Zoe: is dividing first the only way to start?', why: 'Dividing first was the wrong order, not proof there is no answer. Take off the 3 first and 25 shares into 5 evenly.' }
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
      win: () => 'Priya has it. Leo divided only one term, and Zoe divided before taking off the ' + mx('+ 3') + '. Undo the ' + mx('+ 3') + ' first, then divide both sides.',
      won() { locked = true; claims.forEach((c, i) => { rows[i].row.classList.remove('bad'); explain(i, 'good'); rows[i].btns.forEach(b => { b.disabled = true; }); }); },
      solve() { claims.forEach((c, i) => { pick[i] = c.agree; paint(i); }); }
    };
  }
}
];

const SECTIONS = [[0, 'Take off, then share'], [3, 'Steps and checks'], [8, 'Written steps'], [14, 'Wrap-up']];

// Finish screen: sets the prompt, sub-line and recap for this lesson.
function drawFinish() {
  promptEl.textContent = 'Undo the loose marbles first, then share.';
  subEl.hidden = false; subEl.innerHTML = 'Solving ' + mx('3b + 2 = 14') + ' takes two steps. Four things to remember:';
  ctl.replaceChildren(); stage.hidden = false;
  const mini = o => '<svg viewBox="-5 -10 76 83" aria-hidden="true">' + bagG(0, 0, o) + '</svg>';
  stage.replaceChildren(h('<ul class="recap">' +
    '<li><span class="art">' + mini({ tag: 'b' }) + SVG_MARBLE.replace('<svg', '<svg class="sm"').repeat(2) + '</span><span>Take the loose marbles off both sides first: ' + mx('3b + 2 = 14') + ' becomes ' + mx('3b = 12') + '.</span></li>' +
    '<li><span class="art">' + mini({ tag: 'b', inside: 4 }) + '</span><span>Then divide both sides by the number of bags: ' + mx('3b = 12') + ' becomes ' + mx('b = 4') + '.</span></li>' +
    '<li><span class="art"><span class="tile op still">÷</span></span><span>Dividing before taking off the loose number, or dividing only one term, breaks the balance.</span></li>' +
    '<li><span class="art"><span class="tile var still">b</span><span class="tile op still">=</span><span class="tile num still">4</span></span><span>Check by substitution: 3 × 4 + 2 = 14, so ' + mx('b = 4') + ' is right.</span></li></ul>'));
}
