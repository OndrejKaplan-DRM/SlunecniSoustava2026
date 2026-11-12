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

Uvádět: NASA / JPL / USGS (Mars, Europa), NASA's Scientific Visualization Studio (Měsíc).
