/* Třída zařízení pro chytré načítání.
   Prohlížeč neumí říct, kolik paměti je volné: Chrome a Edge prozradí jen hrubou třídu (nejvýš „8 GB“), Firefox a Safari nic
   a paměť grafické karty nezjistí žádný. Rozhoduje se proto podle třídy zařízení a podle vlastního měření prvních úloh.
     úsporná – telefon, tablet, málo paměti, malá největší textura nebo snížená kvalita: jen povinné minimum
     běžná   – neznámá paměť nebo 4–8 GB: podrobná Země, Měsíc a Mars předem, jen když první úlohy běží svižně
     bohatá  – aspoň 8 GB, 4 jádra a textury do 8192 px: předem i Jupiter a Saturn
   Rozpočet je odhad paměti grafické karty pro mapy těles v MB (mapa 4096 × 2048 zabere se zmenšeninami asi 45 MB).
   Ruční volba pro zkoušky: ?trida=usporna | bezna | bohata */
export const TRIDY = {
  usporna: { nazev: 'úsporné', rozpocet: 120, bonus: 0 },
  bezna: { nazev: 'běžné', rozpocet: 300, bonus: 3 },
  bohata: { nazev: 'výkonné', rozpocet: 600, bonus: 5 },
};
export function detectDevice(renderer, quality) {
  const gl = renderer.getContext(),
    dbg = gl.getExtension('WEBGL_debug_renderer_info'),
    gpu = dbg
      ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL))
          .replace(/^ANGLE \((.*)\)$/, '$1')
          .replace(/\s*\(0x[0-9A-Fa-f]+\)/g, '')
          .slice(0, 64)
      : '',
    tex = renderer.capabilities.maxTextureSize,
    jadra = navigator.hardwareConcurrency || 0,
    pamet = navigator.deviceMemory || 0,
    maly = /\b(mob|tab)\b/.test(document.body.className),
    soft = /swiftshader|llvmpipe|software/i.test(gpu);
  let trida = 'bezna';
  if (maly || tex < 4096 || quality === 0 || (pamet && pamet < 4) || typeof createImageBitmap !== 'function')
    trida = 'usporna';
  else if (pamet >= 8 && jadra >= 4 && tex >= 8192 && !soft) trida = 'bohata';
  const q = new URLSearchParams(location.search).get('trida');
  const rucne = !!(q && TRIDY[q]);
  if (rucne) trida = q;
  return {
    trida,
    rucne,
    ...TRIDY[trida],
    gpu,
    tex,
    jadra,
    pamet,
    pametTxt: pamet ? (pamet >= 8 ? 'aspoň 8 GB' : pamet + ' GB') : 'prohlížeč neprozradí',
  };
}
