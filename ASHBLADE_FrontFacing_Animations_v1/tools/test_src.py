import json,re
from PIL import Image
D=json.load(open('/mnt/data/ashblade_front_patch/tools/original-art.json'))
for ch in ['BLADE','GUNNER','TANK','DEV']:
 d=D[ch];s=d['frames']['idle'][0]; raw=''.join(c*int(n or 1) for c,n in re.findall(r'([^0-9])([0-9]*)',s))
 w,h=d['w'],d['h'];im=Image.new('RGBA',(w,h)); px=[]
 color={c:v for c,v in zip(d['sym'],d['palette'])}
 for i,c in enumerate(raw):
  if c!='.':im.putpixel((i%w,i//w),tuple(bytes.fromhex(color[c][1:]))+(255,))
 im.resize((w*6,h*6),Image.Resampling.NEAREST).save('/mnt/data/ashblade_front_patch/tools/'+ch+'.png')
