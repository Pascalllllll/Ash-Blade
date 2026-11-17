#!/usr/bin/env python3
"""Safe installer for the *current uploaded* ASHBLADE runtime (17 Nov 2026).

No blind string rewriting: patches are prepared in memory, checked, then applied
with automatic backups and rollback. Incompatible/unknown source versions are rejected.
"""
from pathlib import Path
from datetime import datetime
import hashlib,json,re,shutil,subprocess,sys

PATCH=Path(__file__).resolve().parent
ROOT=Path.cwd()
TARGETS=['src/sprites.js','src/world.js','index.html']
EXPECTED=json.loads((PATCH/'tools/expected-sha256.json').read_text())
MARKER='ASHBLADE_SOFT_2FACING_V2'

def fail(msg): sys.exit('[ERROR] '+msg)
def replace_once(txt, old, new, label):
    n=txt.count(old)
    if n!=1: raise ValueError(f'{label}: expected exactly one block, got {n}')
    return txt.replace(old,new,1)
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()

for name in TARGETS:
    if not (ROOT/name).is_file(): fail('Run from ASHBLADE repo root; missing '+name)
if MARKER in (ROOT/'src/sprites.js').read_text():
    print('[OK] Two-facing runtime v2 is already installed; nothing changed.')
    sys.exit(0)
for name,digest in EXPECTED.items():
    if sha(ROOT/name)!=digest:
        fail('Your '+name+' differs from the runtime uploaded for this patch. No changes made. Send current source for a compatible patch.')

changes={name:(ROOT/name).read_text() for name in TARGETS}
try:
    s=changes['src/sprites.js']
    s=replace_once(s,"import { installFrontFacingSprites } from './animation-atlases.js?v=173-optionc';",
        "import { installSoftAngleSprites } from './soft-angle-atlases.js?v=2'; // "+MARKER,'sprite loader import')
    s=replace_once(s,"import { installKaelVisuals } from './kael-visual-runtime.js?v=300';\n",'', 'retire conflicting Kael loader')
    s=replace_once(s,'  installFrontFacingSprites(SPR);','  installSoftAngleSprites(SPR);','one authoritative atlas loader')
    s=replace_once(s,'  installKaelVisuals(SPR);','  // Kael-only async override disabled (all heroes share the same loader).','stop Kael-only override')
    changes['src/sprites.js']=s

    w=changes['src/world.js']
    w=replace_once(w,"import { KILLS, startDeath, updateDeath, drawDeath } from './deaths.js?v=165';",
        "import { KILLS, startDeath, updateDeath, drawDeath } from './deaths.js?v=165';\nimport { softFacingLeft } from './soft-angle-atlases.js?v=2';",'world direction import')
    start=w.index('function drawPlayer()')
    a=w.index('  const rootSet = heroSet();',start)
    b=w.index('  // Rin runs with pink afterimages',a)
    w=w[:a]+"""  // SOUL KNIGHT: visual left/right only, both mostly facing the player.
  // Aim, physics, projectiles and attacks remain fully 360 degrees.
  const set = heroSet();
  const moving = (p.state === 'move' || p.state === 'skill' || p.state === 'charge') && hyp(p.vx,p.vy) > 20;
  const flip = softFacingLeft(p);
"""+w[b:]
    a=w.index('  // Engine actions Q/E/R each get an independent Kael animation clock.',w.index('function drawPlayer()'))
    b=w.index('  const hover =',a)
    w=w[:a]+w[b:]
    w=replace_once(w, 'G.ghosts.push({ x: p.x, y: p.y, flip: Math.cos(p.aim) < 0,',
      'G.ghosts.push({ x: p.x, y: p.y, flip: softFacingLeft(p),', 'ghost direction')
    assert 'rootSet.directions' not in w[w.index('function drawPlayer()'):w.index('function drawEnemy(')]
    changes['src/world.js']=w

    i=changes['index.html']
    i=replace_once(i,'src="src/main.js?v=171"','src="src/main.js?v=182-soft2"','browser entry cache bust')
    changes['index.html']=i
except (ValueError, AssertionError) as exc:
    fail('Patch mapping failed: '+str(exc))

# Syntax-check before touching the user's working tree.
for rel,content in changes.items():
    if rel.endswith('.js'):
        cp=subprocess.run(['node','--check','--input-type=module'],input=content,text=True,capture_output=True)
        if cp.returncode: fail('Generated '+rel+' failed syntax check: '+cp.stderr)
files_to_copy={'src/soft-angle-atlases.js':PATCH/'src/soft-angle-atlases.js'}
files_to_copy.update({
    'art/sprites/soft-facing/'+p.name:p
    for p in (PATCH/'art/sprites/soft-facing').glob('*') if p.is_file()
})
backup=ROOT/'.ashblade-backups'/('soft-2facing-v2-'+datetime.now().strftime('%Y%m%d-%H%M%S-%f'))
backup.mkdir(parents=True,exist_ok=False)
previous=[]
try:
    for rel in list(changes)+list(files_to_copy):
        t=ROOT/rel
        if t.is_file():
            b=backup/rel;b.parent.mkdir(parents=True,exist_ok=True)
            shutil.copy2(t,b);previous.append((rel,True))
        else: previous.append((rel,False))
    (backup/'install-manifest.json').write_text(json.dumps([{'path':r,'existed':e} for r,e in previous],indent=2))
    for rel,data in changes.items(): (ROOT/rel).write_text(data)
    for rel,src in files_to_copy.items():
        dst=ROOT/rel;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dst)
except Exception as exc:
    for rel,existed in previous:
        target=ROOT/rel
        if existed: shutil.copy2(backup/rel,target)
        elif target.is_file(): target.unlink()
    fail('Install failed, original files restored: '+str(exc))
print('[OK] '+MARKER+' installed — 8 heroes / base+evolved / 2-facing soft-angle')
print('[OK] Old Option A and Kael-only Option C/V3 async loaders disabled')
print('[OK] 360-degree controls, attacks Q/E/R, entrance/death gameplay code preserved')
print('[BACKUP]',backup)
print('[NEXT] Restart server, Ctrl+Shift+R; check console: [ASHBLADE] 2-Facing Soft-Angle')
