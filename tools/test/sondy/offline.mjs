// Sonda (1.8m): soubor na flashku z disku – čas do připravení, paměť stránky (RSS rendereru, halda JS), Měsíc zblízka s dlaždicemi,
// žádné požadavky mimo soubor. Použití: node tools/test/sondy/offline.mjs <soubor.html>
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import { execSync } from 'child_process';
const f = process.argv[2];
const browser = await chromium.launch({
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--enable-precise-memory-info',
  ],
});
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
const page = await ctx.newPage();
const errs = [],
  net = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error' && !/GPU stall/.test(m.text())) errs.push(m.text().slice(0, 200));
});
page.on('request', (r) => {
  const u = r.url();
  if (!u.startsWith('file:') && !u.startsWith('data:') && !u.startsWith('blob:')) net.push(u);
});
const rss = () => {
  try {
    return execSync(`ps -eo rss,args | grep -E 'type=renderer' | grep -v grep | awk '{s+=$1} END {print s}'`)
      .toString()
      .trim();
  } catch (e) {
    return '?';
  }
};
const t0 = Date.now();
await page.goto('file://' + f, { timeout: 300000 });
await page.waitForFunction(() => window.S200, null, { timeout: 300000 });
const t1 = Date.now();
console.log(
  'stránka připravena za',
  ((t1 - t0) / 1000).toFixed(1),
  's; RSS rendereru',
  Math.round(rss() / 1024),
  'MB; JS halda',
  await page.evaluate(() => Math.round(performance.memory.usedJSHeapSize / 1048576)),
  'MB'
);
await page.evaluate(() => document.querySelector('#sp-go').click());
await page.waitForFunction(() => !document.querySelector('#splash.on'), null, { timeout: 60000 });
console.log('start za', ((Date.now() - t1) / 1000).toFixed(1), 's');
await page.evaluate(() => {
  window.__q = setInterval(() => (S200.S.quality = 2), 250);
});
await page.evaluate(async () => {
  const S = S200.S,
    j = S200.sim.idx.get('moon');
  S.flyTo(j, { alt: 0.25 * S200.sim.B[j].R });
  await new Promise((r) => {
    const h = setInterval(() => {
      if (!S.flying() && S.focus === j) {
        clearInterval(h);
        r();
      }
    }, 50);
  });
});
const st = await page.evaluate(async () => {
  const t0 = performance.now();
  while (performance.now() - t0 < 40000) {
    const s = S200.S.l2.state();
    if (s.loaded > 0 && !s.loading) return s;
    await new Promise((r) => setTimeout(r, 300));
  }
  return S200.S.l2.state();
});
console.log(
  'Měsíc zblízka:',
  JSON.stringify(st),
  '; RSS',
  Math.round(rss() / 1024),
  'MB; JS halda',
  await page.evaluate(() => Math.round(performance.memory.usedJSHeapSize / 1048576)),
  'MB'
);
console.log('požadavky mimo soubor:', net.length, net.slice(0, 3).join(' '));
console.log('chyby:', errs.length, errs.slice(0, 3).join(' | '));
await browser.close();
