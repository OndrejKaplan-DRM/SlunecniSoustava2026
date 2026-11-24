// Věrnost pohledu z povrchu: model × JPL Horizons (verze 2.1).
// Reference tools/test/ref_povrch.json (staví tools/model/vernost/pripady.py): asi 1 000 náhodných případů – těleso, místo,
// okamžik a cíl – se zdánlivým azimutem a výškou bez lomu světla. Model počítá stejným kódem jako aplikace (core/misto.js).
// Měří se úhel mezi směrem modelu a směrem z Horizons. Dvě čísla: „geom.“ = co aplikace kreslí (okamžité polohy),
// „zdánl.“ = totéž s dobou letu světla (core/misto.js, applyLightTime) – to aplikace ukazuje v pohledu z povrchu.
// Použití: npm run test:vernost   (volitelně VERNOST=vypis pro úplný seznam, VERNOST_REF=<soubor> pro jinou referenci)
import fs from 'fs';
import { B, idx, P, par, updateAll, deltaT, setDeltaT, jupSys, semi, SUN } from '../../src/core/sim.js';
import { siteFrame, azEl, toBody, applyLightTime, clearLightTime } from '../../src/core/misto.js';
const DEG = Math.PI / 180,
  AU = 149597870.7,
  ref = JSON.parse(fs.readFileSync(process.env.VERNOST_REF || 'tools/test/ref_povrch.json', 'utf8')),
  full = process.env.VERNOST === 'vypis';
/* světový čas, pro který model dá zadaný čas efemerid */
const utOf = (jdTT) => {
  let u = jdTT - deltaT(jdTT) / 86400;
  u = jdTT - deltaT(u) / 86400;
  return u;
};
const sep = (a1, e1, a2, e2) => {
  const c = Math.sin(e1) * Math.sin(e2) + Math.cos(e1) * Math.cos(e2) * Math.cos(a1 - a2);
  return Math.acos(Math.max(-1, Math.min(1, c)));
};
const dts = [],
  f = {},
  v = [0, 0, 0],
  ae = [0, 0],
  rows = [];
const root = (i) => {
  while (par[i] >= 0 && par[i] !== SUN) i = par[i];
  return i;
};
for (const c of ref.pripady) {
  const i = idx.get(c.c),
    j = idx.get(c.t);
  if (i === undefined || j === undefined) continue;
  /* místa na Zemi: čas je UT a otáčení Země na něm závisí; rozdíl TT − UT se bere stejný, jaký použil Horizons
     (po roce 2027 drží poslední známou hodnotu, model aplikace počítá s parabolou – to je jiný odhad budoucnosti, ne chyba geometrie) */
  setDeltaT(null);
  if (!c.tt && c.dt != null) {
    dts.push([2000 + (c.jd - 2451545) / 365.25, deltaT(c.jd), c.dt]);
    setDeltaT(c.dt);
  }
  const jdUT = c.tt ? utOf(c.jd) : c.jd,
    jdTT = c.tt ? c.jd : c.jd + deltaT(c.jd) / 86400,
    lon = c.c === 'jupiter' ? c.lon + jupSys(jdTT) : c.lon;
  updateAll(jdUT);
  clearLightTime();
  siteFrame(i, c.lat, lon, jdUT, f);
  toBody(f, i, j, v);
  const dist = Math.hypot(v[0], v[1], v[2]);
  azEl(f, v[0], v[1], v[2], ae);
  const g = sep(ae[0], ae[1], c.az * DEG, c.el * DEG) / DEG,
    azG = ae[0] / DEG,
    elG = ae[1] / DEG,
    diam = j === SUN || B[j].R ? (2 * Math.asin(Math.min(1, (j === SUN ? 695700 : B[j].R) / dist))) / DEG : 0;
  /* zdánlivý směr: stejná funkce, jakou aplikace používá v pohledu z povrchu (doba letu světla a aberace) */
  applyLightTime(i, jdUT);
  toBody(f, i, j, v);
  azEl(f, v[0], v[1], v[2], ae);
  const a = sep(ae[0], ae[1], c.az * DEG, c.el * DEG) / DEG;
  /* skupina: odkud → kam */
  const ri = root(i),
    rj = root(j),
    from =
      c.c === 'earth'
        ? 'Země'
        : B[i].type === 'moon'
          ? 'měsíc'
          : B[i].type === 'planet'
            ? 'planeta'
            : c.c === 'pluto'
              ? 'Pluto'
              : 'planetka (Ceres, Vesta)',
    to =
      j === SUN
        ? 'Slunce'
        : ri === rj
          ? j === ri
            ? 'mateřské těleso'
            : i === ri
              ? 'vlastní měsíc'
              : 'sousední měsíc'
          : B[j].type === 'moon'
            ? j === idx.get('moon')
              ? 'Měsíc'
              : 'cizí měsíc'
            : B[j].type === 'planet'
              ? 'planeta'
              : c.t === 'pluto'
                ? 'Pluto'
                : 'planetka (Ceres, Vesta)',
    /* u těles téže soustavy: chyba přepočtená na zlomek poloměru dráhy měsíce */
    orb =
      ri === rj && j !== SUN
        ? (Math.tan(g * DEG) * dist) / (semi[B[j].type === 'moon' && j !== ri ? j : i] || dist)
        : null;
  rows.push({ c, g, a, from, to, azG, elG, diam, dist, orb, yr: 2000 + (jdUT - 2451545) / 365.25 });
}
const q = (arr, p) => {
  const s = [...arr].sort((x, y) => x - y);
  return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN;
};
const fmt = (d) => (d < 1 / 60 ? (d * 3600).toFixed(1) + '″' : d < 1 ? (d * 60).toFixed(2) + '′' : d.toFixed(2) + '°');
const groups = new Map();
for (const r of rows) {
  const k = r.from + ' → ' + r.to;
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(r);
}
/* Meze (stupně, 95. percentil geometrického směru a největší odchylka) – nastavené podle změřeného stavu s rezervou; hlídají zhoršení. */
/* meze [95 %, největší] ve stupních pro zdánlivé směry (to aplikace ukazuje v pohledu z povrchu); verze 2.1: dvojnásobek změřených hodnot
   po kalibraci (Měsíc, dráhy měsíců a planetek na JPL Horizons). Ceres a Vesta jako pozorovatel: jiný model rotace v Horizons, viz VEROHODNOST.md */
const LIM = {
  'Pluto → Měsíc': [0.002, 0.002],
  'Pluto → Slunce': [0.01, 0.01],
  'Pluto → planeta': [0.01, 0.01],
  'Pluto → vlastní měsíc': [0.01, 0.01],
  'Země → Pluto': [0.005, 0.005],
  'Země → Slunce': [0.01, 0.01],
  'Země → cizí měsíc': [0.01, 0.05],
  'Země → planeta': [0.01, 0.03],
  'Země → planetka (Ceres, Vesta)': [1, 2],
  'Země → vlastní měsíc': [0.05, 0.1],
  'měsíc → Měsíc': [0.03, 0.03],
  'měsíc → Pluto': [0.01, 0.01],
  'měsíc → Slunce': [0.03, 0.1],
  'měsíc → mateřské těleso': [0.3, 1],
  'měsíc → planeta': [0.02, 0.1],
  'měsíc → sousední měsíc': [1, 3],
  'planeta → Měsíc': [0.01, 0.01],
  'planeta → Pluto': [0.005, 0.005],
  'planeta → Slunce': [0.01, 0.02],
  'planeta → planeta': [0.02, 0.03],
  'planeta → vlastní měsíc': [0.3, 2],
  'planetka (Ceres, Vesta) → Měsíc': [8, 8],
  'planetka (Ceres, Vesta) → Pluto': [8, 8],
  'planetka (Ceres, Vesta) → Slunce': [15, 15],
  'planetka (Ceres, Vesta) → planeta': [10, 15],
};
let bad = 0;
console.log(`Případů: ${rows.length} (reference: ${ref.zdroj})`);
console.log(
  'skupina'.padEnd(40) + 'n'.padStart(5) + '  medián geom.   95 % geom.    největší    | medián zdánl.  95 % zdánl.'
);
for (const [k, rs] of [...groups].sort((x, y) => x[0].localeCompare(y[0], 'cs'))) {
  const G = rs.map((r) => r.g),
    A = rs.map((r) => r.a),
    lim = LIM[k],
    ok = !lim || (q(A, 0.95) <= lim[0] && Math.max(...A) <= lim[1]);
  if (!ok) bad++;
  console.log(
    `${ok ? '  ok  ' : ' CHYBA'} ${k.padEnd(33)}${String(rs.length).padStart(5)}  ${fmt(q(G, 0.5)).padStart(11)}  ${fmt(q(G, 0.95)).padStart(11)}  ${fmt(Math.max(...G)).padStart(11)}    | ${fmt(q(A, 0.5)).padStart(11)}  ${fmt(q(A, 0.95)).padStart(11)}`
  );
}
const all = rows.map((r) => r.g);
console.log(
  `\nCelkem: medián ${fmt(q(all, 0.5))}, 95 % ${fmt(q(all, 0.95))}, největší ${fmt(Math.max(...all))}; do 1′: ${rows.filter((r) => r.g < 1 / 60).length}, do 0,1°: ${rows.filter((r) => r.g < 0.1).length}, do 1°: ${rows.filter((r) => r.g < 1).length} z ${rows.length}`
);
const worst = [...rows].sort((x, y) => y.g - x.g).slice(0, full ? rows.length : 25);
console.log('\nNejvětší odchylky (geom.):');
for (const r of worst)
  console.log(
    `  ${fmt(r.g).padStart(9)} (zdánl. ${fmt(r.a).padStart(9)})  ${r.c.c} ${r.c.lat.toFixed(1)}°/${r.c.lon.toFixed(1)}° → ${r.c.t}  rok ${r.yr.toFixed(1)}  model az ${((r.azG + 360) % 360).toFixed(2)} el ${r.elG.toFixed(2)} × Horizons az ${r.c.az.toFixed(2)} el ${r.c.el.toFixed(2)}${r.orb !== null ? `  (${(r.orb * 100).toFixed(2)} % poloměru dráhy)` : ''}`
  );
setDeltaT(null);
if (dts.length) {
  const far = dts.filter((d) => d[0] < 1700 || d[0] > 2030),
    near = dts.filter((d) => d[0] >= 1700 && d[0] <= 2030),
    md = (a) =>
      q(
        a.map((d) => Math.abs(d[1] - d[2])),
        0.5
      ),
    mx = (a) => Math.max(...a.map((d) => Math.abs(d[1] - d[2])));
  console.log(
    `\nΔT (TT − UT), model × Horizons: roky 1700–2030 medián rozdílu ${md(near).toFixed(1)} s, největší ${mx(near).toFixed(1)} s (${near.length} okamžiků); mimo ně medián ${md(far).toFixed(0)} s, největší ${mx(far).toFixed(0)} s (${far.length} okamžiků; po roce 2027 Horizons drží 69 s)`
  );
}
/* úhlové průměry */
const dd = rows.filter((r) => r.c.diam && r.diam).map((r) => Math.abs((r.diam * 3600) / r.c.diam - 1));
console.log(
  `\nÚhlový průměr: medián odchylky ${(q(dd, 0.5) * 100).toFixed(2)} %, 95 % ${(q(dd, 0.95) * 100).toFixed(2)} %, největší ${(Math.max(...dd) * 100).toFixed(2)} %`
);
if (process.env.VERNOST_JSON)
  fs.writeFileSync(
    process.env.VERNOST_JSON,
    JSON.stringify(
      rows.map((r) => ({
        c: r.c.c,
        t: r.c.t,
        lat: r.c.lat,
        lon: r.c.lon,
        yr: +r.yr.toFixed(2),
        g: +r.g.toFixed(5),
        a: +r.a.toFixed(5),
        sk: r.from + ' → ' + r.to,
      }))
    )
  );
console.log(bad ? `\n${bad} skupin mimo meze` : '\nbez chyb');
process.exit(bad ? 1 : 0);
