// Kontrola shody dat, textů a výpočtů (verze 1.2). Hlídá chyby, které našlo nezávislé review:
// hustota obrů, rozměry měsíců Pluta, výstřednost v textu × v dráze, průlet Apophisu 2029.
// Spuštění: npm run test:fakta
import { B, idx, local, EARTH, AU, updateAll, P } from '../../src/core/sim.js';
import { factsOf } from '../../src/data/facts.js';
let bad = 0;
const ok = (c, m) => (c ? console.log('  ok  ', m) : (bad++, console.log('  CHYBA', m)));
const b = (id) => B[idx.get(id)];
const rho = (id) => {
  const t = factsOf(b(id), { moons: 0, sunAU: 5 }).find((x) => /hustota/.test(x));
  return t ? parseFloat(t.match(/hustota ([\d,]+)/)[1].replace(',', '.')) : NaN;
};
for (const [id, v] of [
  ['saturn', 0.69],
  ['jupiter', 1.33],
  ['uranus', 1.27],
  ['neptune', 1.64],
])
  ok(Math.abs(rho(id) - v) < 0.015, `hustota ${id} ${rho(id)} (má být ${v})`);
for (const [id, max] of [
  ['nix', 25],
  ['hydra', 26],
  ['kerberos', 10],
  ['styx', 9],
])
  ok(b(id).R < max && b(id).abc, `${id}: střední poloměr ${b(id).R} km, poloosy ${b(id).abc}`);
for (const x of B.filter((x) => x.orbit.kind === 'kep' && x.orbit.e > 1.05)) {
  const m = (x.adult || '').match(/Výstřednost dráhy ([\d,]+)/);
  if (m)
    ok(
      Math.abs(parseFloat(m[1].replace(',', '.')) - x.orbit.e) < 0.006,
      `${x.id}: výstřednost v textu ${m[1]} × v dráze ${x.orbit.e}`
    );
}
ok(B.filter((x) => x.type === 'interstellar').length === 3, 'mezihvězdná tělesa: 3');
const JD0 = 2462240.40694,
  ia = idx.get('apophis');
let best = [1e99, 0];
for (let t = -0.2; t <= 0.2; t += 0.0005) {
  updateAll(JD0 + t);
  const d = Math.hypot(P[ia * 3] - P[EARTH * 3], P[ia * 3 + 1] - P[EARTH * 3 + 1], P[ia * 3 + 2] - P[EARTH * 3 + 2]);
  if (d < best[0]) best = [d, t];
}
ok(
  Math.abs(best[0] - 38012) < 1500 && Math.abs(best[1]) < 0.01,
  `Apophis 13. 4. 2029: nejblíž ${best[0].toFixed(0)} km od středu Země, ${(best[1] * 1440).toFixed(1)} min od 21:46 UT`
);
const ids = new Set();
for (const x of B) if (ids.has(x.id) || !ids.add(x.id) || !x.cs || !(x.R > 0)) ok(false, `katalog: ${x.id}`);
console.log(bad ? `\n${bad} chyb` : `\nbez chyb (${B.length} těles)`);
process.exit(bad ? 1 : 0);
