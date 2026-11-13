import { BAYER, target, rect, px, line, disc, ring } from './gfx.js?v=32';

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
};

function seeded(s) { return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

export function buildFloor(canvas, key) {
  const m = MAPS[key] || MAPS.PIT, f = m.f, w = m.w;
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
  target(null);
}
