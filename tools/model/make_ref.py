# Referenční tabulka pro test bez efemeridy: polohy z JPL DE422 ve 120 náhodných okamžicích mezi roky −1000 a 3000
# (planety a Pluto heliocentricky v AU, Měsíc geocentricky v km, ekliptika J2000, čas efemerid). Výstup: tools/test/ref_de422.json
import sys, os, json, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import de422 as de
IDS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'moon']
rng = np.random.default_rng(2026)
yr = np.sort(np.concatenate([rng.uniform(c, c + 100, 3) for c in range(-1000, 3000, 100)]))
jd = np.round(2451545.0 + (yr - 2000) * 365.25, 4)
rows = []
for k, t in enumerate(jd):
    r = [float(t)]
    for n in IDS:
        v = de.eq2ecl(de.pos('moon', [t]))[0] if n == 'moon' else de.eq2ecl(de.helio(n, [t]))[0] / de.AU
        r += [round(float(x), 3 if n == 'moon' else 9) for x in v]
    rows.append(r)
json.dump({'zdroj': 'JPL DE422 (balík de422 z PyPI)', 'ids': IDS, 'rows': rows}, open(os.path.join(os.path.dirname(__file__), '../test/ref_de422.json'), 'w'), separators=(',', ':'))
print(len(rows), 'okamžiků')
