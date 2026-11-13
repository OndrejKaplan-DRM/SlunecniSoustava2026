// Doladění elementů Apophisu, aby v modelu vyšel průlet kolem Země 13. 4. 2029 21:46 UT ve vzdálenosti 38 012 km od středu Země.
// Keplerova dráha bez poruch tenhle průlet z elementů epochy 2024 netrefí (vychází přes 135 000 km), proto se
// tři elementy (Tp, ω, Ω) posunou o nejmenší možnou hodnotu. Směr průletu zůstává jen přibližný.
// Spuštění: npx esbuild tools/data/fit_apophis.mjs --bundle --platform=node --format=esm --outfile=/tmp/fit.mjs && node /tmp/fit.mjs
import { B, idx, local, EARTH, AU } from '../../src/core/sim.js';
import { conicPos } from '../../src/core/ephem.js';
const o0 = {
  q: 0.74606905,
  e: 0.1911496,
  i: 3.34099,
  O: 203.90419,
  w: 126.67242,
  Tp: 2460395.79,
}; /* JPL SBDB, epocha 2024-03-30 */
const JD0 = 2462240.40694,
  D0 = 38012;
const a = o0.q / (1 - o0.e),
  Pd = (2 * Math.PI) / (0.01720209895 / Math.pow(a, 1.5));
const TpN = o0.Tp + Math.round((JD0 - o0.Tp) / Pd) * Pd; /* průchod přísluním nejbližší k průletu */
const e3 = [0, 0, 0],
  a3 = [0, 0, 0];
function dist(p, jd) {
  local(EARTH, jd, e3);
  conicPos(o0.q, o0.e, o0.i, p[2], p[1], p[0], jd, a3);
  return Math.hypot(a3[0] * AU - e3[0], a3[2] * AU - e3[1], -a3[1] * AU - e3[2]);
}
function closest(p) {
  let bt = 0,
    bd = 1e99;
  for (let t = -3; t <= 3; t += 0.02) {
    const d = dist(p, JD0 + t);
    if (d < bd) ((bd = d), (bt = t));
  }
  for (let s = 0.01; s > 1e-6; s /= 2)
    for (const t of [bt - s, bt + s]) {
      const d = dist(p, JD0 + t);
      if (d < bd) ((bd = d), (bt = t));
    }
  return [bd, bt];
}
const cost = (p) => {
  const [d, t] = closest(p);
  return (
    ((d - D0) / 100) ** 2 +
    ((t * 86400) / 30) ** 2 +
    1e-3 * (((p[0] - TpN) / 0.01) ** 2 + ((p[1] - o0.w) / 0.01) ** 2 + ((p[2] - o0.O) / 0.01) ** 2)
  );
};
let p = [TpN, o0.w, o0.O],
  c = cost(p),
  st = [0.5, 0.2, 0.2];
for (let it = 0; it < 4000 && Math.max(...st) > 1e-9; it++) {
  let imp = false;
  for (let k = 0; k < 3; k++)
    for (const s of [st[k], -st[k]]) {
      const q = p.slice();
      q[k] += s;
      const cq = cost(q);
      if (cq < c) ((p = q), (c = cq), (imp = true));
    }
  if (!imp) st = st.map((x) => x / 2);
}
const [d, t] = closest(p);
console.log(
  'vychozi:',
  closest([TpN, o0.w, o0.O]).map((x) => +x.toFixed(4))
);
console.log(
  'doladeno Tp, w, O:',
  p.map((x) => +x.toFixed(6)),
  '| posun:',
  (p[0] - TpN).toFixed(4),
  'd',
  (p[1] - o0.w).toFixed(4),
  '°',
  (p[2] - o0.O).toFixed(4),
  '°'
);
console.log('nejblíž km', d.toFixed(0), 'odchylka času s', (t * 86400).toFixed(0));
