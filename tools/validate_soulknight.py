#!/usr/bin/env python3
"""ASHBLADE SoulKnight V6 atlas validator. Standard library only; no Pillow required."""
from pathlib import Path
import struct,zlib,sys,json
BASE=Path(__file__).resolve().parent.parent/'art/sprites/soft-facing'
IDS=('blade','gunner','wizard','ninja','mechanic','tank','robot','dev')
ACT={'entrance':8,'idle':8,'walk':8,'run':8,'attack1':8,'attack2':8,'attack3':8,
     'skill1':8,'skill2':8,'ultimate':10,'dash':6,'hit':4,'death':8}
W,H,COLS=120,96,10

def paeth(a,b,c):
 p=a+b-c;pa=abs(p-a);pb=abs(p-b);pc=abs(p-c)
 return a if pa<=pb and pa<=pc else b if pb<=pc else c

def rgba_rows(path):
 b=path.read_bytes()
 if b[:8]!=bytes.fromhex('89504e470d0a1a0a'):raise ValueError('not PNG')
 at=8;packed=[];dims=None
 while at<len(b):
  sz=int.from_bytes(b[at:at+4],'big');kind=b[at+4:at+8];part=b[at+8:at+8+sz];at+=12+sz
  if kind==b'IHDR':
   ww,hh,depth,col,compression,method,interlace=struct.unpack('>IIBBBBB',part)
   if (ww,hh,depth,col,interlace)!=(W*COLS,H*len(ACT),8,6,0):raise ValueError('invalid PNG geometry or type')
   dims=(ww,hh)
  elif kind==b'IDAT':packed.append(part)
  elif kind==b'IEND':break
 if not dims:raise ValueError('missing IHDR')
 raw=zlib.decompress(b''.join(packed));stride=dims[0]*4;pos=0;prev=bytearray(stride)
 for y in range(dims[1]):
  filt=raw[pos];pos+=1
  row=bytearray(raw[pos:pos+stride]);pos+=stride
  if filt not in range(5):raise ValueError('unsupported PNG filter')
  for i in range(stride):
   left=row[i-4] if i>=4 else 0;up=prev[i];upperleft=prev[i-4] if i>=4 else 0
   if filt==1:row[i]=(row[i]+left)&255
   elif filt==2:row[i]=(row[i]+up)&255
   elif filt==3:row[i]=(row[i]+((left+up)//2))&255
   elif filt==4:row[i]=(row[i]+paeth(left,up,upperleft))&255
  yield y,row
  prev=row

def inspect(path):
 occupied={};edge_viol=[]
 for y,row in rgba_rows(path):
  action_index=y//H;within_y=y%H
  count=list(ACT.values())[action_index]
  for frame in range(count):
   x0=frame*W
   aa=row[x0*4+3:(x0+W)*4:4]
   if any(aa):
    occupied[(action_index,frame)]=True
    if within_y in (0,H-1) or aa[0] or aa[-1]:edge_viol.append((action_index,frame,within_y))
 return len(occupied),len(edge_viol),edge_viol[:2]

def main():
 expected=sum(ACT.values());n=0;fail=[]
 for hero in IDS:
  for skin in ('base','evolved'):
   path=BASE/f'{hero}-{skin}-right.png'
   try:
    count,clipped,details=inspect(path)
    if count!=expected or clipped:fail.append((path.name,count,clipped,details))
    else:n+=count;print(f'[OK] {path.name}: {count} opaque frames, transparent edges')
   except Exception as e:fail.append((path.name,str(e)))
 print('[TOTAL]',n,'of',expected*len(IDS)*2,'valid frames')
 if fail:
  for item in fail:print('[ERROR]',item)
  return 1
 print('[OK] 8 heroes × 2 skins × 100 populated frames = 1,600 validated; no Pillow required')
 return 0

if __name__=='__main__':sys.exit(main())
