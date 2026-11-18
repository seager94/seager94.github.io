/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const h = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');

// "15m + 20 = 95" -> maths markup. Single lower-case letters become variables, also after a number (15m).
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
const tileName = t => t === '+' ? 'plus' : t === '×' ? 'times' : t === '=' ? 'equals' : t;
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
function makeBuilder(stripHost, trayHost, tiles, ctx, ph) {
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
    if (!toks.length) strip.append(h('<span class="ph">' + (ph || 'Your expression goes here') + '</span>'));
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

/* ---------- story components ---------- */
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

/* ---------- still pictures: Why? panels and bridges ---------- */
// A bar model that doesn't move. o: { max, total, totalCap, cells: [[class, width, html]], caps: [[width, html]], ok, label }
function stillBar(o) {
  const pc = x => (x / o.max * 100) + '%';
  const cell = (cls, w, html) => '<span class="' + cls + '" style="width:' + pc(w) + '">' + html + '</span>';
  return '<div class="bm still' + (o.ok ? ' ok' : '') + '" role="img" aria-label="' + o.label + '"><div class="bm-row"><div class="bm-tot" style="width:' + pc(o.total) + '">' + o.totalCap + '</div></div>' +
    '<div class="bm-row bm-built">' + o.cells.map(c => cell('bm-b ' + c[0], c[1], c[2])).join('') + '</div>' +
    '<div class="bm-caps">' + o.caps.map(c => cell('', c[0], c[1])).join('') + '</div><span class="bm-line" style="left:' + pc(o.total) + '"></span></div>';
}
// The bill from a story (same settings as makeBar). n = null leaves the blue part unknown; n draws n blocks.
// x overrides settings; x.ncap replaces the "letter = n" caption under the blocks.
function stillBill(cfg, n, x) {
  const o = Object.assign({}, cfg, x), rest = o.total - o.fixed;
  const cells = [['f', o.fixed, '$' + o.fixed]];
  if (n == null) cells.push(['q', rest, o.q || '?']);
  else for (let k = 0; k < n; k++) cells.push(['u', o.unit, '$' + o.unit]);
  return stillBar({
    max: o.max || Math.max(o.total, o.fixed + o.unit * (n || 0)), total: o.total, totalCap: o.totalCap, cells,
    caps: [[o.fixed, o.fixedCap], [n == null ? rest : o.unit * n, n == null ? o.cap : o.ncap || mx(o.letter + ' = ' + n)]],
    ok: n != null && o.fixed + o.unit * n === o.total,
    label: '$' + o.fixed + ' ' + cfg.fixedCap + (n == null ? ' plus an unknown amount' : ' plus ' + plural(n, 'block') + ' of $' + o.unit) + ', compared with ' + o.totalCap + '.'
  });
}
const nb = s => '<span class="nb">' + s + '</span>';
const whyBox = (fig, lines) => '<div class="why-fig">' + fig + '</div>' + lines.map(l => '<p class="why-ln">' + l + '</p>').join('');

/* ---------- cards ---------- */
const PHONE = { unit: 15, fixed: 20, total: 95, max: 95, letter: 'm', fixedCap: 'setup fee', totalCap: '$95 paid altogether', cap: '$15 for each month' };
const GYM = { unit: 6, fixed: 10, total: 64, letter: 'v', fixedCap: 'joining fee', totalCap: '$64 paid', cap: '$6 for each visit' };
// Stories without a bar on their card: drawn only in Why? panels.
const TAXI = { unit: 3, fixed: 4, total: 31, letter: 'k', fixedCap: 'start', totalCap: '$31 for the trip', cap: '$3 for each kilometre' };
const SAVE = { unit: 8, fixed: 25, total: 81, letter: 'w', fixedCap: 'had at the start', totalCap: '$81 now', cap: '$8 for each week' };
const PLUMB = { unit: 25, fixed: 40, total: 140, letter: 'h', fixedCap: 'call-out fee', totalCap: '$140 bill', cap: '$25 for each hour' };

// The student writes the story as an equation a × v + b = c with tiles.
// Marked by evaluating both sides at several values, so any equivalent equation is accepted.
function eqCard(cfg) {
  return function (stage, ctl, ctx) {
    story(stage, cfg.story);
    const bd = makeBuilder(stage, ctl, cfg.tiles, ctx, 'Your equation goes here');
    const X = [0, 1, 2, 3, 7], v = cfg.v;
    return {
      check() {
        const t = bd.toks(), k = t.indexOf('=');
        if (k < 0) {
          if (evalToks(t, v, 2) == null) return 'That isn’t complete yet. Put + or × between each pair of tiles, and use = to say what the story says is equal.';
          if (X.every(x => evalToks(t, v, x) === cfg.a * x + cfg.b)) return cfg.msg.noEq;
          return 'An equation needs an = sign. ' + cfg.msg.read;
        }
        if (t.indexOf('=', k + 1) >= 0) return 'Use only one = sign. One side is what the story adds up, the other side is the total.';
        const L = t.slice(0, k), R = t.slice(k + 1);
        if (evalToks(L, v, 2) == null || evalToks(R, v, 2) == null) return 'That isn’t a complete equation yet. Each side of = needs tiles, with + or × between each pair.';
        if (!t.includes(v)) return 'Your equation has no ' + mx(v) + ', so it says nothing about the number we want to find.';
        const D = x => evalToks(L, v, x) - evalToks(R, v, x);
        const s = D(1) - D(0), i0 = D(0);
        const linear = X.every(x => D(x) === i0 + s * x);
        const lone = side => !side.includes(v) && evalToks(side, v, 0) === cfg.c;
        const E = lone(R) ? L : lone(L) ? R : null;
        const story = x => cfg.a * x + cfg.b;
        if (E && X.every(x => evalToks(E, v, x) === story(x))) return true;
        if (linear && s !== 0 && s * (cfg.b - cfg.c) === i0 * cfg.a) return 'Your equation has the right solution, but it doesn’t say what the story says. Put the total from the story on one side by itself, and build what the story adds up on the other side.';
        if (E) {
          const e = x => evalToks(E, v, x), is = f => X.every(x => e(x) === f(x));
          if (is(x => cfg.a * x)) return cfg.msg.noFixed;
          if (is(x => cfg.b * x + cfg.a)) return cfg.msg.swap;
          if (X.every(x => e(x) - e(0) === x)) return cfg.msg.slope1;
          const tx = [2, 3, 4, 5, 6, 7, 0, 1].find(x => e(x) !== story(x));
          return cfg.test(tx, e(tx));
        }
        if (linear && s !== 0 && s * (-cfg.b - cfg.c) === i0 * cfg.a) return cfg.msg.addFixed;
        return cfg.msg.read;
      },
      win: () => cfg.win(bd.toks()),
      won() { bd.lock(); },
      solve() { bd.set(cfg.ans); }
    };
  };
}

const cards = [

/* 1 */ {
  prompt: 'Sam’s phone plan costs $15 a month, plus a $20 setup fee. Sam has paid $95 so far. What should the letter ' + mx('m') + ' stand for?',
  sub: 'A bill shows the total you paid, not how many months it covers. We want to find out how long Sam has had the plan.',
  why: () => whyBox(stillBill(PHONE, null), [
    'The story gives the $20, the $15 and the $95. The only number it doesn’t give is how many months Sam has paid for.',
    'So ' + mx('m') + ' stands for the number of months. Because it is a number, it can be multiplied: ' + mx('m') + ' months cost ' + mx('15 × m') + ' dollars.']),
  build(stage, ctl, ctx) {
    makeBar(stage, Object.assign({ q: '?' }, PHONE)).set(null);
    const ch = makeChoices(ctl, ['Months', 'The number of months Sam has had the plan', 'The cost of one month', 'The total Sam has paid'], ctx);
    const why = [
      '“Months” is a thing, not a number. In an equation a letter stands for a number. Which number don’t we know yet?',
      '',
      'We already know that: each month costs $15. Save the letter for the number we don’t know.',
      'We already know that too: Sam has paid $95. Save the letter for the number we don’t know.'
    ];
    return {
      check() { const s = ch.sel()[0]; if (s === 1) return true; ch.mark(s, 'bad'); return why[s]; },
      win: () => mx('m') + ' is the number of months, so it is a number like 3 or 10. Write it in full: “Let ' + mx('m') + ' be the number of months.” Writing just “' + mx('m') + ' = months” makes it easy to forget that it is a number.',
      won() { ch.mark(1, 'good'); ch.lock(); },
      solve() { ch.set([1]); }
    };
  }
},

/* 2 */ {
  prompt: 'Let ' + mx('m') + ' be the number of months. Build an equation that says what the story says.',
  sub: 'Drag tiles into the box, or tap them. Tap a tile in the box to remove it.',
  why: () => whyBox(stillBill(PHONE, null, { fixedCap: '+ 20', cap: mx('15 × m') }), [
    'The blue part and the yellow part together are as long as the $95 bar: ' + mx('15 × m + 20 = 95') + '.',
    'The $15 is paid ' + mx('m') + ' times, so it is multiplied by ' + mx('m') + '. The $20 is paid once, so it is added once.']),
  build: eqCard({
    v: 'm', a: 15, b: 20, c: 95,
    tiles: ['m', '15', '20', '95', '+', '×', '='],
    story: 'Sam pays $15 a month, plus a $20 setup fee. Sam has paid $95 altogether.',
    ans: ['15', '×', 'm', '+', '20', '=', '95'],
    msg: {
      noEq: 'Those tiles give what Sam pays for ' + mx('m') + ' months. An equation also needs an = sign and what the story says that amount is equal to.',
      noFixed: mx('15 × m') + ' is only what the months cost. Is anything else part of the $95?',
      slope1: 'Your equation adds ' + mx('m') + ' only once, as if each month cost $1. Each month costs $15. What do ' + mx('m') + ' months cost?',
      swap: 'Your equation charges $20 every month. Which amount is paid once, and which is paid every month?',
      addFixed: 'Your equation adds the setup fee to the $95. But the $95 already includes the fee.',
      read: 'Read it back as a story. Does one side give what Sam pays for ' + mx('m') + ' months, fee included? Is the other side the total Sam paid?'
    },
    test: (x, y) => 'Test it with ' + mx('m = ' + x) + '. From the story, ' + plural(x, 'month') + ' on this plan would cost $' + (15 * x + 20) + ', but your side gives ' + y + '.',
    win: t => mx(t.join(' ')) + ' says what the story says: $15 for each month, plus $20 once, makes $95. We usually write ' + mx('15 × m') + ' as ' + mx('15m') + ', so the equation is ' + mx('15m + 20 = 95') + '.'
  })
},

/* 3 */ {
  prompt: 'Solve ' + mx('15m + 20 = 95') + '. How many months has Sam had the plan?',
  sub: 'The bar shows the same story. The blue part is what the months cost.',
  why: () => whyBox(stillBill(PHONE, 5), [
    'The $20 was added last, so undo it first: 95 − 20 = 75. That is the blue part.',
    'The blue part is 15 × ' + mx('m') + ', so undo the × 15: 75 ÷ 15 = 5 blocks. These are the inverse operations you used in backtracking.']),
  build(stage, ctl, ctx) {
    const bar = makeBar(stage, Object.assign({ q: mx('15m') }, PHONE));
    bar.set(null);
    const ans = makeAnswer(ctl, mx('m') + ' =', ctx);
    return {
      check(attempt) {
        const v = ans.value();
        if (v === 5) return true;
        ans.mark('bad');
        if (isNaN(v)) return 'Type a whole number, using digits only.';
        if (v === 75) return '75 is what the months cost: 95 − 20 = 75. But ' + mx('m') + ' is the number of months. How many 15s make 75?';
        if (v === 95) return '95 is the total Sam paid. ' + mx('m') + ' is the number of months.';
        const p = 15 * v + 20;
        return 'Check it in the story: ' + plural(v, 'month') + ' would cost 15 × ' + v + ' + 20 = $' + p + ', not $95. ' +
          (attempt < 2 ? 'So Sam has had the plan for ' + (p > 95 ? 'fewer' : 'more') + ' months.' : 'Take off the $20 setup fee first, then work out how many 15s make what is left.');
      },
      win: () => mx('m = 5') + '. Take off the setup fee: 95 − 20 = 75. Then 75 ÷ 15 = 5. Check it in the story: 5 months at $15 is $75, plus $20 makes $95. Sam has had the plan for 5 months.',
      won() { bar.set(5); ans.mark('good'); ans.lock(); },
      solve() { ans.set(5); }
    };
  }
},

/* 4 */ {
  bridge: true,
  prompt: 'You started by saying which number ' + mx('m') + ' stands for: the number of months. That is called <b>defining the variable</b>.',
  sub: 'Write it as “Let ' + mx('m') + ' be the number of months.” Then the equation ' + mx('15m + 20 = 95') + ' has a clear meaning, and so does its solution, ' + mx('m = 5') + '.',
  show(stage) { stage.append(h(stillBill(PHONE, null, { cap: mx('m') + ' = the number of months' }))); }
},

/* 5 */ {
  prompt: 'Which equation matches this story?',
  why: () => whyBox(stillBill(TAXI, 9), [
    'The $4 is one block, paid once. Each kilometre adds one $3 block, so ' + mx('k') + ' kilometres cost ' + mx('3k') + ' dollars.',
    'It takes 9 of the $3 blocks to reach the $31 line: 3 × 9 + 4 = 27 + 4 = 31.']),
  build(stage, ctl, ctx) {
    story(stage, 'A taxi charges $4 to start, plus $3 for every kilometre. Mei’s trip cost $31. Let ' + mx('k') + ' be the number of kilometres.');
    const ch = makeChoices(ctl, [mx('4k + 3 = 31'), mx('3k = 31 + 4'), mx('3k + 4 = 31'), mx('k + 3 + 4 = 31')], ctx);
    const why = [
      mx('4k') + ' charges $4 for every kilometre. Read the story again: which amount is paid once, and which is paid for every kilometre?',
      'Mei paid $31 altogether, and that already includes the $4 start. So the kilometres cost less than $31, not 31 + 4.',
      '',
      mx('k + 3 + 4') + ' adds ' + mx('k') + ' only once, as if each kilometre cost $1. Each kilometre costs $3. What do ' + mx('k') + ' kilometres cost?'
    ];
    return {
      check() { const s = ch.sel()[0]; if (s === 2) return true; ch.mark(s, 'bad'); return why[s]; },
      win: () => mx('3k + 4 = 31') + ': $3 for each of the ' + mx('k') + ' kilometres, plus $4 once, makes $31. It solves to ' + mx('k = 9') + ', and 3 × 9 + 4 = 31 checks out.',
      won() { ch.mark(2, 'good'); ch.lock(); },
      solve() { ch.set([2]); }
    };
  }
},

/* 6 */ {
  prompt: 'Jo starts with “' + mx('v') + ' = visits”. What should Jo write instead?',
  why: () => whyBox(stillBill(GYM, 3), [
    'Try a number. If Jo had made 3 visits, then ' + mx('v = 3') + ' and ' + mx('6v') + ' is 6 × 3 = 18 dollars: three $6 blocks.',
    'So ' + mx('6v') + ' is money. Writing “' + mx('v') + ' = visits” would make it read as “6 visits”, which is not what the blocks show.']),
  build(stage, ctl, ctx) {
    story(stage, 'A gym pass has a $10 joining fee, then costs $6 for each visit. Jo has paid $64 so far.');
    const ch = makeChoices(ctl, ['Let ' + mx('v') + ' be the number of visits Jo has made', 'Let ' + mx('v') + ' be the gym', 'Let ' + mx('v') + ' be the cost of one visit', '“' + mx('v') + ' = visits” is fine as it is'], ctx);
    const why = [
      '',
      'The gym is a place, not a number. In an equation a letter has to stand for a number.',
      'We already know that: one visit costs $6. Save the letter for the number we don’t know.',
      '“Visits” is a thing, not a number. It tempts you to read ' + mx('6v') + ' as “6 visits”. But ' + mx('6v') + ' means 6 × the number of visits: the dollars Jo paid for visits.'
    ];
    return {
      check() { const s = ch.sel()[0]; if (s === 0) return true; ch.mark(s, 'bad'); return why[s]; },
      win: () => '“Let ' + mx('v') + ' be the number of visits.” Now ' + mx('6v') + ' clearly means 6 × the number of visits, the dollars Jo paid for visits. The equation is ' + mx('6v + 10 = 64') + '.',
      won() { ch.mark(0, 'good'); ch.lock(); },
      solve() { ch.set([0]); }
    };
  }
},

/* 7 */ {
  prompt: 'Jo’s equation is ' + mx('6v + 10 = 64') + '. Drag ' + mx('v') + ' until the bill matches $64.',
  sub: 'Each blue block is one visit at $6.',
  why: () => whyBox(stillBill(GYM, 9) +
    '<table class="wt"><tr><th>' + mx('v') + '</th><td>8</td><td class="ok">9</td><td>10</td></tr><tr><th>' + mx('6v + 10') + '</th><td>58</td><td class="ok">64</td><td>70</td></tr></table>', [
    'Each extra visit adds $6 to the bill, so it equals $64 for only one value: ' + mx('v = 9') + '. That makes 9 the solution.']),
  build(stage, ctl, ctx) {
    let v = 3;
    const bar = makeBar(stage, Object.assign({ max: 82 }, GYM)), live = h('<div class="live"></div>');
    stage.append(live);
    function draw() {
      bar.set(v);
      live.innerHTML = mx('6v + 10') + '<small>6 × ' + v + ' + 10 = <b>' + (6 * v + 10) + '</b> dollars</small>';
    }
    const sl = makeSlider(ctl, 'v', 1, 12, v, n => { v = n; draw(); ctx.touch(true); });
    draw();
    return {
      check() {
        const p = 6 * v + 10;
        return v === 9 ? true : 'If ' + mx('v = ' + v) + ', Jo has paid 6 × ' + v + ' + 10 = $' + p + '. That is ' + (p < 64 ? 'less' : 'more') + ' than $64, so Jo made ' + (p < 64 ? 'more' : 'fewer') + ' visits.';
      },
      win: () => '6 × 9 + 10 = 54 + 10 = 64, so ' + mx('v = 9') + ' fits the equation.',
      won() { $('input', ctl).disabled = true; },
      solve() { sl.set(9); },
      recap: () => mx('6v + 10 = 64') + ' is true when ' + mx('v = 9') + ': Jo had made 9 visits.'
    };
  },
  then: {
    prompt: 'Later, Jo has paid $82 altogether. Now ' + mx('6v + 10 = 82') + '. How many visits has Jo made?',
    sub: 'No slider this time. The pass is the same: $10 to join, then $6 for each visit.',
    why: () => whyBox(stillBill(GYM, 12, { total: 82, totalCap: '$82 paid' }), [
      'From $64 to $82 is $18 more. At $6 a visit, that is 18 ÷ 6 = 3 more visits: 9 + 3 = 12.',
      'Check by substitution: 6 × 12 + 10 = 72 + 10 = 82.']),
    build(stage, ctl, ctx) {
      stage.replaceChildren();
      const bar = makeBar(stage, Object.assign({ max: 82, q: '?' }, GYM, { total: 82, totalCap: '$82 paid' }));
      bar.set(null);
      const live = h('<div class="live">' + mx('6v + 10 = 82') + '</div>');
      stage.append(live);
      const ans = makeAnswer(ctl, mx('v') + ' =', ctx);
      return {
        check(attempt) {
          const v = ans.value();
          if (v === 12) return true;
          ans.mark('bad');
          if (isNaN(v)) return 'Type a whole number, using digits only.';
          if (v === 72) return '72 is what the visits cost: 82 − 10 = 72. But ' + mx('v') + ' is the number of visits. How many 6s make 72?';
          if (v === 82) return '82 is the total Jo has paid. ' + mx('v') + ' is the number of visits.';
          if (v === 3) return '3 is how many more visits Jo has made: 82 − 64 = 18, and 18 ÷ 6 = 3. Add them to the 9 visits Jo had already made.';
          if (v === 18) return '18 is how many more dollars Jo has paid: 82 − 64 = 18. ' + mx('v') + ' is the number of visits altogether.';
          const p = 6 * v + 10;
          return 'Check it in the story: ' + plural(v, 'visit') + ' would cost 6 × ' + v + ' + 10 = $' + p + ', not $82. ' +
            (attempt < 2 ? 'So Jo has made ' + (p > 82 ? 'fewer' : 'more') + ' visits.' : 'Backtrack: take off the $10 joining fee, then work out how many 6s make what is left.');
        },
        win: () => mx('v = 12') + '. Backtrack from 82: 82 − 10 = 72, then 72 ÷ 6 = 12. A new total gives a new equation, and a new solution: Jo has made 12 visits.',
        won() { bar.set(12); live.innerHTML = mx('6v + 10') + '<small>6 × 12 + 10 = <b>82</b> dollars</small>'; ans.mark('good'); ans.lock(); },
        solve() { ans.set(12); }
      };
    }
  }
},

/* 8 */ {
  prompt: 'Jo’s equation gives ' + mx('v = 9') + '. What does that tell you?',
  why: () => whyBox(stillBill(GYM, 9), [
    'Count the blue blocks. There are 9, one for each visit, so ' + mx('v = 9') + ' is a number of visits.',
    'The money is written on the blocks: $6 each, $64 altogether. Nothing in the story is $9, or 9 weeks.']),
  build(stage, ctl, ctx) {
    makeBar(stage, Object.assign({ max: 64 }, GYM)).set(9);
    const ch = makeChoices(ctl, ['Jo has been to the gym 9 times.', 'Jo has paid $9.', 'Each visit costs $9.', 'Jo has been a member for 9 weeks.'], ctx);
    const why = [
      '',
      'Jo has paid $64. Here ' + mx('v') + ' is not an amount of money. Go back to what ' + mx('v') + ' stands for.',
      'Each visit costs $6. The story told us that. ' + mx('v') + ' stands for something else.',
      'The story never mentions weeks. Go back to what ' + mx('v') + ' stands for.'
    ];
    return {
      check() { const s = ch.sel()[0]; if (s === 0) return true; ch.mark(s, 'bad'); return why[s]; },
      win: () => mx('v') + ' is the number of visits, so Jo has been to the gym 9 times. An answer means something only once you say it back in the story. That is why you write down what the letter stands for.',
      won() { ch.mark(0, 'good'); ch.lock(); },
      solve() { ch.set([0]); },
      recap: () => mx('v = 9') + ' means Jo has been to the gym 9 times.'
    };
  },
  then: {
    prompt: 'Now look at the blue part of the bar. What does ' + mx('6v') + ' stand for when ' + mx('v = 9') + '?',
    reset: false,
    why: () => whyBox(stillBill(GYM, 9, { ncap: mx('6v') + ' = 6 × 9 = 54' }), [
      'There are 9 blue blocks and each one is $6, so the blue part is 6 × 9 = $54.',
      mx('v') + ' counts the blocks. ' + mx('6v') + ' is the money in them.']),
    build(stage, ctl, ctx) {
      const ch = makeChoices(ctl, ['6 visits', 'The $54 Jo paid for visits', 'The number 69', 'The $64 Jo paid altogether'], ctx);
      const why = [
        mx('6v') + ' means 6 × ' + mx('v') + '. The 6 is the dollars for one visit, so ' + mx('6v') + ' is an amount of money, not a number of visits.',
        '',
        'Substituting 9 doesn’t put the 9 next to the 6. ' + mx('6v') + ' means 6 × ' + mx('v') + ', so work out 6 × 9.',
        '$64 is the whole bill, with the $10 joining fee included. ' + mx('6v') + ' is only the blue part of the bar.'
      ];
      return {
        check() { const s = ch.sel()[0]; if (s === 1) return true; ch.mark(s, 'bad'); return why[s]; },
        win: () => mx('6v') + ' is 6 × 9 = 54: the dollars Jo paid for 9 visits. Add the $10 joining fee and you get the $64.',
        won() { ch.mark(1, 'good'); ch.lock(); },
        solve() { ch.set([1]); }
      };
    }
  }
},

/* 9 */ {
  bridge: true,
  prompt: 'You turned ' + mx('v = 9') + ' back into words: Jo has been to the gym 9 times. Saying what a solution means in the story is called <b>interpreting</b> it.',
  sub: 'Look back at how you defined the variable. It tells you what the solution counts.',
  show(stage) { stage.append(h(stillBill(GYM, 9, { ncap: mx('v = 9') + ': 9 visits' }))); }
},

/* 10 */ {
  prompt: 'Let ' + mx('w') + ' be the number of weeks Tia has been saving. Write an equation for the story.',
  sub: 'Use the tiles. Tap a tile in the box to remove it.',
  why: () => whyBox(stillBill(SAVE, null, { fixedCap: '+ 25', cap: mx('8 × w') }), [
    'Tia’s $81 is made of two parts: the $25 she had, and $8 for each of the ' + mx('w') + ' weeks.',
    'The weekly $8 is multiplied by ' + mx('w') + '. The $25 is there once, so it is added once: ' + mx('8 × w + 25 = 81') + '.']),
  build: eqCard({
    v: 'w', a: 8, b: 25, c: 81,
    tiles: ['w', '8', '25', '81', '+', '×', '='],
    story: 'Tia had $25. Since then she has saved $8 every week. Now she has $81.',
    ans: ['8', '×', 'w', '+', '25', '=', '81'],
    msg: {
      noEq: 'Those tiles give how much Tia has after ' + mx('w') + ' weeks. An equation also needs an = sign and what the story says that amount is equal to.',
      noFixed: mx('8 × w') + ' is only what Tia has saved since she started. Is anything else part of the $81?',
      slope1: 'Your equation adds ' + mx('w') + ' only once, as if she saved $1 a week. She saves $8 each week. How much is that over ' + mx('w') + ' weeks?',
      swap: 'Your equation saves $25 every week. Which amount does Tia save each week, and which did she start with?',
      addFixed: 'Your equation adds the $25 she started with to the $81. But the $81 already includes it.',
      read: 'Read it back as a story. Does one side give what Tia has after ' + mx('w') + ' weeks, starting money included? Is the other side what she has now?'
    },
    test: (x, y) => 'Test it with ' + mx('w = ' + x) + '. From the story, after ' + plural(x, 'week') + ' Tia would have $' + (8 * x + 25) + ', but your side gives ' + y + '.',
    win: t => mx(t.join(' ')) + ' matches the story. In short: ' + mx('8w + 25 = 81') + '. The order of the parts doesn’t matter: ' + mx('25 + 8w = 81') + ' says the same thing.'
  })
},

/* 11 */ {
  prompt: 'Solve ' + mx('8w + 25 = 81') + '. How many weeks has Tia been saving?',
  why: () => whyBox(stillBill(SAVE, 7), [
    'The $25 was added last, so undo it first: 81 − 25 = 56. That is the blue part.',
    'The blue part is 8 × ' + mx('w') + ', so undo the × 8: 56 ÷ 8 = 7 blocks, one for each week.']),
  build(stage, ctl, ctx) {
    story(stage, 'Tia had $25. Since then she has saved $8 every week. Now she has $81.');
    const ans = makeAnswer(ctl, mx('w') + ' =', ctx);
    return {
      check(attempt) {
        const v = ans.value();
        if (v === 7) return true;
        ans.mark('bad');
        if (isNaN(v)) return 'Type a whole number, using digits only.';
        if (v === 56) return '56 is what Tia saved: 81 − 25 = 56. But ' + mx('w') + ' is the number of weeks. How many 8s make 56?';
        if (v === 81) return '81 is how much Tia has now. ' + mx('w') + ' is the number of weeks.';
        const p = 8 * v + 25;
        return 'Check it in the story: after ' + plural(v, 'week') + ' Tia would have 8 × ' + v + ' + 25 = $' + p + ', not $81. ' +
          (attempt < 2 ? 'So she has been saving for ' + (p > 81 ? 'fewer' : 'more') + ' weeks.' : 'Take off the $25 she started with, then work out how many 8s make what is left.');
      },
      win: () => mx('w = 7') + '. Take off the $25 she started with: 81 − 25 = 56. Then 56 ÷ 8 = 7. Check: 7 weeks at $8 is $56, plus $25 makes $81. Tia has been saving for 7 weeks.',
      won() { ans.mark('good'); ans.lock(); },
      solve() { ans.set(7); },
      recap: () => mx('8w + 25 = 81') + ' gives ' + mx('w = 7') + ': Tia has been saving for 7 weeks.'
    };
  },
  then: {
    prompt: 'Tia keeps saving. How much will she have when ' + mx('w = 10') + '?',
    sub: 'The left side of her equation, ' + mx('8w + 25') + ', is what she has after ' + mx('w') + ' weeks.',
    why: () => whyBox(stillBill(SAVE, 10, { total: 105, totalCap: '$105 after 10 weeks' }), [
      'Ten weeks is 3 more than 7, so Tia has 3 × 8 = $24 more than $81: 81 + 24 = 105.',
      'Substitution gives the same amount: 8 × 10 + 25 = 80 + 25 = 105.']),
    build(stage, ctl, ctx) {
      const ans = makeAnswer(ctl, 'After 10 weeks Tia has $', ctx);
      return {
        check(attempt) {
          const v = ans.value();
          if (v === 105) return true;
          ans.mark('bad');
          if (isNaN(v)) return 'Type a whole number, using digits only.';
          if (v === 80) return '$80 is only what she saves in 10 weeks: 8 × 10 = 80. Add the $25 she started with.';
          if (v === 835) return 'With ' + mx('w = 10') + ', ' + mx('8w') + ' means 8 × 10 = 80, not 810. Then add the 25.';
          if (v === 43) return '10 + 8 + 25 adds the 10. Ten weeks at $8 a week is 8 × 10.';
          if (v === 258) return '25 × 10 + 8 saves $25 every week. Tia saves $8 every week and had the $25 once.';
          if (v === 161) return 'That is 10 more weeks on top of the $81. ' + mx('w = 10') + ' means 10 weeks since she started, so work out 8 × 10 + 25.';
          if (v === 81) return '$81 is what Tia has after 7 weeks. Work it out for ' + mx('w = 10') + '.';
          if (v === 10) return '10 is the number of weeks. The question asks for the dollars Tia has then.';
          return attempt < 2 ? 'Substitute 10 for ' + mx('w') + ' in ' + mx('8w + 25') + '.' : 'Work out 8 × 10 first, what she saves in 10 weeks. Then add the $25 she started with.';
        },
        win: () => '$105. Substituting ' + mx('w = 10') + ' gives 8 × 10 + 25 = 80 + 25 = 105. The expression ' + mx('8w + 25') + ' gives Tia’s savings for any number of weeks.',
        won() { ans.mark('good'); ans.lock(); },
        solve() { ans.set(105); }
      };
    }
  }
},

/* 12 */ {
  prompt: 'Let ' + mx('p') + ' be the price of one pizza, in dollars. Write an equation for the story.',
  why: () => whyBox(stillBar({ max: 54, total: 54, totalCap: '$54 for the order', label: '$6 delivery plus 4 equal blocks of unknown size, compared with $54 for the order.',
    cells: [['f', 6, '$6'], ['q', 12, '?'], ['q', 12, '?'], ['q', 12, '?'], ['q', 12, '?']], caps: [[6, '+ 6'], [48, '4 pizzas at ' + mx('p') + ' dollars each: ' + mx('4 × p')]] }), [
    'Four equal pizza blocks and one $6 delivery block make $54: ' + mx('4 × p + 6 = 54') + '.',
    'This time you know how many blocks there are. The letter is the dollars in each block.']),
  build: eqCard({
    v: 'p', a: 4, b: 6, c: 54,
    tiles: ['p', '4', '6', '54', '+', '×', '='],
    story: 'Ravi orders 4 pizzas that all cost the same. Delivery is $6. The whole order costs $54.',
    ans: ['4', '×', 'p', '+', '6', '=', '54'],
    msg: {
      noEq: 'Those tiles give what the order costs. An equation also needs an = sign and what the story says that amount is equal to.',
      noFixed: mx('4 × p') + ' is only what the pizzas cost. Is anything else part of the $54?',
      slope1: 'Your equation adds ' + mx('p') + ' only once, as if there were one pizza. How many pizzas did Ravi order, and what do they cost?',
      swap: 'Your equation is 6 pizzas plus $4. How many pizzas are there, and what is paid once?',
      addFixed: 'Your equation adds delivery to the $54. But the $54 already includes delivery.',
      read: 'Read it back as a story. Does one side give the cost of the whole order, delivery included? Is the other side what the order cost?'
    },
    test: (x, y) => 'Test it with ' + mx('p = ' + x) + '. From the story, four $' + x + ' pizzas plus delivery would cost $' + (4 * x + 6) + ', but your side gives ' + y + '.',
    win: t => mx(t.join(' ')) + ' matches the story, or ' + mx('4p + 6 = 54') + ' in short. This time the letter is a price, not a count. It is still a number: the dollars for one pizza.'
  })
},

/* 13 */ {
  prompt: 'Leo solved ' + mx('4p + 6 = 54') + ' and got ' + mx('p = 15') + '. Check Leo’s answer in the story.',
  why: () => whyBox(stillBar({ max: 66, total: 54, totalCap: '$54 for the order', label: '$6 delivery plus 4 blocks of $15 make $66, which is longer than the $54 bar.',
    cells: [['f', 6, '$6'], ['u', 15, '$15'], ['u', 15, '$15'], ['u', 15, '$15'], ['u', 15, '$15']], caps: [[6, '+ 6'], [60, '4 × 15 = 60']] }), [
    'With $15 pizzas the order runs $12 past the $54 line: 4 × 15 + 6 = 66.',
    '15 is what you get by adding the $6 instead of undoing it: ' + nb('(54 + 6) ÷ 4 = 15.') + ' The inverse of ' + nb('+ 6') + ' is ' + nb('− 6') + ': ' + nb('(54 − 6) ÷ 4 = 12.')]),
  build(stage, ctl, ctx) {
    story(stage, 'Ravi orders 4 pizzas that all cost the same. Delivery is $6. The whole order costs $54.');
    const ans = makeAnswer(ctl, 'Four $15 pizzas plus $6 delivery cost $', ctx);
    return {
      check(attempt) {
        const v = ans.value();
        if (v === 66) return true;
        ans.mark('bad');
        if (isNaN(v)) return 'Type a whole number, using digits only.';
        if (v === 60) return 'That is the 4 pizzas: 4 × 15 = 60. Add the $6 delivery.';
        if (v === 54) return '$54 is what the story says the order cost. Work out what Leo’s answer would make it cost.';
        if (v === 25) return '15 + 4 + 6 adds the 4. Four pizzas at $15 each cost 4 × 15.';
        if (v === 21) return '15 + 6 is one pizza and delivery. There are 4 pizzas.';
        return attempt < 2 ? 'Work out 4 pizzas at $15 each, then add the $6 delivery.' : 'First work out 4 × 15, the cost of the pizzas. Then add the $6 delivery.';
      },
      win: () => '$66. But the order cost $54, so ' + mx('p = 15') + ' doesn’t fit the story, and Leo has made a mistake. The answer is ' + mx('p = 12') + ': 4 × 12 + 6 = 48 + 6 = 54.',
      won() { ans.mark('good'); ans.lock(); },
      solve() { ans.set(66); }
    };
  }
},

/* 14 */ {
  prompt: 'Four students solved stories from this lesson. Tap every answer that checks out.',
  sub: 'Put each answer back into its equation.',
  why: () => '<table class="wt rows">' +
    '<tr><th>Phone plan, ' + mx('m = 5') + '</th><td>15 × 5 + 20 = 95</td><td class="ok">equals 95</td></tr>' +
    '<tr><th>Gym, ' + mx('v = 10') + '</th><td>6 × 10 + 10 = 70</td><td class="no">not 64</td></tr>' +
    '<tr><th>Taxi, ' + mx('k = 9') + '</th><td>3 × 9 + 4 = 31</td><td class="ok">equals 31</td></tr>' +
    '<tr><th>Savings, ' + mx('w = 8') + '</th><td>8 × 8 + 25 = 89</td><td class="no">not 81</td></tr></table>' +
    '<p class="why-ln">Substitution tests any answer: put the number where the letter is and work out the left side. It is the solution only if you get the right side.</p>' +
    '<p class="why-ln">The gym solution is ' + mx('v = 9') + ' and the savings solution is ' + mx('w = 7') + '.</p>',
  build(stage, ctl, ctx) {
    stage.hidden = true;
    const ch = makeChoices(ctl, [
      'Phone plan: ' + mx('15m + 20 = 95') + '<br>Answer: ' + mx('m = 5'),
      'Gym: ' + mx('6v + 10 = 64') + '<br>Answer: ' + mx('v = 10'),
      'Taxi: ' + mx('3k + 4 = 31') + '<br>Answer: ' + mx('k = 9'),
      'Savings: ' + mx('8w + 25 = 81') + '<br>Answer: ' + mx('w = 8')
    ], ctx, true);
    const why = { 1: 'Gym: 6 × 10 + 10 = 70, but Jo paid $64.', 3: 'Savings: 8 × 8 + 25 = 89, but Tia has $81.' };
    return {
      check() {
        const s = ch.sel(), bad = s.filter(i => why[i]);
        if (bad.length) { bad.forEach(i => ch.mark(i, 'bad')); return bad.map(i => why[i]).join(' ') + (bad.length === 1 ? ' That answer doesn’t' : ' Those answers don’t') + ' fit the story.'; }
        if (s.includes(0) && s.includes(2)) return true;
        return 'Another answer checks out too. Put each answer you didn’t tap back into its equation.';
      },
      win: () => mx('m = 5') + ' and ' + mx('k = 9') + ' check out. The gym answer gives $70, not $64, and the savings answer gives $89, not $81. Putting the answer back into the story is the quickest way to catch a mistake.',
      won() { ch.mark(0, 'good'); ch.mark(2, 'good'); ch.lock(); },
      solve() { ch.set([0, 2]); }
    };
  }
},

/* 15 */ {
  prompt: 'A plumber charges a $40 call-out fee plus $25 for each hour. The bill was $140. Who is right?',
  sub: 'Three students write an equation. Choose Agree or Disagree for each one.',
  why: () => whyBox(stillBill(PLUMB, 4), [
    'One $40 block, paid once, and a $25 block for each hour. Four of them reach $140: ' + nb('40 + 25 × 4 = 140') + ', so ' + mx('h = 4') + '.',
    mx('25h') + ' is the blue part: 25 × 4 = $100. It is money, not “25 hours”, and the $40 is never multiplied by ' + mx('h') + '.']),
  build(stage, ctl, ctx) {
    stage.hidden = true;
    const claims = [
      { who: 'Mia', say: '“Let ' + mx('h') + ' stand for hours. ' + mx('25h + 40 = 140') + ', and ' + mx('25h') + ' means 25 hours.”', agree: false, hint: 'Mia: what does ' + mx('25h') + ' mean if ' + mx('h') + ' is a number?', why: mx('h') + ' must be a number: the number of hours. Then ' + mx('25h') + ' is the dollars for the hours.' },
      { who: 'Jai', say: '“Let ' + mx('h') + ' be the number of hours. ' + mx('40h + 25 = 140') + '.”', agree: false, hint: 'Jai: which amount is paid once, and which is paid every hour?', why: '$40 is paid once and $25 every hour, so the hours cost ' + mx('25h') + ', not ' + mx('40h') + '.' },
      { who: 'Ava', say: '“Let ' + mx('h') + ' be the number of hours. ' + mx('40 + 25h = 140') + '. Then ' + mx('h = 4') + ', and 40 + 25 × 4 = 140 checks out.”', agree: true, hint: 'Ava: substitute her answer into her equation. Is it true, and does her equation match the story?', why: 'She named the number, wrote the equation, solved it and checked it.' }
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
      win: () => 'Ava has it. Mia’s letter stands for a thing, “hours”, not a number. Jai mixed up the amount paid once and the amount paid every hour. Name the number, write the equation, solve it, check it.',
      won() { locked = true; claims.forEach((c, i) => { rows[i].row.classList.remove('bad'); explain(i, 'good'); rows[i].btns.forEach(b => { b.disabled = true; }); }); },
      solve() { claims.forEach((c, i) => { pick[i] = c.agree; paint(i); }); }
    };
  }
}
];

const SECTIONS = [[0, 'Phone plan'], [3, 'Match it'], [5, 'Gym pass'], [8, 'Write it'], [12, 'Check it'], [14, 'Wrap-up']];

// Finish screen: sets the prompt, sub-line and recap for this lesson.
function drawFinish() {
  promptEl.textContent = 'Name it, write it, solve it, check it.';
  subEl.hidden = false; subEl.textContent = 'Four things to remember about equations from stories:';
  ctl.replaceChildren(); stage.hidden = false;
  const t = (k, s) => '<span class="tile ' + k + ' still">' + s + '</span>';
  stage.replaceChildren(h('<ul class="recap">' +
    '<li><span class="art">' + t('var', 'm') + '</span><span>Name the unknown as a number: “Let ' + mx('m') + ' be the number of months.” A letter never stands for a thing like “months”.</span></li>' +
    '<li><span class="art">' + t('num', '15') + t('op', '×') + t('var', 'm') + '</span><span>Write what the story says. An amount paid each time is multiplied by the letter. An amount paid once is added: ' + mx('15m + 20 = 95') + '.</span></li>' +
    '<li><span class="art">' + t('op', '=') + t('num', '5') + '</span><span>Solve by undoing: take off the amount paid once, then divide. 95 − 20 = 75, and 75 ÷ 15 = 5.</span></li>' +
    '<li><span class="art">' + t('num', '95') + '</span><span>Check the answer in the story: 15 × 5 + 20 = 95. Then say what it means: Sam has had the plan for 5 months.</span></li></ul>'));
}
