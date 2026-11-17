#!/usr/bin/env python3
"""Restore exactly the files changed by this patch using a backup from install.py."""
from pathlib import Path
import json,shutil,sys
if len(sys.argv)!=2:sys.exit('Usage: python3 path/to/tools/rollback.py .ashblade-backups/soft-2facing-v2-TIMESTAMP')
root=Path.cwd()
backup=(root/Path(sys.argv[1])).resolve()
if (root/'.ashblade-backups').resolve() not in backup.parents:sys.exit('[ERROR] Backup must be under this project .ashblade-backups directory')
manifest=backup/'install-manifest.json'
if not manifest.is_file():sys.exit('[ERROR] No valid installation backup at '+str(backup))
files=json.loads(manifest.read_text())
for item in files:
 rel=item['path'];dest=root/rel
 if item['existed']:
  source=backup/rel
  if not source.is_file():sys.exit('[ERROR] Missing saved original '+rel)
  dest.parent.mkdir(parents=True,exist_ok=True)
  shutil.copy2(source,dest)
 elif dest.is_file():dest.unlink()
print('[OK] Restored',len(files),'original/added file states from',backup)
print('[NEXT] Restart dev server and hard-refresh browser')
