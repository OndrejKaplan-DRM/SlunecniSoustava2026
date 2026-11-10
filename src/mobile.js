// Telefon a tablet: rozpoznání zařízení, rozložení (třídy na <body>), karta, která sama mizí, hádanka na vyžádání.
// Počítač s myší a širokým oknem nedostane žádnou z tříd mob / tab / touch a chová se jako dřív.
export function createMobile(S, A, ui) {
  const B = document.body, $ = (s) => document.querySelector(s), mq = matchMedia('(pointer: coarse)'), M = { mob: false, tab: false, touch: false, force: 'auto' };
  try { M.force = localStorage.getItem('s200view') || 'auto'; } catch (e) { /* nic */ }
  { const q = new URLSearchParams(location.search).get('view'); if (q === 'mob' || q === 'pc' || q === 'tab') M.force = q; }
  const card = $('#card'), minfo = $('#minfo'), mis = $('#mission'); let fadeT = 0, misT = 0, dismissed = -1, lastSel = -1;
  function layout() {
    const w = innerWidth, h = innerHeight, coarse = mq.matches, f = M.force;
    M.mob = f === 'mob' || (f === 'auto' && (w < 700 || (coarse && Math.min(w, h) < 520)));
    M.tab = !M.mob && (f === 'tab' || (f === 'auto' && coarse)); M.touch = (coarse && f !== 'pc') || f === 'tab';
    B.classList.toggle('mob', M.mob); B.classList.toggle('tab', M.tab); B.classList.toggle('touch', M.touch); B.classList.toggle('land', M.mob && w > h);
    B.classList.remove('stack'); if (!M.mob) { const a = $('#top').getBoundingClientRect(), b = $('#tools').getBoundingClientRect(); if (a.right + 8 > b.left) B.classList.add('stack'); }
    S.pickR = M.touch ? 24 : 12; $('#b-view').textContent = '📱 Zobrazení: ' + { auto: 'automaticky', mob: 'telefon', tab: 'tablet', pc: 'počítač' }[f];
    dock(); if (!M.mob && !M.tab) { card.classList.remove('gone', 'open'); minfo.classList.remove('on'); mis.classList.remove('show'); } else decorate();
    S.wake();
  }
  const dock = () => B.style.setProperty('--dk', Math.round(innerHeight - $('#dockwrap').getBoundingClientRect().top - 5) + 'px');
  if (window.ResizeObserver) new ResizeObserver(dock).observe($('#dockwrap'));
  // karta: na telefonu jen hlavička a první věta; po 8 s se vytratí, ⓘ ji vrátí
  const hide = (user) => { card.classList.add('gone'); card.classList.remove('open'); minfo.classList.add('on'); if (user) dismissed = S.sel; };
  const arm = () => { clearTimeout(fadeT); if (M.mob && !card.classList.contains('open')) fadeT = setTimeout(() => hide(false), 8000); };
  const show = () => { card.classList.remove('gone'); minfo.classList.remove('on'); dismissed = -1; arm(); };
  function decorate() {
    if (!(M.mob || M.tab) || !card.firstChild) return;
    if (!card.querySelector('.mctl')) { const d = document.createElement('div'); d.className = 'mctl'; d.innerHTML = (M.mob ? `<button data-mc="open" title="Rozbalit / sbalit">${card.classList.contains('open') ? '⌄' : '⌃'}</button>` : '') + '<button data-mc="x" title="Zavřít">×</button>'; card.appendChild(d); }
    if (S.sel !== lastSel) { lastSel = S.sel; card.classList.remove('open'); const o = card.querySelector('[data-mc="open"]'); if (o) o.textContent = '⌃'; if (dismissed !== S.sel) show(); }
    else if (!card.classList.contains('gone')) arm();
  }
  new MutationObserver(decorate).observe(card, { childList: true });
  card.addEventListener('click', (e) => { const m = e.target.dataset.mc; if (!m) { arm(); return; } e.stopPropagation();
    if (m === 'x') { hide(true); A.play('panel_close'); } else { const o = card.classList.toggle('open'); e.target.textContent = o ? '⌄' : '⌃'; A.play(o ? 'panel_open' : 'panel_close'); clearTimeout(fadeT); if (!o) arm(); } }, true);
  card.addEventListener('pointerdown', () => clearTimeout(fadeT)); card.addEventListener('scroll', () => clearTimeout(fadeT));
  minfo.addEventListener('click', () => { show(); A.play('panel_open'); });
  // hádanka: na telefonu se ukáže na 7 s při změně a na ťuknutí na 🎯
  const misShow = (ms) => { if (!M.mob || !mis.innerHTML) return; mis.classList.add('show'); clearTimeout(misT); misT = setTimeout(() => mis.classList.remove('show'), ms); };
  new MutationObserver(() => misShow(7000)).observe(mis, { childList: true });
  $('#tools [data-m="mis"]').addEventListener('click', () => { if (mis.classList.contains('show')) { mis.classList.remove('show'); A.play('panel_close'); } else { misShow(12000); A.play('panel_open'); } });
  mis.addEventListener('click', () => misShow(12000));
  // ruční přepnutí zobrazení (pojistka, kdyby rozpoznání nesedělo)
  $('#b-view').addEventListener('click', () => { const o = ['auto', 'mob', 'tab', 'pc']; M.force = o[(o.indexOf(M.force) + 1) % o.length]; try { localStorage.setItem('s200view', M.force); } catch (e) { /* nic */ } $('#more').classList.remove('on'); layout(); ui.toast('Zobrazení: ' + { auto: 'automaticky podle zařízení', mob: 'telefon', tab: 'tablet', pc: 'počítač' }[M.force]); });
  for (const s of ['#sp-go', '#sp-tut']) $(s).addEventListener('click', () => { if (M.mob || M.tab) show(); misShow(7000); });
  addEventListener('resize', layout); addEventListener('orientationchange', () => setTimeout(layout, 250)); if (mq.addEventListener) mq.addEventListener('change', layout);
  layout(); setTimeout(layout, 400);
  M.layout = layout; return M;
}
