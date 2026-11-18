// Průchod všemi kartami úkazů a Superkartou všech těles (verze 1.4).
// Hlídá: žádná chyba konzole, žádné NaN ani „undefined“ v textu, okénko má text, návrat pohledu vrátí čas,
// úkazy nejsou v dětském rozhraní, Superkarta je jen ve vývojářském režimu.
// Použití: node tools/test/t_karty.mjs [složka pro snímky]
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import http from 'http';
import fs from 'fs';
import path from 'path';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp' };
const srv = http
  .createServer((q, r) => {
    const u = q.url.split('?')[0],
      f = path.join('dist', decodeURIComponent(u === '/' ? '/index.html' : u));
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
  out = process.argv[2] || '/tmp/karty';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const bad = [];
const ok = (c, m) => {
  if (!c) bad.push(m);
};
async function boot(query) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  page.on('pageerror', (e) => bad.push('PAGEERROR ' + query + ' ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/GPU stall|404/.test(m.text())) bad.push('console ' + m.text().slice(0, 200));
  });
  await page.goto(`http://localhost:${port}/${query}`);
  await page.waitForFunction(() => window.S200, null, { timeout: 30000 });
  await page.evaluate(() => {
    localStorage.clear();
    document.querySelector('#sp-adult').click();
    document.querySelector('#sp-go').click();
  });
  await page.waitForFunction(() => !document.querySelector('#splash.on'), null, { timeout: 40000 });
  return page;
}
const BADTXT = /NaN|undefined|Infinity|\[object/;

// 1) běžný režim: karty úkazů
let page = await boot('');
const flags = await page.evaluate(() => S200.F.list());
ok(!(await page.evaluate(() => S200.F.dev)), 'vývojářský režim je zapnutý bez ?dev');
ok(flags.find((f) => f.k === 'ukazy').on, 'úkazy nejsou v dospělém rozhraní');
ok(flags.find((f) => f.k === 'superkarta').on, 'Superkarta není v dospělém rozhraní');
ok(!flags.find((f) => f.k === 'nacitani').on, 'technický výpis načítání je vidět bez ?dev');
const ids = await page.evaluate(() => S200.uk.ids());
let n = 0;
for (const id of ids) {
  const r = await page.evaluate(async (id) => {
    const S = S200.S,
      jd0 = S.jd;
    S200.uk.card(id);
    await new Promise((r) => setTimeout(r, 120));
    const c = document.querySelector('#ukc'),
      t1 = c.innerText;
    S200.uk.show();
    await new Promise((r) => setTimeout(r, 450));
    const t2 = c.innerText,
      sky = c.querySelector('.uk-sky'),
      moved = Math.abs(S.jd - jd0) > 0.5,
      st = S200.uk.state();
    S200.uk.back();
    await new Promise((r) => setTimeout(r, 120));
    return {
      on: c.classList.contains('on'),
      t1,
      t2,
      sky: !!sky,
      moved,
      back: st.back,
      ret: Math.abs(S.jd - jd0) < 1e-3,
      pos: [...S200.sim.P.slice(0, 30)].every(isFinite),
    };
  }, id);
  ok(r.on, id + ': karta se neotevřela');
  ok(r.t1.length > 120, id + ': karta je skoro prázdná');
  ok(!BADTXT.test(r.t1) && !BADTXT.test(r.t2), id + ': v textu je NaN/undefined');
  ok(r.back, id + ': ukázka se nespustila');
  ok(r.ret, id + ': návrat nevrátil čas');
  ok(r.pos, id + ': polohy těles nejsou konečná čísla');
  n++;
}
await page.screenshot({ path: `${out}/karta.jpg`, type: 'jpeg', quality: 80 });
// 2) dětské rozhraní: úkazy schované, otevřená karta se zavře
const kid = await page.evaluate(async () => {
  S200.uk.card(S200.uk.ids()[0]);
  S200.ui.setMode(true);
  await new Promise((r) => setTimeout(r, 300));
  const b = document.querySelector('[data-a="uk"]');
  S200.uk.card(S200.uk.ids()[1]);
  return {
    btn: getComputedStyle(b).display,
    card: document.querySelector('#ukc').classList.contains('on'),
    on: S200.F.on('ukazy'),
  };
});
ok(kid.btn === 'none', 'dětské: položka Úkazy je v nabídce vidět');
ok(!kid.card, 'dětské: karta úkazu zůstala otevřená');
ok(!kid.on, 'dětské: úkazy jsou zapnuté');
ok(!(await page.evaluate(() => S200.F.on('superkarta') || S200.sk.open(3))), 'dětské: Superkarta jde otevřít');
await page.close();

// 3) vývojářský režim: Superkarta všech těles
page = await boot('?dev');
ok(await page.evaluate(() => S200.F.dev && S200.F.on('nacitani')), '?dev nezapnul vývojářské funkce');
const sk = await page.evaluate(() => {
  const outp = [];
  for (let i = 0; i < S200.sim.B.length; i++) {
    let h = '';
    try {
      h = S200.sk.html(i);
    } catch (e) {
      outp.push(S200.sim.B[i].id + ': ' + e.message);
      continue;
    }
    const d = document.createElement('div');
    d.innerHTML = h;
    const t = d.innerText || d.textContent;
    if (/NaN|undefined|Infinity|\[object/.test(t))
      outp.push(S200.sim.B[i].id + ': ' + (t.match(/.{0,40}(NaN|undefined|Infinity|\[object).{0,20}/) || [''])[0]);
    if (t.length < 300) outp.push(S200.sim.B[i].id + ': krátká');
  }
  return outp;
});
for (const m of sk) bad.push('superkarta ' + m);
for (const id of ['earth', 'saturn', 'halley', 'titan']) {
  await page.evaluate((id) => {
    S200.S.jump(S200.sim.idx.get(id));
    S200.sk.open(S200.sim.idx.get(id));
    document.querySelectorAll('#sk details').forEach((d, k) => (d.open = k < 3));
  }, id);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/sk_${id}.jpg`, type: 'jpeg', quality: 82 });
}
// pětiklik na název v kartě
const five = await page.evaluate(async () => {
  S200.ui.toggle('#sk', false);
  S200.S.jump(S200.sim.idx.get('mars'));
  await new Promise((r) => setTimeout(r, 400));
  const h = document.querySelector('#card h2');
  for (let k = 0; k < 5; k++) h.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 200));
  return document.querySelector('#sk').classList.contains('on') && document.querySelector('#sk h3').textContent;
});
ok(five === 'Mars', 'pětiklik neotevřel Superkartu Marsu (' + five + ')');
// pětiklik na ikonu v dolní liště a na těleso ve scéně
const five2 = await page.evaluate(async () => {
  S200.ui.toggle('#sk', false);
  const b = document.querySelector('#dock .it[data-i="' + S200.sim.idx.get('saturn') + '"]');
  for (let k = 0; k < 5; k++) b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 200));
  const a = document.querySelector('#sk').classList.contains('on') && document.querySelector('#sk h3').textContent;
  S200.ui.toggle('#sk', false);
  for (let k = 0; k < 4; k++) S200.S.bus.emit('tap', S200.sim.EARTH);
  const mid = document.querySelector('#sk').classList.contains('on');
  S200.S.bus.emit('tap', S200.sim.EARTH);
  await new Promise((r) => setTimeout(r, 200));
  return [a, mid, document.querySelector('#sk h3').textContent];
});
ok(five2[0] === 'Saturn', 'pětiklik na ikonu neotevřel Superkartu Saturnu');
ok(!five2[1] && five2[2] === 'Země', 'pětiklik na těleso: ' + JSON.stringify(five2));
// skutečných pět kliknutí myší na těleso ve scéně
await page.evaluate(() => {
  S200.ui.toggle('#sk', false);
  S200.S.jump(S200.sim.idx.get('mars'));
});
await page.waitForTimeout(2500);
const pt = await page.evaluate(() => {
  const r = S200.S.R[S200.S.focus];
  return [r.sx, r.sy, document.elementFromPoint(r.sx, r.sy).id];
});
for (let k = 0; k < 5; k++) {
  await page.mouse.click(pt[0], pt[1]);
  await page.waitForTimeout(90);
}
await page.waitForTimeout(600);
const five3 = await page.evaluate(
  () => document.querySelector('#sk').classList.contains('on') && document.querySelector('#sk h3').textContent
);
ok(pt[2] === 'gl' && /Mars/.test(five3 || ''), 'pět kliknutí myší na těleso: ' + JSON.stringify([pt, five3]));
// ?dev=0 vypne
await page.close();
page = await browser.newPage();
await page.goto(`http://localhost:${port}/?dev`);
await page.waitForFunction(() => window.S200);
await page.goto(`http://localhost:${port}/`);
await page.waitForFunction(() => window.S200);
ok(await page.evaluate(() => S200.F.dev), 'vývojářský režim se nezapamatoval');
await page.goto(`http://localhost:${port}/?dev=0`);
await page.waitForFunction(() => window.S200);
ok(!(await page.evaluate(() => S200.F.dev)), '?dev=0 režim nevypnul');
console.log(`karty úkazů: ${n} z ${ids.length} · Superkarta: ${await page.evaluate(() => S200.sim.B.length)} těles`);
console.log(bad.length ? [...new Set(bad)].slice(0, 40).join('\n') : 'bez chyb');
await browser.close();
srv.close();
process.exit(bad.length ? 1 : 0);
