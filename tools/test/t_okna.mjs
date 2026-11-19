// Inspekce oken na různých zařízeních (verze 1.8a): notebook, druhý monitor, televize, tablet, telefon (i iPhone a iPad podle označení
// prohlížeče). Pro každou sestavu a obě rozhraní otevře postupně všechna okna a měří:
//   mimo   – okno přesahuje okraj obrazovky (část je nedostupná)
//   řez    – obsah je vyšší než okno a okno se nedá posouvat
//   křížek – zavírací tlačítko chybí, je mimo obrazovku, zakryté, nebo je na dotyku menší než 30 bodů
//   překryv – dvě okna se překrývají (kromě dvojic, kde je to záměr: nabídka ☰ a okna uprostřed leží nad vším)
//   volno  – podíl obrazovky, kde je vidět vesmír (ne okno)
// a potom „visící okna“: co zůstane otevřené po výběru jiného tělesa, po Esc, po kliknutí do vesmíru, po startu ukázky a v kině.
// Použití: node tools/test/t_okna.mjs [složka] [filtr sestav, např. iphone,ipad] ; SHOT=1 uloží snímek každého stavu; OKNA=obl_ změří jen okna, jejichž jméno tak začíná.
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import http from 'http';
import fs from 'fs';
import path from 'path';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp' };
const srv = http
  .createServer((q, r) => {
    const u = q.url.split('?')[0],
      f = path.join('dist', decodeURIComponent(u === '/' ? '/index.html' : u));
    fs.readFile(f, (e, d) => {
      if (e) {
        r.writeHead(404);
        r.end();
      } else {
        r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
        r.end(d);
      }
    });
  })
  .listen(0);
const port = srv.address().port,
  out = process.argv[2] || '/tmp/okna',
  filtr = (process.argv[3] || '').split(',').filter(Boolean),
  SHOT = !!process.env.SHOT,
  JEN = (process.env.OKNA || '').split(',').filter(Boolean); /* OKNA=obl_ změří jen vyjmenovaná okna */
fs.mkdirSync(out, { recursive: true });
const UA_IPHONE =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  UA_IPAD =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15' /* iPadOS se hlásí jako Mac */,
  UA_ANDROID =
    'Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  UA_ATAB =
    'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
// [jméno, šířka, výška, poměr bodů, dotyk, označení prohlížeče, popis]
const SESTAVY = [
  ['nb1366', 1366, 768, 1, 0, 0, 'levný notebook 1366 × 768'],
  ['nb1280', 1280, 720, 1.5, 0, 0, 'notebook Full HD se zvětšením 150 %'],
  ['nb1536', 1536, 864, 1.25, 0, 0, 'notebook Full HD se zvětšením 125 %'],
  ['nb1920', 1920, 1080, 1, 0, 0, 'notebook / monitor Full HD (i duplikace na televizi)'],
  ['okno900', 900, 600, 1, 0, 0, 'zmenšené okno na počítači'],
  ['mon2560', 2560, 1440, 1, 0, 0, 'monitor QHD'],
  ['mon4k150', 2560, 1440, 1.5, 0, 0, 'monitor 4K se zvětšením 150 %'],
  ['tv4k300', 1280, 720, 3, 0, 0, 'televize 4K se zvětšením 300 %'],
  ['iphoneSE', 375, 667, 2, 1, UA_IPHONE, 'iPhone SE na výšku'],
  ['iphone', 390, 844, 3, 1, UA_IPHONE, 'iPhone 14 na výšku'],
  ['iphoneL', 844, 390, 3, 1, UA_IPHONE, 'iPhone 14 na šířku'],
  ['iphoneSEL', 667, 375, 2, 1, UA_IPHONE, 'iPhone SE na šířku'],
  ['android', 360, 740, 3, 1, UA_ANDROID, 'telefon Android na výšku'],
  ['ipad', 768, 1024, 2, 1, UA_IPAD, 'iPad na výšku'],
  ['ipadL', 1024, 768, 2, 1, UA_IPAD, 'iPad na šířku'],
  ['ipadPro', 1366, 1024, 2, 1, UA_IPAD, 'iPad Pro 12,9" na šířku'],
  ['atab', 800, 1280, 2, 1, UA_ATAB, 'tablet Android na výšku'],
  ['atabL', 1280, 800, 2, 1, UA_ATAB, 'tablet Android na šířku'],
].filter((s) => !filtr.length || filtr.some((f) => s[0].toLowerCase().startsWith(f.toLowerCase())));
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const errs = [],
  nalezy = [],
  radky = [];
// měření stavu stránky (běží v prohlížeči)
const MERENI = () => {
  const W = innerWidth,
    H = innerHeight,
    touch = document.body.classList.contains('touch') || document.body.classList.contains('mob');
  const SEL =
    '#top #tools #mission #card #cardtab #minfo #list #gamebox #help #more #album #uk #ukc #tm #cmp #dev #sk #ds #dsb #dss #mini #guide #hud #dock #sub #sunchip #tut'.split(
      ' '
    );
  const vis = (e) => {
    if (!e) return false;
    for (let p = e; p && p !== document.documentElement; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return false;
    }
    const r = e.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  };
  const o = {
    cls: document.body.className,
    win: [W, H],
    it: {},
    mimo: [],
    rez: [],
    krizek: [],
    prekryv: [],
    zakryte: [],
  };
  const R = {};
  for (const s of SEL) {
    const e = document.querySelector(s);
    if (!vis(e)) continue;
    if (s === '#card' && (e.classList.contains('dock') || e.classList.contains('gone'))) continue;
    if (s === '#cardtab' && !e.classList.contains('on')) continue; /* ouško je schované za okrajem */
    const r = e.getBoundingClientRect();
    R[s] = r;
    o.it[s] = [r.left | 0, r.top | 0, r.width | 0, r.height | 0];
    /* ouško karty je přichycené k pravému okraji a vyjíždí animací – při pomalém kreslení ho měření zastihne v pohybu */
    if (s !== '#cardtab' && (r.left < -2 || r.top < -2 || r.right > W + 2 || r.bottom > H + 2))
      o.mimo.push(`${s} [${r.left | 0},${r.top | 0} – ${r.right | 0},${r.bottom | 0}] okno ${W}×${H}`);
    /* obsah vyšší než okno: buď se posouvá okno samo, nebo některý jeho potomek */
    if (e.scrollHeight > e.clientHeight + 4) {
      const oy = getComputedStyle(e).overflowY;
      let ok = oy === 'auto' || oy === 'scroll';
      if (!ok)
        for (const c of e.querySelectorAll('*')) {
          const cy = getComputedStyle(c).overflowY;
          if ((cy === 'auto' || cy === 'scroll') && c.clientHeight > 40) {
            ok = true;
            break;
          }
        }
      if (!ok) o.rez.push(`${s} obsah ${e.scrollHeight} > ${e.clientHeight}`);
    }
    if (e.scrollWidth > e.clientWidth + 4 && !['#dock', '#sub'].includes(s)) {
      const ox = getComputedStyle(e).overflowX;
      if (ox !== 'auto' && ox !== 'scroll') o.rez.push(`${s} šířka obsahu ${e.scrollWidth} > ${e.clientWidth}`);
    }
  }
  // zavírací tlačítka oken
  for (const s of [
    '#list',
    '#gamebox',
    '#help',
    '#album',
    '#uk',
    '#ukc',
    '#tm',
    '#cmp',
    '#dev',
    '#sk',
    '#ds',
    '#dss',
    '#card',
  ]) {
    if (!R[s]) continue;
    const e = document.querySelector(s),
      x = e.querySelector('.x, [data-mc="x"], [data-close], [data-u="x"], [data-u="zavrit"], [data-c="x"]');
    if (!x || !vis(x)) {
      o.krizek.push(`${s}: zavírací tlačítko chybí`);
      continue;
    }
    const r = x.getBoundingClientRect(),
      cx = r.left + r.width / 2,
      cy = r.top + r.height / 2;
    if (cx < 0 || cy < 0 || cx > W || cy > H) {
      o.krizek.push(`${s}: křížek mimo obrazovku (${cx | 0}, ${cy | 0})`);
      continue;
    }
    const top = document.elementFromPoint(cx, cy);
    const jine = top && top.closest('.pop, #help, #list, #gamebox, #ukc, #more');
    if (jine && jine !== e) continue; /* okno je pod jiným oknem – to je v pořádku, zavře se to horní */
    if (!(top === x || x.contains(top)))
      o.krizek.push(`${s}: křížek zakrývá ${top && (top.id ? '#' + top.id : top.tagName)}`);
    if (touch && Math.min(r.width, r.height) < 30)
      o.krizek.push(`${s}: křížek jen ${r.width | 0}×${r.height | 0} bodů`);
  }
  // překryvy
  const SKUP = (s) => (['#dock', '#sub'].includes(s) ? 'dw' : s);
  const ks = Object.keys(R);
  for (let a = 0; a < ks.length; a++)
    for (let b = a + 1; b < ks.length; b++) {
      const p = R[ks[a]],
        q = R[ks[b]];
      if (SKUP(ks[a]) === SKUP(ks[b])) continue;
      const w = Math.min(p.right, q.right) - Math.max(p.left, q.left),
        h = Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top);
      if (w > 6 && h > 6 && w * h > 300) {
        const cx = Math.max(p.left, q.left) + w / 2,
          cy = Math.max(p.top, q.top) + h / 2,
          t = document.elementFromPoint(cx, cy),
          kdo = t && t.closest(ks[a]) ? ks[a] : t && t.closest(ks[b]) ? ks[b] : '?';
        /* záměr: okna uprostřed a nabídka leží nad vším; na telefonu zabírají okna celou obrazovku */
        const MODAL = ['#help', '#cmp', '#sk', '#dss', '#dsb', '#more', '#album', '#dev'].concat(
          document.body.classList.contains('mob') ? ['#list', '#tm', '#gamebox', '#uk', '#ukc', '#ds'] : []
        );
        if (MODAL.includes(kdo)) continue;
        o.prekryv.push(`${ks[a]} × ${ks[b]} ${w | 0}×${h | 0} (nahoře ${kdo})`);
      }
    }
  // volné zorné pole: podíl bodů mřížky, kde je navrchu plátno
  let free = 0,
    n = 0;
  for (let y = 0; y < 18; y++)
    for (let x = 0; x < 32; x++) {
      const t = document.elementFromPoint(((x + 0.5) / 32) * W, ((y + 0.5) / 18) * H);
      n++;
      if (t && (t.id === 'gl' || t.id === 'ov' || t === document.body || t === document.documentElement)) free++;
    }
  o.volno = Math.round((free / n) * 100);
  return o;
};
const OKNA = [
  ['zaklad', () => {}, 0],
  ['napoveda', () => S200.ui.act('help'), 0],
  ['denik', () => S200.ui.act('game'), 0],
  ['seznam', () => S200.ui.act('list'), 0],
  ['album', () => S200.ui.act('album'), 0],
  ['porovnani', () => S200.ui.act('cmp'), 0],
  ['nabidka', () => S200.ui.act('more'), 0],
  ['stroj_casu', () => S200.ui.act('tm'), 1],
  ['ukazy', () => S200.ui.act('uk'), 1],
  ['superkarta', () => S200.sk.open(S200.sim.idx.get('saturn')), 1],
  ['karta_ukazu', () => S200.uk.card(S200.uk.ids()[0]), 1],
  /* 1.8c: objekty na obloze – seznam, bublina se jménem u objektu, scéna objektu */
  ['obl_seznam', () => S200.obloha.list(), 1],
  [
    'obl_bublina',
    () => {
      S200.obloha.fast(true);
      S200.obloha.aim('m42');
      S200.obloha.sel('m42');
    },
    1,
  ],
  [
    'obl_scena',
    () =>
      new Promise((r) => {
        /* scéna je hotová, až je otevřená a hlavní rozhraní dozmizelo (jinak by měření zastihlo přechod) */
        S200.obloha.fast(true);
        S200.obloha.open('carina');
        const t = setInterval(() => {
          const s = S200.obloha.state().stage;
          if (s && s.ph === 'open') {
            clearInterval(t);
            setTimeout(r, 1100);
          }
        }, 100);
      }),
    1,
  ],
];
const zavriVse = () => {
  for (const s of ['#help', '#gamebox', '#list', '#album', '#tm', '#cmp', '#dev', '#more', '#zv', '#uk', '#sk', '#ds'])
    if (document.querySelector(s).classList.contains('on')) S200.ui.toggle(s, false);
  if (S200.obloha) {
    S200.obloha.close(true);
    S200.obloha.sel(null);
  }
  {
    const x = document.querySelector('#ukc.on [data-u="close"]');
    x && x.click();
  }
};
async function otevri(s, kid) {
  const [jm, w, h, dpr, dotyk, ua] = s;
  const c = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: dpr,
    hasTouch: !!dotyk,
    isMobile: !!dotyk,
    ...(ua ? { userAgent: ua } : {}),
  });
  const p = await c.newPage();
  p.on('pageerror', (e) => errs.push(`${jm}: ${e.message}`));
  await p.goto(`http://localhost:${port}/`);
  await p.waitForFunction(() => window.S200);
  await p.evaluate((k) => {
    localStorage.clear();
    document.querySelector(k ? '#sp-kid' : '#sp-adult').click();
    document.querySelector('#sp-go').click();
  }, kid);
  await p.waitForFunction(() => !document.querySelector('#splash.on'), null, { timeout: 180000 });
  await p.waitForTimeout(600);
  return [c, p];
}
const zapis = (jm, rez, okno, m) => {
  const z = (typ, a) => a.forEach((t) => nalezy.push({ sestava: jm, rezim: rez, okno, typ, text: t }));
  z('mimo', m.mimo);
  z('řez', m.rez);
  z('křížek', m.krizek);
  z('překryv', m.prekryv);
  radky.push(
    `${jm.padEnd(10)} ${rez.padEnd(4)} ${okno.padEnd(12)} volno ${String(m.volno).padStart(3)} %  ${m.cls.replace(/\s+/g, ' ')}`
  );
};
for (const s of SESTAVY) {
  const jm = s[0];
  for (const kid of [false, true]) {
    const rez = kid ? 'děti' : 'dosp';
    const t0 = Date.now();
    const [c, p] = await otevri(s, kid);
    await p.evaluate(() => S200.S.jump(S200.sim.idx.get('saturn')));
    await p.waitForTimeout(500);
    /* úvodní obrazovka se měří zvlášť níž; tady okna jedno po druhém */
    for (const [okno, fn, jenDosp] of OKNA) {
      if (jenDosp && kid) continue;
      if (JEN.length && !JEN.some((j) => okno.startsWith(j))) continue;
      await p.evaluate(zavriVse);
      await p.evaluate(() => S200.ui.refresh && S200.ui.refresh());
      await p.evaluate(fn);
      await p.waitForTimeout(750); /* okna a ouško karty dojedou na místo */
      const m = await p.evaluate(MERENI);
      zapis(jm, rez, okno, m);
      if (SHOT)
        await p.screenshot({
          path: `${out}/${jm}_${kid ? 'k' : 'd'}_${okno}.jpg`,
          type: 'jpeg',
          quality: 55,
          timeout: 180000,
        });
    }
    await p.evaluate(zavriVse);
    // visící okna (jen dospělé rozhraní: má všechna okna)
    if (!kid) {
      const V = await p.evaluate(async () => {
        const $ = (q) => document.querySelector(q),
          on = () =>
            ['#help', '#gamebox', '#list', '#album', '#tm', '#cmp', '#dev', '#more', '#uk', '#sk', '#ukc']
              .filter((q) => $(q).classList.contains('on') && !$(q).classList.contains('min'))
              .join(' ') || '–',
          cekej = (ms) => new Promise((r) => setTimeout(r, ms)),
          esc = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
          o = {};
        let kolo = 0;
        const mars = S200.sim.idx.get('mars'),
          jup = S200.sim.idx.get('jupiter');
        for (const [jm, a] of [
          ['seznam', 'list'],
          ['denik', 'game'],
          ['album', 'album'],
          ['ukazy', 'uk'],
          ['stroj_casu', 'tm'],
          ['porovnani', 'cmp'],
          ['napoveda', 'help'],
        ]) {
          S200.ui.act(a);
          await cekej(120);
          const d = $(`#dock .it[data-i="${kolo++ & 1 ? mars : jup}"]`);
          d && d.click();
          await cekej(250);
          o[`${jm} → přelet k jinému tělesu`] = on();
          esc();
          await cekej(120);
          o[`${jm} → Esc`] = on();
          for (const q of ['#help', '#gamebox', '#list', '#album', '#tm', '#cmp', '#uk'])
            if ($(q).classList.contains('on')) S200.ui.toggle(q, false);
        }
        S200.uk.card(S200.uk.ids()[0]);
        await cekej(300);
        esc();
        await cekej(200);
        o['karta úkazu → Esc'] = on();
        if ($('#ukc.on')) {
          const d = $(`#dock .it[data-i="${jup}"]`);
          d && d.click();
          await cekej(300);
          o['karta úkazu → výběr jiného tělesa'] = on() + ($('#ukc.min') ? ' (sbalená)' : '');
        }
        {
          const x = $('#ukc.on [data-u="close"]');
          x && x.click();
        }
        S200.ui.act('list');
        S200.ui.act('cine');
        await cekej(300);
        o['seznam → kino'] = on() + ' / vidět: ' + (getComputedStyle($('#list')).opacity > 0.1 ? 'ano' : 'ne');
        S200.ui.act('cine');
        S200.ui.toggle('#list', false);
        S200.ui.act('help');
        S200.ui.act('tut');
        await cekej(400);
        o['nápověda → ukázka'] = on();
        return o;
      });
      await p.keyboard.press('Escape').catch(() => {});
      /* viset smí jen boční okna na počítači a tabletu (seznam těles, deník): pohled nezakrývají a slouží k prohlížení */
      const mob = /iphone|android/.test(jm) && !/^atab|^ipad/.test(jm);
      for (const k in V) {
        if (/kino/.test(k)) continue;
        const zbyva = V[k]
          .split(' ')
          .filter(
            (q) =>
              q !== '–' && !(!mob && (q === '#list' || q === '#gamebox')) && !/sbalená/.test(q) && q !== '(sbalená)'
          );
        if (zbyva.length)
          nalezy.push({ sestava: jm, rezim: rez, okno: 'visící', typ: 'visí', text: `${k}: ${zbyva.join(' ')}` });
      }
      for (const k in V) radky.push(`${jm.padEnd(10)} visící: ${k} = ${V[k]}`);
    }
    await c.close();
    console.log(`${jm} ${rez} hotovo za ${((Date.now() - t0) / 1000) | 0} s`);
  }
  // úvodní obrazovka: vejde se celá a tlačítka jsou dostupná?
  {
    const [jm2, w, h, dpr, dotyk, ua] = s;
    const c = await browser.newContext({
      viewport: { width: w, height: h },
      deviceScaleFactor: dpr,
      hasTouch: !!dotyk,
      isMobile: !!dotyk,
      ...(ua ? { userAgent: ua } : {}),
    });
    const p = await c.newPage();
    await p.goto(`http://localhost:${port}/`);
    await p.waitForFunction(() => window.S200);
    await p.waitForTimeout(800);
    const u = await p.evaluate(() => {
      const r = (q) => {
        const e = document.querySelector(q);
        if (!e) return null;
        const b = e.getBoundingClientRect();
        return b.width ? [b.left | 0, b.top | 0, b.right | 0, b.bottom | 0] : null;
      };
      return {
        win: [innerWidth, innerHeight],
        in: r('#splash .in'),
        tut: r('#sp-tut'),
        go: r('#sp-go'),
        ver: r('#splash .ver'),
        kid: r('#sp-kid'),
      };
    });
    for (const k of ['in', 'tut', 'go', 'kid', 'ver']) {
      const b = u[k];
      if (b && (b[0] < -2 || b[1] < -2 || b[2] > u.win[0] + 2 || b[3] > u.win[1] + 2))
        nalezy.push({ sestava: jm2, rezim: 'úvod', okno: 'úvod', typ: 'mimo', text: `${k} [${b}] okno ${u.win}` });
    }
    if (SHOT) await p.screenshot({ path: `${out}/${jm2}_uvod.jpg`, type: 'jpeg', quality: 55, timeout: 180000 });
    await c.close();
  }
}
await browser.close();
srv.close();
fs.writeFileSync(`${out}/nalezy.json`, JSON.stringify(nalezy, null, 1));
fs.writeFileSync(`${out}/radky.txt`, radky.join('\n'));
// souhrn: nálezy seskupené podle textu bez čísel, ať je vidět vzorec
const sk = {};
for (const n of nalezy) {
  const k = `${n.typ} | ${n.okno} | ${n.text.replace(/\d+/g, '#')}`;
  (sk[k] = sk[k] || new Set()).add(`${n.sestava}/${n.rezim}`);
}
for (const k of Object.keys(sk).sort()) console.log(k + '\n      ' + [...sk[k]].join(', '));
console.log(`\nnálezů ${nalezy.length}, chyby stránky ${errs.length}`);
errs.slice(0, 10).forEach((e) => console.log('  ' + e));
process.exit(nalezy.length || errs.length ? 1 : 0);
