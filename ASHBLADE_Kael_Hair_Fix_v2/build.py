#!/usr/bin/env python3
"""Surgical pixel-level repair of Kael's flattened hair crown and fake dark bars.
Uses the owner's supplied game-data asset; preserves 74x64 dimensions, foot anchor and sword repair.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import json,re,math,collections

HERE=Path(__file__).resolve().parent
SOURCE=Path('/mnt/data/ASHBLADE_Kael_Sword_Crop_Fix/src/kael-art.js')
src=SOURCE.read_text(encoding='utf8')
d=json.loads(src.split('export const KAEL = ',1)[1].rstrip().rstrip(';'))
W,H=d['w'],d['h']; sym=d['sym']; palette=d['palette']
assert W==74 and H==64
pindex={p:i for i,p in enumerate(palette)}
# All colors are existing sheet-palette colors: no blurred/vector pixels.
OUT = sym[pindex['#0e0513']]
DARK= sym[pindex['#571c5a']]
MID = sym[pindex['#78205d']]
VIOLET=sym[pindex['#842b83']]
LIT = sym[pindex['#96328f']]
GLOW= sym[pindex['#9d3492']]

def dec(s):
 c=''.join(ch*int(n or 1) for ch,n in re.findall(r'([^0-9])(\d*)',s))
 assert len(c)==W*H, len(c)
 return list(c)
def enc(c):
 arr=[]
 for ch,gr in __import__('itertools').groupby(c):
  num=sum(1 for _ in gr)
  arr.append(ch+(str(num) if num>1 else ''))
 return ''.join(arr)
def cimg(c):
 rgb=[tuple(bytes.fromhex(v[1:])) for v in palette]
 lookup={s:rgb[i]+(255,) for i,s in enumerate(sym)}
 im=Image.new('RGBA',(W,H))
 im.putdata([lookup.get(ch,(0,0,0,0)) if ch!='.' else (0,0,0,0) for ch in c]);return im

# Pixel jagged outline of anime hair, designed to replace the unnatural straight cut.
CROWNS={
 'idle': [
   (18,14),(19,12),(16,10),(22,11),(22,7),(27,10),(30,5),(34,8),
   (37,8),(40,4),(44,9),(47,7),(50,9),(53,8),(56,14)],
 'run': [
   (26,13),(27,10),(23,9),(29,10),(30,6),(34,8),(35,6),
   (39,10),(42,5),(46,8),(48,7),(54,12),(57,15)],
 'attack1': [
   (21,17),(22,12),(20,10),(27,12),(28,7),(33,10),
   (36,6),(40,10),(43,8),(47,11),(51,10),(55,17)],
 'attack3': [
   (21,17),(22,12),(20,10),(27,12),(28,7),(33,10),
   (36,6),(40,10),(43,8),(47,11),(51,10),(55,17)],
 'skill1': [(21,17),(22,12),(20,10),(27,12),(28,7),(33,10),(36,6),(40,10),(43,8),(47,11),(51,10),(55,17)],
 'dash': [(21,17),(22,12),(20,10),(27,12),(28,7),(33,10),(36,6),(40,10),(43,8),(47,11),(51,10),(55,17)],
}

def contour(pts, x):
 for (x0,y0),(x1,y1) in zip(pts,pts[1:]):
  if x0<=x<=x1:
   return int(round(y0+(x-x0)*(y1-y0)/(x1-x0)))
 return 999

def repair(c,name,i):
 # First remove only the bogus horizontal artifacts created during photo->sprite conversion.
 # These are dark one- to three-pixel bands *above* the hair, not the real hair outline.
 if name in ('attack1','attack3'):
  for y in range(0,15):
   for x in range(49,W):
    if c[y*W+x] != '.':
     v=palette[sym.index(c[y*W+x])]
     R,G,B=(int(v[j:j+2],16) for j in (1,3,5))
     if max(R,G,B)<85: c[y*W+x]='.'
  # Additional horizontal dark bar over center of the scalp.
  for y in range(0,15):
   for x in range(31,49):
    v=palette[sym.index(c[y*W+x])] if c[y*W+x]!='.' else None
    if v in ('#0e0513','#000000','#020104','#010001','#080105'):
     c[y*W+x]='.'
 if name in ('dash','skill1') and i in (0,4,5):
  # Remove the stray 3px-wide horizontal stripe across the top of the head.
  for y in range(13,16):
   for x in range(5,69): c[y*W+x]='.'
 # Crown reconstruction only for states whose crown was unnaturally flat/cut.
 if name not in CROWNS or (name in ('dash','skill1') and i != 0):
  return c
 pts=CROWNS[name]
 baseline={'idle':13,'run':12,'attack1':16,'attack3':16,'skill1':16,'dash':16}[name]
 # Most run/attack frames have variable hair position: adapt to the per-frame crown's true silhouette.
 # Uniform +1-2 pixel motion isn't enough to move Kael's face, so the body/feet remain fixed.
 dx=0
 if name=='run': dx=min(2,max(-1,(i-2)//4))
 if name in ('attack1','attack3'): dx=0
 pp=[(x+dx,y) for x,y in pts]
 xstart=pp[0][0]; xend=pp[-1][0]
 # Pixel-cluster roof. Every new pixel has an opaque existing palette color; 1px outer dark contour.
 for x in range(max(0,xstart), min(W,xend+1)):
  top=contour(pp,x)
  if top>=baseline+1:continue
  # keep the artist's already drawn upper fringe where present
  for y in range(top,baseline+1):
   old=c[y*W+x];
   if old != '.' and y>top+1: continue
   # Only repair above the original hair line; not eyes, face, scarves or sword.
   if y>=baseline and name!='idle': continue
   if (y==top or x==xstart or x==xend):
    color=OUT
   elif y==top+1:
    color=DARK if (x+y+i)%3 else MID
   elif y==top+2:
    color=MID if x<32 else VIOLET
   else:
    color=VIOLET if (x+y+i)%5 else LIT
    if x in range(28,42) and (x*3+y+i)%7==0: color=GLOW
   c[y*W+x]=color
 # Old top border of the original hair was a hard, perfectly horizontal black stripe.
 # Blend it into the new cap instead of leaving a second black line through the hairstyle.
 if name=='idle':
  for x in range(20,56):
   if c[baseline*W+x] in (OUT, sym[pindex['#000000']]):
    underneath=c[(baseline+1)*W+x]
    c[baseline*W+x]=underneath if underneath!='.' else MID
 # Add 1px highlight clusters inside the new strands, still using the game's existing palette.
 for a,b in ([(26,28),(35,37)] if name=='idle' else [(31,32)]):
  for x in range(a+dx,b+dx+1):
   if not 0<=x<W:continue
   y=contour(pp,x)+3
   if 0<=y<baseline and c[y*W+x]!='.': c[y*W+x]=LIT
 return c

changed=[]
for name,seq in d['frames'].items():
 for i,code in enumerate(seq):
  original=dec(code)
  result=repair(original.copy(),name,i)
  if result!=original:
   d['frames'][name][i]=enc(result)
   assert dec(d['frames'][name][i])==result
   changed.append((name,i,sum(a!=b for a,b in zip(original,result))))

header='''// ASHBLADE Kael hair + sword crop repair v2.
// Full purple hair spikes rebuilt at the PIXEL-DATA level; accidental top horizontal artifacts removed.
// Existing sword correction, face, legs, body, attacks, lightning skill, foot anchor, and 74x64 frame size preserved.
// No runtime image detection or renderer changes required.
'''
(HERE/'src/kael-art.js').write_text(header+'export const KAEL = '+json.dumps(d,ensure_ascii=False,indent=2)+';\n',encoding='utf8')
# Generate visual comparison using actual encoded frame data.
orig=json.loads(src.split('export const KAEL = ',1)[1].rstrip().rstrip(';'))
rows=['idle','walk','run','attack1','attack2','attack3','skill1','skill2','dash','hit']
contact=Image.new('RGBA',(W*8+100,H*len(rows)*2+80),'#181121')
draw=ImageDraw.Draw(contact)
for ri,name in enumerate(rows):
 draw.text((4,12+ri*H*2),name,fill='#eac9ff')
 for i,code in enumerate(d['frames'][name]):
  if i>=8:break
  y0=18+ri*H*2
  x0=95+i*W
  before=cimg(dec(orig['frames'][name][i])); after=cimg(dec(code))
  contact.alpha_composite(before,(x0,y0));contact.alpha_composite(after,(x0,y0+H))
contact.save(HERE/'preview/kael-hair-before-after.png')
# actual transparent atlas in data layout, no headers/UI
atlas=Image.new('RGBA',(W*8,H*len(rows)))
for ri,name in enumerate(rows):
 for i,code in enumerate(d['frames'][name][:8]):
  atlas.alpha_composite(cimg(dec(code)),(W*i,H*ri))
atlas.save(HERE/'preview/kael-fixed-transparent-atlas.png')
# idle close-up: readable crisp pixels
im=cimg(dec(d['frames']['idle'][0])); im.resize((W*8,H*8),Image.Resampling.NEAREST).save(HERE/'preview/kael-hair-fixed-idle-8x.png')
print('EDITED',len(changed),'FRAMES', dict(collections.Counter(n for n,i,c in changed)))
print('SAMPLES', changed[:12]);print('Saved output to',HERE)
