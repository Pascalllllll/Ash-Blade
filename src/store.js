// localStorage is optional: private windows and blocked storage just fall back to defaults.
const KEY_SETTINGS = 'ashblade.settings.v2';
const KEY_BEST = 'ashblade.best.v2';

// Every choice the settings menu can make. Saved values outside these lists are thrown away.
export const OPTIONS = {
  track: ['AUTO', 'LAST LIGHT', 'HYPERDRIVE', 'PIT DIRGE', 'BLOODRUSH', 'NEON PULSE', 'ASHEN HYMN', 'TALE OF ASH', 'DAWN', 'WARDEN', 'BROOD', 'COLOSSUS', 'KINGFALL', 'VOID', 'TEMPEST', 'REFLECTION', 'ECLIPSE', 'LAST NIGHT', 'ENDLESS NIGHT', 'OFF'],
  combat: ['HYPERDRIVE', 'PIT DIRGE', 'BLOODRUSH', 'NEON PULSE'],
  theme: ['EMBER', 'FROST', 'TOXIC', 'BLOOD MOON', 'ROYAL', 'NOIR'],
  particles: ['HIGH', 'LOW'],
  // the descent goes down a floor after every boss; the rest keep one floor for the whole run
  map: ['DESCENT', 'PIT', 'NEST', 'FORGE', 'THRONE', 'VOID', 'FROST', 'GLASS', 'TEMPLE', 'GEARS', 'NIGHT', 'SHRINE', 'GRID'],
  diff: ['EASY', 'NORMAL', 'HARD', 'NIGHTMARE'],
  char: ['BLADE', 'GUNNER', 'WIZARD', 'NINJA', 'MECHANIC', 'TANK', 'ROBOT', 'DEV'],
  vibe: ['OFF', 'LIGHT', 'MEDIUM', 'STRONG'],
  blood: ['10 SEC', '30 SEC', 'NEVER FADES'],
  res: ['AUTO', 'SHARP', '1280X720', '1600X900', '1920X1080', '2560X1440'],
  // TESTING, temporary (the TEST tab in settings): where a new run starts
  testStart: ['OFF', ...Array.from({ length: 10 }, (_, i) => 'WAVE ' + (i + 1) * 5), 'NIGHT'],
};

const DEFAULTS = {
  master: 1, music: 0.6, sfx: 0.9, track: 'AUTO', combat: 'HYPERDRIVE',
  theme: 'EMBER', vibrancy: 1, bright: 1, contrast: 1, hue: 0, crt: false,
  shake: 0.25, flash: true, numbers: true, particles: 'HIGH',
  map: 'DESCENT', diff: 'NORMAL', char: 'BLADE', vibe: 'MEDIUM', blood: '10 SEC', res: 'AUTO',
  // TESTING, temporary: nothing can hurt you; runs start at a later wave
  god: false, testStart: 'OFF', testBuffs: false, testCharge: false, testRoster: false,
};
const RANGES = { master: [0, 1], music: [0, 1], sfx: [0, 1], vibrancy: [0, 2], bright: [0.6, 1.4], contrast: [0.6, 1.6], hue: [0, 345], shake: [0, 1] };

export const settings = { ...DEFAULTS, ver: 5 };
// unlocked: fighters you can pick. kills is lifetime; combo and perfects are the best single run.
// night: the longest the endless night has been held, in seconds
export const best = { score: 0, wave: 0, won: false, chars: {}, unlocked: ['BLADE'], kills: 0, combo: 0, perfects: 0, night: 0, codex: {} };
// the Compendium's record of what has been found: monsters killed (by type), bosses beaten, floors reached, endings
// seen, evolutions taken and fighters awakened, each a count. Practice and test runs don't add to it.
export const CODEX = ['foes', 'bosses', 'floors', 'endings', 'evos', 'awake'];
for (const k of CODEX) best.codex[k] = {};
export function codexNote(cat, key, n = 1) {
  if (testing() || !key) return;
  const c = best.codex[cat] ||= {};
  c[key] = Math.min(1e9, (c[key] || 0) + n);
}

// TESTING SWITCH, temporary: a very strong game, to reach the awakened looks fast. While it is true: every fighter
// is pickable, every hit does 6 times the damage, fighters start with 20 more health, an upgrade counts as maxed after
// one pick (so its evolution is offered on the next upgrade screen), one evolution awakens the fighter, the HUD shows
// TEST BUFF ON, and runs don't save scores or unlocks. Set it to false to go back to the normal game.
export const TEST_BUFF = false;
// Testing switch: true makes every fighter pickable (unlock progress is still tracked). Keep it false for release.
const OPEN_ROSTER = false || TEST_BUFF;
export const isUnlocked = (id) => OPEN_ROSTER || settings.testRoster || best.unlocked.includes(id);

function read(key, limit = 32768) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw || raw.length > limit) return null;
    const v = JSON.parse(raw);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
  } catch { return null; }
}
function write(key, v) {
  try { localStorage.setItem(key, JSON.stringify(v)); return true; } catch { return false; }
}
const num = (v, lo, hi, d) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);

export function loadAll() {
  const s = read(KEY_SETTINGS);
  if (s) {
    for (const k in RANGES) settings[k] = num(s[k], RANGES[k][0], RANGES[k][1], DEFAULTS[k]);
    for (const k of ['crt', 'flash', 'numbers', 'god', 'testBuffs', 'testCharge', 'testRoster']) settings[k] = typeof s[k] === 'boolean' ? s[k] : DEFAULTS[k];
    for (const k in OPTIONS) settings[k] = OPTIONS[k].includes(s[k]) ? s[k] : DEFAULTS[k];
    // settings saved before HYPERDRIVE existed move to it once
    if (!(s.ver >= 3)) { settings.combat = 'HYPERDRIVE'; settings.track = 'AUTO'; }
    // settings saved before the gentler default move to 25% screen shake once
    if (!(s.ver >= 4)) settings.shake = DEFAULTS.shake;
    // settings saved before the descent existed move to it once
    settings.map = 'DESCENT'; settings.theme = 'EMBER'; settings.hue = 0;
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
    // the training is shown once; anyone who has played before has seen how to play
    best.tut = b.tut === true || best.wave > 0;
    for (const k of CODEX) {
      const src = b.codex?.[k], out = (best.codex[k] = {});
      if (src && typeof src === 'object' && !Array.isArray(src)) for (const key of Object.keys(src).slice(0, 200)) if (/^[A-Za-z0-9_]{1,24}$/.test(key)) out[key] = Math.floor(num(src[key], 0, 1e9, 0));
    }
    // older records: the bosses and floors a best wave must have passed, the endings of fighters who won
    if (!b.codex) for (const c of OPTIONS.char) if (best.chars[c]?.won) best.codex.endings[c] = 1;
    if (Array.isArray(b.unlocked)) best.unlocked = ['BLADE', ...new Set(b.unlocked.filter((c) => OPTIONS.char.includes(c) && c !== 'BLADE'))];
    if (b.chars && typeof b.chars === 'object') {
      for (const c of OPTIONS.char) {
        const r = b.chars[c];
        if (r && typeof r === 'object') best.chars[c] = {
          score: Math.floor(num(r.score, 0, 1e12, 0)), wave: Math.floor(num(r.wave, 0, 9999, 0)),
          won: r.won === true || r.wave > 20, nox: r.nox === true || r.wave >= 51,
          night: Math.floor(num(r.night, 0, 1e7, 0)),
        };
      }
    }
  }
}
export const saveSettings = () => write(KEY_SETTINGS, settings);
// TESTING, temporary: a run in god mode or started at a later wave doesn't count for records or unlocks
export const testing = () => TEST_BUFF || settings.god || settings.testStart !== 'OFF' || settings.testBuffs || settings.testCharge || settings.testRoster;
export const saveBest = () => { if (!TEST_BUFF && !testing()) write(KEY_BEST, best); };
export function resetSettings() { Object.assign(settings, DEFAULTS); saveSettings(); }

// ---------- saved run: a checkpoint written at the start of every wave ----------
const KEY_RUN = 'ashblade.run.v1';
const KEY_PRACTICE = 'ashblade.practice.v1', LAST_SLOT = 'ashblade.last-slot';
const int = (v, lo, hi) => (Number.isInteger(v) && v >= lo && v <= hi ? v : null);
export function saveRun(r) {
  const key = r.tested ? KEY_PRACTICE : KEY_RUN;
  if (!write(key, r)) return false;
  try { localStorage.setItem(LAST_SLOT, key); } catch { /* the checkpoint itself is already saved */ }
  return true;
}
export function clearRun(practice) {
  try {
    if (practice !== true) localStorage.removeItem(KEY_RUN);
    if (practice !== false) localStorage.removeItem(KEY_PRACTICE);
  } catch { /* storage unavailable */ }
}
export function loadRun(isUpgrade, practice) {
  if (practice != null) return readRun(practice ? KEY_PRACTICE : KEY_RUN, isUpgrade);
  let last;
  try { last = localStorage.getItem(LAST_SLOT); } catch { return null; }
  const first = last === KEY_PRACTICE ? KEY_PRACTICE : KEY_RUN;
  return readRun(first, isUpgrade) || readRun(first === KEY_RUN ? KEY_PRACTICE : KEY_RUN, isUpgrade);
}
function readRun(key, isUpgrade) {
  const r = read(key);
  if (!r || r.v !== 1) return null;
  if (!OPTIONS.char.includes(r.char) || !OPTIONS.map.includes(r.map) || !OPTIONS.diff.includes(r.diff)) return null;
  const out = {
    v: 1, char: r.char, map: r.map, diff: r.diff,
    wave: int(r.wave, 1, 9999), score: int(r.score, 0, Number.MAX_SAFE_INTEGER), kills: int(r.kills, 0, 1e8), maxCombo: int(r.maxCombo, 0, 1e7),
    bestRank: int(r.bestRank, 0, 6), time: int(r.time, 0, 1e7), hp: int(r.hp, 1, 99), maxHp: int(r.maxHp, 1, 99),
    energy: int(r.energy, 0, 100), ult: int(r.ult, 0, 100), dashMax: int(r.dashMax, 1, 12), won: r.won === true, taken: {},
    tested: key === KEY_PRACTICE || r.tested === true, nox: r.nox === true || (r.nox === undefined && r.wave > 50),
    awakened: r.awakened === true, phoenixUsed: r.phoenixUsed === true, undyingUsed: r.undyingUsed === true,
    nightTime: num(r.nightTime, 0, 1e7, 0), extra: {},
  };
  for (const k in out) if (out[k] === null) return null;
  if (out.hp > out.maxHp) return null;
  if (!r.taken || typeof r.taken !== 'object' || Array.isArray(r.taken)) return null;
  for (const id of Object.keys(r.taken)) {
    // MEND is a repeatable heal. Old runs counted it along with permanent upgrades.
    if (id === 'mend') continue;
    const n = int(r.taken[id], 1, 20);
    if (n === null || !isUpgrade(id)) return null;
    out.taken[id] = n;
  }
  for (const k of ['dmg', 'bosses', 'loot', 'bestMulti', 'perfects', 'debtKills'])
    out.extra[k] = num(r.extra?.[k], 0, Number.MAX_SAFE_INTEGER, 0);
  if (r.awakened === undefined && Object.keys(out.taken).filter(id => id.startsWith('evo')).length >= 4)
    out.awakened = true;
  return out;
}
