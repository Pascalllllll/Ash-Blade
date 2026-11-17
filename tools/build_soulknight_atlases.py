#!/usr/bin/env python3
"""Generate consistent pixel-native Ashblade animation atlases from the eight isolated visual masters.
Art style is Soul Knight-inspired. This uses generated key art masters and programmatically animated
small details; it is not a hand-drawn 100-pose per-hero animation replacement.
"""
from PIL import Image, ImageDraw, ImageOps
from pathlib import Path
import math, random, colorsys, json
import numpy as np
ROOT=Path(__file__).resolve().parent
MASTERS=ROOT/'masters'; OUT=ROOT/'art/sprites/soft-facing'; OUT.mkdir(parents=True,exist_ok=True)
W,H=120,96; FOOT_X,FOOT_Y=60,92
ACTIONS={'entrance':8,'idle':8,'walk':8,'run':8,'attack1':8,'attack2':8,'attack3':8,
         'skill1':8,'skill2':8,'ultimate':10,'dash':6,'hit':4,'death':8}
HEROES=['blade','gunner','wizard','ninja','mechanic','tank','robot','dev']
PALETTE={'blade':(255,111,34),'gunner':(255,186,70),'wizard':(157,100,255),
         'ninja':(255,104,180),'mechanic':(255,151,52),'tank':(255,195,63),
         'robot':(62,233,255),'dev':(88,243,136)}
CENTER={'blade':30,'gunner':29,'wizard':28,'ninja':32,'mechanic':30,'tank':33,'robot':22,'dev':22}
LEG_RUNS={'blade':[(21,26),(33,38)],'gunner':[(20,26),(32,37)],
          'wizard':[(19,24),(30,35)],'ninja':[(23,29),(35,41)],
          'mechanic':[(21,27),(33,39)],'tank':[(18,25),(33,40)]}
HUMANS={'blade','gunner','ninja','mechanic','tank'}


def recolor_evolved(im,hero):
    arr=np.asarray(im.convert('RGBA')).copy()
    for y in range(arr.shape[0]):
      for x in range(arr.shape[1]):
        r,g,b,a=map(int,arr[y,x]);
        if a<25: continue
        mx=max(r,g,b); mn=min(r,g,b)
        if mx<50:continue  # keep ink outlines
        hh,s,v=colorsys.rgb_to_hsv(r/255,g/255,b/255)
        deg=hh*360
        is_skin=(r>155 and g>95 and b>65 and 10<deg<53 and s<0.58)
        if is_skin:continue
        tgt=None
        if hero=='blade':
            if 265<deg<345 and s>.18: tgt=(.77,.12,max(v*.98,.28))
            elif (0<=deg<62 or deg>348) and s>.62: tgt=(.13,.87,v)
        elif hero=='gunner':
            if ((deg<55 or deg>340) and s>.25): tgt=(.73,.15,v*.9)
            elif 55<=deg<80 and s>.3:tgt=(.12,.7,v)
        elif hero=='wizard':
            if 255<deg<340 and s>.2:tgt=(.75,.17,min(1,v*1.21))
            elif 175<deg<235 and s>.2:tgt=(.92,.8,v)
        elif hero=='ninja':
            if 180<deg<250 and s>.2:tgt=(.76,.70,v)
            elif deg>315 or deg<15: tgt=(.91,.83,v)
        elif hero=='mechanic':
            if deg<55 and s>.30:tgt=(.56,.65,max(.24,v*.85))
            elif 175<deg<225 and s>.4:tgt=(.47,.84,v)
        elif hero=='tank':
            if 180<deg<290 and s>.08:tgt=(.78,min(.76,s+.25),v*.88)
            elif 28<deg<70 and s>.45:tgt=(.03,.86,v)
            elif (deg<28 or deg>325) and s>.40:tgt=(.89,.86,v*.90)
        elif hero=='robot':
            if 170<deg<230 and s>.30:tgt=(.82,.86,v)
            elif deg<25 or deg>335:tgt=(.91,.90,v)
        elif hero=='dev':
            if 180<deg<260 and s>.25:tgt=(.35,.78,v*.93)
        if tgt:
            R,G,B=colorsys.hsv_to_rgb(*tgt)
            arr[y,x,:3]=[round(255*R),round(255*G),round(255*B)]
    return Image.fromarray(arr,'RGBA')


def animate_feet(base,hero,action,frame):
    # Replace only the 4 bottom rows of the two boots, moving their position independently.
    if hero in {'robot','dev'}:
        return track_cycle(base,hero,frame,action)
    if hero=='wizard':
        return base
    if hero not in LEG_RUNS:return base
    h,w=base.height,base.width
    if action not in ['walk','run']:return base
    # phases keep opposite foot in contact while the other is lifted
    s=[-2,-1,0,2,2,1,0,-2][frame%8]
    lift=[0,1,1,0,0,1,1,0][frame%8]
    if action=='run':s=round(s*1.65);lift=min(2,lift+((frame%4)==2))
    shifts=[(s,-lift),(-s,-(lift if frame%8>=4 else 0))]
    out=base.copy()
    # Use original boot pixel regions, preserving original palette, not invented robotic legs.
    for (lo,hi),(dx,dy) in zip(LEG_RUNS[hero],shifts):
        x1=max(0,lo-1); x2=min(w,hi+2)
        top=h-4
        patch=base.crop((x1,top,x2,h))
        ImageDraw.Draw(out).rectangle((x1,top,x2-1,h-1),fill=(0,0,0,0))
        dest=(x1+dx,top+dy)
        # foot can lift but remains connected to leg by a dark outline pixel below torso
        out.alpha_composite(patch,dest)
        if dx and hero=='tank':
            # bright knee/boot clasp moving with both armored feet
            px=x1+dx+(x2-x1)//2
            yy=top+dy+1
            ImageDraw.Draw(out).point((px,yy),fill=(232,163,67,255))
    return out


def track_cycle(base,hero,frame,action):
    if action not in ['walk','run']:return base
    out=base.copy();d=ImageDraw.Draw(out)
    y=base.height-5
    if hero=='robot':
        for x in range(12,base.width-7,5):
            if (x//5+frame)%3==0:
                d.line((x,y,x+2,y), fill=(53,174,198,255),width=1)
    else:
        for x in [8,base.width-14]:
            d.arc((x,y-7,x+8,y+1), start=frame*45, end=frame*45+85,fill=(75,226,249,255),width=1)
    return out


def stable_master(master,hero,action,i):
    # Preserve head/body silhouette 1:1 for all normal actions.
    base=animate_feet(master,hero,action,i)
    # one-pixel cloth sway, only when moving; never scale the whole character
    if action in ('walk','run') and hero in ('blade','gunner','ninja','mechanic','tank'):
        out=base.copy();w,h=base.size
        # a single trailing pixel acts as lightweight scarf or cape animation
        tail_color=PALETTE[hero]
        if hero in ('blade','ninja','tank','gunner'):
            x=5 if hero!='tank' else 8
            yy=round(h*.72)+(i%3)
            ImageDraw.Draw(out).rectangle((x,yy,x+2,yy),fill=(*tail_color,235))
        return out
    return base


def draw_star(d,x,y,color,r=4):
    d.line((x-r,y,x+r,y),fill=color,width=1)
    d.line((x,y-r,x,y+r),fill=color,width=1)
    if r>=4:d.point((x-r+1,y-r+1),fill=color);d.point((x+r-1,y+r-1),fill=color)


def effects(canvas,hero,action,i,origin_x,origin_y,sourcew,sourceh,accent):
    # All effects are restrained to the local body region; gameplay owns large VFX.
    d=ImageDraw.Draw(canvas)
    rng=random.Random(7000+HEROES.index(hero)*900+list(ACTIONS).index(action)*81+i)
    center=(origin_x+round(sourcew*.56),origin_y+round(sourceh*.64))
    cx,cy=center
    bright=(*accent,255)
    pale=tuple(min(255,int(q*.65+255*.35)) for q in accent)+(255,)
    dim=(*accent,170)
    if action in ('attack1','attack2','attack3'):
        # gunner/wizard/robot/dev use charge/recoil, melee fighters have slash arcs
        if hero in ('gunner','wizard','robot','dev'):
            x=origin_x+sourcew-1; y=origin_y+round(sourceh*.63)
            if hero=='wizard': x=origin_x+sourcew-7;y=origin_y+round(sourceh*.56)
            if i in (2,3,4,5):
                r=3+(i%2)*2
                d.ellipse((x-r,y-r,x+r,y+r),fill=dim,outline=bright)
                draw_star(d,x+r+1,y,pale,3)
        elif hero=='mechanic':
            if 2<=i<=5:
                d.arc((cx-19,cy-14,cx+25,cy+16),-80+(i-2)*20,110+(i-2)*20,fill=dim,width=2)
                draw_star(d,cx+19,cy+5,pale,3)
        else:
            if 1<=i<=6:
                offset=(i-1)*19
                rect=(cx-17,cy-18,cx+23,cy+15)
                if action=='attack1':
                    d.arc(rect,-95+offset,25+offset,fill=bright,width=2)
                elif action=='attack2':
                    d.line((cx-13,cy-9,cx+18,cy+9),fill=dim,width=2)
                    d.line((cx-11,cy+11,cx+18,cy-11),fill=bright,width=1)
                else:
                    d.arc(rect,(i*32)%360,(i*32)%360+210,fill=dim,width=2)
    if action=='skill1':
        if hero in ('blade','ninja','tank'):
            if 1<=i<=6:
                # speed-line dash, not the full movement VFX
                for off in (0,6,12):
                    d.line((origin_x-9+off,cy-5+off%2,origin_x+off,cy-5+off%2),fill=dim,width=1)
        else:
            if i in (3,4,5):
                draw_star(d,cx+17,cy-13,pale,4)
    if action=='skill2':
        if 1<=i<=6:
            if hero=='blade':
                for side in (-1,1):
                    hx=cx+side*11;hy=cy+4
                    d.line((hx,hy,hx+side*3,hy-7,hx+side*7,hy-10,hx+side*6,hy-14),fill=(186,116,255,255),width=2)
            else:
                for side in (-1,1):draw_star(d,cx+side*19,cy-3,pale,3)
    if action=='ultimate':
        if i in range(2,9):
            rad=15+int(3*math.sin(i*.7))
            d.arc((cx-rad,cy-rad,cx+rad,cy+rad),i*17,i*17+175,fill=dim,width=1)
            if i%2==0:draw_star(d,cx+rad,cy-7,pale,3)
    if action=='dash':
        if 1<=i<=4:
            for k in range(3):
                dx=-13-k*6
                d.line((cx+dx,cy+7+k*3,cx+dx+6,cy+7+k*3),fill=dim,width=1)
    if action=='hit' and i in (1,2):
        draw_star(d,cx+sourcew//3,cy-9,(255,230,230,255),3)
    if action=='entrance' and i<6:
        for k in range(2):
            x=cx+rng.randrange(-19,21);y=cy+rng.randrange(-25,18)
            d.point((x,y),fill=pale)


def overlay_hammer(canvas,hero,action,i,ox,oy,master):
    if hero!='tank' or (action=='death' and i>=3):return
    d=ImageDraw.Draw(canvas)
    x=ox+master.width-11;y=oy+round(master.height*.62)
    # short, deliberately compact hammer; length never touches cell edges
    ang=(-.15 if action not in ('attack1','attack2','attack3') else (-.65+i*.18))
    x2=round(x+9*math.cos(ang));y2=round(y-16+8*math.sin(ang))
    d.line((x,y,x2,y2),fill=(33,25,39,255),width=3)
    d.line((x+1,y,x2+1,y2),fill=(182,122,48,255),width=1)
    d.rectangle((x2-9,y2-5,x2+10,y2+5),fill=(52,56,78,255),outline=(245,179,64,255),width=2)
    d.rectangle((x2-6,y2-3,x2+7,y2+2),fill=(125,132,155,255))
    d.line((x2-4,y2-3,x2+4,y2-3),fill=(211,222,235,255),width=1)


def overlay_robot_cannon(canvas,hero,action,i,ox,oy,master):
    if hero!='robot':return
    d=ImageDraw.Draw(canvas)
    x=ox+master.width-2;y=oy+round(master.height*.62)
    d.rectangle((x-3,y-2,x+6,y+4),fill=(49,50,69,255),outline=(13,12,27,255))
    d.rectangle((x+4,y,x+6,y+2),fill=(58,222,255,255))
    if action.startswith('attack') and 2<=i<=5:
        d.ellipse((x+6,y-2,x+11,y+4),fill=(111,250,255,200))


def action_frame(master,hero,action,i):
    accent=PALETTE[hero]
    fr=Image.new('RGBA',(W,H),(0,0,0,0))
    work=stable_master(master,hero,action,i).copy()  # must not mutate reusable master during entrance
    # Only entrance/death deliberately alter silhouette visibility/height.
    if action=='entrance' and i<4:
        a=work.getchannel('A')
        # reveal from bottom up (scanline materialization) rather than scaling the hero
        cutoff=round(work.height*(.78-i*.20))
        ah=Image.new('L',work.size,0)
        ImageDraw.Draw(ah).rectangle((0,cutoff,work.width,work.height),fill=255)
        a=Image.fromarray((np.asarray(a,dtype=np.uint16)*np.asarray(ah,dtype=np.uint16)//255).astype('uint8'))
        work.putalpha(a)
    if action=='death':
        if i>=3:
            # fall/collapse; only death permits changing vertical extent
            out=Image.new('RGBA',work.size,(0,0,0,0))
            if i==3:out.alpha_composite(work,(0,1))
            elif i<7:
                newh=max(7,round(work.height*(1-.17*(i-2))))
                work=work.resize((work.width,newh),Image.Resampling.NEAREST)
            else:
                work=work.resize((work.width,5),Image.Resampling.NEAREST)
    # Kael barehanded Tempest: remove blade pixels at lower far left; keep scarf body
    if hero=='blade' and action=='skill2':
        a=np.array(work)
        # sword blade is mostly pale neutral near left and lower third; mask only silver pixels
        for y in range(round(master.height*.65),master.height):
            for x in range(0,round(master.width*.45)):
                r,g,b,al=a[y,x]
                if al>0 and r>140 and g>130 and b>125 and abs(int(r)-int(g))<45:
                    a[y,x,3]=0
        work=Image.fromarray(a,'RGBA')
    # Body pivot lock. All non-death poses identical master scale and top/feet alignment.
    anchor=CENTER[hero]
    ox=FOOT_X-anchor;oy=FOOT_Y-work.height+1
    if action=='death':oy=FOOT_Y-work.height+1
    fr.alpha_composite(work,(ox,oy))
    overlay_hammer(fr,hero,action,i,ox,oy,master)
    overlay_robot_cannon(fr,hero,action,i,ox,oy,master)
    effects(fr,hero,action,i,ox,oy,work.width,work.height,accent)
    return fr


def generate():
    manifest={"version":"6.0","style":"Soul Knight-inspired 2-facing large-head chibi", "source":"redesigned 8-hero master roster", "frame":{"width":W,"height":H,"cols":10,"rows":13,"foot":[FOOT_X,FOOT_Y]},"animations":ACTIONS,"heroes":{}}
    for hero in HEROES:
        base=Image.open(MASTERS/f'{hero}.png').convert('RGBA')
        for skin in ('base','evolved'):
            src=base if skin=='base' else recolor_evolved(base,hero)
            if skin=='evolved':src.save(MASTERS/f'{hero}-evolved.png')
            atlas=Image.new('RGBA',(W*10,H*len(ACTIONS)),(0,0,0,0))
            for row,(action,count) in enumerate(ACTIONS.items()):
                for col in range(count):
                    fr=action_frame(src,hero,action,col)
                    atlas.alpha_composite(fr,(col*W,row*H))
            atlas.save(OUT/f'{hero}-{skin}-right.png',optimize=True)
        manifest['heroes'][hero]={"heroHeight":base.height,"visualDirection":"right 15° / left mirrored", "bodyAnchor":CENTER[hero],"base":f"{hero}-base-right.png","evolved":f"{hero}-evolved-right.png"}
        print(hero,base.size)
    (OUT/'atlas-metadata.json').write_text(json.dumps(manifest,indent=2))
    return manifest

if __name__=='__main__':
    generate()
