// Soustava 200 – katalog, efemeridy, natočení těles. Souřadnice scény: km, heliocentricky, osa Y = severní pól ekliptiky
// (ekliptika J2000 (x, y, z) → scéna (x, z, −y)). Vše v plovoucí čárce 64 bit; do GPU jdou až rozdíly vůči kameře.
import { Ephem, eq2ecl, DEG, J2000, conicPos, longWeight } from './ephem.js';
import { shapeParams } from './shape.js';
import CAT from '../data/cat.json';

export const AU = 149597870.7;
export const B = CAT.bodies,
  RING = CAT.ring,
  N = B.length;
export const idx = new Map(B.map((b, i) => [b.id, i]));
export const par = B.map((b) => (b.parent ? idx.get(b.parent) : -1));
export const kids = B.map(() => []);
par.forEach((p, i) => {
  if (p >= 0) kids[p].push(i);
});
const E = new Ephem(B, { variant: 2 });
const SUN = idx.get('sun'),
  EARTH = idx.get('earth'),
  MOON = idx.get('moon');
export { SUN, EARTH, MOON };

// pořadí „rodič dřív než dítě“
const topo = [];
(function walk(i) {
  topo.push(i);
  for (const k of kids[i]) walk(k);
})(SUN);
export const root = B.map((b, i) => {
  let k = i;
  while (par[k] >= 0 && par[k] !== SUN) k = par[k];
  return k;
}); // planeta (nebo těleso kolem Slunce), ke které patří

// --- Měsíc: zkrácená řada podle Meeuse (kap. 47), přesnost ~0,05° ---
const ML = [
  [0, 0, 1, 0, 6288774],
  [2, 0, -1, 0, 1274027],
  [2, 0, 0, 0, 658314],
  [0, 0, 2, 0, 213618],
  [0, 1, 0, 0, -185116],
  [0, 0, 0, 2, -114332],
  [2, 0, -2, 0, 58793],
  [2, -1, -1, 0, 57066],
  [2, 0, 1, 0, 53322],
  [2, -1, 0, 0, 45758],
  [0, 1, -1, 0, -40923],
  [1, 0, 0, 0, -34720],
  [0, 1, 1, 0, -30383],
  [2, 0, 0, -2, 15327],
  [0, 0, 1, 2, -12528],
  [0, 0, 1, -2, 10980],
  [4, 0, -1, 0, 10675],
  [0, 0, 3, 0, 10034],
  [4, 0, -2, 0, 8548],
  [2, 1, -1, 0, -7888],
  [2, 1, 0, 0, -6766],
  [1, 0, -1, 0, -5163],
  [1, 1, 0, 0, 4987],
  [2, -1, 1, 0, 4036],
];
const MR = [
  [0, 0, 1, 0, -20905355],
  [2, 0, -1, 0, -3699111],
  [2, 0, 0, 0, -2955968],
  [0, 0, 2, 0, -569925],
  [0, 1, 0, 0, 48888],
  [0, 0, 0, 2, -3149],
  [2, 0, -2, 0, 246158],
  [2, -1, -1, 0, -152138],
  [2, 0, 1, 0, -170733],
  [2, -1, 0, 0, -204586],
  [0, 1, -1, 0, -129620],
  [1, 0, 0, 0, 108743],
  [0, 1, 1, 0, 104755],
  [2, 0, 0, -2, 10321],
  [0, 0, 1, -2, 79661],
  [4, 0, -1, 0, -34782],
  [0, 0, 3, 0, -23210],
  [4, 0, -2, 0, -21636],
  [2, 1, -1, 0, 24208],
  [2, 1, 0, 0, 30824],
  [1, 0, -1, 0, -8379],
  [1, 1, 0, 0, -16675],
  [2, -1, 1, 0, -12831],
];
const MB = [
  [0, 0, 0, 1, 5128122],
  [0, 0, 1, 1, 280602],
  [0, 0, 1, -1, 277693],
  [2, 0, 0, -1, 173237],
  [2, 0, -1, 1, 55413],
  [2, 0, -1, -1, 46271],
  [2, 0, 0, 1, 32573],
  [0, 0, 2, 1, 17198],
  [2, 0, 1, -1, 9266],
  [0, 0, 2, -1, 8822],
  [2, -1, 0, -1, 8216],
  [2, 0, -2, -1, 4324],
  [2, 0, 1, 1, 4200],
];
// Verze 1.3: střední argumenty s členy T² až T⁴ (Meeus 47.1–47.5), činitel E u členů se střední anomálií Slunce, přídavné členy
// (Venuše, Jupiter, zploštění Země) a přesný převod z ekliptiky data na ekliptiku J2000 (Meeus kap. 21). Proti JPL DE422
// je střední odchylka 33″ dnes, 44″ v roce 0 a 59″ v roce −1000 (dřív 38″, 2 900″ a 6 600″).
const AS = DEG / 3600;
function moonGeo(jd, out) {
  // geocentricky, ekliptika J2000, km
  const T = (jd - J2000) / 36525,
    T2 = T * T,
    T3 = T2 * T,
    T4 = T3 * T;
  const Lp = (218.3164477 + 481267.88123421 * T - 0.0015786 * T2 + T3 / 538841 - T4 / 65194000) * DEG,
    D = (297.8501921 + 445267.1114034 * T - 0.0018819 * T2 + T3 / 545868 - T4 / 113065000) * DEG,
    M = (357.5291092 + 35999.0502909 * T - 0.0001536 * T2 + T3 / 24490000) * DEG,
    Mp = (134.9633964 + 477198.8675055 * T + 0.0087414 * T2 + T3 / 69699 - T4 / 14712000) * DEG,
    F = (93.272095 + 483202.0175233 * T - 0.0036539 * T2 - T3 / 3526000 + T4 / 863310000) * DEG,
    E = 1 - 0.002516 * T - 0.0000074 * T2,
    E2 = E * E;
  const ek = (m) => (m === 0 ? 1 : m === 1 || m === -1 ? E : E2);
  let sl = 0,
    sr = 0,
    sb = 0;
  for (const t of ML) sl += t[4] * ek(t[1]) * Math.sin(t[0] * D + t[1] * M + t[2] * Mp + t[3] * F);
  for (const t of MR) sr += t[4] * ek(t[1]) * Math.cos(t[0] * D + t[1] * M + t[2] * Mp + t[3] * F);
  for (const t of MB) sb += t[4] * ek(t[1]) * Math.sin(t[0] * D + t[1] * M + t[2] * Mp + t[3] * F);
  const A1 = (119.75 + 131.849 * T) * DEG,
    A2 = (53.09 + 479264.29 * T) * DEG,
    A3 = (313.45 + 481266.484 * T) * DEG;
  sl += 3958 * Math.sin(A1) + 1962 * Math.sin(Lp - F) + 318 * Math.sin(A2);
  sb +=
    -2235 * Math.sin(Lp) +
    382 * Math.sin(A3) +
    175 * Math.sin(A1 - F) +
    175 * Math.sin(A1 + F) +
    127 * Math.sin(Lp - Mp) -
    115 * Math.sin(Lp + Mp);
  const lon = Lp + sl * 1e-6 * DEG,
    lat = sb * 1e-6 * DEG,
    r = 385000.56 + sr * 1e-3,
    cl = Math.cos(lat);
  return ed2j(r * cl * Math.cos(lon), r * cl * Math.sin(lon), r * Math.sin(lat), T, out);
}
// ekliptika a rovnodennost data → ekliptika J2000: v0 = R3(−Π)·R1(−η)·R3(Π + p)·v (Meeus, kap. 21)
function ed2j(x, y, z, T, out) {
  const T2 = T * T,
    T3 = T2 * T,
    eta = (47.0029 * T - 0.03302 * T2 + 0.00006 * T3) * AS,
    Pi = 174.876384 * DEG + (-869.8089 * T + 0.03536 * T2) * AS,
    a = Pi + (5029.0966 * T + 1.11113 * T2 - 0.000006 * T3) * AS;
  const ca = Math.cos(a),
    sa = Math.sin(a),
    x1 = ca * x + sa * y,
    y1 = -sa * x + ca * y,
    ce = Math.cos(eta),
    se = Math.sin(eta),
    y2 = ce * y1 - se * z,
    z2 = se * y1 + ce * z,
    cp = Math.cos(Pi),
    sp = Math.sin(Pi);
  out[0] = cp * x1 - sp * y2;
  out[1] = sp * x1 + cp * y2;
  out[2] = z2;
  return out;
}

// --- Čas: aplikace ukazuje světový čas (UT), dráhy těles běží v rovnoměrném čase efemerid (TT). Rozdíl ΔT = TT − UT roste se
// vzdáleností od současnosti, protože se rotace Země zpomaluje (dnes asi 70 s, v roce 1000 asi 26 minut, v roce −500 asi 4,8 hodiny).
// Polynomy: Espenak a Meeus, Five Millennium Canon of Solar Eclipses (NASA/TP-2006-214141). Výsledek v sekundách.
export function deltaT(jd) {
  const y = 2000 + (jd - J2000) / 365.25;
  let t, u;
  if (y < -500) return ((u = (y - 1820) / 100), -20 + 32 * u * u);
  if (y < 500)
    return (
      (u = y / 100),
      10583.6 +
        u * (-1014.41 + u * (33.78311 + u * (-5.952053 + u * (-0.1798452 + u * (0.022174192 + u * 0.0090316521)))))
    );
  if (y < 1600)
    return (
      (u = (y - 1000) / 100),
      1574.2 +
        u * (-556.01 + u * (71.23472 + u * (0.319781 + u * (-0.8503463 + u * (-0.005050998 + u * 0.0083572073)))))
    );
  if (y < 1700) return ((t = y - 1600), 120 + t * (-0.9808 + t * (-0.01532 + t / 7129)));
  if (y < 1800) return ((t = y - 1700), 8.83 + t * (0.1603 + t * (-0.0059285 + t * (0.00013336 - t / 1174000))));
  if (y < 1860)
    return (
      (t = y - 1800),
      13.72 +
        t *
          (-0.332447 +
            t *
              (0.0068612 +
                t * (0.0041116 + t * (-0.00037436 + t * (0.0000121272 + t * (-0.0000001699 + t * 0.000000000875))))))
    );
  if (y < 1900)
    return (
      (t = y - 1860),
      7.62 + t * (0.5737 + t * (-0.251754 + t * (0.01680668 + t * (-0.0004473624 + t / 233174))))
    );
  if (y < 1920) return ((t = y - 1900), -2.79 + t * (1.494119 + t * (-0.0598939 + t * (0.0061966 - t * 0.000197))));
  if (y < 1941) return ((t = y - 1920), 21.2 + t * (0.84493 + t * (-0.0761 + t * 0.0020936)));
  if (y < 1961) return ((t = y - 1950), 29.07 + t * (0.407 + t * (-1 / 233 + t / 2547)));
  if (y < 1986) return ((t = y - 1975), 45.45 + t * (1.067 + t * (-1 / 260 - t / 718)));
  if (y < 2005)
    return (
      (t = y - 2000),
      63.86 + t * (0.3345 + t * (-0.060374 + t * (0.0017275 + t * (0.000651814 + t * 0.00002373599))))
    );
  if (y < 2050) return ((t = y - 2000), 62.92 + t * (0.32217 + t * 0.005589));
  if (y < 2150) return ((u = (y - 1820) / 100), -20 + 32 * u * u - 0.5628 * (2150 - y));
  return ((u = (y - 1820) / 100), -20 + 32 * u * u);
}
// čas efemerid (JD) pro daný světový čas (JD)
export const ttOf = (jd) => jd + deltaT(jd) / 86400;

// poloha vůči mateřskému tělesu v km, souřadnice scény
const _t = [0, 0, 0],
  _mw = [0, 0, 0],
  EMR1 = 82.30057; // 1 + hmotnost Země / hmotnost Měsíce
// jd je světový čas (UT) – stejný, jaký ukazuje aplikace; polohy se počítají v čase efemerid
export function local(i, jdUT, out, o = 0) {
  const k = B[i].orbit.kind,
    jd = ttOf(jdUT);
  if (i === MOON) moonGeo(jd, _t);
  else {
    E.local(i, jd, _t);
    if (k === 'jpl' || k === 'kep') {
      _t[0] *= AU;
      _t[1] *= AU;
      _t[2] *= AU;
    }
    if (i === EARTH) {
      /* dlouhodobá teorie dává těžiště Země–Měsíc: Země je od něj odsunutá proti Měsíci (až 4 700 km) */
      const w = longWeight(jd);
      if (w > 0) {
        moonGeo(jd, _mw);
        _t[0] -= (w * _mw[0]) / EMR1;
        _t[1] -= (w * _mw[1]) / EMR1;
        _t[2] -= (w * _mw[2]) / EMR1;
      }
    }
  }
  out[o] = _t[0];
  out[o + 1] = _t[2];
  out[o + 2] = -_t[1];
  return out;
}
export const P = new Float64Array(N * 3); // heliocentrické polohy (scéna, km)
export function updateAll(jd) {
  for (const i of topo) {
    if (i === SUN) continue;
    local(i, jd, P, i * 3);
    const p = par[i];
    if (p !== SUN) {
      P[i * 3] += P[p * 3];
      P[i * 3 + 1] += P[p * 3 + 1];
      P[i * 3 + 2] += P[p * 3 + 2];
    }
  }
}

// --- dráhy: perioda (dny) a velká poloosa (km) ---
export const period = new Float64Array(N),
  semi = new Float64Array(N);
B.forEach((b, i) => {
  const o = b.orbit;
  let Pd = Infinity,
    a = 0;
  if (i === MOON) {
    Pd = 27.321661;
    a = 384400;
  } else if (o.kind === 'sat') {
    Pd = (2 * Math.PI) / Math.abs(o.n);
    a = o.a;
  } else if (o.kind === 'trojan') {
    const h = B[idx.get(o.host)].orbit;
    Pd = (2 * Math.PI) / Math.abs(h.n);
    a = h.a;
  } else if (o.kind === 'jpl') {
    a = o.el[0] * AU;
    Pd = 365.25636 * Math.pow(o.el[0], 1.5);
  } else if (o.kind === 'kep') {
    if (o.e < 0.9999) {
      const aa = o.q / (1 - o.e);
      a = aa * AU;
      Pd = 365.25636 * Math.pow(aa, 1.5);
    } else {
      a = o.q * AU * 40;
    }
  }
  period[i] = Pd;
  semi[i] = a;
});
// vzorky dráhy (vůči mateřskému tělesu), zhuštěné kolem současné polohy, aby čára procházela přesně tělesem
export function orbitSamples(i, jd, n, out) {
  const Pd = period[i],
    o = B[i].orbit,
    ts = [];
  if (Pd < 365.25 * 400) {
    for (let k = 0; k <= n; k++) {
      const u = (k / n) * 2 - 1;
      ts.push(jd + Pd * 0.5 * u * u * u);
    }
  } else {
    // dlouhé a otevřené dráhy: úsek kolem přísluní + zhuštění kolem „teď“
    const span = Math.min(Pd / 2, Math.max(365.25 * 80, Math.abs(jd - o.Tp) + 365.25 * 40)),
      h = n >> 1,
      s = new Set();
    for (let k = 0; k <= h; k++) {
      const u = (k / h) * 2 - 1;
      s.add(o.Tp + span * u * u * u);
    }
    for (let k = 0; k < n - h; k++) {
      const u = ((k + 0.5) / (n - h)) * 2 - 1;
      const t = jd + 365.25 * 30 * u * u * u;
      if (Math.abs(t - o.Tp) <= span) s.add(t);
      else s.add(o.Tp + span * u);
    }
    ts.push(...[...s].sort((x, y) => x - y));
    while (ts.length < n + 1) ts.push(ts[ts.length - 1]);
    ts.length = n + 1;
  }
  for (let k = 0; k <= n; k++) local(i, ts[k], out, k * 3);
  return out;
}

// --- natočení: sloupce = osy tělesa (x nultý poledník, z pól) ve scéně ---
const s3 = (v) => {
  eq2ecl(v);
  return [v[0], v[2], -v[1]];
};
const frames = B.map((b) => {
  if (!b.pole) return null;
  const T = 0.27,
    ra = (b.pole[0] + b.pole[2] * T) * DEG,
    de = (b.pole[1] + b.pole[3] * T) * DEG;
  const p = [Math.cos(de) * Math.cos(ra), Math.cos(de) * Math.sin(ra), Math.sin(de)],
    X = [-Math.sin(ra), Math.cos(ra), 0];
  const Y = [p[1] * X[2] - p[2] * X[1], p[2] * X[0] - p[0] * X[2], p[0] * X[1] - p[1] * X[0]];
  return { X: s3(X), Y: s3(Y), Z: s3(p) };
});
// Země: osa i jarní bod data (precese 50,3″ za rok, sklon i pohyb ekliptiky) a hvězdný čas v Greenwichi
// ze světového času. Díky tomu padá stín zatmění na správné místo Země i tisíce let od současnosti.
const _eq = [0, 0, 0],
  _ez = [0, 0, 0];
function earthBasis(jd, m) {
  const d = jd - J2000,
    T = d / 36525,
    eps = (23.4392911 - (46.815 * T + 0.00059 * T * T - 0.001813 * T * T * T) / 3600) * DEG,
    G = ((((280.46061837 + 360.98564736629 * d + 0.000387933 * T * T) % 360) + 360) % 360) * DEG;
  /* v ekliptice data: jarní bod (1, 0, 0), pól (0, sin ε, cos ε); převod na ekliptiku J2000 */
  const q = ed2j(1, 0, 0, T, _eq),
    Z = ed2j(0, Math.sin(eps), Math.cos(eps), T, _ez),
    u = [Z[1] * q[2] - Z[2] * q[1], Z[2] * q[0] - Z[0] * q[2], Z[0] * q[1] - Z[1] * q[0]],
    c = Math.cos(G),
    s = Math.sin(G);
  const X = [q[0] * c + u[0] * s, q[1] * c + u[1] * s, q[2] * c + u[2] * s],
    Y = [-q[0] * s + u[0] * c, -q[1] * s + u[1] * c, -q[2] * s + u[2] * c];
  /* ekliptika (x, y, z) → scéna (x, z, −y) */
  m[0] = X[0];
  m[1] = X[2];
  m[2] = -X[1];
  m[3] = Y[0];
  m[4] = Y[2];
  m[5] = -Y[1];
  m[6] = Z[0];
  m[7] = Z[2];
  m[8] = -Z[1];
  return m;
}
const seedOf = (b) => [...b.id].reduce((s, c) => (s * 31 + c.charCodeAt(0)) % 9973, 7) / 9973;
const _l = [0, 0, 0];
export function basis(i, jd, m) {
  // m: pole 9 čísel (sloupce X, Y, Z)
  const b = B[i],
    f = frames[i],
    d = jd - J2000;
  if (i === EARTH) return earthBasis(jd, m);
  if (f && b.W) {
    const W = ((b.W[0] + b.W[1] * d) % 360) * DEG,
      c = Math.cos(W),
      s = Math.sin(W);
    for (let k = 0; k < 3; k++) {
      m[k] = f.X[k] * c + f.Y[k] * s;
      m[3 + k] = -f.X[k] * s + f.Y[k] * c;
      m[6 + k] = f.Z[k];
    }
    return m;
  }
  let Z = [0, 1, 0];
  const p = par[i];
  if (p >= 0 && p !== SUN && frames[p]) Z = frames[p].Z;
  else if (p === SUN) {
    const s = seedOf(b),
      ob = s * 0.6,
      az = s * 37;
    Z = [Math.sin(ob) * Math.cos(az), Math.cos(ob), Math.sin(ob) * Math.sin(az)];
  }
  let X;
  if (p >= 0 && p !== SUN) {
    local(i, jd, _l);
    X = [-_l[0], -_l[1], -_l[2]];
  } // malé měsíce: vázaná rotace, dlouhá osa k planetě
  else {
    const a = ((d * 24) / (b.rot || 10)) * 2 * Math.PI,
      c = Math.cos(a),
      s = Math.sin(a),
      u = Math.abs(Z[1]) < 0.99 ? [0, 1, 0] : [1, 0, 0];
    const e1 = norm(cross(u, Z)),
      e2 = cross(Z, e1);
    X = [e1[0] * c + e2[0] * s, e1[1] * c + e2[1] * s, e1[2] * c + e2[2] * s];
  }
  const dz = X[0] * Z[0] + X[1] * Z[1] + X[2] * Z[2];
  X = norm([X[0] - Z[0] * dz, X[1] - Z[1] * dz, X[2] - Z[2] * dz]);
  const Y = cross(Z, X);
  for (let k = 0; k < 3; k++) {
    m[k] = X[k];
    m[3 + k] = Y[k];
    m[6 + k] = Z[k];
  }
  return m;
}
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function norm(a) {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
}
export function spinRate(i) {
  const b = B[i];
  if (b.W) return b.W[1] * DEG;
  if (par[i] !== SUN && par[i] >= 0) return (2 * Math.PI) / period[i];
  return (2 * Math.PI * 24) / (b.rot || 10);
} // rad/den
const _pm = new Array(9);
export function poleOf(i, jd, out) {
  const m = basis(i, jd, _pm);
  out[0] = m[6];
  out[1] = m[7];
  out[2] = m[8];
  return out;
}

// --- tvar ---
export const shape = B.map((b) => {
  const s = shapeParams(b);
  let a = s.a;
  if (!b.abc && b.flat) a = [1, 1, 1 - b.flat];
  const rmax = Math.max(...a) * (1 + s.lump * 0.85);
  return { a, lump: s.lump, neck: s.neck, seed: s.seed, rmax: b.R * rmax, irregular: s.lump > 0 || s.neck > 0 };
});
export const jdNow = () => Date.now() / 86400000 + 2440587.5;
export { conicPos, DEG, J2000 };
