// Tvar malých těles (iterace 2): trojosý elipsoid z poloos (katalog abc, km) + hrbolky (šum podle velikosti tělesa)
// + „krk“ dvojitých těles (67P, Arrokoth, Itokawa, Kleopatra – psí kost). Stejná funkce v GLSL (koule slotu, vrcholy)
// a v JS (povrch pro chůzi, výška ve směru) – oba počítají poloměr ve směru n v soustavě tělesa (x = dlouhá osa).
const NECK = { '67p': 0.33, arrokoth: 0.42, itokawa: 0.22, kleopatra: 0.38, '103p_hartley': 0.3, '19p_borrelly': 0.18 };
export function shapeParams(b) {
  const R = b.R || 1;
  let a = [1, 1, 1];
  if (b.abc) {
    const g = Math.cbrt(b.abc[0] * b.abc[1] * b.abc[2]);
    a = b.abc.map((x) => x / g);
  }
  const big = ['planet', 'star'].includes(b.type),
    lump = big || R > 300 ? 0 : R > 150 ? 0.03 : R > 50 ? 0.07 : R > 1 ? 0.12 : 0.07;
  const seed = [...b.id].reduce((s, c) => (s * 31 + c.charCodeAt(0)) % 997, 7) / 97;
  return { a, lump, neck: NECK[b.id] || 0, seed };
}
export const isIrregular = (p, b) =>
  Math.max(...p.a) / Math.min(...p.a) > 1.15 || p.neck > 0 || (p.lump >= 0.07 && (b.R || 1) < 100);
// --- JS (stejné jako GLSL níže) ---
const fr = (x) => x - Math.floor(x);
function h31(x, y, z) {
  x = fr(x * 0.3183099 + 0.1) * 17;
  y = fr(y * 0.3183099 + 0.1) * 17;
  z = fr(z * 0.3183099 + 0.1) * 17;
  return fr(x * y * z * (x + y + z));
}
function vn(x, y, z) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    iz = Math.floor(z);
  let fx = x - ix,
    fy = y - iy,
    fz = z - iz;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  fz = fz * fz * (3 - 2 * fz);
  const L = (a, b, t) => a + (b - a) * t;
  return L(
    L(L(h31(ix, iy, iz), h31(ix + 1, iy, iz), fx), L(h31(ix, iy + 1, iz), h31(ix + 1, iy + 1, iz), fx), fy),
    L(
      L(h31(ix, iy, iz + 1), h31(ix + 1, iy, iz + 1), fx),
      L(h31(ix, iy + 1, iz + 1), h31(ix + 1, iy + 1, iz + 1), fx),
      fy
    ),
    fz
  );
}
export function shapeR(n, P) {
  // n = jednotkový směr [x, y, z] v soustavě tělesa → poloměr (násobek středního poloměru)
  const a = P.a;
  let r = 1 / Math.hypot(n[0] / a[0], n[1] / a[1], n[2] / a[2]);
  if (P.lump > 0) {
    const s = P.seed;
    r *=
      1 +
      P.lump *
        ((vn(n[0] * 2.3 + s, n[1] * 2.3 + s, n[2] * 2.3 + s) - 0.5) * 1.2 +
          (vn(n[0] * 5.1 + s * 1.7, n[1] * 5.1 + s * 1.7, n[2] * 5.1 + s * 1.7) - 0.5) * 0.5);
  }
  if (P.neck > 0) r *= 1 - P.neck * Math.exp(-(n[0] * n[0]) / 0.06);
  return r;
}
export const SHAPE_GLSL = /* glsl */ `
uniform vec3 uAbc; uniform vec3 uShp; // uShp: x hrbolky, y krk, z seed
float sh31(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float svn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(sh31(i), sh31(i + vec3(1,0,0)), f.x), mix(sh31(i + vec3(0,1,0)), sh31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(sh31(i + vec3(0,0,1)), sh31(i + vec3(1,0,1)), f.x), mix(sh31(i + vec3(0,1,1)), sh31(i + vec3(1,1,1)), f.x), f.y), f.z); }
float shapeR(vec3 n){ float r = 1.0 / length(n / uAbc);
  if (uShp.x > 0.0) r *= 1.0 + uShp.x * ((svn(n * 2.3 + uShp.z) - 0.5) * 1.2 + (svn(n * 5.1 + uShp.z * 1.7) - 0.5) * 0.5);
  if (uShp.y > 0.0) r *= 1.0 - uShp.y * exp(-(n.x * n.x) / 0.06);
  return r; }
`;
