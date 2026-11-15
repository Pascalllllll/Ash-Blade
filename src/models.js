// The big animated fighter portraits for the select screen live in model/ (pixel data plus the code
// that animates it). They are plain scripts, loaded here only when the select screen first opens so
// the game itself starts as fast as before. Frames are painted as they are needed and cached; only
// the current fighter keeps its whole animation in memory.
const Q = '?v=59';
const FILES = { BLADE: 'kael', GUNNER: 'vega', WIZARD: 'morrow', NINJA: 'rin', MECHANIC: 'rivet', TANK: 'grom', ROBOT: 'unit7', DEV: 'dev' };
export const hasModel = (id) => id in FILES;
let state = 'idle';
export const modelsReady = () => state === 'ready';
export function loadModels() {
  if (state !== 'idle') return;
  state = 'loading';
  const files = ['model/pixel.js', ...Object.values(FILES).flatMap((n) => [`model/data/${n}.js`, `model/${n}.js`])];
  const next = (i) => {
    if (i >= files.length) { state = 'ready'; return; }
    const el = document.createElement('script');
    el.src = files[i] + Q;
    el.onload = () => next(i + 1);
    el.onerror = () => { state = 'failed'; };
    document.head.append(el);
  };
  next(0);
}
const frames = new Map(), recent = [];
const paint = (name, i) => { const m = window.Pixel.models[name], img = window.Pixel.load(m.data); return window.Pixel.toCanvas(window.Pixel.render(name, i), img.w, img.h, 1); };
// the frame of fighter id at time t (seconds), or null while the models load. A frame is 512 x 768
// and takes 10 to 25 ms to paint, so at most one new frame is painted per call: the frame on screen
// if it is missing, otherwise the next missing one, until the whole loop is cached.
export function modelFrame(id, t) {
  if (state !== 'ready' || !hasModel(id)) return null;
  const name = FILES[id], m = window.Pixel.models[name];
  let arr = frames.get(name);
  if (!arr) frames.set(name, (arr = []));
  // only the current fighter keeps its whole loop; the others keep their first frame for the tiles
  if (recent[0] !== name) { const old = recent.shift(); if (old) { const a = frames.get(old); if (a) a.length = Math.min(a.length, 1); } recent.unshift(name); }
  const want = Math.floor(t * m.fps) % m.frames;
  if (!arr[want]) arr[want] = paint(name, want);
  else for (let k = 1; k < m.frames; k++) { const j = (want + k) % m.frames; if (!arr[j]) { arr[j] = paint(name, j); break; } }
  return arr[want];
}
export function modelStill(id) {
  if (state !== 'ready' || !hasModel(id)) return null;
  const name = FILES[id];
  let arr = frames.get(name);
  if (!arr) frames.set(name, (arr = []));
  return arr[0] || (arr[0] = paint(name, 0));
}
// one color painted over a portrait's shape (white flash, locked silhouette), cached
const flat = new Map();
export function modelFlat(id, col) {
  const key = id + col;
  if (flat.has(key)) return flat.get(key);
  const src = modelStill(id); if (!src) return null;
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const g = c.getContext('2d'); g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
  flat.set(key, c);
  return c;
}
