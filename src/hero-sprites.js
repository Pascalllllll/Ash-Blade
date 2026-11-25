// The heroes' sprites. Each hero's body (no weapon) comes from art/sprites/heroes/<hero>-<skin>.png: 120 x 96 cells,
// rows idle (16), walk (12), run (12), death (8), dash (8), hurt (8), attack (16), cast (16), feet on row 92, facing right (left is the
// mirror). One art pixel is a 2 x 2 block. Each weapon is its
// own sprite, pre-turned to 64 angles in art/sprites/heroes/weapon-<name>.png (8 x 8 per skin, base on top), so the
// game can point it wherever the player aims. Both are made by tools/build_hero_sprites.py from the master pictures.
//
// The sets exist from the start with empty frames (the title screen draws them on its first frame); the pictures fill
// those same frames when they arrive, so nothing holds on to an empty one.
import { SS } from './gfx.js?v=212';
import { RIG, WEAPON_ART } from './hero-rig.js?v=212';

const CW = 120, CH = 96;
const ROWS = { idle: [0, 16], walk: [1, 12], run: [2, 12], death: [3, 8], dash: [4, 8], hurt: [5, 8], attack: [6,16], cast: [7,16] };
const N = 64; // weapon angles
// where a weapon rests in the menus and on the hero's own still pictures (afterimages, the mirror boss): melee
// weapons lowered forward, guns level, the staff held up
export const REST = { sword: 0.62, revolver: 0.12, minigun: 0.1, staff: -1.15, katana: 0.72, wrench: 0.6, hammer: 0.55, cannon: 0.12, saya: Math.PI - 0.35 };
// Rin wears her katana in its scabbard at her hip (behind her) until she draws it
export const SHEATH = { katana: 'saya' };
// Rin's scabbard, hilt in her hand at the hip: it hangs back behind her (base), or, awakened, is worn in front across
// the hip (her long hair would hide it behind her). a: the angle facing right (mirrored facing left); front: drawn over
// the body.
export function sheathPose(evolved, flip) {
  const tilt = evolved ? 0.25 : 0.35;
  return { a: flip ? tilt : Math.PI - tilt, front: !!evolved };
}

function canvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').imageSmoothingEnabled = false;
  return c;
}
// a frame shaped like makeSprite's: n and f canvases (f is the mirror), w/h in game pixels, k sprite pixels each
const empty = canvas(CW,CH);
function frame() {
  let normal, mirrored;
  const tints = new Map();
  return {
    k:SS,w:CW/SS,h:CH/SS,
    fill(img,col,row,over,behind) {
      this.img=img; this.u=col*CW; this.v=row*CH; this.over=over; this.behind=behind;
      this.sheet=over || behind ? null : img;
      normal=mirrored=null; tints.clear();
    },
    get n() {
      if (!this.img) return empty;
      if (!normal) {
        normal=canvas(CW,CH);
        const g=normal.getContext('2d');
        this.behind?.(g); g.drawImage(this.img,this.u,this.v,CW,CH,0,0,CW,CH); this.over?.(g);
      }
      return normal;
    },
    get f() {
      if (!this.img) return empty;
      if (!mirrored) {
        mirrored=canvas(CW,CH);
        const g=mirrored.getContext('2d'); g.translate(CW,0); g.scale(-1,1); g.drawImage(this.n,0,0);
      }
      return mirrored;
    },
    tint(col,flip) {
      if (!this.img) return empty;
      const key=col+(flip?'L':'R');
      if (!tints.has(key)) {
        const t=canvas(CW,CH),g=t.getContext('2d'); g.drawImage(flip?this.f:this.n,0,0);
        g.globalCompositeOperation='source-in'; g.fillStyle=col; g.fillRect(0,0,CW,CH);
        if (tints.size>=6) tints.clear();
        tints.set(key,t);
      }
      return tints.get(key);
    },
  };
}
// ---------- weapons ----------
// SPR.weapons[id]: the weapon picture, its cell, the tip (along/across the weapon from the grip, in game pixels:
// where shots leave) and the angle frame lookup. Unit-7's cannon and every melee weapon too; the Dev has none.
export const WEAPON_IMG = {};
export function weaponFrame(name, skin, a) {
  // the frame for angle a: 64 steps, base skin on the top 8 rows, the awakened one below
  const w = WEAPON_ART[name], img = WEAPON_IMG[name];
  if (!w || !img) return null;
  let i = Math.round((a / (Math.PI * 2)) * N) % N; if (i < 0) i += N;
  const C = w.cell, r = (skin ? 8 : 0) + (i >> 3);
  return { img, sx: (i & 7) * C, sy: r * C, C };
}
// draws the weapon with its grip at x, y (game pixels), turned to a; `left` mirrors it top to bottom, so a gun held
// facing left still has its grip down and a blade its edge the right way
export function drawWeaponAt(g, name, skin, x, y, a, left, alpha = 1) {
  const fr = weaponFrame(name, skin, left ? -a : a);
  if (!fr) return;
  const s = fr.C / SS;
  g.save();
  if (alpha !== 1) g.globalAlpha *= alpha;
  g.translate(x, y);
  if (left) g.scale(1, -1);
  g.drawImage(fr.img, fr.sx, fr.sy, fr.C, fr.C, -s / 2, -s / 2, s, s);
  g.restore();
}

// ---------- the hero sets ----------
function makeSet(id, evolved) {
  // an awakened skin can hold its weapon at its own point (RIG[id].evo)
  const rig = evolved && RIG[id].evo ? { ...RIG[id], ...RIG[id].evo } : RIG[id], f = () => frame();
  const body = { idles: Array.from({ length: 16 }, f), walk: Array.from({ length: 12 }, f), run: Array.from({ length: 12 }, f), death: Array.from({ length: 8 }, f),
    dash: Array.from({ length: 8 }, f), hurt: Array.from({ length: 8 }, f), attack: Array.from({ length: 16 }, f), cast: Array.from({ length: 16 }, f) };
  // what the menus, afterimages and the mirror boss show: the same frames with the weapon in hand at rest
  const shown = { idles: Array.from({ length: 16 }, f), walk: Array.from({ length: 12 }, f), run: Array.from({ length: 12 }, f) };
  const bladeUltimate = id === 'BLADE' || id === 'NINJA';
  const set = {
    idle: shown.idles[0], idles: shown.idles, walk: shown.walk, run: shown.run,
    // the body without a weapon (drawPlayer draws the weapon itself, turned to the aim)
    body, rig, evolved,
    art: true, noWeapon: true, ownWeapon: false, softFacing: true,
    eye: [rig.eye[0] / SS, rig.eye[1] / SS],
    act: { death: body.death, stance: shown.idles[0], ultimate: bladeUltimate ? Array.from({ length: body.attack.length }, f) : body.cast },
  };
  return set;
}
function fillSet(set, img) {
  const { rig } = set, wname = rig.weapon, w = wname && WEAPON_ART[wname];
  const sheath = SHEATH[wname];
  const withWeapon = ([dx, dy], name = wname, angle = REST[name] ?? 0.3) => (g) => {
    if (!w) return;
    const fr = weaponFrame(name, set.evolved, angle);
    if (!fr) return;
    // the grip on the hand (the cell's own pixels here, not game pixels)
    g.drawImage(fr.img, fr.sx, fr.sy, fr.C, fr.C, rig.hand[0] + 0.5 - fr.C / 2 + dx, rig.hand[1] + 0.5 - fr.C / 2 + dy, fr.C, fr.C);
  };
  for (const [name, [row, n]] of Object.entries(ROWS)) {
    const key = name === 'idle' ? 'idles' : name;
    for (let i = 0; i < n; i++) {
      set.body[key][i].fill(img, i, row);
      // the still pictures (idle, walk, run) get the weapon in hand, moving with the hand on each walk and run frame
      const off = rig.gait?.[name]?.off?.[i] || [0, 0];
      if (set[key] && name !== 'death') {
        if (sheath && WEAPON_ART[sheath]) {
          const sp = sheathPose(set.evolved, false), sw = withWeapon(off, sheath, sp.a);
          set[key][i].fill(img, i, row, sp.front ? sw : null, sp.front ? null : sw);
        }
        else set[key][i].fill(img, i, row, withWeapon(off));
      }
      if (name === 'attack' && set.act.ultimate !== set.body.cast) {
        const t = i / (n - 1);
        const windup = Math.sin(Math.PI * Math.min(1, t / 0.32));
        const follow = Math.sin(Math.PI * Math.max(0, (t - 0.29) / 0.71));
        const grip = [Math.round(3 * follow - windup), Math.round(2 * windup - follow)];
        const blade = withWeapon(grip, wname, -0.3 - 1.9 * windup + 0.65 * follow);
        const sp = sheathPose(set.evolved, false), sw = sheath && withWeapon(off, sheath, sp.a);
        set.act.ultimate[i].fill(img, i, row, sp.front && sw ? (g) => { blade(g); sw(g); } : blade, sp.front ? null : sw);
      }
    }
  }
}

function load(url) {
  return new Promise((res, rej) => {
    const im = new Image(); im.decoding = 'async';
    im.onload = () => res(im); im.onerror = () => rej(new Error('missing ' + url));
    im.src = url;
  });
}
const art = (file) => new URL(`../art/sprites/heroes/${file}?v=212`, import.meta.url).href;

// fills SPR.chars, SPR.evo and SPR.weapons right away (empty frames), then loads the pictures into them
export function installHeroSprites(SPR) {
  SPR.chars = {}; SPR.evo = {}; SPR.weapons = {};
  for (const id in RIG) {
    SPR.chars[id] = makeSet(id, false);
    SPR.evo[id] = makeSet(id, true);
    const wn = RIG[id].weapon, w = wn && WEAPON_ART[wn];
    // the tip from the grip in game pixels; the awakened model has its own (evo)
    if (w) SPR.weapons[id] = { name: wn, along: w.tip[0] / SS, across: w.tip[1] / SS, evo: w.tipEvo ? { along: w.tipEvo[0] / SS, across: w.tipEvo[1] / SS } : null };
  }
  const weapons = Object.keys(WEAPON_ART).map((n) => load(art(`weapon-${n}.png`)).then((im) => { WEAPON_IMG[n] = im; }));
  SPR.heroesReady = Promise.all(weapons).then(() => Promise.all(Object.keys(RIG).flatMap((id) => [false, true].map((evo) =>
    load(art(`${RIG[id].file}-${evo ? 'evolved' : 'base'}.png`)).then((im) => fillSet(evo ? SPR.evo[id] : SPR.chars[id], im))))))
    .catch((err) => console.error('[Ashblade] hero sprites failed to load', err));
  return SPR.heroesReady;
}

// which way the hero faces: by the aim (by the swing while attacking), with a dead zone around straight up and down
// so aiming vertically doesn't flicker; moving sideways decides inside the dead zone
export function softFacingLeft(p) {
  const a = p.state === 'attack' ? (p.atkAng ?? p.aim) : p.aim;
  const x = Math.cos(Number.isFinite(a) ? a : 0);
  let dir = p.softFacingDirection || 1;
  if (x < -0.28) dir = -1; else if (x > 0.28) dir = 1;
  else if (Math.abs(p.vx || 0) > Math.max(25, Math.abs(p.vy || 0) * 1.8)) dir = Math.sign(p.vx);
  p.softFacingDirection = dir;
  return dir < 0;
}
