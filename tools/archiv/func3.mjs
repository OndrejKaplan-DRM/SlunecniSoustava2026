import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import http from 'http'; import fs from 'fs'; import path from 'path';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.avif': 'image/avif', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const f = path.join('dist', q.url === '/' ? '/index.html' : q.url.split('?')[0]); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); }).listen(0);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const [w, h] = (process.env.VP || '1280x760').split('x').map(Number);
const page = await browser.newPage({ viewport: { width: w, height: h } }); const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); }); page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(`http://localhost:${srv.address().port}/`); await page.waitForFunction(() => window.S200);
const out = process.argv[2]; fs.mkdirSync(out, { recursive: true }); const shot = (n) => page.screenshot({ path: `${out}/${n}.jpg`, type: 'jpeg', quality: 78 });
const steps = JSON.parse(process.argv[3]);
for (const [name, code, wait] of steps) { if (code.startsWith('click:')) await page.click(code.slice(6)); else if (code.startsWith('key:')) await page.keyboard.press(code.slice(4)); else await page.evaluate(code); await page.waitForTimeout(wait || 1500); if (name[0] !== '_') await shot(name); }
console.log('snd', await page.evaluate(() => S200.A.count + ' ctx:' + (S200.A.ctx && S200.A.ctx.state)));
console.log([...new Set(errs)].filter(e => !/GPU stall/.test(e)).join('\n') || 'bez chyb'); await browser.close(); srv.close();
