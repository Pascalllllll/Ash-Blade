import { ctx, P, px, line, ring, disc, rect, glow, drawSprite, makeCanvas, textO } from './gfx.js?v=42';
import { A } from './audio.js?v=42';
import {
  G, B, TAU, rnd, clamp, hyp, angDiff, alive, part, sparks, dust, addText, addRing, tryHurt, fire, shake, hitstop, flash,
  spawnEnemy, scorch, atWall, sprFor, glitch, heroSet,
} from './world.js?v=42';
import { SPR } from './sprites.js?v=42';

export const ORDER = ['warden', 'brood', 'colossus', 'king', 'wyrm', 'herald', 'mirror', 'eclipse', 'clock', 'devboss'];
export const bossFor = (wave) => ORDER[(Math.floor(wave / 5) - 1) % ORDER.length];

const pick = (e, opts) => { let k = opts[Math.floor(rnd(opts.length))]; if (k === e.last) k = opts[Math.floor(rnd(opts.length))]; e.last = k; return k; };
function phaseBanner(text, c) { G.banner = { text, sub: '', t: 0, life: 1.4, c }; }
// a dithered wedge, filled as one shape with a checker pattern
const checks = {};
function checker(c) {
  if (!checks[c]) { const cv = makeCanvas(2, 2), g = cv.getContext('2d'); g.fillStyle = c; g.fillRect(0, 0, 1, 1); g.fillRect(1, 1, 1, 1); checks[c] = ctx.createPattern(cv, 'repeat'); }
  return checks[c];
}
function cone(e, R, arc, blink, c1, c2) {
  ctx.fillStyle = checker(blink ? c1 : c2);
  ctx.beginPath(); ctx.moveTo(e.x, e.y - 4); ctx.arc(e.x, e.y - 4, R, e.lock - arc / 2, e.lock + arc / 2); ctx.closePath(); ctx.fill();
}
function bigSlash(e, R, arc, col) {
  const p = G.p;
  G.slashes.push({ follow: false, x: e.x, y: e.y - 4, a: e.lock, r: R, arc, dir: e.sdir = -(e.sdir || 1), t: 0, life: 0.26, th: 13, col });
  if (hyp(p.x - e.x, p.y - e.y) < R + 4 && Math.abs(angDiff(Math.atan2(p.y - e.y, p.x - e.x), e.lock)) < arc / 2 + 0.15) tryHurt(2, e.x, e.y);
  shake(0.35); A.heavySwing(); A.wall();
}
const introBars = (e) => e.state === 'intro';

export const BOSSES = {
  // ---------------------------------------------------------------- wave 5
  warden: {
    name: 'THE WARDEN', short: 'WARDEN', sub: 'KEEPER OF THE PIT', col: '#ff4fa8', colD: '#6e1b52', hp: 820, r: 13, speed: 34, score: 6000, music: 'boss_warden',
    init(e) { e.state = 'intro'; e.t = 2.2; e.z = 240; },
    update(e, dt, d, ang, dx) {
      const p = G.p, rage = e.phase === 2 ? 1.3 : 1;
      e.superArmor = true; e.kx = e.ky = 0;
      if (e.state === 'intro') {
        e.t -= dt;
        // crashes down from the sky
        if (e.z > 0) { e.z = Math.max(0, e.z - 520 * dt); if (Math.random() < 0.8) part(e.x + rnd(-8, 8), e.y - e.z - 20, rnd(-20, 20), -rnd(30, 80), 0.4, P.hex, { glow: true, keep: true }); if (e.z === 0) { shake(1); hitstop(0.1); A.boom(2); dust(e.x, e.y, 40, 160); scorch(e.x, e.y, 20); addRing(e.x, e.y, P.paper, 400, 0.5, 3); A.bossRoar(); } }
        if (e.t <= 0) { e.state = 'walk'; e.cd = 0.6; }
        return;
      }
      if (e.phase === 1 && e.hp < e.maxHp * 0.5 && e.state !== 'jump') {
        e.phase = 2; e.state = 'roar'; e.t = 1.2; A.bossRoar(); shake(0.7);
        addRing(e.x, e.y - 16, P.hex, 260, 0.5, 3); phaseBanner('IT RAGES', P.hex);
      }
      switch (e.state) {
        case 'roar': e.t -= dt; if (d < 60 && e.t > 0.9) { p.vx += Math.cos(ang) * 30; p.vy += Math.sin(ang) * 30; } if (e.t <= 0) { e.state = 'walk'; e.cd = 0.5; } break;
        case 'walk': {
          if (d > 34) { e.vx = Math.cos(ang) * e.speed * rage; e.vy = Math.sin(ang) * e.speed * rage; }
          e.face = dx < 0 ? -1 : 1; e.cd -= dt;
          if (e.cd <= 0) {
            const opts = ['jump', 'spiral'];
            if (d < 72) opts.push('sweep', 'sweep', 'sweep');
            if (G.E.filter(alive).length < 5) opts.push('summon');
            opts.push('soulring');
            if (e.phase === 2) opts.push('dash', 'dash', 'jump', 'chains', 'chains');
            const k = pick(e, opts);
            if (k === 'soulring') { e.state = 'soulW'; e.t = 0.6; }
            else if (k === 'chains') { e.state = 'chainsW'; e.t = 0.6; A.warn(); }
            else             if (k === 'sweep') { e.state = 'sweepW'; e.t = e.phase === 2 ? 0.55 : 0.7; e.lock = ang; }
            else if (k === 'jump') { e.state = 'jump'; e.t = 0; e.jd = 0.8; e.jx0 = e.x; e.jy0 = e.y; e.jx = clamp(p.x, B.x0 + 20, B.x1 - 20); e.jy = clamp(p.y, B.y0 + 20, B.y1 - 10); A.dash(); dust(e.x, e.y, 14, 70); }
            else if (k === 'spiral') { e.state = 'spiral'; e.t = e.phase === 2 ? 2.2 : 1.8; e.fireT = 0.3; e.spin = ang; }
            else if (k === 'summon') { e.state = 'summon'; e.t = 1; e.summoned = false; A.bossRoar(); }
            else { e.state = 'dashW'; e.t = 0.75; e.lock = ang; }
          }
          break;
        }
        case 'sweepW': e.t -= dt; if (e.t > 0.24) { e.lock = ang; e.face = dx < 0 ? -1 : 1; } if (e.t <= 0) { bigSlash(e, 62, 2.7, 'hex'); e.state = 'rec'; e.t = 0.7 / rage; } break;
        case 'jump': {
          e.t += dt;
          const k = Math.min(1, e.t / e.jd);
          e.x = e.jx0 + (e.jx - e.jx0) * k; e.y = e.jy0 + (e.jy - e.jy0) * k; e.z = Math.sin(k * Math.PI) * 50;
          if (k >= 1) {
            e.z = 0;
            for (let i = 0; i < (e.phase === 2 ? 4 : 3); i++) G.quakes.push({ x: e.x, y: e.y, r: 0, delay: i * 0.3, max: 170, hitP: false });
            if (d < 28) tryHurt(2, e.x, e.y);
            shake(0.9); A.boom(1.8); hitstop(0.06); dust(e.x, e.y, 40, 140); scorch(e.x, e.y, 16);
            e.state = 'rec'; e.t = 0.85 / rage;
          }
          break;
        }
        case 'spiral':
          e.t -= dt; e.fireT -= dt;
          if (e.fireT <= 0) { e.fireT = 0.12 / rage; const arms = e.phase === 2 ? 3 : 2; for (let k = 0; k < arms; k++) fire(e.x, e.y - 20, e.spin + (k * TAU) / arms, 72); e.spin += 0.34; A.shoot(); }
          if (e.t <= 0) { e.state = 'rec'; e.t = 0.6; }
          break;
        case 'summon':
          e.t -= dt;
          if (!e.summoned && e.t < 0.45) { e.summoned = true; for (const k of e.phase === 2 ? ['husk', 'husk', 'tick', 'tick'] : ['husk', 'husk', 'husk']) G.queue.push(k); addRing(e.x, e.y - 16, P.ichor, 200, 0.4, 2); }
          if (e.t <= 0) { e.state = 'rec'; e.t = 0.4; }
          break;
        case 'dashW': e.t -= dt; if (e.t > 0.25) { e.lock = ang; e.face = dx < 0 ? -1 : 1; } if (e.t <= 0) { e.state = 'dash'; e.t = 0.5; e.hitP = false; A.dash(); } break;
        case 'dash': {
          const cx = Math.cos(e.lock), cy = Math.sin(e.lock);
          e.vx = cx * 330; e.vy = cy * 330; e.t -= dt;
          if (!e.hitP && d < e.r + 7) { if (tryHurt(2, e.x, e.y) === true) e.hitP = true; }
          if (atWall(e, cx, cy)) { e.t = 0; shake(0.5); A.wall(); dust(e.x, e.y, 20, 90); }
          if (e.t <= 0) { e.state = 'rec'; e.t = 0.7; }
          break;
        }
        case 'soulW':
          e.t -= dt;
          if (e.t <= 0) {
            // a ring of soul orbs with one gap you have to find
            const ring = (gap) => { for (let i = 0; i < 30; i++) { const a2 = (i * TAU) / 30; if (Math.abs(angDiff(a2, gap)) < 0.5) continue; fire(e.x, e.y - 20, a2, 62); } A.shoot(); };
            ring(rnd(TAU));
            if (e.phase === 2) G.timers.push({ t: 0.6, fn: () => { if (!e.dead && !e.dying) ring(rnd(TAU)); } });
            e.state = 'rec'; e.t = 1;
          }
          break;
        case 'chainsW':
          e.t -= dt;
          if (e.t <= 0) {
            const off = rnd(TAU), dir = Math.random() < 0.5 ? 1 : -1;
            for (let i = 0; i < 4; i++) G.hbeams.push({ owner: e, oy: 20, x: e.x, y: e.y - 20, a: off + (i * Math.PI) / 2, rot: dir * 0.9, w: 4, warn: 0.6, t: 0, life: 3, len: 0 });
            e.state = 'rec'; e.t = 3; A.loop('bossbeam', true, 'boss'); G.timers.push({ t: 3, fn: () => A.loop('bossbeam', false) });
          }
          break;
        case 'rec': e.t -= dt; if (e.t <= 0) { e.state = 'walk'; e.cd = rnd(0.3, 0.8) / rage; } break;
      }
      e.tele = e.state === 'sweepW' || e.state === 'dashW';
    },
    tele(e, blink) {
      if (e.state === 'sweepW') cone(e, 62, 2.7, blink, P.bloodD, '#3a0a18');
      if (e.state === 'dashW') { const cx = Math.cos(e.lock), cy = Math.sin(e.lock); line(e.x + cx * 14, e.y + cy * 14, e.x + cx * 165, e.y + cy * 165, blink ? P.blood : P.bloodD, 3); }
      if (e.state === 'jump') { const k = Math.min(1, e.t / e.jd); ring(e.jx, e.jy, 30 * (1 - k) + 6, 1, blink ? P.blood : P.paper); }
      if (e.state === 'intro' && e.z > 0) { ring(e.x, e.y, 6 + e.z / 12, 1, blink ? P.blood : P.paper); ring(e.x, e.y, 3, 1, P.blood); }
    },
    draw(e, x, y) {
      glow(e.x, y + 8, P.hex, e.phase === 2 ? 16 : 10, e.phase === 2 ? 0.45 : 0.25);
      const hx = e.x + e.face * 11, hy = e.y - 18 - (e.z || 0);
      const a = e.state === 'sweepW' ? e.lock + Math.PI * 0.7 * e.face : e.state === 'dash' || e.state === 'dashW' ? e.lock : Math.PI / 2 + e.face * 0.5;
      line(hx, hy, hx + Math.cos(a) * 22, hy + Math.sin(a) * 22, P.dust, 2);
      line(hx, hy, hx + Math.cos(a) * 22, hy + Math.sin(a) * 22, P.bone);
    },
    bars: introBars,
  },

  // ---------------------------------------------------------------- wave 10
  brood: {
    name: 'THE BROOD MOTHER', short: 'BROOD MOTHER', sub: 'SHE NESTS BELOW', col: '#b5f23a', colD: '#45651a', hp: 1250, r: 14, speed: 40, score: 9000, music: 'boss_brood',
    init(e) { e.state = 'intro'; e.t = 2.4; e.under = true; e.mx = e.x - 120; e.my = e.y + 60; },
    update(e, dt, d, ang, dx) {
      const p = G.p, rage = e.phase === 2 ? 1.25 : 1;
      e.superArmor = true; e.kx = e.ky = 0;
      if (e.state === 'intro') {
        // a mound tunnels toward the center, then she bursts out
        e.t -= dt;
        if (e.under) {
          e.mx += (e.x - e.mx) * Math.min(1, dt * 2); e.my += (e.y - e.my) * Math.min(1, dt * 2);
          if (Math.random() < 0.9) dust(e.mx, e.my, 2, 40);
          shake(0.04);
          if (e.t < 1.2) {
            e.under = false; A.bossRoar(); A.boom(1.6); shake(0.9); hitstop(0.08);
            for (let i = 0; i < 50; i++) { const a = rnd(TAU), v = rnd(60, 220); part(e.x, e.y, Math.cos(a) * v, Math.sin(a) * v, rnd(0.4, 0.9), Math.random() < 0.5 ? P.stone2 : '#6a5040', { z: 4, vz: rnd(60, 160), g: 300, drag: 2, s: 2, keep: true }); }
            scorch(e.x, e.y, 22); addRing(e.x, e.y, P.ichor, 320, 0.5, 3);
          }
        }
        if (e.t <= 0) { e.state = 'walk'; e.cd = 0.5; }
        return;
      }
      if (e.phase === 1 && e.hp < e.maxHp * 0.5 && !e.under) { e.phase = 2; e.state = 'rec'; e.t = 1; A.bossRoar(); shake(0.6); phaseBanner('THE NEST AWAKENS', P.ichor); for (let i = 0; i < 4; i++) spawnEnemy('egg', clamp(e.x + rnd(-50, 50), B.x0 + 10, B.x1 - 10), clamp(e.y + rnd(-40, 40), B.y0 + 10, B.y1 - 6)); }
      switch (e.state) {
        case 'walk': {
          e.vx = Math.cos(ang) * e.speed * rage; e.vy = Math.sin(ang) * e.speed * rage;
          e.face = dx < 0 ? -1 : 1; e.cd -= dt;
          if (e.cd <= 0) {
            const eggs = G.E.filter((o) => o.type === 'egg' && !o.dead).length;
            const opts = ['burrow', 'spit', 'spit'];
            if (eggs < 4) opts.push('eggs');
            if (d < 110) opts.push('lunge', 'lunge');
            if (G.E.filter((o) => o.type === 'larva' && !o.dead).length < 10) opts.push('swarm', 'swarm');
            if (e.phase === 2) opts.push('acidrain');
            const k = pick(e, opts);
            if (k === 'swarm') { e.state = 'swarmW'; e.t = 0.8; e.laid = false; A.bossRoar(); }
            else if (k === 'acidrain') {
              for (let i = 0; i < 26; i++) G.strikes.push({ x: rnd(B.x0 + 10, B.x1 - 10), y: rnd(B.y0 + 10, B.y1 - 6), x0: e.x, y0: e.y - 14, t: -i * 0.07, delay: 0.8, R: 12, dmg: 1, friendly: false, kind: 'acid', c: P.ichor });
              A.splat(); phaseBanner('ACID RAIN', P.ichor); e.state = 'rec'; e.t = 2;
            } else             if (k === 'burrow') { e.state = 'dig'; e.t = 0.5; A.wall(); }
            else if (k === 'spit') { e.state = 'spit'; e.t = 1.3; e.fireT = 0.2; }
            else if (k === 'eggs') { e.state = 'lay'; e.t = 0.9; e.laid = false; }
            else { e.state = 'lungeW'; e.t = 0.5; e.lock = ang; }
          }
          break;
        }
        case 'dig':
          e.t -= dt; dust(e.x, e.y, 2, 60); shake(0.05);
          if (e.t <= 0) { e.under = true; e.state = 'tunnel'; e.t = e.phase === 2 ? 1.2 : 1.6; e.mx = e.x; e.my = e.y; }
          break;
        case 'tunnel':
          e.t -= dt;
          if (e.t > 0.5) { e.vx = Math.cos(ang) * 125; e.vy = Math.sin(ang) * 125; }
          e.mx = e.x; e.my = e.y;
          if (Math.random() < 0.9) dust(e.x, e.y, 2, 40);
          if (e.t <= 0) {
            e.under = false;
            if (d < 32) tryHurt(2, e.x, e.y);
            G.quakes.push({ x: e.x, y: e.y, r: 0, delay: 0, max: 70, hitP: false });
            if (e.phase === 2) for (let i = 0; i < 8; i++) { const a = (i * TAU) / 8; G.strikes.push({ x: clamp(e.x + Math.cos(a) * 60, B.x0 + 8, B.x1 - 8), y: clamp(e.y + Math.sin(a) * 45, B.y0 + 8, B.y1 - 4), x0: e.x, y0: e.y - 14, t: 0, delay: 0.6, R: 12, dmg: 1, friendly: false, kind: 'acid', c: P.ichor }); }
            A.boom(1.4); A.bossRoar(); shake(0.8); dust(e.x, e.y, 40, 160); scorch(e.x, e.y, 16);
            e.state = 'rec'; e.t = 0.9;
          }
          break;
        case 'spit':
          e.t -= dt; e.fireT -= dt; e.face = dx < 0 ? -1 : 1;
          if (e.fireT <= 0) {
            e.fireT = 0.4;
            for (let i = 0; i < 5; i++) G.strikes.push({ x: clamp(p.x + rnd(-40, 40), B.x0 + 8, B.x1 - 8), y: clamp(p.y + rnd(-30, 30), B.y0 + 8, B.y1 - 4), x0: e.x, y0: e.y - 14, t: 0, delay: rnd(0.6, 0.9), R: 12, dmg: 1, friendly: false, kind: 'acid', c: P.ichor });
            A.splat(); A.shoot();
          }
          if (e.t <= 0) { e.state = 'rec'; e.t = 0.6; }
          break;
        case 'lay':
          e.t -= dt;
          if (!e.laid && e.t < 0.45) {
            e.laid = true;
            for (let i = 0; i < (e.phase === 2 ? 5 : 3); i++) spawnEnemy('egg', clamp(e.x + rnd(-40, 40), B.x0 + 10, B.x1 - 10), clamp(e.y + rnd(-10, 30), B.y0 + 10, B.y1 - 6));
            A.splat(); addRing(e.x, e.y, P.ichor, 160, 0.3, 2);
          }
          if (e.t <= 0) { e.state = 'rec'; e.t = 0.5; }
          break;
        case 'lungeW': e.t -= dt; if (e.t > 0.15) { e.lock = ang; e.face = dx < 0 ? -1 : 1; } if (e.t <= 0) { e.state = 'lunge'; e.t = 0.38; e.hitP = false; A.dash(); } break;
        case 'lunge':
          e.vx = Math.cos(e.lock) * 290; e.vy = Math.sin(e.lock) * 290; e.t -= dt;
          if (!e.hitP && d < e.r + 7) { if (tryHurt(2, e.x, e.y) === true) e.hitP = true; }
          if (e.t <= 0 || atWall(e, Math.cos(e.lock), Math.sin(e.lock))) { e.state = 'rec'; e.t = 0.6; }
          break;
        case 'swarmW':
          e.t -= dt;
          if (!e.laid && e.t < 0.4) {
            e.laid = true;
            for (let i = 0; i < (e.phase === 2 ? 12 : 8); i++) { const a2 = (i * TAU) / 8; spawnEnemy('larva', clamp(e.x + Math.cos(a2) * 18, B.x0 + 6, B.x1 - 6), clamp(e.y + Math.sin(a2) * 12, B.y0 + 6, B.y1 - 4)); }
            addRing(e.x, e.y, P.ichor, 200, 0.3, 2); A.splat();
          }
          if (e.t <= 0) { e.state = 'rec'; e.t = 0.6; }
          break;
        case 'rec': e.t -= dt; if (e.t <= 0) { e.state = 'walk'; e.cd = rnd(0.3, 0.8) / rage; } break;
      }
      e.tele = e.state === 'lungeW' || e.state === 'dig';
    },
    tele(e, blink) {
      if (e.under) {
        const x = e.state === 'intro' ? e.mx : e.x, y = e.state === 'intro' ? e.my : e.y;
        for (let i = -8; i <= 8; i += 2) px(x + i, y - Math.round(Math.cos(i / 5) * 3) + (Math.random() < 0.3 ? -1 : 0), '#6a5040');
        rect(x - 7, y - 1, 15, 2, '#3d2a20');
        if (e.state === 'tunnel' && e.t < 0.5) { ring(e.x, e.y, 32 * (0.4 + 0.6 * (1 - e.t / 0.5)), 1, blink ? P.blood : P.paper); ring(e.x, e.y, 32, 1, P.bloodD); }
      }
      if (e.state === 'lungeW') { const cx = Math.cos(e.lock), cy = Math.sin(e.lock); line(e.x + cx * 14, e.y + cy * 14, e.x + cx * 120, e.y + cy * 120, blink ? P.blood : P.bloodD, 3); }
    },
    draw(e, x, y) { glow(e.x, y + 4, P.ichor, e.phase === 2 ? 14 : 9, 0.3); },
    bars: introBars,
  },

  // ---------------------------------------------------------------- wave 15
  colossus: {
    name: 'IRON COLOSSUS', short: 'COLOSSUS', sub: 'A WAR MACHINE NOBODY TURNED OFF', col: '#ff7a2b', colD: '#5a2410', hp: 1550, r: 14, speed: 26, score: 12000, music: 'boss_colossus',
    init(e) { e.state = 'intro'; e.t = 2.6; e.off = true; },
    onHit(e, o) {
      if (e.shieldUp && o.src === 'orb') {
        e.shieldUp = false; e.armor = 1.6; e.state = 'stun'; e.t = 2.2; e.vx = e.vy = 0;
        addText(e.x, e.y - 40, 'SHIELD BROKEN', P.gold); A.shieldHit(); A.boom(1.2); shake(0.6); hitstop(0.1); addRing(e.x, e.y - 16, '#62efff', 300, 0.4, 3);
      }
    },
    update(e, dt, d, ang, dx) {
      const p = G.p, rage = e.phase === 2 ? 1.25 : 1;
      e.superArmor = true; e.kx = e.ky = 0;
      if (e.state === 'intro') {
        // powers on: visor lights, steam, two stomps
        e.t -= dt;
        if (e.off && e.t < 1.9) { e.off = false; A.warn(); flash('#ff4f4f', 0.12, false); }
        if (!e.off && Math.random() < 0.5) part(e.x + rnd(-12, 12), e.y - rnd(20, 30), rnd(-10, 10), -rnd(20, 50), 0.6, P.bone, { drag: 2, keep: true });
        for (const st of [1.2, 0.6]) if (e.t < st && e.t + dt >= st) { shake(0.7); A.boom(1.6); dust(e.x, e.y, 30, 140); addRing(e.x, e.y, '#ff7a2b', 300, 0.4, 2); }
        if (e.t <= 0) { e.state = 'walk'; e.cd = 0.4; }
        return;
      }
      if (e.phase === 1 && e.hp < e.maxHp * 0.5 && e.state !== 'stun') {
        e.phase = 2; e.shieldUp = false; e.armor = 0; e.state = 'rec'; e.t = 1; A.warn(); A.bossRoar(); shake(0.6); phaseBanner('OVERLOAD', '#ff7a2b');
      }
      switch (e.state) {
        case 'walk': {
          if (d > 50) { e.vx = Math.cos(ang) * e.speed * rage; e.vy = Math.sin(ang) * e.speed * rage; }
          e.face = dx < 0 ? -1 : 1; e.cd -= dt;
          if (e.cd <= 0) {
            const opts = ['laser', 'laser', 'missiles', 'missiles', 'stomp', 'shield', 'punch', 'punch'];
            if (e.phase === 2) opts.push('spin', 'spin');
            const k = pick(e, opts);
            if (k === 'punch') { e.state = 'punchW'; e.t = 0.6; e.lock = ang; A.warn(); }
            else if (k === 'spin') { e.state = 'spinW'; e.t = 0.8; A.warn(); }
            else             if (k === 'laser') { e.state = 'laserW'; e.t = 0.9; e.lock = ang; e.rdir = Math.random() < 0.5 ? 1 : -1; A.warn(); }
            else if (k === 'missiles') { e.state = 'volley'; e.t = 1.3; e.fireT = 0; }
            else if (k === 'stomp') { e.state = 'stompW'; e.t = 0.7; }
            else { e.state = 'shield'; e.t = 4.5; e.shieldUp = true; e.armor = 0.15; e.fireT = 0.5; A.shieldUp(); }
          }
          break;
        }
        case 'laserW':
          e.t -= dt;
          if (e.t > 0.3) e.lock = ang;
          if (e.t <= 0) {
            const start = e.lock - e.rdir * 1.0, rot = e.rdir * (e.phase === 2 ? 1.1 : 1.25);
            G.hbeams.push({ owner: e, oy: 22, x: e.x, y: e.y - 22, a: start, rot, w: 6, warn: 0.45, t: 0, life: 2.2, len: 0 });
            if (e.phase === 2) G.hbeams.push({ owner: e, oy: 22, x: e.x, y: e.y - 22, a: start + Math.PI, rot, w: 6, warn: 0.45, t: 0, life: 2.2, len: 0 });
            e.state = 'lasering'; e.t = 2.2; A.loop('bossbeam', true, 'boss');
          }
          break;
        case 'lasering': e.t -= dt; shake(0.04); if (e.t <= 0) { A.loop('bossbeam', false); e.state = 'rec'; e.t = 0.7; } break;
        case 'volley':
          e.t -= dt; e.fireT -= dt;
          if (e.fireT <= 0) {
            e.fireT = e.phase === 2 ? 0.08 : 0.12;
            const onYou = Math.random() < 0.3;
            G.strikes.push({ x: clamp(p.x + (onYou ? 0 : rnd(-70, 70)), B.x0 + 8, B.x1 - 8), y: clamp(p.y + (onYou ? 0 : rnd(-50, 50)), B.y0 + 8, B.y1 - 4), t: 0, delay: rnd(0.9, 1.4), R: 22, dmg: 2, friendly: false, kind: 'missile', c: '#ff7a2b' });
            A.rocket(); part(e.x + e.face * 12, e.y - 30, rnd(-20, 20), -rnd(80, 160), 0.4, P.ember2, { glow: true });
          }
          if (e.t <= 0) { e.state = 'rec'; e.t = 0.5; }
          break;
        case 'stompW':
          e.t -= dt;
          if (e.t <= 0) {
            for (let i = 0; i < (e.phase === 2 ? 3 : 2); i++) G.quakes.push({ x: e.x, y: e.y, r: 0, delay: i * 0.35, max: 160, hitP: false });
            shake(0.9); A.boom(2); dust(e.x, e.y, 30, 150); scorch(e.x, e.y, 14);
            e.state = 'rec'; e.t = 0.8;
          }
          break;
        case 'shield':
          e.t -= dt; e.fireT -= dt;
          if (e.fireT <= 0) { e.fireT = 0.65; const off = rnd(TAU); for (let i = 0; i < 10; i++) fire(e.x, e.y - 22, off + (i * TAU) / 10, 70); A.shoot(); }
          if (e.t <= 0) { e.shieldUp = false; e.armor = 0; e.state = 'rec'; e.t = 0.5; }
          break;
        case 'stun': e.t -= dt; if (Math.random() < 0.4) sparks(e.x + rnd(-10, 10), e.y - rnd(10, 30), rnd(TAU), 2, 1, '#62efff', 80); if (e.t <= 0) { e.armor = 0; e.state = 'rec'; e.t = 0.3; } break;
        case 'punchW':
          e.t -= dt;
          if (e.t > 0.2) { e.lock = ang; e.face = dx < 0 ? -1 : 1; }
          if (e.t <= 0) {
            // rocket fist: flies out, then comes back to the arm
            const n = e.phase === 2 ? 2 : 1;
            for (let i = 0; i < n; i++) fire(e.x + e.face * 14, e.y - 20, e.lock + (n > 1 ? (i - 0.5) * 0.5 : 0), 230, { r: 5, noparry: true, ret: e, retT: 0.9, fist: true, dmg: 2, life: 4, c: '#8b98ab' });
            A.rocket(); A.boom(0.6); shake(0.3);
            e.state = 'rec'; e.t = 1.4;
          }
          break;
        case 'spinW':
          e.t -= dt;
          if (e.t <= 0) {
            const off = rnd(TAU), dir = Math.random() < 0.5 ? 1 : -1;
            for (let i = 0; i < 4; i++) G.hbeams.push({ owner: e, oy: 22, x: e.x, y: e.y - 22, a: off + (i * Math.PI) / 2, rot: dir * 2.1, w: 6, warn: 0.5, t: 0, life: 3.4, len: 0 });
            e.state = 'lasering'; e.t = 3.4; A.loop('bossbeam', true, 'boss'); phaseBanner('OVERLOAD SPIN', '#ff7a2b');
          }
          break;
        case 'rec': e.t -= dt; if (e.t <= 0) { e.state = 'walk'; e.cd = rnd(0.4, 0.9) / rage; } break;
      }
      e.tele = e.state === 'stompW' || e.state === 'laserW';
    },
    tele(e, blink) {
      if (e.state === 'laserW') { const s = e.lock - e.rdir; line(e.x, e.y - 22, e.x + Math.cos(s) * 200, e.y - 22 + Math.sin(s) * 200, blink ? P.blood : P.bloodD); }
      if (e.state === 'punchW') { const cx = Math.cos(e.lock), cy = Math.sin(e.lock); line(e.x, e.y - 20, e.x + cx * 200, e.y - 20 + cy * 200, blink ? P.blood : P.bloodD, 3); }
      if (e.state === 'stompW') ring(e.x, e.y, 40 * (1 - e.t / 0.7) + 10, 1, blink ? P.blood : P.paper);
    },
    draw(e, x, y) {
      if (e.state === 'intro' && e.off) return;
      for (let i = 0; i < 10; i++) px(x + 7 + i, y + 3, Math.floor(G.time * 10 + i) % 4 ? '#ff4f4f' : P.paper);
      glow(e.x, y + 4, '#ff4f4f', 10, 0.4);
      glow(e.x, y + 10, '#ff7a2b', e.phase === 2 ? 12 : 7, 0.35);
      if (e.shieldUp) { ring(e.x, e.y - 14, 20 + Math.sin(G.time * 10), 1, '#62efff'); glow(e.x, e.y - 14, '#62efff', 22, 0.25); }
      if (e.state === 'stun') for (let i = 0; i < 4; i++) { const a = G.time * 5 + (i * TAU) / 4; px(e.x + Math.cos(a) * 12, y - 4 + Math.sin(a) * 3, P.gold); }
    },
    bars: introBars,
  },

  // ---------------------------------------------------------------- wave 20: final
  king: {
    name: 'THE ASHEN KING', short: 'ASHEN KING', sub: 'THE LAST FIRE', col: '#ff6a2b', colD: '#5a1420', hp: 3000, r: 20, speed: 55, scale: 2, score: 30000, music: 'boss_king', final: true,
    init(e) { e.state = 'intro'; e.t = 3; e.combo = 0; },
    update(e, dt, d, ang, dx) {
      const p = G.p;
      e.superArmor = true; e.kx = e.ky = 0;
      if (e.phase === 3) G.dark = Math.min(1, G.dark + dt * 0.8);
      if (e.state === 'intro') {
        // rises from a pillar of fire
        e.t -= dt;
        if (Math.random() < 0.95) part(e.x + rnd(-10, 10), e.y - rnd(0, 10), rnd(-15, 15), -rnd(80, 200), rnd(0.4, 0.9), Math.random() < 0.5 ? P.ember : P.ember3, { glow: true, keep: true, drag: 1 });
        if (e.t < 1.6 && e.t + dt >= 1.6) { flash('#ff6a2b', 0.3, true); shake(1); A.boom(2.4); A.bossRoar(); addRing(e.x, e.y - 10, P.ember, 420, 0.6, 3); for (let i = 0; i < 16; i++) fire(e.x, e.y - 36, (i * TAU) / 16, 40, { life: 1.2, dmg: 0 }); }
        if (e.t <= 0) { e.state = 'walk'; e.cd = 0.5; }
        return;
      }
      if (e.phase === 1 && e.hp < e.maxHp * 0.66) { e.phase = 2; e.state = 'rec'; e.t = 1.2; A.bossRoar(); shake(0.8); flash(P.ember, 0.2, true); phaseBanner('THE KING BURNS', P.ember); }
      else if (e.phase === 2 && e.hp < e.maxHp * 0.33) { e.phase = 3; e.state = 'rec'; e.t = 1.5; A.bossRoar(); shake(1); phaseBanner('THE KING UNBOUND', P.blood); }
      const spd = e.phase === 3 ? 1.35 : e.phase === 2 ? 1.15 : 1;
      switch (e.state) {
        case 'walk': {
          if (d > 44) { e.vx = Math.cos(ang) * e.speed * spd; e.vy = Math.sin(ang) * e.speed * spd; }
          e.face = dx < 0 ? -1 : 1; e.cd -= dt;
          if (e.cd <= 0) {
            const opts = ['blink', 'blink', 'rift', 'firering'];
            if (e.phase >= 2) opts.push('spiral', 'pillars');
            opts.push('flare');
            if (e.knights !== e.phase && e.phase >= 2) opts.push('knights', 'knights');
            if (e.phase === 3) opts.push('thousand', 'meteors', 'thousand', 'crown', 'crown');
            const k = pick(e, opts);
            if (k === 'flare') {
              for (let i = 0; i < 3; i++) G.quakes.push({ x: e.x, y: e.y, r: 0, delay: i * 0.35, max: 220, hitP: false, speed: 150, c: P.ember, c2: '#5a1420' });
              flash(P.ember, 0.1, false); A.boom(1.6); shake(0.6); e.state = 'rec'; e.t = 1.4; e.cd = 0;
            } else if (k === 'knights') {
              e.knights = e.phase;
              for (const side of [-1, 1]) { const kn = spawnEnemy('brute', clamp(e.x + side * 50, B.x0 + 12, B.x1 - 12), clamp(e.y + 20, B.y0 + 12, B.y1 - 6)); kn.elite = true; kn.hp = kn.maxHp = Math.round(kn.hp * 2.4); }
              phaseBanner('ASH KNIGHTS', P.ember); A.bossRoar(); e.state = 'rec'; e.t = 1;
            } else if (k === 'crown') {
              const off = rnd(TAU);
              for (let i = 0; i < 6; i++) G.hbeams.push({ owner: e, oy: 40, x: e.x, y: e.y - 40, a: off + (i * TAU) / 6, rot: 0.75, w: 5, warn: 0.8, t: 0, life: 3.6, len: 0 });
              phaseBanner('CROWN OF FIRE', P.gold); A.warn(); A.loop('bossbeam', true, 'boss'); G.timers.push({ t: 3.6, fn: () => A.loop('bossbeam', false) });
              e.state = 'rec'; e.t = 3.6;
            } else             if (k === 'blink') { e.combo = e.phase === 1 ? 2 : 3; e.state = 'blink'; e.t = 0.25; }
            else if (k === 'rift') { riftLines(e, e.phase === 1 ? 3 : 5); e.state = 'rec'; e.t = 1.2; }
            else if (k === 'firering') { e.state = 'firering'; e.t = 1.1; e.n = 0; e.fireT = 0; }
            else if (k === 'spiral') { e.state = 'spiral'; e.t = 2.2; e.fireT = 0; e.spin = ang; }
            else if (k === 'pillars') { for (let i = 0; i < 7; i++) { const a = rnd(TAU), r = i === 0 ? 0 : rnd(10, 70); G.strikes.push({ x: clamp(p.x + Math.cos(a) * r, B.x0 + 8, B.x1 - 8), y: clamp(p.y + Math.sin(a) * r * 0.7, B.y0 + 8, B.y1 - 4), t: 0, delay: 0.7 + i * 0.16, R: 20, dmg: 2, friendly: false, kind: 'pillar', c: P.ember }); } A.warn(); e.state = 'rec'; e.t = 1.4; }
            else if (k === 'thousand') { thousand(e); e.state = 'rec'; e.t = 1.9; }
            else { for (let i = 0; i < 12; i++) G.strikes.push({ x: clamp(p.x + rnd(-110, 110), B.x0 + 8, B.x1 - 8), y: clamp(p.y + rnd(-70, 70), B.y0 + 8, B.y1 - 4), t: -i * 0.15, delay: 0.9, R: 26, dmg: 2, friendly: false, kind: 'meteor', c: P.ember }); A.meteorFall(); e.state = 'rec'; e.t = 1.6; }
          }
          break;
        }
        case 'blink':
          e.t -= dt;
          if (e.t <= 0) {
            for (let i = 0; i < 5; i++) part(e.x, e.y - 14, rnd(-60, 60), rnd(-60, 60), 0.3, P.ember, { glow: true });
            G.ghosts.push({ x: e.x, y: e.y, flip: e.face < 0, t: 0, life: 0.35, c: P.ember, spr: sprFor(e) });
            const a = rnd(TAU);
            e.x = clamp(p.x + Math.cos(a) * 52, B.x0 + 22, B.x1 - 22); e.y = clamp(p.y + Math.sin(a) * 36, B.y0 + 22, B.y1 - 4);
            e.face = p.x < e.x ? -1 : 1; e.lock = Math.atan2(p.y - e.y, p.x - e.x);
            e.state = 'kslashW'; e.t = e.phase === 3 ? 0.32 : 0.42; A.rift();
          }
          break;
        case 'kslashW':
          e.t -= dt;
          if (e.t > 0.15) e.lock = ang;
          if (e.t <= 0) {
            bigSlash(e, 80, 2.8, 'fire');
            if (--e.combo > 0) { e.state = 'blink'; e.t = 0.18; } else { e.state = 'rec'; e.t = 0.6; }
          }
          break;
        case 'firering':
          e.t -= dt; e.fireT -= dt;
          if (e.fireT <= 0 && e.n < 3) { e.fireT = 0.35; e.n++; const off = rnd(TAU); for (let i = 0; i < 16; i++) fire(e.x, e.y - 36, off + (i * TAU) / 16, 76, { noparry: i % 2 === 1 }); A.shoot(); }
          if (e.t <= 0) { e.state = 'rec'; e.t = 0.5; }
          break;
        case 'spiral':
          e.t -= dt; e.fireT -= dt;
          if (e.fireT <= 0) { e.fireT = 0.1; for (let k = 0; k < 3; k++) fire(e.x, e.y - 36, e.spin + (k * TAU) / 3, 80, { noparry: k === 0 }); e.spin += 0.29 * (e.phase === 3 ? -1 : 1); A.shoot(); }
          if (e.t <= 0) { e.state = 'rec'; e.t = 0.6; }
          break;
        case 'rec': e.t -= dt; if (e.t <= 0) { e.state = 'walk'; e.cd = rnd(0.3, 0.8) / spd; } break;
      }
      e.tele = e.state === 'kslashW';
      if (Math.random() < 0.5) part(e.x + rnd(-8, 8), e.y - rnd(2, 12), rnd(-10, 10), -rnd(20, 50), 0.5, Math.random() < 0.5 ? P.ember : '#8a2a30', { glow: true, drag: 1 });
    },
    tele(e, blink) {
      if (e.state === 'kslashW') cone(e, 80, 2.8, blink, '#5a1a0a', '#2a0a04');
      if (e.state === 'intro') {
        const w = Math.max(2, 40 * Math.min(1, (3 - e.t) / 0.6));
        rect(e.x - w / 2, e.y - 170, w, 170, '#c6380f'); rect(e.x - w / 4, e.y - 170, w / 2, 170, P.ember3);
        glow(e.x, e.y - 20, P.ember, 30, 0.6);
      }
    },
    draw(e, x, y) {
      const hx = e.x + e.face * 18, hy = e.y - 30;
      const a = e.state === 'kslashW' ? e.lock + Math.PI * 0.7 * e.face : Math.PI / 2 + e.face * 0.6;
      line(hx, hy, hx + Math.cos(a) * 48, hy + Math.sin(a) * 48, '#c6380f', 5);
      line(hx, hy, hx + Math.cos(a) * 48, hy + Math.sin(a) * 48, P.ember3, 2);
      if (Math.random() < 0.8) part(hx + Math.cos(a) * rnd(4, 48), hy + Math.sin(a) * rnd(4, 48), 0, -rnd(20, 40), 0.3, P.ember, { glow: true });
      glow(e.x, y + 8, P.gold, 14, 0.45);
      glow(e.x, y + 28, P.ember, e.phase * 10, 0.35);
    },
    bars: introBars,
  },
};

// ================================================================ after wave 20
const orbRing = (e, n, sp, gapA, o = {}) => { for (let i = 0; i < n; i++) { const a = (i * TAU) / n; if (gapA !== undefined && Math.abs(angDiff(a, gapA)) < 0.5) continue; fire(e.x, e.y - (o.oy ?? 16), a, sp, o); } A.shoot(); };
const walkTo = (e, x, y, sp) => { const d = hyp(x - e.x, y - e.y); if (d > 2) { e.vx = ((x - e.x) / d) * sp; e.vy = ((y - e.y) / d) * sp; } };
const VOID = '#9b5cff';

Object.assign(BOSSES, {
  // ---------------------------------------------------------------- wave 25
  wyrm: {
    name: 'VOID WYRM', short: 'VOID WYRM', sub: 'IT SWIMS THROUGH STONE', col: VOID, colD: '#3a1a6a', hp: 2000, r: 11, speed: 70, score: 16000, music: 'boss_wyrm',
    init(e) { e.state = 'intro'; e.t = 2.2; e.under = true; e.trail = []; e.wob = 0; e.cdir = 1; },
    update(e, dt, d, ang, dx) {
      const p = G.p, spd = e.phase === 2 ? 1.3 : 1;
      e.superArmor = true; e.kx = e.ky = 0;
      const last = e.trail[0];
      if (!last || hyp(last.x - e.x, last.y - e.y) > 3) { e.trail.unshift({ x: e.x, y: e.y }); if (e.trail.length > 70) e.trail.pop(); }
      // the body hurts to touch
      if (!e.under) for (let i = 4; i < e.trail.length; i += 5) { const s = e.trail[i]; if (hyp(p.x - s.x, p.y - s.y) < 8) { tryHurt(2, s.x, s.y); break; } }
      if (e.state === 'intro') {
        e.t -= dt; dust(e.x, e.y, 1, 30);
        if (e.under && e.t < 1.2) { e.under = false; A.bossRoar(); A.boom(1.8); shake(0.9); orbRing(e, 14, 60, undefined, { c: VOID }); scorch(e.x, e.y, 18); addRing(e.x, e.y, VOID, 320, 0.5, 3); }
        if (e.t <= 0) { e.state = 'walk'; e.cd = 0.6; }
        return;
      }
      if (e.phase === 1 && e.hp < e.maxHp * 0.5 && !e.under) { e.phase = 2; e.state = 'rec'; e.t = 0.8; A.bossRoar(); phaseBanner('THE VOID HUNGERS', VOID); shake(0.7); }
      switch (e.state) {
        case 'walk': {
          e.wob += dt * 4;
          const a = ang + Math.sin(e.wob) * 0.8;
          e.vx = Math.cos(a) * e.speed * spd; e.vy = Math.sin(a) * e.speed * spd; e.face = dx < 0 ? -1 : 1;
          e.cd -= dt;
          if (e.cd <= 0) {
            const opts = ['dive', 'breath', 'breath', 'coil'];
            if (e.phase === 2) opts.push('dive', 'coil');
            const k = pick(e, opts);
            if (k === 'dive') { e.state = 'dig'; e.t = 0.4; A.wall(); }
            else if (k === 'breath') { e.state = 'breathW'; e.t = 0.5; e.lock = ang; A.warn(); }
            else { e.state = 'coil'; e.t = 2.6; e.ca = Math.atan2(e.y - p.y, e.x - p.x); e.cdir = Math.random() < 0.5 ? 1 : -1; e.fireT = 0.3; }
          }
          break;
        }
        case 'dig': e.t -= dt; dust(e.x, e.y, 2, 60); if (e.t <= 0) { e.under = true; e.state = 'tunnel'; e.t = 1.3 / spd; } break;
        case 'tunnel':
          e.t -= dt; if (e.t > 0.4) walkTo(e, p.x, p.y, 165); dust(e.x, e.y, 2, 40);
          if (e.t <= 0) {
            e.under = false;
            if (d < 26) tryHurt(2, e.x, e.y);
            orbRing(e, e.phase === 2 ? 20 : 14, 70, undefined, { c: VOID, noparry: false });
            G.quakes.push({ x: e.x, y: e.y, r: 0, delay: 0, max: 90, hitP: false, c: VOID, c2: '#3a1a6a' });
            A.boom(1.5); A.bossRoar(); shake(0.8); scorch(e.x, e.y, 14);
            e.state = 'rec'; e.t = 0.7;
          }
          break;
        case 'breathW': e.t -= dt; if (e.t > 0.15) e.lock = ang; if (e.t <= 0) { e.state = 'breath'; e.t = 1.1; e.fireT = 0; } break;
        case 'breath':
          e.t -= dt; e.fireT -= dt;
          if (e.fireT <= 0) { e.fireT = 0.04 / spd; fire(e.x, e.y - 8, e.lock + rnd(-0.5, 0.5), rnd(90, 140), { c: VOID, noparry: Math.random() < 0.35 }); }
          if (e.t <= 0) { e.state = 'rec'; e.t = 0.6; }
          break;
        case 'coil': {
          // circle the player, spitting inward
          e.t -= dt; e.fireT -= dt; e.ca += dt * 2.2 * e.cdir;
          walkTo(e, p.x + Math.cos(e.ca) * 75, p.y + Math.sin(e.ca) * 60, 220);
          if (e.fireT <= 0) { e.fireT = 0.28 / spd; fire(e.x, e.y - 8, ang, 85, { c: VOID }); A.shoot(); }
          if (e.t <= 0) { e.state = 'rec'; e.t = 0.5; }
          break;
        }
        case 'rec': e.t -= dt; if (e.t <= 0) { e.state = 'walk'; e.cd = rnd(0.3, 0.7) / spd; } break;
      }
      e.tele = e.state === 'breathW';
    },
    tele(e, blink) {
      if (!e.under) for (let i = e.trail.length - 1; i >= 4; i -= 5) { const s = e.trail[i], sp = SPR.wyrmSeg; drawSprite(sp, s.x - sp.w / 2, s.y - sp.h, false); }
      else { for (let i = -8; i <= 8; i += 2) px(e.x + i, e.y - Math.round(Math.cos(i / 5) * 3), '#5a2f9c'); if (e.state === 'tunnel' && e.t < 0.4) ring(e.x, e.y, 26, 1, blink ? P.blood : P.paper); }
      if (e.state === 'breathW') cone(e, 90, 1.1, blink, '#2a0a40', '#14051f');
    },
    draw(e, x, y) { glow(e.x, y + 4, VOID, 10, 0.4); },
    bars: introBars,
  },

  // ---------------------------------------------------------------- wave 30
  herald: {
    name: 'STORM HERALD', short: 'HERALD', sub: 'THE SKY ANSWERS HIM', col: '#62efff', colD: '#163a78', hp: 2300, r: 9, speed: 50, score: 20000, music: 'boss_herald',
    init(e) { e.state = 'intro'; e.t = 2.4; e.under = true; e.orbsT = 0; e.oa = 0; },
    update(e, dt, d, ang, dx) {
      const p = G.p, spd = e.phase === 2 ? 1.3 : 1;
      e.superArmor = true; e.kx = e.ky = 0; e.z = 4 + Math.sin(e.anim * 3) * 3;
      if (e.state === 'intro') {
        e.t -= dt;
        if (Math.floor(e.t * 2.5) !== Math.floor((e.t + dt) * 2.5)) { G.bolts.push({ x0: e.x + rnd(-20, 20), y0: e.y - 170, x1: e.x, y1: e.y, t: 0, life: 0.3 }); A.zap(); shake(0.4); flash('#62efff', 0.08, false); }
        if (e.under && e.t < 1) { e.under = false; addRing(e.x, e.y - 10, '#62efff', 320, 0.5, 3); A.bossRoar(); }
        if (e.t <= 0) { e.state = 'walk'; e.cd = 0.5; }
        return;
      }
      if (e.phase === 1 && e.hp < e.maxHp * 0.5) { e.phase = 2; e.state = 'rec'; e.t = 0.8; phaseBanner('THE STORM BREAKS', '#62efff'); A.zap(); shake(0.7); }
      if (e.orbsT > 0) {
        // four storm orbs circle him and fire at you
        e.orbsT -= dt; e.oa += dt * 2; e.ofT = (e.ofT || 0) - dt;
        if (e.ofT <= 0) { e.ofT = 0.45 / spd; for (let i = 0; i < 4; i++) { const a = e.oa + (i * TAU) / 4, ox = e.x + Math.cos(a) * 20, oy = e.y - 14 + Math.sin(a) * 14; fire(ox, oy, Math.atan2(p.y - 6 - oy, p.x - ox), 95, { c: '#62efff' }); } A.zip(); }
      }
      switch (e.state) {
        case 'walk': {
          const radial = d > 130 ? 1 : d < 90 ? -1 : 0;
          e.vx = (Math.cos(ang) * radial + Math.cos(ang + Math.PI / 2) * 0.6) * e.speed; e.vy = (Math.sin(ang) * radial + Math.sin(ang + Math.PI / 2) * 0.6) * e.speed;
          e.face = dx < 0 ? -1 : 1; e.cd -= dt;
          if (e.cd <= 0) {
            const opts = ['bolts', 'bolts', 'teleport', 'orbs'];
            if (e.phase === 2) opts.push('lances', 'lances', 'storm');
            const k = pick(e, opts);
            if (k === 'bolts') {
              for (let i = 0; i < (e.phase === 2 ? 12 : 8); i++) G.strikes.push({ x: clamp(p.x + rnd(-45, 45), B.x0 + 8, B.x1 - 8), y: clamp(p.y + rnd(-35, 35), B.y0 + 8, B.y1 - 4), t: -i * 0.12, delay: 0.7, R: 16, dmg: 2, friendly: false, kind: 'lightning', c: '#62efff' });
              A.warn(); e.state = 'rec'; e.t = 1;
            } else if (k === 'teleport') {
              G.ghosts.push({ x: e.x, y: e.y, flip: e.face < 0, t: 0, life: 0.4, c: '#62efff', spr: sprFor(e) });
              for (let i = 0; i < 20; i++) { const a = rnd(TAU), r2 = rnd(110, 180); const x = clamp(p.x + Math.cos(a) * r2, B.x0 + 14, B.x1 - 14), y = clamp(p.y + Math.sin(a) * r2 * 0.7, B.y0 + 14, B.y1 - 4); if (hyp(x - p.x, y - p.y) > 90) { e.x = x; e.y = y; break; } }
              orbRing(e, 16, 70, undefined, { c: '#62efff' }); A.zap(); e.state = 'rec'; e.t = 0.6;
            } else if (k === 'orbs') { e.orbsT = 6; e.state = 'rec'; e.t = 0.4; A.shieldUp(); }
            else if (k === 'lances') {
              for (const off of [-0.35, 0, 0.35]) G.hbeams.push({ x: e.x, y: e.y - 14, owner: e, oy: 14, a: ang + off, rot: 0, w: 4, warn: 0.6, t: 0, life: 1.1, len: 0 });
              A.warn(); e.state = 'rec'; e.t = 1.2;
            } else {
              for (let i = 0; i < 22; i++) G.strikes.push({ x: rnd(B.x0 + 10, B.x1 - 10), y: rnd(B.y0 + 10, B.y1 - 6), t: -i * 0.09, delay: 0.8, R: 16, dmg: 2, friendly: false, kind: 'lightning', c: '#62efff' });
              phaseBanner('THUNDERSTORM', '#62efff'); e.state = 'rec'; e.t = 2.2;
            }
          }
          break;
        }
        case 'rec': e.t -= dt; if (e.t <= 0) { e.state = 'walk'; e.cd = rnd(0.3, 0.7) / spd; } break;
      }
    },
    draw(e, x, y) {
      glow(e.x, y + 8, '#62efff', 12, 0.4);
      if (Math.random() < 0.15) G.bolts.push({ x0: e.x, y0: y + 6, x1: e.x + rnd(-14, 14), y1: y + rnd(0, 16), t: 0, life: 0.08 });
      if (e.orbsT > 0) for (let i = 0; i < 4; i++) { const a = e.oa + (i * TAU) / 4, ox = e.x + Math.cos(a) * 20, oy = e.y - 14 + Math.sin(a) * 14; disc(ox, oy, 2, '#62efff'); px(ox, oy, P.paper); glow(ox, oy, '#62efff', 7, 0.5); }
    },
    bars: introBars,
  },

  // ---------------------------------------------------------------- wave 35
  mirror: {
    name: 'THE MIRROR', short: 'MIRROR', sub: 'IT LEARNED YOUR MOVES', col: '#cfd8e0', colD: '#2a2a38', hp: 2200, r: 7, speed: 105, score: 24000, music: 'boss_mirror', scale: 1.5, tint: '#1a1626',
    init(e) { e.state = 'intro'; e.t = 2.2; e.combo = 0; },
    update(e, dt, d, ang, dx) {
      const p = G.p, spd = e.phase === 2 ? 1.25 : 1;
      e.superArmor = true; e.kx = e.ky = 0;
      if (e.state === 'intro') {
        e.t -= dt;
        if (Math.random() < 0.6) G.ghosts.push({ x: e.x + rnd(-30, 30), y: e.y + rnd(-20, 20), flip: Math.random() < 0.5, t: 0, life: 0.3, c: '#cfd8e0', spr: sprFor(e) });
        if (e.t < 1 && !e.shown) { e.shown = true; flash(P.paper, 0.15, false); A.ultRelease(); addRing(e.x, e.y - 10, P.paper, 300, 0.4, 2); }
        if (e.t <= 0) { e.state = 'walk'; e.cd = 0.4; }
        return;
      }
      if (e.phase === 1 && e.hp < e.maxHp * 0.5) { e.phase = 2; e.state = 'rec'; e.t = 0.6; phaseBanner('IT STUDIES YOU', P.paper); for (let i = 0; i < 3; i++) { const h = spawnEnemy('husk', clamp(e.x + rnd(-40, 40), B.x0 + 10, B.x1 - 10), clamp(e.y + rnd(-30, 30), B.y0 + 10, B.y1 - 4)); h.elite = true; h.hp = h.maxHp = h.hp * 2; } }
      switch (e.state) {
        case 'walk':
          if (d > 40) walkTo(e, p.x, p.y, e.speed * spd);
          e.face = dx < 0 ? -1 : 1; e.cd -= dt;
          if (e.cd <= 0) {
            const k = pick(e, ['dash', 'dash', 'combo', 'combo', 'rift', 'volley']);
            if (k === 'dash') { e.state = 'dashW'; e.t = 0.42; e.lock = ang; }
            else if (k === 'combo') { e.state = 'slashW'; e.t = 0.32; e.combo = e.phase === 2 ? 4 : 3; e.lock = ang; }
            else if (k === 'rift') {
              for (let i = 0; i < (e.phase === 2 ? 3 : 2); i++) { const a = rnd(TAU); G.hlines.push({ x0: p.x - Math.cos(a) * 200, y0: p.y - 5 - Math.sin(a) * 200, x1: p.x + Math.cos(a) * 200, y1: p.y - 5 + Math.sin(a) * 200, t: -i * 0.15, pend: 0.65, done: false }); }
              A.rift(); A.warn(); e.state = 'rec'; e.t = 0.9;
            } else { for (let i = -2; i <= 2; i++) fire(e.x, e.y - 14, ang + i * 0.18, 120, { c: '#cfd8e0' }); A.shoot(); e.state = 'rec'; e.t = 0.5; }
          }
          break;
        case 'dashW': e.t -= dt; if (e.t > 0.12) e.lock = ang; if (e.t <= 0) { e.state = 'dash'; e.t = 0.28; e.hitP = false; A.dash(); } break;
        case 'dash':
          e.vx = Math.cos(e.lock) * 380; e.vy = Math.sin(e.lock) * 380; e.t -= dt;
          G.ghosts.push({ x: e.x, y: e.y, flip: e.face < 0, t: 0, life: 0.2, c: '#3a3456', spr: sprFor(e) });
          if (!e.hitP && d < e.r + 8) { if (tryHurt(2, e.x, e.y) === true) e.hitP = true; }
          if (e.t <= 0) { e.state = e.phase === 2 && Math.random() < 0.5 ? 'dashW' : 'rec'; e.t = e.state === 'dashW' ? 0.25 : 0.5; e.lock = ang; }
          break;
        case 'slashW':
          e.t -= dt; if (e.t > 0.1) e.lock = ang;
          if (e.t <= 0) {
            e.x += Math.cos(e.lock) * 12; e.y += Math.sin(e.lock) * 12;
            bigSlash(e, 38, 2.6, 'steel');
            if (--e.combo > 0) { e.state = 'slashW'; e.t = 0.24 / spd; } else { e.state = 'rec'; e.t = 0.6; }
          }
          break;
        case 'rec': e.t -= dt; if (e.t <= 0) { e.state = 'walk'; e.cd = rnd(0.2, 0.6) / spd; } break;
      }
      e.tele = e.state === 'slashW' || e.state === 'dashW';
    },
    tele(e, blink) {
      if (e.state === 'slashW') cone(e, 38, 2.6, blink, P.bloodD, '#2a0a14');
      if (e.state === 'dashW') { const cx = Math.cos(e.lock), cy = Math.sin(e.lock); line(e.x, e.y, e.x + cx * 110, e.y + cy * 110, blink ? P.blood : P.bloodD, 2); }
    },
    draw(e, x, y) {
      const set = heroSet(), s = sprFor(e), ex = x + (e.face < 0 ? s.w - 1 - set.eye[0] : set.eye[0]) * 1.5, ey = y + set.eye[1] * 1.5;
      rect(ex, ey, 2, 2, P.paper); glow(ex, ey, P.paper, 5, 0.6);
    },
    bars: introBars,
  },

  // ---------------------------------------------------------------- wave 40
  eclipse: {
    name: 'ECLIPSE', short: 'ECLIPSE', sub: 'THE SUN THAT WATCHES', col: '#ffd447', colD: '#5a1420', hp: 3600, r: 16, speed: 14, score: 40000, music: 'boss_eclipse',
    init(e) { e.state = 'intro'; e.t = 3; e.open = 0; e.spin = 0; },
    update(e, dt, d, ang) {
      const p = G.p, spd = e.phase === 2 ? 1.3 : 1;
      e.superArmor = true; e.kx = e.ky = 0; e.z = 5 + Math.sin(e.anim * 1.5) * 1.5;
      if (e.state === 'intro') {
        // the sky goes dark, then the eye opens
        e.t -= dt;
        G.dark = Math.min(0.75, (3 - e.t) * 0.5);
        e.open = Math.max(0, Math.min(1, (1.6 - e.t) / 1.2));
        if (e.t < 0.4 && !e.lit) { e.lit = true; flash(P.gold, 0.25, true); A.bossRoar(); A.ultRelease(); addRing(e.x, e.y - 14, P.gold, 380, 0.6, 3); }
        if (e.t <= 0) { e.state = 'walk'; e.cd = 0.4; G.dark = 0; }
        return;
      }
      if (e.phase === 1 && e.hp < e.maxHp * 0.5) { e.phase = 2; e.state = 'rec'; e.t = 1; phaseBanner('TOTAL ECLIPSE', P.gold); A.bossRoar(); shake(0.8); }
      if (e.phase === 2) G.dark = Math.min(0.55, G.dark + dt);
      switch (e.state) {
        case 'walk':
          walkTo(e, p.x, p.y - 40, e.speed);
          e.cd -= dt;
          if (e.cd <= 0) {
            const opts = ['spiral', 'rings', 'beams', 'minions'];
            if (e.phase === 2) opts.push('cross', 'spiral', 'rings');
            const k = pick(e, opts);
            if (k === 'spiral') { e.state = 'spiral'; e.t = 2.6; e.fireT = 0; e.sdir = Math.random() < 0.5 ? 1 : -1; }
            else if (k === 'rings') { for (let i = 0; i < 4; i++) G.timers.push({ t: i * 0.45, fn: () => { if (!e.dead && !e.dying) orbRing(e, 26, 70, rnd(TAU), { oy: 14, c: P.gold, noparry: i % 2 === 1 }); } }); e.state = 'rec'; e.t = 2; }
            else if (k === 'beams') {
              const off = rnd(TAU), dir = Math.random() < 0.5 ? 1 : -1;
              for (let i = 0; i < 8; i++) G.hbeams.push({ owner: e, oy: 14, x: e.x, y: e.y - 14, a: off + (i * TAU) / 8, rot: dir * 0.55, w: 4, warn: 0.9, t: 0, life: 3.5, len: 0 });
              A.warn(); A.loop('bossbeam', true, 'boss'); G.timers.push({ t: 3.5, fn: () => A.loop('bossbeam', false) }); e.state = 'rec'; e.t = 3.5;
            } else if (k === 'minions') {
              for (let i = 0; i < 4; i++) { const a = (i * TAU) / 4; spawnEnemy('wisp', clamp(e.x + Math.cos(a) * 50, B.x0 + 10, B.x1 - 10), clamp(e.y + Math.sin(a) * 40, B.y0 + 10, B.y1 - 4)); }
              A.sigil(); e.state = 'rec'; e.t = 0.8;
            } else {
              const off = rnd(TAU);
              for (let i = 0; i < 4; i++) G.hbeams.push({ owner: e, oy: 14, x: e.x, y: e.y - 14, a: off + (i * Math.PI) / 2, rot: 1.3 * (Math.random() < 0.5 ? 1 : -1), w: 8, warn: 0.7, t: 0, life: 2.6, len: 0 });
              A.warn(); A.loop('bossbeam', true, 'boss'); G.timers.push({ t: 2.6, fn: () => A.loop('bossbeam', false) }); e.state = 'spiral'; e.t = 2.6; e.fireT = 0.3; e.sdir = 1;
            }
          }
          break;
        case 'spiral':
          e.t -= dt; e.fireT -= dt;
          if (e.fireT <= 0) { e.fireT = 0.07 / spd; for (let k = 0; k < 4; k++) fire(e.x, e.y - 14, e.spin + (k * TAU) / 4, 75, { c: P.gold, noparry: k % 2 === 0 }); e.spin += 0.22 * e.sdir; A.shoot(); }
          if (e.t <= 0) { e.state = 'rec'; e.t = 0.6; }
          break;
        case 'rec': e.t -= dt; if (e.t <= 0) { e.state = 'walk'; e.cd = rnd(0.3, 0.7) / spd; } break;
      }
    },
    draw(e, x, y) {
      const cx = x + 14, cy = y + 14;
      ring(cx, cy, 16 + Math.sin(G.time * 6) * 1.5, 1, P.gold); glow(cx, cy, P.gold, 26, 0.35);
      // the pupil looks at you
      const a = Math.atan2(G.p.y - 6 - cy, G.p.x - cx);
      rect(cx + Math.cos(a) * 3 - 1, cy + Math.sin(a) * 3 - 3, 3, 7, P.paper);
      if (e.open < 1) { const h = Math.round(13 * (1 - e.open)); rect(x + 2, cy - 11, 24, h, '#0a0610'); rect(x + 2, cy + 12 - h, 24, h, '#0a0610'); }
    },
    bars: introBars,
  },
});

// ---------------------------------------------------------------- wave 45 and wave 50
const BRASS = '#e8c070', CODE = '#39ff6a';
// remember the shots a volley fired, so time can stop and restart them
const volley = (fn) => { const n0 = G.shots.length; fn(); return G.shots.slice(n0); };
Object.assign(BOSSES, {
  clock: {
    name: 'THE CLOCKWORK', short: 'CLOCKWORK', sub: 'TIME BENDS TO IT', col: BRASS, colD: '#5a3a10', hp: 4300, r: 15, speed: 26, score: 52000, music: 'boss_clock',
    init(e) { e.state = 'intro'; e.t = 2.8; e.under = true; e.hand = 0; e.handM = 0; },
    update(e, dt, d, ang) {
      const p = G.p, spd = e.phase === 2 ? 1.35 : 1;
      e.superArmor = true; e.kx = e.ky = 0; e.z = 6 + Math.sin(e.anim * 1.2) * 2;
      e.hand += dt * 0.5 * spd; e.handM += dt * 3 * spd;
      if (e.state === 'intro') {
        // it ticks louder and louder, then appears with a chime
        e.t -= dt;
        if (Math.floor(e.t * 4) !== Math.floor((e.t + dt) * 4)) { A.click(); if (e.t < 2) shake(0.15); }
        if (e.under && e.t < 1) { e.under = false; flash(BRASS, 0.2, true); A.bossRoar(); A.victory(); addRing(e.x, e.y - 15, BRASS, 360, 0.6, 3); addRing(e.x, e.y - 15, P.paper, 260, 0.4, 1); }
        if (e.t <= 0) { e.state = 'walk'; e.cd = 0.5; }
        return;
      }
      if (e.phase === 1 && e.hp < e.maxHp * 0.5) { e.phase = 2; e.state = 'rec'; e.t = 1; phaseBanner('TIME FRACTURES', BRASS); A.bossRoar(); shake(0.8); flash(BRASS, 0.2, true); }
      switch (e.state) {
        case 'walk': {
          walkTo(e, clamp(p.x + Math.cos(e.anim * 0.4) * 110, B.x0 + 30, B.x1 - 30), clamp(p.y - 70, B.y0 + 30, B.y1 - 30), e.speed * spd);
          e.cd -= dt;
          if (e.cd <= 0) {
            const opts = ['hands', 'freeze', 'tick', 'freeze'];
            if (e.phase === 2) opts.push('alarm', 'alarm', 'rewind', 'hands');
            const k = pick(e, opts);
            if (k === 'hands') {
              // the hour and minute hands sweep the arena as beams
              const a0 = rnd(TAU);
              G.hbeams.push({ owner: e, oy: 15, x: e.x, y: e.y - 15, a: a0, rot: 0.5 * spd, w: 7, warn: 0.9, t: 0, life: 3.6, len: 0 });
              G.hbeams.push({ owner: e, oy: 15, x: e.x, y: e.y - 15, a: a0 + Math.PI, rot: -1.1 * spd, w: 4, warn: 0.9, t: 0, life: 3.6, len: 0 });
              if (e.phase === 2) G.hbeams.push({ owner: e, oy: 15, x: e.x, y: e.y - 15, a: a0 + Math.PI / 2, rot: 1.7, w: 3, warn: 0.9, t: 0, life: 3.6, len: 0 });
              A.warn(); A.loop('bossbeam', true, 'boss'); G.timers.push({ t: 3.6, fn: () => A.loop('bossbeam', false) });
              e.state = 'rec'; e.t = 3.6;
            } else if (k === 'freeze') {
              // a ring of shots stops dead, then every one turns toward you
              const shots = volley(() => orbRing(e, e.phase === 2 ? 30 : 22, 95, undefined, { oy: 15, c: BRASS, life: 5 }));
              G.timers.push({ t: 0.65, fn: () => { for (const s of shots) { s.vx = s.vy = 0; } A.click(); flash(BRASS, 0.08, false); G.banner = { text: 'TIME STOP', sub: '', t: 0, life: 0.8, c: BRASS }; } });
              G.timers.push({ t: 1.35, fn: () => { for (const s of shots) { if (s.dead) continue; const a = Math.atan2(G.p.y - 6 - s.y, G.p.x - s.x) + rnd(-0.08, 0.08); s.vx = Math.cos(a) * 150; s.vy = Math.sin(a) * 150; } A.zip(); } });
              e.state = 'rec'; e.t = 1.8;
            } else if (k === 'tick') {
              // tick, tock: rings with the gaps shifting each beat
              for (let i = 0; i < 6; i++) G.timers.push({ t: i * 0.32, fn: () => { if (!e.dead && !e.dying) { orbRing(e, 18, 80, (i % 2 ? 0.5 : 0) + e.hand, { oy: 15, c: i % 2 ? P.paper : BRASS, noparry: i % 2 === 0 }); A.click(); } } });
              e.state = 'rec'; e.t = 2.1;
            } else if (k === 'alarm') {
              // twelve strikes go off around you like the hours on a dial
              const a0 = rnd(TAU);
              for (let i = 0; i < 12; i++) { const a = a0 + (i * TAU) / 12; G.strikes.push({ x: clamp(p.x + Math.cos(a) * 46, B.x0 + 8, B.x1 - 8), y: clamp(p.y + Math.sin(a) * 34, B.y0 + 8, B.y1 - 4), t: -i * 0.08, delay: 0.75, R: 15, dmg: 2, friendly: false, kind: 'lightning', c: BRASS }); }
              G.strikes.push({ x: p.x, y: p.y, t: -1.1, delay: 0.7, R: 18, dmg: 2, friendly: false, kind: 'lightning', c: BRASS });
              A.warn(); e.state = 'rec'; e.t = 2;
            } else {
              // rewinds to the far side of the arena and fires as it lands
              G.ghosts.push({ x: e.x, y: e.y, flip: false, t: 0, life: 0.5, c: BRASS, spr: sprFor(e) });
              e.x = clamp(AWc() - (p.x - AWc()), B.x0 + 30, B.x1 - 30); e.y = clamp(B.y0 + 40 + rnd(0, 40), B.y0 + 30, B.y1 - 30);
              orbRing(e, 24, 85, undefined, { oy: 15, c: BRASS }); A.zip(); flash(BRASS, 0.1, false);
              e.state = 'rec'; e.t = 0.7;
            }
          }
          break;
        }
        case 'rec': e.t -= dt; if (e.t <= 0) { e.state = 'walk'; e.cd = rnd(0.3, 0.7) / spd; } break;
      }
    },
    draw(e, x, y) {
      // the hands, drawn live over the dial
      const cx = x + 15, cy = y + 15;
      line(cx, cy, cx + Math.cos(e.hand) * 8, cy + Math.sin(e.hand) * 8, '#3a2410', 2);
      line(cx, cy, cx + Math.cos(e.handM) * 12, cy + Math.sin(e.handM) * 12, '#3a2410', 1);
      disc(cx, cy, 2, BRASS); px(cx, cy, P.paper);
      ring(cx, cy, 17 + Math.sin(G.time * 4), 1, BRASS); glow(cx, cy, BRASS, 24, 0.3);
    },
    bars: introBars,
  },

  devboss: {
    name: 'THE DEV', short: 'THE DEV', sub: 'ROOT ACCESS GRANTED', col: CODE, colD: '#0a2a12', hp: 5600, r: 18, speed: 46, score: 90000, music: 'boss_dev', scale: 3,
    death: 'THE DEV CRASHED', marks: [0.25, 0.6],
    init(e) { e.state = 'intro'; e.t = 3.4; e.typed = 0; e.alpha = 0; e.y = Math.max(e.y, B.y0 + 95); },
    update(e, dt, d, ang, dx) {
      const p = G.p, spd = e.phase === 3 ? 1.5 : e.phase === 2 ? 1.25 : 1;
      e.superArmor = true; e.kx = e.ky = 0; e.z = 4 + Math.sin(e.anim * 2) * 3;
      if (Math.random() < dt * (e.phase === 3 ? 6 : 2)) glitch(e.x + rnd(-24, 24), e.y - rnd(10, 50), rnd(10, 30), rnd(3, 8), 0.15, 6);
      if (e.state === 'intro') {
        // a terminal types the command, the screen tears, and he compiles into the arena
        e.t -= dt; e.typed += dt;
        if (Math.floor(e.typed * 14) !== Math.floor((e.typed - dt) * 14) && e.typed < 1.6) A.click();
        // he flickers in like a corrupted file, then locks solid
        e.alpha = e.t > 2.2 ? 0 : e.t > 0.9 ? (Math.random() < 0.5 ? 0.25 : 0.7) : 1;
        if (e.t < 2.2 && Math.random() < 0.6) glitch(e.x + rnd(-30, 30), e.y - rnd(0, 60), rnd(20, 50), rnd(3, 8), 0.2, 8);
        if (!e.shown && e.t < 0.9) { e.shown = true; delete e.alpha; flash(CODE, 0.3, true); A.bossRoar(); A.ultRelease(); shake(1); for (let i = 0; i < 3; i++) addRing(e.x, e.y - 24, i % 2 ? P.paper : CODE, 300 + i * 90, 0.6, 3); glitch(e.x, e.y - 24, 90, 60, 0.5, 30); }
        if (e.t <= 0) { e.state = 'walk'; e.cd = 0.4; }
        return;
      }
      if (e.phase === 1 && e.hp < e.maxHp * 0.6) { e.phase = 2; e.state = 'rec'; e.t = 0.9; phaseBanner('SUDO MODE', CODE); A.bossRoar(); shake(0.8); glitch(e.x, e.y - 24, 120, 80, 0.5, 30); }
      if (e.phase === 2 && e.hp < e.maxHp * 0.25) { e.phase = 3; e.state = 'rec'; e.t = 1; phaseBanner('KERNEL PANIC', P.blood); A.bossRoar(); A.ultStart(); shake(1); flash(P.blood, 0.3, true); }
      if (e.phase === 3) G.dark = Math.min(0.5, G.dark + dt);
      switch (e.state) {
        case 'walk': {
          const radial = d > 130 ? 1 : d < 90 ? -1 : 0;
          e.vx = (Math.cos(ang) * radial + Math.cos(ang + Math.PI / 2) * 0.5) * e.speed * spd; e.vy = (Math.sin(ang) * radial + Math.sin(ang + Math.PI / 2) * 0.5) * e.speed * spd;
          e.face = dx < 0 ? -1 : 1; e.cd -= dt;
          if (e.cd <= 0) {
            const opts = ['ping', 'ping', 'rmrf', 'firewall', 'fork'];
            if (e.phase >= 2) opts.push('ddos', 'lag', 'rmrf');
            if (e.phase === 3) opts.push('kernel', 'kernel');
            const k = pick(e, opts);
            if (k === 'ping') {
              // packet volleys, a wider spread every burst
              for (let v = 0; v < 3; v++) G.timers.push({ t: v * 0.28, fn: () => { if (e.dead || e.dying) return; const a = Math.atan2(G.p.y - 6 - (e.y - 30), G.p.x - e.x), n = 5 + v * 2; for (let i = 0; i < n; i++) fire(e.x, e.y - 30, a + (i - (n - 1) / 2) * 0.13, 125, { c: CODE, noparry: i % 3 === 1 }); A.charAtk('DEV', false, v); } });
              e.state = 'rec'; e.t = 1.1;
            } else if (k === 'rmrf') {
              for (let i = 0; i < (e.phase >= 2 ? 9 : 6); i++) { const a = rnd(TAU), cx = p.x + (i < 2 ? 0 : rnd(-80, 80)), cy = p.y - 5 + (i < 2 ? 0 : rnd(-55, 55)); G.hlines.push({ x0: cx - Math.cos(a) * 150, y0: cy - Math.sin(a) * 150, x1: cx + Math.cos(a) * 150, y1: cy + Math.sin(a) * 150, t: -i * 0.08, pend: 0.9, done: false }); }
              G.banner = { text: 'RM -RF /', sub: 'DASH THROUGH THE LINES', t: 0, life: 1.2, c: CODE }; A.warn(); A.rift();
              e.state = 'rec'; e.t = 1.6;
            } else if (k === 'firewall') {
              for (let i = 0; i < 3; i++) G.timers.push({ t: i * 0.5, fn: () => { if (!e.dead && !e.dying) orbRing(e, 32, 70 + i * 10, Math.atan2(G.p.y - e.y, G.p.x - e.x) + rnd(-1.2, 1.2), { oy: 30, c: CODE, noparry: true }); } });
              e.state = 'rec'; e.t = 1.6;
            } else if (k === 'fork') {
              for (let i = 0; i < (e.phase >= 2 ? 4 : 3); i++) { const a = rnd(TAU); spawnEnemy(i % 2 ? 'shade' : 'tick', clamp(e.x + Math.cos(a) * 50, B.x0 + 10, B.x1 - 10), clamp(e.y + Math.sin(a) * 40, B.y0 + 10, B.y1 - 4)); }
              G.banner = { text: 'FORK BOMB', sub: '', t: 0, life: 1, c: CODE }; A.sigil(); e.state = 'rec'; e.t = 0.8;
            } else if (k === 'ddos') {
              // strikes sweep the arena row by row, with one safe gap per row
              const rows = 5, gapCol = Math.floor(rnd(6));
              for (let r = 0; r < rows; r++) for (let c = 0; c < 7; c++) {
                if (c === (gapCol + r) % 7) continue;
                G.strikes.push({ x: B.x0 + 30 + (c * (B.x1 - B.x0 - 60)) / 6, y: B.y0 + 30 + (r * (B.y1 - B.y0 - 50)) / (rows - 1), t: -r * 0.35, delay: 0.8, R: 18, dmg: 2, friendly: false, kind: 'lightning', c: CODE });
              }
              G.banner = { text: 'DDOS', sub: 'FIND THE GAP', t: 0, life: 1.2, c: CODE }; A.warn(); e.state = 'rec'; e.t = 2.6;
            } else if (k === 'lag') {
              // lag spike: he blinks around the arena three times, firing on each landing
              for (let i = 0; i < 3; i++) G.timers.push({ t: i * 0.4, fn: () => { if (e.dead || e.dying) return; glitch(e.x, e.y - 27, 50, 54, 0.3, 16); e.x = clamp(G.p.x + rnd(-120, 120), B.x0 + 30, B.x1 - 30); e.y = clamp(G.p.y + rnd(-80, 80), B.y0 + 40, B.y1 - 10); if (hyp(e.x - G.p.x, e.y - G.p.y) < 60) e.x = clamp(e.x + 80, B.x0 + 30, B.x1 - 30); orbRing(e, 16, 90, undefined, { oy: 30, c: CODE }); glitch(e.x, e.y - 24, 40, 30, 0.3, 14); A.zip(); } });
              e.state = 'rec'; e.t = 1.6;
            } else {
              // kernel panic: eight spinning beams and a packet spiral at once
              const off = rnd(TAU), dir = Math.random() < 0.5 ? 1 : -1;
              for (let i = 0; i < 6; i++) G.hbeams.push({ owner: e, oy: 30, x: e.x, y: e.y - 30, a: off + (i * TAU) / 6, rot: dir * 0.6, w: 4, warn: 0.9, t: 0, life: 3.6, len: 0 });
              A.warn(); A.loop('bossbeam', true, 'boss'); G.timers.push({ t: 3.6, fn: () => A.loop('bossbeam', false) });
              e.state = 'spiral'; e.t = 3.6; e.fireT = 0.9; e.spin = off;
            }
          }
          break;
        }
        case 'spiral':
          e.t -= dt; e.fireT -= dt;
          if (e.fireT <= 0) { e.fireT = 0.11; for (let k = 0; k < 3; k++) fire(e.x, e.y - 30, e.spin + (k * TAU) / 3, 80, { c: CODE, noparry: k === 0 }); e.spin -= 0.25; A.shoot(); }
          if (e.t <= 0) { e.state = 'rec'; e.t = 0.6; }
          break;
        case 'rec': e.t -= dt; if (e.t <= 0) { e.state = 'walk'; e.cd = rnd(0.25, 0.6) / spd; } break;
      }
    },
    draw(e, x, y, s) {
      // glasses burn like headlights, code drips off him
      const sc = 3, set = SPR.devbossSet, ex = x + (e.face < 0 ? s.w - 1 - set.eye[0] : set.eye[0]) * sc + 1, ey = y + set.eye[1] * sc + 1;
      // small glints only: big glows here sit on top of the sprite and smear his face
      glow(ex, ey, CODE, 4 + Math.sin(G.time * 10), 0.55); glow(ex - 12 * (e.face < 0 ? -1 : 1), ey, CODE, 4, 0.4);
      if (Math.random() < 0.4) part(x + rnd(0, s.w * sc), y + rnd(10, s.h * sc), 0, rnd(20, 60), rnd(0.4, 0.8), Math.random() < 0.7 ? CODE : P.paper, { drag: 0.5 });
      // an RGB split while he compiles
      if (e.state === 'intro' && e.t > 0.9 && e.t < 2.2) for (const [ox, c] of [[-4, '#ff4fa8'], [4, CODE]]) { ctx.globalAlpha = 0.45; ctx.save(); ctx.translate(Math.round(x + ox), Math.round(y)); ctx.scale(sc, sc); drawSprite(s, 0, 0, e.face < 0, c); ctx.restore(); ctx.globalAlpha = 1; }
      if (e.state === 'intro' && e.typed < 2.2) textO('> sudo ./boss.exe'.slice(0, Math.floor(e.typed * 12)), e.x - 50, y - 12, CODE);
    },
    bars: introBars,
  },
});
const AWc = () => (B.x0 + B.x1) / 2;

function riftLines(e, n) {
  const p = G.p;
  for (let i = 0; i < n; i++) {
    const a = rnd(TAU), cx = p.x + rnd(-30, 30), cy = p.y - 5 + rnd(-20, 20);
    G.hlines.push({ x0: cx - Math.cos(a) * 200, y0: cy - Math.sin(a) * 200, x1: cx + Math.cos(a) * 200, y1: cy + Math.sin(a) * 200, t: -i * 0.15, pend: 0.9, done: false });
  }
  A.warn(); A.rift();
}
function thousand(e) {
  const p = G.p;
  for (let i = 0; i < 11; i++) {
    const onYou = i < 2, a = rnd(TAU), cx = onYou ? p.x : p.x + rnd(-90, 90), cy = onYou ? p.y - 5 : p.y + rnd(-60, 60);
    G.hlines.push({ x0: cx - Math.cos(a) * 140, y0: cy - Math.sin(a) * 140, x1: cx + Math.cos(a) * 140, y1: cy + Math.sin(a) * 140, t: -i * 0.07, pend: 1.1, done: false });
  }
  G.banner = { text: 'THOUSAND CUTS', sub: 'DASH THROUGH THEM', t: 0, life: 1.2, c: P.blood };
  A.ultStart();
}

void disc;
