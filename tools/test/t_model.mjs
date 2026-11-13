// Test věrohodnosti modelu bez efemeridy: porovná polohy planet, Pluta a Měsíce s tabulkou z JPL DE422 (tools/test/ref_de422.json,
// 120 okamžiků mezi roky −1000 a 3000) při pohledu ze Země. Meze jsou asi dvojnásobek změřené největší odchylky.
// Spuštění: npm run test:model
import { idx, P, updateAll, AU, deltaT } from '../../src/core/sim.js';
import REF from './ref_de422.json';
const LIM = {
  mercury: 20,
  venus: 30,
  earth: 15,
  mars: 60,
  jupiter: 120,
  saturn: 120,
  uranus: 80,
  neptune: 40,
  pluto: 30,
  moon: 250,
}; // úhlové vteřiny
const E = idx.get('earth'),
  ie = REF.ids.indexOf('earth');
const ang = (a, b) => {
  const c = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  return (Math.atan2(Math.hypot(...c), a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) * 180 * 3600) / Math.PI;
};
const mx = {},
  sq = {};
let bad = 0;
for (const r of REF.rows) {
  let t = r[0] - deltaT(r[0]) / 86400; /* tabulka je v čase efemerid, model čeká světový čas */
  t = r[0] - deltaT(t) / 86400;
  updateAll(t);
  const ecl = (i) => [P[i * 3], -P[i * 3 + 2], P[i * 3 + 1]],
    me = ecl(E).map((v) => v / AU),
    re = r.slice(1 + ie * 3, 4 + ie * 3);
  REF.ids.forEach((id, k) => {
    const ref = r.slice(1 + k * 3, 4 + k * 3),
      m = ecl(idx.get(id));
    let d;
    if (id === 'moon')
      d = ang(
        m.map((v, q) => v - me[q] * AU),
        ref
      );
    else if (id === 'earth') d = ang(me, ref);
    else
      d = ang(
        m.map((v, q) => v / AU - me[q]),
        ref.map((v, q) => v - re[q])
      );
    mx[id] = Math.max(mx[id] || 0, d);
    sq[id] = (sq[id] || 0) + d * d;
  });
}
for (const id of REF.ids) {
  const ok = mx[id] <= LIM[id];
  if (!ok) bad++;
  console.log(
    `  ${ok ? 'ok  ' : 'CHYBA'} ${id.padEnd(8)} střední ${Math.sqrt(sq[id] / REF.rows.length)
      .toFixed(1)
      .padStart(6)}″  největší ${mx[id].toFixed(1).padStart(6)}″  (mez ${LIM[id]}″)`
  );
}
console.log(bad ? `\n${bad} těles mimo mez` : `\nbez chyb (${REF.rows.length} okamžiků, roky −1000 až 3000)`);
process.exit(bad ? 1 : 0);
