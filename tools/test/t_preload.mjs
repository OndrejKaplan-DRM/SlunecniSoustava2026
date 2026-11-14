/* Přednačtení: lišta necouvá a skončí na 100; po dokončení nesmí první návštěva těles z dolní lišty přeložit žádný nový shader ani čekat na mapu. */
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import http from 'http';
import fs from 'fs';
import path from 'path';
const srv = http
  .createServer((q, r) => {
    const f = path.join('dist', decodeURIComponent(q.url.split('?')[0] === '/' ? '/index.html' : q.url.split('?')[0]));
    fs.readFile(f, (e, d) => (e ? (r.writeHead(404), r.end()) : (r.writeHead(200), r.end(d))));
  })
  .listen(0);
const out = process.argv[2] || '/tmp/pre';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 300)));
const t0 = Date.now();
await page.goto(`http://localhost:${srv.address().port}/`);
await page.waitForFunction(() => window.S200, null, { timeout: 20000 });
await page.waitForTimeout(300);
await page.screenshot({ path: out + '/uvod_nacitani.jpg', type: 'jpeg', quality: 85 });
await page.waitForFunction(() => window.S200.ui.preload.ready, null, { timeout: 60000 });
const tReady = Date.now() - t0;
await page.waitForTimeout(500);
await page.screenshot({ path: out + '/uvod_pripraveno.jpg', type: 'jpeg', quality: 85 });
const log = await page.evaluate(() => window.S200.ui.preload.log);
let mono = true;
for (let i = 1; i < log.length; i++) if (log[i] < log[i - 1]) mono = false;
/* pozdní úloha nesmí lištou pohnout */
const late = await page.evaluate(() => {
  const P = window.S200.ui.preload;
  const r = P.add('pozdni', 50, () => new Promise((ok) => setTimeout(ok, 200)));
  return [r, P.pct];
});
await page.click('#sp-go');
await page.waitForFunction(() => !document.querySelector('#splash.on'), null, { timeout: 15000 });
const res = await page.evaluate(async () => {
  const { S, sim } = window.S200,
    out = [];
  const p0 = S.progs();
  for (const id of ['sun', 'moon', 'mars', 'saturn', 'jupiter', 'halley', 'pluto', 'venus']) {
    const i = sim.idx.get(id),
      tex = S.R[i].tex,
      a = S.progs();
    S.jump(i);
    await new Promise((r) => setTimeout(r, 1800));
    out.push({ id, texPriKliku: tex, noveProgramy: S.progs() - a });
  }
  return { p0, p1: S.progs(), out };
});
const ok =
  mono && log[log.length - 1] === 100 && late[0] === false && late[1] === 100 && res.out.every((o) => o.texPriKliku === 2 && o.noveProgramy === 0);
console.log(JSON.stringify({ ok, tReady, kroku: log.length, mono, konec: log[log.length - 1], pozdni: late, ...res }, null, 1));
console.log(errs.slice(0, 8).join('\n') || 'bez chyb');
await browser.close();
srv.close();
process.exit(ok ? 0 : 1);
