#!/usr/bin/env python3
"""Rollback a previously installed startscreen sync fix.
Usage: python3 ASHBLADE_V7_StartScreen_Fix/rollback.py .ashblade-backups/startscreen-esm-sync-...
"""
import json
import shutil
import sys
from pathlib import Path
if len(sys.argv)!=2:
    sys.exit('Usage: python3 ASHBLADE_V7_StartScreen_Fix/rollback.py PATH_TO_BACKUP')
backup=Path(sys.argv[1]).resolve()
root=Path.cwd()
manifest=backup/'manifest.json'
if not manifest.is_file(): sys.exit('[ERROR] manifest.json not found in backup')
for e in json.loads(manifest.read_text()):
    rel=e['path']
    if not (backup/rel).is_file():sys.exit('[ERROR] Missing backup file '+rel)
    shutil.copy2(backup/rel, root/rel)
    print('[RESTORED]',rel)
print('[OK] Rollback complete')
