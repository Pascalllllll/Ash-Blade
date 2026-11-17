#!/usr/bin/env python3
from pathlib import Path
import json,sys,shutil
root=Path.cwd(); arg=sys.argv[1] if len(sys.argv)>1 else ''
if not arg:
    backups=sorted((root/'.ashblade-backups').glob('kael-entrance-v2-*'))
    if not backups: sys.exit('[ERROR] No Kael Entrance V2 backup found')
    backup=backups[-1]
else:
    backup=Path(arg).resolve()
if not backup.is_dir() or not (backup/'install-manifest.json').is_file():sys.exit('[ERROR] Invalid backup path')
for item in json.loads((backup/'install-manifest.json').read_text()):
    dst=root/item['path']
    if item['existed']:
        dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(backup/item['path'],dst)
    elif dst.is_file():dst.unlink()
print('[OK] Rolled back Kael Entrance V2 from',backup)
