#!/usr/bin/env python3
"""Úroveň 2 map těles: dlaždice 1024 px (+1 px okraje) z primární mozaiky 16k nebo 8k.

Použití: python3 -I tools/maps/make_l2.py <zdroj.raw> <id> [kvalita=78] [--zeme] [--l1]
- <zdroj.raw>: zdroj zmenšený na pracovní šířku (32768, 16384 nebo 8192) nástrojem l2_resize.mjs (proudově, sharp).
- Barvy a jas určuje stávající velká mapa dist/maps/hi/<id>.webp (úroveň 1): ze zdroje se bere jen jemná kresba
  nad její rozlišovací schopností („přenos detailu“): L2 = zvětšená L1 × ((Y + e) / (Ynízké + e))^γ,
  Ynízké = jas zdroje zmenšený na rozměr L1 a zpět. Zmenšená L2 tedy dá zase L1 – při doostření nic neblikne.
- γ (tónová křivka, kterou byla L1 ze zdroje vyrobena – např. zesvětlení ledových měsíců) se odhadne regresí log L1 × log zdroje.
- Natočení (posun v délce) se zjistí korelací zdroje s L1; vypíše se korelace (u stejného původu > 0,9).
- Kde zdroj nemá data (černá), zůstává zvětšená L1 – nic se nepřikresluje.
- --zeme: Země – pevnina ze zdroje (NASA Blue Marble) s barvou podle L1, moře z L1 (zdroj má moře skoro černé), ostré pobřeží.
- --l1: když má stávající L1 jen 2048 px, přepíše se zmenšeninou nové mapy na 4096 × 2048.
- L2_L1=<soubor.raw>: barvy a hrubší kresbu nebere z L1, ale z jiné mapy (surová RGB, např. Měsíc NASA SVS 16k); ze zdroje se
  pak přidá jen jemnější kresba. Se zadaným L2_POSUN i L2_GAMA se vynechá odhad (u velké reference by se nevešel do paměti).
- L2_Q2=<kvalita>: jiná kvalita nejjemnějšího stupně 32k (bývá ho nejvíc).
- L2_POLY=<n>: u nejjemnějšího stupně vynechá n krajních řádků dlaždic u každého pólu (Měsíc 32k: 1 – nad 78,75° by je shader skoro
  nikdy neukázal); l2.json pak má [stupeň, n].
- L2_KEEP=<soubor.raw>: místo dlaždic uloží výslednou mapu (surová RGB) – reference pro další průchod. Měsíc 32k ve dvou průchodech:
  1) L2_KEEP=moon16.raw make_l2.py svs16.raw moon (SVS 16k přenesená na tóny L1), 2) L2_L1=moon16.raw … make_l2.py wac32.raw moon.
Výstup: pyramida dlaždic dist/maps/l2/<id>/<z>-<řádek>-<sloupec>.webp (z = 0 → 8k, 1 → 16k, 2 → 32k; tools/maps/l2_tiles.py),
1026 × 1026; nejjemnější stupeň do src/data/l2.json."""
import sys, os, json, numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
args = [a for a in sys.argv[1:] if not a.startswith('--')]
raw, bid = args[0], args[1]
Q = int(args[2]) if len(args) > 2 else 78
ZEME = '--zeme' in sys.argv
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
meta = json.load(open(raw + '.json'))
W2, H2, C = meta['w'], meta['h'], meta['c']
src = np.memmap(raw, np.uint8, 'r', shape=(H2, W2, C))
l1p = os.path.join(root, 'dist', 'maps', 'hi', bid + '.webp')
REFRAW = os.environ.get('L2_L1')
if REFRAW:
    rm = json.load(open(REFRAW + '.json'))
    L1 = np.memmap(REFRAW, np.uint8, 'r', shape=(rm['h'], rm['w'], 3))
    print('barvy z', REFRAW, rm['w'], 'x', rm['h'])
else:
    L1 = Image.open(l1p).convert('RGB')
if os.environ.get('L2_REF'):  # barvy jen z hrubší L1 (např. 1024 px) – kresbu pod tímto měřítkem dodá zdroj; L1 se pak přepíše (--l1)
    rw = int(os.environ['L2_REF'])
    L1 = L1.resize((rw, rw // 2), Image.BOX)
    print('barva z L1 zmenšené na', rw, 'px')
if not REFRAW:
    L1 = np.asarray(L1, np.float32)
H1, W1 = L1.shape[:2]
K = W2 // W1  # poměr rozměrů (2, 4 nebo 8)
T = 1024
gw, gh = W2 // T, H2 // T
lumw = np.array([0.299, 0.587, 0.114], np.float32)
print(f'{bid}: zdroj {W2}x{H2}x{C}, L1 {W1}x{H1}, poměr {K}, mřížka {gw}x{gh}')


def lum(a):
    return a[..., 0].astype(np.float32) if a.shape[-1] == 1 else a.astype(np.float32) @ lumw


def box(a, k):  # zmenšení průměrem k × k
    h, w = a.shape[:2]
    return a.reshape(h // k, k, w // k, k, *a.shape[2:]).mean((1, 3))


# jas zdroje v rozlišení L1 (po pruzích, ať se nevejde celé do paměti jako float)
S = 512
Yd = np.empty((H1, W1), np.float32)
Vd = np.empty((H1, W1), np.float32)
for y in range(0, H2, S):
    Ys = lum(src[y : y + S])
    Yd[y // K : (y + S) // K] = box(Ys, K)
    Vd[y // K : (y + S) // K] = box((Ys > 2).astype(np.float32), K)

FIX = os.environ.get('L2_POSUN') and os.environ.get('L2_GAMA')
# natočení: korelace v délce (jako make_hi.py), v rozlišení L1
L1l = None if FIX else L1 @ lumw
sl = slice(H1 // 6, 5 * H1 // 6)
if FIX:
    pass
else:
    A = Yd[sl] - Yd[sl].mean()
    B = L1l[sl] - L1l[sl].mean()
    cc = np.fft.irfft(np.fft.rfft(B, axis=1) * np.conj(np.fft.rfft(A, axis=1)), n=W1, axis=1).sum(0) / np.sqrt((A**2).sum() * (B**2).sum())
    k = int(cc.argmax())
    srt = np.sort(cc)
    print(f'natočení: posun {k} px z {W1} (korelace {cc[k]:.3f}, druhý vrchol {srt[-2]:.3f})')
    if cc[k] < 0.5 and not os.environ.get('L2_POSUN'):
        sys.exit('korelace je slabá – zdroj neodpovídá L1; posun zadej ručně L2_POSUN=<px L1>')
if os.environ.get('L2_POSUN'):
    k = int(os.environ['L2_POSUN'])
    print('posun zadán ručně', k)
Yd = np.roll(Yd, k, axis=1)
Vd = np.roll(Vd, k, axis=1)
roll2 = k * K

# tónová křivka L1 vůči zdroji
from scipy.ndimage import gaussian_filter as _gf

if FIX:
    gam = 1.0
else:
    v = (Vd > 0.99) & (L1l > 3)
    if ZEME:
        v &= Yd > 40  # pevnina
    # jen jemná kresba (horní propust v logaritmu): velké plochy mohla L1 přebarvit podle malé mapy, kontrast detailu ne
    hp = lambda a: np.log(a + 4.0) - _gf(np.log(a + 4.0), 6, mode=('nearest', 'wrap'))
    gx = hp(Yd)[v]
    gy = hp(L1l)[v]
    # poměr kontrastů (ne sklon regrese – ten se u zdroje jiného původu, např. Mars MDIM × barevná Viking, stáhne k nule)
    gam = float(np.sqrt((gy * gy).sum() / max((gx * gx).sum(), 1e-9))) if v.sum() > 1000 else 1.0
    cor = float((gx * gy).sum() / np.sqrt(max((gx * gx).sum() * (gy * gy).sum(), 1e-9))) if v.sum() > 1000 else 0.0
    print(f'korelace jemné kresby L1 × zdroj {cor:.2f}')
if os.environ.get('L2_GAMA'):
    gam = float(os.environ['L2_GAMA'])
gam = min(max(gam, 0.15), 1.6)
print(f'tónová křivka γ = {gam:.2f}')


def up_rows(a, y0, n):  # dvojlineární zvětšení řádků y0..y0+n (výstupní rozlišení) z mřížky L1 – jako vzorkování na grafice
    h, w = a.shape[:2]
    ys = (np.arange(y0, y0 + n) + 0.5) / K - 0.5
    i0 = np.clip(np.floor(ys).astype(int), 0, h - 1)
    i1 = np.clip(i0 + 1, 0, h - 1)
    fy = np.clip(ys - np.floor(ys), 0, 1).astype(np.float32)
    xs = (np.arange(W2) + 0.5) / K - 0.5
    j0 = np.floor(xs).astype(int) % w
    j1 = (j0 + 1) % w
    fx = (xs - np.floor(xs)).astype(np.float32)
    sh = (n, W2) + a.shape[2:]
    fy = fy.reshape(n, 1, *(1,) * (a.ndim - 2))
    fx = fx.reshape(1, W2, *(1,) * (a.ndim - 2))
    r0 = a[i0][:, j0] * (1 - fx) + a[i0][:, j1] * fx
    r1 = a[i1][:, j0] * (1 - fx) + a[i1][:, j1] * fx
    return (r0 * (1 - fy) + r1 * fy).reshape(sh)


out_p = raw + '.l2.u8'
out = np.memmap(out_p, np.uint8, 'w+', shape=(H2, W2, 3))
E = 6.0
if ZEME:
    from scipy.ndimage import gaussian_filter as gf, binary_erosion

    Sd = np.empty((H1, W1, 3), np.float32)
    for y in range(0, H2, S):
        s = np.roll(src[y : y + S], roll2, axis=1).astype(np.float32)
        Sd[y // K : (y + S) // K] = box(s, K)
    sea1 = ((Sd @ lumw) < 26) & (Sd[..., 2] >= Sd[..., 0])
    land1 = (~sea1).astype(np.float32)
    sm = lambda a, m, sg: gf(a * m, sg, mode=('nearest', 'wrap')) / np.maximum(gf(m, sg, mode=('nearest', 'wrap')), 1e-3)
    ratio = np.stack([np.clip(sm(L1[..., c], land1, 50) / np.maximum(sm(Sd[..., c], land1, 50), 1.0), 0.45, 1.8) for c in range(3)], -1)
    seaE = binary_erosion(sea1, iterations=2).astype(np.float32)
    seaC = np.stack([sm(L1[..., c], seaE, 2.0) for c in range(3)], -1)  # barva moře bez příměsi pobřeží
    wS = gf(seaE, 2.0, mode=('nearest', 'wrap'))[..., None]
    seaC = np.where(seaE[..., None] > 0, L1, np.where(wS > 0.15, seaC, L1))  # bažiny a jezera daleko od moře: barva z L1
    for y in range(0, H2, S):
        s = np.roll(src[y : y + S], roll2, axis=1).astype(np.float32)
        sea = ((s @ lumw) < 26) & (s[..., 2] >= s[..., 0])
        e = gf((~sea).astype(np.float32), 1.0, mode=('nearest', 'wrap'))[..., None]
        o = s * up_rows(ratio, y, len(s)) * e + up_rows(seaC, y, len(s)) * (1 - e)
        out[y : y + len(s)] = np.clip(o + 0.5, 0, 255).astype(np.uint8)
else:
    from scipy.ndimage import minimum_filter

    for y in range(0, H2, S):
        Ys = lum(np.roll(src[y : y + S], roll2, axis=1))
        n = len(Ys)
        Yl = up_rows(Yd, y, n)
        r = ((Ys + E) / (Yl + E)) ** gam
        # platná data: jas > 3 a k tomu 2 px od každé díry (okraje děr po zmenšení zdroje jsou ztmavlé – dělaly černé tečky)
        y0, y1 = max(0, y - 2), min(H2, y + n + 2)
        vv = minimum_filter((lum(np.roll(src[y0:y1], roll2, axis=1)) > 3).astype(np.uint8), size=5, mode=('nearest', 'wrap'))
        m = np.clip((up_rows(Vd, y, n) - 0.6) / 0.35, 0, 1) * vv[y - y0 : y - y0 + n]
        r = 1 + (np.clip(r, 0.25, 4.0) - 1) * m
        o = up_rows(L1, y, n) * r[..., None]
        out[y : y + n] = np.clip(o + 0.5, 0, 255).astype(np.uint8)
out.flush()

# kontrola: zmenšená L2 proti L1
d = 0.0
for y in range(0, H2, S):
    c = box(out[y : y + S].astype(np.float32), K)
    d += np.abs(c - np.asarray(L1[y // K : (y + S) // K], np.float32)).sum()
d /= H1 * W1 * 3
print(f'zmenšená L2 proti L1: průměrná odchylka {d:.2f} (0–255)')

if '--l1' in sys.argv and W1 < 4096:
    k2 = W2 // 4096
    l1n = np.empty((2048, 4096, 3), np.float32)
    for y in range(0, H2, S):
        l1n[y // k2 : (y + S) // k2] = box(out[y : y + S].astype(np.float32), k2)
    Image.fromarray(np.clip(l1n + 0.5, 0, 255).astype(np.uint8)).save(l1p, 'WEBP', quality=85, method=6)
    print('L1 přepsána na 4096 x 2048', os.path.getsize(l1p), 'B')

if os.environ.get('L2_KEEP'):  # mezivýsledek pro druhý průchod (Měsíc: SVS 16k sladěná s L1 → reference pro WAC 32k)
    kp = os.environ['L2_KEEP']
    del out
    os.replace(out_p, kp)
    json.dump({'w': W2, 'h': H2, 'c': 3, 'src': raw}, open(kp + '.json', 'w'))
    print('mapa uložena', kp)
    sys.exit(0)

# pyramida dlaždic: nejjemnější stupeň z mapy, hrubší jejím zmenšením
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import l2_tiles

zmax = {8192: 0, 16384: 1, 32768: 2}[W2]
dd = os.path.join(root, 'dist', 'maps', 'l2', bid)
os.makedirs(dd, exist_ok=True)
for f in os.listdir(dd):
    os.remove(os.path.join(dd, f))
qz = {2: int(os.environ['L2_Q2'])} if os.environ.get('L2_Q2') else None
tot = l2_tiles.pyramid(out, zmax, dd, Q, qz)
pole = int(os.environ.get('L2_POLY', '0'))  # bez krajních řádků nejjemnějšího stupně u pólů (Měsíc 32k: 1)
if pole and zmax:
    tot -= l2_tiles.drop_poles(dd, zmax, pole)
print(f'celkem {tot / 1048576:.1f} MB')
l2_tiles.manifest(bid, zmax, pole if zmax else 0)
del out
os.remove(out_p)
