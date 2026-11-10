import { P, updateAll, idx, MOON, EARTH } from '../src/sim.js';
const U = (y, m, d, h, mi) => Date.UTC(y, m - 1, d, h, mi) / 86400000 + 2440587.5;
for (const [n, jd] of [['2026-08-12 17:46', U(2026, 8, 12, 17, 46)], ['2026-08-12 18:00', U(2026, 8, 12, 18, 0)], ['2027-08-02 10:07', U(2027, 8, 2, 10, 7)], ['2026-11-10 12:00', U(2026, 11, 10, 12, 0)]]) {
  updateAll(jd); const e = [P[EARTH * 3], P[EARTH * 3 + 1], P[EARTH * 3 + 2]], m = [P[MOON * 3], P[MOON * 3 + 1], P[MOON * 3 + 2]], ml = Math.hypot(...m), L = m.map(x => x / ml), c = e.map((x, k) => x - m[k]), t = c[0] * L[0] + c[1] * L[1] + c[2] * L[2], d = Math.hypot(c[0] - L[0] * t, c[1] - L[1] * t, c[2] - L[2] * t);
  console.log(n, 'osa stínu Měsíce míjí střed Země o', d.toFixed(0), 'km', d < 6378 ? '→ ZATMĚNÍ na Zemi' : '');
}
