// Soustava 200 – ovládání, panely, deník astronoma (hra).
import { B, N, idx, par, kids, root, SUN, EARTH, AU, period, semi, shape } from './sim.js';
import { RATE_LABEL } from './engine.js';
import { createTutorial } from './tutorial.js';
import CAT from './cat.json';

const $ = (s) => document.querySelector(s), el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h !== undefined) e.innerHTML = h; return e; };
const nf = (x, d = 0) => x.toLocaleString('cs-CZ', { maximumFractionDigits: d, minimumFractionDigits: 0 });
const sig = (x) => x >= 100 ? nf(x) : x >= 10 ? nf(x, 1) : x >= 1 ? nf(x, 2) : nf(x, 3);
const TYPE = { star: 'hvězda', planet: 'planeta', dwarf: 'trpasličí planeta', moon: 'měsíc', asteroid: 'planetka', comet: 'kometa', tno: 'těleso za Neptunem', centaur: 'kentaur', interstellar: 'mezihvězdný návštěvník' };
const GROUPS = [['star', 'Slunce'], ['planet', 'Planety'], ['dwarf', 'Trpasličí planety'], ['moon', 'Měsíce'], ['asteroid', 'Planetky'], ['comet', 'Komety'], ['tno', 'Za Neptunem'], ['centaur', 'Kentauři'], ['interstellar', 'Od jiných hvězd']];
const GEN = { mars: 'Marsu', jupiter: 'Jupiteru', saturn: 'Saturnu', uranus: 'Uranu', neptune: 'Neptunu', earth: 'Země', pluto: 'Pluta', eris: 'Eris', haumea: 'Haumey', quaoar: 'Quaoaru', orcus: 'Orku', ida: 'planetky Ida', didymos: 'planetky Didymos' };
export const fmtDist = (km) => km < 1 ? nf(km * 1000) + ' m' : km < 1e4 ? sig(km) + ' km' : km < 1e6 ? nf(Math.round(km)) + ' km' : km < 0.02 * AU ? sig(km / 1e6) + ' mil. km' : sig(km / 1e6) + ' mil. km (' + sig(km / AU) + ' AU)';
const fmtLight = (km) => { const s = km / 299792.458; return s < 1 ? nf(s * 1000) + ' ms' : s < 90 ? nf(s, 1) + ' s' : s < 5400 ? nf(s / 60, 1) + ' min' : s < 172800 ? nf(s / 3600, 1) + ' h' : nf(s / 86400, 1) + ' dne'; };
const fmtPer = (d) => !isFinite(d) ? 'nevrátí se' : d < 2 ? nf(d * 24, 1) + ' h' : d < 800 ? nf(d, 1) + ' dne' : d < 365.25 * 2000 ? sig(d / 365.25) + ' roku' : nf(Math.round(d / 365.25 / 100) * 100) + ' let';
const sizeLike = (D) => D < 0.06 ? 'jako velký dům' : D < 0.4 ? 'jako stadion' : D < 2 ? 'jako kopec' : D < 15 ? 'jako velké město' : D < 80 ? 'jako Praha s okolím' : D < 600 ? 'jako Česká republika' : D < 1800 ? 'jako střední Evropa' : D < 6000 ? 'jako celá Evropa' : D < 16000 ? 'podobně jako Země' : nf(D / 12742, 1) + '× větší než Země';
const ICOLS = CAT.iconCols || 16, FRAC = { saturn: 0.42, uranus: 0.42, chariklo: 0.42, haumea: 0.42 };
// ikona = výřez z atlasu podobizen. Průměr kotouče roste s logaritmem poloměru: t = (log10 R + 1) / 6,84, průměr = base · (0,16 + 0,84 · t^2,2)
// → Slunce 1,00 · Jupiter 0,76 · Saturn 0,74 · Uran 0,66 · Země 0,55 · Mars 0,50 · Merkur 0,48 · Měsíc 0,45 · Ceres 0,37 · balvan 0,16.
// Buňka s prstenci je širší (kotouč v ní zabírá 42 %), aby kotouč Saturnu zůstal ve správném poměru k Jupiteru.
export const icoDia = (b, base) => base * (0.16 + 0.84 * Math.pow(Math.min(1, Math.max(0, (Math.log10(b.R) + 1) / 6.84)), 2.2));
const ico = (i, base) => { const b = B[i], comet = b.type === 'comet' || b.id === 'borisov', sz = Math.round(comet ? base * 0.72 : icoDia(b, base) / (FRAC[b.id] || 0.94));
  return `<i class="ic" style="width:${sz}px;height:${sz}px;background-size:${ICOLS * sz}px auto;background-position:-${(i % ICOLS) * sz}px -${Math.floor(i / ICOLS) * sz}px"></i>`; };
const MISSIONS = [['sun', 'Najdi hvězdu, kolem které všechno obíhá.'], ['moon', 'Jediné cizí těleso, po kterém se prošli lidé.'], ['mars', 'Červená planeta s nejvyšší sopkou Sluneční soustavy.'], ['saturn', 'Která planeta má nejkrásnější prstence?'], ['jupiter', 'Největší planeta. Má Velkou rudou skvrnu.'],
  ['venus', 'Nejteplejší planeta, celá zahalená v mracích.'], ['mercury', 'Nejmenší planeta, nejblíž Slunci.'], ['io', 'Měsíc, na kterém pořád soptí sopky. Obíhá kolem největší planety.'], ['europa', 'Pod ledem tohoto Jupiterova měsíce se skrývá oceán.'], ['titan', 'Jediný měsíc s hustou oranžovou atmosférou a jezery.'],
  ['pluto', 'Trpasličí planeta s velkým světlým srdcem.'], ['halley', 'Kometa, která se vrací každých 76 let.'], ['phobos', 'Brambůrkovitý měsíc Marsu, který pomalu padá k planetě.'], ['enceladus', 'Malý bílý měsíc Saturnu, ze kterého tryskají gejzíry.'], ['ganymede', 'Největší měsíc celé Sluneční soustavy.'],
  ['ceres', 'Největší těleso v pásu planetek mezi Marsem a Jupiterem.'], ['oumuamua', 'První návštěvník od jiné hvězdy. Tvarem připomíná doutník.'], ['bennu', 'Planetka, ze které sonda OSIRIS-REx přivezla vzorek na Zemi.'], ['triton', 'Velký měsíc Neptunu, který obíhá pozpátku.'], ['miranda', 'Měsíc Uranu, který vypadá jako poslepovaný z kousků.'],
  ['iapetus', 'Měsíc Saturnu: jedna půlka tmavá, druhá bílá.'], ['mimas', 'Měsíc s obřím kráterem – vypadá jako Hvězda smrti.'], ['charon', 'Velký souputník Pluta.'], ['67p', 'Kometa ve tvaru gumové kachničky. Přistál na ní modul Philae.'], ['vesta', 'Jasná planetka s obřím kráterem na jižním pólu. Navštívila ji sonda Dawn.'],
  ['uranus', 'Planeta, která se po své dráze kutálí naležato.'], ['neptune', 'Nejvzdálenější planeta – modrá a větrná.'], ['eros', 'První planetka, na které přistála sonda.'], ['dimorphos', 'Měsíček planetky, do kterého schválně narazila sonda DART.'], ['arrokoth', 'Nejvzdálenější těleso navštívené sondou. Vypadá jako sněhulák.'],
  ['sedna', 'Jedno z nejvzdálenějších těles – jeden oběh mu trvá přes 11 000 let.'], ['hyperion', 'Měsíc Saturnu podobný mořské houbě.'], ['borisov', 'Kometa, která přiletěla od jiné hvězdy.'], ['deimos', 'Menší ze dvou měsíců Marsu.'], ['callisto', 'Jupiterův měsíc s nejvíc krátery ze všech.']].filter(m => idx.has(m[0]));
const RANKS = [[0, 'Zvědavec'], [80, 'Pozorovatel'], [250, 'Kadet'], [600, 'Navigátor'], [1200, 'Kapitán'], [2500, 'Admirál'], [5000, 'Vesmírný profesor']];
const PTS = { star: 10, planet: 10, dwarf: 15, moon: 10, asteroid: 15, comet: 20, tno: 20, centaur: 20, interstellar: 30 };

export function createUI(S, A) {
  // pořadí pro Tab: Slunce, planety se svými měsíci, trpasličí planety, planetky, kentauři, TNO, komety, mezihvězdné
  const order = [], helio = (t) => B.map((b, i) => i).filter(i => par[i] === SUN && B[i].type === t).sort((a, b) => (t === 'asteroid' || t === 'comet' ? B[b].fame - B[a].fame || B[b].R - B[a].R : semi[a] - semi[b]));
  const withKids = (i) => { order.push(i); for (const k of [...kids[i]].sort((a, b) => semi[a] - semi[b])) withKids(k); };
  order.push(SUN); for (const t of ['planet', 'dwarf', 'asteroid', 'centaur', 'tno', 'comet', 'interstellar']) for (const i of helio(t)) withKids(i);
  const planets = helio('planet'), numKey = [SUN, ...planets, idx.get('pluto')];

  // ---------- hra ----------
  let G = { pts: 0, seen: {}, done: {}, cur: null, hint: false, quiz: { ok: 0, n: 0, streak: 0 }, help: false, kid: false }; const K = () => G.kid;
  try { const s = JSON.parse(localStorage.getItem('s200') || 'null'); if (s && s.seen) G = Object.assign(G, s); } catch (e) { /* bez úložiště */ }
  const save = () => { try { localStorage.setItem('s200', JSON.stringify(G)); } catch (e) { /* nic */ } };
  const rank = () => { let r = RANKS[0], nx = null; for (const x of RANKS) { if (G.pts >= x[0]) r = x; else { nx = x; break; } } return [r, nx]; };
  let toastT = 0; const toast = (h) => { const t = $('#toast'); t.innerHTML = h; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 3800); };
  const addPts = (n) => { const r0 = rank()[0]; G.pts += n; const r1 = rank()[0]; if (r1 !== r0) setTimeout(() => { toast(`🎖️ Nová hodnost: <b>${r1[1]}</b>`); A.play('rank'); }, 1800); };
  function nextMission() { const left = MISSIONS.filter(m => !G.done[m[0]]); G.cur = left.length ? left[Math.floor(Math.random() * Math.min(left.length, 6))][0] : null; G.hint = false; save(); drawGame(); drawMission(); }
  function visit(i) {
    const b = B[i]; let msg = '';
    if (!G.seen[b.id]) { G.seen[b.id] = 1; const p = PTS[b.type] + (b.R < 1 ? 10 : 0); addPts(p); msg = K() ? `✨ Paráda, nový objev: <b>${b.cs}</b>! +${p} bodů` : `✨ Nový objev: <b>${b.cs}</b> +${p} b.`; A.play('stamp_' + b.type); }
    if (G.cur === b.id && !G.done[b.id]) { G.done[b.id] = 1; addPts(50); msg = K() ? `🎯 Uhodl jsi to! Je to <b>${b.cs}</b>. +50 bodů` : `🎯 Hádanka vyřešena: <b>${b.cs}</b> +50 b.`; setTimeout(() => A.play('mission'), 500); setTimeout(nextMission, 2500); }
    if (msg) { toast(msg); save(); drawGame(); if (S.sel === i) drawCard(i); markSeen(); }
  }
  S.on.visit = (i) => { if (!G.seen[B[i].id] || (G.cur === B[i].id && !G.done[B[i].id])) visit(i); };
  function drawMission() { const m = MISSIONS.find(x => x[0] === G.cur), e = $('#mission'); if (!m) { e.innerHTML = G.cur === null && Object.keys(G.done).length ? '🏆 Všechny hádanky vyřešeny!' : ''; e.style.display = e.innerHTML ? '' : 'none'; return; }
    const b = B[idx.get(m[0])], hint = G.hint ? ` <i>Nápověda: ${TYPE[b.type]}${par[idx.get(m[0])] > 0 ? ' ' + (GEN[b.parent] || '') : ''}, začíná na „${b.cs[0]}“.</i>` : '';
    e.style.display = ''; e.innerHTML = `<span>🎯 <b>${K() ? 'Úkol pro tebe:' : 'Hádanka:'}</b> ${m[1]}${hint}</span> <button data-a="hint" title="Nápověda">?</button><button data-a="skip" title="Jiná hádanka">↻</button>`; }
  $('#mission').addEventListener('click', (e) => { const a = e.target.dataset.a; if (a === 'hint') { G.hint = true; drawMission(); A.play('hint'); } if (a === 'skip') { nextMission(); A.play('skip'); } });
  function drawGame() {
    const [r, nx] = rank(), seen = Object.keys(G.seen).length; $('#score').innerHTML = `⭐ ${nf(G.pts)}`;
    let h = `<h3>Deník astronoma</h3><div class="rank"><b>${r[1]}</b> · ${nf(G.pts)} bodů${nx ? ` <small>(do hodnosti ${nx[1]} zbývá ${nf(nx[0] - G.pts)})</small>` : ''}</div><div class="bar"><i style="width:${nx ? Math.min(100, (G.pts - r[0]) / (nx[0] - r[0]) * 100) : 100}%"></i></div>`;
    h += `<p>Navštívená tělesa: <b>${seen} / ${N}</b>. Těleso navštívíš tak, že k němu doletíš (dvojklik nebo Enter).</p><div class="cats">`;
    for (const [t, name] of GROUPS) { const all = B.filter(b => b.type === t), s = all.filter(b => G.seen[b.id]).length; h += `<div><span>${name}</span><div class="bar"><i style="width:${s / all.length * 100}%"></i></div><em>${s}/${all.length}</em></div>`; }
    h += `</div><p>Hádanky: <b>${Object.keys(G.done).length} / ${MISSIONS.length}</b> · Kvíz: <b>${G.quiz.ok}</b> správně z ${G.quiz.n}</p><div class="row"><button data-a="quiz" class="pri">Kvíz: otázka za 10 b.</button><button data-a="reset">Začít znovu</button></div><div id="quiz"></div>`;
    $('#game').innerHTML = h;
  }
  function quiz() {
    const q = $('#quiz'), rnd = (a) => a[Math.floor(Math.random() * a.length)], kind = Math.floor(Math.random() * 3); let text, opts, ok;
    if (kind === 0) { let a, b; do { a = rnd(B); b = rnd(B); } while (a === b || Math.max(a.R, b.R) / Math.min(a.R, b.R) < 1.4 || a.fame + b.fame < 5); text = 'Které těleso je větší?'; opts = [a.cs, b.cs]; ok = a.R > b.R ? 0 : 1; }
    else if (kind === 1) { const moons = B.filter(b => b.type === 'moon' && b.fame >= 2), m = rnd(moons), ps = ['earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].filter(p => p !== m.parent).sort(() => Math.random() - 0.5).slice(0, 3); opts = [m.parent, ...ps].sort(() => Math.random() - 0.5); ok = opts.indexOf(m.parent); opts = opts.map(p => B[idx.get(p)].cs); text = `Kolem čeho obíhá měsíc <b>${m.cs}</b>?`; }
    else { const c = rnd(B.filter(b => b.fame >= 3 && b.type !== 'star')), ts = ['planeta', 'měsíc', 'planetka', 'kometa', 'trpasličí planeta'], right = c.type === 'tno' || c.type === 'centaur' || c.type === 'interstellar' ? null : TYPE[c.type]; if (!right) return quiz(); opts = [right, ...ts.filter(t => t !== right).sort(() => Math.random() - 0.5).slice(0, 2)].sort(() => Math.random() - 0.5); ok = opts.indexOf(right); text = `Co je <b>${c.cs}</b>?`; }
    q.innerHTML = `<div class="q">${text}</div>` + opts.map((o, k) => `<button data-q="${k}">${o}</button>`).join('');
    q.onclick = (e) => { const k = e.target.dataset.q; if (k === undefined) return; G.quiz.n++; const good = +k === ok; A.play(good ? (G.quiz.streak >= 4 ? 'quiz_ok3' : G.quiz.streak >= 1 ? 'quiz_ok2' : 'quiz_ok') : 'quiz_bad'); if (good) { G.quiz.ok++; G.quiz.streak++; addPts(10 + Math.min(10, (G.quiz.streak - 1) * 2)); } else G.quiz.streak = 0;
      [...q.querySelectorAll('button')].forEach((b, j) => { b.disabled = true; if (j === ok) b.classList.add('ok'); else if (j === +k) b.classList.add('bad'); }); q.onclick = null; save();
      const m = el('div', 'res', good ? `Správně! +${10 + Math.min(10, (G.quiz.streak - 1) * 2)} b.${G.quiz.streak > 1 ? ' Série ' + G.quiz.streak + '.' : ''}` : 'Tentokrát ne.'); q.appendChild(m); const nx = el('button', 'pri', 'Další otázka'); nx.onclick = () => { drawGame(); quiz(); }; q.appendChild(nx); $('#score').innerHTML = `⭐ ${nf(G.pts)}`; };
  }
  $('#game').addEventListener('click', (e) => { const a = e.target.dataset.a; if (a === 'quiz') quiz(); if (a === 'reset') { if (e.target.dataset.sure) { G = { pts: 0, seen: {}, done: {}, cur: null, hint: false, quiz: { ok: 0, n: 0, streak: 0 }, help: true, kid: G.kid }; save(); nextMission(); markSeen(); } else { e.target.dataset.sure = 1; e.target.textContent = 'Opravdu smazat deník?'; } } });

  // ---------- karta tělesa ----------
  function drawCard(i) {
    const b = B[i], p = par[i], D = b.R * 2, inf = S.info(i), rows = [];
    const sub = b.type === 'moon' ? `měsíc ${GEN[b.parent] || B[p].cs}` : TYPE[b.type];
    const kid = b.kid || (b.type === 'moon' ? `${b.cs} je měsíc ${GEN[b.parent] || B[p].cs}. Velikostí ${sizeLike(D)}.` : b.type === 'comet' ? `${b.cs} je kometa – špinavá ledová koule. U Slunce jí naroste ohon.` : `${b.cs} je ${TYPE[b.type]}. Velikostí ${sizeLike(D)}.`);
    rows.push(['Průměr', (b.abc && Math.max(...b.abc) / Math.min(...b.abc) > 1.15 ? b.abc.map(x => sig(x * 2)).join(' × ') + ' km' : fmtDist(D)) + (b.kid && i !== EARTH ? ` <small>(${sizeLike(D)})</small>` : '')]);
    if (i !== SUN) rows.push(['Od Slunce teď', `<span id="c-sun">${fmtDist(inf.sun)}</span>`]);
    if (i !== EARTH) rows.push(['Od Země teď', `<span id="c-earth">${fmtDist(inf.earth)}</span>`], ['Světlo k Zemi letí', `<span id="c-light">${fmtLight(inf.earth)}</span>`]);
    if (p > 0) rows.push([`Od ${GEN[b.parent] || B[p].cs}`, fmtDist(semi[i])]);
    if (i !== SUN) rows.push(['Jeden oběh', fmtPer(period[i])]);
    if (b.rot) rows.push(['Otočka', fmtPer(Math.abs(b.rot) / 24) + (b.rot < 0 ? ' (pozpátku)' : '')]);
    if (b.g) rows.push(['Tíže', b.g > 0.05 ? `${sig(b.g / 9.80665)} g <small>(skok ${sig(Math.min(1e6, 0.5 * 9.80665 / b.g))} m vysoko)</small>` : b.vesc < 2 ? `skoro žádná <small>(odrazem bys odletěl)</small>` : `${sig(b.g / 9.80665 * 1000)} tisícin g`]);
    if (b.atm && b.atm.comp) rows.push(['Atmosféra', b.atm.comp]);
    if (b.disc) rows.push(['Objev', `${b.disc[0]}${b.disc[1] ? ', ' + b.disc[1] : ''}`]);
    if (b.missions) rows.push(['Sondy', b.missions]);
    const seen = G.seen[b.id], SUNF = ['Bílé světlo: fotosféra, tmavé skvrny a světlé fakule u okraje. Takhle vypadá Slunce přes bezpečný filtr.', 'H-alfa (656 nm): chromosféra – tmavá vlákna (filamenty), světlé plochy kolem skvrn a protuberance nad okrajem.', 'EUV 171 Å: koróna horká asi milion °C. Svítí smyčky plazmatu, které drží magnetické pole.'];
    const sunBox = i === SUN ? `<div class="sunf"><button data-a="sunf" class="pri">🔆 Filtr: ${['bílé světlo', 'H-alfa', 'EUV 171 Å'][S.sunMode]} (V)</button><p>${SUNF[S.sunMode]} <small>Skvrny a erupce jsou ilustrace: poloha podle aktivních oblastí snímku SDO, ne dnešní stav.</small></p></div>` : '';
    if (K()) { // dětská karta: tykání, velké dlaždice se zajímavostmi
      const tiles = [], yrs = period[i] / 365.25, kmh = (v) => { const h = inf.earth / v; return h < 48 ? nf(h, 0) + ' hodin' : h < 24 * 700 ? nf(h / 24, 0) + ' dní' : sig(h / 8766) + ' let'; };
      if (b.g > 0.02) tiles.push(['🦘', `Vyskočil bys <b>${sig(Math.min(9999, 0.5 * 9.80665 / b.g))} m</b> vysoko.`]); else if (i !== SUN) tiles.push(['🦘', 'Stačí se odrazit a <b>odletíš do vesmíru</b>.']);
      if (b.g > 0.02) tiles.push(['⚖️', `Kdo má na Zemi 30 kg, tady „váží“ <b>${sig(30 * b.g / 9.80665)} kg</b>.`]);
      if (par[i] === SUN && isFinite(yrs)) tiles.push(['🎂', yrs > 8 ? `Rok tu trvá <b>${sig(yrs)} pozemských let</b>. Osmiletý by neoslavil ani první narozeniny.` : `Osmiletý by tu slavil už <b>${nf(Math.floor(8 / yrs))}. narozeniny</b>.`]);
      if (i !== EARTH) tiles.push(['✈️', `Letadlem ze Země bys letěl <b>${kmh(900)}</b>.`], ['🚀', `Nejrychlejší sondou <b>${kmh(58000)}</b>, světlo to zvládne za <b>${fmtLight(inf.earth)}</b>.`]);
      tiles.push(['📏', `Průměr <b>${fmtDist(D).replace(/ \(.*/, '')}</b> – ${sizeLike(D)}.`]);
      if (b.rot) tiles.push(['🌗', `Den tu trvá <b>${fmtPer(Math.abs(b.rot) / 24)}</b>${b.rot < 0 ? ' a točí se pozpátku!' : '.'}`]);
      $('#card').innerHTML = `<div class="hd"><div class="ball">${ico(i, 56)}</div><div><h2>${b.cs}</h2><div class="sub">${sub}</div></div><div class="stamp ${seen ? 'on' : ''}">${seen ? '✓' : '?'}</div></div>
        <p class="kid">${kid}</p><div class="tiles">${tiles.map(t => `<div><span>${t[0]}</span><p>${t[1]}</p></div>`).join('')}</div>${b.adult ? `<p class="adult"><b>Pro zvídavé:</b> ${b.adult}</p>` : ''}${b.missions ? `<p class="adult">🛰️ <b>Byly tu sondy:</b> ${b.missions}</p>` : ''}${sunBox}
        <p class="src">${b.mk === 'foto' ? '📷 Tak to tam opravdu vypadá – fotily to sondy.' : i === SUN ? '' : '🎨 Zblízka to nikdo nevyfotil, povrch je namalovaný.'}</p>
        <div class="row">${S.focus === i ? `<button data-a="close" class="pri">🔍 Blíž</button><button data-a="far">🔭 Dál</button>` : `<button data-a="go" class="pri">🚀 Leť tam!</button>`}${p > 0 ? `<button data-a="parent">↑ ${B[p].cs}</button>` : ''}</div>`;
      drawSub(); return; }
    $('#card').innerHTML = `<div class="hd"><div class="ball">${ico(i, 46)}</div><div><h2>${b.cs}</h2><div class="sub">${sub}${b.name !== b.cs && !/[()]/.test(b.name) ? ' · ' + b.name.replace('`', 'ʻ') : ''}</div></div><div class="stamp ${seen ? 'on' : ''}" title="${seen ? 'Navštíveno' : 'Ještě nenavštíveno'}">${seen ? '✓' : '?'}</div></div>
      <p class="kid">${kid}</p><table>${rows.map(r => `<tr><th>${r[0]}</th><td>${r[1]}</td></tr>`).join('')}</table>${b.adult ? `<p class="adult">${b.adult}</p>` : ''}
      ${sunBox}<p class="src">${b.mk === 'foto' ? '📷 Povrch: skutečné snímky ze sond.' : i === SUN ? '' : '🎨 Povrch: ilustrace – zblízka ho zatím nikdo nevyfotil celý.'}${b.src === 'pamet' ? ' Dráha jen přibližná.' : ''}<br>${A.note(i)}</p>
      <div class="row">${S.focus === i ? `<button data-a="close" class="pri">Přiblížit</button><button data-a="far">Oddálit</button>` : `<button data-a="go" class="pri">Leť tam ⏎</button>`}${p > 0 ? `<button data-a="parent">↑ ${B[p].cs}</button>` : ''}</div>`;
    drawSub();
  }
  $('#card').addEventListener('click', (e) => { const a = e.target.dataset.a, i = S.sel; if (a === 'sunf') return act.sunf(); if (a === 'go') S.flyTo(i); if (a === 'close') S.flyTo(i, { alt: shape[i].rmax * 0.6 }); if (a === 'far') S.flyTo(i, { alt: Math.max(shape[i].rmax * 60, semi[[...kids[i]].sort((x, y) => semi[y] - semi[x])[0]] * 2.2 || 0) }); if (a === 'parent') S.flyTo(par[i]); });
  S.on.select = (i) => { drawCard(i); document.querySelectorAll('.it.sel').forEach(e => e.classList.remove('sel')); document.querySelectorAll(`.it[data-i="${i}"]`).forEach(e => e.classList.add('sel')); };
  S.on.focus = (i) => { drawCard(S.sel); drawSub(); };
  S.on.arrive = (i) => { drawCard(S.sel); A.play('arrive_' + B[i].type); };
  S.on.fly = (j) => { A.play(j === S.focus ? 'closeup' : 'launch'); };
  S.on.flare = () => A.play('flare', 1, 0.7);

  // ---------- lišta ikon ----------
  const dockIds = [SUN, ...planets, idx.get('moon'), idx.get('pluto'), idx.get('ceres'), idx.get('halley')];
  const icon = (i, small) => `<button class="it ${small ? 'sm' : ''}" data-i="${i}" title="${B[i].cs}"><b>${ico(i, small ? 34 : 46)}</b><span>${(B[i].id === 'halley' ? 'Halley' : B[i].cs.replace(/^Kometa /, ''))}</span></button>`;
  $('#dock').innerHTML = dockIds.map((i) => icon(i)).join('') + `<button class="it all" data-a="list" title="Všech 200 těles (B)"><b><i class="menu">☰</i></b><span>Všechna</span></button>`;
  function drawSub() { const r = root[S.focus], ks = r === SUN ? [] : [r, ...[...kids[r]].sort((a, b) => semi[a] - semi[b])]; const e = $('#sub'); if (ks.length < 2) { e.style.display = 'none'; return; } e.style.display = ''; e.innerHTML = ks.map((i) => icon(i, true)).join(''); e.querySelectorAll(`.it[data-i="${S.sel}"]`).forEach(x => x.classList.add('sel')); markSeen(); }
  function markSeen() { document.querySelectorAll('.it[data-i]').forEach(e => e.classList.toggle('seen', !!G.seen[B[+e.dataset.i].id])); }
  const goBtn = (e) => { const t = e.target.closest('.it'); if (!t) return; if (t.dataset.a === 'list') return act.list(); S.flyTo(+t.dataset.i); };
  $('#dock').addEventListener('click', goBtn); $('#sub').addEventListener('click', goBtn);

  // ---------- seznam všech těles ----------
  function drawList(f = '') { f = f.trim().toLowerCase(); let h = '';
    for (const [t, name] of GROUPS) { const xs = order.filter(i => B[i].type === t && (!f || B[i].cs.toLowerCase().includes(f) || B[i].name.toLowerCase().includes(f))); if (!xs.length) continue;
      h += `<h4>${name} <small>${xs.length}</small></h4>` + xs.map(i => `<button class="it li ${G.seen[B[i].id] ? 'seen' : ''}" data-i="${i}"><b>${ico(i, 28)}</b><span>${B[i].cs}${B[i].type === 'moon' ? ` <small>${B[par[i]].cs}</small>` : ''}</span></button>`).join(''); }
    $('#items').innerHTML = h || '<p>Nic nenalezeno.</p>'; }
  $('#items').addEventListener('click', goBtn); $('#search').addEventListener('input', (e) => drawList(e.target.value));

  // ---------- čas ----------
  const MES = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
  function fmtDate(jd) { const ms = (jd - 2440587.5) * 86400000; if (Math.abs(ms) > 8e15) return 'rok ' + nf(Math.round(2000 + (jd - 2451545) / 365.25)); const d = new Date(ms), y = d.getFullYear(); return `${d.getDate()}. ${MES[d.getMonth()]} ${y < 0 ? -y + ' př. n. l.' : y} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
  function drawTime() { $('#date').textContent = fmtDate(S.jd); const a = Math.abs(S.rateIdx); $('#rate').textContent = S.paused ? 'čas stojí' : (S.rateIdx < 0 ? '◀ zpět: ' : '') + RATE_LABEL[a - 1]; $('#b-play').textContent = S.paused ? '▶' : '⏸'; }
  const faster = (d) => { let r = S.rateIdx + d; if (r === 0) r += d; const was = S.rateIdx; S.rateIdx = Math.max(-10, Math.min(10, r)); S.paused = false; drawTime(); S.wake(); A.play(S.rateIdx < 0 && was > 0 ? 'reverse' : 'rate' + Math.abs(S.rateIdx)); };
  const timeAct = (a) => { if (a === 'slow') faster(-1); if (a === 'fast') faster(1); if (a === 'play') { S.paused = !S.paused; drawTime(); S.wake(); A.play(S.paused ? 'pause' : 'play'); } if (a === 'now') { S.jd = Date.now() / 86400000 + 2440587.5; S.rateIdx = 1; S.paused = false; drawTime(); S.wake(); A.play('now'); } };
  $('#time').addEventListener('click', (e) => timeAct(e.target.dataset.a));

  // ---------- HUD ----------
  S.on.hud = () => { drawTime(); const inf = S.info(S.focus), b = B[S.focus];
    $('#alt').innerHTML = `<b>${b.cs}</b><br><span>${K() ? 'jsi ' : 'výška '}${fmtDist(inf.alt).replace(/ \(.*/, '')}${K() ? ' nad povrchem' : ''}</span>`;
    let km = inf.kmPerPx * 120, p = Math.pow(10, Math.floor(Math.log10(km))), n = km / p >= 5 ? 5 : km / p >= 2 ? 2 : 1; const w = n * p / inf.kmPerPx; $('#scale i').style.width = w + 'px'; $('#scale span').textContent = fmtDist(n * p).replace(/ \(.*/, '') + (n * p > 0.05 * AU ? ` = ${sig(n * p / AU)} AU` : '');
    const s = S.info(S.sel), q = (id, t) => { const e = document.getElementById(id); if (e) e.textContent = t; }; q('c-sun', fmtDist(s.sun)); q('c-earth', fmtDist(s.earth)); q('c-light', fmtLight(s.earth)); };

  // ---------- přepínače ----------
  const toggle = (sel, on) => { const e = $(sel); const was = e.classList.contains('on'), v = on === undefined ? !was : on; if (v !== was) A.play(v ? 'panel_open' : 'panel_close'); e.classList.toggle('on', v); if (sel === '#list' && v) { drawList($('#search').value); } if (sel === '#gamebox' && v) drawGame(); return v; };
  const setBtn = () => { $('#b-orb').dataset.m = S.orbMode; $('#b-lab').dataset.m = S.labMode; $('#b-lock').dataset.m = S.lock ? 1 : 0; $('#b-con').dataset.m = S.conMode; $('#b-star').dataset.m = S.starNames ? 2 : 0; $('#b-snd').dataset.m = A.on ? 1 : 0; $('#b-snd').firstChild.textContent = A.on ? '🔊' : '🔇'; $('#b-mode').innerHTML = K() ? '🎓 <span>Dospělé</span>' : '🧒 <span>Dětské</span>'; $('#gam').value = S.gamma; $('#b-orb').title = 'Dráhy: ' + ['vypnuté', 'hlavní', 'všechny'][S.orbMode] + ' (O)'; $('#b-lab').title = 'Popisky: ' + ['vypnuté', 'hlavní', 'všechny'][S.labMode] + ' (L)'; };
  const act = { orb() { S.orbMode = (S.orbMode + 1) % 3; A.play(['orbit_off', 'orbit_on', 'orbit_all'][S.orbMode]); toast('Dráhy: ' + ['vypnuté', 'planety a blízké měsíce', 'všech 200 těles'][S.orbMode]); }, lab() { S.labMode = (S.labMode + 1) % 3; A.play(S.labMode ? 'labels_on' : 'labels_off'); toast('Popisky: ' + ['vypnuté', 'hlavní', 'všechny'][S.labMode]); }, lock() { S.lock = !S.lock; A.play(S.lock ? 'lock_on' : 'lock_off'); toast(S.lock ? 'Kamera se otáčí s tělesem (stojíš nad jedním místem).' : 'Kamera stojí vůči hvězdám.'); },
    gam() { const g = S.gamma < 0.2 ? 0.45 : S.gamma < 0.7 ? 1 : 0; S.setGamma(g); A.play(g ? 'gamma_up' : 'gamma_down'); toast(['Přisvětlení vypnuto – skutečný kontrast.', 'Přisvětlení: noční strany jsou trochu vidět.', 'Přisvětlení naplno: vidíš i neosvětlené strany.'][g === 0 ? 0 : g < 0.7 ? 1 : 2]); },
    help() { toggle('#help'); }, game() { toggle('#gamebox'); }, list() { toggle('#list'); }, home() { S.home(); A.play('home'); },
    con() { S.conMode = (S.conMode + 1) % 3; A.play(S.conMode ? 'const_on' : 'const_off'); toast('Souhvězdí: ' + ['vypnutá', 'čáry', 'čáry a jména'][S.conMode]); },
    stars() { S.starNames = !S.starNames; A.play(S.starNames ? 'stars_on' : 'stars_off'); toast(S.starNames ? 'Jména nejjasnějších hvězd zapnuta.' : 'Jména hvězd vypnuta.'); },
    snd() { A.unlock(); A.setOn(!A.on); if (A.on) A.play('sound_on'); toast(A.on ? `Zvuk zapnut (${A.count} zvuků).` : 'Zvuk vypnut.'); },
    mode() { setMode(!G.kid); }, tut() { toggle('#help', false); tut.start(); },
    sunf() { S.setSunMode((S.sunMode + 1) % 3); A.play(['sun_white', 'sun_halpha', 'sun_euv'][S.sunMode]); if (S.sel === SUN) drawCard(SUN); if (S.focus !== SUN) toast('Filtr Slunce: ' + ['bílé světlo', 'H-alfa', 'EUV 171 Å'][S.sunMode]); }, full() { A.play('full'); try { (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => toast('Celou obrazovku tady prohlížeč nepovolil.')); } catch (e) { toast('Celou obrazovku tady prohlížeč nepovolil.'); } } };
  $('#tools').addEventListener('click', (e) => { const t = e.target.closest('button'); if (!t) return; A.unlock(); if (act[t.dataset.a]) { if (['help', 'game', 'list', 'home', 'full', 'orb', 'lab', 'lock', 'con', 'stars', 'snd', 'mode'].indexOf(t.dataset.a) < 0) A.play('click'); act[t.dataset.a](); } setBtn(); S.wake(); });
  $('#gam').addEventListener('input', (e) => { S.setGamma(+e.target.value); });
  $('#vol').addEventListener('input', (e) => { A.unlock(); A.setVol(+e.target.value); });
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => { toggle(b.dataset.close, false); if (b.dataset.close === '#help') { G.help = true; save(); } }));

  function setMode(k) { G.kid = k; save(); document.body.classList.toggle('kid', k); $('#top h1').innerHTML = k ? '🚀 Vesmírná výprava <small>200</small>' : 'Sluneční soustava <small>200</small>'; A.play(k ? 'mode_kid' : 'mode_adult'); refresh(); toast(k ? '🧒 Dětské rozhraní. Ahoj, kapitáne!' : '🎓 Rozhraní pro dospělé.'); }
  function refresh() { setBtn(); drawTime(); drawCard(S.sel); drawMission(); drawGame(); markSeen(); }
  // zvuky rozhraní: klik na tlačítko bez vlastního zvuku, přejetí přes ikonu
  document.addEventListener('click', (e) => { A.unlock(); const b = e.target.closest('button'); if (b && !b.closest('#tools') && !b.closest('#time') && !b.dataset.q) A.play(b.classList.contains('it') ? 'click2' : 'click'); }, true);
  let hov = null; document.addEventListener('pointerover', (e) => { const t = e.target.closest('.it'); if (t && t !== hov) A.play('hover'); hov = t; });
  // ---------- myš, dotyk ----------
  const cv = $('#gl'), ptr = new Map(); let moved = 0, pinch = 0, lastTap = 0, lastTapI = -2;
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  cv.addEventListener('pointerdown', (e) => { A.unlock(); if (tut.running() && e.isTrusted) tut.stop(); cv.setPointerCapture(e.pointerId); ptr.set(e.pointerId, { x: e.clientX, y: e.clientY, b: e.button }); moved = 0; if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); } S.wake(); });
  cv.addEventListener('pointermove', (e) => {
    const p = ptr.get(e.pointerId);
    if (!p) { const h = S.pick(e.clientX, e.clientY); if (h !== S.hover) { S.hover = h; cv.style.cursor = h >= 0 ? 'pointer' : 'grab'; S.wake(); } return; }
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
    if (ptr.size === 2) { const [a, b] = [...ptr.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch > 0) S.zoom(pinch / d); pinch = d; return; }
    if (moved < 4) return; cv.style.cursor = 'grabbing';
    if (p.b === 2 || e.shiftKey) S.look(dx, -dy); else if (p.b === 1) S.zoom(Math.exp(dy * 0.01)); else S.rotate(dx, dy);
  });
  const upH = (e) => { const p = ptr.get(e.pointerId); ptr.delete(e.pointerId); pinch = 0; cv.style.cursor = 'grab'; if (!p || moved >= 5 || p.b !== 0) return;
    const i = S.pick(e.clientX, e.clientY), now = performance.now();
    if (now - lastTap < 380 && i === lastTapI) { if (i >= 0) { if (i === S.focus) S.flyTo(i, { alt: shape[i].rmax * 0.6 }); else S.flyTo(i); } lastTap = 0; return; }
    lastTap = now; lastTapI = i; if (i >= 0) { S.select(i); A.play('select'); } };
  cv.addEventListener('pointerup', upH); cv.addEventListener('pointercancel', upH);
  let zt = 0; cv.addEventListener('wheel', (e) => { e.preventDefault(); const k = e.deltaMode === 1 ? 33 : 1; if (performance.now() - zt > 90) { zt = performance.now(); A.play(e.deltaY < 0 ? 'zoom_in' : 'zoom_out'); } S.zoom(Math.exp(Math.max(-240, Math.min(240, e.deltaY * k)) * 0.0022)); }, { passive: false });

  // ---------- klávesnice ----------
  const keys = new Set();
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' && e.target.type !== 'range') { if (e.key === 'Escape') { e.target.blur(); toggle('#list', false); } if (e.key === 'Enter') { const f = $('#items .it'); if (f) { S.flyTo(+f.dataset.i); e.target.blur(); toggle('#list', false); } } return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return; const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; S.wake(); A.unlock();
    if (tut.running()) { if (k === 'Escape' || e.isTrusted) { e.preventDefault(); tut.stop(); } return; }
    if ($('#splash').classList.contains('on')) { if (k === 'Enter' || k === ' ') { e.preventDefault(); $('#sp-tut').click(); } else if (k === 'Escape') $('#sp-go').click(); return; }
    if (k === 'Tab') { e.preventDefault(); A.play(e.shiftKey ? 'tab_prev' : 'tab_next'); const at = order.indexOf(cur()); S.flyTo(order[(at + (e.shiftKey ? -1 : 1) + order.length) % order.length]); return; }
    if (k >= '0' && k <= '9') { A.play('key'); const base = numKey[+k], c = cur(); if (root[c] === base && base !== SUN && kids[base].length) { const ring = [base, ...[...kids[base]].sort((a, b) => semi[a] - semi[b])]; S.flyTo(ring[(ring.indexOf(c) + 1) % ring.length]); } else S.flyTo(base); return; }
    if (k === ' ') { e.preventDefault(); timeAct('play'); return; }
    if (k === 'Enter') { A.play('enter'); const i = S.sel; if (i !== S.focus) S.flyTo(i); else S.flyTo(i, { alt: S.cam.altT > shape[i].rmax * 1.5 ? shape[i].rmax * 0.5 : shape[i].rmax * 3.4 }); return; }
    if (k === 'Escape') { ['#help', '#gamebox', '#list'].forEach(s => toggle(s, false)); return; }
    if (k === 'Backspace' || k === 'p') { const p = par[cur()]; A.play(p >= 0 ? 'back' : 'error'); if (p >= 0) S.flyTo(p); return; }
    const map = { o: 'orb', l: 'lab', r: 'lock', g: 'gam', h: 'help', '?': 'help', j: 'game', b: 'list', f: 'full', Home: 'home', m: 'home', u: 'con', n: 'stars', k: 'mode', v: 'sunf', x: 'snd' };
    if (map[k]) { e.preventDefault(); act[map[k]](); setBtn(); if (k === 'b' && $('#list').classList.contains('on')) setTimeout(() => $('#search').focus(), 30); return; }
    if (k === '.' || k === '>') return faster(1); if (k === ',' || k === '<') return faster(-1);
    if (k === 't') { timeAct('now'); return; }
    if (k === 'c') { S.resetLook(); return; }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'a', 'd', 'w', 's', 'q', 'e', '+', '-', '='].includes(k)) { e.preventDefault(); keys.add(k); }
  });
  window.addEventListener('keyup', (e) => { keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key); });
  window.addEventListener('blur', () => keys.clear());
  const cur = () => (S.cam.fly && S.cam.fly.to !== undefined ? S.cam.fly.to : S.focus);
  let kt = performance.now();
  (function kloop(now) { requestAnimationFrame(kloop); const dt = Math.min(0.05, (now - kt) / 1000); kt = now; if (!keys.size) return; const v = 520 * dt, has = (...a) => a.some(x => keys.has(x));
    let dx = 0, dy = 0; if (has('ArrowLeft', 'a')) dx += v; if (has('ArrowRight', 'd')) dx -= v; if (has('ArrowUp', 'w')) dy += v; if (has('ArrowDown', 's')) dy -= v; if (dx || dy) S.rotate(dx, dy);
    if (has('q', '+', '=', 'PageUp')) S.zoom(Math.exp(-dt * 1.6)); if (has('e', '-', 'PageDown')) S.zoom(Math.exp(dt * 1.6)); })(kt);

  // ---------- start ----------
  const api = { toast, G: () => G, order, kid: K, setMode, act: (n) => { act[n](); setBtn(); S.wake(); }, time: timeAct, refresh };
  const tut = createTutorial(S, A, api); api.tut = tut;
  document.body.classList.toggle('kid', G.kid); if (G.kid) $('#top h1').innerHTML = '🚀 Vesmírná výprava <small>200</small>';
  drawGame(); setBtn(); drawTime(); if (!G.cur) nextMission(); else drawMission(); markSeen(); $('#vol').value = A.vol; $('#sndn').textContent = A.count;
  const sp = $('#splash'), spMode = () => { $('#sp-adult').classList.toggle('sel', !G.kid); $('#sp-kid').classList.toggle('sel', G.kid); }; spMode();
  $('#sp-adult').onclick = () => { A.unlock(); setMode(false); spMode(); }; $('#sp-kid').onclick = () => { A.unlock(); setMode(true); spMode(); };
  $('#sp-tut').onclick = () => { A.unlock(); sp.classList.remove('on'); tut.start(); }; $('#sp-go').onclick = () => { A.unlock(); sp.classList.remove('on'); A.play('sound_on'); };
  $('#help [data-a="tut"]').onclick = () => act.tut();
  return api;
}
