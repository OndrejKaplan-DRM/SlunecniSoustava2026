// Vypíše polohy modelu pro zadané časy: vstup = soubor Float64 (JD), výstup = Float64 [čas × těleso × 3], ekliptika J2000.
// Planety a Pluto heliocentricky v AU, Měsíc geocentricky v km. Slouží měření věrohodnosti proti DE422 (tools/model/verohodnost.py).
// Spuštění: npx esbuild tools/model/dump_model.mjs --bundle --platform=node --format=esm --outfile=/tmp/dump.mjs && node /tmp/dump.mjs jd.bin out.bin
import fs from 'fs';
import { idx, P, updateAll, AU, deltaT } from '../../src/core/sim.js';
export const IDS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'moon'];
const jb = fs.readFileSync(process.argv[2]),
  jd = new Float64Array(jb.buffer, jb.byteOffset, jb.length / 8),
  out = new Float64Array(jd.length * IDS.length * 3),
  E = idx.get('earth');
jd.forEach((tt, n) => {
  /* vstup je čas efemerid (TT); model čeká světový čas (UT = TT − ΔT) */
  let t = tt - deltaT(tt) / 86400;
  t = tt - deltaT(t) / 86400;
  updateAll(t);
  IDS.forEach((id, k) => {
    const i = idx.get(id),
      o = (n * IDS.length + k) * 3,
      m = id === 'moon',
      x = P[i * 3] - (m ? P[E * 3] : 0),
      y = P[i * 3 + 1] - (m ? P[E * 3 + 1] : 0),
      z = P[i * 3 + 2] - (m ? P[E * 3 + 2] : 0),
      s = m ? 1 : 1 / AU;
    out[o] = x * s; /* scéna (x, z, −y) → ekliptika */
    out[o + 1] = -z * s;
    out[o + 2] = y * s;
  });
});
fs.writeFileSync(process.argv[3], Buffer.from(out.buffer));
