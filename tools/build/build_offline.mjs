// Verze v jednom souboru (na flashku, do školy): dist/ → SlunecniSoustava200.html. Otevře se dvojklikem, bez internetu a bez serveru.
// Mapy, hudba, použité zvuky a ikony jsou vložené jako data URI (window.S200_ASSETS, čte je src/core/asset.js). Zkušebna 256 zvuků se nepřibaluje.
import fs from 'fs';
import path from 'path';
const out = (process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 0) || 'SlunecniSoustava200.html',
  MIME = { '.webp': 'image/webp', '.mp3': 'audio/mpeg' },
  A = {};
const uri = (f) => `data:${MIME[path.extname(f)]};base64,${fs.readFileSync('dist/' + f).toString('base64')}`;
for (const f of fs.readdirSync('dist/maps')) if (f.endsWith('.webp')) A['maps/' + f] = uri('maps/' + f);
if (process.argv.includes('--hi'))
  for (const f of fs.readdirSync('dist/maps/hi')) if (f.endsWith('.webp')) A['maps/hi/' + f] = uri('maps/hi/' + f); // volitelně i velké mapy
for (const f of fs.readdirSync('dist/music')) A['music/' + f] = uri('music/' + f);
const used = new Set(
  (fs.readFileSync('src/audio/audio.js', 'utf8').match(/'z\d{3}'/g) || []).map((s) => s.slice(1, -1))
);
for (const z of used) A[`zvuky/${z}.mp3`] = uri(`zvuky/${z}.mp3`);
let html = fs.readFileSync('dist/index.html', 'utf8');
const app = fs.readFileSync('dist/app.js', 'utf8').replace(/<\/script/gi, '<\\/script');
if (!html.includes('url(icons.webp)') || !html.includes('<script src="app.js"></script>'))
  throw new Error('index.html má jinou podobu, než čekám');
html = html
  .replace('url(icons.webp)', `url(${uri('icons.webp')})`)
  .replace('<body>', '<body class="offline">')
  .replace('</style>', '#zvb { display: none !important; }\n</style>')
  .replace(
    '<script src="app.js"></script>',
    () => `<script>window.S200_ASSETS=${JSON.stringify(A)};</script>\n<script>${app}</script>`
  );
fs.writeFileSync(out, html);
console.log(
  out,
  (fs.statSync(out).size / 1048576).toFixed(1) + ' MB',
  Object.keys(A).length,
  'souborů, zvuků',
  used.size
);
