// Rezidua modelu Měsíce (core/sim.js, moonGeo přes local) proti vektorům z JPL Horizons: [jd TT, Δdélka″, Δšířka″, Δr km]
// v ekliptice J2000. Použití (po esbuild): node mesic_rezidua.mjs <vstup.json> <výstup.json>
import fs from 'fs';
import { local, MOON, setDeltaT } from '../../../src/core/sim.js';
setDeltaT(0);
const o = [0, 0, 0],
  out = [];
for (const [jd, x, y, z] of JSON.parse(fs.readFileSync(process.argv[2]))) {
  local(MOON, jd, o);
  const mx = o[0], my = -o[2], mz = o[1];
  const r1 = Math.hypot(x, y, z), r2 = Math.hypot(mx, my, mz);
  const dl = ((((Math.atan2(y, x) - Math.atan2(my, mx)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI) * 206264.806;
  const db = (Math.asin(z / r1) - Math.asin(mz / r2)) * 206264.806;
  out.push([jd, dl, db, r1 - r2]);
}
fs.writeFileSync(process.argv[3], JSON.stringify(out));
