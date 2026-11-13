// Low-res pixel renderer: everything draws into a 320x180 canvas that CSS scales up by whole numbers.
export const W = 320, H = 180;
export const canvas = document.getElementById('screen');
canvas.width = W;
canvas.height = H;
export const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

export const P = {
  void: '#07060b', ink0: '#0d0b14', ink1: '#15111d', ink2: '#1f1929', ink3: '#2b2337',
  stone: '#3d3250', stone2: '#574868', dust: '#8a7795',
  bone: '#e6d8bd', paper: '#fff6e0',
  ember: '#ff6a2b', ember2: '#ffa646', ember3: '#ffe08a',
  blood: '#e0223f', bloodD: '#6b0f24',
  volt: '#62efff', volt2: '#2c7cff', voltD: '#163a78',
  ichor: '#b5f23a', ichorD: '#45651a',
  hex: '#ff4fa8', hexD: '#6e1b52',
  gold: '#ffd447', gold2: '#b9811c',
};

export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

let C = ctx;
export function target(g) { C = g || ctx; }

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').imageSmoothingEnabled = false;
  return c;
}

export function fit() {
  const raw = Math.min(innerWidth / W, innerHeight / H);
  const touch = document.documentElement.classList.contains('touch');
  const s = touch ? Math.max(0.5, raw) : Math.max(1, Math.floor(raw));
  canvas.style.width = W * s + 'px';
  canvas.style.height = H * s + 'px';
}

export function rect(x, y, w, h, c) { C.fillStyle = c; C.fillRect(Math.round(x), Math.round(y), w, h); }
export function px(x, y, c) { C.fillStyle = c; C.fillRect(Math.round(x), Math.round(y), 1, 1); }

export function line(x0, y0, x1, y1, c, w = 1) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  C.fillStyle = c;
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  const o = (w - 1) >> 1;
  let e = dx + dy, n = 0;
  for (;;) {
    C.fillRect(x0 - o, y0 - o, w, w);
    if ((x0 === x1 && y0 === y1) || ++n > 1500) break;
    const e2 = 2 * e;
    if (e2 >= dy) { e += dy; x0 += sx; }
    if (e2 <= dx) { e += dx; y0 += sy; }
  }
}

export function disc(cx, cy, r, c) {
  cx = Math.round(cx); cy = Math.round(cy);
  C.fillStyle = c;
  const ir = Math.ceil(r);
  for (let y = -ir; y <= ir; y++) {
    const q = r * r - y * y;
    if (q < 0) continue;
    const w = Math.floor(Math.sqrt(q));
    C.fillRect(cx - w, cy + y, w * 2 + 1, 1);
  }
}

// Scanline ring: no holes at any thickness.
export function ring(cx, cy, r, th, c) {
  if (r <= 0) return;
  cx = Math.round(cx); cy = Math.round(cy);
  C.fillStyle = c;
  const ri = Math.max(0, r - th), R = Math.ceil(r);
  for (let y = -R; y <= R; y++) {
    const yy = y * y;
    if (yy > r * r) continue;
    const wo = Math.floor(Math.sqrt(r * r - yy));
    if (yy >= ri * ri) { C.fillRect(cx - wo, cy + y, wo * 2 + 1, 1); continue; }
    const wi = Math.ceil(Math.sqrt(ri * ri - yy));
    if (wo >= wi) {
      C.fillRect(cx - wo, cy + y, wo - wi + 1, 1);
      C.fillRect(cx + wi, cy + y, wo - wi + 1, 1);
    }
  }
}

// ---------- sprites ----------
export function makeSprite(rows, map) {
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  const build = (pick, flip) => {
    const c = makeCanvas(w, h), g = c.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      if (!ch || ch === '.') continue;
      const col = pick(ch);
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect(flip ? w - 1 - x : x, y, 1, 1);
    }
    return c;
  };
  const s = { w, h, cache: {} };
  s.n = build((ch) => map[ch], false);
  s.f = build((ch) => map[ch], true);
  s.tint = (col, flip) => {
    const k = col + (flip ? 'f' : 'n');
    return s.cache[k] || (s.cache[k] = build((ch) => (map[ch] ? col : null), flip));
  };
  return s;
}

export function drawSprite(s, x, y, flip, tint) {
  C.drawImage(tint ? s.tint(tint, flip) : flip ? s.f : s.n, Math.round(x), Math.round(y));
}

// ---------- dithered additive glow ----------
const gcache = new Map();
function glowTex(col, r) {
  const k = col + r;
  let c = gcache.get(k);
  if (c) return c;
  const s = r * 2 + 1;
  c = makeCanvas(s, s);
  const g = c.getContext('2d');
  g.fillStyle = col;
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const d = Math.hypot(x - r, y - r) / r;
    if (d >= 1) continue;
    if (Math.pow(1 - d, 1.6) > (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16) g.fillRect(x, y, 1, 1);
  }
  gcache.set(k, c);
  return c;
}
export function glow(x, y, col, r, a = 1) {
  r = Math.max(2, Math.round(r));
  C.globalCompositeOperation = 'lighter';
  C.globalAlpha = Math.max(0, Math.min(1, a));
  C.drawImage(glowTex(col, r), Math.round(x) - r, Math.round(y) - r);
  C.globalAlpha = 1;
  C.globalCompositeOperation = 'source-over';
}

// ---------- 3x5 pixel font ----------
const FONT = {
  A: '.#./#.#/###/#.#/#.#', B: '##./#.#/##./#.#/##.', C: '.##/#../#../#../.##', D: '##./#.#/#.#/#.#/##.',
  E: '###/#../##./#../###', F: '###/#../##./#../#..', G: '.##/#../#.#/#.#/.##', H: '#.#/#.#/###/#.#/#.#',
  I: '###/.#./.#./.#./###', J: '..#/..#/..#/#.#/.#.', K: '#.#/#.#/##./#.#/#.#', L: '#../#../#../#../###',
  M: '#.#/###/###/#.#/#.#', N: '##./#.#/#.#/#.#/#.#', O: '.#./#.#/#.#/#.#/.#.', P: '##./#.#/##./#../#..',
  Q: '.#./#.#/#.#/##./.##', R: '##./#.#/##./#.#/#.#', S: '.##/#../.#./..#/##.', T: '###/.#./.#./.#./.#.',
  U: '#.#/#.#/#.#/#.#/###', V: '#.#/#.#/#.#/#.#/.#.', W: '#.#/#.#/###/###/#.#', X: '#.#/#.#/.#./#.#/#.#',
  Y: '#.#/#.#/.#./.#./.#.', Z: '###/..#/.#./#../###',
  0: '###/#.#/#.#/#.#/###', 1: '.#./##./.#./.#./###', 2: '##./..#/.#./#../###', 3: '##./..#/.#./..#/##.',
  4: '#.#/#.#/###/..#/..#', 5: '###/#../##./..#/##.', 6: '.##/#../###/#.#/###', 7: '###/..#/.#./.#./.#.',
  8: '###/#.#/###/#.#/###', 9: '###/#.#/###/..#/##.',
  '.': '.../.../.../.../.#.', ',': '.../.../.../.#./#..', '!': '.#./.#./.#./.../.#.', '?': '##./..#/.#./.../.#.',
  ':': '.../.#./.../.#./...', '-': '.../.../###/.../...', '+': '.../.#./###/.#./...', '/': '..#/..#/.#./#../#..',
  "'": '.#./.#./.../.../...', '%': '#.#/..#/.#./#../#.#', '(': '.#./#../#../#../.#.', ')': '.#./..#/..#/..#/.#.',
  '>': '#../.#./..#/.#./#..', '<': '..#/.#./#../.#./..#', '[': '##./#../#../#../##.', ']': '.##/..#/..#/..#/.##',
  '=': '.../###/.../###/...', '*': '#.#/.#./#.#/.../...', '_': '.../.../.../.../###',
};
const GLY = {};
for (const k in FONT) GLY[k] = FONT[k].split('/');

export const textW = (s, sc = 1) => (s.length ? s.length * 4 * sc - sc : 0);

export function text(s, x, y, col, sc = 1, align = 'l') {
  s = String(s).toUpperCase();
  const w = textW(s, sc);
  if (align === 'c') x -= w / 2; else if (align === 'r') x -= w;
  x = Math.round(x); y = Math.round(y);
  const cols = Array.isArray(col) ? col : null;
  if (!cols) C.fillStyle = col;
  for (let i = 0; i < s.length; i++) {
    const g = GLY[s[i]];
    if (!g) continue;
    for (let r = 0; r < 5; r++) {
      if (cols) C.fillStyle = cols[r];
      const row = g[r];
      for (let c = 0; c < 3; c++) if (row[c] === '#') C.fillRect(x + (i * 4 + c) * sc, y + r * sc, sc, sc);
    }
  }
  return w;
}

const OUT = [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
export function textO(s, x, y, col, sc = 1, align = 'l', oc = P.ink0) {
  for (const [dx, dy] of OUT) text(s, x + dx, y + dy, oc, sc, align);
  return text(s, x, y, col, sc, align);
}

// ---------- 5x7 logo face, only the letters the title needs ----------
const LOGO = {
  A: '.###./#...#/#...#/#####/#...#/#...#/#...#',
  S: '.####/#..../#..../.###./....#/....#/####.',
  H: '#...#/#...#/#...#/#####/#...#/#...#/#...#',
  B: '####./#...#/#...#/####./#...#/#...#/####.',
  L: '#..../#..../#..../#..../#..../#..../#####',
  D: '####./#...#/#...#/#...#/#...#/#...#/####.',
  E: '#####/#..../#..../####./#..../#..../#####',
};
export function logoCanvas(word, sc, rowCols, shade) {
  const lw = word.length * 6 * sc + 8 * sc, lh = 7 * sc + 4;
  const c = makeCanvas(lw + 4, lh + 4), g = c.getContext('2d');
  const paint = (ox, oy, colFn) => {
    for (let i = 0; i < word.length; i++) {
      const rows = LOGO[word[i]].split('/');
      for (let r = 0; r < 7; r++) {
        g.fillStyle = colFn(r);
                for (let k = 0; k < 5; k++) if (rows[r][k] === '#') g.fillRect(ox + i * 6 * sc + k * sc, oy + r * sc, sc, sc);
      }
    }
  };
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [2, 3], [1, 3], [3, 3]]) paint(2 + dx, 2 + dy, () => shade);
  paint(2, 2, (r) => rowCols[r]);
  return c;
}

// ---------- color themes & display filters ----------
export const THEMES = {
  EMBER: { ember: '#ff6a2b', ember2: '#ffa646', ember3: '#ffe08a', gold: '#ffd447', gold2: '#b9811c', paper: '#fff6e0', bone: '#e6d8bd' },
  FROST: { ember: '#3fa9ff', ember2: '#7fd0ff', ember3: '#d4f3ff', gold: '#bff4ff', gold2: '#3c7fa8', paper: '#f2fbff', bone: '#cfe2ea' },
  TOXIC: { ember: '#5bdc2c', ember2: '#a4f048', ember3: '#e6ffb0', gold: '#d8ff4a', gold2: '#6f9a1c', paper: '#f4ffe6', bone: '#d6e3c4' },
  'BLOOD MOON': { ember: '#e5203c', ember2: '#ff5a4f', ember3: '#ffb3a1', gold: '#ff8a5c', gold2: '#8f2a1f', paper: '#ffeee8', bone: '#e8c9c0' },
  ROYAL: { ember: '#9b5cff', ember2: '#c99bff', ember3: '#f0dcff', gold: '#ffd447', gold2: '#b9811c', paper: '#fbf4ff', bone: '#ddd0ea' },
  NOIR: { ember: '#cfcfcf', ember2: '#ececec', ember3: '#ffffff', gold: '#ff3b3b', gold2: '#8a1f1f', paper: '#ffffff', bone: '#bdbdbd' },
};
export function applyTheme(name) { Object.assign(P, THEMES[name] || THEMES.EMBER); }
export function applyDisplay(s) {
  canvas.style.filter = `saturate(${s.vibrancy}) brightness(${s.bright}) contrast(${s.contrast}) hue-rotate(${s.hue}deg)`;
  document.documentElement.classList.toggle('crt', !!s.crt);
}
