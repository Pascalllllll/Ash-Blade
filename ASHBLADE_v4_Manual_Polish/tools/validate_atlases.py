#!/usr/bin/env python3
"""Validate v4 image dimensions, frame alpha, transparency, and body-height stability."""
from pathlib import Path
from PIL import Image
import json, statistics, sys

ROOT=Path(__file__).resolve().parent.parent/'art/sprites/soft-facing'
META=json.loads((ROOT/'atlas-metadata.json').read_text())
COUNTS=META['actions'];W=120;H=96
HEROES=['blade','gunner','wizard','ninja','mechanic','tank','robot','dev']


def measure_body(f):
    # Character body is the central dense cluster near the feet; separated sparkles excluded.
    from collections import deque
    pix=f.getchannel('A').load();seen=set();best=(0,(0,0,0,0))
    for y in range(18,H):
      for x in range(22,W-20):
        if pix[x,y]<50 or (x,y) in seen:continue
        stack=[(x,y)];seen.add((x,y));coords=[]
        while stack:
          xx,yy=stack.pop();coords.append((xx,yy))
          for nx,ny in ((xx-1,yy),(xx+1,yy),(xx,yy-1),(xx,yy+1)):
            if 0<=nx<W and 0<=ny<H and (nx,ny) not in seen and pix[nx,ny]>=50:
              stack.append((nx,ny));seen.add((nx,ny))
        if len(coords)<30:continue
        xs=[u for u,v in coords];ys=[v for u,v in coords]
        box=(min(xs),min(ys),max(xs)+1,max(ys)+1)
        score=len(coords)-3*abs((box[0]+box[2])/2-60)-4*abs(box[3]-1-91)
        if score>best[0]:best=(score,box)
    b=best[1];return b[3]-b[1],b


def test():
    count=0;errors=[];stats={}
    for hero in HEROES:
      stats[hero]={}
      for skin in ('base','evolved'):
        p=ROOT/f'{hero}-{skin}-right.png'
        if not p.is_file():errors.append('Missing '+str(p));continue
        atlas=Image.open(p)
        if atlas.mode != 'RGBA' or atlas.size != (W*10,H*13):
          errors.append(f'{p.name}: wrong mode/size: {atlas.mode} {atlas.size}');continue
        stats[hero][skin]={}
        for row,(action,n) in enumerate(COUNTS.items()):
          heights=[]
          for col in range(n):
            f=atlas.crop((col*W,row*H,(col+1)*W,(row+1)*H));a=f.getchannel('A')
            if not a.getbbox():errors.append(f'{p.name}:{action}[{col}] blank');continue
            # Never cut a silhouette on any frame edge.
            strips=(a.crop((0,0,1,H)),a.crop((W-1,0,W,H)),a.crop((0,0,W,1)),a.crop((0,H-1,W,H)))
            if any(s.getbbox() for s in strips):errors.append(f'{p.name}:{action}[{col}] touches edge')
            height,box=measure_body(f)
            heights.append(height);count+=1
            if action not in ('death','dash'):
              target=60 if hero=='tank' else 54
              if abs(height-target)>3:
                errors.append(f'{p.name}:{action}[{col}]: body={height}px, target={target}px')
            if action in ('walk','run') and hero in ('ninja','tank'):
              alpha=a.load()
              if hero=='tank':regions=[(38,60),(61,83)]
              else: regions=[(45,60),(61,77)]
              for xa,xb in regions:
                v=sum(alpha[x,y]>0 for x in range(xa,xb) for y in range(84,93))
                if v<6:errors.append(f'{p.name}:{action}[{col}]: missing a foot ({xa}:{xb})')
          if heights:stats[hero][skin][action]={'min':min(heights),'max':max(heights),'average':round(statistics.mean(heights),1)}
    print(f'Checked {count} nonempty transparent frames in {len(HEROES)*2} atlases')
    print('Base action sizes (Idle / Attack 1 / Attack 2 / Walk / Run):')
    for hero in HEROES:
      st=stats.get(hero,{}).get('base',{})
      print(f" {hero:9} "+' / '.join(str(st.get(a,{}).get('average','?')) for a in ['idle','attack1','attack2','walk','run']))
    if errors:
      print('FAIL:',len(errors),'errors')
      for e in errors[:25]:print(' -',e)
      sys.exit(1)
    print('[PASS] v4 atlas QA checks completed')


if __name__=='__main__':test()
