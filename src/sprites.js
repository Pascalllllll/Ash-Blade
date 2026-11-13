import { makeSprite, P } from './gfx.js';

// Filled by buildSprites(), and rebuilt when the color theme changes.
export const SPR = {};

const LEGS = {
  idle: ['....obo..obo..', '....ooo..ooo..'],
  r0: ['...obo....obo.', '...ooo....ooo.'],
  r1: ['.....obobo....', '.....ooooo....'],
  r2: ['....obo...obo.', '....ooo...ooo.'],
  r3: ['.....obobo....', '......oooo....'],
};

// ---------- the seven playable characters ----------
// eye: the pixel that glows (facing right). Sprites are drawn with their feet on the ground point.
const BODIES = {
  BLADE: {
    lids: 'e', eye: [9, 5],
    rows: ['.....oooo.....', '....oCCCCo....', '...oCLLLCCo...', '..oCLLCCCCCo..', '..oCoooooooCo.', '..ooMmmmmeeoo.',
      '..oMMmmmmmmo..', '...oMMmmmmo...', '..oossSSSsoo..', '.osSSssssCCoo.', 'osSoCaaaaCLCo.', 'oso.oaAAaoCCo.',
      '.o..okkKkoCCo.', '....oaAaaoCLo.', '...oCCaaCCCLo.', '...oCCCCCCCCo.'],
    alt: { 10: 'SsooCaaaaCLCo.', 11: '.s..oaAAaoCCo.', 15: '..oCCCCCCCCCo.' },
    map: () => ({ C: '#3a2e58', L: '#5e4d8c', m: P.bone, M: '#a8987c', e: P.ember3, s: P.ember, S: P.ember2, a: '#4a4560', A: '#7a7498', k: '#2a2238', K: P.gold, b: '#191322' }),
  },
  GUNNER: {
    lids: 'e', eye: [9, 5],
    rows: ['......oo......', '.....oHHo.....', '....oHhhHo....', 'ooooHHHHHHoooo', 'oHHHHHHHHHHHHo', '.ooofffffeooo.',
      '...orrrrrrro..', '...oorrrrroo..', '..oDDDwwDDDo..', '.oDDdDwwDdDDo.', '.oDdoDkKkDodDo', '.oDdoDDDDDodDo',
      '.oDDoDDoDDoDDo', '.oDDoDDoDDoDDo', '..oDDDo.oDDDo.', '..oooo...oooo.'],
    alt: { 14: '..oDDDo..oDDDo', 15: '..oooo....oooo' },
    map: () => ({ H: '#3a2418', h: P.gold, f: '#c08a64', e: P.gold, r: '#a01e30', D: '#6a3e24', d: '#8e5a34', w: '#d8c8a0', k: '#2a1a10', K: P.gold, b: '#21160f' }),
  },
  WIZARD: {
    lids: 'e', eye: [7, 5], wide: true,
    rows: ['.......oo.......', '......oHHo......', '.....oHHHHo.....', '....oHHhHHHo....', '...oHHoooooHo...', '...oHoKeKKeoHo..',
      '..ooHoKKmmKoHoo.', '.oSSoHoooooHoSSo', 'oSSRRoHgggHoRRSo', '.oRRrRRRRRRrRRo.', '.oRrRRRgRgRRrRo.', 'oRRoRRRRRRRRoRRo',
      'oKKoRRrkkrRRoKKo', '.oo.oRRRRRRo.oo.', '....oRrRRrRo....', '...oRRRRRRRRo...'],
    map: () => ({ H: '#2a1d4a', h: '#4a3580', K: '#0c0816', e: '#62efff', m: '#e6d8bd', S: '#8a7a9a', R: '#3a2766', r: '#6a4ab8', g: '#b48cff', k: '#1a1030' }),
    legs: 'robe',
  },
  NINJA: {
    lids: 'E', eye: [9, 5], wide: true,
    rows: ['.....oooooo.....', '....oBBBBBBo.Ko.', '...oBBbBBBBBoKo.', '...oBBBBBBBBoK..', '...oBoffffBBoK..', '...oBfEffEfBo...',
      '...oBffflfBBo...', '....oofffoo.....', '...oWNNrrNNWo...', '..oWWNWrrWNWWo..', '..oWoWWWWWWoWo..', '..ofoWWWWWWofo..',
      '....oSSSSSSo....', '...oSsSsSsSSo...', '....oLLooLLo....', '....oLLooLLo....'],
    alt: { 8: '...oWNNrNNNWo...', 13: '...oSSsSsSsSo...' },
    map: () => ({ B: '#3a7bd5', b: '#8ec5ff', K: '#c9a24a', f: '#f0c8a8', E: '#ff4f7a', l: '#c0504a', W: '#e8e6f0', N: '#24305a', r: '#e0223f', S: '#24305a', s: '#3a4a80', L: '#1a1a24', b2: '#2a2a3a' }),
  },
  MECHANIC: {
    lids: 'G', eye: [6, 3], wide: true,
    rows: ['.....oooooo.....', '....oWWWWWWo.xx.', '...oWWwwwwWWoxx.', '...oWGGGGGGWoxo.', '...oWWWWWWWWoPo.', '...ooWWddWWooPo.',
      '..oOOoooooooOPo.', '.oOOOOOhhOOOoCCo', 'oggoOOOhhOOoCcCo', 'oggoOyKyKyOoCCCC', '.oo.oOOOOOOoCcoC', '....okkTkkko.oCo',
      '....oOOOOOOo....', '....oOOooOOo....'],
    map: () => ({ W: '#4a4f5c', w: '#7a8090', G: '#ff9a3c', x: '#ff6a2b', P: '#3a3f4a', d: '#2a2a30', O: '#d8651e', h: '#ffd447', g: '#3a3f4a', y: '#ffd447', K: '#1a1a20', C: '#8b98ab', c: '#62efff', k: '#2a1f1a', T: '#ffd447', b: '#2a1f1a' }),
  },
  TANK: {
    lids: 'v', eye: [8, 4],
    rows: ['.h............h.', '.hh..oooooo..hh.', '..oooSSSSSSooo..', '...oSSssssSSo...', '...oSvvvvvvSo...', '...oSSSvvSSSo...',
      '..ooSSSSSSSSoo..', 'ooPPPoSSSSoPPPoo', 'oPpPPPoSSoPPPpPo', 'oPPPPoSssSoPPPPo', '.ooooSSSKSSoooo.', '...oSSsSSsSSo...',
      '...oSSSSSSSSo...', '...okkkkkkkko...', '...oSSSooSSSo...'],
    map: () => ({ h: '#e6d8bd', S: '#5a6a82', s: '#8fa2bd', v: '#ff9a3c', P: '#3c4a63', p: '#8fa2bd', K: P.gold, k: '#2a2f3a' }),
    legs: 'heavy',
  },
  ROBOT: {
    lids: 'ER', eye: [7, 4], wide: true,
    rows: ['..o..........o..', '..oA........Ao..', '...oA.oooo.Ao...', '....ooMMMMoo....', '....oMmERmMo....', '....oMMMMMMo....',
      '..ooomMmmMmooo..', '.oCCoMMMMMMoCCo.', 'oCcCoMmVVmMoCcCo', 'oCCooMVWWVMooCCo', '.oooMMmVVmMMooo.', '...oMoMMMMoMo...',
      '...oFoMmmMoFo...', '....ooMMMMoo....', '....oMMooMMo....'],
    map: () => ({ M: '#8a96a8', m: '#4a5466', A: '#ff4f4f', E: '#ffffff', R: '#ff3b3b', C: '#3a4252', c: '#ff4f4f', V: '#62efff', W: '#ffffff', F: '#5c6678', b: '#3a4252' }),
  },
};
BODIES.DEV = {
  lids: 'V', eye: [9, 5], legs: 'dev',
  rows: ['......oooooo......', '.....oHHHHHHo.....', '....oHHhgghHHo....', '...oHHhHHHHhHHo...', '..oaHHoooooooHao..', '..oaHoVVVVVVVoHao.',
    '..oaHoVvVVVvVoHao.', '...oHHoffffoHHo...', '...ooHHomnoHHoo...', '..oCCoHHHHHHoCCo..', '.oCCgCoCCCCoCgCCo.', 'oCCCgCCCwCwCCgCCCo',
    'oCCoCCCCwCwCCCoCCo', 'oCgoCCkkkkkkCCogCo', 'oKKoCCCCgCCCCCoKKo', '.oo.oCCCgCCCCCo.oo', '....oCCCCCCCCCo...', '....oCgCCCCCgCo...',
    '...oCCCoooooCCCo..'],
  map: () => ({ H: '#1b1f27', h: '#2c3240', g: '#39ff6a', a: '#0f1014', V: '#39ff6a', v: '#c8ffd8', f: '#c8916a', m: '#39ff6a', n: '#5a2a20', C: '#20242e', w: '#e6e6f0', k: '#101216', K: '#2a2f3a', J: '#26304a', S: '#e6e6f0' }),
};
const DEV_LEGS = {
  idle: ['.....oJo..oJo.....', '.....oSo..oSo.....'], r0: ['....oJo....oJo....', '....oSo....oSo....'], r1: ['......oJooJo......', '......oSooSo......'],
  r2: ['.....oJo...oJo....', '.....oSo...oSo....'], r3: ['......oJooJo......', '.......oSSo.......'],
};
const ROBE_LEGS = ['..oRoRRoRRoRRo..', '..o.o..o..o.o...'];
const ROBE_LEGS_ALT = ['..oRRoRRoRRoRo..', '...o.o..o..o.o..'];
const HEAVY = {
  idle: ['...oSSo..oSSo...', '...oooo..oooo...'], r0: ['..oSSo....oSSo..', '..oooo....oooo..'], r1: ['....oSSooSSo....', '....oooooooo....'],
  r2: ['...oSSo...oSSo..', '...oooo...oooo..'], r3: ['....oSSooSSo....', '.....oooooo.....'],
};

function buildChar(id) {
  const d = BODIES[id];
  const map = { o: P.ink0, ...d.map() };
  const body = (alt) => d.rows.map((r, i) => (alt && d.alt && d.alt[i]) || r);
  const pad = (rows) => (d.wide ? rows.map((r) => '.' + r + '.') : rows);
  const legs = (k) => (d.legs === 'dev' ? DEV_LEGS[k] : d.legs === 'robe' ? (k === 'r1' || k === 'r3' ? ROBE_LEGS_ALT : ROBE_LEGS) : d.legs === 'heavy' ? HEAVY[k] : pad(LEGS[k]));
  const sp = (alt, k) => makeSprite([...body(alt), ...legs(k)], map, d.lids);
  const set = { idle: sp(false, 'idle'), run: [sp(false, 'r0'), sp(true, 'r1'), sp(false, 'r2'), sp(true, 'r3')] };
  set.eye = d.eye;
  return set;
}

export function buildSprites() {
  const O = P.ink0;
  SPR.chars = {};
  for (const id in BODIES) SPR.chars[id] = buildChar(id);

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
