// Porovnání dvou těles ve skutečném poměru s plynulým měřítkem (verze 2.1).
// Dosavadní porovnání „sousedé“ (ui.js, drawCmp) ukazuje jen tělesa podobné velikosti – Slunce vedle Země tam z Země dělá
// tečku menší než bod. Tady stojí dvě tělesa těsně vedle sebe a posuvník mění měřítko: na jednom konci je celé větší těleso
// (menší je tečka s popiskem), na druhém je menší těleso velké a z většího zbývá jen oblouk okraje. Poměr je vždy skutečný.
import { B } from '../core/sim.js';
import { drawBall, ballSize, loadMap } from '../render/ball.js';

const SPR = 240; /* průměr předkresleného kotouče v bodech; při větším zvětšení se roztahuje a okraj se ořízne dráhou */
const nf = (v, d = 0) => v.toLocaleString('cs-CZ', { maximumFractionDigits: d, minimumFractionDigits: 0 });
const sig = (v) => (v >= 100 ? nf(Math.round(v)) : v >= 10 ? nf(v, 1) : nf(v, 2));
function sprite(j, redraw) {
  const b = B[j],
    cv = document.createElement('canvas'),
    o = { cv, sz: ballSize(b, SPR), ring: ballSize(b, SPR).w > SPR * 1.05 };
  drawBall(cv, b, j, SPR, null);
  loadMap(b.id).then((m) => {
    if (m) {
      drawBall(cv, b, j, SPR, m);
      redraw();
    }
  });
  return o;
}
const NICE = [1, 2, 5];
function niceKm(km) {
  const p = Math.pow(10, Math.floor(Math.log10(km)));
  let best = p;
  for (const n of NICE) if (n * p <= km) best = n * p;
  return best;
}
const kmTxt = (km) => (km >= 1e6 ? sig(km / 1e6) + ' mil. km' : km >= 1 ? nf(km) + ' km' : nf(km * 1000) + ' m');
/**
 * Vykreslí do prvku el porovnání těles i a j. opts: { kid, onZoom }. Vrací { stop() } pro úklid.
 */
export function pairView(el, i, j, opts = {}) {
  const big = B[i].R >= B[j].R ? i : j,
    sm = big === i ? j : i,
    bb = B[big],
    bs = B[sm],
    ratio = bb.R / bs.R;
  el.innerHTML =
    `<canvas class="pv-c" aria-label="Porovnání velikosti: ${bb.cs} a ${bs.cs}"></canvas>` +
    `<div class="pv-z"><button data-pv="0" title="Celé větší těleso">◯ celé ${bb.cs}</button>` +
    `<input type="range" min="0" max="1000" value="0" aria-label="Měřítko porovnání">` +
    `<button data-pv="1" title="Menší těleso zblízka">🔍 ${bs.cs} zblízka</button></div>` +
    `<p class="pv-t"></p>`;
  const cv = el.querySelector('canvas'),
    rng = el.querySelector('input'),
    txt = el.querySelector('.pv-t'),
    ctx = cv.getContext('2d');
  let z = 0,
    raf = 0,
    anim = null,
    dead = false;
  const draw = () => {
    if (dead || !cv.isConnected) return;
    const W = Math.max(240, Math.round(el.clientWidth)),
      H = Math.round(Math.max(170, Math.min(300, innerHeight * 0.38))),
      dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      cv.style.width = W + 'px';
      cv.style.height = H + 'px';
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    /* měřítko: průměr menšího tělesa od „větší se vejde celé“ po „menší je velké“ (logaritmicky) */
    const gap = 16,
      bigFit = Math.min(H * 0.86, W * 0.56),
      d0 = bigFit / ratio,
      d1 = Math.max(d0 * 1.0001, Math.min(H * 0.62, W * 0.3)),
      ds = Math.exp(Math.log(d0) + (Math.log(d1) - Math.log(d0)) * z),
      db = ds * ratio,
      pxKm = ds / (bs.R * 2),
      xs = W - 22 - Math.max(ds / 2, 34),
      xb = xs - ds / 2 - gap - db / 2,
      cy = H * 0.47;
    const put = (j2, x, d) => {
      const b = B[j2],
        s = SPRS[j2],
        k = d / SPR;
      if (d < 2.6) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x, cy, Math.max(0.7, d / 2), 0, 6.2832);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,200,87,0.85)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, cy, 9, 0, 6.2832);
        ctx.stroke();
        return;
      }
      ctx.save();
      ctx.imageSmoothingQuality = 'high';
      if (k > 1.2 && !s.ring) {
        /* hodně zvětšený kotouč: ostrý okraj dá ořez elipsou (zploštění tělesa), obsah je roztažený */
        let ay = 1;
        if (b.abc) ay = Math.max(0.3, b.abc[2] / Math.max(...b.abc));
        else if (b.flat) ay = 1 - b.flat;
        ctx.beginPath();
        ctx.ellipse(
          x,
          cy,
          d / 2,
          (d / 2) * (b.abc && Math.max(...b.abc) / Math.min(...b.abc) > 1.2 ? 1 : ay),
          0,
          0,
          6.2832
        );
        ctx.clip();
      }
      ctx.drawImage(s.cv, x - (s.sz.w * k) / 2, cy - (s.sz.h * k) / 2, s.sz.w * k, s.sz.h * k);
      ctx.restore();
    };
    put(big, xb, db);
    put(sm, xs, ds);
    /* popisky */
    ctx.textBaseline = 'alphabetic';
    ctx.font = '600 13px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    const label = (t, x, y, al, col) => {
      ctx.textAlign = al;
      /* tmavý podklad: popisek často leží přes světlý kotouč */
      const w = ctx.measureText(t).width,
        x0 = al === 'center' ? x - w / 2 : x;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.roundRect(x0 - 5, y - 13, w + 10, 18, 5);
      ctx.fill();
      ctx.strokeText(t, x, y);
      ctx.fillStyle = col;
      ctx.fillText(t, x, y);
    };
    const yl = H - 30;
    label(
      bs.cs,
      Math.min(W - 8, Math.max(xs, 40)),
      Math.min(yl, cy + Math.max(ds / 2, 9) + 18),
      'center',
      sm === i ? '#ffc857' : '#e9f0ff'
    );
    const bx = Math.max(8, Math.min(xb, xs - ds / 2 - gap - 40));
    label(
      bb.cs + (xb - db / 2 < -4 ? ' (jen okraj)' : ''),
      xb - db / 2 < 0 ? 10 : bx,
      Math.min(yl, cy + Math.min(db / 2, H * 0.5) + 18),
      xb - db / 2 < 0 ? 'left' : 'center',
      big === i ? '#ffc857' : '#e9f0ff'
    );
    /* měřítko v km */
    const km = niceKm(Math.min(W * 0.28, 150) / pxKm),
      len = km * pxKm;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(4, H - 20, len + 12, 18, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(233,240,255,0.8)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(10, H - 9);
    ctx.lineTo(10, H - 5);
    ctx.lineTo(10 + len, H - 5);
    ctx.lineTo(10 + len, H - 9);
    ctx.stroke();
    ctx.font = '11px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    label(kmTxt(km), 22 + len, H - 6, 'left', 'rgba(233,240,255,0.9)');
    state.ds = ds;
    state.d0 = d0;
    state.d1 = d1;
    state.db = db;
    state.z = z;
  };
  const SPRS = {},
    state = { big: bb.id, small: bs.id, ratio, ds: 0, db: 0, z: 0 };
  SPRS[big] = sprite(big, () => draw());
  SPRS[sm] = sprite(sm, () => draw());
  const vol = ratio * ratio * ratio,
    kid = !!opts.kid;
  txt.innerHTML =
    `${bb.cs} má průměr <b>${sig(ratio)}×</b> větší než ${bs.cs}` +
    (ratio > 1.3
      ? ` a ${kid ? 'vešlo by se do něj' : 'objemem by se do něj vešlo'} asi <b>${vol >= 1e6 ? sig(vol / 1e6) + ' milionu' : nf(Math.round(vol))}</b>× ${bs.cs}.`
      : '.') +
    ` Obě tělesa jsou ve stejném měřítku; posuvníkem ho měníš${ratio > 30 ? ' – vedle celého většího tělesa je menší jen tečka v kroužku' : ''}.`;
  const setZ = (v, fromUser) => {
    z = Math.max(0, Math.min(1, v));
    rng.value = Math.round(z * 1000);
    if (fromUser) anim = null;
    draw();
  };
  rng.addEventListener('input', () => setZ(rng.value / 1000, true));
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-pv]');
    if (b) go(+b.dataset.pv, 900);
  });
  const go = (to, ms) => {
    anim = { z0: z, z1: to, t0: performance.now(), ms };
    tick();
  };
  const tick = () => {
    cancelAnimationFrame(raf);
    if (!anim || dead || !cv.isConnected) return;
    const u = Math.min(1, (performance.now() - anim.t0) / anim.ms),
      e = u * u * (3 - 2 * u);
    setZ(anim.z0 + (anim.z1 - anim.z0) * e);
    if (u < 1) raf = requestAnimationFrame(tick);
    else anim = null;
  };
  draw();
  /* úvodní pohyb: od celého většího tělesa k měřítku, kde má menší těleso asi 30 bodů – ukáže nepoměr */
  if (ratio > 6 && !opts.still)
    state.t = setTimeout(() => {
      if (dead) return;
      const zz = Math.log(30 / state.d0) / Math.log(state.d1 / state.d0);
      go(Math.max(0.2, Math.min(0.9, zz)), 2600);
    }, 700);
  const onRes = () => draw();
  window.addEventListener('resize', onRes);
  return {
    state,
    setZ: (v) => setZ(v, true),
    stop() {
      dead = true;
      cancelAnimationFrame(raf);
      clearTimeout(state.t);
      window.removeEventListener('resize', onRes);
    },
  };
}
