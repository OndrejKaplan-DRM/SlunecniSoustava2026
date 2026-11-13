// Soustava 200 – iterace 3: vrstva nad scénou (2D plátno) a minimapa. Vše počítá jen z poloh, které už engine má – žádný další
// průchod WebGL: popisky útvarů na povrchu, sondy, pravítko, osa a rovník, odlesky objektivu, warp při letu, konfety, minimapa.
import { B, P, idx, par, basis, shape, SUN, EARTH, AU, DEG } from '../core/sim.js';
import { fmtDist } from './ui.js';

// útvary: [jméno, šířka °, východní délka °]
export const FEAT = {
  earth: [
    ['Praha', 50.08, 14.43],
    ['Mount Everest', 27.99, 86.93],
    ['Mariánský příkop', 11.35, 142.2],
    ['Sahara', 23, 13],
    ['Amazonie', -3, -62],
    ['Grónsko', 72, -40],
    ['Havaj', 19.9, -155.6],
    ['Antarktida', -80, 60],
  ],
  moon: [
    ['Apollo 11', 0.67, 23.47],
    ['Apollo 17', 20.2, 30.8],
    ['Tycho', -43.3, -11.2],
    ['Koperník', 9.6, -20.1],
    ['Moře dešťů', 33, -16],
    ['Moře klidu', 8.5, 31],
    ['Čchang-e 4', -45.5, 177.6],
  ],
  mars: [
    ['Olympus Mons', 18.65, -133.8],
    ['Valles Marineris', -14, -59],
    ['Hellas', -42.4, 70.5],
    ['Perseverance', 18.44, 77.45],
    ['Curiosity', -4.59, 137.44],
    ['Severní čepička', 87, 0],
  ],
  mercury: [['Caloris', 30.5, 170]],
  venus: [
    ['Maxwell Montes', 65.2, 3.3],
    ['Aphrodite Terra', -6, 105],
  ],
  jupiter: [['Velká rudá skvrna', -22, -94]],
  saturn: [['Šestiúhelník', 78, 0]],
  pluto: [['Sputnik Planitia', 25, 180]],
  charon: [['Mordor Macula', 80, 0]],
  titan: [['Huygens', -10.3, 167.7]],
  io: [
    ['Pele', -18.7, 104.7],
    ['Loki', 13, 51],
  ],
  europa: [['Conamara Chaos', 9.7, 87]],
  ceres: [
    ['Occator', 19.8, -120.7],
    ['Ahuna Mons', -10.5, -43.8],
  ],
  vesta: [['Rheasilvia', -75, -59]],
  mimas: [['Herschel', -1.4, -112]],
  enceladus: [['Tygří pruhy', -80, 0]],
  callisto: [['Valhalla', 14.7, -56]],
  ganymede: [['Galileo Regio', 47, -129]],
};
const ce = Math.cos(23.4392911 * DEG),
  se = Math.sin(23.4392911 * DEG);
const eq2s = (raD, deD) => {
  const ra = raD * DEG,
    de = deD * DEG,
    x = Math.cos(de) * Math.cos(ra),
    y = Math.cos(de) * Math.sin(ra),
    z = Math.sin(de);
  return [x, -se * y + ce * z, -(ce * y + se * z)];
};
// sondy: polohy přibližné (směr a vzdálenost k roku 2025 + roční přírůstek; dráhy u Země jen ilustrativně)
const FAR = [
  ['Voyager 1', eq2s(258.3, 12.1), 166.0, 3.57, 'Nejvzdálenější lidský výtvor. Letí od roku 1977, je za heliopauzou.'],
  ['Voyager 2', eq2s(301, -59.4), 138.8, 3.2, 'Jediná sonda, která navštívila Uran a Neptun.'],
  ['New Horizons', eq2s(290.5, -20.2), 61, 2.9, 'V roce 2015 proletěla kolem Pluta, v roce 2019 kolem Arrokothu.'],
  ['Pioneer 10', eq2s(78.5, 26), 139, 2.5, 'První sonda u Jupiteru (1973). Od roku 2003 mlčí.'],
];
const NEAR = [
  ['ISS', 6791, 92.9, 51.6, 'Mezinárodní vesmírná stanice: oběhne Zemi za 93 minut, 16× denně.'],
  ['Hubble', 6918, 95.4, 28.5, 'Hubbleův dalekohled, na dráze od roku 1990.'],
];

export function createExtras(S, A, api) {
  const X = { ruler: -1, grid: false, flare: true, probes: [], mini: true };
  const m9 = new Array(9),
    parts = [];
  let warp = 0,
    ring = null;
  const streak = Array.from({ length: 70 }, () => [Math.random() * 6.2832, 0.25 + Math.random() * 0.75, Math.random()]);
  X.burst = (kid) => {
    if (kid) {
      for (let k = 0; k < 90; k++) {
        const a = Math.random() * 6.2832,
          v = 3 + Math.random() * 9;
        parts.push({
          x: innerWidth / 2,
          y: innerHeight * 0.42,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v - 4,
          r: 3 + Math.random() * 4,
          h: Math.random() * 360,
          t: 1,
          s: Math.random() < 0.3,
        });
      }
      A.play('pop');
    } else ring = { t: 0 };
    S.wake();
  };
  S.overlays.push((ctx, e) => {
    const { W, H, F, fwd, right, up, big, R } = e,
      C = S.camPos,
      kid = api.kid(),
      fi = S.focus,
      now = performance.now();
    const proj = (x, y, z) => {
      const dx = x - C[0],
        dy = y - C[1],
        dz = z - C[2],
        zz = dx * fwd.x + dy * fwd.y + dz * fwd.z;
      if (zz <= 0) return null;
      return [
        W / 2 + ((dx * right.x + dy * right.y + dz * right.z) / zz) * F,
        H / 2 - ((dx * up.x + dy * up.y + dz * up.z) / zz) * F,
        zz,
      ];
    };
    const hidden = (sx, sy, dist) => {
      for (const j of big) {
        const q = R[j];
        if (dist > q.dist && Math.hypot(q.sx - sx, q.sy - sy) < q.pr * 0.98) return true;
      }
      return false;
    };
    const text = (t, x, y, col, font = '12px system-ui, sans-serif') => {
      ctx.font = font;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.strokeText(t, x, y);
      ctx.fillStyle = col;
      ctx.fillText(t, x, y);
    };
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 1;
    // --- warp při letu: čáry od středu, v dětském režimu duhové ---
    const fl = S.cam.fly,
      target = fl && fl.ph !== 2 ? (fl.ph === 0 ? Math.min(1, fl.t * 1.5) : Math.max(0, 1 - fl.t * 1.6)) : 0;
    warp += (target - warp) * 0.15;
    if (warp > 0.02) {
      ctx.lineCap = 'round';
      for (const s of streak) {
        const r0 = ((0.12 + s[1] * 0.5) * Math.hypot(W, H)) / 2,
          len = warp * (40 + 260 * s[2]) * (0.5 + s[1]),
          ca = Math.cos(s[0]),
          sa = Math.sin(s[0]);
        ctx.strokeStyle = kid
          ? `hsla(${(s[0] * 57.3 + now * 0.05) % 360},95%,72%,${0.5 * warp})`
          : `rgba(200,220,255,${0.32 * warp * s[2]})`;
        ctx.lineWidth = kid ? 2 : 1.2;
        ctx.beginPath();
        ctx.moveTo(W / 2 + ca * r0, H / 2 + sa * r0);
        ctx.lineTo(W / 2 + ca * (r0 + len), H / 2 + sa * (r0 + len));
        ctx.stroke();
      }
      S.wake();
    }
    // --- osa rotace, rovník a poledníky zaostřeného tělesa ---
    const rf = R[fi];
    if (X.grid && rf.pr > 30 && rf.z > 0) {
      basis(fi, S.jd, m9);
      const cx = P[fi * 3],
        cy = P[fi * 3 + 1],
        cz = P[fi * 3 + 2],
        Rk = shape[fi].rmax,
        vx = C[0] - cx,
        vy = C[1] - cy,
        vz = C[2] - cz,
        vl = Math.hypot(vx, vy, vz);
      const pt = (lat, lon, k = 1.003) => {
        const cl = Math.cos(lat),
          x = cl * Math.cos(lon),
          y = cl * Math.sin(lon),
          z = Math.sin(lat),
          wx = m9[0] * x + m9[3] * y + m9[6] * z,
          wy = m9[1] * x + m9[4] * y + m9[7] * z,
          wz = m9[2] * x + m9[5] * y + m9[8] * z;
        if ((wx * vx + wy * vy + wz * vz) / vl < Rk / vl) return null;
        return proj(cx + wx * Rk * k, cy + wy * Rk * k, cz + wz * Rk * k);
      };
      const curve = (fn, col, lw) => {
        ctx.strokeStyle = col;
        ctx.lineWidth = lw;
        ctx.beginPath();
        let pen = false;
        for (let k = 0; k <= 72; k++) {
          const p = fn(k / 72);
          if (!p) {
            pen = false;
            continue;
          }
          if (pen) ctx.lineTo(p[0], p[1]);
          else ctx.moveTo(p[0], p[1]);
          pen = true;
        }
        ctx.stroke();
      };
      for (const la of [-60, -30, 30, 60]) curve((u) => pt(la * DEG, u * 6.2832), 'rgba(120,170,255,0.22)', 1);
      for (let lo = 0; lo < 360; lo += 30)
        curve((u) => pt((u - 0.5) * 3.1416, lo * DEG), lo === 0 ? 'rgba(255,200,87,0.5)' : 'rgba(120,170,255,0.2)', 1);
      curve((u) => pt(0, u * 6.2832), 'rgba(255,200,87,0.75)', 1.6);
      const n = proj(cx + m9[6] * Rk * 1.45, cy + m9[7] * Rk * 1.45, cz + m9[8] * Rk * 1.45),
        s2 = proj(cx - m9[6] * Rk * 1.45, cy - m9[7] * Rk * 1.45, cz - m9[8] * Rk * 1.45),
        n0 = proj(cx + m9[6] * Rk, cy + m9[7] * Rk, cz + m9[8] * Rk),
        s0 = proj(cx - m9[6] * Rk, cy - m9[7] * Rk, cz - m9[8] * Rk);
      ctx.strokeStyle = 'rgba(255,120,120,0.85)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([5, 4]);
      if (n && n0) {
        ctx.beginPath();
        ctx.moveTo(n0[0], n0[1]);
        ctx.lineTo(n[0], n[1]);
        ctx.stroke();
      }
      if (s2 && s0) {
        ctx.beginPath();
        ctx.moveTo(s0[0], s0[1]);
        ctx.lineTo(s2[0], s2[1]);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      if (n) text(kid ? 'severní pól' : 'S', n[0] + 6, n[1], '#ff9c9c');
      if (s2) text(kid ? 'jižní pól' : 'J', s2[0] + 6, s2[1], '#ff9c9c');
    }
    // --- útvary na povrchu ---
    const fs = FEAT[B[fi].id];
    if (fs && rf.pr > 110 && S.labMode > 0 && rf.z > 0) {
      basis(fi, S.jd, m9);
      const cx = P[fi * 3],
        cy = P[fi * 3 + 1],
        cz = P[fi * 3 + 2],
        Rk = B[fi].R,
        vx = C[0] - cx,
        vy = C[1] - cy,
        vz = C[2] - cz,
        vl = Math.hypot(vx, vy, vz),
        al = Math.min(1, (rf.pr - 110) / 80);
      for (const f of fs) {
        const la = f[1] * DEG,
          lo = f[2] * DEG,
          cl = Math.cos(la),
          x = cl * Math.cos(lo),
          y = cl * Math.sin(lo),
          z = Math.sin(la),
          wx = m9[0] * x + m9[3] * y + m9[6] * z,
          wy = m9[1] * x + m9[4] * y + m9[7] * z,
          wz = m9[2] * x + m9[5] * y + m9[8] * z;
        if ((wx * vx + wy * vy + wz * vz) / vl < Rk / vl + 0.12) continue;
        const p = proj(cx + wx * Rk, cy + wy * Rk, cz + wz * Rk);
        if (!p || p[0] < 0 || p[0] > W || p[1] < 60 || p[1] > H - 100) continue;
        ctx.globalAlpha = al;
        ctx.strokeStyle = kid ? '#ffd23f' : '#ffffff';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(p[0], p[1], 4, 0, 6.2832);
        ctx.moveTo(p[0] + 4, p[1] - 4);
        ctx.lineTo(p[0] + 14, p[1] - 14);
        ctx.stroke();
        text(
          (kid ? '📍 ' : '') + f[0],
          p[0] + 17,
          p[1] - 16,
          kid ? '#ffe27a' : '#f3f6ff',
          (kid ? '600 13px ' : '12px ') + 'system-ui, sans-serif'
        );
      }
      ctx.globalAlpha = 1;
    }
    // --- sondy ---
    X.probes.length = 0;
    if (S.labMode > 0) {
      const yr = 2000 + (S.jd - 2451545) / 365.25,
        put = (name, x, y, z, info) => {
          const p = proj(x, y, z);
          if (!p || p[0] < 0 || p[0] > W || p[1] < 50 || p[1] > H - 90 || hidden(p[0], p[1], p[2])) return;
          X.probes.push({ name, x: p[0], y: p[1], info });
          ctx.strokeStyle = '#7dffb0';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(p[0], p[1] - 5);
          ctx.lineTo(p[0] + 5, p[1]);
          ctx.lineTo(p[0], p[1] + 5);
          ctx.lineTo(p[0] - 5, p[1]);
          ctx.closePath();
          ctx.stroke();
          text((kid ? '🛰️ ' : '') + name, p[0] + 9, p[1], '#9dffc4', '11.5px system-ui, sans-serif');
        };
      if (yr > 1977.7)
        for (const f of FAR) {
          const d = Math.max(1, f[2] + f[3] * (yr - 2025)) * AU;
          if (S.cam.alt > 3 * AU)
            put(
              f[0],
              f[1][0] * d,
              f[1][1] * d,
              f[1][2] * d,
              f[4] + ` Teď asi ${Math.round(d / AU)} AU od Slunce (poloha přibližná).`
            );
        }
      const re = R[EARTH];
      if (re.pr > 25 && yr > 1990.3) {
        basis(EARTH, S.jd, m9);
        const Z = [m9[6], m9[7], m9[8]],
          xl = Math.hypot(Z[2], Z[0]) || 1,
          Xa = [Z[2] / xl, 0, -Z[0] / xl],
          Ya = [Z[1] * Xa[2] - Z[2] * Xa[1], Z[2] * Xa[0] - Z[0] * Xa[2], Z[0] * Xa[1] - Z[1] * Xa[0]],
          ex = P[EARTH * 3],
          ey = P[EARTH * 3 + 1],
          ez = P[EARTH * 3 + 2];
        for (const n of NEAR) {
          if (n[0] === 'ISS' && yr < 1998.9) continue;
          const a = ((S.jd * 1440) / n[2]) * 6.2832,
            ci = Math.cos(n[3] * DEG),
            si = Math.sin(n[3] * DEG),
            ca = Math.cos(a),
            sa = Math.sin(a);
          put(
            n[0],
            ex + n[1] * (ca * Xa[0] + sa * (ci * Ya[0] + si * Z[0])),
            ey + n[1] * (ca * Xa[1] + sa * (ci * Ya[1] + si * Z[1])),
            ez + n[1] * (ca * Xa[2] + sa * (ci * Ya[2] + si * Z[2])),
            n[4] + ' (Poloha na dráze je ilustrativní.)'
          );
        }
        if (yr > 2022) {
          const l = Math.hypot(ex, ey, ez),
            k = 1 + 1.5e6 / l;
          put(
            'JWST',
            ex * k,
            ey * k,
            ez * k,
            'Webbův dalekohled krouží kolem bodu L2, 1,5 milionu km od Země směrem od Slunce.'
          );
        }
      }
    }
    // --- pravítko: úsečka mezi připíchnutým a vybraným tělesem ---
    if (X.ruler >= 0 && X.ruler !== S.sel) {
      const a = R[X.ruler],
        b = R[S.sel];
      if (a.z > 0 && b.z > 0) {
        ctx.strokeStyle = '#ffc857';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([7, 5]);
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.stroke();
        ctx.setLineDash([]);
        const d = Math.hypot(
            P[X.ruler * 3] - P[S.sel * 3],
            P[X.ruler * 3 + 1] - P[S.sel * 3 + 1],
            P[X.ruler * 3 + 2] - P[S.sel * 3 + 2]
          ),
          sec = d / 299792.458,
          lt =
            sec < 90
              ? sec.toFixed(1) + ' s'
              : sec < 5400
                ? (sec / 60).toFixed(1) + ' min'
                : (sec / 3600).toFixed(1) + ' h';
        text(
          `📏 ${B[X.ruler].cs} – ${B[S.sel].cs}: ${fmtDist(d)} · světlo ${lt}`,
          (a.sx + b.sx) / 2 + 10,
          (a.sy + b.sy) / 2 - 10,
          '#ffe7ad',
          '600 13px system-ui, sans-serif'
        );
      }
    }
    // --- odlesky objektivu (Slunce v záběru) ---
    const sn = R[SUN];
    if (
      X.flare &&
      S.quality > 0 &&
      sn.z > 0 &&
      sn.sx > -50 &&
      sn.sx < W + 50 &&
      sn.sy > -50 &&
      sn.sy < H + 50 &&
      sn.pr < 160 &&
      !(S.sunMode === 3 && sn.pr > 5) /* koronograf: zakrytý kotouč odlesk nedělá */ &&
      !hidden(sn.sx, sn.sy, sn.dist)
    ) {
      const k = (kid ? 0.6 : 1) * Math.min(1, 1.3 - sn.pr / 160) * (0.55 + 0.45 * Math.min(1, (20 * AU) / sn.dist)),
        dx = W / 2 - sn.sx,
        dy = H / 2 - sn.sy;
      ctx.globalCompositeOperation = 'lighter';
      for (const g of [
        [0.35, 26, '255,190,120', 0.1],
        [0.6, 60, '120,200,255', 0.05],
        [1.0, 16, '255,255,255', 0.09],
        [1.35, 90, '255,150,220', 0.04],
        [1.7, 40, '140,255,190', 0.05],
      ]) {
        const x = sn.sx + dx * g[0] * 2,
          y = sn.sy + dy * g[0] * 2,
          gr = ctx.createRadialGradient(x, y, 0, x, y, g[1]);
        gr.addColorStop(0, `rgba(${g[2]},${g[3] * k})`);
        gr.addColorStop(0.7, `rgba(${g[2]},${g[3] * k * 0.7})`);
        gr.addColorStop(1, `rgba(${g[2]},0)`);
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(x, y, g[1], 0, 6.2832);
        ctx.fill();
      }
      const sg = ctx.createLinearGradient(sn.sx - 260, 0, sn.sx + 260, 0);
      sg.addColorStop(0, 'rgba(160,200,255,0)');
      sg.addColorStop(0.5, `rgba(190,215,255,${0.16 * k})`);
      sg.addColorStop(1, 'rgba(160,200,255,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(sn.sx - 260, sn.sy - 1.2, 520, 2.4);
      ctx.globalCompositeOperation = 'source-over';
    }
    // --- konfety (dětské) a zlatý prstenec (dospělé) ---
    if (parts.length) {
      for (let k = parts.length - 1; k >= 0; k--) {
        const p = parts[k];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.28;
        p.vx *= 0.985;
        p.t -= 0.011;
        if (p.t <= 0 || p.y > H + 20) {
          parts.splice(k, 1);
          continue;
        }
        ctx.globalAlpha = Math.min(1, p.t * 2);
        ctx.fillStyle = `hsl(${p.h},95%,65%)`;
        if (p.s) {
          ctx.font = p.r * 4 + 'px serif';
          ctx.fillText('★', p.x, p.y);
        } else {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.t * 12 + p.h);
          ctx.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r);
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
      S.wake();
    }
    if (ring) {
      ring.t += 0.022;
      const q = R[fi];
      if (ring.t >= 1 || q.z <= 0) ring = null;
      else {
        ctx.strokeStyle = `rgba(255,200,87,${0.8 * (1 - ring.t)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(q.sx, q.sy, Math.min(q.pr, 260) * (1 + ring.t * 0.6) + 10, 0, 6.2832);
        ctx.stroke();
        S.wake();
      }
    }
  });
  X.pickProbe = (x, y) => X.probes.find((p) => Math.hypot(p.x - x, p.y - y) < 14) || null;
  // --- minimapa: pohled shora na ekliptiku, vzdálenost od Slunce logaritmicky ---
  const mc = document.getElementById('mini'),
    mx = mc.getContext('2d'),
    MS = 168,
    PL = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].map((n) =>
      idx.get(n)
    );
  let spots = [];
  const d = Math.min(window.devicePixelRatio || 1, 2);
  mc.width = mc.height = MS * d;
  mx.setTransform(d, 0, 0, d, 0, 0);
  const rad = (au) => (Math.log10(1 + au / 0.25) / Math.log10(1 + 60 / 0.25)) * (MS / 2 - 8);
  X.drawMini = () => {
    if (!X.mini || document.hidden || !mc.offsetParent || document.body.classList.contains('cine'))
      return; /* skrytá minimapa se nekreslí */
    mx.clearRect(0, 0, MS, MS);
    const c = MS / 2;
    spots = [];
    mx.fillStyle = 'rgba(8,12,22,0.78)';
    mx.beginPath();
    mx.arc(c, c, c - 1, 0, 6.2832);
    mx.fill();
    mx.strokeStyle = 'rgba(140,165,210,0.35)';
    mx.lineWidth = 1;
    mx.stroke();
    mx.fillStyle = '#ffd98a';
    mx.beginPath();
    mx.arc(c, c, 3, 0, 6.2832);
    mx.fill();
    spots.push([c, c, SUN]);
    for (const i of PL) {
      const x = P[i * 3],
        z = P[i * 3 + 2],
        au = Math.hypot(x, z) / AU,
        r = rad(au),
        a = Math.atan2(z, x),
        px = c + Math.cos(a) * r,
        py = c + Math.sin(a) * r;
      mx.strokeStyle = 'rgba(140,165,210,0.16)';
      mx.beginPath();
      mx.arc(c, c, r, 0, 6.2832);
      mx.stroke();
      const col = B[i].col || [0.7, 0.7, 0.7],
        on = i === S.focus || par[S.focus] === i;
      mx.fillStyle = `rgb(${col.map((v) => Math.round(Math.min(1, v * 0.8 + 0.3) * 255))})`;
      mx.beginPath();
      mx.arc(px, py, on ? 4 : 2.6, 0, 6.2832);
      mx.fill();
      if (on) {
        mx.strokeStyle = '#ffc857';
        mx.beginPath();
        mx.arc(px, py, 7, 0, 6.2832);
        mx.stroke();
      }
      spots.push([px, py, i]);
    }
    // kde právě jsi: zelená značka s pulzujícím kruhem, spojnice ke Slunci a jméno tělesa, u kterého stojíš
    const C = S.camPos,
      au = Math.hypot(C[0], C[2]) / AU,
      r = Math.min(MS / 2 - 6, rad(au)),
      a = Math.atan2(C[2], C[0]),
      px = c + Math.cos(a) * r,
      py = c + Math.sin(a) * r,
      ph = (performance.now() % 1800) / 1800;
    mx.strokeStyle = 'rgba(125,255,176,0.35)';
    mx.lineWidth = 1;
    mx.setLineDash([2, 3]);
    mx.beginPath();
    mx.moveTo(c, c);
    mx.lineTo(px, py);
    mx.stroke();
    mx.setLineDash([]);
    mx.strokeStyle = `rgba(125,255,176,${0.9 * (1 - ph)})`;
    mx.lineWidth = 1.6;
    mx.beginPath();
    mx.arc(px, py, 5 + ph * 11, 0, 6.2832);
    mx.stroke();
    mx.fillStyle = '#7dffb0';
    mx.strokeStyle = '#04140a';
    mx.lineWidth = 1.2;
    mx.beginPath();
    mx.arc(px, py, 4.2, 0, 6.2832);
    mx.fill();
    mx.stroke();
    const nm = B[S.focus].cs,
      f = S.focus === SUN ? '' : (au >= 10 ? au.toFixed(1) : au.toFixed(2)).replace('.', ',') + ' AU';
    mx.font = '600 10.5px system-ui, sans-serif';
    mx.textBaseline = 'middle';
    const tw = Math.max(mx.measureText(nm).width, mx.measureText(f).width),
      tx = px + 9 + tw > MS - 4 ? px - 9 - tw : px + 9,
      ty = Math.max(14, Math.min(MS - 20, py));
    mx.lineWidth = 3;
    mx.strokeStyle = 'rgba(0,0,0,0.85)';
    mx.strokeText(nm, tx, ty);
    mx.fillStyle = '#eafff2';
    mx.fillText(nm, tx, ty);
    if (f) {
      mx.font = '9.5px system-ui, sans-serif';
      mx.strokeText(f, tx, ty + 11);
      mx.fillStyle = '#9fe8bd';
      mx.fillText(f, tx, ty + 11);
    }
  };
  setInterval(X.drawMini, 150);
  mc.addEventListener('click', (e) => {
    const b = mc.getBoundingClientRect(),
      x = e.clientX - b.left,
      y = e.clientY - b.top;
    let best = -1,
      bd = 14;
    for (const s of spots) {
      const q = Math.hypot(s[0] - x, s[1] - y);
      if (q < bd) {
        bd = q;
        best = s[2];
      }
    }
    if (best >= 0) S.flyTo(best);
    else if (api.where) api.where();
  });
  return X;
}
