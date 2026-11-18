// The select screen's big portraits: the owner's High Pixel Model pictures of each fighter, full length, rebuilt as
// clean pixel art (one art pixel is 2 x 2 canvas pixels, a third of a sprite's) by tools/build_portraits.py, which
// also writes src/portrait-art.js: the frames (the upper body rises with each breath, Morrow floats), and where the
// weapon's tip, a hand and the eyes are on each one. Kael steps in with his dagger low and his fist up, Vega fires
// her revolver, Morrow holds out a violet orb with his staff high, Rin points with her katana raised, Rivet carries
// her wrench on her shoulder with a wink and a thumbs up, Grom shoulders his hammer, Unit-7 fires its cannon, the
// Dev works his laptop from his wheelchair with code windows floating round him.
// Behind each one is a scene of their own: Kael's burning sun, Vega's striped desert sunset, Morrow's star chart and
// rune ring, Rin's red moon and cherry branch, Rivet's turning gears, the King's torn banner behind Grom, Unit-7's
// targeting screen, the Dev's falling code. Particles and flashes of each fighter's own go on top.
import { ctx, SS, glow, rect, px, line, ring, disc } from './gfx.js?v=189';
import { PORTRAIT_ART } from './portrait-art.js?v=189';

export const PORTRAIT_SCALE = 2; // canvas pixels per art pixel on the select screen
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
    im.src = new URL(`../art/sprites/portraits-hd/${PORTRAIT_ART[id].file}.png?v=189`, import.meta.url).href;
  }
}
export const portraitReady = (id) => !!IMG[id];
const frameAt = (a, t) => ((Math.floor(t * a.fps) % a.n) + a.n) % a.n;
const loopAt = (a, t) => Math.floor((t * a.fps) / a.n);

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
  if (TINTS.size > 64) TINTS.clear();
  TINTS.set(key, c);
  return c;
}

// ---------- effects ----------
// particles live in art pixels on the portrait's own frame, so they stay with it as it slides in
let fxId = null, lastT = 0, lastF = -1, lastLoop = -1, shakeT = 0;
const parts = [], marks = [];
const rnd = (a, b) => a + Math.random() * (b - a);
function spawn(x, y, vx, vy, life, c, o = {}) { if (parts.length < 220) parts.push({ x, y, vx, vy, life, t: 0, c, s: o.s ?? 1, g: o.g ?? 0, glow: o.glow, drag: o.drag ?? 0, sway: o.sway ?? 0 }); }
function mark(m) { marks.push({ t: 0, ...m }); }
const snap = (v) => Math.round(v * SS) / SS;
// a square of s art pixels at art position x, y
function sq(x0, y0, k, x, y, s, c) {
  const w = Math.max(1 / SS, snap(s * k));
  ctx.fillStyle = c; ctx.fillRect(snap(x0 + x * k), snap(y0 + y * k), w, w);
}
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const EMBER = ['#ff7a2a', '#ffb347', '#ffd447'];
// the backdrops are in game pixels round the point between the fighter's feet (x, y), sized for the select
// screen's left panel
const FX = {
  BLADE: {
    // a burning sun behind him, its rim licking with flame, heat shimmering up from the ground
    scene(x, y, t) {
      const cx = x + 10, cy = y - 112, R = 34;
      ctx.globalAlpha = 0.5; disc(cx, cy, R, '#3a0c10'); disc(cx, cy, R - 4, '#5a1418'); ctx.globalAlpha = 1;
      for (let i = 0; i < 48; i++) { const b = (i * TAU) / 48, fl = Math.max(0, Math.sin(t * 6 + i * 1.7)) * 7 + (i % 3 === 0 ? 4 : 0); ctx.globalAlpha = 0.55; line(cx + Math.cos(b) * R, cy + Math.sin(b) * R, cx + Math.cos(b) * (R + 2 + fl), cy + Math.sin(b) * (R + 2 + fl), EMBER[i % 3]); }
      ctx.globalAlpha = 0.75; ring(cx, cy, R, 1, '#ffb347'); ctx.globalAlpha = 1;
      glow(cx, cy, '#ff7a2a', 60, 0.16);
      ctx.globalAlpha = 0.25; for (let yy = y - 30; yy < y + 4; yy += 3) for (let xx = x - 80; xx < x + 80; xx += 2) if (hash(xx * 3 + yy + Math.floor(t * 8)) > 0.9) px(xx, yy, yy > y - 12 ? '#ff7a2a' : '#5a1418');
      ctx.globalAlpha = 1;
    },
    tick(a, f, dt, n) {
      const tip = a.tip[f], gr = a.grip[f];
      for (let i = 0; i < n(18); i++) { const k = Math.random(); spawn(gr[0] + (tip[0] - gr[0]) * k + rnd(-2, 2), gr[1] + (tip[1] - gr[1]) * k, rnd(-10, 6), rnd(-30, -12), rnd(0.6, 1.2), EMBER[i % 3], { glow: true, s: Math.random() < 0.3 ? 2 : 1 }); }
      for (let i = 0; i < n(6); i++) spawn(rnd(20, 150), rnd(150, 240), rnd(-6, 6), rnd(-22, -8), rnd(0.9, 1.7), EMBER[i % 3], { glow: true });
    },
    ev(a, f) { if (f === 6) { const g = a.grip[f]; for (let i = 0; i < 16; i++) { const b = rnd(-2.4, 0.2); spawn(g[0] + Math.cos(b) * 8, g[1] + Math.sin(b) * 8, Math.cos(b) * rnd(20, 50), Math.sin(b) * rnd(20, 50), rnd(0.3, 0.6), EMBER[i % 3], { glow: true, drag: 2 }); } } },
    back(a, f, x0, y0, k, t) { const tip = a.tip[f], g = a.grip[f]; glow(x0 + ((tip[0] + g[0]) / 2) * k, y0 + ((tip[1] + g[1]) / 2) * k, '#ff7a2a', 30, 0.2 + Math.sin(t * 6) * 0.05); },
  },
  GUNNER: {
    // a desert sunset in stripes, the sun sinking behind her, cactus on the skyline
    scene(x, y, t) {
      const hz = y - 8, top = y - 180;
      const BANDS = [[0, '#2a1438'], [0.3, '#4a1a40'], [0.55, '#7a2a3a'], [0.78, '#a8402a']];
      for (let i = 0; i < BANDS.length; i++) { const y1 = top + BANDS[i][0] * (hz - top), y2 = i + 1 < BANDS.length ? top + BANDS[i + 1][0] * (hz - top) : hz; ctx.globalAlpha = 0.55; rect(x - 120, y1, 240, y2 - y1 + 1, BANDS[i][1]); }
      const cx = x + 24, cy = y - 70;
      ctx.globalAlpha = 0.7;
      for (let yy = -30; yy <= 30; yy++) { const w = Math.round(Math.sqrt(Math.max(0, 900 - yy * yy))); if (yy > 0 && yy % 6 < 2) continue; rect(cx - w, cy + yy, w * 2, 1, yy < -14 ? '#ffd447' : yy < 4 ? '#ffb347' : '#ff7a2a'); }
      ctx.globalAlpha = 0.95; rect(x - 120, hz, 240, 2, '#1a0a14');
      for (const [cxx, h] of [[x - 64, 26], [x + 70, 20]]) { rect(cxx, hz - h, 5, h, '#1a0a14'); rect(cxx - 7, hz - h + 9, 7, 3, '#1a0a14'); rect(cxx - 7, hz - h + 3, 3, 7, '#1a0a14'); rect(cxx + 5, hz - h + 12, 6, 3, '#1a0a14'); rect(cxx + 8, hz - h + 6, 3, 7, '#1a0a14'); }
      ctx.globalAlpha = 1;
      glow(cx, cy, '#ff7a2a', 50, 0.14);
    },
    tick(a, f, dt, n) { const tip = a.tip[f]; for (let i = 0; i < n(8); i++) spawn(tip[0] + rnd(-1, 1), tip[1] - 2, rnd(-3, 3), rnd(-16, -7), rnd(1.2, 2), Math.random() < 0.5 ? '#8f8a9c' : '#c4bfd0', { sway: 5 }); },
    // every other loop she fires a shot into the sky
    loop(a, f, i) {
      if (i % 2) return;
      const tip = a.tip[f];
      mark({ kind: 'star', x: tip[0], y: tip[1], life: 0.2, c: '#fff6d8' }); mark({ kind: 'shot', x: tip[0] + 2, y: tip[1], life: 0.14, c: '#ffd447' });
      for (let j = 0; j < 10; j++) spawn(tip[0], tip[1], rnd(10, 50), rnd(-14, 14), rnd(0.15, 0.3), Math.random() < 0.5 ? '#ffd447' : '#fff6d8', { glow: true });
      const g = a.grip[f]; spawn(g[0] - 4, g[1] - 4, rnd(-30, -14), rnd(-40, -20), 0.7, '#c9a24a', { g: 160, s: 2 });
      shakeT = 0.08;
    },
  },
  WIZARD: {
    // a star chart: twinkling stars, two constellations, a great rune ring turning behind him, a magic circle under him
    scene(x, y, t) {
      for (let i = 0; i < 60; i++) { const sx = x - 76 + hash(i) * 150, sy = y - 176 + hash(i + 50) * 150, tw = 0.35 + 0.5 * Math.max(0, Math.sin(t * 2.5 + i * 1.3)); ctx.globalAlpha = tw; px(sx, sy, i % 5 === 0 ? '#e8ffff' : '#8a7ac8'); }
      const C = [[x - 60, y - 160], [x - 44, y - 170], [x - 30, y - 156], [x - 46, y - 144]], D = [[x + 34, y - 166], [x + 50, y - 174], [x + 62, y - 158], [x + 48, y - 148]];
      ctx.globalAlpha = 0.45; for (const L of [C, D]) for (let i = 0; i < L.length - 1; i++) line(L[i][0], L[i][1], L[i + 1][0], L[i + 1][1], '#62efff');
      ctx.globalAlpha = 0.9; for (const [sx, sy] of [...C, ...D]) { px(sx, sy, '#e8ffff'); glow(sx, sy, '#62efff', 4, 0.4); }
      const cx = x + 4, cy = y - 108;
      ctx.globalAlpha = 0.4; ring(cx, cy, 58, 1, '#6a3a9a'); ring(cx, cy, 50, 1, '#4a2a7a');
      ctx.globalAlpha = 0.7; for (let i = 0; i < 16; i++) { const b = t * 0.25 + (i * TAU) / 16; rect(cx + Math.cos(b) * 54 - 1, cy + Math.sin(b) * 54 - 1, 3, 3, i % 3 ? '#b48cff' : '#62efff'); }
      ctx.globalAlpha = 1;
      // the magic circle he floats over
      glow(x, y - 4, '#b48cff', 40, 0.2);
      for (let i = 0; i < 40; i++) { const b = t * 0.9 + (i * TAU) / 40; if (i % 4 !== 3) px(x + Math.cos(b) * 40, y - 4 + Math.sin(b) * 8, i % 7 === 0 ? '#e8ffff' : i % 2 ? '#b48cff' : '#62efff'); }
      for (let i = 0; i < 20; i++) { const b = -t * 1.4 + (i * TAU) / 20; px(x + Math.cos(b) * 24, y - 4 + Math.sin(b) * 5, '#62efff'); }
    },
    tick(a, f, dt, n) { const tip = a.tip[f]; for (let i = 0; i < n(12); i++) spawn(tip[0] + rnd(-6, 6), tip[1] + rnd(-6, 6), rnd(-8, 8), rnd(-26, -10), rnd(0.5, 1), Math.random() < 0.6 ? '#b48cff' : '#e8dcff', { glow: true }); },
    loop(a, f, i) { if (i % 2) return; const tip = a.tip[f]; mark({ kind: 'ring', x: tip[0], y: tip[1], r0: 4, r1: 40, life: 0.5, c: '#b48cff' }); mark({ kind: 'ring', x: tip[0], y: tip[1], r0: 2, r1: 26, life: 0.35, c: '#ffffff' }); },
    back(a, f, x0, y0, k, t) { const tip = a.tip[f], c = a.grip[f]; glow(x0 + tip[0] * k, y0 + tip[1] * k, '#b48cff', 18, 0.5 + Math.sin(t * 5) * 0.12); glow(x0 + c[0] * k, y0 + c[1] * k, '#62efff', 12, 0.35 + Math.sin(t * 3) * 0.1); motes(a, f, x0, y0, k, t, false); },
    front(a, f, x0, y0, k, t) { motes(a, f, x0, y0, k, t, true); },
  },
  NINJA: {
    // a great red moon, a cherry branch across it in bloom
    scene(x, y, t) {
      const cx = x + 22, cy = y - 118;
      glow(cx, cy, '#ff3b5c', 70, 0.14);
      ctx.globalAlpha = 0.6; disc(cx, cy, 40, '#a81830'); disc(cx + 8, cy + 6, 30, '#8a1428'); disc(cx - 10, cy - 8, 12, '#c02040'); ctx.globalAlpha = 1;
      ctx.globalAlpha = 0.95;
      const BR = [[-80, -150], [-50, -140], [-26, -144], [-4, -132], [20, -136], [44, -124]];
      for (let i = 0; i < BR.length - 1; i++) line(x + BR[i][0], y + BR[i][1], x + BR[i + 1][0], y + BR[i + 1][1], '#1a0a10', 3);
      line(x - 40, y - 142, x - 32, y - 120, '#1a0a10', 2); line(x - 6, y - 134, x + 2, y - 152, '#1a0a10', 2);
      for (let i = 0; i < 22; i++) { const j = BR[1 + (i % 4)], bx = x + j[0] + Math.round(hash(i) * 14 - 7), by = y + j[1] + Math.round(hash(i + 9) * 10 - 5), s = Math.round(Math.sin(t * 1.5 + i)); rect(bx + s, by, 3, 3, i % 3 ? '#ffb7d5' : '#ff8fb8'); }
      ctx.globalAlpha = 1;
    },
    tick(a, f, dt, n) { for (let i = 0; i < n(7); i++) spawn(rnd(60, 200), rnd(-10, 140), rnd(-40, -20), rnd(10, 26), rnd(2.5, 3.5), Math.random() < 0.6 ? '#ffb7d5' : '#ff8fb8', { sway: 14, s: Math.random() < 0.4 ? 2 : 1 }); },
    // every other loop: the draw, one white line across the whole screen, then the petals burst along it
    loop(a, f, i) {
      if (i % 2 === 0) return;
      const g = a.grip[f];
      mark({ kind: 'flash', y: g[1] - 4, life: 0.24, c: '#ffffff', c2: '#ffb7d5' });
      const tp = a.tip[f]; mark({ kind: 'star', x: tp[0], y: tp[1], life: 0.3, c: '#ffffff' });
      for (let j = 0; j < 26; j++) spawn(rnd(-20, 190), g[1] - 4 + rnd(-3, 3), rnd(-30, 30), rnd(-40, 10), rnd(0.6, 1.2), Math.random() < 0.6 ? '#ffb7d5' : '#ffffff', { drag: 1.5, sway: 8 });
      shakeT = 0.14;
    },
  },
  MECHANIC: {
    // her workshop: two big gears turning against each other behind her, a pipe running along the wall
    scene(x, y, t) {
      const gear = (cx, cy, r, n, rot, c, c2) => {
        ctx.globalAlpha = 0.5;
        for (let i = 0; i < n; i++) { const b = rot + (i * TAU) / n; for (let d = r; d <= r + 7; d++) rect(cx + Math.cos(b) * d - 2, cy + Math.sin(b) * d - 2, 4, 4, c); }
        ring(cx, cy, r, 4, c); ring(cx, cy, r * 0.45, 3, c); disc(cx, cy, r * 0.22, c2);
        for (let i = 0; i < 4; i++) { const b = rot + (i * TAU) / 4; line(cx + Math.cos(b) * r * 0.45, cy + Math.sin(b) * r * 0.45, cx + Math.cos(b) * r, cy + Math.sin(b) * r, c, 3); }
        ctx.globalAlpha = 1;
      };
      gear(x - 44, y - 120, 30, 12, t * 0.6, '#3a3446', '#8a5a2a');
      gear(x + 46, y - 74, 22, 9, -t * 0.82 + 0.2, '#2e2a3a', '#8a5a2a');
      ctx.globalAlpha = 0.5; rect(x - 120, y - 30, 240, 6, '#2a2634'); for (let xx = -110; xx < 110; xx += 26) rect(x + xx, y - 33, 6, 12, '#3a3446'); ctx.globalAlpha = 1;
    },
    tick(a, f, dt, n) { const tip = a.tip[f]; for (let i = 0; i < n(3); i++) spawn(tip[0], tip[1], rnd(-30, 30), rnd(-40, -10), rnd(0.2, 0.45), '#ffd447', { glow: true, g: 140 }); },
    loop(a, f, i) {
      const tip = a.tip[f], e = a.eye[f];
      mark({ kind: 'star', x: tip[0], y: tip[1], life: 0.25, c: '#ffffff' }); for (let j = 0; j < 16; j++) spawn(tip[0], tip[1], rnd(-80, 80), rnd(-90, -10), rnd(0.25, 0.5), Math.random() < 0.5 ? '#ffd447' : '#ffffff', { glow: true, g: 200 });
      // the thumbs-up
      if (i % 2) mark({ kind: 'star', x: e[0] + 31, y: e[1] + 21, life: 0.4, c: '#ffd447' });
    },
  },
  TANK: {
    // the King's banner hangs behind him: dark red, a gold crown on it, torn across, ragged at the bottom and swaying
    scene(x, y, t) {
      const L = x - 36, R = x + 36, top = y - 178, bot = y - 52;
      ctx.globalAlpha = 0.85; rect(L - 8, top - 2, R - L + 16, 4, '#2a2230'); px(L - 8, top - 2, '#ffd447'); px(R + 8, top - 2, '#ffd447');
      for (let yy = top + 2; yy < bot + 14; yy += 2) {
        const s = Math.round(Math.sin(t * 1.4 + yy * 0.04) * (yy - top) / 50);
        for (let xx = L; xx <= R; xx += 2) {
          const rag = yy > bot && ((xx * 7) % 13) + bot < yy + 4, tear = Math.abs((xx - L) - (yy - top - 40) * 0.9) < 2 && yy > top + 40 && yy < top + 100;
          if (rag || tear) continue;
          ctx.globalAlpha = 0.7; rect(xx + s, yy, 2, 2, xx <= L + 1 || xx >= R - 1 ? '#8a6a1e' : (xx + yy) % 14 === 0 ? '#3a0c14' : '#5a1420');
        }
      }
      ctx.globalAlpha = 0.9;
      const cx = x, cy = top + 46, s = Math.round(Math.sin(t * 1.4 + 46 * 0.04) * 46 / 50);
      rect(cx - 16 + s, cy, 33, 6, '#c9a24a'); for (let i = 0; i < 5; i++) { const h = i === 2 ? 12 : i % 2 ? 9 : 6; rect(cx - 16 + i * 7.5 + s, cy - h, 3, h, '#c9a24a'); }
      ctx.globalAlpha = 1;
    },
    tick(a, f, dt, n) { for (let i = 0; i < n(5); i++) spawn(rnd(30, 150), rnd(220, 245), rnd(-6, 6), rnd(-14, -4), rnd(1, 2), Math.random() < 0.5 ? '#8a7a6a' : '#5a5060'); },
    // every other loop his visor flares and the hammer sheds a shower of forge sparks; a breath of dust at his feet
    loop(a, f, i) {
      const e = a.eye[f], h = a.tip[f], [fx, fy] = a.foot;
      if (i % 2 === 0) {
        mark({ kind: 'star', x: e[0], y: e[1], life: 0.35, c: '#ffd447' });
        for (let j = 0; j < 14; j++) spawn(h[0] + rnd(-16, 16), h[1] + rnd(-6, 10), rnd(-20, 20), rnd(-30, 5), rnd(0.5, 0.9), Math.random() < 0.5 ? '#ffd447' : '#ff7a2a', { g: 150, glow: true });
      }
      for (let j = 0; j < 8; j++) spawn(fx + rnd(-40, 40), fy - 1, rnd(-14, 14), rnd(-10, -3), rnd(0.6, 1.1), Math.random() < 0.5 ? '#8a7a6a' : '#5a5060', { drag: 1.5 });
    },
    back(a, f, x0, y0, k, t) { const e = a.eye[f]; glow(x0 + e[0] * k, y0 + e[1] * k, '#ffb347', 16, 0.3 + Math.sin(t * 3) * 0.1); },
  },
  ROBOT: {
    // its targeting screen: scan lines, a grid floor, data scrolling at the edge, and the reticle on the target
    scene(x, y, t) {
      ctx.globalAlpha = 0.1; for (let yy = y - 180; yy < y; yy += 4) rect(x - 120, yy, 240, 1, '#62efff');
      ctx.globalAlpha = 0.3; for (let i = -8; i <= 8; i++) line(x + i * 8, y - 26, x + i * 26, y + 8, '#1a5a6a');
      for (let yy = y - 26; yy <= y + 8; yy += 7) rect(x - 120, yy, 240, 1, '#1a5a6a');
      ctx.globalAlpha = 0.5; for (let l = 0; l < 10; l++) { const len = 4 + Math.floor(hash(l + Math.floor(t * 3)) * 18); rect(x - 66, y - 160 + l * 8, len, 3, l % 3 ? '#62efff' : '#ff3b3b'); }
      ctx.globalAlpha = 1;
    },
    tick(a, f, dt, n) {
      // steam out of the vents on its head now and then
      const e = a.eye[f];
      for (let i = 0; i < n(1.5); i++) spawn(e[0] + rnd(-24, 24), e[1] - 34, rnd(-4, 4), rnd(-16, -8), rnd(0.8, 1.4), Math.random() < 0.5 ? '#c8c4d8' : '#8f8a9c', { sway: 4, s: 2 });
      // frames 12 to 20: the cannon charges, light drawn in to the muzzle
      if (f < 12 || f > 20) return;
      const tip = a.tip[f];
      for (let i = 0; i < n(26); i++) { const b = rnd(0, TAU), r = rnd(14, 26); spawn(tip[0] + Math.cos(b) * r, tip[1] + Math.sin(b) * r, -Math.cos(b) * r * 2.6, -Math.sin(b) * r * 2.6, 0.38, Math.random() < 0.5 ? '#62efff' : '#ffffff', { glow: true }); }
    },
    ev(a, f) { if (f === 21) { const tip = a.tip[f]; mark({ kind: 'beam', x: tip[0] + 4, y: tip[1], life: 0.3, c: '#62efff' }); shakeT = 0.15; for (let i = 0; i < 10; i++) spawn(tip[0], tip[1], rnd(-14, 6), rnd(-20, -6), rnd(0.6, 1.2), '#b9b4c8', { s: 2 }); } },
    back(a, f, x0, y0, k, t) {
      const tip = a.tip[f], c = f - 12;
      if (c >= 0 && c < 9) glow(x0 + tip[0] * k, y0 + tip[1] * k, '#62efff', 6 + c * 2.4, 0.35 + c * 0.055);
      // the reticle out in front of the cannon, where it's aiming
      const rx = x0 + (tip[0] + 6) * k + 26, ry = y0 + tip[1] * k, pulse = 0.55 + 0.3 * Math.sin(t * 5);
      ctx.globalAlpha *= pulse; ring(rx, ry, 9, 1, '#ff3b3b');
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) line(rx + dx * 6, ry + dy * 6, rx + dx * 14, ry + dy * 14, '#ff3b3b');
      px(rx, ry, '#ffffff');
    },
  },
  DEV: {
    // the code he wrote, falling behind him
    scene(x, y, t) {
      for (let c = 0; c < 38; c++) {
        const cx = x - 80 + c * 4.4, sp = 18 + hash(c) * 30, len = 6 + Math.floor(hash(c + 30) * 10), head = ((t * sp + hash(c + 60) * 200) % 220) - 30;
        for (let j = 0; j < len; j++) { const yy = y - 180 + Math.floor(head) - j * 4; if (yy < y - 182 || yy > y) continue; ctx.globalAlpha = j === 0 ? 0.8 : 0.4 * (1 - j / len); rect(cx, yy, 2, 3, j === 0 ? '#e8ffe8' : (j * 7 + c) % 3 ? '#39ff6a' : '#1a8a3a'); }
      }
      ctx.globalAlpha = 1;
    },
    tick(a, f, dt, n) { for (let i = 0; i < n(8); i++) spawn(rnd(40, 140), rnd(80, 200), rnd(-4, 4), rnd(-24, -12), rnd(0.8, 1.4), Math.random() < 0.7 ? '#39ff6a' : '#e8ffe8', { glow: Math.random() < 0.3 }); },
    ev(a, f) { if (f === 13) { mark({ kind: 'glitch', life: 0.3 }); shakeT = 0.08; } },
    back(a, f, x0, y0, k, t) { for (const q of [a.tip[f], a.grip[f]]) glow(x0 + q[0] * k, y0 + q[1] * k, '#62efff', 18, 0.3 + 0.1 * Math.sin(t * 4)); },
  },
};
// Morrow's three motes circling the orb: the half behind it first, the half in front after the body
function motes(a, f, x0, y0, k, t, front) {
  const tip = a.tip[f];
  for (let i = 0; i < 3; i++) {
    const b = t * 2.4 + (i * TAU) / 3, s = Math.sin(b);
    if ((s >= 0) !== front) continue;
    const x = tip[0] + Math.cos(b) * 16, y = tip[1] + s * 5, c = i === 0 ? '#62efff' : '#d8c8ff';
    glow(x0 + x * k, y0 + y * k, c, 4, 0.5);
    sq(x0, y0, k, x - 1, y - 1, 2, c);
  }
}
// a fighter landing on the select screen: a ring across the floor in their color, dust kicked up, sparks
const landing = [];
export function portraitLand(id, col) { landing.push({ id, col }); }
function landFx(a, col) {
  const [fx, fy] = a.foot;
  mark({ kind: 'quake', x: fx, y: fy - 2, r0: 6, r1: 80, life: 0.45, c: col });
  mark({ kind: 'quake', x: fx, y: fy - 2, r0: 4, r1: 48, life: 0.3, c: '#ffffff' });
  for (let i = 0; i < 18; i++) { const b = rnd(Math.PI, TAU); spawn(fx + rnd(-30, 30), fy - 2, Math.cos(b) * rnd(20, 70), Math.sin(b) * rnd(14, 46), rnd(0.35, 0.7), Math.random() < 0.5 ? '#8a7a6a' : '#5a5060', { g: 120, drag: 1, s: 2 }); }
  for (let i = 0; i < 12; i++) { const b = rnd(TAU); spawn(fx, fy - 40, Math.cos(b) * rnd(40, 90), Math.sin(b) * rnd(40, 90), rnd(0.3, 0.6), i % 2 ? col : '#ffffff', { glow: true, drag: 3 }); }
}
// each fighter's own shadow: as wide as where their feet meet the floor, in pixels the size of theirs, a dark core
// and a checkered rim. Morrow's shrinks as he floats up.
export function drawPortraitShadow(id, t, x, y, S = PORTRAIT_SCALE, al = 1) {
  const a = PORTRAIT_ART[id];
  if (!a?.shadow) return;
  const k = S / SS, f = frameAt(a, t), lift = a.float ? Math.sin((f / a.n) * TAU) * a.float : 0;
  const x0 = snap(x - a.foot[0] * k), y0 = snap(y - a.foot[1] * k);
  const cx = a.shadow[0], cy = a.foot[1] + 1, rx = (a.shadow[1] * 1.12 + 3) * (1 - lift * 0.07), ry = Math.max(3, rx * 0.13);
  ctx.save();
  for (let j = -Math.ceil(ry); j <= Math.ceil(ry); j++) {
    const w = rx * Math.sqrt(Math.max(0, 1 - (j * j) / (ry * ry))), wc = w * 0.72;
    if (w < 1) continue;
    for (let i = Math.round(-w); i < Math.round(w); i++) {
      const core = Math.abs(i) < wc && Math.abs(j) < ry * 0.75;
      if (!core && (i + j) % 2) continue;
      ctx.globalAlpha = al * (core ? 0.5 : 0.32);
      sq(x0, y0, k, cx + i, cy + j, 1, '#05020a');
    }
  }
  ctx.restore();
}
function drawMarks(x0, y0, k, a) {
  const base = ctx.globalAlpha;
  for (const m of marks) {
    const q = m.t / m.life, al = Math.max(0, 1 - q);
    ctx.globalAlpha = al * base;
    if (m.kind === 'ring' || m.kind === 'quake') {
      const r = m.r0 + (m.r1 - m.r0) * (1 - (1 - q) ** 2), ry = m.kind === 'quake' ? 0.26 : 1, n = Math.max(24, Math.round(r * 2.5));
      for (let i = 0; i < n; i++) { const b = (i * TAU) / n; sq(x0, y0, k, m.x + Math.cos(b) * r - 1, m.y + Math.sin(b) * r * ry - 1, 2, m.c); }
    } else if (m.kind === 'star') {
      const L = 6 + Math.round((1 - q) * 8);
      for (let i = -L; i <= L; i++) { sq(x0, y0, k, m.x + i, m.y, 1, m.c); sq(x0, y0, k, m.x, m.y + i, 1, m.c); }
      glow(x0 + m.x * k, y0 + m.y * k, m.c, 16, 0.5 * al);
    } else if (m.kind === 'shot') {
      // a streak out of the barrel and off the screen
      const L = 260 * Math.min(1, q * 3);
      ctx.fillStyle = m.c; ctx.fillRect(snap(x0 + m.x * k), snap(y0 + (m.y - 1) * k), snap(L * k), snap(2 * k));
    } else if (m.kind === 'flash') {
      // Rin's draw: a line across the whole screen, white in the middle, pink at the edges, thinning as it fades
      ctx.fillStyle = m.c2; ctx.fillRect(x0 - 200, snap(y0 + (m.y - 3 + q * 2) * k), 500, Math.max(1 / SS, snap((6 - 6 * q) * k)));
      ctx.fillStyle = m.c; ctx.fillRect(x0 - 200, snap(y0 + (m.y - 1 + q) * k), 500, Math.max(1 / SS, snap((2 - 2 * q) * k)));
      glow(x0 + 80 * k, y0 + m.y * k, m.c2, 80, 0.4 * al);
    } else if (m.kind === 'beam') {
      ctx.fillStyle = m.c; ctx.fillRect(snap(x0 + m.x * k), snap(y0 + (m.y - 5 + q * 3) * k), 400, Math.max(1 / SS, snap((10 - 7 * q) * k)));
      ctx.fillStyle = '#ffffff'; ctx.fillRect(snap(x0 + m.x * k), snap(y0 + (m.y - 1.5) * k), 400, Math.max(1 / SS, snap((3 - 2 * q) * k)));
      glow(x0 + m.x * k, y0 + m.y * k, m.c, 30, 0.8 * al);
    } else if (m.kind === 'glitch') {
      for (let i = 0; i < 6; i++) sq(x0, y0, k, Math.round(rnd(0, 120)), Math.round(rnd(20, a.h - 20)), Math.round(rnd(2, 4)), i % 2 ? '#39ff6a' : '#ff4fa8');
      for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? '#39ff6a' : '#ff4fa8'; ctx.fillRect(snap(x0 + rnd(0, 40) * k), snap(y0 + rnd(20, a.h - 20) * k), snap(rnd(40, 120) * k), snap(2 * k)); }
    }
  }
  ctx.globalAlpha = base;
}

// draws the portrait with the point between its feet at x, y (game pixels), S canvas pixels to an art pixel.
// o: tint (the whole figure in one color: a locked silhouette, a flash, an afterimage), alpha, still (the first
// frame), fx (false: no particles or glows), scene (the fighter's own backdrop behind them: the select screen's
// panel), shadow (theirs, on the floor under them). Returns false while the picture is still loading.
export function drawPortrait(id, t, x, y, S = PORTRAIT_SCALE, o = {}) {
  const a = PORTRAIT_ART[id], img = IMG[id];
  if (!a || !img) return false;
  const f = o.still ? 0 : frameAt(a, t), k = S / SS, fx = FX[id], live = o.fx !== false && !o.tint && fx;
  let x0 = snap(x - a.foot[0] * k), y0 = snap(y - a.foot[1] * k);
  if (live) {
    // a new fighter (or a jump in the clock) starts the effects over
    if (fxId !== id || t < lastT || t - lastT > 0.5) { fxId = id; parts.length = 0; marks.length = 0; lastF = f; lastLoop = loopAt(a, t); lastT = t; shakeT = 0; }
    for (const l of landing.splice(0)) if (l.id === id) landFx(a, l.col);
    const dt = Math.min(0.05, t - lastT); lastT = t;
    if (f !== lastF) { fx.ev?.(a, f); lastF = f; }
    const lp = loopAt(a, t);
    if (lp !== lastLoop) { fx.loop?.(a, f, lp); lastLoop = lp; }
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
  const al = ctx.globalAlpha;
  if (live && o.scene) { fx.scene?.(x, y, t); ctx.globalAlpha = al; }
  // their shadow goes over the scene and under them
  if (o.shadow) { drawPortraitShadow(id, t, x, y, S, al); ctx.globalAlpha = al; }
  if (live) { fx.back?.(a, f, x0, y0, k, t); ctx.globalAlpha = al; }
  if (o.tint) ctx.drawImage(tinted(id, f, o.tint), 0, 0, a.w, a.h, x0, y0, a.w * k, a.h * k);
  else ctx.drawImage(img, f * a.w, 0, a.w, a.h, x0, y0, a.w * k, a.h * k);
  if (live) {
    fx.front?.(a, f, x0, y0, k, t);
    ctx.globalAlpha = al;
    for (const p of parts) {
      const pa = Math.max(0, 1 - p.t / p.life);
      ctx.globalAlpha = pa * al;
      sq(x0, y0, k, p.x - p.s / 2, p.y - p.s / 2, p.s, p.c);
      if (p.glow && pa > 0.3) glow(x0 + p.x * k, y0 + p.y * k, p.c, 4, 0.25 * pa);
    }
    ctx.globalAlpha = al;
    drawMarks(x0, y0, k, a);
  }
  ctx.restore();
  return true;
}
