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

## Nepoužito
- Venuše (Magellan, radar) a Titan (Cassini ISS, blízké infračervené): zdroj ukazuje povrch, stávající mapa oblačnost – jiný jev, rozhodnutí je na Ondřejovi.
- Pluto, Charon, Triton: zdroje USGS staženy, ale stávající mapy s nimi nejdou spolehlivě slícovat a třetina povrchu nemá data.
- Phobos: Viking 40 px/° není ostřejší než stávající mapa.
- Země: eoimages.gsfc.nasa.gov (Blue Marble) ze sandboxu nedostupné.
- Saturn, Uran, Neptun, Mimas, Deimos, měsíce Uranu: nenašla jsem volnou globální mozaiku ve vyšším rozlišení.

Uvádět: NASA / JPL / USGS (Mars, Europa), NASA's Scientific Visualization Studio (Měsíc).
