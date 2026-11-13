# Sluneční soustava 200

Realistický model Sluneční soustavy v prohlížeči (Three.js): 200 těles ve skutečném měřítku a na skutečných drahách,
dospělé a dětské rozhraní, ukázka ovládání, zvuky a hudba, hra pro mladého astronoma.

- Veřejná stránka: https://ondrejkaplan-drm.github.io/SlunecniSoustava2026/ (větev `gh-pages` = obsah `dist/`)
- Artefakt: https://claude.ai/artifact/ELrVkgtSrBnAAveX332y2o
- Autor: Ondřej Kaplan; experimentální aplikace psaná s Claude.

## Rychlý start

```sh
npm install          # three, esbuild, sharp, prettier
npm run build        # src/ → dist/app.js (jeden minifikovaný soubor)
npm test             # regresní ukázka ovládání, musí skončit 10/10 (potřebuje Playwright s Chromiem)
npm run offline:hi   # verze v jednom souboru HTML včetně velkých map (na flashku)
npm run format       # jednotné formátování zdrojáků (Prettier)
```

Aplikaci tvoří složka `dist/` – stačí ji vystavit libovolným statickým serverem.

## Struktura

```
src/                  zdrojový kód (ES moduly)
  main.js             vstupní bod: sestaví engine, zvuk, rozhraní a spustí smyčku
  core/               výpočty bez vykreslování
    sim.js            katalog těles, polohy, natočení (IAU), tvary
    ephem.js          efemeridy planet a Měsíce
    shape.js          trojosé tvary malých těles
    asset.js          adresa souboru (nebo data URI ve verzi v jednom souboru)
  render/             vykreslování (WebGL, Three.js)
    engine.js         scéna, kamera, lety, načítání map (malé a velké), souhvězdí, 2D vrstva
    shaders.js        GLSL: tělesa, Slunce, prstence, atmosféry, hvězdy, souhvězdí
    ball.js           kotouče těles na 2D plátně (porovnání velikostí, ikony)
  ui/                 rozhraní
    ui.js             karta tělesa, lišty, hra, klávesy a ukazatel
    extras.js         2D vrstva: útvary, sondy, pravítko, minimapa
    orient.js         šipky ke Slunci a Zemi, orientační body
    mobile.js         telefon a tablet
    tutorial.js       ukázka ovládání
    zvuky.js          zkušebna zvuků
  audio/
    audio.js          syntéza, nahrávky, prostředí těles, hudba
  data/               data (negenerují se při sestavení, neformátují se)
    cat.json          katalog 200 těles
    hi.json           seznam těles s velkou mapou (dist/maps/hi/)
    stardata.js       hvězdy a čáry souhvězdí
    connames.js       česká jména souhvězdí a hvězd
    facts.js          zajímavosti k tělesům
    zvuky.json        seznam zvuků zkušebny
dist/                 hotová aplikace
  index.html          stránka, styly a prvky rozhraní
  app.js              výstup sestavení (needitovat ručně)
  icons.webp          atlas ikon těles
  maps/               mapy těles (WebP); maps/hi/ = velké mapy načítané až zblízka
  music/, zvuky/      skladby a zvuky (MP3)
tools/                nástroje (spouštět z kořene repa)
  build/              build_offline.mjs – verze v jednom souboru
  test/               tut.mjs (regrese), t_hi.mjs (velké mapy), shot.mjs, mobshot.mjs, sunshot.sh, t_*.mjs
  maps/               make_hi.py (velká mapa z mozaiky), make_saturn.py, tone_proc.py, starší převody
  data/               stavba katalogu, ikon a dat (část potřebuje repo Oliverovy Planetky 8)
  zvuky/              výběr a převod zvuků CC0
  archiv/             zastaralé skripty, nepoužívat
zdroje/               původ dat: MAPY.md (mapy a licence), ZVUKY.md
docs/                 poznámky k architektuře
```

## Pravidla práce

- `dist/app.js` je výstup sestavení; při slučování větví se neřeší ručně, znovu se sestaví.
- Každá iterace má větev `iterace-N`; do `main` se slučuje až po zkoušce. Bod návratu před grafikou: `verze-1.1-stabilni`.
- Před každým commitem `npm run build` a `npm test`.
- Původ a licence každé mapy patří do `zdroje/MAPY.md`.
