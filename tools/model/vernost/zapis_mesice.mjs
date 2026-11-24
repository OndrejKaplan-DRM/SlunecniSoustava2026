// Zapíše dráhy měsíců z tools/out/mesice_fit.json (fit na JPL Horizons, fit_mesice.py) do src/data/cat.json.
// Dráha se přepíše jen tehdy, když je nový fit na celém období 1900–2100 lepší než dosavadní. Formát souboru zůstává
// (JSON.stringify bez mezer), takže rozdíl v repu jsou jen čísla drah. Použití: node tools/model/vernost/zapis_mesice.mjs
import fs from 'fs';
const cat = JSON.parse(fs.readFileSync('src/data/cat.json', 'utf8')),
  fit = JSON.parse(fs.readFileSync('tools/out/mesice_fit.json', 'utf8')),
  g = (v, n = 12) => +v.toPrecision(n),
  TAU = 2 * Math.PI;
let n = 0;
for (const b of cat.bodies) {
  const r = fit[b.id];
  if (!r || b.orbit.kind !== 'sat') continue;
  if (!(r.rms < r.old_rms)) {
    console.log('  ponechána původní dráha:', b.id, r.rms, r.old_rms);
    continue;
  }
  const o = b.orbit,
    nw = { kind: 'sat', frame: o.frame || 'eq', flip: r.flip === undefined ? !!o.flip : !!r.flip };
  if (r.bary) nw.bary = [r.bary[0], g(r.bary[1], 6)];
  ['a', 'e', 'i', 'O0', 'Od', 'w0', 'wd', 'L0', 'n'].forEach((k, j) => (nw[k] = g(r.p[j])));
  for (const k of ['O0', 'w0', 'L0']) nw[k] = g(nw[k] % TAU);
  nw.corr = {
    poly: r.corr.poly.map((x) => g(x, 9)),
    win: r.corr.win.map((x) => Math.round(x * 100) / 100),
    terms: r.corr.terms.map((t) => [t[0], ...t.slice(1).map((x) => g(x, 9))]),
    rms0_deg: g(r.rms_base, 4),
    rms_deg: g(r.rms, 4),
  };
  nw.fit = `JPL Horizons ${Math.round(r.span[0])}–${Math.round(r.span[1])}`;
  b.orbit = nw;
  if (b.src === 'pamet') b.src = 'horizons';
  n++;
}
fs.writeFileSync('src/data/cat.json', JSON.stringify(cat));
console.log('zapsáno drah:', n);
