# Architektura (stav 13. 11. 2026)

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

## Moduly přidané ve verzích 1.4–1.8a
- `core/flags.js` – registr funkcí: každá funkce má stav `vse`, `dospeli`, `dev` nebo `off`; `S.F.on(klíč)` říká, zda je teď dostupná
  (podle rozhraní a parametru `?dev`). Třídy `no-<klíč>` na `<body>` schovávají prvky v CSS.
- `core/device.js` – třída zařízení (úsporná, běžná, bohatá) z počtu jader, paměti a grafiky; určuje rozpočet paměti a kolik
  podrobných map se přednačte.
- `ui/superkarta.js` – podrobná karta tělesa (pětiklik na těleso, ikonu nebo jméno); sama se zavře kliknutím mimo.
- `render/belts.js` – hlavní pás planetek a Kuiperův pás: dvě mračna bodů, polohu každého bodu počítá vertex shader z elementů dráhy
- `render/l2.js` (1.8m) – úroveň 2 map: dlaždice 1024 px (+1 px okraje) z mozaik 16k/8k (`data/l2.json`, `maps/l2/<id>/<řádek>-<sloupec>.webp`). Pro těleso v ohnisku vybere 13 × 9 paprsky dlaždice, kde by se velká mapa roztahovala, rozbalí je (`createImageBitmap`) a nahraje do jednoho atlasu (`WebGLRenderTarget`, 8 nebo 16 míst; `renderer.copyTextureToTexture`). Malá textura indexu (16 × 8, RGBA: místo + 1, průhlednost) říká shaderu `BODY_FS`, kde dlaždice leží; shader ji prolne jen tam, kde se zvětšuje.
  a času modelu (Keplerova rovnice řadou do e²). Průhlednost řídí `update()` jednou za snímek: podle výšky kamery nad tělesem
  (u tělesa zblízka pás zmizí), podle zdánlivé velikosti prstence (malý prstenec = slabší a menší tečky) a podle toho, zda je kamera
  hluboko uvnitř prstence. Tečky nejsou v katalogu, nejdou vybrat a nemají jména – je to ilustrace.
- Okna: seznam `POPS` v `ui/ui.js` (okna se navzájem zavírají) a od 1.8a „úklid“ `SWEEP`: událost `fly` na sběrnici (každý přelet)
  a tah do vesmíru zavřou okna, která zakrývají pohled. Karta úkazu se při přeletu a na Esc sbalí do proužku.
- Výšky oken v CSS se počítají z `var(--vh)` (na telefonu `100dvh`) a dělí měřítkem rozhraní `var(--bk)`.

## Co je velké a zaslouží rozdělit
`render/engine.js` (1850 řádků), `ui/ui.js` (1805) a `audio/audio.js` (1453) jsou každý jedna velká funkce se sdíleným vnitřním stavem.
Rozdělení na menší moduly (např. engine: kamera, tělesa, mapy, souhvězdí, 2D vrstva) vyžaduje předat tento stav výslovně – je to samostatný krok.
GLSL v `render/shaders.js` je v řetězcích a formátovač se ho netýká.

## Ověření přeskupení
Přesun do složek a formátování z 13. 11. 2026 nezměnily chování: `dist/app.js` je před a po bajt po bajtu shodný (SHA-256 začíná `1ad261eb2241bd30`).

## Čas a věrohodnost poloh
Aplikace drží světový čas (`S.jd`). `sim.local` ho převádí na čas efemerid (`ttOf`, ΔT) a teprve v něm počítá polohy; natočení Země (`earthBasis`) zůstává ve světovém čase. Planety a Pluto počítá v letech 1900–2050 `jplCorrPos`, jinde `longPos` (dlouhodobá teorie, `orbit.long` v katalogu), přechod je plynulý (`longWeight`). Měření a meze: `docs/VEROHODNOST.md`.
