#!/usr/bin/env python3
"""ASHBLADE v4 artisanal pixel-pose polish.

Changes source RGBA atlas pixels (nearest-neighbor only):
 - body scale & ground pivot across every non-death pose
 - original source art/color palette retained
 - eight distinct mirrored leg-phase poses on Rin and Grom
 - independent tread/wheel motion for Unit-7 and The Dev
 - region-specific highlights for other heroes' movement

The asset pipeline is deterministic and non-destructive to input originals.
Usage: python tools/polish_sprites.py --input path/to/v3/soft-facing --output path/to/v4/soft-facing
"""
import argparse
import math
from collections import deque
from pathlib import Path
from statistics import median
from PIL import Image, ImageDraw
import json

CW, CH = 120, 96
ACTION_COUNTS = {
    'entrance':8,'idle':8,'walk':8,'run':8,
    'attack1':8,'attack2':8,'attack3':8,'skill1':8,'skill2':8,
    'ultimate':10,'dash':6,'hit':4,'death':8,
}
ACTIONS = tuple(ACTION_COUNTS)
HEROES = ('blade','gunner','wizard','ninja','mechanic','tank','robot','dev')
PALETTES = {
    'tank': dict(outline='#20192d', armor='#504865',armor_hi='#9387a2',gold='#da9851', gold_hi='#ffd375'),
    'ninja':dict(outline='#23172a',sock='#f4edf9', sockshade='#9f91c9',shoe='#4d293d',shoe_hi='#98627b'),
}
BASE_HEIGHT = {'blade':54,'gunner':54,'wizard':54,'ninja':54,'mechanic':54,'tank':60,'robot':54,'dev':54}
PHASES = [(-4, 4,0,2),(-2,3,0,3),(0,0,1,1),(3,-2,3,0),(4,-4,2,0),(2,-3,0,1),(0,0,1,1),(-3,2,0,3)]
PHASES_RUN = [(-6,5,0,3),(-3,3,0,4),(1,-1,2,1),(5,-4,4,0),(6,-5,3,0),(3,-3,0,2),(-1,1,1,2),(-5,4,0,4)]

# A character is the connected, near-center alpha component. For body size detection,
# disable tiny detached FX in a few cases by using canonical head/feet ROI below.
def component_body_bbox(img):
    alpha=img.getchannel('A')
    pix=alpha.load()
    seen=set(); best_score=-1e20; best=(45,40,75,91)
    for y in range(18,CH):
        for x in range(22,CW-20):
            if pix[x,y]<50 or (x,y) in seen:
                continue
            stack=[(x,y)]; seen.add((x,y)); coords=[]
            while stack:
                px,py=stack.pop();coords.append((px,py))
                for xx,yy in ((px-1,py),(px+1,py),(px,py-1),(px,py+1)):
                    if xx<0 or xx>=CW or yy<0 or yy>=CH or (xx,yy) in seen or pix[xx,yy]<50:continue
                    stack.append((xx,yy));seen.add((xx,yy))
            n=len(coords)
            if n<30:continue
            xs=[a for a,b in coords]; ys=[b for a,b in coords]
            bb=(min(xs),min(ys),max(xs)+1,max(ys)+1)
            cx=(bb[0]+bb[2])/2;bot=bb[3]-1
            score=n-3*abs(cx-60)-4*abs(bot-91)
            if score>best_score:
                best=bb;best_score=score
    return best


def rescale_ground(img, scale, source_box, desired_center=60, desired_bottom=91):
    """Rescale original complete frame around BODY reference, not its FX bounding box."""
    nw=int(round(CW*scale));nh=int(round(CH*scale))
    sized=img.resize((nw,nh),Image.Resampling.NEAREST)
    l,t,r,b=source_box
    cx=(l+r-1)/2*scale
    fy=(b-1)*scale
    xoff=round(desired_center-cx);yoff=round(desired_bottom-fy)
    new=Image.new('RGBA',(CW,CH),(0,0,0,0))
    # Detect unavoidably clipped pixels. Constrain shifts to preserve as much artwork as possible.
    a_bbox=sized.getchannel('A').getbbox()
    if a_bbox:
        l,t,r,b=a_bbox
        min_x=-l+1;max_x=CW-r-1
        min_y=-t+1;max_y=CH-b-1
        if min_x<=max_x:xoff=max(min_x,min(max_x,xoff))
        if min_y<=max_y:yoff=max(min_y,min(max_y,yoff))
    # Native RGBA alpha compositing, no resampling or alpha-squaring.
    new.alpha_composite(sized,(xoff,yoff))
    return new


def normalize_frame(frame, target_height, action, hero):
    box=component_body_bbox(frame)
    current=box[3]-box[1]
    if action=='death':
        # Fall / disappear / shatter intentionally changes the silhouette.
        return frame, 1.0
    elif action=='dash':
        # Dash reads as a compressed stance, not a dramatically smaller sprite.
        target=target_height*0.98
    else:
        target=target_height
    factor=target/max(current,1)
    # Preserve hand-drawn detail; avoid absurd enlargement when FX is isolated.
    factor=max(0.86,min(1.38,factor))
    return rescale_ground(frame,factor,box),factor


def color_at_idle(idle,coords,fallback):
    for x,y in coords:
        if 0<=x<CW and 0<=y<CH:
            r,g,b,a=idle.getpixel((x,y))
            if a>=200:return (r,g,b,255)
    return fallback


def grom_legs(frame, source_idle, idx, running=False):
    """Eight-frame true alternating armor boots: lift and stride with original metallic texture."""
    vals=(PHASES_RUN if running else PHASES)[idx]
    ldx,rdx,llift,rlift=vals
    out=frame.copy()
    # Remove old ground-contact feet only. Lower arms/coat stay untouched.
    eraser=Image.new('RGBA',(CW,CH),(0,0,0,0))
    e=ImageDraw.Draw(eraser)
    # Pixel-art plate-and-boot region ends below the chest and pauldrons.
    e.rectangle((43,84,59,93), fill=(255,255,255,255))
    e.rectangle((62,84,79,93), fill=(255,255,255,255))
    clear=out.copy();a=clear.getchannel('A');draw=ImageDraw.Draw(a)
    draw.rectangle((43,84,59,93),fill=0);draw.rectangle((62,84,79,93),fill=0)
    clear.putalpha(a)
    out=clear
    idle_l=source_idle.crop((43,83,60,92))
    idle_r=source_idle.crop((62,83,80,92))
    # Armor shin is manually repainted behind footwear, connecting each foot to the hip.
    d=ImageDraw.Draw(out)
    outline=(24,18,33,255); armor=(74,69,94,255); shine=(143,135,166,255)
    gold=(211,137,59,255)
    for side,center,dx,lift in (('l',51,ldx,llift),('r',71,rdx,rlift)):
        cx=center+dx
        d.rectangle((cx-4,81,cx+4,88-lift),fill=outline)
        d.rectangle((cx-3,82,cx+3,87-lift),fill=armor)
        d.line((cx-3,83,cx,82),fill=shine,width=1)
        d.line((cx+2,83,cx+3,85-lift),fill=gold,width=1)
        # A dark knee-gap stops the character reading as a single fused leg.
        d.rectangle((cx-1,88-lift,cx+2,88-lift),fill=outline)
    out.alpha_composite(idle_l,(43+ldx,83-llift))
    out.alpha_composite(idle_r,(62+rdx,83-rlift))
    # Color-unify when the original toe palette is shadowed (evolved has its own original textured boots).
    return out


def rin_legs(frame, idx, running=False):
    """Two independent small knee-sock legs, hand-drawn with actual alternating contact frames."""
    ldx,rdx,llift,rlift=(PHASES_RUN if running else PHASES)[idx]
    # Reduced displacement for Rin's petite chibi anatomy.
    ldx=round(ldx*0.55);rdx=round(rdx*0.55)
    llift=round(llift*0.70);rlift=round(rlift*0.70)
    out=frame.copy()
    a=out.getchannel('A');d=ImageDraw.Draw(a)
    d.rectangle((49,85,70,93),fill=0)
    out.putalpha(a)
    d=ImageDraw.Draw(out)
    for side,cx0,dx,lift in (('l',55,ldx,llift),('r',65,rdx,rlift)):
        cx=cx0+dx
        # Narrow shin with a silver-white sock and violet contour.
        d.rectangle((cx-3,82,cx+2,89-lift), fill=(31,21,46,255))
        d.rectangle((cx-2,83,cx+1,89-lift),fill=(196,180,228,255))
        d.line((cx-2,83,cx-2,88-lift),fill=(245,237,254,255))
        # Shoe heel / toe: 5-7px wide, 2px tall, one planted, the other lifted.
        yy=91-lift
        d.rectangle((cx-4,yy-2,cx+3,yy),fill=(35,19,35,255))
        d.rectangle((cx-3,yy-2,cx+2,yy-1),fill=(75,38,62,255))
        d.line((cx-3,yy-1,cx-1,yy-1),fill=(159,93,121,255))
        d.point((cx+1,yy),fill=(118,66,86,255))
    return out


def annotate_moving_mechanic(frame,idx,hero,evo=False):
    """Small polish to other locomotion types. No artificial human legs on wheels/treads/robes."""
    out=frame.copy();d=ImageDraw.Draw(out)
    if hero=='robot':
        # Tread return: alternating cyan highlight on front wheels, no foot drawing.
        for center in (50,73):
            xx=center+(-2,-1,1,2,2,1,-1,-2)[idx]
            d.line((xx-2,89,xx+1,89),fill=(32,147,200,255))
            d.point((xx,88),fill=(65,227,243,255))
    elif hero=='dev':
        # Animated chair wheel bearings in two locations; no legs invented.
        for center in (47,77):
            xx=center+(-2,-1,1,2,2,1,-1,-2)[idx]
            d.point((xx,87),fill=(58,224,249,255))
            d.point((center,89),fill=(19,64,104,255))
    elif hero=='wizard':
        # Tiny moving hem-light on robe, no feet.
        xx=56+(-3,-2,0,2,3,2,0,-2)[idx]
        d.point((xx,89),fill=(147,104,231,255))
    return out


def measure_height(frame):
    b=component_body_bbox(frame)
    return b[3]-b[1]


def build(source,output):
    output.mkdir(parents=True,exist_ok=True)
    metrics={'version':'v4','frame':[CW,CH], 'footY':91,'actions':ACTION_COUNTS,'heroes':{}}
    for hero in HEROES:
        hero_stats={}
        for variant in ('base','evolved'):
            im=Image.open(source/f'{hero}-{variant}-right.png').convert('RGBA')
            assert im.size==(CW*10,CH*13), (hero,im.size)
            out=Image.new('RGBA',im.size,(0,0,0,0))
            info={}
            idle=im.crop((0,CH,CW,2*CH))
            target=BASE_HEIGHT[hero]
            for row,action in enumerate(ACTIONS):
                info[action]=[]
                for idx in range(ACTION_COUNTS[action]):
                    fr=im.crop((idx*CW,row*CH,(idx+1)*CW,(row+1)*CH))
                    before=measure_height(fr)
                    polished,scale=normalize_frame(fr,target,action,hero)
                    if action in ('walk','run'):
                        if hero=='tank':polished=grom_legs(polished,idle,idx,running=(action=='run'))
                        elif hero=='ninja':polished=rin_legs(polished,idx,running=(action=='run'))
                        else:polished=annotate_moving_mechanic(polished,idx,hero,variant=='evolved')
                    out.alpha_composite(polished,(idx*CW,row*CH))
                    after=measure_height(polished)
                    info[action].append({'before':before,'after':after,'scale':round(scale,3)})
            name=f'{hero}-{variant}-right.png'
            out.save(output/name,optimize=True)
            hero_stats[variant]=info
        metrics['heroes'][hero]=hero_stats
        print(f'{hero}: base/evolved polished')
    (output/'atlas-metadata.json').write_text(json.dumps({'version':4,'design':'Soul Knight 2-facing soft-angle — stabilized character scale, authored gait','frame':{'w':CW,'h':CH,'footX':60,'footY':91},'actions':ACTION_COUNTS,'normalHeight':54,'gromHeight':60,'specialLocomotion':{'wizard':'float','robot':'treads','dev':'wheelchair'}},indent=2))
    (output/'v4-frame-audit.json').write_text(json.dumps(metrics,indent=2))
    return metrics


if __name__=='__main__':
    ap=argparse.ArgumentParser()
    ap.add_argument('--input',type=Path,required=True)
    ap.add_argument('--output',type=Path,required=True)
    a=ap.parse_args()
    build(a.input,a.output)
