#!/usr/bin/env python3
"""Option D: incremental, opt-in Kael-only 3-facing installation.

If a current v3 integration is not present, first installs its compatible
renderer and source assets from the bundled prerequisite_v3 directory.
All Option D edits are staged and checked before any write; every modified file
is backed up. Non-Kael heroes keep their existing sprite pipeline unchanged.
"""
from __future__ import annotations
from pathlib import Path
import datetime
import json
import shutil
import subprocess
import sys

PATCH=Path(__file__).resolve().parents[1]
ROOT=Path.cwd()
REQUIRED=['src/world.js','src/chars.js','src/deaths.js','src/sprites.js','src/gfx.js']
if not all((ROOT/f).is_file() for f in REQUIRED):
    sys.exit('ERROR: run this script from the ASHBLADE project root (src/world.js missing).')

v3_source=(ROOT/'src/sprites.js').read_text()
if 'installKaelVisuals' not in v3_source:
    print('[INFO] V3 renderer not installed: adding compatible base Kael runtime first...')
    run=subprocess.run([sys.executable, str(PATCH/'prerequisite_v3/tools/install.py')], cwd=ROOT)
    if run.returncode:
        sys.exit('[ERROR] Cannot safely install prerequisite v3 on this checkout; no Option D changes made. Restore your project backup and inspect README.')

if 'kael-facing.mjs?v=401' in (ROOT/'src/world.js').read_text():
    print('[INFO] Option D is already integrated. No engine changes needed.')
    sys.exit(0)


def replace_one(txt: str, old: str, new: str, name: str):
    n=txt.count(old)
    if n!=1: raise RuntimeError(f'{name}: expected 1 exact match, found {n}; no Option D files written')
    return txt.replace(old,new,1)

changes={}
try:
    path='src/world.js'
    code=(ROOT/path).read_text()
    code=replace_one(code,"import { KILLS, startDeath, updateDeath, drawDeath } from './deaths.js?v=165';", "import { KILLS, startDeath, updateDeath, drawDeath } from './deaths.js?v=165';\nimport { selectKaelFacing } from './kael-facing.mjs?v=401';",path)
    old="""  // Option C: for motion use velocity, for attacking use aim. Left mirrors Right.
  // All 3 directions keep one shared 128x96 sprite-cell anchor.
  const attackAim = p.state === 'attack' ? p.atkAng : p.aim;
  const visualAim = (p.state === 'move' && moving) ? Math.atan2(p.vy,p.vx) : attackAim;
  const ux = Math.cos(visualAim), uy = Math.sin(visualAim);
  const direction = Math.abs(uy) > Math.abs(ux) ? (uy < 0 ? 'up' : 'down') : 'right';
  const set = rootSet.directions?.[direction] || rootSet;
  const flip = rootSet.directions ? (direction === 'right' && ux < 0) : Math.cos(attackAim) < 0;"""
    new="""  // Option D: move and aim remain 360 degrees; only the displayed Kael pose uses
  // CENTER / RIGHT / mirrored LEFT. Moving upward NEVER shows a rear-facing pose.
  // Two transparent atlases share the same ground anchor; keep the engine VFX independent.
  const attackAim = p.state === 'attack' ? p.atkAng : p.aim;
  let direction, flip;
  if (G.char === 'BLADE' && rootSet.directions?.center) {
    const facing = selectKaelFacing(p, moving, G.time);
    direction = facing.direction;
    flip = facing.flip;
  } else {
    // Compatibility: all other heroes keep their previous orientation logic.
    const visualAim = (p.state === 'move' && moving) ? Math.atan2(p.vy,p.vx) : attackAim;
    const ux = Math.cos(visualAim), uy = Math.sin(visualAim);
    direction = Math.abs(uy) > Math.abs(ux) ? (uy < 0 ? 'up' : 'down') : 'right';
    flip = rootSet.directions ? (direction === 'right' && ux < 0) : Math.cos(attackAim) < 0;
  }
  const set = rootSet.directions?.[direction] || rootSet;"""
    code=replace_one(code,old,new,path)
    # V3 already disables procedural breath/bob on art=true. This keeps fixed foot anchor.
    changes[path]=code

    path='src/deaths.js'
    code=(ROOT/path).read_text()
    code=replace_one(code,"import { G, TAU, rnd, clamp, part, bleed, splat, dust, sparks, scorch, addRing, addText, glitch, flash, shake, heroSet, sprFor } from './world.js?v=165';", "import { G, TAU, rnd, clamp, part, bleed, splat, dust, sparks, scorch, addRing, addText, glitch, flash, shake, heroSet, sprFor } from './world.js?v=165';\nimport { facingFromAngle } from './kael-facing.mjs?v=401';",path)
    old="""  const rootSet=heroSet(), dx=Math.cos(p.aim), dy=Math.sin(p.aim);
  const direction=Math.abs(dy)>Math.abs(dx)?(dy<0?'up':'down'):'right';
  const set=rootSet.directions?.[direction]||rootSet, frames=set.act?.death;
  const flip=rootSet.directions?(direction==='right'&&dx<0):dx<0;"""
    new="""  const rootSet=heroSet(), dx=Math.cos(p.aim), dy=Math.sin(p.aim);
  const f=G.char==='BLADE'&&rootSet.directions?.center ? facingFromAngle(p.aim) : null;
  const direction=f ? (f==='center'?'center':'right') : (Math.abs(dy)>Math.abs(dx)?(dy<0?'up':'down'):'right');
  const set=rootSet.directions?.[direction]||rootSet, frames=set.act?.death;
  const flip=f ? (f==='left') : (rootSet.directions?(direction==='right'&&dx<0):dx<0);"""
    code=replace_one(code,old,new,path)
    changes[path]=code

    path='src/chars.js'
    code=(ROOT/path).read_text()
    code=replace_one(code,"import { input } from './input.js?v=165';", "import { input } from './input.js?v=165';\nimport { facingFromAngle } from './kael-facing.mjs?v=401';",path)
    code=replace_one(code,'root.directions.down.act.entrance','root.directions.center.act.entrance',path)
    old="""              const a=p.aim,dx=Math.cos(a),dy=Math.sin(a);
              const dir=Math.abs(dy)>Math.abs(dx)?(dy<0?'up':'down'):'right';
              const set=root.directions?.[dir]||root;
              const frames=set.act?.ultimate;
              const s=frames?.length?frames[Math.min(frames.length-1,Math.floor((u.t%1.1)/1.1*frames.length))]:set.idle;
              drawSprite(s,p.x-s.w/2,p.y-s.h+1,dir==='right'&&dx<0,P.ember); }"""
    new="""              const a=p.aim,dx=Math.cos(a),dy=Math.sin(a);
              const f=root.directions?.center ? facingFromAngle(a) : null;
              const dir=f ? (f==='center'?'center':'right') : (Math.abs(dy)>Math.abs(dx)?(dy<0?'up':'down'):'right');
              const set=root.directions?.[dir]||root;
              const frames=set.act?.ultimate;
              const s=frames?.length?frames[Math.min(frames.length-1,Math.floor((u.t%1.1)/1.1*frames.length))]:set.idle;
              drawSprite(s,p.x-s.w/2,p.y-s.h+1,f?f==='left':dir==='right'&&dx<0,P.ember); }"""
    code=replace_one(code,old,new,path)
    changes[path]=code

    path='src/sprites.js'
    code=(ROOT/path).read_text()
    code=replace_one(code, "from './kael-visual-runtime.js?v=300'", "from './kael-visual-runtime.js?v=401'",path)
    changes[path]=code
except Exception as exc:
    sys.exit('[ERROR] '+str(exc))

stamp=datetime.datetime.now().strftime('%Y%m%d-%H%M%S-%f')
backup=ROOT/'.ashblade-backups'/('kael-option-d-'+stamp)
for rel,contents in changes.items():
    original=ROOT/rel
    target=backup/rel
    target.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(original,target)
    original.write_text(contents)

for rel,source in {
    'src/kael-facing.mjs': PATCH/'src/kael-facing.mjs',
    'src/kael-visual-runtime.js': PATCH/'src/kael-visual-runtime.js',
    'art/sprites/kael-master/kael-center.png': PATCH/'assets/kael-center.png',
    'art/sprites/kael-master/kael-right.png': PATCH/'assets/kael-right.png',
    'art/sprites/kael-master/kael-manifest.json': PATCH/'assets/kael-manifest.json',
}.items():
    target=ROOT/rel
    target.parent.mkdir(parents=True,exist_ok=True)
    if target.exists():
        copy=backup/rel
        copy.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(target,copy)
    shutil.copy2(source,target)
print('[OK] ASHBLADE Kael Option D installed: CENTER / RIGHT / mirrored LEFT')
print('[OK] No Up/back-facing Kael pose used; 360-degree aiming/movement unchanged')
print('[OK] Existing Q / E / R, entrance/death effects, other heroes and evolved skins preserved')
print('[INFO] Backups:',backup)
print('[INFO] Open the project via HTTP; hard-refresh Ctrl+Shift+R.')
