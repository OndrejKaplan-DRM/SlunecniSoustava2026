import sys, json, math, numpy as np
sys.path.insert(0, __import__('os').path.dirname(__file__))
import de422 as de
from scipy.optimize import least_squares
DEG = math.pi/180; J2000 = 2451545.0; AS = DEG/3600
tab = json.load(open('/tmp/moon_tab.json'))  # tabulky ML, MR, MB vyexportované ze src/core/sim.js; ML, MR, MB = [np.array(tab[k], float) for k in ('ML','MR','MB')]
def R1(a): c, s = np.cos(a), np.sin(a); z, o = np.zeros_like(a), np.ones_like(a); return np.array([[o,z,z],[z,c,s],[z,-s,c]])
def R3(a): c, s = np.cos(a), np.sin(a); z, o = np.zeros_like(a), np.ones_like(a); return np.array([[c,s,z],[-s,c,z],[z,z,o]])
def moon(T, mode, c=None):
    c = np.zeros(20) if c is None else c
    P = lambda k: c[4*k] + c[4*k+1]*T + c[4*k+2]*T*T + c[4*k+3]*T**3   # opravy ve stupních
    if mode == 0:
        Lp = 218.3164477 + 481267.88123421*T; D = 297.8501921 + 445267.1114034*T; M = 357.5291092 + 35999.0502909*T
        Mp = 134.9633964 + 477198.8675055*T; F = 93.272095 + 483202.0175233*T; E = 1 + 0*T
    else:
        Lp = 218.3164477 + 481267.88123421*T - 0.0015786*T**2 + T**3/538841 - T**4/65194000 + P(0)
        D = 297.8501921 + 445267.1114034*T - 0.0018819*T**2 + T**3/545868 - T**4/113065000 + P(1)
        M = 357.5291092 + 35999.0502909*T - 0.0001536*T**2 + T**3/24490000 + P(2)
        Mp = 134.9633964 + 477198.8675055*T + 0.0087414*T**2 + T**3/69699 - T**4/14712000 + P(3)
        F = 93.2720950 + 483202.0175233*T - 0.0036539*T**2 - T**3/3526000 + T**4/863310000 + P(4)
        E = 1 - 0.002516*T - 0.0000074*T*T
    Lp, D, M, Mp, F = [x*DEG for x in (Lp, D, M, Mp, F)]
    def ser(tb, fn):
        s = 0
        for t in tb:
            k = E**abs(t[1]) if mode else 1
            s = s + t[4]*k*fn(t[0]*D + t[1]*M + t[2]*Mp + t[3]*F)
        return s
    sl, sr, sb = ser(ML, np.sin), ser(MR, np.cos), ser(MB, np.sin)
    if mode:
        A1 = (119.75 + 131.849*T)*DEG; A2 = (53.09 + 479264.290*T)*DEG; A3 = (313.45 + 481266.484*T)*DEG
        sl = sl + 3958*np.sin(A1) + 1962*np.sin(Lp - F) + 318*np.sin(A2)
        sb = sb - 2235*np.sin(Lp) + 382*np.sin(A3) + 175*np.sin(A1 - F) + 175*np.sin(A1 + F) + 127*np.sin(Lp - Mp) - 115*np.sin(Lp + Mp)
    lat = sb*1e-6*DEG; r = 385000.56 + sr*1e-3
    if mode == 0:
        lon = Lp + sl*1e-6*DEG - 1.396971*T*DEG
        return np.stack([r*np.cos(lat)*np.cos(lon), r*np.cos(lat)*np.sin(lon), r*np.sin(lat)], -1)
    lon = Lp + sl*1e-6*DEG
    v = np.stack([r*np.cos(lat)*np.cos(lon), r*np.cos(lat)*np.sin(lon), r*np.sin(lat)], -1)
    eta = (47.0029*T - 0.03302*T**2 + 0.000060*T**3)*AS; Pi = 174.876384*DEG + (-869.8089*T + 0.03536*T**2)*AS; p = (5029.0966*T + 1.11113*T**2 - 0.000006*T**3)*AS
    Mx = np.einsum('ijn,jkn,kln->nil', R3(-(Pi + p)), R1(eta), R3(Pi))    # J2000 → datum
    if mode == 2: return np.einsum('nji,nj->ni', Mx, v)   # transpozice: datum → J2000
    return np.einsum('nij,nj->ni', Mx, v)
def ang(a, b):
    na, nb = np.linalg.norm(a, axis=1), np.linalg.norm(b, axis=1)
    return np.degrees(np.arctan2(np.linalg.norm(np.cross(a, b), axis=1), np.sum(a*b, 1)))*3600
if __name__ == '__main__':
    rng = np.random.default_rng(3)
    for y0 in (-1000, 0, 1000, 1900, 2900):
        jd = J2000 + (rng.uniform(y0, y0+100, 3000) - 2000)*365.25; T = (jd - J2000)/36525; R = de.eq2ecl(de.pos('moon', jd))
        print(y0, [round(float(np.sqrt((ang(moon(T, m), R)**2).mean())), 1) for m in (0, 2, 3)])
