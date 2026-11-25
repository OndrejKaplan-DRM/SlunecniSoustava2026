# TODO – co se právě dělá

Aktualizuje se na konci každého kroku a před koncem sešny. Starší historie verzí: `docs/ZMENY.md`. Důvody rozhodnutí: `DECISIONS.md`.

## Iterace 27 → verze 2.3 (větev `iterace-27` z `iterace-26`, 25. 11. 2026 v noci)
Zadání Ondřeje (25. 11. 02:24 a 02:31): 1/ úvod pod sebou („Spustit“, „Celá obrazovka“, Ukázka ovládání); 2/ Přiblížit / Oddálit /
Přistát v jedné řadě, dvojklik daleko = přiblížit, blízko = přistát v místě dvojkliku, křížek = přesné místo kliknutím, kolečkem
k povrchu = přistání, kolečkem ven = odlet; po přistání zajímavosti (přednost má to nejzajímavější, v záloze teplota, tlak,
složení, tíže, úniková rychlost); Olympus Mons s vyvýšeným obzorem; Velká rudá skvrna; hvězdy a souhvězdí nesmí prosvítat
terénem; Venuše – při přistání vidět kus povrchu; 3/ chůze po povrchu jako Quake 3 (tíže, rychlost chůze, kolize s kameny,
poryvy, klouzání, vrávorání, otřesy, vibrace), levné stíny, plynulé „sklouznutí“ do pohledu z očí, cíl 120 snímků/s na Lenovu
T460; 4/ nad pólem se dráhy na okamžik spojí v celé elipsy a zazáří; 5/ „věnečky“ = prstence: vysvětlit (dětem #ELI10), karta,
Superkarta, aby šly zacílit; 6/ oblaka obrů v pohybu (rychlost a směr větru, turbulence, barva, odlesk, vlnění) levným trikem.

### Hotovo
- [x] 1 – úvod v jednom sloupci: 🚀 Spustit (Enter), ▶ Ukázka ovládání (U), ⛶ Celá obrazovka; text bez lámání do „schodů“.
- [x] 2 – řada karty Přiblížit · Oddálit · 🛬 Přistát (stavy 🎯 Letím… / ✅ Přistát sem / 🛬 Přistávám… / 🚀 Vzlétnout);
      dvojklik: daleko přiblíží, blízko (výška ≤ 1,25 R) přistane v místě dvojkliku; křížek sleduje myš, klik = přistání přesně
      tam (dřív jen střed); kolečkem k povrchu = přistání pod kurzorem (dřív nejdřív křížek); kolečko ven = vzlet (beze změny).
- [x] 2 – panel „co je tu jinak“ po přistání (`data/zajimavosti.js`): tři nejzajímavější věci podle místa a okamžiku (není
      povrch, modrý západ na Marsu, Slunce jen jako hvězda, planeta na obloze, Země z Měsíce, měsíce nad obzorem, polární
      záře, Olympus…) a řádek teplota · tlak · plyny · tíže · únik; větry z NSSDCA. Zmizí po 18 s.
- [x] 2 – Olympus Mons: místo „vrchol (21,2 km)“ a „okraj kaldery“, terén až k obzoru (do 700 km), opar podle výšky, obloha
      z výšky místa, tmavší strmé svahy; Velká rudá skvrna jako místo na Jupiteru (−22°, −94°).
- [x] 2 – hvězdy, jména a souhvězdí za terénem se nekreslí (`S.under`, profil obzoru `horizonEl`); Venuše: pohled po přistání
      2° nad obzor (vidět kus povrchu).
- [x] 3 – chůze (`ui/chuze.js`): W A S D / šipky, Shift běh, mezerník skok; myš se zamkne klikem až po prvním kroku (pravé
      tlačítko skok, levé podržet 0,7 s = vzlet, Esc myš uvolní). Tíže tělesa (šouravý krok, klokaní poskoky), led (setrvačnost),
      svah nad 35° (led 18°) klouže, kameny jako válce (na nízký se vystoupí), poryvy podle hustoty vzduchu s náklonem, otřesy
      na Io, chvění při běhu, houpání hlavy, dosed po skoku; skok rychlejší než úniková rychlost = odlet (Bennu).
- [x] 3 – terén kolem chodce: po 35 m se mřížka postaví znovu kolem něj po kouscích (≤ 2 ms za snímek, celkem ~0,27 s práce
      v sandboxu), kameny kolem chodce v buňkách ukotvených v místě (do 40 m, okraj se zmenší do ztracena); levné stíny
      (mapa stínů jen při pohybu Slunce nebo chodce o 8 m).
- [x] 3 – sestup 3,4 s: kamera začne nad místem (0,8 % poloměru, nejvýš 25 km) s pohledem dolů, klesá a na konci zvedne pohled
      k obzoru; přechod z oběžné dráhy zakryje krátký závoj v barvě vzduchu (bez vzduchu tma).
- [x] 4 – nad pólem se dráhy na okamžik spojí v celé elipsy a zazáří (`uFull`), pak zase hlava a mizející ocas.
- [x] 5 – prstence (`data/prstence.js`): popisek „💍 prstence“ u prstenců na plátně (klik = vysvětlení), řádek v kartě s „co to je?“,
      dětská dlaždice, Superkarta; řídké prachové prstence nezakrývají hvězdy.
- [x] 6 – oblaka obrů v pohybu (shader terénu): kupy nesené větrem podle šířky, dvě fáze prolínání, zkroucení a drobné víry,
      vlnění výšek, reliéf do stínování, bělejší vršky, dopředný rozptyl proti Slunci.
- [x] Zkouška `t_23` (15 kontrol), `t_krajina` podle nového chování kolečka.

### Regrese 2.3 (25. 11. 2026, po jednom)
- [x] `tut`, `test:fakta`, `test:model`, `test:vernost`, `test:sceny`, `t_krajina` (49), `t_povrch` (203; mez pohledu dolů je nově −86°,
      sledované těleso pod obzorem dál nejvýš −20°), `t_preload`, `t_karty`, `t_pasy`, `t_obloha`, `t_scena` (287), `t_l2` (12),
      `t_okna` (0 nálezů), `t_23` (16), `t_hi` (11/11) bez chyb.
- [ ] `t_displej` – dál jen dřívější `tv_400: podrobná mapa mercury se nenačetla` (stejně jako v `main`).

### Neuděláno / zbývá
- [ ] 120 snímků/s na Lenovu T460 v sandboxu ověřit nejde (softwarové kreslení 3–18 snímků/s). Změřeno: přestavba terénu ≤ 2 ms
      za snímek (nejdelší kousek ~10 ms před zjemněním, po zjemnění neměřeno na zařízení), kameny kolem chodce 0,5 ms.
- [ ] Chůze na telefonu a tabletu (jen rozhlížení tahem) – neuděláno, nebylo výslovně v zadání.
- [ ] Stromy na Zemi jen kolem místa přistání (chodec od nich odejde).
- [ ] „Feel“ (síla poryvů, houpání, otřesy) a výška skoku – doladit v poslední iteraci (tabulka `FEEL` v `ui/chuze.js`).
- [ ] Zvuky kroku a skoku nejsou (volání `A.play('step')` se tiše ignoruje); zvuk v sandboxu neslyším.
- [ ] Směr větrů podle šířky (pásy) a vítr na Titanu – z paměti, neověřeno.

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
- [x] 4 – oblačná vrstva obrů výrazně plošší (sklon do ~8° místo přes 60°), ale ne plochá: ojedinělé konvektivní věže až 40 km
      vysoké a široké s bílými vršky a stínem (Juno PIA21647: věže asi 50 × 50 km vrhají stín). Pohled z 1,5 km nad vrstvou.
- [x] 5 – zkouška `t_krajina` 50 kontrol (stavy tlačítek včetně sestupu, kolečko dovnitř a ven, přisvětlení a jeho vrácení, Grónsko v noci,
      Pluto), `pristani_snimky.mjs` (5 snímků toku přistání), `krajina_snimky.mjs` (+ Grónsko v noci, s přisvětlením, Měsíc ráno, věže na Jupiteru).

- [x] Mezistavy tlačítka: během letu nad těleso „🎯 Letím…“, během sestupu „🛬 Přistávám…“ (neaktivní; klik na liště nic nepřeruší).
- [x] Hádanka nahoře se nepřekrývá s kartou ani při úzkém okně (šířka nejvýš okno − 760 px; `t_okna` našel u televize 4K se
      zvětšením 300 % překryv 26 px při dlouhé hádce – hádanka se vybírá náhodně, chyba byla skrytá i dřív).

### Regrese 2.2b (24.–25. 11. 2026, po jednom)
- [x] `tut`, `test:fakta`, `test:model`, `test:vernost`, `test:sceny`, `t_krajina` (50/50), `t_povrch` (203/203), `t_preload`, `t_karty`,
      `t_pasy`, `t_obloha`, `t_scena` (287), `t_l2` (12), `t_hi` (11/11) bez chyb; `t_okna` po opravě hádanky 0 nálezů
      (tv4k300, nb1280, nb1366, okno900 znovu).
- [ ] `t_displej` – dál jen dřívější `tv_400: podrobná mapa mercury se nenačetla` (stejně jako v `main`).

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
