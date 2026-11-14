# Stopa stínu a pohled z místa podle Besselových elementů NASA (Five Millennium Canon, Espenak a Meeus).
# Pro kartu zatmění Slunce vyrobí tabulku po krocích času: kde osa stínu protíná zemský povrch (zeměpisná šířka, délka),
# poloměr stínu a polostínu (km) a jak zatmění vypadá z místa na kartě (posun Měsíce vůči Slunci, poměr velikostí, výška Slunce).
# Aplikace podle ní kreslí obrys a dráhu stínu a okénko „Pohled z místa“; model samotný má pás posunutý až o stovky km.
# Vzorce: J. Meeus, Elements of Solar Eclipses (střední čára s elipsoidem Země).
import csv, math

R = math.pi / 180
E2 = 0.00669438
RE = 6378.137
_rows = None


def rows(path='/tmp/nasa/bess.csv'):
    global _rows
    if _rows is None:
        _rows = list(csv.DictReader(open(path)))
    return _rows


def najdi(jd, path='/tmp/nasa/bess.csv'):
    best = min(rows(path), key=lambda e: abs(float(e['julian_date']) - jd))
    assert abs(float(best['julian_date']) - jd) < 0.7, (jd, best['julian_date'])
    return best


def tabulka(e, lat, lon, jd_od, jd_do, n=120):
    g = lambda k: float(e[k])
    t0, dT = g('t0'), g('dt')
    jd0 = math.floor(g('julian_date') + 0.5) - 0.5  # 0 h dynamického času v den zatmění
    u1 = math.atan(0.99664719 * math.tan(lat * R))
    rs, rc = 0.99664719 * math.sin(u1), math.cos(u1)
    axis, site = [], []
    for k in range(n + 1):
        jd = jd_od + (jd_do - jd_od) * k / n  # světový čas
        t = (jd + dT / 86400 - jd0) * 24 - t0  # hodiny od t0 v dynamickém čase
        x = g('x0') + g('x1') * t + g('x2') * t * t + g('x3') * t**3
        y = g('y0') + g('y1') * t + g('y2') * t * t + g('y3') * t**3
        d = (g('d0') + g('d1') * t + g('d2') * t * t) * R
        mu = g('mu0') + g('mu1') * t + g('mu2') * t * t
        l1 = g('l10') + g('l11') * t + g('l12') * t * t
        l2 = g('l20') + g('l21') * t + g('l22') * t * t
        # --- osa stínu na povrchu ---
        r1 = math.sqrt(1 - E2 * math.cos(d) ** 2)
        r2 = math.sqrt(1 - E2 * math.sin(d) ** 2)
        y1 = y / r1
        b2 = 1 - x * x - y1 * y1
        if b2 > 0:
            Bq = math.sqrt(b2)
            sd1, cd1 = math.sin(d) / r1, math.sqrt(1 - E2) * math.cos(d) / r1
            sd12, cd12 = E2 * math.sin(d) * math.cos(d) / (r1 * r2), math.sqrt(1 - E2) / (r1 * r2)
            H = math.atan2(x, Bq * cd1 - y1 * sd1) / R
            f1 = math.asin(max(-1, min(1, Bq * sd1 + y1 * cd1)))
            fi = math.atan(math.tan(f1) / math.sqrt(1 - E2)) / R
            lam = (H - mu + 0.00417807 * dT + 540) % 360 - 180
            zeta = r2 * (Bq * cd12 - y1 * sd12)
            um = abs(l2 - zeta * g('tan_f2')) * RE
            pen = (l1 - zeta * g('tan_f1')) * RE
            axis.append([round(fi, 3), round(lam, 3), round(um, 1), round(pen)])
        else:
            axis.append(None)
        # --- pohled z místa ---
        Hs = (mu + lon - 0.00417807 * dT) * R
        xi = rc * math.sin(Hs)
        eta = rs * math.cos(d) - rc * math.cos(Hs) * math.sin(d)
        ze = rs * math.sin(d) + rc * math.cos(Hs) * math.cos(d)
        L1, L2 = l1 - ze * g('tan_f1'), l2 - ze * g('tan_f2')
        m = math.hypot(x - xi, y - eta)
        A = (L1 - L2) / (L1 + L2)  # poloměr Měsíce v poloměrech Slunce
        k2 = 2 / (L1 + L2)  # převod z jednotek základní roviny na poloměry Slunce
        site.append([round((x - xi) * k2, 4), round((y - eta) * k2, 4), round(A, 4), round(math.asin(max(-1, min(1, ze))) / R, 1)])
    return {'t0': round(jd_od, 6), 'dt': round((jd_do - jd_od) / n, 8), 'axis': axis, 'site': site}
