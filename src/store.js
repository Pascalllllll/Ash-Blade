// localStorage is optional: private windows and blocked storage just fall back to defaults.
const KEY_SETTINGS = 'ashblade.settings.v2';
const KEY_BEST = 'ashblade.best.v2';

// Every choice the settings menu can make. Saved values outside these lists are thrown away.
export const OPTIONS = {
  track: ['AUTO', 'PIT DIRGE', 'BLOODRUSH', 'NEON PULSE', 'ASHEN HYMN', 'WARDEN', 'BROOD', 'COLOSSUS', 'KINGFALL', 'OFF'],
  combat: ['PIT DIRGE', 'BLOODRUSH', 'NEON PULSE'],
  theme: ['EMBER', 'FROST', 'TOXIC', 'BLOOD MOON', 'ROYAL', 'NOIR'],
  particles: ['HIGH', 'LOW'],
  map: ['PIT', 'FROST', 'FORGE', 'GRID', 'SHRINE'],
  diff: ['EASY', 'NORMAL', 'HARD', 'NIGHTMARE'],
  char: ['BLADE', 'GUNNER', 'WIZARD', 'NINJA', 'MECHANIC', 'TANK', 'ROBOT'],
};

const DEFAULTS = {
  master: 1, music: 0.6, sfx: 0.9, track: 'AUTO', combat: 'PIT DIRGE',
  theme: 'EMBER', vibrancy: 1, bright: 1, contrast: 1, hue: 0, crt: false,
  shake: 1, flash: true, numbers: true, particles: 'HIGH',
  map: 'PIT', diff: 'NORMAL', char: 'BLADE',
};
const RANGES = { master: [0, 1], music: [0, 1], sfx: [0, 1], vibrancy: [0, 2], bright: [0.6, 1.4], contrast: [0.6, 1.6], hue: [0, 345], shake: [0, 1] };

export const settings = { ...DEFAULTS };
export const best = { score: 0, wave: 0, won: false, chars: {} };

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
    for (const k of ['crt', 'flash', 'numbers']) settings[k] = typeof s[k] === 'boolean' ? s[k] : DEFAULTS[k];
    for (const k in OPTIONS) settings[k] = OPTIONS[k].includes(s[k]) ? s[k] : DEFAULTS[k];
  }
  const b = read(KEY_BEST);
  if (b) {
    best.score = Math.floor(num(b.score, 0, 1e10, 0));
    best.wave = Math.floor(num(b.wave, 0, 9999, 0));
    best.won = b.won === true;
    if (b.chars && typeof b.chars === 'object') {
      for (const c of OPTIONS.char) {
        const r = b.chars[c];
        if (r && typeof r === 'object') best.chars[c] = { score: Math.floor(num(r.score, 0, 1e10, 0)), wave: Math.floor(num(r.wave, 0, 9999, 0)), won: r.won === true };
      }
    }
  }
}
export const saveSettings = () => write(KEY_SETTINGS, settings);
export const saveBest = () => write(KEY_BEST, best);
export function resetSettings() { Object.assign(settings, DEFAULTS); saveSettings(); }

// ---------- saved run: a checkpoint written at the start of every wave ----------
const KEY_RUN = 'ashblade.run.v1';
const int = (v, lo, hi) => (Number.isInteger(v) && v >= lo && v <= hi ? v : null);
export function saveRun(r) { write(KEY_RUN, r); }
export function clearRun() { try { localStorage.removeItem(KEY_RUN); } catch { /* storage unavailable */ } }
export function loadRun(isUpgrade) {
  const r = read(KEY_RUN);
  if (!r || r.v !== 1) return null;
  if (!OPTIONS.char.includes(r.char) || !OPTIONS.map.includes(r.map) || !OPTIONS.diff.includes(r.diff)) return null;
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
