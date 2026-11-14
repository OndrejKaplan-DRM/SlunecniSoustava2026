/* Registr funkcí: jedno místo, kde se rozhoduje, komu se která funkce ukáže.
   Stavy:  'vse'     – obě rozhraní
           'dospeli' – jen dospělé rozhraní
           'dev'     – jen ve vývojářském režimu (?dev v adrese nebo přepínač v Tajném menu)
           'vyp'     – nikomu
   Schování funkce = změna jednoho slova tady; kód funkce se nemaže.
   Adresa:  ?dev            zapne vývojářský režim (všechny funkce ve stavu 'dev' + technické výpisy)
            ?dev=a,b        zapne jen vyjmenované funkce
            ?dev=0          vypne a zapomene
   Volba se pamatuje (localStorage 's200dev'), protože v artefaktu se parametr adresy k aplikaci nemusí dostat. */
export const REG = {
  ukazy: ['dospeli', 'Úkazy na obloze (seznam, karty, supernovy)'],
  superkarta: ['dev', 'Superkarta tělesa (pětiklik na název v kartě)'],
  nacitani: ['dev', 'Technický výpis načítání na úvodu'],
  zvuky: ['dev', 'Zkušebna zvuků (dříve jen ?zvuky)'],
};
const KEY = 's200dev';
export function createFlags() {
  let dev = false,
    only = null,
    kid = false;
  const subs = [];
  try {
    const st = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (st) {
      dev = !!st.dev;
      only = st.only || null;
    }
  } catch (e) {
    /* soukromé okno bez úložiště */
  }
  const q = new URLSearchParams(location.search);
  if (q.has('dev')) {
    const v = (q.get('dev') || '').trim();
    if (v === '0' || v === 'ne' || v === 'off') {
      dev = false;
      only = null;
    } else {
      dev = true;
      only = v && v !== '1' ? v.split(',').filter((k) => REG[k]) : null;
      if (only && !only.length) only = null;
    }
  }
  const zv = q.has('zvuky'); /* starý parametr platí dál */
  const store = () => {
    try {
      if (dev) localStorage.setItem(KEY, JSON.stringify({ dev, only }));
      else localStorage.removeItem(KEY);
    } catch (e) {
      /* nic */
    }
  };
  store();
  const F = {
    get dev() {
      return dev;
    },
    on(k) {
      const r = REG[k];
      if (!r) return true;
      if (k === 'zvuky' && zv) return true;
      const s = r[0];
      if (s === 'vyp') return false;
      if (s === 'vse') return true;
      if (s === 'dospeli') return !kid;
      return dev && (!only || only.includes(k));
    },
    setDev(v) {
      dev = !!v;
      only = null;
      store();
      F.apply();
    },
    setKid(k) {
      kid = !!k;
      F.apply();
    },
    onChange(f) {
      subs.push(f);
    },
    /* třídy na <body>: dev, f-<funkce> (zapnuto), no-<funkce> (vypnuto) – podle nich schovává prvky CSS */
    apply() {
      const c = document.body.classList;
      c.toggle('dev', dev);
      for (const k in REG) {
        const o = F.on(k);
        c.toggle('f-' + k, o);
        c.toggle('no-' + k, !o);
      }
      c.toggle('zvuky', F.on('zvuky'));
      for (const f of subs) f(F);
    },
    list: () => Object.keys(REG).map((k) => ({ k, stav: REG[k][0], popis: REG[k][1], on: F.on(k) })),
  };
  return F;
}
