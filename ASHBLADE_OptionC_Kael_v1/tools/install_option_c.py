#!/usr/bin/env python3
"""Apply surgical Option C Kael engine changes to an installed Option A project.
Refuses to change unfamiliar sources, creates file backups, and preserves other heroes.
"""
from pathlib import Path
import sys,shutil,datetime,os
ROOT=Path.cwd();PATCH=Path(__file__).resolve().parents[1]
required=[ROOT/'src/world.js', ROOT/'src/sprites.js',ROOT/'src/animation-atlases.js',ROOT/'src/deaths.js',ROOT/'src/chars.js']
if not all(p.exists() for p in required):
    sys.exit('ERROR: Run from ASHBLADE repository root after installing the Option A animation patch. Missing source file(s).')
if not (ROOT/'art/sprites/blade-base.png').exists():
    sys.exit('ERROR: Option A art/sprites/blade-base.png is missing; install the existing FrontFacing Animations v1 patch first.')
changes={}
def require_one(src,old,new,filename):
    count=src.count(old)
    if count!=1:raise ValueError(f'{filename}: expected one patch point, got {count}. No files have been changed.')
    return src.replace(old,new,1)
try:
    fn='src/animation-atlases.js';s=(ROOT/fn).read_text()
    s=require_one(s,'function loadImg(id,evolved) {','function loadImg(id,evolved,direction=null) {',fn)
    s=require_one(s,"const file=id.toLowerCase()+'-'+(evolved?'evolved':'base')+'.png';",
        "const file=id.toLowerCase()+'-'+(evolved?'evolved':'base')+(direction?'-'+direction:'')+'.png';",fn)
    point='  for (const id of HEROES) {\n    Promise.all([loadImg(id,false),loadImg(id,true)])'
    repl='''  for (const id of HEROES) {
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
    Promise.all([loadImg(id,false),loadImg(id,true)])'''
    s=require_one(s,point,repl,fn);changes[fn]=s

    fn='src/world.js';s=(ROOT/fn).read_text()
    point="""  const set = heroSet();
  const flip = set.frontFacing ? false : Math.cos(p.state === 'attack' ? p.atkAng : p.aim) < 0;
  const moving = (p.state === 'move' || p.state === 'skill' || p.state === 'charge') && hyp(p.vx, p.vy) > 20;"""
    repl="""  const rootSet = heroSet();
  const moving = (p.state === 'move' || p.state === 'skill' || p.state === 'charge') && hyp(p.vx, p.vy) > 20;
  // Hybrid 4+Mirror: movement direction chooses movement art; actual attack aim chooses combat art.
  // Compare x/y components: vertical dominates -> up or down, otherwise right or mirrored right.
  const visualAim = (moving && p.state === 'move') ? Math.atan2(p.vy,p.vx)
    : (p.state === 'attack' ? p.atkAng : p.aim);
  const vxDir=Math.cos(visualAim),vyDir=Math.sin(visualAim);
  const direction = Math.abs(vyDir)>Math.abs(vxDir) ? (vyDir<0?'up':'down') : 'right';
  const set = rootSet.directions ? rootSet.directions[direction] : rootSet;
  const flip = rootSet.directions ? (direction==='right' && vxDir<0)
    : set.frontFacing ? false : Math.cos(p.state === 'attack' ? p.atkAng : p.aim) < 0;"""
    s=require_one(s,point,repl,fn);changes[fn]=s
    fn='src/deaths.js';s=(ROOT/fn).read_text()
    point="""  const set = heroSet(), frames = set.act?.death;
  G.deathFx = { def, t: 0, prev: 0, x: p.x, y: p.y, z: 0, flip: set.frontFacing ? false : Math.cos(p.aim) < 0, spr: set.idle, frames: Array.isArray(frames) && frames.length ? frames : [set.idle] };"""
    repl="""  const rootSet = heroSet();
  const a=p.aim,dx=Math.cos(a),dy=Math.sin(a);
  const direction=Math.abs(dy)>Math.abs(dx)?(dy<0?'up':'down'):'right';
  const set=rootSet.directions?.[direction]||rootSet,frames=set.act?.death;
  const flip=rootSet.directions ? (direction==='right'&&dx<0) : (set.frontFacing ? false : dx<0);
  G.deathFx = { def, t: 0, prev: 0, x: p.x, y: p.y, z: 0, flip, spr: set.idle, frames: Array.isArray(frames) && frames.length ? frames : [set.idle] };"""
    s=require_one(s,point,repl,fn);changes[fn]=s
    fn='src/chars.js';s=(ROOT/fn).read_text()
    point="""    const set=(G.evo===true?SPR.evo:SPR.chars)[G.char];
    const frames=set.act?.entrance;"""
    repl="""    const original=(G.evo===true?SPR.evo:SPR.chars)[G.char];
    // Kael's initial entrance faces the camera; other heroes retain their existing entrance art.
    const set=original.directions?.down||original;
    const frames=set.act?.entrance;"""
    s=require_one(s,point,repl,fn);changes[fn]=s
    fn='src/sprites.js';s=(ROOT/fn).read_text()
    s=require_one(s,"from './animation-atlases.js?v=171'","from './animation-atlases.js?v=173-optionc'",fn)
    changes[fn]=s
except (ValueError,Exception) as e:
    sys.exit('ERROR: '+str(e))

backup=ROOT/'.ashblade-backups'/('kael-option-c-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S'))
for fn,s in changes.items():
    dest=ROOT/fn;original=dest.read_text()
    bp=backup/fn;bp.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(dest,bp)
    dest.write_text(s)
for path in sorted((PATCH/'art/sprites').glob('blade-*-*.png')):
    dest=ROOT/'art/sprites'/path.name;dest.parent.mkdir(parents=True,exist_ok=True)
    if dest.exists():
        bp=backup/'art/sprites'/path.name;bp.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(dest,bp)
    shutil.copy2(path,dest)
shutil.copy2(PATCH/'art/sprites/kael-option-c-manifest.json', ROOT/'art/sprites/kael-option-c-manifest.json')
shutil.copy2(PATCH/'preview-option-c.html',ROOT/'preview-option-c.html')
(ROOT/'desc').mkdir(parents=True,exist_ok=True)
shutil.copy2(PATCH/'desc/kael-option-c-direction-contract.md',ROOT/'desc/kael-option-c-direction-contract.md')
print('Installed Kael Hybrid 4+Mirror Option C. Other heroes remain unchanged.')
print('Backup:',backup)
print('Preview: python3 -m http.server 8000 -> http://localhost:8000/preview-option-c.html')
