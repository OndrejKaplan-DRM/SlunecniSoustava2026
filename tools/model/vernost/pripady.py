# Náhodné případy „pohled z povrchu“ a jejich hodnoty z JPL Horizons → tools/test/ref_povrch.json.
# Použití: python3 -I tools/model/vernost/pripady.py [počet situací=320] [semínko=200] [výstup]
# Situace = těleso, místo (šířka, východní délka), okamžik. Ke každé 3 náhodné cíle (Slunce, planety, měsíce) → asi 1 000 případů.
# Horizons vrací zdánlivý azimut a výšku bez lomu světla (s dobou letu světla a aberací), úhlový průměr, vzdálenost a osvětlenou část.
# Časy: místa na Zemi ve světovém čase (UT), jinde v rovnoměrném čase (TT) – otáčení ostatních těles na UT nezávisí.
import json, math, os, random, re, sys

sys.path.insert(0, os.path.dirname(__file__))
import hz

N = int(sys.argv[1]) if len(sys.argv) > 1 else 320
SEED = int(sys.argv[2]) if len(sys.argv) > 2 else 200
OUT = sys.argv[3] if len(sys.argv) > 3 else 'tools/test/ref_povrch.json'
ID = {
    'sun': '10', 'mercury': '199', 'venus': '299', 'earth': '399', 'moon': '301', 'mars': '499', 'phobos': '401',
    'deimos': '402', 'jupiter': '599', 'io': '501', 'europa': '502', 'ganymede': '503', 'callisto': '504',
    'saturn': '699', 'mimas': '601', 'enceladus': '602', 'tethys': '603', 'dione': '604', 'rhea': '605', 'titan': '606',
    'iapetus': '608', 'uranus': '799', 'ariel': '701', 'umbriel': '702', 'titania': '703', 'oberon': '704',
    'miranda': '705', 'neptune': '899', 'triton': '801', 'pluto': '999', 'charon': '901', 'ceres': '2000001',
    'vesta': '2000004',
}
PL = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']
SYS = {
    'earth': ['moon'], 'mars': ['phobos', 'deimos'], 'jupiter': ['io', 'europa', 'ganymede', 'callisto'],
    'saturn': ['mimas', 'enceladus', 'tethys', 'dione', 'rhea', 'titan', 'iapetus'],
    'uranus': ['miranda', 'ariel', 'umbriel', 'titania', 'oberon'], 'neptune': ['triton'], 'pluto': ['charon'],
}
ROOT = {m: p for p, ms in SYS.items() for m in ms}
# kolikrát častěji se těleso vybere jako stanoviště
W = {
    'earth': 30, 'moon': 9, 'mars': 10, 'mercury': 3, 'venus': 3, 'jupiter': 3, 'saturn': 3, 'uranus': 2, 'neptune': 2,
    'pluto': 3, 'charon': 2, 'phobos': 2, 'deimos': 1.5, 'io': 2, 'europa': 2, 'ganymede': 2, 'callisto': 2,
    'titan': 2, 'enceladus': 1, 'mimas': 1, 'rhea': 1, 'iapetus': 1.5, 'dione': 1, 'tethys': 1, 'miranda': 1, 'ariel': 1,
    'titania': 1, 'oberon': 1, 'umbriel': 0.6, 'triton': 2, 'ceres': 2, 'vesta': 2,
}


def jd_of_year(y):
    return 2451545.0 + (y - 2000.0) * 365.25


def pick_targets(rnd, c):
    root = ROOT.get(c, c)
    pool = ['sun']
    fam = [root] + SYS.get(root, [])
    near = [x for x in fam if x != c]
    far = [p for p in PL if p != root] + ['pluto']
    if c == 'earth':
        far += ['io', 'ganymede', 'callisto', 'europa', 'titan', 'ceres', 'vesta']
    if c not in ('earth', 'moon'):
        far += ['moon']
    out = []
    if rnd.random() < 0.75:
        out.append('sun')
    rnd.shuffle(near)
    out += near[: 2 if len(near) > 1 and rnd.random() < 0.6 else 1]
    while len(out) < 3:
        t = rnd.choice(far)
        if t not in out and t != c:
            out.append(t)
    return out[:3]


WEST = {}


def one(c, lat, lon, jd, tt, tgt):
    """Vrátí slovník s hodnotami z Horizons, nebo text chyby."""
    # tělesa s kladnou západní délkou (většina přímo rotujících) chtějí východní délku se záporným znaménkem
    for inp in (-lon, lon) if WEST.get(c) else (lon, -lon):
        t, r = hz.azel(ID[c], inp, lat, ID[tgt], jd, tt=tt)
        if r:
            WEST[c] = inp < 0
            break
        if 'Input east-longitude as negative' not in t:
            return re.sub(r'\s+', ' ', t[-220:])
    m = re.search(r'Center geodetic\s*:\s*([-\d.E+]+),\s*([-\d.E+]+),.*\{(.)-lon', t)
    lon_rep = float(m.group(1))
    lon_e = lon_rep if m.group(3) == 'E' else (360 - lon_rep) % 360
    if abs(((lon_e - lon + 180) % 360) - 180) > 1e-3:
        return f'délka nesedí: chtěla jsem {lon} v. d., Horizons má {lon_rep} {m.group(3)}'
    f = [x.strip() for x in r[0].split(',')]
    try:
        return {
            'az': float(f[3]), 'el': float(f[4]), 'diam': float(f[5]) if f[5] not in ('n.a.', '') else None,
            'delta': float(f[6]), 'illu': float(f[8]) if f[8] not in ('n.a.', '') else None,
        }
    except Exception as e:
        return 'řádek: ' + r[0]


def main():
    rnd = random.Random(SEED)
    names = list(W)
    cases, bad = [], []
    for k in range(N):
        c = rnd.choices(names, [W[n] for n in names])[0]
        lat = math.degrees(math.asin(rnd.uniform(-1, 1)))
        lon = rnd.uniform(0, 360)
        u = rnd.random()
        if c == 'earth':
            y = rnd.uniform(1900, 2100) if u < 0.5 else rnd.uniform(2020, 2030) if u < 0.75 else rnd.uniform(-1000, 3000)
        else:
            y = rnd.uniform(1950, 2100) if u < 0.7 else rnd.uniform(1800, 2200)
        jd = round(jd_of_year(y), 4)
        tt = c != 'earth'
        tg = pick_targets(rnd, c)
        for t in tg:
            r = one(c, round(lat, 4), round(lon, 4), jd, tt, t)
            if isinstance(r, str):
                bad.append([c, t, y, r])
                continue
            cases.append({'c': c, 'lat': round(lat, 4), 'lon': round(lon, 4), 'jd': jd, 'tt': tt, 't': t, **r})
        if k % 10 == 9:
            print(k + 1, 'situací,', len(cases), 'případů,', len(bad), 'bez odpovědi', flush=True)
    json.dump({'zdroj': 'JPL Horizons API (DE441, IAU WGCCRE), zdánlivé směry bez lomu světla', 'seminko': SEED, 'pripady': cases, 'bez': bad},
              open(OUT, 'w'), separators=(',', ':'))
    print('hotovo:', len(cases), 'případů →', OUT, '; bez odpovědi', len(bad))
    for b in bad[:30]:
        print('  ', b)


main()
