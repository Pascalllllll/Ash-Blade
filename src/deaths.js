// Signature deaths and kills. Every fighter dies their own way (a short scene played in real time,
// so the death slow-motion doesn't drag it out), and every fighter kills their own way.
import { ctx, P, rect, px, line, disc, glow, textO } from './gfx.js?v=52';
import { A } from './audio.js?v=52';
import { G, TAU, rnd, clamp, part, bleed, splat, dust, sparks, scorch, addRing, addText, glitch, flash, shake, heroSet, sprFor } from './world.js?v=52';

// ---------- sprite pixels, for effects that take a body apart pixel by pixel ----------
const pxCache = new WeakMap();
function pixels(s, flip) {
  const img = flip ? s.f : s.n;
  let a = pxCache.get(img);
  if (!a) {
    const d = img.getContext('2d').getImageData(0, 0, s.w, s.h).data;
    a = [];
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) { const i = (y * s.w + x) * 4; if (d[i + 3] > 0) a.push([x, y, `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`]); }
    pxCache.set(img, a);
  }
  return a;
}
// fn(x, y, color, row) for every pixel (or every `step`th one) of a sprite drawn with its top-left at x0, y0
function eachPixel(s, flip, x0, y0, fn, step = 1, rowFrom = 0, rowTo = 999) {
  const a = pixels(s, flip);
  for (let i = 0; i < a.length; i += step) { const [x, y, c] = a[i]; if (y >= rowFrom && y < rowTo) fn(x0 + x, y0 + y, c, y); }
}

// ---------- signature kills: called for every non-boss kill; true means "the body is handled, no gibs or blood" ----------
const PETAL = ['#ffb7d5', '#ff8fb8', '#ffffff'];
export const KILLS = {
  // Kael: the cut sets them alight; embers and ash rise off the body
  BLADE(e) {
    for (let i = 0; i < 9; i++) part(e.x + rnd(-5, 5), e.y - rnd(0, e.r * 2), rnd(-12, 12), -rnd(20, 55), rnd(0.5, 1), Math.random() < 0.6 ? P.ember : P.ember2, { drag: 1, glow: true });
    for (let i = 0; i < 4; i++) part(e.x + rnd(-4, 4), e.y - rnd(2, 8), rnd(-6, 6), -rnd(8, 20), rnd(0.8, 1.4), '#5a4a4a', { drag: 0.8 });
    scorch(e.x, e.y, 5);
  },
  // Vega: a head shot; blood jets up, a puff of gun smoke, a spent casing
  GUNNER(e) {
    bleed(e.x, e.y - e.r * 2, -Math.PI / 2 + rnd(-0.3, 0.3), 9, e.def.col, e.def.colD, 0.9);
    for (let i = 0; i < 3; i++) part(e.x + rnd(-3, 3), e.y - e.r * 2, rnd(-8, 8), -rnd(6, 16), rnd(0.5, 0.9), '#8a8496', { drag: 2 });
    part(e.x, e.y - e.r, rnd(-40, 40), 0, 1.2, P.gold2, { z: 6, vz: rnd(50, 90), g: 300, drag: 1.5 });
  },
  // Morrow: they unravel into motes of arcane light that drift upward
  WIZARD(e) {
    const s = sprFor(e);
    eachPixel(s, e.face < 0, e.x - s.w / 2, e.y - s.h + 1, (x, y) => part(x, y, rnd(-15, 15), -rnd(15, 55), rnd(0.4, 0.9), Math.random() < 0.5 ? '#b48cff' : Math.random() < 0.5 ? '#62efff' : P.paper, { drag: 1.5 }), 2);
    addRing(e.x, e.y - e.r, '#b48cff', 120, 0.2, 1);
    return true;
  },
  // Rin: a burst of petals, and the cut line hangs in the air a moment
  NINJA(e, o, dir) {
    for (let i = 0; i < 12; i++) { const a = rnd(TAU), v = rnd(30, 120); part(e.x, e.y - e.r, Math.cos(a) * v, Math.sin(a) * v - 20, rnd(0.6, 1.1), PETAL[i % 3], { drag: 3 }); }
    const a = dir + Math.PI / 2;
    for (let k = -5; k <= 5; k++) part(e.x + Math.cos(a) * k * 2, e.y - e.r + Math.sin(a) * k * 2, 0, 0, 0.18, P.paper, { drag: 0 });
  },
  // Rivet: they come apart into bolts, nuts and springs
  MECHANIC(e) {
    for (let i = 0; i < 7; i++) { const a = rnd(TAU), v = rnd(40, 120); part(e.x, e.y - e.r, Math.cos(a) * v, Math.sin(a) * v * 0.6, rnd(0.8, 1.4), Math.random() < 0.5 ? '#8b98ab' : Math.random() < 0.5 ? P.gold : '#5d6878', { z: 4, vz: rnd(40, 110), g: 320, drag: 1.5, s: Math.random() < 0.4 ? 2 : 1 }); }
  },
  // Grom: flattened; a wide splat and a ring of dust
  TANK(e) {
    splat(e.x, e.y, e.r + 9, e.def.col, e.def.colD);
    dust(e.x, e.y, 12, 80);
    addRing(e.x, e.y, P.stone2, 140, 0.25, 2);
  },
  // Unit-7: the laser disintegrates them; white-hot pixels rise and go out as ash
  ROBOT(e) {
    const s = sprFor(e);
    eachPixel(s, e.face < 0, e.x - s.w / 2, e.y - s.h + 1, (x, y) => part(x, y, rnd(-10, 10), -rnd(10, 40), rnd(0.3, 0.8), Math.random() < 0.4 ? P.paper : Math.random() < 0.6 ? P.ember2 : '#4a3a3a', { drag: 2 }), 2);
    scorch(e.x, e.y, 6);
    return true;
  },
  // The Dev: deleted; the sprite breaks into green and magenta glitch pixels, now and then a 404
  DEV(e) {
    const s = sprFor(e);
    eachPixel(s, e.face < 0, e.x - s.w / 2, e.y - s.h + 1, (x, y) => part(x + rnd(-2, 2), y, rnd(-60, 60), rnd(-5, 5), rnd(0.2, 0.5), Math.random() < 0.6 ? '#39ff6a' : Math.random() < 0.5 ? '#ff4fa8' : P.paper, { drag: 6 }), 2);
    glitch(e.x, e.y - e.r, 16, 10, 0.2, 6);
    if (Math.random() < 0.12) addText(e.x, e.y - e.r * 2 - 6, '404', '#39ff6a');
    return true;
  },
};

// ---------- signature deaths ----------
const at = (d, s) => d.prev < s && d.t >= s;
const ease = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : 1 - Math.pow(1 - k, 3));
const fall = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k);
// the fighter's body: rot pivots at the feet, top/bottom keep only some sprite rows, z lifts it
function body(d, o = {}) {
  const s = d.spr, img = o.tint ? s.tint(o.tint, d.flip) : d.flip ? s.f : s.n;
  const top = clamp(Math.round(o.top || 0), 0, s.h), bot = clamp(Math.round(o.bottom ?? s.h), top, s.h);
  if (bot <= top) return;
  ctx.save();
  ctx.globalAlpha = o.alpha ?? 1;
  ctx.translate(Math.round(d.x + (o.dx || 0)), Math.round(d.y + 1 - (o.z || 0)));
  if (o.rot) ctx.rotate(o.rot);
  if (o.sx !== undefined || o.sy !== undefined) ctx.scale(o.sx ?? 1, o.sy ?? 1);
  ctx.drawImage(img, 0, top, s.w, bot - top, -Math.round(s.w / 2), -s.h + top, s.w, bot - top);
  ctx.restore();
}
const back = (d) => (d.flip ? 1 : -1); // the direction behind the fighter
const fwd = (d) => -back(d);

const DEATHS = {
  // Kael drops to one knee, plants his sword, and crumbles to ash from the head down. The sword stays.
  BLADE: {
    line: 'THE LAST EMBER GOES OUT', col: P.ember,
    update(d, dt) {
      if (at(d, 0.45)) { A.wall(); dust(d.x, d.y, 10, 40); sparks(d.x + fwd(d) * 7, d.y, -Math.PI / 2, 8, 0.6, P.ember2, 120); }
      if (d.t > 0.9 && d.t < 2.4) {
        d.crumble = (d.t - 0.9) / 1.4;
        const y = d.y + 1 - d.spr.h * 0.8 + d.spr.h * 0.8 * d.crumble;
        if (Math.random() < dt * 70) part(d.x + rnd(-5, 5), y, 12 + rnd(-8, 8), -rnd(8, 35), rnd(0.8, 1.6), Math.random() < 0.45 ? P.ember : Math.random() < 0.5 ? '#6a5a5a' : '#3a3030', { drag: 0.8, glow: Math.random() < 0.3 });
      }
      if (at(d, 0.9)) A.smoke();
    },
    draw(d) {
      const kneel = d.t > 0.45, top = (d.crumble || 0) * d.spr.h;
      if (d.t < 2.35) body(d, { top, sy: kneel ? 0.8 : 1, dx: d.t < 0.45 ? Math.sin(d.t * 50) : 0, tint: d.t < 0.12 ? P.paper : null });
      if (kneel) {
        // the planted sword, a dying flame on the pommel
        const sx = d.x + fwd(d) * 7;
        line(sx, d.y - 12, sx, d.y + 2, P.bone); px(sx, d.y + 2, P.dust);
        line(sx - 2, d.y - 9, sx + 2, d.y - 9, P.ember);
        if (d.t > 2.2) { const f = Math.max(0, 1 - (d.t - 2.2) / 1.5); if (Math.random() < f) px(sx, d.y - 13 - Math.floor(rnd(0, 3)), P.ember2); glow(sx, d.y - 13, P.ember, 6, 0.4 * f); }
      }
    },
  },

  // Vega spins, falls flat on her back, and her revolver, dropped beside her, fires one last shot into the sky.
  GUNNER: {
    line: 'ONE BULLET SHORT', col: P.gold,
    update(d, dt) {
      if (d.t < 0.5 && Math.floor(d.t * 12) !== Math.floor(d.prev * 12)) d.flip = !d.flip;
      if (at(d, 0.5)) d.flipFinal = d.flip;
      if (at(d, 0.9)) {
        A.wall(); dust(d.x, d.y, 12, 50); shake(0.3);
        d.gun = { x: d.x + fwd(d) * 9, y: d.y + 3, z: 8, vz: 50 };
      }
      const g = d.gun;
      if (g) { g.vz -= 300 * dt; g.z = Math.max(0, g.z + g.vz * dt); if (g.z === 0) g.vz = Math.abs(g.vz) > 30 ? -g.vz * 0.3 : 0; }
      if (at(d, 1.7) && g) {
        A.gun(); A.click(); shake(0.2);
        for (let i = 0; i < 8; i++) part(g.x + 3, g.y - 2, rnd(-30, 30), -rnd(40, 120), rnd(0.1, 0.25), Math.random() < 0.5 ? P.paper : P.gold, { drag: 6, glow: true });
        d.shot = 0.12;
      }
      if (d.shot > 0) d.shot -= dt;
      // the pool spreads under her
      if (d.t > 1 && d.t < 2.6 && Math.floor(d.t * 4) !== Math.floor(d.prev * 4)) splat(d.x + back(d) * 8, d.y, 4 + (d.t - 1) * 5, P.blood, P.bloodD);
    },
    draw(d) {
      const k = clamp((d.t - 0.5) / 0.4, 0, 1), rot = back(d) * fall(k) * Math.PI / 2;
      body(d, { rot, dx: d.t < 0.5 ? back(d) * d.t * 8 : back(d) * 4, tint: d.t < 0.1 ? P.paper : null });
      const g = d.gun;
      if (g) {
        const y = g.y - g.z;
        line(g.x, y, g.x + 5, y, P.dust); line(g.x, y + 1, g.x + 1, y + 2, '#5a3a24');
        if (d.shot > 0) { line(g.x + 5, y - 1, g.x + 6, y - 60, P.paper); glow(g.x + 5, y, P.gold, 10, 0.8); }
      }
    },
  },

  // Morrow's last spell turns on him: he rises, the light pulls inward, he implodes. His hat falls where he stood.
  WIZARD: {
    line: 'THE SPELL WAS NEVER FINISHED', col: '#b48cff',
    update(d, dt) {
      if (d.t < 0.95) {
        d.z = d.t * 14;
        if (Math.random() < dt * 60) { const a = rnd(TAU), r = rnd(20, 40); part(d.x + Math.cos(a) * r, d.y - 10 - d.z + Math.sin(a) * r, -Math.cos(a) * r * 2.5, -Math.sin(a) * r * 2.5, 0.35, Math.random() < 0.5 ? '#b48cff' : '#62efff', { drag: 0, glow: true }); }
      }
      if (at(d, 0.3) || at(d, 0.6)) { addRing(d.x, d.y - 10 - d.z, '#b48cff', -60, 0.3, 1, 40); A.magic(); }
      if (at(d, 1.2)) {
        flash('#b48cff', 0.25, true); shake(0.8); A.boom(1.2); A.freeze();
        addRing(d.x, d.y - 24, '#b48cff', 360, 0.5, 3); addRing(d.x, d.y - 24, P.paper, 260, 0.4, 1);
        for (let i = 0; i < 60; i++) { const a = rnd(TAU), v = rnd(60, 260); part(d.x, d.y - 24, Math.cos(a) * v, Math.sin(a) * v, rnd(0.3, 0.9), Math.random() < 0.5 ? '#b48cff' : P.paper, { drag: 3, glow: true }); }
        scorch(d.x, d.y, 10);
        d.hat = { z: 20, vz: 0, wob: 0 };
      }
      const h = d.hat;
      if (h) {
        const rest = -(d.spr.h - 7);
        h.vz -= 160 * dt; h.z += h.vz * dt; h.wob += dt;
        if (h.z <= rest) { if (!h.landed) { h.landed = true; A.wall(); dust(d.x, d.y, 6, 30); } h.z = rest; h.vz = 0; }
        if (h.landed && Math.random() < dt * 3) part(d.x + rnd(-2, 2), d.y - 4, 0, -rnd(6, 14), 1, '#6a5a7a', { drag: 0.5 });
      }
    },
    draw(d) {
      if (d.t < 1.2) {
        const k = d.t < 0.95 ? 1 : 1 - (d.t - 0.95) / 0.25;
        glow(d.x, d.y - 10 - d.z, '#b48cff', 10 + d.t * 20, 0.3 + d.t * 0.3);
        body(d, { z: d.z + (1 - k) * 10, sx: k, sy: k, dx: Math.sin(d.t * 60) * d.t, tint: Math.floor(d.t * 20) % 3 === 0 ? '#b48cff' : null });
      }
      if (d.hat) body(d, { bottom: 7, z: d.hat.landed ? d.hat.z : d.hat.z, dx: d.hat.landed ? 0 : Math.sin(d.hat.wob * 6) * 3 });
    },
  },

  // A storm of cherry blossoms rises around Rin and thickens until she fades behind it,
  // then she scatters into petals and the wind carries them away.
  NINJA: {
    line: 'SHE SCATTERS WITH THE BLOSSOMS', col: '#ffb7d5',
    update(d, dt) {
      const cx = d.x, cy = d.y - 8;
      if (at(d, 0.25)) { A.perfect(); addRing(cx, cy, '#ffb7d5', 120, 0.4, 1); }
      // the swirl: petals circle her, faster and thicker as the storm builds, then thin out
      const k = d.t < 1.2 ? clamp((d.t - 0.2) / 1.0, 0, 1) : clamp(1 - (d.t - 1.2) / 1.2, 0, 1);
      if (Math.random() < dt * (10 + k * 180)) {
        const a = rnd(TAU), r = 8 + rnd(0, 16) * (1 - k * 0.3), v = 50 + k * 90;
        part(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.7, -Math.sin(a) * v - 20 * k, Math.cos(a) * v * 0.5 - rnd(10, 35), rnd(0.5, 1.1), PETAL[Math.floor(rnd(3))], { drag: 1.2 });
      }
      if (at(d, 1.2)) {
        // gone: every pixel of her becomes a petal on the wind
        d.gone = true;
        eachPixel(d.spr, d.flip, d.x - d.spr.w / 2, d.y - d.spr.h + 1, (x, y, c) => part(x, y, -rnd(30, 110), -rnd(10, 60), rnd(0.8, 1.8), Math.random() < 0.7 ? PETAL[Math.floor(rnd(3))] : c, { drag: 0.8 }));
        addRing(cx, cy, '#ffb7d5', 260, 0.5, 2); addRing(cx, cy, P.paper, 180, 0.35, 1);
        flash('#ffb7d5', 0.15, false); A.smoke(); A.magic();
      }
      if (d.gone && Math.random() < dt * 25) part(cx + rnd(-30, 30), cy + rnd(-20, 10), -rnd(20, 60), -rnd(5, 25), rnd(1, 2), PETAL[Math.floor(rnd(3))], { drag: 0.5 });
    },
    draw(d) {
      const k = clamp((d.t - 0.2) / 1.0, 0, 1);
      if (!d.gone) {
        glow(d.x, d.y - 8, '#ffb7d5', 8 + k * 18, 0.15 + k * 0.35);
        body(d, { dx: d.t < 0.25 ? Math.sin(d.t * 50) : 0, alpha: 1 - k * 0.75, tint: d.t < 0.08 ? P.paper : k > 0.6 && Math.floor(d.t * 18) % 2 ? '#ffb7d5' : null });
      }
    },
  },

  // Rivet's suit overloads: sparks, steam, faster and faster beeps, then the blast. Her goggles bounce away.
  MECHANIC: {
    line: 'WARRANTY VOID', col: '#ff9a3c',
    update(d, dt) {
      if (d.t < 1.1) {
        const k = d.t / 1.1;
        if (Math.random() < dt * (10 + k * 40)) sparks(d.x + rnd(-5, 5), d.y - rnd(4, 14), rnd(TAU), 3, 0.6, P.ember2, 120);
        if (Math.random() < dt * 20) part(d.x + rnd(-4, 4), d.y - rnd(6, 16), rnd(-10, 10), -rnd(20, 40), rnd(0.4, 0.8), '#c8c8d0', { drag: 1 });
        d.beep = (d.beep ?? 0) - dt;
        if (d.beep <= 0) { d.beep = 0.24 - k * 0.19; A.fuse(); }
      }
      if (at(d, 1.1)) {
        d.gone = true;
        eachPixel(d.spr, d.flip, d.x - d.spr.w / 2, d.y - d.spr.h + 1, (x, y, c) => { const a = Math.atan2(y - (d.y - 8), x - d.x) + rnd(-0.4, 0.4), v = rnd(80, 240); part(x, y, Math.cos(a) * v, Math.sin(a) * v, rnd(0.5, 1.2), c, { z: 4, vz: rnd(30, 120), g: 320, drag: 2 }); });
        for (let i = 0; i < 14; i++) { const a = rnd(TAU), v = rnd(60, 200); part(d.x, d.y - 8, Math.cos(a) * v, Math.sin(a) * v, rnd(0.8, 1.5), Math.random() < 0.5 ? P.gold : '#8b98ab', { z: 6, vz: rnd(60, 160), g: 320, drag: 1.5, s: 2 }); }
        for (let i = 0; i < 40; i++) { const a = rnd(TAU), v = rnd(60, 220); part(d.x, d.y - 8, Math.cos(a) * v, Math.sin(a) * v, rnd(0.2, 0.5), Math.random() < 0.5 ? P.ember : P.ember2, { drag: 4, glow: true }); }
        addRing(d.x, d.y - 8, P.ember, 320, 0.4, 3); flash(P.ember, 0.25, true); shake(1); A.boom(1.6); scorch(d.x, d.y, 16);
        d.gog = { x: d.x, z: 12, vx: fwd(d) * 60, vz: 130, bounces: 0 };
      }
      const g = d.gog;
      if (g) {
        g.vz -= 320 * dt; g.z += g.vz * dt; g.x += g.vx * dt;
        if (g.z <= 0) { g.z = 0; if (g.bounces++ < 3) { g.vz = Math.abs(g.vz) * 0.45; A.click(); } else g.vz = 0; g.vx *= 0.6; }
      }
      if (d.gone && Math.random() < dt * 6) part(d.x + rnd(-6, 6), d.y - 2, 0, -rnd(10, 20), rnd(1, 1.6), '#4a4450', { drag: 0.5 });
    },
    draw(d) {
      if (!d.gone) { const k = d.t / 1.1; body(d, { dx: Math.sin(d.t * 70) * k * 2, tint: Math.floor(d.t * (8 + k * 30)) % 2 ? P.ember : null }); glow(d.x, d.y - 8, P.ember, 8 + k * 14, 0.2 + k * 0.4); }
      if (d.gog) { const y = d.y - d.gog.z; rect(d.gog.x - 2, y - 1, 2, 2, '#ff9a3c'); rect(d.gog.x + 1, y - 1, 2, 2, '#ff9a3c'); px(d.gog.x, y - 1, '#2a2f3a'); }
    },
  },

  // Grom's armor cracks plate by plate. He tips forward like a falling wall, the ground shakes, and his helmet rolls away.
  TANK: {
    line: 'THE WALL HAS FALLEN', col: '#8b98ab',
    update(d, dt) {
      for (const s of [0.2, 0.4, 0.6]) if (at(d, s)) { A.shieldHit(); A.wall(); for (let i = 0; i < 6; i++) part(d.x + rnd(-6, 6), d.y - rnd(4, 16), rnd(-60, 60), -rnd(10, 40), rnd(0.6, 1), '#8b98ab', { z: 6, vz: rnd(20, 60), g: 300, drag: 1.5, s: 2 }); d.cracks = (d.cracks || 0) + 1; }
      if (at(d, 1.45)) {
        shake(1); A.boom(1.4); A.wall(); flash(P.dust, 0.12, false);
        dust(d.x + fwd(d) * 10, d.y, 30, 110); addRing(d.x + fwd(d) * 10, d.y, P.stone2, 260, 0.4, 3);
        splat(d.x + fwd(d) * 9, d.y, 10, P.blood, P.bloodD);
        d.helm = { x: d.x + fwd(d) * 16, z: 3, vx: fwd(d) * 55, vz: 50, rot: 0 };
      }
      const h = d.helm;
      if (h) { h.vz -= 300 * dt; h.z = Math.max(0, h.z + h.vz * dt); if (h.z === 0) h.vz = Math.abs(h.vz) > 25 ? -h.vz * 0.35 : 0; h.x += h.vx * dt; h.vx *= Math.exp(-1.2 * dt); h.rot += (h.vx / 4) * dt; }
    },
    draw(d) {
      const k = clamp((d.t - 0.85) / 0.6, 0, 1);
      body(d, { rot: fwd(d) * fall(k) * Math.PI / 2, top: d.helm ? 5 : 0, dx: d.t < 0.85 ? back(d) * d.t * 4 : back(d) * 3.4, tint: d.t < 0.1 ? P.paper : null });
      if (k === 0 && d.cracks) {
        const x = d.x + back(d) * 3.4, y = d.y - 10;
        line(x - 3, y - 3, x, y, P.paper); if (d.cracks > 1) line(x + 1, y - 4, x + 4, y + 1, P.paper); if (d.cracks > 2) line(x - 2, y + 2, x + 2, y + 4, P.paper);
      }
      const h = d.helm;
      if (h) { const y = d.y - 3 - h.z; disc(h.x, y, 3, '#5d6878'); line(h.x + Math.cos(h.rot) * 3, y + Math.sin(h.rot) * 3, h.x - Math.cos(h.rot) * 3, y - Math.sin(h.rot) * 3, '#8b98ab'); px(h.x + Math.cos(h.rot + 1.6) * 3, y + Math.sin(h.rot + 1.6) * 3, P.bone); }
    },
  },

  // Unit-7 shorts out: sparks and ERR, then the head pops off on a spring, the eye fades from red to dark, and smoke rises from the neck.
  ROBOT: {
    line: 'SHUTDOWN COMPLETE', col: '#ff3b3b',
    update(d, dt) {
      if (d.t < 1.2) {
        if (Math.floor(d.t * 7) !== Math.floor(d.prev * 7)) { sparks(d.x + rnd(-5, 5), d.y - rnd(6, 16), rnd(TAU), 8, 1, '#62efff', 160); A.zip(); }
        if (at(d, 0.3) || at(d, 0.75)) addText(d.x + rnd(-8, 8), d.y - 26, 'ERR', '#ff3b3b');
      }
      if (at(d, 1.2)) { d.head = { z: 0, vz: 150 }; A.boom(0.5); A.overheat(); sparks(d.x, d.y - 9, -Math.PI / 2, 14, 0.8, P.ember2, 180); }
      const h = d.head;
      if (h) {
        // a damped spring holds the head above the neck
        h.vz += (-90 * h.z - 3 * h.vz) * dt; h.z = Math.max(-2, h.z + h.vz * dt);
        if (Math.random() < dt * 10) part(d.x + rnd(-2, 2), d.y - 8, rnd(-4, 4), -rnd(10, 25), rnd(1, 1.8), '#4a4450', { drag: 0.4 });
      }
    },
    draw(d) {
      const neck = 7;
      if (!d.head) { body(d, { dx: Math.sin(d.t * 80) * 0.8, tint: Math.floor(d.t * 14) % 3 === 0 ? '#62efff' : null }); return; }
      const slump = d.t > 1.6 ? 0.88 : 1, hz = d.head.z * 6 + 4, eye = clamp(1 - (d.t - 1.4) / 1.2, 0, 1);
      body(d, { top: neck, sy: slump });
      // the spring: a zigzag from the neck up to the head
      const y0 = d.y + 1 - (d.spr.h - neck) * slump, y1 = y0 - hz;
      for (let i = 0; i < 5; i++) line(d.x + (i % 2 ? 2 : -2), y0 - (hz * i) / 5, d.x + (i % 2 ? -2 : 2), y0 - (hz * (i + 1)) / 5, '#8b98ab');
      body(d, { bottom: neck, z: (d.spr.h - neck) * (1 - slump) + hz - 1, tint: eye < 0.3 ? '#2a2f3a' : null });
      if (eye > 0) glow(d.x + fwd(d) * 2, y1 - 4, '#ff3b3b', 6, 0.6 * eye);
    },
  },

  // The Dev: the screen tears, a fatal error box pops up, he is deleted line by line from the top down,
  // and his empty wheelchair rolls slowly away.
  DEV: {
    line: 'PROCESS TERMINATED', col: '#39ff6a',
    update(d, dt) {
      if (d.t < 0.8 && Math.random() < dt * 20) glitch(d.x + rnd(-20, 20), d.y - 10 + rnd(-14, 14), 14, 4, 0.2, 5);
      if (at(d, 0.1)) A.zap();
      if (at(d, 0.8)) { d.bsod = true; A.click(); A.deny(); }
      if (at(d, 1.6)) d.bsod = false;
      const chair = d.spr.h - 11;
      if (d.t > 1.0 && d.t < 2.2) {
        d.del = (d.t - 1.0) / 1.2;
        const row = Math.floor(chair * d.del), prev = Math.floor(chair * Math.max(0, (d.prev - 1.0) / 1.2));
        if (row > prev) { eachPixel(d.spr, d.flip, d.x - d.spr.w / 2, d.y - d.spr.h + 1, (x, y) => part(x, y, rnd(-8, 8), rnd(20, 60), rnd(0.4, 0.9), Math.random() < 0.7 ? '#39ff6a' : '#ff4fa8', { drag: 0.5 }), 1, prev, row); A.click(); }
      }
      if (d.t > 2.3) d.roll = (d.roll || 0) + back(d) * 10 * dt;
    },
    draw(d) {
      const chair = d.spr.h - 11, top = d.t > 1 ? chair * (d.del ?? 1) : 0;
      if (d.t < 0.8) for (const [ox, c] of [[-2, '#ff4fa8'], [2, '#39ff6a']]) body(d, { dx: ox, tint: c, alpha: 0.4 });
      body(d, { top, dx: d.roll || 0, rot: d.roll ? d.roll * 0.02 : 0 });
      if (d.bsod) {
        const x = d.x - 34, y = d.y - d.spr.h - 30;
        rect(x - 1, y - 1, 70, 24, P.ink0); rect(x, y, 68, 22, '#1a3ad8');
        textO(':(  FATAL ERROR', x + 4, y + 4, P.paper, 1, 'l', '#1a3ad8');
        textO('0XDEADDEV', x + 4, y + 13, '#9fd3ff', 1, 'l', '#1a3ad8');
      }
    },
  },
};

export function startDeath(p) {
  const def = DEATHS[G.char] || DEATHS.BLADE;
  G.deathFx = { def, t: 0, prev: 0, x: p.x, y: p.y, z: 0, flip: Math.cos(p.aim) < 0, spr: heroSet().idle };
  G.deathLine = def.line;
}
export function updateDeath(dt) {
  const d = G.deathFx;
  if (!d) return;
  d.prev = d.t; d.t += dt;
  d.def.update(d, dt);
}
export function drawDeath() {
  const d = G.deathFx;
  if (!d) return;
  d.def.draw(d);
  // the epitaph fades in under the body
  const k = clamp((d.t - 1.6) / 0.6, 0, 1);
  if (k > 0) { ctx.globalAlpha = k; textO(d.def.line, d.x, d.y + 8, d.def.col, 1, 'c'); ctx.globalAlpha = 1; }
}
