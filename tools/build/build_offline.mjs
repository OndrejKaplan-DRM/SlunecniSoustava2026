// Verze v jednom souboru (na flashku, do školy): dist/ → SlunecniSoustava200.html. Otevře se dvojklikem, bez internetu a bez serveru.
// Mapy, hudba, použité zvuky a ikony jsou vložené jako data URI (window.S200_ASSETS, čte je src/core/asset.js). Zkušebna 256 zvuků se nepřibaluje.
import fs from 'fs';
import path from 'path';
const out = (process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 0) || 'SlunecniSoustava200.html',
  MIME = { '.webp': 'image/webp', '.mp3': 'audio/mpeg' },
  A = {};
const uri = (f) => `data:${MIME[path.extname(f)]};base64,${fs.readFileSync('dist/' + f).toString('base64')}`;
for (const f of fs.readdirSync('dist/maps')) if (f.endsWith('.webp')) A['maps/' + f] = uri('maps/' + f);
/* 2.2: výškové mapy Měsíce a Marsu pro krajinu z povrchu (2,7 MB, vždy) */
if (fs.existsSync('dist/maps/dem'))
  for (const f of fs.readdirSync('dist/maps/dem')) if (f.endsWith('.webp')) A['maps/dem/' + f] = uri('maps/dem/' + f);
if (process.argv.includes('--hi')) {
  for (const f of fs.readdirSync('dist/maps/hi')) if (f.endsWith('.webp')) A['maps/hi/' + f] = uri('maps/hi/' + f); // volitelně i velké mapy
  /* 1.8m: úroveň 2 (dlaždice 16k/8k) – jen s --hi a bez --bez-l2 */
  if (!process.argv.includes('--bez-l2') && fs.existsSync('dist/maps/l2'))
    for (const d of fs.readdirSync('dist/maps/l2'))
      for (const f of fs.readdirSync('dist/maps/l2/' + d))
        if (f.endsWith('.webp')) A[`maps/l2/${d}/${f}`] = uri(`maps/l2/${d}/${f}`);
}
for (const f of fs.readdirSync('dist/music')) A['music/' + f] = uri('music/' + f);
for (const f of fs.readdirSync('dist/sky')) if (f.endsWith('.webp')) A['sky/' + f] = uri('sky/' + f); // fotografie objektů na obloze (1.8b)
const used = new Set(
  (fs.readFileSync('src/audio/audio.js', 'utf8').match(/'z\d{3}'/g) || []).map((s) => s.slice(1, -1))
);
for (const z of used) A[`zvuky/${z}.mp3`] = uri(`zvuky/${z}.mp3`);
/* 1.8m: data se neukládají do jednoho velkého objektu v JavaScriptu (prohlížeč pak drží text skriptu i všechny řetězce zvlášť –
   u 180 MB dvojnásobek paměti), ale do neaktivních prvků <script type="text/x-s200">, každý soubor zvlášť. window.S200_ASSETS je Proxy:
   při čtení cesty vrátí data URI složené z textu prvku (dočasný řetězec), jinak undefined – src/core/asset.js se nemění.
   Původní způsob: přepínač --json. */
const jsonAssets = () => `<script>window.S200_ASSETS=${JSON.stringify(A)};</script>`;
function domAssets() {
  const ix = {},
    parts = [];
  let n = 0;
  for (const [p, u] of Object.entries(A)) {
    /* Předpona nesmí dát id, které už na stránce je: „a“ + 785 v soustavě o základu 36 je „alt“ (prvek s výškou nad tělesem)
       a soubor s pořadím 785 se pak nenačetl (v plné verzi dlaždice Země 2-4-20). */
    const k = u.indexOf(','),
      id = '_a' + (n++).toString(36);
    ix[p] = [id, u.slice(5, k)]; /* „image/webp;base64“ */
    parts.push(`<script type="text/x-s200" id="${id}">${u.slice(k + 1)}</script>`);
  }
  return (
    `<script>(function(){var I=${JSON.stringify(ix)};window.S200_ASSETS=new Proxy({},{get:function(o,p){var e=I[p],d=e&&document.getElementById(e[0]);` +
    `return d?'data:'+e[1]+','+d.textContent:undefined},has:function(o,p){return !!I[p]}});})();</script>\n` +
    parts.join('\n')
  );
}
let html = fs.readFileSync('dist/index.html', 'utf8');
const app = fs.readFileSync('dist/app.js', 'utf8').replace(/<\/script/gi, '<\\/script');
if (
  !html.includes('url(icons.webp)') ||
  !html.includes('url(fonts/baloo2.woff2)') ||
  !html.includes('<script src="app.js"></script>')
)
  throw new Error('index.html má jinou podobu, než čekám');
html = html
  .replace('url(icons.webp)', `url(${uri('icons.webp')})`)
  .replace(
    'url(fonts/baloo2.woff2)',
    `url(data:font/woff2;base64,${fs.readFileSync('dist/fonts/baloo2.woff2').toString('base64')})`
  )
  .replace(/<meta property="og:(url|image)[^>]*>\n/g, '')
  .replace('<body>', '<body class="offline">')
  .replace('</style>', '#zvb { display: none !important; }\n</style>')
  .replace(
    '<script src="app.js"></script>',
    () => (process.argv.includes('--json') ? jsonAssets() : domAssets()) + `\n<script>${app}</script>`
  );
fs.writeFileSync(out, html);
console.log(
  out,
  (fs.statSync(out).size / 1048576).toFixed(1) + ' MB',
  Object.keys(A).length,
  'souborů, zvuků',
  used.size
);
