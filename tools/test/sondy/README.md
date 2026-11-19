# Sondy

Jednorázové skripty z ladění, ponechané pro příští práci. Nejsou to regresní testy (nic nehlásí jako chybu, jen vypisují).
Pouštějí se z kořene repa: `node tools/test/sondy/<jméno>.mjs`.

- `v16.mjs` – průchod 13 body verze 1.6 (úvod, dětská lišta měsíců, kino, Stroj času, volná rotace přes pól, Superkarta, karta úkazu); snímky do `/tmp/w_*.jpg`.
- `tap.mjs` – pět skutečných kliknutí myší na těleso a výpis událostí `tap` s časy.
- `fps.mjs [složka]` – snímková frekvence po startu (v prostředí bez grafické karty kolísá 2–60 snímků/s).
