// Sestaví mapy (AVIF) a katalog pro Soustavu 200. Spouštět z kořene: node tools/build_assets.mjs
import sharp from 'sharp'; import fs from 'fs'; import path from 'path';
const OLD = '/home/claude/oliverovaplanetka8/assets', DL = '/home/claude/dl', PNG = 'tools/out/maps_png', OUT = 'dist/maps';
const cat = JSON.parse(fs.readFileSync('tools/out/catalog.json', 'utf8')).bodies;
const PPE = { jupiter: 'ppe/jupitermap.jpg', saturn: 'ppe/saturnmap.jpg', mars: 'ppe/marsmap1k.jpg' };
const REAL = ['venus', 'neptune', 'titan', 'mercury', 'ceres', 'vesta', 'uranus', 'hyperion', 'phoebe', 'proteus', 'janus', 'epimetheus', 'amalthea', 'eros', 'ida', 'gaspra', 'bennu', 'prometheus'];
const NASA = new Set(JSON.parse(fs.readFileSync('/home/claude/oliverovaplanetka8/tools/space/out/maps_list.json', 'utf8')).filter(x => x[1] === 'nasa').map(x => x[0]));
const avg = async (buf) => { const s = await sharp(buf).resize(8, 4, { fit: 'fill' }).removeAlpha().raw().toBuffer(); let r = 0, g = 0, b = 0; for (let i = 0; i < s.length; i += 3) { r += s[i]; g += s[i + 1]; b += s[i + 2]; } const n = s.length / 3; return [r / n / 255, g / n / 255, b / n / 255].map(x => +x.toFixed(3)); };
const enc = async (src, W, q, extra = (s) => s) => extra(sharp(src).resize(W, W / 2, { kernel: 'lanczos3', fit: 'fill' }).removeAlpha()).avif({ quality: q, effort: 6, chromaSubsampling: '4:2:0' }).toBuffer();
let tot = 0; const info = {};
for (const b of cat) {
  let buf = null, kind = 'proc';
  if (b.id === 'earth') { buf = await enc(DL + '/earth_atmos_2048.jpg', 2048, 62); kind = 'foto'; }
  else if (b.id === 'moon') { buf = await enc(OLD + '/moon/lroc_color_2k.jpg', 2048, 58); kind = 'foto'; }
  else if (b.id === 'sun') { buf = await enc(OLD + '/sun/sdo171_map.jpg', 1024, 60); kind = 'foto'; }
  else if (PPE[b.id]) { buf = await enc(DL + '/' + PPE[b.id], 1024, 62); kind = 'foto'; }
  else if (REAL.includes(b.id)) { buf = await enc(DL + '/' + b.id + '.png', 512, 68); kind = 'foto'; }
  else if (fs.existsSync(`${OLD}/space/maps/${b.id}.avif`)) { buf = fs.readFileSync(`${OLD}/space/maps/${b.id}.avif`); kind = NASA.has(b.id) ? 'foto' : 'proc'; }
  else if (fs.existsSync(`${PNG}/${b.id}.png`)) { buf = await enc(`${PNG}/${b.id}.png`, 256, 55); }
  if (!buf) { console.log('BEZ MAPY', b.id); continue; }
  fs.writeFileSync(`${OUT}/${b.id}.avif`, buf); tot += buf.length; info[b.id] = { col: await avg(buf), kind };
}
// Země: mraky (R), odlesk oceánu (G), noční světla (B) v jedné textuře
{ const W = 2048, H = 1024, ch = async (f) => sharp(DL + '/' + f).resize(W, H, { fit: 'fill' }).removeAlpha().greyscale().raw().toBuffer();
  const c = await sharp(DL + '/earth_clouds_1024.png').resize(W, H, { fit: 'fill' }).ensureAlpha().extractChannel(3).raw().toBuffer();
  const [s, l] = [ await ch('earth_specular_2048.jpg'), await ch('earth_lights_2048.png')], o = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H; i++) { o[i * 3] = c[i]; o[i * 3 + 1] = s[i]; o[i * 3 + 2] = l[i]; }
  const buf = await sharp(o, { raw: { width: W, height: H, channels: 3 } }).avif({ quality: 55, effort: 6, chromaSubsampling: '4:4:4' }).toBuffer(); fs.writeFileSync(OUT + '/earth_aux.avif', buf); tot += buf.length; console.log('earth_aux', buf.length); }
{ const buf = await sharp(DL + '/milkyway.png').resize(2048, 1024).removeAlpha().avif({ quality: 50, effort: 6 }).toBuffer(); fs.writeFileSync(OUT + '/milkyway.avif', buf); tot += buf.length; console.log('milkyway', buf.length); }
{ const buf = await sharp(OLD + '/sun/sdo171_corona.jpg').avif({ quality: 55 }).toBuffer(); fs.writeFileSync(OUT + '/corona.avif', buf); tot += buf.length; }
// prstence Saturnu: radiální profil RGBA 256 px
const rr = await sharp(DL + '/saturn_rings_radial.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const ring = Array.from(rr.data.subarray(0, 256 * 4));
// katalog: zaokrouhlení a doplnění barvy a druhu mapy
const r4 = (x) => typeof x === 'number' ? +x.toPrecision(9) : Array.isArray(x) ? x.map(r4) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, r4(v)])) : x;
const DROP = ['score', 's_size', 's_near', 'map'];
const bodies = cat.map(b => { const o = {}; for (const [k, v] of Object.entries(b)) if (!DROP.includes(k) && v !== null && v !== undefined) o[k] = r4(v);
  if (o.orbit) { delete o.orbit.rms_const_deg; delete o.orbit.rms_mean_deg; delete o.orbit.src; if (o.orbit.corr) { delete o.orbit.corr.rms_as; } }
  if (info[b.id]) { o.col = info[b.id].col; o.mk = info[b.id].kind; } return o; });
fs.writeFileSync('src/cat.json', JSON.stringify({ bodies, ring }));
console.log('map', Object.keys(info).length, 'foto', Object.values(info).filter(x => x.kind === 'foto').length, 'celkem MB', (tot / 1e6).toFixed(2), 'cat kB', (fs.statSync('src/cat.json').size / 1e3).toFixed(0));
