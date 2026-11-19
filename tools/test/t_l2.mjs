// Úroveň 2 map (pyramida dlaždic 8k/16k/32k): načtení zblízka, nic zdálky, nic na telefonu, snímky před/po, chyby stránky.
// Použití: node tools/test/t_l2.mjs <složka> [id:výška_v_poloměrech[:šířka:délka[:noc]],…]   (výchozí moon:0.3,earth:0.35,mars:0.3)
// „noc“ (jen Země): čas, kdy je nad místem noc – zkouší noční světla 8192 px; snímek <id>_<n>_L2.jpg.
// id:výška:term – místo 80° od bodu pod Sluncem (Slunce nízko, terminátor; reliéf Měsíce).
// Bez šířky a délky se kamera postaví nad místo 25° západně od bodu, kde je Slunce v nadhlavníku (šikmé světlo, den).
// Snímky: <složka>/<id>_L1.jpg (jen úroveň 1, tak jak to bylo do 1.8a) a <id>_L2.jpg (s dlaždicemi).
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import http from 'http';
import fs from 'fs';
import path from 'path';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.json': 'application/json' };
const srv = http
  .createServer((q, r) => {
    const u = decodeURIComponent(q.url.split('?')[0]),
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
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const out = process.argv[2] || '/tmp/l2';
fs.mkdirSync(out, { recursive: true });
const LIST = (process.argv[3] || 'moon:0.3,earth:0.35,mars:0.3').split(',').map((s) => s.split(':'));
let ok = 0,
  bad = 0,
  shot = 0;
const T = (n, c, x = '') => {
  c ? ok++ : bad++;
  console.log((c ? 'OK  ' : 'FAIL') + ' ' + n + ' ' + x);
};
async function open(ctxOpt = { viewport: { width: 1366, height: 768 } }, q = '') {
  const ctx = await browser.newContext(ctxOpt),
    page = await ctx.newPage(),
    errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/GPU stall/.test(m.text())) errs.push(m.text().slice(0, 200));
  });
  await page.goto(`http://localhost:${srv.address().port}/${q}`);
  await page.waitForFunction(() => window.S200);
  await page.evaluate(() => {
    document.querySelector('#sp-go').click();
  });
  await page.waitForFunction(() => !document.querySelector('#splash.on'), null, { timeout: 30000 });
  await page.evaluate(() => (S200.S.quality = 2));
  return { ctx, page, errs };
}
const fly = (page, id, alt) =>
  page.evaluate(
    async ([id, alt]) => {
      const S = S200.S,
        j = S200.sim.idx.get(id);
      S.flyTo(j, { alt: alt * S200.sim.B[j].R });
      await new Promise((r) => {
        const h = setInterval(() => {
          if (!S.flying() && S.focus === j) {
            clearInterval(h);
            r();
          }
        }, 50);
      });
    },
    [id, +alt]
  );
const waitL2 = (page, ms = 40000) =>
  page.evaluate(async (ms) => {
    const S = S200.S,
      t0 = performance.now();
    let st;
    while (performance.now() - t0 < ms) {
      st = S.l2.state();
      if (st.loaded > 0 && st.loading === 0 && st.loaded >= Math.min(st.want, st.slots)) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    await new Promise((r) => setTimeout(r, 1200));
    return { ...S.l2.state(), ms: Math.round(performance.now() - t0) };
  }, ms);
const waitHi = (page, id) =>
  page.evaluate(async (id) => {
    const S = S200.S,
      j = S200.sim.idx.get(id),
      t0 = performance.now();
    while (performance.now() - t0 < 30000 && S.R[j].hi !== 2) await new Promise((r) => setTimeout(r, 200));
    return S.R[j].hi;
  }, id);

{
  const { ctx, page, errs } = await open();
  const dev = await page.evaluate(() => [S200.ui.device && S200.ui.device.trida, S200.S.l2.slots]);
  console.log('třída zařízení', dev[0], '· míst v atlasu', dev[1]);
  for (const [id, alt, ...view] of LIST) {
    /* sandbox kreslí pomalu a aplikace si sama sníží kvalitu na 0 – pak velké mapy vypíná; pro zkoušku ji držíme na 2 */
    await page.evaluate(() => {
      clearInterval(window.__q2);
      window.__q2 = setInterval(() => (S200.S.quality = 2), 250);
    });
    await fly(page, id, 6);
    await page.waitForTimeout(1500);
    const far = await page.evaluate(() => S200.S.l2.state());
    T(id + ': zdálky (6 R) žádné dlaždice', far.loaded === 0 && far.loading === 0, JSON.stringify(far));
    await fly(page, id, alt);
    await page.evaluate(
      ([id, la, lo, noc, term]) => {
        const S = S200.S,
          j = S200.sim.idx.get(id),
          m = [],
          P = S200.sim.P;
        if (id === 'earth' && la !== undefined)
          S.jd =
            (la < -60 || (noc && la > 55) ? 2461395.5 : 2461212.5) + /* polární noc: prosinec */
            (noc ? 23.2 : 11.3) / 24; /* 21. 6. 2026 (jižní polární oblast 21. 12.), poledne (nebo noc) nad Evropou */
        S200.sim.updateAll && S200.sim.updateAll(S.jd);
        S200.sim.basis(j, S.jd, m);
        let lat, lon;
        if (la === undefined || term) {
          const d = Math.hypot(P[j * 3], P[j * 3 + 1], P[j * 3 + 2]),
            sx = -P[j * 3] / d,
            sy = -P[j * 3 + 1] / d,
            sz = -P[j * 3 + 2] / d,
            bx = m[0] * sx + m[1] * sy + m[2] * sz,
            by = m[3] * sx + m[4] * sy + m[5] * sz,
            bz = m[6] * sx + m[7] * sy + m[8] * sz;
          lat = Math.asin(bz) * 0.6;
          lon = Math.atan2(by, bx) - (term ? 1.4 : 0.44); /* „term“: 80° od bodu pod Sluncem – Slunce nízko nad obzorem */
        } else {
          lat = (la * Math.PI) / 180;
          lon = (lo * Math.PI) / 180;
        }
        const bx = Math.cos(lat) * Math.cos(lon),
          by = Math.cos(lat) * Math.sin(lon),
          bz = Math.sin(lat),
          nx = m[0] * bx + m[3] * by + m[6] * bz,
          ny = m[1] * bx + m[4] * by + m[7] * bz,
          nz = m[2] * bx + m[5] * by + m[8] * bz;
        S.lock = false;
        S.cam.yaw = Math.atan2(nz, nx);
        S.cam.pitch = Math.asin(ny);
        S.cam.ly = S.cam.lp = 0;
        S.wake();
      },
      [
        id,
        view[0] === undefined || view[0] === 'term' ? undefined : +view[0],
        view[1] === undefined ? undefined : +view[1],
        view[2] === 'noc',
        view[0] === 'term',
      ]
    );
    const hi = await waitHi(page, id);
    T(id + ': úroveň 1 načtená', hi === 2, 'hi=' + hi);
    const st = await waitL2(page);
    const own = st.owner === (await page.evaluate((x) => S200.sim.idx.get(x), id));
    if (+alt >= 1 && !st.want)
      T(id + ': z ' + alt + ' R úroveň 2 není potřeba (velká mapa se ještě neroztahuje)', own && !st.loading, JSON.stringify(st));
    else T(id + ': úroveň 2 načtená zblízka', st.loaded > 0 && own, JSON.stringify(st));
    if (view[2] === 'noc') {
      const li = await page.evaluate(async (id) => {
        const S = S200.S,
          j = S200.sim.idx.get(id),
          t0 = performance.now();
        while (performance.now() - t0 < 20000 && S.R[j].xt !== 2) await new Promise((r) => setTimeout(r, 200));
        return S.R[j].xt;
      }, id);
      T(id + ': noční světla 8192 px načtená', li === 2, 'xt=' + li);
    }
    const nm = `${id}_${++shot}`;
    if (view[2] === 'noc') {
      /* pro srovnání: světla z malé pomocné mapy (2048 px), jak byla do 1.8a */
      await page.evaluate((id) => {
        const R = S200.S.R[S200.sim.idx.get(id)];
        R.U.uLights.value = 0;
        S200.S.wake();
      }, id);
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `${out}/${nm}_svetla2048.jpg`, type: 'jpeg', quality: 85, timeout: 180000 });
      await page.evaluate((id) => {
        const R = S200.S.R[S200.sim.idx.get(id)];
        R.U.uLights.value = 1;
        S200.S.wake();
      }, id);
      await page.waitForTimeout(1200);
    }
    await page.screenshot({ path: `${out}/${nm}_L2.jpg`, type: 'jpeg', quality: 85, timeout: 180000 });
    if (process.env.PROBE) {
      /* ladicí sonda: PROBE='kód' se vyhodnotí v aplikaci (proměnná id = těleso) a uloží se snímek <id>_<n>_probe.jpg */
      await page.evaluate(([c, id]) => (0, eval)(`(id) => { ${c} }`)(id), [process.env.PROBE, id]);
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${out}/${nm}_probe.jpg`, type: 'jpeg', quality: 85, timeout: 180000 });
    }
    const sl = await page.evaluate(() => {
      const s = S200.S.l2.slots;
      S200.S.l2.slots = 0;
      return s;
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${out}/${nm}_L1.jpg`, type: 'jpeg', quality: 85, timeout: 180000 });
    await page.evaluate((s) => (S200.S.l2.slots = s), sl);
  }
  const lg = await page.evaluate(() => S200.S.l2.log.slice());
  if (lg.length) {
    const avg = (k) => Math.round(lg.reduce((a, b) => a + b[k], 0) / lg.length);
    console.log(
      `dlaždic nahráno ${lg.length}, průměr načtení+rozbalení ${avg('load')} ms, nahrání do grafiky ${avg('upload')} ms, nejvíc ${Math.max(...lg.map((x) => x.upload))} ms`
    );
  }
  console.log('paměť map (odhad)', await page.evaluate(() => Math.round(S200.S.texMem())), 'MB');
  T('bez chyb stránky (počítač)', !errs.length, errs.slice(0, 3).join(' | '));
  await ctx.close();
}
{
  /* telefon: velké mapy ani dlaždice se nenačítají */
  const { ctx, page, errs } = await open({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  await fly(page, 'moon', 0.3);
  await page.waitForTimeout(4000);
  const st = await page.evaluate(() => S200.S.l2.state());
  T('telefon: žádné dlaždice', st.loaded === 0 && st.loading === 0, JSON.stringify(st));
  T('bez chyb stránky (telefon)', !errs.length, errs.slice(0, 3).join(' | '));
  await ctx.close();
}
console.log(bad ? `CHYBY: ${bad}` : `bez chyb (${ok} kontrol)`);
await browser.close();
srv.close();
process.exit(bad ? 1 : 0);
