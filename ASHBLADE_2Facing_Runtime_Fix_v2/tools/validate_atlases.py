#!/usr/bin/env python3
"""Checks real RGBA atlas bytes, cell sizes/counts, opacity edges and pixel content."""
from pathlib import Path
from PIL import Image
import json,sys
root=Path(__file__).resolve().parents[1]
files=sorted((root/'art/sprites/soft-facing').glob('*-right.png'))
assert len(files)==16, f'Expected 16 base/evolved atlases, found {len(files)}'
actions=['entrance','idle','walk','run','attack1','attack2','attack3','skill1','skill2','ultimate','dash','hit','death']
counts=[8,8,8,8,8,8,8,8,8,10,6,4,8]
slot_count=0
for path in files:
 im=Image.open(path).convert('RGBA')
 assert im.size==(1200,1248),(path.name, im.size)
 for row, count in enumerate(counts):
  for col in range(count):
   patch=im.crop((120*col,96*row,120*(col+1),96*(row+1)))
   alpha=patch.getchannel('A')
   bbox=alpha.getbbox()
   assert bbox is not None, (path.name,actions[row],col,'empty')
   if bbox[0] == 0 or bbox[1] == 0 or bbox[2]>=120 or bbox[3]>=96:
    raise AssertionError((path.name,actions[row],col,'pixels touching tile edge',bbox))
   slot_count+=1
 print('[OK]',path.name,'RGBA / 1200x1248')
print('[PASS] Valid nonempty frames',slot_count,'across',len(files),'atlases; no edge touching')
