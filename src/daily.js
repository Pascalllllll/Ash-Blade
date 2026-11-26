// The quest board's daily missions: three a day, the same for everyone on the same date, picked from POOL by a
// number made from the date. Progress counts in every real run that day (not practice, not training): world.js calls
// dailyNote (counts) and dailyMax (bests in one run). When one is done, claim its gold at the board in the camp.
// A new day brings three new missions. Kept in best.daily (store.js); saved with the rest of the record.
import { best, saveBest } from './store.js?v=216';

const POOL = [
  { id: 'kills', text: (n) => 'KILL ' + n + ' MONSTERS', goals: [120, 170, 240], reward: [3, 4, 5] },
  { id: 'bosses', text: (n) => 'BEAT ' + n + (n > 1 ? ' BOSSES' : ' BOSS'), goals: [1, 2, 3], reward: [3, 5, 7] },
  { id: 'wave', text: (n) => 'REACH WAVE ' + n + ' IN ONE RUN', goals: [8, 12, 16], reward: [3, 4, 6] },
  { id: 'combo', text: (n) => 'LAND A ' + n + '-HIT COMBO', goals: [30, 45, 60], reward: [3, 4, 5] },
  { id: 'perfects', text: (n) => 'PERFECT-DODGE ' + n + ' TIMES', goals: [4, 7, 10], reward: [3, 4, 5] },
  { id: 'dashes', text: (n) => 'DASH ' + n + ' TIMES', goals: [50, 80, 120], reward: [2, 3, 4] },
  { id: 'skills', text: (n) => 'USE SKILLS ' + n + ' TIMES', goals: [25, 40, 60], reward: [2, 3, 4] },
  { id: 'elites', text: (n) => 'KILL ' + n + ' ELITES', goals: [4, 7, 10], reward: [3, 4, 5] },
  { id: 'lootlings', text: (n) => 'CATCH ' + n + (n > 1 ? ' LOOTLINGS' : ' LOOTLING'), goals: [1, 2, 3], reward: [3, 4, 6] },
  { id: 'ults', text: (n) => 'USE YOUR ULTIMATE ' + n + ' TIMES', goals: [3, 5, 8], reward: [2, 3, 4] },
  { id: 'props', text: (n) => 'SMASH ' + n + ' THINGS', goals: [20, 35, 50], reward: [2, 3, 4] },
  { id: 'critters', text: (n) => 'SQUASH ' + n + ' CRITTERS', goals: [6, 10, 15], reward: [2, 3, 4] },
];
const BEST_IN_ONE_RUN = new Set(['wave', 'combo']);
export function dailyDay(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
function seeded(str) { let s = 2166136261; for (const ch of str) s = Math.imul(s ^ ch.charCodeAt(0), 16777619) >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
// today's three, made fresh when the date changes
function ensure() {
  const day = dailyDay();
  if (best.daily?.day === day && best.daily.list?.length === 3 && best.daily.list.every((m) => POOL.some((p) => p.id === m.id))) return best.daily;
  const r = seeded(day), pool = POOL.slice(), list = [];
  while (list.length < 3) {
    const m = pool.splice(Math.floor(r() * pool.length), 1)[0], tier = Math.floor(r() * 3);
    list.push({ id: m.id, goal: m.goals[tier], reward: m.reward[tier], got: 0, claimed: false });
  }
  best.daily = { day, list };
  return best.daily;
}
export function dailyList() { return ensure().list.map((m) => ({ ...m, text: POOL.find((p) => p.id === m.id).text(m.goal) })); }
// something counted (kills, bosses, dashes...); both return the texts of missions this just finished, for the fight
// to announce
const textOf = (m) => POOL.find((p) => p.id === m.id).text(m.goal);
export function dailyNote(id, n = 1) {
  const done = [];
  for (const m of ensure().list) if (m.id === id && !m.claimed && m.got < m.goal) { m.got = Math.min(m.goal, m.got + n); if (m.got >= m.goal) done.push(textOf(m)); }
  return done;
}
// a best in one run (the deepest wave, the longest combo)
export function dailyMax(id, v) {
  const done = [];
  for (const m of ensure().list) if (m.id === id && !m.claimed && m.got < m.goal && BEST_IN_ONE_RUN.has(id)) { m.got = Math.min(m.goal, Math.max(m.got, v)); if (m.got >= m.goal) done.push(textOf(m)); }
  return done;
}
export const dailyReady = () => ensure().list.filter((m) => !m.claimed && m.got >= m.goal).length;
// claim a finished mission's gold; how much it paid (0 if it can't be claimed)
export function dailyClaim(i) {
  const m = ensure().list[i];
  if (!m || m.claimed || m.got < m.goal) return 0;
  m.claimed = true; best.gold += m.reward; saveBest();
  return m.reward;
}
