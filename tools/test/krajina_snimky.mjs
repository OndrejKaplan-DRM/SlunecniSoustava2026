// Snímky pohledu z povrchu s krajinou (verze 2.2): pro každý případ najde čas, kdy je Slunce v zadané výšce (západ, poledne, noc),
// postaví se na místo a vyfotí pohled. Výstup: <složka>/<jméno>.jpg a stav.json (režim, expozice, barva Slunce, jas oblohy).
// Použití: node tools/test/krajina_snimky.mjs <složka> [jméno,jméno…]
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
const out = process.argv[2] || '/tmp/kraj',
  only = process.argv[3] ? new Set(process.argv[3].split(',')) : null;
fs.mkdirSync(out, { recursive: true });
/* [jméno, těleso, šířka, délka, výška Slunce (°) | null = dané jd, azimut pohledu ('sun' = ke Slunci, 'par' = k planetě), výška pohledu, pole, západ?] */
export const CASES = [
  ['zeme_den', 'earth', 50.09, 14.42, 40, 'sun+150', 12, 70],
  ['zeme_zapad', 'earth', 50.09, 14.42, 1.5, 'sun', 6, 70, true],
  ['zeme_soumrak', 'earth', 50.09, 14.42, -5, 'sun', 10, 70, true],
  ['zeme_noc', 'earth', 50.09, 14.42, -14, 180, 25, 70],
  ['zeme_poust', 'earth', 25.69, 32.64, 30, 'sun+120', 8, 70],
  ['zeme_lom', 'earth', 25.69, 32.64, -0.25, 'sun', 0.2, 3, true],
  ['gronsko_noc', 'earth', 72, -40, -20, 180, 4, 70, false, 0, 2461375.5],
  ['gronsko_noc_g', 'earth', 72, -40, -20, 180, 4, 70, false, 0.7, 2461375.5],
  ['mesic_rano', 'moon', 0.674, 23.473, 8, 'sun+150', 4, 70],
  ['mars_den', 'mars', -4.59, 137.442, 45, 'sun+150', 8, 70],
  ['mars_zapad', 'mars', -4.59, 137.442, 2, 'sun', 6, 60, true],
  ['mesic_den', 'moon', 0.674, 23.473, 20, 'sun+120', 6, 70],
  ['mesic_hadley', 'moon', 26.132, 3.634, 25, 170, 4, 70],
  ['mars_gale', 'mars', -4.59, 137.442, 35, 140, 4, 70],
  ['mesic_zeme', 'moon', 0.674, 23.473, -20, 'par', 8, 70],
  ['venuse', 'venus', -7.5, 303.0, 40, 'sun+90', 8, 70],
  ['titan', 'titan', -10.3, 192.3, 30, 'sun+90', 8, 70],
  ['jupiter', 'jupiter', 20, 0, 30, 'sun+150', 6, 70],
  ['jupiter_veze', 'jupiter', 20, 0, 14, 'sun+100', 5, 75],
  ['uran', 'uranus', 0, 0, 12, 'sun+150', 6, 70],
  ['io', 'io', 12.6, 51.1, 25, 'par', 10, 75],
  ['pluto', 'pluto', 20, 180, 25, 'sun+150', 8, 70],
  ['ceres', 'ceres', 0, 0, 20, 'sun+120', 6, 70],
];
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errs.push(m.text().slice(0, 300));
});
await page.goto(`http://localhost:${srv.address().port}/`);
await page.waitForFunction(() => window.S200, null, { timeout: 30000 });
await page.evaluate(() => document.querySelector('#sp-go').click());
await page.waitForFunction(() => !document.querySelector('#splash.on'), null, { timeout: 60000 });
await page.addStyleTag({
  content:
    'body.refsnap .panel, body.refsnap #top, body.refsnap #tools, body.refsnap #dockwrap, body.refsnap #mini, body.refsnap #toast, body.refsnap #hud, body.refsnap #cardtab, body.refsnap #sunchip, body.refsnap #guide, body.refsnap #mission, body.refsnap #more, body.refsnap #surfp { display: none !important; }',
});
const stav = {};
for (const c of CASES) {
  const [name, id, lat, lon, sunEl, az, el, fov, setting, gam, jd0] = c;
  if (only && !only.has(name)) continue;
  const t0 = Date.now();
  const r = await page.evaluate(
    async ([id, lat, lon, sunEl, az, el, fov, setting, gam, jd0]) => {
      const { S, sim, povrch, misto } = window.S200,
        i = sim.idx.get(id),
        SUN = sim.SUN,
        D = Math.PI / 180;
      document.body.classList.add('refsnap');
      if (S.surf) povrch.exit();
      S.paused = true;
      /* čas: od 1. 6. 2026 hledat po krocích okamžik, kdy Slunce prochází zadanou výškou (při západu klesá) */
      let jd = jd0 || 2461192.5;
      if (sunEl !== null) {
        const sd = Math.abs(misto.solarDay(i) || 1),
          step = Math.min(sd / 96, 2);
        let e0 = misto.elevAt(i, lat, lon, SUN, jd) / D;
        for (let k = 0; k < 400; k++) {
          const t = jd + step,
            e1 = misto.elevAt(i, lat, lon, SUN, t) / D;
          const hit = setting
            ? e0 >= sunEl && e1 < sunEl
            : sunEl > 0
              ? e0 < sunEl && e1 >= sunEl
              : e0 >= sunEl && e1 < sunEl;
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
      }
      S.jd = jd;
      sim.updateAll(jd);
      await S.krajina.prep(i);
      await new Promise((r) => setTimeout(r, 300));
      povrch.enter(i, lat, lon, { fov, el, quiet: false });
      const q = S.surf;
      if (typeof az === 'string') {
        const [w, off] = az.split('+'),
          j = w === 'sun' ? SUN : sim.par[i];
        const d = S.surfDir(j);
        q.az = d.az + (+off || 0) * D;
        q.track = -1;
      } else q.az = az * D;
      q.el = el * D;
      S.setGamma(gam || 0);
      S.wake();
      return { jd };
    },
    [id, lat, lon, sunEl, az, el, fov, setting, gam, jd0]
  );
  await page.waitForTimeout(3500);
  await page.evaluate(() => window.S200.S.wake());
  await page.waitForTimeout(2500);
  const st = await page.evaluate(() => {
    const k = window.S200.S.krajina.state();
    return {
      ...k,
      skyDim: window.S200.S.skyDim,
      fps: window.S200.S.fps,
      el: (window.S200.S.surf.el * 180) / Math.PI,
      fov: window.S200.S.fov(),
    };
  });
  await page.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 85 });
  stav[name] = { jd: r.jd, ...st };
  console.log(
    name,
    `${((Date.now() - t0) / 1000).toFixed(0)} s`,
    st.mode,
    'Slunce',
    st.sunEl?.toFixed(1),
    'E',
    st.E?.toExponential(2),
    'jas',
    st.bright?.toFixed(3),
    'stavba',
    st.ms,
    'ms',
    st.typ,
    'kameny',
    st.rocks,
    'stromy',
    st.trees,
    'mapa',
    st.map,
    'dem',
    st.dem,
    'pohled',
    st.el.toFixed(1),
    st.fov.toFixed(0)
  );
}
fs.writeFileSync(`${out}/stav.json`, JSON.stringify(stav, null, 1));
console.log(errs.length ? [...new Set(errs)].join('\n') : 'bez chyb stránky');
await browser.close();
srv.close();
