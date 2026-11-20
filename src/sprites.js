import { installHeroSprites } from './hero-sprites.js?v=200';
import { makeSprite, P } from './gfx.js?v=200';
import { MONSTER_ART } from './monster-art.js?v=200';

// Filled by buildSprites(), and rebuilt when the color theme changes.
export const SPR = {};

// the awakened forms' names, on the banner when a fighter awakens
export const EVO_NAMES = { BLADE: 'ASHEN KAEL', GUNNER: 'DEADEYE VEGA', WIZARD: 'ARCHMAGE MORROW', NINJA: 'ONI RIN', MECHANIC: 'RIVET MK-II', TANK: 'TITAN GROM', ROBOT: 'UNIT-7 OMEGA', DEV: 'ROOT' };

export function buildSprites() {
  const O = P.ink0;
  // the heroes: bodies and weapons from art/sprites/heroes (hero-sprites.js). Their sets are made once and kept
  // when the theme changes and this runs again (the pictures fill them when they've loaded).
  if (!SPR.heroesReady) installHeroSprites(SPR);

  // the monsters and bosses, drawn in the heroes' style by tools/build_monsters.py (src/monster-art.js): one character
  // is an art pixel (k 1.5, so each is a 2 x 2 block like the heroes'), 'o' the outline, 'g' the eyes (they get a
  // highlight and a blink frame)
  for (const [name, a] of Object.entries(MONSTER_ART)) {
    const frames = a.frames.map((rows) => makeSprite(rows, a.pal, a.eyes || undefined, { k: 1.5, flat: true }));
    SPR[name] = name === 'wyrmSeg' ? frames[0] : frames;
  }

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
