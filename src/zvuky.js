// Zkušebna zvuků: 256 zvuků z volných balíčků (CC0, opengameart.org) k poslechu a zaškrtání. Soubory dist/zvuky/zNNN.mp3
// se stahují až při přehrání. Výběr se pamatuje v prohlížeči a dá se zkopírovat jako text.
import Z from './zvuky.json';
export function createZvuky(A, ui) {
  const $ = (s) => document.querySelector(s), box = $('#zv'), list = $('#zv-list'), L = Z.list, cats = [...new Set(L.map(z => z[1]))];
  let sel = new Set(), cat = '', cur = 0, au = null, playing = 0;
  try { sel = new Set(JSON.parse(localStorage.getItem('s200zv') || '[]')); } catch (e) { /* nic */ }
  const save = () => { try { localStorage.setItem('s200zv', JSON.stringify([...sel])); } catch (e) { /* nic */ } };
  const id = (n) => 'z' + String(n).padStart(3, '0'), vis = () => L.filter(z => cat === '' || (cat === '✔' ? sel.has(z[0]) : z[1] === cat));
  const line = (z) => `${id(z[0])} | ${z[1]} | ${z[2]} | ${z[3]} s | ${Z.packs[z[4]][1]}`;
  function stop() { if (au) { au.pause(); au = null; } playing = 0; list.querySelectorAll('.play').forEach(e => e.classList.remove('play')); }
  function play(n) { stop(); A.unlock(); au = new Audio('zvuky/' + id(n) + '.mp3'); au.volume = Math.min(1, (A.vol || 0.5) * 1.3); au.loop = $('#zv-loop').checked; playing = n; const r = list.querySelector(`[data-n="${n}"]`); if (r) r.classList.add('play');
    const a = au; a.onended = () => { if (au === a) stop(); }; a.onerror = () => { if (au === a) { stop(); ui.toast('Zvuk ' + id(n) + ' se nepodařilo načíst.'); } }; a.play().catch(() => {}); }
  function head() { $('#zv-n').textContent = `${L.length} zvuků · vybráno ${sel.size}`; $('#zv-cats').innerHTML = [['', 'Vše ' + L.length], ['✔', '✔ Vybrané ' + sel.size], ...cats.map(c => [c, c + ' ' + L.filter(z => z[1] === c).length])].map(c => `<button data-c="${c[0]}" class="${c[0] === cat ? 'sel' : ''}">${c[1]}</button>`).join('');
    if ($('#zv-out').classList.contains('on')) out(); }
  function draw() { const v = vis(); if (!v.some(z => z[0] === cur)) cur = v.length ? v[0][0] : 0;
    list.innerHTML = v.map(z => `<div class="zr${sel.has(z[0]) ? ' ok' : ''}${z[0] === cur ? ' cur' : ''}${z[0] === playing ? ' play' : ''}" data-n="${z[0]}"><button class="zp" data-q="1">▶</button><i>${id(z[0])}</i><b>${z[2]}${z[5] ? ' <small>(zkráceno na 20 s)</small>' : ''}</b><small>${z[3].toFixed(1)} s</small><em title="${Z.packs[z[4]][1]} – ${Z.packs[z[4]][2]}">${Z.packs[z[4]][1]}</em><input type="checkbox" ${sel.has(z[0]) ? 'checked' : ''} aria-label="Vybrat ${z[2]}"></div>`).join('') || '<p class="sub" style="padding:10px">Zatím nic vybraného.</p>'; head(); }
  const mark = (n) => { list.querySelectorAll('.cur').forEach(e => e.classList.remove('cur')); cur = n; const r = list.querySelector(`[data-n="${n}"]`); if (r) { r.classList.add('cur'); r.scrollIntoView({ block: 'nearest' }); } };
  const tick = (n, v) => { if (v === undefined) v = !sel.has(n); if (v) sel.add(n); else sel.delete(n); save(); const r = list.querySelector(`[data-n="${n}"]`); if (r) { r.classList.toggle('ok', v); r.querySelector('input').checked = v; } head(); };
  const out = () => { const t = $('#zv-out'); t.value = `Vybrané zvuky (${sel.size} z ${L.length}):\n` + L.filter(z => sel.has(z[0])).map(line).join('\n'); t.classList.add('on'); return t; };
  list.addEventListener('click', (e) => { const r = e.target.closest('.zr'); if (!r) return; const n = +r.dataset.n; mark(n); if (e.target.tagName === 'INPUT') return tick(n, e.target.checked); if (playing === n && e.target.classList.contains('zp')) return stop(); play(n); });
  $('#zv-cats').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; cat = b.dataset.c; draw(); list.scrollTop = 0; });
  $('#zv-stop').onclick = stop; $('#zv-loop').onchange = () => { if (au) au.loop = $('#zv-loop').checked; };
  $('#zv-copy').onclick = () => { const t = out(); t.focus(); t.select(); const done = () => ui.toast(`Výběr (${sel.size}) je zkopírovaný – vlož ho do chatu.`); if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t.value).then(done, () => { try { document.execCommand('copy'); done(); } catch (e) { ui.toast('Označ text v poli a zkopíruj ho ručně.'); } }); else { try { document.execCommand('copy'); done(); } catch (e) { /* nic */ } } };
  const open = (v) => { box.classList.toggle('on', v); if (v) draw(); else stop(); };
  $('#zvb').onclick = () => open(!box.classList.contains('on')); box.querySelector('[data-zx]').onclick = () => open(false);
  // klávesy jen pro zkušebnu – ostatní zkratky aplikace se k nim nedostanou
  document.addEventListener('keydown', (e) => { if (!box.classList.contains('on')) return; const k = e.key; if (k === 'Escape') { open(false); e.stopPropagation(); return; }
    if (e.target.tagName === 'TEXTAREA') { e.stopPropagation(); return; } const v = vis(), p = v.findIndex(z => z[0] === cur);
    if (k === 'ArrowDown' || k === 'ArrowUp') { const q = v[Math.max(0, Math.min(v.length - 1, p + (k === 'ArrowDown' ? 1 : -1)))]; if (q) { mark(q[0]); if ($('#zv-auto').checked) play(q[0]); } }
    else if (k === ' ') { if (cur) play(cur); } else if (k === 'Enter') { if (cur) tick(cur); } else if (k !== 'Tab') { e.stopPropagation(); return; }
    e.preventDefault(); e.stopPropagation(); }, true);
  return { open, play, stop, count: L.length, sel: () => [...sel], tick };
}
