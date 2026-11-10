# Sluneční soustava 200

Realistický model Sluneční soustavy v prohlížeči (Three.js): 200 těles ve skutečném měřítku, na skutečných drahách,
dospělé a dětské rozhraní, ukázka ovládání, zvuky, hra pro mladého astronoma.

Artefakt: https://claude.ai/artifact/ELrVkgtSrBnAAveX332y2o

## Verze (značky)
- `iterace-2` – ikony z map, dětské rozhraní, filtry Slunce, souhvězdí, ukázka, zvuky
- `iterace-3` – 20 vylepšení: útvary, sondy, stroj času, pravítko, polární záře, gejzíry, minimapa, album, hudba, tajné menu…

## Struktura
- `src/` – zdrojáky: `sim.js` (katalog, efemeridy, natočení), `engine.js` (vykreslování, kamera), `shaders.js`,
  `ui.js` (rozhraní, hra), `extras.js` (2D vrstva: popisky, sondy, minimapa…), `audio.js`, `tutorial.js`, `cat.json` (katalog 200 těles)
- `dist/` – hotová aplikace: `index.html`, `app.js`, `icons.webp`, `maps/*.avif` (stačí nahrát na web nebo publikovat jako artefakt)
- `tools/` – stavba dat: `build_catalog.py` (katalog ze Stellaria + ruční tabulky), `make_maps_new.py` (procedurální mapy),
  `build_assets.mjs` (mapy AVIF + `cat.json`), `build_icons.mjs` (atlas ikon), testy `shot.mjs`, `func*.mjs`, `tut.mjs`
- `zdroje/` – vstupní mapy (Stellarium, three.js examples, Planet Pixel Emporium) a katalogy Stellaria

## Sestavení
```
npm i three@0.187.0 esbuild sharp
npx esbuild src/main.js --bundle --minify --format=iife --outfile=dist/app.js --loader:.json=json
```
Skripty v `tools/` mají cesty zapsané natvrdo pro pracovní prostor, kde vznikly (`/home/claude/s200`, `/home/claude/dl`,
repo OliverovaPlanetka8 pro původních 147 map a fity drah). Před novou stavbou dat je potřeba cesty upravit.

## Zdroje dat
Dráhy a fyzikální údaje: Stellarium (JPL, MPC, IAU), Standishovy elementy + opravy z DE421, PyEphem; Měsíc podle Meeuse.
Hvězdy: Yale Bright Star Catalogue. Mapy: NASA, Stellarium, three.js examples, Planet Pixel Emporium (J. Hastings-Trew).

## Telefon a tablet (iterace 5)
`src/mobile.js` nastavuje na `<body>` třídy `mob` (telefon nebo okno užší než 700 px), `tab` (tablet), `touch` (dotykové zařízení),
`land` (telefon naležato) a `stack` (lišty pod sebou). Všechna pravidla pro ně jsou na konci stylů v `dist/index.html`;
bez těchto tříd se nepoužije nic. Ruční přepnutí: nabídka ☰ → „Zobrazení“, nebo adresa s `?view=mob|tab|pc`.
Test: `node tools/mobshot.mjs /tmp/mob phone|land|tab|tabl`.

## Zkušebna zvuků
Ikona ♪ v pravém dolním rohu. 256 zvuků v `dist/zvuky/`, seznam `src/zvuky.json`, zdroje a licence `zdroje/ZVUKY.md`
(vše CC0 z opengameart.org). Výběr a převod: `tools/zvuky/` (`oga.py`, `unpack.py`, `pick.py`, `encode.py`).
