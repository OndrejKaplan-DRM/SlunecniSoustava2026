// Soustava 200 – pásy malých těles (verze 1.8a): hlavní pás planetek mezi Marsem a Jupiterem a Kuiperův pás za Neptunem.
// ILUSTRACE: tečky nejsou jednotlivá skutečná tělesa (těch jsou miliony a ve skutečném měřítku by nebyla vidět). Rozložení drah
// ale odpovídá skutečnosti: hustota podle velké poloosy s Kirkwoodovými mezerami (rezonance s Jupiterem 3:1, 5:2, 7:3, 2:1),
// výstřednosti a sklony podle pozorovaných populací; u Kuiperova pásu klasický pás 42–48 AU, plutina u 39,4 AU a řídký rozptýlený disk.
// Tečky obíhají podle Keplerových zákonů (při zrychlení času je vidět, že vnitřní okraj pásu obíhá rychleji než vnější).
// Aby se v nich uživatel neztratil: nejdou vybrat, nemají jednotlivá jména, a jakmile přiletí k nějakému tělesu (malá výška kamery),
// vytratí se. Vidět jsou jen v přehledu soustavy; každý pás má jeden popisek.
import * as THREE from 'three';
import { AU, P, SUN } from '../core/sim.js';

const VS = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec4 aEl; attribute vec3 aPh;
uniform float uT; uniform vec3 uOff; uniform float uPx; uniform float uA; uniform float uSize; uniform float uPow;
varying float vA;
void main(){
  float a = aEl.x, e = aEl.y;
  float M = aPh.y + uT * 0.01720209895 / (a * sqrt(a));
  float v = M + 2.0 * e * sin(M) + 1.25 * e * e * sin(2.0 * M);
  float r = a * (1.0 - e * e) / (1.0 + e * cos(v));
  float u = v + aPh.x, ci = cos(aEl.z), si = sin(aEl.z), cO = cos(aEl.w), sO = sin(aEl.w), cu = cos(u), su = sin(u);
  vec3 ecl = r * vec3(cO * cu - sO * su * ci, sO * cu + cO * su * ci, su * si);
  vec3 p = vec3(ecl.x, ecl.z, -ecl.y) * 149597870.7 + uOff;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  #include <logdepthbuf_vertex>
  vA = uA * pow(aPh.z, uPow);
  gl_PointSize = uSize * uPx * (0.7 + 0.6 * aPh.z);
}`;
const FS = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 uCol; varying float vA;
void main(){
  #include <logdepthbuf_fragment>
  vec2 q = gl_PointCoord * 2.0 - 1.0; float r = dot(q, q);
  float a = vA * exp(-r * 2.4) * (1.0 - smoothstep(0.7, 1.0, r)); if (a < 0.008) discard;
  gl_FragColor = vec4(uCol * a, 1.0);
  #include <colorspace_fragment>
}`;

/* opakovatelná náhoda – pás vypadá při každém spuštění stejně */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const DEG = Math.PI / 180,
  rayleigh = (rnd, sig) => sig * Math.sqrt(-2 * Math.log(1 - rnd() * 0.9999));

function mainBelt(n) {
  const rnd = rng(2026),
    el = new Float32Array(n * 4),
    ph = new Float32Array(n * 3),
    GAPS = [
      [2.502, 0.022],
      [2.825, 0.02],
      [2.958, 0.018],
      [3.279, 0.03],
    ];
  /* hustota podle velké poloosy: vnitřní, střední a vnější pás; mezi nimi Kirkwoodovy mezery */
  const dens = (a) => {
    let d =
      0.55 * Math.exp(-(((a - 2.33) / 0.13) ** 2)) +
      1.0 * Math.exp(-(((a - 2.67) / 0.11) ** 2)) +
      0.85 * Math.exp(-(((a - 3.1) / 0.1) ** 2)) +
      0.12;
    for (const [g, w] of GAPS) d *= 1 - Math.exp(-(((a - g) / w) ** 2));
    return a < 2.08 || a > 3.3 ? 0 : d;
  };
  for (let k = 0; k < n;) {
    const a = 2.05 + rnd() * 1.3;
    if (rnd() * 1.15 > dens(a)) continue;
    el[k * 4] = a;
    el[k * 4 + 1] = Math.min(0.32, rayleigh(rnd, 0.1));
    el[k * 4 + 2] = Math.min(30, rayleigh(rnd, 6.5)) * DEG;
    el[k * 4 + 3] = rnd() * 6.2832;
    ph[k * 3] = rnd() * 6.2832;
    ph[k * 3 + 1] = rnd() * 6.2832;
    ph[k * 3 + 2] = 0.35 + 0.65 * rnd() ** 2;
    k++;
  }
  return [el, ph];
}
function kuiperBelt(n) {
  const rnd = rng(1930),
    el = new Float32Array(n * 4),
    ph = new Float32Array(n * 3);
  for (let k = 0; k < n; k++) {
    const t = rnd();
    let a, e, i;
    if (t < 0.38) {
      /* klasický pás, „studená“ populace: skoro kruhové dráhy v rovině */
      a = 42.5 + rnd() * 4.8;
      e = Math.min(0.1, rayleigh(rnd, 0.04));
      i = Math.min(6, rayleigh(rnd, 2)) * DEG;
    } else if (t < 0.66) {
      /* klasický pás, „horká“ populace */
      a = 40.5 + rnd() * 7.5;
      e = Math.min(0.2, rayleigh(rnd, 0.09));
      i = Math.min(34, rayleigh(rnd, 12)) * DEG;
    } else if (t < 0.84) {
      /* plutina: rezonance 3:2 s Neptunem, jako Pluto */
      a = 39.4 + (rnd() - 0.5) * 0.5;
      e = 0.08 + rnd() * 0.22;
      i = Math.min(34, rayleigh(rnd, 10)) * DEG;
    } else if (t < 0.89) {
      /* rezonance 2:1 – vnější okraj klasického pásu */
      a = 47.8 + (rnd() - 0.5) * 0.5;
      e = 0.1 + rnd() * 0.2;
      i = Math.min(25, rayleigh(rnd, 8)) * DEG;
    } else {
      /* rozptýlený disk: přísluní u Neptunovy dráhy, odsluní daleko */
      const q = 33 + rnd() * 6;
      a = 50 + rnd() ** 1.6 * 45;
      e = 1 - q / a;
      i = Math.min(40, rayleigh(rnd, 14)) * DEG;
    }
    el[k * 4] = a;
    el[k * 4 + 1] = e;
    el[k * 4 + 2] = i;
    el[k * 4 + 3] = rnd() * 6.2832;
    ph[k * 3] = rnd() * 6.2832;
    ph[k * 3 + 1] = rnd() * 6.2832;
    ph[k * 3 + 2] = 0.35 + 0.65 * rnd() ** 2;
  }
  return [el, ph];
}

export function createBelts(scene, S, sstep) {
  const epoch = S.jd; /* čas v shaderu běží od spuštění – malé číslo, přesný úhel */
  const mk = (data, col, size, n) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aEl', new THREE.BufferAttribute(data[0], 4));
    g.setAttribute('aPh', new THREE.BufferAttribute(data[1], 3));
    const m = new THREE.ShaderMaterial({
      uniforms: {
        uT: { value: 0 },
        uOff: { value: new THREE.Vector3() },
        uPx: { value: 1 },
        uA: { value: 0 },
        uSize: { value: size },
        uPow: { value: 1 },
        uCol: { value: new THREE.Color(col[0], col[1], col[2]) },
      },
      vertexShader: VS,
      fragmentShader: FS,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const p = new THREE.Points(g, m);
    p.frustumCulled = false;
    p.renderOrder = -6;
    p.visible = false;
    scene.add(p);
    return p;
  };
  const N1 = 2600,
    N2 = 1900;
  const belts = [
    {
      id: 'main',
      cs: 'hlavní pás planetek',
      a0: 2.75,
      pts: mk(mainBelt(N1), [0.88, 0.77, 0.6], 2.3, N1),
      size: 2.3,
      lo: 0.12 * AU /* pod touto výškou kamery nad tělesem pás není vidět… */,
      hi: 0.7 * AU /* …a od této je vidět naplno */,
      max: 0.55,
      inn: [3, 6] /* kamera hluboko uvnitř prstence (poměr poloměr pásu : vzdálenost od Slunce): pás se vytratí */,
      a: 0,
      lab: -1,
      col: '222, 204, 170',
    },
    {
      id: 'kuiper',
      cs: 'Kuiperův pás',
      a0: 44,
      pts: mk(kuiperBelt(N2), [0.62, 0.74, 0.95], 2.8, N2),
      size: 2.8,
      lo: 1.2 * AU,
      hi: 7 * AU,
      max: 0.8,
      inn: [1.8, 2.8] /* z vnitřní soustavy by byl vidět jen jako tečky rozházené mezi hvězdami – proto až z odstupu */,
      a: 0,
      lab: -1,
      col: '170, 198, 240',
    },
  ];
  /* Verze 2.1 – výraznost teček. Skutečnost: z přehledu soustavy by nebyla vidět žádná planetka (Ceres by z 7 AU nad Sluncem měla
     asi 11–12 mag, oko končí u 6 mag; ze Země je na hranici viditelnosti jen Vesta, nejvýš 5,2 mag). Tečky jsou tedy ilustrace
     a nemají přebíjet skutečná tělesa: stupeň 1 „nenápadné“ (výchozí) je kreslí menší a slabší než značky těles z katalogu
     a většinu z nich hodně slabě (málo velkých, mnoho malých); stupeň 2 „výrazné“ je vzhled z verze 1.8a; 0 = vypnuto. */
  const LV = [
    { k: 0, sz: 1, pw: 1 },
    { k: 0.5, sz: 0.8, pw: 2.2 },
    { k: 1, sz: 1, pw: 1 },
  ];
  const X = {
    lvl: 1,
    seen: {},
    belts,
    get on() {
      return X.lvl > 0;
    },
    set on(v) {
      X.lvl = v ? X.lvl || 1 : 0;
    },
    /* k čemu se průhlednost a velikost teček násobí (pro zkoušky a nápovědu) */
    level: () => LV[X.lvl],
  };
  /* jednou za snímek: průhlednost podle výšky kamery a zdánlivé velikosti pásu, poloha Slunce vůči kameře, čas */
  X.update = (C, F, alt, PR, dt) => {
    const sx = P[SUN * 3] - C[0],
      sy = P[SUN * 3 + 1] - C[1],
      sz = P[SUN * 3 + 2] - C[2],
      dSun = Math.hypot(sx, sy, sz);
    let busy = false;
    for (const b of belts) {
      const ratio = (b.a0 * AU) / Math.max(dSun, 1),
        apx = ratio * F /* poloměr pásu na obrazovce v bodech */,
        dens = Math.max(
          0.16,
          Math.min(1, apx / 300)
        ) /* malý prstenec = tečky přes sebe: slabší a menší, ať nesplynou v bílou skvrnu */,
        tg =
          X.on && !S.evSet
            ? b.max * sstep(b.lo, b.hi, alt) * sstep(7, 28, apx) * (1 - sstep(b.inn[0], b.inn[1], ratio))
            : 0;
      if (Math.abs(tg - b.a) > 0.002) {
        b.a += (tg - b.a) * Math.min(1, dt * 3.5);
        busy = true;
      } else b.a = tg;
      const u = b.pts.material.uniforms;
      b.pts.visible = b.a > 0.004;
      if (!b.pts.visible) continue;
      b.apx = apx;
      u.uA.value = b.a * dens * (X.lvl ? LV[X.lvl].k : 1);
      u.uPow.value = LV[X.lvl || 1].pw;
      u.uSize.value = b.size * Math.max(0.6, Math.min(1, apx / 220)) * LV[X.lvl || 1].sz;
      u.uOff.value.set(sx, sy, sz);
      u.uT.value = S.jd - epoch;
      u.uPx.value = Math.max(1, PR) * (S.txtK > 1 ? Math.min(1.5, S.txtK) : 1) * (S.kid ? 1.15 : 1);
      if (b.a > 0.3 && !X.seen[b.id]) {
        X.seen[b.id] = 1;
        S.bus.emit('belt', b.id);
      }
    }
    return busy;
  };
  /* popisek pásu ve 2D vrstvě: jedno jméno na pás, na místě prstence, které je na obrazovce nejníž (nejblíž k pozorovateli) */
  const CAND = 16;
  S.overlays.push((ctx, e) => {
    if (S.labMode === 0) return;
    const C = S.camPos;
    for (const b of belts) {
      if (b.a < 0.2 || !(b.apx > 120)) continue; /* malý prstenec: popisek by se pletl mezi jména těles */
      const pos = (k) => {
        const an = (k / CAND) * 6.2832,
          x = P[SUN * 3] + Math.cos(an) * b.a0 * AU - C[0],
          y = P[SUN * 3 + 1] - C[1],
          z = P[SUN * 3 + 2] + Math.sin(an) * b.a0 * AU - C[2],
          zz = x * e.fwd.x + y * e.fwd.y + z * e.fwd.z;
        if (zz <= 0) return null;
        const px = e.W / 2 + ((x * e.right.x + y * e.right.y + z * e.right.z) / zz) * e.F,
          py = e.H / 2 - ((x * e.up.x + y * e.up.y + z * e.up.z) / zz) * e.F;
        return px > 70 && px < e.W - 70 && py > 110 && py < e.H - 190 ? [px, py] : null;
      };
      let cur = b.lab >= 0 ? pos(b.lab) : null,
        best = b.lab,
        bp = cur;
      for (let k = 0; k < CAND; k++) {
        const q = pos(k);
        if (q && (!bp || q[1] > bp[1] + (cur ? 60 : 0))) {
          bp = q;
          best = k;
        }
      }
      if (!bp) continue;
      b.lab = best;
      const t = b.cs,
        k = S.txtK || 1;
      ctx.font = `italic ${12.5 * k}px system-ui, -apple-system, Segoe UI, sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = Math.min(1, (b.a / b.max) * 0.9);
      const w = ctx.measureText(t).width;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillText(t, bp[0] - w / 2 + 1, bp[1] + 14 * k + 1);
      ctx.fillStyle = `rgb(${b.col})`;
      ctx.fillText(t, bp[0] - w / 2, bp[1] + 14 * k);
      ctx.globalAlpha = 1;
    }
  });
  return X;
}
