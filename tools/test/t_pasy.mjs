// Pásy malých těles (verze 1.8a): hlavní pás planetek a Kuiperův pás.
// Hlídá: v přehledu soustavy jsou vidět, u tělesa zblízka se vytratí, tečky nejdou vybrat (klik na tečku nic nevybere),
// přepínač v nabídce je schová, při zrychleném čase se pohybují, a stránka kvůli nim nehlásí chybu shaderu.
// Použití: node tools/test/t_pasy.mjs [složka pro snímky]
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
const out = process.argv[2] || '/tmp/pasy';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const errs = [];
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
let bad = 0;
const ok = (c, t) => {
  console.log((c ? '  ok   ' : '  FAIL ') + t);
  if (!c) bad++;
};
const alfa = () => page.evaluate(() => S200.S.belts.belts.map((b) => +b.a.toFixed(3)));
const AU = 149597870.7;
/* pohled: těleso, výška v AU, sklon kamery; počká, až se průhlednost ustálí */
const pohled = async (id, altAU, pitch, yaw) => {
  await page.evaluate(
    ([id, alt, pitch, yaw]) => {
      const S = S200.S;
      S.jump(S200.sim.idx.get(id));
      S.cam.alt = S.cam.altT = alt;
      if (pitch !== null) S.cam.pitch = pitch;
      if (yaw !== null) S.cam.yaw = yaw;
      S.wake();
    },
    [id, altAU * AU, pitch ?? null, yaw ?? null]
  );
  await page.waitForTimeout(2500);
};
const snimek = (n) => page.screenshot({ path: `${out}/${n}.jpg`, type: 'jpeg', quality: 80, timeout: 180000 });
// jas plátna v prstenci kolem středu (pás je kolem Slunce): průměr přes vzorky
const stav = () => page.evaluate(() => ({ sel: S200.S.sel, toast: document.querySelector('#toast').textContent }));

await pohled('earth', 30000 / AU, null, null);
let a = await alfa();
ok(a[0] === 0 && a[1] === 0, `u Země zblízka nejsou pásy vidět (${a})`);
await snimek('1_zeme');

await pohled('sun', 7.2, 0.9, 0.6);
a = await alfa();
ok(a[0] > 0.45 && a[1] < 0.02, `přehled vnitřní soustavy: hlavní pás je vidět, Kuiperův zatím ne (${a})`);
ok(
  /pás planetek/.test((await stav()).toast),
  'při prvním spatření vysvětlení, že jde o ilustraci: ' + (await stav()).toast.slice(0, 60)
);
await snimek('2_vnitrni_soustava');

await pohled('sun', 9, 1.5, 0.6);
await snimek('3_shora');

/* tečka pásu nejde vybrat: klik do míst pásu (mimo planety) výběr nezmění */
{
  const sel0 = (await stav()).sel;
  const p = await page.evaluate(() => {
    /* bod na prstenci 2,7 AU, na obrazovce co nejdál od všech těles */
    const S = S200.S,
      R = S.R,
      W = innerWidth,
      H = innerHeight,
      pxAU = H / 2 / Math.tan((45 * Math.PI) / 360) / (9 + 0.0047);
    let best = null,
      bd = 0;
    for (let k = 0; k < 72; k++) {
      const an = (k / 72) * 6.2832,
        x = W / 2 + Math.cos(an) * 2.7 * pxAU,
        y = H / 2 + Math.sin(an) * 2.7 * pxAU;
      if (x < 300 || x > W - 360 || y < 90 || y > H - 190) continue;
      let d = 1e9;
      for (const r of R) if (r && r.sx > -1e5) d = Math.min(d, Math.hypot(r.sx - x, r.sy - y));
      if (d > bd) {
        bd = d;
        best = [x, y, d];
      }
    }
    return best;
  });
  if (p) {
    await page.mouse.click(p[0], p[1]);
    await page.waitForTimeout(400);
    ok(
      (await stav()).sel === sel0,
      `klik do pásu (${p[0] | 0}, ${p[1] | 0}; nejbližší těleso ${p[2] | 0} px) nic nevybral`
    );
  } else ok(false, 'nenašla jsem volné místo v pásu pro zkoušku kliknutí');
}

/* pohyb: čas v shaderu běží s časem modelu (tečky obíhají podle Keplerových zákonů) */
{
  const t = () => page.evaluate(() => S200.S.belts.belts[0].pts.material.uniforms.uT.value);
  await page.evaluate(() => (S200.S.paused = true));
  await page.waitForTimeout(500);
  const t0 = await t();
  await snimek('3a_pred');
  await page.evaluate(() => (S200.S.jd += 200));
  await page.waitForTimeout(900);
  const t1 = await t();
  await snimek('3b_po_200_dnech');
  ok(Math.abs(t1 - t0 - 200) < 0.5, `po posunu o 200 dní se čas pásu posunul o ${(t1 - t0).toFixed(1)} dne`);
  await page.evaluate(() => {
    S200.S.paused = false;
    S200.S.jd = Date.now() / 86400000 + 2440587.5;
  });
}

await pohled('sun', 85, 0.9, 0.6);
a = await alfa();
ok(a[1] > 0.6, `pohled na celou soustavu: Kuiperův pás je vidět (${a})`);
await snimek('4_cela_soustava');

await page.evaluate(() => S200.S.home());
await page.waitForTimeout(6000);
await snimek('5_domov');

await pohled('ceres', 200000 / AU, null, null);
a = await alfa();
ok(a[0] < 0.01, `u Ceres zblízka pás není vidět (${a})`);
await snimek('6_ceres');

await pohled('pluto', 12, 0.6, null);
a = await alfa();
ok(a[1] > 0.6, `od Pluta z dálky 12 AU je Kuiperův pás vidět (${a})`);
await snimek('7_pluto_z_dalky');

await pohled('sun', 7.2, 0.9, 0.6);
/* 2.1: přepínač má tři stupně – nenápadné (výchozí) → výrazné → vypnuté */
const lv = () => page.evaluate(() => [S200.S.belts.lvl, S200.S.belts.belts[0].pts.material.uniforms.uA.value, S200.S.belts.belts[0].pts.material.uniforms.uSize.value]);
const l1 = await lv();
ok(l1[0] === 1 && l1[1] < 0.3, `výchozí stupeň je nenápadný (stupeň ${l1[0]}, krytí teček ${l1[1].toFixed(3)}, velikost ${l1[2].toFixed(2)} b.)`);
await page.evaluate(() => S200.ui.act('belts'));
await page.waitForTimeout(800);
const l2 = await lv();
ok(l2[0] === 2 && l2[1] > l1[1] * 1.8 && l2[2] > l1[2], `druhý stupeň je výrazný (krytí ${l2[1].toFixed(3)}, velikost ${l2[2].toFixed(2)} b.)`);
await snimek('7b_vyrazne');
await page.evaluate(() => S200.ui.act('belts'));
await page.waitForTimeout(2500);
a = await alfa();
ok(a[0] === 0 && a[1] === 0, `třetí stupeň pásy schová (${a})`);
await page.evaluate(() => S200.ui.act('belts'));

/* dětské rozhraní */
await page.evaluate(() => S200.ui.setMode(true));
await pohled('sun', 7.2, 0.9, 0.6);
a = await alfa();
ok(a[0] > 0.45, `dětské rozhraní: hlavní pás je vidět (${a})`);
await snimek('8_detske');

const ee = [...new Set(errs)].filter((e) => !/GPU stall|KHR_parallel_shader_compile/.test(e));
console.log(ee.join('\n') || (bad ? '' : 'bez chyb'));
await browser.close();
srv.close();
process.exit(bad || ee.length ? 1 : 0);
