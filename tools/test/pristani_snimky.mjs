// Snímky toku přistání a vzletu (verze 2.2b): karta s tlačítkem „🛬 Přistát“, míření křížkem, sestup, povrch, vzlet kolečkem.
// Použití: node tools/test/pristani_snimky.mjs <složka>
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import http from 'http';
import fs from 'fs';
import path from 'path';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.json': 'application/json' };
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
const out = process.argv[2] || '/tmp/pristani';
fs.mkdirSync(out, { recursive: true });
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
const shot = async (n) => {
  await page.screenshot({ path: `${out}/${n}.jpg`, type: 'jpeg', quality: 82 });
  console.log(n);
};
await page.evaluate(() => {
  const { S, sim } = window.S200;
  S.paused = true;
  S.jd = 2461192.5 + 0.3;
  sim.updateAll(S.jd);
  S.flyTo(sim.idx.get('mars'));
});
await page.waitForFunction(() => !window.S200.S.flying(), null, { timeout: 60000 });
await page.waitForTimeout(2500);
await shot('1_karta');
await page.evaluate(() => document.querySelector('#card [data-a="surf"]').click());
await page.waitForFunction(() => (window.S200.povrch.pickState() || {}).phase === 'vyber', null, { timeout: 30000 });
await page.evaluate(() => {
  const s = document.querySelector('#surfpick select');
  if (s) {
    s.value = '0';
    s.dispatchEvent(new Event('change', { bubbles: true }));
  }
});
await page.waitForTimeout(2500);
await shot('2_mireni');
await page.evaluate(() => window.S200.povrch.land());
await page.waitForTimeout(700);
await shot('3_sestup');
await page.waitForFunction(() => !!window.S200.S.surf, null, { timeout: 30000 });
await page.evaluate(() => {
  const q = window.S200.S.surf;
  q.az = (140 * Math.PI) / 180;
  q.el = (6 * Math.PI) / 180;
  window.S200.S.wake();
});
await page.waitForTimeout(4000);
await shot('4_povrch');
await page.evaluate(() => {
  const S = window.S200.S;
  S.surf.fov = 75;
  for (let k = 0; k < 3; k++) S.zoom(1.7);
});
await page.waitForTimeout(3500);
await shot('5_vzlet_kolecko');
console.log(errs.length ? errs.join('\n') : 'bez chyb stránky');
await browser.close();
srv.close();
