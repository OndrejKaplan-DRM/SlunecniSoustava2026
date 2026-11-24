# Referenční snímky: model × skutečnost

Každý list ukazuje pohled z povrchu v modelu (vlevo) a u úkazů ze sond skutečnou fotografii NASA (vpravo). Čísla pod snímkem porovnávají model s JPL Horizons (nezávislá efemerida NASA/JPL): úhel mezi směrem modelu a Horizons pro každé těleso a u úkazů čas a vzdálenost největšího přiblížení, které model najde sám. Fotografie mají přibližné místo a čas z popisu NASA; přesný okamžik úkazu je z Horizons. U pomalých úkazů (konjunkce planet) je minimum vzdálenosti ploché a jeho čas sám nic neříká – rozhoduje vzdálenost. Staví `node tools/test/ref_snimky.mjs` → `SCENY_JSON=… npm run test:sceny` → `python3 -I tools/test/ref_slozit.py`.

| Scéna | Kdy (UT) | Úkaz: model − Horizons | Poloha, nejhůř | Fotografie |
|---|---|---|---|---|
| [Phobos přechází přes Slunce nad kráterem Jezero (Perseverance, Mastcam-Z, sol 397)](ref/phobos_slunce_jezero_2022.jpg) | 2022-04-02 10:54:45 | -5 s, 2.18′ × 1.92′ | 4.51′ | PIA25179, NASA/JPL-Caltech/ASU/MSSS/SSI |
| [Deimos přechází přes Slunce nad kráterem Gale (Curiosity, Mastcam, sol 2350)](ref/deimos_slunce_gale_2019.jpg) | 2019-03-17 18:05:22 | -10 s, 6.85′ × 4.92′ | 2.43′ | PIA23134, NASA/JPL-Caltech/MSSS |
| [Phobos zakrývá Deimos, pohled z kráteru Gale (Curiosity, Mastcam, sol 351)](ref/phobos_deimos_gale_2013.jpg) | 2013-08-01 08:41:48 | +0 s, 2.30′ × 4.10′ | 2.56′ | PIA17350, NASA/JPL-Caltech/Malin Space Science Systems/Texas A&M Univ. |
| [Země a Měsíc na večerní obloze Marsu asi 80 minut po západu Slunce (Curiosity, sol 529)](ref/zeme_mesic_z_marsu_2014.jpg) | 2014-01-31 22:20:10 | — | 24.6″ | PIA17936, NASA/JPL-Caltech/MSSS/TAMU |
| [Země a Měsíc na večerní obloze Marsu asi 80 minut po západu Slunce (Curiosity, sol 529) (výřez)](ref/zeme_mesic_z_marsu_2014_detail.jpg) | 2014-01-31 22:20:10 | — | 24.6″ | PIA17936, NASA/JPL-Caltech/MSSS/TAMU |
| [Země na ranní obloze Marsu hodinu před východem Slunce (Spirit, Gusev, sol 63)](ref/zeme_ranni_spirit_2004.jpg) | 2004-03-08 12:18:49 | — | 51.7″ | PIA05547, NASA/JPL/Cornell/Texas A&M |
| [Ranní obloha nad Prahou 21. 11. 2026 v 6:30 SEČ (otcovo pozorování: jasné těleso na JV = Venuše)](ref/venuse_praha_2026.jpg) | 2026-11-21 05:30:00 | — | 24.3″ | — |
| [Velká konjunkce Jupiteru a Saturnu, pozorovatel v Praze (nejtěsnější od roku 1623)](ref/velka_konjunkce_praha_2020.jpg) | 2020-12-21 18:26:16 | -115 s, 6.11′ × 6.11′ | 13.5″ | — |
| [Úplné zatmění Slunce 8. 4. 2024, Dallas (Texas)](ref/zatmeni_dallas_2024.jpg) | 2024-04-08 18:42:39 | -10 s, 0.44′ × 0.42′ | 7.2″ | — |
| [Jupiter z Io: na nultém poledníku a rovníku stojí Jupiter (skoro) přesně v nadhlavníku – vázaná rotace](ref/jupiter_z_io_2026.jpg) | 2026-11-21 00:00:00 | — | 3.79′ | — |
| [Země nad údolím Taurus-Littrow během mise Apollo 17](ref/zeme_z_mesice_apollo17.jpg) | 1972-12-13 12:00:00 | — | 13.5″ | — |

Fotografie NASA jsou volná díla (NASA Image and Video Library, images.nasa.gov), uvedení autorů podle popisu snímku; v repu jsou jen zmenšené kopie pro porovnání, aplikace je nenačítá.
