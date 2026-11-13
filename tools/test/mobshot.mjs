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
const VP = { phone: [390, 844, 2], land: [844, 390, 2], tab: [820, 1180, 1.5], tabl: [1180, 820, 1.5] }[which];
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const ctx = await browser.newContext({
  viewport: { width: VP[0], height: VP[1] },
  deviceScaleFactor: VP[2],
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errs.push(m.text().slice(0, 200));
});
await page.goto(`http://localhost:${srv.address().port}/`);
await page.waitForFunction(() => window.S200);
const shot = (n) => page.screenshot({ path: `${out}/${which}_${n}.jpg`, type: 'jpeg', quality: 72 }),
  w = (ms) => page.waitForTimeout(ms);
console.log(which, 'třídy:', await page.evaluate(() => document.body.className));
await w(1500);
await shot('1splash');
await page.tap('#sp-go');
await w(3000);
await shot('2zeme');
await page.evaluate(() => S200.S.jump(S200.sim.idx.get('saturn')));
await w(3500);
await shot('3saturn_karta');
if (await page.locator('[data-mc="open"]').count()) {
  await page.tap('[data-mc="open"]');
  await w(700);
  await shot('4karta_rozbalena');
  await page.tap('[data-mc="open"]');
}
await w(9500);
await shot('5karta_zmizela');
console.log(
  'karta gone:',
  await page.evaluate(() => document.querySelector('#card').className),
  'ⓘ:',
  await page.evaluate(() => document.querySelector('#minfo').className)
);
await page.tap('#tools [data-a="more"]');
await w(700);
await shot('6nabidka');
await page.tap('#more [data-a="con"]');
await w(500);
await page.tap('#tools [data-a="mode"]');
await w(600);
await page.evaluate(() => S200.S.jump(S200.sim.idx.get('mars')));
await w(3500);
await shot('7detske_mars');
await page.tap('#tools [data-a="help"]');
await w(700);
await shot('8napoveda');
await page.tap('#help .x');
await w(300);
await page.evaluate(() => document.body.classList.add('zvuky'));
await page.tap('#zvb', { force: true });
await w(600);
await shot('9zkusebna');
await page.tap('#zv .x');
// dotyk na plátně: ťuknutí vybere, dvojí ťuknutí letí
const it = await page.evaluate(() => {
  const S = S200.S;
  S.jump(S200.sim.idx.get('jupiter'));
  return null;
});
await w(3000);
const tgt = await page.evaluate(() => {
  const S = S200.S;
  S.cam.alt = S.cam.altT = 1.2e6;
  return null;
});
await w(1500);
const tg2 = await page.evaluate(() => {
  const S = S200.S,
    t = S.items.filter(
      (x) =>
        x.i !== S.focus && x.pr < 11 && x.sx > 40 && x.sx < innerWidth - 40 && x.sy > 170 && x.sy < innerHeight - 260
    )[0];
  return t ? [t.sx, t.sy, S200.sim.B[t.i].id] : null;
});
console.log('cíl dotyku:', JSON.stringify(tg2));
if (tg2) {
  const tgt = tg2;
  await page.touchscreen.tap(tgt[0], tgt[1]);
  await w(400);
  console.log('ťuknutí → vybráno:', await page.evaluate(() => S200.sim.B[S200.S.sel].id));
  await page.touchscreen.tap(tgt[0], tgt[1]);
  await w(120);
  await page.touchscreen.tap(tgt[0], tgt[1]);
  await w(6000);
  console.log('dvojí ťuknutí → letí k:', await page.evaluate(() => S200.sim.B[S200.S.focus].id));
}
console.log([...new Set(errs)].join('\n') || 'bez chyb');
await browser.close();
srv.close();
