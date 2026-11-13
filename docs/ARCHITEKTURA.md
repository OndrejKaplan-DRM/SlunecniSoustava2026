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

## Co je velké a zaslouží rozdělit
`render/engine.js` (1850 řádků), `ui/ui.js` (1805) a `audio/audio.js` (1453) jsou každý jedna velká funkce se sdíleným vnitřním stavem.
Rozdělení na menší moduly (např. engine: kamera, tělesa, mapy, souhvězdí, 2D vrstva) vyžaduje předat tento stav výslovně – je to samostatný krok.
GLSL v `render/shaders.js` je v řetězcích a formátovač se ho netýká.

## Ověření přeskupení
Přesun do složek a formátování z 13. 11. 2026 nezměnily chování: `dist/app.js` je před a po bajt po bajtu shodný (SHA-256 začíná `1ad261eb2241bd30`).
