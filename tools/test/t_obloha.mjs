// Objekty na obloze (verze 1.8b): mlhoviny, hvězdokupy a galaxie na fotce Mléčné dráhy.
// Hlídá: data (19 objektů, fotografie, zdroje), vrstva je zpočátku vypnutá, seznam v nabídce ☰, „Ukázat na obloze“ dostane
// každý objekt doprostřed obrazu a nenechá ho za tělesem, klik = karta, dvojklik = velká karta se zdroji a fotkami,
// zvětšení fotky a Esc, návrat pohledu, zavření oken při přeletu, dětské rozhraní nic z toho neukáže, stránka nesahá na cizí servery.
// Použití: node tools/test/t_obloha.mjs [složka pro snímky] [desk|phone]
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
const out = process.argv[2] || '/tmp/obloha_t',
  prof = process.argv[3] || 'desk',
  phone = prof === 'phone';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const ctx = await browser.newContext(
  phone
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport: { width: 1366, height: 768 } }
);
const page = await ctx.newPage();
const errs = [],
  cizi = [];
page.on('console', (m) => {
  const t = m.text();
  if ((m.type() === 'error' || /shader|GLSL|WebGL: INVALID/i.test(t)) && !/KHR_parallel_shader_compile/.test(t))
    errs.push(t.slice(0, 300));
});
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
const base = `http://localhost:${srv.address().port}/`;
page.on('request', (q) => {
  const u = q.url();
  if (!u.startsWith(base) && !u.startsWith('data:') && !u.startsWith('blob:')) cizi.push(u);
});
await page.goto(base);
await page.waitForFunction(() => window.S200);
await page.evaluate(() => {
  localStorage.clear();
  document.querySelector('#sp-adult').click();
  document.querySelector('#sp-go').click();
});
await page.waitForFunction(() => !document.querySelector('#splash.on'), null, { timeout: 180000 });
let bad = 0;
const ok = (c, t) => {
  console.log((c ? '  ok   ' : '  FAIL ') + t);
  if (!c) bad++;
};
const st = () => page.evaluate(() => S200.obloha.state());
const isOn = (s) => page.evaluate((s) => document.querySelector(s).classList.contains('on'), s);
const klid = () => page.waitForFunction(() => !S200.obloha.state().anim && !S200.S.flying(), null, { timeout: 120000 });
const snimek = (n) => page.screenshot({ path: path.join(out, `${prof}_${n}.png`), timeout: 180000 });
const frames = (n = 3) =>
  page.evaluate(
    (n) =>
      new Promise((r) => {
        const f = () => {
          S200.S.wake();
          --n > 0 ? requestAnimationFrame(f) : r();
        };
        requestAnimationFrame(f);
      }),
    n
  );

console.log('data');
const d = await page.evaluate(async () => {
  const O = S200.obloha,
    L = O.ids().map((i) => O.get(i)),
    files = [];
  for (const o of L) {
    files.push(o.id + '_nase.webp');
    for (const im of o.imgs) files.push(im.f);
  }
  let miss = 0;
  for (const f of files) if (!(await fetch('sky/' + f, { method: 'HEAD' })).ok) miss++;
  return {
    n: L.length,
    files: files.length,
    miss,
    bezFot: L.filter((o) => !o.imgs.length).length,
    bezZdr: L.filter((o) => !o.src.length || o.src.some((s) => !/^https:\/\//.test(s.u))).length,
    bezAut: L.filter((o) => o.imgs.some((im) => !im.autor || !im.lic || !/^https:\/\//.test(im.url))).length,
    bezTxt: L.filter((o) => !o.lead || o.odst.length < 3 || !(o.ly > 0)).length,
    lysrc: L.filter((o) => !o.src[o.lysrc]).length,
  };
});
ok(d.n === 19, `19 objektů (${d.n})`);
ok(d.miss === 0, `všechny obrázky existují (${d.files} souborů, chybí ${d.miss})`);
ok(d.bezFot === 0 && d.bezAut === 0, 'každý objekt má fotografii, každá fotografie autora, licenci a odkaz');
ok(d.bezZdr === 0 && d.lysrc === 0, 'každý objekt má zdroje (https) a vzdálenost má svůj zdroj');
ok(d.bezTxt === 0, 'každý objekt má úvod, tři odstavce a vzdálenost');

console.log('výchozí stav a nabídka');
let s = await st();
ok(!s.on && s.vis.length === 0, 'vrstva je po startu vypnutá');
ok(
  await page.evaluate(() => {
    const b = document.querySelector('#more [data-a="ds"]');
    return !!b && getComputedStyle(b).display !== 'none';
  }),
  'položka v nabídce ☰ existuje (dospělé rozhraní)'
);
await page.evaluate(() => S200.ui.toggle('#more', true));
await page.evaluate(() => document.querySelector('#more [data-a="ds"]').click());
s = await st();
ok((await isOn('#ds')) && s.on && !(await isOn('#more')), 'klik v nabídce otevře seznam a zapne vrstvu');
ok((await page.evaluate(() => document.querySelectorAll('#ds-list button').length)) === 19, 'seznam má 19 položek');
await frames(4);
await snimek('1_seznam');

console.log('ukázat na obloze (ze seznamu)');
const W = page.viewportSize();
/* objekt má být tam, kam ho modul chtěl dostat (počítač: střed obrazu; telefon: střed plochy nad kartou), a nesmí ho nic zakrývat */
const TOL = phone ? 30 : 6;
const mereni = (id) =>
  page.evaluate((id) => {
    const s = S200.obloha.state(),
      o = s.vis.find((v) => v.id === id);
    if (!o) return { d: 1e9 };
    const el = document.elementFromPoint(o.x, o.y);
    return { d: Math.hypot(o.x - s.want.x, o.y - s.want.y), volno: !!el && el.id === 'gl', lp: S200.S.cam.lp, y: o.y };
  }, id);
const kontrola = async (id, kde) => {
  await klid();
  await frames(3);
  const r = await mereni(id);
  ok(
    r.d < TOL && r.volno,
    `${kde}: ${id} na místě a nezakrytý (odchylka ${r.d > 1e8 ? '–' : r.d.toFixed(1)} px, odklon ${(r.lp || 0).toFixed(2)} rad)`
  );
  return r;
};
await page.evaluate(() => document.querySelector('#ds-list [data-o="m31"]').click());
ok((await isOn('#dsc')) && !(await isOn('#ds')), 'klik v seznamu otevře kartu a zavře seznam');
await kontrola('m31', 'výchozí pohled');
await snimek('2_karta_m31');
/* všech 19 objektů z několika míst: od přehledu soustavy po těsnou blízkost tělesa */
const AU = 149597870.7;
for (const [telo, alt] of [
  ['earth', 40000],
  ['jupiter', 900],
  ['sun', 42 * AU],
  ['saturn', 400000],
]) {
  await page.evaluate(
    ([telo, alt]) => {
      const S = S200.S;
      S.jump(S200.sim.idx.get(telo));
      S.cam.alt = S.cam.altT = alt;
      S200.obloha.on(true);
      S.wake();
    },
    [telo, alt]
  );
  let zle = 0;
  const ids = await page.evaluate(() => S200.obloha.ids());
  for (const id of ids) {
    await page.evaluate(
      (id) => S200.obloha.aim(id, true),
      id
    ); /* bez animace: ve zkoušce bez grafické karty by 76 přeletů trvalo čtvrt hodiny */
    await frames(2);
    const r = await mereni(id);
    if (!(r.d < TOL && r.volno)) {
      zle++;
      console.log(
        `       ${telo}: ${id} ${r.d > 1e8 ? 'není vidět' : 'odchylka ' + r.d.toFixed(1) + ' px' + (r.volno ? '' : ', zakrytý oknem')}`
      );
    }
  }
  ok(
    zle === 0,
    `u tělesa ${telo} (výška ${alt < 1e6 ? alt + ' km' : (alt / AU).toFixed(0) + ' AU'}) přijde všech 19 objektů na místo, žádný není za tělesem ani pod oknem`
  );
}

console.log('klik a dvojklik na obloze');
await page.evaluate(() => {
  const S = S200.S;
  S.jump(S200.sim.idx.get('earth'));
  S.cam.alt = S.cam.altT = 60000;
  S200.obloha.card('m42');
  S200.obloha.aim('m42');
});
await klid();
await frames(3);
s = await st();
const m42 = s.vis.find((v) => v.id === 'm42'),
  kun = s.vis.find((v) => v.id === 'kun');
ok(!!m42 && !!kun, 'u M 42 je v záběru i Koňská hlava (dva objekty blízko sebe)');
ok(s.saved, 'pohled před ukázáním je zapamatovaný');
if (phone) await page.touchscreen.tap(kun.x, kun.y);
else await page.mouse.click(kun.x, kun.y);
await frames(2);
ok(
  (await isOn('#dsc')) && (await page.evaluate(() => document.querySelector('#dsc h3').textContent)) === 'Koňská hlava',
  'klik na objekt otevře jeho kartu (Koňská hlava, ne sousední M 42)'
);
ok(
  await page.evaluate(() => {
    const t = document.querySelector('#dsc').textContent;
    return /Vzdálenost/.test(t) && /Souhvězdí/.test(t) && document.querySelectorAll('#dsc img').length === 2;
  }),
  'karta má vzdálenost, souhvězdí, výřez z naší oblohy a fotografii'
);
await snimek('3_karta_obloha');
s = await st();
const m = s.vis.find((v) => v.id === 'm42');
if (phone) {
  await page.touchscreen.tap(m.x, m.y);
  await page.touchscreen.tap(m.x, m.y);
} else await page.mouse.dblclick(m.x, m.y);
await frames(2);
ok(
  (await isOn('#dsk')) &&
    (await page.evaluate(() => document.querySelector('#dsk h3').textContent)) === 'Velká mlhovina v Orionu',
  'dvojklik na objekt otevře velkou kartu'
);
ok(!(await isOn('#dsc')), 'velká karta zavřela malou (jedno okno naráz)');
await page.waitForFunction(
  () => [...document.querySelectorAll('#dsk .dk-fig img')].every((i) => i.complete && i.naturalWidth > 0),
  null,
  { timeout: 60000 }
);
const k = await page.evaluate(() => {
  const e = document.querySelector('#dsk');
  return {
    zdroje: e.querySelectorAll('ol li a[href^="https://"][target="_blank"][rel~="noopener"]').length,
    fot: e.querySelectorAll('img').length,
    radky: [...e.querySelectorAll('th')].map((t) => t.textContent),
    ref: e.querySelectorAll('[data-ref]').length,
    poradi:
      e.innerHTML.indexOf('dk-fig') < e.innerHTML.indexOf('<table') &&
      e.innerHTML.indexOf('<table') < e.innerHTML.indexOf('<h4'),
    vejde: e.getBoundingClientRect().bottom <= innerHeight + 1 && e.getBoundingClientRect().top >= -1,
  };
});
ok(k.zdroje >= 4, `velká karta má odkazy na zdroje a na stránky snímků (${k.zdroje}), otevírají se v novém okně`);
ok(k.fot >= 3, `velká karta má výřez z naší oblohy a fotografie (${k.fot} obrázků)`);
ok(
  k.radky.includes('Vzdálenost od Země') && k.radky.includes('Poloha na obloze') && k.ref >= 2,
  'tabulka údajů s odkazy na zdroj u čísel'
);
ok(k.poradi, 'pořadí: nejdřív fotografie, pak údaje, pak text');
ok(k.vejde, 'velká karta se vejde na obrazovku');
await snimek('4_velka_karta');
await page.evaluate(() => document.querySelector('#dsk .dk-fig figure:nth-child(2) img').click());
ok(await isOn('#dsz'), 'klik na fotografii ji zvětší');
await snimek('5_zvetsena');
await page.keyboard.press('Escape');
ok(!(await isOn('#dsz')) && (await isOn('#dsk')), 'Esc zavře nejdřív zvětšenou fotografii');
await page.evaluate(() => document.querySelector('#dsk [data-c="next"]').click());
ok(
  (await page.evaluate(() => document.querySelector('#dsk h3').textContent)) === 'Koňská hlava',
  'tlačítko „další“ listuje na následující objekt'
);
await page.evaluate(() => (document.querySelector('#dsk').scrollTop = 1e5));
await frames(2);
await snimek('6_velka_karta_zdroje');
await page.keyboard.press('Escape');
ok(!(await isOn('#dsk')), 'Esc zavře velkou kartu');

console.log('návrat pohledu, přelet, dětské rozhraní');
const pred = await page.evaluate(() => {
  const S = S200.S;
  S.jump(S200.sim.idx.get('mars'));
  S.cam.yaw = 1.1;
  S.cam.pitch = 0.3;
  S200.obloha.card('omegacen');
  S200.obloha.aim('omegacen');
  return [1.1, 0.3];
});
await klid();
ok(
  await page.evaluate(() => !!document.querySelector('#dsc [data-c="back"]')),
  'po ukázání nabízí karta „Zpět k tělesu“'
);
await page.evaluate(() => document.querySelector('#dsc [data-c="back"]').click());
await klid();
const po = await page.evaluate(() => [S200.S.cam.yaw, S200.S.cam.pitch, S200.S.cam.ly, S200.S.cam.lp]);
ok(
  Math.abs(po[0] - pred[0]) < 1e-3 && Math.abs(po[1] - pred[1]) < 1e-3 && !po[2] && !po[3],
  'návrat vrátí původní pohled na těleso'
);
await page.evaluate(() => {
  S200.obloha.big('lmc');
  S200.S.flyTo(S200.sim.idx.get('venus'));
});
ok(!(await isOn('#dsk')) && !(await isOn('#dsc')) && !(await isOn('#ds')), 'přelet k tělesu okna zavře');
await page.evaluate(() => S200.S.jump(S200.sim.idx.get('earth')));
await page.evaluate(() => S200.ui.setMode(true));
await frames(3);
s = await st();
const kid = await page.evaluate(() => {
  S200.obloha.card('m31');
  S200.obloha.big('m31');
  S200.obloha.list();
  const b = document.querySelector('#more [data-a="ds"]');
  return {
    btn: getComputedStyle(b).display,
    okna: ['#ds', '#dsc', '#dsk'].filter((s) => document.querySelector(s).classList.contains('on')).length,
    help: getComputedStyle(document.querySelector('.h-ds')).display,
  };
});
ok(
  !s.on && s.vis.length === 0 && kid.btn === 'none' && kid.okna === 0 && kid.help === 'none',
  'dětské rozhraní: žádná vrstva, položka, okno ani odstavec v nápovědě'
);
await page.evaluate(() => S200.ui.setMode(false));
ok(
  await page.evaluate(() => getComputedStyle(document.querySelector('#more [data-a="ds"]')).display !== 'none'),
  'po návratu do dospělého rozhraní je položka zpět'
);

/* ukázka úkazu má oblohu pro sebe: s otevřenou kartou úkazu se jména objektů nekreslí */
await page.evaluate(() => {
  S200.obloha.on(true);
  S200.uk.card(S200.uk.ids()[0]);
});
await frames(4);
s = await st();
ok(s.on && s.vis.length === 0 && !(await isOn('#dsc')), 'při ukázce úkazu se jména objektů schovají');
ok(
  cizi.length === 0,
  `stránka nenačítá nic z cizích serverů (${cizi.length})` + (cizi.length ? ' ' + cizi.slice(0, 3).join(' ') : '')
);
ok(errs.length === 0, `bez chyb v konzoli (${errs.length})` + (errs.length ? '\n' + errs.slice(0, 5).join('\n') : ''));
console.log(bad ? `\n${bad} CHYB` : '\nvše v pořádku');
await browser.close();
srv.close();
process.exit(bad ? 1 : 0);
