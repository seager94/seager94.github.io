/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const h = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');

// "(a + b) + c" -> maths markup. Single lower-case letters become variables; b and c each get their own colour.
const VC = { b: 'v2', c: 'v3' };
function mx(s) {
  return '<span class="m">' + String(s).split(' ').map(t => t.replace(/(^|[^A-Za-z])([a-z])(?![A-Za-z])/g, (_, p, l) => p + '<i class="v' + (VC[l] ? ' ' + VC[l] : '') + '">' + l + '</i>')).join(' ') + '</span>';
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
  let g = '<g class="bag' + (xray ? ' xray' : '') + (o.cls ? ' ' + o.cls : '') + '"transform="translate(' + x + ',' + y + ')">' +
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
  const row = h('<div class="slider' + (VC[name] ? ' ' + VC[name] : '') + '"><label for="sl-' + name + '"><span class="m"><i class="v">' + name + '</i> = <span class="val">' + value + '</span></span></label>' +
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
const tileCls = t => tileKind(t) + (VC[t] ? ' ' + VC[t] : '');
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
      const b = h('<button type="button" class="tile ' + tileCls(t) + '" aria-label="' + tileName(t) + ', tap to remove">' + t + '</button>');
      b.onclick = () => { if (locked) return; toks.splice(i, 1); draw(); ctx.touch(toks.length > 0); };
      strip.append(b);
    });
  }
  tiles.forEach(t => {
    const b = h('<button type="button" class="tile ' + tileCls(t) + '" aria-label="Add ' + tileName(t) + '">' + t + '</button>');
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

/* ---------- lesson components ---------- */
const fmtN = v => v < 0 ? '−' + (-v) : String(v);
const money = v => { const c = Math.round(v * 100); return (Math.abs(v * 100 - c) > 1e-9 ? 'about ' : '') + '$' + (c % 100 ? (c / 100).toFixed(2) : c / 100); };
const people = n => n === 1 ? '1 person' : n + ' people';
// Like evalToks, but with several letters at once: env = { a: 3, b: 6 }.
const evalEnv = (toks, env) => evalToks(toks.map(t => Object.prototype.hasOwnProperty.call(env, t) ? String(env[t]) : t), null, 0);
const sliderRow = (ctl, cls) => { const g = h('<div class="' + cls + '"></div>'); ctl.append(g); return g; };
const wide = ctl => ctl.lastElementChild.classList.add('c4');

// An array of marbles, rows x cols. A bar and a label on the left edge say what counts the rows; the top edge says what counts each row.
// turn() spins it a quarter turn: rows and columns swap, every marble stays.
function makeArray(host, o) {
  const CELL = 26, side = o.max * CELL + 64;
  let R = o.rows, C = o.cols, tr = o.rowTag, tc = o.colTag, turned = false, timer = null;
  const svg = h('<svg class="arr" viewBox="0 0 ' + side + ' ' + side + '" role="img"></svg>');
  host.append(svg);
  const kind = t => /^[a-z]$/.test(t) ? (VC[t] || '') : 'n';
  function draw() {
    const x0 = (side - C * CELL) / 2 + 10, y0 = (side - R * CELL) / 2 + 10;
    let dots = '';
    for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) dots += marbleG(x0 + j * CELL + CELL / 2, y0 + i * CELL + CELL / 2, 10.5);
    svg.innerHTML = '<g class="arr-g">' + dots + '</g><g class="arr-k">' +
      '<rect class="arr-bar ' + kind(tr) + '" x="' + (x0 - 11) + '" y="' + (y0 + 2) + '" width="5" height="' + (R * CELL - 4) + '" rx="2.5"/>' +
      '<text class="arr-l ' + kind(tr) + '" x="' + (x0 - 17) + '" y="' + (y0 + R * CELL / 2 + 7) + '" text-anchor="end">' + tr + '</text>' +
      '<rect class="arr-bar ' + kind(tc) + '" x="' + (x0 + 2) + '" y="' + (y0 - 11) + '" width="' + (C * CELL - 4) + '" height="5" rx="2.5"/>' +
      '<text class="arr-l ' + kind(tc) + '" x="' + (x0 + C * CELL / 2) + '" y="' + (y0 - 18) + '" text-anchor="middle">' + tc + '</text></g>';
    svg.setAttribute('aria-label', R + ' rows of ' + C + ' marbles');
    if (o.onDraw) o.onDraw(R, C, turned);
  }
  draw();
  return {
    turn(done) {
      if (timer) return;
      svg.classList.add('busy');
      $('.arr-g', svg).classList.add('spin');
      timer = setTimeout(() => {
        timer = null;
        [R, C] = [C, R]; [tr, tc] = [tc, tr]; turned = !turned;
        svg.classList.remove('busy');
        draw();
        if (done) done();
      }, 720);
    },
    set(r, c) {
      clearTimeout(timer); timer = null; svg.classList.remove('busy');
      R = r; C = c; tr = o.rowTag; tc = o.colTag; turned = false; draw();
    }
  };
}

// A number line from lo to hi with a path of jumps above it, starting at 0. Each jump: { len, lab, cls }.
// cls sets the colour: '' is a (blue), 'v2' is b, 'kn' is a known number.
function makeJumps(host, lo, hi) {
  const Y = 58, X0 = 22, X1 = 558, X = v => X0 + (v - lo) * (X1 - X0) / (hi - lo);
  let axis = '<line class="jl-axis" x1="' + (X0 - 10) + '" y1="' + Y + '" x2="' + (X1 + 10) + '" y2="' + Y + '"/>';
  for (let v = lo; v <= hi; v++) axis += '<line class="jl-tick" x1="' + X(v) + '" y1="' + (Y - 5) + '" x2="' + X(v) + '" y2="' + (Y + 5) + '"/><text class="jl-n" x="' + X(v) + '" y="' + (Y + 19) + '" text-anchor="middle">' + fmtN(v) + '</text>';
  const svg = h('<svg class="jl" viewBox="0 0 580 82" role="img"></svg>');
  host.append(svg);
  return {
    set(jumps, label) {
      let at = 0, out = axis;
      jumps.forEach((j, k) => {
        const x1 = X(at), x2 = X(at + j.len), xm = (x1 + x2) / 2, ht = Math.min(k ? 27 : 36, 10 + Math.abs(x2 - x1) * 0.4), c = j.cls || '';
        out += '<path class="jl-arc ' + c + '" d="M' + x1 + ' ' + (Y - 3) + ' Q' + xm + ' ' + (Y - 3 - 2 * ht) + ' ' + x2 + ' ' + (Y - 3) + '"/>' +
          '<path class="jl-head ' + c + '" d="M' + (x2 - 5) + ' ' + (Y - 14) + ' L' + (x2 + 5) + ' ' + (Y - 14) + ' L' + x2 + ' ' + (Y - 3) + ' Z"/>' +
          '<text class="jl-lab ' + c + '" x="' + xm + '" y="' + (Y - ht - 9) + '" text-anchor="middle">' + j.lab + '</text>';
        at += j.len;
      });
      if (jumps.length) out += '<circle class="jl-dot" cx="' + X(at) + '" cy="' + Y + '" r="5.5"/>';
      svg.innerHTML = out;
      svg.setAttribute('aria-label', label || 'Number line from ' + lo + ' to ' + hi);
    }
  };
}

// Agree or disagree with each student (final card).
function makeClaims(ctl, claims, ctx) {
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
    won() { locked = true; claims.forEach((c, i) => { rows[i].row.classList.remove('bad'); explain(i, 'good'); rows[i].btns.forEach(b => { b.disabled = true; }); }); },
    solve() { claims.forEach((c, i) => { pick[i] = c.agree; paint(i); }); }
  };
}

/* ---------- cards ---------- */

const cards = [

/* 1 */ {
  prompt: 'This array shows ' + mx('3 × 4 = 12') + ': 3 rows of 4. Turn it a quarter turn. What is ' + mx('4 × 3') + '?',
  sub: 'Tap the button and watch the marbles.',
  build(stage, ctl, ctx) {
    let turnedOnce = false;
    const live = h('<div class="live"></div>');
    const arr = makeArray(stage, { rows: 3, cols: 4, rowTag: '3', colTag: '4', max: 4, onDraw(r, c) {
      live.innerHTML = '<span class="lab">' + r + ' rows of ' + c + '</span>' + mx(r + ' × ' + c + ' = ' + (r === 3 ? 12 : '?'));
    } });
    const foot = h('<div class="foot"></div>'), btn = h('<button type="button" class="turn">Turn a quarter turn</button>');
    foot.append(live, btn); stage.append(foot);
    btn.onclick = () => arr.turn(() => { turnedOnce = true; });
    const ans = makeAnswer(ctl, mx('4 × 3 ='), ctx);
    return {
      check() {
        const v = ans.value();
        if (v === 12) return true;
        ans.mark('bad');
        if (isNaN(v)) return 'Type a whole number, using digits only.';
        if (v === 7) return '7 is 4 + 3. The turned array has 4 rows with 3 marbles in each, so it is 4 lots of 3, not 4 and 3 added.';
        if (v === 16) return '16 would be 4 rows of 4. Each row of the turned array has only 3 marbles.';
        if (v === 9) return '9 would be 3 rows of 3. The turned array has 4 rows.';
        if (!turnedOnce) return 'Tap the button to turn the array, then count the marbles in the new shape.';
        return 'Turning moves the marbles but doesn’t add or take any away. Count the 4 rows of 3.';
      },
      win: () => mx('4 × 3 = 12') + '. Turning the array moved every marble but added none and removed none. So ' + mx('3 × 4') + ' and ' + mx('4 × 3') + ' have to be equal.',
      won() { ans.mark('good'); ans.lock(); },
      solve() { ans.set(12); }
    };
  }
},

/* 2 */ {
  prompt: mx('a') + ' rows of ' + mx('b') + ' marbles. Is ' + mx('a × b') + ' always the same as ' + mx('b × a') + '?',
  build(stage, ctl, ctx) {
    let a = 2, b = 5;
    const live = h('<div class="live"></div>');
    const arr = makeArray(stage, { rows: a, cols: b, rowTag: 'a', colTag: 'b', max: 6, onDraw(r, c, turned) {
      live.innerHTML = '<span class="lab">' + r + ' rows of ' + c + '</span>' + mx((turned ? 'b × a' : 'a × b') + ' = ' + r + ' × ' + c + ' = ' + r * c);
    } });
    const foot = h('<div class="foot"></div>'), btn = h('<button type="button" class="turn">Turn a quarter turn</button>');
    foot.append(live, btn); stage.append(foot);
    btn.onclick = () => arr.turn();
    const g = sliderRow(ctl, 'sl2');
    makeSlider(g, 'a', 1, 6, a, v => { a = v; arr.set(a, b); });
    makeSlider(g, 'b', 1, 6, b, v => { b = v; arr.set(a, b); });
    const ch = makeChoices(ctl, ['Always', 'Only when ' + mx('a = b'), 'Only small numbers', 'Never'], ctx);
    wide(ctl);
    const why = [
      '',
      'Try ' + mx('a = 2') + ' and ' + mx('b = 5') + '. They are different, yet 2 × 5 = 10 and 5 × 2 = 10. Turning the array never changes the count.',
      'Try a big array: 6 rows of 5 is 30 marbles. Turn it and you get 5 rows of 6, still 30. Size makes no difference.',
      'Set any values and turn the array. They are the same marbles, so the two totals always match.'
    ];
    return {
      check() { const s = ch.sel()[0]; if (s === 0) return true; ch.mark(s, 'bad'); return why[s]; },
      win: () => 'Always. Turning keeps every marble, so ' + mx('a × b = b × a') + ' for all numbers. This is the commutative property of multiplication.',
      won() { ch.mark(0, 'good'); ch.lock(); },
      solve() { ch.set([0]); }
    };
  }
},

/* 3 */ {
  prompt: 'Which statement says that rule for every pair of numbers at once?',
  build(stage, ctl, ctx) {
    stage.hidden = true;
    const ch = makeChoices(ctl, [mx('3 × 4 = 4 × 3'), mx('8 × 7 = 7 × 8'), mx('a × b = b × a'), mx('a × b = 12')], ctx);
    const why = [
      'That is true, but it only covers 3 and 4. To cover every pair this way you would need a new statement for each pair, forever.',
      'That is true, but it only covers 8 and 7. You need one statement that covers every pair.',
      '',
      mx('a × b = 12') + ' is only true for some pairs, like 3 and 4 or 2 and 6. Try 5 and 5: 5 × 5 = 25, not 12. It is not a rule for all numbers.'
    ];
    return {
      check() { const s = ch.sel()[0]; if (s === 2) return true; ch.mark(s, 'bad'); return why[s]; },
      win: () => mx('a × b = b × a') + '. The letters can stand for any numbers, so this one line says what ' + mx('3 × 4 = 4 × 3') + ', ' + mx('8 × 7 = 7 × 8') + ' and every other pair say. That is what letters let us do: state a rule about all numbers at once.',
      won() { ch.mark(2, 'good'); ch.lock(); },
      solve() { ch.set([2]); }
    };
  }
},

/* 4 */ {
  prompt: 'Jump 7, then 5, and you land on 12. Where do you land if you jump 5 first, then 7?',
  build(stage, ctl, ctx) {
    let shown = false;
    const top = makeJumps(stage, 0, 20);
    top.set([{ len: 7, lab: '7', cls: 'kn' }, { len: 5, lab: '5', cls: 'kn' }], 'Jump 7, then 5, landing on 12');
    stage.append(h('<div class="live">' + mx('7 + 5 = 12') + '</div>'));
    const bot = makeJumps(stage, 0, 20), botR = h('<div class="live"></div>');
    stage.append(botR);
    const drawBot = () => {
      bot.set(shown ? [{ len: 5, lab: '5', cls: 'kn' }, { len: 7, lab: '7', cls: 'kn' }] : [], shown ? 'Jump 5, then 7, landing on 12' : 'An empty number line');
      botR.innerHTML = mx('5 + 7 = ' + (shown ? 12 : '?'));
    };
    drawBot();
    const ans = makeAnswer(ctl, 'You land on', ctx);
    return {
      check() {
        const v = ans.value();
        if (isNaN(v)) { ans.mark('bad'); return 'Type a whole number, using digits only.'; }
        if (v === 12) { shown = true; drawBot(); return true; }
        ans.mark('bad');
        if (v === 2) return '2 is 7 − 5. Both jumps go forwards, to the right, so nothing is taken away.';
        if (v === 35) return '35 is 5 × 7. These are two jumps joined end to end, so they add.';
        return 'It is the same two jumps as the top path, just in a different order. Where did the top path land?';
      },
      win: () => '12 both times. The same two jumps in a different order end at the same place: ' + mx('5 + 7 = 7 + 5') + '.',
      won() { ans.mark('good'); ans.lock(); },
      solve() { shown = true; drawBot(); ans.set(12); }
    };
  }
},

/* 5 */ {
  prompt: 'The top path is ' + mx('a + b') + '. Use tiles to write the bottom path.',
  build(stage, ctl, ctx) {
    let a = 3, b = 6;
    const top = makeJumps(stage, 0, 20), topR = h('<div class="live"></div>');
    stage.append(topR);
    const bot = makeJumps(stage, 0, 20);
    function draw() {
      top.set([{ len: a, lab: 'a' }, { len: b, lab: 'b', cls: 'v2' }], 'Jump a, then b, landing on ' + (a + b));
      topR.innerHTML = mx('a + b = ' + a + ' + ' + b + ' = ' + (a + b));
      bot.set([{ len: b, lab: 'b', cls: 'v2' }, { len: a, lab: 'a' }], 'Jump b, then a, landing on ' + (a + b));
    }
    const g = sliderRow(ctl, 'sl2');
    makeSlider(g, 'a', 1, 10, a, v => { a = v; draw(); });
    makeSlider(g, 'b', 1, 10, b, v => { b = v; draw(); });
    const bd = makeBuilder(stage, ctl, ['a', 'b', '+', '×'], ctx);
    draw();
    const pairs = [[2, 7], [5, 3], [9, 4]];
    const eq = (t, f) => pairs.every(([x, y]) => evalEnv(t, { a: x, b: y }) === f(x, y));
    return {
      check() {
        const t = bd.toks();
        if (evalEnv(t, { a: 5, b: 3 }) == null) return 'That isn’t a complete expression yet. Put + or × between each pair of tiles.';
        if (t.join(' ') === 'b + a') return true;
        if (eq(t, (x, y) => x + y)) return mx(t.join(' ')) + ' gives the right total, but the bottom path jumps ' + mx('b') + ' first. Write the jumps in the order the path makes them.';
        if (!t.includes('a') || !t.includes('b')) return 'The bottom path uses both jumps, ' + mx('a') + ' and ' + mx('b') + '. Your expression needs both letters.';
        if (eq(t, (x, y) => x * y)) return mx(t.join(' ')) + ' multiplies. The path is two jumps joined end to end, so they add.';
        const [x, y] = pairs.find(([x, y]) => evalEnv(t, { a: x, b: y }) !== x + y);
        return 'Test it with ' + mx('a = ' + x) + ' and ' + mx('b = ' + y) + '. The bottom path lands on ' + (x + y) + ', but your expression gives ' + evalEnv(t, { a: x, b: y }) + '.';
      },
      win: () => mx('b + a') + '. Both paths land on the same point for every ' + mx('a') + ' and ' + mx('b') + ', so ' + mx('a + b = b + a') + '. This is the commutative property of addition: you can add in either order.',
      won() { bd.lock(); },
      solve() { bd.set(['b', '+', 'a']); }
    };
  }
},

/* 6 */ {
  prompt: 'Ari says: “Adding works in either order, so subtracting must too: ' + mx('a − b = b − a') + '.” Find values that prove Ari wrong.',
  sub: 'Each path jumps forwards, then back. Move the sliders until the two paths land in different places.',
  build(stage, ctl, ctx) {
    let a = 4, b = 4;
    const top = makeJumps(stage, -10, 10), topR = h('<div class="live"></div>');
    stage.append(topR);
    const bot = makeJumps(stage, -10, 10), botR = h('<div class="live"></div>');
    stage.append(botR);
    function draw() {
      top.set([{ len: a, lab: 'a' }, { len: -b, lab: 'b', cls: 'v2' }], 'Forwards a, back b, landing on ' + fmtN(a - b));
      topR.innerHTML = mx('a − b = ' + a + ' − ' + b + ' = ' + fmtN(a - b));
      bot.set([{ len: b, lab: 'b', cls: 'v2' }, { len: -a, lab: 'a' }], 'Forwards b, back a, landing on ' + fmtN(b - a));
      botR.innerHTML = mx('b − a = ' + b + ' − ' + a + ' = ' + fmtN(b - a));
    }
    const g = sliderRow(ctl, 'sl2');
    const sa = makeSlider(g, 'a', 1, 10, a, v => { a = v; draw(); ctx.touch(true); });
    const sb = makeSlider(g, 'b', 1, 10, b, v => { b = v; draw(); ctx.touch(true); });
    draw();
    return {
      check: () => a !== b ? true : 'When ' + mx('a') + ' and ' + mx('b') + ' are equal, both sides are 0, so this pair works. Ari’s rule must work for every pair. Find one where the paths land apart.',
      win: () => mx(a + ' − ' + b + ' = ' + fmtN(a - b)) + ', but ' + mx(b + ' − ' + a + ' = ' + fmtN(b - a)) + '. A pair like this is called a counterexample. It proves ' + mx('a − b = b − a') + ' is not true for all numbers. Subtraction is not commutative.',
      solve() { sa.set(7); sb.set(3); }
    };
  }
},

/* 7 */ {
  prompt: 'Ari tries again: “Then dividing works in either order: ' + mx('a ÷ b = b ÷ a') + '.” Prove Ari wrong.',
  sub: 'Share ' + mx('a') + ' dollars among ' + mx('b') + ' people. Then share ' + mx('b') + ' dollars among ' + mx('a') + ' people.',
  build(stage, ctl, ctx) {
    let a = 6, b = 6;
    const cmp = h('<div class="cmp"><div class="L"></div><div class="rel"></div><div class="R"></div></div>');
    stage.append(cmp);
    const side = (x, y, e) => '<small>$' + x + ' shared by ' + people(y) + '</small><span class="big">' + mx(e) + '</span><small>' + x + ' ÷ ' + y + ' = <b>' + money(x / y) + '</b> each</small>';
    function draw() {
      $('.L', cmp).innerHTML = side(a, b, 'a ÷ b');
      $('.R', cmp).innerHTML = side(b, a, 'b ÷ a');
      const rel = $('.rel', cmp);
      rel.textContent = a === b ? '=' : '≠'; rel.classList.toggle('ok', a === b);
    }
    const g = sliderRow(ctl, 'sl2');
    const sa = makeSlider(g, 'a', 1, 12, a, v => { a = v; draw(); ctx.touch(true); });
    const sb = makeSlider(g, 'b', 1, 12, b, v => { b = v; draw(); ctx.touch(true); });
    draw();
    return {
      check: () => a !== b ? true : 'When ' + mx('a') + ' and ' + mx('b') + ' are equal, everyone gets $1 both ways, so this pair happens to work. Find a pair where the shares are different.',
      win: () => '$' + a + ' among ' + people(b) + ' is ' + money(a / b) + ' each, but $' + b + ' among ' + people(a) + ' is ' + money(b / a) + ' each. That counterexample proves ' + mx('a ÷ b = b ÷ a') + ' is not always true. Division is not commutative.',
      solve() { sa.set(12); sb.set(3); }
    };
  }
},

/* 8 */ {
  prompt: 'Take ' + mx('7 − 3 = 4') + ', but ' + mx('3 − 7 = −4') + '. What does one pair like that show?',
  build(stage, ctl, ctx) {
    stage.hidden = true;
    const ch = makeChoices(ctl, [
      mx('a − b = b − a') + ' is not true for all numbers',
      mx('a − b = b − a') + ' is still a rule, with one exception',
      mx('a − b = b − a') + ' is never true',
      'Nothing yet. Try more pairs until one works'
    ], ctx);
    const why = [
      '',
      'A statement with letters claims to work for every number. One pair that fails is enough to break it, so it is not a rule.',
      'It is true for some pairs: when the numbers are equal, like ' + mx('5 − 5 = 5 − 5') + '. It just isn’t true for all of them.',
      'Finding pairs that work, like ' + mx('5 − 5 = 5 − 5') + ', can’t rescue it. The statement has to work for every pair, and 7 and 3 already fail.'
    ];
    return {
      check() { const s = ch.sel()[0]; if (s === 0) return true; ch.mark(s, 'bad'); return why[s]; },
      win: () => 'One counterexample is enough to show a statement is not always true. Order matters when you subtract or divide, even though it doesn’t when you add or multiply.',
      won() { ch.mark(0, 'good'); ch.lock(); },
      solve() { ch.set([0]); }
    };
  }
},

/* 9 */ {
  prompt: 'Tom adds bags ' + mx('a') + ' and ' + mx('b') + ' first. Sal adds ' + mx('b') + ' and ' + mx('c') + ' first. Who counts more marbles?',
  sub: 'Each letter is the number of marbles in that bag.',
  build(stage, ctl, ctx) {
    let a = 3, b = 4, c = 5;
    const two = h('<div class="two"><div><span class="who-l">Tom</span><svg class="grp" viewBox="-4 -16 242 96" role="img" aria-label="Bags a and b grouped, then bag c"></svg><div class="live"></div></div>' +
      '<div><span class="who-l">Sal</span><svg class="grp" viewBox="-4 -16 242 96" role="img" aria-label="Bag a, then bags b and c grouped"></svg><div class="live"></div></div></div>');
    stage.append(two);
    const [tom, sal] = two.querySelectorAll('svg'), [tomR, salR] = two.querySelectorAll('.live');
    const bag = (x, t, n) => bagG(x, 0, { tag: t, inside: n, cls: VC[t] });
    function draw() {
      tom.innerHTML = '<rect class="grp-box" x="0" y="-13" width="148" height="88" rx="14"/>' + bag(8, 'a', a) + bag(78, 'b', b) + bag(164, 'c', c);
      sal.innerHTML = '<rect class="grp-box" x="86" y="-13" width="148" height="88" rx="14"/>' + bag(8, 'a', a) + bag(94, 'b', b) + bag(164, 'c', c);
      tomR.innerHTML = mx('(a + b) + c') + '<small>(' + a + ' + ' + b + ') + ' + c + ' = ' + (a + b) + ' + ' + c + ' = <b>' + (a + b + c) + '</b></small>';
      salR.innerHTML = mx('a + (b + c)') + '<small>' + a + ' + (' + b + ' + ' + c + ') = ' + a + ' + ' + (b + c) + ' = <b>' + (a + b + c) + '</b></small>';
    }
    const g = sliderRow(ctl, 'sl3');
    makeSlider(g, 'a', 1, 8, a, v => { a = v; draw(); });
    makeSlider(g, 'b', 1, 8, b, v => { b = v; draw(); });
    makeSlider(g, 'c', 1, 8, c, v => { c = v; draw(); });
    draw();
    const ch = makeChoices(ctl, ['Tom', 'Sal', 'Always the same', 'It depends on the bags'], ctx);
    wide(ctl);
    const why = [
      'Tom groups two bags first, but so does Sal. Compare the totals under the two pictures.',
      'Sal groups different bags, but the same marbles get counted. Compare the totals under the two pictures.',
      '',
      'Try very different bags with the sliders. The totals match every time, because both count every marble once.'
    ];
    return {
      check() { const s = ch.sel()[0]; if (s === 2) return true; ch.mark(s, 'bad'); return why[s]; },
      win: () => 'Always the same. Both count the same marbles, grouped differently, so ' + mx('(a + b) + c = a + (b + c)') + ' for any numbers. This is the associative property of addition.',
      won() { ch.mark(2, 'good'); ch.lock(); },
      solve() { ch.set([2]); }
    };
  }
},

/* 10 */ {
  prompt: 'Does grouping work like that for subtraction too? Work out both sides.',
  sub: 'Work out the brackets first.',
  build(stage, ctl, ctx) {
    stage.append(h('<div class="cmp"><span class="big">' + mx('(10 − 4) − 3') + '</span><span class="rel">?</span><span class="big">' + mx('10 − (4 − 3)') + '</span></div>'));
    const ch = makeChoices(ctl, ['Both are 3', 'Both are 9', '3 and 9, so different', '6 and 1, so different'], ctx);
    const why = [
      mx('(10 − 4) − 3 = 6 − 3 = 3') + ' is right. Now the other side: brackets first, 4 − 3 = 1, then 10 − 1.',
      mx('10 − (4 − 3) = 10 − 1 = 9') + ' is right. Now the other side: brackets first, 10 − 4 = 6, then 6 − 3.',
      '',
      '6 and 1 are only the brackets. Finish each side: 6 − 3, and 10 − 1.'
    ];
    return {
      check() { const s = ch.sel()[0]; if (s === 2) return true; ch.mark(s, 'bad'); return why[s]; },
      win: () => mx('(10 − 4) − 3 = 3') + ', but ' + mx('10 − (4 − 3) = 9') + '. That counterexample shows grouping matters when you subtract. Division is the same: ' + mx('(12 ÷ 6) ÷ 2 = 1') + ', but ' + mx('12 ÷ (6 ÷ 2) = 4') + '.',
      won() { ch.mark(2, 'good'); ch.lock(); },
      solve() { ch.set([2]); }
    };
  }
},

/* 11 */ {
  prompt: 'Which statements are true for all numbers?',
  sub: 'Drag each card into a box. Or tap a card, then tap a box. Test with numbers if you are unsure.',
  build(stage, ctl, ctx) {
    const items = [
      { e: 'a + b = b + a', bin: 'yes', why: 'Adding in either order lands in the same place, like the two jump paths.' },
      { e: 'a − b = b − a', bin: 'no', why: mx('7 − 3 = 4') + ', but ' + mx('3 − 7 = −4') + '. One counterexample is enough.' },
      { e: 'a × b = b × a', bin: 'yes', why: 'Turning any array keeps every marble, so the order of multiplying never matters.' },
      { e: 'a ÷ b = b ÷ a', bin: 'no', why: '$12 among 3 people is $4 each, but $3 among 12 people is $0.25 each.' },
      { e: '(a + b) + c = a + (b + c)', bin: 'yes', why: 'Grouping the bags differently still counts every marble once.' },
      { e: '(a − b) − c = a − (b − c)', bin: 'no', why: mx('(10 − 4) − 3 = 3') + ', but ' + mx('10 − (4 − 3) = 9') + '.' }
    ];
    const place = items.map(() => 'tray');
    let sel = null, locked = false;
    const bins = h('<div class="bins"><div class="bin" data-drop="yes"><button type="button" class="bin-h">Always true</button><div class="bin-c"></div></div>' +
      '<div class="bin" data-drop="no"><button type="button" class="bin-h">Not always true</button><div class="bin-c"></div></div></div>');
    const tray = h('<div class="chips" data-drop="tray"></div>');
    stage.append(bins); ctl.append(tray);
    const hostOf = w => w === 'tray' ? tray : $('.bin[data-drop=' + w + '] .bin-c', bins);
    const chips = items.map((it, i) => {
      const c = h('<button type="button" class="chip">' + mx(it.e) + '</button>');
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
        return wrong.length === 1 ? mx(w.e) + ' is in the wrong box. ' + w.why
                                  : wrong.length + ' cards are in the wrong box. Start with ' + mx(w.e) + '. ' + w.why;
      },
      win: () => 'Adding and multiplying work in either order, and additions can be grouped any way. Subtraction and division break both rules, and one counterexample is enough to show it.',
      won() { locked = true; chips.forEach(c => { c.classList.remove('sel'); c.classList.add('good'); }); },
      solve() { items.forEach((it, i) => { place[i] = it.bin; }); sel = null; chips.forEach(c => c.classList.remove('bad')); draw(); }
    };
  }
},

/* 12 */ {
  prompt: 'You buy things costing $25, $17 and $75. Swap the prices to make the adding easy, then find the total.',
  sub: 'Tap one price, then another, to swap them. Or drag one price onto another.',
  build(stage, ctl, ctx) {
    let p = [25, 17, 75], sel = null, locked = false;
    const row = h('<div class="tiles"></div>'), live = h('<div class="live"></div>');
    stage.append(row, live);
    const swap = (i, j) => { if (locked) return; if (i !== j) [p[i], p[j]] = [p[j], p[i]]; sel = null; draw(); };
    function draw() {
      row.replaceChildren();
      p.forEach((n, i) => {
        if (i) row.append(h('<span class="tile op still">+</span>'));
        const b = h('<button type="button" class="tile num' + (sel === i ? ' sel' : '') + '" data-drop="price" data-i="' + i + '" aria-label="$' + n + '. Tap, then tap another price to swap.">$' + n + '</button>');
        b.onclick = () => { if (locked) return; if (sel == null) { sel = i; draw(); } else swap(sel, i); };
        draggable(b, { accept: ['price'], onDrop: t => swap(i, +t.getAttribute('data-i')) });
        row.append(b);
      });
      live.innerHTML = mx('(' + p[0] + ' + ' + p[1] + ') + ' + p[2]) + '<small>The first two make ' + (p[0] + p[1]) + '</small>';
    }
    draw();
    const ans = makeAnswer(ctl, 'Total: $', ctx);
    return {
      check() {
        const v = ans.value();
        if (v === 117) return true;
        ans.mark('bad');
        if (isNaN(v)) return 'Type a whole number, using digits only.';
        if (v === 100) return '100 is 25 + 75. Add the $17 as well.';
        if (v === 42) return '42 is 25 + 17. Add the $75 as well.';
        if (v === 92) return '92 is 17 + 75. Add the $25 as well.';
        if (v === 107) return 'So close. 25 + 75 = 100. Check the last step: 100 + 17.';
        return 'Put $25 and $75 next to each other. They make 100, and adding 17 to 100 is easy.';
      },
      win: () => '$117. Swapping to ' + mx('(25 + 75) + 17') + ' gives ' + mx('100 + 17 = 117') + '. You are allowed to swap and regroup because addition is commutative and associative.',
      won() { locked = true; sel = null; draw(); ans.mark('good'); ans.lock(); },
      solve() { p = [25, 75, 17]; sel = null; draw(); ans.set(117); }
    };
  }
},

/* 13 */ {
  prompt: 'Tickets cost $25 each, and 4 classes of 13 students go. Find the total cost quickly.',
  sub: 'Multiplication works in any order too. Which two numbers make an easy start?',
  build(stage, ctl, ctx) {
    stage.append(h('<div class="cmp one"><span class="big">' + mx('4 × 13 × 25') + '<small>4 classes × 13 students × $25 a ticket</small></span></div>'));
    const ans = makeAnswer(ctl, 'Total: $', ctx);
    return {
      check() {
        const v = ans.value();
        if (v === 1300) return true;
        ans.mark('bad');
        if (isNaN(v)) return 'Type a whole number, using digits only.';
        if (v === 52) return '52 is 4 × 13, the number of students. Each ticket costs $25.';
        if (v === 325) return '325 is 13 × 25, the cost for one class. There are 4 classes.';
        if (v === 100) return '100 is 4 × 25, a great start. Now multiply by 13.';
        if (v === 130) return '130 is 10 × 13, but 4 × 25 is 100, not 10. Check the zeros.';
        if (v === 42) return '42 is 4 + 13 + 25. The numbers are multiplied, not added.';
        return 'Multiply 4 × 25 first. That makes 100. Then multiply by 13.';
      },
      win: () => '$1300. Reordering to ' + mx('(4 × 25) × 13 = 100 × 13 = 1300') + ' gives the same answer as ' + mx('(4 × 13) × 25 = 52 × 25') + ', and it is much easier.',
      won() { ans.mark('good'); ans.lock(); },
      solve() { ans.set(1300); }
    };
  }
},

/* 14 */ {
  prompt: 'Three students explain why ' + mx('a + b = b + a') + '. Who gives a good reason?',
  sub: 'Choose Agree or Disagree for each one.',
  build(stage, ctl, ctx) {
    stage.hidden = true;
    const cl = makeClaims(ctl, [
      { who: 'Lena', say: '“I tried 3 + 5 and 5 + 3. Both make 8, so ' + mx('a + b = b + a') + ' is proved.”', agree: false, hint: 'Lena: does one pair show it works for every pair?', why: 'The example is true, but it only covers 3 and 5. A rule about all numbers needs a reason that works for every pair.' },
      { who: 'Tariq', say: '“Jumping ' + mx('a') + ' then ' + mx('b') + ', or ' + mx('b') + ' then ' + mx('a') + ', uses the same two jumps, so you always land in the same place, whatever the numbers are.”', agree: true, hint: 'Tariq: would that reason still work for 100 and 2?', why: 'This reason works for any ' + mx('a') + ' and ' + mx('b') + ', not just the pairs someone tried.' },
      { who: 'Ruby', say: '“It’s true because order never matters in maths. ' + mx('a − b = b − a') + ' too.”', agree: false, hint: 'Ruby: test the last line with 7 and 3.', why: 'Order matters for subtraction: ' + mx('7 − 3 = 4') + ', but ' + mx('3 − 7 = −4') + '. Each operation needs its own check.' }
    ], ctx);
    return {
      check: cl.check,
      win: () => 'Tariq has it. A reason that works for any ' + mx('a') + ' and ' + mx('b') + ', like Tariq’s jumps, shows a rule is true for all numbers. One example, like Lena’s, can’t.',
      won: cl.won,
      solve: cl.solve
    };
  }
}
];

const SECTIONS = [[0, 'Arrays'], [3, 'Jumps'], [5, 'Counterexamples'], [8, 'Grouping'], [10, 'Use it'], [13, 'Wrap-up']];

// Finish screen: sets the prompt, sub-line and recap for this lesson.
function drawFinish() {
  promptEl.textContent = 'Letters let us state a rule about all numbers at once.';
  subEl.hidden = false; subEl.textContent = 'Four things to remember:';
  ctl.replaceChildren(); stage.hidden = false;
  let dots = '';
  for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) dots += marbleG(14 + j * 26, 14 + i * 26, 10.5);
  stage.replaceChildren(h('<ul class="recap">' +
    '<li><span class="art"><svg viewBox="0 0 80 54" aria-hidden="true">' + dots + '</svg></span><span>Order doesn’t matter when you add or multiply: ' + mx('a + b = b + a') + ' and ' + mx('a × b = b × a') + '. These are the commutative properties.</span></li>' +
    '<li><span class="art"><span class="tile var still">a</span><span class="tile var v2 still">b</span><span class="tile var v3 still">c</span></span><span>Grouping doesn’t matter when you add: ' + mx('(a + b) + c = a + (b + c)') + '. This is the associative property.</span></li>' +
    '<li><span class="art"><span class="tile op still">−</span><span class="tile op still">÷</span></span><span>Order and grouping do matter for subtraction and division. One counterexample, like ' + mx('7 − 3 = 4') + ' but ' + mx('3 − 7 = −4') + ', shows a statement is not always true.</span></li>' +
    '<li><span class="art"><span class="tile num still">25</span><span class="tile num still">75</span></span><span>Use the properties to make sums easy: ' + mx('25 + 17 + 75 = (25 + 75) + 17 = 117') + '.</span></li></ul>'));
}
