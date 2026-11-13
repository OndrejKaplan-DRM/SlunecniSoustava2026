# Fit středních drah měsíců na referenci PyEphem (Mars ESAPHO/ESADE, Jupiter Lieske E5, Saturn TASS 1.7, Uran GUST86).
# Soustava: rovník mateřské planety (pól IAU), osa X = vzestupný uzel rovníku planety na rovníku ICRF.
# Retrográdní dráhy (Uran má podle IAU pól „na jih“) se fitují v překlopené soustavě (y,z → −y,−z), příznak flip.
# Postup (robustní, bez lokálních minim):
#  1. střední pohyb n: rozbalení délky po rostoucích oknech (30 d → 40 let) s predikcí λ0 + n t;
#  2. rovina: pól dráhy z krátkých oken v různých dobách → i, Ω0, Ω̇;
#  3. polish: nelineární nejmenší čtverce od dobrého startu (a, e, i, Ω0, Ω̇, ϖ0, ϖ̇, λ0, n).
# Výstup: 'const' (stálé elementy bez stáčení = tabulka středních elementů) a 'mean' (se stáčením uzlu a pericentra).
import json, math, sys, numpy as np
from scipy.optimize import least_squares
from moonref import MOONS, moon_eqp
J2000 = 2451545.0; T0, T1 = 0.2 * 365.25, 39.8 * 365.25  # okno platnosti všech teorií PyEphem (2000–2040)
def kepler(M, e):
    E = M + e * np.sin(M)
    for _ in range(8): E = E - (E - e * np.sin(E) - M) / (1 - e * np.cos(E))
    return E
def model(p, t):
    a, e, i, O0, Od, w0, wd, L0, n = p; e = abs(e)
    O = O0 + Od * t; w = w0 + wd * t; L = L0 + n * t; M = L - w; om = w - O
    E = kepler(np.mod(M, 2 * np.pi), e)
    x = a * (np.cos(E) - e); y = a * math.sqrt(max(0, 1 - e * e)) * np.sin(E)
    co, so, cO, sO, ci, si = np.cos(om), np.sin(om), np.cos(O), np.sin(O), math.cos(i), math.sin(i)
    X = (cO * co - sO * so * ci) * x + (-cO * so - sO * co * ci) * y
    Y = (sO * co + cO * so * ci) * x + (-sO * so + cO * co * ci) * y
    Z = (so * si) * x + (co * si) * y
    return np.stack([X, Y, Z], -1)
def samp(name, t, flip):
    R = np.array([moon_eqp(name, J2000 + x) for x in t])
    ok = np.isfinite(R).all(1) & (np.linalg.norm(R, axis=1) > 0); R, t = R[ok], t[ok]
    if flip: R = R * np.array([1, -1, -1])
    return t, R
def wrap(x): return (x + np.pi) % (2 * np.pi) - np.pi
def fit(name):
    tc = 20 * 365.25  # střed okna
    t, R = samp(name, tc + np.linspace(-3, 3, 200), False)
    h = np.cross(R[:-1], R[1:]).sum(0); flip = h[2] < 0
    if flip: R = R * np.array([1, -1, -1])
    lon = np.unwrap(np.arctan2(R[:, 1], R[:, 0])); n, L0 = np.polyfit(t - tc, lon, 1)
    for span in [30, 120, 500, 2000, 7000]:   # rozbalení délky s predikcí
        ts, Rs = samp(name, tc + np.linspace(-span / 2, span / 2, 260), flip)
        lo = np.arctan2(Rs[:, 1], Rs[:, 0]); pred = L0 + n * (ts - tc); lo = pred + wrap(lo - pred)
        n, L0 = np.polyfit(ts - tc, lo, 1)
    # rovina dráhy v čase: pól z krátkých oken
    P = 2 * np.pi / n; poles = []; tps = np.linspace(T0 + 2 * P, T1 - 2 * P, 9)
    for tp in tps:
        ts, Rs = samp(name, tp + np.linspace(-P, P, 40), flip)
        hh = np.cross(Rs[:-1], Rs[1:]).sum(0); poles.append(hh / np.linalg.norm(hh))
    poles = np.array(poles); inc = np.arccos(np.clip(poles[:, 2], -1, 1)); Om = np.unwrap(np.arctan2(poles[:, 0], -poles[:, 1]))
    i0 = float(np.median(inc)); Od, O0 = np.polyfit(tps, Om, 1) if i0 > 0.003 else (0.0, 0.0)
    # vzorky pro polish (celé okno) + kontrolní nezávislé
    rng = np.random.default_rng(abs(hash(name)) % 2 ** 31)
    tf, Rf = samp(name, rng.uniform(T0, T1, 700), flip)
    a0 = float(np.linalg.norm(Rf, axis=1).mean())
    L0g = L0 - n * tc   # λ v t = 0 (J2000)
    def res(p, prec):
        q = list(p)
        if not prec: q[4] = q[6] = 0.0
        d = model(q, tf) - Rf
        return (d / a0).ravel()
    best = None
    for w0 in np.linspace(0, 2 * np.pi, 8, endpoint=False):
        p0 = [a0, 0.01, i0, O0, Od, w0, 0.0, L0g, n]
        s = least_squares(lambda p: res(p, True), p0, method='trf', x_scale='jac', max_nfev=3000)
        if best is None or s.cost < best.cost: best = s
    mean = list(map(float, best.x))
    sc = least_squares(lambda p: res(p, False), mean, method='trf', x_scale='jac', max_nfev=3000); const = list(map(float, sc.x)); const[4] = const[6] = 0.0
    for q in (mean, const):
        if q[1] < 0: q[1] = -q[1]; q[5] += math.pi
    tt, Rt = samp(name, np.random.default_rng(99).uniform(T0, T1, 400), flip)
    def rms(q):
        P_ = model(q, tt); c = np.sum(P_ * Rt, 1) / np.linalg.norm(P_, axis=1) / np.linalg.norm(Rt, axis=1)
        return float(np.sqrt((np.degrees(np.arccos(np.clip(c, -1, 1))) ** 2).mean()))
    return {'flip': bool(flip), 'mean': mean, 'const': const, 'P': float(2 * np.pi / n), 'rms_mean_deg': rms(mean), 'rms_const_deg': rms(const)}
if __name__ == '__main__':
    out = {}
    names = sys.argv[2:] or list(MOONS)
    for name in names:
        r = fit(name); out[name] = r; m = r['mean']
        print(f"{name:10s} P={r['P']:9.4f} d a={m[0]:7.3f}R e={abs(m[1]):.4f} i={math.degrees(m[2]):6.2f}° flip={int(r['flip'])} Ω̇={math.degrees(m[4])*365.25:8.3f}°/r ϖ̇={math.degrees(m[6])*365.25:9.3f}°/r RMS const {r['rms_const_deg']:7.3f}° mean {r['rms_mean_deg']:6.3f}°", flush=True)
    json.dump(out, open(sys.argv[1], 'w'), indent=1)
