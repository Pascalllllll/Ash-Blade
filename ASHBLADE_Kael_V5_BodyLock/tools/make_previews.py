#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'previews';OUT.mkdir(exist_ok=True)
W,H=120,96
COUNTS={'entrance':8,'idle':8,'walk':8,'run':8,'attack1':8,'attack2':8,'attack3':8,'skill1':8,'skill2':8,'ultimate':10,'dash':6,'hit':4,'death':8}
ACTIONS=list(COUNTS)
base=Image.open(ROOT/'art/sprites/soft-facing/blade-base-right.png').convert('RGBA')
evo=Image.open(ROOT/'art/sprites/soft-facing/blade-evolved-right.png').convert('RGBA')
v4=Image.open(ROOT/'source/blade-base-right-v4.png').convert('RGBA')

def tile(im,action,i):
 r=ACTIONS.index(action)
 return im.crop((i*W,r*H,(i+1)*W,(r+1)*H))

def checker(w,h,k=12):
 bg=Image.new('RGBA',(w,h),(26,22,39,255));d=ImageDraw.Draw(bg)
 for y in range(0,h,k):
  for x in range(0,w,k):
   if ((x//k+y//k)&1)==0:d.rectangle((x,y,x+k-1,y+k-1),fill=(37,32,49,255))
 return bg

def paste_center(canvas,im,cx,cy,scale):
 b=im.resize((W*scale,H*scale),Image.Resampling.NEAREST)
 canvas.alpha_composite(b,(cx-W*scale//2,cy-H*scale//2))

# 8 movement frames shown large enough to inspect independent footwear
out=checker(1500,650,16);d=ImageDraw.Draw(out)
for ri,act in enumerate(('walk','run')):
 d.text((25,15+ri*316),f'KAEL V5 - {act.upper()} (8 distinct frames)',fill=(238,221,247,255))
 for i in range(8):
  x0=26+i*184;y0=51+ri*316
  cc=checker(175,250,12)
  cc.alpha_composite(tile(base,act,i).resize((240,192),Image.Resampling.NEAREST),(-30,18))
  out.alpha_composite(cc,(x0,y0))
  d.text((x0+78,y0+223),f'{i+1}/8',fill=(250,203,160,255))
out.convert('RGB').save(OUT/'kael-v5-walk-run-8frames.jpg',quality=94)

# 2 facings sprite master
out=checker(940,420,18);d=ImageDraw.Draw(out)
d.text((28,17),'KAEL V5 / TWO-FACING SOFT-ANGLE / APPROVED ORIGINAL DESIGN',fill=(240,225,248,255))
items=[('LEFT (MIRRORED)',ImageOps.mirror(tile(base,'idle',0))),('RIGHT (SOURCE)',tile(base,'idle',0)),('EVOLVED RIGHT',tile(evo,'idle',0))]
for n,(label,im) in enumerate(items):
 cx=153+n*310
 paste_center(out,im,cx,210,3)
 d.text((cx-84,365),label,fill=(240,214,179,255))
out.convert('RGB').save(OUT/'kael-v5-master-two-facing.jpg',quality=95)

# key action poses
acts=['idle','walk','run','attack1','attack2','attack3','skill1','skill2','ultimate','dash','hit','death']
out=checker(1500,1250,16);d=ImageDraw.Draw(out)
for r,act in enumerate(acts):
 y=16+r*103
 d.text((20,y+38),act.upper(),fill=(236,212,246,255))
 for c in range(8):
  frame=tile(base,act,min(c,COUNTS[act]-1)).resize((120,96),Image.Resampling.NEAREST)
  out.alpha_composite(frame,(190+c*160,y))
out.convert('RGB').save(OUT/'kael-v5-action-contact-sheet.jpg',quality=94)

# comparison on walk/run (character unchanged proportion, new two-leg cycle)
out=checker(1350,470,18);d=ImageDraw.Draw(out)
d.text((25,18),'BEFORE V4 (left) versus BODY-LOCK V5 (right)',fill=(239,222,250,255))
for j,act in enumerate(('walk','run')):
 d.text((25,55+j*200),act.upper(),fill=(242,183,120,255))
 for c in range(4):
  x=145+c*290
  for si,(tag,img) in enumerate([('OLD',v4),('NEW',base)]):
   f=tile(img,act,2*c)
   ff=f.resize((180,144),Image.Resampling.NEAREST)
   out.alpha_composite(ff,(x+si*112,55+j*200))
   d.text((x+si*112+55,202+j*200),tag,fill=(203,203,221,255))
out.convert('RGB').save(OUT/'kael-v4-v5-comparison.jpg',quality=95)

# animated preview walk right/left, run right/left; no interpolation blur
frames=[]
for action in ['walk','run','attack1','attack2','attack3','skill2']:
 for i in range(COUNTS[action]):
  cv=checker(780,330,13);d=ImageDraw.Draw(cv)
  d.text((22,15),f'ASHBLADE / KAEL V5 / {action.upper()} / {i+1:02}/{COUNTS[action]:02}',fill=(239,214,250,255))
  for side,cx in [('RIGHT',220),('LEFT',565)]:
   img=tile(base,action,i)
   if side=='LEFT':img=ImageOps.mirror(img)
   paste_center(cv,img,cx,175,3)
   d.text((cx-25,295),side,fill=(246,192,142,255))
  frames.append(cv.convert('RGB').quantize(colors=128))
frames[0].save(OUT/'kael-v5-animation-demo.gif',save_all=True,append_images=frames[1:],duration=105,loop=0,optimize=False,disposal=2)
print('Preview files created:',*(p.name for p in sorted(OUT.iterdir())),sep='\n- ')
