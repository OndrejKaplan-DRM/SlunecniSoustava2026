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
const errs = [];
const U = `http://localhost:${srv.address().port}/?trida=usporna`;
const L = (...a) => console.log(...a);
let p = await b.newPage({ viewport: { width: 1600, height: 820 } });
p.on('pageerror', (e) => errs.push(e.message));
await p.goto(U);
await p.waitForFunction(() => window.S200);
await p.evaluate(() => localStorage.clear());
await p.reload();
await p.waitForFunction(() => window.S200);
await p.waitForTimeout(2500);
await p.screenshot({ path: '/tmp/w_sp1.jpg', type: 'jpeg', quality: 80 });
await p.click('#sp-kid');
await p.waitForTimeout(400);
L(
  'úvod po kliknutí na Dětské: třída kid na body =',
  await p.evaluate(() => document.body.classList.contains('kid')),
  '· označeno =',
  await p.evaluate(() => document.querySelector('#sp-kid').classList.contains('sel')),
  '· konzole vidět =',
  await p.evaluate(() => document.querySelector('#sp-con').clientHeight > 0)
);
await p.screenshot({ path: '/tmp/w_sp2.jpg', type: 'jpeg', quality: 80 });
await p.click('#sp-go');
await p.waitForFunction(() => !document.querySelector('#splash.on'), null, { timeout: 90000 });
L('po startu kid =', await p.evaluate(() => document.body.classList.contains('kid') && S200.S.kid));
// dětské: měsíce, kino, stroj času, kružnice
for (const id of ['jupiter', 'saturn', 'uranus', 'neptune', 'mars', 'pluto']) {
  await p.evaluate((id) => S200.S.jump(S200.sim.idx.get(id)), id);
  await p.waitForTimeout(500);
  L(
    ' děti lišta',
    id,
    await p.evaluate(() =>
      [...document.querySelectorAll('#sub .it span')].map((x) => x.textContent.replace(' ✓', '')).join(', ')
    )
  );
}
await p.click('[data-a="more"]').catch(() => {});
await p.waitForTimeout(300);
L(
  'děti ☰: kino vidět =',
  await p.evaluate(() => !!document.querySelector('#more [data-a="cine"]')?.clientWidth),
  '· stroj času vidět =',
  await p.evaluate(() => [...document.querySelectorAll('[data-a="tm"]')].some((x) => x.clientWidth > 0)),
  '· položka:',
  await p.evaluate(() => document.querySelector('#b-view').textContent)
);
await p.screenshot({ path: '/tmp/w_more.jpg', type: 'jpeg', quality: 80 });
await p.keyboard.press('Escape');
await p.evaluate(() => S200.S.flyTo(S200.sim.idx.get('mars')));
await p.waitForFunction(() => !S200.S.flying(), null, { timeout: 60000 });
await p.waitForTimeout(150);
await p.screenshot({ path: '/tmp/w_ring.jpg', type: 'jpeg', quality: 80 });
await p.evaluate(() => {
  S200.S.jump(S200.sim.SUN);
});
await p.waitForTimeout(800);
L('Slunce poznámka:', await p.evaluate(() => (document.querySelector('.sunw') || {}).textContent?.slice(0, 60)));
// seznam – ikony
await p.evaluate(() => S200.ui.toggle('#list', true));
await p.waitForTimeout(500);
await p.evaluate(() => document.querySelector('[data-a="list"]')?.click());
await p.waitForTimeout(600);
await p.screenshot({
  path: '/tmp/w_list.jpg',
  type: 'jpeg',
  quality: 92,
  clip: { x: 0, y: 60, width: 300, height: 520 },
});
await p.close();
// dospělé: volná rotace, pól, superkarta, úkaz
p = await b.newPage({ viewport: { width: 1600, height: 820 } });
p.on('pageerror', (e) => errs.push(e.message));
await p.goto(U);
await p.waitForFunction(() => window.S200);
await p.evaluate(() => {
  document.querySelector('#sp-adult').click();
  document.querySelector('#sp-go').click();
});
await p.waitForFunction(() => !document.querySelector('#splash.on'), null, { timeout: 90000 });
L('dospělé po startu kid =', await p.evaluate(() => document.body.classList.contains('kid')));
await p.evaluate(() => {
  S200.S.jump(S200.sim.SUN);
  S200.S.cam.alt = S200.S.cam.altT = 6e9;
  S200.S.orbMode = 2;
});
await p.waitForTimeout(2500);
const pit = [];
for (let k = 0; k < 14; k++) {
  await p.mouse.move(700, 300);
  await p.mouse.down();
  await p.mouse.move(700, 300 + 140, { steps: 4 });
  await p.mouse.up();
  await p.waitForTimeout(250);
  const s = await p.evaluate(() => [+(S200.S.cam.pitch * 57.3).toFixed(0), +S200.S.poleFx.toFixed(2)]);
  pit.push(s.join('/'));
  if (s[1] > 0.5) await p.screenshot({ path: '/tmp/w_pole.jpg', type: 'jpeg', quality: 80 });
  if (Math.abs(s[0]) > 120 && !fs.existsSync('/tmp/w_over.jpg'))
    await p.screenshot({ path: '/tmp/w_over.jpg', type: 'jpeg', quality: 80 });
}
L('dospělé tažení nahoru, sklon/efekt:', pit.join(' '));
await p.evaluate(() => {
  S200.S.cam.pitch = 0.4;
  S200.S.jump(S200.sim.idx.get('mars'));
});
await p.waitForTimeout(1500);
await p.evaluate(() => S200.sk.open(S200.sim.idx.get('mars')));
await p.waitForTimeout(300);
const o1 = await p.evaluate(() => document.querySelector('#sk').classList.contains('on'));
await p.mouse.click(700, 420);
await p.waitForTimeout(400); // uvnitř karty
const o2 = await p.evaluate(() => document.querySelector('#sk').classList.contains('on'));
await p.mouse.click(60, 500);
await p.waitForTimeout(400);
L(
  'Superkarta: otevřena',
  o1,
  '· po kliknutí dovnitř',
  o2,
  '· po kliknutí mimo',
  await p.evaluate(() => document.querySelector('#sk').classList.contains('on'))
);
const id = await p.evaluate(() => S200.uk.ids()[0]);
await p.evaluate((id) => S200.uk.card(id), id);
await p.waitForTimeout(600);
const u1 = await p.evaluate(() => document.querySelector('#ukc').className);
await p.evaluate(() => S200.S.bus.emit('tap', 3));
await p.waitForTimeout(300);
L('karta úkazu:', u1, '→ po kliknutí na těleso:', await p.evaluate(() => document.querySelector('#ukc').className));
L('chyby', errs.length, errs.slice(0, 3));
await b.close();
srv.close();
