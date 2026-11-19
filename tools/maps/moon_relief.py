"""Reliéf Měsíce (verze 1.8m, pokus): mapa sklonů z výškové mapy LOLA 128 px/° → dist/maps/hi/moon_relief.webp.

Použití: python3 -I tools/maps/moon_relief.py <Lunar_LRO_LOLA_DEM_Global_128ppd_v04.cub> <výstup.webp> [kvalita=88]
Zdroj: USGS Astrogeology, mosaic/Lunar_LRO_LOLA_DEM_Global_128ppd_v04.cub (2,1 GB; ISIS cube, dlaždice 128 × 128, int16 × 0,5 m,
délka 0–360°). Výška se zprůměruje 8 × 8 na 5760 × 2880 (1,9 km/px), otočí na −180…180° a spočtou se sklony (centrální diference):
k východu dh/dx / cos šířky, k severu dh/dy. Výstup: šedý obrázek 5760 × 5760 – nahoře sklon k východu, dole k severu,
hodnota = 128 + sklon · 160 (rozsah ±0,8; 99,9 % sklonů je pod 0,5). Šedý obrázek kóduje WebP jen jasem v plném rozlišení
(barevné kanály by měly poloviční rozlišení), proto dvě poloviny nad sebou místo kanálů R a G."""
import numpy as np, sys, os
from PIL import Image
f, out = sys.argv[1], sys.argv[2]
W, H = 5760, 2880
d = np.memmap(f, np.int16, 'r', offset=65536, shape=(180, 360, 128, 128))
Hm = np.empty((H, W), np.float32)
for r in range(180):
    b = np.asarray(d[r], np.float32).transpose(1, 0, 2).reshape(128, 46080) * 0.5
    Hm[r * 16:(r + 1) * 16] = b.reshape(16, 8, W, 8).mean((1, 3))
Hm = np.roll(Hm, W // 2, axis=1)  # LOLA 0..360° → mapy aplikace −180..180°
print('výška m: min %.0f max %.0f průměr %.0f' % (Hm.min(), Hm.max(), Hm.mean()))
R = 1737400.0
dx = 2 * np.pi * R / W
lat = (90 - (np.arange(H) + 0.5) * 180 / H) * np.pi / 180
c = np.maximum(np.cos(lat), 0.05)[:, None]
sE = (np.roll(Hm, -1, 1) - np.roll(Hm, 1, 1)) / (2 * dx * c)
Hp = np.pad(Hm, ((1, 1), (0, 0)), mode='edge')
sN = (Hp[:-2] - Hp[2:]) / (2 * dx)
for nm, s in (('E', sE), ('N', sN)):
    a = np.abs(s)
    print(nm, 'sklon p50 %.3f p99 %.3f p99.9 %.3f max %.2f; mimo ±0,8: %.4f %%' % (np.percentile(a, 50), np.percentile(a, 99), np.percentile(a, 99.9), a.max(), (a > 0.8).mean() * 100))
enc = lambda s: np.clip(np.round(128 + s * 160), 0, 255).astype(np.uint8)
img = np.concatenate([enc(sE), enc(sN)], 0)
Image.fromarray(img).save(out, 'WEBP', quality=int(sys.argv[3]) if len(sys.argv) > 3 else 88, method=6)
print(out, os.path.getsize(out))
