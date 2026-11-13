// Velké mapy (maps/hi): přílet, načtení, prolnutí, LRU, telefon. Použití: node tools/test/t_hi.mjs <složka>
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import http from 'http';
import fs from 'fs';
import path from 'path';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp' };
const srv = http
  .createServer((q, r) => {
    const u = q.url.split('?')[0],
      f = path.join('dist', u === '/' ? '/index.html' : u);
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
const out = process.argv[2] || '/tmp/hi';
fs.mkdirSync(out, { recursive: true });
let ok = 0,
  bad = 0;
const T = (n, c, x = '') => {
  c ? ok++ : bad++;
  console.log((c ? 'OK  ' : 'FAIL') + ' ' + n + ' ' + x);
};
async function open(q = '') {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/GPU stall/.test(m.text())) errs.push(m.text().slice(0, 200));
  });
  await page.goto(`http://localhost:${srv.address().port}/${q}`);
  await page.waitForFunction(() => window.S200);
  await page.evaluate(() => {
    document.querySelector('#sp-go').click();
    S200.S.quality = 2;
  });
  await page.waitForTimeout(1500);
  return { page, errs };
}
const fly = (page, id, alt) =>
  page.evaluate(
    async ([id, alt]) => {
      const S = S200.S,
        j = S200.sim.idx.get(id),
        t0 = performance.now();
      S.flyTo(j, alt ? { alt: alt * S200.sim.B[j].R } : {});
      await new Promise((r) => {
        const h = setInterval(() => {
          if (!S.flying() && S.focus === j) {
            clearInterval(h);
            r();
          }
        }, 50);
      });
      return Math.round(performance.now() - t0);
    },
    [id, alt]
  );
const hiState = (page) =>
  page.evaluate(() =>
    S200.sim.B.map((b, i) => [b.id, S200.S.R[i].hi, S200.S.R[i].U && S200.S.R[i].U.uHi.value]).filter((x) => x[1])
  );
const IDS = (process.argv[3] || 'mars,moon,europa').split(',');
for (const mode of process.env.ONLY ? [process.env.ONLY] : ['bez', 's']) {
  const { page, errs } = await open();
  if (mode === 'bez')
    await page.evaluate(() => {
      S200.S.hiOff = true;
    });
  for (const id of IDS) {
    const tA = await fly(page, id);
    const pr0 = await page.evaluate((id) => S200.S.R[S200.sim.idx.get(id)].pr, id);
    const tB = await fly(page, id, 1.2);
    await page.evaluate(() => {
      S200.S.quality = 2;
    });
    if (mode === 's')
      await page
        .waitForFunction(
          (id) => {
            const r = S200.S.R[S200.sim.idx.get(id)];
            return (r.hi === 2 && r.U.uHi.value >= 1) || r.hi === -1;
          },
          id,
          { timeout: 60000 }
        )
        .catch(() => {});
    await page.waitForTimeout(1200);
    const st = await page.evaluate((id) => {
      const r = S200.S.R[S200.sim.idx.get(id)];
      return { pr: Math.round(r.pr), hi: r.hi || 0, fps: Math.round(S200.S.fps), q: S200.S.quality };
    }, id);
    await page.screenshot({ path: `${out}/${id}_${mode}.png` });
    console.log(
      `${mode} ${id}: přílet ${tA} ms (poloměr ${Math.round(pr0)} px), přiblížení ${tB} ms`,
      JSON.stringify(st)
    );
    if (mode === 's') T(`${id} velká mapa načtena`, st.hi === 2);
    else T(`${id} bez velké mapy`, st.hi === 0);
  }
  if (mode === 's') {
    const hs = await hiState(page);
    T('v paměti nejvýš 2 velké mapy', hs.filter((x) => x[1] === 2).length <= 2, JSON.stringify(hs));
    console.log('časy', JSON.stringify(await page.evaluate(() => S200.S.hiLog)));
  }
  T(`bez chyb (${mode})`, errs.length === 0, errs.join(' | '));
  await page.close();
}
{
  const { page, errs } = await open('?view=mob');
  await fly(page, 'mars');
  await fly(page, 'mars', 1.2);
  await page.waitForTimeout(2500);
  const hs = await hiState(page);
  T(
    'telefon: velká mapa se nenačítá',
    hs.length === 0,
    JSON.stringify(hs) + ' ' + (await page.evaluate(() => document.body.className))
  );
  T('bez chyb (telefon)', errs.length === 0, errs.join('|'));
}
console.log(`${ok}/${ok + bad}`);
await browser.close();
srv.close();
