#!/usr/bin/env python3
"""Static QA for the exact Kael atlas dimensions, alpha and bounds."""
import json,sys
from pathlib import Path
from PIL import Image
R=Path(__file__).resolve().parents[1]
m=json.loads((R/'assets/kael-manifest.json').read_text())
assert m['cell']=={'width':128,'height':96}
assert m['left']=='mirror-right'
assert sum(x['frames'] for x in m['animations'].values())==100
for direction in m['directions']:
    p=R/'assets'/f'kael-{direction}.png'
    im=Image.open(p).convert('RGBA')
    assert im.size==(1280,1248),(direction,im.size)
    for action,row in m['rows'].items():
        count=m['animations'][action]['frames']
        for i in range(10):
            f=im.crop((i*128,row*96,(i+1)*128,(row+1)*96))
            a=f.getchannel('A')
            if i<count:
                if not a.getbbox() and not ((action=='entrance' and i==0) or (action=='death' and i==7)):
                    raise AssertionError(f'{direction} {action} frame {i} unexpectedly empty')
                if max(a.crop((0,0,1,96)).getextrema())>180 or max(a.crop((127,0,128,96)).getextrema())>180 or max(a.crop((0,0,128,1)).getextrema())>180:
                    raise AssertionError(f'{direction} {action} frame {i} touches crop edge')
            elif a.getbbox():
                raise AssertionError(f'{direction} {action} unused frame {i} not transparent')
print('PASS: 3 atlases; 300 cells; 128x96; true alpha; empty unused slots; no top/side crop.')
