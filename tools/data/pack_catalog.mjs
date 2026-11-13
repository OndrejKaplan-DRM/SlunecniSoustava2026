// Iterace 1: katalog rozdělený na dvě vrstvy.
//  T0 (cat_t0.json, při startu): jen to, co je potřeba k poloze, natočení a jasnosti – dráha, pól, poloměr, H, barva, příznaky;
//  T1 (cat_t1.js, jeden řetězec): jména, fakta, mise, atmosféra … – rozbalí se až při dotazu na těleso (JSON.parse jednoho záznamu).
import fs from 'fs';
import path from 'path';
const here = path.dirname(new URL(import.meta.url).pathname),
  root = path.join(here, '../..');
const cat = JSON.parse(fs.readFileSync(path.join(here, 'out/catalog.json'), 'utf8'));
const T0K = [
  'id',
  'parent',
  'type',
  'R',
  'abc',
  'flat',
  'rot',
  'H',
  'albedo',
  'color',
  'pole',
  'W',
  'framePole',
  'orbit',
  'rings',
  'atm',
  'map',
  'g',
  'vesc',
];
const r4 = (x) =>
  typeof x === 'number'
    ? +x.toPrecision(10)
    : Array.isArray(x)
      ? x.map(r4)
      : x && typeof x === 'object'
        ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, r4(v)]))
        : x;
const t0 = cat.bodies.map((b) => {
  const o = {};
  for (const k of T0K)
    if (b[k] !== undefined && b[k] !== null)
      o[k] = r4(k === 'atm' ? { gas: b.atm.gas ? 1 : 0, p: b.atm.p || 0, sky: b.atm.sky, haze: b.atm.haze } : b[k]);
  if (o.orbit && o.orbit.mean) {
    o.orbit = { ...o.orbit };
  }
  return o;
});
const t1 = cat.bodies.map((b) => {
  const o = {};
  for (const [k, v] of Object.entries(b)) if (!T0K.includes(k) || k === 'atm') o[k] = v;
  return JSON.stringify(o);
});
fs.writeFileSync(path.join(root, 'src/space/data/cat_t0.json'), JSON.stringify({ n: t0.length, bodies: t0 }));
fs.writeFileSync(
  path.join(root, 'src/space/data/cat_t1.js'),
  '// vygenerováno tools/space/pack_catalog.mjs – záznamy oddělené znakem \\u001e, rozbalují se až na požádání\nexport const T1 = ' +
    JSON.stringify(t1.join('\u001e')) +
    ';\n'
);
console.log(
  'T0',
  fs.statSync(path.join(root, 'src/space/data/cat_t0.json')).size,
  'B · T1',
  fs.statSync(path.join(root, 'src/space/data/cat_t1.js')).size,
  'B'
);
