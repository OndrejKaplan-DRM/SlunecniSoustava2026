// Předvolby pohledu z povrchu (verze 2.2): atmosféra a krajina každého typu tělesa.
// Atmosféra = parametry výpočtu rozptylu světla (jednonásobný rozptyl, Rayleigh + Mie, render/krajina.js) v jednotkách km⁻¹:
//   bR – Rayleighův rozptyl u povrchu (R, G, B), hR – výšková škála, bM / aM – rozptyl a pohlcování prachu či oparu, hM, g – asymetrie
//   rozptylu dopředu (po barvách), oz – pohlcování ozonem (Země), top – výška horní hranice (km), ab – pohlcování plynem (metan).
// Hodnoty: Země podle Bruneton & Neyret 2008 (Rayleigh, Mie, ozon); Mars, Titan a obři odhad z hustoty atmosféry u povrchu
// (tlak, teplota, molekula) a optické tloušťky prachu či oparu – zdroje a výpočet v docs/KRAJINA.md. Jsou to ilustrace postavené
// na fyzice, ne měření jasu oblohy.
// Krajina: typ povrchu a jeho reliéf (m), krátery, kameny, mlha (dohlednost v km), co je za obzorem.

/* Země: Bruneton & Neyret 2008, km⁻¹ */
const ZEME = {
  top: 100,
  bR: [5.802e-3, 13.558e-3, 33.1e-3],
  hR: 8,
  bM: [3.996e-3, 3.996e-3, 3.996e-3],
  aM: [0.444e-3, 0.444e-3, 0.444e-3],
  hM: 1.2,
  g: [0.8, 0.8, 0.8],
  /* ozon: kanál R počítá Bruneton na 680 nm; pro barvu, jak ji vidí oko a fotoaparát (citlivost kolem 600 nm, kde Chappuisův
     pás pohlcuje nejvíc), je pohlcování v červené větší – jinak by soumrak v nadhlavníku vyšel růžový místo modrofialový */
  oz: [1.2e-3, 1.881e-3, 0.085e-3],
  /* gain: jen Rayleigh a čistý vzduch bez mnohonásobného rozptylu dávají oblohu asi 3× tmavší, než je skutečná (Preetham 1999:
     nadhlavník při Slunci 60° vysoko ~8 000 cd/m², náš výpočet ~1 300 cd/m²) – vyrovnání; refr: lom světla (Země = 1) */
  gain: 2.4,
  sat: 1.1,
  refr: 1,
  ms: 0.4,
};

export const ATM = {
  earth: ZEME,
  /* Mars: CO₂ 6,4 hPa při 210 K → hustota 0,86 % pozemské, průřez CO₂ 2,4× vzduchu; prach τ ≈ 0,5, pohlcuje modrou,
     rozptyluje silně dopředu (modrá ještě víc → modrý západ Slunce) */
  mars: {
    top: 80,
    bR: [0.12e-3, 0.28e-3, 0.68e-3],
    hR: 11.1,
    bM: [0.043, 0.036, 0.025],
    aM: [0.002, 0.011, 0.024],
    hM: 11,
    g: [0.62, 0.7, 0.8],
    refr: 0.02,
    /* prach s τ ≈ 0,5 a albedem 0,9 rozptyluje světlo mnohokrát: obloha je jasnější a rovnoměrnější, než dá jednonásobný rozptyl */
    ms: 3,
  },
  /* Titan: N₂ 1,5 baru při 94 K (4,5× hustota vzduchu), výšková škála 20 km; oranžový opar τ ≈ 4 (červená) až 10 (modrá) */
  titan: {
    top: 500,
    bR: [0.026, 0.061, 0.149],
    hR: 20,
    bM: [0.06, 0.05, 0.03],
    aM: [0.007, 0.03, 0.12],
    hM: 60,
    g: [0.6, 0.6, 0.6],
    refr: 4,
  },
  /* obři: pozorovatel nad oblačností u tlaku asi 1 bar; H₂ rozptyluje 0,23× účinněji než vzduch, opar a metan */
  jupiter: {
    top: 300,
    bR: [2.3e-3, 5.3e-3, 12.9e-3],
    hR: 24,
    bM: [0.004, 0.0037, 0.003],
    aM: [0.0006, 0.0015, 0.003],
    hM: 30,
    g: [0.7, 0.7, 0.7],
    refr: 0.7,
    gain: 1.5,
  },
  saturn: {
    top: 400,
    bR: [1.6e-3, 3.7e-3, 9e-3],
    hR: 48,
    bM: [0.005, 0.0047, 0.0038],
    aM: [0.0005, 0.0015, 0.0035],
    hM: 60,
    g: [0.7, 0.7, 0.7],
    refr: 0.6,
    gain: 1.5,
  },
  uranus: {
    top: 300,
    bR: [3.5e-3, 8.2e-3, 20e-3],
    hR: 28,
    bM: [0.002, 0.002, 0.002],
    aM: [0, 0, 0],
    hM: 30,
    g: [0.7, 0.7, 0.7],
    ab: [0.012, 0.0015, 0.0002] /* metan pohlcuje červenou: obloha modrozelená */,
    refr: 0.7,
    gain: 1.5,
  },
  neptune: {
    top: 300,
    bR: [3.5e-3, 8.2e-3, 20e-3],
    hR: 20,
    bM: [0.002, 0.002, 0.002],
    aM: [0, 0, 0],
    hM: 20,
    g: [0.7, 0.7, 0.7],
    ab: [0.02, 0.003, 0.0003],
    refr: 0.7,
    gain: 1.5,
  },
  /* Pluto: N₂ asi 1 Pa, vrstvy modrého oparu (New Horizons) – obloha černá, nad obzorem slabý modrý pás */
  pluto: {
    top: 250,
    bR: [0, 0, 0],
    hR: 20,
    bM: [0.00018, 0.00028, 0.0005],
    aM: [0, 0, 0],
    hM: 45,
    g: [0.65, 0.65, 0.65],
  },
  /* Triton: N₂ asi 1,4 Pa, opar slabší než na Plutu */
  triton: {
    top: 100,
    bR: [0, 0, 0],
    hR: 15,
    bM: [0.00006, 0.0001, 0.00016],
    aM: [0, 0, 0],
    hM: 20,
    g: [0.65, 0.65, 0.65],
  },
};
/* nad oblaky Venuše (asi 70 km, 0,03 baru CO₂) a nad oparem Titanu: řídký plyn a horní opar – odhad */
export const ATM_NAD = {
  venus: {
    top: 40,
    bR: [0.5e-3, 1.2e-3, 2.9e-3],
    hR: 5.5,
    bM: [0.008, 0.008, 0.007],
    aM: [0.0005, 0.001, 0.003],
    hM: 5,
    g: [0.72, 0.72, 0.72],
    gain: 1,
  },
  titan: {
    top: 300,
    bR: [0.0002, 0.0005, 0.0012],
    hR: 40,
    bM: [0.0004, 0.0006, 0.001],
    aM: [0.0001, 0.0002, 0.0005],
    hM: 40,
    g: [0.65, 0.65, 0.65],
  },
};
/* zatažená obloha (Venuše pod mraky): světlo jen rozptýlené, barva podle snímků Veněry 13 a 14, podíl slunečního světla na povrchu */
export const OVERCAST = {
  /* Venuše: na povrch dopadne 2–3 % slunečního světla (Veněra 13, 14; Moroz 1983), barvu dělá CO₂ (pohltí modrou) */
  venus: { col: [1.0, 0.6, 0.27], podil: 0.03, vis: 8, glow: 0.25 },
  /* Titan: na povrch dopadne asi 10 % světla, které na Titan dopadá (Huygens DISR, Tomasko 2005); Slunce je jen světlejší skvrna */
  titan: { col: [1.0, 0.62, 0.3], podil: 0.1, vis: 5, glow: 0.6 },
};
/* obři bez pevného povrchu: pod pozorovatelem oblačné moře */
export const OBRI = new Set(['jupiter', 'saturn', 'uranus', 'neptune']);

/* krajina: typ, reliéf (m) – far: vzdálené kopce, mid: zvlnění, near: drobný; krátery (hustota 0–1), kameny (hustota, max. velikost m),
   tón (násobí barvu mapy), mlha (dohlednost km, 0 = bez vzduchu) */
const T = {
  /* Měsíc: na snímcích z Apolla jsou kameny hlavně drobné, balvany jen ojediněle (u čerstvých kráterů) */
  regolit: { typ: 'regolit', far: 900, mid: 14, near: 0.5, krat: 1, kam: 0.22, kamMax: 0.8, mlha: 0 },
  merkur: { typ: 'regolit', far: 1100, mid: 50, near: 0.7, krat: 1, kam: 0.3, kamMax: 1.1, mlha: 0 },
  /* Mars: barevné mapy jsou kvůli vzhledu přesycené, na snímcích vozítek je půda hnědožlutá (sat) */
  mars: { typ: 'mars', far: 700, mid: 12, near: 0.3, krat: 0.35, kam: 0.8, kamMax: 0.55, mlha: 45, sat: 0.62 },
  zeme: { typ: 'zeme', far: 180, mid: 18, near: 0.15, krat: 0, kam: 0.03, kamMax: 0.6, mlha: 60, stromy: 1 },
  venuse: { typ: 'venuse', far: 300, mid: 8, near: 0.25, krat: 0.05, kam: 0.4, kamMax: 0.5, mlha: 8 },
  titan: { typ: 'titan', far: 150, mid: 12, near: 0.12, krat: 0, kam: 0.7, kamMax: 0.25, mlha: 6 },
  duny: { typ: 'duny', far: 150, mid: 6, near: 0.1, krat: 0, kam: 0.05, kamMax: 0.2, mlha: 6, duny: 1 },
  led: { typ: 'led', far: 500, mid: 20, near: 0.3, krat: 0.5, kam: 0.2, kamMax: 0.8, mlha: 0, hrebeny: 0 },
  europa: { typ: 'led', far: 250, mid: 30, near: 0.4, krat: 0.08, kam: 0.4, kamMax: 1.0, mlha: 0, hrebeny: 1 },
  io: { typ: 'sira', far: 600, mid: 15, near: 0.2, krat: 0.02, kam: 0.3, kamMax: 0.8, mlha: 0, oblak: 1 },
  /* Pluto: dusíkové pláně (Sputnik Planitia) a hory z vodního ledu vysoké až 3–5 km (New Horizons) */
  pluto: { typ: 'led', far: 2200, mid: 25, near: 0.3, krat: 0.15, kam: 0.2, kamMax: 0.9, mlha: 0 },
  maly: { typ: 'regolit', far: 0, mid: 0, near: 0.5, krat: 1, kam: 1.6, kamMax: 3, mlha: 0, maly: 1 },
  kometa: { typ: 'kometa', far: 0, mid: 0, near: 1, krat: 0.3, kam: 1.2, kamMax: 4, mlha: 0, maly: 1 },
  mraky: { typ: 'mraky', mlha: 120 },
};
export const KR = T;
const BY = {
  earth: T.zeme,
  moon: T.regolit,
  mercury: T.merkur,
  mars: T.mars,
  venus: T.venuse,
  titan: T.titan,
  europa: T.europa,
  io: T.io,
  pluto: T.pluto,
  triton: T.led,
  charon: T.led,
  ganymede: T.led,
  callisto: T.led,
  enceladus: T.europa,
  jupiter: T.mraky,
  saturn: T.mraky,
  uranus: T.mraky,
  neptune: T.mraky,
};
/* typ krajiny podle tělesa: pojmenované, jinak podle druhu a velikosti */
export function krajinaOf(b) {
  if (BY[b.id]) return BY[b.id];
  if (b.type === 'comet') return T.kometa;
  if (b.R < 300) return T.maly;
  if ((b.type === 'tno' || b.type === 'dwarf' || b.type === 'moon') && (b.albedo || 0.2) > 0.3) return T.led;
  return T.regolit;
}
/* Titan: v rovníkovém pásu (±30°) písečné duny (Belet, Shangri-La), jinde oblázková pláň jako u Huygensu */
export function krajinaMista(b, lat) {
  const k = krajinaOf(b);
  if (b.id === 'titan' && Math.abs(lat) < 30) return T.duny;
  return k;
}
