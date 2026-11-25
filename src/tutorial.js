// The training on a player's very first run (and from the Compendium after that). It takes the place of wave 1's
// monsters until it is done: a step at a time, a panel at the top says what to do and ticks it off when it's done,
// with a few ash husks to practise on. Nobody dies in training: a hit can't take the last heart. When the last step is
// done (or Tab / tapping SKIP skips it), wave 1 starts for real and the record remembers it was seen.
import { ctx, W, P, rect, text, textO, textW, glow } from './gfx.js?v=207';
import { A } from './audio.js?v=207';
import { input, keyHit } from './input.js?v=207';
import { keyLabel } from './bindings.js?v=207';
import { best, saveBest } from './store.js?v=207';
import { G, B, rnd, clamp, hyp, addRing, addText, buildQueue, DASH_COST } from './world.js?v=207';

const touch = () => input.touch;
const moveKeys = () => ['up', 'left', 'down', 'right'].map(keyLabel).join('');
// each step: what it asks for, how it begins (set), whether it's done (check), and what the panel says
const STEPS = [
  {
    id: 'move', title: 'MOVE',
    lines: () => [touch() ? 'DRAG YOUR LEFT THUMB TO RUN' : 'RUN WITH ' + moveKeys()],
    set(t) { t.x = G.p.x; t.y = G.p.y; t.walked = 0; },
    check(t) { t.walked += hyp(G.p.x - t.x, G.p.y - t.y); t.x = G.p.x; t.y = G.p.y; return t.walked > 140 ? 1 : t.walked / 140; },
  },
  {
    id: 'attack', title: 'ATTACK',
    lines: () => [touch() ? 'TAP THE RIGHT SIDE TO ATTACK' : 'CLICK OR PRESS ' + keyLabel('attack') + ' TO ATTACK', 'CUT DOWN THE ASH HUSKS'],
    set(t) { t.foes = husks(3, 70); },
    check(t) { return killed(t.foes); },
  },
  {
    id: 'dash', title: 'DASH',
    lines: () => [(touch() ? 'TAP DASH' : 'PRESS ' + keyLabel('dash')) + ' TO DASH. YOU CANNOT BE HIT MID-DASH', 'EACH DASH COSTS ' + DASH_COST + ' ENERGY: THE BLUE BAR'],
    set(t) { G.p.energy = Math.max(G.p.energy, 70); t.base = t.ev.dash || 0; },
    check(t) { return Math.min(1, ((t.ev.dash || 0) - t.base) / 2); },
  },
  {
    id: 'charge', title: 'CHARGED ATTACK', skip: () => !G.kit.charge,
    lines: () => [touch() ? 'HOLD ATTACK, THEN LET GO' : 'HOLD ATTACK, THEN LET GO', G.kit.charge?.name || ''],
    set(t) { t.base = t.ev.charge || 0; t.foes = husks(2, 60); },
    check(t) { return (t.ev.charge || 0) > t.base ? 1 : 0; },
  },
  {
    id: 'skills', title: 'SKILLS',
    lines: () => [(touch() ? 'Q AND E BUTTONS' : keyLabel('q') + ' AND ' + keyLabel('e')) + ': ' + G.kit.q.name + ' AND ' + G.kit.e.name, 'SKILLS COST ENERGY. HITS AND SPARKS REFILL IT'],
    set(t) { G.p.energy = 100; G.p.cdQ = G.p.cdE = 0; t.bq = t.ev.q || 0; t.be = t.ev.e || 0; t.foes = husks(4, 80); },
    check(t) { if (G.p.energy < 50) G.p.energy = 50; return ((t.ev.q || 0) > t.bq ? 0.5 : 0) + ((t.ev.e || 0) > t.be ? 0.5 : 0); },
  },
  {
    id: 'ult', title: 'ULTIMATE',
    lines: () => ['YOUR ULTIMATE FILLS AS YOU FIGHT. IT IS FULL NOW', (touch() ? 'TAP R: ' : 'PRESS ' + keyLabel('r') + ': ') + G.kit.r.name],
    set(t) { G.p.ult = 100; t.base = t.ev.ult || 0; t.foes = husks(6, 60); },
    check(t) { if ((t.ev.ult || 0) <= t.base && G.p.ult < 100) G.p.ult = 100; return (t.ev.ult || 0) > t.base ? 1 : 0; },
  },
  {
    id: 'clear', title: 'FINISH THEM',
    lines: () => ['CLEAR WHAT IS LEFT. GOLD SPARKS HEAL YOU', 'AFTER EACH WAVE YOU PICK AN UPGRADE'],
    set() {},
    check() { return G.E.some((e) => !e.dead) ? 0 : 1; },
  },
];

// a few weak husks in a ring round the fighter, arriving through their sigils
function husks(n, r) {
  const out = [], p = G.p;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd(0.5);
    const x = clamp(p.x + Math.cos(a) * r, B.x0 + 14, B.x1 - 14), y = clamp(p.y + Math.sin(a) * r * 0.7, B.y0 + 14, B.y1 - 10);
    const s = { x, y, type: 'husk', t: 0, life: 0.8, tut: true };
    G.sigils.push(s); out.push(s);
  }
  return out;
}
// how many of a step's husks are dead (a sigil becomes its enemy when it finishes, world.js sets s.enemy)
const killed = (foes) => foes.filter((s) => s.enemy?.dead).length / foes.length;

export function startTutorial() {
  G.tut = { i: -1, t: 0, ev: {}, done: 0, k: 0, popT: 0 };
  next();
}
function next() {
  const t = G.tut;
  t.i++;
  while (STEPS[t.i]?.skip?.()) t.i++;
  t.t = 0; t.k = 0; t.done = 0;
  if (STEPS[t.i]) STEPS[t.i].set(t);
}
function finish(skipped) {
  const p = G.p;
  G.tut = null;
  best.tut = true; saveBest();
  if (G.training) { G.trainDone = 1.6; G.banner = { text: skipped ? 'TRAINING SKIPPED' : 'TRAINING DONE', sub: 'BACK TO CAMP', t: 0, life: 1.8, c: P.gold }; if (!skipped) addRing(p.x, p.y - 6, P.gold, 260, 0.4, 2); return; }
  p.hp = p.maxHp; p.energy = 50; p.ult = 0;
  G.queue = buildQueue(1); G.spawnCd = 1.2;
  G.banner = { text: skipped ? 'WAVE 1' : 'TRAINING DONE', sub: skipped ? '' : 'NOW THE REAL FIGHT. WAVE 1', t: 0, life: 2.2, c: P.gold };
  A.waveStart(false);
  if (!skipped) { addRing(p.x, p.y - 6, P.gold, 260, 0.4, 2); A.victory?.(); }
}

// the panel's box on screen (also where a tap skips it)
const PANEL = { w: 216, h: 34, y: 26 };
export function updateTutorial(dt) {
  const t = G?.tut;
  if (!t || G.cine || G.talk || G.dead || G.phase !== 'fight') return;
  const skipTap = input.touch && input.mouse.pressed && Math.abs(input.mouse.x - W / 2) < PANEL.w / 2 && input.mouse.y > PANEL.y && input.mouse.y < PANEL.y + PANEL.h;
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
// what the fighter did, from world.js (dash, charge, q, e, ult)
export function tutNote(k) { if (G?.tut) G.tut.ev[k] = (G.tut.ev[k] || 0) + 1; }

export function drawTutorial() {
  const t = G?.tut;
  // (it waits for the wave's banner to go, so the two never cover each other)
  if (!t || G.cine || G.talk?.lore || (G.banner && G.banner.t < G.banner.life)) return;
  const s = STEPS[t.i];
  if (!s) return;
  const shown = STEPS.filter((x) => !x.skip?.()), n = shown.indexOf(s) + 1;
  const lines = s.lines(), w = PANEL.w, h = PANEL.h + (lines.length - 1) * 8, x = Math.round(W / 2 - w / 2), y = PANEL.y;
  const pop = t.popT > 0 ? Math.round(t.popT * 4) : 0;
  ctx.globalAlpha = 0.88; rect(x - pop, y - pop, w + pop * 2, h + pop * 2, '#0c0810'); ctx.globalAlpha = 1;
  rect(x - pop, y - pop, w + pop * 2, 1, P.gold); rect(x - pop, y + h + pop - 1, w + pop * 2, 1, '#5a3a20');
  textO('TRAINING ' + n + '/' + shown.length, x + 4, y + 3, P.ember3, 1, 'l');
  textO(input.touch ? 'TAP HERE TO SKIP' : 'TAB SKIPS', x + w - 4, y + 3, P.dust || '#8a7a80', 1, 'r');
  const ok = t.done > 0;
  textO((ok ? 'DONE: ' : '') + s.title, W / 2, y + 12, ok ? '#7dff9a' : P.gold, 1, 'c');
  lines.forEach((l, i) => text(l, W / 2, y + 21 + i * 8, P.paper, 1, 'c'));
  // progress along the bottom edge
  rect(x + 4, y + h - 4, w - 8, 2, '#2a2028'); rect(x + 4, y + h - 4, Math.round((w - 8) * (ok ? 1 : t.k)), 2, ok ? '#7dff9a' : P.gold);
  if (ok) glow(W / 2, y + h / 2, P.gold, 40, 0.15);
}
