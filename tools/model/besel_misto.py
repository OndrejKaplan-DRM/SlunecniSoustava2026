# Místní okolnosti zatmění Slunce v daném místě z Besselových elementů NASA: čas největší fáze, velikost, začátek a konec úplné fáze (UT).
# Spuštění: python3 -I tools/model/besel_misto.py /tmp/nasa/bess.csv ROK MESIC DEN SIRKA DELKA   (datum podle katalogu, východní délka kladná)
import csv, math, sys
R = math.pi / 180


def run(e, lat, lon):
    g = lambda k: float(e[k])
    t0, dT = g('t0'), g('dt')
    u1 = math.atan(0.99664719 * math.tan(lat * R))
    rs, rc = 0.99664719 * math.sin(u1), math.cos(u1)

    def at(t):
        x = g('x0') + g('x1') * t + g('x2') * t * t + g('x3') * t**3
        y = g('y0') + g('y1') * t + g('y2') * t * t + g('y3') * t**3
        d = (g('d0') + g('d1') * t + g('d2') * t * t) * R
        mu = g('mu0') + g('mu1') * t + g('mu2') * t * t
        l1 = g('l10') + g('l11') * t + g('l12') * t * t
        l2 = g('l20') + g('l21') * t + g('l22') * t * t
        H = (mu + lon - 0.00417807 * dT) * R
        xi = rc * math.sin(H)
        eta = rs * math.cos(d) - rc * math.cos(H) * math.sin(d)
        zeta = rs * math.sin(d) + rc * math.cos(H) * math.cos(d)
        L1, L2 = l1 - zeta * g('tan_f1'), l2 - zeta * g('tan_f2')
        m = math.hypot(x - xi, y - eta)
        return (L1 - m) / (L1 + L2), m < abs(L2), L2 < 0, math.asin(max(-1, min(1, zeta))) / R

    ts = [k / 3600 - 3.5 for k in range(7 * 3600 + 1)]
    rows = [(at(t), t) for t in ts]
    (mag, cen, tot, alt), t = max(rows, key=lambda r: r[0][0])
    ut = lambda t: (t0 + t - dT / 3600) % 24
    hms = lambda h: '%d:%02d:%02d' % (int(h), int(h * 60) % 60, int(h * 3600) % 60)
    inn = [tt for (r, tt) in rows if r[1] and r[2]]
    part = [tt for (r, tt) in rows if r[0] > 0]
    return dict(max=hms(ut(t)), utMax=t0 + t - dT / 3600, faze=round(mag, 4), vyska=round(alt, 1), uplne=bool(inn),
                od=hms(ut(inn[0])) if inn else None, do=hms(ut(inn[-1])) if inn else None, trvani=len(inn),
                castecneOd=hms(ut(part[0])) if part else None, castecneDo=hms(ut(part[-1])) if part else None)


if __name__ == '__main__':
    y, m, d = map(int, sys.argv[2:5])
    for r in csv.DictReader(open(sys.argv[1])):
        if (int(r['year']), int(r['month']), int(r['day'])) == (y, m, d):
            print(run(r, float(sys.argv[5]), float(sys.argv[6])))
