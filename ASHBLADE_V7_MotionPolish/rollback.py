#!/usr/bin/env python3
from pathlib import Path
import json,shutil,sys
root=Path.cwd()
if len(sys.argv)==2:
    backup=Path(sys.argv[1])
else:
    backups=sorted((root/'.ashblade-backups').glob('motion-v7-*'))
    if not backups:sys.exit('[ERROR] No V7 backup found')
    backup=backups[-1]
manifest=backup/'install-manifest.json'
if not manifest.is_file():sys.exit('[ERROR] Missing backup manifest')
for item in json.loads(manifest.read_text()):
    path=root/item['path'];previous=backup/item['path']
    if item['existed']:
        path.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(previous,path)
    elif path.is_file():path.unlink()
print('[OK] Rollback complete:',backup)
