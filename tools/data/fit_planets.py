# Iterace 2 – „matematická zkratka“ pro efemeridy planet: DE421 (27 MB Čebyševových koeficientů) zhuštěné do ~1 kB na planetu.
# 1) střední elementy + lineární změny (12 čísel) fitované nejmenšími čtverci na DE421 1900–2050 (místo tabulky Standish);
# 2) zbytek v ekliptikální délce, šířce a průvodiči jako součet harmonických členů, jejichž argumenty jsou kombinace středních
#    délek planety a rušitelů (Jupiter, Saturn, Uran, Neptun): j·λp + k·λq (|j|,|k| ≤ 6) – výběr členů hladovým algoritmem
#    (orthogonal matching pursuit) podle snížení chyby, nejvýš 24 členů na souřadnici.
# Výstup: out/planetfit.json {planeta: {el, rate, terms: [[souř, j, q, k, A, B]], rms_as}} + kontrola na nezávislých časech.
import json, math, sys, numpy as np
from scipy.optimize import least_squares
sys.path.insert(0, '.')
from deeph import helio, eq2ecl, AU
from bodies_extra import JPL
J2000 = 2451545.0; DEG = math.pi / 180
def kepler(M, e):
    E = M + e * np.sin(M)
    for _ in range(8): E = E - (E - e * np.sin(E) - M) / (1 - e * np.cos(E))
    return E
def jplpos(el, rate, jd):
    T = (jd - J2000) / 36525; a = el[0] + rate[0] * T; e = el[1] + rate[1] * T; I = (el[2] + rate[2] * T) * DEG; L = (el[3] + rate[3] * T) * DEG; wb = (el[4] + rate[4] * T) * DEG; O = (el[5] + rate[5] * T) * DEG
    E = kepler(np.mod(L - wb, 2 * np.pi), e); x = a * (np.cos(E) - e); y = a * np.sqrt(1 - e * e) * np.sin(E); w = wb - O
    cO, sO, cI, sI, cw, sw = np.cos(O), np.sin(O), np.cos(I), np.sin(I), np.cos(w), np.sin(w)
    X = (cO * cw - sO * sw * cI) * x + (-cO * sw - sO * cw * cI) * y; Y = (sO * cw + cO * sw * cI) * x + (-sO * sw + cO * cw * cI) * y; Z = sw * sI * x + cw * sI * y
    return np.stack([X, Y, Z], -1)
def sph(v): r = np.linalg.norm(v, axis=-1); return np.arctan2(v[..., 1], v[..., 0]), np.arcsin(v[..., 2] / r), r
KEY = {'mercury': 'Mercury', 'venus': 'Venus', 'earth': 'Earth', 'mars': 'Mars', 'jupiter': 'Jupiter', 'saturn': 'Saturn', 'uranus': 'Uranus', 'neptune': 'Neptune', 'pluto': 'Pluto'}
jd = np.linspace(2415030.5, 2469800.5, 7000); rng = np.random.default_rng(5); jt = rng.uniform(2415030.5, 2469800.5, 1500)
def meanlon(name, t): el, rt = JPL[KEY[name]]; return (el[3] + rt[3] * (t - J2000) / 36525) * DEG
out = {}
for name in KEY:
    R = eq2ecl(helio(name, jd)) / AU; Rt = eq2ecl(helio(name, jt)) / AU
    el0, rt0 = JPL[KEY[name]]
    p0 = np.array(el0 + rt0)
    def res(p):
        P = jplpos(p[:6], p[6:], jd); lo, la, r = sph(P); lo0, la0, r0 = sph(R)
        return np.concatenate([((lo - lo0 + np.pi) % (2 * np.pi) - np.pi) * np.cos(la0), la - la0, (r - r0) / r0])
    sc = np.array([1e-6, 1e-6, 1e-5, 1e-4, 1e-3, 1e-3, 1e-6, 1e-6, 1e-4, 1e-3, 1e-2, 1e-2])
    s = least_squares(res, p0, x_scale=sc, method='trf', max_nfev=400)
    p = s.x; el, rt = list(p[:6]), list(p[6:])
    # harmonické členy zbytku (délka, šířka, poměrný průvodič)
    lo, la, r = sph(jplpos(el, rt, jd)); lo0, la0, r0 = sph(R)
    resid = [((lo0 - lo + np.pi) % (2 * np.pi) - np.pi), la0 - la, (r0 - r) / r0]
    lp = meanlon(name, jd); qs = ['jupiter', 'saturn', 'uranus', 'neptune']
    cands = []
    for q in qs:
        lq = meanlon(q, jd)
        for j in range(-6, 7):
            for k in range(-6, 7):
                if (j == 0 and k == 0) or (q == name and k != 0): continue
                arg = j * lp + (k * lq if q != name else 0)
                cands.append((j, q, k, arg))
    terms = []
    for c in range(3):
        y = resid[c].copy(); chosen = []
        for it in range(24):
            best = None
            for (j, q, k, arg) in cands:
                ca, sa = np.cos(arg), np.sin(arg); A = np.dot(y, ca) / np.dot(ca, ca); B = np.dot(y, sa) / np.dot(sa, sa); red = A * A * np.dot(ca, ca) + B * B * np.dot(sa, sa)
                if best is None or red > best[0]: best = (red, j, q, k)
            if best[0] < 1e-18 * len(y): break
            chosen.append(best[1:])
            X = np.stack(sum([[np.cos(j * lp + (k * meanlon(q, jd) if q != name else 0)), np.sin(j * lp + (k * meanlon(q, jd) if q != name else 0))] for j, q, k in chosen], []), 1)
            coef, *_ = np.linalg.lstsq(X, resid[c], rcond=None); y = resid[c] - X @ coef
        for n, (j, q, k) in enumerate(chosen): terms.append([c, j, q, k, float(coef[2 * n]), float(coef[2 * n + 1])])
    def corr(t):
        lo, la, r = sph(jplpos(el, rt, t)); d = [np.zeros_like(t) for _ in range(3)]; lp = meanlon(name, t)
        for c, j, q, k, A, B in terms: arg = j * lp + (k * meanlon(q, t) if q != name else 0); d[c] += A * np.cos(arg) + B * np.sin(arg)
        lo, la, r = lo + d[0], la + d[1], r * (1 + d[2]); return np.stack([np.cos(la) * np.cos(lo) * r, np.cos(la) * np.sin(lo) * r, np.sin(la) * r], -1)
    def angerr(P, Q): c = np.sum(P * Q, 1) / np.linalg.norm(P, axis=1) / np.linalg.norm(Q, axis=1); return np.degrees(np.arccos(np.clip(c, -1, 1))) * 3600
    e0 = angerr(jplpos(el0, rt0, jt), Rt); e1 = angerr(jplpos(el, rt, jt), Rt); e2 = angerr(corr(jt), Rt)
    out[name] = {'el': el, 'rate': rt, 'terms': terms, 'rms_std_as': float(np.sqrt((e0 ** 2).mean())), 'rms_fit_as': float(np.sqrt((e1 ** 2).mean())), 'rms_as': float(np.sqrt((e2 ** 2).mean()))}
    print(f"{name:8s} Standish {out[name]['rms_std_as']:8.2f}″  fit {out[name]['rms_fit_as']:8.2f}″  +{len(terms)} členů {out[name]['rms_as']:7.2f}″", flush=True)
json.dump(out, open('out/planetfit.json', 'w'))
