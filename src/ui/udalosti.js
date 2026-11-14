// Úkazy na obloze (verze 1.3): seznam událostí, karta události, kamera nad místo úkazu a návrat do původního pohledu.
// Zatmění Slunce: obrys stínu a jeho dráha po Zemi ve 2D vrstvě (stejně na počítači i telefonu) a okénko „pohled z místa“
// se Sluncem a Měsícem. Data: src/data/udalosti.json (jd je světový čas; datum na kartě gregoriánské jako v aplikaci).
import U from '../data/udalosti.json';
import { idx, basis, updateAll, P, SUN, MOON, EARTH } from '../core/sim.js';
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
    warned = false /* upozornění na přisvětlení už zaznělo */,
    track = [] /* dráha osy stínu po Zemi: jednotkové vektory v soustavě Země */,
    skyT = 0;
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
  function shadow() {
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
  function buildTrack(e) {
    track = [];
    if (e.typ !== 'slunce') return;
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
    if (!c || !cur || cur.typ !== 'slunce') return;
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
      };
    /* přisvětlení by stín přesvítilo: po dobu ukázky je vypnuté, při návratu se vrátí */
    if (S.gamma > 0.01) {
      S.setGamma(0);
      ui.toast('Přisvětlení jsem na dobu ukázky vypnula, jinak by stín nebyl vidět. Po návratu ho zase zapnu.', 5200);
    }
    S.paused = true;
    setTime(e.jd);
    buildTrack(e);
    if (from != null) setTime(from);
    S.jump(idx.get(e.telo));
    S.cam.alt = S.cam.altT = altOf(e);
    aim(e);
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
    back = null;
    warned = false;
    track = [];
    ui.refresh();
    S.wake();
    draw();
  }
  function go(d) {
    if (!cur) return;
    const k = (U.indexOf(cur) + d + U.length) % U.length;
    cur = U[k];
    play = 0;
    A.play('a_tick');
    if (back) show(cur);
    else draw();
  }
  function open(id, andShow) {
    cur = U.find((e) => e.id === id) || null;
    draw();
    if (cur && andShow) show(cur);
  }
  function draw() {
    const e = cur;
    card.classList.toggle('on', !!e);
    document.body.classList.toggle('ukon', !!e);
    if (!e) return;
    const k = U.indexOf(e),
      body = kid() ? `<p>${e.deti}</p>` : `<p>${e.text}</p><p class="uk-per">💡 ${e.perlicka}</p>`,
      src = kid()
        ? ''
        : `<details><summary>Model × prameny</summary><p>${e.shoda}</p><p><small>${e.pramen}</small></p></details>`,
      small = cls('mob'),
      px = small ? 84 : 120,
      d = Math.min(window.devicePixelRatio || 1, 2);
    card.innerHTML =
      `<button class="x" data-u="close" title="Zavřít kartu" aria-label="Zavřít kartu">×</button>` +
      `<div class="uk-nav"><button data-u="prev" aria-label="Předchozí úkaz">‹</button><span>${k + 1} / ${U.length}</span><button data-u="next" aria-label="Další úkaz">›</button></div>` +
      `<h3>${e.ikona} ${e.nazev}</h3><p class="uk-sub">${e.podtitul}</p>` +
      `<p class="uk-when"><b>${e.datum}</b> · ${e.misto}<br><small>${e.cas}${e.datumJul ? `<br>podle tehdejšího juliánského kalendáře ${e.datumJul}` : ''}</small></p>` +
      (e.typ === 'slunce'
        ? `<div class="uk-skyrow"><canvas class="uk-sky" width="${px * d}" height="${px * d}" style="width:${px}px;height:${px}px"></canvas><div class="uk-skytxt"></div></div>`
        : '') +
      `<div class="uk-btn"><button class="pri" data-u="show">🎬 Ukázat</button><button data-u="play">▶ Přehrát</button>` +
      `<button data-u="back"${back ? '' : ' disabled'}>⟲ Zpět</button></div>` +
      (back && e.typ === 'slunce'
        ? `<p class="uk-leg"><i class="l1"></i> stín Měsíce <i class="l2"></i> jeho dráha <i class="l3"></i> polostín (částečné zatmění)</p>`
        : '') +
      (small ? `<details class="uk-more"><summary>Příběh</summary>${body}${src}</details>` : body + src);
    drawSky();
  }
  list.innerHTML =
    U.map(
      (e, k) =>
        `<button data-k="${k}">${e.ikona} <b>${e.datum}</b> – ${e.nazev}<br><small>${e.podtitul}</small></button>`
    ).join('') +
    `<p class="uk-note">Zatím sedm zatmění Slunce. Další úkazy se připravují (vybráno 60: zatmění, přechody, komety, konjunkce, supernovy).</p>`;
  list.addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-k]');
    if (!b) return;
    cur = U[+b.dataset.k];
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
      play = 0;
      draw();
    } else if (a === 'show') {
      play = 0;
      show(cur);
    } else if (a === 'play') {
      show(cur, cur.jd - cur.okno);
      play = cur.okno * 2;
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
      if (!key) return;
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
    if (!back) return;
    if (S.gamma > 0.01) {
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
    const d = Math.min(play, ((cur.okno * 2) / 14) * dt);
    play -= d;
    setTime(S.jd + d);
    aim(cur);
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
    const sh = shadow();
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
  S.bus.on('mode', () => draw());
  return {
    open: () => ui.toggle('#uk'),
    card: (id) => open(id, false),
    show: () => cur && show(cur),
    back: restore,
    go,
    state: () => ({ cur: cur && cur.id, back: !!back, play, track: track.length }),
  };
}
