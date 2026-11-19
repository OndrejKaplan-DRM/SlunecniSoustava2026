#!/usr/bin/env python3
"""Pyramida dlaždic úrovně 2: stupeň z má (8 · 2^z) × (4 · 2^z) dlaždic 1024 px s okrajem 1 px (1026 × 1026),
soubory dist/maps/l2/<id>/<z>-<řádek>-<sloupec>.webp (řádek 0 = sever); z = 0 → 8192 px po obvodu, 1 → 16 384, 2 → 32 768.

Použití (převod a doplnění hrubších stupňů ze stávajících dlaždic):
  python3 -I tools/maps/l2_tiles.py <id> [kvalita=78]
- staré názvy <řádek>-<sloupec>.webp se přejmenují podle velikosti mřížky (8 × 4 → stupeň 0, 16 × 8 → 1, 32 × 16 → 2);
- chybějící hrubší stupně se složí z nejjemnějšího (zmenšení průměrem 2 × 2); src/data/l2.json dostane nejjemnější stupeň.
make_l2.py volá cut() a pyramid() přímo s mapou v plném rozlišení."""
import sys, os, re, json, numpy as np
from PIL import Image

T = 1024
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')


def grid(z):
    return 8 << z, 4 << z


def cut(arr, z, dd, q=78):
    """Dlaždice stupně z z mapy arr (H × W × 3, uint8; W = 8192 · 2^z). Okraj: vodorovně přes šev, svisle opakováním krajního řádku."""
    gw, gh = grid(z)
    H, W = arr.shape[:2]
    assert W == gw * T and H == gh * T, (W, H, z)
    for f in os.listdir(dd):
        if f.startswith(f'{z}-'):
            os.remove(os.path.join(dd, f))
    tot = 0
    for ty in range(gh):
        rows = np.clip(np.arange(ty * T - 1, ty * T + T + 1), 0, H - 1)
        band = np.asarray(arr[rows])
        for tx in range(gw):
            cols = np.arange(tx * T - 1, tx * T + T + 1) % W
            p = os.path.join(dd, f'{z}-{ty}-{tx}.webp')
            Image.fromarray(np.ascontiguousarray(band[:, cols])).save(p, 'WEBP', quality=q, method=5)
            tot += os.path.getsize(p)
    print(f'stupeň {z}: {gw * gh} dlaždic, {tot / 1048576:.1f} MB (kvalita {q})')
    return tot


def down2(arr, S=512):
    """zmenšení průměrem 2 × 2 (po pruzích – vstup může být memmap)"""
    H, W = arr.shape[:2]
    out = np.empty((H // 2, W // 2, 3), np.uint8)
    for y in range(0, H, S):
        a = np.asarray(arr[y : y + S], np.float32)
        out[y // 2 : (y + len(a)) // 2] = np.clip(a.reshape(len(a) // 2, 2, W // 2, 2, 3).mean((1, 3)) + 0.5, 0, 255).astype(np.uint8)
    return out


def pyramid(arr, zmax, dd, q=78, qz=None):
    """stupeň zmax z arr a všechny hrubší až po 0; qz = {z: kvalita} pro jednotlivé stupně"""
    os.makedirs(dd, exist_ok=True)
    tot = 0
    for z in range(zmax, -1, -1):
        tot += cut(arr, z, dd, (qz or {}).get(z, q))
        if z:
            arr = down2(arr)
    return tot


def manifest(bid, zmax, pole=0):
    """pole = počet krajních řádků nejjemnějšího stupně, které u každého pólu chybí (viz drop_poles)"""
    jp = os.path.join(ROOT, 'src', 'data', 'l2.json')
    man = json.load(open(jp)) if os.path.exists(jp) else {}
    man[bid] = [zmax, pole] if pole else zmax
    json.dump(dict(sorted(man.items())), open(jp, 'w'))


def drop_poles(dd, z, n=1):
    """smaže n krajních řádků stupně z u obou pólů (shader je tam skoro nikdy neukáže – rovnoběžky jsou roztažené); vrací ušetřené B"""
    gw, gh = grid(z)
    tot = 0
    for ty in list(range(n)) + list(range(gh - n, gh)):
        for tx in range(gw):
            p = os.path.join(dd, f'{z}-{ty}-{tx}.webp')
            if os.path.exists(p):
                tot += os.path.getsize(p)
                os.remove(p)
    print(f'stupeň {z}: bez {n} řádků u pólů, ušetřeno {tot / 1048576:.1f} MB')
    return tot


def assemble(dd, z):
    """mapa stupně z složená z jeho dlaždic (bez okrajů)"""
    gw, gh = grid(z)
    arr = np.empty((gh * T, gw * T, 3), np.uint8)
    for ty in range(gh):
        for tx in range(gw):
            t = np.asarray(Image.open(os.path.join(dd, f'{z}-{ty}-{tx}.webp')).convert('RGB'))
            arr[ty * T : (ty + 1) * T, tx * T : (tx + 1) * T] = t[1:-1, 1:-1]
    return arr


if __name__ == '__main__':
    bid = sys.argv[1]
    q = int(sys.argv[2]) if len(sys.argv) > 2 else 78
    dd = os.path.join(ROOT, 'dist', 'maps', 'l2', bid)
    old = [f for f in os.listdir(dd) if re.fullmatch(r'\d+-\d+\.webp', f)]
    if old:
        gw = 1 + max(int(f.split('-')[1].split('.')[0]) for f in old)
        z = {8: 0, 16: 1, 32: 2}[gw]
        for f in old:
            os.rename(os.path.join(dd, f), os.path.join(dd, f'{z}-{f}'))
        print(f'{bid}: {len(old)} dlaždic přejmenováno na stupeň {z}')
    zs = sorted({int(f.split('-')[0]) for f in os.listdir(dd) if f.endswith('.webp')})
    zmax = zs[-1]
    missing = [z for z in range(zmax) if z not in zs]
    if missing:
        arr = assemble(dd, zmax)
        for z in range(zmax - 1, -1, -1):
            arr = down2(arr)
            if z in missing:
                cut(arr, z, dd, q)
    manifest(bid, zmax)
    print(f'{bid}: stupně 0–{zmax}')
