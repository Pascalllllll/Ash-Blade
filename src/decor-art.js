// The camp's decorations, each drawn in pixels standing on the ground at (x, y): the ones that were always there
// (the ash statues, Aurel's fallen head, the broken column, the bones) and everything the Peddler sells (shop.js
// DECOR has their names, prices and places). Light comes from the upper left, everything has the near-black outline
// the fighters and monsters have, and nearly everything moves a little: cloth in the wind, fire, water, steam, light.
// sk is the camp's look (shop.js SKINS); a few take a color from it.
import { ctx, rect, px, line, disc, glow, text, mix } from './gfx.js?v=213';

const TAU = Math.PI * 2;
const OUT = '#140c14';
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// ---------- drawing helpers ----------
// a soft shadow on the ground, w either side of x
function shadowAt(x, y, w, a = 0.38) { ctx.globalAlpha = a; for (let i = -2; i <= 2; i++) rect(x - w + Math.abs(i) * 2, y + i, w * 2 - Math.abs(i) * 4 + 1, 1, '#05030a'); ctx.globalAlpha = 1; }
// boxes with one outline round all of them (outlines first, so neighbors don't cut into each other)
function parts(list) { for (const [x, y, w, h] of list) rect(x - 1, y - 1, w + 2, h + 2, OUT); for (const [x, y, w, h, c] of list) rect(x, y, w, h, c); }
// a filled ellipse
function oval(cx, cy, rx, ry, c) { for (let dy = -ry; dy <= ry; dy++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / (ry + 0.5)) ** 2))); rect(cx - w, cy + dy, w * 2 + 1, 1, c); } }
// round things in a cluster (a tree's crown, a bush, a cap), one outline round all of them, lit from the upper left
function blobs(list, d, m, l) {
  for (const [x, y, r] of list) disc(x, y, r + 1, OUT);
  for (const [x, y, r] of list) disc(x, y, r, d);
  for (const [x, y, r] of list) disc(x - r * 0.18, y - r * 0.22, r * 0.8, m);
  for (const [x, y, r] of list) disc(x - r * 0.38, y - r * 0.46, r * 0.4, l);
}
// a thick outlined stroke (a post, a branch, a bone)
function stroke(x0, y0, x1, y1, c, w = 1) { line(x0, y0, x1, y1, OUT, w + 2); line(x0, y0, x1, y1, c, w); }
// a barrel, pot or bowl: one half-width per row from the bottom up, lit on the left, dark on the right
function vessel(x, y, ws, c, l, d) {
  const n = ws.length;
  for (let i = 0; i < n; i++) rect(x - ws[i] - 1, y - 1 - i, ws[i] * 2 + 3, 1, OUT);
  rect(x - ws[0], y, ws[0] * 2 + 1, 1, OUT); rect(x - ws[n - 1], y - n - 1, ws[n - 1] * 2 + 1, 1, OUT);
  for (let i = 0; i < n; i++) { const w = ws[i], yy = y - 1 - i; rect(x - w, yy, w * 2 + 1, 1, c); rect(x - w, yy, Math.max(1, Math.round(w * 0.5)), 1, l); rect(x + w + 1 - Math.max(1, Math.round(w * 0.45)), yy, Math.max(1, Math.round(w * 0.45)), 1, d); }
}
// a candle flame, flickering
function flame(x, y, t, k) {
  const f = Math.floor(t * 11 + k * 3.7) % 3;
  px(x, y, '#ff9a3c'); px(x, y - 1, '#ffd447'); if (f) px(x, y - 2, f === 1 ? '#fff0a0' : '#ffd447');
  glow(x, y - 1, '#ffb347', 6, 0.45);
}
const alpha = (a, f) => { const a0 = ctx.globalAlpha; ctx.globalAlpha = a0 * a; f(); ctx.globalAlpha = a0; };

// ---------- always there: what the ash left ----------
const ASH = ['#2e282e', '#433c43', '#5e565e', '#7a7078', '#948a92'];
// a person turned to ash where they stood, on a plinth; rows of letters, a light, b mid, c dark
function ashFigure(x, y, rows) {
  const w = rows[0].length, h = rows.length, x0 = x - Math.floor(w / 2), y0 = y - 4 - h;
  const on = (cx, cy) => rows[cy]?.[cx] && rows[cy][cx] !== '.';
  for (let cy = 0; cy < h; cy++) for (let cx = 0; cx < w; cx++) if (!on(cx, cy) && (on(cx - 1, cy) || on(cx + 1, cy) || on(cx, cy - 1) || on(cx, cy + 1))) px(x0 + cx, y0 + cy, OUT);
  for (let cy = 0; cy < h; cy++) for (let cx = 0; cx < w; cx++) {
    const ch = rows[cy][cx];
    if (!ch || ch === '.') continue;
    let c = ch === 'a' ? ASH[3] : ch === 'b' ? ASH[2] : ASH[1];
    if (!on(cx, cy - 1)) c = ch === 'c' ? ASH[2] : ASH[4];   // lit from above
    px(x0 + cx, y0 + cy, c);
  }
  // the plinth
  parts([[x - 7, y - 4, 15, 4, '#4a4250']]); rect(x - 7, y - 4, 15, 1, '#6a6276'); rect(x - 7, y - 1, 15, 1, '#3a3240');
  for (const dx of [-5, 0, 5]) px(x + dx, y - 2, '#3a3240');
}
// cracks that still glow with the fire that made them ash, slowly breathing; and the ash flaking off
function embers(x, y, t, list) {
  const k = 0.5 + 0.5 * Math.sin(t * 1.6 + x * 0.37);
  for (const [dx, dy] of list) px(x + dx, y + dy, k > 0.55 ? '#ffb347' : '#d8501a');
  glow(x + list[0][0], y + list[0][1], '#ff6a2a', 4, 0.1 + 0.15 * k);
}
function flakes(x, y, t, n = 3) { for (let i = 0; i < n; i++) { const u = (t * 0.35 + i / n + hash(x)) % 1; alpha(1 - u, () => px(x - 3 + i * 3 + Math.round(Math.sin(t * 1.7 + i) * 1.4), y - u * 14, i % 2 ? ASH[4] : ASH[3])); } }

const MOTHER = [
  '.....abb.....',
  '.....abb.....',
  '.a...abb...b.',
  '..aa.abb.bb..',
  '...aaabbbbc..',
  '...a.abc.b...',
  '...a.a.c.b...',
  '...a.....b...',
  '...a.....b...',
  '...a.aab.b...',
  '...a.abb.b...',
  '...a.abc.b...',
  '...aa.b.cb...',
  '..aaaabbbcc..',
  '..aaaabbbcc..',
  '...aaabbbc...',
  '...aaabbbc...',
  '...aaabbbc...',
  '..aaaabbbcc..',
  '..aaaabbbcc..',
  '.aaaabbbbccc.',
  '.aaaabbbbccc.',
  'aaaaabbbbcccc',
  'aaaabbbbbcccc',
];
const SOLDIER = [
  '...........a..',
  '..........aab.',
  '...........b..',
  '...aab.....b..',
  '..aabbb....b..',
  '..abbbbc...b..',
  '...abbc....b..',
  '....bb.....b..',
  '..aaabbbb..b..',
  '.aaabbbbbbbb..',
  '.aaabbbc...b..',
  '.aaabbbc...b..',
  '..aabbbc...b..',
  '..aabbbcc..b..',
  '..aabbbbccbb..',
  '..aab.bbcccb..',
  '..aab...cc.b..',
  '.aaab...cc.b..',
  'aaaab...ccbb..',
];
const ELDER = [
  '.....ab........',
  '....aabb.......',
  '....abbbc......',
  '.....bbcc......',
  '....abbcc......',
  '...aabbbcc.....',
  '..aaabbbccc....',
  '..aaabbbcc.a...',
  '..aaabbbcccb...',
  '..aaabbbcc.b...',
  '..aaabbbcc.b...',
  '..aaabbbccc.b..',
  '..aaabbbccc.b..',
  '.aaaabbbcccc.b.',
  '.aaaabbbcccc.b.',
  '.aaaabbbcccc.b.',
  'aaaaabbbccccc.b',
  'aaaabbbbccccc.b',
];

// ---------- the pictures ----------
export const DRAW_DECOR = {
  statue1(x, y, t) {  // a mother holding her child up to the sky
    shadowAt(x, y, 9); ashFigure(x, y, MOTHER); embers(x, y, t, [[0, -14], [1, -13], [0, -12]]); flakes(x, y - 26, t);
  },
  statue2(x, y, t) {  // a soldier kneeling, his spear planted
    shadowAt(x, y, 9); ashFigure(x, y, SOLDIER); embers(x, y, t, [[-2, -13], [-1, -12], [-1, -11]]); flakes(x, y - 20, t);
  },
  statue3(x, y, t) {  // an old man leaning on his cane, looking up
    shadowAt(x, y, 9); ashFigure(x, y, ELDER); embers(x, y, t, [[0, -14], [-1, -13], [0, -12]]); flakes(x, y - 22, t);
  },
  head(x, y, t) {  // the head of Aurel's great statue, fallen and half sunk, its crown cracked, an ember in the crack
    shadowAt(x, y, 17);
    const cy = y - 12;
    oval(x, cy, 13, 11, OUT); oval(x, cy, 12, 10, '#3e3846'); oval(x - 1, cy - 1, 11, 9, '#524a5a'); oval(x - 3, cy - 3, 8, 6, '#665e70'); oval(x - 5, cy - 5, 4, 3, '#7e7688');
    // the face, eyes shut: brows, lids, the nose, a calm mouth
    rect(x - 8, cy - 3, 5, 1, '#7e7688'); rect(x + 2, cy - 3, 5, 1, '#665e70');
    rect(x - 7, cy - 1, 4, 1, '#2a2430'); rect(x + 3, cy - 1, 4, 1, '#2a2430'); px(x - 8, cy - 2, '#2a2430'); px(x + 7, cy - 2, '#2a2430');
    rect(x - 1, cy - 1, 2, 4, '#6e6678'); px(x + 1, cy + 1, '#3a3442'); rect(x - 1, cy + 3, 3, 1, '#3a3442');
    rect(x - 3, cy + 6, 7, 1, '#2a2430'); px(x - 4, cy + 5, '#2a2430'); px(x + 4, cy + 5, '#2a2430');
    // the crown on its brow: five points, gold gone dull, one snapped off; a red stone still in it
    const g = ['#5a4014', '#8a6420', '#b88a34', '#e0b858'];
    for (const [dx, h] of [[-9, 4], [-5, 5], [-1, 7], [3, 2], [7, 4]]) { rect(x + dx - 1, cy - 11 - h, 4, h + 1, OUT); rect(x + dx, cy - 10 - h, 2, h, g[2]); px(x + dx, cy - 10 - h, g[3]); px(x + dx + 1, cy - 10 - h + 1, g[1]); }
    parts([[x - 10, cy - 10, 21, 3, g[1]]]); rect(x - 10, cy - 10, 21, 1, g[3]); rect(x - 10, cy - 8, 21, 1, g[0]);
    px(x - 1, cy - 9, '#d0303a'); px(x + 6, cy - 9, '#3a6ad0');
    // the crack, and the ember still burning in it
    for (const [dx, dy] of [[3, -7], [4, -6], [4, -5], [5, -4], [5, -3], [6, -2], [7, -1], [7, 0]]) px(x + dx, cy + dy, '#1a141e');
    embers(x, cy, t, [[4, -5], [5, -3], [6, -2]]);
    // sunk in the ground: earth heaped over its chin
    oval(x, y - 1, 15, 3, OUT); oval(x, y - 1, 14, 2, '#2a1e24'); rect(x - 12, y - 3, 24, 1, '#3e3036');
    for (const dx of [-10, -4, 3, 9]) px(x + dx, y - 2, '#4a3a40');
  },
  column(x, y, t) {  // a fluted column broken off, its capital fallen beside it in pieces
    shadowAt(x, y, 12);
    parts([[x - 6, y - 4, 13, 4, '#4a4250']]); rect(x - 6, y - 4, 13, 1, '#6a6276');
    const top = [3, 1, 0, 2, 4, 5, 3, 1, 2, 4, 6];
    for (let i = 0; i < 11; i++) rect(x - 6 + i, y - 25 + top[i], 1, 21 - top[i], OUT);
    rect(x - 6, y - 25 + 4, 1, 20, OUT); rect(x + 6, y - 25 + 5, 1, 20, OUT);
    for (let i = 1; i < 10; i++) { const c = i < 3 ? '#7a7288' : i < 7 ? (i % 2 ? '#5e566a' : '#6a6276') : (i % 2 ? '#463e50' : '#524a5c'); rect(x - 6 + i, y - 24 + top[i], 1, 20 - top[i], c); px(x - 6 + i, y - 24 + top[i], '#8a8296'); }
    // the fallen drum of the capital, lying on its side, and rubble
    parts([[x + 8, y - 6, 8, 6, '#5e566a']]); rect(x + 8, y - 6, 8, 1, '#7a7288'); rect(x + 8, y - 3, 8, 1, '#463e50'); rect(x + 15, y - 6, 1, 6, '#3e3646');
    for (const [dx, dy] of [[-10, 0], [-9, -1], [18, -1], [12, 1]]) { px(x + dx, y + dy, '#5e566a'); px(x + dx + 1, y + dy, '#3e3646'); }
    alpha(0.8, () => { px(x - 4, y - 14, '#4a6a3a'); px(x - 3, y - 13, '#5a8a44'); px(x - 4, y - 12, '#4a6a3a'); });
  },
  bones(x, y, t, sk) {  // what is left of someone who didn't make it out
    const b = sk?.bone || '#c8bca4', d = mix(b, '#000000', 0.35);
    for (const [x0, y0, x1, y1] of [[-9, 1, -4, -1], [4, 0, 10, 2], [-2, 2, 3, 1]]) { stroke(x + x0, y + y0, x + x1, y + y1, b); px(x + x0, y + y0 - 1, b); px(x + x1, y + y1 + 1, b); px(x + x1, y + y1, d); }
    // a ribcage and the skull, face up
    for (let i = 0; i < 3; i++) { rect(x - 5 + i * 2, y - 3, 1, 3, OUT); px(x - 5 + i * 2, y - 2, d); }
    rect(x - 1, y - 7, 6, 6, OUT); rect(x, y - 6, 4, 4, b); rect(x, y - 6, 2, 1, mix(b, '#ffffff', 0.4)); px(x + 1, y - 4, '#1a1014'); px(x + 3, y - 4, '#1a1014'); rect(x + 1, y - 2, 3, 1, d);
  },

  // ---------- sold by the Peddler ----------
  stew(x, y, t) {  // a black pot on three sticks over a small fire, bubbling
    shadowAt(x, y, 10);
    const fl = Math.sin(t * 13) > 0 ? 1 : 0;
    // the fire under it
    for (let i = 0; i < 5; i++) { const h = 2 + ((i + Math.floor(t * 9)) % 3) + (i === 2 ? 1 : 0); rect(x - 3 + i * 1.5, y - 1 - h, 1, h, i % 2 ? '#ffb347' : '#ff6a2a'); }
    stroke(x - 5, y, x + 4, y - 2, '#5a3a24'); stroke(x + 5, y, x - 4, y - 2, '#4a2e1c');
    glow(x, y - 3, '#ff8a2a', 12, 0.4 + 0.08 * fl);
    // the tripod, the pot hanging from it, the stew in it, a ladle
    stroke(x - 9, y, x, y - 22, '#6a4428'); stroke(x + 9, y, x, y - 22, '#5a3a22'); stroke(x + 1, y + 1, x, y - 22, '#4a2e1c');
    line(x, y - 21, x, y - 15, '#3a3a44');
    vessel(x, y - 4, [5, 6, 7, 7, 7, 6, 6], '#2a2a34', '#4a4a5a', '#18181e');
    rect(x - 6, y - 12, 13, 1, '#5a5a6a');
    oval(x, y - 12, 5, 1, '#8a4a22'); rect(x - 4, y - 12, 9, 1, '#b8642a');
    const b = Math.floor(t * 3) % 4; px(x - 3 + b * 2, y - 12, '#e8904a'); if (b % 2) px(x - 2 + b * 2, y - 13, '#e8904a');
    stroke(x + 3, y - 12, x + 8, y - 18, '#7a5232'); disc(x + 8, y - 19, 1, '#9a6a3e');
    // steam
    for (let i = 0; i < 4; i++) { const u = (t * 0.4 + i / 4) % 1; alpha((1 - u) * 0.55, () => disc(x - 1 + Math.sin(t * 1.5 + i * 2) * 2 + u * 3, y - 15 - u * 14, 1 + u * 2, '#c8c0c8')); }
  },
  meadow(x, y, t) {  // Unit-7's flower patch: daisies, tulips, bluebells in the grass, a butterfly, its watering can
    for (let i = 0; i < 16; i++) { const gx = x - 15 + hash(i + 70) * 30, gy = y - 3 + hash(i + 90) * 7; line(gx, gy, gx - 1, gy - 2, '#3a7a3a'); line(gx + 1, gy, gx + 2, gy - 3, '#5aa84a'); }
    for (let i = 0; i < 14; i++) {
      const fx = Math.round(x - 14 + hash(i + 40) * 28), fy = Math.round(y - 2 + hash(i + 60) * 6), sw = Math.round(Math.sin(t * 1.8 + i * 0.9) * 0.6), h = 3 + Math.round(hash(i + 3) * 3), k = i % 4;
      line(fx, fy, fx + sw, fy - h, '#4a9a40');
      const tx = fx + sw, ty = fy - h;
      if (k === 0) { px(tx - 1, ty, '#ffffff'); px(tx + 1, ty, '#ffffff'); px(tx, ty - 1, '#ffffff'); px(tx, ty + 1, '#ffffff'); px(tx, ty, '#ffd447'); }
      else if (k === 1) { rect(tx - 1, ty - 2, 3, 2, OUT); px(tx - 1, ty - 1, '#e0303a'); px(tx, ty - 2, '#ff5a6a'); px(tx + 1, ty - 1, '#b8202a'); px(tx, ty - 1, '#e0303a'); }
      else if (k === 2) { px(tx, ty, '#6a8aff'); px(tx + 1, ty + 1, '#4a6ae0'); px(tx - 1, ty + 1, '#8aaaff'); }
      else { px(tx, ty, '#ff9fc0'); px(tx, ty - 1, '#ffd0e0'); }
    }
    // the watering can
    parts([[x + 12, y - 5, 5, 4, '#7a8a9a']]); rect(x + 12, y - 5, 5, 1, '#a8b8c8'); line(x + 11, y - 3, x + 8, y - 6, '#7a8a9a'); px(x + 7, y - 6, '#a8b8c8'); rect(x + 13, y - 7, 3, 1, '#5a6a7a');
    // a butterfly, wandering
    const bx = x + Math.sin(t * 0.7) * 11, by = y - 10 + Math.sin(t * 1.9) * 3, wf = Math.floor(t * 12) % 2;
    px(bx, by, '#2a1a1a'); px(bx - 1, by - wf, '#ffb347'); px(bx + 1, by - wf, '#ffb347'); if (!wf) { px(bx - 1, by + 1, '#ff8a2a'); px(bx + 1, by + 1, '#ff8a2a'); }
  },
  rack(x, y, t) {  // swords, spears, an axe and a halberd the fallen left at the rim, and a shield
    shadowAt(x, y, 13);
    parts([[x - 11, y - 19, 2, 19, '#6a4428'], [x + 10, y - 19, 2, 19, '#5a3a22'], [x - 12, y - 21, 25, 2, '#8a5e36'], [x - 11, y - 6, 22, 2, '#6a4428']]);
    rect(x - 12, y - 21, 25, 1, '#a87a48'); rect(x - 11, y - 19, 1, 19, '#8a5e36');
    // a sword
    stroke(x - 7, y - 5, x - 7, y - 30, '#c8d0dc'); px(x - 6, y - 29, '#8a94a4'); for (let k = 0; k < 22; k += 1) px(x - 6, y - 7 - k, '#8a94a4');
    parts([[x - 10, y - 9, 7, 1, '#d8a032']]); rect(x - 8, y - 7, 2, 3, '#5a3020'); disc(x - 7, y - 4, 1, '#d8a032');
    // a spear
    stroke(x - 2, y - 4, x - 2, y - 33, '#7a5232'); parts([[x - 3, y - 37, 3, 4, '#c8d0dc']]); px(x - 2, y - 38, '#c8d0dc'); px(x - 3, y - 37, '#e8f0ff'); rect(x - 3, y - 32, 3, 1, '#b8202a');
    // an axe
    stroke(x + 3, y - 4, x + 3, y - 27, '#6a4428'); parts([[x + 4, y - 28, 4, 6, '#9aa4b4']]); rect(x + 7, y - 29, 1, 8, '#c8d0dc'); px(x + 4, y - 28, '#c8d0dc');
    // a halberd
    stroke(x + 7, y - 4, x + 7, y - 34, '#5a3a22'); parts([[x + 8, y - 33, 3, 5, '#9aa4b4']]); px(x + 7, y - 36, '#c8d0dc'); px(x + 7, y - 35, '#9aa4b4'); px(x + 10, y - 33, '#c8d0dc');
    // a round shield leaning on the front, the sun on it
    disc(x + 5, y - 6, 6, OUT); disc(x + 5, y - 6, 5, '#7a1a26'); disc(x + 4, y - 7, 3, '#a8303a'); disc(x + 5, y - 6, 1.5, '#d8a032'); px(x + 4, y - 7, '#fff4b0');
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8; px(x + 5 + Math.round(Math.cos(a) * 5), y - 6 + Math.round(Math.sin(a) * 5), '#d8a032'); }
    // light running up the sword now and then
    const g = (t * 0.6 + hash(x)) % 3; if (g < 1) px(x - 7, y - 8 - Math.round(g * 20), '#ffffff');
  },
  shrooms(x, y, t) {  // mushrooms that glow in the dark, breathing light, letting spores go
    const caps = [[-5, 0, 4, 6], [1, 1, 3, 4], [5, 0, 5, 9], [-1, 2, 2, 3], [9, 2, 2, 3], [-8, 2, 2, 2]];
    for (const [dx, dy, r, h] of caps) { const k = 0.5 + 0.5 * Math.sin(t * 1.8 + dx); glow(x + dx, y + dy - h - 1, '#4affd8', r * 1.5 + 3, 0.1 + 0.14 * k); }
    for (const [dx, dy, r, h] of caps) { rect(x + dx - 1, y + dy - h, 3, h + 1, OUT); rect(x + dx, y + dy - h, 1, h, '#e8f0e0'); px(x + dx, y + dy - 1, '#a8b8a0'); }
    for (const [dx, dy, r, h] of caps) {
      const cx = x + dx, cy = y + dy - h, k = 0.5 + 0.5 * Math.sin(t * 1.8 + dx);
      for (let i = 0; i <= r; i++) rect(cx - r + i - 1, cy - Math.ceil((r - i) * 0.7) - 1, 1, 1, OUT);
      for (let rr = 0; rr <= Math.ceil(r * 0.7); rr++) { const w = Math.round(r * Math.sqrt(1 - (rr / (r * 0.7 + 0.5)) ** 2)); rect(cx - w - 1, cy - rr - 1, w * 2 + 3, 1, OUT); rect(cx - w, cy - rr, w * 2 + 1, 1, rr === 0 ? '#1a8a8a' : k > 0.5 ? '#3ae8c8' : '#2ac8b0'); px(cx - w, cy - rr, '#8affe8'); }
      px(cx - 1, cy - 1, '#d8fff4'); if (r > 2) px(cx + 2, cy - 1, '#d8fff4');
    }
    for (let i = 0; i < 5; i++) { const u = (t * 0.25 + i / 5) % 1; alpha(Math.sin(u * Math.PI), () => px(x - 6 + i * 3 + Math.sin(t + i * 2) * 2, y - 8 - u * 16, i % 2 ? '#8affe8' : '#4affd8')); }
  },
  terminal(x, y, t) {  // the Dev's old computer, still compiling something; a mug of coffee gone cold
    shadowAt(x, y, 11);
    parts([[x - 11, y - 9, 22, 2, '#7a5232'], [x - 10, y - 7, 2, 7, '#5a3a22'], [x + 8, y - 7, 2, 7, '#4a2e1c']]); rect(x - 11, y - 9, 22, 1, '#9a6e44');
    parts([[x - 7, y - 25, 14, 13, '#c8c0a8'], [x - 3, y - 12, 6, 2, '#a8a088']]); rect(x - 7, y - 25, 14, 1, '#e8e0c8'); rect(x + 6, y - 25, 1, 13, '#8a8270');
    rect(x - 6, y - 24, 11, 10, '#08140c');
    for (let i = 0; i < 4; i++) { const n = (Math.floor(t * 2.5) + i * 3) % 7; rect(x - 5, y - 23 + i * 2, 2 + n, 1, i % 3 === 2 ? '#a8ffb8' : '#39ff6a'); }
    if (Math.floor(t * 3) % 2) rect(x + 2, y - 17, 2, 1, '#39ff6a');
    alpha(0.25, () => { for (let r = 0; r < 10; r += 2) rect(x - 6, y - 24 + r, 11, 1, '#000000'); });
    glow(x - 1, y - 19, '#39ff6a', 12, 0.3);
    parts([[x - 8, y - 11, 9, 2, '#8a8478']]); for (let k = 0; k < 4; k++) px(x - 7 + k * 2, y - 11, '#d8d0c0');
    // a sticky note, a mug of coffee with steam
    rect(x + 5, y - 15, 3, 3, '#ffe060'); px(x + 6, y - 14, '#a88a20');
    parts([[x + 4, y - 13, 3, 4, '#e8e0d0']]); px(x + 7, y - 12, '#e8e0d0'); rect(x + 4, y - 13, 3, 1, '#4a2a14');
    for (let i = 0; i < 2; i++) { const u = (t * 0.5 + i / 2) % 1; alpha((1 - u) * 0.5, () => px(x + 5 + Math.sin(t * 2 + i * 3), y - 15 - u * 7, '#e8e0e8')); }
    line(x + 8, y - 7, x + 13, y, '#2a2a34');
  },
  cat(x, y, t) {  // the camp's cat, asleep on a rug by the fire; now and then it lifts its head and looks round
    oval(x, y - 1, 12, 3, OUT); oval(x, y - 1, 11, 2, '#6a1a28'); oval(x, y - 1, 9, 1, '#9a2a38');
    for (let i = -8; i <= 8; i += 4) { px(x + i, y - 1, '#d8a032'); }
    px(x - 13, y - 1, '#d8a032'); px(x + 13, y - 1, '#d8a032');
    const cyc = (t + hash(x) * 9) % 11, up = cyc > 8.6 ? 1 : 0, br = Math.sin(t * 2.4) > 0.2 ? 1 : 0;
    const O = '#e8903a', L = '#ffc070', D = '#b0602a', Wt = '#fff0dc';
    // the tail, wrapped round the front, its tip flicking
    const tip = Math.sin(t * 3 + 1) > 0.85 ? -1 : 0;
    rect(x - 5, y - 4, 13, 3, OUT); rect(x - 4, y - 3, 11, 1, D); rect(x - 6, y - 4 + tip, 2, 2, OUT); px(x - 5, y - 3 + tip, O);
    // the body, curled, rising and falling as it breathes
    oval(x + 2, y - 6 - br * 0.5, 7, 3 + br, OUT); oval(x + 2, y - 6, 6, 2 + br, O);
    rect(x - 1, y - 8 - br, 6, 1, L); for (const dx of [0, 3, 6]) { px(x + dx, y - 6, D); px(x + dx + 1, y - 7, D); }
    rect(x - 4, y - 3, 11, 1, D);
    // the head, tucked down on its paws (or lifted)
    const hx = x - 6, hy = y - 6 - up * 3;
    disc(hx, hy, 4, OUT); for (const ex of [-3, 2]) { rect(hx + ex - 1, hy - 6, 3, 3, OUT); px(hx + ex, hy - 5, O); px(hx + ex + (ex < 0 ? 1 : 0), hy - 4, '#ff9fc0'); }
    disc(hx, hy, 3, O); rect(hx - 2, hy - 3, 4, 1, L); rect(hx - 1, hy + 1, 3, 2, Wt); px(hx, hy + 1, '#ff8aa0');
    if (up && !(cyc > 9.6 && cyc < 9.8)) { px(hx - 2, hy - 1, '#ffd447'); px(hx + 1, hy - 1, '#ffd447'); px(hx - 2, hy - 1 + 0, '#ffd447'); }
    else { px(hx - 2, hy, D); px(hx - 1, hy - 1, D); px(hx + 1, hy - 1, D); px(hx + 2, hy, D); }
    px(hx - 3, hy + 3, Wt); px(hx - 2, hy + 3, Wt);
    // the Z's it sleeps in
    if (!up) for (let i = 0; i < 2; i++) { const u = (t * 0.35 + i / 2) % 1; alpha(Math.sin(u * Math.PI) * 0.8, () => text('Z', hx + 2 + u * 6, hy - 9 - u * 10, '#c8c0e8')); }
  },
  raven(x, y, t) {  // a dead branch planted at the edge, a raven on it that watches the pit
    shadowAt(x, y, 6);
    stroke(x, y, x - 1, y - 13, '#4a3428', 2); stroke(x - 1, y - 13, x + 1, y - 26, '#4a3428', 2); stroke(x - 1, y - 16, x - 6, y - 21, '#4a3428'); stroke(x + 1, y - 20, x + 5, y - 23, '#3a2a20');
    line(x - 1, y - 12, x - 1, y - 2, '#6a4e3a'); px(x, y - 22, '#6a4e3a');
    const look = Math.floor(t / 2.3 + hash(x) * 3) % 3, f = look === 1 ? -1 : 1, caw = (t + hash(x) * 5) % 7.3 < 0.45, ruf = (t % 5.1) < 0.3 ? 1 : 0;
    const bx = x + 1, by = y - 30;
    // tail, body, wing, head, beak, feet
    for (let i = 0; i < 4; i++) rect(bx - f * (5 + i) - 1, by + i - 1, 3, 3, OUT);
    for (let i = 0; i < 4; i++) px(bx - f * (5 + i), by + i, '#1a1622');
    oval(bx, by, 5, 3 + ruf, OUT); oval(bx, by, 4, 2 + ruf, '#1e1a28'); rect(bx - 3, by - 2 - ruf, 6, 1, '#3a3a5a'); rect(bx - f * 2 - 1, by, 4, 1, '#2a2a40'); px(bx + f * 2, by + 1, '#2a2a40');
    disc(bx + f * 4, by - 4, 3, OUT); disc(bx + f * 4, by - 4, 2, '#1e1a28'); px(bx + f * 3, by - 5, '#3a3a5a');
    px(bx + f * 5, by - 5, '#e8e0f0');
    px(bx + f * 6, by - 4, '#8a8a9a'); px(bx + f * 7, by - 4, '#6a6a7a'); px(bx + f * 6, by - 3, caw ? '#1e1a28' : '#6a6a7a');
    if (caw) { px(bx + f * 6, by - 2, '#6a6a7a'); px(bx + f * 7, by - 2, '#6a6a7a'); text('!', bx + f * 9 - 1, by - 12, '#e8e0f0'); }
    px(bx - 1, by + 4, '#8a8a9a'); px(bx + 1, by + 4, '#8a8a9a');
  },
  tavern(x, y, t) {  // barrels from Vega's favorite tavern, a table with two mugs, the sign swinging on its post
    shadowAt(x, y, 16);
    for (const [dx, dy] of [[-10, 0], [-1, 0], [-6, -11]]) {
      vessel(x + dx, y + dy, [4, 5, 5, 5, 5, 5, 5, 5, 4], '#7a4a2a', '#9a6a3e', '#4e2c16');
      rect(x + dx - 5, y + dy - 3, 11, 1, '#3a3a44'); rect(x + dx - 5, y + dy - 7, 11, 1, '#3a3a44'); px(x + dx - 4, y + dy - 3, '#6a6a7a'); px(x + dx - 4, y + dy - 7, '#6a6a7a');
      rect(x + dx - 3, y + dy - 10, 7, 1, '#5a3a22'); px(x + dx, y + dy - 5, '#3a2014');
    }
    // the table and the mugs, foam on top
    parts([[x + 5, y - 9, 10, 2, '#8a5e36'], [x + 9, y - 7, 2, 7, '#5a3a22']]); rect(x + 5, y - 9, 10, 1, '#a87a48');
    for (const dx of [6, 11]) { parts([[x + dx, y - 14, 3, 4, '#c8a050']]); rect(x + dx, y - 14, 3, 1, '#ffffff'); px(x + dx + 3, y - 12, '#c8a050'); }
    // the post and its swinging sign, a lantern under it
    parts([[x + 16, y - 30, 2, 30, '#4a3020'], [x + 16, y - 31, 12, 2, '#5a3a22']]);
    const sw = Math.round(Math.sin(t * 1.8) * 1.2);
    line(x + 20, y - 29, x + 20 + sw, y - 27, '#2a2020'); line(x + 26, y - 29, x + 26 + sw, y - 27, '#2a2020');
    parts([[x + 18 + sw, y - 27, 11, 7, '#6a3a1e']]); rect(x + 18 + sw, y - 27, 11, 1, '#8a5230');
    text('INN', x + 19 + sw, y - 26, '#ffd447');
    parts([[x + 18, y - 17, 3, 4, '#3a3a44']]); px(x + 19, y - 16, '#ffd447'); px(x + 19, y - 15, '#ffb347'); glow(x + 19, y - 15, '#ffb347', 8, 0.5 + 0.08 * Math.sin(t * 9));
  },
  lanterns() {},  // strung across the camp: drawLanternStrings below
  telescope(x, y, t) {  // Morrow's brass telescope on its tripod, a star chart weighed down with a stone
    shadowAt(x, y, 11);
    // the chart
    parts([[x - 12, y - 2, 9, 3, '#e0d0a8']]); px(x - 10, y - 1, '#3a4a8a'); px(x - 8, y - 2, '#3a4a8a'); px(x - 6, y - 1, '#3a4a8a'); line(x - 10, y - 1, x - 6, y - 1, '#8a7a5a'); disc(x - 4, y - 1, 1.5, '#5a5260');
    // the tripod
    stroke(x, y - 10, x - 6, y, '#6a4428'); stroke(x, y - 10, x + 6, y, '#5a3a22'); stroke(x, y - 10, x + 1, y + 1, '#4a2e1c');
    // the tube: one long brass cylinder angled at the sky, dark rings round it, the eyepiece low, the lens high
    stroke(x - 6, y - 7, x + 8, y - 18, '#b8862a', 3);
    line(x - 6, y - 8, x + 7, y - 19, '#ffe08a'); line(x - 5, y - 6, x + 8, y - 17, '#7a5418');
    for (const k of [0.3, 0.62]) { const rx = Math.round(x - 6 + 14 * k), ry = Math.round(y - 7 - 11 * k); px(rx, ry - 1, '#5a3a10'); px(rx, ry, '#5a3a10'); px(rx + 1, ry, '#5a3a10'); }
    rect(x - 9, y - 7, 3, 3, OUT); px(x - 8, y - 6, '#3a3a44');
    disc(x + 9, y - 19, 2.5, OUT); disc(x + 9, y - 19, 1.5, '#8ac8ff'); px(x + 8, y - 20, '#ffffff');
    const tw = Math.floor(t * 2 + hash(x) * 3) % 4;
    if (tw === 0) { px(x + 13, y - 25, '#ffffff'); px(x + 12, y - 25, '#c8b8ff'); px(x + 14, y - 25, '#c8b8ff'); px(x + 13, y - 26, '#c8b8ff'); px(x + 13, y - 24, '#c8b8ff'); glow(x + 13, y - 25, '#c8b8ff', 6, 0.5); }
    else px(x + 13, y - 25, '#8a7aa8');
  },
  cherry(x, y, t) {  // grown from a cutting of the tree at Rin's shrine: it blooms here too
    shadowAt(x, y, 15);
    // roots, the leaning trunk, two branches
    stroke(x - 5, y, x - 1, y - 4, '#5a3a2a', 2); stroke(x + 6, y, x + 1, y - 4, '#4a2e20', 2);
    stroke(x, y, x - 1, y - 14, '#5a3a2a', 3); stroke(x - 1, y - 14, x + 1, y - 22, '#5a3a2a', 2);
    stroke(x - 1, y - 15, x - 9, y - 23, '#5a3a2a'); stroke(x, y - 17, x + 9, y - 24, '#4a2e20');
    line(x - 2, y - 1, x - 2, y - 13, '#7a5238'); line(x + 1, y - 2, x + 1, y - 12, '#3a2418');
    // the crown, swaying a little
    const s = Math.round(Math.sin(t * 0.9) * 0.6);
    blobs([[x - 11 + s, y - 23, 4], [x + 11 + s, y - 24, 4], [x - 6 + s, y - 28, 6], [x + 6 + s, y - 29, 6], [x + s, y - 33, 6], [x - 3 + s, y - 22, 4], [x + 4 + s, y - 23, 4]], '#b8487a', '#f088b0', '#ffc0da');
    for (let i = 0; i < 26; i++) { const a = hash(i + 11) * TAU, r = hash(i + 23) * 12; px(x + s + Math.cos(a) * r * 1.3, y - 28 + Math.sin(a) * r * 0.75, i % 3 ? '#ffffff' : '#ffe0ec'); }
    for (let i = 0; i < 7; i++) { const u = (t * 0.22 + hash(i + 3)) % 1; alpha(1 - u * 0.6, () => px(x - 12 + hash(i + 5) * 24 + u * 14 + Math.sin(t * 2 + i) * 2, y - 24 + u * 26, i % 2 ? '#ff9fc0' : '#ffe0ec')); }
  },
  bench(x, y, t) {  // Rivet's workbench: a vise, a lamp, gears, and an arm she hasn't finished that keeps twitching
    shadowAt(x, y, 13);
    parts([[x - 12, y - 12, 24, 3, '#8a5e36'], [x - 11, y - 9, 2, 9, '#5a3a22'], [x + 9, y - 9, 2, 9, '#4a2e1c'], [x - 11, y - 4, 22, 1, '#5a3a22']]);
    rect(x - 12, y - 12, 24, 1, '#a87a48');
    // a crate of bolts under it
    parts([[x - 6, y - 5, 7, 5, '#6a4428']]); rect(x - 6, y - 5, 7, 1, '#8a5e36'); px(x - 4, y - 6, '#9aa4b4'); px(x - 2, y - 6, '#c8d0dc');
    // the vise
    parts([[x - 12, y - 16, 5, 4, '#4a5a6a']]); rect(x - 12, y - 16, 5, 1, '#7a8a9a'); line(x - 13, y - 14, x - 15, y - 14, '#9aa4b4');
    // the lamp, bent over the bench
    stroke(x + 10, y - 12, x + 10, y - 21, '#3a3a44'); stroke(x + 10, y - 21, x + 7, y - 23, '#3a3a44'); parts([[x + 4, y - 24, 4, 2, '#d8a032']]); px(x + 5, y - 22, '#fff4b0');
    glow(x + 6, y - 20, '#ffd447', 6, 0.2);
    // gears, one turning
    const a = t * 1.4;
    for (let i = 0; i < 8; i++) { const b = a + (i * TAU) / 8; rect(Math.round(x + 1 + Math.cos(b) * 4) - 1, Math.round(y - 16 + Math.sin(b) * 4) - 1, 2, 2, '#b8902a'); }
    disc(x + 1, y - 16, 3, OUT); disc(x + 1, y - 16, 2.5, '#d8b04a'); disc(x + 1, y - 16, 1, '#6a5418');
    parts([[x - 5, y - 14, 3, 2, '#9aa4b4']]);
    // the unfinished arm, twitching
    const tw = Math.sin(t * 7) > 0.92 ? 2 : Math.sin(t * 7) > 0.6 ? 1 : 0;
    stroke(x - 6, y - 13, x - 4, y - 19, '#7a8a9a', 2); stroke(x - 4, y - 19, x - 9 + tw, y - 22 - tw, '#9aa4b4', 2);
    px(x - 9 + tw, y - 23 - tw, '#62efff'); disc(x - 4, y - 19, 1, '#62efff');
    if (tw === 2) for (let i = 0; i < 4; i++) px(x - 9 + tw + Math.round(Math.cos(i * 1.7) * 3), y - 23 - tw + Math.round(Math.sin(i * 1.7) * 2), i % 2 ? '#fff0a0' : '#62efff');
  },
  well(x, y, t) {  // a wishing well: throw a coin in, nothing comes back, but the pit hears you
    shadowAt(x, y, 14);
    // the round wall of stones
    oval(x, y - 6, 12, 5, OUT); oval(x, y - 6, 11, 4, '#5e566a');
    rect(x - 11, y - 6, 23, 6, '#5e566a'); rect(x - 12, y - 6, 1, 6, OUT); rect(x + 12, y - 6, 1, 6, OUT); rect(x - 11, y, 23, 1, OUT);
    for (let r = 0; r < 3; r++) for (let k = 0; k < 6; k++) { const sx = x - 11 + k * 4 + (r % 2) * 2; rect(sx, y - 6 + r * 2, 3, 1, k < 2 ? '#7a7288' : k > 3 ? '#4a4256' : '#6a6276'); px(sx + 3, y - 6 + r * 2, '#3a3242'); }
    rect(x - 11, y - 1, 23, 1, '#3a3242');
    // the water inside, coins on the bottom catching the light
    oval(x, y - 7, 9, 2, '#0e1a2a'); rect(x - 7, y - 8, 14, 1, '#1a2a44');
    for (let i = 0; i < 4; i++) if ((Math.floor(t * 1.5) + i) % 4 === 0) px(x - 6 + i * 4, y - 7 + (i % 2), '#ffd447');
    // the posts, the little roof, the crank and the bucket on its rope
    parts([[x - 11, y - 26, 2, 19, '#6a4428'], [x + 10, y - 26, 2, 19, '#5a3a22']]);
    for (let r = 0; r < 5; r++) { const w = 15 - r * 3; rect(x - w - 1, y - 27 - r * 2, w * 2 + 3, 3, OUT); }
    for (let r = 0; r < 5; r++) { const w = 15 - r * 3; rect(x - w, y - 27 - r * 2, w * 2 + 1, 2, r % 2 ? '#8a3a2a' : '#a8463a'); px(x - w, y - 27 - r * 2, '#c85a48'); }
    line(x - 9, y - 22, x + 9, y - 22, '#4a2e1c'); px(x + 12, y - 22, '#9aa4b4'); px(x + 13, y - 21, '#9aa4b4');
    const sw = Math.round(Math.sin(t * 1.2) * 1);
    line(x, y - 22, x + sw, y - 15, '#c8b898');
    parts([[x - 2 + sw, y - 15, 5, 4, '#7a5232']]); rect(x - 2 + sw, y - 14, 5, 1, '#9aa4b4');
    // a wish, rising now and then
    const u = (t * 0.3 + hash(x)) % 1; if (u < 0.5) alpha(Math.sin(u * 2 * Math.PI), () => { px(x, y - 9 - u * 30, '#fff4b0'); glow(x, y - 9 - u * 30, '#ffd447', 4, 0.5); });
  },
  windmill(x, y, t) {  // Rivet's: she says it runs on nothing. It runs on spite.
    shadowAt(x, y, 10);
    const H = 24;
    for (let r = 0; r < H; r++) { const w = Math.round(6 - r * 0.13); rect(x - w - 1, y - 1 - r, w * 2 + 3, 1, OUT); }
    rect(x - 6, y, 13, 1, OUT);
    for (let r = 0; r < H; r++) {
      const w = Math.round(6 - r * 0.13), yy = y - 1 - r;
      rect(x - w, yy, w * 2 + 1, 1, '#7a6a5c'); rect(x - w, yy, 2, 1, '#9a8a76'); rect(x + w - 1, yy, 2, 1, '#54463c');
      if (r % 4 === 3) for (let k = -w + ((r >> 2) % 2) * 2; k < w; k += 4) px(x + k, yy, '#5a4c42');
    }
    rect(x - 3, y - 8, 6, 8, OUT); rect(x - 2, y - 7, 4, 7, '#3a2418'); px(x + 1, y - 4, '#d8a032');
    rect(x - 2, y - 18, 4, 4, OUT); rect(x - 1, y - 17, 2, 2, '#ffd447'); glow(x, y - 16, '#ffb347', 6, 0.4);
    for (let r = 0; r < 5; r++) { const w = 5 - r; rect(x - w - 1, y - H - 1 - r, w * 2 + 3, 1, OUT); }
    for (let r = 0; r < 5; r++) { const w = 5 - r; rect(x - w, y - H - 1 - r, w * 2 + 1, 1, r < 2 ? '#6a3a2a' : '#8a4a32'); px(x - w, y - H - 1 - r, '#a85a3a'); }
    // four sails of cloth on wooden frames, turning
    const hx = x, hy = y - H - 3;
    for (let i = 0; i < 4; i++) {
      const a = t * 1.3 + (i * TAU) / 4, c = Math.cos(a), s = Math.sin(a);
      for (let j = 1; j <= 4; j += 0.5) line(hx + c * 4 - s * j, hy + s * 4 + c * j, hx + c * 15 - s * j, hy + s * 15 + c * j, j >= 4 ? '#8a6a48' : j < 2.5 ? '#f0e4cc' : '#c8b898');
      for (let k = 6; k <= 15; k += 3) line(hx + c * k - s, hy + s * k + c, hx + c * k - s * 4, hy + s * k + c * 4, '#8a6a48');
      line(hx, hy, hx + c * 16, hy + s * 16, '#5a3a28');
    }
    disc(hx, hy, 2.5, OUT); disc(hx, hy, 1.5, '#62efff'); px(hx, hy, '#e0ffff'); glow(hx, hy, '#62efff', 8, 0.45 + 0.15 * Math.sin(t * 5));
  },
  wartable(x, y, t) {  // a map of the pit, floor by floor; Kael marks every floor he clears
    shadowAt(x, y, 13);
    parts([[x - 12, y - 11, 24, 3, '#7a5232'], [x - 11, y - 8, 2, 8, '#5a3a22'], [x + 9, y - 8, 2, 8, '#4a2e1c']]);
    rect(x - 12, y - 11, 24, 1, '#9a6e44'); rect(x - 12, y - 9, 24, 1, '#5a3a22');
    // the map, a little curled, the pit drawn on it in rings, red marks on the floors cleared
    parts([[x - 9, y - 13, 16, 3, '#e8d8b0']]); rect(x - 9, y - 13, 16, 1, '#fff0d0'); px(x - 10, y - 12, '#c8b890'); px(x + 7, y - 12, '#c8b890');
    for (let k = 0; k < 3; k++) { rect(x - 6 + k * 2, y - 12 + (k % 2), 10 - k * 4, 1, '#8a6a4a'); }
    px(x - 4, y - 13, '#d0303a'); px(x + 2, y - 12, '#d0303a'); px(x - 1, y - 11, '#d0303a');
    // a dagger stuck in the table, two candles
    line(x + 9, y - 12, x + 11, y - 18, '#c8d0dc'); px(x + 10, y - 16, '#e8f0ff'); rect(x + 10, y - 19, 3, 1, '#d8a032'); px(x + 12, y - 20, '#5a3020');
    for (const [dx, k] of [[-11, 0], [8, 1]]) { parts([[x + dx, y - 16, 2, 4, '#f0e8d0']]); px(x + dx, y - 16, '#ffffff'); flame(x + dx, y - 17, t, k); }
  },
  torii(x, y, t) {  // a red gate like the one at the Red Oni shrine, paper streamers on its rope
    shadowAt(x, y, 17);
    parts([[x - 12, y - 26, 3, 26, '#c0302a'], [x + 10, y - 26, 3, 26, '#a8282a'], [x - 13, y - 4, 5, 4, '#2a1a1a'], [x + 9, y - 4, 5, 4, '#2a1a1a']]);
    rect(x - 12, y - 26, 1, 22, '#e0504a'); rect(x + 12, y - 26, 1, 22, '#8a1a22');
    // the lower beam, the plaque, the great top beam curving up at its ends
    parts([[x - 15, y - 21, 31, 2, '#a8282a'], [x - 2, y - 26, 5, 5, '#2a1a1a']]); rect(x - 15, y - 21, 31, 1, '#d8403a');
    px(x, y - 25, '#ffd447'); px(x, y - 23, '#ffd447'); px(x + 1, y - 24, '#ffd447');
    parts([[x - 17, y - 29, 35, 3, '#c0302a'], [x - 19, y - 32, 39, 3, '#2a1a1a']]); rect(x - 17, y - 29, 35, 1, '#e0504a');
    rect(x - 21, y - 34, 3, 2, OUT); rect(x + 19, y - 34, 3, 2, OUT); px(x - 20, y - 33, '#2a1a1a'); px(x + 20, y - 33, '#2a1a1a'); rect(x - 19, y - 32, 39, 1, '#4a3030');
    // the rope between the posts and the zigzag paper streamers hanging from it
    for (let i = 0; i <= 18; i++) px(x - 9 + i, y - 16 + Math.round(Math.sin((i / 18) * Math.PI) * 2), '#c8a870');
    for (const k of [-6, 0, 6]) { const sw = Math.round(Math.sin(t * 2.2 + k) * 0.7), sy = y - 15 + Math.round(Math.sin(((k + 9) / 18) * Math.PI) * 2); px(x + k, sy, '#ffffff'); px(x + k + 1 + sw, sy + 1, '#ffffff'); px(x + k + sw, sy + 2, '#e8e8f0'); px(x + k + 1 + sw, sy + 3, '#ffffff'); }
    for (let i = 0; i < 5; i++) { const u = (t * 0.3 + hash(i + 7)) % 1; px(x - 10 + hash(i) * 20 + u * 8, y - 30 + u * 30, '#ff9fc0'); }
  },
  tomb(x, y, t) {  // the King's tomb: Grom carved it himself. Aurel, who was good once.
    shadowAt(x, y, 15);
    parts([[x - 14, y - 3, 28, 3, '#4a4250']]); rect(x - 14, y - 3, 28, 1, '#6a6276');
    // the headstone, its top rounded, a crown carved and gilded on it, the name cut under it
    const tops = [6, 8, 10, 11];
    for (let r = 0; r < 4; r++) rect(x - tops[r] - 1, y - 27 + r, tops[r] * 2 + 2, 1, OUT);
    rect(x - 12, y - 23, 24, 20, OUT);
    for (let r = 0; r < 4; r++) rect(x - tops[r], y - 26 + r, tops[r] * 2, 1, '#7a7288');
    rect(x - 11, y - 23, 22, 20, '#6a6276'); rect(x - 11, y - 23, 2, 20, '#7e7690'); rect(x + 9, y - 23, 2, 20, '#524a5e'); rect(x - 6, y - 26, 6, 1, '#948ca6');
    for (const [dx, h] of [[-4, 2], [-2, 3], [0, 4], [2, 3], [4, 2]]) rect(x + dx - 1, y - 18 - h, 2, h, '#d8a032');
    rect(x - 5, y - 18, 10, 2, '#d8a032'); rect(x - 5, y - 18, 10, 1, '#ffd447'); px(x - 1, y - 17, '#d0303a');
    text('AUREL', x, y - 11, '#8a82a0', 1, 'c'); text('AUREL', x, y - 12, '#2a2430', 1, 'c');
    rect(x - 8, y - 5, 16, 1, '#524a5e');
    // candles and flowers at its foot
    for (const [dx, k] of [[-14, 0], [13, 1]]) { parts([[x + dx, y - 7, 2, 4, '#f0e8d0']]); flame(x + dx, y - 8, t, k); }
    for (let i = 0; i < 6; i++) { px(x - 8 + i * 3, y - 4, '#4a9a40'); px(x - 8 + i * 3, y - 5, ['#ff9fc0', '#ffd447', '#ffffff'][i % 3]); }
  },
  koi(x, y, t) {  // a pond; the fish swam up out of the pit. They glow a little. Nobody minds.
    // the stone rim
    oval(x, y - 5, 18, 6, OUT); oval(x, y - 5, 17, 5, '#5e566a');
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU, sx = x + Math.cos(a) * 16, sy = y - 5 + Math.sin(a) * 5; rect(sx - 1, sy, 3, 1, Math.sin(a) < 0 ? '#7a7288' : '#4a4256'); }
    // the water, deeper in the middle
    oval(x, y - 5, 14, 3, '#123a4a'); oval(x + 1, y - 5, 10, 2, '#0c2a38'); rect(x - 10, y - 8, 12, 1, '#2a6a7a');
    // ripples spreading
    for (let k = 0; k < 2; k++) { const u = (t * 0.35 + k * 0.5) % 1, rx = 2 + u * 10, ry = 1 + u * 2.5; alpha(1 - u, () => { for (let i = 0; i < 20; i++) { const a = (i / 20) * TAU; px(x - 3 + Math.cos(a) * rx, y - 5 + Math.sin(a) * ry, '#4a9aaa'); } }); }
    // three koi, circling
    for (let i = 0; i < 3; i++) {
      const a = t * (0.5 + i * 0.12) * (i % 2 ? -1 : 1) + i * 2.1, fx = x + Math.cos(a) * (9 - i * 2), fy = y - 5 + Math.sin(a) * (2.5 - i * 0.5), d = (i % 2 ? -1 : 1) * Math.sign(Math.cos(a + Math.PI / 2)) || 1;
      const c = ['#ff7a2a', '#ffffff', '#ffb347'][i], c2 = ['#ffffff', '#ff5a2a', '#ff7a2a'][i];
      rect(fx - 1, fy, 3, 1, c); px(fx + d, fy, c2); px(fx - d * 2, fy, c); px(fx - d * 3, fy - 1 + (Math.floor(t * 6 + i) % 2), c2);
      glow(fx, fy, c, 4, 0.2);
    }
    // lily pads and a lotus
    for (const [dx, dy] of [[-9, -6], [8, -3], [4, -7]]) { disc(x + dx, y + dy, 2, '#2a6a2a'); px(x + dx - 1, y + dy - 1, '#4a9a40'); px(x + dx + 1, y + dy, '#123a4a'); }
    px(x + 4, y - 8, '#ffd0e0'); px(x + 3, y - 8, '#ff9fc0'); px(x + 5, y - 8, '#ff9fc0'); px(x + 4, y - 9, '#ffffff');
  },
  banners(x, y, t) {  // one of two of Aurel's old banners, the sun stitched in gold, from before
    shadowAt(x + 6, y, 7);
    parts([[x, y - 34, 2, 34, '#2a2228']]); rect(x, y - 34, 1, 34, '#4a3e48');
    parts([[x - 1, y - 37, 4, 2, '#d8a032']]); px(x, y - 39, '#fff4b0'); px(x + 1, y - 38, '#ffd447'); px(x, y - 38, '#ffd447');
    parts([[x - 1, y - 33, 14, 1, '#4a3030']]);
    const sw = (i) => Math.round(Math.sin(t * 2.1 + i * 0.4 + x) * 1.3 * (i / 20));
    for (let i = 0; i < 22; i++) {
      const yy = y - 32 + i, d = sw(i), cut = i > 17 ? i - 17 : 0;
      rect(x + 2 + d - 1, yy, 12 + 2, 1, OUT);
      if (cut) { rect(x + 2 + d, yy, 5 - cut, 1, '#8a1a2a'); rect(x + 7 + d + cut, yy, 5 - cut, 1, '#6a1222'); px(x + 6 + d, yy, OUT); px(x + 7 + d, yy, OUT); }
      else { rect(x + 2 + d, yy, 6, 1, '#8a1a2a'); rect(x + 8 + d, yy, 4, 1, '#6a1222'); px(x + 2 + d, yy, '#d8a032'); px(x + 13 + d, yy, '#b8862a'); }
    }
    rect(x + 2 + sw(0), y - 32, 11, 1, '#d8a032');
    const sx = x + 7 + sw(9), sy = y - 23;
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + t * 0.2; px(sx + Math.round(Math.cos(a) * 4), sy + Math.round(Math.sin(a) * 4), '#ffd447'); }
    disc(sx, sy, 2.5, '#ffd447'); px(sx - 1, sy - 1, '#fff4b0');
    for (const dx of [3, 12]) { const tx = x + dx + sw(21); px(tx, y - 9, '#d8a032'); px(tx, y - 8, '#ffd447'); }
  },
  armor(x, y, t) {  // Grom's armor from the King's guard: he won't wear it, he won't sell it
    shadowAt(x, y, 11);
    // the stand
    parts([[x - 6, y - 2, 13, 2, '#5a3a22'], [x - 1, y - 20, 3, 18, '#6a4428'], [x - 9, y - 25, 19, 2, '#7a5232']]);
    // the big kite shield leaning on the stand, his old sun on it
    for (let r = 0; r < 14; r++) { const w = r < 9 ? 5 : 13 - r; rect(x + 6 - w - 1, y - 16 + r, w * 2 + 3, 1, OUT); }
    for (let r = 0; r < 14; r++) { const w = r < 9 ? 5 : 13 - r; rect(x + 6 - w, y - 16 + r, w * 2 + 1, 1, '#4a5a6a'); px(x + 6 - w, y - 16 + r, '#7a8a9a'); if (w > 1) px(x + 6 + w, y - 16 + r, '#2a3440'); }
    rect(x + 1, y - 16, 11, 1, '#9aaab8'); disc(x + 6, y - 11, 2, '#d8a032'); px(x + 5, y - 12, '#fff4b0');
    // the breastplate and the pauldrons
    parts([[x - 6, y - 26, 13, 11, '#5a6676'], [x - 10, y - 27, 5, 4, '#6a7686'], [x + 6, y - 27, 5, 4, '#4a5666']]);
    rect(x - 6, y - 26, 13, 1, '#9aa6b6'); rect(x - 6, y - 26, 3, 11, '#7a8696'); rect(x + 4, y - 26, 3, 11, '#3e4a58'); rect(x, y - 24, 1, 8, '#3e4a58');
    rect(x - 6, y - 17, 13, 2, '#8a6a2a'); px(x, y - 17, '#ffd447');
    rect(x - 10, y - 27, 5, 1, '#aab6c6'); rect(x + 6, y - 27, 5, 1, '#8a96a6');
    // the red scarf, tied at the neck, streaming in the wind
    const w = (i) => Math.round(Math.sin(t * 3 + i * 0.7) * 1.2 * (i / 8));
    parts([[x - 4, y - 29, 9, 3, '#c0303a']]); rect(x - 4, y - 29, 9, 1, '#e05060');
    for (let i = 0; i < 9; i++) { rect(x - 5 - i, y - 28 + w(i), 1, 3, OUT); rect(x - 5 - i, y - 27 + w(i), 1, 1, i % 3 ? '#c0303a' : '#a02030'); }
    for (let i = 0; i < 9; i++) px(x - 5 - i, y - 28 + w(i) + 1, '#e05060');
    // the helmet: closed, a visor slit that still glows a little, the gold horns
    parts([[x - 5, y - 38, 11, 9, '#6a7686']]); rect(x - 5, y - 38, 11, 2, '#9aa6b6'); rect(x - 5, y - 38, 3, 9, '#8a96a6'); rect(x + 3, y - 36, 3, 7, '#4a5666');
    rect(x - 4, y - 34, 9, 2, '#1a1622'); rect(x - 3, y - 34, 7, 1, mix('#ffd447', '#1a1622', 0.4 + 0.3 * Math.sin(t * 1.5)));
    for (const [hx, f] of [[-5, -1], [5, 1]]) { const p = [[0, 0], [f, -1], [f * 2, -2], [f * 2, -3], [f * 3, -4], [f * 3, -5]]; for (const [dx, dy] of p) rect(x + hx + dx - 1, y - 36 + dy - 1, 3, 3, OUT); for (const [dx, dy] of p) px(x + hx + dx, y - 36 + dy, dy < -3 ? '#fff6d8' : '#ffd447'); px(x + hx, y - 36, '#c9a24a'); }
  },
  fountain(x, y, t) {  // the ember fountain: it pours light, not water, and nobody knows where it comes from
    shadowAt(x, y, 15);
    oval(x, y - 4, 14, 5, OUT); rect(x - 14, y - 4, 29, 4, OUT); oval(x, y - 1, 14, 2, OUT);
    oval(x, y - 1, 13, 1, '#3e3644'); rect(x - 13, y - 4, 27, 3, '#4a4256');
    for (let k = 0; k < 7; k++) { rect(x - 13 + k * 4, y - 4, 1, 3, '#3a3242'); px(x - 12 + k * 4, y - 4, '#5e566a'); }
    oval(x, y - 5, 13, 4, '#6a6276'); oval(x, y - 5, 11, 3, '#e0601a'); oval(x - 1, y - 5, 9, 2, '#ff9a3c'); rect(x - 6, y - 6, 8, 1, '#ffd447');
    for (let k = 0; k < 2; k++) { const u = (t * 0.6 + k * 0.5) % 1; alpha(1 - u, () => { for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU; px(x + Math.cos(a) * (2 + u * 8), y - 5 + Math.sin(a) * (0.6 + u * 2), '#fff0a0'); } }); }
    // the pillar, its bowl, and the light running over the bowl's lip in arcs into the basin
    parts([[x - 2, y - 18, 5, 13, '#5e566a'], [x - 7, y - 20, 15, 2, '#6a6276'], [x - 5, y - 22, 11, 2, '#7a7288']]);
    rect(x - 2, y - 18, 1, 13, '#7a7288'); rect(x + 2, y - 18, 1, 13, '#463e50'); rect(x - 7, y - 20, 15, 1, '#8a8296');
    rect(x - 4, y - 22, 9, 1, '#ffd447');
    for (let i = 0; i < 16; i++) { const side = i % 2 ? 1 : -1, u = (t * 0.9 + i / 16) % 1; px(x + side * (6 + u * 5), y - 20 + u * u * 15, u < 0.4 ? '#fff4c0' : u < 0.75 ? '#ffd447' : '#ff8a2a'); }
    // a small sun on top
    const sy = y - 27;
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + t * 0.5; px(x + Math.round(Math.cos(a) * 5), sy + Math.round(Math.sin(a) * 5), i % 2 ? '#ffb347' : '#ffd447'); }
    disc(x, sy, 3, OUT); disc(x, sy, 2, '#ffd447'); px(x - 1, sy - 1, '#fff4b0');
    glow(x, sy, '#ffd447', 8, 0.4); glow(x, y - 6, '#ff8a2a', 14, 0.28 + 0.05 * Math.sin(t * 3));
  },
  starstone(x, y, t) {  // a piece of a star that fell; Morrow says it hums. It does.
    shadowAt(x, y, 9, 0.3);
    // a ring of stones round a rune circle on the ground, glowing in turn
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU, on = (Math.floor(t * 3) + i) % 12 < 3; px(x + Math.cos(a) * 7, y - 2 + Math.sin(a) * 2, on ? '#e0c8ff' : '#7a5aa8'); }
    for (const [dx, dy] of [[-9, -1], [8, -1], [-5, 1], [5, 1], [0, -4]]) { rect(x + dx - 1, y + dy - 2, 4, 3, OUT); rect(x + dx, y + dy - 1, 2, 1, '#6a6276'); px(x + dx, y + dy - 1, '#8a8296'); }
    // the crystal, floating, turning (its facets slide past), motes circling it
    const b = Math.round(Math.sin(t * 1.4) * 2), cy = y - 18 + b, ph = Math.floor(t * 2) % 3;
    glow(x, cy, '#b48cff', 11, 0.3 + 0.1 * Math.sin(t * 2.3));
    const rows = [0, 1, 2, 3, 3, 4, 4, 3, 3, 2, 2, 1, 0];
    rows.forEach((w, i) => rect(x - w - 1, cy - 7 + i, w * 2 + 3, 1, OUT));
    rect(x, cy - 8, 1, 1, OUT); rect(x, cy + 6, 1, 1, OUT);
    rows.forEach((w, i) => { const yy = cy - 7 + i; rect(x - w, yy, w * 2 + 1, 1, '#8a5ad8'); rect(x - w, yy, Math.max(1, w - ph + 1), 1, '#c8a8ff'); px(x + w, yy, '#5a3aa8'); });
    px(x - 1, cy - 4, '#ffffff'); px(x - 2, cy - 2, '#f0e8ff');
    for (let i = 0; i < 3; i++) { const a = t * 1.7 + (i * TAU) / 3, mx = x + Math.cos(a) * 9, my = cy + Math.sin(a) * 3; if (Math.sin(a) > 0 || true) px(mx, my, i % 2 ? '#ffffff' : '#e0c8ff'); }
  },
  throne(x, y, t) {  // a copy of Aurel's throne. Nobody sits in it. Nobody ever will.
    shadowAt(x, y, 15);
    // the dais, two steps
    parts([[x - 14, y - 3, 28, 3, '#4a4250'], [x - 11, y - 6, 22, 3, '#5e566a']]); rect(x - 14, y - 3, 28, 1, '#6a6276'); rect(x - 11, y - 6, 22, 1, '#7a7288');
    rect(x - 10, y - 5, 20, 1, '#8a1a2a');
    // legs, the seat with its red cushion, the arms ending in gold
    parts([[x - 9, y - 12, 3, 6, '#b8862a'], [x + 6, y - 12, 3, 6, '#8a6014'], [x - 9, y - 15, 18, 4, '#8a1a2a']]);
    rect(x - 9, y - 15, 18, 1, '#c84050'); rect(x - 9, y - 12, 18, 1, '#5a1220');
    parts([[x - 11, y - 20, 3, 7, '#d8a032'], [x + 8, y - 20, 3, 7, '#b8862a']]); disc(x - 10, y - 21, 1.5, '#ffd447'); disc(x + 9, y - 21, 1.5, '#d8a032');
    // the tall back: gold frame, red velvet, the sun in its middle, a crown on top
    parts([[x - 8, y - 38, 16, 24, '#d8a032']]); rect(x - 8, y - 38, 16, 1, '#fff4b0'); rect(x - 8, y - 38, 1, 24, '#ffd447'); rect(x + 7, y - 38, 1, 24, '#8a6014');
    rect(x - 6, y - 36, 12, 20, '#8a1a2a'); rect(x - 6, y - 36, 2, 20, '#a82a3a'); rect(x + 4, y - 36, 2, 20, '#6a1222');
    for (let i = 0; i < 5; i++) px(x - 4 + i * 2, y - 18, '#d8a032');
    const k = 0.5 + 0.5 * Math.sin(t * 1.3);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; px(x + Math.round(Math.cos(a) * 4), y - 27 + Math.round(Math.sin(a) * 4), '#d8a032'); }
    disc(x, y - 27, 2.5, '#ffd447'); px(x - 1, y - 28, '#fff4b0'); glow(x, y - 27, '#ffd447', 12, 0.25 + 0.2 * k);
    for (const [dx, h] of [[-6, 3], [-3, 4], [0, 6], [3, 4], [6, 3]]) { rect(x + dx - 1, y - 38 - h - 1, 3, h + 1, OUT); rect(x + dx, y - 38 - h, 1, h, '#ffd447'); }
    px(x, y - 45, '#d0303a');
  },
};

// strings of paper lanterns, hung across the camp between the given posts, swaying a little
export function drawLanternStrings(posts, t) {
  for (let i = 0; i + 1 < posts.length; i++) {
    const [x0, y0] = posts[i], [x1, y1] = posts[i + 1], n = Math.max(4, Math.round(Math.abs(x1 - x0) / 10));
    for (let k = 0; k <= n; k++) {
      const u = k / n, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u + Math.sin(u * Math.PI) * 10;
      px(x, y, '#3a2a22');
      if (k % 2 === 1) {
        const c = ['#ff7a2a', '#ffd447', '#ff9fc0'][k % 3], sw = Math.round(Math.sin(t * 1.6 + k) * 0.6), lx = Math.round(x) + sw, ly = Math.round(y) + 1;
        px(lx, ly, '#3a2a22');
        rect(lx - 2, ly + 1, 5, 5, OUT); rect(lx - 1, ly + 1, 3, 1, '#2a1a1a'); rect(lx - 2, ly + 2, 5, 3, c); rect(lx - 1, ly + 5, 3, 1, '#2a1a1a');
        px(lx - 1, ly + 3, mix(c, '#ffffff', 0.45)); px(lx + 1, ly + 3, mix(c, '#000000', 0.25)); px(lx, ly + 6, c);
        glow(lx, ly + 3, c, 7, 0.32 + 0.1 * Math.sin(t * 3 + k));
      }
    }
  }
}
