# Iterace 3: opravy drah měsíců proti PyEphem – tři složky zbytku (podél dráhy, kolmo k rovině dráhy, průvodič),
# frekvence hledané Lomb–Scargle jen tam, kde fyzika dává čáry (nízké frekvence + okna kolem n, 2n, 3n), pak zjemnění
# na jemné mřížce (dřív byla mřížka pro rychlé měsíce hrubší než šířka čáry → Phobos, Io, Mimas se nezlepšily).
# Kvadratický člen v délce se počítá s časem sevřeným do okna 2000–2040 (mimo okno nevybuchne).
# Výstup out/moonfit3.json {Měsíc: {poly, win, terms [[0 podél|1 kolmo|2 průvodič, ω, A, B]], rms0_deg, rms_deg}}
import json, math, sys, numpy as np
from scipy.signal import lombscargle
from moonref import MOONS, moon_eqp
from fit_moons import model
J2000 = 2451545.0; T0, T1 = 0.2 * 365.25, 39.8 * 365.25; T = T1 - T0
fit = json.load(open('out/moonfit.json')); out = {}
def ref(name, t, flip):
    R = np.array([moon_eqp(name, J2000 + x) for x in t]); ok = np.isfinite(R).all(1) & (np.linalg.norm(R, axis=1) > 0)
    t, R = t[ok], R[ok]
    return t, (R * np.array([1, -1, -1]) if flip else R)
def full(p, poly, terms, t):
    a, e, i, O0, Od, w0, wd, L0, n = p
    L = L0 + n * t + np.polyval(poly[::-1], np.clip(t, T0, T1)); rs = np.ones_like(t); be = np.zeros_like(t)
    for k, w, A, B in terms:
        v = A * np.cos(w * t) + B * np.sin(w * t)
        if k == 0: L = L + v
        elif k == 1: be = be + v
        else: rs = rs + v
    P = model([a, e, i, O0, Od, w0, wd, L, 0.0], t) * rs[:, None]
    O = O0 + Od * t; h = np.stack([np.sin(O) * math.sin(i), -np.cos(O) * math.sin(i), np.full_like(t, math.cos(i))], -1)
    return P + h * (be * np.linalg.norm(P, axis=1))[:, None], h
def resid(P, h, R):
    dl = np.arctan2(np.einsum('ij,ij->i', np.cross(P, R), h), np.einsum('ij,ij->i', P, R))
    db = np.arcsin(np.clip(np.einsum('ij,ij->i', R, h) / np.linalg.norm(R, axis=1), -1, 1)) - np.arcsin(np.clip(np.einsum('ij,ij->i', P, h) / np.linalg.norm(P, axis=1), -1, 1))
    dr = np.linalg.norm(R, axis=1) / np.linalg.norm(P, axis=1) - 1
    return dl, db, dr
def rms(P, Q): c = np.sum(P * Q, 1) / np.linalg.norm(P, axis=1) / np.linalg.norm(Q, axis=1); return float(np.sqrt((np.degrees(np.arccos(np.clip(c, -1, 1))) ** 2).mean()))
def grid(n):
    d = 2 * np.pi / (T * 4); g = [np.arange(2 * np.pi / (T * 2), 2 * np.pi / 20, d)]  # pomalé členy (libace, rezonance)
    for k in (1, 2, 3): c = k * abs(n); g.append(np.arange(c * 0.985, c * 1.015, d))
    return np.concatenate(g)
def LS(t, y, fr):  # po kouscích (scipy ≥ 1.15 skládá matici frekvence × časy)
    return np.concatenate([lombscargle(t, y, fr[k:k + 1500]) for k in range(0, len(fr), 1500)])
def lines(t, y, n, nmax, thr):
    terms = []; yy = y - y.mean(); fr = grid(n)
    for _ in range(nmax):
        pg = LS(t, yy, fr); w = fr[np.argmax(pg)]
        fine = np.linspace(w - 2 * np.pi / (T * 4), w + 2 * np.pi / (T * 4), 101); w = fine[np.argmax(LS(t, yy, fine))]
        X = np.stack([np.cos(w * t), np.sin(w * t)], 1); c, *_ = np.linalg.lstsq(X, yy, rcond=None)
        if math.hypot(*c) < thr: break
        terms.append([float(w), float(c[0]), float(c[1])]); yy = yy - X @ c
    return terms
only = set(sys.argv[1:])
for name in MOONS:
    if only and name not in only: continue
    f = fit[name]; p = f['mean'] if f['rms_mean_deg'] <= f['rms_const_deg'] else f['const']
    rng = np.random.default_rng(abs(hash(name + 'r3')) % 2 ** 31)
    t, R = ref(name, np.sort(rng.uniform(T0, T1, 2400)), f['flip'])
    P, h = full(p, [0, 0, 0], [], t); dl, db, dr = resid(P, h, R)
    poly = list(np.polyfit(np.clip(t, T0, T1), dl, 2)[::-1]); dl = dl - np.polyval(np.array(poly)[::-1], t)
    terms = [[0] + x for x in lines(t, dl, p[8], 14, 2e-4)] + [[1] + x for x in lines(t, db, p[8], 6, 2e-4)] + [[2] + x for x in lines(t, dr, p[8], 6, 2e-5)]
    tq, Rq = ref(name, np.random.default_rng(99).uniform(T0, T1, 500), f['flip'])
    r0 = rms(full(p, [0, 0, 0], [], tq)[0], Rq); r1 = rms(full(p, poly, terms, tq)[0], Rq)
    out[name] = {'poly': [float(x) for x in poly], 'win': [T0, T1], 'terms': terms, 'rms0_deg': r0, 'rms_deg': r1}
    print(f"{name:10s} {r0:8.3f}° → {r1:7.3f}°  ({len(terms)} členů)", flush=True)
import os
old = json.load(open('out/moonfit3.json')) if only and os.path.exists('out/moonfit3.json') else {}
old.update(out); json.dump(old, open('out/moonfit3.json', 'w'))
