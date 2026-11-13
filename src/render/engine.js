// Soustava 200 – vykreslování a kamera. Skutečná měřítka: 1 jednotka = 1 km, kamera je vždy v počátku (plovoucí počátek),
// polohy těles se odečítají v 64 bitech. Těleso menší než ~1 px se nekreslí jako koule, ale jako značka na 2D plátně.
import { AS } from '../core/asset.js';
import HI_IDS from '../data/hi.json';
import * as THREE from 'three';
import {
  B,
  N,
  P,
  idx,
  par,
  kids,
  root,
  SUN,
  EARTH,
  AU,
  updateAll,
  local,
  orbitSamples,
  period,
  semi,
  basis,
  spinRate,
  shape,
  jdNow,
  RING,
} from '../core/sim.js';
import * as SH from './shaders.js';
import { STAR_N, STAR_POS, STAR_MAG, STAR_TK, CON_LINES, CON_IDS, STAR_NAMES } from '../data/stardata.js';
import { CON_CZ, STAR_CZ } from '../data/connames.js';
import CAT from '../data/cat.json';

const DEG = Math.PI / 180,
  FOV = 45;
export const RATES = [1, 60, 600, 3600, 21600, 86400, 604800, 2592000, 31557600, 315576000];
export const RATE_LABEL = [
  'skutečný čas',
  '1 minuta / s',
  '10 minut / s',
  '1 hodina / s',
  '6 hodin / s',
  '1 den / s',
  '1 týden / s',
  '30 dní / s',
  '1 rok / s',
  '10 let / s',
];
const TYPE_COL = {
  planet: '#9fc2ff',
  dwarf: '#d7b9ff',
  moon: '#b9c4d6',
  asteroid: '#c9a57a',
  comet: '#8fe3ff',
  tno: '#c9a0ff',
  centaur: '#9fd6b0',
  interstellar: '#ff9f6b',
  star: '#ffd98a',
};
const hex = (c) =>
  '#' +
  c
    .map((x) =>
      Math.round(Math.min(1, Math.max(0, x)) * 255)
        .toString(16)
        .padStart(2, '0')
    )
    .join('');
function tempRGB(K) {
  const t = K / 100;
  const r = t <= 66 ? 1 : Math.min(1, 1.292936 * Math.pow(t - 60, -0.1332));
  const g =
    t <= 66
      ? Math.min(1, Math.max(0, 0.39008 * Math.log(t) - 0.63184))
      : Math.min(1, 1.129891 * Math.pow(t - 60, -0.0755));
  const b = t >= 66 ? 1 : t <= 19 ? 0 : Math.min(1, Math.max(0, 0.5432 * Math.log(t - 10) - 1.19625));
  return [r, g, b];
}
const dec64 = (s, T) => {
  const b = atob(s),
    u = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
  return new T(u.buffer);
};
const sstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function createEngine(canvas, overlay) {
  const S = {
    jd: jdNow(),
    rateIdx: 1,
    paused: false,
    focus: EARTH,
    sel: EARTH,
    hover: -1,
    orbMode: 1,
    labMode: 1,
    realBright: false,
    disco: false,
    conMode: 0,
    starNames: false,
    sunMode: 0,
    lock: false,
    gamma: 0,
    fps: 60,
    quality: 2,
    R: null,
    on: { focus() {}, select() {}, visit() {}, hud() {}, arrive() {}, flare() {}, fly() {} },
    overlays: [] /* kreslicí funkce 2D vrstvy (ctx, e) – moduly se přidávají přes push, pořadí = pořadí kreslení */,
    ticks: [] /* funkce volané jednou za snímek (dt v sekundách), před pohybem kamery – např. držené klávesy */,
    bus: {
      /* jednoduchá sběrnice událostí mezi moduly rozhraní: 'card' (karta překreslena), 'panel' (okno otevřeno/zavřeno), 'mission', 'mode' */
      h: {},
      on(ev, fn) {
        (this.h[ev] || (this.h[ev] = [])).push(fn);
      },
      emit(ev, a, b) {
        const l = this.h[ev];
        if (l) for (const fn of l) fn(a, b);
      },
    },
    items: [],
    camPos: new Float64Array(3),
  };
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    logarithmicDepthBuffer: true,
    powerPreference: 'high-performance',
  });
  let PR = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(PR);
  renderer.setClearColor(0x000000, 1);
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(FOV, 1, 1, 1e12);
  camera.matrixAutoUpdate = false;
  const ctx = overlay.getContext('2d');
  let W = 1,
    H = 1,
    F = 1;
  function resize() {
    W = canvas.clientWidth || window.innerWidth;
    H = canvas.clientHeight || window.innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    const d = Math.min(window.devicePixelRatio || 1, 2);
    overlay.width = Math.round(W * d);
    overlay.height = Math.round(H * d);
    ctx.setTransform(d, 0, 0, d, 0, 0);
    F = H / 2 / Math.tan((FOV * DEG) / 2);
    wake();
  }
  window.addEventListener('resize', resize);

  // ---------- obloha: Mléčná dráha + 7 000 hvězd (Yale BSC) ----------
  const loader = new THREE.TextureLoader();
  const loadTex = (name, cb, srgb = true) =>
    loader.load(
      AS('maps/' + name + '.webp'),
      (t) => {
        t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        t.wrapS = THREE.RepeatWrapping;
        t.anisotropy = 4;
        try {
          renderer.initTexture(t);
        } catch (e) {
          /* nahraje se při prvním kreslení */
        }
        cb(t);
        wake();
      },
      undefined,
      () => cb(null)
    );
  const ce = Math.cos(23.4392911 * DEG),
    se = Math.sin(23.4392911 * DEG);
  const s2eq = new THREE.Matrix3().set(1, 0, 0, 0, -se, -ce, 0, ce, -se); // scéna (x, y, z) → ekliptika (x, −z, y) → rovník
  const skyMat = new THREE.ShaderMaterial({
    uniforms: { tSky: { value: null }, uS2Eq: { value: s2eq }, uGain: { value: 0.9 } },
    vertexShader: SH.SKY_VS,
    fragmentShader: SH.SKY_FS,
    side: THREE.BackSide,
    depthTest: false,
    depthWrite: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), skyMat);
  sky.frustumCulled = false;
  sky.renderOrder = -30;
  sky.visible = false;
  scene.add(sky);
  loadTex('milkyway', (t) => {
    if (t) {
      skyMat.uniforms.tSky.value = t;
      sky.visible = true;
    }
  });
  let starMat;
  {
    const pos = dec64(STAR_POS, Float32Array),
      mag = dec64(STAR_MAG, Uint8Array),
      tk = dec64(STAR_TK, Uint8Array),
      Pp = new Float32Array(STAR_N * 3),
      M = new Float32Array(STAR_N),
      C = new Float32Array(STAR_N * 3);
    for (let i = 0; i < STAR_N; i++) {
      const ra = pos[i * 2] * DEG,
        de = pos[i * 2 + 1] * DEG,
        x = Math.cos(de) * Math.cos(ra),
        y = Math.cos(de) * Math.sin(ra),
        z = Math.sin(de),
        ey = ce * y + se * z,
        ez = -se * y + ce * z;
      Pp[i * 3] = x;
      Pp[i * 3 + 1] = ez;
      Pp[i * 3 + 2] = -ey;
      M[i] = mag[i] / 30 - 2;
      C.set(tempRGB(Math.exp(Math.log(2000) + (tk[i] / 255) * Math.log(20))), i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(Pp, 3));
    g.setAttribute('aMag', new THREE.BufferAttribute(M, 1));
    g.setAttribute('aCol', new THREE.BufferAttribute(C, 3));
    starMat = new THREE.ShaderMaterial({
      uniforms: { uPx: { value: PR }, uGain: { value: 1 } },
      vertexShader: SH.STAR_VS,
      fragmentShader: SH.STAR_FS,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(g, starMat);
    pts.frustumCulled = false;
    pts.renderOrder = -20;
    scene.add(pts);
  }

  const eq2s = (ra, de) => {
    const x = Math.cos(de) * Math.cos(ra),
      y = Math.cos(de) * Math.sin(ra),
      z = Math.sin(de);
    return new THREE.Vector3(x, -se * y + ce * z, -(ce * y + se * z));
  };
  const cons = [],
    starLab = [];
  let conMat,
    cstMat,
    conSeg = null,
    dipMat = [],
    conT = -1e9,
    conLv = 0,
    conPrev = 0;
  S.eq2s = (ra, de) => eq2s(ra, de);
  {
    const li = dec64(CON_LINES, Int16Array),
      LP = new Float32Array((li.length / 4) * 6),
      LT = new Float32Array((li.length / 4) * 2),
      LS = new Float32Array((li.length / 4) * 2),
      ends = new Map(),
      LD = new Float32Array((li.length / 4) * 2),
      del = {};
    let k = 0;
    for (const part of CON_IDS.split(',')) {
      const [id, cnt] = part.split(':'),
        c = new THREE.Vector3();
      for (let j = 0; j < +cnt; j++, k++) {
        const a = eq2s((li[k * 4] / 100 + 180) * DEG, (li[k * 4 + 1] / 100) * DEG),
          b = eq2s((li[k * 4 + 2] / 100 + 180) * DEG, (li[k * 4 + 3] / 100) * DEG);
        LP.set([a.x, a.y, a.z, b.x, b.y, b.z], k * 6);
        c.add(a).add(b);
        LT[k * 2 + 1] = 1;
        LS[k * 2] = LS[k * 2 + 1] = a.angleTo(b);
        ends.set(li[k * 4] + ',' + li[k * 4 + 1], a);
        ends.set(li[k * 4 + 2] + ',' + li[k * 4 + 3], b);
        if (del[id] === undefined) del[id] = Math.random();
        LD[k * 2] = LD[k * 2 + 1] = del[id];
      }
      const prev = cons.find((x) => x.id === id);
      if (prev) prev.c.add(c);
      else cons.push({ id, name: CON_CZ[id] || id, c });
    }
    cons.forEach((x) => x.c.normalize());
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(LP, 3));
    g.setAttribute('aT', new THREE.BufferAttribute(LT, 1));
    g.setAttribute('aLen', new THREE.BufferAttribute(LS, 1));
    g.setAttribute('aDel', new THREE.BufferAttribute(LD, 1));
    // jádro čáry + čtyři kopie posunuté o pixel se slabou intenzitou = jemný lem
    const cu = { uA: { value: 0.5 }, uG: { value: 99 }, uKid: { value: 0 }, uLv: { value: 0 } },
      mk = (fr) =>
        new THREE.ShaderMaterial({
          uniforms: {
            uA: cu.uA,
            uG: cu.uG,
            uKid: cu.uKid,
            uLv: cu.uLv,
            uFr: { value: fr },
            uOff: { value: new THREE.Vector2() },
            uC: { value: new THREE.Vector3(1, 1, 1) },
          },
          vertexShader: SH.CON_VS,
          fragmentShader: SH.CON_FS,
          transparent: true,
          depthTest: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
    conMat = mk(1);
    conMat.cu = cu;
    S.conLines = new THREE.Group();
    S.conLines.visible = false;
    conMat.fringe = [];
    for (let q = 0; q < 5; q++) {
      const m = q ? mk(0.13) : conMat,
        l = new THREE.LineSegments(g, m);
      l.frustumCulled = false;
      l.renderOrder = -15;
      S.conLines.add(l);
      if (q) conMat.fringe.push(m);
    }
    scene.add(S.conLines);
    conSeg = LP;
    // Velký vůz: sedm hvězd Velké medvědice, v Česku vnímaných jako samostatný obrazec – silnější, teplejší čára a vlastní jméno.
    {
      const DIP = [
          [206.885, 49.313],
          [200.981, 54.925],
          [193.507, 55.96],
          [183.857, 57.033],
          [178.458, 53.695],
          [165.46, 56.382],
          [165.932, 61.751],
          [183.857, 57.033],
        ],
        ev = [...ends.values()]; // Alkaid, Mizar, Alioth, Megrez, Phecda, Merak, Dubhe, Megrez (RA, Dec J2000)
      const pt = DIP.map(([ra, de]) => {
        const v = eq2s(ra * DEG, de * DEG);
        let b = v,
          bd = Math.cos(0.6 * DEG);
        for (const e of ev) {
          const d = e.dot(v);
          if (d > bd) {
            bd = d;
            b = e;
          }
        }
        return b;
      }); // přichytit na konce stávajících čar
      const n = pt.length - 1,
        P = new Float32Array(n * 6),
        T = new Float32Array(n * 2),
        L = new Float32Array(n * 2),
        D = new Float32Array(n * 2),
        c = new THREE.Vector3();
      for (let j = 0; j < n; j++) {
        P.set([pt[j].x, pt[j].y, pt[j].z, pt[j + 1].x, pt[j + 1].y, pt[j + 1].z], j * 6);
        T[j * 2 + 1] = 1;
        L[j * 2] = L[j * 2 + 1] = pt[j].angleTo(pt[j + 1]);
        D[j * 2] = D[j * 2 + 1] = 0.2;
        c.add(pt[j]);
      }
      const dg = new THREE.BufferGeometry();
      dg.setAttribute('position', new THREE.BufferAttribute(P, 3));
      dg.setAttribute('aT', new THREE.BufferAttribute(T, 1));
      dg.setAttribute('aLen', new THREE.BufferAttribute(L, 1));
      dg.setAttribute('aDel', new THREE.BufferAttribute(D, 1));
      S.conDip = new THREE.Group();
      S.conDip.visible = false;
      dipMat = [];
      for (let q = 0; q < 5; q++) {
        const m = mk(q ? 0.42 : 0.9),
          l = new THREE.LineSegments(dg, m);
        l.frustumCulled = false;
        l.renderOrder = -14.5;
        S.conDip.add(l);
        dipMat.push(m);
      }
      scene.add(S.conDip);
      cons.push({ id: 'dip', name: 'Velký vůz', c: c.normalize(), dip: true });
    }
    const sp = dec64(STAR_POS, Float32Array),
      seen = new Set();
    // hvězdy na koncích čar: dohledat v katalogu (nejjasnější do 0,3°), aby zář seděla přesně na hvězdě a měla její jas a barvu
    {
      const smag = dec64(STAR_MAG, Uint8Array),
        stk = dec64(STAR_TK, Uint8Array),
        SV = new Float32Array(STAR_N * 3),
        ev = [...ends.values()],
        n = ev.length,
        EP = new Float32Array(n * 3),
        EM = new Float32Array(n),
        EC = new Float32Array(n * 3),
        lim = Math.cos(0.3 * DEG);
      for (let i = 0; i < STAR_N; i++) {
        const v = eq2s(sp[i * 2] * DEG, sp[i * 2 + 1] * DEG);
        SV[i * 3] = v.x;
        SV[i * 3 + 1] = v.y;
        SV[i * 3 + 2] = v.z;
      }
      let hit = 0;
      for (let j = 0; j < n; j++) {
        const v = ev[j];
        let best = -1,
          bm = 99;
        for (let i = 0; i < STAR_N; i++) {
          if (SV[i * 3] * v.x + SV[i * 3 + 1] * v.y + SV[i * 3 + 2] * v.z < lim) continue;
          const m = smag[i] / 30 - 2;
          if (m < bm) {
            bm = m;
            best = i;
          }
        }
        if (best >= 0) {
          hit++;
          EP[j * 3] = SV[best * 3];
          EP[j * 3 + 1] = SV[best * 3 + 1];
          EP[j * 3 + 2] = SV[best * 3 + 2];
          EM[j] = bm;
          EC.set(tempRGB(Math.exp(Math.log(2000) + (stk[best] / 255) * Math.log(20))), j * 3);
        } else {
          EP[j * 3] = v.x;
          EP[j * 3 + 1] = v.y;
          EP[j * 3 + 2] = v.z;
          EM[j] = 4.8;
          EC.set([0.85, 0.9, 1], j * 3);
        }
      }
      const sg = new THREE.BufferGeometry();
      sg.setAttribute('position', new THREE.BufferAttribute(EP, 3));
      sg.setAttribute('aMag', new THREE.BufferAttribute(EM, 1));
      sg.setAttribute('aCol', new THREE.BufferAttribute(EC, 3));
      cstMat = new THREE.ShaderMaterial({
        uniforms: { uPx: { value: PR }, uS: { value: 0 }, uKid: cu.uKid },
        vertexShader: SH.CST_VS,
        fragmentShader: SH.CST_FS,
        transparent: true,
        depthTest: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      S.conStars = new THREE.Points(sg, cstMat);
      S.conStars.frustumCulled = false;
      S.conStars.renderOrder = -14;
      S.conStars.visible = false;
      scene.add(S.conStars);
      S.conStat = { ends: n, hit };
    }
    for (const [i, n] of STAR_NAMES) {
      if (i > 60 || seen.has(n)) continue;
      seen.add(n);
      starLab.push({ name: STAR_CZ[n] || n, c: eq2s(sp[i * 2] * DEG, sp[i * 2 + 1] * DEG) });
    }
  }
  // ---------- tělesa ----------
  const GEO = [
    new THREE.SphereGeometry(1, 32, 16),
    new THREE.SphereGeometry(1, 96, 48),
    new THREE.SphereGeometry(1, 256, 128),
  ];
  const QUAD = new THREE.PlaneGeometry(2, 2),
    RIBBON = new THREE.PlaneGeometry(1, 1, 1, 32);
  RIBBON.translate(0, 0.5, 0);
  const blank = new THREE.DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1);
  blank.needsUpdate = true;
  const ringTex = (fn) => {
    const d = new Uint8Array(256 * 4);
    for (let k = 0; k < 256; k++) {
      const c = fn(k / 255);
      d.set(c, k * 4);
    }
    const t = new THREE.DataTexture(d, 256, 1);
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = t.minFilter = THREE.LinearFilter;
    t.needsUpdate = true;
    return t;
  };
  const band = (x, c, w) => Math.exp(-(((x - c) / w) ** 2));
  const RINGS = {
    saturn: {
      io: [74510, 140390],
      op: 1,
      tex: ringTex((x) => {
        const k = Math.round(x * 255) * 4;
        return [RING[k], RING[k + 1], RING[k + 2], RING[k + 3]];
      }),
    },
    jupiter: {
      io: [92000, 226000],
      op: 1,
      tex: ringTex((x) => [150, 120, 95, 10 + 34 * band(x, 0.26, 0.02) + 10 * (x < 0.27 ? 1 : 0.4)]),
    },
    uranus: {
      io: [38000, 51500],
      op: 1,
      tex: ringTex((x) => [
        150,
        160,
        170,
        4 +
          190 * band(x, 0.975, 0.012) +
          70 *
            (band(x, 0.29, 0.006) +
              band(x, 0.33, 0.006) +
              band(x, 0.5, 0.006) +
              band(x, 0.58, 0.006) +
              band(x, 0.69, 0.006) +
              band(x, 0.76, 0.006)),
      ]),
    },
    neptune: {
      io: [41900, 63500],
      op: 1,
      tex: ringTex((x) => [
        140,
        140,
        160,
        6 + 120 * band(x, 0.97, 0.012) + 60 * band(x, 0.52, 0.012) + 25 * band(x, 0.0, 0.03),
      ]),
    },
    chariklo: {
      io: [385, 410],
      op: 1,
      tex: ringTex((x) => [190, 190, 190, 200 * band(x, 0.24, 0.1) + 110 * band(x, 0.8, 0.06)]),
    },
    haumea: { io: [2250, 2330], op: 1, tex: ringTex((x) => [170, 170, 170, 150 * band(x, 0.5, 0.3)]) },
  };
  const ATM = {
    earth: [0.025, 1.0, [0.3, 0.55, 1.0]],
    venus: [0.02, 0.6, [1.0, 0.9, 0.65]],
    mars: [0.015, 0.3, [0.9, 0.62, 0.45]],
    titan: [0.09, 0.75, [0.95, 0.62, 0.25]],
    pluto: [0.04, 0.22, [0.35, 0.5, 0.9]],
    triton: [0.02, 0.08, [0.6, 0.7, 0.9]],
  };
  const RIMC = {
    jupiter: [0.9, 0.8, 0.65],
    saturn: [0.95, 0.87, 0.65],
    uranus: [0.6, 0.9, 0.95],
    neptune: [0.35, 0.5, 1.0],
  };
  const RIM = {
    venus: 0.3,
    mars: 0.22,
    titan: 0.35,
    jupiter: 0.14,
    saturn: 0.14,
    uranus: 0.22,
    neptune: 0.25,
    pluto: 0.06,
  };
  /* sklon magnetického dipólu k ose rotace ve stupních (Země 9,4; Jupiter 9,6; Saturn < 1; Uran 59; Neptun 47) */
  const MAGTILT = { earth: 9.4, jupiter: 9.6, saturn: 0, uranus: 59, neptune: 47 };
  const magPole = (deg) => {
    const t = deg * DEG,
      az = -1.87; /* směr náklonu v souřadnicích tělesa – stejný jako dřív u Země */
    return new THREE.Vector3(Math.sin(t) * Math.cos(az), Math.sin(t) * Math.sin(az), Math.cos(t));
  };
  const AUR = {
    earth: [
      [0.55, 0.36, 0.035, 0],
      [0.25, 1.0, 0.45],
    ],
    jupiter: [
      [0.5, 0.26, 0.035, 3],
      [0.55, 0.45, 1.0],
    ],
    saturn: [
      [0.3, 0.24, 0.03, 5],
      [0.6, 0.5, 1.0],
    ],
    uranus: [
      [0.2, 0.5, 0.06, 7],
      [0.5, 0.8, 1.0],
    ],
  };
  // výtrysky: gejzíry Enceladu u jižního pólu, sopečné chocholy Io (Pele, Loki) – směr v soustavě tělesa, délka a šířky v poloměrech
  const PLUME = {
    enceladus: [
      [[0, 0, -1], 2.2, 0.08, 0.9, [0.75, 0.88, 1.0], 0.5],
      [[0.12, 0.05, -0.99], 1.6, 0.06, 0.6, [0.75, 0.88, 1.0], 0.35],
    ],
    io: [
      [[-0.24, 0.92, -0.32], 0.22, 0.03, 0.3, [0.95, 0.9, 0.7], 0.5],
      [[0.61, 0.76, 0.22], 0.14, 0.03, 0.22, [0.8, 0.9, 1.0], 0.4],
    ],
  };
  const kindOf = (b) =>
    b.id === 'earth'
      ? 4
      : (b.atm && b.atm.gas) || b.id === 'venus' || b.id === 'titan'
        ? 2
        : b.type === 'comet'
          ? 3
          : b.type === 'tno' || (b.type === 'dwarf' && b.id !== 'ceres') || (b.type === 'moon' && (b.albedo || 0) > 0.3)
            ? 1
            : 0;
  const occOf = B.map((b, i) => {
    const o = [];
    if (par[i] >= 0 && par[i] !== SUN) o.push(par[i]);
    const ks = [...kids[i]].sort((x, y) => B[y].R - B[x].R);
    for (const k of ks) {
      if (o.length >= 4) break;
      if (i === SUN) break;
      o.push(k);
    }
    return o;
  });
  const R = B.map(() => ({
    mesh: null,
    tex: 0,
    used: 0,
    pr: 0,
    dist: 1,
    z: 0,
    sx: 0,
    sy: 0,
    orbit: null,
    rel: new THREE.Vector3(),
  }));
  S.R = R;
  const gamU = { fill: { value: 0 }, gam: { value: 1 } };
  let texCount = 0;
  const m9 = new Array(9);

  function makeBody(i) {
    const b = B[i],
      sp = shape[i],
      r = R[i],
      isSun = i === SUN,
      col = b.col || b.color || [0.6, 0.6, 0.6];
    const U = {
      tMap: { value: blank },
      tHi: { value: blank },
      uHi: { value: 0 },
      tAux: { value: blank },
      tRing: { value: blank },
      uHasMap: { value: 0 },
      uHasAux: { value: 0 },
      uKind: { value: kindOf(b) },
      uDet: { value: 0 },
      uSeed: { value: sp.seed * 7 },
      uFill: gamU.fill,
      uGam: gamU.gam,
      uAtmK: { value: RIM[b.id] || 0 },
      uSunR: { value: 0.005 },
      uRad: { value: b.R },
      uTime: { value: 0 },
      uCol: { value: new THREE.Vector3(...col) },
      uSun: { value: new THREE.Vector3(1, 0, 0) },
      uAtmCol: { value: new THREE.Vector3(...((ATM[b.id] && ATM[b.id][2]) || RIMC[b.id] || [1, 1, 1])) },
      uPole: { value: new THREE.Vector3(0, 1, 0) },
      uCtr: { value: r.rel },
      uRingSh: { value: new THREE.Vector3(0, 1, 0) },
      uRot: { value: new THREE.Matrix3() },
      uOcc: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] },
      uAur: { value: new THREE.Vector4(...(AUR[b.id] ? AUR[b.id][0] : [0, 0.3, 0.05, 0])) },
      uAurC: { value: new THREE.Vector3(...(AUR[b.id] ? AUR[b.id][1] : [0, 0, 0])) },
      uAurP: { value: magPole(MAGTILT[b.id] || 0) },
      uExp: { value: 1 },
      uAbc: { value: new THREE.Vector3(...sp.a) },
      uShp: { value: new THREE.Vector3(sp.lump, sp.neck, sp.seed) },
      uMode: { value: S.sunMode },
      uFlare: { value: new THREE.Vector4(1, 0, 0, 0) },
      uQ: { value: 2 },
      uCor: { value: 0 },
      uAR: { value: isSun ? Array.from({ length: 16 }, (_, k) => AR[k] || new THREE.Vector3(0, 0, 1)) : [] },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: U,
      vertexShader: SH.BODY_VS,
      fragmentShader: isSun ? SH.SUN_FS : SH.BODY_FS,
    });
    const mesh = new THREE.Mesh(GEO[1], mat);
    mesh.matrixAutoUpdate = false;
    mesh.frustumCulled = false;
    scene.add(mesh);
    r.mesh = mesh;
    r.U = U;
    if (isSun) makeLoops(mesh);
    const rg = RINGS[b.id];
    if (rg) {
      const g = new THREE.RingGeometry(rg.io[0] / b.R, rg.io[1] / b.R, 160, 1);
      const rm = new THREE.ShaderMaterial({
        uniforms: {
          tRing: { value: rg.tex },
          uSun: U.uSun,
          uPole: U.uPole,
          uCtr: U.uCtr,
          uIO: { value: new THREE.Vector3(rg.io[0] / b.R, rg.io[1] / b.R, rg.op) },
          uRad: U.uRad,
          uSunR: U.uSunR,
          uFill: gamU.fill,
          uGam: gamU.gam,
          uFlat: { value: 1 - (b.flat || 0) },
        },
        vertexShader: SH.RING_VS,
        fragmentShader: SH.RING_FS,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(g, rm);
      ring.frustumCulled = false;
      mesh.add(ring);
      U.tRing.value = rg.tex;
      U.uRingSh.value.set(rg.io[0] / b.R, rg.io[1] / b.R, b.id === 'saturn' ? 1 : 0.5);
    }
    const at = ATM[b.id];
    if (at) {
      const am = new THREE.ShaderMaterial({
        uniforms: {
          uCtr: U.uCtr,
          uSun: U.uSun,
          uC: { value: new THREE.Vector3(...at[2]) },
          uRad: U.uRad,
          uH: { value: at[0] },
          uK: { value: at[1] },
          uFill: gamU.fill,
        },
        vertexShader: SH.ATM_VS,
        fragmentShader: SH.ATM_FS,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const a = new THREE.Mesh(GEO[1], am);
      a.scale.setScalar(1 + at[0]);
      a.frustumCulled = false;
      mesh.add(a);
    }
    if (isSun || b.type === 'comet' || b.coma) {
      const gm = new THREE.ShaderMaterial({
        uniforms: {
          uS: { value: 1 },
          uC: { value: new THREE.Vector3(...(isSun ? [1, 0.74, 0.42] : [0.7, 0.92, 1])) },
          uI: { value: 1 },
          uCore: { value: 0.1 },
          uRay: { value: isSun ? 1 : 0 },
          uCor: { value: 0 },
          uCR: { value: 0.06 },
          uAx: { value: new THREE.Vector2(0, 1) },
          uSt: { value: Array.from({ length: 8 }, () => new THREE.Vector4()) },
        },
        vertexShader: SH.GLOW_VS,
        fragmentShader: SH.GLOW_FS,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      r.glow = new THREE.Mesh(QUAD, gm);
      r.glow.frustumCulled = false;
      r.glow.matrixAutoUpdate = false;
      scene.add(r.glow);
    }
    if (PLUME[b.id])
      r.plumes = PLUME[b.id].map((q) => {
        const tm = new THREE.ShaderMaterial({
          uniforms: {
            uN: { value: new THREE.Vector3() },
            uA: { value: new THREE.Vector3() },
            uB: { value: new THREE.Vector3(0, 1, 0) },
            uL: { value: q[1] * b.R },
            uW0: { value: q[2] * b.R },
            uW1: { value: q[3] * b.R },
            uCurv: { value: 0 },
            uC: { value: new THREE.Vector3(...q[4]) },
            uI: { value: q[5] },
            uFall: { value: 1.6 },
          },
          vertexShader: SH.TAIL_VS,
          fragmentShader: SH.TAIL_FS,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
        });
        const m = new THREE.Mesh(RIBBON, tm);
        m.frustumCulled = false;
        m.visible = false;
        scene.add(m);
        m.userData.d = q[0];
        return m;
      });
    if (b.type === 'comet' || b.coma) {
      r.tails = [
        [0.45, 0.68, 1],
        [1, 0.9, 0.72],
      ].map((c) => {
        const tm = new THREE.ShaderMaterial({
          uniforms: {
            uN: { value: r.rel },
            uA: { value: new THREE.Vector3() },
            uB: { value: new THREE.Vector3() },
            uL: { value: 1 },
            uW0: { value: 1 },
            uW1: { value: 1 },
            uCurv: { value: 0 },
            uC: { value: new THREE.Vector3(...c) },
            uI: { value: 0 },
            uFall: { value: 1.5 },
          },
          vertexShader: SH.TAIL_VS,
          fragmentShader: SH.TAIL_FS,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
        });
        const m = new THREE.Mesh(RIBBON, tm);
        m.frustumCulled = false;
        scene.add(m);
        return m;
      });
    }
  }
  // magnetické smyčky a protuberance nad aktivními oblastmi (poloha z jasných míst mapy EUV)
  const AR = (CAT.sunAR || []).map((a) => {
    const lo = a[0] * DEG,
      la = a[1] * DEG;
    return new THREE.Vector3(Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la));
  });
  /* koronograf: přilbové paprsky v soustavě Slunce [šířka °, délka °, šířka rad, síla] – ilustrace, rozložení jako kolem maxima cyklu */
  const STREAM = [
    [8, 20, 0.3, 1],
    [-14, 200, 0.28, 1],
    [38, 110, 0.22, 0.8],
    [-42, 290, 0.24, 0.8],
    [-5, 115, 0.2, 0.6],
    [24, 300, 0.2, 0.7],
    [57, 240, 0.17, 0.5],
    [-60, 60, 0.17, 0.5],
  ].map((a) => {
    const lo = a[1] * DEG,
      la = a[0] * DEG;
    return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la), a[2], a[3]];
  });
  let loops = null;
  function makeLoops(mesh) {
    const U = R[SUN].U;
    const m = new THREE.ShaderMaterial({
      uniforms: {
        uCtr: U.uCtr,
        uRad: U.uRad,
        uRot: U.uRot,
        uTime: U.uTime,
        uMode: U.uMode,
        uFlare: U.uFlare,
        uAR: U.uAR,
        uI: { value: 0 },
        uErupt: { value: 0 },
      },
      vertexShader: SH.PROM_VS,
      fragmentShader: SH.PROM_FS,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    loops = new THREE.Mesh(GEO[0], m);
    loops.scale.setScalar(1.8);
    loops.frustumCulled = false;
    mesh.add(loops);
  }
  let flare = { t: -1, next: 4, k: 0 };
  S.flareNow = (k) => {
    flare.next = 0;
    flare.force = k;
  };
  S.setSunMode = (m) => {
    S.sunMode = m;
    wake();
  };
  function needTex(i) {
    const r = R[i];
    if (r.tex !== 0) return;
    r.tex = 1;
    loadTex(B[i].id, (t) => {
      if (!t) {
        r.tex = -1;
        return;
      }
      r.tex = 2;
      texCount++;
      r.U.tMap.value = t;
      r.U.uHasMap.value = 0.001;
      r.mw = t.image.width || 512;
    });
    if (i === EARTH)
      loadTex(
        'earth_aux',
        (t) => {
          if (t) {
            r.U.tAux.value = t;
            r.U.uHasAux.value = 1;
          }
        },
        false
      );
  }
  // Velké mapy (maps/hi/<id>.webp, seznam src/hi.json): stahují se až zblízka po příletu, dekódují se mimo hlavní vlákno (createImageBitmap)
  // a prolnou se přes malou mapu. V paměti nejvýš HI_MAX; na telefonu a tabletu a při snížené kvalitě (S.quality 0) se nenačítají.
  const HI_ZOOM = new Set(['venus']),
    HI = new Set(HI_IDS),
    HI_MAX = 2,
    hiLog = [];
  let hiBusy = false;
  S.hiLog = hiLog;
  S.hiOff = false;
  const hiCan = () =>
    !S.hiOff &&
    S.quality > 0 &&
    typeof createImageBitmap === 'function' &&
    renderer.capabilities.maxTextureSize >= 4096 &&
    !/\b(mob|tab)\b/.test(document.body.className);
  function dropHi(i) {
    const r = R[i];
    if (r.hi !== 2) return;
    const t = r.U.tHi.value;
    r.U.tHi.value = blank;
    r.U.uHi.value = 0;
    r.hi = 0;
    t.dispose();
    if (t.image && t.image.close) t.image.close();
  }
  function needHi(i) {
    const r = R[i],
      id = B[i].id;
    if (r.hi || hiBusy || !HI.has(id) || !hiCan()) return;
    const url = 'maps/hi/' + id + '.webp';
    if (typeof window !== 'undefined' && window.S200_ASSETS && !window.S200_ASSETS[url]) {
      r.hi = -1;
      return;
    } // soubor na flashku bez velkých map
    r.hi = 1;
    hiBusy = true;
    const t0 = performance.now();
    let t1 = 0;
    fetch(AS(url))
      .then((q) => {
        if (!q.ok) throw new Error('http');
        return q.blob();
      })
      .then((bl) => {
        t1 = performance.now();
        return createImageBitmap(bl, {
          imageOrientation: 'flipY',
          premultiplyAlpha: 'none',
          colorSpaceConversion: 'none',
        });
      })
      .then((bm) => {
        hiBusy = false;
        const t2 = performance.now();
        if (r.tex !== 2 || !hiCan()) {
          bm.close();
          r.hi = 0;
          return;
        }
        const t = new THREE.Texture(bm);
        t.flipY = false;
        t.colorSpace = THREE.SRGBColorSpace;
        t.wrapS = THREE.RepeatWrapping;
        t.anisotropy = 4;
        t.needsUpdate = true;
        try {
          renderer.initTexture(t);
        } catch (e) {
          /* nahraje se při prvním kreslení */
        }
        r.U.tHi.value = t;
        r.U.uHi.value = 0.001;
        r.hi = 2;
        r.hw = bm.width;
        hiLog.push({
          id,
          load: Math.round(t1 - t0),
          decode: Math.round(t2 - t1),
          upload: Math.round(performance.now() - t2),
          w: bm.width,
        });
        const live = [];
        for (let j = 0; j < N; j++) if (R[j].hi === 2 && j !== i && j !== S.focus) live.push(j);
        live.sort((a, b) => R[a].used - R[b].used);
        while (live.length > HI_MAX - 1) dropHi(live.shift());
        wake();
      })
      .catch(() => {
        hiBusy = false;
        r.hi = -1;
      });
  }
  function dropTex(now) {
    if (texCount <= 18) return;
    for (let i = 0; i < N; i++) {
      const r = R[i];
      if (r.tex === 2 && now - r.used > 20000 && i !== S.focus) {
        dropHi(i);
        r.U.tMap.value.dispose();
        r.U.tMap.value = blank;
        r.U.uHasMap.value = 0;
        r.tex = 0;
        texCount--;
      }
    }
  }

  // ---------- dráhy ----------
  const ORB_N = 320;
  let orbBudget = 0;
  const o64 = new Float64Array((ORB_N + 1) * 3);
  function orbitLine(i) {
    const r = R[i];
    if (r.orbit) return r.orbit;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((ORB_N + 1) * 3), 3));
    const b = B[i],
      c = new THREE.Color(
        b.type === 'planet' && b.col ? hex(b.col.map((x) => 0.35 + x * 0.75)) : TYPE_COL[b.type] || '#888'
      );
    const line = new THREE.Line(
      g,
      new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: 0.5, depthWrite: false })
    );
    line.frustumCulled = false;
    line.matrixAutoUpdate = false;
    line.renderOrder = -5;
    scene.add(line);
    return (r.orbit = { line, built: -1e99, base: c.getHex() });
  }
  function buildOrbit(i) {
    const o = orbitLine(i);
    orbitSamples(i, S.jd, ORB_N, o64);
    o.line.geometry.attributes.position.array.set(o64);
    o.line.geometry.attributes.position.needsUpdate = true;
    o.built = S.jd;
  }

  // ---------- kamera ----------
  const cam = { yaw: 0.6, pitch: 0.25, alt: 30000, altT: 30000, ly: 0, lp: 0, fly: null };
  const fwd = new THREE.Vector3(),
    right = new THREE.Vector3(),
    up = new THREE.Vector3(),
    dv = new THREE.Vector3(),
    tmp = new THREE.Vector3(),
    tmp2 = new THREE.Vector3(),
    Y = new THREE.Vector3(0, 1, 0),
    mm = new THREE.Matrix4();
  const minAlt = (i) => Math.max(shape[i].rmax * 0.015, 1e-4),
    arriveAlt = (i) => shape[i].rmax * (RINGS[B[i].id] && B[i].id === 'saturn' ? 6.5 : i === SUN ? 4 : 3.4);
  const dirOf = (yaw, pitch, out) =>
    out.set(Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), Math.cos(pitch) * Math.sin(yaw));
  let lastInput = performance.now();
  const wake = () => {
    lastInput = performance.now();
  };
  function sunSide(i) {
    if (i === SUN) return [cam.yaw, 0.3];
    const x = -P[i * 3],
      y = -P[i * 3 + 1],
      z = -P[i * 3 + 2],
      l = Math.hypot(x, y, z);
    return [Math.atan2(z, x) + 0.65, Math.asin(y / l) * 0.5 + 0.18];
  }
  S.flyTo = (j, opts = {}) => {
    if (j < 0 || j >= N) return;
    wake();
    S.sel = j;
    S.on.select(j);
    if (j === S.focus && !cam.fly) {
      cam.altT = opts.alt || arriveAlt(j);
      cam.fly = { ph: 2, t: 0, ly: cam.ly, lp: cam.lp };
      return;
    }
    const i = S.focus,
      D = Math.hypot(P[j * 3] - P[i * 3], P[j * 3 + 1] - P[i * 3 + 1], P[j * 3 + 2] - P[i * 3 + 2]);
    S.on.fly(j);
    if (!R[j].mesh) makeBody(j);
    needTex(j); // mapu cíle načíst už během letu, ať po příletu nic neproblikne
    cam.fly = {
      ph: 0,
      t: 0,
      to: j,
      alt0: cam.alt,
      altA: Math.max(cam.alt, Math.min(D * 0.3, shape[i].rmax * 400)),
      ly: cam.ly,
      lp: cam.lp,
      arr: opts.alt || arriveAlt(j),
      f0: null,
    };
  };
  S.flying = () => !!cam.fly;
  S.cons = cons;
  S.lookSky = (c) => {
    cam.pitch = Math.asin(Math.max(-1, Math.min(1, -c.y)));
    cam.yaw = Math.atan2(-c.z, -c.x);
    cam.ly = cam.lp = 0;
    wake();
  }; // zkušební háček: natočit pohled na místo na obloze
  S.jump = (j) => {
    S.focus = S.sel = j;
    cam.fly = null;
    cam.alt = cam.altT = arriveAlt(j);
    const s = sunSide(j);
    cam.yaw = s[0];
    cam.pitch = s[1];
    cam.ly = cam.lp = 0;
    S.on.focus(j);
    S.on.select(j);
    wake();
  };
  S.home = () => {
    S.flyTo(SUN, { alt: 42 * AU });
    cam.homePitch = true;
  };
  S.select = (j) => {
    S.sel = j;
    S.on.select(j);
    wake();
  };
  S.zoom = (k) => {
    cam.altT = Math.min(3e11, Math.max(minAlt(S.focus), cam.altT * k));
    if (cam.fly && cam.fly.ph === 2) cam.fly = null;
    wake();
  };
  S.rotate = (dx, dy) => {
    const i = S.focus,
      k = Math.min(0.005, (cam.alt / shape[i].rmax) * ((2 * Math.tan((FOV * DEG) / 2)) / H));
    cam.yaw += dx * k;
    cam.pitch = Math.min(1.553, Math.max(-1.553, cam.pitch + dy * k));
    wake();
  };
  S.look = (dx, dy) => {
    cam.ly = Math.max(-3.1, Math.min(3.1, cam.ly + dx * 0.0035));
    cam.lp = Math.max(-1.5, Math.min(1.5, cam.lp + dy * 0.0035));
    if (cam.fly && cam.fly.ph === 2) cam.fly = null;
    wake();
  };
  S.resetLook = () => {
    cam.fly = cam.fly || { ph: 2, t: 0, ly: cam.ly, lp: cam.lp };
    wake();
  };
  S.cam = cam;
  const ease = (u) => u * u * (3 - 2 * u);
  function updateCamera(dt) {
    let i = S.focus;
    const fl = cam.fly;
    let blend = 0,
      toDir = null;
    if (!fl || fl.ph === 2)
      cam.alt = Math.exp(Math.log(cam.alt) + (Math.log(cam.altT) - Math.log(cam.alt)) * (1 - Math.exp(-dt * 7)));
    if (fl && fl.ph === 2) {
      fl.t += dt / 0.6;
      const e = ease(Math.min(1, fl.t));
      cam.ly = fl.ly * (1 - e);
      cam.lp = fl.lp * (1 - e);
      if (cam.homePitch) cam.pitch += (0.9 - cam.pitch) * Math.min(1, dt * 4);
      if (fl.t >= 1.6) {
        cam.fly = null;
        cam.homePitch = false;
      }
    }
    if (fl && fl.ph === 0) {
      fl.t += dt / 1.15;
      const e = ease(Math.min(1, fl.t));
      cam.alt = Math.exp(Math.log(fl.alt0) + (Math.log(fl.altA) - Math.log(fl.alt0)) * e);
      blend = e;
      toDir = fl.to;
    }
    if (S.lock && !fl) {
      // kamera se otáčí s tělesem
      basis(i, S.jd, m9);
      const a = spinRate(i) * S.dJd;
      tmp.set(m9[6], m9[7], m9[8]);
      dirOf(cam.yaw, cam.pitch, dv).applyAxisAngle(tmp, a);
      cam.pitch = Math.asin(Math.max(-1, Math.min(1, dv.y)));
      cam.yaw = Math.atan2(dv.z, dv.x);
    }
    dirOf(cam.yaw, cam.pitch, dv);
    const dist = shape[i].rmax + cam.alt,
      C = S.camPos;
    C[0] = P[i * 3] + dv.x * dist;
    C[1] = P[i * 3 + 1] + dv.y * dist;
    C[2] = P[i * 3 + 2] + dv.z * dist;
    fwd.copy(dv).negate();
    right.crossVectors(fwd, Y).normalize();
    up.crossVectors(right, fwd);
    if (cam.ly || cam.lp) {
      const cl = Math.cos(cam.lp);
      tmp
        .copy(fwd)
        .multiplyScalar(cl * Math.cos(cam.ly))
        .addScaledVector(right, cl * Math.sin(cam.ly))
        .addScaledVector(up, Math.sin(cam.lp));
      fwd.copy(tmp).normalize();
    }
    if (toDir !== null) {
      tmp.set(P[toDir * 3] - C[0], P[toDir * 3 + 1] - C[1], P[toDir * 3 + 2] - C[2]).normalize();
      fwd.lerp(tmp, blend).normalize();
      if (fwd.lengthSq() < 0.5) fwd.copy(tmp);
    }
    if (Math.abs(fwd.y) > 0.9995) right.set(1, 0, 0);
    else right.crossVectors(fwd, Y).normalize();
    up.crossVectors(right, fwd).normalize();
    if (fl && fl.ph === 0 && fl.t >= 1) {
      // přepnutí středu: kamera zůstává na místě, dál se přibližuje k novému tělesu
      const j = fl.to;
      dv.set(C[0] - P[j * 3], C[1] - P[j * 3 + 1], C[2] - P[j * 3 + 2]);
      const d = dv.length();
      dv.divideScalar(d);
      S.focus = j;
      cam.pitch = Math.asin(dv.y);
      cam.yaw = Math.atan2(dv.z, dv.x);
      cam.alt = Math.max(minAlt(j), d - shape[j].rmax);
      cam.ly = cam.lp = 0;
      const s = sunSide(j);
      let dy = s[0] - cam.yaw;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      cam.fly = {
        ph: 1,
        t: 0,
        a0: cam.alt,
        a1: fl.arr,
        y0: cam.yaw,
        p0: cam.pitch,
        dy,
        p1: cam.homePitch ? 0.9 : s[1],
      };
      S.on.focus(j);
    } else if (fl && fl.ph === 1) {
      fl.t += dt / 1.9;
      const u = Math.min(1, fl.t),
        e = ease(u),
        e2 = ease(Math.min(1, u * 1.15));
      cam.alt = Math.exp(Math.log(fl.a0) + (Math.log(fl.a1) - Math.log(fl.a0)) * e);
      cam.yaw = fl.y0 + fl.dy * e2;
      cam.pitch = fl.p0 + (fl.p1 - fl.p0) * e2;
      if (u >= 1) {
        cam.fly = null;
        cam.homePitch = false;
        cam.altT = cam.alt;
        S.on.arrive(S.focus);
      }
    }
    mm.makeBasis(right, up, tmp.copy(fwd).negate());
    camera.matrix.copy(mm);
    camera.matrixWorld.copy(mm);
    camera.matrixWorldInverse.copy(mm).invert();
    camera.near = Math.max(1e-6, cam.alt * 0.2);
    camera.far = 1e12;
    camera.updateProjectionMatrix();
  }

  // ---------- snímek ----------
  let last = performance.now(),
    acc = 0,
    frames = 0,
    slow = 0,
    hudT = 0,
    skip = 0,
    raf = 0;
  const v4 = new THREE.Vector3();
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dtR = Math.min(0.1, (now - last) / 1000),
      rate = S.paused ? 0 : Math.sign(S.rateIdx) * RATES[Math.abs(S.rateIdx) - 1];
    for (const fn of S.ticks) fn(Math.min(0.05, dtR)); /* vstup z klávesnice dřív než rozhodnutí o klidu */
    const idle =
      now - lastInput > 2500 && !cam.fly && Math.abs(rate) <= 60 && Math.abs(Math.log(cam.alt / cam.altT)) < 1e-3;
    if (idle && ++skip % 4) return; // v klidu jen ~15 snímků/s (šetří starý notebook)
    const dt = idle ? Math.min(0.25, (now - last) / 1000) : dtR;
    last = now;
    S.dJd = (rate * dt) / 86400;
    S.jd += S.dJd;
    updateAll(S.jd);
    updateCamera(dt);
    const C = S.camPos,
      big = [];
    S.items.length = 0;
    for (let i = 0; i < N; i++) {
      const r = R[i],
        b = B[i],
        rel = r.rel;
      rel.set(P[i * 3] - C[0], P[i * 3 + 1] - C[1], P[i * 3 + 2] - C[2]);
      const dist = rel.length(),
        z = rel.dot(fwd),
        rm = shape[i].rmax,
        pr = (rm / dist) * F;
      r.dist = dist;
      r.z = z;
      r.pr = pr;
      if (z > 0) {
        r.sx = W / 2 + (rel.dot(right) / z) * F;
        r.sy = H / 2 - (rel.dot(up) / z) * F;
      } else {
        r.sx = r.sy = -1e6;
      }
      const on =
        pr > 0.9 &&
        z > -rm &&
        (z <= 0 ||
          (r.sx > -pr * 1.5 - 60 && r.sx < W + pr * 1.5 + 60 && r.sy > -pr * 1.5 - 60 && r.sy < H + pr * 1.5 + 60) ||
          dist < rm * 4);
      const active = b.type === 'comet' || b.coma || i === SUN;
      if (!on && !active) {
        if (r.mesh) r.mesh.visible = false;
        if (r.plumes) for (const m of r.plumes) m.visible = false;
        continue;
      }
      if (!r.mesh) makeBody(i);
      const U = r.U,
        mesh = r.mesh;
      mesh.visible = on;
      if (on) {
        r.used = now;
        if (pr > 2.5) needTex(i);
        if (U.uHasMap.value > 0 && U.uHasMap.value < 1) {
          U.uHasMap.value = Math.min(1, U.uHasMap.value + dt * 2.2);
          wake();
        }
        if (i === S.focus && pr > 250 && !cam.fly && r.tex === 2 && !r.hi) needHi(i);
        if (r.hi === 2) {
          // prolnutí velké mapy; u těles, kde velká mapa ukazuje jiný jev než malá (Venuše: povrch pod oblačností), řídí míru jen velikost kotouče – při oddálení se oblačnost zase zatáhne
          const tg = HI_ZOOM.has(b.id) ? Math.max(0.001, Math.min(1, (pr - 230) / 120)) : 1,
            v = U.uHi.value;
          if (Math.abs(tg - v) > 0.0005) {
            U.uHi.value = v + Math.sign(tg - v) * Math.min(Math.abs(tg - v), dt * 1.1);
            wake();
          }
        }
        if (U.uExp)
          U.uExp.value =
            S.realBright && i !== SUN
              ? Math.min(1, Math.pow(AU / Math.hypot(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]), 2))
              : 1;
        if (r.plumes)
          for (const m of r.plumes) {
            const d = m.userData.d;
            m.visible = pr > 25;
            if (m.visible) {
              basis(i, S.jd, m9);
              const u = m.material.uniforms;
              u.uA.value.set(
                m9[0] * d[0] + m9[3] * d[1] + m9[6] * d[2],
                m9[1] * d[0] + m9[4] * d[1] + m9[7] * d[2],
                m9[2] * d[0] + m9[5] * d[1] + m9[8] * d[2]
              );
              u.uN.value.copy(rel).addScaledVector(u.uA.value, b.R * 0.98);
            }
          }
        basis(i, S.jd, m9);
        const s = b.R;
        mesh.matrix.set(
          m9[0] * s,
          m9[3] * s,
          m9[6] * s,
          rel.x,
          m9[1] * s,
          m9[4] * s,
          m9[7] * s,
          rel.y,
          m9[2] * s,
          m9[5] * s,
          m9[8] * s,
          rel.z,
          0,
          0,
          0,
          1
        );
        mesh.matrixWorldNeedsUpdate = true;
        U.uRot.value.set(m9[0], m9[3], m9[6], m9[1], m9[4], m9[7], m9[2], m9[5], m9[8]);
        U.uPole.value.set(m9[6], m9[7], m9[8]);
        mesh.geometry = GEO[pr > 260 ? 2 : pr > 14 ? 1 : 0];
        if (i !== SUN) {
          const hx = P[i * 3],
            hy = P[i * 3 + 1],
            hz = P[i * 3 + 2],
            hd = Math.hypot(hx, hy, hz);
          U.uSun.value.set(-hx / hd, -hy / hd, -hz / hd);
          U.uSunR.value = 696000 / hd;
          const oc = occOf[i];
          for (let k = 0; k < 4; k++) {
            const j = oc[k];
            if (j === undefined) U.uOcc.value[k].w = 0;
            else U.uOcc.value[k].set(P[j * 3] - hx, P[j * 3 + 1] - hy, P[j * 3 + 2] - hz, B[j].R);
          }
          {
            const th = (r.hi === 2 ? r.hw : r.mw || 512) * 0.22;
            U.uDet.value =
              S.quality > 0 && pr > th
                ? Math.min(1, (pr - th) / (th * 1.5)) * (kindOf(b) === 2 || i === EARTH ? 0.25 : 1)
                : 0;
          }
          if (i === EARTH) U.uTime.value = ((S.jd - 2451545) * 0.02) % 1;
        } else {
          U.uTime.value = (now * 0.00002) % 100;
          U.uMode.value = S.sunMode;
          U.uCor.value = S.sunMode === 3 ? sstep(5, 16, pr) : 0; /* z dálky zůstává Slunce vidět jako hvězda */
          U.uQ.value = S.quality;
          if (loops) {
            const lu = loops.material.uniforms;
            lu.uI.value = (S.sunMode === 0 ? 0.0 : 1.0) * Math.min(1, pr / (S.sunMode === 3 ? 50 : 120));
            lu.uErupt.value = flare.t >= 0 ? flare.t : 0;
            loops.visible = lu.uI.value > 0.01 && pr > 30;
          }
          flare.next -= dt;
          if (flare.t < 0 && flare.next <= 0 && AR.length) {
            flare.k = flare.force !== undefined ? flare.force : Math.floor(Math.random() * AR.length);
            flare.force = undefined;
            flare.t = 0;
            U.uFlare.value.set(AR[flare.k].x, AR[flare.k].y, AR[flare.k].z, 0);
            if (pr > 60) S.on.flare();
          }
          if (flare.t >= 0) {
            flare.t += dt / 3.5;
            const e = flare.t < 0.12 ? flare.t / 0.12 : Math.max(0, 1 - (flare.t - 0.12) / 0.88);
            U.uFlare.value.w = e * e * (S.sunMode === 0 || S.sunMode === 3 ? 0.35 : 1);
            if (flare.t >= 1) {
              flare.t = -1;
              flare.next = 6 + Math.random() * 9;
            }
            wake();
          }
        }
        if (pr > 5 && z > 0) big.push(i);
      }
      if (r.glow) {
        const g = r.glow.material.uniforms;
        let core,
          I = 1;
        if (i === SUN) {
          core = Math.max(b.R, (2.6 * dist) / F);
          g.uS.value = core * 16;
          I =
            (S.sunMode === 2 ? 0.8 : S.sunMode === 1 ? 0.35 : 0.3) *
            (0.08 + 0.92 * Math.min(1, Math.max(0, dist / b.R - 1) / 7));
          g.uC.value.set(1, S.sunMode === 1 ? 0.45 : 0.74, S.sunMode === 1 ? 0.25 : 0.42);
          const kc = r.U.uCor.value;
          g.uCor.value = kc;
          if (kc > 0) {
            /* průmět osy Slunce a přilbových paprsků na obrazovku (sloupce uRot = osy tělesa ve scéně) */
            const e = r.U.uRot.value.elements,
              c = camera.matrixWorld.elements;
            const pj = (x, y, z, o) => {
              const wx = e[0] * x + e[3] * y + e[6] * z,
                wy = e[1] * x + e[4] * y + e[7] * z,
                wz = e[2] * x + e[5] * y + e[8] * z;
              o.x = wx * c[0] + wy * c[1] + wz * c[2];
              o.y = wx * c[4] + wy * c[5] + wz * c[6];
            };
            pj(0, 0, 1, g.uAx.value);
            for (let k = 0; k < 8; k++) {
              const s = STREAM[k],
                o = g.uSt.value[k];
              pj(s[0], s[1], s[2], o);
              o.z = s[3];
              o.w = s[4];
            }
            g.uCR.value = b.R / g.uS.value;
          }
        } else {
          const hd = Math.hypot(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]) / AU,
            A = Math.pow(Math.min(1, Math.max(0, (3.6 - hd) / 2.6)), 1.5);
          r.act = A;
          r.hd = hd;
          core = Math.max(b.R * 30 * (0.3 + A), (1.6 * dist) / F);
          g.uS.value = core * 10;
          I = 0.55 * A * sstep(b.R * 30, b.R * 3000, dist);
        }
        g.uCore.value = core / g.uS.value;
        g.uI.value = I;
        r.glow.visible = I > 0.003 && z > -g.uS.value;
        r.glow.matrix.makeTranslation(rel.x, rel.y, rel.z);
        r.glow.matrixWorldNeedsUpdate = true;
      }
      if (r.tails) {
        const A = r.act || 0,
          vis = A > 0.01;
        if (vis) {
          const hx = P[i * 3],
            hy = P[i * 3 + 1],
            hz = P[i * 3 + 2],
            hl = Math.hypot(hx, hy, hz);
          tmp.set(hx / hl, hy / hl, hz / hl);
          local(i, S.jd + 0.5, m9);
          tmp2.set(-(m9[0] - hx), -(m9[1] - hy), -(m9[2] - hz));
          tmp2.addScaledVector(tmp, -tmp2.dot(tmp)).normalize();
          const k = b.fame >= 4 ? 1 : 0.6,
            Lion = (0.35 * AU * A * k) / Math.sqrt(Math.max(0.25, r.hd)),
            near = sstep(b.R * 200, b.R * 20000, dist),
            w0 = Math.max(b.R * 6, (1.2 * dist) / F);
          const set = (m, L, w1, curv, I, fall) => {
            const u = m.material.uniforms;
            u.uA.value.copy(tmp);
            u.uB.value.copy(tmp2);
            u.uL.value = L;
            u.uW0.value = w0;
            u.uW1.value = Math.max(w1, w0);
            u.uCurv.value = curv;
            u.uI.value = I * near;
            u.uFall.value = fall;
            m.visible = true;
          };
          set(r.tails[0], Lion, Lion * 0.035, 0, 0.5 * A, 1.3);
          set(r.tails[1], Lion * 0.55, Lion * 0.12, 0.32, 0.6 * A, 1.9);
        } else {
          r.tails[0].visible = r.tails[1].visible = false;
        }
      }
    }
    // dráhy
    orbBudget = 3;
    const fi = S.focus,
      nearK = 0.3 + 0.7 * sstep(shape[fi].rmax * 30, shape[fi].rmax * 400, cam.alt);
    for (let i = 0; i < N; i++) {
      if (i === SUN) continue;
      const r = R[i],
        b = B[i],
        p = par[i],
        pd = p === SUN ? Math.hypot(C[0], C[1], C[2]) : R[p].dist,
        apx = (semi[i] / Math.max(pd, 1)) * F;
      const hot = i === fi || i === S.sel || i === S.hover || i === par[fi];
      let a = 0;
      if (S.orbMode > 0) {
        if (p === SUN)
          a = b.type === 'planet' || b.type === 'dwarf' ? 0.5 * nearK : hot ? 0.75 : S.orbMode === 2 ? 0.22 : 0;
        else
          a = (hot ? 0.75 : 0.42) * sstep(14, 40, apx) * (S.orbMode === 2 || root[i] === root[fi] || apx > 70 ? 1 : 0);
        if (hot && p === SUN) a = Math.max(a, 0.8);
        a *= sstep(shape[i].rmax * 25, shape[i].rmax * 250, r.dist);
      }
      if (a < 0.015) {
        if (r.orbit) r.orbit.line.visible = false;
        continue;
      }
      const o = orbitLine(i),
        Pd = isFinite(period[i]) ? period[i] : 36525,
        chain = i === fi || i === par[fi] || i === S.sel,
        age = Math.abs(S.jd - o.built);
      if (age > Pd * (chain ? 2e-6 : 0.0015) && (chain || orbBudget-- > 0)) buildOrbit(i);
      o.line.visible = true;
      o.line.material.opacity = a;
      if (S.disco) o.line.material.color.setHSL((now * 0.0002 + i * 0.031) % 1, 0.9, 0.6);
      else if (o.base !== undefined && o.line.material.color.getHex() !== o.base) o.line.material.color.setHex(o.base);
      const px = p === SUN ? -C[0] : R[p].rel.x,
        py = p === SUN ? -C[1] : R[p].rel.y,
        pz = p === SUN ? -C[2] : R[p].rel.z;
      o.line.matrix.makeTranslation(px, py, pz);
      o.line.matrixWorldNeedsUpdate = true;
    }
    {
      if (S.conMode > 0 && conLv < 0.01 && conPrev === 0) conT = now;
      conPrev = S.conMode;
      const dl = S.conMode - conLv;
      conLv = Math.abs(dl) < 0.004 ? S.conMode : conLv + dl * Math.min(1, dtR * 7);
      const on = conLv > 0.004,
        g = (now - conT) / 1000,
        s2 = Math.min(1, Math.max(0, conLv - 1)),
        s3 = Math.min(1, Math.max(0, conLv - 2));
      const sK = Math.min(1, 0.34 * Math.min(conLv, 1) + 0.28 * s2 + 0.38 * s3); // zvýraznění hvězd roste se stupněm
      S.conLines.visible = on;
      S.conStars.visible = on;
      S.conDip.visible = on;
      {
        const ox = 1.3 / W,
          oy = 1.3 / H,
          o = [
            [0, 0],
            [ox, 0],
            [-ox, 0],
            [0, oy],
            [0, -oy],
          ];
        dipMat.forEach((m, q) => {
          m.uniforms.uOff.value.set(o[q][0], o[q][1]);
          if (S.kid) m.uniforms.uC.value.set(1.25, 0.95, 0.5);
          else m.uniforms.uC.value.set(1.1, 1.0, 0.82);
        });
      }
      conMat.cu.uLv.value = conLv;
      conMat.cu.uA.value = 0.5 + S.gamma * 0.25;
      conMat.cu.uKid.value = S.kid ? 1 : 0;
      conMat.cu.uG.value = g;
      cstMat.uniforms.uS.value = sK;
      if (on && (g < 4 || conLv !== S.conMode)) wake();
      const fr = 0.06 * s2 + 0.09 * s3 + (S.kid ? 0.05 * s2 : 0),
        ox = 2.2 / W,
        oy = 2.2 / H,
        f = conMat.fringe;
      for (const m of f) {
        m.uniforms.uFr.value = fr;
      }
      f[0].uniforms.uOff.value.set(ox, 0);
      f[1].uniforms.uOff.value.set(-ox, 0);
      f[2].uniforms.uOff.value.set(0, oy);
      f[3].uniforms.uOff.value.set(0, -oy);
      for (let q = 1; q < 5; q++) S.conLines.children[q].visible = fr > 0.004;
    }
    starMat.uniforms.uGain.value = (1 + S.gamma * 1.2) * (S.disco ? 1.3 + 0.5 * Math.sin(now * 0.008) : 1);
    skyMat.uniforms.uGain.value = 0.5 + S.gamma * 1.2;
    renderer.render(scene, camera);
    drawOverlay(big);
    // návštěva, HUD, výkon
    if (!cam.fly && cam.alt < shape[fi].rmax * 14) S.on.visit(fi);
    frames++;
    acc += now - (frame.t0 || now);
    frame.t0 = now;
    if (frames >= 30) {
      const ms = acc / frames;
      S.fps = 1000 / ms;
      if (!idle) {
        if (ms > 42) slow++;
        else slow = Math.max(0, slow - 1);
        if (slow >= 3 && S.quality > 0) {
          S.quality--;
          PR = S.quality === 1 ? 1 : 0.75;
          renderer.setPixelRatio(PR);
          starMat.uniforms.uPx.value = Math.max(1, PR);
          cstMat.uniforms.uPx.value = Math.max(1, PR);
          resize();
          slow = 0;
        }
      }
      frames = 0;
      acc = 0;
      dropTex(now);
    }
    if (now - hudT > 180) {
      hudT = now;
      S.on.hud();
    }
  }

  // ---------- značky a popisky (2D) ----------
  const rects = [];
  function drawOverlay(big) {
    const tk = S.txtK || 1; /* měřítko písma ve 2D vrstvě (režim velké obrazovky) */
    ctx.clearRect(0, 0, W, H);
    if (S.conMode === 4 || S.starNames) {
      ctx.textBaseline = 'middle';
      const put = (o, star) => {
        const z = o.c.dot(fwd);
        if (z < 0.25) return;
        const x = W / 2 + (o.c.dot(right) / z) * F,
          y = H / 2 - (o.c.dot(up) / z) * F;
        if (x < 0 || x > W || y < 50 || y > H - 90) return;
        for (const j of big) {
          const q = R[j];
          if (Math.hypot(q.sx - x, q.sy - y) < q.pr + 6) return;
        }
        if (star) {
          ctx.font = 'italic ' + 11.5 * tk + 'px system-ui, sans-serif';
          ctx.fillStyle = 'rgba(255,236,170,0.85)';
          ctx.fillText(o.name, x + 7, y - 6);
          ctx.strokeStyle = 'rgba(255,236,170,0.5)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(x, y, 4.5, 0, 6.2832);
          ctx.stroke();
        } else {
          ctx.font = '600 ' + 10.5 * tk + 'px system-ui, sans-serif';
          ctx.fillStyle = 'rgba(120,160,255,0.8)';
          const t = o.name.toUpperCase().split('').join('\u200a');
          ctx.fillText(t, x - ctx.measureText(t).width / 2, y);
        }
      };
      if (S.conMode === 4) {
        // jména souhvězdí: nesmí ležet přes čáry – hledá se nejbližší volné místo u těžiště; jednou nalezené se drží, dokud vyhovuje
        const sg = [];
        for (let k = 0; k < conSeg.length; k += 6) {
          const z1 = conSeg[k] * fwd.x + conSeg[k + 1] * fwd.y + conSeg[k + 2] * fwd.z,
            z2 = conSeg[k + 3] * fwd.x + conSeg[k + 4] * fwd.y + conSeg[k + 5] * fwd.z;
          if (z1 < 0.2 || z2 < 0.2) continue;
          const x1 = W / 2 + ((conSeg[k] * right.x + conSeg[k + 1] * right.y + conSeg[k + 2] * right.z) / z1) * F,
            y1 = H / 2 - ((conSeg[k] * up.x + conSeg[k + 1] * up.y + conSeg[k + 2] * up.z) / z1) * F,
            x2 = W / 2 + ((conSeg[k + 3] * right.x + conSeg[k + 4] * right.y + conSeg[k + 5] * right.z) / z2) * F,
            y2 = H / 2 - ((conSeg[k + 3] * up.x + conSeg[k + 4] * up.y + conSeg[k + 5] * up.z) / z2) * F;
          if (
            Math.max(x1, x2) < -150 ||
            Math.min(x1, x2) > W + 150 ||
            Math.max(y1, y2) < -150 ||
            Math.min(y1, y2) > H + 150
          )
            continue;
          sg.push(x1, y1, x2, y2);
        }
        const cut = (a, b, c, d, x0, y0, x1, y1) => {
          let t0 = 0,
            t1 = 1;
          const dx = c - a,
            dy = d - b,
            P = [-dx, dx, -dy, dy],
            Q = [a - x0, x1 - a, b - y0, y1 - b];
          for (let i = 0; i < 4; i++) {
            if (P[i] === 0) {
              if (Q[i] < 0) return false;
            } else {
              const r = Q[i] / P[i];
              if (P[i] < 0) {
                if (r > t1) return false;
                if (r > t0) t0 = r;
              } else {
                if (r < t0) return false;
                if (r < t1) t1 = r;
              }
            }
          }
          return true;
        };
        const placed = [],
          free = (x0, y0, x1, y1) => {
            for (const q of placed) if (x0 < q[2] && x1 > q[0] && y0 < q[3] && y1 > q[1]) return false;
            for (let i = 0; i < sg.length; i += 4)
              if (cut(sg[i], sg[i + 1], sg[i + 2], sg[i + 3], x0, y0, x1, y1)) return false;
            return true;
          };
        ctx.font = '600 ' + 10.5 * tk + 'px system-ui, sans-serif';
        for (const o of cons) {
          const z = o.c.dot(fwd);
          if (z < 0.25) continue;
          const x = W / 2 + (o.c.dot(right) / z) * F,
            y = H / 2 - (o.c.dot(up) / z) * F;
          if (x < 0 || x > W || y < 50 || y > H - 90) continue;
          let hid = false;
          for (const j of big) {
            const q = R[j];
            if (Math.hypot(q.sx - x, q.sy - y) < q.pr + 6) {
              hid = true;
              break;
            }
          }
          if (hid) continue;
          const t = o.name.toUpperCase().split('').join('\u200a'),
            w = ctx.measureText(t).width,
            m = 5,
            ok = (dx, dy) => free(x + dx - w / 2 - m, y + dy - 7 - m, x + dx + w / 2 + m, y + dy + 7 + m);
          let off = o.off || [0, 0];
          if (!ok(off[0], off[1])) {
            let best = null;
            for (let r = 0; r <= 130 && !best; r += 10)
              for (let a = 0; a < (r ? 12 : 1); a++) {
                const dx = Math.cos(a * 0.5236 + 0.26) * r * 1.5,
                  dy = Math.sin(a * 0.5236 + 0.26) * r;
                if (ok(dx, dy)) {
                  best = [dx, dy];
                  break;
                }
              }
            off = best || [0, 0];
          }
          o.off = off;
          ctx.fillStyle = o.dip
            ? S.kid
              ? 'rgba(255,205,110,0.95)'
              : 'rgba(240,215,160,0.9)'
            : 'rgba(120,160,255,0.8)';
          ctx.fillText(t, x + off[0] - w / 2, y + off[1]);
          placed.push([x + off[0] - w / 2 - m, y + off[1] - 7 - m, x + off[0] + w / 2 + m, y + off[1] + 7 + m]);
        }
      }
      if (S.starNames) for (const s of starLab) put(s, true);
    }
    collect(big, S.labMode > 0 || S.hover >= 0);
    if (S.overlays.length) {
      const e = { W, H, F, fwd, right, up, big, R };
      for (const fn of S.overlays) fn(ctx, e);
    }
  }
  function collect(big, draw) {
    const fi = S.focus,
      items = S.items;
    rects.length = 0;
    for (let i = 0; i < N; i++) {
      const r = R[i],
        b = B[i];
      if (r.z <= 0 || r.sx < -40 || r.sx > W + 40 || r.sy < -40 || r.sy > H + 40) continue;
      const hot = i === fi || i === S.sel || i === S.hover,
        p = par[i];
      if (!hot && p >= 0 && p !== SUN && r.pr < 3) {
        const q = R[p];
        if (Math.hypot(q.sx - r.sx, q.sy - r.sy) < Math.max(13, q.pr * 0.9)) continue;
      }
      let hid = false;
      for (const j of big) {
        if (j === i) continue;
        const q = R[j];
        if (r.dist > q.dist && Math.hypot(q.sx - r.sx, q.sy - r.sy) < q.pr * 0.97) {
          hid = true;
          break;
        }
      }
      if (hid) continue;
      const small = !(b.type === 'planet' || b.type === 'star' || b.type === 'dwarf' || b.type === 'moon');
      let pri;
      if (hot) pri = 1000 + (i === S.hover ? 50 : 0);
      else if (b.type === 'star') pri = 300;
      else if (b.type === 'planet') pri = 200;
      else if (b.type === 'dwarf') pri = 120 + b.fame;
      else if (b.type === 'moon') pri = 60 + Math.log10(b.R) * 12 + (root[i] === root[fi] ? 40 : 0);
      else pri = 20 + b.fame * 8 + (r.pr > 1.5 ? 60 : 0);
      const lab =
        hot || S.labMode === 2 || (S.labMode === 1 && (!small || b.fame >= 4 || r.pr > 1.5 || r.dist < 0.05 * AU));
      items.push({ i, sx: r.sx, sy: r.sy, pr: r.pr, pri, lab, dist: r.dist });
    }
    if (!draw) return;
    items.sort((a, b) => b.pri - a.pri);
    let nlab = 0;
    ctx.textBaseline = 'middle';
    for (const it of items) {
      const b = B[it.i],
        hot = it.pri >= 1000,
        col =
          b.type === 'planet' || b.type === 'star'
            ? hex((b.col || [1, 1, 1]).map((x) => 0.45 + x * 0.7))
            : TYPE_COL[b.type] || '#aaa';
      if (it.pr < 3.5 && it.i !== SUN) {
        const rad = b.type === 'planet' ? 2.6 : b.type === 'dwarf' ? 2.2 : b.type === 'moon' ? 1.7 : 1.4;
        ctx.globalAlpha = hot ? 1 : b.type === 'planet' ? 0.95 : 0.7;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(it.sx, it.sy, rad, 0, 6.2832);
        ctx.fill();
      }
      if (hot && it.pr < 9) {
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = it.i === S.hover ? '#fff' : '#ffc857';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(it.sx, it.sy, 8, 0, 6.2832);
        ctx.stroke();
      }
      if (!it.lab || (S.labMode === 0 && it.i !== S.hover)) continue;
      if (!hot && nlab > 46) continue;
      const big2 = hot || b.type === 'planet' || b.type === 'star';
      ctx.font =
        (big2 ? '600 ' + 13 * (S.txtK || 1) + 'px ' : 12 * (S.txtK || 1) + 'px ') +
        'system-ui, -apple-system, Segoe UI, sans-serif';
      const name = b.cs,
        w = ctx.measureText(name).width,
        off = it.pr > 3.5 ? Math.min(it.pr, 220) * 0.72 + 7 : 9,
        x = it.sx + off,
        y = it.sy - (it.pr > 3.5 ? Math.min(it.pr, 220) * 0.72 : 0) - 1;
      if (x + w > W - 4 || y < 10 || y > H - 10) {
        if (!hot) continue;
      }
      let clash = false;
      for (const q of rects)
        if (x < q[2] && x + w + 4 > q[0] && y - 8 < q[3] && y + 8 > q[1]) {
          clash = true;
          break;
        }
      if (clash && !hot) continue;
      rects.push([x - 3, y - 8, x + w + 4, y + 8]);
      nlab++;
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.strokeText(name, x, y);
      ctx.fillStyle = hot ? '#ffe7ad' : big2 ? '#e9f0ff' : '#b9c3d6';
      ctx.globalAlpha = hot || big2 ? 1 : 0.85;
      ctx.fillText(name, x, y);
    }
    ctx.globalAlpha = 1;
  }
  S.pick = (x, y) => {
    // nejdřív značky nerozlišených těles u kurzoru, pak nejbližší kotouč pod kurzorem
    let best = -1,
      bd = S.pickR || 12,
      disc = -1,
      dd = 1e99;
    for (const it of S.items) {
      const d = Math.hypot(it.sx - x, it.sy - y);
      if (it.pr < 11) {
        if (d < bd) {
          bd = d;
          best = it.i;
        }
      } else if (d < it.pr && it.dist < dd) {
        dd = it.dist;
        disc = it.i;
      }
    }
    if (best >= 0 && disc >= 0 && R[best].dist > dd) return disc;
    return best >= 0 ? best : disc;
  };
  S.setGamma = (g) => {
    S.gamma = g;
    gamU.fill.value = 0.32 * g * g;
    gamU.gam.value = 1 + 0.9 * g;
    wake();
  };
  S.info = (i) => ({
    alt: cam.alt,
    dist: R[i].dist,
    sun: Math.hypot(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]),
    earth: Math.hypot(P[i * 3] - P[EARTH * 3], P[i * 3 + 1] - P[EARTH * 3 + 1], P[i * 3 + 2] - P[EARTH * 3 + 2]),
    parent:
      par[i] > 0
        ? Math.hypot(P[i * 3] - P[par[i] * 3], P[i * 3 + 1] - P[par[i] * 3 + 1], P[i * 3 + 2] - P[par[i] * 3 + 2])
        : 0,
    kmPerPx: (shape[S.focus].rmax + cam.alt) / F,
  });
  S.wake = wake;
  S.R = R;
  S.renderer = renderer;
  S.start = () => {
    resize();
    updateAll(S.jd);
    S.jump(EARTH);
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  };
  return S;
}
