# Velké mapy těles (`dist/maps/hi/`) – zdroje

Zpracování: `tools/make_hi.py` – zmenšení na 4096 × 2048 (rovnoúhlá projekce 2 : 1), pootočení na nultý poledník stávající mapy (ověřeno korelací), vyrovnání jasu a barev se stávající mapou `dist/maps/<id>.webp`, WebP. Kde zdroj nemá data, zůstává zvětšená stávající mapa; nic se nepřikresluje.

| Těleso | Zdroj | Soubor | Licence | Zpracování |
|---|---|---|---|---|
| Mars | USGS Astrogeology, Viking Colorized Global Mosaic 925 m | https://planetarymaps.usgs.gov/mosaic/Mars_Viking_ClrMosaic_global_925m.tif | dílo USGS / NASA (volné dílo vlády USA) – **stránku produktu jsem v této sešně neotevřela, ověřit** | posun 0,5 (korelace se stávající mapou 0,963), kvalita 90, 0,82 MB |
| Měsíc | NASA Scientific Visualization Studio, CGI Moon Kit (LROC WAC), https://svs.gsfc.nasa.gov/4720 | https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_4k.tif | NASA SVS – **podmínky na stránce jsem v této sešně neotevřela, ověřit** | bez posunu (korelace 0,984), kvalita 85, 1,52 MB |
| Europa | USGS Astrogeology, Europa Voyager – Galileo SSI Global Mosaic 500 m (T. Becker, 2010), https://astrogeology.usgs.gov/search/map/europa_voyager_galileo_ssi_global_mosaic_500m | https://planetarymaps.usgs.gov/mosaic/Europa_Voyager_GalileoSSI_global_mosaic_500m.tif | „Use Constraints: None“ (stránka produktu, ověřeno 2026-11-12) | šedý zdroj, barva ze stávající mapy; posun 0,5 (korelace jen 0,42 – stávající mapa je jiného původu); 4,3 % plochy bez dat (okolí jižního pólu) → stávající mapa; kvalita 85, 1,47 MB |
| Merkur | USGS, MESSENGER MDIS Basemap MD3 Color Global Mosaic 665 m | https://planetarymaps.usgs.gov/mosaic/Mercury_MESSENGER_MDIS_Basemap_MD3Color_Mosaic_Global_665m.tif | neověřeno jednotlivě | doladit, zdroj převeden na šedou, barva ze stávající; posun 0 (korelace 0,73) |
| Ceres | USGS / DLR, Dawn FC Global Mosaic 400 m (říjen 2015) | https://planetarymaps.usgs.gov/mosaic/Ceres_Dawn_FC_DLR_global_20ppd_Oct2015.tif | Use Constraints: „Please cite authors“ (NASA/JPL-Caltech/UCLA/MPS/DLR/IDA) | doladit; posun 0,5 (korelace 0,57) |
| Vesta | USGS / DLR, Dawn FC HAMO Global Mosaic 60 m | https://planetarymaps.usgs.gov/mosaic/Vesta_Dawn_FC_HAMO_Mosaic_Global_74ppd.tif | Use Constraints: „Please cite authors“ | doladit; posun −150° (stávající mapa je v jiné soustavě délek; korelace 0,73) |
| Io | USGS, Galileo SSI – Voyager Global Mosaic, Color Merge 1 km | https://planetarymaps.usgs.gov/mosaic/Io_GalileoSSI-Voyager_Global_Mosaic_ClrMerge_1km.tif | neověřeno jednotlivě | nahradit (barvy zdroje); posun 0 (korelace jemné kresby 0,32) |
| Ganymed | USGS, Voyager – Galileo SSI Global Color Mosaic 1,4 km | https://planetarymaps.usgs.gov/mosaic/Ganymede_Voyager_GalileoSSI_Global_ClrMosaic_1435m.tif | neověřeno jednotlivě | nahradit (barvy zdroje); posun 0,5 (korelace 0,11, druhý vrchol 0,02) |
| Callisto | USGS, Voyager – Galileo SSI Global Mosaic 1 km | https://planetarymaps.usgs.gov/mosaic/Callisto_Voyager_GalileoSSI_global_mosaic_1km.tif | neověřeno jednotlivě | nahradit, cílový jas 88; posun 0,5 (korelace 0,16) |
| Enceladus | USGS, Cassini Global Mosaic 110 m | https://planetarymaps.usgs.gov/mosaic/Enceladus_Cassini_mosaic_global_110m.tif | neověřeno jednotlivě | nahradit, zesvětleno gama 0,24; posun 0 (slabá korelace) |
| Dione | USGS, Cassini – Voyager Global Mosaic 154 m | https://planetarymaps.usgs.gov/mosaic/Dione_Cassini_Voyager_mosaic_global_154m.tif | Access: „Public domain“, Use: „Please cite authors“ | 2048; nahradit, gama 0,53; posun 0 (slabá korelace) |
| Iapetus | USGS, Cassini – Voyager Global Mosaic 783 m | https://planetarymaps.usgs.gov/mosaic/Iapetus_Cassini_Voyager_mosaic_global_783m.tif | neověřeno jednotlivě | 2048; nahradit; posun 0 (slabá korelace) |
| Rhea | USGS, Cassini – Voyager Global Mosaic 417 m | https://planetarymaps.usgs.gov/mosaic/Rhea_Cassini_Voyager_mosaic_global_417m.tif | neověřeno jednotlivě | 2048; nahradit, gama 0,35; posun 0 (slabá korelace) |
| Tethys | USGS, Cassini Global Mosaic 293 m | https://planetarymaps.usgs.gov/mosaic/Tethys_Cassini_mosaic_global_293m.tif | neověřeno jednotlivě | 2048; nahradit, gama 0,34; posun 0 (slabá korelace) |
| Jupiter | NASA/JPL/Space Science Institute, PIA07782 „Cassini's Best Maps of Jupiter (Cylindrical Map)“, prosinec 2000 | https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia07/pia07782/PIA07782.tif | NASA (kredit NASA/JPL/Space Science Institute) | 3600 × 1800 (zdroj má 3601 × 1801); nahradit (barvy zdroje); posun −0,116, aby Velká rudá skvrna zůstala na délce stávající mapy |

„Doladit“ = stejná data jako stávající mapa, jen ostřejší. „Nahradit“ = stávající mapa byla jiného původu (umělé bílé plochy, přehnané barvy); přepsána je i malá mapa `dist/maps/<id>.webp`. „Slabá korelace“ = posun 0 vyšel shodně u šesti těles, ale jednotlivě je vrchol jen 1,5–2× nad šumem – polohu útvarů zkontrolovat.

## Doplněno ve druhém kole (2026-11-12)
Konvence modelu ověřena výpočtem: nultý poledník vázaně rotujících těles míří k mateřskému tělesu (Měsíc 1°, Pluto a Charon 3°, Europa −5°, Io −7°, Tethys −8°) a střed mapy je délka 0°, východ vpravo. Polohy útvarů v `src/extras.js` jsou ve skutečných východních délkách.

| Těleso | Zdroj | Soubor | Licence | Zpracování |
|---|---|---|---|---|
| Mars (oprava) | jako výše | jako výše | jako výše | stávající malá mapa měla střed na 180° místo 0° (útvary o 180° vedle); malá mapa pootočena o půl šířky, velká s posunem 0 |
| Venuše | USGS, Magellan C3-MDIR Colorized Global Mosaic 4641 m (radar, uměle obarveno) | https://planetarymaps.usgs.gov/mosaic/Venus_Magellan_C3-MDIR_Colorized_Global_Mosaic_4641m.tif | neověřeno jednotlivě | 4096; jen velká mapa – malá (oblačnost) zůstává, zblízka se prolne do radarového povrchu; střed 0° ověřen polohou Maxwell Montes (3° v. d.) |
| Pluto | USGS, New Horizons LORRI–MVIC Global Mosaic 300 m | https://planetarymaps.usgs.gov/mosaic/Pluto_NewHorizons_Global_Mosaic_300m_Jul2017_8bit.tif | Use Constraints: „Please cite authors“ | 4096; nahradit; zdroj má střed 180° → posun 0,5; 32 % bez dat (jih) vyplněno rozmazaným okolím |
| Charon | USGS, New Horizons LORRI–MVIC Global Mosaic 300 m | https://planetarymaps.usgs.gov/mosaic/Charon_NewHorizons_Global_Mosaic_300m_Jul2017_8bit.tif | stránka: Access „None“, Use Constraints začíná „Pl…“ (nejspíš „Please cite authors“) | 4096; nahradit; střed 0° podle GeoTIFFu → posun 0 (stránka produktu uvádí rozsah 0–360°, ale nejostřejší část – strana přivrácená k Plutu, kterou New Horizons fotil zblízka – leží uprostřed souboru; první pokus s posunem 0,5 byl o 180° vedle, Ondřej to poznal na snímku); 34 % bez dat vyplněno |
| Triton | USGS, Voyager 2 Color Mosaic Global Fill 600 m | https://planetarymaps.usgs.gov/mosaic/Triton_Voyager2_ClrMosaic_GlobalFill_600m.tif | neověřeno jednotlivě | 2048; nahradit; barvy zdroje jsou nepravé → převedeno na šedou s ručním odstínem (172, 156, 150); střed 0°, posun 0; 38 % bez dat vyplněno |
| Mimas | NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute, PIA18437 „Color Maps of Mimas – 2014“ | https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia18/pia18437/PIA18437.tif | NASA (kredit výše) | 2048; nahradit; barvy zdroje jsou zesílené → šedá s odstínem stávající mapy; střed 180° z. d. (kráter Herschel na 69 % šířky) → posun 0,5 |

## Nepoužito
- Saturn – POUŽITO 12. 11. 2026: Ondřej dodal `Cassini_ISS_RGB_Saturn_global_color_map_original.fits` (78 MB), `…_contrast_enhance.fits` (78 MB) a `Cassini_ISS_RED_Saturn_global_map.fits` (26 MB) ze složky `data_derived/`. Mapa vznikla z „original“ nástrojem `tools/make_saturn.py` (kontrast 2,0; 23 % řádků doplněno hladce). Soubory FITS se do repa neukládají (182 MB, kdykoli znovu ke stažení); zbylé dva nebyly použity.
- Saturn: skutečná barevná mapa z Cassini existuje v archivu NASA PDS – „Cassini ISS Global Maps of Jupiter and Saturn Bundle“ (Li, L., 2023; doi:10.17189/rkkb-6y30; https://atmos.nmsu.edu/PDS/data/PDS4/co_iss_global-maps/). Server má vadný certifikát, ze sandboxu z něj nejde stahovat.
  - Ondřej 12. 11. 2026 dodal náhledy ze složky `browse/` (7 souborů PNG 1167 × 875 s osami a popisky; vlastní mapa v nich má asi 875 × 437 px – méně než stávající mapa 1024 × 512, proto nepoužity a neukládány; jdou kdykoli stáhnout znovu): `Browse_Cassini_ISS_RGB_Saturn_global_color_map_original.png`, `…_contrast_enhance.png`, `Browse_Cassini_ISS_{RED,GRN,BL1,MT2}_Saturn_global_map.png`.
  - Plné rozlišení (0,1° = 3600 × 1800) je ve složce `data_derived/` pod stejnými názvy bez předpony `Browse_` (podle článku PNG i FITS). Data mají mezery: póly nad ±80°, pás −5° až −17° (stín prstenců) a rovník. Barevná mapa „original“ je věrná a nevýrazná, „contrast_enhance“ má nepravé barvy.
  - Totéž existuje pro Jupiter (2000) – může se hodit jinde. Mapa Björna Jónssona (bjj.mmedia.is, 2880 × 1440) nemá na stránce uvedenou licenci.
- Titan: vynechán po dohodě (zdroj USGS stažen: Titan_ISS_P19658_Mosaic_Global_4km.tif).
- Uran, Neptun: globální mapu jsem nenašla; z Voyageru 2 jsou jen jednotlivé snímky.
- Měsíce Uranu: mozaiky USGS z Voyageru 2 mají 1440 × 720 (space.jpl.nasa.gov/tmaps) – nejsou ostřejší než stávající 1024 × 512 natolik, aby to stálo za výměnu; severní polokoule nebyly vyfotografovány.
- Phobos, Země: beze změny (rozhodnutí Ondřeje). Deimos: nehledáno dál.

Přehled autorů a licencí všech map (i malých, převzatých ze Stellaria) je od verze 1.2 v `CREDITS.md` v kořeni repozitáře.

## Země – velká mapa (18. 11. 2026)
- Zdroj: NASA Blue Marble Next Generation, červenec 2004, verze „topography“ 5400 × 2700 (R. Stöckli, NASA Earth Observatory), volné dílo.
  Adresa: https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-topography/july/world.topo.200407.3x5400x2700.jpg
- Výroba: `python3 -I tools/maps/make_earth.py <soubor>` → `dist/maps/hi/earth.webp` (4096 × 2048, 687 kB). Pevnina a led z NASA, barva v hrubých
  rysech vyrovnaná s malou mapou; moře má NASA v této verzi skoro černé, proto barva moře zůstává ze stávající malé mapy. Malá mapa beze změny.
- Vrstva mraků `earth_aux.webp`: vyčištěna od stop pobřeží (`tools/maps/clean_earth_aux.py`), uložena bezeztrátově (1,35 MB).
- Zkoušené a zamítnuté: verze s reliéfem mořského dna (na glóbu vypadá nevěrohodně), náhrada celé mapy verzí NASA (moře skoro černé).

## Úroveň 2 – dlaždice zblízka (verze 1.8m, 19. 11. 2026)
Třetí úroveň map: dlaždice 1024 px (+1 px okraje, tedy 1026 × 1026) z primárních mozaik ve 16 384 × 8 192 nebo 8 192 × 4 096 px,
`dist/maps/l2/<id>/<řádek>-<sloupec>.webp` (řádek 0 = sever), seznam `src/data/l2.json`. Načítá je `src/render/l2.js` jen pro těleso
v ohnisku, jen zblízka a jen ty, na které se díváš.

Výroba: `node tools/maps/l2_resize.mjs <zdroj> <šířka> <pracovní.raw> seda` (proudově přes sharp/libvips, bez načtení celého zdroje)
→ `python3 -I tools/maps/make_l2.py <pracovní.raw> <id> 78 [--zeme] [--l1]`. Barvy a jas určuje stávající velká mapa (úroveň 1);
ze zdroje se přebírá jen jemná kresba nad jejím rozlišením („přenos detailu“: L2 = zvětšená L1 × ((Y + 6) / (Ynízké + 6))^γ),
takže zmenšená úroveň 2 dá zase úroveň 1 (odchylka 0,5–2,7 z 255) a při doostření nic neblikne. Natočení se zjišťuje korelací
se stávající mapou – u všech těles vyšlo stejně jako posun zapsaný výše. Kde zdroj nemá data, zůstává úroveň 1 (nic se nepřikresluje).

| Těleso | Úroveň 2 | Zdroj kresby | Dlaždice | Poznámka |
|---|---|---|---|---|
| Země | 16 384 | NASA Blue Marble NG, červenec 2004, topography 21 600 × 10 800 (`world.topo.200407.3x21600x10800.jpg`, assets.science.nasa.gov) | 5,1 MB | `--zeme`: pevnina ze zdroje s barvou podle L1, moře z L1 (zdroj ho má skoro černé), ostré pobřeží; mraky a světla měst zůstávají 2048 px |
| Měsíc | 16 384 | NASA SVS 4720, CGI Moon Kit, `lroc_color_poles_16k.tif` | 11,3 MB | stejný produkt jako L1, jen v plném rozlišení |
| Mars | 16 384 | USGS, Viking MDIM 2.1 Global Mosaic 232 m (šedá, `Mars_Viking_MDIM21_Mosaic_global_232m.tif`, 4,2 GB) | 10,0 MB | barva z L1 zmenšené na 1024 px (`L2_REF=1024`), kresba z MDIM 2.1, γ 0,75 ručně (`L2_GAMA`), posun 0 ručně (`L2_POSUN`; korelace s barevnou L1 je slabá, ověřeno jemnou kresbou); **L1 přepsána** zmenšeninou (výrazně ostřejší). Barevná mozaika Viking 925 m dala jen malé zlepšení (je měkká) – nepoužita |
| Merkur | 16 384 | USGS, MESSENGER MDIS MD3 Color 665 m | 20,2 MB | největší zisk ze všech |
| Pluto | 16 384 | USGS, New Horizons LORRI–MVIC 300 m | 4,1 MB | ostrá jen strana nalétnutí sondy, zbytek zůstává rozmazaný (skutečnost dat) |
| Venuše | 8 192 | USGS, Magellan C3-MDIR Colorized 4641 m (zdroj má přesně 8192 px) | 5,5 MB | radar; prolínání s oblačností jako u L1 |
| Europa | 8 192 | USGS, Voyager–Galileo SSI 500 m | 2,6 MB | |
| Ganymed | 8 192 | USGS, Voyager–Galileo SSI Color 1435 m | 2,3 MB | |
| Callisto | 8 192 | USGS, Voyager–Galileo SSI 1 km | 1,9 MB | |
| Vesta | 8 192 | USGS/DLR, Dawn FC HAMO 74 ppd | 1,5 MB | |
| Enceladus | 8 192 | USGS, Cassini 110 m | 2,2 MB | |
| Dione | 8 192 | USGS, Cassini–Voyager 154 m | 2,8 MB | L1 2048 → 4096 |
| Iapetus | 8 192 | USGS, Cassini–Voyager 783 m | 1,8 MB | L1 2048 → 4096 |
| Rhea, Tethys, Triton | – | jako L1 | – | jen L1 2048 → 4096 (zmenšenina 8k); dlaždice by nic nepřidaly |

Celkem 13 těles s úrovní 2 (71 MB) a 5 těles s ostřejší úrovní 1. Licence: vše volné dílo NASA/USGS, u USGS „Please cite authors“
(autoři jsou v CREDITS.md). Velké zdrojové soubory se do repa neukládají (4,5 GB + 4,2 GB MDIM), adresy jsou výše.

### Zpracováno a vyřazeno (zisk do pár procent – podle zadání „nepálit úsilí na 3 %“)
Io (USGS 1 km – většina mozaiky je zvětšený Voyager), Charon (300 m jen na malé části), Ceres (zdroj 20 ppd = 7200 px; mozaika 140 m
na USGS nedostupná – odkaz vrací 404), Tethys, Rhea, Triton (dlaždice téměř shodné s L1). Měřítko zisku: střední kvadratický rozdíl jasu
mezi dlaždicí a zvětšenou L1 ve výřezu s nejvíc kresbou (Merkur 25, Venuše 11, Dione 8, Měsíc 7, Země 6, … Io 1,5, Mars-Viking 1,6).

### Nehledáno dál / bez lepšího zdroje
- Saturn – vynecháno podle Ondřeje (19. 11. 2026). Titan – dřívější dohoda (haze, mapa ukazuje povrch v infračerveném).
- Jupiter – Hubble OPAL má stejné rozlišení 0,1° (3600 px) jako náš Cassini PIA07782; žádná větší globální mapa s jasnou licencí.
- Uran, Neptun – globální mapa neexistuje. Měsíce Uranu – Voyager 2, 1440 px, jen jižní polokoule.
- Solar System Scope (CC BY 4.0) – 8k textury s „vymyšleným terénem“ v mezerách a přisycenými barvami: méně poctivé a ne ostřejší než primární zdroje výše.
- Mraky a noční světla Země ve vyšším rozlišení – archiv NASA NEO (`neo.gsfc.nasa.gov/archive/bluemarble/`) byl přesunut, soubory nejsou dostupné.
