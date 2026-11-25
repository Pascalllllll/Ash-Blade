// The Last Camp: the lobby before a run, at the rim of the King's pit under the black sun. It is wider than the
// screen and the camera moves over it. It has three modes:
//   pick   the camera looks over the campfire where all eight fighters sit. Point at one (arrows, the mouse or a tap)
//          and choose it; locked ones are ash statues. Escape goes back to the title.
//   card   the chosen fighter's card: their high pixel portrait on the left, their numbers, powers and records on the
//          right. Enter locks them in and you walk the camp as them; Escape chooses another.
//   walk   you walk the camp as that fighter. Walk up to the others and talk to them (Enter). Read the Compendium on the
//          old stone, set the difficulty at the war banner, train at the dummy, walk into the pit to begin. Tab shows
//          your card again, Escape goes back to choosing.
// Fighters are drawn at three quarters of their fight size while you choose, and at their fight size once one is
// locked in and you walk the camp, as you would in a fight.
import { ctx, W, H, FW, SX, P, rect, px, line, disc, ring, glow, text, textO, textW, makeCanvas } from './gfx.js?v=209';
import { A } from './audio.js?v=209';
import { input, keyHit, keyDown, actionHit } from './input.js?v=209';
import { keyLabel } from './bindings.js?v=209';
import { OPTIONS, settings, best, saveSettings, isUnlocked } from './store.js?v=209';
import { CHARS } from './chars.js?v=209';
import { drawFighter } from './title-scene.js?v=209';
import { drawEmote, sayBubble } from './emotes.js?v=209';
import { drawSelect, sel } from './ui.js?v=209';
import { loadPortraits } from './portraits.js?v=209';

const TAU = Math.PI * 2;
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
// the fighters' size: three quarters while you choose, then, once one is locked in, eased up to their size in a fight
const PICK_S = 0.75, WALK_S = 1;
let S = PICK_S;
const CW = 600, CH = 214;            // the camp, in game pixels
const FIRE = [300, 136], PIT = [300, 64], STONE = [130, 132], BANNER = [470, 132], DUMMY = [168, 184];
const TENTS = [[62, 118, '#5a3a3a'], [538, 118, '#3a4a5a']], POSTS = [[214, 104], [386, 104], [236, 196], [364, 196]];
const CRATES = [[516, 178], [528, 184], [508, 186]], CART = [438, 194];
const BOUNDS = { x0: 16, x1: CW - 16, y0: 84, y1: CH - 12 };
const LINES = {
  BLADE: ['THE EMBER IS WARM TONIGHT.', 'HE IS AT THE BOTTOM. I CAN FEEL IT.'],
  GUNNER: ['ONE MORE BOUNTY. THEN I QUIT.', 'YOU BUYING, OR AM I?'],
  WIZARD: ['THE STARS ARE QUIET DOWN THERE.', 'I REMEMBER HAVING A FACE.'],
  NINJA: ['I STILL HAVE HOMEWORK...', 'THE RED ONI CLAN DOES NOT RUN.'],
  MECHANIC: ['BIG GUY NEEDS A NEW BOLT.', 'THAT COLOSSUS HAS GOOD PARTS.'],
  TANK: ['I SERVED HIM. I WILL END HIM.', 'STAND FAST. SLEEP LATER.'],
  ROBOT: ['ORDER: STOP THE KING. PENDING.', 'CAMPFIRE TEMPERATURE: NICE.'],
  DEV: ['THIS CAMP IS HARDCODED.', 'WHO WROTE THESE BUGS? OH. ME.'],
};
// what they say after they have beaten the King once (their own ending has happened)
const LINES_WON = {
  BLADE: ['THE EMBER IS HOME. I CAME BACK FOR THE DARK.', 'AUREL WAS AFRAID. I UNDERSTAND THAT NOW.'],
  GUNNER: ['THE TOWN GOT ITS ROUND. THIS ONE IS FOR ME.', 'NO BOUNTY ON THE DARK. I CHECKED.'],
  WIZARD: ['I HAVE MY FACE BACK. I WOULD LIKE TO KEEP IT.', 'THE NEW SUN HAS A LONG NAME. WORTH IT.'],
  NINJA: ['THE CHERRY TREE BLOOMED. I SAW IT.', 'I WAS LATE AGAIN. WORTH IT.'],
  MECHANIC: ['THE WINDMILL STILL TURNS. BIG GUY IS PROUD.', 'THE DARK HAS PARTS TOO, RIGHT?'],
  TANK: ['I CARVED HIS NAME. NOW I GUARD THE LIGHT.', 'REST, MY KING. I WILL HOLD THE DARK.'],
  ROBOT: ['NEW ORDER: KEEP IT SAFE. STILL EXECUTING.', 'THE FLOWER IS FINE. THANK YOU FOR ASKING.'],
  DEV: ['SOMETHING BELOW IS STILL RUNNING.', 'THE ENDING SHIPPED. NOW THE SEQUEL.'],
};
const MOODS = {
  BLADE: ['dots', 'note'], GUNNER: ['note', 'heart'], WIZARD: ['dots', 'star'], NINJA: ['sweat', 'note'],
  MECHANIC: ['note', 'ask'], TANK: ['dots', 'sleep'], ROBOT: ['ask', 'alert'], DEV: ['dots', 'sleep'],
};
const head = () => Math.round(34 * S);   // from the feet to just over the head, at the current size
const spot = (i) => { const a = Math.PI * 1.1 + (i / OPTIONS.char.length) * TAU; return [FIRE[0] + Math.cos(a) * 78, FIRE[1] + 4 + Math.sin(a) * 26]; };

export const camp = { t: 0, mode: 'pick' };
export function openCamp() {
  const list = OPTIONS.char;
  let id = settings.char;
  if (!isUnlocked(id)) id = 'BLADE';
  const others = {};
  list.forEach((o, i) => { const [x, y] = spot(i); others[o] = { id: o, x, y, hx: x, hy: y, face: x > FIRE[0] ? -1 : 1, emote: null, eT: 0, eNext: 2 + hash(i) * 5, say: null, sayT: 0, near: false, li: 0 }; });
  S = PICK_S;
  Object.assign(camp, { t: 0, mode: 'pick', pick: list.indexOf(id), id, x: 0, y: 0, face: 1, moving: 0, tx: null, ty: null, pending: null, near: null, others, puffs: [], sparks: [], msg: null, msgT: 0, cam: { x: FIRE[0] - W / 2, y: FIRE[1] - H / 2 - 6 }, cardFrom: 'pick', cardId: id });
  loadPortraits();
}
const ids = () => OPTIONS.char;
const world = (sx, sy) => ({ x: sx + camp.cam.x, y: sy + camp.cam.y });
const dist = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) * 1.4);
const back = () => keyHit('Escape') || (input.touch && input.mouse.pressed && input.mouse.x < 46 && input.mouse.y < 18);

// ---------- the three modes ----------
function openCard(id, from) {
  camp.mode = 'card'; camp.cardFrom = from; camp.cardId = id;
  sel.i = ids().indexOf(id); sel.t = 0; sel.shown = -1;
  loadPortraits();
  if (isUnlocked(id)) { A.select(); A.prepareVoice(id, 'entrances'); A.playVoice(id, 0, 'entrances'); } else A.deny();
}
function startWalking(id) {
  const o = camp.others[id];
  camp.mode = 'walk'; camp.id = id;
  camp.x = o.hx + (FIRE[0] - o.hx) * 0.18; camp.y = Math.max(BOUNDS.y0, Math.min(BOUNDS.y1, o.hy + (FIRE[1] - o.hy) * 0.18 + 6));
  camp.tx = camp.ty = null; camp.pending = null;
  settings.char = id; saveSettings();
  puff(o.hx, o.hy, CHARS[id].color()); A.dash();
}
function updatePick() {
  const list = ids();
  const lr = (keyHit('ArrowRight', 'KeyD') ? 1 : 0) - (keyHit('ArrowLeft', 'KeyA') ? 1 : 0) + (keyHit('ArrowDown', 'KeyS') ? 1 : 0) - (keyHit('ArrowUp', 'KeyW') ? 1 : 0);
  if (lr) { camp.pick = (camp.pick + lr + list.length) % list.length; A.ui(); }
  const m = world(input.mouse.x, input.mouse.y);
  let over = -1;
  list.forEach((id, i) => { const o = camp.others[id]; if (Math.abs(m.x - o.x) < 12 && m.y > o.y - head() - 2 && m.y < o.y + 4) over = i; });
  if (over >= 0 && (input.mouse.moved || input.mouse.pressed) && over !== camp.pick) { camp.pick = over; A.ui(); }
  if ((input.mouse.pressed && over >= 0) || keyHit('Enter', 'Space') || actionHit('attack')) openCard(list[camp.pick], 'pick');
  return null;
}
function updateCard() {
  const id = camp.cardId, ok = isUnlocked(id), m = input.mouse;
  const onFirst = m.pressed && m.x > 160 && m.y > 134 && m.y < 147, onSecond = m.pressed && m.x > 160 && m.y >= 147 && m.y < 160;
  if (keyHit('Enter', 'Space') || actionHit('attack') || onFirst) {
    if (!ok) { A.deny(); camp.mode = 'pick'; return null; }
    if (camp.cardFrom === 'walk' && id === camp.id) { camp.mode = 'walk'; A.ui(); return null; }
    startWalking(id); return null;
  }
  if (back() || onSecond) { A.ui(); camp.mode = 'pick'; camp.pick = ids().indexOf(id); }
  return null;
}

// what you can use while walking, where it is, and how close you have to be
function usables() {
  const out = [];
  for (const o of Object.values(camp.others)) if (o.id !== camp.id) out.push({ kind: 'hero', id: o.id, x: o.x, y: o.y, r: 18 });
  out.push({ kind: 'pit', x: PIT[0], y: PIT[1] + 20, r: 30 }, { kind: 'codex', x: STONE[0], y: STONE[1], r: 16 }, { kind: 'diff', x: BANNER[0], y: BANNER[1], r: 16 }, { kind: 'train', x: DUMMY[0], y: DUMMY[1], r: 14 });
  return out;
}
function use(u) {
  if (!u) return null;
  if (u.kind === 'pit') { A.select(); return { start: camp.id }; }
  if (u.kind === 'codex') { A.select(); return { codex: true }; }
  if (u.kind === 'train') { A.select(); return { train: camp.id }; }
  if (u.kind === 'diff') { A.ui(); const d = OPTIONS.diff, i = (d.indexOf(settings.diff) + 1) % d.length; return { diff: d[i] }; }
  if (u.kind === 'hero') {
    // a word with them: unlocked ones answer, statues just stand there
    const o = camp.others[u.id];
    if (!isUnlocked(u.id)) { o.emote = 'ask'; o.eT = 0; camp.msg = 'AN ASH STATUE. ' + CHARS[u.id].mission[0]; camp.msgT = 2; A.deny(); return null; }
    o.say = (best.chars[u.id]?.won ? LINES_WON : LINES)[u.id][o.li++ % 2]; o.sayT = 0; o.emote = null; A.ui();
    return null;
  }
  return null;
}
function puff(x, y, c) {
  for (let i = 0; i < 18; i++) { const a = hash(i + x) * TAU, v = 15 + hash(i + y) * 35; camp.puffs.push({ x, y: y - 6, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6 - 8, t: 0, life: 0.4 + hash(i) * 0.4, c: i % 3 ? c : P.paper }); }
}
function updateWalk(dt) {
  const c = camp;
  if (back()) { A.ui(); c.mode = 'pick'; c.pick = ids().indexOf(c.id); return null; }
  if (keyHit('Tab', 'KeyI') || (input.mouse.pressed && input.mouse.y > H - 24)) { openCard(c.id, 'walk'); return null; }
  let mx = (keyDown('KeyD', 'ArrowRight') ? 1 : 0) - (keyDown('KeyA', 'ArrowLeft') ? 1 : 0), my = (keyDown('KeyS', 'ArrowDown') ? 1 : 0) - (keyDown('KeyW', 'ArrowUp') ? 1 : 0);
  const all = usables();
  if (input.mouse.pressed) {
    const m = world(input.mouse.x, input.mouse.y + 4);
    const hit = all.find((u) => (u.kind === 'hero' ? Math.abs(u.x - m.x) < 12 && m.y > u.y - head() && m.y < u.y + 6 : Math.hypot(u.x - m.x, u.y - 8 - m.y) < 14) || (u.kind === 'pit' && Math.abs(m.x - PIT[0]) < 80 && Math.abs(m.y - PIT[1]) < 18));
    c.tx = hit ? hit.x + (hit.kind === 'hero' ? (c.x < hit.x ? -10 : 10) : 0) : m.x; c.ty = hit ? (hit.kind === 'pit' ? BOUNDS.y0 : hit.y + 4) : m.y;
    c.tx = Math.max(BOUNDS.x0, Math.min(BOUNDS.x1, c.tx)); c.ty = Math.max(BOUNDS.y0, Math.min(BOUNDS.y1, c.ty));
    c.pending = hit || null;
    if (hit && dist(c, hit) < hit.r) { c.tx = c.ty = null; c.pending = null; return use(hit); }
  }
  if (mx || my) { c.tx = c.ty = null; c.pending = null; }
  else if (c.tx !== null) {
    const dx = c.tx - c.x, dy = c.ty - c.y, d = Math.hypot(dx, dy);
    if (d < 2) { c.tx = c.ty = null; } else { mx = dx / d; my = dy / d; }
  }
  const len = Math.hypot(mx, my);
  if (len > 0.1) {
    c.x += (mx / Math.max(1, len)) * 64 * dt; c.y += (my / Math.max(1, len)) * 64 * dt;
    if (Math.abs(mx) > 0.2) c.face = mx < 0 ? -1 : 1;
    c.moving = Math.min(1, c.moving + dt * 8);
  } else c.moving = Math.max(0, c.moving - dt * 8);
  // the fire, the stone, the banner, the tents, the cart and the crates are solid
  for (const [ox, oy, r] of [[FIRE[0], FIRE[1], 12], [STONE[0], STONE[1], 8], [BANNER[0], BANNER[1], 5], ...TENTS.map(([x, y]) => [x, y, 22]), [CART[0], CART[1], 12], ...CRATES.map(([x, y]) => [x, y, 6])]) {
    const dx = c.x - ox, dy = (c.y - oy) * 1.6, d = Math.hypot(dx, dy);
    if (d < r && d > 0) { c.x = ox + (dx / d) * r; c.y = oy + (dy / d) * r / 1.6; }
  }
  c.x = Math.max(BOUNDS.x0, Math.min(BOUNDS.x1, c.x)); c.y = Math.max(BOUNDS.y0, Math.min(BOUNDS.y1, c.y));
  let near = null, nd = 1e9;
  for (const u of all) { const d = dist(c, u); if (d < u.r && d < nd) { nd = d; near = u; } }
  if (c.y <= BOUNDS.y0 + 2 && Math.abs(c.x - PIT[0]) < 70) near = all.find((u) => u.kind === 'pit');
  c.near = near;
  if (c.pending && near && near.kind === c.pending.kind && (near.id || '') === (c.pending.id || '')) { c.pending = null; c.tx = c.ty = null; return use(near); }
  if (near && (keyHit('Enter', 'Space') || actionHit('attack'))) return use(near);
  return null;
}

export function updateCamp(dt) {
  const c = camp;
  const want = c.mode === 'walk' || (c.mode === 'card' && c.cardFrom === 'walk') ? WALK_S : PICK_S;
  S += (want - S) * Math.min(1, dt * 7); if (Math.abs(want - S) < 0.01) S = want;
  c.t += dt; c.msgT = Math.max(0, c.msgT - dt);
  let r = null;
  if (c.mode === 'pick') { if (back()) return { back: true }; r = updatePick(); }
  else if (c.mode === 'card') r = updateCard();
  else r = updateWalk(dt);
  // the camera: over the fire while choosing (leaning toward the one pointed at), after you while walking
  const po = c.others[ids()[c.pick]];
  const fo = c.mode === 'walk' ? { x: c.x, y: c.y - 10 } : { x: po.x * 0.35 + FIRE[0] * 0.65, y: FIRE[1] - 10 };
  const tx = Math.max(SX, Math.min(CW - W - SX, fo.x - W / 2)), ty = Math.max(0, Math.min(CH - H, fo.y - H / 2));
  const k = Math.min(1, dt * 6);
  c.cam.x += (tx - c.cam.x) * k; c.cam.y += (ty - c.cam.y) * k;
  // the others: glance at you, talk when you come close, show how they feel now and then
  for (const o of Object.values(c.others)) {
    if (c.mode === 'walk' && o.id === c.id) continue;
    const close = c.mode === 'walk' && Math.hypot(c.x - o.x, c.y - o.y) < 26;
    o.face = close ? (c.x < o.x ? -1 : 1) : (o.x > FIRE[0] ? -1 : 1);
    o.near = close;
    if (o.say) { o.sayT += dt; if (o.sayT > 2.6) o.say = null; }
    o.eT += dt; o.eNext -= dt;
    if (o.emote && o.eT > 2.2) o.emote = null;
    if (o.eNext <= 0 && !o.say) { o.eNext = 9 + Math.random() * 9; if (isUnlocked(o.id)) { o.emote = MOODS[o.id][Math.floor(Math.random() * 2)]; o.eT = 0; } }
  }
  for (const p of c.puffs) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; }
  c.puffs = c.puffs.filter((p) => p.t < p.life);
  if (Math.random() < dt * 22) c.sparks.push({ x: FIRE[0] + (Math.random() - 0.5) * 8, y: FIRE[1] - 5, vx: (Math.random() - 0.5) * 8, vy: -16 - Math.random() * 24, t: 0, life: 1 + Math.random() * 1.4 });
  for (const s of c.sparks) { s.t += dt; s.x += (s.vx + Math.sin(c.t * 2 + s.life * 9) * 5) * dt; s.y += s.vy * dt; }
  c.sparks = c.sparks.filter((s) => s.t < s.life);
  return r;
}

// ---------- drawing ----------
let GROUND = null;
function paintGround() {
  const cv = makeCanvas(CW, CH), g = cv.getContext('2d');
  const put = (x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
  const gy = 58;
  g.fillStyle = '#231a20'; g.fillRect(0, gy, CW, CH - gy);
  for (let y = gy; y < CH; y++) for (let x = 0; x < CW; x++) { const r = hash(x * 3.1 + y * 17.7); if (r < 0.06) put(x, y, '#2d2229'); else if (r > 0.985) put(x, y, '#3a2c33'); }
  // worn paths from the tents to the fire and up to the pit
  for (let i = 0; i < 400; i++) { const k = i / 400; for (const [ax, ay, bx, by] of [[80, 130, 300, 140], [520, 130, 300, 140], [300, 140, 300, 82]]) { const x = ax + (bx - ax) * k + (hash(i + ax) - 0.5) * 10, y = ay + (by - ay) * k + (hash(i + ay) - 0.5) * 6; put(Math.round(x), Math.round(y), '#2e2428'); } }
  for (let i = 0; i < 70; i++) { let x = hash(i) * CW, y = gy + 6 + hash(i + 9) * (CH - gy - 6); for (let j = 0; j < 8; j++) { put(Math.round(x), Math.round(y), '#170f14'); x += hash(i * 9 + j) * 3 - 1; y += hash(i * 7 + j) * 2 - 0.6; } }
  for (let i = 0; i < 50; i++) { const x = hash(i + 50) * CW, y = gy + 10 + hash(i + 80) * (CH - gy - 12); g.fillStyle = '#4a3c40'; g.fillRect(Math.round(x), Math.round(y), 2 + (i % 2), 1); put(Math.round(x), Math.round(y) - 1, '#5e4e52'); }
  for (let i = 0; i < 18; i++) { const x = hash(i + 130) * CW, y = gy + 20 + hash(i + 140) * (CH - gy - 24); g.fillStyle = '#c8bca4'; g.fillRect(Math.round(x), Math.round(y), 3, 1); put(Math.round(x) - 1, Math.round(y) - 1, '#c8bca4'); }
  // the cliff edges at the far left and right: the camp sits on a shelf over the dark
  for (let y = gy; y < CH; y++) { const e = 6 + Math.round(Math.sin(y * 0.3) * 2 + hash(y) * 2); g.fillStyle = '#0a0608'; g.fillRect(0, y, e, 1); g.fillRect(CW - e, y, e, 1); }
  return cv;
}
function sky(t) {
  // drawn on the screen, sliding slower than the ground: far away
  const oy = -camp.cam.y;
  if (oy + 62 <= 0) return;
  const g = ctx.createLinearGradient(0, oy, 0, oy + 62);
  g.addColorStop(0, '#07040a'); g.addColorStop(0.6, '#1c0c16'); g.addColorStop(1, '#3a1418');
  ctx.fillStyle = g; ctx.fillRect(-SX, 0, FW, oy + 62);
  const span = FW + 40, ox = -camp.cam.x * 0.3;
  for (let i = 0; i < 60; i++) if ((Math.floor(t * 1.5 + i * 7) % 11) !== 0) px(-SX - 20 + (((hash(i) * span + ox) % span) + span) % span, oy + hash(i + 40) * 42, i % 5 ? '#4a3a52' : '#a89cb0');
  const sx = W / 2 + (FIRE[0] - W / 2 - camp.cam.x) * 0.4, sy = oy + 22;
  glow(sx, sy, '#ff6a2a', 46, 0.28 + Math.sin(t * 1.3) * 0.04);
  for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU + t * 0.05, r = 16 + (i % 3) * 3 + Math.sin(t * 2 + i) * 1.5; line(sx + Math.cos(a) * 14, sy + Math.sin(a) * 14, sx + Math.cos(a) * r, sy + Math.sin(a) * r, i % 2 ? '#ff9a3c' : '#ffd447'); }
  disc(sx, sy, 13, '#05020a'); ring(sx, sy, 13, 1, '#ffb347');
  // far crags and the ruined city on the horizon, a little nearer
  const ox2 = -camp.cam.x * 0.7;
  for (let x = -SX; x < W + SX; x++) { const wx = x - ox2, h = 8 + Math.round(Math.abs(Math.sin(wx * 0.07) * 7 + Math.sin(wx * 0.19) * 4)); rect(x, oy + 60 - h, 1, h, '#150a10'); }
  for (let i = 0; i < 16; i++) { const x = Math.round(12 + i * 40 + (i % 2) * 8 + ox2), h = 6 + (i % 3) * 5; if (x < -SX - 6 || x > W + SX) continue; rect(x, oy + 54 - h, 4, h, '#1e0e16'); if (i % 2) px(x + 1, oy + 54 - h + 2, '#ff7a2a'); }
}
function oval(cx, cy, rx, ry, c) { const n = Math.ceil(rx * 4); for (let i = 0; i < n; i++) { const a = (i / n) * TAU; px(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, c); } }
function pit(t) {
  const [cx, cy] = PIT;
  for (let r = 0; r < 4; r++) oval(cx, cy, 86 - r, 16 - r * 0.5, ['#3a2a2e', '#2e2024', '#221418', '#170c10'][r]);
  ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, 82, 14, 0, 0, TAU); ctx.clip();
  ctx.fillStyle = '#05020a'; ctx.fillRect(cx - 84, cy - 16, 168, 32);
  glow(cx, cy + 6, '#ff4a1a', 50, 0.32 + Math.sin(t * 1.7) * 0.06);
  for (let i = 0; i < 18; i++) { const u = (t * 0.25 + hash(i)) % 1; px(cx - 70 + hash(i + 3) * 140, cy + 9 - u * 18, u < 0.5 ? '#ff7a2a' : '#7a2a1a'); }
  ctx.restore();
  oval(cx, cy, 82, 14, '#5a4044');
  for (let i = 0; i < 6; i++) { const w = 20 - i * 2.4, y = cy + 12 - i * 2.4; rect(cx - w / 2, y, w, 2, i % 2 ? '#3a2a2e' : '#4a383c'); }
  for (const x of [cx - 60, cx + 60]) lamp(x, cy + 18, t, 12);
  textO('THE DESCENT', cx, cy - 26, '#ff9a5a', 1, 'c');
}
function lamp(x, y, t, h = 10) {
  rect(x - 1, y - h, 2, h, '#4a3428');
  const f = Math.sin(t * 14 + x) > 0 ? 1 : 0;
  rect(x - 1, y - h - 4 - f, 3, 4, '#ff7a2a'); px(x, y - h - 5 - f, '#ffd447'); glow(x, y - h - 2, '#ff7a2a', 14, 0.45);
}
function fire(t) {
  const [x, y] = FIRE;
  glow(x, y - 5, '#ff8a2a', 60, 0.18 + Math.sin(t * 7) * 0.02 + Math.sin(t * 13) * 0.015);
  ctx.globalAlpha = 0.35; disc(x, y + 2, 13, '#3a1a10'); ctx.globalAlpha = 1;
  ring(x, y + 1, 7, 1, '#5a4a48');
  for (const [a, b] of [[-6, 5], [-5, -4]]) line(x + a, y + 2, x + b, y - 1, '#5a3420', 2);
  for (let i = 0; i < 7; i++) {
    const k = i / 6, fx = x - 4 + k * 8, h = 5 + Math.sin(t * 11 + i * 1.7) * 2 + (1 - Math.abs(k - 0.5) * 2) * 4;
    rect(fx, y - h, 2, h, i % 3 ? '#ff7a2a' : '#ffb347'); px(fx, y - h - 1, '#ffd447');
  }
  rect(x - 2, y - 3, 3, 2, '#fff0a0');
  for (const s of camp.sparks) { ctx.globalAlpha = 1 - s.t / s.life; px(s.x, s.y, s.t < 0.4 ? '#ffd447' : '#ff7a2a'); }
  ctx.globalAlpha = 1;
}
function stone(t) {
  const [x, y] = STONE;
  ctx.globalAlpha = 0.4; disc(x, y + 1, 7, '#0a0608'); ctx.globalAlpha = 1;
  rect(x - 6, y - 20, 12, 21, '#4a4250'); rect(x - 6, y - 20, 12, 2, '#6a6070'); rect(x + 4, y - 18, 2, 19, '#3a3240'); rect(x - 5, y - 22, 10, 2, '#4a4250');
  for (let i = 0; i < 4; i++) { const on = (Math.floor(t * 2) + i) % 4 !== 0; rect(x - 4, y - 16 + i * 4, 6 - (i % 2) * 2, 1, on ? '#ffd447' : '#8a6a2a'); }
  glow(x, y - 10, '#ffd447', 12, 0.2 + Math.sin(t * 2) * 0.05);
}
function banner(t) {
  const [x, y] = BANNER, wave = (i) => Math.round(Math.sin(t * 3 + i * 0.6) * 1.2);
  ctx.globalAlpha = 0.4; disc(x, y + 1, 5, '#0a0608'); ctx.globalAlpha = 1;
  rect(x, y - 26, 2, 27, '#5a3a28'); px(x, y - 27, '#d8a032');
  const col = { EASY: '#5ac85a', NORMAL: '#ff7a2a', HARD: '#d8323e', NIGHTMARE: '#9a4ae8' }[settings.diff] || '#ff7a2a';
  for (let i = 0; i < 11; i++) rect(x + 2 + i, y - 24 + wave(i), 1, 14 - (i > 7 ? (i - 7) * 2 : 0), i % 4 === 0 ? '#1a0e16' : col);
  textO(settings.diff, x + 2, y - 36, col, 1, 'c');
}
function dummy(t) {
  const [x, y] = DUMMY, wob = Math.round(Math.sin(t * 2) * 1);
  ctx.globalAlpha = 0.4; disc(x, y + 1, 5, '#0a0608'); ctx.globalAlpha = 1;
  rect(x, y - 14, 2, 15, '#6a4a30'); rect(x - 5, y - 11, 12, 2, '#6a4a30');
  rect(x - 2 + wob, y - 19, 6, 6, '#c8a870'); px(x - 1 + wob, y - 17, '#3a2a1a'); px(x + 2 + wob, y - 17, '#3a2a1a');
  rect(x - 2, y - 10, 6, 5, '#a88a58');
}
function tent(x, y, col) {
  ctx.globalAlpha = 0.4; disc(x, y + 2, 24, '#0a0608'); ctx.globalAlpha = 1;
  for (let i = 0; i < 18; i++) rect(x - i * 1.3, y - 18 + i, i * 2.6 + 1, 1, i < 2 ? '#8a6a5a' : col);
  rect(x - 1, y - 20, 2, 3, '#5a3a28');
  rect(x - 4, y - 8, 8, 8, '#120a0e'); rect(x - 4, y - 8, 1, 8, '#2a1a1e');
  glow(x, y - 4, '#ff9a4a', 8, 0.25);
}
function crate(x, y) { rect(x - 4, y - 7, 8, 7, '#6a4a30'); rect(x - 4, y - 7, 8, 1, '#8a6a48'); line(x - 4, y - 7, x + 3, y - 1, '#4a3020'); }
function cart(x, y) {
  rect(x - 12, y - 10, 22, 6, '#6a4a30'); rect(x - 12, y - 10, 22, 1, '#8a6a48');
  for (const wx of [x - 8, x + 6]) { ring(wx, y - 3, 3, 1, '#3a2a1e'); px(wx, y - 3, '#8a6a48'); }
  line(x + 10, y - 7, x + 18, y - 3, '#5a3a28');
  rect(x - 9, y - 14, 6, 4, '#a89878'); rect(x - 2, y - 13, 5, 3, '#8a3a2a');
}

function drawScene(t) {
  if (!GROUND) GROUND = paintGround();
  const cx = Math.round(camp.cam.x), cy = Math.round(camp.cam.y);
  rect(-SX, 0, FW, H, '#0a0608');
  ctx.save(); ctx.translate(-cx, -cy); ctx.drawImage(GROUND, 0, 0); ctx.restore();
  sky(t);
  ctx.save(); ctx.translate(-cx, -cy);
  pit(t);
  const items = [
    { y: STONE[1], d: () => stone(t) }, { y: BANNER[1], d: () => banner(t) }, { y: DUMMY[1], d: () => dummy(t) }, { y: FIRE[1], d: () => fire(t) },
    { y: CART[1], d: () => cart(CART[0], CART[1]) }, ...TENTS.map(([x, y, c]) => ({ y, d: () => tent(x, y, c) })),
    ...CRATES.map(([x, y]) => ({ y, d: () => crate(x, y) })), ...POSTS.map(([x, y]) => ({ y, d: () => lamp(x, y, t) })),
  ];
  for (const o of Object.values(camp.others)) if (!(camp.mode === 'walk' && o.id === camp.id)) items.push({ y: o.y, d: () => drawOther(o, t) });
  if (camp.mode === 'walk') items.push({ y: camp.y, d: () => drawMe(t) });
  items.sort((a, b) => a.y - b.y).forEach((i) => i.d());
  for (const p of camp.puffs) { ctx.globalAlpha = 1 - p.t / p.life; px(p.x, p.y, p.c); }
  ctx.globalAlpha = 1;
  // bubbles over heads go on top
  for (const o of Object.values(camp.others)) {
    if (camp.mode === 'walk' && o.id === camp.id) continue;
    if (o.say) sayBubble(o.say, Math.max(cx + 70, Math.min(cx + W - 70, o.x)), o.y - head() - 2, o.sayT);
    else if (o.emote) drawEmote(o.emote, o.x, o.y - head(), o.eT, Math.min(1, (2.2 - o.eT) * 3));
  }
  if (camp.mode === 'pick') drawPicker(t);
  ctx.restore();
  for (let i = 0; i < 30; i++) { const u = (t * (0.05 + hash(i) * 0.04) + hash(i + 7)) % 1; px(-SX + ((hash(i + 3) * FW + Math.sin(t + i) * 8 + u * 30) % FW), u * H, i % 3 ? '#5a5058' : '#8a8088'); }
}
function drawOther(o, t) {
  const lk = !isUnlocked(o.id);
  ctx.globalAlpha = 0.35; disc(o.x, o.y + 1, 5, '#0a0608'); ctx.globalAlpha = 1;
  if (lk) {
    // an ash statue: the fighter's shape in grey stone, flaking a little
    drawFighter(o.id, o.x, o.y + 1, S, { t: 0, frame: 0, flip: o.face < 0, bare: true });
    ctx.globalAlpha = 0.78; drawFighter(o.id, o.x, o.y + 1, S, { t: 0, frame: 0, flip: o.face < 0, tint: '#4e464e', bare: true }); ctx.globalAlpha = 1;
    for (let i = 0; i < 2; i++) { const u = (t * 0.4 + i / 2 + hash(o.x)) % 1; ctx.globalAlpha = 1 - u; px(o.x - 2 + i * 4, o.y - 8 - u * 8, '#7a7078'); }
    ctx.globalAlpha = 1;
    return;
  }
  drawFighter(o.id, o.x, o.y + 1, S, { t: t + hash(o.hx) * 3, flip: o.face < 0 });
  // a crown over one who has beaten the King, a violet one over one who has beaten Nox
  const h = best.chars[o.id];
  if (h?.won) { const c = h.nox ? '#b48cff' : '#ffd447', cy = o.y - head() - 1 + Math.round(Math.sin(t * 2 + o.hx)); px(o.x - 2, cy, c); px(o.x, cy - 1, c); px(o.x + 2, cy, c); rect(o.x - 2, cy + 1, 5, 1, c); }
  if (camp.mode === 'walk' && camp.near?.id === o.id) { const c = CHARS[o.id].color(); for (let i = 0; i < 3; i++) rect(o.x - i, o.y - head() - 6 + i + (Math.floor(t * 4) % 2), 1 + i * 2, 1, c); }
}
function drawMe(t) {
  ctx.globalAlpha = 0.35; disc(camp.x, camp.y + 1, 5, '#0a0608'); ctx.globalAlpha = 1;
  const c = CHARS[camp.id].color();
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU + t * 2; if (i % 2) px(camp.x + Math.cos(a) * 7, camp.y + 1 + Math.sin(a) * 2.5, c); }
  drawFighter(camp.id, camp.x, camp.y + 1, S, camp.moving > 0.3 ? { anim: 'run', t, fps: 13, flip: camp.face < 0 } : { t, flip: camp.face < 0 });
}
// choosing: a ring of light under the one pointed at, a pointer bobbing over them, their name
function drawPicker(t) {
  const id = ids()[camp.pick], o = camp.others[id], k = CHARS[id], lk = !isUnlocked(id), col = lk ? '#8a8088' : k.color();
  for (let i = 0; i < 20; i++) { const a = (i / 20) * TAU + t * 1.5; px(o.x + Math.cos(a) * 9, o.y + 1 + Math.sin(a) * 3, i % 2 ? col : P.paper); }
  glow(o.x, o.y - 6, col, 16, 0.3);
  const by = o.y - head() - 8 + (Math.floor(t * 4) % 2);
  for (let i = 0; i < 4; i++) rect(o.x - 3 + i, by + i, 7 - i * 2, 1, col);
  textO(lk && id === 'DEV' ? '???' : k.hero, o.x, by - 9, col, 1, 'c');
}

export function drawCamp(t) {
  if (camp.mode === 'card') {
    const id = camp.cardId, lk = !isUnlocked(id), k = CHARS[id], tap = input.touch;
    const prompts = lk ? [[tap ? 'TAP' : 'ESC', 'CHOOSE ANOTHER']] : camp.cardFrom === 'walk' && id === camp.id
      ? [[tap ? 'TAP' : 'ENTER', 'BACK TO THE CAMP'], [tap ? 'TAP' : 'ESC', 'CHOOSE ANOTHER']]
      : [[tap ? 'TAP' : 'ENTER', 'LOCK IN ' + k.hero], [tap ? 'TAP' : 'ESC', 'CHOOSE ANOTHER']];
    drawSelect(t, { bg: () => { drawScene(t); ctx.globalAlpha = 0.55; rect(-SX, 0, FW, H, '#05030a'); ctx.globalAlpha = 1; }, head: lk ? 'STILL ASH' : 'LOCKED IN', prompts });
    return;
  }
  drawScene(t);
  drawInfo(t);
}
function drawInfo(t) {
  const n = camp.mode === 'walk' ? camp.near : null, y = H - 22, touch = input.touch;
  ctx.globalAlpha = 0.8; rect(-SX, y - 2, FW, 24, '#0a0608'); ctx.globalAlpha = 1;
  rect(-SX, y - 2, FW, 1, '#3a2a2e');
  textO('THE LAST CAMP', touch ? 44 : 6, 4, '#ff9a5a', 1, 'l');
  if (touch) { rect(3, 2, 34, 11, P.ink0); rect(4, 3, 32, 9, P.ink2); text('< BACK', 7, 5, P.paper); }
  const use = touch ? 'TAP' : 'ENTER', pulse = Math.floor(t * 3) % 2 ? P.gold : P.paper;
  if (camp.mode === 'pick') {
    const id = ids()[camp.pick], k = CHARS[id], lk = !isUnlocked(id);
    textO('CHOOSE YOUR FIGHTER', 8, y + 2, P.gold, 1, 'l');
    text(lk ? 'AN ASH STATUE: ' + k.mission[0] : k.lore[0], 8 + textW('CHOOSE YOUR FIGHTER') + 6, y + 2, lk ? '#8a8088' : P.bone);
    text(touch ? 'TAP A FIGHTER TO SEE THEM' : 'ARROWS OR MOUSE PICK   ' + use + ' CHOOSE   ESC BACK', 8, y + 11, pulse);
    return;
  }
  if (!n) {
    const k = CHARS[camp.id];
    textO(k.hero, 8, y + 2, k.color(), 1, 'l'); text(k.lore[0], 8 + textW(k.hero) + 6, y + 2, P.bone);
    text(touch ? 'TAP TO WALK. TAP HERE FOR YOUR CARD. WALK INTO THE PIT TO BEGIN' : 'MOVE ' + ['up', 'left', 'down', 'right'].map(keyLabel).join('') + '   ' + use + ' USE   TAB YOUR CARD   ESC CHOOSE ANOTHER', 8, y + 11, '#8a7a80');
  } else if (n.kind === 'hero') {
    const k = CHARS[n.id], lk = !isUnlocked(n.id), nm = lk && n.id === 'DEV' ? '???' : k.hero;
    if (lk) { textO(nm, 8, y + 2, '#8a8088', 1, 'l'); text('AN ASH STATUE. TO WAKE: ' + k.mission[0] + '   ' + k.mission[1](), 8 + textW(nm) + 6, y + 2, P.gold); }
    else { textO(nm, 8, y + 2, k.color(), 1, 'l'); text(k.lore[0] + ' ' + k.lore[1], 8 + textW(nm) + 6, y + 2, P.bone); text(use + ': TALK', 8, y + 11, pulse); }
  } else if (n.kind === 'pit') {
    textO('THE DESCENT', 8, y + 2, '#ff9a5a', 1, 'l'); text('20 FLOORS DOWN TO THE ASHEN KING.   DIFFICULTY ' + settings.diff, 8 + textW('THE DESCENT') + 6, y + 2, P.bone);
    text(use + ': GO DOWN AS ' + CHARS[camp.id].hero, 8, y + 11, pulse);
  } else if (n.kind === 'codex') {
    textO('THE COMPENDIUM', 8, y + 2, P.gold, 1, 'l'); text('EVERY FIGHTER, FOE, BOSS AND ENDING YOU HAVE FOUND', 8 + textW('THE COMPENDIUM') + 6, y + 2, P.bone);
    text(use + ': READ IT', 8, y + 11, pulse);
  } else if (n.kind === 'diff') {
    const D = { EASY: 'FEWER, WEAKER MONSTERS', NORMAL: 'THE PIT AS IT IS', HARD: 'MORE MONSTERS. THEY HIT HARDER', NIGHTMARE: 'FOR THOSE WHO HAVE SEEN THE BOTTOM' };
    textO('WAR BANNER', 8, y + 2, P.blood, 1, 'l'); text('DIFFICULTY ' + settings.diff + ':  ' + (D[settings.diff] || ''), 8 + textW('WAR BANNER') + 6, y + 2, P.bone);
    text(use + ': CHANGE IT', 8, y + 11, pulse);
  } else if (n.kind === 'train') {
    textO('TRAINING DUMMY', 8, y + 2, '#c8a870', 1, 'l'); text('LEARN THE BASICS AGAIN, AS ' + CHARS[camp.id].hero, 8 + textW('TRAINING DUMMY') + 6, y + 2, P.bone);
    text(use + ': TRAIN', 8, y + 11, pulse);
  }
  if (camp.msgT > 0) textO(camp.msg, W / 2, y - 12, P.gold, 1, 'c');
}
