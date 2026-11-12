#!/usr/bin/env python3
"""Velká mapa tělesa (dist/maps/hi/<id>.webp) ze zdrojové mozaiky.
Použití: make_hi.py <zdroj.tif> <id> [šířka=4096] [posun=0..1] [kvalita=85] [sigma=24]
- posun: vodorovné pootočení zdroje ve zlomku šířky (0.5 = zdroj má střed na 0° a stávající mapa začíná na 0°);
  bez udání se zjistí korelací se stávající mapou a vypíše.
- jas a barva se v hrubých rysech (sigma v pixelech stávající mapy) vyrovnají se stávající mapou dist/maps/<id>.webp,
  aby prolnutí malé a velké mapy neblikalo; šedý zdroj dostane barvu ze stávající mapy.
- kde zdroj nemá data (černá), zůstane zvětšená stávající mapa – nic se nepřikresluje."""
import sys, os, numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter as gf
Image.MAX_IMAGE_PIXELS = None
src, bid = sys.argv[1], sys.argv[2]
W = int(sys.argv[3]) if len(sys.argv) > 3 else 4096; H = W // 2
shift = float(sys.argv[4]) if len(sys.argv) > 4 and sys.argv[4] != 'auto' else None
q = int(sys.argv[5]) if len(sys.argv) > 5 else 85
sig = float(sys.argv[6]) if len(sys.argv) > 6 else 24
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dist', 'maps')
cur = Image.open(os.path.join(root, bid + '.webp')).convert('RGB'); cw, ch = cur.size
im = Image.open(src); gray = im.mode not in ('RGB', 'RGBA')
im = im.convert('L' if gray else 'RGB').resize((W, H), Image.LANCZOS)
s = np.asarray(im, np.float32); s = s[..., None] if gray else s
c = np.asarray(cur, np.float32)
lum = lambda a: a.mean(2) if a.shape[2] == 1 else a @ np.array([.299, .587, .114], np.float32)
if shift is None:
    a = np.asarray(Image.fromarray(lum(s).astype(np.uint8)).resize((cw, ch), Image.BOX), float); b = lum(c)
    sl = slice(ch // 6, 5 * ch // 6); A = a[sl] - a[sl].mean(); Bb = b[sl] - b[sl].mean()
    cc = np.fft.irfft(np.fft.rfft(A, axis=1) * np.conj(np.fft.rfft(Bb, axis=1)), n=cw, axis=1).sum(0) / np.sqrt((A**2).sum() * (Bb**2).sum())
    k = int(cc.argmax()); shift = -k / cw; print(f'korelace {cc[k]:.3f}, posun {k} px z {cw} -> {shift:.4f}')
s = np.roll(s, int(round(shift * W)), axis=1)
valid = (lum(s) > 2).astype(np.float32)
cu = np.asarray(cur.resize((W, H), Image.BICUBIC), np.float32)
S = sig * W / cw
def blur(a, m):  # rozmazání jen přes platné body, ve vodorovném směru s přechodem přes okraj
    n = gf(a * m, S, mode=('nearest', 'wrap')); d = gf(m, S, mode=('nearest', 'wrap')); return n / np.maximum(d, 1e-3)
out = np.empty((H, W, 3), np.float32)
if gray:
    L = s[..., 0]; g = blur(lum(cu), valid) / np.maximum(blur(L, valid), 1.0); Ln = L * g
    cl = np.maximum(gf(lum(cu), 2, mode=('nearest', 'wrap')), 1.0)
    for k in range(3): out[..., k] = Ln * gf(cu[..., k], 2, mode=('nearest', 'wrap')) / cl
else:
    for k in range(3): out[..., k] = s[..., k] * blur(cu[..., k], valid) / np.maximum(blur(s[..., k], valid), 1.0)
m = gf(valid, 24, mode=('nearest', 'wrap'))[..., None]; m = np.clip((m - .5) * 2, 0, 1)
out = out * m + cu * (1 - m)
dst = os.path.join(root, 'hi', bid + '.webp')
Image.fromarray(np.clip(out + .5, 0, 255).astype(np.uint8)).save(dst, 'WEBP', quality=q, method=6)
print(dst, f'{W}x{H}', os.path.getsize(dst), 'B; bez dat', f'{100 * (1 - valid.mean()):.1f} %')
