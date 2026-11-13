# Mapy těles pro iteraci 1+ (Kristína 2026-11-07):
#  - tělesa s mapou NASA: oblasti „bez dat“ (Voyager viděl jen jižní polokouli Uranových měsíců, okraje map Saturnových
#    měsíců) se vyplní procedurálně ve stejném tónu (navazující šum a krátery), aby ve hře nebyla černá ani bílá půlka;
#  - tělesa bez mapy: procedurální mapa podle typu (kamenné s krátery, ledové, kometární jádro, plynný obr Uran),
#    barva a albedo z katalogu, u Merkuru pojmenované pánve na skutečných místech;
#  - výstup: PNG do out/maps_png/<id>.png (kódování AVIF ≤ 100 kB a atlas náhledů dělá pack_maps.mjs).
import json, os, math, numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'out/maps_png'); os.makedirs(OUT, exist_ok=True)
SRC = '/home/claude/nasa/nasa-3d-resources/Images and Textures'
cat = json.load(open(os.path.join(HERE, 'out/catalog.json')))
def fbm(W, H, seed, oct=6, base=4):
    rng = np.random.default_rng(seed); out = np.zeros((H, W)); amp = 1.0; tot = 0
    for o in range(oct):
        n = base * 2 ** o; g = rng.standard_normal((n // 2 + 2, n + 2))
        img = np.array(Image.fromarray(g.astype(np.float32), mode='F').resize((W, H), Image.BICUBIC))
        out += amp * img; tot += amp; amp *= 0.55
    out /= tot; return (out - out.mean()) / (out.std() + 1e-9)
def lonlat(W, H):
    lon = (np.arange(W) + 0.5) / W * 2 * np.pi - np.pi; lat = np.pi / 2 - (np.arange(H) + 0.5) / H * np.pi
    return np.meshgrid(lon, lat)
def craters(W, H, seed, n, rmin, rmax, alpha=1.8, named=()):
    """výška a albedo kráterů: mísa, val, světlé paprsky u mladých (velikosti podle mocninného rozdělení)"""
    rng = np.random.default_rng(seed); LON, LAT = lonlat(W, H); X, Y, Z = np.cos(LAT) * np.cos(LON), np.cos(LAT) * np.sin(LON), np.sin(LAT)
    h = np.zeros((H, W)); a = np.zeros((H, W))
    items = [(math.radians(la), math.radians(lo), math.radians(r), 1, young) for la, lo, r, young in named]
    for _ in range(n):
        u = rng.random(); r = (rmin ** (1 - alpha) + u * (rmax ** (1 - alpha) - rmin ** (1 - alpha))) ** (1 / (1 - alpha))
        items.append((math.asin(rng.uniform(-1, 1)), rng.uniform(-math.pi, math.pi), math.radians(r), 0, rng.random() < 0.08))
    for la, lo, r, nm, young in items:
        cx, cy, cz = math.cos(la) * math.cos(lo), math.cos(la) * math.sin(lo), math.sin(la)
        d = np.arccos(np.clip(X * cx + Y * cy + Z * cz, -1, 1)) / r
        m = d < 3
        if not m.any(): continue
        dd = d[m]; bowl = np.where(dd < 1, -(1 - dd ** 2), 0) + 0.35 * np.exp(-((dd - 1) / 0.15) ** 2)
        h[m] += bowl * r * 6
        a[m] += np.where(dd < 1, -0.04, 0) + (0.12 * np.clip(1 - (dd - 1) / 1.5, 0, 1) * (dd > 1) if young else 0)
    return h, a
def shade(h, sun=(1, 1, 1.4)):
    gy, gx = np.gradient(h); s = np.array(sun) / np.linalg.norm(sun)
    n = np.stack([-gx * 40, -gy * 40, np.ones_like(h)], -1); n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return np.clip(n @ s, 0, 1)
def pushpull(im, ok):
    """dovyplnění neplatných pixelů váženým zmenšováním a zvětšováním (Gortler et al. 1996)"""
    levels = [(im * ok[..., None], ok.astype(np.float32))]
    while min(levels[-1][1].shape) > 2:
        c, w = levels[-1]; H2, W2 = c.shape[0] // 2, c.shape[1] // 2
        c2 = c[:H2 * 2, :W2 * 2].reshape(H2, 2, W2, 2, 3).sum((1, 3)); w2 = w[:H2 * 2, :W2 * 2].reshape(H2, 2, W2, 2).sum((1, 3))
        levels.append((c2, w2))
    c0, w0 = levels[-1]; g = c0.sum((0, 1)) / max(w0.sum(), 1e-6)
    col = np.where(w0[..., None] > 0, c0 / np.maximum(w0[..., None], 1e-6), g)  # nejhrubší úroveň: prázdné buňky = průměr všech platných
    for c, w in reversed(levels[:-1]):
        from scipy.ndimage import zoom
        up = zoom(col, (c.shape[0] / col.shape[0], c.shape[1] / col.shape[1], 1), order=1, mode='nearest')
        own = c / np.maximum(w[..., None], 1e-6); a = np.clip(w, 0, 1)[..., None]
        col = own * a + up * (1 - a)
    col = col.copy(); col[ok] = im[ok]; return col
def to_img(rgb): return Image.fromarray(np.clip(rgb * 255, 0, 255).astype(np.uint8))
def rocky(b, W, H, seed, icy=False, dark=False, named=()):
    col = np.array(b.get('color') or [0.8, 0.8, 0.8]); alb = b.get('albedo') or 0.3
    base = col / max(col.max(), 1e-3) * min(0.9, 0.25 + 0.6 * math.sqrt(max(alb, 0.01)))  # tón mapy jako u map NASA (fotografie), ne surové albedo
    n = fbm(W, H, seed); h, a = craters(W, H, seed + 1, 400 if W >= 512 else 160, 0.4, 12, alpha=2.2, named=named)
    sh = shade(h * 0.6 + n * 0.0015)
    L = 1 + 0.08 * n + a + 0.12 * (sh - sh.mean())
    if icy: L += 0.06 * fbm(W, H, seed + 7, 4, 2)
    return to_img(base[None, None, :] * L[..., None])
def gasband(b, W, H, seed):
    LON, LAT = lonlat(W, H); col = np.array([0.66, 0.86, 0.90])
    band = 1 + 0.025 * np.sin(LAT * 14 + 0.6 * fbm(W, H, seed, 3, 2) * 0.3) + 0.05 * np.abs(np.sin(LAT)) ** 3
    return to_img(col[None, None, :] * band[..., None])
def comet(b, W, H, seed):
    n = fbm(W, H, seed); h, a = craters(W, H, seed + 1, 30, 2, 20)
    L = 0.36 + 0.04 * n + 0.08 * (shade(h) - 0.5) + np.where(fbm(W, H, seed + 3, 3, 2) > 1.4, 0.15, 0)
    return to_img(np.stack([L * 1.05, L, L * 0.95], -1))
MERCURY = [(30.5, -170.2, 9.4, 0), (-32.9, 87.9, 5.4, 0), (-27.3, 57.6, 3.1, 0), (20.0, -124.0, 3.6, 0), (-58, -14, 1.5, 1), (5.7, -18.2, 0.8, 1)] # Caloris, Rembrandt, Rachmaninoff (≈), Beethoven, Hokusai…
OUTL = []
for b in cat['bodies']:
    if b['id'] in ('sun', 'earth', 'moon'): continue
    seed = sum(map(ord, b['id'])); big = b['R'] > 200
    W, H = (512, 256) if big else (256, 128)
    if b.get('map', '').startswith('nasa:'):
        nm = b['map'][5:]; im = np.asarray(Image.open(os.path.join(SRC, nm, nm + '.jpg')).convert('RGB').resize((1024, 512), Image.LANCZOS)).astype(np.float32) / 255
        nod = (im.min(-1) > 250 / 255) | (im.max(-1) < 4 / 255)  # „bez dat“ = čistě bílá nebo černá výplň (stejně jako maska lavice KPI 9)
        if nod.mean() > 0.002 and b['id'] != 'iapetus':  # Iapetus: tmavá Cassini Regio jsou skutečná data
            # „chytrá úspora dat“: oblast bez dat se nevyplňuje kresbou (stála by bajty a nikdo ji nezná), ale hladkým dovyplněním
            # z okraje platných dat (pyramida push–pull); kresbu tam za běhu dodá procedurální podrobnost shaderu
            im = pushpull(im, ~nod)
        to_img(im).save(os.path.join(OUT, b['id'] + '.png')); OUTL.append((b['id'], 'nasa', round(float(nod.mean()), 3))); continue
    t = b['type']
    if b['id'] == 'uranus': img = gasband(b, W, H, seed)
    elif t == 'comet': img = comet(b, W, H, seed)
    elif b['id'] == 'mercury': img = rocky(b, 1024, 512, seed, named=MERCURY)
    else: img = rocky(b, W, H, seed, icy=t in ('tno', 'dwarf') or (t == 'moon' and (b.get('albedo') or 0) > 0.3))
    img.save(os.path.join(OUT, b['id'] + '.png')); OUTL.append((b['id'], 'proc', 0))
json.dump(OUTL, open(os.path.join(HERE, 'out/maps_list.json'), 'w'))
print(len(OUTL), 'map;', sum(1 for x in OUTL if x[1] == 'nasa'), 'NASA, výplň bez dat:', [x for x in OUTL if x[2] > 0.002])
