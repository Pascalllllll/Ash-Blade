// ASHBLADE V7 – shared 2-facing Soul Knight motion atlas loader.
// 16-frame idle, 12-frame walk/run, 12-frame attack1/2/3 per skin.
// All remaining Q/E/R, dash, hit and death actions retain original gameplay assets.
// Uses the original V6 base/Evolved atlas for the fallback actions.
// Renderer stays 360-degree aim, Left = mirror of mostly-front Right.
import { SS } from './gfx.js?v=206';

export const FRAME = Object.freeze({ w:120, h:96, cols:10, rows:13, footX:60, footY:92 });
export const COUNTS = Object.freeze({
  entrance:8, idle:16, walk:12, run:12,
  attack1:12, attack2:12, attack3:12, skill1:8, skill2:8, ultimate:10,
  dash:6, hit:4, death:8,
});
const OLD_ACTIONS=['entrance','idle','walk','run','attack1','attack2','attack3','skill1','skill2','ultimate','dash','hit','death'];
const MOTION_ACTIONS=['idle','walk','run','attack1','attack2','attack3'];
const RESOURCE={BLADE:'blade',GUNNER:'gunner',WIZARD:'wizard',NINJA:'ninja',MECHANIC:'mechanic',TANK:'tank',ROBOT:'robot',DEV:'dev'};
const IDS=Object.keys(RESOURCE);
const requests=new Map();
const assetUrl=(rel)=>new URL(`../art/sprites/${rel}`,import.meta.url).href;
function loadImage(url, width, height){
  if(requests.has(url))return requests.get(url);
  const task=new Promise((resolve,reject)=>{
    const img=new Image(); img.decoding='async';
    img.onload=()=>img.naturalWidth===width&&img.naturalHeight===height
      ? resolve(img)
      : reject(new Error(`Expected atlas ${width}x${height}, got ${img.naturalWidth}x${img.naturalHeight}: ${url}`));
    img.onerror=()=>reject(new Error(`Cannot load atlas: ${url}`));
    img.src=url;
  });
  requests.set(url,task);return task;
}
function canvas(){
  const c=document.createElement('canvas');c.width=120;c.height=96;
  c.getContext('2d').imageSmoothingEnabled=false;return c;
}
function wrapFrame(image,col,row){
  const n=canvas(),nc=n.getContext('2d');
  nc.drawImage(image,col*120,row*96,120,96,0,0,120,96);
  const f=canvas(),fc=f.getContext('2d');
  fc.translate(120,0);fc.scale(-1,1);fc.drawImage(n,0,0);
  const tinted=new Map();
  return {n,f,k:SS,w:120/SS,h:96/SS,
    tint(color,flip=false){
      const key=`${color}:${flip?'L':'R'}`;
      if(tinted.has(key))return tinted.get(key);
      const out=canvas(),ctx=out.getContext('2d');
      ctx.drawImage(flip?f:n,0,0);
      ctx.globalCompositeOperation='source-in';ctx.fillStyle=color;ctx.fillRect(0,0,120,96);
      ctx.globalCompositeOperation='source-over';
      if(tinted.size>4)tinted.clear();
      tinted.set(key,out);return out;
    }
  };
}
function makeSet(base,motion){
  const cache=new Map();
  function get(action){
    if(cache.has(action))return cache.get(action);
    const oi=OLD_ACTIONS.indexOf(action), mi=MOTION_ACTIONS.indexOf(action);
    if(oi===-1)throw new Error(`Unknown animation ${action}`);
    const fromMotion=motion && mi>=0;
    const n=fromMotion ? COUNTS[action] : (action==='ultimate'?10:action==='dash'?6:action==='hit'?4:8);
    const list=Array.from({length:n},(_,i)=>wrapFrame(fromMotion?motion:base,i,fromMotion?mi:oi));
    cache.set(action,list);return list;
  }
  const idles=get('idle');
  const set={
    idle:idles[0],idles,
    get walk(){return get('walk');},get run(){return get('run');},
    art:true,noWeapon:true,ownWeapon:true,
    frontFacing:false,softFacing:true,
    eye:[120/(2*SS),96/(3*SS)]
  };
  const act={
    stance:idles[0],
    get attack(){return [get('attack1'),get('attack2'),get('attack3')];},
    get charge(){return get('attack1')[0];},
    get release(){return get('attack3');},
    get skill(){return get('skill1');}
  };
  for(const key of ['entrance','skill1','skill2','ultimate','dash','hit','death','attack1','attack2','attack3']){
    Object.defineProperty(act,key,{enumerable:true,get:()=>get(key)});
  }
  set.act=act;return set;
}
export function softFacingLeft(p){
  const a=p.state==='attack'?(p.atkAng??p.aim):p.aim;
  const x=Math.cos(Number.isFinite(a)?a:0);
  let dir=p.softFacingDirection||1;
  if(x<-.28)dir=-1;else if(x>.28)dir=1;
  else if(Math.abs(p.vx||0)>Math.max(25,Math.abs(p.vy||0)*1.8))dir=Math.sign(p.vx);
  p.softFacingDirection=dir;return dir<0;
}
let generation=0;
export async function installSoftAngleSprites(SPR){
  const token=++generation;
  SPR.softFacingState='loading-v7';
  const jobs=IDS.flatMap(id=>{
    const stem=RESOURCE[id];
    return [false,true].map(evo=>{
      const skin=evo?'evolved':'base';
      // Both spritesheets load together, and the motion overlay has a safe fallback.
      return Promise.all([
        loadImage(assetUrl(`soft-facing/${stem}-${skin}-right.png?v=7`),1200,1248),
        loadImage(assetUrl(`motion-v7/${stem}-${skin}-motion-v7.png?v=7`),1920,576).catch(err=>{
          console.warn(`[ASHBLADE] V7 ${stem}/${skin}: motion atlas missing; keeping legacy animations.`,err);
          return null;
        })
      ]).then(([base,motion])=>({id,evo,base,motion}));
    });
  });
  try{
    const data=await Promise.all(jobs);
    if(token!==generation)return;
    for(const {id,evo,base,motion} of data){
      const set=makeSet(base,motion);
      if(evo)Object.defineProperty(SPR.evo,id,{configurable:true,enumerable:true,get:()=>set});
      else SPR.chars[id]=set;
    }
    SPR.softFacingState='ready-v7';
    console.info('[ASHBLADE] Motion V7 ready: 8 heroes × base/evolved, 16 idle / 12 walk / 12 run / 12 combo frames');
  }catch(err){
    if(token!==generation)return;
    SPR.softFacingState='fallback';
    console.error('[ASHBLADE] V7 load error: retaining the original hero sprites.',err);
  }
}
