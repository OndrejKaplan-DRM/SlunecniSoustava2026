// Náhledový obrázek pro sdílení odkazu (dist/nahled.jpg, 1200 × 630). Spuštění: node tools/build/nahled.mjs && převod /tmp/nahled.png na JPEG.
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import http from 'http';
import fs from 'fs';
import path from 'path';
const root = 'dist';
const srv = http
  .createServer((q, r) => {
    let f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
    if (f.endsWith('/')) f += 'index.html';
    fs.readFile(f, (e, d) => {
      if (e) {
        r.writeHead(404);
        r.end();
      } else {
        r.writeHead(200);
        r.end(d);
      }
    });
  })
  .listen(0);
const b = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(`http://localhost:${srv.address().port}/`);
await page.waitForTimeout(2500);
await page.evaluate(() => document.querySelector('#sp-go').click());
await page.waitForTimeout(1000);
await page.keyboard.press('6');
await page.waitForTimeout(9000);

await page.evaluate(() => {
  const S = window.S200.S;
  S.zoom(0.8);
  S.rotate(-60, 25);
});
await page.waitForTimeout(2500);
await page.evaluate(() => {
  for (const s of [
    '#card',
    '#mission',
    '#toast',
    '#guide',
    '#ufo',
    '#hud',
    '#mini',
    '#cardtab',
    '#tools',
    '#top',
    '#sub',
  ])
    document.querySelector(s).style.display = 'none';
  const d = document.createElement('div');
  d.style.cssText =
    'position:fixed;left:28px;top:24px;background:rgba(4,7,14,.82);padding:14px 26px 18px;border-radius:16px;border:1px solid rgba(140,165,210,.25);font:700 54px system-ui,sans-serif;color:#fff;text-shadow:0 2px 18px #000,0 0 4px #000;z-index:99';
  d.innerHTML =
    'Sluneční soustava <span style="color:#ffc857">200</span><div style="font:500 22px system-ui,sans-serif;color:#dfe7f5;margin-top:6px">3D model ve skutečném měřítku · zdarma, pro děti i dospělé</div>';
  document.body.appendChild(d);
});
await page.waitForTimeout(1500);
await page.screenshot({ path: '/tmp/nahled.png' });
await b.close();
srv.close();
