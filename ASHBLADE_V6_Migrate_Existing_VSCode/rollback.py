#!/usr/bin/env python3
from pathlib import Path
import json, shutil, sys
ROOT=Path.cwd()
if len(sys.argv)!=2:sys.exit('Usage: python3 ASHBLADE_V6_Migrate_Existing_VSCode/rollback.py <BACKUP_PATH>')
backup=Path(sys.argv[1]).expanduser().resolve()
if (ROOT/'.ashblade-backups').resolve() not in backup.parents:sys.exit('Backup path must be within current repo .ashblade-backups')
man=backup/'install-manifest.json'
if not man.is_file():sys.exit('Backup manifest not found')
for e in json.loads(man.read_text()):
    dest=ROOT/e['path']
    if e['existed']:
        dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(backup/e['path'],dest)
    elif dest.is_file():dest.unlink()
print('[OK] Original files restored. Restart server and hard refresh.')
