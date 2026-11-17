#!/usr/bin/env python3
"""Validate the 16 exported RGBA atlases and frame boundary safety."""
from PIL import Image
from pathlib import Path
import json,sys
root=Path(__file__).resolve().parents[1]
meta=json.loads((root/'atlas-metadata.json').read_text())
w,h=meta['frame']['w'],meta['frame']['h']; failures=[]; frames=0
for hero in meta['heroes']:
 for skin in ('base','evolved'):
  path=root/'assets'/f'{hero.lower()}-{skin}-right.png'
  if not path.exists():failures.append(str(path)+' missing');continue
  im=Image.open(path)
  if im.mode!='RGBA':failures.append(f'{path.name} is {im.mode}, expected RGBA')
  ncols=max(a['count'] for a in meta['heroes'][hero]['animations'].values())
  if im.size!=(w*ncols,h*len(meta['rows'])):failures.append(f'{path.name} size {im.size}')
  else:
   for row,action in enumerate(meta['rows']):
    for col in range(meta['heroes'][hero]['animations'][action]['count']):
     box=im.crop((col*w,row*h,(col+1)*w,(row+1)*h)).getchannel('A').getbbox()
     frames+=1
     if box is None:failures.append(f'{path.name} {action}#{col}: empty')
     elif box[0]<2 or box[1]<2 or box[2]>w-2 or box[3]>h-2:failures.append(f'{path.name} {action}#{col}: touches bounds {box}')
print('Processed',frames,'frame cells across',len(meta['heroes'])*2,'atlases')
if failures:
 print('\n'.join(failures[:30]));sys.exit(1)
print('OK — all sprites contain RGBA artwork within safe 120x96 bounds')
