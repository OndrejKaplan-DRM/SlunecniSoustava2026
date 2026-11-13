// Zapíše dlouhodobou teorii planet (tools/out/planetlong.json z fit_long.py) do katalogu src/data/cat.json jako orbit.long.
// Amplitudy zaokrouhluje na 1e-9 rad (0,0002″). Spuštění: node tools/model/pack_long.mjs
import fs from 'fs';
const cat = JSON.parse(fs.readFileSync('src/data/cat.json', 'utf8')),
  L = JSON.parse(fs.readFileSync('tools/out/planetlong.json', 'utf8'));
const r = (x, d) => Number(x.toFixed(d));
let n = 0;
for (const b of cat.bodies) {
  const m = L[b.id];
  if (!m) continue;
  b.orbit.long = {
    el: m.el,
    rate: m.rate,
    quad: m.quad,
    lp: m.lp.map((t) => [
      r(t[0], 9),
      r(t[1], 8),
      r(t[2], 8),
      r(t[3], 10),
      r(t[4], 10),
      r(t[5], 11),
      r(t[6], 11),
      r(t[7], 8),
      r(t[8], 8),
    ]),
    terms: m.terms
      .map((t) => [...t.slice(0, 7), r(t[7], 9), r(t[8], 9), r(t[9], 10), r(t[10], 10)])
      .filter((t) => t[7] || t[8] || t[9] || t[10]),
    win: m.win,
  };
  n += b.orbit.long.terms.length;
}
fs.writeFileSync('src/data/cat.json', JSON.stringify(cat));
console.log('členů celkem', n, '· cat.json', (fs.statSync('src/data/cat.json').size / 1e3).toFixed(0), 'kB');
