# TODO – co se právě dělá

Aktualizuje se na konci každého kroku a před koncem sešny. Starší historie verzí: `docs/ZMENY.md`. Důvody rozhodnutí: `DECISIONS.md`.

## Iterace 25 → verze 2.1 (větev `iterace-25`, od 24. 11. 2026)
Zadání Ondřeje (24. 11.): 1) atmosféry a složení, 2) srovnání velikostí i Slunce × Země, 3) pásy planetek příliš výrazné?,
4) pohled z povrchu libovolného tělesa (body a–h) + zkouška na 500–1000 náhodných případech + kalibrace + referenční snímky.

### Hotovo (commitnuté na `iterace-25`)
- [x] Úkol 1 – atmosféry a složení (`src/data/slozeni.js`): dětská karta krátce, dospělá víc (řádky Atmosféra a Složení), Superkarta
      nejvíc (plyny v %, tlak, teplota, kůra, plášť, jádro, zdroje); Země: vzácné plyny 0,94 % (argon 0,934 %), CO₂ 429 ppm a graf 1959–2025 (NOAA).
- [x] Úkol 2 – srovnání: čipy „vedle Slunce / Jupiteru / Země / Měsíce“, dvojice ve skutečném poměru s posuvníkem přiblížení (`ui/porovnani.js`);
      původní řada těles zůstala.
- [x] Úkol 3 – pásy: změřeno, že tečky byly stejně výrazné jako katalogové planetky (ve skutečnosti by nebylo vidět nic); tři stupně,
      výchozí „nenápadně“ (`render/belts.js`).
- [x] Úkol 4a–h – panel „📋 Obloha odsud“ (`ui/povrch_info.js`, `data/mista.js`): místo (pojmenovaná místa, šířka/délka), čas UT a posuny,
      místní sluneční čas, tělesa nad obzorem (azimut, výška, průměr, fáze, jasnost, východ/západ), hvězdy (Yale BSC), osa a otáčení,
      barva oblohy, směr a zorné pole, vodítka (obzorníková a rovníková mřížka, ekliptika, rovník, poledník, zaměřovač se stupnicí),
      mřížka na povrchu tělesa v pohledu z oběžné dráhy (tlačítko 🌐 Mřížka v kartě). Panel stojí vedle lišty, nepřekrývá ji.
- [x] Rotace všech těles podle IAU WGCCRE 2015 (NAIF `pck00011.tpc` → `src/data/rot.json`), v čase TT; nutace Země.
- [x] Zdánlivé polohy (doba letu světla, aberace) v pohledu z povrchu (`core/misto.js`).
- [x] Zkouška 996 náhodných případů proti JPL Horizons (`tools/test/ref_povrch.json`, `t_vernost.mjs`).
- [x] Měsíc: 208 doplňkových členů fitovaných na DE441 – 26″ → 1,8″ (zatmění 2024: −125 s → −10 s).
- [x] Referenční scény z Horizons (`tools/test/ref_sceny.json`, `t_ref_sceny.mjs`): přechod Phobosu přes Slunce (Perseverance 2022),
      Deimosu (Curiosity 2019), zákryt Deimosu Phobosem (2013), Země z Marsu (2004, 2014), Praha 21. 11. 2026, velká konjunkce 2020,
      zatmění 2024, Jupiter z Io, Země z Měsíce (Apollo 17).
- [x] Paměť projektu v repu: `CLAUDE.md`, `ARCHITECTURE.md` (přesunuto z `docs/ARCHITEKTURA.md`), `DECISIONS.md`, `TODO.md`.

### Rozpracováno
- [ ] Nový fit drah 82 měsíců proti Horizons 1900–2100 (`tools/model/vernost/fit_mesice.py` → `tools/out/mesice_fit.json`, ukládá po
      každém měsíci, při přerušení stačí spustit znovu) → zapsat `node tools/model/vernost/zapis_mesice.mjs` (jen kde je lepší) → sestavit →
      `t_vernost`, `t_ref_sceny`, `test:model`, `test:fakta`. Očekávání: Io 6,3° → 0,01°, Phobos 17° → 0,03°, Triton 45° → 0,01°.
- [ ] Velká konjunkce 2020: model ukazuje nejtěsnější přiblížení o 115 s jinak – ověřit, zda jde o plochost minima (vzdálenost sedí na 0,01′).

### Zbývá
- [ ] Ceres, Vesta a další planetky s dvoutělesovou dráhou (`kep`): dnes do 35′, v jiných stoletích až 15° → fit proti Horizons nebo jen popsat mez.
- [ ] Mez testů `t_vernost` (`LIM`) podle změřených hodnot po fitu měsíců; skripty `test:vernost` a `test:sceny` do `package.json`.
- [ ] Snímky referenčních scén z modelu (`tools/test/ref_snimky.mjs`) vedle fotek NASA (PIA25179, PIA23134, PIA17350, PIA17936, PIA05547;
      zmenšené, se zdrojem a licencí) → `docs/ref/` + přehled `docs/REFERENCNI_SNIMKY.md`.
- [ ] Dětské rozhraní panelu „Obloha odsud“ (zjednodušit), nápověda, telefon a tablet (snímky).
- [ ] Rozpor Merkur: jádro 85 % (facts.js) × 83 % (slozeni.js) – sjednotit podle pramene.
- [ ] Regrese po jedné: `tut`, `t_preload`, `t_karty`, `t_displej`, `t_pasy`, `t_obloha`, `t_scena`, `t_povrch`, `t_l2`, `t_okna`, `t_hi`; Prettier.
- [ ] Dokumentace: `docs/ZMENY.md` (2.1), `docs/VEROHODNOST.md` (nové míry), `CREDITS.md` + `zdroje/` (NAIF PCK, JPL Horizons, NASA fact sheets,
      NOAA, fotky NASA), číslo verze 2.1 v `dist/index.html` (2×), `README.md`.
- [ ] Soubor na flashku (`--hi`), mřížka snímků a zpráva Ondřejovi (tabulka hotovo × neuděláno, „Zvuk neslyším“).

## Čeká na Ondřeje
- Zkouška 2.0 (a pak 2.1) na jeho zařízeních a souhlas se zveřejněním na webu; sloučení `iterace-25` do `main` jen s jeho „ano“.
- Plán finalizace (`claude/Soustava200_plan_finalizace_2026-11-20.md`, otázky 3–6).
- Artefakt 2.0 s podrobnými mapami by měl ~2 600 souborů (11 dávek) – návrh publikovat bez `maps/l2`.
