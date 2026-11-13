import {
  B,
  idx,
  P,
  updateAll,
  AU,
  jdNow,
  local,
  orbitSamples,
  period,
  basis,
  MOON,
  EARTH,
} from '../../src/core/sim.js';
const jd = 2461354.9; // 2026-11-10 ~09:36 UT
let t0 = performance.now();
for (let k = 0; k < 200; k++) updateAll(jd + k);
console.log('updateAll ms', ((performance.now() - t0) / 200).toFixed(3));
updateAll(jd);
const d = (i) => Math.hypot(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]) / AU;
for (const id of ['mercury', 'earth', 'mars', 'jupiter', 'neptune', 'halley', 'oumuamua', 'borisov', 'sedna', 'duende'])
  console.log(id, d(idx.get(id)).toFixed(4));
const e = idx.get('earth'),
  m = MOON;
const g = [P[m * 3] - P[e * 3], P[m * 3 + 1] - P[e * 3 + 1], P[m * 3 + 2] - P[e * 3 + 2]];
console.log(
  'moon r',
  Math.hypot(...g).toFixed(0),
  'eclLon',
  (((Math.atan2(-g[2], g[0]) * 180) / Math.PI + 360) % 360).toFixed(3),
  'lat',
  ((Math.asin(g[1] / Math.hypot(...g)) * 180) / Math.PI).toFixed(3)
);
for (const id of ['mars', 'jupiter']) {
  const i = idx.get(id),
    v = [P[i * 3] - P[e * 3], P[i * 3 + 1] - P[e * 3 + 1], P[i * 3 + 2] - P[e * 3 + 2]];
  console.log(id, 'geo eclLon', (((Math.atan2(-v[2], v[0]) * 180) / Math.PI + 360) % 360).toFixed(3));
}
let bad = 0;
for (let i = 0; i < B.length; i++)
  if (!isFinite(d(i))) {
    bad++;
    console.log('NaN', B[i].id);
  }
const o = new Float64Array(257 * 3);
t0 = performance.now();
for (let i = 1; i < B.length; i++) {
  orbitSamples(i, jd, 256, o);
  if (!o.every(isFinite)) console.log('orbit NaN', B[i].id);
}
console.log('orbits ms', (performance.now() - t0).toFixed(1));
const mm = new Array(9);
for (let i = 0; i < B.length; i++) {
  basis(i, jd, mm);
  if (!mm.every(isFinite)) console.log('basis NaN', B[i].id);
}
// Greenwich: sub-solar longitude check: Earth x-axis (prime meridian) vs direction to Sun at given UT
basis(e, jd, mm);
const s = [-P[e * 3], -P[e * 3 + 1], -P[e * 3 + 2]],
  sl = Math.hypot(...s);
const x = (s[0] * mm[0] + s[1] * mm[1] + s[2] * mm[2]) / sl,
  y = (s[0] * mm[3] + s[1] * mm[4] + s[2] * mm[5]) / sl,
  z = (s[0] * mm[6] + s[1] * mm[7] + s[2] * mm[8]) / sl;
console.log(
  'subsolar lon',
  ((Math.atan2(y, x) * 180) / Math.PI).toFixed(2),
  'lat',
  ((Math.asin(z) * 180) / Math.PI).toFixed(2),
  '(UT 09:36 → očekávám lon ≈ +32°, lat ≈ −17°)'
);
