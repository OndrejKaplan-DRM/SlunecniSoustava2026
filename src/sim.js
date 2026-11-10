// Soustava 200 – katalog, efemeridy, natočení těles. Souřadnice scény: km, heliocentricky, osa Y = severní pól ekliptiky
// (ekliptika J2000 (x, y, z) → scéna (x, z, −y)). Vše v plovoucí čárce 64 bit; do GPU jdou až rozdíly vůči kameře.
import { Ephem, eq2ecl, DEG, J2000, conicPos } from './ephem.js';
import { shapeParams } from './shape.js';
import CAT from './cat.json';

export const AU = 149597870.7;
export const B = CAT.bodies, RING = CAT.ring, N = B.length;
export const idx = new Map(B.map((b, i) => [b.id, i]));
export const par = B.map(b => (b.parent ? idx.get(b.parent) : -1));
export const kids = B.map(() => []);
par.forEach((p, i) => { if (p >= 0) kids[p].push(i); });
const E = new Ephem(B, { variant: 2 });
const SUN = idx.get('sun'), EARTH = idx.get('earth'), MOON = idx.get('moon');
export { SUN, EARTH, MOON };

// pořadí „rodič dřív než dítě“
const topo = []; (function walk(i) { topo.push(i); for (const k of kids[i]) walk(k); })(SUN);
export const root = B.map((b, i) => { let k = i; while (par[k] >= 0 && par[k] !== SUN) k = par[k]; return k; }); // planeta (nebo těleso kolem Slunce), ke které patří

// --- Měsíc: zkrácená řada podle Meeuse (kap. 47), přesnost ~0,05° ---
const ML = [[0, 0, 1, 0, 6288774], [2, 0, -1, 0, 1274027], [2, 0, 0, 0, 658314], [0, 0, 2, 0, 213618], [0, 1, 0, 0, -185116], [0, 0, 0, 2, -114332], [2, 0, -2, 0, 58793], [2, -1, -1, 0, 57066], [2, 0, 1, 0, 53322], [2, -1, 0, 0, 45758], [0, 1, -1, 0, -40923], [1, 0, 0, 0, -34720], [0, 1, 1, 0, -30383], [2, 0, 0, -2, 15327], [0, 0, 1, 2, -12528], [0, 0, 1, -2, 10980], [4, 0, -1, 0, 10675], [0, 0, 3, 0, 10034], [4, 0, -2, 0, 8548], [2, 1, -1, 0, -7888], [2, 1, 0, 0, -6766], [1, 0, -1, 0, -5163], [1, 1, 0, 0, 4987], [2, -1, 1, 0, 4036]];
const MR = [[0, 0, 1, 0, -20905355], [2, 0, -1, 0, -3699111], [2, 0, 0, 0, -2955968], [0, 0, 2, 0, -569925], [0, 1, 0, 0, 48888], [0, 0, 0, 2, -3149], [2, 0, -2, 0, 246158], [2, -1, -1, 0, -152138], [2, 0, 1, 0, -170733], [2, -1, 0, 0, -204586], [0, 1, -1, 0, -129620], [1, 0, 0, 0, 108743], [0, 1, 1, 0, 104755], [2, 0, 0, -2, 10321], [0, 0, 1, -2, 79661], [4, 0, -1, 0, -34782], [0, 0, 3, 0, -23210], [4, 0, -2, 0, -21636], [2, 1, -1, 0, 24208], [2, 1, 0, 0, 30824], [1, 0, -1, 0, -8379], [1, 1, 0, 0, -16675], [2, -1, 1, 0, -12831]];
const MB = [[0, 0, 0, 1, 5128122], [0, 0, 1, 1, 280602], [0, 0, 1, -1, 277693], [2, 0, 0, -1, 173237], [2, 0, -1, 1, 55413], [2, 0, -1, -1, 46271], [2, 0, 0, 1, 32573], [0, 0, 2, 1, 17198], [2, 0, 1, -1, 9266], [0, 0, 2, -1, 8822], [2, -1, 0, -1, 8216], [2, 0, -2, -1, 4324], [2, 0, 1, 1, 4200]];
function moonGeo(jd, out) { // geocentricky, ekliptika J2000, km
  const T = (jd - J2000) / 36525;
  const Lp = (218.3164477 + 481267.88123421 * T) * DEG, D = (297.8501921 + 445267.1114034 * T) * DEG, M = (357.5291092 + 35999.0502909 * T) * DEG, Mp = (134.9633964 + 477198.8675055 * T) * DEG, F = (93.272095 + 483202.0175233 * T) * DEG;
  let sl = 0, sr = 0, sb = 0;
  for (const t of ML) sl += t[4] * Math.sin(t[0] * D + t[1] * M + t[2] * Mp + t[3] * F);
  for (const t of MR) sr += t[4] * Math.cos(t[0] * D + t[1] * M + t[2] * Mp + t[3] * F);
  for (const t of MB) sb += t[4] * Math.sin(t[0] * D + t[1] * M + t[2] * Mp + t[3] * F);
  const lon = Lp + sl * 1e-6 * DEG - 1.396971 * T * DEG, lat = sb * 1e-6 * DEG, r = 385000.56 + sr * 1e-3, cl = Math.cos(lat);
  out[0] = r * cl * Math.cos(lon); out[1] = r * cl * Math.sin(lon); out[2] = r * Math.sin(lat); return out;
}

// poloha vůči mateřskému tělesu v km, souřadnice scény
const _t = [0, 0, 0];
export function local(i, jd, out, o = 0) {
  const k = B[i].orbit.kind;
  if (i === MOON) moonGeo(jd, _t);
  else { E.local(i, jd, _t); if (k === 'jpl' || k === 'kep') { _t[0] *= AU; _t[1] *= AU; _t[2] *= AU; } }
  out[o] = _t[0]; out[o + 1] = _t[2]; out[o + 2] = -_t[1]; return out;
}
export const P = new Float64Array(N * 3);   // heliocentrické polohy (scéna, km)
export function updateAll(jd) {
  for (const i of topo) { if (i === SUN) continue; local(i, jd, P, i * 3); const p = par[i]; if (p !== SUN) { P[i * 3] += P[p * 3]; P[i * 3 + 1] += P[p * 3 + 1]; P[i * 3 + 2] += P[p * 3 + 2]; } }
}

// --- dráhy: perioda (dny) a velká poloosa (km) ---
export const period = new Float64Array(N), semi = new Float64Array(N);
B.forEach((b, i) => {
  const o = b.orbit; let Pd = Infinity, a = 0;
  if (i === MOON) { Pd = 27.321661; a = 384400; }
  else if (o.kind === 'sat') { Pd = 2 * Math.PI / Math.abs(o.n); a = o.a; }
  else if (o.kind === 'trojan') { const h = B[idx.get(o.host)].orbit; Pd = 2 * Math.PI / Math.abs(h.n); a = h.a; }
  else if (o.kind === 'jpl') { a = o.el[0] * AU; Pd = 365.25636 * Math.pow(o.el[0], 1.5); }
  else if (o.kind === 'kep') { if (o.e < 0.9999) { const aa = o.q / (1 - o.e); a = aa * AU; Pd = 365.25636 * Math.pow(aa, 1.5); } else { a = o.q * AU * 40; } }
  period[i] = Pd; semi[i] = a;
});
// vzorky dráhy (vůči mateřskému tělesu), zhuštěné kolem současné polohy, aby čára procházela přesně tělesem
export function orbitSamples(i, jd, n, out) {
  const Pd = period[i], o = B[i].orbit, ts = [];
  if (Pd < 365.25 * 400) { for (let k = 0; k <= n; k++) { const u = k / n * 2 - 1; ts.push(jd + Pd * 0.5 * u * u * u); } }
  else { // dlouhé a otevřené dráhy: úsek kolem přísluní + zhuštění kolem „teď“
    const span = Math.min(Pd / 2, Math.max(365.25 * 80, Math.abs(jd - o.Tp) + 365.25 * 40)), h = n >> 1, s = new Set();
    for (let k = 0; k <= h; k++) { const u = k / h * 2 - 1; s.add(o.Tp + span * u * u * u); }
    for (let k = 0; k < n - h; k++) { const u = (k + 0.5) / (n - h) * 2 - 1; const t = jd + 365.25 * 30 * u * u * u; if (Math.abs(t - o.Tp) <= span) s.add(t); else s.add(o.Tp + span * u); }
    ts.push(...[...s].sort((x, y) => x - y)); while (ts.length < n + 1) ts.push(ts[ts.length - 1]); ts.length = n + 1;
  }
  for (let k = 0; k <= n; k++) local(i, ts[k], out, k * 3);
  return out;
}

// --- natočení: sloupce = osy tělesa (x nultý poledník, z pól) ve scéně ---
const s3 = (v) => { eq2ecl(v); return [v[0], v[2], -v[1]]; };
const frames = B.map((b) => {
  if (!b.pole) return null; const T = 0.27, ra = (b.pole[0] + b.pole[2] * T) * DEG, de = (b.pole[1] + b.pole[3] * T) * DEG;
  const p = [Math.cos(de) * Math.cos(ra), Math.cos(de) * Math.sin(ra), Math.sin(de)], X = [-Math.sin(ra), Math.cos(ra), 0];
  const Y = [p[1] * X[2] - p[2] * X[1], p[2] * X[0] - p[0] * X[2], p[0] * X[1] - p[1] * X[0]];
  return { X: s3(X), Y: s3(Y), Z: s3(p) };
});
const seedOf = (b) => [...b.id].reduce((s, c) => (s * 31 + c.charCodeAt(0)) % 9973, 7) / 9973;
const _l = [0, 0, 0];
export function basis(i, jd, m) { // m: pole 9 čísel (sloupce X, Y, Z)
  const b = B[i], f = frames[i], d = jd - J2000;
  if (f && b.W) {
    const W = ((b.W[0] + b.W[1] * d) % 360) * DEG, c = Math.cos(W), s = Math.sin(W);
    for (let k = 0; k < 3; k++) { m[k] = f.X[k] * c + f.Y[k] * s; m[3 + k] = -f.X[k] * s + f.Y[k] * c; m[6 + k] = f.Z[k]; }
    return m;
  }
  let Z = [0, 1, 0]; const p = par[i];
  if (p >= 0 && p !== SUN && frames[p]) Z = frames[p].Z;
  else if (p === SUN) { const s = seedOf(b), ob = s * 0.6, az = s * 37; Z = [Math.sin(ob) * Math.cos(az), Math.cos(ob), Math.sin(ob) * Math.sin(az)]; }
  let X;
  if (p >= 0 && p !== SUN) { local(i, jd, _l); X = [-_l[0], -_l[1], -_l[2]]; }            // malé měsíce: vázaná rotace, dlouhá osa k planetě
  else { const a = d * 24 / (b.rot || 10) * 2 * Math.PI, c = Math.cos(a), s = Math.sin(a), u = Math.abs(Z[1]) < 0.99 ? [0, 1, 0] : [1, 0, 0];
    const e1 = norm(cross(u, Z)), e2 = cross(Z, e1); X = [e1[0] * c + e2[0] * s, e1[1] * c + e2[1] * s, e1[2] * c + e2[2] * s]; }
  const dz = X[0] * Z[0] + X[1] * Z[1] + X[2] * Z[2]; X = norm([X[0] - Z[0] * dz, X[1] - Z[1] * dz, X[2] - Z[2] * dz]); const Y = cross(Z, X);
  for (let k = 0; k < 3; k++) { m[k] = X[k]; m[3 + k] = Y[k]; m[6 + k] = Z[k]; } return m;
}
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function norm(a) { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
export function spinRate(i) { const b = B[i]; if (b.W) return b.W[1] * DEG; if (par[i] !== SUN && par[i] >= 0) return 2 * Math.PI / period[i]; return 2 * Math.PI * 24 / (b.rot || 10); } // rad/den
export function poleOf(i, jd, out) { const m = basis(i, jd, new Array(9)); out[0] = m[6]; out[1] = m[7]; out[2] = m[8]; return out; }

// --- tvar ---
export const shape = B.map((b) => {
  const s = shapeParams(b); let a = s.a;
  if (!b.abc && b.flat) a = [1, 1, 1 - b.flat];
  const rmax = Math.max(...a) * (1 + s.lump * 0.85);
  return { a, lump: s.lump, neck: s.neck, seed: s.seed, rmax: b.R * rmax, irregular: s.lump > 0 || s.neck > 0 };
});
export const jdNow = () => Date.now() / 86400000 + 2440587.5;
export { conicPos, DEG, J2000 };
