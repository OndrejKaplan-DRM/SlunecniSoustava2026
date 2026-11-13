// Soustava 200 – zvuky: krátké efekty z tabulky receptů a smyčky prostředí (syntéza ve Web Audio), vybrané nahrávky CC0 a skladby ze Suno.
// „Podle dat“ = napodobenina skutečných záznamů (helioseismické kmity Slunce, rádiové vzplanutí Jupiteru, chorus a hvizdy
// v magnetosféře Země, kilometrové záření Saturnu); ostatní jsou ilustrace.
import { B, par, SUN, shape, idx, root } from '../core/sim.js';
import { AS } from '../core/asset.js';

// recept efektu: hlasy ['t', tvar, f0, f1, délka, hlasitost, zpoždění] nebo ['n', filtr, f0, f1, Q, délka, hlasitost, zpoždění]
const T = (w, f0, f1, d, v, dl = 0) => ['t', w, f0, f1, d, v, dl],
  Nz = (ft, f0, f1, q, d, v, dl = 0) => ['n', ft, f0, f1, q, d, v, dl];
const arp = (w, fs, d, v, st) => fs.map((f, k) => T(w, f, f, d, v, k * st));
export const SFX = {
  // --- rozhraní (30) ---
  click: [T('triangle', 880, 660, 0.05, 0.25)],
  click2: [T('triangle', 700, 520, 0.05, 0.25)],
  hover: [T('sine', 1400, 1400, 0.025, 0.06)],
  select: [T('sine', 620, 930, 0.09, 0.2)],

  panel_open: [Nz('bandpass', 400, 2400, 2, 0.16, 0.18), T('sine', 440, 660, 0.12, 0.12)],
  panel_close: [Nz('bandpass', 2400, 400, 2, 0.14, 0.16), T('sine', 660, 440, 0.1, 0.1)],
  tab_next: [T('square', 440, 440, 0.04, 0.08), T('square', 660, 660, 0.05, 0.08, 0.05)],
  tab_prev: [T('square', 660, 660, 0.04, 0.08), T('square', 440, 440, 0.05, 0.08, 0.05)],
  key: [T('triangle', 1200, 900, 0.03, 0.12)],
  enter: [T('sine', 500, 1000, 0.12, 0.2)],
  back: [T('sine', 800, 400, 0.12, 0.18)],
  error: [T('sawtooth', 160, 110, 0.18, 0.14)],
  zoom_in: [T('sine', 900, 1100, 0.03, 0.05)],
  zoom_out: [T('sine', 700, 560, 0.03, 0.05)],
  search: [T('triangle', 1500, 1500, 0.02, 0.08)],

  orbit_on: [T('sine', 300, 600, 0.3, 0.14), T('sine', 450, 900, 0.3, 0.08)],
  orbit_all: arp('sine', [300, 450, 600, 900], 0.2, 0.09, 0.05),
  orbit_off: [T('sine', 600, 300, 0.25, 0.14)],
  labels_on: [T('triangle', 990, 990, 0.04, 0.14), T('triangle', 1320, 1320, 0.04, 0.12, 0.05)],
  labels_off: [T('triangle', 990, 660, 0.07, 0.14)],

  // --- střídmé zvuky dospělého rozhraní (5) ---
  a_tick: [T('sine', 640, 590, 0.03, 0.085)],
  a_on: [T('sine', 500, 610, 0.06, 0.075)],
  a_off: [T('sine', 610, 480, 0.06, 0.075)],
  a_open: [Nz('bandpass', 700, 1500, 1.5, 0.09, 0.045)],
  a_close: [Nz('bandpass', 1500, 700, 1.5, 0.09, 0.045)],
  // --- režimy a Slunce (6) ---
  mode_kid: arp('triangle', [523, 659, 784, 1047, 1319], 0.14, 0.14, 0.07),
  mode_adult: arp('sine', [392, 494, 587], 0.22, 0.13, 0.09),
  sun_white: [T('sine', 220, 440, 0.4, 0.14)],
  sun_halpha: [T('sawtooth', 110, 165, 0.4, 0.08), Nz('bandpass', 500, 1200, 3, 0.4, 0.05)],
  sun_euv: [T('sine', 880, 1760, 0.4, 0.1), T('sine', 1760, 2640, 0.3, 0.04)],
  flare: [Nz('bandpass', 1800, 300, 1.5, 1.4, 0.11), T('sawtooth', 90, 40, 1.4, 0.09)],
  // --- čas (14) ---
  pause: [T('sine', 500, 250, 0.2, 0.16)],
  play: [T('sine', 250, 500, 0.2, 0.16)],
  now: arp('sine', [660, 880, 660], 0.1, 0.14, 0.08),
  reverse: [Nz('bandpass', 1800, 300, 4, 0.3, 0.07), T('sine', 400, 100, 0.3, 0.07)],
  ...Object.fromEntries(
    Array.from({ length: 10 }, (_, k) => [
      'rate' + (k + 1),
      [
        T('sawtooth', 60 + k * 26, 90 + k * 44, 0.25, 0.07 * Math.max(0.3, 1 - k * 0.09)),
        T('sine', 240 + k * 90, 300 + k * 130, 0.18, 0.1 * Math.max(0.35, 1 - k * 0.08)),
      ],
    ])
  ),
  // --- let (13) ---
  launch: [Nz('bandpass', 200, 1800, 1.2, 0.7, 0.07), T('sine', 60, 180, 0.8, 0.07)],
  warp: [Nz('bandpass', 1500, 3000, 3, 0.4, 0.04), T('sine', 300, 1500, 0.5, 0.05)],
  brake: [Nz('bandpass', 1600, 250, 1.2, 0.6, 0.06), T('sine', 240, 120, 0.5, 0.05)],
  closeup: [T('sine', 700, 1050, 0.15, 0.12)],
  arrive: [T('sine', 150, 92, 0.34, 0.085), Nz('lowpass', 520, 140, 0.7, 0.3, 0.03)],
  // --- hra (17) ---
  stamp: [Nz('lowpass', 420, 120, 1, 0.08, 0.15), T('sine', 784, 784, 0.28, 0.045, 0.05)],
  mission: arp('triangle', [523, 659, 784, 1047, 784, 1047, 1319], 0.22, 0.14, 0.09),
  rank: arp('square', [392, 523, 659, 784, 1047], 0.3, 0.07, 0.11),
  quiz_ok: arp('sine', [659, 988], 0.16, 0.18, 0.09),
  quiz_ok2: arp('sine', [659, 988, 1319], 0.16, 0.17, 0.08),
  quiz_ok3: arp('sine', [659, 988, 1319, 1976], 0.16, 0.16, 0.07),
  quiz_bad: [T('sawtooth', 220, 150, 0.3, 0.1), T('sawtooth', 208, 140, 0.3, 0.08)],
  hint: [T('sine', 1100, 1500, 0.12, 0.12), T('sine', 1500, 1100, 0.12, 0.1, 0.1)],
  skip: [Nz('bandpass', 800, 2500, 3, 0.2, 0.14)],
  // --- iterace 3 (10) ---
  pop: [Nz('bandpass', 1200, 2400, 1, 0.1, 0.08), ...arp('triangle', [1319, 1568, 2093, 2637], 0.12, 0.08, 0.035)],
  ufo: [T('sine', 600, 1200, 0.5, 0.12), T('sine', 1200, 500, 0.5, 0.12, 0.45), T('sine', 900, 905, 0.9, 0.05)],
  disco: arp('square', [262, 330, 392, 523, 659, 784, 1047, 1319], 0.12, 0.06, 0.06),
  shutter: [Nz('highpass', 3000, 800, 1, 0.07, 0.2), Nz('lowpass', 600, 200, 1, 0.1, 0.16, 0.06)],
  ruler: [T('triangle', 880, 880, 0.04, 0.14), T('triangle', 1320, 1320, 0.06, 0.12, 0.07)],
  egg: arp('sine', [784, 988, 1175, 1568, 1976], 0.18, 0.1, 0.06),
  timewarp: [
    Nz('bandpass', 300, 2500, 2, 0.8, 0.06),
    T('sine', 200, 1600, 0.9, 0.08),
    T('sine', 1600, 400, 0.5, 0.06, 0.85),
  ],
  guide: [T('sine', 988, 1319, 0.08, 0.12), T('sine', 1319, 1568, 0.1, 0.1, 0.07)],
  compare: [T('sine', 392, 392, 0.1, 0.12), T('sine', 784, 784, 0.14, 0.1, 0.08)],
  secret: arp('sawtooth', [110, 165, 220, 330, 440], 0.2, 0.05, 0.05),
  // --- ukázka (6) ---
  tut_start: arp('triangle', [392, 523, 659, 784, 1047], 0.2, 0.13, 0.08),
  tut_step: [T('sine', 880, 1175, 0.1, 0.14)],
  tut_type: [T('square', 1800, 1800, 0.012, 0.03)],
  tut_cursor: [Nz('bandpass', 1200, 2400, 5, 0.18, 0.07)],
  tut_ping: [T('sine', 1568, 1568, 0.25, 0.16), T('sine', 2349, 2349, 0.3, 0.08, 0.03)],
  tut_end: arp('triangle', [1047, 784, 1047, 1319, 1568], 0.25, 0.13, 0.09),
};
// prostředí: d = bzukot [f, hlasitost, tvar], n = šum [filtr, f, Q, hlasitost, perioda kolísání s], ev = události [druh, průměrná mezera s, hlasitost]
export const AMB = {
  sun: {
    d: [
      [41, 0.16, 'sine'],
      [55.3, 0.12, 'sine'],
      [69.1, 0.09, 'sine'],
      [82.7, 0.06, 'sine'],
    ],
    n: ['lowpass', 220, 0.7, 0.2, 9],
    ev: ['crackle', 2.5, 0.12],
    real: 'helioseismické kmity (pětiminutové, zrychlené)',
  },
  mercury: { n: ['highpass', 2500, 0.5, 0.05, 6], ev: ['tick', 3, 0.05] },
  venus: { d: [[48, 0.1, 'sawtooth']], n: ['lowpass', 320, 1, 0.3, 5] },
  earth: { n: ['lowpass', 620, 0.6, 0.2, 13], sw: 9, ev: ['nature', 6.5, 0.05] },
  moon: { ev: ['tick', 5, 0.04] },
  mars: { n: ['bandpass', 600, 1.5, 0.12, 4], real: 'vítr z mikrofonu sondy (tichý, hluboký)' },
  jupiter: {
    d: [
      [36, 0.14, 'sine'],
      [54.2, 0.08, 'sine'],
    ],
    n: ['bandpass', 900, 0.8, 0.07, 7],
    ev: ['burst', 0.7, 0.12],
    real: 'dekametrová rádiová vzplanutí',
  },
  io: { d: [[30, 0.1, 'sawtooth']], ev: ['rumble', 3, 0.2] },
  europa: { n: ['highpass', 4000, 1, 0.02, 9], ev: ['crack', 2.2, 0.14] },
  ganymede: {
    d: [
      [98, 0.05, 'sine'],
      [147.5, 0.04, 'sine'],
    ],
    ev: ['chorus', 7, 0.035],
  },
  callisto: { d: [[65, 0.06, 'sine']] },
  saturn: {
    d: [
      [73, 0.07, 'sine'],
      [109.9, 0.05, 'sine'],
      [146.3, 0.04, 'triangle'],
    ],
    ev: ['eerie', 1.6, 0.1],
    real: 'kilometrové rádiové záření',
  },
  titan: { n: ['lowpass', 420, 1.2, 0.2, 6], ev: ['drip', 1.8, 0.08] },
  enceladus: { n: ['highpass', 3200, 0.8, 0.07, 3], ev: ['crack', 5, 0.07] },
  uranus: {
    d: [
      [87.3, 0.07, 'sine'],
      [130.8, 0.06, 'sine'],
      [196, 0.04, 'sine'],
    ],
    n: ['bandpass', 500, 2, 0.05, 11],
  },
  neptune: { d: [[61.7, 0.08, 'sine']], n: ['bandpass', 900, 2.5, 0.16, 2.5] },
  triton: { n: ['highpass', 2800, 1, 0.04, 5], ev: ['drip', 4, 0.05] },
  pluto: { d: [[49, 0.09, 'sine']], ev: ['heart', 2.4, 0.16] },
  ring: { ev: ['tinkle', 0.35, 0.05] },
  ice: { d: [[123, 0.04, 'sine']], ev: ['crack', 6, 0.06] },
  moon_j: { d: [[36, 0.05, 'sine']], ev: ['burst', 2.5, 0.05] },
  moon_s: { d: [[73, 0.04, 'sine']], ev: ['tinkle', 1.2, 0.04] },
  moon_u: {
    d: [
      [87.3, 0.04, 'sine'],
      [130.8, 0.03, 'sine'],
    ],
  },
  moon_n: { n: ['bandpass', 900, 2.5, 0.05, 3] },
  moon_x: { ev: ['tick', 4, 0.04] },
  rock: { ev: ['tumble', 1, 0.07] },
  comet: { n: ['highpass', 3500, 0.7, 0.1, 2], ev: ['crackle', 0.8, 0.07] },
  tno: {
    d: [
      [32.7, 0.1, 'sine'],
      [49.2, 0.05, 'sine'],
    ],
  },
  centaur: { d: [[43.6, 0.07, 'sine']], ev: ['tumble', 2.5, 0.05] },
  alien: {
    d: [
      [207.6, 0.03, 'sine'],
      [311.1, 0.03, 'sine'],
      [466.2, 0.02, 'sine'],
    ],
    ev: ['eerie', 2.2, 0.06],
  },
};
// Záhadná tělesa mají vlastní hudební téma. root = základní tón (Hz), sc = stupnice v půltónech, step = krok (s), dens = hustota tónů,
// x = zvláštnost (gliss, two, desc, jump, chaos, metal, pulse, pair), trem = pulz (Hz), slot = skladba ze Suno, která téma nahradí.
export const MYST = {
  oumuamua: {
    slot: 'mezihvezdni',
    name: 'Návštěvník',
    root: 146.83,
    sc: [0, 2, 4, 6, 8, 10],
    step: 2.3,
    dens: 0.6,
    fm: 3.01,
    dur: 5,
    drone: [0, 6],
    trem: 0.27,
    dly: 0.9,
    fb: 0.55,
    x: 'gliss',
    why: 'celotónová stupnice bez „domova“; zvuk pulzuje, jako když se převalující se těleso co pár hodin zjasní a zase pohasne.',
  },
  borisov: {
    slot: 'mezihvezdni',
    name: 'Kometa odjinud',
    root: 185,
    sc: [0, 1, 5, 7, 8],
    step: 1.9,
    dens: 0.55,
    fm: 2,
    dur: 4,
    oct: 1,
    drone: [0, 7],
    dly: 0.75,
    fb: 0.5,
    why: 'ledové zvonky ve frygické stupnici – první kometa, která k nám přiletěla od jiné hvězdy.',
  },
  sedna: {
    slot: 'daleko',
    name: 'Jedenáct tisíc let',
    root: 55,
    sc: [0, 3, 7, 10],
    step: 5.5,
    dens: 0.5,
    dur: 9,
    att: 2.5,
    drone: [0, 7],
    lp: 900,
    dly: 1.8,
    fb: 0.6,
    why: 'hluboké, velmi pomalé tóny – jeden oběh kolem Slunce jí trvá asi 11 400 let.',
  },
  eris: {
    slot: 'daleko',
    name: 'Svár',
    root: 61.74,
    sc: [0, 1, 6, 7],
    step: 3.6,
    dens: 0.6,
    dur: 6,
    att: 1.2,
    drone: [0, 6],
    lp: 1300,
    dly: 1.3,
    fb: 0.5,
    why: 'nelibozvučné intervaly (malá sekunda a tritón) – nese jméno bohyně sváru a kvůli ní přišlo Pluto o titul planety.',
  },
  arrokoth: {
    slot: 'daleko',
    name: 'Dva v jednom',
    root: 98,
    sc: [0, 7, 12, 14],
    step: 3.2,
    dens: 0.6,
    dur: 6,
    att: 0.8,
    drone: [0],
    lp: 1600,
    dly: 1.1,
    x: 'pair',
    why: 'každý tón zní dvakrát, v čisté kvintě – dvě tělesa, která se kdysi jemně spojila v jedno.',
  },
  iapetus: {
    name: 'Dvě tváře',
    root: 110,
    sc: [0, 4, 7, 11],
    sc2: [0, 3, 7, 10],
    step: 2.2,
    dens: 0.7,
    dur: 4,
    drone: [0, 7],
    x: 'two',
    why: 'střídá se durová a mollová stupnice – jedna polokoule je světlá jako sníh, druhá tmavá jako saze.',
  },
  hyperion: {
    name: 'Chaos',
    root: 130.8,
    sc: [0, 2, 3, 7, 9],
    step: 1.1,
    dens: 0.75,
    wave: 'triangle',
    dur: 1.2,
    att: 0.005,
    drone: [0],
    dly: 0.37,
    fb: 0.4,
    x: 'chaos',
    why: 'tóny přicházejí nepravidelně – Hyperion se převaluje chaoticky, jeho den nejde předpovědět.',
  },
  miranda: {
    name: 'Slepenec',
    root: 123.5,
    sc: [0, 5, 6, 11],
    step: 2,
    dens: 0.7,
    wave: 'triangle',
    dur: 2.5,
    drone: [0, 5],
    x: 'jump',
    why: 'melodie skáče mezi vzdálenými tóny – povrch vypadá jako poslepovaný z kusů, s útesem vysokým asi 20 km.',
  },
  triton: {
    name: 'Proti proudu',
    root: 116.5,
    sc: [0, 2, 3, 7, 8],
    step: 2.4,
    dens: 0.8,
    dur: 4.5,
    att: 3.2,
    drone: [0, 7],
    dly: 1.0,
    x: 'desc',
    why: 'melodie jen klesá a každý tón se rozeznívá pozpátku – Triton obíhá Neptun proti směru jeho otáčení.',
  },
  psyche: {
    name: 'Kovový svět',
    root: 138.6,
    sc: [0, 5, 7, 12],
    step: 2.6,
    dens: 0.65,
    dur: 5,
    att: 0.004,
    drone: [0],
    dly: 0.8,
    fb: 0.5,
    x: 'metal',
    why: 'zvonivé neharmonické tóny jako úder do kovu – planetka bohatá na železo a nikl.',
  },
  apophis: {
    name: 'Blízký průlet',
    root: 73.4,
    sc: [0, 1, 3],
    step: 1.5,
    dens: 0.4,
    wave: 'triangle',
    dur: 2.5,
    drone: [0, 1],
    lp: 1100,
    x: 'pulse',
    why: 'tep a temné tóny – 13. dubna 2029 proletí blíž k Zemi než družice na geostacionární dráze.',
  },
  haumea: {
    name: 'Káča',
    root: 196,
    sc: [0, 4, 7, 9, 12],
    step: 0.34,
    dens: 0.9,
    wave: 'triangle',
    dur: 0.9,
    att: 0.005,
    drone: [0, 7],
    dly: 0.51,
    fb: 0.35,
    why: 'rychlé rozklady akordů – otočí se jednou za necelé 4 hodiny, nejrychleji z velkých těles.',
  },
  europa: {
    slot: 'ocean',
    name: 'Oceán pod ledem',
    root: 110,
    sc: [0, 2, 5, 7, 9],
    step: 2.8,
    dens: 0.6,
    dur: 6,
    att: 1.5,
    drone: [0, 7],
    lp: 700,
    dly: 1.4,
    fb: 0.6,
    why: 'tlumené tóny jako pod vodou – pod ledovou krustou je oceán slané vody.',
  },
  enceladus: {
    slot: 'ocean',
    name: 'Gejzíry',
    root: 164.8,
    sc: [0, 2, 4, 7, 9],
    step: 2.1,
    dens: 0.6,
    dur: 4,
    oct: 1,
    att: 0.6,
    drone: [0, 7],
    lp: 1500,
    dly: 1.0,
    fb: 0.55,
    why: 'vysoké, vzdušné tóny – z trhlin u jižního pólu tryská voda z podpovrchového oceánu.',
  },
  '67p': {
    name: 'Zpívající kometa',
    root: 220,
    sc: [0, 1, 2, 3, 5],
    step: 0.45,
    dens: 0.8,
    wave: 'triangle',
    dur: 0.5,
    att: 0.03,
    drone: [0],
    dly: 0.3,
    fb: 0.3,
    x: 'gliss',
    why: 'podle skutečného měření: magnetometr sondy Rosetta zachytil kmity pole kolem komety (40–50 mHz), po zrychlení znějí jako cvrlikání.',
  },
};
// skladby ze Suno (dist/music/, dvě verze na slot, střídají se). Slot hraje jako téma u „svých“ těles a jako hudba na pozadí (M) podle oblasti.
export const TRACKS = {
  mezihvezdni: ['mezihvezdni1', 'mezihvezdni2'],
  daleko: ['daleko1', 'daleko2'],
  ocean: ['ocean1', 'ocean2'],
  slunce: ['slunce1', 'slunce2'],
  kameny: ['kameny1', 'kameny2'],
  obri: ['obri1', 'obri2'],
  pas: ['pas1', 'pas2'],
  komety: ['komety1', 'komety2'],
};
export const TRACK_NAME = {
  mezihvezdni: 'Návštěvník',
  daleko: 'Na okraji',
  ocean: 'Oceán pod ledem',
  slunce: 'Hvězda',
  kameny: 'Kamenné světy',
  obri: 'Obři',
  pas: 'Pás planetek',
  komety: 'Komety',
};
const OCEAN = new Set(['europa', 'enceladus', 'ganymede', 'callisto', 'titan', 'mimas', 'dione', 'ceres']);
// tělesa, která mají skladbu „navíc“: průletáři těsně kolem Slunce a Merkur → Hvězda; komety z Oortova oblaku, které přiletí jednou za tisíce let → Návštěvník
const ROCKY = new Set(['mercury', 'venus', 'mars', 'moon']),
  GIANT = new Set(['jupiter', 'saturn', 'uranus', 'neptune']);
const HOT = new Set(['ikeya_seki', 'lovejoy', 'neat']),
  FARCOM = new Set([
    'hale_bopp',
    'hyakutake',
    'neowise',
    'mcnaught',
    'west',
    'kirch_great_comet_of_1680',
    'bennett',
    'arend_roland',
  ]);
// dospělé rozhraní: časté zvuky ovládání nahradí jedna tichá rodina (ťuknutí, zapnuto, vypnuto); null = ticho
const ADULT = {
  click: 'a_tick',
  click2: 'a_tick',
  select: 'a_tick',
  key: 'a_tick',
  enter: 'a_tick',
  tab_next: 'a_tick',
  tab_prev: 'a_tick',
  closeup: 'a_tick',
  ruler: 'a_tick',
  compare: 'a_tick',
  hint: 'a_tick',
  skip: 'a_tick',
  shutter: 'a_tick',
  now: 'a_tick',
  search: 'a_tick',
  orbit_on: 'a_on',
  orbit_all: 'a_on',
  labels_on: 'a_on',
  play: 'a_on',
  sun_white: 'a_on',
  sun_halpha: 'a_on',
  sun_euv: 'a_on',
  orbit_off: 'a_off',
  labels_off: 'a_off',
  back: 'a_off',
  pause: 'a_off',
  reverse: 'a_off',
  zoom_in: null,
  zoom_out: null,
  guide: null,
  ...Object.fromEntries(Array.from({ length: 10 }, (_, k) => ['rate' + (k + 1), 'a_tick'])),
};
// oblast pro hudbu: Slunce · světy s oceánem pod ledem · daleko za Neptunem · návštěvníci od jiných hvězd · jinde '' (hraje cokoli)
export const zoneOf = (i) => {
  const b = B[i],
    m = MYST[b.id],
    r = B[root[i]];
  if (m && m.slot) return m.slot;
  if (i === SUN || HOT.has(b.id)) return 'slunce';
  if (OCEAN.has(b.id)) return 'ocean';
  if (FARCOM.has(b.id)) return 'mezihvezdni';
  if (ROCKY.has(b.id)) return 'kameny';
  if (GIANT.has(b.id)) return 'obri';
  if (b.type === 'comet') return 'komety';
  if (b.type === 'asteroid' && b.fame >= 3) return 'pas';
  return r.type === 'interstellar'
    ? 'mezihvezdni'
    : r.type === 'tno' || (r.type === 'dwarf' && r.id !== 'ceres')
      ? 'daleko'
      : '';
};
// Nahrané zvuky (CC0, dist/zvuky/) vybrané ve zkušebně: efekt → [soubor, hlasitost, rychlost]. Dokud se soubor nenačte, hraje syntéza.
export const SMP = {
  click: ['z013', 0.5],
  click2: ['z017', 0.55],
  select: ['z016', 0.5],
  panel_open: ['z012', 0.5],
  panel_close: ['z003', 0.5],
  enter: ['z004', 0.5],
  back: ['z011', 0.45],
  error: ['z007', 0.5],
  quiz_ok: ['z005', 0.55],
  quiz_ok2: ['z005', 0.55, 1.12],
  quiz_ok3: ['z005', 0.6, 1.26],
  quiz_bad: ['z007', 0.5, 0.8],
  mission: ['z025', 0.3],
  hint: ['z002', 0.6],
  skip: ['z006', 0.5],
  closeup: ['z010', 0.5],
  tab_next: ['z019', 0.5],
  tab_prev: ['z019', 0.5, 0.85],
  shutter: ['z014', 0.5],
  disco: ['z009', 0.6],
  probe: ['z057', 0.22],
  timewarp: ['z056', 0.2],
  eerie1: ['z034', 0.3],
  eerie2: ['z035', 0.3],
  eerie3: ['z033', 0.25],
  deep: ['z036', 0.3],
};
// smyčky prostředí místo šumu: prostředí → [soubor, hlasitost]
export const AMBS = {
  sun: ['z027', 0.2],
  jupiter: ['z028', 0.16],
  saturn: ['z037', 0.13],
  uranus: ['z038', 0.11],
  neptune: ['z029', 0.1],
  comet: ['z039', 0.1],
  tno: ['z029', 0.08],
  alien: ['z038', 0.12],
  rock: ['z041', 0.07],
  centaur: ['z041', 0.06],
  ice: ['z032', 0.06],
  venus: ['z042', 0.05],
  mars: ['z043', 0.04],
  titan: ['z039', 0.07],
  moon_j: ['z028', 0.06],
  moon_s: ['z037', 0.06],
  moon_u: ['z038', 0.05],
  moon_n: ['z029', 0.05],
  pluto: ['z031', 0.08],
};
export const FLY = ['z030', 0.13];
// vlastní skladba u tělesa (hraje i s vypnutou hudbou): dětské rozhraní všude, kde je oblast; dospělé jen u hlavních těles oblasti (bez malých měsíců a „navíc“)
export const themeOf = (i, kid) => {
  const b = B[i],
    z = i === SUN ? '' : zoneOf(i);
  if (!z || (MYST[b.id] && !MYST[b.id].slot)) return '';
  if (kid) return z;
  if (z === 'pas') return b.fame >= 4 ? z : '';
  if (z === 'komety') return b.fame >= 5 ? z : '';
  return (b.type === 'moon' && !OCEAN.has(b.id)) ||
    HOT.has(b.id) ||
    FARCOM.has(b.id) ||
    ['mimas', 'dione', 'ceres'].includes(b.id)
    ? MYST[b.id]
      ? z
      : ''
    : z;
};
export const COUNT =
  new Set([...Object.values(SMP), ...Object.values(AMBS), FLY].map((v) => v[0])).size +
  Object.keys(SFX).length +
  Object.keys(AMB).length +
  4 +
  Object.keys(MYST).length; // + smyčka času a smyčka letu
const AMB_ID = {
  sun: 'sun',
  mercury: 'mercury',
  venus: 'venus',
  earth: 'earth',
  moon: 'moon',
  mars: 'mars',
  jupiter: 'jupiter',
  io: 'io',
  europa: 'europa',
  ganymede: 'ganymede',
  callisto: 'callisto',
  saturn: 'saturn',
  titan: 'titan',
  enceladus: 'enceladus',
  uranus: 'uranus',
  neptune: 'neptune',
  triton: 'triton',
  pluto: 'pluto',
};
export const ambOf = (i) => {
  const b = B[i];
  if (AMB_ID[b.id]) return AMB_ID[b.id];
  if (b.type === 'moon') {
    const p = b.parent;
    if (p === 'saturn' && B[i].R < 60) return 'ring';
    return (
      { jupiter: 'moon_j', saturn: 'moon_s', uranus: 'moon_u', neptune: 'moon_n' }[p] ||
      ((b.albedo || 0) > 0.4 ? 'ice' : 'moon_x')
    );
  }
  return { comet: 'comet', tno: 'tno', dwarf: 'ice', centaur: 'centaur', interstellar: 'alien' }[b.type] || 'rock';
};

export function createAudio(S) {
  const A = { on: true, vol: 0.55, mvol: 0.8, ctx: null, count: COUNT };
  let master,
    musBus,
    nbuf,
    amb = null,
    ambKey = '',
    whirr = null,
    wind = null,
    lastAlt = 0,
    lastT = 0,
    myst = null,
    mystKey = '',
    focT = 0,
    focI = -1;
  try {
    const s = JSON.parse(localStorage.getItem('s200snd') || 'null');
    if (s) {
      A.on = s.on;
      A.vol = s.vol;
      if (typeof s.mvol === 'number') A.mvol = s.mvol;
    }
  } catch (e) {
    /* nic */
  }
  const save = () => {
    try {
      localStorage.setItem('s200snd', JSON.stringify({ on: A.on, vol: A.vol, mvol: A.mvol }));
    } catch (e) {
      /* nic */
    }
  };
  A.unlock = () => {
    if (A.ctx) {
      if (A.ctx.state === 'suspended') A.ctx.resume();
      return;
    }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    try {
      A.ctx = new C();
    } catch (e) {
      return;
    }
    master = A.ctx.createGain();
    master.gain.value = A.on ? A.vol : 0;
    const cmp = A.ctx.createDynamicsCompressor();
    master.connect(cmp);
    cmp.connect(A.ctx.destination);
    musBus = A.ctx.createGain();
    musBus.gain.value = A.on ? A.mvol : 0;
    musBus.connect(cmp); // skladby mají vlastní hlasitost, nezávislou na zvucích
    nbuf = A.ctx.createBuffer(1, A.ctx.sampleRate * 2, A.ctx.sampleRate);
    const d = nbuf.getChannelData(0);
    for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1;
    muInit();
    setTimeout(A.preload, 300);
  };
  const env = (g, t, v, dur) => {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + Math.min(0.012, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  };
  function voice(v, out, t0, pitch = 1, gain = 1) {
    const c = A.ctx,
      g = c.createGain();
    g.connect(out);
    if (v[0] === 't') {
      const o = c.createOscillator(),
        t = t0 + v[6];
      o.type = v[1];
      o.frequency.setValueAtTime(v[2] * pitch, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(20, v[3] * pitch), t + v[4]);
      env(g, t, v[5] * gain, v[4]);
      o.connect(g);
      o.start(t);
      o.stop(t + v[4] + 0.05);
    } else {
      const s = c.createBufferSource(),
        f = c.createBiquadFilter(),
        t = t0 + v[7];
      s.buffer = nbuf;
      s.loop = true;
      f.type = v[1];
      f.Q.value = v[4];
      f.frequency.setValueAtTime(v[2] * pitch, t);
      f.frequency.exponentialRampToValueAtTime(Math.max(30, v[3] * pitch), t + v[5]);
      env(g, t, v[6] * gain, v[5]);
      s.connect(f);
      f.connect(g);
      s.start(t, Math.random());
      s.stop(t + v[5] + 0.05);
    }
  }
  // nahrané zvuky: načtení na vyžádání, jednorázové přehrání a smyčka s prolnutím konce do začátku
  const BUF = {},
    LOADING = {};
  const load = (id) =>
    BUF[id]
      ? Promise.resolve(BUF[id])
      : LOADING[id] ||
        (LOADING[id] = fetch(AS('zvuky/' + id + '.mp3'))
          .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject()))
          .then((a) => new Promise((ok, no) => A.ctx.decodeAudioData(a, ok, no)))
          .then((b) => (BUF[id] = b))
          .catch(() => {
            delete LOADING[id];
            return null;
          }));
  function smp(m, pitch, gain) {
    const b = BUF[m[0]];
    if (!b) {
      load(m[0]);
      return false;
    }
    const c = A.ctx,
      s = c.createBufferSource(),
      g = c.createGain();
    s.buffer = b;
    s.playbackRate.value = pitch * (m[2] || 1);
    g.gain.value = m[1] * gain;
    s.connect(g);
    g.connect(master);
    s.start();
    return true;
  }
  function loopS(m, out) {
    let dead = false,
      tm = 0;
    const go = () => {
      if (dead) return;
      const b = BUF[m[0]];
      if (!b) {
        load(m[0]).then((x) => {
          if (x) go();
        });
        return;
      }
      const c = A.ctx,
        s = c.createBufferSource(),
        g = c.createGain(),
        t = c.currentTime + 0.02,
        d = b.duration,
        f = Math.min(1.5, d * 0.25);
      s.buffer = b;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(m[1], t + f);
      g.gain.setValueAtTime(m[1], t + d - f);
      g.gain.linearRampToValueAtTime(0, t + d);
      s.connect(g);
      g.connect(out);
      s.start(t);
      s.stop(t + d + 0.05);
      tm = setTimeout(go, (d - f) * 1000);
    };
    go();
    return () => {
      dead = true;
      clearTimeout(tm);
    };
  }
  A.preload = () => {
    if (!A.ctx) return;
    const ids = [...new Set(Object.values(SMP).map((v) => v[0]))];
    let k = 0;
    const next = () => {
      if (k < ids.length) load(ids[k++]).then(next);
    };
    next();
    next();
    next();
  };
  A.play = (name, pitch = 1, gain = 1) => {
    if (!A.ctx || !A.on || A.ctx.state !== 'running') return;
    if (!A.kidMood && name in ADULT) {
      name = ADULT[name];
      if (!name) return;
      pitch = 1;
    }
    if (SMP[name] && smp(SMP[name], pitch, gain)) return;
    if (!SFX[name]) return;
    const t = A.ctx.currentTime + 0.005;
    for (const v of SFX[name]) voice(v, master, t, pitch, gain);
  };
  // události prostředí
  // ptáci podle Oliverovy Planetky 8 (voices.js): cvrlikání, sýkora, kos, vzácně kukačka – řídce a potichu
  const bird = (o, v) => {
    const c = A.ctx,
      t0 = c.currentTime + 0.02,
      r = Math.random(),
      pan = c.createStereoPanner ? c.createStereoPanner() : null,
      out = pan || o;
    if (pan) {
      pan.pan.value = Math.random() * 1.6 - 0.8;
      pan.connect(o);
    }
    const tn = (f0, f1, t, d, vol, vibf) => {
      const os = c.createOscillator(),
        g = c.createGain();
      os.frequency.setValueAtTime(f0, t);
      os.frequency.linearRampToValueAtTime(f1, t + d);
      if (vibf) {
        const l = c.createOscillator(),
          lg = c.createGain();
        l.frequency.value = vibf;
        lg.gain.value = f0 * 0.01;
        l.connect(lg);
        lg.connect(os.frequency);
        l.start(t);
        l.stop(t + d + 0.1);
      }
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + Math.min(0.015, d * 0.3));
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      os.connect(g);
      g.connect(out);
      os.start(t);
      os.stop(t + d + 0.05);
    };
    let t = t0;
    const rr = (a, b) => a + (b - a) * Math.random();
    if (r < 0.45) {
      const n = 2 + Math.floor(Math.random() * 4),
        base = 2600 * rr(0.7, 1.3),
        pat = Math.floor(Math.random() * 3);
      for (let k = 0; k < n; k++) {
        const f = base * (pat === 0 ? 1 + k * 0.08 : pat === 1 ? 1.2 - k * 0.06 : 1 + (k % 2) * 0.25);
        tn(f, f * rr(1.04, 1.5), t, 0.08, v * rr(0.6, 1.1));
        t += 0.11 * rr(0.7, 1.3);
      }
    } else if (r < 0.7) {
      const n = 2 + Math.floor(Math.random() * 3),
        hi = rr(4800, 5400),
        lo = hi * rr(0.66, 0.74);
      for (let k = 0; k < n; k++) {
        tn(hi, hi, t, 0.06, v * 0.7);
        t += 0.095;
        tn(lo, lo, t, 0.085, v * 0.7);
        t += 0.17;
      }
    } else if (r < 0.94) {
      const n = 5 + Math.floor(Math.random() * 4),
        sc = [1600, 1800, 2000, 2400, 2700, 3000];
      for (let k = 0; k < n; k++) {
        const f = sc[Math.floor(Math.random() * sc.length)],
          d = rr(0.1, 0.2);
        tn(f, f * rr(0.85, 1.2), t, d, v * rr(0.6, 0.9), 28);
        t += d + rr(0.02, 0.08);
      }
    } else {
      const f1 = rr(650, 700);
      for (let k = 0; k < 2; k++) {
        tn(f1 * 1.02, f1 * 0.97, t, 0.2, v * 1.2);
        t += 0.27;
        tn(f1 * 0.816, f1 * 0.776, t, 0.32, v * 1.2);
        t += 0.84;
      }
    }
  };
  const EV = {
    nature: bird,
    crackle: (o, v) => {
      for (let k = 0; k < 4; k++)
        voice(
          Nz('bandpass', 1200 + Math.random() * 1500, 900, 2, 0.03, v * 0.5 * Math.random(), Math.random() * 0.4),
          o,
          A.ctx.currentTime
        );
    },
    tick: (o, v) => voice(T('sine', 2400, 1800, 0.03, v), o, A.ctx.currentTime),
    chorus: (o, v) => {
      const f = 900 + Math.random() * 1500,
        up = Math.random() < 0.75;
      for (let k = 0; k < 3; k++)
        voice(T('sine', up ? f : f * 2.2, up ? f * 1.9 : f * 0.6, up ? 0.14 : 0.9, v, k * 0.11), o, A.ctx.currentTime);
    },
    burst: (o, v) => {
      for (let k = 0; k < 9; k++)
        voice(
          Nz(
            'bandpass',
            700 + Math.random() * 1000,
            400,
            6,
            0.05,
            v * 0.55 * (0.4 + Math.random()),
            k * 0.035 + Math.random() * 0.02
          ),
          o,
          A.ctx.currentTime
        );
    },
    rumble: (o, v) => {
      voice(Nz('lowpass', 160, 60, 1, 1.6, v), o, A.ctx.currentTime);
      voice(T('sawtooth', 44, 28, 1.4, v * 0.5), o, A.ctx.currentTime);
    },
    crack: (o, v) => {
      voice(Nz('highpass', 3000, 900, 1, 0.08, v), o, A.ctx.currentTime);
      voice(T('sine', 900 + Math.random() * 900, 200, 0.35, v * 0.5, 0.02), o, A.ctx.currentTime);
    },
    eerie: (o, v) => {
      const m = SMP['eerie' + (1 + Math.floor(Math.random() * 3))];
      if (BUF[m[0]]) {
        const c = A.ctx,
          s = c.createBufferSource(),
          g = c.createGain();
        s.buffer = BUF[m[0]];
        g.gain.value = m[1] * v * 6;
        s.connect(g);
        g.connect(o);
        s.start();
        return;
      }
      load(m[0]);
      const f = 300 + Math.random() * 500;
      voice(T('sine', f, f * (0.7 + Math.random() * 0.7), 1.8, v), o, A.ctx.currentTime);
      voice(T('sine', f * 1.5, f * 1.48, 1.8, v * 0.5, 0.1), o, A.ctx.currentTime);
    },
    drip: (o, v) => voice(T('sine', 500 + Math.random() * 300, 1300, 0.07, v), o, A.ctx.currentTime),
    heart: (o, v) => {
      voice(T('sine', 62, 40, 0.16, v), o, A.ctx.currentTime);
      voice(T('sine', 55, 36, 0.2, v * 0.8, 0.26), o, A.ctx.currentTime);
    },
    tinkle: (o, v) =>
      voice(T('sine', 2200 + Math.random() * 3000, 2000, 0.25, v * Math.random()), o, A.ctx.currentTime),
    tumble: (o, v) => voice(Nz('bandpass', 250 + Math.random() * 200, 120, 3, 0.12, v), o, A.ctx.currentTime),
  };
  function startAmb(key) {
    const c = A.ctx,
      r = AMB[key],
      g = c.createGain(),
      nodes = [];
    g.gain.value = 0;
    g.connect(master);
    for (const d of r.d || []) {
      const o = c.createOscillator(),
        og = c.createGain(),
        l = c.createOscillator(),
        lg = c.createGain();
      o.type = d[2];
      o.frequency.value = d[0];
      og.gain.value = d[1];
      l.frequency.value = 0.07 + Math.random() * 0.2;
      lg.gain.value = d[1] * 0.5;
      l.connect(lg);
      lg.connect(og.gain);
      o.connect(og);
      og.connect(g);
      o.start();
      l.start();
      nodes.push(o, l);
    }
    let stopL = null;
    if (AMBS[key]) stopL = loopS(AMBS[key], g);
    else if (r.n) {
      const s = c.createBufferSource(),
        f = c.createBiquadFilter(),
        ng = c.createGain(),
        l = c.createOscillator(),
        lg = c.createGain();
      s.buffer = nbuf;
      s.loop = true;
      f.type = r.n[0];
      f.frequency.value = r.n[1];
      f.Q.value = r.n[2];
      ng.gain.value = r.n[3] * 0.45;
      l.frequency.value = 1 / r.n[4];
      lg.gain.value = r.n[1] * 0.45;
      l.connect(lg);
      lg.connect(f.frequency);
      s.connect(f);
      f.connect(ng);
      ng.connect(g);
      s.start();
      l.start();
      nodes.push(s, l);
      if (r.sw) {
        const w = c.createOscillator(),
          wg = c.createGain(),
          w2 = c.createOscillator(),
          w2g = c.createGain();
        w.frequency.value = 1 / r.sw;
        w2.frequency.value = 1 / (r.sw * 0.37);
        wg.gain.value = ng.gain.value * 0.55;
        w2g.gain.value = ng.gain.value * 0.25;
        w.connect(wg);
        wg.connect(ng.gain);
        w2.connect(w2g);
        w2g.connect(ng.gain);
        w.start();
        w2.start();
        nodes.push(w, w2);
      }
    }
    let tm = 0;
    if (r.ev) {
      const tick = () => {
        if (A.on && c.state === 'running' && g.gain.value > 0.05) EV[r.ev[0]](g, r.ev[2]);
        tm = setTimeout(tick, r.ev[1] * 1000 * (0.4 + Math.random() * 1.2));
      };
      tm = setTimeout(tick, 600);
    }
    return {
      g,
      stop() {
        clearTimeout(tm);
        if (stopL) stopL();
        g.gain.setTargetAtTime(0, c.currentTime, 0.4);
        setTimeout(() => {
          nodes.forEach((n) => {
            try {
              n.stop();
            } catch (e) {
              /* nic */
            }
          });
          g.disconnect();
        }, 2500);
      },
    };
  }
  // průběžně: prostředí podle tělesa a blízkosti, svist času, šum letu
  setInterval(() => {
    if (!A.ctx || A.ctx.state !== 'running') return;
    const c = A.ctx,
      t = c.currentTime,
      i = S.focus,
      alt = S.cam.alt,
      near = Math.max(0, Math.min(1, 1.15 - Math.log10(1 + alt / shape[i].rmax) / 1.6)),
      fly = S.cam.fly && S.cam.fly.ph !== 2;
    const key = fly ? '' : ambOf(i);
    if (key !== ambKey) {
      if (amb) amb.stop();
      amb = key ? startAmb(key) : null;
      ambKey = key;
    }
    const nearB = !fly && near > 0.22,
      mm = nearB ? MYST[B[i].id] : null,
      th0 = nearB && !MU.bad ? themeOf(i, A.kidMood) : '',
      own = !!(mm && mm.slot),
      theme = th0 && performance.now() - focT > (own ? 5000 : A.kidMood ? 20000 : 40000) ? th0 : '',
      mk = mm && !th0 ? B[i].id : '';
    if (mk !== mystKey) {
      if (myst) myst.stop();
      myst = mk ? startMyst(mk) : null;
      mystKey = mk;
    }
    if (myst) myst.vol(near);
    // skladby: téma tělesa hraje vždy (hlasitost podle blízkosti); hudba na pozadí (M) podle oblasti, mezi skladbami pauza
    if (i !== focI) {
      focI = i;
      focT = performance.now();
    }
    const zone = zoneOf(i),
      bg = A.music && !MU.bad && !myst,
      nowm = performance.now();
    if (theme) {
      if (MU.slot !== theme && nowm > MU.gapUntil && (!MU.slot || !A.music)) muPlay(theme);
      MU.tv = (own ? 0.2 + 0.45 * near : 0.14 + 0.3 * near) * (A.kidMood ? 1 : 0.85) * 0.5;
      /* 12. 11. 2026: hudba na polovinu (Ondřej) */ MU.bgm = false;
    } else if (bg) {
      if (th0) {
        /* skladba tělesa teprve přijde: co hraje, nechat dohrát, nic nového nezačínat */
      } else if (!MU.slot) {
        if (nowm > MU.gapUntil && !fly) muPlay(zone || MU.any());
      }
      /* hrající skladbu při přeletu nestříháme; oblast se uplatní až u další */ MU.tv = A.kidMood ? 0.17 : 0.12;
      MU.bgm = true;
    } else if (MU.slot && !(fly && A.music) && !(th0 && MU.slot === th0)) muStop();
    muTick(t);
    if (amb) amb.g.gain.setTargetAtTime(near * (myst || theme ? 0.2 : MU.slot ? 0.42 : 0.6), t, 0.6);
    if (!whirr) {
      const o = c.createOscillator(),
        o2 = c.createOscillator(),
        f = c.createBiquadFilter(),
        g = c.createGain(),
        l = c.createOscillator(),
        lg = c.createGain();
      o.type = 'sawtooth';
      o2.type = 'sawtooth';
      f.type = 'lowpass';
      f.frequency.value = 500;
      g.gain.value = 0;
      l.connect(lg);
      lg.connect(g.gain);
      o.connect(f);
      o2.connect(f);
      f.connect(g);
      g.connect(master);
      o.start();
      o2.start();
      l.start();
      whirr = { o, o2, f, g, l, lg };
    }
    const r = S.paused ? 0 : Math.abs(S.rateIdx) - 1,
      wv = r > 0 ? 0.017 * Math.exp(-Math.max(0, r - 3) * 0.36) : 0,
      wf = 38 * Math.pow(1.3, Math.min(r, 4)) * Math.pow(1.1, Math.max(0, r - 4)) * (S.rateIdx < 0 ? 0.84 : 1); // od 4. stupně výš slábne a přestává stoupat
    whirr.o.frequency.setTargetAtTime(wf, t, 0.15);
    whirr.o2.frequency.setTargetAtTime(wf * 1.507, t, 0.15);
    whirr.f.frequency.setTargetAtTime(260 + Math.min(r, 4) * 150, t, 0.2);
    whirr.l.frequency.setTargetAtTime(0.6 + r * 1.4, t, 0.2);
    whirr.lg.gain.setTargetAtTime(wv * 0.6, t, 0.2);
    whirr.g.gain.setTargetAtTime(wv, t, 0.2);
    if (!wind) {
      const g = c.createGain();
      g.gain.value = 0;
      g.connect(master);
      wind = { g, stop: null };
    }
    const now = performance.now(),
      sp = Math.abs(Math.log(alt / (lastAlt || alt))) / Math.max(0.02, (now - lastT) / 1000);
    lastAlt = alt;
    lastT = now;
    const wg = fly ? Math.min(1, sp * 0.25) : 0;
    if (wg > 0.02 && !wind.stop) wind.stop = loopS(FLY, wind.g);
    if (!fly && wind.stop && wind.g.gain.value < 0.01) {
      wind.stop();
      wind.stop = null;
    }
    wind.g.gain.setTargetAtTime(wg, t, 0.35);
  }, 110);
  // skladby: dva prvky <audio> (prolínání), zdroj = blob stažený přes fetch (stejná cesta jako zvuky, žádné potíže s původem), hlasitost přes Web Audio
  const SIL =
    'data:audio/wav;base64,UklGRrQBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YZABAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA';
  const MU = {
    els: [],
    gs: [],
    cur: -1,
    slot: '',
    tv: 0,
    bgm: false,
    last: {},
    gapUntil: 0,
    bad: false,
    tok: 0,
    url: {},
    any: () => {
      const k = Object.keys(TRACKS);
      let s;
      do {
        s = k[Math.floor(Math.random() * k.length)];
      } while (s === MU.prev && k.length > 1);
      return s;
    },
  };
  function muInit() {
    if (MU.els.length) return;
    for (let k = 0; k < 2; k++) {
      const el = new Audio();
      el.preload = 'auto';
      let g = null;
      try {
        const src = A.ctx.createMediaElementSource(el);
        g = A.ctx.createGain();
        g.gain.value = 0;
        src.connect(g);
        g.connect(musBus);
      } catch (e) {
        g = null;
        el.volume = 0;
      }
      try {
        el.src = SIL;
        const p = el.play();
        if (p && p.catch) p.catch(() => {});
      } catch (e) {
        /* nic */
      }
      el.addEventListener('ended', () => {
        if (MU.cur === k && MU.slot) {
          MU.prev = MU.slot;
          MU.slot = '';
          MU.gapUntil =
            performance.now() +
            (MU.bgm
              ? A.kidMood
                ? 30000 + Math.random() * 30000
                : 60000 + Math.random() * 60000
              : 120000 + Math.random() * 120000);
        }
      });
      MU.els.push(el);
      MU.gs.push(g);
    }
  }
  const muUrl = (f) =>
    MU.url[f] ||
    (MU.url[f] = fetch(AS('music/' + f + '.mp3'))
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then((b) => URL.createObjectURL(new Blob([b], { type: 'audio/mpeg' }))));
  function muPlay(slot) {
    const list = TRACKS[slot];
    if (!list || !MU.els.length) return;
    const n = (MU.last[slot] =
        ((MU.last[slot] === undefined ? Math.floor(Math.random() * list.length) : MU.last[slot]) + 1) % list.length),
      tok = ++MU.tok,
      old = MU.cur;
    MU.slot = slot;
    A.track = slot;
    muUrl(list[n])
      .then((u) => {
        if (tok !== MU.tok) return;
        const k = old === 0 ? 1 : 0,
          el = MU.els[k];
        MU.cur = k;
        if (old >= 0) {
          const oe = MU.els[old];
          setTimeout(() => {
            if (MU.cur !== old) oe.pause();
          }, 3500);
        }
        el.src = u;
        try {
          el.currentTime = 0;
        } catch (e) {
          /* nic */
        }
        const p = el.play();
        if (p && p.catch)
          p.catch(() => {
            if (tok === MU.tok) {
              MU.slot = '';
              MU.gapUntil = performance.now() + 4000;
            }
          });
      })
      .catch(() => {
        delete MU.url[list[n]];
        if (tok === MU.tok) {
          MU.bad = true;
          MU.slot = '';
        }
      });
  }
  function muStop() {
    MU.tok++;
    MU.prev = MU.slot;
    MU.slot = '';
    A.track = '';
    const old = MU.cur;
    MU.cur = -1;
    if (old >= 0) {
      const oe = MU.els[old];
      setTimeout(() => {
        if (MU.cur !== old) oe.pause();
      }, 3500);
    }
  }
  function muTick(t) {
    for (let k = 0; k < MU.els.length; k++) {
      const v = k === MU.cur && MU.slot ? MU.tv : 0,
        g = MU.gs[k];
      if (g) g.gain.setTargetAtTime(v, t, 0.9);
      else {
        const el = MU.els[k],
          tv = v * (A.on ? A.mvol : 0);
        el.volume = Math.max(0, Math.min(1, el.volume + (tv - el.volume) * 0.1));
      }
    }
  }
  // záhadná témata: bzukot + řídká melodie ze stupnice přes ozvěnu; když je pro slot nahraná skladba (TRACKS), hraje místo syntézy ta
  function startMyst(id) {
    const c = A.ctx,
      m = MYST[id];
    const g = c.createGain(),
      bus = c.createBiquadFilter(),
      dl = c.createDelay(3),
      fb = c.createGain(),
      nodes = [],
      tms = [];
    g.gain.value = 0;
    g.connect(master);
    bus.type = 'lowpass';
    bus.frequency.value = m.lp || 2400;
    bus.connect(g);
    dl.delayTime.value = m.dly || 0.6;
    fb.gain.value = m.fb === undefined ? 0.45 : m.fb;
    bus.connect(dl);
    dl.connect(fb);
    fb.connect(dl);
    dl.connect(g);
    const tr = c.createGain();
    tr.gain.value = 1;
    tr.connect(bus);
    if (m.trem) {
      const l = c.createOscillator(),
        lg = c.createGain();
      l.frequency.value = m.trem;
      lg.gain.value = 0.45;
      tr.gain.value = 0.55;
      l.connect(lg);
      lg.connect(tr.gain);
      l.start();
      nodes.push(l);
    }
    for (const sm of m.drone || [0])
      for (const det of [-4, 5]) {
        const o = c.createOscillator(),
          og = c.createGain();
        o.type = 'sine';
        o.frequency.value = (m.root / 2) * Math.pow(2, sm / 12);
        o.detune.value = det;
        og.gain.value = 0.05;
        o.connect(og);
        og.connect(tr);
        o.start();
        nodes.push(o);
      }
    const tone = (f, t, dur, vol, att) => {
      const o = c.createOscillator(),
        og = c.createGain();
      o.type = m.wave || 'sine';
      o.frequency.value = f;
      og.gain.setValueAtTime(0.0001, t);
      og.gain.linearRampToValueAtTime(vol, t + att);
      og.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(og);
      og.connect(bus);
      if (m.fm) {
        const mo = c.createOscillator(),
          mg = c.createGain();
        mo.frequency.value = f * m.fm;
        mg.gain.setValueAtTime(f * 1.6, t);
        mg.gain.exponentialRampToValueAtTime(1, t + dur * 0.6);
        mo.connect(mg);
        mg.connect(o.frequency);
        mo.start(t);
        mo.stop(t + dur + 0.1);
      }
      if (m.x === 'gliss') o.frequency.exponentialRampToValueAtTime(f * (Math.random() < 0.5 ? 1.06 : 0.94), t + dur);
      o.start(t);
      o.stop(t + dur + 0.1);
    };
    let k = 2,
      n = 0,
      sc = m.sc;
    const step = () => {
      if (!A.on || c.state !== 'running') return;
      const t = c.currentTime + 0.05;
      n++;
      if (m.x === 'two' && n % 6 === 0) sc = sc === m.sc ? m.sc2 : m.sc; // dvě tváře: střídání dur a moll
      if (m.x === 'pulse') {
        tone(m.root / 2, t, 0.22, 0.2, 0.01);
        tone(m.root / 2, t + 0.28, 0.25, 0.14, 0.01);
      }
      if (Math.random() > m.dens) return;
      k =
        m.x === 'desc'
          ? k <= 0
            ? sc.length * 2 - 1
            : k - 1
          : m.x === 'jump'
            ? Math.floor(Math.random() * sc.length * 2)
            : Math.max(0, Math.min(sc.length * 2 - 1, k + [-1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 6)]));
      const f = m.root * Math.pow(2, (sc[k % sc.length] + 12 * Math.floor(k / sc.length) + 12 * (m.oct || 0)) / 12),
        d = m.dur || 3.5;
      tone(f, t, d, 0.09, m.att || 0.02);
      if (m.x === 'metal') {
        tone(f * 2.76, t, d * 0.6, 0.035, 0.005);
        tone(f * 5.4, t, d * 0.35, 0.02, 0.005);
      }
      if (m.x === 'pair') tone(f * 1.498, t + 0.5, d, 0.05, m.att || 0.02);
    };
    const loop = () => {
      step();
      tms[0] = setTimeout(
        loop,
        m.step * 1000 * (m.x === 'chaos' ? 0.25 + Math.random() * 1.7 : 0.9 + Math.random() * 0.2)
      );
    };
    tms[0] = setTimeout(loop, 500);
    return {
      vol(nr) {
        g.gain.setTargetAtTime(Math.min(1, nr * 1.3) * 0.8, c.currentTime, 0.9);
      },
      stop() {
        clearTimeout(tms[0]);
        g.gain.setTargetAtTime(0, c.currentTime, 0.7);
        setTimeout(() => {
          nodes.forEach((x) => {
            try {
              x.stop();
            } catch (e) {
              /* nic */
            }
          });
          g.disconnect();
        }, 5000);
      },
    };
  }
  A.music = false;
  A.kidMood = false;
  A.track = '';
  A.setMusic = (v) => {
    A.music = v;
  };
  A.mu = () => ({
    slot: MU.slot,
    cur: MU.cur,
    bad: MU.bad,
    tv: MU.tv,
    t: MU.cur >= 0 ? MU.els[MU.cur].currentTime : 0,
    paused: MU.els.map((e) => e.paused),
    gain: MU.gs.map((g) => (g ? +g.gain.value.toFixed(3) : -1)),
  });
  A.setOn = (v) => {
    A.on = v;
    if (master) {
      master.gain.setTargetAtTime(v ? A.vol : 0, A.ctx.currentTime, 0.05);
      musBus.gain.setTargetAtTime(v ? A.mvol : 0, A.ctx.currentTime, 0.05);
    }
    save();
  };
  A.setMVol = (v) => {
    A.mvol = v;
    if (musBus && A.on) musBus.gain.setTargetAtTime(v, A.ctx.currentTime, 0.05);
    save();
  };
  A.setVol = (v) => {
    A.vol = v;
    if (master && A.on) master.gain.setTargetAtTime(v, A.ctx.currentTime, 0.05);
    save();
  };
  A.note = (i) => {
    const r = AMB[ambOf(i)],
      m = MYST[B[i].id],
      th = !m && !MU.bad ? themeOf(i, A.kidMood) : '';
    if (th) return '🎵 Hudba: skladba „' + TRACK_NAME[th] + '“ (Suno).';
    if (m)
      return (
        '🎵 Záhadné téma „' +
        m.name +
        '“ (' +
        (TRACKS[m.slot] && !MU.bad ? 'skladba ze Suno' : 'syntéza') +
        '): ' +
        m.why
      );
    return i === idx.get('earth')
      ? '🔊 Zvuk: příboj a ptáci – jediné těleso, kde je co slyšet (syntéza).'
      : r && r.real
        ? '🔊 Zvuk: syntéza podle skutečných měření – ' + r.real + '.'
        : '🔊 Zvuk: ilustrace (ve vakuu se zvuk nešíří).';
  };
  return A;
}
