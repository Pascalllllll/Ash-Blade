// ASHBLADE OPTION A: all playable heroes remain FRONT-FACING.
// Pixel-accurate transparent images, not runtime segmentation or OCR.
// 128 x 96 SOURCE pixels, hero ~54px tall (Grom 60), all share bottom-centre pivot.
import { makeCanvas, SS } from './gfx.js?v=171';
export const CELL_W = 128, CELL_H = 96;
const ACTIONS = { entrance:8, idle:8, walk:8, run:8, attack1:8, attack2:8,
  attack3:8, skill1:8, skill2:8, ultimate:10, dash:6, hit:4, death:8 };
const HEROES = ['GUNNER','WIZARD','NINJA','MECHANIC','TANK','ROBOT','DEV'];
const files = new Map();
const cache = new WeakMap();
function makeSprite(img, x, y) {
  const n = makeCanvas(CELL_W,CELL_H), c = n.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.drawImage(img,x,y,CELL_W,CELL_H,0,0,CELL_W,CELL_H);
  const f = makeCanvas(CELL_W,CELL_H), g=f.getContext('2d');
  g.translate(CELL_W,0);g.scale(-1,1);g.drawImage(n,0,0);
  const t = new Map();
  return { w:CELL_W/SS,h:CELL_H/SS,k:SS,n,f,
    tint(col,flip) {
      const key=col+(flip?'f':'n');if(t.has(key))return t.get(key);
      const r=makeCanvas(CELL_W,CELL_H),z=r.getContext('2d');
      z.drawImage(flip?f:n,0,0);z.globalCompositeOperation='source-in';
      z.fillStyle=col;z.fillRect(0,0,CELL_W,CELL_H);z.globalCompositeOperation='source-over';
      t.set(key,r);return r;
    }
  };
}
function loadImg(id,evolved,direction=null) {
  const file=id.toLowerCase()+'-'+(evolved?'evolved':'base')+(direction?'-'+direction:'')+'.png';
  if(files.has(file))return files.get(file);
  const p=new Promise((resolve,reject)=>{
    const im=new Image();
    im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('Missing atlas: '+file));
    im.src=new URL('../art/sprites/'+file,import.meta.url).href;
  });files.set(file,p);return p;
}
function decode(img) {
  let frames=cache.get(img);if(frames)return frames;
  frames={};let row=0;
  for (const [action,count] of Object.entries(ACTIONS)) {
    frames[action]=Array.from({length:count},(_,i)=>makeSprite(img,i*CELL_W,row*CELL_H));
    row++;
  }
  cache.set(img,frames);return frames;
}
function heroSet(img) {
  const f=decode(img);
  return {
    idle:f.idle[0],idles:f.idle,run:f.run,walk:f.walk,
    art:true,noWeapon:true,ownWeapon:true,frontFacing:true,
    eye:[CELL_W/(2*SS),CELL_H/(3*SS)],
    act:{attack:[f.attack1,f.attack2,f.attack3],charge:f.attack1[0],release:f.attack3,
      skill1:f.skill1,skill2:f.skill2,skill:f.skill1,ultimate:f.ultimate,
      entrance:f.entrance,dash:f.dash,hit:f.hit,death:f.death,stance:f.idle[0]}
  };
}
// Sprites are loaded once in the background; the original RLE sprites remain usable until ready.
// A stale callback cannot mutate a newly rebuilt SPR instance after a theme change.
export function installFrontFacingSprites(SPR) {
  const token=Symbol('atlas-load');SPR.frontFacingLoad=token;SPR.frontFacingReady=0;
  for (const id of HEROES) {
    // Option C: Kael has three truly separate source directions; left uses the mirrored right bitmap.
    if (id === 'BLADE') {
      const dirs=['right','up','down'];
      Promise.all(dirs.flatMap(dir=>[loadImg(id,false,dir),loadImg(id,true,dir)])).then(imgs=>{
        if(SPR.frontFacingLoad!==token)return;
        const base={},evo={};
        dirs.forEach((dir,j)=>{base[dir]=heroSet(imgs[j*2]);evo[dir]=heroSet(imgs[j*2+1]);});
        const root=base.right, aw=evo.right;
        root.directions=base;root.frontFacing=false;
        aw.directions=evo;aw.frontFacing=false;
        SPR.chars[id]=root;
        Object.defineProperty(SPR.evo,id,{get:()=>aw,configurable:true,enumerable:true});
        SPR.frontFacingReady=(SPR.frontFacingReady||0)+1;
      }).catch(err=>console.error('[ASHBLADE] Kael Option C atlas:',err));
      continue;
    }
    Promise.all([loadImg(id,false),loadImg(id,true)]).then(([base,evolved])=>{
      if(SPR.frontFacingLoad!==token)return;
      SPR.chars[id]=heroSet(base);
      const ev=heroSet(evolved);
      Object.defineProperty(SPR.evo,id,{get:()=>ev,configurable:true,enumerable:true});
      SPR.frontFacingReady=(SPR.frontFacingReady||0)+1;
    }).catch(err=>console.error('[ASHBLADE] '+id+' atlas:',err));
  }
}
