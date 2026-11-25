// The camp's shops and the gold they take. Gold is rare: a lootling sometimes drops a coin, now and then any monster
// does, every boss drops a little (the King and Nox more), going deeper and holding the endless night pay a coin, and
// the quest board's daily missions pay a few (daily.js). It is kept in best.gold (store.js) and spent here:
//   the Peddler   DECOR: things for the camp (they stand in their own places; put one away and set it out again free)
//   the Weaver    SKINS: the camp's whole look (sky, ground, fire, what drifts through the air)
//   the Smith     PERKS: permanent upgrades, each fighter's own. Every fighter starts weaker than before (NERF) and
//                 the Smith's work makes them stronger than they ever were.
// Prices are high on purpose. The shop's screen (openShop, updateShop, drawShop) is shown over the camp by lobby.js.
import { ctx, W, H, FW, SX, P, rect, px, line, disc, ring, glow, text, textO, textW } from './gfx.js?v=212';
import { A } from './audio.js?v=212';
import { input, keyHit } from './input.js?v=212';
import { best, saveBest } from './store.js?v=212';
import { CHARS } from './chars.js?v=212';
import { drawFighter } from './title-scene.js?v=212';
import { dailyList, dailyClaim, dailyDay } from './daily.js?v=212';

const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const TAU = Math.PI * 2;

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
  { id: 'cherry', name: 'CHERRY TREE', price: 60, x: 100, y: 100, r: 6, d: ["A CUTTING FROM THE TREE AT RIN'S SHRINE.", 'IT BLOOMS HERE TOO.'] },
  { id: 'windmill', name: 'LITTLE WINDMILL', price: 70, x: 690, y: 104, r: 7, d: ["RIVET'S. SHE SAYS IT RUNS ON NOTHING.", 'IT RUNS ON SPITE.'] },
  { id: 'rack', name: 'WEAPON RACK', price: 35, x: 24, y: 170, r: 7, d: ['SWORDS AND SPEARS THE FALLEN LEFT', 'AT THE RIM. NONE OF THEM RUSTED.'] },
  { id: 'fountain', name: 'EMBER FOUNTAIN', price: 120, x: 360, y: 204, r: 9, d: ['IT POURS LIGHT, NOT WATER.', 'NOBODY KNOWS WHERE IT COMES FROM.'] },
  { id: 'meadow', name: 'FLOWER PATCH', price: 30, x: 452, y: 198, r: 0, d: ['UNIT-7 PLANTED IT. NEW ORDER:', 'KEEP IT SAFE.'] },
  { id: 'telescope', name: 'STAR TELESCOPE', price: 55, x: 470, y: 152, r: 6, d: ['MORROW STILL WATCHES FOR THE STARS', 'TO COME BACK.'] },
  { id: 'tavern', name: 'TAVERN CORNER', price: 45, x: 630, y: 200, r: 8, d: ["BARRELS FROM VEGA'S FAVORITE TAVERN.", 'THE TAB IS HUGE.'] },
  { id: 'tomb', name: "THE KING'S TOMB", price: 80, x: 176, y: 204, r: 8, d: ['GROM CARVED IT HIMSELF.', 'AUREL, WHO WAS GOOD ONCE.'] },
  { id: 'terminal', name: 'OLD TERMINAL', price: 40, x: 700, y: 204, r: 6, d: ["THE DEV'S. IT IS STILL COMPILING", 'SOMETHING.'] },
  { id: 'banners', name: 'SUN BANNERS', price: 90, x: 322, y: 96, x2: 398, r: 0, d: ["TWO OF AUREL'S OLD BANNERS, THE SUN", 'STITCHED IN GOLD. FROM BEFORE.'] },
  { id: 'lanterns', name: 'LANTERN STRINGS', price: 50, x: 0, y: 0, r: 0, d: ['PAPER LANTERNS ACROSS THE CAMP.', 'THEY NEVER GO OUT.'] },
  { id: 'throne', name: 'EMPTY THRONE', price: 200, x: 52, y: 204, r: 9, d: ["A COPY OF AUREL'S THRONE.", 'NOBODY SITS IN IT. NOBODY EVER WILL.'] },
  { id: 'torii', name: 'SHRINE GATE', price: 75, x: 360, y: 100, r: 0, d: ['A RED GATE LIKE THE ONE AT THE', 'RED ONI SHRINE.'] },
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

// ---------- the decorations, drawn in pixels at their feet (x, y) ----------
function shadowAt(x, y, w) { ctx.globalAlpha = 0.35; for (let i = -2; i <= 2; i++) rect(x - w + Math.abs(i), y + i, w * 2 - Math.abs(i) * 2, 1, '#05030a'); ctx.globalAlpha = 1; }
const ASHC = ['#4e464e', '#6a6068', '#2e282e', '#8a8088'];
function ashFlakes(x, y, t, n = 2) { for (let i = 0; i < n; i++) { const u = (t * 0.4 + i / n + hash(x)) % 1; ctx.globalAlpha = 1 - u; px(x - 2 + i * 4, y - u * 10, '#7a7078'); } ctx.globalAlpha = 1; }
export const DRAW_DECOR = {
  // ash statues of the King's people, caught as they were when the ash came
  statue1(x, y, t) {  // a mother holding her child up
    shadowAt(x, y, 6); rect(x - 5, y - 2, 10, 2, ASHC[2]);
    rect(x - 3, y - 16, 6, 14, ASHC[0]); rect(x - 3, y - 16, 2, 14, ASHC[1]); rect(x - 2, y - 21, 5, 5, ASHC[0]); px(x - 1, y - 21, ASHC[1]);
    rect(x + 2, y - 26, 3, 7, ASHC[0]); rect(x + 2, y - 29, 4, 4, ASHC[1]); rect(x - 4, y - 18, 1, 6, ASHC[0]);
    line(x - 1, y - 12, x + 1, y - 8, ASHC[2]); px(x + 3, y - 27, ASHC[3]);
    ashFlakes(x, y - 20, t);
  },
  statue2(x, y, t) {  // a soldier kneeling, his spear planted
    shadowAt(x, y, 7); rect(x - 6, y - 2, 12, 2, ASHC[2]);
    rect(x - 4, y - 10, 8, 8, ASHC[0]); rect(x - 4, y - 10, 2, 8, ASHC[1]); rect(x - 3, y - 15, 6, 5, ASHC[0]); rect(x - 3, y - 17, 6, 2, ASHC[1]);
    rect(x - 6, y - 6, 3, 4, ASHC[0]); line(x + 5, y - 2, x + 5, y - 24, ASHC[1]); rect(x + 4, y - 27, 3, 3, ASHC[3]);
    line(x - 2, y - 8, x + 1, y - 4, ASHC[2]); ashFlakes(x, y - 14, t);
  },
  statue3(x, y, t) {  // an old man on his cane, looking up
    shadowAt(x, y, 5); rect(x - 4, y - 2, 8, 2, ASHC[2]);
    rect(x - 2, y - 15, 5, 13, ASHC[0]); rect(x - 2, y - 15, 1, 13, ASHC[1]); rect(x - 1, y - 20, 5, 5, ASHC[0]); px(x + 2, y - 20, ASHC[1]);
    line(x + 4, y - 12, x + 6, y - 2, ASHC[1]); rect(x - 3, y - 13, 2, 3, ASHC[0]); px(x + 3, y - 22, ASHC[3]);
    ashFlakes(x, y - 18, t);
  },
  head(x, y, t) {  // the head of Aurel's great statue, fallen, half in the ground, its crown cracked
    shadowAt(x, y, 13);
    for (let r = 0; r < 16; r++) { const w = Math.round(Math.sqrt(1 - ((r - 8) / 9) ** 2) * 11); rect(x - w, y - 2 - r, w * 2, 1, r < 3 ? '#3a3238' : r > 12 ? '#7a7078' : '#5a5058'); }
    rect(x - 6, y - 12, 4, 2, '#2a2228'); rect(x + 2, y - 12, 4, 2, '#2a2228'); rect(x - 1, y - 9, 2, 3, '#4a4248'); rect(x - 3, y - 6, 6, 1, '#2a2228');
    for (let i = 0; i < 5; i++) { const h = i === 2 ? 6 : i % 2 ? 4 : 3; rect(x - 9 + i * 4, y - 18 - h, 2, h, i === 3 ? '#5a4a30' : '#8a7448'); }
    rect(x - 10, y - 19, 21, 2, '#8a7448'); line(x + 3, y - 17, x + 6, y - 8, '#2a2228');
    if (Math.floor(t * 2 + x) % 7 === 0) px(x - 5, y - 11, '#ff7a2a');
  },
  column(x, y) {  // a broken column, fallen pieces beside it
    shadowAt(x, y, 7); rect(x - 5, y - 4, 10, 4, '#3a3036');
    rect(x - 4, y - 20, 8, 16, '#5a5058'); rect(x - 4, y - 20, 2, 16, '#7a7078'); rect(x + 2, y - 20, 2, 16, '#3e3640');
    for (let i = 0; i < 8; i++) rect(x - 4 + i, y - 22 + Math.round(Math.abs(Math.sin(i * 1.9)) * 3), 1, 2, '#6a6068');
    rect(x + 6, y - 4, 7, 4, '#5a5058'); rect(x + 6, y - 4, 7, 1, '#7a7078');
  },
  bones(x, y, t, sk) {
    const b = sk?.bone || '#c8bca4';
    for (const [dx, dy] of [[-6, 0], [-2, -2], [3, -1], [7, 1]]) { rect(x + dx, y + dy, 3, 1, b); px(x + dx - 1, y + dy - 1, b); px(x + dx + 3, y + dy + 1, b); }
    rect(x - 1, y - 4, 3, 3, b); px(x - 1, y - 3, '#2a1a1a'); px(x + 1, y - 3, '#2a1a1a');
  },
  cherry(x, y, t) {
    shadowAt(x, y, 10); rect(x - 1, y - 18, 3, 18, '#5a3a2a'); line(x, y - 14, x - 7, y - 20, '#5a3a2a'); line(x + 1, y - 15, x + 8, y - 21, '#5a3a2a');
    for (let i = 0; i < 46; i++) { const a = hash(i) * TAU, r = hash(i + 9) * 11; rect(x + Math.cos(a) * r * 1.2, y - 24 + Math.sin(a) * r * 0.6, 2, 2, i % 3 ? '#ff9fc0' : '#ffd0e0'); }
    for (let i = 0; i < 6; i++) { const u = (t * 0.25 + hash(i + 3)) % 1; px(x - 10 + hash(i + 5) * 20 + u * 14, y - 26 + u * 26, i % 2 ? '#ff9fc0' : '#ffd0e0'); }
  },
  windmill(x, y, t) {
    shadowAt(x, y, 6);
    for (let r = 0; r < 24; r++) { const w = Math.round(3 + r * 0.12); rect(x - w, y - r - 1, w * 2, 1, r % 6 === 0 ? '#5a4a42' : '#6a5a50'); }
    rect(x - 1, y - 6, 3, 5, '#2a1e1a');
    for (let i = 0; i < 4; i++) { const a = t * 1.6 + i * TAU / 4; line(x, y - 25, x + Math.cos(a) * 12, y - 25 + Math.sin(a) * 12, '#d8c8b0', 2); }
    disc(x, y - 25, 2, '#62efff'); glow(x, y - 25, '#62efff', 7, 0.5);
  },
  rack(x, y) {
    shadowAt(x, y, 8); rect(x - 8, y - 14, 2, 14, '#5a3a28'); rect(x + 7, y - 14, 2, 14, '#5a3a28'); rect(x - 8, y - 13, 17, 2, '#6a4a30'); rect(x - 8, y - 4, 17, 1, '#6a4a30');
    for (let i = 0; i < 4; i++) { const sx = x - 5 + i * 4; line(sx, y - 3, sx, y - 20 - (i % 2) * 3, i % 2 ? '#c8d0dc' : '#9aa4b4'); rect(sx - 1, y - 8, 3, 1, '#d8a032'); }
  },
  fountain(x, y, t) {
    shadowAt(x, y, 11); rect(x - 10, y - 5, 20, 5, '#4a4250'); rect(x - 10, y - 5, 20, 1, '#6a6070'); rect(x - 8, y - 4, 16, 2, '#ff9a3c');
    rect(x - 2, y - 14, 4, 9, '#5a5260'); rect(x - 4, y - 15, 8, 2, '#6a6070');
    for (let i = 0; i < 10; i++) { const u = (t * 0.9 + i / 10) % 1, a = (i % 2 ? 1 : -1) * (0.3 + hash(i) * 0.6); px(x + Math.sin(a) * u * 10, y - 16 - Math.sin(u * Math.PI) * 9 + u * 10, u < 0.5 ? '#ffd447' : '#ff7a2a'); }
    glow(x, y - 12, '#ff9a3c', 16, 0.45);
  },
  meadow(x, y, t) {
    for (let i = 0; i < 26; i++) { const fx = x - 14 + hash(i + 40) * 28, fy = y - 4 + hash(i + 60) * 8, c = ['#ff9fc0', '#ffd447', '#9fd3ff', '#ffffff'][i % 4]; px(fx, fy, '#5aa84a'); px(fx, fy - 1 - (Math.sin(t * 2 + i) > 0.6 ? 1 : 0), c); }
  },
  telescope(x, y, t) {
    shadowAt(x, y, 6); line(x, y - 8, x - 5, y, '#5a3a28'); line(x, y - 8, x + 5, y, '#5a3a28'); line(x, y - 8, x, y, '#5a3a28');
    line(x - 4, y - 6, x + 6, y - 16, '#c8903a', 3); line(x - 4, y - 7, x + 6, y - 17, '#fff0b8');
    if (Math.floor(t * 2) % 3 === 0) { px(x + 8, y - 22, '#ffffff'); glow(x + 8, y - 22, '#c8b8ff', 6, 0.5); }
  },
  tavern(x, y, t) {
    shadowAt(x, y, 10);
    for (const [dx, dy] of [[-6, 0], [5, 0], [0, -8]]) { rect(x + dx - 4, y + dy - 8, 8, 8, '#7a4a2a'); rect(x + dx - 4, y + dy - 6, 8, 1, '#4a2a18'); rect(x + dx - 4, y + dy - 3, 8, 1, '#4a2a18'); }
    rect(x + 10, y - 26, 1, 24, '#4a3020'); rect(x + 10, y - 26, 12, 1, '#4a3020');
    const sw = Math.round(Math.sin(t * 2) * 1); rect(x + 13 + sw, y - 24, 10, 6, '#3a2418'); text('INN', x + 14 + sw, y - 23, '#ffd447', 1);
  },
  tomb(x, y, t) {
    shadowAt(x, y, 9); rect(x - 8, y - 14, 16, 14, '#6a6070'); rect(x - 8, y - 14, 16, 2, '#8a8090'); text('AUREL', x, y - 10, '#2a2430', 1, 'c');
    for (let i = 0; i < 5; i++) { const h = i === 2 ? 4 : 2; rect(x - 5 + i * 2.5, y - 16 - h, 1, h, '#ffd447'); }
    for (let i = 0; i < 4; i++) { px(x - 7 + i * 5, y, '#5aa84a'); px(x - 7 + i * 5, y - 1, i % 2 ? '#ff9fc0' : '#ffd447'); }
  },
  terminal(x, y, t) {
    shadowAt(x, y, 7); rect(x - 7, y - 6, 14, 6, '#5a3a28'); rect(x - 6, y - 16, 12, 10, '#2a2e3a'); rect(x - 5, y - 15, 10, 7, '#06120a');
    for (let i = 0; i < 3; i++) rect(x - 4, y - 14 + i * 2, 3 + ((Math.floor(t * 3) + i) % 4) * 2, 1, '#39ff6a');
    if (Math.floor(t * 3) % 2) rect(x + 2, y - 10, 2, 1, '#39ff6a');
    glow(x, y - 11, '#39ff6a', 10, 0.25);
  },
  banners(x, y, t) {  // one of the pair that flank the way down into the pit
    rect(x, y - 30, 2, 31, '#4a3020'); px(x, y - 31, '#ffd447');
    const sw = (i) => Math.round(Math.sin(t * 2 + i * 0.5 + x) * 1);
    for (let i = 0; i < 16; i++) rect(x + 2 + sw(i), y - 28 + i, 9, 1, '#8a1a2a');
    rect(x + 3, y - 12, 3, 2, '#8a1a2a'); rect(x + 8, y - 12, 3, 2, '#8a1a2a');
    disc(x + 6, y - 21, 2.5, '#ffd447'); px(x + 6, y - 21, '#fff4b0');
  },
  throne(x, y, t) {
    shadowAt(x, y, 10); rect(x - 8, y - 4, 16, 4, '#5a4020'); rect(x - 7, y - 10, 14, 6, '#8a1a2a'); rect(x - 7, y - 10, 14, 1, '#b83040');
    rect(x - 8, y - 28, 16, 18, '#d8a032'); rect(x - 6, y - 26, 12, 15, '#8a1a2a'); rect(x - 8, y - 28, 16, 1, '#fff4b0');
    for (let i = 0; i < 3; i++) rect(x - 6 + i * 5, y - 32 - (i === 1 ? 2 : 0), 2, 4 + (i === 1 ? 2 : 0), '#d8a032');
    disc(x, y - 20, 2, '#ffd447'); glow(x, y - 20, '#ffd447', 10, 0.3);
  },
  torii(x, y, t) {
    rect(x - 10, y - 24, 3, 24, '#c0302a'); rect(x + 8, y - 24, 3, 24, '#c0302a');
    rect(x - 14, y - 27, 29, 3, '#c0302a'); rect(x - 15, y - 29, 31, 2, '#2a1a1a'); rect(x - 11, y - 20, 23, 2, '#a02a24');
    for (let i = 0; i < 4; i++) { const u = (t * 0.3 + hash(i + 7)) % 1; px(x - 8 + hash(i) * 16 + u * 8, y - 24 + u * 24, '#ff9fc0'); }
  },
};
// strings of lanterns, hung across the camp between the given posts
export function drawLanternStrings(posts, t) {
  for (let i = 0; i + 1 < posts.length; i++) {
    const [x0, y0] = posts[i], [x1, y1] = posts[i + 1], n = Math.max(4, Math.round(Math.abs(x1 - x0) / 10));
    for (let k = 0; k <= n; k++) {
      const u = k / n, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u + Math.sin(u * Math.PI) * 10;
      px(x, y, '#3a2a22');
      if (k % 2 === 1) { const c = ['#ff7a2a', '#ffd447', '#ff9fc0'][k % 3]; rect(x - 1, y + 1, 3, 3, c); glow(x, y + 2, c, 6, 0.35 + 0.1 * Math.sin(t * 3 + k)); }
    }
  }
}

// ---------- the shop's screen ----------
export const shop = { kind: null, sel: 0, t: 0, msg: '', msgT: 0, hero: 'BLADE', from: 'camp' };
function say(s) { shop.msg = s; shop.msgT = 1.4; }
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
export function openShop(kind, hero) { Object.assign(shop, { kind, sel: 0, t: 0, msg: '', msgT: 0, hero: hero || shop.hero }); A.ui(); }
// returns 'close' when the screen should close
export function updateShop(dt) {
  shop.t += dt; shop.msgT = Math.max(0, shop.msgT - dt);
  const list = rows(), n = list.length;
  if (keyHit('Escape') || (input.touch && input.mouse.pressed && input.mouse.x < 46 && input.mouse.y < 18)) { A.ui(); return 'close'; }
  if (keyHit('ArrowDown', 'KeyS')) { shop.sel = (shop.sel + 1) % n; A.ui(); }
  if (keyHit('ArrowUp', 'KeyW')) { shop.sel = (shop.sel - 1 + n) % n; A.ui(); }
  const m = input.mouse;
  let act = keyHit('Enter', 'Space');
  for (let i = 0; i < n; i++) {
    const y = LIST_Y + i * ROW_H;
    if (m.x >= 12 && m.x < 150 && m.y >= y - 2 && m.y < y + ROW_H - 2) {
      if (m.moved && shop.sel !== i) { shop.sel = i; A.ui(); }
      if (m.pressed) { if (shop.sel === i) act = true; else { shop.sel = i; A.ui(); } }
    }
  }
  if (m.pressed && m.x > 156 && m.y > H - 34 && m.y < H - 18) act = true;
  if (act) use(list[shop.sel]);
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
const LIST_Y = 30, ROW_H = 10;
export function drawShop(t, bg) {
  bg();
  ctx.globalAlpha = 0.78; rect(-SX, 0, FW, H, '#05030a'); ctx.globalAlpha = 1;
  const nn = NPC[shop.kind], list = rows();
  rect(8, 8, W - 16, H - 16, '#0e0a12'); rect(8, 8, W - 16, 1, nn.col); rect(8, H - 9, W - 16, 1, '#3a2a32');
  textO(nn.who, 14, 13, nn.col, 1, 'l'); text(shop.kind === 'perk' ? 'UPGRADES FOR ' + CHARS[shop.hero].hero : shop.kind === 'board' ? "TODAY'S MISSIONS  " + dailyDay() : nn.what, 14 + textW(nn.who) + 6, 13, '#8a7a80');
  drawGold(W - 14, 13);
  if (input.touch) { rect(3, 1, 34, 11, P.ink0); text('< BACK', 7, 4, P.paper); }
  list.forEach((it, i) => {
    const y = LIST_Y + i * ROW_H, on = i === shop.sel;
    if (on) { rect(12, y - 2, 138, ROW_H - 1, '#2a1e26'); rect(12, y - 2, 2, ROW_H - 1, nn.col); }
    const [name, right, rc] = rowText(it);
    text(name, 17, y, on ? P.paper : P.bone); text(right, 146, y, rc, 1, 'r');
  });
  const it = list[shop.sel];
  if (it) drawDetail(it, t);
  if (shop.msgT > 0) textO(shop.msg, 232, H - 44, shop.msg.startsWith('NOT') || shop.msg.startsWith('ALREADY') ? P.blood : P.gold, 1, 'c');
  if (!input.touch) text('ARROWS PICK   ENTER ' + (shop.kind === 'board' ? 'CLAIM' : 'BUY / USE') + '   ESC BACK', W / 2, H - 6, '#6a5a62', 1, 'c');
}
function rowText(it) {
  if (shop.kind === 'decor') return [it.name, !best.owned.includes(it.id) ? String(it.price) : best.hidden.includes(it.id) ? 'AWAY' : 'OUT', !best.owned.includes(it.id) ? (best.gold >= it.price ? '#ffd447' : '#7a6a50') : '#7dff9a'];
  if (shop.kind === 'skin') return [it.name, best.skin === it.id ? 'ON' : skinOwned(it.id) ? 'OWNED' : String(it.price), best.skin === it.id ? '#7dff9a' : skinOwned(it.id) ? P.bone : best.gold >= it.price ? '#ffd447' : '#7a6a50'];
  if (shop.kind === 'perk') { const lv = permLevel(shop.hero, it.id); return [it.name + ' ' + 'I'.repeat(lv) , lv >= it.max ? 'MAX' : String(it.cost[lv]), lv >= it.max ? '#7dff9a' : best.gold >= it.cost[lv] ? '#ffd447' : '#7a6a50']; }
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
    // the thing itself, twice its size
    ctx.save(); ctx.translate(cx, 96); ctx.scale(2, 2); DRAW_DECOR[it.id]?.(it.id === 'banners' ? -6 : 0, 0, t, skinOf(best.skin)); if (it.id === 'lanterns') drawLanternStrings([[-30, -30], [0, -26], [30, -30]], t); ctx.restore();
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
