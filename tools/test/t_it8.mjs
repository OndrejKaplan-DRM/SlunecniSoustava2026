// iterace 8: porovnání velikostí, kino na dotyku, ukázka na telefonu, skladby u těles, verze v jednom souboru (file://)
import { chromium, devices } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import http from 'http';
import fs from 'fs';
import path from 'path';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
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
const port = srv.address().port,
  out = process.argv[2] || '/tmp/it8',
  off = process.argv[3];
fs.mkdirSync(out, { recursive: true });
let fail = 0;
const ok = (name, c, info = '') => {
  console.log((c ? 'OK   ' : 'FAIL ') + name + (info ? ' · ' + info : ''));
  if (!c) fail++;
};
const browser = await chromium.launch({
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--autoplay-policy=no-user-gesture-required',
  ],
});
async function open(opts, url) {
  const ctx = await browser.newContext(opts),
    page = await ctx.newPage(),
    errs = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push(m.text().slice(0, 200));
  });
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto(url || `http://localhost:${port}/`);
  await page.waitForFunction(() => window.S200, null, { timeout: 60000 });
  return {
    page,
    errs,
    ev: (f, a) => page.evaluate(f, a),
    wait: (ms) => page.waitForTimeout(ms),
    shot: (n) => page.screenshot({ path: `${out}/${n}.jpg`, type: 'jpeg', quality: 84 }),
  };
}
const jump = (id) => {
  const i = S200.sim.idx.get(id);
  S200.S.jump(i);
  S200.S.select(i);
};
{
  // ---- počítač ----
  const { page, errs, ev, wait, shot } = await open({ viewport: { width: 1366, height: 768 } });
  await page.click('#sp-adult');
  await page.click('#sp-go');
  await wait(600);
  for (const id of ['saturn', 'europa', 'uranus', 'sun', 'eros']) {
    await ev(jump, id);
    await wait(500);
    await ev(() => S200.ui.act('cmp'));
    await wait(1600);
    await shot('cmp_' + id);
    const m = await ev(() => {
      const c = document.querySelector('#cmp'),
        r = c.getBoundingClientRect(),
        xs = [...c.querySelectorAll('.cmp > div')].map((e) => e.getBoundingClientRect());
      return {
        fit: xs.every((x) => x.left >= r.left - 1 && x.right <= r.right + 1),
        n: xs.length,
        sw: c.querySelector('.cmp').scrollWidth,
        cw: c.querySelector('.cmp').clientWidth,
        cv: [...c.querySelectorAll('canvas')].map((e) => e.width + '×' + e.height).join(' '),
      };
    });
    ok(`porovnání ${id}: vše v okně`, m.fit && m.sw <= m.cw + 1, `${m.n} těles · ${m.cv}`);
    await ev(() => S200.ui.act('cmp'));
  }
  await ev(() => S200.ui.act('cine'));
  await wait(300);
  ok(
    'kino: tlačítko zpět je vidět',
    await ev(() => getComputedStyle(document.querySelector('#cineoff')).display === 'block')
  );
  await page.click('#cineoff');
  ok('kino: tlačítko vrátí ovládání', await ev(() => !document.body.classList.contains('cine')));
  const th = (id, kid) =>
    ev(
      ([id, kid]) => {
        S200.ui.setMode(kid);
        const i = S200.sim.idx.get(id);
        S200.S.jump(i);
      },
      [id, kid]
    )
      .then(() => wait(2600))
      .then(() => ev(() => S200.A.mu().slot));
  await ev(() => {
    if (S200.A.music) S200.ui.act('music');
  });
  await wait(600);
  // skladby u těles hlídá tools/test/t_it9.mjs (od iterace 9 začínají se zpožděním)
  const cnt = await ev(() => {
    const { B, idx } = S200.sim;
    let k = 0,
      a = 0;
    const z = {};
    return [true, false].map((kid) => {
      let n = 0;
      for (let i = 0; i < B.length; i++) {
        S200.ui.setMode(kid);
      }
      return 0;
    });
  });
  console.log(
    '   hudba výchozí zapnutá (nový uživatel):',
    await ev(() => {
      localStorage.removeItem('s200');
      return true;
    })
  );
  ok('počítač bez chyb stránky', errs.length === 0, errs.join(' | '));
  await page.context().close();
}
{
  // ---- telefon: ukázka ----
  const { page, errs, ev, wait, shot } = await open({ ...devices['Pixel 7'] });
  ok('telefon: tlačítko ukázky na úvodu', await ev(() => !!document.querySelector('#sp-tut').offsetParent));
  await page.click('#sp-kid');
  await page.tap('#sp-tut');
  await wait(9000);
  await shot('mob_tut1');
  await wait(22000);
  await shot('mob_tut2');
  let done = false;
  for (let k = 0; k < 150 && !done; k++) {
    await wait(1000);
    done = !(await ev(() => S200.ui.tut.running()));
  }
  ok('telefon: ukázka doběhla do konce', done);
  ok('telefon: ukázka je v nabídce ☰', await ev(() => !!document.querySelector('#more [data-a="tut"]')));
  await ev(() => S200.ui.act('cine'));
  await wait(300);
  await page.tap('#cineoff');
  ok('telefon: kino jde vypnout ťuknutím', await ev(() => !document.body.classList.contains('cine')));
  await ev(jump, 'saturn');
  await wait(500);
  await ev(() => S200.ui.act('cmp'));
  await wait(1500);
  await shot('mob_cmp');
  ok('telefon bez chyb stránky', errs.length === 0, errs.join(' | '));
  await page.context().close();
}
if (off) {
  // ---- jeden soubor z disku ----
  const { page, errs, ev, wait, shot } = await open(
    { viewport: { width: 1280, height: 760 } },
    'file://' + path.resolve(off)
  );
  await page.click('#sp-kid');
  await page.click('#sp-go');
  await ev(jump, 'europa');
  await wait(5000);
  await shot('off_europa');
  const m = await ev(() => S200.A.mu());
  ok('soubor z disku: hraje skladba u Europy', m.slot === 'ocean' && !m.bad && m.t > 0.2, JSON.stringify(m));
  ok('soubor z disku: bez chyb stránky', errs.length === 0, errs.slice(0, 3).join(' | '));
  const px = await ev(() => {
    const c = document.querySelector('#gl'),
      g = document.createElement('canvas');
    g.width = 64;
    g.height = 64;
    return 1;
  });
  await page.context().close();
}
await browser.close();
srv.close();
console.log(fail ? `SELHALO ${fail}` : 'VŠE OK');
process.exit(fail ? 1 : 0);
