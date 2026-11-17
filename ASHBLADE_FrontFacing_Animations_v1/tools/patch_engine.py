#!/usr/bin/env python3
from pathlib import Path
root=Path('/mnt/data/ashblade_full/src')
out=Path('/mnt/data/ashblade_front_patch/src')

def sub(s,find,repl,label):
 assert find in s, f'cannot match {label}'
 return s.replace(find,repl,1)

w=(root/'world.js').read_text()
w=sub(w,'// the hero\'s pose for what the player is doing:', '''// Visually distinct, pre-drawn Q/E/R animations. These do not alter the game's move logic.
const SPECIAL_DUR = { BLADE:1.85, GUNNER:4, WIZARD:2.6, NINJA:1.6,
  MECHANIC:1.4, TANK:6, ROBOT:4.5, DEV:1.55 };
function setSpriteAction(p, name) {
  let dur = name === 'ultimate' ? SPECIAL_DUR[G.char] || 1.3 : name === 'skill1' ? 0.48 : 0.67;
  if (name === 'ultimate') {
    if (G.char === 'GUNNER') dur = p.k.stand || dur;
    if (G.char === 'WIZARD') dur = p.k.star || dur;
    if (G.char === 'TANK') dur = p.fortress || dur;
    if (G.char === 'ROBOT') dur = p.k.orb || dur;
  }
  p.spriteAction = { kind:name, start:G.time, duration:dur };
}
// the hero's pose for what the player is doing:''','action mark')
# Replace core sheetPose function
start=w.index('function sheetPose(p, a, moving) {')
end=w.index('// each hero\'s front hand',start)
w=w[:start]+'''function sheetPose(p,a,moving) {
  if(p.state!==p.poseState){p.poseState=p.state;p.poseT=G.time;}
  const t=G.time-p.poseT;
  const at=(v,k)=>(Array.isArray(v)?v[Math.max(0,Math.min(v.length-1,Math.floor(Math.max(0,k)*v.length)))]:v);
  if(p.state==='attack'){p.fightT=G.time;return at(a.attack[p.step%a.attack.length],p.atkT/p.atkDur);}
  if(p.state==='charge'){p.fightT=G.time;return a.charge;}
  if(p.state==='chg'){p.fightT=G.time;return at(a.release,t/.35);}
  // a Q, E or R move has its own sequence. Sustained R skills hold/loop the central frames.
  const q=p.spriteAction;
  if(q&&G.time-q.start<q.duration){
    const seq=a[q.kind];
    if(Array.isArray(seq)&&seq.length){
      const e=G.time-q.start;
      if(q.kind==='ultimate'&&q.duration>2&&e>0.35&&e<q.duration-0.3)
        return seq[3+(Math.floor((e-0.35)*12)%Math.min(5,seq.length-3))];
      p.fightT=G.time;
      return at(seq,e/q.duration);
    }
  }
  if(p.state==='skill'){p.fightT=G.time;return at(a.skill,t/.5);}
  if(p.state==='dash')return at(a.dash,t/(G.kit.dash?.time||.14));
  if(p.hurtT>0)return at(a.hit,1-p.hurtT/.3);
  // gunner/caster basic attacks do not set state='attack' in the original game.
  if(!G.kit.melee&&p.atkHeld&&p.state==='move'){
    const pick=(G.char==='GUNNER'&&p.k.reload>0)?2:Math.floor(G.time*5)%2;
    if(a.attack?.[pick])return at(a.attack[pick],(G.time*10)%1);
  }
  if(!moving&&G.time-(p.fightT??-9)<1.2)return a.stance;
  return null;
}
''' +w[end:]
# Reorder player `set` prior to flip calculation
w=sub(w,"  const flip = Math.cos(p.state === 'attack' ? p.atkAng : p.aim) < 0;\n  const moving", "  const flip = set.frontFacing ? false : Math.cos(p.state === 'attack' ? p.atkAng : p.aim) < 0;\n  const moving", 'frontFacing flip')
# assign markers after abilities are used
w=sub(w,'kit.r.use(p); p.castAim = null; buzz(\'ult\');', "kit.r.use(p); setSpriteAction(p,'ultimate'); p.castAim = null; buzz('ult');",'r ability')
w=sub(w,'if (okQ) { p.energy -= kit.q.cost;', "if (okQ) { setSpriteAction(p,'skill1'); p.energy -= kit.q.cost;",'q ability')
w=sub(w,'if (okE) { p.energy -= kit.e.cost;', "if (okE) { setSpriteAction(p,'skill2'); p.energy -= kit.e.cost;",'e ability')
# suppress camera facing mirror for front-facing format in other drawSprite use? main only
(out/'world.js').write_text(w)

ch=(root/'chars.js').read_text()
ch=sub(ch, "  const spr = () => (G.evo === true ? SPR.evo : SPR.chars)[G.char].idle;", """  const spr = () => {
    const set=(G.evo===true?SPR.evo:SPR.chars)[G.char];
    const frames=set.act?.entrance;
    return frames?.length ? frames[Math.min(frames.length-1,Math.floor((k.t/k.life)*frames.length))] : set.idle;
  };""",'cinematic entrance pose')
ch=sub(ch,"    const s = SPR.chars.DEV.idle, x = p.x - s.w / 2, y = p.y - s.h + 1;", """    const set=SPR.chars.DEV, f=set.act?.entrance;
    const s=f?.length?f[Math.min(f.length-1,Math.floor(k.t/k.life*f.length))]:set.idle;
    const x=p.x-s.w/2,y=p.y-s.h+1;""",'Dev cinematic entrance pose')
# Kael cinematic: use ultimate sequences, if available
ch=sub(ch,"{ const s = (G.evo === true ? SPR.evo : SPR.chars).BLADE.idle; drawSprite(s, p.x - s.w / 2, p.y - s.h + 1, Math.cos(p.aim) < 0, P.ember); }", """{ const a=(G.evo===true?SPR.evo:SPR.chars).BLADE;
              const frames=a.act?.ultimate;
              const elapsed=G.time-(p.spriteAction?.start||G.time);
              const ix=Math.min((frames?.length||1)-1,Math.floor(Math.max(0,elapsed)/1.85*(frames?.length||1)));
              const s=frames?.[ix]||a.idle;
              drawSprite(s,p.x-s.w/2,p.y-s.h+1,false,P.ember); }""",'Kael ultimate scene')
# Rin cinematic sprite: find exact occurrence
(out/'chars.js').write_text(ch)

# death: 8-frame sequence, keep unique per-hero effects already authored
v=(root/'deaths.js').read_text()
v=sub(v,'const STEP = 0.2;', 'const STEP = 0.16;', 'death 8 frames')
v=sub(v,'const LAND = 3 * STEP;', 'const LAND = 4 * STEP;', 'impact frame')
v=sub(v,'const GONE = 5 * STEP;', 'const GONE = 7 * STEP;', 'last death frame')
v=sub(v,"G.deathFx = { def, t: 0, prev: 0, x: p.x, y: p.y, z: 0, flip: Math.cos(p.aim) < 0,", "G.deathFx = { def, t: 0, prev: 0, x: p.x, y: p.y, z: 0, flip: set.frontFacing ? false : Math.cos(p.aim) < 0,",'death front')
(out/'deaths.js').write_text(v)
print('patched world/chars/deaths')
