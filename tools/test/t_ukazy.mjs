// snímky v emulaci telefonu a tabletu: node tools/mobshot.mjs <složka> [phone|land|tab|tabl]
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import http from 'http';
import fs from 'fs';
import path from 'path';
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
};
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
const out = process.argv[2] || '/tmp/mob',
  which = process.argv[3] || 'phone';
fs.mkdirSync(out, { recursive: true });
const VP = { phone: [390, 844, 2], tab: [820, 1180, 1.5], desk: [1280, 760, 1] }[which];
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const ctx = await browser.newContext({
  viewport: { width: VP[0], height: VP[1] },
  deviceScaleFactor: VP[2],
  isMobile: which !== 'desk',
  hasTouch: which !== 'desk',
});
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
await page.goto(`http://localhost:${srv.address().port}/`);
await page.waitForFunction(() => window.S200);
const shot = (n) => page.screenshot({ path: `${out}/${which}_${n}.jpg`, type: 'jpeg', quality: 75 }),
  w = (ms) => page.waitForTimeout(ms);
const tap = (s) => (which === 'desk' ? page.click(s) : page.tap(s));
await w(1500);
await tap('#sp-go');
await w(2500);
await tap('#tools [data-a="more"]');
await w(600);
await tap('#more [data-a="uk"]');
await w(900);
await shot('1seznam');
await tap('#uk-list button[data-k="0"]');
await w(900);
await shot('2karta');
await page.evaluate(() => S200.S.setGamma(1));
await tap('#ukc [data-u="show"]');
await w(6000);
await shot('3ukazat');
console.log('gamma po ukázce', await page.evaluate(() => S200.S.gamma));
await page.evaluate(() => S200.S.setGamma(1));
await w(1200);
console.log('gamma po pokusu zapnout', await page.evaluate(() => S200.S.gamma));
if (which !== 'desk') {
  // tah doleva po kartě
  const b = await page.locator('#ukc h3').boundingBox();
  const cdp = await ctx.newCDPSession(page);
  const P = (x) => [{ x, y: b.y + 8 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: P(b.x + 260) });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: P(b.x + 120) });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
} else await tap('#ukc [data-u="next"]');
await w(6000);
await shot('4dalsi');
console.log('po tahu', JSON.stringify(await page.evaluate(() => S200.uk.state())));
await tap('#ukc [data-u="next"]');
await tap('#ukc [data-u="next"]');
await tap('#ukc [data-u="next"]');
await w(6000);
await shot('5_2135');
if (which === 'phone') {
  await tap('#ukc .uk-more summary');
  await w(500);
  await shot('6pribeh');
}
await tap('#ukc [data-u="back"]');
await w(3000);
await shot('7zpet');
console.log(
  'gamma po návratu',
  await page.evaluate(() => S200.S.gamma),
  JSON.stringify(await page.evaluate(() => S200.uk.state()))
);
console.log(errs.join('\n') || 'bez chyb');
await browser.close();
srv.close();
