// Soustava 200 – dvouminutová ukázka ovládání (verze 1.8a). Pokaždé trochu jiný scénář: náhodné cíle a náhodný výběr pokročilých
// kapitol (jedna v právě zapnutém rozhraní, jedna v tom druhém; při dalším spuštění přijdou na řadu jiné). Ukazatel „kliká“ na skutečná tlačítka (bliknou), dole běží konzole s popisem. Mluví hlasem právě zapnutého rozhraní
// (dospělé / dětské) a obě ukáže.
// Zásada 1.8a: KAŽDÁ KAPITOLA SI SAMA PŘIPRAVÍ POHLED, na kterém je její funkce vidět. Zrychlení času se dívá na planetu s měsíci,
// přisvětlení na noční stranu Měsíce nebo Merkuru, dráhy a pásy planetek na celou soustavu shora. Žádná kapitola nespoléhá na to,
// kde skončila ta předchozí, a každá po sobě uklidí (filtr Slunce, čas, okna).
import { B, P, idx, kids, AU, shape, SUN } from '../core/sim.js';

export function createTutorial(S, A, ui) {
  const $ = (s) => document.querySelector(s),
    box = $('#tut'),
    txt = $('#tut-txt'),
    bar = $('#tut-bar i'),
    num = $('#tut-n'),
    cur = $('#cur'),
    kc = $('#tut-key');
  let run = null,
    readT = 0; /* čas, do kdy má čtenář stihnout přečíst právě napsaný text */
  const T = { running: () => !!run, log: [] };
  const sleep = (ms) =>
    new Promise((res, rej) => {
      const me = run,
        t0 = performance.now();
      (function w() {
        if (!me || me.stop) return rej(new Error('stop'));
        if (performance.now() - t0 >= ms) return res();
        setTimeout(w, 40);
      })();
    });
  const pick = (a) => a[Math.floor(Math.random() * a.length)],
    shuffle = (a) =>
      a
        .map((x) => [Math.random(), x])
        .sort((p, q) => p[0] - q[0])
        .map((x) => x[1]);
  const id = (s) => idx.get(s),
    name = (i) => B[i].cs;
  const touch = () => document.body.classList.contains('touch') || document.body.classList.contains('mob');
  // say(dospělé, dětské, dotyk dospělé, dotyk dětské): na telefonu a tabletu se mluví o prstech a nabídce ☰ místo myši a kláves
  async function say(adult, kid, tAdult, tKid) {
    const t = touch() ? (ui.kid() ? tKid || kid : tAdult || adult) : ui.kid() ? kid : adult;
    txt.textContent = '';
    kc.style.display = 'none';
    const step = Math.max(1, Math.ceil(t.length / 45));
    for (let k = 0; k <= t.length; k += step) {
      txt.textContent = t.slice(0, k + step);
      if (k % (step * 3) === 0) A.play('tut_type');
      await sleep(22);
    }
    txt.textContent = t;
    readT =
      performance.now() +
      Math.min(5600, 700 + t.length * 36); /* asi 28 znaků za sekundu; akce kapitoly běží souběžně */
  }
  /* počká, až uplyne čas na přečtení posledního textu (akce kapitoly běží mezitím, takže většinou nečeká vůbec) */
  const read = async () => {
    const w = readT - performance.now();
    if (w > 0) await sleep(w);
  };
  async function point(sel, hold = 300) {
    let e = typeof sel === 'string' ? $(sel) : sel;
    if (!e) return;
    let r = e.getBoundingClientRect();
    if (!r.width && typeof sel === 'string' && !/^#card|^#sub|^#dock/.test(sel)) {
      /* tlačítko není vidět (telefon, úzké okno, dětské rozhraní bez odborných nástrojů): funkce je v nabídce ☰ */
      e = $('#tools [data-a="more"]');
      r = e.getBoundingClientRect();
    }
    if (!r.width) return;
    cur.style.opacity = 1;
    cur.style.transform = `translate(${r.left + r.width / 2}px, ${r.top + r.height / 2}px)`;
    A.play('tut_cursor');
    await sleep(620);
    e.classList.add('blink');
    cur.classList.add('tap');
    A.play('tut_ping');
    setTimeout(() => {
      e.classList.remove('blink');
      cur.classList.remove('tap');
    }, 1000);
    await sleep(hold);
  }
  async function key(label) {
    if (touch()) return;
    kc.textContent = label;
    kc.style.display = '';
    kc.classList.remove('pop');
    void kc.offsetWidth;
    kc.classList.add('pop');
    A.play('key');
    await sleep(500);
  }
  async function fly(i, opts) {
    S.flyTo(i, opts);
    await sleep(700);
    for (let k = 0; k < 90 && S.cam.fly; k++) await sleep(100);
    await sleep(250);
  }
  async function anim(ms, fn) {
    const t0 = performance.now();
    let last = t0;
    for (;;) {
      const now = performance.now(),
        u = Math.min(1, (now - t0) / ms);
      fn(u, (now - last) / 1000);
      last = now;
      if (u >= 1) break;
      await sleep(16);
    }
  }
  /* směr od tělesa ke Slunci jako (yaw, pitch) kamery; kamera s tímto směrem stojí nad osvětlenou stranou */
  const sunYP = (i) => {
    const x = P[SUN * 3] - P[i * 3],
      y = P[SUN * 3 + 1] - P[i * 3 + 1],
      z = P[SUN * 3 + 2] - P[i * 3 + 2],
      l = Math.hypot(x, y, z) || 1;
    return [Math.atan2(z, x), Math.asin(y / l)];
  };
  /* plynulé natočení kamery kolem tělesa na daný směr */
  async function swing(yaw, pitch, ms = 1400) {
    const c = S.cam;
    if (Math.cos(c.pitch) < 0) {
      c.pitch = Math.sign(c.pitch) * (Math.PI - Math.abs(c.pitch));
      c.yaw += Math.PI;
    }
    const y0 = c.yaw,
      p0 = c.pitch,
      dy = ((((yaw - y0 + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
    await anim(ms, (u) => {
      const e = u * u * (3 - 2 * u);
      c.yaw = y0 + dy * e;
      c.pitch = p0 + (pitch - p0) * e;
      S.wake();
    });
  }
  /* doletí k tělesu do dané výšky (i když u něj už je) a nechá čas běžet normálně */
  async function goto(i, alt) {
    S.paused = false;
    await fly(i, alt ? { alt } : undefined);
  }
  const planets = ['mars', 'jupiter', 'saturn', 'venus', 'neptune', 'mercury', 'uranus'];
  const isPlanet = (i) => B[i].type === 'planet';
  const closePops = () => {
    for (const s of ['#list', '#gamebox', '#cmp', '#sk', '#uk', '#more', '#album', '#tm', '#help'])
      if ($(s).classList.contains('on')) ui.toggle(s, false);
    const x = $('#ukc.on [data-u="close"]');
    if (x) x.click();
    if (document.body.classList.contains('cine')) ui.act('cine');
  };
  const CH = {
    // ---------- základy ----------
    async planet() {
      const i = id(pick(planets));
      await say(
        `Ikony dole jsou zmenšené podobizny těles. Klik na ikonu = přelet. Cíl: ${name(i)}.`,
        `Dole máš obrázky planet. Ťukni na jeden a letíme! Cíl: ${name(i)} 🚀`,
        `Ikony dole jsou zmenšené podobizny těles. Ťuknutí na ikonu = přelet. Lištu jde posouvat prstem do stran. Cíl: ${name(i)}.`
      );
      await point(`#dock .it[data-i="${i}"]`);
      await fly(i);
    },
    async mouse() {
      if (!isPlanet(S.focus)) await goto(id(pick(planets)));
      await say(
        'Levé tlačítko myši otáčí pohled, kolečko přibližuje a oddaluje. Totéž umí šipky, WASD a klávesy Q / E.',
        'Tahej myší a těleso se otáčí. Kolečkem přiletíš blíž nebo dál. Jde to i šipkami!',
        'Jeden prst otáčí pohled. Dva prsty od sebe a k sobě přibližují a oddalují.',
        'Jedním prstem těleso otáčíš. Dvěma prsty ho přitáhneš blíž nebo odsuneš dál.'
      );
      await anim(1900, (u, dt) => S.rotate(-260 * dt, 60 * dt * Math.cos(u * 6)));
      S.zoom(0.35);
      await sleep(1400);
      S.zoom(2.9);
      await sleep(1100);
    },
    async moons() {
      const p = id(pick(['jupiter', 'saturn', 'earth', 'mars', 'neptune', 'pluto'])),
        ks = [...kids[p]].sort((a, b) => B[b].R - B[a].R).slice(0, 4),
        m = pick(ks),
        n = ['', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].indexOf(
          B[p].id
        );
      await say(
        `Čísla 0–9 skáčou na Slunce, planety a Pluto. Stejné číslo podruhé = měsíce. Tab = další těleso. Teď: ${name(m)}.`,
        `Klávesa ${n} tě hodí k planetě ${name(p)}. Tab přeskakuje na další tělesa. Letíme na měsíc ${name(m)}!`,
        `Když jsi u planety, objeví se nad lištou řada jejích měsíců. Ťuknutí na měsíc = přelet. Teď: ${name(p)} a pak ${name(m)}.`,
        `U planety se nad lištou objeví její měsíce. Ťukni na některý a letíš! Teď: ${name(m)}.`
      );
      await key(String(n));
      if (S.focus !== p) await fly(p);
      if (touch()) await point(`#sub .it[data-i="${m}"]`);
      else await key('Tab');
      await fly(m);
    },
    // ---------- čas: pohled na planetu s měsíci, aby bylo vidět, že se něco hýbe ----------
    async time() {
      const v = pick([
          {
            p: 'jupiter',
            alt: 2.7e6,
            r: 5,
            co: 'čtyři velké měsíce Jupitera',
            kd: 'měsíce kolem Jupitera',
            kolik: 'šest hodin za sekundu',
          },
          {
            p: 'earth',
            alt: 1.05e6,
            r: 6,
            co: 'Měsíc na cestě kolem Země',
            kd: 'Měsíc kolem Země',
            kolik: 'den za sekundu',
          },
          {
            p: 'saturn',
            alt: 1.75e6,
            r: 5,
            co: 'měsíce Saturnu od Mimase po Titan',
            kd: 'měsíce kolem Saturnu',
            kolik: 'šest hodin za sekundu',
          },
        ]),
        p = id(v.p);
      await say(
        `Čas: ⏩ zrychlí (klávesa .), ⏪ zpomalí nebo couvá (,), mezerník zastaví, T vrátí dnešek. Sleduj: ${v.co}.`,
        `Umíme zrychlit čas! Zmáčkneme ⏩ a uvidíš, jak běhají ${v.kd}. Mezerník čas zastaví, T tě vrátí do dneška.`,
        `Čas: ⏩ zrychlí, ⏪ zpomalí nebo couvá, ⏸ zastaví a „Teď“ vrátí dnešek. Sleduj: ${v.co}.`,
        `Umíme zrychlit čas! Ťukneme na ⏩ a uvidíš, jak běhají ${v.kd}. ⏸ čas zastaví, „Teď“ tě vrátí do dneška.`
      );
      S.rateIdx = 1;
      if (S.orbMode < 2) S.orbMode = 2;
      ui.refresh();
      await goto(p, v.alt);
      await swing(sunYP(p)[0] + 0.5, 0.62, 1200); /* šikmo shora: dráhy měsíců jsou vidět jako elipsy */
      for (let k = 1; k < v.r; k++) {
        await point('#time [data-a="fast"]', 60);
        ui.time('fast');
      }
      ui.toast(ui.kid() ? `Teď běží ${v.kolik}!` : `Rychlost: ${v.kolik}.`, 3200);
      await sleep(5000);
      await point('#b-play', 200);
      ui.time('play');
      await sleep(1100);
      await point('#time [data-a="now"]', 200);
      ui.time('now');
      await read();
    },
    // ---------- dráhy a pásy planetek: celá soustava shora ----------
    async orbits() {
      await say(
        'Tlačítko Dráhy (klávesa O): pět stupňů, od planet po dráhy všech těles.',
        'Čáry ukazují, kudy tělesa létají. Tlačítkem Dráhy je schováš, nebo ukážeš víc!',
        'Dráhy najdeš v nabídce ☰ vpravo nahoře: pět stupňů, od planet po dráhy všech těles.',
        'Čáry ukazují, kudy tělesa létají. V nabídce ☰ je schováš, nebo ukážeš víc!'
      );
      S.flyTo(SUN, { alt: 7.2 * AU });
      S.cam.homePitch = true; /* pohled šikmo shora na rovinu drah */
      await sleep(700);
      for (let k = 0; k < 90 && S.cam.fly; k++) await sleep(100);
      await sleep(600);
      for (let k = 0; k < 2; k++) {
        await point('#b-orb', 150);
        ui.act('orb');
        await sleep(1000);
      }
      S.orbMode = 2;
      ui.refresh();
      await say(
        'Drobné tečky mezi Marsem a Jupiterem jsou hlavní pás planetek. Za Neptunem leží Kuiperův pás, domov Pluta. Tečky jsou ilustrace: skutečných těles jsou miliony.',
        'Vidíš ty tečky mezi Marsem a Jupiterem? To je pás planetek – miliony kamenů! A úplně daleko je druhý pás, kde bydlí Pluto.'
      );
      await sleep(1800);
      S.zoom(12);
      await sleep(2600);
      await read();
    },
    async sky() {
      await say(
        'Souhvězdí (U) a jména nejjasnějších hvězd (N). Pravým tlačítkem myši se rozhlédneš po obloze.',
        'Zapneme souhvězdí a jména hvězd. Poznáš Orion nebo Velký vůz? Pravým tlačítkem se rozhlédni!',
        'Souhvězdí a jména nejjasnějších hvězd jsou také v nabídce ☰.',
        'Zapneme souhvězdí a jména hvězd – jsou v nabídce ☰. Poznáš Orion nebo Velký vůz?'
      );
      await point('#b-con', 150);
      ui.act('con');
      await sleep(700);
      ui.act('con');
      await sleep(700);
      await point('#b-con', 150);
      ui.act('con');
      await point('#b-star', 150);
      ui.act('stars');
      const dir = pick([-1, 1]);
      await anim(2400, (u, dt) => S.look(dir * 380 * dt, 80 * dt));
      await sleep(900);
      S.resetLook();
      await sleep(600);
      S.conMode = 0;
      S.starNames = false;
      ui.refresh();
    },
    // ---------- přisvětlení: noční strana Měsíce nebo Merkuru ----------
    async gamma() {
      const i = id(pick(['moon', 'mercury']));
      await say(
        `Posuvník ☀ (klávesa G) přisvětlí noční strany těles. Zkusíme to na noční straně: ${name(i)}.`,
        `Tma? Podíváme se na noční stranu, kam Slunce nesvítí: ${name(i)}. Posuvníkem ☀ ji rozsvítíme!`,
        `Přisvětlení (☰ → ☀ Přisvětlení) ukáže noční strany těles. Zkusíme to na noční straně: ${name(i)}.`,
        `Tma? Podíváme se na noční stranu, kam Slunce nesvítí: ${name(i)}. V nabídce ☰ ji rozsvítíme!`
      );
      S.setGamma(0);
      $('#gam').value = 0;
      await goto(i);
      const s = sunYP(i);
      await swing(
        s[0] + Math.PI - 0.62,
        -s[1] + 0.1,
        1700
      ); /* kamera za tělesem: úzký osvětlený srpek, zbytek ve tmě */
      await sleep(700);
      await point('#gam');
      await anim(1700, (u) => {
        S.setGamma(u);
        $('#gam').value = u;
      });
      await anim(1400, (u, dt) => S.rotate(-170 * dt, 0));
      await sleep(600);
      await anim(1000, (u) => {
        S.setGamma(1 - u);
        $('#gam').value = 1 - u;
      });
      await read();
    },
    // ---------- Slunce a jeho filtry; na konci zpět bílé světlo ----------
    async sun() {
      await say(
        'Slunce má čtyři pohledy (klávesa V): bílé světlo se skvrnami, H-alfa s protuberancemi, EUV s magnetickými smyčkami a koronograf s koronou.',
        'Na Slunce se díváme přes kouzelné filtry: uvidíš skvrny, ohnivé oblouky i smyčky magnetů. Klávesa V!',
        'Slunce má čtyři pohledy (tlačítko na jeho kartě nebo ☰ → Filtr Slunce): bílé světlo se skvrnami, H-alfa s protuberancemi, EUV s magnetickými smyčkami a koronograf s koronou.',
        'Na Slunce se díváme přes kouzelné filtry: uvidíš skvrny, ohnivé oblouky i smyčky magnetů. Přepneš je na kartě Slunce.'
      );
      S.setSunMode(0);
      await key('0');
      await goto(SUN, shape[SUN].rmax * 2.2);
      for (let k = 0; k < 4; k++) {
        if (!touch()) await point('#card [data-a="sunf"]', 150);
        ui.act('sunf');
        await sleep(k === 3 ? 600 : 1300);
      }
      S.setSunMode(0); /* další kapitoly se nesmí dívat přes koronograf */
      await read();
    },
    // ---------- hra ----------
    async game() {
      await say(
        'Deník (J): razítka za navštívená tělesa, hodnosti, kvíz. Nahoře čeká hádanka – cíl najdeš sám.',
        'Tohle je tvůj Deník! Sbíráš razítka, body a hodnosti. A nahoře je hádanka – uhodneš, kam letět?',
        'Deník je v nabídce ☰: razítka za navštívená tělesa, hodnosti, kvíz. Tlačítko 🎯 ukáže hádanku – cíl najdeš sám.',
        'Tohle je tvůj Deník, najdeš ho v nabídce ☰. Sbíráš razítka, body a hodnosti. A 🎯 ti ukáže hádanku!'
      );
      await point('#tools [data-a="game"]');
      ui.act('game');
      await sleep(3000);
      await point(touch() ? '#tools [data-m="mis"]' : '#mission');
      ui.toggle('#gamebox', false);
      await read();
    },
    async search() {
      const t = pick([
        ['tit', 'titan'],
        ['hal', 'halley'],
        ['eur', 'europa'],
        ['cer', 'ceres'],
        ['enc', 'enceladus'],
      ]);
      await say(
        `Všech ${B.length} těles je v seznamu (B). Stačí psát: „${t[0]}“ a Enter.`,
        `Hledáš něco? Otevři seznam a napiš začátek jména: „${t[0]}“…`
      );
      await point('#tools [data-a="list"]');
      ui.act('list');
      await sleep(500);
      const s = $('#search');
      s.value = '';
      for (const ch of t[0]) {
        s.value += ch;
        s.dispatchEvent(new Event('input'));
        A.play('search');
        await sleep(300);
      }
      await sleep(500);
      await key('Enter');
      s.value = '';
      ui.toggle('#list', false);
      await fly(id(t[1]));
    },
    async small() {
      const i = id(pick(['eros', '67p', 'bennu', 'oumuamua', 'phobos', 'itokawa', 'arrokoth'])),
        D = B[i].R * 2;
      await say(
        `Skutečné měřítko: ${name(i)} měří ${D < 1 ? Math.round(D * 1000) + ' m' : D.toFixed(0) + ' km'}. Z dálky je to tečka – dvojklik na ni tě tam donese.`,
        `${name(i)} je mrňous: jen ${D < 1 ? Math.round(D * 1000) + ' metrů' : D.toFixed(0) + ' km'}! Z dálky tečka. Dvakrát na ni ťukni a uvidíš ji zblízka.`,
        `Skutečné měřítko: ${name(i)} měří ${D < 1 ? Math.round(D * 1000) + ' m' : D.toFixed(0) + ' km'}. Z dálky je to tečka – dvojí ťuknutí na ni tě tam donese.`
      );
      await fly(i);
      await anim(1700, (u, dt) => S.rotate(-220 * dt, 0));
      await read();
    },
    // ---------- pokročilé ----------
    async cmp() {
      const i = isPlanet(S.focus) ? S.focus : id(pick(['mars', 'jupiter', 'neptune', 'venus']));
      await say(
        `Tlačítko „Jak je to velké“ na kartě postaví těleso vedle Země, Měsíce a dalších. Teď: ${name(i)}.`,
        `Jak velký je ${name(i)}? Tlačítko „Jak je to velké“ ho postaví vedle Země a Měsíce!`
      );
      if (S.focus !== i) await goto(i);
      await point('#card [data-a="cmp"]');
      ui.act('cmp');
      await sleep(3600);
      await read();
      ui.toggle('#cmp', false);
    },
    async superkarta() {
      if (!ui.sk || (S.F && !S.F.on('superkarta'))) return;
      const i = isPlanet(S.focus) ? S.focus : id(pick(['saturn', 'jupiter', 'mars']));
      await say(
        `Pětkrát rychle klikni na těleso, jeho ikonu nebo jméno v kartě: otevře se Superkarta se vším, co o něm aplikace ví. Teď: ${name(i)}.`,
        `Tajný trik: pětkrát rychle ťukni na planetu a otevře se velká karta se vším, co o ní víme!`,
        `Pětkrát rychle ťukni na těleso nebo jeho ikonu: otevře se Superkarta se vším, co o něm aplikace ví. Teď: ${name(i)}.`
      );
      if (S.focus !== i) await goto(i);
      await point(`#dock .it[data-i="${i}"]`, 60);
      for (let k = 0; k < 4; k++) {
        cur.classList.remove('tap');
        void cur.offsetWidth;
        cur.classList.add('tap');
        A.play('tut_ping');
        await sleep(190);
      }
      ui.sk.open(i);
      await sleep(4200);
      await read();
      ui.toggle('#sk', false);
    },
    async ukazy() {
      if (!ui.uk || (S.F && !S.F.on('ukazy'))) return;
      const e = pick([
        ['s1999', 'zatmění Slunce 11. srpna 1999: stín Měsíce běží přes Evropu'],
        ['s2026', 'zatmění Slunce 12. srpna 2026: stín Měsíce míří na Španělsko'],
        ['p2029', 'planetku Apophis, která v pátek 13. dubna 2029 proletí těsně kolem Země'],
      ]);
      await say(
        `☰ → 🔭 Úkazy na obloze: zatmění, přechody, komety a supernovy z dějin i budoucnosti, spočítané modelem. Přehrajeme ${e[1]}.`,
        '',
        `☰ → 🔭 Úkazy na obloze: zatmění, přechody, komety a supernovy z dějin i budoucnosti. Přehrajeme ${e[1]}.`
      );
      await point('#tools [data-a="more"]');
      ui.act('uk');
      await sleep(1700);
      ui.toggle('#uk', false);
      ui.uk.card(e[0]);
      await sleep(900);
      const b = $('#ukc [data-u="play"]');
      if (b) {
        await point(b, 200);
        b.click();
      }
      await sleep(7600);
      await read();
      const x = $('#ukc.on [data-u="close"]'); /* zavření karty vrátí čas, pohled i přisvětlení */
      if (x) x.click();
      await sleep(500);
    },
    async where() {
      const i = pick(['pluto', 'eris', 'sedna', 'makemake'].map(id).filter((x) => x !== undefined));
      await say(
        `Daleko od Slunce se snadno ztratíš. ☰ → 📍 Kde jsem? ukáže šipky ke Slunci, Zemi a známým hvězdám. ⌂ (Home) vrátí celou soustavu. Teď: ${name(i)}.`,
        `Ztratil ses? Nevadí! ☰ → 📍 Kde jsem? ti ukáže, kde je Slunce a Země. A domeček ⌂ tě vrátí domů.`
      );
      await goto(i);
      await point('#tools [data-a="more"]');
      if (ui.where) ui.where();
      await sleep(3600);
      await read();
    },
    async cine() {
      const i = id(pick(['saturn', 'jupiter', 'earth']));
      await say(
        'Kino (klávesa I nebo ☰ → 🎬 Kino) skryje celé rozhraní – zůstane jen vesmír. Y přidá pomalé otáčení.',
        'A teď kino! Všechna tlačítka zmizí a zůstane jen vesmír. Zpátky je vrátí křížek nahoře.',
        'Kino (☰ → 🎬 Kino) skryje celé rozhraní – zůstane jen vesmír. Vrátí ho tlačítko ✕ vpravo nahoře.'
      );
      await goto(i);
      await point('#tools [data-a="more"]');
      ui.act('cine');
      await anim(3600, (u, dt) => S.rotate(-70 * dt, 0));
      ui.act('cine');
      await read();
    },
  };
  /* force: pole kapitol místo náhodného plánu (jen pro testy) */
  T.start = async (force) => {
    if (run) return;
    const me = (run = { stop: false }),
      keep = { kid: ui.kid(), gamma: S.gamma, sun: S.sunMode };
    document.body.classList.add('tutoring');
    box.classList.add('on');
    A.play('tut_start');
    closePops();
    /* pokročilé kapitoly podle rozhraní, ve kterém poběží: úkazy a Superkarta jsou jen pro dospělé */
    const adv = (kid) =>
      shuffle(
        kid
          ? ['cmp', 'game', 'small', 'where', 'cine']
          : ['superkarta', 'ukazy', 'cmp', 'where', 'cine', ...(touch() ? [] : ['search'])]
      ).filter((c) => (c !== 'superkarta' || ui.sk) && (c !== 'ukazy' || ui.uk));
    const mine = adv(keep.kid),
      other = adv(!keep.kid).filter((c) => c !== mine[0]),
      plan = Array.isArray(force)
        ? force
        : ['planet', 'mouse', 'moons', 'time', 'orbits', 'sky', 'MODE', other[0], 'BACK', 'gamma', 'sun', mine[0]],
      N = plan.length + 2;
    T.log = [];
    let n = 0;
    const head = (c) => {
      n++;
      num.textContent = `${n}/${N}`;
      bar.style.width = (n / N) * 100 + '%';
      A.play('tut_step');
      T.log.push(c);
    };
    try {
      head('uvod');
      await say(
        'Ukázka ovládání, asi dvě minuty. Pokaždé je trochu jiná. Esc nebo klik do vesmíru ji ukončí.',
        'Ahoj! Ukážu ti, jak se tu létá. Trvá to dvě minutky. Kdykoli ťukni do vesmíru a hraješ sám.',
        'Ukázka ovládání, asi dvě minuty. Pokaždé je trochu jiná. Ťuknutí do vesmíru ji ukončí.'
      );
      await sleep(1000);
      for (const c of plan) {
        head(c);
        closePops(); /* žádné okno z předchozí kapitoly nezůstane viset */
        if (c === 'MODE' || c === 'BACK') {
          const toKid = !ui.kid();
          await point('#b-mode');
          ui.setMode(toKid);
          await say(
            c === 'BACK'
              ? 'Zpět v rozhraní pro dospělé: věcné údaje, jednotky, zdroje.'
              : 'A tohle je rozhraní pro dospělé (klávesa K): věcné údaje, jednotky, zdroje a víc nástrojů.',
            c === 'MODE'
              ? 'A tohle je dětské rozhraní! Větší tlačítka, tykání a karty plné zajímavostí: kolik bys tu vážil a jak vysoko doskočíš.'
              : 'Jsme zpátky u tebe!'
          );
          await sleep(c === 'MODE' ? 2000 : 900);
          await read();
        } else await CH[c]();
        await sleep(200);
      }
      head('konec');
      closePops();
      await say(
        'Hotovo. Klávesa H ukáže nápovědu a ukázku pustí znovu – příště ukáže jiné funkce. Všechno ostatní najdeš v nabídce ☰.',
        'A teď ty, kapitáne! Nahoře čeká hádanka. Kdybys nevěděl, zmáčkni H. 🚀',
        'Hotovo. Tlačítko ? ukáže nápovědu, ukázku pustíš znovu z nabídky ☰ – příště ukáže jiné funkce.',
        'A teď ty, kapitáne! 🎯 ti ukáže hádanku. Kdybys nevěděl, ťukni na ?. 🚀'
      );
      A.play('tut_end');
      await point('#tools [data-a="home"]');
      S.home();
      await sleep(2000);
      await read();
    } catch (e) {
      if (e.message !== 'stop') console.error(e);
    }
    // úklid: ať ukázka skončí kdekoli, všechno se vrátí do stavu před ní
    if (run === me) run = null;
    closePops();
    S.conMode = 0;
    S.starNames = false;
    S.orbMode = 2;
    S.labMode = 1;
    S.rateIdx = 1;
    S.paused = false;
    S.resetLook();
    S.setGamma(keep.gamma);
    $('#gam').value = keep.gamma;
    S.setSunMode(keep.sun);
    if (ui.kid() !== keep.kid) ui.setMode(keep.kid);
    cur.style.opacity = 0;
    box.classList.remove('on');
    document.body.classList.remove('tutoring');
    ui.refresh();
  };
  T.stop = () => {
    if (run) {
      run.stop = true;
      A.play('skip');
    }
  };
  $('#tut-skip').addEventListener('click', T.stop);
  return T;
}
