// iterace 7: lišta (Saturn, posuvník), zajímavosti, HUD, talíř, hudba podle místa, konfety
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import http from 'http';
import fs from 'fs';
import path from 'path';
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
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
const port = srv.address().port,
  out = process.argv[2] || '/tmp/it7';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--autoplay-policy=no-user-gesture-required',
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
const errs = [];
page.on('console', (m) => {
  if (m.type() === 'error') errs.push(m.text().slice(0, 300));
});
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
await page.goto(`http://localhost:${port}/`);
await page.waitForFunction(() => window.S200, null, { timeout: 20000 });
const ev = (f, a) => page.evaluate(f, a),
  shot = (n) => page.screenshot({ path: `${out}/${n}.jpg`, type: 'jpeg', quality: 82 }),
  wait = (ms) => page.waitForTimeout(ms);
let fail = 0;
const ok = (name, c, info = '') => {
  console.log((c ? 'OK   ' : 'FAIL ') + name + (info ? ' · ' + info : ''));
  if (!c) fail++;
};
await ev(() => {
  localStorage.clear();
});
await page.reload();
await page.waitForFunction(() => window.S200);
await page.click('#sp-kid');
await page.click('#sp-go');
await wait(800);
// lišta
const d = await ev(() => {
  const q = (s) => document.querySelector(s),
    dk = q('#dock'),
    sat = [...dk.querySelectorAll('.it')].find((e) => e.title === 'Saturn'),
    jup = [...dk.querySelectorAll('.it')].find((e) => e.title === 'Jupiter');
  const r = (e) => e.getBoundingClientRect();
  return {
    sh: dk.scrollHeight,
    ch: dk.clientHeight,
    satLabel: r(sat.querySelector('span')).top,
    jupLabel: r(jup.querySelector('span')).top,
    satIc: r(sat.querySelector('.ic')),
    jupIc: r(jup.querySelector('.ic')),
  };
});
ok('lišta bez svislého posuvu', d.sh <= d.ch + 1, `${d.sh}/${d.ch}`);
ok(
  'Saturn: popisek ve stejné výšce jako Jupiter',
  Math.abs(d.satLabel - d.jupLabel) < 1.5,
  `${d.satLabel.toFixed(1)} vs ${d.jupLabel.toFixed(1)}`
);
ok(
  'Saturn: střed ikony jako Jupiter',
  Math.abs(d.satIc.top + d.satIc.height / 2 - (d.jupIc.top + d.jupIc.height / 2)) < 2
);
// let k Marsu → karta, zajímavosti, HUD
await ev(() => S200.S.jump(S200.sim.idx.get('mars')));
await wait(900);
await ev(() => S200.S.select(S200.sim.idx.get('mars')));
await wait(300);
await page.click('#card .ib');
await wait(400);
const c = await ev(() => ({
  facts: [...document.querySelectorAll('#card .facts li')].map((e) => e.textContent),
  tiles: [...document.querySelectorAll('#card .tiles p')].map((e) => e.textContent),
  hud: document.querySelector('#alt').innerText,
}));
ok('zajímavosti Marsu', c.facts.length >= 8 && /ďáblové/.test(c.facts[0]), c.facts.length + ' položek');
console.log('   ' + c.facts.slice(-4).join('\n   '));
console.log('   dlaždice: ' + c.tiles.join(' | '));
console.log('   HUD: ' + c.hud.replace(/\n/g, ' / '));
ok('HUD od Země', /od Země/.test(c.hud));
ok(
  'letadlem sem',
  c.tiles.some((t) => /bys sem letěl/.test(t))
);
await shot('1_mars_kid');
// malé těleso: skok v cm
for (const id of ['eros', 'phobos', 'sun', 'duende', 'saturn', 'halley']) {
  await ev((id) => {
    const i = S200.sim.idx.get(id);
    S200.S.jump(i);
    S200.S.select(i);
  }, id);
  await wait(500);
  const t = await ev(() => ({
    t: [...document.querySelectorAll('#card .tiles p')]
      .map((e) => e.textContent)
      .slice(0, 4)
      .join(' | '),
    f: [...document.querySelectorAll('#card .facts li')]
      .map((e) => e.textContent)
      .slice(-4)
      .join(' | '),
    hud: document.querySelector('#alt').innerText.replace(/\n/g, ' / '),
  }));
  console.log(`   ${id}: ${t.t}\n      fakta: ${t.f}\n      HUD: ${t.hud}`);
}
await ev(() => {
  const i = S200.sim.idx.get('saturn');
  S200.S.jump(i);
  S200.S.select(i);
});
await wait(700);
await shot('2_saturn_kid');
// dospělé
await ev(() => S200.ui.setMode(false));
await wait(400);
const ad = await ev(() => ({
  rows: [...document.querySelectorAll('#card tr')].map((e) => e.innerText.replace(/\s+/g, ' ')).join(' | '),
  hud: document.querySelector('#alt').innerText.replace(/\n/g, ' / '),
}));
console.log('   dospělé: ' + ad.rows + '\n   HUD: ' + ad.hud);
await shot('3_saturn_adult');
await ev(() => {
  const i = S200.sim.idx.get('phobos');
  S200.S.jump(i);
  S200.S.select(i);
});
await wait(500);
console.log(
  '   Phobos tíže: ' +
    (await ev(() =>
      [...document.querySelectorAll('#card tr')]
        .map((e) => e.innerText.replace(/\s+/g, ' '))
        .find((t) => /Tíže/.test(t))
    ))
);
// talíř
await ev(() => S200.ui.setMode(true));
await ev(() => S200.ui.act('dev'));
await wait(200);
await page.click('#dev [data-d="ufo"]');
await wait(4200);
await shot('4_talir');
ok(
  'talíř letí a má text',
  await ev(
    () =>
      document.querySelector('#ufo').classList.contains('fly') &&
      /světlo/.test(document.querySelector('#ufo p').textContent)
  ),
  await ev(() => document.querySelector('#ufo p').textContent)
);
ok('talíř nejde chytit', await ev(() => getComputedStyle(document.querySelector('#ufo')).pointerEvents === 'none'));
// hudba
const mu = () => ev(() => S200.A.mu());
ok('hudba v dětském režimu zapnutá', await ev(() => S200.A.music));
await ev(() => S200.S.jump(S200.sim.idx.get('mars')));
await wait(3500);
let m = await mu();
ok('na pozadí něco hraje', !!m.slot && m.t > 0.3 && !m.bad, JSON.stringify(m));
await ev(() => S200.S.jump(S200.sim.idx.get('oumuamua')));
await wait(3000);
m = await mu();
ok('ʻOumuamua → mezihvezdni', m.slot === 'mezihvezdni', JSON.stringify(m));
await ev(() => S200.S.jump(S200.sim.idx.get('europa')));
await wait(3000);
m = await mu();
ok('Europa → ocean', m.slot === 'ocean' && m.t > 0.2, JSON.stringify(m));
await ev(() => S200.S.jump(S200.sim.idx.get('sun')));
await wait(7500);
m = await mu();
ok('Slunce (po 5 s) → slunce', m.slot === 'slunce', JSON.stringify(m));
await ev(() => S200.ui.act('music'));
await wait(1200);
m = await mu();
ok('hudba vypnuta → ticho', !m.slot, JSON.stringify(m));
await ev(() => S200.S.jump(S200.sim.idx.get('sedna')));
await wait(2500);
m = await mu();
ok('téma hraje i bez hudby: Sedna → daleko', m.slot === 'daleko', JSON.stringify(m));
await ev(() => S200.S.jump(S200.sim.idx.get('iapetus')));
await wait(5000);
m = await mu();
ok('Iapetus: syntetické téma, skladba ztichla', !m.slot && m.paused.every((x) => x), JSON.stringify(m));
// konfety: objev = žádné konfety
const parts = await ev(() => {
  let n = 0;
  const o = S200.ui.X.burst;
  S200.ui.X.burst = (k) => {
    if (k) n++;
    o(k);
  };
  const G = S200.ui.G();
  for (const id of ['vesta', 'pallas', 'juno', 'eros', 'ida']) {
    delete G.seen[id];
    S200.S.on.visit(S200.sim.idx.get(id));
  }
  return n;
});
ok('pět objevů bez konfet', parts === 0, 'konfety ' + parts + '×');
console.log([...new Set(errs)].slice(0, 12).join('\n') || 'bez chyb stránky');
ok('bez chyb stránky', errs.length === 0);
await browser.close();
srv.close();
console.log(fail ? `SELHALO ${fail}` : 'VŠE OK');
process.exit(fail ? 1 : 0);
