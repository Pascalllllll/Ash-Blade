#!/usr/bin/env python3
"""Apply changes with exact markers and timestamped backups. Run from ASHBLADE root."""
from pathlib import Path
import shutil,sys,datetime,re
project=Path.cwd(); package=Path(__file__).resolve().parent
if not (project/'src/sprites.js').is_file() or not (project/'src/world.js').is_file():
 sys.exit('ERROR: run this installer from your ASHBLADE project root (src/sprites.js and src/world.js needed).')
files={n:(project/'src'/n).read_text() for n in ('sprites.js','world.js')}
s=files['sprites.js'];w=files['world.js']
def one(src,old,new,where):
 c=src.count(old)
 if c!=1: raise ValueError(f'{where}: expected one exact match, got {c}; original files unchanged')
 return src.replace(old,new,1)
try:
 if "./soft-facing.js" in s or "softFacingLeft" in w: sys.exit('Already installed or conflicting directional patch detected. Installer changed nothing.')
 # Earlier Option D (Kael-only) asynchronously overrides sprites; retire its loader
 # before installing the shared eight-hero implementation.
 if 'installKaelVisuals(SPR);' in s:
  s=one(s,'  installKaelVisuals(SPR);','  // Previous Kael-only loader retired: all 8 heroes now share one soft-angle pipeline.','retire Kael-only loader')
 s=one(s,"import { makeSprite, P, SS } from './gfx.js?v=165';", "import { makeSprite, P, SS } from './gfx.js?v=165';\nimport { normalizeSoftHero } from './soft-facing.js';",'sprites import')
 s=one(s,"const set = { idles: seq('idle'), run: seq('run') };", "const set = { idles: seq('idle'), walk: seq('walk'), run: seq('run') };",'separate walk frames')
 s=one(s,"SPR.chars[id] = buildSheetHero(SHEETS[id], SHEETS[id].palette);", "SPR.chars[id] = normalizeSoftHero(buildSheetHero(SHEETS[id], SHEETS[id].palette), id);",'base heroes')
 s=one(s,"evo = buildSheetHero(SHEETS[id], SHEETS[id].evo)", "evo = normalizeSoftHero(buildSheetHero(SHEETS[id], SHEETS[id].evo), id)",'evolved heroes')
 s=one(s,"charge: () => seq('jump')[1], release: () => seq(has('attack3') ? 'attack3' : 'attack2'), skill: () => seq(has('skill2') ? 'skill2' : 'skill'),", "charge: () => seq('attack1')[0], release: () => seq(has('attack3') ? 'attack3' : 'attack2'),\n    skill: () => seq(has('skill2') ? 'skill2' : 'skill'),\n    skill1: () => seq(has('skill1') ? 'skill1' : 'skill'),\n    skill2: () => seq(has('skill2') ? 'skill2' : 'skill'),\n    ultimate: () => seq(has('ultimate') ? 'ultimate' : has('attack3') ? 'attack3' : 'skill'),\n    entrance: () => seq('idle'),",'individual skills')
 # Replace existing drawPlayer flip only, not enemy flips (which remain unchanged)
 w=one(w,"import { KILLS, startDeath, updateDeath, drawDeath } from './deaths.js?v=165';", "import { KILLS, startDeath, updateDeath, drawDeath } from './deaths.js?v=165';\nimport { softFacingLeft } from './soft-facing.js';",'world import')
 if 'const rootSet = heroSet();' in w:
  # Option C/D uses directional subsets and an outdated Kael-only cue overlay.
  oldblock=re.compile(r"  const rootSet = heroSet\(\);\n.*?  const set = rootSet\.directions\?\.\[direction\] \|\| rootSet;",re.S)
  replacement="  const set = heroSet();\n  const moving = (p.state === 'move' || p.state === 'skill' || p.state === 'charge') && hyp(p.vx, p.vy) > 20;\n  const flip = softFacingLeft(p);"
  w,count=oldblock.subn(lambda _:replacement,w,count=1)
  if count!=1: raise ValueError('existing Option C/D player facing block not recognized')
  w=w.replace("((rootSet.directions && hyp(p.vx,p.vy) < 65) ? set.walk[fi % set.walk.length] : set.run[fi])", "(set.walk?.length && hyp(p.vx,p.vy) < 65 ? set.walk[fi % set.walk.length] : set.run[fi])")
  legacy=re.compile(r"  // Engine actions Q/E/R each get an independent Kael animation clock\.[\s\S]*?^  }\n  const hover =",re.M)
  w,n=legacy.subn('  const hover =',w,count=1)
  if n!=1 and 'rootSet.directions' in w: raise ValueError('could not retire previous Kael-only casting overlay')
 else:
  w=one(w,"const flip = Math.cos(p.state === 'attack' ? p.atkAng : p.aim) < 0;", "const flip = softFacingLeft(p);",'player facing')
 if 'rootSet.directions' not in w and 'let fr = floats && !set.art ? still : moving ? set.run[fi]' in w:
  w=one(w,"let fr = floats && !set.art ? still : moving ? set.run[fi] : blink && still.blink ? still.blink : still;","let fr = floats && !set.art ? still : moving ? (set.walk?.length && hyp(p.vx,p.vy) < 65 ? set.walk[fi % set.walk.length] : set.run[fi]) : blink && still.blink ? still.blink : still;",'walk/run choice')
 w=one(w,"G.ghosts.push({ x: p.x, y: p.y, flip: Math.cos(p.aim) < 0,", "G.ghosts.push({ x: p.x, y: p.y, flip: softFacingLeft(p),",'ghost facing')
 needle="  // a pose is one frame or a sequence played over k = 0..1\n  const at = (v, k) => (Array.isArray(v) ? v[Math.max(0, Math.min(v.length - 1, Math.floor(k * v.length)))] : v);"
 insert=needle+"\n  // Q, E and R now use independent visual sequences (gameplay effects stay unchanged).\n  if (p.visualCast) {\n    const elapsed = G.time - p.visualCast.at;\n    if (elapsed >= 0 && elapsed < p.visualCast.duration) {\n      const sequence = a[p.visualCast.action];\n      if (sequence) return at(sequence, elapsed / p.visualCast.duration);\n    } else if (elapsed >= p.visualCast.duration) p.visualCast = null;\n  }"
 w=one(w,needle,insert,'cast visual hook')
 # Add casting state on successful ultimate, Q, E only. Avoid the controls code side effects.
 if "kit.r.use(p); p.castAim = null; buzz('ult');" in w:
  w=one(w,"kit.r.use(p); p.castAim = null; buzz('ult');", "kit.r.use(p); p.visualCast = { action: 'ultimate', at: G.time, duration: 0.85 }; p.castAim = null; buzz('ult');",'R cast')
 else:
  w=one(w,"kit.r.use(p); if(G.char==='BLADE')p.kaelCue={action:'ultimate',start:G.time,duration:1.05}; p.castAim = null; buzz('ult');", "kit.r.use(p); p.visualCast = { action: 'ultimate', at: G.time, duration: 0.85 }; p.castAim = null; buzz('ult');",'R previous cast')
 w=one(w,"if (okQ) { p.energy -= kit.q.cost;", "if (okQ) { p.visualCast = { action: 'skill1', at: G.time, duration: 0.38 }; p.energy -= kit.q.cost;",'Q cast')
 w=one(w,"if (okE) { p.energy -= kit.e.cost;", "if (okE) { p.visualCast = { action: 'skill2', at: G.time, duration: 0.42 }; p.energy -= kit.e.cost;",'E cast')
except ValueError as exc: sys.exit('ERROR: '+str(exc))
# File reads and patch matching finished: only now back up and write the changes.
backup=project/('.ashblade-soft-facing-backup-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S'))
backup.mkdir(exist_ok=True)
for fn in files:
 shutil.copy2(project/'src'/fn,backup/fn)
try:
 (project/'src'/'sprites.js').write_text(s)
 (project/'src'/'world.js').write_text(w)
 shutil.copy2(package/'src'/'soft-facing.js',project/'src'/'soft-facing.js')
 # Exportable atlases and metadata are additional references; runtime uses exact source JS pixels via the new adapter.
 target=project/'assets'/'soft-facing';target.mkdir(parents=True,exist_ok=True)
 for asset in (package/'assets').glob('*.png'): shutil.copy2(asset,target/asset.name)
 shutil.copy2(package/'atlas-metadata.json',target/'atlas-metadata.json')
 print('INSTALLED: 2-facing soft-angle visuals for 8 heroes + evolved palettes.')
 print('BACKUP:',backup)
 print('Review:',project/'assets'/'soft-facing'/'atlas-metadata.json')
 print('Hard refresh your browser (Ctrl+Shift+R) after restarting your local server.')
except Exception as exc:
 for fn in files: shutil.copy2(backup/fn,project/'src'/fn)
 sys.exit('Install failed and original JS files restored: '+str(exc))
