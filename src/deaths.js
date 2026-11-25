// Signature deaths and kills. Every fighter dies their own way, a short gory scene played in real time (so the
// death slow-motion doesn't drag it out), and every fighter kills their own way.
import { ctx, P, rect, px, line, disc, glow, text, textO, makeCanvas, SS, snap } from './gfx.js?v=201';
import { A } from './audio.js?v=201';
import { G, TAU, rnd, clamp, part, bleed, splat, stain, dust, sparks, scorch, addRing, addText, glitch, flash, shake, kick, heroSet, sprFor, shadow } from './world.js?v=201';
import {
  BLOOD, ease, easeIn, at, frame, drawBody, drawHero, drawWeapon, cellToWorld, handPos, weaponName, weaponLen, restAngle, cutFrame, placePieces,
  stepPieces, drawPieces, pieceToWorld, eachPiecePixel, spurt, chunks, addPool, stepPools, drawPools, makeCracks, drawCracks, stampCracks,
} from './scene-fx.js?v=201';

// ---------- sprite pixels, for effects that take a body apart pixel by pixel ----------
const pxCache = new WeakMap();
function pixels(s, flip) {
  const img = flip ? s.f : s.n;
  let a = pxCache.get(img);
  if (!a) {
    // one entry per game pixel, read from the picture pixel under its middle (a finer sprite, k 1.5 or 3, is sampled
    // on whole picture pixels, so no read falls between two pixels)
    const k = s.k || 1, iw = img.width, ih = img.height, d = img.getContext('2d').getImageData(0, 0, iw, ih).data;
    a = [];
    for (let y = 0; y < Math.round(s.h); y++) for (let x = 0; x < Math.round(s.w); x++) {
      const sx = Math.min(iw - 1, Math.floor((x + 0.5) * k)), sy = Math.min(ih - 1, Math.floor((y + 0.5) * k)), i = (sy * iw + sx) * 4;
      if (d[i + 3] > 0) a.push([x, y, `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`]);
    }
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
// Each death is a short, gory scene in real time: the death screen comes up 3.4 seconds in and the scene keeps
// playing under it. The scene draws the body itself (the player sprite is hidden once dead): whole and posed, or cut
// into pieces (scene-fx.js cutFrame) that fly, bounce, bleed and leave pools.
const OIL = ['#1a1820', '#2e2a36', '#0e0c12'];
const VIOLET = '#b48cff', GREEN = '#39ff6a', PINK = '#ff4fa8';
const CELL = 120, FOOT = 92;
const mx = (d, x) => (d.flip ? CELL - x : x);                 // a cell column on the side the hero faces
const cw = (d, cx, cy) => cellToWorld(cx, cy, d.x, d.y);      // a point on the (already mirrored) cell, in the world
const bodyTop = () => heroSet().rig?.top ?? 40;

// the dropped weapon: flies and spins, then lands flat, or (stick) comes down point first and stays standing
function dropWeapon(d, o = {}) {
  const name = o.name || weaponName();
  if (!name) return null;
  const [hx, hy] = o.from || handPos(d.x, d.y, { flip: d.flip });
  d.wpn = { name, x: hx, y: d.y + 1, z: Math.max(2, d.y - hy), vx: o.vx ?? -d.f * rnd(20, 40), vy: o.vy ?? rnd(-8, 8), vz: o.vz ?? rnd(80, 120), a: o.a ?? restAngle(d.flip, name), spin: o.spin ?? d.f * rnd(10, 16), stick: !!o.stick, rest: false, alpha: 1, onLand: o.onLand };
  return d.wpn;
}
function stepWeapon(d, dt) {
  const w = d.wpn;
  if (!w || w.rest) return;
  w.vz -= 430 * dt; w.z += w.vz * dt; w.x += w.vx * dt; w.y += w.vy * dt;
  if (w.stick) {
    const L = weaponLen(w.name), down = Math.PI / 2;
    // on the way down it turns point first
    if (w.vz < 0) { const diff = Math.atan2(Math.sin(down - w.a), Math.cos(down - w.a)); w.a += diff * Math.min(1, 9 * dt); w.spin *= Math.exp(-6 * dt); }
    w.a += w.spin * dt;
    if (w.vz < 0 && w.z <= L * 0.78) {
      w.rest = true; w.z = L * 0.78; w.a = down + rnd(-0.22, 0.22);
      A.wall(); A.crack(); dust(w.x, w.y, 6, 40); sparks(w.x, w.y, -Math.PI / 2, 8, 1, P.paper, 100); stain(w.x, w.y + 1, '#050308', 2);
      w.onLand?.(w);
    }
    return;
  }
  w.a += w.spin * dt;
  if (w.z <= 0 && w.vz < 0) {
    w.z = 0;
    if (w.vz < -60) { w.vz *= -0.35; w.vx *= 0.5; w.vy *= 0.5; w.spin *= 0.4; A.click(); dust(w.x, w.y, 3, 30); w.onLand?.(w); }
    else { w.rest = true; w.vx = w.vy = 0; w.a = Math.round(w.a / Math.PI) * Math.PI + (d.flip ? -0.08 : 0.08); }
  }
}
function drawDropped(d) {
  const w = d.wpn;
  if (!w || w.alpha <= 0) return;
  if (w.z > 3 && !w.rest) shadow(w.x, w.y, 3);
  drawWeapon(w.x, w.y - w.z, w.a, d.flip, w.alpha, w.name);
}
// one piece turned back into a frame, so it can be cut again (Unit-7's body after its head is off)
function pieceAsFrame(pc) { const c = makeCanvas(CELL, 96); c.getContext('2d').drawImage(pc.cv, pc.ox, pc.oy); return { n: c, f: c, w: 40, h: 32, k: 3 }; }
const poolUnder = (d, b, r, c) => addPool(d.pools, b.x, b.y + 1, r ?? clamp(Math.sqrt(b.pc.n) / 3.4, 2.5, 9), c ? { c } : {});
// pieces burst out from a point: away from it, up, spinning
function burstPieces(list, cx, cy, sp, up, spin) {
  for (const b of list) {
    const dx = b.x - cx, dz = b.z - cy, n = Math.hypot(dx, dz) || 1;
    b.held = false; b.vx = (dx / n) * sp * rnd(0.6, 1.2); b.vy = rnd(-1, 1) * sp * 0.35; b.vz = up * rnd(0.6, 1.2) + (dz / n) * sp * 0.4; b.vr = rnd(-spin, spin); b.bleed = rnd(0.8, 1.4);
  }
}
const OIL_POOL = ['#0a0a10', '#1e1c26', '#3a3646'];

const DEATHS = {
  // Kael: one cut through the chest. A beat of stillness, then his top half slides off along it and his legs fold;
  // blood pumps from the stump, both halves catch his own fire and burn to ash on the wind, and his sword comes down
  // point first and stays standing in the floor.
  BLADE: {
    line: 'THE LAST EMBER GOES OUT', col: P.ember,
    start(d) {
      const T = bodyTop(), H = FOOT - T, a = [mx(d, 20), T + H * 0.48], b = [mx(d, 100), T + H * 0.8];
      d.pieces = placePieces(cutFrame(frame('idle', 0), d.flip, [[...a, ...b]]).sort((p, q) => p.cy - q.cy), d.x, d.y);
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      d.s.u = [(b[0] - a[0]) / L, (b[1] - a[1]) / L]; d.s.mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const [x0, y0] = cw(d, ...a), [x1, y1] = cw(d, ...b), ex = (x1 - x0) * 1.4, ey = (y1 - y0) * 1.4;
      d.s.slash = [x0 - ex, y0 - ey, x1 + ex, y1 + ey];
      A.riftCut(); A.gore(1.3);
    },
    update(d, dt) {
      const [up, low] = d.pieces, t = d.t;
      if (at(d, 0.34) && up) {
        up.held = false; up.vx = d.s.u[0] * 46; up.vz = 34; up.vr = Math.sign(d.s.u[0]) * 2.6; up.bleed = 1.1;
        A.gore(0.8); A.squirt();
        dropWeapon(d, { stick: true, vz: 200, vx: -d.f * 16, spin: d.f * 16 });
      }
      if (at(d, 0.82) && low) { low.held = false; low.vx = -d.s.u[0] * 12; low.vz = 16; low.vr = -Math.sign(d.s.u[0]) * 3.2; low.bleed = 1.4; A.wall(); }
      // the stump pumps blood, weaker with every beat
      if (low && t > 0.34 && t < 1.7 && Math.floor(t / 0.13) !== Math.floor(d.prev / 0.13)) {
        const [sx, sy] = pieceToWorld(low, ...d.s.mid), f = 1.35 * (1 - (t - 0.34) / 1.4);
        spurt(sx, low.y, Math.max(1, low.y - sy), rnd(TAU), f, 5, BLOOD, 1.6); A.squirt();
      }
      // his own fire takes both halves, then they fall to ash on the wind
      if (t > 1.35 && t < 2.1) for (const b of d.pieces) {
        b.tint = P.ember; b.tintK = clamp((t - 1.35) / 0.6, 0, 1) * 0.8;
        if (Math.random() < dt * 30) part(b.x + rnd(-5, 5), b.y, rnd(-6, 6), 0, rnd(0.4, 0.8), Math.random() < 0.5 ? P.ember : P.ember2, { z: b.z + rnd(0, 3), vz: rnd(20, 60), glow: true, drag: 1 });
      }
      if (at(d, 1.35)) { A.smoke(); A.crack(); }
      if (at(d, 2.1)) {
        A.smoke();
        for (const b of d.pieces) {
          eachPiecePixel(b, (x, y, c) => part(x, b.y, rnd(15, 70) * -d.f + rnd(-10, 10), rnd(-8, 8), rnd(0.8, 1.8), Math.random() < 0.3 ? P.ember : Math.random() < 0.5 ? '#6a5a5a' : '#3a3030', { z: Math.max(0, b.y - y), vz: rnd(5, 40), drag: 0.8, glow: Math.random() < 0.15 }));
          b.alpha = 0; scorch(b.x, b.y, 5);
        }
      }
      stepPieces(d.pieces, dt, { onBounce: (b) => { A.splat(); splat(b.x, b.y, 4, P.blood, P.bloodD); }, onRest: (b) => poolUnder(d, b) });
    },
    draw(d) {
      if (d.t < 0.3) { const k = 1 - d.t / 0.3, [x0, y0, x1, y1] = d.s.slash; line(x0, y0, x1, y1, P.blood, Math.max(1, Math.round(5 * k))); line(x0, y0, x1, y1, P.paper, Math.max(1, Math.round(3 * k))); glow((x0 + x1) / 2, (y0 + y1) / 2, P.paper, 16, 0.6 * k); }
      drawPieces(d.pieces);
      if (d.t > 1.35 && d.t < 2.1) for (const b of d.pieces) glow(b.x, b.y - b.z, P.ember, 8, 0.4);
    },
  },

  // Vega: riddled. Six shots from out of nowhere jerk her about and open exit wounds, the seventh takes her hat off
  // and half her head with it; she staggers, drops to her knees, fires one last shot at the sky and pitches forward
  // into her own blood, the revolver sliding out of her hand.
  GUNNER: {
    line: 'ONE BULLET SHORT', col: P.gold,
    start(d) {
      const fr = frame('idle', 0), hat = 56.5;
      d.s.hat = placePieces(cutFrame(fr, d.flip, [[0, hat, CELL, hat]], { clean: true }).filter((pc) => pc.cy < hat), d.x, d.y);
      d.s.hatRow = hat; d.s.holes = []; d.s.jx = 0; d.s.jr = 0; d.s.white = 0;
      d.s.hits = [0, 0.13, 0.24, 0.34, 0.46, 0.6];
    },
    pose(d) {
      // standing, staggering back, on her knees, then face down
      const t = d.t, s = d.s, o = { flip: d.flip, dx: 0 };
      let fr = frame('idle', 0), rot = s.jr, x = d.x + s.jx;
      if (t > 0.82) x -= d.f * 4 * ease((t - 0.82) / 0.35) + Math.sin(t * 18) * (t < 1.2 ? 0.8 : 0);
      if (t > 1.2) fr = frame('death', 2);
      if (t > 2.05) rot = d.f * (Math.PI / 2) * easeIn((t - 2.05) / 0.25);
      return { fr, x, o: { ...o, rot, pivot: [0, 0], top: t > 0.8 ? (s.hatRow + (t > 1.2 ? 3 : 0)) / 3 : 0, tint: s.white > 0 ? P.paper : null } };
    },
    update(d, dt) {
      const t = d.t, s = d.s;
      s.jx *= Math.exp(-14 * dt); s.jr *= Math.exp(-12 * dt); s.white -= dt;
      for (const ht of s.hits) if (at(d, ht)) {
        const a = (d.flip ? 0 : Math.PI) + rnd(-0.7, 0.7), cx = mx(d, 60 + rnd(-7, 7)), cy = rnd(68, 84);
        s.holes.push([cx, cy]);
        const [wx, wy] = cw(d, cx, cy);
        s.jx = Math.cos(a + Math.PI) * -3; s.jr = rnd(-0.1, 0.1); s.white = 0.05;
        spurt(wx, d.y, d.y - wy, a + Math.PI, 1.1, 7); spurt(wx, d.y, d.y - wy, a, 0.4, 3);
        A.gun(); A.gore(0.45); shake(0.14); kick(a + Math.PI, 2);
      }
      if (at(d, 0.8)) {
        // the head shot
        const [hx, hy] = cw(d, mx(d, 60), 58);
        for (const b of s.hat) { b.held = false; b.x += s.jx; b.vx = -d.f * 55; b.vz = 160; b.vr = -d.f * 10; }
        spurt(hx, d.y, d.y - hy, d.flip ? 0 : Math.PI, 1.5, 14, BLOOD, 1.3); chunks(hx, d.y, d.y - hy, 6, ['#c4243a', '#e8d8c8', '#8a0f22'], 0.8);
        A.gun(); A.gore(1.2); shake(0.45); kick(d.flip ? 0 : Math.PI, 3); s.white = 0.06;
      }
      if (at(d, 1.2)) { A.wall(); dust(d.x, d.y, 8, 40); }
      if (at(d, 1.88)) {
        const [hx, hy] = handPos(d.x - d.f * 4, d.y, { flip: d.flip }), a = -Math.PI / 2 - d.f * 0.12, L = weaponLen(), tx = hx + Math.cos(a) * L, ty = hy + 3 + Math.sin(a) * L;
        A.gun(); A.click(); shake(0.15); s.shot = 0.09; s.muz = [tx, ty];
        for (let i = 0; i < 8; i++) part(tx, ty, rnd(-30, 30), -rnd(40, 120), rnd(0.1, 0.25), Math.random() < 0.5 ? P.paper : P.gold, { drag: 6, glow: true });
        part(hx, d.y, -d.f * rnd(20, 40), 0, 1.4, P.gold2, { z: d.y - hy, vz: rnd(60, 90), g: 300, drag: 1.5 });
      }
      if (s.shot > 0) s.shot -= dt;
      if (at(d, 2.3)) {
        A.wall(); A.splat(); shake(0.3); dust(d.x, d.y, 10, 50); splat(d.x + d.f * 8, d.y, 7, P.blood, P.bloodD);
        addPool(d.pools, d.x + d.f * 9, d.y + 1, 13, { k: 0.9 });
        dropWeapon(d, { from: [d.x + d.f * 14, d.y - 3], vz: 40, vx: d.f * 30, spin: d.f * 6 });
      }
      stepPieces(s.hat, dt, { onBounce: () => A.click() });
    },
    draw(d) {
      const t = d.t, s = d.s, { fr, x, o } = this.pose(d);
      // the revolver stays in her hand until she falls; it points at the sky for the last shot
      let wa = restAngle(d.flip);
      if (t > 1.4 && t < 2.05) wa = wa + (-Math.PI / 2 - d.f * 0.12 - wa) * ease((t - 1.4) / 0.35) + Math.sin(t * 40) * 0.03;
      drawHero(fr, x, d.y, { ...o, front: t > 1.4 }, t < 2.05 ? wa : null);
      // the bullet holes, wherever the body is now
      const dy = t > 1.2 ? 3 : 0;
      for (const [hx, hy] of s.holes) { const [wx, wy] = cellToWorld(hx, hy + dy, x, d.y, { ...o, flip: false }); rect(wx, wy, 1, 1, '#3d0610'); if (t < 2.05) rect(wx, wy + 1, 1, 1, P.blood); }
      if (s.shot > 0 && s.muz) { const [tx, ty] = s.muz; line(tx, ty, tx - d.f * 2, ty - 120, P.paper); glow(tx, ty, P.gold, 10, 0.9); }
      if (t >= 0.8) drawPieces(s.hat);
    },
  },

  // Morrow: his own spell eats him. He's lifted off the floor, shaking, violet light splitting through him; then it
  // tears him apart into burning chunks that rain down with his blood, and the rags of his robe drift down after.
  WIZARD: {
    line: 'THE SPELL WAS NEVER FINISHED', col: VIOLET,
    start(d) { d.s.cr = makeCracks(0, 0, 7, 9, 1); A.powerUp(0.9); dropWeapon(d, { vz: 70, vx: -d.f * 30, spin: d.f * 6, onLand: (w) => { if (!w.cracked) { w.cracked = true; addRing(w.x, w.y - 2, VIOLET, 120, 0.3, 1); A.freeze(); sparks(w.x, w.y - 2, -Math.PI / 2, 10, 1.4, VIOLET, 120); } } }); },
    z: (d) => 14 * ease(d.t / 0.6),
    update(d, dt) {
      const t = d.t, z = this.z(d), cy = d.y - z - 9;
      if (t < 0.92) {
        if (Math.random() < dt * 80) { const a = rnd(TAU), r = rnd(16, 34); part(d.x + Math.cos(a) * r, d.y, -Math.cos(a) * r * 2.4, 0, 0.35, Math.random() < 0.5 ? VIOLET : '#62efff', { z: d.y - cy + Math.sin(a) * r, vz: -Math.sin(a) * r * 2.4, drag: 1, glow: true }); }
        if (Math.random() < dt * 10) G.bolts.push({ x0: d.x + rnd(-14, 14), y0: d.y, x1: d.x + rnd(-3, 3), y1: cy + rnd(-4, 4), t: 0, life: 0.1, c1: P.paper, c2: VIOLET, c3: '#5a2a9a' });
        if (at(d, 0.45)) A.zap();
        if (Math.random() < dt * 12) spurt(d.x + rnd(-3, 3), d.y, z + rnd(4, 12), rnd(TAU), 0.5, 2);
      }
      if (at(d, 0.92)) {
        const T = bodyTop(), H = FOOT - T, c = [60, T + H * 0.55];
        const lines = Array.from({ length: 4 }, (_, i) => { const a = (i / 4) * Math.PI + rnd(-0.3, 0.3), ox = c[0] + rnd(-4, 4), oy = c[1] + rnd(-6, 6); return [ox - Math.cos(a) * 60, oy - Math.sin(a) * 60, ox + Math.cos(a) * 60, oy + Math.sin(a) * 60]; });
        d.pieces = placePieces(cutFrame(frame('idle', 0), d.flip, lines, { wound: { edge: '#b48cff', flesh: [178, 18, 42], hi: [255, 230, 255], bone: [236, 222, 204] } }), d.x, d.y, (b) => { b.z += z; });
        burstPieces(d.pieces, d.x, z + 9, 115, 150, 14);
        flash(VIOLET, 0.25, true); shake(1); kick(-Math.PI / 2, 5); A.boom(1.8); A.gore(1.6);
        addRing(d.x, cy, P.paper, 380, 0.35, 3); addRing(d.x, cy, VIOLET, 300, 0.5, 4);
        for (let i = 0; i < 60; i++) { const a = rnd(TAU), v = rnd(60, 260); part(d.x, d.y, Math.cos(a) * v, Math.sin(a) * v * 0.5, rnd(0.3, 0.9), Math.random() < 0.5 ? VIOLET : P.paper, { z: z + 9, vz: rnd(-60, 160), drag: 3, glow: true }); }
        for (let i = 0; i < 4; i++) spurt(d.x, d.y, z + 9, rnd(TAU), 1.4, 8, BLOOD, 1.4);
        chunks(d.x, d.y, z + 9, 14, ['#c4243a', '#8a0f22', '#e8d8c8', '#5a2a9a'], 1.2);
        scorch(d.x, d.y, 12);
        for (let i = 0; i < 70; i++) { const a = (i / 70) * TAU; stain(d.x + Math.cos(a) * 22, d.y + Math.sin(a) * 11, '#2a1040', 1); }
      }
      if (d.pieces.length && t < 2.6) {
        for (const b of d.pieces) if (Math.random() < dt * 14) part(b.x + rnd(-2, 2), b.y, rnd(-4, 4), 0, rnd(0.4, 0.8), Math.random() < 0.6 ? VIOLET : '#62efff', { z: b.z + 1, vz: rnd(15, 40), glow: true, drag: 1 });
        // rags of the robe drifting down
        if (t < 1.8 && Math.random() < dt * 22) part(d.x + rnd(-30, 30), d.y + rnd(-10, 10), rnd(-15, 15), 0, rnd(1.4, 2.2), Math.random() < 0.5 ? '#3a2a5a' : '#5a3a8a', { z: rnd(30, 60), vz: rnd(-6, 10), g: 30, drag: 1.5, s: 2 });
      }
      stepPieces(d.pieces, dt, { onBounce: (b) => { A.splat(); splat(b.x, b.y, 3, P.blood, P.bloodD); }, onRest: (b) => poolUnder(d, b) });
    },
    draw(d) {
      const t = d.t;
      if (t < 0.92) {
        const z = this.z(d), k = t / 0.92, o = { flip: d.flip, z, rot: Math.sin(t * 61) * 0.06 * Math.min(1, t * 2), pivot: [0, -9], tint: Math.floor(t * (10 + k * 30)) % 2 ? VIOLET : null };
        glow(d.x, d.y - z - 9, VIOLET, 10 + k * 20, 0.3 + k * 0.5);
        drawBody(frame('idle', 0), d.x + (Math.random() - 0.5) * k * 2, d.y, o);
        // light splitting through him
        ctx.save(); ctx.translate(Math.round(d.x), Math.round(d.y - z - 10)); drawCracks(d.s.cr, k * 1.3, P.paper, 1); ctx.restore();
      }
      drawPieces(d.pieces);
    },
  },

  // Rin: a thousand cuts. She goes still, eyes shut; six cuts flash across her one after another; a heartbeat of
  // nothing; then she falls apart along every one of them at once, spraying, her katana stands in the floor beside
  // what's left, and the pieces scatter into petals on the wind.
  NINJA: {
    line: 'SHE SCATTERS WITH THE BLOSSOMS', col: '#ffb7d5',
    start(d) {
      const T = bodyTop(), H = FOOT - T, c = [60, T + H * 0.58];
      d.s.cuts = Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI + rnd(-0.22, 0.22) + 0.3, ox = mx(d, c[0] + rnd(-7, 7)), oy = c[1] + rnd(-12, 10);
        return { l: [ox - Math.cos(a) * 70, oy - Math.sin(a) * 70, ox + Math.cos(a) * 70, oy + Math.sin(a) * 70], t: 0.2 + i * 0.085 };
      });
    },
    update(d, dt) {
      const t = d.t;
      for (const c of d.s.cuts) if (at(d, c.t)) {
        A.slice(); A.gore(0.3);
        const [x0, y0] = cw(d, c.l[0], c.l[1]), [x1, y1] = cw(d, c.l[2], c.l[3]), mxw = (x0 + x1) / 2, myw = (y0 + y1) / 2;
        c.w = [x0, y0, x1, y1];
        for (let i = 0; i < 4; i++) part(mxw + rnd(-4, 4), d.y, rnd(-30, 30), 0, 1.5, BLOOD[i % 3], { z: d.y - myw, vz: rnd(10, 50), g: 380, drag: 2, blood: true });
      }
      if (at(d, 1.0)) {
        d.pieces = placePieces(cutFrame(frame('idle', 10), d.flip, d.s.cuts.map((c) => c.l), { min: 10 }), d.x, d.y);
        const [cx, cy] = [d.x, (bodyTop() + FOOT) / 2];
        for (const b of d.pieces) {
          const dx = b.x - d.x, dz = b.z - (FOOT - cy) / 3;
          b.held = false; b.vx = dx * 7 + rnd(-14, 14); b.vy = rnd(-12, 12); b.vz = dz * 5 + rnd(30, 80); b.vr = rnd(-6, 6); b.bleed = rnd(1, 1.6);
          spurt(b.x, b.y, b.z, Math.atan2(rnd(-1, 1), dx || 1), 0.9, 4);
        }
        A.gore(1.6); A.squirt(); shake(0.5); flash(P.blood, 0.12, false);
        dropWeapon(d, { stick: true, vz: 170, vx: d.f * 22, spin: -d.f * 14 });
      }
      if (t > 1.0 && t < 1.8 && Math.floor(t / 0.16) !== Math.floor(d.prev / 0.16)) { for (const b of d.pieces) if (Math.random() < 0.5) spurt(b.x, b.y, b.z + 1, rnd(TAU), 0.7, 3); A.squirt(); }
      if (at(d, 2.05)) {
        A.magic(); A.smoke();
        for (const b of d.pieces) { eachPiecePixel(b, (x, y, c) => part(x, b.y, -d.f * rnd(20, 90) + rnd(-15, 15), rnd(-10, 10), rnd(1, 2.2), Math.random() < 0.55 ? PETAL[Math.floor(rnd(3))] : Math.random() < 0.5 ? '#c4243a' : c, { z: Math.max(0, b.y - y), vz: rnd(10, 60), drag: 0.9 })); b.alpha = 0; }
        addRing(d.x, d.y - 4, '#ffb7d5', 260, 0.5, 2);
      }
      if (t > 2.05 && t < 4 && Math.random() < dt * 20) part(d.x + rnd(-40, 40), d.y + rnd(-8, 8), -d.f * rnd(20, 50), 0, rnd(1.2, 2), PETAL[Math.floor(rnd(3))], { z: rnd(10, 40), vz: rnd(-10, 10), g: 20, drag: 0.6 });
      stepPieces(d.pieces, dt, { onBounce: (b) => { A.splat(); splat(b.x, b.y, 3, P.blood, P.bloodD); }, onRest: (b) => poolUnder(d, b) });
    },
    draw(d) {
      const t = d.t;
      if (t < 1.0) {
        drawBody(frame('idle', t < 0.15 ? 0 : 10), d.x, d.y, { flip: d.flip });
        for (const c of d.s.cuts) {
          if (!c.w || t < c.t) continue;
          const v = t - c.t, [x0, y0, x1, y1] = c.w;
          if (v < 0.07) { line(x0, y0, x1, y1, P.paper, 3); glow((x0 + x1) / 2, (y0 + y1) / 2, '#ffb7d5', 14, 0.7); }
          else if (v < 0.2 && Math.floor(G.time * 30) % 2) line(x0, y0, x1, y1, '#ff8fb8', 1);
        }
      }
      drawPieces(d.pieces);
    },
  },

  // Rivet: her rig overloads. Sparks, steam and faster and faster beeps while she shakes; then it blows and takes
  // her apart: her head and chest go high, her legs fold, scrap and blood everywhere, her machines go up with her.
  MECHANIC: {
    line: 'WARRANTY VOID', col: '#ff9a3c',
    start(d) { dropWeapon(d, { vz: 60, vx: d.f * 20, spin: d.f * 5 }); },
    update(d, dt) {
      const t = d.t, T = bodyTop(), cyW = d.y - 10;
      if (t < 0.95) {
        const k = t / 0.95;
        if (Math.random() < dt * (14 + k * 50)) sparks(d.x + rnd(-6, 6), cyW + rnd(-7, 7), rnd(TAU), 3, 0.6, P.ember2, 130);
        if (Math.random() < dt * 22) part(d.x + rnd(-5, 5), d.y, rnd(-12, 12), 0, rnd(0.4, 0.8), '#c8c8d0', { z: rnd(6, 16), vz: rnd(20, 40), drag: 1 });
        d.s.beep = (d.s.beep ?? 0) - dt;
        if (d.s.beep <= 0) { d.s.beep = 0.22 - k * 0.17; A.fuse(); }
        for (const a of G.allies) if (Math.random() < dt * 10) sparks(a.x, a.y - 6, rnd(TAU), 3, 1, P.ember2, 110);
      }
      if (at(d, 0.95)) {
        const neck = T + 32.5, waist = T + 44.5, split = mx(d, 61);
        d.pieces = placePieces(cutFrame(frame('idle', 0), d.flip, [[0, neck, CELL, neck - 1], [0, waist, CELL, waist + 1], [split - 3, neck, split + 3, waist, true]], { min: 10 }), d.x, d.y);
        for (const b of d.pieces) {
          b.held = false; b.tint = '#2a1a14'; b.tintK = 0.3; b.bleed = rnd(1, 1.6);
          const hi = b.pc.cy < neck, legs = b.pc.cy > waist;
          b.vx = hi ? rnd(-40, 40) : legs ? rnd(-10, 10) : (b.x - d.x) * 14 + rnd(-30, 30);
          b.vz = hi ? rnd(260, 300) : legs ? rnd(20, 50) : rnd(150, 210);
          b.vy = rnd(-14, 14); b.vr = hi ? rnd(-12, 12) : legs ? rnd(-3, 3) : rnd(-9, 9);
        }
        flash(P.ember, 0.25, true); shake(1); kick(-Math.PI / 2, 6); A.boom(2.2); A.gore(1.4);
        addRing(d.x, cyW, P.paper, 400, 0.3, 3); addRing(d.x, cyW, P.ember, 300, 0.5, 4); addRing(d.x, d.y, '#4a4450', 200, 0.8, 3);
        for (let i = 0; i < 50; i++) { const a = rnd(TAU), v = rnd(60, 240); part(d.x, d.y, Math.cos(a) * v, Math.sin(a) * v * 0.6, rnd(0.2, 0.6), Math.random() < 0.5 ? P.ember : P.ember2, { z: 10, vz: rnd(-40, 140), drag: 4, glow: true }); }
        for (let i = 0; i < 18; i++) { const a = rnd(TAU), v = rnd(50, 200); part(d.x, d.y, Math.cos(a) * v, Math.sin(a) * v * 0.6, rnd(0.9, 1.6), Math.random() < 0.5 ? P.gold : '#8b98ab', { z: 10, vz: rnd(80, 200), g: 380, drag: 1.4, s: 2 }); }
        chunks(d.x, d.y, 10, 12, ['#c4243a', '#8a0f22', '#5a0612'], 1.3); spurt(d.x, d.y, 12, rnd(TAU), 1.5, 10);
        scorch(d.x, d.y, 18); d.s.cr = makeCracks(d.x, d.y, 8, 30);
        G.allies.forEach((a, i) => { a.boomT = 0.15 + i * 0.12; });
      }
      for (const a of G.allies) if (a.boomT !== undefined && (a.boomT -= dt) <= 0) {
        a.dead = true; a.boomT = undefined;
        A.boom(0.9); addRing(a.x, a.y - 4, P.ember, 220, 0.3, 2); scorch(a.x, a.y, 8);
        for (let i = 0; i < 20; i++) { const b = rnd(TAU), v = rnd(40, 160); part(a.x, a.y, Math.cos(b) * v, Math.sin(b) * v * 0.6, rnd(0.6, 1.2), Math.random() < 0.5 ? '#8b98ab' : P.ember2, { z: 6, vz: rnd(60, 160), g: 360, drag: 1.4, s: 2 }); }
      }
      if (t > 1.0 && t < 3.6) for (const b of d.pieces) {
        if (Math.random() < dt * 6) part(b.x + rnd(-2, 2), b.y, rnd(-4, 4), 0, rnd(1, 1.6), '#4a4450', { z: b.z + 2, vz: rnd(10, 22), drag: 0.5 });
        if (b.rest && Math.random() < dt * 8) part(b.x + rnd(-3, 3), b.y, 0, 0, rnd(0.2, 0.4), Math.random() < 0.5 ? P.ember : P.ember2, { z: b.z, vz: rnd(10, 30), glow: true, drag: 1 });
      }
      stepPieces(d.pieces, dt, { onBounce: (b) => { A.splat(); A.wall(); splat(b.x, b.y, 4, P.blood, P.bloodD); }, onRest: (b) => poolUnder(d, b) });
    },
    draw(d) {
      const t = d.t;
      if (t < 0.95) {
        const k = t / 0.95;
        glow(d.x, d.y - 10, P.ember, 8 + k * 16, 0.2 + k * 0.45);
        drawBody(frame('idle', 0), d.x + Math.sin(t * 70) * k * 1.6, d.y, { flip: d.flip, tint: Math.floor(t * (8 + k * 30)) % 2 ? P.ember : null });
      }
      drawPieces(d.pieces);
    },
    under(d) { if (d.s.cr) drawCracks(d.s.cr, (d.t - 0.95) / 0.15, P.ember, 1 - (d.t - 0.95) / 1.5); },
  },

  // Grom, the King's last guard, crushed under the crown, the way a body really gives, pixel by pixel. The King's
  // crown comes down onto his helm and presses. His knees break first and he drops onto them, blood spraying out of
  // the joints and a splinter of bone flying; his spine folds down into his armor, the plates split and spit sparks,
  // and blood runs out of his visor. He braces on his hammer until the haft snaps, and the crown slams him down onto
  // his own boots, blood, meat and bone bursting out of every seam. His helm pops off a pumping stump and rolls away,
  // its visor light going out, while the blood keeps pumping into a spreading pool.
  // The crushing is done in whole art rows of his sprite (helm 0-18, chest 19-28, legs 29-32, boots 33-34): a row
  // that gives is gone, everything above it drops onto what's below, and a band of gore squeezes out of the seam.
  TANK: {
    line: 'THE PIT CLOSES ITS FIST', col: '#8b98ab',
    // art rows of his 33-row sprite: the knees (28 to 30), the spine (22, 23), then everything between the helm (rows 0
    // to 16) and the boots
    STEPS: [[0.42, [28, 29], 'knees'], [0.66, [27, 30], 'knees'], [1.02, [22, 23], 'spine'], [1.3, [17, 18, 19, 20, 21, 24, 25, 26], 'flat']],
    ROWS: 33, NECK: 17, HAND: 27, VISOR: 16,
    start(d) {
      Object.assign(d.s, { gone: new Set(), white: 0, jx: 0, cA: 0, slam: false, head: null, eye: 1, pump: 0, popped: false });
      A.powerUp(0.5);
    },
    // art rows below r that have given way (row r has dropped by this many)
    drop(d, r) { let n = 0; for (const q of d.s.gone) if (q > r) n++; return n; },
    // the world y of the top of art row r, as crushed
    rowY(d, r) { return d.y - 31 + (bodyTop() + 2 * r + 2 * this.drop(d, r)) / SS; },
    // each art row's left and right edge on the sprite, read once
    edges(img) {
      let e = this._e?.get(img);
      if (!e) {
        const w = img.width, h = img.height, px_ = img.getContext('2d').getImageData(0, 0, w, h).data, top = bodyTop();
        e = [];
        for (let r = 0; r < this.ROWS; r++) {
          const y = top + r * 2;
          let lo = -1, hi = -1;
          for (let x = 0; x < w; x++) if (y < h && px_[(y * w + x) * 4 + 3] > 0) { if (lo < 0) lo = x; hi = x; }
          e.push(lo < 0 ? null : [lo, hi]);
        }
        (this._e ??= new WeakMap()).set(img, e);
      }
      return e;
    },
    // blood, meat and the odd bone or armor shard, one art pixel (two thirds of a game pixel) at a time
    gore(x, y, i) {
      const h = (i * 2654435761) >>> 0, c = h % 23 === 0 ? '#ecdcc8' : h % 17 === 0 ? '#8b98ab' : ['#c4243a', '#8a0f22', '#5a0612', '#e0384a', '#8a0f22'][h % 5];
      ctx.fillStyle = c; ctx.fillRect(snap(x), snap(y), 2 / SS, 2 / SS);
    },
    // where the crushed seams are: each run of rows that gave, and the row it landed on
    seams(d) {
      const out = [], g = [...d.s.gone].sort((p, q) => p - q);
      for (let i = 0; i < g.length; i++) { let j = i; while (j + 1 < g.length && g[j + 1] === g[j] + 1) j++; out.push([g[i], g[j]]); i = j; }
      return out;
    },
    update(d, dt) {
      const t = d.t, s = d.s, top = bodyTop();
      s.white -= dt; s.jx *= Math.exp(-16 * dt); s.cA = Math.min(1, s.cA + dt * 4);
      const sideX = (cx) => d.x + (d.flip ? 20 - cx / SS : cx / SS - 20);
      for (const [ct, rows, kind] of this.STEPS) if (at(d, ct)) {
        for (const r of rows) s.gone.add(r);
        // a red flash of pain and a jolt to one side as it gives
        s.white = 0.04; s.jx = (kind === 'flat' ? 2 : 1.4) * (Math.random() < 0.5 ? -1 : 1);
        const yW = this.rowY(d, Math.max(...rows) + 1), lift = d.y - yW;
        if (kind === 'knees') {
          // the knees snap: blood out of both joints, a splinter of bone, dust
          for (const side of [-1, 1]) spurt(d.x + side * 4, d.y, lift, side > 0 ? rnd(-0.4, 0.2) : Math.PI + rnd(-0.2, 0.4), 1.2, 7, BLOOD, 0.6);
          part(d.x + d.f * 3, d.y, d.f * rnd(40, 80), rnd(-10, 10), rnd(0.8, 1.2), '#ecdcc8', { z: lift, vz: rnd(50, 90), g: 380, drag: 1 });
          dust(d.x, d.y, 8, 60); A.crack(); A.gore(0.5); shake(0.35); kick(Math.PI / 2, 2.5);
          if (!s.cr) s.cr = makeCracks(d.x, d.y, 8, 22);
        } else if (kind === 'spine') {
          // the spine folds: plates split and spit sparks, blood jets from the seam, the visor starts to bleed
          for (const side of [-1, 1]) spurt(d.x + side * 5, d.y, lift, side > 0 ? rnd(-0.5, 0.1) : Math.PI + rnd(-0.1, 0.5), 1.5, 9, BLOOD, 0.8);
          for (let i = 0; i < 6; i++) part(d.x + rnd(-6, 6), d.y, rnd(-90, 90), rnd(-14, 14), rnd(0.8, 1.2), Math.random() < 0.5 ? '#8b98ab' : '#5d6878', { z: lift, vz: rnd(40, 110), g: 380, drag: 1, s: 2 });
          sparks(d.x, d.y - lift, -Math.PI / 2, 10, 1, P.ember3, 140);
          A.gore(0.9); A.wall(); A.crack(); shake(0.5); kick(Math.PI / 2, 3);
        } else {
          // the haft snaps and the hand closes around his armor
          s.slam = true;
          const [hx, hy0] = handPos(d.x, d.y, { flip: d.flip }), hy = hy0 + (this.drop(d, this.HAND) - rows.filter((r) => r > this.HAND).length) * 2 / SS;
          for (let i = 0; i < 6; i++) part(hx, d.y, rnd(-50, 50), rnd(-10, 10), rnd(0.6, 1), Math.random() < 0.5 ? '#6a4a32' : '#3a2618', { z: d.y - hy, vz: rnd(40, 100), g: 380, drag: 1.5 });
          dropWeapon(d, { from: [hx, hy], vz: 70, vx: d.f * 45, spin: d.f * 7, onLand: () => { A.wall(); shake(0.25); } });
          for (let i = 0; i < 10; i++) spurt(d.x + rnd(-5, 5), d.y, 3, (i * TAU) / 10 + rnd(-0.2, 0.2), 1.9, 10, BLOOD, 0.5);
          chunks(d.x, d.y, 4, 22, ['#c4243a', '#8a0f22', '#5a0612', '#ecdcc8', '#8b98ab', '#5d6878'], 1.4);
          for (let i = 0; i < 26; i++) part(d.x + rnd(-9, 9), d.y, rnd(-30, 30), rnd(-8, 8), rnd(0.8, 1.6), Math.random() < 0.5 ? P.ember : '#3a3238', { z: rnd(4, 14), vz: rnd(10, 60), g: 120, drag: 1.2, glow: Math.random() < 0.3 });
          A.gore(2); A.boom(1.6); A.wall(); A.crack(); shake(1); kick(Math.PI / 2, 7); flash(P.blood, 0.22, true);
          splat(d.x, d.y, 18, P.blood, P.bloodD); addPool(d.pools, d.x, d.y + 1, 19, { k: 0.8 });
          addRing(d.x, d.y - 3, P.paper, 300, 0.3, 3); addRing(d.x, d.y - 3, P.blood, 220, 0.45, 3);
          if (s.cr) stampCracks(s.cr);
        }
      }
      // blood runs out of the visor once the spine has gone
      if (t > 1.05 && t < 1.3 && Math.random() < 0.5) {
        const e = heroSet().rig?.eye || [60, 50], ex = sideX(e[0]), ey = this.rowY(d, this.VISOR);
        part(ex + rnd(-1.5, 1.5), d.y, rnd(-4, 4), 0, 1.5, Math.random() < 0.6 ? '#c4243a' : '#8a0f22', { z: d.y - ey, vz: -rnd(5, 20), g: 300, drag: 1, blood: true });
      }
      // a beat after the slam the helm pops off the stump and rolls away
      if (at(d, 1.42)) {
        s.popped = true;
        const neck = top + this.NECK * 2, pcs = placePieces(cutFrame(frame('idle', 0), d.flip, [[0, neck, CELL, neck + 1]], { min: 12 }), d.x, d.y);
        const head = pcs.filter((b) => b.pc.cy < neck).sort((p, q) => q.pc.n - p.pc.n)[0];
        if (head) {
          head.z -= this.drop(d, this.NECK - 1) * 2 / SS; head.held = false;
          head.vx = d.f * rnd(55, 75); head.vy = rnd(-8, 8); head.vz = rnd(70, 100); head.vr = d.f * rnd(9, 13); head.bleed = 1.6;
          d.pieces = [head]; s.head = head;
        }
        for (let i = 0; i < 3; i++) spurt(d.x, d.y, 4, -Math.PI / 2 + rnd(-0.5, 0.5), 2, 12, BLOOD, 1.4);
        A.squirt?.(); A.gore(1);
      }
      // and the stump keeps pumping, weaker each time
      if (s.popped && t < 3.4) {
        s.pump -= dt;
        if (s.pump <= 0) { s.pump = 0.3; const f = Math.max(0.3, 1.6 - (t - 1.42) * 0.6); spurt(d.x + rnd(-1, 1), d.y, 3, -Math.PI / 2 + rnd(-0.6, 0.6), f, 5, BLOOD, 1.2); }
      }
      if (s.slam) { s.cA = Math.max(0, 1 - (t - 1.3) / 0.5); if (Math.random() < 0.5 && s.cA > 0) part(d.x + rnd(-8, 8), d.y, rnd(-8, 8), rnd(-3, 3), rnd(0.6, 1.2), Math.random() < 0.6 ? '#3a3238' : P.ember, { z: rnd(4, 10), vz: rnd(4, 20), g: 60, drag: 1 }); }
      if (s.head?.rest) s.eye = Math.max(0, s.eye - dt * 0.8);
      stepPieces(d.pieces, dt, { onBounce: (b) => { A.click(); splat(b.x, b.y, 3, P.blood, P.bloodD); }, onRest: (b) => poolUnder(d, b, 5) });
    },
    hand(d, front) {
      const rise=ease(clamp(d.t/0.43,0,1)), sink=ease(clamp((d.t-1.58)/0.68,0,1));
      if (sink>=1) return;
      const close=ease(clamp((d.t-0.38)/0.96,0,1));
      const x=d.x,y=d.y+31*(1-rise)+34*sink;
      const rock='#534353', bevel='#978383', dark='#291e2a';
      ctx.save(); ctx.beginPath(); ctx.rect(d.x-29,d.y-47,58,49); ctx.clip();
      if (!front) {
        rect(x-6,y-11,14,29,dark); rect(x-4,y-11,9,29,rock);
        disc(x,y-13,14,dark); disc(x-1,y-14,11,rock);
        line(x-5,y-4,x-2,y+7,P.ember);
      }
      for (let i=0;i<(front?1:4);i++) {
        const side=front?-1:1, base=front?x-9:x-9+i*6;
        const bx=base+side*(front?11:(i-1)*3)*(1-close);
        const joint=y-18-(front?0:5+Math.sin(i)*3)+8*close;
        const tip=bx-side*(front?-6:3+9*close);
        const ty=joint-(front?7:12)*(1-close)+9*close;
        const ry=front?y-7:y-14;
        line(base,ry,bx,joint,dark,7); line(bx,joint,tip,ty,dark,6);
        line(base-1,ry-1,bx-1,joint-1,rock,5); line(bx-1,joint-1,tip,ty-1,rock,4);
        line(bx-2,joint-2,tip-1,ty-2,bevel,1); px(bx,joint+1,P.ember);
      }
      ctx.restore();
    },
    draw(d) {
      const t = d.t, s = d.s, fr = frame('idle', 0), img = s.white > 0 ? fr.tint('#ff3b3b', d.flip) : d.flip ? fr.f : fr.n;
      const top = bodyTop(), x0 = snap(d.x - 20 + Math.round(s.jx * 3) / 3), e = this.edges(d.flip ? fr.f : fr.n);
      this.hand(d,false);
      // the hammer: at rest, then planted head down beside him once his knees go
      if (!s.slam) {
        const k = clamp((t - 0.7) / 0.15, 0, 1), down = Math.PI / 2 + (d.flip ? 0.55 : -0.55), rest = restAngle(d.flip), wa = rest + (down - rest) * ease(k);
        const [hx, hy] = handPos(d.x, d.y, { flip: d.flip });
        if (Math.sin(wa) < -0.35) drawWeapon(hx, hy + this.drop(d, this.HAND) * 2 / SS, wa, d.flip);
        this.body(d, img, top, x0, s.popped ? this.NECK : 0);
        if (Math.sin(wa) >= -0.35) drawWeapon(hx, hy + this.drop(d, this.HAND) * 2 / SS, wa, d.flip);
      } else this.body(d, img, top, x0, s.popped ? this.NECK : 0);
      // gore squeezes out of every seam: wider and thicker the more rows gave there
      for (const [a, b] of this.seams(d)) {
        const n = b - a + 1, y = this.rowY(d, b + 1), bulge = Math.ceil(n / 2), rowsG = Math.min(3, 1 + (n >> 1));
        let lo = 999, hi = -1;
        for (let r = a; r <= b; r++) if (e[r]) { lo = Math.min(lo, e[r][0]); hi = Math.max(hi, e[r][1]); }
        if (hi < 0) continue;
        for (let j = 0; j < rowsG; j++) for (let cx = lo - bulge * 2; cx <= hi + bulge * 2; cx += 2) {
          if ((j === 0 || j === rowsG - 1) && ((cx * 7 + j * 3 + a) % 5 === 0)) continue;   // a ragged edge
          this.gore(x0 + cx / SS, y - (rowsG / 2 - j) * 2 / SS, cx * 31 + j * 7 + a * 13);
        }
      }
      // the stump, once the helm is off
      if (s.popped) {
        const y = this.rowY(d, this.NECK), [lo, hi] = e[this.NECK] || [44, 76];
        for (let cx = lo + 4; cx <= hi - 4; cx += 2) this.gore(x0 + cx / SS, y - 2 / SS - ((cx * 5) % 3 === 0 ? 2 / SS : 0), cx * 17 + 5);
      }
      this.hand(d,true);
      drawPieces(d.pieces);
      // the visor light on the rolling helm goes out
      if (s.head && s.eye > 0) {
        const ey = heroSet().rig?.eye || [60, 50], [vx, vy] = pieceToWorld(s.head, d.flip ? CELL - ey[0] : ey[0], ey[1]);
        glow(vx, vy, '#ffe08a', 4, 0.6 * s.eye * (0.7 + 0.3 * Math.sin(t * 20)));
      }
    },
    // his body from art row `from` down, crushed: rows that gave are left out and everything above them drops
    body(d, img, top, x0, from) {
      for (let r = this.ROWS - 1; r >= from; r--) {
        if (d.s.gone.has(r)) continue;
        const cy = top + r * 2;
        ctx.drawImage(img, 0, cy, CELL, 2, x0, d.y - 31 + (cy + 2 * this.drop(d, r)) / SS, CELL / SS, 2 / SS);
      }
    },
    under(d) { if (d.s.cr) drawCracks(d.s.cr, clamp((d.t - 0.42) / 0.9, 0, 1), P.ember, d.s.slam ? 0 : 0.4); },
  },

  // Unit-7: torn apart. Sparks and oil burst out of it, its head pops off on a fountain of oil, the headless body
  // counts down from three and blows itself to scrap, and the head's red light blinks out on the floor.
  ROBOT: {
    line: 'SHUTDOWN COMPLETE', col: '#ff3b3b',
    start(d) { A.overheat(); },
    update(d, dt) {
      const t = d.t, s = d.s, neck = 71.5;
      if (t < 0.5 && Math.floor(t * 12) !== Math.floor(d.prev * 12)) { sparks(d.x + rnd(-8, 8), d.y - rnd(6, 18), rnd(TAU), 8, 1, '#62efff', 170); A.zip(); if (Math.random() < 0.5) spurt(d.x + rnd(-6, 6), d.y, rnd(6, 14), rnd(TAU), 0.8, 4, OIL); }
      if (at(d, 0.1) || at(d, 0.35)) addText(d.x + rnd(-8, 8), d.y - 30, 'ERR', '#ff3b3b');
      if (at(d, 0.5)) {
        const pcs = cutFrame(frame('idle', 0), d.flip, [[0, neck, CELL, neck]], { wound: { edge: '#0e0c12', flesh: '#3a3646', hi: '#ff9a3c', bone: '#ffd447' } });
        const all = placePieces(pcs, d.x, d.y);
        s.head = all.find((b) => b.pc.cy < neck); s.body = all.find((b) => b.pc.cy >= neck);
        if (s.body) s.bx0 = s.body.x;
        if (s.head) { s.head.held = false; s.head.vz = 240; s.head.vx = rnd(-30, 30); s.head.vr = rnd(9, 14) * (Math.random() < 0.5 ? -1 : 1); s.head.bleed = 0.8; }
        d.pieces = all.filter((b) => b !== s.body);
        A.gore(0.8); A.zap(); shake(0.45); sparks(d.x, d.y - 21, -Math.PI / 2, 20, 0.9, P.ember2, 220);
      }
      // the neck pumps oil and sparks, the body staggers about, counting down
      if (s.body && !s.boom) {
        if (Math.floor(t / 0.07) !== Math.floor(d.prev / 0.07)) { spurt(d.x, d.y, 21, rnd(TAU), 1.1, 3, Math.random() < 0.2 ? ['#62efff', '#2a9ab0'] : OIL, 1.8); if (Math.random() < 0.4) sparks(d.x, d.y - 21, -Math.PI / 2 + rnd(-0.6, 0.6), 4, 0.4, P.ember2, 180); }
        s.body.x = s.bx0 + Math.sin(t * 9) * 2;
        for (const [ct, f, n] of [[0.75, 1000, '3'], [1.0, 1200, '2'], [1.25, 1600, '1']]) if (at(d, ct)) { A.beep(f); addText(d.x, d.y - 26, n, '#ff3b3b', 2); }
      }
      if (at(d, 1.45) && s.body) {
        s.boom = true;
        const f = pieceAsFrame(s.body.pc), c = [mx(d, 60), 82];
        const lines = Array.from({ length: 3 }, (_, i) => { const a = (i / 3) * Math.PI + rnd(-0.3, 0.3); return [c[0] - Math.cos(a) * 60, c[1] - Math.sin(a) * 60, c[0] + Math.cos(a) * 60, c[1] + Math.sin(a) * 60]; });
        const parts = placePieces(cutFrame(f, false, lines, { wound: { edge: '#0e0c12', flesh: '#3a3646', hi: '#ff9a3c', bone: '#ffd447' }, min: 10 }), d.x + s.body.x - s.bx0, d.y);
        burstPieces(parts, d.x, 6, 170, 200, 15);
        d.pieces.push(...parts);
        flash(P.ember, 0.25, true); shake(1); kick(-Math.PI / 2, 6); A.boom(2.2); A.zap();
        addRing(d.x, d.y - 8, P.paper, 400, 0.3, 3); addRing(d.x, d.y - 8, P.ember, 300, 0.5, 4);
        for (let i = 0; i < 50; i++) { const a = rnd(TAU), v = rnd(60, 240); part(d.x, d.y, Math.cos(a) * v, Math.sin(a) * v * 0.6, rnd(0.2, 0.6), Math.random() < 0.5 ? P.ember : P.ember2, { z: 8, vz: rnd(-40, 140), drag: 4, glow: true }); }
        for (let i = 0; i < 24; i++) { const a = rnd(TAU), v = rnd(50, 220); part(d.x, d.y, Math.cos(a) * v, Math.sin(a) * v * 0.6, rnd(1, 1.8), ['#8b98ab', '#5d6878', '#3a3446', P.gold][i % 4], { z: 8, vz: rnd(80, 220), g: 380, drag: 1.3, s: 2 }); }
        spurt(d.x, d.y, 8, rnd(TAU), 1.5, 12, OIL); scorch(d.x, d.y, 16);
        addPool(d.pools, d.x, d.y + 1, 11, { c: OIL_POOL, k: 1.2 });
        dropWeapon(d, { vz: 200, vx: d.f * 60, spin: d.f * 18 });
      }
      if (at(d, 2.75)) A.beep(300);
      if (t > 1.6 && t < 3.6) for (const b of d.pieces) if (b !== s.head && Math.random() < dt * 5) part(b.x, b.y, rnd(-4, 4), 0, rnd(1, 1.6), '#4a4450', { z: b.z + 2, vz: rnd(10, 22), drag: 0.5 });
      stepPieces(d.pieces, dt, { blood: OIL, onBounce: (b) => { A.wall(); sparks(b.x, b.y - 1, -Math.PI / 2, 4, 1, P.ember2, 100); }, onRest: (b) => poolUnder(d, b, null, OIL_POOL) });
    },
    draw(d) {
      const t = d.t, s = d.s;
      if (t < 0.5) drawHero(frame('idle', 0), d.x + (Math.random() - 0.5) * 2, d.y, { flip: d.flip, rot: Math.sin(t * 50) * 0.04, pivot: [0, 0], tint: Math.floor(t * 14) % 3 === 0 ? '#62efff' : null }, restAngle(d.flip) + Math.sin(t * 40) * 0.3);
      else if (s.body && !s.boom) { drawPieces([s.body]); glow(d.x, d.y - 10, '#ff3b3b', 6, Math.floor(t * 8) % 2 ? 0.8 : 0.2); drawWeapon(...handPos(d.x + s.body.x - s.bx0, d.y, { flip: d.flip }), restAngle(d.flip) + Math.sin(t * 30) * 0.2, d.flip); }
      drawPieces(d.pieces);
      // the head's red light, blinking out
      const h = s.head;
      if (h && t < 2.75) {
        const e = heroSet().rig?.eye || [60, 60], [ex, ey] = pieceToWorld(h, mx(d, e[0]), e[1] - 2);
        if (Math.floor(t * (t > 2.2 ? 12 : 4)) % 2 === 0) { rect(ex, ey, 1, 1, '#ff3b3b'); glow(ex, ey, '#ff3b3b', 5, 0.7); }
      }
    },
  },

  // The Dev: segmentation fault. He tears into strips that glitch sideways, bleeding pixels, while a fatal error box
  // pops up; then the strips are deleted one by one from the top and spill to the floor as a puddle of pixels.
  DEV: {
    line: 'PROCESS TERMINATED', col: GREEN,
    start(d) {
      const T = bodyTop(), lines = [];
      for (let y = T + 7; y < FOOT - 3; y += 7) lines.push([0, y, CELL, y]);
      d.pieces = placePieces(cutFrame(frame('idle', 0), d.flip, lines, { wound: { edge: '#39ff6a', flesh: [196, 36, 58], hi: '#ff4fa8', bone: [255, 255, 255] }, deep: 1.6, bone: false, min: 6 }).sort((a, b) => a.cy - b.cy), d.x, d.y);
      d.pieces.forEach((b, i) => { b.base = b.x; b.side = i % 2 ? 1 : -1; });
      A.zap();
    },
    update(d, dt) {
      const t = d.t;
      if (t < 1.2 && Math.random() < dt * 24) glitch(d.x + rnd(-24, 24), d.y - 10 + rnd(-16, 12), 16, 4, 0.15, 6);
      d.pieces.forEach((b, i) => {
        if (b.held) {
          const jit = Math.floor(G.time * 20 + i * 3) % 3 === 0 ? rnd(-3, 3) : 0;
          b.x = b.base + b.side * Math.min(10, Math.max(0, t - 0.4) * 14) + jit;
          if (Math.random() < dt * 6) part(b.x + rnd(-4, 4), b.y, 0, 0, 2, Math.random() < 0.7 ? '#c4243a' : GREEN, { z: b.z - 1, vz: -rnd(0, 10), g: 300, blood: true });
        }
        if (at(d, 1.2 + i * 0.11)) {
          A.click(); glitch(b.x, b.y - b.z, 14, 4, 0.2, 6);
          eachPiecePixel(b, (x, y, c) => part(x, b.y, rnd(-20, 20), rnd(-6, 6), rnd(1.5, 2.4), Math.random() < 0.45 ? c : Math.random() < 0.5 ? GREEN : Math.random() < 0.5 ? PINK : '#c4243a', { z: Math.max(0, b.y - y), vz: rnd(-10, 40), g: 300, drag: 1.2, blood: true }), 2);
          b.alpha = 0;
        }
      });
      if (at(d, 0.45)) { A.deny(); d.s.bsod = true; }
      if (at(d, 1.2 + d.pieces.length * 0.11)) addPool(d.pools, d.x, d.y + 1, 10, { c: ['#0a3a14', '#5a0612', GREEN], k: 1.6 });
      if (t > 2.0 && t < 2.6 && Math.floor(t * 20) !== Math.floor(d.prev * 20)) A.click();
    },
    draw(d) {
      const t = d.t;
      if (t < 1.2) for (const b of d.pieces) if (b.held && b.alpha > 0) {
        // the colors split a little on every strip
        const save = b.x;
        b.x = save - 1; b.tint = PINK; b.tintK = 1; b.alpha = 0.35; drawPieces([b]);
        b.x = save + 1; b.tint = GREEN; drawPieces([b]);
        b.x = save; b.tint = null; b.alpha = 1;
      }
      drawPieces(d.pieces);
      if (d.s.bsod) {
        const x = d.x - 36, y = d.y - 58;
        rect(x - 1, y - 1, 74, 40, P.ink0); rect(x, y, 72, 38, '#1a3ad8');
        textO(':(  FATAL ERROR', x + 4, y + 4, P.paper, 1, 'l', '#1a3ad8');
        textO('0XDEADDEV', x + 4, y + 12, '#9fd3ff', 1, 'l', '#1a3ad8');
        const l = '> RM -RF ./DEV', n = t < 2.0 ? 0 : Math.min(l.length, Math.floor((t - 2.0) * 22));
        if (n) text(l.slice(0, n), x + 4, y + 21, GREEN);
        if (t > 2.75) text('SEGMENTATION FAULT', x + 4, y + 30, Math.floor(G.time * 6) % 2 ? GREEN : P.paper);
      }
    },
  },
};

export function startDeath(p) {
  const def = DEATHS[G.char] || DEATHS.BLADE, flip = (p.softFacingDirection || 1) < 0;
  G.deathFx = { def, t: 0, prev: 0, x: p.x, y: p.y, flip, f: flip ? -1 : 1, pieces: [], pools: [], wpn: null, s: {} };
  def.start?.(G.deathFx);
  G.deathLine = def.line;
}
export function updateDeath(dt) {
  const d = G.deathFx;
  if (!d) return;
  d.prev = d.t; d.t += dt;
  d.def.update(d, dt);
  stepWeapon(d, dt);
  stepPools(d.pools, dt);
}
// pools and cracks: on the floor, under everyone
export function drawDeathUnder() {
  const d = G.deathFx;
  if (!d) return;
  drawPools(d.pools);
  d.def.under?.(d);
}
export function drawDeath() {
  const d = G.deathFx;
  if (!d) return;
  d.def.draw(d);
  drawDropped(d);
  // the epitaph fades in under the body
  const k = clamp((d.t - 1.6) / 0.6, 0, 1);
  if (k > 0) { ctx.globalAlpha = k; textO(d.def.line, d.x, d.y + 10, d.def.col, 1, 'c'); ctx.globalAlpha = 1; }
}
