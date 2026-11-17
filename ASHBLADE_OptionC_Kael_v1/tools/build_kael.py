#!/usr/bin/env python3
"""Deterministic original pixel-art Kael sprites, no OCR / image segmentation.
128x96 frames, 54-ish source pixel character height; 3 authored directional variants.
"""
from PIL import Image, ImageDraw, ImageFilter, ImageOps
from pathlib import Path
import math, json, random
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'art'/'sprites'; OUT.mkdir(parents=True,exist_ok=True)
PREV=ROOT/'preview'; PREV.mkdir(parents=True,exist_ok=True)
W,H=128,96
ACTIONS={'entrance':8,'idle':8,'walk':8,'run':8,'attack1':8,'attack2':8,'attack3':8,'skill1':8,'skill2':8,'ultimate':10,'dash':6,'hit':4,'death':8}
COL={
 'edge':'#140b20', 'deep':'#231229', 'armor':'#32243d','armor2':'#463254','armor3':'#5c4375',
 'hair':'#683476','hair2':'#844b9d','hair3':'#9f63be','hairD':'#3f234f','hairH':'#be86d5',
 'skin':'#f7c7a9','skinS':'#d99989','eye':'#563188','eyeh':'#a879e6',
 'scarf':'#ee5814','scarfD':'#a42e1b','scarfH':'#ff9727','cape':'#942333','capeH':'#c5333e',
 'steel':'#e5d9ea','steelHi':'#fff8f1','steelDark':'#9b8a9e','gold':'#edb852','goldHi':'#ffe3a2',
 'pants':'#2a2037','pantsHi':'#47314f','boot':'#251b30','bootH':'#59415d',
 'fire':'#ff7219','fireHi':'#ffcc4c','spark':'#fef2b8','lightning':'#ae65fa', 'arc':'#f7d1ff',
}
def palette(evo):
  p=dict(COL)
  if evo:
    p.update({'hair':'#533088','hair2':'#7349c6','hair3':'#986de3','hairH':'#d3a2ff','hairD':'#2a155b',
      'armor':'#2b1e37','armor2':'#513963','armor3':'#8561b9','gold':'#f5bc53','goldHi':'#fff0b3',
      'cape':'#651f41','capeH':'#b52c5b','scarf':'#e4571c','scarfH':'#ffc343','fire':'#bd55ff','fireHi':'#fcb0ff'})
  return p

def blob_paint(sprite, direction, action, frame, p, evo):
  l=Image.new('RGBA',(W,H)); d=ImageDraw.Draw(l)
  # Ground point at y=95. The torso bobs, but boots stay planted.
  move=action in ('walk','run'); run=action=='run'
  phase=math.sin(frame*math.pi/4)
  stride=(4 if run else 3)*phase if move else 0
  bounce= (2 if run else 1) if move and frame%2 else 0
  lean=(2 if run else 0) if move else 0
  if action=='dash' or action=='skill1': lean=2+int(frame in (1,2,3)); bounce=0
  yoff= -bounce
  xoff= 0
  if action=='hit': xoff= -2 if frame%2 else 2; yoff=0
  # Layout shifts across animation, maintaining visual bounds
  x=64 + xoff; headY=51+yoff
  # Scarf tail/cape behind the body, no off-canvas hair, boots, or accessories
  cape_x=x-14 if direction=='right' else x-15
  tail=(frame%4-2) if action in ('idle','walk','run') else 0
  d.polygon([(x-10,70+yoff),(cape_x-8,70+yoff),(cape_x-19,76+yoff+tail),(cape_x-12,80+yoff+tail),(cape_x-22,86+yoff+tail),(x-8,81+yoff)],fill=p['cape'])
  d.polygon([(x-13,72+yoff),(x-23,78+yoff),(x-31,78+yoff+tail),(x-23,81+yoff),(x-12,78+yoff)],fill=p['capeH'])
  # Boots at bottom row for moving poses (including heel lift via shape changes).
  for side in (-1,1):
    step=side*stride
    bx=int(x+side*8+step*0.78)
    fy=94- (1 if (side*stride>1) else 0)
    d.polygon([(bx-5,81+yoff),(bx+3,81+yoff),(bx+5,90),(bx-5,91)],fill=p['pants'])
    d.polygon([(bx-3,83+yoff),(bx+2,83+yoff),(bx+2,89),(bx-3,89)],fill=p['pantsHi'])
    d.polygon([(bx-6,88),(bx+3,88),(bx+6,91),(bx+6,94),(bx-7,94),(bx-7,92)],fill=p['boot'])
    d.line([(bx-6,93),(bx+5,93)],fill=p['bootH'],width=2)
    # Keep a bottom-row anchor independent of gait with the outline added below.
  # Dark layered tunic and orange trim
  d.polygon([(x-12,68+yoff),(x+12,68+yoff),(x+14,85+yoff),(x-13,85+yoff)],fill=p['armor'])
  d.polygon([(x-9,72+yoff),(x-2,71+yoff),(x+1,82+yoff),(x-7,84+yoff)],fill=p['armor2'])
  d.polygon([(x+3,70+yoff),(x+10,70+yoff),(x+11,83+yoff),(x+2,82+yoff)],fill=p['armor3'])
  d.line([(x-11,80+yoff),(x+12,80+yoff)],fill=p['scarfD'],width=3)
  d.polygon([(x-2,80+yoff),(x+7,79+yoff),(x+4,85+yoff),(x-3,86+yoff)],fill=p['scarf'])
  # Puff white sleeves visible under dark arm guards
  d.ellipse((x-16,69+yoff,x-9,77+yoff), fill=p['steel'])
  d.ellipse((x+9,69+yoff,x+16,77+yoff), fill=p['steel'])
  d.rectangle((x-16,73+yoff,x-10,79+yoff), fill=p['armor2'])
  d.rectangle((x+10,73+yoff,x+16,79+yoff), fill=p['armor2'])
  for bx in (x-14, x+13):
    d.rectangle((bx-2,76+yoff,bx+2,80+yoff),fill=p['skin'])
  # Large chibi head, back-facing variant does not show eyes
  d.polygon([(x-15,48+yoff),(x+13,47+yoff),(x+17,57+yoff),(x+12,70+yoff),(x-12,70+yoff),(x-18,59+yoff)],fill=(p['hairD'] if direction=='up' else p['skin']))
  if direction!='up':
    d.polygon([(x-15,55+yoff),(x-8,53+yoff),(x-7,66+yoff),(x-14,63+yoff)],fill=p['skinS'])
    if direction=='right':
      # 3/4 side angle: one dominant eye, tiny secondary eye
      d.rectangle((x+1,59+yoff,x+6,62+yoff),fill=p['eye'])
      d.rectangle((x+3,58+yoff,x+5,59+yoff),fill=p['eyeh'])
      d.rectangle((x-6,60+yoff,x-3,62+yoff),fill=p['eye'])
      d.rectangle((x+11,62+yoff,x+13,64+yoff),fill=p['skinS'])
    else:
      for xx in (x-8,x+4):
        d.rectangle((xx-1,59+yoff,xx+4,63+yoff), fill=p['eye'])
        d.rectangle((xx+1,59+yoff,xx+3,60+yoff),fill=p['eyeh'])
  # Hair silhouette: recognizable sharp dark violet spikes, consistent proportions in all dirs.
  h=p['hair']; hi=p['hair2']; shine=p['hair3']; dark=p['hairD']
  if direction=='right':
    outline=[(x-19,57+yoff),(x-22,49+yoff),(x-25,46+yoff),(x-19,45+yoff),
      (x-23,40+yoff),(x-11,42+yoff),(x-9,36+yoff),(x-2,40+yoff),
      (x+4,35+yoff),(x+11,41+yoff),(x+16,37+yoff),(x+19,46+yoff),
      (x+24,45+yoff),(x+20,52+yoff),(x+22,58+yoff),(x+12,58+yoff),
      (x+7,53+yoff),(x-3,56+yoff),(x-9,58+yoff)]
  elif direction=='up':
    outline=[(x-22,57+yoff),(x-25,48+yoff),(x-20,44+yoff),(x-20,40+yoff),
      (x-13,42+yoff),(x-9,36+yoff),(x-3,41+yoff),(x+3,35+yoff),
      (x+11,40+yoff),(x+18,38+yoff),(x+22,48+yoff),(x+18,51+yoff),
      (x+24,59+yoff),(x+15,64+yoff),(x+7,69+yoff),(x-16,68+yoff)]
  else:
    outline=[(x-20,58+yoff),(x-24,50+yoff),(x-21,46+yoff),(x-22,40+yoff),
      (x-13,43+yoff),(x-9,35+yoff),(x-4,40+yoff),(x+3,36+yoff),
      (x+10,41+yoff),(x+17,39+yoff),(x+22,47+yoff),(x+18,53+yoff),
      (x+21,58+yoff),(x+11,57+yoff),(x+7,53+yoff),(x+2,59+yoff),
      (x-2,55+yoff),(x-10,60+yoff)]
  d.polygon(outline, fill=h)
  d.polygon([(x-19,49+yoff),(x-10,42+yoff),(x-8,48+yoff),(x+1,40+yoff),(x+9,44+yoff),
             (x+15,47+yoff),(x+6,47+yoff),(x+1,54+yoff),(x-5,50+yoff),(x-12,58+yoff)], fill=hi)
  d.polygon([(x-11,41+yoff),(x-6,43+yoff),(x-9,51+yoff),(x-15,52+yoff)],fill=shine)
  d.polygon([(x+3,38+yoff),(x+8,42+yoff),(x+9,48+yoff),(x+4,46+yoff)],fill=shine)
  d.line([(x-12,45+yoff),(x-3,48+yoff),(x+4,45+yoff)],fill=p['hairH'],width=1)
  # Face opening through the messy fringe. Back view remains fully covered.
  if direction!='up':
    d.polygon([(x-12,55+yoff),(x-6,57+yoff),(x-5,64+yoff),(x+11,64+yoff),(x+13,57+yoff),
               (x+8,54+yoff),(x+1,60+yoff),(x-3,54+yoff)], fill=p['skin'])
    if direction=='right':
      d.polygon([(x-8,58+yoff),(x-6,55+yoff),(x-3,58+yoff)],fill=h)
      d.rectangle((x+4,59+yoff,x+9,63+yoff),fill=p['eye'])
      d.rectangle((x+6,59+yoff,x+8,60+yoff),fill=p['eyeh'])
      d.rectangle((x-3,59+yoff,x-1,61+yoff),fill=p['eye'])
    else:
      for xx in (-8,4):
        d.rectangle((x+xx-1,59+yoff,x+xx+4,63+yoff),fill=p['eye'])
        d.rectangle((x+xx+1,59+yoff,x+xx+3,60+yoff),fill=p['eyeh'])
    # orange scarf covers mouth, does not cover eyes
    d.polygon([(x-15,64+yoff),(x+14,64+yoff),(x+15,71+yoff),(x+10,74+yoff),(x-12,72+yoff)],fill=p['scarf'])
    d.polygon([(x-15,66+yoff),(x+5,67+yoff),(x+10,69+yoff),(x-10,70+yoff)],fill=p['scarfH'])
  else:
    # back view: flowing hair all the way down, orange scarf rim across shoulders
    d.polygon([(x-15,59+yoff),(x-8,61+yoff),(x-12,70+yoff),(x-20,62+yoff)],fill=dark)
    d.polygon([(x+12,59+yoff),(x+18,63+yoff),(x+14,71+yoff),(x+8,66+yoff)],fill=hi)
    d.line([(x-13,72+yoff),(x+13,72+yoff)],fill=p['scarf'],width=4)
  # Scarf tail animated and recognizable orange, trailing behind for right.
  tailx=-16 if direction=='right' else -17
  d.polygon([(x+tailx,68+yoff),(x+tailx-11,65+yoff+tail),(x+tailx-18,68+yoff+tail),
             (x+tailx-11,72+yoff+tail),(x+tailx-2,73+yoff)], fill=p['scarf'])
  d.line([(x+tailx-16,68+yoff+tail),(x+tailx-6,68+yoff+tail)],fill=p['scarfH'],width=2)
  if evo:
    # Slightly armored awakened upgrade, keep Kael recognizable
    d.line([(x-10,78+yoff),(x-6,80+yoff)],fill=p['gold'],width=2)
    d.line([(x+7,78+yoff),(x+11,80+yoff)],fill=p['gold'],width=2)
    d.point((x+11,44+yoff),fill=p['goldHi'])
  return l

def draw_sword(layer,direction,action,i,p):
  # Sword remains in Kael's hand at all times except Tempest (skill2).
  if action=='skill2': return
  d=ImageDraw.Draw(layer)
  if direction=='right': grip=(83,75);ang=-35
  elif direction=='down': grip=(80,78);ang=-51
  else:grip=(80,77);ang=-112
  length=27
  if action in ('walk','run'):ang += math.sin(i*math.pi/4)*8
  if action=='attack1':ang=[-150,-110,-55,-10,12,-15,-65,-35][i]
  if action=='attack2':ang=[-65,-38,20,-70,-30,35,-12,-24][i];grip=(80,68)
  if action=='attack3':ang=[-15,25,70,130,170,210,280,350][i];grip=(71,69);length=23
  if action=='ultimate':ang=[-85,-40,45,160,260,-80,25,145,-35,-45][i];grip=(80,69)
  if action in ('dash','skill1'):ang=-15; grip=(78,72)
  if action=='entrance':ang=-82 if i<4 else -30
  if action=='death':ang=25 if i>=3 else -35;grip=(80,83)
  # Perspective of up/down handled by separate base drawings, not simply rotating the right-facing bitmap.
  a=math.radians(ang);ux,uy=math.cos(a),math.sin(a);nx,ny=-uy,ux
  ox,oy=grip
  def pt(along,across=0):return (int(round(ox+ux*along+nx*across)),int(round(oy+uy*along+ny*across)))
  # Short leather pommel, gold handguard, blade with white hot highlight and defined silver tip.
  d.line([pt(-10),pt(1)],fill=p['deep'],width=5)
  d.line([pt(-10),pt(1)],fill=p['gold'],width=2)
  d.line([pt(0,-6),pt(0,6)],fill=p['deep'],width=5)
  d.line([pt(0,-5),pt(0,5)],fill=p['gold'],width=2)
  d.polygon([pt(2,-3),pt(length-6,-3),pt(length,0),pt(length-6,3),pt(2,3)], fill=p['steelDark'])
  d.polygon([pt(3,-2),pt(length-6,-2),pt(length,0),pt(length-7,0),pt(3,0)],fill=p['steelHi'])
  d.line([pt(3,1),pt(length-7,1)],fill=p['steel'],width=1)
  # Discrete trails, no soft blur, no large duplicate game-generated effects.
  arcAction=action in ('attack1','attack2','attack3','ultimate')
  if arcAction and 2<=i<min(7,10 if action=='ultimate' else 8):
    c=p['fire'] if action!='ultimate' else p['lightning']; c2=p['fireHi']
    ex,ey=pt(length+2,0)
    r=14 if action!='attack3' else 20
    for j in range(5):
      aa=a+math.radians((j-2)*13)
      X=int(ex+math.cos(aa)*j*1.6);Y=int(ey+math.sin(aa)*j*1.3)
      if 2<X<W-2 and 2<Y<H-2:d.rectangle((X,Y,X+2,Y+1),fill=c2 if j%2 else c)
  return

def render(direction,action,i,evo=False):
  p=palette(evo)
  art=blob_paint((W,H),direction,action,i,p,evo)
  # Base shape is assembled from separately rendered body and sword into a single 128x96 RGBA cell.
  sword=Image.new('RGBA',(W,H))
  draw_sword(sword,direction,action,i,p)
  if direction=='up':
    # Hilt and blade readable on right while face is concealed.
    combo=Image.alpha_composite(sword,art)
    # show hilt on top of glove
    combo=Image.alpha_composite(combo,sword)
  else:combo=Image.alpha_composite(art,sword)
  # Pixel-perfect outline from alpha (no checkerboard, no antialias).
  alpha=combo.getchannel('A');expanded=alpha.filter(ImageFilter.MaxFilter(5))
  outline=Image.new('RGBA',(W,H),p['edge']);outline.putalpha(expanded)
  result=Image.alpha_composite(outline,combo)
  d=ImageDraw.Draw(result)
  # state effects, all intentionally small and inside 128x96
  x,y=64,70
  if action=='skill2':
    m=[0,2,5,8,12,8,4,0][i]
    for side in (-1,1):
      hx=x+side*14;hy=77
      d.rectangle((hx-3,hy-3,hx,hy),fill=p['lightning'] if i else p['skin'])
      if m:
        pts=[(hx,hy),(hx+side*(3+m//3),hy-6),(hx+side*(2+m//2),hy-11),(hx+side*(4+m//2),hy-14)]
        d.line(pts,fill=p['lightning'],width=2)
        d.point((pts[-1][0],pts[-1][1]),fill=p['arc'])
  if action=='attack2' and i in (3,4,5):
    d.line([(73,56),(91,76)],fill=p['fire'],width=2)
    d.line([(91,56),(73,76)],fill=p['fireHi'],width=2)
  if action=='attack3' and 2<=i<=5:
    d.arc((41,47,89,91),start=-30+i*38,end=80+i*38,fill=p['fire'],width=2)
    d.arc((45,51,85,87),start=-30+i*38,end=60+i*38,fill=p['fireHi'],width=1)
  if action in ('dash','skill1') and 1<=i<=4:
    for j in range(3):
      yy=62+ j*8+(i%2)
      d.line([(25-j*3,yy),(40,yy)],fill=p['fire'] if j%2 else p['hair3'],width=2)
  if action=='entrance':
    # Kael enters in ash sparks, then plants his sword and settles.
    for k in range(max(0,5-i)):
      d.rectangle((42+(i*7+k*13)%48,47+(i*5+k*9)%38,44+(i*7+k*13)%48,49+(i*5+k*9)%38),fill=p['fireHi'])
    if i==4:d.line([(46,87),(83,87)],fill=p['fireHi'],width=2)
  if action=='ultimate':
    for j in range(min(12,max(0,i-1)*2)):
      a=(j*83+i*32)%360;xx=64+int(24*math.cos(math.radians(a)));yy=71+int(17*math.sin(math.radians(a)))
      if 2<xx<W-2 and 2<yy<H-2: d.rectangle((xx,yy,xx+1,yy+1),fill=p['fire'] if j%2 else p['fireHi'])
  if action=='hit' and i<3:
    d.line([(86,50),(89+i,46+i)],fill=p['spark'],width=2)
  if action=='death':
    # Collapse and burn to ash; deterministic pixel-disintegration rather than inaccurate shrinking from a photo.
    if i>=2:
      shrink=1.0-0.15*max(0,i-2)
      # vertical collapse while retaining center x and ground y=95
      src=result; newh=max(5,int(H*shrink))
      squished=src.resize((W,newh),Image.Resampling.NEAREST)
      result=Image.new('RGBA',(W,H));result.alpha_composite(squished,(0,H-newh))
      if i>=5:
        rng=random.Random(800+i)
        px=result.load()
        for yy in range(H):
          for xx in range(W):
            if px[xx,yy][3] and (rng.random() < (0.28+0.16*(i-5))):px[xx,yy]=(0,0,0,0)
        d=ImageDraw.Draw(result)
        for j in range(6):
          xx=50+j*4;yy=83-((j*13+i*7)%24)
          d.rectangle((xx,yy,xx+1,yy+1),fill=p['fireHi'] if j%2 else p['fire'])
  # Compress only the hero band to the normal ~54 px height; pivot stays at (64,95).
  # This leaves room for Grom to be genuinely taller within the SAME 128x96 frame.
  upper=33
  cropped=result.crop((0,upper,W,H)).resize((W,54),Image.Resampling.NEAREST)
  compact=Image.new("RGBA",(W,H))
  compact.alpha_composite(cropped,(0,H-54))
  return compact

def build():
  preview=[]; bbox_stats={}
  for evo in (False,True):
    for direction in ('right','up','down'):
      atlas=Image.new('RGBA',(W*10,H*len(ACTIONS)))
      bb={}
      for row,(name,count) in enumerate(ACTIONS.items()):
        for i in range(count):
          fr=render(direction,name,i,evo)
          if fr.getbbox() is None: raise ValueError(f'empty {evo},{direction},{name},{i}')
          b=fr.getbbox()
          # all content must be within the cell, no cropped pixels on top/left/right edges
          if b[0]<=1 or b[1]<=1 or b[2]>=W-1:
            raise ValueError(f'clipping risk {evo},{direction},{name},{i} bbox={b}')
          atlas.alpha_composite(fr,(i*W,row*H));bb[f'{name}:{i}']=b
      side='evolved' if evo else 'base'
      atlas.save(OUT/f'blade-{side}-{direction}.png',optimize=True)
      bbox_stats[f'{side}-{direction}']=bb
  # Contact sheet with only base, three directional rows and selected representative actions
  img=Image.new('RGB',(1400,780),'#16101e');d=ImageDraw.Draw(img)
  tiles=['idle','walk','run','attack1','attack2','attack3','skill1','skill2','ultimate','dash','hit','death']
  for row,direction in enumerate(('right','up','down')):
    d.text((16,40+row*241),direction.upper(),fill='#f2e4ff',stroke_width=1,stroke_fill='#432858')
    for col,action in enumerate(tiles):
      idx=4 if ACTIONS[action]>4 else 1
      src=render(direction,action,idx)
      # crop around drawn character so consistent enlarged view
      crop=src.crop((16,14,112,96)).resize((96,82),Image.Resampling.NEAREST)
      x=120+col*104; y=24+row*242
      img.paste(crop,(x,y),crop)
      d.text((x,y+85),action,fill='#f1c6ff')
      d.rectangle((x,y,x+96,y+82),outline='#6f4b8d',width=1)
  img.save(PREV/'kael-option-c-contact.png')
  # Animated GIF preview in four directions: gif transparency not intended as game asset
  frames=[]
  for i in range(8):
    fr=render('right','run',i)
    frames.append(fr.resize((384,288),Image.Resampling.NEAREST).convert('RGBA'))
  frames[0].save(PREV/'kael-right-run.gif',save_all=True,append_images=frames[1:],duration=85,loop=0,disposal=2)
  manifest={'version':'option-c-hybrid-4-mirror-v1','hero':'BLADE','frame':[W,H], 'pivot':[64,95], 'pixelDensity':3, 'directions':['right','up','down'], 'left':'mirror(right)', 'actions':{k:{'row':n,'frames':c} for n,(k,c) in enumerate(ACTIONS.items())}, 'assets':{kind:{direction:f'art/sprites/blade-{kind}-{direction}.png' for direction in ('right','up','down')} for kind in ('base','evolved')},'source':'Procedural manually defined pixel shapes, not AI image-to-sprite slicing; a draft art pass.'}
  (OUT/'kael-option-c-manifest.json').write_text(json.dumps(manifest,indent=2))
  (ROOT/'preview'/'frame-bounds.json').write_text(json.dumps(bbox_stats,indent=1))
  print('Created 6 directional atlases; frames:',sum(ACTIONS.values())*6,'; size:',(W,H))
if __name__=='__main__':build()
