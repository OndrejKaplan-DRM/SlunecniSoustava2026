// Snímky referenčních scén z modelu (verze 2.1): pro každou scénu z tools/test/ref_sceny.json postaví pozorovatele na povrch,
// nastaví čas (UT) a namíří pohled na úkaz; uloží snímek obrazovky bez lišt (jen obloha, obzor, jména a vodítka) a tabulku těles
// nad obzorem, jak ji ukazuje panel „Obloha odsud“. Skládání se skutečnými fotkami: tools/test/ref_slozit.py.
// Použití: node tools/test/ref_snimky.mjs <výstupní složka> [id,id,…]
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import http from 'http';
import fs from 'fs';
import path from 'path';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.json': 'application/json' };
const srv = http
  .createServer((q, r) => {
    const f = path.join('dist', decodeURIComponent(q.url.split('?')[0] === '/' ? '/index.html' : q.url.split('?')[0]));
    fs.readFile(f, (e, d) => {
      if (e) return (r.writeHead(404), r.end());
      r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
      r.end(d);
    });
  })
  .listen(0);
const out = process.argv[2] || '/tmp/ref',
  only = process.argv[3] ? new Set(process.argv[3].split(',')) : null,
  ref = JSON.parse(fs.readFileSync('tools/test/ref_sceny.json', 'utf8'));
fs.mkdirSync(out, { recursive: true });
/* jak se na scénu dívat: cíl uprostřed, zorné pole (°), vodítka */
const POHLED = {
  phobos_slunce_jezero_2022: { track: 'sun', fov: 1.2 },
  deimos_slunce_gale_2019: { track: 'sun', fov: 1.2 },
  phobos_deimos_gale_2013: { track: 'deimos', fov: 0.8 },
  zeme_mesic_z_marsu_2014: { track: 'earth', fov: 45, el: 12, guides: { az: true } },
  zeme_mesic_z_marsu_2014_detail: { scena: 'zeme_mesic_z_marsu_2014', track: 'earth', fov: 0.6 },
  zeme_ranni_spirit_2004: { track: 'earth', fov: 45, el: 18, guides: { az: true } },
  venuse_praha_2026: { az: 125, el: 16, fov: 70, guides: { az: true } },
  velka_konjunkce_praha_2020: { track: 'jupiter', fov: 0.8, snimek: true },
  zatmeni_dallas_2024: { track: 'sun', fov: 1.5 },
  jupiter_z_io_2026: { track: 'jupiter', fov: 60, guides: { az: true } },
  zeme_z_mesice_apollo17: { track: 'earth', fov: 40, guides: { az: true } },
};
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
await page.goto(`http://localhost:${srv.address().port}/`);
await page.waitForFunction(() => window.S200, null, { timeout: 30000 });
await page.evaluate(() => document.querySelector('#sp-go').click());
await page.waitForFunction(() => !document.querySelector('#splash.on'), null, { timeout: 60000 });
await page.addStyleTag({
  content:
    'body.refsnap .panel, body.refsnap #top, body.refsnap #tools, body.refsnap #dockwrap, body.refsnap #mini, body.refsnap #toast, body.refsnap #hud, body.refsnap #cardtab, body.refsnap #sunchip, body.refsnap #guide, body.refsnap #mission, body.refsnap #more { display: none !important; }',
});
const meta = [];
for (const [key, p] of Object.entries(POHLED)) {
  const s = ref.sceny.find((x) => x.id === (p.scena || key));
  if (!s || (only && !only.has(key))) continue;
  const jd = p.snimek && s.jd_snimek ? s.jd_snimek : s.jd;
  const r = await page.evaluate(
    ([s, p, jd]) => {
      const { S, sim, povrch } = window.S200,
        I = sim.idx;
      document.body.classList.add('refsnap');
      if (S.surf) povrch.exit();
      S.paused = true;
      S.jd = jd;
      povrch.info.guides({ az: false, eq: false, lines: false, ret: true, body: false, ...(p.guides || {}) });
      povrch.enter(I.get(s.c), s.lat, s.lon, {
        fov: p.fov,
        track: p.track ? I.get(p.track) : -1,
        az: p.az,
        el: p.el,
        air: true,
      });
      return true;
    },
    [s, p, jd]
  );
  await page.waitForTimeout(4500);
  /* sledovaný cíl drží engine uprostřed; po ustálení ještě odečíst tabulku těles z panelu */
  const rows = await page.evaluate(() =>
    window.S200.povrch.info
      .rows()
      .filter((x) => x.up)
      .map((x) => ({
        j: window.S200.sim.B[x.j].id,
        az: +x.az.toFixed(3),
        el: +x.el.toFixed(3),
        diam: +x.diam.toFixed(4),
        mag: x.m === null ? null : +x.m.toFixed(1),
      }))
  );
  if (p.el !== undefined && p.track)
    (await page.evaluate((el) => {
      const q = window.S200.S.surf;
      q.track = -1;
      q.el = (el * Math.PI) / 180;
    }, p.el),
      await page.waitForTimeout(1500));
  await page.screenshot({ path: `${out}/${key}.png` });
  meta.push({ id: key, scena: s.id, ut: s.ut, jd, fov: p.fov, nad_obzorem: rows });
  console.log(key, s.ut, 'UT', rows.length, 'těles nad obzorem');
}
fs.writeFileSync(`${out}/meta.json`, JSON.stringify(meta, null, 1));
console.log(errs.length ? errs.join('\n') : 'bez chyb stránky');
await browser.close();
srv.close();
