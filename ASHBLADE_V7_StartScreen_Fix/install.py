#!/usr/bin/env python3
"""Safe fix for ASHBLADE V7 start-screen freeze caused by duplicate ESM instances.
Only adjusts src/main.js import URLs for sprites.js and world.js to match src/ui.js.
Does not replace project files, sprites, game logic, user edits, or installed art patches.
"""
from pathlib import Path
from datetime import datetime
import json
import re
import shutil
import subprocess
import sys

ROOT = Path.cwd()
NEEDED = ['src/main.js','src/ui.js','index.html']
for rel in NEEDED:
    if not (ROOT/rel).is_file():
        sys.exit('[ERROR] Jalankan dari root repo ASHBLADE. File tidak ditemukan: ' + rel)
ui = (ROOT/'src/ui.js').read_text(encoding='utf-8')
main = (ROOT/'src/main.js').read_text(encoding='utf-8')
index = (ROOT/'index.html').read_text(encoding='utf-8')

changes = {}
for mod in ['sprites.js','world.js']:
    regex = re.compile(r"\bfrom\s*(['\"])\./" + re.escape(mod) + r"(?:\?v=([^'\"]+))?\1")
    ui_m = list(regex.finditer(ui))
    main_m = list(regex.finditer(main))
    if len(ui_m)!=1 or len(main_m)!=1:
        sys.exit(f'[ERROR] Tidak aman mengubah {mod}: expected 1 import in UI and main; found UI={len(ui_m)}, main={len(main_m)}. No changes made.')
    wanted = ui_m[0].group(2)
    if wanted is None:
        sys.exit('[ERROR] UI import tanpa versi untuk ' + mod + '. Tidak mengubah file.')
    found = main_m[0].group(2)
    if found!=wanted:
        print(f'[FIX] {mod}: main ?v={found} -> ?v={wanted} (same module instance as UI)')
        main = main[:main_m[0].start()] + f"from './{mod}?v={wanted}'" + main[main_m[0].end():]

original_main=(ROOT/'src/main.js').read_text(encoding='utf-8')
if main != original_main:
    changes['src/main.js']=main
    # Force the browser to re-request corrected entry module after normal refresh.
    matches = list(re.finditer(r'(<script\s+type="module"\s+src=")src/main\.js(?:\?v=[^" ]+)?("\s*>)', index))
    if len(matches)!=1:
        sys.exit('[ERROR] index.html: tidak menemukan tepat satu <script type="module" src="src/main.js...">. No changes made.')
    m=matches[0]
    index=index[:m.start()]+m.group(1)+'src/main.js?v=7motion-menu-sync1'+m.group(2)+index[m.end():]
    changes['index.html']=index
else:
    print('[OK] No duplicate sprites.js/world.js entry imports found. This fix is already applied or the cause is different.')
    print('[NEXT] Open DevTools Console and send any red error message if game is still frozen.')
    sys.exit(0)

cp=subprocess.run(['node','--input-type=module','--check'],input=main,text=True,capture_output=True)
if cp.returncode!=0:
    sys.exit('[ERROR] JavaScript syntax check failed before applying: '+cp.stderr)

backup=ROOT/'.ashblade-backups'/('startscreen-esm-sync-'+datetime.now().strftime('%Y%m%d-%H%M%S-%f'))
backup.mkdir(parents=True,exist_ok=False)
manifest=[]
try:
    for rel in changes:
        old=ROOT/rel
        saved=backup/rel
        saved.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(old,saved)
        manifest.append({'path':rel,'existed':True})
    (backup/'manifest.json').write_text(json.dumps(manifest,indent=2))
    for rel,data in changes.items():
        (ROOT/rel).write_text(data,encoding='utf-8')
except Exception as exc:
    for rel in changes:
        if (backup/rel).is_file(): shutil.copy2(backup/rel,ROOT/rel)
    sys.exit('[ERROR] Install error; rollback attempted: '+str(exc))

print('[OK] ASHBLADE V7 Title/Play ESM Sync Fix installed')
print('[OK] Shared sprites.js and world.js instances across main and UI')
print('[BACKUP]',backup)
print('[NEXT] Restart server + Ctrl+Shift+R, then PLAY or CONTINUE')
