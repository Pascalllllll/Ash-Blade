#!/usr/bin/env python3
"""Safe, idempotent Kael-only install into an ASHBLADE checkout."""
from pathlib import Path
import datetime, shutil, sys, json
PATCH = Path(__file__).resolve().parents[1]
ROOT = Path.cwd()
REQUIRED = ['src/world.js', 'src/sprites.js', 'src/chars.js','src/deaths.js','src/gfx.js']
if not all((ROOT/f).exists() for f in REQUIRED):
    sys.exit('ERROR: run from the ASHBLADE game repository root (src/world.js missing).')
changes={}

def one(txt, old, new, name):
    if new in txt:
        return txt
    n=txt.count(old)
    if n!=1: raise RuntimeError(f'{name}: expected one exact patch point, found {n} (nothing installed).')
    return txt.replace(old,new,1)

try:
    p='src/sprites.js';s=(ROOT/p).read_text()
    s=one(s, "import { KAEL } from './kael-art.js?v=166';", "import { KAEL } from './kael-art.js?v=166';\nimport { installKaelVisuals } from './kael-visual-runtime.js?v=300';",p)
    s=one(s, '  for (const k in iconCache) delete iconCache[k];', '  for (const k in iconCache) delete iconCache[k];\n  installKaelVisuals(SPR);',p)
    changes[p]=s
    # Option A / old Option C atlas loaders must not overwrite the new Kael after load.
    atlas=ROOT/'src/animation-atlases.js'
    if atlas.exists():
        a=atlas.read_text()
        old_heroes="const HEROES = ['BLADE','GUNNER','WIZARD','NINJA','MECHANIC','TANK','ROBOT','DEV'];"
        new_heroes="const HEROES = ['GUNNER','WIZARD','NINJA','MECHANIC','TANK','ROBOT','DEV'];"
        a=one(a,old_heroes,new_heroes,'src/animation-atlases.js')
        changes['src/animation-atlases.js']=a

    p='src/world.js';s=(ROOT/p).read_text()
    old="""  const set = heroSet();
  const flip = Math.cos(p.state === 'attack' ? p.atkAng : p.aim) < 0;
  const moving = (p.state === 'move' || p.state === 'skill' || p.state === 'charge') && hyp(p.vx, p.vy) > 20;"""
    new="""  const rootSet = heroSet();
  const moving = (p.state === 'move' || p.state === 'skill' || p.state === 'charge') && hyp(p.vx, p.vy) > 20;
  // Option C: for motion use velocity, for attacking use aim. Left mirrors Right.
  // All 3 directions keep one shared 128x96 sprite-cell anchor.
  const attackAim = p.state === 'attack' ? p.atkAng : p.aim;
  const visualAim = (p.state === 'move' && moving) ? Math.atan2(p.vy,p.vx) : attackAim;
  const ux = Math.cos(visualAim), uy = Math.sin(visualAim);
  const direction = Math.abs(uy) > Math.abs(ux) ? (uy < 0 ? 'up' : 'down') : 'right';
  const set = rootSet.directions?.[direction] || rootSet;
  const flip = rootSet.directions ? (direction === 'right' && ux < 0) : Math.cos(attackAim) < 0;"""
    if 'const rootSet = heroSet();' not in s:
        if old in s: s=one(s,old,new,p)
        else:
            alt=old.replace("const flip = Math.cos(p.state === 'attack' ? p.atkAng : p.aim) < 0;","const flip = set.frontFacing ? false : Math.cos(p.state === 'attack' ? p.atkAng : p.aim) < 0;")
            s=one(s,alt,new,p)
    if 'moveFrames[fi]' not in s:
        s=one(s, 'let fr = floats && !set.art ? still : moving ? set.run[fi] : blink && still.blink ? still.blink : still;',
      'let fr = floats && !set.art ? still : moving ? ((rootSet.directions && hyp(p.vx,p.vy) < 65) ? set.walk[fi % set.walk.length] : set.run[fi]) : blink && still.blink ? still.blink : still;',p)
    s=one(s, '  if (set.act) fr = sheetPose(p, set.act, moving) || fr;', '''  if (set.act) fr = sheetPose(p, set.act, moving) || fr;
  // Engine actions Q/E/R each get an independent Kael animation clock.
  // This does NOT change cooldowns, damage, skill logic or projectiles.
  if (G.char === 'BLADE' && rootSet.directions && p.kaelCue) {
    const cue=p.kaelCue, elapsed=G.time-cue.start, frames=set.act[cue.action];
    if (elapsed >= 0 && elapsed < cue.duration && Array.isArray(frames)) {
      fr=frames[Math.min(frames.length-1,Math.floor(elapsed/cue.duration*frames.length))];
    } else if (elapsed >= cue.duration) p.kaelCue=null;
  }''',p)
    # Both clean project and previous Option A/C engine are supported. Option A
    # already supplies setSpriteAction() and correct Q/E/R clocks.
    if 'function setSpriteAction(p, name)' not in s:
        s=one(s, 'kit.r.use(p); p.castAim = null;', "kit.r.use(p); if(G.char==='BLADE')p.kaelCue={action:'ultimate',start:G.time,duration:1.05}; p.castAim = null;",p)
        s=one(s, 'const okQ = kit.q.use(p) !== false; G.skillMult = 1;', "const okQ = kit.q.use(p) !== false; if(okQ&&G.char==='BLADE')p.kaelCue={action:'skill1',start:G.time,duration:0.45}; G.skillMult = 1;",p)
        s=one(s, 'const okE = kit.e.use(p) !== false; G.skillMult = 1;', "const okE = kit.e.use(p) !== false; if(okE&&G.char==='BLADE')p.kaelCue={action:'skill2',start:G.time,duration:0.55}; G.skillMult = 1;",p)
    changes[p]=s

    p='src/deaths.js';s=(ROOT/p).read_text()
    old='''  const set = heroSet(), frames = set.act?.death;
  G.deathFx = { def, t: 0, prev: 0, x: p.x, y: p.y, z: 0, flip: Math.cos(p.aim) < 0, spr: set.idle, frames: Array.isArray(frames) && frames.length ? frames : [set.idle] };'''
    new='''  const rootSet=heroSet(), dx=Math.cos(p.aim), dy=Math.sin(p.aim);
  const direction=Math.abs(dy)>Math.abs(dx)?(dy<0?'up':'down'):'right';
  const set=rootSet.directions?.[direction]||rootSet, frames=set.act?.death;
  const flip=rootSet.directions?(direction==='right'&&dx<0):dx<0;
  G.deathFx = { def, t: 0, prev: 0, x: p.x, y: p.y, z: 0, flip, spr: set.idle, frames: Array.isArray(frames) && frames.length ? frames : [set.idle] };'''
    if 'const rootSet' not in s[s.index('export function startDeath(p)'):s.index('export function updateDeath(dt)')]:
        if old in s:s=one(s,old,new,p)
        else:s=one(s,old.replace('flip: Math.cos(p.aim) < 0', 'flip: set.frontFacing ? false : Math.cos(p.aim) < 0'),new,p)
    changes[p]=s

    p='src/chars.js';s=(ROOT/p).read_text()
    # Entrance: draw actual Kael entrance pose during drop rather than standing idle.
    old="  const spr = () => (G.evo === true ? SPR.evo : SPR.chars)[G.char].idle;"
    new="""  const spr = () => {
    const root=(G.evo === true ? SPR.evo : SPR.chars)[G.char];
    if(G.char!=='BLADE'||!root.directions)return root.idle;
    const frames=root.directions.down.act.entrance;
    return frames[Math.min(frames.length-1,Math.floor(k.t/k.life*frames.length))];
  };"""
    if old in s:s=one(s,old,new,p)
    elif 'const spr = () => {' not in s:raise RuntimeError('src/chars.js: unknown entrance implementation')
    # Draw bespoke ultimate animation in the cinematic without changing its effects.
    old="{ const s = (G.evo === true ? SPR.evo : SPR.chars).BLADE.idle; drawSprite(s, p.x - s.w / 2, p.y - s.h + 1, Math.cos(p.aim) < 0, P.ember); }"
    new="""{ const root = (G.evo === true ? SPR.evo : SPR.chars).BLADE;
              const a=p.aim,dx=Math.cos(a),dy=Math.sin(a);
              const dir=Math.abs(dy)>Math.abs(dx)?(dy<0?'up':'down'):'right';
              const set=root.directions?.[dir]||root;
              const frames=set.act?.ultimate;
              const s=frames?.length?frames[Math.min(frames.length-1,Math.floor((u.t%1.1)/1.1*frames.length))]:set.idle;
              drawSprite(s,p.x-s.w/2,p.y-s.h+1,dir==='right'&&dx<0,P.ember); }"""
    if old in s: s=one(s,old,new,p)
    elif 'const frames=a.act?.ultimate;' in s or 'const root = (G.evo === true ? SPR.evo : SPR.chars).BLADE;' in s:
        # Previous Option A uses an independent cinematic clock already. The
        # new frames share the same action name, so no change is required.
        pass
    else: raise RuntimeError('src/chars.js: unknown ultimate renderer')
    changes[p]=s
except Exception as e:
    sys.exit('Patch validation failed; no files changed: '+str(e))

stamp=datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
backup=ROOT/'.ashblade-backups'/('kael-master-code-'+stamp)
for rel,changed in changes.items():
    f=ROOT/rel
    b=backup/rel;b.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(f,b)
    f.write_text(changed)

src=PATCH/'src/kael-visual-runtime.js'
dst=ROOT/'src/kael-visual-runtime.js'
if dst.exists():
    b=backup/'src/kael-visual-runtime.js';b.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(dst,b)
shutil.copy2(src,dst)
for image in ['right','up','down']:
    src=PATCH/'assets'/f'kael-{image}.png'
    dst=ROOT/'art/sprites/kael-master'/f'kael-{image}.png'
    dst.parent.mkdir(parents=True,exist_ok=True)
    if dst.exists():
        b=backup/'art/sprites/kael-master'/dst.name;b.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(dst,b)
    shutil.copy2(src,dst)
manifest=ROOT/'art/sprites/kael-master/kael-manifest.json'
shutil.copy2(PATCH/'assets/kael-manifest.json',manifest)
print('[OK] ASHBLADE Kael visual master code installed.')
print('[INFO] Kael base only; other seven heroes and evolved skins untouched.')
print('[INFO] Backup:',backup)
print('[INFO] Open the game via HTTP and hard-refresh. Assets load asynchronously; check browser console.')
