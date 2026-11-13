// Kotouč tělesa vykreslený z jeho skutečné mapy do 2D plátna (osvětlená koule, zploštění, prstence) – pro porovnání velikostí.
// Stejný postup jako u ikon (tools/build_icons.mjs), jen v plném rozlišení a až za běhu, takže je ostrý v jakékoli velikosti.
import { AS } from '../core/asset.js';
const CENTER = {
  earth: 15,
  jupiter: 200,
  mars: -75,
  moon: 0,
  pluto: 180,
  saturn: 0,
  io: 200,
  iapetus: 330,
  mimas: 110,
  venus: 0,
  mercury: 0,
};
// prstence: [vnitřní, vnější poloměr (v poloměrech tělesa), průhlednost, barva, natočení v obraze (rad)]
const RINGS = {
  saturn: [1.24, 2.33, 0.92, [222, 204, 168], -0.22],
  uranus: [1.9, 2.02, 0.75, [190, 205, 215], 1.25],
  chariklo: [1.5, 1.7, 0.8, [210, 210, 210], -0.22],
  haumea: [1.9, 2.05, 0.6, [200, 200, 200], -0.22],
};
const TILT = 0.42,
  ST = Math.sin(TILT),
  cache = {};
export const loadMap = (id) =>
  cache[id] ||
  (cache[id] = new Promise((ok) => {
    const im = new Image();
    im.onload = () => {
      try {
        const W = 720,
          H = 360,
          c = document.createElement('canvas');
        c.width = W;
        c.height = H;
        const x = c.getContext('2d', { willReadFrequently: true });
        x.drawImage(im, 0, 0, W, H);
        ok({ W, H, d: x.getImageData(0, 0, W, H).data });
      } catch (e) {
        ok(null);
      }
    };
    im.onerror = () => ok(null);
    im.src = AS('maps/' + id + '.webp');
  }));
// rozměr plátna (CSS px) pro kotouč o průměru dia
export function ballSize(b, dia) {
  const r = RINGS[b.id];
  if (!r) return { w: Math.ceil(dia * 1.04), h: Math.ceil(dia * 1.04) };
  const c = Math.abs(Math.cos(r[4])),
    s = Math.abs(Math.sin(r[4]));
  return {
    w: Math.ceil(Math.max(dia * 1.04, dia * r[1] * (c + ST * s) * 1.02)),
    h: Math.ceil(Math.max(dia * 1.04, dia * r[1] * (s + ST * c) * 1.02)),
  };
}
// Saturn: prstenec C (slabý), B (hustý), Cassiniho dělení, A s Enckeho mezerou
const satO = (u) =>
  u < 0.27
    ? 0.22 + 0.5 * u
    : u < 0.65
      ? 0.95
      : u < 0.72
        ? 0.07
        : u < 0.955
          ? Math.abs(u - 0.89) < 0.008
            ? 0.2
            : 0.68
          : 0.0;
export function drawBall(cv, b, i, dia, map) {
  const sz = ballSize(b, dia),
    dpr = Math.min(2, window.devicePixelRatio || 1),
    W = Math.max(2, Math.round(sz.w * dpr)),
    H = Math.max(2, Math.round(sz.h * dpr));
  cv.width = W;
  cv.height = H;
  cv.style.width = sz.w + 'px';
  cv.style.height = sz.h + 'px';
  const ctx = cv.getContext('2d'),
    img = ctx.createImageData(W, H),
    out = img.data,
    ring = RINGS[b.id],
    rad = (dia * dpr) / 2,
    cx = W / 2,
    cy = H / 2,
    lon0 = ((CENTER[b.id] || 0) * Math.PI) / 180,
    seed = i * 7.31,
    SS = rad < 20 ? 3 : 2;
  let ax = 1,
    ay = 1;
  if (b.abc) {
    const m = Math.max(...b.abc);
    ax = b.abc[0] / m;
    ay = Math.max(0.3, b.abc[2] / m);
  } else if (b.flat) ay = 1 - b.flat;
  const base = b.col ? b.col.map((v) => v * 255) : [150, 150, 150],
    ang = b.abc && ax / ay > 1.2 ? -0.5 : 0,
    ca = Math.cos(ang),
    sa = Math.sin(ang),
    lumpy = b.R < 150 && b.type !== 'planet',
    cr = ring ? Math.cos(ring[4]) : 1,
    sr = ring ? Math.sin(ring[4]) : 0;
  for (let py = 0; py < H; py++)
    for (let px = 0; px < W; px++) {
      let r = 0,
        g = 0,
        bl = 0,
        a = 0;
      for (let sy = 0; sy < SS; sy++)
        for (let sx = 0; sx < SS; sx++) {
          const x = (px + (sx + 0.5) / SS - cx) / rad,
            y = -(py + (sy + 0.5) / SS - cy) / rad;
          let c0 = 0,
            c1 = 0,
            c2 = 0,
            al = 0;
          const xr = x * ca - y * sa,
            yr = x * sa + y * ca;
          let lump = 1;
          if (lumpy) {
            const t = Math.atan2(yr, xr);
            lump = 1 + 0.07 * Math.sin(t * 3 + seed) + 0.05 * Math.sin(t * 5 + seed * 2);
          }
          const ex = xr / (ax * lump),
            ey = yr / (ay * lump),
            d2 = ex * ex + ey * ey;
          if (d2 < 1) {
            const ez = Math.sqrt(1 - d2),
              lat = Math.asin(Math.max(-1, Math.min(1, ey))),
              lon = Math.atan2(ex, ez) + lon0;
            let q0 = base[0],
              q1 = base[1],
              q2 = base[2];
            if (map) {
              const u = (((lon / 6.2831853 + 0.5) % 1) + 1) % 1,
                v = 0.5 - lat / Math.PI,
                k =
                  (Math.min(map.H - 1, Math.floor(v * map.H)) * map.W + Math.min(map.W - 1, Math.floor(u * map.W))) * 4;
              q0 = map.d[k];
              q1 = map.d[k + 1];
              q2 = map.d[k + 2];
            }
            let L;
            if (b.id === 'sun') {
              L = 0.55 + 0.75 * Math.sqrt(ez);
              const lum = (q0 * 0.4 + q1 * 0.45 + q2 * 0.15) / 255;
              q0 = 255;
              q1 = 150 + 90 * lum;
              q2 = 40 + 120 * lum;
            } else {
              const nl = Math.max(0, -0.45 * ex + 0.5 * ey + 0.74 * ez);
              L = 0.14 + 1.25 * Math.pow(nl, 0.8);
              if (b.id === 'earth') {
                q0 = q0 * 0.8 + 17 + (1 - ez) * 20;
                q1 = q1 * 0.8 + 27 + (1 - ez) * 50;
                q2 = q2 * 0.8 + 47 + (1 - ez) * 110;
              }
            }
            const bst = b.type === 'star' ? 1 : 1.15 + 0.5 * (1 - Math.min(1, (q0 + q1 + q2) / 420)),
              k2 = L * bst;
            c0 = Math.min(255, q0 * k2);
            c1 = Math.min(255, q1 * k2);
            c2 = Math.min(255, q2 * k2);
            al = 1;
          }
          if (ring) {
            const xq = x * cr + y * sr,
              yq = -x * sr + y * cr,
              rr = Math.hypot(xq, yq / ST);
            if (rr > ring[0] && rr < ring[1]) {
              const u = (rr - ring[0]) / (ring[1] - ring[0]),
                o = b.id === 'saturn' ? satO(u) : ring[2],
                far = yq > 0,
                sh = 1,
                k =
                  (0.88 + 0.07 * Math.sin(u * 61) + 0.05 * Math.sin(u * 23 + 1)) *
                  sh *
                  (b.id === 'saturn' && u >= 0.27 && u < 0.65 ? 1.06 : 0.94);
              if (!(far && d2 < 1) && o > 0) {
                if (al >= 1) {
                  c0 = c0 * (1 - o) + ring[3][0] * k * o;
                  c1 = c1 * (1 - o) + ring[3][1] * k * o;
                  c2 = c2 * (1 - o) + ring[3][2] * k * o;
                } else {
                  c0 = ring[3][0] * k;
                  c1 = ring[3][1] * k;
                  c2 = ring[3][2] * k;
                  al = o;
                }
              }
            }
          }
          if (al > 0) {
            r += c0 * al;
            g += c1 * al;
            bl += c2 * al;
            a += al;
          }
        }
      if (a > 0) {
        const k = (py * W + px) * 4;
        out[k] = r / a;
        out[k + 1] = g / a;
        out[k + 2] = bl / a;
        out[k + 3] = Math.min(255, (a / (SS * SS)) * 255);
      }
    }
  ctx.putImageData(img, 0, 0);
}
