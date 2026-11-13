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
    eye: [9, 5],
    rows: ['.....oooo.....', '....oCCCCo....', '...oCLLLCCo...', '..oCLLCCCCCo..', '..oCoooooooCo.', '..ooMmmmmeeoo.',
      '..oMMmmmmmmo..', '...oMMmmmmo...', '..oossSSSsoo..', '.osSSssssCCoo.', 'osSoCaaaaCLCo.', 'oso.oaAAaoCCo.',
      '.o..okkKkoCCo.', '....oaAaaoCLo.', '...oCCaaCCCLo.', '...oCCCCCCCCo.'],
    alt: { 10: 'SsooCaaaaCLCo.', 11: '.s..oaAAaoCCo.', 15: '..oCCCCCCCCCo.' },
    map: () => ({ C: '#3a2e58', L: '#5e4d8c', m: P.bone, M: '#a8987c', e: P.ember3, s: P.ember, S: P.ember2, a: '#4a4560', A: '#7a7498', k: '#2a2238', K: P.gold, b: '#191322' }),
  },
  GUNNER: {
    eye: [9, 5],
    rows: ['......oo......', '.....oHHo.....', '....oHhhHo....', 'ooooHHHHHHoooo', 'oHHHHHHHHHHHHo', '.ooofffffeooo.',
      '...orrrrrrro..', '...oorrrrroo..', '..oDDDwwDDDo..', '.oDDdDwwDdDDo.', '.oDdoDkKkDodDo', '.oDdoDDDDDodDo',
      '.oDDoDDoDDoDDo', '.oDDoDDoDDoDDo', '..oDDDo.oDDDo.', '..oooo...oooo.'],
    alt: { 14: '..oDDDo..oDDDo', 15: '..oooo....oooo' },
    map: () => ({ H: '#3a2418', h: P.gold, f: '#c08a64', e: P.gold, r: '#a01e30', D: '#6a3e24', d: '#8e5a34', w: '#d8c8a0', k: '#2a1a10', K: P.gold, b: '#21160f' }),
  },
  WIZARD: {
    eye: [6, 6],
    rows: ['.........oo...', '.......ooHo...', '......oHHo....', '.....oHsHo....', '....oHHHHHo...', '..ooooooooooo.',
      '....oKeKeKo...', '....obbbbbo...', '...oRbbbbbRo..', '..oRRrbbbrRRo.', '..oRrRRbRRrRo.', '..oRRRgRgRRRo.',
      '..oRRrRRRrRRo.', '.oRRRRRRRRRRRo', '.oRrRRRRRRRrRo', '.ooooooooooooo'],
    map: () => ({ H: '#3e2878', s: '#ffd447', K: '#160f22', e: '#62efff', b: '#e6e6f0', R: '#4a2f96', r: '#7d5ad6', g: '#62efff' }),
    legs: 'robe',
  },
  NINJA: {
    eye: [8, 5],
    rows: ['..........o...', '.....oooooKo..', '....oNNNNoKo..', '...oNNNNNNoKo.', '...oNrrrrNNo..', '...oNeNNeNNo..',
      '...oNNNNNNoro.', '....oNNNNorrro', '...onrrrrno.ro', '..oNNnnnnNNo..', '.oNoNNnnNNoNo.', '.oNooNNNNooNo.',
      '..o.oNrrNo.o..', '....oNNNNo....', '....onnNNo....', '....oNNNNo....'],
    alt: { 7: '....oNNNNorr.o', 8: '...onrrrrnorr.' },
    map: () => ({ N: '#3e3858', n: '#615a8a', r: '#e0223f', e: '#ff5050', K: '#8a7a64', b: '#1d1a28' }),
  },
  MECHANIC: {
    eye: [4, 3],
    rows: ['....oooo......', '...oKKKKo.....', '..oKKKKKKoo...', '..oGGoGGKPPo..', '..offfffoPpo..', '..offmmfoPpo..',
      '..oobbbboPPo..', '.oOOOwwOOOPo..', 'oOOoOOOOOoOo..', 'oggoOtTtOoOo..', 'oggoOOOOOooo..', '.oo.okkkko....',
      '....oOOOOo....', '....oOOOOo....'],
    map: () => ({ K: '#2a1a14', G: '#62efff', P: '#5d6878', p: '#8b98ab', f: '#d9a27a', m: '#7a3b2a', b: '#5a3a28', O: '#d8651e', w: '#e6d8bd', g: '#6a6a78', t: '#3d3250', T: '#ffd447', k: '#2a1f1a' }),
  },
  TANK: {
    eye: [8, 4],
    rows: ['.h............h.', '.hh..oooooo..hh.', '..oooSSSSSSooo..', '...oSSssssSSo...', '...oSvvvvvvSo...', '...oSSSvvSSSo...',
      '..ooSSSSSSSSoo..', 'ooPPPoSSSSoPPPoo', 'oPpPPPoSSoPPPpPo', 'oPPPPoSssSoPPPPo', '.ooooSSSKSSoooo.', '...oSSsSSsSSo...',
      '...oSSSSSSSSo...', '...okkkkkkkko...', '...oSSSooSSSo...'],
    map: () => ({ h: '#e6d8bd', S: '#5a6a82', s: '#8fa2bd', v: '#ff9a3c', P: '#3c4a63', p: '#8fa2bd', K: P.gold, k: '#2a2f3a' }),
    legs: 'heavy',
  },
  ROBOT: {
    eye: [7, 4],
    rows: ['......oA......', '......oo......', '....oooooo....', '...oMMMMMMo...', '..oMmVVVVVMo..', '..oMMMMMMMMo..',
      '...oommmmoo...', '.ooMMooooMMoo.', 'oMMmMMMMMMmMMo', 'oMmoMMcCMMomMo', 'oMMoMMccMMoMMo', '.ooomMMMMmooo.',
      '...oMmmmmMo...', '...oMMooMMo...'],
    map: () => ({ M: '#9aa6b8', m: '#5c6678', V: '#62efff', c: '#62efff', C: '#ffffff', A: '#ff4f4f', b: '#3a4252' }),
  },
};
const ROBE_LEGS = ['..oRRRRRRRRo..', '...oooooooo...'];
const HEAVY = {
  idle: ['...oSSo..oSSo...', '...oooo..oooo...'], r0: ['..oSSo....oSSo..', '..oooo....oooo..'], r1: ['....oSSooSSo....', '....oooooooo....'],
  r2: ['...oSSo...oSSo..', '...oooo...oooo..'], r3: ['....oSSooSSo....', '.....oooooo.....'],
};

function buildChar(id) {
  const d = BODIES[id];
  const map = { o: P.ink0, ...d.map() };
  const body = (alt) => d.rows.map((r, i) => (alt && d.alt && d.alt[i]) || r);
  const legs = (k) => (d.legs === 'robe' ? ROBE_LEGS : d.legs === 'heavy' ? HEAVY[k] : LEGS[k]);
  const sp = (alt, k) => makeSprite([...body(alt), ...legs(k)], map);
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
  SPR.husk = [makeSprite([...HUSK, '.oHo...oHo.', '.oo.....oo.'], HU), makeSprite([...HUSK, '..oHo.oHo..', '..oo...oo..'], HU)];

  const WI = { o: O, V: '#5e3c9c', v: '#9d72e6', g: P.hex };
  const WISP = ['...ooo...', '..oVVVo..', '.oVvvVVo.', '.oVgVgVo.', '.oVVVVVo.', '.oVVoVVo.', '..oVVVo..', '..oVvVo..'];
  SPR.wisp = [makeSprite([...WISP, '...oVo...', '...oVo...', '....o....'], WI), makeSprite([...WISP, '..oVo....', '...oVo...', '.....o...'], WI)];

  const BR = { o: O, K: '#3a3052', k: '#54466e', A: '#76658f', a: '#ad98c9', g: '#ff4f4f' };
  const BRUTE = ['.....oooooo.....', '....oKKKKKKo....', '...oKkggKgkKo...', '..ooKKKKKKKKoo..', '.oAAoKKKKKKoAAo.', 'oAaaAoooooooAaAo',
    'oAaAAAAAAAAAAAAo', 'oAAAAAaAAaAAAAAo', '.oAAAAAAAAAAAAo.', '.oAoAAAAAAAAoAo.', '..oooAAAAAAooo..', '...oAAAAAAAAo...'];
  SPR.brute = [
    makeSprite([...BRUTE, '...oAAo..oAAo...', '...oKKo..oKKo...', '...oooo..oooo...'], BR),
    makeSprite([...BRUTE, '..oAAo....oAAo..', '..oKKo....oKKo..', '..oooo....oooo..'], BR),
  ];

  const TI = { o: O, T: '#8c2a3a', t: '#d64a5c', r: P.ember3, f: P.ember };
  const TICK = ['....r....', '...ofo...', '..ooooo..', '.oTTTTTo.', 'oTtTTTtTo', 'oTTTTTTTo', '.oTTTTTo.'];
  SPR.tick = [makeSprite([...TICK, '.o.o.o.o.'], TI), makeSprite([...TICK, 'o.o.o.o.o'], TI)];

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
    makeSprite([...WARDEN, '....oCcCCCCCCCCCCcCo....', '.....oCCCoCCCCoCCCo.....', '.....oCCo.oCCo.oCCo.....', '......oo...oo...oo......'], WA),
    makeSprite([...WARDEN, '....oCcCCCCCCCCCCcCo....', '....oCCCoCCCCCoCCCo.....', '....oCCo..oCCo..oCCo....', '.....oo....oo....oo.....'], WA),
  ];

  const BM = { o: O, B: '#4a2a5c', b: P.ichor, H: '#5c3658', h: '#8a5480', g: '#ff4f4f', m: P.bone, M: P.bone, L: '#2f2642' };
  const BROOD = ['..........oooooooo..........', '........ooBBBBBBBBoo........', '.......oBBbBBBBBBbBBo.......', '......oBBbBBBbbBBBbBBo......',
    '......oBBBBBbBBbBBBBBo......', '......oBbBBBBBBBBBBbBo......', '.......oBBBBbBBbBBBBo.......', '..o.....ooBBBBBBBBoo.....o..',
    '.oLo......oHHHHHHo......oLo.', 'oLoLo....oHgHggHgHo....oLoLo', '...oLo..oHHHHHHHHHHo..oLo...', '....oLooHHhHHHHHHhHHooLo....',
    '.....oLoHHHHHHHHHHHHoLo.....', '...ooLoooHHHHHHHHHHoooLoo...', '..oLo.oLooHHmHHmHHooLo.oLo..'];
  SPR.brood = [
    makeSprite([...BROOD, '.oLo.oLo..oHHHHHHo..oLo.oLo.', 'oLo..oo....oMooMo....oo..oLo', 'oo.........oM..Mo.........oo', '............o..o............'], BM),
    makeSprite([...BROOD, '..oLooLo..oHHHHHHo..oLooLo..', '.oLo..oo...oMooMo...oo..oLo.', '.oo.........oMMo.........oo.', '.............oo.............'], BM),
  ];

  const IC = { o: O, I: '#5d6878', i: '#8b98ab', V: '#ff4f4f', r: '#ff7a2b', R: '#ffe08a', C: '#3a404c', c: '#62efff' };
  const COLOSSUS = ['........oooooooooo........', '.......oIIIIIIIIIIo.......', '......oIiiIIIIIIiiIo......', '......oIVVVVVVVVVVIo......',
    '......oIIIIIIIIIIIIo......', '...ooooooIIIIIIIIoooooo...', '..oIIIIIoooooooooIIIIIIo..', '.oIiiIIIIoIIIIIoIIIIiiIIo.',
    '.oIIIIIIoIIrrIIIoIIIIIIIo.', 'oCCCoIIoIIrRRrIIIoIIoCCCo.', 'oCcCoIIoIIIrrIIIIoIIoCcCo.', 'oCCCoIIoIIIIIIIIIoIIoCCCo.',
    'oCcCooooIIiIIIiIIooooCcCo.', 'oCCCo..oIIIIIIIIIo...oCCCo', '.ooo...oIIoooooIIo....ooo.', '.......oIIo...oIIo........'];
  SPR.colossus = [
    makeSprite([...COLOSSUS, '......oIIIo...oIIIo.......', '......oIiIo...oIiIo.......', '.....ooIIIoo.ooIIIoo......', '.....oIIIIIo.oIIIIIo......', '.....ooooooo.ooooooo......'], IC),
    makeSprite([...COLOSSUS, '.......oIIIo..oIIIo.......', '.......oIiIo..oIiIo.......', '......ooIIIooooIIIoo......', '......oIIIIIooIIIIIo......', '......ooooooooooooooo.....'], IC),
  ];

  const KG = { o: O, Y: '#ffd447', K: '#2a2230', F: P.ember, f: P.ember2, A: '#3a2f3a', a: '#6b5a6b', Q: '#5a1420', q: '#8a2a30' };
  const KING = ['.....o.o.oo.o.o.....', '.....oYoYooYoYo.....', '.....oYYYYYYYYo.....', '....oKKKKKKKKKKo....', '....oKFFKKKKFFKo....',
    '....oKKKKKKKKKKo....', '.....oKKKooKKKo.....', '..ooooooKKKKoooooo..', '.oAAAAAooooooAAAAAo.', 'oAaAAAAAKKKKAAAAAaAo',
    'oAAAAAAKKffKKAAAAAAo', 'oAaAAAKKKKKKKKAAAaAo', '.oAAAoKKKKKKKKoAAAo.', '.oAAoKKKKffKKKKoAAo.', '..ooQKKKKKKKKKKQoo..',
    '...oQQKKKKKKKKQQo...', '..oQQQQKKKKKKQQQQo..', '..oQqQQQQQQQQQQqQo..', '.oQQQQqQQQQQQqQQQQo.', '.oQqQQQQQQQQQQQQqQo.',
    'oQQQQQQqQQQQqQQQQQQo', 'oQqQQQQQQQQQQQQQQqQo'];
  SPR.king = [
    makeSprite([...KING, 'oQQQqQQQoQQoQQQqQQQo', '.ooQQQo.oQQo.oQQQoo.', '...ooo..oKKo..ooo...', '........oooo........'], KG),
    makeSprite([...KING, '.oQQqQQQoQQoQQQqQQo.', 'oQQQo..oQQo..oQQQo..', '.ooo...oKKo...ooo...', '.......oooo.........'], KG),
  ];

  // ---------- allies ----------
  SPR.turret = makeSprite(['...oooo...', '..oTTTTo..', '..oTttTo..', '..oTTTTo..', '.oooooooo.', '.oLLLLLLo.', 'oLoLLLLoLo', 'oo.oooo.oo'],
    { o: O, T: '#d8651e', t: '#ffe08a', L: '#5d6878' });
  SPR.coil = makeSprite(['..ooo..', '.oCcCo.', '..oCo..', '.oCcCo.', '..oCo..', '.oCcCo.', '..oCo..', '.ooooo.', 'oLLLLLo', 'ooooooo'],
    { o: O, C: '#62efff', c: '#ffffff', L: '#5d6878' });
  const GO = { o: O, J: '#7a6a58', j: '#a8967e', g: '#ffb347', r: '#3d3250' };
  const GOLEM = ['....oooooo......', '...oJJJJJJo.....', '..oJjJJJJjJo....', '..oJgJJJJgJo....', '..oJJJJJJJJo....', '.ooooJJJJoooo...',
    'oJJJoJJJJoJJJo..', 'oJjJJJJJJJJjJo..', 'oJJJJrJJrJJJJo..', 'oJJoJJJJJJoJJo..', 'oJJooJJJJooJJo..', '.oo.oJJJJo.oo...', '....oJJJJo......'];
  SPR.golem = [
    makeSprite([...GOLEM, '...oJJooJJo.....', '...oJJo.oJJo....', '...oooo.oooo....'], GO),
    makeSprite([...GOLEM, '..oJJo..oJJo....', '..oJJo..oJJo....', '..oooo..oooo....'], GO),
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
