// The obstacles on each floor of the descent (maps.js: each map's `ob` kind and `obst` places, [x, y, r]): things
// standing on the floor that block the way and stop shots. world.js keeps fighters and monsters out of them (a flat
// ellipse round each base, r wide) and draws them in among everyone else by how far down the screen they stand.
//   pillar   the Pit: a broken stone column, a chain round it, a skull at its foot
//   ice      Frozen Hollow: one of Aurel's soldiers frozen in a block of ice, his spear still raised
//   anvil    the Ember Forge: an iron anvil on a stump, a bar of metal on it still glowing
//   pylon    the Neon Grid: a data pylon, a cube of light turning over it
//   lantern  the Overgrown Shrine: a stone lantern, its light flickering
//   eggs     the Brood Nest: a clutch of eggs webbed to the floor, something moving in them
//   column   the Ashen Throne: a column of the King's hall, gold-banded, his sun banner hanging from it
//   crystal  the Void Deep: shards of void crystal growing out of the stone, pulsing
//   mirror   the Glass Hall: a standing mirror, light sliding across it
//   obelisk  the Sun Temple: a sandstone obelisk with a gold sun set in it
//   gear     the Clockworks: a great gear standing in its frame, turning
//   rock     the Last Night: a fallen dead star, black, cracked with violet light
//   dummy    the training yard: a straw dummy on its post, a target painted on its chest
import { ctx, P, rect, px, line, disc, ring, glow } from './gfx.js?v=213';

const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
// the shadow on the floor under it (drawn with the floor, before anyone stands on it)
export function drawObstacleShadow(o) {
  ctx.globalAlpha = 0.4;
  for (let y = -3; y <= 3; y++) { const w = Math.round((o.r + 3) * Math.sqrt(1 - (y / 3.5) ** 2)); rect(o.x - w + 2, o.y + y + 1, w * 2, 1, '#05030a'); }
  ctx.globalAlpha = 1;
}
const DRAW = {
  dummy(o, t) {
    const { x, y } = o, wob = Math.round(Math.sin(t * 1.3 + x) * 0.6);
    rect(x - 1, y - 26, 3, 26, '#3a2818'); rect(x - 1, y - 26, 1, 26, '#6a4a2e'); rect(x - 4, y - 2, 9, 2, '#4a3420');
    rect(x - 9, y - 21, 19, 2, '#5a3e26'); rect(x - 9, y - 21, 19, 1, '#8c6a44');
    rect(x - 10, y - 22, 3, 4, '#c8a870'); rect(x + 8, y - 22, 3, 4, '#c8a870');
    rect(x - 5 + wob, y - 22, 11, 13, '#140c08'); rect(x - 4 + wob, y - 21, 9, 11, '#c8a870'); rect(x - 4 + wob, y - 21, 2, 11, '#e0c48a'); rect(x + 3 + wob, y - 21, 2, 11, '#a88a58');
    rect(x - 2 + wob, y - 17, 5, 4, '#f0e8d8'); rect(x - 1 + wob, y - 16, 3, 2, '#c0302a'); px(x + wob, y - 16, '#ffd447');
    rect(x - 4 + wob, y - 12, 9, 1, '#7a5a3a');
    rect(x - 4 + wob, y - 30, 9, 8, '#140c08'); rect(x - 3 + wob, y - 29, 7, 6, '#d8b880'); rect(x - 3 + wob, y - 29, 2, 6, '#ecd4a0');
    px(x - 2 + wob, y - 27, '#3a2a1a'); px(x - 1 + wob, y - 26, '#3a2a1a'); px(x - 2 + wob, y - 25, '#3a2a1a');
    px(x + 2 + wob, y - 27, '#3a2a1a'); px(x + 1 + wob, y - 26, '#3a2a1a'); px(x + 2 + wob, y - 25, '#3a2a1a');
    rect(x - 2 + wob, y - 31, 5, 1, '#c8a050'); px(x + 3 + wob, y - 32, '#c8a050'); px(x - 3 + wob, y - 32, '#a8823a');
  },
  pillar(o, t) {
    const { x, y } = o, w = o.r * 2 - 2, h = 26, x0 = x - w / 2;
    rect(x0 - 3, y - 4, w + 6, 5, '#2a2434'); rect(x0 - 3, y - 4, w + 6, 1, '#4a4258');
    rect(x0, y - h, w, h - 3, '#4a4258'); rect(x0, y - h, 2, h - 3, '#6a6078'); rect(x0 + w - 3, y - h, 3, h - 3, '#2e2838');
    for (let i = 3; i < w - 3; i += 4) rect(x0 + i, y - h + 2, 1, h - 6, '#3e3850');
    // the broken top
    for (let i = 0; i < w; i++) { const d = Math.round(Math.abs(Math.sin(i * 1.7 + x)) * 4); rect(x0 + i, y - h - 2 + d, 1, 3 - Math.min(2, d), '#5a5068'); }
    line(x0 + 3, y - h + 6, x0 + 6, y - h + 13, '#1e1a28'); line(x0 + 6, y - h + 13, x0 + 4, y - h + 18, '#1e1a28');
    for (let i = 0; i < w + 2; i += 2) px(x0 - 1 + i, y - 12 + ((i >> 1) % 2), (i >> 1) % 2 ? '#8a8a9a' : '#5a5a6a');
    rect(x + 3, y - 3, 3, 2, '#d8d0c0'); px(x + 3, y - 3, '#2a1a1a'); px(x + 5, y - 3, '#2a1a1a');
  },
  ice(o, t) {
    const { x, y } = o, w = o.r * 2, h = 30, x0 = x - w / 2;
    // the soldier inside: helmet, shoulders, spear
    rect(x - 3, y - 22, 6, 5, '#26405a'); rect(x - 5, y - 17, 10, 11, '#22384e'); rect(x - 3, y - 6, 2, 6, '#22384e'); rect(x + 1, y - 6, 2, 6, '#22384e');
    line(x + 5, y - 27, x + 5, y - 4, '#3a5a7a'); px(x + 5, y - 28, '#8ab0d0');
    // the block of ice over him
    ctx.globalAlpha = 0.55; rect(x0, y - h, w, h, '#9fd3ff'); ctx.globalAlpha = 1;
    rect(x0, y - h, w, 1, '#e0f4ff'); rect(x0, y - h, 1, h, '#c8ecff'); rect(x0 + w - 1, y - h, 1, h, '#5a8ab0'); rect(x0, y - 1, w, 1, '#4a7aa0');
    line(x0 + 2, y - h + 4, x0 + 6, y - h + 12, '#e8f8ff'); line(x0 + w - 4, y - 10, x0 + w - 7, y - 4, '#c8ecff');
    if (Math.floor(t * 2 + x) % 5 === 0) { px(x0 + 3, y - h + 3, '#ffffff'); glow(x0 + 3, y - h + 3, '#bfe8ff', 5, 0.5); }
  },
  anvil(o, t) {
    const { x, y } = o;
    rect(x - 6, y - 8, 12, 8, '#5a3a22'); rect(x - 6, y - 8, 12, 1, '#7a5232'); rect(x - 6, y - 4, 12, 1, '#4a2e1a');
    rect(x - 5, y - 13, 10, 5, '#3a3e48'); rect(x - 9, y - 17, 18, 5, '#4a4e5a'); rect(x - 9, y - 17, 18, 1, '#7a808e');
    rect(x + 9, y - 16, 4, 2, '#4a4e5a'); px(x + 13, y - 15, '#4a4e5a');
    const hot = 0.6 + 0.4 * Math.sin(t * 3 + x);
    rect(x - 6, y - 19, 11, 2, hot > 0.7 ? '#ffd447' : '#ff7a2a'); rect(x - 6, y - 19, 11, 1, '#fff0a0');
    glow(x - 1, y - 18, '#ff7a2a', 12, 0.35 * hot);
    if (Math.floor(t * 6 + x) % 13 === 0) { px(x + 2, y - 23, '#ffd447'); px(x - 4, y - 22, '#ff9a3c'); }
  },
  pylon(o, t) {
    const { x, y } = o;
    rect(x - 5, y - 4, 10, 4, '#14102a'); rect(x - 3, y - 24, 6, 20, '#1e1a3a'); rect(x - 3, y - 24, 1, 20, '#3a3470');
    for (let i = 0; i < 4; i++) rect(x - 3, y - 21 + i * 5, 6, 1, Math.floor(t * 6 + i) % 4 ? '#ff4fa8' : '#62efff');
    const a = t * 2, cy = y - 31 + Math.sin(t * 2 + x) * 1.5;
    for (let i = 0; i < 4; i++) { const b = a + i * Math.PI / 2; px(x + Math.cos(b) * 3, cy + Math.sin(b) * 1.5, '#62efff'); }
    rect(x - 1, cy - 2, 3, 4, '#e0ffff'); glow(x, cy, '#62efff', 10, 0.5);
  },
  lantern(o, t) {
    const { x, y } = o, f = 0.7 + 0.3 * Math.sin(t * 9 + x) * Math.sin(t * 5.3);
    rect(x - 6, y - 3, 12, 3, '#4a4a3e'); rect(x - 2, y - 13, 4, 10, '#5a5a4c'); rect(x - 2, y - 13, 1, 10, '#7a7a68');
    rect(x - 5, y - 21, 10, 8, '#4a4a3e'); rect(x - 3, y - 19, 6, 4, f > 0.8 ? '#fff0a8' : '#ffcf5a');
    for (let i = 0; i < 6; i++) rect(x - 7 + i, y - 22 - i * 0.5, 14 - i * 2, 1, '#3a3a30');
    glow(x, y - 17, '#ffcf5a', 14, 0.4 * f);
    px(x - 5, y - 7, '#5aa84a'); px(x + 4, y - 9, '#4a9a3a'); px(x + 5, y - 2, '#5aa84a');
  },
  eggs(o, t) {
    const { x, y } = o;
    for (let i = -2; i <= 2; i++) line(x + i * 4, y - 6, x + i * 2 + Math.sin(t + i) * 1, y - 40, '#8a8a80');
    ctx.globalAlpha = 0.5; disc(x, y - 1, o.r + 1, '#3a5a1a'); ctx.globalAlpha = 1;
    for (const [dx, dy, r] of [[-5, -5, 4], [4, -6, 4.5], [0, -11, 4], [-3, -2, 3.5], [6, -2, 3]]) {
      const pulse = Math.sin(t * 3 + dx) > 0.6 ? 1 : 0;
      disc(x + dx, y + dy, r + 1, '#2a3a14'); disc(x + dx, y + dy, r, pulse ? '#e0eab0' : '#c8d4a0'); px(x + dx - 1, y + dy - 1, '#f8ffe0');
      if (pulse) px(x + dx + 1, y + dy + 1, '#6a8a2a');
    }
    for (let i = 0; i < 5; i++) line(x - 8 + i * 4, y - 12, x - 6 + i * 3, y, '#b8b8ac');
  },
  column(o, t) {
    const { x, y } = o, h = 38, x0 = x - 6;
    rect(x - 8, y - 4, 16, 4, '#3a3036'); rect(x - 8, y - 4, 16, 1, '#5a4e54');
    rect(x0, y - h, 12, h - 4, '#4a4048'); rect(x0, y - h, 2, h - 4, '#6a5e66'); rect(x0 + 9, y - h, 3, h - 4, '#2e262c');
    for (const yy of [y - h + 2, y - 14]) { rect(x0 - 1, yy, 14, 2, '#d8a032'); px(x0, yy, '#fff4b0'); }
    rect(x - 8, y - h - 3, 16, 3, '#3a3036');
    // the King's sun banner, hanging from it and stirring
    const sway = Math.round(Math.sin(t * 1.5 + x) * 1);
    for (let i = 0; i < 14; i++) rect(x - 4 + (i > 10 ? sway : 0), y - h + 4 + i, 8, 1, '#8a1a2a');
    rect(x - 4, y - h + 18, 3, 2, '#8a1a2a'); rect(x + 1, y - h + 18, 3, 2, '#8a1a2a');
    disc(x, y - h + 10, 2, '#ffd447'); px(x, y - h + 10, '#fff4b0');
  },
  crystal(o, t) {
    const { x, y } = o, pulse = 0.6 + 0.4 * Math.sin(t * 2.4 + x);
    for (const [dx, h, w] of [[-5, 16, 4], [4, 22, 5], [0, 28, 5], [-8, 10, 3], [8, 12, 3]]) {
      for (let r = 0; r < h; r++) { const ww = Math.max(1, Math.round(w * (1 - r / h) + 0.5)); rect(x + dx - ww / 2, y - r - 1, ww, 1, r > h - 3 ? '#e8d8ff' : r % 5 === 0 ? '#9a6ae8' : '#6a3ec8'); }
      px(x + dx - 1, y - h + 2, '#ffffff');
    }
    rect(x - 10, y - 1, 20, 2, '#2a1a4a');
    glow(x, y - 12, '#b48cff', 16, 0.35 * pulse);
  },
  mirror(o, t) {
    const { x, y } = o, h = 30, x0 = x - 7;
    rect(x - 8, y - 3, 16, 3, '#5a5a6a'); rect(x0 - 1, y - h - 1, 16, h, '#8a8a9a'); rect(x0, y - h, 14, h - 3, '#2a3040');
    rect(x0 - 1, y - h - 1, 16, 1, '#d8d8e8');
    // light sliding across the glass
    const k = ((t * 0.4 + hash(x)) % 1.6) - 0.3;
    for (let i = 0; i < h - 3; i++) { const sx = Math.round(k * 20 + i * 0.4 - 3); if (sx >= 0 && sx < 14) { px(x0 + sx, y - h + i, '#cfd8e0'); if (sx + 1 < 14) px(x0 + sx + 1, y - h + i, '#8a98b0'); } }
    px(x0 + 2, y - h + 2, '#ffffff');
  },
  obelisk(o, t) {
    const { x, y } = o, h = 34;
    rect(x - 7, y - 4, 14, 4, '#8a6a3a'); rect(x - 7, y - 4, 14, 1, '#b8945a');
    for (let r = 0; r < h; r++) { const w = Math.round(10 - r * 0.12); rect(x - w / 2, y - 4 - r, w, 1, r % 9 === 0 ? '#a07a44' : '#c8a060'); px(x - w / 2, y - 4 - r, '#e0c080'); }
    for (let i = 0; i < 4; i++) rect(x - 2 + i, y - h - 5 - (i === 1 || i === 2 ? 1 : 0), 1, 2, '#c8a060');
    const g = 0.6 + 0.4 * Math.sin(t * 2 + x);
    disc(x, y - 22, 3, '#ffd447'); ring(x, y - 22, 3, 1, '#c98a1a'); glow(x, y - 22, '#ffd447', 12, 0.45 * g);
  },
  gear(o, t) {
    const { x, y } = o, cy = y - 16, a = t * (o.x < 280 ? 0.9 : -0.9), R = 11;
    rect(x - 9, y - 4, 18, 4, '#4a2a08'); rect(x - 2, y - 8, 4, 5, '#8a5a20');
    for (let i = 0; i < 12; i++) { const b = a + i * Math.PI / 6; rect(x + Math.cos(b) * (R + 1) - 1, cy + Math.sin(b) * (R + 1) - 1, 3, 3, '#a8782c'); }
    disc(x, cy, R, '#c8903a'); disc(x, cy, R - 3, '#8a5a20');
    for (let i = 0; i < 4; i++) { const b = a + i * Math.PI / 2; line(x, cy, x + Math.cos(b) * (R - 3), cy + Math.sin(b) * (R - 3), '#c8903a', 2); }
    disc(x, cy, 2, '#fff0b8'); px(x - R + 2, cy - 4, '#fff0b8');
  },
  rock(o, t) {
    const { x, y } = o;
    for (let r = 0; r < 14; r++) { const w = Math.round(Math.sqrt(1 - ((r - 7) / 7.5) ** 2) * (o.r + 3)); rect(x - w, y - 2 - r, w * 2, 1, r < 3 ? '#140e22' : r > 10 ? '#3a3050' : '#221a34'); }
    const g = 0.5 + 0.5 * Math.sin(t * 2.2 + x);
    for (const [x0, y0, x1, y1] of [[-6, -4, -1, -10], [-1, -10, 3, -6], [3, -6, 7, -12]]) line(x + x0, y + y0, x + x1, y + y1, g > 0.6 ? '#c8a8ff' : '#7a4ac8');
    glow(x, y - 8, '#9a6ae8', 12, 0.3 * g);
    for (let i = 0; i < 3; i++) { const b = t * 1.5 + i * 2.1; px(x + Math.cos(b) * (o.r + 6), y - 9 + Math.sin(b) * 4, '#e8e0ff'); }
  },
};
export function drawObstacle(o, t) { (DRAW[o.kind] || DRAW.pillar)(o, t); }
