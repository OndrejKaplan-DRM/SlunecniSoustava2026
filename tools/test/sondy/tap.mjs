import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import http from 'http';
import fs from 'fs';
import path from 'path';
const srv = http
  .createServer((q, r) => {
    const u = q.url.split('?')[0];
    const f = path.join('dist', u === '/' ? '/index.html' : u);
    fs.readFile(f, (e, d) => {
      if (e) {
        r.writeHead(404);
        r.end();
      } else {
        r.writeHead(200, {
          'content-type':
            { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp' }[path.extname(f)] ||
            'application/octet-stream',
        });
        r.end(d);
      }
    });
  })
  .listen(0);
const b = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const p = await b.newPage({ viewport: { width: 1280, height: 760 } });
await p.goto(`http://localhost:${srv.address().port}/?trida=usporna`);
await p.waitForFunction(() => window.S200);
await p.evaluate(() => {
  localStorage.clear();
  document.querySelector('#sp-adult').click();
  document.querySelector('#sp-go').click();
});
await p.waitForFunction(() => !document.querySelector('#splash.on'), null, { timeout: 40000 });
await p.evaluate(() => {
  S200.S.jump(S200.sim.idx.get('mars'));
  window.T = [];
  S200.S.bus.on('card', (i) => T.push(['card', i, document.querySelector('#sk').classList.contains('on')]));
  new MutationObserver(() =>
    T.push(['sk', document.querySelector('#sk').classList.contains('on'), Math.round(performance.now())])
  ).observe(document.querySelector('#sk'), { attributes: true });
  addEventListener('pointerdown', (e) => T.push(['pd', Math.round(performance.now())]), true);
  S200.S.bus.on('tap', (i) => T.push([i, Math.round(performance.now())]));
});
await p.waitForTimeout(3000);
const R = await p.evaluate(() => {
  const r = S200.S.R[S200.S.focus];
  return [r.sx, r.sy, document.elementFromPoint(r.sx, r.sy).id];
});
console.log(R);
for (let k = 0; k < 5; k++) {
  await p.mouse.click(R[0], R[1]);
  await p.waitForTimeout(100);
}
await p.waitForTimeout(500);
console.log(
  await p.evaluate(() => JSON.stringify(T)),
  await p.evaluate(() => document.querySelector('#sk').classList.contains('on'))
);
await b.close();
srv.close();
