// Field notes: the first time something new turns up in a fight (gold, a style rank, an elite, a lootling, a twist,
// a boss, a full ultimate, a perfect dodge, a heart, a box), two short lines say what it is and what it's for. Each
// note shows once, ever (best.tips), never during the training (which teaches the controls itself) and never over
// a story talk or a cinematic. world.js calls tip(id) where a thing happens; updateTips() watches for the rest.
import { ctx, W, H, P, rect, text, textO, textW } from './gfx.js?v=216';
import { A } from './audio.js?v=216';
import { input } from './input.js?v=216';
import { keyLabel } from './bindings.js?v=216';
import { best, saveBest } from './store.js?v=216';
import { G } from './world.js?v=216';

const key = (k) => (input.touch ? 'TAP ' + k.toUpperCase() : keyLabel(k));
export const TIPS = {
  gold: () => ['GOLD IS RARE, AND IT IS YOURS TO KEEP.', 'SPEND IT AT THE CAMP: THE SMITH, THE PEDDLER, THE WEAVER.'],
  heart: () => ['HEARTS ARE RARE, AND A CLEARED WAVE', 'DOES NOT HEAL YOU. MAKE EACH ONE COUNT.'],
  box: () => ['THINGS TO BREAK. NOW AND THEN ONE HIDES', 'A COIN OR A HEART.'],
  rank: () => ['STYLE RANK: HIT WITHOUT GETTING HIT TO CLIMB IT.', 'FROM A UP YOU HIT HARDER. ONE HIT TAKEN RESETS IT.'],
  elite: () => ['AN ELITE: TOUGHER, WITH A TRICK OF ITS OWN.', 'IT DROPS MORE ENERGY, NOW AND THEN A HEART.'],
  lootling: () => ['A LOOTLING. CATCH IT BEFORE IT DIGS AWAY:', 'IT CARRIES GOLD.'],
  twist: () => ['A TWIST WAVE: ONE RULE CHANGES.', 'SURVIVE IT FOR FULL ENERGY AND A HEART.'],
  boss: () => ['A BOSS. LEARN WHAT IT DOES BEFORE IT DOES IT.', 'AFTER A MINUTE IT ENRAGES: FINISH IT FAST.'],
  ult: () => ['ULTIMATE READY: ' + key('r') + '.', 'YOUR WEAPON HITS FILL IT AGAIN.'],
  perfect: () => ['PERFECT DODGE: YOU DASHED THROUGH A HIT.', 'YOUR NEXT BLOW STRIKES THREE TIMES AS HARD.'],
  energy: () => ['SKILLS COST ENERGY, AND SO DOES A DASH.', 'HITS, KILLS AND THE BLUE MOTES FILL IT.'],
};
const LIFE = 5.4, FADE = 0.35;
let cur = null;
const queue = [];
const seen = (id) => best.tips?.includes(id);

// show a note (once ever): it waits its turn behind any other
export function tip(id) {
  if (!TIPS[id] || seen(id) || queue.includes(id) || cur?.id === id) return;
  if (!G || G.tut || G.training) return;
  queue.push(id);
}
// things that are simplest to notice by looking
export function updateTips(dt) {
  if (!G || G.tut || G.training || G.dead) return;
  const p = G.p;
  if (!seen('ult') && p.ult >= 100) tip('ult');
  if (!seen('twist') && G.twist && G.phase === 'fight') tip('twist');
  if (!seen('boss') && G.boss && G.boss.state !== 'intro' && !G.boss.dying && !G.boss.dead) tip('boss');
  if (!seen('elite') || !seen('lootling')) for (const e of G.E) {
    if (e.dead || e.prop || e.state === 'spawn') continue;
    if (e.elite) tip('elite');
    if (e.type === 'lootling') tip('lootling');
  }
  if (!seen('rank') && G.rank >= 2) tip('rank');
  if (!cur && queue.length && !G.talk?.lore && !G.cine) {
    const id = queue.shift();
    if (seen(id)) return;
    (best.tips ||= []).push(id); saveBest();
    const lines = TIPS[id]();
    cur = { id, lines, t: 0, life: LIFE + Math.max(...lines.map((s) => s.length)) * 0.02 };
    A.ui();
  }
}
export function clearTips() { cur = null; queue.length = 0; }

// a small panel low in the middle (high in the middle on a phone, clear of the thumbs), sliding in and fading out.
// Its clock runs only while the fight is on the screen (main.js passes the frame's time), not under a story talk, a
// cinematic or the upgrade screen.
export function drawTips(dt = 0) {
  if (!cur || G?.talk?.lore || G?.cine) return;
  cur.t += dt;
  if (cur.t > cur.life) { cur = null; return; }
  const t = cur.t, k = Math.max(0, Math.min(1, t / 0.22, (cur.life - t) / FADE));
  if (k <= 0) return;
  const w = Math.max(...cur.lines.map((s) => textW(s))) + 22, h = 6 + cur.lines.length * 9;
  const x = Math.round(W / 2 - w / 2), y = Math.round((input.touch ? 40 : H - 50) + (1 - k) * 6);
  ctx.globalAlpha = k;
  rect(x - 1, y - 1, w + 2, h + 2, P.ink0);
  rect(x, y, w, h, P.ink1);
  rect(x, y, 2, h, P.gold);
  textO('!', x + 8, y + 4, P.gold, 1, 'c');
  cur.lines.forEach((s, i) => text(s, x + 14, y + 4 + i * 9, i ? P.bone : P.paper));
  ctx.globalAlpha = 1;
}
