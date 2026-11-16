// The big animated fighter portraits live in model/ (pixel data plus the code that animates it). They
// are plain scripts, all requested at once as the page opens (downloaded in parallel, run in order),
// so the opening cinematic can show them. Frames are painted as they are needed and cached; only
// the current fighter keeps its whole animation in memory.
const Q = '?v=86';
const FILES = { BLADE: 'kael', GUNNER: 'vega', WIZARD: 'morrow', NINJA: 'rin', MECHANIC: 'rivet', TANK: 'grom', ROBOT: 'unit7', DEV: 'dev' };
export const hasModel = (id) => id in FILES;
// Every portrait fills its own picture, so each is drawn at a share of the portrait box that matches the
// fighter's build: the armored knight full size, the petite fighters smaller.
const SCALE = { TANK: 1, ROBOT: 0.88, WIZARD: 0.93, GUNNER: 0.92, BLADE: 0.9, DEV: 0.88, NINJA: 0.82, MECHANIC: 0.78 };
// where each figure stands inside its own 512 x 768 picture, measured from the pixels: its feet line (the
// lowest row it fills, as a share of the height) and the middle of its body (the mean column of its legs
// and torso, as a share of the width; flames, coats and weapons swinging out to one side don't count)
const STAND = { BLADE: [0.975, 0.545], GUNNER: [0.983, 0.527], WIZARD: [0.967, 0.492], NINJA: [0.999, 0.514], MECHANIC: [0.986, 0.527], TANK: [0.983, 0.516], ROBOT: [0.961, 0.52], DEV: [0.957, 0.48] };
// a portrait box (x, y, w, h) shrunk to the fighter's scale and moved so the figure's feet sit on the box's
// bottom edge and its body on the box's middle: every fighter stands on the same ground, centered
export function modelBox(id, x, y, w, h) {
  const k = SCALE[id] ?? 1, [fy, cx] = STAND[id] ?? [1, 0.5], W = w * k, H = h * k;
  return [x + w / 2 - cx * W, y + h - fy * H, W, H];
}
let state = 'idle', loaded = 0, total = 1;
export const modelsReady = () => state === 'ready';
export const modelsFailed = () => state === 'failed';
// 0 to 1, how much of the portrait data has arrived
export const modelsProgress = () => (state === 'ready' ? 1 : loaded / total);
export function loadModels() {
  if (state !== 'idle') return;
  state = 'loading';
  const files = ['model/pixel.js', ...Object.values(FILES).flatMap((n) => [`model/data/${n}.js`, `model/${n}.js`])];
  total = files.length;
  for (const f of files) {
    const el = document.createElement('script');
    el.src = f + Q; el.async = false;
    el.onload = () => { if (++loaded === total && state === 'loading') state = 'ready'; };
    el.onerror = () => { state = 'failed'; };
    document.head.append(el);
  }
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
