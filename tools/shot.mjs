import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import http from 'http'; import fs from 'fs'; import path from 'path';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.avif': 'image/avif' };
const srv = http.createServer((q, r) => { const f = path.join('dist', decodeURIComponent(q.url.split('?')[0] === '/' ? '/index.html' : q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); }).listen(0);
const port = srv.address().port, out = process.argv[2] || '/tmp/shots'; fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } }); const errs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text().slice(0, 400)); }); page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
await page.goto(`http://localhost:${port}/`); await page.waitForFunction(() => window.S200, null, { timeout: 20000 });
const steps = JSON.parse(process.argv[3] || '[]');
for (const [name, code, wait] of steps) { await page.evaluate(code); await page.waitForTimeout(wait || 1500); await page.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 80 }); }
console.log('fps', await page.evaluate(() => window.S200.S.fps.toFixed(1)), 'quality', await page.evaluate(() => window.S200.S.quality));
console.log([...new Set(errs)].slice(0, 12).join('\n') || 'bez chyb');
await browser.close(); srv.close();
