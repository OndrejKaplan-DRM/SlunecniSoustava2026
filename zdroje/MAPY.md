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
Třetí úroveň map: **pyramida** dlaždic 1024 px (+1 px okraje, tedy 1026 × 1026). Stupeň z má (8 · 2^z) × (4 · 2^z) dlaždic:
z = 0 → 8 192 px po obvodu, z = 1 → 16 384, z = 2 → 32 768 (jen Země a Měsíc). Soubory `dist/maps/l2/<id>/<z>-<řádek>-<sloupec>.webp`
(řádek 0 = sever), seznam `src/data/l2.json` = nejjemnější stupeň tělesa. Načítá je `src/render/l2.js` jen pro těleso v ohnisku,
jen zblízka a jen ty, na které se díváš – v každém místě stupeň, jehož texel je zhruba velký jako pixel. Stupeň 8k plynule navazuje
na úroveň 1 (4096 px) a odstranil rozmazané pásmo mezi úrovní 1 a 16k, které Ondřej viděl na notebooku (Měsíc, Merkur, Mars
z 2–3 tisíc km).

Výroba: `node tools/maps/l2_resize.mjs <zdroj> <šířka> <pracovní.raw> seda` (proudově přes sharp/libvips, bez načtení celého zdroje)
→ `python3 -I tools/maps/make_l2.py <pracovní.raw> <id> 78 [--zeme] [--l1]` (nejjemnější stupeň z mapy, hrubší jejím zmenšením
průměrem 2 × 2; `tools/maps/l2_tiles.py`). Barvy a jas určuje stávající velká mapa (úroveň 1, nebo jiná mapa přes `L2_L1`);
ze zdroje se přebírá jen jemná kresba nad jejím rozlišením („přenos detailu“: L2 = zvětšená L1 × ((Y + 6) / (Ynízké + 6))^γ),
takže zmenšená úroveň 2 dá zase úroveň 1 (odchylka 0,5–2,8 z 255) a při doostření nic neblikne. Natočení se zjišťuje korelací
se stávající mapou – u všech těles vyšlo stejně jako posun zapsaný výše. Kde zdroj nemá data, zůstává úroveň 1 (nic se nepřikresluje).
Stávající dlaždice 16k a 8k převedl na stupně `python3 -I tools/maps/l2_tiles.py <id>` (přejmenování + hrubší stupeň zmenšením).

| Těleso | Nejjemnější | Zdroj kresby | Dlaždice | Poznámka |
|---|---|---|---|---|
| Země | 32 768 | NASA Blue Marble NG, červenec 2004, topography 500 m: 8 dlaždic `world.topo.200407.3x21600x21600.{A1…D2}.jpg` (assets.science.nasa.gov), každá zmenšena na 8192² a složena | 24,8 MB | `--zeme`: pevnina ze zdroje s barvou podle L1, moře z L1 (zdroj ho má skoro černé), ostré pobřeží; mraky zůstávají 2048 px; noční světla zvlášť (níže) |
| Měsíc | 32 768 | stupně 16k a 8k: NASA SVS 4720, CGI Moon Kit, `lroc_color_poles_16k.tif` (barva, albedo); jemná kresba 32k: USGS, LRO LROC WAC Global Morphology Mosaic 100 m (`Lunar_LRO_LROC-WAC_Mosaic_global_100m_June2013.tif`, 109 164 × 54 582, 6,0 GB) | viz níže | 69,2 MB | dva průchody: 1) SVS 16k přenesená na tóny L1 (korelace 0,976, γ 1,04; `L2_KEEP`), 2) jemná kresba WAC na tuto mapu (`L2_L1`, `L2_POSUN=0` – korelace 0,67, druhý vrchol 0,66, posun ověřen i v šířce; γ 0,6 ručně `L2_GAMA`). Stupeň 32k s kvalitou 66 (`L2_Q2`) a bez krajního řádku dlaždic u pólů (`L2_POLY=1`, nad 78,75° by ho shader skoro nikdy neukázal); l2.json `[2, 1]` |
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

Celkem 13 těles s úrovní 2 (159 MB: Měsíc 69, Země 25, Merkur 26, Mars 13, Pluto 5, ostatní 8k po 1,5–5,6) a 5 těles s ostřejší
úrovní 1. Licence: vše volné dílo NASA/USGS, u USGS „Please cite authors“ (autoři jsou v CREDITS.md). Velké zdrojové soubory se do repa
neukládají (desítky GB), adresy jsou výše.

**Měsíc 32k – proč dva zdroje a γ 0,6.** Barevná mapa SVS (albedo, Slunce „v zádech“) má v nejjemnějším pásmu velmi malý kontrast
(směrodatná odchylka log jasu v oktávě 16k 0,024), takže 32k ze stejného druhu dat by bylo jen o pár procent ostřejší. Mozaika WAC
100 m je „morfologická“ (snímky při šikmém Slunci, dopad 55–75°): krátery mají stín a světlou stěnu (oktáva 32k 0,088). Přenáší se
jen nejjemnější oktáva (pod 670 m), barvy i vše hrubší zůstává z SVS sladěné s L1 – zmenšený stupeň 32k dá zase tuto mapu 16k
(odchylka 3,5 z 255). Pozor: bez prvního průchodu byly dlaždice o třetinu tmavší než L1 (L1 Měsíce je proti SVS zesvětlená) – při
doostření by Měsíc „zešedl“; zachytil to snímek z testu 19. 11. večer.
γ 0,6 je kompromis z porovnání výřezů (0,3 skoro nic nepřidá, 1,0 je proti měkké barevné mapě příliš tvrdé). Omezení: stínování
je „zapečené“ z jednoho směru Slunce, aplikace osvětluje podle skutečné polohy Slunce – u kráterů menších než asi 1 km to může
u terminátoru vypadat jako opačné nasvícení. Stejně tak mají zapečené stínování zdroje Marsu (MDIM), Merkuru (MDIS) a Země (BMNG topography).
Od 3. kola k tomu reliéf podle skutečného Slunce z výškové mapy LOLA (oddíl níže) pro tvary větší než asi 4 km.

**Póly (Antarktida, Arktida, póly Měsíce).** Mapy jsou ve válcové projekci: u pólu je texel v délce zúžený o cos šířky, v šířce ne.
Shader volí stupeň podle horšího směru, takže u pólu ukáže jemnější stupeň až zblízka a ve směru poledníků zůstává obraz roztažený –
na Antarktidě z 1 300 km to vypadá jako jemné „pruhy“ k pólu (ověřeno: nejsou to mraky, zůstanou i bez pomocné mapy). Oprava by
chtěla zvláštní dlaždice v polární projekci (čepičky nad ±60°) – zapsáno jako možné pokračování.

### Reliéf Měsíce (verze 1.8m, pokus)
`dist/maps/hi/moon_relief.webp`, 5760 × 5760 šedá, 5,4 MiB: nahoře sklon terénu k východu, dole k severu (5760 × 2880 každý,
1,9 km/px), hodnota 128 + sklon · 160. Zdroj USGS Astrogeology, LRO LOLA DEM 128 px/° (`Lunar_LRO_LOLA_DEM_Global_128ppd_v04.cub`,
2,1 GB, 237 m/px), zprůměrováno 8 × 8; výroba `python3 -I tools/maps/moon_relief.py <cube> <výstup>`. Načítá se s velkou mapou Měsíce
(jeden kanál R8, 44 MB v grafice) a shader podle sklonu nakloní normálu – osvětlení terénu tak odpovídá skutečnému Slunci:
u terminátoru krátery a pohoří vrhají „stín“ na odvrácenou stěnu (bez vržených stínů na okolí). Kontrola polohy: korelace sklonu
k východu s jemnou kresbou mozaiky WAC je nejvyšší při posunu 0 (0,18; ±2 px už 0,10 a 0,03), a vyšla kladná – mozaika WAC
je tedy snímaná se Sluncem od západu (zapečené stínování na stupni 32k). Krátery menší než asi 4 km reliéf nemají (rozlišení mapy);
nejjemnější pak dodává zapečené stínování WAC.

### Noční světla Země (verze 1.8m)
`dist/maps/hi/earth_lights.webp`, 8192 × 4096, šedá (načítá se jako jeden kanál R8, 43 MB v grafice se zmenšeninami), 0,7 MB.
Zdroj NASA Earth Observatory, Black Marble 2016, `BlackMarble_2016_3km_gray.jpg` (13 500 × 6 750, 3 km; assets.science.nasa.gov,
image record 144897), zmenšeno Lanczosem a zesíleno 1,18× (shoda s jasem dosavadních světel v pomocné mapě `earth_aux` – shader
světla umocňuje na druhou). Načítá se s velkou mapou Země a zahazuje se s ní; zdálky zůstávají světla z pomocné mapy 2048 px.
Dřív (2048 px, asi 20 km na pixel) byla světla měst v noci zblízka rozmazaná do čtverců (Ondřejovy snímky 19. 11. 2026).
Black Marble existuje i v 500 m (dlaždice A1–D2) – pro světla ve stupních dlaždic jako možné pokračování.

### Zpracováno a vyřazeno (zisk do pár procent – podle zadání „nepálit úsilí na 3 %“)
Io (USGS 1 km – většina mozaiky je zvětšený Voyager), Charon (300 m jen na malé části), Ceres (zdroj 20 ppd = 7200 px; mozaika 140 m
na USGS nedostupná – odkaz vrací 404), Tethys, Rhea, Triton (dlaždice téměř shodné s L1). Měřítko zisku: střední kvadratický rozdíl jasu
mezi dlaždicí a zvětšenou L1 ve výřezu s nejvíc kresbou (Merkur 25, Venuše 11, Dione 8, Měsíc 7, Země 6, … Io 1,5, Mars-Viking 1,6).

### Nehledáno dál / bez lepšího zdroje
- Saturn – vynecháno podle Ondřeje (19. 11. 2026). Titan – dřívější dohoda (haze, mapa ukazuje povrch v infračerveném).
- Jupiter – Hubble OPAL má stejné rozlišení 0,1° (3600 px) jako náš Cassini PIA07782; žádná větší globální mapa s jasnou licencí.
- Uran, Neptun – globální mapa neexistuje. Měsíce Uranu – Voyager 2, 1440 px, jen jižní polokoule.
- Solar System Scope (CC BY 4.0) – 8k textury s „vymyšleným terénem“ v mezerách a přisycenými barvami: méně poctivé a ne ostřejší než primární zdroje výše.
- Mraky Země ve vyšším rozlišení – archiv NASA NEO (`neo.gsfc.nasa.gov/archive/bluemarble/`) byl přesunut, soubory nejsou dostupné. (Noční světla viz výše – Black Marble 2016.)
