# Referenční polohy měsíců z PyEphem (teorie: Mars – ESAPHO/ESADE, Jupiter – Lieske E5, Saturn – TASS 1.7, Uran – GUST86)
# převedené do ICRF (rovník J2000) a do soustavy rovníku mateřské planety (pól podle IAU WGCCRE).
# r = x·východ − y·sever − z·(směr Země→planeta), v poloměrech planety (PyEphem: x na východ, y na jih, z k Zemi).
import ephem, math, numpy as np
MOONS = {  # jméno: (třída PyEphem, mateřská planeta, třída planety)
 'Phobos': (ephem.Phobos, 'Mars', ephem.Mars), 'Deimos': (ephem.Deimos, 'Mars', ephem.Mars),
 'Io': (ephem.Io, 'Jupiter', ephem.Jupiter), 'Europa': (ephem.Europa, 'Jupiter', ephem.Jupiter),
 'Ganymede': (ephem.Ganymede, 'Jupiter', ephem.Jupiter), 'Callisto': (ephem.Callisto, 'Jupiter', ephem.Jupiter),
 'Mimas': (ephem.Mimas, 'Saturn', ephem.Saturn), 'Enceladus': (ephem.Enceladus, 'Saturn', ephem.Saturn),
 'Tethys': (ephem.Tethys, 'Saturn', ephem.Saturn), 'Dione': (ephem.Dione, 'Saturn', ephem.Saturn),
 'Rhea': (ephem.Rhea, 'Saturn', ephem.Saturn), 'Titan': (ephem.Titan, 'Saturn', ephem.Saturn),
 'Hyperion': (ephem.Hyperion, 'Saturn', ephem.Saturn), 'Iapetus': (ephem.Iapetus, 'Saturn', ephem.Saturn),
 'Ariel': (ephem.Ariel, 'Uranus', ephem.Uranus), 'Umbriel': (ephem.Umbriel, 'Uranus', ephem.Uranus),
 'Titania': (ephem.Titania, 'Uranus', ephem.Uranus), 'Oberon': (ephem.Oberon, 'Uranus', ephem.Uranus),
 'Miranda': (ephem.Miranda, 'Uranus', ephem.Uranus),
}
POLE = {'Mars': (317.68143, 52.88650), 'Jupiter': (268.056595, 64.495303), 'Saturn': (40.589, 83.537), 'Uranus': (257.311, -15.175), 'Neptune': (299.36, 43.46), 'Pluto': (132.993, -6.163)}
DJ = 2415020.0  # ephem.Date 0 = 1899-12-31 12:00 = JD 2415020.0
def vec(ra, de): return np.array([math.cos(de) * math.cos(ra), math.cos(de) * math.sin(ra), math.sin(de)])
def to_j2000(v, date):
    """směr (rovník dne date) → J2000 přes ephem.Equatorial"""
    r = math.hypot(*v); ra = math.atan2(v[1], v[0]); de = math.asin(v[2] / r)
    e = ephem.Equatorial(ra, de, epoch=date); e2 = ephem.Equatorial(e, epoch=ephem.J2000)
    return vec(float(e2.ra), float(e2.dec)) * r
def pole_frame(parent):
    ra, de = [math.radians(x) for x in POLE[parent]]; p = vec(ra, de)
    X = np.cross([0, 0, 1], p); X /= np.linalg.norm(X); Y = np.cross(p, X)
    return np.array([X, Y, p])  # řádky: osy soustavy rovníku planety v ICRF
def moon_icrf(name, jd):
    """poloha měsíce vůči planetě v ICRF (poloměry planety)"""
    cls, parent, pcls = MOONS[name]; d = ephem.Date(jd - DJ)
    m = cls(); m.compute(d, epoch=d); pl = pcls(); pl.compute(d, epoch=d)
    a, dd = float(pl.ra), float(pl.dec)
    u = vec(a, dd); e = np.array([-math.sin(a), math.cos(a), 0.0]); n = np.array([-math.sin(dd) * math.cos(a), -math.sin(dd) * math.sin(a), math.cos(dd)])
    r = m.x * e - m.y * n - m.z * u
    return to_j2000(r, d)
def moon_eqp(name, jd):
    return pole_frame(MOONS[name][1]) @ moon_icrf(name, jd)
