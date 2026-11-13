// Přehled „vibes“ těles: grafika (skutečná mapa × ilustrace), rotace, zvuk prostředí a hudba podle pravidel v src/audio/audio.js.
// Spuštění: npx esbuild tools/data/vibes.mjs --bundle --platform=node --format=esm --outfile=/tmp/vibes.mjs && node /tmp/vibes.mjs > docs/VIBES.md
import { B } from '../../src/core/sim.js';
import { ambOf, themeOf, MYST, TRACK_NAME } from '../../src/audio/audio.js';
import HI from '../../src/data/hi.json';
const hi = new Set(HI);
const tn = (t) => (t ? (TRACK_NAME && TRACK_NAME[t]) || t : '–');
const rows = B.map((b, i) => {
  const g =
    b.type === 'star'
      ? 'počítané za běhu'
      : b.mk === 'foto'
        ? hi.has(b.id)
          ? 'skutečná mapa + velká'
          : 'skutečná mapa'
        : 'ilustrace';
  const rot = !b.rot
    ? 'neznámá'
    : (Math.abs(b.rot) < 48
        ? Math.abs(b.rot).toFixed(1).replace('.', ',') + ' h'
        : (Math.abs(b.rot) / 24).toFixed(1).replace('.', ',') + ' d') + (b.rot < 0 ? ' zpět' : '');
  return {
    b,
    g,
    rot,
    amb: String(ambOf(i)),
    ta: tn(themeOf(i, false)),
    tk: tn(themeOf(i, true)),
    myst: MYST[b.id] ? 'ano' : '',
  };
});
const groups = new Map();
for (const r of rows) {
  const k = [r.b.type, r.g, r.amb, r.ta, r.tk].join('|');
  (groups.get(k) || groups.set(k, []).get(k)).push(r);
}
const TYPE = {
  star: 'hvězda',
  planet: 'planety',
  dwarf: 'trpasličí planety',
  moon: 'měsíce',
  asteroid: 'planetky',
  comet: 'komety',
  tno: 'transneptunická tělesa',
  centaur: 'kentauři',
  interstellar: 'mezihvězdná tělesa',
};
const ORD = Object.keys(TYPE);
const out = [];
out.push(
  '| Typ | Tělesa | Grafika | Zvuk prostředí | Hudba (dospělí) | Hudba (děti) | Vlastní záhadné téma |',
  '|---|---|---|---|---|---|---|'
);
for (const [k, l] of [...groups].sort(
  (a, b) => ORD.indexOf(a[1][0].b.type) - ORD.indexOf(b[1][0].b.type) || b[1].length - a[1].length
)) {
  const r = l[0],
    names =
      l.length <= 9
        ? l.map((x) => x.b.cs).join(', ')
        : l
            .slice(0, 5)
            .map((x) => x.b.cs)
            .join(', ') + ` a dalších ${l.length - 5}`;
  out.push(
    `| ${TYPE[r.b.type]} (${l.length}) | ${names} | ${r.g} | ${r.amb} | ${r.ta} | ${r.tk} | ${
      l
        .filter((x) => x.myst)
        .map((x) => x.b.cs)
        .join(', ') || '–'
    } |`
  );
}
const c = (f) => rows.filter(f).length;
console.log(
  `# „Vibes“ těles – podklad k procházení\n\nVygenerováno skriptem \`tools/data/vibes.mjs\` z katalogu a z pravidel zvuku (verze 1.2, ${B.length} těles). Zvuk ani hudbu jsem neslyšela – tabulka říká, co kód přiřazuje, ne jak to zní.\n`
);
console.log(
  `Grafika celkem: ${c((r) => r.g === 'skutečná mapa + velká')} těles se skutečnou velkou mapou, ${c((r) => r.g === 'skutečná mapa')} se skutečnou malou mapou, ${c((r) => r.g === 'ilustrace')} s ilustrací, Slunce počítané za běhu. Rotace neznámá (v modelu výchozí): ${c((r) => r.rot === 'neznámá')} těles.\n`
);
console.log(out.join('\n'));
console.log(
  '\n## Tělesa se skutečnou mapou\n\n| Těleso | Grafika | Otočka | Zvuk prostředí | Hudba (dospělí) | Hudba (děti) |\n|---|---|---|---|---|---|'
);
for (const r of rows.filter((r) => r.g !== 'ilustrace'))
  console.log(`| ${r.b.cs} | ${r.g} | ${r.rot} | ${r.amb} | ${r.ta} | ${r.tk} |`);
