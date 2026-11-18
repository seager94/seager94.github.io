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
    return { check: () => b === cfg.ans ? true : cfg.wrong(b, sum(b)), win: cfg.win, solve: () => sl.set(cfg.ans) };
  };
}

const cards = [

/* 1 */ {
  prompt: 'A bag of marbles is on the scale. How many marbles are inside?',
  sub: 'Add marbles to the other side until the scale balances. Every marble weighs the same, and the bag itself weighs nothing.',
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
  build: sliderScale({
    nb: 1, loose: 2, right: 7, start: 1, ans: 5,
    wrong: (b, s) => 'If ' + mx('b') + ' is ' + b + ', the left side holds ' + b + ' + 2 = ' + s + ' marbles. The right side holds 7, so the left is too ' + (s > 7 ? 'heavy' : 'light') + '.',
    win: () => mx('b = 5') + ', because 5 + 2 = 7. Only one value makes this scale balance. A letter used like this is often called an unknown.'
  })
},

/* 3 */ {
  prompt: 'In that problem, what did ' + mx('b') + ' stand for?',
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
  build: sliderScale({
    nb: 2, loose: 0, right: 8, start: 1, ans: 4,
    wrong: (b, s) => 'If ' + mx('b') + ' is ' + b + ', the two bags hold ' + b + ' + ' + b + ' = ' + s + ' marbles. You need 8.',
    win: () => mx('b = 4') + ', because 4 + 4 = 8. Inside one problem, the same letter always means the same number, so the two bags could not hold different amounts.'
  })
},

/* 5 */ {
  prompt: 'Each bag holds ' + mx('b') + ' marbles. Put bags and marbles on the mat to show ' + mx('b + b + 3') + '.',
  sub: 'Drag them onto the mat, or tap them. Tap something on the mat to take it off.',
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

/* 6 */ {
  prompt: 'This mat has 3 bags and 2 loose marbles. Build an expression for the total number of marbles.',
  sub: 'Each bag holds ' + mx('b') + ' marbles. Drag tiles into the box, or tap them. Tap a tile in the box to remove it.',
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

/* 7 */ {
  prompt: 'Now let ' + mx('b') + ' change. Set ' + mx('b') + ' so the mat holds 17 marbles.',
  sub: 'The bags are see-through this time. Watch the total as you drag.',
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

/* 8 */ {
  prompt: 'The slider stopped at 10. If ' + mx('b = 20') + ', how many marbles is ' + mx('b + b + 3') + '?',
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

/* 9 */ {
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
      won() { ans.mark('good'); ans.lock(); },
      solve() { ans.set(52); }
    };
  }
},

/* 10 */ {
  prompt: 'Which expression gives the total number of tiles for any ' + mx('n') + '?',
  sub: 'Use the slider to test each one.',
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

/* 11 */ {
  prompt: 'For each card, does only one value of the letter fit, or do many values work?',
  sub: 'Drag each card into a box. Or tap a card, then tap a box.',
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

/* 12 */ {
  prompt: 'This machine changes every number you feed it. What comes out when 20 goes in?',
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
      won() { ans.mark('good'); ans.lock(); },
      solve() { ans.set(60); }
    };
  }
},

/* 13 */ {
  prompt: 'Call the number going in ' + mx('x') + '. Build an expression for the number that comes out.',
  sub: 'It is the same machine: 1 → 3, 2 → 6, 5 → 15.',
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

/* 14 */ {
  prompt: 'A different machine adds 5 to every number. Tap every expression that describes it.',
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

/* 15 */ {
  prompt: 'Three students explain what a variable is. Who is right?',
  sub: 'Choose Agree or Disagree for each one.',
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

const SECTIONS = [[0, 'Mystery bags'], [4, 'Build it'], [8, 'Patterns'], [11, 'Machines'], [14, 'Wrap-up']];

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
