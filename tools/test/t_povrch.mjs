// Pohled z povrchu tělesa (verze 1.10).
// Hlídá: vstup a výstup (třídy, lišta, zorné pole, návrat kamery nad místo), výšku a směr Slunce z Prahy proti výpočtu
// z deklinace, denní pohyb oblohy, denní oblohu se vzduchem a bez něj, rozhlížení a meze, zorné pole 0,25–75°,
// sledování tělesa, tělesa pod obzorem bez popisků, Mars a Měsíc, dětské rozhraní, odmítnutí Slunce, odlet jinam
// a pohled „Z místa“ u zatmění (úplné v Luxoru 2027, částečné v Praze 1999, návrat po zavření karty).
// Použití: node tools/test/t_povrch.mjs [složka pro snímky] [desk|phone|tab|land …]
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
const out = process.argv[2] || '/tmp/povrch';
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
/* 20. 11. 2026 11:02 UT: deklinace Slunce −19,7°, pravé poledne v Praze asi v 10:48 UT → výška 20,1°, azimut asi 183,5° */
const JD_NOON = 2461364.96;
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
  /* počká na vykreslené snímky (poloha kamery a údaje o tělesech jsou z posledního snímku) */
  const frames = (k = 3) =>
    page.evaluate(
      (k) =>
        new Promise((res) => {
          let c = 0;
          S200.S.wake();
          const f = () => (++c >= k ? res() : (S200.S.wake(), requestAnimationFrame(f)));
          requestAnimationFrame(f);
        }),
      k
    );
  const stav = () =>
    page.evaluate(() => {
      const S = S200.S,
        sim = S200.sim,
        q = S.surf,
        D = 180 / Math.PI,
        bar = document.querySelector('#surf'),
        r = bar.getBoundingClientRect(),
        card = document.querySelector('#card'),
        air = document.querySelector('#skyair'),
        dir = (id) => {
          const d = S.surfDir(sim.idx.get(id));
          return d ? { az: (((d.az * D) % 360) + 360) % 360, el: d.el * D } : null;
        };
      return {
        on: !!q,
        cls: document.body.className,
        bar: { on: bar.classList.contains('on') && r.width > 0, l: r.left, r: r.right, t: r.top, b: r.bottom },
        txt: bar.textContent,
        W: innerWidth,
        H: innerHeight,
        fov: S.fov(),
        q: q ? { i: q.i, az: q.az * D, el: q.el * D, fov: q.fov, track: q.track, air: q.air } : null,
        sun: q ? dir('sun') : null,
        moon: q ? dir('moon') : null,
        dim: S.skyDim,
        airOn: getComputedStyle(air).display !== 'none',
        cardOn: !!card && card.clientWidth > 0 && getComputedStyle(card).visibility !== 'hidden',
        focus: sim.B[S.focus].id,
        alt: S.cam.alt,
        own: q ? S.R[q.i].pr : -1,
        R: Object.fromEntries(
          ['sun', 'moon', 'earth', 'mars'].map((id) => {
            const r = S.R[sim.idx.get(id)];
            return [id, { x: r.sx, y: r.sy, z: r.z, pr: r.pr }];
          })
        ),
      };
    });
  const touch = lay !== 'desk';
  // 1) vstup: Praha v poledne
  await page.evaluate((jd) => {
    const S = S200.S,
      sim = S200.sim;
    S.paused = true;
    S.jd = jd;
    sim.updateAll(S.jd);
    S200.povrch.enter(sim.idx.get('earth'), 50.09, 14.42);
  }, JD_NOON);
  await page.waitForTimeout(1800);
  await frames();
  let s = await stav();
  await snap('1_poledne');
  ok(s.on && /surfon/.test(s.cls) && s.bar.on, 'vstup: pohled z povrchu je zapnutý a lišta je vidět');
  ok(
    s.bar.l >= -1 && s.bar.r <= s.W + 1 && s.bar.t >= 0 && s.bar.b < s.H * 0.6,
    `lišta leží v okně (${JSON.stringify(s.bar)})`
  );
  ok(Math.abs(s.fov - 68) < 1.5, `zorné pole se ustálilo na 68° (${s.fov.toFixed(1)})`);
  ok(s.own === 0, 'těleso pod nohama se nekreslí jako koule');
  ok(
    s.sun && s.sun.el > 19.4 && s.sun.el < 20.8,
    `Slunce z Prahy 20. 11. v 11:02 UT je 20,1° vysoko (model ${s.sun && s.sun.el.toFixed(2)}°)`
  );
  ok(
    s.sun && s.sun.az > 180.5 && s.sun.az < 187,
    `a těsně za jihem, azimut asi 183,5° (model ${s.sun && s.sun.az.toFixed(1)}°)`
  );
  ok(
    s.R.sun.z > 0 && s.R.sun.x > 0 && s.R.sun.x < s.W && s.R.sun.y > 0 && s.R.sun.y < s.H,
    'úvodní pohled míří ke Slunci a to je v obraze'
  );
  ok(s.dim > 0.8 && s.airOn, `den se vzduchem: obloha svítí a hvězdy ustoupí (${s.dim.toFixed(2)})`);
  ok(/Praha/.test(s.txt) && /Vzduch/.test(s.txt) && /Vzlétnout/.test(s.txt), 'lišta Země má Vzduch, Prahu a Vzlétnout');
  ok(/50,1° s\. š\., 14,4° v\. d\./.test(s.txt), 'lišta ukazuje zeměpisnou polohu');
  if (touch) ok(!s.cardOn, 'dotyková rozložení: karta tělesa lištu nepřekrývá (je schovaná)');
  // 2) vzduch vypnout a zapnout
  await page.evaluate(() => document.querySelector('#surf [data-s="air"]').click());
  await page.waitForTimeout(500);
  await frames();
  s = await stav();
  ok(s.dim < 0.02 && !s.airOn, `bez vzduchu je obloha černá i ve dne (${s.dim.toFixed(2)})`);
  await page.evaluate(() => document.querySelector('#surf [data-s="air"]').click());
  // 3) denní pohyb: za dvě hodiny se Slunce posune k západu a klesne, za 24 h je zpátky
  const a0 = s.sun;
  await page.evaluate((jd) => {
    S200.S.jd = jd + 2 / 24;
    S200.sim.updateAll(S200.S.jd);
  }, JD_NOON);
  await frames();
  s = await stav();
  ok(
    s.sun.az > a0.az + 20 && s.sun.az < a0.az + 36 && s.sun.el < a0.el - 2,
    `za 2 h je Slunce o 20–36° dál k západu a níž (${s.sun.az.toFixed(1)}°, ${s.sun.el.toFixed(1)}°)`
  );
  await page.evaluate((jd) => {
    S200.S.jd = jd + 1;
    S200.sim.updateAll(S200.S.jd);
  }, JD_NOON);
  await frames();
  s = await stav();
  ok(
    Math.abs(s.sun.az - a0.az) < 0.6 && Math.abs(s.sun.el - a0.el) < 0.6,
    `za 24 h je Slunce skoro na stejném místě (${s.sun.az.toFixed(1)}°, ${s.sun.el.toFixed(1)}°)`
  );
  // 4) noc: Slunce pod obzorem, bez popisku a bez odlesku, obloha tmavá
  await page.evaluate((jd) => {
    const S = S200.S;
    S.jd = jd + 0.44;
    S200.sim.updateAll(S.jd);
    S.surf.track = S200.sim.idx.get('sun');
  }, JD_NOON);
  await page.waitForTimeout(900);
  await frames();
  s = await stav();
  await snap('2_noc');
  ok(s.sun.el < -30, `ve 21:36 UT je Slunce hluboko pod obzorem (${s.sun.el.toFixed(1)}°)`);
  ok(s.dim < 0.02, 'v noci obloha nesvítí');
  ok(s.q.el >= -20.1, `sledování tělesa pod obzorem se zastaví na mezi pohledu dolů (${s.q.el.toFixed(1)}°)`);
  ok(/pod obzorem/.test(s.txt) && !/-\d+°/.test(s.txt), 'lišta píše „pod obzorem“ bez záporného čísla');
  const lab = await page.evaluate(() => {
    const S = S200.S,
      sun = S200.sim.idx.get('sun'),
      r = S.R[sun];
    return S.pick ? S.pick(r.sx, r.sy) : -2;
  });
  ok(
    lab !== (await page.evaluate(() => S200.sim.idx.get('sun'))),
    'Slunce pod obzorem nejde vybrat kliknutím přes zem'
  );
  // 5) rozhlížení: tah zruší sledování, výška má meze
  await page.evaluate(() => {
    const S = S200.S;
    S.surf.track = -1;
    S.surf.az = 1;
    S.surf.el = 0.3;
  });
  await frames();
  const az0 = (await stav()).q.az;
  await page.evaluate(() => {
    S200.S.surf.track = S200.sim.idx.get('moon');
    S200.S.rotate(120, 0);
  });
  await frames();
  s = await stav();
  ok(s.q.track === -1, 'tah zruší sledování tělesa');
  await page.evaluate(() => {
    S200.S.surf.az = 1;
    S200.S.surf.el = 0.3;
    S200.S.rotate(120, 0);
  });
  await frames();
  s = await stav();
  ok(Math.abs(s.q.az - az0) > 3, `vodorovný tah otočí pohled (${az0.toFixed(1)}° → ${s.q.az.toFixed(1)}°)`);
  await page.evaluate(() => {
    for (let k = 0; k < 40; k++) S200.S.rotate(0, -400);
  });
  await frames();
  const hi = (await stav()).q.el;
  await page.evaluate(() => {
    for (let k = 0; k < 40; k++) S200.S.rotate(0, 400);
  });
  await frames();
  const lo = (await stav()).q.el;
  ok(
    Math.max(hi, lo) <= 89.1 && Math.min(hi, lo) >= -20.1 && Math.abs(hi - lo) > 100,
    `pohled jde od −20° po zenit (${lo.toFixed(1)}° až ${hi.toFixed(1)}°)`
  );
  // 6) zorné pole: meze 0,25° a 75°
  await page.evaluate(() => {
    for (let k = 0; k < 30; k++) S200.S.zoom(0.5);
  });
  s = await stav();
  ok(Math.abs(s.q.fov - 0.25) < 1e-6, `nejužší pole je 0,25° (${s.q.fov})`);
  await page.evaluate(() => {
    for (let k = 0; k < 30; k++) S200.S.zoom(2);
  });
  s = await stav();
  ok(Math.abs(s.q.fov - 75) < 1e-6, `nejširší pole je 75° (${s.q.fov})`);
  // 7) najít na obloze: Měsíc (nebo hláška, že je pod obzorem)
  const found = await page.evaluate(() => {
    const sel = document.querySelector('#surf select'),
      m = String(S200.sim.idx.get('moon'));
    if (![...sel.options].some((o) => o.value === m)) return 'chybí';
    sel.value = m;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return S200.S.surf.track;
  });
  await page.waitForTimeout(900);
  await frames();
  s = await stav();
  ok(found !== 'chybí', 'nabídka „Najít na obloze“ obsahuje Měsíc');
  if (s.moon.el > 2) {
    ok(s.q.track === (await page.evaluate(() => S200.sim.idx.get('moon'))), 'výběr Měsíce zapne sledování');
    ok(
      Math.hypot(s.R.moon.x - s.W / 2, s.R.moon.y - s.H / 2) < 6,
      `sledovaný Měsíc je uprostřed obrazu (${s.R.moon.x.toFixed(0)}, ${s.R.moon.y.toFixed(0)})`
    );
  } else console.log(`  pozn.: Měsíc je ${s.moon.el.toFixed(1)}° – pod obzorem, střed obrazu se nekontroluje`);
  await snap('3_mesic');
  // 8) výstup klávesou Esc: kamera se vrátí nad místo, zorné pole 45°
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1500);
  await frames();
  s = await stav();
  ok(!s.on && !/surfon/.test(s.cls) && !s.bar.on && !s.airOn, 'Esc: pohled z povrchu skončí a lišta zmizí');
  ok(Math.abs(s.fov - 45) < 0.01, `zorné pole je zpět na 45° (${s.fov})`);
  ok(s.focus === 'earth' && s.alt > 0 && s.R.earth.pr > 20, 'kamera je zpátky nad Zemí');
  const sub = await page.evaluate(() => S200.S.subPoint());
  ok(
    Math.abs(sub[0] - 50.09) < 1.5 && Math.abs(sub[1] - 14.42) < 1.5,
    `a to přímo nad místem, kde stála (${sub[0].toFixed(1)}°, ${sub[1].toFixed(1)}°)`
  );
  // 9) tlačítko v kartě, odlet na jiné těleso pohled ukončí
  await page.evaluate(() => S200.ui.act('surf'));
  await page.waitForTimeout(800);
  s = await stav();
  ok(
    s.on && s.q.i === (await page.evaluate(() => S200.sim.idx.get('earth'))),
    'tlačítko „Z povrchu“ postaví na vybrané těleso'
  );
  await page.evaluate(() => S200.S.flyTo(S200.sim.idx.get('mars')));
  await page.waitForTimeout(600);
  s = await stav();
  ok(!s.on && Math.abs(s.fov - 45) < 0.01, 'odlet na jiné těleso pohled z povrchu ukončí');
  await page.evaluate(() => S200.S.jump(S200.sim.idx.get('mars')));
  await page.waitForTimeout(800);
  // 10) Mars: vlastní obloha, bez Prahy; Měsíc: bez vzduchu; Slunce odmítne
  await page.evaluate(() => S200.povrch.enter(S200.sim.idx.get('mars'), 4.6, 137.4));
  await page.waitForTimeout(1500);
  await frames();
  s = await stav();
  await snap('4_mars');
  ok(s.on && /Mars/.test(s.txt) && /Vzduch/.test(s.txt) && !/Praha/.test(s.txt), 'Mars: lišta má Vzduch a nemá Prahu');
  ok(s.own === 0 && s.R.earth.pr < 3, 'z Marsu je Země jen bod');
  await page.evaluate(() => S200.povrch.enter(S200.sim.idx.get('moon'), 0.67, 23.47));
  await page.waitForTimeout(1500);
  await frames();
  s = await stav();
  ok(s.on && /Měsíc/.test(s.txt) && !/Vzduch/.test(s.txt), 'Měsíc: bez vzduchu, lišta přepínač nenabízí');
  ok(s.dim === 0, 'na Měsíci je obloha černá i ve dne');
  const earthDir = await page.evaluate(() => S200.S.surfDir(S200.sim.idx.get('earth')).el * (180 / Math.PI));
  ok(earthDir > 50, `z Moře klidu stojí Země vysoko na obloze (${earthDir.toFixed(0)}°)`);
  await page.evaluate(() => S200.povrch.exit());
  await page.evaluate(() => S200.povrch.enter(S200.sim.idx.get('sun')));
  await page.waitForTimeout(400);
  ok(!(await stav()).on, 'na Slunce se postavit nedá');
  // 11) dětské rozhraní
  await page.evaluate(() => {
    S200.ui.setMode(true);
    S200.S.jump(S200.sim.idx.get('moon'));
  });
  await page.waitForTimeout(1200);
  await page.evaluate(() => S200.ui.act('surf'));
  await page.waitForTimeout(1500);
  s = await stav();
  await snap('5_detske');
  ok(
    s.on && /Stojíš tady|Měsíc/.test(s.txt) && s.bar.r <= s.W + 1,
    'dětské rozhraní: pohled z povrchu funguje a lišta se vejde'
  );
  await page.evaluate(() => {
    S200.povrch.exit();
    S200.ui.setMode(false);
  });
  await page.waitForTimeout(800);
  // 12) zatmění „Z místa“: Luxor 2027 úplné, Praha 1999 částečné, návrat
  const jdPred = await page.evaluate(() => S200.S.jd);
  await page.evaluate(() => {
    S200.uk.card('s2027');
    S200.uk.show();
  });
  await page.waitForTimeout(2500);
  await page.evaluate(() => S200.uk.view('z'));
  await page.waitForTimeout(3000);
  await frames();
  s = await stav();
  await snap('6_luxor');
  const z1 = await page.evaluate(() => {
    const c = document.querySelector('#ukc').getBoundingClientRect();
    return {
      cover: S200.povrch.cover(S200.sim.idx.get('moon')),
      view: S200.uk.state().view,
      c: { l: c.left, r: c.right, t: c.top, b: c.bottom },
    };
  });
  ok(
    s.on && z1.view === 'z' && /surfq/.test(s.cls) && !s.bar.on,
    'pohled „Z místa“ postaví pozorovatele na Zemi; lištu nahrazuje karta úkazu'
  );
  ok(
    z1.cover > 0.9999,
    `Luxor 2. 8. 2027: v okamžiku vrcholu je Slunce zakryté celé (${(z1.cover * 100).toFixed(2)} %)`
  );
  ok(s.sun.el > 80 && s.sun.el < 84, `Slunce je 82° vysoko jako v katalogu (${s.sun.el.toFixed(1)}°)`);
  ok(s.fov < 5, `dalekohled: zorné pole pár stupňů (${s.fov.toFixed(1)}°)`);
  const inCard = s.R.sun.x > z1.c.l && s.R.sun.x < z1.c.r && s.R.sun.y > z1.c.t && s.R.sun.y < z1.c.b;
  ok(
    s.R.sun.x > 0 && s.R.sun.x < s.W && s.R.sun.y > 0 && s.R.sun.y < s.H && !inCard,
    `zatmělé Slunce je v obraze a ne pod kartou (${s.R.sun.x.toFixed(0)}, ${s.R.sun.y.toFixed(0)})`
  );
  ok(s.dim < 0.25, `při úplném zatmění obloha ztmavne (${s.dim.toFixed(2)})`);
  await page.evaluate(() => {
    S200.uk.card('s1999');
    S200.uk.show();
  });
  await page.waitForTimeout(2500);
  await page.evaluate(() => S200.uk.view('z'));
  await page.waitForTimeout(3000);
  await frames();
  s = await stav();
  await snap('7_praha1999');
  const c99 = await page.evaluate(() => S200.povrch.cover(S200.sim.idx.get('moon')));
  ok(
    s.on && c99 > 0.9 && c99 < 0.995,
    `Praha 11. 8. 1999: částečné, zakryto asi 95 % kotouče (${(c99 * 100).toFixed(1)} %)`
  );
  ok(s.dim > 0.25, `při částečném zatmění zůstává obloha světlá (${s.dim.toFixed(2)})`);
  await page.evaluate(() => document.querySelector('#ukc [data-u="close"]').click());
  await page.waitForTimeout(2500);
  s = await stav();
  const jdPo = await page.evaluate(() => S200.S.jd);
  ok(
    !s.on && !/surfon|surfq|uksh/.test(s.cls) && Math.abs(s.fov - 45) < 0.01,
    'zavření karty úkazu pohled z povrchu ukončí'
  );
  ok(Math.abs(jdPo - jdPred) < 0.01, `a vrátí čas (${(jdPo - jdPred).toFixed(4)} dne)`);
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
