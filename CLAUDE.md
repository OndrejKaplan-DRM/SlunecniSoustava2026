# CLAUDE.md – instrukce pro AI (čte se automaticky)

Projekt **Sluneční soustava 200**: samostatný 3D model Sluneční soustavy v prohlížeči (Three.js r187 + esbuild), 201 těles ve skutečném
měřítku a na skutečných drahách, dospělé a dětské rozhraní. Autor a zadavatel: Ondřej Kaplan (komunikace česky, tyká se, oslovení „Ondro“;
AI vystupuje jako „Kristína“). Kód píše AI podle jeho zadání, on dělá odbornou kontrolu a zkouší na zařízeních.

**Než začneš, přečti:** `TODO.md` (co se právě dělá a co je hotové), `DECISIONS.md` (proč je co tak, jak je), `ARCHITECTURE.md` (moduly).
Nejnovější předávka sešny je v projektových dokumentech claude.ai (`claude/Soustava200_predavka_*.md`); repo je ale hlavní zdroj pravdy.

## Stav větví (aktualizuj při každé změně)
- `main` = `7a0831c` – verze 2.0, kandidát k vydání (157 objektů na obloze). Na webu (`gh-pages`) je starší stav `iterace-24` (62 objektů).
- `iterace-25` – verze 2.1 (zkušební, 24. 11. 2026): atmosféry a složení, srovnání ve dvojici, pásy, pohled z povrchu s panelem
  a vodítky, kalibrace poloh proti JPL Horizons, referenční snímky. Regrese prošla (viz `TODO.md`). Do `main` jen s Ondřejovým „ano“.
- `iterace-26` – verze 2.2 a 2.2b (zkušební, 24. 11. 2026, z `iterace-25`): krajina a obloha z povrchu (rozptyl světla, výškové mapy
  Měsíce a Marsu, `docs/KRAJINA.md`), přistání zaměřovacím křížkem; 2.2b: stav tlačítek přistání a vzletu, kolečko u povrchu,
  noční vidění, přisvětlení na povrchu, stíny terénu, plošší oblaka obrů s věžemi. Do `main` jen s Ondřejovým „ano“.
- Body návratu: `iterace-24`, `verze-1.2`, `verze-1.1-stabilni`.

## Spuštění
```sh
npm i three@0.187.0 esbuild sharp     # jednou po klonu
./build.sh                            # src/ → dist/app.js (= npm run build)
node tools/test/tut.mjs /tmp/tut      # regresní ukázka ovládání, musí dát 10/10 (= npm test)
npm run test:fakta                    # shoda dat, textů a výpočtů (201 těles)
npm run test:model                    # polohy planet, Pluta a Měsíce proti JPL DE422, roky −1000 až 3000
npm run test:vernost                  # pohled z povrchu: 996 náhodných případů proti JPL Horizons
npm run test:sceny                    # referenční scény (přechody Phobosu a Deimosu, zatmění, konjunkce) proti JPL Horizons
node tools/test/t_krajina.mjs /tmp/tk # krajina a obloha z povrchu (2.2): režimy, výškové mapy, barvy oblohy, moře → pevnina
node tools/test/krajina_snimky.mjs /tmp/kraj [jméno,…]   # 23 pohledů z povrchu (den, západ, noc, Grónsko v noci, Mars, Měsíc, obři…)
node tools/test/pristani_snimky.mjs /tmp/pr            # tok přistání v 5 snímcích (karta, míření, sestup, povrch, vzlet kolečkem)
node tools/build/build_offline.mjs /tmp/S200.html --hi   # jeden soubor HTML na flashku (musí mít < 400 MB)
```
Další zkoušky v prohlížeči (`t_preload`, `t_karty`, `t_displej`, `t_pasy`, `t_obloha`, `t_scena`, `t_povrch`, `t_l2`, `t_okna`, `t_hi`)
spouštěj **po jedné** a během nich nic nesestavuj. Playwright je globálně v `/home/claude/.npm-global/lib/node_modules/playwright`,
`playwright install` nespouštět. Snímky: `node tools/test/shot.mjs <složka> '<JSON kroků>'`.

## Pravidla (nepřekračovat)
1. **Do `main`, na web (`gh-pages`) ani do artefaktu claude.ai nic bez Ondřejova výslovného souhlasu.** Odesílá se jen pracovní větev:
   `git -c push.negotiate=true push -q origin <větev>`; před každým odesláním `git ls-remote origin`.
2. Nová práce = nová větev z `main` (čísla `iterace-23`, `-23b`, `-24`, `-25` jsou obsazená). Značky (tagy) přes proxy neprojdou – místo nich větev.
3. **Commituj často** (po každém ucelené kroku, i rozpracovaný stav s „WIP“): kontejner se umí restartovat uprostřed práce a co není
   v Gitu, je pryč. Dlouhé výpočty musí ukládat průběžně a umět navázat.
4. Commit končí řádky `Co-Authored-By: …` a `Claude-Session: …` podle pokynu sešny.
5. Stránka nesmí nic načítat z cizích serverů. Každý vnější zdroj (data, mapy, texty, fotky) do `CREDITS.md` a do `zdroje/`.
6. E-mail autora jen v nápovědě aplikace. Soubor na flashku pod 400 MB. Úpravy pro telefon nesmí změnit verzi pro počítač.
7. Repo `SolarSystemExperimentsRepo` (Kosmická výprava) je nezávislá „negativní kontrola“ – nečíst, nic z něj nepřebírat.
8. Číslo verze a datum sestavení se píšou ručně: `dist/index.html` na dvou místech (úvod a nápověda), `README.md`, `CREDITS.md`.
9. `dist/app.js` je výstup sestavení – při konfliktu nesloučit ručně, sestavit znovu.
10. Nové funkce jen na Ondřejovo výslovné zadání; střídmost; osvědčený vzhled z atlasů, žádné barevné experimenty.

## Konvence
- Česky: rozhraní, dokumentace, komentáře, zprávy commitů. Kód formátuje Prettier (`npm run format`), soubory do složek `src/core`,
  `src/render`, `src/ui`, `src/data`, `src/audio`, nástroje do `tools/<oblast>`.
- Fakta z pramenů, ne z paměti: polohy a úkazy z **JPL Horizons** (`tools/model/vernost/hz.py`, mezipaměť `HZ_CACHE`), data těles z NASA
  fact sheets, CO₂ z NOAA GML. Ze sandboxu funguje `curl` na ssd.jpl.nasa.gov, nssdc.gsfc.nasa.gov, naif.jpl.nasa.gov, gml.noaa.gov,
  images-api.nasa.gov; nástroj WebFetch čeká na schválení – nepoužívat. Co je z paměti, označit „neověřeno“.
- Přesnost se dokládá měřením proti nezávislé referenci a mez testu se odvozuje z měření (zhruba dvojnásobek největší odchylky).
- Po každém větším kroku pošli Ondřejovi mřížku snímků, soubor ke spuštění a krátký stav; výsledek jako tabulka „hotovo × neuděláno“;
  vlastní výklady zadání výslovně označ. Zvuk v sandboxu neslyšíš – vždy to napiš.
- Před koncem sešny aktualizuj `TODO.md` a `DECISIONS.md` a commitni je.

## Pasti (stály čas)
- Testovací háčky: `window.S200 = { S, ui, sim, A, mob, zv, orient, uk, sk, F, obloha, povrch }`; úvod zavřeš `#sp-go`.click().
- `pkill -f <vzor>` zabije i vlastní shell – procesy ukončuj podle PID.
- Horizons: tělesa s kladnou západní délkou chtějí východní délku se záporným znaménkem (Mars, Měsíc, Io…); záporná délka sama nic neznamená.
- Testy proti Horizons nastavují stejné ΔT (`setDeltaT`): Horizons po roce 2027 drží 69 s, aplikace extrapoluje parabolou.
- Ve swiftshaderu má Země zblízka „sníh“ z bílých kostiček – artefakt softwarového kreslení, je i v `main`.
- Krajina (2.2): `S.krajina.prep(i)` načte mapu a výškovou mapu (bez ní posun z moře nefunguje); v testech přistání přes
  `povrch.pick(i)` → počkat na `pickState().phase === 'vyber'` → `povrch.land()`. Obraz oblohy ukládá jas už vynásobený expozicí
  (`uPre`) – jinak v noci proužky z poloviční přesnosti. Kotouč Slunce se v obraze zesiluje (`uSunR`), jinak u obzoru zmizí v záři.
