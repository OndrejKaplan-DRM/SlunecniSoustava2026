# Výřezy z mapy hvězd NASA SVS (Deep Star Maps 2020, rovníkové souřadnice, střed 0 h, rektascenze roste doleva).
import numpy as np, OpenEXR, math, sys, os, json
from PIL import Image
def load(path):
    f = OpenEXR.File(path)
    ch = f.parts[0].channels
    k = list(ch.keys())
    a = ch['RGB'].pixels if 'RGB' in ch else np.dstack([ch[c].pixels for c in ('R', 'G', 'B')])
    return a
def cut(a, ra, de, pole, n, rot=0.0):
    H, W = a.shape[:2]
    r0, d0 = math.radians(ra), math.radians(de)
    t = math.tan(math.radians(pole / 2))
    xs = np.linspace(-t, t, n, dtype=np.float64)
    X, Y = np.meshgrid(-xs, xs[::-1])  # východ vlevo, sever nahoře
    rho = np.hypot(X, Y); c = np.arctan(rho)
    sc, cc = np.sin(c), np.cos(c)
    rho[rho == 0] = 1e-12
    dec = np.arcsin(cc * math.sin(d0) + Y * sc * math.cos(d0) / rho)
    raa = r0 + np.arctan2(X * sc, rho * math.cos(d0) * cc - Y * math.sin(d0) * sc)
    u = (0.5 - raa / (2 * math.pi)) % 1.0 * W - 0.5
    v = (0.5 - dec / math.pi) * H - 0.5
    u0 = np.floor(u).astype(np.int64); v0 = np.clip(np.floor(v).astype(np.int64), 0, H - 2)
    fu = (u - u0)[..., None]; fv = (v - v0)[..., None]
    u1 = (u0 + 1) % W; u0 %= W
    g = lambda vv, uu: a[vv, uu].astype(np.float32)
    return (g(v0, u0) * (1 - fu) + g(v0, u1) * fu) * (1 - fv) + (g(v0 + 1, u0) * (1 - fu) + g(v0 + 1, u1) * fu) * fv
def tone(x, k=1.0, g=2.2):
    y = 1 - np.exp(-np.clip(x, 0, None) * k)
    return (np.clip(y, 0, 1) ** (1 / g) * 255 + 0.5).astype(np.uint8)
if __name__ == '__main__':
    a = load(sys.argv[1])
    print(a.shape, a.dtype, float(a.max()), float(np.percentile(a[::16, ::16], 50)), float(np.percentile(a[::16, ::16], 99)), float(np.percentile(a[::16, ::16], 99.9)))
    for nm, ra, de in [('betelgeuze', 88.793, 7.407), ('polarka', 37.95, 89.264), ('sirius', 101.289, -16.713), ('alfacen', 219.92, -60.835)]:
        c = cut(a, ra, de, 14, 720)
        for k in (0.6, 1.5, 4):
            Image.fromarray(tone(c, k)).save(f'/tmp/hv_{nm}_{k}.png')
        print(nm, float(c.max()), float(np.median(c)))
