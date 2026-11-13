// Dekodér balíčku mapy pro měřicí lavici (Node). Iterace 1+: AVIF (≤ 100 kB) → RGB; jinak JPEG z iterace 0.
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
export const files = (id, assets) =>
  ['avif', 'jpg']
    .map((e) => path.join(assets, 'space/maps', id + '.' + e))
    .filter((f) => fs.existsSync(f))
    .slice(0, 1);
export async function decode(id, assets, W = 1024, H = 512) {
  const f = files(id, assets);
  if (!f.length) return null;
  const { data } = await sharp(f[0])
    .resize(W, H, { kernel: 'lanczos3', fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { w: W, h: H, data, bytes: f.reduce((a, x) => a + fs.statSync(x).size, 0) };
}
