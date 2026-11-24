# Doplňkové členy pro model Měsíce (core/sim.js, moonGeo – zkrácená teorie ELP podle Meeuse, kap. 47).
# Rezidua proti JPL Horizons (DE441) v ekliptické délce, šířce a vzdálenosti se fitují jako součty sin a cos
# celočíselných kombinací lunárních argumentů D, M, M', F (stejné polynomy jako v sim.js). Fit na 1900–2100
# (krok 25 h), kontrola na nezávislých datech 1000–3000 (krok 1 rok) a hustě na roce 2024.
# Výstup src/data/mesic.json: {"l": [[d, m, mp, f, sin″, cos″], ...], "b": [...], "r": [[..., sin km, cos km]]}
# Použití: python3 -I tools/model/vernost/fit_mesic.py <složka s res_*.json>  (rezidua staví mesic_rezidua.mjs)
import json, os, sys
import numpy as np

D2R = np.pi / 180


def args(jd):
    T = (jd - 2451545.0) / 36525
    T2, T3, T4 = T * T, T ** 3, T ** 4
    D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T2 + T3 / 545868 - T4 / 113065000
    M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T2 + T3 / 24490000
    Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T2 + T3 / 69699 - T4 / 14712000
    F = 93.272095 + 483202.0175233 * T - 0.0036539 * T2 - T3 / 3526000 + T4 / 863310000
    return np.stack([D, M, Mp, F]) * D2R


def combos(odd_f):
    out = []
    for d in range(0, 7):
        for m in range(-2, 3):
            for mp in range(-4, 5):
                for f in range(-4, 5):
                    if (f % 2 == 1) != odd_f:
                        continue
                    c = (d, m, mp, f)
                    nz = [x for x in c if x]
                    if not nz or nz[0] < 0:
                        continue
                    out.append(c)
    return out


def design(A, C):
    th = np.array(C, float) @ A  # kombinace × body
    return np.concatenate([np.sin(th), np.cos(th)]).T


def fit(jd, y, C, lam=1e-6):
    A = args(jd)
    n = 2 * len(C)
    AtA = np.zeros((n, n))
    Aty = np.zeros(n)
    for k in range(0, len(jd), 8000):
        X = design(A[:, k:k + 8000], C)
        AtA += X.T @ X
        Aty += X.T @ y[k:k + 8000]
    AtA += lam * np.eye(n) * len(jd)
    return np.linalg.solve(AtA, Aty)


def evalc(jd, C, w):
    X = design(args(jd), C)
    return X @ w


def main():
    d = sys.argv[1]
    L = lambda f: np.array(json.load(open(os.path.join(d, f'res_{f}.json'))))
    tr = np.concatenate([L('f1'), L('f2')])
    tests = {k: L(k) for k in ('tisic', 'r2024', 'dlouhe')}
    res = {}
    for comp, col, odd, thr, unit in (('l', 1, False, 0.25, '″'), ('b', 2, True, 0.25, '″'), ('r', 3, False, 0.15, ' km')):
        C = combos(odd)
        y = tr[:, col]
        w = fit(tr[:, 0], y, C)
        amp = np.hypot(w[:len(C)], w[len(C):])
        keep = [k for k in np.argsort(-amp) if amp[k] > thr]
        C2 = [C[k] for k in keep]
        w2 = fit(tr[:, 0], y, C2, lam=1e-9)
        terms = [[*C2[k], round(float(w2[k]), 3), round(float(w2[len(C2) + k]), 3)] for k in range(len(C2))]
        res[comp] = terms
        rm = lambda a: float(np.sqrt(np.mean(a ** 2)))
        line = f'{comp}: {len(C2):3d} členů  fit 1900–2100 rms {rm(y):6.2f} → {rm(y - evalc(tr[:, 0], C2, w2)):5.2f}{unit}'
        for k, t in tests.items():
            yt = t[:, col]
            line += f' | {k} {rm(yt):6.2f} → {rm(yt - evalc(t[:, 0], C2, w2)):5.2f}'
        print(line, flush=True)
    res['zdroj'] = 'fit na JPL Horizons (DE441) 1900–2100, tools/model/vernost/fit_mesic.py'
    json.dump(res, open('src/data/mesic.json', 'w'), separators=(',', ':'))
    print('uloženo src/data/mesic.json', os.path.getsize('src/data/mesic.json'), 'B')


main()
