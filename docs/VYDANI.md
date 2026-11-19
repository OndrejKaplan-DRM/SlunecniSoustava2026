# Kontrolní seznam před zveřejněním

Projít před každým sloučením do `main` a zveřejněním (stránka, artefakt, soubor na flashku).

## Kód a testy
- [ ] `npm run build` bez chyb (`./build.sh 2>&1 | grep -c ERROR` dá 0)
- [ ] `npm test` – ukázka ve třech bězích (náhodný plán, všechny pokročilé kapitoly, dětské rozhraní) doběhne do konce a uklidí po sobě, „bez chyb“ (asi 10 minut)
- [ ] `npm run test:fakta` – bez chyb
- [ ] `npm run test:model` – polohy planet, Pluta a Měsíce proti JPL DE422 (roky −1000 až 3000) v mezích
- [ ] `npx prettier --check "src/**/*.js" "tools/**/*.mjs"` čisté (kromě `tools/zvuky/picks.json`)
- [ ] snímky v 1366 × 768, 1920 × 1080, 3840 × 2160 a na telefonu (`tools/test/mobshot.mjs`): nic se nepřekrývá, nápověda se dá dočíst

- [ ] `node tools/test/t_karty.mjs` (32 karet úkazů, Superkarta všech těles, `?dev`) a `node tools/test/t_preload.mjs` bez chyb.
- [ ] `node tools/test/t_displej.mjs` (4K, televize se zvětšením 300–400 %, malé okno, přesun okna) bez chyb.
- [ ] `node tools/test/t_okna.mjs` (18 sestav od telefonu po monitor QHD × obě rozhraní × všechna okna: nic mimo obrazovku, nic uříznutého, zavírací tlačítka dost velká, žádné visící okno) – 0 nálezů. Běží asi 15 minut; `SHOT=1` uloží snímky.
- [ ] `node tools/test/t_obloha.mjs /tmp/obl desk` a `… phone` (objekty na obloze: data, zdroje, pohled na objekt, karty, dětské rozhraní nic neukáže) bez chyb.
- [ ] `node tools/test/t_pasy.mjs` (pásy planetek: vidět v přehledu, zblízka pryč, nejdou vybrat) bez chyb.
- [ ] `node tools/test/t_scena.mjs` (scéna úkazu na počítači, telefonu na výšku i na šířku a tabletu: výběr ze seznamu, časová osa, pohledy na zatmění, tělesa ve volné ploše, návrat; mizející dráhy a jejich přepínač) bez chyb. Běží asi 8 minut.
- [ ] `node tools/test/t_povrch.mjs` (pohled z povrchu na počítači, telefonu na výšku i na šířku a tabletu: vstup a výstup, výška Slunce z Prahy proti výpočtu, denní pohyb, vzduch, meze pohledu a zorného pole, sledování, Mars, Měsíc, dětské rozhraní, zatmění „Z místa“) bez chyb.
- [ ] `node tools/test/t_l2.mjs /tmp/l2 moon:0.25,earth:0.2:46:9,mars:0.25:-8:-75,mercury:0.25` (podrobné mapy zblízka: zdálky nic, zblízka dlaždice, telefon nic; snímky `<id>_L1.jpg` a `<id>_L2.jpg` před/po) bez chyb.
- [ ] `src/core/flags.js`: žádná nedodělaná funkce není ve stavu `vse`; vývojářský režim není po čistém otevření zapnutý.

## Data a texty
- [ ] každé nové číslo v textu má zdroj; čísla, která se mění (počty měsíců), mají datum stavu
- [ ] nové těleso: katalog, zajímavosti, ikona (`node tools/data/build_icons.mjs`), mapa, zápis v `CREDITS.md`
- [ ] nová mapa: původ a licence v `zdroje/MAPY.md` a `CREDITS.md`, značka 📷 / 🎨 na kartě odpovídá

## Obal
- [ ] číslo verze a datum na třech místech: úvodní obrazovka, „O aplikaci“ v nápovědě, `README.md` a `CREDITS.md`
- [ ] `dist/index.html`: popis, náhled odkazu (`dist/nahled.jpg`), ikona
- [ ] stránka nenačítá nic z cizích serverů (v nástrojích prohlížeče karta Síť)
- [ ] verze v jednom souboru (`npm run offline:hi`) se otevře dvojklikem bez internetu

## Zveřejnění
- [ ] záložní větev předchozí verze (`verze-X.Y-…`)
- [ ] souhlas autora
- [ ] `main`, `gh-pages`, artefakt (čerstvá `base_version`), soubor na flashku
