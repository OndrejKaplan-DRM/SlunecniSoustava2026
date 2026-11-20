import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import http from 'http'; import fs from 'fs'; import path from 'path';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const u = q.url.split('?')[0], f = path.join('dist', decodeURIComponent(u === '/' ? '/index.html' : u));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); }).listen(0);
const out = '/tmp/t1/look', prof = process.argv[2] || 'desk', phone = prof === 'phone';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext(phone ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 768 } })).newPage();
const errs = []; page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); }); page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
await page.goto(`http://localhost:${srv.address().port}/`);
await page.waitForFunction(() => window.S200);
await page.evaluate(() => { localStorage.clear(); document.querySelector('#sp-adult').click(); document.querySelector('#sp-go').click(); });
await page.waitForFunction(() => !document.querySelector('#splash.on'), null, { timeout: 180000 });
const fr = (n = 4) => page.evaluate((n) => new Promise((r) => { const f = () => { S200.S.wake(); --n > 0 ? requestAnimationFrame(f) : r(); }; requestAnimationFrame(f); }), n);
const snap = async (n) => { await fr(4); await page.screenshot({ path: path.join(out, `${prof}_${n}.png`), timeout: 180000 }); console.log(n, JSON.stringify(await page.evaluate(() => { const v = S200.obloha.state().vis; return { vis: v.length, jmen: v.filter((x) => x.lab).length, carek: v.filter((x) => x.lead).length }; }))); };
await page.evaluate(() => { const S = S200.S; S200.obloha.fast(true); S.jump(S200.sim.idx.get('earth')); S.cam.alt = S.cam.altT = 3e7; });
const V = [['a', 0.4, 0.2], ['b', 2.6, -0.3], ['c', 4.4, 0.6], ['d', 5.5, -0.9]];
for (const [n, yaw, pitch] of (phone ? V.slice(0, 2) : [])) {
  for (const [tag, con, names, mode] of [['1nen', 2, false, 1], ['2jm', 3, true, 1], ['3stale', 3, true, 2], ['4stale0', 0, false, 2]]) {
    if (phone && (tag === '1nen' || tag === '4stale0') && n !== 'a') continue;
    await page.evaluate(([yaw, pitch, con, names, mode]) => { const S = S200.S; S.conMode = con; S.starNames = names; S200.obloha.mode(mode); S.cam.yaw = yaw; S.cam.pitch = pitch; S.cam.ly = S.cam.lp = 0; }, [yaw, pitch, con, names, mode]);
    await snap(`${n}_${tag}`);
  }
}
for (const id of (process.env.IDS || 'laguna,carina,m42').split(',')) {
  await page.evaluate((id) => { const S = S200.S; S.conMode = 3; S.starNames = true; S200.obloha.mode(2); S200.obloha.aim(id); }, id);
  await page.waitForTimeout(1200); await snap('z_' + id);
  await page.evaluate(() => { const S = S200.S; S.conMode = 0; S.starNames = false; });
  await snap('y_' + id);
  await page.evaluate(() => { S200.obloha.back(); }); await page.waitForTimeout(800);
}
if (process.env.IDS) { console.log('ERR', errs); await browser.close(); srv.close(); process.exit(0); }
await page.evaluate(() => { const S = S200.S; S.conMode = 0; S.starNames = false; S200.obloha.mode(1); S200.obloha.list(); });
await page.waitForTimeout(600); await snap('list');
await page.evaluate(() => { const q = document.querySelector('#ds-q'); q.value = 'labut'; q.dispatchEvent(new Event('input', { bubbles: true })); });
await page.waitForTimeout(400); await snap('list_labut');
await page.evaluate(() => { S200.obloha.open('sirius'); });
await page.waitForFunction(() => { const s = S200.obloha.state().stage; return s && s.ph === 'open'; }, null, { timeout: 120000 }).catch(() => console.log('stage timeout'));
await page.waitForTimeout(1500); await snap('stage_sirius');
await page.evaluate(() => { S200.obloha.close(); }); await page.waitForTimeout(1500);
await page.evaluate(() => { S200.obloha.open('betelgeuze'); });
await page.waitForFunction(() => { const s = S200.obloha.state().stage; return s && s.ph === 'open'; }, null, { timeout: 120000 }).catch(() => console.log('stage timeout'));
await page.waitForTimeout(1500); await snap('stage_betelgeuze');
console.log('ERR', errs.slice(0, 5));
await browser.close(); srv.close();
