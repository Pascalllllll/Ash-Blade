// The training: on a player's very first run, and again from the camp's dummy. It takes the place of wave 1's
// monsters until it is done: a lesson at a time, a panel at the top says what to do and ticks it off. Each lesson
// brings its own enemies to practise on, and the ones for a move are SEALED: a ring of that move's color round them
// and its key over their heads, and nothing but that move can hurt them (anything else just says USE Q, or HOLD, or
// R). So you learn every move by using it on something: cut the husks down, dash through an archer's arrows, break
// armor with a charged attack, kill sealed husks with Q, then E, then your ultimate. Nothing can hurt you while you
// train. When the last lesson is done (or Tab / tapping the panel skips it), wave 1 starts for real (or, from the
// dummy, you go back to camp) and the record remembers training was seen.
import { ctx, W, P, rect, text, textO, textW, glow, ring, px } from './gfx.js?v=212';
import { A } from './audio.js?v=212';
import { input, keyHit } from './input.js?v=212';
import { keyLabel } from './bindings.js?v=212';
import { best, saveBest } from './store.js?v=212';
import { G, B, rnd, clamp, hyp, addRing, addText, buildQueue, DASH_COST, part } from './world.js?v=212';

const touch = () => input.touch;
const moveKeys = () => ['up', 'left', 'down', 'right'].map(keyLabel).join('');
const key = (k) => (touch() ? k.toUpperCase() : keyLabel(k));
// how each seal looks and what breaks it: the window a move opens (seconds after you use it) in which it hurts them
const SEAL = {
  charge: { col: '#ffd447', tag: () => 'HOLD', win: 2 },
  q: { col: '#62efff', tag: () => key('q'), win: 8 },
  e: { col: '#c599ff', tag: () => key('e'), win: 8 },
  ult: { col: '#ff6a3c', tag: () => key('r'), win: 9 },
};
// each lesson: what it asks for, how it begins (set), whether it's done (check: 0..1), and what the panel says
const STEPS = [
  {
    id: 'move', title: 'MOVE',
    lines: () => [touch() ? 'DRAG YOUR LEFT THUMB TO RUN' : 'RUN WITH ' + moveKeys(), 'NOTHING CAN HURT YOU WHILE YOU TRAIN'],
    set(t) { t.x = G.p.x; t.y = G.p.y; t.walked = 0; },
    check(t) { t.walked += hyp(G.p.x - t.x, G.p.y - t.y); t.x = G.p.x; t.y = G.p.y; return t.walked > 140 ? 1 : t.walked / 140; },
  },
  {
    id: 'attack', title: 'ATTACK: ' + 'CUT THEM DOWN',
    lines: () => [touch() ? 'TAP THE RIGHT SIDE TO ATTACK' : 'CLICK OR PRESS ' + keyLabel('attack') + ' TO ATTACK', 'HITS IN A ROW BUILD YOUR COMBO'],
    set(t) { t.foes = foes('husk', 3, 70, 'any'); },
    check(t) { return killed(t.foes); },
  },
  {
    id: 'dash', title: 'DASH: SLIP THE ARROWS',
    lines: () => [(touch() ? 'TAP DASH' : 'PRESS ' + keyLabel('dash')) + ' TO DASH THROUGH ITS ARROWS', 'MID-DASH NOTHING HITS YOU. A DASH: ' + DASH_COST + ' ENERGY'],
    set(t) { G.p.energy = Math.max(G.p.energy, 70); t.base = t.ev.dash || 0; t.foes = foes('archer', 1, 110, 'any'); },
    check(t) { if (G.p.energy < DASH_COST * 2) G.p.energy = DASH_COST * 2; return Math.min(1, ((t.ev.dash || 0) - t.base) / 2); },
  },
  {
    id: 'charge', title: () => 'CHARGED ATTACK: ' + G.kit.charge.name, skip: () => !G.kit.charge,
    lines: () => ['THEIR ARMOR ONLY BREAKS TO A CHARGED ATTACK', 'HOLD ATTACK, THEN LET GO'],
    set(t) { t.foes = foes('husk', 2, 60, 'charge'); },
    check(t) { return fallback(t, killed(t.foes), 'charge'); },
  },
  {
    id: 'q', title: () => 'SKILL: ' + G.kit.q.name,
    lines: () => ['SEALED: ONLY ' + G.kit.q.name + ' (' + key('q') + ') CAN HURT THEM', key('q') + ': ' + G.kit.q.desc + '. SKILLS COST ENERGY'],
    set(t) { G.p.energy = 100; G.p.cdQ = 0; t.foes = foes('husk', 3, 75, 'q'); },
    check(t) { if (G.p.energy < G.kit.q.cost) G.p.energy = 100; return fallback(t, killed(t.foes), 'q'); },
  },
  {
    id: 'e', title: () => 'SKILL: ' + G.kit.e.name,
    lines: () => ['SEALED: ONLY ' + G.kit.e.name + ' (' + key('e') + ') CAN HURT THEM', key('e') + ': ' + G.kit.e.desc],
    set(t) { G.p.energy = 100; G.p.cdE = 0; t.foes = foes('husk', 3, 75, 'e'); },
    check(t) { if (G.p.energy < G.kit.e.cost) G.p.energy = 100; return fallback(t, killed(t.foes), 'e'); },
  },
  {
    id: 'ult', title: () => 'ULTIMATE: ' + G.kit.r.name,
    lines: () => ['YOUR ULTIMATE FILLS AS YOU FIGHT. IT IS FULL NOW', 'ONLY ' + G.kit.r.name + ' (' + key('r') + ') CAN BREAK SO MANY SEALS'],
    set(t) { G.p.ult = 100; t.foes = foes('husk', 6, 62, 'ult'); },
    check(t) { if (!t.used && G.p.ult < 100) G.p.ult = 100; return fallback(t, killed(t.foes), 'ult'); },
  },
  {
    id: 'clear', title: 'FINISH THEM',
    lines: () => ['CLEAR WHAT IS LEFT. GOLD SPARKS HEAL YOU', 'RARE GOLD COINS BUY THINGS AT CAMP'],
    set() { for (const e of G.E) if (e.tutOnly) e.tutOnly = 'any'; },
    check() { return G.E.some((e) => !e.dead && !e.prop) || G.sigils.length ? 0 : 1; },
  },
];
const titleOf = (s) => (typeof s.title === 'function' ? s.title() : s.title);

// enemies for a lesson, arriving through their sigils in a ring round the fighter; only: what can hurt them
function foes(type, n, r, only) {
  const out = [], p = G.p;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd(0.5);
    const x = clamp(p.x + Math.cos(a) * r, B.x0 + 14, B.x1 - 14), y = clamp(p.y + Math.sin(a) * r * 0.7, B.y0 + 14, B.y1 - 10);
    const s = { x, y, type, t: -i * 0.1, life: 0.8, tut: true, tutOnly: only };
    G.sigils.push(s); out.push(s);
  }
  return out;
}
// how many of a lesson's enemies are dead (a sigil becomes its enemy when it finishes; world.js sets s.enemy)
const killed = (list) => list.filter((s) => s.enemy?.dead).length / list.length;
// a lesson whose move can't kill them by itself (a shield, say) still ends a while after it was used
function fallback(t, k, move) {
  if (t.ev[move] > (t.base ?? 0) && t.usedAt === undefined) t.usedAt = t.t;
  if (t.usedAt !== undefined && t.t - t.usedAt > 12) return 1;
  return k;
}

export function startTutorial() {
  G.tut = { i: -1, t: 0, ev: {}, done: 0, k: 0, popT: 0, allow: null };
  next();
}
function next() {
  const t = G.tut;
  // what's left of the last lesson's sealed enemies goes back into the ash
  for (const e of G.E) if (!e.dead && e.tutOnly && e.tutOnly !== 'any') { e.dead = true; for (let i = 0; i < 8; i++) part(e.x, e.y - 8, rnd(-40, 40), -rnd(20, 60), rnd(0.4, 0.8), i % 2 ? '#8a8086' : '#c8bcb4', { drag: 2 }); }
  t.i++;
  while (STEPS[t.i]?.skip?.()) t.i++;
  t.t = 0; t.k = 0; t.done = 0; t.usedAt = undefined; t.used = false;
  const s = STEPS[t.i];
  if (s) { t.base = t.ev[s.id] || 0; s.set(t); }
}
function finish(skipped) {
  const p = G.p;
  G.tut = null;
  for (const e of G.E) if (e.tutOnly) e.tutOnly = null;
  best.tut = true; saveBest();
  if (G.training) { G.trainDone = 1.6; G.banner = { text: skipped ? 'TRAINING SKIPPED' : 'TRAINING DONE', sub: 'BACK TO CAMP', t: 0, life: 1.8, c: P.gold }; if (!skipped) addRing(p.x, p.y - 6, P.gold, 260, 0.4, 2); return; }
  p.hp = p.maxHp; p.energy = 50; p.ult = 0;
  G.queue = buildQueue(1); G.spawnCd = 1.2;
  G.banner = { text: skipped ? 'WAVE 1' : 'TRAINING DONE', sub: skipped ? '' : 'NOW THE REAL FIGHT. WAVE 1', t: 0, life: 2.2, c: P.gold };
  A.waveStart(false);
  if (!skipped) { addRing(p.x, p.y - 6, P.gold, 260, 0.4, 2); A.victory?.(); }
}

// the panel's box on screen (also where a tap skips it)
// the lesson sits in the top left corner under the hearts: no box, nothing over the fight
const PANEL = { x: 6, y: 24, w: 170, h: 28 };
export function updateTutorial(dt) {
  const t = G?.tut;
  if (!t || G.cine || G.talk || G.dead || G.phase !== 'fight') return;
  const skipTap = input.touch && input.mouse.pressed && input.mouse.x < PANEL.x + PANEL.w && input.mouse.y > PANEL.y - 2 && input.mouse.y < PANEL.y + PANEL.h;
  if (keyHit('Tab') || skipTap) { finish(true); return; }
  t.t += dt; t.popT = Math.max(0, t.popT - dt);
  const s = STEPS[t.i];
  if (!s) { finish(false); return; }
  if (t.done > 0) { t.done += dt; if (t.done > 1.1) next(); return; }
  t.k = Math.min(1, s.check(t));
  if (t.k >= 1) {
    t.done = 0.001; t.popT = 0.5;
    A.select(); addRing(G.p.x, G.p.y - 6, P.gold, 200, 0.3, 2); addText(G.p.x, G.p.y - 28, 'GOOD', P.gold, 2);
  }
}
// what the fighter did, from world.js (dash, charge, q, e, ult): it counts, and it opens that move's window on seals
export function tutNote(k) {
  const t = G?.tut;
  if (!t) return;
  t.ev[k] = (t.ev[k] || 0) + 1;
  if (k === 'ult') t.used = true;
  if (SEAL[k]) t.allow = { k, until: G.t + SEAL[k].win };
}
// whether a sealed enemy can be hurt by this hit (world.js damage); kind is 'weapon', 'spell' or 'other'
export function tutAllows(e, kind) {
  const only = e.tutOnly, a = G.tut?.allow;
  if (!only || only === 'any' || !G.tut) return true;
  if (!a || a.k !== only || G.t > a.until) return false;
  if (only === 'charge') return kind === 'weapon';
  if (only === 'q' || only === 'e') return kind !== 'weapon';
  return true;
}
// a hit that bounced off a seal
export function tutImmune(e) {
  if ((e.immAt || -9) + 0.6 > G.time) return;
  e.immAt = G.time;
  const sl = SEAL[e.tutOnly];
  addText(e.x, e.y - 30, 'USE ' + sl.tag(), sl.col);
  addRing(e.x, e.y - 8, sl.col, 120, 0.2, 1);
  A.deny();
}
// the seals: a ring of the move's color round each sealed enemy, and its key bobbing over its head
export function drawTutorialMarks() {
  if (!G?.tut) return;
  const blink = Math.floor(G.time * 4) % 2;
  for (const e of G.E) {
    if (e.dead || !e.tutOnly || e.tutOnly === 'any') continue;
    const sl = SEAL[e.tutOnly], open = G.tut.allow?.k === e.tutOnly && G.t <= G.tut.allow.until;
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2 + G.time * 2; if (i % 2 === 0 || open) px(e.x + Math.cos(a) * (e.r + 5), e.y - 6 + Math.sin(a) * (e.r + 5) * 0.6, open && blink ? P.paper : sl.col); }
    const tag = sl.tag(), y = e.y - 34 + Math.round(Math.sin(G.time * 4 + e.x) * 1.5);
    textO(tag, e.x, y, open ? P.paper : sl.col, 1, 'c');
    if (open) glow(e.x, e.y - 8, sl.col, 12, 0.35);
  }
}

export function drawTutorial() {
  const t = G?.tut;
  // (it waits for the wave's banner to go, so the two never cover each other)
  if (!t || G.cine || G.talk?.lore || (G.banner && G.banner.t < G.banner.life)) return;
  const s = STEPS[t.i];
  if (!s) return;
  const shown = STEPS.filter((x) => !x.skip?.()), n = shown.indexOf(s) + 1, lines = s.lines(), ok = t.done > 0;
  const count = n + '/' + shown.length, x = PANEL.x, y = PANEL.y, tx = x + textW(count) + 5;
  // the lesson's name (it flashes when done), a thin line filling as you do it, and what to press
  const flashOn = t.popT > 0 && Math.floor(t.popT * 16) % 2;
  textO(count, x, y, '#8a7a80', 1, 'l');
  textO((ok ? 'DONE  ' : '') + titleOf(s), tx, y, ok ? '#7dff9a' : flashOn ? P.paper : P.gold, 1, 'l');
  rect(tx, y + 8, 48, 1, '#2a2028'); rect(tx, y + 8, Math.round(48 * (ok ? 1 : t.k)), 1, ok ? '#7dff9a' : P.gold);
  text(input.touch ? 'TAP HERE TO SKIP' : 'TAB SKIPS', tx + 53, y + 6, '#6a5a62', 1, 'l');
  textO(lines[0], tx, y + 12, P.paper, 1, 'l');
  if (lines[1]) textO(lines[1], tx, y + 20, '#a89aa0', 1, 'l');
}
