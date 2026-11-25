// Things to break. Crates turn up on every floor; each floor also has two things of its own that suit it (clay urns of
// bones in the Pit, blocks of ice in the Frozen Hollow, powder kegs in the Ember Forge that blow up, server boxes on
// the Neon Grid...). world.js lays a fresh set out whenever a new floor begins (every five waves) and they stay broken
// once broken. This file is what they are and how they look; world.js does the breaking (spawnProps, hitProp,
// breakProp). Each one is drawn standing on its base at (x, y) in pixels, facing the camera.
//   r      how wide it is on the floor (hits and bumping into it)
//   h      how tall it stands (where the cracks show and where its pieces fly from)
//   hp     hits it takes (a heavy blow breaks anything at once)
//   mat    what it is made of: how it sounds and how it breaks (wood, clay, bone, ice, glass, crystal, stone, metal,
//          gold, goo, wax)
//   pal    the colors of its pieces
//   boom   it explodes when it breaks (and sets off any others near)
//   fx     something extra when it goes: 'glitch', 'embers', 'shadow', 'stars'
import { ctx, rect, px, line, disc, glow } from './gfx.js?v=212';

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

export const PROPS = {
  // ---- every floor ----
  crate: { r: 6, h: 15, hp: 2, mat: 'wood', pal: ['#7a4a26', '#a8743e', '#5a3418'], draw(x, y) {
    parts([[x - 6, y - 14, 12, 4, '#a8743e'], [x - 6, y - 10, 12, 10, '#7a4a26']]);
    rect(x - 3, y - 14, 1, 4, '#8a5a2e'); rect(x + 1, y - 14, 1, 4, '#8a5a2e');
    rect(x - 6, y - 10, 12, 1, '#c8904a'); rect(x - 6, y - 5, 12, 1, '#5a3418');
    rect(x - 6, y - 10, 2, 10, '#5a3418'); rect(x + 4, y - 10, 2, 10, '#4a2a14');
    line(x - 4, y - 9, x + 3, y - 2, '#5a3418');
    for (const [dx, dy] of [[-5, -9], [4, -9], [-5, -2], [4, -2]]) px(x + dx, y + dy, '#e0b070');
  } },
  smallcrate: { r: 4, h: 11, hp: 1, mat: 'wood', pal: ['#8a5a2e', '#b8844a', '#5a3418'], draw(x, y) {
    parts([[x - 4, y - 10, 8, 3, '#b8844a'], [x - 4, y - 7, 8, 7, '#8a5a2e']]);
    rect(x - 4, y - 7, 8, 1, '#d8a060'); rect(x - 4, y - 7, 1, 7, '#5a3418'); rect(x + 3, y - 7, 1, 7, '#4a2a14');
    line(x - 3, y - 6, x + 2, y - 1, '#5a3418'); rect(x - 1, y - 10, 1, 3, '#8a5a2e');
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
// each floor's own two (crates go anywhere)
export const MAP_PROPS = {
  YARD: ['hay', 'target'],
  PIT: ['urn', 'skulls'], FROST: ['iceblock', 'icicles'], FORGE: ['keg', 'ore'], GRID: ['datacube', 'server'],
  SHRINE: ['stonelamp', 'pot'], NEST: ['cocoon', 'eggsac'], THRONE: ['goldurn', 'candelabra'], VOID: ['voidshard', 'starjar'],
  GLASS: ['vase', 'pane'], TEMPLE: ['amphora', 'brazier'], GEARS: ['cogbox', 'clock'], NIGHT: ['candles', 'shadowjar'],
};

// one on the floor: its shadow, itself (shaking when just hit), and cracks once it has been hit
export function drawProp(e, t) {
  const d = PROPS[e.kind];
  if (!d) return;
  ctx.globalAlpha = 0.35;
  for (let i = -1; i <= 1; i++) rect(e.x - d.r - 1 + Math.abs(i), e.y + i, (d.r + 1) * 2 - Math.abs(i) * 2 + 1, 1, '#05030a');
  ctx.globalAlpha = 1;
  const wob = e.wob > 0 ? Math.round(Math.sin(e.wob * 70) * Math.min(2, e.wob * 10)) : 0;
  d.draw(e.x + wob, e.y, t, e);
  if (e.hp < e.maxHp) {
    const x = e.x + wob, top = e.y - d.h + 3;
    line(x - 2, top, x, top + Math.round(d.h * 0.35), OUT); line(x, top + Math.round(d.h * 0.35), x - 1, top + Math.round(d.h * 0.6), OUT);
    line(x, top + Math.round(d.h * 0.35), x + 3, top + Math.round(d.h * 0.45), OUT);
  }
  if (e.flash > 0) { ctx.globalAlpha = Math.min(1, e.flash * 8) * 0.6; glow(e.x, e.y - d.h / 2, '#ffffff', d.r * 2 + 4, 0.8); ctx.globalAlpha = 1; }
}
