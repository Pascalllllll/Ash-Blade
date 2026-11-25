// Shared tools for the heroes' entrances (entrances.js) and deaths (deaths.js): the hero drawn in any pose with the
// weapon in hand, a body cut into pieces that fly, bounce and bleed, spurts and pools of blood, cracks in the floor,
// and the entrance's letterbox and name card.
import { ctx, P, rect, px, line, glow, text, textO, textW, snap, SS, W, H, FW, SX, makeCanvas } from './gfx.js?v=212';
import { G, rnd, TAU, clamp, part, stain, heroSet, shadow } from './world.js?v=212';
import { drawWeaponAt, REST } from './hero-sprites.js?v=212';
import { WEAPON_ART } from './hero-rig.js?v=212';

const CW = 120, FX = 60, FY = 92;             // a hero cell's width, and where the feet are on it
export const BLOOD = ['#c4243a', '#8a0f22', '#5a0612'];
export const ease = (k) => 1 - (1 - clamp(k, 0, 1)) ** 3;
export const easeIn = (k) => clamp(k, 0, 1) ** 2;
export const at = (k, s) => k.prev < s && k.t >= s;          // true on the frame the clock passes s
export const between = (k, a, b) => k.t >= a && k.t < b;

// ---------- the hero in any pose ----------
// kind: 'idle' (16 frames: 10 and 11 blink), 'walk', 'run', 'death' (8: 2 is buckled at the knees, 4 on lie flat)
export function frame(kind, i = 0) {
  const b = heroSet().body, a = kind === 'idle' ? b.idles : b[kind];
  return a[((Math.floor(i) % a.length) + a.length) % a.length];
}
// a body frame with its feet at x, y. o: flip, z (lift), rot (about pivot, [x, y] from the feet), sx and sy (scale
// about the feet), tint, alpha, top/bottom (only these rows, in game pixels from the frame's top)
export function drawBody(fr, x, y, o = {}) {
  const flip = !!o.flip, img = o.tint ? fr.tint(o.tint, flip) : flip ? fr.f : fr.n;
  const top = clamp(o.top ?? 0, 0, fr.h), bot = clamp(o.bottom ?? fr.h, top, fr.h), k = fr.k || SS;
  if (bot <= top || (o.alpha ?? 1) <= 0) return;
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= clamp(o.alpha, 0, 1);
  ctx.translate(snap(x), snap(y - (o.z || 0)));
  if (o.rot) { const [qx, qy] = o.pivot || [0, 0]; ctx.translate(qx, qy); ctx.rotate(o.rot); ctx.translate(-qx, -qy); }
  if (o.sx !== undefined || o.sy !== undefined) ctx.scale(o.sx ?? 1, o.sy ?? 1);
  const t0 = Math.round(top * k), t1 = Math.round(bot * k);
  ctx.drawImage(img, 0, t0, fr.w * k, t1 - t0, -fr.w / 2, -fr.h + 1 + t0 / k, fr.w, (t1 - t0) / k);
  ctx.restore();
}
// a point on the hero's cell (sprite pixels, 120 x 96) to the world, for a body drawn with the same o as drawBody
export function cellToWorld(cx, cy, x, y, o = {}) {
  const fx = o.flip ? CW - cx : cx;
  let dx = (fx / SS - 20) * (o.sx ?? 1), dy = (cy / SS - 31) * (o.sy ?? 1);
  if (o.rot) {
    const [qx, qy] = o.pivot || [0, 0], c = Math.cos(o.rot), s = Math.sin(o.rot), ax = dx - qx, ay = dy - qy;
    dx = qx + ax * c - ay * s; dy = qy + ax * s + ay * c;
  }
  return [x + dx, y - (o.z || 0) + dy];
}
export const handPos = (x, y, o = {}) => { const h = heroSet().rig?.hand || [60, 60]; return cellToWorld(h[0] + 0.5, h[1] + 0.5, x, y, o); };
export const eyePos = (x, y, o = {}) => { const e = heroSet().rig?.eye || [60, 50]; return cellToWorld(e[0], e[1], x, y, o); };
export const weaponName = () => heroSet().rig?.weapon || null;
export const weaponLen = (name = weaponName()) => { const w = name && WEAPON_ART[name]; if (!w) return 6; return ((heroSet().evolved && w.tipEvo) || w.tip)[0] / SS; };
// the angle a weapon hangs at when the hero stands at ease (facing left mirrors it)
export const restAngle = (flip, name = weaponName()) => { const r = REST[name] ?? 0.4; return flip ? Math.PI - r : r; };
export function drawWeapon(x, y, a, flip, alpha = 1, name = weaponName()) {
  if (name) drawWeaponAt(ctx, name, !!heroSet().evolved, x, y, a, flip, alpha);
}
// body and weapon together: the weapon goes behind the body when it points up, as it does in play
export function drawHero(fr, x, y, o = {}, wa = null) {
  const [hx, hy] = handPos(x, y, o), w = wa !== null && weaponName();
  const behind = w && Math.sin(wa) < -0.35 && !o.front;
  if (behind) drawWeapon(hx, hy, wa, o.flip, o.alpha ?? 1);
  drawBody(fr, x, y, o);
  if (w && !behind) drawWeapon(hx, hy, wa, o.flip, o.alpha ?? 1);
}
// the body drawn coarse, blocks of `block` sprite pixels (a picture still loading in)
const coarse = makeCanvas(CW, 96), cg = coarse.getContext('2d');
export function drawCoarse(fr, x, y, block, o = {}) {
  const k = Math.max(1, Math.round(block)), w = Math.ceil(CW / k), h = Math.ceil(96 / k);
  cg.clearRect(0, 0, CW, 96); cg.imageSmoothingEnabled = false;
  cg.drawImage(o.tint ? fr.tint(o.tint, !!o.flip) : o.flip ? fr.f : fr.n, 0, 0, CW, 96, 0, 0, w, h);
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= clamp(o.alpha, 0, 1);
  ctx.translate(snap(x + (o.dx || 0)), snap(y - (o.z || 0)));
  ctx.drawImage(coarse, 0, 0, w, h, -20, -31, (w * k) / SS, (h * k) / SS);
  ctx.restore();
}

// ---------- a body cut into pieces ----------
// lines: cuts straight across the cell, each [x0, y0, x1, y1] in sprite pixels (120 x 96, feet at 60, 92), or
// [x0, y0, x1, y1, true] for a cut that only runs between its two ends. Every pixel goes with the piece on its side
// of every cut. Along a cut the pixels turn into the wound (cols: edge, flesh,
// highlight, bone; bone shows in the middle of the body). Pieces under `min` pixels are dropped as scraps.
const WOUND = { edge: [92, 6, 20], flesh: [178, 18, 42], hi: [226, 48, 72], bone: [236, 222, 204] };
const hex3 = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
export function cutFrame(fr, flip, lines, o = {}) {
  const src = flip ? fr.f : fr.n, w = src.width, h = src.height;
  const d = src.getContext('2d').getImageData(0, 0, w, h).data;
  const L = lines.map(([ax, ay, bx, by, seg]) => { const n = Math.hypot(bx - ax, by - ay) || 1; return [ax, ay, (bx - ax) / n, (by - ay) / n, n, !!seg]; });
  const wc = o.wound ? Object.fromEntries(Object.entries(o.wound).map(([k, v]) => [k, typeof v === 'string' ? hex3(v) : v])) : WOUND;
  const deep = o.deep ?? 2.4, groups = new Map();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (d[i + 3] < 128) continue;
    let key = 0, near = 99;
    for (let j = 0; j < L.length; j++) {
      const [ax, ay, ux, uy, len, seg] = L[j], side = ux * (y + 0.5 - ay) - uy * (x + 0.5 - ax);
      if (seg) { const along = ux * (x + 0.5 - ax) + uy * (y + 0.5 - ay); if (along < 0 || along > len) continue; }
      if (side > 0) key |= 1 << j;
      near = Math.min(near, Math.abs(side));
    }
    let g = groups.get(key);
    if (!g) groups.set(key, (g = { px: [], x0: w, y0: h, x1: 0, y1: 0, sx: 0, sy: 0 }));
    g.px.push(x, y, i, near);
    g.x0 = Math.min(g.x0, x); g.y0 = Math.min(g.y0, y); g.x1 = Math.max(g.x1, x); g.y1 = Math.max(g.y1, y); g.sx += x; g.sy += y;
  }
  const out = [];
  for (const g of groups.values()) {
    const n = g.px.length / 4;
    if (n < (o.min ?? 14)) continue;
    const cw = g.x1 - g.x0 + 1, ch = g.y1 - g.y0 + 1, cv = makeCanvas(cw, ch), gc = cv.getContext('2d'), img = gc.createImageData(cw, ch);
    const midX = flip ? CW - FX : FX;
    for (let q = 0; q < g.px.length; q += 4) {
      const x = g.px[q], y = g.px[q + 1], i = g.px[q + 2], nr = g.px[q + 3], j = ((y - g.y0) * cw + (x - g.x0)) * 4;
      let c = [d[i], d[i + 1], d[i + 2]];
      if (nr < deep && !o.clean) {
        const dark = d[i] + d[i + 1] + d[i + 2] < 120;              // the outline stays a dark rim
        c = Math.abs(x + 0.5 - midX) < 3 && nr < 1.4 && o.bone !== false ? wc.bone : nr < 1 || dark ? wc.edge : (x * 7 + y * 3) % 5 ? wc.flesh : wc.hi;
      }
      img.data[j] = c[0]; img.data[j + 1] = c[1]; img.data[j + 2] = c[2]; img.data[j + 3] = 255;
    }
    gc.putImageData(img, 0, 0);
    out.push({ cv, ox: g.x0, oy: g.y0, w: cw, h: ch, cx: g.sx / n + 0.5, cy: g.sy / n + 0.5, n, tints: {} });
  }
  return out;
}
// pieces placed where they were on a body standing with its feet at x, y; `held` ones wait until let go
export function placePieces(pcs, x, y, init) {
  return pcs.map((pc, i) => {
    const b = { pc, x: x + (pc.cx - FX) / SS, y, z: (FY + 0.5 - pc.cy) / SS, vx: 0, vy: 0, vz: 0, rot: 0, vr: 0, held: true, rest: false, bleed: 0, alpha: 1, i };
    init?.(b, i);
    return b;
  });
}
const half = (b) => { const c = Math.abs(Math.cos(b.rot)), s = Math.abs(Math.sin(b.rot)); return ((b.pc.w * s + b.pc.h * c) / SS / 2) * 0.72; };
const flatRot = (b) => { const base = b.pc.h > b.pc.w * 1.15 ? Math.PI / 2 : 0; return base + Math.round((b.rot - base) / Math.PI) * Math.PI; };
// falling, spinning, bouncing (o.onBounce), settling flat (o.onRest), bleeding while b.bleed lasts
export function stepPieces(list, dt, o = {}) {
  const g = o.g ?? 560, cols = o.blood || BLOOD;
  for (const b of list) {
    if (b.held) continue;
    if (!b.rest) {
      b.vz -= g * dt; b.z += b.vz * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.vr * dt;
      const e = half(b);
      if (b.z <= e && b.vz < 0) {
        b.z = e;
        if (b.vz < -80) { b.vz = -b.vz * (o.bounce ?? 0.3); b.vx *= 0.55; b.vy *= 0.55; b.vr *= 0.4; o.onBounce?.(b); }
        else { b.rest = true; b.vz = 0; o.onRest?.(b); }
      }
    } else {
      const f = Math.exp(-10 * dt);
      b.vx *= f; b.vy *= f; b.x += b.vx * dt; b.y += b.vy * dt;
      b.rot += (flatRot(b) - b.rot) * Math.min(1, 14 * dt);
      b.z += (half(b) - b.z) * Math.min(1, 14 * dt);
    }
    if (b.bleed > 0) {
      b.bleed -= dt;
      if (Math.random() < dt * (o.drip ?? 40)) part(b.x + rnd(-2, 2), b.y, b.vx * 0.3 + rnd(-15, 15), b.vy * 0.3 + rnd(-6, 6), 2, cols[Math.floor(rnd(cols.length))], { z: Math.max(1, b.z), vz: rnd(10, 60), g: 380, drag: 2, blood: true, s: Math.random() < 0.3 ? 2 : 1 });
    }
  }
}
function tinted(pc, col) {
  let c = pc.tints[col];
  if (!c) { c = makeCanvas(pc.w, pc.h); const g = c.getContext('2d'); g.drawImage(pc.cv, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = col; g.fillRect(0, 0, pc.w, pc.h); pc.tints[col] = c; }
  return c;
}
// b.tint washes a piece one color, b.tintK (0..1) blends it in; b.alpha fades it
export function drawPieces(list) {
  const order = list.slice().sort((a, b) => a.y - b.y);
  for (const b of order) {
    if (b.alpha <= 0) continue;
    const pc = b.pc;
    if (b.z > 3 && !b.held) shadow(b.x, b.y, Math.max(2, Math.min(pc.w, pc.h) / SS / 2));
    ctx.save();
    ctx.globalAlpha = clamp(b.alpha, 0, 1);
    ctx.translate(snap(b.x), snap(b.y - b.z));
    if (b.rot) ctx.rotate(b.rot);
    const dx = (pc.ox - pc.cx) / SS, dy = (pc.oy - pc.cy) / SS;
    ctx.drawImage(pc.cv, dx, dy, pc.w / SS, pc.h / SS);
    if (b.tint && (b.tintK ?? 1) > 0) { ctx.globalAlpha = clamp(b.alpha * (b.tintK ?? 1), 0, 1); ctx.drawImage(tinted(pc, b.tint), dx, dy, pc.w / SS, pc.h / SS); }
    ctx.restore();
  }
}
// a world point on a piece (sprite pixels on the hero's cell) as the piece now lies
export function pieceToWorld(b, cx, cy) {
  const dx = (cx - b.pc.cx) / SS, dy = (cy - b.pc.cy) / SS, c = Math.cos(b.rot), s = Math.sin(b.rot);
  return [b.x + dx * c - dy * s, b.y - b.z + dx * s + dy * c];
}
// every pixel of a piece as it now lies: fn(x, y, color), every `step`th one
export function eachPiecePixel(b, fn, step = 2) {
  const pc = b.pc, d = pc.cv.getContext('2d').getImageData(0, 0, pc.w, pc.h).data;
  for (let y = 0; y < pc.h; y += step) for (let x = 0; x < pc.w; x += step) {
    const i = (y * pc.w + x) * 4;
    if (d[i + 3] < 128) continue;
    const [wx, wy] = pieceToWorld(b, pc.ox + x + 0.5, pc.oy + y + 0.5);
    fn(wx, wy, `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`);
  }
}

// ---------- blood ----------
// a jet of blood from a wound at height z, along dir on the floor, `up` how hard it shoots upward
export function spurt(x, y, z, dir, force = 1, n = 6, cols = BLOOD, up = 1) {
  for (let i = 0; i < n; i++) {
    const a = dir + rnd(-0.3, 0.3), v = rnd(40, 130) * force;
    part(x, y, Math.cos(a) * v, Math.sin(a) * v * 0.5, 2.2, cols[i % cols.length], { z: Math.max(1, z), vz: rnd(50, 150) * force * up, g: 400, drag: 1.4, blood: true, s: Math.random() < 0.4 ? 2 : 1, keep: true });
  }
}
// chunks of flesh (or scrap) thrown out in every direction
export function chunks(x, y, z, n, cols, sp = 1) {
  for (let i = 0; i < n; i++) {
    const a = rnd(TAU), v = rnd(30, 140) * sp;
    part(x, y, Math.cos(a) * v, Math.sin(a) * v * 0.6, rnd(1.6, 2.6), cols[i % cols.length], { z: Math.max(1, z), vz: rnd(60, 200) * sp, g: 440, drag: 1.1, blood: true, s: Math.random() < 0.5 ? 2 : 1, keep: true });
  }
}
// pools: spread out from nothing to r over a second or two, an uneven puddle with a wet highlight
export function addPool(list, x, y, r, o = {}) { list.push({ x, y, r: 0, R: r, k: o.k ?? 1.3, c: o.c || ['#3d0610', '#6e0a18', '#9a1428'], sq: o.sq ?? 0.5, seed: rnd(TAU) }); }
export function stepPools(list, dt) { for (const q of list) q.r += (q.R - q.r) * (1 - Math.exp(-q.k * dt)); }
function blob(cx, cy, rx, ry, c) {
  const n = Math.max(1, Math.round(ry));
  for (let i = -n; i <= n; i++) {
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (i / (ry + 0.5)) ** 2)));
    if (w > 0) rect(Math.round(cx) - w, Math.round(cy) + i, w * 2, 1, c);
  }
}
export function drawPools(list) {
  for (const q of list) {
    const r = q.r;
    if (r < 0.7) continue;
    // three overlapping blobs make the edge uneven
    for (let j = 0; j < 3; j++) { const a = q.seed + j * 2.1, o = r * 0.28; blob(q.x + Math.cos(a) * o, q.y + Math.sin(a) * o * q.sq, r * (0.8 - j * 0.1), r * (0.8 - j * 0.1) * q.sq, q.c[0]); }
    blob(q.x, q.y, r * 0.72, r * 0.72 * q.sq, q.c[1]);
    if (r > 3) rect(Math.round(q.x - r * 0.35), Math.round(q.y - r * q.sq * 0.4), Math.max(1, Math.round(r * 0.3)), 1, q.c[2]);
  }
}

// ---------- the floor ----------
// jagged cracks out from x, y; grow (0..1) draws them out from the middle, lit (a color) glows in them
export function makeCracks(x, y, n, len, sq = 0.55) {
  const out = [];
  const branch = (x0, y0, a, L, steps, depth) => {
    const pts = [[x0, y0]];
    let cx = x0, cy = y0;
    for (let s = 0; s < steps; s++) {
      a += rnd(-0.55, 0.55); cx += (Math.cos(a) * L) / steps; cy += (Math.sin(a) * L * sq) / steps; pts.push([cx, cy]);
      if (depth < 1 && s > 1 && Math.random() < 0.3) branch(cx, cy, a + rnd(-1, 1), L * 0.4, 3, depth + 1);
    }
    out.push({ pts, depth });
  };
  for (let i = 0; i < n; i++) branch(x, y, (i / n) * TAU + rnd(-0.3, 0.3), len * rnd(0.6, 1.15), 6, 0);
  return out;
}
export function drawCracks(cr, grow, lit = null, litA = 0) {
  for (const { pts, depth } of cr) {
    const n = (pts.length - 1) * clamp(grow - depth * 0.25, 0, 1);
    for (let i = 0; i < n; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], f = Math.min(1, n - i), xe = x0 + (x1 - x0) * f, ye = y0 + (y1 - y0) * f;
      line(x0, y0, xe, ye, '#050308', i < 2 && !depth ? 2 : 1);
      if (lit && litA > 0) { ctx.globalAlpha = clamp(litA, 0, 1); line(x0, y0, xe, ye, lit); ctx.globalAlpha = 1; }
    }
  }
}
// the cracks pressed into the floor for good (they fade like blood, with the decals)
export function stampCracks(cr) {
  for (const { pts } of cr) for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
    for (let j = 0; j <= n; j++) stain(x0 + ((x1 - x0) * j) / n, y0 + ((y1 - y0) * j) / n, '#050308', 1);
  }
}

// ---------- the entrance's letterbox and name card (screen space, over the HUD) ----------
export function drawLetterbox(k) {
  const h = Math.round(22 * ease(k));
  if (h > 0) { rect(-SX, 0, FW, h, '#000'); rect(-SX, H - h, FW, h, '#000'); }
}
// the hero's name slides in on a slanted band of their color, the title under it on the black bar
export function drawNameCard(name, sub, col, t, life) {
  if (t < 0 || t > life) return;
  const inK = ease(t / 0.28), outK = t > life - 0.3 ? ease((t - life + 0.3) / 0.3) : 0, y = 121, bh = 22;
  const shift = Math.round(outK * (W + 40)), bw = Math.round(W * 0.66 * inK);
  for (let r = 0; r < bh; r++) {
    const sl = Math.round((bh - r) * 0.55);
    rect(-14 + sl + shift + 3, y + r + 3, bw, 1, '#0c0812');
    rect(-14 + sl + shift, y + r, bw, 1, r < 2 ? P.paper : col);
  }
  const sc = textW(name, 3) > W * 0.55 ? 2 : 3, nx = 16 - Math.round((1 - inK) * 70) + shift, ny = y + Math.round((bh - 5 * sc) / 2);
  if (t < 0.2) textO(name, nx + 4, ny, col, sc, 'l', '#0c0812');
  textO(name, nx, ny, P.paper, sc, 'l', '#0c0812');
  if (sub && t > 0.15) text(sub, 16 + shift, H - 14, t < 0.3 && Math.floor(t * 30) % 2 ? P.paper : col, 1, 'l');
}

// ---------- small helpers ----------
export function darken(a, c = '#05030a') {
  if (a <= 0) return;
  const base = ctx.globalAlpha;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = clamp(a, 0, 1) * base; ctx.fillStyle = c; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); ctx.restore();
}
// a ring on the floor drawn point by point (squashed for the floor's angle), only part of it when sweep < 1
export function floorRing(x, y, r, col, sweep = 1, sq = 0.5, start = -Math.PI / 2, th = 1) {
  const n = Math.max(8, Math.round(r * 2.2)), m = Math.round(n * clamp(sweep, 0, 1));
  for (let i = 0; i < m; i++) { const a = start + (i / n) * TAU; rect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * sq), th, th, col); }
}
export { glow, line, rect, px, text, textO, P, rnd, TAU, clamp, part };
