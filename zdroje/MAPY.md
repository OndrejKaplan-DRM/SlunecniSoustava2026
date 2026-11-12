# Velké mapy těles (`dist/maps/hi/`) – zdroje

Zpracování: `tools/make_hi.py` – zmenšení na 4096 × 2048 (rovnoúhlá projekce 2 : 1), pootočení na nultý poledník stávající mapy (ověřeno korelací), vyrovnání jasu a barev se stávající mapou `dist/maps/<id>.webp`, WebP. Kde zdroj nemá data, zůstává zvětšená stávající mapa; nic se nepřikresluje.

| Těleso | Zdroj | Soubor | Licence | Zpracování |
|---|---|---|---|---|
| Mars | USGS Astrogeology, Viking Colorized Global Mosaic 925 m | https://planetarymaps.usgs.gov/mosaic/Mars_Viking_ClrMosaic_global_925m.tif | dílo USGS / NASA (volné dílo vlády USA) – **stránku produktu jsem v této sešně neotevřela, ověřit** | posun 0,5 (korelace se stávající mapou 0,963), kvalita 90, 0,82 MB |
| Měsíc | NASA Scientific Visualization Studio, CGI Moon Kit (LROC WAC), https://svs.gsfc.nasa.gov/4720 | https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_4k.tif | NASA SVS – **podmínky na stránce jsem v této sešně neotevřela, ověřit** | bez posunu (korelace 0,984), kvalita 85, 1,52 MB |
| Europa | USGS Astrogeology, Europa Voyager – Galileo SSI Global Mosaic 500 m (T. Becker, 2010), https://astrogeology.usgs.gov/search/map/europa_voyager_galileo_ssi_global_mosaic_500m | https://planetarymaps.usgs.gov/mosaic/Europa_Voyager_GalileoSSI_global_mosaic_500m.tif | „Use Constraints: None“ (stránka produktu, ověřeno 2026-11-12) | šedý zdroj, barva ze stávající mapy; posun 0,5 (korelace jen 0,42 – stávající mapa je jiného původu); 4,3 % plochy bez dat (okolí jižního pólu) → stávající mapa; kvalita 85, 1,47 MB |

Uvádět: NASA / JPL / USGS (Mars, Europa), NASA's Scientific Visualization Studio (Měsíc).
