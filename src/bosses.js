import { P, px, line, ring, disc, rect, glow } from './gfx.js';
import { A } from './audio.js';
import {
  G, B, TAU, rnd, clamp, hyp, angDiff, alive, part, sparks, dust, addText, addRing, tryHurt, fire, shake, hitstop, flash,
  spawnEnemy, scorch, atWall, sprFor,
} from './world.js';

const ORDER = ['warden', 'brood', 'colossus', 'king'];
export const bossFor = (wave) => ORDER[(Math.floor(wave / 5) - 1) % 4];

const pick = (e, opts) => { let k = opts[Math.floor(rnd(opts.length))]; if (k === e.last) k = opts[Math.floor(rnd(opts.length))]; e.last = k; return k; };
function phaseBanner(text, c) { G.banner = { text, sub: '', t: 0, life: 1.4, c }; }
function cone(e, R, arc, blink, c1, c2) {
  for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
    if ((x + y) & 1 || x * x + y * y > R * R || x * x + y * y < 64) continue;
    if (Math.abs(angDiff(Math.atan2(y, x), e.lock)) > arc / 2) continue;
    px(e.x + x, e.y - 4 + y, blink ? c1 : c2);
  }
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
    name: 'THE WARDEN', short: 'WARDEN', sub: 'KEEPER OF THE PIT', col: '#ff4fa8', colD: '#6e1b52', hp: 560, r: 13, speed: 34, score: 6000, music: 'boss',
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
            if (e.phase === 2) opts.push('dash', 'dash', 'jump');
            const k = pick(e, opts);
            if (k === 'sweep') { e.state = 'sweepW'; e.t = e.phase === 2 ? 0.55 : 0.7; e.lock = ang; }
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
        case 'rec': e.t -= dt; if (e.t <= 0) { e.state = 'walk'; e.cd = rnd(0.35, 0.9) / rage; } break;
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
    name: 'THE BROOD MOTHER', short: 'BROOD MOTHER', sub: 'SHE NESTS BELOW', col: '#b5f23a', colD: '#45651a', hp: 900, r: 14, speed: 40, score: 9000, music: 'boss',
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
            const k = pick(e, opts);
            if (k === 'burrow') { e.state = 'dig'; e.t = 0.5; A.wall(); }
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
        case 'rec': e.t -= dt; if (e.t <= 0) { e.state = 'walk'; e.cd = rnd(0.4, 1) / rage; } break;
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
    name: 'IRON COLOSSUS', short: 'COLOSSUS', sub: 'A WAR MACHINE NOBODY TURNED OFF', col: '#ff7a2b', colD: '#5a2410', hp: 1100, r: 14, speed: 26, score: 12000, music: 'boss',
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
            const k = pick(e, ['laser', 'laser', 'missiles', 'missiles', 'stomp', 'shield']);
            if (k === 'laser') { e.state = 'laserW'; e.t = 0.9; e.lock = ang; e.rdir = Math.random() < 0.5 ? 1 : -1; A.warn(); }
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
        case 'rec': e.t -= dt; if (e.t <= 0) { e.state = 'walk'; e.cd = rnd(0.5, 1.1) / rage; } break;
      }
      e.tele = e.state === 'stompW' || e.state === 'laserW';
    },
    tele(e, blink) {
      if (e.state === 'laserW') { const s = e.lock - e.rdir; line(e.x, e.y - 22, e.x + Math.cos(s) * 200, e.y - 22 + Math.sin(s) * 200, blink ? P.blood : P.bloodD); }
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
    name: 'THE ASHEN KING', short: 'ASHEN KING', sub: 'THE LAST FIRE', col: '#ff6a2b', colD: '#5a1420', hp: 1600, r: 12, speed: 48, score: 30000, music: 'final', final: true,
    init(e) { e.state = 'intro'; e.t = 3; e.combo = 0; },
    update(e, dt, d, ang, dx) {
      const p = G.p;
      e.superArmor = true; e.kx = e.ky = 0;
      if (e.phase === 3) G.dark = Math.min(1, G.dark + dt * 0.8);
      if (e.state === 'intro') {
        // rises from a pillar of fire
        e.t -= dt;
        if (Math.random() < 0.95) part(e.x + rnd(-10, 10), e.y - rnd(0, 10), rnd(-15, 15), -rnd(80, 200), rnd(0.4, 0.9), Math.random() < 0.5 ? P.ember : P.ember3, { glow: true, keep: true, drag: 1 });
        if (e.t < 1.6 && e.t + dt >= 1.6) { flash('#ff6a2b', 0.3, true); shake(1); A.boom(2.4); A.bossRoar(); addRing(e.x, e.y - 10, P.ember, 420, 0.6, 3); for (let i = 0; i < 16; i++) fire(e.x, e.y - 20, (i * TAU) / 16, 40, { life: 1.2, dmg: 0 }); }
        if (e.t <= 0) { e.state = 'walk'; e.cd = 0.5; }
        return;
      }
      if (e.phase === 1 && e.hp < e.maxHp * 0.66) { e.phase = 2; e.state = 'rec'; e.t = 1.2; A.bossRoar(); shake(0.8); flash(P.ember, 0.2, true); phaseBanner('THE KING BURNS', P.ember); }
      else if (e.phase === 2 && e.hp < e.maxHp * 0.33) { e.phase = 3; e.state = 'rec'; e.t = 1.5; A.bossRoar(); shake(1); phaseBanner('THE KING UNBOUND', P.blood); }
      const spd = e.phase === 3 ? 1.35 : e.phase === 2 ? 1.15 : 1;
      switch (e.state) {
        case 'walk': {
          if (d > 30) { e.vx = Math.cos(ang) * e.speed * spd; e.vy = Math.sin(ang) * e.speed * spd; }
          e.face = dx < 0 ? -1 : 1; e.cd -= dt;
          if (e.cd <= 0) {
            const opts = ['blink', 'blink', 'rift', 'firering'];
            if (e.phase >= 2) opts.push('spiral', 'pillars');
            if (e.phase === 3) opts.push('thousand', 'meteors', 'thousand');
            const k = pick(e, opts);
            if (k === 'blink') { e.combo = e.phase === 1 ? 2 : 3; e.state = 'blink'; e.t = 0.25; }
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
            e.x = clamp(p.x + Math.cos(a) * 36, B.x0 + 14, B.x1 - 14); e.y = clamp(p.y + Math.sin(a) * 26, B.y0 + 14, B.y1 - 4);
            e.face = p.x < e.x ? -1 : 1; e.lock = Math.atan2(p.y - e.y, p.x - e.x);
            e.state = 'kslashW'; e.t = e.phase === 3 ? 0.32 : 0.42; A.rift();
          }
          break;
        case 'kslashW':
          e.t -= dt;
          if (e.t > 0.15) e.lock = ang;
          if (e.t <= 0) {
            bigSlash(e, 54, 2.8, 'fire');
            if (--e.combo > 0) { e.state = 'blink'; e.t = 0.18; } else { e.state = 'rec'; e.t = 0.6; }
          }
          break;
        case 'firering':
          e.t -= dt; e.fireT -= dt;
          if (e.fireT <= 0 && e.n < 3) { e.fireT = 0.35; e.n++; const off = rnd(TAU); for (let i = 0; i < 16; i++) fire(e.x, e.y - 20, off + (i * TAU) / 16, 76, { noparry: i % 2 === 1 }); A.shoot(); }
          if (e.t <= 0) { e.state = 'rec'; e.t = 0.5; }
          break;
        case 'spiral':
          e.t -= dt; e.fireT -= dt;
          if (e.fireT <= 0) { e.fireT = 0.1; for (let k = 0; k < 3; k++) fire(e.x, e.y - 20, e.spin + (k * TAU) / 3, 80, { noparry: k === 0 }); e.spin += 0.29 * (e.phase === 3 ? -1 : 1); A.shoot(); }
          if (e.t <= 0) { e.state = 'rec'; e.t = 0.6; }
          break;
        case 'rec': e.t -= dt; if (e.t <= 0) { e.state = 'walk'; e.cd = rnd(0.3, 0.8) / spd; } break;
      }
      e.tele = e.state === 'kslashW';
      if (Math.random() < 0.5) part(e.x + rnd(-8, 8), e.y - rnd(2, 12), rnd(-10, 10), -rnd(20, 50), 0.5, Math.random() < 0.5 ? P.ember : '#8a2a30', { glow: true, drag: 1 });
    },
    tele(e, blink) {
      if (e.state === 'kslashW') cone(e, 54, 2.8, blink, '#5a1a0a', '#2a0a04');
      if (e.state === 'intro') {
        const w = Math.max(2, 18 * Math.min(1, (3 - e.t) / 0.6));
        rect(e.x - w / 2, e.y - 120, w, 120, '#c6380f'); rect(e.x - w / 4, e.y - 120, w / 2, 120, P.ember3);
        glow(e.x, e.y - 20, P.ember, 30, 0.6);
      }
    },
    draw(e, x, y) {
      const hx = e.x + e.face * 9, hy = e.y - 16;
      const a = e.state === 'kslashW' ? e.lock + Math.PI * 0.7 * e.face : Math.PI / 2 + e.face * 0.6;
      line(hx, hy, hx + Math.cos(a) * 24, hy + Math.sin(a) * 24, '#c6380f', 3);
      line(hx, hy, hx + Math.cos(a) * 24, hy + Math.sin(a) * 24, P.ember3);
      if (Math.random() < 0.6) part(hx + Math.cos(a) * rnd(4, 24), hy + Math.sin(a) * rnd(4, 24), 0, -rnd(20, 40), 0.3, P.ember, { glow: true });
      glow(e.x, y + 4, P.gold, 8, 0.4);
      glow(e.x, y + 14, P.ember, e.phase * 6, 0.35);
    },
    bars: introBars,
  },
};

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
