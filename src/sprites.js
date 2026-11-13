import { makeSprite, P } from './gfx.js';

// Filled by buildSprites(), and rebuilt when the color theme changes.
export const SPR = {};

const LEGS = {
  idle: ['....obo.bo..', '....oo..oo..'],
  r0: ['...obo..bo..', '...oo...oo..'],
  r1: ['....oboobo..', '....oo.oo...'],
  r2: ['....obo..bo.', '....oo...oo.'],
  r3: ['....oboobo..', '.....oo.oo..'],
};

// ---------- the seven playable characters (12 wide, legs added below) ----------
const BODIES = {
  BLADE: {
    rows: ['....oooo....', '...occcCo...', '..occcccCo..', '..ocMmmmco..', '..oMmmmeeo..', '..oMmmmmmo..',
      '...osssSo...', '..osSSsscoo.', '.osoccccCCo.', '..oocccccCo.', '...occcccco.', '...okcccckoo'],
    alt: { 7: '.ossSSsscoo.', 8: 'os.occccCCo.' },
    map: () => ({ c: '#433764', C: '#6e5d9c', m: P.bone, M: '#b8a88c', e: P.ember, s: P.ember, S: P.ember2, b: '#191322', k: '#2a2240' }),
  },
  GUNNER: {
    rows: ['....oooo....', '...oHHHHo...', 'ooooHhhHoooo', 'oHHHHHHHHHHo', '.oooffffooo.', '...ofeefo...',
      '...offffo...', '..oppppppo..', '.oppPPppPpo.', '.opPppppPpo.', '..oppppppo..', '...okkkko...'],
    alt: { 9: 'oppPppppPpo.' },
    map: () => ({ H: '#5a3a28', h: P.gold, f: '#d9a27a', e: '#2a1a10', p: '#7a3b2a', P: '#e8b04a', k: '#2a1f1a', b: '#21160f' }),
  },
  WIZARD: {
    rows: ['.....oo.....', '....oHHo....', '...oHHHso...', '..oHHHHHHo..', '.oooooooooo.', '...offffo...',
      '...oeffeo...', '..oRRbbRRo..', '.oRRRbbRRRo.', '.oRrRRRRrRo.', '.oRRRRRRRRo.', '..oRRRRRRo..'],
    alt: { 11: '.oRRRRRRRo..' },
    map: () => ({ H: '#4b2f8a', s: '#ffd447', f: '#d9a27a', e: '#62efff', b: '#e6e6f0', R: '#5b3aa8', r: '#8a64e0', k: '#2a1f40' }),
    legs: 'robe',
  },
  NINJA: {
    rows: ['....oooo....', '...oNNNNo...', '..oNNNNNNo..', '..oNrrrrNo..', '..oNeNNeNo..', '..oNNNNNNoo.',
      '...oNNNNorr.', '..oNNnnNNo..', '.oNoNNNNoNo.', '...oNNNNo...', '...oNrrNo...', '...oNNNNo...'],
    alt: { 6: '...oNNNNo.rr', 5: '..oNNNNNNo.r' },
    map: () => ({ N: '#3a3452', n: '#5a5280', r: '#e0223f', e: '#fff6e0', b: '#1d1a28' }),
  },
  MECHANIC: {
    rows: ['....oooo....', '...oKKKKo...', '..oKKKKKKo..', '..oGgoGgKo..', '..offfffo...', '..offmffo...',
      '...oooooo...', '..oOOwOOOo..', '.oOoOOOOoOo.', '.ofoOtOOofo.', '...oOOOOo...', '...okOOko...'],
    map: () => ({ K: '#3a2a20', G: '#62efff', g: '#8a7a64', f: '#d9a27a', m: '#7a3b2a', O: '#d8651e', w: '#e6d8bd', t: '#3d3250', k: '#2a1f1a', b: '#2a1f1a' }),
  },
  TANK: {
    rows: ['...oooooo...', '..oSSSSSSo..', '.oSSsssSSSo.', '.oSvvvvvvSo.', '.oSSSSSSSSo.', 'ooooSSSSoooo',
      'oSSSoSSoSSSo', 'oSsSSSSSSsSo', 'oSSoSSSSoSSo', '.oooSSSSooo.', '...oSSSSo...', '...oSkkSo...'],
    map: () => ({ S: '#5a6a82', s: '#8fa2bd', v: '#ffb347', k: '#2a2f3a', b: '#2a2f3a' }),
    legs: 'heavy',
  },
  ROBOT: {
    rows: ['.....o......', '.....oA.....', '...oooooo...', '..oMMMMMMo..', '..oMVVVVMo..', '..oMMMMMMo..',
      '...oooooo...', '.ooMMmmMMoo.', 'oMoMMcMMMoMo', 'oMoMMMMMMoMo', '.o.oMMMMo.o.', '...oMmmMo...'],
    map: () => ({ M: '#9aa6b8', m: '#5c6678', V: '#62efff', c: '#62efff', A: '#ff4f4f', b: '#3a4252' }),
  },
};
const ROBE_LEGS = ['..oRRRRRRo..', '...oooooo...'];
const HEAVY = {
  idle: ['...obbo.obbo', '...oooo.oooo'], r0: ['..obbo..obbo', '..oooo..oooo'], r1: ['...obbobbo..', '...oooooo...'],
  r2: ['...obbo..obbo', '...oooo..oooo'], r3: ['...obbobbo..', '....oooooo..'],
};

function buildChar(id) {
  const d = BODIES[id];
  const map = { o: P.ink0, ...d.map() };
  const body = (alt) => d.rows.map((r, i) => (alt && d.alt && d.alt[i]) || r);
  const legs = (k) => (d.legs === 'robe' ? ROBE_LEGS : d.legs === 'heavy' ? HEAVY[k] : LEGS[k]);
  const sp = (alt, k) => makeSprite([...body(alt), ...legs(k)], map);
  return { idle: sp(false, 'idle'), run: [sp(false, 'r0'), sp(true, 'r1'), sp(false, 'r2'), sp(true, 'r3')] };
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
