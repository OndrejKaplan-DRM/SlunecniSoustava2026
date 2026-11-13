# Dlouhodobá teorie planet a Pluta pro časy mimo okno 1900–2050 (v něm dál platí přesnější fit na DE421).
# Fit na JPL DE422 v okně Y0–Y1 (výchozí −1000 až 3000):
#  1) střední elementy (a, e, I, L, ϖ, Ω) jako polynomy 2. stupně v T (století od J2000), nejmenší čtverce;
#  2) dlouhoperiodické členy střední délky (perioda > 150 let, např. velká nerovnost Jupiter–Saturn 2λJ − 5λS) → λ* = L(T) + Σ;
#  3) zbytek v ekliptikální délce (0), šířce (1) a poměrném průvodiči (2) = Σ (A + A1·T)·cos(arg) + (B + B1·T)·sin(arg),
#     arg = j·λ*p + k·λ*q + m·ϖp + n·ϖq (+ Ωp nebo Ωq u šířky), j + k + m + n (+1) = 0 (d'Alembertovo pravidlo);
#     členy vybírá hladový algoritmus (orthogonal matching pursuit) z kombinací s rušícími planetami.
# Výstup: tools/out/planetlong.json; do katalogu ho zapíše tools/model/pack_long.mjs.
import json, math, sys, os, numpy as np
from scipy.optimize import least_squares
sys.path.insert(0, os.path.dirname(__file__))
import de422 as de
J2000 = 2451545.0; DEG = math.pi / 180
Y0, Y1 = (int(os.environ.get('Y0', -1000)), int(os.environ.get('Y1', 3000)))
MAXT = int(os.environ.get('MAXT', 70))
ONLY = sys.argv[1].split(',') if len(sys.argv) > 1 else None
NAMES = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']
PERT = {'mercury': ['venus', 'earth', 'jupiter', 'saturn'], 'venus': ['mercury', 'earth', 'mars', 'jupiter', 'saturn'], 'earth': ['venus', 'mars', 'jupiter', 'saturn'],
        'mars': ['venus', 'earth', 'jupiter', 'saturn'], 'jupiter': ['saturn', 'uranus', 'neptune'], 'saturn': ['jupiter', 'uranus', 'neptune'],
        'uranus': ['jupiter', 'saturn', 'neptune'], 'neptune': ['jupiter', 'saturn', 'uranus'], 'pluto': ['jupiter', 'saturn', 'uranus', 'neptune']}
GIANT = {'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'}
HERE = os.path.dirname(__file__)
CAT = {b['id']: b for b in json.load(open(os.path.join(HERE, '../../src/data/cat.json')))['bodies']}
def kepler(M, e):
    E = M + e * np.sin(M)
    for _ in range(12): E = E - (E - e * np.sin(E) - M) / (1 - e * np.cos(E))
    return E
def elpos(p, T):
    a, e, I, L, wb, O = [p[k] + p[6 + k] * T + p[12 + k] * T * T for k in range(6)]
    I, L, wb, O = I * DEG, L * DEG, wb * DEG, O * DEG
    E = kepler(np.mod(L - wb, 2 * np.pi), e); x = a * (np.cos(E) - e); y = a * np.sqrt(1 - e * e) * np.sin(E); w = wb - O
    cO, sO, cI, sI, cw, sw = np.cos(O), np.sin(O), np.cos(I), np.sin(I), np.cos(w), np.sin(w)
    return np.stack([(cO * cw - sO * sw * cI) * x + (-cO * sw - sO * cw * cI) * y, (sO * cw + cO * sw * cI) * x + (-sO * sw + cO * cw * cI) * y, sw * sI * x + cw * sI * y], -1)
def elpos_dl(p, T, dl, ex=None):
    q = np.array(p, float); P = [q[k] + q[6 + k] * T + q[12 + k] * T * T for k in range(6)]; P[3] = P[3] + dl
    if ex is not None: P[0] = P[0] + ex[0]; P[1] = P[1] + ex[1]; P[4] = P[4] + ex[2]
    a, e, I, L, wb, O = P; I, L, wb, O = I * DEG, L * DEG, wb * DEG, O * DEG
    E = kepler(np.mod(L - wb, 2 * np.pi), e); x = a * (np.cos(E) - e); y = a * np.sqrt(1 - e * e) * np.sin(E); w = wb - O
    cO, sO, cI, sI, cw, sw = np.cos(O), np.sin(O), np.cos(I), np.sin(I), np.cos(w), np.sin(w)
    return np.stack([(cO * cw - sO * sw * cI) * x + (-cO * sw - sO * cw * cI) * y, (sO * cw + cO * sw * cI) * x + (-sO * sw + cO * cw * cI) * y, sw * sI * x + cw * sI * y], -1)
def sph(v): r = np.linalg.norm(v, axis=-1); return np.arctan2(v[..., 1], v[..., 0]), np.arcsin(v[..., 2] / r), r
wrap = lambda x: (x + np.pi) % (2 * np.pi) - np.pi
rng = np.random.default_rng(11)
NS, NF = 6000, 40000
js, jf = [J2000 + (rng.uniform(Y0, Y1, n) - 2000) * 365.25 for n in (NS, NF)]
Ts, Tf = (js - J2000) / 36525, (jf - J2000) / 36525
# 1) elementy + 2) dlouhoperiodické členy střední délky (uvnitř Keplerovy rovnice): frekvence z husté mřížky period 150–6000 let
EL = {}; RS = {}; RF = {}; LP = {n: [] for n in NAMES}
def lpsum(lp, T):
    v = 0
    for t in lp: v = v + t[1] * np.cos(t[0] * T) + t[2] * np.sin(t[0] * T)
    return v
def lpw(lp, T):
    v = 0
    for t in lp: v = v + t[7] * np.cos(t[0] * T) + t[8] * np.sin(t[0] * T)
    return v
def ref(name, jd):
    # Země: fit na těžiště Země–Měsíc (výkyv Země kolem něj, 6″, dopočítá aplikace z polohy Měsíce)
    if name == 'earth': return de.eq2ecl(de.pos('earthmoon', jd) - de.pos('sun', jd)) / de.AU
    return de.eq2ecl(de.helio(name, jd)) / de.AU
FG = np.arange(1 / 6000, 1 / 150, 1 / 48000)  # 1/rok
for name in NAMES:
    lo0, la0, r0 = sph(ref(name, js)); lf0, laf0, rf0 = sph(ref(name, jf))
    o = CAT[name]['orbit']; p0 = np.array(list(o['el']) + list(o['rate']) + [0] * 6, float)
    sc = np.array([1e-6, 1e-6, 1e-5, 1e-4, 1e-3, 1e-3, 1e-7, 1e-7, 1e-5, 1e-4, 1e-3, 1e-3, 1e-8, 1e-8, 1e-6, 1e-6, 1e-4, 1e-4])
    fr = []
    def model(p, T):
        lp = [(2 * math.pi * 100 * p[18 + 3 * n], p[19 + 3 * n], p[20 + 3 * n]) for n in range(len(fr))]
        q = np.array(p[:18]); 
        if not fr: return elpos(q, T)
        nx = 18 + 3 * len(fr); ex = None
        if len(p) > nx:  # dlouhoperiodické kmitání a, e, ϖ na stejných frekvencích
            ex = [sum(p[nx + 6 * n + 2 * k] * np.cos(lp[n][0] * T) + p[nx + 6 * n + 2 * k + 1] * np.sin(lp[n][0] * T) for n in range(len(fr))) for k in range(3)]
        return elpos_dl(q, T, lpsum(lp, T), ex)
    def res(p):
        lo, la, r = sph(model(p, Ts)); return np.concatenate([wrap(lo - lo0) * np.cos(la0), la - la0, (r - r0) / r0])
    best = None
    for dn in ([0] if name != 'pluto' else [0, -0.5, 0.5, -1, 1, -1.5, 1.5, -2, 2]):
        q = p0.copy(); q[9] += dn
        s = least_squares(res, q, x_scale=sc, method='trf', max_nfev=300)
        if best is None or s.cost < best.cost: best = s
    p = best.x
    for it in range(9):
        lo, la, r = sph(model(p, Ts)); y = wrap(lo0 - lo); y = y - y.mean()
        g = np.array([0 if any(abs(f - f2) < 1 / 4000 for f2 in fr) else (lambda c, s_: np.dot(y, c) ** 2 / np.dot(c, c) + np.dot(y, s_) ** 2 / np.dot(s_, s_))(np.cos(2 * math.pi * 100 * f * Ts), np.sin(2 * math.pi * 100 * f * Ts)) for f in FG])
        k = int(g.argmax())
        if math.sqrt(2 * g[k] / NS) < 4 / 3600 * DEG: break
        c_, s_ = np.cos(2 * math.pi * 100 * FG[k] * Ts), np.sin(2 * math.pi * 100 * FG[k] * Ts)
        fr.append(float(FG[k])); p = np.concatenate([p, [FG[k], np.dot(y, c_) / np.dot(c_, c_) / DEG, np.dot(y, s_) / np.dot(s_, s_) / DEG]])
        lb = np.full(len(p), -np.inf); ub = np.full(len(p), np.inf)
        for n in range(len(fr)): lb[18 + 3 * n] = fr[n] * (1 - 1e-9); ub[18 + 3 * n] = fr[n] * (1 + 1e-9)  # frekvence pevné (zpřesňování vedlo ke slévání dvojic)
        s = least_squares(res, p, x_scale=np.concatenate([sc, [2e-6, 1e-5, 1e-5] * len(fr)]), bounds=(lb, ub), method='trf', max_nfev=200); p = s.x
        fr = [float(p[18 + 3 * n]) for n in range(len(fr))]
    if fr and name in GIANT:
        nx = len(p); p = np.concatenate([p, np.zeros(6 * len(fr))])
        lb = np.full(len(p), -np.inf); ub = np.full(len(p), np.inf)
        for n in range(len(fr)): lb[18 + 3 * n] = fr[n] * (1 - 1e-9); ub[18 + 3 * n] = fr[n] * (1 + 1e-9)
        s = least_squares(res, p, x_scale=np.concatenate([sc, [2e-6, 1e-5, 1e-5] * len(fr), [1e-6, 1e-6, 1e-6, 1e-6, 1e-3, 1e-3] * len(fr)]), bounds=(lb, ub), method='trf', max_nfev=120); p = s.x
    nx = 18 + 3 * len(fr)
    EL[name] = p[:18]; LP[name] = [[2 * math.pi * 100 * p[18 + 3 * n], float(p[19 + 3 * n]), float(p[20 + 3 * n])] + ([float(v) for v in p[nx + 6 * n:nx + 6 * n + 6]] if len(p) > nx else [0.0] * 6) for n in range(len(fr))]
    def resid(lo0, la0, r0, T):
        lo, la, r = sph(model(p, T)); return [wrap(lo0 - lo), la0 - la, (r0 - r) / r]
    RS[name], RF[name] = resid(lo0, la0, r0, Ts), resid(lf0, laf0, rf0, Tf)
    print(f'{name:8s} elementy: délka rms {RF[name][0].std() / DEG * 3600:8.1f}″; dlouhé členy: ' + ', '.join(f'{1 / f:.0f} let {math.hypot(p[19 + 3 * n], p[20 + 3 * n]) * 3600:.0f}″' for n, f in enumerate(fr)), flush=True)
pol = lambda name, k, T: (EL[name][k] + EL[name][6 + k] * T + EL[name][12 + k] * T * T) * DEG
def lamstar(name, T): return pol(name, 3, T) + lpsum(LP[name], T) * DEG
def wbstar(name, T): return pol(name, 4, T) + lpw(LP[name], T) * DEG
# 3) periodické členy
out = {}
for name in NAMES:
    if ONLY and name not in ONLY: continue
    p = EL[name]; big = name in GIANT; JR = 10 if big else 8; KR = 10 if big else 9
    cands = [(j, name, 0, -j, 0, 0) for j in range(1, 10)]
    for q in PERT[name]:
        for j in range(-JR, JR + 1):
            for k in range(-KR, KR + 1):
                if k == 0 or (j == 0 and k < 0): continue
                s = -(j + k)
                for m in range(min(0, s) - 1, max(0, s) + 2): cands.append((j, q, k, m, s - m, 0))
    lat = [(j, name, 0, -j - 1, 0, 1) for j in range(-9, 10)]
    for q in PERT[name]:
        for j in range(-JR, JR + 1):
            for k in range(-KR, KR + 1):
                if k == 0: continue
                s = -(j + k) - 1
                for m in range(min(0, s), max(0, s) + 1):
                    for nd in (1, 2): lat.append((j, q, k, m, s - m, nd))
    def arg(c, T):
        j, q, k, m, n, nd = c
        a = j * lamstar(name, T) + m * wbstar(name, T)
        if k or n: a = a + k * lamstar(q, T) + n * wbstar(q, T)
        if nd: a = a + pol(name if nd == 1 else q, 5, T)
        return a
    terms = []; stat = []
    for c in range(3):
        cs = lat if c == 1 else cands
        Cm = np.empty((NS, len(cs)), np.float32); Sm = np.empty((NS, len(cs)), np.float32)
        for xi, x in enumerate(cs): a_ = arg(x, Ts); Cm[:, xi] = np.cos(a_); Sm[:, xi] = np.sin(a_)
        cc, ss = (Cm * Cm).sum(0), (Sm * Sm).sum(0)
        y = RS[name][c].astype(np.float32); chosen = []; lim = (0.5 / 3600 * DEG) if c < 2 else 2.5e-6
        def design(T, ch):
            cols = []
            for ci in ch:
                a = arg(cs[ci], T); cols += [np.cos(a), np.sin(a), np.cos(a) * T, np.sin(a) * T]
            return np.stack(cols, 1)
        for it in range(MAXT):
            g = (y @ Cm) ** 2 / cc + (y @ Sm) ** 2 / ss
            g[chosen] = 0
            ci = int(g.argmax())
            if math.sqrt(2 * g[ci] / NS) < lim: break
            chosen.append(ci)
            Xs = design(Ts, [ci]) if len(chosen) == 1 else np.concatenate([Xs, design(Ts, [ci])], 1)
            coef, *_ = np.linalg.lstsq(Xs, RS[name][c], rcond=None); y = (RS[name][c] - Xs @ coef).astype(np.float32)
        del Cm, Sm
        if chosen:
            X = design(Tf, chosen); coef, *_ = np.linalg.lstsq(X, RF[name][c], rcond=None); fin = RF[name][c] - X @ coef
        else: coef = []; fin = RF[name][c]
        stat.append((len(chosen), float(np.sqrt((RF[name][c] ** 2).mean())), float(np.sqrt((fin ** 2).mean())), float(np.abs(fin).max())))
        for n, ci in enumerate(chosen):
            j, q, k, m, nn, nd = cs[ci]
            terms.append([c, j, NAMES.index(q), k, m, nn, nd] + [float(v) for v in coef[4 * n:4 * n + 4]])
    out[name] = {'el': list(p[:6]), 'rate': list(p[6:12]), 'quad': list(p[12:]), 'lp': LP[name], 'terms': terms, 'win': [Y0, Y1]}
    u = lambda v, c: v / DEG * 3600 if c < 2 else v * 1e6
    print(f"{name:8s} délka {stat[0][0]:2d} čl. {u(stat[0][1],0):8.1f}″ → {u(stat[0][2],0):6.2f}″ (max {u(stat[0][3],0):6.1f}) | šířka {stat[1][0]:2d} čl. {u(stat[1][1],1):7.1f}″ → {u(stat[1][2],1):6.2f}″ | průvodič {stat[2][0]:2d} čl. {u(stat[2][1],2):8.1f} → {u(stat[2][2],2):6.2f} ppm", flush=True)
dst = os.path.join(HERE, '../out/planetlong.json')
if ONLY and os.path.exists(dst): prev = json.load(open(dst)); prev.update(out); out = prev
json.dump(out, open(dst, 'w'))
