# Výškové mapy pro krajinu z povrchu (verze 2.2): Měsíc (LOLA, NASA SVS CGI Moon Kit, ldem_16.tif – km nad 1737,4 km,
# levý okraj −180°) a Mars (MOLA MEGDR, PDS, megt90n000eb.img – m nad areoidem, int16 MSB, levý okraj 0° v. d.).
# Výstup: dist/maps/dem/<id>.webp – celé těleso 4 body na stupeň (Měsíc 7,6 km, Mars 14,8 km na bod) a
# dist/maps/dem/<id>_mista.webp – výřezy 8° × 8° při 16 bodech na stupeň (1,9 a 3,7 km) kolem míst z data/mista.js;
# výška v metrech jako 16 bitů (R = vyšší bajt, G = nižší), bezeztrátové WebP. Index src/data/dem.json.
# Použití: python3 -I tools/data/dem_build.py <složka se staženými soubory> <kořen repa>
import sys, json, re, os
import numpy as np
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
src, root = sys.argv[1], sys.argv[2]
out = os.path.join(root, 'dist/maps/dem')
os.makedirs(out, exist_ok=True)
def places(body):
    t = open(os.path.join(root, 'src/data/mista.js'), encoding='utf8').read()
    m = re.search(body + r': \[(.*?)\n  \],', t, re.S)
    return [(a, float(b), float(c)) for a, b, c in re.findall(r"\['([^']+)', (-?[\d.]+), (-?[\d.]+)\]", m.group(1))]
def load(body):
    if body == 'moon':
        a = np.array(Image.open(os.path.join(src, 'ldem_16.tif')), dtype=np.float32) * 1000.0
        a = np.roll(a, -a.shape[1] // 2, axis=1)  # levý okraj na 0° v. d., jako u Marsu
        return a
    return np.fromfile(os.path.join(src, 'megt90n000eb.img'), dtype='>i2').reshape(2880, 5760).astype(np.float32)
def enc(a, h0):
    v = np.clip(np.round(a - h0), 0, 65535).astype(np.uint16)
    rgb = np.zeros(v.shape + (3,), np.uint8)
    rgb[..., 0] = v >> 8
    rgb[..., 1] = v & 255
    return Image.fromarray(rgb, 'RGB')
idx = {}
for body in ['moon', 'mars']:
    a = load(body)  # 2880 × 5760, řádek 0 = 90° s. š., sloupec 0 = 0° v. d., 16 bodů na stupeň
    h0 = float(np.floor(a.min()))
    g = a.reshape(720, 4, 1440, 4).mean(axis=(1, 3))
    enc(g, h0).save(os.path.join(out, body + '.webp'), lossless=True, quality=100, method=6)
    pl = places(body)
    T = 128
    n = len(pl)
    cols = 4
    rows = (n + cols - 1) // cols
    atl = np.zeros((rows * T, cols * T), np.float32) + h0
    tiles = []
    for k, (name, la, lo) in enumerate(pl):
        lo = lo % 360
        r0 = int(round((90 - la) * 16)) - T // 2
        c0 = int(round(lo * 16)) - T // 2
        r0 = max(0, min(2880 - T, r0))
        rr = np.arange(r0, r0 + T)
        cc = (np.arange(c0, c0 + T)) % 5760
        atl[(k // cols) * T:(k // cols + 1) * T, (k % cols) * T:(k % cols + 1) * T] = a[np.ix_(rr, cc)]
        tiles.append({'n': name, 'r0': r0, 'c0': c0, 'x': (k % cols) * T, 'y': (k // cols) * T})
    enc(atl, h0).save(os.path.join(out, body + '_mista.webp'), lossless=True, quality=100, method=6)
    idx[body] = {'h0': h0, 'ppd': 4, 'mppd': 16, 'T': T, 'tiles': tiles}
    print(body, 'h0', h0, 'max', float(a.max()), os.path.getsize(os.path.join(out, body + '.webp')), os.path.getsize(os.path.join(out, body + '_mista.webp')))
json.dump(idx, open(os.path.join(root, 'src/data/dem.json'), 'w'), ensure_ascii=False)
