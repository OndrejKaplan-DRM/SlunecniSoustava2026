// Krajina pod nohama pro pohled z povrchu (verze 2.2): terén kolem pozorovatele v metrech, místní soustava x = východ, y = nahoru,
// z = jih. Mřížka je polární (jemná u nohou, hrubá u obzoru, do 150 km), výšky = zakřivení tělesa + reliéf podle typu krajiny
// (data/krajiny.js): vzdálené kopce, zvlnění, krátery všech velikostí (hustota jako na nasyceném povrchu, N(>D) ~ D⁻²), duny,
// hřebeny ledu. Barva = mapa tělesa v místě každého vrcholu (sharp: vzorek obrázku), na Zemi i druh krajiny podle mapy (moře,
// les, poušť, led). Kameny, oblázky a stromy jako InstancedMesh. Vše je ze semínka místa: stejné místo = stejná krajina.
import * as THREE from 'three';
const TAU = Math.PI * 2;
/* ---------- šum ---------- */
function hash2(ix, iy, s) {
  let h = (ix * 374761393 + iy * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
/* gradientní šum 2D, výsledek asi −1…1 */
function gnoise(x, y, s) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    fx = x - ix,
    fy = y - iy,
    u = fx * fx * fx * (fx * (fx * 6 - 15) + 10),
    v = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const g = (cx, cy, dx, dy) => {
    const a = hash2(cx, cy, s) * TAU;
    return Math.cos(a) * dx + Math.sin(a) * dy;
  };
  const n00 = g(ix, iy, fx, fy),
    n10 = g(ix + 1, iy, fx - 1, fy),
    n01 = g(ix, iy + 1, fx, fy - 1),
    n11 = g(ix + 1, iy + 1, fx - 1, fy - 1);
  return 1.4 * (n00 + (n10 - n00) * u + (n01 - n00) * v + (n00 - n10 - n01 + n11) * u * v);
}
export function fbm(x, y, s, oct, lac = 2.03, gain = 0.5) {
  let a = 1,
    f = 1,
    t = 0,
    n = 0;
  for (let k = 0; k < oct; k++) {
    t += a * gnoise(x * f, y * f, s + k * 17);
    n += a;
    a *= gain;
    f *= lac;
  }
  return t / n;
}
function ridged(x, y, s, oct) {
  let a = 1,
    f = 1,
    t = 0,
    n = 0;
  for (let k = 0; k < oct; k++) {
    const v = 1 - Math.abs(gnoise(x * f, y * f, s + k * 31));
    t += a * v * v;
    n += a;
    a *= 0.5;
    f *= 2.1;
  }
  return t / n;
}
export const seedOf = (id, lat, lon) => {
  let h = 2166136261;
  const s = `${id}|${lat.toFixed(4)}|${lon.toFixed(4)}`;
  for (let k = 0; k < s.length; k++) h = Math.imul(h ^ s.charCodeAt(k), 16777619);
  return (h >>> 0) % 100000;
};
/* ---------- krátery: nasycená populace, oktávy po dvojnásobcích průměru ---------- */
function craterField(p, seed) {
  const oct = [];
  if (!p.krat) return null;
  for (let D = p.maly ? 400 : 4000, k = 0; D >= 1.2; D /= 2, k++) {
    /* hustota kráterů nad průměrem D ~ D⁻²: na buňku o hraně c připadá stálý počet; mladé povrchy mají míň */
    oct.push({ D, c: D * 2.6, p: Math.min(0.9, 0.55 * p.krat), s: seed + k * 101, dep: D < 300 ? 0.19 : 0.12 });
  }
  return (x, y, minD, out) => {
    let h = 0,
      ej = 0;
    for (const o of oct) {
      if (o.D < minD) break;
      const gx = Math.floor(x / o.c),
        gy = Math.floor(y / o.c);
      for (let a = -1; a <= 1; a++)
        for (let b = -1; b <= 1; b++) {
          const cx = gx + a,
            cy = gy + b;
          if (hash2(cx, cy, o.s) > o.p) continue;
          const D = o.D * (0.55 + 0.9 * hash2(cx, cy, o.s + 1)),
            px = (cx + hash2(cx, cy, o.s + 2)) * o.c,
            py = (cy + hash2(cx, cy, o.s + 3)) * o.c,
            r = Math.hypot(x - px, y - py) / (D / 2);
          if (r > 2.6) continue;
          /* stáří: část kráterů je zahlazená */
          const age = 0.35 + 0.65 * hash2(cx, cy, o.s + 4),
            dep = o.dep * D * age,
            rim = 0.036 * D * age;
          h += r < 1 ? (r * r - 1) * dep + rim * (r * r * r) : rim / (r * r * r);
          if (r < 2.2) ej = Math.max(ej, (1 - age) * (r < 1 ? 0.6 : 1 - (r - 1) / 1.2));
        }
    }
    if (out) out[0] = ej;
    return h;
  };
}
/* Země: druh krajiny podle barvy mapy (sRGB 0–255) */
export function biome(r, g, b) {
  if (Math.min(r, g, b) > 175) return 'led';
  if (b > r + 14 && b >= g - 10) return 'more';
  if (g > r && g >= b) return 'les';
  return 'poust';
}
const lin = (v) => Math.pow(v / 255, 2.2);
/**
 * Stavba krajiny. o = { T (typ z krajiny.js), R (km), seed, map: {w, h, d (RGBA)} nebo null, lat, lon (°), col (barva tělesa 0–1), id, eye (m) }
 * Vrací { group, eyeY, minDist, info }.
 */
export function buildTeren(o) {
  const T = o.T,
    Rm = o.R * 1000,
    seed = o.seed,
    earth = o.id === 'earth',
    deck = T.typ === 'mraky',
    lat0 = (o.lat * Math.PI) / 180,
    lon0 = (o.lon * Math.PI) / 180,
    craters = craterField(T, seed),
    /* dosah: do 150 km, na malých tělesech kus koule (horizont je blízko) */
    rMax = Math.min(150000, Rm * (T.maly ? 0.9 : 0.6)),
    rMin = 0.35,
    NA = 384,
    NR = 170,
    q = Math.pow(rMax / rMin, 1 / (NR - 1)),
    map = o.map,
    base = o.col || [0.5, 0.5, 0.5];
  /* vzorek mapy v (šířka, délka) v radiánech → lineární barva, druh krajiny */
  const sample = (la, lo, out) => {
    if (!map) {
      out[0] = Math.pow(base[0], 2.2);
      out[1] = Math.pow(base[1], 2.2);
      out[2] = Math.pow(base[2], 2.2);
      out[3] = 0;
      return out;
    }
    const u = (((lo / TAU + 0.5) % 1) + 1) % 1,
      v = Math.min(0.9999, Math.max(0, 0.5 - la / Math.PI)),
      fx = u * map.w - 0.5,
      fy = v * map.h - 0.5,
      x0 = Math.floor(fx),
      y0 = Math.max(0, Math.min(map.h - 1, Math.floor(fy))),
      y1 = Math.min(map.h - 1, y0 + 1),
      tx = fx - x0,
      ty = Math.max(0, Math.min(1, fy - y0)),
      X0 = ((x0 % map.w) + map.w) % map.w,
      X1 = (X0 + 1) % map.w,
      d = map.d;
    for (let k = 0; k < 3; k++) {
      const a = d[(y0 * map.w + X0) * 4 + k],
        b = d[(y0 * map.w + X1) * 4 + k],
        c = d[(y1 * map.w + X0) * 4 + k],
        e = d[(y1 * map.w + X1) * 4 + k];
      out[k] = (a + (b - a) * tx) * (1 - ty) + (c + (e - c) * tx) * ty;
    }
    out[3] = 1;
    return out;
  };
  /* (vzdálenost r m, azimut θ od severu k východu) → šířka a délka (azimutální ekvidistantní zobrazení, přesné) */
  const sl0 = Math.sin(lat0),
    cl0 = Math.cos(lat0);
  const toLL = (r, th, out) => {
    const dlt = r / Rm,
      sd = Math.sin(dlt),
      cd = Math.cos(dlt),
      la = Math.asin(Math.max(-1, Math.min(1, sl0 * cd + cl0 * sd * Math.cos(th))));
    out[0] = la;
    out[1] = lon0 + Math.atan2(Math.sin(th) * sd * cl0, cd - sl0 * Math.sin(la));
    return out;
  };
  /* reliéf (m) v bodě (x východ, y sever); minD = nejmenší kráter, který má smysl při hustotě mřížky */
  const ej = [0];
  const relief = (x, y, minD) => {
    if (deck) {
      /* oblačná pokrývka obra: kupy a věže, vzdálené pásy */
      const b = fbm(x / 22000, y / 22000, seed, 4),
        c = Math.max(0, fbm(x / 6000, y / 6000, seed + 7, 4));
      return 1400 * b + 2600 * c * c + 120 * fbm(x / 700, y / 700, seed + 9, 3);
    }
    let h = 0;
    if (T.far) h += T.far * (0.65 * ridged(x / 26000, y / 26000, seed, 5) + 0.35 * fbm(x / 9000, y / 9000, seed + 3, 4));
    if (T.mid) h += T.mid * fbm(x / 600, y / 600, seed + 5, 5);
    if (T.near) h += T.near * fbm(x / 7, y / 7, seed + 11, 4);
    if (T.duny) {
      /* lineární duny ve směru západ–východ (Titan: výška asi 100 m, rozestup 2–3 km) */
      const w = y / 2600 + 0.35 * fbm(x / 9000, y / 9000, seed + 13, 3);
      h += 90 * Math.pow(Math.abs(Math.sin(w * Math.PI)), 1.6) * (0.6 + 0.4 * fbm(x / 20000, 0, seed + 14, 2));
    }
    if (T.hrebeny) {
      /* dvojité hřebeny Europy: přímé pruhy v náhodných směrech */
      for (let k = 0; k < 4; k++) {
        const a = hash2(k, 1, seed) * Math.PI,
          off = hash2(k, 2, seed) * 4000,
          dd = Math.abs(((x * Math.cos(a) + y * Math.sin(a) + off) % 4000) - 2000);
        h += 110 * Math.max(0, 1 - Math.abs(dd - 120) / 160) + 110 * Math.max(0, 1 - Math.abs(dd + 120 - 0) / 160);
      }
    }
    if (craters) h += craters(x, y, minD, ej);
    else ej[0] = 0;
    return h;
  };
  /* --- mřížka --- */
  const nV = NA * NR + 1,
    pos = new Float32Array(nV * 3),
    col = new Float32Array(nV * 3),
    rr = new Float32Array(NR),
    ll = [0, 0],
    sm = [0, 0, 0, 0],
    kinds = earth ? new Uint8Array(nV) : null;
  for (let k = 0; k < NR; k++) rr[k] = k === 0 ? rMin : rMin * Math.pow(q, k);
  /* výška pozorovatele (střed) */
  const h0 = relief(0, 0, 0.5);
  let water0 = 0;
  const KIND = { more: 1, les: 2, poust: 3, led: 4 };
  const setV = (v, x, y, r) => {
    const minD = Math.max(1.2, r * 0.09);
    let h = relief(x, y, minD);
    const drop = Rm - Math.sqrt(Math.max(0, Rm * Rm - r * r)) /* zakřivení: přesně koule */;
    toLL(r, Math.atan2(x, y), ll);
    sample(ll[0], ll[1], sm);
    let c0 = lin(sm[0]),
      c1 = lin(sm[1]),
      c2 = lin(sm[2]);
    if (!sm[3]) {
      c0 = sm[0];
      c1 = sm[1];
      c2 = sm[2];
    }
    const nn = 0.82 + 0.36 * (0.5 + 0.5 * fbm(x / 35, y / 35, seed + 21, 3)) * (T.typ === 'led' ? 0.8 : 1);
    let k = nn * (T.ton || 1) * (1 + 0.5 * ej[0]);
    if (earth) {
      const bk = biome(sm[0], sm[1], sm[2]);
      kinds[v] = KIND[bk];
      if (bk === 'more') {
        /* hladina moře: výška nula vůči moři, barva vody */
        h = h0 - water0;
        c0 = 0.012;
        c1 = 0.03;
        c2 = 0.055;
        k = 1;
      } else if (bk === 'les') {
        /* tráva a les: zelená z mapy, trochu světlejší (mapa je tmavá kvůli lesům) */
        c0 *= 1.25;
        c1 *= 1.35;
        c2 *= 1.1;
      } else if (bk === 'led') {
        c0 = c1 = 0.75;
        c2 = 0.8;
      }
    }
    pos[v * 3] = x;
    pos[v * 3 + 1] = h - h0 - drop;
    pos[v * 3 + 2] = -y;
    col[v * 3] = c0 * k;
    col[v * 3 + 1] = c1 * k;
    col[v * 3 + 2] = c2 * k;
  };
  if (earth) {
    /* Země: pozorovatel stojí na pevnině několik metrů až desítek metrů nad mořem (kopce z reliéfu) */
    water0 = Math.max(4, h0 - (T.far || 0) * 0.15 + 12);
  }
  setV(0, 0, 0, 0);
  for (let k = 0; k < NR; k++)
    for (let a = 0; a < NA; a++) {
      const th = ((a + (k & 1) * 0.5) / NA) * TAU,
        r = rr[k];
      setV(1 + k * NA + a, r * Math.sin(th), r * Math.cos(th), r);
    }
  const idx = [];
  for (let a = 0; a < NA; a++) idx.push(0, 1 + ((a + 1) % NA), 1 + a);
  for (let k = 0; k < NR - 1; k++)
    for (let a = 0; a < NA; a++) {
      const a1 = (a + 1) % NA,
        i0 = 1 + k * NA + a,
        i1 = 1 + k * NA + a1,
        j0 = 1 + (k + 1) * NA + a,
        j1 = 1 + (k + 1) * NA + a1;
      if (k & 1) idx.push(i0, i1, j1, i0, j1, j0);
      else idx.push(i0, i1, j0, i1, j1, j0);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  const group = new THREE.Group();
  /* výška terénu pod bodem (x, z) ve stejné soustavě jako mřížka – pro kameny a stromy */
  const yAt = (x, z) => {
    const y = -z,
      r = Math.hypot(x, y),
      drop = Rm - Math.sqrt(Math.max(0, Rm * Rm - r * r));
    return relief(x, y, Math.max(1.2, r * 0.09)) - h0 - drop;
  };
  /* druh krajiny Země v bodě (podle nejbližšího vrcholu mřížky) */
  const kindAt = (x, z) => {
    if (!kinds) return 0;
    const r = Math.hypot(x, z);
    if (r < rMin) return kinds[0];
    const k = Math.max(0, Math.min(NR - 1, Math.round(Math.log(r / rMin) / Math.log(q)))),
      th = (Math.atan2(x, -z) + TAU) % TAU,
      a = Math.round((th / TAU) * NA - (k & 1) * 0.5);
    return kinds[1 + k * NA + (((a % NA) + NA) % NA)];
  };
  return { geo, group, yAt, kindAt, h0, rMax, deck, water0, info: { NA, NR, rMax } };
}
/* ---------- kameny, oblázky, stromy ---------- */
function rockGeo(seed, kind) {
  const g = new THREE.IcosahedronGeometry(1, kind === 'oblazek' ? 2 : 1),
    p = g.attributes.position;
  for (let k = 0; k < p.count; k++) {
    let x = p.getX(k),
      y = p.getY(k),
      z = p.getZ(k);
    const n = gnoise(x * 1.7 + seed, y * 1.7, seed) * 0.5 + gnoise(x * 3.3, z * 3.3 + seed, seed + 3) * 0.25;
    let s = kind === 'oblazek' ? 1 + 0.08 * n : 1 + 0.32 * n;
    if (kind === 'deska') y *= 0.22;
    else if (kind !== 'oblazek') y *= 0.72;
    else y *= 0.6;
    /* spodek zarovnat: kámen leží */
    if (y < -0.25) y = -0.25 + (y + 0.25) * 0.3;
    p.setXYZ(k, x * s, y * s, z * s);
  }
  g.computeVertexNormals();
  return g;
}
export function buildRocks(o, ter) {
  const T = o.T,
    seed = o.seed,
    meshes = [];
  if (!T.kam || ter.deck) return meshes;
  const kind = T.typ === 'venuse' ? 'deska' : T.typ === 'titan' ? 'oblazek' : 'kamen',
    mat = new THREE.MeshLambertMaterial({ vertexColors: false, color: 0xffffff }),
    sets = [
      { n: Math.round(900 * T.kam), r0: 2, r1: 260, s0: 0.12 * T.kamMax, s1: T.kamMax, shadow: true },
      { n: Math.round(2200 * Math.min(1.5, T.kam)), r0: 0.6, r1: 22, s0: 0.02, s1: 0.18 * T.kamMax + 0.04, shadow: true },
    ],
    m4 = new THREE.Matrix4(),
    qt = new THREE.Quaternion(),
    eu = new THREE.Euler(),
    sc = new THREE.Vector3(),
    ps = new THREE.Vector3(),
    cc = new THREE.Color(),
    tint = o.rockCol || [0.3, 0.28, 0.26];
  let si = 0;
  for (const st of sets) {
    const g = rockGeo(seed + si * 7, kind),
      im = new THREE.InstancedMesh(g, mat, st.n);
    let n = 0;
    for (let k = 0; k < st.n * 3 && n < st.n; k++) {
      const u = hash2(k, si, seed + 55),
        /* hustota klesá se vzdáleností jako 1/r (víc kamenů blízko, kde jsou vidět) */
        r = st.r0 * Math.pow(st.r1 / st.r0, u),
        th = hash2(k, si, seed + 56) * TAU,
        x = r * Math.sin(th),
        z = -r * Math.cos(th);
      /* shluky: kameny u kráterů a v pásech */
      if (fbm(x / 40, z / 40, seed + 57, 2) < -0.25 + 0.2 * hash2(k, 3, seed)) continue;
      if (ter.kindAt(x, z) === 1) continue; /* ne v moři */
      const s = st.s0 * Math.pow(st.s1 / st.s0, Math.pow(hash2(k, si, seed + 58), 2.2)),
        y = ter.yAt(x, z);
      eu.set(hash2(k, 4, seed) * 0.5 - 0.25, hash2(k, 5, seed) * TAU, hash2(k, 6, seed) * 0.5 - 0.25);
      qt.setFromEuler(eu);
      const ax = 0.7 + 0.6 * hash2(k, 7, seed),
        az = 0.7 + 0.6 * hash2(k, 8, seed);
      sc.set(s * ax, s, s * az);
      ps.set(x, y + s * 0.12, z);
      m4.compose(ps, qt, sc);
      im.setMatrixAt(n, m4);
      const v = 0.7 + 0.6 * hash2(k, 9, seed);
      cc.setRGB(tint[0] * v, tint[1] * v, tint[2] * v);
      im.setColorAt(n, cc);
      n++;
    }
    im.count = n;
    im.castShadow = st.shadow;
    im.receiveShadow = true;
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    meshes.push(im);
    si++;
  }
  return meshes;
}
/* stromy: jen na Zemi a jen tam, kde mapa ukazuje les nebo trávu (nikdy na jiném tělese) */
export function buildTrees(o, ter) {
  if (o.id !== 'earth') return [];
  const seed = o.seed,
    cone = new THREE.ConeGeometry(1, 1, 7, 1),
    ball = new THREE.IcosahedronGeometry(1, 1);
  cone.translate(0, 0.5, 0);
  ball.translate(0, 0.5, 0);
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff }),
    jeh = new THREE.InstancedMesh(cone, mat, 5000),
    lis = new THREE.InstancedMesh(ball, mat, 3000),
    m4 = new THREE.Matrix4(),
    qt = new THREE.Quaternion(),
    sc = new THREE.Vector3(),
    ps = new THREE.Vector3(),
    cc = new THREE.Color();
  let nj = 0,
    nl = 0;
  for (let k = 0; k < 40000 && (nj < 5000 || nl < 3000); k++) {
    const u = hash2(k, 1, seed + 77),
      r = 25 * Math.pow(5000 / 25, u),
      th = hash2(k, 2, seed + 77) * TAU,
      x = r * Math.sin(th),
      z = -r * Math.cos(th);
    if (ter.kindAt(x, z) !== 2) continue;
    /* lesy v ostrůvcích, louky mezi nimi */
    const f = fbm(x / 900, z / 900, seed + 78, 4);
    if (f < 0.12) continue;
    const y = ter.yAt(x, z),
      hgt = 12 + 18 * hash2(k, 3, seed + 77),
      con = hash2(k, 4, seed + 77) < 0.55;
    qt.identity();
    if (con && nj < 5000) {
      sc.set(hgt * 0.22, hgt, hgt * 0.22);
      ps.set(x, y - 0.5, z);
      m4.compose(ps, qt, sc);
      jeh.setMatrixAt(nj, m4);
      const v = 0.75 + 0.5 * hash2(k, 5, seed);
      cc.setRGB(0.018 * v, 0.04 * v, 0.016 * v);
      jeh.setColorAt(nj++, cc);
    } else if (!con && nl < 3000) {
      sc.set(hgt * 0.4, hgt * 0.85, hgt * 0.4);
      ps.set(x, y + hgt * 0.12, z);
      m4.compose(ps, qt, sc);
      lis.setMatrixAt(nl, m4);
      const v = 0.75 + 0.5 * hash2(k, 6, seed);
      cc.setRGB(0.03 * v, 0.06 * v, 0.02 * v);
      lis.setColorAt(nl++, cc);
    }
  }
  jeh.count = nj;
  lis.count = nl;
  for (const m of [jeh, lis]) {
    m.castShadow = true;
    m.receiveShadow = true;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }
  return [jeh, lis].filter((m) => m.count > 0);
}
