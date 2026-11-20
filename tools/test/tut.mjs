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
/* 1.8a: tři běhy – 1. náhodný plán z úvodní obrazovky (dospělé), 2. vynucené všechny pokročilé kapitoly, 3. náhodný plán v dětském rozhraní */
let bad = 0;
const VSE = ['cmp', 'superkarta', 'ukazy', 'where', 'cine', 'search', 'small', 'game'];
for (let runN = 0; runN < 3; runN++) {
  if (runN === 0) {
    await page.click('#sp-tut');
    /* start je asynchronní (přednačtení na úvodu trvá v sandboxu 3–4 s) – počkat, až úvod zmizí a ukázka běží */
    await page.waitForFunction(() => !document.querySelector('#splash.on') && S200.ui.tut.running(), null, {
      timeout: 60000,
    });
  } else if (runN === 1) await page.evaluate((v) => void S200.ui.tut.start(v), VSE);
  else
    await page.evaluate(() => {
      S200.ui.setMode(true);
      void S200.ui.tut.start();
    });
  const t0 = Date.now(),
    log = [];
  let last = '',
    k = 0;
  while (Date.now() - t0 < 480000) {
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
      if (runN < 2 || process.env.SHOT3) {
        await page.waitForTimeout(runN === 0 ? 2600 : 3400);
        await page.screenshot({
          path: `${out}/t${runN}_${String(k++).padStart(2, '0')}.jpg`,
          type: 'jpeg',
          quality: 70,
        });
      }
    }
  }
  console.log(`běh ${runN + 1}: ${((Date.now() - t0) / 1000).toFixed(0)} s\n` + log.join('\n'));
  /* doběhla ukázka až na poslední krok a uklidila po sobě? */
  const fin = await page.evaluate(() => ({
    n: document.querySelector('#tut-n').textContent,
    log: S200.ui.tut.log,
    pops: ['#help', '#gamebox', '#list', '#album', '#tm', '#cmp', '#more', '#uk', '#sk', '#ukc'].filter((q) =>
      document.querySelector(q).classList.contains('on')
    ),
    cine: document.body.classList.contains('cine'),
    sun: S200.S.sunMode,
    gamma: S200.S.gamma,
    paused: S200.S.paused,
    kid: S200.ui.kid(),
    oor: Math.abs(S200.S.jd - (Date.now() / 86400000 + 2440587.5)) > 2,
  }));
  const [a, b] = fin.n.split('/').map(Number);
  const chk = (c, t) => {
    if (!c) {
      bad++;
      console.log('FAIL běh ' + (runN + 1) + ': ' + t + ' ' + JSON.stringify(fin));
    }
  };
  chk(a === b && b > 3, 'ukázka nedoběhla do konce');
  chk(!fin.pops.length && !fin.cine, 'po ukázce zůstalo otevřené okno nebo kino');
  chk(
    fin.sun === 0 && fin.gamma < 0.01 && !fin.paused,
    'po ukázce zůstal filtr Slunce, přisvětlení nebo zastavený čas'
  );
  chk(!fin.oor, 'po ukázce nezůstal dnešní čas');
  chk(fin.kid === (runN === 2), 'po ukázce jiné rozhraní než před ní');
  console.log('kapitoly: ' + fin.log.join(' '));
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
const ee = [...new Set(errs)].filter((e) => !/GPU stall/.test(e));
console.log(ee.join('\n') || (bad ? '' : 'bez chyb'));
if (bad || ee.length) process.exitCode = 1;
await browser.close();
srv.close();
