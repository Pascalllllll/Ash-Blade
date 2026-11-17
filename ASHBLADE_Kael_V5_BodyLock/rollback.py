#!/usr/bin/env python3
"""Restore newest Kael V5 backup. Run from repo root."""
from pathlib import Path
import sys, shutil, json
ROOT=Path.cwd()
try:
    backup=Path(sys.argv[1]) if len(sys.argv)>1 else sorted((ROOT/'.ashblade-backups').glob('kael-v5-*'))[-1]
    for entry in json.loads((backup/'install-manifest.json').read_text()):
        dest=ROOT/entry['path']
        if entry['existed']:
            dest.parent.mkdir(parents=True,exist_ok=True)
            shutil.copy2(backup/entry['path'],dest)
        elif dest.exists():dest.unlink()
    print('[OK] Restored Kael V5 backup:',backup)
except (IndexError,FileNotFoundError,ValueError,KeyError) as e:
    print('[ERROR] Backup unavailable/invalid:',e);sys.exit(1)
