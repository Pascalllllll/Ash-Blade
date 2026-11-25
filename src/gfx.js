// Low-res pixel renderer: everything is laid out on a 320x180 stage that CSS scales up to fill the window.
export const W = 320, H = 180;
// On a screen wider than 16:9 the canvas grows to FW game pixels (up to 21:9) and the 320-wide stage sits in its
// middle, SX pixels in. Everything still lays out on the stage; the arena, backgrounds, full-screen effects, the
// HUD's corners and the touch buttons reach out to the real edges (x from -SX to W + SX).
export let FW = W, SX = 0;
const widthHooks = [];
export const onWidth = (f) => widthHooks.push(f);
export const canvas = document.getElementById('screen');
// The world is drawn on a 960 x 540 canvas: positions stay in game pixels (320 x 180), and every sprite has a
// pixel density. Density 1 sprites (monsters, bosses, effects) keep their exact pixels, each one shown as 3 x 3;
// the heroes are pixel art at density 3, so an 18 game-pixel hero is a 54-pixel sprite.
export const SS = 3;
canvas.width = W * SS;
canvas.height = H * SS;
export const ctx = canvas.getContext('2d');
ctx.setTransform(SS, 0, 0, SS, 0, 0);
ctx.imageSmoothingEnabled = false;
// the stage's own transform: game pixels, shifted SX in (a fill helper uses it to reach the real edges)
export const stageTransform = (g = ctx) => g.setTransform(SS, 0, 0, SS, SX * SS, 0);
function setWidth(fw) {
  if (fw === FW) return;
  FW = fw; SX = (FW - W) / 2;
  canvas.width = FW * SS; canvas.height = H * SS;
  stageTransform(); ctx.imageSmoothingEnabled = false;
  for (const f of widthHooks) f();
}
// fills the whole screen, edge to edge, whatever the stage's width
export function fillScreen(c, a = 1, g = ctx) { if (a <= 0) return; const ga = g.globalAlpha; g.globalAlpha = ga * Math.min(1, a); g.fillStyle = c; g.fillRect(-SX, 0, FW, H); g.globalAlpha = ga; }

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
// while set, the drawing helpers swap colors through this map (the awakened fighter's own effects)
let RM = null;
export function remap(m) { RM = m || null; }
const rc = (c) => (RM && RM[c]) || c;

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').imageSmoothingEnabled = false;
  return c;
}

// ---------- HD layer ----------
// A second canvas over the game screen at the display's real resolution, for the select screen's big
// fighter portraits: they have far more pixels than the 320 x 180 game screen. Drawn in game units
// through hdBegin(); cleared on frames that don't use it.
export const hd = document.createElement('canvas');
hd.id = 'hd';
hd.style.visibility = 'hidden';
hd.setAttribute('aria-hidden', 'true');
canvas.after(hd);
const hctx = hd.getContext('2d');
let hdUsed = false, hdDirty = false;
// starts an HD frame: returns the context scaled to game units, and the device pixels per game unit
export function hdBegin() {
  const k = hd.width / FW, ky = hd.height / H;
  hctx.setTransform(1, 0, 0, 1, 0, 0); hctx.clearRect(0, 0, hd.width, hd.height);
  hctx.setTransform(k, 0, 0, ky, SX * k, 0); hctx.imageSmoothingEnabled = false;
  hdUsed = true; hdDirty = true;
  if (hd.style.visibility !== 'visible') hd.style.visibility = 'visible';
  return [hctx, k];
}
export const hdActive = () => hdUsed;
export const hdCtx = () => hctx;
export function hdEnd() {
  // an unused layer is hidden, so the browser stops compositing a screen-sized transparent canvas every frame
  if (!hdUsed && hdDirty) { hctx.setTransform(1, 0, 0, 1, 0, 0); hctx.clearRect(0, 0, hd.width, hd.height); hdDirty = false; hd.style.visibility = 'hidden'; }
  hdUsed = false;
}

// AUTO: fills the window, whatever the device: on a screen wider than 16:9 (a phone on its side) the game gets wider
// instead of leaving bars at the sides. SHARP: the biggest whole-number zoom, so every game pixel is the same size.
// A fixed resolution is in device pixels and never grows past the window.
export const view = { res: 'AUTO' };
export const MAX_W = 426;   // 21:9 and a little more
export const rotatedTouch = () => document.documentElement.classList.contains('touch') && innerHeight > innerWidth;
export function fit() {
  const viewW = rotatedTouch() ? innerHeight : innerWidth, viewH = rotatedTouch() ? innerWidth : innerHeight;
  const aspect = viewW / Math.max(1, viewH), want = 2 * Math.round((H * aspect) / 2);
  setWidth(view.res === 'AUTO' ? Math.max(W, Math.min(MAX_W, want)) : W);
  const raw = Math.min(viewW / FW, viewH / H);
  const touch = document.documentElement.classList.contains('touch');
  let s;
  if (view.res === 'AUTO') s = raw;
  else if (view.res === 'SHARP') s = touch ? Math.max(0.5, raw) : Math.max(1, Math.floor(raw));
  else s = Math.min(raw, parseInt(view.res, 10) / W / (devicePixelRatio || 1));
  let cw = FW * s, ch = H * s;
  // AUTO on a screen the stage widened to match: fill it exactly, edge to edge (the stretch is under a pixel)
  if (view.res === 'AUTO' && FW === want) { cw = viewW; ch = viewH; }
  canvas.style.width = cw + 'px';
  canvas.style.height = ch + 'px';
  // the HD layer matches the screen in device pixels
  // capped at 2x pixel density and 2560 wide: phones at 3x don't need more, and every pixel costs
  const dpr = Math.min(2, devicePixelRatio || 1), k = Math.min(1, 2560 / (cw * dpr));
  hd.width = Math.round(cw * dpr * k); hd.height = Math.round(ch * dpr * k);
  hd.style.width = cw + 'px'; hd.style.height = ch + 'px';
}

export function rect(x, y, w, h, c) { C.fillStyle = rc(c); C.fillRect(Math.round(x), Math.round(y), w, h); }
export function px(x, y, c) { C.fillStyle = rc(c); C.fillRect(Math.round(x), Math.round(y), 1, 1); }

export function line(x0, y0, x1, y1, c, w = 1) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  C.fillStyle = rc(c);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  const o = (w - 1) >> 1;
  if (dy === 0) { C.fillRect(Math.min(x0,x1)-o, y0-o, dx+w, w); return; }
  if (dx === 0) { C.fillRect(x0-o, Math.min(y0,y1)-o, w, w-dy); return; }
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
  C.fillStyle = rc(c);
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
  C.fillStyle = rc(c);
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
export function mix(a, b, k) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (sh) => Math.round(((pa >> sh) & 255) * (1 - k) + ((pb >> sh) & 255) * k);
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
}
// eyes: the characters in `rows` that are eyes. They get a highlight and a closed-eye frame for blinking.
// opt.k: pixel density (2 = two sprite pixels per game pixel); opt.flat: hand-shaded art, so no automatic
// light and shadow pass (the outline still takes its own color)
export function makeSprite(rows, map, eyes, opt = {}) {
  const h = rows.length, w = Math.max(...rows.map((r) => r.length)), k = opt.k || 1;
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
  // w and h are in game pixels; the images themselves are k times bigger
  const s = { w: w / k, h: h / k, k, cache: {} };
  // icons use '#' and hand-shaded art is flat; every other sprite gets an automatic detail pass
  const shade = !map['#'] && !opt.flat;
  const at = (x, y) => rows[y]?.[x];
  const empty = (c) => !c || c === '.';
  const edge = (c) => empty(c) || c === 'o';
  const solid = (c) => !edge(c) && map[c] && map[c].length === 7;
  const lit = (ch, x, y) => {
    const col = map[ch];
    if (!col || !shade || col.length !== 7) return col;
    if (ch === 'o') {
      // selective outline: inner lines take a dark shade of the color beside them, the silhouette stays near black
      const outer = [[0, -1], [1, 0], [0, 1], [-1, 0]].some(([dx, dy]) => empty(at(x + dx, y + dy)));
      const nb = [[0, -1], [-1, 0], [1, 0], [0, 1]].map(([dx, dy]) => at(x + dx, y + dy)).find(solid);
      return nb ? mix(map[nb], '#05040a', outer ? 0.82 : 0.6) : col;
    }
    if (eyes && eyes.includes(ch)) return col;
    if (edge(at(x, y - 1))) return mix(col, '#ffffff', 0.22);
    if (edge(at(x, y + 1))) return mix(col, '#000000', 0.3);
    if (edge(at(x + 1, y)) && !edge(at(x - 1, y))) return mix(col, '#000000', 0.16);
    // a dithered core shadow two pixels above a bottom edge gives surfaces texture
    if (edge(at(x, y + 2)) && (x + y) % 2 === 0) return mix(col, '#000000', 0.12);
    if (edge(at(x - 1, y)) && (x + y) % 2 === 1) return mix(col, '#ffffff', 0.08);
    return col;
  };
  const buildLit = (flip) => {
    const c = makeCanvas(w, h), g = c.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      if (!ch || ch === '.') continue;
      const col = lit(ch, x, y);
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect(flip ? w - 1 - x : x, y, 1, 1);
    }
    // eye highlights: the top-left pixel of each eye turns near white
    if (eyes) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      if (!eyes.includes(ch) || eyes.includes(at(x - 1, y)) || eyes.includes(at(x, y - 1))) continue;
      g.fillStyle = mix(map[ch], '#ffffff', 0.75);
      g.fillRect(flip ? w - 1 - x : x, y, 1, 1);
    }
    return c;
  };
  // fast path: every pixel's color worked out once and written into one image buffer, and the mirrored copy drawn
  // flipped in one go (painting pixel by pixel twice made building a hero's 70 frames slow on phones)
  const fast = () => {
    const img = new ImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      if (!ch || ch === '.') continue;
      let col = lit(ch, x, y);
      if (!col) continue;
      if (eyes && eyes.includes(ch) && !eyes.includes(at(x - 1, y)) && !eyes.includes(at(x, y - 1))) col = mix(map[ch], '#ffffff', 0.75);
      if (col.length !== 7 || col[0] !== '#') return null;
      const v = parseInt(col.slice(1), 16), i = (y * w + x) * 4;
      d[i] = v >> 16; d[i + 1] = (v >> 8) & 255; d[i + 2] = v & 255; d[i + 3] = 255;
    }
    const n = makeCanvas(w, h); n.getContext('2d').putImageData(img, 0, 0);
    const f = makeCanvas(w, h), g = f.getContext('2d'); g.translate(w, 0); g.scale(-1, 1); g.drawImage(n, 0, 0);
    return [n, f];
  };
  const nf = fast();
  if (nf) [s.n, s.f] = nf;
  else { s.n = buildLit(false); s.f = buildLit(true); }
  s.tint = (col, flip) => {
    const k = col + (flip ? 'f' : 'n');
    return s.cache[k] || (s.cache[k] = build((ch) => (map[ch] ? col : null), flip));
  };
  if (eyes) {
    // the blink frame: eyes become a dark lid line
    const closed = rows.map((r) => [...r].map((c) => (eyes.includes(c) ? 'o' : c)).join(''));
    s.blink = makeSprite(closed, map, undefined, opt);
  }
  return s;
}

// breathing: the upper body is drawn `off` pixels lower than the legs
export function drawBreath(s, x, y, flip, tint, off, split = 0.58) {
  if (!off) { drawSprite(s, x, y, flip, tint); return; }
  // the cut falls on one of the picture's own rows, so a finer sprite (k above 1) never samples half a row
  const k = s.k || 1, img = tint ? s.tint(tint, flip) : flip ? s.f : s.n, H = Math.round(s.h * k), cut = Math.round(H * split);
  x = snap(x); y = snap(y);
  // lower body first, so the sinking head overlaps the neck instead of losing its chin
  C.drawImage(img, 0, cut, s.w * k, H - cut, x, y + cut / k, s.w, (H - cut) / k);
  C.drawImage(img, 0, 0, s.w * k, cut, x, y + off, s.w, cut / k);
}

// sprites move in canvas pixels (a third of a game pixel), so motion is three times finer and stays crisp
export const snap = (v) => Math.round(v * SS) / SS;
export function drawSprite(s, x, y, flip, tint) {
  x = snap(x); y = snap(y);
  if (s.sheet && !tint) {
    if (flip) { C.save(); C.translate(x + s.w, y); C.scale(-1, 1); x = 0; y = 0; }
    C.drawImage(s.sheet, s.u, s.v, Math.round(s.w * s.k), Math.round(s.h * s.k), x, y, s.w, s.h);
    if (flip) C.restore();
  } else C.drawImage(tint ? s.tint(tint, flip) : flip ? s.f : s.n, x, y, s.w, s.h);
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
// many glows in a row (the particles): set the blend once, draw them all with glowAt, then glowEnd. Switching the
// blend for every single glow is slow on phones.
export function glowBegin() { C.globalCompositeOperation = 'lighter'; }
export function glowAt(x, y, col, r, a = 1) { r = Math.max(2, Math.round(r)); C.globalAlpha = Math.max(0, Math.min(1, a)); C.drawImage(glowTex(rc(col), r), Math.round(x) - r, Math.round(y) - r); }
export function glowEnd() { C.globalAlpha = 1; C.globalCompositeOperation = 'source-over'; }
export function glow(x, y, col, r, a = 1) {
  r = Math.max(2, Math.round(r));
  // (drawn inside something fading out, the glow fades with it)
  const base = C.globalAlpha;
  C.globalCompositeOperation = 'lighter';
  C.globalAlpha = Math.max(0, Math.min(1, a)) * base;
  C.drawImage(glowTex(rc(col), r), Math.round(x) - r, Math.round(y) - r);
  C.globalAlpha = base;
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
  '&': '.#./#.#/.#./#.#/.##', ':': '.../.#./.../.#./...', '-': '.../.../###/.../...', '+': '.../.#./###/.#./...', '/': '..#/..#/.#./#../#..',
  "'": '.#./.#./.../.../...', '%': '#.#/..#/.#./#../#.#', '(': '.#./#../#../#../.#.', ')': '.#./..#/..#/..#/.#.',
  '>': '#../.#./..#/.#./#..', '<': '..#/.#./#../.#./..#', '#': '#.#/###/#.#/###/#.#', '$': '.##/##./.#./.##/##.', '[': '##./#../#../#../##.', ']': '.##/..#/..#/..#/.##',
  '=': '.../###/.../###/...', '*': '#.#/.#./#.#/.../...', '_': '.../.../.../.../###',
  ';': '.../.#./.../.#./#..', '\\': '#../#../.#./..#/..#',
};
const GLY = {};
for (const k in FONT) GLY[k] = FONT[k].split('/');

export const textW = (s, sc = 1) => (s.length ? s.length * 4 * sc - sc : 0);

export function wrapText(s, width) {
  const out = [];
  let cur = '';
  for (const w of s.split(' ')) {
    const next = cur ? cur + ' ' + w : w;
    if (textW(next) > width && cur) { out.push(cur); cur = w; } else cur = next;
  }
  if (cur) out.push(cur);
  return out;
}

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
// outlined text is drawn 9 times, so each label is rendered once into a small canvas and reused
const textCache = new Map();
export function textO(s, x, y, col, sc = 1, align = 'l', oc = P.ink0) {
  s = String(s);
  if (Array.isArray(col) || C !== ctx) { for (const [dx, dy] of OUT) text(s, x + dx, y + dy, oc, sc, align); return text(s, x, y, col, sc, align); }
  const key = s + '|' + col + '|' + sc + '|' + oc;
  let c = textCache.get(key);
  const w = textW(s.toUpperCase(), sc);
  if (!c) {
    if (textCache.size > 600) textCache.clear();
    c = makeCanvas(w + 2, 5 * sc + 2);
    const prev = C;
    C = c.getContext('2d');
    for (const [dx, dy] of OUT) text(s, 1 + dx, 1 + dy, oc, sc);
    text(s, 1, 1, col, sc);
    C = prev;
    textCache.set(key, c);
  }
  if (align === 'c') x -= w / 2; else if (align === 'r') x -= w;
  C.drawImage(c, Math.round(x) - 1, Math.round(y) - 1);
  return w;
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
  // exactly as wide as the letters (each 5 wide with 1 between) plus the outline and drop shadow, so centering
  // the image centers the word
  const lw = word.length * 6 * sc - sc, lh = 7 * sc + 4;
  const c = makeCanvas(lw + 6, lh + 4), g = c.getContext('2d');
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
  // a CSS filter costs a full-screen pass every frame (heavy on phones), so it's only set when it changes something
  const neutral = s.vibrancy === 1 && s.bright === 1 && s.contrast === 1 && !s.hue;
  canvas.style.filter = hd.style.filter = neutral ? 'none' : `saturate(${s.vibrancy}) brightness(${s.bright}) contrast(${s.contrast}) hue-rotate(${s.hue}deg)`;
  document.documentElement.classList.toggle('crt', !!s.crt);
  if (s.res && s.res !== view.res) { view.res = s.res; fit(); }
}
