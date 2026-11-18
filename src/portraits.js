// The select screen's big portraits. Each fighter stands in a pose of their own with their weapon: a 32-frame loop
// that ends in a signature move (art/sprites/portraits/<hero>.png, made by tools/build_hero_sprites.py from the same
// pictures as the sprites). They are drawn big, every art pixel a square of whole canvas pixels, with particles and
// glows of each fighter's own on top: Kael's embers and fire slash, Vega's gun smoke, Morrow's magic circle and
// orbiting motes, Rin's petals and flash cut, Rivet's sparks, Grom's dust and ground slam, Unit-7's charging cannon,
// the Dev's floating code windows.
import { ctx, SS, P, glow } from './gfx.js?v=184';
import { PORTRAIT_ART } from './hero-rig.js?v=184';

export const PORTRAIT_SCALE = 11; // canvas pixels per art pixel on the select screen
const TAU = Math.PI * 2;
const IMG = {}, TINTS = new Map();
let started = false;
export function loadPortraits() {
  if (started) return;
  started = true;
  for (const id in PORTRAIT_ART) {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => { IMG[id] = im; };
    im.src = new URL(`../art/sprites/portraits/${PORTRAIT_ART[id].file}.png?v=184`, import.meta.url).href;
  }
}
export const portraitReady = (id) => !!IMG[id];
const frameAt = (a, t) => ((Math.floor(t * a.fps) % a.n) + a.n) % a.n;

// one frame in a single color: a locked fighter's silhouette, the white flash, a colored afterimage
function tinted(id, f, col) {
  const key = id + ':' + f + ':' + col;
  let c = TINTS.get(key);
  if (c) return c;
  const a = PORTRAIT_ART[id];
  c = document.createElement('canvas'); c.width = a.w; c.height = a.h;
  const g = c.getContext('2d');
  g.drawImage(IMG[id], f * a.w, 0, a.w, a.h, 0, 0, a.w, a.h);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, a.w, a.h);
  if (TINTS.size > 96) TINTS.clear();
  TINTS.set(key, c);
  return c;
}

// ---------- effects ----------
// particles live in art pixels on the portrait's own frame, so they stay with it as it slides in
let fxId = null, lastT = 0, lastF = -1, shakeT = 0;
const parts = [], marks = [];
const rnd = (a, b) => a + Math.random() * (b - a);
function spawn(x, y, vx, vy, life, c, o = {}) { if (parts.length < 260) parts.push({ x, y, vx, vy, life, t: 0, c, s: o.s ?? 1, g: o.g ?? 0, glow: o.glow, drag: o.drag ?? 0, sway: o.sway ?? 0 }); }
// an effect drawn over time (arcs, rings, beams): kind, t, life and its own fields
function mark(m) { marks.push({ t: 0, ...m }); }
function sq(x0, y0, k, x, y, s, c) {
  const w = Math.max(1 / SS, Math.round(s * k * SS) / SS);
  ctx.fillStyle = c; ctx.fillRect(Math.round((x0 + x * k) * SS) / SS, Math.round((y0 + y * k) * SS) / SS, w, w);
}
// a rectangle in art pixels, snapped to whole canvas pixels
const snap = (v) => Math.round(v * SS) / SS;
function box(x0, y0, k, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(snap(x0 + x * k), snap(y0 + y * k), Math.max(1 / SS, snap(w * k)), Math.max(1 / SS, snap(h * k))); }

const EMBER = ['#ff7a2a', '#ffb347', '#ffd447'];
const FX = {
  BLADE: {
    tick(a, f, dt, n) {
      const tip = a.tip[f], gr = a.grip[f];
      for (let i = 0; i < n(16); i++) { const k = Math.random(); spawn(gr[0] + (tip[0] - gr[0]) * k + rnd(-1, 1), gr[1] + (tip[1] - gr[1]) * k, rnd(-4, 2), rnd(-14, -6), rnd(0.5, 1.1), EMBER[i % 3], { glow: true, s: Math.random() < 0.3 ? 1 : 0.5 }); }
      for (let i = 0; i < n(5); i++) spawn(rnd(10, 40), rnd(30, 52), rnd(-3, 3), rnd(-10, -4), rnd(0.8, 1.6), EMBER[i % 3], { s: 0.5, glow: true });
    },
    ev(a, f, e) { if (e === 'slash') { const g = a.grip[f]; mark({ kind: 'arc', x: g[0], y: g[1], r: 13, a0: -1.8, a1: 0.35, life: 0.3, c: '#ffb347', c2: '#fff6d8' }); for (let i = 0; i < 18; i++) { const b = rnd(-1.6, 0.3); spawn(g[0] + Math.cos(b) * 13, g[1] + Math.sin(b) * 13, Math.cos(b) * rnd(10, 30), Math.sin(b) * rnd(10, 30), rnd(0.3, 0.6), EMBER[i % 3], { glow: true }); } shakeT = 0.12; } },
    back(a, f, x0, y0, k, t) { const tip = a.tip[f], g = a.grip[f]; glow(x0 + ((tip[0] + g[0]) / 2) * k, y0 + ((tip[1] + g[1]) / 2) * k, '#ff7a2a', 9 * k, 0.32 + Math.sin(t * 6) * 0.06); },
  },
  GUNNER: {
    tick(a, f, dt, n) { const tip = a.tip[f]; for (let i = 0; i < n(7); i++) spawn(tip[0] + rnd(-0.5, 0.5), tip[1] - 0.5, rnd(-1, 1), rnd(-7, -3), rnd(1.2, 2), Math.random() < 0.5 ? '#8f8a9c' : '#c4bfd0', { sway: 2.5, s: Math.random() < 0.5 ? 1 : 0.5 }); },
    ev(a, f, e) { if (e === 'click') { const tip = a.tip[f]; mark({ kind: 'star', x: tip[0], y: tip[1], life: 0.35, c: '#ffd447' }); for (let i = 0; i < 6; i++) spawn(tip[0], tip[1], rnd(-12, 12), rnd(-14, -2), 0.4, '#ffd447', { glow: true, s: 0.5 }); } },
    back(a, f, x0, y0, k, t) { const m = a.marks[0]; if (Math.floor(t * 0.8) % 4 === 0) glow(x0 + m[0] * k, y0 + (m[1] - 4) * k, '#ffd447', 6 * k, 0.12); },
  },
  WIZARD: {
    tick(a, f, dt, n) { const tip = a.tip[f]; for (let i = 0; i < n(10); i++) spawn(tip[0] + rnd(-2, 2), tip[1] + rnd(-2, 2), rnd(-3, 3), rnd(-10, -4), rnd(0.5, 1), Math.random() < 0.6 ? '#62efff' : '#e8ffff', { glow: true, s: 0.5 }); },
    ev(a, f, e) { if (e === 'burst') { const tip = a.tip[f]; mark({ kind: 'ring', x: tip[0], y: tip[1], r0: 2, r1: 16, life: 0.45, c: '#62efff' }); mark({ kind: 'ring', x: tip[0], y: tip[1], r0: 1, r1: 10, life: 0.3, c: '#ffffff' }); for (let i = 0; i < 22; i++) { const b = rnd(0, TAU), v = rnd(10, 26); spawn(tip[0], tip[1], Math.cos(b) * v, Math.sin(b) * v, rnd(0.4, 0.8), Math.random() < 0.5 ? '#62efff' : '#b48cff', { glow: true, drag: 2 }); } } },
    back(a, f, x0, y0, k, t) {
      // the magic circle turning under him, and the half of the orbiting motes that is behind him
      const [fx, fy] = a.foot, cx = x0 + fx * k, cy = y0 + (fy - 1) * k;
      glow(cx, cy, '#b48cff', 16 * k, 0.22);
      for (let i = 0; i < 28; i++) { const b = t * 0.9 + (i * TAU) / 28, on = i % 4 !== 3; if (on) sq(x0, y0, k, fx + Math.cos(b) * 15 - 0.5, fy - 1 + Math.sin(b) * 3.2 - 0.5, 1, i % 7 === 0 ? '#e8ffff' : i % 2 ? '#b48cff' : '#62efff'); }
      for (let i = 0; i < 12; i++) { const b = -t * 1.4 + (i * TAU) / 12; sq(x0, y0, k, fx + Math.cos(b) * 9 - 0.25, fy - 1 + Math.sin(b) * 2 - 0.25, 0.5, '#62efff'); }
      orbs(a, x0, y0, k, t, false);
      const tip = a.tip[a.frame]; glow(x0 + tip[0] * k, y0 + tip[1] * k, '#62efff', 7 * k, 0.45 + Math.sin(t * 5) * 0.12);
    },
    front(a, f, x0, y0, k, t) { orbs(a, x0, y0, k, t, true); },
  },
  NINJA: {
    tick(a, f, dt, n) { for (let i = 0; i < n(6); i++) spawn(rnd(30, 66), rnd(-2, 34), rnd(-14, -7), rnd(3, 8), rnd(2.5, 3.5), Math.random() < 0.6 ? '#ffb7d5' : '#ff8fb8', { sway: 6, s: Math.random() < 0.4 ? 1 : 0.5 }); },
    ev(a, f, e) { if (e === 'slash') { const g = a.grip[f]; mark({ kind: 'arc', x: g[0], y: g[1], r: 14, a0: 0.75, a1: -1.5, life: 0.28, c: '#ffffff', c2: '#ffb7d5' }); for (let i = 0; i < 16; i++) { const b = rnd(-1.5, 0.7); spawn(g[0] + Math.cos(b) * 14, g[1] + Math.sin(b) * 14, Math.cos(b) * rnd(8, 24), Math.sin(b) * rnd(8, 24), rnd(0.5, 1), Math.random() < 0.6 ? '#ffb7d5' : '#ffffff', { drag: 1.5, sway: 3 }); } shakeT = 0.1; } },
    back(a, f, x0, y0, k, t) { const m = a.marks[0]; glow(x0 + m[0] * k, y0 + m[1] * k, '#ff8fb8', 14 * k, 0.12); },
  },
  MECHANIC: {
    tick(a, f, dt, n) { const tip = a.tip[f]; for (let i = 0; i < n(2); i++) spawn(tip[0], tip[1], rnd(-8, 8), rnd(-12, -4), rnd(0.2, 0.4), '#ffd447', { glow: true, s: 0.5, g: 40 }); },
    ev(a, f, e) { if (e === 'spark') { const tip = a.tip[f]; mark({ kind: 'star', x: tip[0], y: tip[1], life: 0.25, c: '#ffffff' }); for (let i = 0; i < 12; i++) spawn(tip[0], tip[1], rnd(-30, 30), rnd(-34, -4), rnd(0.25, 0.5), Math.random() < 0.5 ? '#ffd447' : '#ffffff', { glow: true, s: 0.5, g: 70 }); } },
    back(a, f, x0, y0, k, t) { for (const m of a.marks) glow(x0 + m[0] * k, y0 + m[1] * k, '#62efff', 5 * k, 0.18 + 0.12 * Math.max(0, Math.sin(t * 3))); },
  },
  TANK: {
    tick(a, f, dt, n) { for (let i = 0; i < n(4); i++) spawn(rnd(8, 44), rnd(48, 54), rnd(-2, 2), rnd(-6, -2), rnd(1, 2), Math.random() < 0.5 ? '#8a7a6a' : '#5a5060', { s: 0.5 }); },
    ev(a, f, e) {
      if (e === 'slam') {
        const tip = a.tip[f];
        mark({ kind: 'quake', x: tip[0], y: tip[1] + 1, r0: 2, r1: 26, life: 0.45, c: '#ffd447' });
        mark({ kind: 'quake', x: tip[0], y: tip[1] + 1, r0: 1, r1: 16, life: 0.3, c: '#ffffff' });
        for (let i = 0; i < 20; i++) { const b = rnd(Math.PI, TAU); spawn(tip[0], tip[1], Math.cos(b) * rnd(10, 34), Math.sin(b) * rnd(6, 22), rnd(0.4, 0.8), Math.random() < 0.5 ? '#8a7a6a' : '#c9b8a0', { g: 50, drag: 1 }); }
        shakeT = 0.3;
      }
    },
    back(a, f, x0, y0, k, t) { const m = a.marks[0]; glow(x0 + m[0] * k, y0 + m[1] * k, '#ffb347', 9 * k, 0.28 + Math.sin(t * 3) * 0.08); },
  },
  ROBOT: {
    tick(a, f, dt, n) {
      const tip = a.tip[f], at = (a.ev.find((e) => e[1] === 'charge') || [99])[0], c = f - at;
      if (c >= 0 && c < 11) for (let i = 0; i < n(18); i++) { const b = rnd(0, TAU), r = rnd(5, 9); spawn(tip[0] + Math.cos(b) * r, tip[1] + Math.sin(b) * r, -Math.cos(b) * r * 2.4, -Math.sin(b) * r * 2.4, 0.4, Math.random() < 0.5 ? '#62efff' : '#ffffff', { glow: true, s: 0.5 }); }
    },
    ev(a, f, e) { if (e === 'fire') { const tip = a.tip[f]; mark({ kind: 'beam', x: tip[0], y: tip[1], life: 0.3, c: '#62efff' }); shakeT = 0.15; for (let i = 0; i < 8; i++) spawn(tip[0], tip[1], rnd(-6, 2), rnd(-8, -2), rnd(0.6, 1.2), '#b9b4c8', { sway: 2 }); } },
    back(a, f, x0, y0, k, t) {
      const at = (a.ev.find((e) => e[1] === 'charge') || [99])[0], c = f - at, tip = a.tip[f];
      if (c >= 0 && c < 11) glow(x0 + tip[0] * k, y0 + tip[1] * k, '#62efff', (2 + c * 0.6) * k, 0.35 + c * 0.05);
      const on = Math.floor(t * 3) % 2;
      for (const m of a.marks.slice(0, 2)) glow(x0 + m[0] * k, y0 + m[1] * k, '#ff3b3b', 4 * k, on ? 0.45 : 0.15);
      const s = a.marks[2]; glow(x0 + s[0] * k, y0 + s[1] * k, '#ff3b3b', 8 * k, 0.12 + 0.1 * Math.pow(Math.max(0, Math.sin(t * 6)), 8));
    },
  },
  DEV: {
    tick(a, f, dt, n) { for (let i = 0; i < n(7); i++) spawn(rnd(16, 44), rnd(26, 50), rnd(-2, 2), rnd(-10, -5), rnd(0.8, 1.4), Math.random() < 0.7 ? '#39ff6a' : '#e8ffe8', { s: 0.5, glow: Math.random() < 0.3 }); },
    ev(a, f, e) { if (e === 'glitch') { mark({ kind: 'glitch', life: 0.3 }); shakeT = 0.08; } },
    back(a, f, x0, y0, k, t) {
      // three code windows floating round him, their lines scrolling
      const wins = [[6, 18, 12, 8, '#39ff6a'], [42, 14, 13, 9, '#62efff'], [44, 34, 10, 7, '#39ff6a']];
      wins.forEach(([wx, wy, ww, wh, c], j) => {
        const by = wy + Math.sin(t * 1.6 + j * 2) * 1.5;
        ctx.globalAlpha = 0.85;
        for (let x = 0; x < ww; x++) { sq(x0, y0, k, wx + x, by, 1, c); sq(x0, y0, k, wx + x, by + wh - 1, 0.5, c); }
        for (let y = 0; y < wh; y++) { sq(x0, y0, k, wx, by + y, 0.5, c); sq(x0, y0, k, wx + ww - 0.5, by + y, 0.5, c); }
        ctx.globalAlpha = 0.45; box(x0, y0, k, wx + 0.5, by + 1, ww - 1, wh - 1.5, '#04140a');
        ctx.globalAlpha = 0.9;
        for (let l = 0; l < wh - 3; l++) {
          const seed = (Math.floor(t * 4) + l * 7 + j * 13) % 11, len = 2 + (seed % (ww - 4));
          for (let x = 0; x < len; x++) sq(x0, y0, k, wx + 1.5 + x, by + 2 + l, 0.5, seed % 3 ? c : '#e8ffe8');
        }
        ctx.globalAlpha = 1;
        glow(x0 + (wx + ww / 2) * k, y0 + (by + wh / 2) * k, c, 7 * k, 0.12);
      });
      const m = a.marks[0]; glow(x0 + m[0] * k, y0 + m[1] * k, '#62efff', 6 * k, 0.3);
    },
  },
};
// Morrow's three motes circling him: the half behind first, the half in front after the body
function orbs(a, x0, y0, k, t, front) {
  const [fx, fy] = a.foot, cy = a.top + 13;
  for (let i = 0; i < 3; i++) {
    const b = t * 2 + (i * TAU) / 3, s = Math.sin(b);
    if ((s >= 0) !== front) continue;
    const x = fx + Math.cos(b) * 15, y = cy + s * 4, c = i === 0 ? '#62efff' : '#b48cff';
    glow(x0 + x * k, y0 + y * k, c, 4 * k, 0.5);
    sq(x0, y0, k, x - 0.5, y - 0.5, 1, c); sq(x0, y0, k, x - 0.5, y - 0.5, 0.5, '#ffffff');
  }
}
function drawMarks(x0, y0, k, a) {
  for (const m of marks) {
    const q = m.t / m.life, al = Math.max(0, 1 - q);
    ctx.globalAlpha = al;
    if (m.kind === 'arc') {
      // a crescent of squares along the cut, thick in the middle, the leading edge white
      const n = 26;
      for (let i = 0; i <= n; i++) {
        const u = i / n, b = m.a0 + (m.a1 - m.a0) * u, th = Math.sin(u * Math.PI) * 2.6 + 0.5;
        for (let r = 0; r < th; r += 0.8) sq(x0, y0, k, m.x + Math.cos(b) * (m.r + 1 - r) - 0.5, m.y + Math.sin(b) * (m.r + 1 - r) - 0.5, 1, r < 0.8 ? m.c2 : m.c);
      }
      glow(x0 + m.x * k, y0 + m.y * k, m.c, m.r * k, 0.3 * al);
    } else if (m.kind === 'ring' || m.kind === 'quake') {
      const r = m.r0 + (m.r1 - m.r0) * (1 - (1 - q) ** 2), ry = m.kind === 'quake' ? 0.28 : 1, n = Math.max(16, Math.round(r * 3));
      for (let i = 0; i < n; i++) { const b = (i * TAU) / n; sq(x0, y0, k, m.x + Math.cos(b) * r - 0.5, m.y + Math.sin(b) * r * ry - 0.5, 1, m.c); }
    } else if (m.kind === 'star') {
      const L = 2 + Math.round((1 - q) * 3);
      for (let i = -L; i <= L; i++) { sq(x0, y0, k, m.x + i - 0.5, m.y - 0.5, 0.5, m.c); sq(x0, y0, k, m.x - 0.5, m.y + i - 0.5, 0.5, m.c); }
      glow(x0 + m.x * k, y0 + m.y * k, m.c, 5 * k, 0.5 * al);
    } else if (m.kind === 'beam') {
      box(x0, y0, k, m.x, m.y - 1.5 + q, 70, 3 - 2 * q, m.c);
      box(x0, y0, k, m.x, m.y - 0.5, 70, Math.max(0.5, 1 - q), '#ffffff');
      glow(x0 + m.x * k, y0 + m.y * k, m.c, 10 * k, 0.8 * al);
    } else if (m.kind === 'glitch') {
      for (let i = 0; i < 5; i++) box(x0, y0, k, Math.round(rnd(0, 30)), Math.round(rnd(10, a.h - 6)), Math.round(rnd(10, 40)), i % 2 ? 1 : 0.5, i % 2 ? '#39ff6a' : '#ff4fa8');
    }
    ctx.globalAlpha = 1;
  }
}

// draws the portrait with the point between its feet at x, y (game pixels), S canvas pixels to an art pixel.
// o: tint (the whole figure in one color: a locked silhouette, a flash, an afterimage), alpha, still (the first
// frame), fx (false: no particles or glows). Returns false while the picture is still loading.
export function drawPortrait(id, t, x, y, S = PORTRAIT_SCALE, o = {}) {
  const a = PORTRAIT_ART[id], img = IMG[id];
  if (!a || !img) return false;
  const f = o.still ? 0 : frameAt(a, t), k = S / SS, fx = FX[id], live = o.fx !== false && !o.tint && fx;
  let x0 = Math.round((x - a.foot[0] * k) * SS) / SS, y0 = Math.round((y - a.foot[1] * k) * SS) / SS;
  if (live) {
    // a new fighter (or a jump in the clock) starts the effects over
    if (fxId !== id || t < lastT || t - lastT > 0.5) { fxId = id; parts.length = 0; marks.length = 0; lastF = f; lastT = t; shakeT = 0; }
    const dt = Math.min(0.05, t - lastT); lastT = t;
    a.frame = f;
    if (f !== lastF) { for (const e of a.ev) if (e[0] === f) fx.ev?.(a, f, e[1]); lastF = f; }
    fx.tick?.(a, f, dt, (rate) => { const v = rate * dt; return Math.floor(v) + (Math.random() < v % 1 ? 1 : 0); });
    for (const p of parts) { p.t += dt; p.vy += p.g * dt; if (p.drag) { const d = Math.exp(-p.drag * dt); p.vx *= d; p.vy *= d; } p.x += (p.vx + (p.sway ? Math.sin(p.t * 3 + p.y) * p.sway : 0)) * dt; p.y += p.vy * dt; }
    for (let i = parts.length - 1; i >= 0; i--) if (parts[i].t >= parts[i].life) parts.splice(i, 1);
    for (const m of marks) m.t += dt;
    for (let i = marks.length - 1; i >= 0; i--) if (marks[i].t >= marks[i].life) marks.splice(i, 1);
    shakeT = Math.max(0, shakeT - dt);
    if (shakeT > 0) { x0 += Math.round(rnd(-1, 1) * shakeT * 10) / SS; y0 += Math.round(rnd(-1, 1) * shakeT * 6) / SS; }
  }
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (live) fx.back?.(a, f, x0, y0, k, t);
  if (o.tint) ctx.drawImage(tinted(id, f, o.tint), 0, 0, a.w, a.h, x0, y0, a.w * k, a.h * k);
  else ctx.drawImage(img, f * a.w, 0, a.w, a.h, x0, y0, a.w * k, a.h * k);
  if (live) {
    fx.front?.(a, f, x0, y0, k, t);
    for (const p of parts) {
      const al = Math.max(0, 1 - p.t / p.life);
      ctx.globalAlpha = al * (o.alpha ?? 1);
      sq(x0, y0, k, p.x - p.s / 2, p.y - p.s / 2, p.s, p.c);
      if (p.glow && al > 0.3) glow(x0 + p.x * k, y0 + p.y * k, p.c, 2 * k, 0.25 * al);
    }
    ctx.globalAlpha = o.alpha ?? 1;
    drawMarks(x0, y0, k, a);
  }
  ctx.restore();
  return true;
}
