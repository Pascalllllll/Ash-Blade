#!/usr/bin/env python3
"""ASHBLADE / Kael visual-master atlas builder.

Keep the approved pixel-art master intact; generate source-frame animation atlas
with consistent 128x96 cells and a fixed ground pivot (64,95). This is a
sprite-art prototype: original manually polished keyframes can be swapped in
without changing the game runtime / animation contract.
"""
from __future__ import annotations
import json, math
from pathlib import Path
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'sources'
OUTPUT=ROOT/'assets'
OUTPUT.mkdir(parents=True,exist_ok=True)
FRAME=(128,96)
GROUND=(64,95)
ANIMS=[('entrance',8),('idle',8),('walk',8),('run',8),('attack1',8),('attack2',8),('attack3',8),('skill1',8),('skill2',8),('ultimate',10),('dash',6),('hit',4),('death',8)]
ORANGE=(255,123,30,245)
YELLOW=(255,224,134,255)
RED=(226,57,37,225)
VIOLET=(185,72,243,230)
PINK=(236,137,253,255)
SHADOW=(21,12,35,255)

def sprite(img: Image.Image, x=0,y=0):
    dst=Image.new('RGBA',FRAME)
    dst.alpha_composite(img,(32+x,33+y))
    return dst

def segment_leg_motion(source: Image.Image, phase:int,run=False)->Image.Image:
    """Animate individual foot positions; do not transform hair, face or embedded blade."""
    out=source.copy()
    # All 64-px masters share bottom-body positions, and leg edits only touch
    # the last 8 px of the dark trouser/boot region (not the scarf/sword).
    feet=Image.new('RGBA',(64,64))
    # Draw short Soul-Knight-like pixel boots with phase-dependent gait.
    d=ImageDraw.Draw(feet)
    steps=([(-1,0),(1,-1),(2,0),(0,1),(-1,0),(1,-1),(2,0),(0,1)] if run else
           [(0,0),(1,-1),(0,0),(-1,1),(0,0),(-1,-1),(0,0),(1,1)])
    dx,dy=steps[phase%8]
    for j,off in enumerate((dx,-dx)):
        cx=(41 if j==0 else 49)+off
        # shoes: 5px width; 1px light top and near-black soles.
        d.rectangle((cx-2,56+max(0,dy),cx+1,59+max(0,dy)),fill=(50,32,62,245))
        d.rectangle((cx-3,60+max(0,dy),cx+2,61+max(0,dy)),fill=(20,13,31,255))
        d.line((cx-2,57+max(0,dy),cx,57+max(0,dy)),fill=(96,64,112,255))
    # Keep authentic master completely visible, add just foot movement over it.
    out.alpha_composite(feet)
    return out

def polyline(draw,points,fill,width=2):
    points=[(round(x),round(y)) for x,y in points]
    draw.line(points,fill=SHADOW,width=width+2,joint='curve')
    draw.line(points,fill=fill,width=width,joint='curve')

def swing_effect(frame,kind,i,direction):
    # Subtle local blade highlights only; the large gameplay slash, beam and
    # shockwave are already produced by the ASHBLADE combat engine.
    d=ImageDraw.Draw(frame,'RGBA')
    prog=i/7
    if kind=='attack1' and 2<=i<=5:
        for r in [17,19]:
            start=195-115*prog
            bb=(64-r,71-r,64+r,71+r)
            d.arc(bb,start,start+65,fill=ORANGE if r==17 else YELLOW,width=2)
    elif kind=='attack2' and 2<=i<=6:
        if i<4: polyline(d,[(61,75),(79,58),(86,52)],ORANGE,2)
        else: polyline(d,[(61,61),(77,78),(84,83)],YELLOW,2)
    elif kind=='attack3' and 2<=i<=6:
        r=20
        d.arc((64-r,74-r,64+r,74+r),-100,170+max(0,i-3)*30,fill=ORANGE,width=3)
        d.arc((64-r+2,74-r+2,64+r-2,74+r-2),-90,145+max(0,i-3)*30,fill=YELLOW,width=1)
    elif kind=='skill1' and 1<=i<=6:
        for n in range(2):
            yy=53+n*12
            x0=max(3,55-(i-2)*6-n*4)
            polyline(d,[(x0,yy),(x0-14,yy)],VIOLET if n==0 else ORANGE,2)
    elif kind=='skill2' and 1<=i<=6:
        for j in (-1,1):
            x=64+j*13
            yy=72 if i<3 else 64
            points=[(x,yy),(x+j*5,yy-7),(x+j*2,yy-11),(x+j*11,yy-17)]
            polyline(d,points,PINK if i%2 else VIOLET,2)
    elif kind=='ultimate' and 1<=i<=8:
        a=(i*1.7)
        for n in range(2):
            cx=64+math.cos(a+n*2.3)*26;cy=72+math.sin(a+n*1.3)*12
            polyline(d,[(cx-8,cy+6),(cx+10,cy-7)],PINK if n==0 else YELLOW,2)
    elif kind=='dash' and 1<=i<=4:
        for n in range(3):
            y=55+n*10
            polyline(d,[(18, y),(40-(i%2)*3,y)],VIOLET if n<2 else RED,1)
    elif kind=='hit' and i in (1,2):
        for s in (-1,1):
            x=64+s*20
            polyline(d,[(x,50),(x+s*7,42)],RED,2)
    elif kind=='entrance' and i<5:
        h=int(52*(1-i/5))
        if h>0:
            for j in range(3):
                x=49+j*16
                polyline(d,[(x,93-h),(x,87)],VIOLET if j!=1 else PINK,2)
    return frame

def remove_sword_for_tempest(base:Image.Image,direction:str)->Image.Image:
    """Barehand E pose: erase embedded blade without changing Kael's head/torso."""
    out=base.copy()
    d=ImageDraw.Draw(out)
    # Deliberately small polygons exclude scarf, face and leg silhouettes.
    bounds={
      'right':[(10,63),(12,55),(24,50),(28,49),(32,50),(21,64)],
      'down':[(5,63),(7,57),(17,53),(24,51),(25,55),(17,64)],
      'up':[(40,64),(40,57),(44,54),(50,53),(54,56),(60,63)],
    }
    d.polygon(bounds[direction],fill=(0,0,0,0))
    return out

def frame_of(direction,kind,i,base):
    # Sprite keeps same head, scarf, armour, weapon and colour palette as the
    # approved turnaround. No procedural character redesign.
    torso=remove_sword_for_tempest(base,direction) if kind=='skill2' else base.copy()
    if kind in ('walk','run'):
        torso=segment_leg_motion(torso,i,kind=='run')
    if kind in ('idle','walk','run'):
        dy= -1 if (kind=='idle' and i in (2,3)) else (0 if kind=='idle' else (-1 if i%2 else 0))
        f=sprite(torso,0,dy)
        # Keep contact position: overlay shoes on bottom row after lifted phases.
        if dy==-1 and kind in ('walk','run'):
            f.alpha_composite(Image.new('RGBA',(1,1),(38,25,49,255)),(64,95))
    elif kind in ('attack1','attack2','attack3'):
        dx=(-2 if i in (1,2) else 2 if i in (4,5) else 0)
        dy=(-1 if i==3 else 0)
        f=sprite(torso,dx,dy)
    elif kind in ('skill1','dash'):
        x=[0,-1,-3,-2,1,0,0,0][i] if kind=='skill1' else [0,-1,-3,-2,1,0][i]
        f=sprite(torso,x,0)
    elif kind=='skill2':
        f=sprite(torso,0,-1 if i in (3,4,5) else 0)
    elif kind=='ultimate':
        f=sprite(torso,[-1,0,1,2,-1,2,0,-1,1,0][i],-1 if 3<=i<=6 else 0)
    elif kind=='entrance':
        f=sprite(torso,0,0 if i>3 else min(0,(i-3)*2))
        if i==0: f=Image.new('RGBA',FRAME)
        if i==1: f.putalpha(f.getchannel('A').point(lambda a:a//5))
        if i==2: f.putalpha(f.getchannel('A').point(lambda a:a*2//5))
    elif kind=='hit':
        f=sprite(torso,[-1,2,-2,0][i],0)
    elif kind=='death':
        f=sprite(torso,0,0)
        if i>1:
            # Pixel-space tumble, fade into ash; corpse effects are handled by the game.
            raw=f.copy();f=Image.new('RGBA',FRAME)
            if i<5:
                crop=raw.crop((28,32,99,96))
                crop=crop.resize((71,max(1,64-(i-1)*12)),Image.Resampling.NEAREST)
                f.alpha_composite(crop,(28,96-crop.height))
            elif i in (5,6):
                d=ImageDraw.Draw(f,'RGBA')
                for j in range(32-(i-5)*16):
                    x=42+(j*17)%44; y=83+(j*7)%12
                    d.rectangle((x,y,x+2,y+2),fill=(118,63,141,230))
    else:
        f=sprite(torso)
    if kind!='death':f=swing_effect(f,kind,i,direction)
    return f

def main():
    manifest={'version':3,'hero':'BLADE','cell':{'width':128,'height':96},'pixelDensity':3,'visualHeight':54,'groundAnchor':{'x':64,'y':95},'columns':10,'directions':['right','up','down'],'left':'mirror-right','rows':{},'animations':{},'source':'Approved Kael visual master v2; coded action variants'}
    for ri,(name,count) in enumerate(ANIMS):
        manifest['rows'][name]=ri
        manifest['animations'][name]={'frames':count,'fps': 12 if name.startswith('attack') else 16 if name in ('dash','skill1','ultimate') else 9 if name in ('idle','walk') else 13,'loop':name in ('idle','walk','run')}
    for direction in ('right','up','down'):
        base=Image.open(SOURCE/f'kael-{direction}-master-64.png').convert('RGBA')
        sheet=Image.new('RGBA',(1280,96*len(ANIMS)))
        for ri,(name,n) in enumerate(ANIMS):
            for i in range(n):
                c=frame_of(direction,name,i,base)
                sheet.alpha_composite(c,(i*128,ri*96))
        sheet.save(OUTPUT/f'kael-{direction}.png',optimize=True)
    (OUTPUT/'kael-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    preview=Image.new('RGBA',(128*8,96*13),(0,0,0,0))
    base=Image.open(OUTPUT/'kael-right.png')
    for y in range(13): preview.alpha_composite(base.crop((0,y*96,128*8,(y+1)*96)),(0,y*96))
    preview.save(ROOT/'preview'/'kael-actions-transparent.png')
    back=Image.new('RGBA',preview.size,(30,26,39,255));g=ImageDraw.Draw(back)
    for y in range(0,back.height,16):
        for x in range(0,back.width,16):
            if ((x+y)//16)%2==0:g.rectangle((x,y,x+15,y+15),fill=(44,39,53,255))
    back.alpha_composite(preview)
    back.resize((768,936),Image.Resampling.NEAREST).convert('RGB').save(ROOT/'preview'/'kael-animation-preview.jpg',quality=91)
    print('Produced 3 atlases: ',[(x.name,x.stat().st_size) for x in OUTPUT.glob('*.png')])
if __name__=='__main__':main()
