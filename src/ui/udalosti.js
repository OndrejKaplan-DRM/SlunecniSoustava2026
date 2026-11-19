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
    view =
      'a' /* 1.9 pohled na zatmění: a = výchozí (nad místem / od Země), m = zpoza Měsíce, t = Země a Měsíc shora */,
    drag = false /* uživatel drží táhlo časové osy */,
    trackUm = 0 /* střední poloměr stínu podél dráhy (km) – šířka pásu úplného zatmění */,
    calKm = 0 /* 1.10: o kolik km stojí pozorovatel v modelu vedle místa úkazu (srovnání s katalogem NASA) */,
    switching = false /* kamera se právě přestavuje (vzlet z povrchu při tom neznamená, že ho chtěl uživatel) */,
    lastF = 0 /* ohnisková délka kamery v bodech z posledního snímku */,
    wasPlay = false,
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
  /* 1.9: datum a čas pro časovou osu úkazu – světový čas (UT), dnešní kalendář i před rokem 1582 (jako v aplikaci) */
  const MES = 'ledna února března dubna května června července srpna září října listopadu prosince'.split(' ');
  function cal(jd) {
    const Z = Math.floor(jd + 0.5),
      fr = jd + 0.5 - Z,
      al = Math.floor((Z - 1867216.25) / 36524.25),
      A1 = Z + 1 + al - Math.floor(al / 4),
      B1 = A1 + 1524,
      C1 = Math.floor((B1 - 122.1) / 365.25),
      D1 = Math.floor(365.25 * C1),
      E1 = Math.floor((B1 - D1) / 30.6001),
      mo = E1 < 14 ? E1 - 1 : E1 - 13,
      mins = Math.min(1439, Math.round(fr * 1440));
    return {
      d: B1 - D1 - Math.floor(30.6001 * E1),
      mo,
      y: mo > 2 ? C1 - 4716 : C1 - 4715,
      h: Math.floor(mins / 60),
      mi: mins % 60,
    };
  }
  const calTxt = (jd, clock) => {
    const c = cal(jd),
      day = `${c.d}. ${MES[c.mo - 1]} ${c.y <= 0 ? 1 - c.y + ' př. n. l.' : c.y}`;
    return clock ? `${String(c.h).padStart(2, '0')}:${String(c.mi).padStart(2, '0')} UT · ${day}` : day;
  };
  /* pohledy na zatmění (vzor: „Select your view“ v NASA Eyes) */
  const VIEWS = (e) =>
    e.typ === 'slunce'
      ? [
          ['a', '📍 Nad místem'],
          ['z', '🔭 Z místa'],
          ['m', '🌘 Zpoza Měsíce'],
          ['t', '🛰 Země a Měsíc'],
        ]
      : e.typ === 'mesic'
        ? [
            ['a', '🌕 Od Země'],
            ['z', '🔭 Z místa'],
            ['t', '🛰 Země a Měsíc'],
          ]
        : [];
  /* volná plocha obrazu vedle karty úkazu (na telefonu nad ní): tam má scéna úkazu ležet */
  function area() {
    const W = window.innerWidth,
      H = window.innerHeight,
      F = lastF || H / 2 / Math.tan((22.5 * Math.PI) / 180),
      on = card.classList.contains('on') && !mini,
      r = card.getBoundingClientRect();
    if (!on) return { W, H, F, cx: W / 2, cy: H / 2, w: W * 0.8, h: H * 0.6, vert: H > W * 1.1 };
    if (cls('mob') && !cls('land')) {
      const top = 64,
        bot = Math.max(top + 140, Math.min(r.top, H));
      return { W, H, F, cx: W / 2, cy: (top + bot) / 2, w: W * 0.9, h: bot - top, vert: true };
    }
    const l = Math.min(Math.max(r.right, 0), W * 0.6),
      top = 70,
      bot = H - Math.min(170, H * 0.24);
    /* úzký vysoký pruh vedle karty (tablet na výšku): scéna se skládá odshora dolů jako na telefonu */
    return { W, H, F, cx: (l + W) / 2, cy: (top + bot) / 2, w: W - l, h: bot - top, vert: bot - top > (W - l) * 1.25 };
  }
  /* Kamera pro scénu úkazu: dívá se směrem f (jednotkový vektor scény), střed tělesa „focus“ leží ve vzdálenosti dist
     a na obraze vychází (fx, fy). Kamera aplikace nezná náklon kolem osy pohledu („vpravo“ je vždy vodorovně), proto se
     poloha kamery (yaw, pitch) a pootočení pohledu (ly, lp) dopočítají tak, aby výsledný směr pohledu byl přesně f. */
  const clamp1 = (v) => Math.max(-1, Math.min(1, v)),
    rightOf = (f) => {
      const r = cross(f, [0, 1, 0]);
      return len(r) < 1e-6 ? [1, 0, 0] : unit(r);
    };
  /* d = směr od kamery ke středu tělesa, f = směr pohledu */
  function camApply(focus, d, f, dist) {
    S.jump(focus);
    S.cam.alt = S.cam.altT = Math.max(dist - B[focus].R, B[focus].R * 0.02);
    S.cam.pitch = Math.asin(clamp1(-d[1]));
    S.cam.yaw = Math.atan2(-d[2], -d[0]);
    const y = S.cam.yaw,
      r0 = [Math.sin(y), 0, -Math.cos(y)],
      u0 = cross(r0, d);
    S.cam.lp = Math.asin(clamp1(dot(f, u0)));
    S.cam.ly = Math.atan2(dot(f, r0), dot(f, d));
    S.wake();
  }
  function setCam(focus, f, dist, fx, fy) {
    const q = area(),
      ox = (fx - q.W / 2) / q.F,
      oy = (q.H / 2 - fy) / q.F,
      r = rightOf(f),
      up = cross(r, f);
    camApply(focus, unit([0, 1, 2].map((k) => f[k] + ox * r[k] + oy * up[k])), f, dist);
  }
  /* totéž, ale zadaná je poloha kamery (p = směr od středu tělesa ke kameře): kamera zůstane přesně nad daným místem
     a pootočí se jen pohled, aby místo vyšlo na (fx, fy) */
  function setCamOver(focus, p, dist, fx, fy) {
    const d = [-p[0], -p[1], -p[2]];
    camApply(focus, d, aimDir(d, fx, fy), dist);
  }
  /* směr pohledu, při kterém směr d (jednotkový vektor scény) vyjde na obraze na (fx, fy) */
  function aimDir(d, fx, fy) {
    const q = area(),
      ox = (fx - q.W / 2) / q.F,
      oy = (q.H / 2 - fy) / q.F;
    let f = d;
    for (let it = 0; it < 8; it++) {
      const r = rightOf(f),
        up = cross(r, f);
      f = unit([0, 1, 2].map((k) => d[k] - ox * r[k] - oy * up[k]));
    }
    return f;
  }
  /* pohled shora na rovinu drah: všechna zadaná místa (souřadnice scény) se vejdou do volné plochy,
     směr k nejvzdálenějšímu míří doprava (na telefonu nahoru) */
  function topDown(focus, pts, minD = 0) {
    const f = area(),
      c = pos(focus),
      rel = pts.map((q) => sub(q, c));
    let far = rel[0];
    for (const r of rel) if (Math.hypot(r[0], r[2]) > Math.hypot(far[0], far[2])) far = r;
    const mh = unit([far[0], 0, far[2]]),
      ph = [-mh[2], 0, mh[0]];
    let lo = 0,
      hi = 0,
      pe = 0;
    for (const r of rel) {
      const a = r[0] * mh[0] + r[2] * mh[2];
      lo = Math.min(lo, a);
      hi = Math.max(hi, a);
      pe = Math.max(pe, Math.abs(r[0] * ph[0] + r[2] * ph[2]) + Math.abs(r[1]) * 0.15);
    }
    const lng = f.vert ? f.h : f.w,
      sht = f.vert ? f.w : f.h,
      k = Math.min((lng * 0.6) / Math.max(hi - lo, 1), (sht * 0.4) / Math.max(pe, 1e-9)) /* bodů na km */,
      D = Math.max(f.F / k, minD, B[focus].R * 3),
      mid = (((lo + hi) / 2) * f.F) / D,
      /* „vpravo“ na obraze: na šířku směr k nejvzdálenějšímu místu, na výšku o čtvrt otáčky jinak (místo je pak nahoře) */
      rr = f.vert ? [-mh[2], 0, mh[0]] : mh,
      g = [rr[2], 0, -rr[0]] /* vodorovný směr, kam na obraze míří „nahoru“ */,
      tau = 0.12 /* malý náklon od svislice: dráhy nejsou úplně naplocho */,
      dir = unit([g[0] * Math.sin(tau), -Math.cos(tau), g[2] * Math.sin(tau)]);
    setCam(focus, dir, D, f.vert ? f.cx : f.cx - mid, f.vert ? f.cy + mid : f.cy);
  }
  /* zatmění Slunce zpoza Měsíce: Měsíc v popředí, za ním malá Země se stínem (ve skutečném poměru) */
  function behindMoon() {
    const f = area(),
      eh = unit(sub(pos(EARTH), pos(MOON))),
      y0 = Math.atan2(-eh[2], -eh[0]),
      r0 = [Math.sin(y0), 0, -Math.cos(y0)],
      u0 = cross(r0, eh),
      alt = f.vert ? 36000 : 15000 /* na výšku je volná plocha malá: Měsíc menší */,
      th =
        Math.asin(RM / (RM + alt)) +
        (f.vert ? 0.11 : 0.19) /* úhel mezi středem Měsíce a Zemí: Země vychází kus vedle kotouče */,
      a = f.vert ? 0.26 : 0.8,
      b = f.vert ? 0.966 : 0.6,
      t = Math.tan(th),
      c = unit([0, 1, 2].map((k) => eh[k] - t * (r0[k] * a + u0[k] * b))),
      px = t * f.F;
    /* c je směr od kamery ke středu Měsíce: Země pak na obraze vychází o úhel th vedle něj (vpravo nahoře) */
    setCamOver(MOON, [-c[0], -c[1], -c[2]], RM + alt, f.cx - (a * px) / 2, f.cy + (b * px) / 2);
  }
  /* která tělesa k úkazu patří: jen ta mají při ukázce značku a jméno */
  function evOf(e) {
    const s = new Set([EARTH]),
      add = (id) => idx.has(id) && s.add(idx.get(id));
    if (SHADOW(e)) s.add(MOON);
    if (e.typ === 'slunce') s.add(SUN);
    if (TOP(e) && (e.typ !== 'blizko' || e.telo === 'sun')) s.add(SUN);
    for (const id of [e.a, e.b, e.telo].concat(e.telesa || [])) if (id) add(id);
    return s;
  }
  // směr od středu Země k místu úkazu (scéna)
  function dirOf(e, dLat = 0) {
    basis(idx.get(e.telo), S.jd, m9);
    return toWorld(siteV(e.lat + dLat, e.lon));
  }
  function aim(e) {
    /* na telefonu leží karta přes spodní polovinu obrazu: mířím o kus jižněji, aby místo úkazu vyšlo nad kartu */
    const p = dirOf(e, cls('mob') ? -24 : 0);
    S.lookSky({ x: -p[0], y: -p[1], z: -p[2] });
    /* 1.9: na počítači a tabletu posadit místo úkazu do volné plochy vedle karty, ne pod ni */
    if (!cls('mob')) {
      const f = area(),
        alt = S.cam.altT;
      setCamOver(idx.get(e.telo), p, B[idx.get(e.telo)].R + alt, f.cx, f.H / 2);
    }
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
    trackUm = 0;
    if (e.nasa) {
      const ax = e.nasa.axis.filter(Boolean);
      track = ax.map((a) => geoV(a[0], a[1]));
      trackUm = ax.reduce((s, a) => s + a[2], 0) / Math.max(1, ax.length);
      return;
    }
    const now = S.jd,
      w = e.okno * 1.7;
    for (let k = 0; k <= 60; k++) {
      const t = e.jd - w + (2 * w * k) / 60;
      updateAll(t);
      basis(EARTH, t, m9);
      const sh = shadow();
      if (sh) {
        track.push(sh.v);
        trackUm += sh.um;
      }
    }
    trackUm /= Math.max(1, track.length);
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
    if (!VIEWS(e).some((q) => q[0] === view)) view = 'a';
    draw(); /* karta musí stát dřív než kamera: podle ní se počítá volná plocha obrazu */
    place(e);
    if (from != null) {
      setTime(from);
      if (e.typ === 'slunce' && view === 'a') aim(e);
    }
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
  /* kamera podle druhu úkazu a zvoleného pohledu; čas modelu je nastavený na vrchol úkazu */
  function place(e) {
    const small = cls('mob') ? 1.5 : 1;
    S.orbMode = back ? back.orb : S.orbMode;
    switching = true;
    try {
      placeCam(e, small);
    } finally {
      switching = false;
    }
  }
  /* 1.10 pohled z místa úkazu: pozorovatel stojí na Zemi a dalekohledem sleduje Slunce (nebo Měsíc).
     Model má osu stínu oproti katalogu NASA posunutou až o desítky km. Aby 3D pohled odpovídal okolnostem z katalogu
     (úplné × částečné), stojí pozorovatel v modelu vůči modelové ose stínu stejně, jako místo úkazu vůči ose podle NASA. */
  function siteOf(e) {
    const s = geoV(e.lat, e.lon),
      q = e.typ === 'slunce' ? nasaAt(e, S.jd) : null;
    calKm = 0;
    let v = s;
    if (q && q.axis) {
      basis(EARTH, S.jd, m9);
      const sm = shadow(null); /* osa stínu podle modelu */
      if (sm) {
        const a = geoV(q.axis[0], q.axis[1]),
          b = sm.v,
          ax = cross(a, b),
          sn = len(ax),
          th = Math.atan2(sn, dot(a, b));
        if (sn > 1e-9 && th < 0.06) {
          const k = [ax[0] / sn, ax[1] / sn, ax[2] / sn],
            kv = cross(k, s),
            kd = dot(k, s),
            c = Math.cos(th),
            si = Math.sin(th);
          v = unit([0, 1, 2].map((j) => s[j] * c + kv[j] * si + k[j] * kd * (1 - c)));
          calKm = th * RE;
        }
      }
    }
    return [Math.asin(Math.max(-1, Math.min(1, v[2]))) / DEG, Math.atan2(v[1], v[0]) / DEG];
  }
  function fromSite(e) {
    const [lat, lon] = siteOf(e),
      f = area();
    ui.povrch.enter(EARTH, lat, lon, {
      fov: e.typ === 'slunce' ? 3.4 : 2.8,
      track: e.typ === 'slunce' ? SUN : MOON,
      quiet: true,
      air: true,
    });
    if (S.surf) {
      S.surf.ox = f.cx - f.W / 2;
      S.surf.oy = f.cy - f.H / 2;
    }
  }
  function placeCam(e, small) {
    if (SHADOW(e) && view === 'z' && ui.povrch) fromSite(e);
    else if (SHADOW(e) && view === 't') {
      /* Země a Měsíc shora, ve skutečném poměru: je vidět, jak daleko Měsíc je a jak úzký je stín */
      topDown(EARTH, [pos(MOON)]);
      S.orbMode = Math.max(2, S.orbMode);
    } else if (e.typ === 'slunce' && view === 'm') behindMoon();
    else if (e.typ === 'slunce') {
      S.jump(idx.get(e.telo));
      S.cam.alt = S.cam.altT = altOf(e);
      aim(e);
    } else if (e.typ === 'mesic') {
      /* pohled od Země na Měsíc; 1.9: Měsíc sedí ve volné ploše vedle karty (na telefonu nad ní) */
      const d = unit(sub(pos(MOON), pos(EARTH))),
        f = area();
      setCam(MOON, d, RM + e.vyska * (f.vert ? 2.1 : 1), f.cx, f.cy);
    } else if (TOP(e)) {
      /* pohled shora na rovinu drah: je vidět, že tělesa leží v jedné přímce se Zemí.
         1.9: všechna zúčastněná tělesa se vejdou do volné plochy vedle karty (dřív přímka mířila i pod lištu) */
      const c = idx.get(e.telo),
        pts = [];
      for (const [a, b] of linesOf(e)) pts.push(pos(a), pos(b));
      if (c === SUN) pts.push(pos(EARTH)); /* Země patří do obrazu vždy: je vidět, odkud se na úkaz díváme */
      topDown(c, pts);
      if (e.typ !== 'blizko') S.orbMode = 1;
    } else if (e.typ === 'hvezda') {
      /* Země zůstává v obraze, hvězda vyjde kousek vedle ní; 1.9: obojí ve volné ploše vedle karty */
      const f = area(),
        c = aimDir(e.dir, f.cx - f.w * (f.vert ? 0.2 : 0.24), f.cy - f.h * (f.vert ? 0.26 : 0.16));
      setCam(EARTH, c, RE + 70000 * small, f.cx + f.w * (f.vert ? 0.1 : 0.14), f.cy + f.h * (f.vert ? 0.2 : 0.12));
    }
  }
  function restore() {
    if (!back) return;
    play = 0;
    setTime(back.jd);
    switching = true;
    S.jump(back.focus);
    switching = false;
    S.cam.yaw = back.yaw;
    S.cam.pitch = back.pitch;
    S.cam.alt = S.cam.altT = back.alt;
    S.cam.ly = S.cam.lp = 0;
    view = 'a';
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
    view = 'a';
    A.play('a_tick');
    if (back) show(cur);
    else draw();
  }
  function open(id, andShow) {
    if (!S.F.on('ukazy')) return;
    const was = cur;
    cur = U.find((e) => e.id === id) || null;
    if (cur !== was) {
      view = 'a';
      play = 0;
    }
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
  /* časová osa úkazu: poloha táhla 0–1000 v okně úkazu, popisek času a tlačítko přehrávání */
  function tlPos() {
    if (!cur) return 0;
    const sp = span(cur);
    return Math.round(1000 * Math.max(0, Math.min(1, (S.jd - sp[0]) / sp[1])));
  }
  /* kde na časové ose jsme vůči vrcholu úkazu */
  function relTxt() {
    if (!cur) return '';
    const sp = span(cur),
      peak = cur.typ === 'hvezda' ? cur.t0 : cur.jd,
      d = S.jd - peak,
      a = Math.abs(d);
    if (a < sp[1] / 500) return cur.typ === 'hvezda' ? 'největší jasnost' : 'vrchol úkazu';
    const m = a * 1440,
      t =
        m < 90
          ? Math.max(1, Math.round(m)) + ' min'
          : m < 2880
            ? num(m / 60, 1) + ' h'
            : a < 90
              ? Math.round(a) + ' dní'
              : num(a / 30.44, 0) + ' měs.';
    return t + (d < 0 ? ' před vrcholem' : ' po vrcholu');
  }
  function tlTick() {
    const inp = card.querySelector('.uk-tl input');
    if (!inp || !cur) return;
    if (!drag) inp.value = tlPos();
    const t = card.querySelector('.uk-t'),
      b = card.querySelector('[data-u="play"]'),
      ph = card.querySelector('.uk-ph'),
      txt = calTxt(S.jd, span(cur)[1] < 3),
      lab = play > 0 ? '⏸ Zastavit' : '▶ Přehrát',
      rel = relTxt();
    if (t && t.textContent !== txt) t.textContent = txt;
    if (b && b.textContent !== lab) b.textContent = lab;
    if (ph && ph.textContent !== rel) ph.textContent = rel;
  }
  function draw() {
    const e = cur;
    if (e && !mini) ukTouch = performance.now();
    card.classList.toggle('on', !!e);
    card.classList.toggle('min', !!e && mini);
    document.body.classList.toggle('ukon', !!e && !mini);
    /* 1.9 úkaz jako samostatná scéna: po dobu ukázky ustoupí karta tělesa, hádanka, pásy, sondy a jména těles, která k úkazu nepatří */
    const scene = !!e && !!back && !mini;
    document.body.classList.toggle('uksh', scene);
    S.evSet = scene ? evOf(e) : null;
    S.evStrict =
      scene && !TOP(e); /* zatmění a supernovy: žádná další jména; pohled shora na dráhy: planety zůstávají */
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
          ? view === 'a'
            ? `<i class="l1"></i> stín Měsíce (100 %) <i class="l2"></i> pás úplného zatmění <i class="l3"></i> pásma částečného zatmění: kolik procent průměru Slunce Měsíc zakryje`
            : view === 'z'
              ? `Stojíš v místě úkazu a sleduješ Slunce dalekohledem. Táhlem posouvej čas. Polohy počítá model${calKm > 1 ? `; aby pohled odpovídal katalogu NASA, stojí pozorovatel v modelu o ${num(Math.round(calKm))} km vedle` : ''}. Přesné okolnosti ukazuje okénko nahoře.`
              : view === 'm'
                ? 'Díváš se od Slunce přes Měsíc na Zemi. Fialový kužel je stín Měsíce; na Zemi z něj dopadne jen malá tmavá skvrna.'
                : 'Pohled shora ve skutečném poměru. Tmavý kužel je plný stín Měsíce, světlý vějíř polostín. Šipka míří ke Slunci.'
          : TOP(e)
            ? `<i class="l2"></i> ${e.typ === 'blizko' ? 'spojnice těles' : 'přímka od Země: tělesa na ní leží za sebou'}. Dráhy jsou stopy: těleso letí k jasnému konci.`
            : e.typ === 'hvezda'
              ? 'Hvězda svítí na obloze vedle Země; ▶ Přehrát ukáže, jak vzplála a pohasla.'
              : view === 'z'
                ? 'Stojíš v místě úkazu a sleduješ Měsíc dalekohledem. Táhlem posouvej čas: Měsíc vjíždí do stínu Země a červená.'
                : view === 'a'
                  ? 'Pohled od Země. Červená kružnice je plný stín Země ve vzdálenosti Měsíce, světlá polostín.'
                  : 'Pohled shora ve skutečném poměru. Tmavý kužel je plný stín Země, světlý vějíř polostín. Šipka míří ke Slunci.',
      sp = span(e),
      tl = back
        ? `<div class="uk-tl"><input type="range" min="0" max="1000" step="1" value="${tlPos()}" aria-label="Čas úkazu: tažením posuneš čas"><i style="left:${(100 * (e.typ === 'hvezda' ? e.t0 - sp[0] : e.jd - sp[0])) / sp[1]}%" title="vrchol úkazu"></i></div>` +
          `<p class="uk-now"><b class="uk-t">${calTxt(S.jd, sp[1] < 3)}</b><span class="uk-ph">${relTxt()}</span></p>`
        : '',
      vw =
        back && VIEWS(e).length
          ? `<div class="uk-views" role="group" aria-label="Pohled">${VIEWS(e)
              .map(([v, t]) => `<button data-v="${v}" class="${v === view ? 'sel' : ''}">${t}</button>`)
              .join('')}</div>`
          : '';
    card.innerHTML =
      `<button class="x" data-u="close" title="Zavřít kartu" aria-label="Zavřít kartu">×</button><button class="x mn" data-u="min" title="Sbalit kartu (úkaz zůstane otevřený)" aria-label="Sbalit kartu">–</button>` +
      `<div class="uk-nav"><button data-u="prev" aria-label="Předchozí úkaz">‹</button><span>${k + 1} / ${L.length}${seen.includes(e.id) ? ' · ✓ viděno' : ''}</span><button data-u="next" aria-label="Další úkaz">›</button></div>` +
      `<h3>${e.ikona} ${e.nazev}</h3><p class="uk-sub">${e.podtitul}</p>` +
      `<p class="uk-when"><b>${e.datum}</b> · ${e.misto}<br><small>${e.cas}${e.datumJul ? `<br>podle juliánského kalendáře ${e.datumJul}` : ''}</small></p>` +
      `<div class="uk-skyrow"><canvas class="uk-sky" width="${px * d}" height="${px * d}" style="width:${px}px;height:${px}px"></canvas><div class="uk-skytxt"></div></div>` +
      `<div class="uk-btn"><button class="pri" data-u="show" title="${back ? 'Skočit na vrchol úkazu' : 'Přenést se v čase na úkaz a ukázat ho'}">${back ? '◉ Vrchol' : '🎬 Ukázat'}</button><button data-u="play" title="Přehrát průběh úkazu (znovu = zastavit)">${play > 0 ? '⏸ Zastavit' : '▶ Přehrát'}</button>` +
      `<button data-u="back"${back ? '' : ' disabled'} title="Vrátit čas i pohled tam, kde jsi byl">⟲ Zpět</button></div>` +
      tl +
      vw +
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
    /* 1.9 (vzor: „Featured Stories and Events“ v NASA Eyes): nahoře úkaz, který nás čeká nejdřív – podle dnešního data */
    const today = Date.now() / 86400000 + 2440587.5,
      nx = U.filter((e) => e.typ !== 'hvezda' && e.jd > today).sort((a, b) => a.jd - b.jd)[0],
      nd = nx ? nx.jd - today : 0,
      nxIn =
        nd < 1
          ? 'dnes'
          : nd < 60
            ? `za ${Math.round(nd)} dní`
            : nd < 730
              ? `za ${Math.round(nd / 30.44)} měsíců`
              : `za ${Math.round(nd / 365.25)} let`;
    list.innerHTML =
      `<p class="uk-prog"><b>Viděno ${seen.length} z ${U.length}</b><i><u style="width:${(100 * seen.length) / U.length}%"></u></i></p>` +
      `<div class="uk-chips">${GRP.map(([g, t]) => `<button data-g="${g}" class="${g === filt ? 'sel' : ''}">${t}</button>`).join('')}</div>` +
      (nx
        ? `<button class="uk-next" data-id="${nx.id}">⏭ <b>Nejbližší úkaz:</b> ${nx.datum}<br>${nx.ikona} ${nx.nazev} <small>(${nxIn})</small></button>`
        : '') +
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
    view = 'a';
    play = 0;
    ui.toggle('#uk', false);
    A.play('panel_open');
    draw();
    /* 1.9: výběr ze seznamu úkaz rovnou ukáže (dřív bylo potřeba ještě „Ukázat“ a karta mezitím ukazovala jen náhled) */
    if (cur) show(cur);
    S.wake();
  });
  card.addEventListener('click', (ev) => {
    const vb = ev.target.closest('button[data-v]');
    if (vb && cur && back) {
      view = vb.dataset.v;
      A.play('a_tick');
      const t = S.jd;
      setTime(cur.jd);
      draw();
      place(cur);
      setTime(t);
      if (cur.typ === 'slunce' && view === 'a') aim(cur);
      ui.refresh();
      draw();
      S.wake();
      return;
    }
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
      if (play > 0) play = 0; /* druhý stisk přehrávání zastaví */
      else if (
        back &&
        S.jd > sp[0] + sp[1] * 0.02 &&
        S.jd < sp[0] + sp[1] * 0.98 &&
        Math.abs(S.jd - cur.jd) > sp[1] * 0.004
      ) {
        /* pokračovat od místa, kam uživatel posunul táhlo */
        play = sp[0] + sp[1] - S.jd;
        playK = sp[1] / 14;
      } else {
        show(cur, sp[0]);
        play = sp[1];
        playK = sp[1] / 14;
      }
      tlTick();
    } else if (a === 'min' || a === 'max') {
      mini = a === 'min';
      draw();
    } else if (a === 'back') restore();
    else if (a === 'prev') go(-1);
    else if (a === 'next') go(1);
    S.wake();
  });
  /* 1.9 časová osa: tažením se posouvá čas úkazu (přehrávání se tím zastaví) */
  card.addEventListener('input', (ev) => {
    if (!ev.target.matches('.uk-tl input') || !cur || !back) return;
    const sp = span(cur);
    play = 0;
    setTime(sp[0] + (sp[1] * ev.target.value) / 1000);
    if (cur.typ === 'slunce' && view === 'a') aim(cur);
    tlTick();
    drawSky();
  });
  card.addEventListener('pointerdown', (ev) => {
    if (ev.target.matches('.uk-tl input')) drag = true;
  });
  for (const n of ['pointerup', 'pointercancel', 'change']) window.addEventListener(n, () => (drag = false));
  /* po puštění táhla vrátit klávesnici aplikaci: šipky by jinak posouvaly táhlo a zároveň ovládaly vesmír */
  card.addEventListener('change', (ev) => {
    if (ev.target.matches('.uk-tl input')) ev.target.blur();
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
      tlTick();
    }
    if (wasPlay && play <= 0) tlTick();
    wasPlay = play > 0;
  });
  // přehrávání: 14 sekund na celý průchod, kamera drží místo úkazu pod sebou
  S.ticks.push((dt) => {
    if (!cur || play <= 0) return;
    const d = Math.min(play, playK * dt);
    play -= d;
    setTime(S.jd + d);
    if (cur.typ === 'slunce' && view === 'a') aim(cur);
  });
  // 2D vrstva zatmění (1.9): pás úplného zatmění, pásma částečného zatmění s procenty, stín, místo úkazu;
  // v pohledech z odstupu kužel stínu a polostínu; u zatmění Měsíce průřez stínem Země.
  S.overlays.push((ctx, e) => {
    if (!S.surf) lastF = e.F; /* při pohledu z povrchu je zorné pole úzké; volná plocha se počítá z běžného */
    if (!cur || !back || !SHADOW(cur) || S.surf) return;
    if (S.focus !== EARTH && S.focus !== MOON) return;
    const { W, H, F, fwd, right, up } = e,
      C = S.camPos,
      ec = pos(EARTH),
      mc = pos(MOON),
      sc = pos(SUN),
      v = sub(C, ec),
      vl = len(v),
      vh = [v[0] / vl, v[1] / vl, v[2] / vl],
      cosH = Math.min(1, RE / vl),
      sinH = Math.sqrt(1 - cosH * cosH),
      rE = vl > RE ? (RE / Math.sqrt(vl * vl - RE * RE)) * F : 1e9 /* poloměr Země na obrazovce */,
      tk = S.txtK || 1,
      FONT = (px, w = 600) => `${w} ${px * tk}px system-ui, -apple-system, Segoe UI, sans-serif`;
    basis(EARTH, S.jd, m9);
    /* bod scény (vůči kameře) → obrazovka */
    const scr = (d) => {
      const zz = d[0] * fwd.x + d[1] * fwd.y + d[2] * fwd.z;
      return zz <= 0
        ? null
        : [
            W / 2 + ((d[0] * right.x + d[1] * right.y + d[2] * right.z) / zz) * F,
            H / 2 - ((d[0] * up.x + d[1] * up.y + d[2] * up.z) / zz) * F,
            zz,
          ];
    };
    const abs = (p) => scr(sub(p, C)) /* p = poloha ve scéně */,
      onE = (w) => scr([ec[0] + w[0] * RE - C[0], ec[1] + w[1] * RE - C[1], ec[2] + w[2] * RE - C[2]]),
      /* w = jednotkový vektor od středu Země; null = za obzorem */
      proj = (w) => (dot(w, vh) < cosH + 0.015 ? null : onE(w)),
      /* bod za obzorem kamery posunout na nejbližší místo obzoru (pro výplně, které obzor ořízne) */
      clampH = (w) => {
        const c = dot(w, vh);
        if (c >= cosH) return w;
        const t = [w[0] - c * vh[0], w[1] - c * vh[1], w[2] - c * vh[2]],
          tl = len(t) || 1;
        return [0, 1, 2].map((k) => vh[k] * cosH + (t[k] / tl) * sinH);
      };
    const line = (pts) => {
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
      ctx.stroke();
    };
    const text = (t, x, y, col = '#fff', px = 12, w = 600) => {
      ctx.font = FONT(px, w);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.strokeText(t, x, y);
      ctx.fillStyle = col;
      ctx.fillText(t, x, y);
    };
    /* kužel stínu z odstupu: lichoběžník od tělesa (poloměr r0) po délce L na poloměr r1, kolmo ke směru pohledu */
    const fw = [fwd.x, fwd.y, fwd.z],
      cone = (base, u, r0, L, r1, fill, stroke) => {
        const w = unit(cross(u, fw)),
          pt = (t, r, s) => abs([0, 1, 2].map((k) => base[k] + u[k] * t + w[k] * r * s)),
          q = [pt(0, r0, 1), pt(L, r1, 1), pt(L, r1, -1), pt(0, r0, -1)];
        if (q.some((p) => !p)) return;
        ctx.beginPath();
        q.forEach((p, j) => (j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        if (stroke) {
          ctx.strokeStyle = stroke;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(q[0][0], q[0][1]);
          ctx.lineTo(q[1][0], q[1][1]);
          ctx.moveTo(q[3][0], q[3][1]);
          ctx.lineTo(q[2][0], q[2][1]);
          ctx.stroke();
        }
      },
      /* odkud svítí Slunce: šipka na pevném místě nahoře ve volné ploše, směr podle skutečné polohy Slunce na obraze */
      sunArrow = (from, u) => {
        const a = abs(from),
          b = abs([0, 1, 2].map((k) => from[k] - u[k] * vl * 0.2));
        if (!a || !b) return;
        const dx = b[0] - a[0],
          dy = b[1] - a[1],
          l = Math.hypot(dx, dy) || 1,
          ux = dx / l,
          uy = dy / l,
          f = area(),
          cx = f.vert ? Math.max(70, f.cx - f.w * 0.3) : f.cx,
          cy = f.vert ? f.cy : Math.max(96, f.cy - f.h / 2 + 34),
          x0 = cx - ux * 30,
          y0 = cy - uy * 30,
          x1 = cx + ux * 30,
          y1 = cy + uy * 30;
        ctx.strokeStyle = ctx.fillStyle = 'rgba(255,214,102,0.95)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x1 + ux * 10, y1 + uy * 10);
        ctx.lineTo(x1 - uy * 5.5, y1 + ux * 5.5);
        ctx.lineTo(x1 + uy * 5.5, y1 - ux * 5.5);
        ctx.fill();
        ctx.textAlign = 'center';
        text(
          f.vert
            ? '☀ ke Slunci'
            : `☀ ke Slunci (${Math.round(len(sub(sc, ec)) / len(sub(mc, ec)) / 10) * 10}× dál než Měsíc)`,
          cx,
          cy + 34 + (uy > 0.5 ? 14 : 0),
          '#ffe7ad',
          12
        );
        ctx.textAlign = 'left';
      };
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.textBaseline = 'alphabetic';
    const far = rE < 90; /* Země je v obraze malá: pohled z odstupu */
    if (cur.typ === 'mesic') {
      const a = unit(sub(ec, sc)) /* osa stínu Země */,
        ds = len(sub(ec, sc)),
        dm = dot(sub(mc, ec), a),
        ru = 1.02 * (RE - ((RS - RE) * dm) / ds),
        rp = 1.02 * (RE + ((RS + RE) * dm) / ds);
      if (S.focus === EARTH && far) {
        const Lu = (RE * ds) / (RS - RE),
          L = Math.min(Lu * 0.98, dm * 1.3);
        cone(ec, a, RE, L, RE + (L * (RS + RE)) / ds, 'rgba(150,140,230,0.13)', 'rgba(190,200,255,0.35)');
        cone(ec, a, RE, L, RE * (1 - L / Lu), 'rgba(70,20,30,0.6)', 'rgba(255,150,120,0.7)');
        sunArrow(ec, a);
      } else if (S.focus === MOON) {
        /* průřez stínem Země ve vzdálenosti Měsíce */
        const x0 = [0, 1, 2].map((k) => ec[k] + a[k] * dm),
          p = unit(cross(a, Math.abs(a[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])),
          q = cross(a, p),
          ring = (r, col, lw, lab) => {
            let best = null;
            ctx.beginPath();
            for (let k = 0; k <= 96; k++) {
              const g = (k / 96) * 6.2832,
                s = abs([0, 1, 2].map((j) => x0[j] + r * (Math.cos(g) * p[j] + Math.sin(g) * q[j])));
              if (!s) continue;
              k ? ctx.lineTo(s[0], s[1]) : ctx.moveTo(s[0], s[1]);
              if (
                s[0] > 30 &&
                s[0] < W - 150 &&
                s[1] > 80 &&
                s[1] < H - 150 &&
                (!best || s[0] - s[1] > best[0] - best[1])
              )
                best = s;
            }
            ctx.strokeStyle = col;
            ctx.lineWidth = lw;
            ctx.stroke();
            if (best) text(lab, best[0] + 8, best[1] - 6, col, 12);
          };
        ring(rp, 'rgba(200,215,255,0.75)', 1.2, 'polostín Země');
        ring(ru, 'rgba(255,140,100,0.95)', 1.8, 'plný stín Země');
      }
      ctx.restore();
      return;
    }
    // ---- zatmění Slunce
    const sh = shadow(cur),
      u = unit(sub(mc, sc)) /* směr stínu: od Slunce přes Měsíc */,
      dl = len(sub(mc, sc));
    if (far) {
      /* z odstupu: kužel plného stínu a vějíř polostínu od Měsíce k Zemi */
      const Lu = (RM * dl) / (RS - RM),
        dE = dot(sub(ec, mc), u),
        L = Math.min(Lu * 0.995, dE),
        mr = e.R && e.R[MOON];
      ctx.save();
      if (mr && mr.pr > 6) {
        /* kužel vychází zpoza Měsíce: kotouč Měsíce z kresby vyjmout */
        ctx.beginPath();
        ctx.rect(0, 0, W, H);
        ctx.arc(mr.sx, mr.sy, mr.pr, 0, 6.2832);
        ctx.clip('evenodd');
      }
      cone(mc, u, RM, dE, RM + (dE * (RS + RM)) / dl, 'rgba(150,140,230,0.13)', 'rgba(190,200,255,0.35)');
      cone(mc, u, RM, L, Math.max(0, RM * (1 - L / Lu)), 'rgba(60,30,110,0.62)', 'rgba(200,170,255,0.8)');
      ctx.restore();
      if (S.focus === EARTH) sunArrow(mc, u);
      if (sh) {
        const p = proj(toWorld(sh.v));
        if (p) {
          ctx.fillStyle = '#000';
          ctx.strokeStyle = '#ffd666';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(p[0], p[1], Math.max(2.4, (sh.um / p[2]) * F), 0, 6.2832);
          ctx.fill();
          ctx.stroke();
        }
      }
      ctx.restore();
      return;
    }
    // pás úplného zatmění (šířka podle skutečného průměru stínu) a jeho osa
    if (track.length > 1) {
      const pc = proj(toWorld(track[track.length >> 1])) || [0, 0, vl];
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(5, ((2 * trackUm) / pc[2]) * F);
      ctx.strokeStyle = 'rgba(255,214,102,0.24)';
      line(track.map(toWorld));
      ctx.lineCap = 'butt';
      ctx.setLineDash([7, 6]);
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = 'rgba(255,214,102,0.9)';
      line(track.map(toWorld));
      ctx.setLineDash([]);
    }
    if (sh) {
      const c = toWorld(sh.v),
        c0 = [c[0] * RE, c[1] * RE, c[2] * RE],
        a = unit(cross(u, Math.abs(u[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])),
        b = cross(u, a),
        /* stopa válce o poloměru d (km) kolem osy stínu na zeměkouli; kde válec Zemi míjí, vede obrys po hranici dne a noci */
        foot = (d) => {
          const o = [];
          for (let k = 0; k <= 72; k++) {
            const g = (k / 72) * 6.2832,
              p0 = [0, 1, 2].map((j) => c0[j] + d * (Math.cos(g) * a[j] + Math.sin(g) * b[j])),
              pu = dot(p0, u),
              D = pu * pu - dot(p0, p0) + RE * RE;
            if (D >= 0) {
              const t = -pu - Math.sqrt(D);
              o.push(unit([p0[0] + u[0] * t, p0[1] + u[1] * t, p0[2] + u[2] * t]));
            } else o.push(unit([p0[0] - pu * u[0], p0[1] - pu * u[1], p0[2] - pu * u[2]]));
          }
          return o;
        };
      if (sh.pen < RE * 1.6) {
        /* pásma částečného zatmění: podíl průměru Slunce, který Měsíc zakrývá (0, 25, 50 a 75 %) */
        const labs = [];
        for (const [G, al] of [
          [0, 0.1],
          [0.25, 0.07],
          [0.5, 0.08],
          [0.75, 0.09],
        ]) {
          const ring = foot(sh.pen - G * (sh.pen - sh.um)),
            pp = ring.map((w) => onE(clampH(w)));
          if (pp.some((p) => !p)) continue;
          ctx.beginPath();
          pp.forEach((p, j) => (j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
          ctx.closePath();
          ctx.fillStyle = `rgba(6,8,26,${al})`;
          ctx.fill();
          ctx.lineWidth = G ? 1 : 1.3;
          ctx.strokeStyle = `rgba(200,215,255,${0.38 + G * 0.3})`;
          line(ring);
          /* popisek: bod obrysu nejvíc vpravo nahoře, který je v obraze */
          let best = null;
          for (const w of ring) {
            const p = proj(w);
            if (
              p &&
              p[0] > 40 &&
              p[0] < W - 70 &&
              p[1] > 84 &&
              p[1] < H - 150 &&
              (!best || p[0] - p[1] > best[0] - best[1])
            )
              best = p;
          }
          /* na malém kotouči Země leží obrysy těsně u sebe: popisek, který by se překrýval s předchozím, se vynechá */
          if (best && !labs.some((q) => Math.hypot(q[1][0] - best[0], q[1][1] - best[1]) < 26 * tk))
            labs.push([Math.round(G * 100) + ' %', best]);
        }
        for (const [t, p] of labs) text(t, p[0] + 6, p[1] - 5, 'rgba(215,226,255,0.95)', 11.5);
      }
      // stín: střed je vidět i tam, kde je skutečný stín menší než pár bodů obrazu
      const p = proj(c);
      if (p) {
        const r = Math.max(7, (sh.um / p[2]) * F);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath();
        ctx.arc(p[0], p[1], r, 0, 6.2832);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffd666';
        ctx.stroke();
        text('100 % · stín Měsíce', p[0] + r + 7, p[1] - r - 3, '#ffe7ad', 12);
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
      if (cur.misto !== 'Praha' || S.labMode === 0) text(cur.misto.split(',')[0], pl[0] + 12, pl[1] + 17, '#fff', 12.5);
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
        if (cur.typ === 'blizko') {
          /* 1.9: vzdálenost přímo na spojnici, mění se s časem na ose úkazu */
          const d = len(sub(pb, pa)),
            t =
              d < 3e6
                ? num(Math.round(d / 100) * 100) + ' km'
                : d < 0.3 * AU
                  ? num(d / 1e6, 1) + ' mil. km'
                  : num(d / AU, 2) + ' AU',
            mx = (qa[0] + qb[0]) / 2,
            my = (qa[1] + qb[1]) / 2;
          ctx.setLineDash([]);
          ctx.font = `600 ${12.5 * (S.txtK || 1)}px system-ui, -apple-system, Segoe UI, sans-serif`;
          ctx.lineWidth = 3;
          ctx.strokeStyle = 'rgba(0,0,0,0.8)';
          ctx.strokeText(t, mx + 10, my - 8);
          ctx.fillStyle = '#ffe7ad';
          ctx.fillText(t, mx + 10, my - 8);
          ctx.setLineDash([8, 7]);
          ctx.lineWidth = 1.6;
          ctx.strokeStyle = 'rgba(255,214,102,0.85)';
        }
      }
      ctx.restore();
    }
    const cine = document.body.classList.contains('cine'),
      fr = S.R && S.R[S.focus];
    for (const st of S.F.on('ukazy') ? STARS : []) {
      const m = magAt(st, S.jd);
      if (m === null) continue;
      if (S.surf && dot(st.dir, S.surfBasis().n.toArray()) < 0) continue; /* 1.10: pod obzorem */
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
  S.bus.on('surf', (q) => {
    if (q || switching || view !== 'z' || !back || !cur) return;
    view = 'a';
    const t = S.jd;
    setTime(cur.jd);
    draw();
    place(cur);
    setTime(t);
    if (cur.typ === 'slunce') aim(cur);
    draw();
  });
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
  S.bus.on('fly', ukMin); /* 1.8a: i při přeletu k jinému tělesu (ikona v liště, číslo, seznam) */
  /* 1.8a: Esc kartu úkazu sbalí do proužku (nezavírá ji – zavření by vrátilo čas). Když je otevřené jiné okno, patří Esc jemu. */
  window.addEventListener(
    'keydown',
    (ev) => {
      if (ev.key !== 'Escape' || !cur || mini) return;
      if (
        document.querySelector('.pop.on, #help.on, #list.on, #gamebox.on') ||
        document.body.classList.contains('cine')
      )
        return;
      if (ui.tut && ui.tut.running()) return;
      ukMin();
    },
    true
  );
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
    view: (v) => {
      const b = card.querySelector(`[data-v="${v}"]`);
      if (b) b.click();
      return view;
    },
    state: () => ({
      view,
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
