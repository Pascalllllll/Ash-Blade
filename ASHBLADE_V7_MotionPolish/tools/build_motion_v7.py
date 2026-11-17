#!/usr/bin/env python3
"""Build ASHBLADE V7 pixel-art motion overlays from V6 masters.
Hand-authored pose curves and pixel overlays; masters are retained at constant size.
Requires Pillow for regeneration only (not gameplay or validation).
"""
from __future__ import annotations
import math, colorsys, json, random, argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps

W,H = 120,96
COLS = 16
ACTIONS = ['idle','walk','run','attack1','attack2','attack3']
COUNTS = {'idle':16,'walk':12,'run':12,'attack1':12,'attack2':12,'attack3':12}
HEROES = ['blade','gunner','wizard','ninja','mechanic','tank','robot','dev']
HEIGHT = {key:54 for key in HEROES}; HEIGHT['tank']=58
COLOURS = {
'blade': ((255,119,35),(191,55,32)), 'gunner': ((248,173,70),(158,50,52)),
'wizard':((109,231,255),(138,82,231)), 'ninja':((255,119,169),(219,51,90)),
'mechanic':((255,173,63),(218,101,37)), 'tank':((245,190,84),(215,82,53)),
'robot':((64,221,255),(240,63,84)), 'dev':((90,221,255),(71,120,235))}
WEAPON={'blade':'sword','gunner':'gun','wizard':'staff','ninja':'katana','mechanic':'wrench','tank':'hammer','robot':'cannon','dev':'laptop'}

# Pixel clusters are intentionally crisp and all animation images use RGBA with binary alpha.
def clean_rgba(image):
    im = image.convert('RGBA')
    pixels=im.load()
    for y in range(im.height):
      for x in range(im.width):
        r,g,b,a=pixels[x,y]
        if a < 128: pixels[x,y]=(0,0,0,0)
        else: pixels[x,y]=(r,g,b,255)
    return im

def frame_master(source, hero):
    img=clean_rgba(Image.open(source))
    if img.height != HEIGHT[hero]:
        neww=round(img.width*(HEIGHT[hero]/img.height))
        img=img.resize((neww, HEIGHT[hero]), Image.Resampling.NEAREST)
    # Remove known light artifact pixels left behind by the original white reference background.
    # Never indiscriminately remove white pixels (silver weapons, shirts and beard are legitimate).
    if hero == 'blade':
        for y in (32,33,34):
            if img.getpixel((11,y))[3] and min(img.getpixel((11,y))[:3]) > 200:
                img.putpixel((11,y),(0,0,0,0))
    return img

def dark_outline(draw,box, color=(25,19,32,255)):
    draw.rectangle(box,fill=color)

def static_base(master,hero,skin,action,i):
    m=master.copy()
    # Repaint lower legs only for walkers. Head and torso are untouched and never scaled.
    if action in ('walk','run') and hero not in ('robot','dev','wizard'):
        m=replace_boots(m,hero,i,action)
    elif action in ('walk','run') and hero == 'robot':
        m=cycle_treads(m,i,action)
    elif action in ('walk','run') and hero == 'dev':
        m=cycle_wheels(m,i,action)
    elif action in ('walk','run') and hero == 'wizard':
        m=cycle_robe(m,i,action)
    if hero == 'blade':
        m=flutter_kael_scarf(m,i,action)
        # Kael uses an independently articulated sword during 3 attacks.
        if action.startswith('attack'):
            m=erase_kael_sword(m)
    if hero == 'ninja' and action.startswith('attack'):
        m=erase_rin_blade(m)
    if action == 'idle': m=idle_details(paint_blink(m,hero,i),hero,i)
    return m

def flutter_kael_scarf(im,i,action):
    # Rework the left tail of the orange scarf; deliberately keep the orange scarf over the mouth fixed.
    if action not in ('idle','walk','run') and not action.startswith('attack'): return im
    phase=(i*math.pi/8) if action=='idle' else (i*math.pi/6)
    y0=round(im.height*.66); xend=round(im.width*.30)
    pic=im.copy()
    d=ImageDraw.Draw(pic)
    # The leftmost scarf tips move by 1 source pixel; no whole-character translation.
    # Match authentic Kael scarf palette and keep the dark outline.
    if i%4 in (1,2):
        d.line((max(1,xend-13),y0-1,max(1,xend-3),y0-1),fill=(118,37,32,255),width=2)
        d.line((max(1,xend-13),y0-2,max(1,xend-4),y0-2),fill=(229,79,30,255),width=1)
    return pic

def eye_positions(hero,im):
    w,h=im.size
    return {
        'blade': [(int(w*.45),int(h*.51)),(int(w*.79),int(h*.51))],
        'gunner':[(int(w*.47),int(h*.48)),(int(w*.75),int(h*.48))],
        'ninja':[(int(w*.47),int(h*.48)),(int(w*.74),int(h*.48))],
        'mechanic':[(int(w*.48),int(h*.49)),(int(w*.72),int(h*.49))],
        'dev':[], 'robot':[], 'wizard':[],'tank':[]
    }.get(hero,[])

def paint_blink(im,hero,i):
    # Two close-up frames per loop; lid pixels are painted over the original eye pixels.
    if i not in (10,11): return im
    out=im.copy();d=ImageDraw.Draw(out)
    coords={
      'blade': [(25,28,3,2),(39,28,2,2)],
      'gunner': [(27,27,2,3),(40,27,2,3)],
      'ninja': [(28,26,3,3),(42,26,2,3)],
      'mechanic':[(28,24,2,3),(42,24,2,3)],
    }.get(hero,[])
    for x,y,wi,he in coords:
        if x+wi>out.width or y+he>out.height:continue
        # Use surrounding face tone; no flat white/light pixels appear around the silhouette.
        face=(245,203,177,255)
        d.rectangle((x,y,x+wi-1,y+he-1),fill=face)
        d.line((x,y+he-1,x+wi-1,y+he-1),fill=(42,29,40,255),width=1)
    return out

def idle_details(im,hero,i):
    # Hand-keyed 16-frame secondary-motion accents: NO torso/head scaling.
    out=im.copy();d=ImageDraw.Draw(out)
    w,h=out.size; cyc=i/16*2*math.pi
    a=round(math.sin(cyc)*2)
    accent,_=COLOURS[hero];c=(*accent,255)
    if hero=='blade':
        # Tiny ember breath at fixed body coordinates, warm scarf highlights.
        if i in (3,4,5,12,13):
            x=max(1,round(w*.15));y=round(h*.67)+a
            d.line((x,y,x+6,y),fill=(239,97,34,255),width=1)
    elif hero=='gunner':
        if i in (1,2,3,8,9):
            x=round(w*.72);y=round(h*.17)
            d.line((x,y,x+4,y),fill=(255,203,93,255),width=1)
    elif hero=='wizard':
        # cyan magic orb breathing, at the right sleeve/staff tip
        x=round(w*.87);y=round(h*.60)
        r=1+(1 if i%8 in (2,3,4) else 0)
        d.ellipse((x-r,y-r,x+r,y+r),fill=(74,223,255,255))
    elif hero=='ninja':
        if i%4 in (1,2):
            x=round(w*.22);y=round(h*.76)+a
            d.line((x-5,y,x+3,y),fill=(214,37,80,255),width=1)
    elif hero=='mechanic':
        if i in (2,3,4,5,10,11):
            x=round(w*.37);y=round(h*.19)
            d.line((x,y,x+4,y),fill=(169,249,253,255),width=1)
    elif hero=='tank':
        if i%8 in (0,1,2,3):
            x=round(w*.57);y=round(h*.47)
            d.line((x,y,x+6,y),fill=(255,196,76,255),width=1)
    elif hero=='robot':
        x=round(w*.52);y=round(h*.64)
        if i%4 in (0,1):d.rectangle((x,y,x+2,y+2),fill=(73,233,255,255))
        else:d.rectangle((x,y,x+2,y+2),fill=(29,117,166,255))
    elif hero=='dev':
        x=round(w*.67);y=round(h*.63)
        d.point((x+(i%3),y),fill=(72,237,255,255))
    return out

def replace_boots(im,hero,i,action):
    # Create proper alternating contacts without translating or shrinking the torso.
    # The feet consist of 2 independently placed pixel clusters under the fixed hip line.
    out=im.copy();w,h=out.size
    top=h-(7 if hero=='tank' else 5)
    dx0=int(w*.46); dx1=int(w*.70)
    # Remove existing rear pixels only below the body. Preserve dark outline and cape above.
    d=ImageDraw.Draw(out)
    if hero=='tank':
        y=top+2; x0=int(w*.34); x1=int(w*.64)
        d.rectangle((x0,y,x0+8,h-1),fill=(0,0,0,0))
        d.rectangle((x1,y,x1+9,h-1),fill=(0,0,0,0))
        centers=(x0+5,x1+4); footw=9; footH=5
        boot=(37,35,48,255); metal=(94,103,123,255); gold=(216,165,79,255)
    else:
        x0=int(w*.36); x1=int(w*.64); y=top+1
        d.rectangle((x0,y,x0+6,h-1),fill=(0,0,0,0))
        d.rectangle((x1,y,x1+6,h-1),fill=(0,0,0,0))
        centers=(x0+3,x1+3); footw=7; footH=3
        boot=(27,20,36,255); metal=(73,50,69,255); gold=None
    phase=i/12*2*math.pi
    amp=2 if action=='walk' else 4
    one=int(round(amp*math.cos(phase)));two=int(round(amp*math.cos(phase+math.pi)))
    # Each foot has opposite lift and offsets. At least one foot is in ground contact.
    lifts=[max(0, math.sin(phase)),max(0,math.sin(phase+math.pi))]
    for idx,(cx,dx,lift) in enumerate(zip(centers,(one,two),lifts)):
        ybottom=h-1-round(lift*(1 if action=='walk' else 2))
        xleft=round(cx+dx-footw/2)
        d.rectangle((xleft, ybottom-footH+1, xleft+footw-1, ybottom),fill=boot)
        d.line((xleft+1,ybottom-footH+1,xleft+footw-2,ybottom-footH+1),fill=metal,width=1)
        if gold:
            d.point((xleft+footw//2,ybottom-footH+1),fill=gold)
        # a small connecting shin prevents independent 'floating shoe' artifacts
        hipx=centers[idx]
        d.line((hipx, top, cx+dx, ybottom-footH+1),fill=boot,width=2 if hero=='tank' else 1)
    return out

def cycle_treads(im,i,action):
    out=im.copy();d=ImageDraw.Draw(out)
    w,h=out.size
    # alternating track highlights maintain same original outline
    step=(i*(2 if action=='run' else 1))%5
    for x in range(round(w*.18),round(w*.80),5):
        if (x//5+step)%3==0:
            d.rectangle((x,h-4,x+1,h-3),fill=(48,176,205,255))
    return out

def cycle_wheels(im,i,action):
    out=im.copy();d=ImageDraw.Draw(out)
    w,h=out.size
    for x in (round(w*.25),round(w*.8)):
        yy=h-5
        if i%3==0:d.line((x-1,yy,x+1,yy),fill=(41,212,252,255),width=1)
        elif i%3==1:d.line((x,yy-1,x,yy+1),fill=(41,212,252,255),width=1)
        else:d.line((x-1,yy-1,x+1,yy+1),fill=(41,212,252,255),width=1)
    return out

def cycle_robe(im,i,action):
    out=im.copy();d=ImageDraw.Draw(out)
    w,h=out.size
    x=round(w*.33)+(i%3);y=h-3
    d.line((x,y,x+4,y+1),fill=(76,46,125,255),width=1)
    return out

def erase_kael_sword(im):
    # The embedded V6 sword occupies Kael's lower-left silhouette.
    out=im.copy();w,h=out.size;pix=out.load()
    for y in range(int(h*.71),h):
        for x in range(0,int(w*.40)):
            r,g,b,a=pix[x,y]
            if a and r>105 and g>100 and b>105 and abs(r-g)<75:
                pix[x,y]=(0,0,0,0)
    return out

def erase_rin_blade(im):
    # Retain her red scarf and ceremonial suit; remove only light metal pixels at far right.
    out=im.copy();w,h=out.size;pix=out.load()
    for y in range(int(h*.49),h):
        for x in range(int(w*.80),w):
            r,g,b,a=pix[x,y]
            if a and min(r,g,b)>145 and max(r,g,b)-min(r,g,b)<85:
                pix[x,y]=(0,0,0,0)
    return out

def line(draw,xy,color,width=1):draw.line(tuple(round(v) for v in xy), fill=color, width=width)

def sword_overlay(d,ox,oy,m,action,i,accent):
    # Weapon hand pivot remains attached to body; changing tip, not the entire torso.
    w,h=m.size
    pivot=(ox+round(w*.41), oy+round(h*.80))
    phase=i/11
    if action=='attack1':
        a=-2.5 + phase*2.5
        length=24
    elif action=='attack2':
        a=0.8-phase*3.8
        length=24
    else:
        a=-2.8+phase*(2*math.pi)
        length=22
    tip=(max(3,min(116,pivot[0]+math.cos(a)*length)), max(3,min(90,pivot[1]+math.sin(a)*length)))
    line(d,(pivot[0],pivot[1],tip[0],tip[1]),(33,24,43,255),5)
    line(d,(pivot[0],pivot[1],tip[0],tip[1]),(240,239,249,255),3)
    line(d,(pivot[0],pivot[1],tip[0],tip[1]),(253,255,255,255),1)
    hx=pivot[0]-round(math.cos(a)*4);hy=pivot[1]-round(math.sin(a)*4)
    d.rectangle((hx-3,hy-3,hx+3,hy+3),fill=(190,118,46,255),outline=(31,23,41,255),width=1)
    if 2<=i<=8:
        # Pixel arc near blade only, no huge gameplay slash VFX.
        r=18;cx=pivot[0];cy=pivot[1]-8
        aa0=int(math.degrees(a)-45);aa1=aa0+34
        d.arc((cx-r,cy-r,cx+r,cy+r),aa0,aa1,fill=(*accent,230),width=2)

def mech_wrench(d,ox,oy,m,i,action):
    w,h=m.size;px=ox+round(w*.78);py=oy+round(h*.72)
    angle=-math.pi/2 + (i/11-0.5)*1.65
    x2=px+math.cos(angle)*20; y2=max(9,min(87,py+math.sin(angle)*20))
    line(d,(px,py,x2,y2),(39,32,47,255),5)
    line(d,(px,py,x2,y2),(157,172,179,255),3)
    d.rectangle((x2-4,y2-3,x2+4,y2+2),fill=(111,123,137,255),outline=(43,39,51,255))

def hammer(d,ox,oy,m,i,action):
    w,h=m.size;px=ox+round(w*.79);py=oy+round(h*.70)
    angle= (-1.5 if action=='attack2' else -.1 if action=='attack1' else -2.5)+i/11*(2.4 if action!='attack3' else 5.9)
    tx=px+round(math.cos(angle)*18);ty=max(8,min(87,py+round(math.sin(angle)*18)))
    line(d,(px,py,tx,ty),(44,36,46,255),5)
    line(d,(px,py,tx,ty),(193,144,58,255),2)
    d.rectangle((tx-8,ty-5,tx+8,ty+5),fill=(83,95,116,255),outline=(244,183,82,255),width=2)

def attack_details(draw,hero,m,ox,oy,action,i):
    accent,_ = COLOURS[hero]
    w,h=m.size
    # One attack is twelve authored phases: anticipate -> execute -> follow-through -> recovery.
    if hero=='blade': sword_overlay(draw,ox,oy,m,action,i,accent)
    elif hero=='ninja': sword_overlay(draw,ox+round(w*.38),oy,m,action,i,accent)
    elif hero=='mechanic': mech_wrench(draw,ox,oy,m,i,action)
    elif hero=='tank': hammer(draw,ox,oy,m,i,action)
    elif hero=='gunner':
        px=ox+round(w*.91);py=oy+round(h*.63)-round(max(0,math.sin(i/11*math.pi))*2)
        if i in (4,5,6):
            draw.line((px+3,py,px+7,py),fill=(*accent,255),width=2)
            draw.point((px+9,py-2),fill=(255,237,193,255))
        if i in (3,7):draw.point((px+3,py+5),fill=(240,195,65,255))
    elif hero=='wizard':
        x=ox+round(w*.92);y=oy+round(h*.54)
        r=1+int(3*max(0,math.sin(i/11*math.pi)))
        draw.ellipse((x-r,y-r,x+r,y+r),fill=(*accent,255))
    elif hero=='robot':
        x=ox+round(w*.9);y=oy+round(h*.65)
        r=2+round(max(0,math.sin(i/11*math.pi))*3)
        draw.ellipse((x-r,y-r,x+r,y+r),outline=(*accent,255),width=2)
    elif hero=='dev':
        x=ox+round(w*.70);y=oy+round(h*.64)
        if i%3 in (1,2): draw.rectangle((x-3,y-4,x+3,y-1),fill=(*accent,255))
    # Use small accent trails only in attack states.
    if i in (4,5,6) and hero in ('gunner','wizard','robot','dev'):
        x=ox+round(w*.90)+5; y=oy+round(h*.55)
        draw.line((x,y,x+4,y),fill=(*accent,255),width=1)

def sway_upper_body(frame,hero,action,i,head_bottom):
    # 2D pixel-animation rig: subtle upper-body lateral weight shift, with anchored feet.
    # This is translation, NOT scaling; exact head/body/leg ratios never change.
    if action=='idle':
        phase=2*math.pi*i/16
        amp=1 if hero in ('tank','robot','wizard','dev') else 2
        dx=round(math.sin(phase)*amp)
    elif action in ('walk','run'):
        phase=2*math.pi*i/12
        amp=1 if action=='walk' else 2
        dx=round(math.sin(phase)*amp)
    else:
        phase=math.pi*i/11
        dx=round(math.sin(phase)*2)
    if not dx:return frame
    # Crop above boot zone so that the feet/ground pivot do not slide.
    upper_y=max(0,min(H-6,head_bottom))
    upper=frame.crop((0,0,W,upper_y))
    out=frame.copy()
    ImageDraw.Draw(out).rectangle((0,0,W-1,upper_y-1), fill=(0,0,0,0))
    out.alpha_composite(upper,(dx,0))
    return out

def make_frame(master,hero,skin,action,i):
    native=static_base(master,hero,skin,action,i)
    out=Image.new('RGBA',(W,H),(0,0,0,0))
    ox=round(W/2-native.width/2); oy=93-native.height
    out.alpha_composite(native,(ox,oy))
    out=sway_upper_body(out,hero,action,i,oy+round(native.height*.75))
    if action.startswith('attack'):
        d=ImageDraw.Draw(out)
        attack_details(d,hero,master,ox,oy,action,i)
    return clean_rgba(out)

def make_atlas(root, outfolder, hero,variant):
    sf='' if variant=='base' else '-evolved'
    master=frame_master(root/f'art/sprites/soulknight-masters/{hero}{sf}.png',hero)
    atlas=Image.new('RGBA',(COLS*W, len(ACTIONS)*H), (0,0,0,0))
    for row,action in enumerate(ACTIONS):
        for col in range(COUNTS[action]):
            fr=make_frame(master,hero,variant,action,col)
            atlas.alpha_composite(fr,(col*W,row*H))
    dest=outfolder/f'{hero}-{variant}-motion-v7.png'
    atlas.save(dest, optimize=True)
    return dest

def clean_entrance(root,outfolder):
    src=root/'art/sprites/entrance/kael-v2-24.png'
    if not src.exists():return None
    im=clean_rgba(Image.open(src))
    out=Image.new('RGBA',im.size,(0,0,0,0))
    # Original body at frame 23 is 68 px. Gameplay Kael is 54 px.
    ratio=54/68
    for i in range(24):
        tile=im.crop(((i%12)*120,(i//12)*96,((i%12)+1)*120,((i//12)+1)*96))
        scaled=tile.resize((round(120*ratio),round(96*ratio)),Image.Resampling.NEAREST)
        bb=scaled.getchannel('A').getbbox()
        if bb:
            # Frame23 original foot y=89; after scaling to 54 px final foot aligns y=92.
            dx=round(60-(bb[0]+bb[2])/2)
            dy=92-bb[3]
            fr=Image.new('RGBA',(120,96),(0,0,0,0));fr.alpha_composite(scaled,(dx,dy))
            out.alpha_composite(fr,((i%12)*120,(i//12)*96))
    dest=outfolder/'kael-entrance-v7-scaled-54px.png'
    out.save(dest,optimize=True)
    return dest

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--project',required=True)
    ap.add_argument('--output',required=True)
    args=ap.parse_args()
    root=Path(args.project)
    out=Path(args.output)
    out.mkdir(parents=True,exist_ok=True)
    for hero in HEROES:
        for variant in ('base','evolved'):
            target=make_atlas(root,out,hero,variant)
            print(target.name,target.stat().st_size)
    en=clean_entrance(root,out)
    if en:print('entrance',en)
    metadata={'version':7,'frame':{'w':W,'h':H,'cols':16,'rows':6,'footX':60,'footY':92},
              'actions':ACTIONS,'counts':COUNTS,'heights':HEIGHT,'dir':'right slight front, left mirrored',
              'alpha':'0 or 255; transparent RGB zero; nearest-neighbor'}
    (out/'motion-v7-metadata.json').write_text(json.dumps(metadata,indent=2))
if __name__=='__main__':main()
