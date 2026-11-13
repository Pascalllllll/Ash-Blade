import { ctx, canvas, W, H, P, rect, px, line, disc, ring, drawSprite, glow, text, textO } from './gfx.js';
import { SPR } from './sprites.js';
import { A } from './audio.js';
import { input } from './input.js';
import { best } from './store.js';
import {
  G, fx, B, TAU, rnd, clamp, hyp, alive, segDist, part, sparks, dust, addText, addRing, ghost, damage, pd, shoot,
  explode, chainLightning, hitstop, slowmo, shake, flash, beamLen, scorch, sprFor, aimAssist, glitch, addCombo,
} from './world.js';

// ---------- helpers ----------
function aimPoint(p, max) {
  let x, y;
  if (input.device === 'mouse') { x = input.mouse.x + fx.cam.x; y = input.mouse.y + fx.cam.y; }
  else { aimAssist(); x = p.x + Math.cos(p.aim) * max; y = p.y + Math.sin(p.aim) * max; }
  const d = hyp(x - p.x, y - p.y);
  if (d > max) { x = p.x + ((x - p.x) / d) * max; y = p.y + ((y - p.y) / d) * max; }
  return [clamp(x, B.x0 + 6, B.x1 - 6), clamp(y, B.y0 + 6, B.y1 - 4)];
}
const hand = (p, flip) => [p.x + (flip ? -3 : 3), p.y - 6];
const nearest = (x, y, range, skip) => {
  let best = null, bd = range;
  for (const e of G.E) { if (!alive(e) || (skip && skip.has(e))) continue; const d = hyp(e.x - x, e.y - y); if (d < bd) { bd = d; best = e; } }
  return best;
};
function banner(text, c) { G.banner = { text, sub: '', t: 0, life: 1.3, c }; }
function muzzle(x, y, a, c, n = 5) { for (let i = 0; i < n; i++) { const s = a + rnd(-0.4, 0.4), v = rnd(60, 180); part(x, y, Math.cos(s) * v, Math.sin(s) * v, rnd(0.05, 0.12), Math.random() < 0.5 ? P.paper : c, { drag: 10, glow: true, keep: true }); } }

// ---------- entrances: a short cinematic when a run starts ----------
function entrance(kind) {
  const p = G.p, k = { t: 0, life: kind === 'robot' ? 1.6 : 1.4, done: false, hit: false };
  p.state = 'cine';
  const spr = () => SPR.chars[G.char].idle;
  const land = (big) => {
    k.hit = true;
    shake(big ? 1 : 0.55); hitstop(0.08); A.boom(big ? 1.8 : 1);
    dust(p.x, p.y, big ? 40 : 20, big ? 150 : 90);
    addRing(p.x, p.y - 2, P.paper, big ? 340 : 240, 0.35, 2);
    addRing(p.x, p.y - 2, G.kit.color(), big ? 260 : 180, 0.45, 2);
    scorch(p.x, p.y, big ? 18 : 10);
  };
  k.update = (dt) => {
    k.t += dt;
    const t = k.t;
    if (kind === 'drop' || kind === 'meteor') {
      const fall = kind === 'meteor' ? 0.75 : 0.5;
      if (t < fall && Math.random() < 0.8) part(p.x + rnd(-3, 3), p.y - 160 * (1 - t / fall) - 8, rnd(-20, 20), -rnd(20, 60), 0.4, kind === 'meteor' ? P.ember : G.kit.color(), { glow: true, keep: true });
      if (t >= fall && !k.hit) {
        land(kind === 'meteor');
        if (kind === 'drop') G.slashes.push({ follow: false, x: p.x, y: p.y, a: 0, r: 34, arc: 6.2, dir: 1, t: 0, life: 0.3, th: 10, col: 'ember' });
        if (kind === 'meteor') G.quakes.push({ x: p.x, y: p.y, r: 0, delay: 0, max: 110, friendly: true, hit: new Set(), dmg: 0, speed: 220 });
      }
    } else if (kind === 'slide') {
      if (t > 0.6 && !k.hit) { k.hit = true; }
      if (t > 0.6 && Math.floor((t - 0.6) / 0.15) !== Math.floor((t - 0.6 - dt) / 0.15) && t < 1.1) { A.gun(); muzzle(p.x + 3, p.y - 16, -Math.PI / 2, P.gold, 8); shake(0.08); }
      if (t < 0.6 && Math.random() < 0.7) dust(p.x - 160 * (1 - t / 0.6), p.y, 1, 40);
    } else if (kind === 'portal') {
      if (t < 0.8 && Math.random() < 0.6) G.bolts.push({ x0: p.x + rnd(-24, 24), y0: p.y - 6 + rnd(-14, 14), x1: p.x, y1: p.y - 6, t: 0, life: 0.15 });
      if (t >= 0.8 && !k.hit) { k.hit = true; flash('#b48cff', 0.15, false); addRing(p.x, p.y - 6, '#b48cff', 260, 0.4, 2); A.magic(); A.freeze(); shake(0.3); }
    } else if (kind === 'smoke') {
      if (!k.s && t > 0.1) { k.s = 1; A.shuriken(); }
      if (t >= 0.7 && !k.hit) { k.hit = true; G.zones.push({ type: 'smoke', x: p.x, y: p.y, r: 22, t: 0, life: 0.9 }); A.smoke(); dust(p.x, p.y, 20, 80); }
    } else if (kind === 'crate') {
      if (t >= 0.45 && !k.c) { k.c = 1; shake(0.5); A.wall(); dust(p.x, p.y, 16, 80); }
      if (t >= 0.9 && !k.hit) {
        k.hit = true; A.build(); A.boom(0.8); shake(0.4);
        for (let i = 0; i < 20; i++) { const a = rnd(TAU), v = rnd(60, 200); part(p.x, p.y - 8, Math.cos(a) * v, Math.sin(a) * v, rnd(0.4, 0.8), Math.random() < 0.5 ? '#7a5030' : '#a8743a', { z: 6, vz: rnd(40, 120), g: 300, drag: 2, s: 2, keep: true }); }
      }
    } else if (kind === 'robot') {
      if (Math.random() < 0.9) part(p.x + rnd(-6, 6), p.y - rnd(0, 40), 0, -rnd(30, 80), 0.3, P.volt, { glow: true, keep: true });
      if (t >= 1.1 && !k.hit) { k.hit = true; flash(P.volt, 0.15, false); addRing(p.x, p.y - 6, P.volt, 220, 0.4, 2); A.shieldUp(); shake(0.3); }
      if (Math.floor(t / 0.3) !== Math.floor((t - dt) / 0.3) && t < 1.1) A.zip();
    }
    if (k.t >= k.life) { G.cine = null; p.state = 'move'; p.inv = 0.5; }
  };
  k.draw = () => {
    const t = k.t, s = spr(), x = p.x - s.w / 2, y = p.y - s.h + 1;
    if (kind === 'drop' || kind === 'meteor') {
      const fall = kind === 'meteor' ? 0.75 : 0.5, z = t < fall ? 160 * Math.pow(1 - t / fall, 1.5) : 0;
      ring(p.x, p.y, Math.max(2, 10 - z / 20), 1, P.blood);
      drawSprite(s, x, y - z, false, t < fall ? (kind === 'meteor' ? P.ember : P.paper) : null);
      if (kind === 'meteor' && t < fall) glow(p.x, p.y - z - 6, P.ember, 14, 0.7);
      if (t >= fall) G.kit.drawWeapon(p, false);
    } else if (kind === 'slide') {
      const k2 = Math.min(1, t / 0.6), off = 160 * Math.pow(1 - k2, 2);
      drawSprite(s, x - off, y, false, null);
      if (t > 0.6) { line(p.x + 3, p.y - 7, p.x + 3, p.y - 14, P.dust, 2); }
    } else if (kind === 'portal') {
      const r = Math.min(1, t / 0.5) * 16;
      ring(p.x, p.y - 2, r, 1, '#b48cff'); ring(p.x, p.y - 2, r * 0.6, 1, '#7a52c8');
      for (let i = 0; i < 6; i++) { const a = t * 4 + (i * TAU) / 6; px(p.x + Math.cos(a) * r, p.y - 2 + Math.sin(a) * r * 0.5, P.paper); }
      glow(p.x, p.y - 6, '#b48cff', 18, 0.4);
      if (t > 0.5) {
        const q = Math.min(1, (t - 0.5) / 0.3);
        ctx.save(); ctx.beginPath(); ctx.rect(x - 2, y + s.h * (1 - q), s.w + 4, s.h * q + 1); ctx.clip();
        drawSprite(s, x, y, false, q < 1 ? '#b48cff' : null); ctx.restore();
      }
    } else if (kind === 'smoke') {
      for (let i = 0; i < 3; i++) { const a = (i * TAU) / 3 + 0.5, d = 14; if (t > 0.1 + i * 0.12) { line(p.x + Math.cos(a) * d - 2, p.y + Math.sin(a) * d * 0.6, p.x + Math.cos(a) * d + 2, p.y + Math.sin(a) * d * 0.6, P.bone); px(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d * 0.6 - 1, P.paper); } }
      if (t >= 0.7) { ctx.globalAlpha = Math.min(1, (t - 0.7) / 0.3); drawSprite(s, x, y, false, null); ctx.globalAlpha = 1; G.kit.drawWeapon(p, false); }
    } else if (kind === 'crate') {
      if (t < 0.9) {
        const z = t < 0.45 ? 140 * Math.pow(1 - t / 0.45, 2) : 0, sh = t > 0.6 ? (Math.floor(t * 40) % 2 ? 1 : -1) : 0;
        rect(p.x - 8 + sh, p.y - 15 - z, 16, 15, '#7a5030'); rect(p.x - 8 + sh, p.y - 15 - z, 16, 1, '#a8743a');
        line(p.x - 8 + sh, p.y - 15 - z, p.x + 7 + sh, p.y - 1 - z, '#4a2e18'); line(p.x + 7 + sh, p.y - 15 - z, p.x - 8 + sh, p.y - 1 - z, '#4a2e18');
        rect(p.x - 8 + sh, p.y - 1 - z, 16, 1, '#2a1a0c');
      } else { drawSprite(s, x, y - Math.max(0, 8 * Math.sin(Math.min(1, (t - 0.9) / 0.3) * Math.PI)), false, null); G.kit.drawWeapon(p, false); }
    } else if (kind === 'robot') {
      const w = t < 1.1 ? 6 + Math.sin(t * 40) : Math.max(0, 6 * (1 - (t - 1.1) / 0.3));
      if (w > 0) { rect(p.x - w / 2, fx.cam.y - 10, w, p.y - fx.cam.y + 10, P.volt); rect(p.x - w / 4, fx.cam.y - 10, Math.max(1, w / 2), p.y - fx.cam.y + 10, P.paper); glow(p.x, p.y - 4, P.volt, 16, 0.6); }
      if (t > 0.6) {
        const q = Math.min(1, (t - 0.6) / 0.5);
        for (let row = 0; row < s.h; row++) if (row / s.h > 1 - q || Math.random() < q * 0.3) { ctx.save(); ctx.beginPath(); ctx.rect(x - 1, y + row, s.w + 2, 1); ctx.clip(); drawSprite(s, x + (q < 1 ? rnd(-2, 2) : 0), y, false, q < 1 ? P.volt : null); ctx.restore(); }
      }
    }
  };
  return k;
}

// ---------- weapons drawn in hand ----------
function swordAngle(p) {
  if (p.state === 'attack') {
    const k = Math.min(1, p.atkT / 0.06), e = 1 - (1 - k) * (1 - k);
    return p.atkAng + p.swing.dir * (-p.swing.arc / 2 + p.swing.arc * e);
  }
  return p.aim + (Math.atan2(Math.sin(Math.PI / 2 - p.aim), Math.cos(Math.PI / 2 - p.aim))) * 0.45;
}
function drawBlade(p, flip, len, col, guard) {
  const a = swordAngle(p), [hx, hy] = hand(p, flip), cx = Math.cos(a), cy = Math.sin(a);
  line(hx - cx * 2, hy - cy * 2, hx, hy, guard);
  line(hx - cy * 2, hy + cx * 2, hx + cy * 2, hy - cx * 2, P.ink3);
  line(hx + cx, hy + cy, hx + cx * len, hy + cy * len, col);
  px(hx + cx * len, hy + cy * len, P.paper);
}

// ---------- the kits ----------
export const CHARS = {
  BLADE: {
    id: 'BLADE', name: 'BLADE', alias: 'ASH', color: () => P.ember,
    desc: ['A FAST SWORD COMBO', 'AND TIME-STOPPING CUTS'], tip: 'CLICK TO SLASH, SPACE TO DASH',
    bars: { power: 3, speed: 4, range: 2, tough: 3 },
    stats: { hp: 8, speed: 98 }, dash: { speed: 330, time: 0.14, cd: 0.32, charges: 1 }, ultRate: 1, energyHit: 1.5,
    melee: {
      col: 'ember', steps: [
        { reach: 31, arc: 2.6, dmg: 3, dur: 0.24, cancel: 0.12, lunge: 150, kb: 150, th: 8 },
        { reach: 31, arc: 2.6, dmg: 3, dur: 0.24, cancel: 0.12, lunge: 150, kb: 150, th: 8 },
        { reach: 40, arc: 3.7, dmg: 6, dur: 0.36, cancel: 0.2, lunge: 215, kb: 270, th: 12, heavy: true },
      ],
    },
    primaryName: 'SWORD COMBO',
    q: {
      name: 'RIFT', cost: 30, cd: 1.5, icon: 'blade', desc: 'BLINK AND CUT A LINE',
      use(p) {
        const a = p.aim, L = 104, x0 = p.x, y0 = p.y;
        const x1 = clamp(p.x + Math.cos(a) * L, B.x0 + p.r, B.x1 - p.r), y1 = clamp(p.y + Math.sin(a) * L, B.y0 + p.r, B.y1 - 2);
        for (let i = 0; i < 8; i++) { const k = i / 8; G.ghosts.push({ x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k, flip: Math.cos(a) < 0, t: -i * 0.012, life: 0.3, c: P.paper, spr: SPR.chars.BLADE.idle }); }
        p.x = x1; p.y = y1; p.vx = Math.cos(a) * 60; p.vy = Math.sin(a) * 60;
        p.state = 'recover'; p.recT = 0.14; p.inv = Math.max(p.inv, 0.35);
        const marked = [];
        for (const e of G.E) if (alive(e) && segDist(e.x, e.y, x0, y0, x1, y1) < e.r + 10) { e.marked = 0.42; marked.push(e); }
        for (const s of G.shots) if (s.owner === 'enemy' && segDist(s.x, s.y + 6, x0, y0, x1, y1) < 10) { s.dead = true; sparks(s.x, s.y, a, 5, 1, P.hex); }
        G.cuts.push({
          x0, y0: y0 - 5, x1, y1: y1 - 5, a, t: 0, pend: 0.42, marked, echo: G.up.echo ? 1 : 0, done: false,
          fire(c, second) {
            const nx = -Math.sin(c.a), ny = Math.cos(c.a);
            for (const e of c.marked) {
              if (e.dead || e.dying) continue;
              const side = (e.x - c.x0) * nx + (e.y - c.y0) * ny > 0 ? 1 : -1;
              damage(e, pd(second ? 7 : 12), { dir: c.a + (side * Math.PI) / 2, kb: 140, src: 'rift', slice: true });
            }
            const len = hyp(c.x1 - c.x0, c.y1 - c.y0);
            for (let i = 0; i < len; i += 4) { const k = i / len; part(c.x0 + (c.x1 - c.x0) * k, c.y0 + (c.y1 - c.y0) * k + 5, nx * rnd(-90, 90), ny * rnd(-90, 90), rnd(0.15, 0.4), Math.random() < 0.6 ? P.paper : P.ember2, { drag: 6, glow: true }); }
            shake(second ? 0.3 : 0.5); hitstop(second ? 0.04 : 0.08); A.riftCut();
          },
        });
        A.rift(); hitstop(0.04); shake(0.22); flash(P.paper, 0.06, false);
      },
    },
    e: {
      name: 'TEMPEST', cost: 45, cd: 4, icon: 'bolt', desc: 'SHOCKWAVE AND CHAIN LIGHTNING',
      use(p) {
        addRing(p.x, p.y - 5, P.volt, 300, 0.26, 3); addRing(p.x, p.y - 5, P.paper, 220, 0.2, 1);
        for (const e of G.E) if (alive(e) && hyp(e.x - p.x, e.y - p.y) < 70) damage(e, pd(4), { dir: Math.atan2(e.y - p.y, e.x - p.x), kb: 280, src: 'bolt' });
        for (const s of G.shots) if (s.owner === 'enemy' && hyp(s.x - p.x, s.y - p.y) < 85) { s.dead = true; sparks(s.x, s.y, rnd(TAU), 6, Math.PI, P.hex); }
        chainLightning({ x: p.x, y: p.y }, 4 + G.up.storm * 2, 6);
        for (let i = 0; i < 24; i++) { const a = rnd(TAU), v = rnd(80, 240); part(p.x, p.y - 5, Math.cos(a) * v, Math.sin(a) * v, rnd(0.15, 0.35), Math.random() < 0.5 ? P.volt : P.paper, { drag: 7, glow: true }); }
        A.zap(); hitstop(0.06); shake(0.45); flash(P.volt, 0.12, false);
        p.state = 'recover'; p.recT = 0.12;
      },
    },
    r: {
      name: 'THOUSAND CUTS', icon: 'cross', desc: 'STOP TIME, CUT EVERYTHING',
      use(p) {
        const targets = G.E.filter(alive).sort((a, b) => hyp(a.x - p.x, a.y - p.y) - hyp(b.x - p.x, b.y - p.y)).slice(0, 14);
        const u = { t: 0, phase: 'gather', cuts: [], i: 0, cutT: 0, ox: p.x, oy: p.y, n: Math.round(Math.max(12, targets.length + 6) * (G.up.evoUlt ? 1.7 : 1)) };
        p.state = 'cine'; p.vx = p.vy = 0;
        A.ultStart(); shake(0.25); banner('THOUSAND CUTS', P.gold);
        G.cine = {
          update(dt) {
            u.t += dt;
            if (u.phase === 'gather') { if (u.t > 0.5) { u.phase = 'cuts'; u.t = 0; } }
            else if (u.phase === 'cuts') {
              u.cutT -= dt;
              while (u.cutT <= 0 && u.i < u.n) {
                u.cutT += 0.05;
                const live = targets.filter((e) => !e.dead);
                let tx, ty;
                if (live.length) { const e = live[u.i % live.length]; tx = e.x + rnd(-4, 4); ty = e.y - e.r + rnd(-4, 4); }
                else { tx = u.ox + rnd(-70, 70); ty = u.oy + rnd(-45, 45); }
                const a = rnd(TAU), L = rnd(56, 90);
                u.cuts.push({ x: tx, y: ty, a, L });
                ghost(p, P.paper);
                p.x = clamp(tx + Math.cos(a) * L * 0.5, B.x0 + 6, B.x1 - 6); p.y = clamp(ty + 5 + Math.sin(a) * L * 0.5, B.y0 + 6, B.y1 - 6); p.aim = a;
                A.ultCut(u.i); shake(0.12); u.i++;
              }
              if (u.i >= u.n) { u.phase = 'hold'; u.t = 0; ghost(p, P.paper); p.x = u.ox; p.y = u.oy; }
            } else if (u.phase === 'hold' && u.t > 0.6) {
              G.cine = null; p.state = 'move'; p.inv = 0.8;
              const fade = { t: 0 };
              for (const c of u.cuts) for (let i = 0; i < 5; i++) { const k = rnd(-0.5, 0.5); part(c.x + Math.cos(c.a) * c.L * k, c.y + 5 + Math.sin(c.a) * c.L * k, rnd(-120, 120), rnd(-120, 120), rnd(0.2, 0.5), Math.random() < 0.5 ? P.paper : P.gold, { drag: 5, glow: true }); }
              for (const e of targets) if (alive(e)) damage(e, e.type === 'boss' ? Math.round(60 + e.maxHp * 0.06) : pd(40), { dir: rnd(TAU), kb: 240, src: 'ult', slice: true, crit: true });
              addRing(p.x, p.y - 6, P.gold, 380, 0.4, 3); addRing(p.x, p.y - 6, P.paper, 300, 0.3, 1);
              flash(P.paper, 0.35, true); shake(1); hitstop(0.14); A.ultRelease();
              G.slashes.push(...u.cuts.slice(0, 10).map((c) => ({ follow: false, x: c.x, y: c.y + 5, a: c.a, r: 18, arc: 1.2, dir: 1, t: 0, life: 0.25, th: 4, col: 'gold' })));
              void fade;
            }
          },
          draw(cx, cy) {
            const a = (u.phase === 'gather' ? Math.min(1, u.t / 0.4) : 1) * 0.86;
            ctx.globalAlpha = a; ctx.fillStyle = P.void; ctx.fillRect(cx, cy, 320, 180); ctx.globalAlpha = 1;
            for (const e of G.E) if (!e.dead) { const s = sprFor(e); drawSprite(s, e.x - s.w / 2, e.y - s.h + 1, e.face < 0, P.bone); }
            { const s = SPR.chars.BLADE.idle; drawSprite(s, p.x - s.w / 2, p.y - s.h + 1, Math.cos(p.aim) < 0, P.ember); }
            for (const c of u.cuts) {
              const ux = (Math.cos(c.a) * c.L) / 2, uy = (Math.sin(c.a) * c.L) / 2;
              line(c.x - ux, c.y - uy + 1, c.x + ux, c.y + uy + 1, P.blood); line(c.x - ux, c.y - uy, c.x + ux, c.y + uy, P.paper);
            }
          },
        };
      },
    },
    drawWeapon: (p, flip) => drawBlade(p, flip, 12, P.bone, P.ember),
    entrance: () => entrance('drop'),
  },

  GUNNER: {
    id: 'GUNNER', name: 'GUNNER', alias: 'VEGA', color: () => P.gold,
    desc: ['HOLD TO SHOOT, RELOAD', 'IS AUTOMATIC'], tip: 'HOLD CLICK TO SHOOT',
    bars: { power: 3, speed: 4, range: 5, tough: 2 },
    stats: { hp: 7, speed: 100 }, dash: { speed: 310, time: 0.15, cd: 0.4, charges: 1 }, ultRate: 0.8, energyHit: 0.4,
    primaryName: 'REVOLVER',
    init: () => ({ ammo: 14, reload: 0, fireT: 0, stand: 0, flashT: 0 }),
    primary(p, dt, held) {
      const k = p.k, mag = Math.floor(14 * (1 + 0.5 * G.up.mag));
      k.fireT -= dt; k.flashT -= dt;
      if (k.stand > 0) {
        if (held && k.fireT <= 0) {
          k.fireT = 0.035;
          const a = p.aim + rnd(-0.12, 0.12), [hx, hy] = hand(p, Math.cos(p.aim) < 0);
          shoot({ x: hx + Math.cos(a) * 10, y: hy + Math.sin(a) * 10, a, sp: 430, dmg: pd(3), kb: 90, life: 0.7, kind: 'bullet', pierce: 2, c: P.gold, ug: false });
          part(hx, hy, -Math.sin(a) * 60 + rnd(-20, 20), Math.cos(a) * 60, 0.5, P.gold2, { z: 6, vz: 60, g: 300, drag: 2 });
          k.flashT = 0.03; A.minigun(); shake(0.05);
          p.vx -= Math.cos(a) * 8; p.vy -= Math.sin(a) * 8;
        }
        return;
      }
      if (k.reload > 0) { k.reload -= dt; if (k.reload <= 0) { k.ammo = mag; A.reload(); } return; }
      if (held && k.fireT <= 0 && k.ammo > 0) {
        k.fireT = 0.11 / G.up.spd; k.ammo--;
        const a = p.aim + rnd(-0.05, 0.05), [hx, hy] = hand(p, Math.cos(p.aim) < 0);
        shoot({ x: hx + Math.cos(a) * 8, y: hy + Math.sin(a) * 8, a, sp: 400, dmg: pd(2), kb: 70, life: 0.7, kind: 'bullet', pierce: G.up.pierce, c: P.gold });
        muzzle(hx + Math.cos(a) * 8, hy + Math.sin(a) * 8, a, P.gold, 3);
        part(hx, hy, -Math.sin(a) * 50 + rnd(-20, 20), Math.cos(a) * 50, 0.5, P.gold2, { z: 6, vz: 60, g: 300, drag: 2 });
        k.flashT = 0.04; A.charAtk('GUNNER'); shake(0.04);
        p.vx -= Math.cos(a) * 20; p.vy -= Math.sin(a) * 20;
        if (k.ammo <= 0) { k.reload = 0.9 / (1 + 0.3 * G.up.mag); A.click(); }
      }
    },
    update(p, dt) {
      const k = p.k;
      if (k.stand > 0) { k.stand -= dt; p.slowMul = 0.55; if (k.stand <= 0) { p.slowMul = 1; k.ammo = Math.floor(14 * (1 + 0.5 * G.up.mag)); } }
    },
    q: {
      name: 'BUCKSHOT', cost: 25, cd: 1.2, icon: 'burst', desc: 'POINT-BLANK SHOTGUN BLAST',
      use(p) {
        const [hx, hy] = hand(p, Math.cos(p.aim) < 0);
        for (let i = 0; i < 9; i++) { const a = p.aim + rnd(-0.42, 0.42); shoot({ x: hx, y: hy, a, sp: rnd(300, 380), dmg: pd(3), kb: 220, life: 0.35, kind: 'pellet', c: P.ember2, ug: false }); }
        muzzle(hx + Math.cos(p.aim) * 6, hy + Math.sin(p.aim) * 6, p.aim, P.ember2, 14);
        p.vx = -Math.cos(p.aim) * 180; p.vy = -Math.sin(p.aim) * 180;
        p.state = 'recover'; p.recT = 0.15; p.k.flashT = 0.08;
        A.shotgun(); shake(0.35); hitstop(0.03);
      },
    },
    e: {
      name: 'GRENADE', cost: 35, cd: 3, icon: 'burst', desc: 'LOBBED, BIG BLAST',
      use(p) {
        const [x, y] = aimPoint(p, 130);
        G.strikes.push({ x, y, x0: p.x, y0: p.y - 8, t: 0, delay: 0.55, R: 40, dmg: 16, friendly: true, kind: 'grenade', c: P.gold });
        A.toss();
      },
    },
    r: {
      name: 'LAST STAND', icon: 'gun', desc: 'FOUR SECONDS OF MINIGUN',
      use(p) { p.k.stand = G.up.evoUlt ? 7 : 4; banner(G.up.evoUlt ? 'LAST STAND II' : 'LAST STAND', P.gold); A.reload(); shake(0.3); },
    },
    drawWeapon(p, flip) {
      const [hx, hy] = hand(p, flip), a = p.aim, cx = Math.cos(a), cy = Math.sin(a);
      if (p.k.stand > 0) {
        line(hx - cx * 2, hy - cy * 2, hx + cx * 11, hy + cy * 11, '#3d3250', 3);
        line(hx, hy, hx + cx * 11, hy + cy * 11, P.dust);
        px(hx + cx * 11 - cy * Math.sin(G.time * 60), hy + cy * 11 + cx * Math.sin(G.time * 60), P.paper);
      } else {
        line(hx, hy, hx + cx * 6, hy + cy * 6, P.dust, 2);
        line(hx, hy, hx + cx * 6, hy + cy * 6, P.gold);
      }
      if (p.k.flashT > 0) { disc(hx + cx * 12, hy + cy * 12, 2, P.paper); glow(hx + cx * 12, hy + cy * 12, P.gold, 8, 0.7); }
    },
    hud(p, x, y) {
      const k = p.k, mag = Math.floor(14 * (1 + 0.5 * G.up.mag));
      if (k.stand > 0) { textO('MINIGUN ' + k.stand.toFixed(1), x, y, P.gold); return; }
      if (k.reload > 0) { textO('RELOADING', x, y, Math.floor(G.time * 8) % 2 ? P.gold : P.dust); return; }
      for (let i = 0; i < mag; i++) rect(x + (i % 21) * 3, y + Math.floor(i / 21) * 4, 2, 3, i < k.ammo ? P.gold : P.ink3);
    },
    entrance: () => entrance('slide'),
  },

  WIZARD: {
    id: 'WIZARD', name: 'WIZARD', alias: 'MOTH', color: () => '#b48cff',
    desc: ['HOMING MAGIC, FROST', 'BLINK AND METEORS'], tip: 'HOLD CLICK TO CAST',
    bars: { power: 5, speed: 2, range: 4, tough: 1 },
    stats: { hp: 6, speed: 92 }, dash: { speed: 360, time: 0.12, cd: 0.5, charges: 1 }, ultRate: 1, energyHit: 1.5,
    primaryName: 'ARCANE BOLT',
    init: () => ({ fireT: 0, star: 0, starT: 0, castT: 0 }),
    primary(p, dt, held) {
      const k = p.k;
      k.fireT -= dt; k.castT -= dt;
      if (held && k.fireT <= 0) {
        k.fireT = 0.3 / G.up.spd; k.castT = 0.1;
        const [hx, hy] = hand(p, Math.cos(p.aim) < 0);
        shoot({ x: hx + Math.cos(p.aim) * 6, y: hy - 6, a: p.aim, sp: 210, dmg: pd(5), kb: 80, life: 1.4, kind: 'arcane', r: 3, c: '#b48cff', homing: 2.5, splash: { R: 14, dmg: pd(2) } });
        A.charAtk('WIZARD');
      }
    },
    update(p, dt) {
      const k = p.k;
      if (k.star > 0) {
        k.star -= dt; k.starT -= dt;
        if (k.starT <= 0) {
          k.starT = 0.14;
          const live = G.E.filter(alive), e = live.length ? live[Math.floor(rnd(live.length))] : null;
          const x = e ? e.x + rnd(-8, 8) : clamp(p.x + rnd(-120, 120), B.x0 + 10, B.x1 - 10), y = e ? e.y + rnd(-6, 6) : clamp(p.y + rnd(-80, 80), B.y0 + 10, B.y1 - 6);
          G.strikes.push({ x, y, t: 0, delay: 0.6, R: 30, dmg: 13, friendly: true, kind: 'meteor', c: P.ember });
          A.meteorFall();
        }
      }
    },
    q: {
      name: 'FROST BLINK', cost: 25, cd: 1.5, icon: 'snow', desc: 'TELEPORT, FREEZE BOTH ENDS',
      use(p) {
        const [x, y] = aimPoint(p, 120);
        const nova = (nx, ny) => {
          addRing(nx, ny - 5, P.volt, 260, 0.28, 2); addRing(nx, ny - 5, P.paper, 200, 0.2, 1);
          for (const e of G.E) if (alive(e) && hyp(e.x - nx, e.y - ny) < 46) { damage(e, pd(3), { dir: Math.atan2(e.y - ny, e.x - nx), kb: 60, src: 'bolt' }); if (e.type !== 'boss') e.frozen = 1.6; }
          for (let i = 0; i < 16; i++) { const a = rnd(TAU), v = rnd(60, 180); part(nx, ny - 5, Math.cos(a) * v, Math.sin(a) * v, 0.4, Math.random() < 0.5 ? P.volt : P.paper, { drag: 6, glow: true }); }
        };
        nova(p.x, p.y);
        for (let i = 0; i < 6; i++) { const k = i / 6; G.ghosts.push({ x: p.x + (x - p.x) * k, y: p.y + (y - p.y) * k, flip: Math.cos(p.aim) < 0, t: -i * 0.01, life: 0.3, c: '#b48cff', spr: SPR.chars.WIZARD.idle }); }
        p.x = x; p.y = y; p.vx = p.vy = 0;
        nova(p.x, p.y);
        p.inv = Math.max(p.inv, 0.3); p.state = 'recover'; p.recT = 0.1;
        A.freeze(); shake(0.25); hitstop(0.04);
      },
    },
    e: {
      name: 'METEOR', cost: 40, cd: 3.5, icon: 'star', desc: 'CALL A BURNING ROCK',
      use(p) {
        const [x, y] = aimPoint(p, 170);
        G.strikes.push({ x, y, t: 0, delay: 0.7, R: 40, dmg: 20, friendly: true, kind: 'meteor', c: P.ember });
        if (G.up.twin) G.strikes.push({ x: clamp(x + rnd(-20, 20), B.x0, B.x1), y: clamp(y + rnd(-14, 14), B.y0, B.y1), t: -0.35, delay: 0.7, R: 34, dmg: 16, friendly: true, kind: 'meteor', c: P.ember });
        A.meteorFall(); p.k.castT = 0.3;
      },
    },
    r: {
      name: 'STARFALL', icon: 'star', desc: 'METEORS RAIN ON EVERY FOE',
      use(p) { p.k.star = G.up.evoUlt ? 4.4 : 2.6; p.k.starT = 0; banner(G.up.evoUlt ? 'STARFALL II' : 'STARFALL', P.ember2); A.ultStart(); flash('#b48cff', 0.15, false); },
    },
    drawWeapon(p, flip) {
      const [hx, hy] = hand(p, flip), tilt = flip ? 0.25 : -0.25;
      line(hx, hy + 5, hx + tilt * 14, hy - 9, '#7a5030');
      const tx = hx + tilt * 14, ty = hy - 10;
      disc(tx, ty, p.k.castT > 0 ? 2 : 1, '#b48cff'); px(tx, ty, P.paper);
      glow(tx, ty, '#b48cff', p.k.castT > 0 ? 10 : 6, p.k.castT > 0 ? 0.7 : 0.35);
    },
    entrance: () => entrance('portal'),
  },

  NINJA: {
    id: 'NINJA', name: 'NINJA', alias: 'SHADE', color: () => P.blood,
    desc: ['VERY FAST, TWO DASHES,', 'HITS FROM HIDING X3'], tip: 'HIT FROM SMOKE TO BACKSTAB',
    bars: { power: 3, speed: 5, range: 2, tough: 1 },
    stats: { hp: 6, speed: 114 }, dash: { speed: 380, time: 0.11, cd: 0.7, charges: 2 }, ultRate: 1, energyHit: 1.2, backstab: true,
    melee: {
      col: 'blood', steps: [
        { reach: 23, arc: 2.3, dmg: 2, dur: 0.15, cancel: 0.07, lunge: 170, kb: 80, th: 6 },
        { reach: 23, arc: 2.3, dmg: 2, dur: 0.15, cancel: 0.07, lunge: 170, kb: 80, th: 6 },
        { reach: 23, arc: 2.3, dmg: 2, dur: 0.15, cancel: 0.07, lunge: 170, kb: 80, th: 6 },
        { reach: 28, arc: 3.2, dmg: 5, dur: 0.28, cancel: 0.14, lunge: 230, kb: 200, th: 9, heavy: true },
      ],
    },
    primaryName: 'TWIN DAGGERS',
    q: {
      name: 'SHURIKEN FAN', cost: 20, cd: 1, icon: 'cross', desc: 'FIVE BOUNCING STARS',
      use(p) {
        const [hx, hy] = hand(p, Math.cos(p.aim) < 0);
        for (let i = -2; i <= 2; i++) shoot({ x: hx, y: hy, a: p.aim + i * 0.15, sp: 300, dmg: pd(4), kb: 80, life: 1.2, kind: 'shuriken', pierce: 2, bounce: 1, c: P.bone, poison: G.up.venom, ug: false, trail: false });
        A.shuriken();
      },
    },
    e: {
      name: 'SMOKE BOMB', cost: 35, cd: 6, icon: 'cloud', desc: 'TURN INVISIBLE FOR 3S',
      use(p) {
        G.zones.push({ type: 'smoke', x: p.x, y: p.y, r: 30, t: 0, life: 1.2 });
        p.invis = 3;
        for (const s of G.shots) if (s.owner === 'enemy' && hyp(s.x - p.x, s.y - p.y) < 40) s.dead = true;
        A.smoke(); dust(p.x, p.y, 20, 80);
        addText(p.x, p.y - 24, 'VANISHED', P.dust);
      },
    },
    r: {
      name: 'SHADOW CLONES', icon: 'eye', desc: 'THREE CLONES HUNT FOR 7S',
      use(p) {
        const nC = G.up.evoUlt ? 5 : 3; for (let i = 0; i < nC; i++) { const a = (i * TAU) / nC; G.allies.push({ type: 'clone', x: p.x + Math.cos(a) * 14, y: p.y + Math.sin(a) * 10, t: 0, life: G.up.evoUlt ? 10 : 7, cd: 0.15 * i, face: 1 }); }
        G.zones.push({ type: 'smoke', x: p.x, y: p.y, r: 26, t: 0, life: 0.8 });
        banner('SHADOW CLONES', P.blood); A.smoke(); A.ultStart();
      },
    },
    drawWeapon(p, flip) {
      const a = p.state === 'attack' ? swordAngle(p) : p.aim + (flip ? -0.8 : 0.8), [hx, hy] = hand(p, flip), cx = Math.cos(a), cy = Math.sin(a);
      line(hx, hy, hx + cx * 6, hy + cy * 6, P.bone); px(hx + cx * 6, hy + cy * 6, P.paper);
      const ox = flip ? 5 : -5;
      line(hx + ox, hy + 1, hx + ox + cx * 4, hy + 1 + cy * 4, P.dust);
    },
    entrance: () => entrance('smoke'),
  },

  MECHANIC: {
    id: 'MECHANIC', name: 'MECHANIC', alias: 'RIVET', color: () => '#ff8a3c',
    desc: ['BUILDS TURRETS AND', 'COILS THAT FIGHT FOR YOU'], tip: 'Q BUILDS A TURRET',
    bars: { power: 3, speed: 3, range: 3, tough: 3 },
    stats: { hp: 8, speed: 95 }, dash: { speed: 320, time: 0.14, cd: 0.4, charges: 1 }, ultRate: 1.1, energyHit: 2,
    melee: {
      col: 'ember', heavySfx: true, steps: [
        { reach: 28, arc: 2.4, dmg: 4, dur: 0.3, cancel: 0.16, lunge: 120, kb: 180, th: 8 },
        { reach: 30, arc: 3, dmg: 8, dur: 0.42, cancel: 0.24, lunge: 170, kb: 300, th: 11, heavy: true },
      ],
    },
    primaryName: 'WRENCH',
    q: {
      name: 'TURRET', cost: 30, cd: 1, icon: 'gear', desc: 'AUTO-GUN, LASTS 14S',
      use(p) {
        const turrets = G.allies.filter((a) => a.type === 'turret');
        if (turrets.length >= 2 + G.up.hands) turrets[0].dead = true;
        G.allies.push({ type: 'turret', x: clamp(p.x + Math.cos(p.aim) * 10, B.x0 + 8, B.x1 - 8), y: clamp(p.y + Math.sin(p.aim) * 8, B.y0 + 8, B.y1 - 2), t: 0, life: 14, fireT: 0.4, ang: p.aim });
        A.build(); dust(p.x, p.y, 8, 50);
      },
    },
    e: {
      name: 'TESLA COIL', cost: 40, cd: 5, icon: 'bolt', desc: 'ZAPS 3 FOES AT ONCE FOR 7S',
      use(p) {
        G.allies.push({ type: 'coil', x: clamp(p.x + Math.cos(p.aim) * 12, B.x0 + 8, B.x1 - 8), y: clamp(p.y + Math.sin(p.aim) * 10, B.y0 + 10, B.y1 - 2), t: 0, life: 7, zapT: 0.3 });
        A.build(); A.zap();
      },
    },
    r: {
      name: 'JUNK GOLEM', icon: 'fist', desc: 'A SCRAP GIANT FIGHTS FOR 12S',
      use(p) {
        const [x, y] = aimPoint(p, 60);
        G.allies.push({ type: 'golem', x, y, z: 140, t: 0, life: G.up.evoUlt ? 20 : 12, cd: 0.6, landed: false, face: 1, anim: 0 });
        if (G.up.evoUlt) G.allies.push({ type: 'golem', x: clamp(x + 30, B.x0 + 10, B.x1 - 10), y, z: 200, t: 0, life: 20, cd: 0.9, landed: false, face: -1, anim: 0 });
        banner('JUNK GOLEM', '#ffb347'); A.ultStart();
      },
    },
    drawWeapon(p, flip) {
      const a = swordAngle(p), [hx, hy] = hand(p, flip), cx = Math.cos(a), cy = Math.sin(a);
      line(hx, hy, hx + cx * 9, hy + cy * 9, P.dust);
      const tx = hx + cx * 9, ty = hy + cy * 9;
      line(tx - cy * 2, ty + cx * 2, tx + cy * 2, ty - cx * 2, P.bone);
      px(tx - cy * 2 + cx, ty + cx * 2 + cy, P.bone); px(tx + cy * 2 + cx, ty - cx * 2 + cy, P.bone);
    },
    hud(p, x, y) {
      const n = G.allies.filter((a) => a.type === 'turret').length;
      textO('TURRETS ' + n + '/' + (2 + G.up.hands), x, y, '#ff8a3c');
    },
    entrance: () => entrance('crate'),
  },

  TANK: {
    id: 'TANK', name: 'TANK', alias: 'BULWARK', color: () => '#8fa2bd',
    desc: ['SLOW, HUGE HAMMER,', 'LOTS OF HEALTH'], tip: 'Q CHARGES THROUGH FOES',
    bars: { power: 5, speed: 1, range: 3, tough: 5 },
    stats: { hp: 12, speed: 80 }, dash: { speed: 260, time: 0.16, cd: 0.6, charges: 1 }, ultRate: 1, energyHit: 2.5,
    melee: {
      col: 'steel', heavySfx: true, steps: [
        { reach: 34, arc: 3, dmg: 6, dur: 0.42, cancel: 0.24, lunge: 90, kb: 320, th: 11 },
        { reach: 40, arc: 4.2, dmg: 12, dur: 0.6, cancel: 0.34, lunge: 120, kb: 420, th: 14, heavy: true },
      ],
    },
    primaryName: 'WAR HAMMER',
    init: () => ({ skillInv: false, carry: null, pulseT: 0, slamSwing: -1 }),
    onHit(e, sw) {
      if (sw.heavy && G.p.k.slamSwing !== G.p.atkAng) {
        G.p.k.slamSwing = G.p.atkAng;
        G.quakes.push({ x: e.x, y: e.y, r: 0, delay: 0, max: 46, friendly: true, hit: new Set([e]), dmg: 3, speed: 200 });
        shake(0.35); A.boom(0.8);
      }
    },
    skill(p, dt) {
      const k = p.k;
      k.skillT -= dt;
      p.vx = Math.cos(k.dir) * 300; p.vy = Math.sin(k.dir) * 300;
      if (Math.random() < 0.8) dust(p.x, p.y, 2, 50);
      if (Math.random() < 0.5) ghost(p, '#8fa2bd');
      for (const e of G.E) {
        if (!alive(e) || hyp(e.x - p.x, e.y - p.y) > e.r + 12) continue;
        if (!k.carry.has(e)) { k.carry.add(e); damage(e, pd(6), { dir: k.dir, kb: 0, src: 'dash', slice: false }); A.hit(true, false); hitstop(0.03); }
        if (e.type !== 'boss') { e.x = p.x + Math.cos(k.dir) * (e.r + 8); e.y = p.y + Math.sin(k.dir) * (e.r + 6); e.stunT = Math.max(e.stunT, 1); }
      }
      const atWall = p.x <= B.x0 + p.r + 1 || p.x >= B.x1 - p.r - 1 || p.y <= B.y0 + p.r + 1 || p.y >= B.y1 - 3;
      if (k.skillT <= 0 || atWall) {
        if (atWall) { shake(0.6); A.wall(); hitstop(0.06); for (const e of k.carry) if (alive(e)) damage(e, pd(8), { dir: k.dir, kb: 0, src: 'wall' }); addText(p.x, p.y - 24, 'CRUSHED', P.gold); }
        for (const e of k.carry) if (alive(e)) { e.kx = Math.cos(k.dir) * 200; e.ky = Math.sin(k.dir) * 200; }
        k.skillInv = false; p.vx *= 0.2; p.vy *= 0.2;
        return true;
      }
    },
    update(p, dt) {
      const k = p.k;
      if (p.fortress > 0) {
        k.pulseT -= dt;
        if (k.pulseT <= 0) {
          k.pulseT = 0.5;
          addRing(p.x, p.y - 6, P.gold, 220, 0.3, 2);
          for (const e of G.E) if (alive(e) && hyp(e.x - p.x, e.y - p.y) < 56) damage(e, pd(6), { dir: Math.atan2(e.y - p.y, e.x - p.x), kb: 200, src: 'boom' });
          A.boom(0.5); shake(0.15);
        }
      }
    },
    q: {
      name: 'BULLDOZE', cost: 25, cd: 2, icon: 'dash', desc: 'CHARGE, CARRY FOES INTO WALLS',
      use(p) { const k = p.k; k.dir = p.aim; k.skillT = 0.45; k.skillInv = true; k.carry = new Set(); p.state = 'skill'; A.dash(); A.heavySwing(); shake(0.2); },
    },
    e: {
      name: 'GROUND SLAM', cost: 40, cd: 4, icon: 'fist', desc: 'SHOCKWAVES THAT STUN',
      use(p) {
        for (let i = 0; i < 2 + G.up.after; i++) G.quakes.push({ x: p.x, y: p.y, r: 0, delay: i * 0.22, max: 110, friendly: true, hit: new Set(), dmg: 6, speed: 170 });
        hitstop(0.07); shake(0.7); A.boom(1.5); dust(p.x, p.y, 30, 120); scorch(p.x, p.y, 12);
        p.state = 'recover'; p.recT = 0.25;
      },
    },
    r: {
      name: 'FORTRESS', icon: 'shield', desc: '6S INVINCIBLE, REFLECT ALL',
      use(p) { p.fortress = G.up.evoUlt ? 10 : 6; p.k.pulseT = 0; banner(G.up.evoUlt ? 'FORTRESS II' : 'FORTRESS', P.gold); A.shieldUp(); A.ultStart(); shake(0.4); },
    },
    drawWeapon(p, flip) {
      const a = swordAngle(p), [hx, hy] = hand(p, flip), cx = Math.cos(a), cy = Math.sin(a);
      const sx = p.x + (flip ? 5 : -5);
      rect(sx - 1, p.y - 10, 3, 7, '#5a6a82'); rect(sx - 1, p.y - 10, 3, 1, '#8fa2bd');
      line(hx, hy, hx + cx * 10, hy + cy * 10, '#7a5030');
      const tx = hx + cx * 10, ty = hy + cy * 10;
      line(tx - cy * 3, ty + cx * 3, tx + cy * 3, ty - cx * 3, '#8fa2bd', 3);
      line(tx - cy * 3, ty + cx * 3, tx + cy * 3, ty - cx * 3, '#cfe0f5');
    },
    entrance: () => entrance('meteor'),
  },

  ROBOT: {
    id: 'ROBOT', name: 'ROBOT', alias: 'UNIT-7', color: () => P.volt,
    desc: ['A LASER BEAM THAT', 'OVERHEATS, PLUS ROCKETS'], tip: 'HOLD CLICK, WATCH THE HEAT',
    bars: { power: 4, speed: 3, range: 4, tough: 3 },
    stats: { hp: 8, speed: 90 }, dash: { speed: 340, time: 0.13, cd: 0.45, charges: 1 }, ultRate: 0.85, energyHit: 0.35,
    primaryName: 'LASER BEAM',
    init: () => ({ heat: 0, over: 0, tick: 0, firing: false, orb: 0, ox: 0, oy: 0, otick: 0, end: [0, 0] }),
    primary(p, dt, held) {
      const k = p.k;
      k.firing = false;
      if (k.over > 0) { k.over -= dt; k.heat = Math.max(0, k.heat - 60 * dt); if (Math.random() < 0.5) part(p.x, p.y - 12, rnd(-10, 10), -rnd(20, 40), 0.5, P.dust, { drag: 2 }); A.loop('beam', false); return; }
      if (held) {
        k.firing = true;
        k.heat += 34 * (G.up.coolant ? 0.6 : 1) * dt;
        const [hx, hy] = hand(p, Math.cos(p.aim) < 0), a = p.aim;
        const L = beamLen(hx, hy, a, 160), ex = hx + Math.cos(a) * L, ey = hy + Math.sin(a) * L;
        k.end = [ex, ey];
        k.tick -= dt;
        if (k.tick <= 0) {
          k.tick = 0.1 / G.up.spd;
          let hits = 0;
          for (const e of G.E) if (alive(e) && segDist(e.x, e.y - e.r, hx, hy, ex, ey) < e.r + 4) { damage(e, pd(2), { dir: a, kb: 30, src: 'primary', ug: true }); hits++; }
          if (hits) A.charHit('ROBOT', false, false, G.combo);
          for (const s of G.shots) if (s.owner === 'enemy' && !s.noparry && segDist(s.x, s.y, hx, hy, ex, ey) < 5) { s.dead = true; sparks(s.x, s.y, rnd(TAU), 5, Math.PI, P.hex); }
        }
        if (Math.random() < 0.6) sparks(ex, ey, a + Math.PI, 2, 1, P.volt, 120);
        shake(0.02);
        if (k.heat >= 100) { k.over = 1.4; k.heat = 100; A.overheat(); addText(p.x, p.y - 22, 'OVERHEAT', P.blood); }
      } else k.heat = Math.max(0, k.heat - 45 * dt);
      A.loop('beam', k.firing);
    },
    update(p, dt) {
      const k = p.k;
      if (k.orb > 0) {
        k.orb -= dt;
        let tx, ty;
        if (input.device === 'mouse') { tx = input.mouse.x + fx.cam.x; ty = input.mouse.y + fx.cam.y; }
        else { const e = G.E.find(alive); tx = e ? e.x : p.x; ty = e ? e.y : p.y; }
        const d = hyp(tx - k.ox, ty - k.oy), sp = Math.min(d, 150 * dt);
        if (d > 0) { k.ox += ((tx - k.ox) / d) * sp; k.oy += ((ty - k.oy) / d) * sp; }
        k.otick -= dt;
        if (k.otick <= 0) {
          k.otick = 0.08;
          for (const e of G.E) if (alive(e) && hyp(e.x - k.ox, e.y - k.oy) < 20 + e.r) damage(e, e.type === 'boss' ? 5 : pd(4), { dir: rnd(TAU), kb: 40, src: 'bolt' });
          scorch(k.ox + rnd(-6, 6), k.oy + rnd(-4, 4), 4);
        }
        for (let i = 0; i < 3; i++) { const a = rnd(TAU), v = rnd(40, 160); part(k.ox, k.oy, Math.cos(a) * v, Math.sin(a) * v * 0.6, 0.3, Math.random() < 0.5 ? P.volt : P.paper, { drag: 5, glow: true }); }
        shake(0.06);
        if (k.orb <= 0) { A.loop('orbital', false); A.boom(1.5); addRing(k.ox, k.oy, P.volt, 300, 0.4, 3); }
      }
    },
    q: {
      name: 'ROCKET SALVO', cost: 30, cd: 2, icon: 'rocket', desc: 'HOMING ROCKETS',
      use(p) {
        const n = 6 + G.up.cluster * 3;
        for (let i = 0; i < n; i++) {
          const a = p.aim + (i / (n - 1) - 0.5) * 1.8;
          shoot({ x: p.x, y: p.y - 10, a, sp: 170, dmg: pd(3), kb: 60, life: 1.8, kind: 'rocket', homing: 5, splash: { R: 20, dmg: pd(5) }, c: P.ember2, ug: false });
        }
        A.rocket(); shake(0.2);
      },
    },
    e: {
      name: 'BARRIER', cost: 35, cd: 6, icon: 'shield', desc: 'BLOCKS 3 HITS, THEN BURSTS',
      use(p) { p.shield = 3; p.shieldT = 8; A.shieldUp(); addRing(p.x, p.y - 7, P.volt, 120, 0.3, 2); },
    },
    onShieldBreak(p) {
      addRing(p.x, p.y - 6, P.volt, 300, 0.3, 3);
      for (const e of G.E) if (alive(e) && hyp(e.x - p.x, e.y - p.y) < 60) damage(e, pd(6), { dir: Math.atan2(e.y - p.y, e.x - p.x), kb: 260, src: 'bolt' });
      A.zap(); shake(0.4);
    },
    r: {
      name: 'ORBITAL LASER', icon: 'eye', desc: 'A SKY BEAM FOLLOWS YOUR AIM',
      use(p) {
        const [x, y] = aimPoint(p, 100);
        p.k.orb = G.up.evoUlt ? 7.5 : 4.5; p.k.ox = x; p.k.oy = y; p.k.otick = 0;
        banner('ORBITAL LASER', P.volt); A.loop('orbital', true, 'orbital'); A.ultStart(); flash(P.volt, 0.15, false);
      },
    },
    drawWeapon(p, flip) {
      const [hx, hy] = hand(p, flip), cx = Math.cos(p.aim), cy = Math.sin(p.aim);
      line(hx, hy, hx + cx * 7, hy + cy * 7, '#5c6678', 2);
      px(hx + cx * 7, hy + cy * 7, p.k.over > 0 ? P.blood : P.volt);
    },
    draw(p) {
      const k = p.k;
      if (k.firing) {
        const [hx, hy] = hand(p, Math.cos(p.aim) < 0), [ex, ey] = k.end, w = 3 + (Math.random() < 0.5 ? 1 : 0);
        line(hx, hy, ex, ey, P.volt2, w + 2); line(hx, hy, ex, ey, P.volt, w); line(hx, hy, ex, ey, P.paper, 1);
        glow(ex, ey, P.volt, 10, 0.6); glow(hx, hy, P.volt, 6, 0.5);
      }
      if (k.orb > 0) {
        const w = 12 + Math.sin(G.time * 30) * 2, top = fx.cam.y - 10;
        rect(k.ox - w / 2 - 2, top, w + 4, k.oy - top, P.volt2);
        rect(k.ox - w / 2, top, w, k.oy - top, P.volt);
        rect(k.ox - w / 4, top, w / 2, k.oy - top, P.paper);
        ring(k.ox, k.oy, 20 + Math.sin(G.time * 20) * 2, 2, P.volt);
        glow(k.ox, k.oy, P.volt, 28, 0.6);
      }
    },
    hud(p, x, y) {
      const k = p.k;
      rect(x - 1, y - 1, 66, 4, P.ink0); rect(x, y, 64, 2, P.ink2);
      rect(x, y, Math.round((64 * k.heat) / 100), 2, k.over > 0 ? (Math.floor(G.time * 10) % 2 ? P.blood : P.paper) : k.heat > 70 ? P.ember : P.volt);
      textO(k.over > 0 ? 'OVERHEATED' : 'HEAT', x, y + 4, k.over > 0 ? P.blood : P.dust);
    },
    entrance: () => entrance('robot'),
  },
};

// ---------- allies built by the mechanic, the ninja's clones ----------
export const ALLY = {
  turret: {
    update(a, dt) {
      a.fireT -= dt;
      const e = nearest(a.x, a.y, 150);
      if (e) a.ang = Math.atan2(e.y - e.r - (a.y - 6), e.x - a.x);
      if (e && a.fireT <= 0 && a.t > 0.3) {
        a.fireT = 0.32 / (1 + 0.4 * G.up.overclock);
        shoot({ x: a.x + Math.cos(a.ang) * 6, y: a.y - 6 + Math.sin(a.ang) * 6, a: a.ang, sp: 330, dmg: pd(2), kb: 50, life: 0.6, kind: 'bullet', c: P.ember2, ug: false });
        A.pew(); a.flash = 0.04;
      }
      a.flash = (a.flash || 0) - dt;
    },
    draw(a) {
      if (a.life - a.t < 2 && Math.floor(G.time * 10) % 2) return;
      const drop = a.t < 0.2 ? (1 - a.t / 0.2) * 30 : 0;
      drawSprite(SPR.turret, a.x - 5, a.y - 8 - drop, false);
      line(a.x, a.y - 6 - drop, a.x + Math.cos(a.ang) * 6, a.y - 6 - drop + Math.sin(a.ang) * 6, P.bone);
      if (a.flash > 0) glow(a.x + Math.cos(a.ang) * 8, a.y - 6 + Math.sin(a.ang) * 8, P.ember2, 6, 0.8);
    },
  },
  coil: {
    update(a, dt) {
      a.zapT -= dt;
      if (a.zapT <= 0) {
        a.zapT = 0.5 / (1 + 0.4 * G.up.overclock);
        const hit = new Set();
        for (let i = 0; i < 3; i++) {
          const e = nearest(a.x, a.y, 75, hit);
          if (!e) break;
          hit.add(e);
          G.bolts.push({ x0: a.x, y0: a.y - 10, x1: e.x, y1: e.y - e.r, t: 0, life: 0.2 });
          damage(e, pd(4), { dir: Math.atan2(e.y - a.y, e.x - a.x), kb: 50, src: 'bolt' });
        }
        if (hit.size) A.zip();
      }
    },
    draw(a) {
      if (a.life - a.t < 1.5 && Math.floor(G.time * 10) % 2) return;
      drawSprite(SPR.coil, a.x - 3, a.y - 10, false);
      glow(a.x, a.y - 9, P.volt, 10 + Math.sin(G.time * 20) * 2, 0.4);
      if (Math.random() < 0.3) line(a.x, a.y - 10, a.x + rnd(-6, 6), a.y - 10 + rnd(-6, 2), P.paper);
    },
  },
  golem: {
    update(a, dt) {
      a.anim += dt;
      if (!a.landed) {
        a.z = Math.max(0, 140 * (1 - a.t / 0.45));
        if (a.z <= 0) {
          a.landed = true;
          G.quakes.push({ x: a.x, y: a.y, r: 0, delay: 0, max: 80, friendly: true, hit: new Set(), dmg: 10, speed: 200 });
          shake(0.8); A.boom(1.8); dust(a.x, a.y, 30, 140); scorch(a.x, a.y, 14); hitstop(0.06);
        }
        return;
      }
      a.cd -= dt;
      const e = nearest(a.x, a.y, 400);
      if (!e) return;
      const d = hyp(e.x - a.x, e.y - a.y);
      a.face = e.x < a.x ? -1 : 1;
      if (d > 22) { a.x += ((e.x - a.x) / d) * 62 * dt; a.y += ((e.y - a.y) / d) * 62 * dt; a.walking = true; }
      else a.walking = false;
      if (d < 26 && a.cd <= 0) {
        a.cd = 0.75; a.punch = 0.15;
        for (const o of G.E) if (alive(o) && hyp(o.x - e.x, o.y - e.y) < 28) damage(o, pd(12), { dir: Math.atan2(o.y - a.y, o.x - a.x), kb: 300, src: 'boom' });
        G.quakes.push({ x: e.x, y: e.y, r: 0, delay: 0, max: 36, friendly: true, hit: new Set([e]), dmg: 3, speed: 200 });
        shake(0.4); A.boom(1); hitstop(0.04);
      }
      a.punch = (a.punch || 0) - dt;
    },
    draw(a) {
      if (a.life - a.t < 1.5 && Math.floor(G.time * 10) % 2) return;
      const s = SPR.golem[a.walking ? Math.floor(a.anim * 5) % 2 : 0];
      if (a.z > 0) ring(a.x, a.y, Math.max(3, 18 - a.z / 8), 1, P.blood);
      drawSprite(s, a.x - s.w / 2 + (a.punch > 0 ? a.face * 2 : 0), a.y - s.h + 1 - (a.z || 0), a.face < 0, a.z > 0 ? '#ffb347' : null);
      glow(a.x, a.y - 14 - (a.z || 0), '#ffb347', 8, 0.35);
    },
  },
  clone: {
    update(a, dt) {
      a.cd -= dt;
      if (a.cd <= 0) {
        a.cd = 0.45;
        const live = G.E.filter(alive);
        if (!live.length) return;
        const e = live[Math.floor(rnd(live.length))], side = Math.random() < 0.5 ? -1 : 1;
        G.ghosts.push({ x: a.x, y: a.y, flip: a.face < 0, t: 0, life: 0.2, c: '#3b2a66', spr: SPR.chars.NINJA.idle });
        a.x = clamp(e.x - side * 12, B.x0 + 6, B.x1 - 6); a.y = clamp(e.y + rnd(-3, 3), B.y0 + 6, B.y1 - 4);
        a.face = side;
        const ang = Math.atan2(e.y - a.y, e.x - a.x);
        G.slashes.push({ follow: false, x: a.x, y: a.y, a: ang, r: 22, arc: 2.6, dir: Math.random() < 0.5 ? 1 : -1, t: 0, life: 0.16, th: 7, col: 'hex' });
        damage(e, pd(6), { dir: ang, kb: 120, src: 'dash', slice: true });
        A.swing(0);
      }
    },
    draw(a) {
      const s = SPR.chars.NINJA.idle;
      ctx.globalAlpha = 0.85;
      drawSprite(s, a.x - s.w / 2, a.y - s.h + 1, a.face < 0, '#3b2a66');
      ctx.globalAlpha = 1;
      px(a.x + (a.face < 0 ? -2 : 2), a.y - 9, P.blood);
      glow(a.x, a.y - 7, P.hex, 8, 0.3);
    },
  },
};


// ---------- THE DEV: secret fighter. Weak at first, scales with every wave and every 20 kills ----------
const GREEN = '#39ff6a';
const devVer = () => Math.min(99, 1 + Math.floor(G.kills / 20));
const devScale = () => 0.5 + 0.05 * (G.wave - 1) + 0.025 * (devVer() - 1);
function bugHit(e, n = 1) {
  if (e.dead || e.dying) return;
  e.bugs = (e.bugs || 0) + n;
  if (e.bugs >= 5 - G.up.overflow) {
    e.bugs = 0;
    glitch(e.x, e.y - e.r, 22, 16, 0.35, 14);
    addText(e.x, e.y - e.r * 2 - 14, 'CRASHED', GREEN);
    A.zip(); A.hit(true, false); shake(0.2);
    for (let i = 0; i < 10; i++) { const a = rnd(TAU), v = rnd(60, 200); part(e.x, e.y - e.r, Math.cos(a) * v, Math.sin(a) * v, 0.3, Math.random() < 0.5 ? GREEN : P.paper, { drag: 6, glow: true }); }
    const ex = e.x, ey = e.y;
    damage(e, pd(12), { dir: rnd(TAU), kb: 140, src: 'bolt', slice: true });
    if (G.up.fork) G.timers.push({ t: 0.1, fn: () => { for (const o of G.E) if (alive(o) && o !== e && hyp(o.x - ex, o.y - ey) < 50) { G.bolts.push({ x0: ex, y0: ey - 6, x1: o.x, y1: o.y - o.r, t: 0, life: 0.2, c1: P.paper, c2: GREEN, c3: '#1a6a2a' }); bugHit(o, 2); } } });
  }
}
function devEntrance() {
  const p = G.p, k = { t: 0, life: 1.6 };
  p.state = 'cine';
  const line1 = '> ./dev.exe';
  k.update = (dt) => {
    k.t += dt;
    if (k.t < 1 && Math.random() < 0.7) glitch(p.x + rnd(-30, 30), p.y - 8 + rnd(-20, 20), 10, 4, 0.15, 4);
    if (Math.floor(k.t * 14) !== Math.floor((k.t - dt) * 14) && k.t < 0.8) A.click();
    if (k.t >= 1 && !k.hit) { k.hit = true; flash(GREEN, 0.15, false); addRing(p.x, p.y - 6, GREEN, 260, 0.4, 2); glitch(p.x, p.y - 8, 30, 24, 0.4, 20); A.zap(); shake(0.4); }
    if (k.t >= k.life) { G.cine = null; p.state = 'move'; p.inv = 0.5; }
  };
  k.draw = () => {
    const s = SPR.chars.DEV.idle, x = p.x - s.w / 2, y = p.y - s.h + 1;
    textO(line1.slice(0, Math.floor(k.t * 16)), p.x - 20, p.y - 30, GREEN);
    if (k.t > 0.6) {
      const q = Math.min(1, (k.t - 0.6) / 0.4), off = Math.round((1 - q) * 4);
      drawSprite(s, x - off, y, false, '#ff4fa8'); drawSprite(s, x + off, y, false, GREEN);
      if (q >= 1) drawSprite(s, x, y, false);
    }
  };
  return k;
}
CHARS.DEV = {
  id: 'DEV', name: 'THE DEV', alias: 'ROOT', color: () => GREEN,
  desc: ['STARTS WEAK. GETS STRONGER', 'EVERY WAVE AND EVERY 20 KILLS'], tip: '5 HITS CRASH A FOE',
  bars: { power: 1, speed: 4, range: 4, tough: 1 },
  stats: { hp: 6, speed: 98 }, dash: { speed: 420, time: 0.09, cd: 0.45, charges: 1 }, ultRate: 1, energyHit: 1,
  primaryName: 'PING',
  dmgScale: devScale,
  init: () => ({ fireT: 0, wall: 0, wallT: 0, flashT: 0, marks: [] }),
  primary(p, dt, held) {
    const k = p.k, v = devVer();
    k.fireT -= dt; k.flashT -= dt;
    if (held && k.fireT <= 0) {
      k.fireT = (0.24 / G.up.spd) * Math.max(0.45, 1 - (v - 1) * 0.02) / (p.ascend > 0 ? 1.4 : 1);
      const n = Math.min(5, 1 + Math.floor((v - 1) / 8)), [hx, hy] = hand(p, Math.cos(p.aim) < 0);
      for (let i = 0; i < n; i++) {
        const a = p.aim + (i - (n - 1) / 2) * 0.14;
        shoot({ x: hx + Math.cos(a) * 6, y: hy + Math.sin(a) * 6, a, sp: 330, dmg: pd(2), kb: 40, life: 0.75, kind: 'packet', c: GREEN, trail: false, onHit: (e, killed) => { if (!killed) bugHit(e); } });
      }
      k.flashT = 0.04; A.charAtk('DEV', false, v);
    }
  },
  update(p, dt) {
    const k = p.k;
    if (k.wall > 0) {
      k.wall -= dt; k.wallT -= dt;
      for (const s of G.shots) if (s.owner === 'enemy' && !s.dead && hyp(s.x - p.x, s.y - (p.y - 6)) < 38) { s.dead = true; glitch(s.x, s.y, 8, 4, 0.15, 4); }
      if (k.wallT <= 0) {
        k.wallT = 0.25;
        for (const e of G.E) if (alive(e) && hyp(e.x - p.x, e.y - p.y) < 40) { damage(e, pd(3), { dir: Math.atan2(e.y - p.y, e.x - p.x), kb: 170, src: 'bolt' }); bugHit(e); }
      }
    }
    for (const m of k.marks) m.t -= dt;
    k.marks = k.marks.filter((m) => m.t > -0.2);
  },
  q: {
    name: 'EXPLOIT', cost: 30, cd: 2, icon: 'eye', desc: 'MARK A GROUP, HACK THEM ALL',
    use(p) {
      const n = Math.min(10, 2 + Math.floor(devVer() / 4));
      const targets = G.E.filter((e) => alive(e) && hyp(e.x - p.x, e.y - p.y) < 220).sort((a, b) => hyp(a.x - p.x, a.y - p.y) - hyp(b.x - p.x, b.y - p.y)).slice(0, n);
      if (!targets.length) return false;
      for (const e of targets) {
        if (e.type !== 'boss') e.marked = 0.5;
        p.k.marks.push({ e, t: 0.5 });
        G.bolts.push({ x0: p.x, y0: p.y - 8, x1: e.x, y1: e.y - e.r, t: 0, life: 0.25, c1: P.paper, c2: GREEN, c3: '#1a6a2a' });
      }
      A.rift();
      G.timers.push({ t: 0.5, fn: () => {
        for (const e of targets) {
          if (!alive(e)) continue;
          glitch(e.x, e.y - e.r, 24, 18, 0.35, 14);
          damage(e, pd(14), { dir: rnd(TAU), kb: 120, src: 'rift', slice: true });
          bugHit(e, 3);
        }
        A.riftCut(); shake(0.4); hitstop(0.05);
      } });
    },
  },
  e: {
    name: 'FIREWALL', cost: 40, cd: 6, icon: 'shield', desc: 'DELETES BULLETS, FRIES FOES',
    use(p) { p.k.wall = 4; p.k.wallT = 0; A.shieldUp(); glitch(p.x, p.y - 8, 40, 30, 0.3, 16); },
  },
  r: {
    name: 'RM -RF', icon: 'burst', desc: 'DELETE EVERYTHING ON SCREEN',
    use(p) {
      const cmd = '$ sudo rm -rf /enemies' + (G.up.evoUlt ? ' --no-preserve-root' : '');
      const u = { t: 0, done: false };
      p.state = 'cine'; p.vx = p.vy = 0;
      A.ultStart();
      G.cine = {
        update(dt) {
          u.t += dt;
          if (u.t < 0.9 && Math.floor(u.t * 24) !== Math.floor((u.t - dt) * 24)) A.click();
          if (u.t > 0.9 && Math.random() < 0.8) glitch(fx.cam.x + rnd(W), fx.cam.y + rnd(H), 40, 6, 0.2, 10);
          if (u.t > 1.4 && !u.done) {
            u.done = true;
            G.cine = null; p.state = 'move'; p.inv = 0.8;
            const mul = G.up.evoUlt ? 1.6 : 1;
            for (const e of G.E) {
              if (!alive(e)) continue;
              glitch(e.x, e.y - e.r, 28, 22, 0.5, 18);
              damage(e, e.type === 'boss' ? Math.round(e.maxHp * 0.08 * mul) + pd(40) : pd(60 * mul), { dir: rnd(TAU), kb: 240, src: 'ult', slice: true, crit: true });
            }
            if (G.up.evoUlt) for (const s of G.shots) if (s.owner === 'enemy') s.dead = true;
            flash(GREEN, 0.35, true); shake(1); hitstop(0.14); A.ultRelease();
            addText(p.x, p.y - 28, G.E.some(alive) ? 'PERMISSION DENIED' : 'DONE', GREEN, 2);
          }
        },
        draw() {
          ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
          if (u.t > 0.9) for (let i = 0; i < 10; i++) { const y = Math.floor(rnd(H)), h = Math.floor(rnd(2, 10)); ctx.drawImage(canvas, 0, y, W, h, Math.round(rnd(-14, 14)), y, W, h); }
          ctx.globalAlpha = 0.9; ctx.fillStyle = '#05140a'; ctx.fillRect(20, H - 46, W - 40, 30); ctx.globalAlpha = 1;
          rect(20, H - 46, W - 40, 1, GREEN);
          text(cmd.slice(0, Math.floor(Math.min(1, u.t / 0.85) * cmd.length)) + (Math.floor(u.t * 6) % 2 ? '_' : ''), 26, H - 40, GREEN);
          if (u.t > 0.9) text('DELETING ' + G.E.filter(alive).length + ' PROCESSES...', 26, H - 30, P.paper);
          ctx.restore();
        },
      };
      glitch(p.x, p.y - 8, 40, 30, 0.5, 20);
    },
  },
  drawWeapon(p, flip) {
    const [hx, hy] = hand(p, flip), d = flip ? -1 : 1;
    rect(hx + (flip ? -6 : 0), hy - 1, 6, 1, '#3a3f4a');
    rect(hx + (flip ? -6 : 0), hy - 5, 6, 4, '#1f232c');
    rect(hx + (flip ? -5 : 1), hy - 4, 4, 2, p.k.flashT > 0 ? P.paper : GREEN);
    glow(hx + d * 3, hy - 3, GREEN, 6, p.k.flashT > 0 ? 0.7 : 0.3);
  },
  draw(p) {
    const k = p.k;
    if (k.wall > 0) {
      const R = 36, blink = k.wall < 1 && Math.floor(G.time * 10) % 2;
      if (!blink) for (let i = 0; i < 28; i++) { const a = G.time * 1.8 + (i * TAU) / 28; px(p.x + Math.cos(a) * R, p.y - 6 + Math.sin(a) * R * 0.8, i % 3 ? GREEN : P.paper); }
      glow(p.x, p.y - 6, GREEN, R, 0.12);
    }
    for (const m of k.marks) {
      if (m.t <= 0 || m.e.dead) continue;
      const e = m.e, s = Math.floor(G.time * 20) % 2 ? GREEN : P.paper, w = e.r + 5;
      text('[', e.x - w - 3, e.y - e.r - 2, s); text(']', e.x + w, e.y - e.r - 2, s);
    }
  },
  hud(p, x, y) { textO('V' + devVer() + '  POWER ' + Math.round(devScale() * 100) + '%', x, y, GREEN); },
  entrance: devEntrance,
};

// ---------- signature flair: small effects each fighter gives off ----------
const behindX = (p, d) => p.x - (Math.cos(p.aim) < 0 ? -d : d);
const FLAIR = {
  DEV(p, dt) {
    if (Math.random() < dt * 8) part(p.x + rnd(-7, 7), p.y - rnd(0, 16), 0, -rnd(10, 30), rnd(0.4, 0.8), Math.random() < 0.7 ? '#39ff6a' : P.paper, { drag: 1 });
    if (Math.random() < dt * 0.6) glitch(p.x + rnd(-6, 6), p.y - rnd(4, 14), 10, 3, 0.1, 3);
  },
  BLADE(p, dt, moving) {
    if (Math.random() < dt * (moving ? 30 : 6)) part(behindX(p, 5), p.y - 9 + rnd(-1, 1), (Math.cos(p.aim) < 0 ? 1 : -1) * rnd(10, 30), -rnd(5, 20), rnd(0.3, 0.6), Math.random() < 0.5 ? P.ember : P.ember2, { drag: 2, glow: true });
  },
  GUNNER(p, dt, moving) {
    if (moving && Math.random() < dt * 8) dust(p.x, p.y, 1, 25);
    if (Math.random() < dt * 0.7) part(p.x + rnd(-4, 4), p.y - 15, 0, -8, 0.25, P.gold, { glow: true, drag: 1 });
  },
  WIZARD(p, dt) {
    if (Math.random() < dt * 10) part(p.x + rnd(-6, 6), p.y - rnd(0, 14), rnd(-5, 5), -rnd(10, 25), rnd(0.4, 0.8), Math.random() < 0.5 ? '#b48cff' : '#62efff', { drag: 1, glow: true });
  },
  NINJA(p, dt, moving) {
    if (Math.random() < dt * (moving ? 45 : 8)) part(behindX(p, 4), p.y - 9, (Math.cos(p.aim) < 0 ? 1 : -1) * rnd(20, 50), rnd(-6, 6), rnd(0.2, 0.4), P.blood, { drag: 3 });
    p.k.shadowT = (p.k.shadowT || 0) - dt;
    if (moving && p.k.shadowT <= 0) { p.k.shadowT = 0.08; ghost(p, '#2a1f4a'); }
  },
  MECHANIC(p, dt) {
    const bx = p.x - (Math.cos(p.aim) < 0 ? -5 : 5);
    if (Math.random() < dt * 14) part(bx + rnd(-1, 1), p.y - 19, rnd(-6, 6), -rnd(20, 45), rnd(0.2, 0.4), Math.random() < 0.5 ? P.ember : P.ember2, { drag: 2, glow: true });
    if (Math.random() < dt * 2.5) { const x = p.x + (Math.cos(p.aim) < 0 ? -6 : 6); for (let i = 0; i < 4; i++) part(x, p.y - 6, rnd(-60, 60), -rnd(20, 80), rnd(0.2, 0.4), Math.random() < 0.5 ? P.gold : P.paper, { z: 2, vz: rnd(20, 60), g: 260, drag: 2, glow: true }); }
  },
  TANK(p, dt, moving) {
    if (Math.random() < dt * 2) for (const side of [-6, 6]) part(p.x + side, p.y - 14, rnd(-5, 5), -rnd(15, 30), rnd(0.5, 0.9), '#8fa2bd', { drag: 1.5 });
    p.k.stompT = (p.k.stompT || 0) - dt;
    if (moving && p.k.stompT <= 0) { p.k.stompT = 0.32; dust(p.x, p.y, 5, 45); shake(0.03); }
  },
  ROBOT(p, dt) {
    if (Math.random() < dt * 30) part(p.x + rnd(-3, 3), p.y + 1, rnd(-10, 10), rnd(20, 50), rnd(0.12, 0.25), Math.random() < 0.5 ? P.volt : P.paper, { drag: 4, glow: true });
  },
};
const AURA = {
  WIZARD(p) {
    for (let i = 0; i < 3; i++) {
      const a = G.time * 2.5 + (i * TAU) / 3, x = p.x + Math.cos(a) * 11, y = p.y - 8 + Math.sin(a) * 4;
      px(x, y, i === 0 ? '#62efff' : '#b48cff'); glow(x, y, '#b48cff', 4, 0.5);
    }
  },
  DEV(p) {
    // two holo-screens orbit The Dev, scrolling code
    for (let i = 0; i < 2; i++) {
      const a = G.time * 1.3 + i * Math.PI, x = Math.round(p.x + Math.cos(a) * 15 - 4), y = Math.round(p.y - 16 + Math.sin(a) * 5);
      ctx.globalAlpha = 0.55; rect(x, y, 9, 7, '#0b2a16'); ctx.globalAlpha = 1;
      rect(x, y, 9, 1, '#39ff6a'); rect(x, y + 6, 9, 1, '#1a7a3a');
      for (let r = 0; r < 3; r++) rect(x + 1, y + 2 + r * 1.5, 2 + ((Math.floor(G.time * 8) + r * 3 + i) % 6), 1, r === 1 ? P.paper : '#39ff6a');
      glow(x + 4, y + 3, '#39ff6a', 6, 0.35);
    }
  },
  ROBOT(p) { glow(p.x, p.y, P.volt, 8 + Math.sin(G.time * 30), 0.35); glow(p.x, p.y - 8, P.volt, 5 + Math.sin(G.time * 6) * 2, 0.35); },
  BLADE(p) { glow(p.x, p.y - 8, P.ember, 12, 0.12); },
  TANK(p) { glow(p.x, p.y - 12, '#ff9a3c', 6, 0.25); },
};
const EYES = { DEV: '#39ff6a', WIZARD: '#62efff', NINJA: '#ff4f7a', MECHANIC: '#ff9a3c', TANK: '#ff9a3c', ROBOT: '#ff3b3b', GUNNER: '#ffd447', BLADE: '#ffb04a' };
for (const id in CHARS) { CHARS[id].flair = FLAIR[id]; CHARS[id].drawAura = AURA[id]; CHARS[id].eyeColor = EYES[id]; }

// ---------- heroes: names, lore, and the mission that unlocks each one ----------
const pct = (v, max) => Math.min(v, max) + ' / ' + max;
const META = {
  BLADE: { hero: 'KAEL', lore: ['THE LAST GUARD OF THE PIT. HIS BLADE', 'HOLDS THE FINAL EMBER OF THE OLD SUN.'] },
  GUNNER: { hero: 'VEGA HALE', lore: ['A BOUNTY HUNTER WHO FOLLOWED ONE', 'BOUNTY TOO DEEP INTO THE PIT.'], mission: ['REACH WAVE 10', () => 'BEST WAVE ' + pct(best.wave, 10)] },
  WIZARD: { hero: 'MORROW', lore: ['A WARLOCK WHO TRADED HIS FACE', 'FOR THE NAMES OF THE STARS.'], mission: ['LAND A 100-HIT COMBO', () => 'BEST COMBO ' + pct(best.combo, 100)] },
  NINJA: { hero: 'RIN', lore: ['A STUDENT BY DAY, THE LAST HEIR OF', 'THE RED ONI CLAN BY NIGHT.'], mission: ['25 PERFECT DODGES IN ONE RUN', () => 'BEST ' + pct(best.perfects, 25)] },
  MECHANIC: { hero: 'RIVET', lore: ['A SALVAGER WHO BUILDS HER WEAPONS', 'FROM WHAT THE COLOSSUS LEFT BEHIND.'], mission: ['KILL 1500 ENEMIES IN TOTAL', () => 'KILLS ' + pct(best.kills, 1500)] },
  TANK: { hero: 'GROM', lore: ["THE LAST KNIGHT OF THE KING'S GUARD.", 'HE CAME BACK TO END WHAT HE SERVED.'], mission: ['BEAT A BOSS WITHOUT GETTING HIT', () => 'ANY BOSS, ANY FIGHTER'] },
  ROBOT: { hero: 'UNIT-7', lore: ['A WAR MACHINE THAT WOKE UP WITH', 'ONE ORDER LEFT: STOP THE KING.'], mission: ['DEFEAT THE ASHEN KING', () => (best.won ? 'DONE' : 'THE KING WAITS AT WAVE 20')] },
  DEV: { hero: 'THE DEV', lore: ['THE ONE WHO WROTE THIS WORLD.', 'NOW DEBUGGING IT FROM THE INSIDE.'], mission: ['REACH WAVE 50', () => 'BEST WAVE ' + pct(best.wave, 50)] },
};
for (const id in META) Object.assign(CHARS[id], META[id]);
