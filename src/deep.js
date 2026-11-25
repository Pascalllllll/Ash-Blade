import { ctx, P, rect, px, line, ring, disc, glow, makeCanvas } from './gfx.js?v=209';
import { A } from './audio.js?v=209';
import { G, B, TAU, clamp, hyp, angDiff, segDist, addRing, part, tryHurt, shake, sprFor, fx, rnd, freeSpot } from './world.js?v=209';

const violet = '#c599ff', bone = '#f1d9dc', brass = '#edbc78', aqua = '#80edec';
const arts = {
  wyrm: ['FAULT COIL', 'CROSS THE BREAK IN THE RING', violet, 1.0, 1.45, 4],
  herald: ['GROUND WIRE', 'STAND INSIDE THE COPPER ROD', aqua, 1.65, 0.35, 5],
  mirror: ['COUNTERSTUDY', '', '#cfdeec', 1.05, 0.35, 4],
  eclipse: ['UMBRA', 'HIDE IN THE SHADOW OF A MOON', brass, 1.8, 0.45, 6],
  clock: ['BORROWED SECONDS', 'LEAVE YOUR OLD FOOTPRINTS', brass, 1.05, 1.45, 4],
  nox: ['NIGHT LOOM', 'STEP BETWEEN THE ROOTS', violet, 1.15, 1.0, 5],
};

const arenaX = x => clamp(x, B.x0 + 10, B.x1 - 10);
const arenaY = y => clamp(y, B.y0 + 10, B.y1 - 7);
export function rememberAction(kind) {
  const h = G.habits ||= { dash: 0, weapon: 0, spell: 0 };
  for (const k in h) h[k] *= 0.88;
  h[kind] += 1;
}

function study(e, dt, p) {
  e.sampleT = (e.sampleT || 0) - dt;
  if (e.sampleT > 0) return;
  e.sampleT = 0.32;
  const trail = e.footprints ||= [];
  if (trail.length === 12) trail.shift();
  trail.push({ x: p.x, y: p.y });
  const far = hyp(e.x - p.x, e.y - p.y) > 90 ? 1 : 0;
  e.far = (e.far ?? far) * 0.87 + far * 0.13;
}

// a spot the rite marks for you: inside the arena, and never inside one of the floor's obstacles
function pin(x, y) { const q = freeSpot(arenaX(x), arenaY(y)); return { x: arenaX(q.x), y: arenaY(q.y) }; }
function makePattern(e) {
  const p = G.p, id = e.boss, spec = arts[id];
  const h = { id, t: 0, warn: spec[3], live: spec[4], dmg: spec[5], col: spec[2], title: spec[0], hint: spec[1],
    x: p.x, y: p.y, hit: false, fromX: e.x, fromY: e.y - e.r, angle: Math.atan2(p.y - e.y, p.x - e.x) };
  const space = p.x < (B.x0 + B.x1) / 2 ? 1 : -1;
  if (id === 'wyrm') {
    h.angle = Math.atan2((B.y0 + B.y1) / 2 - p.y, (B.x0 + B.x1) / 2 - p.x);
  } else if (id === 'herald') {
    h.rod = pin(p.x + space * 42, p.y + (p.y < (B.y0 + B.y1) / 2 ? 15 : -15));
  } else if (id === 'eclipse') {
    // The nearby moon always lies on the ray from the eye to the shelter. Either moon can block the light.
    const safe = pin(p.x + space * 39, p.y + (p.y < (B.y0 + B.y1) / 2 ? 12 : -12));
    const a = Math.atan2(safe.y - h.fromY, safe.x - h.fromX);
    h.moons = [pin(safe.x - Math.cos(a) * 17, safe.y - Math.sin(a) * 17),
      pin(p.x - space * 28, p.y - 25)];
  } else if (id === 'clock') {
    const trace = e.footprints || [p];
    h.marks = [0, 3, 6, 9].map(i => ({ ...trace[Math.max(0, trace.length - 1 - i)] }));
    h.beat = -1;
  } else if (id === 'mirror') {
    const habits = G.habits || {}, dash = habits.dash || 0, cast = habits.spell || 0, attack = habits.weapon || 0;
    h.read = dash > Math.max(cast, attack * 0.52) ? 'dash' : cast > attack * 0.48 && cast > 0 ? 'spell' : e.far > 0.56 ? 'range' : 'weapon';
    if (h.read === 'dash') {
      h.hint = 'IT MARKED YOUR LANDING';
      const a = p.dx || p.dy ? Math.atan2(p.dy, p.dx) : p.aim;
      h.end = pin(p.x + Math.cos(a) * 49, p.y + Math.sin(a) * 49);
    } else if (h.read === 'range') {
      h.hint = 'IT TRACED YOUR FIRING LINE';
      h.end = pin(p.x + Math.cos(h.angle) * 85, p.y + Math.sin(h.angle) * 85);
    } else if (h.read === 'spell') {
      h.hint = 'MOVE OUT OF THE SPELL SEAL'; h.r = 29;
    } else { h.hint = 'BACK AWAY FROM ITS RIPOSTE'; h.x = e.x; h.y = e.y; h.r = 40; }
  } else if (id === 'nox') {
    e.loom = (e.loom || 0) + 1;
    if (e.awakened && e.loom % 2 === 0) {
      h.heart = pin(p.x + space * 48, p.y + (p.y < (B.y0 + B.y1) / 2 ? 14 : -14));
      h.title = 'LAST LIGHT'; h.hint = 'SHELTER IN THE UNBLINKING EYE'; h.warn = 1.85; h.live = 0.7; h.dmg = 8; h.col = '#ffac80';
      h.fromY = e.y; h.fromR = 0;
    } else {
      const a = h.angle + Math.PI / 2, nx = Math.cos(a), ny = Math.sin(a);
      h.roots = [];
      for (let i = e.awakened ? -2 : -1; i <= (e.awakened ? 2 : 1); i++) {
        const x = p.x + nx * i * 35, y = p.y + ny * i * 35;
        h.roots.push([x + ny * 116, y - nx * 116, x - ny * 116, y + nx * 116]);
      }
      h.dmg = e.awakened ? 7 : 5;
    }
  }
  return h;
}

function harmful(h, p) {
  const k = clamp((h.t - h.warn) / h.live, 0, 1);
  switch (h.id) {
    case 'wyrm': {
      const a = Math.atan2(p.y - h.y, p.x - h.x);
      return Math.abs(hyp(p.x - h.x, p.y - h.y) - (75 * (1 - k) + 4)) < 7 && Math.abs(angDiff(a, h.angle)) > 0.55;
    }
    case 'herald': return hyp(p.x - h.rod.x, p.y - h.rod.y) > 18;
    case 'eclipse': return !h.moons.some(m => segDist(m.x, m.y, h.fromX, h.fromY, p.x, p.y) < 10 &&
      (p.x - m.x) * (m.x - h.fromX) + (p.y - m.y) * (m.y - h.fromY) > 0);
    case 'clock': {
      const i = Math.min(3, Math.floor(k * 4)), m = h.marks[i];
      if (i !== h.beat) { h.hit = false; h.beat = i; addRing(m.x, m.y, brass, 76, 0.3, 2); A.click(); }
      return hyp(m.x - p.x, m.y - p.y) < 17;
    }
    case 'mirror':
      if (h.read === 'range') return segDist(p.x, p.y, h.fromX, h.fromY, h.end.x, h.end.y) < 9;
      if (h.read === 'dash') return segDist(p.x, p.y, h.x, h.y, h.end.x, h.end.y) < 11;
      return hyp(h.x - p.x, h.y - p.y) < h.r;
    case 'nox':
      if (h.heart) return hyp(p.x - h.heart.x, p.y - h.heart.y) > 20 && Math.abs(hyp(p.x - h.fromX, p.y - h.fromY - h.fromR) - lightR(k)) < 26;
      return h.roots.some(r => segDist(p.x, p.y, ...r) < 8);
  }
}

// Give each boss an opening after its signature. Ordinary attacks keep their own phase and tell lengths.
export function deepBossTurn(e, dt) {
  const spec = arts[e.boss];
  if (!spec || G.p.state === 'dead' || e.state === 'intro') return false;
  if (e.boss === 'mirror' || e.boss === 'clock') study(e, dt, G.p);
  if (e.state === 'awakening') {
    e.t -= dt;
    if (e.t <= 0) { e.state = 'walk'; e.cd = 0.6; e.riteCd = 0; }
    return true;
  }
  if (!e.rite) {
    e.riteCd = (e.riteCd ?? 2.3) - dt;
    if (e.riteCd > 0 || e.state !== 'walk' || e.under || G.swallow) return false;
    const h = e.rite = makePattern(e);
    e.state = 'riteW'; e.superArmor = true;
    G.banner = { text: h.title, sub: h.hint, t: 0, life: Math.min(1.6, h.warn + 0.22), c: h.col }; A.warn();
  }
  const h = e.rite, before = h.t;
  h.t += dt; e.vx = e.vy = 0;
  if (before < h.warn && h.t >= h.warn) {
    A.riftCut(); shake(0.36);
    if (h.roots) erupt(h);
    if (h.heart) { A.boom(1.4); A.ultRelease?.(); }
  }
  if (h.t >= h.warn && h.t < h.warn + h.live && harmful(h, G.p) && !h.hit) {
    if (tryHurt(h.dmg, e.x, e.y)) h.hit = true;
  }
  if (h.t >= h.warn + h.live + 0.32) {
    // what it drew on the floor stays a moment longer and fades (drawDeepFloor)
    e.riteTail = { h, at: G.t };
    e.rite = null; e.state = 'rec'; e.t = 0.65;
    e.riteCd = e.awakened ? 3.0 : e.phase >= 2 ? 5.5 : 7;
  }
  return true;
}

// ---------- drawing ----------
// Everything here sits on the game's pixel grid like the fighters and monsters: pixel lines, discs and single pixels,
// never smooth strokes or wide see-through bands. FA is the fade of what is being drawn (a rite's floor marks die
// away over RITE_FADE seconds after it ends), and every alpha below is multiplied by it.
let FA = 1;
const alpha = (a) => { ctx.globalAlpha = FA * a; };
const RITE_FADE = 0.8;
// how far the LAST LIGHT's wave has rolled out from Nox, k 0..1 through its strike
const lightR = (k) => 24 + k * 300;
const hsh = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const ease = (k) => 1 - (1 - clamp(k, 0, 1)) ** 3;
const smooth = (k) => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
const checks = {};
function checker(c) {
  if (!checks[c]) { const cv = makeCanvas(2, 2), g = cv.getContext('2d'); g.fillStyle = c; g.fillRect(0, 0, 1, 1); g.fillRect(1, 1, 1, 1); checks[c] = ctx.createPattern(cv, 'repeat'); }
  return checks[c];
}

// the part of a line (as 0..1 along it) that lies inside the arena, or null
function clipSeg(x0, y0, x1, y1, m = 3) {
  let t0 = 0, t1 = 1;
  const dx = x1 - x0, dy = y1 - y0;
  for (const [p, q] of [[-dx, x0 - (B.x0 + m)], [dx, B.x1 - m - x0], [-dy, y0 - (B.y0 + m)], [dy, B.y1 - m - y0]]) {
    if (p === 0) { if (q < 0) return null; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r; } else { if (r < t0) return null; if (r < t1) t1 = r; }
  }
  return [t0, t1];
}

// ---- the dark's limbs
// A limb is a chain of points from root to tip (x, y already lifted off the floor, r its thickness), stamped as
// overlapping discs: a near-black outline, a dark violet body, a lighter band along its top, a lit ridge, pale
// suckers underneath, and (striking) a vein of violet light down its middle.
const TC = { out: '#0b0512', body: '#2c1648', band: '#22103a', mid: '#4b2a7c', lit: '#9466dc', suck: '#e6d2f6', vein: '#c07cff', hot: '#f6ecff' };
function sample(f, len) {
  const pts = [];
  for (let s = 0; s < 1; ) { const q = f(s); pts.push(q); s += Math.max(0.9, q.r * 0.75) / Math.max(1, len); }
  pts.push(f(1));
  return pts;
}
function shadowOf(pts) {
  alpha(0.32);
  for (const q of pts) if (q.gy !== undefined && q.gy - q.y > 1) disc(q.x, q.gy, Math.max(1, q.r * 0.8), '#05020a');
  alpha(1);
}
function tentacle(pts, hot) {
  const lite = fx.lowFx;
  alpha(1);
  for (const q of pts) disc(q.x, q.y, q.r + 1, TC.out);
  pts.forEach((q, i) => disc(q.x, q.y, q.r, Math.floor(i / 3) % 2 ? TC.band : TC.body));
  if (!lite) for (const q of pts) if (q.r >= 1.8) disc(q.x, q.y - q.r * 0.45, q.r * 0.55, TC.mid);
  for (const q of pts) if (q.r >= 1.3) px(q.x, q.y - Math.ceil(q.r * 0.85), TC.lit);
  for (let i = 1; i < pts.length; i += 3) { const q = pts[i]; if (q.r >= 2.2) px(q.x, q.y + Math.floor(q.r * 0.6), TC.suck); }
  if (hot) for (let i = 0; i < pts.length; i += 2) { const q = pts[i]; if (q.r >= 2) px(q.x, q.y - 1, (i >> 1) % 4 ? TC.vein : TC.hot); }
}
// a small curled tip pushing up out of the floor at x, y: h is how far out it is (0..1)
function tip(x, y, h, t, seed) {
  if (h <= 0) return;
  const len = 9 * h;
  const pts = sample((u) => { const c = u * u * 2.2 * h; return { x: x + Math.sin(t * 6 + seed) * 1.4 * u + Math.sin(c) * 3 * u, y: y - u * len - (1 - Math.cos(c)) * 2, r: 2.6 * (1 - u) + 0.6 }; }, len + 4);
  tentacle(pts, false);
  alpha(0.9); rect(x - 2, y, 5, 1, '#030108'); alpha(1);
}

// a jagged crack in the floor along a line (from a to b, as 0..1 along it): black, with a violet edge either side
function crack(x0, y0, x1, y1, a, b, edgeA, hot, seed) {
  const L = hyp(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / L, uy = (y1 - y0) / L, nx = -uy, ny = ux;
  const edge = hot ? '#8a4ad0' : '#6a3aa8';
  for (let d = a * L; d <= b * L; d += 1) {
    const j = Math.round(Math.sin(d * 0.21 + seed) * 0.9 + Math.sin(d * 0.067 + seed * 3) * 0.8);
    const x = x0 + ux * d + nx * j, y = y0 + uy * d + ny * j;
    alpha(1); px(x, y, '#030108');
    alpha(edgeA); px(x + nx, y + ny, edge); px(x - nx, y - ny, edge);
    if (hot) { alpha(1); px(x, y, Math.floor(d * 0.5 + G.t * 30) % 13 === 0 ? TC.hot : '#9a52e0'); }
  }
  alpha(1);
}
// dotted rails either side of a line, half a hit's width out: exactly where it will hurt, and nothing filled in
function rails(x0, y0, x1, y1, a, b, half, col, a0, t) {
  const L = hyp(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / L, uy = (y1 - y0) / L, nx = -uy, ny = ux, off = (t * 24) % 4;
  alpha(a0);
  for (let d = a * L + off; d <= b * L; d += 4) for (const sd of [-1, 1]) px(x0 + ux * d + nx * half * sd, y0 + uy * d + ny * half * sd, col);
  alpha(1);
}
// motes of night rising out of a crack
function motes(x0, y0, x1, y1, a, b, t, n, col, seed) {
  for (let i = 0; i < n; i++) {
    const u = (t * 0.8 + hsh(i * 3 + seed)) % 1, s = a + (b - a) * hsh(i + seed * 7);
    alpha((1 - u) * 0.9); px(x0 + (x1 - x0) * s + Math.sin(t * 3 + i) * 1.5, y0 + (y1 - y0) * s - u * 14, col);
  }
  alpha(1);
}

// ---- Nox's rites
// NIGHT LOOM: the floor splits along each root; then the dark weaves a limb in and out of the floor along it, humps
// rolling along it like thread through a loom, and sinks back. (It hurts along the whole crack while it strikes.)
function loom(h, t) {
  const w = clamp(h.t / h.warn, 0, 1), live = h.t >= h.warn, k = clamp((h.t - h.warn) / h.live, 0, 1);
  const urgent = !live && h.warn - h.t < 0.35, blink = Math.floor(G.time * 16) % 2;
  const rise = live ? ease(k / 0.12) * (1 - smooth((k - 0.8) / 0.2)) : 0;
  h.roots.forEach(([x0, y0, x1, y1], ri) => {
    const cl = clipSeg(x0, y0, x1, y1);
    if (!cl) return;
    const seed = ri * 13.7 + 3, L = hyp(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L;
    // the crack opens out from the middle while it warns
    const open = live ? 1 : ease(Math.min(1, w * 1.7)), a = Math.max(cl[0], 0.5 - open / 2), b = Math.min(cl[1], 0.5 + open / 2);
    if (b <= a) return;
    crack(x0, y0, x1, y1, a, b, live ? 1 : 0.35 + 0.55 * w, live && rise > 0.05, seed);
    if (!live) {
      rails(x0, y0, x1, y1, a, b, 8, urgent ? (blink ? P.paper : '#c599ff') : '#7a4ac8', 0.25 + 0.6 * w, t);
      motes(x0, y0, x1, y1, a, b, t, 10, ri % 2 ? '#b48cff' : '#5a3a8a', seed);
      // tips of it already pushing up out of the crack
      if (w > 0.5) for (let i = 0; i < 3; i++) {
        const s = a + (b - a) * (0.2 + i * 0.3), hh = ease((w - 0.5 - i * 0.08) / 0.4);
        tip(x0 + (x1 - x0) * s, y0 + (y1 - y0) * s, hh, t, seed + i);
      }
      return;
    }
    // striking: coils of the limb surface out of the crack and dive back in, rolling along it like thread through a
    // loom, snaking from side to side; thick where they're up, thin where they go under the floor
    if (rise <= 0.02) return;
    const lam = 58, phase = k * 1.6 + hsh(seed), nx = -uy, ny = ux;
    // (up for about two thirds of each turn, so the coils are long and the gaps short)
    const weave = (d) => (Math.sin(TAU * (d / lam - phase)) + 0.45) / 1.45;
    let run = [];
    const flush = () => {
      if (run.length > 2) {
        shadowOf(run);
        tentacle(run, true);
        for (const q of [run[0], run[run.length - 1]]) { alpha(1); rect(q.x - 3, q.gy + 1, 7, 1, '#030108'); px(q.x - 4, q.gy, '#4a3a5a'); px(q.x + 4, q.gy, '#4a3a5a'); }
      }
      run = [];
    };
    for (let d = a * L; d <= b * L; ) {
      const g = weave(d) * rise;
      if (g > 0.08) {
        const side = Math.sin(d * 0.11 - k * 16 + seed) * 3.6 * g;
        const gx = x0 + ux * d + nx * side, gy = y0 + uy * d + ny * side, r = 1.2 + 4.8 * Math.pow(g, 0.6);
        run.push({ x: gx, y: gy - 3 * g, gy, r });
        d += Math.max(1, r * 0.7);
      } else { flush(); d += 2; }
    }
    flush();
    // and at each end of the crack, its tip curls up out of the floor
    for (const sEnd of [a, b]) tip(x0 + (x1 - x0) * sEnd, y0 + (y1 - y0) * sEnd, rise, t, seed + sEnd * 9);
    if (Math.floor(G.time * 20) % 3 === 0) { const d = (a + (b - a) * hsh(Math.floor(G.time * 20) + ri)) * L; glow(x0 + ux * d, y0 + uy * d, '#b46cff', 8, 0.5 * FA); }
  });
}

// LAST LIGHT: an unblinking eye opens on the floor; then light burns everywhere else
function lastLight(e, h, t) {
  const m = h.heart, R = 20, w = clamp(h.t / h.warn, 0, 1), live = h.t >= h.warn, k = clamp((h.t - h.warn) / h.live, 0, 1);
  const blink = Math.floor(G.time * 14) % 2, urgent = !live && h.warn - h.t < 0.45;
  // the light gathering: pulses of it rolling out from Nox; then the light itself rolls out in one wave, a white-hot
  // edge and a band of light behind it, over everything but the eye
  const ox = h.fromX, oy = h.fromY + h.fromR;
  if (!live) {
    for (let i = 0; i < 3; i++) { const r = ((h.t * 70 + i * 50) % 150) + 10; alpha((1 - r / 160) * (0.25 + 0.5 * w)); ring(ox, oy, r, 1, '#ffac80'); }
    if (urgent && blink) { alpha(0.8); ring(m.x, m.y, R + 3, 1, P.paper); }
  } else {
    const r = lightR(k);
    ctx.save();
    ctx.beginPath(); ctx.rect(B.x0 - 400, B.y0 - 400, B.x1 - B.x0 + 800, B.y1 - B.y0 + 800); ctx.arc(m.x, m.y, R, 0, TAU, true); ctx.clip('evenodd');
    // a white-hot front, and a short glow trailing it that thins out: light, added onto the floor, not a tint over it
    ctx.globalCompositeOperation = 'lighter';
    for (const [r0, r1, a0, col] of [[r - 2, r - 9, 0.9, '#c8a088'], [r - 9, r - 18, 0.55, '#8a6050'], [r - 18, r - 26, 0.3, '#5a3a30']]) {
      if (r1 <= 0) continue;
      ctx.beginPath(); ctx.arc(ox, oy, r0, 0, TAU); ctx.arc(ox, oy, r1, 0, TAU, true);
      alpha(a0 * (1 - k * 0.5)); ctx.fillStyle = checker(col); ctx.fill('evenodd');
    }
    ctx.globalCompositeOperation = 'source-over';
    alpha(1); ring(ox, oy, r, 2, '#fff6ec'); alpha(0.8); ring(ox, oy, r - 2, 1, '#ffc8a0');
    for (let i = 0; i < 24; i++) { const a = i * TAU / 24 + k * 3; alpha(0.9); px(ox + Math.cos(a) * (r + 2), oy + Math.sin(a) * (r + 2), '#ffffff'); }
    ctx.restore();
  }
  alpha(1);
  // the eye: an almond of light on the floor, a slit pupil, and the safe circle round it, dotted
  for (let i = 0; i < 40; i++) { const a = i * TAU / 40 + t * 0.6; if (i % 2) px(m.x + Math.cos(a) * R, m.y + Math.sin(a) * R, live ? P.paper : '#ffac80'); }
  alpha(0.55); disc(m.x, m.y, R - 2, '#1a0a12'); alpha(1);
  const open = Math.min(1, w * 2);
  for (let x = -14; x <= 14; x++) { const hh = Math.round(7 * open * (1 - (x / 14) ** 2)); px(m.x + x, m.y - hh, '#ffcfa8'); px(m.x + x, m.y + hh, '#ffcfa8'); }
  if (open > 0.3) {
    disc(m.x, m.y, 5 * open, '#ff8a5a'); disc(m.x, m.y, 3.5 * open, '#ffb48a');
    rect(m.x - 1, m.y - 4, 2, 8, '#120608'); px(m.x + 2, m.y - 2, P.paper);
  }
  glow(m.x, m.y, '#ffac80', live ? 22 : 12 + 6 * w, (live ? 0.7 : 0.4) * FA);
}

// awakened Nox: roots of the dark crawl out from under it across the floor, writhing, their tips curling up
function noxRoots(e, t) {
  const s = sprFor(e), R = (s?.w || 150) * 0.34;
  const limbs = [0, 1, 2, 3].map((i) => {
    const a = 0.48 + i * Math.PI / 2 + Math.sin(t * 0.6 + i) * 0.12;
    return { i, a, ax: e.x + Math.cos(a) * R, ay: e.y + Math.sin(a) * R * 0.3 };
  }).sort((p, q) => p.ay - q.ay);
  for (const { i, a, ax, ay } of limbs) {
    const len = 44 + 6 * Math.sin(t * 1.3 + i * 2);
    const pts = sample((u) => {
      const out = u * len, sway = Math.sin(t * 2.2 + i * 1.7 - u * 5) * 5 * u;
      const gx = ax + Math.cos(a) * out - Math.sin(a) * sway, gy = ay + Math.sin(a) * out * 0.42 + Math.cos(a) * sway * 0.42;
      const lift = Math.sin(u * Math.PI) * 4 + (u > 0.78 ? (u - 0.78) ** 1.5 * 60 : 0);
      return { x: gx, y: gy - lift, gy, r: 6.4 * (1 - u) ** 0.8 + 0.9 };
    }, len);
    shadowOf(pts);
    alpha(1); rect(ax - 5, ay, 11, 1, '#030108'); px(ax - 6, ay - 1, '#4a3a5a'); px(ax + 6, ay - 1, '#4a3a5a');
    tentacle(pts, false);
  }
}

// THE DARK REACHES: each line it draws is a limb lashing out of the floor. Pending, the floor cracks along the line
// from where it will come up, dotted rails mark how wide it will hit, and its tip already shows; then it lashes the
// length of the line at once and sinks back. (world.js draws Nox's lines with this; they hurt the moment they land.)
export function drawLash(l, blink) {
  const L = hyp(l.x1 - l.x0, l.y1 - l.y0) || 1, ux = (l.x1 - l.x0) / L, uy = (l.y1 - l.y0) / L, nx = -uy, ny = ux;
  const cl = clipSeg(l.x0, l.y0, l.x1, l.y1);
  if (!cl || l.t < 0) return;
  const seed = Math.abs(Math.round(l.x0 * 7 + l.y0 * 3)) % 97, t = G.t;
  FA = 1;
  if (!l.done) {
    const w = clamp(l.t / l.pend, 0, 1), urgent = l.pend - l.t < 0.3;
    const a = cl[0], b = cl[0] + (cl[1] - cl[0]) * ease(Math.min(1, w * 1.8));
    crack(l.x0, l.y0, l.x1, l.y1, a, b, 0.35 + 0.55 * w, false, seed);
    rails(l.x0, l.y0, l.x1, l.y1, a, b, 6, urgent ? (blink ? P.paper : '#c599ff') : '#7a4ac8', 0.3 + 0.6 * w, t);
    tip(l.x0 + ux * a * L, l.y0 + uy * a * L, ease(w * 1.3), t, seed);
  } else {
    const k = clamp((l.t - l.pend) / 0.3, 0, 1), ext = ease(Math.min(1, k * 5)), sink = smooth((k - 0.45) / 0.55);
    FA = 1 - sink * 0.9;
    crack(l.x0, l.y0, l.x1, l.y1, cl[0], cl[1], 1, true, seed);
    const sa = cl[0], sb = cl[0] + (cl[1] - cl[0]) * ext, len = (sb - sa) * L;
    if (len > 4) {
      const pts = sample((u) => {
        const d = (sa + (sb - sa) * u) * L, wave = Math.sin(u * 9 - k * 30 + seed) * 2.4 * u;
        const gx = l.x0 + ux * d + nx * wave, gy = l.y0 + uy * d + ny * wave;
        return { x: gx, y: gy - 5 * (1 - ext) * (1 - u) - 2, gy, r: (5.4 * (1 - u) + 1.1) * (1 - sink * 0.45) };
      }, len);
      shadowOf(pts);
      tentacle(pts, true);
    }
  }
  FA = 1; ctx.globalAlpha = 1;
}

// the other deep bosses' rites, in pixels
function drawRite(e, h, t) {
  const live = h.t >= h.warn, k = clamp((h.t - h.warn) / h.live, 0, 1), c = live ? P.paper : h.col;
  if (h.roots) { loom(h, t); return; }
  if (h.heart) { lastLight(e, h, t); return; }
  if (h.rod) {
    const m = h.rod;
    alpha(live ? 0.42 : 0.19); disc(m.x, m.y, 18, h.col); alpha(1);
    ring(m.x, m.y, 18, 1, h.col); ring(m.x, m.y, 15, 1, h.col);
    rect(m.x - 1, m.y - 11, 3, 12, brass); px(m.x, m.y - 12, P.paper);
    if (live) { alpha(0.38); for (let i = 0; i < 10; i++) { const a = i * TAU / 10 + t * 0.7; line(m.x + Math.cos(a) * 23, m.y + Math.sin(a) * 23, m.x + Math.cos(a) * 190, m.y + Math.sin(a) * 190, c, 2); } alpha(1); }
  } else if (h.id === 'wyrm') {
    const r = 75 * (1 - k) + 4, a0 = h.angle + 0.55, a1 = h.angle + TAU - 0.55, n = Math.max(12, Math.round(r * 2.2));
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; disc(h.x + Math.cos(a) * r, h.y + Math.sin(a) * r, live ? 2 : 0.6, c); }
    for (let i = 0; i < 12; i++) { const a = h.angle + 0.62 + i * (TAU - 1.24) / 11; disc(h.x + Math.cos(a) * r, h.y + Math.sin(a) * r, 2, h.col); }
  } else if (h.moons) {
    for (const m of h.moons) {
      const a = Math.atan2(m.y - h.fromY, m.x - h.fromX);
      alpha(0.48); line(m.x, m.y, m.x + Math.cos(a) * 180, m.y + Math.sin(a) * 180, '#141125', 19); alpha(1);
      disc(m.x, m.y, 9, '#43394c'); ring(m.x, m.y, 9, 1, c); px(m.x - 3, m.y - 4, bone);
    }
  } else if (h.marks) {
    for (let i = 0; i < h.marks.length; i++) { const m = h.marks[i]; if (live && i < h.beat) continue; ring(m.x, m.y, 17, live && i === h.beat ? 4 : 1, c); line(m.x, m.y, m.x + 7 * Math.sin(i + t * 4), m.y - 7 * Math.cos(i + t * 4), brass); }
  } else if (h.end) {
    const x = h.read === 'range' ? h.fromX : h.x, y = h.read === 'range' ? h.fromY : h.y;
    alpha(0.28); line(x, y, h.end.x, h.end.y, h.col, h.read === 'range' ? 18 : 22); alpha(1); line(x, y, h.end.x, h.end.y, c, live ? 4 : 1);
    ring(h.end.x, h.end.y, 8, 1, c);
  } else if (h.r) { ring(h.x, h.y, h.r, live ? 4 : 1, c); ring(h.x, h.y, h.r * Math.min(1, h.t / h.warn), 1, h.col); }
}

export function drawDeepFloor(e) {
  if (e.dead || e.dying) return;
  const t = G.t;
  FA = 1;
  if (e.boss === 'nox' && e.awakened) noxRoots(e, t);
  if (e.rite) { FA = 1; drawRite(e, e.rite, t); }
  // a rite that just ended dies away instead of vanishing
  const tail = e.riteTail;
  if (tail) {
    const f = (G.t - tail.at) / RITE_FADE;
    if (f >= 1 || e.rite) e.riteTail = null;
    else { FA = (1 - f) * (1 - f); drawRite(e, tail.h, t); }
  }
  FA = 1; ctx.globalAlpha = 1;
}

// the moment the loom strikes: stone chips and sparks thrown up all along each crack
function erupt(h) {
  for (const [x0, y0, x1, y1] of h.roots) {
    const cl = clipSeg(x0, y0, x1, y1);
    if (!cl) continue;
    const L = hyp(x1 - x0, y1 - y0);
    for (let d = cl[0] * L; d <= cl[1] * L; d += 9) {
      const x = x0 + (x1 - x0) * d / L, y = y0 + (y1 - y0) * d / L;
      part(x, y, rnd(-30, 30), rnd(-12, 12), rnd(0.4, 0.8), Math.random() < 0.5 ? '#3a3048' : '#5a4a6a', { z: 2, vz: rnd(50, 130), g: 360, drag: 1.5, s: 2 });
      if (Math.random() < 0.5) part(x, y - 3, rnd(-12, 12), -rnd(20, 50), rnd(0.3, 0.6), '#c07cff', { glow: true, drag: 2 });
    }
  }
}

export function awakenNox(e) {
  if (e.boss !== 'nox' || e.awakened) return false;
  e.awakened = true; e.phase = 4; e.state = 'awakening'; e.t = 1.9; e.rite = null;
  e.hp = e.maxHp = Math.round(e.maxHp * 0.65); e.chip = e.hp; e.r = 32; e.speed *= 1.14;
  e.loom = 0; e.enraged = false; e.fightT = 0; e.kx = e.ky = e.vx = e.vy = 0;
  G.hlines.length = G.hbeams.length = 0;
  for (const s of G.shots) if (s.owner === 'enemy') s.dead = true;
  for (const s of G.strikes) if (!s.friendly) s.dead = true;
  G.banner = { text: 'NOX UNBOUND', sub: 'THE SHROUD WAS ONLY A SKIN', t: 0, life: 1.9, c: '#ffac80' };
  for (let i=0;i<3;i++) addRing(e.x,e.y-32,i%2?violet:bone,90+i*45,0.8,2);
  A.rift(); A.bossRoar(); shake(0.8);
  return true;
}

export function noxDust(e, dt) {
  e.dying = Math.max(0,e.dying-dt);
  e.dustAcc = (e.dustAcc || 0) + dt*62;
  const sprite = sprFor(e), k = 1-e.dying/2.2;
  while(e.dustAcc >= 1) {
    e.dustAcc--;
    const x=e.x+(Math.random()-0.5)*sprite.w*(0.36+0.50*Math.sin(Math.PI*k)), y=e.y-sprite.h*(1-k);
    part(x,y,18+Math.random()*47,-10-Math.random()*25,0.8+Math.random()*0.6,Math.random()<0.33?bone:violet,{drag:0.7,s:1});
  }
  return e.dying === 0;
}
