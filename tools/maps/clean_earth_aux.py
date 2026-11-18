#!/usr/bin/env python3
"""Vyčištění vrstvy mraků Země (červený kanál dist/maps/earth_aux.webp).
Ztrátová komprese přenášela do kanálu mraků ostré hrany masky moře (zelený kanál); protože se mraky pomalu posouvají,
objevily se zblízka nad mořem světlé „řetízky“ ve tvaru pobřeží. Tenké čáry odstraní morfologické otevření (7 × 7),
plochy mraků zůstanou; soubor se ukládá bezeztrátově, aby se přeslech nevrátil (1,35 MB místo 0,33 MB).
Použití: python3 -I tools/maps/clean_earth_aux.py <původní earth_aux.webp>"""
import sys, os, numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter as gf, grey_opening

a = np.asarray(Image.open(sys.argv[1]).convert('RGB'), np.float32)
r = gf(grey_opening(a[..., 0], size=(7, 7), mode='wrap'), 1.4, mode=('nearest', 'wrap'))
a[..., 0] = np.clip((r - 10) / 245, 0, 1) * 255
dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'dist', 'maps', 'earth_aux.webp')
Image.fromarray(np.clip(a + 0.5, 0, 255).astype(np.uint8)).save(dst, 'WEBP', lossless=True, method=6)
print(dst, os.path.getsize(dst), 'B')
