from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
P=Path(__file__).resolve().parents[1];art=P/'art/sprites/motion-v7';prev=P/'previews';prev.mkdir(exist_ok=True)
W,H=120,96
heroes=['blade','gunner','wizard','ninja','mechanic','tank','robot','dev']
names=['Kael','Vega Hale','Morrow','Rin','Rivet','Grom','Unit-7','The Dev']
act={'idle':0,'walk':1,'run':2,'attack1':3,'attack2':4,'attack3':5}

# Asset transparent, 16 idle frames in 4x4 120×96 tiles
im=Image.open(art/'blade-base-motion-v7.png').convert('RGBA')
sheet=Image.new('RGBA',(4*W,4*H),(0,0,0,0))
for i in range(16):sheet.alpha_composite(im.crop((i*W,0,(i+1)*W,H)),((i%4)*W,(i//4)*H))
sheet.save(prev/'KAEL_IDLE_V7_16FRAMES_TRANSPARENT.png')

# overview: four idle poses per hero. Dark background for visibility, all hero heights aligned.
cols,rows=4,8
scale=3
cw,ch=140*scale,116*scale
panel=Image.new('RGB',(cols*cw,rows*ch),(17,15,30));d=ImageDraw.Draw(panel)
for j,(hero,label) in enumerate(zip(heroes,names)):
    img=Image.open(art/f'{hero}-base-motion-v7.png').convert('RGBA')
    for k,i in enumerate((0,4,9,11)):
        fr=img.crop((i*W,0,(i+1)*W,H)).resize((W*scale,H*scale),Image.Resampling.NEAREST)
        x=k*cw+int((cw-W*scale)/2);y=j*ch+32
        panel.paste(fr,(x,y),fr)
        d.text((k*cw+14,j*ch+8),label+' • '+str(i+1).zfill(2),fill=(232,220,255))
panel.save(prev/'ASHBLADE_V7_EIGHT_HEROES_IDLE_PREVIEW.jpg',quality=94)

# Action 3 rows × 12 frames for Kael on dark background
cw,ch=135*3,105*3
out=Image.new('RGB',(cw*6,ch*6),(17,15,30))
for a_idx,action in enumerate(('attack1','attack2','attack3')):
    img=Image.open(art/'blade-base-motion-v7.png').convert('RGBA')
    row=act[action]
    for k in range(12):
        fr=img.crop((k*W,row*H,(k+1)*W,(row+1)*H)).resize((W*3,H*3),Image.Resampling.NEAREST)
        ix=k%6;iy=(k//6)+2*a_idx
        out.paste(fr,(ix*cw+12,iy*ch+15),fr)
out.save(prev/'KAEL_V7_ATTACK_COMBOS_CONTACT.jpg',quality=94)

# Alpha clean size comparison last Kael entrance against current normal idle
enter=Image.open(art/'kael-entrance-v7-scaled-54px.png').convert('RGBA')
normal=Image.open(art/'blade-base-motion-v7.png').convert('RGBA')
last=enter.crop((11*W,1*H,12*W,2*H))
idle=normal.crop((0,0,W,H))
comp=Image.new('RGB',(2*W*5, H*5),(20,18,32))
for j,fr in enumerate((last,idle)):
    fr=fr.resize((W*5,H*5),Image.Resampling.NEAREST)
    comp.paste(fr,(j*W*5,0),fr)
comp.save(prev/'KAEL_ENTRANCE_V7_VS_IDLE_HEIGHT.jpg',quality=92)

# All 8 idle GIFs one group with transparent sprites on dark panel (no checker baked in assets)
frames=[]
for i in range(16):
    fi=Image.new('RGBA',(4*160,2*130),(18,17,29,255))
    for j,hero in enumerate(heroes):
        src=Image.open(art/f'{hero}-base-motion-v7.png').convert('RGBA')
        fr=src.crop((i*W,0,(i+1)*W,H)).resize((120,96),Image.Resampling.NEAREST)
        x=(j%4)*160+20; y=(j//4)*130+4
        fi.alpha_composite(fr,(x,y))
        ImageDraw.Draw(fi).text(((j%4)*160+38,(j//4)*130+103),names[j],fill=(233,217,251,255))
    frames.append(fi.convert('P',palette=Image.Palette.ADAPTIVE,colors=128))
frames[0].save(prev/'ASHBLADE_V7_ALL_HEROES_IDLE.gif',save_all=True,append_images=frames[1:],duration=120,loop=0,optimize=False,disposal=2)
print('Previews ready')
