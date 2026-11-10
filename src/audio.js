// Soustava 200 – zvuky. Vše se syntetizuje ve Web Audio (žádné nahrávky): krátké efekty z tabulky receptů a smyčky prostředí.
// „Podle dat“ = napodobenina skutečných záznamů (helioseismické kmity Slunce, rádiové vzplanutí Jupiteru, chorus a hvizdy
// v magnetosféře Země, kilometrové záření Saturnu); ostatní jsou ilustrace.
import { B, par, SUN, shape, idx } from './sim.js';

// recept efektu: hlasy ['t', tvar, f0, f1, délka, hlasitost, zpoždění] nebo ['n', filtr, f0, f1, Q, délka, hlasitost, zpoždění]
const T = (w, f0, f1, d, v, dl = 0) => ['t', w, f0, f1, d, v, dl], Nz = (ft, f0, f1, q, d, v, dl = 0) => ['n', ft, f0, f1, q, d, v, dl];
const arp = (w, fs, d, v, st) => fs.map((f, k) => T(w, f, f, d, v, k * st));
export const SFX = {
  // --- rozhraní (30) ---
  click: [T('triangle', 880, 660, 0.05, 0.25)], click2: [T('triangle', 700, 520, 0.05, 0.25)], hover: [T('sine', 1400, 1400, 0.025, 0.06)], select: [T('sine', 620, 930, 0.09, 0.2)],
  toggle_on: [T('sine', 520, 780, 0.08, 0.22), T('sine', 780, 1040, 0.08, 0.16, 0.06)], toggle_off: [T('sine', 780, 520, 0.08, 0.22), T('sine', 520, 390, 0.08, 0.16, 0.06)],
  panel_open: [Nz('bandpass', 400, 2400, 2, 0.16, 0.18), T('sine', 440, 660, 0.12, 0.12)], panel_close: [Nz('bandpass', 2400, 400, 2, 0.14, 0.16), T('sine', 660, 440, 0.1, 0.1)],
  tab_next: [T('square', 440, 440, 0.04, 0.08), T('square', 660, 660, 0.05, 0.08, 0.05)], tab_prev: [T('square', 660, 660, 0.04, 0.08), T('square', 440, 440, 0.05, 0.08, 0.05)],
  key: [T('triangle', 1200, 900, 0.03, 0.12)], enter: [T('sine', 500, 1000, 0.12, 0.2)], back: [T('sine', 800, 400, 0.12, 0.18)], error: [T('sawtooth', 160, 110, 0.18, 0.14)],
  zoom_in: [T('sine', 900, 1100, 0.03, 0.05)], zoom_out: [T('sine', 700, 560, 0.03, 0.05)], search: [T('triangle', 1500, 1500, 0.02, 0.08)], home: arp('sine', [392, 523, 784], 0.14, 0.14, 0.07),
  full: [Nz('highpass', 800, 5000, 1, 0.25, 0.12)], gamma_up: [T('sine', 300, 900, 0.2, 0.14)], gamma_down: [T('sine', 900, 300, 0.2, 0.14)],
  orbit_on: [T('sine', 300, 600, 0.3, 0.14), T('sine', 450, 900, 0.3, 0.08)], orbit_all: arp('sine', [300, 450, 600, 900], 0.2, 0.09, 0.05), orbit_off: [T('sine', 600, 300, 0.25, 0.14)],
  labels_on: [T('triangle', 990, 990, 0.04, 0.14), T('triangle', 1320, 1320, 0.04, 0.12, 0.05)], labels_off: [T('triangle', 990, 660, 0.07, 0.14)],
  const_on: arp('sine', [1047, 1319, 1568, 2093, 1568], 0.22, 0.09, 0.06), const_off: arp('sine', [1568, 1047], 0.18, 0.09, 0.06), stars_on: arp('triangle', [2093, 2637, 3136], 0.12, 0.07, 0.04), stars_off: [T('triangle', 2637, 1760, 0.12, 0.08)],
  lock_on: [T('square', 220, 220, 0.05, 0.1), T('square', 330, 330, 0.08, 0.1, 0.07)], lock_off: [T('square', 330, 220, 0.1, 0.1)], sound_on: arp('sine', [523, 659, 784], 0.12, 0.16, 0.06),
  // --- režimy a Slunce (6) ---
  mode_kid: arp('triangle', [523, 659, 784, 1047, 1319], 0.14, 0.14, 0.07), mode_adult: arp('sine', [392, 494, 587], 0.22, 0.13, 0.09),
  sun_white: [T('sine', 220, 440, 0.4, 0.14), Nz('lowpass', 900, 300, 1, 0.4, 0.08)], sun_halpha: [T('sawtooth', 110, 165, 0.4, 0.08), Nz('bandpass', 500, 1500, 3, 0.4, 0.1)], sun_euv: [T('sine', 880, 1760, 0.4, 0.1), Nz('highpass', 3000, 7000, 1, 0.4, 0.07)],
  flare: [Nz('bandpass', 3000, 300, 1.5, 1.6, 0.3), Nz('highpass', 5000, 2000, 1, 0.35, 0.16), T('sawtooth', 90, 40, 1.4, 0.12)],
  // --- čas (14) ---
  pause: [T('sine', 500, 250, 0.2, 0.16)], play: [T('sine', 250, 500, 0.2, 0.16)], now: arp('sine', [660, 880, 660], 0.1, 0.14, 0.08), reverse: [Nz('bandpass', 2500, 300, 4, 0.35, 0.16), T('sawtooth', 400, 100, 0.3, 0.06)],
  ...Object.fromEntries(Array.from({ length: 10 }, (_, k) => ['rate' + (k + 1), [T('sawtooth', 60 + k * 26, 90 + k * 44, 0.25, 0.07), T('sine', 240 + k * 90, 300 + k * 130, 0.18, 0.1)]])),
  // --- let (13) ---
  launch: [Nz('bandpass', 200, 3000, 1.2, 0.9, 0.22), T('sawtooth', 60, 180, 0.8, 0.07)], warp: [Nz('bandpass', 3000, 6000, 3, 0.5, 0.1), T('sine', 300, 1500, 0.5, 0.06)], brake: [Nz('bandpass', 3000, 250, 1.2, 0.8, 0.18)], closeup: [T('sine', 700, 1050, 0.15, 0.12)],
  arrive_star: arp('sine', [220, 277, 330, 440], 0.6, 0.12, 0.1), arrive_planet: arp('sine', [262, 330, 392, 523], 0.45, 0.13, 0.09), arrive_dwarf: arp('sine', [294, 370, 440], 0.4, 0.12, 0.1), arrive_moon: arp('triangle', [523, 659, 784], 0.3, 0.12, 0.08),
  arrive_asteroid: arp('triangle', [330, 311, 415], 0.25, 0.12, 0.09), arrive_comet: arp('sine', [1319, 988, 1568, 1976], 0.35, 0.09, 0.07), arrive_tno: arp('sine', [196, 233, 294], 0.7, 0.12, 0.14), arrive_centaur: arp('triangle', [247, 330, 370], 0.4, 0.11, 0.1), arrive_interstellar: arp('sine', [415, 587, 831, 1175], 0.5, 0.1, 0.11),
  // --- hra (17) ---
  ...Object.fromEntries(['star', 'planet', 'dwarf', 'moon', 'asteroid', 'comet', 'tno', 'centaur', 'interstellar'].map((t, k) => ['stamp_' + t, [Nz('lowpass', 500, 120, 1, 0.09, 0.3), ...arp('triangle', [660 + k * 40, 880 + k * 50, 1320 + k * 60], 0.2, 0.12, 0.07).map(v => (v[6] += 0.08, v))]])),
  mission: arp('triangle', [523, 659, 784, 1047, 784, 1047, 1319], 0.22, 0.14, 0.09), rank: arp('square', [392, 523, 659, 784, 1047], 0.3, 0.07, 0.11), quiz_ok: arp('sine', [659, 988], 0.16, 0.18, 0.09), quiz_ok2: arp('sine', [659, 988, 1319], 0.16, 0.17, 0.08), quiz_ok3: arp('sine', [659, 988, 1319, 1976], 0.16, 0.16, 0.07),
  quiz_bad: [T('sawtooth', 220, 150, 0.3, 0.1), T('sawtooth', 208, 140, 0.3, 0.08)], hint: [T('sine', 1100, 1500, 0.12, 0.12), T('sine', 1500, 1100, 0.12, 0.1, 0.1)], skip: [Nz('bandpass', 800, 2500, 3, 0.2, 0.14)],
  // --- ukázka (6) ---
  tut_start: arp('triangle', [392, 523, 659, 784, 1047], 0.2, 0.13, 0.08), tut_step: [T('sine', 880, 1175, 0.1, 0.14)], tut_type: [T('square', 1800, 1800, 0.012, 0.03)], tut_cursor: [Nz('bandpass', 1200, 2400, 5, 0.18, 0.07)], tut_ping: [T('sine', 1568, 1568, 0.25, 0.16), T('sine', 2349, 2349, 0.3, 0.08, 0.03)], tut_end: arp('triangle', [1047, 784, 1047, 1319, 1568], 0.25, 0.13, 0.09),
};
// prostředí: d = bzukot [f, hlasitost, tvar], n = šum [filtr, f, Q, hlasitost, perioda kolísání s], ev = události [druh, průměrná mezera s, hlasitost]
export const AMB = {
  sun: { d: [[41, 0.16, 'sine'], [55.3, 0.12, 'sine'], [69.1, 0.09, 'sine'], [82.7, 0.06, 'sine']], n: ['lowpass', 220, 0.7, 0.2, 9], ev: ['crackle', 2.5, 0.12], real: 'helioseismické kmity (pětiminutové, zrychlené)' },
  mercury: { n: ['highpass', 2500, 0.5, 0.05, 6], ev: ['tick', 3, 0.05] }, venus: { d: [[48, 0.1, 'sawtooth']], n: ['lowpass', 320, 1, 0.3, 5] },
  earth: { d: [[110, 0.03, 'sine']], n: ['bandpass', 1800, 2, 0.02, 8], ev: ['chorus', 0.9, 0.09], real: 'chorus a hvizdy v magnetosféře' }, moon: { ev: ['tick', 5, 0.04] },
  mars: { n: ['bandpass', 600, 1.5, 0.12, 4], real: 'vítr z mikrofonu sondy (tichý, hluboký)' }, jupiter: { d: [[36, 0.14, 'sine'], [54.2, 0.08, 'sine']], n: ['bandpass', 900, 0.8, 0.07, 7], ev: ['burst', 0.7, 0.12], real: 'dekametrová rádiová vzplanutí' },
  io: { d: [[30, 0.1, 'sawtooth']], ev: ['rumble', 3, 0.2] }, europa: { n: ['highpass', 4000, 1, 0.02, 9], ev: ['crack', 2.2, 0.14] }, ganymede: { d: [[98, 0.05, 'sine'], [147.5, 0.04, 'sine']], ev: ['chorus', 3, 0.05] }, callisto: { d: [[65, 0.06, 'sine']] },
  saturn: { d: [[73, 0.07, 'sine'], [109.9, 0.05, 'sine'], [146.3, 0.04, 'triangle']], ev: ['eerie', 1.6, 0.1], real: 'kilometrové rádiové záření' }, titan: { n: ['lowpass', 420, 1.2, 0.2, 6], ev: ['drip', 1.8, 0.08] }, enceladus: { n: ['highpass', 3200, 0.8, 0.07, 3], ev: ['crack', 5, 0.07] },
  uranus: { d: [[87.3, 0.07, 'sine'], [130.8, 0.06, 'sine'], [196, 0.04, 'sine']], n: ['bandpass', 500, 2, 0.05, 11] }, neptune: { d: [[61.7, 0.08, 'sine']], n: ['bandpass', 900, 2.5, 0.16, 2.5] }, triton: { n: ['highpass', 2800, 1, 0.04, 5], ev: ['drip', 4, 0.05] },
  pluto: { d: [[49, 0.09, 'sine']], ev: ['heart', 2.4, 0.16] }, ring: { ev: ['tinkle', 0.35, 0.05] }, ice: { d: [[123, 0.04, 'sine']], ev: ['crack', 6, 0.06] },
  moon_j: { d: [[36, 0.05, 'sine']], ev: ['burst', 2.5, 0.05] }, moon_s: { d: [[73, 0.04, 'sine']], ev: ['tinkle', 1.2, 0.04] }, moon_u: { d: [[87.3, 0.04, 'sine'], [130.8, 0.03, 'sine']] }, moon_n: { n: ['bandpass', 900, 2.5, 0.05, 3] }, moon_x: { ev: ['tick', 4, 0.04] },
  rock: { ev: ['tumble', 1, 0.07] }, comet: { n: ['highpass', 3500, 0.7, 0.1, 2], ev: ['crackle', 0.8, 0.07] }, tno: { d: [[32.7, 0.1, 'sine'], [49.2, 0.05, 'sine']] }, centaur: { d: [[43.6, 0.07, 'sine']], ev: ['tumble', 2.5, 0.05] }, alien: { d: [[207.6, 0.03, 'sine'], [311.1, 0.03, 'sine'], [466.2, 0.02, 'sine']], ev: ['eerie', 2.2, 0.06] },
};
export const COUNT = Object.keys(SFX).length + Object.keys(AMB).length + 2; // + smyčka času a smyčka letu
const AMB_ID = { sun: 'sun', mercury: 'mercury', venus: 'venus', earth: 'earth', moon: 'moon', mars: 'mars', jupiter: 'jupiter', io: 'io', europa: 'europa', ganymede: 'ganymede', callisto: 'callisto', saturn: 'saturn', titan: 'titan', enceladus: 'enceladus', uranus: 'uranus', neptune: 'neptune', triton: 'triton', pluto: 'pluto' };
export const ambOf = (i) => { const b = B[i]; if (AMB_ID[b.id]) return AMB_ID[b.id]; if (b.type === 'moon') { const p = b.parent; if (p === 'saturn' && B[i].R < 60) return 'ring'; return { jupiter: 'moon_j', saturn: 'moon_s', uranus: 'moon_u', neptune: 'moon_n' }[p] || ((b.albedo || 0) > 0.4 ? 'ice' : 'moon_x'); }
  return { comet: 'comet', tno: 'tno', dwarf: 'ice', centaur: 'centaur', interstellar: 'alien' }[b.type] || 'rock'; };

export function createAudio(S) {
  const A = { on: true, vol: 0.55, ctx: null, count: COUNT }; let master, nbuf, amb = null, ambKey = '', whirr = null, wind = null, lastAlt = 0, lastT = 0;
  try { const s = JSON.parse(localStorage.getItem('s200snd') || 'null'); if (s) { A.on = s.on; A.vol = s.vol; } } catch (e) { /* nic */ }
  const save = () => { try { localStorage.setItem('s200snd', JSON.stringify({ on: A.on, vol: A.vol })); } catch (e) { /* nic */ } };
  A.unlock = () => { if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; } const C = window.AudioContext || window.webkitAudioContext; if (!C) return; try { A.ctx = new C(); } catch (e) { return; }
    master = A.ctx.createGain(); master.gain.value = A.on ? A.vol : 0; const cmp = A.ctx.createDynamicsCompressor(); master.connect(cmp); cmp.connect(A.ctx.destination);
    nbuf = A.ctx.createBuffer(1, A.ctx.sampleRate * 2, A.ctx.sampleRate); const d = nbuf.getChannelData(0); for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1; };
  const env = (g, t, v, dur) => { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + Math.min(0.012, dur * 0.3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); };
  function voice(v, out, t0, pitch = 1, gain = 1) {
    const c = A.ctx, g = c.createGain(); g.connect(out);
    if (v[0] === 't') { const o = c.createOscillator(), t = t0 + v[6]; o.type = v[1]; o.frequency.setValueAtTime(v[2] * pitch, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, v[3] * pitch), t + v[4]); env(g, t, v[5] * gain, v[4]); o.connect(g); o.start(t); o.stop(t + v[4] + 0.05); }
    else { const s = c.createBufferSource(), f = c.createBiquadFilter(), t = t0 + v[7]; s.buffer = nbuf; s.loop = true; f.type = v[1]; f.Q.value = v[4]; f.frequency.setValueAtTime(v[2] * pitch, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, v[3] * pitch), t + v[5]); env(g, t, v[6] * gain, v[5]); s.connect(f); f.connect(g); s.start(t, Math.random()); s.stop(t + v[5] + 0.05); }
  }
  A.play = (name, pitch = 1, gain = 1) => { if (!A.ctx || !A.on || !SFX[name] || A.ctx.state !== 'running') return; const t = A.ctx.currentTime + 0.005; for (const v of SFX[name]) voice(v, master, t, pitch, gain); };
  // události prostředí
  const EV = {
    crackle: (o, v) => { for (let k = 0; k < 5; k++) voice(Nz('highpass', 2500 + Math.random() * 3000, 1500, 1, 0.03, v * Math.random(), Math.random() * 0.4), o, A.ctx.currentTime); },
    tick: (o, v) => voice(T('sine', 2400, 1800, 0.03, v), o, A.ctx.currentTime), chorus: (o, v) => { const f = 900 + Math.random() * 1500, up = Math.random() < 0.75; for (let k = 0; k < 3; k++) voice(T('sine', up ? f : f * 2.2, up ? f * 1.9 : f * 0.6, up ? 0.14 : 0.9, v, k * 0.11), o, A.ctx.currentTime); },
    burst: (o, v) => { for (let k = 0; k < 9; k++) voice(Nz('bandpass', 700 + Math.random() * 1600, 400, 6, 0.05, v * (0.4 + Math.random()), k * 0.035 + Math.random() * 0.02), o, A.ctx.currentTime); },
    rumble: (o, v) => { voice(Nz('lowpass', 160, 60, 1, 1.6, v), o, A.ctx.currentTime); voice(T('sawtooth', 44, 28, 1.4, v * 0.5), o, A.ctx.currentTime); }, crack: (o, v) => { voice(Nz('highpass', 3000, 900, 1, 0.08, v), o, A.ctx.currentTime); voice(T('sine', 900 + Math.random() * 900, 200, 0.35, v * 0.5, 0.02), o, A.ctx.currentTime); },
    eerie: (o, v) => { const f = 300 + Math.random() * 500; voice(T('sine', f, f * (0.7 + Math.random() * 0.7), 1.8, v), o, A.ctx.currentTime); voice(T('sine', f * 1.5, f * 1.48, 1.8, v * 0.5, 0.1), o, A.ctx.currentTime); },
    drip: (o, v) => voice(T('sine', 500 + Math.random() * 300, 1300, 0.07, v), o, A.ctx.currentTime), heart: (o, v) => { voice(T('sine', 62, 40, 0.16, v), o, A.ctx.currentTime); voice(T('sine', 55, 36, 0.2, v * 0.8, 0.26), o, A.ctx.currentTime); },
    tinkle: (o, v) => voice(T('sine', 2200 + Math.random() * 3000, 2000, 0.25, v * Math.random()), o, A.ctx.currentTime), tumble: (o, v) => voice(Nz('bandpass', 250 + Math.random() * 200, 120, 3, 0.12, v), o, A.ctx.currentTime),
  };
  function startAmb(key) {
    const c = A.ctx, r = AMB[key], g = c.createGain(), nodes = []; g.gain.value = 0; g.connect(master);
    for (const d of r.d || []) { const o = c.createOscillator(), og = c.createGain(), l = c.createOscillator(), lg = c.createGain(); o.type = d[2]; o.frequency.value = d[0]; og.gain.value = d[1]; l.frequency.value = 0.07 + Math.random() * 0.2; lg.gain.value = d[1] * 0.5; l.connect(lg); lg.connect(og.gain); o.connect(og); og.connect(g); o.start(); l.start(); nodes.push(o, l); }
    if (r.n) { const s = c.createBufferSource(), f = c.createBiquadFilter(), ng = c.createGain(), l = c.createOscillator(), lg = c.createGain(); s.buffer = nbuf; s.loop = true; f.type = r.n[0]; f.frequency.value = r.n[1]; f.Q.value = r.n[2]; ng.gain.value = r.n[3]; l.frequency.value = 1 / r.n[4]; lg.gain.value = r.n[1] * 0.45; l.connect(lg); lg.connect(f.frequency); s.connect(f); f.connect(ng); ng.connect(g); s.start(); l.start(); nodes.push(s, l); }
    let tm = 0; if (r.ev) { const tick = () => { if (A.on && c.state === 'running' && g.gain.value > 0.05) EV[r.ev[0]](g, r.ev[2]); tm = setTimeout(tick, r.ev[1] * 1000 * (0.4 + Math.random() * 1.2)); }; tm = setTimeout(tick, 600); }
    return { g, stop() { clearTimeout(tm); g.gain.setTargetAtTime(0, c.currentTime, 0.4); setTimeout(() => { nodes.forEach(n => { try { n.stop(); } catch (e) { /* nic */ } }); g.disconnect(); }, 2500); } };
  }
  // průběžně: prostředí podle tělesa a blízkosti, svist času, šum letu
  setInterval(() => {
    if (!A.ctx || A.ctx.state !== 'running') return; const c = A.ctx, t = c.currentTime, i = S.focus, alt = S.cam.alt, near = Math.max(0, Math.min(1, 1.15 - Math.log10(1 + alt / shape[i].rmax) / 1.6)), fly = S.cam.fly && S.cam.fly.ph !== 2;
    const key = fly ? '' : ambOf(i);
    if (key !== ambKey) { if (amb) amb.stop(); amb = key ? startAmb(key) : null; ambKey = key; }
    if (amb) amb.g.gain.setTargetAtTime(near * 0.9, t, 0.5);
    if (!whirr) { const o = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(), l = c.createOscillator(), lg = c.createGain(); o.type = 'sawtooth'; o2.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 500; g.gain.value = 0; l.connect(lg); lg.connect(g.gain); o.connect(f); o2.connect(f); f.connect(g); g.connect(master); o.start(); o2.start(); l.start(); whirr = { o, o2, f, g, l, lg }; }
    const r = S.paused ? 0 : Math.abs(S.rateIdx) - 1, wv = r > 0 ? 0.012 + r * 0.0045 : 0, wf = 38 * Math.pow(1.3, r) * (S.rateIdx < 0 ? 0.84 : 1);
    whirr.o.frequency.setTargetAtTime(wf, t, 0.15); whirr.o2.frequency.setTargetAtTime(wf * 1.507, t, 0.15); whirr.f.frequency.setTargetAtTime(260 + r * 170, t, 0.2); whirr.l.frequency.setTargetAtTime(0.6 + r * 1.4, t, 0.2); whirr.lg.gain.setTargetAtTime(wv * 0.6, t, 0.2); whirr.g.gain.setTargetAtTime(wv, t, 0.2);
    if (!wind) { const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = nbuf; s.loop = true; f.type = 'bandpass'; f.Q.value = 1.4; g.gain.value = 0; s.connect(f); f.connect(g); g.connect(master); s.start(); wind = { f, g }; }
    const now = performance.now(), sp = Math.abs(Math.log(alt / (lastAlt || alt))) / Math.max(0.02, (now - lastT) / 1000); lastAlt = alt; lastT = now;
    wind.g.gain.setTargetAtTime(Math.min(0.2, sp * 0.03), t, 0.12); wind.f.frequency.setTargetAtTime(300 + Math.min(4000, sp * 500), t, 0.12);
  }, 110);
  A.setOn = (v) => { A.on = v; if (master) master.gain.setTargetAtTime(v ? A.vol : 0, A.ctx.currentTime, 0.05); save(); };
  A.setVol = (v) => { A.vol = v; if (master && A.on) master.gain.setTargetAtTime(v, A.ctx.currentTime, 0.05); save(); };
  A.note = (i) => { const r = AMB[ambOf(i)]; return r && r.real ? '🔊 Zvuk: syntéza podle skutečných měření – ' + r.real + '.' : '🔊 Zvuk: ilustrace (ve vakuu se zvuk nešíří).'; };
  return A;
}
