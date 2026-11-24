# Natočení těles podle IAU WGCCRE 2015 (Archinal a kol. 2018) z jádra NAIF pck00011.tpc → src/data/rot.json.
# Použití: python3 -I tools/data/rot_build.py <cesta k pck00011.tpc>
# Zdroj: https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc (stejné konstanty používá JPL Horizons).
# Model: α = a0 + a1·T + a2·T² + Σ cα·sin θk; δ = d0 + d1·T + d2·T² + Σ cδ·cos θk; W = w0 + w1·d + w2·d² + Σ cW·sin θk,
# T = juliánská století a d = dny od J2000 (TDB), θk = úhly soustavy planety (polynom v T).
import json, re, sys

NAIF = {
    'sun': 10, 'mercury': 199, 'venus': 299, 'moon': 301, 'mars': 499, 'phobos': 401, 'deimos': 402,
    'jupiter': 599, 'io': 501, 'europa': 502, 'ganymede': 503, 'callisto': 504, 'amalthea': 505, 'thebe': 514,
    'adrastea': 515, 'metis': 516,
    'saturn': 699, 'mimas': 601, 'enceladus': 602, 'tethys': 603, 'dione': 604, 'rhea': 605, 'titan': 606,
    'iapetus': 608, 'phoebe': 609, 'janus': 610, 'epimetheus': 611, 'helene': 612, 'telesto': 613, 'calypso': 614,
    'atlas': 615, 'prometheus': 616, 'pandora': 617, 'pan': 618,
    'uranus': 799, 'ariel': 701, 'umbriel': 702, 'titania': 703, 'oberon': 704, 'miranda': 705, 'cordelia': 706,
    'ophelia': 707, 'bianca': 708, 'cressida': 709, 'desdemona': 710, 'juliet': 711, 'portia': 712, 'rosalind': 713,
    'belinda': 714, 'puck': 715,
    'neptune': 899, 'triton': 801, 'naiad': 803, 'thalassa': 804, 'despina': 805, 'galatea': 806, 'larissa': 807,
    'proteus': 808,
    'pluto': 999, 'charon': 901,
    'ceres': 2000001, 'pallas': 2000002, 'vesta': 2000004, 'lutetia': 2000021, 'eros': 2000433, 'davida': 2000511,
    'steins': 2002867, 'itokawa': 2025143, 'ida': 2431010, 'gaspra': 9511010,
    '19p_borrelly': 1000005, '67p': 1000012, '9p_tempel': 1000093,
}
# Země se v aplikaci počítá vlastním modelem (precese a hvězdný čas ze světového času), z jádra se nebere.


def parse(path):
    txt = open(path, encoding='latin-1').read()
    data = ' '.join(re.findall(r'\\begindata(.*?)\\begintext', txt, re.S))
    out = {}
    for m in re.finditer(r'(BODY\d+_[A-Z_]+)\s*=\s*\(([^)]*)\)', data):
        vals = [float(v.replace('D', 'E').replace('d', 'e')) for v in re.findall(r"[-+]?\d*\.?\d+(?:[DEde][-+]?\d+)?", m.group(2))]
        out[m.group(1)] = vals
    for m in re.finditer(r'(BODY\d+_[A-Z_]+)\s*=\s*([-+]?\d+(?:\.\d*)?)\s', data):
        out.setdefault(m.group(1), [float(m.group(2))])
    return out


def main():
    K = parse(sys.argv[1])
    res, systems = {}, {}
    for name, nid in NAIF.items():
        g = lambda s: K.get(f'BODY{nid}_{s}')
        ra, de, pm = g('POLE_RA'), g('POLE_DEC'), g('PM')
        if not ra or not pm:
            print('chybí v jádře:', name, nid)
            continue
        pad = lambda v: (v + [0, 0, 0])[:3]
        e = {'ra': pad(ra), 'de': pad(de), 'w': pad(pm)}
        nra, nde, nw = g('NUT_PREC_RA') or [], g('NUT_PREC_DEC') or [], g('NUT_PREC_PM') or []
        n = max(len(nra), len(nde), len(nw))
        if n and 100 <= nid < 1000:
            sysid = nid // 100
            ang = K[f'BODY{sysid}_NUT_PREC_ANGLES']
            deg = int((K.get(f'BODY{sysid}_MAX_PHASE_DEGREE') or [1])[0])
            per = deg + 1
            terms = []
            for k in range(n):
                c = [nra[k] if k < len(nra) else 0, nde[k] if k < len(nde) else 0, nw[k] if k < len(nw) else 0]
                if any(c):
                    a = ang[k * per:(k + 1) * per]
                    terms.append([a[0], a[1], a[2] if per > 2 else 0] + c)
            if terms:
                e['n'] = terms
        res[name] = e
    json.dump(res, open('src/data/rot.json', 'w'), separators=(',', ':'))
    print(len(res), 'těles;', sum(1 for v in res.values() if 'n' in v), 's periodickými členy;',
          sum(len(v.get('n', [])) for v in res.values()), 'členů')


main()
