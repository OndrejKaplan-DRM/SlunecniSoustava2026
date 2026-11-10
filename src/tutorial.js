// Soustava 200 – minutová ukázka ovládání. Pokaždé jiný scénář: náhodné cíle a náhodný výběr kapitol. Ukazatel „kliká“ na skutečná
// tlačítka (bliknou), dole běží konzole s popisem. Mluví hlasem právě zapnutého rozhraní (dospělé / dětské) a obě ukáže.
import { B, idx, kids, semi, AU, shape } from './sim.js';

export function createTutorial(S, A, ui) {
  const $ = (s) => document.querySelector(s), box = $('#tut'), txt = $('#tut-txt'), bar = $('#tut-bar i'), num = $('#tut-n'), cur = $('#cur'), kc = $('#tut-key');
  let run = null; const T = { running: () => !!run };
  const sleep = (ms) => new Promise((res, rej) => { const me = run, t0 = performance.now(); (function w() { if (!me || me.stop) return rej(new Error('stop')); if (performance.now() - t0 >= ms) return res(); setTimeout(w, 40); })(); });
  const pick = (a) => a[Math.floor(Math.random() * a.length)], shuffle = (a) => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(x => x[1]);
  const id = (s) => idx.get(s), name = (i) => B[i].cs;
  async function say(adult, kid) { const t = ui.kid() ? kid : adult; txt.textContent = ''; kc.style.display = 'none'; const step = Math.max(1, Math.ceil(t.length / 45)); for (let k = 0; k <= t.length; k += step) { txt.textContent = t.slice(0, k + step); if (k % (step * 3) === 0) A.play('tut_type'); await sleep(22); } txt.textContent = t; }
  async function point(sel, hold = 300) { const e = typeof sel === 'string' ? $(sel) : sel; if (!e) return; const r = e.getBoundingClientRect(); if (!r.width) return; cur.style.opacity = 1; cur.style.transform = `translate(${r.left + r.width / 2}px, ${r.top + r.height / 2}px)`; A.play('tut_cursor'); await sleep(620);
    e.classList.add('blink'); cur.classList.add('tap'); A.play('tut_ping'); setTimeout(() => { e.classList.remove('blink'); cur.classList.remove('tap'); }, 1000); await sleep(hold); }
  async function key(label) { kc.textContent = label; kc.style.display = ''; kc.classList.remove('pop'); void kc.offsetWidth; kc.classList.add('pop'); A.play('key'); await sleep(500); }
  async function fly(i, opts) { S.flyTo(i, opts); await sleep(700); for (let k = 0; k < 90 && S.cam.fly; k++) await sleep(100); await sleep(500); }
  async function anim(ms, fn) { const t0 = performance.now(); let last = t0; for (;;) { const now = performance.now(), u = Math.min(1, (now - t0) / ms); fn(u, (now - last) / 1000); last = now; if (u >= 1) break; await sleep(16); } }
  const CH = {
    async planet() { const i = id(pick(['mars', 'jupiter', 'saturn', 'venus', 'neptune', 'mercury', 'uranus']));
      await say(`Ikony dole jsou zmenšené podobizny těles. Klik na ikonu = přelet. Cíl: ${name(i)}.`, `Dole máš obrázky planet. Ťukni na jeden a letíme! Cíl: ${name(i)} 🚀`); await point(`#dock .it[data-i="${i}"]`); await fly(i); },
    async mouse() { await say('Levé tlačítko myši otáčí pohled, kolečko přibližuje a oddaluje. Totéž umí šipky, WASD a klávesy Q / E.', 'Tahej myší a těleso se otáčí. Kolečkem přiletíš blíž nebo dál. Jde to i šipkami!');
      await anim(1800, (u, dt) => S.rotate(-260 * dt, 60 * dt * Math.cos(u * 6))); S.zoom(0.35); await sleep(1300); S.zoom(2.6); await sleep(900); },
    async orbits() { await say('Tlačítko Dráhy (klávesa O): vypnuté → hlavní → dráhy všech 200 těles.', 'Čáry ukazují, kudy tělesa létají. Tlačítkem Dráhy je schováš, nebo ukážeš úplně všechny!');
      S.zoom(pick([40, 400, 3000])); await sleep(900); for (let k = 0; k < 3; k++) { await point('#b-orb', 150); ui.act('orb'); await sleep(950); } },
    async sky() { await say('Souhvězdí (U) a jména nejjasnějších hvězd (N). Pravým tlačítkem myši se rozhlédneš po obloze.', 'Zapneme souhvězdí a jména hvězd. Poznáš Orion nebo Velký vůz? Pravým tlačítkem se rozhlédni!');
      await point('#b-con', 150); ui.act('con'); await sleep(500); await point('#b-con', 150); ui.act('con'); await point('#b-star', 150); ui.act('stars');
      const dir = pick([-1, 1]); await anim(2600, (u, dt) => S.look(dir * 330 * dt, 70 * dt)); await sleep(700); S.resetLook(); await sleep(500); ui.act('con'); ui.act('stars'); },
    async time() { await say('Čas: ⏩ zrychlí (klávesa .), ⏪ zpomalí nebo couvá (,), mezerník zastaví, T vrátí dnešek.', 'Umíme zrychlit čas! ⏩ a planety se roztočí. Mezerník čas zastaví, T tě vrátí do dneška.');
      for (let k = 0; k < pick([4, 5, 6]); k++) { await point('#time [data-a="fast"]', 60); ui.time('fast'); } await sleep(2600); await point('#b-play', 200); ui.time('play'); await sleep(700); await point('#time [data-a="now"]', 200); ui.time('now'); },
    async moons() { const p = id(pick(['jupiter', 'saturn', 'earth', 'mars', 'neptune', 'pluto'])), ks = [...kids[p]].sort((a, b) => B[b].R - B[a].R).slice(0, 4), m = pick(ks), n = ['', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].indexOf(B[p].id);
      await say(`Čísla 0–9 skáčou na Slunce, planety a Pluto. Stejné číslo podruhé = měsíce. Tab = další těleso. Teď: ${name(m)}.`, `Klávesa ${n} tě hodí k planetě ${name(p)}. Tab přeskakuje na další tělesa. Letíme na měsíc ${name(m)}!`);
      await key(String(n)); if (S.focus !== p) await fly(p); await key('Tab'); await fly(m); },
    async sun() { await say('Slunce má tři filtry (klávesa V): bílé světlo se skvrnami, H-alfa s protuberancemi a EUV s magnetickými smyčkami.', 'Na Slunce se díváme přes kouzelné filtry: uvidíš skvrny, ohnivé oblouky i smyčky magnetů. Klávesa V!');
      await key('0'); await fly(0, { alt: shape[0].rmax * 2.2 }); for (let k = 0; k < 3; k++) { await point('#card [data-a="sunf"]', 150); ui.act('sunf'); await sleep(1500); } },
    async gamma() { await say('Posuvník ☀ (klávesa G) přisvětlí noční strany těles a zesílí Mléčnou dráhu.', 'Tma? Posuvníkem ☀ rozsvítíš noční stranu, ať vidíš i tam, kam Slunce nesvítí.');
      await point('#gam'); await anim(1500, (u) => { S.setGamma(u); $('#gam').value = u; }); await anim(1300, (u, dt) => S.rotate(300 * dt, 0)); await anim(900, (u) => { S.setGamma(1 - u); $('#gam').value = 1 - u; }); },
    async game() { await say('Deník (J): razítka za navštívená tělesa, hodnosti, kvíz. Nahoře čeká hádanka – cíl najdeš sám.', 'Tohle je tvůj Deník! Sbíráš razítka, body a hodnosti. A nahoře je hádanka – uhodneš, kam letět?');
      await point('#tools [data-a="game"]'); ui.act('game'); await sleep(2600); await point('#mission'); ui.act('game'); },
    async search() { const t = pick([['tit', 'titan'], ['hal', 'halley'], ['eur', 'europa'], ['cer', 'ceres'], ['enc', 'enceladus']]);
      await say(`Všech 200 těles je v seznamu (B). Stačí psát: „${t[0]}“ a Enter.`, `Hledáš něco? Otevři seznam a napiš začátek jména: „${t[0]}“…`);
      await point('#dock .all'); ui.act('list'); await sleep(400); const s = $('#search'); for (const ch of t[0]) { s.value += ch; s.dispatchEvent(new Event('input')); A.play('search'); await sleep(260); } await key('Enter'); s.value = ''; ui.act('list'); await fly(id(t[1])); },
    async small() { const i = id(pick(['eros', '67p', 'bennu', 'oumuamua', 'phobos', 'itokawa', 'arrokoth'])), D = B[i].R * 2;
      await say(`Skutečné měřítko: ${name(i)} měří ${D < 1 ? Math.round(D * 1000) + ' m' : D.toFixed(0) + ' km'}. Z dálky je to tečka – dvojklik na ni tě tam donese.`, `${name(i)} je mrňous: jen ${D < 1 ? Math.round(D * 1000) + ' metrů' : D.toFixed(0) + ' km'}! Z dálky tečka. Dvakrát na ni ťukni a uvidíš ji zblízka.`); await fly(i); await anim(1500, (u, dt) => S.rotate(-220 * dt, 0)); },
  };
  T.start = async () => {
    if (run) return; const me = run = { stop: false }, keep = { kid: ui.kid(), gamma: S.gamma, sun: S.sunMode };
    document.body.classList.add('tutoring'); box.classList.add('on'); A.play('tut_start');
    const mid = shuffle(['time', 'moons', 'sun', 'gamma', 'game', 'search', 'small']).slice(0, 2), plan = ['planet', 'mouse', ...shuffle(['orbits', 'sky']), 'MODE', mid[0], mid[1], 'BACK'], N = plan.length + 2; let n = 0;
    const head = () => { n++; num.textContent = `${n}/${N}`; bar.style.width = (n / N * 100) + '%'; A.play('tut_step'); };
    try {
      head(); await say('Ukázka ovládání, asi minuta. Pokaždé je trochu jiná. Esc nebo klik do vesmíru ji ukončí.', 'Ahoj! Ukážu ti, jak se tu létá. Trvá to minutku. Kdykoli ťukni do vesmíru a hraješ sám.'); await sleep(1100);
      for (const c of plan) { head();
        if (c === 'MODE' || c === 'BACK') { const toKid = !ui.kid(); await point('#b-mode'); ui.setMode(toKid);
          await say('Zpět v rozhraní pro dospělé: věcné údaje, jednotky, zdroje.', toKid ? 'A tohle je dětské rozhraní! Větší tlačítka, tykání a karty plné zajímavostí: kolik bys tu vážil a jak vysoko doskočíš.' : 'Jsme zpátky u tebe!'); await sleep(c === 'MODE' ? 2600 : 1200); }
        else await CH[c](); await sleep(350); }
      head(); await say('Hotovo. Klávesa H ukáže nápovědu a ukázku pustí znovu. Hodně objevů!', 'A teď ty, kapitáne! Nahoře čeká hádanka. Kdybys nevěděl, zmáčkni H. 🚀'); A.play('tut_end'); await point('#tools [data-a="home"]'); S.home(); await sleep(2200);
    } catch (e) { if (e.message !== 'stop') console.error(e); }
    // úklid
    if (run === me) run = null; S.conMode = 0; S.starNames = false; S.orbMode = 1; S.labMode = 1; S.rateIdx = 1; S.paused = false; S.setGamma(keep.gamma); $('#gam').value = keep.gamma; S.setSunMode(keep.sun); if (ui.kid() !== keep.kid) ui.setMode(keep.kid);
    ['#list', '#gamebox'].forEach(s => $(s).classList.remove('on')); cur.style.opacity = 0; box.classList.remove('on'); document.body.classList.remove('tutoring'); ui.refresh();
  };
  T.stop = () => { if (run) { run.stop = true; A.play('skip'); } };
  $('#tut-skip').addEventListener('click', T.stop);
  return T;
}
