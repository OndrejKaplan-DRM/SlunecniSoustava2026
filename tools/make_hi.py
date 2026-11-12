#!/usr/bin/env python3
"""Velká mapa tělesa (dist/maps/hi/<id>.webp) ze zdrojové mozaiky.
Použití: make_hi.py <zdroj.tif> <id> [šířka=4096] [posun=0..1] [kvalita=85] [sigma=24] [režim]
- režim: vynechán = „doladit“ (níže); „seda“ = barevný zdroj brát jako šedý; „nahradit[:šířka malé[:cílový jas]]“ = stávající mapa je jiného původu
  (umělé bílé plochy, švy): vzhled určuje zdroj, ze stávající mapy se bere jen celkový jas a průměrná barva (šedý zdroj) a přepíše se
  i malá mapa dist/maps/<id>.webp zmenšeninou nové; místa bez dat se vyplní rozmazaným okolím (žádná kresba).
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
mode = sys.argv[7] if len(sys.argv) > 7 else ''
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dist', 'maps')
cur = Image.open(os.path.join(root, bid + '.webp')).convert('RGB'); cw, ch = cur.size
im = Image.open(src); gray = im.mode not in ('RGB', 'RGBA') or mode == 'seda' or os.environ.get('SEDA') == '1'
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
if mode.startswith('nahradit'):
    v = valid > 0
    def fill(a):   # místa bez dat: rozmazané okolí, dál od okraje dat čím dál hrubší, nakonec průměr – žádná kresba
        if valid.min() > 0: return a
        f = 8; sm = lambda x: x.reshape(H // f, f, W // f, f).mean((1, 3))   # hrubá mřížka stačí, výplň je hladká
        w = sm(valid); o = sm(np.where(v, a, 0.0)) / np.maximum(w, 1e-6); o = np.where(w > 0, o, 0.0); w = (w > 0).astype(np.float32)
        for sg in (2, 6, 18, 55):
            n = gf(o * w, sg, mode=('nearest', 'wrap')); d = gf(w, sg, mode=('nearest', 'wrap')); ok = (d > 0.05) & (w < 1)
            o = np.where(ok, n / np.maximum(d, 1e-6), o); w = np.where(ok, 1.0, w)
        o = np.where(w < 1, float((a * valid).sum() / valid.sum()), o); o = gf(o, 1.5, mode=('nearest', 'wrap'))
        o = np.asarray(Image.fromarray(o.astype(np.float32)).resize((W, H), Image.BICUBIC), np.float32)
        e = np.clip(gf(valid, 10, mode=('nearest', 'wrap')) * 2 - 1, 0, 1); return a * e + o * (1 - e) if True else o
    wlat = np.cos((np.arange(H) + .5) / H * np.pi - np.pi / 2)[:, None] * valid; mean = lambda a: float((a * wlat).sum() / wlat.sum())
    cm = [float(c[..., k].mean()) for k in range(3)]
    if os.environ.get('TINT'): cm = [float(x) for x in os.environ['TINT'].split(',')]   # barva a jas zadané ručně (stávající mapa má nevěrohodný odstín)
    cl = .299 * cm[0] + .587 * cm[1] + .114 * cm[2]
    if mode.count(':') > 1: k_ = float(mode.split(':')[2]) / cl; cm = [x * k_ for x in cm]; cl *= k_   # třetí údaj režimu: cílový střední jas
    if gray:
        L = s[..., 0]; m0 = mean(L); tgt = min(cl, 205.0)
        if tgt > m0 * 1.25:   # světlé (ledové) těleso, zdroj je tmavší: zesvětlit křivkou gama, ať se nepřepálí světla
            gam = np.log(tgt / 255) / np.log(m0 / 255); Ln = 255 * (np.maximum(L, 0) / 255) ** gam; print(f'gama {gam:.2f}: střední jas {m0:.0f} -> {mean(Ln):.0f} (stávající {cl:.0f})')
        else: Ln = L * min(cl / max(m0, 1), 255 / max(np.percentile(L[v], 99.7), 1)); print(f'zisk: střední jas {m0:.0f} -> {mean(Ln):.0f} (stávající {cl:.0f})')
        for k in range(3): out[..., k] = fill(Ln * cm[k] / cl)
    else:
        g = min(cl / max(mean(lum(s)), 1), 255 / max(np.percentile(lum(s)[v], 99.7), 1))
        for k in range(3): out[..., k] = fill(s[..., k] * g)
    dst = os.path.join(root, 'hi', bid + '.webp'); res = Image.fromarray(np.clip(out + .5, 0, 255).astype(np.uint8))
    res.save(dst, 'WEBP', quality=q, method=6); bw = int(mode.split(':')[1]) if ':' in mode else cw
    if bw: res.resize((bw, bw // 2), Image.LANCZOS).save(os.path.join(root, bid + '.webp'), 'WEBP', quality=90, method=6)   # šířka 0 = malou mapu nechat
    print(dst, f'{W}x{H}', os.path.getsize(dst), 'B; bez dat', f'{100 * (1 - valid.mean()):.1f} %; malá mapa přepsána', bw); sys.exit()
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
