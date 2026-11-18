// The title screen's scene, also the opening's backdrop. It is drawn in code at the game's own 320 x 180, in the
// same pixels as the game: a blood-red sky with the swallowed black sun, two rows of ruined towers far off, fog,
// ash and embers on the wind, now and then red lightning, and the eight fighters (their in-game sprites at
// twice the size) on a broken battlement in front, taking turns to show off their weapons.
import { ctx, W, H, P, BAYER, makeCanvas, rect, px, line, glow, ring, disc } from './gfx.js?v=185';
import { SPR } from './sprites.js?v=185';
import { drawWeaponAt, REST, SHEATH } from './hero-sprites.js?v=185';

const TAU = Math.PI * 2;
// the same "random" every time, so the skyline never changes
const rand = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
// left to right along the battlement; the left four face right, the right four face left
export const LINE = ['TANK', 'WIZARD', 'GUNNER', 'BLADE', 'NINJA', 'MECHANIC', 'ROBOT', 'DEV'];
export const SPOT = LINE.map((id, i) => ({ id, x: 34 + i * 36, y: i === 3 || i === 4 ? 161 : 157 + (i === 0 || i === 7 ? -1 : 0), flip: i >= 4 }));
const COLOR = { BLADE: '#ff7a2a', GUNNER: '#ffd447', WIZARD: '#b48cff', NINJA: '#ff8fb8', MECHANIC: '#ff8a3c', TANK: '#8fa2bd', ROBOT: '#62efff', DEV: '#39ff6a' };
export const fighterColor = (id) => COLOR[id] || P.paper;
const MELEE = new Set(['BLADE', 'NINJA', 'MECHANIC', 'TANK']);

// ---------- the still layers, painted once ----------
let SKY = null, FAR = null, NEAR = null, LEDGE = null, WINDOWS = [], CRACKS = [];
const SKY_RAMP = ['#040107', '#08030c', '#0e040f', '#170510', '#230712', '#310a14', '#410d16', '#521116'];
function paint() {
  // the sky: dark at the top, burning low down, dithered between its bands
  SKY = makeCanvas(W, H);
  let g = SKY.getContext('2d');
  for (let y = 0; y < H; y++) {
    const k = Math.min(1, Math.pow(y / 138, 1.4)) * (SKY_RAMP.length - 1), i0 = Math.floor(k), f = k - i0;
    for (let x = 0; x < W; x++) { g.fillStyle = SKY_RAMP[f > (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 ? Math.min(i0 + 1, SKY_RAMP.length - 1) : i0]; g.fillRect(x, y, 1, 1); }
  }
  // a few cold stars high up
  for (let i = 0; i < 40; i++) { g.fillStyle = rand(i) < 0.3 ? '#6a5a7a' : '#2e2438'; g.fillRect(Math.floor(rand(i + 50) * W), Math.floor(rand(i + 90) * 60), 1, 1); }
  // a jagged mountain ridge far behind everything
  g.fillStyle = '#1e0712';
  for (let x = 0; x < W; x++) { const h = 14 + Math.sin(x * 0.045) * 6 + Math.sin(x * 0.13 + 1) * 3 + rand(x) * 2; g.fillRect(x, Math.round(128 - h), 1, Math.ceil(h) + 4); }
  // the ruins of the pit: gothic towers with spires, broken tops and battlements, walls between them, and the
  // Ashen King's keep in the middle with its spire reaching up under the black sun. Wider than the screen so it
  // can drift.
  FAR = makeCanvas(W + 60, 96); g = FAR.getContext('2d'); g.fillStyle = '#1b0a1d'; WINDOWS = [];
  const base = 96;
  const tower = (x, w, h, roof, seed) => {
    g.fillRect(x, base - h, w, h);
    if (roof === 'spire') for (let r = 1; r <= w * 1.7; r++) { const ww = Math.max(1, Math.round(w * (1 - r / (w * 1.7)))); g.fillRect(x + Math.round((w - ww) / 2), base - h - r, ww, 1); }
    else if (roof === 'cren') { g.fillRect(x - 1, base - h, w + 2, 2); for (let c = -1; c < w + 1; c += 2) g.fillRect(x + c, base - h - 2, 1, 2); }
    else for (let c = 0; c < w; c++) { const d = Math.floor(rand(seed + c) * 6); g.fillRect(x + c, base - h - (c % 3 ? d : 0), 1, d + 1); }
    if (h > 18) WINDOWS.push([x + Math.floor(w / 2), base - h + 5 + Math.floor(rand(seed + 2) * (h - 12)), rand(seed + 3) * TAU]);
  };
  const keep = W / 2 + 30;
  for (let x = 0, i = 0; x < W + 60; i++) {
    if (Math.abs(x - keep) < 26) { x = keep + 26; continue; }
    const kind = rand(i * 3 + 1), w = 5 + Math.floor(rand(i * 3 + 2) * 6);
    if (kind < 0.35) { const ww = 8 + Math.floor(rand(i + 5) * 14), hh = 9 + Math.floor(rand(i + 6) * 7); g.fillRect(x, base - hh, ww, hh); for (let c = 0; c < ww; c += 2) g.fillRect(x + c, base - hh - 2, 1, 2); x += ww; continue; }
    tower(x, w, 20 + Math.floor(rand(i * 3 + 3) * 34), kind < 0.6 ? 'spire' : kind < 0.82 ? 'cren' : 'broken', i * 11);
    x += w + Math.floor(rand(i + 9) * 3);
  }
  // the keep: a wide hall, two flanking towers and the great spire
  g.fillRect(keep - 18, base - 30, 36, 30);
  tower(keep - 24, 8, 44, 'spire', 901); tower(keep + 16, 8, 44, 'spire', 902); tower(keep - 6, 12, 58, 'spire', 903);
  for (let c = -18; c < 18; c += 2) g.fillRect(keep + c, base - 32, 1, 2);
  WINDOWS.push([keep, base - 40, 0.3], [keep - 9, base - 16, 1.7], [keep + 9, base - 16, 3.1]);
  // near ruins: tall broken spires on both sides framing the battlement, and a low wall between them
  NEAR = makeCanvas(W, 70); g = NEAR.getContext('2d'); g.fillStyle = '#0b050e';
  g.fillRect(0, 52, W, 18);
  for (let x = 0, i = 0; x < W; i++) { const w = 3 + Math.floor(rand(i + 31) * 6), h = 4 + Math.floor(rand(i + 37) * 12); g.fillRect(x, 52 - h, w, h); x += w + Math.floor(rand(i + 41) * 6); }
  const spire = (sx, w, h, lean) => { for (let y = 0; y < h; y++) { const k = y / h, ww = Math.max(1, Math.round(w * (0.35 + 0.65 * k))); g.fillRect(Math.round(sx + lean * (1 - k) - ww / 2), 70 - h + y, ww, 1); } };
  spire(12, 18, 66, -3); spire(30, 9, 44, 2); spire(W - 14, 20, 68, 3); spire(W - 34, 10, 46, -2);
  // the battlement: worn stone blocks, a lit edge on top, cracks that glow with fire under them
  LEDGE = makeCanvas(W, 30); g = LEDGE.getContext('2d'); CRACKS = [];
  g.fillStyle = '#120c18'; g.fillRect(0, 2, W, 28);
  for (let row = 0; row < 4; row++) for (let x = -((row % 2) * 9), i = 0; x < W; i++) {
    const bw = 16 + Math.floor(rand(row * 50 + i) * 8), y = 3 + row * 7;
    g.fillStyle = rand(row * 70 + i) < 0.5 ? '#1f1729' : '#241b2f'; g.fillRect(x + 1, y, bw - 1, 6);
    g.fillStyle = '#2c2238'; g.fillRect(x + 1, y, bw - 1, 1);
    if (rand(row * 90 + i) < 0.18) CRACKS.push([x + Math.floor(bw / 2), y + 3]);
    x += bw;
  }
  g.fillStyle = '#3d3149'; g.fillRect(0, 2, W, 1); g.fillStyle = '#4e405c'; for (let x = 0; x < W; x += 3) g.fillRect(x, 2, 1, 1);
  g.fillStyle = '#07040a'; g.fillRect(0, 0, W, 2);
}

// ---------- the moving parts ----------
const ash = [], embers = [];
let lastT = null, bolt = null, boltAt = 3;
function weather(t) {
  // the opening and the title run on different clocks: when it jumps, the lightning starts over
  if (lastT !== null && (t < lastT || t - lastT > 1)) { bolt = null; boltAt = t + 2 + Math.random() * 2; }
  const dt = lastT === null ? 1 / 60 : Math.min(0.1, Math.max(0, t - lastT));
  lastT = t;
  if (ash.length < 70 && Math.random() < 0.5) ash.push({ x: Math.random() * (W + 40) - 40, y: -3, vx: 8 + Math.random() * 10, vy: 9 + Math.random() * 12, c: Math.random() < 0.6 ? '#6a5a64' : '#3e3446' });
  if (embers.length < 46 && Math.random() < 0.6) embers.push({ x: Math.random() * W, y: H - 4 - Math.random() * 20, vx: (Math.random() - 0.3) * 10, vy: -12 - Math.random() * 26, life: 2.5 + Math.random() * 3, t: 0, c: Math.random() < 0.6 ? '#ff6a2b' : '#ffb347' });
  for (const a of ash) { a.x += (a.vx + Math.sin(t * 1.3 + a.y * 0.08) * 6) * dt; a.y += a.vy * dt; }
  for (const e of embers) { e.t += dt; e.x += (e.vx + Math.sin(e.t * 2 + e.x) * 6) * dt; e.y += e.vy * dt; }
  for (let i = ash.length - 1; i >= 0; i--) if (ash[i].y > H + 2 || ash[i].x > W + 4) ash.splice(i, 1);
  for (let i = embers.length - 1; i >= 0; i--) if (embers[i].t > embers[i].life || embers[i].y < -4) embers.splice(i, 1);
  // red lightning behind the towers every few seconds
  if (t > boltAt) {
    boltAt = t + 4 + Math.random() * 5;
    const x = 30 + Math.random() * (W - 60), pts = [[x, 0]];
    for (let y = 0, cx = x; y < 110;) { y += 6 + Math.random() * 10; cx += (Math.random() - 0.5) * 18; pts.push([cx, y]); }
    bolt = { t, pts };
  }
}

// one fighter, feet at x, y, at scale s (whole canvas pixels per sprite pixel, so the art stays crisp).
// o: flip, t (animation clock), wa (weapon angle, rest by default), tint (silhouette), alpha, evo, rim (outline color)
export function drawFighter(id, x, y, s, o = {}) {
  const set = (o.evo ? SPR.evo : SPR.chars)[id];
  if (!set?.body) return;
  const flip = !!o.flip, fr = set.body.idles[Math.floor((o.t ?? 0) * 7) % set.body.idles.length];
  const w = 40 * s, h = 32 * s, x0 = Math.round((x - w / 2) * 3) / 3, y0 = Math.round((y - (92.5 / 3) * s) * 3) / 3;
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  if (o.rim) { const r = fr.tint(o.rim, flip); for (const dx of [-1, 1]) ctx.drawImage(r, 0, 0, 120, 96, x0 + (dx * s) / 3, y0, w, h); ctx.drawImage(r, 0, 0, 120, 96, x0, y0 - s / 3, w, h); }
  const wn = set.rig.weapon, rest = REST[wn] ?? 0.4, wa = o.wa ?? (flip ? Math.PI - rest : rest);
  const hx = x0 + ((flip ? 120 - set.rig.hand[0] - 0.5 : set.rig.hand[0] + 0.5) / 3) * s, hy = y0 + ((set.rig.hand[1] + 0.5) / 3) * s;
  const weapon = () => { if (!wn || o.tint) return; ctx.save(); ctx.translate(hx, hy); ctx.scale(s, s); drawWeaponAt(ctx, wn, !!set.evolved, 0, 0, wa, flip, o.alpha ?? 1); ctx.restore(); };
  // Rin stands with her katana in its scabbard at her hip, until she shows it off
  const sheath = SHEATH[wn] && o.wa === undefined && !o.tint;
  if (sheath) { ctx.save(); ctx.translate(hx, hy); ctx.scale(s, s); drawWeaponAt(ctx, SHEATH[wn], !!set.evolved, 0, 0, flip ? 0.35 : Math.PI - 0.35, flip, o.alpha ?? 1); ctx.restore(); }
  const behind = Math.sin(wa) < -0.35;
  if (behind && !sheath) weapon();
  ctx.drawImage(o.tint ? fr.tint(o.tint, flip) : flip ? fr.f : fr.n, 0, 0, 120, 96, x0, y0, w, h);
  if (!behind && !sheath) weapon();
  ctx.globalAlpha = 1;
  return [hx, hy, wa];
}
// where a fighter's weapon points during a flourish (0..1): melee winds up and cuts through, the rest aim and fire
export function flourishAngle(id, k, flip) {
  const rest = REST[SPR.chars[id]?.rig?.weapon] ?? 0.4, m = (a) => (flip ? Math.PI - a : a);
  if (k <= 0 || k >= 1) return m(rest);
  if (MELEE.has(id)) {
    if (k < 0.25) return m(rest - 2.2 * (k / 0.25));
    if (k < 0.45) return m(rest - 2.2 + 3.6 * ((k - 0.25) / 0.2));
    return m(rest + 1.4 - 1.4 * ((k - 0.45) / 0.55));
  }
  if (id === 'WIZARD') return m(-1.4 + Math.sin(k * Math.PI) * -0.2);
  return m(k < 0.2 ? rest - 0.5 * (k / 0.2) : rest - 0.5 + 0.5 * Math.max(0, (k - 0.5) / 0.5));
}

// the whole scene. o: locked(id) and secret(id) for the roster, drop(i) 0..1 (fighters landing one by one in the
// opening; missing means all standing), dark (0..1 dims it), sun (0..1 brightness of the corona)
export function drawScene(t, o = {}) {
  if (!SKY) paint();
  weather(t);
  ctx.drawImage(SKY, 0, 0);
  // the swallowed sun: corona, slow rays, a black disc with one thin crescent of light left
  const cx = W / 2, cy = 44, R = 21, beat = Math.pow(Math.max(0, Math.sin(t * Math.PI * 0.9)), 10), sun = o.sun ?? 1;
  glow(cx, cy, P.blood, 86, (0.2 + beat * 0.12) * sun); glow(cx, cy, P.ember, 52, (0.24 + beat * 0.2) * sun);
  for (let i = 0; i < 28; i++) {
    const a = t * 0.12 + (i * TAU) / 28, L = (i % 3 ? 10 : 22) + Math.sin(t * 2.6 + i * 1.7) * 4 + beat * 6;
    ctx.globalAlpha = (0.28 + 0.3 * Math.max(0, Math.sin(t * 1.8 + i))) * sun;
    line(cx + Math.cos(a) * (R + 3), cy + Math.sin(a) * (R + 3), cx + Math.cos(a) * (R + 3 + L), cy + Math.sin(a) * (R + 3 + L), i % 3 ? P.ember : P.ember3);
  }
  ctx.globalAlpha = 1;
  ring(cx, cy, R + 2, 2, P.ember2); ring(cx, cy, R + 1, 1, P.ember3); disc(cx, cy, R, '#030104');
  for (let i = -9; i <= 9; i++) { const a = -0.7 + i * 0.065; px(cx + Math.cos(a) * R, cy + Math.sin(a) * R, i % 3 ? P.paper : P.ember3); }
  // lightning behind the towers, and the sky lighting up with it
  if (bolt && t >= bolt.t && t - bolt.t < 0.16) {
    const k = 1 - (t - bolt.t) / 0.16;
    ctx.globalAlpha = 0.18 * k; rect(0, 0, W, 130, '#ff3b4f'); ctx.globalAlpha = 1;
    for (let i = 1; i < bolt.pts.length; i++) { const [x0, y0] = bolt.pts[i - 1], [x1, y1] = bolt.pts[i]; line(x0, y0, x1, y1, k > 0.5 ? P.paper : '#ff8a9a', k > 0.6 ? 2 : 1); }
  }
  // far towers drifting slowly, their windows flickering like fires
  const drift = Math.round(Math.sin(t * 0.05) * 20) - 30;
  ctx.drawImage(FAR, drift, 36);
  for (const [wx, wy, ph] of WINDOWS) { const a = 0.5 + 0.5 * Math.sin(t * 2.3 + ph); if (a > 0.25) { ctx.globalAlpha = a; px(wx + drift, wy + 36, a > 0.8 ? '#ffb347' : '#ff6a2b'); ctx.globalAlpha = 1; } }
  // fog rolling between the towers and the battlement
  for (let i = 0; i < 4; i++) { const y = 118 + i * 7, x = ((t * (6 + i * 3) + i * 90) % (W + 120)) - 120; ctx.globalAlpha = 0.16; rect(x, y, 140, 4, '#4a1a2a'); rect(x - W - 120, y, 140, 4, '#4a1a2a'); ctx.globalAlpha = 1; }
  ctx.drawImage(NEAR, 0, 96);
  glow(W / 2, 160, P.ember, 120, 0.12);
  // ash falling
  for (const a of ash) px(a.x, a.y, a.c);
  // the battlement and its burning cracks
  ctx.drawImage(LEDGE, 0, 150);
  for (const [kx, ky] of CRACKS) { const a = 0.45 + 0.35 * Math.sin(t * 2.2 + kx); ctx.globalAlpha = a; line(kx - 2, 150 + ky, kx + 3, 150 + ky + 2, P.ember); ctx.globalAlpha = 1; glow(kx, 151 + ky, P.ember, 6, 0.2 * a); }
  // the fighters, outer ones (further back) first
  const order = [0, 7, 1, 6, 2, 5, 3, 4];
  for (const i of order) {
    const sp = SPOT[i], k = o.drop ? o.drop(i) : 1;
    if (k <= 0) continue;
    const lk = o.locked?.(sp.id), secret = o.secret?.(sp.id), y = sp.y - Math.round((1 - k) * (1 - k) * 170);
    // a shadow that tightens as they land
    ctx.globalAlpha = 0.5 * k; ctx.fillStyle = '#05020a'; ctx.beginPath(); ctx.ellipse(sp.x, sp.y + 1, 9, 2, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    // every 2.2 seconds the next fighter shows off: a cut, a shot, a flare of the staff, a glitch
    const turn = Math.floor(t / 2.2) % 8, ft = (t % 2.2) / 0.62, show = !o.drop && !lk && LINE[turn] === sp.id && ft < 1 ? ft : 0;
    const res = drawFighter(sp.id, sp.x, y, 2, { flip: sp.flip, t: t + i * 0.37, tint: lk ? '#07050b' : null, rim: lk && !secret ? '#2a2236' : null, wa: show ? flourishAngle(sp.id, show, sp.flip) : undefined });
    if (show && res) flourishFx(sp, res, show, 2);
    if (k < 1 && k > 0.85) glow(sp.x, sp.y, fighterColor(sp.id), 16, (1 - k) * 4);
  }
  for (const e of embers) { const a = Math.max(0, 1 - e.t / e.life); ctx.globalAlpha = a; px(e.x, e.y, e.c); ctx.globalAlpha = 1; glow(e.x, e.y, e.c, 3, 0.3 * a); }
  if (o.dark > 0) { ctx.globalAlpha = Math.min(1, o.dark); rect(0, 0, W, H, '#030106'); ctx.globalAlpha = 1; }
}
// the cut, the shot, the staff's flare or the glitch that goes with a flourish, at scale s
export function flourishFx(sp, [hx, hy, wa], k, s = 2) {
  const id = sp.id, col = fighterColor(id), set = SPR.chars[id], len = (set?.rig?.weapon ? 6 : 4) * s;
  const tx = hx + Math.cos(wa) * len, ty = hy + Math.sin(wa) * len;
  if (MELEE.has(id) && k > 0.25 && k < 0.5) {
    // the cut: an arc of light behind the blade
    const a0 = wa - (sp.flip ? -1 : 1) * 1.6, steps = 12, th = Math.max(2, Math.round(s / 1.5));
    for (let j = 0; j < steps; j++) { const a = a0 + ((wa - a0) * j) / steps, r = len * 1.1; ctx.globalAlpha = j / steps; line(hx + Math.cos(a) * r * 0.55, hy + Math.sin(a) * r * 0.55, hx + Math.cos(a) * r, hy + Math.sin(a) * r, j > steps - 3 ? P.paper : col, th); }
    ctx.globalAlpha = 1;
    glow(tx, ty, col, 4 * s, 0.6);
  } else if ((id === 'GUNNER' || id === 'ROBOT') && k > 0.2 && k < 0.34) {
    disc(tx, ty, Math.max(2, s / 2), P.paper); glow(tx, ty, col, 6 * s, 0.9);
    line(tx, ty, tx + Math.cos(wa) * 40 * s, ty + Math.sin(wa) * 40 * s, id === 'ROBOT' ? col : P.paper, id === 'ROBOT' ? Math.max(2, s) : Math.max(1, s / 2));
  } else if (id === 'WIZARD' && k > 0.15 && k < 0.85) {
    glow(tx, ty, col, (4 + Math.sin(k * Math.PI) * 5) * s, 0.8);
    for (let j = 0; j < 6; j++) { const a = k * 9 + (j * TAU) / 6; rect(tx + Math.cos(a) * 3.5 * s, ty + Math.sin(a) * 2 * s, Math.max(1, s / 2), Math.max(1, s / 2), j % 2 ? P.paper : col); }
  } else if (id === 'DEV' && k < 0.6) {
    for (let j = 0; j < 5; j++) rect(sp.x - 7 * s + Math.random() * 12 * s, sp.y - 17 * s + Math.random() * 15 * s, (1 + Math.random() * 3.5) * s, Math.max(1, s / 2), ['#39ff6a', '#ff4fa8', P.paper][j % 3]);
  }
}

// the logo with a band of light running across it; it smoulders between sweeps
const shine = { c: null };
export function drawLogo(img, x, y, t) {
  if (!img) return;
  glow(x + img.width / 2, y + img.height / 2, P.ember, 70, 0.16);
  ctx.drawImage(img, x, y);
  if (!shine.c || shine.c.width !== img.width) shine.c = makeCanvas(img.width, img.height);
  const g = shine.c.getContext('2d'), sweep = (t * 0.35) % 1.6;
  if (sweep > 1) return;
  g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, img.width, img.height); g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  const bx = -20 + (img.width + 40) * sweep;
  g.fillStyle = '#fff6d8'; for (let r = 0; r < img.height; r++) g.fillRect(Math.round(bx - r * 0.5), r, 6, 1);
  g.fillStyle = '#ffd447'; for (let r = 0; r < img.height; r++) g.fillRect(Math.round(bx - r * 0.5) - 4, r, 4, 1);
  ctx.globalAlpha = 0.85; ctx.drawImage(shine.c, x, y); ctx.globalAlpha = 1;
}
