// Superkarta tělesa (verze 1.4): skrytá podrobná karta – pětkrát rychle klikni na název tělesa v kartě.
// Roletky s čísly, obrázek tělesa, porovnání velikostí a náčrt dráhy. Vše se počítá z katalogu a z okamžité polohy v modelu.
import { B, P, idx, par, kids, SUN, EARTH, MOON, AU, period, semi } from '../core/sim.js';
import { factsOf } from '../data/facts.js';
import { drawBall, ballSize, loadMap } from '../render/ball.js';
import HI from '../data/hi.json';

const $ = (s) => document.querySelector(s);
const nf = (x, d = 0) => x.toLocaleString('cs-CZ', { maximumFractionDigits: d, minimumFractionDigits: 0 });
const sig = (x) => {
  if (x >= 100) return nf(x);
  if (x >= 10) return nf(x, 1);
  if (x >= 1) return nf(x, 2);
  if (x >= 0.01) return nf(x, 3);
  const e = Math.floor(Math.log10(x));
  return `${nf(x / Math.pow(10, e), 1)} × 10<sup>${e}</sup>`.replace('-', '−');
};
const G0 = 9.80665,
  GK = 6.6743e-20; /* km³ kg⁻¹ s⁻² */
const TYP = {
  star: 'hvězda',
  planet: 'planeta',
  dwarf: 'trpasličí planeta',
  moon: 'měsíc',
  asteroid: 'planetka',
  comet: 'kometa',
  tno: 'těleso za Neptunem',
  centaur: 'kentaur',
  interstellar: 'mezihvězdný návštěvník',
};
const pow10 = (x) => {
  if (!x) return '–';
  const e = Math.floor(Math.log10(x)),
    m = x / Math.pow(10, e);
  return `${nf(m, 2)} × 10<sup>${e}</sup>`;
};
const dur = (h) =>
  h < 1
    ? nf(h * 60, 0) + ' min'
    : h < 72
      ? nf(h, 1) + ' h'
      : h < 24 * 800
        ? nf(h / 24, 1) + ' dne'
        : h < 8766 * 1e6
          ? sig(h / 8766) + ' roku'
          : sig(h / 8766 / 1e6) + ' mil. let';
const per = (d) => (!isFinite(d) ? 'nevrátí se' : dur(d * 24));
const dist = (km) =>
  km < 1
    ? nf(km * 1000) + ' m'
    : km < 1e6
      ? nf(km, km < 100 ? 1 : 0) + ' km'
      : km < 0.05 * AU
        ? sig(km / 1e6) + ' mil. km'
        : sig(km / AU) + ' AU';
const light = (km) => {
  const s = km / 299792.458;
  return s < 90 ? nf(s, 1) + ' s' : s < 5400 ? nf(s / 60, 1) + ' min' : nf(s / 3600, 1) + ' h';
};
const d3 = (a, b) => Math.hypot(P[a * 3] - P[b * 3], P[a * 3 + 1] - P[b * 3 + 1], P[a * 3 + 2] - P[b * 3 + 2]);

/* dráhové elementy v jednotném tvaru: výstřednost, sklon (°), přísluní a odsluní (km) */
function elems(i) {
  const o = B[i].orbit,
    a = semi[i];
  let e = null,
    inc = null;
  if (i === MOON) {
    e = 0.0549;
    inc = 5.145;
  } else if (o.kind === 'jpl') {
    e = o.el[1];
    inc = Math.abs(o.el[2]);
  } else if (o.kind === 'kep') {
    e = o.e;
    inc = o.i;
  } else if (o.kind === 'sat') {
    e = o.e;
    inc = (o.i * 180) / Math.PI;
  }
  const q = o.kind === 'kep' ? o.q * AU : e !== null && a ? a * (1 - e) : null,
    Q = e !== null && e < 1 && a ? (o.kind === 'kep' ? (o.q * AU * (1 + e)) / (1 - e) : a * (1 + e)) : null;
  return { e, inc, q, Q, a, kind: o.kind };
}

export function createSuperkarta(S, A, ui) {
  const box = $('#sk-in');
  let cur = -1;
  const row = (k, v, n) =>
    v === null || v === undefined || v === ''
      ? ''
      : `<tr><th>${k}</th><td>${v}${n ? ` <small>${n}</small>` : ''}</td></tr>`;
  const sec = (ico, title, rows, open) => {
    const body = Array.isArray(rows) ? rows.filter(Boolean).join('') : rows;
    return body
      ? `<details${open ? ' open' : ''}><summary>${ico} ${title}</summary>${Array.isArray(rows) ? `<table>${body}</table>` : body}</details>`
      : '';
  };
  function html(i) {
    const b = B[i],
      p = par[i],
      E = B[EARTH],
      D = b.R * 2,
      el = elems(i),
      rs = i === SUN ? 0 : d3(i, SUN),
      re = d3(i, EARTH),
      rp = p >= 0 ? d3(i, p) : 0,
      au = rs / AU;
    const rho =
      b.rho ||
      (b.mass && !b.abc ? (b.mass / ((4 / 3) * Math.PI * Math.pow(b.R * 1e5, 3) * (1 - (b.flat || 0)))) * 1000 : null);
    /* okamžitá oběžná rychlost z rovnice vis-viva (hmotnost mateřského tělesa z katalogu) */
    let v = null;
    if (p >= 0 && B[p].mass && el.a && rp > 0 && el.kind !== 'trojan') {
      const hyp = el.e !== null && el.e >= 1,
        inv = hyp ? -1 / ((el.q || rp) / (el.e - 1 || 1e-9)) : 1 / el.a,
        vv = GK * B[p].mass * (2 / rp - inv);
      if (vv > 0) v = Math.sqrt(vv);
    }
    const mo = kids[i] || [],
      sunDeg = i === SUN ? null : (2 * Math.atan(B[SUN].R / rs) * 180) / Math.PI;
    const s1 = [
      row(
        'Průměr',
        nf(D, D < 100 ? 1 : 0) + ' km',
        i !== EARTH && D / (E.R * 2) > 0.01 ? `${sig(D / (E.R * 2))} × Země` : ''
      ),
      b.abc ? row('Rozměry', b.abc.map((x) => nf(x * 2, x < 50 ? 1 : 0)).join(' × ') + ' km', 'tři osy') : '',
      b.flat ? row('Zploštění', nf(b.flat * 100, 2) + ' %', `pól je o ${nf(b.R * b.flat, 0)} km blíž středu`) : '',
      row(
        'Hmotnost',
        pow10(b.mass) + ' kg',
        b.mass && i !== EARTH && b.mass / E.mass > 1e-4 ? `${sig(b.mass / E.mass)} × Země` : ''
      ),
      rho ? row('Hustota', nf(rho, 2) + ' g/cm³', 'voda 1, žula 2,7, železo 7,9') : '',
      row(
        'Tíže na povrchu',
        b.g ? (b.g >= 0.01 ? sig(b.g) + ' m/s²' : sig(b.g * 1000) + ' mm/s²') : null,
        b.g >= 0.01 ? `${sig(b.g / G0)} g` : b.g ? `${nf(G0 / b.g, 0)}× slabší než na Zemi` : ''
      ),
      row('Úniková rychlost', b.vesc ? (b.vesc >= 1000 ? sig(b.vesc / 1000) + ' km/s' : sig(b.vesc) + ' m/s') : null),
      row('Odrazivost (albedo)', b.albedo ? nf(b.albedo * 100, 0) + ' %' : null),
      row('Absolutní jasnost H', b.H !== undefined ? nf(b.H, 2) + ' mag' : null),
    ];
    const s2 =
      i === SUN
        ? []
        : [
            row(
              p === SUN ? 'Velká poloosa' : 'Střední vzdálenost od tělesa ' + B[p].cs,
              el.a && el.kind !== 'trojan' && (el.e === null || el.e < 0.9999) ? dist(el.a) : null
            ),
            row('Oběžná doba', per(period[i])),
            row(
              'Výstřednost',
              el.e !== null ? nf(el.e, 4) : null,
              el.e !== null
                ? el.e >= 1
                  ? 'otevřená dráha, nevrátí se'
                  : el.e < 0.02
                    ? 'téměř kružnice'
                    : el.e > 0.6
                      ? 'velmi protáhlá'
                      : ''
                : ''
            ),
            row(
              'Sklon dráhy',
              el.inc !== null ? nf(el.inc, 2) + '°' : null,
              el.inc > 90 ? 'obíhá proti směru planet' : ''
            ),
            row('Nejblíž / nejdál', el.q ? dist(el.q) + (el.Q ? ' / ' + dist(el.Q) : '') : null),
            row('Rychlost teď', v ? sig(v) + ' km/s' : null, v ? nf(v * 3600, 0) + ' km/h' : ''),
          ];
    const s3 = [
      row('Otočka (vůči hvězdám)', b.rot ? dur(Math.abs(b.rot)) : null, b.rot < 0 ? 'otáčí se pozpátku' : ''),
      b.rot ? row('Rychlost na rovníku', sig((2 * Math.PI * b.R) / Math.abs(b.rot)) + ' km/h') : '',
      b.pole ? row('Severní pól míří', `RA ${nf(b.pole[0], 1)}°, Dec ${nf(b.pole[1], 1)}°`) : '',
    ];
    const s4 = [
      i !== SUN ? row('Od Slunce', dist(rs), 'světlo letí ' + light(rs)) : '',
      i !== EARTH ? row('Od Země', dist(re), 'světlo letí ' + light(re)) : '',
      p > 0 && p !== SUN ? row('Od tělesa ' + B[p].cs, dist(rp)) : '',
      i !== SUN
        ? row(
            'Sluneční svit',
            au < 1.08 && au > 0.93
              ? 'jako na Zemi'
              : au < 1
                ? `${sig(1 / (au * au))} × silnější než na Zemi`
                : `${sig(au * au)} × slabší než na Zemi`
          )
        : '',
      sunDeg
        ? row('Slunce na obloze', sunDeg > 0.05 ? nf(sunDeg, 2) + '°' : nf(sunDeg * 60, 2) + '′', `ze Země 0,53°`)
        : '',
      i !== EARTH
        ? row(
            'Cesta ze Země',
            `autem ${dur(re / 130)} · letadlem ${dur(re / 900)}`,
            `sondou New Horizons (58 000 km/h) ${dur(re / 58000)}`
          )
        : '',
    ];
    const s5 = b.g
      ? [
          row('Člověk se 70 kg by „vážil“', sig((70 * b.g) / G0) + ' kg'),
          row('Výskok (na Zemi 50 cm)', b.vesc > 3.5 ? dist((0.5 * G0) / b.g / 1000) : 'odletěl bys'),
          row('Pád z 1 metru trvá', nf(Math.sqrt(2 / b.g), 1) + ' s', 'na Zemi 0,45 s'),
          period[i] && isFinite(period[i]) && p === SUN
            ? row('Ve 40 letech by ti tu bylo', sig((40 * 365.25) / period[i]) + ' zdejšího roku')
            : '',
        ]
      : [];
    const s6 = [
      b.disc ? row('Objev', b.disc[0], b.disc[1]) : '',
      b.missions ? row('Sondy', b.missions) : '',
      mo.length
        ? row(
            'Měsíce v modelu',
            mo.length,
            mo
              .slice(0, 40)
              .map((j) => `<a data-sk="${j}">${B[j].cs}</a>`)
              .join(', ')
          )
        : '',
      b.rings ? row('Prstence', 'ano') : '',
      b.atm ? row('Atmosféra', 'ano') : '',
    ];
    const fx = factsOf(b, { moons: undefined, sunAU: au, isSun: i === SUN });
    const s8 = [
      row(
        'Povrch',
        b.mk === 'foto'
          ? 'skutečné snímky ze sond'
          : i === SUN
            ? 'počítaný model (granulace, skvrny, protuberance)'
            : 'ilustrace'
      ),
      row('Podrobná mapa', HI.includes(b.id) ? 'ano, načte se při přiblížení' : 'ne'),
      row(
        'Dráha v modelu',
        {
          jpl: 'elementy JPL + oprava podle efemeridy DE',
          kep: 'Keplerova dráha z elementů',
          sat: 'dráha měsíce se střednými elementy',
          trojan: 'váže se na dráhu planety',
        }[el.kind] || el.kind
      ),
      row('Označení', b.name !== b.cs ? b.name.replace('`', 'ʻ') : null),
      row('Stav k', document.querySelector('#date') ? document.querySelector('#date').textContent : ''),
    ];
    const sz = ballSize(b, 132);
    return (
      `<div class="sk-hd"><canvas class="sk-ball" width="${sz.w}" height="${sz.h}" data-b="${i}" data-d="132"></canvas>` +
      `<div><h3>${b.cs}</h3><p class="sk-sub">${b.type === 'moon' ? 'měsíc tělesa ' + B[p].cs : TYP[b.type] || b.type}${b.name !== b.cs ? ' · ' + b.name.replace('`', 'ʻ') : ''}</p>` +
      `<p class="sk-lead">${b.adult || b.kid || ''}</p>` +
      `<p class="sk-nav">${p >= 0 ? `<a data-sk="${p}">↑ ${B[p].cs}</a>` : ''}${i !== EARTH ? ` <a data-sk="${EARTH}">Země</a>` : ''} <a data-fly="${i}">✈ Letět sem</a></p></div></div>` +
      `<div class="sk-fig"><div><div id="sk-cmp"></div><small>velikost ve stejném měřítku</small></div>` +
      (i !== SUN
        ? `<div><canvas id="sk-orb" width="330" height="130"></canvas><small>tvar dráhy (pohled kolmo na ni), ● poloha teď</small></div>`
        : '') +
      `</div>` +
      sec('📐', 'Rozměry a hmota', s1, true) +
      sec('🛰', 'Dráha', s2, true) +
      sec('📍', 'Právě teď', s4, false) +
      sec('🔄', 'Rotace', s3, false) +
      sec('🧍', 'Jak by ti tam bylo', s5, false) +
      sec('🔭', 'Objev, sondy, měsíce', s6, false) +
      sec('💡', 'Zajímavosti', fx.length ? `<ul>${fx.map((f) => `<li>${f}</li>`).join('')}</ul>` : '', false) +
      sec('🧾', 'Odkud jsou data', s8, false) +
      `<p class="sk-foot">Čísla jsou z katalogu aplikace a z okamžité polohy v modelu. Tuhle kartu otevře pět rychlých kliknutí na těleso, na jeho ikonu dole nebo na název v kartě.</p>`
    );
  }
  // porovnání velikostí ve stejném měřítku: velká tělesa vedle Země, Měsíce nebo Jupiteru (skutečné kotouče z map),
  // malá tělesa (do 400 km) jako pruhy vedle pozemských měřítek
  const SMALL = [
    ['Mount Everest (výška)', 8.85],
    ['Praha napříč', 30],
    ['Praha – Brno', 185],
    ['Česko od západu na východ', 493],
    ['Měsíc', 3474.8],
  ];
  function drawCmp(i) {
    const el = $('#sk-cmp');
    if (!el) return;
    const b = B[i],
      D = b.R * 2;
    if (b.R < 400) {
      const k = SMALL.findIndex((m) => m[1] > D),
        refs = [SMALL[Math.max(0, k - 1)], SMALL[Math.min(SMALL.length - 1, Math.max(1, k))]].filter(
          (m, n, a) => a.indexOf(m) === n
        ),
        rows = [[b.cs, D, 1], ...refs.map((m) => [m[0], m[1], 0])].sort((x, y) => x[1] - y[1]),
        mx = rows[rows.length - 1][1];
      el.innerHTML = rows
        .map(
          (r) =>
            `<div class="sk-bar${r[2] ? ' me' : ''}"><span>${r[0]}</span><i style="width:${Math.max(0.6, (r[1] / mx) * 100).toFixed(1)}%"></i><em>${nf(r[1], r[1] < 100 ? 1 : 0)} km</em></div>`
        )
        .join('');
      return;
    }
    const J = idx.get('jupiter'),
      refs = (b.R > 30000 ? [EARTH, J, SUN] : b.R > 2500 ? [MOON, EARTH, J] : [MOON, EARTH]).filter((j) => j !== i),
      list = [i, ...refs.slice(0, 2)].sort((x, y) => B[x].R - B[y].R),
      big = B[list[list.length - 1]].R;
    el.innerHTML = list
      .map((j) => {
        const dia = Math.round((B[j].R / big) * 84);
        if (dia < 9)
          return `<div class="sk-it${j === i ? ' me' : ''}"><u style="width:${Math.max(2, dia)}px;height:${Math.max(2, dia)}px"></u><span>${B[j].cs}</span></div>`;
        const z = ballSize(B[j], dia);
        return `<div class="sk-it${j === i ? ' me' : ''}"><canvas width="${z.w}" height="${z.h}" data-j="${j}" data-d="${dia}"></canvas><span>${B[j].cs}</span></div>`;
      })
      .join('');
    el.querySelectorAll('canvas').forEach((cv) => {
      const j = +cv.dataset.j,
        dia = +cv.dataset.d;
      drawBall(cv, B[j], j, dia, null);
      loadMap(B[j].id).then((m) => {
        if (m && cv.isConnected) drawBall(cv, B[j], j, dia, m);
      });
    });
  }
  // náčrt dráhy: elipsa podle výstřednosti, mateřské těleso v ohnisku, poloha teď podle okamžité vzdálenosti
  function drawOrb(i) {
    const cv = $('#sk-orb');
    if (!cv) return;
    const x = cv.getContext('2d'),
      W = cv.width,
      H = cv.height,
      el = elems(i),
      p = par[i],
      r = d3(i, p);
    x.clearRect(0, 0, W, H);
    x.font = '11px system-ui, sans-serif';
    x.fillStyle = '#aab6cc';
    if (el.e === null || !el.a || el.kind === 'trojan') {
      x.textAlign = 'center';
      x.fillText('dráha se váže na jiné těleso', W / 2, H / 2);
      return;
    }
    const e = Math.min(el.e, 0.985),
      open = el.e >= 1,
      a = open ? r * 1.2 : el.a,
      b = a * Math.sqrt(1 - e * e),
      k = Math.min((W - 40) / (2 * a), (H - 30) / (2 * b)),
      cx = W / 2,
      cy = H / 2 - 4,
      fx = cx - a * e * k; /* ohnisko vlevo od středu, přísluní vlevo */
    x.strokeStyle = 'rgba(160,185,235,0.75)';
    x.lineWidth = 1.3;
    x.beginPath();
    if (open) x.ellipse(cx, cy, a * k, b * k, 0, Math.PI * 0.45, Math.PI * 1.55);
    else x.ellipse(cx, cy, a * k, b * k, 0, 0, 7);
    x.stroke();
    x.fillStyle = p === SUN ? '#ffd27a' : '#cfd8ea';
    x.beginPath();
    x.arc(fx, cy, 4, 0, 7);
    x.fill();
    /* poloha teď: z r = a(1−e²)/(1+e·cos ν); stranu (před nebo za přísluním) model neurčuje – kreslím horní polovinu */
    if (!open && el.e > 1e-4) {
      const c = Math.max(-1, Math.min(1, ((el.a * (1 - el.e * el.e)) / r - 1) / el.e)),
        nu = Math.acos(c),
        X = fx - r * Math.cos(nu) * k * (e / el.e || 1),
        Y = cy - r * Math.sin(nu) * k * (e / el.e || 1);
      x.fillStyle = '#ffc857';
      x.beginPath();
      x.arc(Math.max(6, Math.min(W - 6, X)), Math.max(6, Math.min(H - 20, Y)), 3.5, 0, 7);
      x.fill();
    }
    x.fillStyle = '#aab6cc';
    x.textAlign = 'left';
    x.fillText(B[p].cs, Math.min(W - 60, fx + 7), cy + 14);
    x.textAlign = 'center';
    x.fillText(open ? 'otevřená dráha' : `výstřednost ${nf(el.e, 3)}`, W / 2, H - 4);
  }
  function open(i) {
    if (!S.F.on('superkarta')) return false;
    cur = i;
    box.innerHTML = html(i);
    const cv = box.querySelector('.sk-ball');
    if (cv) {
      drawBall(cv, B[i], i, 132, null);
      loadMap(B[i].id).then((m) => {
        if (m && cv.isConnected) drawBall(cv, B[i], i, 132, m);
      });
    }
    drawCmp(i);
    drawOrb(i);
    box.parentElement.scrollTop = 0;
    ui.toggle('#sk', true);
    return true;
  }
  $('#sk').addEventListener('click', (ev) => {
    const a = ev.target.closest('[data-sk]'),
      f = ev.target.closest('[data-fly]');
    if (a) open(+a.dataset.sk);
    if (f) {
      ui.toggle('#sk', false);
      S.flyTo(+f.dataset.fly);
    }
  });
  /* spouštěč: pět rychlých kliknutí (do 0,6 s po sobě) na těleso ve scéně, na jeho ikonu v liště nebo na název v kartě */
  let n = 0,
    t = 0,
    last = -1;
  const hit = (i) => {
    const now = performance.now();
    n = now - t < 600 && i === last ? n + 1 : 1;
    t = now;
    last = i;
    if (n >= 5) {
      n = 0;
      if (open(i)) A.play('egg');
    }
  };
  $('#card').addEventListener('click', (ev) => {
    if (ev.target.closest('h2') || ev.target.closest('.ball')) hit(S.sel);
  });
  for (const id of ['#dock', '#sub'])
    $(id).addEventListener('click', (ev) => {
      const b = ev.target.closest('.it[data-i]');
      if (b) hit(+b.dataset.i);
    });
  S.bus.on('tap', hit);
  S.F.onChange(() => {
    if (!S.F.on('superkarta') && $('#sk').classList.contains('on')) ui.toggle('#sk', false);
  });
  return { open, cur: () => cur, html };
}
