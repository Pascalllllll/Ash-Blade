#!/usr/bin/env python3
"""Safe Kael entrance V2 migration to the current ASHBLADE VS Code project.
Touches only src/chars.js and the entry script cache token, plus additive files.
Preserves all 8 hero atlases, other entrance cinematics and the gameplay logic.
"""
from pathlib import Path
from datetime import datetime
import hashlib, json, re, shutil, subprocess, sys

ROOT=Path.cwd()
PATCH=Path(__file__).resolve().parent
MARKER='ASHBLADE_KAEL_ENTRANCE_V2_24F'
TILES=['src/kael-entrance-v2.js','art/sprites/entrance/kael-v2-24.png']

def stop(message):
    sys.exit('[ERROR] '+message)

def node_check(text, label):
    if not shutil.which('node'): return
    result=subprocess.run(['node','--input-type=module','--check'],input=text,text=True,capture_output=True)
    if result.returncode: stop(f'JavaScript syntax error in {label}: {result.stderr}')

def replace_exact(text, old, new, label):
    n=text.count(old)
    if n != 1: stop(f'{label}: expected 1 match; found {n}. No files changed.')
    return text.replace(old,new,1)

def main():
    for name in ('src/chars.js','src/main.js','src/gfx.js','index.html'):
        if not (ROOT/name).is_file(): stop('Run from the existing ASHBLADE project root; missing '+name)
    s=(ROOT/'src/chars.js').read_text()
    if MARKER in s:
        if all((ROOT/name).is_file() for name in TILES):
            print('[OK] Kael entrance V2 is already installed; no changes made.')
            return
        stop('Install marker present but sprite files missing; restore backup before retrying.')
    if 'function entrance(kind)' not in s or "entrance: () => entrance('drop')" not in s:
        stop('Unknown game entrance runtime; refusing to modify code.')
    pat=r"^import \{ ctx, canvas, W, H, P, rect, px, line, disc, ring, drawSprite, glow, text, textO, SS \} from './gfx\.js\?v=[^']+';"
    if not re.search(pat,s,re.M):
        stop('Unexpected src/chars.js imports. Please provide current source to update patch safely.')
    add=(
        "\nimport { kaelEntranceV2Frame, kaelEntranceV2Ready, KAEL_ENTRANCE_V2_DURATION }"
        " from './kael-entrance-v2.js?v=207'; // "+MARKER
    )
    s,n=re.subn(pat,lambda m: m.group(0)+add,s,count=1,flags=re.M)
    if n != 1: stop('Cannot insert Kael V2 module import')
    s=replace_exact(s,
        "const p = G.p, k = { t: 0, life: kind === 'robot' ? 1.6 : 1.4, done: false, hit: false };",
        "const p = G.p, kaelV2 = kind === 'drop' && G.char === 'BLADE';\n"
        "  const k = { t: 0, life: kaelV2 ? KAEL_ENTRANCE_V2_DURATION : kind === 'robot' ? 1.6 : 1.4, done: false, hit: false };",
        'entrance timing')
    s=replace_exact(s,
        '  const spr = () => {\n    const original=(G.evo===true?SPR.evo:SPR.chars)[G.char];',
        '  const spr = () => {\n'
        '    // Dedicated 24-frame Kael entrance; never affects the 13-row combat atlas.\n'
        '    if (kaelV2) { const frame = kaelEntranceV2Frame(k.t); if (frame) return frame; }\n'
        '    const original=(G.evo===true?SPR.evo:SPR.chars)[G.char];',
        'entrance source selection')
    s=replace_exact(s,
        '      if (t < fall && Math.random() < 0.8) part(p.x + rnd(-3, 3), p.y - 160 * (1 - t / fall) - 8, rnd(-20, 20), -rnd(20, 60), 0.4, kind === \'meteor\' ? P.ember : G.kit.color(), { glow: true, keep: true });',
        '      if (!kaelV2 && t < fall && Math.random() < 0.8) part(p.x + rnd(-3, 3), p.y - 160 * (1 - t / fall) - 8, rnd(-20, 20), -rnd(20, 60), 0.4, kind === \'meteor\' ? P.ember : G.kit.color(), { glow: true, keep: true });',
        'old falling particles')
    s=replace_exact(s,
        "      if (t >= fall && !k.hit) {\n        land(kind === 'meteor');",
        "      if (t >= (kaelV2 ? 0.56 : fall) && !k.hit) {\n        land(kind === 'meteor');",
        'landing event')
    s=replace_exact(s,
        "        if (kind === 'drop') G.slashes.push({ follow: false, x: p.x, y: p.y, a: 0, r: 34, arc: 6.2, dir: 1, t: 0, life: 0.3, th: 10, col: 'ember' });",
        "        if (kind === 'drop' && !kaelV2) G.slashes.push({ follow: false, x: p.x, y: p.y, a: 0, r: 34, arc: 6.2, dir: 1, t: 0, life: 0.3, th: 10, col: 'ember' });",
        'prevent double slash effects')
    s=replace_exact(s,
        "    if (kind === 'drop' || kind === 'meteor') {\n      const fall = kind === 'meteor' ? 0.75 : 0.5, z = t < fall ? 160 * Math.pow(1 - t / fall, 1.5) : 0;",
        "    if (kaelV2 && kaelEntranceV2Ready()) {\n"
        "      // The first 6 frames already contain smoke/ember streaks and the later frames contain landing.\n"
        "      // Do not move the entire sprite vertically or re-draw its sword.\n"
        "      drawSprite(s, x, y, false, null);\n"
        "    } else if (kind === 'drop' || kind === 'meteor') {\n"
        "      const fall = kind === 'meteor' ? 0.75 : 0.5, z = t < fall ? 160 * Math.pow(1 - t / fall, 1.5) : 0;",
        'cinematic render route')
    node_check(s,'src/chars.js')
    # update index entry cache-buster without overwriting the rest of index.html
    src_index=(ROOT/'index.html').read_text()
    new_index,n=re.subn(r'src="src/main\.js\?v=[^"]+"', 'src="src/main.js?v=207-kael-entrance-v2"',src_index,count=1)
    if n==0:
        new_index=src_index
        print('[WARN] index.html script cache-buster not found; hard refresh after installing.')
    changes={'src/chars.js':s,'index.html':new_index}
    copies={name:PATCH/name for name in TILES}
    if any(not p.is_file() for p in copies.values()):stop('Patch asset is missing; no files changed.')
    targets=list(changes)+list(copies)
    backup=ROOT/'.ashblade-backups'/('kael-entrance-v2-'+datetime.now().strftime('%Y%m%d-%H%M%S-%f'))
    backup.mkdir(parents=True,exist_ok=False)
    manifest=[]
    for name in targets:
        f=ROOT/name
        manifest.append({'path':name,'existed':f.is_file()})
        if f.is_file():
            dst=backup/name;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(f,dst)
    (backup/'install-manifest.json').write_text(json.dumps(manifest,indent=2))
    try:
        for name,value in changes.items():
            (ROOT/name).write_text(value)
        for name,src in copies.items():
            dst=ROOT/name;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dst)
    except Exception as e:
        for item in manifest:
            dst=ROOT/item['path']
            if item['existed']:shutil.copy2(backup/item['path'],dst)
            elif dst.exists():dst.unlink()
        stop('Install failed; restored files from backup: '+str(e))
    print('[OK] Kael Entrance V2 integrated: 24 frames, 70ms/frame, 1.68s cinematic')
    print('[OK] Existing 8-hero sprite loader/combat scripts left intact')
    print('[BACKUP]',backup)
    print('[NEXT] Restart game server and Ctrl+Shift+R. Start a NEW RUN as Kael.')
    print('[CHECK] Console: [ASHBLADE] Kael Entrance V2 loaded: 24 frames')

if __name__=='__main__':main()
