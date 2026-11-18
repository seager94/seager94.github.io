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
    // Still picture: a number (or nothing) in each slot, with no run.
    show(a, b) { put(inS, a == null ? null : numTile(a)); put(outS, b == null ? null : numTile(b)); },
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

/* ---------- Why? panels and bridge pictures: the card's diagram, small and still ---------- */
// A picture (w rem wide at most) beside one or two lines of working.
const whyBox = (pic, w, lines) => '<div class="wy"><div class="wy-pic" style="flex-basis:' + w + 'rem">' + pic + '</div><div class="wy-txt">' +
  lines.map(l => '<p>' + l + '</p>').join('') + '</div></div>';
// SVG text: single lower-case letters become variables.
const sT = s => String(s).split(' ').map(t => /^[a-z]$/.test(t) ? '<tspan class="sv">' + t + '</tspan>' : t).join(' ');
// A row of bags and loose marbles, each with a caption under it. plus = true writes + between the captions.
function objRow(items, label, plus) {
  let x = 0, out = '';
  items.forEach((it, k) => {
    if (k) { if (plus) out += '<text class="st" x="' + (x + 11) + '" y="97" text-anchor="middle">+</text>'; x += 22; }
    const w = it.bag ? 66 : Math.max(it.n * 24, 30);
    if (it.bag) out += bagG(x + 2, 4, it.bag);
    else for (let j = 0; j < it.n; j++) out += marbleG(x + 12 + j * 24, 61, 10.5);
    out += '<text class="st" x="' + (x + w / 2) + '" y="97" text-anchor="middle">' + sT(it.cap) + '</text>';
    x += w;
  });
  return '<svg class="wy-svg" viewBox="-4 -8 ' + (x + 8) + ' 114" role="img" aria-label="' + label + '">' + out + '</svg>';
}
const objW = (bags, loose) => ((bags * 66 + (loose ? Math.max(loose * 24, 30) + 22 : 0) + (bags - 1) * 22 + 8) * 0.068).toFixed(1);
// A balanced scale with its two sides labelled.
function stillScale(L, R, l, r) {
  const d = document.createElement('div');
  const sc = makeScale(d);
  sc.update(L, R); sc.bar(l, '=', r, true);
  return d.innerHTML;
}
// The tile row: n blue tiles between two yellow end tiles. big = true draws a long row with a gap in it.
function patSvg(n, big) {
  const S = 26, G = 4;
  let x = 0, out = '';
  const sq = c => { out += '<rect class="ps-' + c + '" x="' + x + '" y="0" width="' + S + '" height="' + S + '" rx="5"/>'; x += S + G; };
  sq('e');
  const x0 = x;
  if (big) { sq('n'); sq('n'); sq('n'); out += '<text class="st" x="' + (x + 13) + '" y="19" text-anchor="middle">…</text>'; x += 30; sq('n'); sq('n'); sq('n'); }
  else for (let k = 0; k < n; k++) sq('n');
  const x1 = x - G, xe = x;
  sq('e');
  out += '<path class="ps-br" d="M' + x0 + ' 32 v4 q0 4 4 4 H' + (x1 - 4) + ' q4 0 4 -4 v-4"/>' +
    '<text class="st" x="13" y="60" text-anchor="middle">1</text><text class="st" x="' + (xe + 13) + '" y="60" text-anchor="middle">1</text>' +
    '<text class="st" x="' + (x0 + x1) / 2 + '" y="60" text-anchor="middle">' + sT('n = ' + n) + '</text>';
  return '<svg class="wy-svg" viewBox="-3 -3 ' + (x - G + 6) + ' 70" role="img" aria-label="' + plural(n, 'blue tile') + ' between two yellow end tiles">' + out + '</svg>';
}
// The machine with one number going in and one coming out. capA and capB are optional notes under the slots.
function stillMach(a, b, capA, capB) {
  const slot = (w, v, c) => '<div class="m-slot"><span class="cap">' + w + '</span><span class="tile num still">' + v + '</span>' + (c ? '<span class="cap under">' + c + '</span>' : '') + '</div>';
  return '<div class="mach' + (capA || capB ? ' capped' : '') + '" role="img" aria-label="' + a + ' goes in, ' + b + ' comes out">' + slot('in', a, capA) + '<div class="m-pipe"></div><div class="m-body">' + GEAR + '</div><div class="m-pipe"></div>' + slot('out', b, capB) + '</div>';
}

/* ---------- cards ---------- */
// A balance where one slider sets every bag (cards 2 and 4).
function sliderScale(cfg) {
  return function (stage, ctl, ctx) {
    let b = cfg.start;
    const sc = makeScale(stage);
    const row = v => Array(cfg.nb).fill(v).concat(cfg.loose ? [cfg.loose] : []).join(' + ');
    const sum = v => cfg.nb * v + cfg.loose;
    function draw() {
      const ok = sum(b) === cfg.right;
      sc.update({ bags: Array.from({ length: cfg.nb }, () => ({ tag: 'b', inside: b })), loose: cfg.loose, weight: sum(b) }, { loose: cfg.right, weight: cfg.right });
      sc.bar(mx(row('b')) + '<small>' + row(b) + ' = ' + sum(b) + '</small>', ok ? '=' : '≠', mx(cfg.right) + '<small>marbles</small>', ok);
    }
    const sl = makeSlider(ctl, 'b', 0, 10, b, v => { b = v; draw(); ctx.touch(true); });
    draw();
    return { check: () => b === cfg.ans ? true : cfg.wrong(b, sum(b)), win: cfg.win, solve: () => sl.set(cfg.ans), recap: cfg.recap };
  };
}

const cards = [

/* 1 */ {
  prompt: 'A bag of marbles is on the scale. How many marbles are inside?',
  sub: 'Like coins in a sealed money box, the number in this bag can be found without opening it. Add marbles to the other side until the scale balances. Every marble weighs the same, and the bag itself weighs nothing.',
  why: () => whyBox(stillScale({ bags: [{ inside: 6 }], weight: 6 }, { loose: 6, weight: 6 }, '1 bag<small>6 marbles inside</small>', mx('6') + '<small>marbles</small>'), 17, [
    'A level scale means both sides hold the same amount.',
    'The right side has 6 marbles, so the bag has 6 marbles too.'
  ]),
  build(stage, ctl, ctx) {
    const BAG = 6, MAX = 12;
    let n = 0, open = false;
    const add = () => { if (n < MAX) { n++; draw(); ctx.touch(true); } };
    const take = () => { if (n > 0) { n--; draw(); ctx.touch(true); } };
    const sc = makeScale(stage, { dropRight: true, onRemove: take });
    const tray = h('<div class="tray"><button type="button" class="src" id="add-marble">' + SVG_MARBLE + '<span>Add a marble<small>drag it onto the scale, or tap</small></span></button>' +
      '<button type="button" class="linkbtn" id="take-marble">Take one off</button></div>');
    ctl.append(tray);
    const addBtn = $('#add-marble', tray);
    addBtn.onclick = add;
    draggable(addBtn, { accept: ['pan'], ghost: () => SVG_MARBLE, onDrop: add });
    $('#take-marble', tray).onclick = take;
    function draw() {
      sc.update({ bags: [open ? { inside: BAG } : { body: '?' }], weight: BAG }, { loose: n, weight: n, removable: true });
      sc.bar('1 bag', n === BAG ? 'balanced' : '', plural(n, 'marble'), n === BAG, true);
    }
    draw();
    return {
      check() {
        if (n === BAG) return true;
        if (n === 0) return 'The right side is empty. Add marbles until the scale sits level.';
        return n < BAG ? 'The bag side is still lower, so the bag holds more than ' + plural(n, 'marble') + '.'
                       : 'The marble side is lower now, so the bag holds fewer than ' + n + ' marbles.';
      },
      win: () => 'The scale balances with 6 marbles, so the bag holds 6. The number was there the whole time. You just couldn’t see it.',
      won() { open = true; draw(); },
      solve() { n = BAG; draw(); }
    };
  }
},

/* 2 */ {
  prompt: 'This bag holds a number of marbles we don’t know yet. Call that number ' + mx('b') + '.',
  sub: 'Drag the slider to try different values of ' + mx('b') + '. Which value makes the scale balance?',
  why: () => whyBox(stillScale({ bags: [{ inside: 5 }], loose: 2, weight: 7 }, { loose: 7, weight: 7 }, mx('b + 2') + '<small>5 + 2 = 7</small>', mx('7') + '<small>marbles</small>'), 17, [
    'Cover the 2 loose marbles on the left. The bag has to match what is left of the 7: ' + mx('7 − 2 = 5') + '.',
    'So ' + mx('b = 5') + '. With 4 or 6 in the bag, the scale tips.'
  ]),
  build: sliderScale({
    nb: 1, loose: 2, right: 7, start: 1, ans: 5,
    wrong: (b, s) => 'If ' + mx('b') + ' is ' + b + ', the left side holds ' + b + ' + 2 = ' + s + ' marbles. The right side holds 7, so the left is too ' + (s > 7 ? 'heavy' : 'light') + '.',
    win: () => mx('b = 5') + ', because 5 + 2 = 7. Only one value makes this scale balance. A letter used like this is often called an unknown.'
  })
},

/* 3 */ {
  prompt: 'In that problem, what did ' + mx('b') + ' stand for?',
  why: () => whyBox(objRow([{ bag: { inside: 5 }, cap: 'b = 5' }], 'A see-through bag holding 5 marbles, b = 5'), 6.5, [
    'The bag is a thing. ' + mx('b') + ' is how many marbles are in it: here, 5.',
    'You can add 2 to a number: ' + mx('5 + 2 = 7') + '. You can’t add 2 to a bag or to a word.'
  ]),
  build(stage, ctl, ctx) {
    stage.append(h('<svg class="pic" viewBox="-8 -12 82 88" role="img" aria-label="A bag with a tag that says b">' + bagG(0, 0, { tag: 'b', body: '?' }) + '</svg>'));
    const ch = makeChoices(ctl, ['The bag', 'The number of marbles in the bag', 'The word “bag”, shortened', 'The weight of one marble'], ctx);
    const why = [
      'Close, but ' + mx('b') + ' is not the bag itself. In algebra a letter stands for a number. Which number was hidden here?',
      '',
      'The letter b was picked because “bag” starts with b, but it isn’t an abbreviation. A letter in algebra stands for a number.',
      'We never needed the weight of a marble. The slider changed how many marbles were inside the bag.'
    ];
    return {
      check() { const s = ch.sel()[0]; if (s === 1) return true; ch.mark(s, 'bad'); return why[s]; },
      win: () => mx('b') + ' stood for the number of marbles in the bag. In algebra a letter always stands for a number. It is never the object itself or a shortened word.',
      won() { ch.mark(1, 'good'); ch.lock(); },
      solve() { ch.set([1]); }
    };
  }
},

/* 4 */ {
  prompt: 'Both bags are labelled ' + mx('b') + ', so they hold the same number. Find ' + mx('b') + '.',
  sub: 'One slider changes both bags at once.',
  why: () => whyBox(stillScale({ bags: [{ inside: 4 }, { inside: 4 }], weight: 8 }, { loose: 8, weight: 8 }, mx('b + b') + '<small>4 + 4 = 8</small>', mx('8') + '<small>marbles</small>'), 17, [
    'The two bags hold the same number, so share the 8 marbles equally: 4 in each.',
    mx('b = 4') + '. No other value works: ' + mx('3 + 3 = 6') + ' and ' + mx('5 + 5 = 10') + '.'
  ]),
  build: sliderScale({
    nb: 2, loose: 0, right: 8, start: 1, ans: 4,
    wrong: (b, s) => 'If ' + mx('b') + ' is ' + b + ', the two bags hold ' + b + ' + ' + b + ' = ' + s + ' marbles. You need 8.',
    win: () => mx('b = 4') + ', because 4 + 4 = 8. Inside one problem, the same letter always means the same number, so the two bags could not hold different amounts.',
    recap: () => 'Both bags are labelled ' + mx('b') + ', and ' + mx('b = 4') + ' balances the scale.'
  }),
  then: {
    prompt: 'Kai says one bag could hold 3 and the other 5, because 3 + 5 = 8. Is Kai right?',
    reset: false,
    why: () => whyBox(objRow([{ bag: { inside: 4 }, cap: 'b = 4' }, { bag: { inside: 4 }, cap: 'b = 4' }], 'Two see-through bags, each holding 4 marbles, b = 4 for both'), 10.5, [
      '3 and 5 do add to 8. But then ' + mx('b') + ' would be 3 for one bag and 5 for the other.',
      'One letter means one number inside a problem, so both bags hold 4.'
    ]),
    build(stage, ctl, ctx) {
      const ch = makeChoices(ctl, ['Yes, 3 + 5 = 8', 'No, both bags are ' + mx('b'), 'No, 3 + 5 isn’t 8'], ctx);
      ctl.firstElementChild.classList.add('three');
      const fbk = [
        '3 + 5 does make 8, so that scale would balance. But look at the labels. Can ' + mx('b') + ' be 3 and 5 in the same problem?',
        '',
        '3 + 5 is 8, so the total is fine. The trouble is the labels: both bags are ' + mx('b') + '.'
      ];
      return {
        check() { const s = ch.sel()[0]; if (s === 1) return true; ch.mark(s, 'bad'); return fbk[s]; },
        win: () => 'Both bags are ' + mx('b') + ', so they hold the same number: 4 and 4. Bags that might hold different amounts need different letters.',
        won() { ch.mark(1, 'good'); ch.lock(); },
        solve() { ch.set([1]); }
      };
    }
  }
},

/* 5 */ {
  bridge: true,
  prompt: 'Each time, ' + mx('b') + ' stood for a number you couldn’t see, and the scale told you what it was. A letter standing for a number you have to find is called an <b>unknown</b>.',
  show(stage) { stage.append(h('<div class="br-pic" style="max-width:6.5rem">' + objRow([{ bag: { inside: 5 }, cap: 'b = 5' }], 'A see-through bag holding 5 marbles, b = 5') + '</div>')); }
},

/* 6 */ {
  prompt: 'Each bag holds ' + mx('b') + ' marbles. Put bags and marbles on the mat to show ' + mx('b + b + 3') + '.',
  sub: 'Drag them onto the mat, or tap them. Tap something on the mat to take it off.',
  why: () => whyBox(objRow([{ bag: { body: '?' }, cap: 'b' }, { bag: { body: '?' }, cap: 'b' }, { n: 3, cap: '3' }], 'Two bags and 3 loose marbles, with b + b + 3 written underneath', true), objW(2, 3), [
    'Read the expression one piece at a time. Each ' + mx('b') + ' is the number in one bag, so ' + mx('b + b') + ' is two bags.',
    'The 3 is a number you know, so it is 3 marbles you can see.'
  ]),
  build(stage, ctl, ctx) {
    const MAXB = 5, MAXL = 9;
    let bags = 0, loose = 0;
    const mat = h('<div class="mat droppable" data-drop="mat"></div>'), live = h('<div class="live"></div>');
    stage.append(mat, live);
    const tray = h('<div class="tray"><button type="button" class="src" id="src-bag">' + svgBag({ tag: 'b' }) + '<span>Bag<small>holds ' + mx('b') + ' marbles</small></span></button>' +
      '<button type="button" class="src" id="src-marble">' + SVG_MARBLE + '<span>Marble<small>1 loose marble</small></span></button></div>');
    ctl.append(tray);
    const add = kind => {
      if (kind === 'bag' && bags < MAXB) bags++; else if (kind === 'mb' && loose < MAXL) loose++; else return;
      draw(kind); ctx.touch(true);
    };
    const sb = $('#src-bag', tray), sm = $('#src-marble', tray);
    sb.onclick = () => add('bag'); draggable(sb, { accept: ['mat'], ghost: () => svgBag({ tag: 'b' }), onDrop: () => add('bag') });
    sm.onclick = () => add('mb'); draggable(sm, { accept: ['mat'], ghost: () => SVG_MARBLE, onDrop: () => add('mb') });
    function draw(pop) {
      mat.replaceChildren();
      if (!bags && !loose) mat.append(h('<span class="mat-empty">The mat is empty</span>'));
      for (let i = 0; i < bags; i++) {
        const b = h('<button type="button" class="it bagit" aria-label="Bag on the mat, tap to remove">' + svgBag({ tag: 'b' }) + '</button>');
        b.onclick = () => { bags--; draw(); ctx.touch(bags + loose > 0); };
        if (pop === 'bag' && i === bags - 1) b.classList.add('pop');
        mat.append(b);
      }
      if (loose) {
        const grp = h('<div class="mbs"></div>');
        for (let i = 0; i < loose; i++) {
          const m = h('<button type="button" class="it mbit" aria-label="Marble on the mat, tap to remove">' + SVG_MARBLE + '</button>');
          m.onclick = () => { loose--; draw(); ctx.touch(bags + loose > 0); };
          if (pop === 'mb' && i === loose - 1) m.classList.add('pop');
          grp.append(m);
        }
        mat.append(grp);
      }
      const parts = Array(bags).fill('b').concat(loose ? [loose] : []);
      live.innerHTML = parts.length ? '<span class="lab">Your mat shows</span>' + mx(parts.join(' + ')) : '';
    }
    draw();
    return {
      check() {
        if (bags === 2 && loose === 3) return true;
        if (bags !== 2) return mx('b + b') + ' means the number in a bag, twice. That needs 2 bags on the mat. You have ' + bags + '.';
        return 'The bags are right. The ' + mx('+ 3') + ' is 3 loose marbles, and you have ' + loose + '.';
      },
      win: () => '2 bags and 3 loose marbles make ' + mx('b + b + 3') + '. You wrote down the total without knowing ' + mx('b') + '. That is what an expression is for.',
      solve() { bags = 2; loose = 3; draw(); }
    };
  }
},

/* 7 */ {
  prompt: 'This mat has 3 bags and 2 loose marbles. Build an expression for the total number of marbles.',
  sub: 'Each bag holds ' + mx('b') + ' marbles. Drag tiles into the box, or tap them. Tap a tile in the box to remove it.',
  why: () => whyBox(objRow([{ bag: { body: '?' }, cap: 'b' }, { bag: { body: '?' }, cap: 'b' }, { bag: { body: '?' }, cap: 'b' }, { n: 2, cap: '2' }], 'Three bags and 2 loose marbles, with b + b + b + 2 written underneath', true), objW(3, 2), [
    'Go along the mat: one ' + mx('b') + ' for each bag, then 2 for the loose marbles.',
    'Check with ' + mx('b = 5') + ': ' + mx('5 + 5 + 5 + 2 = 17') + ' and ' + mx('3 × 5 + 2 = 17') + '.'
  ]),
  build(stage, ctl, ctx) {
    const mat = h('<div class="mat"></div>');
    for (let i = 0; i < 3; i++) mat.append(h('<div class="it bagit">' + svgBag({ tag: 'b' }) + '</div>'));
    mat.append(h('<div class="mbs"><div class="it mbit">' + SVG_MARBLE + '</div><div class="it mbit">' + SVG_MARBLE + '</div></div>'));
    stage.append(mat);
    const bd = makeBuilder(stage, ctl, ['b', '+', '×', '1', '2', '3'], ctx);
    const eq = (t, f) => [2, 5, 11].every(v => evalToks(t, 'b', v) === f(v));
    return {
      check() {
        const t = bd.toks();
        if (evalToks(t, 'b', 5) == null) return 'That isn’t a complete expression yet. Put + or × between each pair of tiles.';
        if (eq(t, v => 3 * v + 2)) return true;
        if (!t.includes('b')) return 'Your expression has no ' + mx('b') + ', so it can’t count the marbles hidden in the bags. Each bag holds ' + mx('b') + ' marbles.';
        if (eq(t, v => v + 2)) return mx('b + 2') + ' is one bag and 2 loose marbles. There are 3 bags and each holds ' + mx('b') + ', so the expression needs ' + mx('b') + ' three times.';
        if (eq(t, v => 3 * v)) return 'That counts the marbles inside the bags. Add the 2 loose marbles as well.';
        const v = [5, 2, 11].find(k => evalToks(t, 'b', k) !== 3 * k + 2);
        return 'Test it with ' + mx('b = ' + v) + '. The mat would hold ' + v + ' + ' + v + ' + ' + v + ' + 2 = ' + (3 * v + 2) + ' marbles, but your expression gives ' + evalToks(t, 'b', v) + '.';
      },
      win: () => mx(bd.toks().join(' ')) + ' gives the total for any ' + mx('b') + '. There is more than one right answer: ' + mx('b + b + b + 2') + ' and ' + mx('3 × b + 2') + ' are the same amount.',
      won() { bd.lock(); },
      solve() { bd.set(['b', '+', 'b', '+', 'b', '+', '2']); }
    };
  }
},

/* 8 */ {
  prompt: 'Now let ' + mx('b') + ' change. Set ' + mx('b') + ' so the mat holds 17 marbles.',
  sub: 'The bags are see-through this time. Watch the total as you drag.',
  why: () => whyBox(objRow([{ bag: { inside: 7 }, cap: 'b = 7' }, { bag: { inside: 7 }, cap: 'b = 7' }, { n: 3, cap: '3' }], 'Two see-through bags holding 7 marbles each, and 3 loose marbles'), objW(2, 3), [
    'Take off the 3 loose marbles: ' + mx('17 − 3 = 14') + ' marbles are in the bags.',
    'Two equal bags share 14, so each holds 7. Check: ' + mx('7 + 7 + 3 = 17') + '.'
  ]),
  build(stage, ctl, ctx) {
    let b = 2;
    const mat = h('<div class="mat"></div>'), live = h('<div class="live"></div>');
    stage.append(mat, live);
    const loose = '<div class="mbs">' + ('<div class="it mbit">' + SVG_MARBLE + '</div>').repeat(3) + '</div>';
    function draw() {
      mat.innerHTML = ('<div class="it bagit">' + svgBag({ tag: 'b', inside: b }) + '</div>').repeat(2) + loose;
      live.innerHTML = mx('b + b + 3') + '<small>' + b + ' + ' + b + ' + 3 = <b>' + (2 * b + 3) + '</b> marbles</small>';
    }
    const sl = makeSlider(ctl, 'b', 1, 10, b, v => { b = v; draw(); ctx.touch(true); });
    draw();
    return {
      check() {
        const t = 2 * b + 3;
        return t === 17 ? true : 'When ' + mx('b') + ' is ' + b + ', the mat holds ' + b + ' + ' + b + ' + 3 = ' + t + ' marbles. You need 17, so make ' + mx('b') + ' ' + (t < 17 ? 'bigger' : 'smaller') + '.';
      },
      win: () => 'When ' + mx('b = 7') + ' the mat holds 7 + 7 + 3 = 17. The expression ' + mx('b + b + 3') + ' never changed. Its value changed because ' + mx('b') + ' changed. That is why ' + mx('b') + ' is called a variable: it can vary.',
      solve() { sl.set(7); }
    };
  }
},

/* 9 */ {
  prompt: 'The slider stopped at 10. If ' + mx('b = 20') + ', how many marbles is ' + mx('b + b + 3') + '?',
  why: () => whyBox(objRow([{ bag: { body: '20' }, cap: 'b = 20' }, { bag: { body: '20' }, cap: 'b = 20' }, { n: 3, cap: '3' }], 'Two bags holding 20 marbles each, and 3 loose marbles'), objW(2, 3), [
    'Put 20 where each ' + mx('b') + ' is: ' + mx('b + b + 3') + ' becomes ' + mx('20 + 20 + 3') + '.',
    mx('20 + 20 = 40') + ', then ' + mx('40 + 3 = 43') + '.'
  ]),
  build(stage, ctl, ctx) {
    const mat = h('<div class="mat"></div>');
    mat.innerHTML = ('<div class="it bagit">' + svgBag({ tag: 'b' }) + '</div>').repeat(2) + '<div class="mbs">' + ('<div class="it mbit">' + SVG_MARBLE + '</div>').repeat(3) + '</div>';
    stage.append(mat, h('<div class="note">' + mx('b = 20') + '</div>'));
    const ans = makeAnswer(ctl, 'Marbles on the mat', ctx);
    return {
      check() {
        const v = ans.value();
        if (v === 43) return true;
        ans.mark('bad');
        if (isNaN(v)) return 'Type a whole number, using digits only.';
        if (v === 23) return '23 is 20 + 3. There are two bags, so 20 is added twice.';
        if (v === 40) return '40 is the marbles in the two bags. Add the 3 loose marbles.';
        return 'Swap each ' + mx('b') + ' for 20. That gives 20 + 20 + 3. Add those up.';
      },
      win: () => '20 + 20 + 3 = 43. Swapping a letter for a number is called substitution. It works for any value, even ones too big to draw.',
      won() { ans.mark('good'); ans.lock(); },
      solve() { ans.set(43); }
    };
  }
},

/* 10 */ {
  bridge: true,
  prompt: 'You moved ' + mx('b') + ' from 1 to 10, then to 20, and ' + mx('b + b + 3') + ' gave a new total each time. A letter whose value can change like this is called a <b>variable</b>.',
  show(stage) {
    stage.append(h('<table class="wy-tab"><tr><th>' + mx('b') + '</th><td>2</td><td>7</td><td>20</td></tr><tr><th>' + mx('b + b + 3') + '</th><td>7</td><td>17</td><td>43</td></tr></table>'));
  }
},

/* 11 */ {
  why: () => whyBox(patSvg(50, true), 17, [
    'Small rows first: ' + mx('n = 1') + ' has 3 tiles, ' + mx('n = 2') + ' has 4, ' + mx('n = 3') + ' has 5. Always 2 more than ' + mx('n') + '.',
    'So ' + mx('n = 50') + ' has ' + mx('50 + 2 = 52') + ' tiles.'
  ]),
  then: {
    prompt: 'Another row like this has 30 tiles altogether. What is ' + mx('n') + '?',
    reset: false,
    why: () => whyBox(patSvg(28, true), 17, [
      'Of the 30 tiles, 2 are the yellow ends. The rest are blue: ' + mx('30 − 2 = 28') + '.',
      'Check: ' + mx('28 + 2 = 30') + '.'
    ]),
    build(stage, ctl, ctx) {
      const ans = makeAnswer(ctl, 'Blue tiles, ' + mx('n') + ' =', ctx);
      return {
        check() {
          const v = ans.value();
          if (v === 28) return true;
          ans.mark('bad');
          if (isNaN(v)) return 'Type a whole number, using digits only.';
          if (v === 32) return '32 is 30 + 2. The 30 already counts the two yellow tiles, so take them off instead.';
          if (v === 30) return '30 is all the tiles. ' + mx('n') + ' counts only the blue ones, so leave out the two yellow ends.';
          if (v === 29) return 'There is a yellow tile on each end, so take off 2, not 1.';
          if (v === 15) return 'The row isn’t half blue and half yellow. Only 2 of the 30 tiles are yellow.';
          return 'The total is always ' + mx('n + 2') + '. Which number is 2 less than 30?';
        },
        win: () => mx('n = 28') + ', because 28 + 2 = 30. The same rule works backwards: take the 2 end tiles off the total.',
        won() { ans.mark('good'); ans.lock(); },
        solve() { ans.set(28); }
      };
    }
  },
  prompt: 'Drag the slider to change ' + mx('n') + ', the number of blue tiles. How many tiles would there be altogether when ' + mx('n = 50') + '?',
  build(stage, ctl, ctx) {
    const pat = makePattern(stage, 3);
    makeSlider(ctl, 'n', 1, 12, 3, v => pat.set(v));
    const ans = makeAnswer(ctl, 'Tiles altogether when ' + mx('n = 50'), ctx);
    return {
      check(attempt) {
        const v = ans.value();
        if (v === 52) return true;
        ans.mark('bad');
        if (isNaN(v)) return 'Type a whole number, using digits only.';
        if (v === 50) return '50 is only the blue tiles. The two yellow end tiles are always there as well.';
        if (v === 100) return 'The row doesn’t double. Each time ' + mx('n') + ' goes up by 1, the total goes up by 1.';
        return attempt < 2 ? 'Move the slider and compare ' + mx('n') + ' with the total each time. What stays the same?'
                           : 'The total is always 2 more than ' + mx('n') + ', because of the two end tiles. What is 2 more than 50?';
      },
      win: () => '52. Whatever ' + mx('n') + ' is, the pattern has ' + mx('n') + ' blue tiles and 2 yellow end tiles.',
      recap: () => 'When ' + mx('n = 50') + ', the row has 52 tiles altogether.',
      won() { ans.mark('good'); ans.lock(); },
      solve() { ans.set(52); }
    };
  }
},

/* 12 */ {
  prompt: 'Which expression gives the total number of tiles for any ' + mx('n') + '?',
  sub: 'Use the slider to test each one.',
  why: () => whyBox(patSvg(4), 11, [
    'Blue tiles: ' + mx('n') + '. Yellow tiles: always 2. Altogether: ' + mx('n + 2') + '.',
    'Check with ' + mx('n = 4') + ': ' + mx('4 + 2 = 6') + ', and the row has 6 tiles.'
  ]),
  build(stage, ctl, ctx) {
    const pat = makePattern(stage, 3);
    makeSlider(ctl, 'n', 1, 12, 3, v => pat.set(v));
    const ch = makeChoices(ctl, [mx('n + 2'), mx('2 × n'), mx('n + n'), mx('14')], ctx);
    const why = [
      '',
      mx('2 × n') + ' doubles the blue row. Test it with ' + mx('n = 3') + ': 2 × 3 = 6, but the pattern has 5 tiles.',
      mx('n + n') + ' is two blue rows. Test it with ' + mx('n = 3') + ': 3 + 3 = 6, but the pattern has 5 tiles.',
      '14 is the total only when ' + mx('n = 12') + '. The total changes when ' + mx('n') + ' changes, so the expression needs ' + mx('n') + ' in it.'
    ];
    return {
      check() { const s = ch.sel()[0]; if (s === 0) return true; ch.mark(s, 'bad'); return why[s]; },
      win: () => mx('n + 2') + ' works for every ' + mx('n') + ': the blue tiles plus the 2 end tiles. This time ' + mx('n') + ' isn’t one hidden number. It can be any whole number you choose.',
      won() { ch.mark(0, 'good'); ch.lock(); },
      solve() { ch.set([0]); }
    };
  }
},

/* 13 */ {
  prompt: 'For each card, does only one value of the letter fit, or do many values work?',
  sub: 'Drag each card into a box. Or tap a card, then tap a box.',
  why: () => '<table class="wy-tab left">' +
    '<tr><th>' + mx('b + 2 = 7') + '</th><td>only ' + mx('b = 5') + ' balances</td></tr>' +
    '<tr><th>' + mx('b + b = 8') + '</th><td>only ' + mx('b = 4') + ' balances</td></tr>' +
    '<tr><th>' + mx('n + 2') + '</th><td>' + mx('n = 3') + ' gives 5, ' + mx('n = 50') + ' gives 52, and so on</td></tr>' +
    '<tr><th>' + mx('b + b + 3') + '</th><td>' + mx('b = 7') + ' gives 17, ' + mx('b = 20') + ' gives 43, and so on</td></tr></table>' +
    '<p>The first two say what the total must be, so only one value fits. The last two only describe a total, so any value can go in.</p>',
  build(stage, ctl, ctx) {
    const items = [
      { e: 'b + 2 = 7', cap: 'a bag and 2 marbles balance 7', bin: 'one' },
      { e: 'n + 2', cap: 'tiles in the pattern', bin: 'many' },
      { e: 'b + b = 8', cap: 'two bags balance 8', bin: 'one' },
      { e: 'b + b + 3', cap: 'marbles on the mat', bin: 'many' }
    ];
    const place = items.map(() => 'tray');
    let sel = null, locked = false;
    const bins = h('<div class="bins"><div class="bin" data-drop="one"><button type="button" class="bin-h">Only one value fits</button><div class="bin-c"></div></div>' +
      '<div class="bin" data-drop="many"><button type="button" class="bin-h">Many values work</button><div class="bin-c"></div></div></div>');
    const tray = h('<div class="chips" data-drop="tray"></div>');
    stage.append(bins); ctl.append(tray);
    const hostOf = w => w === 'tray' ? tray : $('.bin[data-drop=' + w + '] .bin-c', bins);
    const chips = items.map((it, i) => {
      const c = h('<button type="button" class="chip">' + mx(it.e) + '<small>' + it.cap + '</small></button>');
      c.onclick = () => { if (locked) return; sel = sel === i ? null : i; draw(); };
      draggable(c, { accept: ['one', 'many', 'tray'], onDrop: t => move(i, t.getAttribute('data-drop')) });
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
        return plural(wrong.length, 'card') + (wrong.length === 1 ? ' is' : ' are') + ' in the wrong box. A balanced scale pins the letter to one value. An expression with no equals sign gives a total for whatever value you choose.';
      },
      win: () => 'A balanced scale, like ' + mx('b + 2 = 7') + ', pins the letter to one value. An expression on its own, like ' + mx('n + 2') + ', works for any value you put in. Either way the letter stands for a number.',
      won() { locked = true; chips.forEach(c => { c.classList.remove('sel'); c.classList.add('good'); }); },
      solve() { items.forEach((it, i) => { place[i] = it.bin; }); sel = null; chips.forEach(c => c.classList.remove('bad')); draw(); }
    };
  }
},

/* 14 */ {
  bridge: true,
  prompt: 'The cards where only one value fits, like ' + mx('b + 2 = 7') + ', are <b>equations</b>: each has an equals sign. The cards where many values work, like ' + mx('n + 2') + ', are <b>expressions</b>.',
  show(stage) {
    stage.append(h('<div class="br-duo"><div>' + mx('b + 2 = 7') + '<small>equation: only ' + mx('b = 5') + ' fits</small></div>' +
      '<div>' + mx('n + 2') + '<small>expression: any ' + mx('n') + ' works</small></div></div>'));
  }
},

/* 15 */ {
  prompt: 'This machine changes every number you feed it. What comes out when 20 goes in?',
  why: () => whyBox(stillMach(20, 60), 21, [
    'Inputs 1, 2, 3 give outputs 3, 6, 9. That is the 3 times table.',
    'Adding 3 would turn 1 into 4, not 3. So the rule is × 3, and ' + mx('3 × 20 = 60') + '.'
  ]),
  then: {
    prompt: 'Later, 27 comes out of the same machine. What number went in?',
    reset: false,
    why: () => whyBox(stillMach(9, 27), 21, [
      'The machine multiplies by 3, so ask: 3 times what makes 27?',
      mx('3 × 9 = 27') + ', so 9 went in. Dividing undoes the machine: ' + mx('27 ÷ 3 = 9') + '.'
    ]),
    build(stage, ctl, ctx, p1) {
      p1.mc.show(null, 27);
      const ans = makeAnswer(ctl, 'The number that went in', ctx);
      return {
        check(attempt) {
          const v = ans.value();
          if (v === 9) return true;
          ans.mark('bad');
          if (isNaN(v)) return 'Type a whole number, using digits only.';
          if (v === 81) return '81 is 3 × 27. That is what comes out when 27 goes in. Here 27 is the number that came out.';
          if (v === 24) return 'Taking 3 off would undo a machine that adds 3. This one multiplies by 3.';
          if (v === 30) return 'This machine multiplies by 3. It doesn’t add 3, and the number going in is smaller than 27.';
          return attempt < 2 ? 'The machine multiplies by 3. Which number times 3 makes 27?'
                             : 'Go up the 3 times table: 3 × 7 = 21, 3 × 8 = 24. What comes next?';
        },
        win: () => '9 went in, because 3 × 9 = 27. The rule is the same. This time you used it backwards.',
        won() { ans.mark('good'); ans.lock(); p1.mc.show(9, 27); },
        solve() { ans.set(9); }
      };
    }
  },
  sub: 'Drag numbers into the machine, or tap them, and look for the rule.',
  build(stage, ctl, ctx) {
    const mc = makeMachine(stage, n => 3 * n);
    const tray = h('<div class="tiles"></div>');
    for (let n = 1; n <= 9; n++) {
      const b = h('<button type="button" class="tile num" aria-label="Feed in ' + n + '">' + n + '</button>');
      b.onclick = () => mc.feed(n);
      draggable(b, { accept: ['hopper'], onDrop: () => mc.feed(n) });
      tray.append(b);
    }
    ctl.append(tray);
    const ans = makeAnswer(ctl, 'When 20 goes in, out comes', ctx);
    return {
      check(attempt) {
        const v = ans.value();
        if (v === 60) return true;
        ans.mark('bad');
        if (isNaN(v)) return 'Type a whole number, using digits only.';
        if (!mc.fed.length) return 'Feed the machine a few numbers first, then look at what it does to each one.';
        if (v === 23) return 'The machine doesn’t add 3. Feed in 1, then 2, and compare what comes out.';
        return attempt < 2 ? 'Feed in 1, 2 and 3 in order. What happens to the output each time?'
                           : 'Every output is 3 times its input: 1 → 3, 2 → 6, 5 → 15. Work out 3 × 20.';
      },
      win: () => '60. The machine multiplies every number by 3, so 20 becomes 3 × 20 = 60.',
      recap: () => 'The machine turns 20 into 60.',
      mc,
      won() { ans.mark('good'); ans.lock(); },
      solve() { ans.set(60); }
    };
  }
},

/* 16 */ {
  prompt: 'Call the number going in ' + mx('x') + '. Build an expression for the number that comes out.',
  sub: 'It is the same machine: 1 → 3, 2 → 6, 5 → 15.',
  why: () => whyBox(stillMach(5, 15, mx('x = 5'), mx('3 × x = 15')), 21, [
    'The rule is “3 times the number going in”. Call that number ' + mx('x') + ' and the output is ' + mx('3 × x') + '.',
    'Check with ' + mx('x = 5') + ': ' + mx('3 × 5 = 15') + ', and the machine gives 15.'
  ]),
  build(stage, ctl, ctx) {
    const node = h('<div class="mach wide"><div class="m-slot"><span class="cap">in</span><span class="tile var still">x</span></div><div class="m-pipe"></div>' +
      '<div class="m-body">' + GEAR + '</div><div class="m-pipe p2"></div><div class="m-wide"><span class="cap">out</span></div></div>');
    stage.append(node);
    const bd = makeBuilder($('.m-wide', node), ctl, ['x', '+', '×', '1', '2', '3'], ctx);
    const eq = (t, f) => [2, 5, 11].every(v => evalToks(t, 'x', v) === f(v));
    return {
      check() {
        const t = bd.toks();
        if (evalToks(t, 'x', 5) == null) return 'That isn’t a complete expression yet. Put + or × between each pair of tiles.';
        if (eq(t, v => 3 * v)) return true;
        if (!t.includes('x')) return 'Your expression has no ' + mx('x') + ', so it gives the same number every time. The output has to change when the input changes.';
        if (eq(t, v => v + 3)) return mx('x + 3') + ' adds 3. Test it with 2: the machine gives 6, but 2 + 3 = 5.';
        const v = [2, 5, 1].find(k => evalToks(t, 'x', k) !== 3 * k);
        return 'Test it with ' + mx('x = ' + v) + '. The machine gives ' + 3 * v + ', but your expression gives ' + evalToks(t, 'x', v) + '.';
      },
      win: () => mx(bd.toks().join(' ')) + ' describes every output at once. Put any number in for ' + mx('x') + ' and you get what the machine gives. ' + mx('3 × x') + ' and ' + mx('x + x + x') + ' are both right.',
      won() { bd.lock(); },
      solve() { bd.set(['3', '×', 'x']); }
    };
  }
},

/* 17 */ {
  prompt: 'A different machine adds 5 to every number. Tap every expression that describes it.',
  why: () => whyBox(stillMach(2, 7), 21, [
    'Put 2 in for the letter. ' + mx('x + 5') + ', ' + mx('n + 5') + ' and ' + mx('5 + t') + ' all give 7, the same as the machine.',
    mx('x × 5') + ' gives ' + mx('2 × 5 = 10') + ', so it is a different rule.'
  ]),
  build(stage, ctl, ctx) {
    stage.append(h('<div class="mach"><div class="m-slot"><span class="cap">in</span><span class="tile num still">2</span></div><div class="m-pipe"></div>' +
      '<div class="m-body">' + GEAR + '</div><div class="m-pipe"></div><div class="m-slot"><span class="cap">out</span><span class="tile num still">7</span></div></div>'));
    stage.append(h('<div class="m-log"><span class="pair">2 → 7</span><span class="pair">10 → 15</span><span class="pair">31 → 36</span></div>'));
    const ch = makeChoices(ctl, [mx('x + 5'), mx('n + 5'), mx('5 + t'), mx('x × 5')], ctx, true);
    return {
      check() {
        const s = ch.sel(), has = i => s.includes(i);
        if (has(0) && has(1) && has(2) && !has(3)) return true;
        if (has(3)) { ch.mark(3, 'bad'); return mx('x × 5') + ' multiplies by 5. When 2 goes in, the machine gives 7, but 2 × 5 = 10.'; }
        if (has(0) && has(1)) return mx('5 + t') + ' adds the same two numbers as ' + mx('t + 5') + '. Adding in either order gives the same total, so it works too.';
        return 'There are more. The letter is only a name for the number going in. Does the rule change if the number gets a different name?';
      },
      win: () => 'All three work. The letter is only a name for the number going in, so any letter will do. And ' + mx('5 + t') + ' gives the same total as ' + mx('t + 5') + '.',
      won() { [0, 1, 2].forEach(i => ch.mark(i, 'good')); ch.lock(); },
      solve() { ch.set([0, 1, 2]); }
    };
  }
},

/* 18 */ {
  prompt: 'Three students explain what a variable is. Who is right?',
  sub: 'Choose Agree or Disagree for each one.',
  why: () => whyBox(objRow([{ bag: { inside: 5 }, cap: 'b = 5' }, { bag: { inside: 4 }, cap: 'b = 4' }, { bag: { inside: 7 }, cap: 'b = 7' }], 'Three see-through bags from three problems, holding 5, 4 and 7 marbles'), objW(3, 0), [
    'Three problems, three values of ' + mx('b') + '. Each one is a number of marbles, so “a label for the bag” doesn’t fit.',
    'The value changed from problem to problem, so “5 from now on” doesn’t fit either.'
  ]),
  build(stage, ctl, ctx) {
    stage.hidden = true;
    const claims = [
      { who: 'Mia', say: '“' + mx('b') + ' stands for bag. It’s a label for the object.”', agree: false, why: 'A letter stands for a number. ' + mx('b') + ' was the number of marbles in the bag, not the bag.' },
      { who: 'Jai', say: '“We found ' + mx('b = 5') + ', so ' + mx('b') + ' is 5 in every problem from now on.”', agree: false, why: 'A letter keeps one value inside one problem. In later problems ' + mx('b') + ' was 4, then 7, then 20.' },
      { who: 'Ava', say: '“A variable is a letter that stands for a number. Sometimes only one number fits. Sometimes it can be any number.”', agree: true, why: 'This is the meaning mathematicians use.' }
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
        wrong.forEach(i => explain(i, 'bad'));
        return wrong.length === 1 ? 'Look again at what ' + claims[wrong[0]].who + ' said. The note under it explains why.'
                                  : 'Look again at ' + wrong.map(i => claims[i].who).join(' and ') + '. The notes under them explain why.';
      },
      win: () => 'Ava has it. Mia treated the letter as an object, and Jai treated it as fixed forever. A variable is a letter that stands for a number, and the number can be different in each problem.',
      won() { locked = true; claims.forEach((c, i) => { rows[i].row.classList.remove('bad'); explain(i, 'good'); rows[i].btns.forEach(b => { b.disabled = true; }); }); },
      solve() { claims.forEach((c, i) => { pick[i] = c.agree; paint(i); }); }
    };
  }
}
];

const SECTIONS = [[0, 'Mystery bags'], [4, 'Build it'], [9, 'Patterns'], [13, 'Machines'], [17, 'Wrap-up']];

// Finish screen: sets the prompt, sub-line and recap for this lesson.
function drawFinish() {
  promptEl.textContent = 'A variable is a letter that stands for a number.';
  subEl.hidden = false; subEl.textContent = 'You may also hear it called a pronumeral. Four things to remember:';
  ctl.replaceChildren(); stage.hidden = false;
  const mini = o => '<svg viewBox="-5 -10 76 83" aria-hidden="true">' + bagG(0, 0, o) + '</svg>';
  stage.replaceChildren(h('<ul class="recap">' +
    '<li><span class="art">' + mini({ tag: 'b', body: '?' }) + '</span><span>The letter stands for a number, never an object or a word. ' + mx('b') + ' was the number of marbles in a bag.</span></li>' +
    '<li><span class="art">' + mini({ tag: 'b', inside: 4 }) + mini({ tag: 'b', inside: 4 }) + '</span><span>Inside one problem, the same letter always means the same number.</span></li>' +
    '<li><span class="art"><span class="pt e"></span><span class="pt n"></span><span class="pt n"></span><span class="pt n"></span><span class="pt e"></span></span><span>Sometimes only one value fits, as in ' + mx('b + 2 = 7') + '. Sometimes any value works, as in ' + mx('n + 2') + '.</span></li>' +
    '<li><span class="art"><span class="tile var still">x</span><span class="tile var still">n</span><span class="tile var still">t</span></span><span>Any letter can be used. ' + mx('x + 5') + ' and ' + mx('n + 5') + ' describe the same rule.</span></li></ul>'));
}
