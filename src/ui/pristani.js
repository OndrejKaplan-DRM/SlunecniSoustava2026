// Přistání na povrchu (verze 2.2): výběr místa zaměřovacím křížkem, sestup, úklid oken a snadný návrat do vesmíru.
// Tok: tlačítko „🛬 Přistát na povrchu“ (karta, ☰; nebo kolečkem blíž u povrchu) → těleso se přiblíží, zapne se mřížka zeměpisných souřadnic a uprostřed obrazu je křížek;
// uživatel tahem natočí těleso tak, aby bylo vybrané místo pod křížkem (nebo vybere pojmenované místo) → „Přistát“ (Enter,
// dvojklik) → kamera sestoupí kolmo k místu → pohled z povrchu. Zpět do vesmíru: ⬆ Vzlétnout, Esc, kolečkem ven při nejširším
// zorném poli, klik na jiné těleso v liště.
import { B, P, SUN, shape } from '../core/sim.js';
import { subPoint, siteFrame } from '../core/misto.js';
import { PLACES } from '../data/mista.js';

const DEG = Math.PI / 180;
/* vzdálenost dvou míst na kouli ve stupních */
const gc = (a1, o1, a2, o2) => {
  const c =
    Math.sin(a1 * DEG) * Math.sin(a2 * DEG) + Math.cos(a1 * DEG) * Math.cos(a2 * DEG) * Math.cos((o1 - o2) * DEG);
  return Math.acos(Math.max(-1, Math.min(1, c))) / DEG;
};

export function createPristani(S, A, ui, P0) {
  const $ = (s) => document.querySelector(s),
    kid = () => document.body.classList.contains('kid'),
    nf = (v, d = 1) => v.toLocaleString('cs-CZ', { maximumFractionDigits: d, minimumFractionDigits: d });
  const pan = document.createElement('div');
  pan.id = 'surfpick';
  pan.className = 'panel';
  pan.setAttribute('aria-label', 'Výběr místa přistání');
  document.body.appendChild(pan);
  /* stav: null, nebo { i, phase: 'let' | 'vyber' | 'sestup', grid0, t0, lat, lon } */
  let st = null;
  const fo = {};
  const placeTxt = (lat, lon) =>
    `${nf(Math.abs(lat))}° ${lat >= 0 ? 's.' : 'j.'} š., ${nf(Math.abs(((lon + 540) % 360) - 180))}° ${((lon + 540) % 360) - 180 >= 0 ? 'v.' : 'z.'} d.`;
  /* výška Slunce nad obzorem v místě (úhel od bodu, kde je Slunce v nadhlavníku) */
  const sunEl = (i, lat, lon) => {
    const ss = subPoint(i, SUN, S.jd);
    return 90 - gc(lat, lon, ss[0], ss[1]);
  };
  const near = (i, lat, lon) => {
    let best = null;
    for (const p of PLACES[B[i].id] || []) {
      const d = gc(lat, lon, p[1], p[2]);
      if (!best || d < best.d) best = { n: p[0], d };
    }
    return best && best.d * DEG * B[i].R < Math.max(150, B[i].R * 0.08) ? best : null;
  };
  /* vzdálenost kamery, při které těleso zabere zhruba 60 % výšky obrazu */
  const pickAlt = (i) => {
    const R = shape[i] ? shape[i].rmax : B[i].R,
      th = (S.fov ? S.fov() : 45) * 0.3 * DEG;
    return Math.max(R * 0.6, R / Math.sin(th) - R);
  };

  function draw() {
    if (!st || st.phase !== 'vyber') {
      pan.classList.remove('on');
      return;
    }
    const i = st.i,
      b = B[i],
      pl = PLACES[b.id] || [];
    pan.innerHTML =
      `<div class="pk-h">${kid() ? '🛬 Kam přistaneme?' : '🛬 Vyber místo přistání'} – ${b.cs}</div>` +
      `<p class="pk-t">${kid() ? 'Táhni planetu, ať je místo pod křížkem. Pak klikni na Přistát.' : 'Tahem natoč těleso tak, aby bylo místo pod křížkem uprostřed. Kolečkem přiblížíš.'}</p>` +
      `<p class="pk-ll"></p>` +
      `<div class="pk-b"><button class="pk-go" data-k="go" title="Přistát na místě pod křížkem (Enter, dvojklik)">✅ Přistát</button>` +
      (pl.length
        ? `<select data-k="pl" aria-label="Pojmenovaná místa"><option value="">📍 známá místa…</option>${pl.map((p, k) => `<option value="${k}">${p[0]}</option>`).join('')}</select>`
        : '') +
      `<button data-k="day" title="Natočit těleso tak, aby pod křížkem byl den (Slunce vysoko)">☀ Den</button>` +
      `<button data-k="x" title="Zrušit (Esc)">✕</button></div>`;
    pan.classList.add('on');
    tick();
  }
  let tLL = 0;
  function tick() {
    if (!st) return;
    if (st.phase === 'let' && !S.flying()) {
      st.phase = 'vyber';
      S.cam.ly = S.cam.lp = 0;
      draw();
      S.bus.emit('surfPick', st.phase);
    }
    if (st.phase === 'vyber') {
      const now = performance.now();
      if (now - tLL > 120) {
        tLL = now;
        const [lat, lon] = S.subPoint(st.i),
          e = sunEl(st.i, lat, lon),
          n = near(st.i, lat, lon),
          el = pan.querySelector('.pk-ll');
        if (el) {
          const t =
            `📍 <b>${placeTxt(lat, lon)}</b> · ${e > 0.5 ? `☀ den, Slunce ${nf(e, 0)}° nad obzorem` : e > -6 ? '🌅 soumrak' : '🌙 noc'}` +
            (n ? ` · u místa <b>${n.n}</b> (${nf(n.d * DEG * B[st.i].R, 0)} km)` : '');
          if (el.innerHTML !== t) el.innerHTML = t;
        }
      }
    }
    if (st.phase === 'sestup') {
      const t = (performance.now() - st.t0) / 1000,
        R = B[st.i].R;
      if (t > 1.9 || S.cam.alt < R * 0.012) {
        const { i, lat, lon } = st;
        finish();
        P0.enter(i, lat, lon, { landed: true });
      }
    }
  }
  S.ticks.push(tick);
  /* křížek uprostřed obrazu (pod ním je místo, nad kterým kamera stojí) */
  S.overlays.push((ctx, e) => {
    if (st && st.phase === 'sestup') {
      /* sestup: výška nad povrchem, ať je vidět, že se přistává */
      const k = S.txtK || 1,
        h = Math.max(0, S.cam.alt),
        t = `🛬 ${kid() ? 'Přistáváme' : 'Sestup'} · ${h >= 10 ? nf(h, 0) + ' km' : nf(h * 1000, 0) + ' m'} nad povrchem`;
      ctx.save();
      ctx.font = `700 ${17 * k}px system-ui, -apple-system, Segoe UI, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.strokeText(t, e.W / 2, e.H * 0.3);
      ctx.fillStyle = '#ffe2a8';
      ctx.fillText(t, e.W / 2, e.H * 0.3);
      ctx.restore();
      return;
    }
    if (!st || st.phase !== 'vyber') return;
    const r = e.R[st.i];
    if (!r || r.z <= 0) return;
    const x = e.W / 2,
      y = e.H / 2,
      k = S.txtK || 1;
    ctx.save();
    ctx.lineWidth = 2 * k;
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.arc(x, y, 15 * k, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 214, 102, 0.95)';
    ctx.lineWidth = 1.5 * k;
    ctx.beginPath();
    ctx.arc(x, y, 15 * k, 0, 2 * Math.PI);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      ctx.moveTo(x + dx * 7 * k, y + dy * 7 * k);
      ctx.lineTo(x + dx * 30 * k, y + dy * 30 * k);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 214, 102, 0.95)';
    ctx.beginPath();
    ctx.arc(x, y, 1.8 * k, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  });

  function start(i, opt = {}) {
    if (i === SUN) return ui.toast('Na Slunci stát nejde – nemá pevný povrch a má 5 500 °C.');
    if (S.surf) P0.exit();
    if (st) finish(true);
    st = { i, phase: 'let', grid0: P0.info.guides().body };
    P0.info.bodyGrid(true);
    document.body.classList.add('surfpick');
    /* kolečkem blíž u povrchu (opt.stay): zůstat, kde kamera je – místo pod ní je to, co si uživatel přibližoval */
    if (!(opt.stay && S.focus === i && !S.flying())) S.flyTo(i, { alt: pickAlt(i) });
    A.play('panel_open');
    if (!S.flying()) {
      st.phase = 'vyber';
      S.cam.ly = S.cam.lp = 0;
      draw();
    }
    S.bus.emit('surfPick', st.phase);
    S.wake();
  }
  function finish(cancel) {
    if (!st) return;
    if (!st.grid0) P0.info.bodyGrid(false);
    st = null;
    document.body.classList.remove('surfpick');
    pan.classList.remove('on');
    if (cancel) A.play('panel_close');
    S.bus.emit('surfPick', null);
    S.wake();
  }
  /* natočit těleso tak, aby místo (šířka, délka) bylo pod kamerou */
  function aimAt(i, lat, lon) {
    siteFrame(i, lat, lon, S.jd, fo);
    const n = fo.n;
    S.cam.pitch = Math.asin(Math.max(-1, Math.min(1, n[1])));
    S.cam.yaw = Math.atan2(n[2], n[0]);
    S.cam.ly = S.cam.lp = 0;
    S.wake();
  }
  function land() {
    if (!st || st.phase !== 'vyber') return;
    const i = st.i;
    let [lat, lon] = S.subPoint(i);
    /* krajina umí místo posunout (např. z oceánu na nejbližší pevninu) */
    if (P0.adjust) {
      const a = P0.adjust(i, lat, lon);
      if (a) {
        if (a.msg) ui.toast(a.msg, 6000);
        lat = a.lat;
        lon = a.lon;
        aimAt(i, lat, lon);
      }
    }
    st.lat = lat;
    st.lon = lon;
    st.phase = 'sestup';
    st.t0 = performance.now();
    pan.classList.remove('on');
    A.play('brake');
    S.flyTo(i, { alt: B[i].R * 0.004 });
    S.bus.emit('surfPick', st.phase);
    S.wake();
  }
  pan.addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-k]');
    if (!b || !st) return;
    const k = b.dataset.k;
    if (k === 'go') land();
    else if (k === 'x') finish(true);
    else if (k === 'day') {
      const ss = subPoint(st.i, SUN, S.jd);
      aimAt(st.i, Math.max(-60, Math.min(60, ss[0])), ss[1]);
      A.play('a_tick');
    }
  });
  pan.addEventListener('change', (ev) => {
    if (!st || ev.target.dataset.k !== 'pl' || ev.target.value === '') return;
    const p = (PLACES[B[st.i].id] || [])[+ev.target.value];
    ev.target.blur();
    if (p) aimAt(st.i, p[1], p[2]);
    A.play('a_tick');
  });
  window.addEventListener(
    'keydown',
    (ev) => {
      if (!st || st.phase !== 'vyber' || ev.target.closest('input, select, textarea')) return;
      if (ev.key === 'Enter') {
        ev.preventDefault();
        land();
      } else if (ev.key === 'Escape') {
        ev.preventDefault();
        ev.stopPropagation();
        finish(true);
      }
    },
    true
  );
  const cv = document.querySelector('#gl');
  if (cv)
    cv.addEventListener(
      'dblclick',
      (ev) => {
        if (!st || st.phase !== 'vyber') return;
        ev.preventDefault();
        ev.stopPropagation();
        land();
      },
      true
    );
  /* jiný přelet (ikona v liště, seznam) výběr zruší */
  S.bus.on('fly', (j) => {
    if (st && st.phase === 'vyber' && j !== st.i) finish(true);
  });
  /* kolečkem blíž u povrchu: první trojice kroků ukáže křížek, další trojice přistane */
  S.bus.on('zoomIn', (i) => {
    if (S.surf || i === SUN || !B[i]) return;
    if (st && st.phase === 'vyber' && st.i === i) return land();
    if (st) return;
    start(i, { stay: true });
    ui.toast(
      kid()
        ? '🛬 Přistáváme! Ještě kolečkem blíž – nebo klikni na ✅ Přistát.'
        : '🛬 Místo pod křížkem: dalším otočením kolečka blíž přistaneš (nebo ✅ Přistát, Enter).',
      4500
    );
  });
  return {
    start,
    cancel: () => finish(true),
    land,
    aimAt,
    state: () => (st ? { i: st.i, phase: st.phase } : null),
  };
}
