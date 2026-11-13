// Sonda věrohodnosti modelu (13. 11. 2026): 20 známých zatmění, přechodů a konjunkcí od roku −584 do 2117; vypisuje nejmenší úhlovou
// vzdálenost při pohledu ze středu Země a odchylku času. Referenční hodnoty jsou z paměti, ne z tabulek – před použitím v testu ověřit.
// Spuštění: npx esbuild tools/test/probe_udalosti.mjs --bundle --platform=node --format=esm --outfile=/tmp/p.mjs && node /tmp/p.mjs
import { B, idx, P, updateAll, AU } from '../../src/core/sim.js';
// kalendář: před 15. 10. 1582 juliánský
function jd(y, m, d, h = 0, mi = 0) { let Y = y, M = m; if (M <= 2) { Y--; M += 12; } const greg = y > 1582 || (y === 1582 && (m > 10 || (m === 10 && d >= 15))); const A = Math.floor(Y / 100), Bc = greg ? 2 - A + Math.floor(A / 4) : 0; return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + d + Bc - 1524.5 + (h + mi / 60) / 24; }
const i = (id) => idx.get(id), E = i('earth');
const R = { sun: 696000, moon: 1737.4 };
function sep(a, b, t) { updateAll(t); const v = (k) => [P[k * 3] - P[E * 3], P[k * 3 + 1] - P[E * 3 + 1], P[k * 3 + 2] - P[E * 3 + 2]]; const x = v(i(a)), y = v(i(b)); const c = (x[0] * y[0] + x[1] * y[1] + x[2] * y[2]) / Math.hypot(...x) / Math.hypot(...y); return Math.acos(Math.min(1, c)) * 180 / Math.PI; }
function best(a, b, t0, win = 4) { let bt = t0, bs = 1e9; for (let t = t0 - win; t <= t0 + win; t += 0.01) { const s = sep(a, b, t); if (s < bs) (bs = s), (bt = t); } for (let st = 0.005; st > 2e-5; st /= 2) for (const t of [bt - st, bt + st]) { const s = sep(a, b, t); if (s < bs) (bs = s), (bt = t); } return [bs, bt]; }
const T = [
  ['2026-11-16 Mars–Jupiter konjunkce', 'mars', 'jupiter', jd(2026, 11, 16, 5), null, 10],
  ['2020-12-21 Jupiter–Saturn', 'jupiter', 'saturn', jd(2020, 12, 21, 18, 20), 0.102, 10],
  ['2012-06-06 přechod Venuše', 'sun', 'venus', jd(2012, 6, 6, 1, 29), 554.4 / 3600, 3],
  ['2004-06-08 přechod Venuše', 'sun', 'venus', jd(2004, 6, 8, 8, 20), 626.9 / 3600, 3],
  ['2019-11-11 přechod Merkuru', 'sun', 'mercury', jd(2019, 11, 11, 15, 20), 75.9 / 3600, 3],
  ['1999-08-11 zatmění Slunce', 'sun', 'moon', jd(1999, 8, 11, 11, 3), 0.48, 1],
  ['2026-08-12 zatmění Slunce', 'sun', 'moon', jd(2026, 8, 12, 17, 46), 0.85, 1],
  ['1919-05-29 zatmění (Eddington)', 'sun', 'moon', jd(1919, 5, 29, 13, 8), 0.28, 1],
  ['1882-12-06 přechod Venuše', 'sun', 'venus', jd(1882, 12, 6, 17, 6), 637.3 / 3600, 3],
  ['1818-01-03 Venuše zakryla Jupiter', 'venus', 'jupiter', jd(1818, 1, 3, 21, 52), 0.004, 5],
  ['1769-06-03 přechod Venuše (Cook)', 'sun', 'venus', jd(1769, 6, 3, 22, 25), 609 / 3600, 3],
  ['1639-12-04 přechod Venuše (Horrocks)', 'sun', 'venus', jd(1639, 12, 4, 18, 25), 524 / 3600, 3],
  ['1631-11-07 přechod Merkuru (Gassendi)', 'sun', 'mercury', jd(1631, 11, 7, 7, 20), null, 3],
  ['1623-07-16 Jupiter–Saturn', 'jupiter', 'saturn', jd(1623, 7, 16), 5.2 / 60, 15],
  ['1226-03-04 Jupiter–Saturn', 'jupiter', 'saturn', jd(1226, 3, 4), 2.1 / 60, 15],
  ['1133-08-02 zatmění Slunce', 'sun', 'moon', jd(1133, 8, 2, 12, 9), null, 1.5],
  ['-584-05-28 zatmění (Thalés)', 'sun', 'moon', jd(-584, 5, 28, 14, 22), null, 1.5],
  ['-6-12-04 Jupiter–Saturn (7 př. n. l.)', 'jupiter', 'saturn', jd(-6, 12, 4), 1.05, 30],
  ['2065-11-22 Venuše zakryje Jupiter', 'venus', 'jupiter', jd(2065, 11, 22, 12, 45), 0.004, 5],
  ['2117-12-11 přechod Venuše', 'sun', 'venus', jd(2117, 12, 11, 2, 48), 724 / 3600, 3],
];
for (const [n, a, b, t0, ref, w] of T) { const [s, t] = best(a, b, t0, w); console.log(n.padEnd(40), 'model', (s * 60).toFixed(2).padStart(8) + "'", ref == null ? '   ref —    ' : 'ref ' + (ref * 60).toFixed(2).padStart(7) + "'", 'čas', ((t - t0) * 24 >= 0 ? '+' : '') + ((t - t0) * 24).toFixed(1) + ' h'); }
