#!/usr/bin/env python3
"""Non-destructive V7 motion-art migration for an existing ASHBLADE repository.

Works with existing V4/V5/V6 installations of installSoftAngleSprites.
Installs only art assets + one shared animation loader + optional entrance module.
Preserves game mechanics and local descriptions/settings/skin files.
"""
from __future__ import annotations
from pathlib import Path
from datetime import datetime
import re, json, shutil, sys, subprocess

ROOT=Path.cwd(); PACK=Path(__file__).resolve().parent
REQUIRED=['src/sprites.js','src/world.js','src/soft-angle-atlases.js','src/main.js','index.html']
for rel in REQUIRED:
    if not (ROOT/rel).is_file():
        sys.exit('[ERROR] Run from the existing ASHBLADE project root. Missing '+rel)

old={rel:(ROOT/rel).read_text() for rel in REQUIRED}
if 'installSoftAngleSprites' not in old['src/sprites.js']:
    sys.exit('[ERROR] Existing project does not use the shared V4/V5/V6 two-facing loader. No files changed.')
if 'softFacingLeft' not in old['src/world.js']:
    sys.exit('[ERROR] Existing world.js does not use the shared soft facing code. No files changed.')

marker='ASHBLADE_MOTION_V7'
if marker in old['src/sprites.js']:
    print('[OK] V7 animation migration already applied; no files changed.')
    sys.exit(0)

# Fail fast instead of silently replacing unexpected/incorrect source patterns.
def regex_once(content,pattern,replacement,label):
    output,count=re.subn(pattern,replacement,content, count=1)
    if count!=1:raise ValueError(f'{label}: expected 1 match, found {count}')
    return output

try:
    modified={}
    modified['src/sprites.js']=regex_once(
        old['src/sprites.js'],
        r"import \{ installSoftAngleSprites \} from './soft-angle-atlases\.js\?v=[^']+';[^\n]*",
        "import { installSoftAngleSprites } from './soft-angle-atlases.js?v=7motion'; // " + marker,
        'sprite loader import')
    modified['src/world.js']=regex_once(
        old['src/world.js'],
        r"import \{ softFacingLeft \} from './soft-angle-atlases\.js\?v=[^']+';",
        "import { softFacingLeft } from './soft-angle-atlases.js?v=7motion';",
        'world facing import')
    modified['src/main.js']=regex_once(old['src/main.js'],
        r"from './sprites\.js\?v=[^']+';",
        "from './sprites.js?v=7motion';",'main sprites import')
    modified['src/main.js']=regex_once(modified['src/main.js'],
        r"from './world\.js\?v=[^']+';",
        "from './world.js?v=7motion';",'main world import')
    modified['index.html']=regex_once(old['index.html'],r'src="src/main\.js\?v=[^"]+"',
        'src="src/main.js?v=7motion"','browser cache bust')
    if (ROOT/'src/kael-entrance-v2.js').is_file():
        cfile=ROOT/'src/chars.js'
        if cfile.is_file():
            chars=cfile.read_text()
            if "kael-entrance-v2.js?v=" in chars:
                modified['src/chars.js']=regex_once(chars,
                    r"from './kael-entrance-v2\.js\?v=[^']+';",
                    "from './kael-entrance-v2.js?v=7motion';",'entrance module import')
except ValueError as e:
    sys.exit('[ERROR] '+str(e)+'. No files changed. Upload latest runtime for a tailored patch.')

copyfiles={'src/soft-angle-atlases.js':PACK/'src/soft-angle-atlases.js'}
for p in (PACK/'art/sprites/motion-v7').iterdir():
    if p.is_file():copyfiles['art/sprites/motion-v7/'+p.name]=p
for p in (PACK/'art/sprites/soft-facing').iterdir():
    if p.is_file():copyfiles['art/sprites/soft-facing/'+p.name]=p
for p in (PACK/'previews').glob('*'):
    if p.is_file():copyfiles['motion-v7-preview/'+p.name]=p
copyfiles['motion-v7-preview.html']=PACK/'preview.html'
if (ROOT/'src/kael-entrance-v2.js').is_file():
    copyfiles['src/kael-entrance-v2.js']=PACK/'src/kael-entrance-v2.js'

# Validate generated JS syntax before mutation.
for rel,body in modified.items():
    if rel.endswith('.js'):
        p=subprocess.run(['node','--check','--input-type=module'],input=body,text=True,capture_output=True)
        if p.returncode:sys.exit('[ERROR] Generated JS syntax error for '+rel+'\n'+p.stderr)
for src in [PACK/'src/soft-angle-atlases.js',PACK/'src/kael-entrance-v2.js']:
    p=subprocess.run(['node','--check',str(src)],capture_output=True,text=True)
    if p.returncode:sys.exit('[ERROR] Patch JS syntax error for '+str(src)+'\n'+p.stderr)

backup=ROOT/'.ashblade-backups'/('motion-v7-'+datetime.now().strftime('%Y%m%d-%H%M%S-%f'))
backup.mkdir(parents=True,exist_ok=False)
allfiles=dict.fromkeys(list(modified)+list(copyfiles))
manifest=[]
try:
    for rel in allfiles:
        t=ROOT/rel; exists=t.is_file()
        manifest.append({'path':rel,'existed':exists})
        if exists:
            b=backup/rel;b.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(t,b)
    (backup/'install-manifest.json').write_text(json.dumps(manifest,indent=2))
    for rel,contents in modified.items():
        (ROOT/rel).write_text(contents)
    for rel,src in copyfiles.items():
        dst=ROOT/rel;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dst)
except Exception as e:
    for item in manifest:
        t=ROOT/item['path'];b=backup/item['path']
        if item['existed'] and b.is_file():shutil.copy2(b,t)
        elif t.is_file():t.unlink()
    sys.exit('[ERROR] Installation failed and was rolled back: '+str(e))

print('[OK] ASHBLADE_MOTION_V7 installed: all 8 heroes Base/Evolved')
print('[OK] 16 idle + 12 walk + 12 run + 12 frames for each attack 1/2/3')
print('[OK] Clean alpha and consistent height; Kael entrance sized to 54px when installed')
print('[OK] Q/E/R, dash, death and all gameplay code preserved')
print('[BACKUP]',backup)
print('[NEXT] Restart server and Ctrl+Shift+R; new run to see entrance')
print('[CHECK] Browser console: [ASHBLADE] Motion V7 ready')
