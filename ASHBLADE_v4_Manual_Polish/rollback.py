#!/usr/bin/env python3
"""Restore a v4 backup. Pass an explicit backup folder or the latest is used."""
from pathlib import Path
import json,shutil,sys
root=Path.cwd()
backups=root/'.ashblade-backups'
if len(sys.argv)>1:backup=Path(sys.argv[1]).expanduser().resolve()
else:
    lst=sorted(backups.glob('manual-v4-*'))
    if not lst:sys.exit('[ERROR] No v4 backup found in .ashblade-backups')
    backup=lst[-1]
manifest_file=backup/'install-manifest.json'
if not manifest_file.is_file():sys.exit('[ERROR] Invalid backup folder')
manifest=json.loads(manifest_file.read_text())
for entry in manifest:
    dst=root/entry['path']
    if entry['existed']:
        dst.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(backup/entry['path'],dst)
    elif dst.is_file():dst.unlink()
print('[OK] Backup restored:',backup)
print('[NEXT] Restart server and Ctrl+Shift+R')
