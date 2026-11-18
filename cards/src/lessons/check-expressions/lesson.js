/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const h = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');

// "4n + 3" -> maths markup. Every letter is italic: lower-case letters are blue variables, the letter named in
// two is the purple second variable, and a capital is a formula's subject in plain ink. Never pass words.
function mx(s, two) {
  return '<span class="m">' + String(s).replace(/[A-Za-z]/g, c => '<i class="' + (c === two ? 'v2' : /[A-Z]/.test(c) ? 'o' : 'v') + '">' + c + '</i>') + '</span>';
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

const numTile = n => '<span class="tile num still pop">' + n + '</span>';

// A formula machine: the letter's value goes in, the formula sits on the body, the output and the working sit directly under it.
const Q = '<span class="tile op still">?</span>';
function makeSubMachine(host, o) {
  const node = h('<div class="mach"><div class="m-slot m-in"><span class="cap">' + o.inCap + '</span></div><div class="m-pipe"></div>' +
    '<div class="m-body"><span class="fx">' + o.f + '</span></div><div class="m-pipe"></div><div class="m-slot m-out"><span class="cap">' + o.outCap + '</span></div></div>');
  const work = h('<div class="live"></div>');
  host.append(node, work);
  const inS = $('.m-in', node), outS = $('.m-out', node), body = $('.m-body', node);
  const put = (slot, html) => { const old = $('.tile', slot); if (old) old.remove(); slot.append(h(html)); };
  let timer = null;
  const m = {
    input: html => put(inS, html),
    clear() { clearTimeout(timer); put(outS, Q); work.innerHTML = ''; },
    show(out, line) { clearTimeout(timer); put(outS, out); work.innerHTML = line || ''; },
    run(out, line) {
      m.clear();
      body.classList.remove('run'); void body.offsetWidth; body.classList.add('run');
      timer = setTimeout(() => m.show(out, line), 600);
    }
  };
  m.clear();
  return m;
}

// Two machines side by side, fed the same n. A and B are { s, f }: s is how the expression is written, f gives its value
// (f is null while a built expression is unfinished). The working sits directly under each output.
const subst = (s, v) => s.replace(/(\d)(?=[a-z(])/g, '$1 × ').replace(/[a-z]/g, v);
function makeTwin(host, A, B, v0) {
  const node = h('<div class="twin" role="img"></div>');
  const add = cls => { const e = h('<div class="' + cls + '"></div>'); node.append(e); return e; };
  const body = () => { const e = add('tw-body'); e.innerHTML = GEAR + '<span class="tw-lab"></span>'; return $('.tw-lab', e); };
  const lab = [], out = [], calc = [];
  lab[0] = body(); const inp = add('tw-in'); lab[1] = body();
  add('tw-pipe'); add('tw-gap'); add('tw-pipe');
  out[0] = add('tw-out'); const sign = add('tw-sign'); out[1] = add('tw-out');
  calc[0] = add('tw-calc'); add('tw-gap'); calc[1] = add('tw-calc');
  host.append(node);
  const ex = [A, B];
  let v = v0;
  function draw() {
    const r = ex.map(e => e && e.f ? e.f(v) : null);
    ex.forEach((e, k) => {
      lab[k].innerHTML = e && e.s ? mx(e.s) : '?';
      out[k].innerHTML = r[k] == null ? '<span class="tile op still">?</span>' : '<span class="tile num still">' + r[k] + '</span>';
      calc[k].innerHTML = r[k] == null ? '' : mx(subst(e.s, v) + ' = ' + r[k]);
    });
    inp.innerHTML = mx('n = ' + v);
    const both = r[0] != null && r[1] != null, same = both && r[0] === r[1];
    sign.className = 'tw-sign' + (both ? (same ? ' same' : ' diff') : '');
    sign.textContent = both ? (same ? '=' : '≠') : '';
    const say = k => (ex[k] && ex[k].s ? ex[k].s : 'the empty machine') + ' gives ' + (r[k] == null ? 'nothing yet' : r[k]);
    node.setAttribute('aria-label', 'Two machines. When n is ' + v + ', ' + say(0) + ' and ' + say(1) + '.');
  }
  draw();
  return { set(n) { v = n; draw(); }, setB(e) { ex[1] = e; draw(); } };
}

const fmtN = v => v < 0 ? '−' + (-v) : String(v);
// A number line from lo to hi with a path of jumps above it, starting at 0, as an SVG string.
// Each jump: { len, lab, cls }. cls sets the colour: '' is blue, 'v2' is the second variable, 'kn' is a known number.
function jumpsSVG(lo, hi, jumps, label) {
  const Y = 58, X0 = 22, X1 = 558, X = v => X0 + (v - lo) * (X1 - X0) / (hi - lo);
  let out = '<line class="jl-axis" x1="' + (X0 - 10) + '" y1="' + Y + '" x2="' + (X1 + 10) + '" y2="' + Y + '"/>';
  for (let v = lo; v <= hi; v++) out += '<line class="jl-tick" x1="' + X(v) + '" y1="' + (Y - 5) + '" x2="' + X(v) + '" y2="' + (Y + 5) + '"/><text class="jl-n" x="' + X(v) + '" y="' + (Y + 19) + '" text-anchor="middle">' + fmtN(v) + '</text>';
  let at = 0;
  jumps.forEach((j, k) => {
    const x1 = X(at), x2 = X(at + j.len), xm = (x1 + x2) / 2, ht = Math.min(k ? 27 : 36, 10 + Math.abs(x2 - x1) * 0.4), c = j.cls || '';
    out += '<path class="jl-arc ' + c + '" d="M' + x1 + ' ' + (Y - 3) + ' Q' + xm + ' ' + (Y - 3 - 2 * ht) + ' ' + x2 + ' ' + (Y - 3) + '"/>' +
      '<path class="jl-head ' + c + '" d="M' + (x2 - 5) + ' ' + (Y - 14) + ' L' + (x2 + 5) + ' ' + (Y - 14) + ' L' + x2 + ' ' + (Y - 3) + ' Z"/>' +
      '<text class="jl-lab ' + c + '" x="' + xm + '" y="' + (Y - ht - 9) + '" text-anchor="middle">' + j.lab + '</text>';
    at += j.len;
  });
  out += '<circle class="jl-dot" cx="' + X(at) + '" cy="' + Y + '" r="5.5"/>';
  return '<svg class="jl" viewBox="0 0 580 82" role="img" aria-label="' + label + '">' + out + '</svg>';
}

/* ---------- Level Check pieces ---------- */
const INCOMPLETE = 'That isn’t a complete expression yet. Every sign needs a number or letter on each side, and brackets come in pairs.';
// Tokens -> display string: ['9','×','g','+','6'] -> "9 × g + 6", ['9','g'] -> "9g".
const show = t => t.join(' ').replace(/\( /g, '(').replace(/ \)/g, ')').replace(/(\d) (?=[a-z(])/g, '$1');
const bagIt = o => '<div class="it bagit">' + svgBag(o) + '</div>';
const marbles = n => '<div class="mbs">' + ('<div class="it mbit">' + SVG_MARBLE + '</div>').repeat(n) + '</div>';
const receipt = rows => '<div class="receipt">' + rows.map((r, i) => '<div' + (i === rows.length - 1 ? ' class="tot"' : '') + '><span>' + r[0] + '</span><span>' + r[1] + '</span></div>').join('') + '</div>';

// Why? panel pieces: a small picture, then at most two lines of working.
const why = (pic, lines) => '<div class="wy">' + pic + lines.map(l => '<p>' + l + '</p>').join('') + '</div>';
// A machine drawn small: value in (letter beside it), the working on the body, value out.
const flow = (cap, inV, work, outV, outCap) => '<div class="wy-flow"><span class="wy-io"><span class="tile num still">' + inV + '</span><small>' + cap + '</small></span>' +
  '<span class="wy-arr" aria-hidden="true">→</span><span class="wy-box">' + work + '</span><span class="wy-arr" aria-hidden="true">→</span>' +
  '<span class="wy-io"><span class="tile num still">' + outV + '</span><small>' + (outCap || 'out') + '</small></span></div>';
const svgT = (x, y, s) => '<text class="wy-t" x="' + x + '" y="' + y + '">' + s + '</text>';
const tv = c => '<tspan class="tv">' + c + '</tspan>';

// A single-answer choice card. cfg: items, ans (index), wrong (feedback per index), win, pic(stage), cls.
function choiceCard(cfg) {
  return function (stage, ctl, ctx) {
    if (cfg.pic) cfg.pic(stage); else stage.hidden = true;
    const ch = makeChoices(ctl, cfg.items, ctx);
    if (cfg.cls) ctl.lastElementChild.classList.add(cfg.cls);
    return {
      check() { const s = ch.sel()[0]; if (s === cfg.ans) return true; ch.mark(s, 'bad'); return cfg.wrong[s]; },
      win: cfg.win,
      won() { ch.mark(cfg.ans, 'good'); ch.lock(); },
      solve() { ch.set([cfg.ans]); }
    };
  };
}

// The value is already in the machine: type the output, then a right answer runs the machine.
function machineCard(c) {
  return function (stage, ctl, ctx) {
    const mc = makeSubMachine(stage, { f: mx(c.f), inCap: mx(c.letter), outCap: c.outCap || 'out' });
    const ans = makeAnswer(ctl, c.label, ctx);
    mc.input(numTile(c.n));
    return {
      check() {
        const v = ans.value();
        if (isNaN(v)) { ans.mark('bad'); return 'Type a whole number, using digits only.'; }
        if (v === c.out) return true;
        ans.mark('bad');
        return c.wrong[v] || c.other;
      },
      win: c.win,
      won() { mc.run(numTile(c.out), '<span class="m">' + c.work + ' = ' + c.out + '</span>'); ans.mark('good'); ans.lock(); },
      solve() { ans.set(c.out); }
    };
  };
}

const E2N = { s: '2n', f: n => 2 * n }, EN6 = { s: 'n + 6', f: n => n + 6 };

const cards = [

/* 1 */ {
  bridge: true,
  prompt: 'Level Check: Variables and expressions',
  sub: 'There are 9 questions, mixed from the five lessons in this unit. You get two tries at each one, then it shows the answer.'
},

/* 2: the letter stands for a number, not an object or a word */ {
  from: 'what-is-a-variable',
  prompt: 'Each bag holds ' + mx('m') + ' marbles. What does ' + mx('m') + ' stand for?',
  build: choiceCard({
    pic: stage => stage.append(h('<div class="mat">' + bagIt({ body: '?' }).repeat(3) + marbles(2) + '</div>'),
      h('<div class="live"><span class="lab">Marbles on the mat</span>' + mx('m + m + m + 2') + '</div>')),
    items: ['The word “marbles”, shortened', 'One bag', 'The number of marbles in one bag', 'The number of bags'],
    ans: 2,
    wrong: [
      'The letter m was picked because “marbles” starts with m, but it isn’t an abbreviation. In algebra a letter stands for a number. Which number is hidden here?',
      mx('m') + ' is not the bag itself. In algebra a letter stands for a number. Which number is hidden inside each bag?',
      '',
      'You can count the bags: there are 3. ' + mx('m') + ' is a number you can’t see yet.'
    ],
    win: () => mx('m') + ' stands for the number of marbles in one bag. A letter in algebra always stands for a number, never an object or a shortened word.'
  }),
  why: () => why(
    '<svg class="wy-svg" style="--w:22rem" viewBox="0 -2 350 76" role="img" aria-label="Three see-through bags with 6 marbles in each, and 2 loose marbles">' +
      bagG(0, 0, { inside: 6 }) + bagG(68, 0, { inside: 6 }) + bagG(136, 0, { inside: 6 }) + marbleG(222, 56, 12) + marbleG(250, 56, 12) + svgT(282, 44, tv('m') + ' = 6') + '</svg>',
    ['If each bag holds 6 marbles, then ' + mx('m = 6') + ' and the mat holds 6 + 6 + 6 + 2 = 20 marbles.',
      mx('m') + ' is the number inside a bag. It is not the bag, and it is not the word “marbles”.'])
},

/* 3: 4n is 4 × n, not 45 */ {
  from: 'substitution',
  prompt: 'This machine works out ' + mx('4n + 3') + '. ' + mx('n = 5') + ' goes in. What comes out?',
  build: machineCard({
    f: '4n + 3', letter: 'n', n: 5, out: 23, work: '4 × 5 + 3', label: 'Out comes',
    wrong: {
      48: 'You read ' + mx('4n') + ' as 45, then added 3. But ' + mx('4n') + ' means 4 × ' + mx('n') + ', so it is 4 × 5.',
      45: '45 is 4 and 5 written side by side. ' + mx('4n') + ' means 4 × ' + mx('n') + ': work out 4 × 5, then add 3.',
      12: 'You added: 4 + 5 + 3. But ' + mx('4n') + ' means 4 lots of ' + mx('n') + ', so it is 4 × 5.',
      32: 'You added 5 + 3 first, then multiplied by 4. Multiply first: 4 × 5, then add 3.',
      20: '20 is ' + mx('4n') + '. The machine then adds 3.'
    },
    other: 'Put 5 where ' + mx('n') + ' was: 4 × 5 + 3. Multiply first, then add.',
    win: () => '4 × 5 + 3 = 20 + 3 = 23. ' + mx('4n') + ' has a hidden ×, so it becomes 4 × 5, not 45.'
  }),
  why: () => why(flow(mx('n = 5'), 5, '4 × 5 + 3', 23),
    ['Put 5 where ' + mx('n') + ' was and write in the hidden ×: ' + mx('4n') + ' is 4 × 5 = 20.', 'Then add: 20 + 3 = 23.'])
},

/* 4: a story into symbols; the fee is added once */ {
  from: 'writing-expressions',
  prompt: 'Build an expression for the cost of ' + mx('g') + ' games of bowling, in dollars.',
  sub: 'Shoe hire is paid once. Drag tiles into the box, or tap them. Tap a tile in the box to take it out.',
  build(stage, ctl, ctx) {
    stage.append(h(receipt([[mx('g') + ' games', '$9 each'], ['Shoe hire', '$6 once'], ['Total', '?']])));
    const bd = makeBuilder(stage, ctl, ['g', '+', '×', '(', ')', '6', '9'], ctx);
    const f = g => 9 * g + 6, at = (t, k) => evalToks(t, 'g', k), eq = (t, r) => [2, 5, 11].every(k => at(t, k) === r(k));
    const wrong = [
      [g => 15 * g, 'That charges the $6 shoe hire for every game. Shoe hire is paid once.'],
      [g => 9 * (g + 6), 'That pays $9 for 6 extra games. The $6 is shoe hire, added once at the end.'],
      [g => 9 * g, 'That is the cost of the games. Add the $6 shoe hire.'],
      [g => 6 * g + 9, 'The numbers have swapped. Each game costs $9, so it is 9 lots of ' + mx('g') + ', then the $6 shoe hire.'],
      [g => g + 15, 'That pays $9 only once. Each of the ' + mx('g') + ' games costs $9.'],
      [g => g + 9, 'That pays $9 once and leaves out the shoe hire. Each of the ' + mx('g') + ' games costs $9.'],
      [g => g + 6, 'That leaves out the $9. Each of the ' + mx('g') + ' games costs $9.']
    ];
    return {
      check() {
        const t = bd.toks();
        if (at(t, 5) == null) return INCOMPLETE;
        if (eq(t, f)) return true;
        if (!t.includes('g')) return 'Your expression has no ' + mx('g') + ', so it gives the same price for 1 game as for 10.';
        const hit = wrong.find(w => eq(t, w[0]));
        if (hit) return hit[1];
        const k = [5, 2, 11].find(k => at(t, k) !== f(k));
        return 'Test it with ' + mx('g = ' + k) + ' games: ' + k + ' × $9 = $' + 9 * k + ', plus $6 shoe hire is $' + f(k) + '. Your expression gives ' + at(t, k) + '.';
      },
      win: () => { const e = show(bd.toks()); return mx(e) + ' dollars' + (e === '9g + 6' ? '' : ', usually written ' + mx('9g + 6')) + '. The 9 multiplies ' + mx('g') + ' because every game costs $9. The 6 is added once.'; },
      won() { bd.lock(); },
      solve() { bd.set(['9', '×', 'g', '+', '6']); }
    };
  },
  why: () => why('<div class="wy-row">' + receipt([['4 games', '4 × $9 = $36'], ['Shoe hire', '$6'], ['Total', '$42']]) + '<span class="note">' + mx('g = 4') + '</span></div>',
    ['Try 4 games: the games cost 9 × 4 = 36 dollars, and shoe hire adds 6 once.', mx('9g + 6') + ' does the same: 9 × 4 + 6 = 42.'])
},

/* 5: sometimes equal is not equivalent (two parts) */ {
  from: 'equivalent-expressions',
  prompt: 'Both machines get the same ' + mx('n') + '. Are ' + mx('2n') + ' and ' + mx('n + 6') + ' always, sometimes or never equal?',
  sub: 'Slide ' + mx('n') + ' and watch both outputs.',
  build(stage, ctl, ctx) {
    const tw = makeTwin(stage, E2N, EN6, 1);
    const sl = makeSlider(ctl, 'n', 0, 10, 1, v => tw.set(v));
    const ch = makeChoices(ctl, ['Always equal', 'Sometimes equal', 'Never equal'], ctx);
    ctl.lastElementChild.classList.add('c3');
    const wrong = [
      'At ' + mx('n = 1') + ' the machines give 2 and 7, so they are not always equal. Slide through the other values too.',
      '',
      'Slide ' + mx('n') + ' through every value from 0 to 10 and watch the sign between the outputs. Does it ever change to =?'
    ];
    return {
      check() { const s = ch.sel()[0]; if (s === 1) return true; ch.mark(s, 'bad'); return wrong[s]; },
      win: () => 'Sometimes. They match at ' + mx('n = 6') + ', where both give 12. At every other value the outputs are different.',
      won() { sl.set(6); ch.mark(1, 'good'); ch.lock(); },
      solve() { ch.set([1]); },
      recap: () => mx('2n') + ' and ' + mx('n + 6') + ' are sometimes equal: only at ' + mx('n = 6') + '.'
    };
  },
  why: () => why(
    '<table class="wy-tab"><tr><th>' + mx('n') + '</th><td>0</td><td>3</td><td class="hit">6</td><td>9</td></tr>' +
      '<tr><th>' + mx('2n') + '</th><td>0</td><td>6</td><td class="hit">12</td><td>18</td></tr>' +
      '<tr><th>' + mx('n + 6') + '</th><td>6</td><td>9</td><td class="hit">12</td><td>15</td></tr></table>',
    ['Only the ' + mx('n = 6') + ' column matches: 2 × 6 = 12 and 6 + 6 = 12.', 'One match and many misses means “sometimes equal”.']),
  then: {
    prompt: 'They match at ' + mx('n = 6') + '. So are ' + mx('2n') + ' and ' + mx('n + 6') + ' equivalent?',
    reset: false,
    build: (stage, ctl, ctx) => choiceCard({
      pic: () => {},
      items: ['Yes. They give the same output at ' + mx('n = 6') + '.', 'No. They give different outputs at other values.', 'No. They look different.'],
      ans: 1,
      wrong: [
        'One match isn’t enough. Equivalent means the same output for <b>every</b> value of ' + mx('n') + '. At ' + mx('n = 1') + ' they gave 2 and 7.',
        '',
        'Looks don’t decide it: ' + mx('n + n') + ' and ' + mx('2n') + ' look different, but they are equivalent. What do the outputs do at other values of ' + mx('n') + '?'
      ],
      win: () => 'Not equivalent. Equivalent expressions give the same number for every value of ' + mx('n') + '. One value where they differ is enough to rule it out.'
    })(stage, ctl, ctx),
    why: () => why('<div class="wy-duo">' + flow(mx('n = 3'), 3, '2 × 3', 6) + '<span class="wy-ne">≠</span>' + flow(mx('n = 3'), 3, '3 + 6', 9) + '</div>',
      ['At ' + mx('n = 3') + ', ' + mx('2n') + ' gives 6 but ' + mx('n + 6') + ' gives 9.', 'One value where they differ proves they are not equivalent.'])
  }
},

/* 6: a counterexample; pairs that fit prove nothing */ {
  from: 'properties-with-letters',
  prompt: 'Kai says ' + mx('a − b = b − a', 'b') + ' is true for all numbers. Which pair proves Kai wrong?',
  build: choiceCard({
    items: [mx('a = 5', 'b') + ' and ' + mx('b = 5', 'b'), mx('a = 8', 'b') + ' and ' + mx('b = 2', 'b'), mx('a = 0', 'b') + ' and ' + mx('b = 0', 'b'), 'No pair can. Kai is right.'],
    ans: 1,
    wrong: [
      '5 − 5 = 0 both ways, so this pair fits Kai’s rule. A pair that fits can’t prove a rule wrong. Find a pair where the two sides are different.',
      '',
      '0 − 0 = 0 both ways, so this pair fits Kai’s rule. A pair that fits can’t prove a rule wrong. Find a pair where the two sides are different.',
      'Kai’s rule works when ' + mx('a', 'b') + ' and ' + mx('b', 'b') + ' are equal, but a rule with letters has to work for every pair. Test a pair of different numbers.'
    ],
    win: () => '8 − 2 = 6, but 2 − 8 = −6. One pair that fails is a counterexample: it proves ' + mx('a − b = b − a', 'b') + ' is not true for all numbers.'
  }),
  why: () => why(
    '<div class="wy-jl"><span class="note">' + mx('a = 8', 'b') + '</span><span class="note two">' + mx('b = 2', 'b') + '</span></div>' +
      jumpsSVG(-10, 10, [{ len: 8, lab: '8' }, { len: -2, lab: '2', cls: 'v2' }], 'Forwards 8, back 2, landing on 6') +
      jumpsSVG(-10, 10, [{ len: 2, lab: '2', cls: 'v2' }, { len: -8, lab: '8' }], 'Forwards 2, back 8, landing on negative 6'),
    ['Forwards 8 then back 2 lands on 6. Forwards 2 then back 8 lands on −6.', 'The other order lands in a different place, so order matters when you subtract.'])
},

/* 7: multiply before you add, even when the term comes second */ {
  from: 'substitution',
  prompt: 'A taxi ride of ' + mx('k') + ' kilometres costs ' + mx('C = 5 + 3k') + ' dollars. Find ' + mx('C') + ' for a 9 km ride.',
  build: machineCard({
    f: '5 + 3k', letter: 'k', outCap: mx('C'), n: 9, out: 32, work: '5 + 3 × 9', label: 'Cost in dollars, ' + mx('C'),
    wrong: {
      72: 'You added 5 + 3 = 8 first, then did 8 × 9. Multiplying comes before adding, even when it is written second: 3 × 9, then add the 5.',
      44: 'You read ' + mx('3k') + ' as 39. ' + mx('3k') + ' means 3 × ' + mx('k') + ', so it is 3 × 9.',
      39: '39 is 3 and 9 written side by side. ' + mx('3k') + ' means 3 × 9. Then add the 5.',
      17: 'You added: 5 + 3 + 9. But ' + mx('3k') + ' means 3 × ' + mx('k') + '.',
      27: '27 is ' + mx('3k') + '. Now add the 5 at the front.',
      14: '5 + 9 leaves out the 3. ' + mx('3k') + ' means 3 × 9.'
    },
    other: 'Put 9 where ' + mx('k') + ' was: 5 + 3 × 9. Multiply first, then add.',
    win: () => '5 + 3 × 9 = 5 + 27 = 32, so the ride costs $32. The 3 belongs to the ' + mx('k') + ': ' + mx('3k') + ' is worked out first, wherever it sits.'
  }),
  why: () => why(flow(mx('k = 9'), 9, '5 + 3 × 9', 32, mx('C')),
    ['Multiply first: 3 × 9 = 27. That is $3 for each of the 9 kilometres.', 'Then add the $5: 5 + 27 = 32, so ' + mx('C = 32') + '.'])
},

/* 8: "less than" reverses the word order */ {
  from: 'writing-expressions',
  prompt: 'Which expression means “7 less than double ' + mx('n') + '”?',
  build: choiceCard({
    items: [mx('7 − 2n'), mx('2(n − 7)'), mx('2n − 7'), mx('2n + 7')],
    ans: 2,
    wrong: [
      mx('7 − 2n') + ' follows the word order. Test ' + mx('n = 10') + ': double 10 is 20, and 7 less than 20 is 13. But 7 − 20 goes below zero.',
      mx('2(n − 7)') + ' takes 7 away first, then doubles. Test ' + mx('n = 10') + ': it gives 2 × 3 = 6, but 7 less than double 10 is 13.',
      '',
      mx('2n + 7') + ' is 7 <b>more</b> than double ' + mx('n') + '. “Less than” means go down.'
    ],
    win: () => mx('2n − 7') + '. You hear the 7 first, but you start at double ' + mx('n') + ' and go down 7, so ' + mx('2n') + ' is written first.'
  }),
  why: () => why(
    '<div class="wy-jl"><span class="note">' + mx('n = 10') + '</span></div>' +
      jumpsSVG(0, 20, [{ len: 20, lab: 'double 10', cls: 'kn' }, { len: -7, lab: 'down 7', cls: 'kn' }], 'Start at double 10, which is 20, then go down 7 to land on 13'),
    ['Try ' + mx('n = 10') + '. Double it to get 20, then go down 7: 20 − 7 = 13.', mx('2n − 7') + ' gives 2 × 10 − 7 = 13 as well. ' + mx('7 − 2n') + ' would start at 7.'])
},

/* 9: equivalent means equal for every value (sorter) */ {
  from: 'equivalent-expressions',
  prompt: 'Sort the pairs. Are the two expressions equivalent?',
  sub: 'Test values in your head. Drag each pair into a box, or tap a pair, then tap a box.',
  build(stage, ctl, ctx) {
    const items = [
      { a: '5n', b: 'n + 8', bin: 'no', say: 'They match at ' + mx('n = 2') + ', but one match isn’t enough. Test ' + mx('n = 1') + ' in both.' },
      { a: 'n + n + n + n', b: '4n', bin: 'yes', say: mx('n + n + n + n') + ' is 4 lots of ' + mx('n') + '. What does ' + mx('4n') + ' mean?' },
      { a: '3(n + 1)', b: '3n + 1', bin: 'no', say: 'Test ' + mx('n = 1') + ': ' + mx('3(n + 1)') + ' gives 3 × 2 = 6, but ' + mx('3n + 1') + ' gives 3 + 1 = 4.' },
      { a: 'n + 7', b: '7 + n', bin: 'yes', say: 'Does the order matter when you add two numbers? Test a value in both.' }
    ];
    const place = items.map(() => 'tray');
    let sel = null, locked = false;
    const bins = h('<div class="bins"><div class="bin" data-drop="yes"><button type="button" class="bin-h">Equivalent</button><div class="bin-c"></div></div>' +
      '<div class="bin" data-drop="no"><button type="button" class="bin-h">Not equivalent</button><div class="bin-c"></div></div></div>');
    const tray = h('<div class="chips" data-drop="tray"></div>');
    stage.append(bins); ctl.append(tray);
    const hostOf = w => w === 'tray' ? tray : $('.bin[data-drop=' + w + '] .bin-c', bins);
    const chips = items.map((it, i) => {
      const c = h('<button type="button" class="chip pc">' + mx(it.a) + '<small>and</small>' + mx(it.b) + '</button>');
      c.onclick = () => { if (locked) return; sel = sel === i ? null : i; draw(); };
      draggable(c, { accept: ['yes', 'no', 'tray'], onDrop: t => move(i, t.getAttribute('data-drop')) });
      return c;
    });
    function move(i, where) {
      if (locked) return;
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
        const wrong = items.map((it, i) => place[i] !== it.bin ? i : -1).filter(i => i >= 0);
        if (!wrong.length) return true;
        wrong.forEach(i => chips[i].classList.add('bad'));
        const w = items[wrong[0]];
        return plural(wrong.length, 'pair') + (wrong.length === 1 ? ' is' : ' are') + ' in the wrong box. ' + mx(w.a) + ' and ' + mx(w.b) + ': ' + w.say;
      },
      win: () => 'Two pairs are equivalent: they match for every ' + mx('n') + '. ' + mx('5n') + ' and ' + mx('n + 8') + ' match only at ' + mx('n = 2') + ', and ' + mx('3(n + 1)') + ' is always 2 more than ' + mx('3n + 1') + '.',
      won() { locked = true; chips.forEach(c => { c.classList.remove('sel', 'bad'); c.classList.add('good'); }); },
      solve() { items.forEach((it, i) => { place[i] = it.bin; }); sel = null; chips.forEach(c => c.classList.remove('bad')); draw(); }
    };
  },
  why: () => {
    const row = (a, b, x, y) => '<tr><th>' + mx(a) + ' and ' + mx(b) + '</th>' + [x, y].map(p => '<td class="' + (p[0] === p[1] ? 'hit' : 'miss') + '">' + p[0] + (p[0] === p[1] ? ' = ' : ' ≠ ') + p[1] + '</td>').join('') + '</tr>';
    return why('<table class="wy-tab wide"><tr><th></th><td>' + mx('n = 1') + '</td><td>' + mx('n = 2') + '</td></tr>' +
      row('n + n + n + n', '4n', [4, 4], [8, 8]) + row('n + 7', '7 + n', [8, 8], [9, 9]) +
      row('3(n + 1)', '3n + 1', [6, 4], [9, 7]) + row('5n', 'n + 8', [5, 9], [10, 10]) + '</table>',
      ['One value where a pair differs proves it is not equivalent, even if another value matches.',
        'The top two always match: ' + mx('n + n + n + n') + ' is 4 lots of ' + mx('n') + ', and adding works in either order.']);
  }
},

/* 10: the same letter is the same number; one value balances the scale */ {
  from: 'what-is-a-variable',
  prompt: 'Each bag holds ' + mx('b') + ' marbles. Find the value of ' + mx('b') + ' that makes the scale balance.',
  sub: 'Drag the slider. It changes both bags at once.',
  build(stage, ctl, ctx) {
    let b = 1;
    const sc = makeScale(stage);
    function draw() {
      const s = 2 * b + 1, ok = s === 11;
      sc.update({ bags: [{ inside: b }, { inside: b }], loose: 1, weight: s }, { loose: 11, weight: 11 });
      sc.bar(mx('b + b + 1') + '<small>' + b + ' + ' + b + ' + 1 = ' + s + '</small>', ok ? '=' : '≠', mx('11') + '<small>marbles</small>', ok);
    }
    const sl = makeSlider(ctl, 'b', 0, 10, b, v => { b = v; draw(); ctx.touch(true); });
    draw();
    return {
      check() {
        const s = 2 * b + 1;
        return s === 11 ? true : 'If ' + mx('b') + ' is ' + b + ', the left side holds ' + b + ' + ' + b + ' + 1 = ' + s + ' marbles. The right side holds 11, so the left is too ' + (s > 11 ? 'heavy' : 'light') + '.';
      },
      win: () => mx('b = 5') + ', because 5 + 5 + 1 = 11. Both bags are ' + mx('b') + ', so they hold the same number, and only one value makes this scale balance.',
      solve() { sl.set(5); }
    };
  },
  why: () => why(
    '<svg class="wy-svg" style="--w:24rem" viewBox="0 -2 380 76" role="img" aria-label="Two bags holding 5 marbles each and 1 loose marble make 11 marbles">' +
      bagG(0, 0, { body: '5' }) + bagG(68, 0, { body: '5' }) + marbleG(152, 56, 12) + svgT(178, 50, '= 11 marbles') + svgT(312, 50, tv('b') + ' = 5') + '</svg>',
    ['5 + 5 + 1 = 11, so ' + mx('b = 5') + ' balances the scale. No other value does.',
      'Inside one problem the same letter is the same number, so the bags can’t hold 4 and 6.'])
}
];

const SECTIONS = [[0, 'Level Check']];
