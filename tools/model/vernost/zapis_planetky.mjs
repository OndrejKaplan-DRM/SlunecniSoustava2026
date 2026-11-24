// Zapíše dráhy planetek a transneptunických těles z tools/out/planetky_fit.json (fit_planetky.py) do src/data/cat.json.
// Pro každé těleso jsou tři kandidáti (okna fitu 1900–2100 a 1980–2060 se stáčením uzlu a perihelu, 2010–2040 bez stáčení).
// Vybere se nejmenší skóre = chyba 1900–2100 + 2 × chyba 2000–2050 (dnešek má dvojnásobnou váhu) a zapíše se jen tehdy,
// když je skóre menší než u dosavadní dráhy a roky 2000–2050 se nezhorší. Komety a blízké průlety (Apophis) tím zůstanou.
// Použití: node tools/model/vernost/zapis_planetky.mjs
import fs from 'fs';
const cat = JSON.parse(fs.readFileSync('src/data/cat.json', 'utf8')),
  fit = JSON.parse(fs.readFileSync('tools/out/planetky_fit.json', 'utf8')),
  g = (v, n = 12) => +v.toPrecision(n),
  J2000 = 2451545.0;
let n = 0;
for (const b of cat.bodies) {
  const r = fit[b.id];
  if (!r || b.orbit.kind !== 'kep') continue;
  const score = (x) => x.rms + 2 * x.ted,
    old = { rms: r.old_rms, ted: r.old_ted },
    ok = Object.entries(r.kand)
      .filter(([, x]) => score(x) < score(old) && x.ted <= old.ted * 1.05 + 0.01)
      /* blízkozemní planetky (q < 1,3 AU) mění dráhu při průletech kolem Země; přepsat jen při jasném zlepšení dneška */
      .filter(([, x]) => r.q >= 1.3 || x.ted < 0.5 * old.ted)
      .sort((x, y) => score(x[1]) - score(y[1]));
  if (!ok.length) {
    console.log(`  ponechána: ${b.id.padEnd(12)} dřív ${old.rms.toFixed(3)}°/${old.ted.toFixed(3)}°`);
    continue;
  }
  const [win, best] = ok[0];
  const [a, e, i, O, Od, w, wd, Tp] = best.p;
  b.orbit = {
    kind: 'kep',
    q: g(a * (1 - e)),
    e: g(e),
    i: g(i),
    O: g(((O % 360) + 360) % 360),
    w: g(((w % 360) + 360) % 360),
    Tp: g(J2000 + Tp, 14),
    ...(Od || wd ? { Od: g(Od, 9), wd: g(wd, 9) } : {}),
    fit: `JPL Horizons ${win}; chyba heliocentricky ${best.rms.toFixed(3)}° (1900–2100), ${best.ted.toFixed(3)}° (2000–2050)`,
  };
  n++;
}
fs.writeFileSync('src/data/cat.json', JSON.stringify(cat));
console.log('zapsáno drah:', n);
