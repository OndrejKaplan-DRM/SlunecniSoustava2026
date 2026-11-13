// Sonda natočení Země: místo pod Sluncem ve 12 UT (časová rovnice) a největší šířka (sklon osy) v různých staletích.
// Spuštění: npx esbuild tools/test/probe_zeme.mjs --bundle --platform=node --format=esm --outfile=/tmp/e.mjs && node /tmp/e.mjs
import { B, idx, P, updateAll, basis } from '../../src/core/sim.js';
const E = idx.get('earth'),
  m = new Array(9);
function jdOf(y, mo, d, h) {
  let Y = y,
    M = mo;
  if (M <= 2) {
    Y--;
    M += 12;
  }
  const g = y > 1582;
  const A = Math.floor(Y / 100),
    Bc = g ? 2 - A + Math.floor(A / 4) : 0;
  return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + d + h / 24 + Bc - 1524.5;
}
function sub(jd) {
  updateAll(jd);
  basis(E, jd, m);
  const s = [-P[E * 3], -P[E * 3 + 1], -P[E * 3 + 2]],
    r = Math.hypot(...s);
  const x = (s[0] * m[0] + s[1] * m[1] + s[2] * m[2]) / r,
    y = (s[0] * m[3] + s[1] * m[4] + s[2] * m[5]) / r,
    z = (s[0] * m[6] + s[1] * m[7] + s[2] * m[8]) / r;
  return [(Math.atan2(y, x) * 180) / Math.PI, (Math.asin(z) * 180) / Math.PI];
}
console.log(
  '2026-04-15 12:00 UT (časová rovnice ≈ 0):',
  sub(jdOf(2026, 4, 15, 12)).map((v) => v.toFixed(3))
);
console.log(
  '2026-11-03 12:00 UT (časová rovnice +16,4 min → −4,11°):',
  sub(jdOf(2026, 11, 3, 12)).map((v) => v.toFixed(3))
);
console.log(
  '2026-06-21 08:25 UT slunovrat (šířka 23,44):',
  sub(jdOf(2026, 6, 21, 8.4)).map((v) => v.toFixed(3))
);
for (const y of [-584, 0, 1000, 1900, 2026, 3000]) {
  let a = 0,
    mx = -99,
    n = 0;
  for (let k = 0; k < 365; k++) {
    const [lo, la] = sub(jdOf(y, 1, 1, 12) + k);
    a += lo;
    mx = Math.max(mx, la);
    n++;
  }
  console.log(y, 'průměrná délka místa pod Sluncem ve 12 UT:', (a / n).toFixed(3), '° ; největší šířka', mx.toFixed(3));
}
