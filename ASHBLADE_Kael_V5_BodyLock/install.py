#!/usr/bin/env python3
"""Kael V5 targeted patch for current ASHBLADE v4. No Pillow/pip needed."""
from pathlib import Path
from datetime import datetime
import re, shutil, sys, json, subprocess, struct, zlib, hashlib

ROOT=Path.cwd()
PATCH=Path(__file__).resolve().parent
MARKER='ASHBLADE_KAEL_V5_BODYLOCK'
FILES=['src/sprites.js','src/world.js','index.html']
BASE='art/sprites/soft-facing'
ATLAS=[BASE+'/blade-base-right.png',BASE+'/blade-evolved-right.png']
NEW_LOADER='src/soft-angle-atlases.js'

def abort(msg):raise RuntimeError(msg)

def png_header(path):
    payload=path.read_bytes()
    if payload[:8]!=b'\x89PNG\r\n\x1a\n':abort('Not a valid PNG: '+str(path))
    if len(payload)<33:abort('PNG file too short: '+str(path))
    w,h=struct.unpack('>II',payload[16:24]);return w,h

def once_sub(src,pattern,repl,what):
    updated,n=re.subn(pattern,lambda m:repl,src,count=1,flags=re.M)
    if n!=1:abort(f'Cannot safely patch {what}: expected 1 occurrence, found {n}')
    return updated

def change_sprites(src):
    src=once_sub(src,r"^import \{ installSoftAngleSprites \} from './soft-angle-atlases\.js\?v=[^']+';[^\n]*$",
       "import { installSoftAngleSprites } from './soft-angle-atlases.js?v=5'; // "+MARKER,
       'sprites loader import')
    if src.count('  installSoftAngleSprites(SPR);')!=1:abort('Expected one canonical sprite loader call; refusing change')
    if 'installFrontFacingSprites(SPR)' in src or 'installKaelVisuals(SPR)' in src:
        abort('Older conflicting loaders still active; v4 patch is required before V5')
    return src

def change_world(src):
    src=once_sub(src,r"^import \{ softFacingLeft \} from './soft-angle-atlases\.js\?v=[^']+';$",
        "import { softFacingLeft } from './soft-angle-atlases.js?v=5';",'world facing import')
    old="  const fi = Math.floor(p.runT * (walking ? 9 : moveFrames.length > 4 ? 13 : ninja ? 15 : 11)) % moveFrames.length;"
    if old not in src:abort('Player frame clock differs from v4; refusing unsafe edit')
    new='''  let fi = Math.floor(p.runT * (walking ? 9 : moveFrames.length > 4 ? 13 : ninja ? 15 : 11)) % moveFrames.length;
  // Kael V5: a single continuous eight-phase stride across walk/run transitions.
  // Keeps feet progression consistent during acceleration/deceleration; all other heroes unchanged.
  if (G.char === 'BLADE' && set.softFacing) {
    if (moving) {
      const delta = Math.max(0, Math.min(0.05, G.time - (p.kaelStrideAt ?? G.time)));
      p.kaelStride = ((p.kaelStride ?? 0) + delta * (walking ? 9 : 13)) % 8;
      fi = Math.floor(p.kaelStride) % moveFrames.length;
    } else p.kaelStride = 0;
    p.kaelStrideAt = G.time;
  }'''
    src=src.replace(old,new,1)
    old='  const lean = p.state === \'attack\' && p.atkT < 0.12 ? 2 : p.state === \'dash\' ? 1 : 0, la = p.state === \'attack\' ? p.atkAng : p.aim;'
    new='  const lean = (G.char === \'BLADE\' && set.softFacing) ? 0 : p.state === \'attack\' && p.atkT < 0.12 ? 2 : p.state === \'dash\' ? 1 : 0, la = p.state === \'attack\' ? p.atkAng : p.aim;'
    if old not in src:abort('Player lean code differs from v4; refusing unsafe edit')
    src=src.replace(old,new,1)
    return src

def change_index(src):
    return once_sub(src,r'src="src/main\.js\?v=[^\"]+"','src="src/main.js?v=185-kaelv5"','HTML entry cache')

def jscheck(content,name):
    proc=subprocess.run(['node','--check','--input-type=module'],input=content,text=True,capture_output=True)
    if proc.returncode:abort('Generated JS invalid ('+name+'): '+proc.stderr)

def main():
    for name in FILES:
        if not (ROOT/name).is_file():abort('Missing '+name+'; run from Ashblade repo root')
    # If already current, safe to skip. Does not over-write user changes to other hero data.
    if MARKER in (ROOT/'src/sprites.js').read_text():
        if all((ROOT/f).is_file() and hashlib.sha256((ROOT/f).read_bytes()).digest()==hashlib.sha256((PATCH/f).read_bytes()).digest() for f in ATLAS):
            print('[OK] Kael V5 already installed and assets match');return
        abort('V5 marker present but atlas differs; backup/current files need review before replacing')
    if 'ASHBLADE_V4_MANUAL_POLISH' not in (ROOT/'src/sprites.js').read_text():
        abort('Requires existing v4 Manual Polish loader. Refusing to modify unfamiliar runtime.')
    for f in ATLAS:
        if png_header(PATCH/f)!=(1200,1248):abort('Incorrect V5 PNG dimensions: '+f)
    updated={
        'src/sprites.js':change_sprites((ROOT/'src/sprites.js').read_text()),
        'src/world.js':change_world((ROOT/'src/world.js').read_text()),
        'index.html':change_index((ROOT/'index.html').read_text()),
    }
    jscheck(updated['src/sprites.js'],'src/sprites.js')
    jscheck(updated['src/world.js'],'src/world.js')
    jscheck((PATCH/NEW_LOADER).read_text(),NEW_LOADER)
    to_copy={NEW_LOADER:PATCH/NEW_LOADER}
    to_copy.update({f:PATCH/f for f in ATLAS})
    targets=list(updated)+list(to_copy)
    backup=ROOT/'.ashblade-backups'/('kael-v5-'+datetime.now().strftime('%Y%m%d-%H%M%S-%f'))
    backup.mkdir(parents=True,exist_ok=False)
    manifest=[]
    for rel in targets:
        fp=ROOT/rel;existing=fp.is_file();manifest.append({'path':rel,'existed':existing})
        if existing:
            original=backup/rel;original.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(fp,original)
    (backup/'install-manifest.json').write_text(json.dumps(manifest,indent=2))
    try:
        for rel,data in updated.items():
            (ROOT/rel).write_text(data)
        for rel,src in to_copy.items():
            dst=ROOT/rel;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dst)
    except Exception:
        for item in manifest:
            rel=item['path'];dst=ROOT/rel
            if item['existed']:shutil.copy2(backup/rel,dst)
            elif dst.exists():dst.unlink()
        raise
    print('[OK] Kael V5 BodyLock installed; only Kael sprite images + shared cache version + Kael movement code changed')
    print('[BACKUP]',backup)
    print('[NEXT] Restart HTTP server, Ctrl+Shift+R; browser console: [ASHBLADE] 2-Facing Soft-Angle V5')

if __name__=='__main__':
    try:main()
    except (RuntimeError,FileNotFoundError) as ex:sys.exit('[ERROR] '+str(ex))
