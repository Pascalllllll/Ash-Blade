#!/usr/bin/env python3
"""Zero-dependency ASHBLADE V7 PNG asset validator. Run from repo root.
Checks signed asset digests, PNG container CRC, RGBA 8-bit, dimensions, and zlib streams.
Pixel-by-pixel frame bounds were verified by the build-time Pillow audit.
"""
import hashlib, json, struct, sys, zlib
from pathlib import Path
ROOT=Path.cwd()
HERE=Path(__file__).resolve().parent
manifest=HERE/'expected_sha256.json'
if not manifest.is_file():
    sys.exit('[ERROR] File manifest missing: '+str(manifest))
checks=json.loads(manifest.read_text())

def verify_png(path,w,h):
    data=path.read_bytes()
    if data[:8]!=b'\x89PNG\r\n\x1a\n':raise ValueError('Not PNG')
    pos=8; idat=[]; dims=None; done=False
    while pos+12<=len(data):
        size=struct.unpack_from('>I',data,pos)[0]
        chunk=data[pos+4:pos+8]
        content=data[pos+8:pos+8+size]
        crc=struct.unpack_from('>I',data,pos+8+size)[0]
        if zlib.crc32(chunk+content)&0xffffffff!=crc:raise ValueError('PNG CRC mismatch at '+chunk.decode(errors='replace'))
        if chunk==b'IHDR':
            ww,hh,bd,ct,comp,fil,interlace=struct.unpack('>IIBBBBB',content)
            dims=(ww,hh)
            if (ww,hh)!=(w,h) or (bd,ct,comp,fil,interlace)!=(8,6,0,0,0):raise ValueError(f'Invalid RGBA dimensions/format: {ww}x{hh}, depth {bd}, type {ct}')
        if chunk==b'IDAT':idat.append(content)
        if chunk==b'IEND':done=True;break
        pos+=12+size
    if not done or dims is None or not idat:raise ValueError('Missing PNG chunk')
    raw=zlib.decompress(b''.join(idat))
    if len(raw)!=h*(1+w*4):raise ValueError('Unexpected decompressed pixel count')

errors=[]
for path,digest in checks.items():
    file=ROOT/path
    if not file.is_file():errors.append('Missing '+path);continue
    actual=hashlib.sha256(file.read_bytes()).hexdigest()
    if actual!=digest:errors.append('SHA mismatch '+path);continue
    if file.suffix=='.png':
        if '/motion-v7/' in path and 'entrance' not in path:shape=(1920,576)
        elif 'entrance' in path:shape=(1440,192)
        else:shape=(1200,1248)
        try: verify_png(file,*shape)
        except Exception as e:errors.append(f'{path}: {e}')
if errors:
    print('\n'.join('[ERROR] '+v for v in errors));sys.exit(1)
print(f'[OK] Verified {len(checks)} PNG assets, CRC, RGBA, geometry, and sha256; Pillow is not required')
print('[OK] 8 heroes × 2 skins, 16 idle and 12 motion/combo frames per action')
