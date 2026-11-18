// Úkazy na obloze (verze 1.3): seznam událostí, karta události, kamera nad místo úkazu a návrat do původního pohledu.
// Zatmění Slunce: obrys stínu a jeho dráha po Zemi ve 2D vrstvě (stejně na počítači i telefonu) a okénko „pohled z místa“
// se Sluncem a Měsícem. Data: src/data/udalosti.json (jd je světový čas; datum na kartě gregoriánské jako v aplikaci).
import U from '../data/udalosti.json';
import { B, idx, basis, updateAll, P, SUN, MOON, EARTH, AU, setEl } from '../core/sim.js';
const RE = 6371,
  RS = 696000,
  RM = 1737.4,
  DEG = Math.PI / 180;
export function createUdalosti(S, A, ui) {
  const $ = (s) => document.querySelector(s),
    list = $('#uk-list'),
    card = $('#ukc'),
    m9 = new Array(9);
  let cur = null /* otevřená událost */,
    back = null /* uložený pohled před ukázkou */,
    play = 0 /* zbývající dny přehrávání průchodu */,
    playK = 0 /* dny za sekundu při přehrávání */,
    warned = false /* upozornění na přisvětlení už zaznělo */,
    track = [] /* dráha osy stínu po Zemi: jednotkové vektory v soustavě Země */,
    trail = [] /* přechod: dráha planety přes Slunce (posun v radiánech) */,
    filt = '' /* filtr seznamu */,
    mini = false /* karta sbalená do proužku */,
    skyT = 0;
  /* viděné úkazy (hra pro lovce): ukládá se jen do tohoto prohlížeče */
  let seen = [];
  try {
    seen = JSON.parse(localStorage.getItem('s200uk') || '[]');
  } catch (e) {
    /* soukromý režim */
  }
  const SHADOW = (e) => e.typ === 'slunce' || e.typ === 'mesic',
    TOP = (e) => e.typ === 'prechod' || e.typ === 'dvojice' || e.typ === 'skupina' || e.typ === 'blizko',
    SYM = { mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄', moon: '☽', sun: '☉', neptune: '♆' },
    rgb = (i) => {
      const c = B[i].col || [0.7, 0.7, 0.7];
      return `rgb(${c.map((v) => Math.round(60 + 195 * v)).join(',')})`;
    },
    ang = (r) => {
      const m = (r / DEG) * 60;
      return m < 1
        ? Math.round(m * 60) + '″'
        : m < 90
          ? (m < 10 ? m.toFixed(1) : Math.round(m)).toString().replace('.', ',') + '′'
          : (m / 60).toFixed(1).replace('.', ',') + '°';
    },
    num = (v, d = 0) => v.toLocaleString('cs-CZ', { maximumFractionDigits: d, minimumFractionDigits: d });
  /* supernovy na obloze: karty typu „hvezda“ + dvě bez karty (údaje: Green a Stephenson 2003, přehled na Wikipedii) */
  const STARS = U.filter((e) => e.typ === 'hvezda').concat([
    { id: 'h1006', nazev: 'SN 1006', ra: 225.533, dec: -41.95, mag: -7.5, t0: 2088615.5, t1: 2089015.5, rise: 20 },
    { id: 'h1987', nazev: 'SN 1987A', ra: 83.867, dec: -69.27, mag: 2.9, t0: 2446935.5, t1: 2447135.5, rise: 85 },
  ]);
  const EPS = 23.4392911 * DEG;
  for (const e of STARS) {
    const a = e.ra * DEG,
      d = e.dec * DEG,
      x = Math.cos(d) * Math.cos(a),
      y = Math.cos(d) * Math.sin(a),
      z = Math.sin(d),
      ye = y * Math.cos(EPS) + z * Math.sin(EPS),
      ze = -y * Math.sin(EPS) + z * Math.cos(EPS);
    e.dir = [x, ze, -ye]; /* rovník → ekliptika → scéna (x, z, −y) */
  }
  /* jasnost v čase: náběh před maximem, pak rovnoměrný pokles k hranici viditelnosti okem (6 mag) na doloženém konci */
  const magAt = (e, jd) =>
    jd < e.t0 - e.rise || jd > e.t1
      ? null
      : jd < e.t0
        ? 6 + ((e.mag - 6) * (jd - (e.t0 - e.rise))) / e.rise
        : e.mag + ((6 - e.mag) * (jd - e.t0)) / (e.t1 - e.t0);
  const kid = () => document.body.classList.contains('kid');
  const cls = (c) => document.body.classList.contains(c),
    /* telefon a tablet nemají velké mapy: úkaz ukazujeme z větší výšky, kde je stín na kotouči čitelný */
    altOf = (e) => e.vyska * (cls('mob') ? 2.6 : cls('tab') ? 1.6 : 1);
  const pos = (k) => [P[k * 3], P[k * 3 + 1], P[k * 3 + 2]],
    sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    len = (a) => Math.hypot(a[0], a[1], a[2]),
    unit = (a) => {
      const l = len(a) || 1;
      return [a[0] / l, a[1] / l, a[2] / l];
    },
    cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  // soustava Země ↔ scéna (m9 musí být čerstvé: basis(EARTH, jd, m9))
  const toWorld = (v) => [0, 1, 2].map((k) => v[0] * m9[k] + v[1] * m9[3 + k] + v[2] * m9[6 + k]),
    toLocal = (p) => [0, 1, 2].map((k) => p[0] * m9[k * 3] + p[1] * m9[k * 3 + 1] + p[2] * m9[k * 3 + 2]),
    siteV = (lat, lon) => [
      Math.cos(lat * DEG) * Math.cos(lon * DEG),
      Math.cos(lat * DEG) * Math.sin(lon * DEG),
      Math.sin(lat * DEG),
    ];
  // směr od středu Země k místu úkazu (scéna)
  function dirOf(e, dLat = 0) {
    basis(idx.get(e.telo), S.jd, m9);
    return toWorld(siteV(e.lat + dLat, e.lon));
  }
  function aim(e) {
    /* na telefonu leží karta přes spodní polovinu obrazu: mířím o kus jižněji, aby místo úkazu vyšlo nad kartu */
    const p = dirOf(e, cls('mob') ? -24 : 0);
    S.lookSky({ x: -p[0], y: -p[1], z: -p[2] });
  }
  function setTime(jd) {
    S.jd = jd;
    updateAll(jd);
    S.wake();
  }
  // kde osa stínu Měsíce protíná Zemi (z poloh P pro právě nastavený čas); vrací vektor v soustavě Země a poloměry stínů v km
  /* Tabulka z katalogu NASA (Besselovy elementy, viz tools/model/besel_stopa.py): osa stínu na povrchu a pohled z místa
     po krocích času. Model má pás úplného zatmění posunutý až o stovky km, proto se obrys, dráha stínu a okénko kreslí podle ní. */
  function nasaAt(e, jd) {
    const n = e && e.nasa;
    if (!n) return null;
    const f = (jd - n.t0) / n.dt,
      k = Math.floor(f),
      u = f - k;
    if (k < 0 || k >= n.site.length - 1) return null;
    const mix = (a, b) => a.map((v, i) => v + (b[i] - v) * u),
      a0 = n.axis[k],
      a1 = n.axis[k + 1];
    let axis = null;
    if (a0 && a1) {
      const b1 = a1.slice();
      if (b1[1] - a0[1] > 180) b1[1] -= 360;
      if (b1[1] - a0[1] < -180) b1[1] += 360;
      axis = mix(a0, b1);
    }
    return { axis, site: mix(n.site[k], n.site[k + 1]) };
  }
  /* zeměpisná (geodetická) šířka → směr od středu Země */
  const geoV = (lat, lon) => siteV(Math.atan(0.99330562 * Math.tan(lat * DEG)) / DEG, lon);
  function shadow(ev) {
    const q = nasaAt(ev, S.jd);
    if (q) return q.axis ? { v: geoV(q.axis[0], q.axis[1]), um: q.axis[2], pen: q.axis[3] } : null;
    const e = pos(EARTH),
      mo = sub(pos(MOON), e),
      s = sub(pos(SUN), e),
      d = sub(mo, s),
      dl = len(d),
      u = [d[0] / dl, d[1] / dl, d[2] / dl],
      b = dot(mo, u),
      D = RE * RE - (dot(mo, mo) - b * b);
    if (D < 0) return null;
    const t = -b - Math.sqrt(D),
      p = [mo[0] + u[0] * t, mo[1] + u[1] * t, mo[2] + u[2] * t];
    return { v: unit(toLocal(p)), um: Math.abs(RM - ((RS - RM) * t) / dl), pen: RM + ((RS + RM) * t) / dl };
  }
  /* geocentrický pohled: posun tělesa k vůči středu c (východ vlevo, sever nahoře) v radiánech */
  function geo(k) {
    const d = sub(pos(k), pos(EARTH));
    return { d, u: unit(d), r: len(d), s: Math.asin(Math.min(1, B[k].R / len(d))) };
  }
  function frame(c) {
    basis(EARTH, S.jd, m9);
    const pole = [m9[6], m9[7], m9[8]],
      east = unit(cross(pole, c)),
      north = cross(c, east);
    return (u) => [dot(u, east), dot(u, north)];
  }
  /* dočasně přepne model na čas úkazu (pro náhled na kartě před ukázkou) */
  function atEvent(e, fn) {
    if (back) return fn();
    const now = S.jd;
    if (e.el) setEl(idx.get(e.a), e.el);
    S.jd = e.jd;
    updateAll(e.jd);
    const r = fn();
    if (e.el) setEl(idx.get(e.a), null);
    S.jd = now;
    updateAll(now);
    return r;
  }
  function buildTrack(e) {
    track = [];
    trail = [];
    if (e.typ === 'prechod') {
      const now = S.jd;
      for (let k = 0; k <= 40; k++) {
        const t = e.jd - e.okno + (2 * e.okno * k) / 40;
        updateAll(t);
        S.jd = t;
        const s = geo(SUN),
          f = frame(s.u);
        trail.push(f(geo(idx.get(e.b)).u));
      }
      S.jd = now;
      updateAll(now);
      return;
    }
    if (e.typ !== 'slunce') return;
    if (e.nasa) {
      track = e.nasa.axis.filter(Boolean).map((a) => geoV(a[0], a[1]));
      return;
    }
    const now = S.jd,
      w = e.okno * 1.7;
    for (let k = 0; k <= 60; k++) {
      const t = e.jd - w + (2 * w * k) / 60;
      updateAll(t);
      basis(EARTH, t, m9);
      const sh = shadow();
      if (sh) track.push(sh.v);
    }
    updateAll(now);
  }
  // pohled z místa úkazu: úhlové poloměry Slunce a Měsíce a posun Měsíce vůči Slunci (východ, sever) v radiánech
  function sky(e) {
    const q = nasaAt(e, S.jd);
    if (q) {
      const SS = 0.004654; /* střední úhlový poloměr Slunce; okénko potřebuje jen poměry */
      return {
        ss: SS,
        sm: q.site[2] * SS,
        sep: Math.hypot(q.site[0], q.site[1]) * SS,
        x: q.site[0] * SS,
        y: q.site[1] * SS,
        alt: q.site[3],
      };
    }
    basis(EARTH, S.jd, m9);
    const up = toWorld(siteV(e.lat, e.lon)),
      o = [up[0] * RE, up[1] * RE, up[2] * RE],
      ec = pos(EARTH),
      s = sub(sub(pos(SUN), ec), o),
      m = sub(sub(pos(MOON), ec), o),
      sh = unit(s),
      mh = unit(m),
      pole = [m9[6], m9[7], m9[8]],
      east = unit(cross(pole, sh)),
      north = cross(sh, east),
      ss = Math.asin(RS / len(s)),
      sm = Math.asin(RM / len(m)),
      sep = Math.acos(Math.max(-1, Math.min(1, dot(sh, mh))));
    return { ss, sm, sep, x: dot(mh, east), y: dot(mh, north), alt: 90 - Math.acos(dot(sh, up)) / DEG };
  }
  function drawSky() {
    const c = card.querySelector('.uk-sky'),
      tx = card.querySelector('.uk-skytxt');
    if (!c || !cur) return;
    if (cur.typ !== 'slunce') {
      const x = c.getContext('2d'),
        W = c.width;
      x.clearRect(0, 0, W, W);
      x.save();
      x.beginPath();
      x.arc(W / 2, W / 2, W / 2 - 1, 0, 6.2832);
      x.fillStyle = '#060912';
      x.fill();
      x.clip();
      const html = atEvent(cur, () => INSET[cur.typ](cur, x, W));
      x.restore();
      x.strokeStyle = 'rgba(160,185,230,0.45)';
      x.lineWidth = 1;
      x.beginPath();
      x.arc(W / 2, W / 2, W / 2 - 1, 0, 6.2832);
      x.stroke();
      if (tx) tx.innerHTML = html + (back ? '' : '<br><small>náhled pro čas úkazu</small>');
      return;
    }
    let g;
    if (back) g = sky(cur);
    else {
      /* před ukázkou: náhled pro čas úkazu */
      const now = S.jd;
      updateAll(cur.jd);
      S.jd = cur.jd;
      g = sky(cur);
      S.jd = now;
      updateAll(now);
    }
    const x = c.getContext('2d'),
      W = c.width,
      r = W * 0.27,
      k = r / g.ss,
      cx = W / 2,
      cy = W / 2,
      tot = g.sep < g.sm - g.ss,
      mag = Math.max(0, Math.min(1, (g.ss + g.sm - g.sep) / (2 * g.ss)));
    x.clearRect(0, 0, W, W);
    x.fillStyle = tot
      ? '#05070d'
      : `rgb(${Math.round(18 + 60 * (1 - mag))},${Math.round(30 + 90 * (1 - mag))},${Math.round(58 + 130 * (1 - mag))})`;
    x.beginPath();
    x.arc(cx, cy, W / 2 - 1, 0, 6.2832);
    x.fill();
    x.save();
    x.clip();
    if (tot || mag > 0.97) {
      /* korona */
      const gr = x.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 2.3);
      gr.addColorStop(0, 'rgba(255,255,255,0.85)');
      gr.addColorStop(0.35, 'rgba(210,225,255,0.3)');
      gr.addColorStop(1, 'rgba(210,225,255,0)');
      x.fillStyle = gr;
      x.fillRect(0, 0, W, W);
    }
    x.fillStyle = '#ffd76a';
    x.beginPath();
    x.arc(cx, cy, r, 0, 6.2832);
    x.fill();
    /* Měsíc: východ je na obloze vlevo */
    x.fillStyle = '#0a0d15';
    x.beginPath();
    x.arc(cx - g.x * k, cy - g.y * k, g.sm * k, 0, 6.2832);
    x.fill();
    x.restore();
    x.strokeStyle = 'rgba(160,185,230,0.45)';
    x.lineWidth = 1;
    x.beginPath();
    x.arc(cx, cy, W / 2 - 1, 0, 6.2832);
    x.stroke();
    if (tx)
      tx.innerHTML =
        `<b>Pohled z místa</b><br>` +
        (g.alt < 0
          ? 'Slunce je pod obzorem'
          : tot
            ? '<span class="uk-tot">úplné zatmění</span>'
            : mag > 0.001
              ? `Měsíc zakrývá ${Math.round(mag * 100)} % průměru Slunce`
              : 'Měsíc je mimo Slunce') +
        `<br><small>Slunce ${Math.max(0, Math.round(g.alt))}° nad obzorem${back ? '' : ' · náhled pro čas úkazu'}</small>`;
  }
  const disc = (x, cx, cy, r, fill) => {
    x.fillStyle = fill;
    x.beginPath();
    x.arc(cx, cy, r, 0, 6.2832);
    x.fill();
  };
  const lab = (x, t, px, py, W, col = '#cfd9ee') => {
    x.font = `${Math.round(W * 0.085)}px system-ui, sans-serif`;
    x.textAlign = 'center';
    x.fillStyle = col;
    x.fillText(t, px, py);
  };
  const INSET = {
    /* zatmění Měsíce: stín a polostín Země ve vzdálenosti Měsíce, Měsíc ve skutečném poměru */
    mesic(e, x, W) {
      const ec = pos(EARTH),
        s = sub(pos(SUN), ec),
        m = sub(pos(MOON), ec),
        a = unit([-s[0], -s[1], -s[2]]),
        dm = dot(m, a),
        ds = len(s),
        ru = 1.02 * (RE - ((RS - RE) * dm) / ds),
        rp = 1.02 * (RE + ((RS + RE) * dm) / ds),
        f = frame(a),
        o = f(unit(m)),
        off = [o[0] * len(m), o[1] * len(m)],
        d = Math.hypot(off[0], off[1]),
        k = (W * 0.44) / (rp + RM * 0.6),
        cx = W / 2,
        cy = W / 2,
        mx = cx - off[0] * k,
        my = cy - off[1] * k,
        um = (ru + RM - d) / (2 * RM);
      disc(x, cx, cy, rp * k, 'rgba(120,140,190,0.16)');
      disc(x, cx, cy, ru * k, 'rgba(70,18,10,0.9)');
      x.save();
      x.beginPath();
      x.arc(mx, my, RM * k, 0, 6.2832);
      x.clip();
      disc(x, mx, my, RM * k, d < rp + RM ? '#b9b4a8' : '#e9e6dd');
      disc(x, cx, cy, ru * k, '#8a3a1c');
      x.restore();
      return (
        '<b>Stín Země na Měsíci</b><br>' +
        (um >= 1
          ? '<span class="uk-tot">úplné zatmění</span>'
          : um > 0
            ? `ve stínu je ${Math.round(um * 100)} % průměru Měsíce`
            : d < rp + RM
              ? 'Měsíc je v polostínu'
              : 'Měsíc je mimo stín') +
        '<br><small>tmavý kruh = plný stín, světlejší = polostín</small>'
      );
    },
    /* přechod: kotouč Slunce, planeta ve skutečném poměru a její dráha */
    prechod(e, x, W) {
      const s = geo(SUN),
        p = geo(idx.get(e.b)),
        f = frame(s.u),
        o = f(p.u),
        k = (W * 0.36) / s.s,
        cx = W / 2,
        cy = W / 2,
        sep = Math.acos(Math.max(-1, Math.min(1, dot(s.u, p.u))));
      const gr = x.createRadialGradient(cx, cy, 0, cx, cy, s.s * k);
      gr.addColorStop(0, '#ffe38a');
      gr.addColorStop(1, '#f5b53a');
      disc(x, cx, cy, s.s * k, gr);
      if (trail.length) {
        x.setLineDash([3, 4]);
        x.strokeStyle = 'rgba(0,0,0,0.45)';
        x.lineWidth = 1;
        x.beginPath();
        trail.forEach((t, j) => (j ? x.lineTo(cx - t[0] * k, cy - t[1] * k) : x.moveTo(cx - t[0] * k, cy - t[1] * k)));
        x.stroke();
        x.setLineDash([]);
      }
      const on = sep < s.s && p.r < s.r;
      disc(x, cx - o[0] * k, cy - o[1] * k, Math.max(1.6, p.s * k), on ? '#000' : '#9fb3d9');
      return (
        `<b>Pohled ze Země</b><br>${on ? `<span class="uk-tot">${B[idx.get(e.b)].cs} je před Sluncem</span>` : B[idx.get(e.b)].cs + ' je mimo sluneční kotouč'}` +
        `<br><small>od středu Slunce ${ang(sep)} · kotouček planety ${ang(2 * p.s)}, Slunce ${ang(2 * s.s)}</small>`
      );
    },
    /* konjunkce a zákryt: obě tělesa ve skutečném poměru (nejméně pár bodů, aby byla vidět) */
    dvojice(e, x, W) {
      const ia = idx.get(e.a),
        ib = idx.get(e.b),
        a = geo(ia),
        b = geo(ib),
        sep = Math.acos(Math.max(-1, Math.min(1, dot(a.u, b.u))));
      if (e._s0 === undefined) e._s0 = sep; /* první volání je náhled v čase úkazu */
      const mid = unit([a.u[0] + b.u[0], a.u[1] + b.u[1], a.u[2] + b.u[2]]),
        f = frame(mid),
        oa = f(a.u),
        ob = f(b.u),
        k = (W * 0.4) / Math.max(e._s0 * 1.3, (a.s + b.s) * 2.2),
        cx = W / 2,
        cy = W / 2;
      for (const [o, g, i] of [
        [oa, a, ia],
        [ob, b, ib],
      ].sort((p, q) => q[1].r - p[1].r)) {
        const px = cx - o[0] * k,
          py = cy - o[1] * k,
          r = Math.max(2.5, g.s * k);
        disc(x, px, py, r, rgb(i));
        lab(x, SYM[B[i].id] || B[i].cs[0], px, py + r + W * 0.1, W);
      }
      return (
        `<b>Pohled ze Země</b><br>${B[ia].cs} a ${B[ib].cs}: <span class="uk-tot">${ang(sep)}</span>` +
        `<br><small>${sep < a.s + b.s ? 'kotoučky se překrývají' : sep < (31 * DEG) / 60 ? 'vešly by se za kotouč Měsíce (31′)' : 'pro srovnání: Měsíc má 31′'}</small>`
      );
    },
    /* seskupení: všechna tělesa na jednom kousku oblohy */
    skupina(e, x, W) {
      const g = e.telesa.map((id) => [idx.get(id), geo(idx.get(id))]),
        c = unit(g.reduce((s, q) => [s[0] + q[1].u[0], s[1] + q[1].u[1], s[2] + q[1].u[2]], [0, 0, 0])),
        f = frame(c),
        o = g.map((q) => f(q[1].u));
      let spread = 0,
        ext = 0.01;
      for (let i = 0; i < g.length; i++) {
        ext = Math.max(ext, Math.hypot(o[i][0], o[i][1]));
        for (let j = 0; j < i; j++)
          spread = Math.max(spread, Math.acos(Math.max(-1, Math.min(1, dot(g[i][1].u, g[j][1].u)))));
      }
      if (e._x0 === undefined) e._x0 = ext;
      const k = (W * 0.36) / e._x0;
      g.forEach((q, j) => {
        const px = W / 2 - o[j][0] * k,
          py = W / 2 - o[j][1] * k,
          id = B[q[0]].id,
          r = id === 'sun' ? W * 0.05 : id === 'moon' ? W * 0.04 : W * 0.026;
        disc(x, px, py, r, id === 'sun' ? '#ffd76a' : rgb(q[0]));
        lab(x, SYM[id] || '', px, py - r - W * 0.025, W);
      });
      return `<b>Pohled ze Země</b><br>${g.length} těles ve výseči <span class="uk-tot">${ang(spread)}</span><br><small>${e.telesa.includes('sun') ? 'mezi nimi Slunce: úkaz se odehrál na denní obloze' : 'natažená paže s pěstí zakryje asi 10°'}</small>`;
    },
    /* kometa nebo planetka: jak daleko je od Země (logaritmicky) nebo od Slunce */
    blizko(e, x, W) {
      const ia = idx.get(e.a),
        ib = idx.get(e.b),
        v = sub(pos(ia), pos(ib)),
        d = len(v),
        an = Math.atan2(v[2], v[0]),
        cx = W / 2,
        cy = W / 2,
        dE = len(sub(pos(ia), pos(EARTH)));
      x.lineWidth = 1;
      x.strokeStyle = 'rgba(160,185,230,0.4)';
      let rr;
      if (ib === EARTH) {
        const l0 = Math.log10(RE),
          l1 = Math.log10(2.2e8);
        rr = (km) => W * 0.07 + ((Math.log10(Math.max(km, RE)) - l0) / (l1 - l0)) * W * 0.39;
        for (const [km, t] of [
          [42164, 'družice'],
          [384400, 'Měsíc'],
          [AU / 10, '0,1 AU'],
          [AU, '1 AU'],
        ]) {
          x.beginPath();
          x.arc(cx, cy, rr(km), 0, 6.2832);
          x.stroke();
          x.font = `${Math.round(W * 0.062)}px system-ui, sans-serif`;
          x.textAlign = 'center';
          x.fillStyle = 'rgba(190,205,235,0.75)';
          x.fillText(t, cx, cy - rr(km) - 2);
        }
        disc(x, cx, cy, W * 0.07, '#3f7fd6');
      } else {
        rr = (km) => (km / (1.25 * AU)) * W * 0.46;
        for (const au of [0.387, 0.723, 1]) {
          x.beginPath();
          x.arc(cx, cy, rr(au * AU), 0, 6.2832);
          x.stroke();
        }
        disc(x, cx, cy, W * 0.045, '#ffd76a');
        const ev = sub(pos(EARTH), pos(SUN)),
          ea = Math.atan2(ev[2], ev[0]);
        disc(x, cx + Math.cos(ea) * rr(len(ev)), cy + Math.sin(ea) * rr(len(ev)), W * 0.028, '#3f7fd6');
      }
      const r = Math.min(rr(d), W * 0.47);
      disc(x, cx + Math.cos(an) * r, cy + Math.sin(an) * r, W * 0.03, '#ffb347');
      const km = (q) =>
        q < 3e6
          ? num(Math.round(q / 100) * 100) + ' km'
          : q < 0.3 * AU
            ? num(q / 1e6, 1) + ' mil. km'
            : num(q / AU, 2) + ' AU';
      return (
        `<b>${ib === EARTH ? 'Vzdálenost od Země' : 'Pohled shora na dráhy'}</b><br><span class="uk-tot">${km(d)}</span>${ib === EARTH ? '' : ' od Slunce'}` +
        `<br><small>${ib === EARTH ? (d < 384400 ? `${num(d / 384400, 2)} vzdálenosti Měsíce` : d < 0.3 * AU ? `${num(d / 384400, 0)}× dál než Měsíc` : 'kruhy: družice, Měsíc, 0,1 AU, 1 AU') : `od Země ${km(dE)} · kruhy: Merkur, Venuše, Země`}</small>`
      );
    },
    /* supernova: jak jasná právě je */
    hvezda(e, x, W) {
      const m = magAt(e, S.jd),
        cx = W / 2,
        cy = W / 2;
      for (let j = 0; j < 14; j++)
        disc(x, (((j * 73) % 97) / 97) * W, (((j * 41) % 89) / 89) * W, W * 0.008, 'rgba(255,255,255,0.5)');
      if (m !== null) {
        const r = Math.min(W * 0.42, W * (0.03 + 0.03 * (6 - m))),
          gr = x.createRadialGradient(cx, cy, 0, cx, cy, r);
        gr.addColorStop(0, '#fff');
        gr.addColorStop(0.18, 'rgba(255,244,214,0.95)');
        gr.addColorStop(1, 'rgba(255,220,160,0)');
        disc(x, cx, cy, r, gr);
        x.strokeStyle = 'rgba(255,240,210,0.7)';
        x.lineWidth = 1;
        x.beginPath();
        x.moveTo(cx - r * 1.25, cy);
        x.lineTo(cx + r * 1.25, cy);
        x.moveTo(cx, cy - r * 1.25);
        x.lineTo(cx, cy + r * 1.25);
        x.stroke();
      }
      return (
        `<b>Souhvězdí ${e.souhvezdi}</b><br>` +
        (m === null
          ? S.jd < e.t0
            ? 'hvězda ještě nevzplanula'
            : 'pouhým okem už není vidět'
          : `jasnost <span class="uk-tot">${num(m, 1).replace('-', '−')} mag</span>`) +
        `<br><small>${m === null ? 'největší jasnost ' + num(e.mag, 1).replace('-', '−') + ' mag' : m < -4.4 ? 'jasnější než Venuše, vidět i ve dne' : m < -3.8 ? 'jasná jako Venuše' : m < -1.5 ? 'jasnější než Sirius' : m < 2 ? 'jako nejjasnější hvězdy' : 'ještě vidět pouhým okem'}</small>`
      );
    },
  };
  /* čáry v prostoru při pohledu shora: dvojice [odkud, kam] indexů těles */
  function linesOf(e) {
    if (e.typ === 'prechod') return [[EARTH, SUN]];
    if (e.typ === 'dvojice') {
      const a = idx.get(e.a),
        b = idx.get(e.b);
      return [[EARTH, geo(a).r > geo(b).r ? a : b]];
    }
    if (e.typ === 'skupina') return e.telesa.filter((id) => id !== 'moon').map((id) => [EARTH, idx.get(id)]);
    if (e.typ === 'blizko') return [[idx.get(e.b), idx.get(e.a)]];
    return [];
  }
  const span = (e) =>
    e.typ === 'hvezda' ? [e.t0 - e.rise - 6, e.t1 - e.t0 + e.rise + 20] : [e.jd - e.okno, e.okno * 2];
  function show(e, from) {
    if (!back)
      back = {
        jd: S.jd,
        paused: S.paused,
        focus: S.focus,
        yaw: S.cam.yaw,
        pitch: S.cam.pitch,
        alt: S.cam.altT,
        gamma: S.gamma,
        orb: S.orbMode,
      };
    for (const q of U) if (q.el) setEl(idx.get(q.a), null);
    if (e.el) setEl(idx.get(e.a), e.el); /* dráha komety pro tento návrat */
    /* přisvětlení by stín přesvítilo: po dobu ukázky zatmění je vypnuté, při návratu se vrátí */
    if (SHADOW(e) && S.gamma > 0.01) {
      S.setGamma(0);
      ui.toast('Přisvětlení jsem na dobu ukázky vypnula, jinak by stín nebyl vidět. Po návratu ho zase zapnu.', 5200);
    }
    S.paused = true;
    setTime(e.jd);
    buildTrack(e);
    const small = cls('mob') ? 1.5 : 1;
    if (e.typ === 'slunce') {
      if (from != null) setTime(from);
      S.jump(idx.get(e.telo));
      S.cam.alt = S.cam.altT = altOf(e);
      aim(e);
    } else if (e.typ === 'mesic') {
      /* pohled od Země na Měsíc */
      S.jump(MOON);
      S.cam.alt = S.cam.altT = e.vyska * small;
      const d = unit(sub(pos(MOON), pos(EARTH)));
      S.lookSky({ x: d[0], y: d[1], z: d[2] });
    } else if (TOP(e)) {
      /* pohled shora na rovinu drah: je vidět, že tělesa leží v jedné přímce se Zemí */
      const c = idx.get(e.telo);
      let far = 0;
      for (const [a, b] of linesOf(e)) far = Math.max(far, len(sub(pos(a), pos(c))), len(sub(pos(b), pos(c))));
      S.jump(c);
      S.cam.alt = S.cam.altT = Math.max(far * (e.typ === 'blizko' && c === EARTH ? 3 : 4.4) * small, B[c].R * 5);
      S.lookSky({ x: 0.1, y: -0.99, z: 0.06 });
      if (e.typ !== 'blizko') S.orbMode = 1;
    } else if (e.typ === 'hvezda') {
      /* Země zůstává v obraze, hvězda vyjde kousek vedle ní */
      S.jump(EARTH);
      S.cam.alt = S.cam.altT = 70000 * small;
      const d = e.dir,
        q = unit(cross(d, [0, 1, 0])),
        c = unit([d[0] + q[0] * 0.33, d[1] + q[1] * 0.33 - 0.12, d[2] + q[2] * 0.33]);
      S.lookSky({ x: c[0], y: c[1], z: c[2] });
    }
    if (from != null) setTime(from);
    if (!seen.includes(e.id)) {
      seen.push(e.id);
      try {
        localStorage.setItem('s200uk', JSON.stringify(seen));
      } catch (er) {
        /* nic */
      }
      const n = seen.length,
        t = { 5: 'Lovec úkazů', 15: 'Kronikář nebes', [U.length]: 'Mistr efemerid' }[n];
      if (t) ui.toast(`🔭 ${n} úkazů z ${U.length} – titul „${t}“.`, 5200);
      fill();
    }
    ui.refresh();
    draw();
  }
  function restore() {
    if (!back) return;
    play = 0;
    setTime(back.jd);
    S.jump(back.focus);
    S.cam.yaw = back.yaw;
    S.cam.pitch = back.pitch;
    S.cam.alt = S.cam.altT = back.alt;
    S.paused = back.paused;
    S.setGamma(back.gamma);
    S.orbMode = back.orb;
    for (const q of U) if (q.el) setEl(idx.get(q.a), null);
    updateAll(S.jd);
    back = null;
    warned = false;
    track = [];
    trail = [];
    ui.refresh();
    S.wake();
    draw();
  }
  function go(d) {
    if (!cur) return;
    const L = vis(),
      k = (Math.max(0, L.indexOf(cur)) + d + L.length) % L.length;
    cur = L[k];
    for (const q of U) q._s0 = q._x0 = undefined;
    play = 0;
    A.play('a_tick');
    if (back) show(cur);
    else draw();
  }
  function open(id, andShow) {
    if (!S.F.on('ukazy')) return;
    cur = U.find((e) => e.id === id) || null;
    draw();
    if (cur && andShow) show(cur);
  }
  const GRP = [
      ['', 'Vše'],
      ['slunce', '🌑 Slunce'],
      ['mesic', '🌕 Měsíc'],
      ['prechod', '☀️ Přechody'],
      ['planety', '✨ Planety'],
      ['blizko', '☄️ Komety'],
      ['hvezda', '💥 Supernovy'],
    ],
    inGrp = (e, g) => !g || e.typ === g || (g === 'planety' && (e.typ === 'dvojice' || e.typ === 'skupina')),
    vis = () => U.filter((e) => inGrp(e, filt));
  function draw() {
    const e = cur;
    if (e && !mini) ukTouch = performance.now();
    card.classList.toggle('on', !!e);
    card.classList.toggle('min', !!e && mini);
    document.body.classList.toggle('ukon', !!e && !mini);
    if (!e) return;
    try {
      localStorage.setItem('s200ukl', e.id);
    } catch (er) {
      /* nic */
    }
    if (mini) {
      card.innerHTML = `<button data-u="max" title="Rozbalit kartu úkazu">${e.ikona} ${e.nazev} ▸</button><button class="x" data-u="close" title="Zavřít kartu" aria-label="Zavřít kartu">×</button>`;
      return;
    }
    const L = vis(),
      k = Math.max(0, L.indexOf(e)),
      body = kid() ? `<p>${e.deti}</p>` : `<p>${e.text}</p><p class="uk-per">💡 ${e.perlicka}</p>`,
      src = kid()
        ? ''
        : `<details><summary>Model × prameny</summary><p>${e.shoda}</p><p><small>${e.pramen}</small></p></details>`,
      small = cls('mob'),
      px = small ? 84 : 120,
      d = Math.min(window.devicePixelRatio || 1, 2),
      leg =
        e.typ === 'slunce'
          ? `<i class="l1"></i> stín Měsíce <i class="l2"></i> jeho dráha <i class="l3"></i> polostín (částečné zatmění)`
          : TOP(e)
            ? `<i class="l2"></i> ${e.typ === 'blizko' ? 'spojnice těles' : 'přímka od Země: tělesa na ní leží za sebou'}`
            : e.typ === 'hvezda'
              ? 'Hvězda svítí na obloze vedle Země; ▶ Přehrát ukáže, jak vzplála a pohasla.'
              : 'Pohled od Země: na Měsíc padá stín Země.';
    card.innerHTML =
      `<button class="x" data-u="close" title="Zavřít kartu" aria-label="Zavřít kartu">×</button><button class="x mn" data-u="min" title="Sbalit kartu (úkaz zůstane otevřený)" aria-label="Sbalit kartu">–</button>` +
      `<div class="uk-nav"><button data-u="prev" aria-label="Předchozí úkaz">‹</button><span>${k + 1} / ${L.length}${seen.includes(e.id) ? ' · ✓ viděno' : ''}</span><button data-u="next" aria-label="Další úkaz">›</button></div>` +
      `<h3>${e.ikona} ${e.nazev}</h3><p class="uk-sub">${e.podtitul}</p>` +
      `<p class="uk-when"><b>${e.datum}</b> · ${e.misto}<br><small>${e.cas}${e.datumJul ? `<br>podle juliánského kalendáře ${e.datumJul}` : ''}</small></p>` +
      `<div class="uk-skyrow"><canvas class="uk-sky" width="${px * d}" height="${px * d}" style="width:${px}px;height:${px}px"></canvas><div class="uk-skytxt"></div></div>` +
      `<div class="uk-btn"><button class="pri" data-u="show">🎬 Ukázat</button><button data-u="play">▶ Přehrát</button>` +
      `<button data-u="back"${back ? '' : ' disabled'}>⟲ Zpět</button></div>` +
      (back ? `<p class="uk-leg">${leg}</p>` : '') +
      (small ? `<details class="uk-more"><summary>Příběh</summary>${body}${src}</details>` : body + src);
    drawSky();
  }
  function fill() {
    const last = (() => {
      try {
        return U.find((e) => e.id === localStorage.getItem('s200ukl'));
      } catch (er) {
        return null;
      }
    })();
    list.innerHTML =
      `<p class="uk-prog"><b>Viděno ${seen.length} z ${U.length}</b><i><u style="width:${(100 * seen.length) / U.length}%"></u></i></p>` +
      `<div class="uk-chips">${GRP.map(([g, t]) => `<button data-g="${g}" class="${g === filt ? 'sel' : ''}">${t}</button>`).join('')}</div>` +
      (last && !cur
        ? `<button class="uk-last" data-id="${last.id}">↩ Naposledy otevřeno: ${last.nazev}</button>`
        : '') +
      vis()
        .map(
          (e) =>
            `<button data-id="${e.id}">${e.ikona} <b>${e.datum}</b>${seen.includes(e.id) ? ' <span class="ok">✓</span>' : ''}<br>${e.nazev}<br><small>${e.podtitul}</small></button>`
        )
        .join('') +
      `<p class="uk-note">Každý úkaz je spočítaný modelem aplikace a porovnaný s pramenem (karta → Model × prameny). Data před rokem 1582 ukazuje aplikace v dnešním kalendáři; tehdejší juliánské datum je na kartě.</p>`;
  }
  fill();
  list.addEventListener('click', (ev) => {
    const g = ev.target.closest('button[data-g]'),
      b = ev.target.closest('button[data-id]');
    if (g) {
      filt = g.dataset.g;
      A.play('a_tick');
      fill();
      return;
    }
    if (!b) return;
    cur = U.find((e) => e.id === b.dataset.id);
    mini = false;
    ui.toggle('#uk', false);
    A.play('panel_open');
    draw();
  });
  card.addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-u]');
    if (!b || !cur) return;
    const a = b.dataset.u;
    if (a === 'close') {
      restore();
      cur = null;
      mini = false;
      play = 0;
      draw();
      fill();
    } else if (a === 'show') {
      play = 0;
      show(cur);
    } else if (a === 'play') {
      const sp = span(cur);
      show(cur, sp[0]);
      play = sp[1];
      playK = sp[1] / 14;
    } else if (a === 'min' || a === 'max') {
      mini = a === 'min';
      draw();
    } else if (a === 'back') restore();
    else if (a === 'prev') go(-1);
    else if (a === 'next') go(1);
    S.wake();
  });
  // Stroj času: zatmění, která mají kartu, otevřou rovnou ukázku úkazu (kamera nad místo, stín, pohled z místa)
  const TM = { '12. 8. 2026': 's2026', '2. 8. 2027': 's2027' };
  $('#tm-list').addEventListener(
    'click',
    (ev) => {
      const b = ev.target.closest('button[data-e]'),
        key = b && Object.keys(TM).find((k) => b.textContent.includes(k));
      if (!key || !S.F.on('ukazy')) return; /* v dětském rozhraní zůstane obyčejný skok v čase */
      ev.stopPropagation();
      ui.toggle('#tm', false);
      open(TM[key], true);
    },
    true
  );
  // listování tahem do stran (telefon, tablet)
  let tx = 0,
    ty = 0;
  card.addEventListener('touchstart', (ev) => ((tx = ev.touches[0].clientX), (ty = ev.touches[0].clientY)), {
    passive: true,
  });
  card.addEventListener(
    'touchend',
    (ev) => {
      const dx = ev.changedTouches[0].clientX - tx,
        dy = ev.changedTouches[0].clientY - ty;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
    },
    { passive: true }
  );
  // hlídání přisvětlení během ukázky + okénko s pohledem z místa
  S.ticks.push(() => {
    if (!back || !cur) return;
    if (SHADOW(cur) && S.gamma > 0.01) {
      S.setGamma(0);
      ui.refresh();
      if (!warned)
        ui.toast(
          'Při ukázce úkazu nechávám přisvětlení vypnuté, stín by v něm zmizel. Vrátí se tlačítkem ⟲ Zpět.',
          5200
        );
      warned = true;
    }
    const now = performance.now();
    if (now - skyT > 120) {
      skyT = now;
      drawSky();
    }
  });
  // přehrávání: 14 sekund na celý průchod, kamera drží místo úkazu pod sebou
  S.ticks.push((dt) => {
    if (!cur || play <= 0) return;
    const d = Math.min(play, playK * dt);
    play -= d;
    setTime(S.jd + d);
    if (cur.typ === 'slunce') aim(cur);
  });
  // 2D vrstva: dráha stínu, polostín, stín a místo úkazu
  S.overlays.push((ctx, e) => {
    if (!cur || !back || cur.typ !== 'slunce' || S.focus !== EARTH) return;
    const { W, H, F, fwd, right, up } = e,
      C = S.camPos,
      ec = pos(EARTH),
      v = sub(C, ec),
      vl = len(v),
      lim = RE / vl + 0.015;
    basis(EARTH, S.jd, m9);
    const proj = (w) => {
      /* w = jednotkový vektor od středu Země (scéna); null = za obzorem nebo mimo obraz */
      if (dot(w, v) / vl < lim) return null;
      const d = [ec[0] + w[0] * RE - C[0], ec[1] + w[1] * RE - C[1], ec[2] + w[2] * RE - C[2]],
        zz = d[0] * fwd.x + d[1] * fwd.y + d[2] * fwd.z;
      if (zz <= 0) return null;
      return [
        W / 2 + ((d[0] * right.x + d[1] * right.y + d[2] * right.z) / zz) * F,
        H / 2 - ((d[0] * up.x + d[1] * up.y + d[2] * up.z) / zz) * F,
        zz,
      ];
    };
    const line = (pts, close) => {
      let on = false;
      ctx.beginPath();
      for (const w of pts) {
        const p = proj(w);
        if (!p) {
          on = false;
          continue;
        }
        on ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
        on = true;
      }
      if (close && on) ctx.closePath();
      ctx.stroke();
    };
    ctx.save();
    ctx.lineJoin = 'round';
    // dráha osy stínu
    ctx.setLineDash([7, 6]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,214,102,0.9)';
    line(track.map(toWorld));
    ctx.setLineDash([]);
    const sh = shadow(cur);
    if (sh) {
      const c = toWorld(sh.v),
        a = unit(cross(c, Math.abs(c[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])),
        b = cross(c, a),
        ring = (rkm) => {
          const t = rkm / RE,
            ct = Math.cos(t),
            st = Math.sin(t),
            o = [];
          for (let k = 0; k <= 72; k++) {
            const q = (k / 72) * 6.2832,
              cq = Math.cos(q) * st,
              sq = Math.sin(q) * st;
            o.push([
              c[0] * ct + a[0] * cq + b[0] * sq,
              c[1] * ct + a[1] * cq + b[1] * sq,
              c[2] * ct + a[2] * cq + b[2] * sq,
            ]);
          }
          return o;
        };
      // polostín: hranice částečného zatmění
      if (sh.pen < RE * 1.4) {
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = 'rgba(190,210,255,0.55)';
        line(ring(sh.pen));
      }
      // stín: střed je vidět i tam, kde je skutečný stín menší než pár bodů obrazu
      const p = proj(c);
      if (p) {
        const r = Math.max(7, (sh.um / p[2]) * F);
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.beginPath();
        ctx.arc(p[0], p[1], r, 0, 6.2832);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffd666';
        ctx.stroke();
      }
    }
    // místo úkazu
    const pl = proj(toWorld(siteV(cur.lat, cur.lon)));
    if (pl) {
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(pl[0] - 9, pl[1]);
      ctx.lineTo(pl[0] - 3, pl[1]);
      ctx.moveTo(pl[0] + 3, pl[1]);
      ctx.lineTo(pl[0] + 9, pl[1]);
      ctx.moveTo(pl[0], pl[1] - 9);
      ctx.lineTo(pl[0], pl[1] - 3);
      ctx.moveTo(pl[0], pl[1] + 3);
      ctx.lineTo(pl[0], pl[1] + 9);
      ctx.stroke();
      if (cur.misto !== 'Praha' || S.labMode === 0) {
        ctx.font = '600 12px system-ui, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillText(cur.misto.split(',')[0], pl[0] + 12, pl[1] + 16);
      }
    }
    ctx.restore();
  });
  // 2D vrstva: přímky při pohledu shora (Země – tělesa) a supernovy na obloze
  S.overlays.push((ctx, e) => {
    const { W, H, F, fwd, right, up } = e,
      C = S.camPos,
      scr = (d) => {
        const zz = d[0] * fwd.x + d[1] * fwd.y + d[2] * fwd.z;
        return zz <= 1e-9
          ? null
          : [
              W / 2 + ((d[0] * right.x + d[1] * right.y + d[2] * right.z) / zz) * F,
              H / 2 - ((d[0] * up.x + d[1] * up.y + d[2] * up.z) / zz) * F,
            ];
      };
    if (cur && back && TOP(cur)) {
      ctx.save();
      ctx.setLineDash([8, 7]);
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = 'rgba(255,214,102,0.85)';
      for (const [a, b] of linesOf(cur)) {
        const pa = pos(a),
          pb = pos(b),
          k = cur.typ === 'blizko' ? 1 : 1.12 /* přímku kousek přetáhnout za vzdálenější těleso */,
          qa = scr(sub(pa, C)),
          qb = scr(sub([pa[0] + (pb[0] - pa[0]) * k, pa[1] + (pb[1] - pa[1]) * k, pa[2] + (pb[2] - pa[2]) * k], C));
        if (!qa || !qb) continue;
        ctx.beginPath();
        ctx.moveTo(qa[0], qa[1]);
        ctx.lineTo(qb[0], qb[1]);
        ctx.stroke();
      }
      ctx.restore();
    }
    const cine = document.body.classList.contains('cine'),
      fr = S.R && S.R[S.focus];
    for (const st of S.F.on('ukazy') ? STARS : []) {
      const m = magAt(st, S.jd);
      if (m === null) continue;
      const q = scr(st.dir);
      if (!q || q[0] < -40 || q[0] > W + 40 || q[1] < -40 || q[1] > H + 40) continue;
      if (fr && fr.pr && Math.hypot(q[0] - fr.sx, q[1] - fr.sy) < fr.pr) continue; /* za kotoučem tělesa */
      const r = 3 + 2.1 * (6 - m),
        g = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], r);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.2, 'rgba(255,244,214,0.9)');
      g.addColorStop(1, 'rgba(255,220,160,0)');
      ctx.save();
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(q[0], q[1], r, 0, 6.2832);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,240,210,0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(q[0] - r * 1.5, q[1]);
      ctx.lineTo(q[0] + r * 1.5, q[1]);
      ctx.moveTo(q[0], q[1] - r * 1.5);
      ctx.lineTo(q[0], q[1] + r * 1.5);
      ctx.stroke();
      if (!cine) {
        ctx.font = '600 12px system-ui, sans-serif';
        ctx.fillStyle = '#ffe7ad';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillText(
          `💥 ${st.nazev.replace(/ roku.*/, '')} · ${m.toFixed(1).replace('.', ',').replace('-', '−')} mag`,
          q[0] + r + 6,
          q[1] + 4
        );
      }
      ctx.restore();
    }
  });
  S.bus.on('mode', () => draw());
  /* úkazy jsou jen v dospělém rozhraní (registr funkcí): při přepnutí do dětského se ukázka vrátí a karta zavře */
  S.F.onChange(() => {
    if (S.F.on('ukazy') || (!cur && !back)) return;
    if (back) restore();
    cur = null;
    draw();
    ui.toggle('#uk', false);
  });
  /* 1.6: karta úkazu uvolní zorné pole sama – sbalí se do proužku po 2 minutách bez dotyku a hned při kliknutí na jiné těleso */
  let ukTouch = performance.now();
  for (const ev of ['pointerdown', 'wheel', 'pointermove'])
    card.addEventListener(ev, () => (ukTouch = performance.now()), { passive: true });
  const ukMin = () => {
    if (cur && !mini) {
      mini = true;
      draw();
    }
  };
  S.bus.on('tap', ukMin);
  setInterval(() => {
    if (!cur || mini) ukTouch = performance.now();
    else if (performance.now() - ukTouch > 120000) ukMin();
  }, 5000);
  return {
    open: () => {
      /* seznam a karta se nepřekrývají: otevřená karta se při otevření seznamu sbalí do proužku */
      if (cur && !mini) {
        mini = true;
        draw();
      }
      fill();
      ui.toggle('#uk');
    },
    card: (id) => open(id, false),
    show: () => cur && show(cur),
    back: restore,
    go,
    state: () => ({
      cur: cur && cur.id,
      back: !!back,
      play,
      track: track.length,
      trail: trail.length,
      seen: seen.length,
      n: U.length,
    }),
    ids: () => U.map((e) => e.id),
  };
}
