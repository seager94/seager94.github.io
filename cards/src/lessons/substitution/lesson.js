/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const h = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');

// "3n + 2" -> maths markup. Every letter is italic: lower-case letters are blue variables,
// the letter named in two is the purple second variable, and out (or any capital) is the formula's subject in plain ink.
function mx(s, two, out) {
  return '<span class="m">' + String(s).replace(/[A-Za-z]/g, c => '<i class="' + (c === two ? 'v2' : c === out || /[A-Z]/.test(c) ? 'o' : 'v') + '">' + c + '</i>') + '</span>';
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

function makeSlider(host, name, min, max, value, onInput, two) {
  const row = h('<div class="slider' + (two ? ' two' : '') + '"><label for="sl-' + name + '"><span class="m"><i class="' + (two ? 'v2' : 'v') + '">' + name + '</i> = <span class="val">' + value + '</span></span></label>' +
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

// The value is already in the machine: predict the output, then a right answer runs the machine.
function predictCard(c) {
  return {
    prompt: c.prompt, sub: c.sub,
    build(stage, ctl, ctx) {
      const n = c.n;
      const mc = makeSubMachine(stage, { f: c.f, inCap: mx(c.letter), outCap: c.outCap || 'out' });
      const out = () => c.rule(n), line = () => '<span class="m">' + c.work(n) + ' = ' + c.rule(n) + '</span>';
      const ans = makeAnswer(ctl, c.label || 'Your prediction', ctx);
      mc.input(numTile(n));
      return {
        check() {
          const v = ans.value();
          if (isNaN(v)) { ans.mark('bad'); return 'Type a whole number, using digits only.'; }
          if (v === out()) return true;
          ans.mark('bad');
          return c.wrong[v] || c.other(v);
        },
        win: c.win,
        won() { mc.run(numTile(out()), line()); ans.mark('good'); ans.lock(); },
        solve() { ans.set(out()); }
      };
    }
  };
}

const F2 = s => mx(s, 'b', 'p');   // AFL: g blue, b purple, p the score
const FA = s => mx(s, 'w');        // area: l blue, w purple
const FB = s => mx(s, 'b');        // a blue, b purple

const cards = [

/* 1 */ predictCard({
  prompt: 'This machine works out ' + mx('3n + 2') + '. ' + mx('n = 4') + ' goes in. What will come out?',
  sub: 'Type your prediction, then press Check.',
  f: mx('3n + 2'), letter: 'n', n: 4,
  rule: n => 3 * n + 2, work: n => '3 × ' + n + ' + 2',
  wrong: {
    36: 'You read ' + mx('3n') + ' as 34, then added 2. But ' + mx('3n') + ' means 3 × ' + mx('n') + ', so it is 3 × 4 = 12.',
    34: '34 is 3 and 4 written side by side. ' + mx('3n') + ' means 3 × ' + mx('n') + ': 3 × 4 = 12. Then add 2.',
    9: 'You added: 3 + 4 + 2. But ' + mx('3n') + ' means 3 lots of ' + mx('n') + ', so it is 3 × 4.',
    18: 'You added 4 + 2 first, then multiplied by 3. Multiply first: 3 × 4 = 12, then add 2.',
    12: '12 is ' + mx('3n') + '. The machine then adds 2.'
  },
  other: () => 'Put 4 where ' + mx('n') + ' was: 3 × 4 + 2. Multiply first, then add.',
  win: () => '3 × 4 + 2 = 12 + 2 = 14. Substituting means putting the number where the letter was. ' + mx('3n') + ' has a hidden ×, so it becomes 3 × 4, not 34.'
}),

/* 2 */ {
  prompt: 'Which line shows ' + mx('3n + 2') + ' with 4 put in place of ' + mx('n') + '?',
  build(stage, ctl, ctx) {
    stage.append(h('<div class="big">' + mx('3n + 2') + '</div>'), h('<div class="note">' + mx('n = 4') + '</div>'));
    const ch = makeChoices(ctl, [mx('34 + 2'), mx('3 × 4 + 2'), mx('3 + 4 + 2'), mx('3 × (4 + 2)')], ctx);
    const why = [
      'Writing 3 next to 4 makes the two-digit number 34. In ' + mx('3n') + ' there is a hidden × between the 3 and the ' + mx('n') + '. When the letter goes, write the × in.',
      '',
      mx('3n') + ' means 3 lots of ' + mx('n') + ', so it is 3 × 4, not 3 + 4.',
      'The brackets make you add 4 + 2 first. ' + mx('3n + 2') + ' means work out 3 × ' + mx('n') + ', then add 2.'
    ];
    return {
      check() { const s = ch.sel()[0]; if (s === 1) return true; ch.mark(s, 'bad'); return why[s]; },
      win: () => mx('3 × 4 + 2') + '. When a number replaces the letter, write in the × that was hiding. Then multiply before you add: 12 + 2 = 14.',
      won() { ch.mark(1, 'good'); ch.lock(); },
      solve() { ch.set([1]); }
    };
  }
},

/* 3 */ predictCard({
  prompt: 'A new machine works out ' + mx('5n + 1') + '. ' + mx('n = 7') + ' goes in. What will come out?',
  sub: 'Predict, then press Check.',
  f: mx('5n + 1'), letter: 'n', n: 7,
  rule: n => 5 * n + 1, work: n => '5 × ' + n + ' + 1',
  wrong: {
    58: 'You read ' + mx('5n') + ' as 57. ' + mx('5n') + ' means 5 × ' + mx('n') + ', so it is 5 × 7 = 35.',
    57: '57 is 5 and 7 written side by side. ' + mx('5n') + ' means 5 × 7 = 35. Then add 1.',
    13: 'You added: 5 + 7 + 1. But ' + mx('5n') + ' means 5 × ' + mx('n') + '.',
    40: 'You added 7 + 1 first, then multiplied by 5. Multiply first: 5 × 7 = 35, then add 1.',
    35: '35 is ' + mx('5n') + '. Now add the 1.'
  },
  other: () => 'Put 7 where ' + mx('n') + ' was: 5 × 7 + 1. Multiply first, then add.',
  win: () => '5 × 7 + 1 = 35 + 1 = 36. The same two steps every time: put the number in and write the ×, then multiply before you add.'
}),

/* 4 */ predictCard({
  prompt: 'This machine works out ' + mx('2 + 3n') + '. ' + mx('n = 5') + ' goes in. What will come out?',
  sub: 'The 2 comes first this time. Predict, then press Check.',
  f: mx('2 + 3n'), letter: 'n', n: 5,
  rule: n => 2 + 3 * n, work: n => '2 + 3 × ' + n,
  wrong: {
    25: 'You added 2 + 3 = 5 first, then did 5 × 5. Multiplying comes before adding, even when it is written second: 3 × 5 = 15, then 2 + 15.',
    37: 'You read ' + mx('3n') + ' as 35. ' + mx('3n') + ' means 3 × 5 = 15.',
    10: 'You added: 2 + 3 + 5. But ' + mx('3n') + ' means 3 × ' + mx('n') + '.',
    15: '15 is ' + mx('3n') + '. Now add the 2 at the front.'
  },
  other: () => 'Put 5 where ' + mx('n') + ' was: 2 + 3 × 5. Multiply first, then add.',
  win: () => '2 + 3 × 5 = 2 + 15 = 17. The 3 belongs to the ' + mx('n') + ': ' + mx('3n') + ' is worked out first, wherever it sits.'
}),

/* 5 */ {
  prompt: 'Do ' + mx('2 + 3n') + ' and ' + mx('3n + 2') + ' always give the same number?',
  sub: 'Slide ' + mx('n') + ' to test them.',
  build(stage, ctl, ctx) {
    let n = 1;
    const duo = h('<div class="duo"><div class="panel"><div class="big">' + mx('2 + 3n') + '</div><span class="w"></span></div>' +
      '<div class="panel"><div class="big">' + mx('3n + 2') + '</div><span class="w"></span></div></div>');
    stage.append(duo);
    const ws = duo.querySelectorAll('.w');
    function draw() {
      ws[0].innerHTML = '<small class="m">2 + 3 × ' + n + ' =</small><b class="m">' + (2 + 3 * n) + '</b>';
      ws[1].innerHTML = '<small class="m">3 × ' + n + ' + 2 =</small><b class="m">' + (3 * n + 2) + '</b>';
    }
    makeSlider(ctl, 'n', 0, 10, n, v => { n = v; draw(); });
    draw();
    const ch = makeChoices(ctl, ['Yes, for every ' + mx('n'), mx('2 + 3n') + ' is always bigger', mx('3n + 2') + ' is always bigger', 'Only for some values of ' + mx('n')], ctx);
    const why = [
      '',
      mx('2 + 3n') + ' looks bigger only if you work out 2 + 3 first. Slide ' + mx('n') + ' and watch: the two totals never differ.',
      'Slide ' + mx('n') + ' and compare the two totals. Is there any value where they are different?',
      'Try a few more values. Both work out 3 × ' + mx('n') + ' first and then add 2, so they match for every ' + mx('n') + '.'
    ];
    return {
      check() { const s = ch.sel()[0]; if (s === 0) return true; ch.mark(s, 'bad'); return why[s]; },
      win: () => 'Equal for every ' + mx('n') + '. Both mean 3 × ' + mx('n') + ', then add 2. The order you write the terms in doesn’t matter. The order you work them out does: multiply before you add.',
      won() { ch.mark(0, 'good'); ch.lock(); },
      solve() { ch.set([0]); }
    };
  }
},

/* 6 */ predictCard({
  prompt: 'This machine works out ' + mx('20 − 2n') + '. ' + mx('n = 6') + ' goes in. What will come out?',
  sub: 'Predict, then press Check.',
  f: mx('20 − 2n'), letter: 'n', n: 6,
  rule: n => 20 - 2 * n, work: n => '20 − 2 × ' + n,
  wrong: {
    108: 'You worked out 20 − 2 = 18 first, then 18 × 6. Multiply first: 2 × 6 = 12, then 20 − 12.',
    14: '20 − 6 leaves out the 2. ' + mx('2n') + ' means 2 × 6 = 12.',
    12: '12 is 2 × 6, the value of ' + mx('2n') + '. Now take it away from 20.',
    32: 'That is 20 + 12. The sign is minus, so take 12 away from 20.'
  },
  other: () => 'Put 6 where ' + mx('n') + ' was: 20 − 2 × 6. Multiply first, then subtract.',
  win: () => '20 − 2 × 6 = 20 − 12 = 8. Multiplying comes before subtracting too.'
}),

/* 7 */ predictCard({
  prompt: 'You earn $25 an hour, so your weekly pay in dollars is ' + mx('W = 25h') + '. You work ' + mx('h = 6') + ' hours. What is ' + mx('W') + '?',
  sub: mx('h') + ' is the number of hours you work. Predict, then press Check.',
  f: mx('25h'), letter: 'h', outCap: mx('W'), label: 'Pay in dollars, ' + mx('W'), n: 6,
  rule: h => 25 * h, work: h => '25 × ' + h,
  wrong: {
    256: 'You read ' + mx('25h') + ' as 256. ' + mx('25h') + ' means 25 × ' + mx('h') + ': $25 for each of the 6 hours.',
    31: '25 + 6 adds the hours to the rate. Each hour earns $25, so 6 hours earns 25 × 6.',
    25: '$25 is the pay for one hour. You worked 6 hours.'
  },
  other: () => 'Each hour earns $25. Put 6 where ' + mx('h') + ' was: 25 × 6.',
  win: () => '25 × 6 = 150, so ' + mx('W = 150') + ' and you earn $150. A formula is a rule from real life, with letters standing for numbers.'
}),

/* 8 */ {
  prompt: 'The Crows kicked 12 goals and 8 behinds. Use ' + F2('p = 6g + b') + ' to find their score.',
  sub: 'A goal is worth 6 points and a behind is worth 1. ' + F2('g') + ' is the number of goals, ' + F2('b') + ' the number of behinds, ' + F2('p') + ' the points.',
  build(stage, ctl, ctx) {
    const board = h('<div class="board"><span class="team">Crows</span><span class="sc"><span class="tile num still">12</span>goals, ' + F2('g') + '</span><span class="dot">.</span>' +
      '<span class="sc"><span class="tile num still">8</span>behinds, ' + F2('b') + '</span><span class="sc pts"><span class="tile op still">?</span>points, ' + F2('p') + '</span></div>');
    const live = h('<div class="live">' + F2('p = 6g + b') + '</div>');
    stage.append(board, live);
    const ans = makeAnswer(ctl, 'Points, ' + F2('p'), ctx);
    const why = {
      620: 'You read ' + F2('6g') + ' as 612. ' + F2('6g') + ' means 6 × ' + F2('g') + ' = 6 × 12 = 72.',
      26: 'You added: 6 + 12 + 8. ' + F2('6g') + ' means 6 × ' + F2('g') + ': each of the 12 goals is worth 6.',
      20: '12 + 8 counts every score as 1 point. Each goal is worth 6.',
      72: '72 is the points from goals. Add the 8 behinds.',
      120: 'You added 12 + 8 first, then multiplied by 6. That makes behinds worth 6 too. Multiply first: 6 × 12 = 72, then add 8.',
      60: 'You multiplied the behinds by 6. Goals are worth 6: put 12 where ' + F2('g') + ' is.',
      128: 'The scoreboard’s 12.8 is not the number 128. It means 12 goals and 8 behinds.'
    };
    return {
      check() {
        const v = ans.value();
        if (v === 80) return true;
        ans.mark('bad');
        if (isNaN(v)) return 'Type a whole number, using digits only.';
        return why[v] || 'Put 12 where ' + F2('g') + ' is and 8 where ' + F2('b') + ' is: 6 × 12 + 8. Multiply first.';
      },
      win: () => '6 × 12 + 8 = 72 + 8 = 80 points. Each letter gets its own number: 12 goes where ' + F2('g') + ' was and 8 where ' + F2('b') + ' was.',
      won() {
        $('.pts .tile', board).replaceWith(h(numTile(80)));
        live.innerHTML = F2('p = 6g + b') + '<small>6 × 12 + 8 = 72 + 8 = 80</small>';
        ans.mark('good'); ans.lock();
      },
      solve() { ans.set(80); }
    };
  }
},

/* 9 */ {
  prompt: 'A rectangle’s area is ' + FA('A = lw') + '. Find ' + FA('A') + ' when ' + FA('l = 7') + ' and ' + FA('w = 4') + '.',
  build(stage, ctl, ctx) {
    const l = 7, w = 4;
    let open = false;
    const U = 24;
    const svg = h('<svg class="rect" viewBox="0 0 320 190" role="img"></svg>'), live = h('<div class="live"></div>');
    stage.append(svg, live);
    function draw() {
      const W = l * U, H = w * U, x0 = (270 - W) / 2 + 5, y0 = (160 - H) / 2 + 4;
      let g = '<rect class="r-fill' + (open ? ' open' : '') + '" x="' + x0 + '" y="' + y0 + '" width="' + W + '" height="' + H + '"/>';
      if (open) {
        for (let i = 1; i < l; i++) g += '<line class="r-grid" x1="' + (x0 + i * U) + '" y1="' + y0 + '" x2="' + (x0 + i * U) + '" y2="' + (y0 + H) + '"/>';
        for (let j = 1; j < w; j++) g += '<line class="r-grid" x1="' + x0 + '" y1="' + (y0 + j * U) + '" x2="' + (x0 + W) + '" y2="' + (y0 + j * U) + '"/>';
      }
      g += '<line class="r-l" x1="' + x0 + '" y1="' + (y0 + H) + '" x2="' + (x0 + W) + '" y2="' + (y0 + H) + '"/>' +
        '<line class="r-w" x1="' + (x0 + W) + '" y1="' + y0 + '" x2="' + (x0 + W) + '" y2="' + (y0 + H) + '"/>' +
        '<text class="r-t" x="' + (x0 + W / 2) + '" y="' + (y0 + H + 24) + '" text-anchor="middle"><tspan class="v">l</tspan> = ' + l + '</text>' +
        '<text class="r-t" x="' + (x0 + W + 10) + '" y="' + (y0 + H / 2 + 6) + '"><tspan class="v2">w</tspan> = ' + w + '</text>';
      svg.innerHTML = g;
      svg.setAttribute('aria-label', 'Rectangle ' + l + ' units long and ' + w + ' units wide');
      live.innerHTML = FA('A = lw') + (open ? '<small>7 × 4 = 28 square units</small>' : '');
    }
    const ans = makeAnswer(ctl, 'Area, ' + FA('A') + ', in square units', ctx);
    draw();
    const why = {
      74: FA('lw') + ' means ' + FA('l') + ' × ' + FA('w') + '. Writing 7 next to 4 makes 74.',
      47: FA('lw') + ' means ' + FA('l') + ' × ' + FA('w') + ', not the digits 4 and 7 side by side.',
      11: '7 + 4 adds the two sides. Area is length times width: 7 × 4.',
      22: '22 is the perimeter, the distance all the way around. Area counts the squares inside: 7 × 4.'
    };
    return {
      check() {
        const v = ans.value();
        if (v === 28) return true;
        ans.mark('bad');
        if (isNaN(v)) return 'Type a whole number, using digits only.';
        return why[v] || 'Put 7 where ' + FA('l') + ' was and 4 where ' + FA('w') + ' was: 7 × 4.';
      },
      win: () => '7 × 4 = 28, so ' + FA('A = 28') + '. There are 4 rows of 7 squares. Like ' + mx('3n') + ', ' + FA('lw') + ' has a hidden ×.',
      won() { open = true; draw(); ans.mark('good'); ans.lock(); },
      solve() { ans.set(28); }
    };
  }
},

/* 10 */ {
  prompt: 'Two letters at once. Find ' + FB('2a + 3b') + ' when ' + FB('a = 5') + ' and ' + FB('b = 4') + '.',
  build(stage, ctl, ctx) {
    const live = h('<div class="live"></div>');
    stage.append(h('<div class="big">' + FB('2a + 3b') + '</div>'), h('<div class="notes"><span class="note">' + FB('a = 5') + '</span><span class="note two">' + FB('b = 4') + '</span></div>'), live);
    const ans = makeAnswer(ctl, 'Value', ctx);
    const why = {
      59: 'That is 25 + 34. ' + FB('2a') + ' means 2 × ' + FB('a') + ', and ' + FB('3b') + ' means 3 × ' + FB('b') + '.',
      23: 'You swapped the numbers: 2 × 4 + 3 × 5. ' + FB('a') + ' is 5, so ' + FB('2a') + ' = 2 × 5. ' + FB('b') + ' is 4, so ' + FB('3b') + ' = 3 × 4.',
      14: 'You added: 2 + 5 + 3 + 4. ' + FB('2a') + ' means 2 × ' + FB('a') + ' and ' + FB('3b') + ' means 3 × ' + FB('b') + '.',
      52: 'You worked out 2 × 5 + 3 = 13, then 13 × 4. Do both multiplications first: 2 × 5 and 3 × 4, then add.',
      10: '10 is ' + FB('2a') + '. Add ' + FB('3b') + ' as well.',
      12: '12 is ' + FB('3b') + '. Add ' + FB('2a') + ' as well.'
    };
    return {
      check() {
        const v = ans.value();
        if (v === 22) return true;
        ans.mark('bad');
        if (isNaN(v)) return 'Type a whole number, using digits only.';
        return why[v] || 'Put 5 where ' + FB('a') + ' was and 4 where ' + FB('b') + ' was: 2 × 5 + 3 × 4. Multiply first, then add.';
      },
      win: () => '2 × 5 + 3 × 4 = 10 + 12 = 22. Each letter gets its own number: 5 everywhere ' + FB('a') + ' was, 4 everywhere ' + FB('b') + ' was.',
      won() { live.innerHTML = '<span class="m">2 × 5 + 3 × 4 = 10 + 12 = 22</span>'; ans.mark('good'); ans.lock(); },
      solve() { ans.set(22); }
    };
  }
},

/* 11 */ {
  prompt: 'Work backwards. Which value of ' + mx('n') + ' makes ' + mx('3n + 2') + ' give 20?',
  sub: 'Move the slider. The machine runs every time.',
  build(stage, ctl, ctx) {
    let n = 1;
    const mc = makeSubMachine(stage, { f: mx('3n + 2'), inCap: mx('n'), outCap: 'out' });
    const draw = () => { mc.input(numTile(n)); mc.show(numTile(3 * n + 2), '<span class="m">3 × ' + n + ' + 2 = ' + (3 * n + 2) + '</span>'); };
    const sl = makeSlider(ctl, 'n', 0, 10, n, v => { n = v; draw(); ctx.touch(true); });
    draw();
    return {
      check() {
        const o = 3 * n + 2;
        return o === 20 ? true : 'When ' + mx('n = ' + n) + ', 3 × ' + n + ' + 2 = ' + o + '. You need 20, so make ' + mx('n') + (o < 20 ? ' bigger.' : ' smaller.');
      },
      win: () => mx('n = 6') + ', because 3 × 6 + 2 = 20. Without a slider, undo the steps in reverse: 20 − 2 = 18, then 18 ÷ 3 = 6.',
      solve() { sl.set(6); }
    };
  }
},

/* 12 */ {
  prompt: 'Your pay this week was $200. Use ' + mx('W = 25h') + ' to find how many hours you worked.',
  build(stage, ctl, ctx) {
    const mc = makeSubMachine(stage, { f: mx('25h'), inCap: mx('h'), outCap: mx('W') });
    mc.input(Q); mc.show(numTile(200));
    const ans = makeAnswer(ctl, 'Hours, ' + mx('h'), ctx);
    const why = {
      5000: '200 × 25 runs the machine forwards again. To work backwards, undo × 25 by dividing.',
      175: '200 − 25 takes off one hour’s pay. The machine multiplies by 25, so undo it by dividing: 200 ÷ 25.',
      225: '200 + 25 adds another hour’s pay. Which number times 25 makes 200?'
    };
    return {
      check() {
        const v = ans.value();
        if (v === 8) return true;
        ans.mark('bad');
        if (isNaN(v)) return 'Type a whole number, using digits only.';
        return why[v] || 'Check it: 25 × ' + v + ' = ' + 25 * v + ', not 200. Try ' + (25 * v < 200 ? 'more' : 'fewer') + ' hours.';
      },
      win: () => '200 ÷ 25 = 8 hours. Check by substituting: 25 × 8 = 200. Working backwards undoes the machine’s steps.',
      won() { mc.input(numTile(8)); mc.show(numTile(200), '<span class="m">25 × 8 = 200</span>'); ans.mark('good'); ans.lock(); },
      solve() { ans.set(8); }
    };
  }
},

/* 13 */ {
  prompt: 'Three students substitute ' + mx('n = 3') + ' into ' + mx('4 + 5n') + '. Who is right?',
  sub: 'Choose Agree or Disagree for each one.',
  build(stage, ctl, ctx) {
    stage.hidden = true;
    const claims = [
      { who: 'Zoe', say: '“' + mx('5n') + ' is 53, so 4 + 53 = 57.”', agree: false, why: mx('5n') + ' means 5 × ' + mx('n') + '. Writing 5 next to 3 makes 53, a different number.' },
      { who: 'Noah', say: '“4 + 5 = 9, then 9 × 3 = 27.”', agree: false, why: 'Noah added before multiplying. ' + mx('5n') + ' is worked out first: 5 × 3 = 15.' },
      { who: 'Priya', say: '“I put 3 where ' + mx('n') + ' was: 4 + 5 × 3. Multiply first, so 4 + 15 = 19.”', agree: true, why: 'Number in where the letter was, the hidden × written in, then multiply before adding.' }
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
      win: () => 'Priya has it: 4 + 5 × 3 = 4 + 15 = 19. Zoe read ' + mx('5n') + ' as a two-digit number, and Noah added before multiplying. Substituting means putting the number where the letter was, then following the order of operations.',
      won() { locked = true; claims.forEach((c, i) => { rows[i].row.classList.remove('bad'); explain(i, 'good'); rows[i].btns.forEach(b => { b.disabled = true; }); }); },
      solve() { claims.forEach((c, i) => { pick[i] = c.agree; paint(i); }); }
    };
  }
}
];

const SECTIONS = [[0, 'The machine'], [3, 'Order matters'], [6, 'Formulas'], [10, 'Backwards'], [12, 'Wrap-up']];

// Finish screen: sets the prompt, sub-line and recap for this lesson.
function drawFinish() {
  promptEl.textContent = 'Substituting means putting the number where the letter was.';
  subEl.hidden = false; subEl.textContent = 'Then follow the usual order of operations. Four things to remember:';
  ctl.replaceChildren(); stage.hidden = false;
  const t = (k, s) => '<span class="tile ' + k + ' still">' + s + '</span>';
  stage.replaceChildren(h('<ul class="recap">' +
    '<li><span class="art">' + t('num', '3') + t('var', 'n') + '</span><span>' + mx('3n') + ' means 3 × ' + mx('n') + '. When ' + mx('n = 4') + ' it is 3 × 4 = 12, never 34.</span></li>' +
    '<li><span class="art">' + t('op', '×') + t('op', '+') + '</span><span>Multiply before you add, wherever the term sits: ' + mx('2 + 3n') + ' at ' + mx('n = 5') + ' is 2 + 15 = 17, not 25.</span></li>' +
    '<li><span class="art">' + t('var', 'g') + t('var2', 'b') + '</span><span>With two letters, each gets its own number: ' + F2('p = 6g + b') + ' with 12 goals and 8 behinds is 72 + 8 = 80.</span></li>' +
    '<li><span class="art">' + t('num', '20') + t('op', '→') + t('num', '6') + '</span><span>You can work backwards from an output: ' + mx('3n + 2') + ' gives 20 when ' + mx('n = 6') + '.</span></li></ul>'));
}
