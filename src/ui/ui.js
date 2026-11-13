// Soustava 200 – ovládání, panely, deník astronoma (hra).
import { B, N, P, idx, par, kids, root, SUN, EARTH, AU, period, semi, shape } from '../core/sim.js';
import { factsOf } from '../data/facts.js';
import { drawBall, ballSize, loadMap } from '../render/ball.js';
import { RATE_LABEL } from '../render/engine.js';
import { createTutorial } from './tutorial.js';
import CAT from '../data/cat.json';

const $ = (s) => document.querySelector(s),
  el = (t, c, h) => {
    const e = document.createElement(t);
    if (c) e.className = c;
    if (h !== undefined) e.innerHTML = h;
    return e;
  };
const SUNN = ['bílé světlo', 'H-alfa', 'EUV 304 Å', 'koronograf'];
const nf = (x, d = 0) => x.toLocaleString('cs-CZ', { maximumFractionDigits: d, minimumFractionDigits: 0 });
const sig = (x) => (x >= 100 ? nf(x) : x >= 10 ? nf(x, 1) : x >= 1 ? nf(x, 2) : nf(x, 3));
const TYPE = {
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
const GROUPS = [
  ['star', 'Slunce'],
  ['planet', 'Planety'],
  ['dwarf', 'Trpasličí planety'],
  ['moon', 'Měsíce'],
  ['asteroid', 'Planetky'],
  ['comet', 'Komety'],
  ['tno', 'Za Neptunem'],
  ['centaur', 'Kentauři'],
  ['interstellar', 'Od jiných hvězd'],
];
const GEN = {
  mars: 'Marsu',
  jupiter: 'Jupiteru',
  saturn: 'Saturnu',
  uranus: 'Uranu',
  neptune: 'Neptunu',
  earth: 'Země',
  pluto: 'Pluta',
  eris: 'Eris',
  haumea: 'Haumey',
  quaoar: 'Quaoaru',
  orcus: 'Orku',
  ida: 'planetky Ida',
  didymos: 'planetky Didymos',
};
export const fmtDist = (km) =>
  km < 1
    ? nf(km * 1000) + ' m'
    : km < 1e4
      ? sig(km) + ' km'
      : km < 1e6
        ? nf(Math.round(km)) + ' km'
        : km < 0.02 * AU
          ? sig(km / 1e6) + ' mil. km'
          : sig(km / 1e6) + ' mil. km (' + sig(km / AU) + ' AU)';
// délka v lidských jednotkách: 0,018 m → 1,8 cm
const fmtLen = (m) =>
  m < 0.01 ? sig(m * 1000) + ' mm' : m < 1 ? sig(m * 100) + ' cm' : m < 1000 ? sig(m) + ' m' : sig(m / 1000) + ' km';
const fmtLight = (km) => {
  const s = km / 299792.458;
  return s < 1
    ? nf(s * 1000) + ' ms'
    : s < 90
      ? nf(s, 1) + ' s'
      : s < 5400
        ? nf(s / 60, 1) + ' min'
        : s < 172800
          ? nf(s / 3600, 1) + ' h'
          : nf(s / 86400, 1) + ' dne';
};
const fmtPer = (d) =>
  !isFinite(d)
    ? 'nevrátí se'
    : d < 2
      ? nf(d * 24, 1) + ' h'
      : d < 800
        ? nf(d, 1) + ' dne'
        : d < 365.25 * 2000
          ? sig(d / 365.25) + ' roku'
          : nf(Math.round(d / 365.25 / 100) * 100) + ' let';
/* přirovnání velikosti: [horní mez průměru v km, text] */
const SIZES = [
  [0.06, 'jako velký dům'],
  [0.4, 'jako stadion'],
  [2, 'jako kopec'],
  [15, 'jako velké město'],
  [80, 'jako Praha s okolím'],
  [600, 'jako Česká republika'],
  [1800, 'jako střední Evropa'],
  [6000, 'jako celá Evropa'],
  [16000, 'podobně jako Země'],
];
const sizeLike = (D) => (SIZES.find((x) => D < x[0]) || [0, nf(D / 12742, 1) + '× větší než Země'])[1];
const ICOLS = CAT.iconCols || 16,
  FRAC = { saturn: 0.42, uranus: 0.42, chariklo: 0.42, haumea: 0.42 };
// ikona = výřez z atlasu podobizen. Průměr kotouče roste s logaritmem poloměru: t = (log10 R + 1) / 6,84, průměr = base · (0,16 + 0,84 · t^2,2)
// → Slunce 1,00 · Jupiter 0,76 · Saturn 0,74 · Uran 0,66 · Země 0,55 · Mars 0,50 · Merkur 0,48 · Měsíc 0,45 · Ceres 0,37 · balvan 0,16.
// Buňka s prstenci je širší (kotouč v ní zabírá 42 %), aby kotouč Saturnu zůstal ve správném poměru k Jupiteru.
export const icoDia = (b, base) =>
  base * (0.16 + 0.84 * Math.pow(Math.min(1, Math.max(0, (Math.log10(b.R) + 1) / 6.84)), 2.2));
const ico = (i, base, fit) => {
  const b = B[i],
    comet = b.type === 'comet' || b.coma,
    sz = Math.round(comet ? base * 0.72 : icoDia(b, base) / (FRAC[b.id] || 0.94));
  return `<i class="ic" style="width:${sz}px;height:${sz}px;${fit && sz > fit ? `margin:${-Math.ceil((sz - fit) / 2)}px 0;` : ''}background-size:${ICOLS * sz}px auto;background-position:-${(i % ICOLS) * sz}px -${Math.floor(i / ICOLS) * sz}px"></i>`;
};
const icoD = (i, dia) => {
  const b = B[i],
    sz = Math.max(2, Math.round(b.type === 'comet' ? dia * 2.4 : dia / (FRAC[b.id] || 0.94)));
  return `<i class="ic" style="width:${sz}px;height:${sz}px;background-size:${ICOLS * sz}px auto;background-position:-${(i % ICOLS) * sz}px -${Math.floor(i / ICOLS) * sz}px"></i>`;
};
const U = (y, m, d, h = 12, mi = 0) => Date.UTC(y, m - 1, d, h, mi) / 86400000 + 2440587.5;
// stroj času: [popis, juliánské datum, těleso, výška v poloměrech]
const EVENTS = [
  ['Úplné zatmění Slunce nad Španělskem (12. 8. 2026)', U(2026, 8, 12, 18, 0), 'earth', 4.5],
  ['Úplné zatmění Slunce nad Egyptem (2. 8. 2027)', U(2027, 8, 2, 10, 7), 'earth', 4.5],
  ['Apollo 11 přistává na Měsíci (20. 7. 1969)', U(1969, 7, 20, 20, 17), 'moon', 3.2],
  ['Halleyova kometa u Slunce (9. 2. 1986)', U(1986, 2, 9), 'halley', 2e6],
  ['Halleyova kometa se vrací (28. 7. 2061)', U(2061, 7, 28), 'halley', 2e6],
  ['New Horizons u Pluta (14. 7. 2015)', U(2015, 7, 14, 11, 49), 'pluto', 3.4],
  ['Voyager 2 u Neptunu (25. 8. 1989)', U(1989, 8, 25, 4, 0), 'neptune', 3.4],
  ['ʻOumuamua nejblíž Slunci (9. 9. 2017)', U(2017, 9, 9), 'oumuamua', 30],
  ['Kometa Hale-Bopp v plné kráse (1. 4. 1997)', U(1997, 4, 1), 'hale_bopp', 1.5e6],
  ['Kometa Ikeya-Seki těsně u Slunce (21. 10. 1965)', U(1965, 10, 21, 4, 0), 'ikeya_seki', 3e6],
  ['Duende míjí Zemi (15. 2. 2013)', U(2013, 2, 15, 19, 25), 'duende', 40],
  ['Apophis prolétá kolem Země (13. 4. 2029, dráha jen přibližná)', U(2029, 4, 13, 21, 46), 'apophis', 40],
  ['Galileo objevuje měsíce Jupiteru (7. 1. 1610)', U(1610, 1, 7, 18, 0), 'jupiter', 30],
].filter((e) => idx.has(e[2]));
const FUN = {
  sun: 'Do Slunce by se vešlo 1,3 milionu Zemí. A přesto je to jen středně velká hvězda!',
  mercury: 'Na Merkuru trvá jeden den déle než jeden rok. Slunce tam umí na obloze couvat.',
  venus: 'Na Venuši prší kyselina sírová, ale kapky se vypaří dřív, než dopadnou.',
  earth: 'Země je jediné místo ve vesmíru, o kterém víme, že tam roste čokoláda.',
  moon: 'Stopy astronautů na Měsíci vydrží miliony let. Nefouká tam vítr, který by je smazal.',
  mars: 'Na Marsu je západ slunce modrý a přes den je obloha růžová. Přesně naopak než u nás!',
  jupiter: 'Velká rudá skvrna je bouře, která zuří déle než 190 let. Vešla by se do ní celá Země.',
  saturn: 'Saturn je tak lehký, že by plaval ve vodě. Jen sehnat tak velkou vanu…',
  uranus: 'Uran se kutálí po své dráze jako míč. Léto na pólu tam trvá 21 let.',
  neptune: 'Na Neptunu fouká vítr rychlostí 2 000 km/h. Rychleji než stíhačka!',
  pluto: 'Pluto má srdce z dusíkového ledu velké jako půl Evropy.',
  io: 'Io je samá sopka. Soptí jich tam přes 400 najednou.',
  europa: 'Pod ledem Europy je víc vody než ve všech pozemských oceánech dohromady.',
  titan: 'Na Titanu bys mohl létat mávnutím rukou. Vzduch je hustý a tíže malá.',
  enceladus: 'Enceladus stříká do vesmíru gejzíry vody. Ty bílé čáry u jižního pólu jsou ony!',
  mimas: 'Tohle není vesmírná stanice. Je to měsíc. I když ten kráter vypadá podezřele…',
  halley: 'Halleyovu kometu vidí člověk nejvýš dvakrát za život. Příště přiletí v roce 2061.',
  oumuamua: 'ʻOumuamua přiletěla od jiné hvězdy a letí tak rychle, že ji Slunce neudrží.',
  ceres: 'Ceres má na povrchu bílé skvrny ze soli. Dřív si lidé mysleli, že to jsou světla.',
  phobos: 'Phobos obíhá Mars rychleji, než se Mars točí. Vychází proto na západě!',
  ganymede: 'Ganymed je větší než planeta Merkur. Kdyby obíhal Slunce, byla by to planeta.',
  triton: 'Triton obíhá pozpátku. Nejspíš ho Neptun kdysi dávno ukradl.',
  charon: 'Charon a Pluto se na sebe pořád dívají stejnou stranou. Jako tanečníci.',
  '67p': 'Na téhle kometě přistál robot Philae. Odrazil se a skákal skoro dvě hodiny.',
  vesta: 'Kousky Vesty občas spadnou na Zemi jako meteority. Můžeš si je prohlédnout v muzeu.',
};
const MISSIONS = [
  ['sun', 'Najdi hvězdu, kolem které všechno obíhá.'],
  ['moon', 'Jediné cizí těleso, po kterém se prošli lidé.'],
  ['mars', 'Červená planeta s nejvyšší sopkou Sluneční soustavy.'],
  ['saturn', 'Která planeta má nejkrásnější prstence?'],
  ['jupiter', 'Největší planeta. Má Velkou rudou skvrnu.'],
  ['venus', 'Nejteplejší planeta, celá zahalená v mracích.'],
  ['mercury', 'Nejmenší planeta, nejblíž Slunci.'],
  ['io', 'Měsíc, na kterém pořád soptí sopky. Obíhá kolem největší planety.'],
  ['europa', 'Pod ledem tohoto Jupiterova měsíce se skrývá oceán.'],
  ['titan', 'Jediný měsíc s hustou oranžovou atmosférou a jezery.'],
  ['pluto', 'Trpasličí planeta s velkým světlým srdcem.'],
  ['halley', 'Kometa, která se vrací každých 76 let.'],
  ['phobos', 'Brambůrkovitý měsíc Marsu, který pomalu padá k planetě.'],
  ['enceladus', 'Malý bílý měsíc Saturnu, ze kterého tryskají gejzíry.'],
  ['ganymede', 'Největší měsíc celé Sluneční soustavy.'],
  ['ceres', 'Největší těleso v pásu planetek mezi Marsem a Jupiterem.'],
  ['oumuamua', 'První návštěvník od jiné hvězdy. Tvarem připomíná doutník.'],
  ['bennu', 'Planetka, ze které sonda OSIRIS-REx přivezla vzorek na Zemi.'],
  ['triton', 'Velký měsíc Neptunu, který obíhá pozpátku.'],
  ['miranda', 'Měsíc Uranu, který vypadá jako poslepovaný z kousků.'],
  ['iapetus', 'Měsíc Saturnu: jedna půlka tmavá, druhá bílá.'],
  ['mimas', 'Měsíc s obřím kráterem – vypadá jako Hvězda smrti.'],
  ['charon', 'Velký souputník Pluta.'],
  ['67p', 'Kometa ve tvaru gumové kachničky. Přistál na ní modul Philae.'],
  ['vesta', 'Jasná planetka s obřím kráterem na jižním pólu. Navštívila ji sonda Dawn.'],
  ['uranus', 'Planeta, která se po své dráze kutálí naležato.'],
  ['neptune', 'Nejvzdálenější planeta – modrá a větrná.'],
  ['eros', 'První planetka, na které přistála sonda.'],
  ['dimorphos', 'Měsíček planetky, do kterého schválně narazila sonda DART.'],
  ['arrokoth', 'Nejvzdálenější těleso navštívené sondou. Vypadá jako sněhulák.'],
  ['sedna', 'Jedno z nejvzdálenějších těles – jeden oběh mu trvá přes 11 000 let.'],
  ['hyperion', 'Měsíc Saturnu podobný mořské houbě.'],
  ['borisov', 'Kometa, která přiletěla od jiné hvězdy.'],
  ['atlas3i', 'Nejrychlejší návštěvník od jiné hvězdy.'],
  ['deimos', 'Menší ze dvou měsíců Marsu.'],
  ['callisto', 'Jupiterův měsíc s nejvíc krátery ze všech.'],
].filter((m) => idx.has(m[0]));
const RANKS = [
  [0, 'Zvědavec'],
  [80, 'Pozorovatel'],
  [250, 'Kadet'],
  [600, 'Navigátor'],
  [1200, 'Kapitán'],
  [2500, 'Admirál'],
  [5000, 'Vesmírný profesor'],
];
const PTS = {
  star: 10,
  planet: 10,
  dwarf: 15,
  moon: 10,
  asteroid: 15,
  comet: 20,
  tno: 20,
  centaur: 20,
  interstellar: 30,
};

// Poznámka na kartě u těles, kde mapa není úplná nebo ukazuje něco jiného než pohled okem – aby prázdná místa nevypadala jako chyba.
const COVER = {
  saturn:
    'Mapa z Cassini (2011) s pásem velké bouře; rovníkový pás a póly zakrývaly prstence a stín – jsou doplněné hladce. Kontrast je zesílený.',
  venus: 'Z dálky oblačnost; zblízka radarová mapa povrchu (Magellan), barvy jsou dodané uměle.',
  pluto: 'Jižní třetinu žádná sonda neviděla – je vyplněná hladce, bez kresby.',
  charon: 'Jih žádná sonda neviděla – je vyplněný hladce. Odvrácená strana je vyfocená jen z dálky.',
  triton: 'Voyager 2 vyfotil jen asi 60 % povrchu; zbytek je vyplněný hladce.',
  europa: 'Mapa je složená ze snímků různé ostrosti; okolí jižního pólu chybí.',
  ganymede: 'Okolí pólů je vyfocené jen zhruba.',
  callisto: 'Okolí pólů je vyfocené jen zhruba.',
  mercury: 'Okolí pólů leží ve stínu, mapa tam končí.',
  miranda: 'Voyager 2 (1986) viděl jen jižní polokouli; sever byl ve tmě.',
  ariel: 'Voyager 2 (1986) viděl jen jižní polokouli; sever byl ve tmě.',
  umbriel: 'Voyager 2 (1986) viděl jen jižní polokouli; sever byl ve tmě.',
  titania: 'Voyager 2 (1986) viděl jen jižní polokouli; sever byl ve tmě.',
  oberon: 'Voyager 2 (1986) viděl jen jižní polokouli; sever byl ve tmě.',
};
export function createUI(S, A) {
  // pořadí pro Tab: Slunce, planety se svými měsíci, trpasličí planety, planetky, kentauři, TNO, komety, mezihvězdné
  const order = [],
    helio = (t) =>
      B.map((b, i) => i)
        .filter((i) => par[i] === SUN && B[i].type === t)
        .sort((a, b) =>
          t === 'asteroid' || t === 'comet' ? B[b].fame - B[a].fame || B[b].R - B[a].R : semi[a] - semi[b]
        );
  const withKids = (i) => {
    order.push(i);
    for (const k of [...kids[i]].sort((a, b) => semi[a] - semi[b])) withKids(k);
  };
  order.push(SUN);
  for (const t of ['planet', 'dwarf', 'asteroid', 'centaur', 'tno', 'comet', 'interstellar'])
    for (const i of helio(t)) withKids(i);
  const planets = helio('planet'),
    numKey = [SUN, ...planets, idx.get('pluto')];

  // ---------- hra ----------
  let G = {
    pts: 0,
    seen: {},
    done: {},
    cur: null,
    hint: false,
    quiz: { ok: 0, n: 0, streak: 0 },
    help: false,
    kid: false,
  };
  const K = () => G.kid;
  try {
    const s = JSON.parse(localStorage.getItem('s200') || 'null');
    if (s && s.seen) G = Object.assign(G, s);
  } catch (e) {
    /* bez úložiště */
  }
  const save = () => {
    try {
      localStorage.setItem('s200', JSON.stringify(G));
    } catch (e) {
      /* nic */
    }
  };
  const rank = () => {
    let r = RANKS[0],
      nx = null;
    for (const x of RANKS) {
      if (G.pts >= x[0]) r = x;
      else {
        nx = x;
        break;
      }
    }
    return [r, nx];
  };
  let toastT = 0;
  const toast = (h, ms = 3800) => {
    const t = $('#toast');
    t.innerHTML = h;
    t.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('on'), ms);
  };
  const addPts = (n) => {
    const r0 = rank()[0];
    G.pts += n;
    const r1 = rank()[0];
    if (r1 !== r0)
      setTimeout(() => {
        toast(`🎖️ Nová hodnost: <b>${r1[1]}</b>`);
        A.play('rank');
        if (api.X) api.X.burst(K());
      }, 1800);
  };
  function nextMission() {
    const left = MISSIONS.filter((m) => !G.done[m[0]]);
    G.cur = left.length ? left[Math.floor(Math.random() * Math.min(left.length, 6))][0] : null;
    G.hint = false;
    save();
    drawGame();
    drawMission();
  }
  // oslava: běžný objev a hádanka jen zlatý kroužek; konfety až za něco vzácného (nová hodnost, celá skupina těles, každá 10. hádanka)
  function visit(i) {
    const b = B[i];
    let msg = '',
      big = false;
    if (!G.seen[b.id]) {
      G.seen[b.id] = 1;
      const p = PTS[b.type] + (b.R < 1 ? 10 : 0);
      addPts(p);
      msg = K() ? `✨ Nový objev: <b>${b.cs}</b>! +${p} bodů` : `✨ Nový objev: <b>${b.cs}</b> +${p} b.`;
      A.play('stamp');
      const grp = B.filter((x) => x.type === b.type);
      if (grp.length > 1 && grp.every((x) => G.seen[x.id])) {
        big = true;
        const gn = GROUPS.find((g) => g[0] === b.type)[1];
        setTimeout(() => {
          toast(`🏅 ${gn}: navštívena všechna tělesa (${grp.length}). +100 b.`);
          A.play('rank');
        }, 3000);
        addPts(100);
      }
    }
    if (G.cur === b.id && !G.done[b.id]) {
      G.done[b.id] = 1;
      addPts(50);
      const nd = Object.keys(G.done).length;
      if (nd % 10 === 0 || nd === MISSIONS.length) big = true;
      msg = K() ? `🎯 Správně, je to <b>${b.cs}</b>. +50 bodů` : `🎯 Hádanka vyřešena: <b>${b.cs}</b> +50 b.`;
      setTimeout(() => A.play('mission'), 500);
      setTimeout(nextMission, 2500);
    }
    if (msg) {
      toast(msg);
      save();
      drawGame();
      if (S.sel === i) drawCard(i);
      markSeen();
      if (api.X) api.X.burst(big && K());
    }
  }
  S.on.visit = (i) => {
    if (!G.seen[B[i].id] || (G.cur === B[i].id && !G.done[B[i].id])) visit(i);
  };
  function drawMission() {
    const m = MISSIONS.find((x) => x[0] === G.cur),
      e = $('#mission');
    if (!m) {
      e.innerHTML = G.cur === null && Object.keys(G.done).length ? '🏆 Všechny hádanky vyřešeny!' : '';
      e.style.display = e.innerHTML ? '' : 'none';
      return;
    }
    const b = B[idx.get(m[0])],
      hint = G.hint
        ? ` <i>Nápověda: ${TYPE[b.type]}${par[idx.get(m[0])] > 0 ? ' ' + (GEN[b.parent] || '') : ''}, začíná na „${b.cs[0]}“.</i>`
        : '';
    e.style.display = '';
    S.bus.emit('mission');
    e.innerHTML = `<span>🎯 <b>${K() ? 'Úkol pro tebe:' : 'Hádanka:'}</b> ${m[1]}${hint}</span> <button data-a="hint" title="Nápověda">?</button><button data-a="skip" title="Jiná hádanka">↻</button>`;
  }
  $('#mission').addEventListener('click', (e) => {
    const a = (e.target.closest('[data-a]') || e.target).dataset.a;
    if (a === 'hint') {
      G.hint = true;
      drawMission();
      A.play('hint');
    }
    if (a === 'skip') {
      nextMission();
      A.play('skip');
    }
  });
  function drawGame() {
    const [r, nx] = rank(),
      seen = Object.keys(G.seen).length;
    $('#score').innerHTML = `⭐ ${nf(G.pts)}`;
    let h = `<h3>Deník astronoma</h3><div class="rank"><b>${r[1]}</b> · ${nf(G.pts)} bodů${nx ? ` <small>(do hodnosti ${nx[1]} zbývá ${nf(nx[0] - G.pts)})</small>` : ''}</div><div class="bar"><i style="width:${nx ? Math.min(100, ((G.pts - r[0]) / (nx[0] - r[0])) * 100) : 100}%"></i></div>`;
    h += `<p>Navštívená tělesa: <b>${seen} / ${N}</b>. Těleso navštívíš tak, že k němu doletíš (dvojklik nebo Enter).</p><div class="cats">`;
    for (const [t, name] of GROUPS) {
      const all = B.filter((b) => b.type === t),
        s = all.filter((b) => G.seen[b.id]).length;
      h += `<div><span>${name}</span><div class="bar"><i style="width:${(s / all.length) * 100}%"></i></div><em>${s}/${all.length}</em></div>`;
    }
    h += `</div><p>Hádanky: <b>${Object.keys(G.done).length} / ${MISSIONS.length}</b> · Kvíz: <b>${G.quiz.ok}</b> správně z ${G.quiz.n}</p><div class="row"><button data-a="quiz" class="pri">Kvíz: otázka za 10 b.</button><button data-a="reset">Začít znovu</button></div><div id="quiz"></div>`;
    $('#game').innerHTML = h;
  }
  function quiz() {
    const q = $('#quiz'),
      rnd = (a) => a[Math.floor(Math.random() * a.length)],
      kind = Math.floor(Math.random() * 3);
    let text, opts, ok;
    if (kind === 0) {
      let a, b;
      do {
        a = rnd(B);
        b = rnd(B);
      } while (a === b || Math.max(a.R, b.R) / Math.min(a.R, b.R) < 1.4 || a.fame + b.fame < 5);
      text = 'Které těleso je větší?';
      opts = [a.cs, b.cs];
      ok = a.R > b.R ? 0 : 1;
    } else if (kind === 1) {
      const moons = B.filter((b) => b.type === 'moon' && b.fame >= 2),
        m = rnd(moons),
        ps = ['earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']
          .filter((p) => p !== m.parent)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);
      opts = [m.parent, ...ps].sort(() => Math.random() - 0.5);
      ok = opts.indexOf(m.parent);
      opts = opts.map((p) => B[idx.get(p)].cs);
      text = `Kolem čeho obíhá měsíc <b>${m.cs}</b>?`;
    } else {
      const c = rnd(B.filter((b) => b.fame >= 3 && b.type !== 'star')),
        ts = ['planeta', 'měsíc', 'planetka', 'kometa', 'trpasličí planeta'],
        right = c.type === 'tno' || c.type === 'centaur' || c.type === 'interstellar' ? null : TYPE[c.type];
      if (!right) return quiz();
      opts = [
        right,
        ...ts
          .filter((t) => t !== right)
          .sort(() => Math.random() - 0.5)
          .slice(0, 2),
      ].sort(() => Math.random() - 0.5);
      ok = opts.indexOf(right);
      text = `Co je <b>${c.cs}</b>?`;
    }
    q.innerHTML = `<div class="q">${text}</div>` + opts.map((o, k) => `<button data-q="${k}">${o}</button>`).join('');
    q.onclick = (e) => {
      const k = e.target.dataset.q;
      if (k === undefined) return;
      G.quiz.n++;
      const good = +k === ok;
      A.play(good ? (G.quiz.streak >= 4 ? 'quiz_ok3' : G.quiz.streak >= 1 ? 'quiz_ok2' : 'quiz_ok') : 'quiz_bad');
      if (good) {
        G.quiz.ok++;
        G.quiz.streak++;
        addPts(10 + Math.min(10, (G.quiz.streak - 1) * 2));
      } else G.quiz.streak = 0;
      [...q.querySelectorAll('button')].forEach((b, j) => {
        b.disabled = true;
        if (j === ok) b.classList.add('ok');
        else if (j === +k) b.classList.add('bad');
      });
      q.onclick = null;
      save();
      const m = el(
        'div',
        'res',
        good
          ? `Správně! +${10 + Math.min(10, (G.quiz.streak - 1) * 2)} b.${G.quiz.streak > 1 ? ' Série ' + G.quiz.streak + '.' : ''}`
          : 'Tentokrát ne.'
      );
      q.appendChild(m);
      const nx = el('button', 'pri', 'Další otázka');
      nx.onclick = () => {
        drawGame();
        quiz();
      };
      q.appendChild(nx);
      $('#score').innerHTML = `⭐ ${nf(G.pts)}`;
    };
  }
  $('#game').addEventListener('click', (ev) => {
    const e = { target: ev.target.closest('[data-a]') || ev.target },
      a = e.target.dataset.a;
    if (a === 'quiz') quiz();
    if (a === 'reset') {
      if (e.target.dataset.sure) {
        G = {
          pts: 0,
          seen: {},
          done: {},
          cur: null,
          hint: false,
          quiz: { ok: 0, n: 0, streak: 0 },
          help: true,
          kid: G.kid,
        };
        save();
        nextMission();
        markSeen();
      } else {
        e.target.dataset.sure = 1;
        e.target.textContent = 'Opravdu smazat deník?';
      }
    }
  });

  // ---------- karta tělesa ----------
  // počet známých měsíců: Jupiter a Saturn podle Minor Planet Center (stav k dubnu 2026), Uran včetně S/2025 U1; čísla dál rostou
  const MOONS = {
    mercury: 0,
    venus: 0,
    earth: 1,
    mars: 2,
    jupiter: 115,
    saturn: 292,
    uranus: 29,
    neptune: 16,
    pluto: 5,
    eris: 1,
    haumea: 2,
    makemake: 1,
  };
  let factsOpen = false;
  function drawCard(i) {
    drawCardRaw(i);
    S.bus.emit('card', i);
  }
  function drawCardRaw(i) {
    const b = B[i],
      p = par[i],
      D = b.R * 2,
      inf = S.info(i),
      rows = [];
    const sub = b.type === 'moon' ? `měsíc ${GEN[b.parent] || B[p].cs}` : TYPE[b.type];
    const kid0 =
      b.kid ||
      (b.type === 'moon'
        ? `${b.cs} je měsíc ${GEN[b.parent] || B[p].cs}. Velikostí ${sizeLike(D)}.`
        : b.type === 'comet'
          ? `${b.cs} je kometa – špinavá ledová koule. U Slunce jí naroste ohon.`
          : `${b.cs} je ${TYPE[b.type]}. Velikostí ${sizeLike(D)}.`);
    /* kometa daleko od Slunce nemá ohon (v modelu od 3,6 au) – ať to nevypadá jako chyba */
    const kid =
      kid0 +
      ((b.type === 'comet' || b.coma) && inf.sun > 3.6 * AU
        ? ' Teď je daleko od Slunce, zmrzlá a bez ohonu. Stroj času (🕰) ji ukáže u Slunce.'
        : '');
    rows.push([
      'Průměr',
      (b.abc && Math.max(...b.abc) / Math.min(...b.abc) > 1.15
        ? b.abc.map((x) => sig(x * 2)).join(' × ') + ' km'
        : fmtDist(D)) + (b.kid && i !== EARTH ? ` <small>(${sizeLike(D)})</small>` : ''),
    ]);
    if (i !== SUN) rows.push(['Od Slunce teď', `<span id="c-sun">${fmtDist(inf.sun)}</span>`]);
    if (i !== EARTH)
      rows.push(
        ['Od Země teď', `<span id="c-earth">${fmtDist(inf.earth)}</span>`],
        ['Světlo k Zemi letí', `<span id="c-light">${fmtLight(inf.earth)}</span>`]
      );
    if (p > 0) rows.push([`Od ${GEN[b.parent] || B[p].cs}`, fmtDist(semi[i])]);
    if (i !== SUN) rows.push(['Jeden oběh', fmtPer(period[i])]);
    if (b.rot) rows.push(['Otočka', fmtPer(Math.abs(b.rot) / 24) + (b.rot < 0 ? ' (pozpátku)' : '')]);
    if (b.g)
      rows.push([
        'Tíže',
        b.g > 0.05
          ? `${sig(b.g / 9.80665)} g <small>(skok ${fmtLen(Math.min(1e6, (0.5 * 9.80665) / b.g))} vysoko)</small>`
          : b.vesc < 2
            ? `skoro žádná <small>(odrazem bys odletěl)</small>`
            : `${sig((b.g / 9.80665) * 1000)} tisícin g`,
      ]);
    if (MOONS[b.id] !== undefined) {
      const m = MOONS[b.id],
        inm = kids[i].size !== undefined ? kids[i].size : kids[i].length;
      rows.push([
        'Měsíce',
        m === 0
          ? 'žádné'
          : `<b>${m}</b> ${m === 1 ? 'známý' : m < 5 ? 'známé' : 'známých'}${m > 4 ? ' <small>(stav k dubnu 2026)</small>' : ''}${inm && inm < m ? ` <small>· v modelu ${inm}</small>` : ''}`,
      ]);
    }
    if (b.atm && b.atm.comp) rows.push(['Atmosféra', b.atm.comp]);
    if (b.disc) rows.push(['Objev', `${b.disc[0]}${b.disc[1] ? ', ' + b.disc[1] : ''}`]);
    if (b.missions) rows.push(['Sondy', b.missions]);
    const seen = G.seen[b.id],
      SUNF = [
        'Bílé světlo: fotosféra. Zblízka je vidět granulace – vršky stoupajícího horkého plynu, každé zrno velké asi jako Česko až Francie. Skvrny mají tmavé jádro (umbru) a vláknitý lem (penumbru).',
        'H-alfa (656 nm): chromosféra – tmavá vlákna (filamenty), světlé plochy kolem skvrn a protuberance nad okrajem.',
        'EUV 304 Å: vrstva nad chromosférou, asi 50 000 °C. Září aktivní oblasti, oblouky plazmatu podél magnetického pole a protuberance nad okrajem. Barva je dohodnutá – tohle světlo oko nevidí.',
        'Koronograf: kotouč je zakrytý, jako když Slunce při úplném zatmění schová Měsíc. Vynikne korona – řídký plyn horký přes milion stupňů, který magnetické pole češe do paprsků. Růžové výběžky na okraji jsou protuberance. Tvar korony je ilustrace.',
      ];
    const sunBox =
      i === SUN
        ? `<div class="sunf"><button data-a="sunf" class="pri">🔆 Filtr: ${SUNN[S.sunMode]} (V)</button><p>${SUNF[S.sunMode]} <small>Skvrny a erupce jsou ilustrace: poloha podle aktivních oblastí snímku SDO, ne dnešní stav.</small></p></div>`
        : '';
    const fx = factsOf(b, { moons: MOONS[b.id], sunAU: inf.sun / AU, isSun: i === SUN }),
      ib = fx.length
        ? `<button class="ib${factsOpen ? ' on' : ''}" data-a="facts" title="Další zajímavosti" aria-label="Další zajímavosti">i</button>`
        : '',
      fbox =
        fx.length && factsOpen
          ? `<div class="facts"><h4>💡 ${K() ? 'Věděl jsi, že…' : 'Zajímavosti'}</h4><ul>${fx.map((f) => `<li>${f}</li>`).join('')}</ul></div>`
          : '';
    if (K()) {
      // dětská karta: tykání, velké dlaždice se zajímavostmi
      const tiles = [],
        yrs = period[i] / 365.25,
        kmh = (v) => {
          const h = inf.earth / v;
          return h < 48 ? nf(h, 0) + ' hodin' : h < 24 * 700 ? nf(h / 24, 0) + ' dní' : sig(h / 8766) + ' let';
        };
      if (b.g && b.vesc > 3.5)
        tiles.push([
          '🦘',
          `Vyskočil bys <b>${fmtLen((0.5 * 9.80665) / b.g)}</b> vysoko${b.g < 0.02 ? ' a padal bys zpátky dlouhé minuty' : ''}.`,
        ]);
      else if (i !== SUN) tiles.push(['🦘', 'Stačí se odrazit a <b>odletíš do vesmíru</b>.']);
      if (b.g > 0.02) tiles.push(['⚖️', `Kdo má na Zemi 30 kg, tady „váží“ <b>${sig((30 * b.g) / 9.80665)} kg</b>.`]);
      if (par[i] === SUN && isFinite(yrs))
        tiles.push([
          '🎂',
          yrs > 8
            ? `Rok tu trvá <b>${sig(yrs)} pozemských let</b>. Osmiletý by neoslavil ani první narozeniny.`
            : yrs > 1.02
              ? `Rok tu trvá <b>${sig(yrs)} pozemského roku</b>. Osmiletý by tu měl teprve <b>${nf(Math.floor(8 / yrs))}. narozeniny</b>.`
              : `Osmiletý by tu slavil už <b>${nf(Math.floor(8 / yrs))}. narozeniny</b>.`,
        ]);
      if (i !== EARTH)
        tiles.push(
          ['✈️', `Letadlem ze Země bys sem letěl <b>${kmh(900)}</b>.`],
          [
            '🚀',
            `Nejrychlejší sondou bys sem letěl <b>${kmh(58000)}</b>, světlo to zvládne za <b>${fmtLight(inf.earth)}</b>.`,
          ]
        );
      tiles.push(['📏', `Průměr <b>${fmtDist(D).replace(/ \(.*/, '')}</b> – ${sizeLike(D)}.`]);
      if (b.rot)
        tiles.push([
          '🌗',
          `Den tu trvá <b>${fmtPer(Math.abs(b.rot) / 24)}</b>${b.rot < 0 ? ' a točí se pozpátku!' : '.'}`,
        ]);
      $('#card').innerHTML =
        `<div class="hd"><div class="ball">${ico(i, 56)}</div><div><h2>${b.cs}</h2><div class="sub">${sub}</div></div>${ib}<div class="stamp ${seen ? 'on' : ''}">${seen ? '✓' : '?'}</div></div>
        <p class="kid">${kid}</p><div class="tiles">${tiles.map((t) => `<div><span>${t[0]}</span><p>${t[1]}</p></div>`).join('')}</div>${b.adult ? `<p class="adult"><b>Pro zvídavé:</b> ${b.adult}</p>` : ''}${b.missions ? `<p class="adult">🛰️ <b>Byly tu sondy:</b> ${b.missions}</p>` : ''}${fbox}${sunBox}
        <p class="src">${b.mk === 'foto' ? '📷 Tak to tam opravdu vypadá – fotily to sondy.' : i === SUN ? '' : '🎨 Zblízka to nikdo nevyfotil, povrch je namalovaný.'}</p>
        <div class="row">${S.focus === i ? `<button data-a="close" class="pri">🔍 Blíž</button><button data-a="far">🔭 Dál</button>` : `<button data-a="go" class="pri">🚀 Leť tam!</button>`}${p > 0 ? `<button data-a="parent">↑ ${B[p].cs}</button>` : ''}</div>`;
      cardExtra(i);
      drawSub();
      return;
    }
    $('#card').innerHTML =
      `<div class="hd"><div class="ball">${ico(i, 46)}</div><div><h2>${b.cs}</h2><div class="sub">${sub}${b.name !== b.cs && !/[()]/.test(b.name) ? ' · ' + b.name.replace('`', 'ʻ') : ''}</div></div>${ib}<div class="stamp ${seen ? 'on' : ''}" title="${seen ? 'Navštíveno' : 'Ještě nenavštíveno'}">${seen ? '✓' : '?'}</div></div>
      <p class="kid">${kid}</p><table>${rows.map((r) => `<tr><th>${r[0]}</th><td>${r[1]}</td></tr>`).join('')}</table>${b.adult ? `<p class="adult">${b.adult}</p>` : ''}${fbox}
      ${sunBox}<p class="src">${b.mk === 'foto' ? '📷 Povrch: skutečné snímky ze sond.' : i === SUN ? '' : '🎨 Povrch: ilustrace – zblízka ho zatím nikdo nevyfotil celý.'}${b.src === 'pamet' ? ' Dráha jen přibližná.' : ''}${COVER[b.id] ? '<br>🗺️ ' + COVER[b.id] : ''}<br>${A.note(i)}</p>
      <div class="row">${S.focus === i ? `<button data-a="close" class="pri">Přiblížit</button><button data-a="far">Oddálit</button>` : `<button data-a="go" class="pri">Leť tam ⏎</button>`}${p > 0 ? `<button data-a="parent">↑ ${B[p].cs}</button>` : ''}</div>`;
    cardExtra(i);
    drawSub();
  }
  // „Kam dál?“ – tři nenavštívená tělesa: nejdřív ze stejné soustavy, pak nejbližší
  function nextUp(i) {
    const r = root[i],
      fam = [r, ...kids[r]].filter((j) => j !== i && j !== SUN && !G.seen[B[j].id]).sort((a, b) => B[b].R - B[a].R),
      d = (j) => Math.hypot(S.info(j).sun - S.info(i).sun) + (root[j] === r ? 0 : 1e9);
    const rest = B.map((b, j) => j)
      .filter((j) => j !== i && !G.seen[B[j].id] && fam.indexOf(j) < 0 && par[j] === SUN)
      .sort((a, b) => Math.abs(S.info(a).sun - S.info(i).sun) - Math.abs(S.info(b).sun - S.info(i).sun));
    return [...fam.slice(0, 2), ...rest].slice(0, 3);
  }
  function cardExtra(i) {
    const c = $('#card'),
      nx = S.focus === i ? nextUp(i) : [],
      e = el('div', 'more');
    e.innerHTML =
      `<div class="row"><button data-a="cmp" title="Porovnat velikost">⚖ ${K() ? 'Jak je to velké?' : 'Porovnat'}</button><button data-a="pin" title="Měřit vzdálenost odsud (Shift+D)">📏 ${api.X && api.X.ruler === i ? 'Zrušit měření' : 'Měřit odsud'}</button></div>` +
      (nx.length
        ? `<div class="next"><span>${K() ? '🧭 Kam poletíme dál?' : 'Kam dál:'}</span>${nx.map((j) => `<button class="it chip" data-i="${j}"><b>${ico(j, 30)}</b><span>${B[j].cs}</span></button>`).join('')}</div>`
        : '');
    c.appendChild(e);
  }
  $('#card').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (chip) return S.flyTo(+chip.dataset.i);
    const a = (e.target.closest('[data-a]') || e.target).dataset.a,
      i = S.sel;
    if (a === 'sunf') return act.sunf();
    if (a === 'facts') {
      factsOpen = !factsOpen;
      drawCard(i);
      if (factsOpen) {
        const f = $('#card .facts');
        if (f && f.scrollIntoView) f.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
      return;
    }
    if (a === 'cmp') return act.cmp();
    if (a === 'pin') {
      api.X.ruler = api.X.ruler === i ? -1 : i;
      A.play('ruler');
      toast(api.X.ruler < 0 ? 'Měření zrušeno.' : `📏 Měřím od tělesa ${B[i].cs}. Vyber klikem jiné těleso.`);
      return drawCard(i);
    }
    if (a === 'go') S.flyTo(i);
    if (a === 'close') S.flyTo(i, { alt: shape[i].rmax * 0.6 });
    if (a === 'far')
      S.flyTo(i, {
        alt: Math.max(shape[i].rmax * 60, semi[[...kids[i]].sort((x, y) => semi[y] - semi[x])[0]] * 2.2 || 0),
      });
    if (a === 'parent') S.flyTo(par[i]);
  });
  let cmpFor = -1;
  S.on.select = (i) => {
    if ($('#cmp').classList.contains('on') && i !== cmpFor) toggle('#cmp', false);
    drawCard(i);
    document.querySelectorAll('.it.sel').forEach((e) => e.classList.remove('sel'));
    document.querySelectorAll(`.it[data-i="${i}"]`).forEach((e) => e.classList.add('sel'));
  };
  S.on.focus = (i) => {
    drawCard(S.sel);
    drawSub();
  };
  S.on.arrive = (i) => {
    drawCard(S.sel);
    A.play('arrive');
    if (api.onArrive) api.onArrive(i);
    const from = flyFrom;
    flyFrom = -1;
    if (!(from >= 0 && from !== i && hop(from, i))) guide(i);
    try {
      history.replaceState(null, '', '#' + B[i].id.replace(/_/g, '-'));
    } catch (e) {
      /* nic */
    }
  };
  let flyFrom = -1;
  S.on.fly = (j) => {
    A.play(j === S.focus ? 'closeup' : 'launch');
    if (j !== S.focus && flyFrom < 0) flyFrom = S.focus;
  };
  S.on.flare = () => A.play('flare', 1, 0.7);

  // ---------- lišta ikon ----------
  const dockIds = [SUN, ...planets, idx.get('moon'), idx.get('pluto'), idx.get('ceres'), idx.get('halley')];
  const icon = (i, small) =>
    `<button class="it ${small ? 'sm' : ''}" data-i="${i}" title="${B[i].cs}"><b>${ico(i, small ? 34 : 46, small ? 34 : 48)}</b><span>${B[i].id === 'halley' ? 'Halley' : B[i].cs.replace(/^Kometa /, '')}</span></button>`;
  $('#dock').innerHTML =
    dockIds.map((i) => icon(i)).join('') +
    `<button class="it all" data-a="list" title="Všechna tělesa (B)"><b><i class="menu">☰</i></b><span>Všechna</span></button>`;
  function drawSub() {
    const r = root[S.focus],
      ks = r === SUN ? [] : [r, ...[...kids[r]].sort((a, b) => semi[a] - semi[b])];
    const e = $('#sub');
    if (ks.length < 2) {
      e.style.display = 'none';
      return;
    }
    e.style.display = '';
    e.innerHTML = ks.map((i) => icon(i, true)).join('');
    e.querySelectorAll(`.it[data-i="${S.sel}"]`).forEach((x) => x.classList.add('sel'));
    markSeen();
  }
  function markSeen() {
    document.querySelectorAll('.it[data-i]').forEach((e) => e.classList.toggle('seen', !!G.seen[B[+e.dataset.i].id]));
  }
  const goBtn = (e) => {
    const t = e.target.closest('.it');
    if (!t) return;
    if (t.dataset.a === 'list') return act.list();
    S.flyTo(+t.dataset.i);
  };
  $('#dock').addEventListener('click', goBtn);
  $('#sub').addEventListener('click', goBtn);
  for (const id of ['#dock', '#sub'])
    $(id).addEventListener(
      'wheel',
      (e) => {
        const d = $(id);
        if (d.scrollWidth > d.clientWidth + 1 && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          d.scrollLeft += e.deltaY;
          e.preventDefault();
        }
      },
      { passive: false }
    ); // kolečko posouvá dlouhou lištu do stran

  // ---------- seznam všech těles ----------
  function drawList(f = '') {
    f = f.trim().toLowerCase();
    let h = '';
    for (const [t, name] of GROUPS) {
      const xs = order.filter(
        (i) => B[i].type === t && (!f || B[i].cs.toLowerCase().includes(f) || B[i].name.toLowerCase().includes(f))
      );
      if (!xs.length) continue;
      h +=
        `<h4>${name} <small>${xs.length}</small></h4>` +
        xs
          .map(
            (i) =>
              `<button class="it li ${G.seen[B[i].id] ? 'seen' : ''}" data-i="${i}"><b>${ico(i, 28)}</b><span>${B[i].cs}${B[i].type === 'moon' ? ` <small>${B[par[i]].cs}</small>` : ''}</span></button>`
          )
          .join('');
    }
    $('#items').innerHTML = h || '<p>Nic nenalezeno.</p>';
  }
  $('#items').addEventListener('click', goBtn);
  $('#search').addEventListener('input', (e) => {
    drawList(e.target.value);
    const v = e.target.value.trim().toLowerCase(),
      egg = {
        tesla: '🚗 Starman v červeném Roadsteru tu někde krouží kolem Slunce, ale do dvoustovky se nevešel.',
        plochá: '🌍 Zkus si Zemi otočit myší. Je kulatá, slibuju.',
        placata: '🌍 Zkus si Zemi otočit myší. Je kulatá, slibuju.',
        nibiru: '🪐 Nibiru neexistuje. Zato Sedna ano a je skoro stejně tajemná.',
        vulkan:
          '🖖 Planetu Vulkán hledali astronomové 50 let u Merkuru. Pak přišel Einstein a ukázal, že není potřeba.',
        'hvězda smrti': '🌑 To není měsíc… počkat, je. Jmenuje se Mimas.',
      }[v];
    if (egg) {
      toast(egg);
      A.play('egg');
    }
  });

  // ---------- čas ----------
  const MES = [
    'ledna',
    'února',
    'března',
    'dubna',
    'května',
    'června',
    'července',
    'srpna',
    'září',
    'října',
    'listopadu',
    'prosince',
  ];
  function fmtDate(jd) {
    const ms = (jd - 2440587.5) * 86400000;
    if (Math.abs(ms) > 8e15) return 'rok ' + nf(Math.round(2000 + (jd - 2451545) / 365.25));
    const d = new Date(ms),
      y = d.getFullYear();
    return `${d.getDate()}. ${MES[d.getMonth()]} ${y <= 0 ? 1 - y + ' př. n. l.' : y} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  function drawTime() {
    $('#date').textContent = fmtDate(S.jd);
    const a = Math.abs(S.rateIdx);
    $('#rate').textContent = S.paused ? 'čas stojí' : (S.rateIdx < 0 ? '◀ zpět: ' : '') + RATE_LABEL[a - 1];
    $('#b-play').textContent = S.paused ? '▶' : '⏸';
  }
  const faster = (d) => {
    let r = S.rateIdx + d;
    if (r === 0) r += d;
    const was = S.rateIdx;
    S.rateIdx = Math.max(-10, Math.min(10, r));
    S.paused = false;
    drawTime();
    S.wake();
    A.play(S.rateIdx < 0 && was > 0 ? 'reverse' : 'rate' + Math.abs(S.rateIdx));
  };
  const timeAct = (a) => {
    if (a === 'slow') faster(-1);
    if (a === 'fast') faster(1);
    if (a === 'play') {
      S.paused = !S.paused;
      drawTime();
      S.wake();
      A.play(S.paused ? 'pause' : 'play');
    }
    if (a === 'now') {
      S.jd = Date.now() / 86400000 + 2440587.5;
      S.rateIdx = 1;
      S.paused = false;
      drawTime();
      S.wake();
      A.play('now');
    }
  };
  $('#time').addEventListener('click', (e) => {
    const a = (e.target.closest('[data-a]') || e.target).dataset.a;
    if (a === 'tm') act.tm();
    else timeAct(a);
  });

  // ---------- HUD ----------
  S.on.hud = () => {
    drawTime();
    {
      const c = $('#sunchip'),
        on = S.focus === SUN && !S.cam.fly;
      c.classList.toggle('on', on);
      if (on) c.lastChild.textContent = ' Filtr: ' + SUNN[S.sunMode] + ' → ' + SUNN[(S.sunMode + 1) % 4];
    }
    const inf = S.info(S.focus),
      b = B[S.focus];
    $('#alt').innerHTML =
      `<b>${b.cs}</b><br><span>${K() ? 'jsi ' : 'výška '}${fmtDist(inf.alt).replace(/ \(.*/, '')}${K() ? ' nad povrchem' : ''}</span><br><span class="hw">${K() ? (S.focus === EARTH ? '☀ od Slunce ' + fmtDist(inf.sun).replace(/ \(.*/, '') : '🌍 od Země ' + fmtDist(inf.earth).replace(/ \(.*/, '')) : (S.focus === SUN ? '' : '☀ ' + sig(inf.sun / AU) + ' AU') + (S.focus === SUN || S.focus === EARTH ? '' : ' · ') + (S.focus === EARTH ? '' : '🌍 ' + sig(inf.earth / AU) + ' AU')}</span>`;
    let km = inf.kmPerPx * 120,
      p = Math.pow(10, Math.floor(Math.log10(km))),
      n = km / p >= 5 ? 5 : km / p >= 2 ? 2 : 1;
    const w = (n * p) / inf.kmPerPx;
    $('#scale i').style.width = w + 'px';
    $('#scale span').textContent =
      fmtDist(n * p).replace(/ \(.*/, '') + (n * p > 0.05 * AU ? ` = ${sig((n * p) / AU)} AU` : '');
    const s = S.info(S.sel),
      q = (id, t) => {
        const e = document.getElementById(id);
        if (e) e.textContent = t;
      };
    q('c-sun', fmtDist(s.sun));
    q('c-earth', fmtDist(s.earth));
    q('c-light', fmtLight(s.earth));
  };

  // ---------- přepínače ----------
  const POPS = ['#help', '#gamebox', '#list', '#album', '#tm', '#cmp', '#dev', '#more', '#zv'],
    PSND = {},
    UI3 = ['orbit_off', 'orbit_on', 'orbit_all'],
    ui2 = (v) => A.play(v ? 'orbit_on' : 'orbit_off');
  const toggle = (sel, on) => {
    const e = $(sel);
    const was = e.classList.contains('on'),
      v = on === undefined ? !was : on;
    if (v !== was) A.play(v ? PSND[sel] || 'panel_open' : 'panel_close');
    if (v)
      for (const o of POPS)
        if (o !== sel && $(o).classList.contains('on')) {
          $(o).classList.remove('on');
          S.bus.emit('panel', o, false);
        }
    e.classList.toggle('on', v);
    if (v !== was) S.bus.emit('panel', sel, v);
    if (sel === '#list' && v) {
      drawList($('#search').value);
    }
    if (sel === '#gamebox' && v) drawGame();
    return v;
  };
  const setBtn = () => {
    $('#b-orb').dataset.m = S.orbMode;
    $('#b-lab').dataset.m = S.labMode;
    $('#b-lock').dataset.m = S.lock ? 1 : 0;
    $('#b-con').dataset.m = S.conMode > 1 ? 2 : S.conMode;
    $('#b-con').style.setProperty('--lv', S.conMode);
    $('#b-star').dataset.m = S.starNames ? 2 : 0;
    $('#b-snd').dataset.m = A.on ? 1 : 0;
    $('#b-snd').firstChild.textContent = A.on ? '🔊' : '🔇';
    $('#b-mode').innerHTML = K() ? '🎓 <span>Dospělé</span>' : '🧒 <span>Dětské</span>';
    $('#gam').value = S.gamma;
    $('#b-orb').title = 'Dráhy: ' + ['vypnuté', 'hlavní', 'všechny'][S.orbMode] + ' (O)';
    $('#b-lab').title = 'Popisky: ' + ['vypnuté', 'hlavní', 'všechny'][S.labMode] + ' (L)';
  };
  const act = {
    orb() {
      S.orbMode = (S.orbMode + 1) % 3;
      A.play(['orbit_off', 'orbit_on', 'orbit_all'][S.orbMode]);
      toast('Dráhy: ' + ['vypnuté', 'planety a blízké měsíce', 'všech těles'][S.orbMode]);
    },
    lab() {
      S.labMode = (S.labMode + 1) % 3;
      A.play(S.labMode ? 'labels_on' : 'labels_off');
      toast('Popisky: ' + ['vypnuté', 'hlavní', 'všechny'][S.labMode]);
    },
    lock() {
      S.lock = !S.lock;
      ui2(S.lock);
      toast(S.lock ? 'Kamera se otáčí s tělesem (stojíš nad jedním místem).' : 'Kamera stojí vůči hvězdám.');
    },
    gam() {
      const g = S.gamma < 0.2 ? 0.45 : S.gamma < 0.7 ? 1 : 0;
      S.setGamma(g);
      A.play(UI3[g === 0 ? 0 : g < 0.7 ? 1 : 2]);
      toast(
        [
          'Přisvětlení vypnuto – skutečný kontrast.',
          'Přisvětlení: noční strany jsou trochu vidět.',
          'Přisvětlení naplno: vidíš i neosvětlené strany.',
        ][g === 0 ? 0 : g < 0.7 ? 1 : 2]
      );
    },
    help() {
      toggle('#help');
    },
    game() {
      toggle('#gamebox');
    },
    list() {
      toggle('#list');
    },
    home() {
      S.home();
      A.play('orbit_all');
    },
    con(v) {
      S.conMode = typeof v === 'number' ? v : (S.conMode + (act.back ? 3 : 1)) % 4;
      A.play(UI3[Math.min(2, S.conMode)]);
      toast(
        'Souhvězdí: ' +
          (K()
            ? ['schovaná', 'jemné čáry a hvězdičky', 'zářící hvězdy', 'zářící hvězdy a jména']
            : ['vypnutá', 'náznak (1/3)', 'naplno (2/3)', 'naplno se jmény (3/3)'])[S.conMode]
      );
    },
    stars() {
      S.starNames = !S.starNames;
      ui2(S.starNames);
      toast(S.starNames ? 'Jména nejjasnějších hvězd zapnuta.' : 'Jména hvězd vypnuta.');
    },
    snd() {
      A.unlock();
      A.setOn(!A.on);
      if (A.on) A.play('orbit_on');
      toast(A.on ? `Zvuk zapnut (${A.count} zvuků).` : 'Zvuk vypnut.');
    },
    more() {
      toggle('#more');
    },
    mini() {
      api.X.mini = !api.X.mini;
      $('#mini').style.display = api.X.mini ? '' : 'none';
      api.X.drawMini();
      ui2(api.X.mini);
    },
    album() {
      if (toggle('#album')) drawAlbum();
    },
    tm() {
      if (toggle('#tm'))
        $('#tm-list').innerHTML =
          `<button data-e="-1" class="pri">⟲ Zpět do současnosti</button>` +
          EVENTS.map((e, k) => `<button data-e="${k}">${e[0]}</button>`).join('');
    },
    cmp() {
      cmpFor = S.sel;
      drawCmp(S.sel);
      toggle('#cmp', true);
      A.play('compare');
    },
    ruler() {
      api.X.ruler = api.X.ruler === S.sel ? -1 : S.sel;
      A.play('ruler');
      toast(api.X.ruler < 0 ? 'Měření zrušeno.' : `📏 Měřím od tělesa ${B[S.sel].cs}. Vyber klikem jiné těleso.`);
      drawCard(S.sel);
    },
    grid() {
      api.X.grid = !api.X.grid;
      ui2(api.X.grid);
      toast(api.X.grid ? 'Osa rotace, rovník a poledníky zapnuty.' : 'Osa a souřadnicová síť vypnuty.');
    },
    real() {
      S.realBright = !S.realBright;
      ui2(S.realBright);
      toast(
        S.realBright
          ? '🔦 Reálný jas: expozice jako u Země. U Jupiteru je 27× méně světla, u Neptunu 900×.'
          : 'Automatická expozice: každé těleso je vidět dobře.'
      );
    },
    cine() {
      const on = document.body.classList.toggle('cine');
      A.play('shutter');
      if (on)
        toast(
          document.body.classList.contains('touch') || document.body.classList.contains('mob')
            ? '🎬 Kino: rozhraní skryto. Vrátíš ho tlačítkem ✕ vpravo nahoře.'
            : '🎬 Kino: rozhraní skryto. Vrátí ho klávesa I, Esc nebo tlačítko ✕ vpravo nahoře. Y spustí pomalé otáčení.'
        );
    },
    autorot() {
      S.autoRot = !S.autoRot;
      ui2(S.autoRot);
      toast(S.autoRot ? '🔄 Pomalé otáčení kolem tělesa.' : 'Otáčení zastaveno.');
    },
    music() {
      A.unlock();
      A.setMusic(!A.music);
      G.music = A.music;
      save();
      ui2(A.music);
      toast(
        A.music
          ? '🎵 Hudba zapnuta: skladby podle toho, kde zrovna jsi. Mezi skladbami je chvíle ticha.'
          : 'Hudba vypnuta.'
      );
    },
    disco() {
      S.disco = !S.disco;
      S.orbMode = S.disco ? 2 : 1;
      A.play('disco');
      toast(S.disco ? '🪩 Disko ve Sluneční soustavě! (Stejný kód ho zase vypne.)' : 'Disko skončilo.');
    },
    dev() {
      if (toggle('#dev')) {
        A.play('secret');
        drawDev();
      }
    },
    mode() {
      setMode(!G.kid);
    },
    tut() {
      POPS.forEach((s) => toggle(s, false));
      if (document.body.classList.contains('cine')) act.cine();
      tut.start();
    },
    sunf() {
      S.setSunMode((S.sunMode + 1) % 4);
      A.play(['sun_white', 'sun_halpha', 'sun_euv', 'sun_white'][S.sunMode]);
      if (S.sel === SUN) drawCard(SUN);
      if (S.focus !== SUN) toast('Filtr Slunce: ' + SUNN[S.sunMode]);
    },
    full() {
      A.play('orbit_on');
      try {
        (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(
          () => toast('Celou obrazovku tady prohlížeč nepovolil.')
        );
      } catch (e) {
        toast('Celou obrazovku tady prohlížeč nepovolil.');
      }
    },
  };
  $('#tools').addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    A.unlock();
    act.back = e.shiftKey;
    if (act[t.dataset.a]) {
      if (
        [
          'help',
          'game',
          'list',
          'home',
          'full',
          'orb',
          'lab',
          'lock',
          'con',
          'stars',
          'snd',
          'mode',
          'more',
          'gam',
        ].indexOf(t.dataset.a) < 0
      )
        A.play('click');
      act[t.dataset.a]();
    }
    act.back = false;
    setBtn();
    S.wake();
  });
  $('#gam').addEventListener('input', (e) => {
    S.setGamma(+e.target.value);
  });
  const volUI = () => {
    for (const [id, v] of [
      ['#vol2', A.vol],
      ['#mvol', A.mvol],
    ]) {
      const e = $(id);
      if (e && document.activeElement !== e) e.value = v;
    }
    $('#vol2n').textContent = A.vol < 0.01 ? 'vypnuto' : Math.round(A.vol * 100) + ' %';
    $('#mvoln').textContent = A.mvol < 0.01 ? 'vypnuto' : Math.round(A.mvol * 100) + ' %';
  };
  $('#vol2').addEventListener('input', (e) => {
    A.unlock();
    A.setVol(+e.target.value);
    volUI();
  });
  $('#mvol').addEventListener('input', (e) => {
    A.unlock();
    A.setMVol(+e.target.value);
    if (+e.target.value > 0.01 && !A.music) {
      A.setMusic(true);
      G.music = true;
      save();
    }
    volUI();
  });
  $('#vol2').addEventListener('change', () => A.play('click'));
  document.querySelectorAll('[data-close]').forEach((b) =>
    b.addEventListener('click', () => {
      toggle(b.dataset.close, false);
      if (b.dataset.close === '#help') {
        G.help = true;
        save();
      }
    })
  );

  function setMode(k) {
    A.kidMood = k;
    S.kid = k;
    G.kid = k;
    save();
    document.body.classList.toggle('kid', k);
    S.bus.emit('mode', k);
    $('#top h1').innerHTML = k ? '🚀 Vesmírná výprava <small>200</small>' : 'Sluneční soustava <small>200</small>';
    A.play(k ? 'mode_kid' : 'mode_adult');
    refresh();
    toast(k ? '🧒 Dětské rozhraní. Ahoj, kapitáne!' : '🎓 Rozhraní pro dospělé.');
  }
  function refresh() {
    setBtn();
    drawTime();
    drawCard(S.sel);
    drawMission();
    drawGame();
    markSeen();
  }
  // zvuky rozhraní: klik na tlačítko bez vlastního zvuku, přejetí přes ikonu
  document.addEventListener(
    'click',
    (e) => {
      A.unlock();
      const b = e.target.closest('button');
      if (b && !b.closest('#tools') && !b.closest('#time') && !b.dataset.q)
        A.play(b.classList.contains('it') ? 'click2' : 'click');
    },
    true
  );
  let hov = null;
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest('.it');
    if (t && t !== hov) A.play('hover');
    hov = t;
  });
  // ---------- myš, dotyk ----------
  const cv = $('#gl'),
    ptr = new Map();
  let moved = 0,
    pinch = 0,
    lastTap = 0,
    lastTapI = -2;
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  cv.addEventListener('pointerdown', (e) => {
    A.unlock();
    if (tut.running() && e.isTrusted) tut.stop();
    cv.setPointerCapture(e.pointerId);
    ptr.set(e.pointerId, { x: e.clientX, y: e.clientY, b: e.button });
    moved = 0;
    if (ptr.size === 2) {
      const [a, b] = [...ptr.values()];
      pinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
    S.wake();
  });
  cv.addEventListener('pointermove', (e) => {
    const p = ptr.get(e.pointerId);
    if (!p) {
      const h = S.pick(e.clientX, e.clientY);
      if (h !== S.hover) {
        S.hover = h;
        cv.style.cursor = h >= 0 ? 'pointer' : 'grab';
        S.wake();
      }
      return;
    }
    const dx = e.clientX - p.x,
      dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    moved += Math.abs(dx) + Math.abs(dy);
    if (ptr.size === 2) {
      const [a, b] = [...ptr.values()],
        d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch > 0) S.zoom(pinch / d);
      pinch = d;
      return;
    }
    if (moved < 4) return;
    cv.style.cursor = 'grabbing';
    if (p.b === 2 || e.shiftKey) S.look(dx, -dy);
    else if (p.b === 1) S.zoom(Math.exp(dy * 0.01));
    else S.rotate(dx, dy);
  });
  const upH = (e) => {
    const p = ptr.get(e.pointerId);
    ptr.delete(e.pointerId);
    pinch = 0;
    cv.style.cursor = 'grab';
    if (!p || moved >= 5 || p.b !== 0) return;
    const i = S.pick(e.clientX, e.clientY),
      now = performance.now();
    if (now - lastTap < 380 && i === lastTapI) {
      if (i >= 0) {
        if (i === S.focus) S.flyTo(i, { alt: shape[i].rmax * 0.6 });
        else S.flyTo(i);
      }
      lastTap = 0;
      return;
    }
    lastTap = now;
    lastTapI = i;
    if (i >= 0) {
      S.select(i);
      A.play('select');
    } else {
      const pr = api.X && api.X.pickProbe(e.clientX, e.clientY);
      if (pr) {
        toast(`🛰️ <b>${pr.name}</b>: ${pr.info}`);
        A.play('probe');
      }
    }
  };
  cv.addEventListener('pointerup', upH);
  cv.addEventListener('pointercancel', upH);
  let zt = 0;
  cv.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const k = e.deltaMode === 1 ? 33 : 1;
      if (performance.now() - zt > 90) {
        zt = performance.now();
        A.play(e.deltaY < 0 ? 'zoom_in' : 'zoom_out');
      }
      S.zoom(Math.exp(Math.max(-240, Math.min(240, e.deltaY * k)) * 0.0022));
    },
    { passive: false }
  );

  // ---------- klávesnice ----------
  const keys = new Set();
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' && e.target.type !== 'range') {
      if (e.key === 'Escape') {
        e.target.blur();
        toggle('#list', false);
      }
      if (e.key === 'Enter') {
        const f = $('#items .it');
        if (f) {
          S.flyTo(+f.dataset.i);
          e.target.blur();
          toggle('#list', false);
        }
      }
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    S.wake();
    A.unlock();
    if (tut.running()) {
      if (k === 'Escape' || e.isTrusted) {
        e.preventDefault();
        tut.stop();
      }
      return;
    }
    if ($('#splash').classList.contains('on')) {
      if (k === 'Enter' || k === ' ') {
        e.preventDefault();
        ($('#sp-tut').offsetParent ? $('#sp-tut') : $('#sp-go')).click();
      } else if (k === 'Escape') $('#sp-go').click();
      return;
    }
    seq.push(e.key);
    if (seq.length > 10) seq.shift();
    if (seq.join(',') === 'ArrowUp,ArrowUp,ArrowDown,ArrowDown,ArrowLeft,ArrowRight,ArrowLeft,ArrowRight,b,a') {
      act.disco();
      return;
    }
    if (seq.slice(-2).join('') === '42' && performance.now() - t42 < 900) {
      A.play('egg');
      toast('🐬 42 – odpověď na základní otázku života, vesmíru a vůbec. Otázku ale pořád neznáme.');
    }
    t42 = performance.now();
    if (k === '`' || k === ';' || k === '°') {
      act.dev();
      return;
    }
    if (k === '/') {
      e.preventDefault();
      toggle('#list', true);
      setTimeout(() => $('#search').focus(), 30);
      return;
    }
    if (e.shiftKey && { g: 'real', a: 'grid', d: 'ruler', t: 'tm' }[k]) {
      e.preventDefault();
      act[{ g: 'real', a: 'grid', d: 'ruler', t: 'tm' }[k]]();
      setBtn();
      return;
    }
    if (k === 'Tab') {
      e.preventDefault();
      A.play(e.shiftKey ? 'tab_prev' : 'tab_next');
      const at = order.indexOf(cur());
      S.flyTo(order[(at + (e.shiftKey ? -1 : 1) + order.length) % order.length]);
      return;
    }
    if (k >= '0' && k <= '9') {
      A.play('key');
      const base = numKey[+k],
        c = cur();
      if (root[c] === base && base !== SUN && kids[base].length) {
        const ring = [base, ...[...kids[base]].sort((a, b) => semi[a] - semi[b])];
        S.flyTo(ring[(ring.indexOf(c) + 1) % ring.length]);
      } else S.flyTo(base);
      return;
    }
    if (k === ' ') {
      e.preventDefault();
      timeAct('play');
      return;
    }
    if (k === 'Enter') {
      A.play('enter');
      const i = S.sel;
      if (i !== S.focus) S.flyTo(i);
      else S.flyTo(i, { alt: S.cam.altT > shape[i].rmax * 1.5 ? shape[i].rmax * 0.5 : shape[i].rmax * 3.4 });
      return;
    }
    if (k === 'Escape') {
      POPS.forEach((s) => toggle(s, false));
      if (document.body.classList.contains('cine')) act.cine();
      return;
    }
    if (k === 'Backspace' || k === 'p') {
      const p = par[cur()];
      A.play(p >= 0 ? 'back' : 'error');
      if (p >= 0) S.flyTo(p);
      return;
    }
    const map = {
      o: 'orb',
      l: 'lab',
      r: 'lock',
      g: 'gam',
      h: 'help',
      '?': 'help',
      j: 'game',
      b: 'list',
      f: 'full',
      Home: 'home',
      m: 'music',
      i: 'cine',
      y: 'autorot',
      z: 'album',
      u: 'con',
      n: 'stars',
      k: 'mode',
      v: 'sunf',
      x: 'snd',
    };
    if (map[k]) {
      e.preventDefault();
      act[map[k]]();
      setBtn();
      if (k === 'b' && $('#list').classList.contains('on')) setTimeout(() => $('#search').focus(), 30);
      return;
    }
    if (k === '.' || k === '>') return faster(1);
    if (k === ',' || k === '<') return faster(-1);
    if (k === 't') {
      timeAct('now');
      return;
    }
    if (k === 'c') {
      S.resetLook();
      return;
    }
    if (
      [
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'PageUp',
        'PageDown',
        'a',
        'd',
        'w',
        's',
        'q',
        'e',
        '+',
        '-',
        '=',
      ].includes(k)
    ) {
      e.preventDefault();
      keys.add(k);
    }
  });
  window.addEventListener('keyup', (e) => {
    keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  });
  window.addEventListener('blur', () => keys.clear());
  const seq = [];
  let t42 = 0;
  const cur = () => (S.cam.fly && S.cam.fly.to !== undefined ? S.cam.fly.to : S.focus);
  /* držené klávesy a pomalé otáčení: volá hlavní smyčka enginu jednou za snímek */
  /* meze modelu: polohy jsou ověřené proti JPL DE422 pro roky −1000 až 3000; mimo ně jednou taktně upozorníme a nic neomezujeme */
  let outRange = false;
  S.ticks.push(() => {
    const y = 2000 + (S.jd - 2451545) / 365.25,
      o = y < -1000 || y > 3000;
    if (o && !outRange)
      toast(
        K()
          ? 'Tak daleko v čase už planety jen odhadujeme. Leť klidně dál!'
          : 'Mimo roky 1000 př. n. l. až 3000 n. l. jsou polohy těles jen přibližné – model je ověřený pro toto období.',
        7000
      );
    outRange = o;
  });
  S.ticks.push((dt) => {
    if (S.autoRot && !S.cam.fly) S.rotate(-38 * dt, 0);
    if (!keys.size) return;
    const v = 520 * dt,
      has = (...a) => a.some((x) => keys.has(x));
    let dx = 0,
      dy = 0;
    if (has('ArrowLeft', 'a')) dx += v;
    if (has('ArrowRight', 'd')) dx -= v;
    if (has('ArrowUp', 'w')) dy += v;
    if (has('ArrowDown', 's')) dy -= v;
    if (dx || dy) S.rotate(dx, dy);
    if (has('q', '+', '=', 'PageUp')) S.zoom(Math.exp(-dt * 1.6));
    if (has('e', '-', 'PageDown')) S.zoom(Math.exp(dt * 1.6));
  });

  // ---------- iterace 3: album, stroj času, porovnání, průvodce, tajné menu, UFO ----------
  function drawAlbum() {
    const seen = Object.keys(G.seen).length;
    $('#album-in').innerHTML =
      `<h3>${K() ? '🗂 Tvoje album nálepek' : '🗂 Atlas těles'} <small>${seen} / ${N}</small></h3>` +
      GROUPS.map(([t, name]) => {
        const xs = order.filter((i) => B[i].type === t);
        return (
          `<h4>${name}</h4><div class="grid">` +
          xs
            .map(
              (i) =>
                `<button class="st ${G.seen[B[i].id] ? 'on' : ''}" data-i="${i}" title="${G.seen[B[i].id] || !K() ? B[i].cs : '???'}"><b>${ico(i, 40)}</b><span>${G.seen[B[i].id] || !K() ? B[i].cs : '?'}</span></button>`
            )
            .join('') +
          '</div>'
        );
      }).join('');
  }
  $('#album').addEventListener('click', (e) => {
    const t = e.target.closest('.st');
    if (t) {
      toggle('#album', false);
      S.flyTo(+t.dataset.i);
    }
  });
  $('#tm').addEventListener('click', (e) => {
    const k = e.target.dataset.e;
    if (k === undefined) return;
    toggle('#tm', false);
    A.play('timewarp');
    S.rateIdx = 1;
    S.paused = false;
    if (+k < 0) {
      S.jd = Date.now() / 86400000 + 2440587.5;
      drawTime();
      return;
    }
    const ev = EVENTS[+k],
      i = idx.get(ev[2]);
    S.jd = ev[1];
    drawTime();
    setTimeout(() => S.flyTo(i, { alt: ev[3] > 1000 ? ev[3] : shape[i].rmax * ev[3] }), 60);
    toast('🕰 ' + ev[0]);
  });
  // porovnání velikostí: kotouče se kreslí ze skutečných map (ball.js), ne zvětšením malé ikony. Řazeno od nejmenšího, měřítko se přizpůsobí šířce okna.
  function drawCmp(i) {
    const b = B[i],
      lad = [
        'duende',
        'bennu',
        'phobos',
        'vesta',
        'ceres',
        'moon',
        'mercury',
        'mars',
        'earth',
        'neptune',
        'saturn',
        'jupiter',
        'sun',
      ]
        .map((n) => idx.get(n))
        .filter((j) => j !== i),
      sm = lad.filter((j) => B[j].R < b.R).pop(),
      lg = lad.find((j) => B[j].R > b.R);
    const set = [...new Set([sm, i, lg, EARTH].filter((j) => j !== undefined))].sort((x, y) => B[x].R - B[y].R),
      mx = B[set[set.length - 1]].R,
      r = b.R / B[EARTH].R,
      gap = 16;
    const avail = Math.max(250, Math.min(760, innerWidth * 0.92, innerWidth - 12) - 40);
    let D = Math.max(90, Math.min(240, innerHeight * 0.36));
    for (let it = 0; it < 5; it++) {
      const tot =
        set.reduce((s, j) => s + Math.max(62, ballSize(B[j], (D * B[j].R) / mx).w), 0) + gap * (set.length - 1);
      if (tot <= avail) break;
      D *= Math.max(0.4, (avail / tot) * 0.97);
    }
    $('#cmp-in').innerHTML =
      `<h3>⚖ ${b.cs}: ${K() ? 'jak je to velké?' : 'porovnání velikosti'}</h3><div class="cmp" style="gap:${gap}px">` +
      set
        .map((j) => {
          const dia = (D * B[j].R) / mx;
          return `<div class="${j === i ? 'me' : ''}"><b>${dia >= 3 ? `<canvas data-b="${j}" data-d="${dia}"></canvas>` : '<i class="dot"></i>'}</b><span>${B[j].cs}</span><small>${fmtDist(B[j].R * 2).replace(/ \(.*/, '')}${dia < 3 ? ' · menší než tečka' : ''}</small></div>`;
        })
        .join('') +
      `</div><p>${i === EARTH ? 'Do Slunce by se vedle sebe vešlo 109 Zemí.' : r >= 1 ? `${b.cs} má průměr <b>${sig(r)}×</b> větší než Země${r > 2 ? ` a vešlo by se do něj asi <b>${nf(Math.round(r * r * r))}</b> Zemí` : ''}.` : `Země má průměr <b>${sig(1 / r)}×</b> větší. Do Země by se ${b.cs} vešlo asi <b>${nf(Math.round(1 / (r * r * r)))}×</b>.`} Kotouče jsou ve skutečném poměru${set.some((j) => B[j].id === 'saturn') ? ' (u Saturnu se počítá koule, prstence jsou navíc)' : ''}.</p>`;
    $('#cmp-in')
      .querySelectorAll('canvas')
      .forEach((cv) => {
        const j = +cv.dataset.b,
          dia = +cv.dataset.d;
        drawBall(cv, B[j], j, dia, null);
        loadMap(B[j].id).then((m) => {
          if (m && cv.isConnected) drawBall(cv, B[j], j, dia, m);
        });
      });
  }
  function drawDev() {
    $('#dev-in').innerHTML =
      `<h3>🛠 Tajné menu</h3><p>${nf(S.fps)} snímků/s · kvalita ${S.quality}/2 · zvuků ${A.count}</p><div class="row"><button data-d="q-">Kvalita −</button><button data-d="q+">Kvalita +</button><button data-d="disco">🪩 Disko</button><button data-d="real">🔦 Reálný jas</button><button data-d="all">Odemknout všechna razítka</button><button data-d="ufo">🛸 Zavolat talíř</button></div><p>Skok na datum: <input id="dev-date" type="date" min="1600-01-01" max="2200-12-31"> <button data-d="go">Skoč</button></p><p><small>Další tajemství: zkus kód ↑↑↓↓←→←→BA, napiš 42, do hledání zadej „tesla“, „nibiru“ nebo „vulkan“, sedmkrát klikni na nadpis.</small></p>`;
  }
  $('#dev').addEventListener('click', (e) => {
    const d = e.target.dataset.d;
    if (!d) return;
    if (d === 'q-') S.quality = Math.max(0, S.quality - 1);
    if (d === 'q+') S.quality = Math.min(2, S.quality + 1);
    if (d === 'disco') act.disco();
    if (d === 'real') act.real();
    if (d === 'ufo') {
      toggle('#dev', false);
      ufo();
    }
    if (d === 'all') {
      B.forEach((b) => {
        G.seen[b.id] = 1;
      });
      save();
      markSeen();
      drawGame();
      toast('Všechna razítka odemčena. Podvodníčku!');
    }
    if (d === 'go') {
      const v = $('#dev-date').value;
      if (v) {
        S.jd = new Date(v + 'T12:00:00Z').getTime() / 86400000 + 2440587.5;
        drawTime();
        A.play('timewarp');
      }
    }
    drawDev();
    S.wake();
  });
  document.addEventListener(
    'pointerdown',
    (e) => {
      if ($('#more').classList.contains('on') && !e.target.closest('#more') && !e.target.closest('[data-a="more"]'))
        toggle('#more', false);
    },
    true
  );
  $('#more').addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t || !act[t.dataset.a]) return;
    toggle('#more', false);
    act[t.dataset.a]();
    setBtn();
    S.wake();
  });
  let gt = 0;
  function guide(i) {
    const g = $('#guide');
    if (!K() || tut.running()) {
      g.classList.remove('on');
      return;
    }
    const b = B[i],
      inf = S.info(i),
      car = inf.earth / 130 / 8766;
    const txt =
      FUN[b.id] ||
      (b.type === 'comet'
        ? `${b.cs} je špinavá sněhová koule. Až přiletí blíž ke Slunci, naroste jí ohon dlouhý miliony kilometrů.`
        : b.type === 'moon'
          ? `${b.cs} obíhá kolem ${GEN[b.parent] || B[par[i]].cs} jednou za ${fmtPer(period[i])}.`
          : `Autem po dálnici bys sem ze Země jel ${car > 2 ? sig(car) + ' let' : nf(car * 365) + ' dní'}. Bez přestávky na svačinu!`);
    $('#guide p').textContent = txt;
    g.classList.add('on');
    A.play('guide');
    clearTimeout(gt);
    gt = setTimeout(() => g.classList.remove('on'), document.body.classList.contains('mob') ? 6500 : 11000);
  }
  $('#guide').addEventListener('click', () => $('#guide').classList.remove('on'));
  // létající talíř: občas po dlouhém skoku připomene, jak daleko to bylo (světlo, letadlo). Dospělé rozhraní: totéž krátkou zprávou, vzácněji.
  let ufoT = -1e9,
    hopN = 0,
    lastHop = null;
  function hop(a, b, force) {
    const km = Math.hypot(P[a * 3] - P[b * 3], P[a * 3 + 1] - P[b * 3 + 1], P[a * 3 + 2] - P[b * 3 + 2]);
    lastHop = [a, b];
    if (tut.running() || document.hidden) return false;
    if (!force) {
      if (km < 299792.458 * 60) return false;
      hopN++;
      const now = performance.now();
      if (now - ufoT < (K() ? 100000 : 240000) || hopN % (K() ? 3 : 6) !== 1) return false;
      ufoT = now;
    }
    const h = km / 900,
      plane = h < 48 ? nf(h, 0) + ' hodin' : h < 24 * 700 ? nf(h / 24, 0) + ' dní' : sig(h / 8766) + ' let',
      d = fmtDist(km).replace(/ \(.*/, '');
    if (!K()) {
      toast(
        `💡 ${B[a].cs} → ${B[b].cs}: ${d}. Světlo tu cestu letí <b>${fmtLight(km)}</b>, dopravní letadlo by letělo ${plane}.`
      );
      return true;
    }
    const u = $('#ufo');
    u.querySelector('p').innerHTML =
      `Právě jsi přeskočil <b>${d}</b>. I světlo tu cestu letí <b>${fmtLight(km)}</b> a letadlo by letělo <b>${plane}</b>!`;
    u.style.top = 14 + Math.random() * 10 + '%';
    u.classList.remove('fly');
    void u.offsetWidth;
    u.classList.add('fly');
    A.play('ufo', 1, 0.3);
    return true;
  }
  $('#ufo').addEventListener('animationend', (e) => {
    if (e.target.id === 'ufo') $('#ufo').classList.remove('fly');
  });
  const ufo = () => {
    const l = lastHop || [EARTH, idx.get('neptune')];
    hop(l[0], l[1], true);
  };
  let tc = 0,
    tct = 0;
  $('#top h1').addEventListener('click', () => {
    const n = performance.now();
    tc = n - tct < 600 ? tc + 1 : 1;
    tct = n;
    if (tc >= 7) {
      tc = 0;
      A.play('egg');
      toast('💛 Vyrobila Kristína pro Ondru, Olivera a Sophii. Ať vás vesmír baví!');
      if (api.X) api.X.burst(true);
    }
  });
  // ---------- start ----------
  const api = {
    toast,
    G: () => G,
    order,
    kid: K,
    setMode,
    act: (n) => {
      act[n]();
      setBtn();
      S.wake();
    },
    time: timeAct,
    refresh,
  };
  const tut = createTutorial(S, A, api);
  api.tut = tut;
  document.body.classList.toggle('kid', G.kid);
  if (G.kid) $('#top h1').innerHTML = '🚀 Vesmírná výprava <small>200</small>';
  drawGame();
  setBtn();
  drawTime();
  if (!G.cur) nextMission();
  else drawMission();
  markSeen();
  volUI();
  $('#sndn').textContent = A.count;
  const sp = $('#splash'),
    spMode = () => {
      $('#sp-adult').classList.toggle('sel', !G.kid);
      $('#sp-kid').classList.toggle('sel', G.kid);
    };
  spMode();
  $('#sp-adult').onclick = () => {
    A.unlock();
    setMode(false);
    spMode();
  };
  $('#sp-kid').onclick = () => {
    A.unlock();
    setMode(true);
    spMode();
  };
  $('#sp-tut').onclick = () => {
    A.unlock();
    sp.classList.remove('on');
    tut.start();
  };
  $('#sp-go').onclick = () => {
    A.unlock();
    sp.classList.remove('on');
    A.play('orbit_on');
  };
  $('#help [data-a="tut"]').onclick = () => act.tut();
  A.kidMood = G.kid;
  S.kid = G.kid;
  $('#sunchip').onclick = () => {
    act.sunf();
    setBtn();
  };
  const startMusic = () => {
    if (G.music === undefined ? true : G.music) A.setMusic(true);
  };
  $('#cineoff').onclick = () => act.cine();
  $('#sp-tut').addEventListener('click', startMusic);
  $('#sp-go').addEventListener('click', startMusic);
  {
    const h = (location.hash || '').slice(1).replace(/-/g, '_');
    if (idx.has(h)) setTimeout(() => S.jump(idx.get(h)), 50);
  }
  return api;
}
