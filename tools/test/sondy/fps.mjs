import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import http from 'http';
import fs from 'fs';
import path from 'path';
const dir = process.argv[2] || 'dist';
const srv = http
  .createServer((q, r) => {
    const u = q.url.split('?')[0];
    const f = path.join(dir, u === '/' ? '/index.html' : u);
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
await p.waitForFunction(() => !document.querySelector('#splash.on'), null, { timeout: 90000 });
await p.evaluate(() => S200.S.jump(S200.sim.idx.get('mars')));
for (let k = 0; k < 4; k++) {
  await p.waitForTimeout(2000);
  console.log(
    await p.evaluate(() => [S200.S.fps, S200.S.poleFx, S200.S.quality, S200.S.cam.pitch.toFixed(2)].join(' '))
  );
  await p.evaluate(() => S200.S.rotate(30, 0));
}
await b.close();
srv.close();
