// The heroes' entrances: a cinematic of about three seconds as a run starts, a different one for each fighter, in a
// letterbox and ending on their name card, as the fighter says its line (art/audio/entrances). An attack key, Enter,
// Space, Escape or a tap skips to the end.
//   Kael     falls out of a darkening sky as a meteor and lands in a burning crater, then sweeps his sword round.
//   Vega     drops spinning from the sky firing all round at high noon, twirls her revolver, fires once at the sky.
//   Morrow   draws a summoning circle, a pillar of violet light comes down, and he floats down inside it.
//   Rin      petals storm across, her afterimages cut the air, she appears in a burst of sakura smoke, flicks her
//            blade and every cut in the air bursts at once.
//   Rivet    a drop pod slams down, vents steam and blows open in golden smoke; she slams her wrench down.
//   Grom     the ground shakes, he falls from the sky hammer first and splits the floor with rock spikes.
//   Unit-7   a countdown, an orbital beam, and the robot builds itself up row by row inside it and powers on.
//   The Dev  a terminal compiles him, the window shuts off, and he renders in from coarse blocks to full detail.
import { ctx, disc, ring, W } from './gfx.js?v=207';
import { G, fx, sparks, dust, addRing, flash, shake, kick, scorch, glitch, shadow, heroSet, cineTail } from './world.js?v=207';
import { A } from './audio.js?v=207';
import { input, keyHit } from './input.js?v=207';
import {
  P, rnd, TAU, clamp, part, glow, line, rect, px, text, textO, ease, easeIn, at, between, frame, drawBody, drawHero, drawCoarse,
  handPos, eyePos, weaponLen, restAngle, makeCracks, drawCracks, stampCracks, drawLetterbox, drawNameCard, darken, floorRing,
} from './scene-fx.js?v=207';

const SUB = { BLADE: 'THE BLADE', GUNNER: 'THE GUNNER', WIZARD: 'THE WIZARD', NINJA: 'THE SAMURAI', MECHANIC: 'THE MECHANIC', TANK: 'THE TANK', ROBOT: 'THE ROBOT', DEV: 'ROOT ACCESS' };
const PETAL = ['#ffb7d5', '#ff8fb8', '#ffffff'];
const GREEN = '#39ff6a', PINK = '#ff4fa8', VIOLET = '#b48cff';
const STONE = ['#5a5266', '#3d3848', '#8a8296', '#2a2632'];
const skipPressed = () => keyHit('Enter', 'Space', 'Escape', 'KeyJ', 'KeyZ') || input.mouse.pressed || input.thit.size > 0;
// a spring that starts squashed and settles: positive squashes wide, negative stretches tall
const settle = (u, amt = 0.3) => (u < 0 ? 0 : amt * Math.exp(-u * 4.5) * Math.cos(u * 13));
const sq = (s) => ({ sx: 1 + 0.55 * s, sy: 1 - s });
function rubble(x, y, n, sp = 1, cols = STONE) {
  for (let i = 0; i < n; i++) {
    const a = rnd(TAU), v = rnd(30, 150) * sp;
    part(x + rnd(-4, 4), y, Math.cos(a) * v, Math.sin(a) * v * 0.6, rnd(1, 1.8), cols[i % cols.length], { z: 2, vz: rnd(80, 220) * sp, g: 440, drag: 1, s: Math.random() < 0.4 ? 3 : 2, keep: true });
  }
}
function puff(list, x, y, n, cols, r0 = 4, r1 = 14, sp = 30) {
  for (let i = 0; i < n; i++) { const a = rnd(TAU), d = rnd(0, 8); list.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.6, vx: Math.cos(a) * rnd(5, sp), vy: Math.sin(a) * rnd(5, sp) * 0.5 - rnd(4, 14), r: rnd(r0, r0 + 3), R: rnd(r1 * 0.7, r1), t: 0, life: rnd(0.35, 0.6), c: cols[i % cols.length] }); }
}
function stepPuffs(list, dt) { for (const q of list) { q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= Math.exp(-2 * dt); q.vy *= Math.exp(-2 * dt); q.r += (q.R - q.r) * (1 - Math.exp(-5 * dt)); } for (let i = list.length - 1; i >= 0; i--) if (list[i].t > list[i].life) list.splice(i, 1); }
function drawPuffs(list) { for (const q of list) { const k = q.t / q.life, r = q.r * (1 - k * k); if (r >= 1) disc(q.x, q.y, r, q.c); } }

// ---------- the wrapper every entrance runs in ----------
export function heroEntrance(id) {
  const p = G.p, S = SCRIPTS[id] || SCRIPTS.BLADE;
  const k = { t: 0, prev: 0, life: S.life, hero: true, fxSpeed: 1, x: p.x, y: p.y, revealed: false, s: {} };
  p.state = 'cine'; p.vx = p.vy = 0;
  // the wave's banner waits until the entrance is over
  k.banner = G.banner; G.banner = null;
  S.start?.(k);
  const reveal = () => { if (!k.revealed) { k.revealed = true; k.hitT = k.t; S.reveal?.(k); } };
  k.update = (dt) => {
    k.prev = k.t; k.t += dt;
    if (!k.skip && k.t > 0.35 && skipPressed()) {
      k.skip = true;
      if (!k.revealed) { k.t = S.revealAt; reveal(); }
      k.t = Math.max(k.t, k.life - 0.45); k.prev = k.t;
    }
    if (!k.revealed && k.t >= S.revealAt) reveal();
    // the fighter says its line as its name card comes up (also when the entrance is skipped)
    if (!k.said && k.t >= (S.cardAt ?? S.revealAt)) { k.said = true; A.playVoice(id, 0, 'entrances'); }
    S.update(k, dt);
    if (k.t >= k.life) {
      G.cine = null; p.state = 'move'; p.inv = 0.6; p.sq = 0; p.sqv = 0;
      // keys pressed during the entrance (to skip it, or out of impatience) don't fire once it's over
      p.bufAtk = p.bufDash = p.bufQ = p.bufE = p.bufR = 0;
      S.end?.(k);
      cineTail({ k, under: () => S.under?.(k) }, 1.3);
      if (k.banner) { k.banner.t = 0; G.banner = k.banner; }
    }
  };
  k.draw = () => S.draw(k);
  // drawn on the floor, under everyone and every particle: the darkening, cracks, circles and marks
  k.under = () => S.under?.(k);
  // drawn by the HUD, over everything: the letterbox and the name card
  k.overlay = () => {
    drawLetterbox(Math.min(1, k.t / 0.3, (k.life - k.t) / 0.35));
    const c0 = S.cardAt ?? S.revealAt;
    drawNameCard(G.kit.hero || G.kit.alias, SUB[id], G.kit.color(), k.t - c0, k.life - c0 - 0.05);
  };
  return k;
}

// ---------- the eight entrances ----------
const SCRIPTS = {
  // Kael: a meteor out of a darkening sky, a burning crater, a full sweep of the sword
  BLADE: {
    life: 3.0, revealAt: 1.15,
    start(k) { k.s.cr = makeCracks(k.x, k.y, 10, 40); k.s.pil = Array.from({ length: 9 }, (_, i) => ({ a: (i / 9) * TAU + rnd(-0.2, 0.2), r: rnd(18, 30), d: rnd(0, 0.15), h: rnd(16, 30) })); },
    // a real meteor's slant: in from the upper left at about 45 degrees, its tail streaming back along the path
    met(k) { const f = easeIn((k.t - 0.45) / 0.7); return [k.x - 150 * (1 - f), k.y - 6 * (1 - f), 150 * (1 - f)]; },
    update(k, dt) {
      const { x, y } = k, t = k.t;
      if (at(k, 0.02)) A.powerUp(1.1);
      if (at(k, 0.45)) A.meteorFall();
      if (!k.revealed) {
        if (Math.random() < dt * 45) part(x + rnd(-170, 170), y - 120, rnd(-12, 12), rnd(30, 70), 2.4, Math.random() < 0.6 ? P.ember : P.ember2, { drag: 0.2, glow: true, keep: true });
        if (t > 0.25 && Math.random() < dt * 10) shake(0.04 + t * 0.07);
        if (t >= 0.45) {
          const [mx, my, mz] = this.met(k);
          for (let i = 0; i < 4; i++) part(mx + rnd(-3, 3), my, rnd(-22, -9), rnd(-4, 2), rnd(0.25, 0.5), [P.ember, P.ember2, P.ember3, P.paper][i], { z: mz + rnd(-4, 4), vz: rnd(50, 95), glow: true, drag: 3, keep: true });
          if (Math.random() < dt * 30) part(mx, my, rnd(-30, 0), 0, rnd(0.6, 1), '#3a3040', { z: mz, vz: rnd(0, 30), drag: 1.5 });
        }
        return;
      }
      const u = t - k.hitT;
      if (u < 1.4 && Math.random() < dt * 70 * (1 - u / 1.4)) { const a = rnd(TAU), r = rnd(12, 32); part(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.55, rnd(-6, 6), 0, rnd(0.3, 0.6), Math.random() < 0.5 ? P.ember : P.ember2, { vz: rnd(30, 100), glow: true, drag: 1, keep: true }); }
      if (Math.random() < dt * 14) part(x + rnd(-6, 6), y - rnd(0, 14), rnd(-6, 6), -rnd(15, 35), rnd(0.6, 1.1), Math.random() < 0.6 ? P.ember : P.ember3, { glow: true, drag: 1 });
      if (at(k, k.hitT + 0.55)) { A.heavySwing(); G.slashes.push({ follow: false, x, y, a: 0, r: 32, arc: 6.2, dir: 1, t: 0, life: 0.3, th: 9, col: 'ember' }); addRing(x, y - 6, P.ember2, 260, 0.3, 2); shake(0.3); }
    },
    reveal(k) {
      const { x, y } = k;
      shake(1); kick(Math.PI / 2, 6); flash(P.paper, 0.2, true); A.boom(2); A.wall();
      scorch(x, y, 22);
      addRing(x, y - 2, P.paper, 420, 0.35, 3); addRing(x, y - 2, P.ember2, 300, 0.5, 4); addRing(x, y - 2, P.ember, 200, 0.65, 2);
      addRing(x, y, P.stone2, 240, 0.8, 3);
      dust(x, y, 50, 180); rubble(x, y, 26); sparks(x, y - 3, -Math.PI / 2, 30, 1.4, P.ember2, 260);
    },
    end(k) { stampCracks(k.s.cr); },
    under(k) {
      const { x, y } = k, t = k.t;
      if (!k.revealed) { darken(Math.min(0.45, t * 0.8)); floorRing(x, y, Math.max(6, 26 - t * 14), Math.floor(t * 12) % 2 ? P.ember : P.blood, 1, 0.5); return; }
      const u = t - k.hitT;
      drawCracks(k.s.cr, u / 0.18, P.ember, 1 - u / 1.8);
    },
    draw(k) {
      const { x, y } = k, t = k.t;
      if (!k.revealed) {
        glow(x, y, P.ember, 14 + t * 10, 0.15 + t * 0.3);
        if (t >= 0.45) {
          const [mx, my, mz] = this.met(k);
          shadow(x, y, 2 + (1 - mz / 210) * 8);
          line(mx, my - mz, mx - 36, my - mz - 36, P.ember2, 5); line(mx, my - mz, mx - 24, my - mz - 24, P.ember3, 3); line(mx - 36, my - mz - 36, mx - 52, my - mz - 52, P.ember, 2);
          glow(mx, my - mz, P.ember, 24, 0.8);
          drawBody(frame('death', 2), mx, my, { z: mz - 7, rot: t * 16, pivot: [0, -8], tint: Math.floor(t * 20) % 2 ? P.ember3 : P.ember });
          glow(mx, my - mz, P.ember3, 12, 0.9);
        }
        return;
      }
      const u = t - k.hitT;
      glow(x, y, P.ember, 30, Math.max(0, 0.5 - u * 0.3));
      for (const pl of k.s.pil) {
        const v = u - pl.d;
        if (v < 0 || v > 0.9) continue;
        const h = Math.round(pl.h * Math.sin(Math.PI * Math.min(1, v / 0.9)) * (Math.floor(G.time * 30 + pl.a * 9) % 2 ? 1 : 0.85)), bx = x + Math.cos(pl.a) * pl.r, by = y + Math.sin(pl.a) * pl.r * 0.55;
        rect(bx - 1, by - h, 3, h, P.ember); rect(bx, by - h * 0.85, 1, h * 0.85, P.ember3); px(bx, by - h - 1, P.ember2);
        glow(bx, by - h / 2, P.ember, 8, 0.35);
      }
      // he lands crouched in the crater, rises, and sweeps his sword all the way round
      const s = settle(u - 0.2, 0.25), crouch = u < 0.3;
      const swing = between(k, k.hitT + 0.5, k.hitT + 0.85) ? ease((u - 0.5) / 0.35) * TAU : 0;
      drawHero(crouch ? frame('death', 2) : frame('idle', G.time * 7), x, y, crouch ? {} : sq(s), restAngle(false) - swing);
    },
  },

  // Vega: high noon. A bell, dust on the wind, a tumbleweed; she drops in spinning and firing, lands among falling
  // brass, twirls the revolver and puts one into the sky.
  GUNNER: {
    life: 3.2, revealAt: 1.25,
    start(k) { k.s.tw = { x: k.x - 180, y: k.y + 26, rot: 0 }; k.s.tr = []; },
    fall(k) { const f = easeIn((k.t - 0.45) / 0.8); return { z: 95 * (1 - f), rot: (k.t - 0.45) * 15 }; },
    update(k, dt) {
      const { x, y } = k, t = k.t;
      if (at(k, 0.05)) A.bell();
      if (at(k, 0.45)) A.meteorFall();
      if (t < 1.8 && Math.random() < dt * 55) part(x - 170, y + rnd(-70, 40), rnd(140, 220), rnd(-8, 8), 1.6, Math.random() < 0.5 ? '#c8a878' : '#8a7050', { drag: 0.2, z: rnd(0, 10) });
      const tw = k.s.tw; tw.x += dt * 150; tw.rot += dt * 10; tw.y += Math.sin(t * 9) * dt * 6;
      for (let i = 0; i < 8; i++) if (at(k, 0.55 + i * 0.085)) {
        const { z, rot } = this.fall(k), a = rot + 0.12, [hx, hy] = handPos(x, y, { z, rot, pivot: [0, -9] });
        const L = weaponLen(), mx = hx + Math.cos(a) * L, my = hy + Math.sin(a) * L, d = rnd(40, 80), gx = x + Math.cos(a) * d, gy = y + Math.sin(a) * d * 0.5;
        k.s.tr.push({ x0: mx, y0: my, x1: gx, y1: gy, t: 0 });
        A.gun(); sparks(gx, gy, -Math.PI / 2, 6, 1.2, P.gold, 140); dust(gx, gy, 4, 40); scorch(gx, gy, 1.5);
        for (let j = 0; j < 5; j++) part(mx, my, Math.cos(a) * rnd(40, 120), Math.sin(a) * rnd(40, 120), 0.08, Math.random() < 0.5 ? P.paper : P.gold, { glow: true, drag: 8 });
      }
      for (const q of k.s.tr) q.t += dt;
      k.s.tr = k.s.tr.filter((q) => q.t < 0.07);
      if (!k.revealed) return;
      const u = t - k.hitT;
      if (at(k, k.hitT + 0.8)) A.click();
      if (at(k, k.hitT + 1.0)) {
        const [hx, hy] = handPos(x, y), a = -Math.PI / 2 - 0.15, L = weaponLen(), mx = hx + Math.cos(a) * L, my = hy + Math.sin(a) * L;
        A.gun(); shake(0.2); addRing(mx, my, P.gold, 170, 0.22, 1);
        k.s.tr.push({ x0: mx, y0: my, x1: mx + Math.cos(a) * 150, y1: my + Math.sin(a) * 150, t: -0.03 });
        for (let j = 0; j < 8; j++) part(mx, my, rnd(-30, 30), -rnd(60, 160), 0.1, Math.random() < 0.5 ? P.paper : P.gold, { glow: true, drag: 8 });
        part(hx, hy, rnd(20, 40), 0, 1.4, P.gold2, { z: 4, vz: rnd(60, 90), g: 300, drag: 1.5 });
      }
      if (u > 1.05 && u < 1.9 && Math.random() < dt * 16) { const [hx, hy] = handPos(x, y), a = this.gun(k), L = weaponLen(); part(hx + Math.cos(a) * L, hy + Math.sin(a) * L, rnd(-4, 4), -rnd(8, 18), rnd(0.6, 1), '#8a8496', { drag: 1 }); }
    },
    // the revolver's angle after landing: a double twirl, up for the sky shot, back down
    gun(k) {
      const u = k.t - k.hitT, rest = restAngle(false), up = -Math.PI / 2 - 0.15;
      if (u < 0.3) return rest;
      if (u < 0.78) return rest + ease((u - 0.3) / 0.48) * TAU * 2;
      if (u < 0.98) return rest + (up - rest) * ease((u - 0.78) / 0.2);
      if (u < 1.5) return up;
      return up + (rest - up) * ease((u - 1.5) / 0.3);
    },
    reveal(k) {
      const { x, y } = k;
      shake(0.65); kick(Math.PI / 2, 4); A.wall(); A.boom(0.9); dust(x, y, 30, 120); addRing(x, y - 2, '#c8a878', 260, 0.4, 2);
      for (let i = 0; i < 14; i++) part(x + rnd(-40, 40), y + rnd(-14, 14), rnd(-10, 10), 0, 2.2, Math.random() < 0.5 ? P.gold : P.gold2, { z: rnd(60, 120), vz: -rnd(0, 30), g: 300, drag: 0.6, keep: true });
    },
    under(k) {
      const t = k.t;
      darken(t < 1.25 ? Math.min(0.25, t * 0.5) : Math.max(0, 0.25 - (t - 1.25)), '#2a1408');
      if (!k.revealed) floorRing(k.x, k.y, 14, P.gold2, 1, 0.5);
    },
    draw(k) {
      const { x, y } = k, t = k.t;
      // the tumbleweed
      const tw = k.s.tw;
      if (tw.x < x + 220) { shadow(tw.x, tw.y, 3); for (let i = 0; i < 7; i++) { const a = tw.rot + (i * TAU) / 7; line(tw.x, tw.y - 4, tw.x + Math.cos(a) * 4, tw.y - 4 + Math.sin(a) * 4, i % 2 ? '#8a6a3a' : '#a8844a'); } }
      for (const q of k.s.tr) if (q.t >= 0) { line(q.x0, q.y0, q.x1, q.y1, P.gold, 2); line(q.x0, q.y0, q.x1, q.y1, P.paper, 1); glow(q.x0, q.y0, P.gold, 9, 0.8); glow(q.x1, q.y1, P.paper, 6, 0.6); }
      if (!k.revealed) {
        glow(x, y, P.gold, 22, 0.12 + t * 0.1);
        if (t >= 0.45) {
          const { z, rot } = this.fall(k);
          shadow(x, y, 2 + (1 - z / 95) * 6);
          drawHero(frame('idle', 0), x, y, { z, rot, pivot: [0, -9], front: true }, rot + 0.12);
        }
        return;
      }
      const u = t - k.hitT, s = settle(u, 0.28);
      drawHero(u < 0.22 ? frame('death', 2) : frame('idle', G.time * 7), x, y, u < 0.22 ? {} : sq(s), this.gun(k));
    },
  },

  // Morrow: a summoning circle draws itself, a pillar of violet light comes down, and he floats down in it
  WIZARD: {
    life: 3.3, revealAt: 1.6,
    start(k) { k.s.runes = Array.from({ length: 8 }, (_, i) => ({ a: (i / 8) * TAU - Math.PI / 2, ch: 'XVYZMWNK'[i] })); },
    update(k, dt) {
      const { x, y } = k, t = k.t;
      if (at(k, 0.05)) A.powerUp(1.6);
      for (let i = 0; i < 8; i++) if (at(k, 0.55 + i * 0.06)) { const r = k.s.runes[i]; A.magic(); sparks(x + Math.cos(r.a) * 34, y + Math.sin(r.a) * 17, -Math.PI / 2, 4, 1, VIOLET, 90); }
      if (!k.revealed) {
        // light pulled in from all round, spiralling
        if (Math.random() < dt * 60) { const a = rnd(TAU), r = rnd(44, 70); part(x + Math.cos(a) * r, y - 6 + Math.sin(a) * r * 0.55, -Math.cos(a) * r * 1.6 - Math.sin(a) * 30, -Math.sin(a) * r * 0.9 + Math.cos(a) * 20, 0.6, Math.random() < 0.5 ? VIOLET : '#62efff', { drag: 1, glow: true, keep: true }); }
        if (t > 1.0 && Math.random() < dt * 14) { const a = rnd(TAU); G.bolts.push({ x0: x + Math.cos(a) * 34, y0: y + Math.sin(a) * 17, x1: x + rnd(-3, 3), y1: y - rnd(10, 40), t: 0, life: 0.12, c1: P.paper, c2: VIOLET, c3: '#5a2a9a' }); }
        if (at(k, 1.0)) { A.zap(); shake(0.3); }
        if (t > 1.0 && Math.random() < dt * 8) shake(0.06);
        return;
      }
      const u = t - k.hitT;
      if (Math.random() < dt * 20) { const a = G.time * 3 + rnd(TAU); part(x + Math.cos(a) * 10, y - 8 + Math.sin(a) * 4, 0, -rnd(6, 16), rnd(0.5, 0.9), Math.random() < 0.5 ? VIOLET : '#62efff', { glow: true, drag: 2 }); }
      if (u < 0.5 && Math.random() < dt * 40) part(x + rnd(-14, 14), y - rnd(20, 90), rnd(-10, 10), rnd(20, 60), 0.5, Math.random() < 0.5 ? VIOLET : P.paper, { glow: true, drag: 1 });
    },
    reveal(k) {
      const { x, y } = k;
      flash(VIOLET, 0.25, true); shake(0.75); A.boom(1.3); A.freeze();
      addRing(x, y - 4, P.paper, 380, 0.35, 3); addRing(x, y - 4, VIOLET, 280, 0.55, 4); addRing(x, y - 4, '#62efff', 180, 0.6, 2);
      for (let i = 0; i < 70; i++) { const a = rnd(TAU), v = rnd(60, 260); part(x, y - 8, Math.cos(a) * v, Math.sin(a) * v * 0.6, rnd(0.3, 0.9), Math.random() < 0.5 ? VIOLET : P.paper, { drag: 3, glow: true, keep: true }); }
      for (const r of k.s.runes) for (let j = 0; j < 5; j++) part(x + Math.cos(r.a) * 34, y + Math.sin(r.a) * 17, Math.cos(r.a) * rnd(40, 120), Math.sin(r.a) * rnd(20, 60), rnd(0.4, 0.8), j % 2 ? VIOLET : P.paper, { vz: rnd(20, 60), drag: 2, glow: true, keep: true });
      scorch(x, y, 12);
    },
    end(k) { for (let i = 0; i < 90; i++) { const a = (i / 90) * TAU; scorch(k.x + Math.cos(a) * 34, k.y + Math.sin(a) * 17, 0.6); } },
    under(k) {
      const { x, y } = k, t = k.t, u = k.revealed ? t - k.hitT : -1, fade = u < 0 ? 1 : Math.max(0, 1 - u / 0.8);
      darken(u < 0 ? Math.min(0.5, t * 0.6) : Math.max(0, 0.5 - u * 0.8), '#0a0418');
      if (fade <= 0) return;
      ctxA(fade, () => {
        const c = Math.floor(G.time * 14) % 2 ? VIOLET : '#d8b8ff';
        floorRing(x, y, 34, c, ease(t / 0.5), 0.5, -Math.PI / 2, 1);
        floorRing(x, y, 24, '#7a52c8', ease((t - 0.2) / 0.5), 0.5, Math.PI / 2, 1);
        // the hexagram: two triangles drawn line by line
        const pts = Array.from({ length: 6 }, (_, i) => { const a = -Math.PI / 2 + (i * TAU) / 6; return [x + Math.cos(a) * 24, y + Math.sin(a) * 12]; });
        [[0, 2], [2, 4], [4, 0], [1, 3], [3, 5], [5, 1]].forEach(([a, b], i) => { const f = clamp((t - 0.5 - i * 0.06) / 0.08, 0, 1); if (f > 0) line(pts[a][0], pts[a][1], pts[a][0] + (pts[b][0] - pts[a][0]) * f, pts[a][1] + (pts[b][1] - pts[a][1]) * f, VIOLET); });
        k.s.runes.forEach((r, i) => { if (t > 0.55 + i * 0.06) text(r.ch, x + Math.cos(r.a) * 34 - 1, y + Math.sin(r.a) * 17 - 2, Math.floor(G.time * 8 + i) % 3 ? '#d8b8ff' : P.paper); });
      });
      glow(x, y, VIOLET, 30, 0.2 * fade + (t > 1 && u < 0 ? 0.25 : 0));
    },
    draw(k) {
      const { x, y } = k, t = k.t, u = k.revealed ? t - k.hitT : -1;
      // the pillar of light: comes down at 1.0, collapses as he lands
      const top = fx.cam.y - 10;
      const w = u < 0 ? (t > 1.0 ? 4 + 22 * ease((t - 1.0) / 0.25) : 0) : Math.max(0, 26 * (1 - u / 0.25));
      if (w > 0) {
        const wv = w + Math.sin(G.time * 40) * 1.5;
        rect(x - wv / 2 - 2, top, wv + 4, y - top, '#5a2a9a'); rect(x - wv / 2, top, wv, y - top, VIOLET); rect(x - wv / 4, top, wv / 2, y - top, P.paper);
        glow(x, y - 10, VIOLET, 28, 0.6);
      }
      // Morrow floats down inside it, washed violet, and hovers once he's down
      if (t > 1.05) {
        const z = u < 0 ? 4 + 80 * (1 - ease((t - 1.05) / 0.55)) : 4 + Math.sin(u * 4) * 1.5;
        shadow(x, y, 4);
        drawHero(frame('idle', G.time * 7), x, y, { z, tint: u < 0 ? (Math.floor(t * 20) % 2 ? '#d8b8ff' : null) : u < 0.1 ? P.paper : null }, restAngle(false));
        if (u >= 0) { const [hx, hy] = handPos(x, y, { z }), a = restAngle(false), L = weaponLen(); glow(hx + Math.cos(a) * L, hy + Math.sin(a) * L, VIOLET, 8, 0.5 + Math.sin(G.time * 6) * 0.15); }
      }
    },
  },

  // Rin: a storm of petals, her afterimages cut through the air, she appears in a burst of sakura smoke, flicks her
  // blade clean, and on the click every cut left hanging in the air bursts at once
  NINJA: {
    life: 3.25, revealAt: 1.0, cardAt: 1.85,
    start(k) {
      const { x, y } = k;
      k.s.cuts = Array.from({ length: 5 }, (_, i) => { const a = -0.9 + i * 0.45 + rnd(-0.15, 0.15), cx = x + rnd(-22, 22), cy = y - 8 + rnd(-14, 10), L = 46; return { x0: cx - Math.cos(a) * L, y0: cy - Math.sin(a) * L * 0.6, x1: cx + Math.cos(a) * L, y1: cy + Math.sin(a) * L * 0.6, t: 0.62 + i * 0.065 }; });
      k.s.dash = [0.1, 0.27, 0.44].map((t0, i) => ({ t0, y: y - 30 + i * 26, dir: i % 2 ? -1 : 1 }));
      k.s.puffs = [];
    },
    update(k, dt) {
      const { x, y } = k, t = k.t;
      if (t < 2.2 && Math.random() < dt * (t < 1 ? 120 : 30)) part(x - 170 + rnd(-10, 10), y + rnd(-80, 50), rnd(160, 260), rnd(-20, 30), 1.8, PETAL[Math.floor(rnd(3))], { drag: 0.4, z: rnd(0, 20), keep: true });
      for (const d of k.s.dash) if (at(k, d.t0)) { A.dash(); A.shuriken(); }
      for (const c of k.s.cuts) if (at(k, c.t)) { A.slice(); sparks((c.x0 + c.x1) / 2, (c.y0 + c.y1) / 2, Math.atan2(c.y1 - c.y0, c.x1 - c.x0), 6, 0.3, '#ffb7d5', 200); }
      stepPuffs(k.s.puffs, dt);
      if (at(k, 1.85)) {
        A.click(); A.riftCut(); shake(0.55); flash('#ffb7d5', 0.15, true);
        for (const c of k.s.cuts) {
          for (let j = 0; j <= 10; j++) { const f = j / 10, px0 = c.x0 + (c.x1 - c.x0) * f, py0 = c.y0 + (c.y1 - c.y0) * f; for (let n = 0; n < 2; n++) part(px0, py0, rnd(-90, 90), rnd(-70, 40), rnd(0.5, 1.1), n ? PETAL[j % 3] : P.paper, { drag: 2.5, glow: !n, keep: true }); }
          addRing((c.x0 + c.x1) / 2, (c.y0 + c.y1) / 2, '#ffb7d5', 160, 0.25, 1);
        }
      }
      if (k.revealed && Math.random() < dt * 10) part(x + rnd(-40, 40), y - rnd(40, 70), rnd(-20, 20), rnd(15, 35), 2, PETAL[Math.floor(rnd(3))], { drag: 0.5 });
    },
    reveal(k) {
      const { x, y } = k;
      A.smoke(); A.perfect(); flash('#ffb7d5', 0.12, false); shake(0.35);
      puff(k.s.puffs, x, y - 8, 22, ['#ffb7d5', '#ffd0e4', '#ff8fb8', '#ffffff'], 5, 16, 40);
      addRing(x, y - 4, '#ffb7d5', 240, 0.4, 2);
      for (let i = 0; i < 30; i++) { const a = rnd(TAU), v = rnd(40, 140); part(x, y - 8, Math.cos(a) * v, Math.sin(a) * v * 0.6, rnd(0.6, 1.2), PETAL[i % 3], { drag: 2, keep: true }); }
    },
    // the blade: held low behind her in the iai stance, then flicked round and down to rest on the click
    blade(k) { const t = k.t, rest = restAngle(false), back = Math.PI * 0.86; if (t < 1.55) return back; if (t < 1.85) return back + (rest + TAU - back) * ease((t - 1.55) / 0.3); return rest; },
    under(k) { const t = k.t; darken(t < 1.85 ? Math.min(0.35, t * 0.6) : Math.max(0, 0.35 - (t - 1.85) * 1.2), '#14040c'); },
    draw(k) {
      const { x, y } = k, t = k.t;
      for (const d of k.s.dash) {
        const v = (t - d.t0) / 0.22;
        if (v < 0 || v > 1) continue;
        const gx = x + d.dir * (-190 + 380 * v);
        line(gx - d.dir * 60, d.y, gx, d.y, '#ff8fb8', 2); line(gx - d.dir * 30, d.y, gx, d.y, P.paper, 1);
        drawBody(frame('run', t * 20), gx, d.y + 9, { flip: d.dir < 0, tint: '#ffb7d5', alpha: 0.6 });
      }
      for (const c of k.s.cuts) {
        if (t < c.t || t >= 1.85) continue;
        const v = t - c.t;
        if (v < 0.08) { line(c.x0, c.y0, c.x1, c.y1, P.paper, 3); glow((c.x0 + c.x1) / 2, (c.y0 + c.y1) / 2, '#ffb7d5', 14, 0.6); }
        else line(c.x0, c.y0, c.x1, c.y1, Math.floor(G.time * 20) % 3 ? '#ff8fb8' : P.paper, 1);
      }
      if (k.revealed) {
        const u = t - k.hitT, s = settle(u - 0.85, 0.18);
        drawHero(u < 0.55 ? frame('death', 2) : frame('idle', G.time * 7), x, y, u < 0.55 ? {} : sq(s), this.blade(k));
        if (t < 1.85) { const [hx, hy] = handPos(x, y), a = this.blade(k), L = weaponLen(); glow(hx + Math.cos(a) * L, hy + Math.sin(a) * L, '#ffb7d5', 6, 0.5); }
      }
      drawPuffs(k.s.puffs);
    },
  },

  // Rivet: a drop pod slams down, vents steam and blows open in golden smoke; she steps out and slams her wrench
  MECHANIC: {
    life: 3.3, revealAt: 0.95, cardAt: 1.55,
    start(k) { k.s.puffs = []; k.s.panels = []; },
    podZ(k) { return k.t < 0.35 ? 150 : 150 * (1 - easeIn((k.t - 0.35) / 0.6)); },
    update(k, dt) {
      const { x, y } = k, t = k.t;
      for (const b of [0.05, 0.17, 0.29]) if (at(k, b)) A.beep(1400);
      if (at(k, 0.38)) A.rocket();
      if (!k.revealed && t > 0.35) { const z = this.podZ(k); for (let i = 0; i < 3; i++) part(x + rnd(-4, 4), y, rnd(-20, 20), rnd(-4, 4), rnd(0.15, 0.35), [P.ember, P.ember2, P.paper][i], { z: z - 2, vz: rnd(60, 120), drag: 3, glow: true, keep: true }); if (Math.random() < dt * 30) part(x + rnd(-6, 6), y, rnd(-10, 10), 0, rnd(0.8, 1.4), '#4a4450', { z: z + 10, vz: rnd(10, 30), drag: 1.2 }); }
      if (k.revealed && t < 1.5) {
        if (Math.random() < dt * 40) for (const side of [-1, 1]) part(x + side * 10, y - 2, side * rnd(80, 160), rnd(-6, 6), rnd(0.3, 0.6), Math.random() < 0.6 ? '#e8eef6' : '#a8b4c4', { z: rnd(2, 6), vz: rnd(0, 30), drag: 3 });
        if (at(k, 1.05) || at(k, 1.3)) A.smoke();
        if (Math.random() < dt * 10) sparks(x + rnd(-8, 8), y - rnd(4, 22), rnd(TAU), 3, 1, P.gold, 110);
      }
      if (at(k, 1.5)) {
        A.build(); A.boom(1.1); shake(0.6); flash(P.gold, 0.15, true);
        puff(k.s.puffs, x, y - 10, 26, ['#ffd447', '#ffb347', '#fff1c4', '#ff8a2a'], 5, 18, 50);
        for (let i = 0; i < 4; i++) { const a = -Math.PI / 2 + (i - 1.5) * 0.9; k.s.panels.push({ x: x + Math.cos(a) * 6, y, z: 14, vx: Math.cos(a) * rnd(90, 140), vz: rnd(120, 200), rot: 0, vr: rnd(-14, 14), w: 8, h: 11 }); }
        for (let i = 0; i < 16; i++) { const a = rnd(TAU), v = rnd(60, 180); part(x, y, Math.cos(a) * v, Math.sin(a) * v * 0.6, rnd(0.8, 1.4), Math.random() < 0.5 ? P.gold : '#8b98ab', { z: 10, vz: rnd(60, 160), g: 360, drag: 1.4, s: 2, keep: true }); }
        addRing(x, y - 2, P.gold, 300, 0.4, 3); addRing(x, y - 2, P.paper, 220, 0.3, 1);
      }
      for (const q of k.s.panels) { q.vz -= 420 * dt; q.z += q.vz * dt; q.x += q.vx * dt; q.rot += q.vr * dt; if (q.z < 0) { q.z = 0; if (q.vz < -60) { q.vz *= -0.3; q.vx *= 0.5; q.vr *= 0.5; A.wall(); } else { q.vz = 0; q.vx *= 0.8; q.vr = 0; } } }
      stepPuffs(k.s.puffs, dt);
      if (at(k, 2.08)) {
        const [hx, hy] = handPos(x, y), a = Math.PI / 2 - 0.15, L = weaponLen(), tx = hx + Math.cos(a) * L, ty = y + 2;
        A.wall(); A.boom(0.7); shake(0.35); sparks(tx, ty, -Math.PI / 2, 18, 1.3, P.gold, 200); addRing(tx, ty, P.gold, 200, 0.3, 2); dust(tx, ty, 10, 70); scorch(tx, ty, 4);
      }
    },
    wrench(k) { const t = k.t, rest = restAngle(false), up = -Math.PI / 2 - 0.5, down = Math.PI / 2 - 0.15; if (t < 1.85) return rest; if (t < 2.03) return rest + (up - rest) * ease((t - 1.85) / 0.18); if (t < 2.08) return up + (down - up) * ((t - 2.03) / 0.05); if (t < 2.4) return down; return down + (rest - down) * ease((t - 2.4) / 0.25); },
    reveal(k) {
      const { x, y } = k;
      shake(0.95); kick(Math.PI / 2, 5); A.boom(1.6); A.wall(); flash(P.paper, 0.12, false);
      dust(x, y, 44, 160); rubble(x, y, 18); scorch(x, y, 16);
      addRing(x, y - 2, P.paper, 360, 0.3, 3); addRing(x, y - 2, '#ff8a3c', 240, 0.5, 2);
    },
    under(k) {
      const { x, y } = k, t = k.t;
      if (!k.revealed) {
        darken(Math.min(0.3, t * 0.5));
        const r = 12 + Math.sin(t * 8) * 1.5, c = Math.floor(t * 10) % 2 ? '#ff8a3c' : P.paper;
        floorRing(x, y, r, c, 1, 0.5);
        for (let i = 0; i < 4; i++) { const a = t * 3 + (i * Math.PI) / 2; line(x + Math.cos(a) * (r + 2), y + Math.sin(a) * (r + 2) * 0.5, x + Math.cos(a) * (r + 6), y + Math.sin(a) * (r + 6) * 0.5, c); }
        return;
      }
      const u = t - 1.5;
      if (u >= 0 && u < 1.2) { floorRing(x, y, 16, P.gold, 1, 0.5); for (let i = 0; i < 12; i++) { const a = u * 4 + (i * TAU) / 12; rect(x + Math.cos(a) * 17 - 1, y + Math.sin(a) * 8.5 - 1, 2, 2, i % 2 ? P.gold : '#ffb347'); } }
    },
    pod(x, y, z, open) {
      const top = y - 27 - z, jit = open ? (Math.floor(G.time * 40) % 2 ? 1 : 0) : 0, X = x + jit;
      rect(X - 10, top - 1, 20, 30, '#1c1822'); rect(X - 8, top - 6, 16, 6, '#1c1822');
      rect(X - 9, top, 18, 28, '#4a5262'); rect(X - 9, top, 3, 28, '#6a7488'); rect(X + 6, top, 3, 28, '#323846');
      rect(X - 7, top - 3, 14, 3, '#5a6478'); rect(X - 5, top - 5, 10, 2, '#6a7488');
      rect(X - 9, top + 6, 18, 2, '#ff8a2a'); rect(X - 9, top + 20, 18, 2, '#ff8a2a');
      rect(X - 4, top + 10, 8, 6, '#14161c'); px(X - 3, top + 11, '#62efff'); px(X - 2, top + 11, '#62efff');
      rect(X - 12, top + 23, 3, 6, '#2a2e38'); rect(X + 9, top + 23, 3, 6, '#2a2e38');
      if (Math.floor(G.time * 6) % 2) px(X, top - 4, P.blood);
    },
    draw(k) {
      const { x, y } = k, t = k.t;
      if (!k.revealed) {
        if (t > 0.35) { const z = this.podZ(k); shadow(x, y, 3 + (1 - z / 150) * 7); this.pod(x, y, z, false); const fl = Math.floor(G.time * 30) % 2; rect(x - 3, y - z + 2, 6, 6 + fl * 3, P.ember); rect(x - 1, y - z + 2, 2, 8 + fl * 4, P.ember3); glow(x, y - z + 6, P.ember, 12, 0.7); }
        return;
      }
      if (t < 1.5) { shadow(x, y, 9); this.pod(x, y, 0, t > 1.2); glow(x, y - 12, P.gold, 10, 0.15 + (t - 0.95) * 0.4); }
      for (const q of k.s.panels) {
        ctx2(q.x, q.y - q.z, q.rot, () => { rect(-q.w / 2 - 1, -q.h / 2 - 1, q.w + 2, q.h + 2, '#1c1822'); rect(-q.w / 2, -q.h / 2, q.w, q.h, '#4a5262'); rect(-q.w / 2, -q.h / 2 + 3, q.w, 2, '#ff8a2a'); });
      }
      if (t >= 1.5) {
        const u = t - 1.5;
        if (u < 1.2) glow(x, y, P.gold, 20, 0.35 * (1 - u / 1.2));
        const s = settle(u - 0.05, 0.2);
        drawHero(frame('idle', G.time * 7), x, y, { ...sq(s), tint: u < 0.12 ? '#ffd447' : null }, this.wrench(k));
      }
      drawPuffs(k.s.puffs);
    },
  },

  // Grom: the ground shakes, he falls out of the sky hammer first, and the floor splits into rock spikes
  TANK: {
    life: 3.1, revealAt: 1.1,
    start(k) { k.s.cr = makeCracks(k.x, k.y, 12, 72); k.s.spk = Array.from({ length: 8 }, (_, i) => ({ a: (i / 8) * TAU + rnd(-0.2, 0.2), r: rnd(22, 34), h: rnd(9, 16), w: rnd(4, 6), d: rnd(0, 0.1) })); },
    fallZ(k) { return 230 * (1 - easeIn((k.t - 0.6) / 0.5)); },
    update(k, dt) {
      const { x, y } = k, t = k.t;
      if (!k.revealed) {
        if (Math.floor(t / 0.18) !== Math.floor(k.prev / 0.18)) { A.wall(); shake(0.08 + t * 0.12); }
        if (Math.random() < dt * 30) part(x + rnd(-70, 70), y + rnd(-40, 40), 0, 0, rnd(0.3, 0.5), STONE[Math.floor(rnd(3))], { vz: rnd(30, 70), g: 400, drag: 0, s: 1 });
        if (Math.random() < dt * 25) part(x + rnd(-90, 90), y + rnd(-50, 40), rnd(-4, 4), 0, 1.2, Math.random() < 0.5 ? '#8a7a6a' : STONE[2], { z: rnd(80, 120), vz: -rnd(10, 30), g: 200, drag: 0.5 });
        if (at(k, 0.6)) A.meteorFall();
        return;
      }
      const u = t - k.hitT;
      if (at(k, k.hitT + 0.15)) { shake(0.6); A.boom(1.2); }
      for (const sp of k.s.spk) if (at(k, k.hitT + 0.95 + sp.d)) { rubble(x + Math.cos(sp.a) * sp.r, y + Math.sin(sp.a) * sp.r * 0.55, 6, 0.5); A.wall(); }
      if (at(k, k.hitT + 0.6)) A.heavySwing();
      if (u < 1.6 && Math.random() < dt * 20) part(x + rnd(-50, 50), y + rnd(-25, 25), rnd(-10, 10), 0, rnd(0.6, 1), '#8a7a6a', { vz: rnd(10, 30), drag: 2 });
    },
    reveal(k) {
      const { x, y } = k;
      shake(1); kick(Math.PI / 2, 8); flash(P.paper, 0.22, true); A.boom(2.4); A.wall();
      addRing(x, y - 2, P.paper, 460, 0.35, 4); addRing(x, y - 2, '#ff8a2a', 320, 0.55, 3); addRing(x, y - 2, P.stone2, 200, 0.7, 2);
      addRing(x, y, P.stone2, 300, 0.9, 4); addRing(x, y, P.gold2, 180, 1.0, 2);
      dust(x, y, 60, 200); rubble(x, y, 34, 1.2); scorch(x, y, 26);
    },
    end(k) { stampCracks(k.s.cr); },
    hammer(k) { const u = k.t - k.hitT, down = 1.25, shoulder = -2.45; if (u < 0.6) return down; if (u < 0.85) return down + (shoulder - down) * ease((u - 0.6) / 0.25); return shoulder + Math.sin(u * 3) * 0.04; },
    under(k) {
      if (!k.revealed) { darken(Math.min(0.3, k.t * 0.5)); return; }
      const u = k.t - k.hitT;
      drawCracks(k.s.cr, u / 0.2, '#ff8a2a', 1 - u / 2);
    },
    draw(k) {
      const { x, y } = k, t = k.t;
      if (!k.revealed) {
        if (t > 0.6) {
          const z = this.fallZ(k);
          shadow(x, y, 3 + (1 - z / 230) * 9);
          for (let i = 0; i < 5; i++) line(x - 10 + i * 5, y - z - 40 - i * 7, x - 10 + i * 5, y - z - 20 - i * 3, P.paper);
          drawHero(frame('idle', 0), x, y, { z, sx: 0.92, sy: 1.12, front: true }, -Math.PI / 2 - 0.25);
        } else {
          const r = 4 + t * 16;
          shadow(x, y, r / 2);
          floorRing(x, y, r, Math.floor(t * 10) % 2 ? P.stone2 : '#8a8296', 1, 0.5);
        }
        return;
      }
      const u = t - k.hitT;
      for (const sp of k.s.spk) {
        const v = u - sp.d;
        if (v < 0 || v > 1.0) continue;
        const h = sp.h * ease(v / 0.12), bx = x + Math.cos(sp.a) * sp.r, by = y + Math.sin(sp.a) * sp.r * 0.55;
        for (let r = 0; r < h; r++) { const w = Math.max(1, Math.round(sp.w * (1 - r / h))); rect(bx - w, by - r, w * 2, 1, r % 4 ? '#5a5266' : '#3d3848'); px(bx - w, by - r, '#8a8296'); }
        px(bx, by - h, P.paper);
      }
      const crouch = u < 0.5, s = settle(u - 0.5, 0.2);
      drawHero(crouch ? frame('death', 2) : frame('idle', G.time * 7), x, y, crouch ? {} : sq(s), this.hammer(k));
    },
  },

  // Unit-7: a countdown, an orbital beam, and the robot builds itself up row by row in the light, then powers on
  ROBOT: {
    life: 3.4, revealAt: 1.25, cardAt: 2.05,
    update(k, dt) {
      const { x, y } = k, t = k.t, msg = 'DEPLOYING UNIT-7';
      if (t < 0.6 && Math.floor(t * 28) !== Math.floor(k.prev * 28) && Math.floor(t * 28) <= msg.length) A.click();
      for (const [ct, f] of [[0.6, 900], [0.8, 1100], [1.0, 1500]]) if (at(k, ct)) A.beep(f);
      if (at(k, 1.0)) A.powerUp(0.3);
      if (k.revealed) {
        const u = t - k.hitT;
        if (u < 0.6 && Math.random() < dt * 50) part(x + rnd(-8, 8), y - rnd(0, 40), 0, -rnd(30, 90), 0.3, Math.random() < 0.5 ? P.volt : P.paper, { glow: true, keep: true });
        if (at(k, 1.95)) { A.shieldUp(); }
        if (at(k, 2.05)) { A.build(); for (const side of [-1, 1]) for (let i = 0; i < 10; i++) part(x + side * 5, y - 10, side * rnd(40, 90), rnd(-10, 10), rnd(0.3, 0.6), '#e8eef6', { z: 0, vz: rnd(10, 40), drag: 3 }); }
      }
    },
    reveal(k) {
      const { x, y } = k;
      flash(P.volt, 0.14, true); shake(0.85); kick(Math.PI / 2, 5); A.boom(1.5); A.zap();
      addRing(x, y - 2, P.paper, 380, 0.3, 3); addRing(x, y - 2, P.volt, 260, 0.5, 3);
      sparks(x, y - 4, -Math.PI / 2, 30, 1.5, P.volt, 240); scorch(x, y, 16); dust(x, y, 30, 140);
    },
    cannon(k) { const t = k.t, rest = restAngle(false), down = Math.PI / 2 - 0.1; if (t < 2.05) return down; return down + (rest - down) * ease((t - 2.05) / 0.2); },
    under(k) {
      const { x, y } = k, t = k.t;
      if (k.revealed) return;
      darken(Math.min(0.4, t * 0.7), '#020814');
      const top = fx.cam.y, sy = top + ((t * 160) % 200) - 10;
      rect(fx.cam.x, sy, W, 1, P.blood); rect(fx.cam.x, sy - 30, W, 1, '#6a0a14');
      for (let gx = -4; gx <= 4; gx++) for (let gy = -2; gy <= 2; gy++) px(x + gx * 14, y + gy * 9, Math.floor(G.time * 6 + gx + gy) % 3 ? '#4a0a14' : P.blood);
      const r = Math.max(4, 30 - t * 24);
      floorRing(x, y, r, Math.floor(t * 12) % 2 ? P.blood : P.paper, 1, 0.5);
      line(x - r - 6, y, x - r + 2, y, P.blood); line(x + r - 2, y, x + r + 6, y, P.blood);
    },
    draw(k) {
      const { x, y } = k, t = k.t;
      if (!k.revealed) {
        const msg = 'DEPLOYING UNIT-7', n = Math.min(msg.length, Math.floor(t * 28));
        textO(msg.slice(0, n), x, y - 46, P.volt, 1, 'c');
        const cd = t < 0.6 ? null : t < 0.8 ? '3' : t < 1.0 ? '2' : '1';
        if (cd) textO(cd, x, y - 36, P.blood, 3, 'c');
        if (t > 1.0) { const top2 = fx.cam.y - 10; if (Math.floor(G.time * 30) % 2) rect(x, top2, 1, y - top2, P.volt); glow(x, y, P.volt, 10, 0.5); }
        return;
      }
      const u = t - k.hitT, top = fx.cam.y - 10, w = u < 0.12 ? 18 : Math.max(0, 9 * (1 - (u - 0.12) / 0.6));
      if (w > 0) { const wv = w + Math.sin(G.time * 40) * 2; rect(x - wv / 2 - 2, top, wv + 4, y - top, P.volt2); rect(x - wv / 2, top, wv, y - top, P.volt); rect(x - wv / 4, top, wv / 2, y - top, P.paper); glow(x, y - 6, P.volt, 24, 0.6); }
      const q = ease((u - 0.05) / 0.55), fr = frame('idle', G.time * 7);
      if (q < 1) {
        // the robot built up row by row from its feet, the newest rows jittering and white-hot
        const top = (heroSet().rig?.top ?? 40) / 3, rows = (fr.h - top) * q;
        drawBody(fr, x, y, { top: fr.h - rows + 1 });
        drawBody(fr, x + (Math.random() < 0.5 ? rnd(-2, 2) : 0), y, { top: fr.h - rows - 1, bottom: fr.h - rows + 2, tint: P.paper });
      } else {
        drawHero(fr, x, y, sq(settle(u - 0.6, 0.12)), this.cannon(k));
        if (between(k, 1.95, 2.25)) { const [ex, ey] = eyePos(x, y), f = 1 - (t - 1.95) / 0.3; glow(ex, ey, P.blood, 10 * f + 2, 0.9 * f); line(ex - 10 * f, ey, ex + 10 * f, ey, P.paper); }
        if (t > 1.95 && t < 2.6) textO('SYSTEMS ONLINE', x, y - 40, Math.floor(G.time * 10) % 2 ? P.volt : P.paper, 1, 'c');
      }
    },
  },

  // The Dev: a terminal compiles him, the window shuts off like an old screen, and he renders in from coarse blocks
  DEV: {
    life: 3.4, revealAt: 1.5,
    start(k) { k.s.rain = Array.from({ length: 16 }, () => ({ x: k.x + rnd(-70, 70), y: k.y - rnd(20, 120), v: rnd(50, 110), c: Math.random() < 0.8 ? GREEN : PINK })); },
    update(k, dt) {
      const { x, y } = k, t = k.t, n = Math.floor(t * 30);
      if (t < 1.4 && Math.random() < dt * 12) glitch(x + rnd(-60, 60), y - 10 + rnd(-40, 30), 18, 6, 0.15, 5);
      if (t < 1.05 && n !== Math.floor(k.prev * 30)) A.click();
      if (at(k, 1.1)) A.select();
      if (at(k, 1.4)) A.zip();
      for (const r of k.s.rain) { r.y += r.v * dt; if (r.y > k.y + 20) r.y -= 140; }
    },
    reveal(k) {
      const { x, y } = k;
      A.zap(); flash(GREEN, 0.15, false); shake(0.45);
      addRing(x, y - 4, GREEN, 300, 0.45, 3); addRing(x, y - 4, PINK, 200, 0.35, 2);
      glitch(x, y - 8, 34, 28, 0.45, 24);
    },
    under(k) {
      const { x, y } = k, t = k.t;
      if (t < 1.5) { darken(Math.min(0.45, t * 0.8), '#020a04'); return; }
      const u = t - 1.5;
      if (u < 0.5) ctxA(0.6 * (1 - u / 0.5), () => { for (let i = -5; i <= 5; i++) { line(x + i * 8, y - 22, x + i * 8, y + 22, '#0f5a22'); line(x - 44, y + i * 4, x + 44, y + i * 4, '#0f5a22'); } });
    },
    draw(k) {
      const { x, y } = k, t = k.t;
      if (t < 1.5) {
        for (const r of k.s.rain) for (let i = 0; i < 5; i++) text(Math.floor(r.y / 6 + i) % 2 ? '1' : '0', r.x, r.y - i * 6, i ? '#1a6a2a' : r.c);
      }
      // the terminal window
      if (t < 1.5) {
        const bx = x - 46, by = y - 62, bw = 92, bh = 34, sh = t < 1.4 ? 1 : 1 - (t - 1.4) / 0.1;
        const hh = Math.max(1, Math.round(bh * sh)), yy = by + (bh - hh) / 2, ww = t < 1.45 ? bw : Math.max(2, bw * (1 - (t - 1.45) / 0.05));
        rect(x - ww / 2 - 1, yy - 1, ww + 2, hh + 2, GREEN); rect(x - ww / 2, yy, ww, hh, '#020a04');
        if (sh >= 1) {
          const l1 = '> SUDO ./ROOT', c1 = Math.min(l1.length, Math.floor(t * 30));
          text(l1.slice(0, c1) + (Math.floor(G.time * 4) % 2 && c1 < l1.length ? '_' : ''), bx + 4, by + 4, GREEN);
          if (t > 0.45) {
            const f = clamp((t - 0.45) / 0.6, 0, 1);
            text('COMPILING', bx + 4, by + 13, GREEN);
            rect(bx + 42, by + 13, 46, 5, '#0a3a14'); rect(bx + 42, by + 13, Math.round(46 * f), 5, GREEN);
            text(Math.round(f * 100) + '%', bx + 64, by + 13, f > 0.6 ? '#020a04' : P.paper, 1, 'c');
          }
          if (t > 1.1) text('ACCESS GRANTED', bx + 4, by + 23, Math.floor(G.time * 12) % 2 ? GREEN : P.paper);
        }
        return;
      }
      const u = t - 1.5;
      const fr = frame('idle', G.time * 7), steps = [8, 6, 4, 2];
      if (u < 0.45) {
        const b = steps[Math.min(3, Math.floor(u / 0.11))];
        drawCoarse(fr, x, y, b, { tint: PINK, dx: -2, alpha: 0.5 }); drawCoarse(fr, x, y, b, { tint: GREEN, dx: 2, alpha: 0.5 }); drawCoarse(fr, x, y, b);
      } else {
        if (u < 0.6) { drawBody(fr, x - 1, y, { tint: PINK, alpha: 0.4 }); drawBody(fr, x + 1, y, { tint: GREEN, alpha: 0.4 }); }
        drawHero(fr, x, y, sq(settle(u - 0.45, 0.12)), null);
      }
    },
  },
};

// small canvas helpers: draw rotated about a point, draw at an alpha
function ctx2(x, y, rot, fn) { ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(rot); fn(); ctx.restore(); }
function ctxA(a, fn) { ctx.save(); ctx.globalAlpha *= clamp(a, 0, 1); fn(); ctx.restore(); }
