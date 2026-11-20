// Úroveň 2 map těles (verze 1.8m): pyramida dlaždic 1024 px (+1 px okraje). Stupeň z má mapu (8 · 2^z) × (4 · 2^z) dlaždic:
// z = 0 → 8192 px po obvodu, z = 1 → 16 384, z = 2 → 32 768 (Země a Měsíc). Seznam src/data/l2.json = nejjemnější stupeň tělesa,
// soubory dist/maps/l2/<id>/<z>-<řádek>-<sloupec>.webp (řádek 0 = sever). Načítají se jen pro těleso v ohnisku, jen zblízka
// a jen ty, na které se díváš – v každém místě stupeň, jehož texel je zhruba velký jako pixel obrazovky (8k plynule navazuje
// na velkou mapu úrovně 1, 4096 × 2048, a 16k na 8k – žádné rozmazané pásmo mezi nimi). Dlaždice se skládají do jedné
// „atlasové“ textury (12 nebo 24 míst) a malá textura indexu (32 × 28, všechny stupně nad sebou) říká shaderu, která dlaždice
// leží na kterém místě. Shader stupně prolíná od hrubého k jemnému a jen tam, kde se zvětšují (texel ≥ pixel); jinak zůstává
// úroveň 1 se zmenšeninami – žádné třpytivé zrnění. Chybí-li jemná dlaždice, ukáže se hrubší.
import L2_IDS from '../data/l2.json';

const T = 1024,
  SLOT = 1026, // dlaždice s okrajem 1 px na každé straně (bilineární vzorkování nepřeteče do sousedního místa)
  ZN = 3, // stupně 0–2
  IW = 32, // index: šířka nejjemnějšího stupně
  IH = 28; // řádky stupňů 0 (4), 1 (8), 2 (16) nad sebou
const GRID = (z) => [8 << z, 4 << z],
  OFF = (z) => 4 * ((1 << z) - 1), // první řádek stupně v indexu
  /* l2.json: nejjemnější stupeň, nebo [stupeň, n] – u nejjemnějšího stupně chybí n krajních řádků u každého pólu (Měsíc 32k:
     dlaždice nad 78,75° by shader skoro nikdy neukázal – rovnoběžky jsou tam v mapě roztažené víc než 5×) */
  ZMAX = (id) => (Array.isArray(L2_IDS[id]) ? L2_IDS[id][0] : L2_IDS[id]),
  POLE = (id) => (Array.isArray(L2_IDS[id]) ? L2_IDS[id][1] : 0);

export function createL2({ THREE, renderer, AS, wake }) {
  const idxData = new Uint8Array(IW * IH * 4),
    idx = new THREE.DataTexture(idxData, IW, IH, THREE.RGBAFormat, THREE.UnsignedByteType);
  idx.minFilter = idx.magFilter = THREE.NearestFilter;
  idx.generateMipmaps = false;
  idx.needsUpdate = true;
  const U = { tL2: { value: idx }, tL2i: { value: idx }, uL2s: { value: new THREE.Vector2(1, 1) } };
  let rt = null,
    cols = 0,
    nSlots = 0,
    owner = -1,
    gen = 0,
    zmax = 0,
    pole = 0,
    busy = 0,
    lastSel = 0,
    dirty = false;
  const slots = [], // { key, used }
    tiles = new Map(), // key → { slot, a } (načtené) nebo { load: true }
    ready = [], // dekódované dlaždice čekající na nahrání (nejvýš jedna za snímek)
    want = new Map(), // key → priorita (poslední výběr)
    log = [];
  const L2 = {
    U,
    log,
    ids: new Set(Object.keys(L2_IDS)),
    slots: 12 /* nastaví rozhraní podle třídy zařízení: 0 úsporná, 12 běžná, 24 výkonná */,
    has: (id) => L2_IDS[id] !== undefined,
    zmax: ZMAX,
    grid: (id) => GRID(ZMAX(id) | 0) /* mřížka nejjemnějšího stupně */,
    mem: () => (rt ? (rt.width * rt.height * 4) / 1048576 : 0),
    state: () => ({
      owner,
      slots: nSlots,
      loaded: [...tiles.values()].filter((t) => t.slot !== undefined).length,
      lv: [0, 1, 2].map((z) => [...tiles.entries()].filter(([k, t]) => t.slot !== undefined && k[0] === '' + z).length),
      loading: busy,
      want: want.size,
    }),
  };
  function alloc() {
    const n = L2.slots,
      max = renderer.capabilities.maxTextureSize;
    cols = Math.min(4, Math.floor(max / SLOT));
    const rows = Math.max(1, Math.min(Math.ceil(n / cols), Math.floor(max / SLOT)));
    if (cols < 2) return false;
    nSlots = cols * rows;
    rt = new THREE.WebGLRenderTarget(cols * SLOT, rows * SLOT, {
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      colorSpace: THREE.SRGBColorSpace,
    });
    try {
      renderer.initRenderTarget(rt);
    } catch (e) {
      rt.dispose();
      rt = null;
      return false;
    }
    U.tL2.value = rt.texture;
    U.uL2s.value.set(rt.width, rt.height);
    for (let s = 0; s < nSlots; s++) slots[s] = { key: null, used: 0 };
    return true;
  }
  function setIdx(key, slot, a) {
    const [z, ty, tx] = key.split('-').map(Number),
      o = ((OFF(z) + GRID(z)[1] - 1 - ty) * IW + tx) * 4;
    idxData[o] = slot < 0 ? 0 : slot + 1;
    idxData[o + 1] = Math.round(Math.max(0, Math.min(1, a)) * 255);
    dirty = true;
  }
  function reset() {
    gen++;
    idxData.fill(0);
    dirty = true;
    tiles.clear();
    want.clear();
    for (const b of ready) b.bm.close();
    ready.length = 0;
    for (const s of slots) s.key = null;
    owner = -1;
  }
  L2.reset = reset;
  /* uvolnění (ztráta grafického kontextu, vypnutí velkých map): atlas se zahodí a při další potřebě založí znovu */
  L2.drop = () => {
    reset();
    if (rt) rt.dispose();
    rt = null;
    U.tL2.value = idx;
    nSlots = 0;
  };
  const offline = () => typeof window !== 'undefined' && window.S200_ASSETS;
  let miss404 = 0,
    got = 0;
  function request(key, id, g) {
    const url = 'maps/l2/' + id + '/' + key + '.webp';
    if (offline() && !window.S200_ASSETS[url])
      return tiles.set(key, { bad: true }); /* soubor na flashku bez úrovně 2 */
    tiles.set(key, { load: true });
    busy++;
    const t0 = performance.now();
    fetch(AS(url))
      .then((q) => {
        if (!q.ok) {
          if (q.status === 404) miss404++;
          throw new Error('http');
        }
        return q.blob();
      })
      .then((bl) =>
        createImageBitmap(bl, { imageOrientation: 'flipY', premultiplyAlpha: 'none', colorSpaceConversion: 'none' })
      )
      .then((bm) => {
        busy--;
        got++;
        if (g !== gen) return bm.close();
        ready.push({ key, bm, t0 });
        wake();
      })
      .catch(() => {
        busy--;
        if (g === gen) tiles.set(key, { bad: true });
        /* kopie webu bez složky maps/l2 (artefakt): po třech chybějících dlaždicích bez jediné načtené se úroveň 2 vypne
           a dál se na ni nikdo neptá – zůstane velká mapa */
        if (miss404 >= 3 && got === 0) L2.slots = 0;
      });
  }
  function upload(now) {
    const it = ready.shift();
    if (!it) return;
    if (!want.has(it.key)) {
      tiles.delete(it.key);
      return it.bm.close();
    }
    /* volné místo, nebo nejdéle nepotřebné místo s dlaždicí, kterou teď nikdo nechce */
    let s = slots.findIndex((x) => !x.key);
    if (s < 0) {
      let best = -1;
      for (let k = 0; k < nSlots; k++)
        if (!want.has(slots[k].key) && (best < 0 || slots[k].used < slots[best].used)) best = k;
      s = best;
    }
    if (s < 0) {
      tiles.delete(it.key);
      return it.bm.close();
    }
    const old = slots[s].key;
    if (old) {
      setIdx(old, -1, 0);
      tiles.delete(old);
    }
    const src = new THREE.Texture(it.bm);
    src.flipY = false;
    const t1 = performance.now();
    renderer.copyTextureToTexture(
      src,
      rt.texture,
      null,
      new THREE.Vector2((s % cols) * SLOT, Math.floor(s / cols) * SLOT)
    );
    it.bm.close();
    slots[s] = { key: it.key, used: now };
    tiles.set(it.key, { slot: s, a: 0 });
    setIdx(it.key, s, 0);
    log.push({ key: it.key, load: Math.round(t1 - it.t0), upload: Math.round(performance.now() - t1) });
    if (log.length > 200) log.shift();
  }
  /* Výběr dlaždic: síť 13 × 9 paprsků z kamery; v každém zásahu tělesa se porovná velikost pixelu na povrchu (foot) s texelem
     stupňů. Vybere se nejjemnější stupeň, který tu shader opravdu ukáže (texel větší než asi 1/2 px, shader prolíná do 1/1,7 px),
     a v pásmu prolínání i stupeň pod ním (shader je tam míchá). Přednost má větší zvětšení (hrubší stupeň dřív – rychle pokryje
     plochu) a střed obrazovky. */
  const NX = 13,
    NY = 9;
  function add(z, u, v, pri) {
    let [gw, gh] = GRID(z),
      ty = gh - 1 - Math.min(gh - 1, Math.max(0, Math.floor(v * gh)));
    if (z === zmax && pole && (ty < pole || ty >= gh - pole)) {
      if (!z) return;
      z--; /* u pólu nejjemnější stupeň chybí – stačí hrubší */
      [gw, gh] = GRID(z);
      ty = gh - 1 - Math.min(gh - 1, Math.max(0, Math.floor(v * gh)));
    }
    const tx = ((Math.floor(u * gw) % gw) + gw) % gw,
      key = z + '-' + ty + '-' + tx;
    if (!(want.get(key) >= pri)) want.set(key, pri);
  }
  function select(c, Rb, m9, cam, F, W, H) {
    want.clear();
    const t0 = (Math.PI * Rb) / (4 * T) /* texel stupně 0 na rovníku */,
      cc = c.x * c.x + c.y * c.y + c.z * c.z - Rb * Rb;
    for (let a = 0; a < NY; a++)
      for (let b = 0; b < NX; b++) {
        const X = ((b + 0.5) / NX - 0.5) * (W / F),
          Y = ((a + 0.5) / NY - 0.5) * (H / F);
        let dx = cam.fwd.x + cam.right.x * X - cam.up.x * Y,
          dy = cam.fwd.y + cam.right.y * X - cam.up.y * Y,
          dz = cam.fwd.z + cam.right.z * X - cam.up.z * Y;
        const dl = Math.hypot(dx, dy, dz);
        dx /= dl;
        dy /= dl;
        dz /= dl;
        const bb = dx * c.x + dy * c.y + dz * c.z,
          disc = bb * bb - cc;
        if (disc < 0) continue;
        const t = bb - Math.sqrt(disc);
        if (t <= 0) continue;
        const px = t * dx - c.x,
          py = t * dy - c.y,
          pz = t * dz - c.z,
          cs = -(px * dx + py * dy + pz * dz) / Rb,
          foot = t / F / dl / Math.max(cs, 0.25),
          bx = (m9[0] * px + m9[1] * py + m9[2] * pz) / Rb,
          by = (m9[3] * px + m9[4] * py + m9[5] * pz) / Rb,
          bz = (m9[6] * px + m9[7] * py + m9[8] * pz) / Rb,
          /* texelů stupně 0 na pixel; k pólům se rovnoběžky v mapě zkracují (texel je užší o cos šířky) – shader bere horší směr */
          tp0 = foot / (t0 * Math.max(Math.sqrt(Math.max(0, 1 - bz * bz)), 0.02));
        if (tp0 > 2.0) continue;
        const z = Math.min(zmax, Math.floor(Math.log2(2.0 / tp0) - 1e-9)),
          u = Math.atan2(by, bx) / (2 * Math.PI) + 0.5,
          v = Math.asin(Math.max(-1, Math.min(1, bz))) / Math.PI + 0.5,
          ctr = Math.hypot((b + 0.5) / NX - 0.5, (a + 0.5) / NY - 0.5),
          tz = tp0 * (1 << z);
        add(z, u, v, (1.6 - ctr) / tz);
        if (z > 0 && tz > 1.0) add(z - 1, u, v, (1.6 - ctr) / (tz * 0.5));
      }
    /* jen tolik dlaždic, kolik je míst; zbytek zůstane na hrubším stupni */
    if (want.size > nSlots) {
      const keep = [...want.entries()].sort((p, q) => q[1] - p[1]).slice(0, nSlots);
      want.clear();
      for (const [k, p] of keep) want.set(k, p);
    }
  }
  /* volá engine každý snímek pro těleso v ohnisku; vrací váhu úrovně 2 pro uniform uL2.w */
  L2.frame = (i, id, U2, o) => {
    const now = o.now;
    if (L2_IDS[id] === undefined || !o.can || L2.slots <= 0) {
      if (owner === i) reset();
      U2.value.w = 0;
      return;
    }
    if (owner !== i) {
      reset();
      owner = i;
      zmax = Math.min(ZN - 1, ZMAX(id) | 0);
      pole = POLE(id);
    }
    U2.value.set(zmax, 0, cols || 4, 0);
    const near =
      o.pr >
      o.H * 0.35; /* od tohoto přiblížení se úroveň 1 uprostřed kotouče začíná roztahovat (podrobně rozhodne výběr) */
    if (!near && !tiles.size) return;
    if (!rt && !alloc()) return;
    U2.value.z = cols;
    if (now - lastSel > 160) {
      lastSel = now;
      select(o.c, o.R, o.m9, o.cam, o.F, o.W, o.H);
      const g = gen;
      const order = [...want.entries()].sort((p, q) => q[1] - p[1]);
      for (const [k] of order) {
        const t = tiles.get(k);
        if (t && t.slot !== undefined) slots[t.slot].used = now;
        else if (!t && busy < 3) request(k, id, g);
      }
    }
    if (ready.length) upload(now);
    for (const [k, t] of tiles)
      if (t.slot !== undefined && t.a < 1) {
        t.a = Math.min(1, t.a + o.dt * 3.5);
        setIdx(k, t.slot, t.a);
        wake();
      }
    if (dirty) {
      idx.needsUpdate = true;
      dirty = false;
    }
    U2.value.w = 1;
    if (busy || ready.length) wake();
  };
  /* Předem (jen webová verze): soubory dlaždic stupňů 0 a 1 strategických těles se v klidu po startu stáhnou do mezipaměti
     prohlížeče, aby se zblízka jen rozbalily (nejjemnější stupeň 2 Země a Měsíce – 32k – se stahuje až podle potřeby). Nic se
     nerozbaluje ani nenahrává do grafiky. Soubor na flashku má vše v sobě – tam se nedělá nic.
     ok() – smí se teď stahovat (nelétá se, neběží ukázka); po každé dlaždici se ptá znovu. */
  L2.prefetch = async (ids, ok, zTo = 1) => {
    if (offline() || L2.slots <= 0 || !/^https?:/.test(location.protocol)) return 0;
    let n = 0;
    for (let z = 0; z <= zTo; z++)
      for (const id of ids) {
        if (L2_IDS[id] === undefined || z > ZMAX(id)) continue;
        const [gw, gh] = GRID(z),
          order = [],
          pl = z === ZMAX(id) ? POLE(id) : 0;
        for (let ty = pl; ty < gh - pl; ty++)
          for (let tx = 0; tx < gw; tx++) order.push([Math.abs(ty + 0.5 - gh / 2), z + '-' + ty + '-' + tx]);
        order.sort((a, b) => a[0] - b[0]); /* od rovníku k pólům */
        for (const [, key] of order) {
          while (!ok()) await new Promise((r) => setTimeout(r, 1500));
          try {
            const q = await fetch(AS('maps/l2/' + id + '/' + key + '.webp'), { priority: 'low' });
            if (!q.ok) return n; /* dlaždice na serveru nejsou – dál se neptat */
            await q.blob();
            n++;
          } catch (e) {
            return n;
          }
        }
      }
    return n;
  };
  return L2;
}
