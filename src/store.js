// localStorage is optional: private windows and blocked storage just fall back to defaults.
const KEY_SETTINGS = 'ashblade.settings.v2';
const KEY_BEST = 'ashblade.best.v2';

// Every choice the settings menu can make. Saved values outside these lists are thrown away.
export const OPTIONS = {
  track: ['AUTO', 'LAST LIGHT', 'HYPERDRIVE', 'PIT DIRGE', 'BLOODRUSH', 'NEON PULSE', 'ASHEN HYMN', 'TALE OF ASH', 'DAWN', 'WARDEN', 'BROOD', 'COLOSSUS', 'KINGFALL', 'VOID', 'TEMPEST', 'REFLECTION', 'ECLIPSE', 'LAST NIGHT', 'ENDLESS NIGHT', 'OFF'],
  combat: ['HYPERDRIVE', 'PIT DIRGE', 'BLOODRUSH', 'NEON PULSE'],
  theme: ['EMBER', 'FROST', 'TOXIC', 'BLOOD MOON', 'ROYAL', 'NOIR'],
  particles: ['HIGH', 'LOW'],
  map: ['PIT', 'FROST', 'FORGE', 'GRID', 'SHRINE'],
  diff: ['EASY', 'NORMAL', 'HARD', 'NIGHTMARE'],
  char: ['BLADE', 'GUNNER', 'WIZARD', 'NINJA', 'MECHANIC', 'TANK', 'ROBOT', 'DEV'],
  vibe: ['OFF', 'LIGHT', 'MEDIUM', 'STRONG'],
  blood: ['10 SEC', '30 SEC', 'NEVER FADES'],
  res: ['AUTO', 'SHARP', '1280X720', '1600X900', '1920X1080', '2560X1440'],
  // TESTING, temporary (the TEST tab in settings): where a new run starts
  testStart: ['OFF', 'WAVE 20', 'WAVE 45', 'WAVE 50', 'NIGHT'],
};

const DEFAULTS = {
  master: 1, music: 0.6, sfx: 0.9, track: 'AUTO', combat: 'HYPERDRIVE',
  theme: 'EMBER', vibrancy: 1, bright: 1, contrast: 1, hue: 0, crt: false,
  shake: 0.25, flash: true, numbers: true, particles: 'HIGH',
  map: 'PIT', diff: 'NORMAL', char: 'BLADE', vibe: 'MEDIUM', blood: '10 SEC', res: 'AUTO',
  // TESTING, temporary: nothing can hurt you; runs start at a later wave
  god: false, testStart: 'OFF',
};
const RANGES = { master: [0, 1], music: [0, 1], sfx: [0, 1], vibrancy: [0, 2], bright: [0.6, 1.4], contrast: [0.6, 1.6], hue: [0, 345], shake: [0, 1] };

export const settings = { ...DEFAULTS, ver: 4 };
// unlocked: fighters you can pick. kills is lifetime; combo and perfects are the best single run.
// night: the longest the endless night has been held, in seconds
export const best = { score: 0, wave: 0, won: false, chars: {}, unlocked: ['BLADE'], kills: 0, combo: 0, perfects: 0, night: 0 };
// TESTING SWITCH, temporary: a very strong game, to reach the awakened looks fast. While it is true: every fighter
// is pickable, every hit does 6 times the damage, fighters start with 20 more health, an upgrade counts as maxed after
// one pick (so its evolution is offered on the next upgrade screen), one evolution awakens the fighter, the HUD shows
// TEST BUFF ON, and runs don't save scores or unlocks. Set it to false to go back to the normal game.
export const TEST_BUFF = false;
// Testing switch: true makes every fighter pickable (unlock progress is still tracked). Keep it false for release.
const OPEN_ROSTER = false || TEST_BUFF;
export const isUnlocked = (id) => OPEN_ROSTER || best.unlocked.includes(id);

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw || raw.length > 4000) return null;
    const v = JSON.parse(raw);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
  } catch { return null; }
}
function write(key, v) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage unavailable */ }
}
const num = (v, lo, hi, d) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);

export function loadAll() {
  const s = read(KEY_SETTINGS);
  if (s) {
    for (const k in RANGES) settings[k] = num(s[k], RANGES[k][0], RANGES[k][1], DEFAULTS[k]);
    for (const k of ['crt', 'flash', 'numbers', 'god']) settings[k] = typeof s[k] === 'boolean' ? s[k] : DEFAULTS[k];
    for (const k in OPTIONS) settings[k] = OPTIONS[k].includes(s[k]) ? s[k] : DEFAULTS[k];
    // settings saved before HYPERDRIVE existed move to it once
    if (!(s.ver >= 3)) { settings.combat = 'HYPERDRIVE'; settings.track = 'AUTO'; }
    // settings saved before the gentler default move to 25% screen shake once
    if (!(s.ver >= 4)) settings.shake = DEFAULTS.shake;
  }
  const b = read(KEY_BEST);
  if (b) {
    best.score = Math.floor(num(b.score, 0, 1e10, 0));
    best.wave = Math.floor(num(b.wave, 0, 9999, 0));
    best.won = b.won === true;
    best.kills = Math.floor(num(b.kills, 0, 1e9, 0));
    best.combo = Math.floor(num(b.combo, 0, 1e7, 0));
    best.perfects = Math.floor(num(b.perfects, 0, 1e6, 0));
    best.night = Math.floor(num(b.night, 0, 1e7, 0));
    if (Array.isArray(b.unlocked)) best.unlocked = ['BLADE', ...new Set(b.unlocked.filter((c) => OPTIONS.char.includes(c) && c !== 'BLADE'))];
    if (b.chars && typeof b.chars === 'object') {
      for (const c of OPTIONS.char) {
        const r = b.chars[c];
        if (r && typeof r === 'object') best.chars[c] = { score: Math.floor(num(r.score, 0, 1e10, 0)), wave: Math.floor(num(r.wave, 0, 9999, 0)), won: r.won === true };
      }
    }
  }
}
export const saveSettings = () => write(KEY_SETTINGS, settings);
// TESTING, temporary: a run in god mode or started at a later wave doesn't count for records or unlocks
export const testing = () => settings.god || settings.testStart !== 'OFF';
export const saveBest = () => { if (!TEST_BUFF && !testing()) write(KEY_BEST, best); };
export function resetSettings() { Object.assign(settings, DEFAULTS); saveSettings(); }

// ---------- saved run: a checkpoint written at the start of every wave ----------
const KEY_RUN = 'ashblade.run.v1';
const int = (v, lo, hi) => (Number.isInteger(v) && v >= lo && v <= hi ? v : null);
export function saveRun(r) { write(KEY_RUN, r); }
export function clearRun() { try { localStorage.removeItem(KEY_RUN); } catch { /* storage unavailable */ } }
export function loadRun(isUpgrade) {
  const r = read(KEY_RUN);
  if (!r || r.v !== 1) return null;
  if (!OPTIONS.char.includes(r.char) || !isUnlocked(r.char) || !OPTIONS.map.includes(r.map) || !OPTIONS.diff.includes(r.diff)) return null;
  const out = {
    v: 1, char: r.char, map: r.map, diff: r.diff,
    wave: int(r.wave, 1, 9999), score: int(r.score, 0, 1e10), kills: int(r.kills, 0, 1e7), maxCombo: int(r.maxCombo, 0, 1e6),
    bestRank: int(r.bestRank, 0, 6), time: int(r.time, 0, 1e7), hp: int(r.hp, 1, 99), maxHp: int(r.maxHp, 1, 99),
    energy: int(r.energy, 0, 100), ult: int(r.ult, 0, 100), dashMax: int(r.dashMax, 1, 4), won: r.won === true, taken: {},
  };
  for (const k in out) if (out[k] === null) return null;
  if (out.hp > out.maxHp) return null;
  if (!r.taken || typeof r.taken !== 'object' || Array.isArray(r.taken)) return null;
  for (const id of Object.keys(r.taken)) {
    const n = int(r.taken[id], 1, 20);
    if (n === null || !isUpgrade(id)) return null;
    out.taken[id] = n;
  }
  return out;
}
