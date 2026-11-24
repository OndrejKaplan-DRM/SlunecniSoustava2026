// Rozptyl světla v atmosféře (verze 2.2): jednonásobný Rayleighův a Mieův rozptyl s pohlcováním (ozon, metan, prach) a se stínem
// planety (soumrak, stín Země nad obzorem). Stejný výpočet běží v shaderu oblohy (render/krajina.js, SKY_FS) – tady v JS pro
// osvětlení krajiny (barva Slunce u země, světlo oblohy, mlha), expozici a pro zkoušky. Souřadnice: místní soustava
// pozorovatele [východ, sever, nahoru], vzdálenosti v km, koeficienty v km⁻¹. Jas oblohy je v násobcích ozáření Sluncem
// nad atmosférou (radiance na jednotku ozáření, sr⁻¹).
// Zdroje vzorců: Rayleighova fázová funkce, Cornette–Shanks pro Mieův rozptyl; model a hodnoty pro Zemi podle Bruneton & Neyret
// (2008) „Precomputed Atmospheric Scattering“. Mnohonásobný rozptyl je přidaný jen přibližně (rovnoměrná „okolní“ záře).
export const NS = 20 /* kroků po paprsku pohledu */,
  NL = 6; /* kroků ke Slunci */
const PI = Math.PI;
export function phaseR(mu) {
  return (3 / (16 * PI)) * (1 + mu * mu);
}
export function phaseM(mu, g) {
  const g2 = g * g;
  return ((3 / (8 * PI)) * ((1 - g2) * (1 + mu * mu))) / ((2 + g2) * Math.pow(1 + g2 - 2 * g * mu, 1.5));
}
/* průsečík paprsku z bodu o (vůči středu tělesa) ve směru d s koulí poloměru r: [t1, t2] nebo null */
function sphere(ox, oy, oz, dx, dy, dz, r) {
  const b = ox * dx + oy * dy + oz * dz,
    c = ox * ox + oy * oy + oz * oz - r * r,
    D = b * b - c;
  if (D < 0) return null;
  const s = Math.sqrt(D);
  return [-b - s, -b + s];
}
/* hustoty v výšce h (km): [plyn, prach/opar, ozon] */
function dens(a, h, o) {
  o[0] = Math.exp(-h / a.hR);
  o[1] = Math.exp(-h / a.hM);
  o[2] = a.oz ? Math.max(0, 1 - Math.abs(h - 25) / 15) : 0;
  return o;
}
/* koeficient zeslabení (km⁻¹) pro barvu k při hustotách d */
function ext(a, d, k) {
  return a.bR[k] * d[0] + (a.bM[k] + a.aM[k]) * d[1] + (a.oz ? a.oz[k] * d[2] : 0) + (a.ab ? a.ab[k] * d[0] : 0);
}
const dd = [0, 0, 0];
/* propustnost z bodu p (km od středu) ke Slunci ve směru s; 0 ve stínu tělesa */
function sunTrans(a, R, px, py, pz, sx, sy, sz, out) {
  const g = sphere(px, py, pz, sx, sy, sz, R * 0.99999);
  if (g && g[1] > 0) {
    out[0] = out[1] = out[2] = 0;
    return out;
  }
  const t = sphere(px, py, pz, sx, sy, sz, R + a.top),
    L = t ? Math.max(0, t[1]) : 0,
    dt = L / NL;
  let o0 = 0,
    o1 = 0,
    o2 = 0;
  for (let j = 0; j < NL; j++) {
    const u = (j + 0.5) * dt,
      x = px + sx * u,
      y = py + sy * u,
      z = pz + sz * u,
      h = Math.max(0, Math.hypot(x, y, z) - R);
    dens(a, h, dd);
    o0 += ext(a, dd, 0) * dt;
    o1 += ext(a, dd, 1) * dt;
    o2 += ext(a, dd, 2) * dt;
  }
  out[0] = Math.exp(-o0);
  out[1] = Math.exp(-o1);
  out[2] = Math.exp(-o2);
  return out;
}
/**
 * Obloha ve směru d (místní soustava, jednotkový vektor) při Slunci ve směru s: { L: jas [r,g,b], T: propustnost [r,g,b] }.
 * Pozorovatel je ve výšce h0 (km) nad koulí poloměru R. Směr pod obzorem se počítá jako vodorovný (barva mlhy u obzoru).
 */
export function skyDir(a, R, h0, d, s, out = { L: [0, 0, 0], T: [0, 0, 0] }) {
  let dx = d[0],
    dy = d[1],
    dz = d[2];
  if (dz < 0.0005) {
    const k = Math.hypot(dx, dy) || 1;
    dx /= k;
    dy /= k;
    dz = 0.0005;
    const n = Math.hypot(dx, dy, dz);
    dx /= n;
    dy /= n;
    dz /= n;
  }
  const oz = R + h0,
    t = sphere(0, 0, oz, dx, dy, dz, R + a.top),
    tm = t ? Math.max(0, t[1]) : 0,
    mu = dx * s[0] + dy * s[1] + dz * s[2],
    pR = phaseR(mu),
    pM = [phaseM(mu, a.g[0]), phaseM(mu, a.g[1]), phaseM(mu, a.g[2])],
    st = [0, 0, 0],
    L = out.L,
    T = out.T;
  let o0 = 0,
    o1 = 0,
    o2 = 0,
    l0 = 0,
    l1 = 0,
    l2 = 0;
  for (let i = 0; i < NS; i++) {
    const u0 = tm * (i / NS) ** 2,
      u1 = tm * ((i + 1) / NS) ** 2,
      u = 0.5 * (u0 + u1),
      du = u1 - u0,
      x = dx * u,
      y = dy * u,
      z = oz + dz * u,
      h = Math.max(0, Math.hypot(x, y, z) - R);
    dens(a, h, dd);
    const e0 = ext(a, dd, 0),
      e1 = ext(a, dd, 1),
      e2 = ext(a, dd, 2),
      d0 = dd[0],
      d1 = dd[1];
    /* propustnost k polovině kroku */
    const m0 = Math.exp(-(o0 + e0 * du * 0.5)),
      m1 = Math.exp(-(o1 + e1 * du * 0.5)),
      m2 = Math.exp(-(o2 + e2 * du * 0.5));
    sunTrans(a, R, x, y, z, s[0], s[1], s[2], st);
    l0 += m0 * st[0] * (a.bR[0] * d0 * pR + a.bM[0] * d1 * pM[0]) * du;
    l1 += m1 * st[1] * (a.bR[1] * d0 * pR + a.bM[1] * d1 * pM[1]) * du;
    l2 += m2 * st[2] * (a.bR[2] * d0 * pR + a.bM[2] * d1 * pM[2]) * du;
    o0 += e0 * du;
    o1 += e1 * du;
    o2 += e2 * du;
  }
  L[0] = l0;
  L[1] = l1;
  L[2] = l2;
  T[0] = Math.exp(-o0);
  T[1] = Math.exp(-o1);
  T[2] = Math.exp(-o2);
  return out;
}
/* propustnost atmosféry pro sluneční světlo u pozorovatele (barva a síla Slunce u země) */
export function sunAt(a, R, h0, s, out = [0, 0, 0]) {
  return sunTrans(a, R, 0, 0, R + h0, s[0], s[1], s[2], out);
}
/* ozáření vodorovné plochy světlem oblohy (v násobcích ozáření Sluncem nad atmosférou) a jas oblohy v nadhlavníku */
export function hemi(a, R, h0, s) {
  const E = [0, 0, 0],
    o = { L: [0, 0, 0], T: [0, 0, 0] },
    EL = [6, 20, 40, 65],
    W8 = 8;
  let wsum = 0;
  for (const elD of EL) {
    const el = (elD * PI) / 180,
      ce = Math.cos(el),
      se = Math.sin(el);
    for (let k = 0; k < W8; k++) {
      const az = (k / W8) * 2 * PI;
      skyDir(a, R, h0, [ce * Math.sin(az), ce * Math.cos(az), se], s, o);
      /* váha: cos θ dω, pásy po výšce */
      const w = se * ce;
      E[0] += o.L[0] * w;
      E[1] += o.L[1] * w;
      E[2] += o.L[2] * w;
      wsum += w;
    }
  }
  /* ∫ cos θ dω přes polokouli = π */
  for (let k = 0; k < 3; k++) E[k] = (E[k] / wsum) * PI;
  const z = skyDir(a, R, h0, [0, 0, 1], s, o).L.slice();
  return { E, z };
}
/* zeslabení u země (km⁻¹) – mlha na vzdálené krajině */
export function groundExt(a) {
  return [0, 1, 2].map((k) => a.bR[k] + a.bM[k] + a.aM[k] + (a.ab ? a.ab[k] : 0) + (a.oz ? 0 : 0));
}
/* podíl rozptylu na zeslabení (jednonásobné albedo) u země */
export function ssa(a) {
  return [0, 1, 2].map((k) => {
    const s = a.bR[k] + a.bM[k],
      e = s + a.aM[k] + (a.ab ? a.ab[k] : 0);
    return e > 0 ? s / e : 0;
  });
}
