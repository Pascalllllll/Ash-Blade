import { ctx, canvas, W, H, FW, SX, SS, stageTransform, fillScreen, P, rect, px, line, disc, ring, drawSprite, glow, text, textO } from './gfx.js?v=203';
import { heroEntrance } from './entrances.js?v=203';
import { SPR } from './sprites.js?v=203';
import { A } from './audio.js?v=203';
import { input } from './input.js?v=203';
import { best } from './store.js?v=203';
import {
  G, fx, B, TAU, rnd, clamp, hyp, alive, segDist, part, sparks, dust, addText, addRing, ghost, damage, ignite, pd, shoot,
  chainLightning, parry, hitstop, shake, flash, beamLen, scorch, sprFor, aimAssist, glitch, buzz, shadow, chargeLevel, kick, handPoint, eraseShots, heroSet } from './world.js?v=203';

// ---------- helpers ----------
// an enemy shot a parry can send back (not the red-ringed ones, nor the Colossus fist that flies home)
const canParry = (s) => s.owner === 'enemy' && !s.dead && !s.noparry && !s.ret && !s.fist;
function drawBladeSilhouette(p, progress, color) {
  const frames = heroSet().act.ultimate;
  const sprite = frames[clamp(Math.floor(progress * frames.length), 0, frames.length - 1)];
  drawSprite(sprite, p.x - sprite.w / 2, p.y - sprite.h + 1, Math.cos(p.aim) < 0, color);
}
const STORM_R = 26;
function aimPoint(p, max, intent=p.castAim) {
  let x,y;
  if (intent) {
    const r=max*intent.k; x=p.x+Math.cos(intent.a)*r; y=p.y+Math.sin(intent.a)*r;
  } else if (input.device==='mouse') {
    x=input.mouse.x+fx.cam.x; y=input.mouse.y+fx.cam.y;
  } else {
    aimAssist(); x=p.x+Math.cos(p.aim)*max; y=p.y+Math.sin(p.aim)*max;
  }
  const d=hyp(x-p.x,y-p.y);
  if (d>max) { x=p.x+(x-p.x)*max/d; y=p.y+(y-p.y)*max/d; }
  return [clamp(x,B.x0+6,B.x1-6),clamp(y,B.y0+6,B.y1-4)];
}
const blizzardRadius=()=>G.up.evoTwin?66:G.up.twin?52:40;
const placedAt = range => (p, intent) => aimPoint(p, range, intent);
const TURRET_RANGE = 150, COIL_RANGE = 75, TITAN_LANDING = 120, ORBITAL_RADIUS = 20;
const stepTarget=(p,a,len)=>[
  clamp(p.x+Math.cos(a)*len,B.x0+p.r,B.x1-p.r),
  clamp(p.y+Math.sin(a)*len,B.y0+p.r,B.y1-2),
];
const skillAreas={
  BLADE:{q:'rift',e:70}, GUNNER:{q:'buckshot'}, WIZARD:{q:'missiles',e:'blizzard'},
  NINJA:{q:'senko',e:STORM_R}, MECHANIC:{q:'turret',e:'coil',r:'titan'},
  TANK:{q:'bulldoze',e:110,r:56}, ROBOT:{q:'salvo',e:60,r:'orbital'}, DEV:{e:40},
};
export const previewable=(id,key)=>skillAreas[id]?.[key]!==undefined;
export function skillPreview(p,key,drag) {
  const area=skillAreas[G.char]?.[key]; if(area===undefined) return null;
  const a=drag.active?drag.a:p.aim, intent={a,k:drag.active?drag.k:1};
  if(typeof area==='number') return {x:p.x,y:p.y,r:area};
  const target = G.kit[key].target;
  if (target) {
    const [x, y] = target(p, intent);
    const r = { blizzard: blizzardRadius(), turret: TURRET_RANGE, coil: COIL_RANGE, titan: TITAN_LANDING, orbital: ORBITAL_RADIUS }[area];
    return { x, y, r };
  }
  if(area==='rift'||area==='bulldoze') {
    const [x,y]=stepTarget(p,a,area==='rift'?104:135);
    return {x0:p.x,y0:p.y,x,y,width:area==='rift'?10:12};
  }
  const [x0,y0]=area==='salvo'?[p.x,p.y-10]:weaponTip(p,a);
  if(area==='senko') { const length=beamLen(x0,y0,a,320); return {x0,y0,x:x0+Math.cos(a)*length,y:y0+Math.sin(a)*length,width:6}; }
  const spread=area==='buckshot'?0.42:area==='salvo'?0.9:1.1;
  return {x0,y0,a,spread,length:area==='buckshot'?144:65};
}
// the hand: each hero's own grip point on the side they face (world.js handPoint), where the weapon's grip sits too
const hand = (p) => handPoint(p);
// the tip of the held weapon along angle a (the end of Morrow's staff, the muzzle of Vega's revolver)
const weaponTip = (p, a) => {
  const left = (p.softFacingDirection || 1) < 0, [hx, hy] = hand(p), w0 = SPR.weapons?.[G.char], w = G.evo === true && w0?.evo ? w0.evo : w0;
  if (!w) return [hx + Math.cos(a) * 8, hy + Math.sin(a) * 8];
  // along the aim, and across it (flipped when the weapon is mirrored for aiming left)
  const c = w.across * (left ? -1 : 1);
  return [hx + Math.cos(a) * w.along - Math.sin(a) * c, hy + Math.sin(a) * w.along + Math.cos(a) * c];
};
// a charged swing sends the enemy shots in its arc back where they came from (Kael, Rivet and Grom): within R of
// the fighter and inside arc (radians) around the angle a. The first one of a swing makes the loud parry.
function parryArc(p, a, R, arc, act) {
  for (const s of G.shots) {
    if (!canParry(s)) continue;
    const dx = s.x - p.x, dy = s.y - (p.y - 6), d = hyp(dx, dy), sa = Math.atan2(dy, dx);
    if (d > R + s.r + 4 || Math.abs(Math.atan2(Math.sin(sa - a), Math.cos(sa - a))) > arc / 2) continue;
    parry(s, sa, !!act.parried);
    act.parried = true;
  }
}
const nearest = (x, y, range, skip) => {
  let best = null, bd = range;
  for (const e of G.E) { if (!alive(e) || (skip && skip.has(e))) continue; const d = hyp(e.x - x, e.y - y); if (d < bd) { bd = d; best = e; } }
  return best;
};
function muzzle(x, y, a, c, n = 5) { for (let i = 0; i < n; i++) { const s = a + rnd(-0.4, 0.4), v = rnd(60, 180); part(x, y, Math.cos(s) * v, Math.sin(s) * v, rnd(0.05, 0.12), Math.random() < 0.5 ? P.paper : c, { drag: 10, glow: true, keep: true }); } }

// ---------- charged attacks ----------
// f is the charge, 0.15..1: damage, reach and spread scale with it, so a half charge is half the attack.
// where a charged attack goes: on a phone, the way the attack button was last dragged while charging; on a
// computer, at the mouse (even after attacking with J); keyboard-only players get a light aim assist
const chargeAim = (p) => {
  if (p.chgDir != null) return (p.aim = p.chgDir);
  if (!input.touch && input.mouseUsed) return (p.aim = Math.atan2(input.mouse.y + fx.cam.y - (p.y - 6), input.mouse.x + fx.cam.x - p.x));
  if (input.device === 'keys') aimAssist();
  return p.aim;
};
// the weapon swings from drawn-back through to the aim over `dur` seconds
const swingThrough = (a, dur, from = 2.3) => (p) => { const k = Math.min(1, p.chg.t / dur), e = 1 - (1 - k) ** 3, back = Math.cos(a) < 0 ? 1 : -1; return a + back * from * (1 - e) - back * 0.9 * e; };
function burst(x, y, n, cols, v0, v1, o = {}) {
  for (let i = 0; i < n; i++) { const a = rnd(TAU), v = rnd(v0, v1); part(x, y, Math.cos(a) * v, Math.sin(a) * v * 0.6, rnd(0.3, 0.7), cols[i % cols.length], { drag: 3, keep: true, ...o }); }
}

// ---------- weapons drawn in hand ----------
export function swordAngle(p) {
  // winding up: the weapon drawn back over the shoulder, trembling harder as the charge fills
  if (p.state === 'charge') return p.aim + (Math.cos(p.aim) < 0 ? 1 : -1) * 2.3 + Math.sin(G.time * 50) * 0.06 * chargeLevel(p);
  if (p.state === 'chg' && p.chg?.ang) return p.chg.ang(p);
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
    desc: ['A FAST SWORD COMBO', 'AND TIME-STOPPING CUTS'], tip: 'HOLD CLICK, LET GO FOR A FIRE CRESCENT',
    bars: { power: 3, speed: 4, range: 2, tough: 3 },
    stats: { hp: 9, speed: 102 }, dash: { speed: 330, time: 0.14, cd: 0.9, recovery: 0.44, charges: 1 }, ultRate: 1, energyHit: 1.5,
    melee: {
      col: 'ember', steps: [
        // slash, X-cut, piercing thrust, whirlwind
        { reach: 31, arc: 2.6, dmg: 3, dur: 0.24, cancel: 0.12, lunge: 150, kb: 150, th: 8 },
        { reach: 31, arc: 2.6, dmg: 2, dur: 0.26, cancel: 0.14, lunge: 120, kb: 120, th: 7, shape: 'cross' },
        { reach: 46, arc: 0.7, dmg: 4, dur: 0.24, cancel: 0.12, lunge: 260, kb: 220, th: 5, shape: 'thrust' },
        { reach: 38, arc: Math.PI * 2, dmg: 6, dur: 0.4, cancel: 0.22, lunge: 60, kb: 280, th: 12, heavy: true, shape: 'spin' },
      ], slow: 1.35,
    },
    primaryName: 'SWORD COMBO',
    // hold: Ashen Crescent, a wide burning cut that throws a wave of fire ahead
    charge: {
      name: 'ASHEN CRESCENT', time: 0.8, move: 0.4,
      release(p, f) {
        const a = chargeAim(p), [hx, hy] = hand(p, Math.cos(a) < 0), R = 30 + 14 * f;
        p.vx = Math.cos(a) * (120 + 160 * f); p.vy = Math.sin(a) * (120 + 160 * f);
        G.slashes.push({ follow: true, x: p.x, y: p.y, a, r: R, arc: 3.4, dir: 1, t: 0, life: 0.26, th: 10 + 6 * f, col: f >= 1 ? 'gold' : 'ember' });
        for (const e of G.E) {
          if (!alive(e) || e.z > 8) continue;
          const d = hyp(e.x - p.x, e.y - p.y), ea = Math.atan2(e.y - p.y, e.x - p.x);
          if (d < R + e.r && Math.abs(Math.atan2(Math.sin(ea - a), Math.cos(ea - a))) < 1.8) damage(e, pd(16 * f), { dir: ea, kb: 160 + 200 * f, src: 'primary', ug: true, slice: true, heavy: true, crit: f >= 1 });
        }
        shoot({ x: hx + Math.cos(a) * 8, y: hy + Math.sin(a) * 8, a, sp: 260 + 120 * f, dmg: pd(12 * f), kb: 120 + 120 * f, life: 0.25 + 0.4 * f, kind: 'crescent', r: 4 + 6 * f, pierce: 99, c: f >= 1 ? P.gold : P.ember, ug: true, slice: true, trail: false });
        A.charAtk('BLADE', true, 3); A.rift(); shake(0.25 + 0.45 * f); kick(a, 2 + 3 * f); hitstop(0.03 + 0.05 * f);
        sparks(hx, hy, a, 10 + 14 * f, 0.6, P.ember2, 260);
        const act = { t: 0, ang: swingThrough(a, 0.08), update(p, dt) { this.t += dt; parryArc(p, a, R + 6, 3.6, this); return this.t >= 0.2; } };
        parryArc(p, a, R + 6, 3.6, act);
        return act;
      },
    },
    q: {
      name: 'RIFT', cost: 30, cd: 1.5, icon: 'blade', desc: 'BLINK AND CUT A LINE',
      use(p) {
        const a = p.aim, L = 104, x0 = p.x, y0 = p.y;
        const [x1,y1] = stepTarget(p,a,L);
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
        chainLightning({ x: p.x, y: p.y }, 4 + G.up.storm * 2 + (G.up.evoStorm ? 3 : 0), 6);
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
        A.ultStart(); shake(0.25);
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
              for (const c of u.cuts) for (let i = 0; i < 5; i++) { const k = rnd(-0.5, 0.5); part(c.x + Math.cos(c.a) * c.L * k, c.y + 5 + Math.sin(c.a) * c.L * k, rnd(-120, 120), rnd(-120, 120), rnd(0.2, 0.5), Math.random() < 0.5 ? P.paper : P.gold, { drag: 5, glow: true }); }
              for (const e of targets) if (alive(e)) damage(e, e.type === 'boss' ? pd(60 + e.maxHp * 0.06) : pd(40), { dir: rnd(TAU), kb: 240, src: 'ult', slice: true, crit: true });
              addRing(p.x, p.y - 6, P.gold, 380, 0.4, 3); addRing(p.x, p.y - 6, P.paper, 300, 0.3, 1);
              flash(P.paper, 0.35, true); shake(1); hitstop(0.14); A.ultRelease();
              G.slashes.push(...u.cuts.slice(0, 10).map((c) => ({ follow: false, x: c.x, y: c.y + 5, a: c.a, r: 18, arc: 1.2, dir: 1, t: 0, life: 0.25, th: 4, col: 'gold' })));
            }
          },
          draw(cx, cy) {
            const a = (u.phase === 'gather' ? Math.min(1, u.t / 0.4) : 1) * 0.86;
            ctx.globalAlpha = a; ctx.fillStyle = P.void; ctx.fillRect(cx - SX, cy, FW, H); ctx.globalAlpha = 1;
            for (const e of G.E) if (!e.dead) { const s = sprFor(e); drawSprite(s, e.x - s.w / 2, e.y - s.h + 1, e.face < 0, P.bone); }
            const progress = u.phase === 'gather' ? 0.32 * u.t / 0.5 :
              u.phase === 'cuts' ? 0.32 + 0.48 * u.i / u.n : 0.8 + 0.2 * u.t / 0.6;
            drawBladeSilhouette(p, progress, P.ember);
            for (const c of u.cuts) {
              const ux = (Math.cos(c.a) * c.L) / 2, uy = (Math.sin(c.a) * c.L) / 2;
              line(c.x - ux, c.y - uy + 1, c.x + ux, c.y + uy + 1, P.blood); line(c.x - ux, c.y - uy, c.x + ux, c.y + uy, P.paper);
            }
          },
        };
      },
    },
    drawWeapon: (p, flip) => drawBlade(p, flip, 12, P.bone, P.ember),
    entrance: () => heroEntrance('BLADE'),
  },

  GUNNER: {
    id: 'GUNNER', name: 'GUNNER', alias: 'VEGA', color: () => P.gold,
    desc: ['HOLD TO SHOOT, RELOAD', 'IS AUTOMATIC'], tip: 'HOLD CLICK TO SHOOT',
    bars: { power: 3, speed: 4, range: 5, tough: 2 },
    stats: { hp: 8, speed: 104 }, dash: { speed: 310, time: 0.15, cd: 0.4, charges: 1 }, ultRate: 0.8, energyHit: 0.4,
    primaryName: 'REVOLVER',
    init: () => ({ ammo: 14, reload: 0, fireT: 0, stand: 0, flashT: 0, marks: [] }),
    primary(p, dt, held) {
      const k = p.k, mag = Math.floor(14 * (1 + 0.5 * G.up.mag));
      k.fireT -= dt; k.flashT -= dt;
      if (k.stand > 0) {
        if (held && k.fireT <= 0) {
          k.fireT = 0.035;
          const a = p.aim + rnd(-0.12, 0.12), [hx, hy] = hand(p, Math.cos(p.aim) < 0), [tx, ty] = weaponTip(p, p.aim);
          shoot({ x: tx, y: ty, a, sp: 430, dmg: pd(3), kb: 90, life: 0.7, kind: 'bullet', pierce: 2, c: P.gold, ug: false });
          part(hx, hy, -Math.sin(a) * 60 + rnd(-20, 20), Math.cos(a) * 60, 0.5, P.gold2, { z: 6, vz: 60, g: 300, drag: 2 });
          k.flashT = 0.03; A.minigun(); shake(0.05);
          p.vx -= Math.cos(a) * 8; p.vy -= Math.sin(a) * 8;
        }
        return;
      }
      if (k.reload > 0) { k.reload -= dt; if (k.reload <= 0) { k.ammo = mag; A.reload(); } return; }
      if (held && k.fireT <= 0 && k.ammo > 0) {
        k.fireT = 0.11 / G.up.spd; k.ammo--;
        const a = p.aim + rnd(-0.05, 0.05), [hx, hy] = hand(p, Math.cos(p.aim) < 0), [tx, ty] = weaponTip(p, p.aim);
        shoot({ x: tx, y: ty, a, sp: 400, dmg: pd(2), kb: 70, life: 0.7, kind: 'bullet', pierce: G.up.pierce, c: P.gold });
        muzzle(tx, ty, a, P.gold, 3);
        part(hx, hy, -Math.sin(a) * 50 + rnd(-20, 20), Math.cos(a) * 50, 0.5, P.gold2, { z: 6, vz: 60, g: 300, drag: 2 });
        k.flashT = 0.04; A.charAtk('GUNNER'); shake(0.04);
        p.vx -= Math.cos(a) * 20; p.vy -= Math.sin(a) * 20;
        if (k.ammo <= 0) { k.reload = 0.9 / (1 + 0.3 * G.up.mag); A.click(); }
      }
    },
    update(p, dt) {
      const k = p.k;
      for (const m of k.marks) m.t -= dt;
      k.marks = k.marks.filter((m) => m.t > 0 && !m.e.dead);
      if (k.stand > 0) { k.stand -= dt; p.slowMul = 0.55; if (k.stand <= 0) { p.slowMul = 1; k.ammo = Math.floor(14 * (1 + 0.5 * G.up.mag)); } }
    },
    q: {
      name: 'BUCKSHOT', cost: 25, cd: 1.2, icon: 'burst', desc: 'POINT-BLANK SHOTGUN BLAST',
      use(p) {
        const [hx, hy] = weaponTip(p, p.aim);
        for (let i = 0; i < 11; i++) { const a = p.aim + rnd(-0.42, 0.42); shoot({ x: hx, y: hy, a, sp: rnd(300, 380), dmg: pd(3), kb: 220, life: 0.38, kind: 'pellet', c: P.ember2, ug: false }); }
        muzzle(...weaponTip(p, p.aim), p.aim, P.ember2, 14);
        p.vx = -Math.cos(p.aim) * 180; p.vy = -Math.sin(p.aim) * 180;
        p.state = 'recover'; p.recT = 0.15; p.k.flashT = 0.08;
        A.shotgun(); shake(0.35); hitstop(0.03);
      },
    },
    // Deadeye: time slows, she marks the closest foes on screen, then fans the hammer, one sure shot each.
    // No aiming needed; with fewer foes than shots, the spare shots go into the toughest one.
    e: {
      name: 'DEADEYE', cost: 35, cd: 3, icon: 'eye', desc: 'SLOW TIME, SIX SURE SHOTS',
      use(p) {
        const pool = G.E.filter((e) => alive(e) && !e.under && hyp(e.x - p.x, e.y - p.y) < 230).sort((a, b) => hyp(a.x - p.x, a.y - p.y) - hyp(b.x - p.x, b.y - p.y));
        if (!pool.length) return false;
        const shots = 6 + G.up.mag * 2, list = pool.slice(0, shots), tough = [...list].sort((a, b) => b.hp - a.hp)[0];
        while (list.length < shots) list.push(tough);
        A.reload(); flash(P.gold, 0.06, false);
        p.k.marks = list.map((e) => ({ e, t: 0.9 }));
        list.forEach((e, i) => G.timers.push({ t: 0.16 + i * 0.06, fn: () => {
          if (!alive(e)) return;
          const [hx, hy] = hand(p, e.x < p.x), a = Math.atan2(e.y - e.r - hy, e.x - hx);
          p.aim = a;
          const [tx, ty] = weaponTip(p, a);
          G.bolts.push({ x0: tx, y0: ty, x1: e.x, y1: e.y - e.r, t: 0, life: 0.12, c1: P.paper, c2: P.gold, c3: P.gold2 });
          muzzle(tx, ty, a, P.gold, 6);
          part(hx, hy, -Math.sin(a) * 50, Math.cos(a) * 50, 0.5, P.gold2, { z: 6, vz: 60, g: 300, drag: 2 });
          damage(e, pd(11), { dir: a, kb: 170, src: 'bolt', crit: true });
          sparks(e.x, e.y - e.r, a, 6, 0.5, P.gold, 200);
          p.k.flashT = 0.05; A.gun(); shake(0.12); hitstop(0.02);
        } }));
        addText(p.x, p.y - 24, 'DEADEYE', P.gold);
      },
    },
    r: {
      name: 'LAST STAND', icon: 'gun', desc: 'FOUR SECONDS OF MINIGUN',
      use(p) { p.k.stand = G.up.evoUlt ? 7 : 4; A.reload(); shake(0.3); },
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
    // Deadeye's crosshairs on every marked foe
    draw(p) {
      for (const m of p.k.marks) {
        const e = m.e, s = 4 + Math.round(m.t * 4), y = e.y - e.r, c = Math.floor(G.time * 20) % 2 ? P.gold : P.paper;
        ring(e.x, y, s, 1, c);
        line(e.x - s - 2, y, e.x - s + 1, y, c); line(e.x + s - 1, y, e.x + s + 2, y, c);
        line(e.x, y - s - 2, e.x, y - s + 1, c); line(e.x, y + s - 1, e.x, y + s + 2, c);
      }
    },
    hud(p, x, y) {
      const k = p.k, mag = Math.floor(14 * (1 + 0.5 * G.up.mag));
      if (k.stand > 0) { textO('MINIGUN ' + k.stand.toFixed(1), x, y, P.gold); return; }
      if (k.reload > 0) { textO('RELOADING', x, y, Math.floor(G.time * 8) % 2 ? P.gold : P.dust); return; }
      for (let i = 0; i < mag; i++) rect(x + (i % 21) * 3, y + Math.floor(i / 21) * 4, 2, 3, i < k.ammo ? P.gold : P.ink3);
    },
    entrance: () => heroEntrance('GUNNER'),
  },

  WIZARD: {
    id: 'WIZARD', name: 'WIZARD', alias: 'MOTH', color: () => '#b48cff',
    desc: ['HOMING MAGIC, ARCANE', 'MISSILES AND BLIZZARDS'], tip: 'E CALLS A BLIZZARD WHERE YOU AIM',
    bars: { power: 5, speed: 2, range: 4, tough: 1 },
    stats: { hp: 7, speed: 96 }, dash: { speed: 360, time: 0.12, cd: 0.5, charges: 1 }, ultRate: 1, energyHit: 1.5,
    primaryName: 'ARCANE BOLT',
    init: () => ({ fireT: 0, star: 0, starT: 0, castT: 0, volleys: [], missT: 0, rune: 0, bliz: [] }),
    primary(p, dt, held) {
      const k = p.k;
      k.fireT -= dt; k.castT -= dt;
      if (held && k.fireT <= 0) {
        k.fireT = 0.3 / G.up.spd; k.castT = 0.1;
        const [hx, hy] = weaponTip(p, p.aim);
        // awakened, his bolts are starfire: spinning gold stars with pink comet tails (world.js draws kind 'star')
        shoot({ x: hx, y: hy, a: p.aim, sp: 210, dmg: pd(5), kb: 80, life: 1.4, kind: G.evo === true ? 'star' : 'arcane', r: 3, c: G.evo === true ? '#ffd447' : '#b48cff', homing: 2.5, splash: { R: 14, dmg: pd(2) } });
        A.charAtk('WIZARD');
      }
    },
    update(p, dt) {
      const k = p.k;
      k.rune -= dt;
      // the missile volley leaves the staff one at a time
      if (k.volleys.length && (k.missT -= dt) <= 0) {
        const volley = k.volleys[0], aim = volley.aim ?? p.aim;
        if (--volley.remaining === 0) k.volleys.shift();
        k.missT = 0.07;
        const [tx, ty] = weaponTip(p, aim), a = aim + rnd(-1.1, 1.1);
        shoot({ x: tx, y: ty, a, sp: 190, power:'spell', dmg: pd(5), kb: 70, life: 1.8, kind: G.evo === true ? 'star' : 'arcane', r: 3, c: G.evo === true ? '#ffd447' : '#d8b8ff', homing: 7, splash: { R: 12, dmg: pd(2) } });
        sparks(tx, ty, a, 4, 0.5, '#b48cff', 120); A.zip();
      }
      // blizzards: ice rains inside the circle, every 0.3 s everything in it is cut and frozen
      for (const z of k.bliz) {
        z.t += dt; z.tick -= dt;
        for (let i = 0; i < 3; i++) if (Math.random() < dt * 30) { const b = rnd(TAU), r = Math.sqrt(Math.random()) * z.R; part(z.x + Math.cos(b) * r + 10, z.y + Math.sin(b) * r * 0.6 - 30, -50, 140, 0.22, Math.random() < 0.5 ? P.paper : P.volt, { drag: 0 }); }
        if (z.tick <= 0) {
          z.tick = 0.3;
          for (const e of G.E) if (alive(e) && hyp(e.x - z.x, e.y - z.y) < z.R + e.r) { damage(e, pd(3), { power:'spell', dir: rnd(TAU), kb: 10, src: 'bolt' }); if (e.type !== 'boss' && alive(e)) e.frozen = Math.max(e.frozen || 0, 0.8); }
        }
      }
      k.bliz = k.bliz.filter((z) => z.t < z.life);
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
    // Q: Arcane Missiles. A rune circle flares at his feet and violet missiles leave the staff one after another,
    // each hunting its own target.
    q: {
      name: 'ARCANE MISSILES', cost: 25, cd: 1.5, icon: 'orb', desc: 'A VOLLEY OF HOMING MISSILES',
      use(p) {
        p.k.volleys.push({ remaining: G.up.evoTwin ? 12 : G.up.twin ? 8 : 5, aim: input.device === 'touch' ? p.aim : null });
        p.k.missT = 0; p.k.castT = 0.5;
        addRing(p.x, p.y - 1, '#b48cff', 120, 0.3, 1); addRing(p.x, p.y - 1, P.paper, 80, 0.2, 1);
        p.k.rune = 0.5; A.magic(); A.sigil();
      },
    },
    // E: Blizzard. A frost storm on the aimed spot for 3 seconds: ice rains inside a rune circle, cutting and
    // freezing whatever stands in it (frozen enemies take 50% more damage, and Frostbite shatters them).
    e: {
      name: 'BLIZZARD', cost: 40, cd: 5, icon: 'snow', desc: 'A FREEZING STORM WHERE YOU AIM',
      target: placedAt(170),
      use(p, [x, y] = this.target(p)) {
        const R = blizzardRadius();
        p.k.bliz.push({ x, y, R, t: 0, life: 3, tick: 0 });
        addRing(x, y - 2, P.volt, R * 5, 0.3, 2); addRing(x, y - 2, P.paper, R * 3, 0.25, 1);
        A.freeze(); p.k.castT = 0.4; shake(0.15);
      },
    },
    r: {
      name: 'STARFALL', icon: 'star', desc: 'METEORS RAIN ON EVERY FOE',
      use(p) { p.k.star = G.up.evoUlt ? 4.4 : 2.6; p.k.starT = 0; A.ultStart(); flash('#b48cff', 0.15, false); },
    },
    draw(p) {
      const k = p.k;
      const runes = (x, y, R, col, spin, a = 1) => {
        ctx.globalAlpha = a;
        ring(x, y, R, 1, col);
        for (let i = 0; i < 8; i++) { const b = spin + (i * TAU) / 8; px(x + Math.cos(b) * (R - 3), y + Math.sin(b) * (R - 3) * 0.6, i % 2 ? P.paper : col); }
        ctx.globalAlpha = 1;
      };
      if (k.rune > 0) runes(p.x, p.y, 12, '#b48cff', G.time * 4, Math.min(1, k.rune * 3));
      for (const z of k.bliz) {
        const fade = Math.min(1, (z.life - z.t) * 3, z.t * 6);
        ctx.globalAlpha = 0.18 * fade; disc(z.x, z.y, z.R, P.volt2); ctx.globalAlpha = 1;
        runes(z.x, z.y, z.R, P.volt, -G.time * 2, fade);
        glow(z.x, z.y - 6, P.volt, z.R * 0.8, 0.18 * fade);
      }
    },
    drawWeapon(p, flip) {
      const [hx, hy] = hand(p, flip), tilt = flip ? 0.25 : -0.25;
      line(hx, hy + 5, hx + tilt * 14, hy - 9, '#7a5030');
      const tx = hx + tilt * 14, ty = hy - 10;
      disc(tx, ty, p.k.castT > 0 ? 2 : 1, '#b48cff'); px(tx, ty, P.paper);
      glow(tx, ty, '#b48cff', p.k.castT > 0 ? 10 : 6, p.k.castT > 0 ? 0.7 : 0.35);
    },
    entrance: () => heroEntrance('WIZARD'),
  },

  // Rin, samurai. (The id stays NINJA so saves and unlocks keep working.)
  NINJA: {
    id: 'NINJA', name: 'SAMURAI', alias: 'SAKURA', color: () => P.blood,
    desc: ['FAST KATANA, TWO DASHES,', 'CUTS THAT SEND SHOTS BACK'], tip: 'Q FIRES A LASER FROM THE SWORD',
    bars: { power: 4, speed: 5, range: 2, tough: 2 },
    stats: { hp: 9, speed: 118 }, dash: { speed: 380, time: 0.11, cd: 0.65, charges: 2 }, ultRate: 1.05, energyHit: 1.4,
    // Flash Strike: the first sword swing or skill within 0.6 s after a dash does 2.5x damage
    dashStrike: 2.5,
    melee: {
      col: 'blood', steps: [
        // quick cut, X-cut, lunging stab, iai draw (dashes through and cuts twice)
        // heavy, deliberate cuts (slow: each swing takes 2.6x as long to recover)
        { reach: 24, arc: 2.3, dmg: 6, dur: 0.15, cancel: 0.07, lunge: 170, kb: 80, th: 6 },
        { reach: 25, arc: 2.3, dmg: 8, dur: 0.2, cancel: 0.1, lunge: 150, kb: 80, th: 6, shape: 'cross' },
        { reach: 38, arc: 0.6, dmg: 8, dur: 0.16, cancel: 0.08, lunge: 300, kb: 120, th: 4, shape: 'thrust' },
        { reach: 36, arc: 1.2, dmg: 14, dur: 0.3, cancel: 0.15, lunge: 430, kb: 220, th: 9, heavy: true, shape: 'iai' },
      ], slow: 2.6,
    },
    primaryName: 'KATANA',
    // hold: Iai Dash. Hand on the hilt, then a flash-step through everything ahead; the cuts open a beat later.
    // Every enemy shot on the path is parried back.
    charge: {
      name: 'IAI DASH', time: 0.7, move: 0.35,
      release(p, f) {
        const a = chargeAim(p), L = 24 + 115 * f, x0 = p.x, y0 = p.y;
        const x1 = clamp(p.x + Math.cos(a) * L, B.x0 + p.r, B.x1 - p.r), y1 = clamp(p.y + Math.sin(a) * L, B.y0 + p.r, B.y1 - 2);
        const passed = new Set(), dmg = pd(26 * f);
        p.inv = Math.max(p.inv, 0.35);
        A.dash(); A.rift(); shake(0.1 + 0.2 * f);
        G.cuts.push({ x0, y0: y0 - 5, x1, y1: y1 - 5, a, t: 0, pend: 0.18 + 0.1 * f, marked: [], echo: 0, done: false, col: '#ff8fc8',
          fire(c) {
            for (const e of G.E) if (alive(e) && (passed.has(e) || segDist(e.x, e.y - e.r, c.x0, c.y0, c.x1, c.y1) < e.r + 8)) {
              damage(e, dmg, { dir: a + Math.PI / 2, kb: 100 + 180 * f, src: 'primary', ug: true, slice: true, heavy: true, crit: f >= 1 });
              sparks(e.x, e.y - e.r, a + Math.PI / 2, 8, 0.5, '#ffb7d5', 220);
            }
            for (let i = 0; i < 10 + 20 * f; i++) { const k = Math.random(); part(c.x0 + (c.x1 - c.x0) * k, c.y0 + (c.y1 - c.y0) * k, rnd(-40, 40), rnd(-50, 10), rnd(0.5, 1.1), Math.random() < 0.5 ? '#ffb7d5' : '#ff8fc8', { drag: 2, g: 40, keep: true }); }
            A.riftCut(); hitstop(0.03 + 0.08 * f); shake(0.2 + 0.5 * f); kick(a, 2 + 4 * f);
            if (f >= 1) flash('#ffb7d5', 0.1, false);
          } });
        return { t: 0, ang: () => a, update(p, dt) {
          this.t += dt;
          const k = Math.min(1, this.t / (0.06 + 0.05 * f));
          p.x = x0 + (x1 - x0) * k; p.y = y0 + (y1 - y0) * k; p.vx = p.vy = 0;
          for (const e of G.E) if (alive(e) && segDist(e.x, e.y - e.r, x0, y0 - 5, p.x, p.y - 5) < e.r + 8) passed.add(e);
          for (const s of G.shots) if (canParry(s) && segDist(s.x, s.y, x0, y0 - 5, p.x, p.y - 5) < s.r + 9) parry(s, a, true);
          ghost(p, '#ffb7d5');
          if (k >= 1) { p.vx = Math.cos(a) * 70; p.vy = Math.sin(a) * 70; return true; }
        } };
      },
    },
    init: () => ({ swallows: [], storm: 0, stormHit: 0, stormA: 0, beam: null }),
    // Q: Senko, the flash. She slashes and a beam of light shoots out of the blade across the arena in an instant:
    // huge damage to everything on the line, every enemy shot on it destroyed. Costly: 50 energy.
    q: {
      name: 'SENKO', cost: 50, cd: 2, icon: 'bolt', desc: 'A LASER FROM THE SWORD, HUGE DAMAGE',
      use(p) {
        const a = p.aim, [hx, hy] = weaponTip(p, a), L = beamLen(hx, hy, a, 320), x1 = hx + Math.cos(a) * L, y1 = hy + Math.sin(a) * L;
        for (const e of G.E) if (alive(e) && segDist(e.x, e.y - e.r, hx, hy, x1, y1) < e.r + 6) {
          damage(e, e.type === 'boss' ? pd(68) : pd(90), { dir: a, kb: 240, src: 'bolt', slice: true, crit: true, heavy: true });
          if (G.up.venom) ignite(e, 3, G.up.evoVenom ? 6 : 3, 'spell');
          sparks(e.x, e.y - e.r, a, 10, 0.5, '#ffb7d5', 260);
        }
        for (const s of G.shots) if (s.owner === 'enemy' && !s.dead && segDist(s.x, s.y, hx, hy, x1, y1) < s.r + 6) { s.dead = true; sparks(s.x, s.y, a, 4, 1, '#ffb7d5', 160); }
        p.k.beam = { x0: hx, y0: hy, x1, y1, t: 0, life: 0.32 };
        for (let i = 0; i < 40; i++) { const k = Math.random(); part(hx + (x1 - hx) * k, hy + (y1 - hy) * k, rnd(-40, 40) - Math.sin(a) * rnd(-30, 30), rnd(-50, 20), rnd(0.4, 0.9), Math.random() < 0.6 ? '#ffb7d5' : P.paper, { drag: 2, glow: true }); }
        G.slashes.push({ follow: true, x: p.x, y: p.y, a, r: 22, arc: 2.6, dir: 1, t: 0, life: 0.16, th: 8, col: 'blood' });
        // the recoil pushes her back a step
        p.vx = -Math.cos(a) * 140; p.vy = -Math.sin(a) * 140;
        p.state = 'recover'; p.recT = 0.18;
        A.riftCut(); A.zap(); A.charAtk('NINJA', 3);
        hitstop(0.08); shake(0.7); kick(a + Math.PI, 4); flash('#ffb7d5', 0.12, false);
      },
    },
    // E: Hana Arashi, the blossom storm. For 4 seconds a ring of petal blades whirls around her: it cuts
    // whatever comes close, parries every shot that reaches it, and she moves 25% faster.
    e: {
      name: 'HANA ARASHI', cost: 30, cd: 7, icon: 'shield', desc: 'A STORM OF BLADES AROUND YOU',
      use(p) {
        const k = p.k;
        k.storm = 4; k.stormHit = 0; p.slowMul = 1.25;
        for (const e of G.E) if (alive(e) && hyp(e.x - p.x, e.y - p.y) < STORM_R + e.r) damage(e, pd(6), { dir: Math.atan2(e.y - p.y, e.x - p.x), kb: 220, src: 'primary', ug: true, slice: true });
        addRing(p.x, p.y - 6, '#ffb7d5', 160, 0.3, 2); addRing(p.x, p.y - 6, P.paper, 110, 0.2, 1);
        A.shieldUp(); A.charAtk('NINJA', 3); shake(0.25);
      },
    },
    // the swallow cuts and the storm, every frame
    tick(p, dt) {
      const k = p.k;
      for (const w of k.swallows) {
        w.t += dt;
        if (!w.back) {
          const sp = 320 * Math.max(0, 1 - w.t / 0.34);
          w.x += Math.cos(w.a) * sp * dt; w.y += Math.sin(w.a) * sp * dt;
          if (w.t >= 0.34 || w.x < B.x0 || w.x > B.x1 || w.y < B.y0 || w.y > B.y1) { w.back = true; w.hit = new Set(); A.rift(); }
        } else {
          const ba = Math.atan2(p.y - 6 - w.y, p.x - w.x), d = hyp(p.x - w.x, p.y - 6 - w.y), sp = Math.min(420, 120 + (w.t - 0.34) * 900);
          w.a = ba; w.x += Math.cos(ba) * Math.min(d, sp * dt); w.y += Math.sin(ba) * Math.min(d, sp * dt);
          if (d < 8 || w.t > 2) w.done = true;
        }
        for (const e of G.E) if (alive(e) && !w.hit.has(e) && hyp(e.x - w.x, e.y - e.r - w.y) < e.r + 8) {
          w.hit.add(e);
          damage(e, pd(7), { dir: w.a, kb: 140, src: 'primary', ug: true, slice: true });
          if (G.up.venom) ignite(e, 3, G.up.evoVenom ? 6 : 3, 'weapon');
          sparks(e.x, e.y - e.r, w.a + Math.PI / 2, 5, 0.5, '#ffb7d5', 200);
        }
        for (const s of G.shots) if (canParry(s) && hyp(s.x - w.x, s.y - w.y) < s.r + 8) parry(s, w.a, true);
        if (Math.random() < dt * 40) part(w.x, w.y, rnd(-20, 20), rnd(-20, 20), 0.35, Math.random() < 0.6 ? '#ffb7d5' : P.paper, { drag: 3 });
      }
      k.swallows = k.swallows.filter((w) => !w.done);
      if (k.storm > 0) {
        k.storm -= dt; k.stormA += dt * 9; k.stormHit -= dt;
        if (k.stormHit <= 0) {
          k.stormHit = 0.2;
          for (const e of G.E) if (alive(e) && hyp(e.x - p.x, e.y - p.y) < STORM_R + e.r) damage(e, pd(3), { power:'spell', dir: Math.atan2(e.y - p.y, e.x - p.x), kb: 90, src: 'primary', ug: true, slice: true });
        }
        for (const s of G.shots) if (canParry(s) && hyp(s.x - p.x, s.y - (p.y - 6)) < STORM_R + s.r) parry(s, Math.atan2(s.y - (p.y - 6), s.x - p.x), true);
        if (Math.random() < dt * 30) { const b = rnd(TAU); part(p.x + Math.cos(b) * STORM_R, p.y - 6 + Math.sin(b) * STORM_R * 0.7, -Math.sin(b) * 60, Math.cos(b) * 40, 0.4, Math.random() < 0.6 ? '#ffb7d5' : '#ff8fb8', { drag: 2 }); }
        if (k.storm <= 0) { k.storm = 0; p.slowMul = 1; }
      }
    },
    r: {
      name: 'ISSEN', icon: 'cross', desc: 'STOP TIME, A CHAIN OF CUTS',
      use(p) {
        const hops = G.up.evoUlt ? 16 : 11;
        const u = { t: 0, phase: 'draw', i: 0, hopT: 0, ox: p.x, oy: p.y, hit: new Set(), path: [] };
        p.state = 'cine'; p.vx = p.vy = 0;
        A.ultStart(); shake(0.25);
        G.cine = {
          update(dt) {
            u.t += dt;
            if (u.phase === 'draw') { if (u.t > 0.35) { u.phase = 'hops'; u.t = 0; } return; }
            if (u.phase === 'hops') {
              u.hopT -= dt;
              while (u.hopT <= 0 && u.i < hops) {
                u.hopT += 0.06;
                const live = G.E.filter((e) => alive(e) && !e.under);
                if (!live.length) { u.i = hops; break; }
                // the nearest foe not cut yet, else the toughest
                const fresh = live.filter((e) => !u.hit.has(e)).sort((a, b) => hyp(a.x - p.x, a.y - p.y) - hyp(b.x - p.x, b.y - p.y));
                const e = fresh[0] || live.sort((a, b) => b.hp - a.hp)[0];
                const a = Math.atan2(e.y - p.y, e.x - p.x), x0 = p.x, y0 = p.y;
                ghost(p, '#29142e');
                p.x = clamp(e.x + Math.cos(a) * (e.r + 8), B.x0 + 6, B.x1 - 6); p.y = clamp(e.y + Math.sin(a) * 4, B.y0 + 6, B.y1 - 4); p.aim = a;
                u.path.push([x0, y0 - 6, p.x, p.y - 6]);
                u.hit.add(e);
                damage(e, e.type === 'boss' ? pd(10 + e.maxHp * 0.006) : pd(14), { dir: a, kb: 0, src: 'ult', slice: true, crit: true });
                for (let j = 0; j < 6; j++) part(e.x, e.y - e.r, rnd(-90, 90), rnd(-90, 90), rnd(0.3, 0.6), Math.random() < 0.6 ? '#ffb7d5' : P.paper, { drag: 4, glow: true });
                A.ultCut(u.i); shake(0.1); u.i++;
              }
              if (u.i >= hops) { u.phase = 'sheath'; u.t = 0; }
              return;
            }
            if (u.phase === 'sheath' && u.t > 0.45) {
              // the sword clicks home: everything she cut bursts
              G.cine = null; p.state = 'move'; p.inv = 0.8;
              for (const e of u.hit) if (alive(e)) damage(e, e.type === 'boss' ? pd(40 + e.maxHp * 0.04) : pd(30), { dir: rnd(TAU), kb: 260, src: 'ult', slice: true, crit: true, heavy: true });
              for (const [x0, y0, x1, y1] of u.path) for (let j = 0; j < 4; j++) { const k = Math.random(); part(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, rnd(-80, 80), rnd(-80, 80), rnd(0.4, 0.9), Math.random() < 0.6 ? '#ffb7d5' : P.paper, { drag: 3, glow: true }); }
              addRing(p.x, p.y - 6, '#ffb7d5', 360, 0.4, 3); addRing(p.x, p.y - 6, P.paper, 280, 0.3, 1);
              flash(P.paper, 0.3, true); shake(1); hitstop(0.14); A.click(); A.ultRelease();
              addText(p.x, p.y - 28, 'CHIN', P.paper, 2);
            }
          },
          draw(cx, cy) {
            ctx.globalAlpha = 0.55; ctx.fillStyle = '#2a0a1a'; ctx.fillRect(cx - SX, cy, FW, H); ctx.globalAlpha = 1;
            for (const [x0, y0, x1, y1] of u.path) { line(x0, y0 + 1, x1, y1 + 1, P.blood); line(x0, y0, x1, y1, P.paper); }
            // The cut is visible a moment before Rin's silhouette catches up.
            const progress = u.phase === 'draw' ? 0.32 * u.t / 0.35 :
              u.phase === 'hops' ? 0.32 + 0.48 * u.i / hops : 0.8 + 0.2 * u.t / 0.45;
            drawBladeSilhouette(p, progress, '#150d20');
            for (let i = 0; i < 6; i++) { const x = cx + ((G.time * 40 + i * 57) % 320), y = cy + ((G.time * 25 + i * 31) % 180); px(x, y, '#ffb7d5'); }
          },
        };
      },
    },
    drawWeapon(p, flip) {
      // sheathed while holding the stance: only the hilt shows at her hip
      if (p.state === 'charge') { const [hx, hy] = hand(p, flip), d = flip ? 1 : -1; line(hx, hy, hx + d * 6, hy + 2, '#3a2030', 2); line(hx - d * 1, hy - 1, hx + d * 1, hy + 1, '#c81e36'); return; }
      const a = p.state === 'attack' || p.state === 'chg' ? swordAngle(p) : p.aim + (flip ? -0.8 : 0.8), [hx, hy] = hand(p, flip), cx = Math.cos(a), cy = Math.sin(a);
      // katana: red-wrapped hilt, gold guard, a long slim steel blade with a bright edge at the tip
      line(hx - cx * 3, hy - cy * 3, hx, hy, '#c81e36');
      line(hx - cy * 1.5, hy + cx * 1.5, hx + cy * 1.5, hy - cx * 1.5, P.gold);
      line(hx + cx, hy + cy, hx + cx * 11, hy + cy * 11, '#d8e4f0');
      px(hx + cx * 11, hy + cy * 11, P.paper);
    },
    // the swallow cuts (a crescent facing the way it flies) and the storm's ring of petal blades
    draw(p) {
      const aw = G.evo === true;
      const bm = p.k.beam;
      if (bm) {
        bm.t += 1 / 60;
        const k = 1 - bm.t / bm.life, th = Math.max(1, Math.round((aw ? 12 : 7) * k));
        if (k <= 0) p.k.beam = null;
        else {
          for (let j = 0; j <= 1; j += 0.1) glow(bm.x0 + (bm.x1 - bm.x0) * j, bm.y0 + (bm.y1 - bm.y0) * j, '#ffb7d5', 10 + th, 0.35 * k);
          line(bm.x0, bm.y0, bm.x1, bm.y1, '#ff8fc8', th + 4); line(bm.x0, bm.y0, bm.x1, bm.y1, '#ffb7d5', th + 2); line(bm.x0, bm.y0, bm.x1, bm.y1, P.paper, Math.max(1, th - 2));
          glow(bm.x1, bm.y1, P.paper, 14 + th, 0.6 * k); glow(bm.x0, bm.y0, '#ffb7d5', 10 + th, 0.6 * k);
        }
      }
      // the swallow cut: a crescent facing the way it flies. Awakened, it is a big, very thick gold crescent
      // with a white edge, a glowing core and two fading afterimages behind it.
      const cres = (x, y, a, R, th, edge, body, alpha = 1) => {
        ctx.globalAlpha = alpha;
        for (let i = -6; i <= 6; i++) {
          const b = a + i * 0.2, r = R - Math.abs(i) * (R / 18);
          for (let d = 0; d < th; d++) px(x + Math.cos(b) * (r - d), y + Math.sin(b) * (r - d), d === 0 && Math.abs(i) < 4 ? edge : body);
        }
        ctx.globalAlpha = 1;
      };
      for (const w of p.k.swallows) {
        if (aw) {
          glow(w.x, w.y, '#ffb7d5', 18, 0.5);
          for (let g = 2; g >= 1; g--) cres(w.x - Math.cos(w.a) * g * 6, w.y - Math.sin(w.a) * g * 6, w.a, 11, 3, '#ffb7d5', '#ff8fc8', 0.25 / g);
          cres(w.x, w.y, w.a, 12, 5, P.paper, '#ffb7d5'); cres(w.x, w.y, w.a, 9, 1, '#ff8fb8', '#ff8fb8');
        } else {
          glow(w.x, w.y, '#ffb7d5', 10, 0.35);
          for (let i = -3; i <= 3; i++) { const b = w.a + i * 0.32, r = 7 - Math.abs(i) * 0.6; px(w.x + Math.cos(b) * r, w.y + Math.sin(b) * r, Math.abs(i) < 2 ? P.paper : '#ffb7d5'); px(w.x + Math.cos(b) * (r - 1), w.y + Math.sin(b) * (r - 1), '#ff8fc8'); }
        }
      }
      const k = p.k;
      if (k.storm > 0) {
        // the blossom storm: awakened, a thick double ring and longer, thicker blades
        const fade = Math.min(1, k.storm / 0.4);
        ctx.globalAlpha = 0.35 * fade; ring(p.x, p.y - 6, STORM_R, aw ? 3 : 1, '#ffb7d5'); if (aw) ring(p.x, p.y - 6, STORM_R + 5, 1, '#ff8fb8'); ctx.globalAlpha = fade;
        glow(p.x, p.y - 6, '#ffb7d5', STORM_R, (aw ? 0.2 : 0.12) * fade);
        for (let i = 0; i < 8; i++) {
          const b = k.stormA + (i * TAU) / 8, x = p.x + Math.cos(b) * STORM_R, y = p.y - 6 + Math.sin(b) * STORM_R * 0.7, L = aw ? 8 : 4;
          line(x, y, x - Math.sin(b) * L, y + Math.cos(b) * L * 0.75, i % 2 ? '#ffb7d5' : P.paper, aw ? 3 : 1);
        }
        ctx.globalAlpha = 1;
      }
    },
    entrance: () => heroEntrance('NINJA'),
  },

  MECHANIC: {
    id: 'MECHANIC', name: 'MECHANIC', alias: 'RIVET', color: () => '#ff8a3c',
    desc: ['BUILDS TURRETS AND', 'COILS THAT FIGHT FOR YOU'], tip: 'Q BUILDS A TURRET',
    bars: { power: 3, speed: 3, range: 3, tough: 3 },
    stats: { hp: 9, speed: 99 }, dash: { speed: 320, time: 0.14, cd: 0.4, charges: 1 }, ultRate: 1.1, energyHit: 2,
    melee: {
      col: 'ember', heavySfx: true, steps: [
        // swing, wrench twirl, ground slam
        { reach: 28, arc: 2.4, dmg: 4, dur: 0.3, cancel: 0.16, lunge: 120, kb: 180, th: 8 },
        { reach: 26, arc: Math.PI * 2, dmg: 4, dur: 0.34, cancel: 0.2, lunge: 60, kb: 220, th: 9, shape: 'spin' },
        { reach: 32, arc: 3, dmg: 9, dur: 0.46, cancel: 0.26, lunge: 140, kb: 320, th: 11, heavy: true, shape: 'slam' },
      ], slow: 1.3,
    },
    primaryName: 'WRENCH',
    // hold: Overclock Slam, the wrench crackling with current: it smashes the floor ahead, stuns, and arcs to more foes
    charge: {
      name: 'OVERCLOCK SLAM', time: 0.9, move: 0.4,
      release(p, f) {
        const a = chargeAim(p);
        A.heavySwing();
        return { t: 0, hit: false, ang: swingThrough(a, 0.1), update(p, dt) {
          this.t += dt; p.vx *= 0.85; p.vy *= 0.85;
          if (this.t < 0.22) parryArc(p, a, 34 + 20 * f, 3.4, this);
          if (!this.hit && this.t >= 0.1) {
            this.hit = true;
            const cx = p.x + Math.cos(a) * 16, cy = p.y + Math.sin(a) * 10, R = 20 + 34 * f;
            let first = null;
            for (const e of G.E) {
              if (!alive(e) || e.z > 8 || hyp(e.x - cx, e.y - cy) > R + e.r) continue;
              first = first || e;
              damage(e, pd(20 * f), { dir: Math.atan2(e.y - cy, e.x - cx), kb: 160 + 160 * f, src: 'primary', ug: true, heavy: true, crit: f >= 1 });
              if (e.type !== 'boss') e.stunT = Math.max(e.stunT, 0.4 + 1.1 * f);
            }
            if (first && f >= 0.5) chainLightning(first, Math.round(1 + 4 * f), 6 * f);
            addRing(cx, cy, P.paper, R / 0.25, 0.25, 2); addRing(cx, cy, P.volt, R / 0.35, 0.35, 2);
            for (let i = 0; i < 3 + 4 * f; i++) { const b = rnd(TAU), d = rnd(R * 0.4, R); G.bolts.push({ x0: cx, y0: cy - 2, x1: cx + Math.cos(b) * d, y1: cy + Math.sin(b) * d * 0.6, t: 0, life: 0.2 }); }
            burst(cx, cy, 12 + 20 * f, [P.volt, '#ff8a3c', P.paper], 60, 200, { glow: true });
            dust(cx, cy, 10 + 14 * f, 120); scorch(cx, cy, 6 + 8 * f);
            A.boom(0.6 + 0.6 * f); A.zap(); shake(0.3 + 0.5 * f); hitstop(0.04 + 0.06 * f); kick(a, 2 + 3 * f);
          }
          return this.t >= 0.3;
        } };
      },
    },
    q: {
      name: 'TURRET', cost: 30, cd: 1, icon: 'gear', desc: 'AUTO-GUN, LASTS 14S',
      target: placedAt(55),
      use(p, [x, y] = this.target(p)) {
        const turrets = G.allies.filter((a) => a.type === 'turret' && !a.dead);
        if (turrets.length >= 2 + G.up.hands) turrets[0].dead = true;
        G.allies.push({ type: 'turret', x,y, t: 0, life: 14, fireT: 0.4, ang: p.aim });
        A.build(); dust(p.x, p.y, 8, 50);
      },
    },
    e: {
      name: 'TESLA COIL', cost: 40, cd: 5, icon: 'bolt', desc: 'ZAPS 3 FOES AT ONCE FOR 7S',
      target: placedAt(55),
      use(p, [x, y] = this.target(p)) {
        G.allies.push({ type: 'coil', x,y, t: 0, life: 7, zapT: 0.3 });
        A.build(); A.zap();
      },
    },
    r: {
      name: 'IRON TITAN', icon: 'fist', desc: 'A MECH DROPS IN: PUNCHES AND MISSILES',
      target: placedAt(60),
      use(p, [x, y] = this.target(p)) {
        const titan = (tx, z, face, cd) => ({ type: 'golem', x: tx, y, z, vz: -60, t: 0, life: G.up.evoUlt ? 30 : 18, cd, mcd: 1.2, pcd: 2.5, landed: false, face, anim: 0, step: 0 });
        G.allies.push(titan(x, 160, 1, 0.6));
        if (G.up.evoUlt) G.allies.push(titan(clamp(x + 34, B.x0 + 12, B.x1 - 12), 230, -1, 0.9));
        A.ultStart();
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
    entrance: () => heroEntrance('MECHANIC'),
  },

  TANK: {
    id: 'TANK', name: 'TANK', alias: 'BULWARK', color: () => '#8fa2bd',
    desc: ['SLOW, HUGE HAMMER,', 'LOTS OF HEALTH'], tip: 'HOLD CLICK TO SHATTER THE GROUND',
    bars: { power: 5, speed: 1, range: 3, tough: 5 },
    stats: { hp: 13, speed: 83 }, dash: { speed: 260, time: 0.16, cd: 0.6, charges: 1 }, ultRate: 1, energyHit: 2.5,
    melee: {
      col: 'steel', heavySfx: true, steps: [
        // sweep, overhead slam, full hammer spin
        { reach: 34, arc: 3, dmg: 6, dur: 0.42, cancel: 0.24, lunge: 90, kb: 320, th: 11 },
        { reach: 42, arc: 4.2, dmg: 12, dur: 0.6, cancel: 0.34, lunge: 120, kb: 420, th: 14, heavy: true, shape: 'slam' },
        { reach: 38, arc: Math.PI * 2, dmg: 10, dur: 0.62, cancel: 0.36, lunge: 40, kb: 380, th: 14, heavy: true, shape: 'spin' },
      ], slow: 1.3,
    },
    primaryName: 'WAR HAMMER',
    // hold: Earthshatter. The hammer comes down and the ground breaks in a wide ring: the fuller the charge, the wider
    charge: {
      name: 'EARTHSHATTER', time: 1, move: 0.3,
      release(p, f) {
        const a = chargeAim(p);
        A.heavySwing();
        p.vx = Math.cos(a) * 50 * f; p.vy = Math.sin(a) * 50 * f;
        return { t: 0, hit: false, ang: swingThrough(a, 0.13, 2.6), update(p, dt) {
          this.t += dt; p.vx *= 0.8; p.vy *= 0.8;
          if (this.t < 0.2) parryArc(p, a, 36, 3.8, this);
          if (!this.hit && this.t >= 0.13) {
            this.hit = true;
            const cx = p.x + Math.cos(a) * 12, cy = p.y + Math.sin(a) * 7, R = 26 + 74 * f;
            eraseShots(cx, cy, 0, R);
            G.quakes.push({ x: cx, y: cy, r: R * 0.6, delay: 0, max: R * 1.35, friendly: true, hit: new Set(), dmg: 0, speed: 260, erase: true });
            for (const e of G.E) {
              if (!alive(e) || e.z > 8) continue;
              const d = hyp(e.x - cx, e.y - cy);
              if (d > R + e.r) continue;
              damage(e, pd(30 * f), { dir: Math.atan2(e.y - cy, e.x - cx), kb: 220 + 320 * f, src: 'primary', ug: true, heavy: true, crit: f >= 1 });
              if (e.type !== 'boss') e.stunT = Math.max(e.stunT, 0.5 + 1.3 * f);
            }
            addRing(cx, cy, P.paper, R / 0.22, 0.22, 3); addRing(cx, cy, '#8fa2bd', R / 0.32, 0.32, 3); addRing(cx, cy, P.gold, R / 0.45, 0.45, 1);
            // cracks run out from the impact
            for (let i = 0; i < 5 + 5 * f; i++) {
              const b = rnd(TAU), L = R * rnd(0.5, 0.95);
              G.bolts.push({ x0: cx, y0: cy, x1: cx + Math.cos(b) * L, y1: cy + Math.sin(b) * L * 0.6, t: 0, life: 0.35, c1: '#e8c890', c2: '#7a5a3a', c3: '#2a1f14' });
            }
            burst(cx, cy - 2, 14 + 26 * f, ['#7a6a5a', '#a8946e', '#5a4a3a'], 60, 220, { z: 4, vz: 120, g: 400, s: 2 });
            dust(cx, cy, 20 + 40 * f, 100 + 150 * f); scorch(cx, cy, 8 + 16 * f);
            A.boom(0.8 + 1.2 * f); A.wall(); shake(0.45 + 0.6 * f); hitstop(0.05 + 0.08 * f); kick(Math.PI / 2, 3 + 4 * f);
            if (f >= 1) flash(P.paper, 0.12, false);
          }
          return this.t >= 0.36;
        } };
      },
    },
    init: () => ({ skillInv: false, carry: null, pulseT: 0, slamSwing: -1 }),
    onHit(e, sw) {
      if (sw.heavy && G.p.k.slamSwing !== G.p.atkAng) {
        G.p.k.slamSwing = G.p.atkAng;
        G.quakes.push({ x: e.x, y: e.y, r: 0, delay: 0, max: 46, friendly: true, hit: new Set([e]), dmg: 3, speed: 200, erase: true });
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
          eraseShots(p.x, p.y - 6, 0, 56);
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
        for (let i = 0; i < 2 + G.up.after; i++) G.quakes.push({ x: p.x, y: p.y, r: 0, delay: i * 0.22, max: 110, friendly: true, hit: new Set(), dmg: 6, speed: 170, erase: true });
        hitstop(0.07); shake(0.7); A.boom(1.5); dust(p.x, p.y, 30, 120); scorch(p.x, p.y, 12);
        p.state = 'recover'; p.recT = 0.25;
      },
    },
    r: {
      name: 'FORTRESS', icon: 'shield', desc: '6S INVINCIBLE, REFLECT ALL',
      use(p) { p.fortress = G.up.evoUlt ? 10 : 6; p.k.pulseT = 0; A.shieldUp(); A.ultStart(); shake(0.4); },
    },
    // Fortress: a pulsing glow round him while it lasts (his sheet has no shield, so none is drawn)
    draw(p) {
      if (!(p.fortress > 0)) return;
      glow(p.x, p.y - 10, G.evo === true ? '#ff1a2a' : P.gold, 16, 0.25 + Math.sin(G.time * 10) * 0.1);
    },
    drawWeapon(p, flip) {
      const a = swordAngle(p), [hx, hy] = hand(p, flip), cx = Math.cos(a), cy = Math.sin(a);
      line(hx, hy, hx + cx * 10, hy + cy * 10, '#7a5030');
      const tx = hx + cx * 10, ty = hy + cy * 10;
      line(tx - cy * 3, ty + cx * 3, tx + cy * 3, ty - cx * 3, '#8fa2bd', 3);
      line(tx - cy * 3, ty + cx * 3, tx + cy * 3, ty - cx * 3, '#cfe0f5');
    },
    entrance: () => heroEntrance('TANK'),
  },

  ROBOT: {
    id: 'ROBOT', name: 'ROBOT', alias: 'UNIT-7', color: () => P.volt,
    desc: ['A LASER BEAM THAT', 'OVERHEATS, PLUS ROCKETS'], tip: 'HOLD CLICK, WATCH THE HEAT',
    bars: { power: 4, speed: 3, range: 4, tough: 3 },
    stats: { hp: 9, speed: 94 }, dash: { speed: 340, time: 0.13, cd: 0.45, charges: 1 }, ultRate: 0.85, energyHit: 0.35, handY: 9,
    primaryName: 'LASER BEAM',
    init: () => ({ heat: 0, over: 0, tick: 0, firing: false, orb: 0, ox: 0, oy: 0, otick: 0, end: [0, 0] }),
    primary(p, dt, held) {
      const k = p.k;
      k.firing = false;
      if (k.over > 0) { k.over -= dt; k.heat = Math.max(0, k.heat - 60 * dt); if (Math.random() < 0.5) part(p.x, p.y - 12, rnd(-10, 10), -rnd(20, 40), 0.5, P.dust, { drag: 2 }); A.loop('beam', false); return; }
      if (held) {
        k.firing = true;
        k.heat += 34 * (G.up.evoCoolant ? 0.25 : G.up.coolant ? 0.6 : 1) * dt;
        const a = p.aim, [hx, hy] = weaponTip(p, a);
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
          for (const e of G.E) if (alive(e) && hyp(e.x - k.ox, e.y - k.oy) < ORBITAL_RADIUS + e.r) damage(e, pd(e.type === 'boss' ? 5 : 4), { dir: rnd(TAU), kb: 40, src: 'bolt' });
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
      use(p) {
        p.shield = 3; p.shieldT = 8; A.shieldUp(); addRing(p.x, p.y - 7, P.volt, 120, 0.3, 2);
        // awakened, it raises the Aegis: red plates in gold rims (drawn by world.js drawAegis)
        if (G.evo === true) {
          addRing(p.x, p.y - 9, P.gold, 220, 0.35, 2); addText(p.x, p.y - 30, 'AEGIS', P.gold);
          for (let i = 0; i < 18; i++) { const a = (i * TAU) / 18; part(p.x + Math.cos(a) * 16, p.y - 9 + Math.sin(a) * 11, Math.cos(a) * 40, Math.sin(a) * 30, 0.4, i % 2 ? '#ff2a3a' : P.gold, { drag: 3, glow: true }); }
        }
      },
    },
    onShieldBreak(p) {
      if (G.evo === true) {
        // the Aegis shatters: its plates fly out in red and gold
        addRing(p.x, p.y - 6, '#ff2a3a', 380, 0.35, 3); addRing(p.x, p.y - 6, P.gold, 260, 0.3, 2);
        for (let i = 0; i < 26; i++) { const a = rnd(TAU), v = rnd(80, 220); part(p.x, p.y - 9, Math.cos(a) * v, Math.sin(a) * v, rnd(0.3, 0.6), i % 3 ? '#ff3b3b' : P.gold, { drag: 3, glow: true, s: 2 }); }
        flash('#ff2a3a', 0.1, false);
      }
      addRing(p.x, p.y - 6, P.volt, 300, 0.3, 3);
      for (const e of G.E) if (alive(e) && hyp(e.x - p.x, e.y - p.y) < 60) damage(e, pd(6), { power:'spell', dir: Math.atan2(e.y - p.y, e.x - p.x), kb: 260, src: 'bolt' });
      A.zap(); shake(0.4);
    },
    r: {
      name: 'ORBITAL LASER', icon: 'eye', desc: 'A SKY BEAM FOLLOWS YOUR AIM',
      target: placedAt(100),
      use(p, [x, y] = this.target(p)) {
        p.k.orb = G.up.evoUlt ? 7.5 : 4.5; p.k.ox = x; p.k.oy = y; p.k.otick = 0;
        A.loop('orbital', true, 'orbital'); A.ultStart(); flash(P.volt, 0.15, false);
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
        const [hx, hy] = weaponTip(p, p.aim), [ex, ey] = k.end, w = 3 + (Math.random() < 0.5 ? 1 : 0) + (G.evo === true ? 2 : 0);
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
    entrance: () => heroEntrance('ROBOT'),
  },
};

// ---------- allies built by the mechanic, the ninja's clones ----------
export const ALLY = {
  turret: {
    update(a, dt) {
      a.fireT -= dt;
      const e = nearest(a.x, a.y, TURRET_RANGE);
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
          const e = nearest(a.x, a.y, COIL_RANGE, hit);
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
  // the Iron Titan: rockets down on its thrusters, stomps toward foes, punches with a piston arm,
  // fires shoulder missiles, and jets off when its time is up
  golem: {
    update(a, dt) {
      a.anim += dt;
      const flames = (n, spread) => { for (let i = 0; i < n; i++) part(a.x + rnd(-spread, spread), a.y - a.z + rnd(-1, 2), rnd(-20, 20), rnd(60, 140), rnd(0.15, 0.35), Math.random() < 0.5 ? '#ff9a3c' : Math.random() < 0.5 ? '#ffd447' : '#62efff', { drag: 3, glow: true }); };
      if (!a.landed) {
        // the descent slows as the thrusters fire
        a.vz = Math.min(-40, a.vz + 600 * dt * (a.z < 70 ? 1 : 0)) - (a.z > 70 ? 500 * dt : 0);
        a.z = Math.max(0, a.z + a.vz * dt);
        if (a.z < 90) flames(3, 6);
        if (a.z <= 0) {
          a.landed = true;
          G.quakes.push({ x: a.x, y: a.y, r: 0, delay: 0, max: TITAN_LANDING, friendly: true, hit: new Set(), dmg: 20, speed: 240 });
          shake(0.9); A.boom(1.8); dust(a.x, a.y, 34, 150); scorch(a.x, a.y, 16); hitstop(0.07);
          addRing(a.x, a.y - 4, '#ff9a3c', 300, 0.35, 3);
        }
        return;
      }
      // the last second: it lifts off on its jets
      if (a.t > a.life - 1) { a.leaving = true; a.z += (60 + (a.t - (a.life - 1)) * 400) * dt; flames(4, 7); if (Math.random() < dt * 8) A.rocket(); return; }
      a.cd -= dt; a.mcd -= dt; a.pcd -= dt; a.punch = (a.punch || 0) - dt; a.windup = (a.windup || 0) - dt;
      // every 4 seconds a ground pound: a shockwave that stuns everything near
      if (a.pcd <= 0 && nearest(a.x, a.y, 90)) {
        a.pcd = 4;
        G.quakes.push({ x: a.x, y: a.y, r: 0, delay: 0, max: 100, friendly: true, hit: new Set(), dmg: 12, speed: 260 });
        for (const o of G.E) if (alive(o) && o.type !== 'boss' && hyp(o.x - a.x, o.y - a.y) < 100) o.stunT = Math.max(o.stunT || 0, 0.8);
        addRing(a.x, a.y - 4, '#ff9a3c', 280, 0.3, 3); dust(a.x, a.y, 24, 140); shake(0.6); A.boom(1.4); hitstop(0.04);
      }
      const e = nearest(a.x, a.y, 400);
      if (!e) { a.walking = false; return; }
      const d = hyp(e.x - a.x, e.y - a.y);
      a.face = e.x < a.x ? -1 : 1;
      if (d > 30 && a.windup <= 0) {
        a.x += ((e.x - a.x) / d) * 92 * dt; a.y += ((e.y - a.y) / d) * 92 * dt; a.walking = true;
        // heavy steps
        const st = Math.floor(a.anim * 6);
        if (st !== a.step) { a.step = st; if (st % 2 === 0) { dust(a.x + rnd(-6, 6), a.y, 5, 40); shake(0.06); } }
      } else a.walking = false;
      if (d < 40 && a.cd <= 0 && a.windup <= 0) { a.windup = 0.14; a.cd = 0.55; a.target = e; }
      if (a.windup > 0 && a.windup - dt <= 0 && a.target) {
        // the piston punch
        const t = a.target;
        a.punch = 0.2;
        for (const o of G.E) if (alive(o) && hyp(o.x - t.x, o.y - t.y) < 38) damage(o, pd(22), { dir: Math.atan2(o.y - a.y, o.x - a.x), kb: 320, src: 'boom', heavy: true });
        G.quakes.push({ x: t.x, y: t.y, r: 0, delay: 0, max: 40, friendly: true, hit: new Set([t]), dmg: 3, speed: 220 });
        sparks(a.x + a.face * 28, a.y - 22, a.face > 0 ? 0 : Math.PI, 12, 0.6, '#ff9a3c', 260);
        shake(0.45); A.boom(1.1); hitstop(0.05);
      }
      // a missile salvo from both shoulder pods
      if (a.mcd <= 0) {
        a.mcd = 1.4;
        for (let i = 0; i < 6; i++) {
          const side = i % 2 ? 1 : -1;
          shoot({ x: a.x + side * 16, y: a.y - 46, a: -Math.PI / 2 + side * rnd(0.3, 0.8), sp: 170, dmg: pd(9), kb: 120, life: 1.8, kind: 'rocket', homing: 6, ug: false, splash: { R: 18, dmg: pd(5) } });
        }
        A.rocket(); addRing(a.x, a.y - 46, '#ff9a3c', 80, 0.15, 1);
      }
    },
    draw(a) {
      // drawn twice the size: a giant next to the fighters
      const T = SPR.titan, s = a.walking ? T.walk[Math.floor(a.anim * 6) % 4] : T.idle, S = 2;
      if (!a.landed) ring(a.x, a.y, Math.max(4, 26 - a.z / 7), 1, '#ff9a3c');
      shadow(a.x, a.y, Math.max(5, 16 - (a.z || 0) / 10));
      if (a.leaving && a.t > a.life - 0.3 && Math.floor(G.time * 20) % 2) return;
      // a lean back on the windup, a lunge on the punch, a heavy bob when walking
      const lunge = a.punch > 0 ? a.face * 6 : a.windup > 0 ? -a.face * 3 : 0;
      const bob = a.walking ? Math.round(Math.abs(Math.sin(a.anim * 6 * Math.PI / 2)) * 2) : Math.round(Math.sin(a.anim * 2) * 1);
      const fx = Math.round(a.x + lunge), fy = Math.round(a.y + 1 - (a.z || 0) - bob);
      ctx.save(); ctx.translate(fx, fy); ctx.scale(S, S);
      drawSprite(s, -Math.round(s.w / 2), -s.h, a.face < 0, a.z > 0 && !a.leaving ? '#ffb347' : null);
      // the piston fist, thrown out ahead
      if (a.punch > 0) {
        const len = 7 * Math.min(1, (0.2 - a.punch) / 0.06 + 0.3), y = -s.h + 14, x0 = a.face * 9;
        line(x0, y, x0 + a.face * len, y, '#8b98ab', 2); disc(x0 + a.face * (len + 2), y, 2, '#d8651e'); px(x0 + a.face * (len + 2), y, '#ffd447');
      }
      ctx.restore();
      // the reactor and the visor glow
      glow(fx, fy - (s.h - 10) * S, '#ffd447', 10 + Math.sin(G.time * 8) * 3, 0.55);
      glow(fx + a.face * 2, fy - (s.h - 4) * S, '#62efff', 9, 0.5);
      if (a.leaving || !a.landed) glow(a.x, a.y - a.z, '#ff9a3c', 16, 0.6);
    },
  },


};


// ---------- THE DEV: secret fighter. Below average early, even by wave 15, then ramps hard after wave 20 ----------
const GREEN = '#39ff6a';
const devVer = () => Math.min(99, 1 + Math.floor(G.kills / 20));
// about 0.8x on wave 1, 1.2x by wave 10, 1.7x by 20, 3.2x by 30, 5x by 40, 7.5x by 50
const devScale = () => 0.8 + 0.035 * (G.wave - 1) + 0.015 * (devVer() - 1) + (G.wave > 20 ? 0.045 * Math.pow(G.wave - 20, 1.35) : 0);
// bugs needed to crash a foe: 5 early, 4 from wave 15, 3 from wave 30
const crashAt = () => (G.wave >= 30 ? 3 : G.wave >= 15 ? 4 : 5);
function bugHit(e, n = 1, chain) {
  if (!alive(e) || e.state === 'intro' || e.state === 'awakening' || chain?.has(e)) return;
  e.bugs = (e.bugs || 0) + n;
  const threshold = crashAt() - G.up.overflow;
  if (e.bugs >= Math.max(2, threshold)) {
    e.bugs = 0;
    glitch(e.x, e.y - e.r, 22, 16, 0.35, 14);
    addText(e.x, e.y - e.r * 2 - 14, 'CRASHED', GREEN);
    A.zip(); A.hit(true, false); shake(0.2);
    for (let i = 0; i < 10; i++) { const a = rnd(TAU), v = rnd(60, 200); part(e.x, e.y - e.r, Math.cos(a) * v, Math.sin(a) * v, 0.3, Math.random() < 0.5 ? GREEN : P.paper, { drag: 6, glow: true }); }
    const ex = e.x, ey = e.y;
    damage(e, pd(12 * (1 + 0.25 * Math.max(0, 2 - threshold))), { dir: rnd(TAU), kb: 140, src: 'bolt', slice: true });
    if (G.up.fork) {
      const crashed = chain || new Set();
      crashed.add(e);
      G.timers.push({ t: 0.1, fn: () => {
        for (const o of G.E) if (alive(o) && !crashed.has(o) && hyp(o.x - ex, o.y - ey) < 50) {
          G.bolts.push({ x0: ex, y0: ey - 6, x1: o.x, y1: o.y - o.r, t: 0, life: 0.2, c1: P.paper, c2: GREEN, c3: '#1a6a2a' });
          bugHit(o, 2, crashed);
        }
      } });
    }
  }
}
CHARS.DEV = {
  id: 'DEV', name: 'THE DEV', alias: 'ROOT', color: () => GREEN,
  desc: ['STARTS AS A NORMAL GUY WITH A LAPTOP.', 'PAST WAVE 20 HE REWRITES THE GAME'], tip: '5 HITS CRASH A FOE',
  bars: { power: 4, speed: 4, range: 4, tough: 2 },
  stats: { hp: 7, speed: 100 }, dash: { speed: 420, time: 0.09, cd: 0.5, charges: 1 }, ultRate: 0.9, energyHit: 1,
  primaryName: 'PING',
  dmgScale: devScale,
  init: () => ({ fireT: 0, wall: 0, wallT: 0, flashT: 0, marks: [] }),
  primary(p, dt, held) {
    const k = p.k, v = devVer();
    k.fireT -= dt; k.flashT -= dt;
    if (held && k.fireT <= 0) {
      k.fireT = (0.24 / G.up.spd) * Math.max(0.45, 1 - (v - 1) * 0.012 - Math.max(0, G.wave - 20) * 0.01) / (p.ascend > 0 ? 1.4 : 1);
      // one packet at first; more with versions, and more again past waves 20 and 35
      const n = Math.min(7, 1 + Math.floor((v - 1) / 8) + (G.wave >= 20 ? 1 : 0) + (G.wave >= 35 ? 1 : 0)), [hx, hy] = hand(p, Math.cos(p.aim) < 0);
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
        for (const e of G.E) if (alive(e) && hyp(e.x - p.x, e.y - p.y) < 40) { damage(e, pd(3), { power:'spell', dir: Math.atan2(e.y - p.y, e.x - p.x), kb: 170, src: 'bolt' }); bugHit(e); }
      }
    }
    for (const m of k.marks) m.t -= dt;
    k.marks = k.marks.filter((m) => m.t > -0.2);
  },
  q: {
    name: 'EXPLOIT', cost: 30, cd: 2, icon: 'eye', desc: 'MARK A GROUP, HACK THEM ALL',
    use(p) {
      const n = Math.min(10, 1 + Math.floor(devVer() / 6) + (G.wave >= 25 ? 2 : 0));
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
      // Awakened as Root it is a different command: a root prompt in cyan and magenta, code raining down the screen,
      // every enemy boxed and marked for deletion, a progress bar filling, and the enemies blown apart into pixels.
      const root = G.evo === true, C1 = root ? '#62efff' : GREEN, C2 = root ? '#ff4fa8' : GREEN;
      const GP = root ? ['#62efff', '#ff4fa8', P.paper, '#0a1020'] : null;
      const cmd = root ? '# rm -rf --no-preserve-root /world/*' : '$ sudo rm -rf /enemies' + (G.up.evoUlt ? ' --no-preserve-root' : '');
      const u = { t: 0, done: false, rain: root ? Array.from({ length: Math.ceil(FW / 7.7) }, (_, i) => ({ x: i * 7.7 + rnd(-2, 2) - SX, y: rnd(-H, 0), v: rnd(140, 280), n: Math.floor(rnd(5, 13)) })) : null };
      p.state = 'cine'; p.vx = p.vy = 0;
      A.ultStart();
      G.cine = {
        update(dt) {
          u.t += dt;
          if (u.t < 0.9 && Math.floor(u.t * 24) !== Math.floor((u.t - dt) * 24)) A.click();
          if (u.t > 0.9 && Math.random() < 0.8) glitch(fx.cam.x + rnd(W), fx.cam.y + rnd(H), 40, 6, 0.2, 10, GP);
          if (u.rain) for (const d of u.rain) { d.y += d.v * dt; if (d.y > H + 60) { d.y = rnd(-60, -10); d.v = rnd(140, 280); } }
          if (u.t > 1.4 && !u.done) {
            u.done = true;
            G.cine = null; p.state = 'move'; p.inv = 0.8;
            const mul = G.up.evoUlt ? 1.6 : 1;
            for (const e of G.E) {
              if (!alive(e)) continue;
              glitch(e.x, e.y - e.r, 28, 22, 0.5, 18, GP);
              // Root deletes them: they burst into cyan and magenta pixels
              if (root) for (let i = 0; i < 18; i++) { const b = rnd(TAU), v = rnd(40, 160); part(e.x, e.y - e.r, Math.cos(b) * v, Math.sin(b) * v - 30, rnd(0.4, 0.9), i % 3 ? (i % 2 ? C1 : C2) : P.paper, { drag: 2, glow: true, s: Math.random() < 0.4 ? 2 : 1 }); }
              damage(e, e.type === 'boss' ? pd(e.maxHp * 0.08 * mul + 40) : pd(60 * mul), { dir: rnd(TAU), kb: 240, src: 'ult', slice: true, crit: true });
            }
            if (G.up.evoUlt || root) for (const s of G.shots) if (s.owner === 'enemy') s.dead = true;
            flash(C1, root ? 0.45 : 0.35, true); shake(1); hitstop(root ? 0.2 : 0.14); A.ultRelease();
            if (root) { addRing(p.x, p.y - 6, C1, 420, 0.5, 3); addRing(p.x, p.y - 6, C2, 300, 0.4, 2); }
            addText(p.x, p.y - 28, G.E.some(alive) ? (root ? 'SEGMENTATION FAULT' : 'PERMISSION DENIED') : root ? 'ROOT: DELETED' : 'DONE', C1, 2);
          }
        },
        draw() {
          ctx.save(); stageTransform();
          if (root) {
            // the screen goes dark blue; code rains down it, and every enemy is boxed for deletion
            fillScreen('#020a16', Math.min(0.55, u.t * 1.2));
            for (const d of u.rain) for (let j = 0; j < d.n; j++) {
              const y = Math.round(d.y - j * 6);
              if (y < -6 || y > H) continue;
              ctx.globalAlpha = j === 0 ? 1 : Math.max(0.15, 1 - j / d.n);
              text((Math.floor(d.x * 7 + j * 13 + u.t * 9) % 2) ? '1' : '0', Math.round(d.x), y, j === 0 ? P.paper : j % 4 === 2 ? C2 : C1);
            }
            ctx.globalAlpha = 1;
            const blink = Math.floor(u.t * 8) % 2;
            for (const e of G.E) {
              if (!alive(e)) continue;
              const x = Math.round(e.x - fx.cam.x), y = Math.round(e.y - e.r - fx.cam.y), w = e.r + 6;
              const c = blink ? C2 : P.paper;
              rect(x - w, y - w, 3, 1, c); rect(x - w, y - w, 1, 3, c); rect(x + w - 2, y - w, 3, 1, c); rect(x + w, y - w, 1, 3, c);
              rect(x - w, y + w, 3, 1, c); rect(x - w, y + w - 2, 1, 3, c); rect(x + w - 2, y + w, 3, 1, c); rect(x + w, y + w - 2, 1, 3, c);
              if (u.t > 0.5) text('DEL', x - 5, y - w - 7, C2);
            }
          }
          if (u.t > 0.9) for (let i = 0; i < (root ? 16 : 10); i++) { const y = Math.floor(rnd(H)), h = Math.floor(rnd(2, 10)); ctx.drawImage(canvas, 0, y * SS, W * SS, h * SS, Math.round(rnd(-14, 14)), y, W, h); }
          ctx.globalAlpha = 0.9; ctx.fillStyle = root ? '#040c1a' : '#05140a'; ctx.fillRect(20, H - 46, W - 40, 30); ctx.globalAlpha = 1;
          rect(20, H - 46, W - 40, 1, C1);
          if (root) { rect(20, H - 17, W - 40, 1, C2); rect(20, H - 46, 1, 30, C1); rect(W - 21, H - 46, 1, 30, C2); }
          // The Dev above the terminal
          const frames = heroSet().act.ultimate;
          const us = frames[Math.min(frames.length - 1, Math.floor(u.t / 1.55 * frames.length))];
          drawSprite(us, W / 2 - us.w / 2, H - 47 - us.h, false);
          text(cmd.slice(0, Math.floor(Math.min(1, u.t / 0.85) * cmd.length)) + (Math.floor(u.t * 6) % 2 ? '_' : ''), 26, H - 40, C1);
          if (u.t > 0.9) {
            const n = G.E.filter(alive).length;
            if (root) {
              // a progress bar filling as it wipes
              const k = Math.min(1, (u.t - 0.9) / 0.5), bw = 80;
              text('WIPING ' + n + ' PROCESSES', 26, H - 30, P.paper);
              rect(130, H - 30, bw, 5, '#0a1a2a'); rect(130, H - 30, Math.round(bw * k), 5, Math.floor(u.t * 16) % 2 ? C1 : C2);
              text(Math.round(k * 100) + '%', 214, H - 30, C1);
            } else text('DELETING ' + n + ' PROCESSES...', 26, H - 30, P.paper);
          }
          ctx.restore();
        },
      };
      glitch(p.x, p.y - 8, 40, 30, 0.5, 20, GP);
      if (root) { addText(p.x, p.y - 30, 'ROOT ACCESS', C1, 2); flash(C2, 0.12, false); }
    },
  },
  drawWeapon(p, flip) {
    // before he evolves the laptop is part of his sprite, on his lap
    if (G.evo !== true) return;
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
  entrance: () => heroEntrance('DEV'),
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
    // awakened, a few red sparks (the color of her bow and skirt) drift up behind her, never over her
    if (G.evo === true && Math.random() < dt * 8) part(behindX(p, 5) + rnd(-3, 3), p.y - rnd(4, 16), rnd(-5, 5), -rnd(12, 28), rnd(0.4, 0.8), Math.random() < 0.5 ? '#f64e54' : '#ffc0c0', { glow: true, drag: 1.5 });
    // sakura petals drift off her as she moves
    if (Math.random() < dt * (moving ? 22 : 4)) part(behindX(p, 4) + rnd(-2, 2), p.y - rnd(6, 14), (Math.cos(p.aim) < 0 ? 1 : -1) * rnd(10, 30), rnd(4, 14), rnd(0.5, 0.9), Math.random() < 0.6 ? '#ffb7d5' : '#ff8fb8', { drag: 2 });
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
    // sparks off the treads (Omega hovers on jets instead)
    if (G.evo !== true && Math.random() < dt * 30) part(p.x + rnd(-3, 3), p.y + 1, rnd(-10, 10), rnd(20, 50), rnd(0.12, 0.25), Math.random() < 0.5 ? P.volt : P.paper, { drag: 4, glow: true });
  },
};
// Drawn twice a frame: before the body (front false) and after it (front true), so whatever circles a fighter
// passes behind them and then in front of them.
const AURA = {
  // Morrow's orbs (five, gold and pink, once awakened)
  WIZARD(p, flip, front) {
    const aw = G.evo === true, n = aw ? 5 : 3;
    for (let i = 0; i < n; i++) {
      const a = G.time * 2.5 + (i * TAU) / n, s = Math.sin(a);
      if ((s >= 0) !== !!front) continue;
      const x = Math.round(p.x + Math.cos(a) * (aw ? 13 : 11)), y = Math.round(p.y - 8 + s * 4), c = aw ? (i % 2 ? P.gold : '#ff4fa8') : i === 0 ? '#62efff' : '#b48cff';
      glow(x, y, c, aw ? 6 : 4, 0.55);
      rect(x - 1, y - 1, 2, 2, c); px(x - 1, y - 1, P.paper);
      if (aw && Math.random() < 0.15) part(x, y, 0, -rnd(4, 12), 0.4, c, { glow: true, drag: 2 });
    }
  },
  // holo screens orbit The Dev; awakened as Root he runs four, bigger, and windows keep popping up around him
  DEV(p, flip, front) {
    const aw = G.evo === true, n = aw ? 4 : 2, col = aw ? '#62efff' : '#39ff6a';
    for (let i = 0; i < n; i++) {
      const a = G.time * (aw ? 1.6 : 1.3) + (i * TAU) / n, s = Math.sin(a);
      if ((s >= 0) !== !!front) continue;
      const w = aw ? 10 : 9, h = aw ? 8 : 7, x = Math.round(p.x + Math.cos(a) * (aw ? 21 : 15) - w / 2), y = Math.round(p.y - 16 + s * 5 - (aw ? 2 : 0));
      ctx.globalAlpha = 0.6; rect(x, y, w, h, aw ? '#04121a' : '#0b2a16'); ctx.globalAlpha = 1;
      rect(x, y, w, 1, col); rect(x, y + h - 1, w, 1, aw ? '#1a6a7a' : '#1a7a3a');
      if (aw && i % 2) {
        // a scrolling graph
        for (let c = 0; c < w - 2; c++) px(x + 1 + c, y + 2 + Math.round((h - 4) / 2 + Math.sin(G.time * 6 + c * 0.9 + i) * ((h - 4) / 2)), c % 3 ? col : P.paper);
      } else for (let r = 0; r < (aw ? 4 : 3); r++) rect(x + 1, y + 2 + r * 1.5, 2 + ((Math.floor(G.time * 8) + r * 3 + i) % (w - 3)), 1, r === 1 ? P.paper : col);
      glow(x + w / 2, y + h / 2, col, aw ? 8 : 6, 0.35);
    }
    if (!aw || !front) return;
    // pop-up windows: one opens every so often near him, shows a word, and closes
    const k = p.k, now = G.time;
    k.pops = (k.pops || []).filter((q) => now - q.t < 1.1);
    if (now - (k.popT ?? -9) > 0.95) {
      k.popT = now;
      const side = Math.random() < 0.5 ? -1 : 1;
      k.pops.push({ t: now, dx: side < 0 ? rnd(-46, -30) : rnd(14, 26), dy: rnd(-44, -30), w: ['ROOT', 'SUDO', '0XFF', 'KILL', 'EXEC', '404'][Math.floor(rnd(6))] });
    }
    for (const q of k.pops) {
      const age = now - q.t, open = Math.min(1, age / 0.08, (1.1 - age) / 0.12), w = Math.round(22 * open), x = Math.round(p.x + q.dx), y = Math.round(p.y + q.dy);
      if (w < 2) continue;
      rect(x - 1, y - 1, w + 2, 11, P.ink0); rect(x, y, w, 9, '#04121a'); rect(x, y, w, 2, Math.floor(age * 12) % 2 ? '#ff4fa8' : col);
      if (open >= 1) text(q.w, x + 2, y + 3, P.paper);
      glow(x + w / 2, y + 4, col, 8, 0.25);
    }
  },
  // the tread glow and the core glow sit where the treaded body is; Omega flies and glows at its jets (world.js)
  ROBOT(p, flip, front) { if (front || G.evo === true) return; glow(p.x, p.y, P.volt, 8 + Math.sin(G.time * 30), 0.35); glow(p.x, p.y - 8, P.volt, 5 + Math.sin(G.time * 6) * 2, 0.35); },
  BLADE(p, flip, front) { if (!front) glow(p.x, p.y - 8, G.evo === true ? P.gold : P.ember, 12, G.evo === true ? 0.22 : 0.12); },
  TANK(p, flip, front) { if (!front) glow(p.x, p.y - 12, G.evo === true ? '#ff1a2a' : '#ff9a3c', 6, 0.25); },
};
const EYES = { DEV: '#39ff6a', WIZARD: '#62efff', NINJA: '#a070ff', MECHANIC: '#ff9a3c', TANK: '#ff9a3c', ROBOT: '#ff3b3b', GUNNER: '#ffd447', BLADE: '#ffb04a' };
// ---------- awakened powers ----------
// pal: the awakened colors. col is the fighter's new color, slash the color set its sword arcs use, and map
// swaps the colors of its own effects (particles, rings, shots, its weapon and power drawings).
// Once a fighter awakens, its kit evolves for the rest of the run (see awakenKit in world.js). Each one adds:
//   hit: an extra effect on basic-attack hits (at most every 0.15 s per enemy),
//   skill: an awakened burst after every Q and E,
//   ult: an awakened finisher after the ultimate,
//   charge: an awakened follow-up to the charged attack (the four melee fighters).
const awNear = (x, y, R, n = 99, skip = null) => G.E.filter((e) => alive(e) && e !== skip && hyp(e.x - x, e.y - y) < R).sort((a, b) => hyp(a.x - x, a.y - y) - hyp(b.x - x, b.y - y)).slice(0, n);
const awBurst = (p, R, dmg, col, o = {}) => {
  for (const e of awNear(p.x, p.y, R)) { damage(e, dmg, { dir: Math.atan2(e.y - p.y, e.x - p.x), kb: o.kb ?? 180, src: 'bolt' }); o.each?.(e); }
  addRing(p.x, p.y - 6, col, R * 4, 0.3, 2); addRing(p.x, p.y - 6, P.paper, R * 3, 0.2, 1);
  for (let i = 0; i < 24; i++) { const a = rnd(TAU), v = rnd(60, R * 4); part(p.x, p.y - 6, Math.cos(a) * v, Math.sin(a) * v, rnd(0.3, 0.7), Math.random() < 0.6 ? col : P.paper, { drag: 3, glow: true }); }
  shake(0.25);
};
const awStrike = (x, y, R, dmg) => G.strikes.push({ x, y, t: 0, delay: 0.15, R, dmg, friendly: true, kind: 'lightning', c: P.volt });
const awStun = (e, t) => { if (alive(e) && e.type !== 'boss') e.stunT = Math.max(e.stunT || 0, t); };
const AWAKE = {
  // Ashen Kael: every cut sets enemies alight; his powers throw a ring of fire; Thousand Cuts leaves the screen burning
  BLADE: {
    pal: { col: P.gold, slash: 'gold', charge: 'whitefire', map: { [P.ember]: P.gold, [P.ember2]: '#fff2c0', [P.ember3]: P.paper, '#ffb04a': P.gold, [P.gold]: '#fff2c0', [P.gold2]: P.gold } },
    hit: (e) => ignite(e, 2.5, 4),
    swing: (p, st) => shoot({ x: p.x + Math.cos(p.atkAng) * 10, y: p.y - 6, a: p.atkAng, sp: 300, dmg: pd(st.heavy ? 6 : 3), kb: 80, life: st.heavy ? 0.45 : 0.3, kind: 'crescent', r: st.heavy ? 6 : 4, pierce: 99, c: P.ember, ug: true, slice: true, trail: false }),
    charge: (p, f) => {
      const a = p.aim;
      for (const d of [-0.6, -0.3, 0.3, 0.6]) shoot({ x: p.x + Math.cos(a + d) * 8, y: p.y - 6, a: a + d, sp: 260 + 120 * f, dmg: pd(12 * f), kb: 160, life: 0.3 + 0.4 * f, kind: 'crescent', r: 5 + 5 * f, pierce: 99, c: P.ember, ug: true, slice: true, trail: false });
      // a line of white fire erupts along the cut, one blast after another
      const n = 3 + Math.round(4 * f);
      for (let i = 1; i <= n; i++) G.booms.push({ x: clamp(p.x + Math.cos(a) * i * 24, B.x0 + 6, B.x1 - 6), y: clamp(p.y + Math.sin(a) * i * 24, B.y0 + 6, B.y1 - 4), t: 0.05 + i * 0.05, friendly: true, R: 22, dmg: Math.round(8 + 10 * f) });
    },
    skill: (p) => awBurst(p, 48, pd(6), P.ember, { each: (e) => ignite(e, 3, 5) }),
    ult: (p) => { for (const e of awNear(p.x, p.y, 400)) ignite(e, 4, 7); addRing(p.x, p.y - 6, P.ember, 400, 0.5, 3); },
  },
  // Deadeye Vega: shots ricochet to the next enemy; her powers fire a fan of gold rounds; Last Stand opens with a volley at everything near
  GUNNER: {
    pal: { col: '#ff3b5c', slash: 'blood', map: { [P.gold]: '#ff3b5c', [P.ember3]: '#ffb0c0', [P.gold2]: '#7a1424' } },
    hit: (e) => { const t = awNear(e.x, e.y, 90, 1, e)[0]; if (t && Math.random() < 0.4) shoot({ x: e.x, y: e.y - e.r, a: Math.atan2(t.y - e.y, t.x - e.x), sp: 420, dmg: pd(3), kb: 60, life: 0.5, kind: 'bullet', c: P.gold, ug: false }); },
    skill: (p) => { for (let i = 0; i < 10; i++) shoot({ x: p.x, y: p.y - 8, a: (i * TAU) / 10, sp: 380, dmg: pd(4), kb: 90, life: 0.6, kind: 'bullet', pierce: 2, c: P.gold, ug: false }); A.shotgun(); },
    ult: (p) => { for (const e of awNear(p.x, p.y, 200, 10)) shoot({ x: p.x, y: p.y - 8, a: Math.atan2(e.y - p.y, e.x - p.x), sp: 500, dmg: pd(9), kb: 120, life: 0.8, kind: 'bullet', homing: 6, c: P.gold, ug: false }); },
  },
  // Archmage Morrow: bolts arc to a second enemy; his powers call lightning on the three nearest; Starfall adds a storm
  WIZARD: {
    pal: { col: P.gold, slash: 'gold', map: { '#b48cff': P.gold, '#62efff': '#ff4fa8', [P.volt]: '#ff4fa8', [P.volt2]: '#a0206a', '#6a4ab8': '#b9811c' } },
    hit: (e) => chainLightning(e, 1, 3),
    skill: (p) => { for (const e of awNear(p.x, p.y, 160, 3)) awStrike(e.x, e.y, 22, 10); },
    ult: (p) => { for (const e of awNear(p.x, p.y, 300, 8)) awStrike(e.x, e.y, 24, 14); },
  },
  // Oni Rin: a petal cut opens on every enemy a beat after her blade; her powers cut a ring and parry every shot near;
  // after Issen the blossom storm rises around her for free. Her effects take the colors of her awakened look (the
  // owner's picture): crimson and red on black, with white.
  NINJA: {
    pal: { col: '#f64e54', slash: 'oni', charge: 'oni', map: { '#ffb7d5': '#ff6a6e', '#ff8fc8': '#f64e54', '#ff8fb8': '#ffc0c0', [P.blood]: '#cc303c', [P.ember]: '#7e1224', [P.ember2]: '#f64e54', [P.ember3]: '#ffe0e0', '#e0223f': '#cc303c' } },
    hit: (e) => G.timers.push({ t: 0.2, fn: () => { if (alive(e)) { damage(e, pd(2), { dir: rnd(TAU), kb: 0, src: 'bolt', slice: true }); sparks(e.x, e.y - e.r, rnd(TAU), 4, 1, '#ffb7d5', 140); } } }),
    swing: (p, st) => { for (const d of st.heavy ? [-0.4, 0, 0.4] : [0]) shoot({ x: p.x + Math.cos(p.atkAng + d) * 8, y: p.y - 6, a: p.atkAng + d, sp: 340, dmg: pd(st.heavy ? 5 : 3), kb: 60, life: 0.3, kind: 'crescent', r: 7, pierce: 99, c: '#ffb7d5', ug: true, slice: true, trail: false }); },
    charge: (p, f) => { const x0 = p.x, y0 = p.y, a = p.aim;
      G.timers.push({ t: 0.18 + 0.06 * f, fn: () => { const q = G.p; for (let i = 0; i < 8; i++) shoot({ x: q.x, y: q.y - 6, a: (i * TAU) / 8, sp: 300, dmg: pd(8 * f), kb: 140, life: 0.4, kind: 'crescent', r: 9, pierce: 99, c: '#ffb7d5', ug: true, slice: true, trail: false }); A.riftCut(); } });
      G.timers.push({ t: 0.45 + 0.1 * f, fn: () => {
      const q = G.p, x1 = q.x, y1 = q.y;
      for (const e of G.E) if (alive(e) && segDist(e.x, e.y - e.r, x0, y0 - 5, x1, y1 - 5) < e.r + 14) damage(e, pd(12 * f), { dir: a + Math.PI / 2, kb: 160, src: 'bolt', slice: true, crit: f >= 1 });
      for (let i = 0; i < 30; i++) { const k = Math.random(); part(x0 + (x1 - x0) * k, y0 - 5 + (y1 - y0) * k, rnd(-60, 60), rnd(-60, 20), rnd(0.4, 0.9), Math.random() < 0.6 ? '#ffb7d5' : '#ff8fc8', { drag: 2, glow: true }); }
      awBurst(q, 34 + 20 * f, pd(6 * f), '#ffb7d5'); A.riftCut(); } }); },
    skill: (p) => { awBurst(p, 50, pd(5), '#ffb7d5'); for (const s of G.shots) if (s.owner === 'enemy' && !s.dead && !s.noparry && !s.ret && !s.fist && hyp(s.x - p.x, s.y - p.y) < 60) parry(s, Math.atan2(s.y - p.y, s.x - p.x), true); },
    ult: (p) => G.timers.push({ t: 1.6, fn: () => { const q = G.p; q.k.storm = 3; q.k.stormHit = 0; q.slowMul = 1.25; addRing(q.x, q.y - 6, '#ffb7d5', 160, 0.3, 2); } }),
  },
  // Rivet Mk-II: every third hit arcs current to two more enemies; her powers release a tesla chain; Iron Titan lands in a lightning storm
  MECHANIC: {
    pal: { col: P.volt, slash: 'volt', charge: 'storm', map: { [P.ember]: P.volt, [P.ember2]: '#c8ffff', '#ff8a3c': P.volt, [P.ember3]: P.paper, [P.volt]: P.gold, [P.volt2]: P.gold2 } },
    hit: (e) => { if ((G.p.k.awHits = (G.p.k.awHits || 0) + 1) % 3 === 0) chainLightning(e, 2, 3); },
    swing: (p, st) => { const t = G.E.filter((e) => alive(e) && hyp(e.x - p.x, e.y - p.y) < 70 && Math.abs(Math.atan2(Math.sin(Math.atan2(e.y - p.y, e.x - p.x) - p.atkAng), Math.cos(Math.atan2(e.y - p.y, e.x - p.x) - p.atkAng))) < 1)[0]; if (t) chainLightning(t, st.heavy ? 4 : 1, st.heavy ? 5 : 3); },
    charge: (p, f) => G.timers.push({ t: 0.18, fn: () => {
      const q = G.p, t = awNear(q.x, q.y, 90, 1)[0], n = 4 + Math.round(4 * f), R = 30 + 40 * f;
      if (t) chainLightning(t, 4 + Math.round(5 * f), 7 * f);
      for (let i = 0; i < n; i++) { const b = (i * TAU) / n; awStrike(clamp(q.x + Math.cos(b) * R, B.x0 + 6, B.x1 - 6), clamp(q.y + Math.sin(b) * R * 0.7, B.y0 + 6, B.y1 - 4), 22, Math.round(10 + 8 * f)); }
      for (const e of awNear(q.x, q.y, 120, 2)) awStrike(e.x, e.y, 24, Math.round(14 * f));
    } }),
    skill: (p) => { const e = awNear(p.x, p.y, 120, 1)[0]; if (e) chainLightning(e, 5, 5); },
    ult: (p) => { const e = awNear(p.x, p.y, 200, 1)[0]; if (e) chainLightning(e, 10, 8); for (const t of awNear(p.x, p.y, 200, 4)) awStrike(t.x, t.y, 22, 10); },
  },
  // Titan Grom: every blow sends a shockwave through the enemies around the target; his powers quake and stun; Fortress opens with a great quake
  TANK: {
    pal: { col: '#e0223f', slash: 'titan', charge: 'titan', map: { [P.ember]: '#c81e36', [P.ember2]: '#ff3b3b', [P.ember3]: '#ffc0c0', '#8fa2bd': '#c81e36', '#cfe0f5': '#ff8a8a', '#3c4a63': '#2a0a10', [P.gold]: '#ff1a2a', [P.gold2]: '#6a0a14', '#e8c890': '#ff8a8a', '#7a5a3a': '#6a0a14', '#2a1f14': '#1a0608', '#7a6a5a': '#4a1018', '#a8946e': '#a0101e', '#5a4a3a': '#2a0a10', '#ff9a3c': '#ff3b3b' } },
    swing: (p, st, shape) => {
      shoot({ x: p.x + Math.cos(p.atkAng) * 12, y: p.y - 4, a: p.atkAng, sp: 220, dmg: pd(st.heavy ? 8 : 5), kb: 200, life: 0.45, kind: 'crescent', r: st.heavy ? 8 : 6, pierce: 99, c: '#8fa2bd', ug: true, slice: false, trail: false });
      if (shape === 'slam' || shape === 'spin') G.timers.push({ t: shape === 'slam' ? 0.24 : 0.12, fn: () => {
        const q = G.p, cx = q.x + Math.cos(q.atkAng) * 18, cy = q.y + Math.sin(q.atkAng) * 10;
        G.quakes.push({ x: cx, y: cy, r: 0, delay: 0, max: 80, friendly: true, hit: new Set(), dmg: 8, speed: 240, c: P.gold, c2: P.gold2, erase: true });
        for (let i = 0; i < 6; i++) { const b = (i * TAU) / 6; G.booms.push({ x: clamp(cx + Math.cos(b) * 34, B.x0 + 6, B.x1 - 6), y: clamp(cy + Math.sin(b) * 22, B.y0 + 6, B.y1 - 4), t: 0.08 + i * 0.03, friendly: true, R: 16, dmg: 6 }); }
        shake(0.5); A.boom(1);
      } });
    },
    charge: (p, f) => { for (let i = 0; i < 8; i++) { const b = (i * TAU) / 8, R = 40 + 50 * f; G.booms.push({ x: clamp(p.x + Math.cos(b) * R, B.x0 + 6, B.x1 - 6), y: clamp(p.y + Math.sin(b) * R * 0.7, B.y0 + 6, B.y1 - 4), t: 0.25 + i * 0.03, friendly: true, R: 20, dmg: Math.round(8 + 10 * f) }); }
      for (let i = 1; i <= 3; i++) G.quakes.push({ x: p.x + Math.cos(p.aim) * 12, y: p.y + Math.sin(p.aim) * 7, r: 0, delay: 0.13 + i * 0.2, max: 70 + 80 * f, friendly: true, hit: new Set(), dmg: Math.round(10 * f), speed: 260, c: P.gold, c2: P.gold2, erase: true }); },
    hit: (e) => { for (const t of awNear(e.x, e.y, 26, 99, e)) damage(t, pd(2), { dir: Math.atan2(t.y - e.y, t.x - e.x), kb: 160, src: 'bolt' }); addRing(e.x, e.y - 2, P.gold, 90, 0.18, 1); },
    skill: (p) => { awBurst(p, 60, pd(5), P.gold, { kb: 260, each: (e) => awStun(e, 0.8) }); A.boom(0.8); },
    ult: (p) => { awBurst(p, 120, pd(10), P.gold, { kb: 380, each: (e) => awStun(e, 1.4) }); A.boom(1.4); },
  },
  // Unit-7 Omega: the laser scorches what it touches; its powers launch homing mini-rockets; the Orbital Laser comes with a rocket barrage
  ROBOT: {
    pal: { col: '#ff2a3a', slash: 'blood', map: { [P.volt]: '#ff2a3a', [P.volt2]: '#7a0a14', '#62efff': P.gold, [P.ember2]: P.gold, '#c8ffff': '#fff2c0' } },
    hit: (e) => ignite(e, 1.5, 3),
    skill: (p) => { for (let i = 0; i < 3; i++) shoot({ x: p.x, y: p.y - 10, a: p.aim + (i - 1) * 0.5, sp: 170, dmg: pd(3), kb: 60, life: 1.8, kind: 'rocket', homing: 5, splash: { R: 18, dmg: pd(4) }, c: P.ember2, ug: false }); A.rocket(); },
    ult: (p) => { for (let i = 0; i < 8; i++) shoot({ x: p.x, y: p.y - 10, a: (i * TAU) / 8, sp: 170, dmg: pd(4), kb: 80, life: 2, kind: 'rocket', homing: 5, splash: { R: 22, dmg: pd(6) }, c: P.ember2, ug: false }); A.rocket(); },
  },
  // Root (The Dev): each hit forks a bug into a nearby enemy; his powers crash the three nearest; his ultimate glitches everything in range
  DEV: {
    pal: { col: '#62efff', slash: 'volt', map: { '#39ff6a': '#62efff', '#9dffc0': '#c8ffff', '#c8ffd8': '#e8ffff' } },
    hit: (e) => { const t = awNear(e.x, e.y, 50, 1, e)[0]; if (t) { damage(t, pd(2), { dir: rnd(TAU), kb: 40, src: 'bolt' }); glitch(t.x, t.y - t.r, 10, 8, 0.15, 3); } },
    skill: (p) => { for (const e of awNear(p.x, p.y, 140, 3)) { damage(e, pd(6), { dir: rnd(TAU), kb: 120, src: 'bolt' }); glitch(e.x, e.y - e.r, 16, 12, 0.3, 6); } },
    ult: (p) => { for (const e of awNear(p.x, p.y, 200)) { damage(e, pd(8), { dir: rnd(TAU), kb: 160, src: 'bolt' }); glitch(e.x, e.y - e.r, 18, 14, 0.35, 6); } },
  },
};
for (const id in CHARS) { CHARS[id].flair = FLAIR[id]; CHARS[id].awake = AWAKE[id]; CHARS[id].drawAura = AURA[id]; CHARS[id].eyeColor = EYES[id]; }

// ---------- heroes: names, lore, and the mission that unlocks each one ----------
const pct = (v, max) => Math.min(v, max) + ' / ' + max;
const META = {
  BLADE: { hero: 'KAEL', lore: ['HIS ASHBLADE HOLDS THE LAST EMBER', 'OF THE OLD SUN. HE CAME TO RETURN IT.'] },
  GUNNER: { hero: 'VEGA HALE', lore: ['A BOUNTY HUNTER WHO FOLLOWED ONE', 'BOUNTY TOO DEEP INTO THE PIT.'], mission: ['REACH WAVE 10', () => 'BEST WAVE ' + pct(best.wave, 10)] },
  WIZARD: { hero: 'MORROW', lore: ['A WARLOCK WHO TRADED HIS FACE', 'FOR THE NAMES OF THE STARS.'], mission: ['LAND A 100-HIT COMBO', () => 'BEST COMBO ' + pct(best.combo, 100)] },
  NINJA: { hero: 'RIN', lore: ['THE LAST SAMURAI OF THE RED ONI CLAN.', 'STILL HAS HOMEWORK DUE FRIDAY.'], mission: ['25 PERFECT DODGES IN ONE RUN', () => 'BEST ' + pct(best.perfects, 25)] },
  MECHANIC: { hero: 'RIVET', lore: ['A SALVAGER WHO BUILDS HER WEAPONS', 'FROM WHAT THE COLOSSUS LEFT BEHIND.'], mission: ['KILL 1500 ENEMIES IN TOTAL', () => 'KILLS ' + pct(best.kills, 1500)] },
  TANK: { hero: 'GROM', lore: ["THE LAST KNIGHT OF THE KING'S GUARD.", 'HE CAME BACK TO END WHAT HE SERVED.'], mission: ['BEAT A BOSS WITHOUT GETTING HIT', () => 'ANY BOSS, ANY FIGHTER'] },
  ROBOT: { hero: 'UNIT-7', lore: ['A WAR MACHINE THAT WOKE UP WITH', 'ONE ORDER LEFT: STOP THE KING.'], mission: ['DEFEAT THE ASHEN KING', () => (best.won ? 'DONE' : 'THE KING WAITS AT WAVE 20')] },
  DEV: { hero: 'THE DEV', lore: ['THE ONE WHO WROTE THIS WORLD.', 'NOW DEBUGGING IT FROM THE INSIDE.'], mission: ['REACH WAVE 50', () => 'BEST WAVE ' + pct(best.wave, 50)] },
};
for (const id in META) Object.assign(CHARS[id], META[id]);
