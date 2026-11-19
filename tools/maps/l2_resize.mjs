// Zmenšení obří zdrojové mozaiky (GeoTIFF, JPEG) na pracovní rozměr úrovně 2 bez načtení celé do paměti (sharp / libvips, proudově).
// Použití: node tools/maps/l2_resize.mjs <zdroj> <šířka> <výstup.raw> [šedá]
// Výstup: surové bajty řádek po řádku (1 kanál pro šedý zdroj, jinak 3), vedle něj <výstup.raw>.json s rozměry a počtem kanálů.
import fs from 'fs';
import sharp from 'sharp';

const [src, w, out, gray] = process.argv.slice(2);
const W = +w,
  H = W / 2;
sharp.cache(false);
const img = sharp(src, { limitInputPixels: false, unlimited: true, sequentialRead: true });
const meta = await img.metadata();
const one = gray === 'seda' || meta.channels <= 2;
let p = img.resize(W, H, { fit: 'fill', kernel: 'lanczos3' });
p = one ? p.toColourspace('b-w').extractChannel(0) : p.removeAlpha().toColourspace('srgb');
const { data, info } = await p.raw({ depth: 'uchar' }).toBuffer({ resolveWithObject: true });
fs.writeFileSync(out, data);
fs.writeFileSync(
  out + '.json',
  JSON.stringify({
    w: info.width,
    h: info.height,
    c: info.channels,
    src,
    srcW: meta.width,
    srcH: meta.height,
    depth: meta.depth,
  })
);
console.log(out, info.width, info.height, info.channels, 'kanálů; zdroj', meta.width, 'x', meta.height, meta.depth);
