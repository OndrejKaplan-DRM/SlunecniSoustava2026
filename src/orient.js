// Orientace: stálé šipky ke Slunci a k Zemi, „Kde jsem?“ a občasné připomenutí orientačních bodů
// (Slunce, Země, Měsíc, Velký vůz, Polárka, Orion, Sirius, Proxima Centauri). Kreslí se do 2D vrstvy nad scénou.
import { B, P, idx, SUN, EARTH, MOON, AU, par, root } from './sim.js';
const D = Math.PI / 180;
export function createOrient(S, A, ui) {
  const q = (ra, de) => S.eq2s(ra * D, de * D);
  const STARS = [['Polárka', q(37.95, 89.26), 'ukazuje sever'], ['Sirius', q(101.29, -16.72), 'nejjasnější hvězda'], ['Proxima Centauri', q(217.43, -62.68), 'nejbližší hvězda, 4,2 sv. roku']];
  const fig = (name, pts, lines) => ({ name, p: pts.map(a => q(a[0], a[1])), lines });
  const FIGS = [fig('Velký vůz', [[165.93, 61.75], [165.46, 56.38], [178.46, 53.69], [183.86, 57.03], [193.51, 55.96], [200.98, 54.93], [206.89, 49.31]], [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]]),
    fig('Orion', [[88.79, 7.41], [81.28, 6.35], [83.0, -0.3], [84.05, -1.2], [85.19, -1.94], [86.94, -9.67], [78.63, -8.2]], [[0, 1], [0, 4], [1, 2], [2, 3], [3, 4], [4, 5], [2, 6], [5, 6]])];
  const O = { t0: -1e9, last: performance.now(), on: true }, LEN = 9500;
  const sig = (x) => x >= 100 ? Math.round(x) : x >= 10 ? x.toFixed(1).replace('.', ',') : x.toFixed(2).replace('.', ',');
  O.pulse = (say) => { O.t0 = performance.now(); O.last = O.t0; S.wake(); if (say) { const i = S.focus, inf = S.info(i), touch = document.body.classList.contains('touch') || document.body.classList.contains('mob');
    ui.toast(`📍 Jsi tady: <b>${B[i].cs}</b>${i === SUN ? '' : ' · ' + sig(inf.sun / AU) + ' AU od Slunce'}${i === SUN || i === EARTH ? '' : ' · ' + sig(inf.earth / AU) + ' AU od Země'}.<br><small>Domů: ${touch ? 'ikony Země a Slunce dole, ⌂ v nabídce ☰ ukáže celou soustavu' : '<kbd>3</kbd> Země · <kbd>0</kbd> Slunce · <kbd>Home</kbd> celá soustava'}</small>`); A.play('hint'); } };
  ui.where = () => O.pulse(true); document.querySelector('[data-m="where"]').addEventListener('click', () => { document.querySelector('#more').classList.remove('on'); O.pulse(true); });
  ui.onArrive = () => { if (performance.now() - O.last > 70000) O.pulse(false); };
  setInterval(() => { if (document.hidden || document.querySelector('#splash.on') || document.body.classList.contains('tutoring') || document.body.classList.contains('cine')) return; if (performance.now() - O.last > 150000) O.pulse(false); }, 5000);
  const prev = S.on.overlay;
  S.on.overlay = (ctx, e) => { if (prev) prev(ctx, e); if (!O.on) return;
    const { W, H, F, fwd, right, up } = e, C = S.camPos, now = performance.now(), u = (now - O.t0) / LEN, pa = u < 0 || u > 1 ? 0 : Math.min(1, u * 10, (1 - u) * 5), kid = ui.kid(), mob = document.body.classList.contains('mob');
    if (pa > 0) S.wake();
    const dk = parseFloat(getComputedStyle(document.body).getPropertyValue('--dk')) || 90, used = [], fr = S.R[S.focus], hid = (x, y) => fr.pr > 12 && Math.hypot(x - fr.sx, y - fr.sy) < fr.pr;
    const free = (x, y, w) => { for (const r of used) if (x < r[0] + r[2] + 8 && x + w + 8 > r[0] && Math.abs(y - r[1]) < 15) return false; used.push([x, y, w]); return true; };
    const L = 14, T = mob ? 150 : 64, Bm = dk + (mob ? 70 : 26), cx = W / 2, cy = (T + H - Bm) / 2, hw = W / 2 - L - 8, hh = (H - Bm - T) / 2;
    const cam = (v) => [v.x * right.x + v.y * right.y + v.z * right.z, v.x * up.x + v.y * up.y + v.z * up.z, v.x * fwd.x + v.y * fwd.y + v.z * fwd.z];
    const place = (c) => { if (c[2] > 0) { const x = W / 2 + c[0] / c[2] * F, y = H / 2 - c[1] / c[2] * F; if (x > L && x < W - L && y > T && y < H - Bm) return [x, y, true]; }
      let dx = c[0], dy = -c[1]; const n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n; const k = Math.min(hw / Math.abs(dx || 1e-9), hh / Math.abs(dy || 1e-9)); return [cx + dx * k, cy + dy * k, false, Math.atan2(dy, dx)]; };
    const arrow = (p, col, txt, a) => { ctx.save(); ctx.globalAlpha = a; ctx.translate(p[0], p[1]); ctx.rotate(p[3]); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-3, -5.5); ctx.lineTo(-3, 5.5); ctx.closePath(); ctx.fill(); ctx.restore();
      ctx.globalAlpha = a; ctx.font = `600 ${kid ? 12.5 : 11.5}px system-ui, sans-serif`; ctx.textBaseline = 'middle'; const w = ctx.measureText(txt).width, tx = Math.max(6, Math.min(W - w - 6, p[0] - Math.cos(p[3]) * 16 - (Math.cos(p[3]) > 0 ? w : 0))), ty = p[1] - Math.sin(p[3]) * 14;
      if (free(tx, ty, w)) { ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.strokeText(txt, tx, ty); ctx.fillStyle = col; ctx.fillText(txt, tx, ty); } ctx.globalAlpha = 1; };
    const label = (x, y, txt, sub, col, a) => { ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x, y, 9 + 3 * Math.sin(now * 0.006), 0, 6.2832); ctx.stroke(); if (!txt) { ctx.globalAlpha = 1; return; } ctx.font = `600 ${kid ? 13.5 : 12.5}px system-ui, sans-serif`; ctx.textBaseline = 'middle'; if (!free(x + 15, y, ctx.measureText(txt).width)) { ctx.globalAlpha = 1; return; }
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.strokeText(txt, x + 15, y); ctx.fillStyle = col; ctx.fillText(txt, x + 15, y); if (sub) { ctx.font = '11px system-ui, sans-serif'; ctx.strokeText(sub, x + 15, y + 14); ctx.fillStyle = 'rgba(220,230,245,0.9)'; ctx.fillText(sub, x + 15, y + 14); } ctx.globalAlpha = 1; };
    // tělesa: Slunce a Země stále (šipka u okraje, když nejsou v záběru), Měsíc jen při připomenutí
    const fi = S.focus;
    for (const [j, name, col] of [[SUN, '☀ Slunce', '#ffd98a'], [EARTH, '🌍 Země', '#8fc4ff'], [MOON, 'Měsíc', '#d8dde8']]) {
      if (j === fi || (j === MOON && (pa <= 0 || root[fi] !== EARTH && fi !== EARTH))) continue; if (j === EARTH && fi === MOON && pa <= 0) continue;
      const v = { x: P[j * 3] - C[0], y: P[j * 3 + 1] - C[1], z: P[j * 3 + 2] - C[2] }, d = Math.hypot(v.x, v.y, v.z), p = place(cam(v)), dist = d > 0.02 * AU ? sig(d / AU) + ' AU' : Math.round(d / 1000) + ' tis. km';
      if (!p[2]) arrow(p, col, `${name} ${dist}`, Math.max(0.5, pa)); else if (pa > 0 && S.R[j].pr < 40) label(p[0], p[1], '', '', col, pa); }
    if (pa <= 0) return;
    // obloha: dvě souhvězdí a tři hvězdy
    for (const f of FIGS) { const pp = f.p.map(v => { const c = cam(v); if (c[2] <= 0.15) return null; const x = W / 2 + c[0] / c[2] * F, y = H / 2 - c[1] / c[2] * F; return hid(x, y) ? null : [x, y]; }); let vis = 0, sx = 0, sy = 0;
      ctx.globalAlpha = pa * 0.9; ctx.strokeStyle = '#9fd0ff'; ctx.lineWidth = 1.6; ctx.beginPath(); for (const [a, b] of f.lines) if (pp[a] && pp[b]) { ctx.moveTo(pp[a][0], pp[a][1]); ctx.lineTo(pp[b][0], pp[b][1]); } ctx.stroke();
      ctx.fillStyle = '#fff'; for (const p of pp) if (p && p[0] > 0 && p[0] < W && p[1] > 0 && p[1] < H) { ctx.beginPath(); ctx.arc(p[0], p[1], 2.2, 0, 6.2832); ctx.fill(); vis++; sx += p[0]; sy += p[1]; } ctx.globalAlpha = 1;
      const mid = cam(f.p[3]), pm = place(mid); if (vis >= 4 && pm[2]) { ctx.globalAlpha = pa; ctx.font = `600 ${kid ? 14 : 13}px system-ui, sans-serif`; ctx.textBaseline = 'middle'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; const tx = sx / vis + 18, ty = sy / vis - 22; ctx.strokeText(f.name, tx, ty); ctx.fillStyle = '#9fd0ff'; ctx.fillText(f.name, tx, ty); ctx.globalAlpha = 1; }
      else if (!pm[2]) arrow(pm, '#9fd0ff', f.name, pa * 0.85); }
    for (const [name, v, sub] of STARS) { const p = place(cam(v)); if (p[2]) { if (!hid(p[0], p[1])) label(p[0], p[1], name, sub, '#ffe9a8', pa); } else arrow(p, '#ffe9a8', name, pa * 0.85); }
  };
  return O;
}
