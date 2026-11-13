import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import http from 'http';
import fs from 'fs';
import path from 'path';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.avif': 'image/avif', '.webp': 'image/webp' };
const srv = http
  .createServer((q, r) => {
    const f = path.join('dist', q.url === '/' ? '/index.html' : q.url.split('?')[0]);
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
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
const errs = [];
page.on('console', (m) => {
  if (m.type() === 'error') errs.push(m.text().slice(0, 300));
});
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(`http://localhost:${srv.address().port}/`);
await page.waitForFunction(() => window.S200);
const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });
for (let runN = 0; runN < 2; runN++) {
  if (runN === 0) await page.click('#sp-tut');
  else await page.evaluate(() => S200.ui.tut.start());
  const t0 = Date.now(),
    log = [];
  let last = '',
    k = 0;
  while (Date.now() - t0 < 260000) {
    await page.waitForTimeout(700);
    const st = await page.evaluate(() => ({
      r: S200.ui.tut.running(),
      n: document.querySelector('#tut-n').textContent,
      t: document.querySelector('#tut-txt').textContent.slice(0, 50),
      kid: S200.ui.kid(),
    }));
    if (!st.r) break;
    if (st.n !== last) {
      last = st.n;
      log.push(`${((Date.now() - t0) / 1000).toFixed(0)}s ${st.n} ${st.kid ? 'K' : 'A'} ${st.t}`);
      if (runN === 0) {
        await page.waitForTimeout(2600);
        await page.screenshot({ path: `${out}/t${String(k++).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 70 });
      }
    }
  }
  console.log(`běh ${runN + 1}: ${((Date.now() - t0) / 1000).toFixed(0)} s\n` + log.join('\n'));
}
console.log(
  JSON.stringify(
    await page.evaluate(() => ({
      con: S200.S.conMode,
      st: S200.S.starNames,
      orb: S200.S.orbMode,
      rate: S200.S.rateIdx,
      kid: S200.ui.kid(),
      fps: S200.S.fps.toFixed(0),
    }))
  )
);
console.log([...new Set(errs)].filter((e) => !/GPU stall/.test(e)).join('\n') || 'bez chyb');
await browser.close();
srv.close();
