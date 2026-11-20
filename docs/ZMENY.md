# Přehled změn podle verzí

Veřejně (větev `main`, stránka, artefakt) je od 20. 11. 2026 verze **2.0 – kandidát k vydání** (`iterace-24`); artefakt je bez dlaždic
úrovně 2. Bod návratu k předchozí veřejné verzi 1.2 je větev `verze-1.2` (`1f96e61`). Soubor na vyzkoušení:
`node tools/build/build_offline.mjs <výstup.html> --hi`.

| Verze | Datum | Větev (poslední commit) | Vychází z |
|---|---|---|---|
| 1.2 | 13. 11. 2026 | `main` = `verze-1.2` = `iterace-13` (`1f96e61`) | — |
| 1.3 | 14. 11. 2026 | `iterace-15` (`3d63b58`) | `main` přes `iterace-14` |
| 1.4, 1.5 | 14.–18. 11. 2026 | `iterace-16` (`1f56f45`) | `iterace-15` |
| 1.6 | 18. 11. 2026 | `iterace-17` (`d991ab9`) | `iterace-16` |
| 1.7, 1.7.1 | 18.–19. 11. 2026 | `iterace-18` (`06f1a52`) | `iterace-17` |
| 1.8a | 19. 11. 2026 | `iterace-19` (`8b21072`) | `iterace-18` |
| 1.8b, 1.8c | 19.–20. 11. 2026 | `iterace-19b` (1.8b `929fe9c`, 1.8c `1f29f68`) | `iterace-19` (boční větev, objekty na obloze) |
| 1.8m | 19.–20. 11. 2026 | `iterace-21` (`b42b4c2`, 3. kolo map) | `iterace-19` (boční větev, podrobné mapy) |
| 1.9 | 19. 11. 2026 | `iterace-20` (`1e06803`) | `iterace-19` |
| 1.10 | 19.–20. 11. 2026 | `iterace-22` (`6b680c7`) | `iterace-20` + sloučené `iterace-19b` (1.8b) a `iterace-21` |
| 2.0 | 20. 11. 2026 | `iterace-23` (`829047a`), zveřejněno z `iterace-24` | `iterace-22` (1.10) + sloučené `iterace-19b` (1.8c) |
| 2.0 + objekty 157 | 20. 11. 2026 | `iterace-23b` | `iterace-24` (boční větev: hvězdy a další objekty na obloze; do veřejné verze jen po Ondřejově rozhodnutí) |

Do verze 1.8a na sebe větve navazují v řadě. Verze 1.8b, 1.8m a 1.9 vznikly souběžně ve třech sešnách z `iterace-19`;
`iterace-22` je slučuje a přidává pohled z povrchu, takže obsahuje vše předchozí.

## Boční větev `iterace-23b`: objekty na obloze 62 → 157, hvězdy, jména bez překryvů (20. 11. 2026)
Vychází z `iterace-23` a má v sobě i zveřejněný stav `iterace-24` (`89bb59b`). **Není součástí veřejné verze 2.0**: v plánu dokončení
je zapsáno rozhodnutí „62 objektů je konečný počet pro 2.0, 150 a hvězdy až po vydání“; tato větev je připravená pro obě možnosti
(přidat ještě do 2.0, nebo vydat po ní). Do `main` se dá sloučit bez konfliktu ve zdrojácích, dokud se tam nezmění `src/ui/obloha.js`,
`src/data/obloha.json` a `tools/data/obloha_build.py`; `dist/app.js` se sestaví znovu.
- **157 objektů** (dosud 62): **43 hvězd** a 52 dalších objektů vzdáleného vesmíru (10 mlhovin, 2 temné mlhoviny, 10 umírajících hvězd
  a pozůstatků, 17 galaxií a kup galaxií, 7 kulových a 6 otevřených hvězdokup). Fotografií 233 (dosud 108), `dist/sky/` 36,6 MB (dosud 26,4 MB).
- **Hvězdy** (nová skupina „Hvězdy“): 21 nejjasnějších hvězd noční oblohy a 22 dalších (Polárka, Mizar a Alkor, Algol, Mira, Albireo, Proxima
  Centauri, Barnardova hvězda, Thuban, Eta Carinae, Beta Pictoris, 51 Pegasi, Delta Cephei, 61 Cygni, Granátová hvězda, Tau Ceti a další).
  Poloha, jasnost a spektrální třída: katalog Hipparcos; vzdálenost se **počítá z paralaxy** (nové zpracování 2007) i s rozmezím podle chyby
  měření; kde je chyba nad 3 %, píše se „asi“, a kde jiný zdroj uvádí jinou hodnotu, je to napsané (Deneb, Alnilam, Betelgeuze, Mira…).
  U čtyř hvězd paralaxa nestačí a vzdálenost je z jiného uvedeného zdroje (Eta Carinae, VY Canis Majoris, R Sculptoris, Granátová hvězda).
  Zajímavosti: úvodní odstavce hesel anglické Wikipedie a stránky snímků ESO a ESA. U 16 hvězd je i snímek z archivu ESO, ESA nebo NASA (u některých kresba nebo snímek okolí, je to v popisku),
  u všech výřez okolí z mapy hvězd NASA SVS (vykresleno z katalogů, není to fotografie – je to napsané v popisku).
- **Jména bez překryvů.** Jméno, které se nevejde těsně ke kroužku, se zkusí na osmi vzdálenějších místech a s kroužkem ho spojí tenká čárka.
  Engine nově zveřejňuje i obdélníky jmen hvězd (`S.skyRects`), takže se jim objekty vyhýbají. Hvězdu, kterou popisuje tlačítko
  „Jména hvězd“, tato vrstva nepopisuje podruhé. V hustých místech (střed Galaxie zdálky) se značka, která by ležela na významnějším
  objektu, nekreslí; pod ukazatelem se objekt ukáže dál. Hvězdy mají vlastní značku (plný kroužek, žlutavé kurzivní jméno).
  Jména se vyhýbají i oknům rozhraní (karta tělesa, seznam, lišty, minimapa; obdélníky oken se čtou nejvýš dvakrát za sekundu),
  takže se o okraj karty neuříznou.
- **Seznam** má hledání (jméno, označení, souhvězdí; bez háčků a čárek) a přilepené nadpisy skupin.
- **Pohled z povrchu (1.10):** natočení na objekt funguje i tam (pozorovatel se otočí, po zavření scény se otočí zpět nebo dál sleduje
  těleso); objekt pod obzorem pohled nemění. Pod denní oblohou a při ukázce úkazu vrstva mlčí.
- **Sestavení dat** (`tools/data/obloha_build.py`): na konci kontroluje, že vzdálenost každého nového objektu je doslova na některé
  z jeho zdrojových stránek (0 nálezů). Mapa hvězd NASA SVS (443 MB) se stahuje do pracovní složky, do repozitáře nejde.
- **Oprava souboru na flashku** (`tools/build/build_offline.mjs`, chyba od 1.8m): vložené soubory měly id „a“ + pořadí v soustavě
  o základu 36, takže soubor s pořadím 785 dostal id `alt` – stejné jako prvek s výškou nad tělesem – a nenačetl se. V plné verzi 2.0
  (355 MB) to je dlaždice Země úrovně 2 `2-4-20`, tady by to byl výřez u Siria. Předpona je nově `_a`. Stránky na webu se chyba netýká.
- **Zkoušky** (sandbox, po jednom): `t_obloha` počítač 51 kontrol a telefon 46, inspekce oken objektů na 18 sestavách (0 nálezů), ukázka,
  `test:fakta`, `test:model`, `t_preload`, `t_povrch` (počítač), `t_scena` (počítač), `t_ukazy` (počítač), `t_karty` – bez chyb.
  Znovu neběžely: `t_hi`, `t_l2`, `t_pasy`, `t_displej` a ostatní sestavy `t_povrch` a `t_scena` (kód, který hlídají, se neměnil).
- **Soubory:** plná verze 370 601 455 B (353,4 MiB, limit 400 MB), bez úrovně 2 map 148 088 257 B; z `file://` bez chyb a bez sítě.
- Nic z toho neběželo na skutečném zařízení; zvuk jsem neslyšela (nové zvuky nejsou).

## 2.0 – kandidát k vydání: všechny souběžné větve v jednom stromu (20. 11. 2026)
Sloučeno: `iterace-22` (1.10 = 1.9 + 1.8b + 1.8m se všemi třemi koly map + pohled z povrchu) a `iterace-19b` po 1.8c (`1f29f68`:
objekty na obloze podruhé – 62 objektů, nenápadné kroužky, bublina, scéna objektu). Konflikty jen v textech: číslo verze
v `dist/index.html`, tabulka v tomto souboru, popis `ui/obloha.js` v `docs/ARCHITEKTURA.md`; `dist/app.js` sestaven znovu.
Zdrojáky (`src/render/engine.js`, `src/ui/obloha.js`) se sloučily samy; hlídka 1.10 „objekt pod obzorem při pohledu z povrchu“
v `obloha.js` přežila přestavbu 1.8c (ověřeno v kódu). Nové funkce v 2.0 nejsou – jen sloučení, číslo verze a regrese.
- **Regrese na sloučeném stromu** (`aed264d`, sandbox Chromium + swiftshader, po jednom): ukázka 3 běhy, `test:fakta` 201 těles,
  `test:model` 120 okamžiků, Prettier (po přeformátování dvou testů), `t_preload`, `t_karty` (pět kliknutí myší přeskočeno – 3,5 snímku/s),
  `t_hi` 11/11, `t_l2` 22 kontrol, `t_obloha` počítač 45 kontrol a telefon, `t_pasy`, `t_scena` 287, `t_povrch` 199, `t_ukazy` počítač,
  `t_displej` – bez chyb. `t_okna`: 5 nálezů v jednom běhu, všechny stejné (notebook 1280, dětské rozhraní: `#mission` přes `#card`),
  opakování na téže sestavě 0 nálezů – nestabilní, příčina neověřená (pravděpodobně délka náhodné hádanky nebo okamžik měření).
- **Soubor na flashku** 339,2 MiB (355 667 582 B, 2 572 souborů, limit 400 MB); v sandboxu připraven za 8,6 s, paměť stránky 604 MB,
  po přiblížení k Měsíci 1 000 MB, 0 požadavků ven, 0 chyb.
- **Zveřejnění 20. 11. 2026** (větev `iterace-24` = `iterace-23` + tato úprava; `main`, stránka, artefakt – se souhlasem autora
  z 20. 11. 01:01): `render/l2.js` pozná kopii webu bez složky `maps/l2` – po třech chybějících dlaždicích bez jediné načtené se úroveň 2
  vypne (`L2.slots = 0`) a přednačítání skončí u první chybějící. Artefakt proto jde bez 2 016 dlaždic (159 MiB) a zblízka ukazuje
  velké mapy; stránka a soubor na flashku mají dlaždice všechny. Sonda: 1 dotaz po startu, 3 u Měsíce, pak žádný; `t_l2` 22 kontrol,
  `t_hi` 11/11, `t_povrch` (počítač) 49 kontrol bez chyb.

## 1.10 – sloučení tří větví a pohled z povrchu tělesa
Sloučeno: 1.9 (mizející dráhy, scéna úkazu), 1.8b (19 objektů na obloze) a 1.8m (podrobné mapy úrovně 2). Konflikty jen ve třech
čekaných souborech (`dist/app.js` – znovu sestaven, číslo verze v `dist/index.html`, tabulka v tomto souboru); zdrojáky se sloučily samy.
Větev map se během práce posunula (2. kolo: pyramida dlaždic 8k/16k/32k, `55150f4`); sloučena podruhé téhož večera, konflikt jen
v `dist/app.js` a v `docs/VYDANI.md`. Soubor na vyzkoušení tím vzrostl ze 194 MiB na zhruba 300 MiB
(samotný stupeň 32k Země a Měsíce má 68 MiB). Limit velikosti souboru je od 19. 11. 2026 večer 400 MB (dřív 250).
Třetí kolo map (`b42b4c2`: reliéf Měsíce z LOLA jako pokus, polární záře podle WMM2025) sloučeno 20. 11. po půlnoci, konflikt jen v `dist/app.js`.
- **Pohled z povrchu** (`ui/povrch.js`, `render/engine.js`; vzor: „Telescope mode“ v NASA Eyes): tlačítko „🔭 Z povrchu“ v kartě tělesa
  a v ☰ postaví pozorovatele na místo, nad kterým kamera právě stojí (u Země i tlačítko „📍 Praha“). Tahem se rozhlíží, kolečkem nebo
  dvěma prsty se mění zorné pole od 75° po 0,25° (dalekohled). Lišta `#surf` ukazuje zeměpisnou polohu, směr pohledu (světová strana,
  výška nad obzorem), výšku Slunce, zorné pole a nabídku „Najít na obloze…“ (těleso se pak sleduje, i když běží čas). Esc nebo
  „⬆ Vzlétnout“ vrátí kameru na oběžnou dráhu přímo nad místo. Funguje v obou rozhraních a na všech tělesech kromě Slunce.
- **Co je skutečné a co zjednodušené:** směry a výšky těles nad obzorem, jejich úhlové velikosti, fáze a denní pohyb oblohy počítá
  model (kontrola: Slunce z Prahy 20. 11. 2026 v 11:02 UT je 20,1° vysoko těsně za jihem – shoda s výpočtem z deklinace). Zjednodušení:
  zem je rovina v barvě tělesa bez terénu, obzor je ideální (bez hor a bez lomu světla ve vzduchu, ten u obzoru zvedá tělesa asi o 0,5°),
  barva denní oblohy Země a Marsu je ilustrace (přechod podle výšky Slunce, bez výpočtu rozptylu). Venuše, Titan a plynní obři dostanou
  upozornění, že skutečný výhled tam takový není (mraky, opar, žádný pevný povrch). Na tělesech bez vzduchu jsou hvězdy vidět i ve dne;
  oko oslněné povrchem by jich vidělo méně.
- **Vzduch:** přepínač „🌫 Vzduch“ (Země, Mars) zapíná denní oblohu – se vzduchem přes den hvězdy ustoupí, bez něj je obloha černá.
  Denní obloha je vrstva `#skyair` mezi 3D plátnem a 2D vrstvou (`mix-blend-mode: screen`), síla v `S.skyDim`.
- **Obzor:** tělesa, objekty na obloze, supernovy a odlesk objektivu pod obzorem se nekreslí a nejdou vybrat. Drobná tělesa (planetky,
  komety, sondy) nemají na obloze jméno, dokud nejsou vybraná nebo nejsou zapnutá všechna jména; trpasličí planety až při poli pod 20°.
- **Zatmění „Z místa“** (`ui/udalosti.js`): čtvrtý pohled u zatmění Slunce a Měsíce postaví pozorovatele do místa z karty a sleduje
  Slunce (pole 3,4°) nebo Měsíc (2,8°); táhlo času ukáže průběh. Při úplném zatmění obloha ztmavne a vyjde koróna. Model má pás
  úplného zatmění posunutý až o desítky km, proto se pozorovatel posune tak, aby pohled odpovídal katalogu NASA; o kolik, píše legenda
  („stojí pozorovatel v modelu o 55 km vedle“). Lištu pohledu z povrchu tu nahrazuje karta úkazu.
- **Engine:** `S.surf` (místo, směr, zorné pole, sledované těleso, posun středu), `S.setSurf`, `S.subPoint`, `S.surfDir`,
  `S.surfBasis`, `S.fov`; proměnné zorné pole kamery (`setFov`), těleso pod nohama se nekreslí, dráhy jsou schované;
  událost sběrnice `surf`. Odlet (`flyTo`, `jump`) pohled z povrchu ukončí.
- Test `tools/test/t_povrch.mjs` (počítač, telefon na výšku i na šířku, tablet; 199 kontrol).

## 1.9 – mizející dráhy a úkaz jako samostatná scéna (inspirace: NASA Eyes on the Solar System)
Podklad: 54 snímků NASA Eyes a 58 snímků verze 1.7.1 od autora (19. 11. 2026). Limit velikosti souboru nově 250 MB (dřív 100); verze 1.9
velikost nemění.
- **Mizející dráhy** (`render/engine.js`, `core/sim.js`): dráha je stopa – nejjasnější těsně za tělesem, proti směru pohybu slábne
  a těsně před tělesem je nejslabší. Směr oběhu je tak vidět i při zastaveném čase. `orbitSamples(…, ph)` vrací ke každému vzorku „stáří
  stopy“ 0–1, čára má průhlednost po vrcholech (`vertexColors`, atribut `color` se čtyřmi složkami). Dlouhé a otevřené dráhy (komety)
  slábnou 60 let do minulosti. Platí pro planety, měsíce i malá tělesa, v obou rozhraních. Přepínač ☰ → „Dráhy: stopa / celá čára“
  (`S.orbFade`, pamatuje se v `s200of`).
- **Úkaz jako scéna** (`ui/udalosti.js`): výběr ze seznamu úkaz rovnou ukáže (dřív bylo potřeba ještě „Ukázat“). Po dobu ukázky nese
  `<body>` třídu `uksh` a engine množinu `S.evSet`: ustoupí karta tělesa, hádanka, přepínač filtru Slunce, pásy planetek, sondy, orientační
  šipky a jména těles, která k úkazu nepatří; zúčastněná tělesa mají kroužek a zvýrazněné jméno. Sbalení karty do proužku vrátí běžnou scénu.
- **Časová osa úkazu:** táhlo přes celé okno úkazu se značkou vrcholu, čas ve světovém čase (UT) a údaj „12 min před vrcholem“;
  ▶ přehrává od začátku nebo od táhla, druhý stisk zastaví, ◉ skočí na vrchol.
- **Zatmění Slunce:** pásma částečného zatmění 0 / 25 / 50 / 75 % (podíl průměru Slunce zakrytý Měsícem) jako stopa válce kolem osy stínu
  na zeměkouli (u obzoru se protahují, kde válec Zemi míjí, vede obrys po hranici dne a noci), pás úplného zatmění ve skutečné šířce podle
  poloměru stínu z katalogu NASA, popisek „100 % · stín Měsíce“.
- **Pohledy na zatmění** (vzor „Select your view“): Slunce – nad místem, zpoza Měsíce (Měsíc v popředí, Země za ním, kužel stínu),
  Země a Měsíc shora ve skutečném poměru (kužel plného stínu, vějíř polostínu, šipka ke Slunci); Měsíc – od Země (kružnice plného stínu
  a polostínu Země ve vzdálenosti Měsíce) a Země a Měsíc shora.
- **Rámování:** scéna úkazu se skládá do volné plochy vedle karty (na telefonu a na tabletu na výšku odshora dolů nad kartou či vedle ní).
  `setCam`, `setCamOver`, `aimDir` dopočítají polohu kamery a pootočení pohledu tak, aby zadaný směr vyšel na zadané místo obrazu
  (kamera nezná náklon kolem osy pohledu). Průlet Apophisu už nemíří pod dolní lištu; u blízkých průletů je vzdálenost napsaná na spojnici.
- **Seznam úkazů:** nahoře „Nejbližší úkaz“ podle dnešního data.
- **Ukázka ovládání:** kapitola o drahách vysvětluje stopu; kapitola o úkazech u zatmění přepne i na pohled zpoza Měsíce.
- Test `tools/test/t_scena.mjs` (počítač, telefon na výšku i na šířku, tablet; 287 kontrol).

## 1.8c – objekty na obloze podruhé: nenápadné kroužky, scéna objektu, 62 objektů
Limit velikosti souboru nově 400 MB. Cílový počet objektů podle zadání je asi 150 (včetně výrazných hvězd); tato verze jich má 62.
Přestavba podle připomínek k 1.8b („velká karta vypadá jako vložená wikipedie“, „ať to neruší“, „málo objektů“).
- **Nenápadně.** Tři režimy v seznamu: Vypnuto · Nenápadně (výchozí) · Stále vidět. V nenápadném režimu se po startu nic nekreslí;
  objekt se prozradí, až na něj najede ukazatel (zlatavý kroužek a jméno, funguje i v kině). Slabé přerušované kroužky se jmény se
  ukážou spolu se souhvězdími; při prvním zapnutí souhvězdí jednou krátké vysvětlení. Jméno si hledá místo kolem kroužku (pod, nad,
  vpravo, vlevo) tak, aby nepřekrylo jiné jméno objektu, tělesa, hvězdy ani souhvězdí; když místo není, zůstane jen kroužek a jméno
  se ukáže pod ukazatelem. K tomu engine nově zveřejňuje obdélníky už nakreslených jmen (`S.labRects`, `S.skyRects`; dva řádky
  v `engine.js`). Objekty, které na naší fotce vidět nejsou, mají jen malý kroužek bez jména.
- **Klik = bublina** se jménem, druhem a vzdáleností přímo u objektu a tlačítkem „Přiblížit“. Okno „malá karta“ zaniklo.
- **Dvojklik (nebo „Přiblížit“, nebo klik v seznamu) = scéna objektu.** Hlavní rozhraní ustoupí, obloha ztmavne, kroužek se rozroste
  do fotografie: uvnitř je nejdřív zvětšený (tedy rozostřený) výřez z naší fotky natočený podle skutečné polohy, který se prolne do
  snímku z velkého dalekohledu – „zaostření“. Teprve pak přijdou texty: druh a souhvězdí, jméno, jedna věta, dlaždice (vzdálenost,
  velikost na obloze, jasnost, souhvězdí) a tři záložky: *Co to je* · *Kde to je* (celá obloha s vyznačeným místem, výřez z naší fotky,
  viditelnost z Česka spočítaná z polohy, logaritmická stupnice vzdáleností) · *Zdroje*. Pod fotografií popisek s autorem a pás náhledů;
  klik na fotografii ji roztáhne přes celou plochu. Šipky listují mezi objekty, Esc zavře. Zavřením se fotografie vrátí do kroužku,
  rozhraní se objeví tak, jak bylo, a pohled se vrátí tam, kde byl před natočením na oblohu. Okna „velká karta“ a „zvětšená fotografie“
  zanikla; scéna není okno, ale režim (třída `ds-stage` na `<body>`).
- **62 objektů** (dřív 19), 108 fotografií, 26,4 MB v `dist/sky/` (i s náhledy a výřezy). Přibylo 11 galaxií (M 33, M 81, M 82, M 51,
  Sombrero, M 87 se snímkem stínu černé díry, Centaurus A, M 83, NGC 253, Tykadla, Stephanův kvintet), 12 zářících mlhovin (Tarantule,
  Trifid, Omega, Plamen, Běžící kuře, Kočičí tlapka, Humr, Kreveta, Kužel, Racek, Bublina, Thorova přilba), temná mlhovina Dýmka,
  nová skupina „Umírající hvězdy a jejich pozůstatky“ (Krabí, Řasová, Prstencová, Činka, Helix, Kočičí oko, Motýlí), 6 kulových
  a 6 otevřených hvězdokup. U každého objektu údaj `vid`: 2 = na naší fotce dobře vidět (20 objektů), 1 = slabě (17), 0 = není vidět (25);
  scéna to říká otevřeně („kroužek ukazuje místo, kde leží“).
- **Zdroje:** vzdálenost a údaje v textu nových objektů jsou ze stránek použitých snímků (pole „Distance“ a popis snímku v archivech
  ESO, ESA/Hubble, ESA/Webb); kde se zdroje liší, karta uvádí oba údaje. Odstavce „kde je na obloze“ psané z hlavy zmizely: viditelnost
  z Česka a měsíc večerní viditelnosti se teď počítají z polohy objektu a jsou tak označené.
- **Vyřazeno pro chybějící zdroj vzdálenosti:** Kolo od vozu, Webbovo první hluboké pole, Jižní prstencová mlhovina, pozůstatek
  supernovy v Plachtách, Hubbleovo ultrahluboké pole, M 24. Nenašla jsem použitelný snímek: Kalifornie, Srdce, Čarodějnická hlava,
  Kosatec, IC 1396, Jesličky, M 6.
- **Kód:** `src/ui/obloha.js` přepsán (stále soběstačný). Zkouška `t_obloha.mjs` přepsána (na počítači i na telefonu, včetně otevření
  všech 62 objektů ze dvou míst), v `t_okna.mjs` nová trojice stavů (seznam, bublina, scéna) a proměnná `OKNA=obl_` pro měření jen
  vybraných oken.
- **Neověřeno:** animace přiblížení jsem viděla jen na zastavených snímcích; dvojí ťuknutí na dotyku emulace nestihne (zkouší se
  cesta přes tlačítko „Přiblížit“); u M 87 a Stephanova kvintetu je údaj o vzdálenosti jen v textu stránky, ne v poli „Distance“.

## 1.8b – objekty na obloze (mlhoviny, hvězdokupy, galaxie)
Limit velikosti souboru nově 250 MB včetně grafiky. Jen dospělé rozhraní (`obloha` v `src/core/flags.js`).
- **Co to je:** fotka Mléčné dráhy za planetami ukazuje i objekty daleko za Sluneční soustavou. Nová vrstva pojmenuje 19 z nich –
  jen ty, které jsou na naší fotce (2048 × 1024 bodů) opravdu vidět: Velké a Malé Magellanovo mračno, galaxie v Andromedě, mlhoviny
  v Orionu, Carina, Laguna, Orlí, Severní Amerika, Rozeta, mračna u ρ Ophiuchi, Koňská hlava, Uhelný pytel, střed Galaxie,
  Omega Centauri, 47 Tucanae, Plejády, Dvojitá hvězdokupa v Perseu, M 7 a M 11.
- **Ovládání:** ☰ → „Objekty na obloze“ otevře seznam a zapne jména a kroužky na obloze (po startu jsou vypnuté, aby obloha nebyla
  přeplácaná). Klik na jméno nebo kroužek = malá karta, dvojklik = velká karta. V seznamu klik = karta a pohled na objekt.
  „Ukázat na obloze“ natočí pohled tak, aby objekt nebyl za tělesem ani pod kartou (na telefonu přijde nad kartu), „Zpět k tělesu“
  vrátí původní pohled. Kroužek má skutečnou úhlovou velikost objektu (nejméně 8 bodů).
- **Velká karta** („něco jako Wikipedie objektu“): nahoře výřez z naší oblohy s kroužkem a hlavní fotografie, pod nimi tabulka údajů
  (druh, vzdálenost, souhvězdí, poloha, velikost na obloze, jasnost) s odkazem na zdroj u každého čísla, tři krátké odstavce (co to je,
  co je na fotkách, kde je na obloze), další fotografie a seznam zdrojů. Klik na fotografii ji zvětší. Odkazy se otevírají v novém
  okně; aplikace sama z internetu nic nenačítá.
- **Data:** 40 fotografií (ESO, ESA/Hubble, ESA/Webb – CC BY 4.0; jeden snímek NASA/JPL – volné užití s uvedením autora), zmenšené na nejvýš 1280 bodů, WebP, 11,2 MB
  v `dist/sky/`. Poloha, velikost a jasnost z katalogu OpenNGC, vzdálenosti a zajímavosti z tiskových zpráv a popisů snímků
  (u každého objektu vyjmenováno). Vše staví `python3 -I tools/data/obloha_build.py`; původ a licence: `zdroje/OBLOHA.md`.
- **Poctivě:** naše fotka oblohy má 0,18° na bod, takže výřez „na naší obloze“ je hrubý – ukazuje, kde objekt je, ne jak vypadá.
  U čtyř objektů (M 16, Dvojitá hvězdokupa, M 7, M 11) karta neuvádí úhlovou velikost, protože údaj OpenNGC se výrazně liší od jiných
  katalogů a druhý zdroj jsem neověřila. U Velkého Magellanova mračna na telefonu je pohled po „Ukázat na obloze“ vzhůru nohama
  (objekt leží 5° od jižního pólu ekliptiky a má přijít nad kartu; jinak to geometrie kamery nedovolí).
- **Kód:** celé v `src/ui/obloha.js` (styly, okna, položku nabídky i odstavec nápovědy si modul vkládá sám), data `src/data/obloha.json`.
  Mimo modul jen: `ui.js` (+2 řádky: `api.pops`, `api.actions`), `main.js` (+3), `flags.js` (+1), `build_offline.mjs` (+1),
  `dist/index.html` (jen číslo verze na dvou místech). Test `tools/test/t_obloha.mjs` (počítač a telefon), tři nová okna v `t_okna.mjs`.
- **Sloučení s větví 1.9:** nové soubory kolidovat nemohou. Čekaný konflikt: číslo verze v `dist/index.html` (dva řádky – vzít „1.9“),
  tabulka nahoře v tomto souboru a `dist/app.js` (výstup sestavení: nevybírat ručně, po sloučení zdrojáků pustit `./build.sh`).
  Kdyby větev 1.9 měnila seznam `POPS` nebo objekt `api` v `ui.js`, stačí zachovat řádky `pops: POPS` a `actions: act`.
- **Zkouška sloučení (19. 11. 2026 večer, jen místně, nic se neposlalo):** `iterace-19b` + `iterace-20` (verze 1.9, `1e06803`) v oddělené
  pracovní kopii – konflikty přesně ve třech čekaných souborech (`dist/index.html` 2 řádky s číslem verze, tabulka v tomto souboru,
  `dist/app.js`); zdrojáky se sloučily samy. Po `./build.sh` na sloučeném stromu prošly `t_obloha` (počítač, telefon), `t_scena`
  (287 kontrol), `t_ukazy desk` a `t_okna` (notebook 1366, iPhone na šířku). S `iterace-21` (mapy úrovně 2, `4f019b2`) zkoušeno jen
  `git merge-tree`: tytéž tři soubory. Při otevřené kartě úkazu se jména objektů na obloze nekreslí (ukázka úkazu má scénu pro sebe).

## 1.8m – podrobné mapy zblízka (úroveň 2) a strategie načítání
Samostatná linie „grafika povrchů“ vedle 1.9 (dráhy a úkazy na `iterace-20`); limit souboru 250 MB, od 2. kola 300 MB, od 3. kola 400 MB
(celkem po sloučení všech větví).
- **Úroveň 2 map** (`src/render/l2.js`, `src/data/l2.json`, `dist/maps/l2/<id>/`): dlaždice 1024 px z primárních mozaik 16 384 px (Země,
  Měsíc, Mars, Merkur, Pluto) a 8 192 px (Venuše, Europa, Ganymed, Callisto, Vesta, Enceladus, Dione, Iapetus) – 13 těles, 1 120 dlaždic,
  71 MB. Načítají se jen pro těleso v ohnisku a jen ty, na které se díváš (13 × 9 paprsků z kamery; dlaždice je potřeba, kde by se úroveň 1
  roztahovala). V grafice jeden atlas: 8 míst (32 MB) v běžné třídě, 16 (64 MB) ve výkonné, nic v úsporné a na telefonu. Shader úroveň 2
  prolne jen tam, kde se zvětšuje (texel ≥ pixel), takže bez zmenšenin nevzniká zrnění; nová dlaždice se prolne za 0,3 s.
- **Výroba** (`tools/maps/l2_resize.mjs`, `tools/maps/make_l2.py`): přenos detailu na stávající velkou mapu – barvy zůstávají, přibývá jen
  kresba; zmenšená úroveň 2 dává zpět úroveň 1, při doostření nic neblikne. Podrobnosti a zdroje v `zdroje/MAPY.md`.
- **Mars:** nová kresba z Viking MDIM 2.1 (232 m); přepsána i velká mapa 4096 px – výrazně ostřejší i na střední vzdálenost.
- **Ostřejší úroveň 1** (2048 → 4096 px): Dione, Iapetus, Rhea, Tethys, Triton.
- **Načítání předem:** běžná třída zařízení připraví na úvodu podrobně Zemi, Měsíc a Mars (dřív Zemi a Měsíc), výkonná k nim Jupiter a Saturn.
  Webová verze si 20 s po startu v klidu (nelétá se, neběží ukázka) stáhne do mezipaměti dlaždice Země, Měsíce a Marsu; nic se nerozbaluje.
- **Země zblízka:** mraky (jen 2048 px) se nad podrobnou pevninou ztenčí o polovinu.
- **Nápověda:** jeden odstavec o doostření zblízka.
- **Test** `tools/test/t_l2.mjs`: zdálky nic, zblízka dlaždice, telefon nic, snímky před/po, chyby stránky.
- **2. kolo (po Ondřejově zkoušce na notebooku 19. 11. večer):**
  - **Pyramida dlaždic** 8k → 16k → 32k (`maps/l2/<id>/<z>-<řádek>-<sloupec>.webp`, `l2.json` = nejjemnější stupeň): stupeň 8k navazuje
    na úroveň 1 a odstranil rozmazané pásmo mezi úrovní 1 a 16k (Měsíc z 2 000 km, Merkur z 3 400 km, Mars). Shader prolíná stupně
    od hrubého k jemnému; chybí-li jemná dlaždice, ukáže se hrubší. Atlas 12 míst (50 MB) v běžné třídě, 24 (101 MB) ve výkonné.
    Index 32 × 28 (všechny stupně nad sebou). Předem se ve webové verzi stahují stupně 8k a 16k (32k až podle potřeby).
  - **Země 32k** z Blue Marble NG 500 m (8 dlaždic 21 600²) a **Měsíc 32k**: barva SVS 16k, nejjemnější kresba z LROC WAC 100 m
    (krátery menší než asi 1 km se stínem; γ 0,6; barvy SVS sladěné s velkou mapou). Úroveň 2 celkem 159 MB (dřív 71).
  - Výběr dlaždic počítá se zúžením texelu k pólům (shader je tam ukáže až zblízka) – u pólů už nezabírají místa v atlasu zbytečně.
  - **Noční světla Země** 8192 × 4096 (Black Marble 2016, jeden kanál R8) místo 2048 px – načítají se s velkou mapou Země.
  - Nástroje: `tools/maps/l2_tiles.py` (stupně, převod starých názvů), `make_l2.py` píše pyramidu (`L2_L1`, `L2_Q2`).
  - Test `t_l2.mjs`: stupně v `S.l2.state().lv`, pohled `…:noc` pro noční světla, snímky `<id>_<n>_L1|L2.jpg`.
  - Soubor na flashku s `--hi`: 298,2 MiB (312,7 MB, 2 293 souborů); v sandboxu připraven za 4,8 s, paměť stránky 637 MB,
    po přiblížení k Měsíci 815 MB, 0 požadavků ven, 0 chyb.
  - Test ukázky `tut.mjs`: první běh čeká, až úvod zmizí a ukázka běží (start s přednačtením trvá v sandboxu asi 4 s; padal i na `9fe1848`).
- **3. kolo (19. 11. 2026 v noci):**
  - **Reliéf Měsíce (pokus):** sklony terénu z výškové mapy LOLA 128 px/° (`maps/hi/moon_relief.webp`, 5760 × 2880 ×2, 5,4 MiB),
    načítají se s velkou mapou Měsíce; shader podle nich nakloní normálu – u terminátoru krátery a pohoří podle skutečného Slunce.
    Doplňkové mapy k velké mapě obecně (`EXTRA` v `engine.js`: světla Země, reliéf Měsíce).
  - **Polární záře Země** se středem v geomagnetickém pólu podle WMM2025 (80,79° s. š., 72,76° z. d.; dřív 80,6° s. š., 107° z. d.).
  - Test `t_l2.mjs`: pohled `id:výška:term` (Slunce nízko), z výšky nad 1 R se dlaždice nečekají (velká mapa se ještě neroztahuje).
  - Soubor na flashku 305,4 MiB (320,2 MB, 2 294 souborů); v sandboxu paměť stránky 653 MB, po přiblížení k Měsíci 964 MB, 0 chyb.
- Soubor na flashku s `--hi` obsahuje i úroveň 2 (180 MB; `--bez-l2` ji vynechá). Data jsou nově v neaktivních prvcích
  `<script type="text/x-s200">` a `window.S200_ASSETS` je Proxy (src/core/asset.js beze změny): po otevření v sandboxu 503 MB paměti
  stránky místo 618 MB se starým způsobem (1.8a s 81 MB: 406 MB), halda JavaScriptu 30 MB místo 381 MB. Starý způsob: `--json`.

## 1.8a – zobrazení na všech zařízeních, delší ukázka, pásy planetek
Limit velikosti souboru nově 100 MB (dřív 110).
- **Inspekce oken** (`tools/test/t_okna.mjs`): 18 sestav (notebooky 1366–1920 px, zvětšení systému 125–300 %, monitor QHD a 4K, malé okno,
  iPhone SE a 14 na výšku i na šířku, Android, iPad, iPad Pro, tablet Android) × dospělé a dětské rozhraní × 11 oken. Měří okna mimo obrazovku,
  uříznutý obsah, velikost a dostupnost zavíracích tlačítek, překryvy (kromě záměrných: okna uprostřed a nabídka leží nad vším)
  a visící okna. Výsledek posledního běhu je v projektovém dokumentu k verzi.
- **Visící okna:** každý přelet (událost `fly` na sběrnici) a tah do vesmíru zavře okna, která zakrývají pohled (nápověda, porovnání,
  Stroj času, seznam úkazů, album, nabídka ☰; na telefonu i seznam těles a deník). Karta úkazu se při přeletu a na Esc sbalí do proužku.
- **Okna mimo obrazovku:** výšky oken se počítají z `var(--vh)` (na telefonu `100dvh`) a dělí měřítkem rozhraní `var(--bk)` – seznam úkazů
  a nabídka ☰ už na velkém monitoru a na iPadu nepřetečou pod dolní okraj.
- **Překryvy:** seznam těles končí nad minimapou a nad lištou měsíců; seznam úkazů a Stroj času končí nad minimapou; deník zúží lištu těles
  místo toho, aby ji zakryl; v okně do 900 px se hádanka a údaj o výšce schovají pod otevřeným oknem vlevo; na tabletu na výšku karta úkazu
  schová kartu tělesa.
- **Dotyk:** zavírací tlačítka 40 bodů (dřív 22–27); okna na telefonu jsou neprůhledná a nic pod nimi neprosvítá; iPhone a iPad už nedovolí
  zvětšit celou stránku dvěma prsty na okně (`gesturestart`, `touch-action: pan-x pan-y`).
- **Telefon na výšku:** tlačítko rozhraní bez popisku, údaj o výšce se nepere s lištou nástrojů, oznámení je pod hádankou.
- **Telefon na šířku:** měsíce a tělesa v jedné řadě (víc místa pro vesmír), karta úkazu vlevo na celou výšku, úvodní obrazovka se vejde.
- **Prohlížeč bez WebGL 2:** místo černé obrazovky srozumitelná zpráva.
- **Ukázka ovládání** (`src/ui/tutorial.js`): asi 2 minuty, 14 kroků. Každá kapitola si sama připraví pohled: zrychlení času se dívá na planetu
  s měsíci z odstupu, přisvětlení na noční stranu Měsíce nebo Merkuru, dráhy a pásy na celou soustavu shora; filtry Slunce se na konci vrátí
  na bílé světlo. Pokročilé kapitoly (Superkarta, přehrání úkazu, porovnání velikostí, „Kde jsem?“, kino, hledání) se střídají: jedna
  v právě zapnutém rozhraní, jedna v druhém. `S200.ui.tut.start([kapitoly])` vynutí plán pro testy.
- **Pásy malých těles** (`src/render/belts.js`): hlavní pás planetek (2 600 teček, Kirkwoodovy mezery) a Kuiperův pás (1 900 teček: klasický
  pás, plutina, rozptýlený disk). Ilustrace: vidět jen v přehledu soustavy, zblízka se vytratí, nejdou vybrat, jeden popisek na pás,
  vysvětlení při prvním spatření, vypínač v nabídce ☰. Test `tools/test/t_pasy.mjs`.
- **Ikona** aplikace převzatá z autorova projektu Kosmická výprava (`dist/icon.svg`, `dist/icon-180.png` pro plochu telefonu).
- `npm test` má tři běhy (náhodný plán, všechny pokročilé kapitoly, dětské rozhraní) a hlídá, že ukázka doběhne a uklidí po sobě.
- Poznámka: iPhone a iPad neumějí spustit místní soubor HTML s JavaScriptem – na zařízeních Apple běží aplikace jen z webové adresy.

## 1.7 – televize a rozšířená plocha
- Telefonní a tabletové rozložení dostane jen zařízení s dotykem a bez myši (`src/ui/mobile.js`). Počítač ho sám nedostane;
  okno menší než 1100 × 560 bodů má zmenšené počítačové rozhraní (`--bk` 0,5–1).
- Strop počtu vykreslovaných bodů podle kvality 0–2: 1,7 / 2,6 / 4,4 Mpx (`PX_BUD` v `src/render/engine.js`).
- Kvalita se po výrazné změně okna vrací na nejvyšší a umí se sama zvednout (nejdřív 40 s po snížení, nejvýš třikrát).
- Prahy pro podrobnou mapu a pro povrch Venuše se řídí i výškou okna; po obnovení grafického kontextu se podrobné mapy zase povolí.
- Hlídač změny velikosti okna a zvětšení systému (každých 0,7 s) pro přetahování mezi monitory.
- Podrobné mapy smí i tablet a dotyková tabule, pokud zařízení není v úsporné třídě (`S.hiTab`).
- Zvuk prostředí tělesa do 35 s úplně utichne a přiblížení ho znovu nespustí; Venuše bez pilového tónu.
- Test `tools/test/t_displej.mjs`.
- 1.7.1: mobilní prohlížeč je telefon vždy (i když hlásí pero jako jemný ukazatel); výška karty se ve zvětšeném i zmenšeném rozhraní počítá s měřítkem, takže dlouhá karta na 4K nezajede pod dolní lištu.

## 1.6 – připomínky z notebooku (13 bodů)
- Úvod: volba rozhraní se použije až při startu, úvod má vždy dospělý vzhled; tlačítko celé obrazovky.
- Dospělé rozhraní: otáčení bez omezení i přes pól; při průchodu přesně nad nebo pod soustavou probliknou dráhy planet (`S.poleFx`, pokus).
- Dětské rozhraní: v liště všechny měsíce se skutečnou mapou, kružnice od tělesa při každém příletu, vrácené kino, bez Stroje času.
- Karta Slunce: poznámka, že Slunce je bílé a proč je ze Země žluté.
- Superkarta se zavře kliknutím mimo ni a při výběru jiného tělesa; karta úkazu se sbalí po 2 minutách nebo při kliknutí na těleso.
- Položka „Rozložení: … (auto / ručně) · změnit“ místo „Zobrazení“; nová ikona (tmavý Saturn na světlém poli).

## 1.5 – pohodlí na velkém displeji
- Karta tělesa: plná výška i v zobrazení tablet na širokém okně, řádek Blíž / Dál stále vidět, ikona s prstenci nezakrývá název.
- Okna vlevo nepřekrývají proužek s úkolem; album neprůhledné; šipky orientačních bodů pod horní lištou.
- Souhvězdí: stupeň 2 (čáry bez jmen) má tenčí a slabší čáru.
- Velká obrazovka se zvětšením v systému se zvětšuje jen mírně.

## 1.4 – uzavírání
- Registr funkcí `src/core/flags.js` a přepínač `?dev` (viz `README.md`).
- Úkazy na obloze jen v dospělém rozhraní; zatmění Slunce (10 karet) podle Besselových elementů NASA; ověřené historky; karta Kirchovy komety vyřazena.
- Superkarta tělesa (pětiklik na název, ikonu v liště nebo těleso; jen dospělé rozhraní).
- Chytré načítání: třídy zařízení (`src/core/device.js`, `?trida=usporna|bezna|bohata`), konzole na úvodu, podrobné mapy předem jen když to zařízení stihne.
- Podrobná mapa Země (NASA Blue Marble Next Generation, `tools/maps/make_earth.py`).
- Hudba: delší pauzy, útlum při dlouhém běhu. Dětské rozhraní: méně drah, popisků a nástrojů.

## 1.3 – úkazy a přednačtení
Kalibrovaný model −1000 až 3000, souhvězdí ve třech stupních, 32 karet úkazů, supernovy, úvod s lištou a přednačtením,
pět stupňů drah. Podrobnosti: `docs/VEROHODNOST.md`, `docs/UDALOSTI_KANDIDATI.md`.

## Neověřeno na skutečných zařízeních (stav 19. 11. 2026)
Verze 1.5–1.7 viděl autor jen na notebooku Dell Inspiron 15 (1.4, 1.5) a na Lenovu s televizí (1.6). Oprava pro televizi (1.7)
je ověřená jen v emulaci. Zvuk se ladí naslepo podle popisu.
