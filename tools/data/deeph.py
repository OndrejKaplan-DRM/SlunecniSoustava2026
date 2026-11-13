# Vyhodnocení DE421 z balíku de421 (PyPI, starý formát jplephem 1.x): Čebyševovy koeficienty po granulích.
import numpy as np, os, de421, math
D = os.path.dirname(de421.__file__)
J0, J1 = 2414992.5, 2524624.5  # jalpha, jomega z constants.npy
C = dict((k.decode(), v) for k, v in np.load(D + '/constants.npy', allow_pickle=True))
AU = C['AU']; EMRAT = C['EMRAT']
_cache = {}
def coeffs(name):
    if name not in _cache: _cache[name] = np.load(D + '/jpl-%s.npy' % name)
    return _cache[name]
def pos(name, jd):
    """poloha (km) vůči barycentru Sluneční soustavy, ICRF (rovník J2000); moon = geocentrická"""
    a = coeffs(name); n = a.shape[0]; step = (J1 - J0) / n
    jd = np.atleast_1d(np.asarray(jd, dtype=float))
    i = np.clip(((jd - J0) // step).astype(int), 0, n - 1)
    tc = 2 * ((jd - J0) - i * step) / step - 1
    k = a.shape[2]
    T = np.zeros((k, jd.size)); T[0] = 1; T[1] = tc
    for j in range(2, k): T[j] = 2 * tc * T[j - 1] - T[j - 2]
    return np.einsum('nck,kn->nc', a[i], T)
def helio(name, jd):
    if name == 'earth':
        emb = pos('earthmoon', jd); m = pos('moon', jd)
        return emb - m / (1 + EMRAT) - pos('sun', jd)
    return pos(name, jd) - pos('sun', jd)
EPS = math.radians(23.4392911)
def eq2ecl(v):
    x, y, z = v[..., 0], v[..., 1], v[..., 2]
    return np.stack([x, y * math.cos(EPS) + z * math.sin(EPS), -y * math.sin(EPS) + z * math.cos(EPS)], -1)
