#!/usr/bin/env python3
"""Safe ASHBLADE v4 installer: supports original/current runtime, v2, or v3.

Only edits dedicated sprite loader imports and player-facing dispatch. Never modifies
combat, collision, skills or hero stats. Creates a timestamped backup and rollback manifest.
"""
from datetime import datetime
from pathlib import Path
import hashlib
import json
import re
import shutil
import subprocess
import sys

P = Path(__file__).resolve().parent
ROOT = Path.cwd()
MARKER = 'ASHBLADE_V4_MANUAL_POLISH'
FILES = ['src/sprites.js', 'src/world.js', 'index.html']
ATLAS_DIR = 'art/sprites/soft-facing'


def die(msg):
    sys.exit('[ERROR] ' + msg)


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def replace_exact_one(txt, pat, new, where):
    out, n = re.subn(pat, new, txt, count=1, flags=re.M)
    if n != 1:
        raise RuntimeError(f'{where}: expected one match, found {n}; source unchanged')
    return out


def patch_sprites(src):
    # v2 / v3, or the original Option A + Option C loader.
    pat = r"^import \{ install(?:SoftAngle|FrontFacing)Sprites \} from '[^']+';[^\n]*$"
    src = replace_exact_one(src, pat,
        "import { installSoftAngleSprites } from './soft-angle-atlases.js?v=4'; // "+MARKER,
        'src/sprites.js sprite loader')
    src = re.sub(r"^import \{ installKaelVisuals \} from '[^']+';\n", '', src, flags=re.M)
    if '  installFrontFacingSprites(SPR);' in src:
        src = src.replace('  installFrontFacingSprites(SPR);', '  installSoftAngleSprites(SPR);', 1)
    if src.count('  installSoftAngleSprites(SPR);') != 1:
        raise RuntimeError('src/sprites.js: missing or duplicated 2-facing install call')
    src = src.replace('  installKaelVisuals(SPR);', '  // Legacy Kael-only override disabled by '+MARKER)
    if 'installFrontFacingSprites(SPR)' in src or 'installKaelVisuals(SPR)' in src:
        raise RuntimeError('src/sprites.js: conflicting loader remains')
    return src


def patch_world(src):
    face_import = "import { softFacingLeft } from './soft-angle-atlases.js?v=4';"
    if 'import { softFacingLeft }' in src:
        src = replace_exact_one(src,
            r"^import \{ softFacingLeft \} from '[^']+';$", face_import,
            'src/world.js soft-facing import')
    else:
        find = "import { KILLS, startDeath, updateDeath, drawDeath } from './deaths.js?v=165';"
        if find not in src:
            raise RuntimeError('src/world.js: cannot locate deaths import for facing integration')
        src = src.replace(find, find+'\n'+face_import, 1)
        start = src.index('function drawPlayer()')
        a = src.index('  const rootSet = heroSet();', start)
        b = src.index('  // Rin runs with pink afterimages', a)
        replacement = (
            "  // Two visual facings; movement and aim remain independent and 360°.\n"
            "  const set = heroSet();\n"
            "  const moving = (p.state === 'move' || p.state === 'skill' || p.state === 'charge') && hyp(p.vx,p.vy) > 20;\n"
            "  const flip = softFacingLeft(p);\n"
        )
        src=src[:a]+replacement+src[b:]
        # Remove legacy Kael-specific animation clock; the shared Q/E/R sequences supersede it.
        anchor='  // Engine actions Q/E/R each get an independent Kael animation clock.'
        if anchor in src:
            a=src.index(anchor,src.index('function drawPlayer()'))
            b=src.index('  const hover =',a)
            src=src[:a]+src[b:]
    src=src.replace('G.ghosts.push({ x: p.x, y: p.y, flip: Math.cos(p.aim) < 0,',
                    'G.ghosts.push({ x: p.x, y: p.y, flip: softFacingLeft(p),')
    a=src.index('function drawPlayer()')
    b=src.index('function drawEnemy(',a)
    if 'rootSet.directions' in src[a:b]:
        raise RuntimeError('src/world.js: legacy directional player rendering still active')
    return src


def patch_index(src):
    return replace_exact_one(src,
      r'src="src/main\.js\?v=[^"]+"',
      'src="src/main.js?v=184-sprite-v4"',
      'index.html cache version')


def check_node(module_text, filename):
    try:
        x=subprocess.run(['node','--check','--input-type=module'],input=module_text,text=True,capture_output=True)
    except FileNotFoundError:
        die('Node.js is required to syntax-check the patch; installation stopped')
    if x.returncode:
        die(f'Generated {filename} did not pass syntax check: {x.stderr.strip()}')


def main():
    for rel in FILES:
        if not (ROOT/rel).is_file():
            die('Run from ASHBLADE project root. Missing '+rel)
    if not (P/'src/soft-angle-atlases.js').is_file():
        die('Patch folder is incomplete: src/soft-angle-atlases.js missing')
    try:
        sprite_src=(ROOT/'src/sprites.js').read_text()
        if MARKER in sprite_src:
            # Verify the actual PNG assets before skipping an already-installed patch.
            dest=ROOT/ATLAS_DIR
            equal=(dest/'blade-base-right.png').is_file() and \
                  sha(dest/'blade-base-right.png')==sha(P/ATLAS_DIR/'blade-base-right.png')
            if equal:
                print('[OK] v4 is already installed, sprite assets match; no changes made')
                return
            print('[INFO] v4 code already present but atlas differs; repairing assets safely')
            updated={r:(ROOT/r).read_text() for r in FILES}
        else:
            updated={
                'src/sprites.js':patch_sprites(sprite_src),
                'src/world.js':patch_world((ROOT/'src/world.js').read_text()),
                'index.html':patch_index((ROOT/'index.html').read_text()),
            }
        for rel in ['src/sprites.js','src/world.js']:
            check_node(updated[rel],rel)
        check_node((P/'src/soft-angle-atlases.js').read_text(),'src/soft-angle-atlases.js')
    except (RuntimeError,ValueError,IndexError) as e:
        die(str(e))

    copies={'src/soft-angle-atlases.js':P/'src/soft-angle-atlases.js'}
    copies.update({ATLAS_DIR+'/'+f.name:f for f in (P/ATLAS_DIR).iterdir() if f.is_file()})
    paths=list(dict.fromkeys(list(updated)+list(copies)))
    backup=ROOT/'.ashblade-backups'/('manual-v4-'+datetime.now().strftime('%Y%m%d-%H%M%S-%f'))
    backup.mkdir(parents=True,exist_ok=False)
    manifest=[]
    for rel in paths:
        file=ROOT/rel;exists=file.is_file()
        manifest.append({'path':rel,'existed':exists})
        if exists:
            backup_file=backup/rel
            backup_file.parent.mkdir(parents=True,exist_ok=True)
            shutil.copy2(file,backup_file)
    (backup/'install-manifest.json').write_text(json.dumps(manifest,indent=2))
    try:
        for rel,value in updated.items():
            (ROOT/rel).write_text(value)
        for rel,src in copies.items():
            dst=ROOT/rel;dst.parent.mkdir(parents=True,exist_ok=True)
            shutil.copy2(src,dst)
    except Exception as e:
        for item in manifest:
            file=ROOT/item['path']
            if item['existed']:shutil.copy2(backup/item['path'],file)
            elif file.is_file():file.unlink()
        die('Installation aborted and all backed-up files restored: '+str(e))
    print('[OK] ASHBLADE v4 Manual Polish installed — all 8 heroes, base/evolved')
    print('[OK] Shared 2-facing loader, constant source frame scale and foot pivots')
    print('[OK] Rin/Grom eight-step gait; Unit-7 and The Dev mechanical movement')
    print('[BACKUP]',backup)
    print('[NEXT] Restart server, Ctrl+Shift+R, check console for: [ASHBLADE] 2-Facing Soft-Angle V4')


if __name__=='__main__':main()
