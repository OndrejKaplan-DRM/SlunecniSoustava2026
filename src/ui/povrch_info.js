// Pohled z povrchu – panel „Obloha odsud“, vodítka a mřížky (verze 2.1).
// Panel: místo a čas, tělesa na obloze (azimut, výška, úhlový průměr, osvětlená část, jasnost, východ a západ), hvězdy,
// osa a otáčení tělesa, barva oblohy, směr pohledu a zorné pole. Vodítka na obloze: obzorníková mřížka (azimut a výška),
// rovníková mřížka (rektascenze a deklinace J2000), ekliptika, nebeský rovník a póly tělesa, místní poledník, zenit, zaměřovač
// se stupnicí a souřadnice pod ukazatelem. V pohledu z vesmíru: mřížka zeměpisných šířek a délek na povrchu tělesa.
// Výpočty jsou v core/misto.js (stejný kód měří zkouška proti JPL Horizons). Polohy těles jsou zdánlivé (s dobou letu světla).
// Zjednodušení: obzor je matematický (bez terénu), lom světla se nekreslí (u Země je u obzoru uveden číslem), jasnosti těles
// jsou odhad z absolutní jasnosti a fáze (± asi 0,5 mag), hvězdy mají polohy pro rok 2000 (bez vlastního pohybu).
import { B, idx, par, P, SUN, EARTH, AU, period, basis, shape, rotOf } from '../core/sim.js';
import {
  siteFrame,
  azEl,
  raDec,
  dirOfRaDec,
  refraction,
  litFrac,
  riseSet,
  solarDay,
  obliquity,
  subPoint,
  rootOf,
  eyeH,
} from '../core/misto.js';
import { STAR_N, STAR_POS, STAR_MAG, STAR_NAMES } from '../data/stardata.js';
import { STAR_CZ } from '../data/connames.js';
import { AIR, skyText, PLACES, PLACES_ALL } from '../data/mista.js';

const DEG = Math.PI / 180,
  TAU = 2 * Math.PI,
  RS = 696000;
const nf = (v, d = 0) => v.toLocaleString('cs-CZ', { maximumFractionDigits: d, minimumFractionDigits: d });
/* úhel ve stupních → „12° 34′“ (sek = true přidá vteřiny) */
export function dms(v, sek) {
  const s = v < 0 ? '−' : '',
    a = Math.abs(v);
  if (sek) {
    const t = Math.round(a * 3600),
      d = Math.floor(t / 3600),
      m = Math.floor((t % 3600) / 60);
    return `${s}${d}° ${String(m).padStart(2, '0')}′ ${String(t % 60).padStart(2, '0')}″`;
  }
  const t = Math.round(a * 60),
    d = Math.floor(t / 60);
  return `${s}${d}° ${String(t % 60).padStart(2, '0')}′`;
}
/* rektascenze (rad) → „5 h 34 min“ */
const hm = (ra) => {
  const t = Math.round((((ra / TAU) * 24 + 24) % 24) * 60) % 1440;
  return `${Math.floor(t / 60)} h ${String(t % 60).padStart(2, '0')} min`;
};
const dur = (d) => {
  const a = Math.abs(d);
  if (!isFinite(a)) return '—';
  if (a < 1 / 24) return nf(a * 1440, 0) + ' min';
  if (a < 2) {
    const m = Math.round(a * 1440);
    return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
  }
  if (a < 800) return nf(a, a < 100 ? 1 : 0) + ' d';
  return nf(a / 365.25, 1) + ' roku';
};
const ang = (deg) =>
  deg >= 1 ? nf(deg, 2) + '°' : deg >= 1 / 60 ? nf(deg * 60, 1) + '′' : nf(deg * 3600, deg * 3600 < 10 ? 1 : 0) + '″';
const WIND = ['S', 'SV', 'V', 'JV', 'J', 'JZ', 'Z', 'SZ'];
const KIDW = [
  'na severu',
  'na severovýchodě',
  'na východě',
  'na jihovýchodě',
  'na jihu',
  'na jihozápadě',
  'na západě',
  'na severozápadě',
];
const b64 = (s, T) => {
  const bin = atob(s),
    u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return new T(u.buffer);
};
/* Lambertova koule: podíl světla při fázovém úhlu a */
const lambert = (a) => Math.max(1e-5, ((Math.PI - a) * Math.cos(a) + Math.sin(a)) / Math.PI);
const STEPS = [30, 15, 10, 5, 2, 1, 0.5, 1 / 6, 1 / 12, 1 / 60, 1 / 120, 1 / 360];
const pickStep = (v) => STEPS.find((s) => s <= v) || STEPS[STEPS.length - 1];
const stepTxt = (s) => (s >= 1 ? nf(s, 0) + '°' : s >= 1 / 60 - 1e-9 ? nf(s * 60, 0) + '′' : nf(s * 3600, 0) + '″');

export function createPovrchInfo(S, A, ui, P0) {
  const pan = document.createElement('div');
  pan.id = 'surfp';
  pan.className = 'panel';
  pan.setAttribute('aria-label', 'Obloha odsud');
  document.body.appendChild(pan);
  /* stav vodítek jen pro toto spuštění: 2.2 – po startu je vše vypnuté (2.1 si stav pamatovala a mřížka na tělese pak naběhla
     zapnutá, což Ondřej vnímal jako rušivé); starý záznam se smaže */
  const G = { open: false, az: false, eq: false, lines: false, ret: false, body: false, tab: 'tel' };
  try {
    localStorage.removeItem('s200surf');
  } catch (e) {
    /* bez úložiště (soukromé okno) */
  }
  const save = () => {};
  // ---------- hvězdy (Yale BSC, 7 008 hvězd do 6,3 mag) ----------
  let ST = null;
  function stars() {
    if (ST) return ST;
    const pos = b64(STAR_POS, Float32Array),
      mag = b64(STAR_MAG, Uint8Array),
      d = new Float32Array(STAR_N * 3),
      m = new Float32Array(STAR_N),
      v = [0, 0, 0];
    for (let i = 0; i < STAR_N; i++) {
      dirOfRaDec(pos[i * 2] * DEG, pos[i * 2 + 1] * DEG, v);
      d.set(v, i * 3);
      m[i] = mag[i] / 30 - 2;
    }
    const name = new Map();
    for (const [i, n] of STAR_NAMES) if (!name.has(i)) name.set(i, STAR_CZ[n] || n);
    return (ST = { d, m, name, pos });
  }
  // ---------- jasnost tělesa (odhad) ----------
  function vmag(j, C) {
    const dx = P[j * 3] - C[0],
      dy = P[j * 3 + 1] - C[1],
      dz = P[j * 3 + 2] - C[2],
      dl = Math.hypot(dx, dy, dz) / AU;
    if (j === SUN) return -26.74 + 5 * Math.log10(dl);
    const b = B[j];
    if (b.H === undefined) return null;
    const sx = P[j * 3] - P[SUN * 3],
      sy = P[j * 3 + 1] - P[SUN * 3 + 1],
      sz = P[j * 3 + 2] - P[SUN * 3 + 2],
      r = Math.hypot(sx, sy, sz) / AU,
      ca = (sx * dx + sy * dy + sz * dz) / (r * AU * dl * AU),
      al = Math.acos(Math.max(-1, Math.min(1, ca)));
    return b.H + 5 * Math.log10(r * dl) - 2.5 * Math.log10(lambert(al));
  }
  /* mezní jasnost pro oko podle jasu oblohy: výška Slunce (°), síla atmosféry k (0 = bez vzduchu) */
  function limMag(sunEl, k) {
    if (!k) return 6.5;
    const e = sunEl,
      base =
        e > 0
          ? -4
          : e > -6
            ? -4 + (-e / 6) * 5
            : e > -12
              ? 1 + ((-e - 6) / 6) * 3.5
              : e > -18
                ? 4.5 + ((-e - 12) / 6) * 2
                : 6.5;
    return 6.5 - (6.5 - base) * Math.min(1, k);
  }
  // ---------- východy a západy: jedno těleso za tik ----------
  const RSC = new Map();
  let rsKey = '',
    rsTurn = 0;
  function riseOf(q, j) {
    const key = `${q.i}|${q.lat.toFixed(3)}|${q.lon.toFixed(3)}`;
    if (key !== rsKey) {
      RSC.clear();
      rsKey = key;
    }
    return RSC.get(j) || null;
  }
  function riseTick(q, list) {
    if (!list.length) return;
    const sd = solarDay(q.i),
      span = sd && isFinite(sd) && Math.abs(sd) < 400 ? Math.abs(sd) * 1.1 : 30,
      j = list[rsTurn++ % list.length],
      c = RSC.get(j);
    if (c && Math.abs(S.jd - c.jd) < span / 400 && !(c.rise && c.rise < S.jd) && !(c.set && c.set < S.jd)) return;
    /* měsíce obíhají rychleji, než se těleso otočí (Phobos): kratší krok */
    const fast = par[j] === q.i && period[j] < span ? Math.min(span, period[j]) : span;
    const r = riseSet(q.i, q.lat, q.lon, j, S.jd, span, fast / 160);
    r.jd = S.jd;
    RSC.set(j, r);
  }
  // ---------- panel ----------
  const kid = P0.kid,
    TABS = [
      ['tel', '☀ Tělesa'],
      ['hve', '✨ Hvězdy'],
      ['osa', '🌐 Osa'],
      ['obl', '🎨 Barva'],
      ['poh', '🔭 Pohled'],
      ['vod', '⌗ Vodítka'],
    ],
    KID_TABS = ['tel', 'hve', 'obl', 'vod'];
  let tT = 0,
    lastKey = '';
  const sunEl = () => {
    const d = S.surfDir(SUN);
    return d ? d.el / DEG : 0;
  };
  const jdToInput = (jd) => {
    const d = new Date((jd - 2440587.5) * 86400000);
    return isNaN(d) ? '' : d.toISOString().slice(0, 16);
  };
  function places(i) {
    const b = B[i],
      own = PLACES[b.id] || [],
      locked = par[i] >= 0 && par[i] !== SUN && !own.some((p) => p[1] === 0 && p[2] === 0);
    return [
      ...own,
      ...(locked
        ? [
            [`${B[par[i]].cs} v nadhlavníku (střed přivrácené strany)`, 0, 0],
            ['Střed odvrácené strany', 0, 180],
          ]
        : []),
      ...PLACES_ALL.filter((p) => !own.some((o) => o[1] === p[1] && o[2] === p[2]) && !(locked && p[1] === 0)),
    ];
  }
  function build() {
    const q = S.surf;
    if (!q) return;
    const b = B[q.i],
      pl = places(q.i);
    lastKey = q.i + '';
    pan.innerHTML =
      `<button class="x" data-p="close" title="Zavřít panel">×</button><h3>📋 Obloha odsud: ${b.cs}</h3>` +
      `<div class="sp-sec"><label>📍 Místo <select data-p="place"><option value="">vybrat místo…</option>${pl.map((p, k) => `<option value="${k}">${p[0]}</option>`).join('')}<option value="sun">☀ Slunce v nadhlavníku (teď)</option><option value="term">🌅 Východ Slunce (teď)</option></select></label>` +
      (kid()
        ? ''
        : `<div class="sp-row"><label>šířka <input data-p="lat" type="number" min="-90" max="90" step="0.01" inputmode="decimal"></label><label>vých. délka <input data-p="lon" type="number" min="-360" max="360" step="0.01" inputmode="decimal"></label><button data-p="go" title="Přesunout se na zadané souřadnice">Jít</button></div>`) +
      `<div class="sp-row"><label>🕐 UT <input data-p="time" type="datetime-local" step="60"></label><button data-p="now" title="Skutečný čas">Teď</button></div>` +
      `<div class="sp-row sp-step"><button data-p="t" data-d="-1">−1 den</button><button data-p="t" data-d="-0.0416667">−1 h</button><button data-p="t" data-d="-0.0069444">−10 min</button><button data-p="t" data-d="0.0069444">+10 min</button><button data-p="t" data-d="0.0416667">+1 h</button><button data-p="t" data-d="1">+1 den</button></div>` +
      `<p class="sp-lst"></p></div>` +
      `<div class="sp-tabs">${TABS.filter((t) => !kid() || KID_TABS.includes(t[0]))
        .map((t) => `<button data-p="tab" data-t="${t[0]}" class="${G.tab === t[0] ? 'sel' : ''}">${t[1]}</button>`)
        .join('')}</div><div class="sp-body"></div>` +
      `<p class="sp-foot">${kid() ? 'Tělesa jsou tam, kde by je viděl astronaut stojící na tomhle místě. Ověřeno podle NASA.' : 'Polohy jsou zdánlivé (s dobou letu světla), obzor matematický, bez lomu světla. Model je ověřený proti JPL Horizons – viz nápověda.'}</p>`;
    if (kid() && !KID_TABS.includes(G.tab)) G.tab = 'tel';
    fill(true);
  }
  function fill(force) {
    const q = S.surf;
    if (!q || !G.open) return;
    if (lastKey !== q.i + '') return build();
    const now = performance.now();
    if (!force && now - tT < 450) return;
    tT = now;
    const b = B[q.i],
      ae = document.activeElement,
      set = (sel, v) => {
        const e = pan.querySelector(sel);
        if (e && e !== ae && e.value !== v) e.value = v;
      };
    set('[data-p="lat"]', q.lat.toFixed(2));
    set('[data-p="lon"]', ((((q.lon % 360) + 540) % 360) - 180).toFixed(2));
    set('[data-p="time"]', jdToInput(S.jd));
    /* místní sluneční čas z rozdílu délky místa a místa, kde je Slunce v nadhlavníku */
    const ss = subPoint(q.i, SUN, S.jd),
      sd = solarDay(q.i),
      lst = pan.querySelector('.sp-lst');
    let t = '';
    if (sd === null) t = 'Otáčení tělesa není známé.';
    else if (!isFinite(sd)) t = 'Slunce tu stojí na obloze stále na stejném místě.';
    else {
      const f = (((((q.lon - ss[1]) / 360) * Math.sign(sd) + 0.5) % 1) + 1) % 1,
        m = Math.round(f * 1440) % 1440;
      t = `Místní sluneční čas <b>${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}</b> <small>(zdejší den má 24 „hodin“ a trvá ${dur(Math.abs(sd))}${sd < 0 ? '; Slunce jde od západu k východu' : ''})</small>`;
    }
    if (lst.innerHTML !== t) lst.innerHTML = t;
    const body = pan.querySelector('.sp-body'),
      h = TAB[G.tab](q, b);
    if (body.dataset.h !== h) {
      body.dataset.h = h;
      const sc = body.scrollTop;
      body.innerHTML = h;
      body.scrollTop = sc;
    }
  }
  /* seznam těles: Slunce, mateřské těleso, měsíce, Země, planety */
  function rowsOf(q) {
    const C = S.camPos,
      list = P0.targets(q.i),
      a = AIR[B[q.i].id],
      k = a && q.air ? a.k : 0,
      se = sunEl(),
      lim = a && a.opaque && q.air ? -99 : limMag(se, k);
    riseTick(q, list);
    return list.map((j) => {
      const d = S.surfDir(j),
        dx = P[j * 3] - C[0],
        dy = P[j * 3 + 1] - C[1],
        dz = P[j * 3 + 2] - C[2],
        dist = Math.hypot(dx, dy, dz),
        R = j === SUN ? RS : B[j].R,
        diam = (2 * Math.asin(Math.min(1, R / dist))) / DEG,
        lit = litFrac(j, C[0], C[1], C[2]),
        m = vmag(j, C),
        el = d.el / DEG,
        az = (((d.az / DEG) % 360) + 360) % 360,
        rs = riseOf(q, j);
      let st;
      if (el < -diam / 2) st = rs && rs.rise ? `vyjde za ${dur(rs.rise - S.jd)}` : 'pod obzorem';
      else if (a && a.opaque && q.air) st = 'za oblaky';
      else if (m !== null && m > lim) st = j === SUN ? '' : 'přezářeno denní oblohou';
      else st = rs && rs.set ? `zapadne za ${dur(rs.set - S.jd)}` : rs && !rs.rise ? 'nezapadá' : 'nad obzorem';
      return { j, az, el, diam, lit, m, st, up: el > -diam / 2, vis: el > -diam / 2 && (m === null || m <= lim) };
    });
  }
  const TAB = {
    tel(q, b) {
      const r = rowsOf(q),
        earth = q.i === EARTH;
      if (kid())
        return (
          `<table class="sp-t"><tr><th>těleso</th><th>kde</th><th>jak vysoko</th><th></th></tr>` +
          r
            .map(
              (x) =>
                `<tr class="${x.up ? (x.vis ? 'up' : 'dim') : 'dn'}${q.track === x.j ? ' tr' : ''}" data-j="${x.j}" title="Klikni a podívej se na něj"><td>${B[x.j].cs}</td><td>${KIDW[Math.round(x.az / 45) % 8]}</td><td>${x.el >= 0 ? nf(x.el, 0) + '° nad obzorem' : 'pod obzorem'}</td><td><small>${x.st}</small></td></tr>`
            )
            .join('') +
          `</table><p class="sp-note">Klikni na řádek a pohled se k tělesu otočí. 90° nad obzorem = přímo nad hlavou.</p>`
        );
      return (
        `<table class="sp-t"><tr><th>těleso</th><th>azimut</th><th>výška</th><th>průměr</th><th>jasnost</th><th></th></tr>` +
        r
          .map(
            (x) =>
              `<tr class="${x.up ? (x.vis ? 'up' : 'dim') : 'dn'}${q.track === x.j ? ' tr' : ''}" data-j="${x.j}" title="Klik: najít na obloze a sledovat"><td>${B[x.j].cs}${x.j !== SUN && x.lit < 0.985 ? ` <small>${nf(x.lit * 100, 0)} %</small>` : ''}</td><td>${nf(x.az, 1)}° ${WIND[Math.round(x.az / 45) % 8]}</td><td>${x.el >= 0 ? '+' : '−'}${nf(Math.abs(x.el), 1)}°${earth && q.air && x.el > -1.2 && x.el < 12 ? ` <small title="s lomem světla v ovzduší">(${nf(x.el + refraction(x.el), 1)}°)</small>` : ''}</td><td>${ang(x.diam)}</td><td>${x.m === null ? '' : nf(x.m, 1).replace('-', '−')}</td><td><small>${x.st}</small></td></tr>`
          )
          .join('') +
        `</table><p class="sp-note">% = osvětlená část kotouče. Jasnost v magnitudách je odhad (menší číslo = jasnější; Sirius −1,5, hranice oka asi 6).${earth ? ' V závorce výška s lomem světla, který tělesa u obzoru zvedá asi o půl stupně.' : ''} Klik na řádek těleso najde a sleduje.</p>`
      );
    },
    hve(q, b) {
      const s = stars(),
        f = S.surfSite(),
        a = AIR[b.id],
        op = a && a.opaque && q.air,
        k = a && q.air ? a.k : 0,
        lim = limMag(sunEl(), k);
      let up = 0,
        vis = 0;
      const top = [];
      for (let i = 0; i < STAR_N; i++) {
        const el = s.d[i * 3] * f.n[0] + s.d[i * 3 + 1] * f.n[1] + s.d[i * 3 + 2] * f.n[2];
        if (el <= 0) continue;
        up++;
        if (s.m[i] <= lim) vis++;
        if (top.length < 12 && s.name.has(i)) top.push(i);
      }
      const ae = [0, 0],
        rd = [0, 0];
      return (
        `<p>Nad obzorem je <b>${nf(up)}</b> z ${nf(STAR_N)} hvězd katalogu (do 6,3 mag). ${
          op
            ? 'Pod oblaky není vidět žádná.'
            : lim >= 6.3
              ? 'Obloha je tmavá: okem jsou vidět všechny.'
              : lim < -1.5
                ? 'Je den: hvězdy přezáří obloha.'
                : `Obloha je světlá (soumrak): okem asi <b>${nf(vis)}</b> nejjasnějších (do ${nf(lim, 1)} mag).`
        }${!k && sunEl() > 0 ? ' Bez vzduchu jsou hvězdy na obloze i ve dne; oko oslněné krajinou je ale uvidí jen ve stínu.' : ''}</p>` +
        `<table class="sp-t"><tr><th>hvězda</th><th>jasnost</th><th>azimut</th><th>výška</th><th>RA / Dec</th></tr>` +
        top
          .map((i) => {
            azEl(f, s.d[i * 3], s.d[i * 3 + 1], s.d[i * 3 + 2], ae);
            raDec(s.d[i * 3], s.d[i * 3 + 1], s.d[i * 3 + 2], rd);
            const az = (((ae[0] / DEG) % 360) + 360) % 360;
            return `<tr class="${s.m[i] <= lim && !op ? 'up' : 'dim'}" data-s="${i}" title="Klik: natočit pohled"><td>${s.name.get(i)}</td><td>${nf(s.m[i], 1).replace('-', '−')}</td><td>${nf(az, 1)}° ${WIND[Math.round(az / 45) % 8]}</td><td>+${nf(ae[1] / DEG, 1)}°</td><td><small>${hm(rd[0])} / ${dms(rd[1] / DEG)}</small></td></tr>`;
          })
          .join('') +
        `</table><p class="sp-note">Dvanáct nejjasnějších pojmenovaných hvězd nad obzorem. Polohy hvězd: Yale Bright Star Catalogue, rovník J2000 (bez vlastního pohybu – za století se nejrychlejší jasné hvězdy posunou o pár úhlových minut). Hvězdy jsou tak daleko, že z kteréhokoli tělesa Sluneční soustavy tvoří stejná souhvězdí.</p>`
      );
    },
    osa(q, b) {
      const i = q.i,
        r = rootOf(i),
        ob = obliquity(i, S.jd),
        sd = solarDay(i),
        ss = subPoint(i, SUN, S.jd),
        se = i !== EARTH ? subPoint(i, EARTH, S.jd) : null,
        f = S.surfSite(),
        s = stars(),
        ro = rotOf(i),
        pole = f.pole,
        north = q.lat >= 0;
      /* nejbližší jasná hvězda k nebeskému pólu, který je nad obzorem */
      let best = -1,
        bd = -2;
      const sg = north ? 1 : -1;
      for (let k = 0; k < STAR_N && s.m[k] < 4.3; k++) {
        const c = sg * (s.d[k * 3] * pole[0] + s.d[k * 3 + 1] * pole[1] + s.d[k * 3 + 2] * pole[2]);
        if (c > bd) {
          bd = c;
          best = k;
        }
      }
      const pd = Math.acos(Math.min(1, bd)) / DEG,
        lonE = ((q.lon % 360) + 360) % 360,
        row = (k, v) => (v ? `<tr><th>${k}</th><td>${v}</td></tr>` : ''),
        noon = 90 - Math.abs(q.lat - ss[0]);
      return (
        `<table class="sp-kv">` +
        row(
          'Místo',
          `${P0.place(q)}<br><small>východní délka ${nf(lonE, 2)}° = západní ${nf((360 - lonE) % 360, 2)}°; oko modelu je ${nf(eyeH(i) * 1000, 0)} m nad terénem, obzor proto klesne o ${ang(Math.acos(b.R / (b.R + eyeH(i))) / DEG)}</small>`
        ) +
        row(
          'Osa otáčení',
          ob === null
            ? null
            : `skloněná o <b>${nf(ob > 90 ? 180 - ob : ob, 1)}°</b> ke kolmici na dráhu${ob > 90 ? ' a těleso se točí pozpátku' : ''}${r !== i ? ` <small>(dráha planety ${B[r].cs} kolem Slunce)</small>` : ''}${ro || i === EARTH ? '' : ' <small>– směr osy není změřen, v modelu je zvolený</small>'}`
        ) +
        row('Otočka vůči hvězdám', b.rot ? dur(Math.abs(b.rot) / 24) + (b.rot < 0 ? ' (pozpátku)' : '') : 'neznámá') +
        row(
          'Sluneční den',
          sd === null
            ? null
            : !isFinite(sd)
              ? 'nekonečný – Slunce se po obloze nehýbe'
              : dur(Math.abs(sd)) + (sd < 0 ? ' (Slunce vychází na západě)' : '')
        ) +
        row(
          'Nebeský pól',
          `${north ? 'severní' : 'jižní'} je ${nf(Math.abs(q.lat), 1)}° nad ${north ? 'severním' : 'jižním'} obzorem (tolik, kolik je zeměpisná šířka)` +
            (best >= 0
              ? `<br><small>nejbližší jasná hvězda: ${s.name.get(best) || 'bez jména'} (${nf(s.m[best], 1)} mag), ${nf(pd, 1)}° od pólu${pd < 3 ? ' – zdejší „Polárka“' : ''}</small>`
              : '')
        ) +
        row(
          'Slunce v nadhlavníku',
          `${nf(Math.abs(ss[0]), 1)}° ${ss[0] >= 0 ? 's.' : 'j.'} š., ${nf(ss[1], 1)}° v. d.<br><small>v poledne tu vystoupí ${noon > 0 ? nf(Math.min(90, noon), 1) + '° nad obzor' : 'jen pod obzor – polární noc'}${Math.abs(q.lat) > 90 - Math.abs(ss[0]) && q.lat * ss[0] > 0 ? '; je polární den' : ''}</small>`
        ) +
        (se
          ? row(
              'Země v nadhlavníku',
              `${nf(Math.abs(se[0]), 1)}° ${se[0] >= 0 ? 's.' : 'j.'} š., ${nf(se[1], 1)}° v. d.`
            )
          : '') +
        row(
          'Poloměr a zploštění',
          `${nf(b.R, b.R < 100 ? 1 : 0)} km${b.flat ? `, pól je o ${nf(b.R * b.flat, 0)} km blíž středu` : ''}`
        ) +
        row(
          'Model otáčení',
          ro
            ? 'IAU WGCCRE 2015 (stejný jako JPL Horizons)'
            : i === EARTH
              ? 'precese, nutace a hvězdný čas ze světového času'
              : par[i] !== SUN
                ? 'vázaná rotace: stále stejnou stranou k planetě'
                : 'odhad (perioda z katalogu, osa zvolená)'
        ) +
        `</table>`
      );
    },
    obl(q, b) {
      const a = AIR[b.id],
        se = sunEl(),
        sw = (c) => `<i class="sp-sw" style="background:rgb(${c})"></i>`,
        st = se > 0.3 ? 'den' : se > -6 ? 'soumrak (Slunce těsně pod obzorem)' : se > -18 ? 'pozdní soumrak' : 'noc';
      return (
        `<p>${skyText(b)}</p>` +
        (a
          ? `<p class="sp-cols">${sw(a.z)} nadhlavník ve dne &nbsp; ${sw(a.h)} u obzoru &nbsp; ${sw(a.tw)} soumrak${a.odhad ? ' <small>(odhad)</small>' : ''}</p>`
          : `<p class="sp-cols">${sw([0, 0, 0])} černá ve dne i v noci</p>`) +
        `<table class="sp-kv"><tr><th>Teď</th><td>${st}; Slunce ${se >= 0 ? nf(se, 1) + '° nad obzorem' : nf(-se, 1) + '° pod obzorem'}</td></tr>` +
        `<tr><th>Slunce odsud</th><td>${ang((2 * Math.asin(RS / Math.hypot(P[SUN * 3] - S.camPos[0], P[SUN * 3 + 1] - S.camPos[1], P[SUN * 3 + 2] - S.camPos[2]))) / DEG)} <small>(ze Země 0,53°)</small>, světlo letí ${dur(S.ltSun || 0)}</td></tr>` +
        (a
          ? `<tr><th>Zobrazení</th><td>${a.opaque ? (q.air ? 'pod oblaky (skutečný povrch)' : 'nad oblačností') : q.air ? 'se vzduchem' : 'bez vzduchu (hvězdy i ve dne)'} <small>– přepíná tlačítko 🌫 v liště</small></td></tr>`
          : '') +
        `</table><p class="sp-note">Barvy oblohy jsou ilustrace podle snímků sond, ne výpočet rozptylu světla.</p>`
      );
    },
    poh(q, b) {
      const f = S.fov(),
        az = (((q.az / DEG) % 360) + 360) % 360,
        e = lastE,
        rd = [0, 0];
      if (e) raDec(e.fwd.x, e.fwd.y, e.fwd.z, rd);
      const sek = f < 2;
      return (
        `<table class="sp-kv"><tr><th>Směr pohledu</th><td>azimut <b>${dms(az, sek)}</b> (${WIND[Math.round(az / 45) % 8]}; 0° = sever, 90° = východ)<br>výška <b>${dms(q.el / DEG, sek)}</b> nad obzorem</td></tr>` +
        (e
          ? `<tr><th>Na obloze</th><td>RA ${hm(rd[0])}, Dec ${dms(rd[1] / DEG)} <small>(rovník J2000)</small></td></tr>`
          : '') +
        `<tr><th>Zorné pole</th><td><b>${ang(e ? (2 * Math.atan(e.W / 2 / e.F)) / DEG : f)}</b> na šířku × <b>${ang(f)}</b> na výšku<br><small>1 bod obrazu = ${ang(f / (e ? e.H : 800))}; lidské oko ostře vidí asi 2°, triedr 6°, dalekohled pod 1°</small></td></tr>` +
        `<tr><th>Sledování</th><td>${q.track >= 0 ? B[q.track].cs + ' (pohled drží těleso)' : 'vypnuté – pohled stojí vůči obzoru a obloha se otáčí'}</td></tr>` +
        `</table><p class="sp-row"><button data-p="aim" data-az="0" data-el="20">S</button><button data-p="aim" data-az="90" data-el="20">V</button><button data-p="aim" data-az="180" data-el="20">J</button><button data-p="aim" data-az="270" data-el="20">Z</button><button data-p="aim" data-az="${nf(az, 0)}" data-el="89.9">Zenit</button><button data-p="aimpole">Nebeský pól</button></p>` +
        `<p class="sp-row"><label>azimut <input data-p="az" type="number" min="0" max="360" step="0.1" value="${az.toFixed(1)}"></label><label>výška <input data-p="el" type="number" min="-20" max="90" step="0.1" value="${(q.el / DEG).toFixed(1)}"></label><label>pole <input data-p="fov" type="number" min="0.25" max="75" step="0.05" value="${f.toFixed(2)}"></label><button data-p="setview">Nastavit</button></p>` +
        `<p class="sp-note">Tahem se rozhlížíš, kolečko (dva prsty) mění zorné pole od 75° do 0,25°.</p>`
      );
    },
    vod() {
      const ck = (k, t, n) =>
        `<label class="sp-ck"><input type="checkbox" data-p="g" data-k="${k}"${G[k] ? ' checked' : ''}> <span>${t}<small>${n}</small></span></label>`;
      return (
        ck('az', 'Obzorníková mřížka', 'azimut a výška ve stupních; při přiblížení přejde na úhlové minuty') +
        ck('eq', 'Rovníková mřížka', 'rektascenze a deklinace J2000 – souřadnice z hvězdných map a katalogů') +
        ck(
          'lines',
          'Ekliptika, nebeský rovník a poledník',
          'rovina drah planet, rovník a póly zdejší oblohy, čára sever–zenit–jih'
        ) +
        ck('ret', 'Zaměřovač se stupnicí', 'kříž uprostřed s dílky a souřadnice pod ukazatelem myši') +
        ck(
          'body',
          'Mřížka na povrchu tělesa',
          'v pohledu z vesmíru: rovnoběžky, poledníky, póly, místo pozorovatele a bod, kde je Slunce v nadhlavníku'
        ) +
        `<p class="sp-note">Žlutá = obzorník, modrá = rovník J2000, zelená = poledník, tečkovaně žlutá = ekliptika, tyrkysová = nebeský rovník tělesa.</p>`
      );
    },
  };
  pan.addEventListener('click', (ev) => {
    const q = S.surf,
      t = ev.target.closest('[data-p]'),
      row = ev.target.closest('tr[data-j], tr[data-s]');
    if (!q) return;
    if (row && !t) {
      if (row.dataset.j !== undefined) {
        q.track = +row.dataset.j;
        q.ox = q.oy = 0;
        if (q.fov > 50) q.fov = 50;
      } else {
        const s = stars(),
          i = +row.dataset.s,
          ae = azEl(S.surfSite(), s.d[i * 3], s.d[i * 3 + 1], s.d[i * 3 + 2]);
        q.track = -1;
        q.az = ae[0];
        q.el = Math.max(-0.3, ae[1]);
      }
      A.play('a_tick');
      P0.draw();
      fill(true);
      return S.wake();
    }
    if (!t) return;
    const a = t.dataset.p;
    if (a === 'close') toggle(false);
    else if (a === 'tab') {
      G.tab = t.dataset.t;
      save();
      pan.querySelectorAll('[data-p="tab"]').forEach((x) => x.classList.toggle('sel', x === t));
      pan.querySelector('.sp-body').scrollTop = 0;
    } else if (a === 'go') {
      const la = parseFloat(pan.querySelector('[data-p="lat"]').value),
        lo = parseFloat(pan.querySelector('[data-p="lon"]').value);
      if (isFinite(la) && isFinite(lo)) moveTo(Math.max(-90, Math.min(90, la)), lo);
    } else if (a === 'now') S.jd = Date.now() / 86400000 + 2440587.5;
    else if (a === 't') S.jd += +t.dataset.d;
    else if (a === 'aim') {
      q.track = -1;
      q.az = +t.dataset.az * DEG;
      q.el = +t.dataset.el * DEG;
    } else if (a === 'aimpole') {
      q.track = -1;
      q.az = q.lat >= 0 ? 0 : Math.PI;
      q.el = Math.abs(q.lat) * DEG;
    } else if (a === 'setview') {
      const g = (k) => parseFloat(pan.querySelector(`[data-p="${k}"]`).value);
      q.track = -1;
      if (isFinite(g('az'))) q.az = g('az') * DEG;
      if (isFinite(g('el'))) q.el = Math.max(-20, Math.min(90, g('el'))) * DEG;
      if (isFinite(g('fov'))) q.fov = g('fov');
    } else return;
    A.play('a_tick');
    P0.draw();
    fill(true);
    S.wake();
  });
  pan.addEventListener('change', (ev) => {
    const q = S.surf,
      t = ev.target;
    if (!q || !t.dataset) return;
    if (t.dataset.p === 'g') {
      G[t.dataset.k] = t.checked;
      save();
      P0.draw();
    } else if (t.dataset.p === 'place' && t.value !== '') {
      if (t.value === 'sun' || t.value === 'term') {
        const ss = subPoint(q.i, SUN, S.jd);
        if (t.value === 'sun') moveTo(ss[0], ss[1]);
        else {
          /* rozhraní dne a noci na rovníku: 90° na západ od místa pod Sluncem (tam Slunce při přímé rotaci právě vychází) */
          const sd = solarDay(q.i);
          moveTo(0, ss[1] - 90 * (sd < 0 ? -1 : 1));
        }
      } else {
        const p = places(q.i)[+t.value];
        moveTo(p[1], p[2]);
      }
      t.value = '';
    } else if (t.dataset.p === 'time' && t.value) {
      const ms = Date.parse(t.value + ':00Z');
      if (isFinite(ms)) S.jd = ms / 86400000 + 2440587.5;
    } else return;
    fill(true);
    S.wake();
  });
  function moveTo(lat, lon) {
    const q = S.surf;
    if (!q) return;
    q.lat = lat;
    q.lon = ((lon % 360) + 360) % 360;
    q.track = -1;
    /* pohled na Slunce, je-li nad obzorem – ať je hned vidět, kde jsem */
    S.wake();
    const d = S.surfDir(SUN);
    if (d && d.el > 2 * DEG) {
      q.az = d.az;
      q.el = Math.max(10 * DEG, Math.min(26 * DEG, d.el - 8 * DEG));
    }
    P0.draw();
  }
  function toggle(v) {
    G.open = v === undefined ? !G.open : v;
    pan.classList.toggle('on', G.open && !!S.surf);
    document.body.classList.toggle('surfp', G.open && !!S.surf);
    if (G.open) build();
    P0.draw();
  }
  S.bus.on('surf', (q) => {
    pan.classList.toggle('on', G.open && !!q && !q.quiet);
    document.body.classList.toggle('surfp', G.open && !!q && !q.quiet);
    if (q && G.open) build();
  });
  S.ticks.push(() => {
    if (G.open && S.surf) fill(false);
  });

  // ---------- vodítka na obloze ----------
  let lastE = null,
    mx = -1,
    my = -1;
  const proj = (e, x, y, z, o) => {
    const zz = x * e.fwd.x + y * e.fwd.y + z * e.fwd.z;
    if (zz < 0.03) return false;
    o[0] = e.W / 2 + ((x * e.right.x + y * e.right.y + z * e.right.z) / zz) * e.F;
    o[1] = e.H / 2 - ((x * e.up.x + y * e.up.y + z * e.up.z) / zz) * e.F;
    return true;
  };
  const pt = [0, 0],
    v3 = [0, 0, 0];
  /* čára po obloze z funkce směr(t) pro t0…t1; vrátí bod nejbližší středu obrazu (pro popisek) */
  function curve(ctx, e, fn, t0, t1, n) {
    let pen = false,
      best = null,
      bd = 1e18;
    ctx.beginPath();
    for (let k = 0; k <= n; k++) {
      fn(t0 + ((t1 - t0) * k) / n, v3);
      if (!proj(e, v3[0], v3[1], v3[2], pt) || pt[0] < -200 || pt[0] > e.W + 200 || pt[1] < -200 || pt[1] > e.H + 200) {
        pen = false;
        continue;
      }
      if (pen) ctx.lineTo(pt[0], pt[1]);
      else ctx.moveTo(pt[0], pt[1]);
      pen = true;
      if (pt[0] > 30 && pt[0] < e.W - 30 && pt[1] > 70 && pt[1] < e.H - 40) {
        const d = (pt[0] - e.W / 2) ** 2 + (pt[1] - e.H / 2) ** 2;
        if (d < bd) {
          bd = d;
          best = [pt[0], pt[1]];
        }
      }
    }
    ctx.stroke();
    return best;
  }
  const text = (ctx, t, x, y, col, al = 'left') => {
    ctx.textAlign = al;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.strokeText(t, x, y);
    ctx.fillStyle = col;
    ctx.fillText(t, x, y);
  };
  /* mřížky se kreslí před zemí (ta zakryje, co je pod obzorem) */
  S.overlays.unshift((ctx, e) => {
    const q = S.surf;
    if (!q) return;
    lastE = e;
    if (q.quiet || !(G.az || G.eq || G.lines)) return;
    const f = S.surfSite(),
      fov = S.fov(),
      tk = S.txtK || 1,
      half = Math.min(89, (fov / 2) * Math.hypot(1, e.W / e.H) * 1.08),
      el0 = q.el / DEG,
      az0 = q.az / DEG,
      step = pickStep(fov / 4.2);
    ctx.save();
    ctx.font = `${11 * tk}px system-ui, -apple-system, Segoe UI, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 1;
    if (G.az) {
      const dir = (az, el, o) => {
        const ce = Math.cos(el * DEG),
          a = ce * Math.sin(az * DEG),
          b = ce * Math.cos(az * DEG),
          c = Math.sin(el * DEG);
        o[0] = a * f.e[0] + b * f.no[0] + c * f.n[0];
        o[1] = a * f.e[1] + b * f.no[1] + c * f.n[1];
        o[2] = a * f.e[2] + b * f.no[2] + c * f.n[2];
      };
      ctx.strokeStyle = 'rgba(255, 214, 102, 0.3)';
      const eMin = Math.max(0, Math.floor((el0 - half) / step) * step),
        eMax = Math.min(90, el0 + half),
        ec = Math.min(89.5, Math.max(Math.abs(el0 - half), Math.abs(el0 + half)));
      for (let el = eMin; el <= eMax + 1e-9; el += step) {
        if (el <= 0 || el >= 90) continue;
        const span = Math.min(180, (half / Math.max(0.02, Math.cos(el * DEG))) * 1.15),
          b = curve(
            ctx,
            e,
            (t, o) => dir(t, el, o),
            az0 - span,
            az0 + span,
            Math.max(24, Math.min(160, Math.round(span / 2)))
          );
        if (b) text(ctx, stepTxt2(el, step), b[0] + 4, b[1] - 7 * tk, 'rgba(255, 231, 173, 0.9)');
      }
      /* poledníky azimutu: u zenitu se sbíhají, proto řidší krok */
      const sa = Math.max(step, pickStepUp(step / Math.max(0.05, Math.cos(Math.min(ec, 85) * DEG)))),
        spanA = Math.min(180, (half / Math.max(0.02, Math.cos(ec * DEG))) * 1.15),
        a0 = Math.floor((az0 - spanA) / sa) * sa;
      for (let az = a0; az <= az0 + spanA + 1e-9; az += sa) {
        const b = curve(ctx, e, (t, o) => dir(az, t, o), Math.max(0, el0 - half), Math.min(90, el0 + half), 40);
        if (b) text(ctx, stepTxt2(((az % 360) + 360) % 360, sa), b[0] + 4, b[1] + 8 * tk, 'rgba(255, 231, 173, 0.9)');
      }
    }
    if (G.eq) {
      const rd = raDec(e.fwd.x, e.fwd.y, e.fwd.z),
        de0 = rd[1] / DEG,
        ra0 = rd[0] / DEG,
        dc = Math.min(89.5, Math.max(Math.abs(de0 - half), Math.abs(de0 + half)));
      ctx.strokeStyle = 'rgba(120, 190, 255, 0.3)';
      for (
        let de = Math.max(-90, Math.floor((de0 - half) / step) * step);
        de <= Math.min(90, de0 + half) + 1e-9;
        de += step
      ) {
        if (Math.abs(de) >= 90) continue;
        const span = Math.min(180, (half / Math.max(0.02, Math.cos(de * DEG))) * 1.15),
          b = curve(
            ctx,
            e,
            (t, o) => dirOfRaDec(t * DEG, de * DEG, o),
            ra0 - span,
            ra0 + span,
            Math.max(24, Math.min(160, Math.round(span / 2)))
          );
        if (b)
          text(
            ctx,
            (de > 0 ? '+' : de < 0 ? '−' : '') + stepTxt2(Math.abs(de), step),
            b[0] + 4,
            b[1] - 7 * tk,
            'rgba(170, 215, 255, 0.92)'
          );
      }
      /* hodinové kružnice: krok v minutách rektascenze (15° = 1 h) */
      const RAS = [30, 15, 7.5, 5, 2.5, 1.25, 0.5, 0.25, 0.125, 1 / 24, 1 / 60],
        want = (fov / 4.2 / Math.max(0.05, Math.cos(Math.min(dc, 85) * DEG))) * 1.0,
        sr = RAS.find((s) => s <= Math.max(want, 1 / 60)) || RAS[RAS.length - 1],
        spanR = Math.min(180, (half / Math.max(0.02, Math.cos(dc * DEG))) * 1.15);
      for (let ra = Math.floor((ra0 - spanR) / sr) * sr; ra <= ra0 + spanR + 1e-9; ra += sr) {
        const b = curve(
            ctx,
            e,
            (t, o) => dirOfRaDec(ra * DEG, t * DEG, o),
            Math.max(-90, de0 - half),
            Math.min(90, de0 + half),
            40
          ),
          mins = Math.round((((ra % 360) + 360) % 360) * 4 * 60) / 60;
        if (b)
          text(
            ctx,
            sr >= 15
              ? `${Math.round(mins / 60) % 24} h`
              : `${Math.floor(mins / 60)} h ${nf(mins % 60, sr < 0.25 ? 1 : 0)} m`,
            b[0] + 4,
            b[1] + 8 * tk,
            'rgba(170, 215, 255, 0.92)'
          );
      }
    }
    if (G.lines) {
      /* ekliptika: ve scéně rovina y = 0 */
      ctx.setLineDash([2, 5]);
      ctx.strokeStyle = 'rgba(255, 224, 120, 0.6)';
      let b = curve(ctx, e, (t, o) => ((o[0] = Math.cos(t)), (o[1] = 0), (o[2] = -Math.sin(t))), 0, TAU, 180);
      if (b) text(ctx, 'ekliptika', b[0] + 6, b[1] - 8 * tk, 'rgba(255, 224, 120, 0.95)');
      /* nebeský rovník tělesa: kolmo k ose; e (východ) leží v rovině rovníku */
      const p = f.pole,
        u = [p[1] * f.e[2] - p[2] * f.e[1], p[2] * f.e[0] - p[0] * f.e[2], p[0] * f.e[1] - p[1] * f.e[0]];
      ctx.setLineDash([7, 5]);
      ctx.strokeStyle = 'rgba(90, 220, 210, 0.55)';
      b = curve(
        ctx,
        e,
        (t, o) => {
          for (let k = 0; k < 3; k++) o[k] = Math.cos(t) * f.e[k] + Math.sin(t) * u[k];
        },
        0,
        TAU,
        180
      );
      if (b) text(ctx, 'nebeský rovník', b[0] + 6, b[1] + 9 * tk, 'rgba(120, 235, 225, 0.95)');
      /* místní poledník */
      ctx.strokeStyle = 'rgba(120, 230, 140, 0.5)';
      b = curve(
        ctx,
        e,
        (t, o) => {
          for (let k = 0; k < 3; k++) o[k] = Math.cos(t) * f.no[k] + Math.sin(t) * f.n[k];
        },
        0,
        Math.PI,
        90
      );
      if (b) text(ctx, 'poledník', b[0] + 6, b[1], 'rgba(150, 240, 165, 0.95)');
      ctx.setLineDash([]);
      /* zenit a nebeské póly */
      const mark = (x, y, z, t, col) => {
        if (!proj(e, x, y, z, pt) || pt[0] < 0 || pt[0] > e.W || pt[1] < 0 || pt[1] > e.H) return;
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(pt[0] - 7, pt[1]);
        ctx.lineTo(pt[0] + 7, pt[1]);
        ctx.moveTo(pt[0], pt[1] - 7);
        ctx.lineTo(pt[0], pt[1] + 7);
        ctx.stroke();
        ctx.lineWidth = 1;
        text(ctx, t, pt[0] + 10, pt[1] - 9 * tk, col);
      };
      mark(f.n[0], f.n[1], f.n[2], 'zenit', 'rgba(255, 231, 173, 0.95)');
      mark(p[0], p[1], p[2], 'severní nebeský pól', 'rgba(120, 235, 225, 0.95)');
      mark(-p[0], -p[1], -p[2], 'jižní nebeský pól', 'rgba(120, 235, 225, 0.95)');
    }
    ctx.restore();
  });
  const stepTxt2 = (v, step) => (step >= 1 ? nf(v, 0) + '°' : step >= 1 / 60 - 1e-9 ? dms(v) : dms(v, true));
  const pickStepUp = (v) => [...STEPS].reverse().find((s) => s >= v) || 30;
  /* zaměřovač a souřadnice pod ukazatelem: nad vším ostatním */
  S.overlays.push((ctx, e) => {
    const q = S.surf;
    if (!q || q.quiet || !G.ret) return;
    const f = S.surfSite(),
      tk = S.txtK || 1,
      fov = S.fov(),
      cx = e.W / 2,
      cy = e.H / 2,
      /* dílek stupnice: asi 45–110 bodů */
      t = STEPS.find((s) => Math.tan(s * DEG) * e.F <= 110) || STEPS[STEPS.length - 1],
      px = Math.tan(t * DEG) * e.F;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      ctx.moveTo(cx + dx * 7, cy + dy * 7);
      ctx.lineTo(cx + dx * px * 3, cy + dy * px * 3);
      for (let k = 1; k <= 3; k++) {
        ctx.moveTo(cx + dx * px * k - dy * 5, cy + dy * px * k - dx * 5);
        ctx.lineTo(cx + dx * px * k + dy * 5, cy + dy * px * k + dx * 5);
      }
    }
    ctx.stroke();
    ctx.font = `${11 * tk}px system-ui, -apple-system, Segoe UI, sans-serif`;
    ctx.textBaseline = 'middle';
    text(ctx, stepTxt(t), cx + px, cy + 14 * tk, 'rgba(255,255,255,0.9)', 'center');
    const az = (((q.az / DEG) % 360) + 360) % 360;
    text(
      ctx,
      `azimut ${dms(az, fov < 2)} · výška ${dms(q.el / DEG, fov < 2)}`,
      cx + 12,
      cy - px * 3 - 10 * tk,
      'rgba(255,255,255,0.92)'
    );
    /* ukazatel myši: souřadnice a nejbližší hvězda nebo těleso */
    if (mx >= 0 && !document.body.classList.contains('touch')) {
      const dx = e.fwd.x + (e.right.x * (mx - cx)) / e.F + (e.up.x * (cy - my)) / e.F,
        dy = e.fwd.y + (e.right.y * (mx - cx)) / e.F + (e.up.y * (cy - my)) / e.F,
        dz = e.fwd.z + (e.right.z * (mx - cx)) / e.F + (e.up.z * (cy - my)) / e.F,
        ae = azEl(f, dx, dy, dz),
        rd = raDec(dx, dy, dz),
        a2 = (((ae[0] / DEG) % 360) + 360) % 360,
        near = pick(e, mx, my),
        l1 = `az ${dms(a2, fov < 2)}  výška ${dms(ae[1] / DEG, fov < 2)}`,
        l2 = `RA ${hm(rd[0])}  Dec ${dms(rd[1] / DEG)}`,
        w = Math.max(ctx.measureText(l1).width, ctx.measureText(l2).width, near ? ctx.measureText(near).width : 0) + 14,
        hh = (near ? 3 : 2) * 15 * tk + 8,
        bx = Math.min(e.W - w - 6, mx + 16),
        by = Math.min(e.H - hh - 6, my + 16);
      ctx.fillStyle = 'rgba(8, 12, 22, 0.82)';
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.roundRect(bx, by, w, hh, 6);
      ctx.fill();
      ctx.stroke();
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffe7ad';
      let y = by + 11 * tk + 2;
      if (near) {
        ctx.fillText(near, bx + 7, y);
        y += 15 * tk;
      }
      ctx.fillStyle = '#e9f0ff';
      ctx.fillText(l1, bx + 7, y);
      ctx.fillStyle = '#aad7ff';
      ctx.fillText(l2, bx + 7, y + 15 * tk);
    }
    ctx.restore();
  });
  /* co je pod ukazatelem: těleso (podle kotouče) nebo hvězda do 14 bodů */
  function pick(e, x, y) {
    let best = null,
      bd = 14 * 14;
    for (const it of S.items) {
      const d = (it.sx - x) ** 2 + (it.sy - y) ** 2,
        r = Math.max(14, it.pr + 4);
      if (d < r * r && d < Math.max(bd, r * r)) {
        best = B[it.i].cs;
        bd = d;
      }
    }
    if (best) return best;
    const s = stars(),
      f = S.surfSite(),
      lim = S.fov() < 12 ? 7 : S.fov() < 40 ? 5.5 : 4.6;
    let bi = -1;
    for (let i = 0; i < STAR_N && s.m[i] <= lim; i++) {
      const sx = s.d[i * 3],
        sy = s.d[i * 3 + 1],
        sz = s.d[i * 3 + 2];
      if (sx * f.n[0] + sy * f.n[1] + sz * f.n[2] < 0) continue;
      if (!proj(e, sx, sy, sz, pt)) continue;
      const d = (pt[0] - x) ** 2 + (pt[1] - y) ** 2;
      if (d < bd) {
        bd = d;
        bi = i;
      }
    }
    return bi < 0 ? null : `${s.name.get(bi) || 'hvězda'} · ${nf(s.m[bi], 1).replace('-', '−')} mag`;
  }
  window.addEventListener(
    'pointermove',
    (ev) => {
      if (!S.surf || !G.ret) return;
      const onSky = ev.target && ev.target.tagName === 'CANVAS';
      mx = onSky ? ev.clientX : -1;
      my = ev.clientY;
      S.wake();
    },
    { passive: true }
  );

  // ---------- mřížka na povrchu tělesa (pohled z vesmíru) ----------
  const m9 = new Array(9);
  S.overlays.push((ctx, e) => {
    if (!G.body || S.surf || S.evSet) return;
    const i = S.focus,
      r = e.R[i];
    if (i === SUN || !r || r.pr < 46 || r.z <= 0) return;
    const b = B[i],
      s = shape[i],
      Ra = (b.R * (s.a[0] + s.a[1])) / 2,
      Rc = b.R * s.a[2],
      C = S.camPos,
      cx = P[i * 3] - C[0],
      cy = P[i * 3 + 1] - C[1],
      cz = P[i * 3 + 2] - C[2],
      tk = S.txtK || 1,
      step = r.pr > 420 ? 10 : r.pr > 190 ? 15 : 30;
    basis(i, S.jd, m9);
    /* bod (šířka, délka ve stupních) → obraz; false, když je na odvrácené straně */
    const P2 = (la, lo, o, k = 1.002) => {
      const cl = Math.cos(la * DEG),
        qx = Ra * k * cl * Math.cos(lo * DEG),
        qy = Ra * k * cl * Math.sin(lo * DEG),
        qz = Rc * k * Math.sin(la * DEG),
        x = cx + qx * m9[0] + qy * m9[3] + qz * m9[6],
        y = cy + qx * m9[1] + qy * m9[4] + qz * m9[7],
        z = cz + qx * m9[2] + qy * m9[5] + qz * m9[8],
        /* normála elipsoidu a směr ke kameře */
        nx = qx / (Ra * Ra),
        ny = qy / (Ra * Ra),
        nz = qz / (Rc * Rc),
        wx = nx * m9[0] + ny * m9[3] + nz * m9[6],
        wy = nx * m9[1] + ny * m9[4] + nz * m9[7],
        wz = nx * m9[2] + ny * m9[5] + nz * m9[8];
      if (wx * x + wy * y + wz * z > 0) return false;
      return proj(e, x, y, z, o);
    };
    const line = (fn, n, col, w) => {
      let pen = false;
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.beginPath();
      for (let k = 0; k <= n; k++) {
        if (!fn(k / n, pt)) {
          pen = false;
          continue;
        }
        if (pen) ctx.lineTo(pt[0], pt[1]);
        else ctx.moveTo(pt[0], pt[1]);
        pen = true;
      }
      ctx.stroke();
    };
    ctx.save();
    ctx.font = `${11 * tk}px system-ui, -apple-system, Segoe UI, sans-serif`;
    ctx.textBaseline = 'middle';
    const sub = S.subPoint(i);
    for (let la = -90 + step; la < 90; la += step)
      line(
        (t, o) => P2(la, t * 360, o),
        120,
        la === 0 ? 'rgba(255, 214, 102, 0.7)' : 'rgba(255,255,255,0.26)',
        la === 0 ? 1.5 : 1
      );
    for (let lo = 0; lo < 360; lo += step)
      line(
        (t, o) => P2(-90 + t * 180, lo, o),
        60,
        lo === 0 ? 'rgba(120, 190, 255, 0.8)' : 'rgba(255,255,255,0.26)',
        lo === 0 ? 1.5 : 1
      );
    /* popisky: rovnoběžky na poledníku pod kamerou, poledníky na rovníku (nebo na rovnoběžce pod kamerou) */
    const lc = Math.round(sub[1] / step) * step,
      ec = Math.abs(sub[0]) < 55 ? 0 : Math.round(sub[0] / step) * step * 0.5;
    for (let la = -90 + step; la < 90; la += step)
      if (P2(la, lc + step / 2, pt))
        text(
          ctx,
          la === 0 ? 'rovník' : `${Math.abs(la)}° ${la > 0 ? 's. š.' : 'j. š.'}`,
          pt[0],
          pt[1] - 7 * tk,
          'rgba(255, 240, 200, 0.95)',
          'center'
        );
    for (let lo = 0; lo < 360; lo += step)
      if (P2(ec + step / 2, lo, pt))
        text(ctx, `${lo}°${lo === 0 ? ' (nultý poledník)' : ''}`, pt[0] + 4, pt[1], 'rgba(190, 220, 255, 0.95)');
    /* osa a póly */
    const pole = (sg, t) => {
      const a = [0, 0],
        c = [0, 0];
      const k1 = proj(e, cx + sg * m9[6] * Rc, cy + sg * m9[7] * Rc, cz + sg * m9[8] * Rc, a),
        k2 = proj(e, cx + sg * m9[6] * Rc * 1.28, cy + sg * m9[7] * Rc * 1.28, cz + sg * m9[8] * Rc * 1.28, c),
        vis = P2(sg * 90, 0, pt, 1);
      if (!k1 || !k2) return;
      ctx.strokeStyle = 'rgba(120, 235, 225, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash(vis ? [] : [3, 4]);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(c[0], c[1]);
      ctx.stroke();
      ctx.setLineDash([]);
      text(ctx, t, c[0] + 6, c[1], 'rgba(120, 235, 225, 0.98)');
    };
    pole(1, 'severní pól');
    pole(-1, 'jižní pól');
    /* značky: Slunce v nadhlavníku, místo pozorovatele */
    const dot = (la, lo, t, col) => {
      if (!P2(la, lo, pt, 1.004)) return;
      ctx.fillStyle = col;
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pt[0], pt[1], 4.5, 0, TAU);
      ctx.fill();
      ctx.stroke();
      text(ctx, t, pt[0] + 8, pt[1] - 9 * tk, col);
    };
    const ss = subPoint(i, SUN, S.jd);
    dot(ss[0], ss[1], '☀ Slunce v nadhlavníku', '#ffd666');
    if (lastSite && lastSite.i === i)
      dot(lastSite.lat, lastSite.lon, '📍 ' + (lastSite.name || 'místo pozorovatele'), '#7de3ff');
    /* střed pohledu */
    text(
      ctx,
      `střed pohledu: ${nf(Math.abs(sub[0]), 1)}° ${sub[0] >= 0 ? 's.' : 'j.'} š., ${nf((sub[1] + 360) % 360, 1)}° v. d.`,
      e.W / 2,
      Math.min(e.H - 150, r.sy + r.pr + 22 * tk),
      'rgba(255,255,255,0.9)',
      'center'
    );
    ctx.restore();
  });
  let lastSite = null;
  S.bus.on('surf', (q) => {
    if (q) lastSite = { i: q.i, lat: q.lat, lon: q.lon };
  });
  S.ticks.push(() => {
    if (S.surf && lastSite && lastSite.i === S.surf.i) {
      lastSite.lat = S.surf.lat;
      lastSite.lon = S.surf.lon;
    }
  });
  return {
    toggle,
    open: () => G.open,
    grid: () => {
      G.az = !G.az;
      save();
      if (G.open) fill(true);
    },
    gridOn: () => G.az,
    bodyGrid: (v) => {
      G.body = v === undefined ? !G.body : v;
      save();
      S.wake();
      return G.body;
    },
    guides: (o) => {
      if (o) {
        Object.assign(G, o);
        save();
        if (G.open) fill(true);
        S.wake();
      }
      return { ...G };
    },
    tab: (t) => {
      G.tab = t;
      if (G.open) build();
    },
    rows: () => (S.surf ? rowsOf(S.surf) : []),
    stars,
    places,
    moveTo,
    limMag,
    vmag,
    cursor: (x, y) => ((mx = x), (my = y)),
    pick: (x, y) => (lastE ? pick(lastE, x, y) : null),
  };
}
