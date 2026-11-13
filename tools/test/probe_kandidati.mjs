// Sonda kandidátů událostí (verze 1.3): každého kandidáta z tools/data/kandidati.json spočítá modelem a vypíše vedle hodnot z pramenů.
// Typy: slunce (zatmění Slunce: čas největší fáze, osa stínu na Zemi, fáze v Praze), mesic (zatmění Měsíce: čas, velikost v plném stínu),
// dvojice (nejmenší úhlová vzdálenost dvou těles ze středu Země; i přechody přes Slunce), skupina (nejmenší rozpětí skupiny těles na obloze).
// Časy jsou světový čas (UT); datum v souboru je juliánské před 15. 10. 1582 a gregoriánské potom (tak je uvádějí prameny).
// Spuštění: npx esbuild tools/test/probe_kandidati.mjs --bundle --platform=node --format=esm --outfile=/tmp/k.mjs && node /tmp/k.mjs [typ] [--json soubor]
import { readFileSync, writeFileSync } from 'node:fs';
import { idx, P, updateAll, basis, deltaT, ttOf, conicPos, AU } from '../../src/core/sim.js';
const E = idx.get('earth'),
  S = idx.get('sun'),
  M = idx.get('moon'),
  RE = 6378.14,
  RS = 696000,
  RM = 1737.4,
  DEG = 180 / Math.PI,
  PRAHA = [50.08, 14.42];
export function jdOf(y, mo, d, h = 0) {
  let Y = y,
    Mo = mo;
  if (Mo <= 2) {
    Y--;
    Mo += 12;
  }
  const g = y > 1582 || (y === 1582 && (mo > 10 || (mo === 10 && d >= 15)));
  const A = Math.floor(Y / 100),
    Bc = g ? 2 - A + Math.floor(A / 4) : 0;
  return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (Mo + 1)) + d + h / 24 + Bc - 1524.5;
}
// zpět na datum (juliánské před říjnem 1582) a čas UT
export function dateOf(jd) {
  const Z = Math.floor(jd + 0.5),
    F = jd + 0.5 - Z;
  let A = Z;
  if (Z >= 2299161) {
    const a = Math.floor((Z - 1867216.25) / 36524.25);
    A = Z + 1 + a - Math.floor(a / 4);
  }
  const Bq = A + 1524,
    C = Math.floor((Bq - 122.1) / 365.25),
    D = Math.floor(365.25 * C),
    Em = Math.floor((Bq - D) / 30.6001);
  const d = Bq - D - Math.floor(30.6001 * Em),
    m = Em < 14 ? Em - 1 : Em - 13,
    y = m > 2 ? C - 4716 : C - 4715;
  const hh = F * 24,
    H = Math.floor(hh + 1 / 120),
    mi = Math.floor((hh + 1 / 120 - H) * 60);
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')} ${String(H).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  len = (a) => Math.hypot(a[0], a[1], a[2]),
  ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(a, b) / len(a) / len(b)))),
  pos = (k) => [P[k * 3], P[k * 3 + 1], P[k * 3 + 2]];
const mB = new Array(9);
// poloha místa na Zemi (scéna, km od středu Země)
function site(jd, lat, lon) {
  basis(E, jd, mB);
  const c = Math.cos(lat / DEG),
    v = [c * Math.cos(lon / DEG), c * Math.sin(lon / DEG), Math.sin(lat / DEG)];
  return [0, 1, 2].map((k) => RE * (v[0] * mB[k] + v[1] * mB[3 + k] + v[2] * mB[6 + k]));
}
// minimum funkce f(t) v okně ±win dní, krok st
function minimize(f, t0, win, st) {
  let bt = t0,
    bv = Infinity;
  for (let t = t0 - win; t <= t0 + win; t += st) {
    const v = f(t);
    if (v < bv) ((bv = v), (bt = t));
  }
  for (let s = st / 2; s > 5e-6; s /= 2)
    for (const t of [bt - s, bt + s]) {
      const v = f(t);
      if (v < bv) ((bv = v), (bt = t));
    }
  return [bv, bt];
}
// --- zatmění Slunce: osa stínu Měsíce
function axis(jd) {
  updateAll(jd);
  const e = pos(E),
    mo = sub(pos(M), e),
    s = sub(pos(S), e),
    d = sub(mo, s),
    u = d.map((v) => v / len(d));
  const b = dot(mo, u),
    miss = Math.sqrt(Math.max(0, dot(mo, mo) - b * b)),
    D = RE * RE - miss * miss;
  basis(E, jd, mB);
  // znaménko γ: osa míjí střed Země severně (+) nebo jižně (−)
  const sg = Math.sign((mo[0] - u[0] * b) * mB[6] + (mo[1] - u[1] * b) * mB[7] + (mo[2] - u[2] * b) * mB[8]) || 1;
  if (D < 0) return { miss, sg };
  const t = -b - Math.sqrt(D),
    p = [mo[0] + u[0] * t, mo[1] + u[1] * t, mo[2] + u[2] * t];
  const x = dot(p, mB),
    y = p[0] * mB[3] + p[1] * mB[4] + p[2] * mB[5],
    z = p[0] * mB[6] + p[1] * mB[7] + p[2] * mB[8];
  return { miss, sg, lat: Math.asin(z / RE) * DEG, lon: Math.atan2(y, x) * DEG };
}
// fáze zatmění Slunce v daném místě (velikost = zakrytý díl průměru), výška Slunce nad obzorem
function localSun(jd, lat, lon) {
  updateAll(jd);
  const o = site(jd, lat, lon),
    e = pos(E),
    mo = sub(sub(pos(M), e), o),
    s = sub(sub(pos(S), e), o);
  const ss = Math.asin(RS / len(s)),
    sm = Math.asin(RM / len(mo)),
    th = ang(mo, s);
  return { mag: (ss + sm - th) / (2 * ss), tot: th < sm - ss, alt: 90 - ang(s, o) * DEG, k: sm / ss };
}
function solar(c, t0) {
  const [, t] = minimize((x) => axis(x).miss, t0, 0.3, 1 / 1440);
  const a = axis(t),
    out = { t, gamma: (a.sg * a.miss) / RE, lat: a.lat, lon: a.lon };
  const [lat, lon] = c.misto || PRAHA;
  const [mm, tl] = minimize((x) => -localSun(x, lat, lon).mag, t, 0.15, 1 / 1440);
  const L = localSun(tl, lat, lon);
  out.loc = { t: tl, mag: Math.max(0, -mm), tot: L.tot, alt: L.alt };
  return out;
}
// --- zatmění Měsíce: vzdálenost Měsíce od osy stínu Země
function lunarAt(jd) {
  updateAll(jd);
  const e = pos(E),
    mo = sub(pos(M), e),
    s = sub(pos(S), e),
    dm = len(mo),
    ds = len(s);
  const th = Math.PI - ang(mo, s),
    pm = Math.asin(RE / dm),
    ps = Math.asin(RE / ds),
    ss = Math.asin(RS / ds),
    sm = Math.asin(RM / dm);
  const um = 1.02 * (0.99834 * pm - ss + ps),
    pe = 1.02 * (0.99834 * pm + ss + ps);
  return { th, umag: (um + sm - th) / (2 * sm), pmag: (pe + sm - th) / (2 * sm) };
}
function lunar(c, t0) {
  const [, t] = minimize((x) => lunarAt(x).th, t0, 0.3, 1 / 1440);
  const a = lunarAt(t);
  // délka úplné fáze: kdy je velikost v plném stínu nad 1
  let tot = 0;
  if (a.umag > 1) {
    let lo = t,
      hi = t + 0.06;
    for (let k = 0; k < 40; k++) {
      const mid = (lo + hi) / 2;
      lunarAt(mid).umag > 1 ? (lo = mid) : (hi = mid);
    }
    tot = (lo - t) * 2 * 1440;
  }
  return { t, umag: a.umag, pmag: a.pmag, tot };
}
// --- dvojice a skupiny ze středu Země
function dirs(ids, jd, helio) {
  updateAll(jd);
  const e = helio ? pos(S) : pos(E);
  return ids.map((id) => sub(pos(idx.get(id)), e));
}
function pair(c, t0) {
  const f = (x) => {
    const [a, b] = dirs([c.a, c.b], x);
    return ang(a, b);
  };
  const [v, t] = minimize(f, t0, c.okno || 3, 0.01);
  const [a, b, s] = dirs([c.a, c.b, 'sun'], t);
  return { t, sep: v * DEG * 60, elong: c.a === 'sun' ? 0 : ang(a, s) * DEG, da: len(a), db: len(b) };
}
function group(c, t0) {
  const f = (x) => {
    const d = dirs(c.telesa, x, c.helio);
    let mx = 0;
    for (let i = 0; i < d.length; i++) for (let j = i + 1; j < d.length; j++) mx = Math.max(mx, ang(d[i], d[j]));
    return mx;
  };
  const [v, t] = minimize(f, t0, c.okno || 20, 0.05);
  const d = dirs([...c.telesa.filter((x) => x !== 'sun' && x !== 'earth'), 'sun'], t),
    s = d.pop();
  const el = d.map((x) => ang(x, s) * DEG);
  return { t, spread: v * DEG, elMin: Math.min(...el), elMax: Math.max(...el) };
}
// --- nejmenší vzdálenost dvou těles (průlety, komety u Země, přísluní); těleso a je z katalogu, nebo má vlastní elementy dráhy (el)
const cv = [0, 0, 0];
function bodyPos(c, jd) {
  if (!c.el) return pos(idx.get(c.a));
  const o = c.el;
  conicPos(o.q, o.e, o.i, o.O, o.w, o.Tp, ttOf(jd), cv);
  return [cv[0] * AU, cv[2] * AU, -cv[1] * AU]; // ekliptika → scéna (x, z, −y)
}
function near(c, t0) {
  const B2 = idx.get(c.b || 'earth');
  const f = (x) => {
    updateAll(x);
    return len(sub(bodyPos(c, x), pos(B2)));
  };
  const [v, t] = minimize(f, t0, c.okno || 5, c.krok || 0.02);
  return { t, km: v, au: v / AU };
}
const F = { slunce: solar, mesic: lunar, dvojice: pair, skupina: group, blizko: near };
export function run(c) {
  const [y, m, d] = c.datum,
    hms = (x) => x.split(':').reduce((a, v, k) => a + v / 60 ** k, 0),
    // prameny dávají buď světový čas (ut), nebo čas efemerid (td) a ΔT v sekundách (dT)
    ut = c.td ? hms(c.td) - c.dT / 3600 : c.ut != null ? hms(String(c.ut)) : 12,
    t0 = jdOf(y, m, d, ut);
  const r = F[c.typ](c, t0);
  r.ref = dateOf(t0);
  r.dt = (r.t - t0) * 1440; // minut proti prameni
  r.kdy = dateOf(r.t);
  r.deltaT = deltaT(r.t);
  return r;
}
const f1 = (v, n = 1) => (v == null || Number.isNaN(v) ? '—' : v.toFixed(n));
if (process.argv[1] && process.argv[1].endsWith('k.mjs')) {
  const src = process.env.KAND || 'tools/data/kandidati.json';
  const only = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
  const L = JSON.parse(readFileSync(src, 'utf8')).filter((c) => !only || c.typ === only || c.id === only);
  const out = [];
  for (const c of L) {
    if (!F[c.typ]) continue;
    const r = run(c),
      ref = c.ref || {};
    let s = '';
    if (c.typ === 'slunce')
      s =
        `osa ${f1(r.lat)}° š. ${f1(r.lon)}° d. (pramen ${f1(ref.lat)} / ${f1(ref.lon)}) γ ${f1(r.gamma, 3)} (${f1(ref.gamma, 3)})` +
        ` | místo: fáze ${f1(r.loc.mag, 3)}${r.loc.tot ? ' ÚPLNÉ' : ''} (pramen ${f1(ref.misto?.faze, 3)}${ref.misto?.uplne ? ' ÚPLNÉ' : ''}) v ${dateOf(r.loc.t).slice(-5)} UT, Slunce ${f1(r.loc.alt, 0)}°`;
    if (c.typ === 'mesic')
      s = `plný stín ${f1(r.umag, 3)} (pramen ${f1(ref.umag, 3)}) úplné ${f1(r.tot, 0)} min (${f1(ref.tot, 0)})`;
    if (c.typ === 'dvojice') s = `vzdálenost ${f1(r.sep, 2)}′ (pramen ${f1(ref.sep, 2)}′) elongace ${f1(r.elong, 0)}°`;
    if (c.typ === 'skupina')
      s = `rozpětí ${f1(r.spread, 2)}° (pramen ${f1(ref.spread, 2)}°) od Slunce ${f1(r.elMin, 0)}–${f1(r.elMax, 0)}°`;
    if (c.typ === 'blizko') s = `vzdálenost ${f1(r.au, 5)} AU = ${f1(r.km, 0)} km (pramen ${f1(ref.au, 5)} AU)`;
    console.log(c.id.padEnd(22), r.kdy, `Δt ${r.dt >= 0 ? '+' : ''}${f1(r.dt, 1)} min`.padEnd(16), s);
    out.push({ id: c.id, ...r });
  }
  const j = process.argv.indexOf('--json');
  if (j > 0) writeFileSync(process.argv[j + 1], JSON.stringify(out, null, 1));
}
