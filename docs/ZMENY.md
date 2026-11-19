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
| 1.8a | 19. 11. 2026 | `iterace-19` | `iterace-18` |

Větve na sebe navazují v řadě, takže `iterace-19` obsahuje vše předchozí.

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
