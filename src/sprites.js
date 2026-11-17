import { installHeroSprites } from './hero-sprites.js?v=170';
import { makeSprite, P } from './gfx.js?v=170';

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
// The fighters picked from the skin sets: whole pixel grids without outlines (the builder outlines them).
// flow: letters that flutter in the wind (hair and cloth); legs 'baked': the last two rows are feet that
// walk in the run frames. Vega and Unit-7 keep their original hand-outlined sprites.
const BODIES = {
  GUNNER: {
    lids: 'E', eye: [10, 7], flow: 'YrRD',
    rows: ['.....oooooo.....', '..o.oHHHHHHo.o..', '.oHohhhhhhhhoHo.', 'oHHHHHHHHHHHHHHo', '.oooYYYYYYYYooo.', '.oYYYYYYYYYYYYo.',
      '.oYYfKKffKKfYYo.', '.oYYfEEffEEfYYo.', '.oYYffffffffYYo.', '.oYrrrrrrrrrrYo.', '.oYorrrRrrrroYo.', '..oYorrrRrroYo..',
      '...oDDwwwwDDo...', '..ofoDDwwDDofo..', '...oDkKhhKkDo...', '...oDDDooDDDo...'],
    map: () => ({ H: '#3a2418', h: P.gold, Y: '#5a3420', f: '#c08a64', K: '#2a1a10', E: '#f0e0c0', r: '#a01e30', R: '#7a1424', D: '#6a3e24', w: '#d8c8a0', k: '#2a1a10' }),
    leg: '#3a2a20', boot: '#21160f',
  },
  WIZARD: { auto: true, legs: 'baked', lids: '', eye: [10, 11], flow: 'Aaz', swing: { letter: 'U', fill: 'T', rows: { 16: [0, -1, -1, 0], 15: [0, 0, -1, 0] } },
    rows: [
      '..AA............', '...AAA..........', '....AAAA........', '....AAAAAAA.....',
      '...AAAAaaAAA....', '..AAAaaAAAAAA...', '.AAaAAAAAAAAAA..', '.AAAAAAAAAAAAAA.',
      '.AAASSSSSSSSAAA.', '.AASSSSSSSSSSAA.', '.AASSSSSSSSSSAA.', '.AASSEESSEESSAA.',
      '.AAUSSSSSSSSUAA.', '.AAAUUUUUUUUAAA.', 'AAAUUuUUUUuUUAAA', 'AA.zUUuUUuUUz.AA',
      '...fTTUUuUTTf.z.', '....zzzUuzzz....', '...BBbBBbBBbB...', '.....LL..LL.....',
      '.....GG..GG.....',
    ],
    map: () => ({ S: '#140c26', f: '#e0b898', F: '#c09878', K: '#0c0816', E: '#62efff', w: '#ffffff', m: '#7a3a3a', A: '#2a1d4a', a: '#4a3580', U: '#e6d8bd', u: '#b8aa90', z: '#b48cff', J: P.gold, T: '#3a2766', t: '#6a4ab8', B: '#3a2766', b: '#6a4ab8', L: '#2a1d4a', G: '#140c24' }),
  },
  NINJA: { auto: true, legs: 'baked', lids: 'Eew',
    // running like a ninja: both arms swept straight back, the sleeve trailing off the back shoulder
    run: { 11: '...UUTzzTzzU....', 12: '.fUUUTTTzTTU....', 13: 'f.XXXXXXXXxXX...' },
    // slim legs under a short pleated skirt: bare knees, white knee socks, little shoes.
    // The first row is empty so the skirt hem shows over the thighs; the legs stride apart and pass each other.
    feet: {
      idle: ['................', '.....offoffo....', '.....oWWoWWo....', '.....oWWoWWo....', '.....oVVoVVo....'],
      r0: ['................', '....offo.offo...', '...oWWo...oWWo..', '...oWWo...oWWo..', '...oVVo...oVVo..'],
      r1: ['................', '.....offoffo....', '.....oWWoWWo....', '......oWWWo.....', '......oVVVo.....'],
      r2: ['................', '....offo.offo...', '...oWWo...oWWo..', '..oWWo.....oWWo.', '..oVVo.....oVVo.'],
      r3: ['................', '.....offoffo....', '......oWWWo.....', '......oWWWo.....', '.......oVVo.....'],
    }, eye: [10, 7], flow: 'HhYqZSsXx',
    rows: [
      '...HHHHHHHH.h...', '..HHhhhHHHHHHh..', '.qHhHHHHHHHHHH..', '.ZqHHHHHHYHHHHZ.',
      '..HHHHYYHHYZfHH.', '.HHYYZHZZffffYH.', '.YHZZfKffKKffZH.', '.ZYffwEffwEffYZ.',
      '..ZffEeffEeffZ..', '...ppfffmffpp...', '.....ffffff.....', '....UTzzTzzU....',
      '...fUTTTzTTUf...', '..XXXXXXXXxXX...', '.XXSSsSSsSSsSX..', '.XxSsSSsSSsSSs..',
      '.XX.............',
    ],
    map: () => ({ w: '#ffffff', Y: '#9a8ae8', q: '#d8b8ff', Z: '#ff8fc8', f: '#f4d2b8', K: '#14101c', E: '#a070ff', e: '#4a2a9a', m: '#c0504a', p: '#f08a9a', H: '#34a9c9', h: '#8be4f0', U: '#f2efe8', z: '#e0223f', T: '#f2efe8', S: '#24305a', s: '#4a5c9a', W: '#f4f2fa', V: '#3a1a24', X: '#b8283c', x: '#e04a5a' }),
  },
  // Rivet, from her portrait, petite: a dark cap with brass goggles and cyan lenses, long messy brown hair,
  // big sparkly eyes with blush, an orange neckerchief, a white tank top, the jumpsuit tied at her waist with
  // its sleeves trailing behind, a tool belt, slim orange trousers and chunky little boots
  MECHANIC: { auto: true, legs: 'baked', lids: 'wEe', eye: [10, 8], flow: 'HhY',
    feet: {
      idle: ['.....oLooLo.....', '....oGGooGGo....'],
      r0: ['....oLo..oLo....', '...oGGo..oGGo...'],
      r1: ['......oLLo......', '.....oGGGo......'],
      r2: ['...oLo....oLo...', '..oGGo....oGGo..'],
      r3: ['......oLLo......', '......oGGo......'],
    },
    rows: [
      '.....AAAAAA.....', '...JjJAJjJaA....', '..AJJJAJJJAAA...', '.HAAAAAAAAAAccc.',
      'HHHHHhHHHHHHcc..', 'HHHhHHfHHhfHHH..', '.HHHffffffffHH..', '.HHKKKfffKKKHH..',
      '.HHfwEfffwEffH..', 'HHHpEefffEepfHH.', 'HHH.ffffmfff.HH.', 'HH...zzzzz..H...',
      'HY...fUUUUf.....', '.Y..fUUUuUf.....', '.YYTBBJBrjBT....', '.Yt..TTtTTT.....',
      '.Y..............', 'Y...............',
    ],
    map: () => ({ j: '#62efff', J: '#d8a040', m: '#c0504a', p: '#f49a9a', f: '#e8b48c', K: '#1a1a20', E: '#3a2418', e: '#a8602c', w: '#ffffff', H: '#6a3a20', h: '#9a5a32',
      A: '#4a4f5c', a: '#7a8090', c: '#2e323c', U: '#eeeae0', u: '#c8c0b0', z: '#ff7a2a', T: '#e0661e', t: '#a8440f', Y: '#c8561a', B: '#3a2a22', r: '#d84a3a', L: '#d8651e', G: '#5a4232' }),
  },


  TANK: { auto: true, legs: 'baked', lids: 'E', eye: [10, 6], flow: 'Ccz',
    rows: [
      '.....JAAAAJ.....', '...AAaaJJaaAA...', '..AaaAAJJAAaaA..', '..AaAAAJJAAAaA..',
      '..AaAAAJJAAAaA..', '..AKKKKKKKKKKA..', '..AKEEEKKEEEKA..', '..AaAAAJJAAAaA..',
      '..AaAJAJJAJAaA..', '..AaAAAAAAAAaA..', '..JAAAAAAAAAAJ..', '...TTtTTTTtTT...',
      'CJJJTttJJttTJJJ.', 'CJJfTKJJJJKTfJJ.', 'CCcTTttJJttTT...', 'CCcTTKKTTKKTT...',
      'CcCTTttKKttTT...', 'CCC.KKKzzKKK....', 'CCc..LL..LL.....', '.CC..GG..GG.....',
    ],
    map: () => ({ K: '#2a2f3a', E: '#ff9a3c', f: '#d8a07a', z: '#ff9a3c', J: P.gold, A: '#5a6a82', a: '#8fa2bd', T: '#5a6a82', t: '#8fa2bd', L: '#4a586e', G: '#2a2f3a', C: '#8a1a2a', c: '#b8283c' }),
  },
  ROBOT: {
    lids: 'R', eye: [10, 8], legs: 'treads', flow: 'A', pad: 1,
    rows: ['..o..........o..', '..oA........Ao..', '...oAooooooAo...', '..oMMMMMMMMMMo..', '.oMMIIIIIIIIMMo.', '.oMooooooooooMo.',
      '.oMoCKKKKKKKoMo.', '.oMoKKKRRRKKoMo.', '.oMoKKRRWRRKoMo.', '.oMoKKKRRRKKoMo.', '.oMooooooooooMo.', '..oMMmmmmmmMMo..',
      '..ooooMMMMoooo..', '..oFoMmVVmMoFo..', '...oCMVWWVMCo...', '...oMMmVVmMMo...'],
    map: () => ({ M: '#8a96a8', m: '#4a5466', A: '#ff4f4f', K: '#14161c', R: '#ff3b3b', C: '#3a4252', V: '#62efff', W: '#ffffff', F: '#5c6678',
      T: '#2a2f3a', t: '#6a7488', D: '#14161c', I: '#9aa6b8', J: '#d8e0ec', j: '#62efff' }),
  },
};
// The Dev: the side-swept programmer in a hoodie, in his motorized wheelchair (digits are chair colours).
BODIES.DEV = { auto: true, legs: 'none', lids: '', eye: [9, 7], flow: 'Hh',
  rows: [
      '....HHHHHHH.....', '..HHhhhhHHHHH...', '.HHhHHHHHhHHHHH.', 'HHHHHHHHHHHHHHH.',
      '..HHHHHHHHHHHH..', '..HHHHHHHHfffH..', '..HfKKKKKKKKKf..', '..fKjKKfKjKKff..',
      '..ffffffffffff..', '...ffffffffff...', '.....ffffff.....', '.o1o.oaaaaoo333o',
      '.o1ooTTTTTTo393o', '.o1oTTTTTffo333o', '.o1oTTTTTo22222o', '.o11144444444o..',
      'o5555o77777744o.', 'o56565o7777o44o.', 'o55o55o.o88o44o.', 'o56565o..oo.o99o',
      '.o555o.....o77o.', '..ooo......o5o..',
    ],
  map: () => ({ f: '#e0b090', K: '#1a1a20', j: '#c8d0dc', H: '#4a2e1e', h: '#6a4430', a: '#5a8ae8', T: '#3a6ac8', 1: '#2a2f3a', 2: '#8a96a8', 3: '#62efff', 4: '#2a3550', 5: '#1a1a20', 6: '#8a96a8', 7: '#5a6a82', 8: '#3a4252', 9: '#e6e6f0' }),
};

// ---------- evolved skins ----------
// Every fighter changes look once awakened: when its basic attack, Q and E, and ultimate have all evolved.
// map recolors the base sprite, rows replaces whole rows. The Dev's evolved form is a full body.
const EVO = {
  BLADE: { name: 'ASHEN KAEL', map: { H: '#d8d0dc', h: '#ffffff', T: '#2a1418', t: '#5a2028', z: '#ffd447', e: '#c9a24a', E: '#fff2c0', B: '#2a1418', L: '#2a1418', U: '#ff6a2b' } },
  GUNNER: { name: 'DEADEYE VEGA', map: { H: '#e8e0d0', h: '#c9a24a', r: '#1a1a24', R: '#0a0a10', D: '#7a1424', w: '#ffd447', e: '#ffd447' } },
  WIZARD: { name: 'ARCHMAGE MORROW', map: { A: '#f0eaff', a: '#ffffff', T: '#e8e0f0', t: '#ffffff', B: '#e8e0f0', b: '#ffffff', z: '#ffd447', E: '#ff4fa8', L: '#b48cff' } },
  // Oni Rin: Rin's own sprite and hairstyle, recolored purple and pink: violet hair with pink tips and a gold
  // pin, pink eyes, and a dark purple uniform with a pink ribbon, a magenta jacket and pink shoes
  NINJA: { name: 'ONI RIN', map: { H: '#9a58dc', h: '#e0b8ff', Y: '#6a38b0', q: '#ffd447', Z: '#ff7ac8', E: '#ff5ac8', e: '#5a1450', p: '#ff8ac0',
    U: '#3a2650', T: '#241634', z: '#ff5ac8', X: '#c050c0', x: '#ff8ad8', S: '#2a1a40', s: '#5a3a80', W: '#2a1a40', V: '#ff5ac8' } },
  MECHANIC: { name: 'RIVET MK-II', map: { A: '#c9a24a', a: '#ffe08a', T: '#c8ccd8', t: '#8b98ab', Y: '#9aa0ac', L: '#c8ccd8', B: '#2a3440', z: '#62efff', U: '#e8f8ff', E: '#62efff', K: '#0e2a34' } },
  // Titan Grom: a bigger body in blackened armor with blood-red trim, a burning visor, bone horns and spiked shoulders
  TANK: { name: 'TITAN GROM', body: {
    auto: true, legs: 'baked', lids: 'E', eye: [11, 7], flow: 'Ccz',
    // armored greaves with blood-red knee plates over heavy boots (a row taller than the old feet)
    feet: {
        idle: ['....oLLLooLLLo....', '....oLlLooLlLo....', '...oGGGGooGGGGo...'],
        r0: ['...oLLLo..oLLLo...', '...oLlLo..oLlLo...', '..oGGGGo..oGGGGo..'],
        r1: ['.....oLLLLLLo.....', '.....oLlLLlLo.....', '.....oGGGGGGGo....'],
        r2: ['..oLLLo....oLLLo..', '..oLlLo....oLlLo..', '.oGGGGo....oGGGGo.'],
        r3: ['.....oLLLLLLo.....', '.....oLlLLlLo.....', '......oGGGGGo.....'],
    },
    rows: [
      'H.....JAAAAJ.....H', 'HH.AAAaaJJaaAAA.HH', '.HAaaaAAJJAAaaaAH.', '..AaAAAAJJAAAAaA..',
      '..AaAAAAJJAAAAaA..', '..AaAAAAJJAAAAaA..', '..AKKKKKKKKKKKKA..', '..AKEEEEKKEEEEKA..',
      '..AaAAAAJJAAAAaA..', '..AaAAJAJJAJAAaA..', '..AaAAAAAAAAAAaA..', '..JAAAAAAAAAAAAJ..',
      '..STTTtTTTTtTTTS..', 'CJJJTTttJJttTTJJJ.', 'CJJfTTKJJJJKTTfJJ.', 'CCcTTTttJJttTTT...',
      'CCcTTTKKTTKKTTT...', 'CCcTTTKKTTKKTTT...', 'CcCTTTttKKttTTT...', 'CCC.KKKKzzKKKK....',
      'CCc...LL..LL......', '.CC...GG..GG......',
    ],
    map: () => ({ H: '#d8c8b4', A: '#2a2228', a: '#4e3e48', K: '#0a0608', E: '#ff1a2a', J: '#8a0a18', S: '#6a5a64', T: '#221a1e', t: '#3e2c34', f: '#3a2a30', z: '#ff1a2a', L: '#5a4650', l: '#a0101e', G: '#2e2428', C: '#4a0610', c: '#a0101e' }),
  } },
  // Unit-7 Omega: a bigger body that hovers on two jet thrusters instead of rolling on treads
  ROBOT: { name: 'UNIT-7 OMEGA', body: {
    lids: 'R', eye: [10, 8], legs: 'none', flow: 'A',
    rows: [
      '...o..........o...', '...oA........Ao...', '....oAooooooAo....', '..ooMMMMMMMMMMoo..',
      '.oMMMIIIIIIIIMMMo.', '.oMMooooooooooMMo.', '.oMMoCKKKKKKKoMMo.', '.oMMoKKKKRRRKoMMo.',
      '.oMMoKKKRRWRRoMMo.', '.oMMoKKKKRRRKoMMo.', '.oMMooooooooooMMo.', '..oMMMmmmmmmMMMo..',
      '..ooooMMMMMMoooo..', '.oFFoMMMVVMMMoFFo.', '.oFFoMMVWWVMMoFFo.', '..oooMMMVVMMMooo..',
      '....oMMMMMMMMo....', '...oPPoMMMMoPPo...', '...oPPo.oo.oPPo...', '....QQ......QQ....',
      '....qQ......Qq....', '.....Q......Q.....',
    ],
    // the jet flames flicker as it moves
    alt: { 19: '....qQ......Qq....', 20: '....QQ......QQ....', 21: '....Q........Q....' },
    map: () => ({ M: '#2a2f3a', m: '#14161c', I: '#c9a24a', A: '#ffd447', K: '#0a0b10', R: '#ffd447', W: '#ffffff', C: '#5a1420', V: '#ff4fa8', F: '#3a4252', P: '#4a5466', Q: '#ff4fa8', q: '#ffffff' }),
  } },
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
  GUNNER: { seq: 'AABBCCBB', B: { 11: '..oYorrRrrroYo..' }, C: { 11: '..oYorrrRrroYo..', 15: '...oDDDooDDo....' } },
  ROBOT: { seq: 'AABBAACC', B: { 0: '...o........o...' }, C: { 7: '.oMoKKRRRRRKoMo.', 8: '.oMoKRRRWRRRoMo.', 9: '.oMoKKRRRRRKoMo.' } },
  // the laptop's status light blinks while he types
  ROBOT_EVO: { seq: 'AABBAACC', B: { 19: '....qQ......Qq....', 20: '....QQ......QQ....', 21: '....Q........Q....' }, C: { 7: '.oMMoKKKRRRRRoMMo.', 8: '.oMMoKKRRRWRRRMMo.', 9: '.oMMoKKKRRRRRoMMo.' } },
  DEV_EVO: { seq: 'AAAABBCC', B: { 7: 'aoHvVVVoVvVVoHoa', 12: '.ogoCCwCCwCCoy.o' }, C: { 7: 'aoHVVvVoVVVvoHoa', 13: '.oXoCCCCCffoy.yo' } },
};

// ---------- wind ----------
// Hair and cloth flutter backward (to the left; facing left mirrors it, so it always streams behind).
// Each phase pushes a different set of edge pixels one or two cells back, so the four phases ripple.
const emptyCell = (c) => c === undefined || c === '.';
const WIND_PAD = 3; // empty columns on both sides of every hero sprite, so strands have room to stream out
function windRows(rows0, phase, d) {
  const rows = rows0.map((r) => '.'.repeat(WIND_PAD) + r + '.'.repeat(WIND_PAD));
  const src = rows.map((r) => [...r]), g = rows.map((r) => [...r]), H = rows.length;
  if (d.flow) for (let y = 0; y < H; y++) for (let x = 0; x < src[y].length; x++) {
    const c = src[y][x];
    if (!d.flow.includes(c)) continue;
    const left = src[y][x - 1];
    // only the silhouette's back edge: empty, or an outline with empty space behind it
    if (!(emptyCell(left) || (left === 'o' && emptyCell(src[y][x - 2])))) continue;
    // lower strands catch more wind: they stream further back and more often
    const w = Math.min(1, (y + 2) / (H * 0.55)), h = (x * 7 + y * 13 + phase * 5) % 6;
    if (h < 2 + w * 3 && x >= 1) {
      g[y][x - 1] = c;
      if (h <= 1 && w > 0.3 && x >= 2 && emptyCell(src[y][x - 2])) g[y][x - 2] = c;
      if (h === 0 && w > 0.6 && x >= 3 && emptyCell(src[y][x - 3])) g[y][x - 3] = c;
    }
  }
  // a beard (or anything hanging) swings back and forth row by row
  if (d.swing) for (const k in d.swing.rows) {
    const y = +k, dx = d.swing.rows[k][phase % 4];
    if (!dx || !g[y]) continue;
    const xs = []; src[y].forEach((c, x) => { if (c === d.swing.letter) xs.push(x); });
    for (const x of xs) g[y][x] = d.swing.fill;
    for (const x of xs) if (g[y][x + dx] !== undefined) g[y][x + dx] = d.swing.letter;
  }
  // outline whatever is new (and everything, for the outline-free baked models)
  const out = g.map((r) => r.slice());
  for (let y = 0; y < H; y++) for (let x = 0; x < g[y].length; x++) {
    if (g[y][x] !== '.') continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const n = g[y + dy]?.[x + dx]; return n !== undefined && n !== '.' && n !== 'o'; })) out[y][x] = 'o';
  }
  return out.map((r) => r.join(''));
}
// Unit-7 rolls on tank treads: three big road wheels whose hubs turn and a track whose links run
const WHEELS = (spin) => spin ? ['oTIJjITIJjITIJjITo', 'oTIjJITIjJITIjJITo'] : ['oTIjJITIjJITIjJITo', 'oTIJjITIJjITIJjITo'];
const tread = (spin) => ['.oooooooooooooooo.', spin ? 'otTtTtTtTtTtTtTtTo' : 'oTtTtTtTtTtTtTtTto', 'oTDIIDTDIIDTDIIDTo', ...WHEELS(spin), 'oTDIIDTDIIDTDIIDTo', spin ? 'oTtTtTtTtTtTtTtTto' : 'otTtTtTtTtTtTtTtTo', '.oooooooooooooooo.'];
const TREADS = { idle: tread(false), r0: tread(false), r1: tread(true), r2: tread(false), r3: tread(true) };

function buildChar(d, il = { seq: 'AAAAAAAA' }, recolor = {}, rowOver = {}) {
  const map = { o: P.ink0, L: d.leg, b: d.boot, ...d.map(), ...recolor };
  // pad: extra columns on both sides. 16-wide rows get padded, already-wide rows stay as written.
  const pad = d.pad || 0, W = 16 + pad * 2, fit = (r) => (r && r.length < W ? '.'.repeat(pad) + r + '.'.repeat(pad) : r);
  const base = d.rows.map((r, i) => fit(rowOver[i]) || r);
  // alt rows swap in on every other run frame; run rows on every run frame (a running pose)
  const body = (alt, run) => base.map((r, i) => (alt && d.alt && fit(d.alt[i])) || (run && d.run && fit(d.run[i])) || r);
  const legs = (k) => (d.legs === 'none' || d.legs === 'baked' ? [] : d.legs === 'treads' ? TREADS[k] : d.legs === 'robe' ? (k === 'r1' || k === 'r3' ? ROBE_LEGS_ALT : ROBE_LEGS) : LEGS[k]).map(fit);
  // the baked models get the hand-outlined walking feet (a one-pixel gap keeps the legs apart; 'b' there is the boot)
  const feet = (rows, k) => {
    if (d.legs !== 'baked') return rows;
    // merge: the walking feet replace the old feet, anything else in those rows (a cape, a hem) stays
    const legsK = d.feet ? d.feet[k] : LEGS[k].map((r) => r.replace(/b/g, 'G'));
    // old legs, trousers and feet in those rows go; anything else (a cape, a tied jacket) stays
    // (custom feet can be taller than two rows: the extra rows go underneath)
    const old = [...rows.slice(-2), ...Array(Math.max(0, legsK.length - 2)).fill('.'.repeat(rows[0].length))];
    return [...rows.slice(0, -2), ...legsK.map((leg, i) => [...old[i]].map((c, x) => (leg[x] !== '.' ? leg[x] : /[LGfBb]/.test(c) ? '.' : c)).join(''))];
  };
  const make = (rows, phase) => makeSprite(windRows(rows, phase, d), map, d.lids || undefined);
  const sp = (alt, k, phase, run) => make(feet([...body(alt, run), ...legs(k)], k), phase);
  const set = { idle: sp(false, 'idle', 0), run: [sp(false, 'r0', 1, true), sp(true, 'r1', 2, true), sp(false, 'r2', 3, true), sp(true, 'r3', 0, true)] };
  // the idle loop: the fighter's own pose changes, with the wind cycling through its four phases
  const poses = {};
  const pose = (k, phase) => {
    const key = k + phase;
    if (poses[key]) return poses[key];
    const o = il[k] || {};
    return (poses[key] = make(feet([...base.map((r, i) => fit(o[i]) || r), ...legs('idle')], 'idle'), phase));
  };
  set.idles = [...il.seq].map((k, i) => pose(k, Math.floor(i / 2) % 4));
  set.eye = [d.eye[0] + pad + WIND_PAD, d.eye[1]];
  return set;
}
export const EVO_NAMES = Object.fromEntries(Object.entries(EVO).map(([k, v]) => [k, v.name]));

export function buildSprites() {
  const O = P.ink0;
  // the heroes: bodies and weapons from art/sprites/heroes (hero-sprites.js). Their sets are made once and kept
  // when the theme changes and this runs again (the pictures fill them when they've loaded).
  if (!SPR.heroesReady) installHeroSprites(SPR);
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

  // the archer: a hooded goblin with a quiver on its back and a bow held out in front
  const AR = { o: O, H: '#5a4a3a', h: '#8a7458', F: '#6a9a3a', g: '#ff4f4f', Q: '#7a4a2a', q: '#e8e0c8', B: '#a07040', S: '#e8e0c8' };
  const ARCH = ['...ooooo....', '..oHHHHHo...', '.oHhHHHHHo..', '.oHoFFFFoo.B', '.oHoFgFgoo.B', 'qoHoFFFFoSoB', 'qQoHHHHHoS.B', 'oQoHhHHHHoB.', '.ooHHHHHHo..', '..oHHHHHo...'];
  SPR.archer = [makeSprite([...ARCH, '..oFo.oFo...', '..oo..oo....'], AR, 'g'), makeSprite([...ARCH, '...oFoFo....', '...oooo.....'], AR, 'g')];
  // the ash priest: a pale robed healer with a staff crowned in green flame
  const PR = { o: O, G: '#7dff9a', g: '#e8ffe8', S: '#8a6a4a', R: '#d8d0c0', r: '#a89880', K: '#1a1420', e: '#7dff9a' };
  const PRIE = ['.oo..ooooo.', 'oGGooRRRRRo', 'oGgooRrRRRo', '.oSoRKKKKRo', '.oSoKeKKeKo', '.oSoRKKKKRo', '.oSoRRRRRRo', 'oSSoRRrRRRo', '.oSoRRRRRRo', '.oSoRrRRrRo'];
  SPR.priest = [makeSprite([...PRIE, '.oSoRRRRRRo', '.ooooooooo.'], PR, 'e'), makeSprite([...PRIE, '.oSoRRRRRo.', '.oooooooo..'], PR, 'e')];

  // the lootling: a greedy little goblin hauling a sack of gold over its head
  const LT = { o: O, G: '#5f9a3a', S: '#c9a24a', s: '#fff2a8', y: '#ffd447', e: '#ff4f4f', m: '#3a0a14', B: '#4a3a2a' };
  const LOOT = ['...oooooo...', '..oSsSSySo..', '.oSSSySSSSo.', '.oSySSSSsSo.', '.oGoSSSSoGo.', '.oGooooooGo.', '..oGGGGGGo..', '..oGeGGeGo..', '..oGGmmGGo..', '...oGGGGo...'];
  SPR.lootling = [makeSprite([...LOOT, '..oBo..oBo..'], LT, 'e'), makeSprite([...LOOT, '...oBooBo...'], LT, 'e')];

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
  // Rivet's ultimate, the Iron Titan: orange armour, a cyan visor, a glowing reactor core, missile pods on both shoulders
  const TT = { o: O, M: '#d8651e', m: '#8a3a10', W: '#8b98ab', w: '#c8d0dc', K: '#1a1a20', V: '#62efff', v: '#e0ffff', R: '#ffd447', r: '#fff4b0', Y: '#ffd447' };
  const TITAN = ['........oooooo........', '......ooMMMMMMoo......', '.....oMMmmmmmmMMo.....', '.....oMKKKKKKKKMo.....', '.....oMKvVVVVvKMo.....', '.....oMKKKKKKKKMo.....', '..ooo.oMMMMMMMMo.ooo..', '.oWwWooMMMMMMMMooWwWo.', 'oWwWWWMMMooooMMMWWWwWo', 'oWKWKWMMoRRRRoMMWKWKWo', 'oWWWWWMMoRrrRoMMWWWWWo', '.oWWWoMMoRRRRoMMoWWWo.', '..oWo.oMMooooMMo.oWo..', '.oWWWooYKYKYKYKooWWWo.', '.oWwWo.oMMMMMMo.oWwWo.', '.oKKKo.oMmMMmMo.oKKKo.', '..ooo..oooooooo..ooo..'];
  const TL = { A: ['......oWWo..oWWo......', '......oWwo..oWwo......', '.....oMMMo..oMMMo.....', '.....oMMMMo.oMMMMo....', '.....oooooo.oooooo....'], B: ['.....oWWo....oWWo.....', '....oWwo......oWwo....', '...oMMMo......oMMMo...', '...oMMMMo.....oMMMMo..', '...oooooo.....oooooo..'], C: ['......oWWo..oWWo......', '.....oWwo....oWwo.....', '....oMMMo....oMMMo....', '....oMMMMo...oMMMMo...', '....oooooo...oooooo...'] };
  SPR.titan = { walk: ['A', 'B', 'A', 'C'].map((k) => makeSprite([...TITAN, ...TL[k]], TT, 'Vv')) };
  SPR.titan.idle = SPR.titan.walk[0];
  SPR.golem = SPR.titan.walk;

  const UI = { '#': P.blood, '+': P.paper, o: O, e: P.ink3 };
  SPR.heart = makeSprite(['.oo.oo.', 'o##o##o', 'o#+###o', 'o#####o', '.o###o.', '..o#o..', '...o...'], UI);
  SPR.heartE = makeSprite(['.oo.oo.', 'oeeoeeo', 'oeeeeeo', 'oeeeeeo', '.oeeeo.', '..oeo..', '...o...'], UI);
  SPR.heal = makeSprite(['.#.#.', '#+###', '#####', '.###.', '..#..'], UI);
  for (const k in iconCache) delete iconCache[k];
  // Kael-only async override disabled (all heroes share the same loader).
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
