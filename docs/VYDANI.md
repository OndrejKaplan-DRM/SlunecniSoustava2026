# Kontrolní seznam před zveřejněním

Projít před každým sloučením do `main` a zveřejněním (stránka, artefakt, soubor na flashku).

## Kód a testy
- [ ] `npm run build` bez chyb (`./build.sh 2>&1 | grep -c ERROR` dá 0)
- [ ] `npm test` – ukázka 10/10, „bez chyb“
- [ ] `npm run test:fakta` – bez chyb
- [ ] `npx prettier --check "src/**/*.js" "tools/**/*.mjs"` čisté (kromě `tools/zvuky/picks.json`)
- [ ] snímky v 1366 × 768, 1920 × 1080, 3840 × 2160 a na telefonu (`tools/test/mobshot.mjs`): nic se nepřekrývá, nápověda se dá dočíst

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
