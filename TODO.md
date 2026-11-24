# TODO – co se právě dělá

Aktualizuje se na konci každého kroku a před koncem sešny. Starší historie verzí: `docs/ZMENY.md`. Důvody rozhodnutí: `DECISIONS.md`.

## Iterace 26 → verze 2.2 (větev `iterace-26` z `iterace-25`, od 24. 11. 2026 večer)
Připomínky Ondřeje k 2.1 (24. 11. 19:26, se snímky Merkuru z `file://`): „docela dobré, ale ne dokonalé; pohledy z těles jsou
nemastné-neslané“. Zadání:
1. **Mřížka na povrchu tělesa se nesmí zapínat sama** (naběhla zapnutá – stav se pamatoval v prohlížeči). V ukázce ji klidně ukázat.
2. **Tlačítko „🔭 Z povrchu“ v kartě nic nedělá** (funguje jen z ☰). Po kliknutí: na kouli zaměřovací křížek, uživatel vybere místo,
   při tom zapnout mřížku. Poznat, kdy chce uživatel zpátky do vesmíru (nezdržovat, nenechat hledat, jak vzlétnout).
   Po dosednutí uklidit okna, ať je jasné, že už není v kosmu.
3. **Umělý horizont z povrchu – realistický**, ne „slepý povrch koule“: pro každé těleso předpřipravený povrch, který dává smysl
   (ne uprostřed oceánu, ne skály všude, na Venuši skoro nic vidět, žádný les na Marsu, v plynném obrovi žádná kamenná krajina),
   využít mapy těles z repa, smí se stáhnout až ~15 MB další grafiky (snímky povrchu ze sond uložit do repa se zdroji),
   předpřipravená atmosféra (je/není, jak tlustá, jak rozptyluje), obloha (barva, den/noc, soumrak, lom, jak prosvítají hvězdy
   a měsíce, Slunce), polohy těles (Slunce osvětluje horizont / horní vrstvy atmosféry, hvězdy, měsíce). „Skutečně dotažené
   a plně realistické.“ Info uložit do repa, provést testy poloh.

### Hotovo (commitnuté na `iterace-26`)
- [x] 1 – mřížka se nepamatuje, zapne se jen při výběru místa (`ui/povrch_info.js`).
- [x] 2 – tlačítko v kartě, zaměřovací křížek a přistání (`ui/pristani.js`), úklid oken po přistání, vzlet kolečkem ven.
- [x] 3 – krajina a obloha (`render/krajina.js`, `render/teren.js`, `render/atmo.js`, `data/krajiny.js`), výškové mapy Měsíce
      a Marsu (`tools/data/dem_build.py`, `dist/maps/dem`, 2,7 MB), Země podle mapy (moře → pevnina), Venuše a Titan pod oblaky.
- [x] Snímky sond `zdroje/povrchy/` (10, 2,2 MB), dokument `docs/KRAJINA.md`, CREDITS, DECISIONS, ARCHITECTURE, ZMENY, verze 2.2.
- [x] Zkoušky `t_krajina` (34 kontrol), `krajina_snimky` (19 pohledů), `t_povrch` upravený na nový tok přistání.

### Zbývá / nápady
- [ ] Textury půdy z fotek sond (zatím procedurální zrnitost); detailní textura pro Zemi (tráva) a Mars (štěrk).
- [ ] Stíny terénu na terénu ve větší vzdálenosti (teď stíny jen kamenů do 110 m; svahy odvrácené od Slunce jsou tmavé, ale
      hora nevrhá dlouhý stín přes pláň) – na terminátoru Měsíce by to bylo vidět.
- [ ] Mars při západu: modrá záře je, ale obloha dál od Slunce vychází světlejší a žlutější než na PIA19400.
- [ ] Země bez výškové mapy (hory jsou vymyšlené); případně ETOPO po výřezech kolem známých míst.
- [ ] Oblačné moře obřích planet vypadá spíš jako sněhové duny – víc tvarů kup a stínů.
- [ ] Výkon na slabém telefonu ověřit na zařízení (krajina: řidší mřížka, bez stínů na `mob`).

Plán (Kristína): (a) chyby 1–2 a tok přistání; (b) obloha jako výpočet rozptylu světla v atmosféře (Rayleigh + Mie, stín tělesa
v soumraku, extinkce Slunce a hvězd) s parametry každého tělesa; (c) krajina jako 3D terén kolem pozorovatele osvětlený skutečným
Sluncem: skutečný reliéf z DEM, kde je k dispozici (Měsíc LOLA, Mars MOLA, příp. Země), jinde procedurální podle typu povrchu;
kameny, mlha, oblačné moře u obrů, zatažená Venuše a Titan; (d) detailní textury z fotek sond (NASA, volná díla) se zdroji;
(e) testy poloh, regrese, snímky proti fotkám z povrchu, dokumentace.

## Iterace 25 → verze 2.1 (větev `iterace-25`, od 24. 11. 2026)
Zadání Ondřeje (24. 11.): 1) atmosféry a složení, 2) srovnání velikostí i Slunce × Země, 3) pásy planetek příliš výrazné?,
4) pohled z povrchu libovolného tělesa (body a–h) + zkouška na 500–1000 náhodných případech + kalibrace + referenční snímky.

### Hotovo (commitnuté na `iterace-25`)
- [x] Úkol 1 – atmosféry a složení (`src/data/slozeni.js`): dětská karta krátce, dospělá víc, Superkarta nejvíc (plyny v %, tlak,
      teplota, kůra, plášť, jádro, zdroje); Země: vzácné plyny 0,94 % (argon 0,934 %), CO₂ 429 ppm a graf 1959–2025 (NOAA).
- [x] Úkol 2 – srovnání: čipy dvojic, dvojice ve skutečném poměru s posuvníkem (`ui/porovnani.js`); původní řada zůstala.
- [x] Úkol 3 – pásy: změřeno, tři stupně, výchozí „nenápadně“ (`render/belts.js`).
- [x] Úkol 4a–h – panel „📋 Obloha odsud“ (`ui/povrch_info.js`, `data/mista.js`) včetně vodítek a mřížky na povrchu tělesa;
      dětská verze panelu; panel stojí vedle lišty.
- [x] Kalibrace: rotace IAU 2015 (`rot.json`), Měsíc (`mesic.json`, 26″ → 1,8″), 74 měsíců (medián 0,034°), 71 planetek a TNO
      (Ceres a Vesta ze Země 54′ → 5,8′), Phobos se slapovým zrychlením; dráhy planet beze změny.
- [x] Zkouška 996 náhodných případů (`npm run test:vernost`, meze 2× naměřené) a referenční scény (`npm run test:sceny`).
- [x] Referenční listy model × fotka NASA (`docs/ref/`, `docs/REFERENCNI_SNIMKY.md`): 11 scén, 6 fotek.
- [x] Soumrak na Marsu delší (do −24°) podle snímků Spirit a Curiosity.
- [x] Jádro Merkuru sjednoceno na 83 % (MESSENGER).
- [x] Verze 2.1 (zkušební) v `dist/index.html`, README, CREDITS (zdroje 2.1); `docs/ZMENY.md`, `docs/VEROHODNOST.md`.
- [x] Paměť projektu v repu: `CLAUDE.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `TODO.md`.

### Regrese 24. 11. 2026 (po jednom, větev `iterace-25`)
- [x] `tut` (10/10, obě rozhraní), `t_preload`, `t_karty` (32 karet úkazů, 201 Superkaret), `t_pasy`, `t_scena` (287 kontrol),
      `t_povrch` (199 kontrol), `t_l2`, `t_hi` (11/11), `test:fakta`, `test:model`, `test:vernost`, `test:sceny` – bez chyb.
- [x] `t_obloha` – po úpravě testu bez chyb: test čekal natočení k prvnímu objektu nad obzorem, s rotací Měsíce podle IAU 2015
      ale padl přímo do záběru (Omega Centauri), kde se podle návrhu neotáčí; test teď bere objekt mimo záběr.
- [x] `t_okna` – 5 nálezů „#mission × #card“ jen u nb1280/děti v prvním běhu; opakovaný běh 0 nálezů v nové i původní verzi
      (šířka hádanky se mění).
- [ ] `t_displej` – `tv_400: podrobná mapa mercury se nenačetla` – **stejně padá i `main`** (`7a0831c`); emulace televize se 4× hustotou
      v sandboxu, ne změna 2.1. Ověřit na skutečné televizi.

- [x] Soubor na flashku `SlunecniSoustava200_v2_1_iterace25.html` (`--hi`): 370 768 588 B = 353,6 MiB, 2 917 souborů; z `file://`
      bez cizích požadavků a bez chyb (24. 11. 2026). Mřížka snímků a zpráva Ondřejovi odeslány.

### Zbývá / nápady na další iteraci
- [ ] Pozorovatel na Ceres a Vestě: rozdíl rotace proti Horizons (~0,02–0,06°/rok) – zjistit, který model Horizons používá.
- [ ] Planetky: periodické poruchy od Jupiteru (zbývá ~0,1–0,5° heliocentricky u hlavního pásu); blízkozemní planetky
      po úsecích mezi průlety; Davida a Themis.
- [ ] Nepravidelné měsíce (Neso, Pasiphae, Psamathe, Themisto) a Hyperion – model se slunečními poruchami.
- [ ] Silueta Phobosu na Slunci je v modelu hnědá (přes ni se kreslí denní obloha), na fotce černá – zvážit pořadí vrstev.
- [ ] Obloha za soumraku je všude stejná (neví o směru ke Slunci) – ranní a večerní záře jen jako ilustrace.
- [ ] Telefon a tablet: snímky panelu „Obloha odsud“ (`mobshot.mjs`), nápověda k panelu.

## Čeká na Ondřeje
- Zkouška 2.1 (soubor na flashku) a 2.0 na jeho zařízeních; souhlas se zveřejněním; sloučení `iterace-25` do `main` jen s jeho „ano“.
- Plán finalizace (`claude/Soustava200_plan_finalizace_2026-11-20.md`, otázky 3–6).
- Artefakt 2.0 s podrobnými mapami by měl ~2 600 souborů (11 dávek) – návrh publikovat bez `maps/l2`.
