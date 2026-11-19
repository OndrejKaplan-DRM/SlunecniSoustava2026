// Úroveň 2 map těles (verze 1.8m): dlaždice 1024 px (+1 px okraje) z primárních mozaik 16k nebo 8k (seznam src/data/l2.json,
// soubory dist/maps/l2/<id>/<řádek>-<sloupec>.webp, řádek 0 = sever). Načítají se jen pro těleso v ohnisku, jen zblízka a jen ty,
// na které se díváš – tam, kde se velká mapa (úroveň 1, 4096 × 2048) už roztahuje. Dlaždice se skládají do jedné „atlasové“
// textury (8 nebo 16 míst, 32 nebo 64 MB) a malá textura indexu říká shaderu, která dlaždice leží na kterém místě.
// Shader úroveň 2 prolne jen tam, kde se zvětšuje (texel ≥ pixel); jinak zůstává úroveň 1 se zmenšeninami – žádné třpytivé zrnění.
import L2_IDS from '../data/l2.json';

const T = 1024,
  SLOT = 1026, // dlaždice s okrajem 1 px na každé straně (bilineární vzorkování nepřeteče do sousedního místa)
  GW = 16,
  GH = 8; // největší mřížka (16k); 8k tělesa používají 8 × 4

export function createL2({ THREE, renderer, AS, wake }) {
  const idxData = new Uint8Array(GW * GH * 4),
    idx = new THREE.DataTexture(idxData, GW, GH, THREE.RGBAFormat, THREE.UnsignedByteType);
  idx.minFilter = idx.magFilter = THREE.NearestFilter;
  idx.generateMipmaps = false;
  idx.needsUpdate = true;
  const U = { tL2: { value: idx }, tL2i: { value: idx }, uL2s: { value: new THREE.Vector2(1, 1) } };
  let rt = null,
    cols = 0,
    nSlots = 0,
    owner = -1,
    gen = 0,
    gw = 0,
    gh = 0,
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
    slots: 8 /* nastaví rozhraní podle třídy zařízení: 0 úsporná, 8 běžná, 16 výkonná */,
    has: (id) => !!L2_IDS[id],
    grid: (id) => L2_IDS[id],
    mem: () => (rt ? (rt.width * rt.height * 4) / 1048576 : 0),
    state: () => ({
      owner,
      slots: nSlots,
      loaded: [...tiles.values()].filter((t) => t.slot !== undefined).length,
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
    const [ty, tx] = key.split('-').map(Number),
      o = ((gh - 1 - ty) * GW + tx) * 4;
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
  function request(key, id, g) {
    const url = 'maps/l2/' + id + '/' + key + '.webp';
    if (offline() && !window.S200_ASSETS[url])
      return tiles.set(key, { bad: true }); /* soubor na flashku bez úrovně 2 */
    tiles.set(key, { load: true });
    busy++;
    const t0 = performance.now();
    fetch(AS(url))
      .then((q) => {
        if (!q.ok) throw new Error('http');
        return q.blob();
      })
      .then((bl) =>
        createImageBitmap(bl, { imageOrientation: 'flipY', premultiplyAlpha: 'none', colorSpaceConversion: 'none' })
      )
      .then((bm) => {
        busy--;
        if (g !== gen) return bm.close();
        ready.push({ key, bm, t0 });
        wake();
      })
      .catch(() => {
        busy--;
        if (g === gen) tiles.set(key, { bad: true });
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
  /* Výběr dlaždic: síť 13 × 9 paprsků z kamery; v každém zásahu tělesa se porovná velikost pixelu na povrchu s texelem úrovně 2.
     Dlaždice je potřeba tam, kde ji shader opravdu ukáže (texel úrovně 2 větší než asi 1/2 px, shader prolíná do 1/1,7 px);
     přednost má větší zvětšení a střed obrazovky. */
  const NX = 13,
    NY = 9;
  function select(c, Rb, m9, cam, F, W, H) {
    want.clear();
    const t2 = (Math.PI * Rb) / (gh * T),
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
          foot = t / F / dl / Math.max(cs, 0.25);
        if (foot > t2 * 2.0) continue;
        const bx = (m9[0] * px + m9[1] * py + m9[2] * pz) / Rb,
          by = (m9[3] * px + m9[4] * py + m9[5] * pz) / Rb,
          bz = (m9[6] * px + m9[7] * py + m9[8] * pz) / Rb,
          u = Math.atan2(by, bx) / (2 * Math.PI) + 0.5,
          v = Math.asin(Math.max(-1, Math.min(1, bz))) / Math.PI + 0.5,
          tx = ((Math.floor(u * gw) % gw) + gw) % gw,
          ty = gh - 1 - Math.min(gh - 1, Math.max(0, Math.floor(v * gh))),
          ctr = Math.hypot((b + 0.5) / NX - 0.5, (a + 0.5) / NY - 0.5),
          pri = (t2 / foot) * (1.6 - ctr),
          key = ty + '-' + tx;
        if (!(want.get(key) >= pri)) want.set(key, pri);
      }
    /* jen tolik dlaždic, kolik je míst; zbytek zůstane na úrovni 1 */
    if (want.size > nSlots) {
      const keep = [...want.entries()].sort((p, q) => q[1] - p[1]).slice(0, nSlots);
      want.clear();
      for (const [k, p] of keep) want.set(k, p);
    }
  }
  /* volá engine každý snímek pro těleso v ohnisku; vrací váhu úrovně 2 pro uniform uL2.w */
  L2.frame = (i, id, U2, o) => {
    const now = o.now;
    if (!L2_IDS[id] || !o.can || L2.slots <= 0) {
      if (owner === i) reset();
      U2.value.w = 0;
      return;
    }
    if (owner !== i) {
      reset();
      owner = i;
      [gw, gh] = L2_IDS[id];
    }
    U2.value.set(gw, gh, cols || 4, 0);
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
  /* Předem (jen webová verze): soubory dlaždic strategických těles se v klidu po startu stáhnou do mezipaměti prohlížeče,
     aby se zblízka jen rozbalily. Nic se nerozbaluje ani nenahrává do grafiky. Soubor na flashku má vše v sobě – tam se nedělá nic.
     ok() – smí se teď stahovat (nelétá se, neběží ukázka); po každé dlaždici se ptá znovu. */
  L2.prefetch = async (ids, ok) => {
    if (offline() || L2.slots <= 0 || !/^https?:/.test(location.protocol)) return 0;
    let n = 0;
    for (const id of ids) {
      const g = L2_IDS[id];
      if (!g) continue;
      const order = [];
      for (let ty = 0; ty < g[1]; ty++)
        for (let tx = 0; tx < g[0]; tx++) order.push([Math.abs(ty + 0.5 - g[1] / 2), ty + '-' + tx]);
      order.sort((a, b) => a[0] - b[0]); /* od rovníku k pólům */
      for (const [, key] of order) {
        while (!ok()) await new Promise((r) => setTimeout(r, 1500));
        try {
          const q = await fetch(AS('maps/l2/' + id + '/' + key + '.webp'), { priority: 'low' });
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
