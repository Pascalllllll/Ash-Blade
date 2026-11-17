// ASHBLADE 2-facing soft-angle adapter for the owner's hand-authored sprites.
// Keeps actual source pixel clusters and costumes; adjusts ONLY canvas placement/scale.
// The left view is an exact horizontal mirror. Up/down do NOT turn characters away.
export const TWO_FACING = Object.freeze({ right: 1, left: -1, framePixels: [120, 96], footPixel: [60, 92] });

function bounds(canvas) {
  const { width: w, height: h } = canvas;
  const a = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (a[(y * w + x) * 4 + 3] === 0) continue;
    if (x < x0) x0 = x; if (y < y0) y0 = y;
    if (x >= x1) x1 = x + 1; if (y >= y1) y1 = y + 1;
  }
  return x1 <= x0 ? { x0: 0, y0: 0, x1: w, y1: h } : { x0, y0, x1, y1 };
}
function makeCanvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').imageSmoothingEnabled = false;
  return c;
}

// Preserve the same transform for EVERY frame; never trim/center frames individually.
export function normalizeSoftHero(set, id) {
  const base = set.idles[0];
  if (!base?.n) return set;
  const area = bounds(base.n);
  const scale = (id === 'TANK' ? 60 : 54) / Math.max(1, area.y1 - area.y0);
  const dW = Math.round(base.n.width * scale), dH = Math.round(base.n.height * scale);
  const offsetX = Math.round(60 - ((area.x0 + area.x1) / 2) * scale);
  const offsetY = Math.round(92 - area.y1 * scale);
  const cache = new WeakMap();

  function convert(s) {
    if (!s || !s.n) return s;
    if (cache.has(s)) return cache.get(s);
    const n = makeCanvas(120, 96), g = n.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(s.n, offsetX, offsetY, dW, dH);
    const f = makeCanvas(120, 96), fg = f.getContext('2d');
    fg.translate(120, 0); fg.scale(-1, 1); fg.drawImage(n, 0, 0);
    const shade = new Map();
    const result = {
      w: 120 / 3, h: 96 / 3, k: 3, n, f,
      tint(color, flip) {
        const key = String(color) + (flip ? ':L' : ':R');
        if (shade.has(key)) return shade.get(key);
        const tc = makeCanvas(120, 96), tg = tc.getContext('2d');
        tg.drawImage(flip ? f : n, 0, 0);
        tg.globalCompositeOperation = 'source-in'; tg.fillStyle = color; tg.fillRect(0, 0, 120, 96);
        shade.set(key, tc); return tc;
      },
    };
    cache.set(s, result);
    if (s.blink) result.blink = convert(s.blink);
    return result;
  }

  set.idles = set.idles.map(convert);
  set.idle = set.idles[0];
  set.run = set.run.map(convert);
  if (set.walk) set.walk = set.walk.map(convert);
  const source = set.act || {};
  const next = { stance: set.idle };
  const actions = ['attack', 'charge', 'release', 'skill', 'skill1', 'skill2', 'ultimate', 'entrance', 'dash', 'hit', 'death'];
  const converted = new Map();
  const mapDeep = (v) => Array.isArray(v) ? v.map(mapDeep) : convert(v);
  for (const action of actions) Object.defineProperty(next, action, {
    configurable: true, enumerable: true,
    get() {
      if (converted.has(action)) return converted.get(action);
      const orig = source[action] ?? source.skill ?? set.idles;
      const value = mapDeep(orig);
      converted.set(action, value); return value;
    },
  });
  set.act = next;
  set.art = true;
  set.noWeapon = true;
  // Preserve the existing per-hero weapon overlay contract. Kael has an authored
  // sword in his movement frames; other weapon heroes still use heldWeapon() when needed.
  set.ownWeapon = id === 'BLADE' ? true : !!set.ownWeapon;
  set.softFacing = true;
  return set;
}

// 'Soft-angle': never show the back. Aim remains free to travel in all 360 degrees.
// Hysteresis keeps an upward/downward aim from rapidly flickering left/right.
export function softFacingLeft(p) {
  const a = p.state === 'attack' ? (p.atkAng ?? p.aim) : p.aim;
  const aimX = Math.cos(a);
  let facing = p.softFacing ?? 1;
  if (aimX < -0.34) facing = -1;
  else if (aimX > 0.34) facing = 1;
  else if (Math.abs(p.vx || 0) > Math.max(24, Math.abs(p.vy || 0) * 1.8)) facing = Math.sign(p.vx);
  p.softFacing = facing;
  return facing < 0;
}
