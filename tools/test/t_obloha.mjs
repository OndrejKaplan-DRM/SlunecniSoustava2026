// Objekty na obloze (verze 1.8c): mlhoviny, hvězdokupy a galaxie na fotce Mléčné dráhy.
// Hlídá: data (fotografie, náhledy, zdroje), výchozí „nenápadný“ režim (kroužky až se souhvězdími, jinak se objekt
// prozradí pod ukazatelem), klik = bublina u objektu, dvojklik = scéna objektu (rozhraní ustoupí, fotografie, údaje,
// záložky, zdroje), listování a klávesy ve scéně, návrat rozhraní i pohledu, všechny objekty jdou otevřít a vejdou se,
// přelet a dětské rozhraní, ukázka úkazu, žádné cizí servery.
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
const faze = (f, t = 60000) =>
  page
    .waitForFunction((f) => (S200.obloha.state().stage || {}).ph === f, f, { timeout: t })
    .catch(async (e) => {
      /* ať je z výpisu vidět, kde scéna uvízla */
      const q = await page.evaluate(() => {
        const s = S200.obloha.state();
        return { stage: s.stage, anim: s.anim, saved: s.saved, sel: s.sel, fly: !!S200.S.cam.fly, surf: !!S200.S.surf };
      });
      console.log(
        '  scéna nedošla do fáze „' + f + '“: ' + JSON.stringify(q) + '\n  chyby: ' + errs.slice(0, 4).join(' | ')
      );
      throw e;
    });
const zavreno = () =>
  page.waitForFunction(() => !S200.obloha.state().stage && !S200.obloha.state().anim, null, { timeout: 60000 });
const klik = (x, y) => (phone ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));
const viditelne = (sel) =>
  page.evaluate((sel) => {
    const e = document.querySelector(sel);
    if (!e) return false;
    for (let p = e; p && p !== document.documentElement; p = p.parentElement) {
      const c = getComputedStyle(p);
      if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity < 0.05) return false;
    }
    return true;
  }, sel);

console.log('data');
const d = await page.evaluate(async () => {
  const O = S200.obloha,
    L = O.ids().map((i) => O.get(i)),
    files = [];
  for (const o of L) {
    files.push(o.id + '_nase.webp');
    for (const im of o.imgs) files.push(im.f, im.t);
  }
  let miss = 0;
  for (const f of files) if (!(await fetch('sky/' + f, { method: 'HEAD' })).ok) miss++;
  return {
    n: L.length,
    files: files.length,
    miss,
    fot: L.reduce((a, o) => a + o.imgs.length, 0),
    bezFot: L.filter((o) => !o.imgs.length).length,
    bezZdr: L.filter((o) => !o.src.length || o.src.some((s) => !/^https:\/\//.test(s.u))).length,
    bezAut: L.filter((o) => o.imgs.some((im) => !im.autor || !im.lic || !/^https:\/\//.test(im.url))).length,
    bezTxt: L.filter((o) => !o.lead || !o.txt.length || !(o.ly > 0) || ![0, 1, 2].includes(o.vid)).length,
    lysrc: L.filter((o) => !o.src[o.lysrc]).length,
    bezPol: L.filter((o) => o.kref < 0).length,
    dup: L.length - new Set(L.map((o) => o.id)).size,
    hv: L.filter((o) => o.druh === 'hvezda').length,
    hvZle: L.filter(
      (o) => o.druh === 'hvezda' && (!o.iau || !/Hipparcos|Poloha/.test(o.src[0].t) || (o.sp && !o.barva))
    ).map((o) => o.id),
  };
});
await page.evaluate(() => {
  /* otisk dat: kreslení si do objektů ukládá pomocné hodnoty a nesmí přepsat žádný údaj */
  const pole = [
    'id',
    'cs',
    'ozn',
    'typ',
    'ly',
    'lyz',
    'lytxt',
    'lead',
    'txt',
    'foto',
    'mag',
    'ra',
    'de',
    'vid',
    'sp',
    'nase',
  ];
  window.otisk = () =>
    JSON.stringify(
      S200.obloha
        .ids()
        .map((i) => S200.obloha.get(i))
        .map((o) => pole.map((k) => o[k]))
    );
  window.OTISK0 = window.otisk();
});
ok(d.n >= 150 && !d.dup, `${d.n} objektů, žádný dvakrát`);
ok(
  d.hv >= 40 && d.hvZle.length === 0,
  `${d.hv} hvězd, každá s polohou z katalogu a jménem (${d.hvZle.join(', ') || 'v pořádku'})`
);
ok(d.miss === 0, `všechny obrázky existují (${d.files} souborů, ${d.fot} fotografií, chybí ${d.miss})`);
ok(d.bezFot === 0 && d.bezAut === 0, 'každý objekt má fotografii, každá fotografie autora, licenci a odkaz');
ok(
  d.bezZdr === 0 && d.lysrc === 0 && d.bezPol === 0,
  'každý objekt má zdroje (https), zdroj vzdálenosti a zdroj polohy'
);
ok(d.bezTxt === 0, 'každý objekt má úvod, text, vzdálenost a údaj, zda je na naší fotce vidět');
const vyp = await page.evaluate(() => ['lmc', 'm31', 'm42', 'stred'].map((i) => S200.obloha.zCeska(i)));
ok(
  /nikdy nevychází/.test(vyp[0]) &&
    /nikdy nezapadá/.test(vyp[1]) &&
    /nejvýš 35°.*v lednu/.test(vyp[2]) &&
    /těsně nad jižní obzor \(nejvýš 11°\)/.test(vyp[3]),
  'viditelnost z Česka se počítá správně (LMC, M 31, M 42, střed Galaxie)'
);

console.log('nenápadný režim');
await page.evaluate(() => {
  const S = S200.S;
  S.jump(S200.sim.idx.get('earth'));
  S.cam.alt = S.cam.altT = 60000;
  S200.obloha.fast(true);
  window.V0 = [S.cam.yaw, S.cam.pitch, S.cam.lp];
  S200.obloha.aim('m42');
});
await frames(5);
let s = await st();
ok(s.mode === 1 && s.live && !s.shown, 'po startu: vrstva žije, ale nic se trvale nekreslí (souhvězdí jsou vypnutá)');
const m42 = s.vis.find((v) => v.id === 'm42'),
  kun = s.vis.find((v) => v.id === 'kun');
ok(!!m42 && !!kun, 'M 42 i Koňská hlava jsou v záběru');
if (!phone) {
  await page.mouse.move(m42.x + 2, m42.y + 1);
  await frames(3);
  s = await st();
  ok(
    s.hov === 'm42' &&
      (await isOn('#dsr')) &&
      (await page.evaluate(() => document.querySelector('#dsr span').textContent)) === 'Velká mlhovina v Orionu',
    'ukazatel nad objektem ho prozradí: kroužek a jméno'
  );
  await page.mouse.move(40, 300);
  await frames(3);
  ok(!(await st()).hov && !(await isOn('#dsr')), 'po odjetí ukazatele kroužek zmizí');
}
await page.evaluate(() => (S200.S.conMode = 2));
await frames(4);
s = await st();
ok(s.shown && s.vis.some((v) => v.lab), 'se souhvězdími se ukážou kroužky se jmény');
ok(
  /kroužky/.test(await page.evaluate(() => document.querySelector('#toast').textContent)),
  'při prvním zapnutí souhvězdí krátké vysvětlení'
);
await snimek('1_krouzky');

console.log('klik = bublina, dvojklik = scéna');
await klik(kun.x, kun.y);
await frames(3);
s = await st();
ok(
  s.sel === 'kun' &&
    (await isOn('#dsb')) &&
    (await page.evaluate(() => document.querySelector('#dsb b').textContent)) === 'Koňská hlava',
  'klik na objekt ukáže bublinu se jménem (Koňská hlava, ne sousední M 42)'
);
const bub = await page.evaluate(() => {
  const r = document.querySelector('#dsb').getBoundingClientRect();
  return (
    r.left >= 0 &&
    r.top >= 0 &&
    r.right <= innerWidth &&
    r.bottom <= innerHeight &&
    !!document.querySelector('#dsb [data-c="go"]')
  );
});
ok(bub, 'bublina je celá na obrazovce a nabízí „Přiblížit“');
await snimek('2_bublina');
const volne = await page.evaluate(() => {
  /* místo na plátně, kde není objekt, těleso ani okno */
  for (let y = 120; y < innerHeight - 200; y += 24)
    for (let x = 20; x < innerWidth - 20; x += 24) {
      const e = document.elementFromPoint(x, y);
      if (e && e.id === 'gl' && !S200.obloha.near(x, y) && S200.S.pick(x, y) < 0) return [x, y];
    }
  return [20, 130];
});
await klik(volne[0], volne[1]);
await frames(3);
ok(!(await st()).sel && !(await isOn('#dsb')), 'klik jinam bublinu zavře');
/* skutečná animace: dvojklik, přiblížení, texty */
await page.evaluate(() => S200.obloha.fast(false));
const pred = await page.evaluate(() => window.V0); /* pohled před natočením na oblohu */
if (phone) {
  /* na dotyku: ťuknutí ukáže bublinu, tlačítko „Přiblížit“ otevře scénu (dvojí ťuknutí emulace nestihne: mezi dvěma
     ťuknutími vykreslí pomalý snímek a interval přeroste 420 ms) */
  await page.touchscreen.tap(m42.x, m42.y);
  await frames(3);
  await page.tap('#dsb [data-c="go"]');
} else await page.mouse.dblclick(m42.x, m42.y);
await page.waitForFunction(() => !!S200.obloha.state().stage, null, { timeout: 20000 });
ok(
  await page.evaluate(() => document.body.classList.contains('ds-stage')),
  phone ? 'ťuknutí a „Přiblížit“ otevře scénu objektu' : 'dvojklik otevře scénu objektu'
);
await faze('open', 120000);
await page.waitForTimeout(1200);
s = await st();
ok(
  s.stage.id === 'm42' &&
    (await page.evaluate(() => document.querySelector('#dss h2').textContent)) === 'Velká mlhovina v Orionu',
  'scéna patří objektu, na který se kliklo'
);
ok(
  !(await viditelne('#dockwrap')) && !(await viditelne('#top')) && !(await viditelne('#card')),
  'hlavní rozhraní během scény ustoupí'
);
const sc = () =>
  page.evaluate(() => {
    const q = (s) => document.querySelector(s),
      L = q('.ss-lens').getBoundingClientRect(),
      R = q('.ss-right').getBoundingClientRect(),
      C = q('.ss-cap').getBoundingClientRect(),
      im = q('.ss-lens img.ph'),
      W = innerWidth,
      H = innerHeight;
    return {
      lens: L.width > 100 && L.left >= 0 && L.top >= 0 && L.right <= W + 1 && L.bottom <= H + 1,
      foto: im.complete && im.naturalWidth > 0 && +getComputedStyle(im).opacity > 0.95,
      vedle: R.left >= L.right - 1 || R.top >= L.bottom - 1 /* text je vedle fotografie, nebo pod ní */,
      popisek: C.top >= L.bottom - 2 && C.top - L.bottom < 40 && /CC BY|NASA/.test(q('.ss-cap').textContent),
      texty: +getComputedStyle(q('.ss-right h2')).opacity > 0.95,
      dlazdice: [...document.querySelectorAll('.ss-tiles small')].map((e) => e.textContent),
      zavrit: !!q('.ss-top [data-c="x"]') && q('.ss-x').getBoundingClientRect().width >= 30,
      pravy: R.right <= W + 1 && R.bottom <= H + 1,
    };
  });
let v = await sc();
ok(v.lens && v.foto, 'fotografie je načtená, ostrá a celá na obrazovce');
ok(v.vedle && v.pravy && v.texty, 'texty jsou vedle fotografie (na telefonu pod ní) a vejdou se');
ok(v.popisek, 'popisek s autorem a licencí sedí hned pod fotografií');
ok(
  (await page.evaluate(() => document.querySelector('.ss-tiles b').textContent.replace(/\s/g, ''))) === '1350',
  'dlaždice ukazuje správnou vzdálenost (1 350 sv. let)'
);
ok(
  v.dlazdice.includes('vzdálenost') && v.dlazdice.includes('souhvězdí') && v.zavrit,
  'dlaždice se základními údaji a zavírací tlačítko'
);
await snimek('3_scena');
await page.evaluate(() => S200.obloha.fast(true));
await page.evaluate(() => document.querySelector('#dss .ss-th [data-i="1"]').click());
await page.waitForTimeout(300);
ok(
  (await st()).stage.ii === 1 && /VST/.test(await page.evaluate(() => document.querySelector('.ss-cap').textContent)),
  'náhled přepne fotografii i popisek'
);
await page.evaluate(() => document.querySelector('#dss [data-t="kde"]').click());
const kde = await page.evaluate(() => {
  const b = document.querySelector('.ss-body');
  return {
    sky: !!b.querySelector('.ss-sky i'),
    our: !!b.querySelector('.ss-our img'),
    cz: /Z Česka/.test(b.textContent),
    lad: !!b.querySelector('.ss-lad s'),
    poloha: /rektascenze 5 h 35 min/.test(b.textContent),
  };
});
ok(
  kde.sky && kde.our && kde.cz && kde.lad && kde.poloha,
  'záložka „Kde to je“: celá obloha, výřez z naší fotky, viditelnost z Česka, stupnice vzdáleností'
);
await snimek('4_kde');
await page.evaluate(() => document.querySelector('.ss-tiles [data-ref]').click());
const zdr = await page.evaluate(() => ({
  tab: S200.obloha.state().stage.tab,
  n: document.querySelectorAll('.ss-body ol li a[href^="https://"][target="_blank"][rel~="noopener"]').length,
}));
ok(zdr.tab === 'zdr' && zdr.n >= 4, `číslo u údaje vede na záložku „Zdroje“ (${zdr.n} odkazů do nového okna)`);
await snimek('5_zdroje');
if (!phone) {
  const fo = await page.evaluate(() => S200.S.focus);
  await page.keyboard.press('1');
  await page.keyboard.press('o');
  ok((await page.evaluate(() => S200.S.focus)) === fo, 'klávesové zkratky aplikace pod scénou nereagují');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);
  ok((await st()).stage.id === 'kun', 'šipka vpravo listuje na další objekt');
}
await page.evaluate(() => document.querySelector('#dss [data-c="prev"]').click());
await page.waitForTimeout(300);
await page.evaluate(() => document.querySelector('.ss-lens').click());
ok(
  await page.evaluate(
    () =>
      document.querySelector('#dss').classList.contains('foto') &&
      getComputedStyle(document.querySelector('.ss-right')).display === 'none'
  ),
  'klik na fotografii ji roztáhne přes celou plochu'
);
await page.keyboard.press('Escape');
ok(
  await page.evaluate(() => !document.querySelector('#dss').classList.contains('foto') && !!S200.obloha.state().stage),
  'Esc nejdřív vrátí fotografii'
);
await page.evaluate(() => S200.obloha.fast(false));
await page.keyboard.press('Escape');
await zavreno();
await page.waitForTimeout(900);
ok(
  !(await page.evaluate(() => document.body.classList.contains('ds-stage'))) &&
    (await viditelne('#dockwrap')) &&
    (await viditelne('#top')),
  'Esc scénu zavře a hlavní rozhraní je zpět'
);
const po = await page.evaluate(() => [S200.S.cam.yaw, S200.S.cam.pitch, S200.S.cam.lp]);
ok(
  po.every((x, i) => Math.abs(Math.atan2(Math.sin(x - pred[i]), Math.cos(x - pred[i]))) < 2e-3),
  'po zavření se pohled vrátí tam, kde byl před natočením na oblohu'
);

console.log('seznam a všechny objekty');
await page.evaluate(() => S200.obloha.fast(true));
await page.evaluate(() => S200.ui.toggle('#more', true));
await page.evaluate(() => document.querySelector('#more [data-a="ds"]').click());
ok(
  (await isOn('#ds')) && (await page.evaluate(() => document.querySelectorAll('#ds-list button').length)) === d.n,
  `položka v nabídce ☰ otevře seznam všech ${d.n} objektů`
);
await frames(3);
await snimek('6_seznam');
const yp = await page.evaluate(() => {
  const S = S200.S;
  S.jump(S200.sim.idx.get('mars'));
  S.cam.yaw = 1.1;
  S.cam.pitch = 0.3;
  S200.obloha.list();
  document.querySelector('#ds-list [data-o="omegacen"]').click();
  return [1.1, 0.3];
});
await faze('open');
ok((await st()).stage.id === 'omegacen', 'klik v seznamu objekt přiblíží, i když nebyl v záběru');
await page.evaluate(() => S200.obloha.close());
await zavreno();
const zp = await page.evaluate(() => [S200.S.cam.yaw, S200.S.cam.pitch, S200.S.cam.ly, S200.S.cam.lp]);
ok(
  Math.abs(zp[0] - yp[0]) < 1e-3 && Math.abs(zp[1] - yp[1]) < 1e-3 && !zp[2] && !zp[3],
  'po zavření se pohled vrátí k tělesu'
);
let zle = [];
for (const [telo, alt] of [
  ['earth', 40000],
  ['jupiter', 900],
]) {
  await page.evaluate(
    ([telo, alt]) => {
      const S = S200.S;
      S.jump(S200.sim.idx.get(telo));
      S.cam.alt = S.cam.altT = alt;
      S.wake();
    },
    [telo, alt]
  );
  for (const id of await page.evaluate(() => S200.obloha.ids())) {
    await page.evaluate((id) => S200.obloha.open(id), id);
    try {
      await faze('open', 30000);
    } catch (e) {
      zle.push(`${telo}:${id} neotevřeno`);
      await page.evaluate(() => S200.obloha.close(true));
      continue;
    }
    const r = await page.evaluate((id) => {
      const o = S200.obloha.state().vis.find((v) => v.id === id),
        L = document.querySelector('.ss-lens').getBoundingClientRect(),
        R = document.querySelector('.ss-right').getBoundingClientRect(),
        im = document.querySelector('.ss-lens img.ph');
      return {
        vis: !!o,
        lens: L.width > 80 && L.left >= 0 && L.top >= 0 && L.right <= innerWidth + 1 && L.bottom <= innerHeight + 1,
        foto: im.complete && im.naturalWidth > 0,
        vedle: R.left >= L.right - 1 || R.top >= L.bottom - 1,
      };
    }, id);
    if (!(r.vis && r.lens && r.foto && r.vedle)) zle.push(`${telo}:${id} ${JSON.stringify(r)}`);
    await page.evaluate(() => S200.obloha.close(true));
  }
}
ok(
  zle.length === 0,
  `všech ${d.n} objektů jde přiblížit od Země i těsně od Jupiteru: objekt není za tělesem, fotografie se vejde a nepřekrývá text` +
    (zle.length ? '\n       ' + zle.slice(0, 6).join('\n       ') : '')
);

console.log('jména bez překryvů, hvězdy, hledání, pohled z povrchu');
{
  /* šest pohledů z dálky: jména objektů se nesmějí překrývat mezi sebou, se jmény těles, hvězd ani souhvězdí */
  const prekryvy = await page.evaluate(async () => {
    const S = S200.S,
      O = S200.obloha,
      out = [];
    const snimky = (n) =>
      new Promise((r) => {
        const f = () => {
          S.wake();
          --n > 0 ? requestAnimationFrame(f) : r();
        };
        requestAnimationFrame(f);
      });
    O.mode(2);
    S.jump(S200.sim.idx.get('earth'));
    S.cam.alt = S.cam.altT = 3e7;
    for (const [con, names, yaw, pitch] of [
      [3, true, 0.4, 0.2],
      [3, true, 2.6, -0.3],
      [2, false, 4.4, 0.6],
      [3, true, 5.5, -0.9],
      [3, true, 4.567, 0.2527] /* Střelec: nejhustší místo oblohy */,
      [3, true, 1.693, 0.7405] /* Orion */,
    ]) {
      S.conMode = con;
      S.starNames = names;
      S.cam.yaw = yaw;
      S.cam.pitch = pitch;
      S.cam.ly = S.cam.lp = 0;
      await snimky(2);
      await new Promise((r) => setTimeout(r, 700)); /* okna se čtou dvakrát za sekundu: počkat na ustálený stav */
      await snimky(3);
      const V = O.state().vis.filter((v) => v.box),
        okna = [...document.querySelectorAll('.panel, #mini')]
          .filter(
            (el) =>
              el.clientWidth &&
              el.clientHeight &&
              getComputedStyle(el).visibility !== 'hidden' &&
              +getComputedStyle(el).opacity > 0.05
          )
          .map((el) => [el.id, el.getBoundingClientRect()])
          .filter(([, r]) => r.width > 4 && r.height > 4)
          .map(([id, r]) => [r.left, r.top, r.right, r.bottom, id]),
        cizi = [...(S.labRects || []), ...(con === 3 || names ? S.skyRects || [] : []), ...okna],
        x = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
      let n = 0;
      const kdo = [];
      for (let i = 0; i < V.length; i++) {
        for (let j = i + 1; j < V.length; j++) if (x(V[i].box, V[j].box)) (n++, kdo.push(V[i].id + '×' + V[j].id));
        for (const q of cizi) if (x(V[i].box, q)) (n++, kdo.push(V[i].id + '×' + (q[4] || 'jméno')));
      }
      /* hvězda, kterou právě popisuje engine („Jména hvězd“), nesmí mít druhé jméno z této vrstvy */
      const dvakrat = names ? V.filter((v) => O.get(v.id).eng).length : 0;
      out.push({ jmen: V.length, carek: V.filter((v) => v.lead).length, n, kdo, dvakrat, hvezd: cizi.length });
    }
    S.conMode = 0;
    S.starNames = false;
    O.mode(1);
    return out;
  });
  ok(
    prekryvy.every((p) => p.n === 0) && prekryvy.reduce((a, p) => a + p.jmen, 0) >= (phone ? 12 : 24),
    'jména objektů se nepřekrývají mezi sebou, se jmény těles, hvězd a souhvězdí ani s okny rozhraní (' +
      prekryvy
        .map((p) => `${p.jmen} jmen, ${p.carek} s čárkou, ${p.n} překryvů` + (p.n ? ' ' + p.kdo.join(' ') : ''))
        .join('; ') +
      ')'
  );
  ok(
    prekryvy.every((p) => p.dvakrat === 0),
    'hvězdu, kterou popisuje tlačítko „Jména hvězd“, tato vrstva nepopisuje podruhé'
  );
  /* hledání v seznamu */
  const hled = await page.evaluate(() => {
    const O = S200.obloha,
      q = document.querySelector('#ds-q'),
      pocet = () => document.querySelectorAll('#ds-list [data-o]').length;
    if (!document.querySelector('#ds').classList.contains('on')) O.list();
    const vse = pocet();
    const zkus = (t) => {
      q.value = t;
      q.dispatchEvent(new Event('input'));
      return [...document.querySelectorAll('#ds-list [data-o]')].map((b) => b.dataset.o);
    };
    const a = zkus('sirius'),
      b = zkus('m 42'),
      c = zkus('labut'),
      d = zkus('xyzq');
    zkus('');
    const zpet = pocet();
    S200.ui.toggle('#ds', false);
    return { vse, a, b, c: c.length, d: d.length, zpet };
  });
  ok(
    hled.vse === d.n &&
      hled.a.join() === 'sirius' &&
      hled.b.includes('m42') &&
      hled.c >= 4 &&
      hled.d === 0 &&
      hled.zpet === d.n,
    `hledání v seznamu: „sirius“ → ${hled.a.length}, „m 42“ → ${hled.b.length}, „labut“ (bez háčků) → ${hled.c}, nesmysl → ${hled.d}`
  );
  /* scéna hvězdy: dlaždice se spektrální třídou a vzdálenost s desetinným místem */
  await page.evaluate(() => {
    S200.obloha.fast(true);
    S200.obloha.open('sirius');
  });
  await faze('open');
  const hv = await page.evaluate(() => ({
    t: document.querySelector('.ss-tiles').textContent,
    kick: document.querySelector('.ss-kick').textContent,
    fot: document.querySelectorAll('.ss-th button').length,
  }));
  ok(
    /8,6/.test(hv.t) && /spektrální třída/.test(hv.t) && /−1,44/.test(hv.t) && /Hvězdy/.test(hv.kick) && hv.fot === 2,
    'scéna hvězdy: vzdálenost 8,6 sv. l., jasnost −1,44 mag, spektrální třída, snímek a mapa okolí'
  );
  await page.evaluate(() => S200.obloha.close(true));
  /* pohled z povrchu: objekt nad obzorem se natočí a po zavření se pozorovatel otočí zpět; objekt pod obzorem pohled nemění */
  if (!phone) {
    const pv = await page.evaluate(async () => {
      const S = S200.S,
        O = S200.obloha;
      const snimky = (n) =>
        new Promise((r) => {
          const f = () => {
            S.wake();
            --n > 0 ? requestAnimationFrame(f) : r();
          };
          requestAnimationFrame(f);
        });
      const ceka = (f) =>
        new Promise((r) => {
          const t = () => ((O.state().stage || {}).ph === f ? r() : setTimeout(t, 60));
          t();
        });
      S200.povrch.enter(S200.sim.idx.get('moon'), 10, 20, { quiet: true });
      await snimky(4);
      const b = S.surfBasis(),
        el = (id) => Math.asin(O.get(id).v.dot(b.n)),
        /* objekt nad obzorem, který není v záběru (ten, který v záběru je, se podle návrhu neotáčí); 2.1: s rotací Měsíce podle
           IAU 2015 padl první kandidát (omegacen) přímo do záběru */
        nad = O.ids().find((i) => el(i) > 0.35 && el(i) < 1.2 && !O.state().vis.some((v) => v.id === i)),
        pod = O.ids().find((i) => el(i) < -0.3),
        q = S.surf,
        a0 = [q.az, q.el];
      O.open(nad);
      await ceka('open');
      await snimky(3);
      const vNad = O.state().vis.some((v) => v.id === nad),
        otoceno = Math.abs(q.az - a0[0]) + Math.abs(q.el - a0[1]) > 0.01;
      O.close();
      await snimky(4);
      const zpet = Math.abs(q.az - a0[0]) < 1e-3 && Math.abs(q.el - a0[1]) < 1e-3;
      O.open(pod);
      await ceka('open');
      const beze = Math.abs(q.az - a0[0]) < 1e-3 && Math.abs(q.el - a0[1]) < 1e-3,
        podVis = O.state().vis.some((v) => v.id === pod);
      O.close(true);
      const stale = !!S.surf;
      S200.povrch.exit();
      await snimky(3);
      return { nad, pod, vNad, otoceno, zpet, beze, podVis, stale };
    });
    ok(
      pv.vNad && pv.otoceno && pv.zpet && pv.beze && !pv.podVis && pv.stale,
      `pohled z povrchu Měsíce: ${pv.nad} nad obzorem se natočí a po zavření se pohled vrátí; ${pv.pod} pod obzorem pohled nemění ` +
        JSON.stringify(pv)
    );
  }
  await page.evaluate(() => S200.obloha.fast(true));
}

console.log('režimy, přelet, dětské rozhraní, úkaz');
await page.evaluate(() => {
  S200.S.jump(S200.sim.idx.get('earth'));
  S200.obloha.list();
  document.querySelector('#ds .ds-mode [data-m="0"]').click();
});
await frames(3);
s = await st();
ok(s.mode === 0 && !s.live && !s.shown && s.vis.length === 0, 'režim „Vypnuto“ vrstvu úplně vypne');
await page.evaluate(() => document.querySelector('#ds .ds-mode [data-m="2"]').click());
await page.evaluate(() => (S200.S.conMode = 0));
await frames(3);
ok((await st()).shown, 'režim „Stále vidět“ kreslí kroužky i bez souhvězdí');
await page.evaluate(() => {
  S200.obloha.mode(1);
  S200.obloha.aim('m42');
  S200.obloha.sel('m42');
  S200.S.flyTo(S200.sim.idx.get('venus'));
});
ok(!(await isOn('#dsb')) && !(await isOn('#ds')), 'přelet k tělesu zavře seznam i bublinu');
await page.evaluate(() => S200.S.jump(S200.sim.idx.get('earth')));
await page.evaluate(() => S200.ui.setMode(true));
await frames(3);
s = await st();
const kid = await page.evaluate(() => {
  S200.obloha.open('m31');
  S200.obloha.list();
  const b = document.querySelector('#more [data-a="ds"]');
  return {
    btn: getComputedStyle(b).display,
    okna: document.querySelector('#ds').classList.contains('on') || !!S200.obloha.state().stage,
    help: getComputedStyle(document.querySelector('.h-ds')).display,
  };
});
ok(
  !s.live && s.vis.length === 0 && kid.btn === 'none' && !kid.okna && kid.help === 'none',
  'dětské rozhraní: žádná vrstva, položka, scéna ani odstavec v nápovědě'
);
await page.evaluate(() => S200.ui.setMode(false));
ok(
  await page.evaluate(() => getComputedStyle(document.querySelector('#more [data-a="ds"]')).display !== 'none'),
  'po návratu do dospělého rozhraní je položka zpět'
);
await page.evaluate(() => {
  S200.S.conMode = 2;
  S200.uk.card(S200.uk.ids()[0]);
});
await frames(4);
s = await st();
ok(!s.live && s.vis.length === 0, 'při ukázce úkazu se objekty na obloze schovají');
/* data se za běhu nesmí změnit (kreslení si do objektů ukládá polohy jmen) */
const neporusena = await page.evaluate(() => {
  const O = S200.obloha;
  return (
    O.get('m42').ly === 1350 &&
    O.get('kun').ly === 1300 &&
    O.get('m31').ly === 2500000 &&
    O.get('sirius').ly === 8.6 &&
    O.ids().every((i) => O.get(i).ly >= 4) &&
    O.ids().every((i) => typeof O.get(i).lead === 'string' && O.get(i).lead.length > 20) &&
    window.otisk() === window.OTISK0
  );
});
ok(neporusena, 'údaje objektů (vzdálenosti, texty, polohy) zůstaly po celé zkoušce nezměněné');
ok(
  cizi.length === 0,
  `stránka nenačítá nic z cizích serverů (${cizi.length})` + (cizi.length ? ' ' + cizi.slice(0, 3).join(' ') : '')
);
ok(errs.length === 0, `bez chyb v konzoli (${errs.length})` + (errs.length ? '\n' + errs.slice(0, 5).join('\n') : ''));
console.log(bad ? `\n${bad} CHYB` : '\nvše v pořádku');
await browser.close();
srv.close();
process.exit(bad ? 1 : 0);
