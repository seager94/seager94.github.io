/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const h = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');

// "2b + 3" or "2(n + 3)" -> maths markup. Lone lower-case letters inside each token become variables.
function mx(s) {
  return '<span class="m">' + String(s).split(' ').map(t => /[a-z]/.test(t) && !/[a-z]{2}/.test(t) ? t.replace(/[a-z]/g, c => '<i class="v">' + c + '</i>') : t).join(' ') + '</span>';
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

// Tile expression builder. Tiles: numbers, one letter, + − × and brackets.
const tileKind = t => /^[a-z]$/.test(t) ? 'var' : /^\d+$/.test(t) ? 'num' : 'op';
const tileName = t => ({ '+': 'plus', '−': 'minus', '×': 'times', '(': 'open bracket', ')': 'close bracket' })[t] || t;
// Value of the tiles when letter v = val, or null if they don't make a complete expression.
// × is done before + and −; brackets first; a letter or bracket straight after a number, letter or bracket multiplies (2n, 2(n + 3)).
function evalToks(toks, v, val) {
  let i = 0;
  function factor() {
    const t = toks[i];
    if (t === '(') { i++; const x = expr(); if (x == null || toks[i] !== ')') return null; i++; return x; }
    if (t === v) { i++; return val; }
    if (/^\d+$/.test(t || '')) { i++; return +t; }
    return null;
  }
  function term() {
    let x = factor();
    while (x != null) {
      if (toks[i] === '×') { i++; const y = factor(); x = y == null ? null : x * y; }
      else if (toks[i] === v || toks[i] === '(') { const y = factor(); x = y == null ? null : x * y; }
      else break;
    }
    return x;
  }
  function expr() {
    let x = term();
    while (x != null && (toks[i] === '+' || toks[i] === '−')) {
      const op = toks[i++], y = term();
      x = y == null ? null : op === '+' ? x + y : x - y;
    }
    return x;
  }
  const r = expr();
  return r == null || i !== toks.length ? null : r;
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
const INCOMPLETE = 'That isn’t a complete expression yet. Every sign needs a number or letter on each side, brackets come in pairs, and a number written after a bracket needs a sign in front of it.';
// Tokens -> display string: ['2','×','(','n','+','3',')'] -> "2 × (n + 3)", ['2','n'] -> "2n".
const show = t => t.join(' ').replace(/\( /g, '(').replace(/ \)/g, ')').replace(/(\d) (?=[a-z(])/g, '$1');
const bagIt = o => '<div class="it bagit">' + svgBag(o || { tag: 'b' }) + '</div>';
const marbles = n => '<div class="mbs">' + ('<div class="it mbit">' + SVG_MARBLE + '</div>').repeat(n) + '</div>';
const matOf = (nb, nl) => h('<div class="mat">' + bagIt().repeat(nb) + (nl ? marbles(nl) : '') + '</div>');
const steps = arr => '<div class="steps">' + arr.map(s => '<span class="step">' + s + '</span>').join('<span class="arr" aria-hidden="true">→</span>') + '</div>';
const receipt = last => '<div class="receipt"><div><span>' + mx('n') + ' movie tickets</span><span>$12 each</span></div>' +
  '<div><span>Booking fee</span><span>$5 per order</span></div><div class="tot"><span>Total</span><span>' + last + '</span></div></div>';

// Number line 0 to 10 with n = 8 marked. done = true adds the jump down 5 to 3.
const NX = k => 30 + k * 46;
function nlineInner(done) {
  let s = '<line class="nl-ax" x1="14" y1="60" x2="506" y2="60"/>';
  for (let k = 0; k <= 10; k++) {
    s += '<line class="nl-ax" x1="' + NX(k) + '" y1="53" x2="' + NX(k) + '" y2="67"/>';
    s += k === 8 ? '<text class="nl-l" x="' + NX(8) + '" y="90"><tspan font-style="italic">n</tspan> = 8</text>' : '<text class="nl-t" x="' + NX(k) + '" y="90">' + k + '</text>';
  }
  if (done) {
    s += '<line class="nl-dash" x1="' + NX(8) + '" y1="52" x2="' + NX(8) + '" y2="32"/><line class="nl-dash" x1="' + NX(3) + '" y1="52" x2="' + NX(3) + '" y2="32"/>' +
      '<path class="nl-arr" d="M' + NX(8) + ' 32 H' + (NX(3) + 2) + ' M' + (NX(3) + 12) + ' 25 L' + (NX(3) + 2) + ' 32 L' + (NX(3) + 12) + ' 39"/>' +
      '<text class="nl-t" x="' + (NX(3) + NX(8)) / 2 + '" y="22">down 5</text><circle class="nl-go" cx="' + NX(3) + '" cy="60" r="8"/>';
  }
  return s + '<circle class="nl-n" cx="' + NX(8) + '" cy="60" r="8"/>';
}
const NLINE_DONE = '<svg class="nline" viewBox="0 0 520 100" role="img" aria-label="Number line: start at n = 8 and go down 5 to reach 3">' + nlineInner(true) + '</svg>';

/* ---------- Why? panels: the card's picture, still, with the values written in ---------- */
const whyBox = (pic, lines) => '<div class="wy">' + pic + '<div class="wy-w">' + lines.map(l => '<p>' + l + '</p>').join('') + '</div></div>';
// nb see-through bags with `inside` marbles each, then nl loose marbles. The value is written under each object.
// o: bagLabel, looseLabel (SVG text content), fade (loose marbles drawn faint), alt.
function whyMat(nb, inside, nl, o) {
  o = o || {};
  const gap = nb && nl ? 18 : 0, lw = Math.max(nl * 22, nl ? (o.looseW || 0) : 0), W = nb * 70 + gap + lw + 20;
  let x = 10, s = '';
  for (let k = 0; k < nb; k++) {
    s += bagG(x + 4, 0, { inside }) + '<text class="wy-l" x="' + (x + 35) + '" y="89">' + (o.bagLabel || '<tspan class="v">b</tspan> = ' + inside) + '</text>';
    x += 70;
  }
  x += gap;
  const x0 = x + (lw - nl * 22) / 2;
  for (let k = 0; k < nl; k++) s += marbleG(x0 + 11 + k * 22, 58, 9, o.fade ? 'wy-fade' : '');
  if (nl) s += '<text class="wy-l" x="' + (x + lw / 2) + '" y="89">' + (o.looseLabel || nl) + '</text>';
  return '<svg class="wy-pic" viewBox="0 0 ' + W + ' 96" style="max-width:' + Math.round(W * 1.45) + 'px" role="img" aria-label="' + o.alt + '">' + s + '</svg>';
}
// Small table: rows of [label, cells...]. The first row holds the values of the letter.
const whyTable = (rows, plain) => '<table class="wy-t">' + rows.map((r, i) => '<tr><th>' + r[0] + '</th>' + r.slice(1).map(c => '<td' + (i || plain ? '' : ' class="nv"') + '>' + c + '</td>').join('') + '</tr>').join('') + '</table>';
const whyReceipt = (n, total) => '<div class="receipt"><div><span>' + n + ' movie tickets</span><span>' + n + ' × $12 = $' + 12 * n + '</span></div>' +
  '<div><span>Booking fee</span><span>$5</span></div><div class="tot"><span>Total</span><span>$' + total + '</span></div></div>';

// A tile-builder card, marked by evaluating at several values so any equivalent form is accepted.
// cfg: v (letter), tiles, f (target rule), ans (tokens for Show me), pic(stage), noVar,
// wrong: [[rule, feedback]] for anticipated errors, test(k, want, got) for anything else,
// std (usual written form), win(expression, true if it is already written the usual way),
// recap() (two-part cards: the line that part 1 shrinks to).
function tileCard(cfg) {
  return function (stage, ctl, ctx) {
    if (cfg.pic) cfg.pic(stage);
    const bd = makeBuilder(stage, ctl, cfg.tiles, ctx);
    const at = (t, k) => evalToks(t, cfg.v, k);
    const eq = (t, f) => [2, 5, 11].every(k => at(t, k) === f(k));
    return {
      check() {
        const t = bd.toks();
        if (at(t, 5) == null) return INCOMPLETE;
        if (eq(t, cfg.f)) return true;
        if (!t.includes(cfg.v)) return cfg.noVar;
        const hit = cfg.wrong.find(w => eq(t, w[0]));
        if (hit) return hit[1];
        const k = [5, 2, 11].find(k => at(t, k) !== cfg.f(k));
        return cfg.test(k, cfg.f(k), at(t, k));
      },
      win: () => cfg.win(mx(show(bd.toks())), show(bd.toks()) === cfg.std),
      won() { bd.lock(); },
      solve() { bd.set(cfg.ans); },
      recap: cfg.recap
    };
  };
}

const cards = [

/* 1 */ {
  prompt: 'Each bag holds ' + mx('b') + ' marbles. Build an expression for the number of marbles on the mat.',
  sub: 'A sealed bag hides its marbles, so how can you write the total without opening it? Drag tiles into the box, or tap them. Tap a tile in the box to take it out.',
  why: () => whyBox(whyMat(1, 4, 3, { alt: 'A see-through bag holding 4 marbles, and 3 loose marbles' }), [
    'If ' + mx('b = 4') + ', the mat holds 4 + 3 = 7 marbles. If ' + mx('b = 10') + ', it holds 10 + 3 = 13.',
    'Whatever is in the bag, you add the 3 loose marbles: ' + mx('b + 3') + '.'
  ]),
  build: tileCard({
    v: 'b', tiles: ['b', '+', '×', '1', '2', '3'], f: b => b + 3, ans: ['b', '+', '3'],
    pic: stage => stage.append(matOf(1, 3)),
    noVar: 'Your expression has no ' + mx('b') + ', so it leaves out the marbles hidden in the bag.',
    wrong: [
      [b => 3 * b, mx('3 × b') + ' would be 3 bags. The mat has 1 bag and 3 loose marbles.'],
      [b => b, 'That counts the marbles in the bag. Add the 3 loose marbles too.']
    ],
    test: (k, want, got) => 'Test it with ' + mx('b = ' + k) + '. The mat would hold ' + k + ' + 3 = ' + want + ' marbles, but your expression gives ' + got + '.',
    win: e => e + ' gives the total for any ' + mx('b') + '. You don’t know ' + mx('b') + ' yet, but the expression says how to get the total once you do. It is a recipe for a number.'
  })
},

/* 2 */ {
  prompt: 'Now there are 3 bags and no loose marbles. Build an expression for the total.',
  sub: 'Each bag still holds ' + mx('b') + ' marbles.',
  build: tileCard({
    v: 'b', tiles: ['b', '+', '×', '1', '3'], f: b => 3 * b, ans: ['b', '+', 'b', '+', 'b'],
    pic: stage => stage.append(matOf(3, 0)),
    noVar: 'Your expression has no ' + mx('b') + '. All the marbles are inside the bags, so you need ' + mx('b') + '.',
    wrong: [
      [b => b + 3, mx('b + 3') + ' is 1 bag and 3 loose marbles. Here the 3 counts bags, and each bag holds ' + mx('b') + '.'],
      [b => b, mx('b') + ' is the marbles in one bag. There are 3 bags.']
    ],
    test: (k, want, got) => 'Test it with ' + mx('b = ' + k) + '. Three bags hold ' + k + ' + ' + k + ' + ' + k + ' = ' + want + ' marbles, but your expression gives ' + got + '.',
    win: e => e + ' works. Three bags make 3 lots of ' + mx('b') + ', which is ' + mx('3 × b') + '. We write it ' + mx('3b') + ': the number goes first and the × sign is left out.',
    recap: () => '3 bags hold ' + mx('3b') + ' marbles.'
  }),
  why: () => whyBox(whyMat(3, 4, 0, { alt: 'Three see-through bags holding 4 marbles each' }), [
    'If ' + mx('b = 4') + ', the bags hold 4 + 4 + 4 = 3 × 4 = 12 marbles.',
    'For any ' + mx('b') + ': ' + mx('b + b + b = 3 × b = 3b') + '.'
  ]),
  then: {
    prompt: 'One more bag goes on the mat. Which expression gives the total now?',
    sub: 'Every bag holds ' + mx('b') + ' marbles.',
    why: () => whyBox(whyMat(4, 5, 0, { alt: 'Four see-through bags holding 5 marbles each' }), [
      'If ' + mx('b = 5') + ', the bags hold 5 + 5 + 5 + 5 = 4 × 5 = 20 marbles.',
      '3 bags and 1 more bag make 4 bags: ' + mx('b + b + b + b = 4b') + '.'
    ]),
    build(stage, ctl, ctx) {
      const strip = $('.strip', stage); if (strip) strip.remove();
      $('.mat', stage).append(h('<div class="it bagit pop">' + svgBag({ tag: 'b' }) + '</div>'));
      const ch = makeChoices(ctl, [mx('3b + 1'), mx('4b'), mx('b + 4'), mx('3b + 4')], ctx);
      const fbk = [
        mx('3b + 1') + ' adds 1 loose marble. The new thing on the mat is a bag, and it holds ' + mx('b') + ' marbles.',
        '',
        mx('b + 4') + ' is 1 bag and 4 loose marbles. Here the 4 counts bags, and each bag holds ' + mx('b') + '.',
        mx('3b + 4') + ' adds 4 loose marbles to the 3 bags. No loose marbles went on the mat, only one more bag.'
      ];
      return {
        check() { const s = ch.sel()[0]; if (s === 1) return true; ch.mark(s, 'bad'); return fbk[s]; },
        win: () => mx('4b') + '. The number in front of ' + mx('b') + ' counts the bags. Add a bag and it goes up by one.',
        won() { ch.mark(1, 'good'); ch.lock(); },
        solve() { ch.set([1]); }
      };
    }
  }
},

/* 3 */ {
  prompt: 'The mat holds ' + mx('3b + 2') + ' marbles. Set ' + mx('b') + ' so it holds 17.',
  sub: 'The bags are see-through. Watch the total as you drag.',
  why: () => whyBox(whyMat(3, 5, 2, { alt: 'Three see-through bags holding 5 marbles each, and 2 loose marbles' }), [
    'Take away the 2 loose marbles: 17 − 2 = 15 marbles are in the bags.',
    '15 marbles shared between 3 bags is 5 in each, so ' + mx('b = 5') + '.'
  ]),
  build(stage, ctl, ctx) {
    let b = 2;
    const mat = h('<div class="mat"></div>'), live = h('<div class="live"></div>');
    stage.append(mat, live);
    function draw() {
      mat.innerHTML = bagIt({ tag: 'b', inside: b }).repeat(3) + marbles(2);
      live.innerHTML = mx('3b + 2') + '<small>3 × ' + b + ' + 2 = <b>' + (3 * b + 2) + '</b> marbles</small>';
    }
    const sl = makeSlider(ctl, 'b', 1, 8, b, v => { b = v; draw(); ctx.touch(true); });
    draw();
    return {
      check() {
        const t = 3 * b + 2;
        return t === 17 ? true : 'When ' + mx('b') + ' is ' + b + ', the mat holds 3 × ' + b + ' + 2 = ' + t + ' marbles. You need 17, so make ' + mx('b') + ' ' + (t < 17 ? 'bigger' : 'smaller') + '.';
      },
      win: () => mx('b = 5') + ', because 3 × 5 + 2 = 17. The recipe ' + mx('3b + 2') + ' never changed. Give it a value of ' + mx('b') + ' and it gives back a number of marbles.',
      solve() { sl.set(5); }
    };
  }
},

/* 4 */ {
  bridge: true,
  prompt: 'What you just built, like ' + mx('3b + 2') + ', is called an <b>expression</b>.',
  sub: 'It uses numbers, a letter and operations to say how to get a total. Give ' + mx('b') + ' a value and the expression gives a number.',
  show(stage) { stage.append(matOf(3, 2), h('<div class="live">' + mx('3b + 2') + '</div>')); }
},

/* 5 */ {
  prompt: 'Build an expression for the number of marbles in this picture.',
  sub: 'Each bag holds ' + mx('b') + ' marbles.',
  why: () => whyBox(whyMat(2, 3, 5, { alt: 'Two see-through bags holding 3 marbles each, and 5 loose marbles' }), [
    'If ' + mx('b = 3') + ', the picture shows 3 + 3 + 5 = 2 × 3 + 5 = 11 marbles.',
    'For any ' + mx('b') + ': ' + mx('b + b + 5 = 2b + 5') + '.'
  ]),
  then: {
    prompt: 'Now you find out that each bag holds 6 marbles. How many marbles are in the picture?',
    sub: 'Use your expression. Swap ' + mx('b') + ' for 6.',
    why: () => whyBox(whyMat(2, 6, 5, { alt: 'Two see-through bags holding 6 marbles each, and 5 loose marbles' }), [
      mx('2b + 5') + ' with ' + mx('b = 6') + ' is 2 × 6 + 5 = 12 + 5 = 17.',
      'Count to check: 6 + 6 + 5 = 17 marbles.'
    ]),
    build(stage, ctl, ctx) {
      stage.append(h('<div class="note">' + mx('b = 6') + '</div>'));
      const ans = makeAnswer(ctl, 'Number of marbles', ctx);
      const fbk = {
        13: '13 is 6 + 2 + 5. The 2 counts bags, so it means 2 lots of 6.',
        11: '11 is one bag of 6 and the 5 loose marbles. There are 2 bags.',
        12: '12 is the marbles in the 2 bags. Add the 5 loose marbles.',
        31: mx('2b') + ' means 2 × ' + mx('b') + '. It doesn’t mean writing 6 after the 2 to make 26.',
        32: '32 is 5 × 6 + 2. The numbers have swapped: there are 2 bags of 6, plus 5 loose marbles.',
        42: '42 is 7 × 6, which would be 7 bags. Only the 2 bags hold 6 each. The 5 marbles are loose.'
      };
      return {
        check() {
          const v = ans.value();
          if (v === 17) return true;
          ans.mark('bad');
          if (isNaN(v)) return 'Type a whole number, using digits only.';
          return fbk[v] || 'Swap ' + mx('b') + ' for 6: 2 × 6 + 5. Multiply first, then add.';
        },
        win: () => '17 marbles. Once you know ' + mx('b') + ', the expression turns into a number: 2 × 6 + 5 = 17.',
        won() { ans.mark('good'); ans.lock(); },
        solve() { ans.set(17); }
      };
    }
  },
  build: tileCard({
    recap: () => 'The picture holds ' + mx('2b + 5') + ' marbles.',
    v: 'b', tiles: ['b', '+', '×', '2', '5', '7'], f: b => 2 * b + 5, ans: ['2', '×', 'b', '+', '5'],
    pic: stage => stage.append(matOf(2, 5)),
    noVar: 'Your expression has no ' + mx('b') + ', so it leaves out the marbles inside the bags.',
    wrong: [
      [b => 7 * b, mx('7 × b') + ' would be 7 bags. Only the 2 bags hold ' + mx('b') + ' marbles each. The 5 marbles are loose.'],
      [b => b + 7, 'The 2 counts bags, not marbles. Two bags hold ' + mx('b + b') + ', which is ' + mx('2 × b') + '.'],
      [b => b + 5, 'That is one bag and 5 loose marbles. There are 2 bags.'],
      [b => 2 * b, 'That counts the marbles in the bags. Add the 5 loose marbles.'],
      [b => 5 * b + 2, 'The numbers have swapped. There are 2 bags and 5 loose marbles, so it is 2 lots of ' + mx('b') + ', plus 5.']
    ],
    test: (k, want, got) => 'Test it with ' + mx('b = ' + k) + '. The picture shows ' + k + ' + ' + k + ' + 5 = ' + want + ' marbles, but your expression gives ' + got + '.',
    std: '2b + 5',
    win: (e, std) => e + ' matches the picture' + (std ? ': ' : '. Most people write it ' + mx('2b + 5') + ': ') + '2 lots of ' + mx('b') + ', plus 5.'
  })
},

/* 6 */ {
  prompt: 'A bag held ' + mx('b') + ' marbles. Then 2 were taken out. Build an expression for the marbles left in the bag.',
  why: () => whyBox(whyMat(1, 6, 2, { bagLabel: '6 left', looseLabel: '2 taken out', looseW: 84, fade: true, alt: 'A see-through bag with 6 marbles left in it, and 2 marbles taken out' }), [
    'If the bag held ' + mx('b = 8') + ' marbles, then 8 − 2 = 6 are left.',
    'For any ' + mx('b') + ', start with ' + mx('b') + ' and take 2 away: ' + mx('b − 2') + '.'
  ]),
  build: tileCard({
    v: 'b', tiles: ['b', '+', '−', '2'], f: b => b - 2, ans: ['b', '−', '2'],
    pic: stage => stage.append(h('<div class="mat">' + bagIt() + '<div class="gone">' + marbles(2) + '<span class="gone-l">taken out</span></div></div>')),
    noVar: 'Your expression has no ' + mx('b') + '. The number left depends on how many were in the bag to start with.',
    wrong: [
      [b => 2 - b, mx('2 − b') + ' starts with 2 and takes ' + mx('b') + ' away. Try ' + mx('b = 8') + ': the bag had 8 and 2 came out, so 6 are left. But 2 − 8 goes below zero.'],
      [b => b + 2, 'The 2 marbles left the bag, so there are fewer than ' + mx('b') + ' now, not more.'],
      [b => b, mx('b') + ' is what the bag held at the start. 2 have been taken out since.']
    ],
    test: (k, want, got) => 'Test it with ' + mx('b = ' + k) + '. The bag had ' + k + ' and 2 came out, so ' + want + ' are left. Your expression gives ' + got + '.',
    win: e => e + '. Start with ' + mx('b') + ', then take 2 away. Order matters with subtraction: ' + mx('2 − b') + ' would mean starting with 2.'
  })
},

/* 7 */ {
  prompt: 'Think of a number. Add 5. Build an expression for the result.',
  sub: 'Call the number you thought of ' + mx('n') + '.',
  why: () => whyBox(steps([mx('n = 4'), '4 + 5 = 9']), [
    'Think of 4 and you get 9. Think of 10 and you get 10 + 5 = 15.',
    'The result is always 5 more than ' + mx('n') + ', so it is ' + mx('n + 5') + '.'
  ]),
  build: tileCard({
    v: 'n', tiles: ['n', '+', '−', '×', '2', '3', '5'], f: n => n + 5, ans: ['n', '+', '5'],
    pic: stage => stage.append(h(steps(['Think of a number ' + mx('n'), 'Add 5']))),
    noVar: 'Your expression has no ' + mx('n') + '. The result depends on the number you thought of, so ' + mx('n') + ' must be in it.',
    wrong: [
      [n => 5 * n, mx('5 × n') + ' multiplies by 5. The story says add 5.'],
      [n => n - 5, 'That takes 5 away. The story says add 5.'],
      [n => n, mx('n') + ' is the number you thought of. You still need to add 5.']
    ],
    test: (k, want, got) => 'Test it: think of ' + k + '. Add 5 and you get ' + want + ', but your expression gives ' + got + '.',
    win: e => e + '. The expression writes the steps of the story in symbols. Adding works in either order, so ' + mx('n + 5') + ' and ' + mx('5 + n') + ' are the same.'
  })
},

/* 8 */ {
  prompt: 'Think of a number. Double it, then add 3. Build an expression for the result.',
  sub: 'Call the number ' + mx('n') + ' again.',
  why: () => whyBox(steps([mx('n = 4'), '2 × 4 = 8', '8 + 3 = 11']), [
    'Swap the 4 back for ' + mx('n') + ': doubling gives ' + mx('2 × n') + ', then adding 3 gives ' + mx('2 × n + 3') + '.',
    'Check with 4: ' + mx('2n + 3') + ' is 2 × 4 + 3 = 11, the same as the story.'
  ]),
  build: tileCard({
    v: 'n', tiles: ['n', '+', '−', '×', '2', '3'], f: n => 2 * n + 3, ans: ['2', '×', 'n', '+', '3'],
    pic: stage => stage.append(h(steps(['Think of a number ' + mx('n'), 'Double it', 'Add 3']))),
    noVar: 'Your expression has no ' + mx('n') + '. The result depends on the number you thought of.',
    wrong: [
      [n => n + 5, 'Double means multiply by 2, not add 2. Doubling 4 gives 8, but 4 + 2 is 6.'],
      [n => n + 6, 'That doubles the 3. Double the number first, then add 3.'],
      [n => 2 * n, 'That doubles the number. Now add 3.'],
      [n => n + 3, 'That adds 3 but never doubles the number.'],
      [n => 3 * n + 2, 'The 2 and 3 have swapped. Double means × 2, then add 3.']
    ],
    test: (k, want, got) => 'Test it: think of ' + k + '. Double it to get ' + 2 * k + ', then add 3 to get ' + want + '. Your expression gives ' + got + '.',
    std: '2n + 3',
    win: (e, std) => e + '.' + (std ? '' : ' We write it ' + mx('2n + 3') + '.') + ' Multiplying is done before adding, so ' + mx('2n + 3') + ' means double first, then add 3, just like the story.'
  })
},

/* 9 */ {
  prompt: 'Same steps, different order. How do the two results compare?',
  sub: 'Drag the slider to try different starting numbers.',
  why: () => whyBox(whyTable([[mx('n'), 1, 4, 10], ['Double, then add 3', 5, 11, 23], ['Add 3, then double', 8, 14, 26], ['Gap', 3, 3, 3]]), [
    'With ' + mx('n = 4') + ': 2 × 4 + 3 = 8 + 3, but 2 × (4 + 3) = 8 + 6.',
    'Both double the number. One adds 3 and the other adds 6, so the gap is always 3.'
  ]),
  build(stage, ctl, ctx) {
    let n = 4;
    const box = h('<div class="chains"></div>');
    stage.append(box);
    const row = (label, mid, end) => '<div class="chain"><span>' + label + '</span><span class="flow"><span class="nv">' + n + '</span> → ' + mid + ' → <b>' + end + '</b></span></div>';
    function draw() { box.innerHTML = row('Double, then add 3', 2 * n, 2 * n + 3) + row('Add 3, then double', n + 3, 2 * (n + 3)); }
    makeSlider(ctl, 'n', 1, 10, n, v => { n = v; draw(); });
    draw();
    const ch = makeChoices(ctl, ['They always give the same result', '“Add 3, then double” is always 3 more', '“Add 3, then double” is always 6 more', 'The gap changes when ' + mx('n') + ' changes'], ctx);
    const why = [
      'With ' + mx('n = 4') + ', one order gives 11 and the other gives 14. Same steps, different order, different results.',
      '',
      'Find the gap: with ' + mx('n = 4') + ' the results are 11 and 14. Work out the gap, then try a few more values. Is it 6?',
      'Move the slider and work out the gap between the two results each time. Does the gap ever change?'
    ];
    return {
      check() { const s = ch.sel()[0]; if (s === 1) return true; ch.mark(s, 'bad'); return why[s]; },
      win: () => '“Add 3, then double” is always 3 more. In that order the 3 gets doubled too, so 6 is added instead of 3. The order of the steps changes the result, so an expression has to show the order.',
      won() { ch.mark(1, 'good'); ch.lock(); },
      solve() { ch.set([1]); }
    };
  }
},

/* 10 */ {
  prompt: 'Think of a number. Add 3, then double. Build an expression for the result.',
  sub: 'This time you also have bracket tiles.',
  why: () => whyBox(steps([mx('n = 4'), '4 + 3 = 7', '7 × 2 = 14']), [
    'The whole of ' + mx('n + 3') + ' is doubled, so it goes in brackets: ' + mx('2 × (n + 3)') + '.',
    'Check with 4: 2 × (4 + 3) = 2 × 7 = 14, the same as the story.'
  ]),
  then: {
    prompt: 'Check your expression with a number. When ' + mx('n = 5') + ', what does it give?',
    why: () => whyBox(steps([mx('n = 5'), '5 + 3 = 8', '8 × 2 = 16']), [
      mx('2(n + 3)') + ' with ' + mx('n = 5') + ': brackets first, 5 + 3 = 8. Then 2 × 8 = 16.',
      'Without brackets: 5 + 3 × 2 = 5 + 6 = 11, not what the story gives.'
    ]),
    build(stage, ctl, ctx) {
      stage.append(h('<div class="note">' + mx('n = 5') + '</div>'));
      const ans = makeAnswer(ctl, 'Result', ctx);
      const fbk = {
        11: '11 is 5 + 3 × 2 with the × done first. The brackets say add first: 5 + 3 = 8, then double.',
        13: '13 is double 5, then add 3. That is the other order. Here you add 3 first, then double.',
        8: '8 is 5 + 3. Now double it.',
        10: '10 is double 5. Add the 3 before you double.'
      };
      return {
        check() {
          const v = ans.value();
          if (v === 16) return true;
          ans.mark('bad');
          if (isNaN(v)) return 'Type a whole number, using digits only.';
          return fbk[v] || 'Swap ' + mx('n') + ' for 5: 2 × (5 + 3). Work out the brackets first, then double.';
        },
        win: () => '16. The story agrees: think of 5, add 3 to get 8, then double to get 16. Testing with a number is a quick way to check an expression.',
        won() { ans.mark('good'); ans.lock(); },
        solve() { ans.set(16); }
      };
    }
  },
  build: tileCard({
    recap: () => '“Add 3, then double” is ' + mx('2(n + 3)') + '.',
    v: 'n', tiles: ['n', '+', '×', '2', '3', '(', ')'], f: n => 2 * (n + 3), ans: ['2', '×', '(', 'n', '+', '3', ')'],
    pic: stage => stage.append(h(steps(['Think of a number ' + mx('n'), 'Add 3', 'Double it']))),
    noVar: 'Your expression has no ' + mx('n') + '. The result depends on the number you thought of.',
    wrong: [
      [n => n + 6, 'Your expression doubles only the 3. Writing ' + mx('n + 3 × 2') + ' in the order you hear it doesn’t work, because × is done before +. Test ' + mx('n = 4') + ': the story gives 4 + 3 = 7, then 7 × 2 = 14, but 4 + 3 × 2 = 10. Use brackets so the adding happens first.'],
      [n => 2 * n + 3, 'That is “double, then add 3”, the other order. Here the adding comes first, so put brackets round ' + mx('n + 3') + '.'],
      [n => 2 * n, 'That doubles the number but leaves out the 3.'],
      [n => n + 3, 'That adds 3 but never doubles.']
    ],
    test: (k, want, got) => 'Test it: think of ' + k + '. Add 3 to get ' + (k + 3) + ', then double to get ' + want + '. Your expression gives ' + got + '.',
    std: '2(n + 3)',
    win: (e, std) => e + '. Brackets say “do this first”.' + (std ? '' : ' We usually write it ' + mx('2(n + 3)') + '.') + ' Writing the steps in the order you hear them, ' + mx('n + 3 × 2') + ', gives a different recipe.'
  })
},

/* 11 */ {
  bridge: true,
  prompt: 'The order of the steps changed the result. <b>Brackets</b> show which step comes first.',
  sub: mx('2n + 3') + ' doubles, then adds 3. ' + mx('2(n + 3)') + ' adds 3 first, then doubles.',
  show(stage) { stage.append(h(steps(['Think of a number ' + mx('n'), 'Add 3', 'Double it'])), h('<div class="live">' + mx('2(n + 3)') + '</div>')); }
},

/* 12 */ {
  prompt: 'Which expression means “5 less than ' + mx('n') + '”?',
  sub: 'Test each one with ' + mx('n = 8') + '. What is 5 less than 8?',
  why: () => whyBox(NLINE_DONE, [
    'Start at 8 and go down 5: 8 − 5 = 3. Swap the 8 back for ' + mx('n') + ' and you have ' + mx('n − 5') + '.',
    '5 − 8 would start at 5 and go down 8, past zero.'
  ]),
  build(stage, ctl, ctx) {
    const nl = h('<svg class="nline" viewBox="0 0 520 100" role="img" aria-label="Number line from 0 to 10 with n = 8 marked"></svg>');
    stage.append(nl);
    function draw(done) {
      if (done) nl.setAttribute('aria-label', 'Number line: start at n = 8 and go down 5 to reach 3');
      nl.innerHTML = nlineInner(done);
    }
    draw(false);
    const ch = makeChoices(ctl, [mx('n − 5'), mx('5 − n'), mx('n + 5'), mx('5 × n')], ctx);
    const why = [
      '',
      mx('5 − n') + ' follows the word order, but with ' + mx('n = 8') + ' it gives 5 − 8, which goes below zero. 5 less than 8 is 3, so the expression you want gives 3 when ' + mx('n = 8') + '.',
      mx('n + 5') + ' is 5 more than ' + mx('n') + '. With ' + mx('n = 8') + ' it gives 13, but 5 less than 8 is 3.',
      mx('5 × n') + ' is 5 lots of ' + mx('n') + '. With ' + mx('n = 8') + ' it gives 40, but 5 less than 8 is 3.'
    ];
    return {
      check() { const s = ch.sel()[0]; if (s === 0) return true; ch.mark(s, 'bad'); return why[s]; },
      win: () => mx('n − 5') + '. With ' + mx('n = 8') + ' it gives 3. You hear the 5 first, but you start at ' + mx('n') + ' and go down 5, so ' + mx('n') + ' is written first.',
      won() { draw(true); ch.mark(0, 'good'); ch.lock(); },
      solve() { ch.set([0]); }
    };
  }
},

/* 13 */ {
  prompt: 'Build an expression for “3 less than double ' + mx('n') + '”.',
  sub: 'Test your expression with a number before you check.',
  why: () => whyBox(whyTable([[mx('n'), 5, 10], ['Double ' + mx('n'), 10, 20], ['3 less than that', 7, 17]]), [
    'Double ' + mx('n') + ' is ' + mx('2n') + '. “3 less than” starts there and goes down 3: ' + mx('2n − 3') + '.',
    'Check with 5: 2 × 5 − 3 = 10 − 3 = 7.'
  ]),
  build: tileCard({
    v: 'n', tiles: ['n', '+', '−', '×', '2', '3'], f: n => 2 * n - 3, ans: ['2', '×', 'n', '−', '3'],
    noVar: 'Your expression has no ' + mx('n') + ', so it gives the same number whatever ' + mx('n') + ' is.',
    wrong: [
      [n => 3 - 2 * n, 'That is “double ' + mx('n') + ' less than 3”. Try ' + mx('n = 5') + ': double 5 is 10, and 3 less than 10 is 7. Your expression gives 3 − 10, which goes below zero. Start at double ' + mx('n') + ', then go down 3.'],
      [n => 2 * n + 3, 'That is 3 more than double ' + mx('n') + '. “Less than” means go down.'],
      [n => n - 6, 'That takes away double 3. Double the number, then take 3 away.'],
      [n => 2 * n, 'That is double ' + mx('n') + '. Now make it 3 less.'],
      [n => n - 3, 'That is 3 less than ' + mx('n') + '. You need 3 less than double ' + mx('n') + '.']
    ],
    test: (k, want, got) => 'Test it with ' + mx('n = ' + k) + ': double ' + k + ' is ' + 2 * k + ', and 3 less than that is ' + want + '. Your expression gives ' + got + '.',
    std: '2n − 3',
    win: (e, std) => e + (std ? '' : ', written ' + mx('2n − 3')) + '. Again you hear the 3 first, but you start at double ' + mx('n') + ' and take 3 away.'
  })
},

/* 14 */ {
  bridge: true,
  prompt: 'With “less than”, write what you start with first. <b>Order matters when you subtract</b>.',
  sub: '“5 less than ' + mx('n') + '” starts at ' + mx('n') + ' and goes down 5, so it is ' + mx('n − 5') + ', not ' + mx('5 − n') + '.',
  show(stage) { stage.append(h(NLINE_DONE)); }
},

/* 15 */ {
  prompt: 'Build an expression for the cost of ' + mx('n') + ' movie tickets, in dollars.',
  sub: 'The booking fee is paid once for the whole order.',
  why: () => whyBox(whyReceipt(3, 41), [
    '3 tickets cost 3 × $12 = $36, then the $5 fee is added once: $41.',
    'For ' + mx('n') + ' tickets it is ' + mx('12 × n + 5') + ', written ' + mx('12n + 5') + '.'
  ]),
  build: tileCard({
    v: 'n', tiles: ['n', '+', '×', '(', ')', '5', '12'], f: n => 12 * n + 5, ans: ['12', '×', 'n', '+', '5'],
    pic: stage => stage.append(h(receipt('?'))),
    noVar: 'Your expression has no ' + mx('n') + ', so it gives the same price for 1 ticket as for 10.',
    wrong: [
      [n => 17 * n, 'That charges the $5 fee on every ticket. The fee is paid once for the whole order.'],
      [n => 12 * (n + 5), 'That pays $12 for 5 extra tickets. The $5 is a fee, added once at the end, not 5 more tickets.'],
      [n => 12 * n, 'That is the cost of the tickets. Add the $5 booking fee.'],
      [n => 5 * n + 12, 'The numbers have swapped. Each ticket costs $12, so it is 12 lots of ' + mx('n') + ', then the $5 fee.'],
      [n => n + 17, 'That pays $12 only once. Each of the ' + mx('n') + ' tickets costs $12.']
    ],
    test: (k, want, got) => 'Test it with ' + mx('n = ' + k) + ' tickets: ' + k + ' × $12 = $' + 12 * k + ', plus the $5 fee is $' + want + '. Your expression gives ' + got + '.',
    std: '12n + 5',
    win: (e, std) => e + ' dollars' + (std ? '' : ', usually written ' + mx('12n + 5')) + '. The 12 multiplies ' + mx('n') + ' because every ticket costs $12. The 5 is added once.'
  })
},

/* 16 */ {
  prompt: 'The cost of ' + mx('n') + ' tickets is ' + mx('12n + 5') + ' dollars. How much do 4 tickets cost?',
  why: () => whyBox(whyReceipt(4, 53), [
    mx('12n') + ' means 12 × ' + mx('n') + ', so with ' + mx('n = 4') + ' the tickets cost 12 × 4 = 48 dollars.',
    'The 5 has no ' + mx('n') + ' with it, so it is added once: 48 + 5 = 53.'
  ]),
  build(stage, ctl, ctx) {
    stage.append(h(receipt(mx('12n + 5'))), h('<div class="note">' + mx('n = 4') + '</div>'));
    const ans = makeAnswer(ctl, 'Cost in dollars', ctx);
    return {
      check() {
        const v = ans.value();
        if (v === 53) return true;
        ans.mark('bad');
        if (isNaN(v)) return 'Type a whole number, using digits only.';
        if (v === 68) return '68 is 4 × 17: the $5 fee added to every ticket. The fee is paid once.';
        if (v === 108) return '108 is 12 × (4 + 5). The 4 tickets cost 12 × 4, and the fee is added after that.';
        if (v === 48) return '48 is the 4 tickets. Add the $5 booking fee.';
        if (v === 129) return mx('12n') + ' means 12 × ' + mx('n') + '. It doesn’t mean writing 4 after the 12 to make 124.';
        if (v === 21) return '21 is 12 + 4 + 5. ' + mx('12n') + ' means 12 × ' + mx('n') + ', so multiply.';
        return 'Swap ' + mx('n') + ' for 4: 12 × 4 + 5. Multiply first, then add.';
      },
      win: () => '12 × 4 + 5 = 48 + 5 = 53, so 4 tickets cost $53. The recipe ' + mx('12n + 5') + ' turned into a price as soon as you knew ' + mx('n') + '.',
      won() { ans.mark('good'); ans.lock(); },
      solve() { ans.set(53); }
    };
  }
},

/* 17 */ {
  prompt: 'Three students wrote an expression for the same story. Who is right?',
  sub: 'Choose Agree or Disagree for each one.',
  why: () => whyBox(steps([mx('n = 10'), '10 − 2 = 8', '8 × 3 = 24']), [
    'The story gives 24, so test each expression with ' + mx('n = 10') + '.'
  ]) + '<div class="wy">' + whyTable([['Mia: 10 − 2 × 3 = 10 − 6', 4], ['Jai: 3 × (2 − 10)', '<small>below zero</small>'], ['Ava: (10 − 2) × 3 = 8 × 3', 24]], true) + '</div>',
  build(stage, ctl, ctx) {
    stage.append(h(steps(['Think of a number ' + mx('n'), 'Take away 2', 'Multiply by 3'])));
    const claims = [
      { who: 'Mia', say: '“' + mx('n − 2 × 3') + '. I wrote the steps in the order I heard them.”', agree: false, hint: 'Try ' + mx('n − 2 × 3') + ' with ' + mx('n = 10') + ': × is done before −.' },
      { who: 'Jai', say: '“' + mx('3(2 − n)') + '. The brackets make the take-away happen first.”', agree: false, hint: 'What is the 2 taken away from in ' + mx('3(2 − n)') + '?' },
      { who: 'Ava', say: '“' + mx('(n − 2) × 3') + '. Start with ' + mx('n') + ', take away 2, then multiply the result by 3.”', agree: true, hint: 'Try ' + mx('(n − 2) × 3') + ' with ' + mx('n = 10') + ' and compare it with the story.' }
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
    }
    ctl.append(list);
    return {
      check() {
        const wrong = claims.map((c, i) => pick[i] !== c.agree ? i : -1).filter(i => i >= 0);
        if (!wrong.length) return true;
        // Agree/Disagree is a two-way choice, so naming the wrong row would give the answer away. Hint at each error instead.
        return (wrong.length === 1 ? 'One choice needs another look. ' : wrong.length + ' choices need another look. ') + wrong.map(i => claims[i].hint).join(' ');
      },
      win: () => 'Ava is right. Mia left out the brackets, so her expression takes away 6: with ' + mx('n = 10') + ' it gives 4, not 24. Jai turned the subtraction around. ' + mx('(n − 2) × 3') + ', or ' + mx('3(n − 2)') + ', gives (10 − 2) × 3 = 24, just like the story.',
      won() { locked = true; rows.forEach(r => { r.row.classList.add('good'); r.btns.forEach(b => { b.disabled = true; }); }); },
      solve() { claims.forEach((c, i) => { pick[i] = c.agree; paint(i); }); }
    };
  }
}
];

const SECTIONS = [[0, 'Bags'], [3, 'Pictures'], [6, 'Stories'], [10, 'Less than'], [13, 'Money'], [16, 'Wrap-up']];

// Finish screen: sets the prompt, sub-line and recap for this lesson.
function drawFinish() {
  promptEl.textContent = 'An expression is a recipe for a number you don’t know yet.';
  subEl.hidden = false; subEl.textContent = 'Put in a value for the letter and the recipe gives a number. Four things to remember:';
  ctl.replaceChildren(); stage.hidden = false;
  const mini = o => '<svg viewBox="-5 -10 76 83" aria-hidden="true">' + bagG(0, 0, o) + '</svg>';
  const t = (k, s) => '<span class="tile ' + k + ' still">' + s + '</span>';
  stage.replaceChildren(h('<ul class="recap">' +
    '<li><span class="art" style="--h:2rem">' + mini({ tag: 'b' }).repeat(3) + '</span><span>' + mx('b + b + b') + ' is 3 lots of ' + mx('b') + ', written ' + mx('3b') + '. The number goes first and the × sign is left out.</span></li>' +
    '<li><span class="art">' + t('num', '2') + t('var', 'n') + t('op', '+') + t('num', '3') + '</span><span>Write the steps in symbols. “Double, then add 3” is ' + mx('2n + 3') + ', because × is done before +.</span></li>' +
    '<li><span class="art">' + t('op', '(') + t('op', ')') + '</span><span>Don’t just write the steps in the order you hear them. “Add 3, then double” needs brackets: ' + mx('2(n + 3)') + '.</span></li>' +
    '<li><span class="art">' + t('var', 'n') + t('op', '−') + t('num', '5') + '</span><span>“5 less than ' + mx('n') + '” is ' + mx('n − 5') + ', not ' + mx('5 − n') + '. Start at ' + mx('n') + ' and go down 5.</span></li></ul>'));
}
