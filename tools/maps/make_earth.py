#!/usr/bin/env python3
"""Velká mapa Země (dist/maps/hi/earth.webp, 4096 × 2048) z NASA Blue Marble Next Generation (volné dílo).
Použití: python3 -I tools/maps/make_earth.py <world.topo.200407.3x5400x2700.jpg>
Zdroj: https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-topography/july/world.topo.200407.3x5400x2700.jpg
- Pevnina a led: kresba z NASA, barva a jas v hrubých rysech (asi 50 px) vyrovnané se stávající malou mapou, aby prolnutí neblikalo.
- Moře: NASA má v této verzi moře skoro černé, proto zůstává barva moře ze stávající mapy (zvětšená); pobřeží je ostré podle NASA.
- Malá mapa dist/maps/earth.webp se nemění."""
import sys, os, numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter as gf

Image.MAX_IMAGE_PIXELS = None
W, H = 4096, 2048
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'dist', 'maps')
s = np.asarray(Image.open(sys.argv[1]).convert('RGB').resize((W, H), Image.LANCZOS), np.float32)
cu = np.asarray(Image.open(os.path.join(root, 'earth.webp')).convert('RGB').resize((W, H), Image.BICUBIC), np.float32)
lum = lambda a: a @ np.array([0.299, 0.587, 0.114], np.float32)
# moře ve zdroji: velmi tmavé a do modra
sea = ((lum(s) < 26) & (s[..., 2] >= s[..., 0])).astype(np.float32)
land = 1 - sea
sm = lambda a, m, sg: gf(a * m, sg, mode=('nearest', 'wrap')) / np.maximum(gf(m, sg, mode=('nearest', 'wrap')), 1e-3)
out = np.empty_like(s)
for k in range(3):
    ratio = np.clip(sm(cu[..., k], land, 50) / np.maximum(sm(s[..., k], land, 50), 1.0), 0.45, 1.8)
    out[..., k] = s[..., k] * ratio
e = np.clip(gf(land, 0.8, mode=('nearest', 'wrap')), 0, 1)[..., None]
out = out * e + cu * (1 - e)
dst = os.path.join(root, 'hi', 'earth.webp')
Image.fromarray(np.clip(out + 0.5, 0, 255).astype(np.uint8)).save(dst, 'WEBP', quality=86, method=6)
print(dst, os.path.getsize(dst), 'B; moře', f'{100 * sea.mean():.1f} %')
