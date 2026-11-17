#!/usr/bin/env bash
# Run from ASHBLADE repository root: bash ASHBLADE_Kael_Hair_Fix_v2/install.sh
set -euo pipefail
if [[ ! -f src/sprites.js || ! -f src/kael-art.js ]]; then
  echo 'ERROR: Run this script from the ASHBLADE project root, where src/sprites.js exists.' >&2
  exit 1
fi
THIS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP="src/kael-art.js.before-hair-fix.$(date +%Y%m%d-%H%M%S).bak"
cp src/kael-art.js "$BACKUP"
cp "$THIS_DIR/src/kael-art.js" src/kael-art.js
# Change only Kael's cache-busting import query so the browser uses the new asset.
python3 - <<'PY'
from pathlib import Path
import re
p=Path('src/sprites.js')
s=p.read_text(encoding='utf-8')
new,n=re.subn(r"(?<=['\"])\./kael-art\.js\?v=(\d+)(?=['\"])", lambda m:'./kael-art.js?v='+str(int(m.group(1))+1),s,count=1)
if n==0:
    new,n=re.subn(r"(?<=['\"])\./kael-art\.js(?=['\"])", './kael-art.js?v=166', s,count=1)
if n:
    p.write_text(new,encoding='utf-8')
    print('Updated Kael import cache version in src/sprites.js')
else:
    print('Kael import not found; hard refresh your browser if the old sprites remain cached')
PY
printf 'Installed hair fix. Original Kael data backed up at %s\n' "$BACKUP"
echo 'Restart your dev server and hard-refresh (Ctrl+Shift+R).'
