# Věrohodnost modelu proti JPL DE422 (−3000 až 3000): úhlová odchylka polohy po staletích.
# Planety a Pluto: heliocentricky i při pohledu ze Země; Měsíc geocentricky. Čas modelu = dynamický čas (TT) efemeridy.
# Potřebuje rozbalený balík de422 z PyPI (cesta v de.py) a sestavený /tmp/dump.mjs (viz dump_model.mjs).
import sys, subprocess, numpy as np, json
sys.path.insert(0, __import__("os").path.dirname(__file__))
import de422 as de
IDS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'moon']
Y0, Y1, N = -1000, 3000, 240
rng = np.random.default_rng(7)
cents = list(range(Y0, Y1, 100))
jd = np.concatenate([2451545.0 + (rng.uniform(c, c + 100, N) - 2000) * 365.25 for c in cents])
jd.tofile('/tmp/jd.bin')
subprocess.run(['node', '/tmp/dump.mjs', '/tmp/jd.bin', '/tmp/pos.bin'], check=True)
M = np.fromfile('/tmp/pos.bin').reshape(len(jd), len(IDS), 3)
def ang(a, b):
    c = np.sum(a * b, 1) / np.linalg.norm(a, axis=1) / np.linalg.norm(b, axis=1)
    cr = np.linalg.norm(np.cross(a, b), axis=1) / np.linalg.norm(a, axis=1) / np.linalg.norm(b, axis=1)
    return np.degrees(np.arctan2(cr, c)) * 3600
R = {n: de.eq2ecl(de.helio(n, jd)) / de.AU for n in IDS[:9]}
R['moon'] = de.eq2ecl(de.pos('moon', jd))
res = {}
for k, n in enumerate(IDS):
    h = ang(M[:, k], R[n])
    g = h if n in ('earth', 'moon') else ang(M[:, k] - M[:, 2], R[n] - R['earth'])
    res[n] = {'helio': [float(np.sqrt((h[i * N:(i + 1) * N] ** 2).mean())) for i in range(len(cents))],
              'geo': [float(np.sqrt((g[i * N:(i + 1) * N] ** 2).mean())) for i in range(len(cents))],
              'geomax': [float(g[i * N:(i + 1) * N].max()) for i in range(len(cents))]}
json.dump({'cents': cents, 'res': res}, open('/tmp/verohodnost.json', 'w'))
print('RMS odchylka při pohledu ze Země (úhlové vteřiny; Země heliocentricky, Měsíc geocentricky)')
print('století  ' + ''.join(f'{n[:7]:>9s}' for n in IDS))
for i, c in enumerate(cents):
    print(f'{c:6d}   ' + ''.join(f"{res[n]['geo'][i]:9.0f}" if res[n]['geo'][i] >= 10 else f"{res[n]['geo'][i]:9.1f}" for n in IDS))
