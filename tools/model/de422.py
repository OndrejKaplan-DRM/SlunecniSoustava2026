# Čtení DE422 (balík de422 z PyPI, formát jplephem 1.x) bez spouštění cizího kódu: jen pole .npy, allow_pickle=False.
import numpy as np, math
D = '/tmp/eph/x/de422-2009.1/de422'
J0, J1 = 625648.5, 2816816.5   # rozsah DE422: prosinec −3000 až leden 3000
AU = 149597870.7; EMRAT = 81.3005690699
_c = {}
def coeffs(name):
    if name not in _c: _c[name] = np.load(D + '/jpl-%s.npy' % name, mmap_mode='r', allow_pickle=False)
    return _c[name]
def pos(name, jd):
    a = coeffs(name); n = a.shape[0]; step = (J1 - J0) / n
    jd = np.atleast_1d(np.asarray(jd, dtype=float))
    i = np.clip(((jd - J0) // step).astype(int), 0, n - 1)
    tc = 2 * ((jd - J0) - i * step) / step - 1
    k = a.shape[2]
    T = np.zeros((k, jd.size)); T[0] = 1; T[1] = tc
    for j in range(2, k): T[j] = 2 * tc * T[j - 1] - T[j - 2]
    return np.einsum('nck,kn->nc', np.asarray(a[i]), T)
def helio(name, jd):
    if name == 'earth':
        return pos('earthmoon', jd) - pos('moon', jd) / (1 + EMRAT) - pos('sun', jd)
    return pos(name, jd) - pos('sun', jd)
EPS = math.radians(23.4392911)
def eq2ecl(v):
    x, y, z = v[..., 0], v[..., 1], v[..., 2]
    return np.stack([x, y * math.cos(EPS) + z * math.sin(EPS), -y * math.sin(EPS) + z * math.cos(EPS)], -1)
