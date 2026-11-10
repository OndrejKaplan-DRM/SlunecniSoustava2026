// Shadery těles, Slunce, prstenců, atmosfér, ohonů komet a oblohy. Všechny, které testují hloubku, používají logaritmický
// z-buffer three.js (rozsah od metrů po stovky AU v jedné scéně).
const NOISE = /* glsl */`
float h31(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z); }
`;
export const BODY_VS = /* glsl */`
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
export const BODY_FS = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D tMap; uniform sampler2D tAux; uniform sampler2D tRing;
uniform float uHasMap; uniform float uHasAux; uniform float uKind; uniform float uDet; uniform float uSeed; uniform float uFill; uniform float uGam;
uniform float uAtmK; uniform float uSunR; uniform float uRad; uniform float uTime;
uniform vec3 uCol; uniform vec3 uSun; uniform vec3 uAtmCol; uniform vec3 uPole; uniform vec3 uCtr; uniform vec3 uRingSh; uniform mat3 uRot;
uniform vec4 uOcc[4];
varying vec3 vO; varying vec3 vN; varying vec3 vP;
${NOISE}
void main(){
  #include <logdepthbuf_fragment>
  vec3 o = normalize(vO);
  float lat = asin(clamp(o.z, -1.0, 1.0)), lon = atan(o.y, o.x);
  float u0 = lon * 0.15915494 + 0.5, ua = fract(u0), ub = fract(u0 + 0.5) - 0.5;
  vec2 uv = vec2(fwidth(ua) < fwidth(ub) ? ua : ub, lat * 0.31830989 + 0.5);
  vec3 alb = uHasMap > 0.5 ? texture2D(tMap, uv).rgb : uCol;
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
  vec3 col = alb * (lit * sh + uFill) + add;
  if (uAtmK > 0.0) col += uAtmCol * pow(1.0 - mu, 3.0) * uAtmK * (smoothstep(-0.12, 0.3, mu0) * sh + uFill);
  col = pow(max(col, vec3(0.0)), vec3(1.0 / uGam));
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;
// Slunce: uMode 0 = bílé světlo (fotosféra se skvrnami), 1 = H-alfa (chromosféra, filamenty), 2 = EUV 171 Å (koróna, smyčky)
export const SUN_FS = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D tMap; uniform float uHasMap; uniform vec3 uCtr; uniform float uTime; uniform float uMode; uniform vec4 uFlare; uniform vec3 uAR[16];
varying vec3 vO; varying vec3 vN; varying vec3 vP;
${NOISE}
void main(){
  #include <logdepthbuf_fragment>
  vec3 o = normalize(vO); float lat = asin(clamp(o.z, -1.0, 1.0)), lon = atan(o.y, o.x);
  float u0 = lon * 0.15915494 + 0.5, ua = fract(u0), ub = fract(u0 + 0.5) - 0.5;
  vec2 uv = vec2(fwidth(ua) < fwidth(ub) ? ua : ub, lat * 0.31830989 + 0.5);
  vec3 V = normalize(-(uCtr + vP)); float mu = max(dot(normalize(vN), V), 0.0);
  float ar = 0.0; for (int k = 0; k < 16; k++) ar = max(ar, smoothstep(0.984, 0.9985, dot(o, uAR[k])) * (k < 6 ? 1.0 : 0.72));
  vec3 tex = uHasMap > 0.5 ? texture2D(tMap, uv).rgb : vec3(0.3);
  float lum = dot(tex, vec3(0.4, 0.45, 0.15)), act = uHasMap > 0.5 ? dot(texture2D(tMap, uv, 3.0).rgb, vec3(0.4, 0.45, 0.15)) : 0.3;
  float a2 = ar;
  float n1 = vn(o * 30.0 + 3.1), n2 = vn(o * 95.0 + 7.7), sp = a2 * smoothstep(0.42, 0.66, n1 * 0.7 + n2 * 0.3 + (a2 - 0.6) * 0.5);
  float umb = smoothstep(0.55, 0.8, sp), pen = smoothstep(0.12, 0.5, sp);
  float gr = vn(o * 260.0 + uTime) * 0.6 + vn(o * 620.0 - uTime * 0.7) * 0.4;
  vec3 col;
  if (uMode < 0.5) {
    col = mix(vec3(1.0, 0.36, 0.05), vec3(1.0, 0.68, 0.16), pow(mu, 0.7)) * (0.3 + 0.7 * pow(mu, 0.55)) * (0.9 + 0.2 * gr) * 0.9;
    col += vec3(1.0, 0.95, 0.8) * a2 * (1.0 - pen) * pow(1.0 - mu, 2.0) * 0.5;                    // fakule u okraje
    col *= mix(1.0, 0.5 + 0.1 * n2, pen); col = mix(col, col * vec3(0.1, 0.07, 0.05), umb);
  } else if (uMode < 1.5) {
    float fib = vn(o * vec3(70.0, 70.0, 24.0) + uTime * 0.2), fil = 1.0 - abs(2.0 * vn(o * vec3(8.0, 8.0, 21.0) + 11.0) - 1.0);
    col = vec3(1.0, 0.17, 0.03) * (0.42 + 0.58 * pow(mu, 0.4)) * (0.7 + 0.6 * fib) * 1.05;
    col += vec3(1.0, 0.55, 0.25) * a2 * (0.35 + 0.5 * n1);                                         // plage
    col *= 1.0 - 0.7 * smoothstep(0.9, 0.975, fil) * smoothstep(0.42, 0.6, vn(o * 2.6 + 5.0));     // tmavé filamenty
    col = mix(col, col * 0.25, umb); col += vec3(1.0, 0.25, 0.08) * pow(1.0 - mu, 6.0) * 0.8;      // spikule na okraji
  } else {
    col = mix(vec3(0.3, 0.09, 0.0), vec3(1.0, 0.72, 0.16), clamp(lum * 2.4, 0.0, 1.0)) * 1.15 + vec3(1.0, 0.9, 0.6) * (pow(lum, 3.0) * 4.0 + ar * ar * 0.5);
    col *= (0.85 + 0.3 * vn(o * 40.0 + uTime * 0.3)) * (0.8 + 0.5 * pow(1.0 - mu, 2.0));
  }
  col += vec3(1.0, 0.95, 0.85) * uFlare.w * exp(-(1.0 - dot(o, uFlare.xyz)) * 900.0) * 6.0;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;
// záře: čtverec natočený ke kameře; uS = poloměr v km
export const GLOW_VS = /* glsl */`
#include <common>
#include <logdepthbuf_pars_vertex>
uniform float uS; varying vec2 vQ;
void main(){ vQ = position.xy; vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0); mv.xy += position.xy * uS; gl_Position = projectionMatrix * mv;
  #include <logdepthbuf_vertex>
}`;
export const GLOW_FS = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 uC; uniform float uI; uniform float uCore; uniform float uRay; varying vec2 vQ;
void main(){
  #include <logdepthbuf_fragment>
  float r = length(vQ); if (r > 1.0) discard;
  float x = max(r, uCore) / uCore;                 // 1 na okraji kotouče
  float a = uI * (1.6 / (x * x * x) + 0.05 / x) * pow(1.0 - r, 1.5);
  float ang = atan(vQ.y, vQ.x); float st = pow(abs(cos(ang + 0.2)), 5.0) * 0.9 + 0.22 * sin(ang * 11.0 + 1.3) + 0.14 * sin(ang * 23.0 + 4.0) + 0.1 * sin(ang * 47.0);
  a *= 1.0 + uRay * st * smoothstep(1.0, 3.0, x) + uRay * 0.25 * smoothstep(1.0, 2.0, x);
  gl_FragColor = vec4(uC * a, 1.0);
  #include <colorspace_fragment>
}`;
export const RING_VS = /* glsl */`
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vP; varying float vR;
void main(){ vR = length(position.xy); vP = mat3(modelMatrix) * position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  #include <logdepthbuf_vertex>
}`;
export const RING_FS = /* glsl */`
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
export const ATM_VS = /* glsl */`
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vW;
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
  #include <logdepthbuf_vertex>
}`;
export const ATM_FS = /* glsl */`
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
export const TAIL_VS = /* glsl */`
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
export const TAIL_FS = /* glsl */`
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
export const STAR_VS = /* glsl */`
attribute float aMag; attribute vec3 aCol; uniform float uPx; uniform float uGain;
varying vec3 vCol; varying float vA;
void main(){
  gl_Position = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0); gl_Position.z = gl_Position.w * 0.999;
  float I = pow(10.0, -0.4 * (aMag - 1.0)) * uGain;
  vCol = aCol * (1.2 + 0.5 * min(I, 4.0)); vA = min(1.0, 0.85 * pow(I, 0.42) + 0.06);
  gl_PointSize = clamp(1.6 + 2.6 * log(1.0 + I) / 2.302585, 1.4, 6.0) * uPx;
}`;
export const STAR_FS = /* glsl */`
varying vec3 vCol; varying float vA;
void main(){ vec2 q = gl_PointCoord * 2.0 - 1.0; float r = length(q); float a = exp(-r * r * 3.0) * vA; if (a < 0.01) discard; gl_FragColor = vec4(vCol * a, 1.0);
  #include <colorspace_fragment>
}`;
export const SKY_VS = /* glsl */`
varying vec3 vD;
void main(){ vD = position; gl_Position = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0); gl_Position.z = gl_Position.w * 0.9995; }`;
export const SKY_FS = /* glsl */`
uniform sampler2D tSky; uniform mat3 uS2Eq; uniform float uGain; varying vec3 vD;
void main(){ vec3 e = uS2Eq * normalize(vD); float ra = atan(e.y, e.x), de = asin(clamp(e.z, -1.0, 1.0));
  float u0 = 0.25 - ra * 0.15915494, ua = fract(u0), ub = fract(u0 + 0.5) - 0.5;
  vec3 c = texture2D(tSky, vec2(fwidth(ua) < fwidth(ub) ? ua : ub, de * 0.31830989 + 0.5)).rgb;
  gl_FragColor = vec4(c * uGain, 1.0);
  #include <colorspace_fragment>
}`;

export const CON_VS = /* glsl */`
void main(){ gl_Position = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0); gl_Position.z = gl_Position.w * 0.9993; }`;
export const CON_FS = /* glsl */`
uniform float uA; void main(){ gl_FragColor = vec4(vec3(0.32, 0.5, 0.95) * uA, 1.0);
  #include <colorspace_fragment>
}`;
