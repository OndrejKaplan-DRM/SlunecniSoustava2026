# Referenční scény pohledu z povrchu: skutečné úkazy se známým místem a dnem (snímky NASA z Marsu, úkazy ze Země).
# Pro každou scénu stáhne z JPL Horizons zdánlivé polohy (azimut, výška bez lomu světla, úhlový průměr) a u úkazů
# najde okamžik nejmenší vzdálenosti dvou těles (krok 2 min, pak 5 s). Výstup tools/test/ref_sceny.json čte
# tools/test/t_ref_sceny.mjs (model × Horizons) a tools/test/ref_snimky.mjs (snímky modelu vedle skutečných fotek).
# Použití: python3 -I tools/model/vernost/ref_sceny.py   (dotazy jdou po jednom, mezipaměť v HZ_CACHE)
import json, math, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hz  # noqa: E402

ID = {'sun': '10', 'mercury': '199', 'venus': '299', 'earth': '399', 'moon': '301', 'mars': '499', 'phobos': '401',
      'deimos': '402', 'jupiter': '599', 'io': '501', 'saturn': '699', 'uranus': '799', 'neptune': '899'}

# druh: 'usek' = najít nejmenší vzdálenost dvojice v okně; 'chvile' = poloha v daném okamžiku (UT)
SCENY = [
    dict(id='phobos_slunce_jezero_2022', druh='usek', c='mars', lat=18.4447, lon=77.4508, okno=('2022-04-02 00:00', '2022-04-03 00:00'),
         par=('phobos', 'sun'), cile=['sun', 'phobos', 'deimos', 'earth'], fov=4,
         popis='Phobos přechází přes Slunce nad kráterem Jezero (Perseverance, Mastcam-Z, sol 397)',
         foto=dict(nasa_id='PIA25179', soubor='small', autor='NASA/JPL-Caltech/ASU/MSSS/SSI',
                   pozn='Místo = místo přistání; rover byl v dubnu 2022 asi do 5 km odtud, u Phobosu to posune úkaz o několik sekund.')),
    dict(id='deimos_slunce_gale_2019', druh='usek', c='mars', lat=-4.7, lon=137.4, okno=('2019-03-17 00:00', '2019-03-18 00:00'),
         par=('deimos', 'sun'), cile=['sun', 'deimos', 'phobos'], fov=2,
         popis='Deimos přechází přes Slunce nad kráterem Gale (Curiosity, Mastcam, sol 2350)',
         foto=dict(nasa_id='PIA23134', soubor='orig', autor='NASA/JPL-Caltech/MSSS',
                   pozn='Poloha roveru zaokrouhlená na 0,1° (asi 6 km); u Deimosu (20 000 km) je to zanedbatelné.')),
    dict(id='phobos_deimos_gale_2013', druh='usek', c='mars', lat=-4.59, lon=137.44, okno=('2013-08-01 00:00', '2013-08-02 00:00'),
         par=('phobos', 'deimos'), cile=['phobos', 'deimos', 'sun', 'earth'], fov=6,
         popis='Phobos zakrývá Deimos, pohled z kráteru Gale (Curiosity, Mastcam, sol 351)',
         foto=dict(nasa_id='PIA17350', soubor='orig', autor='NASA/JPL-Caltech/Malin Space Science Systems/Texas A&M Univ.',
                   pozn='Místo = poblíž místa přistání (rover ujel do srpna 2013 asi 1,5 km).')),
    dict(id='zeme_mesic_z_marsu_2014', druh='soumrak', c='mars', lat=-4.59, lon=137.44, den='2014-01-31', po_zapadu=80,
         cile=['earth', 'moon', 'sun', 'jupiter', 'venus'], fov=30,
         popis='Země a Měsíc na večerní obloze Marsu asi 80 minut po západu Slunce (Curiosity, sol 529)',
         foto=dict(nasa_id='PIA17936', soubor='medium', autor='NASA/JPL-Caltech/MSSS/TAMU',
                   pozn='Čas „asi 80 min po západu“ je z popisu NASA, ne z metadat snímku; porovnává se rozložení, ne sekundy.')),
    dict(id='zeme_ranni_spirit_2004', druh='svitani', c='mars', lat=-14.5684, lon=175.4726, den='2004-03-08', pred_vychodem=60,
         cile=['earth', 'sun', 'phobos', 'deimos'], fov=40,
         popis='Země na ranní obloze Marsu hodinu před východem Slunce (Spirit, Gusev, sol 63)',
         foto=dict(nasa_id='PIA05547', soubor='small', autor='NASA/JPL/Cornell/Texas A&M',
                   pozn='První snímek Země z povrchu jiné planety. Sol 63 mise Spirit odpovídá 8. 3. 2004 (začátek solu 7. 3.).')),
    dict(id='venuse_praha_2026', druh='chvile', c='earth', lat=50.0755, lon=14.4378, ut='2026-11-21 05:30',
         cile=['venus', 'mercury', 'moon', 'sun', 'jupiter', 'mars'], fov=70,
         popis='Ranní obloha nad Prahou 21. 11. 2026 v 6:30 SEČ (otcovo pozorování: jasné těleso na JV = Venuše)'),
    dict(id='velka_konjunkce_praha_2020', druh='usek', c='earth', lat=50.0755, lon=14.4378, okno=('2020-12-21 12:00', '2020-12-22 06:00'),
         par=('jupiter', 'saturn'), cile=['jupiter', 'saturn', 'sun', 'moon'], fov=2,
         popis='Velká konjunkce Jupiteru a Saturnu, pozorovatel v Praze (nejtěsnější od roku 1623)'),
    dict(id='zatmeni_dallas_2024', druh='usek', c='earth', lat=32.7767, lon=-96.7970, okno=('2024-04-08 17:00', '2024-04-08 20:00'),
         par=('moon', 'sun'), cile=['sun', 'moon', 'venus', 'jupiter'], fov=8,
         popis='Úplné zatmění Slunce 8. 4. 2024, Dallas (Texas)'),
    dict(id='jupiter_z_io_2026', druh='chvile', c='io', lat=0.0, lon=0.0, ut='2026-11-21 00:00',
         cile=['jupiter', 'sun', 'europa', 'ganymede'], fov=70,
         popis='Jupiter z Io: na nultém poledníku a rovníku stojí Jupiter (skoro) přesně v nadhlavníku – vázaná rotace'),
    dict(id='zeme_z_mesice_apollo17', druh='chvile', c='moon', lat=20.19, lon=30.77, ut='1972-12-13 12:00',
         cile=['earth', 'sun'], fov=50,
         popis='Země nad údolím Taurus-Littrow během mise Apollo 17'),
]
ID.update({'europa': '502', 'ganymede': '503'})
WEST = {}


def table(c, lat, lon, tgt, t0, t1, step, tt=False):
    """Řádky [jd, az, el, průměr″] z Horizons; čas UT (Země) nebo UT i pro ostatní tělesa (snímky mají UTC)."""
    for inp in ((-lon, lon) if WEST.get(c) else (lon, -lon)):
        p = {
            'COMMAND': ID[tgt], 'EPHEM_TYPE': 'OBSERVER', 'CENTER': f'coord@{ID[c]}', 'COORD_TYPE': 'GEODETIC',
            'SITE_COORD': f'{inp:.5f},{lat:.5f},0', 'START_TIME': t0, 'STOP_TIME': t1, 'STEP_SIZE': step,
            'TIME_TYPE': 'TT' if tt else 'UT', 'QUANTITIES': '4,13', 'APPARENT': 'AIRLESS', 'ANG_FORMAT': 'DEG',
            'CSV_FORMAT': 'YES', 'CAL_FORMAT': 'JD', 'EXTRA_PREC': 'YES',
        }
        t = hz.ask(p)
        r = hz.rows(t)
        if r:
            WEST[c] = inp != lon  # těleso chce východní délku se záporným znaménkem (pozor: záporná délka sama nic neznamená)
            break
        if 'Input east-longitude as negative' not in t:
            raise RuntimeError(re.sub(r'\s+', ' ', t[-300:]))
    out = []
    for x in r:
        f = [y.strip() for y in x.split(',')]
        out.append([float(f[0]), float(f[3]), float(f[4]), float(f[5]) if f[5] not in ('n.a.', '') else None])
    return out


def sep(a1, e1, a2, e2):
    r = math.radians
    c = math.sin(r(e1)) * math.sin(r(e2)) + math.cos(r(e1)) * math.cos(r(e2)) * math.cos(r(a1 - a2))
    return math.degrees(math.acos(max(-1, min(1, c))))


def jd2cal(jd):
    z = int(jd + 0.5); f = jd + 0.5 - z
    a = z if z < 2299161 else z + 1 + int((z - 1867216.25) / 36524.25) - int(int((z - 1867216.25) / 36524.25) / 4)
    b = a + 1524; c = int((b - 122.1) / 365.25); d = int(365.25 * c); e = int((b - d) / 30.6001)
    day = b - d - int(30.6001 * e); mo = e - 1 if e < 14 else e - 13; yr = c - 4716 if mo > 2 else c - 4715
    s = round(f * 86400); h, s = divmod(s, 3600); m, s = divmod(s, 60)
    return f'{yr:04d}-{mo:02d}-{day:02d} {h:02d}:{m:02d}:{s:02d}'


def poloha(sc, jd):
    """Polohy všech cílů scény v okamžiku jd (UT)."""
    res = {}
    for t in sc['cile']:
        r = table(sc['c'], sc['lat'], sc['lon'], t, f'JD{jd:.6f}', f'JD{jd + 1e-4:.6f}', '1')
        res[t] = {'az': r[0][1], 'el': r[0][2], 'diam': r[0][3]}
    return res


def main():
    out = []
    for sc in SCENY:
        s = {k: v for k, v in sc.items()}
        if sc['druh'] == 'usek':
            a, b = sc['par']
            A = table(sc['c'], sc['lat'], sc['lon'], a, sc['okno'][0], sc['okno'][1], '2m')
            Bt = table(sc['c'], sc['lat'], sc['lon'], b, sc['okno'][0], sc['okno'][1], '2m')
            d = [sep(x[1], x[2], y[1], y[2]) for x, y in zip(A, Bt)]
            k = min(range(len(d)), key=lambda k: d[k] if A[k][2] > -5 else 1e9)
            jd0 = A[k][0]
            A2 = table(sc['c'], sc['lat'], sc['lon'], a, f'JD{jd0 - 4 / 1440:.6f}', f'JD{jd0 + 4 / 1440:.6f}', '96')
            B2 = table(sc['c'], sc['lat'], sc['lon'], b, f'JD{jd0 - 4 / 1440:.6f}', f'JD{jd0 + 4 / 1440:.6f}', '96')
            d2 = [sep(x[1], x[2], y[1], y[2]) for x, y in zip(A2, B2)]
            k2 = min(range(len(d2)), key=lambda k: d2[k])
            # parabola přes tři nejbližší body: čas a vzdálenost minima mezi kroky 5 s
            if 0 < k2 < len(d2) - 1:
                y0, y1, y2 = d2[k2 - 1], d2[k2], d2[k2 + 1]
                den = y0 - 2 * y1 + y2
                u = 0.5 * (y0 - y2) / den if den > 0 else 0
                jdm = A2[k2][0] + u * (A2[k2 + 1][0] - A2[k2][0])
                dm = y1 - 0.25 * (y0 - y2) * u
            else:
                jdm, dm = A2[k2][0], d2[k2]
            s['jd'] = jdm
            s['min_sep'] = dm
            s['ut'] = jd2cal(jdm)
            s['r_a'], s['r_b'] = A2[k2][3], B2[k2][3]
        elif sc['druh'] in ('soumrak', 'svitani'):
            S = table(sc['c'], sc['lat'], sc['lon'], 'sun', sc['den'] + ' 00:00', sc['den'] + ' 23:59', '1m')
            # průchod horního okraje Slunce obzorem (výška středu = −poloměr); Mars: ~0,18°
            cross = [k for k in range(1, len(S)) if (S[k - 1][2] + S[k - 1][3] / 7200) * (S[k][2] + S[k][3] / 7200) < 0 and
                     ((S[k][2] < S[k - 1][2]) == (sc['druh'] == 'soumrak'))]
            if not cross:
                raise RuntimeError('nenašla jsem západ/východ Slunce: ' + sc['id'])
            k = cross[0]
            z0, z1 = S[k - 1][2] + S[k - 1][3] / 7200, S[k][2] + S[k][3] / 7200
            jdz = S[k - 1][0] + (S[k][0] - S[k - 1][0]) * z0 / (z0 - z1)
            s['jd_slunce'] = jdz
            s['jd'] = jdz + (sc['po_zapadu'] if sc['druh'] == 'soumrak' else -sc['pred_vychodem']) / 1440
            s['ut'] = jd2cal(s['jd'])
        else:
            y, mo, dd = map(int, sc['ut'][:10].split('-'))
            hh, mm = map(int, sc['ut'][11:16].split(':'))
            a = (14 - mo) // 12; yy = y + 4800 - a; m2 = mo + 12 * a - 3
            jdn = dd + (153 * m2 + 2) // 5 + 365 * yy + yy // 4 - yy // 100 + yy // 400 - 32045
            s['jd'] = jdn - 0.5 + (hh + mm / 60) / 24
            s['ut'] = jd2cal(s['jd'])
        s['hz'] = poloha(sc, s['jd'])
        out.append(s)
        extra = f"  nejmenší vzdálenost {s['min_sep'] * 60:.2f}′" if 'min_sep' in s else ''
        print(f"{sc['id']:30s} {s['ut']} UT{extra}", flush=True)
    json.dump({'zdroj': 'JPL Horizons API (observer, apparent airless), stav ' + __import__('time').strftime('%Y-%m-%d'),
               'sceny': out}, open('tools/test/ref_sceny.json', 'w'), ensure_ascii=False, indent=1)
    print('uloženo: tools/test/ref_sceny.json')


main()
