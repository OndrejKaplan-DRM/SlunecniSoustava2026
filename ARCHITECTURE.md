# Architektura

Stav 24. 11. 2026 (větev `iterace-25`, verze 2.1 rozpracovaná). Dřív `docs/ARCHITEKTURA.md` (stav 13. 11.), níže doplněno.
Kde co hledat: tato mapa modulů → podrobnosti oddílů níže → `docs/VEROHODNOST.md` (přesnost) → `DECISIONS.md` (proč).

## Mapa modulů (`src/`)
| Soubor | Co dělá |
|---|---|
| `main.js` | vstupní bod: sestaví engine, zvuk, rozhraní, spustí smyčku; `window.S200` = háčky pro zkoušky |
| `core/sim.js` | katalog (`B`, `idx`, `par`, `kids`), polohy `P` (km, heliocentricky, scéna = ekliptika x, z, −y), `updateAll(jd UT)`, čas (`deltaT`, `ttOf`, `setDeltaT`), Měsíc (`moonGeo` + `data/mesic.json`), natočení (`basis`: IAU z `data/rot.json`, Země `earthBasis` s precesí a nutací), tvary |
| `core/ephem.js` | efemeridy: planety (fit 1900–2050 + dlouhodobá teorie), malá tělesa (kuželosečky), měsíce (`satPos`: precesující elipsa + opravy `corr`, `bary` u malých měsíců Pluta) |
| `core/misto.js` (2.1) | místo na tělese: `siteFrame` (zenit, východ, sever na elipsoidu), `azEl`, `raDec`, `applyLightTime` (zdánlivé polohy), `riseSet`, `solarDay`, `obliquity`, `subPoint`, `refraction`, `eyeH` |
| `core/shape.js`, `asset.js`, `flags.js`, `device.js`, `preload.js` | tvary malých těles; adresy souborů (i vložené); registr funkcí; třída zařízení; přednačtení |
| `render/engine.js` | `createEngine` → `S`: kamera, lety, `pick`, mapy, souhvězdí, 2D vrstva (`S.overlays`), kroky (`S.ticks`), sběrnice `S.bus`; pohled z povrchu `S.surf`, `S.setSurf`, `surfCamera`; za snímek `applyLightTime` v pohledu z povrchu |
| `render/shaders.js`, `ball.js`, `l2.js`, `belts.js` | GLSL; kotouče na 2D plátně; podrobné mapy úrovně 2; pásy planetek (2.1: tři stupně výraznosti, `uPow`) |
| `ui/ui.js` | karta tělesa (řádky Atmosféra, Složení; tlačítko 🌐 Mřížka), lišty, hra, `act`, porovnání (`drawCmp`, čipy dvojic) |
| `ui/porovnani.js` (2.1) | `pairView`: dvě tělesa ve skutečném poměru, posuvník přiblížení, měřítko v km |
| `ui/superkarta.js` | Superkarta (pětiklik): od 2.1 oddíly Atmosféra (graf CO₂ u Země) a Složení a nitro |
| `ui/povrch.js` | pohled z povrchu: lišta `#surf`, zem a obzor, denní obloha, hledání těles; `enter(i, lat, lon, {az, el, fov, track, air, lt})` |
| `ui/povrch_info.js` (2.1) | panel `#surfp` „Obloha odsud“ (místo, čas, tělesa, hvězdy, osa, barva oblohy, pohled, vodítka) a vrstvy vodítek: obzorníková a rovníková mřížka, ekliptika, rovník, poledník, zaměřovač, mřížka na povrchu tělesa |
| `ui/udalosti.js`, `obloha.js`, `extras.js`, `orient.js`, `mobile.js`, `tutorial.js`, `zvuky.js` | úkazy; objekty na obloze; útvary, sondy, pravítko, minimapa; šipky; rozložení podle zařízení; ukázka; zkušebna zvuků |
| `data/` | `cat.json` (201 těles), `rot.json` (2.1, IAU 2015), `mesic.json` (2.1, doplňkové členy Měsíce), `slozeni.js` (2.1, atmosféry a nitra, CO₂), `mista.js` (2.1, pojmenovaná místa a barvy oblohy), `facts.js`, `stardata.js`, `connames.js`, `obloha.json`, `hi.json`, `l2.json`, `udalosti.json`, `zvuky.json` |
| `audio/audio.js` | syntéza, nahrávky, prostředí těles, hudba |

## Ověřování přesnosti (2.1, `tools/model/vernost/`, `tools/test/`)
- `hz.py` – dotazy na JPL Horizons s mezipamětí; `pripady.py` → `ref_povrch.json` (996 náhodných případů: těleso, místo, čas, cíl);
  `dt_zeme.py` doplní ΔT z Horizons; `t_vernost.mjs` porovná model (stejný kód jako aplikace) s Horizons.
- `ref_sceny.py` → `ref_sceny.json` (skutečné úkazy: přechody Phobosu a Deimosu přes Slunce ze snímků roverů, zatmění, konjunkce);
  `t_ref_sceny.mjs` – model musí úkaz najít sám ve správný čas.
- `mesice_ref.py` (vektory měsíců z Horizons) → `fit_mesice.py` → `tools/out/mesice_fit.json` → `zapis_mesice.mjs` (do `cat.json`).
- `mesic_rezidua.mjs` → `fit_mesic.py` → `src/data/mesic.json` (Měsíc).
- `fit_planetky.py` → `tools/out/planetky_fit.json` → `zapis_planetky.mjs` (planetky a TNO: `kind: 'kep'` s `Od`, `wd`; `ephem.js` stáčí uzel a perihel).
- `ref_snimky.mjs` (snímky scén z modelu) → `ref_slozit.py` (listy s fotkami NASA) → `docs/ref/`, `docs/REFERENCNI_SNIMKY.md`.
- `tools/data/rot_build.py` – `pck00011.tpc` → `src/data/rot.json`.


## Tok dat
`data/cat.json` → `core/sim.js` (polohy `P` v km, heliocentricky, 64 bitů) → `render/engine.js` (plovoucí počátek: kamera je vždy v nule,
polohy se odečítají ve dvojité přesnosti; logaritmická hloubka) → WebGL. Rozhraní (`ui/`) a zvuk (`audio/`) čtou stav `S` enginu
a volají jeho funkce (`flyTo`, `jump`, `setSunMode`…); zpět dostávají události přes `S.on.*`.

## Mapy těles
- Malá mapa `dist/maps/<id>.webp` se načte, jakmile je těleso větší než pár pixelů.
- Velká mapa `dist/maps/hi/<id>.webp` (seznam `data/hi.json`) se stáhne až po příletu, když má kotouč průměr přes 500 px; dekóduje se mimo
  hlavní vlákno a prolne se. V paměti jsou nejvýš dvě. Na telefonu, tabletu a při snížené kvalitě se nenačítá.
- Venuše: velká mapa ukazuje povrch (radar), malá oblačnost; míru prolnutí řídí jen velikost kotouče.
- Konvence: střed mapy = délka 0°, východ vpravo; nultý poledník vázaně rotujících těles míří k mateřskému tělesu.

## Moduly přidané ve verzích 1.4–1.8b
- `core/flags.js` – registr funkcí: každá funkce má stav `vse`, `dospeli`, `dev` nebo `off`; `S.F.on(klíč)` říká, zda je teď dostupná
  (podle rozhraní a parametru `?dev`). Třídy `no-<klíč>` na `<body>` schovávají prvky v CSS.
- `core/device.js` – třída zařízení (úsporná, běžná, bohatá) z počtu jader, paměti a grafiky; určuje rozpočet paměti a kolik
  podrobných map se přednačte.
- `ui/superkarta.js` – podrobná karta tělesa (pětiklik na těleso, ikonu nebo jméno); sama se zavře kliknutím mimo.
- Dráhy (1.9) – `orbitLine` a `buildOrbit` v `render/engine.js`: čára s průhledností po vrcholech; `orbitSamples` v `core/sim.js` dává ke každému
  vzorku stáří stopy (0 u tělesa, roste proti směru pohybu). `S.orbFade` přepíná stopu a rovnoměrnou čáru.
- Scéna úkazu (1.9) – `ui/udalosti.js` nastaví `S.evSet` (množina zúčastněných těles) a `S.evStrict`; engine pak kreslí značky a jména jen jim
  (a planetám, pokud není `evStrict`), `belts.js`, sondy v `extras.js` a šipky v `orient.js` ustoupí. Kameru skládají `setCam`, `setCamOver`
  a `aimDir` do volné plochy vedle karty; `S.cam.ly` a `S.cam.lp` (pootočení pohledu) se při návratu nulují.
- `render/belts.js` – hlavní pás planetek a Kuiperův pás: dvě mračna bodů, polohu každého bodu počítá vertex shader z elementů dráhy
- `render/l2.js` (1.8m) – úroveň 2 map: pyramida dlaždic 1024 px (+1 px okraje), stupeň z = 0, 1, 2 má (8 · 2^z) × (4 · 2^z) dlaždic (8k, 16k, 32k; `data/l2.json` = nejjemnější stupeň tělesa, `maps/l2/<id>/<z>-<řádek>-<sloupec>.webp`). Pro těleso v ohnisku vybere 13 × 9 paprsky v každém zásahu nejjemnější stupeň, jehož texel je asi velký jako pixel (v pásmu prolínání i stupeň pod ním), rozbalí dlaždice (`createImageBitmap`) a nahraje do jednoho atlasu (`WebGLRenderTarget`, 12 nebo 24 míst; `renderer.copyTextureToTexture`). Malá textura indexu (32 × 28, stupně nad sebou; RGBA: místo + 1, průhlednost) říká shaderu `BODY_FS`, kde dlaždice leží; shader stupně prolíná od hrubého k jemnému a jen tam, kde se zvětšují. Doplňkové mapy k velké mapě (`EXTRA` v `engine.js`, jeden kanál R8): noční světla Země 8192 px (`maps/hi/earth_lights.webp`) a reliéf Měsíce (`maps/hi/moon_relief.webp`, sklony k východu a k severu nad sebou; shader `BODY_FS` podle nich nakloní normálu).
  a času modelu (Keplerova rovnice řadou do e²). Průhlednost řídí `update()` jednou za snímek: podle výšky kamery nad tělesem
  (u tělesa zblízka pás zmizí), podle zdánlivé velikosti prstence (malý prstenec = slabší a menší tečky) a podle toho, zda je kamera
  hluboko uvnitř prstence. Tečky nejsou v katalogu, nejdou vybrat a nemají jména – je to ilustrace.
- Okna: seznam `POPS` v `ui/ui.js` (okna se navzájem zavírají) a od 1.8a „úklid“ `SWEEP`: událost `fly` na sběrnici (každý přelet)
  a tah do vesmíru zavřou okna, která zakrývají pohled. Karta úkazu se při přeletu a na Esc sbalí do proužku.
- `ui/obloha.js` (1.8c) – objekty vzdáleného vesmíru na fotce oblohy. Modul je záměrně soběstačný: styly (`<style>`), prvky stránky,
  položku nabídky ☰ i odstavec nápovědy vkládá sám a do `POPS` a `act` se zapisuje přes `ui.pops` a `ui.actions`; `dist/index.html`
  o něm neví. Části: (1) polohy objektů se počítají každý snímek ve funkci zapsané do `S.overlays` (směr dává `S.eq2s(α, δ)`); tamtéž
  se kreslí nenápadné kroužky, když jsou zapnutá souhvězdí nebo režim „Stále vidět“; (2) zvýrazněný kroužek `#dsr` a bublina `#dsb`
  jsou prvky stránky, ne `.panel`, aby fungovaly i v kině, kde je 2D vrstva skrytá; (3) scéna objektu `#dss` je režim, ne okno: třída
  `ds-stage` na `<body>` zprůhlední hlavní rozhraní, „čočka“ `.ss-lens` se animuje (Web Animations) z kroužku do místa fotografie a zpět,
  obsah kreslí `fill()` a `tab()`; (4) natočení pohledu `aim()` nemění těleso ani výšku, jen otočení kolem tělesa a odklon pohledu,
  a `back()` vrací pohled uložený před natočením. Zkoušky mají `S200.obloha.fast(true)` (bez animací).
  Od větve `iterace-23b`: skupina „Hvězdy“ (`o.star`; značku a jméno hvězd, které při „Jménech hvězd“ popisuje engine, vrstva nekreslí –
  `o.eng` podle `STAR_NAMES`); jména se vyhýbají `S.labRects` (tělesa) a `S.skyRects` (souhvězdí a hvězdy, plní engine) a při nedostatku
  místa se odsunou a spojí čárkou (`FAR`); při pohledu z povrchu natáčí `aim()` pozorovatele (`S.surf.az`, `S.surf.el`), ne kameru na oběžné dráze.
- `ui/povrch.js` (1.10) – pohled z povrchu tělesa. Stav drží engine v `S.surf` (místo, směr, zorné pole, sledované těleso);
  `surfCamera` v `render/engine.js` staví kameru na povrch (zenit, východ, sever z `basis`), mění zorné pole a těleso pod nohama
  nekreslí. Modul kreslí lištu `#surf`, zem s obzorem jako první vrstvu `S.overlays` a denní oblohu `#skyair`; sílu oblohy
  zapisuje do `S.skyDim`, podle které engine tlumí hvězdy. Ostatní vrstvy se ptají `S.surf` a `S.surfBasis()` (co je pod obzorem).
  Pohled „Z místa“ u zatmění volá `ui.povrch.enter(…, { quiet: true })` z `ui/udalosti.js`.
- Výšky oken v CSS se počítají z `var(--vh)` (na telefonu `100dvh`) a dělí měřítkem rozhraní `var(--bk)`.

## Co je velké a zaslouží rozdělit
`render/engine.js` (1850 řádků), `ui/ui.js` (1805) a `audio/audio.js` (1453) jsou každý jedna velká funkce se sdíleným vnitřním stavem.
Rozdělení na menší moduly (např. engine: kamera, tělesa, mapy, souhvězdí, 2D vrstva) vyžaduje předat tento stav výslovně – je to samostatný krok.
GLSL v `render/shaders.js` je v řetězcích a formátovač se ho netýká.

## Ověření přeskupení
Přesun do složek a formátování z 13. 11. 2026 nezměnily chování: `dist/app.js` je před a po bajt po bajtu shodný (SHA-256 začíná `1ad261eb2241bd30`).

## Čas a věrohodnost poloh
Aplikace drží světový čas (`S.jd`). `sim.local` ho převádí na čas efemerid (`ttOf`, ΔT) a teprve v něm počítá polohy; natočení Země (`earthBasis`) zůstává ve světovém čase. Planety a Pluto počítá v letech 1900–2050 `jplCorrPos`, jinde `longPos` (dlouhodobá teorie, `orbit.long` v katalogu), přechod je plynulý (`longWeight`). Měření a meze: `docs/VEROHODNOST.md`.
