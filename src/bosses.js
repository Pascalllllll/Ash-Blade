import { ctx, P, px, line, ring, disc, rect, glow, drawSprite, makeCanvas, textO } from './gfx.js?v=206';
import { A } from './audio.js?v=206';
import {
  G, B, TAU, rnd, clamp, hyp, angDiff, alive, part, sparks, dust, addText, addRing, tryHurt, fire, shake, hitstop, flash,
  spawnEnemy, scorch, atWall, sprFor, heroSet, damage, pd,
} from './world.js?v=206';
import { SPR } from './sprites.js?v=206';
import { monsterFrame } from './monster-motion.js?v=206';
import { say, TALK, meetLines, noxLines } from './story.js?v=206';

export const ORDER = ['warden', 'brood', 'colossus', 'king', 'wyrm', 'herald', 'mirror', 'eclipse', 'clock', 'nox'];
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

// ================================================================ each boss's own trick
// Things no other boss does: the Warden's chain, the Brood Mother's webs, the King's decree, the Wyrm swallowing you,
// the Herald's charged floor, the Mirror turning you around, the Eclipse's stare, the Clockwork's stopwatch. They live
// on the world (G) rather than on the boss, so each plays out and ends cleanly whatever the boss does next, and goes
// when its boss dies. updateTricks runs every frame after the fighter moves; drawTricks draws the ones on the floor.
const RED_GOLD = '#ffd447';
const BRASS_C = '#e8c070';
const ZAP_CELL = 36;
const WATCH_R = 28;
const owned = (h) => h && h.e && !h.e.dead && !h.e.dying;
// where the Warden's lantern hand is (the chain comes out of it), from the middle of his feet
const lanternAt = (e) => [e.x - e.face * 12, e.y - 6 - (e.z || 0)];
export function updateTricks(dt) {
  const p = G.p, dead = p.state === 'dead';
  if (G.mirrorT > 0) G.mirrorT = Math.max(0, G.mirrorT - dt);
  // web globs in flight land as webs; webs fade away
  if (G.globs) {
    for (const g of G.globs) {
      g.t += dt;
      if (g.t >= g.dur && !g.done) { g.done = true; (G.webs ||= []).push({ x: g.x1, y: g.y1, r: 17 + rnd(0, 4), t: 0, life: 9 }); A.splat(); dust(g.x1, g.y1, 6, 40); }
    }
    G.globs = G.globs.filter((g) => !g.done);
  }
  if (G.webs) { for (const w of G.webs) w.t += dt; G.webs = G.webs.filter((w) => w.t < w.life); }
  // the Warden's chain: you can't get further from him than its length, it reels you in, and three dashes snap it
  const sh = G.shackle;
  if (sh) {
    const e = sh.e, dash = p.state === 'dash';
    sh.t -= dt; sh.len = Math.max(26, sh.len - 22 * dt);
    if (dash && !sh.wasDash && owned(sh)) {
      sh.breaks++; A.wall(); shake(0.2);
      sparks(p.x, p.y - 6, Math.atan2(e.y - p.y, e.x - p.x), 6, 1, P.paper, 160);
      addText(p.x, p.y - 22, sh.breaks + ' / 3', P.paper);
    }
    sh.wasDash = dash;
    if (sh.breaks >= 3) {
      G.shackle = null; addText(p.x, p.y - 28, 'BROKE FREE', P.gold, 2); A.shieldHit(); A.boom(0.6);
      for (let i = 0; i < 16; i++) { const a = rnd(TAU), v = rnd(60, 180); part(p.x, p.y - 6, Math.cos(a) * v, Math.sin(a) * v, rnd(0.3, 0.6), i % 2 ? '#8a8a9a' : P.paper, { drag: 3 }); }
    } else if (sh.t <= 0 || !owned(sh) || dead) G.shackle = null;
    else {
      const d = hyp(p.x - e.x, p.y - e.y);
      if (d > sh.len) { p.x = e.x + ((p.x - e.x) / d) * sh.len; p.y = e.y + ((p.y - e.y) / d) * sh.len; }
    }
  }
  // the Wyrm has you in its jaws: held there until you cut your way out or it spits you out
  const sw = G.swallow;
  if (sw) {
    if (!owned(sw) || dead) releaseSwallow(false, true);
    else {
      const e = sw.e;
      sw.t -= dt;
      p.x = e.x + e.face * 4; p.y = e.y + 1; p.vx = p.vy = 0; p.inv = Math.max(p.inv, 0.12); p.hidden = true;
      if (sw.hits >= sw.need) releaseSwallow(true);
      else if (sw.t <= 0) releaseSwallow(false);
    }
  }
  // the King's decree: from the moment it's spoken, moving or dashing brings fire down on you
  const dc = G.decree;
  if (dc) {
    dc.t -= dt;
    if (dc.t <= 0 || !owned(dc) || dead) G.decree = null;
    else if (p.moveIn > 0.25 || p.state === 'dash') {
      G.decree = null;
      G.strikes.push({ x: p.x, y: p.y, t: 0, delay: 0.35, R: 18, dmg: 2, friendly: false, kind: 'pillar', c: P.ember });
      addText(p.x, p.y - 26, 'DEFIANCE', P.ember, 2); A.bossRoar(); shake(0.4);
    }
  }
  // the Clockwork's stopwatch: still inside its dial when the hand comes round, and time stops for you
  const w = G.watch;
  if (w) {
    const before = w.t;
    w.t += dt;
    if (Math.floor(before / (w.life / 12)) !== Math.floor(w.t / (w.life / 12))) A.click();
    if (!owned(w) || dead) G.watch = null;
    else if (w.t >= w.life) {
      G.watch = null;
      if (p.state !== 'dash' && hyp(p.x - w.x, (p.y - w.y) * 1.3) < w.r) stopTime(w.e);
      else { addRing(w.x, w.y, BRASS_C, 160, 0.25, 1); A.zip(); }
    }
  }
  // the Herald's charged floor: one color of the checkerboard charges, then strikes, then the other
  const z = G.zap;
  if (z) {
    z.t += dt;
    if (!owned(z) || dead) G.zap = null;
    else {
      if (z.t >= 0.7 && !z.fired) {
        z.fired = true; A.zap(); shake(0.25);
        const ci = Math.floor((p.x - B.x0) / ZAP_CELL), cj = Math.floor((p.y - B.y0) / ZAP_CELL);
        if ((ci + cj) % 2 === z.par && p.state !== 'dash') tryHurt(2, p.x, p.y - 20);
        for (let i = 0; i < 6; i++) { const x = rnd(B.x0, B.x1), y = rnd(B.y0, B.y1), cx = B.x0 + (Math.floor((x - B.x0) / ZAP_CELL) + 0.5) * ZAP_CELL, cy = B.y0 + (Math.floor((y - B.y0) / ZAP_CELL) + 0.5) * ZAP_CELL; if ((Math.floor((x - B.x0) / ZAP_CELL) + Math.floor((y - B.y0) / ZAP_CELL)) % 2 === z.par) G.bolts.push({ x0: cx + rnd(-10, 10), y0: cy - 40, x1: cx, y1: cy, t: 0, life: 0.18 }); }
      }
      if (z.t >= 1.05) { z.t = 0; z.fired = false; z.par ^= 1; if (++z.beat >= z.n) G.zap = null; }
    }
  }
}
// the Eclipse's stare and the Clockwork's stopwatch hold you in place: no moving, no fighting until it wears off
function hold(kind, s) {
  const p = G.p;
  p.held = s; p.heldKind = kind; p.vx = p.vy = 0;
  if (p.state !== 'dead') p.state = 'move';
}
function stopTime(e) {
  const p = G.p;
  hold('time', 1.2);
  G.banner = { text: 'TIME STOP', sub: '', t: 0, life: 1.1, c: BRASS_C };
  flash(BRASS_C, 0.18, false); A.click(); A.zip(); shake(0.4);
  addRing(p.x, p.y - 6, BRASS_C, 220, 0.35, 2);
  // twelve shots close in on you, slowly enough to dash out once time starts again
  for (let i = 0; i < 12; i++) {
    const a = (i * TAU) / 12, x = clamp(p.x + Math.cos(a) * 72, B.x0 + 4, B.x1 - 4), y = clamp(p.y - 6 + Math.sin(a) * 72, B.y0 + 4, B.y1 - 2);
    fire(x, y, Math.atan2(p.y - 6 - y, p.x - x), 36, { c: BRASS_C, life: 3.4, noparry: i % 2 === 0 });
  }
}
function releaseSwallow(cut, quiet) {
  const sw = G.swallow, p = G.p;
  G.swallow = null; p.hidden = false;
  if (!sw) return;
  const e = sw.e, a = rnd(TAU);
  p.x = clamp(e.x + Math.cos(a) * 30, B.x0 + 6, B.x1 - 6); p.y = clamp(e.y + Math.sin(a) * 22, B.y0 + 6, B.y1 - 4);
  if (quiet) return;
  if (cut) {
    // cut out of its throat: it reels, stunned, and you come out unhurt
    p.inv = 0.8; e.state = 'stun'; e.t = 1.6; e.vx = e.vy = 0;
    damage(e, pd(120), { dir: a, kb: 0, src: 'ult', crit: true });
    G.banner = { text: 'CUT FREE', sub: '', t: 0, life: 1.2, c: P.gold };
    flash(P.paper, 0.15, false); A.slice(); A.bossRoar(); shake(0.8); hitstop(0.1);
    for (let i = 0; i < 40; i++) { const b = rnd(TAU), v = rnd(80, 240); part(e.x, e.y - 8, Math.cos(b) * v, Math.sin(b) * v, rnd(0.3, 0.7), i % 3 ? VOID : P.paper, { drag: 3, glow: i % 2 === 0 }); }
  } else {
    // spat out, hurt
    p.inv = 0; tryHurt(2, e.x, e.y);
    p.vx = Math.cos(a) * 220; p.vy = Math.sin(a) * 220;
    addText(p.x, p.y - 24, 'SPAT OUT', VOID, 2); A.splat();
    e.state = 'rec'; e.t = 0.6;
  }
}
// the floor ones: webs, the charged floor, the stopwatch's dial, the King's circle
export function drawTricks() {
  const p = G.p, blink = Math.floor(G.time * 10) % 2;
  for (const w of G.webs || []) {
    const fade = Math.min(1, (w.life - w.t) / 1.5, w.t / 0.15);
    ctx.globalAlpha = 0.55 * fade;
    ring(w.x, w.y, w.r, 1, '#d8d0e0'); ring(w.x, w.y, w.r * 0.6, 1, '#b8b0c8');
    for (let i = 0; i < 8; i++) { const a = (i * TAU) / 8 + w.x * 0.1; line(w.x, w.y, w.x + Math.cos(a) * w.r, w.y + Math.sin(a) * w.r * 0.7, '#cfc8dc'); }
    ctx.globalAlpha = 1;
  }
  for (const g of G.globs || []) {
    const k = Math.min(1, g.t / g.dur), x = g.x0 + (g.x1 - g.x0) * k, y = g.y0 + (g.y1 - g.y0) * k - Math.sin(k * Math.PI) * 40;
    ctx.globalAlpha = 0.4; disc(g.x1, g.y1, 3 + k * 3, '#05030a'); ctx.globalAlpha = 1;
    disc(x, y, 3, '#e8e0f0'); px(x - 1, y - 1, P.paper);
  }
  const z = G.zap;
  if (z) {
    const nx = Math.ceil((B.x1 - B.x0) / ZAP_CELL), ny = Math.ceil((B.y1 - B.y0) / ZAP_CELL), hot = z.fired && z.t < 0.85;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      if ((i + j) % 2 !== z.par) continue;
      const x = B.x0 + i * ZAP_CELL, y = B.y0 + j * ZAP_CELL, w = Math.min(ZAP_CELL, B.x1 - x), h = Math.min(ZAP_CELL, B.y1 - y);
      if (hot) { ctx.globalAlpha = 0.35; rect(x, y, w, h, '#62efff'); ctx.globalAlpha = 1; }
      else if (!z.fired) {
        ctx.globalAlpha = 0.06 + (z.t / 0.7) * 0.14 + (blink ? 0.05 : 0); rect(x, y, w, h, '#62efff'); ctx.globalAlpha = 1;
        if (blink || z.t > 0.45) { rect(x, y, w, 1, '#62efff'); rect(x, y + h - 1, w, 1, '#62efff'); rect(x, y, 1, h, '#62efff'); rect(x + w - 1, y, 1, h, '#62efff'); }
      }
    }
  }
  const w = G.watch;
  if (w) {
    // a clock face on the floor round where you stood, its hand sweeping round
    const k = w.t / w.life, a = -Math.PI / 2 + k * TAU;
    ctx.globalAlpha = 0.35; ctx.fillStyle = checker(BRASS_C); ctx.beginPath(); ctx.moveTo(w.x, w.y); ctx.ellipse(w.x, w.y, w.r, w.r / 1.3, 0, -Math.PI / 2, a); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    for (let i = 0; i < 48; i++) { const b = (i * TAU) / 48; px(w.x + Math.cos(b) * w.r, w.y + (Math.sin(b) * w.r) / 1.3, i % 4 === 0 ? P.paper : BRASS_C); }
    for (let i = 0; i < 12; i++) { const b = (i * TAU) / 12; line(w.x + Math.cos(b) * (w.r - 4), w.y + (Math.sin(b) * (w.r - 4)) / 1.3, w.x + Math.cos(b) * (w.r - 1), w.y + (Math.sin(b) * (w.r - 1)) / 1.3, BRASS_C); }
    line(w.x, w.y, w.x + Math.cos(a) * (w.r - 2), w.y + (Math.sin(a) * (w.r - 2)) / 1.3, k > 0.75 && blink ? P.blood : P.paper, 2);
    disc(w.x, w.y, 2, BRASS_C);
  }
  const dc = G.decree;
  if (dc) {
    // the one place the fire won't fall: where you knelt
    for (let i = 0; i < 40; i++) { if ((i + Math.floor(G.time * 8)) % 2) continue; const b = (i * TAU) / 40; px(dc.x + Math.cos(b) * 30, dc.y + Math.sin(b) * 22, RED_GOLD); }
    textO('KNEEL', p.x, p.y + 6, blink ? RED_GOLD : P.ember, 1, 'c');
  }
  if (p.held > 0 && p.heldKind === 'time') { for (let i = 0; i < 12; i++) { const b = (i * TAU) / 12 + G.time; px(p.x + Math.cos(b) * 12, p.y - 8 + Math.sin(b) * 12, BRASS_C); } }
}

export const BOSSES = {
  // ---------------------------------------------------------------- wave 5
  warden: {
    name: 'THE WARDEN', short: 'WARDEN', sub: 'KEEPER OF THE PIT', col: '#ff4fa8', colD: '#6e1b52', hp: 1000, r: 14, speed: 36, score: 6000, music: 'boss_warden',
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
            if (!G.shackle) opts.push('shackle', e.phase === 2 ? 'shackle' : 'soulring');
            if (e.phase === 2) opts.push('dash', 'dash', 'jump', 'chains', 'chains');
            // chained to him, you get the sword
            const k = G.shackle?.e === e && d < 64 ? 'sweep' : pick(e, opts);
            if (k === 'shackle') { e.state = 'chainW'; e.t = 0.6; e.lock = ang; A.warn(); }
            else if (k === 'soulring') { e.state = 'soulW'; e.t = 0.6; }
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
        case 'chainW': {
          // he swings the chain from his lantern hand, then throws it where you are
          e.t -= dt;
          const [lx, ly] = lanternAt(e);
          if (e.t > 0.15) { e.lock = Math.atan2(p.y - 6 - ly, p.x - lx); e.face = dx < 0 ? -1 : 1; }
          if (e.t <= 0) { e.state = 'chain'; e.chain = { d: 0, a: e.lock, back: false }; A.dash(); }
          break;
        }
        case 'chain': {
          const c = e.chain, [lx, ly] = lanternAt(e);
          c.d += (c.back ? -420 : 360) * dt;
          const hx = lx + Math.cos(c.a) * c.d, hy = ly + Math.sin(c.a) * c.d;
          if (!c.back && hyp(p.x - hx, p.y - 6 - hy) < 9) {
            const r = tryHurt(1, hx, hy);
            if (r === true && p.state !== 'dead') {
              G.shackle = { e, t: 3.6, len: Math.max(40, hyp(p.x - e.x, p.y - e.y)), breaks: 0, wasDash: false };
              G.banner = { text: 'SHACKLED', sub: 'DASH 3 TIMES TO BREAK THE CHAIN', t: 0, life: 1.6, c: P.hex };
              A.shieldHit(); A.wall(); shake(0.4); hitstop(0.06);
              e.chain = null; e.state = 'rec'; e.t = 0.35; break;
            }
            c.back = true;
          }
          if (!c.back && (c.d > 175 || hx < B.x0 || hx > B.x1 || hy < B.y0 - 10 || hy > B.y1)) c.back = true;
          if (c.back && c.d <= 0) { e.chain = null; e.state = 'rec'; e.t = 0.5; }
          break;
        }
        case 'rec': e.t -= dt; if (e.t <= 0) { e.state = 'walk'; e.cd = rnd(0.3, 0.8) / rage; } break;
      }
      e.tele = e.state === 'sweepW' || e.state === 'dashW' || e.state === 'chainW';
    },
    tele(e, blink) {
      if (e.state === 'sweepW') cone(e, 62, 2.7, blink, P.bloodD, '#3a0a18');
      if (e.state === 'dashW') { const cx = Math.cos(e.lock), cy = Math.sin(e.lock); line(e.x + cx * 14, e.y + cy * 14, e.x + cx * 165, e.y + cy * 165, blink ? P.blood : P.bloodD, 3); }
      if (e.state === 'jump') { const k = Math.min(1, e.t / e.jd); ring(e.jx, e.jy, 30 * (1 - k) + 6, 1, blink ? P.blood : P.paper); }
      if (e.state === 'chainW') { const [lx, ly] = lanternAt(e); for (let i = 10; i < 175; i += 7) { if ((i / 7 + Math.floor(G.time * 12)) % 2 < 1) continue; px(lx + Math.cos(e.lock) * i, ly + Math.sin(e.lock) * i, blink ? P.blood : P.paper); } }
      if (e.state === 'intro' && e.z > 0) { ring(e.x, e.y, 6 + e.z / 12, 1, blink ? P.blood : P.paper); ring(e.x, e.y, 3, 1, P.blood); }
    },
    drawBody(e, x, y) {
      glow(e.x, y + 8, P.hex, e.phase === 2 ? 16 : 10, e.phase === 2 ? 0.45 : 0.25);
      const hx = e.x + e.face * 11, hy = e.y - 18 - (e.z || 0);
      const a = e.state === 'sweepW' ? e.lock + Math.PI * 0.7 * e.face : e.state === 'dash' || e.state === 'dashW' ? e.lock : Math.PI / 2 + e.face * 0.5;
      line(hx, hy, hx + Math.cos(a) * 27, hy + Math.sin(a) * 27, P.dust, 2);
      line(hx, hy, hx + Math.cos(a) * 27, hy + Math.sin(a) * 27, P.bone);
      line(hx - Math.sin(a) * 3, hy + Math.cos(a) * 3, hx + Math.sin(a) * 3, hy - Math.cos(a) * 3, '#8a8a9a');
    },
    draw(e, x, y) {
      // the chain: flying out of his lantern hand, or holding you
      const [lx, ly] = lanternAt(e), sh = G.shackle?.e === e ? G.shackle : null;
      let tx = null, ty = null, sag = 0;
      if (e.chain) { tx = lx + Math.cos(e.chain.a) * e.chain.d; ty = ly + Math.sin(e.chain.a) * e.chain.d; }
      else if (sh) { tx = G.p.x; ty = G.p.y - 6; sag = Math.max(0, sh.len - hyp(G.p.x - e.x, G.p.y - e.y)) * 0.4; }
      if (tx !== null) {
        const L = hyp(tx - lx, ty - ly), n = Math.max(2, Math.round(L / 3));
        for (let i = 0; i <= n; i++) { const k = i / n, x = lx + (tx - lx) * k, y = ly + (ty - ly) * k + Math.sin(k * Math.PI) * sag; rect(x - 1, y - 1, 2, 2, i % 2 ? '#4a4a5a' : '#a8a8b8'); }
        if (e.chain) { rect(tx - 2, ty - 2, 4, 4, '#a8a8b8'); px(tx - 1, ty - 1, P.paper); }
        if (sh) { ring(G.p.x, G.p.y - 4, 6, 1, '#a8a8b8'); for (let i = 0; i < sh.breaks; i++) px(G.p.x - 2 + i * 2, G.p.y - 16, P.paper); }
      }
    },
    bars: introBars,
  },

  // ---------------------------------------------------------------- wave 10
  brood: {
    name: 'THE BROOD MOTHER', short: 'BROOD MOTHER', sub: 'QUEEN OF THE NEST ABOVE THE THRONE', col: '#b5f23a', colD: '#45651a', hp: 1500, r: 18, speed: 40, score: 9000, music: 'boss_brood',
    // she comes down out of the dark on a thread of silk from the nest in the walls above, hangs there looking at
    // you, then the thread snaps and she lands; her eggs hatch round her as she rears up and screams
    init(e) { e.state = 'intro'; e.t = 3.6; e.z = 240; e.under = false; e.landed = false; },
    update(e, dt, d, ang, dx) {
      const p = G.p, rage = e.phase === 2 ? 1.3 : 1;
      e.superArmor = true; e.kx = e.ky = 0;
      if (e.state === 'intro') {
        const T = 3.6, before = e.t;
        e.t -= dt;
        if (e.t > 1.15) {
          const k = clamp((T - e.t) / (T - 1.6), 0, 1);
          e.z = 240 - 200 * (1 - (1 - k) ** 3);
          if (Math.random() < dt * 30) part(e.x + rnd(-24, 24), e.y - e.z - rnd(10, 40), rnd(-6, 6), rnd(10, 40), rnd(0.6, 1.2), Math.random() < 0.5 ? P.stone2 : '#6a5040', { g: 160, drag: 0.5 });
          if (Math.floor(before * 3) !== Math.floor(e.t * 3)) A.click();
          if (before > 1.6 && e.t <= 1.6) { A.warn(); e.face = dx < 0 ? -1 : 1; }
        } else if (!e.landed) {
          // the thread snaps
          if (before > 1.15) { A.crack(); addText(e.x, e.y - 70, 'SNAP', '#d8d0e0', 1); }
          e.z = Math.max(0, e.z - dt * 520);
          if (e.z <= 0) {
            e.landed = true; A.bossRoar(); A.boom(1.8); shake(1); hitstop(0.08);
            for (let i = 0; i < 50; i++) { const a = rnd(TAU), v = rnd(60, 220); part(e.x, e.y, Math.cos(a) * v, Math.sin(a) * v * 0.6, rnd(0.4, 0.9), Math.random() < 0.5 ? P.stone2 : '#6a5040', { z: 4, vz: rnd(60, 160), g: 300, drag: 2, s: 2, keep: true }); }
            scorch(e.x, e.y, 26); addRing(e.x, e.y, P.ichor, 360, 0.5, 3); addRing(e.x, e.y, P.paper, 260, 0.35, 1);
            G.quakes.push({ x: e.x, y: e.y, r: 0, delay: 0, max: 60, hitP: false });
            for (let i = 0; i < 6; i++) { const a = (i * TAU) / 6 + 0.3; spawnEnemy('larva', clamp(e.x + Math.cos(a) * 30, B.x0 + 8, B.x1 - 8), clamp(e.y + Math.sin(a) * 20, B.y0 + 8, B.y1 - 6)); }
          }
        }
        if (e.t <= 0 && e.landed) { e.state = 'walk'; e.cd = 0.6; e.z = 0; }
        else if (e.t <= 0) e.t = 0.01;
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
            if ((G.webs?.length || 0) < 7) opts.push('webs', 'webs');
            const k = pick(e, opts);
            if (k === 'webs') { e.state = 'webW'; e.t = 0.5; A.warn(); }
            else if (k === 'swarm') { e.state = 'swarmW'; e.t = 0.8; e.laid = false; A.bossRoar(); }
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
          // she shoots a line up into the dark and climbs it out of sight
          e.t -= dt; e.z = (e.z || 0) + dt * (e.t < 0.3 ? 520 : 60);
          if (e.t <= 0) { e.under = true; e.state = 'tunnel'; e.t = e.phase === 2 ? 1.3 : 1.7; e.mx = e.x; e.my = e.y; }
          break;
        case 'tunnel':
          // up there her shadow follows you; then it stops, and she drops onto it
          e.t -= dt;
          if (e.t > 0.55) { e.vx = Math.cos(ang) * 135; e.vy = Math.sin(ang) * 135; }
          e.mx = e.x; e.my = e.y;
          if (Math.random() < dt * 20) part(e.x + rnd(-12, 12), e.y - rnd(60, 90), 0, rnd(20, 50), 0.8, '#6a5040', { g: 160, drag: 0.5 });
          if (e.t <= 0) { e.under = false; e.state = 'drop'; e.z = 140; A.warn(); }
          break;
        case 'drop':
          e.z = Math.max(0, e.z - dt * 640);
          if (e.z <= 0) {
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
        case 'webW':
          // she rears up and spits web over the floor round you: it holds your feet (dashing still gets you out)
          e.t -= dt; e.face = dx < 0 ? -1 : 1;
          if (e.t <= 0) {
            const n = e.phase === 2 ? 6 : 4;
            for (let i = 0; i < n; i++) {
              const a = rnd(TAU), r = i < 2 ? rnd(0, 18) : rnd(30, 90);
              (G.globs ||= []).push({ x0: e.x, y0: e.y - 12, x1: clamp(p.x + Math.cos(a) * r, B.x0 + 14, B.x1 - 14), y1: clamp(p.y + Math.sin(a) * r * 0.7, B.y0 + 12, B.y1 - 8), t: 0, dur: 0.55 + i * 0.07 });
            }
            A.splat(); A.shoot(); G.banner = { text: 'WEBS', sub: 'THEY HOLD YOUR FEET', t: 0, life: 1.1, c: '#d8d0e0' };
            e.state = 'rec'; e.t = 0.7;
          }
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
      if (e.state === 'tunnel') {
        // where she will land: a shadow growing under you, a ring closing in as the drop comes
        const k = Math.max(0, 1 - e.t / 1.7);
        ctx.globalAlpha = 0.25 + 0.35 * k; disc(e.x, e.y, 10 + 14 * k, '#05030a'); ctx.globalAlpha = 1;
        ring(e.x, e.y, 36 - 14 * k, 1, blink ? P.blood : P.paper); ring(e.x, e.y, 22, 1, P.bloodD);
        for (let y = e.y - 4; y > e.y - 120; y -= 3) px(e.x + Math.sin(y * 0.2 + G.time * 3) * 0.6, y, '#cfc8dc');
      }
      if (e.state === 'lungeW') { const cx = Math.cos(e.lock), cy = Math.sin(e.lock); line(e.x + cx * 14, e.y + cy * 14, e.x + cx * 120, e.y + cy * 120, blink ? P.blood : P.bloodD, 3); }
    },
    drawBody(e, x, y, s) {
      glow(e.x, y + s.h * 0.3, P.ichor, e.phase === 2 ? 18 : 12, 0.3);
      // the silk she hangs from, up into the dark
      if (e.state === 'intro' && e.t <= 1.15) {
        // the snapped end whips back up into the dark, fading
        const k = Math.min(1, (1.15 - e.t) / 0.7);
        if (k < 1) { ctx.globalAlpha = 1 - k; const yb = y + 4 - (y + 264) * k * k; for (let yy = yb; yy > y - 260; yy -= 2) px(e.x + Math.sin(yy * 0.3 + G.time * 20) * 3 * (1 - k), yy, '#cfc8dc'); ctx.globalAlpha = 1; }
      }
      if (e.z > 1 && (e.state === 'intro' && e.t > 1.15 || e.state === 'dig' || e.state === 'drop')) {
        const sway = Math.sin(G.time * 2.2) * 2;
        for (let yy = y + 4; yy > y - 260; yy -= 2) px(e.x + sway * (1 - (yy - y + 260) / 264), yy, (yy >> 1) % 3 ? '#cfc8dc' : '#8a8098');
      }
    },
    bars: introBars,
  },

  // ---------------------------------------------------------------- wave 15
  colossus: {
    name: 'IRON COLOSSUS', short: 'COLOSSUS', sub: 'A WAR MACHINE NOBODY TURNED OFF', col: '#ff7a2b', colD: '#5a2410', hp: 1900, r: 18, speed: 28, score: 12000, music: 'boss_colossus',
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
    drawBody(e, x, y, s) {
      // (drawn 1.3 times finer than its design: 0.87 game pixels to a unit; the visor slit runs 19.5 to 30.5 at 9.7)
      const u = 0.867, gx = (ax) => (e.face < 0 ? x + s.w - ax * u : x + ax * u);
      if (Math.random() < 0.25) for (const [ax, ay] of [[17, 1.5], [31, 3]]) part(gx(ax), y + ay * u, rnd(-6, 6), -rnd(14, 30), rnd(0.6, 1.1), Math.random() < 0.7 ? '#6a6470' : '#8a8490', { drag: 1 });
      if (e.state === 'intro' && e.off) return;
      for (let i = 0; i < 9; i++) px(x + 17 + i, y + 8, Math.floor(G.time * 10 + i) % 4 ? '#ff4f4f' : P.paper);
      glow(e.x, y + 8, '#ff4f4f', 10, 0.4);
      glow(e.x, y + 19, '#ff7a2b', e.phase === 2 ? 16 : 10, 0.4);
    },
    draw(e, x, y) {
      if (e.shieldUp) { ring(e.x, e.y - 14, 20 + Math.sin(G.time * 10), 1, '#62efff'); glow(e.x, e.y - 14, '#62efff', 22, 0.25); }
      if (e.state === 'stun') for (let i = 0; i < 4; i++) { const a = G.time * 5 + (i * TAU) / 4; px(e.x + Math.cos(a) * 12, y - 4 + Math.sin(a) * 3, P.gold); }
    },
    bars: introBars,
  },

  // ---------------------------------------------------------------- wave 20: final
  king: {
    name: 'THE ASHEN KING', short: 'ASHEN KING', sub: 'THE LAST FIRE', col: '#ff6a2b', colD: '#5a1420', hp: 3600, r: 27, speed: 55, score: 30000, music: 'boss_king', final: true,
    init(e) { e.state = 'intro'; e.t = 3; e.combo = 0; },
    update(e, dt, d, ang, dx) {
      const p = G.p;
      e.superArmor = true; e.kx = e.ky = 0;
      if (e.phase === 3) G.dark = Math.min(1, G.dark + dt * 0.8);
      if (e.state === 'intro') {
        // rises from a pillar of fire, roars, and then he and the fighter talk; the fight waits for them
        e.t -= dt;
        if (e.t <= 1 && !e.met) { e.met = true; say(meetLines(G.char), { lore: true }); }
        if (Math.random() < 0.95) part(e.x + rnd(-10, 10), e.y - rnd(0, 10), rnd(-15, 15), -rnd(80, 200), rnd(0.4, 0.9), Math.random() < 0.5 ? P.ember : P.ember3, { glow: true, keep: true, drag: 1 });
        if (e.t < 1.6 && e.t + dt >= 1.6) { flash('#ff6a2b', 0.3, true); shake(1); A.boom(2.4); A.bossRoar(); addRing(e.x, e.y - 10, P.ember, 420, 0.6, 3); for (let i = 0; i < 16; i++) fire(e.x, e.y - 36, (i * TAU) / 16, 40, { life: 1.2, dmg: 0 }); }
        if (e.t <= 0) { e.state = 'walk'; e.cd = 0.5; }
        return;
      }
      if (e.phase === 1 && e.hp < e.maxHp * 0.66) { e.phase = 2; e.state = 'rec'; e.t = 1.2; A.bossRoar(); shake(0.8); flash(P.ember, 0.2, true); phaseBanner('THE KING BURNS', P.ember); say(TALK.kingBurns); }
      else if (e.phase === 2 && e.hp < e.maxHp * 0.33) { e.phase = 3; e.state = 'rec'; e.t = 1.5; A.bossRoar(); shake(1); phaseBanner('THE KING UNBOUND', P.blood); say(TALK.kingUnbound); }
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
            if (e.phase === 3 && !e.sunUsed) opts.push('sunbeam', 'sunbeam', 'sunbeam');
            if (e.phase >= 2 && !G.decree) opts.push('decree', 'decree');
            const k = pick(e, opts);
            if (k === 'sunbeam') {
              // he tears open the black sun in his chest: two beams of its fire sweep round the hall
              e.sunUsed = true; e.state = 'sunW'; e.t = 1.1; A.warn(); A.bossRoar();
              G.banner = { text: 'THE BLACK SUN', sub: 'KEEP AHEAD OF THE BEAMS', t: 0, life: 1.6, c: P.ember };
            } else             if (k === 'decree') {
              // KNEEL: he raises his sword and commands you to be still; fire falls everywhere but where you stand
              e.state = 'decreeW'; e.t = 0.9; e.lock = -Math.PI / 2;
              G.banner = { text: 'KNEEL', sub: 'DO NOT MOVE', t: 0, life: 2.2, c: P.gold }; A.warn(); A.bossRoar();
            } else if (k === 'flare') {
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
        case 'decreeW':
          e.t -= dt; e.vx = e.vy = 0;
          if (e.t <= 0) {
            G.decree = { e, t: 2.6, x: p.x, y: p.y };
            for (let i = 0; i < 18; i++) {
              let x = 0, y = 0;
              for (let j = 0; j < 12; j++) { x = rnd(B.x0 + 10, B.x1 - 10); y = rnd(B.y0 + 10, B.y1 - 6); if (hyp(x - p.x, (y - p.y) * 1.36) > 40) break; }
              if (hyp(x - p.x, (y - p.y) * 1.36) <= 40) continue;
              G.strikes.push({ x, y, t: -i * 0.1, delay: 0.95, R: 20, dmg: 2, friendly: false, kind: 'pillar', c: P.ember });
            }
            A.meteorFall(); shake(0.4); e.state = 'rec'; e.t = 2.6;
          }
          break;
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
        case 'sunW':
          e.t -= dt; e.vx = e.vy = 0;
          if (Math.random() < 0.9) part(e.x + rnd(-10, 10), e.y - 50 + rnd(-6, 6), 0, 0, 0.3, Math.random() < 0.5 ? P.ember : P.gold, { glow: true });
          if (e.t <= 0) {
            const a0 = Math.atan2(p.y - e.y, p.x - e.x) + Math.PI / 2, dir = Math.random() < 0.5 ? -1 : 1;
            for (const off of [0, Math.PI]) G.hbeams.push({ x: e.x, y: e.y - 38, owner: e, oy: 38, a: a0 + off, rot: dir * 1.15, w: 6, warn: 0.5, t: 0, life: 3.6, len: 0 });
            flash(P.ember, 0.2, true); shake(0.8); A.boom(2); A.ultRelease();
            e.state = 'sunBeam'; e.t = 3.8;
          }
          break;
        case 'sunBeam':
          e.t -= dt; e.vx = e.vy = 0;
          if (e.t <= 0) { e.state = 'rec'; e.t = 1; e.sunUsed = false; }
          break;
        case 'rec': e.t -= dt; if (e.t <= 0) { e.state = 'walk'; e.cd = rnd(0.3, 0.8) / spd; } break;
      }
      e.tele = e.state === 'kslashW';
      if (Math.random() < 0.5) part(e.x + rnd(-8, 8), e.y - rnd(2, 12), rnd(-10, 10), -rnd(20, 50), 0.5, Math.random() < 0.5 ? P.ember : '#8a2a30', { glow: true, drag: 1 });
    },
    tele(e, blink) {
      if (e.state === 'kslashW') cone(e, 80, 2.8, blink, '#5a1a0a', '#2a0a04');
      if (e.state === 'intro') {
        const end = Math.min(1, e.t / 0.7), w = Math.max(1, 40 * Math.min(1, (3 - e.t) / 0.6) * end * end);
        ctx.globalAlpha = 0.4 + 0.6 * end;
        rect(e.x - w / 2, e.y - 170, w, 170, '#c6380f'); rect(e.x - w / 4, e.y - 170, w / 2, 170, P.ember3);
        glow(e.x, e.y - 20, P.ember, 30, 0.6 * end);
        ctx.globalAlpha = 1;
      }
    },
    drawBody(e, x, y) {
      // (he is drawn 2.8 times finer than his design: 1.87 game pixels to a unit of it)
      const hx = e.x + e.face * 25, hy = e.y - 42;
      const a = e.state === 'kslashW' ? e.lock + Math.PI * 0.7 * e.face : e.state === 'decreeW' || G.decree?.e === e ? -Math.PI / 2 + e.face * 0.12 : Math.PI / 2 + e.face * 0.6;
      line(hx, hy, hx + Math.cos(a) * 66, hy + Math.sin(a) * 66, '#7a1a08', 8);
      line(hx, hy, hx + Math.cos(a) * 66, hy + Math.sin(a) * 66, '#c6380f', 6);
      line(hx, hy, hx + Math.cos(a) * 66, hy + Math.sin(a) * 66, P.ember3, 2);
      line(hx - Math.sin(a) * 6, hy + Math.cos(a) * 6, hx + Math.sin(a) * 6, hy - Math.cos(a) * 6, '#d8a032', 2);
      if (Math.random() < 0.9) part(hx + Math.cos(a) * rnd(4, 66), hy + Math.sin(a) * rnd(4, 66), 0, -rnd(20, 40), 0.3, P.ember, { glow: true });
      glow(e.x, y + 11, P.gold, 20, 0.45);
      glow(e.x, y + 39, P.ember, e.phase * 14, 0.35);
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
    name: 'VOID WYRM', short: 'VOID WYRM', sub: 'IT SWIMS THROUGH STONE', col: VOID, colD: '#3a1a6a', hp: 2400, r: 11, speed: 74, score: 16000, music: 'boss_wyrm',
    init(e) { e.state = 'intro'; e.t = 2.2; e.under = true; e.trail = []; e.segments = []; e.wob = 0; e.cdir = 1; },
    update(e, dt, d, ang, dx) {
      const p = G.p, spd = e.phase === 2 ? 1.3 : 1;
      e.superArmor = true; e.kx = e.ky = 0;
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
            // right under you: it comes up with you in its jaws
            if (d < 26 && !G.swallow && tryHurt(1, e.x, e.y) === true && p.state !== 'dead') {
              G.swallow = { e, t: 2.6, hits: 0, need: 6 }; p.hidden = true; p.vx = p.vy = 0;
              G.banner = { text: 'DEVOURED', sub: 'ATTACK TO CUT YOUR WAY OUT', t: 0, life: 1.6, c: VOID };
              A.bossRoar(); A.boom(1.4); shake(0.9); scorch(e.x, e.y, 14);
              e.state = 'devour'; e.t = 2.6; e.vx = e.vy = 0;
              break;
            }
            orbRing(e, e.phase === 2 ? 20 : 14, 70, undefined, { c: VOID, noparry: false });
            G.quakes.push({ x: e.x, y: e.y, r: 0, delay: 0, max: 90, hitP: false, c: VOID, c2: '#3a1a6a' });
            A.boom(1.5); A.bossRoar(); shake(0.8); scorch(e.x, e.y, 14);
            e.state = 'rec'; e.t = 0.7;
          }
          break;
        case 'devour':
          // it thrashes with you inside; updateTricks ends it
          e.vx = e.vy = 0; if (Math.random() < 0.4) dust(e.x, e.y, 2, 50);
          if (G.swallow?.e !== e && e.state === 'devour') { e.state = 'rec'; e.t = 0.5; }
          break;
        case 'stun': e.t -= dt; e.vx = e.vy = 0; if (Math.random() < 0.3) sparks(e.x + rnd(-8, 8), e.y - rnd(4, 14), rnd(TAU), 2, 1, P.paper, 80); if (e.t <= 0) { e.state = 'walk'; e.cd = 0.3; } break;
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
    afterMove(e) {
      const step = 3.5, last = e.trail[0];
      const distance = last ? hyp(e.x - last.x, e.y - last.y) : Infinity;
      if (distance > 45) { e.trail = [{ x: e.x, y: e.y }]; e.segments.length = 0; return; }
      const count = Math.floor(distance / step);
      for (let i = 1; i <= count; i++) {
        const k = i * step / distance;
        e.trail.unshift({ x: last.x + (e.x - last.x) * k, y: last.y + (e.y - last.y) * k });
      }
      if (e.trail.length > 70) e.trail.length = 70;
      const k = distance / step - count;
      for (let i = 4, j = 0; i < e.trail.length; i += 5, j++) {
        const a = e.trail[i], b = e.trail[i - 1], part = e.segments[j] ||= { x: 0, y: 0 };
        part.x = a.x + (b.x - a.x) * k; part.y = a.y + (b.y - a.y) * k;
      }
      if (!e.under) for (const s of e.segments) {
        if (hyp(G.p.x - s.x, G.p.y - s.y) < 8) { tryHurt(2, s.x, s.y); break; }
      }
    },
    tele(e, blink) {
      if (!e.under) for (let i = e.segments.length - 1; i >= 0; i--) {
        const s = e.segments[i], sp = monsterFrame('wyrmSeg', e.motion.phase - i * 0.11, SPR.wyrmSeg);
        drawSprite(sp, s.x - sp.w / 2, s.y - sp.h, false);
      }
      else { for (let i = -8; i <= 8; i += 2) px(e.x + i, e.y - Math.round(Math.cos(i / 5) * 3), '#5a2f9c'); if (e.state === 'tunnel' && e.t < 0.4) ring(e.x, e.y, 26, 1, blink ? P.blood : P.paper); }
      if (e.state === 'breathW') cone(e, 90, 1.1, blink, '#2a0a40', '#14051f');
    },
    // every hit you land from inside it counts toward cutting your way out
    onHit(e) { if (G.swallow?.e === e) { G.swallow.hits++; A.slice(); for (let i = 0; i < 6; i++) part(e.x + rnd(-6, 6), e.y - rnd(4, 12), rnd(-60, 60), rnd(-80, -20), 0.4, i % 2 ? VOID : P.paper, { drag: 2 }); } },
    draw(e, x, y) {
      glow(e.x, y + 4, VOID, 10, 0.4);
      const sw = G.swallow?.e === e ? G.swallow : null;
      if (sw) {
        // how close you are to cutting out
        for (let i = 0; i < sw.need; i++) rect(e.x - sw.need * 2 + i * 4, y - 8, 3, 3, i < sw.hits ? P.gold : '#3a2060');
        textO('ATTACK', e.x, y - 16, Math.floor(G.time * 8) % 2 ? P.paper : P.gold, 1, 'c');
      }
    },
    bars: introBars,
  },

  // ---------------------------------------------------------------- wave 30
  herald: {
    name: 'STORM HERALD', short: 'HERALD', sub: 'HIS HORN CALLS THE STORM', col: '#62efff', colD: '#163a78', hp: 2800, r: 12, speed: 54, score: 20000, music: 'boss_herald',
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
            const opts = ['bolts', 'bolts', 'teleport', 'orbs', 'horn', 'horn'];
            if (e.phase === 2) opts.push('lances', 'lances', 'storm');
            if (!G.zap) opts.push('floor', 'floor');
            const k = pick(e, opts);
            if (k === 'floor') {
              // the floor becomes a checkerboard of charge: the squares you stand on strike first, then the others,
              // turn and turn about, five beats
              const ci = Math.floor((p.x - B.x0) / ZAP_CELL), cj = Math.floor((p.y - B.y0) / ZAP_CELL);
              G.zap = { e, t: -0.4, beat: 0, n: e.phase === 2 ? 6 : 5, par: (ci + cj) % 2, fired: false };
              G.banner = { text: 'THE FLOOR IS CHARGED', sub: 'STEP OFF THE LIT SQUARES', t: 0, life: 1.4, c: '#62efff' };
              A.zap(); A.warn(); e.state = 'rec'; e.t = (e.phase === 2 ? 6 : 5) * 1.05;
            } else if (k === 'horn') {
              // he lifts the war horn: a cone of thunder that throws you back, and ball lightning drifting after you
              e.state = 'hornW'; e.t = 0.85; e.lock = ang; A.warn();
              G.banner = { text: 'THE HORN', sub: 'GET OUT OF ITS PATH', t: 0, life: 1, c: '#62efff' };
            } else if (k === 'bolts') {
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
        case 'hornW':
          e.t -= dt; e.vx *= 0.8; e.vy *= 0.8; e.face = Math.cos(e.lock) < 0 ? -1 : 1;
          if (e.t <= 0) {
            const pa = Math.atan2(p.y - e.y, p.x - e.x);
            if (d < 150 && Math.abs(angDiff(pa, e.lock)) < 0.75) { p.vx += Math.cos(pa) * 340; p.vy += Math.sin(pa) * 340; tryHurt(2, e.x, e.y); }
            for (let i = 0; i < 26; i++) { const a2 = e.lock + rnd(-0.75, 0.75), v = rnd(140, 320); part(e.x, e.y - 18, Math.cos(a2) * v, Math.sin(a2) * v, rnd(0.2, 0.5), i % 3 ? '#62efff' : P.paper, { drag: 4, glow: true }); }
            for (const off of e.phase === 2 ? [-0.5, -0.17, 0.17, 0.5] : [-0.35, 0, 0.35]) fire(e.x, e.y - 18, e.lock + off, 42, { c: '#62efff', life: 5.5, r: 4, dmg: 2, noparry: true });
            addRing(e.x, e.y - 18, '#62efff', 300, 0.35, 3); A.bossRoar(); A.boom(1.2); A.zap(); shake(0.7); flash('#62efff', 0.1, false);
            e.state = 'rec'; e.t = 0.9;
          }
          break;
        case 'rec': e.t -= dt; if (e.t <= 0) { e.state = 'walk'; e.cd = rnd(0.3, 0.7) / spd; } break;
      }
    },
    tele(e, blink) { if (e.state === 'hornW') cone(e, 150, 1.5, blink, '#1a5a7a', '#0a2a3a'); },
    draw(e, x, y) {
      glow(e.x, y + 8, '#62efff', 12, 0.4);
      if (Math.random() < 0.15) G.bolts.push({ x0: e.x, y0: y + 6, x1: e.x + rnd(-14, 14), y1: y + rnd(0, 16), t: 0, life: 0.08 });
      if (e.orbsT > 0) for (let i = 0; i < 4; i++) { const a = e.oa + (i * TAU) / 4, ox = e.x + Math.cos(a) * 20, oy = e.y - 14 + Math.sin(a) * 14; disc(ox, oy, 2, '#62efff'); px(ox, oy, P.paper); glow(ox, oy, '#62efff', 7, 0.5); }
    },
    bars: introBars,
  },

  // ---------------------------------------------------------------- wave 35
  mirror: {
    name: 'THE MIRROR', short: 'MIRROR', sub: 'IT LEARNED YOUR MOVES', col: '#cfd8e0', colD: '#2a2a38', hp: 2700, r: 7, speed: 110, score: 24000, music: 'boss_mirror', tint: '#1a1626',
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
            const k = pick(e, ['dash', 'dash', 'combo', 'combo', 'rift', 'volley', ...(G.mirrorT > 0 ? [] : e.phase === 2 ? ['swap', 'swap'] : ['swap'])]);
            if (k === 'swap') { e.state = 'swapW'; e.t = 0.7; A.warn(); }
            else if (k === 'dash') { e.state = 'dashW'; e.t = 0.42; e.lock = ang; }
            else if (k === 'combo') { e.state = 'slashW'; e.t = 0.32; e.combo = e.phase === 2 ? 4 : 3; e.lock = ang; }
            else if (k === 'rift') {
              for (let i = 0; i < (e.phase === 2 ? 3 : 2); i++) { const a = rnd(TAU); G.hlines.push({ x0: p.x - Math.cos(a) * 200, y0: p.y - 5 - Math.sin(a) * 200, x1: p.x + Math.cos(a) * 200, y1: p.y - 5 + Math.sin(a) * 200, t: -i * 0.15, pend: 0.65, done: false }); }
              A.rift(); A.warn(); e.state = 'rec'; e.t = 0.9;
            } else { for (let i = -2; i <= 2; i++) fire(e.x, e.y - 14, ang + i * 0.18, 120, { c: '#cfd8e0' }); A.shoot(); e.state = 'rec'; e.t = 0.5; }
          }
          break;
        case 'swapW':
          // the glass between you turns: it takes your place and you take its, and left becomes right
          e.t -= dt; e.vx = e.vy = 0;
          if (Math.random() < 0.5) part(e.x + rnd(-10, 10), e.y - rnd(0, 20), 0, -rnd(20, 50), 0.4, P.paper, { glow: true });
          if (e.t <= 0) {
            G.ghosts.push({ x: e.x, y: e.y, flip: e.face < 0, t: 0, life: 0.4, c: P.paper, spr: sprFor(e) });
            const ox = e.x, oy = e.y; e.x = p.x; e.y = p.y; p.x = ox; p.y = oy; p.vx = p.vy = 0;
            G.mirrorT = e.phase === 2 ? 3.6 : 3;
            G.banner = { text: 'MIRRORED', sub: 'LEFT IS RIGHT', t: 0, life: 1.4, c: P.paper };
            flash(P.paper, 0.2, false); A.ultRelease(); shake(0.5);
            addRing(p.x, p.y - 6, P.paper, 240, 0.35, 2); addRing(e.x, e.y - 6, '#cfd8e0', 240, 0.35, 2);
            e.state = 'rec'; e.t = 0.5;
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
      if (e.state === 'swapW') { const p = G.p; for (const o of [e, p]) ring(o.x, o.y - 8, 14 - e.t * 10, 1, blink ? P.paper : '#8a8a9a'); }
      // turned around: shards of glass circle you while it lasts
      if (G.mirrorT > 0) { const p = G.p; for (let i = 0; i < 6; i++) { const a = G.time * 3 + (i * TAU) / 6, x = p.x + Math.cos(a) * 13, y = p.y - 8 + Math.sin(a) * 6; px(x, y, P.paper); px(x + 1, y + 1, '#8a9aaa'); } }
    },
    drawBody(e, x, y) {
      // (it's your own fighter's size, so its pixels are the same as yours)
      const set = heroSet(), s = sprFor(e), ex = x + (e.face < 0 ? s.w - 1 - set.eye[0] : set.eye[0]), ey = y + set.eye[1];
      rect(ex, ey, 2, 2, P.paper); glow(ex, ey, P.paper, 5, 0.6);
    },
    bars: introBars,
  },

  // ---------------------------------------------------------------- wave 40
  eclipse: {
    name: 'ECLIPSE', short: 'ECLIPSE', sub: 'THE SUN THAT WATCHES', col: '#ffd447', colD: '#5a1420', hp: 4300, r: 19, speed: 14, score: 40000, music: 'boss_eclipse',
    init(e) { e.state = 'intro'; e.t = 3; e.open = 0; e.spin = 0; },
    update(e, dt, d, ang) {
      const p = G.p, spd = e.phase === 2 ? 1.3 : 1;
      e.superArmor = true; e.kx = e.ky = 0; e.z = 5 + Math.sin(e.anim * 1.5) * 1.5;
      if (e.state === 'intro') {
        // the sky goes dark, then the eye opens
        e.t -= dt;
        e.lightBack = false;
        G.dark = Math.min(0.75, (3 - e.t) * 0.5);
        e.open = Math.max(0, Math.min(1, (1.6 - e.t) / 1.2));
        if (e.t < 0.4 && !e.lit) { e.lit = true; flash(P.gold, 0.25, true); A.bossRoar(); A.ultRelease(); addRing(e.x, e.y - 14, P.gold, 380, 0.6, 3); }
        if (e.t <= 0) { e.state = 'walk'; e.cd = 0.4; e.lightBack = true; }
        return;
      }
      if (e.lightBack) { G.dark = Math.max(0, G.dark - dt * 0.5); if (G.dark <= 0) e.lightBack = false; }
      if (e.phase === 1 && e.hp < e.maxHp * 0.5) { e.phase = 2; e.state = 'rec'; e.t = 1; phaseBanner('TOTAL ECLIPSE', P.gold); A.bossRoar(); shake(0.8); }
      if (e.phase === 2) G.dark = Math.min(0.55, G.dark + dt);
      switch (e.state) {
        case 'walk':
          walkTo(e, p.x, p.y - 40, e.speed);
          e.cd -= dt;
          if (e.cd <= 0) {
            const opts = ['spiral', 'rings', 'beams', 'minions', 'gaze'];
            if (e.phase === 2) opts.push('cross', 'spiral', 'rings', 'gaze');
            const k = pick(e, opts);
            if (k === 'gaze') {
              // it stares: a cone of light that turns after you; stay in it too long and you turn to stone
              e.state = 'gaze'; e.t = 3; e.ga = Math.atan2(p.y - (e.y - 22), p.x - e.x); G.stare = 0;
              G.banner = { text: 'DO NOT MEET ITS GAZE', sub: '', t: 0, life: 1.4, c: P.gold }; A.warn();
            } else if (k === 'spiral') { e.state = 'spiral'; e.t = 2.6; e.fireT = 0; e.sdir = Math.random() < 0.5 ? 1 : -1; }
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
        case 'gaze': {
          e.t -= dt;
          const ey = e.y - 22 - (e.z || 0), want = Math.atan2(p.y - 6 - ey, p.x - e.x), turn = (e.phase === 2 ? 1 : 0.78) * dt;
          e.ga += clamp(angDiff(want, e.ga), -turn, turn);
          const inCone = p.state !== 'dash' && p.state !== 'dead' && Math.abs(angDiff(want, e.ga)) < 0.3 && hyp(p.x - e.x, p.y - 6 - ey) < 270;
          G.stare = inCone ? (G.stare || 0) + dt : Math.max(0, (G.stare || 0) - dt * 0.6);
          if (G.stare >= 0.9) {
            G.stare = 0;
            if (tryHurt(1, e.x, ey) === true && p.state !== 'dead') {
              hold('stone', 1.4);
              G.banner = { text: 'TURNED TO STONE', sub: '', t: 0, life: 1.2, c: '#b8b4c4' };
              A.boom(0.8); A.wall(); shake(0.4);
              for (let i = 0; i < 14; i++) part(p.x + rnd(-6, 6), p.y - rnd(0, 16), rnd(-30, 30), -rnd(10, 50), 0.6, i % 2 ? '#8c8a98' : '#d8d4e0', { g: 200, drag: 1, s: 2 });
            }
            e.state = 'rec'; e.t = 0.9;
          }
          if (e.t <= 0) { e.state = 'rec'; e.t = 0.5; G.stare = 0; }
          break;
        }
        case 'spiral':
          e.t -= dt; e.fireT -= dt;
          if (e.fireT <= 0) { e.fireT = 0.07 / spd; for (let k = 0; k < 4; k++) fire(e.x, e.y - 14, e.spin + (k * TAU) / 4, 75, { c: P.gold, noparry: k % 2 === 0 }); e.spin += 0.22 * e.sdir; A.shoot(); }
          if (e.t <= 0) { e.state = 'rec'; e.t = 0.6; }
          break;
        case 'rec': e.t -= dt; if (e.t <= 0) { e.state = 'walk'; e.cd = rnd(0.3, 0.7) / spd; } break;
      }
    },
    tele(e, blink) {
      if (e.state !== 'gaze') return;
      // the stare: a wedge of gold light out of the eye, and the stone creeping over you while you stand in it
      const ey = e.y - 22 - (e.z || 0), p = G.p;
      ctx.globalAlpha = 0.5; ctx.fillStyle = checker(blink ? '#ffd447' : '#c98a1a');
      ctx.beginPath(); ctx.moveTo(e.x, ey); ctx.arc(e.x, ey, 270, e.ga - 0.3, e.ga + 0.3); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      line(e.x, ey, e.x + Math.cos(e.ga) * 270, ey + Math.sin(e.ga) * 270, '#fff0a0');
      const k = Math.min(1, (G.stare || 0) / 0.9);
      if (k > 0) for (let i = 0; i < 24; i++) { if (i / 24 > k) break; const a = -Math.PI / 2 + (i / 24) * TAU; px(p.x + Math.cos(a) * 10, p.y - 8 + Math.sin(a) * 12, k > 0.7 && blink ? P.paper : '#9c98aa'); }
    },
    drawBody(e, x, y) {
      // (drawn 1.2 times finer than its design: 0.8 game pixels to a unit; the eye sits at 25, 24)
      const cx = x + 20, cy = y + 19;
      ring(cx, cy, 13 + Math.sin(G.time * 6) * 1.5, 1, P.gold); glow(cx, cy, P.gold, 30, 0.35);
      // the pupil looks at you (while it stares, along its stare)
      const a = e.state === 'gaze' ? e.ga : Math.atan2(G.p.y - 6 - cy, G.p.x - cx);
      if (e.state === 'gaze') glow(cx, cy, '#fff0a0', 18, 0.5);
      rect(cx + Math.cos(a) * 1.6 - 1, cy + Math.sin(a) * 1.6 - 2, 2, 4, '#1a0a06'); px(cx + Math.cos(a) * 1.6, cy + Math.sin(a) * 1.6 - 1, P.paper);
      if (e.open < 1) { const h = Math.round(6 * (1 - e.open)); rect(cx - 8, cy - 6, 16, h, '#0a0610'); rect(cx - 8, cy + 6 - h, 16, h, '#0a0610'); }
    },
    bars: introBars,
  },
});

// ---------------------------------------------------------------- wave 45
const BRASS = '#e8c070', NOXC = '#b48cff';
// remember the shots a volley fired, so time can stop and restart them
const volley = (fn) => { const n0 = G.shots.length; fn(); return G.shots.slice(n0); };
Object.assign(BOSSES, {
  clock: {
    name: 'THE CLOCKWORK', short: 'CLOCKWORK', sub: 'TIME BENDS TO IT', col: BRASS, colD: '#5a3a10', hp: 5100, r: 17, speed: 28, score: 52000, music: 'boss_clock',
    init(e) { e.state = 'intro'; e.t = 2.8; e.under = true; e.hand = 0; e.handM = 0; },
    update(e, dt, d, ang) {
      const p = G.p, spd = e.phase === 2 ? 1.35 : 1;
      e.superArmor = true; e.kx = e.ky = 0; e.z = 6 + Math.sin(e.anim * 1.2) * 2;
      e.hand += dt * 0.5 * spd; e.handM += dt * 3 * spd;
      if (e.state === 'intro') {
        // it ticks louder and louder, then appears with a chime
        e.t -= dt;
        if (Math.floor(e.t * 4) !== Math.floor((e.t + dt) * 4)) { A.click(); if (e.t < 2) shake(0.15); }
        if (e.under && e.t < 1) { e.under = false; flash(BRASS, 0.2, true); A.bossRoar(); A.victory(); addRing(e.x, e.y - 28, BRASS, 360, 0.6, 3); addRing(e.x, e.y - 28, P.paper, 260, 0.4, 1); }
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
            if (!G.watch) opts.push('stopwatch', 'stopwatch');
            const k = pick(e, opts);
            if (k === 'stopwatch') {
              // a clock face under your feet, its hand sweeping round: be off it when the hand gets back to twelve
              G.watch = { e, x: p.x, y: p.y, r: WATCH_R, t: 0, life: e.phase === 2 ? 1.5 : 1.8 };
              G.banner = { text: 'STOPWATCH', sub: 'GET OFF THE DIAL', t: 0, life: 1.2, c: BRASS };
              A.click(); e.state = 'rec'; e.t = 1.2;
            } else if (k === 'hands') {
              // the hour and minute hands sweep the arena as beams
              const a0 = rnd(TAU);
              G.hbeams.push({ owner: e, oy: 28, x: e.x, y: e.y - 28, a: a0, rot: 0.5 * spd, w: 7, warn: 0.9, t: 0, life: 3.6, len: 0 });
              G.hbeams.push({ owner: e, oy: 28, x: e.x, y: e.y - 28, a: a0 + Math.PI, rot: -1.1 * spd, w: 4, warn: 0.9, t: 0, life: 3.6, len: 0 });
              if (e.phase === 2) G.hbeams.push({ owner: e, oy: 28, x: e.x, y: e.y - 28, a: a0 + Math.PI / 2, rot: 1.7, w: 3, warn: 0.9, t: 0, life: 3.6, len: 0 });
              A.warn(); A.loop('bossbeam', true, 'boss'); G.timers.push({ t: 3.6, fn: () => A.loop('bossbeam', false) });
              e.state = 'rec'; e.t = 3.6;
            } else if (k === 'freeze') {
              // a ring of shots stops dead, then every one turns toward you
              const shots = volley(() => orbRing(e, e.phase === 2 ? 30 : 22, 95, undefined, { oy: 28, c: BRASS, life: 5 }));
              G.timers.push({ t: 0.65, fn: () => { for (const s of shots) { s.vx = s.vy = 0; } A.click(); flash(BRASS, 0.08, false); G.banner = { text: 'TIME STOP', sub: '', t: 0, life: 0.8, c: BRASS }; } });
              G.timers.push({ t: 1.35, fn: () => { for (const s of shots) { if (s.dead) continue; const a = Math.atan2(G.p.y - 6 - s.y, G.p.x - s.x) + rnd(-0.08, 0.08); s.vx = Math.cos(a) * 150; s.vy = Math.sin(a) * 150; } A.zip(); } });
              e.state = 'rec'; e.t = 1.8;
            } else if (k === 'tick') {
              // tick, tock: rings with the gaps shifting each beat
              for (let i = 0; i < 6; i++) G.timers.push({ t: i * 0.32, fn: () => { if (!e.dead && !e.dying) { orbRing(e, 18, 80, (i % 2 ? 0.5 : 0) + e.hand, { oy: 28, c: i % 2 ? P.paper : BRASS, noparry: i % 2 === 0 }); A.click(); } } });
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
              orbRing(e, 24, 85, undefined, { oy: 28, c: BRASS }); A.zip(); flash(BRASS, 0.1, false);
              e.state = 'rec'; e.t = 0.7;
            }
          }
          break;
        }
        case 'rec': e.t -= dt; if (e.t <= 0) { e.state = 'walk'; e.cd = rnd(0.3, 0.7) / spd; } break;
      }
    },
    drawBody(e, x, y) {
      // the hands, drawn live over the dial
      // (drawn 1.25 times finer than its design: 0.83 game pixels to a unit; the dial is at 22, 22 and floats with it)
      const bob = 0.8 * Math.sin(TAU * (e.motion?.phase || 0)) * 0.833, cx = x + 18.3, cy = y + 18.3 + bob;
      line(cx, cy, cx + Math.cos(e.hand) * 4.5, cy + Math.sin(e.hand) * 4.5, '#3a2410', 2);
      line(cx, cy, cx + Math.cos(e.handM) * 6.5, cy + Math.sin(e.handM) * 6.5, '#3a2410', 1);
      disc(cx, cy, 1, BRASS); px(cx, cy, P.paper);
      ring(cx, cy, 11 + Math.sin(G.time * 4), 1, BRASS); glow(cx, cy, BRASS, 24, 0.3);
    },
    bars: introBars,
  },

  // ---------------------------------------------------------------- wave 50: the end
  // NOX, the dark under the pit given a shape: the last boss. It rises out of a pool of night and names itself, and the
  // fight waits while it and the fighter talk. Dead stars fall, the dark reaches across the arena in lines you dash
  // through, rings of night burst out of it with a gap to slip through, it sends shades, and from the second phase it
  // breathes in and drags you toward it while night pours out in a spiral. At two thirds the night falls (the arena goes
  // dark round you); at one third it becomes the last night: faster, and eyes open round the arena and stare beams.
  nox: {
    name: 'NOX', short: 'NOX', sub: 'THE LAST NIGHT', col: NOXC, colD: '#14082a', hp: 8200, r: 29, speed: 40, score: 100000, music: 'boss_nox', end: true,
    death: 'THE NIGHT BREAKS', marks: [0.33, 0.66],
    init(e) { e.state = 'intro'; e.t = 3.2; e.alpha = 0; e.y = Math.max(e.y, B.y0 + 92); },
    update(e, dt, d, ang, dx) {
      const p = G.p, spd = e.awakened ? 1.6 : e.phase === 3 ? 1.45 : e.phase === 2 ? 1.2 : 1;
      e.superArmor = true; e.kx = e.ky = 0; e.z = 6 + Math.sin(e.anim * 1.6) * 3;
      // night drips off it
      if (Math.random() < dt * 8) part(e.x + rnd(-20, 20), e.y - rnd(10, 60), rnd(-6, 6), rnd(10, 30), rnd(0.6, 1.2), Math.random() < 0.6 ? '#2a1450' : NOXC, { drag: 0.5 });
      if (e.state === 'intro') {
        e.t -= dt;
        e.alpha = Math.min(1, Math.max(0, (3.2 - e.t) / 2));
        if (Math.random() < 0.7) part(e.x + rnd(-30, 30), e.y + rnd(-4, 4), rnd(-10, 10), -rnd(20, 80), rnd(0.5, 1), NOXC, { glow: true, keep: true, drag: 1 });
        if (e.t <= 1.2 && !e.met) {
          e.met = true; delete e.alpha;
          flash(NOXC, 0.3, true); A.bossRoar(); shake(1);
          for (let i = 0; i < 3; i++) addRing(e.x, e.y - 30, i % 2 ? P.paper : NOXC, 300 + i * 90, 0.6, 3);
          say(noxLines(G.char), { lore: true });
        }
        if (e.t <= 0) { e.state = 'walk'; e.cd = 0.6; }
        return;
      }
      if (e.phase === 1 && e.hp < e.maxHp * 0.66) { e.phase = 2; e.state = 'rec'; e.t = 1; phaseBanner('NIGHT FALLS', NOXC); A.bossRoar(); shake(0.8); say(TALK.noxNight); }
      if (e.phase === 2 && e.hp < e.maxHp * 0.33) { e.phase = 3; e.state = 'rec'; e.t = 1.2; phaseBanner('THE LAST NIGHT', P.paper); A.bossRoar(); A.ultStart(); shake(1); flash(NOXC, 0.35, true); say(TALK.noxLast); }
      if (e.phase >= 2) G.dark = Math.min(e.phase === 3 ? 0.8 : 0.55, G.dark + dt * 0.5);
      switch (e.state) {
        case 'walk': {
          // it drifts at a distance from you, circling
          const radial = d > 140 ? 1 : d < 100 ? -1 : 0;
          e.vx = (Math.cos(ang) * radial + Math.cos(ang + Math.PI / 2) * 0.6) * e.speed * spd; e.vy = (Math.sin(ang) * radial + Math.sin(ang + Math.PI / 2) * 0.6) * e.speed * spd;
          e.face = dx < 0 ? -1 : 1; e.cd -= dt;
          if (e.cd > 0) break;
          const opts = ['stars', 'reach', 'ring', 'shades'];
          if (e.phase >= 2) opts.push('pull', 'reach', 'stars');
          if (e.phase >= 3) opts.push('eyes', 'eyes');
          const k = pick(e, opts);
          if (k === 'stars') {
            // dead stars fall out of the dark: on you first, then all round you
            for (let i = 0; i < (e.phase >= 2 ? 14 : 10); i++) { const onYou = i < 2; G.strikes.push({ x: clamp(p.x + (onYou ? 0 : rnd(-100, 100)), B.x0 + 8, B.x1 - 8), y: clamp(p.y + (onYou ? 0 : rnd(-70, 70)), B.y0 + 8, B.y1 - 4), t: -i * 0.12, delay: 0.9, R: 20, dmg: e.awakened ? 6 : 4, friendly: false, kind: 'meteor', c: NOXC }); }
            G.banner = { text: 'DEAD STARS', sub: '', t: 0, life: 1, c: NOXC }; A.meteorFall(); e.state = 'rec'; e.t = 1.5;
          } else if (k === 'reach') {
            // the dark reaches across the arena in lines: dash through them
            for (let i = 0; i < (e.phase >= 2 ? 7 : 5); i++) { const a = rnd(TAU), cx = p.x + (i < 2 ? 0 : rnd(-80, 80)), cy = p.y - 5 + (i < 2 ? 0 : rnd(-55, 55)); G.hlines.push({ x0: cx - Math.cos(a) * 160, y0: cy - Math.sin(a) * 160, x1: cx + Math.cos(a) * 160, y1: cy + Math.sin(a) * 160, t: -i * 0.12, pend: 0.95, dmg: e.awakened ? 5 : 3, done: false, c: NOXC, c0: '#2a0e4a' }); }
            G.banner = { text: 'THE DARK REACHES', sub: 'DASH THROUGH IT', t: 0, life: 1.2, c: NOXC }; A.warn(); A.rift(); e.state = 'rec'; e.t = 1.6;
          } else if (k === 'ring') {
            // rings of night, each with a gap to slip through
            for (let i = 0; i < 3; i++) G.timers.push({ t: i * 0.45, fn: () => { if (!e.dead && !e.dying) orbRing(e, 30, 75 + i * 12, Math.atan2(G.p.y - e.y, G.p.x - e.x) + rnd(-1, 1), { oy: 30, c: NOXC, noparry: i === 1 }); } });
            e.state = 'rec'; e.t = 1.6;
          } else if (k === 'shades') {
            for (let i = 0; i < (e.phase >= 2 ? 4 : 3); i++) { const a = rnd(TAU); spawnEnemy('shade', clamp(e.x + Math.cos(a) * 50, B.x0 + 10, B.x1 - 10), clamp(e.y + Math.sin(a) * 40, B.y0 + 10, B.y1 - 4)); }
            G.banner = { text: 'WHAT IT SWALLOWED', sub: '', t: 0, life: 1, c: NOXC }; A.sigil(); e.state = 'rec'; e.t = 0.9;
          } else if (k === 'pull') {
            // it breathes in: you're dragged toward it while night pours out of it in a spiral
            e.state = 'pull'; e.t = 2.4; e.fireT = 0.3; e.spin = rnd(TAU);
            G.banner = { text: 'IT BREATHES IN', sub: 'RUN', t: 0, life: 1.2, c: NOXC }; A.warn();
          } else {
            // eyes open in the four corners of the dark and stare beams that sweep the arena
            const dir = Math.random() < 0.5 ? 1 : -1;
            for (const [ex, ey] of [[B.x0 + 26, B.y0 + 26], [B.x1 - 26, B.y0 + 26], [B.x0 + 26, B.y1 - 20], [B.x1 - 26, B.y1 - 20]]) {
              G.hbeams.push({ x: ex, y: ey, a: Math.atan2(p.y - ey, p.x - ex) - dir * 0.9, rot: dir * 0.5, w: 5, warn: 0.9, t: 0, life: 3.2, len: 0, eye: true });
            }
            G.banner = { text: 'IT OPENS ITS EYES', sub: '', t: 0, life: 1.2, c: P.paper }; A.warn(); e.state = 'rec'; e.t = 2.2;
          }
          break;
        }
        case 'pull': {
          e.t -= dt; e.fireT -= dt; e.vx = e.vy = 0;
          const dd = Math.max(1, hyp(e.x - p.x, e.y - p.y)), pull = 46 * spd * dt;
          if (dd > e.r + 8 && p.state !== 'dead' && p.state !== 'dash') { p.x = clamp(p.x + ((e.x - p.x) / dd) * pull, B.x0 + 4, B.x1 - 4); p.y = clamp(p.y + ((e.y - p.y) / dd) * pull, B.y0 + 4, B.y1 - 2); }
          if (Math.random() < 0.6) { const a = rnd(TAU), r = rnd(60, 110); part(e.x + Math.cos(a) * r, e.y - 30 + Math.sin(a) * r * 0.7, -Math.cos(a) * r * 1.6, -Math.sin(a) * r * 1.1, 0.5, NOXC, { drag: 0.5 }); }
          if (e.fireT <= 0) { e.fireT = 0.14; for (let j = 0; j < 2; j++) fire(e.x, e.y - 30, e.spin + j * Math.PI, 70, { c: NOXC }); e.spin += 0.32; A.shoot(); }
          if (e.t <= 0) { e.state = 'rec'; e.t = 0.6; }
          break;
        }
        case 'rec': e.t -= dt; if (e.t <= 0) { e.state = 'walk'; e.cd = rnd(0.35, 0.7) / spd; } break;
      }
    },
    drawBody(e, x, y, s) {
      // two eyes burning in the hood, a crown of dead stars glittering over it (its design is drawn 2.4 times finer:
      // 1.6 game pixels to each unit of the design in tools/bosses_art.py)
      if (e.awakened) { glow(e.x, y + s.h * 0.50, '#ffaa7b', 12 + Math.sin(G.t*4)*2, 0.62); return; }
      const u = 2.4, gx = (ax) => x + (e.face < 0 ? s.w - ax * u : ax * u);
      glow(gx(18.5), y + 13 * u, NOXC, 5 + Math.sin(G.time * 6), 0.6); glow(gx(25.5), y + 13 * u, NOXC, 5, 0.5);
      for (let i = 0; i < 3; i++) { const a = G.time * 0.8 + (i * TAU) / 3; px(gx(22 + Math.cos(a) * 9), y + (8 + Math.sin(a) * 3) * u, '#ece8f4'); }
      if (e.state === 'pull') { ctx.globalAlpha = 0.3; ring(x + s.w / 2, y + 26 * u, 30 + (G.time * 60) % 40, 1, NOXC); ctx.globalAlpha = 1; }
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
