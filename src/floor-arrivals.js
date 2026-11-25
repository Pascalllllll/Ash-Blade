// Arriving on a new floor of the descent (every five waves, after a boss): a cinematic of about three seconds in a
// letterbox, a different one for each floor, showing how the fighter gets down there, ending on the floor's name card.
//   The Brood Nest     they fall through the webs strung over the pit, snapping strand after strand, into the spores.
//   Ember Forge        they come down like a slag rock, the floor cracks orange and the lava pools blow one by one.
//   The Ashen Throne   the King's gate opens; they walk in down his carpet as the torches flare, and kneel.
//   The Void Deep      a rift tears open in the air and drops them out tumbling; it snaps shut behind them.
//   Frozen Hollow      a blizzard blows them in sliding across the ice; frost spreads where they stop.
//   The Glass Hall     their reflection waits in a mirror; the mirror cracks and they step out of it.
//   The Sun Temple     a shaft of sunlight lowers them slowly; the eclipse in the floor lights ring by ring.
//   The Clockworks     they drop onto a gear lift that spins down into place, vents steam, and the clock strikes.
//   The Last Night     the stars go out and they fall as one, a streak of light across the dark.
// Any attack key, Enter, Space, Escape or a tap skips to the end. The world waits while it plays (G.cine).
import { ctx, disc, ring, W, H, SX } from './gfx.js?v=201';
import { G, fx, sparks, dust, addRing, flash, shake, kick, scorch, shadow } from './world.js?v=201';
import { A } from './audio.js?v=201';
import { input, keyHit } from './input.js?v=201';
import { MAPS, B, AW, AH, TORCHES, depthOf } from './maps.js?v=201';
import {
  P, rnd, TAU, clamp, part, glow, line, rect, px, ease, easeIn, at, frame, drawBody, drawHero, restAngle, makeCracks,
  drawCracks, stampCracks, drawLetterbox, drawNameCard, darken, floorRing,
} from './scene-fx.js?v=201';

const skipPressed = () => keyHit('Enter', 'Space', 'Escape', 'KeyJ', 'KeyZ') || input.mouse.pressed || input.thit?.size > 0;
const sweep = (list) => { for (let i = list.length - 1; i >= 0; i--) if (list[i].t >= list[i].life) list.splice(i, 1); };

// ---------- the nine arrivals ----------
// land: when the fighter is standing on the new floor. fall(k): where the body is before that (x, y, z, rot, kind,
// i, tint), or none for an arrival that draws the fighter itself. onLand, update, under (on the floor), back (behind
// the fighter), front (over the fighter).
const ARRIVALS = {
  NEST: {
    land: 1.05, life: 3.1,
    start(k) { k.s.webs = Array.from({ length: 6 }, (_, i) => ({ h: 22 + i * 18, w: 34 + rnd(0, 14), sag: rnd(3, 7), cut: -1 })); },
    fall(k) { const f = easeIn(k.t / this.land); return { x: k.x + Math.sin(k.t * 9) * 2, y: k.y, z: 150 * (1 - f), rot: Math.sin(k.t * 6) * 0.5, kind: 'death', i: 2 }; },
    update(k) {
      if (k.t >= this.land) return;
      const z = this.fall(k).z;
      for (const w of k.s.webs) if (w.cut < 0 && z <= w.h) {
        w.cut = k.t; A.slice();
        for (let i = 0; i < 6; i++) part(k.x + rnd(-6, 6), k.y, rnd(-40, 40), rnd(-10, 10), rnd(0.4, 0.8), '#c8d4c0', { z: w.h, vz: rnd(-20, 30), g: 120, drag: 2 });
      }
    },
    onLand(k) {
      A.splat(); A.boom(1); shake(0.6); kick(Math.PI / 2, 3); dust(k.x, k.y, 24, 120);
      for (let i = 0; i < 40; i++) { const a = rnd(TAU), v = rnd(30, 140); part(k.x, k.y - 2, Math.cos(a) * v, Math.sin(a) * v * 0.6, rnd(0.6, 1.4), Math.random() < 0.6 ? '#b5f23a' : '#6a8a3a', { z: 2, vz: rnd(30, 90), g: 60, drag: 2, glow: Math.random() < 0.3 }); }
      addRing(k.x, k.y, '#b5f23a', 220, 0.5, 2);
    },
    back(k) {
      for (const w of k.s.webs) {
        const y = k.y - w.h, x0 = k.x - w.w, x1 = k.x + w.w;
        if (w.cut < 0) { line(x0, y, k.x, y + w.sag, '#8a9a88'); line(k.x, y + w.sag, x1, y, '#8a9a88'); continue; }
        const u = clamp((k.t - w.cut) * 3, 0, 1), d = 4 + 16 * u;
        line(x0, y, k.x - 4, y + d, '#6a7a68'); line(x1, y, k.x + 4, y + d, '#6a7a68');
      }
    },
  },

  FORGE: {
    land: 1.0, life: 3.2,
    fall(k) { const f = easeIn(k.t / this.land); return { x: k.x - 40 * (1 - f), y: k.y, z: 170 * (1 - f), rot: k.t * 10, kind: 'death', i: 2, tint: Math.floor(k.t * 20) % 2 ? P.ember3 : P.ember }; },
    start(k) { k.s.cr = makeCracks(k.x, k.y, 10, 44); },
    update(k, dt) {
      if (k.t < this.land) { const f = this.fall(k); for (let i = 0; i < 3; i++) part(f.x + rnd(-3, 3), k.y, rnd(-20, 0), rnd(-4, 4), rnd(0.3, 0.6), [P.ember, P.ember2, P.ember3][i], { z: f.z, vz: rnd(30, 80), glow: true, drag: 3, keep: true }); return; }
      const pools = G.map.pools || [];
      pools.forEach(([x, y, r], i) => {
        const s = this.land + 0.25 + i * 0.22;
        if (at(k, s)) { A.boom(0.8); shake(0.35); addRing(x, y, P.ember2, 160, 0.4, 2); }
        if (k.t > s && k.t < s + 0.6 && Math.random() < dt * 60) part(x + rnd(-r / 2, r / 2), y, rnd(-15, 15), rnd(-6, 6), rnd(0.6, 1.1), Math.random() < 0.5 ? P.ember : P.ember3, { z: 2, vz: rnd(120, 220), g: 260, drag: 0.5, glow: true });
      });
    },
    onLand(k) { A.boom(1.8); A.wall(); shake(1); kick(Math.PI / 2, 5); flash(P.ember, 0.15, true); scorch(k.x, k.y, 20); dust(k.x, k.y, 40, 160); sparks(k.x, k.y - 3, -Math.PI / 2, 26, 1.4, P.ember2, 240); addRing(k.x, k.y, P.ember, 300, 0.5, 3); },
    under(k) { if (k.t >= this.land) drawCracks(k.s.cr, (k.t - this.land) / 0.2, P.ember, 1 - (k.t - this.land) / 2.2); },
    end(k) { stampCracks(k.s.cr); },
  },

  THRONE: {
    land: 1.7, life: 3.4,
    // walks in from the King's gate at the top of the hall, down the carpet
    walk(k) { const f = ease(k.t / this.land); return [k.x, B.y0 + 4 + (k.y - B.y0 - 4) * f]; },
    update(k, dt) {
      if (at(k, 0.05)) A.bell();
      TORCHES.forEach(([tx, ty], i) => {
        const s = 0.2 + i * 0.28;
        if (at(k, s)) { A.boom(0.35); addRing(tx, ty, P.ember2, 60, 0.3, 1); }
        if (k.t > s && k.t < s + 0.5 && Math.random() < dt * 50) part(tx + rnd(-2, 2), ty - 3, rnd(-10, 10), -rnd(30, 70), rnd(0.4, 0.8), Math.random() < 0.5 ? P.ember : P.ember3, { glow: true, drag: 1 });
      });
      if (k.t > this.land && Math.random() < dt * 20) part(k.x + rnd(-14, 14), k.y - rnd(0, 6), rnd(-6, 6), -rnd(10, 25), rnd(0.6, 1.2), Math.random() < 0.7 ? '#6a6064' : P.ember, { drag: 1 });
    },
    onLand(k) { A.bell(); dust(k.x, k.y, 14, 60); addRing(k.x, k.y, '#c9a24a', 200, 0.5, 2); },
    back(k) {
      TORCHES.forEach(([tx, ty], i) => { const s = 0.2 + i * 0.28; if (k.t > s) glow(tx, ty - 2, P.ember, 26 + 10 * Math.max(0, 1 - (k.t - s) * 2), 0.3 + 0.3 * Math.max(0, 1 - (k.t - s) * 2)); });
    },
    hero(k) {
      if (k.t < this.land) { const [x, y] = this.walk(k); drawHero(frame('walk', k.t * 10), x, y, {}, restAngle(false)); return true; }
      // he kneels a beat at the foot of the throne, then stands
      const u = k.t - this.land;
      if (u < 0.55) { drawHero(frame('death', 2), k.x, k.y, {}, restAngle(false)); return true; }
      return false;
    },
  },

  VOID: {
    land: 1.25, life: 3.2,
    open(k) { return clamp(k.t / 0.5, 0, 1) * (k.t > this.land + 0.25 ? clamp(1 - (k.t - this.land - 0.25) / 0.3, 0, 1) : 1); },
    fall(k) { if (k.t < 0.55) return null; const f = easeIn((k.t - 0.55) / (this.land - 0.55)); return { x: k.x, y: k.y, z: 74 * (1 - f), rot: (k.t - 0.55) * 14, kind: 'death', i: 2, tint: k.t < 0.7 ? '#b48cff' : null }; },
    update(k, dt) {
      if (at(k, 0.02)) A.rift();
      if (at(k, this.land + 0.4)) { A.riftCut(); addRing(k.x, k.y - 74, '#b48cff', 200, 0.4, 2); }
      const o = this.open(k);
      if (o > 0 && Math.random() < dt * 40) part(k.x + rnd(-6, 6) * o, k.y, rnd(-30, 30), rnd(-10, 10), rnd(0.4, 0.8), Math.random() < 0.5 ? '#b48cff' : '#5a3e8a', { z: 74 + rnd(-16, 16), vz: rnd(-20, 20), glow: true, drag: 2 });
    },
    onLand(k) { A.boom(1.2); shake(0.7); kick(Math.PI / 2, 3); dust(k.x, k.y, 20, 100); addRing(k.x, k.y, '#b48cff', 260, 0.5, 3); addRing(k.x, k.y, '#5a3e8a', 180, 0.7, 2); },
    back(k) {
      const o = this.open(k);
      if (o <= 0) return;
      const cx = k.x, cy = k.y - 74, h = 30;
      glow(cx, cy, '#9a5aff', 30 * o, 0.5 * o);
      for (let y = -h; y <= h; y++) {
        const w = Math.round((1 - Math.abs(y) / h) * 7 * o + Math.sin(y * 1.7 + k.t * 20) * o);
        if (w > 0) { rect(cx - w - 1, cy + y, w * 2 + 2, 1, '#5a3e8a'); rect(cx - w, cy + y, w * 2, 1, '#05020c'); if (y % 5 === 0) px(cx + rnd(-w, w), cy + y, '#ffffff'); }
      }
    },
  },

  FROST: {
    land: 1.15, life: 3.1,
    update(k, dt) {
      if (at(k, 0.05)) A.dash();
      const gust = clamp(1 - k.t / 2, 0, 1), c = fx.cam;
      if (Math.random() < dt * 140 * gust) part(c.x + rnd(-40, 0), c.y + rnd(0, H), rnd(160, 280), rnd(-10, 20), rnd(1, 1.6), Math.random() < 0.7 ? '#e6f2ff' : '#9fd3ff', { drag: 0.2 });
      if (k.t < this.land && Math.random() < dt * 60) { const [x] = this.slide(k); part(x - 4, k.y, rnd(-60, -20), rnd(-8, 8), rnd(0.3, 0.6), '#cfe8ff', { z: 1, vz: rnd(20, 50), g: 200, drag: 2 }); }
    },
    slide(k) { const f = ease(k.t / this.land); return [k.x - 130 * (1 - f), k.y]; },
    onLand(k) { A.freeze?.(); dust(k.x, k.y, 10, 40); addRing(k.x, k.y, '#9fd3ff', 240, 0.6, 2); for (let i = 0; i < 24; i++) { const a = rnd(TAU), v = rnd(20, 90); part(k.x, k.y, Math.cos(a) * v, Math.sin(a) * v * 0.5, rnd(0.5, 1), '#e6f2ff', { z: 1, vz: rnd(10, 40), g: 100, drag: 2 }); } },
    under(k) { if (k.t > this.land) { const u = k.t - this.land; floorRing(k.x, k.y, 6 + u * 30, '#9fd3ff', 1, 0.5, 0, 1); floorRing(k.x, k.y, 3 + u * 18, '#e6f2ff', 1, 0.5, 0.3, 1); } },
    hero(k) {
      if (k.t >= this.land) return false;
      const [x, y] = this.slide(k);
      drawHero(frame('dash', 0), x, y, {}, restAngle(false)); return true;
    },
  },

  GLASS: {
    land: 1.35, life: 3.2,
    update(k) {
      if (at(k, 0.85)) A.crack();
      if (at(k, 1.1)) A.crack();
    },
    onLand(k) {
      A.parry(); A.crack(); flash(P.paper, 0.15, true); shake(0.6);
      for (let i = 0; i < 34; i++) { const a = rnd(TAU), v = rnd(40, 170); part(k.x + rnd(-9, 9), k.y, Math.cos(a) * v, Math.sin(a) * v * 0.5, rnd(0.6, 1.2), Math.random() < 0.5 ? '#cfd8e0' : '#ffffff', { z: rnd(4, 30), vz: rnd(20, 90), g: 300, drag: 1, s: Math.random() < 0.4 ? 2 : 1 }); }
      addRing(k.x, k.y - 14, P.paper, 260, 0.35, 2); addRing(k.x, k.y, '#8a94b0', 200, 0.6, 2);
    },
    hero(k) {
      if (k.t >= this.land) return false;
      const x = k.x, y = k.y, f = clamp(k.t / 0.6, 0, 1);
      // the pane, standing on the floor
      ctx.globalAlpha = f;
      rect(x - 12, y - 38, 24, 38, '#5a6280'); rect(x - 11, y - 37, 22, 37, '#1a1c26');
      ctx.globalAlpha = 1;
      // the reflection, coming clear in the glass
      drawBody(frame('idle', k.t * 7), x, y - 1, { tint: '#8a94b0', alpha: 0.35 + 0.5 * f, flip: true });
      ctx.globalAlpha = 0.25 * f; rect(x - 9, y - 35, 3, 30, '#ffffff'); rect(x - 4, y - 35, 1, 20, '#ffffff'); ctx.globalAlpha = 1;
      // cracks run across it
      if (k.t > 0.85) { line(x - 2, y - 20, x - 10, y - 30, '#ffffff'); line(x - 2, y - 20, x + 9, y - 26, '#ffffff'); line(x - 2, y - 20, x + 4, y - 4, '#cfd8e0'); }
      if (k.t > 1.1) { line(x + 9, y - 26, x + 11, y - 36, '#ffffff'); line(x - 10, y - 30, x - 11, y - 10, '#cfd8e0'); line(x + 4, y - 4, x + 10, y - 12, '#ffffff'); }
      return true;
    },
  },

  TEMPLE: {
    land: 1.7, life: 3.5,
    fall(k) { const f = ease(k.t / this.land); return { x: k.x, y: k.y, z: 96 * (1 - f), kind: 'idle', i: k.t * 7 }; },
    update(k, dt) {
      if (at(k, 0.05)) A.powerUp?.(0.8);
      if (Math.random() < dt * 30) part(k.x + rnd(-9, 9), k.y, rnd(-4, 4), 0, rnd(0.8, 1.4), Math.random() < 0.5 ? P.gold : '#fff2c0', { z: rnd(0, 100), vz: -rnd(5, 20), glow: true, drag: 1 });
      for (let i = 0; i < 3; i++) if (at(k, this.land + 0.2 + i * 0.3)) { A.bell(); addRing(k.x, k.y, P.gold, 120 + i * 80, 0.6, 2); }
    },
    onLand(k) { dust(k.x, k.y, 10, 40); flash(P.gold, 0.12, false); },
    back(k) {
      const a = k.t < this.land + 0.5 ? 1 : clamp(1 - (k.t - this.land - 0.5) / 0.8, 0, 1), x = k.x, top = fx.cam.y;
      if (a <= 0) return;
      ctx.globalAlpha = 0.22 * a; rect(x - 11, top, 22, k.y - top, P.gold); ctx.globalAlpha = 0.35 * a; rect(x - 5, top, 10, k.y - top, '#fff2c0'); ctx.globalAlpha = 1;
      glow(x, k.y, P.gold, 24, 0.5 * a);
    },
    under(k) {
      if (k.t < this.land) return;
      const u = k.t - this.land;
      for (const [r, d] of [[28, 0.1], [32, 0.35], [60, 0.6]]) if (u > d) floorRing(G.map === MAPS.TEMPLE ? AW / 2 : k.x, (B.y0 + B.y1) / 2, r, P.gold, clamp((u - d) / 0.5, 0, 1), 1, -Math.PI / 2, 1);
    },
  },

  GEARS: {
    land: 1.05, life: 3.2,
    fall(k) { const f = easeIn(k.t / this.land); return { x: k.x, y: k.y, z: 150 * (1 - f), rot: 0, kind: 'death', i: 2 }; },
    update(k, dt) {
      for (let i = 0; i < 4; i++) if (at(k, 0.15 + i * 0.22)) A.click();
      if (k.t > this.land) {
        const u = k.t - this.land;
        for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.4, x = k.x + Math.cos(a) * 34, y = k.y + Math.sin(a) * 18; if (u > 0.1 + i * 0.1 && u < 0.9 && Math.random() < dt * 30) part(x, y, rnd(-8, 8), rnd(-4, 4), rnd(0.6, 1), '#e8e4dc', { z: 2, vz: rnd(30, 60), drag: 2 }); }
        if (at(k, this.land + 0.7)) { A.bell(); addRing(k.x, k.y, '#c9a24a', 240, 0.6, 2); }
      }
    },
    onLand(k) { A.wall(); A.boom(1); shake(0.7); kick(Math.PI / 2, 3); sparks(k.x, k.y - 2, -Math.PI / 2, 18, 1.2, '#ffc85a', 200); dust(k.x, k.y, 16, 80); },
    under(k) {
      // the gear lift under the fighter: spins while they fall, jolts as they land, and winds down
      const u = k.t - this.land, rot = k.t * 3 + (u > 0 ? Math.min(u, 0.6) * 10 : 0), x = k.x, y = k.y;
      floorRing(x, y, 15, '#9a7a3a', 1, 0.5, rot, 1); floorRing(x, y, 11, '#5a4a2e', 1, 0.5, rot, 1);
      for (let i = 0; i < 12; i++) { const a = rot + (i / 12) * TAU; rect(Math.round(x + Math.cos(a) * 17) - 1, Math.round(y + Math.sin(a) * 8.5) - 1, 2, 2, '#c9a24a'); }
    },
  },

  NIGHT: {
    land: 1.4, life: 3.3,
    fall(k) { const f = clamp(k.t / this.land, 0, 1); return { x: k.x - 100 * (1 - f), y: k.y, z: 84 * (1 - f), rot: 0, kind: 'death', i: 2, tint: '#ffffff' }; },
    update(k) {
      if (at(k, 0.3)) A.zip?.();
      if (k.t < this.land) { const f = this.fall(k); part(f.x, k.y, rnd(-10, 10), rnd(-3, 3), rnd(0.3, 0.6), Math.random() < 0.5 ? '#ffffff' : '#b4a8ff', { z: f.z, vz: rnd(-10, 10), glow: true, drag: 2, keep: true }); }
    },
    onLand(k) {
      A.boom(1.6); A.bell(); shake(0.9); flash('#b4a8ff', 0.18, true); dust(k.x, k.y, 20, 100);
      for (let i = 0; i < 3; i++) addRing(k.x, k.y, i % 2 ? P.paper : '#b4a8ff', 200 + i * 90, 0.6, 2);
      for (let i = 0; i < 30; i++) { const a = rnd(TAU), v = rnd(30, 150); part(k.x, k.y, Math.cos(a) * v, Math.sin(a) * v * 0.6, rnd(0.6, 1.4), Math.random() < 0.5 ? '#ffffff' : '#8a84c0', { z: 3, vz: rnd(20, 80), g: 100, drag: 2, glow: true }); }
    },
    under(k) { darken(k.t < this.land ? 0.6 : clamp(0.6 - (k.t - this.land) * 0.6, 0, 0.6)); },
    back(k) {
      if (k.t >= this.land) return;
      const f = this.fall(k);
      for (let i = 1; i < 14; i++) { const g = i / 14, x = f.x - 100 * 0.05 * i, z = f.z + 84 * 0.05 * i; ctx.globalAlpha = 1 - g; px(x, k.y - z, i < 4 ? '#ffffff' : '#b4a8ff'); px(x + 1, k.y - z, '#b4a8ff'); ctx.globalAlpha = 1; }
      glow(f.x, k.y - f.z, '#ffffff', 16, 0.8);
    },
  },
};

// ---------- the wrapper every arrival runs in ----------
export function floorArrival(key, wave) {
  const S = ARRIVALS[key], m = MAPS[key];
  if (!S) return null;
  const p = G.p;
  p.x = AW / 2; p.y = (B.y0 + B.y1) / 2 + 20; p.vx = p.vy = 0; p.state = 'cine';
  fx.cam.x = clamp(p.x - W / 2, SX, AW - W - SX); fx.cam.y = clamp(p.y - H / 2, 0, AH - H);
  const k = { t: 0, prev: 0, life: S.life, hero: true, fxSpeed: 1, x: p.x, y: p.y, landed: false, s: {} };
  k.banner = G.banner; G.banner = null;
  S.start?.(k);
  const land = () => { if (!k.landed) { k.landed = true; S.onLand?.(k); } };
  k.update = (dt) => {
    k.prev = k.t; k.t += dt;
    if (!k.skip && k.t > 0.35 && skipPressed()) {
      k.skip = true;
      if (!k.landed) { k.t = S.land; land(); }
      k.t = Math.max(k.t, k.life - 0.45); k.prev = k.t;
    }
    if (!k.landed && k.t >= S.land) land();
    S.update?.(k, dt);
    if (k.t >= k.life) {
      G.cine = null; p.state = 'move'; p.inv = 0.6; p.sq = 0.26; p.sqv = 0;
      p.bufAtk = p.bufDash = p.bufQ = p.bufE = p.bufR = 0;
      S.end?.(k);
      if (k.banner) { k.banner.t = 0; G.banner = k.banner; }
    }
  };
  k.under = () => S.under?.(k);
  k.draw = () => {
    S.back?.(k);
    if (!S.hero?.(k)) {
      const f = !k.landed && S.fall?.(k);
      if (f) {
        shadow(k.x, k.y, 2 + (1 - Math.min(1, f.z / 150)) * 7);
        drawBody(frame(f.kind || 'death', f.i ?? 2), f.x, f.y, { z: f.z, rot: f.rot || 0, pivot: [0, -8], tint: f.tint || null });
      } else if (k.landed) {
        // they land crouched, then rise with a little spring
        const u = k.t - S.land, crouch = u < 0.28, s = u < 0.28 ? 0 : 0.25 * Math.exp(-(u - 0.28) * 4.5) * Math.cos((u - 0.28) * 13);
        shadow(k.x, k.y, 7);
        drawHero(crouch ? frame('death', 2) : frame('idle', k.t * 7), k.x, k.y, crouch ? {} : { sx: 1 + 0.55 * s, sy: 1 - s }, restAngle(false));
      }
    }
    S.front?.(k);
  };
  // over everything: the letterbox, and the floor's name card once they're down
  k.overlay = () => {
    drawLetterbox(Math.min(1, k.t / 0.3, (k.life - k.t) / 0.35));
    const c0 = S.land + 0.15;
    drawNameCard(m.name, 'DEPTH ' + (depthOf(wave) + 1) + '   ' + m.desc, m.flame[1], k.t - c0, k.life - c0 - 0.05);
  };
  return k;
}
