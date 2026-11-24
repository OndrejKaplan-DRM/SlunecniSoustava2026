// Místo na povrchu tělesa (verze 2.1): poloha pozorovatele a místní soustava (zenit, východ, sever), směry na obloze
// (azimut, výška), převody na rovníkové souřadnice a časy východů. Čistá matematika bez kreslení: stejný kód používá
// aplikace (render/engine.js, ui/povrch.js) i zkouška proti JPL Horizons (tools/test/t_vernost.mjs).
// Šířka je planetografická (geodetická): úhel mezi svislicí a rovníkem na zploštělém elipsoidu – jako na mapách a v Horizons.
// Délka je východní v soustavě IAU (kladná k východu, 0° = nultý poledník); západní délku starších map dostaneš jako 360° − délka.
import { B, P, basis, shape, SUN, N, local, par, period, AU, ttOf } from './sim.js';
import { shapeR } from './shape.js';
const DEG = Math.PI / 180,
  CE = Math.cos(23.4392911 * DEG),
  SE = Math.sin(23.4392911 * DEG),
  m9 = new Array(9);
export const C_KMS = 299792.458;
/* Výška očí nad povrchem (km): 2 m, u velkých těles o něco víc, aby pohled nezapadl do nerovností modelu */
export const eyeH = (i) => 0.002 + B[i].R * 1e-5;
/**
 * Místní soustava v místě (lat, lon ve stupních) tělesa i v čase jd (UT).
 * Vrací o = { n, e, no, p }: zenit, východ, sever (jednotkové vektory ve scéně) a polohu vůči středu tělesa (km, scéna).
 */
export function siteFrame(i, lat, lon, jd, o = {}) {
  const la = lat * DEG,
    lo = lon * DEG,
    cl = Math.cos(la),
    sl = Math.sin(la),
    b0 = cl * Math.cos(lo),
    b1 = cl * Math.sin(lo),
    b2 = sl,
    s = shape[i],
    R = B[i].R;
  let q0, q1, q2; /* poloha v soustavě tělesa (km) */
  if (s.irregular || Math.abs(s.a[0] - s.a[1]) > 0.02) {
    /* nepravidelná tělesa: svislice = směr od středu, výška podle tvaru modelu */
    const r = R * shapeR([b0, b1, b2], s) + eyeH(i);
    q0 = b0 * r;
    q1 = b1 * r;
    q2 = b2 * r;
  } else {
    const A = (R * (s.a[0] + s.a[1])) / 2,
      C = R * s.a[2],
      e2 = 1 - (C * C) / (A * A),
      Nn = A / Math.sqrt(1 - e2 * sl * sl),
      h = eyeH(i);
    q0 = (Nn + h) * b0;
    q1 = (Nn + h) * b1;
    q2 = (Nn * (1 - e2) + h) * b2;
  }
  basis(i, jd, m9);
  const n = o.n || (o.n = [0, 0, 0]),
    e = o.e || (o.e = [0, 0, 0]),
    no = o.no || (o.no = [0, 0, 0]),
    p = o.p || (o.p = [0, 0, 0]);
  for (let k = 0; k < 3; k++) {
    n[k] = b0 * m9[k] + b1 * m9[3 + k] + b2 * m9[6 + k];
    p[k] = q0 * m9[k] + q1 * m9[3 + k] + q2 * m9[6 + k];
  }
  /* východ = pól × zenit; na pólu náhradní směr (osa x tělesa) */
  e[0] = m9[7] * n[2] - m9[8] * n[1];
  e[1] = m9[8] * n[0] - m9[6] * n[2];
  e[2] = m9[6] * n[1] - m9[7] * n[0];
  let l = Math.hypot(e[0], e[1], e[2]);
  if (l < 1e-6) {
    e[0] = m9[3];
    e[1] = m9[4];
    e[2] = m9[5];
    l = 1;
  }
  e[0] /= l;
  e[1] /= l;
  e[2] /= l;
  no[0] = n[1] * e[2] - n[2] * e[1];
  no[1] = n[2] * e[0] - n[0] * e[2];
  no[2] = n[0] * e[1] - n[1] * e[0];
  o.pole = [m9[6], m9[7], m9[8]];
  return o;
}
/* směr (dx, dy, dz ve scéně, nemusí být jednotkový) → [azimut od severu k východu, výška] v radiánech */
export function azEl(f, dx, dy, dz, out = [0, 0]) {
  const l = Math.hypot(dx, dy, dz) || 1;
  out[0] = Math.atan2(dx * f.e[0] + dy * f.e[1] + dz * f.e[2], dx * f.no[0] + dy * f.no[1] + dz * f.no[2]);
  out[1] = Math.asin(Math.max(-1, Math.min(1, (dx * f.n[0] + dy * f.n[1] + dz * f.n[2]) / l)));
  return out;
}
/* azimut a výška (rad) → jednotkový směr ve scéně */
export function dirOfAzEl(f, az, el, out = [0, 0, 0]) {
  const ce = Math.cos(el),
    a = ce * Math.sin(az),
    b = ce * Math.cos(az),
    c = Math.sin(el);
  for (let k = 0; k < 3; k++) out[k] = a * f.e[k] + b * f.no[k] + c * f.n[k];
  return out;
}
/* směr ve scéně → rovníkové souřadnice ICRF/J2000: [rektascenze 0–2π, deklinace] v radiánech */
export function raDec(dx, dy, dz, out = [0, 0]) {
  /* scéna (x, y, z) = ekliptika (x, z, −y) → ekliptika (x, −z, y) → rovník */
  const ex = dx,
    ey = -dz,
    ez = dy,
    qy = ey * CE - ez * SE,
    qz = ey * SE + ez * CE,
    l = Math.hypot(ex, qy, qz) || 1;
  out[0] = (Math.atan2(qy, ex) + 2 * Math.PI) % (2 * Math.PI);
  out[1] = Math.asin(Math.max(-1, Math.min(1, qz / l)));
  return out;
}
/* rovníkové souřadnice (rad) → jednotkový směr ve scéně */
export function dirOfRaDec(ra, de, out = [0, 0, 0]) {
  const cd = Math.cos(de),
    x = cd * Math.cos(ra),
    y = cd * Math.sin(ra),
    z = Math.sin(de);
  out[0] = x;
  out[1] = -y * SE + z * CE;
  out[2] = -(y * CE + z * SE);
  return out;
}
/* směr k tělesu j z místa (soustava f, těleso i): vektor ve scéně (km) */
export function toBody(f, i, j, out = [0, 0, 0]) {
  for (let k = 0; k < 3; k++) out[k] = P[j * 3 + k] - P[i * 3 + k] - f.p[k];
  return out;
}
/* lom světla v zemském ovzduší (Bennett 1982, 1010 hPa, 10 °C): o kolik stupňů je těleso zdánlivě výš; h = skutečná výška ve stupních */
export function refraction(h) {
  if (h < -1.2) return 0;
  /* Sæmundssonův vzorec pro skutečnou výšku */
  return 1.02 / Math.tan((h + 10.3 / (h + 5.11)) * DEG) / 60;
}
/* osvětlená část kotouče tělesa j při pohledu z bodu C (scéna, km): 0–1 */
export function litFrac(j, cx, cy, cz) {
  if (j === SUN) return 1;
  const tx = P[j * 3],
    ty = P[j * 3 + 1],
    tz = P[j * 3 + 2],
    ox = cx - tx,
    oy = cy - ty,
    oz = cz - tz,
    lo = Math.hypot(ox, oy, oz) || 1,
    ls = Math.hypot(tx, ty, tz) || 1,
    c = (ox * -tx + oy * -ty + oz * -tz) / (lo * ls);
  return (1 + c) / 2;
}
export { N as BODIES };

// ---------- polohy mimo pole P (nemění scénu): pro časy východů, dobu letu světla a zkoušky ----------
const _h = [0, 0, 0];
/* heliocentrická poloha tělesa j v čase jd (UT), km, scéna – součet poloh vůči mateřským tělesům */
export function helio(j, jd, out = [0, 0, 0]) {
  out[0] = out[1] = out[2] = 0;
  for (let k = j; k >= 0 && k !== SUN; k = par[k]) {
    local(k, jd, _h);
    out[0] += _h[0];
    out[1] += _h[1];
    out[2] += _h[2];
  }
  return out;
}
export const rootOf = (i) => {
  while (par[i] >= 0 && par[i] !== SUN) i = par[i];
  return i;
};
/**
 * Zdánlivé polohy (doba letu světla): přepíše pole P tak, jak tělesa vidí pozorovatel na tělese i v čase jd.
 * Každá cizí soustava (planeta se svými měsíci, planetka, Slunce) se posune tam, kde byla, když z ní světlo vyšlo,
 * a o pohyb pozorovatelova tělesa za tu dobu – tím vyjde i aberace. Vlastní soustava pozorovatele (planeta a její měsíce)
 * zůstává: světlo tam letí sekundy. Volat po updateAll(jd). Vrací dobu letu světla od Slunce ve dnech.
 */
const _o0 = [0, 0, 0],
  _o1 = [0, 0, 0],
  _t1 = [0, 0, 0];
export function applyLightTime(i, jd) {
  P[SUN * 3] = P[SUN * 3 + 1] = P[SUN * 3 + 2] = 0; /* Slunce updateAll nepřepisuje: začít od počátku */
  const ri = rootOf(i),
    ox = P[i * 3],
    oy = P[i * 3 + 1],
    oz = P[i * 3 + 2];
  let tauSun = 0;
  for (let r = 0; r < N; r++) {
    if (r !== SUN && (par[r] !== SUN || r === ri)) continue; /* jen kořeny cizích soustav a Slunce */
    const d = Math.hypot(P[r * 3] - ox, P[r * 3 + 1] - oy, P[r * 3 + 2] - oz),
      tau = d / C_KMS / 86400;
    if (r === SUN) tauSun = tau;
    helio(i, jd - tau, _o1);
    const sx = ox - _o1[0],
      sy = oy - _o1[1],
      sz = oz - _o1[2];
    if (r === SUN) {
      P[0 + SUN * 3] = sx;
      P[1 + SUN * 3] = sy;
      P[2 + SUN * 3] = sz;
      continue;
    }
    helio(r, jd - tau, _t1);
    const dx = _t1[0] + sx - P[r * 3],
      dy = _t1[1] + sy - P[r * 3 + 1],
      dz = _t1[2] + sz - P[r * 3 + 2];
    P[r * 3] += dx;
    P[r * 3 + 1] += dy;
    P[r * 3 + 2] += dz;
    lt(r, jd - tau, _t1[0] + sx, _t1[1] + sy, _t1[2] + sz);
  }
  return tauSun;
}
/* měsíce (a jejich měsíce) soustavy: poloha v čase t vůči posunutému mateřskému tělesu */
const _l2 = [0, 0, 0];
function lt(p, t, px, py, pz) {
  for (const k of KIDS[p]) {
    local(k, t, _l2);
    const x = px + _l2[0],
      y = py + _l2[1],
      z = pz + _l2[2];
    P[k * 3] = x;
    P[k * 3 + 1] = y;
    P[k * 3 + 2] = z;
    if (KIDS[k].length) lt(k, t, x, y, z);
  }
}
const KIDS = B.map(() => []);
par.forEach((p, k) => {
  if (p >= 0) KIDS[p].push(k);
});
/* výška tělesa j nad obzorem (rad) z místa na tělese i v čase jd, bez zásahu do scény (geometricky) */
const _sf = {},
  _a = [0, 0, 0],
  _b = [0, 0, 0];
export function elevAt(i, lat, lon, j, jd) {
  siteFrame(i, lat, lon, jd, _sf);
  helio(i, jd, _a);
  helio(j, jd, _b);
  const dx = _b[0] - _a[0] - _sf.p[0],
    dy = _b[1] - _a[1] - _sf.p[1],
    dz = _b[2] - _a[2] - _sf.p[2];
  return Math.asin((dx * _sf.n[0] + dy * _sf.n[1] + dz * _sf.n[2]) / Math.hypot(dx, dy, dz));
}
/**
 * Nejbližší východ a západ tělesa j (okraj se nepočítá, jen střed kotouče na matematickém obzoru, bez lomu světla).
 * Hledá od jd dopředu nejvýš `span` dní po krocích `step`. Vrací { rise, set, up } – juliánská data (UT) nebo null.
 */
export function riseSet(i, lat, lon, j, jd, span, step) {
  let e0 = elevAt(i, lat, lon, j, jd),
    rise = null,
    set = null;
  const up = e0 > 0;
  for (let t = jd + step; t <= jd + span && (rise === null || set === null); t += step) {
    const e1 = elevAt(i, lat, lon, j, t);
    if (e0 <= 0 !== e1 <= 0) {
      let a = t - step,
        b = t,
        ea = e0;
      for (let k = 0; k < 18; k++) {
        const m = (a + b) / 2,
          em = elevAt(i, lat, lon, j, m);
        if (ea <= 0 === em <= 0) {
          a = m;
          ea = em;
        } else b = m;
      }
      if (e1 > 0 && rise === null) rise = (a + b) / 2;
      else if (e1 <= 0 && set === null) set = (a + b) / 2;
    }
    e0 = e1;
  }
  return { rise, set, up };
}
/* doba mezi dvěma poledni (sluneční den) na tělese i, ve dnech; záporná = Slunce jde od západu k východu; Infinity = vázaná na Slunce */
export function solarDay(i) {
  const b = B[i],
    r = rootOf(i),
    rotD = (b.rot || 0) / 24 /* hvězdná otočka ve dnech, záporná = zpětná */,
    year = period[r];
  if (!rotD) return null;
  const w = 1 / rotD - (isFinite(year) ? 1 / year : 0);
  return Math.abs(w) < 1e-12 ? Infinity : 1 / w;
}
/* sklon osy tělesa i k rovině jeho dráhy kolem Slunce (u měsíců: k dráze planety), stupně */
const _p0 = [0, 0, 0],
  _p1 = [0, 0, 0];
export function obliquity(i, jd) {
  const r = rootOf(i);
  if (r === SUN || !isFinite(period[r])) return null;
  helio(r, jd, _p0);
  helio(r, jd + Math.min(5, period[r] / 200), _p1);
  const nx = _p0[1] * _p1[2] - _p0[2] * _p1[1],
    ny = _p0[2] * _p1[0] - _p0[0] * _p1[2],
    nz = _p0[0] * _p1[1] - _p0[1] * _p1[0],
    nl = Math.hypot(nx, ny, nz) || 1;
  basis(i, jd, m9);
  return Math.acos(Math.max(-1, Math.min(1, (nx * m9[6] + ny * m9[7] + nz * m9[8]) / nl))) / DEG;
}
/* místo na tělese i, kde je těleso j právě v nadhlavníku: [šířka, východní délka] ve stupních (geometricky, střed tělesa) */
export function subPoint(i, j, jd) {
  basis(i, jd, m9);
  const x = P[j * 3] - P[i * 3],
    y = P[j * 3 + 1] - P[i * 3 + 1],
    z = P[j * 3 + 2] - P[i * 3 + 2],
    l = Math.hypot(x, y, z) || 1,
    bx = (x * m9[0] + y * m9[1] + z * m9[2]) / l,
    by = (x * m9[3] + y * m9[4] + z * m9[5]) / l,
    bz = (x * m9[6] + y * m9[7] + z * m9[8]) / l;
  return [Math.asin(Math.max(-1, Math.min(1, bz))) / DEG, (Math.atan2(by, bx) / DEG + 360) % 360];
}
/* zpět na okamžité polohy: Slunce do počátku (ostatní tělesa přepíše updateAll) */
export function clearLightTime() {
  P[SUN * 3] = P[SUN * 3 + 1] = P[SUN * 3 + 2] = 0;
}
export { AU, ttOf };
