// Pohled z povrchu (verze 1.10, vzor: „Telescope mode“ v NASA Eyes).
// Kamera stojí na povrchu tělesa a dívá se na oblohu; kolečko mění zorné pole (dalekohled), tah otáčí pohledem.
// Kameru počítá engine (S.surf, S.setSurf); tady je zem a obzor ve 2D vrstvě, denní obloha, ovládací proužek a hledání těles.
// Zjednodušení, která uživatel vidí v nápovědě: zem je rovná plocha bez krajiny, lom světla ve vzduchu se nepočítá,
// denní obloha je ilustrace (barva podle výšky Slunce), u těles bez pevného povrchu stojíme na horní vrstvě oblak.
import { B, idx, par, kids, P, SUN, EARTH, MOON, AU, period } from '../core/sim.js';
import { createPovrchInfo } from './povrch_info.js';
import { createPristani } from './pristani.js';
import { zajimavosti } from '../data/zajimavosti.js';
import { slozeniOf } from '../data/slozeni.js';
import { AIR } from '../data/mista.js';
const DEG = Math.PI / 180,
  RS = 696000;
/* tělesa, kde by ze skutečného povrchu obloha vidět nebyla nebo povrch není */
const NOTE = {
  venus:
    'Venuše je celá pod hustou oblačností: ze skutečného povrchu není vidět Slunce ani hvězdy, jen oranžové šero. Tlačítko „☁ Nad oblaka“ tě vynese nad oblačnost.',
  titan:
    'Titan halí oranžový opar: ze skutečného povrchu není vidět Saturn ani hvězdy, Slunce je jen světlejší skvrna. Tlačítko „☁ Nad oblaka“ tě vynese nad opar.',
  jupiter: 'Jupiter nemá pevný povrch. Stojíš na horní vrstvě oblak.',
  saturn: 'Saturn nemá pevný povrch. Stojíš na horní vrstvě oblak.',
  uranus: 'Uran nemá pevný povrch. Stojíš na horní vrstvě oblak.',
  neptune: 'Neptun nemá pevný povrch. Stojíš na horní vrstvě oblak.',
};
const WIND = ['S', 'SV', 'V', 'JV', 'J', 'JZ', 'Z', 'SZ'];
export function createPovrch(S, A, ui) {
  const $ = (s) => document.querySelector(s),
    bar = $('#surf'),
    air = $('#skyair'),
    kid = () => document.body.classList.contains('kid'),
    num = (v, d = 0) => v.toLocaleString('cs-CZ', { maximumFractionDigits: d, minimumFractionDigits: d });
  let adjust = null /* krajina: posun místa přistání (z oceánu na pevninu) */,
    info = null,
    txtT = 0,
    lastAir = '',
    day = 0; /* jak moc je den (0–1), pro barvu země */
  const place = (q) => {
    const la = Math.abs(q.lat),
      lo = Math.abs(((q.lon + 540) % 360) - 180);
    return `${num(la, 1)}° ${q.lat >= 0 ? 's.' : 'j.'} š., ${num(lo, 1)}° ${((q.lon + 540) % 360) - 180 >= 0 ? 'v.' : 'z.'} d.`;
  };
  const wind = (az) => WIND[Math.round(((((az / DEG) % 360) + 360) % 360) / 45) % 8];
  /* část kotouče Slunce zakrytá tělesem j při pohledu z místa pozorovatele (plocha, 0–1) */
  function cover(j) {
    const C = S.camPos,
      sx = P[SUN * 3] - C[0],
      sy = P[SUN * 3 + 1] - C[1],
      sz = P[SUN * 3 + 2] - C[2],
      mx = P[j * 3] - C[0],
      my = P[j * 3 + 1] - C[1],
      mz = P[j * 3 + 2] - C[2],
      ds = Math.hypot(sx, sy, sz),
      dm = Math.hypot(mx, my, mz);
    if (dm > ds) return 0;
    const r1 = Math.asin(Math.min(1, RS / ds)),
      r2 = Math.asin(Math.min(1, B[j].R / dm)),
      d = Math.acos(Math.max(-1, Math.min(1, (sx * mx + sy * my + sz * mz) / (ds * dm))));
    if (d >= r1 + r2) return 0;
    if (d <= Math.abs(r2 - r1)) return r2 >= r1 ? 1 : (r2 * r2) / (r1 * r1);
    const a = Math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1)),
      b = Math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2));
    return (r1 * r1 * (a - Math.sin(2 * a) / 2) + r2 * r2 * (b - Math.sin(2 * b) / 2)) / (Math.PI * r1 * r1);
  }
  const sst = (a, b, x) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  /* tělesa, která stojí za to na obloze hledat: Slunce, mateřské těleso, měsíce, Země, planety */
  function targets(i) {
    const o = [SUN],
      add = (j) => j >= 0 && j !== i && !o.includes(j) && o.push(j);
    let p = par[i];
    while (p >= 0 && p !== SUN) {
      add(p);
      p = par[p];
    }
    [...kids[i]]
      .filter((j) => B[j].type === 'moon')
      .sort((a, b) => B[b].R - B[a].R)
      .slice(0, 5)
      .forEach(add);
    if (par[i] >= 0 && par[i] !== SUN)
      [...kids[par[i]]]
        .filter((j) => B[j].type === 'moon')
        .sort((a, b) => B[b].R - B[a].R)
        .slice(0, 4)
        .forEach(add);
    add(EARTH);
    if (i !== MOON) add(MOON);
    for (const id of ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) add(idx.get(id));
    return o;
  }
  function fillFind() {
    const q = S.surf,
      sel = bar.querySelector('select');
    if (!q || !sel) return;
    sel.innerHTML =
      '<option value="">🔎 Najít na obloze…</option>' +
      targets(q.i)
        .map((j) => {
          const d = S.surfDir(j);
          return `<option value="${j}">${B[j].cs} – ${d.el > 0 ? Math.round(d.el / DEG) + '° nad obzorem' : 'pod obzorem'}</option>`;
        })
        .join('');
  }
  const touch = () => document.body.classList.contains('touch');
  let lastSfb = -1;
  function draw() {
    const q = S.surf;
    document.body.classList.toggle('surfon', !!q);
    document.body.classList.toggle('surfq', !!(q && q.quiet));
    bar.classList.toggle('on', !!q);
    if (!q) {
      air.style.display = 'none';
      lastAir = '';
      return;
    }
    const b = B[q.i],
      hasAir = !!AIR[b.id];
    bar.innerHTML =
      `<div class="sf-h"><b>🔭 <span class="sf-t">${kid() ? 'Stojíš tady:' : 'Pohled z povrchu:'}</span> ${b.cs}</b> <span class="sf-pl">${place(q)}</span>` +
      `<button class="sf-x" data-s="exit" title="Vzlétnout zpět na oběžnou dráhu (Esc, nebo kolečkem ven při nejširším poli)">🚀 Vzlétnout</button></div>` +
      `<div class="sf-r"><span class="sf-dir"></span><span class="sf-sun"></span></div>` +
      `<div class="sf-b"><select aria-label="Najít těleso na obloze"></select>` +
      `<button data-s="out" title="Širší zorné pole (kolečko myši)">−</button><span class="sf-fov"></span><button data-s="in" title="Užší zorné pole – dalekohled (kolečko myši)">+</button>` +
      (hasAir
        ? AIR[b.id].opaque
          ? `<button data-s="air" class="${q.air ? '' : 'sel'}" title="${q.air ? 'Vystoupat nad oblačnost: odtud je vidět Slunce i hvězdy' : 'Zpátky na skutečný povrch pod oblaky'}">${q.air ? '☁ Nad oblaka' : '🌫 Pod oblaky'}</button>`
          : `<button data-s="air" class="${q.air ? 'sel' : ''}" title="Denní obloha: se vzduchem přes den hvězdy nevidíš">🌫 Vzduch</button>`
        : '') +
      `<button data-s="grid" class="${info && info.gridOn() ? 'sel' : ''}" title="Mřížka na obloze: azimut a výška ve stupních (G)">⌗ Mřížka</button>` +
      `<button data-s="info" class="${info && info.open() ? 'sel' : ''}" title="Obloha odsud: místo a čas, tělesa a hvězdy nad obzorem, osa a otáčení, barva oblohy, vodítka">📋 Obloha</button>` +
      (b.id === 'earth' ? `<button data-s="praha" title="Postavit se do Prahy">📍 Praha</button>` : '') +
      `</div>`;
    fillFind();
    tick(true);
  }
  function tick(force) {
    const q = S.surf;
    if (!q) return;
    const now = performance.now();
    if (!force && now - txtT < 220) return;
    txtT = now;
    const d = bar.querySelector('.sf-dir'),
      s = bar.querySelector('.sf-sun'),
      f = bar.querySelector('.sf-fov'),
      sd = S.surfDir(SUN),
      fov = S.fov(),
      t1 = `${q.track >= 0 ? 'sleduji: ' + B[q.track].cs + ' · ' : ''}směr ${wind(q.az)} · ${Math.abs(Math.round(q.el / DEG))}° ${q.el >= 0 ? 'nad obzorem' : 'pod obzorem'}`,
      se = sd.el / DEG,
      t2 = `☀ ${se > 0.3 ? 'Slunce ' + Math.round(se) + '° nad obzorem' : se > -6 ? 'Slunce na obzoru – soumrak' : 'noc, Slunce pod obzorem'}`,
      t3 = fov >= 10 ? Math.round(fov) + '°' : num(fov, 1) + '°';
    if (d && d.textContent !== t1) d.textContent = t1;
    if (s && s.textContent !== t2) s.textContent = t2;
    if (f && f.textContent !== t3) f.textContent = t3;
    /* hlášky se řadí pod lištu, ať ji na žádném rozložení nepřekryjí (lišta mění výšku podle zalomení textu) */
    const sfb = bar.offsetTop + bar.offsetHeight + 8;
    if (sfb !== lastSfb) document.body.style.setProperty('--sfb', (lastSfb = sfb) + 'px');
  }
  /* kde přistát: místo, nad kterým kamera právě stojí; pohled k Slunci (nebo k mateřskému tělesu), obzor zůstává v obraze */
  function enter(i, lat, lon, opt = {}) {
    if (i === SUN) return ui.toast('Na Slunci stát nejde – nemá pevný povrch a má 5 500 °C.');
    if (S.focus !== i || S.surf) S.jump(i);
    if (lat === undefined) [lat, lon] = S.subPoint(i);
    const op = AIR[B[i].id] && AIR[B[i].id].opaque;
    S.setSurf({
      i,
      lat,
      lon,
      fov: opt.fov || 68,
      el: 24 * DEG,
      track: -1,
      air:
        opt.air === undefined ? true : opt.air /* 2.2: i Venuše a Titan napřed skutečný povrch pod oblaky (Ondřej) */,
      quiet: !!opt.quiet,
      lt: opt.lt,
    });
    const q = S.surf,
      order = [SUN, par[i] !== SUN ? par[i] : -1, i === EARTH ? MOON : EARTH].filter((j) => j >= 0 && j !== i);
    let best = null;
    for (const j of order) {
      const d = S.surfDir(j);
      if (d.el > 2 * DEG) {
        best = d;
        break;
      }
    }
    /* 2.3: po přistání musí být vidět kus země kvůli orientaci – obzor asi v třetině výšky obrazu, i když je cíl vysoko
       (Venuše: dřív pohled 24° nad obzor do oranžového oparu) */
    const elMax = 0.15 * q.fov * DEG;
    if (opt.track !== undefined && opt.track >= 0) q.track = opt.track;
    else if (best && !op) {
      q.az = best.az;
      q.el = Math.max(-4 * DEG, Math.min(elMax, best.el - 8 * DEG));
    } else {
      q.az = best ? best.az : Math.PI;
      q.el = 2 * DEG;
    }
    /* přesně zadaný směr pohledu (referenční snímky, zkoušky): azimut od severu k východu a výška ve stupních */
    if (opt.az !== undefined) q.az = opt.az * DEG;
    if (opt.el !== undefined) q.el = opt.el * DEG;
    /* 2.3: plynulé sklouznutí z výšky do pohledu z očí: kamera začne nad místem s pohledem dolů, klesá (logaritmicky)
       a teprve na konci zvedne pohled k obzoru; přechod z oběžné dráhy zakryje krátký závoj (opar, nebo tma bez vzduchu) */
    if (opt.landed && !opt.quiet) {
      const h0 = Math.max(60, Math.min(25000, B[i].R * 1000 * 0.008));
      q.desc = { t0: performance.now(), h0, el0: -84 * DEG, elT: q.el, fov0: 50, fovT: q.fov };
      q.el = q.desc.el0;
      q.fov = q.fovNow = 50;
      q.hOff = h0;
      veil(i);
    }
    A.play('panel_open');
    draw();
    /* 2.2: po dosednutí uklidit okna (karta tělesa a minimapa se v pohledu z povrchu skryjí stylem body.surfon) */
    if (!opt.quiet) S.bus.emit('fly', i);
    if (!opt.quiet) setTimeout(() => facts(i), 700);
    if (!opt.quiet) {
      const b = B[i],
        walk = !touch() && !/^(jupiter|saturn|uranus|neptune)$/.test(b.id);
      ui.toast(
        kid()
          ? `Stojíš na tělese ${b.cs}! Tahej a rozhlížej se. ${touch() ? 'Dvěma prsty' : 'Kolečkem'} si oblohu přiblížíš jako dalekohledem.${walk ? ' Projít se můžeš klávesami W A S D.' : ''}`
          : `Stojíš na povrchu (${b.cs}, ${place(q)}). Tahem se rozhlížíš, ${touch() ? 'dvěma prsty' : 'kolečkem'} měníš zorné pole jako dalekohledem.${walk ? ' Procházka: W A S D, Shift běh, mezerník skok.' : ''} Zpátky do vesmíru: 🚀 Vzlétnout, Esc nebo ${touch() ? 'roztažením prstů' : 'kolečkem'} ven.`,
        7000
      );
    }
    S.wake();
  }
  /* 2.3: sestup do pohledu z očí (3,4 s) */
  const VD = 3.4;
  S.ticks.push(() => {
    const q = S.surf;
    if (!q || !q.desc) return;
    const d = q.desc,
      t = (performance.now() - d.t0) / 1000 / VD;
    if (t >= 1) {
      q.desc = null;
      q.hOff = 0;
      q.el = d.elT;
      q.fov = d.fovT;
      return S.wake();
    }
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
      l0 = Math.log(d.h0 + 1.7),
      l1 = Math.log(1.7),
      u = Math.max(0, Math.min(1, (t - 0.42) / 0.58)),
      ue = u * u * (3 - 2 * u);
    q.hOff = Math.exp(l0 + (l1 - l0) * e) - 1.7;
    q.el = d.el0 + (d.elT - d.el0) * ue;
    q.fov = d.fov0 + (d.fovT - d.fov0) * ue;
    S.wake();
  });
  const vl = document.createElement('div');
  vl.id = 'veil';
  document.body.appendChild(vl);
  function veil(i) {
    const id = B[i].id,
      c =
        AIR[id] && AIR[id].opaque
          ? 'rgb(230,170,90)'
          : /^(mars)$/.test(id)
            ? 'rgb(200,150,110)'
            : id === 'earth'
              ? 'rgb(235,240,248)'
              : /^(titan)$/.test(id)
                ? 'rgb(210,150,70)'
                : 'rgb(0,0,0)';
    vl.style.background = c;
    vl.classList.remove('on');
    void vl.offsetWidth;
    vl.classList.add('on');
  }
  /* 2.3: zajímavosti po přistání – panel pod lištou pohledu z povrchu, sám zmizí po 18 s (✕ dřív) */
  const fp = document.createElement('div');
  fp.id = 'landfacts';
  fp.className = 'panel';
  document.body.appendChild(fp);
  let fpT = 0;
  fp.addEventListener('click', (e) => {
    if (e.target.closest('[data-x]')) fp.classList.remove('on');
  });
  S.bus.on('surf', (q) => {
    if (!q) fp.classList.remove('on');
  });
  const angOf = (j) => {
    const r = S.R[j];
    return r && r.dist > 0 ? (2 * Math.asin(Math.min(1, B[j].R / r.dist))) / DEG : 0;
  };
  function factsCtx(i) {
    const b = B[i],
      q = S.surf,
      st = S.krajina ? S.krajina.state() : {},
      sd = S.surfDir(SUN),
      dS = S.R[SUN].dist,
      c = {
        id: b.id,
        cs: b.cs,
        kid: kid(),
        g: b.g || 0,
        vesc: b.vesc || 0,
        atm: slozeniOf(b).atm,
        sunDeg: angOf(SUN),
        sunE: (AU / dS) ** 2,
        sunEl: sd ? sd.el / DEG : 0,
        opaque: !!(AIR[b.id] && AIR[b.id].opaque && q.air),
        deck: /^(jupiter|saturn|uranus|neptune)$/.test(b.id),
        small: b.R < 50,
        lat: q.lat,
        relH: st.relH || 0,
      };
    const sync = (j) => b.rot && Math.abs(Math.abs(b.rot) / 24 - period[j]) < 0.03 * period[j];
    if (i === MOON) {
      const d = S.surfDir(EARTH);
      c.earth = { el: d.el / DEG, deg: angOf(EARTH) };
    } else if (par[i] !== SUN && par[i] >= 0) {
      const pj = par[i],
        d = S.surfDir(pj);
      c.parent = { cs: B[pj].cs, deg: angOf(pj), el: d.el / DEG, sync: sync(i) };
    }
    const cand = [...kids[i], ...(par[i] !== SUN && par[i] >= 0 ? kids[par[i]] : [])].filter((j) => j !== i);
    c.moons = cand
      .map((j) => ({ j, cs: B[j].cs, deg: angOf(j), el: S.surfDir(j).el / DEG }))
      .filter((m) => m.el > 2 && m.deg > 1 / 60)
      .sort((a, b2) => b2.deg - a.deg);
    if (b.id === 'earth') {
      const la = q.lat * DEG,
        lo = q.lon * DEG,
        pla = 80.79 * DEG,
        plo = -72.76 * DEG;
      c.geomag = Math.asin(Math.sin(la) * Math.sin(pla) + Math.cos(la) * Math.cos(pla) * Math.cos(lo - plo)) / DEG;
    }
    return c;
  }
  function facts(i, n = 0) {
    if (!S.surf || S.surf.i !== i) return;
    /* počkat, až je krajina postavená (výška nad okolím z výškové mapy) */
    const k = S.krajina && S.krajina.on() ? S.krajina.state().key || '' : 'x';
    if (k !== 'x' && !k.startsWith(`${i}|${S.surf.lat.toFixed(5)}|`) && n < 8)
      return setTimeout(() => facts(i, n + 1), 400);
    const z = zajimavosti(factsCtx(i));
    fp.innerHTML =
      `<button data-x title="Zavřít">✕</button><div class="lf-h">🛸 ${kid() ? `Jsi na tělese ${B[i].cs}!` : `${B[i].cs}: co je tu jinak`}</div>` +
      z.top.map((t) => `<p>${t}</p>`).join('') +
      `<p class="lf-d">${z.data}</p>`;
    fp.classList.add('on');
    clearTimeout(fpT);
    fpT = setTimeout(() => fp.classList.remove('on'), 18000);
  }
  function exit() {
    if (!S.surf) return;
    S.setSurf(null);
    A.play('launch');
    ui.toast(kid() ? '🚀 Startujeme zpátky do vesmíru!' : '🚀 Vzlet – stoupáš zpátky na oběžnou dráhu.', 2600);
  }
  /* 2.2: přisvětlení (☀) na povrchu řídí jas krajiny; po vzletu (tlačítkem, Esc i kolečkem) se vrátí, jak bylo před přistáním */
  let gam0 = null;
  S.bus.on('surf', (q) => {
    if (q && gam0 === null) gam0 = S.gamma;
    else if (!q && gam0 !== null) {
      if (S.gamma !== gam0) {
        S.setGamma(gam0);
        const g = document.querySelector('#gam');
        if (g) g.value = gam0;
      }
      gam0 = null;
    }
    draw();
  });
  bar.addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-s]'),
      q = S.surf;
    if (!b || !q) return;
    const a = b.dataset.s;
    if (a === 'exit') exit();
    else if (a === 'in') S.zoom(1 / 1.7);
    else if (a === 'out') S.zoom(1.7);
    else if (a === 'air') {
      q.air = !q.air;
      A.play('a_tick');
      draw();
    } else if (a === 'grid') {
      info.grid();
      A.play('a_tick');
      draw();
    } else if (a === 'info') {
      info.toggle();
      A.play('a_tick');
      draw();
    } else if (a === 'praha') {
      q.lat = 50.09;
      q.lon = 14.42;
      A.play('a_tick');
      draw();
    }
    S.wake();
  });
  bar.addEventListener('pointerdown', (ev) => {
    if (ev.target.closest('select')) fillFind();
  });
  bar.addEventListener('change', (ev) => {
    const q = S.surf;
    if (!q || ev.target.tagName !== 'SELECT' || ev.target.value === '') return;
    const j = +ev.target.value,
      d = S.surfDir(j);
    q.track = j;
    q.ox = q.oy = 0;
    if (q.fov > 50) q.fov = 50;
    ev.target.value = '';
    ev.target.blur();
    A.play('a_tick');
    if (d.el < 0)
      ui.toast(`${B[j].cs} je teď pod obzorem. Zrychli čas (⏩) a počkej, až vyjde – pohled ho bude sledovat.`, 5200);
    tick(true);
    S.wake();
  });
  window.addEventListener(
    'keydown',
    (ev) => {
      if (ev.key !== 'Escape' || !S.surf) return;
      if (document.querySelector('.pop.on, #help.on, #list.on, #gamebox.on, #ukc.on:not(.min)')) return;
      if (document.body.classList.contains('cine') || (ui.tut && ui.tut.running())) return;
      exit();
    },
    true
  );
  S.ticks.push(() => tick(false));
  /* zem a obzor: první ve 2D vrstvě, aby zakryla všechno, co je pod obzorem */
  S.overlays.unshift((ctx, e) => {
    const q = S.surf;
    if (!q) return;
    const { W, H, F, fwd, right, up } = e,
      { n, e: ea, no } = S.surfBasis(),
      b = B[q.i],
      fn = fwd.dot(n),
      un = Math.max(1e-3, up.dot(n)),
      yh = H / 2 + (F * fn) / un /* obzor je na obraze vodorovná přímka (kamera se nenaklání) */,
      tk = S.txtK || 1,
      sd = S.surfDir(SUN),
      se = sd.el / DEG,
      a = AIR[b.id];
    /* den a noc: podle výšky Slunce; při zatmění Slunce (Měsíc před Sluncem) se obloha i krajina setmí */
    let dim = 1;
    if (q.i === EARTH) dim = Math.pow(1 - Math.min(1, cover(MOON)), 0.4);
    day = sst(-9, 4, se) * dim;
    const opq = !!(a && a.opaque && q.air);
    const sky = opq ? 1 : a && q.air ? sst(a.tw0 || -13, 1, se) * dim * a.k : 0;
    /* 2.2: krajinu a oblohu kreslí render/krajina.js (3D); tady zbudou jen světové strany na obzoru */
    const kr = S.krajina && S.krajina.on();
    if (!kr) S.skyDim = sky;
    if (kr) {
      if (lastAir) {
        lastAir = '';
        air.style.display = 'none';
      }
    } else if (opq && yh > 0) {
      /* pod oblaky Venuše a v oparu Titanu: rovnoměrná zatažená obloha zakryje všechno nad obzorem */
      const dl = 0.06 + 0.94 * sst(-8, 6, se),
        g = ctx.createLinearGradient(0, 0, 0, Math.min(H, yh)),
        c = (v) => `rgb(${v.map((x) => Math.round(x * dl))})`;
      g.addColorStop(0, c(a.z));
      g.addColorStop(1, c(a.h));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, Math.min(H, yh));
      if (lastAir) {
        lastAir = '';
        air.style.display = 'none';
      }
    } else if (sky > 0.004 && yh > 0) {
      const tw = Math.max(0, 1 - Math.abs(se + 1.5) / 9) * 0.85,
        mix = (c1, c2, t) => c1.map((v, k) => Math.round((v + (c2[k] - v) * t) * sky)),
        cz = a.z.map((v) => Math.round(v * sky)),
        ch = mix(a.h, a.tw, tw),
        key = `${Math.round(yh)}|${cz}|${ch}`;
      if (key !== lastAir) {
        lastAir = key;
        air.style.display = 'block';
        air.style.height = Math.max(0, Math.min(H, yh)) + 'px';
        air.style.background = `linear-gradient(to top, rgb(${ch}) 0, rgb(${mix(a.h, a.z, 0.55)}) ${Math.round(Math.min(100, ((F * 0.36) / Math.max(40, yh)) * 100))}%, rgb(${cz}) 100%)`;
      }
    } else if (lastAir) {
      lastAir = '';
      air.style.display = 'none';
    }
    if (yh < H && !kr) {
      const col = b.col || [0.5, 0.5, 0.5],
        lit = 0.1 + 0.3 * day,
        c = (k) => col.map((v) => Math.round(255 * Math.min(1, (0.25 + 0.75 * v) * k))),
        y0 = Math.max(0, yh),
        g = ctx.createLinearGradient(0, y0, 0, Math.max(y0 + 1, H));
      g.addColorStop(0, `rgb(${c(lit * 1.35)})`);
      g.addColorStop(0.25, `rgb(${c(lit)})`);
      g.addColorStop(1, `rgb(${c(lit * 0.45)})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, y0, W, H - y0);
    }
    if (yh < H) {
      const col = b.col || [0.5, 0.5, 0.5],
        c = (k) => col.map((v) => Math.round(255 * Math.min(1, (0.25 + 0.75 * v) * k)));
      if (yh >= 0) {
        if (!kr) {
          ctx.strokeStyle = `rgba(${c(0.55 + 0.4 * day)},0.9)`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(0, yh);
          ctx.lineTo(W, yh);
          ctx.stroke();
        }
        /* světové strany na obzoru */
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        for (let k = 0; k < 16; k++) {
          const az = (k * Math.PI) / 8,
            hx = Math.sin(az) * ea.x + Math.cos(az) * no.x,
            hy = Math.sin(az) * ea.y + Math.cos(az) * no.y,
            hz = Math.sin(az) * ea.z + Math.cos(az) * no.z,
            zz = hx * fwd.x + hy * fwd.y + hz * fwd.z;
          if (zz < 0.12) continue;
          const x = W / 2 + ((hx * right.x + hy * right.y + hz * right.z) / zz) * F;
          if (x < 12 || x > W - 12) continue;
          const main = k % 4 === 0,
            half = k % 2 === 0;
          ctx.strokeStyle = 'rgba(255,255,255,0.75)';
          ctx.lineWidth = main ? 1.6 : 1;
          ctx.beginPath();
          ctx.moveTo(x, yh);
          ctx.lineTo(x, yh + (main ? 9 : half ? 6 : 3));
          ctx.stroke();
          if (!half) continue;
          ctx.font = `${main ? 700 : 500} ${(main ? 14 : 11.5) * tk}px system-ui, -apple-system, Segoe UI, sans-serif`;
          ctx.lineWidth = 3;
          ctx.strokeStyle = 'rgba(0,0,0,0.7)';
          ctx.strokeText(WIND[k / 2], x, yh + 11);
          ctx.fillStyle = main ? '#ffe7ad' : 'rgba(230,236,250,0.9)';
          ctx.fillText(WIND[k / 2], x, yh + 11);
        }
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
      }
    }
  });
  info = createPovrchInfo(S, A, ui, { targets, place, wind, kid, draw: () => draw(), enter, exit, cover });
  const pick = createPristani(S, A, ui, {
    enter,
    exit,
    info,
    /* krajina umí přistání posunout z moře na pevninu (render/krajina.js) */
    adjust: (i, la, lo) => (adjust ? adjust(i, la, lo) : S.krajina ? S.krajina.adjust(i, la, lo) : null),
  });
  /* 2.2: kolečkem ven při nejširším zorném poli = vzlet (uživatel chce zpátky do vesmíru) */
  S.bus.on('surfOut', () => {
    A.play('launch');
    ui.toast(
      kid()
        ? '🚀 Odlétáme zpátky do vesmíru!'
        : '🚀 Vzlet – kolečkem ven při nejširším zorném poli se vracíš do vesmíru.',
      3500
    );
  });
  return {
    enter,
    exit,
    pick: (i = S.sel) => {
      /* mapu a výškovou mapu tělesa načíst už během míření (posun z moře potřebuje mapu) */
      if (S.krajina) S.krajina.prep(i);
      return pick.start(i);
    },
    pickState: () => pick.state(),
    land: () => pick.land(),
    landAt: (i, x, y) => pick.landAt(i, x, y),
    pickClick: (x, y) => pick.pickClick(x, y),
    aimAt: (i, la, lo) => pick.aimAt(i, la, lo),
    setAdjust: (f) => (adjust = f),
    toggle: (i = S.sel) => {
      if (S.surf) return exit();
      if (S.krajina) S.krajina.prep(i);
      return pick.start(i);
    },
    on: () => !!S.surf,
    state: () =>
      S.surf
        ? {
            id: B[S.surf.i].id,
            lat: S.surf.lat,
            lon: S.surf.lon,
            az: S.surf.az,
            el: S.surf.el,
            fov: S.fov(),
            track: S.surf.track >= 0 ? B[S.surf.track].id : null,
            air: S.surf.air,
            sky: S.skyDim,
            day,
            lt: S.ltOn,
          }
        : null,
    cover,
    AU,
    info,
    facts: () => (S.surf ? zajimavosti(factsCtx(S.surf.i)) : null),
    targets,
    draw,
  };
}
