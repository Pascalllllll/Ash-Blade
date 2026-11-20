import { BAYER, target, rect, px, line, disc, ring } from './gfx.js?v=199';

export const AW = 560, AH = 352;
export const B = { x0: 20, y0: 50, x1: AW - 20, y1: AH - 18 };
export const TORCHES = [[86, 31], [196, 31], [364, 31], [474, 31]];

// f: tile base, light tile, dark tile, highlight, crack, void.  w: brick, brick 2, wall lip, dark brick, mortar.
export const MAPS = {
  PIT: {
    name: 'THE PIT', desc: 'STONE, TORCHES AND OLD BLOOD',
    f: ['#1f1929', '#2b2337', '#1a1523', '#3d3250', '#15111d', '#07060b'],
    w: ['#3d3250', '#463a5c', '#574868', '#1f1929', '#2b2337'],
    flame: ['#ff6a2b', '#ffa646', '#ffe08a'], friction: 18, slide: 9, deco: 'rune', ambient: 'dust', pools: [],
  },
  FROST: {
    name: 'FROZEN HOLLOW', desc: 'ICE FLOOR. EVERYTHING SLIDES',
    f: ['#1b2a3e', '#25405c', '#162236', '#4a7aa3', '#0f1a2a', '#060a12'],
    w: ['#2e4a66', '#3a5a7a', '#7fb2dc', '#16233a', '#24405e'],
    flame: ['#3fa9ff', '#9fe0ff', '#ffffff'], friction: 4, slide: 3, deco: 'ice', ambient: 'snow', pools: [],
  },
  FORGE: {
    name: 'EMBER FORGE', desc: 'KNOCK FOES INTO THE LAVA',
    f: ['#1d1616', '#2a201e', '#171111', '#43302a', '#100b0b', '#050303'],
    w: ['#3a2a26', '#46322c', '#6a4a3c', '#1d1616', '#2a1e1b'],
    flame: ['#ff4a1c', '#ff9a3c', '#ffe08a'], friction: 18, slide: 9, deco: 'cracks', ambient: 'ash',
    pools: [[130, 140, 22], [440, 135, 20], [160, 285, 18], [410, 282, 24]],
  },
  GRID: {
    name: 'NEON GRID', desc: 'A FIGHT INSIDE THE MACHINE',
    f: ['#0c0b1c', '#121130', '#0a0918', '#2a2470', '#06050f', '#020108'],
    w: ['#141236', '#1b1846', '#ff4fa8', '#0a0918', '#121130'],
    flame: ['#ff4fa8', '#62efff', '#ffffff'], friction: 20, slide: 9, deco: 'grid', ambient: 'data', pools: [],
  },
  SHRINE: {
    name: 'OVERGROWN SHRINE', desc: 'MOSS, LANTERNS AND FIREFLIES',
    f: ['#1a2119', '#243024', '#151b14', '#3b4f33', '#10150f', '#060805'],
    w: ['#3a4434', '#46523e', '#6e8a55', '#1a2119', '#2a3426'],
    flame: ['#ffcf5a', '#fff0a8', '#ffffff'], friction: 18, slide: 9, deco: 'moss', ambient: 'fireflies', pools: [],
  },
  // the floors of the descent that are theirs alone, each built for the boss waiting at its end
  NEST: {
    name: 'THE BROOD NEST', desc: 'WEBS, EGGS AND ACID',
    f: ['#18201a', '#212c22', '#121914', '#344832', '#0d130e', '#050806'],
    w: ['#2c3a2a', '#354632', '#58783a', '#141c14', '#22301f'],
    flame: ['#7ae03a', '#b5f23a', '#f0ffc0'], friction: 18, slide: 9, deco: 'webs', ambient: 'spores', pools: [],
  },
  THRONE: {
    name: 'THE ASHEN THRONE', desc: "THE KING'S HALL, STILL BURNING",
    f: ['#272224', '#322c2e', '#1f1b1c', '#463e40', '#171314', '#070506'],
    w: ['#3a3234', '#463c3e', '#6e5a4c', '#1f1a1c', '#2c2527'],
    flame: ['#ff5a1c', '#ffa646', '#ffe08a'], friction: 18, slide: 9, deco: 'carpet', ambient: 'ash', pools: [],
  },
  VOID: {
    name: 'THE VOID DEEP', desc: 'THE STONE IS THIN HERE',
    f: ['#161022', '#1e1630', '#100b1a', '#30244c', '#0b0814', '#040208'],
    w: ['#261d3a', '#2e2446', '#5a3e8a', '#120d1e', '#1d1630'],
    flame: ['#9a5aff', '#c49aff', '#ffffff'], friction: 18, slide: 9, deco: 'rifts', ambient: 'void', pools: [],
  },
  GLASS: {
    name: 'THE GLASS HALL', desc: 'A THOUSAND OF YOU LOOK BACK',
    f: ['#1a1c26', '#222634', '#14161e', '#464c66', '#0e1016', '#05060a'],
    w: ['#2a2e3e', '#33384a', '#8a94b0', '#151820', '#202432'],
    flame: ['#cfd8e0', '#ffffff', '#ffffff'], friction: 18, slide: 9, deco: 'mirror', ambient: 'glints', pools: [],
  },
  TEMPLE: {
    name: 'THE SUN TEMPLE', desc: 'THE SUN WATCHES FROM THE FLOOR',
    f: ['#241c14', '#2e2419', '#1c150f', '#4a3a24', '#140f0a', '#070503'],
    w: ['#3e3020', '#4a3a26', '#8a6a3a', '#1e170f', '#2e2419'],
    flame: ['#ffb02a', '#ffd447', '#fff2c0'], friction: 18, slide: 9, deco: 'sun', ambient: 'motes', pools: [],
  },
  GEARS: {
    name: 'THE CLOCKWORKS', desc: 'GEARS UNDER YOUR FEET',
    f: ['#1e1a14', '#28221a', '#17140f', '#4a3c26', '#110e0a', '#050403'],
    w: ['#3a3022', '#463a28', '#9a7a3a', '#1c170f', '#2a2318'],
    flame: ['#ffc85a', '#ffe8a8', '#ffffff'], friction: 18, slide: 9, deco: 'gears', ambient: 'brass', pools: [],
  },
  NIGHT: {
    name: 'THE LAST NIGHT', desc: 'NOTHING BELOW BUT STARS',
    f: ['#0d0b15', '#13111e', '#0a0910', '#25213c', '#08070d', '#020104'],
    w: ['#17152b', '#1d1a35', '#3c3668', '#0b0a15', '#15132b'],
    flame: ['#6a5aff', '#b4a8ff', '#ffffff'], friction: 18, slide: 9, deco: 'stars', ambient: 'stars', pools: [],
  },
  // not a floor of its own: the arena choice that goes down through the floors below, one after each boss
  DESCENT: { name: 'THE DESCENT', desc: 'A NEW STAGE PAST EVERY BOSS' },
};

// The descent: every fifth wave is a boss, and past each boss the fight goes down to the next floor, built for the
// boss at its end (the Warden's pit, the Brood Mother's nest, the Colossus's forge, the King's hall, the Wyrm's
// broken stone, the Herald's frozen storm, the Mirror's hall, the Eclipse's temple, the Clockwork's gears, Nox's
// night). The endless night after wave 50 stays on the last floor.
export const DEPTHS = ['PIT', 'NEST', 'FORGE', 'THRONE', 'VOID', 'FROST', 'GLASS', 'TEMPLE', 'GEARS', 'NIGHT'];
export const depthOf = (wave) => Math.min(DEPTHS.length - 1, Math.max(0, Math.floor((Math.max(1, wave) - 1) / 5)));
export const stageFor = (arena, wave) => (arena === 'DESCENT' ? DEPTHS[depthOf(wave)] : MAPS[arena]?.f ? arena : 'PIT');

function seeded(s) { return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

export function buildFloor(canvas, key) {
  const m = MAPS[key]?.f ? MAPS[key] : MAPS.PIT, f = m.f, w = m.w;
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, AW, AH);
  target(g);
  const r = seeded(11);
  const ao = (x, y, k) => { if (k > (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16) px(x, y, f[5]); };
  rect(0, 0, AW, AH, f[5]);

  for (let row = 0, y = B.y0 - 8; y < AH; row++, y += 12) {
    const off = (row % 2) * 8;
    for (let x = -off; x < AW; x += 16) {
      const v = r();
      rect(x + 1, y + 1, 15, 11, v < 0.14 ? f[1] : v < 0.8 ? f[0] : f[2]);
      rect(x + 1, y + 1, 15, 1, v < 0.14 ? f[3] : f[1]);
      for (let k = 0; k < 3; k++) px(x + 2 + r() * 13, y + 2 + r() * 8, r() < 0.5 ? f[4] : f[1]);
      if (r() < 0.16) {
        let cx = x + 3 + r() * 9, cy = y + 3 + r() * 6;
        for (let k = 0; k < 6; k++) { px(cx, cy, f[4]); cx += 1; cy += Math.round(r() * 2 - 1); }
      }
    }
  }

  const mx = AW / 2, my = (B.y0 + B.y1) / 2;
  if (m.deco === 'rune') {
    ring(mx, my, 74, 1, '#30283f'); ring(mx, my, 68, 1, '#2a2338');
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; rect(mx + Math.cos(a) * 71 - 1, my + Math.sin(a) * 71 - 1, 2, 2, i % 3 ? '#30283f' : '#3c3250'); }
    const st = [];
    for (let i = 0; i < 5; i++) st.push([mx + Math.cos(-Math.PI / 2 + (i * Math.PI * 2) / 5) * 64, my + Math.sin(-Math.PI / 2 + (i * Math.PI * 2) / 5) * 64]);
    for (let i = 0; i < 5; i++) line(st[i][0], st[i][1], st[(i + 2) % 5][0], st[(i + 2) % 5][1], '#272033');
  } else if (m.deco === 'ice') {
    for (let i = 0; i < 26; i++) {
      let x = B.x0 + r() * (B.x1 - B.x0), y = B.y0 + r() * (B.y1 - B.y0), a = r() * 6.28;
      for (let k = 0; k < 30; k++) { px(x, y, k % 7 ? '#5d8db3' : '#9fd3ff'); x += Math.cos(a) * 1.4; y += Math.sin(a) * 1.4; a += (r() - 0.5) * 0.7; }
    }
    for (let i = 0; i < 40; i++) { const x = B.x0 + r() * (B.x1 - B.x0), y = B.y0 + r() * (B.y1 - B.y0); line(x, y, x + 6, y - 6, '#2f5277'); }
  } else if (m.deco === 'cracks') {
    for (let i = 0; i < 22; i++) {
      let x = B.x0 + r() * (B.x1 - B.x0), y = B.y0 + r() * (B.y1 - B.y0), a = r() * 6.28;
      for (let k = 0; k < 24; k++) { px(x, y, k % 5 ? '#7a2410' : '#ff6a2b'); x += Math.cos(a) * 1.3; y += Math.sin(a) * 1.3; a += (r() - 0.5) * 0.9; }
    }
    for (const [x, y, rr] of m.pools) {
      disc(x, y, rr + 3, '#2a120c'); disc(x, y, rr, '#c6380f'); disc(x, y, rr - 4, '#ff5a1c'); disc(x - 3, y - 2, rr - 9, '#ffa040');
    }
  } else if (m.deco === 'grid') {
    for (let x = B.x0; x < B.x1; x += 16) rect(x, B.y0, 1, B.y1 - B.y0, (x - B.x0) % 64 ? '#1d1a4a' : '#2f2a80');
    for (let y = B.y0; y < B.y1; y += 16) rect(B.x0, y, B.x1 - B.x0, 1, (y - B.y0) % 64 ? '#1d1a4a' : '#2f2a80');
    ring(mx, my, 60, 1, '#5a1e6e'); ring(mx, my, 40, 1, '#3a1650');
  } else if (m.deco === 'moss') {
    for (let i = 0; i < 70; i++) {
      const x = B.x0 + r() * (B.x1 - B.x0), y = B.y0 + r() * (B.y1 - B.y0), n = 6 + r() * 18;
      for (let k = 0; k < n; k++) px(x + (r() - 0.5) * 14, y + (r() - 0.5) * 9, r() < 0.5 ? '#2e4a24' : '#3f6a2c');
    }
    for (let i = 0; i < 90; i++) {
      const x = B.x0 + r() * (B.x1 - B.x0), y = B.y0 + 8 + r() * (B.y1 - B.y0 - 8);
      px(x, y, '#5c8a3a'); px(x + 1, y - 1, '#6fa846'); px(x - 1, y - 1, '#4f7a35');
      if (r() < 0.15) px(x, y - 2, r() < 0.5 ? '#ff8fca' : '#ffe08a');
    }
    ring(mx, my, 70, 1, '#2a3a26');
  } else if (m.deco === 'webs') {
    // webs strung across the four corners, clutches of eggs along the walls, puddles of acid
    for (const [cx, cy, sx, sy] of [[B.x0, B.y0, 1, 1], [B.x1 - 1, B.y0, -1, 1], [B.x0, B.y1 - 1, 1, -1], [B.x1 - 1, B.y1 - 1, -1, -1]]) {
      const R = 46 + r() * 16, spokes = 6, at = (i, d) => [cx + sx * Math.cos((i / spokes) * Math.PI / 2) * d, cy + sy * Math.sin((i / spokes) * Math.PI / 2) * d];
      for (let i = 0; i <= spokes; i++) { const [x, y] = at(i, R); line(cx, cy, x, y, '#3e4c3c'); }
      // each thread sags toward the corner between two spokes
      for (let d = 10; d < R; d += 9) for (let i = 0; i < spokes; i++) {
        const [xa, ya] = at(i, d), [xb, yb] = at(i + 1, d), [xm, ym] = at(i + 0.5, d * 0.86);
        line(xa, ya, xm, ym, '#56665a'); line(xm, ym, xb, yb, '#56665a');
      }
    }
    for (const [ex, ey] of [[70, 92], [478, 100], [150, 302], [420, 298], [520, 220], [42, 206]]) {
      for (let i = 0; i < 5; i++) {
        const x = ex + (r() - 0.5) * 18, y = ey + (r() - 0.5) * 10;
        disc(x, y + 1, 4, '#0d130e'); disc(x, y, 3, '#8a9a6a'); disc(x - 1, y - 1, 2, '#c8d4a0'); px(x - 1, y - 2, '#f0f8d0');
      }
    }
    for (let i = 0; i < 9; i++) {
      const x = B.x0 + 30 + r() * (B.x1 - B.x0 - 60), y = B.y0 + 30 + r() * (B.y1 - B.y0 - 60), n = 3 + Math.floor(r() * 3);
      for (let k = 0; k < n; k++) disc(x + (r() - 0.5) * 12, y + (r() - 0.5) * 6, 4 + r() * 3, '#24401a');
      for (let k = 0; k < n; k++) disc(x + (r() - 0.5) * 10, y + (r() - 0.5) * 4, 2 + r() * 2, '#3e6a1e');
      px(x - 2, y - 1, '#b5f23a'); px(x + 3, y, '#7ae03a');
    }
  } else if (m.deco === 'carpet') {
    // the King's carpet from the gate down the hall in gold trim, burnt through in places; ash heaped by the walls
    const c0 = mx - 24, c1 = mx + 24;
    rect(c0 - 1, B.y0 - 2, c1 - c0 + 2, B.y1 - B.y0 + 2, '#120b0c'); rect(c0, B.y0 - 2, c1 - c0, B.y1 - B.y0 + 2, '#4a1019');
    for (let y = B.y0 + 4; y < B.y1 - 12; y += 16) {
      for (let k = 0; k < 6; k++) { rect(mx - k, y + k, 2 * k + 1, 1, '#5e1622'); rect(mx - k, y + 12 - k, 2 * k + 1, 1, '#5e1622'); }
      px(mx, y + 6, '#c9a24a');
    }
    for (const x of [c0 + 2, c1 - 3]) rect(x, B.y0 - 2, 1, B.y1 - B.y0 + 2, '#c9a24a');
    for (const x of [c0 + 4, c1 - 5]) rect(x, B.y0 - 2, 1, B.y1 - B.y0 + 2, '#7a5a2a');
    for (let i = 0; i < 3; i++) {
      const y = B.y0 + 50 + r() * (B.y1 - B.y0 - 90), x = c0 + 10 + r() * (c1 - c0 - 20);
      for (let k = 0; k < 6; k++) disc(x + (r() - 0.5) * 8, y + (r() - 0.5) * 5, 1 + r() * 2, '#2a1214');
      for (let k = 0; k < 3; k++) px(x + (r() - 0.5) * 5, y + (r() - 0.5) * 3, '#140a0b');
      px(x + 3, y - 2, '#ff6a2b'); px(x - 2, y + 1, '#c6380f');
    }
    for (let i = 0; i < 18; i++) {
      const x = i % 2 ? B.x1 - 4 - r() * 40 : B.x0 + 4 + r() * 40, y = B.y0 + 8 + r() * (B.y1 - B.y0 - 16);
      for (let k = 0; k < 22; k++) px(x + (r() - 0.5) * 14, y + (r() - 0.5) * 7, r() < 0.5 ? '#564e50' : '#6a6264');
    }
  } else if (m.deco === 'rifts') {
    // fissures where the void shows through the stone, and the holes the Wyrm swam out of
    for (let i = 0; i < 9; i++) {
      let x = B.x0 + r() * (B.x1 - B.x0), y = B.y0 + r() * (B.y1 - B.y0), a = r() * 6.28;
      const pts = [];
      for (let k = 0, n = 20 + r() * 30; k < n; k++) { pts.push([x, y]); x += Math.cos(a) * 1.6; y += Math.sin(a) * 1.6; a += (r() - 0.5) * 0.8; }
      for (const [qx, qy] of pts) { px(qx - 1, qy, '#2a1846'); px(qx + 1, qy, '#2a1846'); px(qx, qy + 1, '#2a1846'); }
      for (const [qx, qy] of pts) px(qx, qy, '#6a3aa8');
      for (let k = 0; k < pts.length; k += 3) px(pts[k][0], pts[k][1], '#b48cff');
    }
    for (const [hx, hy] of [[120, 120], [450, 150], [200, 282], [404, 290]]) {
      disc(hx, hy, 11, '#2a1d48'); disc(hx, hy, 9, '#07040e'); ring(hx, hy, 11, 1, '#5a3e8a');
      for (let k = 0; k < 10; k++) { const a = r() * 6.28, d = 13 + r() * 6; px(hx + Math.cos(a) * d, hy + Math.sin(a) * d * 0.8, r() < 0.5 ? '#30244c' : '#3e2e60'); }
    }
  } else if (m.deco === 'mirror') {
    // mirror tiles: a diamond lattice with a silver stud where the lines cross, streaks of reflected light, a ring
    for (let d = B.x0 - (B.y1 - B.y0); d < B.x1 + (B.y1 - B.y0); d += 32) for (let y = B.y0; y < B.y1; y++) {
      const xa = d + (y - B.y0), xb = d - (y - B.y0) + (B.y1 - B.y0);
      if (xa >= B.x0 && xa < B.x1) px(xa, y, '#2c3144');
      if (xb >= B.x0 && xb < B.x1) px(xb, y, '#2c3144');
    }
    for (let d = B.x0 - (B.y1 - B.y0); d < B.x1 + (B.y1 - B.y0); d += 32) for (let e = d; e < B.x1 + 2 * (B.y1 - B.y0); e += 32) {
      const y = B.y0 + (e - d) / 2, x = (d + e) / 2;
      if (x > B.x0 + 2 && x < B.x1 - 2 && y > B.y0 + 2 && y < B.y1 - 2) { px(x, y, '#8a94b0'); px(x, y - 1, '#4a5068'); }
    }
    for (let i = 0; i < 26; i++) {
      const x = B.x0 + 10 + r() * (B.x1 - B.x0 - 30), y = B.y0 + 14 + r() * (B.y1 - B.y0 - 30), len = 4 + r() * 8;
      for (let k = 0; k < len; k++) px(x + k, y - k, k < len / 3 ? '#5a6280' : '#3c4258');
    }
    ring(mx, my, 62, 1, '#3a4058'); ring(mx, my, 58, 1, '#4a5068');
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; px(mx + Math.cos(a) * 60, my + Math.sin(a) * 60, '#cfd8e0'); }
  } else if (m.deco === 'sun') {
    // the eclipse laid into the floor: a black sun ringed in gold, its rays reaching out, glyphs round it, gold
    // inlay along the walls
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2, r1 = i % 2 ? 70 : 94;
      for (let d = 36; d < r1; d++) px(mx + Math.cos(a) * d, my + Math.sin(a) * d, d > r1 - 6 ? '#4a3a24' : '#5e4a2c');
    }
    disc(mx, my, 32, '#3a2c1a'); ring(mx, my, 32, 2, '#c9a24a'); disc(mx, my, 27, '#120c06'); ring(mx, my, 28, 1, '#ffd447');
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.2, x = mx + Math.cos(a) * 118, y = my + Math.sin(a) * 92; ring(x, y, 4, 1, '#5e4a2c'); px(x, y, '#c9a24a'); }
    for (let x = B.x0 + 6; x < B.x1 - 6; x += 4) { px(x, B.y0 + 22, '#5e4a2c'); px(x, B.y1 - 7, '#5e4a2c'); }
    for (let y = B.y0 + 22; y < B.y1 - 6; y += 4) { px(B.x0 + 6, y, '#5e4a2c'); px(B.x1 - 7, y, '#5e4a2c'); }
  } else if (m.deco === 'gears') {
    // great brass gears let into the floor, and a clock face in the middle
    const gear = (x, y, R, teeth) => {
      ring(x, y, R, 2, '#3a3022'); ring(x, y, R - 6, 1, '#2e2618');
      for (let i = 0; i < teeth; i++) { const a = (i / teeth) * Math.PI * 2; rect(x + Math.cos(a) * (R + 2) - 1, y + Math.sin(a) * (R + 2) - 1, 3, 3, '#3a3022'); }
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + R; line(x + Math.cos(a) * (R / 5), y + Math.sin(a) * (R / 5), x + Math.cos(a) * (R - 6), y + Math.sin(a) * (R - 6), '#2e2618'); }
      disc(x, y, Math.max(3, R / 5), '#4a3c26'); disc(x, y, Math.max(1, R / 5 - 2), '#110e0a');
    };
    gear(100, 112, 34, 16); gear(472, 122, 28, 14); gear(128, 282, 26, 12); gear(452, 282, 38, 18);
    ring(mx, my, 70, 2, '#4a3c26'); ring(mx, my, 64, 1, '#3a3022');
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, l = i % 3 ? 4 : 7; line(mx + Math.cos(a) * 66, my + Math.sin(a) * 66, mx + Math.cos(a) * (66 - l), my + Math.sin(a) * (66 - l), '#9a7a3a'); }
    line(mx, my, mx + 36, my - 21, '#3e3220', 2); line(mx, my, mx - 8, my - 50, '#3e3220', 2); disc(mx, my, 4, '#5a4a2e');
  } else if (m.deco === 'stars') {
    // the floor is the night sky: dim stars, a few bright ones, constellations, and a pale crescent in the middle
    for (let i = 0; i < 220; i++) px(B.x0 + r() * (B.x1 - B.x0), B.y0 + r() * (B.y1 - B.y0), r() < 0.75 ? '#2a2648' : '#4a4480');
    for (let i = 0; i < 14; i++) {
      const x = B.x0 + 8 + r() * (B.x1 - B.x0 - 16), y = B.y0 + 8 + r() * (B.y1 - B.y0 - 16);
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) px(x + dx, y + dy, '#5a5490');
      px(x, y, '#c8c0ff');
    }
    for (let c = 0; c < 4; c++) {
      let x = B.x0 + 40 + r() * (B.x1 - B.x0 - 80), y = B.y0 + 30 + r() * (B.y1 - B.y0 - 60);
      for (let k = 0; k < 4; k++) { const nx = x + (r() - 0.5) * 50, ny = y + (r() - 0.5) * 34; line(x, y, nx, ny, '#1e1b36'); px(x, y, '#8a84c0'); x = nx; y = ny; }
      px(x, y, '#8a84c0');
    }
    ring(mx, my, 58, 1, '#1e1b36');
    for (let y = -16; y <= 16; y++) for (let x = -16; x <= 16; x++) {
      if (x * x + y * y <= 256 && (x - 6) ** 2 + (y + 5) ** 2 > 196) px(mx + x, my + y, x * x + y * y > 200 ? '#4a4480' : '#3c3668');
    }
  }

  for (let y = B.y0; y < B.y0 + 18; y++) for (let x = B.x0; x < B.x1; x++) ao(x, y, 0.6 * (1 - (y - B.y0) / 18));
  for (let x = B.x0; x < B.x0 + 10; x++) for (let y = B.y0; y < B.y1; y++) ao(x, y, 0.45 * (1 - (x - B.x0) / 10));
  for (let x = B.x1 - 10; x < B.x1; x++) for (let y = B.y0; y < B.y1; y++) ao(x, y, 0.45 * ((x - (B.x1 - 10)) / 10));

  rect(0, 0, AW, 13, f[5]);
  rect(0, 13, AW, 1, w[2]);
  for (let row = 0, y = 14; y < B.y0; row++, y += 6) {
    const off = (row % 2) * 7;
    for (let x = -off; x < AW; x += 14) {
      const v = r(), dark = (y - 14) / (B.y0 - 14);
      rect(x, y, 13, 5, dark > 0.7 ? w[3] : v < 0.3 ? w[1] : w[0]);
      rect(x, y, 13, 1, dark > 0.7 ? w[4] : w[2]);
      if (r() < 0.25) px(x + 2 + r() * 9, y + 2 + r() * 2, w[4]);
      if (m.deco === 'moss' && r() < 0.3) for (let k = 0; k < 4; k++) px(x + r() * 13, y + 4 + k, '#3f6a2c');
      if (m.deco === 'grid' && r() < 0.1) rect(x + 2, y + 2, 4, 1, '#62efff');
    }
  }
  for (let y = B.y0 - 6; y < B.y0; y++) for (let x = 0; x < AW; x++) ao(x, y, (y - (B.y0 - 6)) / 6);
  const gx = AW / 2 - 15;
  rect(gx - 2, 16, 34, B.y0 - 16, w[2]);
  rect(gx, 20, 30, B.y0 - 20, f[5]);
  disc(AW / 2, 22, 15, f[5]);
  for (let x = gx + 3; x < gx + 30; x += 5) rect(x, 18, 1, B.y0 - 18, w[4]);
  rect(0, 0, B.x0, AH, f[5]); rect(B.x1, 0, AW - B.x1, AH, f[5]); rect(0, B.y1, AW, AH - B.y1, f[5]);
  rect(B.x0 - 2, 13, 1, B.y1 - 13, w[4]); rect(B.x0 - 1, 13, 1, B.y1 - 13, w[2]);
  rect(B.x1, 13, 1, B.y1 - 13, w[2]); rect(B.x1 + 1, 13, 1, B.y1 - 13, w[4]);
  rect(B.x0 - 2, B.y1, B.x1 - B.x0 + 4, 1, w[2]); rect(B.x0 - 2, B.y1 + 1, B.x1 - B.x0 + 4, 1, w[4]);
  for (const [tx] of TORCHES) { rect(tx - 2, 33, 5, 2, f[5]); rect(tx - 1, 35, 3, 4, f[4]); }
  if (m.deco === 'carpet') for (const bx of [141, 419]) {
    rect(bx - 7, 15, 14, 30, '#2a0a10'); rect(bx - 6, 15, 12, 28, '#6a1424'); rect(bx - 6, 15, 12, 1, '#c9a24a');
    for (let k = 0; k < 4; k++) px(bx - 5 + k * 3, 43 + (k % 2), '#6a1424');
    disc(bx, 27, 3, '#c9a24a'); px(bx, 27, '#6a1424');
    for (const [dx, dy] of [[0, -5], [0, 5], [-5, 0], [5, 0]]) px(bx + dx, 27 + dy, '#c9a24a');
  }
  target(null);
}
