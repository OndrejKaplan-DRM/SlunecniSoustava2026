// Objekty vzdáleného vesmíru na fotce oblohy (verze 1.8c, jen dospělé rozhraní).
// Mlhoviny, hvězdokupy a galaxie na fotce Mléčné dráhy za planetami:
//   – nenápadné kroužky se jmény (ukážou se se souhvězdími; jinak se objekt prozradí, až když na něj najede ukazatel),
//   – klik = bublina se jménem přímo u objektu, dvojklik nebo „Přiblížit“ = scéna objektu: rozhraní ustoupí, kroužek se
//     rozroste do fotografie („přiblížení dalekohledem“), vedle ní údaje, text, poloha na obloze a zdroje; po zavření se
//     fotografie vrátí do kroužku a rozhraní i pohled jsou zpět tam, kde byly,
//   – seznam všech objektů v nabídce ☰.
// Modul je soběstačný: styly, prvky stránky, položku nabídky i odstavec nápovědy si vkládá sám, aby se nemusel měnit
// dist/index.html (kvůli slučování se souběžnými větvemi). Data: src/data/obloha.json (staví tools/data/obloha_build.py).
import DATA from '../data/obloha.json';
import { AS } from '../core/asset.js';
import { shape } from '../core/sim.js';

const RAD = Math.PI / 180;
const nf = (x, d = 0) => x.toLocaleString('cs-CZ', { maximumFractionDigits: d, minimumFractionDigits: 0 });
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/* nedělitelné mezery: čísla po tisících („1 350“), označení („M 42“, „NGC 1976“) a jednotky se nesmí zalomit */
const nb = (t) =>
  t
    .replace(/(\d) (?=\d{3}(?!\d))/g, '$1\u00a0')
    .replace(/\b(M|NGC|IC) (?=\d)/g, '$1\u00a0')
    .replace(/(\d) (?=(°C|km\/h|%|mag)\b)/g, '$1\u00a0');
const STAV = DATA.stav; /* den, kdy byly údaje a odkazy ověřeny */
const KEY = 's200obl';
const MESIC =
  'v lednu,v únoru,v březnu,v dubnu,v květnu,v červnu,v červenci,v srpnu,v září,v říjnu,v listopadu,v prosinci'.split(
    ','
  );

const CSS = `
#ds { top: 62px; left: 10px; width: 380px; max-height: calc(var(--vh) / var(--bk, 1) - 262px); }
#ds-list button { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; margin: 4px 0; padding: 5px 8px; line-height: 1.3; }
#ds-list img { width: 38px; height: 38px; border-radius: 6px; flex: none; object-fit: cover; }
#ds-list span { min-width: 0; } #ds-list small { display: block; color: var(--mu); }
.ds-note { color: var(--mu); font-size: 12px; margin: 8px 2px; }
.ds-mode { display: flex; gap: 4px; margin: 8px 0 10px; } .ds-mode button { flex: 1; padding: 6px 4px; font-size: 12.5px; }
.ds-mode button.sel { border-color: var(--ac); color: var(--ac); }
body.stack #ds { top: 108px; max-height: calc(var(--vh) / var(--bk, 1) - 308px); }
body.big #ds { zoom: var(--bk, 1.4); }
body.mob #ds { left: 6px; right: 6px; width: auto; max-height: 60vh; top: calc(92px + env(safe-area-inset-top)); background: rgba(9, 13, 22, 0.98); }
body.mob:has(#ds.on) :is(#card, #minfo, #mission, #hud, #guide, #toast) { visibility: hidden !important; }
body:has(#ds.on) #guide { display: none !important; }
body:not(.mob):has(#ds.on) #hud, body.tab:has(#ds.on) #mission, body.stack:has(#ds.on) #mission { visibility: hidden; }
@media (max-width: 1500px) { body:not(.mob):has(#ds.on) #mission { visibility: hidden; } }

/* kroužek pod ukazatelem a bublina se jménem (fungují i v kině, proto nejsou .panel) */
#dsr { position: fixed; left: 0; top: 0; z-index: 8; pointer-events: none; border: 1px solid rgba(255, 231, 173, 0.9); border-radius: 50%; box-shadow: 0 0 14px rgba(255, 221, 150, 0.28), inset 0 0 10px rgba(255, 221, 150, 0.12); opacity: 0; transition: opacity 0.28s; }
#dsr.on { opacity: 1; }
#dsr span { position: absolute; left: 50%; top: 100%; transform: translate(-50%, 5px); white-space: nowrap; font-size: 12px; font-weight: 500; color: #ffe7ad; text-shadow: 0 0 4px #03060c, 0 0 9px #03060c; }
#dsr.b span { display: none; }
#dsb { position: fixed; left: 0; top: 0; z-index: 9; display: none; max-width: 260px; padding: 9px 12px 10px; border-radius: 12px; background: rgba(9, 13, 22, 0.9); border: 1px solid rgba(255, 231, 173, 0.35); box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5); font-size: 13px; line-height: 1.35; }
#dsb.on { display: block; animation: dsbin 0.22s ease-out; } @keyframes dsbin { from { opacity: 0; margin-top: 6px; } }
#dsb b { display: block; font-size: 14.5px; color: #ffe7ad; } #dsb span { display: block; color: var(--mu); margin: 1px 0 8px; }
#dsb button { padding: 5px 12px; } #dsb em { font-style: normal; color: var(--mu); font-size: 11.5px; margin-left: 8px; }
body.touch #dsb button { padding: 9px 16px; } body.touch #dsb em { display: none; }

/* scéna objektu */
body.ds-stage :is(.panel, #hud, #dockwrap, #mini, #ov, #cardtab, #sunchip, #guide, #toast, #cineoff, #dsb, #dsr) { opacity: 0 !important; pointer-events: none !important; transition: opacity 0.45s; }
#dss { display: none; position: fixed; inset: 0; z-index: 30; color: #e9eefb; font-size: clamp(14px, 1.04vw, 20px); line-height: 1.6; }
#dss.on { display: block; }
.ss-veil { position: absolute; inset: 0; background: radial-gradient(ellipse at 32% 50%, rgba(5, 8, 16, 0.78), rgba(2, 4, 9, 0.94)); opacity: 0; transition: opacity 0.7s; }
#dss.in .ss-veil { opacity: 1; }
.ss-wrap { position: absolute; inset: 0; display: grid; grid-template-columns: minmax(0, 1.12fr) minmax(300px, 0.88fr); grid-template-rows: auto minmax(0, 1fr); gap: 0 clamp(18px, 3vw, 56px); padding: 12px clamp(14px, 3vw, 54px) clamp(12px, 2.4vh, 30px); }
.ss-top { grid-column: 1 / -1; display: flex; align-items: center; gap: 8px; min-height: 44px; }
.ss-top button { background: rgba(124, 150, 210, 0.1); border-color: rgba(160, 180, 230, 0.22); font-size: 0.95em; }
.ss-top .ss-n { margin-left: auto; color: var(--mu); font-size: 0.85em; font-variant-numeric: tabular-nums; }
.ss-top .ss-x { font-size: 1.35em; line-height: 1; padding: 4px 12px; }
.ss-left { display: flex; flex-direction: column; justify-content: center; min-height: 0; }
.ss-slot { flex: 1; min-height: 0; }
.ss-cap { min-height: 3.2em; font-size: 0.82em; line-height: 1.4; color: var(--mu); text-align: center; padding: 10px 8px 0; }
.ss-cap b { color: #dfe6f7; font-weight: 500; }
.ss-th { display: flex; gap: 8px; justify-content: center; padding-top: 8px; min-height: 62px; }
.ss-th button { padding: 0; width: 54px; height: 54px; border-radius: 9px; overflow: hidden; border: 1px solid rgba(160, 180, 230, 0.25); opacity: 0.6; background: #05070c; }
.ss-th button.sel { opacity: 1; border-color: #ffe7ad; } .ss-th img { width: 100%; height: 100%; object-fit: cover; display: block; }
.ss-right { min-height: 0; max-height: 100%; overflow: auto; align-self: center; padding: 4px 8px 4px 0; }
.ss-kick { font-size: 0.74em; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ac); }
#dss h2 { font-size: clamp(25px, 2.5vw, 52px); line-height: 1.12; font-weight: 600; margin: 6px 0 4px; color: #fff; }
.ss-ozn { color: var(--mu); margin-bottom: 0.9em; }
.ss-lead { font-size: 1.1em; line-height: 1.5; margin: 0 0 1.1em; max-width: 34em; }
.ss-tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(118px, 1fr)); gap: 8px; margin-bottom: 1.2em; max-width: 36em; }
.ss-tiles div { border: 1px solid rgba(160, 180, 230, 0.2); border-radius: 12px; padding: 9px 12px 8px; background: rgba(124, 150, 210, 0.07); }
.ss-tiles b { display: block; font-size: 1.32em; font-weight: 600; line-height: 1.2; color: #fff; font-variant-numeric: tabular-nums; }
.ss-tiles small { display: block; font-size: 0.72em; letter-spacing: 0.08em; text-transform: uppercase; color: var(--mu); margin-top: 2px; }
.ss-tiles i { display: block; font-style: normal; font-size: 0.78em; color: var(--mu); line-height: 1.3; }
.ss-tabs { display: flex; gap: 2px; border-bottom: 1px solid rgba(160, 180, 230, 0.2); margin-bottom: 0.9em; max-width: 36em; }
.ss-tabs button { background: none; border: 0; border-bottom: 2px solid transparent; border-radius: 0; padding: 7px 12px; color: var(--mu); font-size: 0.95em; }
.ss-tabs button.sel { color: #fff; border-bottom-color: #ffe7ad; }
.ss-body { max-width: 36em; } .ss-body p { margin: 0 0 0.8em; } .ss-body a, .ss-tiles a { color: #ffe7ad; cursor: pointer; text-decoration: underline dotted; }
.ss-tiles sup a, .ss-body sup a { text-decoration: none; }
.ss-foto { color: #c5cfe6; } .ss-body small { color: var(--mu); }
.ss-body ol { margin: 0 0 0.8em; padding-left: 1.5em; } .ss-body li { margin: 0.3em 0; } .ss-body h5 { margin: 1em 0 0.3em; font-size: 0.74em; letter-spacing: 0.12em; text-transform: uppercase; color: var(--mu); font-weight: 500; }
.ss-sky { position: relative; aspect-ratio: 2; max-width: 27em; border-radius: 10px; overflow: hidden; background: #05070c center / 100% 100% no-repeat; filter: brightness(1.5); border: 1px solid rgba(160, 180, 230, 0.2); }
.ss-sky i { position: absolute; width: 14px; height: 14px; margin: -7px 0 0 -7px; border-radius: 50%; border: 1.5px solid #ffe7ad; box-shadow: 0 0 8px #ffdc96, 0 0 0 3px rgba(3, 6, 12, 0.45); }
.ss-kde { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 12px; align-items: start; margin: 0.9em 0; }
.ss-our { position: relative; aspect-ratio: 1; border-radius: 10px; overflow: hidden; background: #05070c; }
.ss-our img { width: 100%; height: 100%; display: block; } .ss-our i { position: absolute; left: 50%; top: 50%; border: 1.5px solid #ffe7ad; border-radius: 50%; transform: translate(-50%, -50%); }
.ss-lad { position: relative; height: 62px; margin: 0.4em 6px 0.2em; }
.ss-lad::before { content: ''; position: absolute; left: 0; right: 0; top: 30px; height: 2px; background: linear-gradient(90deg, rgba(160, 180, 230, 0.15), rgba(160, 180, 230, 0.5)); }
.ss-lad u { position: absolute; top: 26px; width: 1px; height: 10px; background: rgba(160, 180, 230, 0.45); text-decoration: none; }
.ss-lad u span { position: absolute; top: 14px; left: 0; transform: translateX(-50%); white-space: nowrap; font-size: 0.72em; color: var(--mu); }
.ss-lad u.a span { transform: none; } .ss-lad u.z span { transform: translateX(-100%); }
.ss-lad s { position: absolute; top: 23px; width: 16px; height: 16px; margin-left: -8px; border-radius: 50%; background: #ffe7ad; box-shadow: 0 0 12px #ffdc96; text-decoration: none; }
.ss-lad s span { position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); white-space: nowrap; font-size: 0.8em; color: #ffe7ad; }
.ss-lad s.a span { left: 0; transform: none; } .ss-lad s.z span { left: auto; right: 0; transform: none; }
.ss-lens { position: absolute; overflow: hidden; border-radius: 14px; background: #03050a; box-shadow: 0 24px 90px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.09); cursor: zoom-in; display: none; }
#dss.foto .ss-lens { cursor: zoom-out; }
.ss-lens img.ph { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: opacity 0.28s; }
.ss-seed { position: absolute; inset: 0; pointer-events: none; }
.ss-seed img { position: absolute; left: 50%; top: 50%; width: calc(var(--k, 1) * 100%); aspect-ratio: 1; max-width: none; transform: translate(-50%, -50%) rotate(var(--rot, 0deg)); }
/* texty přijdou až po přiblížení, jeden po druhém */
.ss-top, .ss-cap, .ss-th, .ss-right > * { opacity: 0; transform: translateY(10px); transition: opacity 0.5s, transform 0.5s; }
#dss.txt :is(.ss-cap, .ss-th, .ss-right > *), #dss.in .ss-top { opacity: 1; transform: none; } /* lišta se zavíráním je k dispozici hned */
#dss.txt .ss-right > :nth-child(2) { transition-delay: 0.06s; } #dss.txt .ss-right > :nth-child(3) { transition-delay: 0.1s; } #dss.txt .ss-right > :nth-child(4) { transition-delay: 0.16s; }
#dss.txt .ss-right > :nth-child(5) { transition-delay: 0.24s; } #dss.txt .ss-right > :nth-child(6) { transition-delay: 0.32s; } #dss.txt .ss-right > :nth-child(7) { transition-delay: 0.4s; }
#dss.txt :is(.ss-cap, .ss-th) { transition-delay: 0.2s; }
#dss.sw :is(.ss-cap, .ss-th, .ss-right > *) { opacity: 0; transition: opacity 0.16s; transition-delay: 0s; }
#dss.foto .ss-wrap { grid-template-columns: minmax(0, 1fr); } #dss.foto .ss-right { display: none; }
@media (max-width: 860px), (orientation: portrait) and (max-width: 1100px) {
  .ss-wrap { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto auto minmax(0, 1fr); padding: 8px 12px 10px; }
  .ss-slot { flex: none; height: 34vh; } .ss-cap { min-height: 0; } .ss-th { min-height: 0; padding-bottom: 10px; } .ss-th button { width: 44px; height: 44px; }
  .ss-right { align-self: start; padding-right: 2px; } .ss-top .ss-back span { display: none; }
  #dss.foto .ss-wrap { grid-template-rows: auto minmax(0, 1fr); } #dss.foto .ss-slot { height: auto; flex: 1; }
}
@media (max-height: 520px) and (orientation: landscape) { .ss-th { display: none; } .ss-cap { min-height: 2.6em; padding-top: 6px; } .ss-top { min-height: 36px; } #dss h2 { font-size: 22px; } }
body.no-obloha :is([data-a="ds"], #ds, #dss, #dsb, #dsr, .h-ds) { display: none !important; }
`;

export function createObloha(S, A, ui) {
  const $ = (s) => document.querySelector(s);
  const OBJ = DATA.objekty,
    SKUP = DATA.skupiny,
    byId = new Map(OBJ.map((o) => [o.id, o]));
  for (const o of OBJ) {
    o.v = S.eq2s(o.ra * RAD, o.de * RAD); /* směr ve scéně (jednotkový vektor) */
    o.vn = S.eq2s(
      o.ra * RAD,
      Math.min(89.5, o.de + 0.5) * RAD
    ); /* o půl stupně severněji: natočení výřezu při přiblížení */
    o.vis = false;
    o.kref = o.src.findIndex((s) => /OpenNGC|Poloha/.test(s.t)); /* zdroj polohy a katalogových údajů */
  }
  const DRAW = OBJ.slice().sort((a, b) => a.prio - b.prio); /* pořadí kreslení jmen: významnější mají přednost */
  const ok = () => !S.F || S.F.on('obloha');
  const img = (f) => AS('sky/' + f);
  const cls = (c) => document.body.classList.contains(c);
  let mode = 1 /* 0 vypnuto · 1 nenápadně (se souhvězdími, jinak jen pod ukazatelem) · 2 stále */,
    told = false,
    hov = null,
    sel = null /* objekt s bublinou */,
    stage = null /* otevřená scéna: { o, ph, ii, tab } */,
    saved = null /* pohled před natočením na objekt */,
    anim = null,
    pend = null,
    basis = null /* poslední kamera z 2D vrstvy: W, H, F a osy */,
    fast = false; /* zkoušky: bez animací */
  try {
    const st = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (st) {
      if (st.m >= 0 && st.m <= 2) mode = st.m;
      told = !!st.t;
    }
  } catch (e) {
    /* soukromé okno bez úložiště */
  }
  const store = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ m: mode, t: told }));
    } catch (e) {
      /* nic */
    }
  };
  const tutOn = () => !!(ui.tut && ui.tut.running());
  const ukc = $('#ukc'),
    ukOn = () => !!ukc && ukc.classList.contains('on') && !ukc.classList.contains('min');
  /* živá vrstva = objekty reagují na ukazatel; viditelná = kroužky a jména se kreslí stále */
  const live = () => ok() && mode > 0 && !tutOn() && !ukOn() && !stage;
  const shown = () => live() && (mode === 2 || S.conMode > 0);

  // ---------- prvky stránky (vkládají se sem, ne do index.html) ----------
  document.head.appendChild(Object.assign(document.createElement('style'), { textContent: CSS }));
  const mk = (id, c, html) => {
    const d = document.createElement('div');
    d.id = id;
    d.className = c;
    d.innerHTML = html;
    document.body.appendChild(d);
    return d;
  };
  const elL = mk(
      'ds',
      'panel pop',
      '<button class="x" data-c="x" aria-label="Zavřít">×</button><h3>🌌 Objekty na obloze</h3>' +
        '<p class="ds-note" style="margin-top:0">Mlhoviny, hvězdokupy a galaxie na fotce Mléčné dráhy za planetami. Do Sluneční soustavy nepatří: leží stovky až miliardy světelných let daleko.</p>' +
        '<div class="ds-mode"><button data-m="0">Vypnuto</button><button data-m="1" title="Kroužky se ukážou se souhvězdími; jinak se objekt prozradí, až na něj najedeš ukazatelem">Nenápadně</button><button data-m="2">Stále vidět</button></div>' +
        '<div id="ds-list"></div><p class="ds-note">Klik v seznamu objekt přiblíží. Na obloze: klik na kroužek ukáže jméno, dvojklik ho přiblíží.</p>'
    ),
    elR = mk('dsr', '', '<span></span>'),
    elB = mk('dsb', '', ''),
    elS = mk(
      'dss',
      '',
      '<div class="ss-veil"></div><div class="ss-wrap"><div class="ss-top"><button class="ss-back" data-c="x">← <span>Zpět do Sluneční soustavy</span></button><span class="ss-n"></span>' +
        '<button data-c="prev" aria-label="Předchozí objekt">‹</button><button data-c="next" aria-label="Další objekt">›</button><button class="ss-x" data-c="x" aria-label="Zavřít">×</button></div>' +
        '<div class="ss-left"><div class="ss-slot"></div><div class="ss-cap"></div><div class="ss-th"></div></div><div class="ss-right"></div></div>' +
        '<div class="ss-lens"><div class="ss-seed"><img alt=""></div><img class="ph" alt=""></div>'
    ),
    lens = elS.querySelector('.ss-lens'),
    seed = elS.querySelector('.ss-seed'),
    ph = elS.querySelector('img.ph'),
    slot = elS.querySelector('.ss-slot'),
    right = elS.querySelector('.ss-right');
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
      '<p class="h-ds">🌌 Na fotce Mléčné dráhy jsou i <b>objekty daleko za Sluneční soustavou</b>: mlhoviny, hvězdokupy a galaxie. Slabé kroužky se jmény se ukážou spolu se souhvězdími (<kbd>U</kbd>); i bez nich se objekt prozradí, když na něj najedeš ukazatelem. Klik ukáže jméno, <b>dvojklik objekt přiblíží</b>: fotografie z velkých dalekohledů, údaje a odkazy na zdroje. Seznam je v nabídce ☰.</p>'
    );
  if (ui.pops) ui.pops.push('#ds');
  const T = (s, v) => ui.toggle(s, v),
    isOn = (e) => e.classList.contains('on');

  // ---------- texty a výpočty ----------
  const lyNum = (o) =>
    o.ly >= 1e9
      ? [nf(o.ly / 1e9, 1), 'mld. sv. let']
      : o.ly >= 1e6
        ? [nf(o.ly / 1e6, 1), 'mil. sv. let']
        : [nf(o.ly), 'sv. let'];
  const lyShort = (o) => lyNum(o).join(' ').replace('sv. let', 'sv. l.');
  const ang = (m) => (m >= 60 ? `${nf(m / 60, 1)}°` : m >= 1 ? `${nf(m, m < 10 ? 1 : 0)}′` : `${nf(m * 60)}″`);
  const size = (o) =>
    !o.vel || !o.maj ? null : ang(o.maj) + (o.min && Math.abs(o.min - o.maj) > o.maj * 0.08 ? ' × ' + ang(o.min) : '');
  const pos = (o) => {
    const m = Math.round((o.ra / 15) * 60),
      a = Math.round(Math.abs(o.de) * 60);
    return `rektascenze ${Math.floor(m / 60)} h ${m % 60} min, deklinace ${o.de < 0 ? '−' : '+'}${Math.floor(a / 60)}° ${a % 60}′ (J2000)`;
  };
  /* viditelnost z Česka (50° s. š.) a měsíc, kdy objekt vrcholí kolem 21. hodiny – počítá se z polohy */
  const zCeska = (o) => {
    const h = o.de <= 50 ? 40 + o.de : 140 - o.de,
      den =
        (((((o.ra / 15 + 12) % 24) / 24) * 365.25 + 80 + 45) % 365.25) /
        30.44 /* 80 = 21. března, +45 dní = vrcholí už večer */,
      kdy = MESIC[Math.floor(den) % 12];
    if (h < 2) return 'Z Česka nikdy nevychází nad obzor: je to objekt jižní oblohy.';
    if (h < 12) return `Z Česka vystoupí jen těsně nad jižní obzor (nejvýš ${nf(h)}°); večer bývá nejvýš ${kdy}.`;
    if (o.de > 40) return `Z Česka nikdy nezapadá; večer bývá nejvýš (${nf(h)}° nad obzorem) ${kdy}.`;
    return `Z Česka vystoupí nejvýš ${nf(h)}° nad obzor; večer bývá nejvýš ${kdy}.`;
  };
  const NASE = [
    'Na naší fotce oblohy není vidět: je příliš malý nebo slabý. Kroužek ukazuje místo, kde leží.',
    'Na naší fotce oblohy je vidět jen slabě.',
    'Na naší fotce oblohy je dobře vidět.',
  ];
  const ref = (n) => (n >= 0 ? `<sup><a data-ref="${n + 1}">[${n + 1}]</a></sup>` : '');
  const credit = (im) => `${esc(im.autor)} · ${im.arch} · ${im.lic}`;

  // ---------- seznam ----------
  function drawList() {
    let h = '';
    for (const g in SKUP) {
      const L = OBJ.filter((o) => o.druh === g);
      if (!L.length) continue;
      h += `<h4>${SKUP[g]} <small>(${L.length})</small></h4>`;
      for (const o of L)
        h += `<button data-o="${o.id}"><img src="${img(o.imgs[0].t)}" alt="" width="38" height="38" loading="lazy"><span><b>${o.cs}</b><small>${o.ozn} · ${lyShort(o)}</small></span></button>`;
    }
    $('#ds-list').innerHTML = h;
    drawMode();
  }
  function drawMode() {
    for (const b of elL.querySelectorAll('.ds-mode button')) b.classList.toggle('sel', +b.dataset.m === mode);
  }
  function setMode(m, quiet) {
    mode = Math.max(0, Math.min(2, m | 0));
    store();
    drawMode();
    if (!mode) {
      setSel(null);
      hov = null;
    }
    if (!quiet) A.play(mode ? 'orbit_on' : 'orbit_off');
    S.wake();
  }

  // ---------- kreslení: nenápadné kroužky ve 2D vrstvě, zvýrazněný kroužek a bublina jako prvky stránky ----------
  let rKey = '',
    bKey = '';
  function place() {
    const o = live() || sel ? hov || sel : null;
    if (o && o.vis) {
      const d = Math.round(o.rr * 2 + 6),
        k = `${o.id}|${Math.round(o.sx)}|${Math.round(o.sy)}|${d}|${sel === o}`;
      if (k !== rKey) {
        rKey = k;
        elR.style.width = elR.style.height = d + 'px';
        elR.style.transform = `translate(${Math.round(o.sx - d / 2)}px,${Math.round(o.sy - d / 2)}px)`;
        elR.firstChild.textContent = o.cs;
        elR.classList.toggle('b', sel === o); /* jméno už je v bublině */
        elR.classList.add('on');
      }
    } else if (rKey) {
      rKey = '';
      elR.classList.remove('on');
    }
    if (sel && sel.vis) {
      const w = elB.offsetWidth || 220,
        hh = elB.offsetHeight || 80,
        W = basis.W,
        H = basis.H;
      let x = sel.sx + sel.rr + 12,
        y = sel.sy - hh / 2;
      if (x + w > W - 8) x = sel.sx - sel.rr - 12 - w;
      if (x < 8) {
        x = Math.max(8, Math.min(W - w - 8, sel.sx - w / 2));
        y = sel.sy + sel.rr + 26;
      }
      y = Math.max(8, Math.min(H - hh - 8, y));
      const k = `${Math.round(x)}|${Math.round(y)}`;
      if (k !== bKey) {
        bKey = k;
        elB.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px)`;
      }
    } else if (sel) setSel(null); /* objekt zmizel ze záběru */
  }
  S.overlays.push((ctx, e) => {
    basis = { W: e.W, H: e.H, F: e.F, fwd: e.fwd, right: e.right, up: e.up };
    const on = live() || !!stage,
      draw = shown(),
      tk = S.txtK || 1,
      fo = e.R && e.R[S.focus],
      boxes = [],
      other = [...(S.labRects || []), ...((S.conMode === 3 || S.starNames) && S.skyRects ? S.skyRects : [])];
    if (draw) {
      ctx.save();
      ctx.font = `500 ${10.5 * tk}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.lineJoin = 'round';
    }
    for (const o of DRAW) {
      o.vis = o.lab = false;
      if (!on) continue;
      const z = o.v.dot(e.fwd);
      if (z < 0.25) continue;
      const x = e.W / 2 + (e.F * o.v.dot(e.right)) / z,
        y = e.H / 2 - (e.F * o.v.dot(e.up)) / z;
      if (x < -30 || x > e.W + 30 || y < -30 || y > e.H + 30) continue;
      /* schované za kotoučem tělesa se nekreslí (fotka oblohy je až za ním) */
      let hid = fo && fo.pr > 3 && Math.hypot(fo.sx - x, fo.sy - y) < fo.pr;
      if (!hid) for (const it of S.items) if (it.pr > 3 && Math.hypot(it.sx - x, it.sy - y) < it.pr) hid = true;
      if (hid) continue;
      const rr = Math.max((o.vid ? 7 : 4.5) * tk, Math.min(150, (o.kr * RAD * e.F) / z));
      o.sx = x;
      o.sy = y;
      o.rr = rr;
      o.vis = true;
      if (!draw || o === hov || o === sel) continue;
      ctx.globalAlpha = 1;
      ctx.strokeStyle = o.vid ? 'rgba(214,198,255,0.34)' : 'rgba(214,198,255,0.26)';
      ctx.lineWidth = 1;
      ctx.setLineDash(o.vid ? [2, 5] : [1.5, 3]);
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, 6.2832);
      ctx.stroke();
      ctx.setLineDash([]);
      /* jméno jen u objektů, které jsou na fotce vidět. Zkouší čtyři místa kolem kroužku (pod, nad, vpravo, vlevo)
         a vezme první, kde nepřekryje jiné jméno objektu, tělesa, hvězdy ani souhvězdí; když není kde, zůstane jen kroužek */
      if (!o.vid && mode < 2) continue;
      const w = ctx.measureText(o.cs).width / 2 + 5,
        th = 13 * tk;
      for (const [cx, ty] of [
        [x, y + rr + 4],
        [x, y - rr - 4 - th],
        [x + rr + 6 + w, y - th / 2],
        [x - rr - 6 - w, y - th / 2],
      ]) {
        const b = [cx - w, ty - 2, cx + w, ty + th];
        if (b[0] < 2 || b[2] > e.W - 2 || b[1] < 2 || b[3] > e.H - 2) continue;
        const clash = (q) => b[0] < q[2] && b[2] > q[0] && b[1] < q[3] && b[3] > q[1];
        if (boxes.some(clash) || other.some(clash)) continue;
        boxes.push(b);
        o.lab = true;
        o.lw = w;
        o.tx = cx; /* pozor: o.ly je vzdálenost ve světelných letech, proto tx/ty */
        o.ty = ty;
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(3,6,12,0.6)';
        ctx.strokeText(o.cs, cx, ty);
        ctx.fillStyle = 'rgba(226,214,255,0.6)';
        ctx.fillText(o.cs, cx, ty);
        break;
      }
    }
    if (draw) ctx.restore();
    place();
  });
  /* objekt pod ukazatelem: uvnitř kroužku nebo na jménu; z překrývajících se vyhrává menší kroužek */
  function near(x, y) {
    let best = null;
    for (const o of OBJ) {
      if (!o.vis) continue;
      const d = Math.hypot(o.sx - x, o.sy - y),
        inR = d < Math.max(o.rr, 13) + 3,
        inL = o.lab && Math.abs(x - o.tx) < o.lw && y > o.ty - 3 && y < o.ty + 16;
      if ((inR || inL) && (!best || o.rr < best.rr)) best = o;
    }
    return best;
  }

  // ---------- bublina se jménem ----------
  function setSel(o) {
    if (o === sel) return;
    sel = o;
    bKey = '';
    if (o) {
      elB.innerHTML = `<b>${o.cs}</b><span>${o.typ} · ${lyShort(o)}</span><button class="pri" data-c="go">Přiblížit</button><em>nebo dvojklik</em>`;
      elB.classList.remove('on');
      void elB.offsetWidth;
      elB.classList.add('on');
      if (basis && o.vis)
        place(); /* hned na místo: jinak by bublina na okamžik zůstala u minulého objektu a spolkla druhý klik dvojkliku */
      A.play('select');
    } else elB.classList.remove('on');
    S.wake();
  }

  // ---------- pohled na objekt a zpět ----------
  const wrap = (a) => a - 2 * Math.PI * Math.round(a / (2 * Math.PI));
  function target(o) {
    /* Kamera vždy obíhá těleso a dívá se na něj; od něj se umí odklonit (rozhlédnutí). Objekt přijde doprostřed obrazu
       a těleso zůstane pod ním (u jižních objektů nad ním), dost daleko, aby objekt nezakrývalo. */
    const cam = S.cam,
      R = shape[S.focus].rmax,
      rho = Math.asin(Math.min(1, R / (R + Math.max(0, cam.altT)))),
      th = Math.asin(Math.max(-1, Math.min(1, o.v.y))),
      base = Math.max(0.24, Math.min(1.3, rho + 0.22)),
      az = Math.atan2(o.v.z, o.v.x);
    let lp = base,
      pitch = lp - th;
    if (pitch > 1.5) {
      lp = -base;
      pitch = lp - th;
    }
    return { yaw: az + Math.PI, pitch, ly: 0, lp };
  }
  function go(to, done) {
    const cam = S.cam;
    if (fast) {
      Object.assign(cam, to);
      anim = null;
      S.wake();
      if (done) requestAnimationFrame(() => requestAnimationFrame(done));
      return;
    }
    anim = {
      t: 0,
      a: { yaw: cam.yaw, pitch: cam.pitch, ly: cam.ly, lp: cam.lp },
      b: { ...to, yaw: cam.yaw + wrap(to.yaw - cam.yaw), pitch: cam.pitch + wrap(to.pitch - cam.pitch) },
      done,
    };
    S.wake();
  }
  function aim(o, done) {
    if (!o || !ok()) return;
    const cam = S.cam;
    if (cam.fly && cam.fly.ph !== 2) {
      pend = [o, done]; /* právě se letí k tělesu: počkat na přílet */
      return;
    }
    cam.fly = null;
    if (!saved || saved.focus !== S.focus)
      saved = { focus: S.focus, yaw: cam.yaw, pitch: cam.pitch, ly: cam.ly, lp: cam.lp };
    const R = shape[S.focus].rmax;
    if (cam.altT < R * 0.25) cam.altT = R * 0.25; /* těsně nad povrchem by těleso zakrylo půl oblohy */
    go(target(o), done);
  }
  function back() {
    if (!saved) return;
    const s = saved,
      cam = S.cam;
    saved = null;
    if (cam.fly) cam.fly = null;
    /* jiné těleso než při natočení (skok klávesou): jen srovnat pohled zpět na těleso */
    go(
      s.focus === S.focus
        ? { yaw: s.yaw, pitch: s.pitch, ly: s.ly, lp: s.lp }
        : { yaw: cam.yaw, pitch: cam.pitch, ly: 0, lp: 0 }
    );
  }
  let wasTut = false,
    wasCon = S.conMode > 0;
  S.ticks.push((dt) => {
    /* ukázka ovládání si scénu řídí sama: vrstva i okna jí uhnou */
    const tr = tutOn();
    if (tr && !wasTut) {
      anim = pend = saved = null;
      if (stage) closeStage(true);
      setSel(null);
      hov = null;
      if (isOn(elL)) T('#ds', false);
    }
    wasTut = tr;
    /* první zapnutí souhvězdí: krátké vysvětlení, co jsou ty slabé kroužky */
    const con = S.conMode > 0;
    if (con && !wasCon && !told && mode === 1 && ok() && !tr && !cls('cine')) {
      told = true;
      store();
      ui.toast(
        '✦ Slabé kroužky na obloze jsou mlhoviny, hvězdokupy a galaxie daleko za Sluneční soustavou. Klik ukáže jméno, dvojklik objekt přiblíží.',
        8000
      );
    }
    wasCon = con;
    if (pend && !S.cam.fly) {
      const p = pend;
      pend = null;
      aim(p[0], p[1]);
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
        if (d) requestAnimationFrame(() => requestAnimationFrame(d));
      }
      S.wake();
    }
    if (sel && (ukOn() || !ok())) setSel(null);
  });

  // ---------- scéna objektu ----------
  const D_IN = 1500,
    D_OUT = 750,
    EASE = 'cubic-bezier(.33,.02,.18,1)';
  const fit = (im) => {
    /* nejdřív největší plocha, kterou rozložení fotografii dává; pak se místo zúží na její skutečnou výšku,
       aby popisek a náhledy seděly hned pod ní a celek byl svisle uprostřed */
    slot.style.flex = '';
    slot.style.height = '';
    const r = slot.getBoundingClientRect(),
      a = im.w / im.h;
    let w = r.width,
      h = w / a;
    if (h > r.height) {
      h = r.height;
      w = h * a;
    }
    slot.style.flex = 'none';
    slot.style.height = h + 'px';
    const q = slot.getBoundingClientRect();
    return { x: q.left + (q.width - w) / 2, y: q.top, w, h };
  };
  const setRect = (q) => {
    lens.style.left = q.x + 'px';
    lens.style.top = q.y + 'px';
    lens.style.width = q.w + 'px';
    lens.style.height = q.h + 'px';
  };
  const circle = (o) => {
    const r = Math.max(o.rr, 9);
    return { x: o.sx - r, y: o.sy - r, w: 2 * r, h: 2 * r, r };
  };
  const kf = (q, rad) => ({
    left: q.x + 'px',
    top: q.y + 'px',
    width: q.w + 'px',
    height: q.h + 'px',
    borderRadius: rad,
  });
  function tiles(o) {
    const d = lyNum(o),
      s = size(o);
    let h = `<div><b>${o.lyz || ''}${d[0]}</b><i>${d[1]}${ref(o.lysrc)}</i><small>vzdálenost</small></div>`;
    if (s) h += `<div><b>${s}</b><i>Měsíc v úplňku: 0,5°${ref(o.kref)}</i><small>velikost na obloze</small></div>`;
    if (o.mag != null)
      h += `<div><b>${nf(o.mag, 1)} mag</b><i>okem do asi 6 mag${ref(o.kref)}</i><small>jasnost</small></div>`;
    h += `<div><b>${o.souhv}</b><i>${o.de < -40 ? 'jižní obloha' : o.de > 40 ? 'severní obloha' : 'vidět i z Česka'}</i><small>souhvězdí</small></div>`;
    return h;
  }
  function ladder(o) {
    const p = (ly) => (Math.log10(ly) / 10.2) * 100,
      x = p(o.ly),
      M = [
        [1, '1 sv. rok', 'a'],
        [1e3, 'tisíc'],
        [1e6, 'milion'],
        [1e9, 'miliarda sv. let'],
      ];
    return (
      '<div class="ss-lad">' +
      M.map((m) => `<u class="${m[2] || ''}" style="left:${p(m[0])}%"><span>${m[1]}</span></u>`).join('') +
      `<s class="${x < 16 ? 'a' : x > 84 ? 'z' : ''}" style="left:${x}%"><span>${o.cs}: ${lyShort(o)}</span></s></div>` +
      '<small>Stupnice je logaritmická: každý dílek je tisíckrát dál. Nejbližší hvězda je 4,2 světelného roku daleko, střed naší Galaxie 27 000 a galaxie v Andromedě 2,5 milionu.</small>'
    );
  }
  function tab(o, t) {
    const a = (u, x) => `<a href="${u}" target="_blank" rel="noopener noreferrer">${esc(x)}</a>`;
    if (t === 'kde') {
      const u = (((0.25 - o.ra / 360) % 1) + 1) % 1,
        v = 0.5 - o.de / 180,
        rp = Math.max(7, Math.min(92, ((2 * o.kr) / o.pole) * 100));
      return (
        `<div class="ss-sky" style="background-image:url(${AS('maps/milkyway.webp')})"><i style="left:${u * 100}%;top:${v * 100}%"></i></div>` +
        '<p><small>Celá obloha, jak ji kreslí aplikace (pás je Mléčná dráha, nahoře severní nebeský pól). Kroužek ukazuje, kde objekt leží.</small></p>' +
        `<div class="ss-kde"><div class="ss-our"><img src="${img(o.id + '_nase.webp')}" alt="${esc(o.cs)} na fotce oblohy v aplikaci"><i style="width:${rp}%;height:${rp}%"></i></div>` +
        `<div><p><b>${o.nase || NASE[o.vid]}</b> <small>Výřez má ${nf(o.pole)}° × ${nf(o.pole)}°.</small></p><p>Souhvězdí ${o.souhv}; ${pos(o)}${ref(o.kref)}.</p>` +
        `<p>${zCeska(o)} <small>(vypočteno z polohy)</small></p></div></div><h5>Jak daleko to je</h5>${ladder(o)}` +
        (o.lytxt ? `<p><small>Vzdálenost: ${o.lytxt}.</small></p>` : '')
      );
    }
    if (t === 'zdr')
      return (
        '<ol>' +
        o.src.map((x, k) => `<li id="ss-s${k + 1}">${a(x.u, x.t)}</li>`).join('') +
        '</ol><h5>Fotografie</h5><ol>' +
        o.imgs
          .map((im) => `<li>${im.cap} – ${a(im.url, 'stránka snímku')}<br><small>${credit(im)}</small></li>`)
          .join('') +
        `</ol><p><small>Údaje a odkazy: stav ${STAV}. Texty jsou stručné shrnutí uvedených zdrojů, fotografie jsou zmenšené. Odkazy se otevírají v novém okně a potřebují internet; aplikace sama z internetu nic nenačítá.</small></p>`
      );
    return (
      o.txt.map((p) => `<p>${nb(p)}</p>`).join('') +
      (o.foto ? `<p class="ss-foto"><b>Na fotografiích.</b> ${nb(o.foto)}</p>` : '')
    );
  }
  function fill(o) {
    const i = OBJ.indexOf(o);
    stage.ii = 0;
    stage.tab = 'co';
    elS.querySelector('.ss-n').textContent = `${i + 1} / ${OBJ.length}`;
    right.innerHTML =
      `<div class="ss-kick">${SKUP[o.druh]} · souhvězdí ${o.souhv}</div><h2>${o.cs}</h2><div class="ss-ozn">${o.ozn} · ${o.typ}</div><p class="ss-lead">${nb(o.lead)}</p>` +
      `<div class="ss-tiles">${tiles(o)}</div><div class="ss-tabs"><button data-t="co" class="sel">Co to je</button><button data-t="kde">Kde to je</button><button data-t="zdr">Zdroje</button></div>` +
      `<div class="ss-body">${tab(o, 'co')}</div>`;
    right.scrollTop = 0;
    elS.querySelector('.ss-th').innerHTML =
      o.imgs.length > 1
        ? o.imgs
            .map(
              (im, k) =>
                `<button data-i="${k}" class="${k ? '' : 'sel'}" aria-label="${esc(im.cap)}"><img src="${img(im.t)}" alt=""></button>`
            )
            .join('')
        : '';
    photo(o, 0, true);
    seed.firstChild.src = img(o.id + '_nase.webp');
  }
  function photo(o, k, first) {
    const im = o.imgs[k];
    stage.ii = k;
    elS.querySelector('.ss-cap').innerHTML = `<b>${im.cap}</b><br>${credit(im)}`;
    for (const b of elS.querySelectorAll('.ss-th button')) b.classList.toggle('sel', +b.dataset.i === k);
    if (first) {
      ph.src = img(im.f);
      ph.alt = o.cs + ': ' + im.cap;
      return;
    }
    ph.style.opacity = 0;
    setTimeout(
      () => {
        if (!stage || stage.o !== o) return;
        ph.src = img(im.f);
        ph.alt = o.cs + ': ' + im.cap;
        const q = fit(im);
        if (!fast) {
          const r = lens.getBoundingClientRect();
          lens.animate([kf({ x: r.left, y: r.top, w: r.width, h: r.height }, '14px'), kf(q, '14px')], {
            duration: 320,
            easing: 'ease',
          });
        }
        setRect(q);
        ph.style.opacity = 1;
      },
      fast ? 0 : 200
    );
  }
  /* úhel, o který je nebeský sever v místě objektu na obrazovce otočený od svislice (výřez z naší fotky má sever nahoře) */
  function northRot(o) {
    if (!basis) return 0;
    const pr = (v) => {
      const z = v.dot(basis.fwd);
      return [(basis.F * v.dot(basis.right)) / z, (-basis.F * v.dot(basis.up)) / z];
    };
    const a = pr(o.v),
      b = pr(o.vn);
    return Math.atan2(b[0] - a[0], -(b[1] - a[1])) / RAD;
  }
  function zoomIn(o) {
    if (!stage || stage.o !== o) return;
    const E = fit(o.imgs[0]),
      vis = o.vis && basis,
      c = vis ? circle(o) : { x: innerWidth / 2 - 12, y: innerHeight / 2 - 12, w: 24, h: 24, r: 12 };
    /* výřez z naší fotky vyplní kroužek přesně tím, co je pod ním, a roste s ním */
    seed.style.setProperty('--k', vis ? (o.pole * RAD * basis.F) / (2 * c.r) : 6);
    seed.style.setProperty('--rot', (vis ? northRot(o) : 0) + 'deg');
    lens.style.display = 'block';
    setRect(E);
    stage.ph = 'in';
    const end = () => {
      if (!stage || stage.o !== o) return;
      stage.ph = 'open';
      for (const e of [lens, seed, ph]) for (const a of e.getAnimations()) a.cancel();
      seed.style.opacity = 0;
      ph.style.opacity = 1;
    };
    if (fast) {
      elS.classList.add('txt');
      end();
      return;
    }
    seed.style.opacity = 1;
    ph.style.opacity = 0;
    lens.animate([kf(c, '50%'), kf(E, '14px')], { duration: D_IN, easing: EASE });
    seed.animate([{ opacity: 1 }, { opacity: 1, offset: 0.4 }, { opacity: 0, offset: 0.8 }, { opacity: 0 }], {
      duration: D_IN,
      fill: 'forwards',
    });
    ph.animate(
      [
        { opacity: 0, filter: 'blur(16px)' },
        { opacity: 0, filter: 'blur(16px)', offset: 0.32 },
        { opacity: 1, filter: 'blur(5px)', offset: 0.78 },
        { opacity: 1, filter: 'blur(0px)' },
      ],
      { duration: D_IN, fill: 'forwards' }
    );
    setTimeout(() => stage && stage.o === o && elS.classList.add('txt'), D_IN * 0.72);
    setTimeout(end, D_IN + 30);
  }
  const clearAnims = () => {
    for (const e of [lens, seed, ph]) for (const a of e.getAnimations()) a.cancel();
    lens.style.opacity = '';
    seed.style.opacity = '';
    ph.style.opacity = '';
  };
  function openStage(o) {
    if (!o || !ok() || stage || tutOn()) return;
    if (isOn(elL) && cls('mob')) T('#ds', false);
    const wasVis = o.vis && basis && o.sx > 40 && o.sy > 40 && o.sx < basis.W - 40 && o.sy < basis.H - 40;
    hov = null;
    setSel(null);
    stage = { o, ph: 'aim', ii: 0, tab: 'co', t0: performance.now() };
    clearAnims();
    lens.style.display = 'none';
    elS.classList.remove('txt', 'foto', 'sw', 'in');
    elS.classList.add('on');
    document.body.classList.add('ds-stage');
    fill(o);
    A.play('panel_open');
    requestAnimationFrame(() => stage && elS.classList.add('in'));
    const start = () => {
      S.wake();
      const p = ph.decode ? ph.decode().catch(() => 0) : Promise.resolve();
      p.then(() => requestAnimationFrame(() => zoomIn(o)));
    };
    if (wasVis) start();
    else aim(o, start); /* objekt není v záběru (výběr ze seznamu, je za tělesem): nejdřív k němu natočit pohled */
    S.wake();
  }
  function swap(o) {
    /* listování uvnitř scény: obsah se vymění, pohled za závojem se potichu natočí na nový objekt */
    if (!stage || stage.ph !== 'open' || !o || o === stage.o) return;
    elS.classList.add('sw');
    ph.style.opacity = 0;
    setTimeout(
      () => {
        if (!stage) return;
        stage.o = o;
        const cam = S.cam;
        if (!cam.fly) {
          if (!saved || saved.focus !== S.focus)
            saved = { focus: S.focus, yaw: cam.yaw, pitch: cam.pitch, ly: cam.ly, lp: cam.lp };
          Object.assign(cam, target(o));
        }
        S.wake();
        fill(o);
        setRect(fit(o.imgs[0]));
        ph.style.opacity = 1;
        elS.classList.remove('sw');
      },
      fast ? 0 : 190
    );
  }
  function closeStage(now) {
    if (!stage || stage.ph === 'out') return;
    const o = stage.o,
      quick = now === true || fast;
    stage.ph = 'out';
    elS.classList.remove('txt', 'foto');
    A.play('panel_close');
    const done = () => {
      clearAnims();
      lens.style.display = 'none';
      elS.classList.remove('on', 'in', 'sw');
      stage = null;
      S.wake();
      if (now !== true) back(); /* pohled se vrátí tam, kde byl před přiblížením */
    };
    document.body.classList.remove('ds-stage');
    elS.classList.remove('in');
    if (quick) return done();
    S.wake();
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const r = lens.getBoundingClientRect(),
          from = kf({ x: r.left, y: r.top, w: r.width, h: r.height }, '14px');
        if (o.vis && basis && lens.style.display !== 'none') {
          const c = circle(o);
          seed.style.setProperty('--k', (o.pole * RAD * basis.F) / (2 * c.r));
          seed.style.setProperty('--rot', northRot(o) + 'deg');
          lens.animate([from, kf(c, '50%')], { duration: D_OUT, easing: EASE, fill: 'forwards' });
          seed.animate([{ opacity: 0 }, { opacity: 1, offset: 0.6 }, { opacity: 1 }], {
            duration: D_OUT,
            fill: 'forwards',
          });
          ph.animate([{ opacity: 1 }, { opacity: 0, offset: 0.7 }, { opacity: 0 }], {
            duration: D_OUT,
            fill: 'forwards',
          });
          lens.animate([{ opacity: 1 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], {
            duration: D_OUT,
            fill: 'forwards',
          });
        } else lens.animate([{ opacity: 1 }, { opacity: 0 }], { duration: D_OUT, fill: 'forwards' });
        setTimeout(done, D_OUT + 20);
      })
    );
  }
  const showTab = (o, t) => {
    stage.tab = t;
    for (const q of right.querySelectorAll('.ss-tabs button')) q.classList.toggle('sel', q.dataset.t === t);
    right.querySelector('.ss-body').innerHTML = tab(o, t);
  };
  elS.addEventListener('click', (e) => {
    if (!stage || (!fast && performance.now() - stage.t0 < 900)) return; /* doznívající kliky z dvojkliku a pětikliku */
    const o = stage.o,
      b = e.target.closest('[data-c]'),
      n = OBJ.length;
    if (b) {
      const c = b.dataset.c;
      if (c === 'x') closeStage();
      else swap(OBJ[(OBJ.indexOf(o) + (c === 'next' ? 1 : n - 1)) % n]);
      return;
    }
    const t = e.target.closest('[data-t]');
    if (t) return showTab(o, t.dataset.t);
    const th = e.target.closest('[data-i]');
    if (th) return photo(o, +th.dataset.i);
    const r = e.target.closest('[data-ref]');
    if (r) {
      showTab(o, 'zdr');
      const li = right.querySelector('#ss-s' + r.dataset.ref);
      if (li) li.scrollIntoView({ block: 'center' });
      return;
    }
    if (e.target.closest('.ss-lens') && stage.ph === 'open') {
      /* klik na fotografii: jen fotka přes celou plochu, druhý klik zpět */
      const rc = lens.getBoundingClientRect();
      elS.classList.toggle('foto');
      const q = fit(o.imgs[stage.ii]);
      if (!fast)
        lens.animate([kf({ x: rc.left, y: rc.top, w: rc.width, h: rc.height }, '14px'), kf(q, '14px')], {
          duration: 320,
          easing: 'ease',
        });
      setRect(q);
    }
  });
  window.addEventListener('resize', () => stage && stage.ph === 'open' && setRect(fit(stage.o.imgs[stage.ii])));

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
    if (cls('mob') && isOn(elL) && e.isTrusted) T('#ds', false);
  });
  cv.addEventListener('wheel', () => (anim = null), { passive: true });
  cv.addEventListener('pointerup', (e) => {
    const d = dn;
    dn = null;
    if (!live() || !d || d.b !== 0 || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5) return;
    if (S.pick(e.clientX, e.clientY) >= 0) return setSel(null); /* těleso má přednost */
    const o = near(e.clientX, e.clientY),
      now = e.timeStamp; /* čas události, ne čas zpracování: na pomalém stroji by se dvojklik jinak nepoznal */
    if (!o) return setSel(null);
    if (o === lastO && now - lastT < 420) {
      lastT = 0;
      return openStage(o);
    }
    lastT = now;
    lastO = o;
    setSel(o);
  });
  cv.addEventListener('pointermove', (e) => {
    if (e.buttons || e.pointerType === 'touch') return;
    const h = live() && S.pick(e.clientX, e.clientY) < 0 ? near(e.clientX, e.clientY) : null;
    if (h !== hov) {
      hov = h;
      S.wake();
    }
    if (h) cv.style.cursor = 'pointer';
    else if (S.hover < 0 && cv.style.cursor === 'pointer') cv.style.cursor = 'grab';
  });
  cv.addEventListener('pointerleave', () => {
    if (hov) {
      hov = null;
      S.wake();
    }
  });
  elB.addEventListener('click', (e) => e.target.closest('[data-c="go"]') && sel && openStage(sel));
  elL.addEventListener('click', (e) => {
    if (e.target.closest('[data-c="x"]')) return T('#ds', false);
    const m = e.target.closest('[data-m]');
    if (m) return setMode(+m.dataset.m);
    const b = e.target.closest('[data-o]');
    if (b) openStage(byId.get(b.dataset.o));
  });
  window.addEventListener(
    'keydown',
    (e) => {
      if (stage) {
        /* scéna má klávesnici pro sebe: Esc zavře, šipky listují; zkratky aplikace pod ní nereagují */
        e.stopImmediatePropagation();
        if (e.key === 'Escape') {
          e.preventDefault();
          if (elS.classList.contains('foto')) lens.click();
          else closeStage();
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const n = OBJ.length;
          swap(OBJ[(OBJ.indexOf(stage.o) + (e.key === 'ArrowRight' ? 1 : n - 1)) % n]);
        }
      } else if (e.key === 'Escape' && sel) setSel(null);
    },
    true
  );
  function act() {
    if (!ok()) return;
    if (T('#ds')) drawList();
  }
  if (ui.actions) ui.actions.ds = act;
  /* přelet k tělesu: seznam a bublina nezůstávají viset (stejné pravidlo jako u ostatních oken od verze 1.8a) */
  S.bus.on('fly', () => {
    anim = null;
    saved = null;
    if (tutOn()) return;
    setSel(null);
    if (isOn(elL)) T('#ds', false);
  });
  const modeOff = () => {
    if (ok()) return;
    hov = null;
    anim = pend = saved = null;
    if (stage) closeStage(true);
    setSel(null);
    if (isOn(elL)) T('#ds', false);
  };
  if (S.F && S.F.onChange) S.F.onChange(modeOff);

  return {
    ids: () => OBJ.map((o) => o.id),
    get: (id) => byId.get(id),
    list: act,
    mode: (m) => (m === undefined ? mode : setMode(m, true)),
    fast: (v) => (fast = !!v),
    sel: (id) => setSel(id ? byId.get(id) : null),
    open: (id) => openStage(byId.get(id)),
    close: closeStage,
    aim: (id) => aim(byId.get(id)),
    back,
    near,
    zCeska: (id) => zCeska(byId.get(id)),
    state: () => ({
      mode,
      live: live(),
      shown: shown(),
      hov: hov && hov.id,
      sel: sel && sel.id,
      stage: stage && { id: stage.o.id, ph: stage.ph, tab: stage.tab, ii: stage.ii },
      anim: !!anim,
      saved: !!saved,
      vis: OBJ.filter((o) => o.vis).map((o) => ({ id: o.id, x: o.sx, y: o.sy, r: o.rr, lab: !!o.lab })),
    }),
  };
}
