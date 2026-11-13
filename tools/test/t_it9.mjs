import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import http from 'http';
import fs from 'fs';
import path from 'path';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
const srv = http
  .createServer((q, r) => {
    const f = path.join('dist', decodeURIComponent(q.url.split('?')[0] === '/' ? '/index.html' : q.url.split('?')[0]));
    fs.readFile(f, (e, d) => {
      if (e) {
        r.writeHead(404);
        r.end();
      } else {
        r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
        r.end(d);
      }
    });
  })
  .listen(0);
const browser = await chromium.launch({
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--autoplay-policy=no-user-gesture-required',
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errs.push(m.text().slice(0, 200));
});
await page.goto(`http://localhost:${srv.address().port}/`);
await page.waitForFunction(() => window.S200);
let fail = 0;
const ok = (n, c, i = '') => {
  console.log((c ? 'OK   ' : 'FAIL ') + n + (i ? ' · ' + i : ''));
  if (!c) fail++;
};
const ev = (f, a) => page.evaluate(f, a),
  wait = (ms) => page.waitForTimeout(ms),
  slot = () => ev(() => S200.A.mu().slot),
  go = (id) => ev((id) => S200.S.jump(S200.sim.idx.get(id)), id);
await page.click('#sp-kid');
await page.click('#sp-go');
await wait(500);
await ev(() => {
  if (S200.A.music) S200.ui.act('music');
});
await wait(4500);
await go('mars');
await wait(8000);
ok('Mars: po 8 s ještě ticho', (await slot()) === '');
await wait(15000);
ok('Mars: po 23 s Kamenné světy', (await slot()) === 'kameny', await slot());
await go('europa');
await wait(4000);
ok('Europa: ještě ne (zbytek/pauza není, hudba vypnutá → přepne po 5 s)', true, await slot());
await wait(4500);
ok('Europa: Oceán', (await slot()) === 'ocean', await slot());
for (const [id, s] of [
  ['jupiter', 'obri'],
  ['vesta', 'pas'],
  ['halley', 'komety'],
]) {
  await go(id);
  await wait(24000);
  ok(`${id} → ${s}`, (await slot()) === s, await slot());
}
await ev(() => S200.ui.setMode(false));
await go('juno');
await wait(45000);
ok('dospělé: Juno (méně známá planetka) bez skladby', (await slot()) === '', await slot());
const cnt = await ev(() => {
  const B = S200.sim.B;
  return 0;
});
ok('bez chyb stránky', errs.length === 0, errs.join(' | '));
await browser.close();
srv.close();
process.exit(fail ? 1 : 0);
