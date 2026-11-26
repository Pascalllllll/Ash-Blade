// Things to break. Boxes turn up on every floor, in a dozen kinds (BOXES: crates in four woods, iron-bound ones, long
// ones, stacks, painted cargo boxes, slatted crates of apples, tarps roped over crates, lockboxes, barrels, sacks,
// baskets); each floor also has two things of its own that suit it (clay urns of bones in the Pit, blocks of ice in
// the Frozen Hollow, powder kegs in the Ember Forge that blow up, server boxes on the Neon Grid...). world.js lays a
// fresh set out whenever a new floor begins (every five waves), drops a few more boxes in from above as each later
// wave starts, and they stay broken once broken. This file is what they are and how they look; world.js does the
// breaking (spawnProps, dropBoxes, hitProp, breakProp). Each one is drawn standing on its base at (x, y) in pixels,
// facing the camera; e is the one on the floor (e.v and e.w are its own two random numbers: which wood, which mark).
//   r      how wide it is on the floor (hits and bumping into it)
//   h      how tall it stands (where the cracks show and where its pieces fly from)
//   hp     hits it takes (a heavy blow breaks anything at once)
//   mat    what it is made of: how it sounds and how it breaks (wood, clay, bone, ice, glass, crystal, stone, metal,
//          gold, goo, wax)
//   pal    the colors of its pieces
//   boom   it explodes when it breaks (and sets off any others near)
//   fx     something extra when it goes: 'glitch', 'embers', 'shadow', 'stars'
//   pieces the colors of its pieces when they depend on the one on the floor (its wood, its paint)
import { ctx, rect, px, line, disc, glow, mix } from './gfx.js?v=216';

const TAU = Math.PI * 2;
const OUT = '#140c14';
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// boxes drawn with a dark outline round all of them (the outlines first, so neighbors don't cut into each other)
function parts(list) {
  for (const [x, y, w, h] of list) rect(x - 1, y - 1, w + 2, h + 2, OUT);
  for (const [x, y, w, h, c] of list) rect(x, y, w, h, c);
}
// a round pot, jar or urn: one half-width per row from the bottom up, lit on the left, shaded on the right
function vessel(x, y, ws, c, l, d, alpha = 1) {
  const n = ws.length;
  for (let i = 0; i < n; i++) rect(x - ws[i] - 1, y - 1 - i, ws[i] * 2 + 3, 1, OUT);
  rect(x - ws[0], y, ws[0] * 2 + 1, 1, OUT); rect(x - ws[n - 1], y - n - 1, ws[n - 1] * 2 + 1, 1, OUT);
  const a0 = ctx.globalAlpha;
  ctx.globalAlpha = a0 * alpha;
  for (let i = 0; i < n; i++) {
    const w = ws[i], yy = y - 1 - i, lw = Math.max(1, Math.round(w * 0.55)), dw = Math.max(1, Math.round(w * 0.5));
    rect(x - w, yy, w * 2 + 1, 1, c); rect(x - w, yy, lw, 1, l); rect(x + w + 1 - dw, yy, dw, 1, d);
  }
  ctx.globalAlpha = a0;
}
// a spike of ice or crystal, h tall from its base, w wide at the base
function spike(x, y, h, w, c, l, d) {
  for (let i = 0; i < h; i++) { const ww = Math.round(w * (1 - i / h)); rect(x - ww - 1, y - 1 - i, ww * 2 + 3, 1, OUT); }
  for (let i = 0; i < h; i++) { const ww = Math.round(w * (1 - i / h)); rect(x - ww, y - 1 - i, ww * 2 + 1, 1, c); px(x - ww, y - 1 - i, l); if (ww > 0) px(x + ww, y - 1 - i, d); }
  px(x, y - h, l);
}
function skull(x, y, c = '#e2d6b8') {
  rect(x - 3, y - 6, 7, 6, OUT); rect(x - 2, y - 5, 5, 4, c); rect(x - 2, y - 5, 2, 1, '#fff4dc');
  px(x - 1, y - 3, '#2a1a1a'); px(x + 1, y - 3, '#2a1a1a'); rect(x - 1, y - 1, 3, 1, c); px(x, y - 1, '#2a1a1a');
}
function gear(cx, cy, r, a, c, d) {
  for (let i = 0; i < 8; i++) { const b = a + (i * TAU) / 8; rect(Math.round(cx + Math.cos(b) * (r + 1)) - 1, Math.round(cy + Math.sin(b) * (r + 1)) - 1, 2, 2, c); }
  disc(cx, cy, r, c); disc(cx, cy, Math.max(1, r - 2), d); px(cx, cy, c);
}
function flame(x, y, t, k, c1, c2) {
  const f = Math.floor(t * 12 + k * 3) % 3;
  px(x, y - 1 - (f === 2 ? 1 : 0), c2); px(x, y, c1); if (f === 0) px(x, y - 2, c2);
}

// wood in four tones, one picked for each box when it is laid out: lid, face, shadow side, seams, lit edge
const WOODS = [
  ['#a8743e', '#7a4a26', '#5a3418', '#4a2a14', '#c8904a'],   // oak
  ['#d0a868', '#a88048', '#7e5c30', '#5a4020', '#ecd098'],   // pine
  ['#7e5236', '#5c3826', '#42261a', '#2e1a10', '#a0704a'],   // walnut
  ['#8e887a', '#6c665a', '#504c42', '#3a3630', '#b0aa98'],   // grey, weathered
];
const wood = (e, k = 0) => WOODS[(Math.floor((e?.v ?? 0) * WOODS.length) + k) % WOODS.length];
const woodPieces = (e) => { const w = wood(e); return [w[1], w[0], w[2]]; };
// a mark painted on some boxes: an arrow (this way up), a cross, the old sun, a number
function mark(x, y, e, c) {
  const m = Math.floor((e?.w ?? 0) * 8);
  if (m === 0) { px(x, y - 2, c); px(x - 1, y - 1, c); px(x + 1, y - 1, c); rect(x, y - 1, 1, 4, c); }
  else if (m === 1) { line(x - 2, y - 2, x + 2, y + 2, c); line(x + 2, y - 2, x - 2, y + 2, c); }
  else if (m === 2) { for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; px(x + Math.round(Math.cos(a) * 2), y + Math.round(Math.sin(a) * 2), c); } px(x, y, c); }
  else if (m === 3) { rect(x - 2, y - 2, 1, 5, c); rect(x, y - 2, 2, 1, c); rect(x + 1, y - 1, 1, 1, c); rect(x, y, 2, 1, c); rect(x + 1, y + 1, 1, 1, c); rect(x, y + 2, 2, 1, c); }
}
// paint for the cargo boxes: color, lit, dark
const PAINT = [['#a83030', '#d05050', '#6a1a1a'], ['#2e5a9a', '#4a80c8', '#1a3466'], ['#3a7a3a', '#5aa05a', '#22501e'], ['#c8962a', '#ecc050', '#7a5818']];
const paint = (e) => PAINT[Math.floor((e?.v ?? 0) * PAINT.length) % PAINT.length];
const IRON = ['#5a5e6a', '#9aa0ae', '#34363e'];
// a crate: its lid, its face with a brace across, nails at the corners
function crateAt(x, y, w, h, lid, c) {
  const [tp, fc, sd, dk, lt] = c, hw = w >> 1;
  parts([[x - hw, y - h, w, lid, tp], [x - hw, y - h + lid, w, h - lid, fc]]);
  for (let k = 1; k < 3; k++) rect(x - hw + Math.round((w * k) / 3), y - h, 1, lid, dk);
  rect(x - hw, y - h, w, 1, lt);
  rect(x - hw, y - h + lid, w, 1, lt); rect(x - hw, y - Math.round((h - lid) / 2), w, 1, sd);
  rect(x - hw, y - h + lid, 2, h - lid, sd); rect(x + hw - 2, y - h + lid, 2, h - lid, dk);
  line(x - hw + 2, y - h + lid + 1, x + hw - 3, y - 2, sd);
  for (const [dx, dy] of [[-hw + 1, -h + lid + 1], [hw - 2, -h + lid + 1], [-hw + 1, -2], [hw - 2, -2]]) px(x + dx, y + dy, lt);
}

export const PROPS = {
  // ---- every floor: boxes of every kind ----
  crate: { r: 6, h: 15, hp: 2, mat: 'wood', pal: ['#7a4a26', '#a8743e', '#5a3418'], pieces: woodPieces, draw(x, y, t, e) {
    const c = wood(e);
    crateAt(x, y, 12, 14, 4, c);
    if ((e?.w ?? 1) < 0.5) mark(x, y - 6, e, mix(c[1], '#f0e0c0', 0.55));
  } },
  smallcrate: { r: 4, h: 11, hp: 1, mat: 'wood', pal: ['#8a5a2e', '#b8844a', '#5a3418'], pieces: woodPieces, draw(x, y, t, e) {
    crateAt(x, y, 8, 10, 3, wood(e, 1));
  } },
  ironcrate: { r: 6, h: 15, hp: 3, mat: 'metal', pal: ['#5c3826', '#5a5e6a', '#9aa0ae'], draw(x, y, t, e) {
    crateAt(x, y, 12, 14, 4, WOODS[2]);
    // iron at its corners and a strap round its middle, rivets, a brass lock plate
    rect(x - 6, y - 14, 2, 14, IRON[0]); rect(x - 6, y - 14, 1, 14, IRON[1]); rect(x + 4, y - 14, 2, 14, IRON[2]);
    rect(x - 6, y - 7, 12, 2, IRON[0]); rect(x - 6, y - 7, 12, 1, IRON[1]);
    for (const [dx, dy] of [[-5, -12], [-5, -2], [4, -12], [4, -2], [-2, -6], [1, -6]]) px(x + dx, y + dy, '#c8ccd8');
    rect(x - 1, y - 11, 2, 3, '#d8a032'); px(x - 1, y - 11, '#ffe08a');
    if (Math.floor(t * 0.7 + (e?.v ?? 0) * 9) % 6 === 0) px(x - 6, y - 13, '#ffffff');
  } },
  longcrate: { r: 8, h: 11, hp: 2, mat: 'wood', pal: ['#7a4a26', '#a8743e', '#5a3418'], pieces: woodPieces, draw(x, y, t, e) {
    const c = wood(e, 2);
    crateAt(x, y, 17, 10, 3, c);
    rect(x - 8, y - 7, 1, 7, c[3]); rect(x - 1, y - 7, 1, 7, c[2]);
    if ((e?.w ?? 1) < 0.6) mark(x + 4, y - 4, e, mix(c[1], '#f0e0c0', 0.5));
  } },
  stack: { r: 6, h: 24, hp: 3, mat: 'wood', pal: ['#7a4a26', '#a8743e', '#5a3418'], pieces: woodPieces, draw(x, y, t, e) {
    // a crate with a smaller one left on top of it, a little off true
    const c = wood(e);
    crateAt(x, y, 12, 14, 4, c);
    const s = (e?.w ?? 0) < 0.5 ? -1 : 1;
    crateAt(x + s, y - 14, 8, 10, 3, wood(e, 1));
    if ((e?.w ?? 1) < 0.25) mark(x, y - 6, e, mix(c[1], '#f0e0c0', 0.55));
  } },
  cargo: { r: 7, h: 14, hp: 2, mat: 'wood', pal: ['#a83030', '#d05050', '#3a3a44'], pieces: (e) => [paint(e)[0], paint(e)[1], '#3a3a44'], draw(x, y, t, e) {
    // a painted cargo box: ribbed sides, dark corner castings, a stenciled mark, warning stripes on the bottom
    const [m, l, d] = paint(e);
    parts([[x - 7, y - 13, 14, 3, l], [x - 7, y - 10, 14, 10, m]]);
    rect(x - 7, y - 13, 14, 1, mix(l, '#ffffff', 0.3)); rect(x - 7, y - 10, 14, 1, l);
    for (const k of [-4, 0, 4]) rect(x + k, y - 9, 1, 8, d);
    rect(x - 7, y - 9, 1, 9, l); rect(x + 5, y - 9, 2, 9, d);
    for (const [dx, dy] of [[-7, -13], [5, -13], [-7, -2], [5, -2]]) rect(x + dx, y + dy, 2, 2, '#2a2a34');
    for (let i = 0; i < 6; i++) rect(x - 5 + i * 2, y - 2, 1, 1, i % 2 ? '#f0e8d0' : '#1e1e26');
    mark(x - 2, y - 6, e, '#f0e8d0');
  } },
  slatcrate: { r: 6, h: 13, hp: 1, mat: 'wood', pal: ['#a8743e', '#d0303a', '#e0c070'], pieces: (e) => [wood(e, 1)[1], '#d0303a', '#e0c070'], draw(x, y, t, e) {
    // slats with gaps between them, straw and apples showing through and heaped over the top
    const [tp, fc, sd, dk, lt] = wood(e, 1);
    rect(x - 7, y - 12, 14, 13, OUT); rect(x - 6, y - 11, 12, 11, '#2a1a10');
    for (let i = 0; i < 6; i++) px(x - 5 + i * 2, y - 10 + (i % 2), '#c8a050');
    for (const sy of [-9, -5, -1]) { rect(x - 6, y + sy, 12, 2, fc); rect(x - 6, y + sy, 12, 1, lt); }
    rect(x - 6, y - 11, 1, 11, sd); rect(x + 5, y - 11, 1, 11, dk);
    const apples = (e?.w ?? 0) < 0.5 ? ['#d0303a', '#e04848', '#b82030'] : ['#7ab83a', '#e0c040', '#9ad048'];
    for (const [dx, dy, k] of [[-3, -12, 0], [1, -12, 1], [4, -11, 2], [-1, -14, 1]]) { disc(x + dx, y + dy, 2, OUT); disc(x + dx, y + dy, 1.5, apples[k]); px(x + dx - 1, y + dy - 1, '#fff0e0'); }
  } },
  tarpbox: { r: 7, h: 15, hp: 2, mat: 'straw', pal: ['#8a8a5a', '#aaa878', '#c8a870'], draw(x, y, t, e) {
    // a crate under a canvas tarp, roped down, its corners flaring on the floor
    const g = (e?.v ?? 0) < 0.5, c = g ? '#7a845a' : '#9a8a64', l = g ? '#9aa478' : '#bcac84', d = g ? '#525c3a' : '#6e6040';
    vessel(x, y, [7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 6, 6, 5, 3], c, l, d);
    px(x - 8, y - 1, c); px(x + 8, y - 1, d); px(x - 3, y - 13, l);
    for (const [dx, dy] of [[-4, -9], [2, -6], [-1, -4], [4, -11]]) px(x + dx, y + dy, d);
    line(x - 6, y - 12, x + 6, y - 3, '#c8a870'); line(x + 6, y - 12, x - 6, y - 3, '#c8a870'); rect(x - 7, y - 7, 15, 1, '#c8a870'); px(x, y - 8, '#8a6a40');
    if (Math.sin(t * 2.3 + (e?.v ?? 0) * 9) > 0.8) px(x + 7, y - 4, l);
  } },
  lockbox: { r: 4, h: 10, hp: 2, mat: 'metal', pal: ['#4a2e1c', '#6a6e7a', '#d8a032'], draw(x, y, t, e) {
    // a small iron-bound box with a padlock; the lid rounded
    parts([[x - 5, y - 9, 10, 3, '#6a4428'], [x - 5, y - 6, 10, 6, '#4a2e1c']]); rect(x - 4, y - 10, 8, 1, OUT); rect(x - 4, y - 10, 8, 1, '#7a5232');
    rect(x - 5, y - 9, 10, 1, '#8a5e36');
    rect(x - 5, y - 9, 1, 9, IRON[1]); rect(x + 4, y - 9, 1, 9, IRON[2]); rect(x - 5, y - 6, 10, 1, IRON[0]); rect(x - 2, y - 9, 1, 9, IRON[0]); rect(x + 1, y - 9, 1, 9, IRON[0]);
    rect(x - 1, y - 6, 3, 3, '#d8a032'); px(x - 1, y - 7, '#b8862a'); px(x + 1, y - 7, '#b8862a'); px(x, y - 8, '#b8862a'); px(x, y - 5, '#3a2a10'); px(x - 1, y - 6, '#ffe08a');
    if (Math.floor(t * 0.9 + (e?.v ?? 0) * 7) % 5 === 0) px(x + 1, y - 6, '#ffffff');
  } },
  barrel: { r: 5, h: 14, hp: 2, mat: 'wood', pal: ['#7a4a26', '#a8743e', '#3a3a44'], pieces: (e) => [wood(e, 3)[1], wood(e, 3)[0], '#3a3a44'], draw(x, y, t, e) {
    const [tp, fc, sd, dk, lt] = wood(e, 3);
    vessel(x, y, [4, 5, 5, 6, 6, 6, 6, 6, 5, 5, 4, 4], fc, lt, sd);
    for (const [hy, w] of [[-3, 5], [-7, 6], [-11, 4]]) { rect(x - w, y + hy, w * 2 + 1, 1, '#3a3a44'); px(x - w + 1, y + hy, '#7a7e8a'); }
    rect(x - 3, y - 13, 7, 1, tp); px(x - 3, y - 13, lt); px(x + 1, y - 6, dk);
    for (const k of [-2, 2]) rect(x + k, y - 10, 1, 8, mix(fc, '#000000', 0.18));
  } },
  sack: { r: 5, h: 12, hp: 1, mat: 'straw', pal: ['#b8a070', '#d8c090', '#e8d8a8'], draw(x, y, t, e) {
    // a burlap sack tied at the neck, grain spilled at its foot, a stamp on it
    const c = '#b8a070', l = '#d8c090', d = '#8a7448';
    vessel(x, y, [5, 6, 6, 6, 6, 6, 5, 5, 4, 3, 2], c, l, d);
    rect(x - 2, y - 11, 5, 1, '#6a4a28'); px(x - 1, y - 13, l); px(x + 1, y - 14, c); px(x, y - 13, d); rect(x - 1, y - 13, 1, 1, OUT);
    for (const [dx, dy] of [[-3, -7], [2, -4], [-1, -9], [3, -8]]) px(x + dx, y + dy, mix(c, '#000000', 0.12));
    if ((e?.w ?? 1) < 0.6) { rect(x - 2, y - 7, 4, 3, mix(c, '#5a2a1a', 0.5)); px(x - 1, y - 6, c); }
    for (const dx of [-6, -5, 6, 7]) px(x + dx, y, '#e8d8a8');
  } },
  basket: { r: 5, h: 10, hp: 1, mat: 'straw', pal: ['#a8783a', '#d0303a', '#e8902a'], draw(x, y, t, e) {
    // a wicker basket, a handle over it, fruit heaped in it
    vessel(x, y, [4, 5, 5, 6, 6, 6], '#a8783a', '#c89858', '#7a5228');
    for (let r = 0; r < 6; r++) for (let k = -5; k <= 5; k += 2) px(x + k + (r % 2), y - 1 - r, '#8a6230');
    const fruit = (e?.w ?? 0) < 0.4 ? ['#d0303a', '#e8902a', '#5aa84a'] : (e?.w ?? 0) < 0.7 ? ['#e8902a', '#ffd447', '#e8902a'] : ['#8a3aa8', '#a85ac8', '#5aa84a'];
    for (const [dx, dy, k] of [[-3, -8, 0], [2, -8, 1], [0, -10, 2]]) { disc(x + dx, y + dy, 2.5, OUT); disc(x + dx, y + dy, 2, fruit[k]); px(x + dx - 1, y + dy - 1, '#fff4e0'); }
    for (let i = 0; i <= 10; i++) { const a = Math.PI + (i / 10) * Math.PI; px(x + Math.round(Math.cos(a) * 6), y - 7 + Math.round(Math.sin(a) * 6), i % 3 ? '#8a6230' : '#c89858'); }
  } },

  // ---- the training yard ----
  hay: { r: 6, h: 10, hp: 2, mat: 'straw', pal: ['#c8a050', '#e0c070', '#8a6a2e'], draw(x, y) {
    rect(x - 7, y - 10, 14, 10, OUT); rect(x - 6, y - 9, 12, 3, '#e0c070'); rect(x - 6, y - 6, 12, 5, '#c8a050');
    for (let i = 0; i < 6; i++) { px(x - 5 + i * 2, y - 8 + (i % 2), '#f0d890'); px(x - 5 + i * 2 + 1, y - 4 + (i % 2), '#a8823a'); }
    rect(x - 3, y - 9, 1, 8, '#6a4a2e'); rect(x + 2, y - 9, 1, 8, '#6a4a2e');
    px(x - 7, y - 3, '#c8a050'); px(x + 7, y - 6, '#e0c070');
  } },
  target: { r: 5, h: 17, hp: 1, mat: 'wood', pal: ['#c0302a', '#f0e8d8', '#6a4a2e'], draw(x, y) {
    line(x - 4, y, x - 1, y - 9, '#5a3e26'); line(x + 4, y, x + 1, y - 9, '#5a3e26'); line(x, y, x, y - 9, '#4a3420');
    disc(x, y - 11, 6, OUT); disc(x, y - 11, 5, '#f0e8d8'); disc(x, y - 11, 4, '#c0302a'); disc(x, y - 11, 2.5, '#f0e8d8'); disc(x, y - 11, 1.2, '#ffd447');
    line(x + 2, y - 13, x + 6, y - 16, '#8a6a42'); px(x + 6, y - 17, '#d8d0c0');
  } },

  // ---- the Pit ----
  urn: { r: 4, h: 13, hp: 1, mat: 'clay', pal: ['#8a4a2a', '#b86a3a', '#e2d6b8'], draw(x, y) {
    vessel(x, y, [2, 3, 4, 4, 4, 4, 3, 2, 2, 3], '#8a4a2a', '#b86a3a', '#5a2a18');
    rect(x - 4, y - 6, 9, 1, '#4a2014'); px(x - 2, y - 5, '#c88a4a'); px(x + 1, y - 5, '#c88a4a');
    line(x + 1, y - 11, x + 3, y - 14, '#e2d6b8'); px(x + 3, y - 15, '#fff4dc'); px(x + 4, y - 14, '#e2d6b8');
  } },
  skulls: { r: 5, h: 11, hp: 1, mat: 'bone', pal: ['#e2d6b8', '#c8bca4', '#fff4dc'], draw(x, y) {
    for (const [dx, dy] of [[-6, 0], [-2, 0], [2, 0], [6, 0]]) { rect(x + dx - 2, y + dy - 1, 5, 2, OUT); rect(x + dx - 1, y + dy - 1, 3, 1, '#c8bca4'); }
    skull(x - 3, y - 1); skull(x + 3, y - 1, '#d8ccb0'); skull(x, y - 5);
  } },

  // ---- the Frozen Hollow ----
  iceblock: { r: 6, h: 15, hp: 2, mat: 'ice', pal: ['#a8e0ff', '#d8f4ff', '#5aa0d0'], draw(x, y, t) {
    rect(x - 7, y - 15, 14, 15, '#1a3050');
    rect(x - 6, y - 14, 12, 4, '#d8f4ff'); rect(x - 6, y - 10, 12, 9, '#7ac8f0');
    rect(x - 6, y - 10, 3, 9, '#a8e0ff'); rect(x + 3, y - 10, 3, 9, '#5aa0d0');
    // something frozen in it: a husk's little shape, its eyes still lit
    rect(x - 2, y - 8, 4, 5, '#3a6a90'); rect(x - 1, y - 9, 2, 1, '#3a6a90'); px(x - 1, y - 7, '#ff8a5a'); px(x + 1, y - 7, '#ff8a5a');
    px(x - 5, y - 13, '#ffffff'); px(x - 4, y - 12, '#ffffff');
    if (Math.floor(t * 2 + x) % 5 === 0) px(x + 3, y - 12, '#ffffff');
  } },
  icicles: { r: 5, h: 14, hp: 1, mat: 'ice', pal: ['#a8e0ff', '#ffffff', '#5aa0d0'], draw(x, y) {
    rect(x - 6, y - 1, 13, 2, '#c8e8f8');
    for (const [dx, h, w] of [[-4, 9, 2], [4, 7, 2], [1, 13, 3], [-1, 6, 1]]) spike(x + dx, y, h, w, '#8ad0f8', '#e8f8ff', '#4a8ac0');
  } },

  // ---- the Ember Forge ----
  keg: { r: 5, h: 13, hp: 1, mat: 'wood', boom: true, pal: ['#6a3a22', '#8a5230', '#3a3a44'], draw(x, y, t) {
    vessel(x, y, [4, 5, 5, 5, 5, 5, 5, 4], '#6a3a22', '#8a5230', '#43220f');
    rect(x - 4, y - 9, 9, 1, '#8a5a30');
    rect(x - 5, y - 3, 11, 1, '#3a3a44'); rect(x - 5, y - 7, 11, 1, '#3a3a44');
    // a burning skull painted on it, and its fuse, lit
    px(x, y - 5, '#ffd447'); px(x - 1, y - 5, '#ff7a2a'); px(x + 1, y - 5, '#ff7a2a'); px(x, y - 4, '#ff7a2a');
    line(x + 1, y - 9, x + 3, y - 12, '#2a2020');
    const s = Math.floor(t * 12 + x) % 2;
    px(x + 3, y - 13, s ? '#ffd447' : '#ff7a2a'); if (s) px(x + 4, y - 14, '#fff0a0');
    glow(x + 3, y - 13, '#ff7a2a', 5, 0.6);
  } },
  ore: { r: 5, h: 11, hp: 2, mat: 'stone', fx: 'embers', pal: ['#3a3036', '#5a4a50', '#ff7a2a'], draw(x, y, t) {
    vessel(x, y, [4, 4, 5, 5, 5], '#4a4652', '#6a6674', '#2a2830');
    rect(x - 5, y - 3, 11, 1, '#2a2830');
    for (const [dx, dy, w] of [[-3, -7, 3], [1, -8, 3], [-1, -10, 3], [3, -6, 2]]) { rect(x + dx - 1, y + dy - 1, w + 2, 3, OUT); rect(x + dx, y + dy, w, 2, '#3a3036'); px(x + dx, y + dy, '#5a4a50'); }
    const hot = 0.5 + 0.5 * Math.sin(t * 3 + x);
    for (const [dx, dy] of [[-2, -7], [2, -8], [0, -10], [4, -6]]) px(x + dx, y + dy + 1, hot > 0.5 ? '#ffb347' : '#ff7a2a');
    glow(x, y - 8, '#ff7a2a', 9, 0.25 + hot * 0.2);
  } },

  // ---- the Neon Grid ----
  datacube: { r: 4, h: 14, hp: 1, mat: 'glass', fx: 'glitch', pal: ['#62efff', '#ff4fa8', '#ffffff'], draw(x, y, t) {
    const cy = y - 8 + Math.round(Math.sin(t * 2.2 + x) * 1.5);
    const rows = [0, 1, 2, 3, 4, 3, 2, 1, 0];
    rows.forEach((w, i) => rect(x - w - 1, cy - 4 + i, w * 2 + 3, 1, '#62efff'));
    rows.forEach((w, i) => { if (w > 0) rect(x - w, cy - 4 + i, w * 2 + 1, 1, i < 4 ? '#3a1a6a' : '#22104a'); });
    rect(x - 1, cy - 1, 3, 3, '#ff4fa8'); px(x, cy, '#ffffff');
    for (let i = 0; i < 2; i++) { const a = t * 3 + i * Math.PI; px(x + Math.cos(a) * 7, cy + Math.sin(a) * 3, i ? '#ff4fa8' : '#62efff'); }
    glow(x, cy, '#62efff', 10, 0.45);
  } },
  server: { r: 6, h: 16, hp: 2, mat: 'metal', fx: 'glitch', pal: ['#221e36', '#3a3456', '#62efff'], draw(x, y, t) {
    parts([[x - 6, y - 15, 12, 3, '#3a3456'], [x - 6, y - 12, 12, 12, '#221e36']]);
    for (let r = 0; r < 3; r++) {
      rect(x - 5, y - 11 + r * 4, 10, 3, '#16132a');
      for (let k = 0; k < 3; k++) { const on = (Math.floor(t * 4) + r * 3 + k + x) % 5 !== 0; px(x - 4 + k * 2, y - 10 + r * 4, on ? (k === 2 ? '#ff4fa8' : '#62efff') : '#2a2440'); }
      rect(x + 1, y - 10 + r * 4, 3, 1, '#2a2440');
    }
    glow(x, y - 8, '#62efff', 10, 0.15);
  } },

  // ---- the Overgrown Shrine ----
  stonelamp: { r: 5, h: 19, hp: 2, mat: 'stone', pal: ['#6a6e64', '#8a8e80', '#5aa84a'], draw(x, y, t) {
    parts([[x - 5, y - 3, 10, 3, '#4a4e46'], [x - 2, y - 9, 4, 6, '#6a6e64'], [x - 4, y - 14, 8, 5, '#6a6e64'], [x - 6, y - 16, 12, 2, '#4a4e46'], [x - 3, y - 18, 6, 2, '#6a6e64']]);
    rect(x - 4, y - 3, 8, 1, '#8a8e80'); rect(x - 2, y - 9, 1, 6, '#8a8e80'); rect(x - 4, y - 14, 1, 5, '#8a8e80');
    rect(x - 2, y - 13, 4, 3, '#ffcf5a'); px(x - 2, y - 13, '#fff0a8');
    for (const [dx, dy] of [[-5, -16], [-4, -16], [4, -2], [3, -3], [-2, -5], [5, -15]]) px(x + dx, y + dy, '#5aa84a');
    glow(x, y - 12, '#ffcf5a', 11, 0.35 + 0.08 * Math.sin(t * 3 + x));
  } },
  pot: { r: 4, h: 11, hp: 1, mat: 'clay', pal: ['#d8e0f0', '#3a5aa0', '#c0302a'], draw(x, y) {
    vessel(x, y, [3, 4, 4, 4, 4, 3, 2, 3], '#d8e0f0', '#ffffff', '#9aa8c8');
    rect(x - 3, y - 4, 7, 1, '#3a5aa0'); px(x - 2, y - 6, '#3a5aa0'); px(x + 1, y - 6, '#3a5aa0'); px(x, y - 5, '#3a5aa0');
    rect(x - 1, y - 10, 3, 2, '#c0302a'); px(x, y - 8, '#c0302a');
  } },

  // ---- the Brood Nest ----
  cocoon: { r: 5, h: 15, hp: 2, mat: 'goo', pal: ['#d8d0c8', '#a8a098', '#8ac85a'], draw(x, y, t) {
    const p = Math.sin(t * 2 + x) > 0.7 ? 1 : 0;
    vessel(x, y, [3, 4, 5, 5, 5, 5 + p, 5, 4, 4, 3, 2, 2], '#d8d0c8', '#f0ece4', '#a8a098');
    for (let i = 0; i < 5; i++) line(x - 4, y - 2 - i * 2, x + 4, y - 3 - i * 2 - (i % 2), '#b8b0a8');
    px(x - 1, y - 8, '#7a6a5a'); px(x + 1, y - 8, '#7a6a5a');
    line(x - 5, y, x - 9, y + 1, '#c8c0b8'); line(x + 5, y, x + 8, y + 2, '#c8c0b8'); line(x + 2, y - 12, x + 5, y - 16, '#c8c0b8');
  } },
  eggsac: { r: 5, h: 9, hp: 1, mat: 'goo', pal: ['#e8e0a8', '#c8c088', '#8ac85a'], draw(x, y, t) {
    rect(x - 6, y - 2, 13, 2, '#c8c0b8'); line(x - 7, y, x - 9, y + 1, '#c8c0b8'); line(x + 7, y, x + 9, y + 1, '#c8c0b8');
    [[-3, 0], [2, 0], [0, -4], [4, -4]].forEach(([dx, dy], i) => {
      const ex = x + dx, ey = y - 4 + dy, p = Math.sin(t * 3 + i * 1.7) > 0.5 ? 1 : 0;
      disc(ex, ey, 3, OUT); disc(ex, ey, 2, '#e8e0a8'); px(ex - 1, ey - 1, '#fffbe0'); px(ex + p, ey, '#5a6a2a');
    });
  } },

  // ---- the Ashen Throne ----
  goldurn: { r: 4, h: 12, hp: 1, mat: 'gold', pal: ['#d8a032', '#ffe08a', '#8a6014'], draw(x, y, t) {
    vessel(x, y, [2, 3, 4, 4, 4, 3, 2, 2, 3], '#d8a032', '#ffe08a', '#8a6014');
    rect(x - 4, y - 3, 9, 1, '#8a6014'); px(x, y - 6, '#fff4b0'); px(x - 1, y - 6, '#ffe08a'); px(x + 1, y - 6, '#ffe08a'); px(x, y - 7, '#ffe08a'); px(x, y - 5, '#ffe08a');
    if (Math.floor(t * 1.5 + x) % 4 === 0) px(x - 3, y - 7, '#ffffff');
  } },
  candelabra: { r: 4, h: 17, hp: 1, mat: 'metal', pal: ['#d8a032', '#f0e8d8', '#8a6014'], draw(x, y, t) {
    parts([[x - 3, y - 2, 7, 2, '#8a6014'], [x, y - 11, 1, 9, '#d8a032'], [x - 4, y - 11, 9, 1, '#d8a032'], [x - 4, y - 13, 1, 2, '#d8a032'], [x + 4, y - 13, 1, 2, '#d8a032']]);
    for (const [dx, h] of [[-4, 3], [0, 4], [4, 3]]) { const top = y - (dx ? 13 : 11) - h; rect(x + dx, top, 1, h, '#f0e8d8'); flame(x + dx, top - 1, t, dx, '#ff9a3c', '#ffd447'); }
    glow(x, y - 16, '#ffb347', 12, 0.35);
  } },

  // ---- the Void Deep ----
  voidshard: { r: 5, h: 18, hp: 1, mat: 'crystal', pal: ['#7a4ad8', '#c49aff', '#3a1a7a'], draw(x, y, t) {
    const by = y - 3 + Math.round(Math.sin(t * 1.6 + x) * 1.5);
    spike(x, by, 13, 3, '#7a4ad8', '#c49aff', '#3a1a7a');
    for (let i = 0; i < 3; i++) { const ww = 3 - i; rect(x - ww, by + i, ww * 2 + 1, 1, i ? '#3a1a7a' : '#7a4ad8'); }
    for (let i = 0; i < 2; i++) { const a = t * 1.2 + i * Math.PI; spike(Math.round(x + Math.cos(a) * 7), Math.round(by - 4 + Math.sin(a) * 2), 4, 1, '#9a5aff', '#e0c8ff', '#4a2a8a'); }
    glow(x, by - 6, '#9a5aff', 12, 0.45);
  } },
  starjar: { r: 4, h: 11, hp: 1, mat: 'glass', fx: 'stars', pal: ['#c8b8f0', '#ffffff', '#6a5a9a'], draw(x, y, t) {
    vessel(x, y, [3, 4, 4, 4, 4, 4, 3, 2], '#2a2048', '#4a3a78', '#1a1430', 0.85);
    rect(x - 2, y - 10, 5, 2, '#8a6a4a');
    for (let i = 0; i < 4; i++) if ((Math.floor(t * 3) + i) % 3) px(x - 2 + Math.round(hash(i + x) * 4), y - 2 - Math.round(hash(i + 9 + x) * 5), i % 2 ? '#ffffff' : '#ffd447');
    glow(x, y - 5, '#c8b8f0', 8, 0.3);
  } },

  // ---- the Glass Hall ----
  vase: { r: 4, h: 15, hp: 1, mat: 'glass', pal: ['#bfefff', '#ffffff', '#7ac8e0'], draw(x, y, t) {
    vessel(x, y, [2, 3, 3, 3, 2, 2, 2, 2, 3], '#8ad8f0', '#e8fbff', '#4aa0c0', 0.8);
    px(x - 2, y - 7, '#ffffff');
    line(x, y - 10, x + 1, y - 13, '#5aa84a'); rect(x, y - 15, 3, 2, '#ff9fc0'); px(x + 1, y - 14, '#ffd447');
  } },
  pane: { r: 6, h: 18, hp: 1, mat: 'glass', pal: ['#a8d8f0', '#ffffff', '#c8d0dc'], draw(x, y, t) {
    line(x - 4, y, x - 2, y - 4, '#5a3a28'); line(x + 4, y, x + 2, y - 4, '#5a3a28');
    rect(x - 6, y - 18, 12, 15, OUT); rect(x - 5, y - 17, 10, 13, '#c8d0dc');
    rect(x - 4, y - 16, 8, 11, '#8ac8e8'); rect(x - 4, y - 16, 8, 4, '#c8ecff');
    const g = Math.floor((t * 6 + x) % 24) - 8;
    if (g > -4 && g < 8) { const a0 = ctx.globalAlpha; ctx.globalAlpha = a0 * 0.7; line(x - 4 + g, y - 6, x - 4 + g + 3, y - 15, '#ffffff'); ctx.globalAlpha = a0; }
  } },

  // ---- the Sun Temple ----
  amphora: { r: 4, h: 14, hp: 1, mat: 'clay', pal: ['#c87a3a', '#e8a060', '#ffd447'], draw(x, y) {
    vessel(x, y, [1, 2, 3, 4, 4, 4, 4, 3, 2, 2, 2, 3], '#c87a3a', '#e8a060', '#8a4a20');
    px(x - 4, y - 10, '#8a4a20'); px(x + 4, y - 10, '#8a4a20'); px(x - 4, y - 9, '#8a4a20'); px(x + 4, y - 9, '#8a4a20');
    px(x, y - 6, '#ffd447'); px(x - 1, y - 6, '#ffb347'); px(x + 1, y - 6, '#ffb347'); px(x, y - 7, '#ffb347'); px(x, y - 5, '#ffb347');
  } },
  brazier: { r: 5, h: 14, hp: 2, mat: 'metal', fx: 'embers', pal: ['#a8702a', '#d8a04a', '#ff7a2a'], draw(x, y, t) {
    line(x - 4, y, x - 2, y - 5, '#6a4a20'); line(x + 4, y, x + 2, y - 5, '#6a4a20'); line(x, y, x, y - 5, '#6a4a20');
    vessel(x, y - 5, [3, 4, 5, 5], '#a8702a', '#d8a04a', '#6a4418');
    for (let i = 0; i < 5; i++) { const hh = 3 + Math.sin(t * 11 + i * 1.7 + x) * 1.5 + (2 - Math.abs(i - 2)) * 1.5; rect(x - 2 + i, y - 10 - hh, 1, hh, i % 2 ? '#ffb347' : '#ff7a2a'); px(x - 2 + i, y - 11 - hh, '#ffd447'); }
    glow(x, y - 12, '#ff9a3c', 14, 0.4);
  } },

  // ---- the Clockworks ----
  cogbox: { r: 6, h: 16, hp: 2, mat: 'metal', pal: ['#5a5e6a', '#8a8e9a', '#b8902a'], draw(x, y, t) {
    parts([[x - 6, y - 11, 12, 3, '#8a8e9a'], [x - 6, y - 8, 12, 8, '#5a5e6a']]);
    rect(x - 6, y - 8, 12, 1, '#a8aebc'); rect(x - 6, y - 4, 12, 1, '#3a3e4a');
    for (const dx of [-5, 4]) { px(x + dx, y - 7, '#c8d0dc'); px(x + dx, y - 2, '#c8d0dc'); }
    gear(x + 1, y - 13, 3, t * 1.5, '#b8902a', '#6a5418'); gear(x - 3, y - 12, 2, -t * 2.2, '#d8b04a', '#6a5418');
  } },
  clock: { r: 5, h: 20, hp: 2, mat: 'wood', pal: ['#6a3a22', '#f0e8d8', '#d8a032'], draw(x, y, t) {
    parts([[x - 4, y - 19, 8, 3, '#8a5230'], [x - 3, y - 16, 6, 16, '#6a3a22']]);
    rect(x - 3, y - 16, 1, 16, '#8a5230');
    disc(x, y - 13, 3, '#f0e8d8'); px(x, y - 13, OUT);
    const a = t * 0.8, b = t * 0.07;
    line(x, y - 13, x + Math.round(Math.cos(a) * 2), y - 13 + Math.round(Math.sin(a) * 2), OUT); line(x, y - 13, x + Math.round(Math.cos(b) * 1.5), y - 13 + Math.round(Math.sin(b) * 1.5), '#8a3a2a');
    rect(x - 2, y - 9, 4, 7, '#2a1a14');
    const sw = Math.round(Math.sin(t * 3) * 1.4); line(x, y - 9, x + sw, y - 4, '#d8a032'); rect(x + sw - 1, y - 4, 2, 2, '#ffd447');
  } },

  // ---- the Last Night ----
  candles: { r: 4, h: 11, hp: 1, mat: 'wax', fx: 'shadow', pal: ['#4a3e62', '#8a7aa8', '#c49aff'], draw(x, y, t) {
    rect(x - 6, y - 1, 12, 1, '#2a2236');
    for (const [dx, h] of [[-4, 5], [-1, 8], [2, 6], [4, 4]]) {
      rect(x + dx - 1, y - h - 1, 4, h + 1, OUT); rect(x + dx, y - h, 2, h, '#4a3e62'); px(x + dx, y - h + 1, '#6a5a86'); rect(x + dx, y - h, 2, 1, '#8a7aa8'); px(x + dx + 1, y - h + 2, '#6a5a86');
      flame(x + dx, y - h - 1, t, dx, '#9a5aff', '#e0c8ff');
    }
    glow(x, y - 9, '#9a5aff', 11, 0.35);
  } },
  shadowjar: { r: 4, h: 11, hp: 1, mat: 'glass', fx: 'shadow', pal: ['#1a1430', '#3a2e5a', '#6a4aa0'], draw(x, y, t) {
    vessel(x, y, [3, 4, 4, 4, 4, 4, 3, 2], '#1a1430', '#3a2e5a', '#0a0814');
    rect(x - 2, y - 10, 5, 1, '#4a3a6a');
    const a0 = ctx.globalAlpha;
    for (let i = 0; i < 3; i++) { const u = (t * 0.6 + i / 3 + hash(x)) % 1; ctx.globalAlpha = a0 * (1 - u); px(x - 1 + i + Math.round(Math.sin(t * 2 + i) * 1.5), y - 11 - u * 9, i % 2 ? '#6a4aa0' : '#9a7ad0'); }
    ctx.globalAlpha = a0;
    glow(x, y - 6, '#6a4aa0', 8, 0.25);
  } },
};
// boxes go on every floor: how often each kind turns up
export const BOXES = { crate: 20, smallcrate: 14, ironcrate: 8, longcrate: 8, stack: 7, cargo: 9, slatcrate: 8, tarpbox: 6, lockbox: 5, barrel: 9, sack: 6, basket: 5 };
const BOX_SUM = Object.values(BOXES).reduce((a, b) => a + b, 0);
export function pickBox(r = Math.random()) { let k = r * BOX_SUM; for (const [id, w] of Object.entries(BOXES)) { k -= w; if (k < 0) return id; } return 'crate'; }
// the colors one breaks into (its own wood or paint, or its kind's)
export const piecesOf = (e) => PROPS[e.kind].pieces?.(e) || PROPS[e.kind].pal;
// each floor's own two (boxes go anywhere)
export const MAP_PROPS = {
  YARD: ['hay', 'target'],
  PIT: ['urn', 'skulls'], FROST: ['iceblock', 'icicles'], FORGE: ['keg', 'ore'], GRID: ['datacube', 'server'],
  SHRINE: ['stonelamp', 'pot'], NEST: ['cocoon', 'eggsac'], THRONE: ['goldurn', 'candelabra'], VOID: ['voidshard', 'starjar'],
  GLASS: ['vase', 'pane'], TEMPLE: ['amphora', 'brazier'], GEARS: ['cogbox', 'clock'], NIGHT: ['candles', 'shadowjar'],
};

// one on the floor: its shadow, itself (shaking when just hit), and cracks once it has been hit. One dropping in
// from above (z over the floor) falls toward its shadow, which grows as it comes down.
export function drawProp(e, t) {
  const d = PROPS[e.kind];
  if (!d) return;
  const z = Math.max(0, Math.round(e.z || 0)), k = Math.max(0.3, 1 - z / 140), sr = Math.max(1, Math.round((d.r + 1) * k));
  ctx.globalAlpha = 0.35 * (0.5 + k * 0.5);
  for (let i = -1; i <= 1; i++) rect(e.x - sr + Math.abs(i), e.y + i, sr * 2 - Math.abs(i) * 2 + 1, 1, '#05030a');
  ctx.globalAlpha = 1;
  const wob = e.wob > 0 ? Math.round(Math.sin(e.wob * 70) * Math.min(2, e.wob * 10)) : 0;
  d.draw(e.x + wob, e.y - z, t, e);
  if (e.hp < e.maxHp) {
    const x = e.x + wob, top = e.y - z - d.h + 3;
    line(x - 2, top, x, top + Math.round(d.h * 0.35), OUT); line(x, top + Math.round(d.h * 0.35), x - 1, top + Math.round(d.h * 0.6), OUT);
    line(x, top + Math.round(d.h * 0.35), x + 3, top + Math.round(d.h * 0.45), OUT);
  }
  if (e.flash > 0) { ctx.globalAlpha = Math.min(1, e.flash * 8) * 0.6; glow(e.x, e.y - z - d.h / 2, '#ffffff', d.r * 2 + 4, 0.8); ctx.globalAlpha = 1; }
}
