// Sonda zatmění Slunce: čas největší fáze a místo, kde osa stínu protíná Zemi (zeměpisná šířka a délka), proti hodnotám z tabulek.
// Referenční hodnoty jsou z paměti – před použitím v testu ověřit v pramenech (NASA Five Millennium Canon).
// Spuštění: npx esbuild tools/test/probe_zatmeni.mjs --bundle --platform=node --format=esm --outfile=/tmp/z.mjs && node /tmp/z.mjs
import { idx, P, updateAll, basis } from '../../src/core/sim.js';
const E = idx.get('earth'),
  M = idx.get('moon'),
  m = new Array(9),
  RE = 6371;
function jdOf(y, mo, d, h) {
  let Y = y,
    Mo = mo;
  if (Mo <= 2) {
    Y--;
    Mo += 12;
  }
  const g = y > 1582;
  const A = Math.floor(Y / 100),
    Bc = g ? 2 - A + Math.floor(A / 4) : 0;
  return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (Mo + 1)) + d + h / 24 + Bc - 1524.5;
}
function axis(jd) {
  updateAll(jd);
  const e = [P[E * 3], P[E * 3 + 1], P[E * 3 + 2]],
    mo = [P[M * 3] - e[0], P[M * 3 + 1] - e[1], P[M * 3 + 2] - e[2]],
    s = [-e[0], -e[1], -e[2]];
  const d = [mo[0] - s[0], mo[1] - s[1], mo[2] - s[2]],
    dl = Math.hypot(...d),
    u = d.map((v) => v / dl);
  const b = mo[0] * u[0] + mo[1] * u[1] + mo[2] * u[2],
    c = mo[0] * mo[0] + mo[1] * mo[1] + mo[2] * mo[2] - RE * RE,
    D = b * b - c,
    miss = Math.sqrt(Math.max(0, c + RE * RE - b * b));
  if (D < 0) return { miss };
  const t = -b - Math.sqrt(D),
    p = [mo[0] + u[0] * t, mo[1] + u[1] * t, mo[2] + u[2] * t];
  basis(E, jd, m);
  const x = p[0] * m[0] + p[1] * m[1] + p[2] * m[2],
    y = p[0] * m[3] + p[1] * m[4] + p[2] * m[5],
    z = p[0] * m[6] + p[1] * m[7] + p[2] * m[8];
  return { miss, lat: (Math.asin(z / RE) * 180) / Math.PI, lon: (Math.atan2(y, x) * 180) / Math.PI };
}
function greatest(jd0) {
  let best = null;
  for (let t = jd0 - 0.25; t < jd0 + 0.25; t += 1 / 2880) {
    const a = axis(t);
    if (!best || a.miss < best.miss) best = { ...a, t };
  }
  return best;
}
for (const [n, y, mo, d, h, ref] of [
  ['1999-08-11', 1999, 8, 11, 11.06, '45,1° s. š., 24,3° v. d., 11:03 UT'],
  ['2026-08-12', 2026, 8, 12, 17.77, '65,2° s. š., 25,2° z. d., 17:46 UT'],
  ['1919-05-29', 1919, 5, 29, 13.15, '4,4° s. š., 16,7° z. d., 13:08 UT'],
  ['1133-08-02', 1133, 8, 2, 12, '—'],
  ['−584-05-28 (Thalés)', -584, 5, 28, 14.4, '—'],
]) {
  const g = greatest(jdOf(y, mo, d, h));
  const hh = ((g.t + 0.5) % 1) * 24;
  console.log(
    n.padEnd(20),
    'model: největší fáze',
    `${Math.floor(hh)}:${String(Math.round((hh % 1) * 60)).padStart(2, '0')} UT`,
    g.lat === undefined ? 'osa míjí Zemi' : `${g.lat.toFixed(1)}° š., ${g.lon.toFixed(1)}° d.`,
    '| tabulky:',
    ref
  );
}
