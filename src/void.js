// The endless night's ground, after Nox: no walls, no floor, no edge, the dark going on for ever in every direction.
// It is drawn in layers that slide at different speeds as the camera moves: far stars and faint nebulae deep below,
// nearer stars that twinkle, and a sheen of black glass right under the fighter's feet that moves with the world (so
// you can feel yourself moving through it). Where the fighter steps, rings spread as on still black water, and the
// fighter carries a little light of their own. world.js keeps the arena's bounds following the fighter while it
// lasts, so there is nowhere the dark ends.
import { ctx, W, H, FW, SX, rect, px, glow, makeCanvas, BAYER } from './gfx.js?v=213';

const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
let FAR = null, MID = null, GLASS = null;
function paint() {
  // far: dim stars and dithered nebulae
  FAR = makeCanvas(320, 240);
  let g = FAR.getContext('2d');
  const put = (gg, x, y, c) => { gg.fillStyle = c; gg.fillRect(Math.round(x), Math.round(y), 1, 1); };
  for (const [cx, cy, r, c] of [[70, 60, 60, '#0e0818'], [240, 170, 70, '#0a0a1c'], [200, 40, 40, '#120a1a']]) {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const d = Math.hypot(x, y * 1.3) / r;
      if (d < 1 && (1 - d) * 0.9 > (BAYER[((cy + y) & 3) * 4 + ((cx + x) & 3)] + 0.5) / 16) put(g, (cx + x + 320) % 320, (cy + y + 240) % 240, c);
    }
  }
  for (let i = 0; i < 90; i++) put(g, hash(i) * 320, hash(i + 90) * 240, i % 9 === 0 ? '#5a4a7a' : i % 3 ? '#1c1630' : '#2c2446');
  // middle: fewer, brighter stars, some with a cross of light
  MID = makeCanvas(256, 256);
  g = MID.getContext('2d');
  for (let i = 0; i < 26; i++) {
    const x = Math.round(hash(i + 300) * 254) + 1, y = Math.round(hash(i + 400) * 254) + 1, c = i % 4 ? '#6a5a9a' : '#c8b8f0';
    put(g, x, y, c);
    if (i % 5 === 0) { put(g, x - 1, y, '#3a2e5a'); put(g, x + 1, y, '#3a2e5a'); put(g, x, y - 1, '#3a2e5a'); put(g, x, y + 1, '#3a2e5a'); }
  }
  // the black glass underfoot: the faintest specks and hairline cracks
  GLASS = makeCanvas(160, 160);
  g = GLASS.getContext('2d');
  for (let i = 0; i < 70; i++) put(g, hash(i + 700) * 160, hash(i + 800) * 160, i % 6 ? '#0c0814' : '#1a1228');
  for (let i = 0; i < 5; i++) {
    let x = hash(i + 900) * 160, y = hash(i + 950) * 160, a = hash(i + 990) * 6.28;
    for (let k = 0; k < 26; k++) { put(g, (x + 160) % 160, (y + 160) % 160, '#120c1e'); x += Math.cos(a) * 1.3; y += Math.sin(a) * 1.3; a += (hash(i * 31 + k) - 0.5) * 0.8; }
  }
}
function tiled(img, ox, oy) {
  const w = img.width, h = img.height;
  const x0 = ((Math.round(ox) % w) + w) % w - w - SX, y0 = ((Math.round(oy) % h) + h) % h - h;
  for (let y = y0; y < H; y += h) for (let x = x0; x < W + SX; x += w) ctx.drawImage(img, x, y);
}
// the sky below and around: drawn on the screen, before the world (cx, cy: the camera)
export function drawVoid(cx, cy, t) {
  if (!FAR) paint();
  rect(-SX, 0, FW, H, '#020104');
  tiled(FAR, -cx * 0.18, -cy * 0.18);
  tiled(MID, -cx * 0.42, -cy * 0.42);
  // a few stars swell and fade in turn
  for (let i = 0; i < 6; i++) {
    const k = (t * 0.25 + hash(i + 40)) % 1, a = Math.sin(k * Math.PI);
    const x = ((hash(i + 50) * 600 - cx * 0.42) % 600 + 600) % 600 - SX - 40, y = ((hash(i + 60) * 400 - cy * 0.42) % 400 + 400) % 400 - 40;
    if (a > 0.1) { ctx.globalAlpha = a; px(x, y, '#ffffff'); px(x - 1, y, '#8a7ab0'); px(x + 1, y, '#8a7ab0'); px(x, y - 1, '#8a7ab0'); px(x, y + 1, '#8a7ab0'); ctx.globalAlpha = 1; glow(x, y, '#9a7aff', 6, 0.35 * a); }
  }
  ctx.globalAlpha = 0.85; tiled(GLASS, -cx, -cy); ctx.globalAlpha = 1;
}
// on the ground, in the world: the fighter's own little light, and rings where they stepped
export function drawVoidGround(p, ripples) {
  glow(p.x, p.y - 4, '#2a1a4a', 70, 0.35);
  for (const r of ripples) {
    const k = r.t / r.life, rx = 3 + k * 26, ry = rx * 0.38, n = Math.ceil(rx * 3);
    ctx.globalAlpha = (1 - k) * 0.7;
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; px(r.x + Math.cos(a) * rx, r.y + Math.sin(a) * ry, i % 3 ? '#3a2a5a' : '#6a5a9a'); }
  }
  ctx.globalAlpha = 1;
}
