// Signature deaths and kills. Every fighter dies their own way (a short scene played in real time,
// so the death slow-motion doesn't drag it out), and every fighter kills their own way.
import { ctx, P, rect, line, glow, textO } from './gfx.js?v=165';
import { A } from './audio.js?v=165';
import { G, TAU, rnd, clamp, part, bleed, splat, dust, sparks, scorch, addRing, addText, glitch, flash, shake, heroSet, sprFor } from './world.js?v=165';

// ---------- sprite pixels, for effects that take a body apart pixel by pixel ----------
const pxCache = new WeakMap();
function pixels(s, flip) {
  const img = flip ? s.f : s.n;
  let a = pxCache.get(img);
  if (!a) {
    // one entry per game pixel (a density 2 sprite is sampled every other pixel)
    const k = s.k || 1, iw = img.width, d = img.getContext('2d').getImageData(0, 0, iw, img.height).data;
    a = [];
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) { const i = (y * k * iw + x * k) * 4; if (d[i + 3] > 0) a.push([x, y, `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`]); }
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
  ctx.drawImage(img, 0, top * s.k, s.w * s.k, (bot - top) * s.k, -Math.round(s.w / 2), -s.h + top, s.w, bot - top);
  ctx.restore();
}
const back = (d) => (d.flip ? 1 : -1); // the direction behind the fighter
const fwd = (d) => -back(d);

// Every fighter's death is the six drawn death frames from their sprite sheet (a hit, a stagger, the fall, lying
// still, and the last frame where the body is gone), with the fighter's own effects timed to those frames.
const STEP = 0.16;                                            // seconds per drawn frame
const LAND = 4 * STEP;                                       // the frame where the body hits the ground
const GONE = 7 * STEP;                                       // the last frame: the body turns to dust, ash, scrap
function frameAt(d) { const f = d.frames; return f[Math.min(f.length - 1, Math.floor(d.t / STEP))]; }
// the drawn body: the current frame, a white flash on the killing blow, and the last frame fading away
function sheetBody(d, o = {}) {
  const fade = d.t > GONE + 0.6 ? clamp(1 - (d.t - GONE - 0.6) / 0.8, 0, 1) : 1;
  if (fade > 0) body(d, { tint: d.t < 0.08 ? P.paper : o.tint || null, alpha: fade * (o.alpha ?? 1), dx: o.dx || 0 });
}
const center = (d) => [d.x, d.y - d.spr.h * 0.45];

const DEATHS = {
  // Kael falls; embers burst where he lands and rise off him, and as his last frame turns to dust they blow away as ash.
  BLADE: {
    line: 'THE LAST EMBER GOES OUT', col: P.ember,
    update(d, dt) {
      d.spr = frameAt(d);
      if (at(d, LAND)) { A.wall(); dust(d.x, d.y, 10, 40); sparks(d.x, d.y - 3, -Math.PI / 2, 14, 0.7, P.ember2, 140); }
      if (d.t > LAND && d.t < GONE + 1.2 && Math.random() < dt * 45) {
        const k = d.t > GONE ? 1 : 0.4;
        part(d.x + rnd(-8, 8), d.y - rnd(0, 8), 14 * k + rnd(-8, 8), -rnd(10, 40), rnd(0.8, 1.6), Math.random() < 0.45 ? P.ember : Math.random() < 0.5 ? '#6a5a5a' : '#3a3030', { drag: 0.8, glow: Math.random() < 0.3 });
      }
      if (at(d, GONE)) A.smoke();
    },
    draw(d) { glow(d.x, d.y - 4, P.ember, 10, d.t > LAND ? 0.25 : 0); sheetBody(d); },
  },

  // Vega falls in her drawn frames; her revolver drops beside her and fires one last shot into the sky.
  GUNNER: {
    line: 'ONE BULLET SHORT', col: P.gold,
    update(d, dt) {
      d.spr = frameAt(d);
      if (at(d, LAND)) {
        A.wall(); dust(d.x, d.y, 12, 50); shake(0.3);
        d.gun = { x: d.x + fwd(d) * 11, y: d.y + 2, z: 10, vz: 60 };
      }
      const g = d.gun;
      if (g) { g.vz -= 300 * dt; g.z = Math.max(0, g.z + g.vz * dt); if (g.z === 0) g.vz = Math.abs(g.vz) > 30 ? -g.vz * 0.3 : 0; }
      if (at(d, LAND + 1.0) && g) {
        A.gun(); A.click(); shake(0.2);
        for (let i = 0; i < 8; i++) part(g.x + 3, g.y - 2, rnd(-30, 30), -rnd(40, 120), rnd(0.1, 0.25), Math.random() < 0.5 ? P.paper : P.gold, { drag: 6, glow: true });
        d.shot = 0.12;
      }
      if (d.shot > 0) d.shot -= dt;
    },
    draw(d) {
      sheetBody(d);
      const g = d.gun;
      if (g) {
        const y = g.y - g.z;
        line(g.x, y, g.x + 5, y, '#c8c8d0'); line(g.x, y + 1, g.x + 1, y + 2, '#7a4a24');
        if (d.shot > 0) { line(g.x + 5, y - 1, g.x + 6, y - 60, P.paper); glow(g.x + 5, y, P.gold, 10, 0.8); }
      }
    },
  },

  // Morrow's last spell turns on him: violet light pulls in as he staggers, bursts out as his robe collapses, and
  // motes rise from the empty robe.
  WIZARD: {
    line: 'THE SPELL WAS NEVER FINISHED', col: '#b48cff',
    update(d, dt) {
      d.spr = frameAt(d);
      const [cx, cy] = center(d);
      if (d.t < LAND && Math.random() < dt * 70) { const a = rnd(TAU), r = rnd(18, 36); part(cx + Math.cos(a) * r, cy + Math.sin(a) * r, -Math.cos(a) * r * 2.6, -Math.sin(a) * r * 2.6, 0.35, Math.random() < 0.5 ? '#b48cff' : '#62efff', { drag: 1, glow: true }); }
      if (at(d, STEP) || at(d, 2 * STEP)) { addRing(cx, cy, '#b48cff', -60, 0.3, 1, 40); A.magic(); }
      if (at(d, LAND)) {
        flash('#b48cff', 0.2, true); shake(0.7); A.boom(1.1);
        addRing(cx, cy, '#b48cff', 320, 0.5, 3); addRing(cx, cy, P.paper, 220, 0.4, 1);
        for (let i = 0; i < 50; i++) { const a = rnd(TAU), v = rnd(60, 240); part(cx, cy, Math.cos(a) * v, Math.sin(a) * v, rnd(0.3, 0.9), Math.random() < 0.5 ? '#b48cff' : P.paper, { drag: 3, glow: true }); }
        scorch(d.x, d.y, 10);
      }
      if (d.t > LAND && Math.random() < dt * 8) part(d.x + rnd(-6, 6), d.y - rnd(2, 8), 0, -rnd(10, 24), rnd(0.8, 1.4), Math.random() < 0.5 ? '#b48cff' : '#62efff', { drag: 0.6, glow: true });
    },
    draw(d) { glow(...center(d), '#b48cff', d.t < LAND ? 10 + d.t * 18 : 8, d.t < LAND ? 0.3 + d.t * 0.4 : 0.2); sheetBody(d); },
  },

  // Petals swirl round Rin as she falls, thicker and thicker, and her last frame scatters into petals on the wind.
  NINJA: {
    line: 'SHE SCATTERS WITH THE BLOSSOMS', col: '#ffb7d5',
    update(d, dt) {
      d.spr = frameAt(d);
      const [cx, cy] = center(d);
      if (at(d, STEP)) { A.perfect(); addRing(cx, cy, '#ffb7d5', 120, 0.4, 1); }
      const k = clamp(d.t / GONE, 0, 1);
      if (d.t < GONE + 0.2 && Math.random() < dt * (20 + k * 160)) {
        const a = rnd(TAU), r = 8 + rnd(0, 16), v = 50 + k * 90;
        part(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.7, -Math.sin(a) * v - 20 * k, Math.cos(a) * v * 0.5 - rnd(10, 35), rnd(0.5, 1.1), PETAL[Math.floor(rnd(3))], { drag: 1.2 });
      }
      if (at(d, GONE)) {
        // the last frame: every pixel of her becomes a petal on the wind
        eachPixel(d.spr, d.flip, d.x - d.spr.w / 2, d.y - d.spr.h + 1, (x, y, c) => part(x, y, -rnd(30, 110), -rnd(10, 60), rnd(0.8, 1.8), Math.random() < 0.7 ? PETAL[Math.floor(rnd(3))] : c, { drag: 0.8 }), 2);
        addRing(cx, cy, '#ffb7d5', 260, 0.5, 2); addRing(cx, cy, P.paper, 180, 0.35, 1);
        flash('#ffb7d5', 0.15, false); A.smoke(); A.magic();
        d.gone = true;
      }
      if (d.gone && Math.random() < dt * 25) part(cx + rnd(-30, 30), cy + rnd(-20, 10), -rnd(20, 60), -rnd(5, 25), rnd(1, 2), PETAL[Math.floor(rnd(3))], { drag: 0.5 });
    },
    draw(d) { if (!d.gone) { glow(...center(d), '#ffb7d5', 8 + d.t * 14, 0.15 + d.t * 0.25); sheetBody(d); } },
  },

  // Rivet's suit overloads as she staggers (sparks, steam, faster and faster beeps), blows as she hits the ground,
  // scattering bolts and springs, and smokes after.
  MECHANIC: {
    line: 'WARRANTY VOID', col: '#ff9a3c',
    update(d, dt) {
      d.spr = frameAt(d);
      const [cx, cy] = center(d);
      if (d.t < LAND) {
        const k = d.t / LAND;
        if (Math.random() < dt * (12 + k * 45)) sparks(cx + rnd(-6, 6), cy + rnd(-6, 6), rnd(TAU), 3, 0.6, P.ember2, 120);
        if (Math.random() < dt * 20) part(cx + rnd(-4, 4), cy - rnd(0, 6), rnd(-10, 10), -rnd(20, 40), rnd(0.4, 0.8), '#c8c8d0', { drag: 1 });
        d.beep = (d.beep ?? 0) - dt;
        if (d.beep <= 0) { d.beep = 0.2 - k * 0.15; A.fuse(); }
      }
      if (at(d, LAND)) {
        for (let i = 0; i < 16; i++) { const a = rnd(TAU), v = rnd(60, 200); part(cx, cy, Math.cos(a) * v, Math.sin(a) * v, rnd(0.8, 1.5), Math.random() < 0.5 ? P.gold : '#8b98ab', { z: 6, vz: rnd(60, 160), g: 320, drag: 1.5 }); }
        for (let i = 0; i < 40; i++) { const a = rnd(TAU), v = rnd(60, 220); part(cx, cy, Math.cos(a) * v, Math.sin(a) * v, rnd(0.2, 0.5), Math.random() < 0.5 ? P.ember : P.ember2, { drag: 4, glow: true }); }
        addRing(cx, cy, P.ember, 300, 0.4, 3); flash(P.ember, 0.22, true); shake(1); A.boom(1.5); scorch(d.x, d.y, 14);
      }
      if (d.t > LAND && Math.random() < dt * 8) part(d.x + rnd(-6, 6), d.y - 2, 0, -rnd(10, 20), rnd(1, 1.6), '#4a4450', { drag: 0.5 });
    },
    draw(d) {
      const k = clamp(d.t / LAND, 0, 1);
      if (d.t < LAND) glow(...center(d), P.ember, 8 + k * 14, 0.2 + k * 0.4);
      sheetBody(d, { tint: d.t < LAND && Math.floor(d.t * (8 + k * 30)) % 2 ? P.ember : null, dx: d.t < LAND ? Math.sin(d.t * 70) * k * 1.5 : 0 });
    },
  },

  // Grom crashes down in his drawn frames: the ground shakes, dust rings out and armor plates fly.
  TANK: {
    line: 'THE WALL HAS FALLEN', col: '#8b98ab',
    update(d, dt) {
      d.spr = frameAt(d);
      for (const s of [STEP, 2 * STEP]) if (at(d, s)) { A.shieldHit(); for (let i = 0; i < 5; i++) part(d.x + rnd(-6, 6), d.y - rnd(6, 16), rnd(-60, 60), -rnd(10, 40), rnd(0.6, 1), '#8b98ab', { z: 6, vz: rnd(20, 60), g: 300, drag: 1 }); }
      if (at(d, LAND)) {
        shake(1); A.boom(1.4); A.wall(); flash(P.dust, 0.12, false);
        dust(d.x, d.y, 30, 110); addRing(d.x, d.y, P.stone2, 260, 0.4, 3);
        for (let i = 0; i < 10; i++) part(d.x + rnd(-8, 8), d.y - rnd(2, 10), rnd(-90, 90), -rnd(20, 60), rnd(0.8, 1.4), Math.random() < 0.5 ? '#8b98ab' : P.gold, { z: 4, vz: rnd(40, 110), g: 320, drag: 1.2 });
      }
    },
    draw(d) { sheetBody(d); },
  },

  // Unit-7 shorts out (sparks, ERR) as it staggers, collapses into scrap, and the scrap smokes.
  ROBOT: {
    line: 'SHUTDOWN COMPLETE', col: '#ff3b3b',
    update(d, dt) {
      d.spr = frameAt(d);
      const [cx, cy] = center(d);
      if (d.t < LAND && Math.floor(d.t * 8) !== Math.floor(d.prev * 8)) { sparks(cx + rnd(-6, 6), cy + rnd(-6, 6), rnd(TAU), 8, 1, '#62efff', 160); A.zip(); }
      if (at(d, 0.15) || at(d, 0.45)) addText(d.x + rnd(-8, 8), d.y - d.spr.h - 4, 'ERR', '#ff3b3b');
      if (at(d, LAND)) { A.boom(0.6); A.overheat(); sparks(d.x, d.y - 4, -Math.PI / 2, 16, 0.8, P.ember2, 180); dust(d.x, d.y, 12, 50); }
      if (d.t > LAND && Math.random() < dt * 10) part(d.x + rnd(-6, 6), d.y - rnd(2, 6), rnd(-4, 4), -rnd(10, 25), rnd(1, 1.8), '#4a4450', { drag: 0.4 });
    },
    draw(d) { sheetBody(d, { tint: d.t < LAND && Math.floor(d.t * 14) % 3 === 0 ? '#62efff' : null, dx: d.t < LAND ? Math.sin(d.t * 80) * 0.8 : 0 }); },
  },

  // The Dev: the screen glitches as he's hit, a FATAL ERROR box pops up while he slumps, and his last frame is deleted
  // pixel by pixel.
  DEV: {
    line: 'PROCESS TERMINATED', col: '#39ff6a',
    update(d, dt) {
      d.spr = frameAt(d);
      if (d.t < LAND && Math.random() < dt * 20) glitch(d.x + rnd(-20, 20), d.y - 10 + rnd(-14, 14), 14, 4, 0.2, 5);
      if (at(d, 0.1)) A.zap();
      if (at(d, LAND)) { d.bsod = true; A.click(); A.deny(); }
      if (at(d, GONE + 0.6)) d.bsod = false;
      if (at(d, GONE)) { eachPixel(d.spr, d.flip, d.x - d.spr.w / 2, d.y - d.spr.h + 1, (x, y) => part(x, y, rnd(-8, 8), rnd(20, 60), rnd(0.4, 0.9), Math.random() < 0.7 ? '#39ff6a' : '#ff4fa8', { drag: 0.5 }), 2); A.click(); d.gone = true; }
    },
    draw(d) {
      if (d.t < LAND) for (const [ox, c] of [[-2, '#ff4fa8'], [2, '#39ff6a']]) body(d, { dx: ox, tint: c, alpha: 0.4 });
      if (!d.gone) sheetBody(d);
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
  // the hero's drawn death frames (from their sprite sheet), or the idle frame if there are none
  const set = heroSet(), frames = set.act?.death;
  G.deathFx = { def, t: 0, prev: 0, x: p.x, y: p.y, z: 0, flip: set.frontFacing ? false : Math.cos(p.aim) < 0, spr: set.idle, frames: Array.isArray(frames) && frames.length ? frames : [set.idle] };
  G.deathLine = def.line;
}
export function updateDeath(dt) {
  const d = G.deathFx;
  if (!d) return;
  d.prev = d.t; d.t += dt;
  d.def.update(d, dt);
  // An additional, identity-specific pixel shatter on impact. The existing authored
  // death cinematics remain responsible for the character's unique dramatic sequence.
  if (at(d, LAND)) {
    const cols = {
      BLADE:['#ff6a2b','#ec2412','#38313a'],
      GUNNER:['#9f122a','#ffd447','#e8ba72'],
      WIZARD:['#b48cff','#62efff','#ffffff'],
      NINJA:['#ff7ab8','#b41937','#fff0fa'],
      MECHANIC:['#ff8a26','#77818f','#e9b84b'],
      TANK:['#8b98ab','#f7cd56','#b41624'],
      ROBOT:['#ff3b3b','#62efff','#d5e2ef'],
      DEV:['#39ff6a','#ff4fa8','#c3fadd']
    }[G.char] || ['#ffffff','#ff6a2b'];
    for(let i=0;i<20;i++) {
      const a=rnd(TAU),v=rnd(35,140),c=cols[i%cols.length];
      part(d.x+rnd(-5,5),d.y-rnd(5,18),Math.cos(a)*v,Math.sin(a)*v-rnd(10,40),
        rnd(.24,.7),c,{drag:2.5,z:rnd(1,5),vz:rnd(20,95),g:260});
    }
  }
}
export function drawDeath() {
  const d = G.deathFx;
  if (!d) return;
  d.def.draw(d);
  // the epitaph fades in under the body
  const k = clamp((d.t - 1.6) / 0.6, 0, 1);
  if (k > 0) { ctx.globalAlpha = k; textO(d.def.line, d.x, d.y + 8, d.def.col, 1, 'c'); ctx.globalAlpha = 1; }
}
