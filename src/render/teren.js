// Krajina pod nohama pro pohled z povrchu (verze 2.2): terén kolem pozorovatele v metrech, místní soustava x = východ, y = nahoru,
// z = jih. Mřížka je polární (jemná u nohou, hrubá u obzoru, do 150 km), výšky = zakřivení tělesa + reliéf podle typu krajiny
// (data/krajiny.js): vzdálené kopce, zvlnění, krátery všech velikostí (hustota jako na nasyceném povrchu, N(>D) ~ D⁻²), duny,
// hřebeny ledu. Barva = mapa tělesa v místě každého vrcholu (sharp: vzorek obrázku), na Zemi i druh krajiny podle mapy (moře,
// les, poušť, led). Kameny, oblázky a stromy jako InstancedMesh. Vše je ze semínka místa: stejné místo = stejná krajina.
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
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
function craterField(p, seed, dMax) {
  const oct = [];
  if (!p.krat) return null;
  for (let D = Math.min(dMax || 1e9, p.maly ? 400 : 4000), k = 0; D >= 1.2; D /= 2, k++) {
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
  if (b > 1.5 * r && b > 1.15 * g) return 'more';
  /* zeleň (les, louky) a tmavá pole mírného pásu; světlé a načervenalé = poušť, step, skály */
  if ((g >= 0.95 * r && g > 1.15 * b) || (0.2126 * r + 0.7152 * g + 0.0722 * b < 105 && r < 1.45 * b)) return 'les';
  return 'poust';
}
const lin = (v) => Math.pow(v / 255, 2.2);
/**
 * Stavba krajiny. o = { T (typ z krajiny.js), R (km), seed, map: {w, h, d (RGBA)} nebo null, lat, lon (°), col (barva tělesa 0–1), id, eye (m) }
 * Vrací { group, eyeY, minDist, info }.
 */
/* 2.3 (chůze): stavba mřížky po kouscích – generátor vrací řízení po každých dvou prstencích (o.slice), takže nová mřížka
   kolem chodce vzniká na pozadí během několika desítek snímků bez zaškobrtnutí; buildTeren ji postaví najednou */
export function buildTeren(o) {
  const it = buildTerenGen(o);
  for (;;) {
    const r = it.next();
    if (r.done) return r.value;
  }
}
/* index trojúhelníků závisí jen na velikosti mřížky – sdílený mezi stavbami */
const IDX = new Map();
function gridIndex(NA, NR) {
  const k = NA + ',' + NR;
  if (IDX.has(k)) return IDX.get(k);
  const ix = new Uint32Array(NA * 3 + (NR - 1) * NA * 6);
  let n = 0;
  for (let a = 0; a < NA; a++) {
    ix[n++] = 0;
    ix[n++] = 1 + ((a + 1) % NA);
    ix[n++] = 1 + a;
  }
  for (let k2 = 0; k2 < NR - 1; k2++)
    for (let a = 0; a < NA; a++) {
      const a1 = (a + 1) % NA,
        i0 = 1 + k2 * NA + a,
        i1 = 1 + k2 * NA + a1,
        j0 = 1 + (k2 + 1) * NA + a,
        j1 = 1 + (k2 + 1) * NA + a1;
      if (k2 & 1) {
        ix[n++] = i0;
        ix[n++] = i1;
        ix[n++] = j1;
        ix[n++] = i0;
        ix[n++] = j1;
        ix[n++] = j0;
      } else {
        ix[n++] = i0;
        ix[n++] = i1;
        ix[n++] = j0;
        ix[n++] = i1;
        ix[n++] = j1;
        ix[n++] = j0;
      }
    }
  IDX.set(k, ix);
  return ix;
}
export function* buildTerenGen(o) {
  const T = o.T,
    Rm = o.R * 1000,
    seed = o.seed,
    earth = o.id === 'earth',
    deck = T.typ === 'mraky',
    lat0 = (o.lat * Math.PI) / 180,
    lon0 = (o.lon * Math.PI) / 180,
    dem = o.dem || null,
    /* s výškovou mapou dělá velké tvary mapa; šum a krátery jen pod její rozlišení */
    craters = craterField(T, seed, dem ? Math.min(800, dem.res * 0.45) : 0),
    /* dosah: do 150 km, na malých tělesech kus koule (horizont je blízko) */
    /* 2.3: z vyvýšeného místa (Olympus Mons) je obzor dál – terén až k němu (o.rFar), jinak by hora vypadala jako náhorní rovina */
    rMax = Math.min(Math.max(150000, o.rFar || 0), Rm * (T.maly ? 0.9 : 0.6)),
    rMin = 0.35,
    /* telefon: řidší mřížka */
    NA = o.lite ? 256 : 384,
    NR = o.lite ? 130 : 170,
    q = Math.pow(rMax / rMin, 1 / (NR - 1)),
    map = o.map,
    alb = o.alb || 1,
    base = (o.col || [0.5, 0.5, 0.5]).map((v) => Math.pow(v, 2.2) * (o.alb || 1));
  /* vzorek mapy v (šířka, délka) v radiánech → lineární barva, druh krajiny */
  const sample = (la, lo, out) => {
    if (!map) {
      out[0] = base[0];
      out[1] = base[1];
      out[2] = base[2];
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
  /* konvektivní věže obrů: p = podíl buněk 70 × 70 km s věží, H = rozsah výšek (m), k = síla zvlnění vrstvy.
     Jupiter: věže asi 50 km široké i vysoké (Juno, PIA21647); Saturn hlouběji pod oparem (výšková škála 59,5 km), Uran a Neptun
     skoro hladké (Neptun: jednotlivá vyvýšená oblaka nad hlubší vrstvou, Voyager 2) – Saturn, Uran a Neptun jsou odhad */
  const DK = {
      jupiter: { p: 0.13, H: [12000, 40000], k: 1 },
      saturn: { p: 0.05, H: [8000, 22000], k: 0.6 },
      uranus: { p: 0.03, H: [3000, 8000], k: 0.4 },
      neptune: { p: 0.08, H: [4000, 12000], k: 0.4 },
    },
    dk = deck ? DK[o.id] || DK.jupiter : null,
    CELL = 70000;
  /* věž = několik kup (laloků) různé velikosti, jako květák kupovité oblačnosti; obrys a vršky zvlněné šumem */
  const tower = (x, y) => {
    const cx = Math.floor(x / CELL),
      cy = Math.floor(y / CELL);
    let h = 0;
    for (let j = -1; j <= 1; j++)
      for (let i = -1; i <= 1; i++) {
        const gx = cx + i,
          gy = cy + j;
        if (hash2(gx, gy, seed + 41) > dk.p) continue;
        const px = (gx + 0.2 + 0.6 * hash2(gx, gy, seed + 42)) * CELL,
          py = (gy + 0.2 + 0.6 * hash2(gx, gy, seed + 43)) * CELL;
        /* ne nad pozorovatelem ani těsně u něj (zakryla by výhled) */
        if (Math.hypot(px, py) < 34000) continue;
        const H = dk.H[0] + (dk.H[1] - dk.H[0]) * hash2(gx, gy, seed + 44),
          rr = 0.55 * H * (0.8 + 0.5 * hash2(gx, gy, seed + 45));
        if (Math.abs(x - px) > 1.6 * rr || Math.abs(y - py) > 1.6 * rr) continue;
        const wob = 1 + 0.18 * fbm(x / 5000, y / 5000, seed + 46, 3);
        for (let l = 0; l < 5; l++) {
          const a = hash2(gx * 7 + l, gy, seed + 50) * TAU,
            o = l ? rr * (0.25 + 0.4 * hash2(gx, gy * 7 + l, seed + 51)) : 0,
            r = rr * (l ? 0.38 + 0.3 * hash2(gx + l, gy, seed + 52) : 0.62),
            hl = H * (l ? 0.45 + 0.4 * hash2(gx, gy + l, seed + 53) : 1),
            d = Math.hypot(x - px - o * Math.cos(a), y - py - o * Math.sin(a)) / (r * wob);
          if (d < 1) h = Math.max(h, hl * Math.pow(1 - d * d, 0.42));
        }
      }
    /* „květák“ na povrchu věže */
    return h > 0 ? h * (0.84 + 0.16 * Math.abs(fbm(x / 3200, y / 3200, seed + 47, 3))) : 0;
  };
  /* reliéf (m) v bodě (x východ, y sever); minD = nejmenší kráter, který má smysl při hustotě mřížky */
  const ej = [0];
  const relief = (x, y, minD, la, lo) => {
    if (deck) {
      /* oblačná vrstva obra (2.2b): mírné zvlnění (stovky metrů na desítky km, sklon do ~8°) a „kupky“ navrchu; dřív kupy 1–3 km
         na 6 km se sklonem přes 60° (vypadalo jako sněhové kopce). Juno: mezi pásy hladká vrstva, v ní ojedinělé konvektivní věže
         asi 50 km široké a 50 km vysoké, které vrhají stín na oblaka pod sebou (PIA21647) – ty jsou tady zvlášť (věž). */
      const b = fbm(x / 30000, y / 30000, seed, 3),
        c = fbm(x / 7000, y / 7000, seed + 7, 4);
      return (
        dk.k *
          (600 * b +
            150 * c +
            110 * Math.abs(fbm(x / 2500, y / 2500, seed + 9, 4)) +
            22 * fbm(x / 160, y / 160, seed + 10, 3)) +
        tower(x, y)
      );
    }
    let h = 0;
    if (dem && la !== undefined) h += dem.at(la, lo);
    else if (T.far)
      h += T.far * (0.65 * ridged(x / 26000, y / 26000, seed, 5) + 0.35 * fbm(x / 9000, y / 9000, seed + 3, 4));
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
  const h0 = relief(0, 0, 0.5, lat0, lon0);
  let water0 = 0;
  const KIND = { more: 1, les: 2, poust: 3, led: 4 };
  /* 2.3 (chůze): mřížka může mít střed jinde než místo přistání (cx, cy = metry na východ a sever); výšky, barvy i zakřivení
     se počítají v soustavě místa přistání, takže nová mřížka kolem chodce navazuje na starou */
  const cx = o.cx || 0,
    cy = o.cy || 0;
  const setV = (v, x, y, rl) => {
    const minD = Math.max(1.2, rl * 0.09),
      r = Math.hypot(x, y);
    toLL(r, Math.atan2(x, y), ll);
    let h = relief(x, y, minD, ll[0], ll[1]);
    const drop = Rm - Math.sqrt(Math.max(0, Rm * Rm - r * r)); /* zakřivení: přesně koule */
    sample(ll[0], ll[1], sm);
    let c0 = lin(sm[0]) * alb,
      c1 = lin(sm[1]) * alb,
      c2 = lin(sm[2]) * alb;
    if (!sm[3]) {
      c0 = sm[0];
      c1 = sm[1];
      c2 = sm[2];
    }
    {
      /* albedo nad 0,9 neexistuje (mapy světlých těles přepočtené na albedo z katalogu by ho jinde překročily) */
      const mx = Math.max(c0, c1, c2);
      if (mx > 0.9) {
        c0 *= 0.9 / mx;
        c1 *= 0.9 / mx;
        c2 *= 0.9 / mx;
      }
    }
    if (o.ground) {
      /* půda, kterou mapa neukazuje (Venuše a Titan pod oblaky): barva z barevných snímků sond */
      const v = 0.85 + 0.3 * fbm(x / 3000, y / 3000, seed + 31, 3);
      c0 = o.ground[0] * v;
      c1 = o.ground[1] * v;
      c2 = o.ground[2] * v;
    }
    if (T.sat !== undefined) {
      const l = 0.2126 * c0 + 0.7152 * c1 + 0.0722 * c2;
      c0 = l + (c0 - l) * T.sat;
      c1 = l + (c1 - l) * T.sat;
      c2 = l + (c2 - l) * T.sat;
    }
    if (deck) {
      /* oblačná pokrývka: vršky kup světlé, mezery tmavší (Jupiter a Saturn do hněda – hlubší oblaka) */
      const t = Math.max(0, Math.min(1, (h - h0) / 3200 + 0.55)),
        kk = 0.5 + 0.62 * t,
        br = o.id === 'jupiter' || o.id === 'saturn' ? 1 : 0;
      c0 *= kk;
      c1 *= kk * (1 - br * 0.14 * (1 - t));
      c2 *= kk * (1 - br * 0.28 * (1 - t));
      /* věže: jasně bílé vršky (led amoniaku a vody) */
      const wt = 0.85 * Math.max(0, Math.min(1, (h - h0 - 1500) / 8000));
      c0 += (0.78 - c0) * wt;
      c1 += (0.78 - c1) * wt;
      c2 += (0.76 - c2) * wt;
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
        /* louka: mapa ukazuje směs lesů a polí, zblízka je pod nohama tráva */
        const g = 0.55 + 0.25 * fbm(x / 400, y / 400, seed + 41, 3);
        c0 = c0 * (1 - g) + 0.045 * g;
        c1 = c1 * (1 - g) + 0.085 * g;
        c2 = c2 * (1 - g) + 0.02 * g;
      } else if (bk === 'led') {
        c0 = c1 = 0.75;
        c2 = 0.8;
      }
    }
    pos[v * 3] = x - cx;
    pos[v * 3 + 1] = h - h0 - drop;
    pos[v * 3 + 2] = -(y - cy);
    col[v * 3] = c0 * k;
    col[v * 3 + 1] = c1 * k;
    col[v * 3 + 2] = c2 * k;
  };
  if (earth) {
    /* Země: pozorovatel stojí na pevnině několik metrů až desítek metrů nad mořem (kopce z reliéfu) */
    water0 = Math.max(4, h0 - (T.far || 0) * 0.15 + 12);
  }
  setV(0, cx, cy, 0);
  for (let k = 0; k < NR; k++) {
    for (let a = 0; a < NA; a++) {
      const th = ((a + (k & 1) * 0.5) / NA) * TAU,
        r = rr[k];
      setV(1 + k * NA + a, cx + r * Math.sin(th), cy + r * Math.cos(th), r);
    }
    if (o.slice) yield 0;
  }
  const ix = gridIndex(NA, NR);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(new THREE.BufferAttribute(ix, 1));
  /* normály po kouscích (stejně jako three computeVertexNormals: součet normál trojúhelníků ve vrcholu) */
  const nrA = new Float32Array(nV * 3);
  for (let t = 0; t < ix.length; t += 3) {
    const a = ix[t] * 3,
      b = ix[t + 1] * 3,
      c = ix[t + 2] * 3,
      cbx = pos[c] - pos[b],
      cby = pos[c + 1] - pos[b + 1],
      cbz = pos[c + 2] - pos[b + 2],
      abx = pos[a] - pos[b],
      aby = pos[a + 1] - pos[b + 1],
      abz = pos[a + 2] - pos[b + 2],
      nx = cby * abz - cbz * aby,
      ny = cbz * abx - cbx * abz,
      nz = cbx * aby - cby * abx;
    nrA[a] += nx;
    nrA[a + 1] += ny;
    nrA[a + 2] += nz;
    nrA[b] += nx;
    nrA[b + 1] += ny;
    nrA[b + 2] += nz;
    nrA[c] += nx;
    nrA[c + 1] += ny;
    nrA[c + 2] += nz;
    if (o.slice && t % 24000 === 0 && t) yield 0;
  }
  for (let v = 0; v < nV * 3; v += 3) {
    const l = Math.hypot(nrA[v], nrA[v + 1], nrA[v + 2]) || 1;
    nrA[v] /= l;
    nrA[v + 1] /= l;
    nrA[v + 2] /= l;
  }
  geo.setAttribute('normal', new THREE.BufferAttribute(nrA, 3));
  geo.computeBoundingSphere();
  if (!deck && !earth) {
    /* 2.3: strmé svahy tmavší (holá skála, méně prachu) – hloubka krajiny je pak vidět i při rovnoměrném světle
       (stěna kaldery Olympu, svahy kráterů) */
    const nrm = geo.attributes.normal.array,
      col = geo.attributes.color.array;
    for (let v = 0; v < nV; v++) {
      const sl = 1 - nrm[v * 3 + 1],
        t = Math.max(0, Math.min(1, (sl - 0.04) / 0.22)),
        k = 1 - 0.32 * t * t * (3 - 2 * t);
      col[v * 3] *= k;
      col[v * 3 + 1] *= k * 0.97;
      col[v * 3 + 2] *= k * 0.95;
    }
    geo.attributes.color.needsUpdate = true;
  }
  /* stín terénu: vidí vrchol Slunce? (pochod paprskem k Slunci nad mřížkou; 1 = ano, 0 = ve stínu kopce nebo hrany kráteru) */
  const visA = new Float32Array(nV).fill(1);
  geo.setAttribute('vis', new THREE.BufferAttribute(visA, 1));
  const lq = Math.log(q);
  const gridY = (x, z) => {
    const r = Math.hypot(x, z);
    if (r <= rMin) return pos[1];
    if (r >= rMax) return -1e9;
    const kf = Math.log(r / rMin) / lq,
      k0 = Math.min(NR - 2, Math.floor(kf)),
      t = kf - k0,
      th = (Math.atan2(x, -z) + TAU) % TAU;
    const ring = (k) => {
      const af = (th / TAU) * NA - (k & 1) * 0.5,
        a0 = Math.floor(af),
        ta = af - a0,
        i0 = 1 + k * NA + (((a0 % NA) + NA) % NA),
        i1 = 1 + k * NA + ((((a0 + 1) % NA) + NA) % NA);
      return pos[i0 * 3 + 1] * (1 - ta) + pos[i1 * 3 + 1] * ta;
    };
    return ring(k0) * (1 - t) + ring(k0 + 1) * t;
  };
  /* viditelnost Slunce v bodě (x, z) podle nejbližšího vrcholu mřížky – pro kameny */
  const visAt = (x, z) => {
    const r = Math.hypot(x, z);
    if (r <= rMin) return visA[0];
    if (r >= rMax) return 1;
    const k = Math.min(NR - 1, Math.max(0, Math.round(Math.log(r / rMin) / lq))),
      th = (Math.atan2(x, -z) + TAU) % TAU,
      a = Math.round((th / TAU) * NA - (k & 1) * 0.5);
    return visA[1 + k * NA + (((a % NA) + NA) % NA)];
  };
  /* s = směr ke Slunci v soustavě krajiny (x východ, y nahoru, z jih), jednotkový */
  /* po kouscích (slice): vrací řízení po každých 1 500 vrcholech */
  const computeVisGen = function* (s, slice) {
    const sh = Math.hypot(s[0], s[2]);
    if (s[1] <= -0.05 || sh < 1e-6) {
      visA.fill(s[1] > 0 ? 1 : 0);
      geo.attributes.vis.needsUpdate = true;
      return;
    }
    const ux = s[0] / sh,
      uz = s[2] / sh,
      te = s[1] / sh;
    for (let v = 0; v < nV; v++) {
      const px = pos[v * 3],
        py = pos[v * 3 + 1] + 0.3,
        pz = pos[v * 3 + 2];
      let m = 1;
      for (let t = 2; t < 70000; t *= 1.36) {
        const x = px + ux * t,
          z = pz + uz * t,
          gy = gridY(x, z);
        if (gy < -1e8) break;
        const c = (py + te * t - gy) / t;
        if (c < m) m = c;
        if (m < -0.004) break;
      }
      /* měkký okraj stínu (polostín přes ~1°) */
      const u = Math.max(0, Math.min(1, (m + 0.004) / 0.02));
      visA[v] = u * u * (3 - 2 * u);
      if (slice && v % 400 === 399) yield 0;
    }
    geo.attributes.vis.needsUpdate = true;
  };
  const computeVis = (s) => {
    for (const _ of computeVisGen(s, false));
  };
  const group = new THREE.Group();
  /* výška terénu pod bodem (x, z) ve stejné soustavě jako mřížka – pro kameny a stromy */
  const yAt = (x, z) => {
    const y = -z,
      r = Math.hypot(x, y),
      drop = Rm - Math.sqrt(Math.max(0, Rm * Rm - r * r));
    toLL(r, Math.atan2(x, y), ll);
    return relief(x, y, Math.max(1.2, r * 0.09), ll[0], ll[1]) - h0 - drop;
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
  /* 2.3: profil obzoru z bodu (px, pz) ve výšce oka eye: pro každý stupeň azimutu (od severu k východu) největší výška
     terénu nad vodorovnou rovinou v radiánech – hvězdy, jména a značky pod ním jsou za terénem a nekreslí se */
  const horizon = (px, pz, eye, out = new Float32Array(360), a0 = 0, a1 = 360) => {
    const y0 = gridY(px, pz) + eye;
    for (let a = a0; a < a1; a++) {
      const th = ((a + 0.5) * Math.PI) / 180,
        sx = Math.sin(th),
        sz = -Math.cos(th);
      let m = -Math.PI / 2;
      for (let t = 1.5; t < rMax; t *= 1.15) {
        const y = gridY(px + sx * t, pz + sz * t);
        if (y < -1e8) break;
        const e = Math.atan2(y - y0, t);
        if (e > m) m = e;
      }
      out[a] = m;
    }
    return out;
  };
  return {
    geo,
    group,
    yAt,
    gridY,
    kindAt,
    h0,
    rMax,
    deck,
    water0,
    computeVis,
    computeVisGen,
    visAt,
    horizon,
    cx,
    cy,
    info: { NA, NR, rMax },
  };
}
/* ---------- kameny, oblázky, stromy ---------- */
function rockGeo(seed, kind) {
  /* sloučit vrcholy, jinak má každá stěna vlastní normálu a kámen je hranatý jako krystal */
  const g = mergeVertices(
      new THREE.IcosahedronGeometry(1, kind === 'oblazek' ? 2 : 1).deleteAttribute('normal').deleteAttribute('uv')
    ),
    p = g.attributes.position;
  for (let k = 0; k < p.count; k++) {
    let x = p.getX(k),
      y = p.getY(k),
      z = p.getZ(k);
    const n =
      gnoise(x * 1.3 + seed, y * 1.3 + z * 0.7, seed) * 0.5 +
      gnoise(x * 2.9 + z, z * 2.9 + seed, seed + 3) * 0.25 +
      gnoise(y * 6.1 + x, z * 6.1, seed + 5) * 0.08;
    let s = kind === 'oblazek' ? 1 + 0.08 * n : 1 + 0.45 * n;
    /* hranatost: rovné odštěpené plochy */
    if (kind !== 'oblazek') {
      const a = hash2(Math.round(x * 3), Math.round(z * 3), seed);
      if (a > 0.6) s *= 0.85;
    }
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
      {
        n: Math.round((o.lite ? 350 : 700) * T.kam),
        r0: 4,
        r1: 260,
        s0: 0.06 * T.kamMax,
        s1: T.kamMax,
        shadow: true,
        p: 4,
      },
      {
        n: Math.round((o.lite ? 1000 : 2400) * Math.min(1.5, T.kam)),
        r0: 0.7,
        r1: 25,
        s0: 0.012,
        s1: 0.1 * T.kamMax + 0.03,
        shadow: true,
        p: 2.6,
      },
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
      im = new THREE.InstancedMesh(g, mat, st.n),
      xz = new Float32Array(st.n * 2),
      rt = new Float32Array(st.n * 2);
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
      const s = st.s0 * Math.pow(st.s1 / st.s0, Math.pow(hash2(k, si, seed + 58), st.p)),
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
      xz[n * 2] = x;
      xz[n * 2 + 1] = z;
      /* 2.3: poloměr a vršek kamene pro kolize chodce */
      rt[n * 2] = s * Math.max(ax, az) * 0.85;
      rt[n * 2 + 1] = y + s * 0.12 + s * 0.62;
      n++;
    }
    im.count = n;
    /* poloha a barva kamenů pro stín terénu (kámen ve stínu kopce nebo kráteru nesvítí) */
    im.userData.base = im.instanceColor ? im.instanceColor.array.slice(0, n * 3) : null;
    im.userData.xz = xz.slice(0, n * 2);
    im.userData.rt = rt.slice(0, n * 2);
    im.castShadow = st.shadow;
    im.receiveShadow = true;
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    meshes.push(im);
    si++;
  }
  return meshes;
}
/* 2.3 (chůze): kameny v okolí chodce – buňky 3 × 3 m ukotvené v soustavě místa (stejná buňka = stejný kámen, i po přestavbě),
   do 40 m od chodce; na okraji se kámen zmenší do ztracena (nic neproblikne); u místa přistání řidší, tam jsou kameny
   z buildRocks. Vrací pole poloh a vlastností pro InstancedMesh (plní ho krajina). */
export const NEAR_R = 40;
export function nearRocks(o, ter, wx, wz, out) {
  const T = o.T,
    seed = o.seed + 901,
    C = 3,
    dens = Math.min(1.6, T.kam || 0) * 0.55,
    s1 = 0.35 * (T.kamMax || 0.5) + 0.04,
    s0 = 0.015;
  let n = 0;
  if (!T.kam || ter.deck) return 0;
  const i0 = Math.floor((wx - NEAR_R) / C),
    i1 = Math.floor((wx + NEAR_R) / C),
    j0 = Math.floor((wz - NEAR_R) / C),
    j1 = Math.floor((wz + NEAR_R) / C);
  for (let i = i0; i <= i1; i++)
    for (let j = j0; j <= j1; j++)
      for (let m = 0; m < 2; m++) {
        if (n >= out.cap) return n;
        const hx = hash2(i * 2 + m, j, seed),
          hz = hash2(i * 2 + m, j, seed + 1),
          x = (i + hx) * C,
          z = (j + hz) * C,
          d = Math.hypot(x - wx, z - wz);
        if (d > NEAR_R) continue;
        const dl = Math.hypot(x, z),
          pl = dens * (0.25 + 0.75 * Math.min(1, Math.max(0, (dl - 25) / 35)));
        if (hash2(i * 2 + m, j, seed + 2) > pl) continue;
        if (fbm(x / 40, z / 40, o.seed + 57, 2) < -0.25 + 0.2 * hash2(i, j, seed + 3)) continue;
        if (ter.kindAt(x - ter.cx, z + ter.cy) === 1) continue;
        const fade = Math.min(1, (NEAR_R - d) / 10),
          s = s0 * Math.pow(s1 / s0, Math.pow(hash2(i * 2 + m, j, seed + 4), 2.4)) * fade,
          y = ter.yAt(x, z),
          ax = 0.7 + 0.6 * hash2(i, j * 2 + m, seed + 5),
          az = 0.7 + 0.6 * hash2(i, j * 2 + m, seed + 6),
          k = n * 8;
        out.d[k] = x;
        out.d[k + 1] = y + s * 0.12;
        out.d[k + 2] = z;
        out.d[k + 3] = s;
        out.d[k + 4] = ax;
        out.d[k + 5] = az;
        out.d[k + 6] = hash2(i, j, seed + 7) * TAU;
        out.d[k + 7] = 0.7 + 0.6 * hash2(i, j, seed + 8);
        n++;
      }
  return n;
}
export { rockGeo };
/* stromy: jen na Zemi a jen tam, kde mapa ukazuje les nebo trávu (nikdy na jiném tělese) */
export function buildTrees(o, ter) {
  if (o.id !== 'earth') return [];
  const seed = o.seed,
    cone = mergeVertices(new THREE.ConeGeometry(1, 1, 9, 3).deleteAttribute('normal').deleteAttribute('uv')),
    ball = mergeVertices(new THREE.IcosahedronGeometry(1, 1).deleteAttribute('normal').deleteAttribute('uv'));
  /* koruny nepravidelné: zvlněný povrch, smrk s patry větví */
  for (const [g, k] of [
    [cone, 0.12],
    [ball, 0.22],
  ]) {
    const p = g.attributes.position;
    for (let j = 0; j < p.count; j++) {
      const x = p.getX(j),
        y = p.getY(j),
        z = p.getZ(j),
        n = 1 + k * gnoise(x * 2.3 + y, z * 2.3, 91) + (g === cone ? 0.1 * Math.sin(y * 18) : 0);
      p.setXYZ(j, x * n, y, z * n);
    }
    g.computeVertexNormals();
  }
  cone.translate(0, 0.5, 0);
  ball.translate(0, 0.5, 0);
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff }),
    NJ = o.lite ? 1800 : 5000,
    NL = o.lite ? 1000 : 3000,
    jeh = new THREE.InstancedMesh(cone, mat, NJ),
    lis = new THREE.InstancedMesh(ball, mat, NL),
    m4 = new THREE.Matrix4(),
    qt = new THREE.Quaternion(),
    sc = new THREE.Vector3(),
    ps = new THREE.Vector3(),
    cc = new THREE.Color();
  let nj = 0,
    nl = 0;
  for (let k = 0; k < 40000 && (nj < NJ || nl < NL); k++) {
    const u = hash2(k, 1, seed + 77),
      r = 70 * Math.pow(5000 / 70, u),
      th = hash2(k, 2, seed + 77) * TAU,
      x = r * Math.sin(th),
      z = -r * Math.cos(th);
    if (ter.kindAt(x, z) !== 2) continue;
    /* lesy v ostrůvcích, louky mezi nimi */
    const f = fbm(x / 900, z / 900, seed + 78, 4);
    if (f < 0.12) continue;
    const y = ter.yAt(x, z),
      hgt = 9 + 16 * hash2(k, 3, seed + 77),
      con = hash2(k, 4, seed + 77) < 0.55;
    qt.identity();
    if (con && nj < NJ) {
      sc.set(hgt * 0.22, hgt, hgt * 0.22);
      ps.set(x, y - 0.5, z);
      m4.compose(ps, qt, sc);
      jeh.setMatrixAt(nj, m4);
      const v = 0.75 + 0.5 * hash2(k, 5, seed);
      cc.setRGB(0.012 * v, 0.028 * v, 0.012 * v);
      jeh.setColorAt(nj++, cc);
    } else if (!con && nl < NL) {
      sc.set(hgt * 0.33, hgt * 0.8, hgt * 0.33);
      ps.set(x, y + hgt * 0.15, z);
      m4.compose(ps, qt, sc);
      lis.setMatrixAt(nl, m4);
      const v = 0.75 + 0.5 * hash2(k, 6, seed);
      cc.setRGB(0.022 * v, 0.045 * v, 0.016 * v);
      lis.setColorAt(nl++, cc);
    }
  }
  jeh.count = nj;
  lis.count = nl;
  for (const m of [jeh, lis]) {
    /* stromy začínají 70 m od pozorovatele, stín do mapy stínů by stál tisíce kreslení navíc */
    m.castShadow = false;
    m.receiveShadow = true;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }
  return [jeh, lis].filter((m) => m.count > 0);
}
