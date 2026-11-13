import { W, H, ctx, P, makeCanvas, rect, px, line, disc, ring, drawSprite, glow, textO } from './gfx.js';
import { SPR } from './sprites.js';
import { A } from './audio.js';
import { input, keyDown, keyHit } from './input.js';
import { settings, OPTIONS, best } from './store.js';
import { AW, AH, B, TORCHES, MAPS, buildFloor } from './maps.js';
import { CHARS, ALLY } from './chars.js';
import { BOSSES, bossFor } from './bosses.js';
import { byId } from './upgrades.js';

export { AW, AH, B };
export const TAU = Math.PI * 2;
export const rnd = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
export const hyp = Math.hypot;
export function sweep(arr, keep) { let j = 0; for (let i = 0; i < arr.length; i++) if (keep(arr[i])) arr[j++] = arr[i]; arr.length = j; }
export const alive = (e) => !e.dead && !e.dying && e.state !== 'spawn' && !e.under;
export function segDist(px0, py0, x0, y0, x1, y1) {
  const vx = x1 - x0, vy = y1 - y0, L = vx * vx + vy * vy || 1;
  const t = clamp(((px0 - x0) * vx + (py0 - y0) * vy) / L, 0, 1);
  return hyp(px0 - (x0 + vx * t), py0 - (y0 + vy * t));
}

export const RANKS = [
  { n: 0, l: 'D', w: 'DULL', c: 'dust', m: 1 },
  { n: 5, l: 'C', w: 'CRISP', c: 'bone', m: 1.2 },
  { n: 12, l: 'B', w: 'BRUTAL', c: 'ember2', m: 1.5 },
  { n: 22, l: 'A', w: 'ASHEN', c: 'ember', m: 2 },
  { n: 36, l: 'S', w: 'SAVAGE', c: 'hex', m: 3 },
  { n: 56, l: 'SS', w: 'SUPREME', c: 'volt', m: 4 },
  { n: 85, l: 'SSS', w: 'SWORD SAINT', c: 'gold', m: 6 },
];
const rankOf = (c) => { let r = 0; for (let i = 0; i < RANKS.length; i++) if (c >= RANKS[i].n) r = i; return r; };

export const DEF = {
  husk: { r: 5, hp: 7, kbRes: 0, col: '#b5f23a', colD: '#45651a', score: 100, speed: 40, energy: 2 },
  wisp: { r: 5, hp: 5, kbRes: 0, col: '#ff4fa8', colD: '#6e1b52', score: 150, speed: 46, energy: 3 },
  tick: { r: 4, hp: 3, kbRes: 0, col: '#ff5a3c', colD: '#6b0f24', score: 80, speed: 74, energy: 1 },
  brute: { r: 9, hp: 46, kbRes: 0.8, col: '#b5f23a', colD: '#45651a', score: 450, speed: 26, energy: 6 },
  larva: { r: 3, hp: 2, kbRes: 0, col: '#b5f23a', colD: '#45651a', score: 20, speed: 100, energy: 0 },
  egg: { r: 4, hp: 12, kbRes: 1, col: '#c9d48a', colD: '#45651a', score: 40, speed: 0, energy: 1 },
};
export const DIFF = {
  EASY: { hp: 0.7, spd: 0.9, count: 0.85, dmg: 0, php: 4, score: 0.6 },
  NORMAL: { hp: 1, spd: 1, count: 1, dmg: 0, php: 0, score: 1 },
  HARD: { hp: 1.35, spd: 1.1, count: 1.2, dmg: 0, php: 0, score: 1.5 },
  NIGHTMARE: { hp: 1.7, spd: 1.22, count: 1.4, dmg: 1, php: -2, score: 2.2 },
};

// ---------- vibration (phones that support it; iPhone browsers don't) ----------
const VIBE = { OFF: 0, LIGHT: 0.5, MEDIUM: 1, STRONG: 1.8 };
// even entries buzz (scaled by the setting), odd entries are pauses
const BUZZ = { tap: [12], hit: [16], kill: [26], heavy: [40], hurt: [90], parry: [18, 40, 28], boom: [60], ult: [40, 50, 140], boss: [140, 70, 260] };
export const canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
let lastBuzz = 0;
export function buzz(kind) {
  const k = VIBE[settings.vibe];
  if (!k || !canVibrate) return;
  const now = performance.now();
  if (kind !== 'hurt' && kind !== 'boss' && now - lastBuzz < 70) return;
  lastBuzz = now;
  try { navigator.vibrate(BUZZ[kind].map((v, i) => (i % 2 ? v : Math.max(5, Math.round(v * k))))); } catch { /* blocked */ }
}

// ---------- feel ----------
export const fx = { trauma: 0, shakeT: 0, freeze: 0, slowT: 0, slowF: 1, flashT: 0, flashMax: 1, flashC: '#fff', flashStrong: false, flashLog: [], cam: { x: 0, y: 0 }, ox: 0, oy: 0, hurtVig: 0 };
export function hitstop(d) { fx.freeze = Math.max(fx.freeze, d); }
export function slowmo(d, f) { if (fx.slowT <= 0 || f < fx.slowF) fx.slowF = f; fx.slowT = Math.max(fx.slowT, d); }
export function shake(a) { fx.trauma = Math.min(1, fx.trauma + a); if (a >= 0.6) buzz('boom'); }
export function flash(c, d, strong) {
  if (strong) {
    const now = performance.now();
    fx.flashLog = fx.flashLog.filter((t) => now - t < 1000);
    if (fx.flashLog.length >= 3) return;
    fx.flashLog.push(now);
  }
  fx.flashC = c; fx.flashT = d; fx.flashMax = d; fx.flashStrong = !!strong;
}

// ---------- arena canvases ----------
export const floor = makeCanvas(AW, AH);
export const decal = makeCanvas(AW, AH);
const dctx = decal.getContext('2d');
let floorKey = null;
export function showMap(key) { if (floorKey !== key) { buildFloor(floor, key); floorKey = key; } }

export function stain(x, y, c, s = 1) { dctx.globalAlpha = 0.8; dctx.fillStyle = c; dctx.fillRect(Math.round(x), Math.round(y), s, s); dctx.globalAlpha = 1; }
export function splat(x, y, size, c, c2) {
  for (let i = 0; i < size * 4; i++) {
    const a = rnd(TAU), d = Math.pow(Math.random(), 1.6) * size;
    stain(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, Math.random() < 0.3 ? c : c2, Math.random() < 0.3 ? 2 : 1);
  }
}
export function scorch(x, y, r) {
  for (let i = 0; i < r * 9; i++) {
    const a = rnd(TAU), d = Math.sqrt(Math.random()) * r;
    stain(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.75, d < r * 0.5 ? '#050308' : '#15111d', 2);
  }
}

// ---------- run state ----------
export let G = null;

function makePlayer(kit, D) {
  const s = kit.stats;
  return {
    x: AW / 2, y: (B.y0 + B.y1) / 2 + 20, vx: 0, vy: 0, r: 5, hp: s.hp + D.php, maxHp: s.hp + D.php, aim: -Math.PI / 2, moveAng: 0,
    state: 'move', t: 0, step: 0, atkT: 0, atkDur: 0, cancelAt: 0, atkAng: 0, swing: null, swingHit: null, comboWin: 0,
    bufAtk: 0, bufDash: 0, bufQ: 0, bufE: 0, bufR: 0, dashT: 0, dashCd: 0, charges: kit.dash.charges, dashMax: kit.dash.charges,
    dx: 0, dy: 0, inv: 0, hurtT: -9, recT: 0, energy: 50, ult: 0, ultLock: 0, cdQ: 0, cdE: 0,
    runT: 0, stepT: 0, ghostT: 0, ascend: 0, orbitA: 0, orbitHit: new Map(), perfectUsed: false, phantomHit: null, invis: 0, shield: 0, shieldT: 0, fortress: 0, slowMul: 1, hitCount: 0,
    k: kit.init ? kit.init() : {},
  };
}

export function newRun(charId, save) {
  dctx.clearRect(0, 0, AW, AH);
  const char = OPTIONS.char.includes(charId) ? charId : 'BLADE';
  const mapKey = save ? save.map : settings.map, diffKey = save ? save.diff : settings.diff;
  const kit = CHARS[char], D = DIFF[diffKey];
  showMap(mapKey);
  G = {
    char, kit, mapKey, map: MAPS[mapKey], diffKey, D,
    t: 0, time: 0, wave: 0, score: 0, kills: 0, maxCombo: 0, bestRank: 0, combo: 0, comboT: 0, rank: 0, rankPop: 0,
    p: makePlayer(kit, D),
    E: [], shots: [], parts: [], slashes: [], texts: [], bolts: [], rings: [], gibs: [], picks: [], sigils: [], ghosts: [],
    booms: [], cuts: [], quakes: [], timers: [], glitches: [], strikes: [], zones: [], hlines: [], hbeams: [], allies: [], amb: [],
    queue: [], spawnCd: 0, phase: 'intro', phaseT: 2, banner: null, dark: 0,
    up: { wpn: 1, spell: 1, crit: 0, magnet: 0, thorns: 0, orbit: 0, dashMul: 1, cdMul: 1, evoWpn: 0, evoSpell: 0, evoUlt: 0, evoHeart: 0, evoSwift: 0, evoStatic: 0, evoEmber: 0, evoOrbit: 0, dmg: 1, spd: 1, reach: 1, regen: 1, static: 0, ember: 0, phantom: 0, mirror: 0, debt: 0, shrap: 1, exec: 0, focus: 1, echo: 0, storm: 0, mag: 0, pierce: 0, frost: 0, twin: 0, venom: 0, overclock: 0, hands: 0, after: 0, coolant: 0, cluster: 0 },
    taken: {}, cine: null, boss: null, dead: false, deadT: 0, wantUpgrade: false, victory: false, won: false,
    pickChain: 0, pickChainT: 0, debtKills: 0, deny: { q: 0, e: 0, r: 0 }, startBest: best.score,
  };
  for (const [x, y, r] of G.map.pools) G.zones.push({ type: 'lava', x, y, r, t: 0, life: Infinity });
  fx.trauma = 0; fx.freeze = 0; fx.slowT = 0; fx.slowF = 1; fx.hurtVig = 0;
  if (save) {
    // re-apply every upgrade the save says was taken, then restore the exact numbers
    for (const id in save.taken) { const u = byId(id); for (let i = 0; i < save.taken[id]; i++) u.f(G.up, G.p); G.taken[id] = save.taken[id]; }
    Object.assign(G, { score: save.score, kills: save.kills, maxCombo: save.maxCombo, bestRank: save.bestRank, won: save.won, time: save.time });
    Object.assign(G.p, { hp: save.hp, maxHp: save.maxHp, energy: save.energy, ult: save.ult, dashMax: save.dashMax, charges: save.dashMax });
    if (G.kit.init) G.p.k = G.kit.init();
    startWave(save.wave);
  } else startWave(1);
  G.cine = G.kit.entrance();
  fx.cam.x = clamp(G.p.x - W / 2, 0, AW - W); fx.cam.y = clamp(G.p.y - H / 2, 0, AH - H);
}

// checkpoint taken at the start of each wave
export function snapshot() {
  const p = G.p;
  return {
    v: 1, char: G.char, map: G.mapKey, diff: G.diffKey, wave: G.wave, score: G.score, kills: G.kills, maxCombo: G.maxCombo,
    bestRank: G.bestRank, won: G.won, time: Math.round(G.time), hp: p.hp, maxHp: p.maxHp, energy: Math.round(p.energy),
    ult: Math.round(p.ult), dashMax: p.dashMax, taken: { ...G.taken },
  };
}

export const isBossWave = (n) => n % 5 === 0;

export function startWave(n) {
  G.wave = n;
  G.phase = 'intro';
  G.phaseT = 1.7;
  G.wantUpgrade = false;
  G.dark = 0;
  G.undyingUsed = false;
  const boss = isBossWave(n);
  G.queue = buildQueue(n);
  if (boss) {
    const bd = BOSSES[bossFor(n)];
    G.banner = { text: bd.name, sub: bd.sub, t: 0, life: 2.6, c: bd.col };
    A.scene(bd.music);
  } else {
    G.banner = { text: 'WAVE ' + n, sub: n === 1 ? G.kit.tip : n === 2 ? 'PINK ORBS CAN BE HIT BACK' : endless() ? 'ENDLESS  +' + endless() * 15 + '% ENEMY HEALTH' : '', t: 0, life: 1.9, c: endless() ? P.blood : P.paper };
    A.scene('fight');
  }
  A.waveStart(boss);
}

function buildQueue(n) {
  if (isBossWave(n)) return ['boss'];
  if (n === 1) return ['husk', 'husk', 'husk', 'husk', 'husk', 'husk'];
  const q = [];
  let budget = (6 + n * 2.6) * G.D.count * (1 + 0.1 * endless());
  const pool = [['husk', 1, 5]];
  if (n >= 2) pool.push(['wisp', 2, 3]);
  if (n >= 3) pool.push(['tick', 1, 3]);
  if (n >= 4) pool.push(['brute', 5, n >= 7 ? 2 : 1]);
  const total = pool.reduce((s, x) => s + x[2], 0);
  while (budget > 0) {
    let k = rnd(total), pick = pool[0];
    for (const it of pool) { if ((k -= it[2]) <= 0) { pick = it; break; } }
    q.push(pick[0]);
    budget -= pick[1];
  }
  return q;
}

export function spawnEnemy(type, x, y) {
  let d = DEF[type];
  const ef = endless(), sc = (1 + (G.wave - 1) * 0.09) * G.D.hp * (1 + 0.15 * ef);
  const e = {
    type, def: d, x, y, z: 0, vx: 0, vy: 0, kx: 0, ky: 0, r: 0, hp: 0, maxHp: 0,
    state: 'spawn', t: 0.28, cd: rnd(0.4, 1.4), flash: 0, shakeT: 0, face: 1, burn: 0, burnTick: 0, burnDps: 0,
    marked: 0, frozen: 0, stunT: 0, anim: rnd(10), lock: 0, hitP: false, superArmor: false, orbit: Math.random() < 0.5 ? 1 : -1,
    wx: x, wy: y, elite: false,
  };
  if (type === 'boss') {
    const key = bossFor(G.wave), bd = BOSSES[key], tier = Math.floor((G.wave / 5 - 1) / 8);
    d = { r: bd.r, hp: bd.hp, kbRes: 0.97, col: bd.col, colD: bd.colD, score: bd.score, speed: bd.speed, energy: 0 };
    e.def = d; e.boss = key;
    e.hp = Math.round(bd.hp * 1.25 * (1 + tier * 0.6) * G.D.hp * (1 + 0.12 * ef));
    d.scale = bd.scale || 1; d.tint = bd.tint;
    e.speed = bd.speed * (1 + tier * 0.1);
    e.phase = 1; e.last = ''; e.cd = 1;
    G.boss = e;
    bd.init?.(e);
  } else {
    e.hp = Math.round(d.hp * sc);
    e.speed = d.speed * (1 + Math.min(0.45, (G.wave - 1) * 0.03)) * G.D.spd * Math.min(1.35, 1 + 0.012 * ef);
    if (type !== 'egg' && type !== 'larva' && G.wave >= 6 && Math.random() < Math.min(0.6, 0.06 + G.wave * 0.012 + 0.03 * ef)) { e.elite = true; e.hp = Math.round(e.hp * 2.4); e.speed *= 1.1; }
  }
  e.r = d.r;
  e.maxHp = e.hp;
  G.E.push(e);
  return e;
}

// ---------- particles & small effects ----------
export function part(x, y, vx, vy, life, c, o) {
  const low = settings.particles === 'LOW';
  if (G.parts.length > (low ? 600 : 1500) || (low && !o?.keep && Math.random() < 0.5)) return;
  G.parts.push({ x, y, vx, vy, life, t: 0, c, z: o?.z ?? 0, vz: o?.vz ?? 0, g: o?.g ?? 0, drag: o?.drag ?? 5, s: o?.s ?? 1, blood: o?.blood, glow: o?.glow });
}
export function bleed(x, y, dir, n, c, c2, force = 1) {
  for (let i = 0; i < n; i++) {
    const a = dir + rnd(-0.8, 0.8), sp = rnd(40, 175) * force;
    part(x, y, Math.cos(a) * sp, Math.sin(a) * sp, 2, Math.random() < 0.55 ? c : c2, { z: rnd(3, 10), vz: rnd(10, 90), g: 320, drag: 2.4, blood: true, s: Math.random() < 0.3 ? 2 : 1 });
  }
}
export function sparks(x, y, dir, n, spread, c, sp = 200) {
  for (let i = 0; i < n; i++) {
    const a = dir + rnd(-spread, spread), v = rnd(sp * 0.4, sp);
    part(x, y, Math.cos(a) * v, Math.sin(a) * v, rnd(0.1, 0.28), Math.random() < 0.5 ? P.paper : c, { drag: 8, glow: true });
  }
}
export function dust(x, y, n, sp = 50) {
  for (let i = 0; i < n; i++) { const a = rnd(TAU), v = rnd(10, sp); part(x, y, Math.cos(a) * v, Math.sin(a) * v * 0.6, rnd(0.25, 0.5), Math.random() < 0.5 ? P.stone2 : P.stone, { drag: 6 }); }
}
export function addText(x, y, s, c, sc = 1, num = false) { if (num && !settings.numbers) return; G.texts.push({ x, y, s, c, sc, t: 0, life: 0.75 }); }
export function glitch(x, y, w, h, life = 0.3, n = 8) { G.glitches.push({ x, y, w, h, t: 0, life, n }); }
export function addRing(x, y, c, vr, life, th = 2, r = 2) { G.rings.push({ x, y, r, vr, t: 0, life, c, th }); }
export function ghost(p, c = P.volt, spr) {
  G.ghosts.push({ x: p.x, y: p.y, flip: Math.cos(p.aim) < 0, t: 0, life: 0.26, c, spr: spr || SPR.chars[G.char].idle });
}

// ---------- combo ----------
export function addCombo(n) {
  G.combo += n;
  G.comboT = 3;
  if (G.combo > G.maxCombo) G.maxCombo = G.combo;
  const r = rankOf(G.combo);
  if (r > G.rank) {
    G.rank = r; G.rankPop = 1; A.rank(r);
    if (r > G.bestRank) G.bestRank = r;
    if (r >= 4 && !G.boss) A.scene('hot');
  }
}

// ---------- damage ----------
export const pd = (x) => Math.max(1, Math.round(x * G.up.dmg));

export function sprFor(e) {
  const frames = e.type === 'boss' ? (e.boss === 'mirror' ? [SPR.chars[G.char].idle, ...SPR.chars[G.char].run] : SPR[e.boss]) : SPR[e.type];
  const speed = e.type === 'wisp' ? 4 : e.type === 'tick' || e.type === 'larva' ? 14 : e.type === 'egg' ? 3 : 7;
  return frames[Math.floor(e.anim * speed) % frames.length];
}

export function damage(e, dmg, o) {
  if (e.dead || e.dying || e.under) return false;
  const up = G.up, p = G.p;
  if (e.boss) BOSSES[e.boss].onHit?.(e, o);
  if (e.frozen > 0) dmg *= 1.5;
  const melee = o.ug, spell = !o.ug && o.src !== 'burn' && o.src !== 'lava' && o.src !== 'wall';
  if (melee) dmg *= up.wpn;
  if (spell) dmg *= up.spell;
  if (p.ascend > 0 && o.src !== 'lava') dmg *= 2;
  if (G.kit.dmgScale && o.src !== 'lava' && o.src !== 'wall') dmg *= G.kit.dmgScale();
  if (melee && !o.crit && Math.random() < up.crit) { dmg *= 2; o.crit = true; }
  if (up.exec && e.hp < e.maxHp * 0.2 && o.src !== 'lava') dmg *= 1.6;
  if (e.armor) dmg *= e.armor;
  dmg = Math.max(1, Math.round(dmg));
  e.hp -= dmg;
  e.flash = 0.1; e.shakeT = 0.14;
  if (o.kb && !e.frozen) { const k = 1 - e.def.kbRes; e.kx += Math.cos(o.dir) * o.kb * k; e.ky += Math.sin(o.dir) * o.kb * k; }
  if (!e.superArmor && o.src !== 'burn' && o.src !== 'lava' && (e.type === 'husk' || e.type === 'wisp' || e.type === 'tick')) {
    if (e.state !== 'fuse' && e.state !== 'spawn') { e.state = 'hurt'; e.t = 0.22; e.hitP = false; }
  }
  if (o.src !== 'burn' && o.src !== 'lava') bleed(e.x, e.y, o.dir ?? rnd(TAU), Math.min(14, 3 + dmg), e.def.col, e.def.colD, o.kb ? 1 : 0.5);
  addText(e.x + rnd(-3, 3), e.y - e.r * 2 - 6, String(dmg), o.crit ? P.gold : o.src === 'bolt' || o.src === 'orb' ? P.volt : o.src === 'burn' || o.src === 'lava' ? P.ember : P.paper, o.crit ? 2 : 1, true);
  if (o.src !== 'burn' && o.src !== 'lava') addCombo(1);
  if (o.ug) {
    if (p.ultLock <= 0 && !G.cine) p.ult = Math.min(100, p.ult + dmg * 0.25 * up.focus * G.kit.ultRate);
    p.energy = Math.min(100, p.energy + G.kit.energyHit);
    p.hitCount++;
    if (up.ember && e.hp > 0) { e.burn = 2; e.burnDps = 2 * up.ember; }
    if (up.static && p.hitCount % (up.evoStatic ? 4 : 8) === 0) chainLightning(e, up.evoStatic ? 7 : 1 + up.static * 2, up.evoStatic ? 7 : 4);
    if (up.evoWpn && Math.random() < 0.3) {
      shoot({ x: e.x, y: e.y - e.r - 4, a: rnd(TAU), sp: 160, dmg: pd(4) * up.wpn, kb: 50, life: 1.5, kind: 'arcane', r: 2, c: P.gold, homing: 7, ug: false });
    }
  }
  if (e.hp <= 0) { kill(e, o); return true; }
  return false;
}

export function kill(e, o) {
  const dir = o.dir ?? rnd(TAU);
  if (e.type === 'boss') { bossDeath(e); return; }
  e.dead = true;
  G.kills++;
  if (o.slice) { makeGibs(e, dir); A.slice(); }
  bleed(e.x, e.y, dir, e.type === 'brute' ? 30 : 16, e.def.col, e.def.colD, 1.2);
  bleed(e.x, e.y, rnd(TAU), 8, e.def.col, e.def.colD, 0.6);
  splat(e.x, e.y, e.r + 4, e.def.col, e.def.colD);
  addRing(e.x, e.y - e.r, P.paper, 170, 0.16, 2);
  const motes = e.def.energy + (Math.random() < 0.5 ? 1 : 0) + (e.elite ? 4 : 0);
  for (let i = 0; i < motes; i++) dropPick(e.x, e.y, 'energy');
  if (G.p.hp < G.p.maxHp && Math.random() < (e.type === 'brute' ? 0.4 : e.elite ? 0.3 : 0.05)) dropPick(e.x, e.y, 'heal');
  G.score += Math.round(e.def.score * (e.elite ? 3 : 1) * (1 + G.combo * 0.02) * RANKS[G.rank].m * G.D.score);
  if (o.ug && G.p.ultLock <= 0 && !G.cine) G.p.ult = Math.min(100, G.p.ult + 3 * G.up.focus * G.kit.ultRate);
  hitstop(o.src === 'primary' ? 0.06 : 0.03);
  shake(e.type === 'brute' ? 0.55 : 0.3);
  A.kill(); buzz('kill');
  if (e.type === 'tick') G.booms.push({ x: e.x, y: e.y, t: 0.09, friendly: true });
  if (G.up.evoEmber && e.burn > 0) G.booms.push({ x: e.x, y: e.y, t: 0.05, friendly: true, R: 26, dmg: 8 });
  if (e.frozen > 0 && G.up.frost) shatter(e);
  if (G.up.debt && ++G.debtKills >= 20) { G.debtKills = 0; healPlayer(1); }
}

function shatter(e) {
  for (let i = 0; i < 16; i++) { const a = rnd(TAU), v = rnd(60, 200); part(e.x, e.y - 5, Math.cos(a) * v, Math.sin(a) * v, 0.4, Math.random() < 0.5 ? P.volt : P.paper, { drag: 5, glow: true }); }
  for (const o of G.E) if (alive(o) && o !== e && hyp(o.x - e.x, o.y - e.y) < 34) damage(o, pd(6), { dir: Math.atan2(o.y - e.y, o.x - e.x), kb: 120, src: 'bolt' });
  addRing(e.x, e.y - 5, P.volt, 200, 0.2, 2);
  A.freeze();
}

export function makeGibs(e, dir) {
  const s = sprFor(e), sa = dir + Math.PI / 2;
  for (const side of [1, -1]) {
    const nx = -Math.sin(sa) * side, ny = Math.cos(sa) * side;
    G.gibs.push({
      s, flip: e.face < 0, x: e.x, y: e.y, z: 0, vz: rnd(30, 80), sa, side, t: 0, life: rnd(0.75, 1),
      vx: nx * rnd(25, 60) + Math.cos(dir) * rnd(30, 80), vy: ny * rnd(25, 60) + Math.sin(dir) * rnd(30, 80),
      col: e.def.col, col2: e.def.colD,
    });
  }
}

export function dropPick(x, y, kind) {
  const a = rnd(TAU), v = rnd(30, 90);
  G.picks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, z: 4, vz: rnd(40, 90), kind, t: 0 });
}

export function healPlayer(n) {
  const p = G.p;
  if (p.hp >= p.maxHp) return;
  p.hp = Math.min(p.maxHp, p.hp + n);
  addText(p.x, p.y - 22, '+' + n, P.blood, 1);
  A.heal();
}

// enemy attacks call this; returns true (hit), 'perfect', 'blocked' or false
export function tryHurt(dmg, sx, sy) {
  const p = G.p;
  if (p.state === 'dead' || G.cine || p.fortress > 0) return false;
  if (p.state === 'dash' || (p.state === 'skill' && p.k.skillInv)) { if (p.state === 'dash' && !p.perfectUsed) perfectDodge(); return 'perfect'; }
  if (p.inv > 0) return false;
  if (p.shield > 0) {
    p.shield--; p.inv = 0.5;
    addRing(p.x, p.y - 6, P.volt, 180, 0.25, 2); A.shieldHit();
    if (p.shield <= 0) G.kit.onShieldBreak?.(p);
    return 'blocked';
  }
  dmg += G.D.dmg;
  if (G.up.thorns) {
    for (const e of G.E) if (alive(e) && hyp(e.x - p.x, e.y - p.y) < 50) damage(e, pd(10 * G.up.thorns), { dir: Math.atan2(e.y - p.y, e.x - p.x), kb: 260, src: 'bolt' });
    addRing(p.x, p.y - 6, P.blood, 260, 0.25, 2);
  }
  if (p.hp - dmg <= 0 && G.up.evoHeart && !G.undyingUsed) {
    G.undyingUsed = true; p.hp = 3; p.inv = 2; slowmo(1, 0.25); flash(P.gold, 0.3, true); A.ultRelease(); buzz('boss');
    addText(p.x, p.y - 26, 'UNDYING', P.gold, 2); addRing(p.x, p.y - 6, P.gold, 300, 0.5, 3);
    return 'blocked';
  }
  p.hp -= dmg;
  p.inv = 1.1; p.hurtT = 0.3;
  const a = Math.atan2(p.y - sy, p.x - sx);
  p.vx = Math.cos(a) * 220; p.vy = Math.sin(a) * 220;
  if (p.state === 'attack' || p.state === 'recover') p.state = 'move';
  hitstop(0.12); shake(0.65); flash(P.blood, 0.22, false); A.hurt();
  buzz('hurt');
  fx.hurtVig = 1;
  bleed(p.x, p.y, a, 14, P.blood, P.bloodD, 1);
  if (G.combo >= 5) addText(p.x, p.y - 24, 'COMBO LOST', P.dust);
  G.combo = 0; G.rank = 0; G.comboT = 0;
  if (!G.boss) A.scene('fight');
  if (p.hp <= 0) die();
  return true;
}

function perfectDodge() {
  const p = G.p;
  p.perfectUsed = true;
  slowmo(0.6, 0.3);
  p.energy = Math.min(100, p.energy + 12);
  p.inv = Math.max(p.inv, 0.45);
  addText(p.x, p.y - 24, 'PERFECT', P.volt, 1);
  addRing(p.x, p.y - 6, P.volt, 220, 0.35, 2);
  A.perfect(); buzz('parry');
  addCombo(1);
}

function die() {
  const p = G.p;
  p.hp = 0; p.state = 'dead'; G.dead = true; G.deadT = 0;
  slowmo(2, 0.25); shake(1); flash(P.blood, 0.4, true);
  A.death(); A.scene('dead'); A.stopLoops();
  bleed(p.x, p.y, rnd(TAU), 40, P.blood, P.bloodD, 1.4);
  splat(p.x, p.y, 12, P.blood, P.bloodD);
  const s = SPR.chars[G.char].idle;
  G.gibs.push(...[1, -1].map((side) => ({ s, flip: false, x: p.x, y: p.y, z: 0, vz: 60, sa: 0.4, side, t: 0, life: 2.5, vx: side * 20, vy: side * 30, col: P.blood, col2: P.bloodD })));
}

// ---------- projectiles ----------
export function shoot(o) {
  const s = {
    owner: 'player', x: o.x, y: o.y, vx: Math.cos(o.a) * o.sp, vy: Math.sin(o.a) * o.sp, r: o.r ?? 2, dmg: o.dmg, kb: o.kb ?? 60,
    life: o.life ?? 1, t: 0, kind: o.kind ?? 'bullet', c: o.c ?? P.gold, pierce: o.pierce ?? 0, bounce: o.bounce ?? 0,
    homing: o.homing ?? 0, splash: o.splash, hit: new Set(), ug: o.ug ?? true, slice: o.slice ?? false, poison: o.poison, freeze: o.freeze,
    spin: 0, trail: o.trail ?? true, onHit: o.onHit,
  };
  G.shots.push(s);
  return s;
}
export function fire(x, y, a, sp, o = {}) {
  G.shots.push({ owner: 'enemy', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: o.r ?? 3, life: o.life ?? 6, dmg: o.dmg ?? 1, t: 0, c: o.c ?? (o.noparry ? P.blood : P.hex), noparry: !!o.noparry, accel: o.accel ?? 0, trail: true, ret: o.ret, retT: o.retT, fist: o.fist });
}

export function chainLightning(src, jumps, dmg) {
  let cur = src;
  const hit = new Set([src]);
  for (let i = 0; i < jumps; i++) {
    let best = null, bd = i === 0 ? 150 : 95;
    for (const e of G.E) {
      if (!alive(e) || hit.has(e)) continue;
      const d = hyp(e.x - cur.x, e.y - cur.y);
      if (d < bd) { bd = d; best = e; }
    }
    if (!best) break;
    hit.add(best);
    G.bolts.push({ x0: cur.x, y0: cur.y - 6, x1: best.x, y1: best.y - best.r, t: 0, life: 0.3 });
    damage(best, pd(dmg), { dir: Math.atan2(best.y - cur.y, best.x - cur.x), kb: 70, src: 'bolt' });
    sparks(best.x, best.y - best.r, rnd(TAU), 6, Math.PI, P.volt);
    cur = best;
  }
}

export function explode(x, y, friendly, R0 = 34, dmg0 = 14) {
  const R = friendly ? R0 * G.up.shrap : R0;
  for (const e of G.E) {
    if (!alive(e)) continue;
    if (hyp(e.x - x, e.y - y) < R + e.r) damage(e, friendly ? pd(dmg0 * G.up.shrap) : 8, { dir: Math.atan2(e.y - y, e.x - x), kb: 260, src: 'boom' });
  }
  if (!friendly && hyp(G.p.x - x, G.p.y - y) < R) tryHurt(2, x, y);
  addRing(x, y - 4, P.ember2, R * 7, 0.16, 3);
  addRing(x, y - 4, P.paper, R * 5, 0.12, 1);
  for (let i = 0; i < 30; i++) {
    const a = rnd(TAU), v = rnd(40, 260);
    part(x, y, Math.cos(a) * v, Math.sin(a) * v * 0.8, rnd(0.2, 0.5), [P.ember, P.ember2, P.ember3, P.paper][i % 4], { drag: 5, glow: true, z: 4, vz: rnd(20, 100), g: 200 });
  }
  scorch(x, y, R * 0.6);
  hitstop(0.04); shake(0.45); A.boom(1);
}

// ---------- controls (every frame, even during hit-stop) ----------
export function controls() {
  const p = G.p, m = input.mouse, kit = G.kit;
  if (p.state === 'dead') return;
  if (keyHit('KeyJ', 'KeyZ')) { p.bufAtk = 0.2; input.device = 'keys'; }
  if (m.pressed) p.bufAtk = 0.2;
  if ((m.down && input.device === 'mouse') || keyDown('KeyJ', 'KeyZ')) p.bufAtk = Math.max(p.bufAtk, 0.04);
  if (keyHit('Space', 'ShiftLeft', 'ShiftRight', 'KeyK', 'KeyX') || m.rpressed) p.bufDash = 0.18;
  if (input.touch) {
    if (input.thit.has('attack')) p.bufAtk = 0.2;
    if (input.tb.attack) p.bufAtk = Math.max(p.bufAtk, 0.04);
    if (input.thit.has('dash')) p.bufDash = 0.18;
  }
  const ask = (codes, cost, cd, key) => {
    if (!keyHit(...codes) && !input.thit.has(key.toLowerCase())) return;
    if (p.energy >= cost && cd <= 0) p['buf' + key] = 0.18; else { G.deny[key.toLowerCase()] = 0.35; A.deny(); }
  };
  ask(['KeyQ', 'KeyU'], kit.q.cost, p.cdQ, 'Q');
  ask(['KeyE', 'KeyI'], kit.e.cost, p.cdE, 'E');
  if (keyHit('KeyR', 'KeyO') || input.thit.has('r')) { if (p.ult >= 100 && G.E.some(alive)) p.bufR = 0.25; else { G.deny.r = 0.35; A.deny(); } }
}

// ---------- player ----------
function updatePlayer(dt) {
  const p = G.p, up = G.up, kit = G.kit;
  p.t += dt; p.atkT += dt;
  p.inv = Math.max(0, p.inv - dt); p.hurtT -= dt; p.comboWin -= dt;
  p.bufAtk -= dt; p.bufDash -= dt; p.bufQ -= dt; p.bufE -= dt; p.bufR -= dt;
  p.cdQ -= dt; p.cdE -= dt; p.ultLock -= dt;
  p.invis = Math.max(0, p.invis - dt); p.fortress = Math.max(0, p.fortress - dt);
  if (p.shieldT > 0) { p.shieldT -= dt; if (p.shieldT <= 0 && p.shield > 0) { p.shield = 0; kit.onShieldBreak?.(p); } }
  if (p.charges < p.dashMax) { p.dashCd -= dt; if (p.dashCd <= 0) { p.charges++; p.dashCd = kit.dash.cd * up.dashMul; } }
  p.energy = Math.min(100, p.energy + 2.5 * up.regen * (p.ascend > 0 ? 5 : 1) * dt);
  if (p.ascend > 0) { p.ascend -= dt; if (Math.random() < dt * 30) part(p.x + rnd(-6, 6), p.y - rnd(0, 14), 0, -rnd(20, 50), 0.5, P.gold, { glow: true, drag: 1 }); }
  updateOrbit(p, dt);

  let mx = (keyDown('KeyD', 'ArrowRight') ? 1 : 0) - (keyDown('KeyA', 'ArrowLeft') ? 1 : 0);
  let my = (keyDown('KeyS', 'ArrowDown') ? 1 : 0) - (keyDown('KeyW', 'ArrowUp') ? 1 : 0);
  if (!mx && !my && input.stick.id !== null) { mx = input.stick.dx; my = input.stick.dy; }
  const ml = hyp(mx, my);
  if (ml) { const n = Math.max(1, ml); mx /= n; my /= n; p.moveAng = Math.atan2(my, mx); }
  if (p.state !== 'dead' && p.state !== 'cine') {
    if (input.device === 'touch') touchAim(p, ml);
    else if (input.device === 'mouse') p.aim = Math.atan2(input.mouse.y + fx.cam.y - (p.y - 6), input.mouse.x + fx.cam.x - p.x);
    else if (ml) p.aim = p.moveAng;
  }
  const speed = kit.stats.speed * p.slowMul, fr = G.map.friction;

  switch (p.state) {
    case 'move': {
      const k = 1 - Math.exp(-fr * dt);
      p.vx += (mx * speed - p.vx) * k; p.vy += (my * speed - p.vy) * k;
      if (ml) {
        p.runT += dt; p.stepT -= dt;
        if (p.stepT <= 0) { p.stepT = 0.26; A.step(); dust(p.x, p.y, 2, 20); }
      } else p.runT = 0;
      break;
    }
    case 'attack': {
      const k = 1 - Math.exp(-12 * dt);
      p.vx += (mx * speed * 0.3 - p.vx) * k; p.vy += (my * speed * 0.3 - p.vy) * k;
      if (p.atkT <= p.swing.active) swingHits();
      if (p.atkT >= p.atkDur) { p.state = 'move'; p.comboWin = 0.3; }
      break;
    }
    case 'dash': {
      p.vx = p.dx * kit.dash.speed; p.vy = p.dy * kit.dash.speed;
      p.dashT -= dt; p.ghostT -= dt;
      if (p.ghostT <= 0) { p.ghostT = 0.022; ghost(p, kit.color()); }
      if (up.phantom) {
        for (const e of G.E) {
          if (!alive(e) || p.phantomHit.has(e) || hyp(e.x - p.x, e.y - p.y) > e.r + 10) continue;
          p.phantomHit.add(e);
          damage(e, pd(5 * up.phantom), { dir: Math.atan2(p.dy, p.dx) + Math.PI / 2, kb: 90, src: 'dash', slice: true });
          sparks(e.x, e.y - 5, Math.atan2(p.dy, p.dx), 8, 0.5, P.volt);
          A.hit(false, false);
        }
      }
      if (p.dashT <= 0) { p.state = 'move'; p.vx *= 0.3; p.vy *= 0.3; }
      break;
    }
    case 'recover': {
      const k = 1 - Math.exp(-10 * dt);
      p.vx -= p.vx * k; p.vy -= p.vy * k;
      p.recT -= dt;
      if (p.recT <= 0) p.state = 'move';
      break;
    }
    case 'skill': if (kit.skill(p, dt, mx, my) === true) p.state = 'move'; break;
    case 'dead': p.vx *= Math.exp(-6 * dt); p.vy *= Math.exp(-6 * dt); break;
  }

  if (p.state !== 'dead' && p.state !== 'cine') {
    const free = p.state === 'move' || (p.state === 'recover' && p.recT < 0.05);
    const canAct = free || (p.state === 'attack' && p.atkT >= p.cancelAt);
    const canDash = p.state !== 'dash' && p.state !== 'skill';
    if (p.bufDash > 0 && p.charges > 0 && canDash) startDash(mx, my, ml);
    else if (p.bufR > 0 && canAct && p.ult >= 100) { p.bufR = 0; p.ult = 0; p.ultLock = 2.5; kit.r.use(p); buzz('ult'); if (up.evoUlt) { p.ascend = 8; p.ult = 25; addText(p.x, p.y - 30, 'ASCENDED', P.gold, 2); } }
    else if (p.bufQ > 0 && canAct && p.energy >= kit.q.cost && p.cdQ <= 0) { p.bufQ = 0; if (kit.q.use(p) !== false) { p.energy -= kit.q.cost; p.cdQ = kit.q.cd * up.cdMul; if (up.evoSpell) echo(kit.q); } }
    else if (p.bufE > 0 && canAct && p.energy >= kit.e.cost && p.cdE <= 0) { p.bufE = 0; if (kit.e.use(p) !== false) { p.energy -= kit.e.cost; p.cdE = kit.e.cd * up.cdMul; if (up.evoSpell) echo(kit.e); } }
    else if (kit.melee) { if (p.bufAtk > 0 && canAct) startAttack(); }
    if (!kit.melee && p.state !== 'dead') {
      const held = (input.mouse.down && input.device === 'mouse') || keyDown('KeyJ', 'KeyZ') || input.tb.attack;
      kit.primary(p, dt, held && (p.state === 'move' || p.state === 'recover'));
    }
  }
  kit.update?.(p, dt);
  if (p.state !== 'dead') kit.flair?.(p, dt, hyp(p.vx, p.vy) > 20);

  p.x = clamp(p.x + p.vx * dt, B.x0 + p.r, B.x1 - p.r);
  p.y = clamp(p.y + p.vy * dt, B.y0 + p.r, B.y1 - 2);
}

// phones: aim at the nearest enemy, otherwise where you're walking
function touchAim(p, ml) {
  let best = null, bd = 170;
  for (const e of G.E) { if (!alive(e)) continue; const d = hyp(e.x - p.x, e.y - p.y); if (d < bd) { bd = d; best = e; } }
  if (best) p.aim = Math.atan2(best.y - best.r - (p.y - 6), best.x - p.x);
  else if (ml) p.aim = p.moveAng;
}

export function aimAssist() {
  const p = G.p;
  let best = null, bd = 90;
  for (const e of G.E) {
    if (!alive(e)) continue;
    const d = hyp(e.x - p.x, e.y - p.y);
    if (d < bd && Math.abs(angDiff(Math.atan2(e.y - p.y, e.x - p.x), p.aim)) < 1.1) { bd = d; best = e; }
  }
  if (best) p.aim = Math.atan2(best.y - p.y, best.x - p.x);
}

function startAttack() {
  const p = G.p, up = G.up, m = G.kit.melee;
  p.bufAtk = 0;
  p.step = p.state === 'attack' || p.comboWin > 0 ? (p.step + 1) % m.steps.length : 0;
  if (input.device === 'keys') aimAssist();
  p.atkAng = p.aim;
  p.state = 'attack'; p.atkT = 0;
  const s = m.steps[p.step];
  const spd = up.spd * (p.ascend > 0 ? 1.4 : 1);
  p.atkDur = s.dur / spd;
  p.cancelAt = s.cancel / spd;
  p.vx = Math.cos(p.atkAng) * s.lunge; p.vy = Math.sin(p.atkAng) * s.lunge;
  p.swing = { reach: s.reach * up.reach, arc: s.arc, dmg: s.dmg, heavy: !!s.heavy, kb: s.kb, active: 0.085 / up.spd, dir: p.step % 2 ? -1 : 1 };
  p.swingHit = new Set();
  const col = RANKS[G.rank].l === 'SSS' ? 'gold' : m.col;
  G.slashes.push({ follow: true, x: p.x, y: p.y, a: p.atkAng, r: p.swing.reach, arc: s.arc, dir: p.swing.dir, t: 0, life: s.heavy ? 0.24 : Math.min(0.19, s.dur * 0.9), th: s.th, col });
  if (m.heavySfx && s.heavy) A.heavySwing(); else A.swing(s.heavy ? 2 : 0);
}

function swingHits() {
  const p = G.p, sw = p.swing;
  for (const e of G.E) {
    if (!alive(e) || p.swingHit.has(e) || e.z > 8) continue;
    const dx = e.x - p.x, dy = e.y - p.y, d = hyp(dx, dy);
    if (d > sw.reach + e.r) continue;
    const a = Math.atan2(dy, dx);
    if (d > e.r + 6 && Math.abs(angDiff(a, p.atkAng)) > sw.arc / 2) continue;
    p.swingHit.add(e);
    meleeHit(e, sw, a);
  }
  for (const s of G.shots) {
    if (s.owner !== 'enemy' || s.dead || s.noparry) continue;
    const dx = s.x - p.x, dy = s.y - (p.y - 6), d = hyp(dx, dy);
    if (d > sw.reach + 5) continue;
    if (d > 9 && Math.abs(angDiff(Math.atan2(dy, dx), p.atkAng)) > sw.arc / 2 + 0.3) continue;
    parry(s, p.atkAng);
  }
}

function meleeHit(e, sw, dir) {
  const p = G.p, kit = G.kit;
  let mult = 1, crit = Math.random() < 0.1 + G.up.crit;
  if (crit) mult *= 2;
  if (p.invis > 0 && kit.backstab) { mult *= 3; crit = true; p.invis = 0; addText(e.x, e.y - 24, 'BACKSTAB', P.blood); }
  if (e.stunT > 0 || e.state === 'stun') mult *= 1.5;
  const killed = damage(e, sw.dmg * mult * G.up.dmg, { dir, kb: sw.kb, src: 'primary', ug: true, slice: true, crit });
  if (!killed) hitstop(e.type === 'boss' ? 0.035 : sw.heavy || crit ? 0.085 : 0.05);
  shake(sw.heavy ? 0.3 : 0.17);
  A.hit(sw.heavy, crit);
  buzz(sw.heavy || crit ? 'heavy' : 'hit');
  sparks(e.x, e.y - e.r, dir + (Math.PI / 2) * sw.dir, 7, 0.5, P.ember2, 220);
  kit.onHit?.(e, sw, dir);
}

export function parry(s, a0) {
  const p = G.p, up = G.up;
  let a = a0, bd = 0.7;
  for (const e of G.E) {
    if (!alive(e)) continue;
    const ea = Math.atan2(e.y - e.r - s.y, e.x - s.x), d = Math.abs(angDiff(ea, a0));
    if (d < bd) { bd = d; a = ea; }
  }
  s.owner = 'player'; s.vx = Math.cos(a) * 300; s.vy = Math.sin(a) * 300;
  s.dmg = pd(10 * (1 + up.mirror)); s.pierce = up.mirror ? 99 : 0; s.life = 2; s.hit = new Set(); s.c = P.volt;
  s.kind = 'orb'; s.ug = true; s.kb = 200; s.bounce = 0; s.homing = 0; s.slice = true; s.trail = true; s.accel = 0;
  hitstop(0.09); shake(0.25); A.parry(); buzz('parry');
  addText(s.x, s.y - 10, 'PARRY', P.volt);
  addRing(s.x, s.y, P.paper, 200, 0.2, 2);
  sparks(s.x, s.y, a, 10, 0.6, P.volt, 260);
  p.energy = Math.min(100, p.energy + 5);
  addCombo(1);
}

function startDash(mx, my, ml) {
  const p = G.p, kit = G.kit;
  p.bufDash = 0;
  if (p.charges === p.dashMax) p.dashCd = kit.dash.cd * G.up.dashMul;
  p.charges--;
  const a = ml ? Math.atan2(my, mx) : p.aim;
  p.dx = Math.cos(a); p.dy = Math.sin(a);
  if (p.state === 'attack') p.comboWin = 0.35;
  p.state = 'dash'; p.dashT = kit.dash.time; p.ghostT = 0;
  p.inv = Math.max(p.inv, kit.dash.time + 0.05); p.perfectUsed = false; p.phantomHit = new Set();
  A.dash(); dust(p.x, p.y, 6, 60); shake(0.05);
}

// evolved powers cast a second time a moment later, for free
function echo(ab) {
  G.timers.push({ t: 0.32, fn: () => { const p = G.p; if (p.state === 'dead' || G.cine) return; ab.use(p); addText(p.x, p.y - 24, 'ECHO', P.gold); } });
}

// orbiting blades upgrade
function updateOrbit(p, dt) {
  const n = G.up.orbit * (G.up.evoOrbit ? 2 : 1);
  if (!n) return;
  p.orbitA += dt * (G.up.evoOrbit ? 5.5 : 4);
  const R = G.up.evoOrbit ? 28 + Math.sin(G.time * 3) * 10 : 22;
  for (let i = 0; i < n; i++) {
    const a = p.orbitA + (i * TAU) / n, bx = p.x + Math.cos(a) * R, by = p.y - 6 + Math.sin(a) * R * 0.8;
    for (const e of G.E) {
      if (!alive(e) || hyp(e.x - bx, e.y - e.r - by) > e.r + 4) continue;
      const last = p.orbitHit.get(e) || 0;
      if (G.time - last < 0.35) continue;
      p.orbitHit.set(e, G.time);
      damage(e, pd(G.up.evoOrbit ? 6 : 3), { dir: a + Math.PI / 2, kb: 90, src: 'bolt', slice: true });
      sparks(bx, by, a, 4, 0.6, P.paper, 120);
    }
  }
}
export function drawOrbit(p) {
  const n = G.up.orbit * (G.up.evoOrbit ? 2 : 1);
  const R = G.up.evoOrbit ? 28 + Math.sin(G.time * 3) * 10 : 22;
  for (let i = 0; i < n; i++) {
    const a = p.orbitA + (i * TAU) / n, bx = p.x + Math.cos(a) * R, by = p.y - 6 + Math.sin(a) * R * 0.8;
    const tx = Math.cos(a + Math.PI / 2) * 4, ty = Math.sin(a + Math.PI / 2) * 4;
    line(bx - tx, by - ty, bx + tx, by + ty, G.up.evoOrbit ? P.gold : P.bone);
    glow(bx, by, G.up.evoOrbit ? P.gold : P.volt, 5, 0.5);
  }
}

// ---------- regular enemies ----------
const HOME = { husk: 'chase', wisp: 'drift', tick: 'run', brute: 'chase', larva: 'chase' };
function updateEnemy(e, dt) {
  const p = G.p, dx = p.x - e.x, dy = p.y - e.y, d = hyp(dx, dy), ang = Math.atan2(dy, dx);
  e.vx = 0; e.vy = 0;
  const toward = (sp) => { e.vx = Math.cos(ang) * sp; e.vy = Math.sin(ang) * sp; };
  if (e.state === 'spawn') {
    e.t -= dt;
    if (e.t <= 0) { e.state = { ...HOME, egg: 'incubate', boss: 'intro' }[e.type]; e.t = e.type === 'boss' ? 1.4 : e.type === 'egg' ? rnd(3, 4) : 0; }
    return;
  }
  if (e.type === 'boss') {
    // bosses act 15% faster, and 40% faster once they enrage after 75 seconds
    e.fightT = (e.fightT || 0) + dt;
    if (!e.enraged && e.fightT > 75 && e.state !== 'intro') {
      e.enraged = true; e.speed *= 1.2;
      G.banner = { text: 'ENRAGED', sub: 'FINISH IT FAST', t: 0, life: 1.4, c: P.blood };
      A.bossRoar(); shake(0.6); addRing(e.x, e.y - 16, P.blood, 300, 0.5, 3);
    }
    BOSSES[e.boss].update(e, dt * (e.enraged ? 1.4 : 1.15), d, ang, dx);
    return;
  }
  if (e.frozen > 0) { e.frozen -= dt; return; }
  if (e.stunT > 0) { e.stunT -= dt; return; }
  if (e.state === 'hurt') { e.t -= dt; if (e.t <= 0) e.state = HOME[e.type] || 'chase'; return; }
  if (e.type === 'egg') {
    e.t -= dt;
    if (e.t <= 0) {
      e.dead = true;
      for (let i = 0; i < 2; i++) spawnEnemy(Math.random() < 0.6 ? 'tick' : 'husk', e.x + rnd(-6, 6), e.y + rnd(-4, 4));
      bleed(e.x, e.y, rnd(TAU), 10, DEF.egg.col, DEF.egg.colD, 0.8); A.splat();
    }
    return;
  }
  if (p.invis > 0) {
    // lost the player: wander toward a random spot
    if (hyp(e.wx - e.x, e.wy - e.y) < 8 || Math.random() < dt * 0.5) { e.wx = rnd(B.x0 + 20, B.x1 - 20); e.wy = rnd(B.y0 + 20, B.y1 - 20); }
    const wa = Math.atan2(e.wy - e.y, e.wx - e.x);
    e.vx = Math.cos(wa) * e.speed * 0.5; e.vy = Math.sin(wa) * e.speed * 0.5;
    if (e.state === 'windup' || e.state === 'lunge' || e.state === 'aim' || e.state === 'fuse') e.state = HOME[e.type];
    return;
  }
  if (e.type === 'larva') {
    const wob = Math.sin(e.anim * 10) * 0.6;
    e.vx = Math.cos(ang + wob) * e.speed; e.vy = Math.sin(ang + wob) * e.speed; e.face = dx < 0 ? -1 : 1;
    if (d < e.r + p.r + 2) { e.dead = true; tryHurt(1, e.x, e.y); splat(e.x, e.y, 5, e.def.col, e.def.colD); A.splat(); }
    return;
  }
  if (e.type === 'husk') {
    if (e.state === 'chase') {
      toward(e.speed); e.face = dx < 0 ? -1 : 1; e.cd -= dt;
      if (d < 36 && e.cd <= 0) { e.state = 'windup'; e.t = 0.4; e.lock = ang; }
    } else if (e.state === 'windup') {
      e.t -= dt; e.lock = ang;
      if (e.t <= 0) { e.state = 'lunge'; e.t = 0.16; e.hitP = false; }
    } else if (e.state === 'lunge') {
      e.vx = Math.cos(e.lock) * 210; e.vy = Math.sin(e.lock) * 210; e.t -= dt;
      if (!e.hitP && d < e.r + p.r + 3) { e.hitP = true; tryHurt(1, e.x, e.y); }
      if (e.t <= 0) { e.state = 'recover'; e.t = 0.55; }
    } else if (e.state === 'recover') {
      e.t -= dt;
      if (e.t <= 0) { e.state = 'chase'; e.cd = rnd(0.3, 0.9); }
    }
  } else if (e.type === 'wisp') {
    e.face = dx < 0 ? -1 : 1;
    if (e.state === 'drift') {
      const radial = d > 120 ? 1 : d < 90 ? -1 : 0;
      e.vx = (Math.cos(ang) * radial + Math.cos(ang + Math.PI / 2) * e.orbit * 0.6) * e.speed;
      e.vy = (Math.sin(ang) * radial + Math.sin(ang + Math.PI / 2) * e.orbit * 0.6) * e.speed;
      if (Math.random() < dt * 0.4) e.orbit *= -1;
      e.cd -= dt;
      if (e.cd <= 0 && d < 220) { e.state = 'windup'; e.t = 0.55; }
    } else if (e.state === 'windup') {
      e.t -= dt;
      if (e.t <= 0) {
        const fy = e.y - e.r - 4;
        if (G.wave >= 6 || e.elite) { fire(e.x, fy, ang - 0.25, 82); fire(e.x, fy, ang + 0.25, 82); }
        fire(e.x, fy, ang, 88);
        A.shoot();
        e.state = 'drift'; e.cd = rnd(1.8, 2.8);
      }
    }
  } else if (e.type === 'tick') {
    if (e.state === 'run') {
      toward(e.speed); e.vx += Math.cos(e.anim * 9) * 20; e.face = dx < 0 ? -1 : 1;
      if (d < 22) { e.state = 'fuse'; e.t = 0.7; }
    } else if (e.state === 'fuse') {
      e.t -= dt;
      if (Math.floor(e.t * 14) !== Math.floor((e.t + dt) * 14)) A.fuse();
      if (e.t <= 0) { e.dead = true; explode(e.x, e.y, false, 30); }
    }
  } else if (e.type === 'brute') {
    e.superArmor = e.state === 'aim' || e.state === 'charge';
    if (e.state === 'chase') {
      toward(e.speed); e.face = dx < 0 ? -1 : 1; e.cd -= dt;
      if (d < 160 && e.cd <= 0) { e.state = 'aim'; e.t = 0.8; e.lock = ang; }
    } else if (e.state === 'aim') {
      e.t -= dt;
      if (e.t > 0.25) { e.lock = ang; e.face = dx < 0 ? -1 : 1; }
      if (e.t <= 0) { e.state = 'charge'; e.t = 0.9; e.hitP = false; A.dash(); }
    } else if (e.state === 'charge') {
      const cx = Math.cos(e.lock), cy = Math.sin(e.lock);
      e.vx = cx * 255; e.vy = cy * 255; e.t -= dt;
      if (Math.random() < 0.6) dust(e.x, e.y, 1, 40);
      if (!e.hitP && d < e.r + p.r + 2) { if (tryHurt(2, e.x, e.y) === true) e.hitP = true; }
      if (atWall(e, cx, cy)) {
        e.state = 'stun'; e.t = 1.7; e.vx = e.vy = 0;
        shake(0.5); A.wall(); dust(e.x, e.y, 16, 90); hitstop(0.05);
        addText(e.x, e.y - 26, 'STUNNED', P.gold);
      } else if (e.t <= 0) { e.state = 'recover'; e.t = 0.7; }
    } else if (e.state === 'stun' || e.state === 'recover') {
      e.t -= dt;
      if (e.t <= 0) { e.state = 'chase'; e.cd = rnd(1.4, 2.4); }
    }
  }
}
export const atWall = (e, cx, cy) => (cx < 0 && e.x <= B.x0 + e.r + 1) || (cx > 0 && e.x >= B.x1 - e.r - 1) || (cy < 0 && e.y <= B.y0 + e.r + 1) || (cy > 0 && e.y >= B.y1 - 3);

// ---------- bosses: shared death sequence ----------
function bossDeath(e) {
  e.dying = 2.2; e.state = 'dying'; e.t = 0; e.vx = e.vy = 0; e.z = 0; e.under = false; e.shieldUp = false; e.armor = 0;
  slowmo(2.2, 0.3);
  A.bossRoar(); A.stopLoops();
  const bd = BOSSES[e.boss];
  G.banner = { text: bd.final ? 'THE KING FALLS' : bd.short + ' SLAIN', sub: '', t: 0, life: 2.6, c: P.gold };
  G.queue.length = 0; G.sigils.length = 0; G.hbeams.length = 0; G.hlines.length = 0; G.dark = 0;
  for (const s of G.strikes) if (!s.friendly) s.dead = true;
  for (const o of G.E) if (o !== e && alive(o)) damage(o, 9999, { dir: Math.atan2(o.y - e.y, o.x - e.x), kb: 200, src: 'boom' });
  for (const s of G.shots) if (s.owner === 'enemy') s.dead = true;
}
function bossDying(e, dt) {
  e.dying -= dt; e.t -= dt;
  if (e.t <= 0) {
    e.t = 0.1;
    const x = e.x + rnd(-14, 14), y = e.y - rnd(4, 34);
    addRing(x, y, e.def.col, 160, 0.2, 2);
    for (let i = 0; i < 10; i++) { const a = rnd(TAU), v = rnd(50, 180); part(x, y, Math.cos(a) * v, Math.sin(a) * v, rnd(0.2, 0.4), Math.random() < 0.5 ? e.def.col : P.paper, { drag: 5, glow: true }); }
    bleed(e.x, e.y, rnd(TAU), 6, e.def.col, e.def.colD, 1);
    shake(0.3); A.boom(0.6);
  }
  if (e.dying <= 0) bossFinal(e);
}
function bossFinal(e) {
  const bd = BOSSES[e.boss];
  e.dead = true; G.boss = null; G.kills++;
  makeGibs(e, rnd(TAU));
  bleed(e.x, e.y, rnd(TAU), 60, e.def.col, e.def.colD, 1.6);
  splat(e.x, e.y, 26, e.def.col, e.def.colD);
  addRing(e.x, e.y - 16, P.paper, 420, 0.5, 3);
  addRing(e.x, e.y - 16, e.def.col, 300, 0.6, 2);
  for (let i = 0; i < 24; i++) dropPick(e.x, e.y, 'energy');
  for (let i = 0; i < 3; i++) dropPick(e.x, e.y, 'heal');
  G.score += Math.round(e.def.score * (G.wave / 5) * RANKS[G.rank].m * G.D.score);
  flash(P.paper, 0.4, true); shake(1); hitstop(0.15);
  A.ultRelease(); buzz('boss');
  if (bd.final && !G.won) { G.won = true; G.victory = true; A.victory(); }
}

// ---------- main update ----------
const maxAlive = () => Math.min(Math.round((4 + G.wave) * G.D.count), 16 + Math.floor(endless() / 2), 26);
export const endless = () => (G && G.won ? Math.max(0, G.wave - 20) : 0);

function placeSpawn(type) {
  const p = G.p;
  if (type === 'boss') return [AW / 2, B.y0 + 50];
  for (let i = 0; i < 30; i++) {
    const x = rnd(B.x0 + 24, B.x1 - 24), y = rnd(B.y0 + 20, B.y1 - 16);
    if (hyp(x - p.x, y - p.y) > 95) return [x, y];
  }
  return [rnd(B.x0 + 24, B.x1 - 24), B.y0 + 24];
}

export function update(dt, rdt) {
  G.time += rdt;
  G.rankPop = Math.max(0, G.rankPop - rdt * 4);
  fx.hurtVig = Math.max(0, fx.hurtVig - rdt * 1.5);
  for (const k in G.deny) G.deny[k] = Math.max(0, G.deny[k] - rdt);
  if (G.banner) { G.banner.t += rdt; if (G.banner.t > G.banner.life) G.banner = null; }
  if (G.dead) G.deadT += rdt;
  updateAmbient(rdt);

  if (G.cine) {
    G.cine.update(rdt);
    updateFx(rdt * 0.5);
    updateCam(rdt);
    return;
  }
  if (dt <= 0) return;
  G.t += dt;

  if (G.phase === 'intro') {
    G.phaseT -= dt;
    if (G.phaseT <= 0) G.phase = 'fight';
  } else if (G.phase === 'fight') {
    G.spawnCd -= dt;
    const count = G.E.filter((e) => !e.dead).length + G.sigils.length;
    if (G.queue.length && G.spawnCd <= 0 && count < maxAlive()) {
      const type = G.queue.shift();
      const [x, y] = placeSpawn(type);
      G.sigils.push({ x, y, type, t: 0, life: type === 'boss' ? 1.4 : 0.8 });
      G.spawnCd = 0.3;
      A.sigil();
    }
    if (!G.queue.length && !G.sigils.length && !G.E.some((e) => !e.dead) && !G.dead) {
      G.phase = 'clear'; G.phaseT = 1.6;
      slowmo(0.8, 0.25);
      A.waveClear(); A.scene('calm'); A.stopLoops();
      G.banner = { text: 'WAVE CLEAR', sub: '+1 HEALTH', t: 0, life: 1.6, c: P.ember3 };
      healPlayer(1);
    }
  } else if (G.phase === 'clear') {
    G.phaseT -= dt;
    if (G.phaseT <= 0 && (G.picks.length === 0 || G.phaseT < -1.2) && !G.victory) G.wantUpgrade = true;
  }

  for (const s of G.sigils) {
    s.t += dt;
    const col = s.type === 'boss' ? BOSSES[bossFor(G.wave)].col : DEF[s.type].col;
    if (Math.random() < dt * 30) { const a = rnd(TAU); part(s.x + Math.cos(a) * 10, s.y + Math.sin(a) * 6, 0, -rnd(10, 30), 0.4, col, { drag: 1, glow: true }); }
    if (s.t >= s.life) {
      spawnEnemy(s.type, s.x, s.y);
      addRing(s.x, s.y - 4, col, 140, 0.2, 2);
      dust(s.x, s.y, 8, 50);
      A.spawn();
    }
  }
  sweep(G.sigils, (s) => s.t < s.life);

  updatePlayer(dt);
  const p = G.p;

  for (const a of G.allies) { a.t += dt; ALLY[a.type].update(a, dt); }
  sweep(G.allies, (a) => a.t < a.life && !a.dead);

  for (const e of G.E) {
    if (e.dead) continue;
    e.flash -= dt; e.shakeT -= dt; e.anim += dt;
    if (e.dying) { bossDying(e, dt); continue; }
    if (e.burn > 0) {
      e.burn -= dt; e.burnTick -= dt;
      if (Math.random() < dt * 20) part(e.x + rnd(-4, 4), e.y - rnd(2, 10), 0, -rnd(15, 40), 0.35, Math.random() < 0.5 ? P.ember : P.ember2, { drag: 1, glow: true });
      if (e.burnTick <= 0) { e.burnTick = 0.4; damage(e, Math.max(1, Math.round(e.burnDps * 0.4)), { src: 'burn', dir: 0, kb: 0 }); }
      if (e.dead || e.dying) continue;
    }
    if (e.marked > 0) { e.marked -= dt; continue; }
    updateEnemy(e, dt);
    if (e.dead || e.dying) continue;
    const kd = Math.exp(-G.map.slide * dt);
    e.x += (e.vx + e.kx) * dt; e.y += (e.vy + e.ky) * dt;
    const fast = Math.abs(e.kx) + Math.abs(e.ky) > 170;
    let hitWall = false;
    if (e.x < B.x0 + e.r) { e.x = B.x0 + e.r; hitWall = e.kx < -100; e.kx = -e.kx * 0.3; }
    if (e.x > B.x1 - e.r) { e.x = B.x1 - e.r; hitWall = hitWall || e.kx > 100; e.kx = -e.kx * 0.3; }
    if (e.y < B.y0 + e.r) { e.y = B.y0 + e.r; hitWall = hitWall || e.ky < -100; e.ky = -e.ky * 0.3; }
    if (e.y > B.y1 - 2) { e.y = B.y1 - 2; hitWall = hitWall || e.ky > 100; e.ky = -e.ky * 0.3; }
    e.kx *= kd; e.ky *= kd;
    if (hitWall && fast && e.type !== 'boss') {
      dust(e.x, e.y, 10, 70); A.wall(); shake(0.2);
      damage(e, 3, { src: 'wall', dir: 0, kb: 0 });
    }
  }
  const live = G.E.filter((e) => !e.dead && e.state !== 'spawn' && !e.under);
  for (let i = 0; i < live.length; i++) {
    const a = live[i];
    for (let j = i + 1; j < live.length; j++) {
      const b = live[j], dx = b.x - a.x, dy = b.y - a.y, d = hyp(dx, dy), min = a.r + b.r;
      if (d >= min || d === 0) continue;
      const push = ((min - d) / d) * 0.5;
      const wa = a.type === 'boss' || a.type === 'egg' ? 0 : b.type === 'boss' ? 2 : 1, wb = b.type === 'boss' || b.type === 'egg' ? 0 : a.type === 'boss' ? 2 : 1;
      a.x -= dx * push * wa; a.y -= dy * push * wa;
      b.x += dx * push * wb; b.y += dy * push * wb;
    }
    if (p.state !== 'dead' && (a.z || 0) < 8) {
      const dx = p.x - a.x, dy = p.y - a.y, d = hyp(dx, dy), min = a.r + p.r - 2;
      if (d < min && d > 0) { const k = (min - d) / d, w = a.type === 'boss' || a.type === 'egg' ? 0 : 1; p.x += dx * k * 0.5; p.y += dy * k * 0.5; a.x -= dx * k * 0.5 * w; a.y -= dy * k * 0.5 * w; }
    }
  }

  updateShots(dt);
  updateHazards(dt);

  for (const tm of G.timers) { tm.t -= dt; if (tm.t <= 0) tm.fn(); }
  sweep(G.timers, (tm) => tm.t > 0);
  for (const c of G.cuts) {
    c.t += dt;
    if (!c.done && c.t >= c.pend) { c.done = true; c.fire(c, false); }
    if (c.echo === 1 && c.t >= c.pend + 0.2) { c.echo = 2; c.fire(c, true); }
  }
  sweep(G.cuts, (c) => c.t < c.pend + 0.5);
  for (const b of G.booms) { b.t -= dt; if (b.t <= 0) explode(b.x, b.y, b.friendly, b.R ?? 36, b.dmg ?? 14); }
  sweep(G.booms, (b) => b.t > 0);

  G.pickChainT -= dt;
  if (G.pickChainT <= 0) G.pickChain = 0;
  for (const k of G.picks) {
    k.t += dt;
    k.vz -= 260 * dt; k.z += k.vz * dt;
    if (k.z < 0) { k.z = 0; k.vz = -k.vz * 0.35; }
    const d = hyp(p.x - k.x, p.y - 6 - k.y);
    if (k.t > 0.35 && p.state !== 'dead' && (d < 70 * (1 + G.up.magnet * 1.5) || G.phase === 'clear')) {
      const sp = Math.min(420, 120 + k.t * 300), a = Math.atan2(p.y - 6 - k.y, p.x - k.x);
      k.vx += (Math.cos(a) * sp - k.vx) * Math.min(1, 10 * dt); k.vy += (Math.sin(a) * sp - k.vy) * Math.min(1, 10 * dt);
    } else { k.vx *= Math.exp(-4 * dt); k.vy *= Math.exp(-4 * dt); }
    k.x += k.vx * dt; k.y += k.vy * dt;
    if (d < 8 && k.t > 0.35 && p.state !== 'dead') {
      k.got = true;
      if (k.kind === 'heal') healPlayer(1);
      else { p.energy = Math.min(100, p.energy + 2.5); G.pickChain++; G.pickChainT = 0.45; A.pickup(G.pickChain); }
      part(k.x, k.y, 0, -20, 0.2, k.kind === 'heal' ? P.blood : P.volt, { glow: true });
    }
  }
  sweep(G.picks, (k) => !k.got);

  for (const [tx, ty] of TORCHES) if (Math.random() < dt * 3) part(tx + rnd(-1, 1), ty - 4, rnd(-6, 6), -rnd(12, 30), rnd(0.6, 1.2), Math.random() < 0.5 ? G.map.flame[0] : G.map.flame[1], { drag: 0.6, glow: true });

  if (G.combo > 0) {
    G.comboT -= dt;
    if (G.comboT <= 0) { G.combo = 0; G.rank = 0; if (G.phase === 'fight' && !G.boss) A.scene('fight'); }
  }

  sweep(G.E, (e) => !e.dead);
  updateFx(dt);
  updateCam(dt);
}

function updateShots(dt) {
  const p = G.p;
  for (const s of G.shots) {
    if (s.dead) continue;
    s.t += dt; s.life -= dt; s.spin = (s.spin || 0) + dt * 20;
    if (s.accel) { s.vx *= 1 + s.accel * dt; s.vy *= 1 + s.accel * dt; }
    if (s.ret && s.t > s.retT) {
      const o = s.ret, a = Math.atan2(o.y - 20 - s.y, o.x - s.x);
      s.vx = Math.cos(a) * 260; s.vy = Math.sin(a) * 260; s.life = 2;
      if (hyp(o.x - s.x, o.y - 20 - s.y) < 14 || o.dead) { s.dead = true; continue; }
    }
    if (s.owner === 'player' && s.homing) {
      let best = null, bd = 140;
      for (const e of G.E) { if (!alive(e)) continue; const d = hyp(e.x - s.x, e.y - e.r - s.y); if (d < bd) { bd = d; best = e; } }
      if (best) {
        const sp = hyp(s.vx, s.vy), cur = Math.atan2(s.vy, s.vx), want = Math.atan2(best.y - best.r - s.y, best.x - s.x);
        const na = cur + clamp(angDiff(want, cur), -s.homing * dt, s.homing * dt);
        s.vx = Math.cos(na) * sp; s.vy = Math.sin(na) * sp;
      }
    }
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.trail && Math.random() < dt * 40) part(s.x, s.y, -s.vx * 0.1, -s.vy * 0.1, 0.22, s.c, { drag: 3, glow: true });
    const out = !s.ret && (s.x < B.x0 || s.x > B.x1 || s.y < B.y0 - 8 || s.y > B.y1);
    if (out && s.bounce > 0) {
      s.bounce--;
      if (s.x < B.x0 || s.x > B.x1) s.vx = -s.vx;
      if (s.y < B.y0 - 8 || s.y > B.y1) s.vy = -s.vy;
      s.x = clamp(s.x, B.x0, B.x1); s.y = clamp(s.y, B.y0 - 8, B.y1);
      sparks(s.x, s.y, rnd(TAU), 4, Math.PI, s.c, 90);
    } else if (s.life <= 0 || out) { endShot(s); continue; }
    if (s.owner === 'enemy') {
      if (p.fortress > 0 && !s.noparry && hyp(s.x - p.x, s.y - (p.y - 6)) < 16) { parry(s, Math.atan2(s.y - p.y, s.x - p.x)); continue; }
      if (s.dmg > 0 && hyp(s.x - p.x, s.y - (p.y - 6)) < s.r + p.r) { const r = tryHurt(s.dmg, s.x, s.y); if (r === true || r === 'blocked') s.dead = true; }
    } else {
      for (const e of G.E) {
        if (!alive(e) || s.hit.has(e)) continue;
        if (hyp(s.x - e.x, s.y - (e.y - e.r)) < s.r + e.r + 2) {
          s.hit.add(e);
          const killed = damage(e, s.dmg, { dir: Math.atan2(s.vy, s.vx), kb: s.kb, src: s.kind === 'orb' ? 'orb' : 'primary', ug: s.ug, slice: s.slice });
          if (s.onHit) s.onHit(e, killed);
          if (!killed && s.poison) { e.burn = 3; e.burnDps = 3; }
          if (!killed && s.freeze && e.type !== 'boss') e.frozen = Math.max(e.frozen, s.freeze);
          sparks(s.x, s.y, Math.atan2(s.vy, s.vx), s.kind === 'bullet' ? 4 : 8, 0.7, s.c);
          if (s.kind === 'orb') A.hit(true, false); else A.tick();
          if (s.pierce > 0) s.pierce--; else { endShot(s); break; }
        }
      }
      if (!s.dead && s.kind !== 'orb') {
        for (const o of G.shots) {
          if (o.owner !== 'enemy' || o.dead || o.noparry) continue;
          if (hyp(o.x - s.x, o.y - s.y) < o.r + s.r + 1) { o.dead = true; sparks(o.x, o.y, rnd(TAU), 6, Math.PI, P.hex, 120); if (s.kind === 'bullet' || s.kind === 'pellet') { endShot(s); break; } }
        }
      }
    }
  }
  sweep(G.shots, (s) => !s.dead);
}
function endShot(s) {
  s.dead = true;
  if (s.splash) {
    if (s.splash.big) { explode(s.x, s.y + 4, true, s.splash.R, s.splash.big); return; }
    for (const e of G.E) if (alive(e) && !s.hit.has(e) && hyp(e.x - s.x, e.y - e.r - s.y) < s.splash.R + e.r) damage(e, s.splash.dmg, { dir: Math.atan2(e.y - s.y, e.x - s.x), kb: 100, src: 'boom' });
    addRing(s.x, s.y, s.c, s.splash.R * 6, 0.16, 2);
  }
  sparks(s.x, s.y, rnd(TAU), 5, Math.PI, s.c, 100);
}

function updateHazards(dt) {
  const p = G.p;
  for (const z of G.zones) {
    z.t += dt;
    if (z.type === 'lava' || z.type === 'burn') {
      for (const e of G.E) if (alive(e) && e.type !== 'boss' && hyp(e.x - z.x, (e.y - z.y) * 1.2) < z.r) { e.burn = Math.max(e.burn, 1.5); e.burnDps = Math.max(e.burnDps, z.type === 'lava' ? 6 : 4); }
      if (z.type === 'lava' && Math.random() < dt * 4) part(z.x + rnd(-z.r, z.r) * 0.7, z.y + rnd(-z.r, z.r) * 0.5, 0, -rnd(10, 30), rnd(0.4, 0.9), Math.random() < 0.5 ? P.ember : P.ember3, { drag: 1, glow: true });
      if (z.type === 'burn' && Math.random() < dt * 25) part(z.x + rnd(-z.r, z.r) * 0.8, z.y + rnd(-z.r, z.r) * 0.6, 0, -rnd(15, 40), 0.4, Math.random() < 0.5 ? P.ember : P.ember2, { drag: 1, glow: true });
    } else if (z.type === 'acid') {
      if (hyp(p.x - z.x, (p.y - z.y) * 1.2) < z.r && p.state !== 'dash') tryHurt(1, z.x, z.y);
      if (Math.random() < dt * 6) part(z.x + rnd(-z.r, z.r) * 0.7, z.y + rnd(-z.r, z.r) * 0.5, 0, -rnd(5, 15), 0.5, '#b5f23a', { drag: 1, glow: true });
    }
  }
  sweep(G.zones, (z) => z.t < z.life);

  for (const s of G.strikes) {
    s.t += dt;
    if (s.t >= s.delay && !s.dead) {
      s.dead = true;
      if (s.friendly) {
        for (const e of G.E) if (alive(e) && hyp(e.x - s.x, e.y - s.y) < s.R + e.r) damage(e, pd(s.dmg), { dir: Math.atan2(e.y - s.y, e.x - s.x), kb: 220, src: 'boom' });
        if (s.kind === 'meteor') G.zones.push({ type: 'burn', x: s.x, y: s.y, r: s.R * 0.7, t: 0, life: 3 });
      } else if (hyp(G.p.x - s.x, G.p.y - s.y) < s.R) tryHurt(s.dmg ?? 2, s.x, s.y);
      if (s.kind === 'lightning') { G.bolts.push({ x0: s.x + rnd(-20, 20), y0: s.y - 160, x1: s.x, y1: s.y, t: 0, life: 0.25 }); A.zip(); }
      if (s.kind === 'acid') { G.zones.push({ type: 'acid', x: s.x, y: s.y, r: 14, t: 0, life: 4 }); A.splat(); splat(s.x, s.y, 8, '#b5f23a', '#45651a'); continue; }
      addRing(s.x, s.y - 3, s.c, s.R * 7, 0.2, 3);
      addRing(s.x, s.y - 3, P.paper, s.R * 5, 0.14, 1);
      for (let i = 0; i < 26; i++) { const a = rnd(TAU), v = rnd(60, 240); part(s.x, s.y, Math.cos(a) * v, Math.sin(a) * v * 0.8, rnd(0.2, 0.5), [s.c, P.ember2, P.paper][i % 3], { drag: 5, glow: true, z: 3, vz: rnd(20, 100), g: 200 }); }
      scorch(s.x, s.y, s.R * 0.6);
      shake(s.friendly ? 0.4 : 0.35); A.boom(s.R > 30 ? 1.3 : 0.8);
    }
  }
  sweep(G.strikes, (s) => !s.dead);

  for (const q of G.quakes) {
    if (q.delay > 0) { q.delay -= dt; continue; }
    q.r += (q.speed ?? 135) * dt;
    if (Math.random() < 0.8) { const a = rnd(TAU); dust(q.x + Math.cos(a) * q.r, q.y + Math.sin(a) * q.r, 1, 20); }
    if (q.friendly) {
      for (const e of G.E) {
        if (!alive(e) || q.hit.has(e) || Math.abs(hyp(e.x - q.x, e.y - q.y) - q.r) > 6 + e.r) continue;
        q.hit.add(e);
        damage(e, pd(q.dmg), { dir: Math.atan2(e.y - q.y, e.x - q.x), kb: 180, src: 'boom' });
        if (e.type !== 'boss') e.stunT = Math.max(e.stunT, 1);
      }
    } else if (!q.hitP && Math.abs(hyp(p.x - q.x, p.y - q.y) - q.r) < 5) { if (tryHurt(2, q.x, q.y)) q.hitP = true; }
  }
  sweep(G.quakes, (q) => q.r < q.max);

  for (const l of G.hlines) {
    l.t += dt;
    if (!l.done && l.t >= l.pend) {
      l.done = true;
      if (segDist(p.x, p.y - 5, l.x0, l.y0, l.x1, l.y1) < 7) tryHurt(2, (l.x0 + l.x1) / 2, (l.y0 + l.y1) / 2);
      shake(0.2); A.slice();
    }
  }
  sweep(G.hlines, (l) => l.t < l.pend + 0.3);

  for (const b of G.hbeams) {
    b.t += dt;
    if (b.owner) { b.x = b.owner.x; b.y = b.owner.y - b.oy; }
    if (b.t > b.warn) b.a += b.rot * dt;
    b.len = beamLen(b.x, b.y, b.a, 340);
    if (b.t > b.warn && b.t < b.life) {
      const ex = b.x + Math.cos(b.a) * b.len, ey = b.y + Math.sin(b.a) * b.len;
      if (segDist(p.x, p.y - 5, b.x, b.y, ex, ey) < b.w / 2 + 3) tryHurt(2, b.x, b.y);
      if (Math.random() < 0.7) sparks(ex, ey, b.a + Math.PI, 2, 1, P.blood, 120);
    }
  }
  sweep(G.hbeams, (b) => b.t < b.life);
}

export function beamLen(x, y, a, max) {
  const cx = Math.cos(a), cy = Math.sin(a);
  let L = max;
  if (cx > 0) L = Math.min(L, (B.x1 - x) / cx); else if (cx < 0) L = Math.min(L, (B.x0 - x) / cx);
  if (cy > 0) L = Math.min(L, (B.y1 - y) / cy); else if (cy < 0) L = Math.min(L, (B.y0 - 6 - y) / cy);
  return Math.max(0, L);
}

function updateFx(dt) {
  for (const q of G.parts) {
    q.t += dt;
    const dr = Math.exp(-q.drag * dt);
    q.vx *= dr; q.vy *= dr;
    q.x += q.vx * dt; q.y += q.vy * dt;
    if (q.g) {
      q.vz -= q.g * dt; q.z += q.vz * dt;
      if (q.z <= 0) {
        q.z = 0;
        if (q.blood) { stain(q.x, q.y, q.c, q.s); q.t = q.life; } else { q.vz = -q.vz * 0.3; q.vx *= 0.5; q.vy *= 0.5; }
      }
    }
  }
  sweep(G.parts, (q) => q.t < q.life);
  for (const g of G.gibs) {
    g.t += dt;
    g.vz -= 240 * dt; g.z += g.vz * dt;
    if (g.z < 0) { g.z = 0; g.vz = -g.vz * 0.3; g.vx *= 0.6; g.vy *= 0.6; }
    const dr = Math.exp(-2.5 * dt);
    g.vx *= dr; g.vy *= dr;
    g.x += g.vx * dt; g.y += g.vy * dt;
    if (g.t < 0.3 && Math.random() < 0.5) part(g.x, g.y, g.vx * 0.3, g.vy * 0.3, 2, g.col, { z: g.z + 6, vz: 10, g: 300, blood: true, drag: 2 });
    if (g.t >= g.life) splat(g.x, g.y, 5, g.col, g.col2);
  }
  sweep(G.gibs, (g) => g.t < g.life);
  for (const s of G.slashes) { s.t += dt; if (s.follow) { s.x = G.p.x; s.y = G.p.y; } }
  sweep(G.slashes, (s) => s.t < s.life);
  for (const t of G.texts) { t.t += dt; t.y -= 26 * dt * (1 - t.t / t.life); }
  sweep(G.texts, (t) => t.t < t.life);
  for (const r of G.rings) { r.t += dt; r.r += r.vr * dt * (1 - r.t / r.life); }
  sweep(G.rings, (r) => r.t < r.life);
  for (const b of G.bolts) b.t += dt;
  sweep(G.bolts, (b) => b.t < b.life);
  for (const g of G.ghosts) g.t += dt;
  sweep(G.ghosts, (g) => g.t < g.life);
  for (const g of G.glitches) g.t += dt;
  sweep(G.glitches, (g) => g.t < g.life);
}

function updateAmbient(dt) {
  const kind = G.map.ambient, c = fx.cam;
  const n = settings.particles === 'LOW' ? 20 : 45;
  if (G.amb.length < n && Math.random() < dt * 20) {
    const x = c.x + rnd(W), y = c.y + rnd(H);
    if (kind === 'snow') G.amb.push({ x, y: c.y - 2, vx: rnd(-6, 2), vy: rnd(12, 24), c: Math.random() < 0.7 ? '#e6f2ff' : '#9fd3ff', t: 0, life: 10 });
    else if (kind === 'ash') G.amb.push({ x, y: c.y + H + 2, vx: rnd(-4, 4), vy: -rnd(8, 18), c: Math.random() < 0.3 ? '#ff6a2b' : '#6a5a5a', t: 0, life: 10 });
    else if (kind === 'data') G.amb.push({ x: Math.round(x / 8) * 8, y: c.y - 2, vx: 0, vy: rnd(30, 60), c: Math.random() < 0.5 ? '#62efff' : '#ff4fa8', t: 0, life: 4 });
    else if (kind === 'fireflies') G.amb.push({ x, y, vx: rnd(-8, 8), vy: rnd(-8, 8), c: Math.random() < 0.5 ? '#d8ff6a' : '#ffe08a', t: 0, life: rnd(3, 6), glow: true });
    else G.amb.push({ x, y, vx: rnd(-3, 3), vy: rnd(-3, 1), c: '#3d3250', t: 0, life: rnd(3, 6) });
  }
  for (const a of G.amb) {
    a.t += dt;
    if (kind === 'fireflies') { a.vx += rnd(-30, 30) * dt; a.vy += rnd(-30, 30) * dt; }
    if (kind === 'snow') a.vx += Math.sin(a.t * 2 + a.y * 0.05) * dt * 10;
    a.x += a.vx * dt; a.y += a.vy * dt;
  }
  sweep(G.amb, (a) => a.t < a.life && a.y > c.y - 10 && a.y < c.y + H + 10);
}

function updateCam(dt) {
  const p = G.p, b = G.boss, show = b && b.state === 'intro';
  // during a boss entrance the camera frames the boss instead of you
  const fxp = show ? b.x : p.x + Math.cos(p.aim) * 16, fyp = show ? b.y - 20 : p.y - 8 + Math.sin(p.aim) * 11;
  const tx = fxp - W / 2, ty = fyp - H / 2;
  const k = 1 - Math.exp(-7 * dt);
  fx.cam.x = clamp(fx.cam.x + (tx - fx.cam.x) * k, 0, AW - W);
  fx.cam.y = clamp(fx.cam.y + (ty - fx.cam.y) * k, 0, AH - H);
}

// ---------- rendering ----------
const shadowCache = {};
export function shadow(x, y, r) {
  r = Math.max(1, Math.round(r));
  let c = shadowCache[r];
  if (!c) {
    c = makeCanvas(r * 2 + 3, r + 2);
    const g = c.getContext('2d');
    g.fillStyle = '#050308';
    const ry = (r + 1) / 2, cx = r + 1, cy = ry;
    for (let yy = 0; yy < r + 2; yy++) for (let xx = 0; xx < r * 2 + 3; xx++) if (((xx - cx) / (r + 1)) ** 2 + ((yy - cy) / ry) ** 2 <= 1) g.fillRect(xx, yy, 1, 1);
    shadowCache[r] = c;
  }
  ctx.globalAlpha = 0.55;
  ctx.drawImage(c, Math.round(x - r - 1), Math.round(y - (r + 1) / 2));
  ctx.globalAlpha = 1;
}

const SLASH_COLS = () => ({
  ember: [P.paper, P.ember3, P.ember2, P.ember],
  volt: [P.paper, P.volt, P.volt, P.volt2],
  gold: [P.paper, P.gold, P.ember3, P.gold2],
  hex: [P.paper, P.hex, P.hex, P.hexD],
  blood: [P.paper, '#ff8a8a', P.blood, P.bloodD],
  steel: [P.paper, '#cfe0f5', '#8fa2bd', '#3c4a63'],
  fire: [P.paper, '#ffe08a', '#ff9a3c', '#c6380f'],
});
export function drawSlash(s) {
  const L = s.life, age = s.t;
  const reveal = Math.min(1, age / 0.05), tail = Math.max(0, (age - 0.05) / (L - 0.05));
  const cx = Math.round(s.x), cy = Math.round(s.y - 5), R = s.r, a0 = -s.arc / 2;
  const cols = SLASH_COLS()[s.col];
  const ir = Math.ceil(R);
  for (let y = -ir; y <= ir; y++) for (let x = -ir; x <= ir; x++) {
    const d = Math.sqrt(x * x + y * y);
    if (d > R || d < R - s.th - 1) continue;
    const u = (angDiff(Math.atan2(y, x), s.a) * s.dir - a0) / s.arc;
    if (u < tail || u > reveal || u < 0 || u > 1) continue;
    const th = s.th * Math.sin(Math.PI * Math.min(1, u * 1.15)) * (1 - tail * 0.7);
    const depth = R - d;
    if (depth > th) continue;
    const k = depth / Math.max(1, th);
    let c;
    if (depth < 1.2) c = cols[0];
    else if (k < 0.35) c = cols[1];
    else if (k < 0.7) c = cols[2];
    else { if (((x + cx + y + cy) & 1) === 0) continue; c = cols[3]; }
    ctx.fillStyle = c;
    ctx.fillRect(cx + x, cy + y, 1, 1);
  }
  const tipA = s.a + s.dir * (a0 + s.arc * reveal);
  glow(cx + Math.cos(tipA) * R * 0.8, cy + Math.sin(tipA) * R * 0.8, cols[2], 10, 0.5 * (1 - tail));
}

function drawPlayer() {
  const p = G.p, kit = G.kit;
  if (p.state === 'dead' || p.state === 'cine') return;
  if (p.inv > 0 && p.hurtT > -0.8 && p.state !== 'dash' && Math.floor(G.time * 22) % 2) return;
  const set = SPR.chars[G.char];
  const flip = Math.cos(p.state === 'attack' ? p.atkAng : p.aim) < 0;
  const moving = (p.state === 'move' || p.state === 'skill') && hyp(p.vx, p.vy) > 20;
  const fi = Math.floor(p.runT * 11) % 4;
  const fr = moving ? set.run[fi] : set.idle;
  const bob = moving && fi % 2 ? 1 : 0;
  const wa = p.state === 'attack' ? p.atkAng : p.aim;
  const behind = Math.sin(wa) < -0.3;
  shadow(p.x, p.y, 5);
  if (p.invis > 0) ctx.globalAlpha = 0.3 + (Math.floor(G.time * 10) % 2) * 0.1;
  kit.drawAura?.(p, flip);
  if (behind) kit.drawWeapon(p, flip);
  const sx = Math.round(p.x - fr.w / 2), sy = Math.round(p.y - fr.h + 1 - bob);
  drawSprite(fr, sx, sy, flip, p.hurtT > 0.15 ? P.blood : p.state === 'dash' ? kit.color() : null);
  // glowing eyes
  const ex = sx + (flip ? fr.w - 1 - set.eye[0] : set.eye[0]), ey = sy + set.eye[1], ec = kit.eyeColor || kit.color();
  px(ex, ey, P.paper); glow(ex, ey, ec, 4, 0.7);
  if (!behind) kit.drawWeapon(p, flip);
  ctx.globalAlpha = 1;
  glow(p.x + (flip ? -1 : 1), p.y - 9, kit.color(), 9, 0.2);
  drawOrbit(p);
  if (p.ascend > 0) { ring(p.x, p.y - 8, 13 + Math.sin(G.time * 14), 1, P.gold); glow(p.x, p.y - 8, P.gold, 16, 0.35); }
  if (p.shield > 0) { ring(p.x, p.y - 7, 12 + Math.sin(G.time * 8), 1, P.volt); glow(p.x, p.y - 7, P.volt, 12, 0.2); }
  if (p.fortress > 0) { ring(p.x, p.y - 7, 14 + Math.sin(G.time * 12) * 1.5, 2, P.gold); glow(p.x, p.y - 7, P.gold, 18, 0.3); }
}

export function drawEnemy(e) {
  if (e.under) return;
  const s = sprFor(e), sc = e.def.scale || 1;
  let x = e.x - (s.w * sc) / 2, y = e.y - s.h * sc + 1 - (e.z || 0);
  if (e.type === 'wisp') y -= 3 + Math.round(Math.sin(e.anim * 3) * 2);
  if (e.shakeT > 0 && fx.freeze > 0) x += Math.random() < 0.5 ? -1 : 1;
  if (e.marked > 0 || e.state === 'stun' || e.stunT > 0) x += Math.floor(G.time * 30) % 2 ? 1 : -1;
  shadow(e.x, e.y, e.r + (e.type === 'boss' ? 2 : 0) - Math.min(4, (e.z || 0) / 10));
  let tint = null;
  const blink = Math.floor(G.time * 18) % 2;
  if (e.flash > 0) tint = P.paper;
  else if (e.frozen > 0) tint = '#9fd3ff';
  else if (e.marked > 0) tint = blink ? P.paper : null;
  else if (e.tele && blink) tint = P.blood;
  else if ((e.state === 'windup' || e.state === 'aim') && blink) tint = P.blood;
  else if (e.state === 'fuse') tint = Math.floor(G.time * (8 + (0.7 - e.t) * 30)) % 2 ? P.paper : null;
  else if (e.dying) tint = blink ? P.paper : e.def.col;
  else if (e.shieldUp) tint = blink ? null : '#62efff';
  if (!tint && e.def.tint) tint = e.def.tint;
  if (e.enraged && !e.dying) glow(e.x, e.y - e.r * 2, P.blood, e.r * 2 + 6, 0.25 + Math.sin(G.time * 10) * 0.1);
  if (e.state === 'spawn') {
    const k = 1 - e.t / 0.28;
    ctx.save(); ctx.beginPath(); ctx.rect(x - 2, y + s.h * (1 - k), s.w + 4, s.h * k + 1); ctx.clip();
    drawSprite(s, x, y, e.face < 0, P.paper);
    ctx.restore();
    return;
  }
  if (e.elite) { for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) drawSprite(s, x + ox, y + oy, e.face < 0, P.gold); glow(e.x, e.y - e.r, P.gold, 10, 0.25); }
  if (sc > 1) { ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(sc, sc); drawSprite(s, 0, 0, e.face < 0, tint); ctx.restore(); }
  else drawSprite(s, x, y, e.face < 0, tint);
  if (e.type === 'wisp' && e.state === 'windup') glow(e.x, y + 4, P.hex, 6 + (0.55 - e.t) * 18, 0.6);
  if (e.type === 'egg') glow(e.x, e.y - 3, DEF.egg.col, 6 + Math.sin(G.time * 8) * 2, 0.3);
  if (e.type === 'boss') BOSSES[e.boss].draw?.(e, x, y, s);
  if (e.state === 'windup' && e.type === 'husk' && blink) textO('!', e.x, y - 8, P.blood, 1, 'c');
  if (e.state === 'stun' || e.stunT > 0) for (let i = 0; i < 3; i++) { const a = G.time * 6 + (i * TAU) / 3; px(e.x + Math.cos(a) * 7, y - 3 + Math.sin(a) * 2, P.gold); }
  if (e.frozen > 0) { px(x + 2, y + 2, P.paper); px(x + s.w - 3, y + 4, P.paper); }
  if (e.hp < e.maxHp && e.type !== 'boss' && !e.dying) {
    const w = e.r * 2 + 2;
    rect(e.x - w / 2, y - 4, w, 2, P.ink0);
    rect(e.x - w / 2, y - 4, Math.max(1, Math.round((w * e.hp) / e.maxHp)), 1, e.burn > 0 ? P.ember : e.elite ? P.gold : P.blood);
  }
}

function drawGib(g) {
  if (g.t > g.life - 0.3 && Math.floor(G.time * 24) % 2) return;
  const sx = g.x - g.s.w / 2, sy = g.y - g.s.h + 1 - g.z;
  const cx = g.x, cy = g.y - g.s.h / 2 - g.z;
  const ux = Math.cos(g.sa), uy = Math.sin(g.sa), nx = -uy * g.side, ny = ux * g.side;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx + ux * 50, cy + uy * 50);
  ctx.lineTo(cx - ux * 50, cy - uy * 50);
  ctx.lineTo(cx - ux * 50 + nx * 50, cy - uy * 50 + ny * 50);
  ctx.lineTo(cx + ux * 50 + nx * 50, cy + uy * 50 + ny * 50);
  ctx.closePath();
  ctx.clip();
  drawSprite(g.s, sx, sy, g.flip, g.t < 0.08 ? P.paper : null);
  ctx.restore();
  if (g.t < 0.12 && g.side > 0) line(cx - ux * 10, cy - uy * 10, cx + ux * 10, cy + uy * 10, P.paper);
}

export function drawBolt(b, c1 = P.paper, c2 = P.volt, c3 = P.volt2) {
  const segs = Math.max(2, Math.round(hyp(b.x1 - b.x0, b.y1 - b.y0) / 7));
  const nx = -(b.y1 - b.y0), ny = b.x1 - b.x0, nl = hyp(nx, ny) || 1;
  let lx = b.x0, ly = b.y0;
  const fade = b.life ? b.t / b.life : 0;
  for (let i = 1; i <= segs; i++) {
    const k = i / segs, j = i === segs ? 0 : rnd(-5, 5) * (1 - fade * 0.5);
    const x = b.x0 + (b.x1 - b.x0) * k + (nx / nl) * j, y = b.y0 + (b.y1 - b.y0) * k + (ny / nl) * j;
    line(lx + 1, ly, x + 1, y, c3);
    line(lx, ly, x, y, fade < 0.5 ? c1 : c2);
    lx = x; ly = y;
  }
  glow(b.x1, b.y1, c2, 10, 0.6 * (1 - fade));
}

function drawTelegraphs() {
  const blink = Math.floor(G.time * 16) % 2;
  for (const e of G.E) {
    if (e.type === 'brute' && e.state === 'aim') {
      const cx = Math.cos(e.lock), cy = Math.sin(e.lock);
      for (let i = 12; i < 240; i += 6) {
        if (((i / 6) | 0) % 2 === Math.floor(G.time * 12) % 2) continue;
        line(e.x + cx * i, e.y + cy * i, e.x + cx * (i + 3), e.y + cy * (i + 3), e.t < 0.25 && blink ? P.paper : P.blood);
      }
    }
    if (e.type === 'tick' && e.state === 'fuse') ring(e.x, e.y, 30, 1, blink ? P.blood : P.bloodD);
    if (e.type === 'boss' && !e.dying) BOSSES[e.boss].tele?.(e, blink);
  }
  for (const s of G.strikes) {
    const k = Math.min(1, s.t / s.delay);
    if (s.kind === 'acid' || s.kind === 'grenade') {
      const h = Math.sin(k * Math.PI) * 50, x = s.x0 + (s.x - s.x0) * k, y = s.y0 + (s.y - s.y0) * k - h;
      ring(s.x, s.y, s.kind === 'grenade' ? s.R : 6, 1, blink ? s.c : P.ink3);
      disc(x, y, 2, s.c); px(x, y, P.paper); glow(x, y, s.c, 6, 0.4);
      continue;
    }
    ring(s.x, s.y, s.R * (0.3 + 0.7 * k), 1, s.friendly ? s.c : blink ? P.blood : P.paper);
    ring(s.x, s.y, s.R, 1, s.friendly ? P.ink3 : P.bloodD);
    const fy = s.y - (1 - k) * 140, fx2 = s.x + (1 - k) * 40;
    if (k > 0.25 && s.kind !== 'lightning') {
      line(fx2, fy, fx2 + 10, fy - 26, s.c, 2);
      disc(fx2, fy, s.kind === 'missile' ? 2 : 4, s.c); px(fx2, fy, P.paper);
      glow(fx2, fy, s.c, 10, 0.5);
    }
  }
  for (const l of G.hlines) {
    if (!l.done) line(l.x0, l.y0, l.x1, l.y1, Math.floor(G.time * 30) % 2 ? P.blood : l.t > l.pend - 0.3 ? P.paper : P.bloodD);
    else {
      const k = (l.t - l.pend) / 0.3, w = Math.max(1, Math.round(5 * (1 - k)));
      line(l.x0, l.y0 + 1, l.x1, l.y1 + 1, P.blood, w + 2); line(l.x0, l.y0, l.x1, l.y1, P.paper, w);
    }
  }
  for (const b of G.hbeams) {
    const ex = b.x + Math.cos(b.a) * b.len, ey = b.y + Math.sin(b.a) * b.len;
    if (b.t < b.warn) { if (blink) line(b.x, b.y, ex, ey, P.blood); }
    else {
      const w = b.w + (Math.random() < 0.5 ? 1 : 0);
      line(b.x, b.y, ex, ey, P.bloodD, w + 4); line(b.x, b.y, ex, ey, P.blood, w); line(b.x, b.y, ex, ey, P.paper, Math.max(1, w - 4));
      glow(ex, ey, P.blood, 14, 0.5); glow(b.x, b.y, P.blood, 12, 0.5);
    }
  }
}

function drawZones() {
  for (const z of G.zones) {
    const fade = z.life === Infinity ? 1 : Math.min(1, (z.life - z.t) * 2);
    if (z.type === 'lava') {
      glow(z.x, z.y, P.ember, z.r + 8 + Math.sin(G.time * 3 + z.x) * 2, 0.2);
      for (let i = 0; i < 3; i++) { const a = G.time * 0.7 + i * 2.1 + z.x; px(z.x + Math.cos(a) * z.r * 0.5, z.y + Math.sin(a * 1.3) * z.r * 0.4, '#ffe08a'); }
    } else if (z.type === 'burn') {
      if (fade > 0.3 || Math.floor(G.time * 20) % 2) { ring(z.x, z.y, z.r, 1, P.ember); glow(z.x, z.y, P.ember, z.r, 0.25 * fade); }
    } else if (z.type === 'acid') {
      if (fade > 0.3 || Math.floor(G.time * 20) % 2) { disc(z.x, z.y, z.r * 0.8, '#3e5a12'); ring(z.x, z.y, z.r * 0.8, 1, '#b5f23a'); glow(z.x, z.y, '#b5f23a', z.r, 0.2); }
    } else if (z.type === 'smoke') {
      for (let i = 0; i < 14; i++) { const a = i * 0.45 + z.t, d = z.r * (0.4 + (i % 3) * 0.3); disc(z.x + Math.cos(a) * d, z.y - 6 + Math.sin(a) * d * 0.6, 5 + (i % 2) * 2, i % 2 ? '#4a4458' : '#5c5670'); }
    }
  }
}

export function drawWorld() {
  const cx = Math.round(fx.cam.x + fx.ox), cy = Math.round(fx.cam.y + fx.oy);
  ctx.fillStyle = P.void; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(floor, -cx, -cy);
  ctx.drawImage(decal, -cx, -cy);
  ctx.save();
  ctx.translate(-cx, -cy);

  const fl = G.map.flame;
  for (const [tx, ty] of TORCHES) {
    const f = Math.floor(G.time * 12 + tx) % 3;
    rect(tx - 1, ty - 2 - f, 3, 3 + f, fl[0]);
    rect(tx, ty - 4 - f, 1, 3, fl[1]);
    px(tx, ty, fl[2]);
    glow(tx, ty - 1, fl[0], 20 + f, 0.16);
  }
  if (G.map.deco === 'grid') { const sy = B.y0 + ((G.time * 40) % (B.y1 - B.y0)); rect(B.x0, sy, B.x1 - B.x0, 1, '#2f2a80'); }

  drawZones();

  for (const s of G.sigils) {
    const k = s.t / s.life, boss = s.type === 'boss', col = boss ? BOSSES[bossFor(G.wave)].col : DEF[s.type].col, big = boss ? 2.2 : 1;
    const r = 9 * big * Math.min(1, k * 2.2);
    ring(s.x, s.y, r, 1, col);
    ring(s.x, s.y, r * 0.55, 1, boss ? P.ink3 : DEF[s.type].colD);
    for (let i = 0; i < 3; i++) { const a = G.time * 5 + (i * TAU) / 3; rect(s.x + Math.cos(a) * (r + 2) - 1, s.y + Math.sin(a) * (r + 2) * 0.7 - 1, 2, 2, P.paper); }
    glow(s.x, s.y, col, 8 * big, 0.25 + k * 0.4);
  }

  drawTelegraphs();

  for (const q of G.quakes) {
    if (q.delay > 0 || q.r < 2) continue;
    ring(q.x, q.y, q.r, 3, q.c2 || (q.friendly ? P.gold2 : P.hexD));
    ring(q.x, q.y, q.r, 1, q.c || (q.friendly ? P.gold : P.hex));
  }

  for (const c of G.cuts) {
    if (!c.done) line(c.x0, c.y0, c.x1, c.y1, Math.floor(G.time * 30) % 2 ? P.paper : P.dust);
    else {
      const k = Math.min(1, (c.t - c.pend) / 0.22), w = Math.max(1, Math.round(6 * (1 - k)));
      if (k < 1) { line(c.x0, c.y0 + 1, c.x1, c.y1 + 1, P.ember, w + 2); line(c.x0, c.y0, c.x1, c.y1, P.paper, w); }
    }
  }

  const list = [];
  for (const k of G.picks) list.push([k.y, 0, k]);
  for (const g of G.gibs) list.push([g.y, 1, g]);
  for (const e of G.E) list.push([e.y, 2, e]);
  for (const a of G.allies) list.push([a.y, 4, a]);
  if (!G.cine) list.push([G.p.y, 3, G.p]);
  list.sort((a, b) => a[0] - b[0]);

  for (const g of G.ghosts) {
    if (g.t < 0) continue;
    ctx.globalAlpha = 0.4 * (1 - g.t / g.life);
    drawSprite(g.spr, g.x - g.spr.w / 2, g.y - g.spr.h + 1, g.flip, g.c);
    ctx.globalAlpha = 1;
  }

  for (const [, kind, o] of list) {
    if (kind === 0) {
      if (o.kind === 'heal') { drawSprite(SPR.heal, o.x - 2, o.y - 5 - o.z, false); glow(o.x, o.y - 3 - o.z, P.blood, 7, 0.4); }
      else { rect(o.x - 1, o.y - 2 - o.z, 2, 2, P.volt); px(o.x, o.y - 2 - o.z, P.paper); glow(o.x, o.y - 1 - o.z, P.volt, 5, 0.45); }
    } else if (kind === 1) drawGib(o);
    else if (kind === 2) drawEnemy(o);
    else if (kind === 4) ALLY[o.type].draw(o);
    else drawPlayer();
  }

  for (const s of G.slashes) drawSlash(s);
  G.kit.draw?.(G.p);

  for (const s of G.shots) {
    if (s.kind === 'bullet' || s.kind === 'pellet') {
      line(s.x, s.y, s.x - s.vx * 0.02, s.y - s.vy * 0.02, s.c);
      px(s.x, s.y, P.paper);
    } else if (s.kind === 'packet') {
      // a flying 1 or 0
      if ((s.spin | 0) % 2) rect(s.x, s.y - 1, 1, 3, s.c); else { rect(s.x - 1, s.y - 1, 2, 3, s.c); px(s.x - 1, s.y, P.ink0); }
      glow(s.x, s.y, s.c, 4, 0.5);
    } else if (s.fist) {
      disc(s.x, s.y, 5, '#5d6878'); disc(s.x, s.y, 3, '#8b98ab'); px(s.x, s.y, P.paper);
      line(s.x, s.y, s.x - s.vx * 0.05, s.y - s.vy * 0.05, P.ember, 2); glow(s.x - s.vx * 0.05, s.y - s.vy * 0.05, P.ember, 8, 0.6);
    } else if (s.kind === 'shuriken') {
      const a = s.spin;
      line(s.x - Math.cos(a) * 3, s.y - Math.sin(a) * 3, s.x + Math.cos(a) * 3, s.y + Math.sin(a) * 3, P.bone);
      line(s.x - Math.cos(a + 1.57) * 3, s.y - Math.sin(a + 1.57) * 3, s.x + Math.cos(a + 1.57) * 3, s.y + Math.sin(a + 1.57) * 3, P.bone);
      px(s.x, s.y, P.paper);
    } else if (s.kind === 'rocket') {
      line(s.x, s.y, s.x - s.vx * 0.03, s.y - s.vy * 0.03, P.bone, 2);
      px(s.x, s.y, P.paper);
      glow(s.x - s.vx * 0.03, s.y - s.vy * 0.03, P.ember, 6, 0.5);
    } else {
      if (s.owner === 'player') line(s.x, s.y, s.x - s.vx * 0.03, s.y - s.vy * 0.03, s.c);
      disc(s.x, s.y, s.r, s.c);
      px(s.x, s.y, P.paper);
      if (s.noparry) ring(s.x, s.y, s.r + 1, 1, P.ember);
      glow(s.x, s.y, s.c, 9, 0.5);
    }
  }

  for (const q of G.parts) {
    if (q.t > q.life * 0.75 && !q.blood && Math.floor(G.time * 30) % 2) continue;
    rect(q.x, q.y - q.z, q.s, q.s, q.c);
    if (q.glow && q.t < q.life * 0.5) glow(q.x, q.y - q.z, q.c, 3, 0.35);
  }
  for (const a of G.amb) { px(a.x, a.y, a.c); if (a.glow) glow(a.x, a.y, a.c, 4, 0.4 * Math.sin((a.t / a.life) * Math.PI)); }

  for (const b of G.bolts) drawBolt(b, b.c1, b.c2, b.c3);
  for (const g of G.glitches) {
    // glitch blocks: green, magenta and white slices that jitter
    const k = 1 - g.t / g.life;
    for (let i = 0; i < g.n * k; i++) {
      const w = rnd(3, g.w), h = rnd(1, 3);
      rect(g.x + rnd(-g.w, g.w) / 2 - w / 2, g.y + rnd(-g.h, g.h) / 2, w, h, ['#39ff6a', '#ff4fa8', P.paper, '#1a1a20'][Math.floor(rnd(4))]);
    }
  }
  for (const r of G.rings) ring(r.x, r.y, r.r, Math.max(1, Math.round(r.th * (1 - r.t / r.life))), r.c);

  for (const t of G.texts) {
    const pop = t.t < 0.07 ? 1 : 0;
    if (t.t > t.life * 0.7 && Math.floor(G.time * 25) % 2) continue;
    textO(t.s, t.x, t.y, t.c, t.sc + pop, 'c');
  }

  if (G.cine) G.cine.draw(cx, cy);
  ctx.restore();
  if (G.dark > 0) drawDark();
}

// the final boss's last phase: everything outside a small circle around you goes dark
const darkLayer = makeCanvas(W, H), dkg = darkLayer.getContext('2d');
function drawDark() {
  const p = G.p, sx = Math.round(p.x - fx.cam.x - fx.ox), sy = Math.round(p.y - 6 - fx.cam.y - fx.oy);
  dkg.globalCompositeOperation = 'source-over';
  dkg.clearRect(0, 0, W, H);
  dkg.fillStyle = '#030206';
  dkg.globalAlpha = 0.88 * G.dark;
  dkg.fillRect(0, 0, W, H);
  dkg.globalCompositeOperation = 'destination-out';
  for (let r = 70; r > 20; r -= 10) { dkg.globalAlpha = 0.25; dkg.beginPath(); dkg.arc(sx, sy, r, 0, TAU); dkg.fill(); }
  dkg.globalAlpha = 1;
  dkg.globalCompositeOperation = 'source-over';
  ctx.drawImage(darkLayer, 0, 0);
}
