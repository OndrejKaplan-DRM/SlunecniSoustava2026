// Referenční scény (verze 2.1): skutečné úkazy, které vyfotily sondy na Marsu nebo šly vidět ze Země, model × JPL Horizons.
// Reference tools/test/ref_sceny.json (staví tools/model/vernost/ref_sceny.py). Pro každou scénu:
//  – polohy cílů v okamžiku scény (úhel mezi směrem modelu a Horizons, zdánlivé polohy s dobou letu světla),
//  – u úkazů (přechod Phobosu přes Slunce, zákryt Deimosu, konjunkce, zatmění) čas a vzdálenost největšího přiblížení,
//    které model najde sám v okně ±40 min kolem času z Horizons, krokem 5 s.
// Použití: npm run test:sceny   (stejný kód jako aplikace: core/sim.js a core/misto.js)
import fs from 'fs';
import { B, idx, updateAll } from '../../src/core/sim.js';
import { siteFrame, azEl, toBody, applyLightTime, clearLightTime } from '../../src/core/misto.js';
const DEG = Math.PI / 180,
  ref = JSON.parse(fs.readFileSync(process.env.SCENY_REF || 'tools/test/ref_sceny.json', 'utf8'));
const sep = (a1, e1, a2, e2) => {
  const c = Math.sin(e1) * Math.sin(e2) + Math.cos(e1) * Math.cos(e2) * Math.cos(a1 - a2);
  return Math.acos(Math.max(-1, Math.min(1, c)));
};
const f = {},
  v = [0, 0, 0],
  ae = [0, 0];
/* zdánlivý azimut a výška (radiány) cíle j z místa na tělese i v okamžiku jd (UT) */
function look(i, lat, lon, j, jd, out) {
  updateAll(jd);
  clearLightTime();
  siteFrame(i, lat, lon, jd, f);
  applyLightTime(i, jd);
  toBody(f, i, j, v);
  azEl(f, v[0], v[1], v[2], ae);
  out[0] = ae[0];
  out[1] = ae[1];
  out[2] = Math.hypot(v[0], v[1], v[2]);
  return out;
}
const fmt = (d) => (d < 1 / 60 ? (d * 3600).toFixed(1) + '″' : d < 1 ? (d * 60).toFixed(2) + '′' : d.toFixed(2) + '°');
const R = { sun: 695700 };
const radius = (j) => R[B[j].id] || B[j].R;
let bad = 0;
const vysl = [];
console.log('Referenční scény: model × JPL Horizons (zdánlivé polohy, bez lomu světla)\n');
for (const s of ref.sceny) {
  const i = idx.get(s.c);
  const pa = [0, 0, 0],
    pb = [0, 0, 0];
  const rad = (j, d) => (2 * Math.asin(Math.min(1, radius(j) / d))) / DEG;
  let line = `${s.id.padEnd(30)} ${s.ut} UT`;
  const r = { id: s.id, cile: {} };
  /* polohy v okamžiku scény */
  let worst = 0;
  for (const t of s.cile) {
    const j = idx.get(t),
      h = s.hz[t];
    if (j === undefined || !h) continue;
    look(i, s.lat, s.lon, j, s.jd, pa);
    const e = sep(pa[0], pa[1], h.az * DEG, h.el * DEG) / DEG;
    r.cile[t] = { az: pa[0] / DEG, el: pa[1] / DEG, chyba: e, hz_az: h.az, hz_el: h.el };
    worst = Math.max(worst, e);
  }
  r.max = worst;
  line += `  polohy: nejhůř ${fmt(worst)}`;
  /* úkaz: model hledá nejtěsnější přiblížení sám */
  if (s.druh === 'usek') {
    const a = idx.get(s.par[0]),
      b = idx.get(s.par[1]);
    let best = [1e9, 0];
    for (let k = -480; k <= 480; k++) {
      const jd = s.jd + (k * 5) / 86400;
      look(i, s.lat, s.lon, a, jd, pa);
      look(i, s.lat, s.lon, b, jd, pb);
      const d = sep(pa[0], pa[1], pb[0], pb[1]) / DEG;
      if (d < best[0]) best = [d, jd, rad(a, pa[2]), rad(b, pb[2])];
    }
    const dt = (best[1] - s.jd) * 86400,
      dsep = (best[0] - s.min_sep) * 60;
    /* přechod / zákryt nastane, když je vzdálenost středů menší než součet poloměrů */
    const kont = (best[0] < (best[2] + best[3]) / 2) === (s.min_sep < ((s.r_a || 0) + (s.r_b || 0)) / 7200);
    r.ukaz = { dt, sep_model: best[0] * 60, sep_hz: s.min_sep * 60, souhlas: kont };
    line += `  úkaz: čas ${dt >= 0 ? '+' : ''}${dt.toFixed(0)} s, vzdálenost ${(best[0] * 60).toFixed(2)}′ (Horizons ${(s.min_sep * 60).toFixed(2)}′)${kont ? '' : '  ✗ úkaz nenastane'}`;
    /* meze: Phobos se pohybuje po obloze asi 0,3°/min – 30 s je 0,15°; zatmění a konjunkce ze Země přesněji */
    const limT = s.c === 'earth' ? 20 : 60;
    if (!kont || Math.abs(dt) > limT) bad++, (line += '  ✗');
  }
  const limP = s.c === 'earth' ? 1 / 60 : s.c === 'mars' ? 0.2 : 1;
  if (worst > limP) bad++, (line += `  ✗ (mez ${fmt(limP)})`);
  vysl.push(r);
  console.log(line);
}
if (process.env.SCENY_JSON) fs.writeFileSync(process.env.SCENY_JSON, JSON.stringify(vysl, null, 1));
console.log(bad ? `\n${bad} scén mimo meze` : '\nvšechny scény v mezích');
process.exit(bad ? 1 : 0);
