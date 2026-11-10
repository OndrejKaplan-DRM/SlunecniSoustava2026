// Ikony těles: malá osvětlená koule (elipsoid) vyrenderovaná ze skutečné mapy tělesa, s prstenci a ohony komet.
// Jeden atlas WebP (16 sloupců × 64 px). Také: aktivní oblasti Slunce (nejjasnější místa mapy EUV) → cat.json.
import sharp from 'sharp'; import fs from 'fs';
const cat = JSON.parse(fs.readFileSync('src/cat.json', 'utf8')), B = cat.bodies, S = 64, COLS = 16, rows = Math.ceil(B.length / COLS);
const atlas = Buffer.alloc(COLS * S * rows * S * 4, 0);
const CENTER = { earth: 15, jupiter: 200, mars: -75, moon: 0, pluto: 180, saturn: 0, io: 200, iapetus: 330, mimas: 110, venus: 0, mercury: 0 }; // střed pohledu (°), ať je vidět dominanta
const RINGS = { saturn: [1.24, 2.33, 0.9, [214, 196, 160]], uranus: [1.9, 2.02, 0.75, [190, 205, 215]], chariklo: [1.5, 1.7, 0.8, [210, 210, 210]], haumea: [1.9, 2.05, 0.6, [200, 200, 200]] };
const h = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
for (let i = 0; i < B.length; i++) {
  const b = B[i], f = `dist/maps/${b.id}.avif`; let W = 128, H = 64, map = null;
  if (fs.existsSync(f)) map = await sharp(f).resize(W, H, { fit: 'fill' }).removeAlpha().raw().toBuffer();
  const ring = RINGS[b.id], comet = b.type === 'comet' || b.id === 'borisov';
  let ax = 1, ay = 1; if (b.abc) { const m = Math.max(...b.abc); ax = b.abc[0] / m; ay = Math.max(0.3, b.abc[2] / m); } else if (b.flat) ay = 1 - b.flat;
  const rad = (ring ? 0.42 : comet ? 0.3 : 0.94) * S / 2, cx = comet ? S * 0.36 : S / 2, cy = comet ? S * 0.62 : S / 2, lon0 = (CENTER[b.id] || 0) * Math.PI / 180, tilt = ring ? 0.42 : 0, seed = i * 7.31;
  const ox = (i % COLS) * S, oy = Math.floor(i / COLS) * S, SS = 3;
  for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
    let r = 0, g = 0, bl = 0, a = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const x = (px + (sx + 0.5) / SS - cx) / rad, y = -(py + (sy + 0.5) / SS - cy) / rad; let c = null, al = 0;
      const ang = b.abc && ax / ay > 1.2 ? -0.5 : 0, xr = x * Math.cos(ang) - y * Math.sin(ang), yr = x * Math.sin(ang) + y * Math.cos(ang);
      let lump = 1; if (b.R < 150 && b.type !== 'planet') { const t = Math.atan2(yr, xr); lump = 1 + 0.07 * Math.sin(t * 3 + seed) + 0.05 * Math.sin(t * 5 + seed * 2); }
      const ex = xr / (ax * lump), ey = yr / (ay * lump), d2 = ex * ex + ey * ey;
      if (comet) { const tx = x * 0.8 - y * 0.6, ty = x * 0.6 + y * 0.8; if (tx > 0) { const w = 0.5 + tx * 0.55, I = Math.exp(-((ty / w) ** 2) * 2.5) * Math.exp(-tx * 0.55) * 0.9; if (I > 0.02) { c = [150 + 80 * I, 205 + 40 * I, 255]; al = I; } } const cm = Math.exp(-(x * x + y * y) * 1.2) * 0.6; if (cm > al) { c = [200, 235, 255]; al = cm; } }
      if (ring) { const yy = y / Math.sin(tilt), rr = Math.hypot(x, yy); if (rr > ring[0] && rr < ring[1] && !(d2 < 1 && y > 0)) { const u = (rr - ring[0]) / (ring[1] - ring[0]); let o = ring[2]; if (b.id === 'saturn') o *= (u > 0.58 && u < 0.64 ? 0.12 : u < 0.25 ? 0.45 : 1); c = ring[3]; al = o; } }
      if (d2 < 1) {
        const ez = Math.sqrt(1 - d2), lat = Math.asin(Math.max(-1, Math.min(1, ey))), lon = Math.atan2(ex, ez) + lon0;
        let col = b.col ? b.col.map(v => v * 255) : [150, 150, 150];
        if (map) { const u = (((lon / (2 * Math.PI) + 0.5) % 1) + 1) % 1, v = 0.5 - lat / Math.PI, k = (Math.min(H - 1, Math.floor(v * H)) * W + Math.min(W - 1, Math.floor(u * W))) * 3; col = [map[k], map[k + 1], map[k + 2]]; }
        let L;
        if (b.id === 'sun') { L = 0.55 + 0.75 * Math.pow(ez, 0.5); const lum = (col[0] * 0.4 + col[1] * 0.45 + col[2] * 0.15) / 255; col = [255, 150 + 90 * lum, 40 + 120 * lum]; }
        else { const nl = Math.max(0, -0.45 * ex + 0.5 * ey + 0.74 * ez); L = 0.16 + 1.25 * Math.pow(nl, 0.8); if (b.id === 'earth') col = col.map((v, q) => v * 0.8 + [70, 110, 190][q] * 0.25 + (1 - ez) * [20, 50, 110][q]); }
        const bst = b.type === 'star' ? 1 : 1.15 + 0.5 * (1 - Math.min(1, (col[0] + col[1] + col[2]) / 420)); // tmavá tělesa trochu zesvětlit, ať je ikona čitelná
        c = col.map(v => Math.min(255, v * L * bst)); al = 1;
      }
      if (c) { r += c[0] * al; g += c[1] * al; bl += c[2] * al; a += al; }
    }
    const n = SS * SS, k = ((oy + py) * COLS * S + ox + px) * 4; if (a > 0) { atlas[k] = r / a; atlas[k + 1] = g / a; atlas[k + 2] = bl / a; atlas[k + 3] = Math.min(255, a / n * 255); }
  }
}
const out = await sharp(atlas, { raw: { width: COLS * S, height: rows * S, channels: 4 } }).webp({ quality: 82, alphaQuality: 90 }).toBuffer();
fs.writeFileSync('dist/icons.webp', out); await sharp(atlas, { raw: { width: COLS * S, height: rows * S, channels: 4 } }).png().toFile('/tmp/icons.png');
// aktivní oblasti Slunce
{ const W = 96, H = 48, m = await sharp('dist/maps/sun.avif').resize(W, H, { fit: 'fill' }).greyscale().raw().toBuffer(), ar = [], used = [];
  const cand = []; for (let y = 8; y < H - 8; y++) for (let x = 0; x < W; x++) cand.push([m[y * W + x], x, y]); cand.sort((p, q) => q[0] - p[0]);
  for (const [v, x, y] of cand) { if (ar.length >= 16) break; if (used.some(u => Math.hypot(Math.min(Math.abs(u[0] - x), W - Math.abs(u[0] - x)), u[1] - y) < 7)) continue; used.push([x, y]); ar.push([+(((x + 0.5) / W - 0.5) * 360).toFixed(1), +((0.5 - (y + 0.5) / H) * 180).toFixed(1), +(v / 255).toFixed(2)]); }
  cat.sunAR = ar; cat.iconCols = COLS; fs.writeFileSync('src/cat.json', JSON.stringify(cat)); console.log('AR', JSON.stringify(ar)); }
console.log('icons', out.length, 'B', COLS * S, 'x', rows * S);
