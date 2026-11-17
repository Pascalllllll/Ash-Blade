#!/usr/bin/env python3
"""Deterministically rebuild ASHBLADE sprite atlases from project RLE pixel art.
Does not use image recognition. Original poses reused; unique entry/ultimate/death
microanimations are composed at pixel level and gameplay handles the major VFX.
"""
import json, re, math, random, colorsys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
ART=json.loads((ROOT/'tools/original-art.json').read_text())
OUT=ROOT/'art/sprites'
OUT.mkdir(parents=True,exist_ok=True)
W,H=128,96
ANCHOR=(64,95)
COUNT={'entrance':8,'idle':8,'walk':8,'run':8,'attack1':8,'attack2':8,'attack3':8,'skill1':8,'skill2':8,'ultimate':10,'dash':6,'hit':4,'death':8}
DUR={'entrance':105,'idle':120,'walk':105,'run':75,'attack1':57,'attack2':57,'attack3':65,'skill1':80,'skill2':80,'ultimate':90,'dash':35,'hit':105,'death':155}
ACCENTS={'BLADE':'#ff6a2b','GUNNER':'#ffd447','WIZARD':'#b48cff','NINJA':'#ff7ab8','MECHANIC':'#ff9a3c','TANK':'#ffc54a','ROBOT':'#62efff','DEV':'#39ff6a'}
SECONDARY={'BLADE':'#ffcb69','GUNNER':'#fff6e0','WIZARD':'#62efff','NINJA':'#fff0fa','MECHANIC':'#62efff','TANK':'#fff4cd','ROBOT':'#ff4545','DEV':'#62efff'}
DISPLAY={'BLADE':'Kael','GUNNER':'Vega Hale','WIZARD':'Morrow','NINJA':'Rin','MECHANIC':'Rivet','TANK':'Grom','ROBOT':'Unit-7','DEV':'The Dev'}
frames_meta={}

def dec(s,w,h):
    # Original source stores a single unicode letter + optional ASCII run count.
    raw=''.join(ch*int(n or 1) for ch,n in re.findall(r'([^0-9])([0-9]*)',s))
    if len(raw)!=w*h:raise ValueError(f'invalid frame {len(raw)} != {w*h}')
    return raw

def render(d,name,i,evo):
    seq=d['frames'][name]
    j=min(len(seq)-1,int(i*len(seq)/COUNT.get(name,len(seq)))) if COUNT.get(name) else i%len(seq)
    text=dec(seq[j],d['w'],d['h'])
    cmap={c:tuple(bytes.fromhex(h[1:]))+(255,) for c,h in zip(d['sym'],d.get('evo', d['palette']) if evo else d['palette'])}
    buf=bytearray(d['w']*d['h']*4)
    for k,c in enumerate(text):
        if c=='.':continue
        col=cmap[c]
        buf[k*4:k*4+4]=bytes(col)
    im=Image.frombytes('RGBA',(d['w'],d['h']),bytes(buf))
    if evo and 'evo' not in d:
        # Kael's current source has no evolved palette; construct one while preserving skin.
        pix=im.load()
        for yy in range(im.height):
          for xx in range(im.width):
            r,g,b,a=pix[xx,yy]
            if not a:continue
            h,s,v=colorsys.rgb_to_hsv(r/255,g/255,b/255)
            if 0.70<h<0.96 and s>.25: h=(h+.04)%1; s=min(1,s*1.2);v=min(1,v*1.10)
            elif (.01<h<.12) and s>.62 and v>.23: h=.975;s=min(1,s*1.18);v=min(1,v*1.08)
            elif s<.18 and v>.65: h=.12;s=.18;v=min(1,v*1.08)
            rr,gg,bb=colorsys.hsv_to_rgb(h,s,v)
            pix[xx,yy]=round(rr*255),round(gg*255),round(bb*255),a
    return im

def rgba(c):return tuple(bytes.fromhex(c[1:]))+(255,)
def nearest_base(d,name,i,evo):
    f=d['frames'].get(name)
    if f: return render(d,name,i,evo)
    if name=='attack3': return render(d,'attack2',min(i,len(d['frames']['attack2'])-1),evo)
    return render(d,'idle',i,evo)

def sfx(f,kind,hero,i,count,evo):
    """Small pixel effects only; big effects are generated separately by game."""
    p=i/max(count-1,1); d=ImageDraw.Draw(f,'RGBA'); c=rgba(ACCENTS[hero]); c2=rgba(SECONDARY[hero]);
    # all effects are placed in source coordinates and aligned relative to the hero's own center
    cx=f.width/2; cy=f.height*.63
    rng=random.Random(sum(map(ord,hero+kind))+i*3449)
    def dot(x,y,col,sz=1):d.rectangle((int(x),int(y),int(x+sz-1),int(y+sz-1)),fill=col)
    if kind=='ultimate':
        # strong local windup -> character-specific release -> recovery
        n=int(3+10*math.sin(math.pi*p)**2)
        for k in range(n):
            a=2*math.pi*k/max(n,1) + i*.36
            r=13+5*math.sin(math.pi*p)
            x=cx+math.cos(a)*r;y=cy+math.sin(a)*r*.78
            dot(x,y,c2 if k%4==0 else c,2 if k%3==0 else 1)
        if hero=='BLADE':
            for k in range(4):dot(cx+9+k*2,cy-11+k,c,2)
        elif hero=='GUNNER':
            for k in range(3): dot(cx+16+k*3,cy-7+k%2,c2,2)
        elif hero=='WIZARD':
            for k in range(6):dot(cx-10+k*4,cy-23-(k%2)*2,c2)
        elif hero=='NINJA':
            for k in range(5):dot(cx-12+k*6,cy-15+(k%3)*3,c,2)
        elif hero=='MECHANIC':
            for k in range(4):dot(cx+8+k*2,cy+3-(k%2)*5,c,2)
        elif hero=='TANK':
            for k in range(5):dot(cx-9+k*4,cy-16,c2,2)
        elif hero=='ROBOT':
            for k in range(4):dot(cx+16+k*2,cy-14+k,c2,1)
        else:
            for k in range(5):dot(cx-9+((k*7+i*5)%20),cy-11-(k*2),c if k%2 else c2,2)
    elif kind=='attack3' and hero in ('BLADE','NINJA','MECHANIC','TANK'):
        if 0.2<p<0.85:
            # Small curved slash trail; not the gameplay hitbox ring.
            for k in range(14):
                a=-1+2.4*(k/13)+i*.3
                x=cx+math.cos(a)*17;y=cy+math.sin(a)*9
                dot(x,y,c if k%3 else c2)
    elif kind in ('skill1','skill2'):
        if .18<p<.84:
            n=4 if kind=='skill1' else 7
            for k in range(n):
                a=(k*2*math.pi/n)+i*.35
                r=9 if kind=='skill1' else 14
                dot(cx+math.cos(a)*r,cy+math.sin(a)*r*.8,c if k%2 else c2)
    elif kind=='death' and i>=6:
        # Final dissolution respects the character-specific death FX drawn in deaths.js.
        n=8 if i==6 else 14
        for k in range(n):
            x=cx+rng.randint(-17,17);y=cy+rng.randint(-14,11)
            dot(x,y,c if k%2 else c2)
    return f

# uniform per-hero scale from the source idle, NOT from an individual attack frame
all_entries={}
for hero,d in ART.items():
    src0=render(d,'idle',0,False)
    bb=src0.getbbox(); height=bb[3]-bb[1]
    # 54 visible pixels for all heroes, Grom visibly 60; preserve nearest-neighbor pixel clusters
    target_height=60 if hero=='TANK' else 54
    scale=target_height/height
    center=(bb[0]+bb[2])/2
    hero_data={}
    for evo in (False,True):
        out=Image.new('RGBA',(W*10,H*len(COUNT)),(0,0,0,0))
        for row,(action,n) in enumerate(COUNT.items()):
            for i in range(n):
                original_action=action
                if action=='entrance':
                    original_action='idle' if hero not in ('BLADE','GUNNER','TANK') else 'run'
                elif action=='ultimate':
                    original_action={'BLADE':'attack3','NINJA':'attack2','GUNNER':'attack1','WIZARD':'skill','MECHANIC':'skill','TANK':'skill','ROBOT':'skill','DEV':'skill'}.get(hero,'skill')
                elif action in ('skill1','skill2'):
                    original_action=action if action in d['frames'] else 'skill'
                elif action=='attack3':
                    original_action='attack3' if 'attack3' in d['frames'] else ('attack2' if hero in ('BLADE','NINJA','MECHANIC','TANK') else 'attack1')
                elif action=='death':original_action='death'
                elif action not in d['frames']:original_action='idle'
                n0=len(d['frames'][original_action]); j=min(n0-1,int(i*n0/n))
                src=render(d,original_action,j,evo)
                # Some hand-drawn reference sheets contain effect-only / empty frames;
                # keep the hero's silhouette present rather than letting gameplay vanish.
                bb0=src.getbbox()
                if action not in ('death','entrance') and (bb0 is None or bb0[3]-bb0[1]<.58*height):
                    under=render(d,'idle',0,evo)
                    under.alpha_composite(src)
                    src=under
                # Option A: keep the frontal idle head during locomotion, while retaining
                # the original animated walking legs and lower-body running frames.
                if action in ('walk','run'):
                    frontal=render(d,'idle',min(len(d['frames']['idle'])-1,int(i*len(d['frames']['idle'])/n)),evo)
                    cut=round(d['h']*.53)
                    ImageDraw.Draw(src).rectangle((0,0,d['w'],cut),fill=(0,0,0,0))
                    src.alpha_composite(frontal.crop((0,0,d['w'],cut+1)),(0,0))
                # common scaling; full frame composed into generous fully transparent canvas
                nw=max(1,round(src.width*scale));nh=max(1,round(src.height*scale))
                src=src.resize((nw,nh),Image.Resampling.NEAREST)
                cell=Image.new('RGBA',(W,H),(0,0,0,0))
                x=round(ANCHOR[0]-center*scale)
                y=ANCHOR[1]-nh+1
                if action=='entrance':
                    # Match each hero's existing cinematic type without duplicating big VFX.
                    p=i/max(1,n-1)
                    if hero in ('BLADE','TANK'):
                        y-=int(25*(1-p)**2)
                        if i in (5,6):src=src.resize((round(nw*(1+(.06 if i==5 else .03))),round(nh*(.93 if i==5 else .97))),Image.Resampling.NEAREST)
                    elif hero=='GUNNER':x-=int(22*(1-p)**2)
                    elif hero=='WIZARD':
                        if i<4:
                            # Rising from portal floor; segment progressively revealed
                            a=src.copy(); a.putalpha(src.getchannel('A'))
                            erase_h=int(nh*(.85-i*.22));
                            if erase_h>0: ImageDraw.Draw(a).rectangle((0,0,nw,erase_h),fill=(0,0,0,0))
                            src=a
                    elif hero=='NINJA':
                        if i<3:
                            # Thin, staggered fragments around reappearing samurai
                            a=src.copy(); dr=ImageDraw.Draw(a)
                            for yy in range(0,nh,4):
                                if (yy//4+i)%3:dr.rectangle((0,yy,nw,yy+2),fill=(0,0,0,0))
                            src=a
                    elif hero=='MECHANIC':
                        if i<4:src.putalpha(src.getchannel('A').point(lambda v: 0 if v and i <2 else v))
                    elif hero=='ROBOT':
                        if i<5:
                            a=src.copy();dr=ImageDraw.Draw(a)
                            for yy in range(nh):
                                if (yy+i)%5>min(i,3):dr.line((0,yy,nw,yy),fill=(0,0,0,0))
                            src=a
                    elif hero=='DEV':
                        if i<5:
                            a=src.copy();dr=ImageDraw.Draw(a)
                            for yy in range(nh):
                                if (yy*7+i*13)%11>i+1:dr.line((0,yy,nw,yy),fill=(0,0,0,0))
                            src=a
                elif action=='death' and i==7:
                    # Keep the body in the supplied 6-frame sequence until dissolution at the end.
                    src.putalpha(src.getchannel('A').point(lambda v: 0 if v else 0))
                cell.alpha_composite(src,(x,y))
                if action in ('ultimate','attack3','skill1','skill2','death'):
                    cell=sfx(cell,action,hero,i,n,evo)
                out.alpha_composite(cell,(i*W,row*H))
                if i==0:hero_data[action]={'row':row,'frames':n,'duration_ms':DUR[action], 'loop':action in ('idle','walk','run')}
        out_path=OUT/f'{hero.lower()}-{"evolved" if evo else "base"}.png'
        out.save(out_path,optimize=True)
    all_entries[hero]={'name':DISPLAY[hero],'fileBase':f'art/sprites/{hero.lower()}-base.png','fileEvolved':f'art/sprites/{hero.lower()}-evolved.png',
        'sourceSize':[d['w'],d['h']], 'visualHeight':target_height,'sourceIdleBBox':list(bb), 'animations':hero_data}

manifest={'version':'front-facing-v1','layout':'ten columns (unused cells transparent), one row per action in insertion order','frame':{'width':W,'height':H,'anchor':list(ANCHOR),'pixelDensity':3,'facing':'front'},'heroOrder':list(ART),'heroes':all_entries}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2))
print('atlases generated',sum(p.stat().st_size for p in OUT.glob('*.png'))//1024,'KiB')
for k,v in all_entries.items():print(k,v['visualHeight'],len(v['animations']))
