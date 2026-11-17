#!/usr/bin/env python3
"""Kael V5 PNG validator, stdlib only (no Pillow required)."""
from pathlib import Path
import zlib,struct,json,sys
ROOT=Path(__file__).resolve().parents[1]
DIR=ROOT/'art/sprites/soft-facing'
COUNTS=[8,8,8,8,8,8,8,8,8,10,6,4,8]
W,H=120,96

def unfilter_png(path):
    f=path.read_bytes()
    if not f.startswith(b'\x89PNG\r\n\x1a\n'):raise ValueError('invalid PNG signature')
    offs=8; idat=[];size=None
    while offs<len(f):
        n=struct.unpack('>I',f[offs:offs+4])[0]; typ=f[offs+4:offs+8]
        data=f[offs+8:offs+8+n];offs+=12+n
        if typ==b'IHDR':
            w,h,bd,ct,comp,fil,inter=struct.unpack('>IIBBBBB',data)
            if (w,h,bd,ct,inter)!=(W*10,H*13,8,6,0):raise ValueError('wrong PNG format/dimensions')
            size=(w,h)
        if typ==b'IDAT':idat.append(data)
        if typ==b'IEND':break
    if size is None:raise ValueError('missing PNG IHDR')
    w,h=size;raw=zlib.decompress(b''.join(idat));stride=4*w
    prev=bytearray(stride); pos=0
    for y in range(h):
        typ=raw[pos];pos+=1
        line=bytearray(raw[pos:pos+stride]);pos+=stride
        if typ not in (0,1,2,3,4):raise ValueError('Unsupported filter: '+str(typ))
        if typ==1:
            for j in range(4,stride):line[j]=(line[j]+line[j-4])&255
        elif typ==2:
            for j in range(stride):line[j]=(line[j]+prev[j])&255
        elif typ==3:
            for j in range(stride):line[j]=(line[j]+((line[j-4] if j>=4 else 0)+prev[j])//2)&255
        elif typ==4:
            for j in range(stride):
                a=line[j-4] if j>=4 else 0;b=prev[j];c=prev[j-4] if j>=4 else 0
                p=a+b-c;pa=abs(p-a);pb=abs(p-b);pc=abs(p-c)
                pred=a if pa<=pb and pa<=pc else b if pb<=pc else c
                line[j]=(line[j]+pred)&255
        prev=line
        yield y,line

def validate(path):
    frames=[{'count':0,'top':H,'bottom':-1,'left':W,'right':-1,'touch':False} for _ in range(13*10)]
    for yy,line in unfilter_png(path):
        row=yy//H; y=yy%H
        for x in range(W*10):
            a=line[x*4+3]
            if a<64:continue
            col=x//W;xx=x%W
            fr=frames[row*10+col]
            fr['count']+=1
            fr['top']=min(fr['top'],y);fr['bottom']=max(fr['bottom'],y)
            fr['left']=min(fr['left'],xx);fr['right']=max(fr['right'],xx)
            if xx in (0,W-1) or y in (0,H-1):fr['touch']=True
    used=0
    for row,count in enumerate(COUNTS):
        for i in range(count):
            fr=frames[row*10+i]
            if fr['count']==0:raise ValueError(f'Blank action row {row} frame {i}')
            if fr['touch']:raise ValueError(f'Touches border row {row} frame {i}')
            if row!=12:
                if fr['bottom']!=92:raise ValueError(f'Non-death foot baseline unstable: row {row} frame {i} -> {fr["bottom"]}')
                if fr['top']<32 or fr['top']>39:raise ValueError(f'Unexpected non-death head top: row {row} frame {i} -> {fr["top"]}')
            used+=1
    return used

if __name__=='__main__':
    n=0
    for skin in ('base','evolved'):
        fn=DIR/f'blade-{skin}-right.png';count=validate(fn);n+=count
        print('[OK]',skin,count,'nonblank, in-bounds frames, consistent feet baseline')
    print('[PASS] Kael V5:',n,'transparent RGBA frames verified; Pillow is NOT required.')
