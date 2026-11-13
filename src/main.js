import { createEngine } from './render/engine.js';
import { createUI } from './ui/ui.js';
import { createAudio } from './audio/audio.js';
import { createExtras } from './ui/extras.js';
import * as sim from './core/sim.js';
import { createMobile } from './ui/mobile.js';
import { createZvuky } from './ui/zvuky.js';
import { createOrient } from './ui/orient.js';
const S = createEngine(document.getElementById('gl'), document.getElementById('ov'));
const A = createAudio(S);
const ui = createUI(S, A);
ui.X = createExtras(S, A, ui);
const mob = createMobile(S, A, ui);
const zv = createZvuky(A, ui);
/* zkušebna zvuků je nástroj autora: tlačítko se ukáže jen s parametrem ?zvuky v adrese */
if (new URLSearchParams(location.search).has('zvuky')) document.body.classList.add('zvuky');
const orient = createOrient(S, A, ui);
S.start();
window.S200 = { S, ui, sim, A, mob, zv, orient };
