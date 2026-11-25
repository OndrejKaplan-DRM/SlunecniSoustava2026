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
- **25. 11. 2026 (O → K)** – Verze 2.3: dvojklik na těleso **daleko = přiblížit, blízko (výška ≤ 1,25 R, bez letu) = přistát** v místě
  dvojkliku; v zaměřování přistane klik na těleso přesně tam (křížek sleduje myš); **kolečkem k povrchu rovnou přistání pod kurzorem**
  (2.2b: nejdřív křížek, pak přistání – Ondřej chtěl „co nejintuitivnější“). Hranice „blízko“ (1,25 R) je můj výklad (K).
- **25. 11. 2026 (O → K)** – **Chůze**: ovládání podle Ondřeje (W A S D, šipky, myš, Shift běh, mezerník skok). Myš: **pravé tlačítko =
  skok** (stejně jako Oliverova Planetka 8), **levé podržet 0,7 s = vzlet**, Esc myš uvolní (nevzlétá). Myš se zamyká klikem **až po prvním
  kroku** – do té doby funguje klik a tah na povrchu jako dřív (rozhlížení, výběr na obloze). Volba tlačítek je můj výklad (K); Ondřej
  napsal, že ji ještě odladíme.
- **25. 11. 2026 (K)** – Pocit chůze (`FEEL` v `ui/chuze.js`): chůze 1,45·√(g/g⊕) m/s (0,7–1,45), běh 4,5 m/s, při g < 0,4 g⊕ poskoky;
  skok 2,8 m/s (Měsíc ~2,4 m, Bennu odlet); led = malé tření; svah nad 35° (led 18°) klouže; poryvy podle hustoty vzduchu (Země 1,
  Venuše 0,55, Mars 0,45, Titan 0,35) s náklonem pohledu; otřesy jen na Io. Čísla jsou odhad k doladění v poslední iteraci (O).
- **25. 11. 2026 (K)** – Terén kolem chodce se po 35 m postaví znovu **po kouscích** (generátor `buildTerenGen`, ≤ 2 ms za snímek; stará
  mřížka se vymění až hotová). Výšky jsou v soustavě místa přistání → nová mřížka navazuje (rozdíl < 1 cm až 2 cm). Důvod: najednou
  to v sandboxu trvalo 0,25 s + 0,2 s stín = viditelné zaškobrtnutí. Kameny kolem chodce v buňkách 3 × 3 m ukotvených v místě
  (stejná buňka = stejný kámen) – nic nepřeskakuje; okraj 30–40 m se zmenšuje do ztracena.
- **25. 11. 2026 (K)** – **Levné stíny**: mapa stínů se nepřekresluje každý snímek, jen když se Slunce posune nebo chodec ujde 8 m.
  Mihotavý stín (každý snímek) zůstává v záloze, jak chtěl Ondřej.
- **25. 11. 2026 (O → K)** – Sestup „sklouznutím“: po přiletu nad místo se přepne na pohled z povrchu ve výšce 0,8 % poloměru
  (60 m až 25 km) s pohledem 84° dolů, výška klesá logaritmicky 3,4 s a pohled se k obzoru zvedne až v poslední polovině; přepnutí
  zakryje závoj (opar podle vzduchu, bez vzduchu tma). Délka a výšky jsou můj výklad (K).
- **25. 11. 2026 (O → K)** – **Zajímavosti po přistání** (`data/zajimavosti.js`): přednost mají jevy (žádný povrch, zatažená obloha,
  modrý západ, Slunce jen jako hvězda nebo naopak velké, planeta nad hlavou, Země z Měsíce, měsíce nad obzorem, polární záře,
  Olympus, unikneš skokem…), v záloze teplota, tlak, plyny, tíže a úniková rychlost. Pořadí priorit je můj výklad (K).
- **25. 11. 2026 (O → K)** – „Věnečky“ jsou prstence (ne polární záře). Popisek „💍 prstence“ na plátně u ansy (mimo kartu), klik =
  vysvětlení; řádek v kartě, dětská dlaždice, Superkarta. Řídké prachové prstence (Jupiter 0,12, Neptun 0,25, Uran 0,5) zakrývají hvězdy
  jen podle své hustoty (předem vynásobená alfa).
- **25. 11. 2026 (O → K)** – **Oblaka obrů v pohybu** levným trikem v shaderu terénu: šumová textura 256² (buňky + šum) posouvaná větrem
  ve dvou střídajících se fázích (flow map), zkroucení, drobné víry rychleji a se střihem, vlnění výšek ve vrcholech, reliéf jen do
  stínování. Čas = skutečný čas (ne čas simulace): mraky plují rychlostí větru i při zastaveném čase a při zrychlení neletí (K).
  Rychlosti NSSDCA, směr podle šířky z paměti (neověřeno).
- **25. 11. 2026 (O → K)** – Olympus Mons: z vyvýšeného místa (výška nad okolím z MOLA > 2 km) sahá terén až k obzoru (do 700 km), opar
  houstne s hloubkou pod pozorovatelem a obloha se počítá z výšky místa. Vrchol hory je ve skutečnosti skoro rovný (svahy ~5°) – „nudnou
  rovinu“ nelze vyloučit úplně; proto i místo „okraj kaldery“ s pohledem do kaldery (K).
- **24. 11. 2026 (O → K)** – Kolečko myši se u povrchu neblokuje, ale dostalo smysl: na nejbližší vzdálenosti od tělesa 3 kroky dovnitř
  do 1,5 s zapnou zaměřovací křížek, další 3 kroky přistanou; na povrchu kolečko ven při nejširším poli = vzlet. Tlačítko přistání
  ukazuje skutečný stav (🛬 Přistát na povrchu → ✅ Přistát sem → 🚀 Vzlétnout) v kartě, v ☰ i na liště a mění se i po vzletu
  kolečkem. Důvod (O): ikona po přechodu kolečkem nabízela „Vzlétnout“ na oběžné dráze. Výklad zoomu kolečkem je můj (K).
- **24. 11. 2026 (O → K)** – Přistání „prodat“: zlaté tlačítko přes celou šířku karty hned pod popisem, tlačítko 🛬 na horní liště vedle
  Hledat, míření zeleně pulzuje, na povrchu modré 🚀; sestup s ukazatelem výšky, zvuky brzdění a startu (neslyšené v sandboxu).
  Umístění na liště je můj výklad (K).
- **24. 11. 2026 (O → K)** – **Noční vidění** na povrchu: pod osvětlením asi jako úplněk se oko dál nepřizpůsobuje, ale přidá se slabé
  namodralé světlo (adaptace na tmu, Purkyňův posun) a barvy se ztlumí. Jas je úměrný albedu → sníh a led září, tmavá půda skoro ne;
  obzor je vidět proti noční záři oblohy. Přisvětlení ☀ na povrchu násobí expozici ×1 až ×3,2 a po vzletu se vrátí. Důvod (O): přistání
  v Grónsku v noci bylo černočerné a posuvník nereagoval. Úroveň (bílá plocha asi na desetině poledního jasu) je můj odhad (K), ne měření.
- **24. 11. 2026 (K, na podnět O)** – Expozice podle osvětlení je strmější (jas bílé plochy 0,25 + 0,06·log₁₀ E místo 0,045) a albedo
  nejvýš 0,9; led a sníh nejsou stínované jako regolit. Pluto v poledne: asi 26 % jasu pozemského poledne (dřív 44 %). Důvod (O): Pluto vypadalo
  „prosluněné“ proti tmavé obloze. Pluto je opravdu jasné (albedo ~0,5–0,7 neověřeno, osvětlení ~1/1000 Země) – oko by se částečně přizpůsobilo.
- **24. 11. 2026 (K)** – Regolit bez vzduchu (Měsíc, Merkur, planetky, komety) stínovaný podle Lommela a Seeligera s opozičním
  zjasněním; led jen zčásti, Země, Venuše, Titan a oblaka podle Lamberta. Důvod: Měsíc na fotkách z Apolla netmavne k okraji ani při
  nízkém Slunci. Stíny terénu na terénu se počítají pochodem paprsku ke Slunci (hory a hrany kráterů vrhají stín, do 70 km).
- **24. 11. 2026 (O → K)** – Oblačná vrstva obrů: zvlnění výrazně plošší (sklon do ~8° místo přes 60°), ale s ojedinělými konvektivními
  věžemi až 40 km vysokými. Důvod: Ondřej se ptal, jestli vertikální členění existuje – existuje, ale v jiném měřítku: Juno vidí
  mezi pásy hladkou vrstvu a v ní věže asi 50 km široké a 50 km vysoké, které vrhají stín (PIA21647); výšková škála atmosféry Jupiteru je
  27 km (Země 8,5 km, NSSDCA). Saturn (59,5 km, víc oparu), Uran a Neptun hladší – odhad. Pozorovatel 1,5 km nad vrstvou.
- **24. 11. 2026 (O → K)** – Pohled z povrchu 2.2: realistická krajina a obloha místo 2D výplně. Obloha se **počítá** (jednonásobný
  Rayleighův a Mieův rozptyl, ozon, stín planety při soumraku, lom světla), ne kreslí podle barev ze snímků; krajina je 3D terén kolem
  pozorovatele (`render/krajina.js`, `render/teren.js`, `render/atmo.js`, předvolby `data/krajiny.js`). Důvod (O): „nemastné-neslané“,
  chce „skutečně dotažené a plně realistické“. Postup a meze: `docs/KRAJINA.md`.
- **24. 11. 2026 (K)** – Velké tvary krajiny z výškových map jen tam, kde jsou volně a v rozumné velikosti: Měsíc (LOLA) a Mars (MOLA),
  celé těleso 4 body na stupeň + výřezy 16 bodů na stupeň kolem známých míst (2,7 MB). Země bez výškové mapy (jen druh povrchu z mapy).
  Důvod: rozpočet asi 15 MB; globální mapy 16 bodů na stupeň by měly desítky MB.
- **24. 11. 2026 (K)** – Venuše a Titan: výchozí je skutečný povrch pod oblaky (zatažená oranžová obloha), tlačítko „☁ Nad oblaka“ ukáže
  pohled nad oblačností. Dřív to bylo naopak (nad oblaky, „ať je co vidět“). Důvod (O): na Venuši z povrchu „je vidět skoro prd“.
- **24. 11. 2026 (K)** – Ozon v kanálu R zvýšen z 0,65 na 1,2·10⁻³ km⁻¹ (Bruneton počítá R na 680 nm). Důvod: s 680 nm vycházel nadhlavník
  za soumraku růžový, s citlivostí oka a fotoaparátu kolem 600 nm (Chappuisův pás) modrofialový jako na fotkách.
- **24. 11. 2026 (K)** – Pozemská obloha zesílená 2,4× (`gain`): jednonásobný rozptyl v čistém vzduchu dává asi třetinu skutečného jasu
  (Preetham 1999). Ostatní atmosféry bez zesílení nebo 1,5× (obři, odhad).
- **24. 11. 2026 (K)** – Expozice jako oko: jas krajiny ~ logaritmus osvětlení, při jasné obloze v záběru (západ Slunce) se sníží
  (78 % cesty k expozici podle oblohy); pod úplňkem se dál nepřizpůsobuje. Hvězdy mizí podle jasu nadhlavníku a v každém bodě podle
  jasu oblohy kolem (práh kontrastu). Na tělesech bez vzduchu ztlumí hvězdy osvětlená krajina v záběru (proto nejsou na fotkách
  z Apolla); kdo na Zemi vypne vzduch, chce hvězdy ve dne – oslnění se tam neuplatní.
- **24. 11. 2026 (K)** – Prach na Marsu: modrou rozptyluje úzce dopředu (g = 0,88), červenou široce (0,6) – modrá záře kolem
  zapadajícího Slunce (PIA19400) vychází z výpočtu. Mnohonásobný rozptyl přibližně (rovnoměrná záře 1,6× světla oblohy).
- **24. 11. 2026 (K)** – Země: druh krajiny podle podrobné mapy (moře, louky a lesy, poušť, led); přistání v moři se posune na nejbližší
  pevninu s hláškou. Stromy jen na Zemi (Ondřej: „ať nelemuje horizont Marsu silueta lesa“). Albedo půdy ostatních těles podle katalogu.
- **24. 11. 2026 (K)** – Ukázky zatmění „Z místa“ (`quiet`) zůstávají u dřívější 2D země a obzoru: kreslí se v malém okně vedle karty
  úkazu a krajina by tam jen zdržovala.
- **24. 11. 2026 (O → K)** – Mřížka na povrchu tělesa se nepamatuje (nesmí naběhnout zapnutá); zapne se jen během výběru místa přistání.
  Tlačítko „🔭 Z povrchu“ v kartě ukáže zaměřovací křížek, přistání se potvrdí (✅, Enter, dvojklik); kolečkem ven při nejširším poli
  (3 kroky do 1,5 s) je vzlet.
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
  Vodítka (mřížky, ekliptika, zaměřovač) se pamatují v prohlížeči (`s200surf`). **Zrušeno 24. 11. ve 2.2** (mřížka naběhla zapnutá).
- **20. 11. 2026 (K)** – Id vložených souborů v jednosouborové verzi s předponou `_a` (kolize s prvkem stránky `alt` → nenačtená dlaždice).
- **19. 11. 2026 (K, po reklamaci O)** – Telefonní rozložení jen pro skutečný telefon (hrubý ukazatel a mobilní prohlížeč nebo malý displej).
  Důvod: televize 4096 px přes HDMI se zvětšením systému dostala telefonní rozložení.
- **Trvale (O)** – Osvědčený vzhled z atlasů (tenká světlá dráha, hvězdy s paprsky), žádná patina ani barevné experimenty; střídmost.
- **Trvale (O)** – Na stránce nic z cizích serverů; vše v `dist/` nebo vložené v jednom souboru (běh z flashky bez internetu).
