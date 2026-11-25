// Pohled z povrchu s krajinou a oblohou (verze 2.2).
// Pořadí kreslení (render): 1) scéna (hvězdy, Slunce, tělesa) do pomocného obrazu; 2) obloha: rozptyl světla v atmosféře
// (shader SKY_FS ve čtvrtinovém rozlišení: jas oblohy L a propustnost T pro každý směr); 3) složení: scéna × T (zeslabení
// a zčervenání u obzoru, lom světla zvedne Slunce a hvězdy u obzoru) + L, hvězdy mizí podle jasu oblohy; 4) krajina
// (render/teren.js) přes to, osvětlená Sluncem (barva po průchodu atmosférou, stíny), světlem oblohy a světlem mateřské
// planety (popel), se vzdušnou perspektivou z téže oblohy. Expozice se přizpůsobí světlu jako oko (poledne, soumrak, noc).
// Tělesa bez atmosféry: obloha černá, jen krajina. Venuše a Titan pod oblaky: zatažená obloha bez Slunce a hvězd.
import * as THREE from 'three';
import { B, P, SUN, par, kids, AU, MOON, EARTH } from '../core/sim.js';
import { AS } from '../core/asset.js';
import { ATM, ATM_NAD, OVERCAST, OBRI, krajinaMista, KR } from '../data/krajiny.js';
import { skyDir, sunAt, hemi, groundExt, ssa } from './atmo.js';
import { buildTeren, buildTerenGen, buildRocks, buildTrees, seedOf, biome, nearRocks, rockGeo } from './teren.js';
import HI_IDS from '../data/hi.json';
import DEM from '../data/dem.json';
const DEG = Math.PI / 180,
  RS = 696000;
const VS = `in vec3 position; out vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const SKY_FS = `precision highp float;
in vec2 vUv;
layout(location = 0) out vec4 oL;
layout(location = 1) out vec4 oT;
uniform vec3 uRt, uUp, uFw, uS, uBR, uBM, uAM, uOZ, uAB, uG, uOcC;
uniform vec2 uTan;
uniform float uPR, uTop, uH0, uHR, uHM, uMode, uOcGlow, uPre;
const int NS = 20, NL = 6;
const float PI = 3.14159265;
vec2 sph(vec3 o, vec3 d, float r){ float b = dot(o, d), c = dot(o, o) - r * r, D = b * b - c; if (D < 0.0) return vec2(1e9, -1e9); float s = sqrt(D); return vec2(-b - s, -b + s); }
vec3 dens(float h){ return vec3(exp(-h / uHR), exp(-h / uHM), max(0.0, 1.0 - abs(h - 25.0) / 15.0)); }
vec3 ext(vec3 d){ return uBR * d.x + (uBM + uAM) * d.y + uOZ * d.z + uAB * d.x; }
vec3 sunT(vec3 p){
  if (sph(p, uS, uPR * 0.99999).y > 0.0) return vec3(0.0);
  float L = max(0.0, sph(p, uS, uPR + uTop).y), dt = L / float(NL);
  vec3 od = vec3(0.0);
  for (int j = 0; j < NL; j++){ vec3 x = p + uS * ((float(j) + 0.5) * dt); od += ext(dens(max(0.0, length(x) - uPR))) * dt; }
  return exp(-od);
}
void main(){
  vec2 nd = vUv * 2.0 - 1.0;
  vec3 d = normalize(uFw + nd.x * uTan.x * uRt + nd.y * uTan.y * uUp);
  float mu = dot(d, uS);
  if (uMode > 1.5) {
    /* zataženo (Venuše, Titan pod oblaky): rovnoměrná záře, nahoře o něco jasnější, směrem ke Slunci světlejší skvrna */
    float z = max(d.z, 0.0);
    oL = vec4(uPre * uOcC * (0.72 + 0.28 * sqrt(z)) * (1.0 + uOcGlow * exp((mu - 1.0) * 5.0)), 1.0);
    oT = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  if (d.z < 0.0005) { vec2 h = normalize(d.xy + vec2(1e-7)); d = normalize(vec3(h, 0.0005)); mu = dot(d, uS); }
  vec3 o = vec3(0.0, 0.0, uPR + uH0);
  float tm = max(0.0, sph(o, d, uPR + uTop).y);
  float pr = 3.0 / (16.0 * PI) * (1.0 + mu * mu);
  vec3 g2 = uG * uG, pm = 3.0 / (8.0 * PI) * (1.0 - g2) * (1.0 + mu * mu) / ((2.0 + g2) * pow(1.0 + g2 - 2.0 * uG * mu, vec3(1.5)));
  vec3 od = vec3(0.0), L = vec3(0.0);
  for (int i = 0; i < NS; i++){
    float a = float(i) / float(NS), b = float(i + 1) / float(NS), u0 = tm * a * a, u1 = tm * b * b, u = 0.5 * (u0 + u1), du = u1 - u0;
    vec3 x = o + d * u, dn = dens(max(0.0, length(x) - uPR)), e = ext(dn);
    L += exp(-(od + e * du * 0.5)) * sunT(x) * (uBR * dn.x * pr + uBM * dn.y * pm) * du;
    od += e * du;
  }
  /* jas se ukládá už vynásobený expozicí: v noci je fyzikální jas ~10⁻⁹ a poloviční přesnost obrazu by dala proužky */
  oL = vec4(L * uPre, 1.0);
  oT = vec4(exp(-od), 1.0);
}`;
/* tónová křivka: do 0,7 lineární, nad tím měkké rameno (jasné Slunce a led se nepřepálí do plochy) */
const TONE = `vec3 kTone(vec3 c){ float m = max(max(c.r, c.g), c.b); if (m <= 0.7) return c;
  float t = 0.7 + 0.3 * (1.0 - exp(-(m - 0.7) / 0.3)); /* zachová odstín (oranžový západ nezbělá), jen velmi jasné místo kolem Slunce bledne do bílé */
  return mix(c * (t / m), vec3(t), smoothstep(1.5, 12.0, m) * 0.9); }`;
const COMP_FS = `precision highp float;
in vec2 vUv;
out vec4 oC;
uniform sampler2D tScene, tL, tT;
uniform vec3 uRt, uUp, uFw, uMs, uNG;
uniform vec2 uTan;
uniform float uExp, uRefK, uMask, uOpq, uSat, uSunR;
uniform vec3 uS;
${TONE}
void main(){
  vec2 nd = vUv * 2.0 - 1.0;
  vec3 d = normalize(uFw + nd.x * uTan.x * uRt + nd.y * uTan.y * uUp), dTrue = d;
  vec2 uv = vUv;
  if (uRefK > 0.0) {
    /* lom světla (Bennett 1982): těleso vidíme výš, než skutečně je; z obrazu bereme bod o lom níž */
    float ea = degrees(asin(clamp(d.z, -1.0, 1.0)));
    if (ea > -2.0) {
      float e1 = max(ea, -1.0), r = uRefK * radians(1.0 / 60.0) / tan(radians(e1 + 7.31 / (e1 + 4.4)));
      vec2 hz = normalize(d.xy + vec2(1e-7));
      float et = radians(ea) - r;
      vec3 dt = vec3(hz * cos(et), sin(et));
      float z = dot(dt, uFw);
      if (z > 1e-3) uv = vec2(dot(dt, uRt) / z / uTan.x, dot(dt, uUp) / z / uTan.y) * 0.5 + 0.5;
      dTrue = dt;
    }
  }
  vec3 s = pow(texture(tScene, uv).rgb, vec3(2.2));
  vec3 Tt = texture(tT, vUv).rgb;
  vec3 Lr = texture(tL, vUv).rgb + uMs * (1.0 - Tt);
  vec3 L = kTone(Lr * uExp);
  float lb = dot(L, vec3(0.2126, 0.7152, 0.0722));
  L = max(vec3(0.0), mix(vec3(lb), L, uSat));
  /* kotouč Slunce: v obraze scény má jas nejvýš 1, ve skutečnosti je mnohem jasnější než obloha – zesílit, ať po zeslabení
     v atmosféře zůstane jasně oranžový a nezmizí v záři kolem sebe */
  float sm = 1.0 - smoothstep(uSunR * 0.85, uSunR * 1.25, acos(clamp(dot(dTrue, uS), -1.0, 1.0)));
  vec3 st = s * Tt * (1.0 - uOpq) * (1.0 + 80.0 * sm);
  float c = dot(st, vec3(0.2126, 0.7152, 0.0722));
  /* hvězda zmizí, když je slabší než jas oblohy kolem (práh kontrastu oka); Slunce ne */
  float m = mix(clamp(1.0 - uMask * lb / max(c, 1e-5), 0.0, 1.0), 1.0, sm);
  /* noční záře oblohy: u obzoru jasnější (van Rhijn); do prahu viditelnosti hvězd se nepočítá */
  vec3 ngl = uNG * (0.75 + 0.9 * pow(1.0 - clamp(d.z, 0.0, 1.0), 4.0));
  oC = vec4(pow(st * m + L + ngl, vec3(1.0 / 2.2)), 1.0);
}`;
const lin = (v) => Math.pow(v, 2.2);
const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
/* jas krajiny podle osvětlení (v násobcích pozemského poledne nad atmosférou): oko se přizpůsobí, ale ne úplně –
   poledne 0,25, Pluto v poledne asi 0,11, pozemský úplněk 0,0035 (zelené louky v měsíčním světle jsou šedé a tmavé) */
/* 2.2b: strmější (Pluto v poledne asi 16 % pozemského poledne – šero, ne „prosluněná“ pláň) */
const brightOf = (E) => Math.max(0.004, Math.min(0.42, 0.25 + 0.06 * Math.log10(Math.max(1e-14, E))));
/* noční vidění: oko přivyklé tmě vidí obzor a světlý sníh i bez Měsíce (jas krajiny s albedem 0,2 asi 3,5 % poledne) */
const NIGHT_B = 0.024,
  NIGHT_TINT = [0.82, 0.93, 1.18];
/* 2.3: větry v oblačné vrstvě (m/s, kladně = na východ) podle šířky φ (°). Velikosti z NSSDCA fact sheets: Jupiter do
   150 m/s pod 30° a 40 m/s nad 30°, Saturn 400 / 150, Uran 0–250, Neptun 0–580; rovník Saturnu na východ až 450 m/s
   (NASA PIA05386). Směr podle šířky (střídavé pásy Jupiteru a Saturnu, rovník Uranu a Neptunu proti otáčení, Venuše nad
   oblaky na západ asi 100 m/s) je z paměti – neověřeno. L = velikost oka (~ výška stupnice H: J 27, S 59,5, U 27,7,
   N 19–20 km, NSSDCA), C = kontrast oblačnosti, A = vlnění výšek (m). */
const sm01 = (x) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};
const DECKW = {
  jupiter: { u: (f) => (f < 30 ? 130 : 38) * Math.cos((f * Math.PI) / 12), L: 24000, C: 0.34, A: 380 },
  saturn: {
    u: (f) => (f < 30 ? 400 * Math.cos((f * Math.PI) / 60) : 150 * Math.cos(((f - 30) * Math.PI) / 15)),
    L: 48000,
    C: 0.2,
    A: 420,
  },
  uranus: { u: (f) => (f < 60 ? -100 + 350 * sm01(f / 60) : (250 * (90 - f)) / 30), L: 30000, C: 0.1, A: 220 },
  neptune: { u: (f) => (f < 70 ? -400 + 650 * sm01(f / 70) : (250 * (90 - f)) / 20), L: 20000, C: 0.2, A: 260 },
  venus: { u: () => -100, L: 30000, C: 0.12, A: 150 },
  titan: { u: () => 20, L: 30000, C: 0.06, A: 60 },
};
const DECK_PARS = `
uniform float uTime, uDeckL, uDeckC, uDeckA, uDeckTp;
uniform vec2 uWind;
uniform sampler2D tDeck;
/* velké vlnění: vzor nesený větrem, pomalu pulzuje */
/* kupy (buňky) nesené větrem, podél větru protažené 1,6×; pomalu „dýchají“ (pulz) */
vec2 deckUV(vec2 P, vec2 o) { vec2 q = (P - o) / uDeckL; return vec2(q.x / 1.6, q.y); }
float deckBig(vec2 P) {
  float n = texture2D(tDeck, deckUV(P, uWind * uTime)).r;
  float pul = 0.8 + 0.2 * sin(uTime * 0.23 + P.x * 2e-4 + P.y * 1.3e-4);
  return uDeckA * (n - 0.45) * 2.0 * pul * (1.0 - smoothstep(25000.0, 90000.0, length(P)));
}`;
const DECK_COL = `float deckH = 0.0, deckM = 0.5;
{
  vec2 P = vWp.xz;
  float L = uDeckL, Tp = uDeckTp;
  deckH = deckBig(P);
  /* barva podle téže kupy: vršky světlejší, propady tmavší (hlouběji, víc pohlcování) */
  float hb = texture2D(tDeck, deckUV(P, uWind * uTime)).r;
  float f1 = fract(uTime / Tp), f2 = fract(uTime / Tp + 0.5), w1 = 1.0 - abs(2.0 * f1 - 1.0), w2 = 1.0 - w1;
  vec2 o1 = uWind * (f1 - 0.5) * Tp, o2 = uWind * (f2 - 0.5) * Tp,
    sh = vec2(-uWind.y, uWind.x) * 0.18 + uWind * 0.25;
  /* jemná struktura: menší zkroucené obláčky (víry) ve dvou střídajících se fázích */
  vec2 u1 = deckUV(P, o1) * 3.0, u2 = deckUV(P, o2) * 3.0 + vec2(0.37, 0.61);
  vec2 q1 = texture2D(tDeck, u1 * 0.25).gb - 0.5, q2 = texture2D(tDeck, u2 * 0.25 + 0.21).gb - 0.5;
  float c1 = texture2D(tDeck, u1 + 1.2 * q1).r, c2 = texture2D(tDeck, u2 + 1.2 * q2).r;
  vec2 v1 = (P - o1 - sh * (f1 - 0.5) * Tp) * 12.0 / L, v2 = (P - o2 - sh * (f2 - 0.5) * Tp) * 12.0 / L + vec2(0.13, 0.71);
  float e1 = texture2D(tDeck, v1 + 2.0 * q1).a, e2 = texture2D(tDeck, v2 + 2.0 * q2).a;
  /* prolnutí se zachovaným kontrastem (jinak by vzor v půlce fáze vybledl) */
  float nr = inversesqrt(w1 * w1 + w2 * w2);
  float cl = (c1 * w1 + c2 * w2 - 0.5) * nr, ed = (e1 * w1 + e2 * w2 - 0.5) * nr;
  float dd = length(vWp - cameraPosition), nearK = 1.0 - smoothstep(3000.0, 30000.0, dd);
  deckM = clamp(0.5 + 0.8 * (hb - 0.45) + 0.35 * cl * nearK + 0.25 * ed * (1.0 - smoothstep(1500.0, 8000.0, dd)), 0.0, 1.0);
  diffuseColor.rgb *= 1.0 + uDeckC * (deckM - 0.5) * 2.0;
  /* propady do sytější barvy (světlo jde hlouběji a víc se pohltí) */
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * diffuseColor.rgb * 1.6, uDeckC * 1.5 * smoothstep(0.5, 0.05, hb));
  /* vršky kup bělejší (krystalky čpavku a vody odrážejí víc), jako oblaka z letadla */
  float lw = dot(diffuseColor.rgb, vec3(0.3, 0.5, 0.2));
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(lw * 1.25 + 0.03), uDeckC * 1.2 * smoothstep(0.55, 0.95, deckM));
  /* drobné vršky a údolí jen do stínování (ne do tvaru) */
  deckH += uDeckA * 0.1 * cl * nearK + 5.0 * ed * (1.0 - smoothstep(1500.0, 6000.0, dd));
}`;
const DECK_BUMP = `
{
  vec3 sp = -vViewPosition, sX = dFdx(sp), sY = dFdy(sp), N = normal;
  vec3 R1 = cross(sY, N), R2 = cross(N, sX);
  float det = dot(sX, R1) * faceDirection;
  vec2 dH = vec2(dFdx(deckH), dFdy(deckH));
  vec3 g = sign(det) * (dH.x * R1 + dH.y * R2);
  normal = normalize(abs(det) * N - g);
}`;
const DECK_LIGHT = `
{
  /* dopředný rozptyl (stříbrné okraje při pohledu proti Slunci, víc v řidších místech) a měkký lesk na vrcholcích;
     v pásmu rozptylu jemné pulzování */
  vec3 vv = normalize(vViewPosition);
  float cp = dot(uSunV, vv),
    fwd = pow(max(0.0, -cp), 9.0) * (0.5 + 0.9 * (1.0 - deckM)) * (1.0 + 0.08 * sin(uTime * 0.9 + deckM * 11.0)),
    sheen = pow(max(0.0, dot(normal, normalize(uSunV + vv))), 30.0) * 0.18;
  reflectedLight.directDiffuse *= 1.0 + uSunFrac * (1.3 * fwd + sheen);
}`;
export function createKrajina(S, renderer) {
  let terScene = null,
    ter = null,
    key = '',
    mode = 'bez',
    atm = null,
    oc = null,
    rtScene = null,
    rtSky = null,
    shadowsOn = false,
    lastHemiKey = '',
    hm = null,
    mapCache = new Map(),
    stat = {};
  const black = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  black.needsUpdate = true;
  /* společné uniformy materiálů krajiny: mlha (vzdušná perspektiva) z obrazu oblohy, expozice, detail u nohou */
  const U = {
    uSkyL: { value: black },
    uRes: { value: new THREE.Vector2(1, 1) },
    uExpS: { value: 0 },
    uExt: { value: new THREE.Vector3() },
    uFogOn: { value: 0 },
    uDet: { value: black },
    uDetK: { value: 0 },
    uDetS: { value: 0.5 },
    uNight: { value: 0 },
    uNG: { value: new THREE.Vector3() },
    uSunFrac: { value: 1 },
    uLS: { value: 0 },
    uSunV: { value: new THREE.Vector3(0, 1, 0) },
    uHobs: { value: 0 },
    uHsc: { value: 8 },
    /* 2.3: pohyb oblačné vrstvy obrů */
    uTime: { value: 0 },
    uWind: { value: new THREE.Vector2() },
    uDeckL: { value: 22000 },
    uDeckC: { value: 0.3 },
    uDeckA: { value: 120 },
    uDeckTp: { value: 120 },
    tDeck: { value: black },
  };
  const patch = (mat, detail, vis, deck) => {
    if (deck) mat.defines = { ...(mat.defines || {}), DECK: 1 };
    mat.customProgramCacheKey = () => `kraj${detail ? 1 : 0}${vis ? 1 : 0}${deck ? 1 : 0}`;
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader
        .replace(
          '#include <common>',
          `#include <common>\nvarying vec3 vWp;${vis ? '\nattribute float vis;\nvarying float vVis;' : ''}${deck ? DECK_PARS : ''}`
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>${vis ? '\n vVis = vis;' : ''}${deck ? '\n transformed.y += deckBig(transformed.xz);' : ''}`
        )
        .replace(
          '#include <project_vertex>',
          '#include <project_vertex>\n vec4 wpK = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\n wpK = instanceMatrix * wpK;\n#endif\n vWp = (modelMatrix * wpK).xyz;'
        );
      sh.fragmentShader = sh.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>\nvarying vec3 vWp;${vis ? '\nvarying float vVis;' : ''}\nuniform sampler2D uSkyL, uDet;\nuniform vec2 uRes;\nuniform float uExpS, uFogOn, uDetK, uDetS, uNight, uSunFrac, uLS, uHobs, uHsc;\nuniform vec3 uExt, uNG, uSunV;\n${TONE}${deck ? DECK_PARS : ''}`
        )
        .replace(
          '#include <color_fragment>',
          deck
            ? `#include <color_fragment>\n${DECK_COL}`
            : detail
              ? `#include <color_fragment>\n{ float dd = length(vWp.xz - cameraPosition.xz); float fd = uDetK * (1.0 - smoothstep(12.0, 60.0, dd));
               float t1 = texture2D(uDet, vWp.xz * uDetS).r, t2 = texture2D(uDet, vWp.xz * uDetS * 0.173 + 0.37).r;
               diffuseColor.rgb *= mix(1.0, (0.55 + 0.9 * t1) * (0.8 + 0.4 * t2), fd); }`
              : '#include <color_fragment>'
        )
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>${deck ? DECK_BUMP : ''}`)
        .replace(
          '#include <lights_fragment_end>',
          `#include <lights_fragment_end>${vis ? '\n reflectedLight.directDiffuse *= mix(1.0, vVis, uSunFrac);' : ''}${deck ? DECK_LIGHT : ''}
           /* prachový regolit bez vzduchu nesvítí jako Lambertova plocha, ale podle Lommela a Seeligera (jas ~ μ0/(μ0+μ)):
              Měsíc je i při nízkém Slunci a při pohledu k obzoru světlý, směrem od Slunce ještě světlejší (opoziční efekt) */
           if (uLS > 0.0) {
             vec3 nn = normalize(normal), vv = normalize(vViewPosition);
             float mu0 = max(dot(nn, uSunV), 0.0), mu = max(dot(nn, vv), 0.03),
               ph = acos(clamp(dot(uSunV, vv), -1.0, 1.0)),
               ls = min(6.0, 2.0 / (mu0 + mu + 0.04)) * (1.0 + 0.5 * exp(-ph / 0.09)) * (1.0 - 0.25 * ph / 3.1416);
             reflectedLight.directDiffuse *= mix(1.0, ls, uLS * uSunFrac);
           }`
        )
        .replace(
          '#include <opaque_fragment>',
          `#include <opaque_fragment>
           { float dk = length(vViewPosition) * 0.001;
             /* 2.3: opar podle výšky – cesta k místu hluboko pod pozorovatelem (pohled z Olympu) vede hustším vzduchem */
             float h1 = uHobs, h2 = max(0.0, uHobs + (vWp.y - cameraPosition.y) * 0.001), dh = h1 - h2,
               dens = abs(dh) > 0.02 ? uHsc * (exp(-h2 / uHsc) - exp(-h1 / uHsc)) / dh : exp(-h1 / uHsc);
             vec3 Tf = exp(-uExt * dk * dens);
             vec3 Lh = kTone(texture2D(uSkyL, gl_FragCoord.xy / uRes).rgb * uExpS) + uNG * 1.2;
             vec3 c = kTone(gl_FragColor.rgb);
             /* v noci barvy blednou (vidění tyčinkami) */
             float lc = dot(c, vec3(0.2126, 0.7152, 0.0722));
             c = mix(c, lc * vec3(0.86, 0.95, 1.12), uNight * 0.8);
             gl_FragColor.rgb = c * Tf + Lh * (1.0 - Tf) * uFogOn; }`
        );
    };
    return mat;
  };
  /* 2.3: pohyb oblačné vrstvy obrů – „matematický trik“: šumová textura posouvaná větrem ve dvou střídajících se fázích
     (flow map: každá fáze se posune nejvýš o půl periody, prolnutí skryje návrat), zkroucená druhou texturou (víry),
     drobné víry rychleji a se střihem; jemné vlnění výšek ve vrcholech (pulzuje), reliéf ze šumu jen ve stínování
     (normála z derivací), dopředný rozptyl a lesk proti Slunci. Rychlost a směr větru podle šířky místa. */
  let deckOn = false,
    deckWrap = 1e4,
    deckTex = null;
  function deckNoise() {
    if (deckTex) return deckTex;
    const n = 256,
      d = new Uint8Array(n * n * 4);
    /* periodický hodnotový šum (perioda p buněk na 256 px) */
    const hv = (ix, iy, sd) => {
      let h = Math.imul(ix * 374761393 + iy * 668265263 + sd * 2246822519, 1);
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    };
    const vn = (x, y, p, sd) => {
      const fx = (x / n) * p,
        fy = (y / n) * p,
        x0 = Math.floor(fx),
        y0 = Math.floor(fy),
        tx = fx - x0,
        ty = fy - y0,
        sx = tx * tx * (3 - 2 * tx),
        sy = ty * ty * (3 - 2 * ty),
        a = hv(x0 % p, y0 % p, sd),
        b = hv((x0 + 1) % p, y0 % p, sd),
        c = hv(x0 % p, (y0 + 1) % p, sd),
        e = hv((x0 + 1) % p, (y0 + 1) % p, sd);
      return a + (b - a) * sx + (c - a) * sy + (a - b - c + e) * sx * sy;
    };
    const fb = (x, y, p0, oct, sd, ridge) => {
      let s = 0,
        w = 0.5,
        t = 0;
      for (let k = 0, p = p0; k < oct; k++, p *= 2) {
        let v = vn(x, y, p, sd + k * 17);
        if (ridge) v = 1 - Math.abs(2 * v - 1);
        s += w * v;
        t += w;
        w *= 0.5;
      }
      return s / t;
    };
    /* buňky (Worleyho šum, 8 × 8 na dlaždici, periodický): kupy oblaků s klenutým vrškem, mezi nimi tmavší propady */
    const P8 = 8,
      cs = n / P8,
      pts = [];
    for (let j = 0; j < P8; j++)
      for (let i = 0; i < P8; i++)
        pts.push([(i + 0.15 + 0.7 * hv(i, j, 31)) * cs, (j + 0.15 + 0.7 * hv(i, j, 37)) * cs]);
    const cell = (x, y) => {
      const ci = Math.floor(x / cs),
        cj = Math.floor(y / cs);
      let f1 = 1e9,
        f2 = 1e9;
      for (let dj = -1; dj <= 1; dj++)
        for (let di = -1; di <= 1; di++) {
          const ii = ci + di,
            jj = cj + dj,
            pt = pts[(((jj % P8) + P8) % P8) * P8 + (((ii % P8) + P8) % P8)],
            px = pt[0] + Math.floor(ii / P8) * n,
            py = pt[1] + Math.floor(jj / P8) * n,
            dd = Math.hypot(x - px, y - py);
          if (dd < f1) {
            f2 = f1;
            f1 = dd;
          } else if (dd < f2) f2 = dd;
        }
      /* měkké propady (nulový sklon na hranici buněk) a zaoblený vršek */
      const e = Math.max(0, Math.min(1, ((f2 - f1) / (f2 + f1)) * 2.2));
      return e * e * (3 - 2 * e);
    };
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const k = (y * n + x) * 4,
          /* kupa zkroucená šumem, aby buňky nebyly mnohoúhelníky */
          wx = x + (fb(x, y, 4, 3, 41, false) - 0.5) * cs * 0.9,
          wy = y + (fb(x, y, 4, 3, 43, false) - 0.5) * cs * 0.9,
          c = 0.72 * cell(((wx % n) + n) % n, ((wy % n) + n) % n) + 0.28 * fb(x, y, 16, 3, 1, false);
        d[k] = Math.max(0, Math.min(255, c * 255));
        d[k + 1] = fb(x, y, 2, 4, 9, false) * 255;
        d[k + 2] = fb(x, y, 2, 4, 13, false) * 255;
        d[k + 3] = Math.max(0, Math.min(255, (fb(x, y, 32, 3, 21, true) - 0.5) * 2.2 * 255 + 128));
      }
    const t = new THREE.DataTexture(d, n, n, THREE.RGBAFormat);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.needsUpdate = true;
    return (deckTex = t);
  }
  function deckSetup(b, q, deck) {
    deckOn = !!deck;
    if (!deck) return;
    const id = b.id,
      p = DECKW[id] || DECKW.jupiter,
      u = p.u(Math.abs(q.lat)),
      L = p.L;
    U.tDeck.value = deckNoise();
    U.uWind.value.set(u, 0);
    U.uDeckL.value = L;
    U.uDeckC.value = p.C;
    U.uDeckA.value = p.A;
    /* perioda prolínání: posun za půl periody ~ třetina oka */
    const sp = Math.max(5, Math.abs(u));
    U.uDeckTp.value = Math.max(20, Math.min(400, (0.6 * L) / sp));
    /* čas se přetočí, až vítr posune vzor o celé dlaždice (64 × L) – bez skoku; perioda prolínání se vejde celá */
    const Tw = (64 * L) / sp;
    deckWrap = Math.max(U.uDeckTp.value, Math.round(Tw / U.uDeckTp.value) * U.uDeckTp.value);
    U.uWind.value.x = Math.sign(u || 1) * ((64 * L) / deckWrap);
  }
  /* --- obloha a složení --- */
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const orth = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const v3 = () => ({ value: new THREE.Vector3() });
  const skyMat = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: VS,
    fragmentShader: SKY_FS,
    uniforms: {
      uRt: v3(),
      uUp: v3(),
      uFw: v3(),
      uS: v3(),
      uBR: v3(),
      uBM: v3(),
      uAM: v3(),
      uOZ: v3(),
      uAB: v3(),
      uG: v3(),
      uOcC: v3(),
      uTan: { value: new THREE.Vector2(1, 1) },
      uPR: { value: 6371 },
      uTop: { value: 100 },
      uH0: { value: 0.002 },
      uHR: { value: 8 },
      uHM: { value: 1.2 },
      uMode: { value: 0 },
      uOcGlow: { value: 0 },
      uPre: { value: 1 },
    },
    depthTest: false,
    depthWrite: false,
  });
  const compMat = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: VS,
    fragmentShader: COMP_FS,
    uniforms: {
      tScene: { value: null },
      tL: { value: null },
      tT: { value: null },
      uRt: skyMat.uniforms.uRt,
      uUp: skyMat.uniforms.uUp,
      uFw: skyMat.uniforms.uFw,
      uTan: skyMat.uniforms.uTan,
      uMs: v3(),
      uExp: { value: 1 },
      uRefK: { value: 0 },
      uMask: { value: 1 },
      uOpq: { value: 0 },
      uSat: { value: 1 },
      uSunR: { value: 0.0047 },
      uNG: { value: new THREE.Vector3() },
      uS: skyMat.uniforms.uS,
    },
    depthTest: false,
    depthWrite: false,
  });
  const skyScene = new THREE.Scene(),
    compScene = new THREE.Scene();
  const m1 = new THREE.Mesh(tri, skyMat),
    m2 = new THREE.Mesh(tri, compMat);
  m1.frustumCulled = m2.frustumCulled = false;
  skyScene.add(m1);
  compScene.add(m2);
  /* --- krajina: kamera, světla --- */
  const terCam = new THREE.PerspectiveCamera(60, 1, 0.05, 4e5);
  terCam.matrixAutoUpdate = false;
  const sunL = new THREE.DirectionalLight(0xffffff, 1),
    psL = new THREE.DirectionalLight(0xffffff, 0),
    hemL = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
  sunL.castShadow = true;
  sunL.shadow.mapSize.set(2048, 2048);
  sunL.shadow.bias = -0.0004;
  sunL.shadow.normalBias = 0.04;
  /* --- mapy těles pro barvu půdy --- */
  function loadMap(id) {
    if (mapCache.has(id)) return mapCache.get(id);
    const pr = new Promise((res) => {
      const im = new Image();
      im.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = im.naturalWidth;
          c.height = im.naturalHeight;
          const g = c.getContext('2d', { willReadFrequently: true });
          g.drawImage(im, 0, 0);
          const d = g.getImageData(0, 0, c.width, c.height).data;
          /* průměrná lineární jasnost mapy (kvůli převodu na skutečné albedo půdy) */
          let sm = 0,
            n = 0;
          for (let y = 0; y < c.height; y += Math.max(1, c.height >> 6))
            for (let x = 0; x < c.width; x += Math.max(1, c.width >> 7)) {
              const k = (y * c.width + x) * 4;
              sm += 0.2126 * lin(d[k] / 255) + 0.7152 * lin(d[k + 1] / 255) + 0.0722 * lin(d[k + 2] / 255);
              n++;
            }
          const m = { w: c.width, h: c.height, d, mean: sm / n };
          pr.map = m;
          res(m);
        } catch (e) {
          /* soubor z file:// bez vložených dat: obrázek nejde číst, barva půdy zůstane z katalogu */
          res(null);
        }
      };
      im.onerror = () => res(null);
      /* podrobnější mapa (maps/hi), kde je a kde to paměť unese (ne telefon) */
      const hi = (HI_IDS.includes ? HI_IDS.includes(id) : HI_IDS[id]) && !document.body.classList.contains('mob');
      im.src = AS((hi ? 'maps/hi/' : 'maps/') + id + '.webp');
    });
    mapCache.set(id, pr);
    return pr;
  }
  /* výškové mapy (Měsíc LOLA, Mars MOLA): celé těleso 4 body na stupeň + výřezy 16 bodů na stupeň kolem známých míst */
  const demCache = new Map();
  const readPx = (src) =>
    new Promise((res) => {
      fetch(AS(src))
        .then((r) => r.blob())
        .then((b) => createImageBitmap(b, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' }))
        .then((bm) => {
          const c = document.createElement('canvas');
          c.width = bm.width;
          c.height = bm.height;
          const g = c.getContext('2d', { willReadFrequently: true });
          g.drawImage(bm, 0, 0);
          const d = g.getImageData(0, 0, c.width, c.height).data,
            h = new Float32Array(c.width * c.height);
          for (let k = 0; k < h.length; k++) h[k] = d[k * 4] * 256 + d[k * 4 + 1];
          res({ w: c.width, h: c.height, v: h });
        })
        .catch(() => res(null));
    });
  function loadDem(id) {
    if (!DEM[id]) return Promise.resolve(null);
    if (demCache.has(id)) return demCache.get(id);
    const I = DEM[id],
      pr = Promise.all([readPx('maps/dem/' + id + '.webp'), readPx('maps/dem/' + id + '_mista.webp')]).then(
        ([g, t]) => {
          if (!g) return null;
          const bil = (img, ox, oy, fx, fy, wrapW) => {
            const x0 = Math.floor(fx),
              y0 = Math.floor(fy),
              tx = fx - x0,
              ty = fy - y0,
              X = (x) => (wrapW ? ((x % wrapW) + wrapW) % wrapW : Math.max(0, Math.min(img.w - 1, x))),
              Y = (y) => Math.max(0, Math.min(img.h - 1, y)),
              v = (x, y) => img.v[(oy + Y(y)) * img.w + ox + X(x)];
            return (
              (v(x0, y0) * (1 - tx) + v(x0 + 1, y0) * tx) * (1 - ty) +
              (v(x0, y0 + 1) * (1 - tx) + v(x0 + 1, y0 + 1) * tx) * ty
            );
          };
          const glob = { w: g.w, h: g.h, v: g.v };
          const m = {
            /* výška (m) v šířce a délce (radiány) */
            at(la, lo) {
              const laD = la / DEG,
                loD = (((lo / DEG) % 360) + 360) % 360;
              let hg = bil(glob, 0, 0, loD * I.ppd - 0.5, (90 - laD) * I.ppd - 0.5, g.w);
              if (t)
                for (const tl of I.tiles) {
                  const fy = (90 - laD) * I.mppd - 0.5 - tl.r0,
                    fx = ((((loD * I.mppd - 0.5 - tl.c0) % 5760) + 5760) % 5760) % 5760;
                  if (fx < 0 || fy < 0 || fx > I.T - 1.001 || fy > I.T - 1.001) continue;
                  const e = Math.min(fx, fy, I.T - 1 - fx, I.T - 1 - fy),
                    w = Math.min(1, e / 10);
                  const ht = (() => {
                    const x0 = Math.floor(fx),
                      y0 = Math.floor(fy),
                      tx = fx - x0,
                      ty = fy - y0,
                      v = (x, y) => t.v[(tl.y + y) * t.w + tl.x + x];
                    return (
                      (v(x0, y0) * (1 - tx) + v(x0 + 1, y0) * tx) * (1 - ty) +
                      (v(x0, y0 + 1) * (1 - tx) + v(x0 + 1, y0 + 1) * tx) * ty
                    );
                  })();
                  hg = hg * (1 - w) + ht * w;
                  m.fine = Math.max(m.fine || 0, w);
                  break;
                }
              return hg + I.h0;
            },
            res: 0,
          };
          pr.dem = m;
          return m;
        }
      );
    demCache.set(id, pr);
    return pr;
  }
  const demNow = (id) => {
    const p = demCache.get(id);
    return p && p.dem ? p.dem : null;
  };
  const mapNow = (id) => {
    const p = mapCache.get(id);
    return p && p.map ? p.map : null;
  };
  /* Země: nestát v moři – nejbližší pevnina (posun se ohlásí) */
  function adjust(i, lat, lon) {
    const b = B[i];
    if (b.id !== 'earth') return null;
    const m = mapNow('earth');
    if (!m) return null;
    const px = (la, lo) => {
      const x = Math.floor(((((lo / 360 + 0.5) % 1) + 1) % 1) * m.w),
        y = Math.max(0, Math.min(m.h - 1, Math.floor((0.5 - la / 180) * m.h))),
        k = (y * m.w + x) * 4;
      return biome(m.d[k], m.d[k + 1], m.d[k + 2]);
    };
    const land = (la, lo) => {
      const d = 180 / m.h;
      for (const [a, c] of [
        [0, 0],
        [d, 0],
        [-d, 0],
        [0, d],
        [0, -d],
      ])
        if (px(la + a, lo + c / Math.max(0.05, Math.cos(la * DEG))) === 'more') return false;
      return true;
    };
    if (land(lat, lon)) return null;
    /* hledání po kružnicích s krokem aspoň 0,1° do vzdálenosti 60° (střed Tichého oceánu) */
    const step = Math.max(180 / m.h, 0.1);
    for (let r = 1; r < 600; r++) {
      let best = null;
      for (let k = 0; k < 8 * r; k++) {
        const t = (k / (8 * r)) * Math.PI * 2,
          la = lat + r * step * Math.cos(t),
          lo = lon + (r * step * Math.sin(t)) / Math.max(0.05, Math.cos(lat * DEG));
        if (Math.abs(la) > 89.5) continue;
        if (land(la, lo)) {
          best = [la, ((lo + 540) % 360) - 180];
          break;
        }
      }
      if (best) {
        const km = Math.round(r * step * 111.2);
        return {
          lat: best[0],
          lon: best[1],
          msg: `🌊 Tady by sis stoupl do moře – přistáváš na nejbližší pevnině, asi ${km.toLocaleString('cs-CZ')} km odtud.`,
        };
      }
    }
    return null;
  }
  /* --- stavba krajiny pro místo --- */
  function modeOf(b, q) {
    if (OVERCAST[b.id]) return q.air ? 'zatazeno' : 'nad';
    if (ATM[b.id] && q.air) return 'jasno';
    return 'bez';
  }
  function dispose() {
    hProf = null;
    job = null;
    nearR = null;
    if (!terScene) return;
    terScene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
    terScene = null;
    ter = null;
  }
  function build(q) {
    const b = B[q.i],
      md = modeOf(b, q),
      k = `${q.i}|${q.lat.toFixed(5)}|${q.lon.toFixed(5)}|${md === 'nad' ? 'nad' : 'pod'}|${mapNow(b.id) ? 1 : 0}|${demNow(b.id) ? 1 : 0}`;
    if (k === key && terScene) return;
    key = k;
    dispose();
    /* jas mapy v místě (Titan: tmavé = duny) */
    let ml;
    const mp = mapNow(b.id);
    if (mp) {
      const x = Math.floor(((((q.lon / 360 + 0.5) % 1) + 1) % 1) * mp.w),
        y = Math.max(0, Math.min(mp.h - 1, Math.floor((0.5 - q.lat / 180) * mp.h))),
        k = (y * mp.w + x) * 4;
      ml = (0.2126 * mp.d[k] + 0.7152 * mp.d[k + 1] + 0.0722 * mp.d[k + 2]) / 255;
    }
    const T = md === 'nad' ? KR.mraky : krajinaMista(b, q.lat, ml),
      seed = seedOf(b.id, q.lat, q.lon),
      map = md === 'nad' ? null : mapNow(b.id);
    const col = md === 'nad' ? (b.id === 'venus' ? [0.95, 0.88, 0.7] : [0.75, 0.5, 0.25]) : b.col;
    /* albedo půdy: barvy mapy přepočtené tak, aby průměr odpovídal albedu tělesa z katalogu (mapy jsou kvůli vzhledu
       zesvětlené); Země vlastní (albedo planety zahrnuje oblaka), obři a oblaka beze změny */
    const alb =
      b.id === 'earth'
        ? 1.15
        : md === 'nad' || OBRI.has(b.id) || !map
          ? 1
          : Math.max(0.25, Math.min(3, (b.albedo || 0.15) / map.mean));
    const gcol =
      md === 'nad' ? null : b.id === 'venus' ? [0.14, 0.12, 0.1] : b.id === 'titan' ? [0.26, 0.2, 0.13] : null;
    const dem = md === 'nad' ? null : demNow(b.id);
    if (dem) {
      /* rozlišení výškové mapy v místě: výřez kolem známého místa, jinak celé těleso */
      dem.fine = 0;
      dem.at(q.lat * DEG, q.lon * DEG);
      dem.res = (((Math.PI * b.R * 1000) / 180) * 1) / (dem.fine > 0.5 ? DEM[b.id].mppd : DEM[b.id].ppd);
    }
    /* 2.3: výška místa nad okolím z výškové mapy (Olympus Mons asi 21 km nad Tharsis): obzor je dál a níž, terén se staví až
       k němu, a vzduch nad pozorovatelem je řidší (obloha tmavší, opar slabší) */
    rFar = 0;
    hObs = 0.002;
    let relH = 0;
    if (dem) {
      const hs = dem.at(q.lat * DEG, q.lon * DEG),
        Rk = b.R;
      let lo = 0,
        n = 0;
      for (let a = 0; a < 16; a++) {
        const d = 320 / Rk,
          la = Math.asin(
            Math.sin(q.lat * DEG) * Math.cos(d) + Math.cos(q.lat * DEG) * Math.sin(d) * Math.cos((a * Math.PI) / 8)
          ),
          lo2 =
            q.lon * DEG +
            Math.atan2(
              Math.sin((a * Math.PI) / 8) * Math.sin(d) * Math.cos(q.lat * DEG),
              Math.cos(d) - Math.sin(q.lat * DEG) * Math.sin(la)
            );
        lo += dem.at(la, lo2);
        n++;
      }
      const rel = hs - lo / n;
      if (rel > 2000) rFar = Math.min(700000, 1.15 * Math.sqrt(2 * Rk * 1000 * rel));
      if (ATM[b.id]) hObs = Math.max(0.002, hs / 1000);
      relH = Math.round(rel);
    }
    const o = {
      T,
      R: b.R,
      rFar,
      seed,
      map,
      lat: q.lat,
      lon: q.lon,
      col,
      id: b.id,
      alb,
      ground: gcol,
      dem,
      lite: document.body.classList.contains('mob') || S.quality < 1,
    };
    const t0 = performance.now();
    ter = buildTeren(o);
    ter.ls = T.ls || 0;
    /* 2.3: profil obzoru (hvězdy a značky za terénem se nekreslí) */
    hProf = ter.horizon(0, 0, eyeOf(q));
    const mat = patch(new THREE.MeshLambertMaterial({ vertexColors: true }), true, true, ter.deck);
    deckSetup(b, q, ter.deck);
    const ground = new THREE.Mesh(ter.geo, mat);
    ground.receiveShadow = true;
    ground.castShadow = false;
    ground.frustumCulled = false;
    groundMesh = ground;
    lastO = o;
    shKey = null;
    terScene = new THREE.Scene();
    terScene.add(ground, sunL, sunL.target, psL, psL.target, hemL);
    /* kameny: barva podle půdy v místě (tmavší, méně prachu); stromy jen na Zemi */
    const c0 = [ter.geo.attributes.color.getX(0), ter.geo.attributes.color.getY(0), ter.geo.attributes.color.getZ(0)];
    /* kameny: na Marsu tmavý čedič s prachem, jinde podle půdy */
    o.rockCol =
      T.typ === 'venuse'
        ? [0.06, 0.05, 0.045]
        : T.typ === 'mars'
          ? [c0[0] * 0.55, c0[1] * 0.55, c0[2] * 0.62]
          : T.typ === 'titan'
            ? [0.5, 0.45, 0.4] /* ledové oblázky jsou světlejší než půda */
            : c0.map((v) => v * 0.8);
    const rocks = buildRocks(o, ter),
      trees = buildTrees(o, ter);
    rockMeshes = rocks;
    for (const m of [...rocks, ...trees]) {
      patch(m.material, false);
      m.frustumCulled = false;
      terScene.add(m);
    }
    sunL.shadow.camera.left = sunL.shadow.camera.bottom = T.maly ? -40 : -110;
    sunL.shadow.camera.right = sunL.shadow.camera.top = T.maly ? 40 : 110;
    sunL.shadow.camera.near = 1;
    sunL.shadow.camera.far = 3000;
    sunL.shadow.camera.updateProjectionMatrix();
    visKey = null;
    U.uDet.value = detailTex(T.typ);
    U.uDetK.value = T.typ === 'mraky' ? 0 : 0.55;
    U.uDetS.value = T.typ === 'zeme' ? 0.9 : 0.45;
    stat = {
      typ: T.typ,
      wind: deckOn ? Math.round(U.uWind.value.x) : 0,
      ms: Math.round(performance.now() - t0),
      rocks: rocks.reduce((s, m) => s + m.count, 0),
      trees: trees.reduce((s, m) => s + m.count, 0),
      map: !!map,
      rMax: ter.rMax,
    };
    stat.dem = dem ? Math.round(dem.res) : 0;
    stat.relH = relH;
    stat.hObs = hObs;
    if (!map && md !== 'nad')
      loadMap(b.id).then((m) => {
        if (m && S.surf && S.surf.i === q.i) S.wake();
      });
    if (!dem && DEM[b.id] && md !== 'nad')
      loadDem(b.id).then((m) => {
        if (m && S.surf && S.surf.i === q.i) S.wake();
      });
  }
  /* detail půdy u nohou: procedurální textura podle typu (zrnitost, oblázky, tráva) */
  const detCache = new Map();
  function detailTex(typ) {
    if (detCache.has(typ)) return detCache.get(typ);
    const n = 256,
      d = new Uint8Array(n * n * 4);
    let s = 12345;
    const rnd = () => ((s = (Math.imul(s, 1103515245) + 12345) | 0) >>> 0) / 4294967296;
    const f = new Float32Array(n * n).fill(0.5);
    /* skvrny různých velikostí (opakovatelné, dlaždice navazují) */
    const blob = (cx, cy, r, v) => {
      const R = Math.ceil(r);
      for (let y = -R; y <= R; y++)
        for (let x = -R; x <= R; x++) {
          const q = (x * x + y * y) / (r * r);
          if (q > 1) continue;
          const k = ((cy + y + n) % n) * n + ((cx + x + n) % n);
          f[k] += v * (1 - q);
        }
    };
    const cnt = typ === 'zeme' ? 5000 : typ === 'titan' ? 900 : 2600;
    for (let k = 0; k < cnt; k++) {
      const r = typ === 'titan' ? 2 + rnd() * 6 : 0.8 + Math.pow(rnd(), 3) * 7;
      blob(Math.floor(rnd() * n), Math.floor(rnd() * n), r, (rnd() - 0.45) * (typ === 'zeme' ? 0.5 : 0.35));
    }
    if (typ === 'zeme')
      for (let k = 0; k < 9000; k++) {
        /* stébla: krátké svislé čárky */
        const x = Math.floor(rnd() * n),
          y = Math.floor(rnd() * n),
          l = 2 + Math.floor(rnd() * 5),
          v = (rnd() - 0.4) * 0.35;
        for (let j = 0; j < l; j++) f[((y + j) % n) * n + x] += v;
      }
    for (let k = 0; k < n * n; k++) {
      const v = Math.max(0, Math.min(255, Math.round(f[k] * 255)));
      d[k * 4] = d[k * 4 + 1] = d[k * 4 + 2] = v;
      d[k * 4 + 3] = 255;
    }
    const t = new THREE.DataTexture(d, n, n);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.needsUpdate = true;
    detCache.set(typ, t);
    return t;
  }
  /* --- světlo: Slunce, obloha, planeta nad hlavou --- */
  const enu = (d, f, o) => {
    o[0] = d[0] * f.e[0] + d[1] * f.e[1] + d[2] * f.e[2];
    o[1] = d[0] * f.no[0] + d[1] * f.no[1] + d[2] * f.no[2];
    o[2] = d[0] * f.n[0] + d[1] * f.n[1] + d[2] * f.n[2];
    return o;
  };
  /* část kotouče Slunce zakrytá tělesem j (plocha 0–1) */
  function cover(j) {
    const C = S.camPos,
      sx = P[SUN * 3] - C[0],
      sy = P[SUN * 3 + 1] - C[1],
      sz = P[SUN * 3 + 2] - C[2],
      mx = P[j * 3] - C[0],
      my = P[j * 3 + 1] - C[1],
      mz = P[j * 3 + 2] - C[2],
      ds = Math.hypot(sx, sy, sz),
      dm = Math.hypot(mx, my, mz);
    if (dm > ds) return 0;
    const r1 = Math.asin(Math.min(1, RS / ds)),
      r2 = Math.asin(Math.min(1, B[j].R / dm)),
      d = Math.acos(Math.max(-1, Math.min(1, (sx * mx + sy * my + sz * mz) / (ds * dm))));
    if (d >= r1 + r2) return 0;
    if (d <= Math.abs(r2 - r1)) return r2 >= r1 ? 1 : (r2 * r2) / (r1 * r1);
    const a = Math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1)),
      bb = Math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2));
    return (r1 * r1 * (a - Math.sin(2 * a) / 2) + r2 * r2 * (bb - Math.sin(2 * bb) / 2)) / (Math.PI * r1 * r1);
  }
  /* tělesa, která mohou svítit (planeta nad měsícem, velké měsíce nad planetou) nebo zakrýt Slunce */
  function near(i) {
    const o = [];
    if (par[i] >= 0 && par[i] !== SUN) o.push(par[i]);
    [...kids[i]]
      .filter((j) => B[j].type === 'moon')
      .sort((a, b) => B[b].R - B[a].R)
      .slice(0, 4)
      .forEach((j) => o.push(j));
    if (par[i] >= 0 && par[i] !== SUN)
      [...kids[par[i]]]
        .filter((j) => j !== i && B[j].R > 400)
        .slice(0, 4)
        .forEach((j) => o.push(j));
    return o;
  }
  const sE = [0, 0, 0],
    pE = [0, 0, 0],
    tmp = [0, 0, 0];
  let visKey = null,
    visT = 0,
    rockMeshes = [];
  const lsDir = new THREE.Vector3();
  /* stín terénu přepočítat, když se Slunce posune o víc než ~0,3° (nejvýš dvakrát za sekundu) */
  function sunShadow() {
    if (!ter || !ter.computeVis) return;
    const sl = [sE[0], sE[2], -sE[1]],
      now = performance.now();
    if (visKey && now - visT < 500) return;
    if (visKey && Math.hypot(sl[0] - visKey[0], sl[1] - visKey[1], sl[2] - visKey[2]) < 0.005) return;
    const t0 = performance.now();
    ter.computeVis(sl);
    shadeRocks();
    visKey = sl;
    visT = now;
    stat.visMs = Math.round(performance.now() - t0);
    {
      const va = ter.geo.attributes.vis.array;
      let sm = 0;
      for (let k = 0; k < va.length; k++) sm += va[k];
      stat.visMean = sm / va.length;
    }
  }
  /* kameny ve stínu terénu ztmavnout (mapa stínů pokrývá jen okolí 110 m a terén sám stín nevrhá) */
  function shadeRocks() {
    for (const m of rockMeshes) {
      const bs = m.userData.base,
        xz = m.userData.xz;
      if (!bs || !m.instanceColor) continue;
      const a = m.instanceColor.array;
      for (let k = 0; k < m.count; k++) {
        const w = 0.12 + 0.88 * ter.visAt(xz[k * 2] - ter.cx, xz[k * 2 + 1] + ter.cy);
        a[k * 3] = bs[k * 3] * w;
        a[k * 3 + 1] = bs[k * 3 + 1] * w;
        a[k * 3 + 2] = bs[k * 3 + 2] * w;
      }
      m.instanceColor.needsUpdate = true;
    }
  }
  /* hlavní výpočet za snímek: režim, expozice, barvy světel, uniformy */
  function update(q, v) {
    /* 2.3: přestavba mřížky kolem chodce běží po kouscích */
    if (job) {
      recenterStep(2);
      S.wake();
    }
    if (deckOn) {
      U.uTime.value = (performance.now() / 1000) % deckWrap;
      S.wake();
    }
    const b = B[q.i],
      f = S.surfSite(),
      C = S.camPos,
      md = modeOf(b, q);
    mode = md;
    atm = md === 'jasno' ? ATM[b.id] : md === 'nad' ? ATM_NAD[b.id] : null;
    oc = md === 'zatazeno' ? OVERCAST[b.id] : null;
    /* Slunce: směr, vzdálenost, zakrytí */
    tmp[0] = P[SUN * 3] - C[0];
    tmp[1] = P[SUN * 3 + 1] - C[1];
    tmp[2] = P[SUN * 3 + 2] - C[2];
    const dS = Math.hypot(tmp[0], tmp[1], tmp[2]);
    tmp[0] /= dS;
    tmp[1] /= dS;
    tmp[2] /= dS;
    enu(tmp, f, sE);
    const NB = near(q.i);
    let cov = 0;
    for (const j of NB) cov = Math.max(cov, cover(j));
    if (q.i === MOON) cov = Math.max(cov, cover(EARTH));
    const toa = (AU / dS) ** 2 * (1 - cov),
      sz = sE[2];
    /* pozorovatel ve výšce: na obrech nad oblaky, nad oblaky Venuše a Titanu výš */
    const h0 = md === 'nad' ? (b.id === 'venus' ? 0.5 : 2) : hObs + (q.hOff || 0) / 1000;
    /* atmosféra: propustnost pro Slunce, světlo oblohy (přepočet jen při pohybu Slunce o víc než 0,1°) */
    let Tsun = [1, 1, 1],
      Esky = [0, 0, 0],
      Lz = [0, 0, 0];
    if (atm) {
      Tsun = sunAt(atm, b.R, h0, sE, [0, 0, 0]);
      const hk = `${q.i}|${md}|${sE.map((x) => x.toFixed(3)).join(',')}`;
      if (hk !== lastHemiKey) {
        lastHemiKey = hk;
        hm = hemi(atm, b.R, h0, sE);
      }
      Esky = hm.E;
      Lz = hm.z;
    }
    /* planeta nebo měsíc na obloze: odražené světlo (Lambertova koule) */
    let bestE = 0,
      bestJ = -1;
    for (const j of NB) {
      const dx = P[j * 3] - C[0],
        dy = P[j * 3 + 1] - C[1],
        dz = P[j * 3 + 2] - C[2],
        d = Math.hypot(dx, dy, dz);
      tmp[0] = dx / d;
      tmp[1] = dy / d;
      tmp[2] = dz / d;
      enu(tmp, f, pE);
      if (pE[2] < -B[j].R / d) continue;
      const sx = P[SUN * 3] - P[j * 3],
        sy = P[SUN * 3 + 1] - P[j * 3 + 1],
        szz = P[SUN * 3 + 2] - P[j * 3 + 2],
        rs = Math.hypot(sx, sy, szz),
        ca = -(sx * dx + sy * dy + szz * dz) / (rs * d),
        al = Math.acos(Math.max(-1, Math.min(1, ca))),
        ph = (Math.sin(al) + (Math.PI - al) * Math.cos(al)) / Math.PI,
        E = (b.id === 'x' ? 0 : B[j].albedo || 0.3) * (AU / rs) ** 2 * (B[j].R / d) ** 2 * ph * (atm ? lum(Tsun) : 1);
      if (E > bestE) {
        bestE = E;
        bestJ = j;
      }
    }
    if (bestJ >= 0) {
      const d = [P[bestJ * 3] - C[0], P[bestJ * 3 + 1] - C[1], P[bestJ * 3 + 2] - C[2]],
        dn = Math.hypot(...d);
      enu([d[0] / dn, d[1] / dn, d[2] / dn], f, pE);
    }
    const pc = bestJ >= 0 ? (B[bestJ].col || [0.6, 0.6, 0.6]).map(lin) : [0, 0, 0],
      pcl = Math.max(1e-3, lum(pc)),
      Epl = pc.map((c) => (c / pcl) * bestE),
      plUp = bestJ >= 0 ? Math.max(0, pE[2]) : 0;
    /* zataženo: rozptýlené světlo pod oblaky */
    let Eoc = [0, 0, 0];
    if (oc) {
      const k = toa * oc.podil * Math.max(0, Math.min(1, (sz + 0.12) / 0.5)) ** 1.3;
      Eoc = oc.col.map((c) => c * k);
    }
    const Edir = Tsun.map((t) => (oc ? 0 : t * toa)),
      Eh = [0, 1, 2].map((k) => Edir[k] * Math.max(0, sz) + Esky[k] * toa + Epl[k] * plUp + Eoc[k]),
      E = lum(Eh),
      Xg = brightOf(E) / (0.2 * Math.max(E, 3e-6)); /* pod úplňkem se oko už dál nepřizpůsobí (jinak by noc zhnědla) */
    /* oko i fotoaparát se přizpůsobí i jasné obloze v záběru (západ Slunce): když by se obloha přepálila, expozice se
       sníží – krajina potmavne, obloha zůstane barevná (napůl mezi „podle země“ a „podle oblohy“) */
    let X = Xg;
    if (atm) {
      enu([v.fwd.x, v.fwd.y, v.fwd.z], f, tmp);
      const h = Math.hypot(tmp[0], tmp[1]) || 1,
        el = Math.max(0.035, Math.min(1.5, Math.asin(Math.max(-1, Math.min(1, tmp[2]))))),
        hz = [tmp[0] / h, tmp[1] / h, 0],
        /* nejjasnější barevná složka (modrá záře kolem Slunce na Marsu má malý jas, ale přepálila by se) */
        mx = (c) => Math.max(0.6 * lum(c), 0.45 * Math.max(c[0], c[1], c[2])),
        l1 = mx(skyDir(atm, b.R, h0, [hz[0] * Math.cos(el), hz[1] * Math.cos(el), Math.sin(el)], sE).L),
        l2 = mx(skyDir(atm, b.R, h0, [hz[0], hz[1], 0.035], sE).L),
        /* Slunce v záběru: světlá aureola kolem něj (10° od Slunce směrem k nadhlavníku) */
        sIn = tmp[0] * sE[0] + tmp[1] * sE[1] + tmp[2] * sE[2] > Math.cos((v.fov * 0.6 * Math.PI) / 180),
        an = [sE[0] * 0.985, sE[1] * 0.985, sE[2] * 0.985 + 0.17],
        anl = Math.hypot(an[0], an[1], an[2]),
        l3 = sIn && sE[2] > -0.05 ? mx(skyDir(atm, b.R, h0, [an[0] / anl, an[1] / anl, an[2] / anl], sE).L) * 0.7 : 0,
        Lv = Math.max(l1, l2, l3) * toa * (atm.gain || 1),
        Xs = 0.5 / (Math.PI * Math.max(1e-14, Lv));
      X = Xg * Math.pow(Math.min(1, Xs / Xg), 0.78);
      stat.Lv = Lv;
    }
    sunShadow();
    /* přisvětlení (☀ v liště): na povrchu zjasní krajinu i noční vidění; po vzletu se vrátí (ui/povrch.js) */
    const gm = 1 + 2.2 * (S.gamma || 0);
    X *= gm;
    /* krajina: světla (intenzita × π, Lambert dělí π) */
    const K = Math.PI * X;
    const sunUp = sz > -0.02 && !oc;
    sunL.color.setRGB(Edir[0] * K, Edir[1] * K, Edir[2] * K);
    sunL.intensity = sunUp ? 1 : 0;
    sunL.castShadow = sunUp && sz > 0.005 && shadowsOn;
    /* 2.3: stín jen kolem chodce; levné stíny – mapa stínů se překreslí jen při pohybu Slunce nebo chodce o kus dál */
    {
      const w = q.walk,
        wx = w ? Math.round(w.x / 8) * 8 : 0,
        wz = w ? Math.round(w.z / 8) * 8 : 0,
        wy = w ? w.ground : 0;
      sunL.position.set(wx + sE[0] * 800, wy + sE[2] * 800, wz - sE[1] * 800);
      sunL.target.position.set(wx, wy, wz);
      const sk = [wx, wz, Math.round(sE[0] * 400), Math.round(sE[1] * 400), Math.round(sE[2] * 400)].join(',');
      if (sk !== shKey) {
        shKey = sk;
        renderer.shadowMap.needsUpdate = true;
      }
    }
    psL.color.setRGB(Epl[0] * K, Epl[1] * K, Epl[2] * K);
    psL.intensity = bestJ >= 0 ? 1 : 0;
    psL.position.set(pE[0] * 800, pE[2] * 800, -pE[1] * 800);
    /* světlo oblohy: polokoule (three dělí π stejně jako u přímého světla) */
    const sky = [0, 1, 2].map((k) => (Esky[k] * toa + Eoc[k]) * K),
      gr = Eh.map((c) => c * 0.12 * K);
    /* noční vidění: chybějící světlo do jasu NIGHT_B doplní namodralé „okolní světlo“ (oko přivyklé tmě) */
    const Bn = NIGHT_B * gm,
      have = 0.2 * E * X,
      nvA = Math.max(0, Bn - have) / 0.2,
      nightF = Math.min(1, nvA / (Bn / 0.2));
    hemL.color.setRGB(
      sky[0] + Math.PI * nvA * NIGHT_TINT[0],
      sky[1] + Math.PI * nvA * NIGHT_TINT[1],
      sky[2] + Math.PI * nvA * NIGHT_TINT[2]
    );
    hemL.groundColor.setRGB(
      gr[0] + Math.PI * nvA * NIGHT_TINT[0] * 0.55,
      gr[1] + Math.PI * nvA * NIGHT_TINT[1] * 0.55,
      gr[2] + Math.PI * nvA * NIGHT_TINT[2] * 0.55
    );
    hemL.intensity = 1;
    U.uNight.value = nightF;
    /* noční záře oblohy (airglow a rozptýlené světlo hvězd; u obzoru jasnější) – jen se vzduchem; hvězdy kvůli ní nemizí */
    const ng = atm ? Bn * 0.42 * nightF : 0;
    compMat.uniforms.uNG.value.set(ng * NIGHT_TINT[0] * 0.8, ng * NIGHT_TINT[1] * 0.85, ng * NIGHT_TINT[2]);
    U.uNG.value.copy(compMat.uniforms.uNG.value);
    /* podíl Slunce na přímém světle: stín terénu (vrchol nevidí Slunce) ztlumí jen sluneční část */
    const ds = lum(Edir) * Math.max(0, sz),
      dp = lum(Epl) * plUp;
    U.uSunFrac.value = sunUp ? ds / (ds + dp + 1e-20) : 0;
    stat.night = nightF;
    /* směr ke Slunci v soustavě kamery krajiny (pro stínování regolitu) */
    U.uLS.value = ter && ter.ls !== undefined ? ter.ls : 0;
    lsDir.set(sE[0], sE[2], -sE[1]).transformDirection(terCam.matrixWorldInverse);
    U.uSunV.value.copy(lsDir);
    stat.gm = gm;
    /* obloha */
    const G = atm ? atm.gain || 1 : 1;
    const su = skyMat.uniforms,
      cu = compMat.uniforms;
    enu([v.right.x, v.right.y, v.right.z], f, tmp);
    su.uRt.value.set(tmp[0], tmp[1], tmp[2]);
    enu([v.up.x, v.up.y, v.up.z], f, tmp);
    su.uUp.value.set(tmp[0], tmp[1], tmp[2]);
    enu([v.fwd.x, v.fwd.y, v.fwd.z], f, tmp);
    su.uFw.value.set(tmp[0], tmp[1], tmp[2]);
    const ty = Math.tan((v.fov * DEG) / 2);
    su.uTan.value.set((ty * v.W) / v.H, ty);
    su.uS.value.set(sE[0], sE[1], sE[2]);
    su.uPR.value = b.R;
    su.uH0.value = h0;
    su.uMode.value = oc ? 2 : 0;
    if (atm) {
      su.uTop.value = atm.top;
      su.uHR.value = atm.hR;
      su.uHM.value = atm.hM;
      su.uBR.value.fromArray(atm.bR);
      su.uBM.value.fromArray(atm.bM);
      su.uAM.value.fromArray(atm.aM);
      su.uOZ.value.fromArray(atm.oz || [0, 0, 0]);
      su.uAB.value.fromArray(atm.ab || [0, 0, 0]);
      su.uG.value.fromArray(atm.g);
    }
    let expS = toa * (X / Math.sqrt(gm)) * Math.PI * G;
    if (oc) {
      /* jas zatažené oblohy: ozáření pod oblaky / π (rovnoměrná záře) */
      const k = toa * oc.podil * Math.max(0, Math.min(1, (sz + 0.12) / 0.5)) ** 1.3;
      su.uOcC.value.set(oc.col[0] * k, oc.col[1] * k, oc.col[2] * k).multiplyScalar(1 / Math.PI);
      su.uOcGlow.value = oc.glow || 0;
      expS = (X / Math.sqrt(gm)) * Math.PI;
    }
    /* expozice se uplatní už v shaderu oblohy (uPre); složení a mlha krajiny pak násobí jen 1 */
    su.uPre.value = expS;
    cu.uExp.value = 1;
    cu.uOpq.value = oc ? 1 : 0;
    cu.uSunR.value = Math.max(
      0.0012,
      Math.atan(RS / dS)
    ); /* úhlový poloměr Slunce (min. ~0,07°, ať je vidět i z Pluta) */
    cu.uSat.value = atm ? atm.sat || 1 : 1;
    /* mnohonásobný rozptyl přibližně: okolní záře úměrná světlu oblohy a odrazu od země */
    if (atm) {
      /* za soumraku mnohonásobný rozptyl slábne rychleji (osvětlená je jen horní řídká vrstva) */
      const w = ssa(atm).map((x) => x * Math.max(0, Math.min(1, (sz + 0.1) / 0.2)));
      cu.uMs.value.set(
        ((Esky[0] + 0.15 * Edir[0] * Math.max(0, sz)) / (4 * Math.PI)) * w[0] * (atm.ms || 1),
        ((Esky[1] + 0.15 * Edir[1] * Math.max(0, sz)) / (4 * Math.PI)) * w[1] * (atm.ms || 1),
        ((Esky[2] + 0.15 * Edir[2] * Math.max(0, sz)) / (4 * Math.PI)) * w[2] * (atm.ms || 1)
      );
      cu.uMs.value.multiplyScalar(expS);
    } else cu.uMs.value.set(0, 0, 0);
    /* lom světla: síla podle hustoty vzduchu u země (Země = 1); Mars asi 1/50 */
    cu.uRefK.value = atm ? atm.refr || 0 : 0;
    cu.uMask.value = 1.15;
    /* krajina: mlha */
    U.uExpS.value = 1;
    U.uFogOn.value = atm || oc ? 1 : 0;
    const ex = atm ? groundExt(atm) : oc ? [3 / oc.vis, 3.6 / oc.vis, 4.4 / oc.vis] : [0, 0, 0];
    /* vyvýšený pozorovatel: opar řídne s výškou (výšková škála prachu a plynu); hustotu po cestě počítá shader */
    U.uHobs.value = atm && h0 > 0.01 ? h0 : 0;
    U.uHsc.value = atm ? atm.hM || atm.hR || 8 : 8;
    U.uExt.value.set(ex[0], ex[1], ex[2]);
    /* hvězdy: přes den je přesvítí obloha; bez vzduchu je přezáří osvětlená krajina (oko je oslněné) */
    const Lzd = lum(Lz) * expS,
      yh = 0.5 + (0.5 * (v.fwd.dot(v.n) / Math.max(1e-3, v.up.dot(v.n)))) / ty,
      ground = Math.max(0, Math.min(1, 1 - yh)),
      glare = Math.max(0, Math.min(1, (Math.log10(Math.max(1e-12, E)) + 3.2) / 2.4));
    /* oslnění krajinou jen na tělesech bez vzduchu; kdo na Zemi vypne vzduch, chce vidět hvězdy i ve dne */
    const airless = !ATM[b.id] && !OVERCAST[b.id];
    /* jas nadhlavníku ve fyzikálních jednotkách: ve dne (10⁻³ a víc) hvězdy zmizí, za občanského soumraku (10⁻⁵) svítí
       nejjasnější, za nautického (10⁻⁷) všechny */
    const Lzp = lum(Lz) * toa * (atm ? atm.gain || 1 : 1),
      dayDim = Lzp > 0 ? Math.max(0, Math.min(1, (Math.log10(Lzp) + 6.6) / 3.2)) : 0;
    S.skyDim = oc ? 1 : Math.max(dayDim, airless ? glare * Math.min(1, ground * 2.5) * 0.95 : 0);
    stat.mode = md;
    stat.E = E;
    stat.X = X;
    stat.sunEl = Math.asin(Math.max(-1, Math.min(1, sz))) / DEG;
    stat.Tsun = Tsun;
    stat.Lz = Lzd;
    stat.cov = cov;
    stat.planet = bestJ >= 0 ? B[bestJ].id : null;
    stat.Epl = bestE;
    stat.bright = brightOf(E);
  }
  function ensureTargets(w, h) {
    const sw = Math.max(64, Math.round(w / 4)),
      shh = Math.max(40, Math.round(h / 4));
    if (!rtScene || rtScene.width !== w || rtScene.height !== h) {
      if (rtScene) rtScene.dispose();
      rtScene = new THREE.WebGLRenderTarget(w, h, { samples: S.quality >= 1 ? 4 : 0 });
    }
    if (!rtSky || rtSky.width !== sw || rtSky.height !== shh) {
      if (rtSky) rtSky.dispose();
      rtSky = new THREE.WebGLRenderTarget(sw, shh, {
        count: 2,
        type: THREE.HalfFloatType,
        depthBuffer: false,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
      });
    }
  }
  /* nad oblačným mořem obrů jako z letadla (1,5 km nad vršky kup), jinak výška očí */
  const eyeOf = (q) => (ter && ter.deck ? 1500 : B[q.i].R < 50 ? 1.2 : 1.7);
  let groundMesh = null,
    lastO = null,
    shKey = null;
  /* 2.3 (chůze): mřížku krajiny postavit znovu kolem chodce (výšky jsou v soustavě místa přistání, takže navazuje).
     Stavba běží po kouscích na pozadí (nejvýš ~2 ms za snímek: mřížka, stín terénu, profil obzoru) a stará mřížka se
     vymění až za hotovou – žádné zaškobrtnutí; chodec mezitím jde po staré (sahá 150 km daleko). */
  let job = null;
  function recenter(x, z) {
    if (!ter || !lastO || !terScene || job) return;
    const sl = visKey || [sE[0], sE[2], -sE[1]];
    job = {
      it: buildTerenGen({ ...lastO, cx: x, cy: -z, slice: true }),
      t2: null,
      vis: null,
      sl,
      hp: new Float32Array(360),
      ha: 0,
      t0: performance.now(),
      work: 0,
      n: 0,
    };
  }
  function recenterStep(budget) {
    const t0 = performance.now();
    while (job && performance.now() - t0 < budget) {
      job.n++;
      if (!job.t2) {
        const r = job.it.next();
        if (r.done) {
          job.t2 = r.value;
          job.vis = job.t2.computeVisGen(job.sl, true);
        }
      } else if (job.vis) {
        if (job.vis.next().done) job.vis = null;
      } else if (job.ha < 360) {
        job.t2.horizon(0, 0, eyeOf(S.surf), job.hp, job.ha, job.ha + 30);
        job.ha += 30;
      } else swapGround();
    }
    const dt = performance.now() - t0;
    if (job) {
      job.work += dt;
      job.mx = Math.max(job.mx || 0, dt);
    } else stat.recenterMax = Math.max(stat.recenterMax || 0, Math.round(dt * 10) / 10);
  }
  function swapGround() {
    const t2 = job.t2;
    t2.ls = ter.ls;
    const old = groundMesh,
      g = new THREE.Mesh(t2.geo, old.material);
    g.receiveShadow = true;
    g.frustumCulled = false;
    g.position.set(t2.cx, 0, -t2.cy);
    terScene.remove(old);
    old.geometry.dispose();
    terScene.add(g);
    groundMesh = g;
    ter = t2;
    hProf = job.hp;
    visKey = job.sl;
    visT = performance.now();
    shadeRocks();
    renderer.shadowMap.needsUpdate = true;
    stat.recenterMs = Math.round(job.work);
    stat.recenterWall = Math.round(performance.now() - job.t0);
    stat.recenterSlices = job.n;
    stat.recenterMax = Math.round((job.mx || 0) * 10) / 10;
    stat.recenters = (stat.recenters || 0) + 1;
    job = null;
  }
  /* kameny kolem chodce (InstancedMesh, přestaví se po 5 m chůze; buňky ukotvené v místě, takže blízké kameny zůstávají) */
  let nearR = null;
  const nm4 = new THREE.Matrix4(),
    nq = new THREE.Quaternion(),
    ne = new THREE.Euler(),
    nsc = new THREE.Vector3(),
    nps = new THREE.Vector3(),
    ncc = new THREE.Color();
  function nearUpdate(x, z) {
    if (!ter || !lastO || !terScene || ter.deck || !lastO.T.kam) return;
    if (nearR && Math.hypot(x - nearR.x, z - nearR.z) < 5) return;
    const t0 = performance.now();
    if (!nearR) {
      const cap = 1400,
        kind = lastO.T.typ === 'venuse' ? 'deska' : lastO.T.typ === 'titan' ? 'oblazek' : 'kamen',
        mat = patch(new THREE.MeshLambertMaterial({ color: 0xffffff }), false),
        im = new THREE.InstancedMesh(rockGeo(lastO.seed + 77, kind), mat, cap);
      im.castShadow = im.receiveShadow = true;
      im.frustumCulled = false;
      im.userData.base = new Float32Array(cap * 3);
      im.userData.xz = new Float32Array(cap * 2);
      im.userData.rt = new Float32Array(cap * 2);
      im.setColorAt(0, ncc.setRGB(1, 1, 1));
      terScene.add(im);
      rockMeshes.push(im);
      nearR = { im, buf: { d: new Float32Array(cap * 8), cap }, x: 0, z: 0 };
    }
    nearR.x = x;
    nearR.z = z;
    const im = nearR.im,
      n = nearRocks(lastO, ter, x, z, nearR.buf),
      d = nearR.buf.d,
      tint = lastO.rockCol || [0.3, 0.28, 0.26],
      ud = im.userData;
    for (let k = 0; k < n; k++) {
      const o = k * 8,
        sc = d[o + 3];
      ne.set(0.2 * Math.sin(d[o + 6] * 3), d[o + 6], 0.2 * Math.cos(d[o + 6] * 5));
      nq.setFromEuler(ne);
      nsc.set(sc * d[o + 4], sc, sc * d[o + 5]);
      nps.set(d[o], d[o + 1], d[o + 2]);
      nm4.compose(nps, nq, nsc);
      im.setMatrixAt(k, nm4);
      const v = d[o + 7],
        w = 0.12 + 0.88 * ter.visAt(d[o] - ter.cx, d[o + 2] + ter.cy);
      ud.base[k * 3] = tint[0] * v;
      ud.base[k * 3 + 1] = tint[1] * v;
      ud.base[k * 3 + 2] = tint[2] * v;
      im.setColorAt(k, ncc.setRGB(tint[0] * v * w, tint[1] * v * w, tint[2] * v * w));
      ud.xz[k * 2] = d[o];
      ud.xz[k * 2 + 1] = d[o + 2];
      ud.rt[k * 2] = sc * Math.max(d[o + 4], d[o + 5]) * 0.85;
      ud.rt[k * 2 + 1] = d[o + 1] + sc * 0.62;
    }
    im.count = n;
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    renderer.shadowMap.needsUpdate = true;
    stat.nearN = n;
    stat.nearMs = Math.round((performance.now() - t0) * 10) / 10;
  }
  let hProf = null,
    rFar = 0,
    hObs = 0.002;
  /* kamera krajiny: stejné natočení jako kamera oblohy, v místní soustavě (x = východ, y = nahoru, z = jih) */
  function setCam(q, v) {
    const f = S.surfSite(),
      r = enu([v.right.x, v.right.y, v.right.z], f, [0, 0, 0]),
      u = enu([v.up.x, v.up.y, v.up.z], f, [0, 0, 0]),
      fw = enu([v.fwd.x, v.fwd.y, v.fwd.z], f, [0, 0, 0]),
      eye = eyeOf(q),
      w = q.walk,
      hOff = q.hOff || 0;
    const M = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(r[0], r[2], -r[1]),
      new THREE.Vector3(u[0], u[2], -u[1]),
      new THREE.Vector3(-fw[0], -fw[2], fw[1])
    );
    /* 2.3: chodec (poloha, výška očí, náklon v poryvu větru) a sestup z výšky */
    if (w && w.roll) M.multiply(new THREE.Matrix4().makeRotationZ(w.roll));
    if (w) M.setPosition(w.x, w.eye + eye + hOff, w.z);
    else M.setPosition(0, eye + hOff, 0);
    terCam.matrix.copy(M);
    terCam.matrixWorldNeedsUpdate = true;
    terCam.fov = v.fov;
    terCam.aspect = v.W / v.H;
    terCam.updateProjectionMatrix();
    terCam.updateMatrixWorld(true);
  }
  const dbs = new THREE.Vector2();
  let V = null;
  /* před kreslením: stavba krajiny a výpočet světla (nastaví S.skyDim, podle něj engine ztlumí hvězdy) */
  function pre(v) {
    const q = S.surf;
    V = v;
    if (!renderer.shadowMap.enabled) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.shadowMap.autoUpdate = false;
      renderer.shadowMap.needsUpdate = true;
    }
    shadowsOn = S.quality >= 1 || !document.body.classList.contains('mob');
    build(q);
    setCam(q, v);
    update(q, v);
  }
  function render(scene, camera) {
    const q = S.surf,
      v = V;
    renderer.getDrawingBufferSize(dbs);
    const w = dbs.x,
      h = dbs.y,
      sky = !!(atm || oc);
    if (sky) {
      ensureTargets(w, h);
      renderer.setRenderTarget(rtScene);
      renderer.clear();
      renderer.render(scene, camera);
      renderer.setRenderTarget(rtSky);
      renderer.render(skyScene, orth);
      renderer.setRenderTarget(null);
      compMat.uniforms.tScene.value = rtScene.texture;
      compMat.uniforms.tL.value = rtSky.textures[0];
      compMat.uniforms.tT.value = rtSky.textures[1];
      renderer.render(compScene, orth);
      U.uSkyL.value = rtSky.textures[0];
    } else {
      renderer.render(scene, camera);
      U.uSkyL.value = black;
    }
    U.uRes.value.set(w, h);
    const ac = renderer.autoClear;
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(terScene, terCam);
    renderer.autoClear = ac;
  }
  /* po vzletu: vypnout mapu stínů (hlavní scéna ji nepotřebuje) – vše jako před přistáním */
  S.bus.on('surf', (q) => {
    if (q) return;
    renderer.shadowMap.enabled = false;
    renderer.shadowMap.autoUpdate = true;
    S.skyDim = 0;
  });
  function prep(i) {
    if (i >= 0 && B[i]) return Promise.all([loadMap(B[i].id), loadDem(B[i].id)]);
    return Promise.resolve(null);
  }
  return {
    pre,
    render,
    prep,
    adjust,
    on: () => !!S.surf && !S.surf.quiet && S.krajinaOn !== false,
    state: () => ({ ...stat, key }),
    /* zkoušky: uniformy krajiny */
    uni: U,
    /* 2.3 (chůze): dá se tu chodit? (oblačné moře obrů a pohled nad oblaky ne) */
    walkable: () => !!(ter && !ter.deck && mode !== 'nad'),
    /* výška země (m) v bodě (x východ, z jih) – stejná plocha, jakou kreslí mřížka; mimo ni přesný výpočet */
    ground: (x, z) => {
      if (!ter) return 0;
      const y = ter.gridY(x - ter.cx, z + ter.cy);
      return y < -1e8 ? ter.yAt(x, z) : y;
    },
    /* kameny v okolí bodu: [{ x, z, r, top }] */
    obstacles: (x, z, rad) => {
      const out = [];
      for (const m of rockMeshes) {
        const xz = m.userData.xz,
          rt = m.userData.rt;
        if (!xz || !rt) continue;
        for (let k = 0; k < m.count; k++) {
          const r = rt[k * 2];
          if (r < 0.12) continue;
          const dx = xz[k * 2] - x,
            dz = xz[k * 2 + 1] - z,
            lim = r + rad;
          if (dx * dx + dz * dz < lim * lim) out.push({ x: xz[k * 2], z: xz[k * 2 + 1], r, top: rt[k * 2 + 1] });
        }
      }
      return out;
    },
    /* chodec daleko od středu mřížky (> 35 m): postavit ji kolem něj (po kouscích); kameny kolem chodce po 5 m */
    follow: (x, z) => {
      if (!ter) return;
      if (!job && Math.hypot(x - ter.cx, -z - ter.cy) > 35) recenter(x, z);
      nearUpdate(x, z);
    },
    /* zkoušky: přestavbu dokončit hned */
    finishRecenter: () => {
      while (job) recenterStep(1e9);
    },
    /* 2.3: výška obzoru krajiny v azimutu az (rad, od severu k východu) v radiánech, null bez krajiny */
    horizonEl: (az) => {
      if (!hProf || !ter) return null;
      const a = ((((az * 180) / Math.PI) % 360) + 360) % 360;
      return hProf[Math.min(359, Math.floor(a))];
    },
    /* výška krajiny v bodě (m, místní soustava) – zkoušky */
    yAt: (x, z) => (ter ? ter.yAt(x, z) : null),
    sky: (d) => {
      /* jas oblohy ve směru d (místní soustava) – zkoušky */
      const q = S.surf;
      if (!q || !atm) return null;
      return skyDir(atm, B[q.i].R, 0.002, d, [
        skyMat.uniforms.uS.value.x,
        skyMat.uniforms.uS.value.y,
        skyMat.uniforms.uS.value.z,
      ]);
    },
    dispose,
  };
}
