import { makeSprite, P } from './gfx.js?v=40';

// Filled by buildSprites(), and rebuilt when the color theme changes.
export const SPR = {};

// stubby feet: 16 wide, 2 rows, L = leg color, b = boots
const LEGS = {
  idle: ['....oLLo.oLLo...', '....obbo.obbo...'],
  r0: ['...oLLo...oLLo..', '...obbo...obbo..'],
  r1: ['.....oLLoLLo....', '.....obbobbo....'],
  r2: ['...oLLo...oLLo..', '..obbo.....obbo.'],
  r3: ['.....oLLoLLo....', '......obbbo.....'],
};
// the wizard's robe hem replaces feet
const ROBE_LEGS = ['.oRRRRRRRRRRRRo.', '.ooRoooRRoooRoo.'];
const ROBE_LEGS_ALT = ['.oRRRRRRRRRRRRo.', '.oRoooRoooRoooo.'];

// ---------- the playable characters ----------
// Tiny 16x18 heroes: a big head that is two thirds of the height, a small block of a body with nub
// hands, and stubby feet. Hands sit on row 13 (4 above the feet).
// eye: the pixel that glows (facing right). Sprites are drawn with their feet on the ground point.
const BODIES = {
  BLADE: {
    lids: 'E', eye: [10, 7],
    rows: ['....oooooooo....', '..ooCCCllCCCoo..', '.oCCCllCCCCCCCo.', '.oCClCCCCCCCCCo.', '.oCCCCCCCCCCCCo.', '.oCCCooooooooCo.',
      '.oCCokkkkkkkkoo.', '.oCCokEEkkEEkko.', '.oCCokkkkkkkkko.', '.oCComMmmmmmmmo.', '.oCCoMMMMMMMMMo.', '..oCCooooooooo..',
      '...osSSSSSSso...', '..okoaAAAAaoko..', '..SoCaaKKaaCo...', '...oCCaaaaCCo...'],
    alt: { 14: '.SSoCaaKKaaCo...' },
    map: () => ({ C: '#3a2e58', l: '#5e4d8c', k: '#120d1c', E: P.ember3, m: P.bone, M: '#a8987c', s: P.ember, S: P.ember2, a: '#4a4560', A: '#7a7498', K: P.gold }),
    leg: '#2a2238', boot: '#191322',
  },
  GUNNER: {
    lids: 'E', eye: [10, 7],
    rows: ['.....oooooo.....', '....oHhhhhHo....', '.ooooHHHHHHoooo.', 'oHHHHHHHHHHHHHHo', '.oooYYYYYYYYooo.', '.oYYYYYYYYYYYYo.',
      '.oYYfKKffKKfYYo.', '.oYYfEEffEEfYYo.', '.oYYffffffffYYo.', '.oYrrrrrrrrrrYo.', '.oorrrrRrrrrroo.', '...orrrrrrrro...',
      '...oDDwwwwDDo...', '..ofoDDwwDDofo..', '...oDkKKKKkDo...', '...oDDDooDDDo...'],
    map: () => ({ H: '#3a2418', h: P.gold, Y: '#5a3420', f: '#c08a64', K: '#2a1a10', E: '#f0e0c0', r: '#a01e30', R: '#7a1424', D: '#6a3e24', w: '#d8c8a0', k: '#2a1a10' }),
    leg: '#3a2a20', boot: '#21160f',
  },
  WIZARD: {
    lids: 'e', eye: [9, 8], legs: 'robe',
    rows: ['.........oo.....', '........oHHo....', '.......oHHo.....', '......oHhHHo....', '.....oHHhHHHo...', '....oHHHhHHHHo..',
      'ooHHHHgHHgHHHHoo', '.ooKKKKKKKKKKoo.', '..oKKeeKKeeKKo..', '..oKmmmmmmmmKo..', '..ommmmmmmmmmo..', '...ommmmmmmmo...',
      '...oRRmmmmRRo...', '..oKoRRmmRRoKo..', '..oRRRrgrRRRRo..', '..oRRRRRRRRRRo..'],
    map: () => ({ H: '#2a1d4a', h: '#4a3580', K: '#0c0816', e: '#62efff', m: '#e6d8bd', R: '#3a2766', r: '#6a4ab8', g: '#b48cff' }),
  },
  NINJA: {
    // Rin: teal bob with a cyan shine and violet ends, lashed violet eyes, sailor collar, red tie and sash, navy skirt
    lids: 'Ee', eye: [10, 8],
    rows: ['....oooooooo....', '..ooBBBhhBBBoo..', '.oBBBhhhhBBBBBo.', '.oBBhhBBBBBBBBo.', '.oBBBBBBBBBBBBo.', '.oBsBBsBBsBBsBo.',
      '.oVBBffBffffBBo.', '.oVBKKKffKKKfBo.', '.oVBfEEffEEffBo.', '.oVBfEeffEeffBo.', '.oVVfpffmffpVVo.', '..oVoffffffoVo..',
      '...oWNNrrNNWo...', '..ofoWWrrWWofo..', '...oRRRRRRRRo...', '...oSsSSsSSso...'],
    alt: { 14: '.RRoRRRRRRRRo...' },
    map: () => ({ B: '#34a9c9', h: '#8be4f0', s: '#2a7f9e', V: '#8a5ad8', f: '#f4d2b8', K: '#14101c', E: '#a070ff', e: '#4a2a9a', p: '#f08a9a', m: '#c0504a', W: '#ecebf4', N: '#24305a', r: '#e0223f', R: '#c81e36', S: '#24305a' }),
    leg: '#1a1a24', boot: '#3a2030',
  },
  MECHANIC: {
    lids: 'Gg', eye: [10, 5],
    rows: ['....oooooooo....', '..ooWWwwwwWWoo..', '.oWWwWWWWWWWWWo.', '.oWWWWWWWWWWWWo.', '.oWooooooooooWo.', '.oWoGGGooGGGoWo.',
      '.oWoGggooGggoWo.', '.oWWooofffoooWo.', '.offffffffffffo.', '.offcfffffffffo.', '.offffffddffffo.', '..ooffffffffoo..',
      '...oOOOhhOOOo...', '..ogoOOhhOOogo..', '...oOyKyKyKOo...', '...oOOOooOOOo...'],
    map: () => ({ W: '#4a4f5c', w: '#7a8090', G: '#ff9a3c', g: '#ffd08a', f: '#d8a07a', c: '#6a5a50', d: '#5a2a20', O: '#d8651e', h: '#ffd447', y: '#ffd447', K: '#1a1a20' }),
    leg: '#b85416', boot: '#2a1f1a',
  },
  TANK: {
    lids: 'vw', eye: [10, 7],
    rows: ['.h............h.', '.hh..oooooo..hh.', '..hhoSSssSSohh..', '..oSSSSSSSSSSo..', '.oSSSsSSSSSSSSo.', '.oSSSSSSSSSSSSo.',
      '.oSSooooooooSSo.', '.oSSovvvvvvoSSo.', '.oSSooooooooSSo.', '.oSSSSkSSkSSSSo.', '.oSSSSSSSSSSSSo.', '..ooSSSSSSSSoo..',
      '.oPPoSSSSSSoPPo.', '.okkoSSKKSSokko.', '..ooSSsSSsSSoo..', '...okkkkkkkko...'],
    map: () => ({ h: '#e6d8bd', S: '#5a6a82', s: '#8fa2bd', v: '#ff9a3c', w: '#ffe08a', P: '#3c4a63', K: P.gold, k: '#2a2f3a' }),
    leg: '#4a586e', boot: '#2a2f3a',
  },
  ROBOT: {
    lids: 'R', eye: [10, 8],
    rows: ['..o..........o..', '..oA........Ao..', '...oAooooooAo...', '..oMMMMMMMMMMo..', '.oMMmmmmmmmmMMo.', '.oMooooooooooMo.',
      '.oMoKKKKKKKKoMo.', '.oMoKKKKRRKKoMo.', '.oMoKKKRRRRKoMo.', '.oMoKKKKRRKKoMo.', '.oMooooooooooMo.', '..oMMmmmmmmMMo..',
      '..ooooMMMMoooo..', '..oFoMmVVmMoFo..', '...oCMVWWVMCo...', '...oMMmVVmMMo...'],
    map: () => ({ M: '#8a96a8', m: '#4a5466', A: '#ff4f4f', K: '#14161c', R: '#ff3b3b', C: '#3a4252', V: '#62efff', W: '#ffffff', F: '#5c6678' }),
    leg: '#5c6678', boot: '#3a4252',
  },
};
// The Dev starts as an ordinary programmer: laptop on the lap, riding a motorized wheelchair.
// At 250% power a laser rewrites him into the hooded form (EVO.DEV below).
BODIES.DEV = {
  lids: 'Q', eye: [10, 6], legs: 'none',
  rows: ['.....oooooo.....', '....oHHhHHHo....', '...oHHHHhHHHo...', '..oHHHHHHHHHHo..', '..oHHHHHHHHHHo..', '..oHfKKKfKKKfo..',
    '..oHfKQKfKQKfo..', '..offffffffffo..', '..offfffmmfffo..', '...offffffffo...', '.oCo.oTTTTo.....', '.oCooTTTTTTo.oAo',
    '.oCoTTTTTfffoAo.', '.oCoTTTTToAAAAo.', '.oCCCPPPPPPPPo..', 'oWWWWoMMMMMMPPo.', 'oWsWsWoMMMMoPPo.', 'oWWoWWo.oBBoPPo.',
    'oWsWsWo..oo.oSSo', '.oWWWo.....oMMo.', '..ooo......oWo..'],
  alt: { 16: 'oWWsWWoMMMMoPPo.', 17: 'oWsoWso.oBBoPPo.', 18: 'oWWsWWo..oo.oSSo', 20: '..ooo.......oWo.' },
  map: () => ({ H: '#4a2e1e', h: '#6a4430', f: '#e0b090', K: '#1a1a20', Q: '#a8d8ff', m: '#a05a4a', T: '#3a6ac8', C: '#2a2f3a', A: '#8a96a8', g: '#39ff6a', P: '#2a3550', W: '#1a1a20', s: '#8a96a8', M: '#5a6a82', B: '#3a4252', S: '#e6e6f0' }),
};

// ---------- evolved skins ----------
// Every fighter changes look once evolved (first EVOLUTION upgrade or wave 25; The Dev at 250% power).
// map recolors the base sprite, rows replaces whole rows. The Dev's evolved form is a full body.
const EVO = {
  BLADE: { name: 'ASHEN KAEL', map: { C: '#2a1418', l: '#ff6a2b', m: '#ffd447', M: '#c9a24a', s: '#ffd447', S: '#ff6a2b', E: '#fff2c0', a: '#3a2028', A: '#ff8a4a' } },
  GUNNER: { name: 'DEADEYE VEGA', map: { H: '#e8e0d0', h: '#c9a24a', r: '#1a1a24', R: '#0a0a10', D: '#7a1424', w: '#ffd447', e: '#ffd447' } },
  WIZARD: { name: 'ARCHMAGE MORROW', map: { H: '#f0eaff', h: '#b48cff', R: '#e8e0f0', r: '#ffd447', g: '#ff4fa8', e: '#ff4fa8' } },
  NINJA: { name: 'ONI RIN', map: { B: '#e8ecf4', h: '#ffffff', s: '#9aa4c0', V: '#e0223f', E: '#ff3b3b', e: '#7a0a1a', W: '#2a2838', N: '#c81e36', r: '#ffd447', S: '#14101c' }, rows: { 0: '.Ro.oooooooo.oR.' } },
  MECHANIC: { name: 'RIVET MK-II', map: { W: '#c9a24a', w: '#ffe08a', G: '#62efff', g: '#e0ffff', O: '#8b98ab', h: '#62efff', y: '#62efff' } },
  TANK: { name: 'TITAN GROM', map: { S: '#c9a24a', s: '#ffe08a', P: '#8a6a2a', h: '#2a2230', v: '#ff3b3b', w: '#ffd0d0' } },
  ROBOT: { name: 'UNIT-7 OMEGA', map: { M: '#2a2f3a', m: '#14161c', R: '#ffd447', A: '#ffd447', V: '#ff4fa8', C: '#5a1420' } },
  DEV: { name: 'ROOT', body: {
    // the hooded form keeps his chair, rebuilt: carbon frame, neon rims, a glowing hub and a holo screen
    lids: 'Vv', eye: [10, 6], legs: 'none',
    rows: ['....oooooooo....', '..ooHHhgghHHoo..', '.oHHhHHHHHHHHHo.', '.oHHHHHHHHHHHHo.', 'aoHHooooooooHHoa', 'aoHoffffffffoHoa',
      'aoHVVVVoVVVVoHoa', 'aoHVvVVoVvVVoHoa', 'aoHoffffffffoHoa', '.oHoffffmnffoHo.', '.oHHooooooooHHo.', '..ooHHHHHHHHoo..',
      '.ogoCCwCCwCCoyyo', '.oXoCCCCCffoyyyo', '.oXoCCCCCoKKKKo.', '.oXXXPPPPPPPPo..', 'oggggoXggggXPPo.', 'ogDDDgoXXXXoPPo.',
      'ogDcDgo.oZZoPPo.', 'ogDDDgo..oo.oSSo', '.ogggo.....oXXo.', '..ooo......ogo..'],
    alt: { 17: 'ogDcDgoXXXXoPPo.', 18: 'ogcDcgo.oZZoPPo.', 19: 'ogDcDgo..oo.oSSo', 21: '..ooo.......ogo.' },
    map: () => ({ H: '#1b1f27', h: '#2c3240', g: '#39ff6a', a: '#0f1014', V: '#39ff6a', v: '#c8ffd8', f: '#c8916a', m: '#39ff6a', n: '#5a2a20', C: '#20242e', w: '#e6e6f0',
      K: '#2a2f3a', y: '#9dffc0', X: '#2c3442', D: '#0b0c10', c: '#c8ffd8', Z: '#39ff6a', P: '#26304a', S: '#e6e6f0' }),
  } },
};
// the wave 50 boss stands: the hooded form without the chair
const DEV_HOOD = {
  lids: 'Vv', eye: [10, 6],
  rows: ['....oooooooo....', '..ooHHhgghHHoo..', '.oHHhHHHHHHHHHo.', '.oHHHHHHHHHHHHo.', 'aoHHooooooooHHoa', 'aoHoffffffffoHoa',
    'aoHVVVVoVVVVoHoa', 'aoHVvVVoVvVVoHoa', 'aoHoffffffffoHoa', '.oHoffffmnffoHo.', '.oHHooooooooHHo.', '..ooHHHHHHHHoo..',
    '...oCCwCCwCCo...', '..oKoCCgCCCoKo..', '...oCCkkkkCCo...', '...oCgCCCCgCo...'],
  map: () => ({ H: '#1b1f27', h: '#2c3240', g: '#39ff6a', a: '#0f1014', V: '#39ff6a', v: '#c8ffd8', f: '#c8916a', m: '#39ff6a', n: '#5a2a20', C: '#20242e', w: '#e6e6f0', k: '#101216', K: '#2a2f3a' }),
  leg: '#26304a', boot: '#e6e6f0',
};

// ---------- idle loops ----------
// Each fighter idles through 8 frames (about 7 per second). seq picks a pose per frame: A is the
// base sprite, B and C replace a few rows to move hair, scarves, antennas or a glint.
// IDLE_BREATH is how far the head and chest sink on each frame.
export const IDLE_BREATH = [0, 0, 0, 1, 1, 1, 1, 0];
const IDLE = {
  BLADE: { seq: 'AABBCCBB', B: { 14: '.SSoCaaKKaaCo...', 12: '...osSSSSSSso...' }, C: { 14: 'S.SoCaaKKaaCo...', 12: '..sosSSSSSSso...' } },
  GUNNER: { seq: 'AABBCCBB', B: { 11: '..orrrrrrrrro...' }, C: { 11: '.orrrrrrrrrro...', 15: '...oDDDooDDo....' } },
  WIZARD: { seq: 'AABBAACC', B: { 0: '..........oo....', 14: '..oRRRgrgRRRRo..' }, C: { 0: '........oo......', 14: '..oRRRrRrRRRRo..' } },
  NINJA: { seq: 'AABBAACC', B: { 11: '.oVVoffffffoVo..', 14: '..RoRRRRRRRRo...' }, C: { 11: '..oVoffffffoVVo.', 14: '.RRoRRRRRRRRo...' } },
  MECHANIC: { seq: 'AAAABBCC', B: { 5: '.oWogGGoogGGoWo.' }, C: { 5: '.oWoGGgooGGgoWo.' } },
  TANK: { seq: 'AABBCCBB', A: { 7: '.oSSowvvvvvoSSo.' }, B: { 7: '.oSSovvwvvvoSSo.' }, C: { 7: '.oSSovvvvwvoSSo.' } },
  ROBOT: { seq: 'AABBAACC', B: { 0: '...o........o...' }, C: { 7: '.oMoKKKRRKKKoMo.', 8: '.oMoKKRRRRKKoMo.', 9: '.oMoKKKRRKKKoMo.' } },
  // the laptop's status light blinks while he types
  DEV: { seq: 'AABBAACC', B: { 13: '.oCoTTTTToAgAAo.' }, C: { 13: '.oCoTTTTToAAgAo.', 12: '.oCoTTTTTffooAo.' } },
  DEV_EVO: { seq: 'AAAABBCC', B: { 7: 'aoHvVVVoVvVVoHoa', 12: '.ogoCCwCCwCCoy.o' }, C: { 7: 'aoHVVvVoVVVvoHoa', 13: '.oXoCCCCCffoy.yo' } },
};

function buildChar(d, il, recolor = {}, rowOver = {}) {
  const map = { o: P.ink0, L: d.leg, b: d.boot, ...d.map(), ...recolor };
  const base = d.rows.map((r, i) => rowOver[i] || r);
  const body = (alt) => base.map((r, i) => (alt && d.alt && d.alt[i]) || r);
  const legs = (k) => (d.legs === 'none' ? [] : d.legs === 'robe' ? (k === 'r1' || k === 'r3' ? ROBE_LEGS_ALT : ROBE_LEGS) : LEGS[k]);
  const sp = (alt, k) => makeSprite([...body(alt), ...legs(k)], map, d.lids);
  const set = { idle: sp(false, 'idle'), run: [sp(false, 'r0'), sp(true, 'r1'), sp(false, 'r2'), sp(true, 'r3')] };
  const poses = {};
  const pose = (k) => {
    if (k === 'A' && !il.A) return set.idle;
    const o = il[k] || {};
    return poses[k] || (poses[k] = makeSprite([...base.map((r, i) => o[i] || r), ...legs('idle')], map, d.lids));
  };
  set.idles = [...il.seq].map(pose);
  set.eye = d.eye;
  return set;
}
export const EVO_NAMES = Object.fromEntries(Object.entries(EVO).map(([k, v]) => [k, v.name]));

export function buildSprites() {
  const O = P.ink0;
  SPR.chars = {}; SPR.evo = {};
  for (const id in BODIES) {
    SPR.chars[id] = buildChar(BODIES[id], IDLE[id]);
    const ev = EVO[id];
    SPR.evo[id] = ev.body ? buildChar(ev.body, IDLE[id + '_EVO']) : buildChar(BODIES[id], IDLE[id], ev.map, ev.rows);
  }
  // the wave 50 boss is the evolved Dev, drawn three times bigger
  SPR.devbossSet = buildChar(DEV_HOOD, IDLE.DEV_EVO);
  SPR.devboss = SPR.devbossSet.idles;

  const HU = { o: O, H: '#7c4674', h: '#b06ea2', g: P.ichor, w: P.paper };
  const HUSK = ['...ooooo...', '..oHHHHHo..', '.oHhhHHHHo.', '.oHgHHHgHo.', 'oHHHHHHHHHo', 'oHhHHHHHhHo', 'oHHowowoHHo', '.oHHHHHHHo.'];
  SPR.husk = [makeSprite([...HUSK, '.oHo...oHo.', '.oo.....oo.'], HU, 'g'), makeSprite([...HUSK, '..oHo.oHo..', '..oo...oo..'], HU, 'g')];

  const WI = { o: O, V: '#5e3c9c', v: '#9d72e6', g: P.hex };
  const WISP = ['...ooo...', '..oVVVo..', '.oVvvVVo.', '.oVgVgVo.', '.oVVVVVo.', '.oVVoVVo.', '..oVVVo..', '..oVvVo..'];
  SPR.wisp = [makeSprite([...WISP, '...oVo...', '...oVo...', '....o....'], WI, 'g'), makeSprite([...WISP, '..oVo....', '...oVo...', '.....o...'], WI, 'g')];

  const BR = { o: O, K: '#3a3052', k: '#54466e', A: '#76658f', a: '#ad98c9', g: '#ff4f4f' };
  const BRUTE = ['.....oooooo.....', '....oKKKKKKo....', '...oKkggKgkKo...', '..ooKKKKKKKKoo..', '.oAAoKKKKKKoAAo.', 'oAaaAoooooooAaAo',
    'oAaAAAAAAAAAAAAo', 'oAAAAAaAAaAAAAAo', '.oAAAAAAAAAAAAo.', '.oAoAAAAAAAAoAo.', '..oooAAAAAAooo..', '...oAAAAAAAAo...'];
  SPR.brute = [
    makeSprite([...BRUTE, '...oAAo..oAAo...', '...oKKo..oKKo...', '...oooo..oooo...'], BR, 'g'),
    makeSprite([...BRUTE, '..oAAo....oAAo..', '..oKKo....oKKo..', '..oooo....oooo..'], BR, 'g'),
  ];

  const TI = { o: O, T: '#8c2a3a', t: '#d64a5c', r: P.ember3, f: P.ember };
  const TICK = ['....r....', '...ofo...', '..ooooo..', '.oTTTTTo.', 'oTtTTTtTo', 'oTTTTTTTo', '.oTTTTTo.'];
  SPR.tick = [makeSprite([...TICK, '.o.o.o.o.'], TI), makeSprite([...TICK, 'o.o.o.o.o'], TI)];

  const LV = { o: O, L: '#4f7a35', g: P.ichor };
  SPR.larva = [makeSprite(['.o...o.', 'oLo.oLo', '.oLLLo.', 'oLgLgLo', '.ooooo.'], LV, 'g'), makeSprite(['.......', 'oLo.oLo', '.oLLLo.', 'oLgLgLo', '.ooooo.'], LV, 'g')];
  const EG = { o: O, E: '#c9d48a', e: '#7d8a3a', g: P.ichor };
  SPR.egg = [
    makeSprite(['..ooo..', '.oEEEo.', 'oEeEEEo', 'oEEEeEo', 'oEEgEEo', '.oEEEo.', '..ooo..'], EG),
    makeSprite(['..ooo..', '.oEEEo.', 'oEeEEEo', 'oEEEeEo', 'oEgggEo', '.oEEEo.', '..ooo..'], EG),
  ];

  // ---------- creeps added later: slimes, spitters, shades ----------
  const SL = { o: O, S: '#4ad6c0', s: '#a8fff0', g: '#0e2e2a', m: '#1a5a52' };
  SPR.slime = [
    makeSprite(['...ooooo...', '..oSSSSSo..', '.oSsSSSSSo.', 'oSSgSSSgSSo', 'oSSSSSSSSSo', 'oSSSSmmSSSo', '.ooooooooo.'], SL, 'g'),
    makeSprite(['...........', '..ooooooo..', '.oSsSSSSSo.', 'oSSgSSSgSSo', 'oSSSSSSSSSo', 'oSSSmmSSSSo', 'ooooooooooo'], SL, 'g'),
  ];
  SPR.slimelet = [makeSprite(['.ooo.', 'oSsSo', 'ogSgo', 'ooooo'], SL), makeSprite(['.....', '.ooo.', 'ogSgo', 'ooooo'], SL)];
  const SP = { o: O, L: '#4f9a35', l: '#8fd04a', P: '#d6e24a', p: '#f6ff9a', g: '#ff4f4f', M: '#3a0a14', R: '#5a3a24' };
  const SPIT = ['..oo...oo..', '.oLLo.oLLo.', '.oLlLoLlLo.', '..oLLoLLo..', '...ooooo...', '..oPPPPPo..', '.oPpPPPPPo.', 'oPPgPPPgPPo', 'oPPPPPPPPPo'];
  SPR.spitter = [
    makeSprite([...SPIT, 'oPPoooooPPo', 'oPPoMMMoPPo', '.oPPoooPPo.', '..oRRRRRo..', '.oRoRRRoRo.'], SP, 'g'),
    makeSprite([...SPIT, 'oPoMMMMMoPo', 'oPPoMMMoPPo', '.oPPoooPPo.', '..oRRRRRo..', '.oRoRRRoRo.'], SP, 'g'),
  ];
  const SH = { o: O, V: '#4a3a8a', v: '#9a7aff', G: '#e8d8ff' };
  const SHADE = ['...ooooo...', '..oVVVVVo..', '.oVvVVVVVo.', '.oVoooooVo.', '.oVoGoGoVo.', '.oVoooooVo.', 'oVVVVVVVVVo', 'oVvVVVVVvVo', '.oVVVVVVVo.', '..oVVVVVo..'];
  SPR.shade = [makeSprite([...SHADE, '...oVVVo...', '....oVo....'], SH, 'G'), makeSprite([...SHADE, '...oVVo....', '...oVo.....'], SH, 'G')];

  // ---------- bosses ----------
  const WA = { o: O, B: '#c2b294', b: '#8a7a64', W: '#4a4068', w: '#7d6ea6', g: P.hex, R: '#4c2f4a', r: '#7c4a70', C: '#221a2c', c: '#3a2a48' };
  const WARDEN = ['....o..............o....', '...oBo............oBo...', '...oBbo..........obBo...', '....oBBo..oooo..oBBo....',
    '.....oBBooWWWWooBBo.....', '......oooWwwwwWooo......', '.......oWWWWWWWWo.......', '.......oWgWWWWgWo.......',
    '.......oWWWWWWWWo.......', '........oWWooWWo........', '.....oooooWWWWooooo.....', '...ooRRRRoooooooRRRRo...',
    '..oRRrRRRRWWWWRRRRrRRo..', '.oRRrRRRRWWwwWWRRRRrRRo.', '.oRrRRRRWWwWWwWWRRRRrRo.', '.oRrRRRoWWWWWWWWoRRRrRo.',
    '.oRRRRoWWWWggWWWWoRRRRo.', '..oRRRoWWWWWWWWWWoRRRo..', '..oRRoCCWWWWWWWWCCoRRo..', '..oRoCCCCWWWWWWCCCCoRo..',
    '...ooCCCCCCCCCCCCCCoo...', '....oCCcCCCCCCCCcCCo....', '....oCCCCCcCCcCCCCCo....'];
  SPR.warden = [
    makeSprite([...WARDEN, '....oCcCCCCCCCCCCcCo....', '.....oCCCoCCCCoCCCo.....', '.....oCCo.oCCo.oCCo.....', '......oo...oo...oo......'], WA, 'g'),
    makeSprite([...WARDEN, '....oCcCCCCCCCCCCcCo....', '....oCCCoCCCCCoCCCo.....', '....oCCo..oCCo..oCCo....', '.....oo....oo....oo.....'], WA, 'g'),
  ];

  const BM = { o: O, B: '#4a2a5c', b: P.ichor, H: '#5c3658', h: '#8a5480', g: '#ff4f4f', m: P.bone, M: P.bone, L: '#2f2642' };
  const BROOD = ['..........oooooooo..........', '........ooBBBBBBBBoo........', '.......oBBbBBBBBBbBBo.......', '......oBBbBBBbbBBBbBBo......',
    '......oBBBBBbBBbBBBBBo......', '......oBbBBBBBBBBBBbBo......', '.......oBBBBbBBbBBBBo.......', '..o.....ooBBBBBBBBoo.....o..',
    '.oLo......oHHHHHHo......oLo.', 'oLoLo....oHgHggHgHo....oLoLo', '...oLo..oHHHHHHHHHHo..oLo...', '....oLooHHhHHHHHHhHHooLo....',
    '.....oLoHHHHHHHHHHHHoLo.....', '...ooLoooHHHHHHHHHHoooLoo...', '..oLo.oLooHHmHHmHHooLo.oLo..'];
  SPR.brood = [
    makeSprite([...BROOD, '.oLo.oLo..oHHHHHHo..oLo.oLo.', 'oLo..oo....oMooMo....oo..oLo', 'oo.........oM..Mo.........oo', '............o..o............'], BM, 'g'),
    makeSprite([...BROOD, '..oLooLo..oHHHHHHo..oLooLo..', '.oLo..oo...oMooMo...oo..oLo.', '.oo.........oMMo.........oo.', '.............oo.............'], BM, 'g'),
  ];

  const IC = { o: O, I: '#5d6878', i: '#8b98ab', V: '#ff4f4f', r: '#ff7a2b', R: '#ffe08a', C: '#3a404c', c: '#62efff' };
  const COLOSSUS = ['........oooooooooo........', '.......oIIIIIIIIIIo.......', '......oIiiIIIIIIiiIo......', '......oIVVVVVVVVVVIo......',
    '......oIIIIIIIIIIIIo......', '...ooooooIIIIIIIIoooooo...', '..oIIIIIoooooooooIIIIIIo..', '.oIiiIIIIoIIIIIoIIIIiiIIo.',
    '.oIIIIIIoIIrrIIIoIIIIIIIo.', 'oCCCoIIoIIrRRrIIIoIIoCCCo.', 'oCcCoIIoIIIrrIIIIoIIoCcCo.', 'oCCCoIIoIIIIIIIIIoIIoCCCo.',
    'oCcCooooIIiIIIiIIooooCcCo.', 'oCCCo..oIIIIIIIIIo...oCCCo', '.ooo...oIIoooooIIo....ooo.', '.......oIIo...oIIo........'];
  SPR.colossus = [
    makeSprite([...COLOSSUS, '......oIIIo...oIIIo.......', '......oIiIo...oIiIo.......', '.....ooIIIoo.ooIIIoo......', '.....oIIIIIo.oIIIIIo......', '.....ooooooo.ooooooo......'], IC, 'V'),
    makeSprite([...COLOSSUS, '.......oIIIo..oIIIo.......', '.......oIiIo..oIiIo.......', '......ooIIIooooIIIoo......', '......oIIIIIooIIIIIo......', '......ooooooooooooooo.....'], IC, 'V'),
  ];

  const KG = { o: O, Y: '#ffd447', K: '#2a2230', F: P.ember, f: P.ember2, A: '#3a2f3a', a: '#6b5a6b', Q: '#5a1420', q: '#8a2a30' };
  const KING = ['.....o.o.oo.o.o.....', '.....oYoYooYoYo.....', '.....oYYYYYYYYo.....', '....oKKKKKKKKKKo....', '....oKFFKKKKFFKo....',
    '....oKKKKKKKKKKo....', '.....oKKKooKKKo.....', '..ooooooKKKKoooooo..', '.oAAAAAooooooAAAAAo.', 'oAaAAAAAKKKKAAAAAaAo',
    'oAAAAAAKKffKKAAAAAAo', 'oAaAAAKKKKKKKKAAAaAo', '.oAAAoKKKKKKKKoAAAo.', '.oAAoKKKKffKKKKoAAo.', '..ooQKKKKKKKKKKQoo..',
    '...oQQKKKKKKKKQQo...', '..oQQQQKKKKKKQQQQo..', '..oQqQQQQQQQQQQqQo..', '.oQQQQqQQQQQQqQQQQo.', '.oQqQQQQQQQQQQQQqQo.',
    'oQQQQQQqQQQQqQQQQQQo', 'oQqQQQQQQQQQQQQQQqQo'];
  SPR.king = [
    makeSprite([...KING, 'oQQQqQQQoQQoQQQqQQQo', '.ooQQQo.oQQo.oQQQoo.', '...ooo..oKKo..ooo...', '........oooo........'], KG, 'F'),
    makeSprite([...KING, '.oQQqQQQoQQoQQQqQQo.', 'oQQQo..oQQo..oQQQo..', '.ooo...oKKo...ooo...', '.......oooo.........'], KG, 'F'),
  ];

  // ---------- bosses after wave 20 ----------
  const WY = { o: O, V: '#5a2f9c', v: '#8b5ce0', g: P.hex, W: P.bone };
  const WYRM = ['....oooooooo....', '..ooVVVVVVVVoo..', '.oVVvvVVVVvvVVo.', 'oVVgVVVVVVVVgVVo', 'oVVVVVVVVVVVVVVo', 'oVVVVooooooVVVVo'];
  SPR.wyrm = [makeSprite([...WYRM, '.oVVoWWoWWoVVo..', '..oVo.o..o.oVo..', '...oo......oo...'], WY, 'g'), makeSprite([...WYRM, '.oVVoW.oW.oVVo..', '..oVoW.o.Wo.Vo..', '...oo......oo...'], WY, 'g')];
  SPR.wyrmSeg = makeSprite(['..oooooo..', '.oVVVVVVo.', 'oVvVVVVvVo', 'oVVVggVVVo', 'oVvVVVVvVo', '.oVVVVVVo.', '..oooooo..'], WY, 'g');
  const HE = { o: O, C: '#1f3a6a', E: '#62efff', Y: '#ffe08a', R: '#2a5aa0', r: '#62efff' };
  const HERALD = ['...o.o..o.o...', '...oYoooYo....', '...oooooooo...', '..oCCCCCCCCo..', '..oCooooooCo..', '..oCoEooEoCo..', '..oCoooooooCo.', '.ooCCCCCCCCCoo',
    'oRRoCCCCCCCoRRo', 'oRrRoCCYCCoRrRo', '.oRRRCCCCCRRRo.', '..oRRRRRRRRRo..', '..oRrRRRRRrRo..', '...oRRRRRRRo...', '....oRRRRRo....'];
  SPR.herald = [makeSprite([...HERALD, '.....oRRRo.....', '......oRo......', '.......o.......'], HE, 'E'), makeSprite([...HERALD, '....oRRRo......', '.....oRo.......', '......o........'], HE, 'E')];
  // eclipse: a black sun with a gold corona and a red slit eye, built from a circle
  const ecl = [];
  for (let y = 0; y < 28; y++) {
    let row = '';
    for (let x = 0; x < 28; x++) {
      const d = Math.hypot(x - 13.5, y - 13.5);
      row += d > 13.5 ? '.' : d > 12.5 ? 'o' : d > 10.5 ? (((x + y) % 3) ? 'G' : 'g') : d > 9.5 ? 'o' : Math.abs(x - 13.5) < 1.6 && Math.abs(y - 13.5) < 7 ? 'R' : d < 3 && x < 13 && y < 13 ? 'w' : 'B';
    }
    ecl.push(row);
  }
  // clockwork: a brass dial with twelve hour marks; its hands are drawn live
  const clk = [];
  for (let y = 0; y < 30; y++) {
    let row = '';
    for (let x = 0; x < 30; x++) {
      const d = Math.hypot(x - 14.5, y - 14.5), a = Math.atan2(y - 14.5, x - 14.5), hour = Math.abs(((a / (Math.PI / 6)) % 1 + 1) % 1 - 0.5) > 0.38;
      row += d > 14.5 ? '.' : d > 13.5 ? 'o' : d > 11.5 ? ((x + y) % 4 ? 'G' : 'g') : d > 10.5 ? 'o' : d > 8.5 && hour ? 'k' : d < 4 && x < 14 && y < 14 ? 'w' : 'F';
    }
    clk.push(row);
  }
  SPR.clock = [makeSprite(clk, { o: O, G: '#e8c070', g: '#a8803a', F: '#f4ead0', k: '#3a2410', w: '#fffaf0' })];
  SPR.eclipse = [makeSprite(ecl, { o: O, G: P.gold, g: P.ember2, B: '#0a0610', R: '#ff3b3b', w: '#2a1a30' })];

  // ---------- allies ----------
  SPR.turret = makeSprite(['...oooo...', '..oTTTTo..', '..oTttTo..', '..oTTTTo..', '.oooooooo.', '.oLLLLLLo.', 'oLoLLLLoLo', 'oo.oooo.oo'],
    { o: O, T: '#d8651e', t: '#ffe08a', L: '#5d6878' });
  SPR.coil = makeSprite(['..ooo..', '.oCcCo.', '..oCo..', '.oCcCo.', '..oCo..', '.oCcCo.', '..oCo..', '.ooooo.', 'oLLLLLo', 'ooooooo'],
    { o: O, C: '#62efff', c: '#ffffff', L: '#5d6878' });
  const GO = { o: O, J: '#7a6a58', j: '#a8967e', g: '#ffb347', r: '#3d3250' };
  const GOLEM = ['....oooooo......', '...oJJJJJJo.....', '..oJjJJJJjJo....', '..oJgJJJJgJo....', '..oJJJJJJJJo....', '.ooooJJJJoooo...',
    'oJJJoJJJJoJJJo..', 'oJjJJJJJJJJjJo..', 'oJJJJrJJrJJJJo..', 'oJJoJJJJJJoJJo..', 'oJJooJJJJooJJo..', '.oo.oJJJJo.oo...', '....oJJJJo......'];
  SPR.golem = [
    makeSprite([...GOLEM, '...oJJooJJo.....', '...oJJo.oJJo....', '...oooo.oooo....'], GO, 'g'),
    makeSprite([...GOLEM, '..oJJo..oJJo....', '..oJJo..oJJo....', '..oooo..oooo....'], GO, 'g'),
  ];

  const UI = { '#': P.blood, '+': P.paper, o: O, e: P.ink3 };
  SPR.heart = makeSprite(['.oo.oo.', 'o##o##o', 'o#+###o', 'o#####o', '.o###o.', '..o#o..', '...o...'], UI);
  SPR.heartE = makeSprite(['.oo.oo.', 'oeeoeeo', 'oeeeeeo', 'oeeeeeo', '.oeeeo.', '..oeo..', '...o...'], UI);
  SPR.heal = makeSprite(['.#.#.', '#+###', '#####', '.###.', '..#..'], UI);
  for (const k in iconCache) delete iconCache[k];
}

// 9x9 icons, '#' takes the given color, '+' is a highlight
export const ICONS = {
  blade: ['.......#+', '......#+#', '.....#+#.', '....#+#..', '.#.#+#...', '..##+....', '..##.....', '.#..#....', '#........'],
  bolt: ['....###..', '...###...', '..###....', '.#######.', '....###..', '...###...', '..##.....', '.##......', '#........'],
  flame: ['....#....', '...##....', '...###...', '..##+#...', '.##++##..', '.#++++#..', '.#+++##..', '..####...', '.........'],
  heart: ['.........', '.##.##...', '#+#####..', '#######..', '.#####...', '..###....', '...#.....', '.........', '.........'],
  dash: ['.........', '##...#...', '....##...', '###.###..', '....####.', '###.###..', '....##...', '##...#...', '.........'],
  orb: ['..#####..', '.#++...#.', '#++.....#', '#+......#', '#...#...#', '#.......#', '#.......#', '.#.....#.', '..#####..'],
  burst: ['....#....', '.#..#..#.', '..#.#.#..', '...###...', '####+####', '...###...', '..#.#.#..', '.#..#..#.', '....#....'],
  eye: ['.........', '..#####..', '.#.....#.', '#..###..#', '#..#+#..#', '#..###..#', '.#.....#.', '..#####..', '.........'],
  gun: ['.........', '.........', '.#######+', '.########', '.###.....', '.##......', '.##......', '.........', '.........'],
  rocket: ['......##+', '.....###+', '....###..', '...###...', '..###....', '.#.#.....', '#.#......', '.#.......', '.........'],
  shield: ['.#######.', '#+++++++#', '#+#####+#', '#+#####+#', '#+#####+#', '.#+###+#.', '..#+#+#..', '...#+#...', '....#....'],
  star: ['....#....', '....#....', '...###...', '#########', '.#+#+#+#.', '..#####..', '..##.##..', '.##...##.', '.#.....#.'],
  gear: ['...#.#...', '.#.###.#.', '..#####..', '###+.+###', '.##...##.', '###+.+###', '..#####..', '.#.###.#.', '...#.#...'],
  cross: ['#.......#', '.#.....#.', '..#...#..', '...#+#...', '...+#+...', '...#+#...', '..#...#..', '.#.....#.', '#.......#'],
  cloud: ['.........', '...###...', '.##+++##.', '#+++++++#', '#+++++++#', '.#######.', '.........', '.#..#..#.', '#..#..#..'],
  snow: ['....#....', '.#..#..#.', '..#.#.#..', '...+++...', '####+####', '...+++...', '..#.#.#..', '.#..#..#.', '....#....'],
  fist: ['.........', '.##.##...', '#++#++#..', '#++#++##.', '#++++++#.', '#+++++#..', '.#####...', '..###....', '.........'],
};
const iconCache = {};
export function icon(name, col) {
  const k = name + col;
  return iconCache[k] || (iconCache[k] = makeSprite(ICONS[name] || ICONS.blade, { '#': col, '+': P.paper }));
}
