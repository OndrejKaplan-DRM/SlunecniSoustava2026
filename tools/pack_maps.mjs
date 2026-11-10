// Iterace 1: balíčky map AVIF (≤ 100 kB, nejvyšší kvalita, která se vejde; 1024 × 512 u NASA, menší u procedurálních)
// a atlas náhledů 64 × 32 pro všech 150 těles (16 sloupců) – načte se při startu, ihned po klepnutí je těleso „poznat“.
import sharp from 'sharp'; import fs from 'fs'; import path from 'path';
const here = path.dirname(new URL(import.meta.url).pathname), root = path.join(here, '../..');
const cat = JSON.parse(fs.readFileSync(path.join(here, 'out/catalog.json'), 'utf8')).bodies;
const PNG = path.join(here, 'out/maps_png'), OUT = path.join(root, 'assets/space/maps'); fs.mkdirSync(OUT, { recursive: true });
const LIMIT = 100000, ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null, EFF = +(process.env.EFFORT || 6); let tot = 0; const log = [];
if (!ONLY) for (const f of fs.readdirSync(OUT)) fs.rmSync(path.join(OUT, f));
for (const b of cat) {
  const src = path.join(PNG, b.id + '.png'); if (!fs.existsSync(src) || (ONLY && !ONLY.includes(b.id))) continue;
  const meta = await sharp(src).metadata(), W = Math.min(meta.width, 1024), H = W / 2;
  let lo = 1, hi = 100, best = null;
  while (lo <= hi) { const q = (lo + hi) >> 1, buf = await sharp(src).resize(W, H, { kernel: 'lanczos3', fit: 'fill' }).avif({ quality: q, effort: EFF, chromaSubsampling: '4:2:0' }).toBuffer(); if (buf.length <= LIMIT) { best = [q, buf]; lo = q + 1; } else hi = q - 1; }
  fs.writeFileSync(path.join(OUT, b.id + '.avif'), best[1]); tot += best[1].length; log.push(`${b.id}:${W}:q${best[0]}:${(best[1].length / 1000).toFixed(1)}kB`);
}
// atlas: 16 × ceil(N/16) buněk 64 × 32 (řádek = 32 px), pořadí podle katalogu
const AC = 16, rows = Math.ceil(cat.length / AC), atlas = Buffer.alloc(1024 * rows * 32 * 3, 0);
for (let i = 0; i < cat.length; i++) {
  const src = path.join(PNG, cat[i].id + '.png'); let px;
  if (fs.existsSync(src)) px = await sharp(src).resize(64, 32, { kernel: 'lanczos3', fit: 'fill' }).removeAlpha().raw().toBuffer();
  else { const c = (cat[i].color || [1, 1, 1]).map(x => Math.round(Math.min(1, x) * 200)); px = Buffer.alloc(64 * 32 * 3); for (let k = 0; k < 64 * 32; k++) px.set(c, k * 3); }
  const cx = (i % AC) * 64, cy = Math.floor(i / AC) * 32;
  for (let y = 0; y < 32; y++) px.copy(atlas, ((cy + y) * 1024 + cx) * 3, y * 64 * 3, (y + 1) * 64 * 3);
}
const ab = await sharp(atlas, { raw: { width: 1024, height: rows * 32, channels: 3 } }).avif({ quality: 70, effort: 6 }).toBuffer();
fs.writeFileSync(path.join(root, 'assets/space/atlas.avif'), ab);
console.log(log.join(' '));
console.log(`map ${log.length}, celkem ${(tot / 1e6).toFixed(2)} MB, atlas ${(ab.length / 1000).toFixed(1)} kB (${1024}×${rows * 32})`);
