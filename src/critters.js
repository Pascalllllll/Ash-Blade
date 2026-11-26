// The small life of each floor. Not monsters: nothing aims at them, they never hold a wave open and they never hurt
// you. They mind their own business (sniff, peck, scuttle a little, sit still), run from the fighter and from big
// monsters, scatter from blasts, hide in the cracks while a boss is on the floor and come back out after it falls,
// and a stray cut, shot, blast or dash squashes them (a squeak, a dab of color, a few points).
//   PIT rats, FROST snow mice, FORGE fire beetles (they don't mind the lava), GRID data bugs, SHRINE frogs, NEST
//   spiderlings, THRONE crows, VOID mites, GLASS glass crabs, TEMPLE scarabs, GEARS clockwork beetles, NIGHT moths,
//   YARD hens.
// Each is a few rows of art pixels drawn at the fighters' own pixel size (an art pixel is two canvas pixels), with
// the same near-black outline, facing right (mirrored when they go left).
//   fly    takes to the air when startled and leaves the floor (crows, moths fly all the time)
//   hop    moves in hops (frogs, hens)
//   n      how many live on the floor at once; sp / walk how fast they run and stroll; col the color they leave
import { ctx, makeCanvas, glow } from './gfx.js?v=216';
import { A } from './audio.js?v=216';
import { settings } from './store.js?v=216';
import { G, B, rnd, part, stain, pushOut, hyp, angDiff, TAU, daily } from './world.js?v=216';

const OUT = '#140c14';
// rows of art pixels: '.' is empty, every other letter a color from the kind's palette
const KINDS = {
  rat: {
    n: 5, sp: 95, walk: 26, col: '#7a2a2a', snd: 'squeak',
    pal: { b: '#7e6e6a', h: '#a8968e', d: '#5a4c4a', k: '#e0a0a0', e: '#ff5a4a', n: '#f4a8b0', t: '#c08e8e', f: '#3a2e2e' },
    walkF: [
      ['....hhk...', '..hbbbbbeb', 'ttbddddbbn', '..f...f...'],
      ['....hhk...', '..hbbbbbeb', '.tbddddbbn', 't..f...f..'],
    ],
    idleF: [['....hhk...', '..hbbbbbeb', 'ttbddddbbn', '..f...f...'], ['...........', '....hhk...', 'thbbbbbbeb', 't.fddddfbn']],
  },
  mouse: {
    n: 5, sp: 105, walk: 30, col: '#c86a7a', snd: 'squeak',
    pal: { b: '#e6eef8', d: '#b8c8dc', k: '#ffb0c0', e: '#2a1a2a', n: '#ff9ab0', t: '#d8b0c0', f: '#8a9ab0' },
    walkF: [['...bk...', '.bbbbbeb', 'tbddddbn', '.f...f..'], ['...bk...', '.bbbbbeb', 'tbddddbn', '..f...f.']],
  },
  beetle: {
    n: 4, sp: 60, walk: 18, col: '#ff7a2a', snd: 'click', lava: true, glow: '#ff7a2a',
    pal: { s: '#4a2c24', h: '#1e100c', o: '#ff7a2a', y: '#ffd447', l: '#5a3a2e' },
    walkF: [['..sss..', '.ssyssh', '.soooos', 'l.l.l..'], ['..sss..', '.ssyssh', '.soooos', '.l.l.l.']],
  },
  bug: {
    n: 4, sp: 80, walk: 24, col: '#62efff', snd: 'blip', glow: '#62efff',
    pal: { c: '#62efff', p: '#ff4fa8', w: '#ffffff', d: '#2a7a9a' },
    walkF: [['.ccc.', 'cwccw', 'cdddc', 'p.p.p'], ['.ccc.', 'cwccw', 'cdddc', '.p.p.']],
  },
  frog: {
    n: 3, sp: 70, walk: 22, col: '#4a8a3a', snd: 'croak', hop: true,
    pal: { g: '#4a9a3a', G: '#9ad86a', e: '#1a1a0a', w: '#ffffff', l: '#2a5a22' },
    walkF: [['.we.we.', 'ggggggg', 'gGGGGGg', 'l.....l'], ['.we.we.', 'ggggggg', 'gGGGGGg', '.l...l.']],
  },
  spider: {
    n: 6, sp: 110, walk: 32, col: '#58783a', snd: 'tick',
    pal: { b: '#463440', l: '#76605a', e: '#c8ff4a' },
    walkF: [['.l.b.l.', 'l.bbb.l', '.lbebl.', 'l.l.l.l'], ['l..b..l', '.lbbbl.', 'l.beb.l', '.l.l.l.']],
  },
  crow: {
    n: 4, sp: 120, walk: 16, col: '#3a2a3a', snd: 'caw', fly: true, hop: true,
    pal: { k: '#34303f', g: '#5e5678', e: '#ff6a3c', y: '#e8b840', l: '#7a6450' },
    walkF: [['...kk..', '..kkkey', '.kgkkk.', 'kkkkk..', '...l...'], ['...kk..', '..kkkey', '.kgkkk.', 'kkkkk..', '..l.l..']],
    idleF: [['.......', '...kk..', '.kkkkey', 'kkkkk..', '...l...'], ['...kk..', '..kkkey', '.kgkkk.', 'kkkkk..', '...l...']],
    flyF: [['k.....k', '.k.kk.k', '..kkkey', '...kk..'], ['.......', '..kkk..', '.kkkkey', 'k.kk..k']],
  },
  mite: {
    n: 5, sp: 70, walk: 20, col: '#9a5aff', snd: 'blip', glow: '#b48cff', float: true,
    pal: { v: '#5a3e8a', V: '#b48cff', e: '#ffffff' },
    walkF: [['.vVv.', 'vVeVv', '.vvv.'], ['.vVv.', 'vVVVv', '.vvv.']],
  },
  crab: {
    n: 4, sp: 85, walk: 24, col: '#8a94b0', snd: 'click', side: true,
    pal: { c: '#cfd8e0', s: '#8a94b0', w: '#ffffff', e: '#1a1c26', l: '#5a6480' },
    walkF: [['c.....c', 'cc.e.cc', '.swsss.', 'l.l.l.l'], ['.c...c.', 'cc.e.cc', '.swsss.', '.l.l.l.']],
  },
  scarab: {
    n: 4, sp: 65, walk: 18, col: '#d8a032', snd: 'click',
    pal: { g: '#b8862a', G: '#ffe08a', h: '#3a2a14', l: '#4a3a1a' },
    walkF: [['..ggh', '.gGgg', 'ggggg', '.l.l.'], ['..ggh', '.gGgg', 'ggggg', 'l.l.l']],
  },
  cog: {
    n: 4, sp: 55, walk: 16, col: '#9a7a3a', snd: 'tick',
    pal: { b: '#9a7a3a', B: '#c9a24a', k: '#ffe8a8', h: '#3a2e1e', l: '#5a4a2a' },
    walkF: [['..k..', '.bkb.', 'bBbbh', 'bbbbb', 'l.l.l'], ['.k.k.', '.bkb.', 'bBbbh', 'bbbbb', '.l.l.']],
  },
  moth: {
    n: 4, sp: 70, walk: 26, col: '#b4a8ff', snd: 'flutter', fly: true, always: true, glow: '#b4a8ff',
    pal: { w: '#c8c0e8', W: '#ffffff', b: '#4a4268', e: '#ffd447' },
    flyF: [['ww.ww', 'wWbWw', '.wbw.'], ['.....', 'wwbww', 'WwbwW']],
  },
  hen: {
    n: 4, sp: 85, walk: 14, col: '#d8323e', snd: 'cluck', fly: true, hop: true,
    pal: { w: '#f0e8d8', d: '#c8b8a0', c: '#d8323e', e: '#1a1010', y: '#ffb347', l: '#e8962a' },
    walkF: [['...cc..', '..wwew.', '..wwwwy', 'wwwwww.', '.dwwwd.', '..l.l..'], ['...cc..', '..wwew.', '..wwwwy', 'wwwwww.', '.dwwwd.', '...ll..']],
    idleF: [['.......', '.......', '...cc..', 'wwwwew.', '.dwwwwy', '..l.l..'], ['...cc..', '..wwew.', '..wwwwy', 'wwwwww.', '.dwwwd.', '..l.l..']],
    flyF: [['w.....w', '.w.cc.w', '..wwewy', '.dwwww.'], ['.......', '...cc..', 'wwwwewy', '.dwwwdw']],
  },
};
// which floor has which
const FLOOR = { PIT: 'rat', FROST: 'mouse', FORGE: 'beetle', GRID: 'bug', SHRINE: 'frog', NEST: 'spider', THRONE: 'crow', VOID: 'mite', GLASS: 'crab', TEMPLE: 'scarab', GEARS: 'cog', NIGHT: 'moth', YARD: 'hen' };

// each frame as a small canvas with its outline (art pixels; drawn at two thirds of a game pixel each)
const built = {};
function build(rows, pal) {
  const w = Math.max(...rows.map((r) => r.length)), h = rows.length;
  const cv = makeCanvas(w + 2, h + 2), g = cv.getContext('2d');
  const at = (x, y) => y >= 0 && y < h && x >= 0 && x < rows[y].length && rows[y][x] !== '.';
  g.fillStyle = OUT;
  for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) if (!at(x, y) && (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1))) g.fillRect(x + 1, y + 1, 1, 1);
  for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) { const c = rows[y][x]; if (c !== '.') { g.fillStyle = pal[c] || OUT; g.fillRect(x + 1, y + 1, 1, 1); } }
  return cv;
}
function frames(kind, set) {
  const key = kind + set;
  if (!built[key]) { const k = KINDS[kind], list = k[set + 'F'] || k.walkF || k.flyF; built[key] = list.map((rows) => build(rows, k.pal)); }
  return built[key];
}

const kindHere = () => (G && !G.void && !G.night ? FLOOR[G.mapKey] : null);
// how many may be out now: none while a boss is on the floor or on its way, fewer on a low effects setting
function want() {
  const k = KINDS[kindHere()];
  if (!k || G.boss || G.sigils.some((s) => s.type === 'boss')) return 0;
  return settings.particles === 'LOW' ? Math.ceil(k.n / 2) : k.n;
}
const inPool = (x, y) => G.zones.some((z) => z.pool && hyp(x - z.x, (y - z.y) * 1.3) < z.r + 3);

export function resetCritters(fill = true) {
  G.critters = []; G.critterCd = 1.5;
  if (!fill) return;
  const n = want();
  for (let i = 0; i < n; i++) { const c = spawn(false); if (c) G.critters.push(c); }
}
// a new one: somewhere quiet on the floor (or, coming back later, out of a crack in a wall, or flying in)
function spawn(fromEdge) {
  const kind = kindHere(), k = KINDS[kind];
  if (!k) return null;
  const p = G.p;
  for (let tries = 0; tries < 12; tries++) {
    let x, y;
    if (fromEdge) {
      const side = Math.floor(rnd(3));
      x = side === 0 ? B.x0 + 4 : side === 1 ? B.x1 - 4 : rnd(B.x0 + 20, B.x1 - 20);
      y = side === 2 ? B.y0 + 4 : rnd(B.y0 + 20, B.y1 - 8);
    } else { x = rnd(B.x0 + 16, B.x1 - 16); y = rnd(B.y0 + 16, B.y1 - 10); }
    if (p && hyp(x - p.x, y - p.y) < 90) continue;
    if (!k.lava && inPool(x, y)) continue;
    const c = { kind, x, y, vx: 0, vy: 0, face: Math.random() < 0.5 ? -1 : 1, state: 'idle', t: rnd(0.3, 2), anim: rnd(4), z: 0, vz: 0, scare: 0 };
    if (fromEdge) {
      // in from the edge, walking (or flying) in toward the middle
      const a = Math.atan2((B.y0 + B.y1) / 2 - y, (B.x0 + B.x1) / 2 - x) + rnd(-0.6, 0.6);
      c.state = 'walk'; c.t = rnd(0.6, 1.2); c.vx = Math.cos(a) * k.walk * 1.4; c.vy = Math.sin(a) * k.walk * 1.4;
      if (k.fly) { c.z = 40; c.state = 'land'; c.vx *= 1.6; c.vy *= 1.6; }
    }
    if (k.always) { c.state = 'flutter'; c.z = rnd(6, 14); }
    pushOut(c, 2);
    return c;
  }
  return null;
}

// a cut, a shot, a blast or a dash went through: the critters there are squashed
function squash(c) {
  const k = KINDS[c.kind];
  c.dead = true;
  A.critter(k.snd, true);
  const y = c.y - c.z;
  for (let i = 0; i < 6; i++) { const a = rnd(TAU), v = rnd(30, 90); part(c.x, y - 2, Math.cos(a) * v, Math.sin(a) * v * 0.6 - 20, rnd(0.25, 0.5), i % 2 ? k.col : Object.values(k.pal)[0], { g: 260, drag: 2 }); }
  if (!k.float && !c.z) { stain(c.x, c.y, k.col); stain(c.x + rnd(-2, 2), c.y + rnd(-1, 1), k.col); }
  if (k.glow) for (let i = 0; i < 4; i++) part(c.x, y - 2, rnd(-30, 30), -rnd(20, 50), rnd(0.4, 0.7), k.glow, { glow: true, drag: 2 });
  G.score += 15;
  G.critterKills = (G.critterKills || 0) + 1;
  daily('critters', 1);
}
// blasts squash what's close and scare what's further out (called from world.js explode)
export function critterBlast(x, y, R) {
  if (!G?.critters) return;
  for (const c of G.critters) {
    if (c.dead) continue;
    const d = hyp(c.x - x, c.y - y);
    if (d < R * 0.75) squash(c);
    else if (d < R * 2.6) startle(c, Math.atan2(c.y - y, c.x - x));
  }
}
function startle(c, away) {
  const k = KINDS[c.kind];
  if (c.state === 'flee' || c.state === 'fly' || c.state === 'gone') { c.away = away; return; }
  c.away = away + rnd(-0.5, 0.5);
  if (k.fly && !k.always) { c.state = 'fly'; c.vz = 70; c.t = 2.5; }
  else { c.state = 'flee'; c.t = rnd(0.8, 1.4); }
  if (Math.random() < 0.5) A.critter(k.snd, false);
}

export function updateCritters(dt) {
  if (!G.critters) resetCritters(false);
  const kind = kindHere();
  // a new floor, or none: start over
  if (G.critters.length && G.critters[0].kind !== kind) G.critters = [];
  if (!kind) return;
  const p = G.p, k = KINDS[kind], n = want();
  // too many (a boss is coming): everyone runs for a crack in the wall
  let alive = G.critters.filter((c) => !c.dead && c.state !== 'gone').length;
  if (alive > n) for (const c of G.critters) if (!c.dead && c.state !== 'gone' && c.state !== 'flee' && c.state !== 'fly') startle(c, Math.atan2(c.y - p.y, c.x - p.x));
  if (alive < n && (G.critterCd -= dt) <= 0) { G.critterCd = rnd(5, 12); const c = spawn(true); if (c) G.critters.push(c); }
  const active = (s) => s.t < s.life;
  for (const c of G.critters) {
    if (c.dead) continue;
    c.anim += dt; c.t -= dt;
    const d = hyp(c.x - p.x, c.y - p.y);
    // what squashes them: a cut through them, a shot, a dash over them (flyers high up are out of reach)
    if (c.z < 10) {
      let hit = p.state === 'dash' && d < 8;
      for (const s of G.slashes) {
        if (hit || !active(s)) continue;
        const ds = hyp(c.x - s.x, c.y - s.y);
        if (ds < s.r + 2 && (s.arc >= 6 || Math.abs(angDiff(Math.atan2(c.y - s.y, c.x - s.x), s.a)) < s.arc / 2 + 0.35)) hit = true;
      }
      for (const s of G.shots) if (!hit && hyp(c.x - s.x, c.y - c.z - s.y) < 4) hit = true;
      for (const q of G.quakes) if (!hit && !(q.delay > 0) && Math.abs(hyp(c.x - q.x, c.y - q.y) - q.r) < 4) hit = true;
      if (hit) { squash(c); continue; }
    }
    // what scares them: the fighter coming close (closer still when walking slowly), big monsters, a boss coming
    const sp = hyp(p.vx, p.vy), near = p.state === 'dead' ? 0 : sp > 40 ? 40 : 26;
    if (d < near && c.state !== 'flee' && c.state !== 'fly' && c.state !== 'gone') startle(c, Math.atan2(c.y - p.y, c.x - p.x));
    else if (c.state === 'idle' || c.state === 'walk') for (const e of G.E) {
      if (e.prop || e.dead || (e.r || 0) < 9) continue;
      if (hyp(c.x - e.x, c.y - e.y) < e.r + 14) { startle(c, Math.atan2(c.y - e.y, c.x - e.x)); break; }
    }
    switch (c.state) {
      case 'idle':
        c.vx *= 0.8; c.vy *= 0.8;
        if (c.t <= 0) { const a = rnd(TAU); c.state = 'walk'; c.t = rnd(0.3, 1.1); c.vx = Math.cos(a) * k.walk; c.vy = Math.sin(a) * k.walk * 0.7; }
        break;
      case 'walk':
        if (k.hop) c.z = Math.abs(Math.sin(c.anim * 12)) * 2;
        if (c.t <= 0) { c.state = 'idle'; c.t = rnd(0.6, 2.4); c.z = 0; }
        break;
      case 'flee': {
        const a = c.away;
        c.vx = Math.cos(a) * k.sp; c.vy = Math.sin(a) * k.sp * 0.8;
        if (k.hop) c.z = Math.abs(Math.sin(c.anim * 16)) * 4;
        // into a crack in the wall: gone, another comes out later
        if (c.x < B.x0 + 4 || c.x > B.x1 - 4 || c.y < B.y0 + 3) { c.state = 'gone'; break; }
        if (c.t <= 0) { if (n === 0) c.t = 0.5; else { c.state = 'idle'; c.t = rnd(0.5, 1.5); c.z = 0; } }
        break;
      }
      case 'fly': {
        // up and away, out of the arena
        c.vz = Math.min(90, c.vz + 120 * dt); c.z += c.vz * dt;
        c.vx = Math.cos(c.away) * k.sp; c.vy = Math.sin(c.away) * k.sp * 0.6 - 20;
        if (c.z > 120 || c.x < B.x0 - 30 || c.x > B.x1 + 30 || c.y < B.y0 - 60) c.state = 'gone';
        break;
      }
      case 'land':
        // flying in: down onto the floor
        c.z = Math.max(0, c.z - 34 * dt); c.vx *= 0.97; c.vy *= 0.97;
        if (c.z <= 0) { c.state = 'idle'; c.t = rnd(0.8, 2); }
        break;
      case 'flutter': {
        // moths: a lazy wandering flutter, drawn to the fighter's light, fleeing a swing
        if (c.t <= 0) { c.t = rnd(0.4, 1.2); const a = d < 120 && Math.random() < 0.4 ? Math.atan2(p.y - 14 - c.y, p.x - c.x) + rnd(-1.2, 1.2) : rnd(TAU); c.vx = Math.cos(a) * k.walk; c.vy = Math.sin(a) * k.walk * 0.7; }
        c.z = 8 + Math.sin(c.anim * 3) * 4;
        break;
      }
    }
    if (c.state === 'flee' && k.always) { c.state = 'flutter'; c.t = 0.6; c.vx = Math.cos(c.away) * k.sp; c.vy = Math.sin(c.away) * k.sp * 0.6; }
    c.x += c.vx * dt; c.y += c.vy * dt;
    if (Math.abs(c.vx) > 4) c.face = c.vx < 0 ? -1 : 1;
    if (c.state !== 'fly' && c.state !== 'gone') {
      c.x = Math.max(B.x0 + 2, Math.min(B.x1 - 2, c.x)); c.y = Math.max(B.y0 + 2, Math.min(B.y1 - 2, c.y));
      if (c.z < 6) pushOut(c, 2);
      // most of them keep out of the lava (the fire beetles don't mind it)
      if (!k.lava && inPool(c.x, c.y)) { c.x -= c.vx * dt * 2; c.y -= c.vy * dt * 2; c.vx = -c.vx; c.vy = -c.vy; }
    }
  }
  G.critters = G.critters.filter((c) => !c.dead && c.state !== 'gone');
}

export function drawCritter(c) {
  const k = KINDS[c.kind];
  if (!k) return;
  const air = c.state === 'fly' || c.state === 'land' || c.state === 'flutter';
  const set = air && k.flyF ? 'fly' : c.state === 'idle' && k.idleF ? 'idle' : 'walk';
  const list = frames(c.kind, set);
  const rate = set === 'fly' ? 14 : set === 'idle' ? 1.3 : c.state === 'flee' ? 16 : 9;
  const moving = set !== 'walk' || Math.abs(c.vx) + Math.abs(c.vy) > 3;
  const cv = list[moving ? Math.floor(c.anim * rate) % list.length : 0];
  const w = cv.width * 2 / 3, h = cv.height * 2 / 3;
  const fl = k.float ? 2 + Math.sin(c.anim * 4) : 0, z = c.z + fl;
  // a shadow on the floor under it (smaller the higher it is)
  if (z > 1 || air) { ctx.globalAlpha = Math.max(0.12, 0.35 - z * 0.004); ctx.fillStyle = '#05030a'; ctx.fillRect(Math.round(c.x - 2), Math.round(c.y), 4, 1); ctx.globalAlpha = 1; }
  if (k.glow) glow(c.x, c.y - z - h / 2, k.glow, 6, 0.3 + 0.15 * Math.sin(c.anim * 5));
  const x = Math.round((c.x - w / 2) * 3) / 3, y = Math.round((c.y - z - h + 1) * 3) / 3;
  // crabs walk sideways and don't turn round; everyone else faces the way they go
  if (c.face < 0 && !k.side) { ctx.save(); ctx.translate(2 * x + w, 0); ctx.scale(-1, 1); ctx.drawImage(cv, x, y, w, h); ctx.restore(); }
  else ctx.drawImage(cv, x, y, w, h);
}
