// How each boss arrives, in the seconds before it appears (its spawn mark, s: x, y on the floor, t, life). The camera
// turns to the spot (updateCam). Each one says who is coming, then the boss's own entrance takes over (bosses.js):
//   Warden     his lantern comes down out of the dark on its chain, swinging, as a pink seal draws itself on the floor
//   Brood      silk strands come down out of the dark, a web spreads between them, her shadow grows overhead
// When the boss appears, what its arrival left behind fades away (drawn with s.fade, see world.js ARRIVE_FADE).
//   Colossus   a drop zone: hazard rings, a red beacon, beeps that quicken, and its shadow growing as it falls
//   King       a crown of fire burns itself into the floor and its points rise as flames while embers rain
//   Wyrm       the stone turns to water: ripples, and its fin circling closer under the floor
//   Herald     a storm gathers over the spot: dark, rain, and lightning striking it again and again
//   Mirror     copies of the fighter walk in from every side and fold into one point, which cracks like glass
//   Eclipse    a black disc slides over a gold sun overhead, the light fails, and a ring of gold opens on the floor
//   Clock      a clock face draws itself on the floor; its hands spin backwards, faster, ticking louder
//   Nox        the light dies around the spot, tendrils of night crawl out of it, and two pale eyes open
import { ctx, P, line, rect, px, disc, ring, glow, drawSprite } from './gfx.js?v=212';
import { G, TAU, heroSet, part, rnd, shake, dust, addRing, flash, fx } from './world.js?v=212';
import { A } from './audio.js?v=212';
import { darken, floorRing, ease } from './scene-fx.js?v=212';

export const ARRIVE_LIFE = 2.6;
const passed = (s, dt, at) => s.t >= at && s.t - dt < at;

// sounds, shakes and particles, once a frame
export function bossArrivalUpdate(s, dt) {
  const id = s.boss, k = s.t / s.life, { x, y } = s;
  if (s.t < 0) return;
  switch (id) {
    case 'warden':
      if (Math.floor(s.t * 7) !== Math.floor((s.t - dt) * 7)) A.click();
      if (Math.random() < dt * 20) part(x + rnd(-14, 14), y, rnd(-6, 6), -rnd(6, 16), rnd(0.5, 0.9), '#ff4fa8', { glow: true, drag: 1 });
      break;
    case 'brood':
      if (Math.floor(s.t * 4) !== Math.floor((s.t - dt) * 4)) A.click();
      if (Math.random() < dt * 25) part(x + rnd(-60, 60), fx.cam.y + rnd(0, 30), rnd(-4, 4), rnd(30, 60), rnd(1, 2), Math.random() < 0.5 ? '#6a5040' : '#8a8098', { g: 60, drag: 0.4 });
      break;
    case 'colossus': {
      const beeps = 3 + k * k * 14;
      if (Math.floor(s.t * beeps) !== Math.floor((s.t - dt) * beeps)) A.beep();
      if (k > 0.8 && Math.random() < dt * 20) shake(0.1);
      break;
    }
    case 'king':
      if (passed(s, dt, 0.05)) { A.boom(1.2); A.bossRoar(); }
      if (Math.random() < dt * 50) part(x + rnd(-90, 90), y - rnd(60, 120), rnd(-6, 6), rnd(20, 50), 2, Math.random() < 0.6 ? P.ember : P.ember3, { glow: true, drag: 0.3 });
      if (Math.random() < dt * 8) A.crack();
      break;
    case 'wyrm':
      if (passed(s, dt, 0.05)) A.rift();
      if (Math.floor(s.t * 2.5) !== Math.floor((s.t - dt) * 2.5)) { addRing(x, y, '#b48cff', 140, 0.6, 1); shake(0.12); }
      { const a = s.t * 4, r = 70 * (1 - k * 0.8); if (Math.random() < dt * 40) dust(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.55, 1, 30); }
      break;
    case 'herald':
      if (Math.floor(s.t * 3) !== Math.floor((s.t - dt) * 3) && s.t > 0.4) {
        G.bolts.push({ x0: x + rnd(-24, 24), y0: y - 170, x1: x + rnd(-6, 6), y1: y, t: 0, life: 0.25 });
        A.zap(); shake(0.3); flash('#62efff', 0.06, false);
      }
      break;
    case 'mirror':
      if (Math.floor(s.t * 5) !== Math.floor((s.t - dt) * 5)) A.zip?.();
      if (passed(s, dt, s.life - 0.15)) { A.parry(); flash(P.paper, 0.12, false); }
      break;
    case 'eclipse':
      if (passed(s, dt, 0.05)) A.bell();
      if (passed(s, dt, s.life * 0.6)) A.bell();
      break;
    case 'clock': {
      const ticks = 2 + k * 10;
      if (Math.floor(s.t * ticks) !== Math.floor((s.t - dt) * ticks)) A.click();
      break;
    }
    case 'nox':
      if (Math.floor(s.t * 1.6) !== Math.floor((s.t - dt) * 1.6)) A.heartbeat?.();
      if (Math.random() < dt * 40) part(x + rnd(-40, 40), y + rnd(-10, 10), rnd(-4, 4), -rnd(4, 14), rnd(0.8, 1.4), Math.random() < 0.5 ? '#1a0e2a' : '#3a2a5a', { drag: 1 });
      break;
  }
}

// drawn on the floor, under everyone (darkness covers the floor and leaves the fighters lit)
// s.fade (0..1): after the boss has appeared, what its arrival left behind dies away (world.js fades it out too)
export function drawBossArrival(id, x, y, k, col, s = { t: k * ARRIVE_LIFE, life: ARRIVE_LIFE }) {
  k = Math.min(1, Math.max(0, k));
  const t = s.t, top = fx.cam.y - 4, fo = s.fade || 0, GA = ctx.globalAlpha;
  switch (id) {
    case 'warden': {
      // the seal draws itself, and the lantern comes down on its chain, swinging
      floorRing(x, y, 26, col, k, 0.5); floorRing(x, y, 20, '#6e1b52', Math.max(0, k * 1.3 - 0.3), 0.5);
      for (let i = 0; i < 5 * k; i++) { const a = -Math.PI / 2 + (i * TAU) / 5, b = -Math.PI / 2 + ((i + 2) * TAU) / 5; line(x + Math.cos(a) * 20, y + Math.sin(a) * 10, x + Math.cos(b) * 20, y + Math.sin(b) * 10, '#6e1b52'); }
      const ly = top + (y - 34 - top) * ease(k / 0.85) * (1 - ease(fo * 1.6)), lx = x + Math.sin(t * 3) * 8 * (1 - k);
      for (let cy = top; cy < ly - 3; cy += 3) px(x + (lx - x) * ((cy - top) / Math.max(1, ly - top)), cy, (cy / 3) % 2 ? '#8a8a9a' : '#5a5a6a');
      glow(x, y, col, 16 + 26 * k, 0.25 + 0.3 * k);
      rect(lx - 3, ly - 4, 7, 9, '#2a2230'); rect(lx - 2, ly - 3, 5, 6, col); px(lx, ly - 5, '#8a8a9a'); glow(lx, ly, col, 14, 0.7);
      break;
    }
    case 'brood': {
      // silk comes down out of the dark round the spot, the strands catch on the floor and a web spreads between them;
      // under it her shadow grows as she comes down above. Her eggs hang in the web, and split when she lands.
      ctx.globalAlpha = GA * 0.45 * k; disc(x, y, 6 + 16 * ease(k), '#05030a'); ctx.globalAlpha = GA;
      const n = 8, R = 62;
      for (let i = 0; i < n; i++) {
        const a = (i * TAU) / n + 0.2, ax = x + Math.cos(a) * R, ay = y + Math.sin(a) * R * 0.5, d = ease(Math.min(1, k * 2.2 - i * 0.1));
        if (d <= 0) continue;
        const ey = top + (ay - top) * d, sway = Math.sin(t * 2 + i) * 2 * (1 - d);
        for (let yy = top; yy < ey; yy += 2) px(ax + sway * ((yy - top) / Math.max(1, ey - top)), yy, (yy >> 1) % 3 ? '#cfc8dc' : '#8a8098');
        if (d >= 1) {
          // the spoke from the anchor to the middle, and the rings between spokes
          const w = ease(Math.min(1, (k * 2.2 - i * 0.1 - 1) * 1.2));
          if (w > 0) line(ax, ay, ax + (x - ax) * w, ay + (y - ay) * w, '#aaa69e');
          for (const r of [0.3, 0.55, 0.8]) if (w > 1 - r) { const b = a + TAU / n; line(x + Math.cos(a) * R * r, y + Math.sin(a) * R * r * 0.5, x + Math.cos(b) * R * r, y + Math.sin(b) * R * r * 0.5, '#6a665e'); }
        }
      }
      for (let i = 0; i < 6; i++) {
        const a = (i * TAU) / 6, ex = x + Math.cos(a) * 34, ey = y + Math.sin(a) * 17, open = fo > 0.1 + i * 0.04;
        if (k < 0.35 + i * 0.08) continue;
        disc(ex, ey, 3, open ? '#3a4a2a' : '#c8d4a0'); if (!open) px(ex - 1, ey - 1, '#f0f8d0'); else { px(ex - 2, ey - 2, '#c8d4a0'); px(ex + 2, ey - 2, '#c8d4a0'); }
      }
      break;
    }
    case 'colossus': {
      // the drop zone: hazard stripes turning, a beacon, and the shadow of what is falling
      const R = 34;
      for (let i = 0; i < 24; i++) { const a = t * 0.8 + (i * TAU) / 24; rect(Math.round(x + Math.cos(a) * R) - 1, Math.round(y + Math.sin(a) * R * 0.5) - 1, 3, 2, i % 2 ? '#ffd447' : '#1a1418'); }
      ctx.globalAlpha = GA * (0.25 + 0.5 * k) * (1 - fo); disc(x, y, Math.max(2, 30 * ease(k)), '#05030a'); ctx.globalAlpha = GA;
      const on = Math.floor(t * (3 + k * 10)) % 2;
      glow(x, y, on ? '#ff3b3b' : '#ff7a2b', 22 + 20 * k, on ? 0.6 : 0.25);
      if (on) floorRing(x, y, 12, '#ff3b3b', 1, 0.5);
      break;
    }
    case 'king': {
      // a crown of fire burns into the floor; its points rise as flames
      glow(x, y, P.ember, 40 + 30 * k, 0.3 + 0.3 * k);
      floorRing(x, y, 30, P.ember, k * 1.5, 0.5, -Math.PI / 2, 2); floorRing(x, y, 25, P.ember3, k * 1.5 - 0.3, 0.5);
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + ((i - 2) * Math.PI) / 7 - Math.PI / 2, d = Math.max(0, k * 1.6 - 0.4 - i * 0.08);
        const px_ = x + Math.cos(a + Math.PI / 2) * 28, py_ = y - 8 + Math.sin(a + Math.PI / 2) * 6, h = Math.round((i === 2 ? 34 : 22) * ease(d) * (0.85 + 0.15 * Math.sin(t * 20 + i)) * (1 - fo));
        if (h > 0) { rect(px_ - 2, py_ - h, 5, h, P.ember); rect(px_ - 1, py_ - h * 0.8, 3, h * 0.8, P.ember3); px(px_, py_ - h - 1, P.paper); glow(px_, py_ - h / 2, P.ember, 10, 0.4); }
      }
      break;
    }
    case 'wyrm': {
      // ripples, and the fin circling closer under the stone
      for (let i = 0; i < 4; i++) { const r = ((t * 30 + i * 16) % 64); floorRing(x, y, Math.max(2, r), i % 2 ? '#5a3e8a' : '#b48cff', 1, 0.5); }
      const a = t * 4, r = 70 * (1 - k * 0.8), fx_ = x + Math.cos(a) * r, fy_ = y + Math.sin(a) * r * 0.55;
      for (let j = 0; j < 7; j++) { const b = a - j * 0.12, gx = x + Math.cos(b) * r, gy = y + Math.sin(b) * r * 0.55; disc(gx, gy - Math.max(0, 4 - j), Math.max(1, 3 - j * 0.35), j ? '#2a1d48' : '#3a2a5a'); }
      line(fx_, fy_ - 8, fx_ + 2, fy_, '#b48cff'); line(fx_ - 3, fy_, fx_, fy_ - 8, '#5a3e8a');
      break;
    }
    case 'herald': {
      // the storm: dark, rain over everything, the spot charged
      darken(0.35 * Math.min(1, k * 2));
      const c = fx.cam;
      for (let i = 0; i < 60; i++) { const u = (t * 2.4 + i * 0.137) % 1, rx = c.x + ((i * 53) % 340) - 10 + u * 30, ry = c.y + u * 190 - 10; line(rx, ry, rx + 3, ry + 7, i % 3 ? '#4a6a8a' : '#9fd3ff'); }
      floorRing(x, y, 18 + 4 * Math.sin(t * 10), '#62efff', 1, 0.5); glow(x, y, '#62efff', 24, 0.3 + 0.3 * k);
      break;
    }
    case 'mirror': {
      // copies of the fighter walk in from all sides and fold into one point
      const set = heroSet(), spr = set.idles?.[Math.floor(t * 7) % (set.idles?.length || 1)];
      if (spr) for (let i = 0; i < 6; i++) {
        const a = (i * TAU) / 6 + t * 0.6, r = 90 * (1 - ease(k)), sx = x + Math.cos(a) * r, sy = y + Math.sin(a) * r * 0.55;
        ctx.globalAlpha = GA * (0.25 + 0.5 * k); drawSprite(spr, sx - spr.w / 2, sy - spr.h, Math.cos(a) > 0, '#8a94b0'); ctx.globalAlpha = GA;
      }
      if (k > 0.75) { const h = 40 * (k - 0.75) * 4; line(x, y, x - 3, y - h * 0.5, P.paper); line(x - 3, y - h * 0.5, x + 2, y - h, P.paper); glow(x, y - h / 2, P.paper, 12, 0.6); }
      break;
    }
    case 'eclipse': {
      // a black disc slides over a gold sun above; the light fails; a ring of gold opens on the floor
      darken(0.45 * k);
      const sx = x, sy = y - 70, r = 13;
      glow(sx, sy, P.gold, 30, 0.6 * (1 - k * 0.6));
      disc(sx, sy, r + 1, '#ffac49'); disc(sx, sy, r, '#ffd447');
      disc(sx - 30 + 30 * ease(k), sy, r, '#0c0805');
      if (k > 0.85) ring(sx, sy, r + 1, 1, '#fff2c0');
      floorRing(x, y, 34 * ease(k), P.gold, 1, 0.5); floorRing(x, y, 28 * ease(k), '#c9a24a', 1, 0.5);
      break;
    }
    case 'clock': {
      // a clock face draws itself on the floor; its hands spin backwards, faster
      floorRing(x, y, 30, '#c9a24a', k * 1.4, 0.5, -Math.PI / 2, 1);
      for (let i = 0; i < 12; i++) if (k * 12 > i) { const a = -Math.PI / 2 + (i * TAU) / 12; line(x + Math.cos(a) * 26, y + Math.sin(a) * 13, x + Math.cos(a) * 30, y + Math.sin(a) * 15, i % 3 ? '#9a7a3a' : '#ffd447'); }
      const spin = -t * (2 + k * 18);
      line(x, y, x + Math.cos(spin) * 22, y + Math.sin(spin) * 11, '#ffe8a8', 2); line(x, y, x + Math.cos(spin / 12) * 14, y + Math.sin(spin / 12) * 7, '#c9a24a', 2);
      disc(x, y, 2, '#ffd447'); glow(x, y, '#ffc85a', 20, 0.2 + 0.3 * k);
      break;
    }
    case 'nox': {
      // the light dies; tendrils of night crawl out; two pale eyes open
      darken(0.6 * Math.min(1, k * 1.5));
      for (let i = 0; i < 9; i++) {
        const a = (i * TAU) / 9 + Math.sin(t + i) * 0.2, len = 80 * ease(k * 1.3 - i * 0.03);
        let px0 = x, py0 = y;
        for (let j = 1; j <= 10; j++) { const u = j / 10, w = Math.sin(t * 3 + i + j) * 4, nx = x + Math.cos(a) * len * u - Math.sin(a) * w, ny = y + (Math.sin(a) * len * u + Math.cos(a) * w) * 0.55; line(px0, py0, nx, ny, j < 6 ? '#1a0e2a' : '#3a2a5a', j < 4 ? 2 : 1); px0 = nx; py0 = ny; }
      }
      disc(x, y, 10 + 8 * k, '#05020a');
      const open = Math.max(0, (k - 0.55) / 0.45) * Math.max(0, 1 - fo * 4), ey = y - 34;
      if (open > 0) for (const d of [-6, 6]) { const h = Math.max(1, Math.round(3 * open)); rect(x + d - 2, ey - Math.floor(h / 2), 5, h, '#e8e0ff'); glow(x + d, ey, '#b4a8ff', 8, 0.5 * open); }
      break;
    }
  }
}
