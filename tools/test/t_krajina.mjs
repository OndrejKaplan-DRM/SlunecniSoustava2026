// Zkouška krajiny a oblohy z povrchu (verze 2.2): režimy oblohy podle tělesa, stavba terénu, výškové mapy (Hadley Delta, Mount Sharp),
// přistání mimo moře, barvy oblohy z obrazu (den, západ, Mars, Měsíc), barva Slunce u obzoru, mizení hvězd ve dne a oslnění krajinou.
// Použití: node tools/test/t_krajina.mjs [složka pro snímky]
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import http from 'http';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
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
const out = process.argv[2] || '/tmp/t_krajina';
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
const page = await browser.newPage({ viewport: { width: 1000, height: 640 } });
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
await page.goto(`http://localhost:${srv.address().port}/`);
await page.waitForFunction(() => window.S200, null, { timeout: 30000 });
await page.evaluate(() => document.querySelector('#sp-go').click());
await page.waitForFunction(() => !document.querySelector('#splash.on'), null, { timeout: 60000 });
await page.addStyleTag({
  content:
    'body.refsnap .panel, body.refsnap #top, body.refsnap #tools, body.refsnap #dockwrap, body.refsnap #mini, body.refsnap #toast, body.refsnap #hud, body.refsnap #cardtab, body.refsnap #sunchip, body.refsnap #guide, body.refsnap #mission, body.refsnap #more, body.refsnap #surf, body.refsnap #ov { display: none !important; }',
});
/* postavit se na místo v čase, kdy je Slunce v zadané výšce (při západu klesá), a dívat se zadaným směrem */
async function go(id, lat, lon, sunEl, az, el, fov = 70, setting = false, opt = {}) {
  await page.evaluate(
    async ([id, lat, lon, sunEl, az, el, fov, setting, opt]) => {
      const { S, sim, povrch, misto } = window.S200,
        i = sim.idx.get(id),
        SUN = sim.SUN,
        D = Math.PI / 180;
      document.body.classList.add('refsnap');
      if (S.surf) povrch.exit();
      S.paused = true;
      let jd = 2461192.5;
      const sd = Math.abs(misto.solarDay(i) || 1),
        step = Math.min(sd / 96, 2);
      let e0 = misto.elevAt(i, lat, lon, SUN, jd) / D;
      for (let k = 0; k < 600; k++) {
        const t = jd + step,
          e1 = misto.elevAt(i, lat, lon, SUN, t) / D,
          hit = setting || sunEl < 0 ? e0 >= sunEl && e1 < sunEl : e0 < sunEl && e1 >= sunEl;
        if (hit) {
          let a = jd,
            b = t;
          for (let j = 0; j < 30; j++) {
            const m = (a + b) / 2,
              em = misto.elevAt(i, lat, lon, SUN, m) / D;
            if (em >= sunEl === e0 >= sunEl) a = m;
            else b = m;
          }
          jd = (a + b) / 2;
          break;
        }
        jd = t;
        e0 = e1;
      }
      S.jd = jd;
      sim.updateAll(jd);
      await S.krajina.prep(i);
      await new Promise((r) => setTimeout(r, 300));
      povrch.enter(i, lat, lon, { fov, el, air: opt.air });
      const q = S.surf;
      q.az = az === 'sun' ? S.surfDir(SUN).az : az * D;
      q.track = -1;
      q.el = el * D;
      S.wake();
    },
    [id, lat, lon, sunEl, az, el, fov, setting, opt]
  );
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.S200.S.wake());
  await page.waitForTimeout(1500);
}
const st = () =>
  page.evaluate(() => ({
    ...window.S200.S.krajina.state(),
    dim: window.S200.S.skyDim,
    sunEl2: window.S200.S.surfDir(window.S200.sim.SUN).el,
  }));
/* průměrná barva obdélníku (podíly šířky a výšky obrazu) */
async function color(name, x0, y0, x1, y1) {
  const png = await page.screenshot({ path: `${out}/${name}.png` }),
    { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let r = 0,
    g = 0,
    b = 0,
    c = 0;
  for (let y = Math.floor(y0 * info.height); y < y1 * info.height; y++)
    for (let x = Math.floor(x0 * info.width); x < x1 * info.width; x++) {
      const k = (y * info.width + x) * 3;
      r += data[k];
      g += data[k + 1];
      b += data[k + 2];
      c++;
    }
  return [r / c, g / c, b / c].map((v) => Math.round(v));
}
console.log('== režimy oblohy a stavba krajiny');
const modes = [
  ['earth', 50.09, 14.42, 'jasno', 'zeme'],
  ['moon', 0.674, 23.473, 'bez', 'regolit'],
  ['mars', -4.59, 137.442, 'jasno', 'mars'],
  ['venus', -7.5, 303, 'zatazeno', 'venuse'],
  ['titan', -10.3, 192.3, 'zatazeno', 'titan'],
  ['jupiter', 20, 0, 'jasno', 'mraky'],
  ['io', 12.6, 51.1, 'bez', 'sira'],
  ['ceres', 0, 0, 'bez', 'regolit'],
];
for (const [id, la, lo, md, typ] of modes) {
  await go(id, la, lo, 30, 'sun', 10);
  const s = await st(),
    y = await page.evaluate(() => {
      const K = window.S200.S.krajina,
        v = [];
      for (const r of [3, 30, 300, 3000, 30000])
        for (const a of [0, 2, 4]) v.push(K.yAt(r * Math.sin(a), -r * Math.cos(a)));
      return v;
    });
  ok(s.mode === md && s.typ === typ, `${id}: obloha „${s.mode}“, krajina „${s.typ}“ (čekáno ${md}, ${typ})`);
  ok(
    y.every((v) => Number.isFinite(v)) && s.ms < 4000,
    `${id}: terén postavený za ${s.ms} ms, výšky konečné (${y.slice(0, 4).map((v) => v.toFixed(1))} … m)`
  );
}
/* Venuše nad oblaky */
await go('venus', -7.5, 303, 30, 'sun', 10, 70, false, { air: false });
ok((await st()).mode === 'nad', 'Venuše: tlačítko „Nad oblaka“ přepne na pohled nad oblačností');
console.log('== výškové mapy');
await go('moon', 26.132, 3.634, 25, 170, 4);
let s = await st();
const hd = await page.evaluate(() => {
  /* Hadley Delta: hora asi 3,5 km vysoká, 5–15 km jižně od Apolla 15 */
  const K = window.S200.S.krajina;
  let m = -1e9;
  for (let r = 3000; r <= 20000; r += 500)
    m = Math.max(m, K.yAt(r * Math.sin(Math.PI * 0.95), -r * Math.cos(Math.PI * 0.95)));
  return m;
});
ok(s.dem > 1500 && s.dem < 2500, `Měsíc u Apolla 15: výšková mapa LOLA, ${s.dem} m na bod (výřez 16 bodů na stupeň)`);
ok(hd > 2000, `Hadley Delta na jihu se zvedá ${Math.round(hd)} m nad místo přistání (skutečně asi 3,5 km)`);
await go('mars', -4.59, 137.442, 35, 140, 4);
s = await st();
const ms = await page.evaluate(() => {
  /* Mount Sharp (Aeolis Mons): vrchol asi 5,5 km nad dnem kráteru Gale, 30–45 km jihovýchodně od Curiosity */
  const K = window.S200.S.krajina,
    a = (140 * Math.PI) / 180;
  let m = -1e9;
  for (let r = 10000; r <= 60000; r += 1000) m = Math.max(m, K.yAt(r * Math.sin(a), -r * Math.cos(a)));
  return m;
});
ok(s.dem > 3000 && s.dem < 4500, `Mars u Curiosity: výšková mapa MOLA, ${s.dem} m na bod`);
ok(ms > 2500, `Mount Sharp na jihovýchodě se zvedá ${Math.round(ms)} m nad dno kráteru Gale`);
console.log('== Země: přistání mimo moře');
const adj = await page.evaluate(async () => {
  const { S, sim } = window.S200,
    i = sim.idx.get('earth');
  await S.krajina.prep(i);
  return {
    more: S.krajina.adjust(i, 30, -40),
    praha: S.krajina.adjust(i, 50.09, 14.42),
    pacifik: S.krajina.adjust(i, 0, -150),
  };
});
ok(
  !!adj.more && /moře/.test(adj.more.msg),
  `střed Atlantiku → posun na pevninu (${adj.more && adj.more.lat.toFixed(1)}°, ${adj.more && adj.more.lon.toFixed(1)}°)`
);
ok(adj.praha === null, 'Praha zůstane, kde je');
ok(
  !!adj.pacifik,
  `rovník v Tichém oceánu → nejbližší ostrov nebo pevnina (${adj.pacifik && adj.pacifik.msg.replace(/^.*asi /, 'asi ')})`
);
console.log('== barvy oblohy a světlo');
await go('earth', 50.09, 14.42, 40, 'sun', 25, 70);
let c = await color('zeme_den', 0.1, 0.05, 0.9, 0.2);
s = await st();
ok(c[2] > c[0] + 25 && c[2] > 120, `Země ve dne: obloha modrá (${c})`);
ok(s.dim > 0.9, `ve dne hvězdy zmizí (ztlumení ${s.dim.toFixed(2)})`);
await go('earth', 50.09, 14.42, 1.5, 'sun', 4, 50, true);
c = await color('zeme_zapad', 0.3, 0.38, 0.7, 0.46);
s = await st();
ok(c[0] > c[2] + 40, `západ Slunce: u obzoru ke Slunci oranžovo (${c})`);
ok(
  s.Tsun[0] > s.Tsun[1] && s.Tsun[1] > s.Tsun[2] && s.Tsun[2] < 0.1,
  `Slunce u obzoru je červené: propustnost ${s.Tsun.map((v) => v.toFixed(3))}`
);
await go('earth', 50.09, 14.42, -16.3, 180, 30, 70);
s = await st();
ok(s.dim < 0.05, `v noci hvězdy svítí (ztlumení ${s.dim.toFixed(3)})`);
await go('mars', -4.59, 137.442, 45, 'sun', 8, 70);
c = await color('mars_den', 0.1, 0.05, 0.9, 0.25);
ok(c[0] > c[2] + 25, `Mars ve dne: obloha žlutohnědá (${c})`);
await go('moon', 0.674, 23.473, 20, 'sun', 2, 70);
c = await color('mesic_den', 0.1, 0.02, 0.9, 0.12);
s = await st();
ok(Math.max(...c) < 20, `Měsíc ve dne: obloha černá (${c})`);
ok(s.dim > 0.5, `Měsíc: osvětlená krajina v záběru oslní a hvězdy ztlumí (${s.dim.toFixed(2)})`);
await go('moon', 0.674, 23.473, 20, 'sun', 85, 40);
s = await st();
ok(s.dim < 0.2, `Měsíc: pohled do nadhlavníku bez krajiny – hvězdy jsou vidět (${s.dim.toFixed(2)})`);
await go('venus', -7.5, 303, 40, 'sun', 20, 70);
c = await color('venuse', 0.1, 0.05, 0.9, 0.25);
ok(c[0] > c[2] + 40 && c[0] > 120, `Venuše pod oblaky: obloha oranžová a zatažená (${c})`);
console.log(errs.length ? errs.join('\n') : 'bez chyb stránky');
console.log(bad ? `CHYBY: ${bad} z ${n} kontrol` : `bez chyb (${n} kontrol)`);
await browser.close();
srv.close();
process.exit(bad || errs.length ? 1 : 0);
