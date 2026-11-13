// Mapy AVIF → WebP (veřejné sdílení artefaktu dovoluje jen JPEG, PNG, GIF, WebP). Použití: node tools/avif2webp.mjs [kvalita]
import sharp from 'sharp';
import fs from 'fs';
const q = +(process.argv[2] || 80);
let a = 0,
  w = 0;
for (const f of fs.readdirSync('dist/maps').filter((f) => f.endsWith('.avif'))) {
  const src = 'dist/maps/' + f,
    dst = src.replace(/\.avif$/, '.webp');
  const m = await sharp(src).metadata();
  await sharp(src).webp({ quality: q, effort: 6, smartSubsample: true }).toFile(dst);
  a += fs.statSync(src).size;
  w += fs.statSync(dst).size;
  if (f === 'earth.avif' || f === 'europa.avif')
    console.log(f, m.width, m.height, fs.statSync(src).size, fs.statSync(dst).size);
}
console.log('AVIF', a, 'WebP', w);
