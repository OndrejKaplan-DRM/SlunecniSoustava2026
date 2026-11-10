# Katalog 150 těles Sluneční soustavy pro Planetku (Kristína, 2026-11-07).
# Výběr podle zadání: blízkost k Zemi (+), velikost (+), známost (+) → skóre = 0,30·velikost + 0,25·blízkost + 0,45·známost.
# Vstupy: katalog Stellaria (ssystem_major.ini, ssystem_minor.ini – údaje z JPL/MPC/IAU), fit měsíců (fit_moons.py),
# ruční tabulky (bodies_extra.py), fakta (facts_cs.py). Výstup: out/catalog.json + docs/SOUSTAVA_VYBER.md.
import re, json, math, sys, os
from bodies_extra import CS, FAME, SMALL, EXTRA_HELIO, EXTRA_SAT, TROJANS, JPL, MASS, ATM, RINGS, MISSIONS
from facts_cs import F as FACTS
from moonref import POLE as FIT_POLE
RAW = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/raw/stellarium'
HERE = os.path.dirname(os.path.abspath(__file__))
J2000 = 2451545.0; GK = 0.01720209895  # Gaussova konstanta (rad/den pro a = 1 AU)

def parse(fn):
    txt = open(fn, encoding='utf-8', errors='replace').read(); out = {}
    for s in re.split(r'\n(?=\[)', txt):
        d = {}
        for m in re.finditer(r'^\s*(\w+)\s*=\s*(.*?)\s*(#.*)?$', s, re.M): d[m.group(1)] = m.group(2)
        if 'name' in d: out[d['name']] = d
    return out
MAJ = parse(os.path.join(RAW, 'ssystem_major.ini')); MIN = parse(os.path.join(RAW, 'ssystem_minor.ini'))
FIT = json.load(open(os.path.join(HERE, 'out/moonfit.json')))
PFIT = json.load(open(os.path.join(HERE, 'out/planetfit.json'))) if os.path.exists(os.path.join(HERE, 'out/planetfit.json')) else {}
MFIT3 = json.load(open(os.path.join(HERE, 'out/moonfit3.json'))) if os.path.exists(os.path.join(HERE, 'out/moonfit3.json')) else {}
MFIT2 = json.load(open(os.path.join(HERE, 'out/moonfit2.json'))) if os.path.exists(os.path.join(HERE, 'out/moonfit2.json')) else {}
def pcorr(name):
    """opravy planet z fit_planets.py: argument členu = a0 + a1·T (T v juliánských stoletích od J2000), λ ze středních délek Standish"""
    f = PFIT.get(name.lower());
    if not f: return None
    L = {k.lower(): v for k, v in JPL.items()}; D = math.pi / 180; terms = []
    for c, j, q, k, A, B in f['terms']:
        lp0, lp1 = L[name.lower()][0][3] * D, L[name.lower()][1][3] * D; lq0, lq1 = (L[q][0][3] * D, L[q][1][3] * D) if q != name.lower() else (0, 0)
        kk = k if q != name.lower() else 0
        terms.append([c, round(j * lp0 + kk * lq0, 9), round(j * lp1 + kk * lq1, 9), float('%.4g' % A), float('%.4g' % B)])
    return {'el': f['el'], 'rate': f['rate'], 'terms': terms, 'rms_as': f['rms_as']}
fl = lambda d, k, dv=None: float(d[k].split()[0].rstrip(',')) if k in d and d[k] not in ('', None) else dv
fame = {n: t for t, ns in FAME.items() for n in ns}
MINOR_PICK = ['Ceres', 'Vesta', 'Pallas', 'Hygiea', 'Juno', 'Psyche', 'Eros', 'Ida', 'Gaspra', 'Mathilde', 'Lutetia', 'Steins', 'Itokawa',
 'Ryugu', 'Bennu', 'Apophis', 'Kleopatra', 'Eris', 'Haumea', 'Makemake', 'Gonggong', 'Quaoar', 'Sedna', 'Orcus', 'Salacia', 'Varuna',
 'Varda', 'Interamnia', 'Davida', 'Sylvia', 'Eunomia', 'Euphrosyne', 'Cybele', 'Hebe', 'Iris', 'Flora', 'Phaethon', 'Cruithne',
 'Kamo`oalewa', '`Oumuamua', '1P/Halley (1986)', 'Hale-Bopp', 'Hyakutake', 'NEOWISE',
 'Fortuna','Egeria','Amphitrite','Astraea','Thisbe','Doris','Patientia','Herculin','Eugenia','Elektra','Eleonora','Laetitia','Harmonia','Parthenope','Victoria','Irene','Melpomene','Nysa','Julia','Hesperia','Ursula','Alauda','Diotima','Duende','Sisyphus','Eos','Borisov',"G!kun||'homdima",'West','Ikeya-Seki','McNaught','Lovejoy','Bennett','Arend-Roland','Kirch (Great Comet of 1680)','NEAT',
 'Icarus', 'Eureka', 'Dembowska', 'Bamberga', 'Massalia', 'Huya', 'Themis', 'Kalliope', 'Hermione', 'Daphne', 'Camilla']
NASA = {'Mars': 'Mars', 'Phobos': 'Mars - Phobos', 'Deimos': 'Mars - Deimos', 'Jupiter': 'Jupiter', 'Io': 'Jupiter - Io (B)', 'Europa': 'Jupiter - Europa',
 'Ganymede': 'Jupiter - Ganymede', 'Callisto': 'Jupiter - Callisto', 'Saturn': 'Saturn', 'Mimas': 'Saturn - Mimas', 'Enceladus': 'Saturn - Enceladus',
 'Tethys': 'Saturn - Tethys', 'Dione': 'Saturn - Dione', 'Rhea': 'Saturn - Rhea', 'Titan': 'Saturn - Titan', 'Iapetus': 'Saturn - Iapetus',
 'Ariel': 'Uranus - Ariel', 'Umbriel': 'Uranus - Umbriel', 'Titania': 'Uranus - Titania', 'Oberon': 'Uranus - Oberon', 'Miranda': 'Uranus - Miranda',
 'Neptune': 'Neptune', 'Triton': 'Neptune - Triton', 'Pluto': 'Pluto', 'Charon': 'Pluto - Charon', 'Venus': 'Venus'}
slug = lambda n: re.sub(r'[^a-z0-9]+', '_', n.lower().replace('`', '')).strip('_').replace('1p_halley_1986', 'halley')

# ---------- kandidáti ----------
cand = {}
for n, d in MAJ.items():
    if 'Observer' in n: continue
    cand[n] = dict(src='stellarium', d=d, parent=(d.get('parent', 'Sun') if n != 'Sun' else None))
for n in MINOR_PICK:
    cand[n] = dict(src='stellarium', d=MIN[n], parent='Sun')
for n, e in EXTRA_HELIO.items(): cand[n] = dict(src='pamet', d={}, parent='Sun', helio=e)
for n, e in EXTRA_SAT.items(): cand[n] = dict(src='pamet', d={}, parent=e['parent'], sat=e)

def radius_km(n, c):
    if n in SMALL: return SMALL[n]['R']
    if n in EXTRA_SAT: return EXTRA_SAT[n]['R']
    return fl(c['d'], 'radius', 1.0)
def helio_of(n):  # q, Q (AU) heliocentrické dráhy tělesa nebo jeho mateřského tělesa
    c = cand[n]
    if c['parent'] not in (None, 'Sun'): return helio_of(c['parent']) if c['parent'] in cand else (1, 1)
    if n == 'Sun': return (0, 0)
    if n in JPL: a, e = JPL[n][0][0], JPL[n][0][1]; return (a * (1 - e), a * (1 + e))
    if 'helio' in c: h = c['helio']; return (h['a'] * (1 - h['e']), h['a'] * (1 + h['e']))
    d = c['d']; e = fl(d, 'orbit_Eccentricity', 0)
    a = fl(d, 'orbit_SemiMajorAxis') or (fl(d, 'orbit_PericenterDistance') / (1 - e) if e < 1 else None)
    q = fl(d, 'orbit_PericenterDistance') or a * (1 - e)
    return (q, a * (1 + e) if a and e < 1 else 1e4)
def near_score(n):
    if n in ('Earth', 'Moon'): return 1.0
    q, Q = helio_of(n); d = 0 if (q <= 1.0167 and Q >= 0.9833) else min(abs(q - 1.0167), abs(Q - 0.9833)) if (q > 1 or Q < 1) else 0
    if q > 1.0167: d = q - 1.0167
    elif Q < 0.9833: d = 0.9833 - Q
    return 1 / (1 + d / 1.5)
rows = []
for n, c in cand.items():
    R = radius_km(n, c); fs = fame.get(n, 1)
    s_size = max(0, min(1, math.log10(max(R, 0.03) / 0.03) / math.log10(70000 / 0.03)))
    s_near = near_score(n); s = 0.30 * s_size + 0.25 * s_near + 0.45 * fs / 5
    force = n in ('Sun', 'Mercury', 'Venus', 'Earth', 'Moon', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune')
    rows.append((s + (10 if force else 0), n, R, s_size, s_near, fs))
rows.sort(key=lambda r: -r[0])
# satelity potřebují v katalogu mateřské těleso
pick = []
for r in rows:
    if len(pick) >= 200: break
    n = r[1]; p = cand[n]['parent']
    if p and p != 'Sun' and p not in [x[1] for x in pick] and p not in [x[1] for x in rows[:rows.index(r)]]: continue
    pick.append(r)
names = [r[1] for r in pick]
for n in names:  # mateřská tělesa musí být vybraná
    p = cand[n]['parent']
    assert p in (None, 'Sun') or p in names, (n, p)

# ---------- záznamy ----------
def deg(x): return float(x)
def sat_from_stellarium(n, d, parent):
    ep = fl(d, 'orbit_Epoch', J2000); P = fl(d, 'orbit_Period'); n_ = 2 * math.pi / P
    lam = math.radians(fl(d, 'orbit_MeanLongitude', 0)) + n_ * (J2000 - ep)
    return dict(kind='sat', frame='eq', flip=False, a=fl(d, 'orbit_SemiMajorAxis'), e=fl(d, 'orbit_Eccentricity', 0),
                i=math.radians(fl(d, 'orbit_Inclination', 0)), O0=math.radians(fl(d, 'orbit_AscendingNode', 0)), Od=0.0,
                w0=math.radians(fl(d, 'orbit_LongOfPericenter', 0)), wd=0.0, L0=lam % (2 * math.pi), n=n_, src='stellarium')
# tvary nepravidelných měsíců (poloosy km; Wikipedie, src='pamet' – ověřit proti JPL SSD); tvar podle osy x = k mateřskému tělesu
MOON_SHAPE = {'Phobos': (13.0, 11.4, 9.1), 'Deimos': (7.8, 6.0, 5.1), 'Amalthea': (125, 73, 64), 'Thebe': (58, 49, 42), 'Hyperion': (180.1, 133.0, 102.7),
              'Janus': (101.7, 92.6, 76.3), 'Epimetheus': (64.9, 57.3, 53.0), 'Prometheus': (68.2, 41.6, 28.2), 'Pandora': (52.2, 40.8, 31.5),
              'Atlas': (20.5, 17.8, 9.4), 'Pan': (17.2, 15.4, 10.4), 'Daphnis': (4.3, 4.1, 3.2), 'Proteus': (218, 208, 201), 'Mimas': (207.8, 196.7, 190.6),
              'Enceladus': (256.6, 251.4, 248.3), 'Miranda': (240.4, 234.2, 232.9), 'Larissa': (108, 96, 96), 'Galatea': (102, 92, 72), 'Despina': (90, 74, 64), 'Puck': (81, 81, 81)}
recs = {}
for s, n, R, s_size, s_near, fs in pick:
    c = cand[n]; d = c['d']; sid = slug(n); parent = c['parent']
    rec = dict(id=sid, name=n, cs=CS.get(n, n.replace('`', 'ʻ')), parent=slug(parent) if parent else None, R=R,
               score=round(s - (10 if s > 5 else 0), 4), s_size=round(s_size, 3), s_near=round(s_near, 3), fame=fs, src=c['src'])
    t = d.get('type', '').strip()
    rec['type'] = ('star' if n == 'Sun' else 'planet' if n in JPL and n != 'Pluto' else 'dwarf' if n in ('Pluto', 'Ceres', 'Eris', 'Haumea', 'Makemake')
                   else 'moon' if parent not in (None, 'Sun') else 'interstellar' if n in ('`Oumuamua', 'Borisov') else 'comet' if (t == 'comet' or c.get('helio', {}).get('type') == 'comet') else
                   'interstellar' if n == '`Oumuamua' else 'tno' if helio_of(n)[0] > 28 else 'centaur' if helio_of(n)[0] > 5.5 else 'asteroid')
    if n in SMALL:
        sm = SMALL[n]; rec.update(abc=sm.get('abc'), rot=sm['rot'], rho=sm['rho'], albedo=sm['alb'])
        if 'rings' in sm: rec['rings'] = sm['rings']
    else:
        rec['albedo'] = fl(d, 'albedo', EXTRA_SAT.get(n, {}).get('alb', 0.3))
        rp = fl(d, 'rot_periode')
        if rp is None and parent not in (None, 'Sun'):
            P = fl(d, 'orbit_Period') or EXTRA_SAT.get(n, {}).get('P')
            rp = (P or 1) * 24  # vázaná rotace
        rec['rot'] = rp
        if n in EXTRA_SAT: rec['rho'] = EXTRA_SAT[n]['rho']
        if n in MOON_SHAPE: rec['abc'] = MOON_SHAPE[n]
    if rec['albedo'] is not None and rec['albedo'] < 0: rec['albedo'] = None
    col = d.get('color'); rec['color'] = [float(x) for x in col.split(',')] if col else None
    rec['H'] = fl(d, 'absolute_magnitude')
    if 'rot_pole_ra' in d: rec['pole'] = [fl(d, 'rot_pole_ra'), fl(d, 'rot_pole_de'), fl(d, 'rot_pole_ra1', 0.0), fl(d, 'rot_pole_de1', 0.0)]
    if 'rot_pole_w0' in d: rec['W'] = [fl(d, 'rot_pole_w0'), fl(d, 'rot_pole_w1')]
    rec['flat'] = fl(d, 'oblateness', 0.0)
    m = fl(d, 'mass_kg') or MASS.get(n)
    if m is None:
        rho = rec.get('rho') or (1.6 if rec['type'] in ('moon', 'tno', 'dwarf') else 2.5)
        m = rho * 1000 * 4 / 3 * math.pi * (R * 1000) ** 3
    rec['mass'] = m; rec['g'] = 6.674e-11 * m / (R * 1000) ** 2; rec['vesc'] = math.sqrt(2 * 6.674e-11 * m / (R * 1000))
    # dráha
    if n == 'Sun': rec['orbit'] = dict(kind='sun')
    elif n == 'Moon': rec['orbit'] = dict(kind='game')  # Měsíc Planetky (bodies.js)
    elif n in JPL: rec['orbit'] = dict(kind='jpl', el=JPL[n][0], rate=JPL[n][1], corr=pcorr(n))
    elif 'helio' in c:
        h = c['helio']; Tp = h.get('Tp')
        if Tp is None: nn = GK / h['a'] ** 1.5; Tp = h['ep'] - math.radians(h['M']) / nn
        rec['orbit'] = dict(kind='kep', q=h['a'] * (1 - h['e']), e=h['e'], i=h['i'], O=h['O'], w=h['w'], Tp=Tp, approx=True)
    elif parent == 'Sun':
        e = fl(d, 'orbit_Eccentricity'); q = fl(d, 'orbit_PericenterDistance')
        if q is None: q = fl(d, 'orbit_SemiMajorAxis') * (1 - e)
        Tp = fl(d, 'orbit_TimeAtPericenter')
        if Tp is None:
            a = fl(d, 'orbit_SemiMajorAxis'); nn = math.radians(fl(d, 'orbit_MeanMotion')) if 'orbit_MeanMotion' in d else GK / a ** 1.5
            Tp = fl(d, 'orbit_Epoch') - math.radians(fl(d, 'orbit_MeanAnomaly')) / nn
        rec['orbit'] = dict(kind='kep', q=q, e=e, i=fl(d, 'orbit_Inclination'), O=fl(d, 'orbit_AscendingNode'), w=fl(d, 'orbit_ArgOfPericenter'), Tp=Tp)
    elif n in FIT:
        f = FIT[n]; Rp = fl(MAJ[parent], 'radius')
        def conv(q): return dict(a=q[0] * Rp, e=abs(q[1]), i=q[2], O0=q[3], Od=q[4], w0=q[5], wd=q[6], L0=q[7] % (2 * math.pi), n=q[8])
        rec['orbit'] = dict(kind='sat', frame='eq', flip=f['flip'], src='fit_pyephem', **conv(f['const']), mean=conv(f['mean']), rms_const_deg=f['rms_const_deg'], rms_mean_deg=f['rms_mean_deg'])
        best = min([c for c in (MFIT2.get(n), MFIT3.get(n)) if c and c['rms_deg'] < 0.95 * c['rms0_deg']], key=lambda c: c['rms_deg'], default=None)
        if best: rec['orbit']['corr'] = best  # jen když oprava na nezávislých časech pomáhá; lepší z it2 a it3
    elif n in TROJANS:
        host, off = TROJANS[n]; rec['orbit'] = dict(kind='trojan', host=slug(host), dlam=math.radians(off))
    elif 'orbit_SemiMajorAxis' in d: rec['orbit'] = sat_from_stellarium(n, d, parent)
    elif n in EXTRA_SAT:
        e = EXTRA_SAT[n]
        if 'trojan' in e: rec['orbit'] = dict(kind='trojan', host=slug(e['trojan'][0]), dlam=math.radians(e['trojan'][1]))
        else:
            ph = (hash(n) % 1000) / 1000 * 2 * math.pi
            rec['orbit'] = dict(kind='sat', frame='eq', flip=False, a=e['a'], e=e['e'], i=math.radians(e['i']), O0=0.0, Od=0.0, w0=0.0, wd=0.0, L0=ph, n=2 * math.pi / e['P'], src='pamet', approx=True)
    else: raise SystemExit('bez dráhy: ' + n)
    if n in FIT_POLE: rec['framePole'] = list(FIT_POLE[n])  # soustava, ve které jsou fitované dráhy měsíců
    if n in NASA: rec['map'] = 'nasa:' + NASA[n]
    if n in ATM: rec['atm'] = ATM[n]
    if n in RINGS: rec['rings'] = list(RINGS[n])
    if n in MISSIONS: rec['missions'] = MISSIONS[n]
    if 'discovery' in d: rec['disc'] = [d.get('discovery', '')[:4], d.get('discoverer', '')]
    if n in FACTS: rec['kid'], rec['adult'] = FACTS[n]
    recs[sid] = rec
# pořadí: Slunce, planety podle vzdálenosti, měsíce za mateřským tělesem, ostatní podle skóre
order = ['sun', 'mercury', 'venus', 'earth', 'moon', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']
rest = sorted([k for k in recs if k not in order], key=lambda k: (recs[k]['type'] == 'moon', -recs[k]['score']))
out = [recs[k] for k in order + rest]
json.dump({'generated': '2026-11-07', 'n': len(out), 'bodies': out}, open(os.path.join(HERE, 'out/catalog.json'), 'w'), ensure_ascii=False, indent=1)
# tabulka výběru
lines = ['# Výběr 150 těles (skóre = 0,30·velikost + 0,25·blízkost k Zemi + 0,45·známost)', '',
         'Velikost: log₁₀(R / 0,03 km) / log₁₀(70 000 / 0,03). Blízkost: 1 / (1 + d / 1,5 AU), d = mezera mezi dráhou tělesa (u měsíce jeho planety) a dráhou Země.',
         'Známost 1–5: 5 učebnice a atlas, 4 mise a populární knihy, 3 encyklopedie, 2 vlastní článek, 1 jen v seznamech. Slunce, planety a Měsíc jsou povinné.', '',
         '| # | těleso | typ | R (km) | velikost | blízkost | známost | skóre |', '|---|---|---|---|---|---|---|---|']
for i, (s, n, R, a, b, f) in enumerate(pick):
    r = recs[slug(n)]; lines.append(f"| {i + 1} | {r['cs']} | {r['type']} | {R:g} | {a:.2f} | {b:.2f} | {f} | {s - (10 if s > 5 else 0):.3f} |")
lines += ['', '## Nevybraní kandidáti (nejvyšší skóre)', ''] + [f"- {n} ({s:.3f})" for s, n, *_ in rows[len(pick):len(pick) + 25]]
open(os.path.join(HERE, 'out/VYBER.md'), 'w').write('\n'.join(lines) + '\n')
from collections import Counter
print(len(out), Counter(r['type'] for r in out)); print('bez fit měsíců:', [r['name'] for r in out if r['orbit']['kind'] == 'sat' and r['orbit'].get('src') != 'fit_pyephem'][:60])
