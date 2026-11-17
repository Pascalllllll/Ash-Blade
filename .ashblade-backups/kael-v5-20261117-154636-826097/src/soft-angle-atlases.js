// ASHBLADE soft-angle v4 two-facing atlas loader — all eight playable heroes.
// This replaces both the old Option A loader and Kael-only Option C/V3.
// One canonical source: transparent authored/normalized PNG atlases in art/sprites/soft-facing.
// Right is front-dominant with a slight turn; Left is the exact horizontal mirror.
// Aiming, projectiles, hitboxes, and movement remain independently 360 degrees.
import { SS } from './gfx.js?v=165';

export const FRAME = Object.freeze({ w:120, h:96, cols:10, rows:13, footX:60, footY:92 });
export const COUNTS = Object.freeze({
  entrance:8, idle:8, walk:8, run:8,
  attack1:8, attack2:8, attack3:8, skill1:8, skill2:8, ultimate:10,
  dash:6, hit:4, death:8,
});
const ACTIONS = Object.keys(COUNTS);
const IDS = ['BLADE','GUNNER','WIZARD','NINJA','MECHANIC','TANK','ROBOT','DEV'];
const RESOURCE = Object.freeze({
  BLADE:'blade', GUNNER:'gunner', WIZARD:'wizard', NINJA:'ninja',
  MECHANIC:'mechanic', TANK:'tank', ROBOT:'robot', DEV:'dev',
});
const IMAGE_CACHE = new Map();
function imageUrl(id, evo) {
  return new URL(`../art/sprites/soft-facing/${RESOURCE[id]}-${evo?'evolved':'base'}-right.png?v=4`, import.meta.url).href;
}
function loadImage(url) {
  if (IMAGE_CACHE.has(url)) return IMAGE_CACHE.get(url);
  const task = new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => img.naturalWidth === FRAME.w * FRAME.cols && img.naturalHeight === FRAME.h * FRAME.rows
      ? resolve(img) : reject(new Error(`Wrong sprite atlas dimensions: ${img.naturalWidth}x${img.naturalHeight} ${url}`));
    img.onerror = () => reject(new Error(`Sprite atlas not found: ${url}`));
    img.src = url;
  });
  IMAGE_CACHE.set(url, task);
  return task;
}
function canvas() {
  const c = document.createElement('canvas'); c.width = FRAME.w; c.height = FRAME.h;
  c.getContext('2d').imageSmoothingEnabled = false;
  return c;
}
function makeFrame(img, col, row) {
  const n = canvas(), ctx = n.getContext('2d');
  ctx.drawImage(img, col*FRAME.w, row*FRAME.h, FRAME.w, FRAME.h, 0, 0, FRAME.w, FRAME.h);
  const f = canvas(), fc = f.getContext('2d');
  fc.translate(FRAME.w, 0); fc.scale(-1,1); fc.drawImage(n,0,0);
  const tinted = new Map();
  return {
    n, f, k: SS, w: FRAME.w / SS, h: FRAME.h / SS,
    tint(color, flip=false) {
      const key = `${color}:${flip?'L':'R'}`;
      if (tinted.has(key)) return tinted.get(key);
      const out = canvas(), oc = out.getContext('2d');
      oc.drawImage(flip?f:n,0,0);
      oc.globalCompositeOperation = 'source-in';
      oc.fillStyle = color; oc.fillRect(0,0,FRAME.w,FRAME.h);
      oc.globalCompositeOperation = 'source-over';
      if (tinted.size >= 4) tinted.clear();
      tinted.set(key,out); return out;
    },
  };
}
function makeSet(img) {
  // Lazy frame decoding avoids allocating two canvases for all ~100 frames of every skin
  // at startup. Only the actions actually played are turned into canvases.
  const frames = new Map();
  const get = action => {
    if (!frames.has(action)) {
      const row = ACTIONS.indexOf(action);
      if (row < 0) throw new Error('Unknown sprite action: '+action);
      frames.set(action, Array.from({length:COUNTS[action]},(_,col)=>makeFrame(img,col,row)));
    }
    return frames.get(action);
  };
  const idles = get('idle');
  const set = {
    idle: idles[0], idles,
    get walk() { return get('walk'); },
    get run() { return get('run'); },
    art: true, noWeapon: true, ownWeapon: true,
    frontFacing: false, softFacing: true,
    eye: [FRAME.w/(2*SS), FRAME.h/(3*SS)],
  };
  const act = {
    stance: idles[0],
    get attack() { return [get('attack1'),get('attack2'),get('attack3')]; },
    get charge() { return get('attack1')[0]; },
    get release() { return get('attack3'); },
    get skill() { return get('skill1'); },
  };
  for (const key of ['entrance','skill1','skill2','ultimate','dash','hit','death','attack1','attack2','attack3']) {
    Object.defineProperty(act,key,{enumerable:true, get:()=>get(key)});
  }
  set.act=act;
  return set;
}

// Last-facing hysteresis: vertical aim must not flip back and forth at tiny mouse changes.
export function softFacingLeft(p) {
  const a = p.state==='attack' ? (p.atkAng ?? p.aim) : p.aim;
  const x = Math.cos(Number.isFinite(a) ? a : 0);
  let face = p.softFacingDirection || 1;
  if (x < -0.28) face = -1;
  else if (x > 0.28) face = 1;
  else if (Math.abs(p.vx || 0) > Math.max(25,Math.abs(p.vy || 0)*1.8)) face = Math.sign(p.vx);
  p.softFacingDirection=face;
  return face<0;
}

let generation = 0;
export function installSoftAngleSprites(SPR) {
  const token = ++generation;
  SPR.softFacingState='loading';
  const queries = IDS.flatMap(id=>[loadImage(imageUrl(id,false)),loadImage(imageUrl(id,true))]);
  Promise.all(queries).then(images=>{
    if (token!==generation) return; // ignore callbacks from a previous theme build
    const created = IDS.map((id,i)=>({id,base:makeSet(images[2*i]),evo:makeSet(images[2*i+1])}));
    // All-or-nothing: no hero is swapped until every atlas validates/loads.
    for (const {id,base,evo} of created) {
      SPR.chars[id]=base;
      Object.defineProperty(SPR.evo,id,{configurable:true,enumerable:true,get:()=>evo});
    }
    SPR.softFacingState='ready';
    console.info('[ASHBLADE] 2-Facing Soft-Angle V4: eight heroes and evolved skins ready');
  }).catch(err=>{
    if (token!==generation) return;
    SPR.softFacingState='fallback';
    console.error('[ASHBLADE] Soft-Angle atlas load failed; source sprites retained:',err);
  });
}
