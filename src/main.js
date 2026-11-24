import * as misto from './core/misto.js';
import { createEngine } from './render/engine.js';
import { createUI } from './ui/ui.js';
import { createAudio } from './audio/audio.js';
import { createExtras } from './ui/extras.js';
import * as sim from './core/sim.js';
import { createMobile } from './ui/mobile.js';
import { createZvuky } from './ui/zvuky.js';
import { createOrient } from './ui/orient.js';
import { createUdalosti } from './ui/udalosti.js';
import { createFlags } from './core/flags.js';
import { createSuperkarta } from './ui/superkarta.js';
import { createObloha } from './ui/obloha.js';
import { createPovrch } from './ui/povrch.js';
let S;
try {
  S = createEngine(document.getElementById('gl'), document.getElementById('ov'));
} catch (e) {
  /* 1.8a: prohlížeč bez WebGL 2 (velmi starý telefon, vypnutá grafická akcelerace) – místo černé obrazovky srozumitelná zpráva */
  const b = document.querySelector('#splash .in');
  if (b)
    b.innerHTML =
      '<h1>Sluneční soustava <small>200</small></h1><p style="font-size:16px">Tento prohlížeč nebo zařízení neumí 3D grafiku (WebGL 2), kterou aplikace potřebuje.</p>' +
      '<p>Zkus aktuální Chrome, Edge, Firefox nebo Safari. Na počítači pomáhá zapnout v nastavení prohlížeče hardwarovou akceleraci.</p>' +
      '<p class="fine" style="display:block">Podrobnost: ' +
      String((e && e.message) || e).slice(0, 160) +
      '</p>';
  throw e;
}
/* registr funkcí (kdo co uvidí) musí existovat dřív než rozhraní */
const F = (S.F = createFlags());
const A = createAudio(S);
const ui = createUI(S, A);
ui.X = createExtras(S, A, ui);
const mob = createMobile(S, A, ui);
const zv = createZvuky(A, ui);
const orient = createOrient(S, A, ui);
/* 1.10: pohled z povrchu tělesa (musí existovat dřív než úkazy: zatmění se dá sledovat z místa úkazu) */
const povrch = (ui.povrch = createPovrch(S, A, ui));
const uk = createUdalosti(S, A, ui);
const sk = createSuperkarta(S, A, ui);
/* ukázka ovládání umí předvést i Superkartu a úkazy */
ui.sk = sk;
ui.uk = uk;
/* 1.8b: objekty vzdáleného vesmíru na fotce oblohy (jen dospělé rozhraní) */
const obloha = (ui.obloha = createObloha(S, A, ui));
/* 1.8a: pásy planetek – při prvním spatření krátké vysvětlení, že jde o ilustraci */
S.bus.on('belt', (b) => {
  if (ui.tut.running() || document.body.classList.contains('spl')) return;
  const k = ui.kid();
  ui.toast(
    b === 'main'
      ? k
        ? '🪨 Ty tečky jsou pás planetek: miliony kamenů mezi Marsem a Jupiterem! (Tečky jsou jen pro představu.)'
        : '🪨 Tečky mezi Marsem a Jupiterem: hlavní pás planetek. Ilustrace – skutečných planetek jsou miliony a z této dálky by nebyly vidět. Největší je Ceres.'
      : k
        ? '🧊 Daleko za Neptunem je druhý pás plný ledových koulí. Bydlí tam i Pluto!'
        : '🧊 Tečky za Neptunem: Kuiperův pás ledových těles, domov Pluta. Ilustrace – jednotlivé tečky nejsou skutečná tělesa.',
    6500
  );
});
F.setKid(document.body.classList.contains('kid'));
S.bus.on('mode', (k) => F.setKid(k));
S.start();
window.S200 = { S, ui, sim, A, mob, zv, orient, uk, sk, F, obloha, povrch, misto };
