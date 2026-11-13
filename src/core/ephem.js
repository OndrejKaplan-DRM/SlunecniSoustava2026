// Efemeridy Sluneční soustavy (Planetka 8 – Sluneční soustava). Čistý JS bez three.js: běží v prohlížeči, ve workeru i v Node
// (měřicí lavice bench/ephem_kpi.mjs). Všechny výstupy v ekliptice J2000: heliocentricky v AU, měsíce vůči mateřskému tělesu v km.
//  - planety: střední elementy JPL (Standish) + lineární změny; od iterace 2 opravy z fitu na DE421 (pole CORR);
//  - malá tělesa: (q, e, i, Ω, ω, Tp) – eliptické, parabolické i hyperbolické (ʻOumuamua);
//  - měsíce: elementy v soustavě rovníku mateřské planety (pól IAU), stáčení uzlu a pericentra, trojské měsíce ±60°.
export const RUNTIME_VARIANT = 2; // varianta, kterou používá hra (lavice měří stejnou)
export const J2000 = 2451545.0,
  GK = 0.01720209895,
  DEG = Math.PI / 180,
  TAU = 2 * Math.PI;
const EPS0 = 23.4392911 * DEG,
  CE = Math.cos(EPS0),
  SE = Math.sin(EPS0);

export function kepler(M, e) {
  // eliptická Keplerova rovnice (Newton, start podle Danbyho)
  M = M - TAU * Math.floor(M / TAU);
  let E = M + 0.85 * e * (Math.sin(M) >= 0 ? 1 : -1);
  for (let k = 0; k < 12; k++) {
    const f = E - e * Math.sin(E) - M,
      d = 1 - e * Math.cos(E);
    const dE = f / d;
    E -= dE;
    if (Math.abs(dE) < 1e-13) break;
  }
  return E;
}
function keplerH(M, e) {
  // hyperbolická: e·sinh H − H = M
  let H = Math.asinh(M / e);
  for (let k = 0; k < 40; k++) {
    const f = e * Math.sinh(H) - H - M,
      d = e * Math.cosh(H) - 1;
    const dH = f / d;
    H -= dH;
    if (Math.abs(dH) < 1e-13) break;
  }
  return H;
}
// orbitální rovina → referenční soustava (Ω, i, ω)
function rot(x, y, O, i, w, out) {
  const cO = Math.cos(O),
    sO = Math.sin(O),
    ci = Math.cos(i),
    si = Math.sin(i),
    cw = Math.cos(w),
    sw = Math.sin(w);
  out[0] = (cO * cw - sO * sw * ci) * x + (-cO * sw - sO * cw * ci) * y;
  out[1] = (sO * cw + cO * sw * ci) * x + (-sO * sw + cO * cw * ci) * y;
  out[2] = sw * si * x + cw * si * y;
  return out;
}
// (q, e, i, Ω, ω ve stupních, Tp) → poloha (AU) v čase jd, μ = GK² (Slunce)
export function conicPos(q, e, iD, OD, wD, Tp, jd, out, mu = GK * GK) {
  const t = jd - Tp;
  let x, y;
  if (e < 0.999999) {
    const a = q / (1 - e),
      n = Math.sqrt(mu / (a * a * a)),
      E = kepler(n * t, e);
    x = a * (Math.cos(E) - e);
    y = a * Math.sqrt(1 - e * e) * Math.sin(E);
  } else if (e > 1.000001) {
    const a = q / (e - 1),
      n = Math.sqrt(mu / (a * a * a)),
      H = keplerH(n * t, e);
    x = a * (e - Math.cosh(H));
    y = a * Math.sqrt(e * e - 1) * Math.sinh(H);
  } else {
    // parabola (Barker)
    const W = 3 * Math.sqrt(mu / (2 * q * q * q)) * t,
      Y = Math.cbrt(W + Math.sqrt(W * W + 1)),
      s = Y - 1 / Y;
    x = q * (1 - s * s);
    y = 2 * q * s;
  }
  return rot(x, y, OD * DEG, iD * DEG, wD * DEG, out);
}
// planety: elementy JPL (a, e, I, L, ϖ, Ω) + změna za století
export function jplPos(el, rate, jd, out) {
  const T = (jd - J2000) / 36525;
  const a = el[0] + rate[0] * T,
    e = el[1] + rate[1] * T,
    I = (el[2] + rate[2] * T) * DEG,
    L = (el[3] + rate[3] * T) * DEG,
    wb = (el[4] + rate[4] * T) * DEG,
    O = (el[5] + rate[5] * T) * DEG;
  const E = kepler(L - wb, e);
  return rot(a * (Math.cos(E) - e), a * Math.sqrt(1 - e * e) * Math.sin(E), O, I, wb - O, out);
}
// iterace 2: planety s opravami z fitu na DE421 – elementy + harmonické členy v délce (c 0), šířce (1) a poměrném průvodiči (2)
export function jplCorrPos(C, jd, out) {
  jplPos(C.el, C.rate, jd, out);
  const T = (jd - J2000) / 36525;
  let dl = 0,
    db = 0,
    dr = 0;
  for (const t of C.terms) {
    const a = t[1] + t[2] * T,
      v = t[3] * Math.cos(a) + t[4] * Math.sin(a);
    if (t[0] === 0) dl += v;
    else if (t[0] === 1) db += v;
    else dr += v;
  }
  const r = Math.hypot(out[0], out[1], out[2]),
    lo = Math.atan2(out[1], out[0]) + dl,
    la = Math.asin(out[2] / r) + db,
    rr = r * (1 + dr),
    cl = Math.cos(la);
  out[0] = rr * cl * Math.cos(lo);
  out[1] = rr * cl * Math.sin(lo);
  out[2] = rr * Math.sin(la);
  return out;
}
// verze 1.3: dlouhodobá teorie planet a Pluta (fit na JPL DE422, −1000 až 3000) pro časy mimo okno 1900–2050.
// Model L (orbit.long): el, rate, quad = polynomy elementů; lp = dlouhoperiodické členy (velká nerovnost Jupiter–Saturn apod.):
// [úhlová rychlost rad/stol., pak dvojice (cos, sin) pro střední délku °, velkou poloosu AU, výstřednost a délku perihelu °];
// terms = [souřadnice (0 délka, 1 šířka, 2 poměrný průvodič), j, rušitel, k, m, n, uzel, A, B, A1, B1]:
//   (A + A1·T)·cos(arg) + (B + B1·T)·sin(arg), arg = j·λp + k·λq + m·ϖp + n·ϖq (+ Ωp nebo Ωq).
// Země je v této teorii těžiště Země–Měsíc; výkyv kolem něj dopočítá sim.js z polohy Měsíce.
export const LONG_IDS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
export const WIN0 = 2415030.5,
  WIN1 = 2469800.5,
  WBLEND = 7305; // okno přesného fitu (1900–2050) a šířka plynulého přechodu (20 let) vně okna
// váha dlouhodobé teorie: 0 uvnitř okna, 1 dál než 20 let od něj
export function longWeight(jd) {
  const d = jd < WIN0 ? (WIN0 - jd) / WBLEND : jd > WIN1 ? (jd - WIN1) / WBLEND : 0;
  return d >= 1 ? 1 : d * d * (3 - 2 * d);
}
const _la = {
  jd: NaN,
  lam: new Float64Array(9),
  wb: new Float64Array(9),
  om: new Float64Array(9),
  da: new Float64Array(9),
  de: new Float64Array(9),
};
function longArgs(LG, jd) {
  if (_la.jd === jd && _la.LG === LG) return _la;
  const T = (jd - J2000) / 36525;
  for (let p = 0; p < 9; p++) {
    const L = LG[p];
    let l = L.el[3] + L.rate[3] * T + L.quad[3] * T * T,
      w = L.el[4] + L.rate[4] * T + L.quad[4] * T * T,
      da = 0,
      de = 0;
    for (const t of L.lp) {
      const c = Math.cos(t[0] * T),
        s = Math.sin(t[0] * T);
      l += t[1] * c + t[2] * s;
      da += t[3] * c + t[4] * s;
      de += t[5] * c + t[6] * s;
      w += t[7] * c + t[8] * s;
    }
    _la.lam[p] = l * DEG;
    _la.wb[p] = w * DEG;
    _la.da[p] = da;
    _la.de[p] = de;
    _la.om[p] = (L.el[5] + L.rate[5] * T + L.quad[5] * T * T) * DEG;
  }
  _la.jd = jd;
  _la.LG = LG;
  return _la;
}
export function longPos(LG, p, jd, out) {
  const T = (jd - J2000) / 36525,
    A = longArgs(LG, jd),
    L = LG[p],
    T2 = T * T;
  const a = L.el[0] + L.rate[0] * T + L.quad[0] * T2 + A.da[p],
    e = L.el[1] + L.rate[1] * T + L.quad[1] * T2 + A.de[p],
    I = (L.el[2] + L.rate[2] * T + L.quad[2] * T2) * DEG,
    lam = A.lam[p],
    wb = A.wb[p],
    O = A.om[p];
  const E = kepler(lam - wb, e);
  rot(a * (Math.cos(E) - e), a * Math.sqrt(1 - e * e) * Math.sin(E), O, I, wb - O, out);
  let dl = 0,
    db = 0,
    dr = 0;
  for (const t of L.terms) {
    const q = t[2];
    let g = t[1] * lam + t[4] * wb;
    if (t[3] || t[5]) g += t[3] * A.lam[q] + t[5] * A.wb[q];
    if (t[6]) g += t[6] === 1 ? O : A.om[q];
    const v = (t[7] + t[9] * T) * Math.cos(g) + (t[8] + t[10] * T) * Math.sin(g);
    if (t[0] === 0) dl += v;
    else if (t[0] === 1) db += v;
    else dr += v;
  }
  const r = Math.hypot(out[0], out[1], out[2]),
    lo = Math.atan2(out[1], out[0]) + dl,
    la = Math.asin(out[2] / r) + db,
    rr = r * (1 + dr),
    cl = Math.cos(la);
  out[0] = rr * cl * Math.cos(lo);
  out[1] = rr * cl * Math.sin(lo);
  out[2] = rr * Math.sin(la);
  return out;
}
// ICRF (rovník J2000) ↔ ekliptika J2000
export function eq2ecl(v, out = v) {
  const y = v[1],
    z = v[2];
  out[0] = v[0];
  out[1] = CE * y + SE * z;
  out[2] = -SE * y + CE * z;
  return out;
}
export function ecl2eq(v, out = v) {
  const y = v[1],
    z = v[2];
  out[0] = v[0];
  out[1] = CE * y - SE * z;
  out[2] = SE * y + CE * z;
  return out;
}
// soustava rovníku planety: řádky X (uzel rovníku na ICRF), Y, Z (pól), v ICRF
export function poleFrame(raD, deD) {
  const ra = raD * DEG,
    de = deD * DEG,
    p = [Math.cos(de) * Math.cos(ra), Math.cos(de) * Math.sin(ra), Math.sin(de)];
  let X = [-p[1], p[0], 0];
  const l = Math.hypot(X[0], X[1]) || 1;
  X = [X[0] / l, X[1] / l, 0];
  const Y = [p[1] * X[2] - p[2] * X[1], p[2] * X[0] - p[0] * X[2], p[0] * X[1] - p[1] * X[0]];
  return [X, Y, p];
}
// měsíc: elementy v soustavě rovníku planety → km v ekliptice J2000 vůči planetě
const _s = [0, 0, 0];
export function satPos(o, F, jd, out, corr = null) {
  const t = jd - J2000,
    O = o.O0 + o.Od * t,
    w = o.w0 + o.wd * t,
    e = o.e;
  let L = o.L0 + o.n * t,
    rs = 1,
    be = 0;
  if (corr) {
    // iterace 2–3: kvadratický člen (čas sevřený do okna fitu) a periodické členy podél dráhy (0), kolmo k ní (1), průvodič (2)
    const p = corr.poly,
      tc = corr.win ? Math.min(corr.win[1], Math.max(corr.win[0], t)) : t;
    L += p[0] + p[1] * tc + p[2] * tc * tc;
    for (const c of corr.terms) {
      const v = c[2] * Math.cos(c[1] * t) + c[3] * Math.sin(c[1] * t);
      if (c[0] === 0) L += v;
      else if (c[0] === 1) be += v;
      else rs += v;
    }
  }
  const E = kepler(L - w, e),
    x = o.a * rs * (Math.cos(E) - e),
    y = o.a * rs * Math.sqrt(1 - e * e) * Math.sin(E);
  rot(x, y, O, o.i, w - O, _s);
  if (be) {
    const r = Math.hypot(_s[0], _s[1], _s[2]) * be,
      si = Math.sin(o.i);
    _s[0] += Math.sin(O) * si * r;
    _s[1] -= Math.cos(O) * si * r;
    _s[2] += Math.cos(o.i) * r;
  }
  if (o.flip) {
    _s[1] = -_s[1];
    _s[2] = -_s[2];
  }
  out[0] = F[0][0] * _s[0] + F[1][0] * _s[1] + F[2][0] * _s[2];
  out[1] = F[0][1] * _s[0] + F[1][1] * _s[1] + F[2][1] * _s[2];
  out[2] = F[0][2] * _s[0] + F[1][2] * _s[1] + F[2][2] * _s[2];
  return eq2ecl(out);
}

// Efemeridy celého katalogu. variant: 0 = nástřel (stálé elementy měsíců), 1 = střední elementy se stáčením
export class Ephem {
  constructor(bodies, { variant = 0 } = {}) {
    this.B = bodies;
    this.variant = variant;
    this.idx = new Map(bodies.map((b, i) => [b.id, i]));
    this.F = bodies.map((b) => {
      const p = b.framePole || b.pole || [270, 66.560708];
      return poleFrame(p[0], p[1]);
    }); // bez pólu: ekliptika
    this.sat = bodies.map((b) => {
      const o = b.orbit;
      if (o.kind === 'sat')
        return variant >= 1 && o.mean && !(o.rms_mean_deg > o.rms_const_deg) ? { ...o, ...o.mean } : o; // varianta 1: střední elementy se stáčením, když jsou přesnější
      if (o.kind === 'trojan') {
        const h = bodies[this.idx.get(o.host)].orbit,
          hh = variant >= 1 && h.mean && !(h.rms_mean_deg > h.rms_const_deg) ? { ...h, ...h.mean } : h;
        return { ...hh, L0: hh.L0 + o.dlam };
      }
      return null;
    });
    this.pi = bodies.map((b) => (b.parent ? this.idx.get(b.parent) : -1));
    this.corr = bodies.map((b) => (b.orbit && b.orbit.kind === 'sat' && b.orbit.corr) || null);
    /* dlouhodobá teorie: jen když ji mají všechny planety i Pluto */
    const lg = LONG_IDS.map((id) => (this.idx.has(id) ? bodies[this.idx.get(id)].orbit.long : null));
    this.LG = lg.every(Boolean) ? lg : null;
    this.lgi = bodies.map((b) => LONG_IDS.indexOf(b.id));
    this._lb = [0, 0, 0];
    this._t = [0, 0, 0];
  }
  // poloha vůči mateřskému tělesu: heliocentrická (AU) u těles kolem Slunce, km u měsíců
  local(i, jd, out) {
    const b = this.B[i],
      o = b.orbit;
    if (o.kind === 'jpl') {
      const w = this.variant >= 2 && this.LG && this.lgi[i] >= 0 ? longWeight(jd) : 0;
      if (w >= 1) return longPos(this.LG, this.lgi[i], jd, out);
      this.variant >= 2 && o.corr ? jplCorrPos(o.corr, jd, out) : jplPos(o.el, o.rate, jd, out);
      if (w > 0) {
        /* plynulý přechod mezi přesným fitem v okně a dlouhodobou teorií */
        const l = longPos(this.LG, this.lgi[i], jd, this._lb);
        out[0] += (l[0] - out[0]) * w;
        out[1] += (l[1] - out[1]) * w;
        out[2] += (l[2] - out[2]) * w;
      }
      return out;
    }
    if (o.kind === 'kep') return conicPos(o.q, o.e, o.i, o.O, o.w, o.Tp, jd, out);
    if (o.kind === 'sun' || o.kind === 'game') {
      out[0] = out[1] = out[2] = 0;
      return out;
    }
    const F = this.F[this.pi[i]];
    return satPos(this.sat[i], F, jd, out, this.variant >= 2 ? this.corr[i] : null);
  }
  // heliocentrická poloha v AU (měsíce = planeta + posun)
  helio(i, jd, out) {
    const p = this.pi[i],
      b = this.B[i];
    if (b.orbit.kind === 'game') return this.helio(p, jd, out);
    if (p < 0 || this.B[p].orbit.kind === 'sun') return this.local(i, jd, out);
    this.helio(p, jd, out);
    const t = this.local(i, jd, this._t2 || (this._t2 = [0, 0, 0]));
    const k = 1 / 149597870.7;
    out[0] += t[0] * k;
    out[1] += t[1] * k;
    out[2] += t[2] * k;
    return out;
  }
}
