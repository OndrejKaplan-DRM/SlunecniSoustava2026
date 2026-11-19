# Přehled změn podle verzí

Veřejně (větev `main`, stránka, artefakt) je verze **1.2**. Vše od 1.3 výš je pracovní: žije jen na větvích `iterace-N`
a v souboru na vyzkoušení (`node tools/build/build_offline.mjs <výstup.html> --hi`). Bod návratu je větev `verze-1.2`.

| Verze | Datum | Větev (poslední commit) | Vychází z |
|---|---|---|---|
| 1.2 | 13. 11. 2026 | `main` = `verze-1.2` = `iterace-13` (`1f96e61`) | — |
| 1.3 | 14. 11. 2026 | `iterace-15` (`3d63b58`) | `main` přes `iterace-14` |
| 1.4, 1.5 | 14.–18. 11. 2026 | `iterace-16` (`1f56f45`) | `iterace-15` |
| 1.6 | 18. 11. 2026 | `iterace-17` (`d991ab9`) | `iterace-16` |
| 1.7, 1.7.1 | 18.–19. 11. 2026 | `iterace-18` (`06f1a52`) | `iterace-17` |
| 1.8a | 19. 11. 2026 | `iterace-19` (`8b21072`) | `iterace-18` |
| 1.8b | 19. 11. 2026 | `iterace-19b` | `iterace-19` (souběžně s verzí 1.9 z jiné sešny) |

Větve na sebe navazují v řadě, takže `iterace-19` obsahuje vše předchozí. `iterace-19b` je boční větev z `iterace-19`
určená ke sloučení s větví verze 1.9 (viz „Sloučení“ na konci oddílu 1.8b).

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
