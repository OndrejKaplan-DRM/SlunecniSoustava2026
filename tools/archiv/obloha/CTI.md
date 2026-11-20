# Pomocné skripty k objektům na obloze (verze 2.0, 20. 11. 2026)

Jednorázové nástroje, kterými vznikl výběr 157 objektů. K sestavení dat nejsou potřeba – to dělá `tools/data/obloha_build.py`,
který si všechny vstupy stahuje sám do pracovní složky. Cesty ve skriptech jsou natvrdo podle pracovního stroje; před použitím je uprav.

| Soubor | K čemu byl |
|---|---|
| `hledej3.py` | hledání snímků kandidátů v archivech ESO a ESA/Webb (vyhledávání ESA/Hubble bylo příliš pomalé) |
| `meta3.py` | čtení stránek snímků: pole „Distance“, autor, rozměry; z výstupu vznikl `vyber3.json` |
| `vyber3.json` | kandidáti vzdáleného vesmíru s nalezenými snímky (z nich je 52 nových objektů) |
| `hip.py` | zkouška dotazu na katalog Hipparcos v archivu ESA (TAP) pro hvězdy |
| `mapa.py` | zkouška výřezu z mapy hvězd NASA SVS (`starmap_2020_16k.exr`); hotová funkce je `hvezdna_mapa` v `obloha_build.py` |
| `snimky_obloha.mjs` | snímky vrstvy objektů (počítač, telefon): pohledy na husté oblasti, seznam, scéna hvězdy |
| `kontrola_souboru.mjs` | otevře soubor na flashku z `file://` a ověří 157 objektů, načtení vložených souborů, žádnou síť a žádné chyby |
