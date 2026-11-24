# TODO – co se právě dělá

Aktualizuje se na konci každého kroku a před koncem sešny. Starší historie verzí: `docs/ZMENY.md`. Důvody rozhodnutí: `DECISIONS.md`.

## Verze 2.2b (stejná větev `iterace-26`, 24. 11. 2026 pozdě večer)
Připomínky Ondřeje k 2.2 (22:36): „docela dobré, jen doladit technické detaily“.
1. Ikona přistát / vzlétnout po přechodu kolečkem pořád nabízí „Vzlétnout“ – opravit, kolečko nezablokovat, ale dát mu smysl (zoom).
2. Přistání v noci (Grónsko) černočerné, bez obzoru, posuvník přisvětlení nereaguje; Pluto naopak „prosluněné, světlo zapečené
   do povrchu“ proti tmavé obloze. Chce zvláštní mírné noční osvětlení (jako když si oči zvyknou), vidět obzor, ledový a bílý
   povrch má v noci odrážet světlo, přisvětlení má fungovat; po vzletu vše vrátit, jak bylo.
3. Ikony „přistát“ a „vzlétnout“ lépe prodat („taháky, tohle si bude chtít vyzkoušet každý“).
4. Oblačná vrstva obrů o něco méně vertikálně členitá – podle skutečnosti (zamyslet se).
5. Udělat si snímky a otestovat stavové funkce ikon.

### Hotovo
- [x] 1 – stav tlačítka se mění se skutečným stavem (karta, ☰, lišta): 🛬 Přistát na povrchu → ✅ Přistát sem (míření) → 🚀 Vzlétnout
      (na povrchu); i po vzletu kolečkem. Kolečko u povrchu tělesa (na nejbližší vzdálenosti, 3 kroky do 1,5 s) zapne zaměřovací
      křížek, další 3 kroky přistanou; kolečko ven na povrchu = vzlet (beze změny). Události `surfPick`, `zoomIn`.
- [x] 2 – noční vidění (`render/krajina.js`): pod úrovní osvětlení asi jako úplněk se přidá slabé namodralé světlo (adaptace oka),
      barvy se ztlumí; sníh a led v noci září víc než tmavá půda, obzor je vidět, hvězdy zůstanou. Přisvětlení ☀ na povrchu funguje
      (expozice ×1 až ×3,2) a po vzletu se vrátí původní hodnota. Pluto: expozice podle logaritmu osvětlení je strmější
      (poledne na Plutu asi 26 % jasu pozemského poledne, dřív 44 %), albedo nejvýš 0,9, led bez stínování „regolitu“.
- [x] Stíny terénu na terénu (hory a hrany kráterů vrhají stín, i kameny ve stínu jsou tmavé); regolit bez vzduchu stínovaný podle
      Lommela a Seeligera (Měsíc vypadá jako na fotkách z Apolla: světlý i při nízkém Slunci, bez tmavnutí k okraji).
- [x] 3 – tlačítko „🛬 Přistát na povrchu“ hned pod popisem v kartě přes celou šířku (zlaté), na liště nahoře vedle Hledat,
      v ☰; míření zeleně pulzuje; na povrchu modré „🚀 Vzlétnout“. Sestup s ukazatelem výšky a zvukem brzdění, vzlet se zvukem startu.
- [x] 4 – oblačná vrstva obrů výrazně plošší (sklon do ~8° místo přes 60°), ale ne plochá: ojedinělé konvektivní věže až 45 km
      vysoké a široké s bílými vršky a stínem (Juno PIA21647: věže asi 50 × 50 km vrhají stín). Pohled z 1,5 km nad vrstvou.
- [x] 5 – zkouška `t_krajina` 49 kontrol (stavy tlačítek, kolečko dovnitř a ven, přisvětlení a jeho vrácení, Grónsko v noci,
      Pluto), `pristani_snimky.mjs` (5 snímků toku přistání), `krajina_snimky.mjs` (+ Grónsko v noci, s přisvětlením, Měsíc ráno, věže na Jupiteru).

### Neuděláno / zbývá
- [ ] Zvuk startu a brzdění v sandboxu neslyším – ověřit na zařízení.
- [ ] Vyvýšená oblaka Neptunu (pruhy metanového ledu nad hlubší vrstvou, Voyager 2) a bouře Saturnu – jen odhad tvarů.
- [ ] Stín věží obrů jen do 70 km (pochod paprskem); při Slunci nízko nad obzorem by byl delší.

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

### Regrese 24. 11. 2026 večer (po jednom, větev `iterace-26`)
- [x] `tut` (bez chyb), `test:fakta`, `test:model`, `test:vernost` (996 případů), `test:sceny`, `t_krajina` (34/34), `t_povrch` (203/203),
      `t_preload`, `t_karty`, `t_pasy`, `t_obloha`, `t_scena` (287), `t_l2` (12), `t_okna` (0 nálezů), `t_hi` (11/11) – bez chyb.
- [ ] `t_displej` – jen `tv_400: podrobná mapa mercury se nenačetla`, stejně jako v `main` a 2.1 (emulace televize 4×).
- [x] Soubor na flashku `SlunecniSoustava200_v2_2_iterace26.html` (`--hi`): 374 433 150 B = 357,1 MiB, 2 921 souborů; z `file://`
      bez cizích požadavků a chyb, výšková mapa Marsu i posun z moře fungují.

### Zbývá / nápady
- [ ] Oblačné moře obřích planet vypadá spíš jako sněhové kopce (Jupiter: velká kupa před pozorovatelem) – víc tvarů, stínů a barev pásů.
- [ ] Při nízké kvalitě vykreslování (pomalé zařízení) se krajina staví řidší (méně kamenů a stromů) – stejně jako na telefonu.
- [ ] Textury půdy z fotek sond (zatím procedurální zrnitost); detailní textura pro Zemi (tráva) a Mars (štěrk).
- [ ] Stíny terénu na terénu ve větší vzdálenosti (teď stíny jen kamenů do 110 m; svahy odvrácené od Slunce jsou tmavé, ale
      hora nevrhá dlouhý stín přes pláň) – na terminátoru Měsíce by to bylo vidět.
- [ ] Mars při západu: modrá záře je, ale obloha dál od Slunce vychází světlejší a žlutější než na PIA19400.
- [ ] Země bez výškové mapy (hory jsou vymyšlené); případně ETOPO po výřezech kolem známých míst.
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
