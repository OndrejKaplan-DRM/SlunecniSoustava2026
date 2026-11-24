# Dráhy planetek, trpasličích planet, kentaurů a transneptunických těles (katalog: kind 'kep', bez komet) proti JPL Horizons.
# Dosud: jedna kuželosečka (oskulační elementy k jednomu datu) → v jiných desetiletích chyby stupňů (Ceres 1912: 15°).
# Nově: střední elementy s lineárním stáčením uzlu a perihelu (Od, wd ve °/den od J2000) a středním pohybem z velké poloosy,
# fit nejmenších čtverců na heliocentrické polohy z Horizons 1900–2100 (krok 40 dní, každý třetí bod vynechán na kontrolu).
# Výstup tools/out/planetky_fit.json; zápis do katalogu: node tools/model/vernost/zapis_planetky.mjs (jen kde je lepší).
# Použití: python3 -I tools/model/vernost/fit_planetky.py [id …]
import json, math, os, re, sys
import numpy as np
from scipy.optimize import least_squares

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hz  # noqa: E402

GK2 = 0.01720209895 ** 2
J2000 = 2451545.0
D2R = math.pi / 180
NUM = {'eros': 433, 'vesta': 4, 'ceres': 1, 'ryugu': 162173, 'didymos': 65803, 'bennu': 101955, 'apophis': 99942, 'itokawa': 25143,
       'phaethon': 3200, 'ida': 243, 'pallas': 2, 'juno': 3, 'eris': 136199, 'kleopatra': 216, 'lutetia': 21, 'hygiea': 10,
       'mathilde': 253, 'psyche': 16, 'gaspra': 951, 'cruithne': 3753, 'steins': 2867, 'iris': 7, 'hebe': 6, 'flora': 8, 'eunomia': 15,
       'icarus': 1566, 'haumea': 136108, 'makemake': 136472, 'arrokoth': 486958, 'gonggong': 225088, 'quaoar': 50000, 'orcus': 90482,
       'interamnia': 704, 'euphrosyne': 31, 'chiron': 2060, 'davida': 511, 'sedna': 90377, 'chariklo': 10199, 'kalliope': 22,
       'cybele': 65, 'sylvia': 87, 'sisyphus': 1866, 'eureka': 5261, 'kamooalewa': 469219, 'bamberga': 324, 'melpomene': 18,
       'victoria': 12, 'fortuna': 19, 'daphne': 41, 'julia': 89, 'massalia': 20, 'irene': 14, 'thisbe': 88, 'parthenope': 11,
       'herculin': 532, 'astraea': 5, 'egeria': 13, 'amphitrite': 29, 'harmonia': 40, 'salacia': 120347, 'elektra': 130, 'nysa': 44,
       'varda': 174567, 'eugenia': 45, 'varuna': 20000, 'laetitia': 39, 'eleonora': 354, 'hesperia': 69, 'huya': 38628,
       'patientia': 451, 'ursula': 375, 'themis': 24, 'doris': 48, 'dembowska': 349, 'diotima': 423, 'hermione': 121, 'camilla': 107,
       'eos': 221, 'alauda': 702, 'duende': 367943, 'g_kun_homdima': 229762}


def kepler(M, e):
    E = M + e * np.sin(M)
    for _ in range(30):
        E = E - (E - e * np.sin(E) - M) / (1 - e * np.cos(E))
    return E


def pos(p, t):
    """p = [a AU, e, i°, O0°, Od °/den, w0°, wd °/den, Tp (dny od J2000)], t = dny od J2000 → polohy (N×3), ekliptika J2000."""
    a, e, i, O0, Od, w0, wd, Tp = p
    n = math.sqrt(GK2 / a ** 3)
    E = kepler(n * (t - Tp), e)
    x, y = a * (np.cos(E) - e), a * math.sqrt(1 - e * e) * np.sin(E)
    O, w, ii = (O0 + Od * t) * D2R, (w0 + wd * t) * D2R, i * D2R
    cO, sO, cw, sw, ci, si = np.cos(O), np.sin(O), np.cos(w), np.sin(w), math.cos(ii), math.sin(ii)
    X = (cO * cw - sO * sw * ci) * x + (-cO * sw - sO * cw * ci) * y
    Y = (sO * cw + cO * sw * ci) * x + (-sO * sw + cO * cw * ci) * y
    Z = (sw * si) * x + (cw * si) * y
    return np.stack([X, Y, Z], 1)


def angerr(A, B):
    c = np.einsum('ij,ij->i', A, B) / np.linalg.norm(A, axis=1) / np.linalg.norm(B, axis=1)
    return np.degrees(np.arccos(np.clip(c, -1, 1)))


def vectors(num, name):
    t = hz.ask({'COMMAND': f'{num};', 'EPHEM_TYPE': 'VECTORS', 'CENTER': '500@10', 'REF_PLANE': 'ECLIPTIC', 'REF_SYSTEM': 'ICRF',
                'START_TIME': '1900-01-01', 'STOP_TIME': '2100-01-01', 'STEP_SIZE': '40d', 'TIME_TYPE': 'TT', 'VEC_TABLE': '1',
                'CSV_FORMAT': 'YES', 'OUT_UNITS': 'AU-D', 'VEC_LABELS': 'NO'})
    m = re.search(r'Target body name:\s*(.+?)\s*\{', t)
    r = hz.rows(t)
    if not r:
        raise RuntimeError(re.sub(r'\s+', ' ', t[-300:]))
    tgt = m.group(1) if m else '?'
    R = np.array([[float(x.split(',')[0])] + [float(v) for v in x.split(',')[2:5]] for x in r])
    return tgt, R


def main():
    cat = json.load(open('src/data/cat.json'))
    only = set(sys.argv[1:])
    outp = 'tools/out/planetky_fit.json'
    res = json.load(open(outp)) if os.path.exists(outp) else {}
    for b in cat['bodies']:
        o = b['orbit']
        if o['kind'] != 'kep' or b.get('type') not in ('asteroid', 'tno', 'dwarf', 'centaur') or b['id'] not in NUM:
            continue
        if only and b['id'] not in only:
            continue
        if b['id'] in res and 'kand' in res[b['id']] and not only:
            continue  # navázání po přerušení
        try:
            tgt, R = vectors(NUM[b['id']], b['name'])
        except Exception as ex:
            print(b['id'], 'CHYBA', ex, flush=True)
            continue
        t, P = R[:, 0] - J2000, R[:, 1:4]
        a0 = o['q'] / (1 - o['e'])
        p0 = [a0, o['e'], o['i'], o['O'], 0.0, o['w'], 0.0, o['Tp'] - J2000]
        old = angerr(pos(p0, t), P)
        test = (np.arange(len(t)) % 3) == 0
        ted = (t > 0) & (t < 50 * 365.25)  # roky 2000–2050: tady se nesmí nic zhoršit
        sc = np.array([1, 1, 1, 1, 1e-4, 1, 1e-4, 10])
        lo = np.array([0.1, 0, -180, -720, -1, -720, -1, -1e9]) / sc
        hi = np.array([1e4, 0.99, 180, 720, 1, 720, 1, 1e9]) / sc

        def solve(sel, rates):
            m = sel & ~test
            if rates:
                f = lambda x: (pos(x * sc, t[m]) - P[m]).ravel()
                return least_squares(f, np.array(p0) / sc, x_scale='jac', bounds=(lo, hi), max_nfev=400).x * sc
            k = [0, 1, 2, 3, 5, 7]  # bez stáčení (blízkozemní planetky: jen kratší okno)
            def f(x):
                q = np.array(p0, float); q[k] = x; return (pos(q, t[m]) - P[m]).ravel()
            x = least_squares(f, np.array(p0)[k], x_scale='jac', max_nfev=400).x
            q = np.array(p0, float); q[k] = x
            return q
        Y = (t / 365.25)
        kand = {'1900–2100': solve(np.ones_like(t, bool), True), '1980–2060': solve((Y > -20) & (Y < 60), True),
                '2010–2040': solve((Y > 10) & (Y < 40), False)}
        ev = {k: (float(np.sqrt((angerr(pos(v, t), P) ** 2).mean())), float(np.sqrt((angerr(pos(v, t[ted]), P[ted]) ** 2).mean())))
              for k, v in kand.items()}
        p = kand['1900–2100']
        e_all, e_test = angerr(pos(p, t), P), angerr(pos(p, t[test]), P[test])
        r = {'cil': tgt, 'p': [float(v) for v in p], 'old_rms': float(np.sqrt((old ** 2).mean())), 'old_max': float(old.max()),
             'q': float(p[0] * (1 - p[1])), 'old_ted': float(np.sqrt((old[ted] ** 2).mean())), 'ted': float(np.sqrt((e_all[ted] ** 2).mean())),
             'rms': float(np.sqrt((e_all ** 2).mean())), 'rms_test': float(np.sqrt((e_test ** 2).mean())), 'max': float(e_all.max()),
             'n': int(len(t)), 'kand': {k: {'p': [float(x) for x in kand[k]], 'rms': ev[k][0], 'ted': ev[k][1]} for k in kand}}
        res[b['id']] = r
        json.dump(res, open(outp + '.tmp', 'w'), indent=0)
        os.replace(outp + '.tmp', outp)
        print(f"{b['id']:12s} {tgt[:24]:24s} heliocentricky dřív rms {r['old_rms']:7.3f}° max {r['old_max']:7.3f}°  →  "
              f"{r['rms']:6.3f}° (kontrola {r['rms_test']:6.3f}°, max {r['max']:6.3f}°)", flush=True)
    print('uloženo:', outp)


main()
