# Věrohodnost modelu

## Stav 24. 11. 2026 – verze 2.1 (větev `iterace-25`): pohled z povrchu a kalibrace proti JPL Horizons

**Reference.** JPL Horizons API (DE441, modely satelitů JPL, malá tělesa JPL) – nezávislá efemerida NASA/JPL. Porovnávají se
zdánlivé směry (doba letu světla + aberace) z místa na povrchu, bez lomu světla; testy používají stejné ΔT jako Horizons.
Rozdíl ΔT se měří zvlášť: v letech 1700–2030 medián 2,8 s (nejvýš 8,3 s); mimo ně je to odhad budoucí/minulé rotace Země
(Horizons po roce 2027 drží 69 s, aplikace extrapoluje parabolou) – tam rozhoduje o poloze pozorovatele na Zemi, ne o drahách.

**Co se změnilo (24. 11. 2026):**
| Část | Dřív | Teď | Jak |
|---|---|---|---|
| Natočení těles | konstanty a lineární členy, čas UT; pól Marsu o 1,6°, Tritonu o desítky °, Idy o 84° vedle | IAU WGCCRE 2015 včetně periodických členů, čas TT; Země s nutací | `src/data/rot.json` z NAIF `pck00011.tpc` |
| Měsíc (geocentricky, 1900–2100) | medián 24″, nejhůř 2′ | medián 1,4″, nejhůř 7,5″ (1000–3000: medián 1,8″, nejhůř 18″) | 208 doplňkových členů, `src/data/mesic.json` |
| Dráhy 74 měsíců planet (úhel v soustavě planety, 1900–2100) | medián ~96° (malé měsíce prakticky náhodně), Io 6,3°, Phobos 17° | medián 0,034°; Io 0,01°, Phobos 0,03°, Triton 0,01° | fit na Horizons, `tools/model/vernost/fit_mesice.py` |
| 71 planetek a TNO (heliocentricky) | medián 2,9° (Ceres 4,9°) | medián ~0,2° u hlavního pásu, ~0,005° u TNO (Ceres 0,2°) | stáčení uzlu a perihelu, `fit_planetky.py` |
| Úkazy ze snímků sond na Marsu | Phobos 15°, Deimos 9° vedle; úkazy by nenastaly | přechod Phobosu −5 s, Deimosu −10 s, zákryt Deimosu Phobosem 0 s | `tools/test/t_ref_sceny.mjs` |
| Zatmění 8. 4. 2024, Dallas | maximum o 125 s dřív | o 10 s dřív | zlepšený Měsíc |

**996 náhodných případů** (těleso, místo, okamžik 1800–2200, u Země −1000 až 3000; `npm run test:vernost`), zdánlivé směry:

| Skupina (pozorovatel → cíl) | Případů | Medián | 95 % | Nejhůř |
|---|---|---|---|---|
| Země → Slunce | 71 | 3,6″ | 13,2″ | 15,8″ |
| Země → planeta | 43 | 2,5″ | 16,8″ | 41,4″ |
| Země → Měsíc | 93 | 2,1″ | 1,18′ | 1,70′ (rok −982: rozdíl DE422 × DE441) |
| Země → cizí měsíc | 37 | 2,4″ | 12,1″ | 1,42′ |
| Země → Pluto | 3 | 2,7″ | 7,1″ | 7,1″ |
| Země → Ceres, Vesta | 12 | 5,2′ | 16,4′ | 46,8′ |
| planeta → Slunce | 56 | 4,2″ | 17,2″ | 30,8″ |
| planeta → planeta | 68 | 2,4″ | 29,1″ | 49,2″ |
| planeta → vlastní měsíc | 103 | 1,59′ | 7,19′ | 34,2′ |
| měsíc → Slunce | 104 | 3,0″ | 37,3″ | 2,35′ |
| měsíc → planeta | 96 | 4,5″ | 22,4″ | 2,83′ |
| měsíc → mateřské těleso | 94 | 26,3″ | 7,04′ | 23,2′ |
| měsíc → sousední měsíc | 109 | 2,43′ | 19,8′ | 1,23° |
| Pluto → cokoli | 27 | 0,1–7,6″ | do 17,8″ | 17,8″ |
| Ceres, Vesta (pozorovatel) → cokoli | 48 | 2,2° | 4,5–6,3° | 6,33° |
| **celkem** | **996** | **7,0″** | **17,5′** | **6,33°** |

Do 1′ je 725 případů, do 0,1° 906, do 1° 959. Velké chyby u měsíců jsou z povrchu planety zvětšené blízkostí (chyba 0,03°
na dráze Phobosu je z povrchu Marsu asi 5′).

**Známé meze 2.1:**
- **Pozorovatel na Ceres a Vestě:** chyba roste lineárně od roku ~2012 (Ceres ~0,02°/rok, Vesta ~0,06°/rok). Polohy těles jsou
  v pořádku; liší se natočení místa – aplikace používá rotaci IAU 2015 (pck00011), Horizons zřejmě jiný (novější?) model.
  Moje hypotéza, neověřeno (Horizons udává jen zaokrouhlenou periodu 5,342128 h a 9,07417 h).
- **Nepravidelné vzdálené měsíce** (Neso 11°, Pasiphae 5,7°, Psamathe 4,4°, Themisto 2,8°) a chaotický **Hyperion** (1,4°):
  silné poruchy od Slunce, jednoduchý model dráhy s opravami je nepostihne. Všechny jsou slabší než 15 mag.
- **Blízkozemní planetky** (Apophis, Ryugu, Itokawa, Duende, Cruithne, Icarus) a **komety**: dráhy se mění při průletech
  a negravitačními silami; zůstává oskulační dráha k jednomu datu (přesná kolem něj, průlet Apophisu 2029 na 0,7 min).
  Davida a Themis také beze změny (nový fit by zhoršil roky 2000–2050).
- **Mimo okno fitu 1900–2100** pokračují opravy drah měsíců po tečně (bez kvadratického členu); Phobos svým skutečným slapovým
  zrychlením (1,26·10⁻³ °/rok²). Nejhorší Phobos: rok 1805 asi 34′.
- **Lom světla** se jen vypisuje (u výšky nad obzorem na Zemi), obzor je matematický; obloha a soumrak jsou ilustrace
  (na Marsu podle snímků Spirit a Curiosity slábne až do výšky Slunce −24°).

Porovnání se skutečnými snímky: `docs/REFERENCNI_SNIMKY.md`.

---

Stav 13. 11. 2026 (větev `iterace-14`, příprava verze 1.3). Odpovídá na otázku: **odkud kam se dá modelu věřit a jak přesně.**

## Závěr
- Polohy planet, Pluta a Měsíce jsou ověřené proti efemeridě **JPL DE422** pro roky **−1000 až 3000** (4 000 let).
- Při pohledu ze Země je střední odchylka v každém století nejvýš **36″** u planet a Pluta a **62″** u Měsíce
  (průměr Měsíce na obloze je asi 1 870″, kotouček Jupiteru 30–50″).
- Zatmění Slunce z let 1919, 1999 a 2026 vycházejí do 1 minuty a osa stínu dopadá na Zemi do zhruba 3° od hodnot, které si pamatuji z tabulek NASA (ověřit v pramenech);
  konjunkce Jupiteru se Saturnem z let 7 př. n. l., 1226 a 1623 vycházejí na 0,1′ (před úpravou byly vedle o 1° až 15°).
- Mimo roky −1000 až 3000 model počítá dál, ale neověřeně; aplikace na to jednou krátce upozorní a nic neomezuje.

## Co model počítá
| Část | Kde | Podklad |
|---|---|---|
| Planety a Pluto v letech 1900–2050 | `ephem.js` → `jplCorrPos` | fit na JPL DE421 (beze změny od verze 1.0) |
| Planety a Pluto jinde | `ephem.js` → `longPos` | nová dlouhodobá teorie: fit na JPL DE422, −1000 až 3000 |
| Přechod mezi oběma | `longWeight` | plynule během 20 let vně okna (1880–1900, 2050–2070) |
| Měsíc | `sim.js` → `moonGeo` | zkrácená řada podle Meeuse (24 členů délky, 13 šířky, 23 vzdálenosti), nově s členy T² až T⁴ a přesnou precesí |
| Čas | `sim.js` → `deltaT`, `ttOf` | aplikace ukazuje světový čas; dráhy běží v čase efemerid (ΔT podle Espenaka a Meeuse) |
| Natočení Země | `sim.js` → `earthBasis` | osa a jarní bod data (precese), hvězdný čas ze světového času |

Dlouhodobá teorie: elementy drah jako polynomy 2. stupně, dlouhoperiodické kmitání střední délky, velké poloosy, výstřednosti
a délky perihelu (velká nerovnost Jupiter–Saturn s periodou kolem 900 let a podobné), a k tomu 680 periodických členů s argumenty
složenými ze středních délek a perihelů dvojic planet. Země je v ní těžiště Země–Měsíc; výkyv Země kolem něj se dopočítá z Měsíce.
V katalogu zabírá 57 kB, výpočet jednoho snímku zdržuje o 0,02 ms.

## Odchylky po staletích
Střední kvadratická odchylka směru při pohledu ze Země v úhlových vteřinách (Země: směr od Slunce; Měsíc: směr od Země),
240 náhodných okamžiků v každém století. Měří `tools/model/verohodnost.py`.

| Století | Merkur | Venuše | Země | Mars | Jupiter | Saturn | Uran | Neptun | Pluto | Měsíc |
|---|---|---|---|---|---|---|---|---|---|---|
| −1000 až -900 | 2,6 | 3,1 | 2,4 | 17 | 21 | 17 | 11 | 3,4 | 3,2 | 59 |
| −600 až -500 | 2,0 | 4,3 | 1,8 | 7,0 | 25 | 13 | 11 | 3,9 | 1,6 | 57 |
| −300 až -200 | 3,9 | 6,3 | 3,7 | 6,6 | 10 | 8,8 | 16 | 2,6 | 1,9 | 50 |
| 0 až 100 | 2,2 | 3,7 | 2,0 | 4,0 | 21 | 12 | 17 | 3,2 | 1,7 | 46 |
| 300 až 400 | 2,0 | 3,2 | 1,8 | 3,5 | 16 | 20 | 14 | 5,9 | 1,1 | 38 |
| 600 až 700 | 2,2 | 3,7 | 2,0 | 3,7 | 19 | 14 | 20 | 7,6 | 1,3 | 35 |
| 900 až 1000 | 2,0 | 3,5 | 1,9 | 2,3 | 14 | 14 | 13 | 3,1 | 1,6 | 31 |
| 1200 až 1300 | 1,7 | 3,2 | 1,6 | 4,8 | 18 | 26 | 13 | 4,0 | 2,4 | 31 |
| 1500 až 1600 | 2,6 | 3,8 | 2,4 | 3,8 | 16 | 14 | 6,0 | 6,1 | 2,1 | 32 |
| 1700 až 1800 | 3,0 | 3,9 | 2,9 | 3,3 | 11 | 17 | 14 | 5,3 | 2,3 | 32 |
| 1800 až 1900 | 3,4 | 6,2 | 3,5 | 7,8 | 11 | 34 | 21 | 4,6 | 6,0 | 33 |
| 1900 až 2000 | 7,1 | 9,5 | 6,5 | 14 | 2,2 | 0,8 | 0,4 | 0,3 | 0,2 | 33 |
| 2000 až 2100 | 5,1 | 8,6 | 4,8 | 11 | 23 | 36 | 16 | 3,3 | 2,3 | 31 |
| 2100 až 2200 | 1,3 | 2,6 | 1,1 | 6,5 | 9,7 | 25 | 7,7 | 2,3 | 2,2 | 31 |
| 2400 až 2500 | 1,9 | 3,2 | 1,7 | 3,7 | 25 | 9,6 | 15 | 4,2 | 3,0 | 31 |
| 2700 až 2800 | 1,2 | 2,5 | 1,0 | 8,8 | 14 | 8,3 | 7,7 | 3,3 | 2,5 | 34 |
| 2900 až 3000 | 1,9 | 4,0 | 1,8 | 11 | 29 | 11 | 7,5 | 2,0 | 2,0 | 34 |
| nejhorší století | 7,1 | 9,5 | 6,5 | 17 | 29 | 36 | 22 | 7,6 | 6,0 | 62 |
| největší jednotlivá odchylka | 20 | 45 | 16 | 115 | 82 | 135 | 68 | 19 | 26 | 162 |

Pro srovnání stav před úpravou (verze 1.2), stejné měření:

| Století | Merkur | Venuše | Země | Mars | Jupiter | Saturn | Uran | Neptun | Pluto | Měsíc |
|---|---|---|---|---|---|---|---|---|---|---|
| −1000 až −900 | 175 | 298 | 154 | 323 | 22 157 | 56 545 | 6 844 | 5 376 | 44 716 | 6 759 |
| 0 až 100 | 103 | 190 | 98 | 238 | 14 342 | 36 843 | 6 338 | 4 532 | 15 776 | 2 856 |
| 1000 až 1100 | 39 | 65 | 35 | 42 | 7 381 | 18 622 | 1 896 | 1 267 | 2 888 | 750 |
| 1600 až 1700 | 16 | 25 | 14 | 33 | 2 154 | 5 250 | 397 | 150 | 551 | 151 |
| 1900 až 2000 | 7,1 | 9,5 | 6,5 | 14 | 2,2 | 0,8 | 0,4 | 0,3 | 0,2 | 39 |
| 2900 až 3000 | 56 | 102 | 54 | 271 | 7 299 | 17 337 | 3 615 | 2 420 | 6 229 | 725 |

(3 600″ = 1°. Saturn byl v roce −1000 vedle o 15°, Pluto o 12°.)

## Známé úkazy
Sonda `tools/test/probe_udalosti.mjs` (pohled ze středu Země). Referenční hodnoty jsou zatím z paměti, ne z tabulek – před
použitím v kartách událostí je potřeba ověřit je v pramenech.

| Úkaz | Model | Reference | Před úpravou |
|---|---|---|---|
| Jupiter–Saturn, 7 př. n. l. | 63,3′ | 63′ | 896′ |
| Jupiter–Saturn, 1226 | 2,2′ | 2,1′ | 190′ |
| Jupiter–Saturn, 1623 | 5,2′ | 5,2′ | 73′ |
| Jupiter–Saturn, 2020 | 6,10′ | 6,12′ | 6,10′ |
| přechod Venuše 1639 | 8,76′ | 8,73′ | 8,72′ |
| přechod Venuše 1769 | 10,18′ | 10,15′ | 10,02′ |
| Venuše zakryla Jupiter, 1818 | 0,19′ | 0,24′ | 0,14′ |
| zatmění Slunce 585 př. n. l. (Thalés) | 14:20 UT, osa 38,2° s. š., 44,5° z. d. | 14:22 UT, 38,2° s. š., 46,2° z. d. | čas vedle o 3,7 h |
| zatmění Slunce 1919 | 13:09 UT, 3,7° s. š., 16,9° z. d. | 13:08 UT, 4,4° s. š., 16,7° z. d. | – |
| zatmění Slunce 1999 | 11:04 UT, 44,4° s. š., 24,0° v. d. | 11:03 UT, 45,1° s. š., 24,3° v. d. | – |
| zatmění Slunce 2026 | 17:46 UT, 65,7° s. š., 21,9° z. d. | 17:46 UT, 65,2° s. š., 25,2° z. d. | – |

## Meze a co ověřeno není
- **ΔT před rokem 1600** je odhad z historických záznamů; nejistota je kolem roku −500 asi ±7 minut (±2° zeměpisné délky stínu),
  před rokem −700 a po roce 2100 jde o extrapolaci. Na polohy těles na obloze to vliv nemá, jen na to, které místo Země je k nim natočené.
- **Měsíc** má zkrácenou řadu: 30″ až 60″ znamená u zatmění Slunce posun pásu totality o desítky až 150 km.
- **Mars, Jupiter, Saturn, Uran** mají mimo okno 1900–2050 jednotlivé odchylky až kolem 2′ (největší naměřená: Saturn 135″, Mars 115″).
- **Komety a planetky** mají pevné elementy dráhy: věrohodné jsou jen roky až desítky let kolem své epochy (Halleyova kometa
  se do minulých návratů takto netrefí). Pro karty událostí s kometami bude potřeba zvláštní sada elementů pro každý návrat.
- **Měsíce planet** mají fit na okno kolem současnosti; jejich polohy na dráze ve vzdálené minulosti ověřené nejsou.
- Kalendář: aplikace před rokem 1582 ukazuje datum v gregoriánském kalendáři protaženém zpět, prameny uvádějí juliánský
  (28. května 585 př. n. l. juliánsky = 22. května gregoriánsky). Vyřeší se u seznamu událostí.
- Rok 0 v astronomickém počítání je 1 př. n. l.; popisek data to nově respektuje.

## Jak měření zopakovat
```
pip download --no-deps -d /tmp/eph de422      # 545 MB, JPL DE422 (−3000 až 3000)
mkdir -p /tmp/eph/x && tar xzf /tmp/eph/de422-2009.1.tar.gz -C /tmp/eph/x
npx esbuild tools/model/dump_model.mjs --bundle --platform=node --format=esm --outfile=/tmp/dump.mjs
python3 tools/model/verohodnost.py            # tabulka po staletích
python3 tools/model/fit_long.py               # nový fit (asi 75 minut) → tools/out/planetlong.json
node tools/model/pack_long.mjs                # zápis do src/data/cat.json
npm run test:model                            # rychlý test bez efemeridy (120 okamžiků z tabulky tools/test/ref_de422.json)
```
