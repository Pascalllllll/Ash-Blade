#!/usr/bin/env python3
"""ASHBLADE Kael V5 artwork builder.

Stable body derived from approved v4 master. Lower body/legs and weapon poses
are newly drawn in the source pixel grid; does not upscale or segment AI art.
Requires Pillow for ART BUILD ONLY. The installer uses Python stdlib exclusively.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import math, json

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'source'
OUTPUT=ROOT/'art/sprites/soft-facing'
OUTPUT.mkdir(parents=True,exist_ok=True)
W,H,COLS=120,96,10
ACTIONS=[('entrance',8),('idle',8),('walk',8),('run',8),('attack1',8),('attack2',8),('attack3',8),('skill1',8),('skill2',8),('ultimate',10),('dash',6),('hit',4),('death',8)]
GROUND=92
PHASE_WALK=[(-4,1,0,0),(-3,0,1,0),(-1,1,-2,0),(1,0,-3,0),(1,0,-4,1),(1,0,-3,0),(-2,0,-1,1),(-3,0,1,0)]
PHASE_RUN=[(-6,1,2,0),(-4,0,0,0),(-2,3,-3,0),(1,0,-5,0),(2,0,-6,1),(0,0,-4,0),(-3,0,-2,3),(-5,0,1,0)]
# tuple dx_left, lift_left, dx_right, lift_right
C={
 'outline':(24,15,35,255),'trouser':(62,43,76,255),'fold':(111,72,122,255),
 'boot':(51,39,68,255),'sole':(37,31,56,255),'glint':(139,100,147,255),
 'scarf':(235,79,20,255),'scarfShadow':(116,30,33,255),'ember':(255,115,32,255),
 'bright':(255,210,91,255),'bladeDark':(35,28,48,255),'bladeMid':(139,126,144,255),
 'bladeLight':(240,234,222,255),'steel':(205,218,232,255),'gold':(210,148,68,255),
 'violet':(173,70,243,255),'volt':(215,126,255,255),
}

def crop(im,row,col):return im.crop((col*W,row*H,(col+1)*W,(row+1)*H))

def cut_source_master(master):
    p=master.load()
    # Remove v4's built-in short, partially occluded boots and the old idle sword
    # while respecting all original shading of the hair, eyes, scarf and shoulders.
    for y in range(H):
        for x in range(W):
            if (y>=87 and 51<=x<=79) or (y>=79 and x<53):
                p[x,y]=(0,0,0,0)
    return master

def leg_layer(phase,variant):
    dxl,liftl,dxr,liftr=phase
    im=Image.new('RGBA',(W,H))
    d=ImageDraw.Draw(im)
    # Hip connection beneath Kael's scarf, solid source pixel grid
    d.rectangle((55,83,74,87), fill=C['outline'])
    d.rectangle((57,83,71,87), fill=C['trouser'])
    # Each foot is an independent drawing, with its own ankle and contact phase.
    # Rear leg first, forward leg last; no leg mirroring with identical positions.
    for side,dx,lift in [(0,dxl,liftl),(1,dxr,liftr)]:
        center=(57 if side==0 else 70)+dx
        ankle_x=58 if side==0 else 70
        knee_y=87-lift//2
        ankle_y=90-lift
        # diagonally connecting shin with staggered foot
        d.line([(ankle_x,85),(center,knee_y),(center,ankle_y)], fill=C['outline'],width=6)
        d.line([(ankle_x,85),(center,knee_y),(center,ankle_y)], fill=C['trouser'],width=4)
        d.line([(ankle_x-1,86),(center-1,knee_y),(center-1,ankle_y-1)], fill=C['fold'],width=1)
        x0=center-4; yt=88-lift
        d.rectangle((x0-1,yt-1,x0+7,92-lift),fill=C['outline'])
        d.rectangle((x0,yt,x0+6,91-lift),fill=C['boot'])
        d.rectangle((x0+1,yt,x0+5,yt),fill=C['glint'])
        d.rectangle((x0+1,yt+1,x0+3,yt+1),fill=C['fold'])
        d.rectangle((x0,92-lift,x0+7,92-lift),fill=C['sole'])
        d.point((x0+5,91-lift),fill=C['glint'])
    return im

def add_pixel_scarf(im,tick,kind):
    # The source scarf remains intact; tiny animated free end avoids frozen cape.
    d=ImageDraw.Draw(im)
    off=[0,1,1,2,1,0,-1,-1][tick%8]
    if kind in ('run','dash','skill1'): off+=3
    d.line([(81,81),(85+off,82),(89+off,80)],fill=C['scarfShadow'],width=4)
    d.line([(81,80),(85+off,81),(89+off,79)],fill=C['scarf'],width=2)
    d.point((90+off,79),fill=C['ember'])

def blade(im,start,end,burning=False):
    # One hand-held weapon, rendered at original art resolution with no resize.
    d=ImageDraw.Draw(im)
    x0,y0=start; x1,y1=end
    # The sword tip always stays at least 6 transparent pixels inside the cell.
    x1=max(6,min(W-7,x1)); y1=max(7,min(H-7,y1))
    ax=x1-x0; ay=y1-y0; length=math.hypot(ax,ay)
    if length<1:return
    px=-ay/length; py=ax/length
    # handle connects at the wrist; hilt and guard are not duplicated by engine
    grip=(x0-ax*0.17, y0-ay*0.17)
    d.line([tuple(map(round,grip)),(x0,y0)],fill=C['outline'],width=3)
    d.line([tuple(map(round,grip)),(x0,y0)],fill=C['gold'],width=1)
    g1=(round(x0+px*3),round(y0+py*3)); g2=(round(x0-px*3),round(y0-py*3))
    d.line([g1,g2],fill=C['outline'],width=3)
    d.line([g1,g2],fill=C['gold'],width=1)
    p1=(round(x0+px*2),round(y0+py*2));p2=(round(x1-px*.4),round(y1-py*.4));p3=(round(x0-px*2),round(y0-py*2))
    d.polygon([p1,p2,p3],fill=C['outline'])
    d.line([(x0,y0),(x1,y1)],fill=C['bladeMid'] if not burning else C['ember'],width=3)
    d.line([(x0+px*.5,y0+py*.5),(x1,y1)],fill=C['bladeLight'] if not burning else C['bright'],width=1)
    d.point((round(x1),round(y1)),fill=C['bladeLight'] if not burning else C['bright'])

def motion_arc(im,stage,style):
    d=ImageDraw.Draw(im)
    if style=='horizontal':
        if 2<=stage<=5:
            a=[(83,78),(87,81),(90,87),(84,92)][stage-2]
            d.arc((50,67,a[0],min(92,a[1]+7)),-50,85,fill=C['ember'],width=2)
            d.arc((53,70,a[0]-2,min(91,a[1]+5)),-50,80,fill=C['bright'],width=1)
    elif style=='cross':
        if 2<=stage<=6:
            k=stage-2
            d.line([(43+k,70+k),(83-k,89-k)], fill=C['scarfShadow'],width=3)
            d.line([(44+k,70+k),(82-k,88-k)], fill=C['ember'],width=1)
            if k>=2:
                d.line([(42+k,88-k),(82-k,69+k)],fill=C['ember'],width=2)
    elif style=='spin':
        if 2<=stage<=6:
            d.arc((38,61,92,92),[-100,-70,-30,20,60][stage-2],[-25,10,55,110,170][stage-2],fill=C['ember'],width=3)
            d.arc((40,63,90,91),[-100,-70,-30,20,60][stage-2],[-25,10,55,110,170][stage-2],fill=C['bright'],width=1)

def motion_pose(action,i):
    default=((53,82),(35,89),False)
    if action=='attack1':
        poses=[((52,81),(36,90),False),((53,80),(42,64),False),((53,80),(61,61),True),((53,81),(83,69),True),((54,82),(87,81),True),((54,83),(82,92),True),((52,83),(44,88),False),default]
        return poses[i]
    if action=='attack2':
        poses=[default,((52,81),(40,64),False),((52,81),(82,90),True),((53,81),(79,68),True),((53,80),(42,91),True),((53,80),(81,90),True),((52,81),(50,67),False),default]
        return poses[i]
    if action=='attack3':
        a=[220,165,90,30,-15,75,150,220][i]
        return ((54,81),(round(54+26*math.cos(math.radians(a))),round(81+24*math.sin(math.radians(a)))),i in (2,3,4,5))
    if action=='ultimate':
        return motion_pose('attack3',i%8)
    if action in ('dash','skill1'):
        return ((52,82),(36,88), i in (2,3))
    if action=='hit':
        return ((52,82),(37,89),False)
    return default

def lightning_hands(im,i):
    d=ImageDraw.Draw(im)
    if i in (0,7):return
    for side in (-1,1):
        x=59+side*24; y=81
        # flickering glow limited to hands; engine draws large chains/shockwave
        d.rectangle((x-3,y-3,x+3,y+3),fill=(136,33,181,130))
        d.rectangle((x-1,y-1,x+1,y+1),fill=C['volt'])
        if 2<=i<=5:
            d.line([(x,y-4),(x+side*2,y-8),(x-side*1,y-11)],fill=C['violet'],width=1)
            d.point((x+side*2,y-8),fill=C['bladeLight'])

def render_action(master,action,i,skin):
    if action=='death':
        return None
    # Full original head/face/torso silhouette is reused with no rescaling:
    # only legs, arm weapon angle and free scarf end change.
    body=master.copy()
    # Pixel-scale upper-body bounce: one source pixel at most; never resize.
    # Feet remain independently anchored to the shared ground row.
    if action in ('walk','run') and i in (2,3,6,7):
        shifted=Image.new('RGBA',(W,H),(0,0,0,0))
        shifted.alpha_composite(master,(0,-1))
        body=shifted
    if action=='walk':phase=PHASE_WALK[i]
    elif action=='run':phase=PHASE_RUN[i]
    elif action in ('dash','skill1'):
        phase=PHASE_RUN[(i*2)%8]
    elif action=='attack3':phase=PHASE_WALK[(i+2)%8]
    elif action in ('attack1','attack2','ultimate'):
        phase=PHASE_WALK[i%8]
    else:phase=(0,0,0,0)
    # Boots are in front of outfit's original lower hem, with independent phase.
    body.alpha_composite(leg_layer(phase,skin))
    add_pixel_scarf(body,i,action)
    if action in ('attack1','attack2','attack3','ultimate'):
        style={'attack1':'horizontal','attack2':'cross','attack3':'spin','ultimate':'spin'}[action]
        motion_arc(body,i%8,style)
    if action=='skill2':
        lightning_hands(body,i)
    else:
        start,end,burning=motion_pose(action,i)
        if action in ('walk','run'):
            start=(start[0]+(1 if i in (1,2,5,6) else 0), start[1])
            end=(end[0]+(2 if i in (1,2,5,6) else -1),end[1]-(1 if i in (2,6) else 0))
        blade(body,start,end,burning)
    if action in ('idle','entrance'):
        # Eight distinct, extremely subtle eye/hair-shine phases; no head scaling.
        d=ImageDraw.Draw(body)
        shine=[(65,44),(67,45),(69,45),(70,44),(69,44),(67,43),(65,43),(64,44)][i]
        d.point(shine,fill=(171,91,165,255))
    if action=='ultimate' and i>=8:
        d=ImageDraw.Draw(body)
        d.point((82+i,62),fill=C['ember'])
    if action=='hit':
        d=ImageDraw.Draw(body)
        if i in (1,2):
            for x,y in [(82,43),(86,47),(39,57)]:d.point((x,y),fill=C['bright'])
        d.point((88-i,50+i), fill=C['scarf'] if i&1 else C['bright'])
    if action=='entrance' and 2<=i<=5:
        d=ImageDraw.Draw(body)
        for x,y in [(34+i,91-i),(88-i,85-i),(66,32+i)]:d.point((x,y),fill=C['ember'])
    return body

def build(skin):
    input_path=SOURCE/f'blade-{skin}-right-v4.png'
    source=Image.open(input_path).convert('RGBA')
    assert source.size == (W*COLS,H*len(ACTIONS))
    master=cut_source_master(crop(source,1,0))
    master.save(OUTPUT/f'kael-master-{skin}.png')
    output=Image.new('RGBA',source.size,(0,0,0,0))
    for row,(action,count) in enumerate(ACTIONS):
        for i in range(count):
            frame=render_action(master,action,i,skin)
            if frame is None:frame=crop(source,row,i) # collapse/ash intentionally changes shape
            output.alpha_composite(frame,(i*W,row*H))
    target=OUTPUT/f'blade-{skin}-right.png'
    output.save(target,optimize=True)
    return target

if __name__=='__main__':
    for s in ('base','evolved'):
        target=build(s)
        print(target)
    manifest={'version':'Kael V5 BodyLock','artStyle':'Soul Knight inspired, 2-facing soft-angle, left mirrors right',
      'frame':{'width':W,'height':H,'columns':10,'rows':len(ACTIONS),'feetBaseline':GROUND},
      'master': 'Approved v4 original head/face/scarf; rebuilt independently phased boots and sword poses',
      'actions':{name:count for name,count in ACTIONS},'notes':{'death':'uses v4 intentional collapse','skill2':'no sword, purple lightning hands; major effects remain engine-side'},
      'source':'Kael V4 normalized transparent atlas supplied earlier in conversation'}
    (OUTPUT/'kael-v5-manifest.json').write_text(json.dumps(manifest,indent=2))
