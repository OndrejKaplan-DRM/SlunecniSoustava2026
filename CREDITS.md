# Sluneční soustava 200 – autoři, zdroje a licence

Stav k 13. 11. 2026, verze 1.2.

## Autorství
- Námět, zadání, odborná kontrola a testování: **Ing. Ondřej Kaplan, Ph.D.** (ondrej.kaplan@gmail.com).
- Kód napsal podle jeho zadání model **Claude Fable 5.2** (Anthropic). Vývoj probíhal po iteracích ve větvích `iterace-N`; každou verzi hlídají automatické testy (`npm test`, `npm run test:fakta`).
- Aplikace je zdarma, bez reklam a bez registrace. Neodesílá žádné údaje; nastavení a postup hry ukládá jen do úložiště prohlížeče.

## Licence
| Co | Licence |
|---|---|
| Zdrojový kód (`src/`, `tools/`, `dist/index.html`, `dist/app.js`) | MIT – viz `LICENSE` |
| Texty v aplikaci (karty těles, zajímavosti, nápověda) | CC BY 4.0, autor Ondřej Kaplan |
| Three.js (součást `dist/app.js`) | MIT, © three.js authors |
| Písmo Baloo 2 (`dist/fonts/`) | SIL Open Font License 1.1, © The Baloo 2 Project Authors – `dist/fonts/OFL.txt` |
| Mapy těles, Mléčná dráha | různé, viz tabulka níže – **nespadají pod licenci MIT** |
| Zvuky (`dist/zvuky/`) | CC0, balíčky z opengameart.org – seznam v `zdroje/ZVUKY.md`; ostatní zvuky jsou syntéza v prohlížeči |
| Hudba (`dist/music/`, 16 skladeb) | skladby vytvořil autor ve službě Suno v placeném tarifu (Premier, „Commercial use rights“ – stav účtu ověřen 13. 11. 2026); šíří se jako součást aplikace |

## Data a výpočty
- Polohy planet: střední elementy JPL (Standish) s opravami dopočítanými proti efemeridě JPL DE421. Měsíc: zkrácená řada podle J. Meeuse, *Astronomical Algorithms*. Měsíce planet: elementy a póly IAU, opravy dopočítané proti referenčním polohám.
- Dlouhodobá teorie planet a Pluta pro roky −1000 až 3000 a kontrola věrohodnosti: numerická efemerida JPL DE422 (W. M. Folkner, Jet Propulsion Laboratory); postup v `docs/VEROHODNOST.md`.
- Rozdíl mezi světovým a dynamickým časem (ΔT): polynomy F. Espenaka a J. Meeuse (NASA, *Five Millennium Canon of Solar Eclipses*).
- Zatmění Slunce a Měsíce: katalogy a Besselovy elementy NASA (F. Espenak, J. Meeus, *Five Millennium Canon of Solar Eclipses* a *of Lunar Eclipses*, NASA/GSFC); podle nich se kreslí obrys a dráha stínu a pohled z místa. Přechody planet: katalogy F. Espenaka. Průlety a komety: JPL Horizons, Small-Body Database a CNEOS.
- Planetky a komety: Keplerova dráha z elementů JPL Small-Body Database, bez poruch. Výjimka: u Apophisu jsou tři elementy doladěné tak, aby průlet 13. 4. 2029 vyšel na skutečný čas a vzdálenost (`tools/data/fit_apophis.mjs`); směr průletu je přibližný.
- Fyzikální údaje těles: katalog Stellaria, doplněný a opravený (měsíce Pluta: Weaver et al. 2016, *Science* 351, aae0030; 2I/Borisov a 3I/ATLAS: JPL SBDB).
- Hvězdy a souhvězdí: katalog jasných hvězd a čáry souhvězdí ze Stellaria (GPL v2+ / volná data).

## Ikona aplikace
Ikona na záložce prohlížeče a na ploše telefonu (`dist/icon.svg`, `dist/icon-180.png`) je vlastní návrh autora, převzatý z jeho projektu
Kosmická výprava (`OndrejKaplan-DRM/SolarSystemExperimentsRepo`, `kosmicka-vyprava/icon/`). Pásy planetek (hlavní pás a Kuiperův pás) jsou
ilustrace počítaná programem (`src/render/belts.js`), žádná cizí data.

## Objekty na obloze (verze 1.8b až 2.0)
Fotografie hvězd, mlhovin, hvězdokup a galaxií ve scénách „Objekty na obloze“ (`dist/sky/`, 233 snímků) pocházejí z veřejných archivů
**ESO**, **ESA/Hubble** a **ESA/Webb** (licence CC BY 4.0: smí se šířit a upravovat při uvedení autora) a z archivu **NASA** (jeden snímek NASA/JPL-Caltech/UCLA; volné užití s uvedením autora podle zásad NASA/JPL).
Jsou zmenšené a převedené do WebP; autor každého snímku je uveden přímo v kartě pod fotografií a spolu s odkazem na stránku snímku
v tabulce `zdroje/OBLOHA.md`. Poloha, úhlová velikost a jasnost objektů jsou z katalogu **OpenNGC** (Mattia Verga, CC BY-SA 4.0),
vzdálenosti a zajímavosti z tiskových zpráv ESO, ESA/Hubble a ESA/Webb vyjmenovaných u každého objektu. Tyto fotografie **nespadají
pod licenci MIT** tohoto projektu.

Hvězdy (větev `iterace-23b`): poloha, jasnost a spektrální třída jsou z katalogu **Hipparcos** (ESA 1997), paralaxa z jeho nového zpracování
(F. van Leeuwen 2007), obojí staženo z archivu ESA (https://gea.esac.esa.int/archive/). Zajímavosti o hvězdách jsou vlastním shrnutím úvodních
odstavců hesel **anglické Wikipedie** (CC BY-SA 4.0; odkaz na heslo je u každé hvězdy ve zdrojích). Výřezy „okolí hvězdy“ (43 obrázků) jsou
z mapy hvězd **NASA SVS Deep Star Maps 2020** (https://svs.gsfc.nasa.gov/4851/; NASA/Goddard Space Flight Center Scientific Visualization Studio,
Gaia DR2: ESA/Gaia/DPAC; volné užití s uvedením autora). Jsou vykreslené z katalogů, nejsou to fotografie; úprava: výřez 12° × 12°, převod jasu,
slabá záře kolem nejjasnějších hvězd, u slabších hvězd kroužek uprostřed.

## Povrchy těles
Ze 201 těles má **44 skutečnou mapu** ze snímků sond (na kartě 📷). Zbylých 157 má **ilustraci** vytvořenou programem v tomto projektu (na kartě 🎨, `tools/maps/`), žádná cizí práva se na ně nevztahují.

| Těleso | Zdroj | Licence / podmínky | Velká mapa |
|---|---|---|---|
| Slunce | NASA Solar Dynamics Observatory, AIA 171 Å (jen pro ikonu a rozmístění aktivních oblastí; kotouč je počítaný) | volné dílo NASA, uvádět NASA/SDO | – |
| Merkur | USGS – MESSENGER MDIS Basemap (velká mapa); barva z mapy Stellaria (O. Pluton) | volné dílo (NASA / USGS), žádá se uvedení zdroje | ano |
| Venuše | USGS – Magellan C3-MDIR (radar, velká mapa); oblačnost: Stellarium (O. Pluton) | volné dílo (NASA / USGS), žádá se uvedení zdroje | ano |
| Země | J. Hastings-Trew, Planetary Pixel Emporium (denní mapa, oblačnost, odlesk, noční světla; převzato z ukázek Three.js) | © J. Hastings-Trew – užití v programech a vizualizacích povoleno, samotné mapy se nesmí šířit jako sbírka | – |
| Země – podrobná mapa (pevnina a led) | NASA Blue Marble Next Generation, červenec 2004 (R. Stöckli, NASA Earth Observatory), verze s reliéfem pevniny; barva moře zůstává z malé mapy | volné dílo (NASA), žádá se uvedení zdroje | ano |
| Měsíc | NASA Scientific Visualization Studio – CGI Moon Kit (LROC WAC) | volné dílo (NASA / USGS), žádá se uvedení zdroje | ano |
| Mars | USGS Astrogeology – Viking Colorized Global Mosaic (velká mapa); malá mapa: J. Hastings-Trew, Planetary Pixel Emporium | volné dílo (NASA / USGS), žádá se uvedení zdroje; malá mapa © J. Hastings-Trew (užití v programu povoleno) | ano |
| Jupiter | NASA/JPL/Space Science Institute – PIA07782 (Cassini) | volné dílo (NASA / USGS), žádá se uvedení zdroje | ano |
| Saturn | NASA PDS – Cassini ISS Global Maps (Li, L., 2023, doi:10.17189/rkkb-6y30) | volné dílo (NASA / USGS), žádá se uvedení zdroje | ano |
| Uran | Stellarium (textures/uranus.png) | CC BY 4.0 – zpracoval Oleg Pluton (Helleformer) | – |
| Neptun | Stellarium (textures/neptune.png) | CC BY 4.0 – zpracoval Oleg Pluton (Helleformer) | – |
| Eros | Stellarium (textures/eros.png) | JPL (maps.jpl.nasa.gov, D. Seal) – volně s uvedením zdroje; přesný původ u této mapy Stellarium neuvádí | – |
| Vesta | USGS / DLR – Dawn FC HAMO Global Mosaic | volné dílo (NASA / USGS), žádá se uvedení zdroje | ano |
| Ceres | USGS / DLR – Dawn FC Global Mosaic | volné dílo (NASA / USGS), žádá se uvedení zdroje | ano |
| Pluto | USGS – New Horizons LORRI–MVIC Global Mosaic | volné dílo (NASA / USGS), žádá se uvedení zdroje | ano |
| Bennu | Stellarium (textures/bennu.png) | volné dílo – NASA (OSIRIS-REx) | – |
| Ida | Stellarium (textures/ida.png) | CC BY 4.0 – zpracoval Oleg Pluton (Helleformer) | – |
| Gaspra | Stellarium (textures/gaspra.png) | CC BY 4.0 – zpracoval Oleg Pluton (Helleformer) | – |
| Phobos | Stellarium (textures/phobos.png) | JPL (maps.jpl.nasa.gov, D. Seal) – volně s uvedením zdroje; přesný původ u této mapy Stellarium neuvádí | – |
| Deimos | Stellarium (textures/deimos.png) | CC BY 4.0 – zpracoval Oleg Pluton (Helleformer) | – |
| Ganymed | USGS – Voyager/Galileo SSI Global Color Mosaic | volné dílo (NASA / USGS), žádá se uvedení zdroje | ano |
| Callisto | USGS – Voyager/Galileo SSI Global Mosaic | volné dílo (NASA / USGS), žádá se uvedení zdroje | ano |
| Io | USGS – Galileo SSI/Voyager Color Merge | volné dílo (NASA / USGS), žádá se uvedení zdroje | ano |
| Europa | USGS – Voyager/Galileo SSI Global Mosaic (velká mapa); malá mapa: Stellarium (O. Pluton, CC BY 4.0) | volné dílo (NASA / USGS), žádá se uvedení zdroje | ano |
| Titan | Stellarium (textures/titan.png) | CC BY 4.0 – Magenta Meteorite, zpracoval Oleg Pluton | – |
| Rhea | USGS – Cassini/Voyager Global Mosaic | volné dílo (NASA / USGS), žádá se uvedení zdroje | ano |
| Iapetus | USGS – Cassini/Voyager Global Mosaic | volné dílo (NASA / USGS), žádá se uvedení zdroje | ano |
| Triton | USGS – Voyager 2 Color Mosaic Global Fill | volné dílo (NASA / USGS), žádá se uvedení zdroje | ano |
| Enceladus | USGS – Cassini Global Mosaic | volné dílo (NASA / USGS), žádá se uvedení zdroje | ano |
| Mimas | NASA/JPL-Caltech/SSI/LPI – PIA18437 | volné dílo (NASA / USGS), žádá se uvedení zdroje | ano |
| Charon | USGS – New Horizons LORRI–MVIC Global Mosaic | volné dílo (NASA / USGS), žádá se uvedení zdroje | ano |
| Miranda | Stellarium (textures/miranda.png) | CC BY 4.0 – Snowfall, zpracoval Oleg Pluton | – |
| Dione | USGS – Cassini/Voyager Global Mosaic | volné dílo (NASA / USGS), žádá se uvedení zdroje | ano |
| Tethys | USGS – Cassini Global Mosaic | volné dílo (NASA / USGS), žádá se uvedení zdroje | ano |
| Amalthea | Stellarium (textures/amalthea.png) | CC BY 4.0 – zpracoval Oleg Pluton (Helleformer) | – |
| Titania | Stellarium (textures/titania.png) | CC BY 4.0 – Kexitt, zpracoval Oleg Pluton | – |
| Oberon | Stellarium (textures/oberon.png) | CC BY 4.0 – Snowfall, zpracoval Oleg Pluton | – |
| Umbriel | Stellarium (textures/umbriel.png) | CC BY 4.0 – Kexitt, zpracoval Oleg Pluton | – |
| Ariel | Stellarium (textures/ariel.png) | CC BY 4.0 – Snowfall, zpracoval Oleg Pluton | – |
| Hyperion | Stellarium (textures/hyperion.png) | CC BY 4.0 – zpracoval Oleg Pluton (Helleformer) | – |
| Phoebe | Stellarium (textures/phoebe.png) | CC BY 4.0 – zpracoval Oleg Pluton (Helleformer) | – |
| Janus | Stellarium (textures/janus.png) | CC BY 4.0 – zpracoval Oleg Pluton (Helleformer) | – |
| Epimetheus | Stellarium (textures/epimetheus.png) | CC BY 4.0 – zpracoval Oleg Pluton (Helleformer) | – |
| Proteus | Stellarium (textures/proteus.png) | CC BY 4.0 – zpracoval Oleg Pluton (Helleformer) | – |
| Prometheus | Stellarium (textures/prometheus.png) | JPL (maps.jpl.nasa.gov, D. Seal) – volně s uvedením zdroje; přesný původ u této mapy Stellarium neuvádí | – |

**Podrobné mapy zblízka (verze 1.8m, úroveň 2):** u 13 těles se zblízka dočítají dlaždice z primárních mozaik v rozlišení až 32 768 px
(Země, Měsíc), 16 384 px (Mars, Merkur, Pluto) nebo 8 192 px (Venuše, Europa, Ganymed, Callisto, Vesta, Enceladus, Dione, Iapetus). Zdroje jsou
tytéž jako u velkých map v tabulce výše, navíc: Země – NASA Blue Marble Next Generation, 500 m (R. Stöckli, NASA Earth Observatory);
noční světla Země – NASA Earth Observatory, Black Marble 2016 (M. Román, NASA GSFC; data Suomi NPP VIIRS); Měsíc – NASA Scientific
Visualization Studio, CGI Moon Kit 16k (LROC WAC; NASA/GSFC/Arizona State University) a pro nejjemnější kresbu USGS Astrogeology,
LRO LROC WAC Global Morphology Mosaic 100 m (NASA/GSFC/Arizona State University); Mars – USGS Astrogeology, Viking MDIM 2.1 Global
Mosaic 232 m (NASA/JPL/USGS), barva z barevné mozaiky Viking; reliéf Měsíce – USGS Astrogeology, LRO LOLA DEM 128 px/° (NASA/GSFC,
LOLA Science Team). Všechno volné dílo NASA/USGS s žádostí o uvedení autorů. Postup výroby
a seznam souborů: `zdroje/MAPY.md`, oddíl „Úroveň 2“.

Další obrazové podklady:
- **Mléčná dráha**: panorama Axela Mellingera (Univerzita v Postupimi), převzato ze Stellaria; svolení „upravovat a šířit při uvedení autora“.
- **Prstence Saturnu**: radiální profil ze Stellaria.

### Jak moc je to ověřené
- Licence map převzatých ze **Stellaria** jsou opsané z jeho souboru `CREDITS.md` (větev master, čteno 13. 11. 2026). Předpokládám, že soubory v `zdroje/mapy/` odpovídají této verzi.
- U map **USGS** jsem podmínky na stránce produktu četla jen u Europy, Dione, Ceres, Vesty a Pluta („Public domain“, „Please cite authors“). U ostatních vycházím z obecného pravidla, že díla USGS a NASA jsou volná; jednotlivě ověřeno není.
- Mapy **J. Hastings-Trewa** (Země, malá mapa Marsu): autor na svém webu výslovně povoluje užití v programech typu „simulátor Sluneční soustavy“; nepovoluje šířit samotné mapy jako sbírku. Proto v repozitáři nejsou jeho původní soubory, jen zmenšené mapy zabudované do aplikace.
- **Suno**: autor má placený tarif Premier, který podle ceníku zahrnuje práva ke komerčnímu užití (snímek účtu z 13. 11. 2026). Plné znění podmínek služby jsem nečetla.

## Jak citovat
Kaplan, O. (2026). *Sluneční soustava 200* (verze 1.2) [software]. https://github.com/OndrejKaplan-DRM/SlunecniSoustava2026
