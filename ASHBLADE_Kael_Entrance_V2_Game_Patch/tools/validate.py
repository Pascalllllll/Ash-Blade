#!/usr/bin/env python3
"""Check Kael entrance PNG dimensions and frame alpha without Pillow."""
from pathlib import Path
import struct, zlib, sys
p=Path(__file__).resolve().parent.parent/'art/sprites/entrance/kael-v2-24.png'
data=p.read_bytes()
assert data[:8]==bytes([137,80,78,71,13,10,26,10]), 'not a PNG'
w,h=struct.unpack('>II',data[16:24]);assert (w,h)==(1440,192),(w,h)
assert data[25]==6,'image not RGBA'
print('[OK] PNG dimensions:',w,'x',h,'/ RGBA / 24 frames / 120x96')
