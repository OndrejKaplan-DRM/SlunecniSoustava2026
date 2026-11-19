// Scéna úkazu a mizející dráhy (verze 1.9).
// Hlídá: výběr ze seznamu úkaz rovnou ukáže; po dobu ukázky ustoupí karta tělesa a jména nesouvisejících těles;
// zúčastněná tělesa leží ve volné ploše vedle karty (na telefonu nad ní); časová osa posouvá čas; přehrávání jde zastavit;
// pohledy na zatmění (zpoza Měsíce, Země a Měsíc shora); návrat vrátí čas, pohled i okna. Dráhy: stopa je nejjasnější
// těsně za tělesem, slábne proti směru pohybu a přepínač vrátí rovnoměrnou čáru.
// Použití: node tools/test/t_scena.mjs [složka pro snímky] [desk|phone|tab|land …]
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
const out = process.argv[2] || '/tmp/scena';
fs.mkdirSync(out, { recursive: true });
const VP = {
  desk: { viewport: { width: 1366, height: 768 } },
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  land: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  tab: { viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};
const which = process.argv.slice(3).length ? process.argv.slice(3) : ['desk', 'phone', 'tab', 'land'];
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
let bad = 0,
  n = 0;
const ok = (c, t) => {
  n++;
  if (!c) {
    console.log('  FAIL ' + t);
    bad++;
  }
  return c;
};
const allErrs = [];
for (const lay of which) {
  console.log(`== ${lay}`);
  const ctx = await browser.newContext(VP[lay]),
    page = await ctx.newPage(),
    errs = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || /shader|GLSL|WebGL: INVALID/i.test(m.text())) errs.push(m.text().slice(0, 300));
  });
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto(`http://localhost:${srv.address().port}/`);
  await page.waitForFunction(() => window.S200);
  await page.evaluate(() => {
    localStorage.clear();
    document.querySelector('#sp-adult').click();
    document.querySelector('#sp-go').click();
  });
  await page.waitForFunction(() => !document.querySelector('#splash.on'), null, { timeout: 180000 });
  await page.waitForTimeout(1500);
  const snap = (name) =>
    page.screenshot({ path: `${out}/${lay}_${name}.jpg`, type: 'jpeg', quality: 70, timeout: 180000 });
  /* stav scény: třídy, karta, poloha zúčastněných těles vůči volné ploše */
  const stav = () =>
    page.evaluate(() => {
      const S = S200.S,
        st = S200.uk.state(),
        c = document.querySelector('#ukc').getBoundingClientRect(),
        W = innerWidth,
        H = innerHeight,
        mob = document.body.classList.contains('mob') && !document.body.classList.contains('land'),
        card = document.querySelector('#card'),
        tela = S.evSet
          ? [...S.evSet].map((i) => ({
              id: S200.sim.B[i].id,
              x: Math.round(S.R[i].sx),
              y: Math.round(S.R[i].sy),
              pr: Math.round(S.R[i].pr),
              z: S.R[i].z > 0,
            }))
          : null;
      return {
        st,
        uksh: document.body.classList.contains('uksh'),
        cardOn: !!card && card.clientWidth > 0 && getComputedStyle(card).visibility !== 'hidden',
        W,
        H,
        mob,
        cr: Math.round(c.right),
        ct: Math.round(c.top),
        tela,
        focus: S200.sim.B[S.focus].id,
        jd: S.jd,
        ly: S.cam.ly,
        tl: !!document.querySelector('#ukc .uk-tl input'),
        tlv: +(document.querySelector('#ukc .uk-tl input') || {}).value,
        t: (document.querySelector('#ukc .uk-t') || {}).textContent,
        views: [...document.querySelectorAll('#ukc [data-v]')].map((b) => b.dataset.v),
        playLab: (document.querySelector('#ukc [data-u="play"]') || {}).textContent,
      };
    });
  /* leží těleso ve volné ploše? (vedle karty, na telefonu nad ní; ne pod horní ani dolní lištou) */
  const volne = (s, b, kraj = 6) =>
    b.z &&
    b.x > kraj &&
    b.x < s.W - kraj &&
    b.y > 44 &&
    b.y < s.H - 96 &&
    (s.mob ? b.y < s.ct + kraj : b.x > s.cr - kraj || lay === 'land');
  const ids = await page.evaluate(() => S200.uk.ids()),
    typy = await page.evaluate(() => {
      const o = {};
      for (const b of document.querySelectorAll('#uk-list button[data-id]')) o[b.dataset.id] = 1;
      return Object.keys(o).length;
    });
  ok(typy === ids.length, `seznam má ${typy} položek z ${ids.length}`);
  ok(await page.evaluate(() => !!document.querySelector('#uk-list .uk-next')), 'seznam ukazuje nejbližší úkaz');
  const jd0 = await page.evaluate(() => S200.S.jd);
  // 1) výběr ze seznamu rovnou ukáže úkaz
  await page.evaluate(() => {
    S200.ui.act('uk');
    document.querySelector('#uk-list button[data-id="s2027"]').click();
  });
  await page.waitForTimeout(1800);
  let s = await stav();
  ok(s.st.back && s.st.cur === 's2027', 'výběr ze seznamu úkaz rovnou ukáže');
  ok(s.uksh && !s.cardOn, 'při ukázce ustoupí karta tělesa');
  ok(s.tl && Math.abs(s.tlv - 500) < 8, `časová osa stojí na vrcholu (${s.tlv})`);
  ok(/UT/.test(s.t || ''), `čas úkazu ve světovém čase: ${s.t}`);
  await snap('s2027');
  // 2) časová osa posouvá čas, přehrávání jde zastavit a pokračuje od táhla
  const sp = await page.evaluate(() => {
    const i = document.querySelector('#ukc .uk-tl input');
    i.value = 200;
    i.dispatchEvent(new Event('input', { bubbles: true }));
    return S200.S.jd;
  });
  await page.waitForTimeout(500);
  s = await stav();
  ok(Math.abs(s.jd - sp) < 1e-9 && s.jd < 2461619.9202 - 0.02, 'táhlo posunulo čas před vrchol');
  ok(
    /před vrcholem/.test(await page.evaluate(() => document.querySelector('#ukc .uk-ph').textContent)),
    'popisek „před vrcholem“'
  );
  await page.evaluate(() => document.querySelector('#ukc [data-u="play"]').click());
  await page.waitForTimeout(1500);
  s = await stav();
  ok(s.st.play > 0 && s.jd > sp && /Zastavit/.test(s.playLab), `přehrávání pokračuje od táhla (${s.playLab})`);
  await page.evaluate(() => document.querySelector('#ukc [data-u="play"]').click());
  await page.waitForTimeout(400);
  s = await stav();
  const stop = s.jd;
  await page.waitForTimeout(700);
  s = await stav();
  ok(s.st.play === 0 && Math.abs(s.jd - stop) < 1e-9 && /Přehrát/.test(s.playLab), 'druhý stisk přehrávání zastaví');
  await page.evaluate(() => document.querySelector('#ukc [data-u="show"]').click());
  await page.waitForTimeout(900);
  // 3) pohledy na zatmění Slunce
  ok(s.views.join() === 'a,m,t', `zatmění Slunce má tři pohledy (${s.views})`);
  await page.evaluate(() => S200.uk.view('m'));
  await page.waitForTimeout(1500);
  s = await stav();
  {
    const e = s.tela.find((b) => b.id === 'earth'),
      m = s.tela.find((b) => b.id === 'moon');
    ok(s.focus === 'moon' && s.st.view === 'm', 'pohled zpoza Měsíce krouží kolem Měsíce');
    ok(volne(s, e), `zpoza Měsíce: Země je ve volné ploše (${e.x}, ${e.y})`);
    ok(Math.hypot(e.x - m.x, e.y - m.y) > m.pr + e.pr + 8, 'zpoza Měsíce: Země není schovaná za Měsícem');
    ok(m.pr > 25, `zpoza Měsíce: Měsíc je v popředí (poloměr ${m.pr} bodů)`);
  }
  await snap('s2027_m');
  await page.evaluate(() => S200.uk.view('t'));
  await page.waitForTimeout(1500);
  s = await stav();
  {
    const e = s.tela.find((b) => b.id === 'earth'),
      m = s.tela.find((b) => b.id === 'moon');
    ok(
      s.focus === 'earth' && volne(s, e) && volne(s, m),
      `Země a Měsíc shora: obě tělesa ve volné ploše (${e.x},${e.y}; ${m.x},${m.y})`
    );
    ok(Math.hypot(e.x - m.x, e.y - m.y) > Math.min(s.W, s.H) * 0.2, 'Země a Měsíc shora: jsou od sebe dost daleko');
  }
  await snap('s2027_t');
  // 4) všechny úkazy (na počítači všech 32, jinde od každého druhu několik)
  const vyber = lay === 'desk' ? ids : ids.filter((_, k) => k % 3 === 0);
  for (const id of vyber) {
    await page.evaluate((id) => {
      S200.uk.card(id);
      S200.uk.show();
    }, id);
    await page.waitForTimeout(lay === 'desk' ? 650 : 900);
    s = await stav();
    const typ = id[0];
    ok(s.st.back && s.st.cur === id && s.uksh && s.tl, `${id}: ukázka běží, časová osa je`);
    ok(s.st.view === 'a', `${id}: nový úkaz začíná výchozím pohledem`);
    if (typ === 's') {
      ok(s.focus === 'earth', `${id}: nad místem úkazu`);
    } else if (typ === 'm') {
      const m = s.tela.find((b) => b.id === 'moon');
      ok(s.focus === 'moon' && volne(s, m, -40), `${id}: Měsíc ve volné ploše (${m.x}, ${m.y})`);
    } else if (typ !== 'h') {
      /* pohled shora na dráhy: všechna zúčastněná tělesa ve volné ploše */
      const mimo = s.tela.filter((b) => !volne(s, b));
      ok(
        mimo.length === 0,
        `${id}: zúčastněná tělesa ve volné ploše` + (mimo.length ? ' – mimo: ' + JSON.stringify(mimo) : '')
      );
    }
    if (id === 'p2029' || id === 'm1504' || id === 'k2026' || id === 'h1572' || id === 'c1910') await snap(id);
  }
  // 5) zatmění Měsíce shora
  await page.evaluate(() => {
    S200.uk.card('m1504');
    S200.uk.show();
    S200.uk.view('t');
  });
  await page.waitForTimeout(1500);
  s = await stav();
  {
    const e = s.tela.find((b) => b.id === 'earth'),
      m = s.tela.find((b) => b.id === 'moon');
    ok(
      s.views.join() === 'a,t' && s.focus === 'earth' && volne(s, e) && volne(s, m),
      `zatmění Měsíce shora: obě tělesa ve volné ploše (${e.x},${e.y}; ${m.x},${m.y})`
    );
  }
  await snap('m1504_t');
  // 6) sbalení karty vrátí běžnou scénu, rozbalení zase scénu úkazu
  await page.evaluate(() => document.querySelector('#ukc [data-u="min"]').click());
  await page.waitForTimeout(400);
  s = await stav();
  ok(!s.uksh && s.tela === null, 'sbalená karta: běžná scéna se jmény těles');
  await page.evaluate(() => document.querySelector('#ukc [data-u="max"]').click());
  await page.waitForTimeout(400);
  s = await stav();
  ok(s.uksh && s.tela !== null, 'rozbalená karta: scéna úkazu');
  // 7) návrat
  await page.evaluate(() => document.querySelector('#ukc [data-u="close"]').click());
  await page.waitForTimeout(900);
  s = await stav();
  ok(!s.st.back && !s.st.cur && !s.uksh && s.tela === null, 'zavření karty ukončí scénu úkazu');
  ok(
    Math.abs(s.jd - jd0) < 0.01 && Math.abs(s.ly) < 1e-6,
    `čas a pohled jsou zpět (rozdíl ${(s.jd - jd0).toFixed(5)} dne)`
  );
  if (lay === 'desk') ok(s.cardOn, 'karta tělesa je zpět');
  // 8) mizející dráhy (stačí jednou, na počítači)
  if (lay === 'desk') {
    const dr = async () =>
      page.evaluate(() => {
        const S = S200.S,
          sim = S200.sim,
          i = sim.idx.get('earth'),
          o = S.R[i].orbit;
        if (!o) return null;
        const c = o.line.geometry.attributes.color.array,
          p = o.line.geometry.attributes.position.array,
          n = c.length / 4 - 1,
          h = n >> 1,
          a = (k) => +c[k * 4 + 3].toFixed(3),
          P0 = [sim.P[i * 3], sim.P[i * 3 + 1], sim.P[i * 3 + 2]];
        sim.updateAll(S.jd + 1);
        const v = [sim.P[i * 3] - P0[0], sim.P[i * 3 + 1] - P0[1], sim.P[i * 3 + 2] - P0[2]];
        sim.updateAll(S.jd);
        /* vzorek o 12 kroků před tělesem (minulost) má ležet proti směru pohybu */
        const d = [p[(h - 12) * 3] - p[h * 3], p[(h - 12) * 3 + 1] - p[h * 3 + 1], p[(h - 12) * 3 + 2] - p[h * 3 + 2]];
        return {
          fade: S.orbFade,
          head: a(h),
          ahead: a(h + 1),
          back: a(h - 60),
          half: a(0),
          op: +o.line.material.opacity.toFixed(3),
          vis: o.line.visible,
          proti: d[0] * v[0] + d[1] * v[1] + d[2] * v[2] < 0,
        };
      });
    await page.evaluate(() => {
      const S = S200.S;
      S.orbMode = 2;
      S.jump(0);
      S.cam.alt = S.cam.altT = 6.5e8;
      S.cam.pitch = 0.9;
      S.wake();
    });
    await page.waitForTimeout(1500);
    let d = await dr();
    ok(d && d.vis && d.fade, 'dráha Země je vidět, stopa je výchozí');
    ok(
      d && d.head === 1 && d.ahead < 0.25,
      `stopa: u tělesa nejjasnější (${d && d.head}), těsně před ním nejslabší (${d && d.ahead})`
    );
    ok(
      d && d.back < d.head && d.back > d.half && d.half > d.ahead,
      `stopa slábne dozadu (${d && [d.head, d.back, d.half, d.ahead].join(' > ')})`
    );
    ok(d && d.proti, 'jasný konec stopy leží za tělesem (proti směru pohybu)');
    await snap('drahy_stopa');
    await page.evaluate(() => S200.ui.act('orbfade'));
    await page.waitForTimeout(1200);
    d = await dr();
    ok(d && !d.fade && d.head === 1 && d.ahead === 1 && d.half === 1, 'přepínač vrátí rovnoměrnou čáru');
    ok((await page.evaluate(() => localStorage.getItem('s200of'))) === '0', 'volba drah se pamatuje');
    await page.evaluate(() => S200.ui.act('orbfade'));
    await page.waitForTimeout(1200);
    d = await dr();
    ok(d && d.fade && d.ahead < 0.25, 'a zpět na stopu');
    /* dětské rozhraní má stopy také */
    await page.evaluate(() => S200.ui.setMode(true));
    await page.waitForTimeout(1200);
    d = await dr();
    ok(d && d.vis && d.fade && d.ahead < 0.25, 'dětské rozhraní: stopy drah');
    ok(
      await page.evaluate(
        () => !S200.S.evSet && getComputedStyle(document.querySelector('[data-a="uk"]')).display === 'none'
      ),
      'dětské rozhraní: úkazy zůstávají schované'
    );
    await page.evaluate(() => S200.ui.setMode(false));
  }
  const e2 = [...new Set(errs)].filter((t) => !/GPU stall|KHR_parallel/.test(t));
  if (e2.length) {
    console.log('  chyby stránky:\n   ' + e2.slice(0, 8).join('\n   '));
    allErrs.push(...e2);
  }
  await ctx.close();
}
await browser.close();
srv.close();
console.log(
  bad || allErrs.length ? `CHYBY: ${bad} z ${n} kontrol, chyb stránky ${allErrs.length}` : `bez chyb (${n} kontrol)`
);
process.exit(bad || allErrs.length ? 1 : 0);
