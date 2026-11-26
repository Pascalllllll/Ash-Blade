// The camp's shops and the gold they take. Gold is rare: a lootling sometimes drops a coin, now and then any monster
// does, every boss drops a little (the King and Nox more), going deeper and holding the endless night pay a coin, and
// the quest board's daily missions pay a few (daily.js). It is kept in best.gold (store.js) and spent here:
//   the Peddler   DECOR: things for the camp (they stand in their own places; put one away and set it out again free)
//   the Weaver    SKINS: the camp's whole look (sky, ground, fire, what drifts through the air)
//   the Smith     PERKS: permanent upgrades, each fighter's own. Every fighter starts weaker than before (NERF) and
//                 the Smith's work makes them stronger than they ever were.
// Prices are high on purpose. The shop's screen (openShop, updateShop, drawShop) is shown over the camp by lobby.js.
import { ctx, W, H, FW, SX, P, rect, px, disc, ring, glow, text, textO, textW } from './gfx.js?v=216';
import { A } from './audio.js?v=216';
import { input, keyHit } from './input.js?v=216';
import { best, saveBest } from './store.js?v=216';
import { CHARS } from './chars.js?v=216';
import { drawFighter } from './title-scene.js?v=216';
import { dailyList, dailyClaim, dailyDay } from './daily.js?v=216';
import { DRAW_DECOR, drawLanternStrings } from './decor-art.js?v=216';

export { DRAW_DECOR, drawLanternStrings };

const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// ---------- permanent upgrades and the nerf they make up for ----------
export const NERF = { wpn: 0.85, energy: 0.85, ult: 0.88 };
export const PERKS = [
  { id: 'vit', name: 'VITALITY', what: '+1 HEART', max: 3, cost: [25, 55, 110] },
  { id: 'might', name: 'MIGHT', what: '+8% WEAPON DAMAGE', max: 3, cost: [30, 65, 130] },
  { id: 'spirit', name: 'SPIRIT', what: '+12% ENERGY GAINED', max: 3, cost: [20, 45, 90] },
  { id: 'fury', name: 'FURY', what: '+12% ULTIMATE CHARGE', max: 3, cost: [25, 55, 110] },
  { id: 'stride', name: 'STRIDE', what: 'DASH 10% SOONER, +4% SPEED', max: 2, cost: [35, 80] },
];
export const permLevel = (hero, id) => best.perm[hero]?.[id] || 0;
// what a fighter's upgrades (and the nerf) come to, for world.js: hearts added, and multipliers
export function perkFactors(hero) {
  const l = (id) => permLevel(hero, id);
  return {
    hp: l('vit'), wpn: NERF.wpn * (1 + 0.08 * l('might')), energy: NERF.energy * (1 + 0.12 * l('spirit')),
    ult: NERF.ult * (1 + 0.12 * l('fury')), dash: 1 - 0.1 * l('stride'), speed: 1 + 0.04 * l('stride'),
  };
}

// ---------- decorations ----------
// free ones are always there; bought ones stand at their place (x, y on the camp) unless put away (best.hidden)
export const DECOR = [
  { id: 'statue1', free: true, name: 'ASH STATUE', x: 258, y: 98, r: 6 },
  { id: 'statue2', free: true, name: 'ASH STATUE', x: 462, y: 98, r: 6 },
  { id: 'statue3', free: true, name: 'ASH STATUE', x: 196, y: 170, r: 6 },
  { id: 'head', free: true, name: 'FALLEN HEAD', x: 500, y: 178, r: 11 },
  { id: 'column', free: true, name: 'BROKEN COLUMN', x: 146, y: 158, r: 6 },
  { id: 'bones', free: true, name: 'BONES', x: 320, y: 198, r: 0 },
  { id: 'stew', name: 'STEW POT', price: 30, x: 268, y: 202, r: 6, h: 32, d: ["VEGA'S STEW. DON'T ASK WHAT'S IN IT.", 'IT IS ALWAYS HOT.'] },
  { id: 'meadow', name: 'FLOWER PATCH', price: 30, x: 452, y: 198, r: 0, h: 14, d: ['UNIT-7 PLANTED IT. NEW ORDER:', 'KEEP IT SAFE.'] },
  { id: 'rack', name: 'WEAPON RACK', price: 35, x: 24, y: 170, r: 7, h: 40, d: ['SWORDS AND SPEARS THE FALLEN LEFT', 'AT THE RIM. NONE OF THEM RUSTED.'] },
  { id: 'shrooms', name: 'GLOW MUSHROOMS', price: 35, x: 124, y: 164, r: 0, h: 26, d: ['THEY GROW IN THE DARK AND GLOW.', 'THE DEEPER THE PIT, THE BRIGHTER.'] },
  { id: 'terminal', name: 'OLD TERMINAL', price: 40, x: 700, y: 204, r: 6, h: 27, d: ["THE DEV'S. IT IS STILL COMPILING", 'SOMETHING.'] },
  { id: 'cat', name: 'THE CAMP CAT', price: 40, x: 402, y: 186, r: 0, h: 20, d: ['IT CAME UP OUT OF THE PIT ONE NIGHT.', 'NOBODY OWNS IT. IT OWNS THE FIRE.'] },
  { id: 'tavern', name: 'TAVERN CORNER', price: 45, x: 630, y: 200, r: 8, h: 32, ox: -7, d: ["BARRELS FROM VEGA'S FAVORITE TAVERN.", 'THE TAB IS HUGE.'] },
  { id: 'raven', name: "RAVEN'S PERCH", price: 45, x: 68, y: 110, r: 3, h: 36, d: ['IT WATCHES THE PIT ALL NIGHT.', 'IT HAS NEVER SAID WHAT IT SAW.'] },
  { id: 'lanterns', name: 'LANTERN STRINGS', price: 50, x: 0, y: 0, r: 0, d: ['PAPER LANTERNS ACROSS THE CAMP.', 'THEY NEVER GO OUT.'] },
  { id: 'telescope', name: 'STAR TELESCOPE', price: 55, x: 470, y: 152, r: 6, h: 26, d: ['MORROW STILL WATCHES FOR THE STARS', 'TO COME BACK.'] },
  { id: 'cherry', name: 'CHERRY TREE', price: 60, x: 100, y: 100, r: 6, h: 41, d: ["A CUTTING FROM THE TREE AT RIN'S SHRINE.", 'IT BLOOMS HERE TOO.'] },
  { id: 'bench', name: 'WORKBENCH', price: 60, x: 690, y: 176, r: 8, h: 26, d: ["RIVET'S. HALF THE CAMP'S BOLTS", 'WERE MADE ON IT.'] },
  { id: 'well', name: 'WISHING WELL', price: 65, x: 596, y: 168, r: 9, h: 36, d: ['THROW A COIN IN. NOTHING COMES BACK.', 'THE PIT HEARS YOU ANYWAY.'] },
  { id: 'windmill', name: 'LITTLE WINDMILL', price: 70, x: 690, y: 104, r: 7, h: 44, d: ["RIVET'S. SHE SAYS IT RUNS ON NOTHING.", 'IT RUNS ON SPITE.'] },
  { id: 'wartable', name: 'WAR TABLE', price: 70, x: 252, y: 152, r: 9, h: 22, d: ['A MAP OF THE PIT, FLOOR BY FLOOR.', 'KAEL MARKS EVERY FLOOR HE CLEARS.'] },
  { id: 'torii', name: 'SHRINE GATE', price: 75, x: 360, y: 100, r: 0, h: 34, d: ['A RED GATE LIKE THE ONE AT THE', 'RED ONI SHRINE.'] },
  { id: 'tomb', name: "THE KING'S TOMB", price: 80, x: 176, y: 204, r: 8, h: 26, d: ['GROM CARVED IT HIMSELF.', 'AUREL, WHO WAS GOOD ONCE.'] },
  { id: 'koi', name: 'KOI POND', price: 85, x: 118, y: 194, r: 12, h: 14, d: ['THE FISH SWAM UP OUT OF THE PIT.', 'THEY GLOW A LITTLE. NOBODY MINDS.'] },
  { id: 'banners', name: 'SUN BANNERS', price: 90, x: 322, y: 96, x2: 398, r: 0, h: 40, ox: -7, d: ["TWO OF AUREL'S OLD BANNERS, THE SUN", 'STITCHED IN GOLD. FROM BEFORE.'] },
  { id: 'armor', name: "GROM'S OLD ARMOR", price: 95, x: 232, y: 106, r: 6, h: 45, d: ["HIS ARMOR FROM THE KING'S GUARD.", "HE WON'T WEAR IT. HE WON'T SELL IT."] },
  { id: 'fountain', name: 'EMBER FOUNTAIN', price: 120, x: 360, y: 204, r: 9, h: 32, d: ['IT POURS LIGHT, NOT WATER.', 'NOBODY KNOWS WHERE IT COMES FROM.'] },
  { id: 'starstone', name: 'STARSTONE', price: 130, x: 568, y: 104, r: 4, h: 30, d: ['A PIECE OF A STAR THAT FELL.', 'MORROW SAYS IT HUMS. IT DOES.'] },
  { id: 'throne', name: 'EMPTY THRONE', price: 200, x: 52, y: 204, r: 9, h: 46, d: ["A COPY OF AUREL'S THRONE.", 'NOBODY SITS IN IT. NOBODY EVER WILL.'] },
];
export const decorShown = (it) => (it.free || best.owned.includes(it.id)) && !best.hidden.includes(it.id);

// ---------- the camp's looks ----------
// sky: three bands, top to bottom; ground: base, specks, a lighter speck, cracks, paths; stone, bone; fire: three
// flames; sun: 'black', 'gold', 'moon', 'red' or 'none'; air: what drifts ('ash', 'petals', 'snow', 'sparks',
// 'fireflies', 'stars', 'motes', 'data')
export const SKINS = [
  { id: 'ash', name: 'ASHEN CAMP', price: 0, sky: ['#07040a', '#1c0c16', '#3a1418'], ground: ['#231a20', '#2d2229', '#3a2c33', '#170f14', '#2e2428'], stone: ['#4a3c40', '#5e4e52'], bone: '#c8bca4', fire: ['#ff7a2a', '#ffb347', '#ffd447'], glow: '#ff8a2a', sun: 'black', air: 'ash', crag: '#150a10' },
  { id: 'blossom', name: 'CHERRY BLOSSOM', price: 120, sky: ['#1a0e24', '#5a2a4a', '#b8607a'], ground: ['#3a2630', '#46303a', '#6a4250', '#24161e', '#4a3440'], stone: ['#6a5058', '#8a6a74'], bone: '#ffd0e0', fire: ['#ff6a8a', '#ff9fc0', '#ffe0ec'], glow: '#ff8aa8', sun: 'moon', air: 'petals', crag: '#24101e' },
  { id: 'frost', name: 'FROZEN HOLLOW', price: 100, sky: ['#040814', '#10244a', '#2a4a7a'], ground: ['#1a2638', '#223248', '#3a5272', '#0e1624', '#2a3c56'], stone: ['#5a7090', '#8aa8c8'], bone: '#e0f0ff', fire: ['#3fa9ff', '#9fe0ff', '#ffffff'], glow: '#62b8ff', sun: 'moon', air: 'snow', crag: '#0a1426' },
  { id: 'forge', name: 'EMBER FORGE', price: 100, sky: ['#0e0404', '#3a0e08', '#7a2410'], ground: ['#2a1810', '#3a2014', '#5a3018', '#140a06', '#3a2416'], stone: ['#5a4034', '#7a5848'], bone: '#ffd0a0', fire: ['#ff4a1c', '#ff9a3c', '#ffe08a'], glow: '#ff5a1c', sun: 'red', air: 'sparks', crag: '#1e0804' },
  { id: 'shrine', name: 'OVERGROWN SHRINE', price: 90, sky: ['#04100a', '#0e2a1a', '#2a5a3a'], ground: ['#1a2a1c', '#223624', '#3a5a34', '#0e180e', '#2a3a26'], stone: ['#4a5a48', '#6a7e64'], bone: '#d8e8c0', fire: ['#ffcf5a', '#fff0a8', '#ffffff'], glow: '#ffcf5a', sun: 'moon', air: 'fireflies', crag: '#081a0e' },
  { id: 'garden', name: 'NIGHT GARDEN', price: 140, sky: ['#02040e', '#0a1430', '#1a2a5a'], ground: ['#141a2a', '#1c2436', '#2c3a5a', '#0a0e18', '#222c44'], stone: ['#4a5470', '#6a7698'], bone: '#d0d8ff', fire: ['#8a7aff', '#c8b8ff', '#ffffff'], glow: '#8a7aff', sun: 'moon', air: 'fireflies', crag: '#060a1a' },
  { id: 'temple', name: 'SUN TEMPLE', price: 150, sky: ['#2a1806', '#7a4a14', '#d8a040'], ground: ['#5a4428', '#6a5030', '#8a6a3a', '#3a2a16', '#7a5c34'], stone: ['#a08050', '#c8a068'], bone: '#fff0c8', fire: ['#ffb02a', '#ffd447', '#fff2c0'], glow: '#ffd447', sun: 'gold', air: 'motes', crag: '#3a240a' },
  { id: 'neon', name: 'NEON GRID', price: 160, sky: ['#05020e', '#1a0a3a', '#4a1a6a'], ground: ['#0e0a1e', '#160e2c', '#2a1a4a', '#06040e', '#1e143a'], stone: ['#3a2a6a', '#5a4a9a'], bone: '#62efff', fire: ['#ff4fa8', '#62efff', '#ffffff'], glow: '#ff4fa8', sun: 'none', air: 'data', crag: '#120630' },
  { id: 'void', name: 'THE VOID', price: 180, sky: ['#000000', '#05020c', '#120a24'], ground: ['#07050c', '#0c0914', '#1a1428', '#030206', '#100c1c'], stone: ['#2a2240', '#3a3058'], bone: '#c8b8f0', fire: ['#9a5aff', '#c49aff', '#ffffff'], glow: '#9a5aff', sun: 'none', air: 'stars', crag: '#04020a' },
  { id: 'dawn', name: 'GOLDEN DAWN', price: 250, sky: ['#3a2a5a', '#c86a5a', '#ffc070'], ground: ['#4a3a30', '#56443a', '#7a604a', '#2e2420', '#5e4a3c'], stone: ['#8a7060', '#aa8a74'], bone: '#fff4d8', fire: ['#ffb347', '#ffd447', '#fff6c0'], glow: '#ffc070', sun: 'gold', air: 'motes', crag: '#2a1a2a' },
];
export const skinOf = (id) => SKINS.find((s) => s.id === id) || SKINS[0];
export const skinOwned = (id) => id === 'ash' || best.owned.includes(id);

// ---------- buying ----------
function spend(n) { if (best.gold < n) return false; best.gold -= n; return true; }
function buy(id, price) {
  if (!spend(price)) { A.deny(); say('NOT ENOUGH GOLD'); return false; }
  best.owned.push(id); saveBest(); A.select(); A.coin(); say('BOUGHT');
  return true;
}

// ---------- the shop's screen ----------
// top: the first row in sight (the Peddler's list is longer than the screen); arm: how long a pressed reset waits
// for its second press
export const shop = { kind: null, sel: 0, top: 0, arm: 0, t: 0, msg: '', msgT: 0, hero: 'BLADE', from: 'camp' };
function say(s) { shop.msg = s; shop.msgT = 1.6; }
const NPC = {
  decor: { who: 'THE PEDDLER', what: 'THINGS FOR THE CAMP', col: '#c8a060' },
  skin: { who: 'THE WEAVER', what: 'A NEW LOOK FOR THE CAMP', col: '#c599ff' },
  perk: { who: 'THE SMITH', what: 'PERMANENT UPGRADES', col: '#ff9a3c' },
  board: { who: 'THE QUEST BOARD', what: "TODAY'S MISSIONS", col: '#ffd447' },
};
function rows() {
  if (shop.kind === 'decor') return DECOR.filter((d) => !d.free);
  if (shop.kind === 'skin') return SKINS;
  if (shop.kind === 'perk') return PERKS;
  return dailyList();
}
export function openShop(kind, hero) { Object.assign(shop, { kind, sel: 0, top: 0, arm: 0, t: 0, msg: '', msgT: 0, hero: hero || shop.hero }); A.ui(); }

// each shopkeeper's reset (the quest board has none): the Smith takes this fighter's upgrades back and pays back all
// they cost, the Peddler puts every decoration away (still yours, set any out again for free), the Weaver weaves the
// camp back into its first look. Press it twice: the first press only asks.
function resetOf() {
  if (shop.kind === 'perk') {
    const lv = best.perm[shop.hero] || {};
    let gold = 0;
    for (const pk of PERKS) for (let i = 0; i < Math.min(pk.max, lv[pk.id] || 0); i++) gold += pk.cost[i];
    return { can: gold > 0, label: 'RESET UPGRADES', sure: 'PRESS AGAIN: ' + gold + ' GOLD BACK', none: 'NO UPGRADES TO RESET', gold };
  }
  if (shop.kind === 'decor') {
    const out = DECOR.filter((d) => !d.free && best.owned.includes(d.id) && !best.hidden.includes(d.id));
    return { can: out.length > 0, label: 'PUT EVERYTHING AWAY', sure: 'PRESS AGAIN: PUT ' + out.length + ' AWAY', none: 'NOTHING IS OUT', out };
  }
  if (shop.kind === 'skin') return { can: best.skin !== 'ash', label: 'BACK TO THE ASHEN CAMP', sure: 'PRESS AGAIN TO WEAVE IT BACK', none: 'IT IS THE ASHEN CAMP' };
  return null;
}
function reset() {
  const r = resetOf();
  if (!r) return;
  if (!r.can) { A.deny(); say(r.none); shop.arm = 0; return; }
  if (shop.arm <= 0) { shop.arm = 2.5; A.ui(); return; }
  shop.arm = 0;
  if (shop.kind === 'perk') { best.perm[shop.hero] = {}; best.gold += r.gold; A.coin(); say('+' + r.gold + ' GOLD. START AGAIN'); }
  else if (shop.kind === 'decor') { for (const d of r.out) best.hidden.push(d.id); say('ALL PUT AWAY'); }
  else { best.skin = 'ash'; say('THE CAMP CHANGES BACK'); }
  saveBest(); A.select();
}

const LIST_Y = 30, ROW_H = 10, ROWS = 11, RESET_Y = H - 33;
const keepInSight = (n) => { shop.top = Math.max(0, Math.min(Math.max(0, n - ROWS), shop.top, shop.sel)); if (shop.sel >= shop.top + ROWS) shop.top = shop.sel - ROWS + 1; };
// returns 'close' when the screen should close
export function updateShop(dt) {
  shop.t += dt; shop.msgT = Math.max(0, shop.msgT - dt); shop.arm = Math.max(0, shop.arm - dt);
  const list = rows(), n = list.length;
  if (keyHit('Escape') || (input.touch && input.mouse.pressed && input.mouse.x < 46 && input.mouse.y < 18)) { A.ui(); return 'close'; }
  if (keyHit('ArrowDown', 'KeyS')) { shop.sel = (shop.sel + 1) % n; A.ui(); }
  if (keyHit('ArrowUp', 'KeyW')) { shop.sel = (shop.sel - 1 + n) % n; A.ui(); }
  const m = input.mouse;
  // the wheel, or the arrows at the list's ends, scroll it a row at a time
  const more = n > ROWS;
  if (more && m.wheel) { shop.top = Math.max(0, Math.min(n - ROWS, shop.top + m.wheel)); shop.sel = Math.max(shop.top, Math.min(shop.top + ROWS - 1, shop.sel)); }
  if (more && m.pressed && m.x >= 120 && m.x < 150) {
    if (m.y >= LIST_Y - 11 && m.y < LIST_Y - 2 && shop.top > 0) { shop.top--; shop.sel = Math.min(shop.sel, shop.top + ROWS - 1); A.ui(); }
    if (m.y >= LIST_Y + ROWS * ROW_H - 2 && m.y < LIST_Y + ROWS * ROW_H + 7 && shop.top < n - ROWS) { shop.top++; shop.sel = Math.max(shop.sel, shop.top); A.ui(); }
  }
  keepInSight(n);
  let act = keyHit('Enter', 'Space');
  for (let i = 0; i < Math.min(ROWS, n - shop.top); i++) {
    const k = shop.top + i, y = LIST_Y + i * ROW_H;
    if (m.x >= 12 && m.x < 150 && m.y >= y - 2 && m.y < y + ROW_H - 2) {
      if (m.moved && shop.sel !== k) { shop.sel = k; A.ui(); }
      if (m.pressed) { if (shop.sel === k) act = true; else { shop.sel = k; A.ui(); } }
    }
  }
  if (m.pressed && m.x > 156 && m.y > H - 34 && m.y < H - 18) act = true;
  if (act) use(list[shop.sel]);
  if (keyHit('KeyR') || (m.pressed && m.x >= 12 && m.x < 150 && m.y >= RESET_Y - 1 && m.y < RESET_Y + 14)) reset();
  return null;
}
function use(it) {
  if (!it) return;
  if (shop.kind === 'decor') {
    if (!best.owned.includes(it.id)) { buy(it.id, it.price); return; }
    const i = best.hidden.indexOf(it.id);
    if (i >= 0) { best.hidden.splice(i, 1); say('SET OUT'); } else { best.hidden.push(it.id); say('PUT AWAY'); }
    saveBest(); A.ui();
  } else if (shop.kind === 'skin') {
    if (!skinOwned(it.id) && !buy(it.id, it.price)) return;
    if (best.skin !== it.id) { best.skin = it.id; saveBest(); A.select(); say('THE CAMP CHANGES'); }
  } else if (shop.kind === 'perk') {
    const lv = permLevel(shop.hero, it.id);
    if (lv >= it.max) { A.deny(); say('ALREADY AT ITS BEST'); return; }
    if (!spend(it.cost[lv])) { A.deny(); say('NOT ENOUGH GOLD'); return; }
    (best.perm[shop.hero] ||= {})[it.id] = lv + 1; saveBest(); A.select(); A.coin(); say(it.name + ' ' + (lv + 1));
  } else if (shop.kind === 'board') {
    const got = dailyClaim(shop.sel);
    if (got > 0) { A.select(); A.coin(); say('+' + got + ' GOLD'); } else { A.deny(); say(it.claimed ? 'ALREADY CLAIMED' : 'NOT DONE YET'); }
  }
}

// gold, with a coin
export function drawGold(x, y, align = 'r', n = best.gold) {
  const s = String(n), w = textW(s) + 8, x0 = align === 'r' ? x - w : x;
  const sq = Math.abs(Math.cos(Date.now() / 300));
  rect(x0 + 2 - Math.round(sq * 1.5), y, 1 + Math.round(sq * 3), 5, '#ffd447'); px(x0 + 2, y + 1, '#fff6c0');
  textO(s, x0 + 8, y, '#ffd447', 1, 'l');
}
export function drawShop(t, bg) {
  bg();
  ctx.globalAlpha = 0.78; rect(-SX, 0, FW, H, '#05030a'); ctx.globalAlpha = 1;
  const nn = NPC[shop.kind], list = rows(), n = list.length;
  rect(8, 8, W - 16, H - 16, '#0e0a12'); rect(8, 8, W - 16, 1, nn.col); rect(8, H - 9, W - 16, 1, '#3a2a32');
  textO(nn.who, 14, 13, nn.col, 1, 'l'); text(shop.kind === 'perk' ? 'UPGRADES FOR ' + CHARS[shop.hero].hero : shop.kind === 'board' ? "TODAY'S MISSIONS  " + dailyDay() : nn.what, 14 + textW(nn.who) + 6, 13, '#8a7a80');
  drawGold(W - 14, 13);
  if (input.touch) { rect(3, 1, 34, 11, P.ink0); text('< BACK', 7, 4, P.paper); }
  for (let i = 0; i < Math.min(ROWS, n - shop.top); i++) {
    const k = shop.top + i, it = list[k], y = LIST_Y + i * ROW_H, on = k === shop.sel;
    if (on) { rect(12, y - 2, 138, ROW_H - 1, '#2a1e26'); rect(12, y - 2, 2, ROW_H - 1, nn.col); }
    const [name, right, rc] = rowText(it);
    text(name, 17, y, on ? P.paper : P.bone); text(right, 146, y, rc, 1, 'r');
  }
  // the list goes on: arrows at its ends, and how far down it is
  if (n > ROWS) {
    const bob = Math.floor(t * 3) % 2;
    if (shop.top > 0) for (let i = 0; i < 3; i++) rect(141 - i, LIST_Y - 7 + i - bob, 1 + i * 2, 1, nn.col);
    if (shop.top < n - ROWS) for (let i = 0; i < 3; i++) rect(141 - i, LIST_Y + ROWS * ROW_H + 2 - i + bob, 1 + i * 2, 1, nn.col);
    const bh = Math.max(6, Math.round((ROWS / n) * (ROWS * ROW_H - 4))), by = LIST_Y - 2 + Math.round((shop.top / (n - ROWS)) * (ROWS * ROW_H - 4 - bh));
    rect(152, LIST_Y - 2, 1, ROWS * ROW_H - 4, '#2a2028'); rect(152, by, 1, bh, nn.col);
  }
  const it = list[shop.sel];
  if (it) drawDetail(it, t);
  drawReset(t);
  if (shop.msgT > 0) textO(shop.msg, 232, H - 44, shop.msg.startsWith('NOT') || shop.msg.startsWith('ALREADY') || shop.msg.startsWith('NO ') || shop.msg.startsWith('NOTHING') || shop.msg.startsWith('IT IS') ? P.blood : P.gold, 1, 'c');
  if (!input.touch) text('ARROWS PICK   ENTER ' + (shop.kind === 'board' ? 'CLAIM' : 'BUY / USE') + (resetOf() ? '   R RESET' : '') + '   ESC BACK', W / 2, H - 6, '#6a5a62', 1, 'c');
}
// the reset button, under the list: grey when there is nothing to reset, red while it waits for the second press
function drawReset(t) {
  const r = resetOf();
  if (!r) return;
  const armed = shop.arm > 0, col = armed ? (Math.floor(t * 6) % 2 ? '#ff4a5a' : P.blood) : r.can ? '#8a6a72' : '#3a2a32';
  rect(12, RESET_Y, 138, 13, armed ? '#3a0c16' : '#160f14');
  rect(12, RESET_Y, 138, 1, col); rect(12, RESET_Y + 12, 138, 1, col); rect(12, RESET_Y, 1, 13, col); rect(149, RESET_Y, 1, 13, col);
  // a little circling arrow before the words
  const cx = 20, cy = RESET_Y + 6, c = armed ? P.paper : r.can ? P.bone : '#5a4a52';
  for (let i = 0; i < 7; i++) { const a = -0.6 + i * 0.75; px(cx + Math.round(Math.cos(a) * 3), cy + Math.round(Math.sin(a) * 3), c); }
  px(cx + 3, cy - 3, c); px(cx + 2, cy - 4, c); px(cx + 4, cy - 1, c);
  text(armed ? r.sure : r.label, 84, RESET_Y + 4, c, 1, 'c');
}
function rowText(it) {
  if (shop.kind === 'decor') return [it.name, !best.owned.includes(it.id) ? String(it.price) : best.hidden.includes(it.id) ? 'AWAY' : 'OUT', !best.owned.includes(it.id) ? (best.gold >= it.price ? '#ffd447' : '#7a6a50') : best.hidden.includes(it.id) ? '#8a7a80' : '#7dff9a'];
  if (shop.kind === 'skin') return [it.name, best.skin === it.id ? 'ON' : skinOwned(it.id) ? 'OWNED' : String(it.price), best.skin === it.id ? '#7dff9a' : skinOwned(it.id) ? P.bone : best.gold >= it.price ? '#ffd447' : '#7a6a50'];
  if (shop.kind === 'perk') { const lv = permLevel(shop.hero, it.id); return [it.name + ' ' + 'I'.repeat(lv), lv >= it.max ? 'MAX' : String(it.cost[lv]), lv >= it.max ? '#7dff9a' : best.gold >= it.cost[lv] ? '#ffd447' : '#7a6a50']; }
  return [it.text.length > 28 ? it.text.slice(0, 27) + '.' : it.text, it.claimed ? 'DONE' : Math.min(it.got, it.goal) + '/' + it.goal, it.claimed ? '#7dff9a' : it.got >= it.goal ? '#ffd447' : '#8a7a80'];
}
function button(label, ok) {
  const y = H - 33;
  rect(160, y, 144, 13, ok ? NPC[shop.kind].col : '#2a2028');
  textO(label, 232, y + 4, ok ? P.ink0 : '#8a7a80', 1, 'c', ok ? NPC[shop.kind].col : P.ink0);
}
function drawDetail(it, t) {
  const cx = 232, nn = NPC[shop.kind];
  rect(158, 26, 148, 82, '#140e16');
  ctx.save(); ctx.beginPath(); ctx.rect(158, 26, 148, 82); ctx.clip();
  if (shop.kind === 'decor') {
    // the thing itself, as big as fits: twice its size, or five or four thirds for the tall ones (each a whole
    // number of screen pixels, so it stays sharp)
    const k = (it.h || 30) > 46 ? 4 / 3 : (it.h || 30) > 39 ? 5 / 3 : 2;
    ctx.save(); ctx.translate(cx, it.id === 'lanterns' ? 96 : 104); ctx.scale(k, k); DRAW_DECOR[it.id]?.(it.ox || 0, 0, t, skinOf(best.skin)); if (it.id === 'lanterns') drawLanternStrings([[-30, -30], [0, -26], [30, -30]], t); ctx.restore();
  } else if (shop.kind === 'skin') {
    drawSkinPreview(skinOf(it.id), t);
  } else if (shop.kind === 'perk') {
    drawFighter(shop.hero, cx, 100, 2, { t });
    PERKS.forEach((pk, i) => { const lv = permLevel(shop.hero, pk.id); for (let k = 0; k < pk.max; k++) rect(164 + i * 28 + k * 6, 30, 4, 3, k < lv ? nn.col : '#3a2a32'); });
  } else {
    textO(it.claimed ? 'CLAIMED' : it.got >= it.goal ? 'DONE!' : 'IN PROGRESS', cx, 50, it.claimed ? '#7dff9a' : it.got >= it.goal ? P.gold : P.bone, 2, 'c');
    rect(cx - 50, 70, 100, 4, '#2a2028'); rect(cx - 50, 70, Math.round(100 * Math.min(1, it.got / it.goal)), 4, it.got >= it.goal ? P.gold : '#8a7a80');
    text('REWARD', cx - 18, 84, '#8a7a80', 1, 'r'); drawGold(cx - 12, 84, 'l', it.reward);
  }
  ctx.restore();
  // the words under it, and what Enter will do
  let lines = [], label = '', ok = false;
  if (shop.kind === 'decor') { lines = it.d; const own = best.owned.includes(it.id); label = own ? (best.hidden.includes(it.id) ? 'SET IT OUT' : 'PUT IT AWAY') : 'BUY  ' + it.price + ' GOLD'; ok = own || best.gold >= it.price; }
  else if (shop.kind === 'skin') { lines = ['THE WEAVER CAN WEAVE THE WHOLE CAMP', 'INTO ' + it.name + '.']; label = best.skin === it.id ? 'IN USE' : skinOwned(it.id) ? 'USE THIS LOOK' : 'BUY  ' + it.price + ' GOLD'; ok = best.skin !== it.id && (skinOwned(it.id) || best.gold >= it.price); }
  else if (shop.kind === 'perk') { const lv = permLevel(shop.hero, it.id); lines = [it.name + ': ' + it.what, 'LEVEL ' + lv + ' OF ' + it.max + '. FOR ' + CHARS[shop.hero].hero + ' ONLY, FOR GOOD.']; label = lv >= it.max ? 'AT ITS BEST' : 'BUY LEVEL ' + (lv + 1) + '  ' + it.cost[lv] + ' GOLD'; ok = lv < it.max && best.gold >= it.cost[lv]; }
  else { lines = [it.text, 'NEW MISSIONS EVERY DAY.']; label = it.claimed ? 'CLAIMED' : it.got >= it.goal ? 'CLAIM  ' + it.reward + ' GOLD' : 'NOT DONE YET'; ok = !it.claimed && it.got >= it.goal; }
  lines.forEach((l, i) => text(l, cx, 112 + i * 8, P.bone, 1, 'c'));
  button(label, ok);
}
// a little picture of the camp in a look: its sky, its sun, its ground, its fire, what drifts in its air
export function drawSkinPreview(sk, t) {
  const x0 = 158, y0 = 26, w = 148, h = 82;
  for (let i = 0; i < 46; i++) { const k = i / 46, c = k < 0.5 ? sk.sky[0] : k < 0.8 ? sk.sky[1] : sk.sky[2]; rect(x0, y0 + i, w, 1, c); }
  const sx = x0 + w / 2, sy = y0 + 18;
  if (sk.sun === 'black') { disc(sx, sy, 9, '#05020a'); ring(sx, sy, 9, 1, '#ffb347'); glow(sx, sy, '#ff6a2a', 20, 0.3); }
  else if (sk.sun === 'gold') { disc(sx, sy, 9, '#ffd447'); glow(sx, sy, '#ffd447', 22, 0.5); }
  else if (sk.sun === 'red') { disc(sx, sy, 8, '#ff4a1c'); glow(sx, sy, '#ff4a1c', 20, 0.45); }
  else if (sk.sun === 'moon') { disc(sx, sy, 7, '#e8e4ff'); disc(sx + 3, sy - 2, 6, sk.sky[0]); }
  rect(x0, y0 + 42, w, 6, sk.crag);
  rect(x0, y0 + 46, w, h - 46, sk.ground[0]);
  for (let i = 0; i < 60; i++) px(x0 + hash(i) * w, y0 + 48 + hash(i + 9) * (h - 50), sk.ground[i % 3 ? 1 : 2]);
  const fx = x0 + w / 2, fy = y0 + 70;
  glow(fx, fy - 4, sk.glow, 26, 0.3);
  for (let i = 0; i < 5; i++) { const hh = 4 + Math.sin(t * 11 + i * 1.7) * 1.5 + (2 - Math.abs(i - 2)) * 2; rect(fx - 4 + i * 2, fy - hh, 2, hh, sk.fire[i % 2]); }
  for (let i = 0; i < 18; i++) {
    const u = (t * 0.15 + hash(i + 30)) % 1, x = x0 + ((hash(i + 40) * w + u * 30) % w), y = y0 + u * h;
    const c = { ash: '#6a6266', petals: '#ff9fc0', snow: '#ffffff', sparks: '#ffb347', fireflies: '#d8ff6a', stars: '#c8b8f0', motes: '#ffd447', data: '#62efff' }[sk.air];
    px(x, y, c);
  }
}
