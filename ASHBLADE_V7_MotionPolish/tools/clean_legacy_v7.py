#!/usr/bin/env python3
"""Sanitize existing V6 atlases, and align Dev height with regular heroes."""
from PIL import Image
from pathlib import Path
import argparse

W,H = 120,96

def clean(im):
    pix=im.load()
    for y in range(im.height):
        for x in range(im.width):
            r,g,b,a=pix[x,y]
            if a<128: pix[x,y]=(0,0,0,0)
            else: pix[x,y]=(r,g,b,255)
    return im

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--project',required=True);ap.add_argument('--out',required=True); args=ap.parse_args()
    source=Path(args.project)/'art/sprites/soft-facing'
    target=Path(args.out);target.mkdir(parents=True,exist_ok=True)
    for file in sorted(source.glob('*-right.png')):
        original=Image.open(file).convert('RGBA')
        dest=Image.new('RGBA',original.size,(0,0,0,0))
        for row in range(13):
            for col in range(10):
                f=original.crop((col*W,row*H,(col+1)*W,(row+1)*H))
                if file.name.startswith('dev-') and row not in (0,12):
                    # Dev originally 51px versus 54px; align head/feet with other regular heroes.
                    scale=54/51
                    enlarged=f.resize((round(W*scale),round(H*scale)),Image.Resampling.NEAREST)
                    f2=Image.new('RGBA',(W,H),(0,0,0,0))
                    f2.alpha_composite(enlarged,(round((W-enlarged.width)/2),round(93-93*scale)))
                    f=f2
                dest.alpha_composite(clean(f),(col*W,row*H))
        dest.save(target/file.name,optimize=True)
    print('Legacy atlas alpha cleaned and Dev non-death scale normalized.')
if __name__=='__main__':main()
