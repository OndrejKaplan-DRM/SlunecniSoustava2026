// Úkazy na obloze (verze 1.3): seznam událostí, karta události, kamera nad místo úkazu a návrat do původního pohledu.
// Data: src/data/udalosti.json (čas jd je světový čas; datum v kartě gregoriánské jako v aplikaci, juliánské jen jako doplněk).
import U from '../data/udalosti.json';
import { idx, basis, updateAll } from '../core/sim.js';
export function createUdalosti(S, A, ui) {
  const $ = (s) => document.querySelector(s),
    list = $('#uk-list'),
    card = $('#ukc'),
    m9 = new Array(9);
  let cur = null /* otevřená událost */,
    back = null /* uložený pohled před ukázkou */,
    play = 0; /* zbývající dny přehrávání průchodu */
  const kid = () => document.body.classList.contains('kid');
  // směr od středu tělesa k místu na povrchu (scéna)
  function dirOf(e) {
    const b = idx.get(e.telo);
    basis(b, S.jd, m9);
    const la = (e.lat * Math.PI) / 180,
      lo = (e.lon * Math.PI) / 180,
      v = [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
    return [0, 1, 2].map((k) => v[0] * m9[k] + v[1] * m9[3 + k] + v[2] * m9[6 + k]);
  }
  function aim(e) {
    const p = dirOf(e);
    S.lookSky({ x: -p[0], y: -p[1], z: -p[2] });
  }
  function setTime(jd) {
    S.jd = jd;
    updateAll(jd);
    S.wake();
  }
  function show(e, from) {
    if (!back)
      back = { jd: S.jd, paused: S.paused, focus: S.focus, yaw: S.cam.yaw, pitch: S.cam.pitch, alt: S.cam.altT };
    S.paused = true;
    setTime(from ?? e.jd);
    S.jump(idx.get(e.telo));
    S.cam.alt = S.cam.altT = e.vyska;
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
    back = null;
    ui.refresh();
    S.wake();
    draw();
  }
  function draw() {
    const e = cur;
    card.classList.toggle('on', !!e);
    if (!e) return;
    card.innerHTML =
      `<button class="x" data-u="close" title="Zavřít kartu">×</button>` +
      `<h3>${e.ikona} ${e.nazev}</h3><p class="uk-sub">${e.podtitul}</p>` +
      `<p class="uk-when"><b>${e.datum}</b> · ${e.misto}<br><small>${e.cas}<br>podle tehdejšího juliánského kalendáře ${e.datumJul}</small></p>` +
      (kid() ? `<p>${e.deti}</p>` : `<p>${e.text}</p><p class="uk-per">💡 ${e.perlicka}</p>`) +
      `<div class="uk-btn"><button class="pri" data-u="show">🎬 Ukázat úkaz</button><button data-u="play">▶ Přehrát průchod stínu</button>` +
      `<button data-u="back"${back ? '' : ' disabled'}>⟲ Vrátit pohled</button></div>` +
      (kid()
        ? ''
        : `<details><summary>Model × prameny</summary><p>${e.shoda}</p><p><small>${e.pramen}</small></p></details>`);
  }
  list.innerHTML =
    U.map(
      (e, k) =>
        `<button data-k="${k}">${e.ikona} <b>${e.datum}</b> – ${e.nazev}<br><small>${e.podtitul}</small></button>`
    ).join('') +
    `<p class="uk-note">Další úkazy se připravují (vybráno 60: zatmění, přechody, komety, konjunkce, supernovy).</p>`;
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
    S.wake();
  });
  // přehrávání: 14 sekund na celý průchod, kamera drží místo úkazu pod sebou
  S.ticks.push((dt) => {
    if (!cur || play <= 0) return;
    const d = Math.min(play, ((cur.okno * 2) / 14) * dt);
    play -= d;
    setTime(S.jd + d);
    aim(cur);
  });
  S.bus.on('mode', () => draw());
  return {
    open: () => ui.toggle('#uk'),
    card: (id) => {
      cur = U.find((e) => e.id === id) || null;
      draw();
    },
    show: () => cur && show(cur),
    back: restore,
    state: () => ({ cur: cur && cur.id, back: !!back, play }),
  };
}
