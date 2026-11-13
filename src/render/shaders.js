// Shadery těles, Slunce, prstenců, atmosfér, ohonů komet a oblohy. Všechny, které testují hloubku, používají logaritmický
// z-buffer three.js (rozsah od metrů po stovky AU v jedné scéně).
const NOISE = /* glsl */ `
float h31(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z); }
`;
export const BODY_VS = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
uniform vec3 uAbc; uniform vec3 uShp;
varying vec3 vO; varying vec3 vN; varying vec3 vP;
${NOISE}
float lump(vec3 n){ float r = 1.0;
  if (uShp.x > 0.0) r *= 1.0 + uShp.x * ((vn(n * 2.3 + uShp.z) - 0.5) * 1.2 + (vn(n * 5.1 + uShp.z * 1.7) - 0.5) * 0.5);
  if (uShp.y > 0.0) r *= 1.0 - uShp.y * exp(-(n.x * n.x) / 0.06);
  return r; }
vec3 surf(vec3 n){ return n * uAbc * lump(n); }
void main(){
  vec3 n = normalize(position); vO = n; vec3 p = surf(n); vec3 nr = normalize(n / uAbc);
  if (uShp.x > 0.0 || uShp.y > 0.0) {
    vec3 t1 = normalize(cross(n, abs(n.z) < 0.9 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0))), t2 = cross(n, t1);
    vec3 p1 = surf(normalize(n + t1 * 0.03)), p2 = surf(normalize(n + t2 * 0.03));
    nr = normalize(cross(p1 - p, p2 - p)); if (dot(nr, n) < 0.0) nr = -nr; }
  vN = normalize(mat3(modelMatrix) * nr); vP = mat3(modelMatrix) * p;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  #include <logdepthbuf_vertex>
}`;
// uKind: 0 kamenné bez atmosféry, 1 ledové, 2 plynné a husté atmosféry, 3 kometa, 4 Země
export const BODY_FS = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D tMap; uniform sampler2D tAux; uniform sampler2D tRing; uniform sampler2D tHi; uniform float uHi;
uniform float uHasMap; uniform float uHasAux; uniform float uKind; uniform float uDet; uniform float uSeed; uniform float uFill; uniform float uGam;
uniform float uAtmK; uniform float uSunR; uniform float uRad; uniform float uTime;
uniform vec3 uCol; uniform vec3 uSun; uniform vec3 uAtmCol; uniform vec3 uPole; uniform vec3 uCtr; uniform vec3 uRingSh; uniform mat3 uRot;
uniform vec4 uOcc[4]; uniform vec4 uAur; uniform vec3 uAurC; uniform vec3 uAurP; uniform float uExp;
varying vec3 vO; varying vec3 vN; varying vec3 vP;
${NOISE}
void main(){
  #include <logdepthbuf_fragment>
  vec3 o = normalize(vO);
  float lat = asin(clamp(o.z, -1.0, 1.0)), lon = atan(o.y, o.x);
  float u0 = lon * 0.15915494 + 0.5, ua = fract(u0), ub = fract(u0 + 0.5) - 0.5;
  vec2 uv = vec2(fwidth(ua) < fwidth(ub) ? ua : ub, lat * 0.31830989 + 0.5);
  vec3 alb = uHasMap > 0.0 ? mix(uCol, texture2D(tMap, uv).rgb, uHasMap) : uCol;   // mapa se po načtení plynule prolne
  if (uHi > 0.0) alb = mix(alb, texture2D(tHi, uv).rgb, uHi);   // velká mapa (maps/hi) se zblízka prolne přes malou
  vec3 N = normalize(vN);
  if (uDet > 0.0) { // jemná kresba pod rozlišením mapy (šum podle velikosti pixelu) – jen zblízka
    float fw = length(fwidth(vO)), amp = 0.0; vec3 g = vec3(0.0);
    for (int k = 0; k < 3; k++) { float s = 180.0 * pow(4.0, float(k)); float w = smoothstep(3.0 / s, 0.8 / s, fw); if (w <= 0.0) continue;
      vec3 q = o * s + uSeed; float n0 = vn(q), nx = vn(q + vec3(0.4, 0.0, 0.0)), ny = vn(q + vec3(0.0, 0.4, 0.0)), nz = vn(q + vec3(0.0, 0.0, 0.4));
      amp += (n0 - 0.5) * w; g += vec3(nx - n0, ny - n0, nz - n0) * w; }
    alb *= 1.0 + uDet * amp * 0.35;
    if (uKind < 1.5 || uKind > 2.5) { vec3 gt = g - o * dot(g, o); N = normalize(N - (uRot * gt) * uDet * 0.5); }
  }
  vec3 V = normalize(-(uCtr + vP)), L = uSun;
  float mu0 = dot(N, L), mu = max(dot(N, V), 0.0), m0 = max(mu0, 0.0);
  // stíny: zatmění (až 4 koule) a stín prstenců
  float sh = 1.0;
  for (int k = 0; k < 4; k++) { if (uOcc[k].w > 0.0) { vec3 c = uOcc[k].xyz - vP; float t = dot(c, L); if (t > 0.0) { float d = length(c - L * t), w = t * uSunR + 0.015 * uOcc[k].w; sh *= smoothstep(uOcc[k].w - w, uOcc[k].w + w, d); } } }
  if (uRingSh.z > 0.0) { float dn = dot(L, uPole); float tt = -dot(vP, uPole) / dn; if (tt > 0.0) { float r = length(vP + L * tt) / uRad, x = (r - uRingSh.x) / (uRingSh.y - uRingSh.x); if (x > 0.0 && x < 1.0) sh *= 1.0 - 0.9 * texture2D(tRing, vec2(x, 0.5)).a * uRingSh.z; } }
  float lit; vec3 add = vec3(0.0);
  if (uKind > 3.5) { // Země: mraky, oceán, noční světla, modrý opar
    vec3 aux = uHasAux > 0.5 ? texture2D(tAux, uv + vec2(uTime, 0.0)).rgb : vec3(0.0); vec3 aux0 = uHasAux > 0.5 ? texture2D(tAux, uv).rgb : vec3(0.0);
    float cl = aux.r; lit = clamp((mu0 + 0.06) / 1.06, 0.0, 1.0);
    vec3 H = normalize(L + V); float sp = pow(max(dot(N, H), 0.0), 70.0) * aux0.g * (1.0 - cl) * 0.7;
    alb = mix(alb, vec3(0.93), cl * 0.92);
    alb = mix(alb, vec3(0.35, 0.55, 1.0), pow(1.0 - mu, 2.5) * 0.55);
    add += vec3(1.0, 0.92, 0.8) * sp * sh * step(0.0, mu0);
    add += vec3(1.0, 0.72, 0.38) * aux0.b * aux0.b * smoothstep(0.08, -0.14, mu0) * (1.0 - cl * 0.7) * 0.9;
    alb *= mix(vec3(1.0, 0.55, 0.35), vec3(1.0), smoothstep(-0.02, 0.28, mu0));
  } else if (uKind > 1.5 && uKind < 2.5) { lit = clamp((mu0 + 0.07) / 1.07, 0.0, 1.0) * (0.72 + 0.28 * pow(mu, 0.45)); }
  else { float ls = 2.0 * m0 / (m0 + mu + 0.03); lit = mix(m0, min(ls, 1.5) * 0.62, 0.6) * step(0.0, mu0); }
  vec3 col = alb * (lit * sh * uExp + uFill) + add * uExp;
  if (uAur.x > 0.0) { // polární záře: ovál kolem magnetického pólu, záclony ze šumu
    vec3 mp = uAurP; float cl2 = acos(clamp(abs(dot(o, mp)), 0.0, 1.0)), ring = exp(-pow((cl2 - uAur.y) / uAur.z, 2.0));
    float cur = 0.35 + 0.65 * vn(vec3(atan(o.y, o.x) * 9.0, uSeed + uTime * 300.0 + uAur.w, cl2 * 30.0)); col += uAurC * ring * cur * uAur.x * mix(1.0, smoothstep(0.12, -0.18, mu0), step(3.5, uKind)); }
  if (uAtmK > 0.0) col += uAtmCol * pow(1.0 - mu, 3.0) * uAtmK * (smoothstep(-0.12, 0.3, mu0) * sh + uFill);
  col = pow(max(col, vec3(0.0)), vec3(1.0 / uGam));
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;
// Slunce: uMode 0 = bílé světlo (fotosféra se skvrnami), 1 = H-alfa (chromosféra, filamenty), 2 = EUV 304 Å (aktivní oblasti, oblouky),
// 3 = koronograf (kotouč zakrytý jako při úplném zatmění; koronu kreslí GLOW_FS, protuberance PROM_FS)
// Slunce: vše procedurálně (mapa SDO jen určuje jas koróny v EUV). Tři měřítka buněk: supergranule (~25 000 km),
// mezogranule (~6 000 km) a granule (~1 200 km) – každé se zapne, až když je buňka větší než pár pixelů.
// Skvrny: dvojice (vedoucí + následující) v aktivní oblasti, umbra, penumbra s radiálními vlákny.
const SUNLIB = /* glsl */ `
vec3 h33(vec3 p){ p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }
vec3 voro(vec3 x, float t){ x += 0.22 * sin(vec3(0.0, 2.1, 4.2) + 6.2831 * vn(x * 0.8)); vec3 p = floor(x), f = fract(x); float d1 = 8.0, d2 = 8.0, id = 0.0;
  for (int k = -1; k <= 1; k++) for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec3 g = vec3(float(i), float(j), float(k));
    vec3 hh = h33(p + g), r = g + 0.5 + 0.42 * sin(t + 6.2831 * hh) - f; float d = dot(r, r); if (d < d1) { d2 = d1; d1 = d; id = hh.x; } else if (d < d2) d2 = d; }
  return vec3(sqrt(d1), sqrt(d2), id); }
// jas buňky: zaoblený mnohoúhelník, tmavé mezery
float cellB(vec3 c){ return smoothstep(0.0, 0.2, c.y - c.x) * (1.0 - 0.55 * smoothstep(0.28, 0.72, c.x)) * (0.72 + 0.4 * c.z); }
float hk(float k){ return fract(sin(k * 12.9898 + 4.1) * 43758.5453); }
// skvrna v místních souřadnicích p (rad), poloměr s → (umbra, penumbra, vlákna)
vec3 spot(vec2 p, float s, float seed){ float r = length(p) / s; if (r > 1.5) return vec3(0.0);
  vec2 cs = p / max(length(p), 1e-6);
  float rr = r * (1.0 + 0.36 * (vn(vec3(cs * 1.6, seed)) - 0.5) + 0.14 * (vn(vec3(cs * 4.0, seed + 3.0)) - 0.5));
  float fil = vn(vec3(cs * 13.0, rr * 1.3 + seed)) * 0.6 + vn(vec3(cs * 31.0, rr * 2.2 + seed)) * 0.4;
  float umb = 1.0 - smoothstep(0.36, 0.47, rr + (fil - 0.5) * 0.10), pen = 1.0 - smoothstep(0.84, 1.0, rr + (fil - 0.5) * 0.34);
  return vec3(umb, pen, fil); }
`;
export const SUN_FS = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D tMap; uniform float uHasMap; uniform vec3 uCtr; uniform float uTime; uniform float uMode; uniform vec4 uFlare; uniform vec3 uAR[16]; uniform float uQ; uniform float uCor;
varying vec3 vO; varying vec3 vN; varying vec3 vP;
${NOISE}
${SUNLIB}
vec3 ramp(float v){ v = clamp(v, 0.0, 1.3); return v < 0.5 ? mix(vec3(0.22, 0.045, 0.004), vec3(0.90, 0.36, 0.035), v * 2.0) : mix(vec3(0.90, 0.36, 0.035), vec3(1.0, 0.80, 0.34), min(1.0, (v - 0.5) * 2.0)) * (1.0 + max(0.0, v - 1.0)); }
void main(){
  #include <logdepthbuf_fragment>
  vec3 o = normalize(vO); float lat = asin(clamp(o.z, -1.0, 1.0)), lon = atan(o.y, o.x);
  float u0 = lon * 0.15915494 + 0.5, ua = fract(u0), ub = fract(u0 + 0.5) - 0.5;
  vec2 uv = vec2(fwidth(ua) < fwidth(ub) ? ua : ub, lat * 0.31830989 + 0.5);
  vec3 V = normalize(-(uCtr + vP)); float mu = max(dot(normalize(vN), V), 0.0);
  float px = length(fwidth(o)) + 1e-7;
  float wS = 1.0 - smoothstep(0.10, 0.34, px * 28.0), wM = 1.0 - smoothstep(0.10, 0.34, px * 120.0), wG = (1.0 - smoothstep(0.10, 0.34, px * 560.0)) * step(0.5, uQ);
  wS *= 1.0 - wG; if (uQ < 1.5) wS *= 1.0 - wM;       // nejvýš dvě měřítka najednou (výkon)
  // nejbližší aktivní oblast a její místní souřadnice (x k východu, y k severu)
  float best = -1.0, kb = 0.0; vec3 c = vec3(1.0, 0.0, 0.0);
  for (int k = 0; k < 16; k++) { float d = dot(o, uAR[k]); if (d > best) { best = d; kb = float(k); c = uAR[k]; } }
  float sz = kb < 9.0 ? mix(1.0, 0.5, kb / 9.0) * (0.75 + 0.5 * hk(kb)) : 0.0, ar = smoothstep(0.972, 0.9975, best) * (kb < 9.0 ? 1.0 : 0.6);
  vec3 e1 = normalize(cross(vec3(0.0, 0.0, 1.0), c)), e2 = cross(c, e1), dv = o - c; vec2 q = vec2(dot(dv, e1), dot(dv, e2));
  float tl = (hk(kb + 7.0) - 0.5) * 0.5 + sign(c.z) * 0.15; q = vec2(q.x * cos(tl) - q.y * sin(tl), q.x * sin(tl) + q.y * cos(tl));
  float a = 0.062 * sz + 0.014; vec2 pL = q - vec2(a, 0.0), pF = q + vec2(a * 1.15, 0.0);
  vec3 sp = vec3(0.0);
  if (sz > 0.0 && best > 0.98) { sp = spot(pL, 0.052 * sz, kb); vec3 s2 = spot(pF + vec2(0.0, 0.006), 0.036 * sz, kb + 20.0); sp = s2.y > sp.y ? s2 : sp;
    vec3 s3 = spot(pF - vec2(0.045, 0.026) * sz, 0.017 * sz, kb + 40.0); sp = s3.y > sp.y ? s3 : sp; s3 = spot(pL + vec2(0.018, 0.066) * sz, 0.012 * sz, kb + 60.0); sp = s3.y > sp.y ? s3 : sp; }
  // siločáry dvojpólu: úhel, pod kterým je z bodu vidět spojnice obou skvrn → oblouky mezi skvrnami
  float phi = atan(pL.y, pL.x) - atan(pF.y, pF.x), ql = length(q) / (a * 2.4), arcs = pow(abs(sin(phi * 4.5 + hk(kb) * 6.0 + 1.6 * vn(o * 30.0 + kb))), 14.0);
  arcs *= smoothstep(0.30, 0.62, vn(vec3(phi * 2.2, kb, ql * 1.5))) * exp(-ql * ql) * smoothstep(0.0, 0.25, min(length(pL), length(pF)) / a) * step(0.001, sz);
  vec3 cS = vec3(0.5, 0.7, 0.5), cM = cS, cG = cS;
  if (wS > 0.01) cS = voro(o * 28.0, uTime * 0.6); if (wM > 0.01) cM = voro(o * 120.0 + 5.0, uTime * 2.0); if (wG > 0.01) cG = voro(o * 560.0 + 9.0, uTime * 7.0);
  float bS = cellB(cS), bM = cellB(cM), bG = cellB(cG), eS = cS.y - cS.x;
  float big = vn(o * 3.0 + 1.7) * 0.6 + vn(o * 9.0 + uTime * 0.2) * 0.4, mid = vn(o * 45.0 + 3.0);
  vec3 col;
  if (uMode < 0.5 || uMode > 2.5) {                    // bílé světlo: fotosféra (koronograf ji pak zakryje)
    float v = 0.60 + (big - 0.5) * 0.12 + (mid - 0.5) * 0.06;
    v += wS * (bS - 0.62) * 0.26;
    v += wM * mix((bM - 0.62) * 0.48, (0.5 - cM.x) * 0.16, wG);
    v += wG * (bG - 0.60) * 0.95;
    float fac = ar * (1.0 - sp.y) * (0.35 + 0.65 * smoothstep(0.45, 0.75, vn(o * 70.0 + 4.0))) * (0.2 + 0.8 * pow(1.0 - mu, 1.5));
    v += fac * 0.36;                                   // fakule: jasná síť kolem skvrn, nejlépe u okraje
    v = mix(v, 0.24 + 0.40 * sp.z + 0.16 * (bG - 0.6) * wG, sp.y * 0.94);                        // penumbra: radiální vlákna
    v = mix(v, 0.035 + 0.07 * wG * smoothstep(0.3, 0.0, cG.x) * cG.z, sp.x);                     // umbra s umbrálními body
    col = ramp(v * (0.60 + 0.40 * pow(mu, 0.5))) * (0.40 + 0.60 * pow(mu, 0.62)) * 1.12;
  } else if (uMode < 1.5) {                            // H-alfa: chromosféra
    float fib = vn(o * vec3(70.0, 70.0, 24.0) + uTime * 0.2), fil = 1.0 - abs(2.0 * vn(o * vec3(7.0, 7.0, 19.0) + 11.0) - 1.0);
    float net = 1.0 - smoothstep(0.0, 0.5, cS.x), thr = vn(o * vec3(150.0, 150.0, 60.0) + 2.0);
    float v = 0.44 + (big - 0.5) * 0.20 + (fib - 0.5) * 0.26 + (mid - 0.5) * 0.14 + pow(vn(o * 85.0 + 7.0), 2.0) * 0.22 + net * wS * 0.10 + wM * (0.5 - cM.x) * 0.22 + (thr - 0.5) * 0.16 * (wM + wG) + wG * (0.5 - cG.x) * 0.12;
    vec2 qn = q / max(length(q), 1e-5); float sup = vn(vec3(qn * 11.0, length(q) * 22.0 + kb));  // fibrily kolem skvrn
    v = mix(v, 0.36 + 0.5 * sup, ar * 0.55 * (1.0 - sp.y));
    v += ar * 0.20 * (0.5 + 0.7 * vn(o * 55.0 + 2.0)) + 0.5 * arcs * (1.0 - sp.y); // plage a oblouky mezi skvrnami
    v *= 1.0 - 0.8 * smoothstep(0.93, 0.975, fil) * smoothstep(0.50, 0.64, vn(o * 3.1 + 5.0)) * (0.7 + 0.3 * vn(o * 90.0));  // tmavé filamenty
    v = mix(v, 0.16 + 0.2 * sp.z, sp.y * 0.8); v = mix(v, 0.05, sp.x);
    col = mix(vec3(0.20, 0.012, 0.004), vec3(1.0, 0.20, 0.035), clamp(v * 1.25, 0.0, 1.0)) + vec3(1.0, 0.55, 0.22) * max(0.0, v - 0.78) * 1.5;
    col *= 0.50 + 0.50 * pow(mu, 0.45); col += vec3(1.0, 0.22, 0.06) * pow(1.0 - mu, 5.0) * 0.55;
  } else {                                             // EUV 304 Å: přechodová vrstva, jasné aktivní oblasti
    vec3 tex = uHasMap > 0.5 ? texture2D(tMap, uv).rgb : vec3(0.3); float lum = dot(tex, vec3(0.4, 0.45, 0.15));
    float hole = smoothstep(0.52, 0.72, vn(o * 1.7 + 9.0)) * smoothstep(0.35, 0.85, abs(o.z) + 0.25 * vn(o * 4.0));
    float sp1 = pow(vn(o * 26.0 + uTime * 0.3), 2.0), sp2 = pow(vn(o * 85.0 + 7.0), 2.0), sp3 = pow(vn(o * 300.0 + 3.0), 2.0);
    float v = 0.20 + lum * 0.45 + (big - 0.5) * 0.24 + sp1 * 0.34 + sp2 * 0.30 * (0.4 + wS) + sp3 * 0.24 * wM + (1.0 - smoothstep(0.0, 0.45, cM.x)) * wM * 0.16 + (0.5 - cG.x) * wG * 0.12;
    v *= 1.0 - 0.55 * hole;                            // koronální díry
    float core = smoothstep(0.990, 0.9995, best);
    v += ar * (0.16 + 0.5 * pow(vn(o * 38.0 + kb), 2.0)) + 1.1 * arcs * (0.5 + 0.5 * vn(o * 90.0 + uTime)) + core * 0.30 + pow(lum, 3.0) * 1.2;
    col = v < 0.55 ? mix(vec3(0.16, 0.012, 0.0), vec3(0.93, 0.25, 0.02), v / 0.55) : mix(vec3(0.93, 0.25, 0.02), vec3(1.0, 0.80, 0.30), clamp((v - 0.55) / 0.5, 0.0, 1.0));
    col += vec3(1.0, 0.9, 0.6) * max(0.0, v - 1.05) * 0.9; col *= 0.78 + 0.5 * pow(1.0 - mu, 2.0);
  }
  col += vec3(1.0, 0.95, 0.85) * uFlare.w * exp(-(1.0 - dot(o, uFlare.xyz)) * 900.0) * 6.0;
  col *= 1.0 - uCor;                                   // koronograf: zakrytý kotouč
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;
// Nad okrajem: spikule, protuberance, oblouky nad aktivními oblastmi a výron při erupci. Koule 1,8 R kreslená zevnitř;
// pro každý pixel se bere pár bodů na zorném paprsku kolem místa, kde paprsek míjí Slunce nejblíž.
export const PROM_VS = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vW;
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
  #include <logdepthbuf_vertex>
}`;
export const PROM_FS = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 uCtr; uniform float uRad; uniform mat3 uRot; uniform float uTime; uniform float uMode; uniform float uI; uniform vec4 uFlare; uniform float uErupt; uniform vec3 uAR[16];
varying vec3 vW;
${NOISE}
float hk(float k){ return fract(sin(k * 12.9898 + 4.1) * 43758.5453); }
void main(){
  #include <logdepthbuf_fragment>
  vec3 d = normalize(vW); float tc = dot(uCtr, d); if (tc < 0.0) discard; vec3 qw = (d * tc - uCtr) / uRad; float b = length(qw); if (b < 0.985 || b > 1.78) discard;
  vec3 q0 = qw * uRot, dl = d * uRot; float I = 0.0, hot = 0.0, pxr = fwidth(b);
  for (int s = 0; s < 5; s++) { float ls = (float(s) - 2.0) * 0.11; vec3 p = q0 + dl * ls; float r = length(p), h = r - 1.0; vec3 n = p / r; if (h < 0.0) continue;
    // spikule: nízký les výtrysků
    float spk = vn(n * 260.0 + vec3(0.0, 0.0, uTime * 3.0)); I += smoothstep(0.003 + 0.014 * spk * spk, 0.0, h) * 0.22;
    // klidové protuberance: závěsy z vláken
    float top = 0.03 + 0.10 * vn(n * 3.0 + 8.0) + 0.03 * vn(n * 38.0), cl = smoothstep(0.66, 0.80, vn(n * 6.0 + 3.0)) * smoothstep(top, top * 0.55, h);
    if (cl > 0.0) { float thd = vn(vec3(n.xy * 170.0, n.z * 170.0 + h * 9.0 - uTime)); I += cl * (0.10 + 1.1 * thd * thd) * smoothstep(0.0, 0.005, h) * 0.6; }
    for (int k = 0; k < 16; k++) { float c = dot(n, uAR[k]); if (c < 0.955) continue; float fk = float(k), ang = acos(min(c, 1.0)), w = 0.07 + 0.11 * hk(fk + 1.0), H = (k < 9 ? 0.05 + 0.16 * hk(fk + 2.0) : 0.03 + 0.05 * hk(fk + 2.0));
      float x = ang / w; if (x < 1.0) { float sh = sqrt(1.0 - x * x), th = max(0.0022 + 0.002 * hk(fk + 3.0), pxr * 0.8), wob = 0.010 * (vn(n * 40.0 + fk) - 0.5);
        for (int m = 0; m < 3; m++) { float hm = H * (1.0 - 0.3 * float(m)) * sh + wob; float e = (h - hm) / th; I += exp(-e * e) * (0.62 - 0.12 * float(m)) * (0.3 + 0.9 * vn(n * 120.0 + fk)); }
        hot += exp(-h * 45.0) * (1.0 - x) * 0.07; }
    }
    // erupce: rozpínající se smyčka a jas nad aktivní oblastí
    float cf = dot(n, uFlare.xyz); if (cf > 0.80 && uErupt > 0.0) { float af = acos(min(cf, 1.0)), R1 = 0.04 + 0.62 * uErupt, wf = 0.10 + 0.34 * uErupt, x = af / wf;
      if (x < 1.0) { float hm = R1 * sqrt(1.0 - x * x), e = (h - hm) / (0.010 + 0.05 * uErupt); I += exp(-e * e) * (1.0 - uErupt) * 2.2 * (0.4 + 0.6 * vn(n * 60.0 + uTime * 4.0));
        I += smoothstep(hm, 0.0, h) * (1.0 - uErupt) * 0.35 * vn(vec3(n.xy * 45.0, h * 12.0 - uTime * 6.0)); }
      hot += uFlare.w * exp(-af * af * 180.0) * exp(-h * 14.0) * 1.5; }
  }
  I = I * 0.34 + hot; if (I * uI < 0.004) discard;
  vec3 ca = uMode < 1.5 ? vec3(1.0, 0.16, 0.07) : vec3(1.0, 0.50, 0.12), cb = uMode < 1.5 ? vec3(1.0, 0.62, 0.42) : vec3(1.0, 0.90, 0.60);
  if (uMode > 2.5) { ca = vec3(1.0, 0.14, 0.26); cb = vec3(1.0, 0.62, 0.66); }   // při zatmění: růžová (H-alfa + další čáry vodíku)
  gl_FragColor = vec4(mix(ca, cb, clamp(I - 0.55, 0.0, 1.0)) * min(I, 1.5) * uI * (uMode > 2.5 ? 0.8 : 1.0), 1.0);
  #include <colorspace_fragment>
}`;
// záře: čtverec natočený ke kameře; uS = poloměr v km
export const GLOW_VS = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
uniform float uS; varying vec2 vQ;
void main(){ vQ = position.xy; vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0); mv.xy += position.xy * uS; gl_Position = projectionMatrix * mv;
  #include <logdepthbuf_vertex>
}`;
export const GLOW_FS = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 uC; uniform float uI; uniform float uCore; uniform float uRay; varying vec2 vQ;
// koronograf: uCor 0–1, uCR = poloměr kotouče v jednotkách čtverce, uAx = průmět severní osy Slunce na obrazovku,
// uSt[k] = (průmět směru přilbového paprsku x, y; šířka v rad; síla)
uniform float uCor; uniform float uCR; uniform vec2 uAx; uniform vec4 uSt[8];
float h1(float n){ return fract(sin(n * 127.1 + 3.7) * 43758.5453); }
float n1(float x, float P){ float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(h1(mod(i, P)), h1(mod(i + 1.0, P)), f); }
float corona(vec2 q){
  float x = length(q); if (x < 0.97) return 0.0; vec2 d = q / x;
  float al = length(uAx), t = atan(d.y, d.x) * 0.15915494 + 0.5;
  // jemné radiální žíhání
  float fs = n1(t * 90.0, 90.0) * n1(t * 37.0 + 5.0, 37.0) * 1.9 + 0.35 * n1(t * 211.0, 211.0) + 0.3;
  float a = (0.60 / pow(x, 7.0) + 0.050 / pow(x, 2.6)) * (0.75 + 0.25 * fs);
  // polární chocholy: krátké, rozbíhají se víc než radiálně (siločáry dipólu)
  if (al > 0.05) { vec2 ax = uAx / al; float ca = dot(d, ax), sg = ax.x * d.y - ax.y * d.x;
    float sp = acos(clamp(abs(ca), 0.0, 1.0)) / (1.0 + 0.45 * (x - 1.0)) * (sg < 0.0 ? -1.0 : 1.0);
    float pn = n1(sp * 44.0 + (ca > 0.0 ? 200.0 : 500.0), 4096.0) * n1(sp * 17.0 + (ca > 0.0 ? 90.0 : 40.0), 4096.0);
    a += smoothstep(0.62, 0.18, abs(sp)) * al * pn * pn * 1.5 / pow(x, 3.6); }
  // přilbové paprsky: široká základna, nahoře úzký stvol; nejlépe vidět, když míří kolmo k zornému paprsku
  for (int k = 0; k < 8; k++) { vec4 s = uSt[k]; float L = length(s.xy); if (L < 0.08) continue; float c = dot(d, s.xy / L); if (c < 0.3) continue;
    float dp = acos(min(c, 1.0)), w = s.z * (0.22 + 0.78 / (x * x)), len = 1.6 + 5.5 * L * s.w;
    float e = dp / w; a += s.w * L * L * exp(-e * e) * (0.55 + 0.45 * fs) * 0.30 / pow(x, 2.1) * smoothstep(len, 1.0 + 0.3 * len, x); }
  return a;
}
void main(){
  #include <logdepthbuf_fragment>
  float r = length(vQ); if (r > 1.0) discard;
  float x = max(r, uCore) / uCore;                 // 1 na okraji kotouče
  float a = uI * (1.6 / (x * x * x) + 0.05 / x) * pow(1.0 - r, 1.5);
  float ang = atan(vQ.y, vQ.x); float st = pow(abs(cos(ang + 0.2)), 5.0) * 0.9 + 0.22 * sin(ang * 11.0 + 1.3) + 0.14 * sin(ang * 23.0 + 4.0) + 0.1 * sin(ang * 47.0);
  a *= 1.0 + uRay * st * smoothstep(1.0, 3.0, x) + uRay * 0.25 * smoothstep(1.0, 2.0, x);
  vec3 col = uC * a;
  if (uCor > 0.0) col = mix(col, vec3(1.0, 0.97, 0.93) * corona(vQ / uCR) * pow(1.0 - r, 1.2), uCor);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;
export const RING_VS = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vP; varying float vR;
void main(){ vR = length(position.xy); vP = mat3(modelMatrix) * position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  #include <logdepthbuf_vertex>
}`;
export const RING_FS = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D tRing; uniform vec3 uSun; uniform vec3 uPole; uniform vec3 uCtr; uniform vec3 uIO; uniform float uRad; uniform float uSunR; uniform float uFill; uniform float uGam; uniform float uFlat;
varying vec3 vP; varying float vR;
void main(){
  #include <logdepthbuf_fragment>
  float x = (vR - uIO.x) / (uIO.y - uIO.x); vec4 t = texture2D(tRing, vec2(clamp(x, 0.002, 0.998), 0.5)); float al = t.a * uIO.z; if (al < 0.004) discard;
  vec3 V = normalize(-(uCtr + vP)), L = uSun;
  // stín planety (zploštělé): do prostoru, kde je planeta koulí
  vec3 q = vP - uPole * dot(vP, uPole) * (1.0 - 1.0 / uFlat), l = normalize(L - uPole * dot(L, uPole) * (1.0 - 1.0 / uFlat));
  float tt = -dot(q, l), sh = 1.0; if (tt > 0.0) { float d = length(q + l * tt), w = tt * uSunR + 0.01 * uRad; sh = smoothstep(uRad - w, uRad + w, d); }
  float sL = dot(L, uPole), sV = dot(V, uPole), same = step(0.0, sL * sV);
  float br = mix(0.28 * (1.0 - t.a) + 0.06, 0.45 + 0.55 * pow(abs(sL), 0.35), same);        // neosvětlená strana jen prosvítá
  float fs = pow(max(dot(-V, L), 0.0), 8.0) * (1.0 - t.a) * 1.5;                             // dopředný rozptyl proti Slunci
  vec3 col = t.rgb * 4.2 * (br * sh + fs * sh + uFill);
  col = pow(max(col, vec3(0.0)), vec3(1.0 / uGam));
  gl_FragColor = vec4(col, al);
  #include <colorspace_fragment>
}`;
export const ATM_VS = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vW;
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
  #include <logdepthbuf_vertex>
}`;
export const ATM_FS = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 uCtr; uniform vec3 uSun; uniform vec3 uC; uniform float uRad; uniform float uH; uniform float uK; uniform float uFill;
varying vec3 vW;
void main(){
  #include <logdepthbuf_fragment>
  vec3 d = normalize(vW); float tc = dot(uCtr, d); vec3 q = d * tc - uCtr; float b = length(q) / uRad;
  float t = (b - 1.0) / uH; if (t < 0.0 || t > 1.0 || tc < 0.0) discard;
  float day = smoothstep(-0.22, 0.35, dot(q / (b * uRad), uSun));
  float a = exp(-t * 4.5) * (1.0 - t) * uK * (day + uFill * 0.6);
  vec3 c = mix(uC, vec3(1.0, 0.5, 0.25), (1.0 - smoothstep(0.0, 0.5, day)) * 0.6 * step(0.01, day));
  gl_FragColor = vec4(c * a, 1.0);
  #include <colorspace_fragment>
}`;
// ohon komety: pás 1 × 1 (x napříč −0,5…0,5, y podél 0…1) natočený ke kameře
export const TAIL_VS = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
uniform vec3 uN; uniform vec3 uA; uniform vec3 uB; uniform float uL; uniform float uW0; uniform float uW1; uniform float uCurv;
varying vec2 vQ;
void main(){ float t = position.y; vQ = vec2(position.x * 2.0, t);
  vec3 c = uN + (uA * t + uB * uCurv * t * t) * uL; vec3 ax = normalize(uA + uB * 2.0 * uCurv * t);
  vec3 side = normalize(cross(ax, normalize(c))); float w = mix(uW0, uW1, pow(t, 0.7));
  vec3 p = c + side * position.x * w * 2.0;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  #include <logdepthbuf_vertex>
}`;
export const TAIL_FS = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 uC; uniform float uI; uniform float uFall;
varying vec2 vQ;
void main(){
  #include <logdepthbuf_fragment>
  float a = uI * exp(-vQ.x * vQ.x * 5.0) * pow(1.0 - vQ.y, uFall) * smoothstep(0.0, 0.02, vQ.y + 0.01);
  if (a < 0.002) discard;
  gl_FragColor = vec4(uC * a, 1.0);
  #include <colorspace_fragment>
}`;
// Hvězdy: ve vesmíru neblikají (mihotání dělá až vzduch nad Zemí), proto svítí klidně. Slabé jsou ostrý bod, jasné mají malé jádro,
// měkkou zář a u těch nejjasnějších náznak kříže jako na snímcích z dalekohledu. Barva podle teploty, o něco sytější.
export const STAR_VS = /* glsl */ `
attribute float aMag; attribute vec3 aCol; uniform float uPx; uniform float uGain;
varying vec3 vCol; varying float vA; varying float vB;
void main(){
  gl_Position = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0); gl_Position.z = gl_Position.w * 0.999;
  float I = pow(10.0, -0.4 * (aMag - 1.0)) * uGain;                 // 1 mag → 1, 6 mag → 0,01, Sirius → 9,6
  float L = log(1.0 + I * 6.0) / 2.302585;
  vB = smoothstep(0.55, 1.5, L);                                    // asi 45 nejjasnějších hvězd
  vec3 sat = max(mix(vec3(dot(aCol, vec3(0.3333))), aCol, 1.4), 0.0);
  vCol = sat * (1.0 + 0.55 * L); vA = clamp(0.15 + 0.75 * L, 0.0, 1.0);
  gl_PointSize = (1.5 + 3.0 * L + 9.0 * vB) * uPx;
}`;
export const STAR_FS = /* glsl */ `
varying vec3 vCol; varying float vA; varying float vB;
void main(){ vec2 q = gl_PointCoord * 2.0 - 1.0; float r = length(q), s = 1.0 + 2.6 * vB;
  float core = exp(-r * r * 3.2 * s * s), halo = vB * 0.2 * exp(-r * 4.6);
  float spike = vB * vB * 0.15 * (exp(-abs(q.x) * 26.0) * exp(-abs(q.y) * 3.4) + exp(-abs(q.y) * 26.0) * exp(-abs(q.x) * 3.4));
  float a = (core + halo + spike) * vA * (1.0 - smoothstep(0.82, 1.0, r)); if (a < 0.006) discard;
  gl_FragColor = vec4(mix(vCol, vec3(1.0), core * 0.35) * a, 1.0);
  #include <colorspace_fragment>
}`;
export const SKY_VS = /* glsl */ `
varying vec3 vD;
void main(){ vD = position; gl_Position = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0); gl_Position.z = gl_Position.w * 0.9995; }`;
export const SKY_FS = /* glsl */ `
uniform sampler2D tSky; uniform mat3 uS2Eq; uniform float uGain; varying vec3 vD;
void main(){ vec3 e = uS2Eq * normalize(vD); float ra = atan(e.y, e.x), de = asin(clamp(e.z, -1.0, 1.0));
  float u0 = 0.25 - ra * 0.15915494, ua = fract(u0), ub = fract(u0 + 0.5) - 0.5;
  vec3 c = texture2D(tSky, vec2(fwidth(ua) < fwidth(ub) ? ua : ub, de * 0.31830989 + 0.5)).rgb;
  gl_FragColor = vec4(c * uGain, 1.0);
  #include <colorspace_fragment>
}`;

// Souhvězdí: spojnice vyrůstá z obou hvězd a uprostřed se spojí, po dokreslení krátce zažhne. Čára má „patinu“ (místy silnější,
// místy vybledlá) a hvězd se nedotýká. uKid = dětské rozhraní: delší nájezd, teplejší barvy, výraznější patina. uFr = slabý lem kolem čáry.
export const CON_VS = /* glsl */ `
attribute float aT; attribute float aLen; attribute float aDel; uniform vec2 uOff; varying float vT; varying float vL; varying float vD;
void main(){ gl_Position = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0); gl_Position.z = gl_Position.w * 0.9993; gl_Position.xy += uOff * gl_Position.w; vT = aT; vL = aLen; vD = aDel; }`;
// Souhvězdí (uLv 0–4; rozhraní používá jen úrovně 0, 1, 3, 4 – viz CON_LV v engine.js): čáry vedou až do hvězd a sílí (1 slabé, 2 střední, 3 plné), hvězdy na koncích jsou zvýrazněné úměrně stupni; 4 navíc jména. uC = barva (Velký vůz má teplejší).
export const CON_FS = /* glsl */ `
uniform float uA; uniform float uG; uniform float uKid; uniform float uFr; uniform float uLv; uniform vec3 uC; varying float vT; varying float vL; varying float vD;
void main(){ float e = min(vT, 1.0 - vT), dur = mix(0.8, 1.2, uKid), t0 = vD * mix(0.3, 0.6, uKid), g = clamp((uG - t0) / dur, 0.0, 1.0); g = g * g * (3.0 - 2.0 * g);
  if (e > g * 0.5 + 0.0005) discard;
  float s1 = clamp(uLv, 0.0, 1.0), s2 = clamp(uLv - 1.0, 0.0, 1.0), s3 = clamp(uLv - 2.0, 0.0, 1.0);
  float tip = (1.0 - g) * smoothstep(0.07, 0.0, g * 0.5 - e);
  float flash = g >= 1.0 ? exp(-(uG - t0 - dur) * 2.2) : 0.0;
  float gap = 1.0;   // iterace 11: čáry vedou až do hvězd (Ondřej), mezera zrušena
  vec3 c = mix(vec3(0.58, 0.72, 1.0), vec3(0.74, 0.86, 1.0), uKid); c = mix(c, vec3(1.0, 0.98, 0.94), min(1.0, flash * 0.5 + tip));
  float k = uA * uFr * gap * (0.36 * s1 + 0.40 * s2 + 0.26 * s3) * (1.0 + flash * 0.6 + tip * 1.6) * mix(1.0, 1.12, uKid);
  gl_FragColor = vec4(c * uC * k, 1.0);
  #include <colorspace_fragment>
}`;
// Zvýrazněné hvězdy souhvězdí: jádro, měkká zář a čtyři paprsky jako na snímku z dalekohledu (u nejjasnějších i slabé úhlopříčné).
export const CST_VS = /* glsl */ `
attribute float aMag; attribute vec3 aCol; uniform float uPx; uniform float uS; uniform float uKid; varying vec3 vCol; varying float vB; varying float vK;
void main(){ gl_Position = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0); gl_Position.z = gl_Position.w * 0.9992;
  float L = clamp((5.2 - aMag) / 5.5, 0.0, 1.0); vB = L; vK = uKid; vCol = mix(aCol, vec3(1.0), mix(0.55, 0.3, uKid));   // děti: sytější barva hvězd
  gl_PointSize = (9.0 + 30.0 * L * L + 8.0 * L) * uPx * mix(1.3, 1.5, uKid) * (0.42 + 0.58 * uS); }`; // dospělí střídměji, děti odvážněji
export const CST_FS = /* glsl */ `
uniform float uS; varying vec3 vCol; varying float vB; varying float vK;
void main(){ vec2 q = gl_PointCoord * 2.0 - 1.0; float r = length(q), w = mix(9.0, 20.0, vB);
  float core = exp(-r * r * w * w * 0.5), halo = (0.10 + 0.16 * vB) * exp(-r * 5.0);
  float sp = exp(-abs(q.x) * w * 1.6) * exp(-abs(q.y) * 3.0) + exp(-abs(q.y) * w * 1.6) * exp(-abs(q.x) * 3.0);
  vec2 d = vec2(q.x + q.y, q.x - q.y) * 0.7071; float sd = exp(-abs(d.x) * w * 2.0) * exp(-abs(d.y) * 6.0) + exp(-abs(d.y) * w * 2.0) * exp(-abs(d.x) * 6.0);
  float a = (core + halo * mix(0.8, 1.1, vK) + sp * (0.22 + 0.5 * vB) * mix(1.0, 1.5, vK) * smoothstep(0.25, 0.9, uS + vB * 0.4) + sd * mix(0.2, 0.6, vK) * vB * vB * smoothstep(0.6, 1.0, uS)) * mix(0.55, 1.0, uS) * step(0.001, uS) * (1.0 - smoothstep(0.4, 1.0, r)); if (a < 0.004) discard;
  gl_FragColor = vec4(mix(vCol, vec3(1.0), min(1.0, core + sp * 0.4)) * a, 1.0);
  #include <colorspace_fragment>
}`;
