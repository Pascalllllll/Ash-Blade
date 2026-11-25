import { remap, W, H, FW, SX, onWidth, fillScreen, ctx, P, makeCanvas, rect, px, line, disc, ring, drawSprite, glow, glowBegin, glowAt, glowEnd, text, textO, snap, SS } from './gfx.js?v=212';
import { SPR, EVO_NAMES } from './sprites.js?v=212';
import { A } from './audio.js?v=212';
import { input, actionDown, actionHit } from './input.js?v=212';
import { settings, OPTIONS, best, saveBest, testing, TEST_BUFF, codexNote } from './store.js?v=212';
import { AW, AH, B, TORCHES, MAPS, buildFloor, stageFor, depthOf } from './maps.js?v=212';
import { CHARS, ALLY, swordAngle, previewable } from './chars.js?v=212';
import { BOSSES, bossFor, ORDER, updateTricks, drawTricks } from './bosses.js?v=212';
import { byId, grantAllUpgrades } from './upgrades.js?v=212';
import { KILLS, startDeath, updateDeath, drawDeath, drawDeathUnder } from './deaths.js?v=212';
import { softFacingLeft, drawWeaponAt, sheathPose } from './hero-sprites.js?v=212';
import { WEAPON_ART } from './hero-rig.js?v=212';
import { say, updateTalk, TALK, waveTalk, bossDeadLines, lastWords } from './story.js?v=212';
import { loadMonsterSheet, startMonsterMotion, advanceMonsterMotion, monsterFrame, monsterPose } from './monster-motion.js?v=212';
import { drawBossArrival, bossArrivalUpdate, ARRIVE_LIFE } from './boss-arrivals.js?v=212';
// how long each boss's arrival takes to fade once the boss is here (the Brood Mother's web lasts while she comes down)
const ARRIVE_FADE = { brood: 3.8, herald: 1.8, nox: 2.4, king: 1.6, eclipse: 1.8, wyrm: 1.4, clock: 1.4, warden: 1.2, colossus: 0.8, mirror: 1 };
import { floorArrival } from './floor-arrivals.js?v=212';
import { awakenNox, deepBossTurn, drawDeepFloor, noxDust, rememberAction, drawLash } from './deep.js?v=212';
import { startTutorial, tutNote, tutAllows, tutImmune, drawTutorialMarks } from './tutorial.js?v=212';
import { drawEmote } from './emotes.js?v=212';
import { drawVoid, drawVoidGround } from './void.js?v=212';
import { drawObstacle, drawObstacleShadow } from './obstacles.js?v=212';
import { perkFactors } from './shop.js?v=212';
import { PROPS, MAP_PROPS, drawProp } from './props.js?v=212';
import { dailyNote, dailyMax } from './daily.js?v=212';

export { AW, AH, B };
export const TAU = Math.PI * 2;
export const rnd = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
export const hyp = Math.hypot;
export function sweep(arr, keep) { let j = 0; for (let i = 0; i < arr.length; i++) if (keep(arr[i])) arr[j++] = arr[i]; arr.length = j; }
export const alive = (e) => !e.dead && !e.dying && e.state !== 'spawn' && !e.under;
// a monster to aim at: alive, and not one of the things to break (props.js)
export const foe = (e) => alive(e) && !e.prop;
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
// a hot combo powers the fighter up: from A every hit lands harder (the HUD shows how much), from S the fighter
// leaves afterimages and burns in the rank's color, at SSS a golden aura. Getting hit loses the combo and all of it.
export const RANK_POWER = [1, 1, 1, 1.05, 1.1, 1.18, 1.3];

// the ash priest heals every monster within this many pixels
const PRIEST_R = 70;
export const DEF = {
  husk: { r: 5, hp: 7, kbRes: 0, col: '#b5f23a', colD: '#45651a', score: 100, speed: 40, energy: 2 },
  wisp: { r: 5, hp: 5, kbRes: 0, col: '#ff4fa8', colD: '#6e1b52', score: 150, speed: 46, energy: 3 },
  tick: { r: 4, hp: 3, kbRes: 0, col: '#ff5a3c', colD: '#6b0f24', score: 80, speed: 74, energy: 1 },
  brute: { r: 11, hp: 46, kbRes: 0.8, col: '#ff7a2a', colD: '#3a2430', score: 450, speed: 26, energy: 6 },
  larva: { r: 3, hp: 2, kbRes: 0, col: '#b5f23a', colD: '#45651a', score: 20, speed: 100, energy: 0 },
  slime: { r: 6, hp: 12, kbRes: 0.2, col: '#4ad6c0', colD: '#1a5a52', score: 140, speed: 34, energy: 2 },
  slimelet: { r: 3, hp: 3, kbRes: 0, col: '#4ad6c0', colD: '#1a5a52', score: 30, speed: 60, energy: 0 },
  spitter: { r: 6, hp: 14, kbRes: 0.6, col: '#d6e24a', colD: '#5a6a1a', score: 220, speed: 22, energy: 3 },
  shade: { r: 5, hp: 10, kbRes: 0, col: '#9a7aff', colD: '#3a2a6a', score: 260, speed: 50, energy: 3 },
  egg: { r: 4, hp: 12, kbRes: 1, col: '#c9d48a', colD: '#45651a', score: 40, speed: 0, energy: 1 },
  lootling: { r: 5, hp: 20, kbRes: 0.3, col: '#ffd447', colD: '#8a5a00', score: 800, speed: 74, energy: 0 },
  archer: { r: 5, hp: 8, kbRes: 0, col: '#c8a070', colD: '#5a3a20', score: 200, speed: 38, energy: 2 },
  priest: { r: 5, hp: 11, kbRes: 0.1, col: '#7dff9a', colD: '#2a6a3a', score: 300, speed: 32, energy: 3 },
  bellwraith: { r: 7, hp: 34, kbRes: 0.48, col: '#e5ae74', colD: '#644253', score: 480, speed: 36, energy: 5 },
  glasswing: { r: 6, hp: 21, kbRes: 0.18, col: '#9bdedb', colD: '#43446b', score: 375, speed: 61, energy: 4 },
};
// ---------- wave twists: from wave 6, about one normal wave in three gets a rule change ----------
export const TWISTS = {
  BLOOD: { name: 'BLOOD MOON', sub: 'ENEMIES ARE FASTER  DOUBLE SCORE', c: '#ff3b3b' },
  SWARM: { name: 'SWARM', sub: 'TWICE THE ENEMIES  HALF THE HEALTH', c: '#b5f23a' },
  ELITE: { name: 'ELITE HUNT', sub: 'ELITES EVERYWHERE  THEY DROP HEARTS', c: '#ffd447' },
  GOLD: { name: 'GOLD RUSH', sub: 'CATCH THE LOOTLINGS BEFORE THEY DIG OUT', c: '#ffd447' },
  GLASS: { name: 'GLASS', sub: 'ENEMIES HAVE HALF HEALTH  HITS COST 2 HEARTS', c: '#9fd3ff' },
  BLACKOUT: { name: 'BLACKOUT', sub: 'THE LIGHTS GO OUT  1.5X SCORE', c: '#9a7aff' },
};
const twistScore = () => (G.twist === 'BLOOD' ? 2 : G.twist === 'BLACKOUT' ? 1.5 : 1);
// multi-kills: kills within half a second of each other chain
const MULTI = (n) => (n === 2 ? 'DOUBLE KILL' : n === 3 ? 'TRIPLE KILL' : n === 4 ? 'QUAD KILL' : n === 5 ? 'PENTA KILL' : n <= 8 ? 'RAMPAGE' : n <= 12 ? 'MASSACRE' : n <= 19 ? 'CARNAGE' : 'ANNIHILATION');
export const multiName = MULTI;
// elite affixes: every elite rolls one, shown as a coloured outline and a tag over its health bar
export const AFFIX = {
  REGEN: { name: 'REGEN', c: '#5aff7a' },
  VOLATILE: { name: 'VOLATILE', c: '#ff9a3c' },
  WARDED: { name: 'WARDED', c: '#62efff' },
  FRENZIED: { name: 'FRENZY', c: '#ffd447' },
  SPLITTING: { name: 'SPLIT', c: '#ff4fa8' },
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
export const fx = { trauma: 0, shakeT: 0, freeze: 0, slowT: 0, slowF: 1, flashT: 0, flashMax: 1, flashC: '#fff', flashStrong: false, flashLog: [], cam: { x: 0, y: 0 }, ox: 0, oy: 0, kx: 0, ky: 0, hurtVig: 0 };
// a hit's freeze-frame: short (at most 0.07 s), and never again for a quarter second after one, so a stream of
// hits can't add up to the game crawling in slow motion
export function hitstop(d) {
  if (fx.freezeCd > 0 && fx.freeze <= 0) return;
  fx.freeze = Math.max(fx.freeze, Math.min(d, 0.07)); fx.freezeCd = fx.freeze + 0.25;
}
export function slowmo(d, f) { if (fx.slowT <= 0 || f < fx.slowF) fx.slowF = f; fx.slowT = Math.max(fx.slowT, d); }
// a directional camera punch, on top of the trauma shake
export function kick(a, amt) { const k = settings.shake; fx.kx += Math.cos(a) * amt * k; fx.ky += Math.sin(a) * amt * k; }
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
// (the descent shows its first floor until a run is under way)
export function showMap(key) { key = stageFor(key, 1); if (floorKey !== key) { buildFloor(floor, key); floorKey = key; } }

// blood and scorch marks fade out over the time set in settings
function fadeStains(dt) {
  const a = settings.blood === '10 SEC' ? 0.1 : settings.blood === '30 SEC' ? 0.035 : 0;
  if (!a) return;
  G.fadeT = (G.fadeT || 0) - dt;
  if (G.fadeT <= 0) {
    G.fadeT = 0.5;
    dctx.globalCompositeOperation = 'destination-out'; dctx.globalAlpha = a;
    dctx.fillRect(0, 0, AW, AH);
    dctx.globalCompositeOperation = 'source-over'; dctx.globalAlpha = 1;
  }
}
// 8-bit alpha never quite reaches zero, so the faint leftovers are cleared now and then. Reading the stain layer
// back stalls the GPU (a hitch you feel on a phone), so it happens between waves, never mid-fight.
function sweepStains() {
  if (settings.blood === 'NEVER FADES') return;
  const img = dctx.getImageData(0, 0, AW, AH), d = img.data;
  for (let i = 3; i < d.length; i += 4) if (d[i] && d[i] < 24) d[i] = 0;
  dctx.putImageData(img, 0, 0);
}
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

function makePlayer(kit, D, pf) {
  const s = kit.stats, extra = pf?.hp || 0;
  return {
    x: AW / 2, y: (B.y0 + B.y1) / 2 + 20, vx: 0, vy: 0, r: 5, hp: s.hp + D.php + extra + (TEST_BUFF ? 20 : 0), maxHp: s.hp + D.php + extra + (TEST_BUFF ? 20 : 0), aim: -Math.PI / 2, moveAng: 0,
    state: 'move', t: 0, step: 0, atkT: 0, atkDur: 0, cancelAt: 0, atkAng: 0, swing: null, swingHit: null, comboWin: 0,
    bufAtk: 0, bufDash: 0, bufQ: 0, bufE: 0, bufR: 0, dashT: 0, dashCd: 0, charges: kit.dash.charges, dashMax: kit.dash.charges,
    dx: 0, dy: 0, inv: 0, hurtT: -9, recT: 0, energy: 50, ult: 0, ultLock: 0, cdQ: 0, cdE: 0,
    runT: 0, stepT: 0, ghostT: 0, holdT: 0, atkHeld: false, chargeT: 0, chargeFull: false, chg: null, ascend: 0, orbitA: 0, orbitHit: new Map(), perfectUsed: false, phantomHit: null, invis: 0, shield: 0, shieldT: 0, fortress: 0, slowMul: 1, hitCount: 0,
    k: kit.init ? kit.init() : {},
  };
}

export function newRun(charId, save, opts = {}) {
  Object.assign(B, HOME_B);
  dctx.clearRect(0, 0, AW, AH);
  const char = OPTIONS.char.includes(charId) ? charId : 'BLADE';
  const arena = 'DESCENT', diffKey = save ? save.diff : settings.diff;
  // TESTING, temporary: start at a later wave (past the King counts him as beaten; NIGHT is the endless night)
  const at = save ? save.wave : settings.testStart === 'NIGHT' ? 51 : Number(settings.testStart.split(' ')[1]) || 1;
  // the arena chosen (the descent, or one floor for the whole run) and the floor the run starts on
  // training from the camp's dummy is fought in the camp's own yard, never in the pit
  const mapKey = opts.train ? 'YARD' : stageFor(arena, at);
  const kit = CHARS[char], D = DIFF[diffKey], pf = perkFactors(char);
  for (const key of ['q', 'e', 'r']) input.aimable[key] = previewable(char, key);
  A.stopVoice();
  A.prepareVoice(char);
  A.prepareVoice(char, 'entrances');
  showMap(mapKey);
  G = {
    char, kit, arena, mapKey, map: MAPS[mapKey], diffKey, D, descend: 0, obst: obstaclesOf(mapKey), props: [],
    t: 0, time: 0, wave: 0, score: 0, kills: 0, maxCombo: 0, bestRank: 0, combo: 0, comboT: 0, rank: 0, rankPop: 0,
    p: makePlayer(kit, D, pf), pf, gold: 0, goldBanked: 0,
    E: [], shots: [], parts: [], slashes: [], texts: [], bolts: [], rings: [], gibs: [], picks: [], sigils: [], ghosts: [],
    booms: [], cuts: [], quakes: [], timers: [], glitches: [], unlocks: [], perfects: 0, bossClean: false, killsBanked: 0, strikes: [], zones: [], hlines: [], hbeams: [], allies: [], amb: [],
    queue: [], spawnCd: 0, phase: 'intro', phaseT: 2, banner: null, dark: 0,
    up: { wpn: 1, overflow: 0, spell: 1, crit: 0, magnet: 0, thorns: 0, orbit: 0, dashMul: 1, cdMul: 1, evoWpn: 0, evoSpell: 0, evoUlt: 0, evoHeart: 0, evoSwift: 0, evoStatic: 0, evoEmber: 0, evoOrbit: 0, dmg: 1, spd: 1, reach: 1, regen: 1, static: 0, ember: 0, phantom: 0, mirror: 0, debt: 0, shrap: 1, exec: 0, focus: 1, echo: 0, storm: 0, mag: 0, pierce: 0, frost: 0, twin: 0, venom: 0, overclock: 0, hands: 0, after: 0, coolant: 0, cluster: 0, phoenix: 0, rage: 0, crown: 0, midas: 0, reaper: 0 },
    taken: {}, cine: null, boss: null, dead: false, deadT: 0, wantUpgrade: false, victory: false, won: false,
    tested: !!save?.tested || testing(), nox: !!save?.nox, saveError: false,
    phoenixUsed: false, pickChain: 0, pickChainT: 0, debtKills: 0, corpses: [], twist: null, lastTwist: null, mk: 0, mkT: 0, mkShow: null, bestMulti: 0, dmg: 0, bosses: 0, loot: 0, deny: { q: 0, e: 0, r: 0, dash: 0 }, startBest: best.score,
  };
  // timers and delayed cuts remember whether the fighter made them, so their effects take its awakened colors
  for (const arr of [G.timers, G.cuts, G.bolts, G.quakes, G.ghosts, G.booms, G.slashes, G.strikes, G.allies]) arr.push = function (...a) { for (const o of a) { o.power ??= G.power; o.pfx = !!G.pfx; if (G.inCharge) o.chg = true; if (o.pfx && G.awPal && o.c) o.c = G.awPal[o.c] || o.c; } return Array.prototype.push.apply(this, a); };
  for (const [x, y, r] of G.map.pools) G.zones.push({ type: 'lava', x, y, r, t: 0, life: Infinity, pool: true });
  fx.trauma = 0; fx.freeze = 0; fx.freezeCd = 0; fx.slowT = 0; fx.slowF = 1; fx.hurtVig = 0;
  if (save) {
    // re-apply every upgrade the save says was taken, then restore the exact numbers
    for (const id in save.taken) { const u = byId(id); for (let i = 0; i < save.taken[id]; i++) u.f(G.up, G.p); G.taken[id] = save.taken[id]; }
    G.killsBanked = save.kills;
    Object.assign(G, { score: save.score, kills: save.kills, maxCombo: save.maxCombo, bestRank: save.bestRank, won: save.won, time: save.time }, save.extra || {});
    Object.assign(G.p, { hp: save.hp, maxHp: save.maxHp, energy: save.energy, ult: save.ult, dashMax: save.dashMax, charges: save.dashMax });
    if (G.kit.init) G.p.k = G.kit.init();
    if (save.awakened) { G.evo = true; G.kit = awakenKit(G.kit); G.awPal = G.kit.awake?.pal.map || null; }
    G.phoenixUsed = !!save.phoenixUsed;
    startWave(save.wave);
    if (G.night) {
      G.night.t = save.nightTime || 0;
      if (G.nox) grantAllUpgrades(G);
      G.undyingUsed = !!save.undyingUsed;
    }
  } else {
    if (at > 20) G.won = true;
    // a player's very first run starts with training in place of wave 1's monsters
    if (at === 1 && ((!best.tut && !testing()) || opts.train)) G.tutWant = true;
    // training from the camp's dummy: just the lessons, no records, then back to camp
    if (opts.train) { G.training = true; G.tested = true; }
    startWave(at);
  }
  applyPractice();
  spawnProps();
  if (!G.tested) codexNote('floors', G.mapKey);
  G.cine = G.kit.entrance();
  fx.cam.x = clamp(G.p.x - W / 2, SX, AW - W - SX); fx.cam.y = clamp(G.p.y - H / 2, 0, AH - H);
}

export function applyPractice() {
  if (!G || !testing()) return;
  G.tested = true;
  if (settings.testBuffs) grantAllUpgrades(G);
  if (settings.testCharge) { G.p.energy = G.p.ult = 100; G.p.cdQ = G.p.cdE = 0; }
}

// checkpoint taken at the start of each wave
export function snapshot() {
  const p = G.p;
  return {
    v: 1, char: G.char, map: G.arena, diff: G.diffKey, wave: G.wave, score: G.score, kills: G.kills, maxCombo: G.maxCombo,
    bestRank: G.bestRank, won: G.won, time: Math.round(G.time), hp: p.hp, maxHp: p.maxHp, energy: Math.round(p.energy),
    ult: Math.round(p.ult), dashMax: p.dashMax, taken: { ...G.taken },
    tested: G.tested, nox: G.nox, awakened: G.evo === true, phoenixUsed: G.phoenixUsed,
    undyingUsed: G.undyingUsed, nightTime: G.night?.t || 0,
    extra: { dmg: G.dmg, bosses: G.bosses, loot: G.loot, bestMulti: G.bestMulti, perfects: G.perfects, debtKills: G.debtKills },
  };
}

export const isBossWave = (n) => n % 5 === 0;

export function startWave(n) {
  G.sunrise = null;
  if (n > 1) sweepStains();
  // after Nox (wave 50) there are no more waves: the endless night
  if (n > 50) { startNight(); return; }
  G.wave = n;
  G.phase = 'intro';
  G.phaseT = 1.7;
  G.wantUpgrade = false;
  G.dark = 0;
  G.undyingUsed = false;
  if (n >= 10) unlock('GUNNER');
  dailyBest('wave', n);
  if (n >= 50) unlock('DEV');
  const boss = isBossWave(n);
  // the descent: the wave after a boss is fought a floor further down, on a stage of its own (no twist on it)
  const below = G.training ? G.mapKey : stageFor(G.arena, n), newFloor = below !== G.mapKey;
  if (newFloor) enterStage(below);
  G.twist = null;
  if (!boss && !newFloor && n >= 6 && Math.random() < 0.34) {
    const keys = Object.keys(TWISTS).filter((k) => k !== G.lastTwist);
    G.twist = G.lastTwist = keys[Math.floor(rnd(keys.length))];
  }
  G.queue = G.tutWant && n === 1 ? [] : buildQueue(n);
  // the King talks to the fighter through the run; past wave 20, something older answers from below. The story is told
  // before the monsters come (the fight waits for it); small talk comes once the wave is under way.
  const tk = G.training ? null : waveTalk(n, G.char, boss ? bossFor(n) : null);
  if (tk) G.timers.push({ t: tk.lore ? 0.7 : boss ? 1.1 : 2.4, fn: () => sayAfterEntrance(tk.lines, { lore: tk.lore }) });
  if (boss) {
    const bd = BOSSES[bossFor(n)];
    G.timers.push({ t: 1.2, fn: () => emote('alert', 2) });
    G.banner = { text: bd.name, sub: bd.sub, t: 0, life: 2.6, c: bd.col };
    A.scene(bd.music);
  } else {
    G.banner = G.tutWant && n === 1 ? { text: 'TRAINING', sub: 'LEARN THE ROPES BEFORE THE PIT', t: 0, life: 2.2, c: P.gold } : { text: 'WAVE ' + n, sub: n === 1 ? G.kit.tip : n === 2 ? 'PINK ORBS CAN BE HIT BACK' : endless() ? 'ENDLESS  +' + endless() * 15 + '% ENEMY HEALTH' : '', t: 0, life: 1.9, c: endless() ? P.blood : P.paper };
    A.scene('fight');
    if (G.twist) {
      const tw = TWISTS[G.twist];
      G.banner = { text: tw.name, sub: 'WAVE ' + n + '   ' + tw.sub, t: 0, life: 2.4, c: tw.c };
      if (G.twist === 'BLACKOUT') G.dark = 0.75;
      A.twist();
    }
  }
  A.waveStart(boss);
  // arriving on the new floor: its own cinematic, ending on its name card (the wave's banner waits for it)
  if (newFloor && !G.cine) G.cine = floorArrival(below, n);
}

// down to the next floor: its own floor and walls, its torches, air and footing; the old floor's lava goes with it,
// and the new one fades in out of black under its name
function enterStage(key) {
  if (!G.tested) codexNote('floors', key);
  G.mapKey = key; G.map = MAPS[key]; showMap(key); G.obst = obstaclesOf(key);
  dctx.clearRect(0, 0, AW, AH);      // the floor above's blood, scorches and cracks stay up there
  G.zones = G.zones.filter((z) => !z.pool);
  for (const [x, y, r] of G.map.pools) G.zones.push({ type: 'lava', x, y, r, t: 0, life: Infinity, pool: true });
  G.amb.length = 0;
  G.descend = 1;
  A.rift();
  spawnProps();
}

// a talk never starts over the fighter's entrance: it waits for it to end
function sayAfterEntrance(lines, o) {
  if (G.cine) G.timers.push({ t: 0.25, fn: () => sayAfterEntrance(lines, o) });
  else say(lines, o);
}

// ---------- the endless night ----------
// After Nox there are no more waves. Monsters come in packs that grow and come quicker; after the first minute the
// bosses climb back out of the dark one at a time, after five minutes two at a time; everything gets tougher the longer
// it lasts, until the fighter falls. G.night.t: the seconds survived.
const NIGHT_BOSSES = ['warden', 'brood', 'colossus', 'wyrm', 'herald', 'mirror', 'eclipse', 'clock'];
// the bosses come back in a shuffled order: every one before any comes twice, never the same one twice in a row, and
// never one that is already out
function nextNightBoss() {
  const n = G.night, out = new Set([...G.E.filter((e) => e.type === 'boss' && !e.dead).map((e) => e.boss), ...G.sigils.filter((g) => g.type === 'boss').map((g) => g.boss)]);
  for (let tries = 0; tries < 3; tries++) {
    if (!n.bag?.length) {
      n.bag = NIGHT_BOSSES.slice();
      for (let i = n.bag.length - 1; i > 0; i--) { const j = Math.floor(rnd(i + 1)); [n.bag[i], n.bag[j]] = [n.bag[j], n.bag[i]]; }
    }
    const i = n.bag.findIndex((k) => k !== n.last && !out.has(k));
    if (i >= 0) { const k = n.bag.splice(i, 1)[0]; n.last = k; return k; }
    n.bag = null;
  }
  const left = NIGHT_BOSSES.filter((k) => k !== n.last && !out.has(k));
  return (n.last = left[Math.floor(rnd(left.length))] || NIGHT_BOSSES[0]);
}

// ---------- obstacles ----------
// Each floor has its own (maps.js `obst`, drawn by obstacles.js): fighters and monsters on the ground are kept out of a
// flat ellipse round each base, shots stop against them, and a monster knocked into one hard is hurt as by a wall.
// Things that fly go over them.
const FLY = new Set(['wisp', 'bellwraith', 'glasswing', 'shade', 'herald', 'eclipse', 'clock', 'nox', 'colossus', 'mirror']);
const obstaclesOf = (key) => (MAPS[key]?.obst || []).map(([x, y, r]) => ({ x, y, r, kind: MAPS[key].ob }));
// push something round (x, y, radius r) out of every obstacle; true if it touched one. side: a sideways nudge so a
// monster walking straight at one slides round it instead of standing there
export function pushOut(o, r, side = 0) {
  let hit = false;
  const push = (ob) => {
    const dx = o.x - ob.x, dy = (o.y - ob.y) * 1.8, d = hyp(dx, dy), m = ob.r + r;
    if (d >= m) return;
    hit = true;
    if (d < 0.01) { o.x += m; return; }
    const k = (m - d) / d;
    o.x += dx * k; o.y += (dy * k) / 1.8;
    if (side) { o.x += (-dy / d) * side; o.y += (dx / d) * side / 1.8; }
  };
  for (const ob of G.obst || []) push(ob);
  // the things to break stand in the way too, except of something smashing through them (updateProps breaks them)
  if (G.props?.length && !smashes(o)) for (const ob of G.props) if (!ob.dead && ob !== o) push(ob);
  return hit;
}
// a point moved out of any obstacle (a safe spot a boss's rite marks must be reachable)
export function freeSpot(x, y, r = 12) { const q = { x, y }; pushOut(q, r); pushOut(q, r); return q; }
const inObstacle = (x, y, pad = 0) => (G.obst || []).some((ob) => hyp(x - ob.x, (y - ob.y) * 1.8) < ob.r + pad);

// ---------- things to break ----------
// props.js has what they are and how they look. A fresh set is laid out on every new floor (the first wave, and every
// five waves past a boss): clusters of two or three, crates and the floor's own things, clear of the middle (where the
// fighter starts), the walls, the floor's obstacles and its lava. They wait in G.E with the monsters (prop: true), so
// every blow, shot, blast and ultimate in the game breaks them; foe() keeps them out of anything that picks a monster
// to aim at, and the wave never waits for them. A dash, a boss on the ground, a charging Brute or a body knocked
// flying goes straight through one and smashes it. One in ten drops a coin, one in thirty-three a heart.
function spawnProps() {
  for (const e of G.props) e.dead = true;
  G.props = [];
  const own = MAP_PROPS[G.mapKey];
  if (G.night || !own) return;
  const want = G.training ? 9 : 14 + Math.floor(rnd(4)), mid = { x: AW / 2, y: (B.y0 + B.y1) / 2 + 10 };
  const free = (x, y, r) => x > B.x0 + 14 && x < B.x1 - 14 && y > B.y0 + 22 && y < B.y1 - 8
    && hyp(x - mid.x, (y - mid.y) * 1.3) > 66 && !inObstacle(x, y, r + 10)
    && !(G.map.pools || []).some(([px0, py0, pr]) => hyp(x - px0, y - py0) < pr + r + 10)
    && !G.props.some((o) => hyp(o.x - x, (o.y - y) * 1.6) < o.r + r + 5);
  let kegs = 0;
  for (let tries = 0; G.props.length < want && tries < 300; tries++) {
    const cx = rnd(B.x0 + 26, B.x1 - 26), cy = rnd(B.y0 + 28, B.y1 - 14), n = 2 + Math.floor(rnd(2));
    for (let i = 0; i < n && G.props.length < want; i++) {
      let kind = Math.random() < 0.4 ? (Math.random() < 0.7 ? 'crate' : 'smallcrate') : own[Math.floor(rnd(own.length))];
      if (PROPS[kind].boom && kegs >= 3) kind = 'crate';
      const d = PROPS[kind], x = Math.round(cx + rnd(-15, 15)), y = Math.round(cy + rnd(-8, 8));
      if (!free(x, y, d.r)) continue;
      if (d.boom) kegs++;
      const e = { prop: true, type: 'prop', kind, x, y, hx: x, hy: y, r: d.r, hp: d.hp, maxHp: d.hp, z: 0, kx: 0, ky: 0, vx: 0, vy: 0, state: 'idle', flash: 0, wob: 0, anim: 0, face: 1,
        def: { r: d.r, col: d.pal[0], colD: d.pal[2], kbRes: 1, scale: 1, speed: 0, score: 0, energy: 0 } };
      G.props.push(e); G.E.push(e);
    }
  }
}
// what goes straight through things to break instead of stopping at them
function smashes(o) {
  if (o === G.p) return o.state === 'dash';
  if (o.prop || o.under || (o.z || 0) > 6) return false;
  return (o.type === 'boss' && !FLY.has(o.boss)) || (o.type === 'brute' && o.state === 'charge') || hyp(o.kx || 0, o.ky || 0) > 140;
}
// a blow lands: it cracks and shakes, and the last one (or any heavy one) breaks it
function hitProp(e, dmg, o) {
  if (e.dead) return false;
  const d = PROPS[e.kind], dir = o.dir ?? rnd(TAU);
  e.hp -= dmg >= 20 || o.src === 'ult' || o.src === 'boom' ? e.hp : 1;
  if (e.hp <= 0) { breakProp(e, dir); return false; }
  e.flash = 0.12; e.wob = 0.24;
  for (let i = 0; i < 4; i++) part(e.x + rnd(-2, 2), e.y - 1, Math.cos(dir) * rnd(20, 70) + rnd(-20, 20), Math.sin(dir) * rnd(10, 40), rnd(0.3, 0.5), d.pal[i % 3], { z: d.h * 0.5, vz: rnd(30, 80), g: 320, drag: 2 });
  A.knock(d.mat);
  return false;
}
// it bursts: its pieces fly away from the blow, tumble, bounce and settle on the floor as rubble
export function breakProp(e, dir = rnd(TAU)) {
  if (e.dead) return;
  e.dead = true;
  const d = PROPS[e.kind], { x, y } = e, h = d.h, [c1, c2, c3] = d.pal;
  const n = d.r >= 6 ? 16 : 11;
  for (let i = 0; i < n; i++) {
    const a = dir + rnd(-1.1, 1.1), v = rnd(30, 120);
    part(x + rnd(-d.r, d.r) * 0.6, y - 1, Math.cos(a) * v, Math.sin(a) * v * 0.6, rnd(0.6, 1.1), [c1, c2, c3][i % 3], { z: rnd(2, h * 0.8), vz: rnd(40, 130), g: 380, drag: 1.5, s: i % 3 === 0 ? 2 : 1, blood: i % 2 === 0, keep: true });
  }
  for (let i = 0; i < 6; i++) { const a = rnd(TAU); part(x + Math.cos(a) * 3, y - 3, Math.cos(a) * rnd(8, 24), Math.sin(a) * rnd(4, 12) - 6, rnd(0.4, 0.7), '#8a8088', { drag: 3, s: 2 }); }
  for (let i = 0; i < 4 + d.r; i++) stain(x + rnd(-d.r, d.r), y + rnd(-2, 2), i % 2 ? c3 : c1, Math.random() < 0.4 ? 2 : 1);
  addRing(x, y - h / 2, P.paper, 50 + d.r * 6, 0.14, 1);
  shake(0.05 + d.r * 0.006);
  A.smash(d.mat);
  if (d.mat === 'goo') splat(x, y, 6, c3, c1);
  if (d.mat === 'glass' || d.mat === 'ice' || d.mat === 'crystal' || d.mat === 'gold') for (let i = 0; i < 6; i++) part(x + rnd(-3, 3), y - h * 0.6, rnd(-40, 40), rnd(-50, -10), rnd(0.3, 0.6), c2, { glow: true, drag: 3 });
  if (d.mat === 'metal') sparks(x, y - h / 2, dir, 6, 0.6, '#ffd447', 120);
  if (d.fx === 'glitch') glitch(x - 8, y - h, 16, h, 0.25, 6);
  if (d.fx === 'embers') for (let i = 0; i < 12; i++) part(x + rnd(-3, 3), y - h * 0.6, rnd(-50, 50), rnd(-80, -20), rnd(0.5, 1.1), Math.random() < 0.5 ? P.ember : P.ember2, { glow: true, drag: 1.5 });
  if (d.fx === 'shadow') for (let i = 0; i < 8; i++) part(x + rnd(-4, 4), y - h * 0.5, rnd(-15, 15), rnd(-30, -10), rnd(0.6, 1.1), '#6a4aa0', { drag: 1, s: 2 });
  if (d.fx === 'stars') for (let i = 0; i < 8; i++) { const a = rnd(TAU); part(x, y - h * 0.5, Math.cos(a) * rnd(30, 80), Math.sin(a) * rnd(30, 80), rnd(0.4, 0.8), i % 2 ? '#ffd447' : P.paper, { glow: true, drag: 2.5 }); }
  // a powder keg goes up a beat later, and sets off whatever else is near
  if (d.boom) G.timers.push({ t: 0.1, fn: () => explode(x, y - 3, true, 32, 16) });
  // what it held
  if (Math.random() < 0.1) dropGold(e, 1);
  if (Math.random() < 0.03) dropPick(x, y, 'heal');
  daily('props', 1);
}
function updateProps(dt) {
  if (!G.props.length) return;
  for (const e of G.props) {
    if (e.dead) continue;
    // they never move, whatever pulls or shoves the monsters
    e.x = e.hx; e.y = e.hy; e.kx = e.ky = 0;
    e.flash = Math.max(0, e.flash - dt); e.wob = Math.max(0, e.wob - dt);
    if (smashes(G.p) && hyp(G.p.x - e.x, (G.p.y - e.y) * 1.6) < G.p.r + e.r + 3) { breakProp(e, Math.atan2(e.y - G.p.y, e.x - G.p.x)); continue; }
    for (const o of G.E) if (!o.dead && smashes(o) && hyp(o.x - e.x, (o.y - e.y) * 1.6) < o.r + e.r) { breakProp(e, Math.atan2(e.y - o.y, e.x - o.x)); break; }
  }
  sweep(G.props, (e) => !e.dead);
}

// ---------- the void ----------
// After Nox the fight goes on in the dark itself: no walls, no floor, no edge (void.js draws it). The arena's bounds
// follow the fighter while it lasts, a window as big as an arena, so the fighter can go anywhere and everything that
// is placed in the arena is placed round them. (While the Herald's charged floor is down the window holds still, so
// its squares stay where they are.)
const HOME_B = { ...B }, VHW = 300, VHH = 170;
function followVoid(dt) {
  const p = G.p;
  if (!G.zap) {
    const k = Math.min(1, dt * 3), cx = (B.x0 + B.x1) / 2, cy = (B.y0 + B.y1) / 2, nx = cx + (p.x - cx) * k, ny = cy + (p.y - cy) * k;
    B.x0 = nx - VHW; B.x1 = nx + VHW; B.y0 = ny - VHH; B.y1 = ny + VHH;
  }
  // rings spreading where the fighter steps
  const rip = G.voidRip;
  for (const r of rip) r.t += dt;
  while (rip.length && rip[0].t >= rip[0].life) rip.shift();
  if (hyp(p.vx, p.vy) > 30 && p.state !== 'dead' && (G.voidStep = (G.voidStep || 0) - dt) <= 0) { G.voidStep = 0.24; rip.push({ x: p.x, y: p.y, t: 0, life: 1.2 }); }
}
const NIGHT_MONSTERS = [['husk', 3], ['wisp', 2], ['tick', 2], ['slime', 2], ['brute', 2], ['spitter', 2], ['archer', 2], ['priest', 1], ['shade', 2], ['bellwraith', 2], ['glasswing', 3]];
export const nightMinutes = () => (G?.night ? G.night.t / 60 : 0);
export function startNight() {
  G.wave = 51; G.phase = 'night'; G.phaseT = 0; G.queue = []; G.twist = null; G.dark = 0;
  G.wantUpgrade = false; G.undyingUsed = false; G.nightFall = false; G.saidLow = G.saidCombo = false;
  for (const e of G.props) e.dead = true;   // nothing to break out in the endless dark
  G.props = [];
  G.night = { t: 0, spawnT: 1.5, bossT: 0, said1: false, said5: false };
  // into the void: the arena's bounds go with the fighter from here on, and nothing of the floor above remains
  G.void = true; G.voidRip = []; G.zones = G.zones.filter((z) => !z.pool); G.amb.length = 0; G.obst = [];
  dctx.clearRect(0, 0, AW, AH);
  B.x0 = G.p.x - VHW; B.x1 = G.p.x + VHW; B.y0 = G.p.y - VHH; B.y1 = G.p.y + VHH;
  G.banner = { text: 'THE ENDLESS NIGHT', sub: 'HOLD ON FOR AS LONG AS YOU CAN', t: 0, life: 3, c: '#b48cff' };
  A.scene('night'); A.waveStart(true);
}
function updateNight(dt) {
  const n = G.night;
  n.t += dt;
  const m = n.t / 60, around = G.E.filter((e) => !e.dead && !e.prop).length + G.sigils.length;
  // a pack of monsters every couple of seconds, bigger and quicker as the night wears on
  n.spawnT -= dt;
  if (n.spawnT <= 0 && around < Math.min(14 + Math.floor(m * 2.5), 30)) {
    n.spawnT = Math.max(0.9, 2.6 - m * 0.18);
    const total = NIGHT_MONSTERS.reduce((a, x) => a + x[1], 0);
    for (let i = 0, pack = Math.min(6, 2 + Math.floor(m / 1.5)); i < pack; i++) {
      let k = rnd(total), type = NIGHT_MONSTERS[0][0];
      for (const [t, w] of NIGHT_MONSTERS) if ((k -= w) <= 0) { type = t; break; }
      const [x, y] = placeSpawn(type);
      G.sigils.push({ x, y, type, t: -i * 0.12, life: 0.8 });
    }
    A.sigil();
  }
  // after the first minute the bosses come back, one at a time; from five minutes, two at a time
  if (n.t < 60) return;
  n.bossT -= dt;
  const most = m >= 5 ? 2 : 1, bosses = G.E.filter((e) => e.type === 'boss' && !e.dead).length + G.sigils.filter((g) => g.type === 'boss').length;
  if (bosses >= most || n.bossT > 0) return;
  const key = nextNightBoss(), bd = BOSSES[key], side = rnd() < 0.5 ? 1 : -1;
  const x = clamp(G.p.x + side * 120, B.x0 + 60, B.x1 - 60), y = clamp(G.p.y + rnd(-50, 50), B.y0 + 50, B.y1 - 40);
  G.sigils.push({ x, y, type: 'boss', boss: key, t: 0, life: 1.8 });
  n.bossT = Math.max(8, 30 - m * 2);
  G.banner = { text: bd.name, sub: 'CLIMBS BACK OUT OF THE DARK', t: 0, life: 2.2, c: bd.col };
  A.bossRoar(); shake(0.5);
  if (!n.said1) { n.said1 = true; say(TALK.night1); }
  else if (most === 2 && !n.said5) { n.said5 = true; say(TALK.night5); }
}

export function buildQueue(n) {
  if (isBossWave(n)) return ['boss'];
  if (n === 1) return ['husk', 'husk', 'husk', 'husk', 'husk', 'husk'];
  const q = [];
  let budget = (6 + n * 2.6) * G.D.count * (1 + 0.1 * endless()) * (G.twist === 'SWARM' ? 1.8 : 1);
  const pool = [['husk', 1, 5]];
  if (n >= 2) pool.push(['wisp', 2, 3]);
  if (n >= 3) pool.push(['tick', 1, 3]);
  if (n >= 3) pool.push(['slime', 2, 3]);
  if (n >= 4) pool.push(['brute', 5, n >= 7 ? 2 : 1]);
  if (n >= 5) pool.push(['spitter', 3, 2]);
  if (n >= 4) pool.push(['archer', 2, 2]);
  if (n >= 6) pool.push(['priest', 3, 1.5]);
  if (n >= 8) pool.push(['shade', 3, 2]);
  if (n > 20) pool.push(['bellwraith', 6, 2.7]);
  if (n >= 26) pool.push(['glasswing', 4, 3]);
  const total = pool.reduce((s, x) => s + x[2], 0);
  while (budget > 0) {
    let k = rnd(total), pick = pool[0];
    for (const it of pool) { if ((k -= it[2]) <= 0) { pick = it; break; } }
    q.push(pick[0]);
    budget -= pick[1];
  }
  // lootlings: a rare treat from wave 4, three of them in a gold rush
  const loot = G.twist === 'GOLD' ? 3 : n >= 4 && Math.random() < (G.up.midas ? 0.5 : 0.16) ? 1 : 0;
  for (let i = 0; i < loot; i++) q.splice(Math.floor(rnd(q.length * 0.7)) + 1, 0, 'lootling');
  return q;
}

export function spawnEnemy(type, x, y, bossKey) {
  let d = DEF[type];
  const ef = endless(), sc = (1 + (G.wave - 1) * 0.09) * G.D.hp * (1 + 0.15 * ef);
  const e = {
    type, def: d, x, y, z: 0, vx: 0, vy: 0, kx: 0, ky: 0, r: 0, hp: 0, maxHp: 0,
    state: 'spawn', t: 0.28, cd: rnd(0.4, 1.4), flash: 0, shakeT: 0, face: 1, burn: 0, burnTick: 0, burnDps: 0,
    marked: 0, frozen: 0, stunT: 0, anim: rnd(10), lock: 0, hitP: false, superArmor: false, orbit: Math.random() < 0.5 ? 1 : -1,
    wx: x, wy: y, elite: false,
    // on a boss wave everything else is the boss's army (eggs, larvae, knights, summons)
    summoned: type !== 'boss' && isBossWave(G.wave),
  };
  if (type === 'boss') {
    const key = bossKey || bossFor(G.wave), bd = BOSSES[key], tier = Math.floor((G.wave / 5 - 1) / ORDER.length);
    d = { r: bd.r, hp: bd.hp, kbRes: 0.97, col: bd.col, colD: bd.colD, score: bd.score, speed: bd.speed, energy: 0, scale: bd.scale, tint: bd.tint };
    e.def = d; e.boss = key;
    const health = G.night ? Math.max(BOSSES.nox.hp, bd.hp) : bd.hp;
    e.hp = Math.round(health * 1.5 * (1 + tier * 0.7) * G.D.hp * (1 + 0.12 * ef) * (1 + 0.34 * nightMinutes()));
    d.scale = bd.scale || 1; d.tint = bd.tint;
    e.speed = bd.speed * (1 + tier * 0.1);
    e.phase = 1; e.last = ''; e.cd = 1;
    G.boss = e; G.bossClean = true;
    bd.init?.(e);
    if (key === 'nox') loadMonsterSheet('noxAwake', SPR.noxAwake[0].h);
  } else {
    e.hp = Math.round(d.hp * sc * (1 + 0.3 * nightMinutes()));
    e.speed = d.speed * (1 + Math.min(0.45, (G.wave - 1) * 0.03)) * G.D.spd * Math.min(1.35, 1 + 0.012 * ef) * (1 + Math.min(0.25, 0.02 * nightMinutes()));
    if (G.twist === 'BLOOD') e.speed *= 1.25;
    if (G.twist === 'SWARM' || G.twist === 'GLASS') e.hp = Math.max(1, Math.round(e.hp * 0.5));
    if (type === 'lootling') e.life = 11;
    const eliteP = G.twist === 'ELITE' ? 0.5 : Math.min(0.6, 0.06 + G.wave * 0.012 + 0.03 * ef);
    if (type !== 'egg' && type !== 'larva' && type !== 'slimelet' && type !== 'lootling' && G.wave >= 6 && Math.random() < eliteP) {
      e.elite = true; e.hp = Math.round(e.hp * 2.4); e.speed *= 1.1;
      const keys = Object.keys(AFFIX);
      e.affix = type === 'shade' && Math.random() < 0.5 ? 'FRENZIED' : keys[Math.floor(rnd(keys.length))];
      e.tagT = 2;
      if (e.affix === 'FRENZIED') e.speed *= 1.35;
      if (e.affix === 'WARDED') e.ward = e.wardMax = Math.round(e.hp * 0.5);
    }
  }
  e.r = d.r;
  e.maxHp = e.hp;
  e.motion = startMonsterMotion(e);
  const spriteId = e.boss || e.type;
  if (spriteId !== 'mirror') loadMonsterSheet(spriteId, SPR[spriteId][0].h);
  if (spriteId === 'brute') for (const k of ['bruteWind', 'bruteDash']) loadMonsterSheet(k, SPR[k][0].h);
  if (spriteId === 'wyrm') loadMonsterSheet('wyrmSeg', SPR.wyrmSeg.h);
  G.E.push(e);
  return e;
}

// ---------- particles & small effects ----------
export function part(x, y, vx, vy, life, c, o) {
  if (G.pfx && G.awPal) c = G.awPal[c] || c;
  // LOW particles (or performance mode, when the device is struggling) keep half of them and fewer in total
  const low = settings.particles === 'LOW' || fx.lowFx;
  if (G.parts.length > (low ? 500 : input.touch ? 900 : 1500) || (low && !o?.keep && Math.random() < 0.5)) return;
  G.parts.push({ x, y, vx, vy, life, t: 0, c, z: o?.z ?? 0, vz: o?.vz ?? 0, g: o?.g ?? 0, drag: o?.drag ?? 5, s: o?.s ?? 1, blood: o?.blood, glow: o?.glow });
  // an awakened fighter's effects come with a second, glowing spark each, so every power looks fuller
  if (G.pfx && G.awPal && !low && !o?.blood && G.parts.length < 1200 && Math.random() < 0.5) {
    G.parts.push({ x: x + rnd(-1.5, 1.5), y: y + rnd(-1.5, 1.5), vx: vx * 0.6 + rnd(-15, 15), vy: vy * 0.6 + rnd(-15, 15), life: life * 0.8, t: 0, c: Math.random() < 0.5 ? P.paper : G.kit.awake?.pal.col || c, z: o?.z ?? 0, vz: (o?.vz ?? 0) * 0.7, g: o?.g ?? 0, drag: o?.drag ?? 5, s: 1, glow: true });
  }
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
export function addText(x, y, s, c, sc = 1, num = false) {
  if (num && !settings.numbers) return;
  // damage numbers hop out in a little arc; words just float up
  G.texts.push(num ? { x, y, s, c, sc, t: 0, life: 0.7, vx: rnd(-28, 28), vy: -rnd(60, 85), g: 240 } : { x, y, s, c, sc, t: 0, life: 0.75 });
}
// the moment an evolution is picked: a pillar of light, slow motion, a burst
// ---------- skin evolution ----------
// Every fighter awakens once, after any four evolutions (every upgrade has one). The Dev is rewritten into his
// hooded form by a laser from the sky.
export const AWAKEN_NEED = TEST_BUFF ? 1 : 4;
export const evosDone = () => Object.keys(G.taken).filter((id) => byId(id)?.req).length;
function wantsEvo() {
  return evosDone() >= AWAKEN_NEED;
}
function checkEvo() {
  if (G.evo || (G.phase !== 'fight' && G.phase !== 'night') || G.banner || G.p.state === 'dead' || bossLock() || !wantsEvo()) return;
  const p = G.p, dev = G.char === 'DEV', col = dev ? '#39ff6a' : P.gold;
  p.inv = Math.max(p.inv, 2);
  // the warning ring, then the beam, then the new look
  addRing(p.x, p.y - 6, col, 60, 0.6, 1);
  for (let i = 0; i < 3; i++) G.timers.push({ t: i * 0.18, fn: () => addRing(G.p.x, G.p.y - 6, col, 80, 0.4, 1) });
  G.timers.push({ t: 0.6, fn: () => {
    G.evo = true; G.kit = awakenKit(G.kit); G.awPal = G.kit.awake?.pal.map || null;
    if (!G.tested) codexNote('awake', G.char);
    const q = G.p;
    q.evoFlash = 1.8; q.evoCol = col; q.maxHp++; q.hp = Math.min(q.maxHp, q.hp + 1);
    G.banner = { text: EVO_NAMES[G.char], sub: dev ? 'ROOT ACCESS GRANTED: ATTACKS EVOLVED' : 'AWAKENED: ATTACKS, POWERS AND ULTIMATE EVOLVED', t: 0, life: 2.6, c: col };
    flash(col, 0.35, true); shake(1); hitstop(0.12); A.ultRelease(); A.zap(); buzz('boss');
    for (let i = 0; i < 4; i++) addRing(q.x, q.y - 6, i % 2 ? P.paper : col, 220 + i * 80, 0.7, 3);
    for (let i = 0; i < 80; i++) { const a = rnd(TAU), v = rnd(60, 300); part(q.x, q.y - 8, Math.cos(a) * v, Math.sin(a) * v, rnd(0.4, 1), Math.random() < 0.6 ? col : P.paper, { drag: 3, glow: true, keep: true }); }
    if (dev) glitch(q.x, q.y - 10, 60, 50, 0.6, 30);
  } });
  G.timers.push({ t: 2.5, fn: () => { G.p.evoCol = null; } });
  G.evo = 'pending';
}
// The awakened kit, for the rest of the run: Q and E cost a quarter less and recharge a fifth faster, and the
// ultimate charges a quarter faster. Basic hits, powers and the ultimate also gain the fighter's awakened
// effects (kit.awake in chars.js; applied in damage() and where the powers are cast).
function awakenKit(k) {
  const ev = (a) => ({ ...a, cost: Math.round(a.cost * 0.75), cd: a.cd * 0.8 });
  const pal = k.awake?.pal;
  return { ...k, q: ev(k.q), e: ev(k.e), ultRate: k.ultRate * 1.25, ...(pal ? { color: () => pal.col, eyeColor: pal.col, melee: k.melee && { ...k.melee, col: pal.slash } } : {}) };
}
const awake = () => G.evo === true && G.kit.awake;
// during a boss entrance the fighter waits: no moving, attacking or powers until the boss is ready
export function bossLock() {
  if (!G || !isBossWave(G.wave)) return false;
  const b = G.boss;
  return G.queue.includes('boss') || G.sigils.some((s) => s.type === 'boss') || !!(b && !b.dead && b.state === 'intro');
}

export function evolveFx(name, id) {
  const p = G.p, n = evosDone();
  G.banner = { text: name, sub: n < AWAKEN_NEED ? 'EVOLVED   AWAKENING ' + n + '/' + AWAKEN_NEED : 'EVOLVED', t: 0, life: 2.8, c: P.gold };
  p.evoFlash = 1.6;
  flash(P.gold, 0.35, true); shake(0.9); A.ultRelease(); A.victory(); buzz('boss');
  for (let i = 0; i < 4; i++) addRing(p.x, p.y - 6, i % 2 ? P.paper : P.gold, 200 + i * 80, 0.7, 3);
  for (let i = 0; i < 90; i++) { const a = rnd(TAU), v = rnd(60, 300); part(p.x, p.y - 8, Math.cos(a) * v, Math.sin(a) * v, rnd(0.4, 1), Math.random() < 0.6 ? P.gold : P.paper, { drag: 3, glow: true, keep: true }); }
}
// fighters unlock mid-run the moment their mission is done
export function unlock(id) {
  if (G.tested || testing() || best.unlocked.includes(id)) return;
  best.unlocked.push(id); saveBest();
  G.unlocks.push({ id, t: 0 });
  A.select(); buzz('tap');
}
// lifetime stats are banked into storage at each checkpoint and at the end of a run
// gold: rare, and it comes three ways only. The lootling (the little goblin that runs off with the pit's money) drops
// two coins when it is killed. The run pays out when it ends (payOut: how deep you got, the bosses you beat, how long
// you held the endless night and how many you killed, more on harder difficulties). The quest board's daily missions
// pay the rest (daily.js). Gold is banked into the record with the run's stats; practice and test runs earn none.
const earns = () => !G.tested && !G.training && !testing();
// in training (the camp's yard, or the first run's lessons) nothing runs out: dashes and powers cost no energy
const learning = () => !!(G.training || G.tut);
const PAY_DIFF = { EASY: 0.5, NORMAL: 1, HARD: 1.5, NIGHTMARE: 2 };
export function payOut() {
  if (!earns() || G.paid) return;
  G.paid = true;
  const found = G.gold, mult = PAY_DIFF[G.diffKey] ?? 1;
  const parts = {
    depth: Math.floor(Math.min(G.wave, 20) / 4) + Math.floor(Math.max(0, G.wave - 20) / 5),
    bosses: G.bosses + (G.won ? 3 : 0) + (G.nox ? 5 : 0),
    night: Math.floor((G.night?.t || 0) / 120),
    kills: Math.floor(G.kills / 250),
  };
  const total = Math.floor((parts.depth + parts.bosses + parts.night + parts.kills) * mult);
  G.payout = { ...parts, found, mult, total };
  G.gold += total;
}
export function addGold(n, x, y) {
  if (!earns() || n <= 0) return;
  G.gold += n; A.coin();
  if (x !== undefined) addText(x, y, '+' + n + ' GOLD', '#ffd447', 1);
}
function dropGold(e, n) { if (earns()) for (let i = 0; i < n; i++) dropPick(e.x, e.y, 'gold'); }
// the daily missions count what happens in real runs only; one finished mid-fight is announced over the fighter
const daily = (id, n) => { if (earns()) missionsDone(dailyNote(id, n)); };
const dailyBest = (id, v) => { if (earns()) missionsDone(dailyMax(id, v)); };
function missionsDone(list) {
  list.forEach((text, i) => G.timers.push({ t: i * 0.9, fn: () => {
    if (!G.p) return;
    addText(G.p.x, G.p.y - 40, 'MISSION DONE', P.gold, 1); addText(G.p.x, G.p.y - 32, text, P.paper, 1);
    addRing(G.p.x, G.p.y - 6, P.gold, 160, 0.3, 1); A.coin();
  } }));
}
export function bankStats() {
  if (G.tested || testing()) return;
  best.gold += G.gold - G.goldBanked; G.goldBanked = G.gold;
  best.kills += G.kills - G.killsBanked; G.killsBanked = G.kills;
  best.combo = Math.max(best.combo, G.maxCombo);
  best.perfects = Math.max(best.perfects, G.perfects);
  saveBest();
}
export function glitch(x, y, w, h, life = 0.3, n = 8, pal = null) { G.glitches.push({ x, y, w, h, t: 0, life, n, pal }); }
export function addRing(x, y, c, vr, life, th = 2, r = 2) { if (G.pfx && G.awPal) c = G.awPal[c] || c; G.rings.push({ x, y, r, vr, t: 0, life, c, th }); }
// the fighter's current look: the evolved skin once it has awakened
export const heroSet = () => (G && G.evo === true ? SPR.evo[G.char] : SPR.chars[G.char]);
export function ghost(p, c = P.volt, spr) {
  G.ghosts.push({ x: p.x, y: p.y, flip: softFacingLeft(p), t: 0, life: 0.26, c, spr: spr || heroSet().idle });
}

// ---------- combo ----------
export function addCombo(n) {
  G.combo += n;
  // a long chain draws the King's attention, once a run
  if (G.combo >= 50 && !G.saidCombo && !G.talk) { G.saidCombo = true; say(G.night ? TALK.comboNight : G.won ? TALK.comboDeep : TALK.combo); }
  G.comboT = 3;
  if (G.combo > G.maxCombo) { G.maxCombo = G.combo; dailyBest('combo', G.combo); }
  if (G.combo >= 100) unlock('WIZARD');
  const r = rankOf(G.combo);
  if (r > G.rank) {
    G.rank = r; G.rankPop = 1; A.rank(r);
    // ranking up from A bursts off the fighter in the rank's color
    if (r >= 3 && G.p.state !== 'dead') {
      const c = P[RANKS[r].c] || P.paper, p = G.p;
      addRing(p.x, p.y - 7, c, 220 + r * 30, 0.3, 2); addRing(p.x, p.y - 7, P.paper, 150, 0.2, 1);
      for (let i = 0; i < 10 + r * 4; i++) { const a = rnd(TAU), v = rnd(60, 180); part(p.x, p.y - 7, Math.cos(a) * v, Math.sin(a) * v, rnd(0.3, 0.6), Math.random() < 0.6 ? c : P.paper, { drag: 3, glow: true }); }
      if (r >= 5) { flash(c, 0.07, false); shake(0.2); }
    }
    if (r > G.bestRank) G.bestRank = r;
    if (r >= 4 && !G.boss && !G.night) A.scene('hot');
  }
}

// ---------- damage ----------
export const pd = x => x * G.up.dmg;
// a dash costs energy, and after one every fighter needs a moment before the next: no dash spam
// expressions (emotes.js): a bubble over a head for a moment. A stronger feeling is not covered by a weaker one.
const EMO_PRI = { sweat: 0, sleep: 0, dots: 1, ask: 1, note: 2, heart: 2, star: 3, angry: 3, dizzy: 4, alert: 4 };
export function emote(kind, life = 1.6, who = G.p) {
  const cur = who.emote;
  if (cur && G.time - cur.at < cur.life && (EMO_PRI[cur.kind] ?? 1) > (EMO_PRI[kind] ?? 1)) return;
  who.emote = { kind, at: G.time, life };
}
function drawEmoteOn(who, headY) {
  const em = who.emote;
  if (!em) return;
  const t = G.time - em.at;
  if (t > em.life) { who.emote = null; return; }
  drawEmote(em.kind, who.x, headY, t, Math.min(1, (em.life - t) * 4));
}
// when a cinematic (a hero's entrance, a floor arrival) ends, what it left in the world (webs, cracks, circles, the
// dark) keeps being drawn for a moment and fades out instead of vanishing: parts.under, parts.draw, on its clock parts.k
export function cineTail(parts, life = 1.3) { G.cineTail = { ...parts, t: 0, life }; }
function drawCineTail(which) {
  const c = G.cineTail;
  if (!c || G.cine || !c[which]) return;
  const v = Math.max(0, 1 - c.t / c.life);
  ctx.save(); ctx.globalAlpha = v * v * (3 - 2 * v); c[which](); ctx.restore(); ctx.globalAlpha = 1;
}
export const DASH_COST = 15, DASH_GAP = 0.2;
export const dashGap = (kit) => kit.dash.recovery ?? DASH_GAP;
export function ignite(e, seconds, baseDps, power = G.power) {
  if (!alive(e)) return;
  const dps = power === 'environment' ? baseDps : pd(baseDps) * (power === 'spell' ? G.up.spell : 1);
  if (e.burn > 0 && dps < e.burnDps) return;
  e.burn = Math.max(e.burn, seconds);
  e.burnDps = dps;
}
function withPower(kind, action) {
  const previous=G.power;
  G.power=kind;
  try { return action(); } finally { G.power=previous; }
}
const FIGHTER_POWER = 1.1;

export function sprFor(e) {
  const m = e.motion;
  if (e.boss === 'mirror') {
    const set = heroSet();
    if (m.drive < 0.1) return set.idles[Math.floor(m.clock * 8) % set.idles.length];
    const frames = m.drive > 0.8 ? set.run : set.walk;
    return frames[Math.floor(m.phase * frames.length) % frames.length];
  }
  // the Ash Brute has a pose of its own for winding up a charge, and another for the charge
  if (e.type === 'brute' && (e.state === 'aim' || e.state === 'charge')) {
    const id = e.state === 'aim' ? 'bruteWind' : 'bruteDash';
    return monsterFrame(id, m.clock * (e.state === 'aim' ? 1.6 : 3.2), SPR[id]);
  }
  const id = e.awakened && e.boss === 'nox' ? 'noxAwake' : e.boss || e.type;
  return monsterFrame(id, m.phase, SPR[id], m.clock % 3.3 < 0.14);
}

export function damage(e, dmg, o) {
  if (e.prop) return hitProp(e, dmg, o || {});
  if (e.dead || e.dying || e.under || e.state === 'awakening' || (e.boss && (e.state === 'spawn' || e.state === 'intro'))) return false;
  const up = G.up, p = G.p;
  if (e.boss) BOSSES[e.boss].onHit?.(e, o);
  if (e.frozen > 0) dmg *= up.evoFrost ? 2 : 1.5;
  const kind = o.power || G.power || ((o.ug || o.basic) ? 'weapon' : 'other');
  // training: a sealed enemy is hurt only by the move it was sealed against
  if (e.tutOnly && !tutAllows(e, kind)) { tutImmune(e); return false; }
  const melee = kind === 'weapon';
  if (melee) dmg *= up.wpn * (G.kit.wpnPower || 1) * G.pf.wpn;
  if (kind === 'spell') dmg *= up.spell;
  if (p.ascend > 0 && o.src !== 'lava') dmg *= 2;
  if (G.kit.dmgScale && o.src !== 'lava' && o.src !== 'wall') dmg *= G.kit.dmgScale();
  if (melee && !o.crit && !o.rolledCrit && Math.random() < up.crit) { dmg *= up.evoCrit ? 3 : 2; o.crit = true; }
  // the first hit after a perfect dodge is a counter: triple damage and a shockwave
  if (o.ug && p.counter > 0) {
    dmg *= 3; o.crit = true;
    if (!p.counterHit) { p.counterHit = true; p.counter = 0.08; counterBlast(e, o.dir ?? 0); }
  }
  if (up.exec && e.hp < e.maxHp * (up.evoExec ? 0.35 : 0.2) && o.src !== 'lava') dmg *= up.evoExec ? 2 : 1.6;
  if (e.armor) dmg *= e.armor;
  if (up.rage && p.hp <= p.maxHp / 2) dmg *= 1.6;
  if (G.skillMult > 1) { dmg *= G.skillMult; o.crit = true; }
  if (p.chgFlashT > 0 && o.src === 'primary' && !o.basic) { dmg *= G.kit.dashStrike || 1; o.crit = true; }
  if (o.src !== 'lava' && o.src !== 'wall') dmg *= RANK_POWER[G.rank] || 1;
  const basic = o.basic || (G.tagBasic && o.src === 'primary'), aw = awake();
  if (aw && (basic || o.src === 'ult')) dmg *= 1.3;
  // every fighter hits a tenth harder (on top of the numbers in chars.js)
  dmg *= FIGHTER_POWER;
  if (TEST_BUFF) dmg *= 6;
  dmg = Math.max(0, dmg);
  e.calm = 0;
  if (e.affix) e.tagT = 1.2;
  if (e.type === 'priest' && e.state === 'chant' && o.src !== 'burn') { e.heal = null; e.state = 'tend'; e.cd = 1.6; addText(e.x, e.y - 22, 'INTERRUPTED', P.paper); A.deny(); }
  if (e.ward > 0) {
    // a warded elite's shell soaks damage first
    const soak = Math.min(e.ward, dmg);
    e.ward -= soak; dmg -= soak;
    sparks(e.x, e.y - e.r, o.dir ?? rnd(TAU), 4, 1, AFFIX.WARDED.c, 140);
    if (e.ward <= 0) { addRing(e.x, e.y - e.r, AFFIX.WARDED.c, 160, 0.25, 2); addText(e.x, e.y - e.r * 2 - 10, 'SHELL BROKEN', AFFIX.WARDED.c); A.shieldHit(); }
    if (dmg <= 0) { e.flash = 0.06; addCombo(1); return false; }
  }
  G.dmg += Math.min(dmg, Math.max(0, e.hp));
  e.hp -= dmg;
  e.flash = 0.1; e.shakeT = 0.14;
  if (o.src !== 'burn') { e.sq = 1; e.sqDir = o.dir ?? 0; }
  if (e.type === 'lootling' && o.src !== 'burn' && (e.coins = (e.coins || 0) + 1) <= 10) { dropPick(e.x, e.y, 'energy'); A.coin(); }
  if (o.kb && !e.frozen) { const k = 1 - e.def.kbRes; e.kx += Math.cos(o.dir) * o.kb * k; e.ky += Math.sin(o.dir) * o.kb * k; }
  if (!e.superArmor && o.src !== 'burn' && o.src !== 'lava' && (e.type === 'husk' || e.type === 'wisp' || e.type === 'tick')) {
    if (e.state !== 'fuse' && e.state !== 'spawn') { e.state = 'hurt'; e.t = 0.22; e.hitP = false; }
  }
  if (e.boss !== 'nox' && o.src !== 'burn' && o.src !== 'lava') bleed(e.x, e.y, o.dir ?? rnd(TAU), Math.min(14, 3 + dmg), e.def.col, e.def.colD, o.kb ? 1 : 0.5);
  addText(e.x + rnd(-3, 3), e.y - e.r * 2 - 6, String(Math.max(1,Math.round(dmg))), o.crit ? P.gold : o.src === 'bolt' || o.src === 'orb' ? P.volt : o.src === 'burn' || o.src === 'lava' ? P.ember : P.paper, o.crit ? 2 : 1, true);
  if (o.src !== 'burn' && o.src !== 'lava') addCombo(1);
  if (o.ug) {
    if (p.ultLock <= 0 && !G.cine) p.ult = Math.min(100, p.ult + dmg * 0.25 * up.focus * G.kit.ultRate * G.pf.ult);
    if (!o.noEnergy) p.energy = Math.min(100, p.energy + G.kit.energyHit * G.pf.energy);
    p.hitCount++;
    if (up.ember && e.hp > 0) ignite(e, 2, 2 * up.ember * (up.evoEmber ? 2 : 1), 'passive');
    if (up.static && p.hitCount % (up.evoStatic ? 4 : 8) === 0) {
      chainLightning(e, up.evoStatic ? 7 : 1 + up.static * 2, up.evoStatic ? 7 : 4);
      if (up.evoStatic) skyStrike(e.x, e.y, 26, 14);
    }
    if (up.evoWpn && (o.crit || Math.random() < 0.4)) spirits(e.x, e.y - e.r - 4, o.crit ? 3 : 1);
  }
  if (aw && basic && Math.abs(G.time - (e.awT ?? -9)) > 0.15) { e.awT = G.time; aw.hit(e, o); }
  if (e.dead || e.dying) return true;
  if (e.hp <= 0) { kill(e, o); return e.state !== 'awakening'; }
  return false;
}

export function kill(e, o) {
  const dir = o.dir ?? rnd(TAU);
  if (e.prop) { breakProp(e, dir); return; }   // (a thing to break isn't a kill)
  if (e.type === 'boss') { bossDeath(e); return; }
  e.dead = true;
  G.kills++; codexNote('foes', e.type);
  daily('kills', 1); if (e.elite) daily('elites', 1); if (e.type === 'lootling') daily('lootlings', 1);
  if (best.kills + G.kills - G.killsBanked >= 1500) unlock('MECHANIC');
  // each fighter's signature kill (deaths.js); some take the body apart themselves
  const gone = KILLS[G.char]?.(e, o, dir) === true;
  // heavy blows launch the body across the arena (it bowls into others); lighter cuts slice it in two
  const launch = !gone && e.type !== 'tick' && e.type !== 'egg' && e.type !== 'larva' && (o.heavy || o.src === 'ult' || o.src === 'boom' || o.src === 'corpse' || (!o.slice && (o.kb || 0) >= 150));
  if (launch) launchCorpse(e, dir, o.kb || 200);
  else if (o.slice && !gone) { makeGibs(e, dir); A.slice(); }
  else if (!gone) dissolve(e, dir);
  // what was left of one of the King's people goes up as ash, now and then with a spark of gold, set free; below the
  // pit, once he is dead, the monsters are the dark's own and come apart into it
  const deep = G.won, n = e.type === 'brute' ? 10 : 6;
  for (let i = 0; i < n; i++) part(e.x + rnd(-e.r, e.r), e.y - rnd(2, e.r * 2), rnd(-10, 10) + Math.cos(dir) * 12, -rnd(14, 34), rnd(0.9, 1.6), deep ? (Math.random() < 0.6 ? '#2a1d48' : '#5a3e8a') : Math.random() < 0.6 ? '#6a6064' : '#9a8e92', { drag: 1.2, keep: true });
  if (!deep && Math.random() < 0.3) part(e.x, e.y - e.r, rnd(-6, 6), -rnd(26, 40), rnd(1, 1.4), P.gold, { glow: true, drag: 0.8 });
  if (!gone) {
    bleed(e.x, e.y, dir, e.type === 'brute' ? 30 : 16, e.def.col, e.def.colD, 1.2);
    bleed(e.x, e.y, rnd(TAU), 8, e.def.col, e.def.colD, 0.6);
    if (!launch) splat(e.x, e.y, e.r + 4, e.def.col, e.def.colD);
  }
  if (launch) kick(dir, 2.5);
  if (e.type !== 'slime' && !isBossWave(G.wave) && !G.queue.length && !G.sigils.length && !G.E.some((o) => o !== e && !o.dead && !o.prop)) {
    // the last kill of a wave lands harder
    hitstop(0.16); kick(dir, 4); flash(P.paper, 0.1, false);
    addRing(e.x, e.y - e.r, P.paper, 420, 0.4, 3); addRing(e.x, e.y - e.r, P.ember3, 300, 0.35, 1);
  }
  G.mk = G.mkT > 0 ? G.mk + 1 : 1; G.mkT = 0.5;
  if (G.mk >= 2) {
    G.mkShow = { n: G.mk, t: 0, bonus: 0 };
    G.bestMulti = Math.max(G.bestMulti, G.mk);
    A.multi(G.mk); shake(0.1 + Math.min(G.mk, 10) * 0.03);
  }
  if (e.type === 'lootling') {
    G.loot++;
    dropGold(e, 2);
    for (let i = 0; i < 14; i++) dropPick(e.x, e.y, 'energy');
    dropPick(e.x, e.y, 'heal');
    G.score += Math.round(2500 * RANKS[G.rank].m * G.D.score * twistScore());
    addText(e.x, e.y - 18, 'JACKPOT', P.gold, 2);
    for (let i = 0; i < 50; i++) { const a = rnd(TAU), v = rnd(60, 260); part(e.x, e.y - 6, Math.cos(a) * v, Math.sin(a) * v, rnd(0.4, 0.9), Math.random() < 0.6 ? P.gold : P.paper, { drag: 3, glow: true, z: 4, vz: rnd(40, 140), g: 300, keep: true }); }
    addRing(e.x, e.y - 6, P.gold, 260, 0.35, 3); flash(P.gold, 0.12, false); A.jackpot(); 
  }
  addRing(e.x, e.y - e.r, P.paper, 170, 0.16, 2);
  const motes = e.def.energy + (Math.random() < 0.5 ? 1 : 0) + (e.elite ? 4 : 0);
  for (let i = 0; i < motes; i++) dropPick(e.x, e.y, 'energy');
  // hearts are rare: a boss's summoned army never drops them, and Elite Hunt keeps its promise of a heart per elite
  if (!e.summoned && G.p.hp < G.p.maxHp && Math.random() < (e.elite && G.twist === 'ELITE' ? 1 : e.type === 'brute' ? 0.15 : e.elite ? 0.12 : 0.02)) dropPick(e.x, e.y, 'heal');
  G.score += Math.round(e.def.score * (e.elite ? 3 : 1) * (1 + G.combo * 0.02) * RANKS[G.rank].m * G.D.score * twistScore() * (G.up.midas ? 1.25 : 1));
  if (o.ug && G.p.ultLock <= 0 && !G.cine) G.p.ult = Math.min(100, G.p.ult + 3 * G.up.focus * G.kit.ultRate * G.pf.ult);
  hitstop(o.src === 'primary' ? 0.06 : 0.03);
  shake(e.type === 'brute' ? 0.55 : 0.3);
  A.kill(G.combo); buzz('kill');
  if (e.type === 'tick') G.booms.push({ x: e.x, y: e.y, t: 0.09, friendly: true });
  if (e.affix === 'VOLATILE') { G.strikes.push({ x: e.x, y: e.y, t: 0, delay: 0.75, R: 26, dmg: 1, friendly: false, kind: 'blast', c: AFFIX.VOLATILE.c }); A.fuse(); }
  if (e.affix === 'SPLITTING') for (const side of [-1, 1]) { const c = spawnEnemy(e.type === 'brute' ? 'husk' : e.type, e.x + side * 5, e.y); c.hp = c.maxHp = Math.max(1, Math.round(c.maxHp * 0.4)); c.elite = false; c.affix = null; c.ward = 0; c.state = HOME[c.type] || 'chase'; c.kx = side * 140; }
  if (G.up.midas) for (let i = 0; i < motes; i++) dropPick(e.x, e.y, 'energy');
  if (G.up.reaper && Math.random() < 0.35) spirits(e.x, e.y - e.r - 4, 1);
  // a slime splits into two hopping slimelets
  if (e.type === 'slime') for (const side of [-1, 1]) { const c = spawnEnemy('slimelet', e.x + side * 4, e.y); c.state = 'hop'; c.cd = 0.15; c.kx = side * 120; }
  if (G.up.evoEmber && e.burn > 0) { G.booms.push({ x: e.x, y: e.y, t: 0.05, friendly: true, R: 40, dmg: 14 }); G.zones.push({ type: 'burn', x: e.x, y: e.y, r: 22, t: 0, life: 2.5 }); }
  if (G.up.evoWpn && o.ug) spirits(e.x, e.y - e.r - 4, 5);
  if (e.frozen > 0 && G.up.frost) shatter(e);
  if (G.up.debt && ++G.debtKills >= (G.up.evoDebt ? 10 : 20)) { G.debtKills = 0; healPlayer(1); }
}

function shatter(e) {
  for (let i = 0; i < 16; i++) { const a = rnd(TAU), v = rnd(60, 200); part(e.x, e.y - 5, Math.cos(a) * v, Math.sin(a) * v, 0.4, Math.random() < 0.5 ? P.volt : P.paper, { drag: 5, glow: true }); }
  for (const o of G.E) if (alive(o) && o !== e && hyp(o.x - e.x, o.y - e.y) < 34) damage(o, pd(6), { dir: Math.atan2(o.y - e.y, o.x - e.x), kb: 120, src: 'bolt' });
  addRing(e.x, e.y - 5, P.volt, 200, 0.2, 2);
  A.freeze();
}

function launchCorpse(e, dir, kb) {
  const sp = clamp(170 + kb * 0.45, 170, 330);
  G.corpses.push({
    s: sprFor(e), flip: e.face < 0, x: e.x, y: e.y, z: 2, vx: Math.cos(dir) * sp, vy: Math.sin(dir) * sp * 0.75, vz: rnd(80, 130),
    rot: 0, vr: rnd(12, 20) * (Math.cos(dir) < 0 ? -1 : 1), t: 0, life: 1.1, col: e.def.col, col2: e.def.colD, r: e.r, hit: new Set(), landed: false,
  });
}
function updateCorpses(dt) {
  for (const c of G.corpses) {
    c.t += dt;
    c.vz -= 420 * dt; c.z += c.vz * dt;
    c.x += c.vx * dt; c.y += c.vy * dt;
    if (c.x < B.x0 + 4 || c.x > B.x1 - 4) { c.x = clamp(c.x, B.x0 + 4, B.x1 - 4); c.vx = -c.vx * 0.45; dust(c.x, c.y, 6, 50); A.wall(); shake(0.12); }
    if (c.y < B.y0 + 4 || c.y > B.y1 - 2) { c.y = clamp(c.y, B.y0 + 4, B.y1 - 2); c.vy = -c.vy * 0.45; dust(c.x, c.y, 6, 50); A.wall(); }
    if (c.z <= 0) {
      c.z = 0;
      if (!c.landed) { c.landed = true; splat(c.x, c.y, c.r + 4, c.col, c.col2); dust(c.x, c.y, 8, 50); A.splat(); }
      c.vz = Math.abs(c.vz) > 40 ? -c.vz * 0.3 : 0; c.vx *= 0.5; c.vy *= 0.5;
    }
    if (c.landed && c.z === 0) {
      // settle on its side
      const tgt = Math.round(c.rot / (Math.PI / 2)) * (Math.PI / 2) || (c.vr > 0 ? Math.PI / 2 : -Math.PI / 2);
      c.rot += (tgt - c.rot) * Math.min(1, 14 * dt);
    } else c.rot += c.vr * dt;
    if (c.t < 0.45 && Math.random() < 0.7) part(c.x, c.y, c.vx * 0.2, c.vy * 0.2, 2, c.col, { z: c.z + 5, vz: 10, g: 300, blood: true, drag: 2 });
    // bowling: a flying body knocks over whoever it hits
    if (hyp(c.vx, c.vy) > 90) for (const e of G.E) {
      if (!alive(e) || e.type === 'boss' || c.hit.has(e) || hyp(e.x - c.x, e.y - c.y) > e.r + c.r) continue;
      c.hit.add(e);
      const a = Math.atan2(c.vy, c.vx);
      damage(e, pd(4), { dir: a, kb: 220, src: 'corpse' });
      sparks(e.x, e.y - e.r, a, 6, 0.6, P.paper, 180); A.wall(); kick(a, 1.2);
      c.vx *= 0.7; c.vy *= 0.7;
    }
  }
  // a corpse that's done shatters into pixels where it lies
  for (const c of G.corpses) if (c.t >= c.life && !c.gone) {
    c.gone = true;
    const s = c.s, k = s.k || 1, q = ((Math.round(quarter(c.rot) / (Math.PI / 2)) % 4) + 4) % 4, src = c.flip ? s.f : s.n;
    const W0 = src.width, H0 = src.height, cv = makeCanvas(q % 2 ? H0 : W0, q % 2 ? W0 : H0), g2 = cv.getContext('2d');
    g2.translate(cv.width / 2, cv.height / 2); g2.rotate(q * (Math.PI / 2)); g2.drawImage(src, -W0 / 2, -H0 / 2);
    // the turned picture's feet sit where the corpse's middle puts them
    const hh = cv.height / k, y = c.y - s.h / 2 + hh / 2;
    crumble(cv, k, 1, c.x, y, c.z, { from: rnd(TAU), dir: 0, life: rnd(0.45, 0.6), t0: 0.02, noFlash: true, col: c.col, col2: c.col2 });
  }
  sweep(G.corpses, (c) => c.t < c.life);
}
const quarter = (a) => Math.round(a / (Math.PI / 2)) * (Math.PI / 2);
function drawCorpse(c) {
  const s = c.s;
  shadow(c.x, c.y, Math.max(2, c.r - Math.min(3, c.z / 10)));
  ctx.save();
  ctx.translate(Math.round(c.x), Math.round(c.y - c.z - s.h / 2 + 1));
  // it tumbles a quarter turn at a time, so its pixels stay on the grid
  ctx.rotate(quarter(c.rot));
  drawSprite(s, -s.w / 2, -s.h / 2, c.flip, c.t < 0.07 ? P.paper : null);
  ctx.restore();
}

// Monsters die in pixels. A cut splits the body along the cut on its own pixel grid (a stair-stepped edge, never a
// smooth one) and the two halves fly apart; any other kill leaves the body standing for a moment. Then the body
// crumbles pixel by pixel, from the wound (or the side the blow came from) outward, some pixels dropping off as square
// chips that bounce on the floor. Each piece is its own small picture, so a crumbled pixel is simply cleared from it.
const hex6 = (r, g, b) => '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
// cv: the picture (k picture pixels to a game pixel, drawn sc times bigger) with its feet at x, y, z up.
// o.cut: the cut's angle (two halves) or undefined (one piece); o.from: the direction the crumbling runs along.
// A sprite frame's pixels, read once and kept: reading a picture back from the GPU stalls it, which was a hitch on
// every kill on a phone.
const pixCache = new WeakMap();
function crumble(cv, k, sc, x, y, z, o) {
  const W = cv.width, H = cv.height;
  let data = pixCache.get(cv);
  if (!data) { try { data = cv.getContext('2d').getImageData(0, 0, W, H).data; } catch { return false; } pixCache.set(cv, data); }
  const halves = o.cut === undefined ? [0] : [1, -1], nx = o.cut === undefined ? 0 : -Math.sin(o.cut), ny = o.cut === undefined ? 0 : Math.cos(o.cut);
  const ax = Math.cos(o.from ?? 0), ay = Math.sin(o.from ?? 0);
  for (const side of halves) {
    const life = o.life ?? rnd(0.9, 1.15);
    const g = { cvW: W, cvH: H, k, sc, x, y, z, vz: side ? rnd(30, 80) : (o.vz ?? 0), sa: (o.cut ?? 0), side, t: 0, life, chips: 0, still: !side && !o.vx,
      vx: side ? nx * side * rnd(25, 60) + Math.cos(o.dir) * rnd(30, 80) : (o.vx ?? 0), vy: side ? ny * side * rnd(25, 60) + Math.sin(o.dir) * rnd(30, 80) : (o.vy ?? 0),
      col: o.col, col2: o.col2 };
    const cv2 = makeCanvas(W, H), cg = cv2.getContext('2d'), img = cg.createImageData(W, H), d = img.data;
    const wh = fx.lowFx || o.noFlash ? null : makeCanvas(W, H), wimg = wh && wh.getContext('2d').createImageData(W, H);
    const pix = [];
    let lo = Infinity, hi = -Infinity;
    for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
      const i = (yy * W + xx) * 4;
      if (data[i + 3] < 128) continue;
      const px0 = xx + 0.5 - W / 2, py0 = yy + 0.5 - H / 2, v = px0 * nx + py0 * ny;
      if (side && (v >= 0 ? 1 : -1) !== side) continue;
      d[i] = data[i]; d[i + 1] = data[i + 1]; d[i + 2] = data[i + 2]; d[i + 3] = 255;
      if (wimg) wimg.data[i] = wimg.data[i + 1] = wimg.data[i + 2] = wimg.data[i + 3] = 255;
      // how far into the crumbling this pixel is: from the cut outward, or along the blow
      const m = side ? Math.abs(v) : px0 * ax + py0 * ay;
      lo = Math.min(lo, m); hi = Math.max(hi, m);
      pix.push([xx, yy, m, hex6(data[i], data[i + 1], data[i + 2]), 0]);
    }
    if (!pix.length) continue;
    cg.putImageData(img, 0, 0);
    if (wh) wh.getContext('2d').putImageData(wimg, 0, 0);
    const t0 = o.t0 ?? 0.24, span = life - t0 - 0.1, rng = Math.max(1, hi - lo);
    for (const q of pix) q[4] = t0 + ((q[2] - lo) / rng) * span * 0.82 + Math.random() * span * 0.18;
    pix.sort((p, q) => p[4] - q[4]);
    Object.assign(g, { cv: cv2, cg, wh, pix, pi: 0 });
    G.gibs.push(g);
  }
  return true;
}
// a cut: two halves fly apart and crumble from the wound
export function makeGibs(e, dir) {
  const s = sprFor(e), src = e.face < 0 ? s.f : s.n;
  crumble(src, s.k || 1, e.def.scale || 1, e.x, e.y, 0, { cut: dir + Math.PI / 2, dir, col: e.def.col, col2: e.def.colD });
}
// any other kill: the body stays standing a moment and crumbles away from the side the blow came from
export function dissolve(e, dir) {
  const s = sprFor(e), src = e.face < 0 ? s.f : s.n;
  crumble(src, s.k || 1, e.def.scale || 1, e.x, e.y, e.z || 0, { from: dir + Math.PI, dir, life: rnd(0.5, 0.65), t0: 0.06, col: e.def.col, col2: e.def.colD });
}

// pickups: in the big late waves they can pile up by the hundred, so past 40 on the floor a new one joins a pickup of
// its kind lying near (n counts what it holds; it grows, and gives all of it when picked up)
export function dropPick(x, y, kind) {
  if (G.picks.length > 40) {
    let best = null, bd = 28 * 28;
    for (const k of G.picks) { if (k.kind !== kind || k.got) continue; const d = (k.x - x) ** 2 + (k.y - y) ** 2; if (d < bd) { bd = d; best = k; } }
    if (best) { best.n = (best.n || 1) + 1; best.vz = Math.max(best.vz, 40); return; }
  }
  const a = rnd(TAU), v = rnd(30, 90);
  G.picks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, z: 4, vz: rnd(40, 90), kind, t: 0, n: 1 });
}

export function healPlayer(n) {
  const p = G.p;
  if (p.hp >= p.maxHp) return;
  if (p.hp <= Math.max(2, p.maxHp * 0.3)) emote('heart', 1.2);
  p.hp = Math.min(p.maxHp, p.hp + n);
  addText(p.x, p.y - 22, '+' + n, P.blood, 1);
  A.heal();
}

// enemy attacks call this; returns true (hit), 'perfect', 'blocked' or false
export function tryHurt(dmg, sx, sy) {
  const p = G.p;
  if (p.state === 'dead' || G.cine || p.fortress > 0) return false;
  // TESTING, temporary: god mode
  if (settings.god) return false;
  if (p.state === 'dash' || (p.state === 'skill' && p.k.skillInv)) { if (p.state === 'dash' && !p.perfectUsed) perfectDodge(); if (p.state === 'skill') G.kit.onGuard?.(p, sx, sy); return 'perfect'; }
  if (p.inv > 0) return false;
  if (p.shield > 0) {
    p.shield--; p.inv = 0.5;
    addRing(p.x, p.y - 6, P.volt, 180, 0.25, 2); A.shieldHit();
    if (p.shield <= 0) G.kit.onShieldBreak?.(p);
    return 'blocked';
  }
  // training: nothing can hurt you (the hit shows, the hearts stay)
  if (G.tut || G.training) { p.inv = Math.max(p.inv, 0.4); addRing(p.x, p.y - 6, P.paper, 120, 0.2, 1); A.shieldHit(); return 'blocked'; }
  if (G.night) dmg = Math.ceil(dmg * (1.4 + nightMinutes() * 0.14));
  dmg += G.D.dmg + (G.twist === 'GLASS' ? 1 : 0);
  G.bossClean = false;
  if (G.up.thorns) {
    for (const e of G.E) if (alive(e) && hyp(e.x - p.x, e.y - p.y) < 50) damage(e, pd(10 * G.up.thorns), { dir: Math.atan2(e.y - p.y, e.x - p.x), kb: 260, src: 'bolt' });
    addRing(p.x, p.y - 6, P.blood, 260, 0.25, 2);
  }
  if (p.hp - dmg <= 0 && G.up.evoHeart && !G.undyingUsed) {
    G.undyingUsed = true; p.hp = p.maxHp; p.inv = 3; flash(P.gold, 0.4, true); A.ultRelease(); buzz('boss'); shake(1);
    addText(p.x, p.y - 26, 'UNDYING', P.gold, 3);
    for (let i = 0; i < 4; i++) addRing(p.x, p.y - 6, i % 2 ? P.paper : P.gold, 260 + i * 90, 0.6, 3);
    for (let i = 0; i < 80; i++) { const a = rnd(TAU), v = rnd(80, 320); part(p.x, p.y - 6, Math.cos(a) * v, Math.sin(a) * v, rnd(0.3, 0.8), Math.random() < 0.5 ? P.gold : P.paper, { drag: 4, glow: true, keep: true }); }
    p.evoFlash = 1.2;
    for (const e of G.E) if (alive(e)) damage(e, e.type === 'boss' ? pd(40) : pd(60), { dir: Math.atan2(e.y - p.y, e.x - p.x), kb: 420, src: 'ult', slice: true, crit: true });
    return 'blocked';
  }
  if (p.hp - dmg <= 0 && G.up.phoenix && !G.phoenixUsed) {
    // the phoenix feather burns up instead of you
    G.phoenixUsed = true; p.hp = p.maxHp; p.inv = 3; flash(P.ember, 0.4, true); A.ultRelease(); buzz('boss'); shake(1);
    addText(p.x, p.y - 26, 'REBORN', P.ember2, 3);
    for (let i = 0; i < 4; i++) addRing(p.x, p.y - 6, i % 2 ? P.ember3 : P.ember, 260 + i * 90, 0.6, 3);
    for (let i = 0; i < 90; i++) { const a = rnd(TAU), v = rnd(80, 320); part(p.x, p.y - 6, Math.cos(a) * v, Math.sin(a) * v, rnd(0.3, 0.9), Math.random() < 0.5 ? P.ember : P.ember2, { drag: 4, glow: true, keep: true }); }
    for (const e of G.E) if (alive(e)) damage(e, e.type === 'boss' ? pd(50) : pd(80), { dir: Math.atan2(e.y - p.y, e.x - p.x), kb: 420, src: 'ult', crit: true });
    G.zones.push({ type: 'burn', x: p.x, y: p.y, r: 40, t: 0, life: 4 });
    return 'blocked';
  }
  p.hp -= dmg;
  if (dmg >= 2) emote('angry', 1.3);
  // close to death, the King smells it, once a run
  if (p.hp > 0 && p.hp <= 2 && !G.saidLow && !G.talk) { G.saidLow = true; say(G.night ? TALK.lowHpNight : G.won ? TALK.lowHpDeep : TALK.lowHp); }
  // a short grace after a hit: enough to not lose two hearts to one blow, not enough to stand in a crowd
  p.inv = 0.35; p.hurtT = 0.3; p.sq = 0.26; p.sqv = 0;
  // a hit only nudges you back a little
  const a = Math.atan2(p.y - sy, p.x - sx);
  p.vx = Math.cos(a) * 70; p.vy = Math.sin(a) * 70;
  if (p.state === 'attack' || p.state === 'recover' || p.state === 'charge') p.state = 'move';
  hitstop(0.12); shake(0.65); kick(a, 2); flash(P.blood, 0.22, false); A.hurt();
  buzz('hurt');
  fx.hurtVig = 1;
  bleed(p.x, p.y, a, 14, P.blood, P.bloodD, 1);
  if (G.combo >= 5) addText(p.x, p.y - 24, 'COMBO LOST', P.dust);
  G.combo = 0; G.rank = 0; G.comboT = 0;
  if (!G.boss && !G.night) A.scene('fight');
  if (p.hp <= 0) die();
  return true;
}

function counterBlast(e, dir) {
  const p = G.p;
  hitstop(0.16); shake(0.75); kick(dir, 5); flash(P.volt, 0.18, true); buzz('heavy');
  A.parry(); A.ultCut(4); A.boom(0.7);
  addText(e.x, e.y - 22, 'COUNTER', P.volt, 2);
  addRing(e.x, e.y - e.r, P.volt, 320, 0.3, 3); addRing(e.x, e.y - e.r, P.paper, 220, 0.2, 1);
  sparks(e.x, e.y - e.r, dir, 18, 0.9, P.volt, 320);
  for (const o of G.E) if (o !== e && alive(o) && hyp(o.x - e.x, o.y - e.y) < 55) damage(o, pd(8), { dir: Math.atan2(o.y - e.y, o.x - e.x), kb: 280, src: 'bolt' });
  ghost(p, P.volt);
}

function perfectDodge() {
  const p = G.p;
  p.perfectUsed = true; emote('star', 0.9); daily('perfects', 1);
  if (++G.perfects >= 25) unlock('NINJA');
  slowmo(0.6, 0.3);
  p.energy = Math.min(100, p.energy + 12);
  p.inv = Math.max(p.inv, G.char === 'BLADE' ? 0.18 : 0.45);
  p.counter = 2.5; p.counterHit = false;
  addText(p.x, p.y - 24, 'PERFECT  COUNTER READY', P.volt, 1);
  addRing(p.x, p.y - 6, P.volt, 220, 0.35, 2);
  A.perfect(); buzz('parry');
  addCombo(1);
}

function die() {
  const p = G.p;
  p.hp = 0; p.state = 'dead'; G.dead = true; G.deadT = 0;
  G.talk = null; G.lastWords = lastWords();
  shake(1); flash(P.blood, 0.25, true);
  A.stopVoice(); A.death(); A.scene('dead'); A.stopLoops();
  // whatever the fighter had going ends with them: Unit-7's beam and sky laser, Rin's flash cut, Grom's fortress,
  // shields and buffs (their kit stops updating and drawing from here on, so nothing is left hanging in the air)
  if (p.k) { p.k.firing = false; p.k.orb = 0; p.k.beam = null; p.k.stand = 0; }
  p.fortress = 0; p.shield = 0; p.ascend = 0; p.invis = 0; p.chg = null;
  // Unit-7 leaks oil, everyone else bleeds
  const oil = G.char === 'ROBOT', c1 = oil ? '#2e2a36' : P.blood, c2 = oil ? '#0e0c12' : P.bloodD;
  bleed(p.x, p.y, rnd(TAU), 30, c1, c2, 1.2);
  splat(p.x, p.y, 9, c1, c2);
  // each fighter has a death scene of their own (deaths.js)
  startDeath(p);
}

// ---------- projectiles ----------
export function shoot(o) {
  const s = {
    power: o.power || G.power || (G.tagBasic ? 'weapon' : undefined), owner: 'player', x: o.x, y: o.y, vx: Math.cos(o.a) * o.sp, vy: Math.sin(o.a) * o.sp, r: o.r ?? 2, dmg: o.dmg, kb: o.kb ?? 60,
    life: o.life ?? 1, t: 0, kind: o.kind ?? 'bullet', c: o.c ?? P.gold, pierce: o.pierce ?? 0, bounce: o.bounce ?? 0,
    homing: o.homing ?? 0, splash: o.splash, hit: new Set(), ug: o.ug ?? true, noEnergy: !!o.noEnergy, slice: o.slice ?? false, poison: o.poison, freeze: o.freeze,
    spin: 0, trail: o.trail ?? true, onHit: o.onHit, basic: o.basic ?? !!G.tagBasic,
  };
  if (G.awPal) { s.c = G.awPal[s.c] || s.c; s.thick = true; if (s.basic) s.r += 1; }
  G.shots.push(s);
  return s;
}
export function fire(x, y, a, sp, o = {}) {
  G.shots.push({ owner: 'enemy', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: o.r ?? 3, life: o.life ?? 6, dmg: o.dmg ?? 1, t: 0, c: o.c ?? (o.noparry ? P.blood : P.hex), noparry: !!o.noparry, accel: o.accel ?? 0, bounce: o.bounce || 0, trail: !o.arrow, ret: o.ret, retT: o.retT, fist: o.fist, arrow: o.arrow });
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
    if (hyp(e.x - x, e.y - y) < R + e.r) damage(e, friendly ? pd(dmg0) : 8, { dir: Math.atan2(e.y - y, e.x - x), kb: 260, src: 'boom' });
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
  if (settings.testCharge) { p.energy = p.ult = 100; p.cdQ = p.cdE = 0; }
  if (p.state === 'dead' || p.state === 'cine') return;
  if (bossLock()) { p.bufAtk = p.bufDash = p.bufQ = p.bufE = p.bufR = 0; p.castAim = null; p.atkHeld = false; return; }
  if (input.cast) p.castAim = { ...input.cast, a: input.cast.a ?? p.aim, t: 0.4 };
  if (actionHit('attack')) { p.bufAtk = 0.2; input.device = 'keys'; }
  if (m.pressed) p.bufAtk = 0.2;
  // holding attack: guns keep firing, blades wind up a charged attack instead of repeating the combo
  p.atkHeld = (m.down && input.device === 'mouse') || actionDown('attack') || (input.touch && input.tb.attack);
  if (kit.melee && !kit.charge && p.atkHeld) p.bufAtk = Math.max(p.bufAtk, 0.04);
  if (actionHit('dash') || m.rpressed) p.bufDash = 0.18;
  if (input.touch) {
    if (input.thit.has('attack')) p.bufAtk = 0.2;
    if (input.thit.has('dash')) p.bufDash = 0.18;
  }
  const ask = (cost, cd, key) => {
    if (!actionHit(key.toLowerCase()) && !input.thit.has(key.toLowerCase())) return;
    if (p.energy >= cost && cd <= 0) p['buf' + key] = 0.18; else { G.deny[key.toLowerCase()] = 0.35; A.deny(); }
  };
  ask(kit.q.cost, p.cdQ, 'Q');
  ask(kit.e.cost, p.cdE, 'E');
  if (actionHit('r') || input.thit.has('r')) { if (p.ult >= 100 && G.E.some(foe)) p.bufR = 0.25; else { G.deny.r = 0.35; A.deny(); } }
  // inside the Wyrm there's no room to dash or cast: only your weapon works
  if (G.swallow) { p.bufDash = p.bufQ = p.bufE = p.bufR = 0; }
}

// ---------- player ----------
function startUltimate(p, kit, up) {
  rememberAction('spell'); tutNote('ult'); daily('ults', 1);
  const target = kit.r.target?.(p);
  p.bufR = 0; p.ult = 0; p.ultLock = 2.5; p.castAim = null;
  buzz('ult');
  // the fighter shouts the move's name over the ultimate itself: no pause, it goes off at once
  A.playVoice(kit.id);
  withPower('ultimate', () => kit.r.use(p, target));
  setSpriteAction(p, 'ultimate');
  if (awake()) { withPower('ultimate',()=>kit.awake.ult(p)); p.ult = 30; }
  if (up.evoUlt) {
    p.ascend = 8; p.ascNova = 1; p.ult = Math.max(p.ult, 25);
    p.inv = Math.max(p.inv, 2); p.evoFlash = 1;
  }
}

function updatePlayer(dt) {
  const p = G.p, up = G.up, kit = G.kit;
  p.t += dt; p.atkT += dt;
  p.holdT = p.atkHeld ? p.holdT + dt : 0;
  p.inv = Math.max(0, p.inv - dt); p.hurtT -= dt; p.comboWin -= dt;
  // the body's squash and stretch springs back to rest (positive: squashed wide, negative: stretched tall), and a
  // shot's kick fades out
  { const d = Math.min(dt, 1 / 30); p.sqv = (p.sqv || 0) + (-320 * (p.sq || 0) - 19 * (p.sqv || 0)) * d; p.sq = Math.max(-0.32, Math.min(0.32, (p.sq || 0) + p.sqv * d)); }
  p.recoil = Math.max(0, (p.recoil || 0) - dt * 7);
  p.skidCd = (p.skidCd || 0) - dt;
  flourishUpdate(p, dt);
  if (G.char === 'NINJA') sheathUpdate(p, dt);
  if (p.counter > 0) { p.counter -= dt; if (p.counter <= 0) p.counterHit = false; }
  p.bufAtk -= dt; p.bufDash -= dt; p.bufQ -= dt; p.bufE -= dt; p.bufR -= dt;
  if (p.castAim && (p.castAim.t -= dt) <= 0) p.castAim = null;
  if (bossLock()) {
    // frozen in place for the boss entrance, and safe while frozen
    p.inv = Math.max(p.inv, 0.15); p.vx = p.vy = 0; p.state = 'move';
    if (p.k) p.k.firing = false;
    A.loop('beam', false);
    return;
  }
  if (p.held > 0) {
    // turned to stone by the Eclipse or stopped in time by the Clockwork: no moving and no fighting until it wears off
    p.held -= dt; p.vx = p.vy = 0; p.moveIn = 0; p.atkHeld = false;
    p.bufAtk = p.bufDash = p.bufQ = p.bufE = p.bufR = 0;
    if (p.state !== 'dead') p.state = 'move';
    if (p.k) p.k.firing = false;
    if (p.held <= 0) {
      p.heldKind = null; A.wall(); addRing(p.x, p.y - 6, P.paper, 160, 0.2, 1);
      for (let i = 0; i < 10; i++) part(p.x + rnd(-6, 6), p.y - rnd(0, 14), rnd(-40, 40), -rnd(10, 60), 0.5, '#9c98aa', { g: 200, drag: 1, s: 2 });
    }
    return;
  }
  p.cdQ -= dt; p.cdE -= dt; p.ultLock -= dt;
  p.dashBuffT = Math.max(0, (p.dashBuffT || 0) - dt); p.chgFlashT = Math.max(0, (p.chgFlashT || 0) - dt);
  p.invis = Math.max(0, p.invis - dt); p.fortress = Math.max(0, p.fortress - dt);
  if (p.shieldT > 0) { p.shieldT -= dt; if (p.shieldT <= 0 && p.shield > 0) { p.shield = 0; kit.onShieldBreak?.(p); } }
  if (p.charges < p.dashMax) { p.dashCd -= dt; if (p.dashCd <= 0) { p.charges++; p.dashCd = kit.dash.cd * up.dashMul * G.pf.dash; } }
  p.energy = Math.min(100, p.energy + 2.5 * up.regen * G.pf.energy * (p.ascend > 0 ? 5 : 1) * dt);
  if (learning()) p.energy = 100;
  if (p.ascend > 0) {
    p.ascend -= dt;
    if (Math.random() < dt * 40) part(p.x + rnd(-8, 8), p.y - rnd(0, 16), 0, -rnd(20, 60), 0.6, Math.random() < 0.7 ? P.gold : P.paper, { glow: true, drag: 1 });
    p.ascNova -= dt;
    if (p.ascNova <= 0) {
      p.ascNova = 1;
      addRing(p.x, p.y - 6, P.gold, 280, 0.3, 3); addRing(p.x, p.y - 6, P.paper, 200, 0.22, 1);
      for (const e of G.E) if (alive(e) && hyp(e.x - p.x, e.y - p.y) < 78) damage(e, pd(10), { dir: Math.atan2(e.y - p.y, e.x - p.x), kb: 200, src: 'bolt' });
      A.boom(0.6); shake(0.15);
    }
  }
  p.evoFlash = Math.max(0, (p.evoFlash || 0) - dt);
  const evos = up.evoWpn + up.evoSpell + up.evoUlt + up.evoHeart + up.evoSwift + up.evoStatic + up.evoEmber + up.evoOrbit;
  if (evos && Math.random() < dt * evos * 5) { const a = rnd(TAU); part(p.x + Math.cos(a) * 10, p.y - 6 + Math.sin(a) * 6, 0, -rnd(10, 25), 0.6, P.gold, { glow: true, drag: 1 }); }
  if (up.evoStatic) {
    G.stormT = (G.stormT ?? 2.5) - dt;
    if (G.stormT <= 0) { G.stormT = 2.5; const live = G.E.filter(foe); if (live.length) { const e = live[Math.floor(rnd(live.length))]; skyStrike(e.x, e.y, 26, 14); } }
  }
  if (up.crown) {
    G.crownT = (G.crownT ?? 2) - dt;
    if (G.crownT <= 0) { G.crownT = 2; const live = G.E.filter(foe); if (live.length) { const e = live[Math.floor(rnd(live.length))]; skyStrike(e.x, e.y, 24, 16); } }
  }
  updateOrbit(p, dt);
  if (G.rank >= 4 && p.state !== 'dead') {
    const c = P[RANKS[G.rank].c] || P.paper, moving = hyp(p.vx, p.vy) > 30;
    p.rankGhT = (p.rankGhT || 0) - dt;
    if (moving && p.rankGhT <= 0 && p.state !== 'dash') { p.rankGhT = 0.07; const hs = heroSet(); ghost(p, c, hs.run?.[Math.floor(p.runT * (hs.rig?.gait?.run?.fps || 13)) % hs.run.length]); }
    if (Math.random() < dt * (G.rank >= 6 ? 26 : 10)) part(p.x + rnd(-6, 6), p.y - rnd(0, 6), rnd(-8, 8), -rnd(20, 50), rnd(0.3, 0.6), Math.random() < 0.6 ? c : P.paper, { glow: true, drag: 2 });
  }

  let mx = (actionDown('right') ? 1 : 0) - (actionDown('left') ? 1 : 0);
  let my = (actionDown('down') ? 1 : 0) - (actionDown('up') ? 1 : 0);
  if (!mx && !my && input.stick.id !== null) { mx = input.stick.dx; my = input.stick.dy; }
  // the Mirror turned you around: left is right while it lasts
  if (G.mirrorT > 0) mx = -mx;
  const ml = hyp(mx, my);
  p.moveIn = ml;
  if (ml) { const n = Math.max(1, ml); mx /= n; my /= n; p.moveAng = Math.atan2(my, mx); }
  if (p.state !== 'dead' && p.state !== 'cine') {
    if (input.device === 'touch') touchAim(p, ml);
    else if (input.device === 'mouse') p.aim = Math.atan2(input.mouse.y + fx.cam.y - (p.y - 6), input.mouse.x + fx.cam.x - p.x);
    else if (ml) p.aim = p.moveAng;
  }
  // the Brood Mother's webs hold your feet (a dash still goes at full speed)
  const webbed = G.webs?.some((w) => hyp(p.x - w.x, (p.y - w.y) * 1.4) < w.r);
  const speed = kit.stats.speed * G.pf.speed * p.slowMul * (webbed ? 0.42 : 1), fr = G.map.friction;
  if (webbed && ml && Math.random() < 0.15) part(p.x + rnd(-4, 4), p.y - rnd(0, 3), rnd(-10, 10), -rnd(5, 15), 0.4, '#d8d0e0', { drag: 2 });

  switch (p.state) {
    case 'move': {
      const k = 1 - Math.exp(-fr * dt), sp = hyp(p.vx, p.vy), grounded = heroHover(p) === 0;
      // pushing off from a standstill kicks dust back and stretches the body; a hard turn at speed skids (the body
      // squashes, dust sprays the way it was going); letting go at a run skids to a stop
      if (grounded && ml && !p.wasMoving && sp < speed * 0.35) { kickDust(p, -mx, -my, 5); p.sq = Math.min(p.sq || 0, -0.08); p.sqv = 0; }
      if (grounded && ml && sp > speed * 0.6 && (p.vx * mx + p.vy * my) / sp < -0.35 && p.skidCd <= 0) { p.skidCd = 0.3; skid(p, 8); }
      if (grounded && !ml && p.wasMoving && sp > speed * 0.6 && p.skidCd <= 0) { p.skidCd = 0.3; skid(p, 5); }
      p.wasMoving = !!ml;
      p.vx += (mx * speed - p.vx) * k; p.vy += (my * speed - p.vy) * k;
      if (ml) {
        p.runT += dt; p.stepT -= dt;
        if (p.stepT <= 0) {
          const gt = heroSet()?.rig?.gait?.[sp < speed * 0.7 ? 'walk' : 'run'];
          p.stepT = gt ? 6 / gt.fps : 0.26;
          if (grounded) { A.step(); dust(p.x, p.y, 2, 20); if (G.char === 'NINJA' && sp > speed * 0.7) kickDust(p, -mx, -my, 2); }
        }
      } else p.runT = 0;
      break;
    }
    case 'attack': {
      const k = 1 - Math.exp(-12 * dt);
      p.vx += (mx * speed * 0.45 - p.vx) * k; p.vy += (my * speed * 0.45 - p.vy) * k;
      const sw = p.swing;
      if (sw.delay && !sw.landed && p.atkT >= sw.delay) {
        // the hammer or wrench hits the floor
        sw.landed = true;
        const cx = p.x + Math.cos(p.atkAng) * sw.reach * 0.5, cy = p.y + Math.sin(p.atkAng) * sw.reach * 0.5;
        addRing(cx, cy, P.paper, sw.reach * 7, 0.22, 2); addRing(cx, cy, P[sw.col] || P.ember, sw.reach * 5, 0.3, 3);
        dust(cx, cy, 16, 130); scorch(cx, cy, 7); shake(0.5); hitstop(0.04); A.boom(0.55);
      }
      if (sw.rehit && p.atkT >= sw.rehit) {
        // the second cut of a cross or an iai draw
        sw.rehit = 0; p.swingHit = new Set(); sw.dir = -sw.dir; sw.active = p.atkT + 0.085;
        G.slashes.push({ follow: true, x: p.x, y: p.y, a: p.atkAng, r: sw.reach, arc: Math.max(sw.arc, 1.6), dir: sw.dir, t: 0, life: 0.15, th: sw.th, col: sw.col });
        A.charAtk(G.char, sw.heavy, p.step + 1);
      }
      if (p.atkT >= sw.delay && p.atkT <= sw.active) swingHits();
      // once the hit is done, moving cancels the rest of the recovery (the combo window stays open)
      if (p.atkT >= p.atkDur || (ml && p.atkT > sw.active && p.atkT >= p.cancelAt && !sw.rehit)) { p.state = 'move'; p.comboWin = 0.3; }
      break;
    }
    case 'dash': {
      p.vx = p.dx * kit.dash.speed; p.vy = p.dy * kit.dash.speed;
      p.dashT -= dt; p.ghostT -= dt;
      if (p.ghostT <= 0) { p.ghostT = 0.022; ghost(p, kit.color(), heroSet().body?.dash?.[Math.floor(G.time * 18) % 4]); }
      // speed lines streaming off behind
      for (let i = 0; i < 2; i++) {
        const o = rnd(-7, 7);
        part(p.x - p.dx * 6 - p.dy * o, p.y - 7 + p.dx * o * 0.6 + rnd(-4, 4), -p.dx * rnd(90, 200), -p.dy * rnd(90, 200), rnd(0.08, 0.15), Math.random() < 0.6 ? P.paper : kit.color(), { drag: 1, glow: true });
      }
      if (up.phantom) {
        for (const e of G.E) {
          if (!alive(e) || p.phantomHit.has(e) || hyp(e.x - p.x, e.y - p.y) > e.r + 10) continue;
          p.phantomHit.add(e);
          damage(e, pd(5 * up.phantom * (up.evoPhantom ? 3 : 1)), { dir: Math.atan2(p.dy, p.dx) + Math.PI / 2, kb: 90, src: 'dash', slice: true });
          sparks(e.x, e.y - 5, Math.atan2(p.dy, p.dx), 8, 0.5, P.volt);
          A.hit(false, false);
        }
      }
      if (p.dashT <= 0) {
        p.state = 'move'; p.vx *= 0.3; p.vy *= 0.3; p.sq = 0.15; p.sqv = 0;
        if (heroHover(p) === 0) { kickDust(p, p.dx, p.dy, 7); A.step(); }
        if (up.evoSwift && p.dashFrom) {
          const [x0, y0] = p.dashFrom;
          G.cuts.push({ x0, y0: y0 - 5, x1: p.x, y1: p.y - 5, a: Math.atan2(p.y - y0, p.x - x0), t: 0, pend: 0.28, marked: [], echo: 0, done: false,
            fire(c) {
              for (const e of G.E) if (alive(e) && segDist(e.x, e.y - e.r, c.x0, c.y0, c.x1, c.y1) < e.r + 12) damage(e, pd(14), { dir: c.a + Math.PI / 2, kb: 160, src: 'bolt', slice: true });
              const L = hyp(c.x1 - c.x0, c.y1 - c.y0), n = Math.max(2, Math.ceil(L / 30));
              for (let i = 0; i < n; i++) G.bolts.push({ x0: c.x0 + ((c.x1 - c.x0) * i) / n, y0: c.y0 + ((c.y1 - c.y0) * i) / n, x1: c.x0 + ((c.x1 - c.x0) * (i + 1)) / n, y1: c.y0 + ((c.y1 - c.y0) * (i + 1)) / n, t: 0, life: 0.3 });
              A.zap(); shake(0.3);
            } });
        }
      }
      break;
    }
    case 'recover': {
      const k = 1 - Math.exp(-10 * dt);
      p.vx -= p.vx * k; p.vy -= p.vy * k;
      p.recT -= dt;
      if (p.recT <= 0) p.state = 'move';
      break;
    }
    case 'charge': {
      // winding up: slow steps, the weapon drawn back, power building until the button lets go
      const k = 1 - Math.exp(-12 * dt), c = kit.charge;
      p.vx += (mx * speed * c.move - p.vx) * k; p.vy += (my * speed * c.move - p.vy) * k;
      p.chargeT += dt;
      // a phone keeps the last direction the attack button was dragged, so letting go doesn't snap to an enemy
      if (input.aim.active) p.chgDir = input.aim.a;
      const f = chargeLevel(p);
      if (f >= 1 && !p.chargeFull) {
        p.chargeFull = true;
        A.chargeFull(); buzz('hit'); flash(P.paper, 0.06, false);
        addRing(p.x, p.y - 6, P.paper, 160, 0.25, 2); addRing(p.x, p.y - 6, kit.color(), 110, 0.35, 1);
        addText(p.x, p.y - 26, 'MAX', P.gold);
      } else if (f < 1) A.charge(f);
      if (Math.random() < dt * (10 + f * 30)) {
        // sparks drawn in toward the fighter
        const a = rnd(TAU), d = rnd(14, 22);
        part(p.x + Math.cos(a) * d, p.y - 6 + Math.sin(a) * d * 0.6, -Math.cos(a) * d * 3, -Math.sin(a) * d * 1.8, 0.3, f >= 1 ? P.paper : kit.color(), { glow: true, drag: 2 });
      }
      if (!p.atkHeld) releaseCharge(p, f);
      break;
    }
    case 'chg': if (!p.chg || withPower('weapon', () => p.chg.update(p, dt)) === true) { p.state = 'move'; p.chg = null; } break;
    case 'skill': if (withPower('spell', () => kit.skill(p, dt, mx, my)) === true) p.state = 'move'; break;
    case 'dead': p.vx *= Math.exp(-6 * dt); p.vy *= Math.exp(-6 * dt); break;
  }

  if (p.state !== 'dead' && p.state !== 'cine') {
    const free = p.state === 'move' || (p.state === 'recover' && p.recT < 0.05);
    const canAct = free || p.state === 'charge' || (p.state === 'attack' && p.atkT >= p.cancelAt);
    const canDash = G.t >= (p.nextDash || 0) && p.state !== 'dash' && p.state !== 'skill' && p.state !== 'chg';
    if (p.bufDash > 0 && p.charges > 0 && canDash && p.energy < DASH_COST && !G.shackle) {
      p.bufDash = 0;
      if (!(G.deny.dash > 0)) { A.deny(); addText(p.x, p.y - 24, 'NO ENERGY', P.volt, 1); emote('dots', 1); }
      G.deny.dash = 0.35;
    } else if (p.bufDash > 0 && p.charges > 0 && canDash) startDash(mx, my, ml);
    else if (p.bufR > 0 && canAct && p.ult >= 100) { startUltimate(p, kit, up); return; }
    else if (p.bufQ > 0 && canAct && p.energy >= kit.q.cost && p.cdQ <= 0) castSkill(p, 'q');
    else if (p.bufE > 0 && canAct && p.energy >= kit.e.cost && p.cdE <= 0) castSkill(p, 'e');
    else if (kit.melee) {
      // a fighter with a charged attack waits a moment on a fresh press: a tap swings when it's let go, a hold goes
      // straight into the charge without a swing first
      const deciding = kit.charge && p.atkHeld && p.state !== 'attack' && p.state !== 'charge' && p.state !== 'chg';
      if (deciding && free && p.holdT >= 0.18) { p.bufAtk = 0; startCharge(p); }
      else if (p.bufAtk > 0 && canAct && p.state !== 'charge' && !deciding) startAttack();
      // still holding once the swing can be cancelled: start winding up the charged attack
      else if (kit.charge && p.atkHeld && p.holdT > 0.22 && p.bufAtk <= 0 && (free || (p.state === 'attack' && p.atkT >= p.cancelAt))) startCharge(p);
    }
    if (!kit.melee && p.state !== 'dead') {
      const trigger = p.atkHeld || p.bufAtk > 0;
      G.tagBasic = true;
      const shots = G.shots.length;
      kit.primary(p, dt, trigger && (p.state === 'move' || p.state === 'recover'));
      if (G.shots.length > shots || p.k.firing) {
        p.bufAtk = 0;
        if (G.t >= (p.studyShot || 0)) { rememberAction('weapon'); p.studyShot = G.t + 0.32; }
      }
      if (G.shots.length > shots) { p.recoil = 1; p.sq = Math.max(p.sq || 0, 0.06); }
      G.tagBasic = false;
    }
  }
  if (p.state !== 'dead') { kit.update?.(p, dt); kit.flair?.(p, dt, hyp(p.vx, p.vy) > 20); kit.tick?.(p, dt); }

  p.x = clamp(p.x + p.vx * dt, B.x0 + p.r, B.x1 - p.r);
  p.y = clamp(p.y + p.vy * dt, B.y0 + p.r, B.y1 - 2);
  if ((G.obst.length || G.props.length) && !p.hidden) pushOut(p, p.r);
}

// phones: aim at the nearest enemy, otherwise where you're walking
function touchAim(p, ml) {
  if (p.castAim) { p.aim = p.castAim.a; return; }
  if (input.skill.active) { p.aim = input.skill.a; return; }
  if (input.aim.active) { p.aim = input.aim.a; return; }
  let best = null, bd = 170;
  for (const e of G.E) { if (!foe(e)) continue; const d = hyp(e.x - p.x, e.y - p.y); if (d < bd) { bd = d; best = e; } }
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

// ---------- charged attacks ----------
// Hold attack after a swing to wind up; let go to unleash. The power is the share of a full charge,
// so letting go at half charge hits half as hard (and dashes or spreads half as far).
export const chargeLevel = (p) => Math.min(1, p.chargeT / (G.kit.charge.time / (G.up.spd * (p.ascend > 0 ? 1.4 : 1))));
function startCharge(p) {
  p.state = 'charge'; p.chargeT = 0; p.chargeFull = false; p.comboWin = 0; p.chgDir = null; p.sq = 0.12; p.sqv = 0;
  // a charge begun inside Flash Strike's window keeps the bonus until it's released
  p.chgFlash = G.kit.dashStrike && p.dashBuffT > 0; if (p.chgFlash) p.dashBuffT = 0;
  A.swing(0);
}
// the awakened release: a flash and rings in the fighter's colors, bigger the fuller the charge
function chargeBurst(p, f) {
  const col = G.kit.color();
  addRing(p.x, p.y - 6, col, 260 + 200 * f, 0.35, 3); addRing(p.x, p.y - 6, P.paper, 200 + 160 * f, 0.25, 1);
  for (let i = 0; i < 40 * f; i++) { const a = rnd(TAU), v = rnd(80, 300); part(p.x, p.y - 6, Math.cos(a) * v, Math.sin(a) * v, rnd(0.3, 0.8), Math.random() < 0.6 ? col : P.paper, { drag: 3, glow: true }); }
  if (f >= 1) flash(col, 0.18, false);
  shake(0.3 + 0.5 * f); hitstop(0.04 + 0.05 * f);
}
function releaseCharge(p, f) {
  // letting go is not a new press (some browsers send a click when a finger lifts)
  p.state = 'move'; p.bufAtk = 0;
  // barely charged: just a normal swing (the press turned out to be a slow tap)
  if (f < 0.15) { p.chgFlash = false; startAttack(); return; }
  G.inCharge = true; p.sq = -0.26; p.sqv = 0;
  // Flash Strike on a charge: its hits (which may land a moment later, like Rin's delayed cuts) do bonus damage
  if (p.chgFlash) { p.chgFlash = false; p.chgFlashT = 1.2; flashFx(p); }
  rememberAction('weapon'); tutNote('charge');
  const act = withPower('weapon', () => G.kit.charge.release(p, f));
  if (awake()?.charge) { withPower('weapon', () => G.kit.awake.charge(p, f)); chargeBurst(p, f); }
  G.inCharge = false;
  buzz(f >= 1 ? 'heavy' : 'hit');
  if (act) { p.state = 'chg'; p.chg = act; }
}

function startAttack() {
  rememberAction('weapon');
  const p = G.p, up = G.up, m = G.kit.melee;
  p.bufAtk = 0;
  p.step = p.state === 'attack' || p.comboWin > 0 ? (p.step + 1) % m.steps.length : 0;
  if (input.device === 'keys') aimAssist();
  p.atkAng = p.aim;
  p.state = 'attack'; p.atkT = 0; p.sq = -0.17; p.sqv = 0;
  const s = m.steps[p.step];
  // m.slow: every melee swing recovers slower than it used to, so mashing is weaker than timing and charging
  const spd = (up.spd * (p.ascend > 0 ? 1.4 : 1)) / (m.slow || 1);
  p.atkDur = s.dur / spd;
  p.cancelAt = s.cancel / spd;
  p.vx = Math.cos(p.atkAng) * s.lunge; p.vy = Math.sin(p.atkAng) * s.lunge;
  // shapes: arc (default), cross (a second cut back the other way), thrust (long and narrow),
  // iai (a lunging thrust with a delayed second cut), spin (all around), slam (a delayed ground impact in front)
  const shape = s.shape || 'arc', delay = shape === 'slam' ? (s.dur * 0.38) / spd : 0;
  const fsw = flashStrike(p);
  if (fsw) { G.skillMult = 1; flashFx(p); }
  p.swing = { reach: s.reach * up.reach, arc: s.arc, dmg: s.dmg * (fsw ? G.kit.dashStrike : 1), heavy: !!s.heavy || fsw, kb: s.kb, active: delay + 0.085 / up.spd, dir: p.step % 2 ? -1 : 1,
    shape, delay, rehit: shape === 'cross' || shape === 'iai' ? 0.1 / spd : 0, landed: false, th: s.th };
  // Rin drawing from the scabbard: the quick draw (a flash along the cut, a sure critical hit)
  if (G.char === 'NINJA' && p.sheathed) {
    p.sheathed = false; p.drawnT = 0; p.swing.iai = true; p.swing.heavy = true;
    const [hx, hy] = handPoint(p);
    G.slashes.push({ follow: true, x: p.x, y: p.y, a: p.atkAng, r: p.swing.reach + 12, arc: Math.max(1.2, p.swing.arc * 0.8), dir: p.swing.dir, t: -0.01, life: 0.16, th: 2, col: 'paper' });
    sparks(hx, hy, p.atkAng, 8, 0.3, P.paper, 260);
    flash(P.paper, 0.06, false); A.slice(); addText(p.x, p.y - 28, 'IAI', P.paper);
  }
  p.swingHit = new Set();
  const col = RANKS[G.rank].l === 'SSS' ? 'gold' : m.col;
  p.swing.col = col;
  const aw = G.evo === true && G.awPal;
  // awakened arcs are twice as thick; Oni Rin's are thicker still
  const thk = aw ? (G.char === 'NINJA' ? 2.6 : 2) : 1;
  if (shape !== 'slam') G.slashes.push({ follow: true, x: p.x, y: p.y, a: p.atkAng, r: p.swing.reach + (aw ? 2 : 0), arc: s.arc, dir: p.swing.dir, t: 0, life: s.heavy ? 0.24 : Math.min(0.19, s.dur * 0.9), th: Math.round(s.th * thk), col });
  if (aw) {
    // a second, wider arc trails the first
    const ninja = G.char === 'NINJA';
    if (shape !== 'slam') G.slashes.push({ follow: true, x: p.x, y: p.y, a: p.atkAng, r: p.swing.reach + 9, arc: s.arc * 1.1, dir: p.swing.dir, t: -0.03, life: (s.heavy ? 0.24 : 0.19) + 0.08, th: Math.max(3, Math.round(s.th * (ninja ? 1.4 : 0.7))), col: ninja ? 'gold' : 'paper' });
    // sparkles in her awakened color thrown off along Oni Rin's swing
    if (ninja) for (let i = 0; i < 14; i++) { const b = p.atkAng + rnd(-s.arc / 2, s.arc / 2), r = p.swing.reach * rnd(0.6, 1.1); part(p.x + Math.cos(b) * r, p.y - 5 + Math.sin(b) * r, Math.cos(b) * rnd(30, 90), Math.sin(b) * rnd(30, 90), rnd(0.2, 0.45), Math.random() < 0.5 ? G.kit.awake.pal.col : P.paper, { drag: 4, glow: true }); }
    G.kit.awake.swing?.(p, s, shape);
  }
  A.charAtk(G.char, !!s.heavy, p.step);
}

function swingHits() {
  const p = G.p, sw = p.swing;
  for (const e of G.E) {
    if (!alive(e) || p.swingHit.has(e) || e.z > 8) continue;
    const dx = e.x - p.x, dy = e.y - p.y, d = hyp(dx, dy);
    if (d > sw.reach + e.r) continue;
    const a = Math.atan2(dy, dx);
    if (sw.shape === 'slam') { const cx = p.x + Math.cos(p.atkAng) * sw.reach * 0.5, cy = p.y + Math.sin(p.atkAng) * sw.reach * 0.5; if (hyp(e.x - cx, e.y - cy) > sw.reach * 0.65 + e.r) continue; }
    else if (sw.shape !== 'spin' && d > e.r + 6 && Math.abs(angDiff(a, p.atkAng)) > sw.arc / 2) continue;
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
  if (crit) mult *= G.up.evoCrit ? 3 : 2;
  if (p.invis > 0 && kit.backstab) { mult *= 3; crit = true; p.invis = 0; addText(e.x, e.y - 24, 'BACKSTAB', P.blood); }
  if (e.stunT > 0 || e.state === 'stun') mult *= 1.5;
  if (sw.iai) { mult *= crit ? 1.5 : 3; crit = true; }
  const killed = damage(e, sw.dmg * mult * G.up.dmg, { dir, kb: sw.kb, src: 'primary', ug: true, slice: true, crit, rolledCrit:true, heavy: sw.heavy, basic: true });
  kick(dir, sw.heavy || crit ? 2 : 1);
  if (!killed) hitstop(e.type === 'boss' ? 0.035 : sw.heavy || crit ? 0.085 : 0.05);
  shake(sw.heavy ? 0.3 : 0.17);
  A.charHit(G.char, sw.heavy, crit, G.combo);
  buzz(sw.heavy || crit ? 'heavy' : 'hit');
  sparks(e.x, e.y - e.r, dir + (Math.PI / 2) * sw.dir, 7, 0.5, P.ember2, 220);
  kit.onHit?.(e, sw, dir);
}

// quiet: for skills that parry many shots at once. The freeze, shake and PARRY text then play at most
// every quarter second, so a stream of shots can't stall the game.
export function parry(s, a0, quiet = false) {
  const p = G.p, up = G.up, loud = !quiet || Math.abs(G.time - (G.parryFxT ?? -9)) > 0.25;
  let a = a0, bd = 0.7;
  for (const e of G.E) {
    if (!alive(e)) continue;
    const ea = Math.atan2(e.y - e.r - s.y, e.x - s.x), d = Math.abs(angDiff(ea, a0));
    if (d < bd) { bd = d; a = ea; }
  }
  s.owner = 'player'; s.vx = Math.cos(a) * 300; s.vy = Math.sin(a) * 300;
  s.dmg = pd(10 * (1 + up.mirror)); s.pierce = up.mirror ? 99 : 0; s.life = 2; s.hit = new Set(); s.c = P.volt;
  s.kind = 'orb'; s.ug = true; s.kb = 200; s.bounce = 0; s.homing = up.evoMirror ? 8 : 0; s.slice = true; s.trail = true; s.accel = 0;
  if (loud) {
    G.parryFxT = G.time;
    hitstop(quiet ? 0.04 : 0.09); shake(0.25); A.parry(); buzz('parry');
    addText(s.x, s.y - 10, 'PARRY', P.volt);
    addRing(s.x, s.y, P.paper, 200, 0.2, 2);
  }
  sparks(s.x, s.y, a, quiet ? 5 : 10, 0.6, P.volt, 260);
  p.energy = Math.min(100, p.energy + (quiet ? 2 : 5));
  addCombo(1);
}

// Flash Strike: inside the window after a dash, spend it and multiply the next attack or skill
function flashStrike(p) {
  if (!G.kit.dashStrike || !(p.dashBuffT > 0)) return false;
  p.dashBuffT = 0; G.skillMult = G.kit.dashStrike;
  return true;
}
function flashFx(p) {
  const col = G.kit.color();
  addText(p.x, p.y - 26, 'FLASH STRIKE', P.paper, 1);
  addRing(p.x, p.y - 6, col, 220, 0.25, 2); addRing(p.x, p.y - 6, P.paper, 150, 0.18, 1);
  for (let i = 0; i < 16; i++) { const a = rnd(TAU), v = rnd(80, 200); part(p.x, p.y - 6, Math.cos(a) * v, Math.sin(a) * v, rnd(0.2, 0.45), Math.random() < 0.5 ? col : P.paper, { drag: 4, glow: true }); }
  flash(col, 0.08, false); shake(0.3); A.parry();
}
function startDash(mx, my, ml) {
  const p = G.p, kit = G.kit;
  rememberAction('dash');
  p.nextDash = G.t + kit.dash.time + dashGap(kit); tutNote('dash'); daily('dashes', 1);
  p.bufDash = 0;
  // breaking the Warden's chain takes dashes: those are free
  if (!G.shackle && !learning()) p.energy = Math.max(0, p.energy - DASH_COST);
  // Flash Strike: a fighter with dashStrike hits much harder with the first attack or skill right after a dash
  if (kit.dashStrike) p.dashBuffT = kit.dash.time + 0.6;
  if (p.charges === p.dashMax) p.dashCd = kit.dash.cd * G.up.dashMul * G.pf.dash;
  p.charges--;
  const a = ml ? Math.atan2(my, mx) : p.aim;
  p.dx = Math.cos(a); p.dy = Math.sin(a);
  if (p.state === 'attack') p.comboWin = 0.35;
  p.dashFrom = [p.x, p.y];
  p.state = 'dash'; p.dashT = kit.dash.time; p.ghostT = 0; p.sq = -0.24; p.sqv = 0;
  p.inv = Math.max(p.inv, kit.dash.time + 0.05); p.perfectUsed = false; p.phantomHit = new Set();
  A.dash(); dust(p.x, p.y, 6, 60); shake(0.05);
  // a burst where the dash leaves: a ring on the floor and a plume thrown back the other way
  addRing(p.x, p.y, P.stone2, 150, 0.2, 2); addRing(p.x, p.y - 7, kit.color(), 110, 0.16, 1);
  kickDust(p, -p.dx, -p.dy, 10);
  p.flo = null; p.idleT = 0;
}
// dust kicked from the feet the way (dx, dy) points
function kickDust(p, dx, dy, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.atan2(dy, dx) + rnd(-0.7, 0.7), v = rnd(30, 120);
    part(p.x + rnd(-2, 2), p.y - rnd(0, 2), Math.cos(a) * v, Math.sin(a) * v * 0.6 - rnd(0, 20), rnd(0.25, 0.5), Math.random() < 0.5 ? P.stone2 : P.stone, { drag: 5 });
  }
}
// a skid: the body squashes and dust sprays the way it was sliding
function skid(p, n) {
  p.sq = 0.17; p.sqv = 0;
  const sp = hyp(p.vx, p.vy) || 1;
  kickDust(p, p.vx / sp, p.vy / sp, n);
  A.step();
}

// ---------- Rin's katana and its scabbard ----------
// Rin keeps her katana sheathed at her hip. Swinging, charging, a power, a trick or running flat out draws it; a
// moment after she's done, she flicks it clean and slides it home with a click. The first cut out of the scabbard is
// a quick draw: a flash of light and a sure critical hit, half again as hard.
function sheathUpdate(p, dt) {
  const busy = ['attack', 'charge', 'chg', 'skill'].includes(p.state) || p.atkHeld || !!p.flo || (p.recoil || 0) > 0 ||
    (p.state === 'move' && hyp(p.vx, p.vy) > (G.kit.stats?.speed || 100) * 0.7);
  if (busy) { p.drawnT = 0; if (p.sheathed) p.sheathed = false; return; }
  p.drawnT = (p.drawnT || 0) + dt;
  if (!p.sheathed && p.drawnT > 1.3) {
    p.sheathed = true;
    const [hx, hy] = handPoint(p);
    sparks(hx, hy, -Math.PI / 2, 4, 1.4, P.gold, 50); A.click();
  }
}

// ---------- idle weapon tricks ----------
// Standing still for a few seconds, each fighter shows off: Kael spins his sword, Vega twirls her revolver, Morrow
// raises his staff and its orb flares, Rin spins her katana and flicks it clean, Rivet tosses her wrench and catches
// it, Grom heaves his hammer onto his shoulder and drops it with a thud, Unit-7 pumps its cannon, the Dev types.
// Any move cancels it. A wave cleared plays one too.
const FLOURISH = { sword: ['spin', 0.75], katana: ['flick', 0.8], revolver: ['twirl', 0.85], minigun: ['twirl', 0.85], staff: ['raise', 1.0], wrench: ['toss', 0.85], hammer: ['heft', 1.15], cannon: ['pump', 0.8] };
export function startFlourish(p) {
  const wn = heroSet()?.rig?.weapon, [kind, dur] = FLOURISH[wn] || ['type', 0.8];
  p.flo = { t: 0, kind, dur, done: {} };
  if (kind !== 'type' && kind !== 'pump') A.zip();
}
const ease = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
function flourishUpdate(p, dt) {
  const still = p.state === 'move' && hyp(p.vx, p.vy) < 14 && !p.atkHeld && !G.cine;
  p.idleT = still ? (p.idleT || 0) + dt : 0;
  // left standing long enough, the fighter dozes off
  p.stillT = still && !G.E.some(foe) ? (p.stillT || 0) + dt : 0;
  if (p.stillT > 10) emote('sleep', 0.5);
  if (!still) { p.flo = null; return; }
  if (!p.flo && p.idleT > 3.6) { startFlourish(p); p.idleT = -2.6; }
  const f = p.flo;
  if (!f) return;
  f.t += dt;
  const k = f.t / f.dur, once = (key, at) => (k >= at && !f.done[key] ? (f.done[key] = true) : false);
  const [hx, hy] = handPoint(p), a = p.wpnS ?? p.aim, wp = SPR.weapons[G.char], len = wp ? (G.evo === true && wp.evo ? wp.evo.along : wp.along) : 6;
  const tx = hx + Math.cos(a) * len, ty = hy + Math.sin(a) * len - (f.lift || 0), col = G.kit.color();
  if (f.kind === 'spin' && once('glint', 0.62)) { sparks(tx, ty, a, 6, Math.PI, col, 90); A.slice(); }
  if (f.kind === 'flick' && once('flick', 0.62)) { for (let i = 0; i < 10; i++) part(tx, ty, rnd(-50, 50), rnd(-30, 50), rnd(0.4, 0.8), Math.random() < 0.6 ? '#ffb7d5' : '#ff8fb8', { drag: 2 }); A.slice(); }
  if (f.kind === 'twirl' && once('click', 0.8)) { A.reload(); part(tx, ty, 0, -10, 0.3, P.gold, { glow: true, drag: 2 }); }
  if (f.kind === 'raise') {
    if (k > 0.25 && k < 0.8 && Math.random() < dt * 40) part(tx + rnd(-3, 3), ty + rnd(-3, 3), rnd(-20, 20), -rnd(20, 60), rnd(0.3, 0.6), Math.random() < 0.5 ? col : P.paper, { glow: true, drag: 2 });
    if (once('flare', 0.45)) { addRing(tx, ty, col, 90, 0.3, 2); A.magic(); }
  }
  if (f.kind === 'toss') { const q = Math.min(1, k / 0.82); f.lift = 22 * Math.sin(Math.PI * q); if (once('catch', 0.82)) { f.lift = 0; A.click(); sparks(hx, hy, -Math.PI / 2, 4, 1.2, P.gold, 60); p.sq = 0.1; p.sqv = 0; } }
  if (f.kind === 'heft' && once('thud', 0.82)) { kickDust(p, Math.cos(a), 0, 8); dust(tx, hy + 4, 6, 50); shake(0.12); A.wall(); p.sq = 0.14; p.sqv = 0; }
  if (f.kind === 'pump') {
    if (once('pump', 0.05)) A.reload();
    if (k > 0.3 && k < 0.8 && Math.random() < dt * 30) part(hx + rnd(-3, 3), hy - 3, rnd(-10, 10), -rnd(20, 40), rnd(0.4, 0.8), '#b9b4c8', { drag: 2 });
  }
  if (f.kind === 'type' && Math.random() < dt * 30) part(p.x + rnd(-6, 6), p.y - rnd(6, 14), rnd(-20, 20), -rnd(20, 50), rnd(0.3, 0.6), Math.random() < 0.7 ? '#39ff6a' : P.paper, { drag: 2, glow: true });
  if (f.t >= f.dur) p.flo = null;
}
// the weapon's angle during a trick, from where it would rest (a) and the way up for this facing (up)
function flourishAngle(p, a, up) {
  const f = p.flo, k = f.t / f.dur, fwd = -up;
  switch (f.kind) {
    case 'spin': return a + fwd * TAU * ease(Math.min(1, k / 0.62));
    case 'flick': return k < 0.55 ? a + fwd * 2 * TAU * ease(k / 0.55) : k < 0.7 ? a + fwd * 0.9 * ((k - 0.55) / 0.15) : a + fwd * 0.9 * (1 - (k - 0.7) / 0.3);
    case 'twirl': return k < 0.75 ? a + fwd * 3 * TAU * (1 - (1 - k / 0.75) ** 2) : a;
    case 'raise': { const w = k < 0.3 ? ease(k / 0.3) : k < 0.75 ? 1 : 1 - ease((k - 0.75) / 0.25); return lerpAngle(a, -Math.PI / 2, w); }
    case 'toss': return a + fwd * 2 * TAU * Math.min(1, k / 0.82);
    case 'heft': { const w = k < 0.35 ? ease(k / 0.35) : k < 0.7 ? 1 : 1 - ease((k - 0.7) / 0.12); return lerpAngle(a, -Math.PI / 2 + up * 0.7, w); }
    case 'pump': return a + up * 0.5 * Math.max(0, Math.sin(Math.PI * Math.min(1, k / 0.35)));
  }
  return a;
}

function castSkill(p, key) {
  const ab = G.kit[key], first = key === 'q';
  tutNote(key); daily('skills', 1);
  p[first ? 'bufQ' : 'bufE'] = 0;
  const angle = p.aim, target = ab.target?.(p), flashReady = flashStrike(p);
  const cast = withPower('spell', () => ab.use(p, target));
  G.skillMult = 1;
  p.castAim = null;
  if (cast === false) return;
  if (flashReady) flashFx(p);
  rememberAction('spell');
  setSpriteAction(p, first ? 'skill1' : 'skill2');
  if (!learning()) p.energy -= ab.cost;
  p[first ? 'cdQ' : 'cdE'] = ab.cd * G.up.cdMul;
  if (G.up.evoSpell) echo(ab, target, angle);
  if (awake()) withPower('spell', () => G.kit.awake.skill(p, key));
}
function echo(ab, target, angle) {
  for (const [t, label] of [[0.3, 'ECHO'], [0.6, 'ECHO X2']]) G.timers.push({ t, fn: () => {
    const p = G.p;
    if (p.state === 'dead' || G.cine) return;
    const currentAim = p.aim;
    p.aim = angle;
    try { withPower('spell', () => ab.use(p, target)); } finally { p.aim = currentAim; }
    addText(p.x, p.y - 24, label, P.gold); addRing(p.x, p.y - 6, P.gold, 200, 0.25, 2); ghost(p, P.gold);
  } });
}

// a friendly lightning strike from the sky
function skyStrike(x, y, R, dmg) {
  G.strikes.push({ x, y, t: 0, delay: 0.15, R, dmg, friendly: true, kind: 'lightning', c: P.volt });
}
// homing golden spirits that explode
function spirits(x, y, n) {
  for (let i = 0; i < n; i++) shoot({
    x, y, a: rnd(TAU), sp: rnd(120, 180), dmg: pd(6), power: 'weapon', basic: false, ug: false,
    kb: 60, life: 1.8, kind: 'spirit', r: 3, c: P.gold, homing: 8, splash: { R: 18, dmg: pd(4) },
  });
}

// orbiting blades upgrade
function updateOrbit(p, dt) {
  const n = G.up.orbit * (G.up.evoOrbit ? 2 : 1);
  if (!n) return;
  p.orbitA += dt * (G.up.evoOrbit ? 5.5 : 4);
  const R = G.up.evoOrbit ? 28 + Math.sin(G.time * 3) * 10 : 22;
  if (G.up.evoOrbit) {
    p.bladeT = (p.bladeT ?? 3) - dt;
    if (p.bladeGone > 0) { p.bladeGone -= dt; return; }
    if (p.bladeT <= 0 && G.E.some(foe)) {
      p.bladeT = 3; p.bladeGone = 0.9;
      for (let i = 0; i < n; i++) { const a = p.orbitA + (i * TAU) / n; shoot({ x: p.x + Math.cos(a) * R, y: p.y - 6 + Math.sin(a) * R * 0.8, a, sp: 280, dmg: pd(10), kb: 140, life: 0.8, kind: 'shuriken', pierce: 99, c: P.gold, ug: false, slice: true }); }
      addRing(p.x, p.y - 6, P.gold, 240, 0.25, 2); A.shuriken(); shake(0.2);
      return;
    }
  }
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
// front: only the blades passing in front of the fighter (lower on the screen), otherwise only those behind
export function drawOrbit(p, front = true) {
  if (p.bladeGone > 0) return;
  const n = G.up.orbit * (G.up.evoOrbit ? 2 : 1);
  const R = G.up.evoOrbit ? 28 + Math.sin(G.time * 3) * 10 : 22;
  for (let i = 0; i < n; i++) {
    const a = p.orbitA + (i * TAU) / n, bx = p.x + Math.cos(a) * R, by = p.y - 6 + Math.sin(a) * R * 0.8;
    if ((Math.sin(a) >= 0) !== front) continue;
    const tx = Math.cos(a + Math.PI / 2) * 4, ty = Math.sin(a + Math.PI / 2) * 4;
    line(bx - tx, by - ty, bx + tx, by + ty, G.up.evoOrbit ? P.gold : P.bone);
    glow(bx, by, G.up.evoOrbit ? P.gold : P.volt, 5, 0.5);
  }
}

// ---------- regular enemies ----------
const HOME = { bellwraith: 'hover', glasswing: 'hover', lootling: 'flee', husk: 'chase', wisp: 'drift', tick: 'run', brute: 'chase', larva: 'chase', slime: 'hop', slimelet: 'hop', spitter: 'root', shade: 'stalk', archer: 'keep', priest: 'tend' };
// the lootling runs away, weaving, and digs out after 11 seconds
function updateLootling(e, dt, d, ang) {
  e.life -= dt;
  if (e.life <= 0) {
    e.dead = true;
    dust(e.x, e.y, 16, 70); addRing(e.x, e.y - 4, P.gold, 120, 0.3, 2);
    addText(e.x, e.y - 14, 'IT GOT AWAY', P.dust); A.splat();
    return;
  }
  const away = ang + Math.PI + Math.sin(e.anim * 3 + e.orbit) * 0.8;
  let ax = Math.cos(away), ay = Math.sin(away);
  const mx = (B.x0 + B.x1) / 2 - e.x, my = (B.y0 + B.y1) / 2 - e.y, ml = hyp(mx, my) || 1;
  const edge = Math.min(e.x - B.x0, B.x1 - e.x, e.y - B.y0, B.y1 - e.y);
  if (edge < 34) { const w = ((34 - edge) / 34) * 1.8; ax += (mx / ml) * w; ay += (my / ml) * w; }
  const l = hyp(ax, ay) || 1, sp = e.speed * (d < 70 ? 1.3 : 0.75);
  e.vx = (ax / l) * sp; e.vy = (ay / l) * sp; e.face = e.vx < 0 ? -1 : 1;
  if (Math.random() < dt * 10) part(e.x + rnd(-3, 3), e.y - rnd(4, 12), 0, -rnd(10, 30), 0.4, P.gold, { glow: true, drag: 1 });
  if (e.life < 3 && Math.random() < dt * 14) dust(e.x, e.y, 1, 30);
}

function updateEnemy(e, dt) {
  const p = G.p, dx = p.x - e.x, dy = p.y - e.y, d = hyp(dx, dy), ang = Math.atan2(dy, dx);
  e.vx = 0; e.vy = 0;
  const toward = (sp) => { e.vx = Math.cos(ang) * sp; e.vy = Math.sin(ang) * sp; };
  if (e.state === 'spawn') {
    e.t -= dt;
    if (e.t <= 0) { e.state = e.type==='boss'?'intro':e.type==='egg'?'incubate':HOME[e.type]; e.t = e.type === 'boss' ? 1.4 : e.type === 'egg' ? rnd(3, 4) : 0; }
    return;
  }
  if (e.type === 'boss') {
    // bosses act 25% faster, and 50% faster once they enrage after 60 seconds
    e.fightT = (e.fightT || 0) + dt;
    if (!e.enraged && e.fightT > 60 && e.state !== 'intro') {
      e.enraged = true; e.speed *= 1.2;
      G.banner = { text: 'ENRAGED', sub: 'FINISH IT FAST', t: 0, life: 1.4, c: P.blood };
      A.bossRoar(); shake(0.6); addRing(e.x, e.y - 16, P.blood, 300, 0.5, 3);
    }
    if (deepBossTurn(e, dt)) return;
    BOSSES[e.boss].update(e, dt * (e.enraged ? 1.5 : 1.25), d, ang, dx);
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
  if (e.type === 'lootling') { updateLootling(e, dt, d, ang); return; }
  if (p.invis > 0) {
    // lost the player: wander toward a random spot
    if (hyp(e.wx - e.x, e.wy - e.y) < 8 || Math.random() < dt * 0.5) { e.wx = rnd(B.x0 + 20, B.x1 - 20); e.wy = rnd(B.y0 + 20, B.y1 - 20); }
    const wa = Math.atan2(e.wy - e.y, e.wx - e.x);
    e.vx = Math.cos(wa) * e.speed * 0.5; e.vy = Math.sin(wa) * e.speed * 0.5;
    if (e.state === 'windup' || e.state === 'lunge' || e.state === 'aim' || e.state === 'fuse' || e.state === 'strike' || e.state === 'vanish') e.state = HOME[e.type];
    e.z = 0; e.hopT = 0;
    return;
  }
  if (e.type === 'bellwraith' || e.type === 'glasswing') {
    const bell = e.type === 'bellwraith';
    e.z = (bell ? 3 : 8) + Math.sin(e.anim * (bell ? 4 : 8)) * 2;
    if (e.state === 'hover') {
      const range = bell ? 68 : 83, a = ang + (d > range ? 0 : d < range - 20 ? Math.PI : e.orbit * Math.PI / 2);
      e.vx = Math.cos(a) * e.speed; e.vy = Math.sin(a) * e.speed; e.face = dx < 0 ? -1 : 1;
      if ((e.cd -= dt) <= 0 && d < 150) {
        e.state = 'chimeW'; e.t = bell ? 0.95 : 0.7; e.lock = ang;
        if (bell) A.click(); else A.warn();
      }
    } else if (e.state === 'chimeW' && (e.t -= dt) <= 0) {
      if (bell) {
        for (const wait of [0, 0.48]) G.quakes.push({x:e.x,y:e.y,r:3,speed:79,max:94,delay:wait,hitP:false,friendly:false,dmg:3, c:e.def.col});
        A.boom(0.5);
      } else {
        for (const side of [-1,0,1]) fire(e.x,e.y-e.r,e.lock+side*0.25,146,{c:e.def.col,dmg:2,bounce:1,r:3,life:2.4});
        e.kx = -Math.cos(e.lock)*140; e.ky = -Math.sin(e.lock)*140; A.riftCut();
      }
      e.state='hover'; e.cd = bell ? 3.8 : 2.7;
    }
    return;
  }
  if (e.type === 'larva') {
    const wob = Math.sin(e.anim * 10) * 0.6;
    e.vx = Math.cos(ang + wob) * e.speed; e.vy = Math.sin(ang + wob) * e.speed; e.face = dx < 0 ? -1 : 1;
    if (d < e.r + p.r + 2) { e.dead = true; tryHurt(1, e.x, e.y); splat(e.x, e.y, 5, e.def.col, e.def.colD); A.splat(); }
    return;
  }
  if (e.type === 'slime' || e.type === 'slimelet') {
    // hops at you; it only hurts when it lands on you
    const small = e.type === 'slimelet';
    e.face = dx < 0 ? -1 : 1;
    if (e.hopT > 0) {
      e.hopT -= dt;
      const k = 1 - e.hopT / e.hopDur;
      e.vx = Math.cos(e.lock) * e.speed * 3; e.vy = Math.sin(e.lock) * e.speed * 3;
      e.z = Math.sin(k * Math.PI) * (small ? 6 : 11);
      if (e.hopT <= 0) {
        e.z = 0; dust(e.x, e.y, small ? 2 : 5, 40);
        if (d < e.r + p.r + 4) tryHurt(1, e.x, e.y);
        e.cd = small ? rnd(0.2, 0.45) : rnd(0.55, 1);
      }
    } else {
      e.cd -= dt;
      if (e.cd <= 0) { e.hopDur = e.hopT = small ? 0.3 : 0.42; e.lock = ang + rnd(-0.35, 0.35); }
    }
    return;
  }
  if (e.type === 'archer') {
    // a goblin archer: keeps its distance, then draws and aims. The aim line shows where the arrow will fly;
    // it follows you while the bow is drawn, then locks in place for the last moment before the shot.
    e.face = dx < 0 ? -1 : 1;
    if (e.state === 'keep') {
      const radial = d > 170 ? 1 : d < 120 ? -1 : 0;
      e.vx = (Math.cos(ang) * radial + Math.cos(ang + Math.PI / 2) * e.orbit * 0.5) * e.speed;
      e.vy = (Math.sin(ang) * radial + Math.sin(ang + Math.PI / 2) * e.orbit * 0.5) * e.speed;
      if (Math.random() < dt * 0.3) e.orbit *= -1;
      e.cd -= dt;
      if (e.cd <= 0 && d < 260) { e.state = 'aim'; e.t = 1; e.lock = Math.atan2(p.y - 6 - (e.y - 8), p.x - e.x); A.ui(); }
    } else if (e.state === 'aim') {
      e.t -= dt;
      if (e.t > 0.3) e.lock = Math.atan2(p.y - 6 - (e.y - 8), p.x - e.x);
      if (e.t <= 0) {
        const n = e.elite || G.wave >= 16 ? 3 : 1;
        for (let i = 0; i < n; i++) fire(e.x + e.face * 4, e.y - 8, e.lock + (i - (n - 1) / 2) * 0.14, 250, { arrow: true, r: 2, c: '#c8a070' });
        A.toss(); A.shoot();
        e.state = 'keep'; e.cd = rnd(1.8, 2.6);
      }
    }
    return;
  }
  if (e.type === 'priest') {
    // an ash priest: hangs back near the most wounded monster, then chants and heals everything in its circle.
    // Hitting it mid-chant breaks the spell.
    e.face = dx < 0 ? -1 : 1;
    const hurt = G.E.filter((o) => o !== e && foe(o) && o.hp < o.maxHp && hyp(o.x - e.x, o.y - e.y) < 220).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (e.state === 'tend') {
      // drift toward the wounded, but stay away from the fighter
      let vx = 0, vy = 0;
      if (hurt) { const hd = hyp(hurt.x - e.x, hurt.y - e.y); if (hd > 40) { vx += (hurt.x - e.x) / hd; vy += (hurt.y - e.y) / hd; } }
      if (d < 110) { vx -= Math.cos(ang) * 1.4; vy -= Math.sin(ang) * 1.4; }
      const m = hyp(vx, vy) || 1; e.vx = (vx / m) * e.speed * (vx || vy ? 1 : 0); e.vy = (vy / m) * e.speed * (vx || vy ? 1 : 0);
      e.cd -= dt;
      if (e.cd <= 0 && hurt && hyp(hurt.x - e.x, hurt.y - e.y) < PRIEST_R) {
        // the patients are chosen when the chant starts: every wounded monster in the circle
        e.state = 'chant'; e.t = 0.9; A.sigil();
        e.heal = G.E.filter((o) => o !== e && foe(o) && o.hp < o.maxHp && hyp(o.x - e.x, o.y - e.y) < PRIEST_R + o.r);
      }
    } else if (e.state === 'chant') {
      e.t -= dt;
      if (Math.random() < dt * 30) { const a = rnd(TAU); part(e.x + Math.cos(a) * PRIEST_R, e.y + Math.sin(a) * PRIEST_R * 0.6, 0, -rnd(10, 30), 0.5, DEF.priest.col, { glow: true, drag: 1 }); }
      if (e.t <= 0) {
        let healed = 0;
        for (const o of e.heal || []) if (alive(o) && o.hp < o.maxHp && hyp(o.x - e.x, o.y - e.y) < PRIEST_R * 2) {
          const amt = Math.max(1, Math.round(o.maxHp * (o.type === 'boss' ? 0.03 : 0.3)));
          o.hp = Math.min(o.maxHp, o.hp + amt); healed++;
          addText(o.x, o.y - o.r * 2 - 8, '+' + amt, DEF.priest.col);
          G.bolts.push({ x0: e.x, y0: e.y - 12, x1: o.x, y1: o.y - o.r, t: 0, life: 0.3, c1: '#e8ffe8', c2: DEF.priest.col, c3: DEF.priest.colD });
          for (let i = 0; i < 6; i++) part(o.x + rnd(-4, 4), o.y - rnd(0, 10), 0, -rnd(20, 40), 0.6, DEF.priest.col, { glow: true, drag: 1 });
        }
        if (healed) { addRing(e.x, e.y - 4, DEF.priest.col, 220, 0.3, 2); A.heal(); }
        e.heal = null; e.state = 'tend'; e.cd = rnd(2.8, 3.6);
      }
    }
    return;
  }
  if (e.type === 'spitter') {
    // a rooted plant that keeps its distance and lobs acid where you stand
    e.face = dx < 0 ? -1 : 1;
    if (e.state === 'root') {
      const radial = d > 160 ? 1 : d < 100 ? -1 : 0;
      e.vx = Math.cos(ang) * radial * e.speed; e.vy = Math.sin(ang) * radial * e.speed;
      e.cd -= dt;
      if (e.cd <= 0 && d < 240) { e.state = 'windup'; e.t = 0.6; e.tele = true; }
    } else if (e.state === 'windup') {
      e.t -= dt;
      if (e.t <= 0) {
        e.tele = false;
        const n = e.elite || G.wave >= 14 ? 3 : 1;
        for (let i = 0; i < n; i++) {
          const ox = i ? rnd(-30, 30) : 0, oy = i ? rnd(-22, 22) : 0;
          G.strikes.push({ x: clamp(p.x + p.vx * 0.35 + ox, B.x0 + 8, B.x1 - 8), y: clamp(p.y + p.vy * 0.35 + oy, B.y0 + 8, B.y1 - 4), x0: e.x, y0: e.y - 10, t: 0, delay: 0.85, R: 12, dmg: 1, friendly: false, kind: 'acid', c: P.ichor });
        }
        A.splat(); A.shoot();
        e.state = 'root'; e.cd = rnd(2.6, 3.6);
      }
    }
    return;
  }
  if (e.type === 'shade') {
    // drifts at a distance, fades out, then reappears behind you and slashes
    if (e.state === 'stalk') {
      e.face = dx < 0 ? -1 : 1;
      const radial = d > 90 ? 1 : d < 60 ? -1 : 0;
      e.vx = (Math.cos(ang) * radial + Math.cos(ang + Math.PI / 2) * e.orbit) * e.speed;
      e.vy = (Math.sin(ang) * radial + Math.sin(ang + Math.PI / 2) * e.orbit) * e.speed;
      e.cd -= dt;
      if (e.cd <= 0) { e.state = 'vanish'; e.t = 0.3; A.zip(); }
    } else if (e.state === 'vanish') {
      e.t -= dt;
      if (e.t <= 0) {
        const back = (Math.cos(p.aim) < 0 ? 0 : Math.PI) + rnd(-0.5, 0.5);
        e.x = clamp(p.x + Math.cos(back) * 22, B.x0 + 8, B.x1 - 8); e.y = clamp(p.y + Math.sin(back) * 16, B.y0 + 8, B.y1 - 4);
        e.state = 'strike'; e.t = 0.45; e.tele = true;
        for (let i = 0; i < 10; i++) { const a = rnd(TAU); part(e.x, e.y - 6, Math.cos(a) * 60, Math.sin(a) * 60, 0.3, e.def.col, { drag: 5, glow: true }); }
      }
    } else if (e.state === 'strike') {
      e.t -= dt; e.face = dx < 0 ? -1 : 1;
      if (e.t > 0.12) e.lock = ang;
      if (e.t <= 0) {
        e.tele = false;
        G.slashes.push({ follow: false, x: e.x, y: e.y, a: e.lock, r: 24, arc: 2.4, dir: 1, t: 0, life: 0.16, th: 6, col: 'hex' });
        if (d < 26 && Math.abs(angDiff(ang, e.lock)) < 1.4) tryHurt(1, e.x, e.y);
        A.slice();
        e.state = 'recover'; e.t = 0.7;
      }
    } else if (e.state === 'recover') {
      e.t -= dt;
      if (e.t <= 0) { e.state = 'stalk'; e.cd = rnd(2, 3); e.orbit = Math.random() < 0.5 ? 1 : -1; }
    }
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
      // pawing the ground: grit kicked back, steam, the embers in it flaring
      if (Math.random() < dt * 14) part(e.x - Math.cos(e.lock) * 6, e.y, -Math.cos(e.lock) * rnd(30, 70), rnd(-10, 10), rnd(0.3, 0.5), P.stone2, { z: 1, vz: rnd(20, 60), g: 300, drag: 2 });
      if (Math.random() < dt * 10) part(e.x + rnd(-6, 6), e.y - 18, rnd(-8, 8), -rnd(15, 35), rnd(0.4, 0.7), '#c8c0d0', { drag: 1 });
      if (e.t <= 0) {
        e.state = 'charge'; e.t = 0.9; e.hitP = false; e.trailT = 0; A.dash(); A.heavySwing(); shake(0.25);
        addRing(e.x, e.y, '#ff7a2a', 160, 0.25, 2); kickDust(e, -Math.cos(e.lock), -Math.sin(e.lock), 12);
      }
    } else if (e.state === 'charge') {
      const cx = Math.cos(e.lock), cy = Math.sin(e.lock);
      e.vx = cx * 255; e.vy = cy * 255; e.t -= dt;
      // the charge: afterimages burning behind it, fire streaming off its back, a scorched track, grit thrown up
      if ((e.trailT -= dt) <= 0) {
        e.trailT = 0.05;
        G.ghosts.push({ x: e.x, y: e.y, flip: e.face < 0, t: 0, life: 0.22, c: '#ff7a2a', spr: sprFor(e) });
        scorch(e.x - cx * 4, e.y, 2.5);
      }
      for (let i = 0; i < 2; i++) part(e.x - cx * 8 + rnd(-3, 3), e.y - 12 + rnd(-5, 5), -cx * rnd(60, 120) + rnd(-15, 15), -cy * rnd(60, 120) - rnd(10, 30), rnd(0.2, 0.4), Math.random() < 0.5 ? '#ff7a2a' : '#ffd447', { glow: true, drag: 3 });
      if (Math.random() < 0.7) dust(e.x, e.y, 1, 40);
      if (!e.hitP && d < e.r + p.r + 2) { if (tryHurt(e.elite ? 4 : 3, e.x, e.y) === true) { e.hitP = true; shake(0.4); } }
      // into a wall, or one of the floor's obstacles: it slams in and stands there dazed
      if (atWall(e, cx, cy) || inObstacle(e.x + cx * (e.r + 3), e.y + cy * (e.r + 3), 1)) {
        e.state = 'stun'; e.t = 1.7; e.vx = e.vy = 0;
        shake(0.7); A.wall(); A.boom(0.8); dust(e.x, e.y, 22, 110); hitstop(0.06); scorch(e.x + cx * 8, e.y, 7);
        addRing(e.x + cx * 8, e.y - 6, P.paper, 200, 0.25, 2);
        for (let i = 0; i < 12; i++) { const a = e.lock + Math.PI + rnd(-1, 1), v = rnd(60, 160); part(e.x + cx * 8, e.y - 8, Math.cos(a) * v, Math.sin(a) * v, rnd(0.3, 0.6), i % 2 ? P.stone2 : '#ff9a3c', { drag: 3 }); }
        addText(e.x, e.y - 30, 'STUNNED', P.gold);
      } else if (e.t <= 0) { e.state = 'recover'; e.t = 0.7; kickDust(e, cx, cy, 10); }
    } else if (e.state === 'stun' || e.state === 'recover') {
      e.t -= dt;
      if (e.t <= 0) { e.state = 'chase'; e.cd = rnd(1.4, 2.4); }
    }
  }
}
export const atWall = (e, cx, cy) => (cx < 0 && e.x <= B.x0 + e.r + 1) || (cx > 0 && e.x >= B.x1 - e.r - 1) || (cy < 0 && e.y <= B.y0 + e.r + 1) || (cy > 0 && e.y >= B.y1 - 3);

// ---------- bosses: shared death sequence ----------
function bossDeath(e) {
  if (e.dead || e.dying || e.state === 'awakening' || awakenNox(e)) return;
  G.bosses++; if (!G.tested) codexNote('bosses', e.boss);
  daily('bosses', 1);
  e.dying = 2.2; e.state = 'dying'; e.t = 0; e.vx = e.vy = 0; e.z = 0; e.under = false; e.shieldUp = false; e.armor = 0;
  if (e.boss === 'nox') A.rift(); else A.bossRoar();
  const bd = BOSSES[e.boss];
  G.banner = { text: bd.death || (bd.final ? 'THE KING FALLS' : bd.short + ' SLAIN'), sub: '', t: 0, life: 2.6, c: P.gold };
  if (G.night) {
    // in the endless night a boss falls and the night goes on: only the beams it was firing go with it
    for (let i = G.hbeams.length - 1; i >= 0; i--) if (G.hbeams[i].owner === e) G.hbeams.splice(i, 1);
    return;
  }
  A.stopLoops();
  if (!bd.final && !bd.end) say(bossDeadLines(e.boss, G.char));
  G.queue.length = 0; G.sigils.length = 0; G.hbeams.length = 0; G.hlines.length = 0; G.dark = 0;
  for (const s of G.strikes) if (!s.friendly) s.dead = true;
  for (const o of G.E) if (o !== e && alive(o)) damage(o, 9999, { dir: Math.atan2(o.y - e.y, o.x - e.x), kb: 200, src: 'boom' });
  for (const s of G.shots) if (s.owner === 'enemy') s.dead = true;
}
function bossDying(e, dt) {
  if (e.boss === 'nox') { if (noxDust(e, dt)) bossFinal(e); return; }
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
  e.dead = true; G.kills++;
  // with two bosses out in the night, the other one becomes the one the music and the camera follow
  if (G.boss === e) G.boss = G.E.find((o) => o !== e && o.type === 'boss' && alive(o)) || null;
  if (!bd.end) {
    makeGibs(e, rnd(TAU));
    bleed(e.x, e.y, rnd(TAU), 60, e.def.col, e.def.colD, 1.6);
    splat(e.x, e.y, 26, e.def.col, e.def.colD);
  }
  addRing(e.x, e.y - 16, P.paper, 420, 0.5, 3);
  addRing(e.x, e.y - 16, e.def.col, 300, 0.6, 2);
  for (let i = 0; i < (G.night ? 12 : 24); i++) dropPick(e.x, e.y, 'energy');
  for (let i = 0; i < (G.night ? 1 : 3); i++) dropPick(e.x, e.y, 'heal');
  G.score += Math.round(e.def.score * (G.wave / 5) * RANKS[G.rank].m * G.D.score);
  if (!bd.end) { flash(P.paper, 0.4, true); shake(1); hitstop(0.15); A.ultRelease(); }
  buzz('boss');
  if (G.bossClean) unlock('TANK');
  if (bd.final) unlock('ROBOT');
  if (bd.final && !G.won) { G.won = true; G.victory = true; G.sunrise = { x: e.x, y: e.y - 22, t: 0 }; A.victory(); say(TALK.kingDead); }
  // Nox's shape breaks: the story of the endless night plays before it begins (main.js)
  if (bd.end && !G.night) { G.nightFall = true; G.nox = true; say(TALK.noxDead); A.victory(); }
}

// ---------- main update ----------
const maxAlive = () => Math.min(Math.round((4 + G.wave) * G.D.count), 16 + Math.floor(endless() / 2), 26) + (G.twist === 'SWARM' ? 6 : 0);
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
  if (G.cineTail) { const c = G.cineTail; c.t += rdt; if (c.k) { c.k.prev = c.k.t; c.k.t += rdt; } if (c.t >= c.life) G.cineTail = null; }
  if (G.sunrise) G.sunrise.t += rdt;
  if (G.unlocks.length && !G.talk?.lore && (G.unlocks[0].t += rdt) > 2.48) G.unlocks.shift();
  updateTalk(rdt);
  G.rankPop = Math.max(0, G.rankPop - rdt * 4);
  fx.hurtVig = Math.max(0, fx.hurtVig - rdt * 1.5);
  G.descend = Math.max(0, G.descend - rdt / 1.1);
  for (const k in G.deny) G.deny[k] = Math.max(0, G.deny[k] - rdt);
  if (G.banner) { G.banner.t += rdt; if (G.banner.t > G.banner.life) G.banner = null; }
  if (G.mkShow) { G.mkShow.t += rdt; if (G.mkShow.t > 1.5) G.mkShow = null; }
  if (G.dead) { G.deadT += rdt; updateDeath(rdt); }
  updateAmbient(rdt);

  if (G.cine) {
    G.pfx = !G.cine.boss; G.cine.update(rdt); G.pfx = false;
    // a boss entrance runs its effects in slow motion; a hero's entrance at full speed
    updateFx(rdt * (G.cine?.fxSpeed ?? 0.5));
    updateCam(rdt);
    return;
  }
  if (dt <= 0) return;
  G.t += dt;

  if (G.phase === 'intro') {
    G.phaseT -= dt;
    if (G.phaseT <= 0) { G.phase = 'fight'; if (G.tutWant) { G.tutWant = false; startTutorial(); } }
  } else if (G.phase === 'fight') {
    G.spawnCd -= dt;
    const count = G.E.filter((e) => !e.dead && !e.prop).length + G.sigils.length;
    if (G.queue.length && G.spawnCd <= 0 && count < maxAlive()) {
      const type = G.queue.shift();
      const [x, y] = placeSpawn(type);
      G.sigils.push({ x, y, type, t: 0, life: type === 'boss' ? ARRIVE_LIFE : 0.8 });
      G.spawnCd = 0.3;
      A.sigil();
    }
    if (!G.tut && !G.queue.length && !G.sigils.length && !G.E.some((e) => !e.dead && !e.prop) && !G.dead) {
      G.phase = 'clear'; G.phaseT = 1.6;
      A.waveClear(); A.scene('calm'); A.stopLoops();
      // the fighter shows off with a weapon trick (if standing still)
      if (G.p.state === 'move') startFlourish(G.p);
      emote(isBossWave(G.wave) ? 'star' : 'note', 2);
      G.banner = G.victory || G.nightFall ? null : { text: 'WAVE CLEAR', sub: '', t: 0, life: 1.6, c: P.ember3 };
      if (G.twist) {
        const tw = TWISTS[G.twist], bonus = Math.round(1000 * (1 + G.wave / 10) * G.D.score);
        G.score += bonus; G.p.energy = 100; healPlayer(1);
        G.banner = { text: tw.name + ' SURVIVED', sub: '+' + bonus + '   FULL ENERGY   +1 HEART', t: 0, life: 2, c: tw.c };
        G.dark = 0;
      }
    }
  } else if (G.phase === 'clear') {
    G.phaseT -= dt;
    // (a conversation finishes first: the upgrade screen would cover it; never more than a few seconds)
    if (G.phaseT <= 0 && (G.picks.length === 0 || G.phaseT < -1.2) && !G.victory && !G.nightFall && (!G.talk || G.phaseT < -8)) G.wantUpgrade = true;
  } else if (G.phase === 'night') updateNight(dt);

  checkEvo();
  if (G.arrivalFades) { for (const a of G.arrivalFades) { a.t += dt; a.f += dt; } G.arrivalFades = G.arrivalFades.filter((a) => a.f < a.fl); }
  for (const s of G.sigils) {
    s.t += dt;
    if (s.type === 'boss') { s.boss ||= bossFor(G.wave); bossArrivalUpdate(s, dt); }
    const col = s.type === 'boss' ? BOSSES[s.boss || bossFor(G.wave)].col : DEF[s.type].col;
    if (s.t > 0 && Math.random() < dt * 30) { const a = rnd(TAU); part(s.x + Math.cos(a) * 10, s.y + Math.sin(a) * 6, 0, -rnd(10, 30), 0.4, col, { drag: 1, glow: true }); }
    if (s.t >= s.life) {
      s.enemy = spawnEnemy(s.type, s.x, s.y, s.boss);
      if (s.tutOnly) { s.enemy.tutOnly = s.tutOnly; if (s.tutOnly !== 'any') s.enemy.speed *= 0.6; }
      if (s.type === 'boss') (G.arrivalFades ||= []).push({ boss: s.boss, x: s.x, y: s.y, t: s.t, life: s.life, f: 0, fl: ARRIVE_FADE[s.boss] || 1.2 });
      // the Colossus comes down where its shadow was
      if (s.boss === 'colossus') { A.boom(2.2); A.wall(); shake(1.2); kick(Math.PI / 2, 6); dust(s.x, s.y, 60, 200); scorch(s.x, s.y, 26); addRing(s.x, s.y, P.paper, 380, 0.4, 3); }
      addRing(s.x, s.y - 4, col, 140, 0.2, 2);
      dust(s.x, s.y, 8, 50);
      A.spawn();
    }
  }
  sweep(G.sigils, (s) => s.t < s.life);

  G.pfx = true; updatePlayer(dt); G.pfx = false;
  if (G.void) followVoid(dt);
  // the bosses' own tricks (a chain, webs, a decree, a stopwatch...) act on the fighter after they've moved
  updateTricks(dt);
  const p = G.p;

  G.pfx = true; for (const a of G.allies) { a.t += dt; withPower(a.power,()=>ALLY[a.type].update(a, dt)); } G.pfx = false;
  sweep(G.allies, (a) => a.t < a.life && !a.dead);

  for (const e of G.E) {
    if (e.dead || e.prop) continue;
    e.flash -= dt; e.shakeT -= dt; e.anim += dt; if (e.tagT > 0) e.tagT -= dt; if (e.sq > 0) e.sq = Math.max(0, e.sq - dt * 4.5);
    if (e.dying) { bossDying(e, dt); continue; }
    if (e.burn > 0) {
      e.burn -= dt; e.burnTick -= dt;
      if (Math.random() < dt * 20) part(e.x + rnd(-4, 4), e.y - rnd(2, 10), 0, -rnd(15, 40), 0.35, Math.random() < 0.5 ? P.ember : P.ember2, { drag: 1, glow: true });
      if (e.burnTick <= 0) { e.burnTick = 0.4; damage(e, e.burnDps * 0.4, { src: 'burn', dir: 0, kb: 0 }); }
      if (e.dead || e.dying) continue;
    }
    if (e.marked > 0) { e.marked -= dt; continue; }
    if (e.affix === 'REGEN' && (e.calm = (e.calm || 0) + dt) > 1.2 && e.hp < e.maxHp) { e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.06 * dt); if (Math.random() < dt * 8) part(e.x + rnd(-4, 4), e.y - rnd(2, 12), 0, -20, 0.4, AFFIX.REGEN.c, { glow: true, drag: 1 }); }
    const fromX = e.x, fromY = e.y;
    updateEnemy(e, e.affix === 'FRENZIED' ? dt * 1.3 : dt);
    if (e.dead || e.dying) continue;
    const kd = Math.exp(-G.map.slide * dt);
    e.x += (e.vx + e.kx) * dt; e.y += (e.vy + e.ky) * dt;
    const fast = Math.abs(e.kx) + Math.abs(e.ky) > 170;
    let hitWall = false;
    if (e.x < B.x0 + e.r) { e.x = B.x0 + e.r; hitWall = e.kx < -100; e.kx = -e.kx * 0.3; }
    if (e.x > B.x1 - e.r) { e.x = B.x1 - e.r; hitWall = hitWall || e.kx > 100; e.kx = -e.kx * 0.3; }
    if (e.y < B.y0 + e.r) { e.y = B.y0 + e.r; hitWall = hitWall || e.ky < -100; e.ky = -e.ky * 0.3; }
    if (e.y > B.y1 - 2) { e.y = B.y1 - 2; hitWall = hitWall || e.ky > 100; e.ky = -e.ky * 0.3; }
    if ((G.obst.length || G.props.length) && !e.under && (e.z || 0) < 5 && !FLY.has(e.boss || e.type)) {
      const knocked = Math.abs(e.kx) + Math.abs(e.ky) > 170;
      if (pushOut(e, e.r, (e.slide ||= rnd() < 0.5 ? 0.6 : -0.6)) && knocked) { hitWall = true; e.kx *= -0.3; e.ky *= -0.3; }
    }
    advanceMonsterMotion(e, dt, fromX, fromY);
    if (e.boss) BOSSES[e.boss].afterMove?.(e);
    e.kx *= kd; e.ky *= kd;
    if (hitWall && fast && e.type !== 'boss') {
      dust(e.x, e.y, 10, 70); A.wall(); shake(0.2);
      damage(e, 3, { src: 'wall', dir: 0, kb: 0 });
    }
  }
  const live = G.E.filter((e) => !e.dead && !e.prop && e.state !== 'spawn' && !e.under);
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

  fadeStains(dt);
  for (const tm of G.timers) { tm.t -= dt; if (tm.t <= 0) { G.pfx = !!tm.pfx; withPower(tm.power,tm.fn); G.pfx = false; } }
  sweep(G.timers, (tm) => tm.t > 0);
  for (const c of G.cuts) {
    c.t += dt;
    G.pfx = !!c.pfx;
    if (!c.done && c.t >= c.pend) { c.done = true; withPower(c.power,()=>c.fire(c, false)); }
    if (c.echo === 1 && c.t >= c.pend + 0.2) { c.echo = 2; withPower(c.power,()=>c.fire(c, true)); }
    G.pfx = false;
  }
  sweep(G.cuts, (c) => c.t < c.pend + 0.5);
  for (const b of G.booms) { b.t -= dt; if (b.t <= 0) { G.pfx = !!b.pfx; withPower(b.power,()=>explode(b.x, b.y, b.friendly, b.R ?? 36, b.dmg ?? 14)); G.pfx = false; } }
  sweep(G.booms, (b) => b.t > 0);

  // low health: a heartbeat that quickens on the last heart
  if (p.hp > 0 && p.hp <= 2 && p.state !== 'dead') { G.hbT = (G.hbT ?? 0) - dt; if (G.hbT <= 0) { G.hbT = p.hp === 1 ? 0.62 : 0.9; A.heartbeat(); } }
  G.mkT -= dt;
  if (G.mkT <= 0 && G.mk) {
    // the multi-kill window closed: pay out
    if (G.mk >= 2 && G.mkShow) {
      const bonus = Math.round(G.mk * G.mk * 40 * RANKS[G.rank].m * G.D.score * twistScore());
      G.score += bonus; G.mkShow.bonus = bonus; G.mkShow.t = Math.min(G.mkShow.t, 0.5);
    }
    G.mk = 0;
  }
  updateCorpses(dt);
  G.pickChainT -= dt;
  if (G.pickChainT <= 0) G.pickChain = 0;
  updateProps(dt);
  for (const k of G.picks) {
    k.t += dt;
    k.vz -= 260 * dt; k.z += k.vz * dt;
    if (k.z < 0) { k.z = 0; k.vz = -k.vz * 0.35; }
    const d = hyp(p.x - k.x, p.y - 6 - k.y);
    // coins always come to you (gold is too rare to leave lying in a corner)
    if (k.t > 0.35 && p.state !== 'dead' && (d < 70 * (1 + G.up.magnet * 1.5) || G.phase === 'clear' || (k.kind === 'gold' && k.t > 0.8))) {
      const sp = Math.min(420, 120 + k.t * 300), a = Math.atan2(p.y - 6 - k.y, p.x - k.x);
      k.vx += (Math.cos(a) * sp - k.vx) * Math.min(1, 10 * dt); k.vy += (Math.sin(a) * sp - k.vy) * Math.min(1, 10 * dt);
    } else { k.vx *= Math.exp(-4 * dt); k.vy *= Math.exp(-4 * dt); }
    k.x += k.vx * dt; k.y += k.vy * dt;
    if (d < 8 && k.t > 0.35 && p.state !== 'dead') {
      k.got = true;
      if (k.kind === 'heal') healPlayer(k.n || 1);
      else if (k.kind === 'gold') addGold(k.n || 1, p.x, p.y - 26);
      else { p.energy = Math.min(100, p.energy + 2.5 * (k.n || 1)); G.pickChain += k.n || 1; G.pickChainT = 0.45; A.pickup(G.pickChain); }
      part(k.x, k.y, 0, -20, 0.2, k.kind === 'heal' ? P.blood : k.kind === 'gold' ? '#ffd447' : P.volt, { glow: true });
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
    G.pfx = s.owner === 'player';
    s.t += dt; s.life -= dt; s.spin = (s.spin || 0) + dt * 20;
    // awakened shots leave a sparkling trail in the fighter's colors
    if (G.pfx && G.evo === true && Math.random() < 0.6) part(s.x, s.y, -s.vx * 0.08 + rnd(-10, 10), -s.vy * 0.08 + rnd(-10, 10), rnd(0.15, 0.3), Math.random() < 0.5 ? s.c : P.paper, { drag: 4, glow: true });
    if (s.accel) { s.vx *= 1 + s.accel * dt; s.vy *= 1 + s.accel * dt; }
    if (s.ret && s.t > s.retT) {
      const o = s.ret, a = Math.atan2(o.y - 20 - s.y, o.x - s.x);
      s.vx = Math.cos(a) * 260; s.vy = Math.sin(a) * 260; s.life = 2;
      if (hyp(o.x - s.x, o.y - 20 - s.y) < 14 || o.dead) { s.dead = true; continue; }
    }
    if (s.owner === 'player' && s.homing) {
      let best = null, bd = 140;
      for (const e of G.E) { if (!foe(e)) continue; const d = hyp(e.x - s.x, e.y - e.r - s.y); if (d < bd) { bd = d; best = e; } }
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
    else if (G.obst.length && !s.ret && !(s.pierce > 3) && !((s.z || 0) > 8) && inObstacle(s.x, s.y + 4, 1)) { sparks(s.x, s.y, Math.atan2(-s.vy, -s.vx), 4, 0.8, P.stone2, 80); endShot(s); continue; }
    if (s.owner === 'enemy') {
      if (p.fortress > 0 && !s.noparry && hyp(s.x - p.x, s.y - (p.y - 6)) < 16) { parry(s, Math.atan2(s.y - p.y, s.x - p.x)); continue; }
      if (s.dmg > 0 && hyp(s.x - p.x, s.y - (p.y - 6)) < s.r + p.r) { const r = tryHurt(s.dmg, s.x, s.y); if (r === true || r === 'blocked') s.dead = true; }
    } else {
      for (const e of G.E) {
        if (!alive(e) || s.hit.has(e)) continue;
        if (hyp(s.x - e.x, s.y - (e.y - e.r)) < s.r + e.r + 2) {
          s.hit.add(e);
          const killed = damage(e, s.dmg, { power:s.power, dir: Math.atan2(s.vy, s.vx), kb: s.kb, src: s.kind === 'orb' ? 'orb' : 'primary', ug: s.ug, noEnergy: s.noEnergy, slice: s.slice, basic: s.basic });
          if (s.onHit) withPower(s.power,()=>s.onHit(e, killed));
          if (!killed && s.poison) ignite(e, 3, 3, s.power);
          if (!killed && s.freeze && e.type !== 'boss') e.frozen = Math.max(e.frozen, s.freeze);
          sparks(s.x, s.y, Math.atan2(s.vy, s.vx), s.kind === 'bullet' ? 4 : 8, 0.7, s.c);
          if (s.kind === 'orb') A.hit(true, false); else if (s.ug) A.charHit(G.char, false, false, G.combo); else A.tick();
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
    if (s.splash.big) { withPower(s.power,()=>explode(s.x, s.y + 4, true, s.splash.R, s.splash.big)); return; }
    const radius=s.splash.R*G.up.shrap;
    for (const e of G.E) if (alive(e) && !s.hit.has(e) && hyp(e.x - s.x, e.y - e.r - s.y) < radius + e.r) damage(e, s.splash.dmg, { power:s.power, dir: Math.atan2(e.y - s.y, e.x - s.x), kb: 100, src: 'boom' });
    addRing(s.x, s.y, s.c, radius * 6, 0.16, 2);
  }
  sparks(s.x, s.y, rnd(TAU), 5, Math.PI, s.c, 100);
}

function updateHazards(dt) {
  const p = G.p;
  for (const z of G.zones) {
    z.t += dt;
    if (z.type === 'lava' || z.type === 'burn') {
      for (const e of G.E) if (alive(e) && e.type !== 'boss' && hyp(e.x - z.x, (e.y - z.y) * 1.2) < z.r) {
        if (z.type === 'lava') ignite(e, 1.5, 6, 'environment'); else ignite(e, 1.5, 4);
      }
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
        for (const e of G.E) if (alive(e) && hyp(e.x - s.x, e.y - s.y) < s.R + e.r) damage(e, pd(s.dmg), { power:s.power, dir: Math.atan2(e.y - s.y, e.x - s.x), kb: 220, src: 'boom' });
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
    if (q.erase) eraseShots(q.x, q.y, q.r - 8, q.r + 6);
    if (Math.random() < 0.8) { const a = rnd(TAU); dust(q.x + Math.cos(a) * q.r, q.y + Math.sin(a) * q.r, 1, 20); }
    if (q.friendly) {
      for (const e of G.E) {
        if (!alive(e) || q.hit.has(e) || Math.abs(hyp(e.x - q.x, e.y - q.y) - q.r) > 6 + e.r) continue;
        q.hit.add(e);
        damage(e, pd(q.dmg), { power:q.power, dir: Math.atan2(e.y - q.y, e.x - q.x), kb: 180, src: 'boom' });
        if (e.type !== 'boss') e.stunT = Math.max(e.stunT, 1);
      }
    } else if (!q.hitP && Math.abs(hyp(p.x - q.x, p.y - q.y) - q.r) < 5) { if (tryHurt(q.dmg ?? 2, q.x, q.y)) q.hitP = true; }
  }
  sweep(G.quakes, (q) => q.r < q.max);

  for (const l of G.hlines) {
    l.t += dt;
    if (!l.done && l.t >= l.pend) {
      l.done = true;
      if (segDist(p.x, p.y - 5, l.x0, l.y0, l.x1, l.y1) < 7) tryHurt(l.dmg ?? 2, (l.x0 + l.x1) / 2, (l.y0 + l.y1) / 2);
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
      if (segDist(p.x, p.y - 5, b.x, b.y, ex, ey) < b.w / 2 + 3) tryHurt(b.dmg ?? 2, b.x, b.y);
      if (Math.random() < 0.7) sparks(ex, ey, b.a + Math.PI, 2, 1, P.blood, 120);
    }
  }
  sweep(G.hbeams, (b) => b.t < b.life);
}

// enemy shots between two distances from a point are wiped out (Grom's shockwaves): a puff and a spark each
export function eraseShots(x, y, r0, r1) {
  let n = 0;
  for (const s of G.shots) {
    if (s.owner !== 'enemy' || s.dead || s.fist) continue;
    const d = hyp(s.x - x, s.y - y);
    if (d < r0 || d > r1) continue;
    s.dead = true; n++;
    sparks(s.x, s.y, Math.atan2(s.y - y, s.x - x), 5, 0.8, P.paper, 160); dust(s.x, s.y, 3, 30);
  }
  if (n) A.shieldHit();
  return n;
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
    if (!g.still) { g.vz -= 240 * dt; g.z += g.vz * dt; }
    if (g.z < 0) { g.z = 0; g.vz = -g.vz * 0.3; g.vx *= 0.6; g.vy *= 0.6; }
    const dr = Math.exp(-2.5 * dt);
    g.vx *= dr; g.vy *= dr;
    g.x += g.vx * dt; g.y += g.vy * dt;
    if (g.t < 0.3 && Math.random() < 0.5) part(g.x, g.y, g.vx * 0.3, g.vy * 0.3, 2, g.col, { z: g.z + 6, vz: 10, g: 300, blood: true, drag: 2 });
    // the half crumbles from the wound outward; some of its pixels drop off as chips
    if (g.pix) {
      const u = g.sc / g.k, top = (g.cvH / g.k) * g.sc - 1, cap = g.sc > 1 ? 110 : 30;
      while (g.pi < g.pix.length && g.pix[g.pi][4] <= g.t) {
        const q = g.pix[g.pi++];
        g.cg.clearRect(q[0], q[1], 1, 1);
        if (g.chips < cap && (g.pi & 1)) {
          g.chips++;
          const wx = g.x - ((g.cvW / g.k) * g.sc) / 2 + (q[0] + 0.5) * u, h = top + g.z - (q[1] + 0.5) * u;
          part(wx, g.y, g.vx * 0.25 + rnd(-28, 28), g.vy * 0.25 + rnd(-14, 14), rnd(0.4, 0.75), q[3], { z: Math.max(0, h), vz: rnd(10, 60), g: 280, drag: 2.2, keep: g.chips < 8 });
        }
      }
    }
    if (g.t >= g.life) splat(g.x, g.y, 5, g.col, g.col2);
  }
  sweep(G.gibs, (g) => g.t < g.life);
  for (const s of G.slashes) { s.t += dt; if (s.follow) { s.x = G.p.x; s.y = G.p.y; } }
  sweep(G.slashes, (s) => s.t < s.life);
  for (const t of G.texts) { t.t += dt; if (t.g) { t.vy += t.g * dt; t.x += t.vx * dt; t.y += Math.min(t.vy, 30) * dt; } else t.y -= 26 * dt * (1 - t.t / t.life); }
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
    // the nest's spores rise; the void's motes drift up; the glass hall glints; dust shines in the temple; brass
    // flecks fall in the clockworks; stars twinkle in the last night
    else if (kind === 'spores') G.amb.push({ x, y: c.y + H + 2, vx: rnd(-3, 3), vy: -rnd(5, 12), c: Math.random() < 0.5 ? '#b5f23a' : '#6a8a3a', t: 0, life: 12, glow: Math.random() < 0.4 });
    else if (kind === 'void') G.amb.push({ x, y, vx: rnd(-4, 4), vy: -rnd(4, 10), c: Math.random() < 0.5 ? '#b48cff' : '#5a3e8a', t: 0, life: rnd(3, 6), glow: true });
    else if (kind === 'glints') G.amb.push({ x, y, vx: 0, vy: 0, c: Math.random() < 0.5 ? '#ffffff' : '#cfd8e0', t: 0, life: rnd(0.3, 0.8), glow: true });
    else if (kind === 'motes') G.amb.push({ x, y, vx: rnd(-3, 3), vy: rnd(-4, 2), c: Math.random() < 0.5 ? '#ffd447' : '#c9a24a', t: 0, life: rnd(4, 7), glow: Math.random() < 0.5 });
    else if (kind === 'brass') G.amb.push({ x, y: c.y - 2, vx: rnd(-4, 4), vy: rnd(10, 22), c: Math.random() < 0.5 ? '#9a7a3a' : '#c9a24a', t: 0, life: 10 });
    else if (kind === 'stars') G.amb.push({ x, y, vx: 0, vy: 0, c: Math.random() < 0.3 ? '#ffffff' : '#8a84c0', t: 0, life: rnd(1, 2.5), glow: true });
    else G.amb.push({ x, y, vx: rnd(-3, 3), vy: rnd(-3, 1), c: '#3d3250', t: 0, life: rnd(3, 6) });
  }
  // and while the King lives, ash: his people, blowing through the pit in slow flakes that flutter as they fall
  // (once the sun is out they are free, and below the pit there is no ash)
  if (!G.won && G.amb.length < n + (settings.particles === 'LOW' ? 8 : 22) && Math.random() < dt * 7) {
    G.amb.push({ x: c.x + rnd(-20, W), y: c.y - 2, vx: rnd(3, 9), vy: rnd(6, 13), c: Math.random() < 0.6 ? '#5e5458' : '#8a7e84', t: 0, life: 14, ash: true });
  }
  for (const a of G.amb) {
    a.t += dt;
    if (a.ash) a.vx += Math.sin(a.t * 2.6 + a.y * 0.07) * dt * 14;
    if (kind === 'fireflies') { a.vx += rnd(-30, 30) * dt; a.vy += rnd(-30, 30) * dt; }
    if (kind === 'snow') a.vx += Math.sin(a.t * 2 + a.y * 0.05) * dt * 10;
    a.x += a.vx * dt; a.y += a.vy * dt;
  }
  sweep(G.amb, (a) => a.t < a.life && a.y > c.y - 10 && a.y < c.y + H + 10);
}

function updateCam(dt) {
  const p = G.p, b = G.boss, show = b && b.state === 'intro' && !G.night;
  // during a boss entrance the camera frames the boss instead of you
  const gate = !G.night && G.sigils.find(s => s.type === 'boss');
  const fxp = gate ? gate.x : show ? b.x : p.x + Math.cos(p.aim) * 16, fyp = gate ? gate.y - 18 : show ? b.y - 20 : p.y - 8 + Math.sin(p.aim) * 11;
  let tx = fxp - W / 2, ty = fyp - H / 2;
  // a big boss (the King, Nox) pulls the camera toward itself, so you see more of it than its feet, though you always
  // stay well inside the frame
  if (b && !show && !gate && !b.under && !b.dead && !b.dying) {
    const bh = sprFor(b)?.h || 30, w = Math.min(0.4, Math.max(0, (bh - 36) / 200));
    if (w > 0 && hyp(b.x - p.x, b.y - p.y) < 280) {
      tx += (b.x - W / 2 - tx) * w * 0.4; ty += (b.y - bh * 0.55 - H / 2 - ty) * w;
      ty = clamp(ty, p.y - H + 30, p.y - 44);
    }
  }
  const k = 1 - Math.exp(-7 * dt);
  if (G.void) { fx.cam.x += (tx - fx.cam.x) * k; fx.cam.y += (ty - fx.cam.y) * k; return; }
  fx.cam.x = clamp(fx.cam.x + (tx - fx.cam.x) * k, SX, AW - W - SX);
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
  oni: [P.paper, '#ff3b3b', '#c81e36', '#2a0a14'],
  paper: [P.paper, P.paper, '#fff2c0', '#c8b8a0'],
  whitefire: [P.paper, '#ffffff', '#fff2c0', P.gold],
  titan: [P.paper, '#ff3b3b', '#a0101e', '#2a0a10'],
  storm: [P.paper, '#c8ffff', P.volt, P.gold],
  fire: [P.paper, '#ffe08a', '#ff9a3c', '#c6380f'],
});
export function drawSlash(s) {
  const L = s.life, age = s.t;
  const reveal = Math.min(1, age / 0.05), tail = Math.max(0, (age - 0.05) / (L - 0.05));
  const cx = Math.round(s.x), cy = Math.round(s.y - 5), R = s.r, a0 = -s.arc / 2;
  const pal = G.awPal && G.kit.awake?.pal, cols = (s.chg && pal && SLASH_COLS()[pal.charge]) || (s.follow && pal && SLASH_COLS()[s.col === 'paper' ? 'paper' : G.kit.melee?.col]) || SLASH_COLS()[s.col];
  const ir = Math.ceil(R), rIn = Math.max(0, R - s.th - 1);
  for (let y = -ir; y <= ir; y++) {
    // only walk the pixels inside the ring, not the whole square
    const yy = y * y;
    if (yy > R * R) continue;
    const xo = Math.floor(Math.sqrt(R * R - yy)), xi = yy < rIn * rIn ? Math.ceil(Math.sqrt(rIn * rIn - yy)) : -1;
    for (let x = -xo; x <= xo; x++) {
    if (xi >= 0 && x > -xi && x < xi) { x = xi - 1; continue; }
    const d = Math.sqrt(x * x + yy);
    if (d > R || d < rIn) continue;
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
  }
  const tipA = s.a + s.dir * (a0 + s.arc * reveal);
  glow(cx + Math.cos(tipA) * R * 0.8, cy + Math.sin(tipA) * R * 0.8, cols[2], 10, 0.5 * (1 - tail));
}

// Visually distinct, pre-drawn Q/E/R animations. These do not alter the game's move logic.
const SPECIAL_DUR = { BLADE:1.85, GUNNER:4, WIZARD:2.6, NINJA:1.6,
  MECHANIC:1.4, TANK:6, ROBOT:4.5, DEV:1.55 };
function setSpriteAction(p, name) {
  let dur = name === 'ultimate' ? SPECIAL_DUR[G.char] || 1.3 : name === 'skill1' ? 0.48 : 0.67;
  if (name === 'ultimate') {
    if (G.char === 'GUNNER') dur = p.k.stand || dur;
    if (G.char === 'WIZARD') dur = p.k.star || dur;
    if (G.char === 'TANK') dur = p.fortress || dur;
    if (G.char === 'ROBOT') dur = p.k.orb || dur;
  }
  p.spriteAction = { kind:name, start:G.time, duration:dur };
  p.sq = name === 'ultimate' ? 0.24 : 0.14; p.sqv = 0;
}
// ---------- the hero and the weapon in hand ----------
// The hand that holds the weapon: the hero's own grip point (hero-rig.js), on the side the hero faces. Shots, spells
// and the weapon's grip all start here (the second argument is ignored: the facing decides the side).
// how high the fighter floats off the ground: Morrow while he moves, Unit-7 Omega all the time (it flies)
export function heroHover(p) {
  if (G.char === 'ROBOT' && G.evo === true) return 11 + Math.round(Math.sin(G.time * 3.2) * 2);
  const moving = (p.state === 'move' || p.state === 'skill' || p.state === 'charge') && hyp(p.vx, p.vy) > 20;
  if (G.char === 'WIZARD' && moving) return 4 + Math.round(Math.sin(G.time * 6) * 1.5);
  return 0;
}
export function handPoint(p) {
  const rig = heroSet()?.rig, left = softFacingLeft(p);
  if (!rig) return [p.x + (left ? -4 : 4), p.y - (G.kit?.handY ?? 6)];
  const dx = (rig.hand[0] + 0.5) / SS - 20, dy = (rig.hand[1] + 0.5) / SS - 31;
  return [p.x + (left ? -dx : dx), p.y + dy - heroHover(p)];
}
const lerpAngle = (a, b, w) => a + angDiff(b, a) * w;
const CW_HERO = 120;
// where the weapon points: the swing for blades (chars.js swordAngle: drawn back while charging, through the cut
// while attacking, lowered toward the aim at rest), the aim for guns and staffs. A shot kicks the muzzle up; Q and E
// twirl a blade once (a gun jerks up), and R lifts the weapon high for a moment.
function weaponAngle(p, kit, flip) {
  let a = kit.melee ? swordAngle(p) : p.aim;
  const r = p.recoil || 0, up = flip ? 1 : -1;
  if (!kit.melee && r > 0) a += up * 0.38 * r * r;
  // Unit-7's beam shakes the cannon while it fires
  if (p.k?.firing) a += Math.sin(G.time * 70) * 0.03;
  if (p.flo) return flourishAngle(p, a, up);
  // running flat out, Rin trails her katana low behind her, the way she came (a ninja run)
  const fast = p.state === 'move' && hyp(p.vx, p.vy) > (kit.stats?.speed || 100) * 0.7 && !p.atkHeld && (p.recoil || 0) <= 0;
  if (fast && G.char === 'NINJA') { const b = Math.atan2(-p.vy, -p.vx); return b + (Math.cos(b) < 0 ? -0.4 : 0.4); }
  const q = p.spriteAction, t = q ? G.time - q.start : 9;
  if (q && t < 0.5) {
    const k = Math.min(1, t / 0.3), e = 1 - (1 - k) ** 3;
    if (q.kind === 'ultimate') a = lerpAngle(a, -Math.PI / 2 - up * 0.3, t < 0.36 ? Math.min(1, t / 0.08) : Math.max(0, 1 - (t - 0.36) / 0.14));
    else if (kit.melee) a += -up * e * TAU;
    else a += up * 0.6 * (1 - e);
  }
  return a;
}
// the weapon at the hand (x, y), with afterimages fanning behind a fast swing, a glow while it charges, and a flash
// at the muzzle on a shot
function drawHeldWeapon(p, set, flip, x, y, a) {
  let name = set.rig.weapon;
  if (G.char === 'GUNNER' && p.k?.stand > 0) name = 'minigun';
  if (!name) return;
  const kit = G.kit, skin = !!set.evolved, wp0 = SPR.weapons[G.char], wp = skin && wp0?.evo ? wp0.evo : wp0;
  // a gun kicks back along itself; a blade reaches out as it cuts
  const push = -0.9 * (p.recoil || 0) + (p.state === 'attack' && p.atkT < 0.14 ? 1 : 0) + (p.state === 'chg' ? 1 : 0);
  const hx = x + Math.cos(a) * push, hy = y + Math.sin(a) * push;
  const prev = p.wpnA ?? a, d = angDiff(a, prev);
  p.wpnA = a;
  // a fast swing leaves the blade's afterimages between where it was and where it is
  if (kit.melee && Math.abs(d) > 0.22) for (let j = 3; j >= 1; j--) drawWeaponAt(ctx, name, skin, hx, hy, a - (d * j) / 4, flip, 0.5 - j * 0.12);
  drawWeaponAt(ctx, name, skin, hx, hy, a, flip);
  const len = wp ? wp.along : 6, tx = hx + Math.cos(a) * len * 0.95, ty = hy + Math.sin(a) * len * 0.95;
  // a blade's tip leaves a ribbon through every swing: white, or thick and in the fighter's colors once awakened
  if (kit.melee) {
    const tr = (p.tipTrail ||= []), now = G.time;
    tr.push([tx, ty, now]);
    while (tr.length && now - tr[0][2] > 0.1) tr.shift();
    if (p.state === 'attack' || p.state === 'chg') {
      for (let j = 1; j < tr.length; j++) {
        const [x0, y0, t0] = tr[j - 1], [x1, y1] = tr[j], k = Math.max(0, 1 - (now - t0) / 0.1);
        ctx.globalAlpha = k * (skin ? 0.9 : 0.55);
        if (skin) line(x0, y0, x1, y1, kit.color(), 3);
        line(x0, y0, x1, y1, P.paper, 1);
      }
      ctx.globalAlpha = 1;
    }
  }
  // awakened: the weapon smoulders with the fighter's color, shedding sparks all the time
  if (skin) {
    glow((hx + tx) / 2, (hy + ty) / 2, kit.color(), 6 + len / 4, 0.22 + Math.sin(G.time * 8) * 0.07);
    if (Math.random() < 0.55) { const k = Math.random(); part(hx + (tx - hx) * k, hy + (ty - hy) * k, rnd(-8, 8), -rnd(10, 30), rnd(0.25, 0.5), Math.random() < 0.6 ? kit.color() : P.paper, { glow: true, drag: 2 }); }
  }
  if (p.state === 'charge') {
    const f = chargeLevel(p), c = f >= 1 && Math.floor(G.time * 20) % 2 ? P.paper : kit.color();
    glow(tx, ty, c, 4 + Math.round(f * 7), 0.35 + f * 0.45);
    glow((hx + tx) / 2, (hy + ty) / 2, c, 3 + Math.round(f * 4), 0.2 + f * 0.3);
  } else if (G.evo === true) glow(tx, ty, kit.color(), 4, 0.25 + Math.sin(G.time * 6) * 0.08);
  if (!kit.melee && (p.recoil || 0) > 0.72) { disc(tx, ty, 1.5, P.paper); glow(tx, ty, kit.color(), 7, 0.75); }
}
function drawPlayer() {
  const p = G.p, kit = G.kit;
  if (p.state === 'dead' || p.state === 'cine' || p.hidden) return;
  // the i-frames blink, except for the first moment of a hit (the flinch should show)
  if (p.inv > 0 && p.hurtT < 0.12 && p.hurtT > -0.8 && p.state !== 'dash' && Math.floor(G.time * 22) % 2) return;
  // the body faces left or right only (mostly toward the player); the aim, the weapon, shots and cuts go all 360
  // degrees
  const set = heroSet(), body = set.body;
  const moving = (p.state === 'move' || p.state === 'skill' || p.state === 'charge') && hyp(p.vx, p.vy) > 20;
  const flip = softFacingLeft(p);
  // Rin runs with afterimages behind her (pink, or her awakened red)
  const ninja = G.char === 'NINJA' && moving && p.state === 'move';
  // walking (slow) and running cycles, 12 frames each at the gait's own speed (Rin's quick little run is the fastest)
  const walking = moving && hyp(p.vx, p.vy) < (kit.stats?.speed || 100) * 0.7;
  const moveFrames = walking ? body.walk : body.run, gait = set.rig.gait?.[walking ? 'walk' : 'run'];
  const fi = Math.floor(p.runT * (gait?.fps || (walking ? 9 : 13))) % moveFrames.length;
  // standing still plays the 16-frame idle loop: breathing, a blink, cloth in the wind
  const ii = Math.floor(G.time * 7) % body.idles.length;
  // Morrow floats while he moves; Unit-7 Omega hovers on its jets all the time
  const jets = G.char === 'ROBOT' && G.evo === true;
  const hover = heroHover(p), floats = hover > 0;
  // a dash throws the body forward with everything streaming behind it; a hit makes it flinch with its eyes screwed
  // shut; the first instant of a swing lunges into it (the dash pose, when the cut goes the way the hero faces)
  const age = p.spriteAction ? G.time-p.spriteAction.start : Infinity;
  const casting = age < Math.min(0.65,p.spriteAction?.duration || 0);
  const pose = p.state==='dash' ? body.dash[Math.min(7,Math.floor(8*(1-clamp(p.dashT/(kit.dash.time),0,1))))] :
    p.hurtT>0 ? body.hurt[Math.min(7,Math.floor(8*(1-clamp(p.hurtT/0.25,0,1))))] :
    p.state==='attack' ? body.attack[Math.min(15,Math.floor(16*p.atkT/Math.max(0.14,p.atkDur || 0.32)))] :
    casting ? body.cast[Math.min(15,Math.floor(age*16/Math.min(0.65,p.spriteAction.duration)))] :
    p.recoil>0.06 ? body.attack[Math.min(15,Math.floor((1-p.recoil)*16))] : null;
  // flying, Omega's treads stay still
  const fr = pose || (moving && !jets ? moveFrames[fi] : body.idles[ii]);
  // a lunge into each swing, a lean into a dash
  const lean = p.state === 'attack' && p.atkT < 0.12 ? 2 : p.state === 'dash' ? 1 : 0, la = p.state === 'attack' ? p.atkAng : p.aim;
  shadow(p.x, p.y, hover ? 4 : 6);
  if (hover && !jets && Math.random() < 0.5) part(p.x + rnd(-4, 4), p.y - rnd(0, 2), rnd(-10, 10), rnd(-10, -2), 0.4, '#b48cff', { glow: true, drag: 3 });
  // Omega flies: swept gold wings behind it, two jet engines under it with flames roaring down
  if (jets) {
    const by = p.y - hover, flap = Math.sin(G.time * 5);
    for (const side of [-1, 1]) {
      for (let i = 0; i < 6; i++) {
        const wx = p.x + side * (6 + i), wy = by - 13 + Math.round(i * 0.7 + flap * (i / 6) * 1.5);
        rect(wx, wy, 1, Math.max(1, 5 - i * 0.7), i % 2 ? '#c9a24a' : '#ffd447'); px(wx, wy - 1, '#1c1422');
      }
      px(p.x + side * 12, by - 9 + Math.round(flap * 1.5), Math.floor(G.time * 4) % 2 ? '#ff3b3b' : P.paper);
    }
    for (const side of [-4, 4]) {
      const ex = p.x + side;
      rect(ex - 1, by - 2, 3, 3, '#1c1a22'); px(ex, by - 1, '#ff3b3b');
      const fl = 3 + Math.floor(Math.random() * 3) + (hyp(p.vx, p.vy) > 20 ? 2 : 0);
      rect(ex - 1, by + 1, 3, fl, '#ff6a2a'); rect(ex, by + 1, 1, fl + 2, '#ffd447');
      glow(ex, by + 3, '#ff6a2a', 6, 0.5);
      if (Math.random() < 0.6) part(ex + rnd(-1, 1), by + 3, rnd(-6, 6), rnd(50, 90), rnd(0.08, 0.16), Math.random() < 0.5 ? '#ff6a2a' : P.paper, { drag: 2 });
    }
  }
  if (p.invis > 0) ctx.globalAlpha = 0.3 + (Math.floor(G.time * 10) % 2) * 0.1;
  // things circling the fighter: the half behind them first, the half in front after the body
  kit.drawAura?.(p, flip, false);
  drawOrbit(p, false);
  // the feet point, and the body's squash and stretch about it (a charge crouches deeper as it fills)
  const fx0 = snap(p.x + Math.cos(la) * lean), fy0 = snap(p.y - hover + Math.sin(la) * lean * 0.5);
  const sq = clamp((p.sq || 0) + (p.state === 'charge' ? 0.07 * chargeLevel(p) : 0), -0.32, 0.32), scx = 1 + 0.55 * sq, scy = 1 - sq;
  // the hand on this frame: on the drawn sprite (a running bob lifts it a pixel), then squashed with the body
  const rig = set.rig, cx = flip ? CW_HERO - 0.5 - rig.hand[0] : rig.hand[0] + 0.5;
  // the hand moves with the gait's frame (the arms swing, the body bounces)
  const off = !pose && moving && !jets ? gait?.off?.[fi] : null, odx = off ? (flip ? -off[0] : off[0]) / SS : 0, ody = off ? off[1] / SS : 0;
  const hx = fx0 + (cx / SS - 20 + odx) * scx, hy = fy0 + ((rig.hand[1] + 0.5) / SS - 31 + ody) * scy;
  // the weapon eases toward where it should point (a swing snaps, everything else glides, so it never jumps when a
  // swing ends or the hero turns)
  const target = weaponAngle(p, kit, flip), swinging = p.state === 'attack' || p.state === 'chg' || !!p.flo || (p.spriteAction && G.time - p.spriteAction.start < 0.5);
  const now = G.time, step = Math.min(0.05, Math.max(0, now - (p.wpnT ?? now))); p.wpnT = now;
  p.wpnS = swinging || p.wpnS === undefined || p.wpnFlip !== flip ? target : lerpAngle(p.wpnS, target, 1 - Math.exp(-step * (kit.melee ? 24 : 40)));
  p.wpnFlip = flip;
  // the weapon goes behind the body when it points up, except while winding up a charge or raising it for an
  // ultimate (those poses should show)
  const raised = p.spriteAction?.kind === 'ultimate' && G.time - p.spriteAction.start < 0.5;
  const wa = p.wpnS, behind = Math.sin(wa) < -0.35 && p.state !== 'charge' && !raised;
  const lift = p.flo?.lift || 0;
  const sheathed = G.char === 'NINJA' && p.sheathed && WEAPON_ART.saya;
  // the scabbard at her hip, hilt in hand: behind her, or (awakened) worn in front across the hip, after the body
  const sp = sheathed && sheathPose(!!set.evolved, flip);
  if (sheathed && !sp.front) drawWeaponAt(ctx, 'saya', !!set.evolved, hx, hy, sp.a, flip);
  else if (behind) drawHeldWeapon(p, set, flip, hx, hy - lift, wa);
  // a hit flashes the body white then red for an instant, then the flinch (eyes screwed shut) shows
  const tintP = p.hurtT > 0.255 ? (p.hurtT > 0.28 ? P.paper : P.blood) : p.held > 0 ? (p.heldKind === 'stone' ? '#8c8a98' : '#d8b060') : null;
  if (ninja) {
    if (Math.floor(G.time * 16) !== Math.floor((G.time - 1 / 60) * 16)) G.ghosts.push({ x: p.x - Math.cos(p.moveAng) * 3, y: p.y, flip, t: 0, life: 0.16, c: G.awPal?.['#ffb7d5'] || '#ffb7d5', spr: fr });
  }
  ctx.save(); ctx.translate(fx0, fy0); if (jets) ctx.rotate(clamp(p.vx / 90, -1, 1) * 0.14); if (sq) ctx.scale(scx, scy);
  drawSprite(fr,-fr.w/2,-fr.h+1,flip,tintP);
  ctx.restore();
  // winding up a charged attack: a ring at the feet fills, and flashes once full
  if (p.state === 'charge') {
    const f = chargeLevel(p), full = f >= 1, c = full ? (Math.floor(G.time * 20) % 2 ? P.paper : P.gold) : kit.color();
    for (let i = 0; i < 24; i++) {
      if (i / 24 > f) break;
      const a = -Math.PI / 2 + (i / 24) * TAU;
      px(p.x + Math.cos(a) * 9, p.y + Math.sin(a) * 4, c);
    }
    glow(p.x, p.y - 7, c, 8 + Math.round(f * 8), 0.2 + f * 0.3);
    if (full) ring(p.x, p.y - 7, 12 + Math.sin(G.time * 30), 1, c);
    if (G.evo === true && G.awPal) {
      // awakened: a second ring spins the other way, sparks rise, and the glow is twice as big
      const col = kit.color();
      for (let i = 0; i < 16; i++) { const a = -G.time * 6 + (i / 16) * TAU; if (i % 2) px(p.x + Math.cos(a) * 14, p.y - 2 + Math.sin(a) * 6, i % 4 === 1 ? P.paper : col); }
      glow(p.x, p.y - 7, col, 14 + Math.round(f * 16), 0.15 + f * 0.35);
      if (Math.random() < 0.5 + f) part(p.x + rnd(-10, 10), p.y - rnd(0, 4), 0, -rnd(30, 70), rnd(0.3, 0.6), Math.random() < 0.6 ? col : P.paper, { drag: 1, glow: true });
    }
  }
  // a charged counter crackles around the fighter
  if (p.counter > 0 && !p.counterHit) { ring(p.x, p.y - 8, 12 + Math.sin(G.time * 22), 1, Math.floor(G.time * 16) % 2 ? P.volt : P.paper); glow(p.x, p.y - 8, P.volt, 16, 0.35); }
  if (!behind && !sheathed) drawHeldWeapon(p, set, flip, hx, hy - lift, wa);
  if (sheathed && sp.front) drawWeaponAt(ctx, 'saya', true, hx, hy, sp.a, flip);
  kit.drawAura?.(p, flip, true);
  ctx.globalAlpha = 1;
  // a faint glow at the chest (it rises with a hovering fighter)
  glow(p.x + (flip ? -1 : 1), p.y - 9 - hover, kit.color(), 10, 0.2);
  drawOrbit(p, true);
  if (p.ascend > 0) {
    ring(p.x, p.y - 9, 14 + Math.sin(G.time * 14), 1, P.gold); glow(p.x, p.y - 9, P.gold, 22, 0.4);
    // golden wings
    const flap = Math.sin(G.time * 8) * 0.25;
    for (const side of [-1, 1]) for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + side * (0.6 + i * 0.28 + flap), L = 18 - i * 2;
      line(p.x + side * 3, p.y - 10, p.x + side * 3 + Math.cos(a) * L, p.y - 10 + Math.sin(a) * L, i % 2 ? P.gold : P.paper);
    }
  }
  if (p.evoFlash > 0) {
    const w = Math.round(14 * Math.min(1, p.evoFlash));
    const ec = p.evoCol || P.gold;
    rect(p.x - w / 2, fx.cam.y - 10, w, p.y - fx.cam.y + 10, ec); rect(p.x - w / 4, fx.cam.y - 10, Math.max(1, w / 2), p.y - fx.cam.y + 10, P.paper);
    glow(p.x, p.y - 9, ec, 30, 0.6);
  }
  if (p.shield > 0) {
    if (G.char === 'ROBOT' && G.evo === true) drawAegis(p, hover);
    else { ring(p.x, p.y - 8, 13 + Math.sin(G.time * 8), 1, P.volt); glow(p.x, p.y - 8, P.volt, 12, 0.2); }
  }
  if (p.fortress > 0) { const fc = G.evo === true && G.awPal ? kit.color() : P.gold; ring(p.x, p.y - 8, 15 + Math.sin(G.time * 12) * 1.5, 2, fc); glow(p.x, p.y - 8, fc, 18, 0.3); }
}

// Unit-7 Omega's barrier, the Aegis: hexagonal plates of red light rimmed in gold turning round it, two for every hit
// it can still take, joined by a lattice of light, with a gold ring turning the other way inside
function drawAegis(p, hover) {
  const cx = p.x, cy = p.y - 9 - hover, n = Math.max(2, p.shield * 2), t = G.time;
  glow(cx, cy, '#ff2a3a', 20, 0.26 + Math.sin(t * 6) * 0.06);
  for (let i = 0; i < 24; i++) { const a = -t * 2 + (i * TAU) / 24; if (i % 3 !== 2) px(cx + Math.cos(a) * 11, cy + Math.sin(a) * 8, i % 6 === 0 ? P.paper : P.gold); }
  const pts = [];
  for (let i = 0; i < n; i++) { const a = t * 1.6 + (i * TAU) / n; pts.push([cx + Math.cos(a) * 17, cy + Math.sin(a) * 12, Math.sin(a)]); }
  ctx.globalAlpha = 0.55;
  for (let i = 0; i < n; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % n]; line(x0, y0, x1, y1, '#ff2a3a'); }
  ctx.globalAlpha = 1;
  for (const [x, y, s] of pts) {
    const X = Math.round(x), Y = Math.round(y);
    rect(X - 1, Y - 2, 3, 1, P.gold); rect(X - 1, Y + 2, 3, 1, P.gold); rect(X - 2, Y - 1, 1, 3, P.gold); rect(X + 2, Y - 1, 1, 3, P.gold);
    rect(X - 1, Y - 1, 3, 3, s > 0 ? '#ff3b3b' : '#a0101e'); px(X - 1, Y - 1, P.paper);
    glow(X, Y, '#ff2a3a', 4, s > 0 ? 0.5 : 0.25);
  }
}

export function drawEnemy(e) {
  if (e.under) return;
  // a boss coming in shows itself its own way (bosses.js reveal: rising out of the floor, coming down in a bolt,
  // forming out of glass, darkening out of the sky), k from 0 to 1, with what it came out of still clinging to it as
  // a colored silhouette that lifts off; until k starts it isn't seen at all
  const rv = e.type === 'boss' && e.state === 'intro' ? BOSSES[e.boss].reveal?.(e) : null;
  if (rv && rv.k <= 0) return;
  const rk = rv ? 1 - (1 - rv.k) ** 3 : 1;
  const s = sprFor(e), sc = e.def.scale || 1;
  const feet = e.y + 1 - (e.z || 0), x = e.x - s.w * sc / 2, y = feet - s.h * sc;
  shadow(e.x, e.y, (e.r + (e.type === 'boss' ? 2 : 0) - Math.min(4, (e.z || 0) / 10)) * (rv ? Math.max(0.15, rk) : 1));
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
  const ac = e.elite ? (e.affix ? AFFIX[e.affix].c : P.gold) : null;
  if (e.elite) {
    glow(e.x, e.y - e.r, ac, 10, 0.25 + (e.affix === 'VOLATILE' ? Math.sin(G.time * 12) * 0.15 : 0));
    if (e.ward > 0) ring(e.x, e.y - e.r, e.r + 4, 1, Math.floor(G.time * 10) % 2 ? AFFIX.WARDED.c : P.paper);
  }
  if (e.type === 'shade') ctx.globalAlpha = e.state === 'vanish' ? Math.max(0.05, e.t / 0.3) : e.state === 'stalk' ? 0.55 : 1;
  else if (e.alpha !== undefined) ctx.globalAlpha = e.alpha;
  if (rv?.style === 'fade') ctx.globalAlpha *= rk;
  const ps = monsterPose(e), flip = e.face < 0, ox = -s.w / 2;
  ctx.save();
  ctx.translate(snap(e.x + ps.dx), snap(feet + ps.dy));
  if (rv && rv.k < 1) {
    // rising: only what is above the floor shows; descending or fading: coming down from overhead; forming: growing
    if (rv.style === 'rise') { ctx.beginPath(); ctx.rect(-800, -1200, 1600, 1200); ctx.clip(); ctx.translate(0, Math.round((1 - rk) * s.h * sc * (rv.depth ?? 1))); }
    else if (rv.style === 'descend' || rv.style === 'fade') ctx.translate(0, -Math.round((1 - rk) * (rv.height ?? 0)));
    else if (rv.style === 'form') { const c = 1.7, b = 1 + (c + 1) * (rv.k - 1) ** 3 + c * (rv.k - 1) ** 2, f = 0.12 + 0.88 * b; ctx.scale(f, f); }
  }
  ctx.rotate(ps.rot);
  ctx.scale(sc * ps.sx, sc * ps.sy);
  if (e.boss === 'nox' && e.dying) {
    const h = s.h * e.dying / 2.2;
    ctx.beginPath(); ctx.rect(ox, -h, s.w, h); ctx.clip(); tint = null;
  }
  if (ac) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) drawSprite(s, ox + dx, -s.h + dy, flip, ac);
  drawSprite(s, ox, -s.h, flip, tint);
  const over = rv?.col ? rv.over ?? 1 - rv.k : 0;
  if (over > 0.01) { const a0 = ctx.globalAlpha; ctx.globalAlpha = a0 * Math.min(1, over); drawSprite(s, ox, -s.h, flip, rv.col); ctx.globalAlpha = a0; }
  const body = e.boss && BOSSES[e.boss].drawBody;
  if (body) {
    ctx.translate(-e.x, -feet);
    body(e, e.x + ox, feet - s.h, s);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  if (e.state === 'chimeW') {
    if (e.type === 'bellwraith') { ring(e.x,e.y,8+e.t*24,1,e.def.col); ring(e.x,e.y,10,1,P.paper); }
    else for (const side of [-1,0,1]) {
      const a=e.lock+side*0.25; line(e.x,e.y-e.r,e.x+Math.cos(a)*29,e.y-e.r+Math.sin(a)*29,e.def.col);
    }
  }
  if (e.type === 'wisp' && e.state === 'windup') glow(e.x, y + 4, P.hex, 6 + (0.55 - e.t) * 18, 0.6);
  if (e.type === 'egg') glow(e.x, e.y - 3, DEF.egg.col, 6 + Math.sin(G.time * 8) * 2, 0.3);
  if (e.type === 'boss' && !(rv && rv.k < 1)) BOSSES[e.boss].draw?.(e, x, y, s);
  if (e.state === 'windup' && e.type === 'husk' && blink) textO('!', e.x, y - 8, P.blood, 1, 'c');
  if (e.state === 'stun' || e.stunT > 0) for (let i = 0; i < 3; i++) { const a = G.time * 6 + (i * TAU) / 3; px(e.x + Math.cos(a) * 7, y - 3 + Math.sin(a) * 2, P.gold); }
  if (e.frozen > 0) { px(x + 2, y + 2, P.paper); px(x + s.w - 3, y + 4, P.paper); }
  if (e.hp < e.maxHp && e.type !== 'boss' && !e.dying) {
    const w = e.r * 2 + 2;
    rect(e.x - w / 2, y - 4, w, 2, P.ink0);
    rect(e.x - w / 2, y - 4, Math.max(1, Math.round((w * e.hp) / e.maxHp)), 1, e.burn > 0 ? P.ember : e.elite ? P.gold : P.blood);
    if (e.ward > 0) rect(e.x - w / 2, y - 5, Math.max(1, Math.round((w * e.ward) / e.wardMax)), 1, AFFIX.WARDED.c);
  }
  if (e.affix && e.tagT > 0 && !e.dying && e.type !== 'boss') {
    const t = AFFIX[e.affix];
    text(t.name, e.x, y - 11, t.c, 1, 'c');
  }
}

function drawGib(g) {
  if (!g.cv) return;
  const w = (g.cvW / g.k) * g.sc, h = (g.cvH / g.k) * g.sc;
  ctx.drawImage(g.t < 0.08 && g.wh ? g.wh : g.cv, snap(g.x - w / 2), snap(g.y - h + 1 - g.z), w, h);
  if (g.t < 0.12 && g.side > 0) {
    const cx = g.x, cy = g.y - h / 2 - g.z, ux = Math.cos(g.sa), uy = Math.sin(g.sa);
    line(cx - ux * 10, cy - uy * 10, cx + ux * 10, cy + uy * 10, P.paper);
  }
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
    if (e.type === 'archer' && e.state === 'aim') {
      // where the arrow will fly: a dashed line that marches outward, flashing white once it locks
      const cx = Math.cos(e.lock), cy = Math.sin(e.lock), locked = e.t <= 0.3, x0 = e.x + e.face * 4, y0 = e.y - 8;
      for (let i = 8; i < 300; i += 6) {
        if (((i / 6 + Math.floor(G.time * 14)) | 0) % 2) continue;
        line(x0 + cx * i, y0 + cy * i, x0 + cx * (i + 3), y0 + cy * (i + 3), locked ? (blink ? P.paper : P.blood) : P.blood);
      }
      if (locked) textO('!', e.x, e.y - 20, P.blood, 1, 'c');
    }
    if (e.type === 'priest' && e.state === 'chant') {
      // the healing circle: every monster inside it is healed when the chant ends
      ring(e.x, e.y, PRIEST_R, 1, blink ? DEF.priest.col : DEF.priest.colD);
      for (let i = 0; i < 8; i++) { const a = G.time * 2 + (i * TAU) / 8; px(e.x + Math.cos(a) * (PRIEST_R - 3), e.y + Math.sin(a) * (PRIEST_R - 3) * 0.6, P.paper); }
      // a thin green tether to each monster about to be healed
      for (const o of e.heal || []) if (alive(o)) for (let i = 0; i < 1; i += 0.1) { const k = (i + G.time * 2) % 1; px(e.x + (o.x - e.x) * k, e.y - 12 + (o.y - o.r - (e.y - 12)) * k, blink ? DEF.priest.col : P.paper); }
    }
    if (e.type === 'shade' && e.state === 'strike') { ring(e.x, e.y, 24, 1, blink ? P.hex : P.paper); textO('!', e.x, e.y - 22, P.hex, 1, 'c'); }
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
    if (k > 0.25 && s.kind !== 'lightning' && s.kind !== 'blast') {
      line(fx2, fy, fx2 + 10, fy - 26, s.c, 2);
      disc(fx2, fy, s.kind === 'missile' ? 2 : 4, s.c); px(fx2, fy, P.paper);
      glow(fx2, fy, s.c, 10, 0.5);
    }
  }
  for (const l of G.hlines) {
    // Nox's reaching dark is a limb lashing out of the floor (deep.js)
    if (l.tent) { drawLash(l, blink); continue; }
    // (lines with their own color)
    const c1 = l.c || P.blood, c0 = l.c0 || P.bloodD;
    if (!l.done) line(l.x0, l.y0, l.x1, l.y1, Math.floor(G.time * 30) % 2 ? c1 : l.t > l.pend - 0.3 ? P.paper : c0);
    else {
      const k = (l.t - l.pend) / 0.3, w = Math.max(1, Math.round(5 * (1 - k)));
      line(l.x0, l.y0 + 1, l.x1, l.y1 + 1, c1, w + 2); line(l.x0, l.y0, l.x1, l.y1, P.paper, w);
    }
  }
  for (const b of G.hbeams) {
    const ex = b.x + Math.cos(b.a) * b.len, ey = b.y + Math.sin(b.a) * b.len;
    // Nox's eyes in the dark stare their beams in violet; an eye opens where each one starts
    const c1 = b.eye ? '#b48cff' : P.blood, c0 = b.eye ? '#2a0e4a' : P.bloodD;
    if (b.eye) { const open = Math.min(1, b.t / 0.4); glow(b.x, b.y, c1, 10, 0.6); rect(b.x - 4, b.y - Math.round(2 * open), 9, Math.max(1, Math.round(4 * open)), '#ece0ff'); rect(b.x - 1, b.y - Math.round(2 * open), 2, Math.max(1, Math.round(4 * open)), '#08040e'); }
    if (b.t < b.warn) { if (blink) line(b.x, b.y, ex, ey, c1); }
    else {
      const w = b.w + (Math.random() < 0.5 ? 1 : 0);
      line(b.x, b.y, ex, ey, c0, w + 4); line(b.x, b.y, ex, ey, c1, w); line(b.x, b.y, ex, ey, P.paper, Math.max(1, w - 4));
      glow(ex, ey, c1, 14, 0.5); glow(b.x, b.y, c1, 12, 0.5);
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
  // the camera scrolls in canvas pixels, not whole game pixels, so following the hero is smooth
  const cx = snap(fx.cam.x + fx.ox), cy = snap(fx.cam.y + fx.oy);
  fillScreen(P.void);
  if (G.void) drawVoid(cx, cy, G.time);
  else { ctx.drawImage(floor, -cx, -cy); ctx.drawImage(decal, -cx, -cy); }
  if (G.twist === 'BLOOD') fillScreen('#ff1a2a', 0.12 + Math.sin(G.time * 2) * 0.03);
  ctx.save();
  ctx.translate(-cx, -cy);

  const fl = G.map.flame;
  if (G.void) drawVoidGround(G.p, G.voidRip);
  else for (const [tx, ty] of TORCHES) {
    const f = Math.floor(G.time * 12 + tx) % 3;
    rect(tx - 1, ty - 2 - f, 3, 3 + f, fl[0]);
    rect(tx, ty - 4 - f, 1, 3, fl[1]);
    px(tx, ty, fl[2]);
    glow(tx, ty - 1, fl[0], 20 + f, 0.16);
  }
  if (G.map.deco === 'grid' && !G.void) { const sy = B.y0 + ((G.time * 40) % (B.y1 - B.y0)); rect(B.x0, sy, B.x1 - B.x0, 1, '#2f2a80'); }

  drawZones();
  for (const ob of G.obst) drawObstacleShadow(ob);
  drawTricks();
  for (const e of G.E) if (e.boss) drawDeepFloor(e);
  G.cine?.under?.();
  drawCineTail('under');
  drawDeathUnder();

  // a boss's arrival dies away slowly once the boss is here
  for (const a of G.arrivalFades || []) {
    const v = 1 - a.f / a.fl;
    ctx.globalAlpha = v * v * (3 - 2 * v);
    drawBossArrival(a.boss, a.x, a.y, 1, BOSSES[a.boss].col, { t: a.t, life: a.life, fade: 1 - v });
    ctx.globalAlpha = 1;
  }
  for (const s of G.sigils) {
    if (s.t < 0) continue;
    const k = s.t / s.life, boss = s.type === 'boss', col = boss ? BOSSES[s.boss || bossFor(G.wave)].col : DEF[s.type].col, big = boss ? 2.2 : 1;
    if (boss) { drawBossArrival(s.boss || bossFor(G.wave), s.x, s.y, k, col, s); continue; }
    const r = 9 * big * Math.min(1, k * 2.2);
    ring(s.x, s.y, r, 1, col);
    ring(s.x, s.y, r * 0.55, 1, boss ? P.ink3 : DEF[s.type].colD);
    for (let i = 0; i < 3; i++) { const a = G.time * 5 + (i * TAU) / 3; rect(s.x + Math.cos(a) * (r + 2) - 1, s.y + Math.sin(a) * (r + 2) * 0.7 - 1, 2, 2, P.paper); }
    glow(s.x, s.y, col, 8 * big, 0.25 + k * 0.4);
  }

  drawTelegraphs();

  for (const q of G.quakes) {
    if (q.delay > 0 || q.r < 2) continue;
    remap(q.pfx ? G.awPal : null);
    ring(q.x, q.y, q.r, 3, q.c2 || (q.friendly ? P.gold2 : P.hexD));
    ring(q.x, q.y, q.r, 1, q.c || (q.friendly ? P.gold : P.hex));
  }

  remap(null);
  for (const c of G.cuts) {
    remap(c.pfx ? G.awPal : null);
    if (!c.done) line(c.x0, c.y0, c.x1, c.y1, Math.floor(G.time * 30) % 2 ? P.paper : P.dust);
    else {
      const k = Math.min(1, (c.t - c.pend) / 0.22), w = Math.max(1, Math.round(6 * (1 - k)));
      // an awakened fighter's cuts are twice as thick and glow along their length
      const big = c.pfx && G.evo === true && G.awPal;
      if (k < 1) {
        if (big) for (let j = 0; j <= 1; j += 0.2) glow(c.x0 + (c.x1 - c.x0) * j, c.y0 + (c.y1 - c.y0) * j, c.col || P.ember, 10, 0.25 * (1 - k));
        line(c.x0, c.y0 + 1, c.x1, c.y1 + 1, c.col || P.ember, (w + 2) * (big ? 2 : 1)); line(c.x0, c.y0, c.x1, c.y1, P.paper, w * (big ? 2 : 1));
      }
    }
  }

  remap(null);
  const list = [];
  for (const k of G.picks) list.push([k.y, 0, k]);
  for (const g of G.gibs) list.push([g.y, 1, g]);
  for (const c of G.corpses) list.push([c.y, 5, c]);
  for (const e of G.E) list.push([e.y, 2, e]);
  for (const a of G.allies) list.push([a.y, 4, a]);
  for (const ob of G.obst) list.push([ob.y, 6, ob]);
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
      else if (o.kind === 'gold') { const w = Math.round(Math.abs(Math.cos(G.time * 6 + o.x)) * 2); rect(o.x - w, o.y - 6 - o.z, w * 2 + 1, 5, '#ffd447'); rect(o.x - w, o.y - 6 - o.z, w * 2 + 1, 1, '#fff6c0'); if (w) px(o.x, o.y - 4 - o.z, '#c98a1a'); glow(o.x, o.y - 4 - o.z, '#ffd447', 9, 0.55); }
      else if ((o.n || 1) > 2) { rect(o.x - 2, o.y - 3 - o.z, 4, 3, P.volt); rect(o.x - 1, o.y - 4 - o.z, 2, 5, P.volt); px(o.x, o.y - 3 - o.z, P.paper); glow(o.x, o.y - 2 - o.z, P.volt, 8, 0.55); }
      else { rect(o.x - 1, o.y - 2 - o.z, 2, 2, P.volt); px(o.x, o.y - 2 - o.z, P.paper); glow(o.x, o.y - 1 - o.z, P.volt, 5, 0.45); }
    } else if (kind === 1) drawGib(o);
    else if (kind === 2) { if (o.prop) drawProp(o, G.time); else drawEnemy(o); }
    else if (kind === 4) ALLY[o.type].draw(o);
    else if (kind === 5) drawCorpse(o);
    else if (kind === 6) drawObstacle(o, G.time);
    else drawPlayer();
  }

  drawDeath();
  for (const s of G.slashes) drawSlash(s);
  // expressions over heads: the fighter's (sweating when nearly dead, dizzy when held), stunned monsters' stars, a
  // boss's anger when it turns to a new phase
  {
    const p = G.p, hs = heroSet()?.idle;
    if (p.state !== 'dead' && p.state !== 'cine' && !p.hidden && !G.cine) {
      if (p.held > 0) emote('dizzy', 0.25);
      else if (p.hp > 0 && p.hp <= Math.max(2, Math.ceil(p.maxHp * 0.25)) && G.phase === 'fight') emote('sweat', 0.6);
      drawEmoteOn(p, p.y - (hs?.h || 22) + 3);
    }
    for (const e of G.E) {
      if (e.dead || e.under || e.dying || e.prop) continue;
      const top = e.y - (e.z || 0) - (sprFor(e)?.h || 16) * (e.def.scale || 1);
      if (e.boss) { if (e.lastPhase && e.phase !== e.lastPhase) e.emote = { kind: 'angry', at: G.time, life: 2.4 }; e.lastPhase = e.phase; }
      if (e.state === 'stun' || e.stunT > 0) drawEmote('dizzy', e.x, top + 2, G.time);
      else drawEmoteOn(e, top + 2);
    }
  }
  drawTutorialMarks();
  if (!G.dead) { remap(G.awPal); G.kit.draw?.(G.p); remap(null); }

  for (const s of G.shots) {
    remap(s.owner === 'player' ? G.awPal : null);
    // awakened basic shots: thicker, with a glow
    if (s.thick) { line(s.x, s.y + 1, s.x - s.vx * 0.02, s.y + 1 - s.vy * 0.02, s.c); glow(s.x, s.y, s.c, 6, 0.5); }
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
    } else if (s.kind === 'spirit') {
      disc(s.x, s.y, 3, P.gold); disc(s.x, s.y, 1, P.paper);
      px(s.x - 1, s.y - 1, '#5a3a00'); px(s.x + 1, s.y - 1, '#5a3a00');
      line(s.x, s.y, s.x - s.vx * 0.06, s.y - s.vy * 0.06, P.ember2);
      glow(s.x, s.y, P.gold, 9, 0.6);
    } else if (s.kind === 'crescent') {
      // Rin's sakura wave: a pink crescent bowed forward, white on its leading edge, shedding petals
      // (other fighters' crescents take their own color, and bigger ones draw bigger and thicker)
      const a = Math.atan2(s.vy, s.vx), k = 1 - s.t / s.life, pink = !s.c || s.c === '#ffb7d5', c1 = pink ? '#ffb7d5' : s.c, c2 = pink ? '#ff8fb8' : s.c;
      const R0 = Math.max(7, (s.r || 4) + 3), n = Math.round(R0 * 0.75), th = Math.max(1, Math.round((s.r || 4) / 3));
      for (let i = -n; i <= n; i++) {
        const b = a + i * (1.1 / n), r = R0 - Math.abs(i) * (R0 / (n * 4));
        for (let t = 0; t < th; t++) px(s.x + Math.cos(b) * (r - t) - Math.cos(a) * 4, s.y + Math.sin(b) * (r - t) - Math.sin(a) * 4, Math.abs(i) < n * 0.75 ? c1 : c2);
        if (Math.abs(i) < n * 0.6) px(s.x + Math.cos(b) * (r + 1) - Math.cos(a) * 4, s.y + Math.sin(b) * (r + 1) - Math.sin(a) * 4, P.paper);
      }
      glow(s.x, s.y, c1, R0 + 3, 0.35 * k + 0.15);
      if (Math.random() < 0.5) part(s.x + rnd(-4, 4), s.y + rnd(-4, 4), -s.vx * 0.1, -s.vy * 0.1, rnd(0.3, 0.6), Math.random() < 0.6 ? '#ffb7d5' : P.paper, { drag: 3 });
    } else if (s.kind === 'shuriken') {
      const a = s.spin;
      line(s.x - Math.cos(a) * 3, s.y - Math.sin(a) * 3, s.x + Math.cos(a) * 3, s.y + Math.sin(a) * 3, P.bone);
      line(s.x - Math.cos(a + 1.57) * 3, s.y - Math.sin(a + 1.57) * 3, s.x + Math.cos(a + 1.57) * 3, s.y + Math.sin(a + 1.57) * 3, P.bone);
      px(s.x, s.y, P.paper);
    } else if (s.kind === 'star') {
      // awakened Morrow's starfire: a spinning four-point star, white-hot at the core with gold rays, trailing a pink comet
      const a = s.t * 14, L = s.r + 3 + Math.sin(G.time * 40) * 0.6, tx = s.x - s.vx * 0.05, ty = s.y - s.vy * 0.05;
      line(s.x, s.y, tx, ty, '#ff4fa8', 2); line(s.x, s.y, s.x - s.vx * 0.03, s.y - s.vy * 0.03, '#ffd447');
      glow(tx, ty, '#ff4fa8', 7, 0.45);
      for (let i = 0; i < 4; i++) { const b = a + (i * Math.PI) / 2, l = i % 2 ? L * 0.7 : L; line(s.x, s.y, s.x + Math.cos(b) * l, s.y + Math.sin(b) * l, i % 2 ? '#ffd447' : '#fff6d8'); }
      disc(s.x, s.y, 2, '#ffd447'); px(s.x, s.y, '#ffffff');
      glow(s.x, s.y, '#ffd447', 11, 0.7);
      if (Math.random() < 0.6) part(s.x + rnd(-2, 2), s.y + rnd(-2, 2), -s.vx * 0.15 + rnd(-15, 15), -s.vy * 0.15 + rnd(-15, 15), rnd(0.2, 0.45), Math.random() < 0.5 ? '#ffd447' : '#ff4fa8', { drag: 3, glow: true });
    } else if (s.kind === 'rocket') {
      line(s.x, s.y, s.x - s.vx * 0.03, s.y - s.vy * 0.03, P.bone, 2);
      px(s.x, s.y, P.paper);
      glow(s.x - s.vx * 0.03, s.y - s.vy * 0.03, P.ember, 6, 0.5);
    } else if (s.arrow && s.owner === 'enemy') {
      // an arrow: a wooden shaft, a steel head and pale fletching
      const a = Math.atan2(s.vy, s.vx), cx = Math.cos(a), cy = Math.sin(a);
      line(s.x - cx * 7, s.y - cy * 7, s.x, s.y, '#a07040');
      px(s.x + cx, s.y + cy, P.paper); px(s.x, s.y, '#cfe0f5');
      line(s.x - cx * 7 - cy * 1.5, s.y - cy * 7 + cx * 1.5, s.x - cx * 5, s.y - cy * 5, '#e8e0c8');
      line(s.x - cx * 7 + cy * 1.5, s.y - cy * 7 - cx * 1.5, s.x - cx * 5, s.y - cy * 5, '#e8e0c8');
    } else {
      if (s.owner === 'player') line(s.x, s.y, s.x - s.vx * 0.03, s.y - s.vy * 0.03, s.c);
      disc(s.x, s.y, s.r, s.c);
      px(s.x, s.y, P.paper);
      if (s.noparry) ring(s.x, s.y, s.r + 1, 1, P.ember);
      glow(s.x, s.y, s.c, 9, 0.5);
    }
  }
  remap(null);

  const blink = Math.floor(G.time * 30) % 2;
  for (const q of G.parts) {
    if (q.t > q.life * 0.75 && !q.blood && blink) continue;
    rect(q.x, q.y - q.z, q.s, q.s, q.c);
  }
  for (const a of G.amb) px(a.x, a.y, a.c);
  if (!fx.lowFx) {
    glowBegin();
    for (const q of G.parts) if (q.glow && q.t < q.life * 0.5) glowAt(q.x, q.y - q.z, q.c, 3, 0.35);
    for (const a of G.amb) if (a.glow) glowAt(a.x, a.y, a.c, 4, 0.4 * Math.sin((a.t / a.life) * Math.PI));
    glowEnd();
  }

  for (const b of G.bolts) { remap(b.pfx ? G.awPal : null); drawBolt(b, b.c1, b.c2, b.c3); }
  remap(null);
  for (const g of G.glitches) {
    // glitch blocks: green, magenta and white slices that jitter
    const k = 1 - g.t / g.life;
    for (let i = 0; i < g.n * k; i++) {
      const w = rnd(3, g.w), h = rnd(1, 3);
      rect(g.x + rnd(-g.w, g.w) / 2 - w / 2, g.y + rnd(-g.h, g.h) / 2, w, h, (g.pal || ['#39ff6a', '#ff4fa8', P.paper, '#1a1a20'])[Math.floor(rnd(4))]);
    }
  }
  for (const r of G.rings) ring(r.x, r.y, r.r, Math.max(1, Math.round(r.th * (1 - r.t / r.life))), r.c);

  for (const t of G.texts) {
    const pop = t.t < 0.07 ? 1 : 0, jit = t.sc >= 2 && t.g && t.t < 0.15 ? Math.round(rnd(-1, 1)) : 0;
    if (t.t > t.life * 0.7 && Math.floor(G.time * 25) % 2) continue;
    textO(t.s, t.x + jit, t.y, t.c, t.sc + pop, 'c');
  }

  G.cine?.draw?.(cx, cy);
  drawCineTail('draw');
  ctx.restore();
  if (G.dark > 0) drawDark();
  if (G.sunrise) {
    const sun = G.sunrise, k = clamp(sun.t / 2.25, 0, 1), lift = k * (2 - k);
    const x = (sun.x - cx) * (1-lift) + W * 0.5 * lift, y = (sun.y - cy) * (1-lift) + 39 * lift;
    const r = 3 + 13 * lift;
    fillScreen('#ffaf59', k * 0.19);
    glow(x,y,'#ffad53',22+k*48,0.7);
    for(let i=0;i<12;i++){const a=i*TAU/12+sun.t*0.12; line(x+Math.cos(a)*(r+4),y+Math.sin(a)*(r+4),x+Math.cos(a)*(r+7+9*k),y+Math.sin(a)*(r+7+9*k),P.ember3);}
    disc(x,y,r,'#ffb947'); disc(x-1,y-1,r-2,'#fff1ad');
  }
  // a new floor of the descent: black for a moment, then the floor fades in
  if (G.descend > 0) fillScreen(P.void, Math.min(1, G.descend * 1.4));
}

// the final boss's last phase: everything outside a small circle around you goes dark
// (screen wide: the stage and its sides)
let darkLayer = makeCanvas(FW, H), dkg = darkLayer.getContext('2d');
onWidth(() => { darkLayer = makeCanvas(FW, H); dkg = darkLayer.getContext('2d'); });
function drawDark() {
  const p = G.p, sx = Math.round(p.x - fx.cam.x - fx.ox + SX), sy = Math.round(p.y - 6 - fx.cam.y - fx.oy);
  dkg.globalCompositeOperation = 'source-over';
  dkg.clearRect(0, 0, FW, H);
  dkg.fillStyle = '#030206';
  dkg.globalAlpha = 0.88 * G.dark;
  dkg.fillRect(0, 0, FW, H);
  dkg.globalCompositeOperation = 'destination-out';
  for (let r = 70; r > 20; r -= 10) { dkg.globalAlpha = 0.25; dkg.beginPath(); dkg.arc(sx, sy, r, 0, TAU); dkg.fill(); }
  dkg.globalAlpha = 1;
  dkg.globalCompositeOperation = 'source-over';
  ctx.drawImage(darkLayer, -SX, 0);
}
