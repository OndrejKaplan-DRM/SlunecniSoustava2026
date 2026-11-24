# Referenční polohy a rychlosti měsíců z JPL Horizons (vůči středu mateřského tělesa, ICRF, km a km/s, čas TDB).
# Tři nesouměřitelné mřížky v letech 1900–2100 (dohromady asi 4 600 okamžiků na měsíc; nepravidelné rozestupy brání
# zrcadlení krátkých period). Výstup: <složka>/<id>.json. Použití: python3 -I tools/model/vernost/mesice_ref.py <složka> [id …]
import json, os, re, sys

sys.path.insert(0, os.path.dirname(__file__))
import hz

HZ = {
    'phobos': 401, 'deimos': 402,
    'io': 501, 'europa': 502, 'ganymede': 503, 'callisto': 504, 'amalthea': 505, 'himalia': 506, 'elara': 507,
    'pasiphae': 508, 'sinope': 509, 'lysithea': 510, 'carme': 511, 'ananke': 512, 'leda': 513, 'thebe': 514,
    'adrastea': 515, 'metis': 516, 'themisto': 518,
    'mimas': 601, 'enceladus': 602, 'tethys': 603, 'dione': 604, 'rhea': 605, 'titan': 606, 'hyperion': 607,
    'iapetus': 608, 'phoebe': 609, 'janus': 610, 'epimetheus': 611, 'helene': 612, 'telesto': 613, 'calypso': 614,
    'atlas': 615, 'prometheus': 616, 'pandora': 617, 'pan': 618, 'pallene': 633, 'polydeuces': 634, 'daphnis': 635,
    'ariel': 701, 'umbriel': 702, 'titania': 703, 'oberon': 704, 'miranda': 705, 'cordelia': 706, 'ophelia': 707,
    'bianca': 708, 'cressida': 709, 'desdemona': 710, 'juliet': 711, 'portia': 712, 'rosalind': 713, 'belinda': 714,
    'puck': 715, 'caliban': 716, 'sycorax': 717, 'perdita': 725, 'mab': 726, 'cupid': 727,
    'triton': 801, 'nereid': 802, 'naiad': 803, 'thalassa': 804, 'despina': 805, 'galatea': 806, 'larissa': 807,
    'proteus': 808, 'halimede': 809, 'psamathe': 810, 'sao': 811, 'laomedeia': 812, 'neso': 813, 'hippocamp': 814,
    'charon': 901, 'nix': 902, 'hydra': 903, 'kerberos': 904, 'styx': 905,
}
GRIDS = [('1900-01-02', '2099-12-30', 1789), ('1900-03-17', '2099-11-05', 1511), ('1901-07-02', '2098-05-21', 1327)]


def fetch(hid, a, b, n, depth=0):
    center = f'500@{hid // 100}99'
    t = hz.ask({
        'COMMAND': hid, 'EPHEM_TYPE': 'VECTORS', 'CENTER': center, 'REF_PLANE': 'FRAME', 'REF_SYSTEM': 'ICRF',
        'VEC_TABLE': '2', 'OUT_UNITS': 'KM-S', 'CSV_FORMAT': 'YES', 'VEC_CORR': 'NONE', 'VEC_LABELS': 'NO',
        'START_TIME': a, 'STOP_TIME': b, 'STEP_SIZE': n,
    })
    r = hz.rows(t)
    if r:
        out = []
        for x in r:
            f = [y.strip() for y in x.split(',')]
            out.append([float(f[0])] + [float(y) for y in f[2:8]])
        return out
    # efemerida měsíce nepokrývá celé období: zúžit podle zprávy serveru
    m = re.search(r'(prior to|after) A\.D\.\s+(\d{4})-([A-Za-z]{3})-(\d{2})', t)
    if m and depth < 3:
        y = int(m.group(2))
        if m.group(1) == 'prior to':
            a = f'{y + 1}-01-02'
        else:
            b = f'{y - 1}-12-30'
        if int(a[:4]) < int(b[:4]) - 5:
            return fetch(hid, a, b, max(300, n * (int(b[:4]) - int(a[:4])) // 200), depth + 1)
    print('   bez dat:', hid, re.sub(r'\s+', ' ', t[-200:]))
    return None


def main():
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    dense = '--husta' in sys.argv  # hustá řada: rok 2026 po 3 hodinách (určení středního pohybu a stáčení bez zrcadlení)
    only = set(x for x in sys.argv[2:] if not x.startswith('--'))
    for name, hid in HZ.items():
        if only and name not in only:
            continue
        f = os.path.join(out, name + ('_d' if dense else '') + '.json')
        if os.path.exists(f):
            continue
        rows = []
        for a, b, n in [('2026-01-01', '2026-12-31', '3 h')] if dense else GRIDS:
            r = fetch(hid, a, b, n)
            if r:
                rows += r
        if not rows:
            print(name, 'nic', flush=True)
            continue
        rows.sort()
        json.dump({'id': name, 'hz': hid, 'rows': rows}, open(f, 'w'), separators=(',', ':'))
        print(name, len(rows), 'okamžiků,', round((rows[0][0] - 2451545) / 365.25 + 2000, 1), '–', round((rows[-1][0] - 2451545) / 365.25 + 2000, 1), flush=True)


main()
