# Dotazy na JPL Horizons (API) s vyrovnávací pamětí na disku. Použití z ostatních skriptů ve složce.
# Pozor: dotazy posílej po jednom (ne souběžně), server je sdílený.
import hashlib, json, os, re, subprocess, time, urllib.parse

CACHE = os.environ.get('HZ_CACHE', '/home/claude/work/hz')
API = 'https://ssd.jpl.nasa.gov/api/horizons.api'


def ask(params, retry=3):
    q = {'format': 'text', 'OBJ_DATA': 'NO', 'MAKE_EPHEM': 'YES'}
    q.update(params)
    key = hashlib.sha1(json.dumps(q, sort_keys=True).encode()).hexdigest()[:20]
    f = os.path.join(CACHE, key + '.txt')
    if os.path.exists(f):
        return open(f).read()
    url = API + '?' + '&'.join(f"{k}={urllib.parse.quote(str(v) if k in ('format',) else chr(39) + str(v) + chr(39))}" for k, v in q.items())
    for k in range(retry):
        r = subprocess.run(['curl', '-s', '--max-time', '60', url], capture_output=True, text=True)
        t = r.stdout
        if 'API VERSION' in t:  # server odpověděl (i chybovou zprávou) – opakovat jen při výpadku spojení
            break
        time.sleep(2 + 3 * k)
    os.makedirs(CACHE, exist_ok=True)
    if t.strip():
        open(f, 'w').write(t)
    time.sleep(0.25)
    return t


def rows(t):
    m = re.search(r'\$\$SOE\n(.*?)\$\$EOE', t, re.S)
    return [x for x in m.group(1).split('\n') if x.strip()] if m else None


def azel(center, lon, lat, target, jd, tt=True, alt=0.0, extra='4,13,20,10'):
    """Zdánlivý azimut a výška (bez lomu světla) cíle z místa na tělese; čas JD v TT (nebo UT)."""
    p = {
        'COMMAND': target,
        'EPHEM_TYPE': 'OBSERVER',
        'CENTER': f'coord@{center}',
        'COORD_TYPE': 'GEODETIC',
        'SITE_COORD': f'{lon:.5f},{lat:.5f},{alt:.4f}',
        'TLIST': f'{jd:.6f}',
        'TLIST_TYPE': 'JD',
        'TIME_TYPE': 'TT' if tt else 'UT',
        'QUANTITIES': extra,
        'APPARENT': 'AIRLESS',
        'ANG_FORMAT': 'DEG',
        'CSV_FORMAT': 'YES',
        'CAL_FORMAT': 'JD',
        'EXTRA_PREC': 'YES',
    }
    t = ask(p)
    r = rows(t)
    return t, r
