# Iterace 2: zbytky drah měsíců po středních elementech → kvadratický člen (Phobos se zrychluje, Mimas/Hyperion libují)
# + nejsilnější periodické členy z periodogramu zbytku délky a průvodiče (Lomb–Scargle, hladový výběr, nejvýš 8 členů).
# Výstup: out/moonfit2.json {Měsíc: {poly: [c0, c1, c2], terms: [[0|2, ω, A, B], …], rms_deg}} – data k elementům
# z moonfit.json (stejná varianta, jakou vybírá ephem.js: střední se stáčením, když je přesnější).
import json, math, numpy as np
from scipy.signal import lombscargle
from moonref import MOONS, moon_eqp
from fit_moons import model, kepler
J2000 = 2451545.0; T0, T1 = 0.2 * 365.25, 39.8 * 365.25
fit = json.load(open('out/moonfit.json')); out = {}
def wrap(x): return (x + np.pi) % (2 * np.pi) - np.pi
for name in MOONS:
    f = fit[name]; p = f['mean'] if f['rms_mean_deg'] <= f['rms_const_deg'] else f['const']
    rng = np.random.default_rng(abs(hash(name + 'r2')) % 2 ** 31)
    t = np.sort(rng.uniform(T0, T1, 1600)); R = np.array([moon_eqp(name, J2000 + x) for x in t])
    ok = np.isfinite(R).all(1) & (np.linalg.norm(R, axis=1) > 0); t, R = t[ok], R[ok]
    if f['flip']: R = R * np.array([1, -1, -1])
    Pm = model(p, t)
    # zbytek v délce: úhel v rovině dráhy mezi modelem a referencí (znaménko podle pólu dráhy), poměrný průvodič
    h = np.cross(Pm, np.roll(Pm, -1, 0)).mean(0); h /= np.linalg.norm(h)
    dl = np.arctan2(np.einsum('ij,j->i', np.cross(Pm, R), h), np.einsum('ij,ij->i', Pm, R))
    dr = np.linalg.norm(R, axis=1) / np.linalg.norm(Pm, axis=1) - 1
    tt = (t - 20 * 365.25) / 3652.5  # pro polynom: desítky let od středu okna
    poly = np.polyfit(t, dl, 2)[::-1]; resl = dl - np.polyval(poly[::-1], t)
    terms = []
    for kind, y in ((0, resl), (2, dr - dr.mean())):
        yy = y.copy(); freqs = np.linspace(2 * np.pi / (T1 - T0) * 0.5, 2 * np.pi / 0.25, 20000)
        for _ in range(8 if kind == 0 else 4):
            pg = lombscargle(t, yy - yy.mean(), freqs); w = freqs[np.argmax(pg)]
            X = np.stack([np.cos(w * t), np.sin(w * t)], 1); c, *_ = np.linalg.lstsq(X, yy, rcond=None)
            amp = math.hypot(*c)
            if amp < (2e-4 if kind == 0 else 2e-5): break
            terms.append([kind, float(w), float(c[0]), float(c[1])]); yy = yy - X @ c
        if kind == 0: resl = yy
    # kontrola na nezávislých časech
    tq = np.random.default_rng(99).uniform(T0, T1, 400); Rq = np.array([moon_eqp(name, J2000 + x) for x in tq]); okq = np.isfinite(Rq).all(1) & (np.linalg.norm(Rq, axis=1) > 0); tq, Rq = tq[okq], Rq[okq]
    if f['flip']: Rq = Rq * np.array([1, -1, -1])
    def corrected(tv):
        a, e, i, O0, Od, w0, wd, L0, n = p; L = L0 + n * tv + np.polyval(poly[::-1], tv); rs = np.ones_like(tv)
        for k, w, A, B in terms:
            v = A * np.cos(w * tv) + B * np.sin(w * tv)
            if k == 0: L = L + v
            else: rs = rs + v
        q = [a, e, i, O0, Od, w0, wd, 0, 0]; P = []
        for j in range(len(tv)): q[7] = L[j]; P.append(model(q, np.array([tv[j]]))[0] * rs[j])
        return np.array(P)
    def rms(P, Q): c = np.sum(P * Q, 1) / np.linalg.norm(P, axis=1) / np.linalg.norm(Q, axis=1); return float(np.sqrt((np.degrees(np.arccos(np.clip(c, -1, 1))) ** 2).mean()))
    r0, r1 = rms(model(p, tq), Rq), rms(corrected(tq), Rq)
    out[name] = {'poly': [float(x) for x in poly], 'terms': terms, 'rms0_deg': r0, 'rms_deg': r1}
    print(f"{name:10s} {r0:8.3f}° → {r1:7.3f}°  ({len(terms)} členů)", flush=True)
json.dump(out, open('out/moonfit2.json', 'w'))
