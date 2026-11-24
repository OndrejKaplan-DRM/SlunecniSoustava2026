# Dráhy měsíců: fit modelu aplikace (stáčející se elipsa + opravy) na JPL Horizons v letech 1900–2100 (verze 2.1).
# Vstup: <složka>/<id>.json (řídká řada 1900–2100) a <id>_d.json (hustá řada 2026) z mesice_ref.py; src/data/cat.json.
# Výstup: tools/out/mesice_fit.json {id: {p: [a, e, i, O0, Od, w0, wd, L0, n], corr, rms…}}; do katalogu je zapíše zapis_mesice.mjs.
# Model (core/ephem.js, satPos): v soustavě rovníku planety O = O0 + Od·t, ϖ = w0 + wd·t, L = L0 + n·t + polynom + Σ členy,
# elipsa (a, e), sklon i; opravy podél dráhy (0), kolmo k ní (1) a v průvodiči (2).
# Postup: 1) střední pohyb z husté řady a sledováním fáze přes 200 let; 2) blízké měsíce u rovníku: epicyklické frekvence
# (svislá n − Ω', radiální n − ϖ') z periodogramu – oskulační elementy tam kazí zploštění planety; vzdálené a skloněné měsíce:
# oskulační elementy; 3) doladění všech 9 parametrů na polohách; 4) kvadratický člen a pomalé periodické členy (perioda > 70 dní)
# hledané v reziduích; členy se berou jen tehdy, když pomohou i na třetině dat, která se k fitu nepoužila.
# Použití: python3 -I tools/model/vernost/fit_mesice.py <složka s daty> [id …]
import json, math, os, sys
import numpy as np
from scipy.optimize import least_squares
from scipy.signal import lombscargle

J2000, DEG = 2451545.0, math.pi / 180
GM = {'mars': 42828.37, 'jupiter': 1.26712764e8, 'saturn': 3.7940585e7, 'uranus': 5.794557e6, 'neptune': 6.836527e6, 'pluto': 975.5}
wrap = lambda x: (x + np.pi) % (2 * np.pi) - np.pi
K_CH = 105.88 / (869.61 + 105.88)  # podíl hmotnosti Charonu v soustavě Pluto–Charon (GM z JPL)


def pole_frame(ra, de):
    ra, de = ra * DEG, de * DEG
    p = np.array([math.cos(de) * math.cos(ra), math.cos(de) * math.sin(ra), math.sin(de)])
    X = np.array([-p[1], p[0], 0.0])
    X /= np.linalg.norm(X)
    return np.array([X, np.cross(p, X), p])


def kepler(M, e):
    M = M - 2 * np.pi * np.floor(M / (2 * np.pi))
    E = M + 0.85 * e * np.sign(np.sin(M))
    for _ in range(40):
        dE = (E - e * np.sin(E) - M) / (1 - e * np.cos(E))
        E = E - dE
        if np.max(np.abs(dE)) < 1e-13:
            break
    return E


def model(p, t, corr=None):
    """Poloha v soustavě rovníku planety (před případným převrácením), stejně jako satPos v aplikaci."""
    a, e, i, O0, Od, w0, wd, L0, n = p
    O, w, L = O0 + Od * t, w0 + wd * t, L0 + n * t
    rs, be = np.ones_like(t), np.zeros_like(t)
    if corr:
        q = corr['poly']
        L = L + q[0] + q[1] * t + q[2] * t * t
        for k, om, A, B in corr['terms']:
            v = A * np.cos(om * t) + B * np.sin(om * t)
            if k == 0:
                L = L + v
            elif k == 1:
                be = be + v
            else:
                rs = rs + v
    E = kepler(L - w, e)
    x, y = a * rs * (np.cos(E) - e), a * rs * math.sqrt(1 - e * e) * np.sin(E)
    cO, sO, ci, si, cw, sw = np.cos(O), np.sin(O), math.cos(i), math.sin(i), np.cos(w - O), np.sin(w - O)
    P = np.stack([(cO * cw - sO * sw * ci) * x + (-cO * sw - sO * cw * ci) * y,
                  (sO * cw + cO * sw * ci) * x + (-sO * sw + cO * cw * ci) * y, sw * si * x + cw * si * y], -1)
    h = np.stack([sO * si, -cO * si, np.full_like(t, ci)], -1)
    if corr:
        P = P + h * (be * np.linalg.norm(P, axis=1))[:, None]
    return P, h


def ang(P, Q):
    c = np.sum(P * Q, 1) / np.linalg.norm(P, axis=1) / np.linalg.norm(Q, axis=1)
    return np.degrees(np.arccos(np.clip(c, -1, 1)))


def track(t, phi, L, n, tc):
    """Sledování fáze: upřesní L a n na rostoucích oknech kolem tc (zbytky se drží pod půl otáčkou)."""
    for half in (0.7, 1.6, 4, 9, 20, 45, 90, 140):
        m = np.abs(t - tc) < half * 365.25
        if m.sum() < 12:
            continue
        res = wrap(phi[m] - (L + n * t[m]))
        A = np.stack([np.ones(m.sum()), t[m] - tc], 1)
        c, *_ = np.linalg.lstsq(A, res, rcond=None)
        L, n = L + c[0] - c[1] * tc, n + c[1]
    return L, n


def peak(t, y, lo, hi, step):
    """Frekvence s největším výkonem v pásmu (přímý součet, snese záporné frekvence)."""
    fr = np.arange(lo, hi, step)
    best, bw = -1, lo
    for k in range(0, len(fr), 400):
        f = fr[k:k + 400]
        pw = np.abs(np.exp(-1j * np.outer(f, t)) @ y)
        j = int(np.argmax(pw))
        if pw[j] > best:
            best, bw = pw[j], f[j]
    return bw


def sincos(t, y, w):
    X = np.stack([np.sin(w * t), np.cos(w * t)], 1)
    c, *_ = np.linalg.lstsq(X, y, rcond=None)
    return c


def osc(R, V, mu):
    """Oskulační elementy (a, e, i, Ω, ϖ, λ) z poloh (km) a rychlostí (km/den)."""
    h = np.cross(R, V)
    hn = np.linalg.norm(h, axis=1)
    r = np.linalg.norm(R, axis=1)
    i = np.arccos(np.clip(h[:, 2] / hn, -1, 1))
    O = np.arctan2(h[:, 0], -h[:, 1])
    ev = np.cross(V, h) / mu - R / r[:, None]
    e = np.linalg.norm(ev, axis=1)
    nd = np.stack([np.cos(O), np.sin(O), np.zeros_like(O)], -1)
    md = np.cross(h / hn[:, None], nd)
    om = np.arctan2(np.sum(ev * md, 1), np.sum(ev * nd, 1))
    u = np.arctan2(np.sum(R * md, 1), np.sum(R * nd, 1))
    nu = u - om
    E = 2 * np.arctan2(np.sqrt(np.clip(1 - e, 0, None)) * np.sin(nu / 2), np.sqrt(1 + e) * np.cos(nu / 2))
    M = E - e * np.sin(E)
    a = 1 / (2 / r - np.sum(V * V, 1) / mu)
    return a, e, i, O, O + om, O + om + M


def linfit(t, y):
    yy = np.unwrap(y)
    c = np.polyfit(t - t.mean(), yy, 1)
    return c[1] - c[0] * t.mean(), c[0]


def resid(P, h, R):
    dl = np.arctan2(np.einsum('ij,ij->i', np.cross(P, R), h), np.einsum('ij,ij->i', P, R))
    rn, pn = np.linalg.norm(R, axis=1), np.linalg.norm(P, axis=1)
    db = np.arcsin(np.clip(np.einsum('ij,ij->i', R, h) / rn, -1, 1)) - np.arcsin(np.clip(np.einsum('ij,ij->i', P, h) / pn, -1, 1))
    return dl, db, rn / pn - 1


def lines(t, y, T, nmax, thr):
    """Pomalé periodické členy: postupně největší čáry periodogramu (perioda 70 dní až 1,5 T)."""
    out, yy = [], y - y.mean()
    d = 2 * np.pi / (T * 4)
    fr = np.arange(2 * np.pi / (T * 1.5), 2 * np.pi / 70, d)
    for _ in range(nmax):
        pg = np.concatenate([lombscargle(t, yy, fr[k:k + 1500]) for k in range(0, len(fr), 1500)])
        w = fr[int(np.argmax(pg))]
        fine = np.linspace(w - d, w + d, 81)
        w = fine[int(np.argmax(lombscargle(t, yy, fine)))]
        X = np.stack([np.cos(w * t), np.sin(w * t)], 1)
        c, *_ = np.linalg.lstsq(X, yy, rcond=None)
        if math.hypot(*c) < thr:
            break
        out.append([float(w), float(c[0]), float(c[1])])
        yy = yy - X @ c
    return out


def fit_one(b, par, S, D, base=None):
    o = b['orbit']
    F = pole_frame(*(par.get('framePole') or par['pole'][:2]))
    isflip = bool(o.get('flip'))
    mu = GM[b['parent']] * 86400.0 ** 2
    for attempt in (0, 1):
        flip = np.array([1, -1, -1]) if isflip else np.ones(3)
        ts = S[:, 0] - J2000
        Rs = (S[:, 1:4] @ F.T) * flip
        Vs = (S[:, 4:7] @ F.T) * flip * 86400
        td = D[:, 0] - J2000
        Rd = (D[:, 1:4] @ F.T) * flip
        Vd = (D[:, 4:7] @ F.T) * flip * 86400
        a0, e0, i0, O0, w0, lam = osc(Rd, Vd, mu)
        inc = np.median(i0)
        # zpětný oběh těsně u rovníku (malé měsíce Uranu vůči severnímu pólu IAU): uzel je tam neurčitý → převrátit soustavu
        if attempt == 0 and math.pi - inc < 8 * DEG:
            isflip = not isflip
            continue
        break
    tc = td.mean()
    rs = np.linalg.norm(Rs, axis=1)
    near = (min(inc, math.pi - inc) < 8 * DEG) and np.median(e0) < 0.12 and rs.mean() / par['R'] < 70
    if near and inc < math.pi / 2:
        # blízký měsíc u rovníku: délka v rovině rovníku, epicyklické frekvence
        th = np.unwrap(np.arctan2(Rd[:, 1], Rd[:, 0]))
        c = np.polyfit(td - tc, th, 1)
        n, L0 = c[0], c[1] - c[0] * tc
        L0, n = track(ts, np.arctan2(Rs[:, 1], Rs[:, 0]), L0, n, tc)
        Td, Ts = td[-1] - td[0], ts[-1] - ts[0]
        def epi(yd, ys):
            w = peak(td, yd - yd.mean(), n - 0.06 * abs(n) - 0.02, n + 0.06 * abs(n) + 0.02, 2 * np.pi / (Td * 10))
            w1 = peak(ts, ys - ys.mean(), w - 2.5 * 2 * np.pi / Td, w + 2.5 * 2 * np.pi / Td, 2 * np.pi / (Ts * 10))
            cd, cs = sincos(td, yd - yd.mean(), w), sincos(ts, ys - ys.mean(), w1)
            # souvislá perioda přes 200 let jen když drží amplitudu (stáčení je rovnoměrné)
            return (w1, cs) if math.hypot(*cs) > 0.6 * math.hypot(*cd) else (w, cd)
        nu, c = epi(Rd[:, 2] / np.linalg.norm(Rd, axis=1), Rs[:, 2] / rs)
        inc, phi = math.hypot(*c), math.atan2(c[1], c[0])
        Od, O0f = n - nu, L0 - phi
        ka, c = epi(np.linalg.norm(Rd, axis=1) / np.linalg.norm(Rd, axis=1).mean() - 1, rs / rs.mean() - 1)
        e, psi = math.hypot(*c), math.atan2(c[0], -c[1])
        wd, w0f = n - ka, L0 - psi
        a = rs.mean() / (1 + e * e / 2)
        p0 = [a, e, inc, O0f, Od, w0f, wd, L0, n]
        if base:
            # souputník (Epimetheus): střední pohyb sdílí s větším měsícem, v průměru je naproti němu
            p0[7], p0[8] = base[7] + math.pi, base[8]
    else:
        as_, es, is_, Os, ws, ls = osc(Rs, Vs, mu)
        Lr, nr = linfit(td, lam)
        L0, n = track(ts, ls, Lr, nr, tc)
        Oc, Od = linfit(ts, Os) if np.median(np.sin(is_)) > 0.01 else (np.median(Os), 0.0)
        wc, wd = linfit(ts, ws)
        e = float(np.median(es))
        p0 = [rs.mean() / (1 + e * e / 2), e, float(np.median(is_)), Oc, Od, wc, wd, L0, n]
    # doladění všech parametrů na polohách (řídká řada + každý 6. bod husté)
    T = np.concatenate([ts, td[::6]])
    R = np.concatenate([Rs, Rd[::6]])
    sc = np.array([p0[0], 0.01, 0.01, 0.1, 1e-6, 0.1, 1e-6, 0.01, 1e-8])
    lo = np.array([p0[0] * 0.9, 0, 0, -np.inf, -np.inf, -np.inf, -np.inf, -np.inf, -np.inf])
    hi = np.array([p0[0] * 1.1, 0.95, math.pi, np.inf, np.inf, np.inf, np.inf, np.inf, np.inf])
    f = lambda p: ((model(p, T)[0] - R) / p0[0]).ravel()
    r0 = float(np.sqrt((ang(model(p0, ts)[0], Rs) ** 2).mean()))
    try:
        if base:
            raise ValueError('souputník – bez doladění')
        sol = least_squares(f, np.clip(p0, lo + 1e-12, hi - 1e-12), x_scale=sc, bounds=(lo, hi), loss='soft_l1', f_scale=0.02, max_nfev=300)
        p1 = list(sol.x)
        r1 = float(np.sqrt((ang(model(p1, ts)[0], Rs) ** 2).mean()))
        if not (r1 < r0):
            p1, r1 = p0, r0
    except Exception as ex:
        if not base:
            print('   doladění selhalo:', ex)
        p1, r1 = p0, r0
    # opravy: dvě třetiny dat k fitu, třetina ke kontrole
    k = np.arange(len(ts))
    fit, tst = k % 3 != 0, k % 3 == 0
    P, h = model(p1, ts)
    dl, db, dr = resid(P, h, Rs)
    Tspan = ts[-1] - ts[0]
    corr = {'poly': [0.0, 0.0, 0.0], 'win': [float(ts[0]), float(ts[-1])], 'terms': []}
    c = np.polyfit(ts[fit], dl[fit], 2)
    corr['poly'] = [float(c[2]), float(c[1]), float(c[0])]
    def accept(extra):
        trial = {'poly': corr['poly'], 'terms': corr['terms'] + extra}
        before = ang(model(p1, ts[tst], corr)[0], Rs[tst])
        after = ang(model(p1, ts[tst], trial)[0], Rs[tst])
        if np.sqrt((after ** 2).mean()) < 0.97 * np.sqrt((before ** 2).mean()):
            corr['terms'] = trial['terms']
            return True
        return False
    nmax = 40 if base else 24
    for comp, y, thr in ((0, dl - np.polyval(c, ts), 1.5e-4), (1, db, 2e-4), (2, dr, 2e-4)):
        tm = lines(ts[fit], y[fit], Tspan, nmax if comp == 0 else 12, thr)
        if tm:
            accept([[comp] + x for x in tm])
    # rychlé čáry u středního pohybu: pevný náklon roviny dráhy (Laplaceova rovina) a druhá výstřednost
    n1 = p1[8]
    Td = td[-1] - td[0]
    for _ in range(2):
        Pd, hd = model(p1, td, corr)
        Ps, hs = model(p1, ts, corr)
        rd3, rs3 = resid(Pd, hd, Rd), resid(Ps, hs, Rs)
        for comp in (1, 2, 0):
            yd, ys = rd3[comp], rs3[comp]
            w = peak(td, yd - yd.mean(), n1 - 0.06 * abs(n1) - 0.02, n1 + 0.06 * abs(n1) + 0.02, 2 * np.pi / (Td * 10))
            w1 = peak(ts[fit], ys[fit] - ys[fit].mean(), w - 2.5 * 2 * np.pi / Td, w + 2.5 * 2 * np.pi / Td, 2 * np.pi / (Tspan * 10))
            X = np.stack([np.cos(w1 * ts[fit]), np.sin(w1 * ts[fit])], 1)
            cc, *_ = np.linalg.lstsq(X, ys[fit] - ys[fit].mean(), rcond=None)
            if math.hypot(*cc) > 2e-4:
                accept([[comp, float(w1), float(cc[0]), float(cc[1])]])
    base = ang(model(p1, ts, {'poly': [0, 0, 0], 'terms': []})[0], Rs)
    fin = ang(model(p1, ts[tst], corr)[0], Rs[tst])
    if not (np.sqrt((fin ** 2).mean()) < np.sqrt((base[tst] ** 2).mean())):
        corr = {'poly': [0.0, 0.0, 0.0], 'win': corr['win'], 'terms': []}
        fin = base[tst]
    allr = ang(model(p1, ts, corr)[0], Rs)
    return {
        'p': [float(x) for x in p1], 'corr': corr, 'near': bool(near), 'flip': isflip,
        'rms_init': r0, 'rms_base': float(np.sqrt((base ** 2).mean())), 'rms': float(np.sqrt((allr ** 2).mean())),
        'rms_test': float(np.sqrt((fin ** 2).mean())), 'max': float(allr.max()), 'p95': float(np.percentile(allr, 95)),
        'span': [round(float(2000 + ts[0] / 365.25), 1), round(float(2000 + ts[-1] / 365.25), 1)], 'n': int(len(ts)),
    }


def old_model(b, par, S):
    """Odchylka dosavadní dráhy z katalogu (pro srovnání), včetně jejích oprav s časem sevřeným do okna."""
    o = b['orbit']
    oo = {**o, **o['mean']} if o.get('mean') and not (o.get('rms_mean_deg', 0) > o.get('rms_const_deg', 1e9)) else o
    F = pole_frame(*(par.get('framePole') or par['pole'][:2]))
    flip = np.array([1, -1, -1]) if o.get('flip') else np.ones(3)
    ts = S[:, 0] - J2000
    Rs = (S[:, 1:4] @ F.T) * flip
    p = [oo[k] for k in ('a', 'e', 'i', 'O0', 'Od', 'w0', 'wd', 'L0', 'n')]
    L = p[7] + p[8] * ts
    terms = []
    if o.get('corr'):
        cc = o['corr']
        tcl = np.clip(ts, cc['win'][0], cc['win'][1]) if cc.get('win') else ts
        L = L + cc['poly'][0] + cc['poly'][1] * tcl + cc['poly'][2] * tcl * tcl
        terms = cc['terms']
    return ang(_model_L(p, ts, L, terms)[0], Rs)


def _model_L(p, t, L, terms):
    a, e, i, O0, Od, w0, wd = p[:7]
    O, w = O0 + Od * t, w0 + wd * t
    rs, be = np.ones_like(t), np.zeros_like(t)
    for k, om, A, B in terms:
        v = A * np.cos(om * t) + B * np.sin(om * t)
        if k == 0:
            L = L + v
        elif k == 1:
            be = be + v
        else:
            rs = rs + v
    E = kepler(L - w, e)
    x, y = a * rs * (np.cos(E) - e), a * rs * math.sqrt(1 - e * e) * np.sin(E)
    cO, sO, ci, si, cw, sw = np.cos(O), np.sin(O), math.cos(i), math.sin(i), np.cos(w - O), np.sin(w - O)
    P = np.stack([(cO * cw - sO * sw * ci) * x + (-cO * sw - sO * cw * ci) * y,
                  (sO * cw + cO * sw * ci) * x + (-sO * sw + cO * cw * ci) * y, sw * si * x + cw * si * y], -1)
    h = np.stack([sO * si, -cO * si, np.full_like(t, ci)], -1)
    P = P + h * (be * np.linalg.norm(P, axis=1))[:, None]
    return P, h


def main():
    d = sys.argv[1]
    only = set(x for x in sys.argv[2:] if not x.startswith('--'))
    cat = json.load(open('src/data/cat.json'))
    by = {b['id']: b for b in cat['bodies']}
    outp = 'tools/out/mesice_fit.json'
    res = json.load(open(outp)) if os.path.exists(outp) else {}
    for b in cat['bodies']:
        if b['orbit']['kind'] != 'sat' or (only and b['id'] not in only):
            continue
        fs, fd = os.path.join(d, b['id'] + '.json'), os.path.join(d, b['id'] + '_d.json')
        if not (os.path.exists(fs) and os.path.exists(fd)):
            continue
        S, D = np.array(json.load(open(fs))['rows']), np.array(json.load(open(fd))['rows'])
        par = by[b['parent']]
        S0 = S
        base = None
        if b['parent'] == 'pluto' and b['id'] != 'charon':
            # malé měsíce obíhají těžiště Pluta a Charonu: od polohy vůči Plutu odečíst K_CH × polohu Charonu
            cs_, cd_ = np.array(json.load(open(os.path.join(d, 'charon.json')))['rows']), np.array(json.load(open(os.path.join(d, 'charon_d.json')))['rows'])
            assert len(cs_) == len(S) and len(cd_) == len(D) and abs(cs_[:, 0] - S[:, 0]).max() < 1e-6
            S, D = S.copy(), D.copy()
            S[:, 1:7] -= K_CH * cs_[:, 1:7]
            D[:, 1:7] -= K_CH * cd_[:, 1:7]
        if b['id'] == 'epimetheus' and 'janus' in res:
            base = res['janus']['p']
        try:
            old = old_model(b, par, S0)
            r = fit_one(b, par, S, D, base)
            if not S is S0:
                r['bary'] = ['charon', K_CH]
        except Exception as ex:
            print(b['id'], 'CHYBA', repr(ex))
            continue
        r['old_rms'], r['old_max'] = float(np.sqrt((old ** 2).mean())), float(old.max())
        res[b['id']] = r
        print(f"{b['id']:12s} {'blízký' if r['near'] else 'vzdál.'}  dřív rms {r['old_rms']:8.3f}° max {r['old_max']:8.3f}°  →  elipsa {r['rms_base']:7.3f}°  s opravami {r['rms']:7.3f}° (kontrola {r['rms_test']:7.3f}°, 95 % {r['p95']:6.3f}°, max {r['max']:7.3f}°)  členů {len(r['corr']['terms'])}  {r['span']}", flush=True)
    json.dump(res, open(outp, 'w'), indent=0)
    print('uloženo:', outp, '(zápis do katalogu: node tools/model/vernost/zapis_mesice.mjs)')

main()
