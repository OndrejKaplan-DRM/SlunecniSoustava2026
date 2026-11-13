# Místní okolnosti zatmění Slunce z Besselových elementů NASA (Espenak & Meeus, Five Millennium Catalog of Solar Eclipses).
# Nezávislý pramen pro tabulku kandidátů: největší fáze a čas v daném místě (výchozí Praha) + přesnější souřadnice největšího zatmění.
# Data: curl -o /tmp/nasa/bess.csv https://eclipse.gsfc.nasa.gov/eclipse_besselian_from_mysqldump2.csv   (6 MB, do repa se neukládá)
# Spuštění: python3 -I tools/model/besel.py /tmp/nasa/bess.csv tools/data/kandidati.json [šířka délka]   → doplní ref.misto do souboru
import csv, json, math, sys
R = math.pi / 180


def local(e, lat, lon):
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

    best = max((at(k / 600 - 3.5) + (k / 600 - 3.5,) for k in range(4201)), key=lambda r: r[0])
    mag, cen, tot, alt, t = best
    ut = t0 + t - dT / 3600
    return dict(faze=round(max(0, mag), 3), uplne=bool(cen and tot), prstencove=bool(cen and not tot), ut=round(ut, 3), vyska=round(alt, 1))


if __name__ == '__main__':
    rows = {(int(r['year']), int(r['month']), int(r['day'])): r for r in csv.DictReader(open(sys.argv[1]))}
    K = json.load(open(sys.argv[2]))
    lat, lon = (float(sys.argv[3]), float(sys.argv[4])) if len(sys.argv) > 4 else (50.08, 14.42)
    for c in K:
        if c['typ'] != 'slunce':
            continue
        e = rows[tuple(c['datum'])]
        c['ref']['lat'], c['ref']['lon'] = round(float(e['lat_dd_ge']), 1), round(float(e['lng_dd_ge']), 1)
        c['ref']['misto'] = local(e, lat, lon)
        m = c['ref']['misto']
        h = m['ut'] % 24
        print(c['id'].ljust(8), 'osa', c['ref']['lat'], c['ref']['lon'], '| místo: fáze', m['faze'], 'ÚPLNÉ' if m['uplne'] else '', '%02d:%02d UT' % (int(h), int(h % 1 * 60)), 'Slunce', m['vyska'], '°')
    json.dump(K, open(sys.argv[2], 'w'), ensure_ascii=False, indent=1)
