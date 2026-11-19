// Objekty vzdáleného vesmíru na fotce oblohy (verze 1.8b, jen dospělé rozhraní).
// Mlhoviny, hvězdokupy a galaxie, které jsou na fotce Mléčné dráhy opravdu vidět: jméno a kroužek na obloze, malá karta,
// velká karta (výřez z naší oblohy, fotografie z archivů, údaje, zdroje) a seznam v nabídce ☰.
// Modul je soběstačný: styly, okna, položku nabídky i odstavec nápovědy si vkládá sám, aby se nemusel měnit dist/index.html
// (kvůli slučování se souběžnými větvemi). Data: src/data/obloha.json, staví je tools/data/obloha_build.py.
import DATA from '../data/obloha.json';
import { AS } from '../core/asset.js';
import { shape } from '../core/sim.js';

const RAD = Math.PI / 180;
const nf = (x, d = 0) => x.toLocaleString('cs-CZ', { maximumFractionDigits: d, minimumFractionDigits: 0 });
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const STAV = '19. 11. 2026'; /* den, kdy byly údaje a odkazy ověřeny */

const CSS = `
#ds { top: 62px; left: 10px; width: 380px; max-height: calc(var(--vh) / var(--bk, 1) - 262px); }
#ds-list button { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; margin: 4px 0; padding: 5px 8px; line-height: 1.3; }
#ds-list img { width: 38px; height: 38px; border-radius: 6px; flex: none; object-fit: cover; }
#ds-list span { min-width: 0; } #ds-list small { display: block; color: var(--mu); }
.ds-note { color: var(--mu); font-size: 12px; margin: 8px 2px; }
.ds-sw { display: flex; gap: 8px; align-items: center; margin: 8px 2px 10px; cursor: pointer; font-size: 13px; }
#dsc { top: 62px; left: 10px; width: 360px; max-height: calc(var(--vh) / var(--bk, 1) - 262px); z-index: 11; font-size: 13.5px; line-height: 1.45; }
#dsc h3 { margin: 0 26px 2px 0; } #dsc p { margin: 8px 0; } #dsc .ds-sub { margin-top: 0; color: var(--mu); }
#dsc .ds-row { display: flex; gap: 8px; } #dsc figure { margin: 0; flex: 1; min-width: 0; }
#dsc figure img { display: block; width: 100%; height: auto; aspect-ratio: 1; object-fit: cover; border-radius: 8px; cursor: zoom-in; background: #05070c; }
#dsc figcaption { font-size: 11px; color: var(--mu); margin-top: 2px; }
#dsc table, #dsk table { width: 100%; border-collapse: collapse; }
#dsc th, #dsk th { text-align: left; font-weight: 400; color: var(--mu); padding: 3px 10px 3px 0; vertical-align: top; }
#dsc th { white-space: nowrap; } #dsc td, #dsk td { padding: 3px 0; }
.ds-btn { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0 4px; }
body.stack #ds, body.stack #dsc { top: 108px; max-height: calc(var(--vh) / var(--bk, 1) - 308px); }
body.tab #dsc { width: 340px; }
#dsk { left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(820px, 94vw); max-height: min(88vh, 940px); z-index: 15; background: rgba(9, 13, 22, 0.98); font-size: 13.5px; line-height: 1.5; }
#dsk h3 { font-size: 24px; margin: 0 30px 0 0; } #dsk .dk-sub { margin: 2px 0 8px; color: var(--mu); } #dsk .dk-lead { margin: 0 0 10px; font-size: 14.5px; }
#dsk a { color: #ffe7ad; text-decoration: underline dotted; cursor: pointer; } #dsk sup a { text-decoration: none; }
#dsk .dk-fig { display: grid; grid-template-columns: minmax(0, 300px) minmax(0, 1fr); gap: 12px; margin: 0 0 12px; align-items: start; }
#dsk figure { margin: 0; background: rgba(124, 150, 210, 0.08); border-radius: 10px; padding: 6px; }
#dsk figure img { display: block; width: 100%; height: auto; border-radius: 6px; cursor: zoom-in; background: #05070c; }
#dsk .dk-fig figure:nth-child(2) img { max-height: 420px; object-fit: contain; }
#dsk figcaption { font-size: 12px; margin: 5px 2px 1px; } #dsk figcaption small, #dsk td small { display: block; color: var(--mu); }
#dsk th { width: 34%; } #dsk tr + tr th, #dsk tr + tr td { border-top: 1px solid var(--ln); }
#dsk h4 { margin: 16px 0 4px; } #dsk p { margin: 5px 0; }
#dsk .dk-gal { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 10px; }
#dsk ol { margin: 4px 0; padding-left: 22px; } #dsk li { margin: 3px 0; } #dsk li small { color: var(--mu); }
#dsk .dk-nav { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
body.big:not(.mob) #dsk { max-height: min(calc(var(--vh) * 0.86 / var(--bk, 1)), 940px); }
body.big :is(#ds, #dsc, #dsk) { zoom: var(--bk, 1.4); }
body.mob #ds { left: 6px; right: 6px; width: auto; max-height: 60vh; top: calc(92px + env(safe-area-inset-top)); background: rgba(9, 13, 22, 0.98); }
body.mob #dsc { top: auto; bottom: calc(var(--dk, 120px) + 8px); left: 6px; right: 6px; width: auto; max-height: 50vh; padding: 10px 12px; font-size: 13px; background: rgba(9, 13, 22, 0.98); }
body.mob #dsc h3 { font-size: 15px; } body.mob #dsc p { margin: 5px 0; } body.mob #dsc .ds-btn button { flex: 1; padding: 9px 6px; }
body.mob #dsc figure img { aspect-ratio: 2.3; } body.mob #dsc .ds-sub { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
body.mob.land #dsc { left: calc(6px + env(safe-area-inset-left)); right: auto; width: min(330px, 46vw); top: 46px; bottom: calc(var(--dk, 84px) + 6px); max-height: none; }
body.mob #dsk { width: calc(100vw - 12px); max-height: 82vh; max-height: 82dvh; padding: 12px; font-size: 13px; }
body.mob #dsk h3 { font-size: 19px; } body.mob #dsk .dk-fig { grid-template-columns: 1fr; } body.mob #dsk .dk-fig figure:first-child img { max-width: 240px; margin: 0 auto; } body.mob #dsk th { width: 42%; }
body.mob:has(#ds.on, #dsc.on, #dsk.on) :is(#card, #minfo, #mission, #hud, #guide, #toast) { visibility: hidden !important; }
body:has(#ds.on, #dsc.on) #guide { display: none !important; }
body:not(.mob):has(#ds.on, #dsc.on) #hud, body.tab:has(#ds.on, #dsc.on) #mission, body.stack:has(#ds.on, #dsc.on) #mission { visibility: hidden; }
@media (max-width: 1500px) { body:not(.mob):has(#ds.on, #dsc.on) #mission { visibility: hidden; } }
#dsz { display: none; position: fixed; inset: 0; z-index: 40; background: rgba(2, 4, 9, 0.95); align-items: center; justify-content: center; flex-direction: column; cursor: zoom-out; padding: 10px; }
#dsz.on { display: flex; } #dsz img { max-width: 100%; max-height: calc(100% - 52px); object-fit: contain; border-radius: 6px; }
#dsz p { color: #c9d3ea; font-size: 12.5px; margin: 8px 0 0; text-align: center; max-width: 900px; }
body.no-obloha :is([data-a="ds"], #ds, #dsc, #dsk, #dsz, .h-ds) { display: none !important; }
`;

export function createObloha(S, A, ui) {
  const $ = (s) => document.querySelector(s);
  const OBJ = DATA.objekty,
    SKUP = DATA.skupiny,
    byId = new Map(OBJ.map((o) => [o.id, o]));
  for (const o of OBJ) {
    o.v = S.eq2s(o.ra * RAD, o.de * RAD); /* směr ve scéně (jednotkový vektor) */
    o.vis = false;
    o.kref = o.src.findIndex((s) => /OpenNGC|Poloha/.test(s.t)); /* zdroj polohy a katalogových údajů */
  }
  const ok = () => !S.F || S.F.on('obloha');
  const img = (f) => AS('sky/' + f);
  let on = false /* jména a kroužky na obloze */,
    cur = null /* objekt v malé kartě */,
    big = null /* objekt ve velké kartě */,
    hov = null,
    saved = null /* pohled před „Ukázat na obloze“ */,
    anim = null,
    pend = null,
    wantP = null,
    lastF = 0;

  // ---------- okna (vkládají se sem, ne do index.html) ----------
  document.head.appendChild(Object.assign(document.createElement('style'), { textContent: CSS }));
  const mk = (id, cls, html) => {
    const d = document.createElement('div');
    d.id = id;
    d.className = cls;
    d.innerHTML = html;
    document.body.appendChild(d);
    return d;
  };
  const X = '<button class="x" data-c="x" aria-label="Zavřít">×</button>';
  const elL = mk(
      'ds',
      'panel pop',
      X +
        '<h3>🌌 Objekty na obloze</h3><p class="ds-note" style="margin-top:0">Mlhoviny, hvězdokupy a galaxie, které jsou vidět na fotce Mléčné dráhy za planetami. Do Sluneční soustavy nepatří: leží stovky až miliony světelných let daleko.</p>' +
        '<label class="ds-sw"><input type="checkbox" id="ds-on"> Jména a kroužky na obloze</label><div id="ds-list"></div>' +
        '<p class="ds-note">Klik v seznamu: pohled na objekt a karta. Na obloze: klik na jméno ukáže kartu, dvojklik velkou kartu s fotografiemi a zdroji. Rozhlížet se dá pravým tlačítkem myši, na dotykové obrazovce tahem.</p>'
    ),
    elC = mk('dsc', 'panel pop', ''),
    elK = mk('dsk', 'panel pop', ''),
    elZ = mk('dsz', '', '<img alt=""><p></p>'),
    ukc = $('#ukc');
  /* položka v nabídce ☰ (za Úkazy na obloze) a odstavec v nápovědě */
  const mb = Object.assign(document.createElement('button'), { innerHTML: '🌌 Objekty na obloze' });
  mb.dataset.a = 'ds';
  const after = $('#more [data-a="uk"]');
  if (after) after.after(mb);
  else $('#more').appendChild(mb);
  const hr = $('#help .row');
  if (hr)
    hr.insertAdjacentHTML(
      'beforebegin',
      '<p class="h-ds">🌌 Na fotce Mléčné dráhy jsou vidět i <b>objekty daleko za Sluneční soustavou</b>: mlhoviny, hvězdokupy a sousední galaxie. Zapni je v nabídce ☰ → Objekty na obloze. Klik na jméno ukáže kartu, dvojklik velkou kartu s fotografiemi a odkazy na zdroje.</p>'
    );
  if (ui.pops) ui.pops.push('#ds', '#dsc', '#dsk');
  const T = (sel, v) => ui.toggle(sel, v),
    isOn = (e) => e.classList.contains('on');

  // ---------- texty ----------
  const ly = (o) =>
    o.lytxt || (o.ly >= 1e6 ? `${nf(o.ly / 1e6, 1)} milionu světelných let` : `asi ${nf(o.ly)} světelných let`);
  const lyShort = (o) => (o.ly >= 1e6 ? `${nf(o.ly / 1e6, 1)} mil. sv. l.` : `${nf(o.ly)} sv. l.`);
  const ang = (m) => (m >= 60 ? `${nf(m / 60, 1)}°` : `${nf(m)}′`);
  const size = (o) =>
    !o.vel || !o.maj ? null : 'asi ' + ang(o.maj) + (o.min && Math.abs(o.min - o.maj) > 1 ? ' × ' + ang(o.min) : '');
  const pos = (o) => {
    let m = Math.round((o.ra / 15) * 60),
      a = Math.round(Math.abs(o.de) * 60);
    return `rektascenze ${Math.floor(m / 60)} h ${m % 60} min, deklinace ${o.de < 0 ? '−' : '+'}${Math.floor(a / 60)}° ${a % 60}′`;
  };
  const ref = (n) => (n >= 0 ? ` <sup><a data-ref="${n + 1}">[${n + 1}]</a></sup>` : '');
  const credit = (im) => `Autor: ${esc(im.autor)} · archiv ${im.arch} · ${im.lic}`;
  const ph = (im, o, lazy) =>
    `<img src="${img(im.f)}" width="${im.w}" height="${im.h}" alt="${esc(o.cs + ': ' + im.cap)}" data-z="${esc(im.cap + ' – ' + credit(im))}"${lazy ? ' loading="lazy"' : ''} decoding="async">`;
  const nase = (o, n) =>
    `<img src="${img(o.id + '_nase.webp')}" width="${n}" height="${n}" alt="${esc(o.cs)} na fotce oblohy v aplikaci" data-z="${esc(o.cs + ' na fotce oblohy, kterou kreslí aplikace (výřez asi ' + nf(o.pole) + '° × ' + nf(o.pole) + '°, nebeský sever nahoře)')}" decoding="async">`;

  // ---------- seznam ----------
  function drawList() {
    let h = '';
    for (const g in SKUP) {
      const L = OBJ.filter((o) => o.druh === g);
      if (!L.length) continue;
      h += `<h4>${SKUP[g]}</h4>`;
      for (const o of L)
        h += `<button data-o="${o.id}"><img src="${img(o.id + '_nase.webp')}" alt="" width="38" height="38" loading="lazy"><span><b>${o.cs}</b><small>${o.ozn} · ${lyShort(o)}</small></span></button>`;
    }
    $('#ds-list').innerHTML = h;
    $('#ds-on').checked = on;
  }

  // ---------- malá karta ----------
  function drawCard(o) {
    const s = size(o);
    elC.innerHTML =
      X +
      `<h3>${o.cs}</h3><p class="ds-sub">${o.ozn} · ${o.typ}</p>` +
      `<div class="ds-row"><figure>${nase(o, 320)}<figcaption>na naší obloze</figcaption></figure><figure>${ph(o.imgs[0], o)}<figcaption>${o.imgs[0].arch}</figcaption></figure></div>` +
      `<p>${o.lead}</p><table><tr><th>Vzdálenost</th><td>${ly(o)}</td></tr><tr><th>Souhvězdí</th><td>${o.souhv}</td></tr>` +
      (s ? `<tr><th>Na obloze</th><td>${s}</td></tr>` : '') +
      '</table><div class="ds-btn"><button class="pri" data-c="big">📖 Velká karta</button><button data-c="aim">🎯 Ukázat na obloze</button>' +
      (saved ? '<button data-c="back">↩ Zpět k tělesu</button>' : '') +
      '<button data-c="list">☰ Seznam</button></div>';
    elC.scrollTop = 0;
  }
  function openCard(o, quiet) {
    if (!o || !ok()) return;
    cur = o;
    if (!on) setOn(true, true);
    drawCard(o);
    if (ukc && isOn(ukc) && !ukc.classList.contains('min')) {
      const b = ukc.querySelector('.mn'); /* karta úkazu sedí na stejném místě: sbalit ji */
      if (b) b.click();
    }
    if (!isOn(elC)) T('#dsc', true);
    else if (!quiet) A.play('select');
    S.wake();
  }

  // ---------- velká karta ----------
  function drawBig(o) {
    const s = size(o),
      i = OBJ.indexOf(o),
      n = OBJ.length,
      rows = [
        ['Druh', o.typ],
        ['Vzdálenost od Země', ly(o) + ref(o.lysrc)],
        ['Souhvězdí', o.souhv],
        ['Poloha na obloze', pos(o) + ' (J2000)' + ref(o.kref)],
      ];
    if (s)
      rows.push([
        'Velikost na obloze',
        s +
          ref(o.kref) +
          '<small>největší rozměr podle katalogu; okraj není ostrý a jiné katalogy uvádějí i jiné hodnoty. Měsíc v úplňku má asi 0,5°.</small>',
      ]);
    if (o.mag != null)
      rows.push([
        'Jasnost',
        `${nf(o.mag, 1)} mag` +
          ref(o.kref) +
          '<small>čím menší číslo, tím jasnější; pouhým okem je za tmavé noci vidět zhruba do 6 mag.</small>',
      ]);
    const gal = o.imgs
      .slice(1)
      .map((im) => `<figure>${ph(im, o, true)}<figcaption>${im.cap}<small>${credit(im)}</small></figcaption></figure>`)
      .join('');
    const a = (u, t) => `<a href="${u}" target="_blank" rel="noopener noreferrer">${esc(t)}</a>`;
    elK.innerHTML =
      X +
      `<h3>${o.cs}</h3><p class="dk-sub">${o.ozn} · ${o.typ} · souhvězdí ${o.souhv}</p><p class="dk-lead">${o.lead}</p>` +
      `<div class="dk-fig"><figure>${nase(o, 320)}<figcaption><b>Na naší obloze.</b> Výřez z fotky Mléčné dráhy, kterou kreslí tato aplikace (asi ${nf(o.pole)}° × ${nf(o.pole)}°, nebeský sever nahoře). Kroužek ukazuje, kde objekt je.</figcaption></figure>` +
      `<figure>${ph(o.imgs[0], o)}<figcaption><b>Zblízka.</b> ${o.imgs[0].cap}<small>${credit(o.imgs[0])}</small></figcaption></figure></div>` +
      '<table>' +
      rows.map((r) => `<tr><th>${r[0]}</th><td>${r[1]}</td></tr>`).join('') +
      '</table>' +
      o.odst.map((p) => `<h4>${p.h}</h4><p>${p.t}</p>`).join('') +
      (gal ? `<h4>Další fotografie</h4><div class="dk-gal">${gal}</div>` : '') +
      '<h4>Zdroje a ověření</h4><ol>' +
      o.src.map((x, k) => `<li id="dk-s${k + 1}">${a(x.u, x.t)}</li>`).join('') +
      '</ol><p class="ds-note" style="margin:6px 0 2px">Fotografie:</p><ol>' +
      o.imgs
        .map(
          (im) =>
            `<li>${im.cap} – ${a(im.url, 'stránka snímku v archivu ' + im.arch)}<br><small>${credit(im)}</small></li>`
        )
        .join('') +
      `</ol><p class="ds-note">Údaje a odkazy: stav ${STAV}. Texty jsou stručné shrnutí uvedených zdrojů, fotografie jsou zmenšené. Odkazy se otevírají v novém okně a potřebují internet; aplikace sama z internetu nic nenačítá.</p>` +
      `<div class="dk-nav"><button data-c="prev">‹ ${OBJ[(i + n - 1) % n].cs}</button><button data-c="aim">🎯 Ukázat na obloze</button><button data-c="next">${OBJ[(i + 1) % n].cs} ›</button></div>`;
    elK.scrollTop = 0;
  }
  function openBig(o) {
    if (!o || !ok()) return;
    big = o;
    cur = o;
    if (!on) setOn(true, true);
    drawBig(o);
    if (!isOn(elK)) T('#dsk', true);
    S.wake();
  }
  function zoom(im) {
    elZ.firstChild.src = im.currentSrc || im.src;
    elZ.lastChild.textContent = im.dataset.z || '';
    elZ.classList.add('on');
  }

  // ---------- vrstva na obloze ----------
  function setOn(v, quiet) {
    on = !!v && ok();
    const c = $('#ds-on');
    if (c) c.checked = on;
    if (!on) {
      hov = null;
      if (isOn(elC)) T('#dsc', false);
    }
    S.wake();
  }
  S.overlays.push((ctx, e) => {
    lastF = e.F;
    if (!on || !ok()) {
      for (const o of OBJ) o.vis = false;
      return;
    }
    const tk = S.txtK || 1,
      fo = e.R && e.R[S.focus];
    ctx.save();
    ctx.font = `500 ${11.5 * tk}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.lineJoin = 'round';
    for (const o of OBJ) {
      o.vis = false;
      const z = o.v.dot(e.fwd);
      if (z < 0.25) continue;
      const x = e.W / 2 + (e.F * o.v.dot(e.right)) / z,
        y = e.H / 2 - (e.F * o.v.dot(e.up)) / z;
      if (x < -30 || x > e.W + 30 || y < -30 || y > e.H + 30) continue;
      /* schované za kotoučem tělesa se nekreslí (fotka oblohy je až za ním) */
      let hid = fo && fo.pr > 3 && Math.hypot(fo.sx - x, fo.sy - y) < fo.pr;
      if (!hid) for (const it of S.items) if (it.pr > 3 && Math.hypot(it.sx - x, it.sy - y) < it.pr) hid = true;
      if (hid) continue;
      const rr = Math.max(8 * tk, Math.min(150, (o.kr * RAD * e.F) / z)),
        hot = o === hov || o === cur;
      o.sx = x;
      o.sy = y;
      o.rr = rr;
      o.lw = ctx.measureText(o.cs).width / 2 + 4;
      o.vis = true;
      ctx.globalAlpha = hot ? 1 : 0.62;
      ctx.strokeStyle = hot ? '#ffe7ad' : 'rgba(226,200,255,0.8)';
      ctx.lineWidth = hot ? 1.6 : 1;
      ctx.setLineDash(hot ? [] : [3, 4]);
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, 6.2832);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(3,6,12,0.75)';
      ctx.strokeText(o.cs, x, y + rr + 4);
      ctx.fillStyle = hot ? '#ffe7ad' : 'rgba(232,212,255,0.95)';
      ctx.fillText(o.cs, x, y + rr + 4);
    }
    ctx.restore();
  });
  /* objekt pod ukazatelem: uvnitř kroužku nebo na jménu; z překrývajících se vyhrává menší kroužek */
  function near(x, y) {
    let best = null;
    for (const o of OBJ) {
      if (!o.vis) continue;
      const d = Math.hypot(o.sx - x, o.sy - y),
        inR = d < Math.max(o.rr, 14) + 3,
        inL = Math.abs(x - o.sx) < o.lw && y > o.sy + o.rr && y < o.sy + o.rr + 22;
      if ((inR || inL) && (!best || o.rr < best.rr)) best = o;
    }
    return best;
  }

  // ---------- pohled na objekt a zpět ----------
  const wrap = (a) => a - 2 * Math.PI * Math.round(a / (2 * Math.PI));
  /* kam na obrazovce má objekt přijít: doprostřed; na telefonu doprostřed plochy, kterou nezakrývá karta */
  function want() {
    const W = cv.clientWidth,
      H = cv.clientHeight,
      c = document.body.classList;
    let x = W / 2,
      y = H / 2;
    if (c.contains('mob') && isOn(elC)) {
      const r = elC.getBoundingClientRect();
      if (c.contains('land')) x = (r.right + W) / 2;
      else y = Math.max(70, (96 + r.top) / 2);
    }
    return (wantP = { x, y, W, H });
  }
  function target(o) {
    /* Kamera vždy obíhá těleso a dívá se na něj; od něj se umí odklonit (rozhlédnutí). Objekt přijde na místo z want()
       a těleso zůstane pod ním (u jižních objektů nad ním), dost daleko, aby objekt nezakrývalo. */
    const cam = S.cam,
      w = want(),
      F = lastF || w.H / 2 / Math.tan(22.5 * RAD),
      dl = Math.atan((w.H / 2 - w.y) / F) /* o kolik má být objekt nad středem obrazu */,
      ep = Math.atan((w.x - w.W / 2) / F) /* a o kolik vpravo */,
      R = shape[S.focus].rmax,
      rho = Math.asin(Math.min(1, R / (R + Math.max(0, cam.altT)))),
      th = Math.asin(Math.max(-1, Math.min(1, o.v.y))),
      base = Math.max(0.24, Math.min(1.3, rho + 0.22));
    const az = Math.atan2(o.v.z, o.v.x),
      dz = ep / Math.max(0.3, Math.cos(th));
    /* A: těleso pod objektem */
    let lp = base,
      pitch = lp + dl - th;
    if (pitch <= 1.5) return { yaw: az + Math.PI - dz, pitch, ly: 0, lp };
    /* B: těleso nad objektem (jižní obloha) */
    lp = -Math.min(1.4, base + dl);
    pitch = lp + dl - th;
    if (th - dl >= -1.5) return { yaw: az + Math.PI - dz, pitch, ly: 0, lp };
    /* C: objekt těsně u jižního pólu ekliptiky, který má přijít nad střed obrazu (telefon s kartou dole):
       vzpřímený pohled by musel mířit „jižněji než pól“, proto kamera přejde přes pól a obraz je vzhůru nohama */
    return { yaw: az + dz, pitch: Math.PI + th + dl + base, ly: 0, lp: base };
  }
  function go(to, done) {
    const cam = S.cam;
    anim = {
      t: 0,
      a: { yaw: cam.yaw, pitch: cam.pitch, ly: cam.ly, lp: cam.lp },
      b: { ...to, yaw: cam.yaw + wrap(to.yaw - cam.yaw), pitch: cam.pitch + wrap(to.pitch - cam.pitch) },
      done,
    };
    S.wake();
  }
  function aim(o, hned) {
    if (!o || !ok()) return;
    const cam = S.cam;
    if (cam.fly && cam.fly.ph !== 2) {
      pend = o; /* právě se letí k tělesu: počkat na přílet */
      return;
    }
    cam.fly = null;
    if (!saved || saved.focus !== S.focus)
      saved = { focus: S.focus, yaw: cam.yaw, pitch: cam.pitch, ly: cam.ly, lp: cam.lp };
    const R = shape[S.focus].rmax;
    if (cam.altT < R * 0.25) cam.altT = R * 0.25; /* těsně nad povrchem by těleso zakrylo půl oblohy */
    if (hned) {
      Object.assign(cam, target(o)); /* bez animace (zkoušky) */
      anim = null;
      S.wake();
    } else go(target(o));
    if (cur === o && isOn(elC)) drawCard(o);
  }
  function back() {
    if (!saved) return;
    const s = saved,
      cam = S.cam;
    saved = null;
    if (cam.fly) cam.fly = null;
    /* jiné těleso než při ukázání (skok klávesou): jen srovnat pohled zpět na těleso */
    go(
      s.focus === S.focus
        ? { yaw: s.yaw, pitch: s.pitch, ly: s.ly, lp: s.lp }
        : { yaw: cam.yaw, pitch: cam.pitch, ly: 0, lp: 0 }
    );
    if (cur && isOn(elC)) drawCard(cur);
  }
  let wasTut = false;
  S.ticks.push((dt) => {
    /* ukázka ovládání si scénu řídí sama: vrstva i okna jí uhnou */
    const tr = !!(ui.tut && ui.tut.running());
    if (tr && !wasTut) {
      anim = pend = saved = null;
      for (const s of ['#ds', '#dsc', '#dsk']) if (isOn($(s))) T(s, false);
      setOn(false, true);
    }
    wasTut = tr;
    if (pend && !S.cam.fly) {
      const o = pend;
      pend = null;
      aim(o);
    }
    if (anim) {
      const cam = S.cam,
        u = (anim.t = Math.min(1, anim.t + dt / 1.1)),
        k = u * u * (3 - 2 * u);
      for (const q of ['yaw', 'pitch', 'ly', 'lp']) cam[q] = anim.a[q] + (anim.b[q] - anim.a[q]) * k;
      if (u >= 1) {
        cam.yaw = wrap(cam.yaw);
        cam.pitch = wrap(cam.pitch);
        const d = anim.done;
        anim = null;
        if (d) d();
      }
      S.wake();
    }
    /* karta úkazu a karta objektu sedí na stejném místě: otevřená karta úkazu má přednost */
    if (ukc && isOn(elC) && isOn(ukc) && !ukc.classList.contains('min')) T('#dsc', false);
  });

  // ---------- ovládání ----------
  const cv = $('#gl');
  let dn = null,
    lastT = 0,
    lastO = null;
  cv.addEventListener('pointerdown', (e) => {
    dn = { x: e.clientX, y: e.clientY, b: e.button };
    if (e.isTrusted) {
      anim = null; /* uživatel převzal řízení */
      pend = null;
    }
    if (document.body.classList.contains('mob') && isOn(elL) && e.isTrusted) T('#ds', false);
  });
  cv.addEventListener('wheel', () => (anim = null), { passive: true });
  cv.addEventListener('pointerup', (e) => {
    const d = dn;
    dn = null;
    if (!on || !ok() || !d || d.b !== 0 || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5) return;
    if (document.body.classList.contains('cine')) return; /* v kině je vrstva popisků skrytá */
    if (ui.tut && ui.tut.running()) return;
    if (S.pick(e.clientX, e.clientY) >= 0) return; /* těleso má přednost */
    const o = near(e.clientX, e.clientY);
    if (!o) return;
    const now = performance.now();
    if (o === lastO && now - lastT < 420) {
      lastT = 0;
      openBig(o);
      return;
    }
    lastT = now;
    lastO = o;
    openCard(o);
  });
  cv.addEventListener('pointermove', (e) => {
    if (!on || e.buttons || document.body.classList.contains('cine')) return;
    const h = S.pick(e.clientX, e.clientY) >= 0 ? null : near(e.clientX, e.clientY);
    if (h !== hov) {
      hov = h;
      S.wake();
    }
    if (h) cv.style.cursor = 'pointer';
    else if (S.hover < 0 && cv.style.cursor === 'pointer') cv.style.cursor = 'grab';
  });
  elL.addEventListener('click', (e) => {
    if (e.target.closest('[data-c="x"]')) return T('#ds', false);
    const b = e.target.closest('[data-o]');
    if (!b) return;
    const o = byId.get(b.dataset.o);
    openCard(o);
    aim(o);
  });
  $('#ds-on').addEventListener('change', (e) => {
    setOn(e.target.checked);
    A.play(on ? 'orbit_on' : 'orbit_off');
  });
  const click = (el, get) =>
    el.addEventListener('click', (e) => {
      const im = e.target.closest('img[data-z]');
      if (im) return zoom(im);
      const r = e.target.closest('[data-ref]');
      if (r) {
        const li = elK.querySelector('#dk-s' + r.dataset.ref);
        if (li) li.scrollIntoView({ block: 'center', behavior: 'smooth' });
        return;
      }
      const b = e.target.closest('[data-c]'),
        o = get();
      if (!b || !o) return;
      const c = b.dataset.c;
      if (c === 'x') T('#' + el.id, false);
      else if (c === 'big') openBig(o);
      else if (c === 'list') act();
      else if (c === 'back') back();
      else if (c === 'aim') {
        if (el === elK) openCard(o, true); /* velká karta by pohled zakryla: nechat jen malou */
        aim(o);
      } else if (c === 'prev' || c === 'next') {
        const n = OBJ.length;
        openBig(OBJ[(OBJ.indexOf(o) + (c === 'next' ? 1 : n - 1)) % n]);
      }
    });
  click(elC, () => cur);
  click(elK, () => big);
  elZ.addEventListener('click', () => elZ.classList.remove('on'));
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Escape' && isOn(elZ)) {
        elZ.classList.remove('on'); /* nejdřív zvětšená fotka, okna až dalším Esc */
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    },
    true
  );
  function act() {
    if (!ok()) return;
    const v = T('#ds');
    if (v) {
      drawList();
      if (!on) setOn(true);
    }
  }
  if (ui.actions) ui.actions.ds = act;
  S.bus.on('panel', (sel, v) => {
    if (!v && sel === '#dsc') {
      cur = null;
      S.wake();
    }
    if (!v && sel === '#dsk') {
      big = null;
      elZ.classList.remove('on');
    }
  });
  /* přelet k tělesu: okna nezůstávají viset (stejné pravidlo jako u ostatních oken od verze 1.8a) */
  S.bus.on('fly', () => {
    anim = null;
    saved = null;
    if (ui.tut && ui.tut.running()) return;
    for (const s of ['#ds', '#dsc', '#dsk']) if (isOn($(s))) T(s, false);
  });
  const modeOff = () => {
    if (ok()) return;
    on = false;
    hov = null;
    anim = pend = saved = null;
    elZ.classList.remove('on');
    for (const s of ['#ds', '#dsc', '#dsk']) if (isOn($(s))) T(s, false);
  };
  if (S.F && S.F.onChange) S.F.onChange(modeOff);

  return {
    ids: () => OBJ.map((o) => o.id),
    get: (id) => byId.get(id),
    list: act,
    on: (v) => (v === undefined ? on : setOn(v, true)),
    card: (id) => openCard(byId.get(id)),
    big: (id) => openBig(byId.get(id)),
    aim: (id, hned) => aim(byId.get(id), hned),
    back,
    near,
    state: () => ({
      on,
      cur: cur && cur.id,
      big: big && big.id,
      anim: !!anim,
      saved: !!saved,
      want: wantP,
      vis: OBJ.filter((o) => o.vis).map((o) => ({ id: o.id, x: o.sx, y: o.sy, r: o.rr })),
    }),
  };
}
