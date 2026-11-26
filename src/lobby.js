// The Last Camp: the lobby before a run, at the rim of the King's pit. It is wider than the screen and the camera
// moves over it. Its modes:
//   pick   the camera looks over the campfire where all eight fighters sit. Point at one (arrows, the mouse or a tap)
//          and choose it; locked ones are ash statues. Escape goes back to the title.
//   card   the chosen fighter's card: their high pixel portrait on the left, their numbers, powers and records on the
//          right. Enter locks them in and you walk the camp as them; Escape chooses another.
//   walk   you walk the camp as that fighter and use what you walk up to (Enter): talk to the others, read the
//          Compendium on the old stone, set the difficulty at the war standard, train at the dummy, take the day's
//          missions at the quest board, trade with the Smith (permanent upgrades, each fighter's own), the Peddler
//          (things for the camp) and the Weaver (the camp's whole look), and walk into the pit to begin. Tab shows
//          your card again, Escape goes back to choosing.
//   shop   a shopkeeper's (or the quest board's) screen over the camp (shop.js); Escape closes it.
// The camp wears the look the Weaver last wove (shop.js SKINS: its sky, sun, ground, fire and what drifts in the air)
// and shows the things bought from the Peddler where they stand (put one away at the Peddler's and it is gone). The
// ash statues, the fallen head of Aurel's great statue, the broken column and the bones are always there.
// Fighters are drawn at three quarters of their fight size while you choose, and at their fight size once one is
// locked in and you walk the camp, as you would in a fight.
import { ctx, W, H, FW, SX, P, rect, px, line, disc, ring, glow, text, textO, textW, makeCanvas } from './gfx.js?v=213';
import { A } from './audio.js?v=213';
import { input, keyHit, keyDown, actionHit } from './input.js?v=213';
import { keyLabel } from './bindings.js?v=213';
import { OPTIONS, settings, best, saveSettings, isUnlocked } from './store.js?v=213';
import { CHARS } from './chars.js?v=213';
import { drawFighter } from './title-scene.js?v=213';
import { drawEmote, sayBubble } from './emotes.js?v=213';
import { drawSelect, sel } from './ui.js?v=213';
import { loadPortraits } from './portraits.js?v=213';
import { DECOR, DRAW_DECOR, decorShown, drawLanternStrings, skinOf, openShop, updateShop, drawShop, drawGold } from './shop.js?v=213';
import { dailyList, dailyReady } from './daily.js?v=213';

const TAU = Math.PI * 2;
const OUT = '#140c14';
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
// the fighters' size: three quarters while you choose, then, once one is locked in, eased up to their size in a fight
const PICK_S = 0.75, WALK_S = 1;
let S = PICK_S;
const CW = 720, CH = 232;            // the camp, in game pixels
const FIRE = [360, 142], PIT = [360, 64], STONE = [212, 126], STANDARD = [540, 132], DUMMY = [236, 196], BOARD = [496, 108];
const FORGE = [40, 122], ANVIL = [81, 144], LOOM = [676, 140], CART = [556, 204];
const TENTS = [[150, 106, '#5a3a3a'], [612, 106, '#3a4a5a']], POSTS = [[296, 204], [424, 204]];
const CRATES = [[582, 198], [594, 204], [578, 206]];
const BOUNDS = { x0: 16, x1: CW - 16, y0: 84, y1: CH - 26 };
const DIFF_COL = { EASY: '#5ac85a', NORMAL: '#ff7a2a', HARD: '#d8323e', NIGHTMARE: '#9a4ae8' };
// the three who sell things: where they stand, which way they face their work, and what they say as you come up
const NPCS = {
  smith: { x: 92, y: 142, face: -1, name: 'THE SMITH', col: '#ff9a3c', shop: 'perk',
    lines: ['STEEL REMEMBERS. SO DO I.', 'BRING GOLD. I BRING STRENGTH.', 'THE PIT TOOK SOME OF YOU.', 'I CAN GIVE BACK WHAT IT TOOK.'] },
  peddler: { x: 528, y: 198, face: -1, name: 'THE PEDDLER', col: '#c8a060', shop: 'decor',
    lines: ['GOODS FOR GOLD. GOLD FOR GOODS.', 'FOUND IT ALL IN THE PIT.', 'NO REFUNDS. NO QUESTIONS.', 'DRESS A CAMP UP. CALL IT HOME.'] },
  weaver: { x: 654, y: 148, face: 1, name: 'THE WEAVER', col: '#c599ff', shop: 'skin',
    lines: ['I WEAVE THE SKY. THE GROUND TOO.', 'THE CAMP NEEDS NEW CLOTHES.', 'EVERY THREAD, A NIGHT SURVIVED.'] },
};
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
// a line to show when the camp opens next (what the road home paid)
let note = null;
export function campNote(s) { note = s; }
// o.walkAs: come back walking as that fighter (from training), o.at: 'dummy' to stand by the training dummy
export function openCamp(o = {}) {
  const list = OPTIONS.char;
  let id = settings.char;
  if (!isUnlocked(id)) id = 'BLADE';
  const others = {}, npc = {};
  list.forEach((o, i) => { const [x, y] = spot(i); others[o] = { id: o, x, y, hx: x, hy: y, face: x > FIRE[0] ? -1 : 1, emote: null, eT: 0, eNext: 2 + hash(i) * 5, say: null, sayT: 0, near: false, li: 0 }; });
  for (const k in NPCS) npc[k] = { say: null, sayT: 0, li: 0, near: false };
  S = PICK_S;
  Object.assign(camp, { t: 0, mode: 'pick', pick: list.indexOf(id), id, x: 0, y: 0, face: 1, moving: 0, tx: null, ty: null, pending: null, near: null, others, npc, puffs: [], sparks: [], msg: null, msgT: 0, cam: { x: FIRE[0] - W / 2, y: FIRE[1] - H / 2 - 6 }, cardFrom: 'pick', cardId: id });
  if (note) { camp.msg = note; camp.msgT = 4; note = null; }
  for (const k in NPCS) npcSheet(k);
  if (o.walkAs && isUnlocked(o.walkAs)) {
    camp.mode = 'walk'; camp.id = o.walkAs; camp.pick = list.indexOf(o.walkAs); S = WALK_S;
    if (o.at === 'dummy') { camp.x = DUMMY[0] + 14; camp.y = DUMMY[1] + 2; camp.face = -1; } else { const s = others[o.walkAs]; camp.x = s.hx + 8; camp.y = s.hy + 6; }
    camp.cam.x = Math.max(SX, Math.min(CW - W - SX, camp.x - W / 2)); camp.cam.y = Math.max(0, Math.min(CH - H, camp.y - 10 - H / 2));
    if (o.msg) { camp.msg = o.msg; camp.msgT = 2.5; }
  }
  loadPortraits();
}
const ids = () => OPTIONS.char;
const world = (sx, sy) => ({ x: sx + camp.cam.x, y: sy + camp.cam.y });
const dist = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) * 1.4);
const back = () => keyHit('Escape') || (input.touch && input.mouse.pressed && input.mouse.x < 46 && input.mouse.y < 18);
const shownDecor = () => DECOR.filter((d) => decorShown(d) && d.id !== 'lanterns');

// ---------- the modes ----------
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
const PEOPLE = new Set(['hero', 'smith', 'peddler', 'weaver']);
function usables() {
  const out = [];
  for (const o of Object.values(camp.others)) if (o.id !== camp.id) out.push({ kind: 'hero', id: o.id, x: o.x, y: o.y, r: 18 });
  for (const [k, n] of Object.entries(NPCS)) out.push({ kind: k, x: n.x, y: n.y, r: 20 });
  out.push({ kind: 'pit', x: PIT[0], y: PIT[1] + 20, r: 30 }, { kind: 'codex', x: STONE[0], y: STONE[1], r: 16 }, { kind: 'diff', x: STANDARD[0], y: STANDARD[1], r: 18 },
    { kind: 'train', x: DUMMY[0], y: DUMMY[1], r: 14 }, { kind: 'board', x: BOARD[0], y: BOARD[1], r: 18 });
  return out;
}
function use(u) {
  if (!u) return null;
  if (u.kind === 'pit') { A.select(); return { start: camp.id }; }
  if (u.kind === 'codex') { A.select(); return { codex: true }; }
  if (u.kind === 'train') { A.select(); return { train: camp.id }; }
  if (u.kind === 'diff') { A.ui(); const d = OPTIONS.diff, i = (d.indexOf(settings.diff) + 1) % d.length; return { diff: d[i] }; }
  if (u.kind === 'board') { openShop('board', camp.id); camp.mode = 'shop'; return null; }
  if (NPCS[u.kind]) { camp.npc[u.kind].say = null; openShop(NPCS[u.kind].shop, camp.id); camp.mode = 'shop'; return null; }
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
// everything you bump into: [x, y, radius]
function solids() {
  const out = [[FIRE[0], FIRE[1], 12], [STONE[0], STONE[1], 8], [STANDARD[0], STANDARD[1], 6], [BOARD[0], BOARD[1], 7], [DUMMY[0], DUMMY[1], 4],
    [FORGE[0], FORGE[1], 14], [ANVIL[0], ANVIL[1], 6], [LOOM[0], LOOM[1], 9], [CART[0], CART[1], 12],
    ...TENTS.map(([x, y]) => [x, y, 22]), ...CRATES.map(([x, y]) => [x, y, 6]), ...Object.values(NPCS).map((n) => [n.x, n.y, 5])];
  for (const d of shownDecor()) if (d.r) out.push([d.x, d.y, d.r]);
  return out;
}
function updateWalk(dt) {
  const c = camp;
  if (back()) { A.ui(); c.mode = 'pick'; c.pick = ids().indexOf(c.id); return null; }
  if (keyHit('Tab', 'KeyI') || (input.mouse.pressed && input.mouse.y > H - 24)) { openCard(c.id, 'walk'); return null; }
  let mx = (keyDown('KeyD', 'ArrowRight') ? 1 : 0) - (keyDown('KeyA', 'ArrowLeft') ? 1 : 0), my = (keyDown('KeyS', 'ArrowDown') ? 1 : 0) - (keyDown('KeyW', 'ArrowUp') ? 1 : 0);
  const all = usables();
  if (input.mouse.pressed) {
    const m = world(input.mouse.x, input.mouse.y + 4);
    const hit = all.find((u) => (PEOPLE.has(u.kind) ? Math.abs(u.x - m.x) < 12 && m.y > u.y - head() && m.y < u.y + 6 : Math.hypot(u.x - m.x, u.y - 8 - m.y) < 14) || (u.kind === 'pit' && Math.abs(m.x - PIT[0]) < 80 && Math.abs(m.y - PIT[1]) < 18));
    c.tx = hit ? hit.x + (PEOPLE.has(hit.kind) ? (c.x < hit.x ? -12 : 12) : 0) : m.x; c.ty = hit ? (hit.kind === 'pit' ? BOUNDS.y0 : hit.y + 4) : m.y;
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
  for (const [ox, oy, r] of solids()) {
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
  const want = c.mode === 'walk' || c.mode === 'shop' || (c.mode === 'card' && c.cardFrom === 'walk') ? WALK_S : PICK_S;
  S += (want - S) * Math.min(1, dt * 7); if (Math.abs(want - S) < 0.01) S = want;
  c.t += dt; c.msgT = Math.max(0, c.msgT - dt);
  let r = null;
  if (c.mode === 'pick') { if (back()) return { back: true }; r = updatePick(); }
  else if (c.mode === 'card') r = updateCard();
  else if (c.mode === 'shop') { if (updateShop(dt) === 'close') c.mode = 'walk'; }
  else r = updateWalk(dt);
  // the camera: over the fire while choosing (leaning toward the one pointed at), after you while walking
  const po = c.others[ids()[c.pick]];
  const fo = c.mode === 'walk' || c.mode === 'shop' ? { x: c.x, y: c.y - 10 } : { x: po.x * 0.35 + FIRE[0] * 0.65, y: FIRE[1] - 10 };
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
  // the shopkeepers greet you as you come up (once each time; not again as their screen closes)
  for (const [k, n] of Object.entries(NPCS)) {
    const st = c.npc[k];
    if (st.say) { st.sayT += dt; if (st.sayT > 2.8) st.say = null; }
    if (c.mode === 'pick') st.near = false;
    if (c.mode !== 'walk') continue;
    const close = Math.hypot(c.x - n.x, c.y - n.y) < 34;
    if (close && !st.near) { st.say = n.lines[st.li++ % n.lines.length]; st.sayT = 0; }
    st.near = close;
  }
  for (const p of c.puffs) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; }
  c.puffs = c.puffs.filter((p) => p.t < p.life);
  if (Math.random() < dt * 22) c.sparks.push({ x: FIRE[0] + (Math.random() - 0.5) * 8, y: FIRE[1] - 5, vx: (Math.random() - 0.5) * 8, vy: -16 - Math.random() * 24, t: 0, life: 1 + Math.random() * 1.4 });
  for (const s of c.sparks) { s.t += dt; s.x += (s.vx + Math.sin(c.t * 2 + s.life * 9) * 5) * dt; s.y += s.vy * dt; }
  c.sparks = c.sparks.filter((s) => s.t < s.life);
  return r;
}

// ---------- drawing ----------
let GROUND = null, groundSkin = null;
function paintGround(sk) {
  const cv = makeCanvas(CW, CH), g = cv.getContext('2d');
  const put = (x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
  const [g0, g1, g2, g3, g4] = sk.ground, gy = 58;
  g.fillStyle = g0; g.fillRect(0, gy, CW, CH - gy);
  for (let y = gy; y < CH; y++) for (let x = 0; x < CW; x++) { const r = hash(x * 3.1 + y * 17.7); if (r < 0.06) put(x, y, g1); else if (r > 0.985) put(x, y, g2); }
  // worn paths: from the tents to the fire, up to the pit, and out to the shopkeepers and the board
  const paths = [[150, 126, 360, 146], [612, 126, 360, 146], [360, 146, 360, 84], [92, 150, 290, 146], [528, 200, 420, 160], [654, 150, 430, 140], [496, 116, 420, 136], [236, 200, 330, 166]];
  for (let i = 0; i < 400; i++) { const k = i / 400; for (const [ax, ay, bx, by] of paths) { const x = ax + (bx - ax) * k + (hash(i + ax) - 0.5) * 10, y = ay + (by - ay) * k + (hash(i + ay) - 0.5) * 6; put(Math.round(x), Math.round(y), g4); } }
  for (let i = 0; i < 90; i++) { let x = hash(i) * CW, y = gy + 6 + hash(i + 9) * (CH - gy - 6); for (let j = 0; j < 8; j++) { put(Math.round(x), Math.round(y), g3); x += hash(i * 9 + j) * 3 - 1; y += hash(i * 7 + j) * 2 - 0.6; } }
  for (let i = 0; i < 64; i++) { const x = hash(i + 50) * CW, y = gy + 10 + hash(i + 80) * (CH - gy - 12); g.fillStyle = sk.stone[0]; g.fillRect(Math.round(x), Math.round(y), 2 + (i % 2), 1); put(Math.round(x), Math.round(y) - 1, sk.stone[1]); }
  for (let i = 0; i < 22; i++) { const x = hash(i + 130) * CW, y = gy + 20 + hash(i + 140) * (CH - gy - 24); g.fillStyle = sk.bone; g.fillRect(Math.round(x), Math.round(y), 3, 1); put(Math.round(x) - 1, Math.round(y) - 1, sk.bone); }
  // the cliff edges at the far left and right: the camp sits on a shelf over the dark
  for (let y = gy; y < CH; y++) { const e = 6 + Math.round(Math.sin(y * 0.3) * 2 + hash(y) * 2); g.fillStyle = '#0a0608'; g.fillRect(0, y, e, 1); g.fillRect(CW - e, y, e, 1); }
  return cv;
}
function sky(t, sk) {
  // drawn on the screen, sliding slower than the ground: far away
  const oy = -camp.cam.y;
  if (oy + 62 <= 0) return;
  const g = ctx.createLinearGradient(0, oy, 0, oy + 62);
  g.addColorStop(0, sk.sky[0]); g.addColorStop(0.6, sk.sky[1]); g.addColorStop(1, sk.sky[2]);
  ctx.fillStyle = g; ctx.fillRect(-SX, 0, FW, oy + 62);
  const span = FW + 40, ox = -camp.cam.x * 0.3;
  for (let i = 0; i < 60; i++) if ((Math.floor(t * 1.5 + i * 7) % 11) !== 0) px(-SX - 20 + (((hash(i) * span + ox) % span) + span) % span, oy + hash(i + 40) * 42, i % 5 ? '#4a3a52' : '#a89cb0');
  const sx = W / 2 + (FIRE[0] - W / 2 - camp.cam.x) * 0.4, sy = oy + 22;
  if (sk.sun === 'black') {
    // the King's black sun, its fire still burning round the rim
    glow(sx, sy, '#ff6a2a', 46, 0.28 + Math.sin(t * 1.3) * 0.04);
    for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU + t * 0.05, r = 16 + (i % 3) * 3 + Math.sin(t * 2 + i) * 1.5; line(sx + Math.cos(a) * 14, sy + Math.sin(a) * 14, sx + Math.cos(a) * r, sy + Math.sin(a) * r, i % 2 ? '#ff9a3c' : '#ffd447'); }
    disc(sx, sy, 13, '#05020a'); ring(sx, sy, 13, 1, '#ffb347');
  } else if (sk.sun === 'gold') {
    glow(sx, sy, sk.glow, 52, 0.4 + Math.sin(t * 1.3) * 0.05);
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU + t * 0.08, r = 17 + (i % 2) * 4; line(sx + Math.cos(a) * 13, sy + Math.sin(a) * 13, sx + Math.cos(a) * r, sy + Math.sin(a) * r, i % 2 ? sk.fire[1] : sk.fire[2]); }
    disc(sx, sy, 12, '#ffd447'); disc(sx - 2, sy - 2, 8, '#fff4b0');
  } else if (sk.sun === 'red') {
    glow(sx, sy, '#ff4a1c', 50, 0.35);
    disc(sx, sy, 13, '#ff4a1c'); disc(sx - 2, sy - 3, 9, '#ff7a3c');
    for (let i = 0; i < 4; i++) rect(sx - 14, sy + 2 + i * 3, 28, 1, sk.sky[1]);
  } else if (sk.sun === 'moon') {
    glow(sx, sy, '#c8c8ff', 34, 0.22);
    disc(sx, sy, 10, '#e8e4ff'); disc(sx + 4, sy - 3, 9, sk.sky[0]);
  } else {
    // no sun: a slow aurora in the camp's colors
    for (let b = 0; b < 3; b++) for (let x = -SX; x < W + SX; x += 2) { ctx.globalAlpha = 0.18; px(x, oy + 14 + b * 6 + Math.sin(x * 0.04 + t * 0.6 + b) * 4, b === 1 ? sk.fire[1] : sk.glow); }
    ctx.globalAlpha = 1;
  }
  // far crags and the ruined city on the horizon, a little nearer
  const ox2 = -camp.cam.x * 0.7;
  for (let x = -SX; x < W + SX; x++) { const wx = x - ox2, h = 8 + Math.round(Math.abs(Math.sin(wx * 0.07) * 7 + Math.sin(wx * 0.19) * 4)); rect(x, oy + 60 - h, 1, h, sk.crag); }
  for (let i = 0; i < 18; i++) { const x = Math.round(12 + i * 40 + (i % 2) * 8 + ox2), h = 6 + (i % 3) * 5; if (x < -SX - 6 || x > W + SX) continue; rect(x, oy + 54 - h, 4, h, sk.ground[3]); if (i % 2) px(x + 1, oy + 54 - h + 2, sk.glow); }
}
function oval(cx, cy, rx, ry, c) { const n = Math.ceil(rx * 4); for (let i = 0; i < n; i++) { const a = (i / n) * TAU; px(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, c); } }
function pit(t, sk) {
  const [cx, cy] = PIT;
  for (let r = 0; r < 4; r++) oval(cx, cy, 86 - r, 16 - r * 0.5, ['#3a2a2e', '#2e2024', '#221418', '#170c10'][r]);
  ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, 82, 14, 0, 0, TAU); ctx.clip();
  ctx.fillStyle = '#05020a'; ctx.fillRect(cx - 84, cy - 16, 168, 32);
  glow(cx, cy + 6, '#ff4a1a', 50, 0.32 + Math.sin(t * 1.7) * 0.06);
  for (let i = 0; i < 18; i++) { const u = (t * 0.25 + hash(i)) % 1; px(cx - 70 + hash(i + 3) * 140, cy + 9 - u * 18, u < 0.5 ? '#ff7a2a' : '#7a2a1a'); }
  ctx.restore();
  oval(cx, cy, 82, 14, '#5a4044');
  for (let i = 0; i < 6; i++) { const w = 20 - i * 2.4, y = cy + 12 - i * 2.4; rect(cx - w / 2, y, w, 2, i % 2 ? '#3a2a2e' : '#4a383c'); }
  for (const x of [cx - 60, cx + 60]) lamp(x, cy + 18, t, sk, 12);
  textO('THE DESCENT', cx, cy - 26, '#ff9a5a', 1, 'c');
}
function lamp(x, y, t, sk, h = 10) {
  rect(x - 1, y - h, 2, h, '#4a3428');
  const f = Math.sin(t * 14 + x) > 0 ? 1 : 0;
  rect(x - 1, y - h - 4 - f, 3, 4, sk.fire[0]); px(x, y - h - 5 - f, sk.fire[2]); glow(x, y - h - 2, sk.glow, 14, 0.45);
}
// a flat shadow on the ground, as wide as the thing and a third as deep
function shadow(x, y, r) {
  const ry = Math.max(2, Math.round(r * 0.32));
  ctx.globalAlpha = 0.4;
  for (let i = -ry; i <= ry; i++) { const w = Math.round(r * Math.sqrt(Math.max(0, 1 - (i / (ry + 0.5)) ** 2))); rect(x - w, y + 1 + i, w * 2 + 1, 1, '#0a0608'); }
  ctx.globalAlpha = 1;
}
// a speech bubble kept on the screen, or none for someone off it
function bubbleAt(s, x, y, t, cx) {
  if (x < cx - SX - 20 || x > cx + W + SX + 20) return;
  const hw = (s.length * 4 + 3) / 2 + 2;
  sayBubble(s, Math.max(cx - SX + hw, Math.min(cx + W + SX - hw, x)), y, t);
}
function fire(t, sk) {
  const [x, y] = FIRE;
  glow(x, y - 5, sk.glow, 60, 0.18 + Math.sin(t * 7) * 0.02 + Math.sin(t * 13) * 0.015);
  ctx.globalAlpha = 0.35; disc(x, y + 2, 13, '#3a1a10'); ctx.globalAlpha = 1;
  ring(x, y + 1, 7, 1, '#5a4a48');
  for (const [a, b] of [[-6, 5], [-5, -4]]) line(x + a, y + 2, x + b, y - 1, '#5a3420', 2);
  for (let i = 0; i < 7; i++) {
    const k = i / 6, fx = x - 4 + k * 8, h = 5 + Math.sin(t * 11 + i * 1.7) * 2 + (1 - Math.abs(k - 0.5) * 2) * 4;
    rect(fx, y - h, 2, h, i % 3 ? sk.fire[0] : sk.fire[1]); px(fx, y - h - 1, sk.fire[2]);
  }
  rect(x - 2, y - 3, 3, 2, '#fff0a0');
  for (const s of camp.sparks) { ctx.globalAlpha = 1 - s.t / s.life; px(s.x, s.y, s.t < 0.4 ? sk.fire[2] : sk.fire[0]); }
  ctx.globalAlpha = 1;
}
function stone(t) {
  const [x, y] = STONE;
  shadow(x, y, 7);
  rect(x - 6, y - 20, 12, 21, '#4a4250'); rect(x - 6, y - 20, 12, 2, '#6a6070'); rect(x + 4, y - 18, 2, 19, '#3a3240'); rect(x - 5, y - 22, 10, 2, '#4a4250');
  for (let i = 0; i < 4; i++) { const on = (Math.floor(t * 2) + i) % 4 !== 0; rect(x - 4, y - 16 + i * 4, 6 - (i % 2) * 2, 1, on ? '#ffd447' : '#8a6a2a'); }
  glow(x, y - 10, '#ffd447', 12, 0.2 + Math.sin(t * 2) * 0.05);
}
// the war standard, where the difficulty is set: a tall iron pole with a gilded spearhead, a long swallow-tailed
// banner of Aurel's crimson with the black sun sewn on it, and two braziers at its foot burning in the difficulty's color
function standard(t) {
  const [x, y] = STANDARD, col = DIFF_COL[settings.diff] || '#ff7a2a';
  shadow(x, y, 10);
  for (const bx of [x - 10, x + 10]) {
    line(bx - 2, y, bx, y - 4, '#3a3036'); line(bx + 2, y, bx, y - 4, '#3a3036');
    rect(bx - 3, y - 6, 7, 2, '#5a4a40'); rect(bx - 3, y - 6, 7, 1, '#7a6a5a');
    for (let i = 0; i < 4; i++) { const hh = 2 + Math.sin(t * 12 + i * 1.9 + bx) * 1.2 + (i === 1 || i === 2 ? 2 : 0); rect(bx - 2 + i, y - 6 - hh, 1, hh, i % 2 ? col : P.paper); }
    glow(bx, y - 9, col, 11, 0.45);
  }
  rect(x - 5, y - 3, 10, 3, '#3a3036'); rect(x - 5, y - 3, 10, 1, '#5a4e54');
  rect(x - 1, y - 46, 2, 43, '#2a2228'); rect(x - 1, y - 46, 1, 43, '#4a3e48');
  px(x, y - 53, '#fff4b0'); rect(x - 1, y - 52, 2, 2, '#ffd447'); rect(x - 2, y - 50, 4, 2, '#d8a032'); rect(x - 3, y - 48, 6, 1, '#8a6014');
  rect(x - 10, y - 45, 20, 2, '#3a2e34'); px(x - 10, y - 46, '#ffd447'); px(x + 9, y - 46, '#ffd447');
  const wave = (i) => Math.round(Math.sin(t * 2.6 + i * 0.45) * 1.4 * (i / 26));
  for (let i = 0; i < 26; i++) {
    const yy = y - 43 + i, dx = wave(i), c = i % 7 === 3 ? '#4a1018' : '#6a1622', cd = '#4a0e18';
    if (i >= 20) { const cut = i - 19; rect(x - 8 + dx, yy, 8 - cut, 1, c); rect(x + cut + dx, yy, 8 - cut, 1, cd); }
    else { rect(x - 8 + dx, yy, 8, 1, c); rect(x + dx, yy, 8, 1, cd); px(x - 8 + dx, yy, '#d8a032'); px(x + 7 + dx, yy, '#b8862a'); }
  }
  const sx = x + wave(11), sy = y - 32;
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + t * 0.4; px(sx + Math.round(Math.cos(a) * 6), sy + Math.round(Math.sin(a) * 6), col); }
  disc(sx, sy, 4, '#05020a'); ring(sx, sy, 4, 1, col);
  textO(settings.diff, x, y - 64, col, 1, 'c');
}
function dummy(t) {
  const [x, y] = DUMMY, wob = Math.round(Math.sin(t * 2) * 1);
  shadow(x, y, 5);
  rect(x, y - 14, 2, 15, '#6a4a30'); rect(x - 5, y - 11, 12, 2, '#6a4a30');
  rect(x - 2 + wob, y - 19, 6, 6, '#c8a870'); px(x - 1 + wob, y - 17, '#3a2a1a'); px(x + 2 + wob, y - 17, '#3a2a1a');
  rect(x - 2, y - 10, 6, 5, '#a88a58');
}
// the quest board: the day's three missions pinned on it (a gold one is done and waiting to be claimed, a grey one
// claimed), and a "!" over it while one waits
function board(t) {
  const [x, y] = BOARD, list = dailyList();
  shadow(x, y, 12);
  rect(x - 11, y - 24, 2, 24, '#4a3020'); rect(x + 9, y - 24, 2, 24, '#4a3020');
  rect(x - 13, y - 26, 26, 16, OUT); rect(x - 12, y - 25, 24, 14, '#7a5232');
  rect(x - 12, y - 21, 24, 1, '#5a3a22'); rect(x - 12, y - 16, 24, 1, '#5a3a22'); rect(x - 12, y - 25, 24, 1, '#9a6a42');
  rect(x - 15, y - 29, 30, 3, '#3a2418'); rect(x - 14, y - 30, 28, 1, '#5a3a28');
  list.forEach((m, i) => {
    const nx = x - 10 + i * 7, ny = y - 24 + (i % 2), ready = !m.claimed && m.got >= m.goal;
    rect(nx, ny, 6, 8, m.claimed ? '#6a6058' : ready ? '#fff0a0' : '#e8dcc0');
    rect(nx + 1, ny + 2, 4, 1, m.claimed ? '#4a4038' : '#8a7a60'); rect(nx + 1, ny + 4, 3, 1, m.claimed ? '#4a4038' : '#8a7a60');
    if (m.claimed) { px(nx + 1, ny + 6, '#7dff9a'); px(nx + 2, ny + 7, '#7dff9a'); px(nx + 3, ny + 6, '#7dff9a'); px(nx + 4, ny + 5, '#7dff9a'); }
    px(nx + 2, ny, '#c0302a');
    if (ready) glow(nx + 3, ny + 4, '#ffd447', 7, 0.4 + 0.2 * Math.sin(t * 5 + i));
  });
  if (dailyReady() > 0) { const by = y - 42 + Math.round(Math.sin(t * 4) * 2); glow(x, by + 4, '#ffd447', 9, 0.5); textO('!', x, by, P.gold, 2, 'c'); }
}
// the Smith's corner: a stone forge with its fire and chimney smoke, the anvil throwing sparks now and then
function forge(t) {
  const [x, y] = FORGE, fl = 0.5 + 0.5 * Math.sin(t * 9) * Math.sin(t * 3.7);
  shadow(x, y, 14);
  rect(x + 2, y - 36, 7, 14, OUT); rect(x + 3, y - 35, 5, 13, '#3a3240'); rect(x + 2, y - 37, 7, 2, '#5a5260');
  for (let i = 0; i < 4; i++) { const u = (t * 0.35 + i / 4) % 1; ctx.globalAlpha = (1 - u) * 0.5; disc(x + 5 + Math.sin(t + i * 2) * 2 + u * 6, y - 39 - u * 22, 1.5 + u * 2.5, '#6a6068'); }
  ctx.globalAlpha = 1;
  rect(x - 13, y - 23, 26, 23, OUT); rect(x - 12, y - 22, 24, 22, '#4a4250');
  for (let r = 0; r < 5; r++) for (let k = 0; k < 4; k++) { const bx = x - 12 + k * 6 + (r % 2) * 3, by = y - 22 + r * 4; rect(bx, by, 5, 3, (r + k) % 3 ? '#524a58' : '#423a48'); }
  rect(x - 7, y - 11, 14, 11, '#140806'); rect(x - 6, y - 12, 12, 1, '#140806');
  rect(x - 6, y - 6, 12, 6, '#ff7a2a'); rect(x - 5, y - 8, 10, 2, fl > 0.5 ? '#ffb347' : '#ff7a2a'); rect(x - 3, y - 4, 6, 3, '#ffd447');
  glow(x, y - 6, '#ff7a2a', 24, 0.35 + fl * 0.15);
}
function anvil(t) {
  const [x, y] = ANVIL, since = ((t - 0.84) % 2.8 + 2.8) % 2.8;
  shadow(x, y, 8);
  rect(x - 4, y - 3, 8, 3, '#2a2a32'); rect(x - 2, y - 6, 4, 3, '#3a3a44');
  rect(x - 6, y - 9, 12, 3, '#4a4a56'); rect(x - 6, y - 9, 12, 1, '#8a8a9a'); rect(x - 9, y - 8, 3, 1, '#4a4a56'); px(x - 10, y - 8, '#4a4a56');
  rect(x - 2, y - 10, 5, 1, since < 0.6 ? '#ffd447' : '#ff7a2a');
  // sparks off the struck metal
  if (since < 0.35) for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (hash(i + 3) - 0.5) * 2.4, v = 30 + hash(i) * 40; px(x + Math.cos(a) * v * since, y - 10 + Math.sin(a) * v * since + 60 * since * since, i % 2 ? '#ffd447' : '#fff0a0'); }
}
// the Weaver's loom, its warp glowing, the cloth on it striped in the camp's own colors, the shuttle flying
function loom(t, sk) {
  const [x, y] = LOOM;
  shadow(x, y, 11);
  rect(x - 10, y - 24, 2, 24, '#5a3a28'); rect(x + 8, y - 24, 2, 24, '#5a3a28');
  rect(x - 11, y - 25, 22, 2, '#7a5232'); rect(x - 11, y - 7, 22, 2, '#7a5232');
  for (let i = 0; i < 8; i++) rect(x - 7 + i * 2, y - 23, 1, 10, i % 2 ? '#8a6aa8' : '#b89ad8');
  const stripes = [sk.sky[1], sk.fire[0], sk.ground[2], sk.glow, sk.sky[2]];
  for (let i = 0; i < 5; i++) rect(x - 8, y - 13 + i * 1.2, 16, 1.2, stripes[i]);
  const sx = x - 7 + Math.abs(((t * 9) % 28) - 14);
  rect(sx - 1, y - 14, 3, 1, '#c599ff'); glow(sx, y - 14, '#c599ff', 6, 0.5);
}
function cart(t, x, y) {
  shadow(x, y, 13);
  rect(x - 13, y - 26, 1, 16, '#4a3020'); rect(x + 11, y - 26, 1, 16, '#4a3020');
  for (let i = 0; i < 8; i++) rect(x - 15 + i * 4, y - 28, 4, 3, i % 2 ? '#e8dcc0' : '#a83a3a');
  for (let i = 0; i < 8; i++) px(x - 14 + i * 4, y - 25, i % 2 ? '#a83a3a' : '#e8dcc0');
  rect(x - 12, y - 10, 22, 6, '#6a4a30'); rect(x - 12, y - 10, 22, 1, '#8a6a48');
  for (const wx of [x - 8, x + 6]) { ring(wx, y - 3, 3, 1, '#3a2a1e'); px(wx, y - 3, '#8a6a48'); }
  line(x + 10, y - 7, x + 18, y - 3, '#5a3a28');
  rect(x - 9, y - 14, 6, 4, '#a89878'); rect(x - 2, y - 13, 5, 3, '#8a3a2a'); rect(x + 4, y - 15, 4, 5, '#5a6a8a'); px(x + 5, y - 15, '#8a9ab8');
  const sw = Math.round(Math.sin(t * 2) * 1);
  line(x - 6, y - 25, x - 6 + sw, y - 21, '#5a4a3a'); rect(x - 7 + sw, y - 21, 3, 3, '#c8a060');
  line(x + 4, y - 25, x + 4 - sw, y - 22, '#5a4a3a'); disc(x + 4 - sw, y - 20, 1.5, '#8a8a9a');
}
function tent(x, y, col) {
  shadow(x, y + 1, 26);
  for (let i = 0; i < 18; i++) rect(x - i * 1.3, y - 18 + i, i * 2.6 + 1, 1, i < 2 ? '#8a6a5a' : col);
  rect(x - 1, y - 20, 2, 3, '#5a3a28');
  rect(x - 4, y - 8, 8, 8, '#120a0e'); rect(x - 4, y - 8, 1, 8, '#2a1a1e');
  glow(x, y - 4, '#ff9a4a', 8, 0.25);
}
function crate(x, y) { rect(x - 4, y - 7, 8, 7, '#6a4a30'); rect(x - 4, y - 7, 8, 1, '#8a6a48'); line(x - 4, y - 7, x + 3, y - 1, '#4a3020'); }

// ---------- the shopkeepers ----------
// The owner's pictures of them, re-pixelized at a size that keeps their faces and trims (art/sprites/npcs, made by
// tools/build_npcs.py): each a 16-frame idle loop (the head sinks on the breath, the Smith blinks and her ponytail
// streams, the Weaver's robe sways). They have far more pixels than a fighter, so one art pixel is one canvas pixel
// (a fighter's is two): the sheet is drawn at a third of its size in game pixels. EYES are the Weaver's glowing eyes,
// in a frame's own pixels.
const NPC_CYCLE = { smith: 2.4, peddler: 2.8, weaver: 3 };
const EYES = { weaver: [[18, 29], [25, 29]] };
const NPC_IMG = {};
function npcSheet(k) {
  let im = NPC_IMG[k];
  if (!im) { im = NPC_IMG[k] = new Image(); im.src = new URL(`../art/sprites/npcs/${k}.png?v=2`, import.meta.url).href; }
  return im.complete && im.naturalWidth ? im : null;
}
function drawNPC(k, n, t, f) {
  const im = npcSheet(k);
  if (!im) return;
  // each loops on its own beat (offset by where it stands), mirrored to face its work or you
  const fw = im.naturalWidth / 16, fh = im.naturalHeight, i = Math.floor((t / NPC_CYCLE[k] + (n.x % 7) / 7) * 16) % 16;
  const w = fw / 3, h = fh / 3, x0 = Math.round((n.x - w / 2) * 3) / 3, y0 = Math.round((n.y + 1 - h) * 3) / 3;
  ctx.save();
  if (f < 0) { ctx.translate(2 * x0 + w, 0); ctx.scale(-1, 1); }
  ctx.drawImage(im, i * fw, 0, fw, fh, x0, y0, w, h);
  ctx.restore();
  for (const [ex, ey] of EYES[k] || []) glow(x0 + ((f < 0 ? fw - 1 - ex : ex) + 0.5) / 3, y0 + (ey + 0.5) / 3, '#ffd447', 3, 0.3 + 0.15 * Math.sin(t * 2.2));
}

// what drifts through the air, by the camp's look
function air(t, sk) {
  const kind = sk.air;
  for (let i = 0; i < 34; i++) {
    const h0 = hash(i + 3), h1 = hash(i + 7), sp = 0.05 + hash(i) * 0.04;
    const u = (t * sp + h1) % 1, bx = -SX + ((h0 * FW) % FW);
    if (kind === 'snow') { const x = bx + Math.sin(t * 0.8 + i) * 10 + u * 20, y = u * H; px(((x + SX) % FW) - SX, y, i % 3 ? '#e8f0ff' : '#ffffff'); if (i % 4 === 0) px(((x + SX + 1) % FW) - SX, y, '#c8d8f0'); }
    else if (kind === 'petals') { const x = bx + u * 60 + Math.sin(t * 1.5 + i) * 6, y = u * H; rect(((x + SX) % FW) - SX, y, Math.sin(t * 4 + i) > 0 ? 2 : 1, 1, i % 2 ? '#ff9fc0' : '#ffd0e0'); }
    else if (kind === 'sparks') { const x = bx + Math.sin(t * 2 + i) * 6, y = H - u * H; ctx.globalAlpha = 1 - u; px(x, y, i % 2 ? '#ffb347' : '#ff7a2a'); ctx.globalAlpha = 1; }
    else if (kind === 'fireflies') { const x = bx + Math.sin(t * 0.7 + i) * 20, y = 40 + hash(i + 11) * (H - 60) + Math.cos(t * 0.9 + i * 1.3) * 12, a = 0.5 + 0.5 * Math.sin(t * 3 + i * 2); ctx.globalAlpha = a; px(x, y, i % 3 ? '#d8ff6a' : '#fff4a0'); ctx.globalAlpha = 1; if (a > 0.8) glow(x, y, '#d8ff6a', 4, 0.4); }
    else if (kind === 'stars') { const x = bx, y = hash(i + 21) * H, a = 0.5 + 0.5 * Math.sin(t * 2 + i * 3); ctx.globalAlpha = a; px(x, y, i % 4 ? '#c8b8f0' : '#ffffff'); ctx.globalAlpha = 1; }
    else if (kind === 'motes') { const x = bx + Math.sin(t * 0.9 + i) * 8, y = H - u * H; ctx.globalAlpha = Math.sin(u * Math.PI); px(x, y, i % 2 ? '#ffd447' : '#fff4b0'); ctx.globalAlpha = 1; }
    else if (kind === 'data') { const v = (t * (0.25 + hash(i) * 0.2) + h1) % 1, x = Math.round(bx / 4) * 4, y = v * (H + 10) - 5; rect(x, y, 1, 3, i % 3 ? '#62efff' : '#ff4fa8'); }
    else px(-SX + ((h0 * FW + Math.sin(t + i) * 8 + u * 30) % FW), u * H, i % 3 ? '#5a5058' : '#8a8088');
  }
}

function drawScene(t) {
  const sk = skinOf(best.skin);
  if (!GROUND || groundSkin !== sk.id) { GROUND = paintGround(sk); groundSkin = sk.id; }
  const cx = Math.round(camp.cam.x), cy = Math.round(camp.cam.y);
  rect(-SX, 0, FW, H, '#0a0608');
  ctx.save(); ctx.translate(-cx, -cy); ctx.drawImage(GROUND, 0, 0); ctx.restore();
  sky(t, sk);
  ctx.save(); ctx.translate(-cx, -cy);
  pit(t, sk);
  const items = [
    { y: STONE[1], d: () => stone(t) }, { y: STANDARD[1], d: () => standard(t) }, { y: DUMMY[1], d: () => dummy(t) }, { y: FIRE[1], d: () => fire(t, sk) },
    { y: BOARD[1], d: () => board(t) }, { y: FORGE[1], d: () => forge(t) }, { y: ANVIL[1], d: () => anvil(t) }, { y: LOOM[1], d: () => loom(t, sk) },
    { y: CART[1], d: () => cart(t, CART[0], CART[1]) }, ...TENTS.map(([x, y, c]) => ({ y, d: () => tent(x, y, c) })),
    ...CRATES.map(([x, y]) => ({ y, d: () => crate(x, y) })), ...POSTS.map(([x, y]) => ({ y, d: () => lamp(x, y, t, sk) })),
  ];
  for (const [k, n] of Object.entries(NPCS)) {
    // the Smith and the Weaver keep at their work; the Peddler turns to a customer
    const st = camp.npc[k], f = k === 'peddler' && st.near ? (camp.x < n.x ? -1 : 1) : n.face;
    items.push({ y: n.y, d: () => { shadow(n.x, n.y, 6); drawNPC(k, n, t, f); } });
  }
  for (const d of shownDecor()) {
    items.push({ y: d.y, d: () => DRAW_DECOR[d.id]?.(d.x, d.y, t, sk) });
    if (d.x2) items.push({ y: d.y, d: () => DRAW_DECOR[d.id]?.(d.x2, d.y, t, sk) });
  }
  for (const o of Object.values(camp.others)) if (!(camp.mode === 'walk' && o.id === camp.id)) items.push({ y: o.y, d: () => drawOther(o, t) });
  if (camp.mode === 'walk' || camp.mode === 'shop') items.push({ y: camp.y, d: () => drawMe(t) });
  items.sort((a, b) => a.y - b.y).forEach((i) => i.d());
  if (decorShown(DECOR.find((d) => d.id === 'lanterns'))) drawLanternStrings([[TENTS[0][0], TENTS[0][1] - 20], [PIT[0] - 60, PIT[1] + 2], [PIT[0] + 60, PIT[1] + 2], [TENTS[1][0], TENTS[1][1] - 20]], t);
  for (const p of camp.puffs) { ctx.globalAlpha = 1 - p.t / p.life; px(p.x, p.y, p.c); }
  ctx.globalAlpha = 1;
  // bubbles over heads go on top
  for (const o of Object.values(camp.others)) {
    if (camp.mode === 'walk' && o.id === camp.id) continue;
    if (o.say) bubbleAt(o.say, o.x, o.y - head() - 2, o.sayT, cx);
    else if (o.emote) drawEmote(o.emote, o.x, o.y - head(), o.eT, Math.min(1, (2.2 - o.eT) * 3));
  }
  for (const [k, n] of Object.entries(NPCS)) {
    const st = camp.npc[k];
    if (st.say && camp.mode === 'walk') bubbleAt(st.say, n.x, n.y - 32, st.sayT, cx);
    else if (camp.mode === 'walk' && camp.near?.kind === k) { for (let i = 0; i < 3; i++) rect(n.x - i, n.y - 36 + i + (Math.floor(t * 4) % 2), 1 + i * 2, 1, n.col); }
  }
  if (camp.mode === 'pick') drawPicker(t);
  ctx.restore();
  air(t, sk);
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
  if (camp.mode === 'shop') { drawShop(t, () => drawScene(t)); return; }
  drawScene(t);
  drawInfo(t);
}
function drawInfo(t) {
  const n = camp.mode === 'walk' ? camp.near : null, y = H - 22, touch = input.touch;
  ctx.globalAlpha = 0.8; rect(-SX, y - 2, FW, 24, '#0a0608'); ctx.globalAlpha = 1;
  rect(-SX, y - 2, FW, 1, '#3a2a2e');
  textO('THE LAST CAMP', touch ? 44 : 6, 4, '#ff9a5a', 1, 'l');
  if (touch) { rect(3, 2, 34, 11, P.ink0); rect(4, 3, 32, 9, P.ink2); text('< BACK', 7, 5, P.paper); }
  // your gold, against the right edge
  ctx.save(); ctx.translate(SX, 0); drawGold(W - 6, 4); ctx.restore();
  const use = touch ? 'TAP' : 'ENTER', pulse = Math.floor(t * 3) % 2 ? P.gold : P.paper;
  const say = (name, col, line1, line2) => { textO(name, 8, y + 2, col, 1, 'l'); text(line1, 8 + textW(name) + 6, y + 2, P.bone); if (line2) text(line2, 8, y + 11, pulse); };
  if (camp.mode === 'pick') {
    const id = ids()[camp.pick], k = CHARS[id], lk = !isUnlocked(id);
    textO('CHOOSE YOUR FIGHTER', 8, y + 2, P.gold, 1, 'l');
    text(lk ? 'AN ASH STATUE: ' + k.mission[0] : k.lore[0], 8 + textW('CHOOSE YOUR FIGHTER') + 6, y + 2, lk ? '#8a8088' : P.bone);
    text(touch ? 'TAP A FIGHTER TO SEE THEM' : 'ARROWS OR MOUSE PICK   ' + use + ' CHOOSE   ESC BACK', 8, y + 11, pulse);
  } else if (!n) {
    const k = CHARS[camp.id];
    textO(k.hero, 8, y + 2, k.color(), 1, 'l'); text(k.lore[0], 8 + textW(k.hero) + 6, y + 2, P.bone);
    text(touch ? 'TAP TO WALK. TAP HERE FOR YOUR CARD. WALK INTO THE PIT TO BEGIN' : 'MOVE ' + ['up', 'left', 'down', 'right'].map(keyLabel).join('') + '   ' + use + ' USE   TAB YOUR CARD   ESC CHOOSE ANOTHER', 8, y + 11, '#8a7a80');
  } else if (n.kind === 'hero') {
    const k = CHARS[n.id], lk = !isUnlocked(n.id), nm = lk && n.id === 'DEV' ? '???' : k.hero;
    if (lk) { textO(nm, 8, y + 2, '#8a8088', 1, 'l'); text('AN ASH STATUE. TO WAKE: ' + k.mission[0] + '   ' + k.mission[1](), 8 + textW(nm) + 6, y + 2, P.gold); }
    else say(nm, k.color(), k.lore[0] + ' ' + k.lore[1], use + ': TALK');
  } else if (n.kind === 'pit') say('THE DESCENT', '#ff9a5a', '20 FLOORS DOWN TO THE ASHEN KING.   DIFFICULTY ' + settings.diff, use + ': GO DOWN AS ' + CHARS[camp.id].hero);
  else if (n.kind === 'codex') say('THE COMPENDIUM', P.gold, 'EVERY FIGHTER, FOE, BOSS AND ENDING YOU HAVE FOUND', use + ': READ IT');
  else if (n.kind === 'diff') {
    const D = { EASY: 'FEWER, WEAKER MONSTERS. THE PIT PAYS HALF', NORMAL: 'THE PIT AS IT IS', HARD: 'MORE MONSTERS, HITTING HARDER. IT PAYS HALF AGAIN', NIGHTMARE: 'FOR THOSE WHO HAVE SEEN THE BOTTOM. IT PAYS DOUBLE' };
    say('WAR STANDARD', DIFF_COL[settings.diff] || P.blood, 'DIFFICULTY ' + settings.diff + ':  ' + (D[settings.diff] || ''), use + ': CHANGE IT');
  } else if (n.kind === 'train') say('TRAINING DUMMY', '#c8a870', 'LEARN THE BASICS AGAIN, AS ' + CHARS[camp.id].hero, use + ': TRAIN');
  else if (n.kind === 'board') { const r = dailyReady(); say('QUEST BOARD', P.gold, r ? r + (r > 1 ? ' MISSIONS DONE. CLAIM YOUR GOLD' : ' MISSION DONE. CLAIM YOUR GOLD') : "TODAY'S THREE MISSIONS. NEW ONES EVERY DAY", use + ': READ IT'); }
  else if (NPCS[n.kind]) {
    const N = NPCS[n.kind], what = { perk: 'PERMANENT UPGRADES FOR ' + CHARS[camp.id].hero, decor: 'THINGS FOR THE CAMP', skin: 'A NEW LOOK FOR THE WHOLE CAMP' }[N.shop];
    say(N.name, N.col, what, use + ': TRADE');
  }
  if (camp.msgT > 0) textO(camp.msg, W / 2, y - 12, P.gold, 1, 'c');
}
