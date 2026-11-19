// Telefon a tablet: rozpoznání zařízení, rozložení (třídy na <body>), karta, která sama mizí, hádanka na vyžádání.
// Počítač s myší a širokým oknem nedostane žádnou z tříd mob / tab / touch a chová se jako dřív.
export function createMobile(S, A, ui) {
  const B = document.body,
    $ = (s) => document.querySelector(s),
    mq = matchMedia('(pointer: coarse)'),
    M = { mob: false, tab: false, touch: false, big: false, force: 'auto' };
  try {
    M.force = localStorage.getItem('s200view') || 'auto';
  } catch (e) {
    /* nic */
  }
  {
    const q = new URLSearchParams(location.search).get('view');
    if (q === 'mob' || q === 'pc' || q === 'tab' || q === 'big') M.force = q;
  }
  /* celá obrazovka: tlačítko se schová jen tam, kde ji prohlížeč opravdu neumí (iPhone) */
  if (!(document.fullscreenEnabled || document.webkitFullscreenEnabled)) B.classList.add('nofs');
  /* klávesové zkratky v nápovědě: na dotykovém zařízení se ukážou, jakmile někdo stiskne skutečnou klávesu (tabule, notebook s dotykem) */
  addEventListener(
    'keydown',
    (e) => {
      if (e.isTrusted && !/^(INPUT|TEXTAREA)$/.test((e.target && e.target.tagName) || '')) B.classList.add('kbd');
    },
    { passive: true }
  );
  const card = $('#card'),
    minfo = $('#minfo'),
    mis = $('#mission');
  let fadeT = 0,
    misT = 0,
    dismissed = -1,
    lastSel = -1;
  function layout() {
    const w = innerWidth,
      h = innerHeight,
      coarse = mq.matches,
      f = M.force;
    /* 1.7: telefon = dotyk bez myši. Počítač (i s dotykovým displejem, i připojený k televizi se zvětšením 300 %)
       telefonní rozložení sám nikdy nedostane: malé okno nebo málo bodů znamená jen zmenšené počítačové rozhraní. */
    /* 1.7.1: telefony s perem hlásí i jemný ukazatel – mobilní prohlížeč (podle svého označení) je proto telefon vždy */
    const fineAny = matchMedia('(any-pointer: fine)').matches,
      uaMob =
        (navigator.userAgentData && navigator.userAgentData.mobile) ||
        /Mobi|Android|iPhone|iPod/.test(navigator.userAgent || ''),
      phone = coarse && (!fineAny || !!uaMob),
      small = f === 'auto' && !phone && (w < 1100 || h < 560),
      shrink = small ? Math.max(0.5, Math.min(1, w / 1100, h / 560)) : 1;
    M.mob = f === 'mob' || (f === 'auto' && phone && (w < 700 || Math.min(w, h) < 520));
    M.tab = !M.mob && (f === 'tab' || (f === 'auto' && phone));
    M.touch = (coarse && f !== 'pc') || f === 'tab';
    M.shrink = shrink;
    /* velká obrazovka (4K televize, tabule bez zvětšení v systému): rozhraní se zvětší, aby bylo čitelné z dálky */
    M.big = f === 'big' || (f === 'auto' && !M.mob && w >= 2400);
    /* 1.5: má-li systém vlastní zvětšení (4K monitor na 150 %), je rozhraní už zvětšené – přidává se jen mírně */
    const dpr = window.devicePixelRatio || 1;
    const bk = !M.big
      ? 1
      : f === 'big'
        ? Math.min(2.4, Math.max(1.25, w / 1500))
        : dpr >= 1.4
          ? Math.min(1.6, Math.max(1, w / 2100))
          : Math.min(2.2, w / 1750);
    const bk2 = M.big ? bk : shrink; /* jedno měřítko: nad 1 velká obrazovka, pod 1 malé okno na počítači */
    B.classList.toggle('big', bk2 !== 1);
    B.style.setProperty('--bk', bk2.toFixed(2));
    S.txtK = bk2;
    B.classList.toggle('mob', M.mob);
    B.classList.toggle('tab', M.tab);
    B.classList.toggle('touch', M.touch);
    B.classList.toggle('land', M.mob && w > h);
    /* horní lišta: popisky tlačítek se schovávají postupně (stupně 0–4 v data-tl), teprve pak se lišta zalomí na druhý řádek */
    B.classList.remove('stack');
    B.dataset.tl = 0;
    if (!M.mob) {
      const clash = () => $('#top').getBoundingClientRect().right + 8 > $('#tools').getBoundingClientRect().left;
      let tl = 0;
      while (tl < 4 && clash()) B.dataset.tl = ++tl;
      if (clash()) B.classList.add('stack');
    }
    S.pickR = M.touch ? 24 : 12;
    {
      /* 1.6: položka říká, co platí TEĎ a kdo to určil; klik přepne na další možnost */
      const ted = M.mob ? 'telefon' : M.tab ? 'tablet' : M.big ? 'velká obrazovka' : 'počítač';
      $('#b-view').textContent = `🖥 Rozložení: ${ted} (${f === 'auto' ? 'auto' : 'ručně'}) · změnit`;
      $('#b-view').title =
        'Ukazuje rozložení, které právě platí. Kliknutím přepneš na další: automaticky → telefon → tablet → počítač → velká obrazovka.';
    }
    dock();
    if (!M.mob && !M.tab) {
      card.classList.remove('gone', 'open');
      minfo.classList.remove('on');
      mis.classList.remove('show');
    } else {
      card.classList.remove('dock');
      $('#cardtab').classList.remove('on');
    }
    decorate();
    S.wake();
  }
  const dock = () =>
    B.style.setProperty('--dk', Math.round(innerHeight - $('#dockwrap').getBoundingClientRect().top - 5) + 'px');
  if (window.ResizeObserver) new ResizeObserver(dock).observe($('#dockwrap'));
  // karta: na telefonu jen hlavička a první věta; po 8 s se vytratí, ⓘ ji vrátí
  const hide = (user) => {
    card.classList.add('gone');
    card.classList.remove('open');
    minfo.classList.add('on');
    if (user) dismissed = S.sel;
  };
  const arm = () => {
    clearTimeout(fadeT);
    if (M.mob && !card.classList.contains('open')) fadeT = setTimeout(() => hide(false), 8000);
  };
  const show = () => {
    card.classList.remove('gone');
    minfo.classList.remove('on');
    dismissed = -1;
    arm();
  };
  function decorate() {
    if (!card.firstChild) return;
    tab.textContent = 'ⓘ ' + ((card.querySelector('h2') || {}).textContent || 'karta') + ' ‹';
    if (!card.querySelector('.mctl')) {
      const d = document.createElement('div');
      d.className = 'mctl';
      d.innerHTML =
        (M.mob
          ? `<button data-mc="open" title="Rozbalit / sbalit">${card.classList.contains('open') ? '⌄' : '⌃'}</button>`
          : '') + '<button data-mc="x" title="Zavřít">×</button>';
      card.appendChild(d);
    }
    if (!(M.mob || M.tab)) return;
    if (S.sel !== lastSel) {
      lastSel = S.sel;
      card.classList.remove('open');
      const o = card.querySelector('[data-mc="open"]');
      if (o) o.textContent = '⌃';
      if (dismissed !== S.sel) show();
    } else if (!card.classList.contains('gone')) arm();
  }
  S.bus.on('card', decorate);
  card.addEventListener(
    'click',
    (e) => {
      const m = e.target.dataset.mc;
      if (!m) {
        arm();
        return;
      }
      e.stopPropagation();
      if (m === 'x') {
        if (M.mob || M.tab) hide(true);
        else dockCard(true, false);
        A.play('panel_close');
      } else {
        const o = card.classList.toggle('open');
        e.target.textContent = o ? '⌄' : '⌃';
        A.play(o ? 'panel_open' : 'panel_close');
        clearTimeout(fadeT);
        if (!o) arm();
      }
    },
    true
  );
  card.addEventListener('pointerdown', () => clearTimeout(fadeT));
  card.addEventListener('scroll', () => clearTimeout(fadeT));
  minfo.addEventListener('click', () => {
    show();
    A.play('panel_open');
  });
  // počítač: karta zajede za pravý okraj a nechá tam ouško; deník ji odsune sám, protože by se překrývaly
  const tab = $('#cardtab'),
    gb = $('#gamebox');
  let autoDock = false;
  function dockCard(v, auto) {
    card.classList.toggle('dock', v);
    tab.classList.toggle('on', v);
    autoDock = v && auto;
  }
  tab.addEventListener('click', () => {
    dockCard(false, false);
    gb.classList.remove('on');
    gbSync();
    A.play('panel_open');
  });
  /* deník a karta sdílejí pravý okraj: když se deník otevře, karta se odklidí do ouška, a po zavření se vrátí */
  const gbSync = () => {
    if (M.mob) return;
    const on = gb.classList.contains('on');
    if (on && !card.classList.contains('dock')) dockCard(true, true);
    else if (!on && autoDock) dockCard(false, false);
  };
  S.bus.on('panel', (sel) => sel === '#gamebox' && gbSync());
  // hádanka: na telefonu se ukáže na 7 s při změně a na ťuknutí na 🎯
  const misShow = (ms) => {
    if (!M.mob || !mis.innerHTML) return;
    mis.classList.add('show');
    clearTimeout(misT);
    misT = setTimeout(() => mis.classList.remove('show'), ms);
  };
  S.bus.on('mission', () => setTimeout(() => misShow(7000), 0));
  $('#tools [data-m="mis"]').addEventListener('click', () => {
    if (mis.classList.contains('show')) {
      mis.classList.remove('show');
      A.play('panel_close');
    } else {
      misShow(12000);
      A.play('panel_open');
    }
  });
  mis.addEventListener('click', () => misShow(12000));
  // ruční přepnutí zobrazení (pojistka, kdyby rozpoznání nesedělo)
  $('#b-view').addEventListener('click', () => {
    const o = ['auto', 'mob', 'tab', 'pc', 'big'];
    M.force = o[(o.indexOf(M.force) + 1) % o.length];
    try {
      localStorage.setItem('s200view', M.force);
    } catch (e) {
      /* nic */
    }
    $('#more').classList.remove('on');
    layout();
    {
      const o2 = ['auto', 'mob', 'tab', 'pc', 'big'],
        nm = {
          auto: 'automaticky podle zařízení',
          mob: 'telefon',
          tab: 'tablet',
          pc: 'počítač',
          big: 'velká obrazovka (televize, tabule)',
        };
      ui.toast(`Rozložení teď: ${nm[M.force]}. Další klik: ${nm[o2[(o2.indexOf(M.force) + 1) % o2.length]]}.`);
    }
  });
  for (const s of ['#sp-go', '#sp-tut'])
    $(s).addEventListener('click', () => {
      if (M.mob || M.tab) show();
      misShow(7000);
    });
  /* 1.8a: Safari na iPhonu a iPadu jinak dovolí zvětšit celou stránku dvěma prsty na okně (a rozhraní pak „ujede“) */
  for (const g of ['gesturestart', 'gesturechange'])
    document.addEventListener(g, (e) => e.preventDefault(), { passive: false });
  addEventListener('resize', layout);
  S.bus.on('mode', () => setTimeout(layout, 0)); /* dětské písmo je širší – lišta se přeměří */
  addEventListener('orientationchange', () => setTimeout(layout, 250));
  if (mq.addEventListener) mq.addEventListener('change', layout);
  layout();
  setTimeout(layout, 400);
  M.layout = layout;
  return M;
}
