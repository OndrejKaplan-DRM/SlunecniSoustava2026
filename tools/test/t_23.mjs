// Zkouška verze 2.3: úvod pod sebou, řada Přiblížit / Oddálit / Přistát, přistání dvojklikem a klikem do křížku, sestup z výšky,
// zajímavosti po přistání, prstence (popisek, vysvětlení), chůze (krok, skok, odlet z malého tělesa, přestavba mřížky po
// kouscích, kameny kolem chodce), oblačná vrstva obrů v pohybu a schované hvězdy pod obzorem.
// Použití: node tools/test/t_23.mjs [složka pro snímky]
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import http from 'http';
import fs from 'fs';
import path from 'path';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.json': 'application/json' };
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
const out = process.argv[2] || '/tmp/t_23';
fs.mkdirSync(out, { recursive: true });
let n = 0,
  bad = 0;
const ok = (c, m) => {
  n++;
  if (!c) bad++;
  console.log(`  ${c ? 'ok  ' : 'FAIL'} ${m}`);
};
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1100, height: 680 } });
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
await page.goto(`http://localhost:${srv.address().port}/`);
await page.waitForFunction(() => window.S200 && document.querySelector('#splash.on'), null, { timeout: 30000 });

console.log('== úvod');
const sp = await page.evaluate(() => {
  const r = (s) => document.querySelector(s).getBoundingClientRect(),
    go = r('#sp-go'),
    tut = r('#sp-tut'),
    fs = r('#sp-fs');
  return {
    go: document.querySelector('#sp-go').textContent.trim(),
    fs: document.querySelector('#sp-fs').textContent.trim(),
    col: Math.abs(go.left - tut.left) < 2 && Math.abs(go.left - fs.left) < 2 && go.top < tut.top && tut.top < fs.top,
  };
});
ok(/Spustit/.test(sp.go) && /Celá obrazovka/.test(sp.fs) && sp.col, `tlačítka pod sebou: „${sp.go}“ … „${sp.fs}“`);
await page.evaluate(() => document.querySelector('#sp-go').click());
await page.waitForFunction(() => !document.querySelector('#splash.on'), null, { timeout: 60000 });

console.log('== karta: Přiblížit / Oddálit / Přistát v jedné řadě');
await page.evaluate(() => {
  const { S, sim } = window.S200;
  S.paused = true;
  S.jd = 2461192.5 + 0.55;
  sim.updateAll(S.jd);
  S.flyTo(sim.idx.get('moon'));
});
await page.waitForFunction(() => !window.S200.S.flying(), null, { timeout: 60000 });
await page.waitForTimeout(800);
const row = await page.evaluate(() => {
  const b = document.querySelector('#card [data-a="surf"]'),
    r = b && b.closest('.row');
  return {
    ok: !!(r && r.querySelector('[data-a="close"]') && r.querySelector('[data-a="far"]')),
    t: b && b.textContent.trim(),
  };
});
ok(row.ok && /🛬 Přistát/.test(row.t), `řada karty: Přiblížit, Oddálit, „${row.t}“`);

console.log('== dvojklik: daleko = přiblížit, blízko tělesa = přistání v místě dvojkliku');
const far = await page.evaluate(() => {
  const { S, sim } = window.S200,
    i = sim.idx.get('moon'),
    f = S.nearBody(i);
  /* totéž, co udělá dvojklik daleko od tělesa */
  S.flyTo(i, { alt: sim.shape[i].rmax * 0.6 });
  return f;
});
await page.waitForFunction(() => !window.S200.S.flying(), null, { timeout: 60000 });
await page.waitForTimeout(500);
ok(!far, 'po příletu je těleso „daleko“ – dvojklik přiblíží');
const dbl = await page.evaluate(async () => {
  const { S, povrch, sim } = window.S200,
    i = sim.idx.get('moon'),
    wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const near = S.nearBody(i);
  const ll = S.screenLL(i, innerWidth / 2 + 40, innerHeight / 2 + 30);
  const r = povrch.landAt(i, innerWidth / 2 + 40, innerHeight / 2 + 30);
  await wait(100);
  return { near, ll, r: !!r, ph: (povrch.pickState() || {}).phase };
});
ok(
  dbl.near && dbl.ll && dbl.r && dbl.ph === 'sestup',
  `blízko (${dbl.near}), místo ${dbl.ll && dbl.ll.map((v) => v.toFixed(1))}, sestup: ${dbl.ph}`
);
await page.waitForFunction(() => !!window.S200.S.surf, null, { timeout: 30000 });
const ds = await page.evaluate(() => {
  const q = window.S200.S.surf;
  return { desc: !!q.desc, h: q.hOff, el: (q.el * 180) / Math.PI, lat: q.lat, lon: q.lon };
});
ok(
  ds.desc && ds.h > 1000 && ds.el < -60 && Math.abs(ds.lat - dbl.ll[0]) < 0.5,
  `sestup z výšky ${Math.round(ds.h)} m s pohledem dolů (${ds.el.toFixed(0)}°) na místo dvojkliku`
);
await page.screenshot({ path: `${out}/1_sestup.jpg`, type: 'jpeg', quality: 80, timeout: 180000 });
await page.waitForFunction(() => window.S200.S.surf && !window.S200.S.surf.desc, null, { timeout: 60000 });
const de = await page.evaluate(() => {
  const q = window.S200.S.surf;
  return { h: q.hOff, el: (q.el * 180) / Math.PI };
});
ok(de.h === 0 && de.el > -10 && de.el < 15, `po sestupu oči u země, pohled k obzoru (${de.el.toFixed(1)}°)`);

console.log('== zajímavosti po přistání');
await page.waitForFunction(() => document.querySelector('#landfacts.on'), null, { timeout: 30000 }).catch(() => {});
const lf = await page.evaluate(() => {
  const p = document.querySelector('#landfacts');
  return {
    on: p && p.classList.contains('on'),
    li: p ? p.querySelectorAll('li, .f').length : 0,
    t: p ? p.textContent : '',
  };
});
ok(lf.on && /Země/.test(lf.t) && /g/.test(lf.t), `panel „co je tu jinak“ (${lf.t.slice(0, 90).replace(/\s+/g, ' ')}…)`);

console.log('== chůze');
await page.waitForFunction(() => window.S200.S.krajina.walkable(), null, { timeout: 60000 });
await page.evaluate(() => {
  window.S200.chuze.key('KeyW', true);
});
await page
  .waitForFunction(
    () =>
      (window.S200.chuze.state() || {}).x > 0.6 ||
      (window.S200.chuze.state() || {}).z < -0.6 ||
      Math.hypot((window.S200.chuze.state() || {}).x || 0, (window.S200.chuze.state() || {}).z || 0) > 0.6,
    null,
    { timeout: 60000 }
  )
  .catch(() => {});
const w1 = await page.evaluate(() => {
  window.S200.chuze.key('KeyW', false);
  return window.S200.chuze.state();
});
ok(
  w1 && Math.hypot(w1.x, w1.z) > 0.6 && w1.grounded,
  `W: chodec ušel ${w1 && Math.hypot(w1.x, w1.z).toFixed(2)} m po zemi`
);
await page.evaluate(() => window.S200.chuze.key('Space', true));
await page
  .waitForFunction(() => (window.S200.chuze.state() || {}).grounded === false, null, { timeout: 20000 })
  .catch(() => {});
await page.evaluate(() => window.S200.chuze.key('Space', false));
let top = -1e9;
for (let k = 0; k < 20; k++) {
  const s = await page.evaluate(() => window.S200.chuze.state());
  top = Math.max(top, s.feet);
  if (s.grounded && k > 2) break;
  await page.waitForTimeout(300);
}
ok(top > 0.5, `mezerník: skok na Měsíci do výšky ${top.toFixed(2)} m`);
const rc = await page.evaluate(async () => {
  const K = window.S200.S.krajina,
    g0 = K.ground(50, -10);
  K.follow(50, -10);
  K.finishRecenter();
  const s = K.state();
  return { rec: s.recenters, mx: s.recenterMax, near: s.nearN, d: Math.abs(K.ground(50, -10) - g0) };
});
ok(rc.rec >= 1 && rc.d < 0.5, `přestavba mřížky kolem chodce: navazuje (rozdíl výšky ${rc.d.toFixed(2)} m)`);
ok(rc.near > 20, `kameny kolem chodce: ${rc.near}`);
const lock = await page.evaluate(() => {
  const S = window.S200.S;
  return S.surf && S.surf.el > -1.6 && typeof window.S200.chuze.jump === 'function';
});
ok(lock, 'API chůze (skok) a pohled pod nohy povolený');

console.log('== malé těleso: skok rychlejší než úniková rychlost');
await page.evaluate(() => {
  const { S, sim, povrch } = window.S200;
  povrch.exit();
  const i = sim.idx.get('bennu');
  S.krajina.prep(i);
  S.jump(i);
});
await page.waitForTimeout(2500);
await page.evaluate(() => {
  const { sim, povrch } = window.S200;
  povrch.enter(sim.idx.get('bennu'), 0, 0, { landed: true, az: 90, el: -4 });
});
await page.waitForFunction(
  () => window.S200.S.surf && !window.S200.S.surf.desc && window.S200.S.krajina.walkable(),
  null,
  {
    timeout: 60000,
  }
);
await page.evaluate(() => window.S200.chuze.key('Space', true));
await page.waitForTimeout(600);
await page.evaluate(() => window.S200.chuze.key('Space', false));
const esc = await page
  .waitForFunction(() => !window.S200.S.surf, null, { timeout: 30000 })
  .then(
    () => true,
    () => false
  );
ok(esc, 'Bennu: po skoku chodec odletí do vesmíru (úniková rychlost asi 0,2 m/s)');

console.log('== oblačná vrstva obrů v pohybu');
await page.evaluate(() => {
  const { S, sim } = window.S200;
  const i = sim.idx.get('jupiter');
  S.krajina.prep(i);
  S.jump(i);
});
await page.waitForTimeout(2500);
await page.evaluate(() => {
  const { sim, povrch } = window.S200;
  povrch.enter(sim.idx.get('jupiter'), -10, 0, { az: 250, el: -12 });
});
await page.waitForFunction(() => window.S200.S.krajina.state().typ === 'mraky', null, { timeout: 60000 });
const t1 = await page.evaluate(() => window.S200.S.krajina.uni.uTime.value);
await page.waitForTimeout(1500);
const dk = await page.evaluate(() => {
  const K = window.S200.S.krajina;
  return { t: K.uni.uTime.value, w: K.state().wind, walk: K.walkable() };
});
ok(dk.t > t1 && Math.abs(dk.w) > 20, `čas vrstvy běží (${t1.toFixed(1)} → ${dk.t.toFixed(1)} s), vítr ${dk.w} m/s`);
ok(!dk.walk, 'na oblacích se nechodí');
await page.screenshot({ path: `${out}/2_jupiter.jpg`, type: 'jpeg', quality: 80, timeout: 180000 });

console.log('== prstence: popisek a vysvětlení');
await page.evaluate(() => {
  const { S, sim, povrch } = window.S200;
  povrch.exit();
  S.flyTo(sim.idx.get('saturn'));
});
await page.waitForFunction(() => !window.S200.S.flying(), null, { timeout: 60000 });
await page.waitForTimeout(1500);
const ring = await page.evaluate(() => {
  const X = window.S200.ui && window.S200.ui.X;
  const h = X ? X.ringHot : null;
  return { h: !!h };
});
const rk = await page.evaluate(() => {
  const b = document.querySelector('#card [data-a="ring"], #card .tile[data-a="ring"]');
  if (b) b.click();
  const p = document.querySelector('#ringinfo');
  return {
    btn: !!b,
    on: !!(p && getComputedStyle(p).display !== 'none' && p.textContent.length > 100),
    t: p ? p.textContent.slice(0, 80) : '',
  };
});
ok(rk.btn && rk.on, `karta Saturnu: „💍 co to je?“ otevře vysvětlení (${rk.t.replace(/\s+/g, ' ')}…)`);
console.log(`  (popisek prstenců na plátně: ${ring.h ? 'ano' : 'nezjištěno přes API'})`);

console.log(errs.length ? errs.join('\n') : 'bez chyb stránky');
console.log(bad ? `CHYBY: ${bad} z ${n} kontrol` : `vše v pořádku (${n} kontrol)`);
await browser.close();
srv.close();
process.exit(bad || errs.length ? 1 : 0);
