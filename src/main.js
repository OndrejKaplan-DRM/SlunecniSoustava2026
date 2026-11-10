import { createEngine } from './engine.js';
import { createUI } from './ui.js';
import { createAudio } from './audio.js';
import * as sim from './sim.js';
const S = createEngine(document.getElementById('gl'), document.getElementById('ov'));
const A = createAudio(S);
const ui = createUI(S, A);
S.start();
window.S200 = { S, ui, sim, A };
