# DECISIONS – laboratorní deník rozhodnutí

Každý záznam: **datum – rozhodnutí** · proč · co to stojí / kdy to přehodnotit. Nové záznamy přidávej nahoru do příslušného oddílu.
Kdo rozhodl: **O** = Ondřej, **K** = Kristína (AI) s Ondřejovým souhlasem nebo v mezích zadání. Podrobné změny verzí: `docs/ZMENY.md`.

## Postup a správa repa
- **24. 11. 2026 (O)** – Paměť projektu patří do repa (`CLAUDE.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `TODO.md`), ne jen do chatu.
  Důvod: mezi sešnami a při výměně modelu se ztrácelo, co je hotové. `docs/ARCHITEKTURA.md` přesunuto do `ARCHITECTURE.md` (jeden zdroj).
- **24. 11. 2026 (O)** – Commitovat často, i rozpracovaný stav. Důvod: kontejner se restartoval uprostřed fitu drah měsíců a hodina
  výpočtu (výsledek se zapisoval až na konci) se ztratila. Dlouhé výpočty proto ukládají po každém kroku a umí navázat.
- **20. 11. 2026 (O)** – Cílový počet objektů na obloze pro 2.0 je 157 (původní návrh K byl 62 a zbytek po vydání).
- **18. 11. 2026 (O)** – Jen jeden soubor na flashku (`--hi`); zařízení si aplikace rozpozná sama. Varianta `--bez-l2` jen jako možnost.
- **14. 11. 2026 (O)** – Do `main`, na web ani do artefaktu nic bez výslovného souhlasu; práce jen na větvích `iterace-N`, aby šlo vrátit.
- **13. 11. 2026 (K)** – Kód rozdělen do složek `core/render/ui/audio/data` a formátován Prettierem; ověřeno shodou otisku `dist/app.js`
  před a po (beze změny chování). Velké soubory (`engine.js`, `ui.js`, `audio.js`) zatím nedělené – vyžaduje předat sdílený stav.

## Přesnost a věrohodnost modelu
- **24. 11. 2026 (K)** – **Nezávislá reference je JPL Horizons** (DE441 a modely satelitů JPL), dotazy přes API s mezipamětí na disku.
  Testy používají stejné ΔT jako Horizons (`setDeltaT`), aby se neměřil rozdíl odhadu budoucí rotace Země, ale geometrie. Rozdíl ΔT se hlásí zvlášť.
- **24. 11. 2026 (K)** – Měsíc: k zkrácené řadě podle Meeuse (24/13/23 členů) přidáno 208 periodických členů v argumentech D, M, M′, F
  fitovaných na DE441 1900–2100 (`src/data/mesic.json`, 4,9 kB). Rozptyl 26″ → 1,8″, ověřeno na nezávislých letech 1000–3000 (3″).
  **Sekulární členy záměrně ne:** před rokem ~800 se liší i samotné efemeridy DE422 a DE441 (61″ v roce −982) a nejistota ΔT je tam
  ještě o řád větší. `test:model` (DE422) proto ukazuje u Měsíce před r. 800 až 62″ – dřív 130″.
- **24. 11. 2026 (K)** – Dráhy měsíců planet refitovány proti Horizons 1900–2100 (tři nesoudělné mřížky časů, třetina vyhrazená na kontrolu).
  Blízké rovníkové měsíce epicyklicky (uzel je u nich nedefinovaný), retrográdní rovníkové (Ophelia, Cordelia) s převráceným smyslem,
  Epimetheus přes Janův průměrný pohyb (koorbitální), malé měsíce Pluta kolem těžiště Pluto–Charon. Do katalogu se zapíše jen dráha,
  která je lepší než stávající. Polynom opravy za oknem fitu pokračuje tečně (ne kvadraticky), aby dráha neutekla v dávných letech.
- **24. 11. 2026 (K)** – Natočení všech těles podle IAU WGCCRE 2015 přímo z NAIF `pck00011.tpc` (včetně periodických členů), počítané
  v čase TT. Důvod: dřívější konstanty a lineární členy dávaly pól Marsu o 1,6° vedle, Tritona o desítky stupňů, pól Idy o 84°.
  Jupiter zůstává na System II kvůli mapě oblačnosti (převod `jupSys` pro testy). Země má vlastní model (precese, nutace, hvězdný čas z UT).
- **24. 11. 2026 (K)** – V pohledu z povrchu se ukazují **zdánlivé** polohy (doba letu světla + aberace, `applyLightTime`), v pohledu
  z vesmíru **okamžité** (geometrické). Důvod: z povrchu se srovnává s tím, co člověk vidí a co ukazují tabulky; 3D scéna musí být
  vnitřně konzistentní (stíny, dráhy). Lom světla v atmosféře se jen vypisuje (nestaví obzor), obzor je matematický.
- **24. 11. 2026 (K)** – Planetky a TNO (71 ze 81): střední elementy s lineárním stáčením uzlu a perihelu (`Od`, `wd` v katalogu),
  fit na Horizons. Ze tří oken (1900–2100, 1980–2060, 2010–2040) vyhrává nejmenší skóre = chyba 1900–2100 + 2 × chyba 2000–2050
  (dnešek má dvojnásobnou váhu) a zapisuje se, jen když se roky 2000–2050 nezhorší. **Blízkozemní planetky (q < 1,3 AU) jen při
  jasném zlepšení** – průlety kolem Země mění dráhu skokem a stará oskulační dráha je přesná kolem svého data (Apophis 2029).
  Komety beze změny (negravitační síly, elementy pro konkrétní návrat). Ze Země: Ceres a Vesta medián 54′ → 5,8′.
- **24. 11. 2026 (K)** – Phobos: kvadratický člen délky je skutečné slapové zrychlení (fit 1,26·10⁻³ °/rok², literatura 1,27·10⁻³)
  → pokračuje i za oknem fitu (`corr.sek`). U ostatních měsíců by kvadratický člen byl jen kus dlouhoperiodického kmitu (Mimas–Tethys).
- **24. 11. 2026 (K)** – Pozorovatel na Ceres a Vestě: rozdíl proti Horizons roste lineárně s časem (natočení, ne polohy). Ponechána
  oficiální rotace IAU 2015; rozdíl popsán jako známá mez (hypotéza: Horizons má jiný model rotace).
- **13. 11. 2026 (K)** – Planety a Pluto: 1900–2050 fit na DE421 (`jplCorrPos`), jinde vlastní dlouhodobá teorie fitovaná na DE422
  pro −1000 až 3000 (`longPos`), plynulý přechod. Mimo −1000 až 3000 se počítá dál, ale neověřeně (aplikace jednou upozorní).
- **13. 11. 2026 (K)** – Aplikace ukazuje světový čas (UT), dráhy běží v čase efemerid (ΔT podle Espenaka a Meeuse).

## Rozhraní a zobrazení
- **24. 11. 2026 (O → K)** – Srovnání velikostí: zachovat řadu těles a přidat dvojici ve skutečném poměru (Slunce × Země, Jupiter × …)
  s posuvníkem přiblížení. Důvod (O): řada stlačí asymetrii velikostí, ale je přehledná – chce obojí.
- **24. 11. 2026 (K, na podnět O)** – Pásy planetek výchozí „nenápadně“ (tři stupně: vypnuto / nenápadně / výrazně). Měření: tečky byly
  stejně výrazné jako katalogové planetky, ve skutečnosti by z blízkosti Slunce nebylo vidět nic (Ceres ~11–12 mag ze 7 AU nad Sluncem,
  mez oka 6 mag; ze Země jen Vesta ~5,2 mag). Pásy zůstávají ilustrací rozložení drah.
- **24. 11. 2026 (O → K)** – Informace o atmosféře a složení ve třech hloubkách: dětské rozhraní málo, dospělé víc, Superkarta nejvíc
  (plyny v %, tlak, teplota, kůra, plášť, jádro, zdroje). Zdroje NASA NSSDCA fact sheets, CO₂ NOAA GML (Mauna Loa).
- **24. 11. 2026 (K)** – Soumrak na Marsu slábne až do výšky Slunce −24° (Země −13°). Důvod: snímky Spirit (hodinu před východem)
  a Curiosity (80 min po západu) ukazují ještě světlou oblohu – prach vysoko v atmosféře. Odhad, ne výpočet rozptylu.
- **24. 11. 2026 (K)** – Referenční scény = skutečné úkazy, které vyfotily sondy (přechody Phobosu a Deimosu přes Slunce, zákryt
  Deimosu Phobosem, Země z Marsu) + zatmění a konjunkce ze Země. Model musí úkaz najít sám; přesný okamžik dává Horizons, protože
  popisy fotek NASA mají jen den nebo přibližný čas. Fotky jen zmenšené v `docs/ref/foto`, aplikace je nenačítá.
- **24. 11. 2026 (K)** – Dětský panel „Obloha odsud“: jen záložky Tělesa, Hvězdy, Barva, Vodítka; tabulka „kde“ (světová strana)
  a „jak vysoko“, bez souřadnic a magnitud.
- **24. 11. 2026 (K)** – Panel „Obloha odsud“ stojí vlevo, lišta pohledu z povrchu vedle něj (dřív se překrývaly), karta tělesa vpravo.
  Vodítka (mřížky, ekliptika, zaměřovač) se pamatují v prohlížeči (`s200surf`).
- **20. 11. 2026 (K)** – Id vložených souborů v jednosouborové verzi s předponou `_a` (kolize s prvkem stránky `alt` → nenačtená dlaždice).
- **19. 11. 2026 (K, po reklamaci O)** – Telefonní rozložení jen pro skutečný telefon (hrubý ukazatel a mobilní prohlížeč nebo malý displej).
  Důvod: televize 4096 px přes HDMI se zvětšením systému dostala telefonní rozložení.
- **Trvale (O)** – Osvědčený vzhled z atlasů (tenká světlá dráha, hvězdy s paprsky), žádná patina ani barevné experimenty; střídmost.
- **Trvale (O)** – Na stránce nic z cizích serverů; vše v `dist/` nebo vložené v jednom souboru (běh z flashky bez internetu).
