#!/usr/bin/env python3
from PIL import Image
from pathlib import Path
import json,sys
R=Path(__file__).resolve().parents[1]
m=json.loads((R/'art/sprites/kael-option-c-manifest.json').read_text())
w,h=m['frame']; actions=m['actions']; errors=[]
for skin,paths in m['assets'].items():
 for direction,path in paths.items():
  im=Image.open(R/path).convert('RGBA'); expected=(w*10,h*len(actions))
  if im.size!=expected:errors.append(f'{path}: wrong size {im.size}')
  for name,desc in actions.items():
   row=desc['row']
   for i in range(10):
    fr=im.crop((i*w,row*h,(i+1)*w,(row+1)*h));bbox=fr.getbbox()
    if i>=desc['frames']:
     if bbox is not None:errors.append(f'{path}/{name}/{i}: unused cell not transparent')
     continue
    if not bbox:errors.append(f'{path}/{name}/{i}: empty frame');continue
    x0,y0,x1,y1=bbox
    if x0<2 or y0<2 or x1>w-2:errors.append(f'{path}/{name}/{i}: clipped near side/top {bbox}')
    if name not in ('death','entrance') and y1!=h:errors.append(f'{path}/{name}/{i}: foot anchor differs {bbox}')
    if any(fr.getpixel(pt)[3] for pt in [(0,0),(w-1,0),(0,h-1),(w-1,h-1)]):errors.append(f'{path}/{name}/{i}: corner not transparent')
   # Key pose changes per sequence (vs repeated static frames)
   if name in ('walk','run','attack1','attack2','attack3','skill1','skill2','ultimate','dash'):
    pix=[im.crop((i*w,row*h,(i+1)*w,(row+1)*h)).tobytes() for i in range(desc['frames'])]
    if len(set(pix))<min(3,desc['frames']):errors.append(f'{path}/{name}: too few distinct poses')
if errors:
 print('Validation failed:',*errors,sep='\n - ');sys.exit(1)
print('VALID: 6 atlases, %d nonempty frames, transparent unused cells, identical pivot, no side/top clipping.' % (sum(v['frames'] for v in actions.values())*6))
