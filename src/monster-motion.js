import { makeCanvas } from './gfx.js?v=216';

const TAU = Math.PI * 2;
const sheets = new Map();

// Most draws can use the atlas directly. A corpse, a flash or a mirrored afterimage may need its own bitmap.
function atlasFrame(sheet, x, y, w, h) {
  let normal, mirror;
  const tints = new Map();
  function crop(flip, tint) {
    const cv = makeCanvas(w, h), g = cv.getContext('2d');
    if (flip) { g.translate(w, 0); g.scale(-1, 1); }
    g.drawImage(sheet, x, y, w, h, 0, 0, w, h);
    if (tint) { g.globalCompositeOperation = 'source-in'; g.fillStyle = tint; g.fillRect(0, 0, w, h); }
    return cv;
  }
  return {
    sheet, u: x, v: y, k: 3, w: w / 3, h: h / 3,
    get n() { return normal ||= crop(false); },
    get f() { return mirror ||= crop(true); },
    tint(col, flip) {
      const key = col + (flip ? 'L' : 'R');
      if (!tints.has(key)) tints.set(key, crop(flip, col));
      return tints.get(key);
    },
  };
}

export function loadMonsterSheet(id, paintedHeight) {
  if (sheets.has(id)) return;
  sheets.set(id, null);
  const im = new Image();
  im.decoding = 'async';
  im.onload = () => {
    // 48 frames in 8 columns (6 rows), or a giant's 24 in 6 columns (4 rows); twice the rows when the blink follows
    const h = Math.round(paintedHeight * 3), rows = Math.round(im.naturalHeight / h);
    const count = rows === 4 || rows === 8 ? 24 : 48, cols = count === 24 ? 6 : 8, w = im.naturalWidth / cols, block = count / cols * h;
    const frames = Array.from({ length: count }, (_, i) => {
      const x = i % cols * w, y = Math.floor(i / cols) * h;
      const frame = atlasFrame(im, x, y, w, h);
      if (im.naturalHeight === 2 * block) {
        frame.blink = atlasFrame(im, x, y + block, w, h);
        frame.blink.tint = frame.tint;
      }
      return frame;
    });
    sheets.set(id, frames);
  };
  im.onerror = () => sheets.delete(id);
  im.src = new URL(`../art/sprites/monsters/${id}.png?v=9`, import.meta.url).href;
}

export function monsterFrame(id, phase, painted, blink = false) {
  const frames = sheets.get(id) || painted;
  if (!Array.isArray(frames)) return frames;
  const f = frames[Math.floor((phase - Math.floor(phase)) * frames.length)];
  return blink && f.blink ? f.blink : f;
}

// Stride in world pixels, foot lift, and cycles per second for parts that move even at rest.
const GAIT = {
  bellwraith: [36, 0.65, 0.85], glasswing: [37, 0.5, 1.5], husk: [26, 1.25, 0], brute: [38, 1.65, 0], archer: [24, 1, 0], lootling: [22, 1.5, 0],
  tick: [19, 0.6, 0], larva: [15, 0, 0.55], egg: [18, 0, 0.68],
  slime: [22, 0, 0.80], slimelet: [16, 0, 1.25], spitter: [25, 0.6, 0.48],
  wisp: [42, 0, 0.80], shade: [38, 0, 0.65], priest: [28, 0.45, 0.48],
  warden: [40, 1.45, 0], brood: [30, 0.55, 0.42], colossus: [48, 0, 0.9], king: [41, 1.0, 0],
  wyrm: [42, 0, 0.58], herald: [46, 0, 0.55], mirror: [32, 0.55, 0],
  eclipse: [57, 0, 0.36], clock: [54, 0, 0.64], nox: [62, 0, 0.34],
};
const WINDUP = new Set(['windup', 'aim', 'fuse', 'chant']);
const LUNGE = new Set(['lunge', 'charge', 'strike', 'dash', 'kslash', 'slash']);

export function startMonsterMotion(e) {
  const id = e.boss || e.type;
  return { gait: GAIT[id], phase: e.anim % 1, clock: e.anim, drive: 0, lean: 0, wind: 0, lunge: 0, hurt: 0, stun: 0, air: 0 };
}

export function advanceMonsterMotion(e, dt, fromX, fromY) {
  const m = e.motion;
  if (e.frozen > 0 || e.marked > 0 || dt <= 0) return;
  const [stride, , idleRate] = m.gait;
  const dx = e.x - fromX, distance = Math.hypot(dx, e.y - fromY);
  // A teleport changes the anchor immediately. Only ordinary travel drives a stride.
  const travel = distance < Math.max(12, e.speed * dt * 4) && e.state !== 'hurt' ? distance / dt : 0;
  const speed = Math.min(travel, e.speed * 2.4);
  const blend = -Math.expm1(-dt * 15), attackBlend = -Math.expm1(-dt * 24);
  m.clock += dt;
  m.drive += (Math.min(1, speed / Math.max(15, e.speed * 0.8)) - m.drive) * blend;
  m.lean += ((speed ? Math.max(-1, Math.min(1, dx / (dt * e.speed))) : 0) - m.lean) * blend;
  if (e.state.endsWith('W') || WINDUP.has(e.state) || LUNGE.has(e.state)) {
    m.phase = (m.phase + dt * (LUNGE.has(e.state) ? 2.8 : 1.1)) % 1;
  } else if (idleRate || speed > 0.5) {
    const rate = e.type === 'egg' ? idleRate * (1 + Math.max(0, 2 - e.t) * 0.75) : idleRate;
    m.phase = (m.phase + Math.min(3.4, Math.hypot(rate, speed / stride)) * dt) % 1;
  } else {
    // Settle into the nearest contact pose when a walking creature comes to rest.
    m.phase += (Math.round(m.phase * 2) / 2 - m.phase) * blend;
  }
  m.wind += (Number(WINDUP.has(e.state) || e.state.endsWith('W')) - m.wind) * attackBlend;
  m.lunge += (Number(LUNGE.has(e.state)) - m.lunge) * attackBlend;
  m.hurt += (Number(e.state === 'hurt') - m.hurt) * attackBlend;
  m.stun += (Number(e.state === 'stun' || e.stunT > 0) - m.stun) * blend;
  m.air += (Math.min(1, Math.max(0, (e.z || 0) / 7)) - m.air) * blend;
}

export function monsterPose(e) {
  const m = e.motion, t = m.clock, phase = m.phase * TAU, boss = !!e.boss;
  const breath = Math.sin(t * (boss ? 2.15 : 3.05)) * (1 - m.drive * 0.65);
  const step = (1 - Math.cos(phase * 2)) * 0.5 * m.drive, lift = m.gait[1];
  const face = e.face < 0 ? -1 : 1, strength = boss ? 0.55 : 1;
  const gel = e.type === 'slime' || e.type === 'slimelet' ? m.air : 0;
  let sx = 1 + strength * (breath * 0.018 + m.wind * 0.10 + m.lunge * 0.12) - gel * 0.095;
  let sy = 1 - strength * (breath * 0.025 + m.wind * 0.115 + m.lunge * 0.095) + gel * 0.14;
  const rot = strength * (m.lean * 0.065 + Math.sin(phase) * m.drive * lift * 0.026 +
    face * (m.lunge * 0.11 - m.wind * 0.085 - m.hurt * 0.13) + Math.sin(t * 15) * m.stun * 0.095);
  const hover = e.type === 'wisp' ? 3 + Math.sin(t * 3) * 2 : 0;
  let dx = 0;
  if (e.sq > 0) {
    const wobble = Math.cos((1 - e.sq) * Math.PI * 2.5) * e.sq;
    sx *= 1 + 0.30 * wobble; sy *= 1 - 0.26 * wobble;
    dx = Math.cos(e.sqDir || 0) * 2 * e.sq;
  }
  return { sx, sy, rot, dx, dy: -step * lift - hover };
}
