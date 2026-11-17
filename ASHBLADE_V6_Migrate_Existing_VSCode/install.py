#!/usr/bin/env python3
"""Safe integration of V6 art into an existing ASHBLADE project (V4/V5)."""
from pathlib import Path
from datetime import datetime
import hashlib, json, re, shutil, struct, subprocess, sys

ROOT=Path.cwd()
PATCH=Path(__file__).resolve().parent
MARKER='ASHBLADE_SOULKNIGHT_V6_MIGRATED'
PNGDIR=Path('art/sprites/soft-facing')
NAMES=['blade','gunner','wizard','ninja','mechanic','tank','robot','dev']
FILES=['src/sprites.js','src/world.js','index.html']

def stop(msg):
    raise RuntimeError(msg)

def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()

def replace_exact_regex(content,pat,replacement,label):
    result,n=re.subn(pat,lambda _:replacement,content,count=1,flags=re.M)
    if n!=1: stop(f'Cannot safely patch {label}: found {n} matches. No changes made.')
    return result

def check_js(rel,code):
    if shutil.which('node'):
        proc=subprocess.run(['node','--check','--input-type=module'],input=code,text=True,capture_output=True)
        if proc.returncode: stop(f'Invalid JS in {rel}: '+proc.stderr)

def main():
    for rel in FILES+['src/main.js']:
        if not (ROOT/rel).is_file(): stop('Missing '+rel+' — open terminal from your EXISTING ASHBLADE VS Code project root.')
    source={rel:(ROOT/rel).read_text() for rel in FILES}
    if source['src/sprites.js'].count('installSoftAngleSprites(SPR);')!=1:
        stop('Expected one shared 2-facing loader, but project uses a different runtime. Do not overwrite; send current src files.')
    if 'installFrontFacingSprites(SPR)' in source['src/sprites.js'] or 'installKaelVisuals(SPR)' in source['src/sprites.js']:
        stop('Old async sprite loaders are still active. Existing V4/V5 runtime is required for this non-destructive migration.')
    pngs=[]
    for name in NAMES:
        for skin in ['base','evolved']:
            rel=PNGDIR/f'{name}-{skin}-right.png'
            fp=PATCH/rel
            if not fp.is_file(): stop(f'Missing asset: {rel}')
            raw=fp.read_bytes()
            if raw[:8]!=b'\x89PNG\r\n\x1a\n' or struct.unpack('>II',raw[16:24])!=(1200,1248):
                stop(f'Invalid atlas dimensions or signature: {rel}')
            pngs.append(rel)
    loader=(PATCH/'src/soft-angle-atlases.js').read_text()
    # Match the existing game gfx module identity rather than loading a second URL variant.
    g=re.search(r"from './gfx\.js\?v=([^']+)'", source['src/sprites.js'])
    if g:
        loader=re.sub(r"from './gfx\.js\?v=[^']+'",f"from './gfx.js?v={g.group(1)}'",loader,count=1)
    patched={}
    patched['src/sprites.js']=replace_exact_regex(
        source['src/sprites.js'],
        r"^import \{ installSoftAngleSprites \} from './soft-angle-atlases\.js\?v=[^']+';[^\n]*$",
        f"import {{ installSoftAngleSprites }} from './soft-angle-atlases.js?v=6-migration'; // {MARKER}",
        'src/sprites.js sprite loader import')
    patched['src/world.js']=replace_exact_regex(
        source['src/world.js'],
        r"^import \{ softFacingLeft \} from './soft-angle-atlases\.js\?v=[^']+';",
        "import { softFacingLeft } from './soft-angle-atlases.js?v=6-migration';",
        'src/world.js facing import')
    patched['index.html']=replace_exact_regex(
        source['index.html'],
        r'src="src/main\.js\?v=[^"]+"',
        'src="src/main.js?v=206-soulknight-v6-migrated"',
        'index.html entry script')
    for rel,code in patched.items():
        if rel.endswith('.js'):check_js(rel,code)
    check_js('src/soft-angle-atlases.js',loader)
    extra={str(rel):PATCH/rel for rel in pngs}
    extra['src/soft-angle-atlases.js']=None  # write in-memory tailored module
    for rel in ['sprite-preview-v6.html','tools/validate_soulknight.py','tools/build_soulknight_atlases.py']:
        extra[rel]=PATCH/rel
    for p in (PATCH/'art/sprites/soulknight-masters').glob('*'):
        if p.is_file():extra['art/sprites/soulknight-masters/'+p.name]=p
    extra['art/sprites/soft-facing/atlas-metadata.json']=PATCH/'art/sprites/soft-facing/atlas-metadata.json'
    to_write={**patched,'src/soft-angle-atlases.js':loader}
    targets=list(dict.fromkeys(list(to_write)+[r for r in extra if r not in to_write]))
    # avoid re-patching an already-installed version; validate files too
    if MARKER in source['src/sprites.js']:
        if all((ROOT/rel).is_file() and digest(ROOT/rel)==digest(PATCH/rel) for rel in (str(p) for p in pngs)):
            print('[OK] V6 sprite migration already installed; art matches. No changes made.')
            return
        stop('V6 migration marker exists but art changed locally. Refusing to overwrite edited assets.')
    backup=ROOT/'.ashblade-backups'/('soulknight-v6-migration-'+datetime.now().strftime('%Y%m%d-%H%M%S-%f'))
    backup.mkdir(parents=True,exist_ok=False)
    entries=[]
    for rel in targets:
        dst=ROOT/rel;existing=dst.is_file()
        entries.append({'path':rel,'existed':existing})
        if existing:
            saved=backup/rel;saved.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(dst,saved)
    (backup/'install-manifest.json').write_text(json.dumps(entries,indent=2))
    try:
        for rel,code in to_write.items():
            dst=ROOT/rel;dst.parent.mkdir(parents=True,exist_ok=True);dst.write_text(code)
        for rel,src in extra.items():
            if rel in to_write or src is None:continue
            dst=ROOT/rel;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dst)
    except Exception:
        for entry in entries:
            rel=entry['path'];dst=ROOT/rel
            if entry['existed']:shutil.copy2(backup/rel,dst)
            elif dst.is_file():dst.unlink()
        raise
    print('[OK] ASHBLADE Soul Knight V6 art migrated into EXISTING project')
    print('[OK] 8 heroes, base+evolved, preserving existing gameplay and local src edits')
    print('[BACKUP]',backup)
    print('[NEXT] python3 tools/validate_soulknight.py')
    print('[NEXT] Restart server from this repo root; browser Ctrl+Shift+R')
    print('[CHECK] Console: [ASHBLADE] 2-Facing SoulKnight Redesign V6')

if __name__=='__main__':
    try:main()
    except (RuntimeError,OSError,ValueError) as e:sys.exit('[ERROR] '+str(e))
