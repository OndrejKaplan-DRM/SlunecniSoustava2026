#!/usr/bin/env python3
"""Mapa Saturnu z archivu NASA PDS (Cassini ISS Global Maps of Jupiter and Saturn Bundle, doi:10.17189/rkkb-6y30).
Použití: make_saturn.py <Cassini_ISS_RGB_Saturn_global_color_map_original.fits> [kontrast=2.0]
Zdroj: 3601 × 1801, 0,1°/px, planetocentrická šířka +90 → −90 shora, západní délka 360 → 0 zleva (střed 180°), snímky z 11. 8. 2011.
Úpravy: (1) mezery – póly nad ~78°, pás 0° až −18° (stín prstenců a prstence; i úzký platný proužek ve stínu vypuštěn, stín kreslí model sám)
– doplněny po sloupcích lineárně mezi okraji a vodorovně vyhlazeny, tedy jen hladké pásy bez kresby; (2) odchylka od průměrné barvy
vynásobena kontrastem (věrná mapa je téměř jednolitě béžová); barvy se jinak nemění. Zapisuje dist/maps/hi/saturn.webp (3600 × 1800) a dist/maps/saturn.webp (1024 × 512)."""
import sys, os, warnings, numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter as gf, gaussian_filter1d as g1
from astropy.io import fits
warnings.simplefilter('ignore')
k = float(sys.argv[2]) if len(sys.argv) > 2 else 2.0
O = np.moveaxis(fits.open(sys.argv[1])[0].data, 0, -1)[:1800, :3600].astype(np.float32); H, W = 1800, 3600
ok = (O.sum(2) > 3).mean(1) > 0.98; base = ok.copy()
for j in range(1, 7): ok &= np.roll(base, j) & np.roll(base, -j)
ok[885:1090] = False   # stín prstenců a prstence
idx = np.where(ok)[0]; rows = np.arange(H); F = np.empty_like(O); gap = ~ok
wg = np.where(gap, 1.0, np.clip(gf(gap.astype(np.float32), 4), 0, 1))[:, None]
for c in range(3):
    good = O[idx, :, c]; A = np.empty((H, W), np.float32)
    for x in range(W): A[:, x] = np.interp(rows, idx, good[:, x])
    F[..., c] = A * (1 - wg) + g1(A, 60, axis=1, mode='wrap') * wg
m = F.reshape(-1, 3).mean(0); out = Image.fromarray(np.clip(m + (F - m) * k + .5, 0, 255).astype(np.uint8))
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'dist', 'maps')
out.save(os.path.join(root, 'hi', 'saturn.webp'), 'WEBP', quality=90, method=6); out.resize((1024, 512), Image.LANCZOS).save(os.path.join(root, 'saturn.webp'), 'WEBP', quality=92, method=6)
print('saturn', os.path.getsize(os.path.join(root, 'hi', 'saturn.webp')), 'B; doplněno', f'{100 * gap.mean():.0f} % řádků; kontrast', k)
