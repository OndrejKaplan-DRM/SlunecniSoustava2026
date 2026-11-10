import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import http from 'http'; import fs from 'fs'; import path from 'path';
const srv = http.createServer((q, r) => { const f = path.join('dist', decodeURIComponent(q.url.split('?')[0] === '/' ? '/index.html' : q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.avif': 'image/avif' }[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); }).listen(0);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1000, height: 600 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
await p.goto(`http://localhost:${srv.address().port}/`); await p.waitForFunction(() => window.S200); await p.click('#sp-go'); await p.waitForTimeout(800);
const ids = ['oumuamua', 'borisov', 'sedna', 'eris', 'arrokoth', 'iapetus', 'hyperion', 'miranda', 'triton', 'psyche', 'apophis', 'haumea', 'europa', 'enceladus', '67p'];
for (const id of ids) { const r = await p.evaluate(async (id) => { const { S, sim, A } = window.S200; A.unlock(); const i = sim.idx.get(id); if (i === undefined) return id + ' CHYBÍ'; S.jump(i); S.cam.alt = S.cam.altT = sim.shape[i].rmax * 2; await new Promise(r => setTimeout(r, 2600)); return id + ' | ctx ' + (A.ctx && A.ctx.state) + ' | ' + A.note(i).slice(0, 70); }, id); console.log(r); }
console.log('count', await p.evaluate(() => window.S200.A.count));
for (const k of [2, 5, 10]) { await p.evaluate((k) => { window.S200.S.rateIdx = k; }, k); await p.waitForTimeout(700); }
console.log(errs.join('\n') || 'bez chyb'); await b.close(); srv.close();
