#!/usr/bin/env python3
from pathlib import Path
import re
from collections import defaultdict
root=Path.cwd()
if not (root/'src/main.js').exists():raise SystemExit('Run in ASHBLADE repo root')
refs=defaultdict(lambda:defaultdict(list))
for f in (root/'src').glob('*.js'):
    text=f.read_text(encoding='utf-8')
    for mod,v in re.findall(r"\bfrom\s*['\"]\./([\w-]+\.js)(?:\?v=([^'\"]+))?['\"]",text):
        refs[mod][v or '(none)'].append(f.name)
for mod in ('sprites.js','world.js'):
    versions=refs.get(mod,{})
    print(f'{mod}:')
    for v,users in versions.items(): print('  ?v='+v+': '+', '.join(sorted(users)))
    print('  '+('PASS: all imports share one URL' if len(versions)==1 else 'FAIL: duplicate module URLs'))
