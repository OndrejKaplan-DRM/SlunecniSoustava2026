// Rozložení na velkých a neobvyklých displejích (verze 1.7): 4K plocha, televize se zvětšením systému 300–400 %,
// malé okno na počítači, přetažení okna z notebooku na velkou plochu.
// Hlídá: počítač (ani s dotykem) nedostane sám telefonní ani tabletové rozložení, seznam těles nezabere celou šířku,
// karta zůstane u pravého okraje, vykreslovaných bodů není víc než strop, podrobné mapy se na „televizi“ načtou.
// Použití: node tools/test/t_displej.mjs [složka pro snímky]   (běží několik minut; nepouštět souběžně s jinými testy)
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
  out = process.argv[2] || '/tmp/displej';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
let bad = 0;
const errs = [];
const ok = (c, t) => {
  if (!c) {
    bad++;
    console.log('FAIL ' + t);
  }
};
const stav = (p) =>
  p.evaluate(() => {
    const r = (s) => {
      const e = document.querySelector(s);
      if (!e) return null;
      const q = e.getBoundingClientRect();
      return [q.x | 0, q.y | 0, q.width | 0, q.height | 0];
    };
    const c = document.querySelector('canvas');
    return {
      cls: document.body.className,
      bk: +document.body.style.getPropertyValue('--bk'),
      win: [innerWidth, innerHeight, devicePixelRatio],
      q: S200.S.quality,
      list: r('#list'),
      li: r('#list .li'),
      card: r('#card'),
      dock: r('#dock'),
      px: c.width * c.height,
    };
  });
async function otevri(w, h, dpr, dotyk) {
  /* dotyk = dotykový displej u počítače: myš zůstává, proto se nesmí emulovat mobilní zařízení (isMobile) */
  const c = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, hasTouch: !!dotyk });
  const p = await c.newPage();
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:${port}/`);
  await p.waitForFunction(() => window.S200);
  await p.evaluate(() => {
    localStorage.clear();
    document.querySelector('#sp-adult').click();
    document.querySelector('#sp-go').click();
  });
  await p.waitForFunction(() => !document.querySelector('#splash.on'), null, { timeout: 120000 });
  return [c, p];
}
async function zkontroluj(p, tag) {
  await p.evaluate(() => {
    S200.S.jump(S200.sim.idx.get('saturn')); /* dlouhá karta */
    if (!document.querySelector('#list.on')) document.querySelector('[data-a="list"]').click();
  });
  await p.waitForTimeout(3500);
  const s = await stav(p),
    [W, H] = s.win;
  console.log(
    tag,
    JSON.stringify(s).replace(/"cls":"[^"]*"/, '"cls":"' + s.cls.replace(/(no|f)-\S+/g, '').trim() + '"')
  );
  ok(!/\b(mob|tab)\b/.test(s.cls), tag + ': počítač dostal rozložení telefonu nebo tabletu (' + s.cls + ')');
  ok(s.list && s.list[2] < W * 0.45, tag + ': seznam těles je přes ' + Math.round((100 * s.list[2]) / W) + ' % šířky');
  ok(s.li && s.li[3] >= 14, tag + ': řádek seznamu je nízký (' + (s.li && s.li[3]) + ' px)');
  ok(s.card && s.card[0] > W * 0.5 && s.card[2] < W * 0.5, tag + ': karta není u pravého okraje ' + s.card);
  ok(s.card && s.card[3] > H * 0.3, tag + ': karta je zhroucená na výšku ' + (s.card && s.card[3]));
  ok(s.card && s.dock && s.card[1] + s.card[3] <= s.dock[1] + 2, tag + ': karta zajíždí pod dolní lištu');
  ok(
    s.dock && s.dock[1] > H * 0.6 && s.dock[0] >= 0 && s.dock[0] + s.dock[2] <= W + 2,
    tag + ': dolní lišta mimo okno'
  );
  ok(s.px <= 4.4e6 * 1.06, tag + ': vykresluje se ' + (s.px / 1e6).toFixed(1) + ' Mpx (strop 4,4)');
  await p.screenshot({ path: `${out}/${tag}.jpg`, type: 'jpeg', quality: 70 });
}
/* pevné sestavy: [jméno, šířka, výška v bodech CSS, zvětšení systému, dotykový displej].
   Počítač s dotykovým displejem A myší tu vyzkoušet nejde: emulovaný dotyk v Playwrightu odebere jemný ukazatel,
   takže se stránce jeví jako tablet bez myši. */
for (const [tag, w, h, dpr, dotyk] of [
  ['4k_100', 4096, 2000, 1, 0],
  ['tv_300', 1365, 640, 3, 0],
  ['tv_400', 1024, 440, 4, 0],
  ['male_okno', 660, 500, 3, 0],
]) {
  const [c, p] = await otevri(w, h, dpr, dotyk);
  await zkontroluj(p, tag);
  if (tag === 'tv_400') {
    /* na „televizi“ se musí dát dostat k detailům: podrobná mapa Venuše (povrch pod mraky) a Merkuru */
    for (const id of ['venus', 'mercury']) {
      await p.evaluate((id) => S200.S.jump(S200.sim.idx.get(id)), id);
      await p.waitForTimeout(1500);
      for (let k = 0; k < 3; k++) {
        await p.evaluate(() => document.querySelector('#card [data-a="close"]').click());
        await p.waitForTimeout(2500);
      }
      let hi = false;
      for (let k = 0; k < 25 && !hi; k++) {
        await p.waitForTimeout(2000);
        hi = await p.evaluate(() => !!S200.S.R[S200.S.focus].hi);
      }
      ok(hi, 'tv_400: podrobná mapa ' + id + ' se nenačetla');
    }
  }
  await c.close();
}
/* přetažení okna: notebook → úzké okno → velká plocha → zpět; rozložení se musí pokaždé přepočítat */
{
  const [c, p] = await otevri(1500, 800, 1, 0);
  let k = 0;
  for (const [w, h] of [
    [1500, 800],
    [520, 760],
    [4096, 2000],
    [640, 400],
    [1365, 640],
    [4096, 2000],
  ]) {
    await p.setViewportSize({ width: w, height: h });
    await p.waitForTimeout(1500);
    await zkontroluj(p, `presun${k++}_${w}x${h}`);
  }
  await c.close();
}
ok(!errs.length, 'chyby stránky: ' + errs.slice(0, 3).join(' | '));
console.log(bad ? 'CHYB: ' + bad : 'bez chyb');
await browser.close();
srv.close();
process.exit(bad ? 1 : 0);
