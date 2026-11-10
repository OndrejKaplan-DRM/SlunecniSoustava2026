# Nástřel (iterace 0): mapy NASA (NASA-3D-Resources) → JPEG 1024×512, nejvyšší kvalita, která se vejde do 100 kB.
import sys, os, io, json
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
SRC = '/home/claude/nasa/nasa-3d-resources/Images and Textures'
OUT = os.path.join(os.path.dirname(__file__), '../../assets/space/maps')
cat = json.load(open(os.path.join(os.path.dirname(__file__), 'out/catalog.json')))
os.makedirs(OUT, exist_ok=True); tot = 0
for b in cat['bodies']:
    m = b.get('map')
    if not m or not m.startswith('nasa:'): continue
    im = Image.open(os.path.join(SRC, m[5:], m[5:] + '.jpg')).convert('RGB').resize((1024, 512), Image.LANCZOS)
    lo, hi, best = 5, 95, None
    while lo <= hi:
        q = (lo + hi) // 2; buf = io.BytesIO(); im.save(buf, 'JPEG', quality=q, optimize=True)
        if buf.tell() <= 100_000: best = (q, buf.getvalue()); lo = q + 1
        else: hi = q - 1
    open(os.path.join(OUT, b['id'] + '.jpg'), 'wb').write(best[1]); tot += len(best[1])
    print(f"{b['id']:10s} q={best[0]:3d} {len(best[1]) / 1000:6.1f} kB")
print('celkem', tot / 1e6, 'MB')
