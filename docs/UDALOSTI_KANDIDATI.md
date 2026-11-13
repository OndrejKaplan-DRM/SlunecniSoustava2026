# Kandidáti událostí pro verzi 1.3 – tabulka ke schválení

Stav 13. 11. 2026, větev `iterace-14`. **80 kandidátů → po schválení 60 událostí a 30 karet.** Nic z toho zatím není v aplikaci.

## Jak tabulku číst
- **Model** = co spočítala aplikace (`tools/test/probe_kandidati.mjs`), **Pramen** = hodnota z katalogu nebo literatury. Časy jsou světový čas (UT).
- Data před 15. 10. 1582 jsou juliánská, jak je uvádějí prameny (aplikace ukazuje gregoriánská; juliánské datum bude jen na kartě).
- ▸ u data = událost teprve nastane (po 13. 11. 2026).
- Body (nejvýš 20) = **Z** zajímavost úkazu + **P** příběh + **M** shoda modelu s pramenem + **O** ověřitelnost pramenem, každé 1–5.
  Z a P jsou můj odhad, M je spočítané, O podle druhu pramene (katalog NASA/JPL 5, odborný článek nebo Wikipedie s citací 3–4, jen datum 2).
- Supernovy a novy model nepočítá (nejsou to tělesa soustavy); jejich body jsou přepočtené ze tří kritérií na stupnici do 20.
- U zatmění Slunce: „osa“ = zeměpisná šířka / délka místa největšího zatmění (východní délka kladná); „Praha“ = největší zakrytý díl průměru Slunce v Praze.

## Co z měření vyšlo
1. **Zatmění Slunce (16):** čas největší fáze do 3 minut, osa stínu do 1–3°, a to i v letech −584 a −430.
2. **Pás totality má model posunutý až o zhruba 100 km** (zkrácená řada Měsíce, 30–60″). V Praze proto rok 1706 vychází 0,987 místo úplného
   a rok 1133 úplné místo 0,973. Kde bylo zatmění úplné, musí karta brát z pramenů; model ukáže geometrii přibližně.
3. **Zatmění Měsíce (8):** čas do 2 minut, velikost do 0,03, délka úplné fáze do 6 minut.
4. **Přechody (10):** nejmenší vzdálenost na 0,02–0,06′; čas vychází soustavně o 6 minut dřív, protože model ukazuje skutečné polohy,
   ne zdánlivé (nepočítá dobu letu světla). Na kartě budou časy z pramenů.
5. **Konjunkce a zákryty (14):** velké konjunkce na 0,02–0,11′ proti tabulce; zákryty 1170, 1590, 1613, 1818 a 2065 model potvrzuje
   (vzdálenost středů pod 0,3′). Zákryt Merkuru Venuší 1737 vychází ze středu Země 0,63′ – na hraně.
6. **Komety (8):** s elementy daného návratu z JPL Horizons sedí na 4 platné číslice (Halley 837: 0,0334 AU; 1910: 0,1514 AU).
   Mechanismus „elementy pro událost“ tedy funguje a karty s kometami jsou proveditelné.
7. **Průlety planetek (5 z 8) potřebují totéž:** Eros 1931, Duende 2013, Phaethon 2093 a Bennu 2135 s dnešními elementy z katalogu nesedí
   (Duende má v katalogu dráhu až po průletu, který ji změnil). Mars 2003 a 2287 a Apophis 2029 sedí.
8. **Seskupení (8):** prameny dávají jen datum; rozpětí je z modelu. Nejslabší skupina co do ověřitelnosti.

## Časové rozložení
58 minulých a 22 budoucích (28 %). Cíl byl 40 % budoucích – supernovy jsou z podstaty jen minulé a historické příběhy převažují.
Náhradníci do budoucnosti (zatím nespočítaní, prameny jsou po ruce): přechod Venuše 8. 12. 2125, přechod Merkuru 7. 11. 2039,
Merkur zakryje Neptun 15. 7. 2067, Merkur zakryje Mars 11. 8. 2079, Venuše přejde přes Jupiter 14. 9. 2123,
zatmění Slunce 23. 9. 2090 a 14. 6. 2151, návrat Halleyovy komety 2134 (těsnější průlet kolem Země než 2061).

## Tabulka (seřazeno podle bodů)
| # | Body | Kategorie | Datum | Událost | Model | Pramen | Z | P | M | O | Poznámka |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **20** | Zatmění Slunce | 7. 6. 1415 | Úplné zatmění nad Čechami měsíc před upálením Husa | 07:19 UT, osa 59,0° / 73,5°; Praha 1,01 | 07:18 UT, osa 59,2° / 73,7°; Praha úplné | 5 | 5 | 5 | 5 |  |
| 2 | **20** | Přechod | 4. 12. 1639 | První pozorovaný přechod Venuše (Horrocks) | 8,76′, 18:19 UT | 8,73′, 18:25 UT | 5 | 5 | 5 | 5 |  |
| 3 | **20** | Přechod | 6. 6. 1761 | Přechod Venuše 1761 (Lomonosov: atmosféra) | 9,47′, 05:15 UT | 9,51′, 05:19 UT | 5 | 5 | 5 | 5 |  |
| 4 | **20** | Přechod | 3. 6. 1769 | Přechod Venuše 1769 (Cook na Tahiti, Hell ve Vardø) | 10,18′, 22:23 UT | 10,15′, 22:25 UT | 5 | 5 | 5 | 5 |  |
| 5 | **20** | Kometa | 20. 5. 1910 | Halleyova kometa 1910: Země prošla jejím ohonem | 0,1514 AU, 20. 5. 12:51 UT | 0,1514 AU, 12:50 UT | 5 | 5 | 5 | 5 |  |
| 6 | **20** | Zatmění Slunce | 29. 5. 1919 | Eddingtonovo zatmění (ohyb světla, Einstein) | 13:09 UT, osa 3,7° / −16,9°; Praha 0,00 | 13:09 UT, osa 4,4° / −16,7°; Praha nevidět | 5 | 5 | 5 | 5 |  |
| 7 | **20** | Zatmění Slunce | 11. 8. 1999 | Zatmění 11. 8. 1999 (střední Evropa) | 11:04 UT, osa 44,4° / 24,0°; Praha 0,93 | 11:03 UT, osa 45,1° / 24,3°; Praha 0,95 | 5 | 5 | 5 | 5 |  |
| 8 | **19** | Zatmění Slunce | 28. 5. 585 př. n. l. | Thalétovo zatmění (bitva na řece Halys) | 14:20 UT, osa 38,1° / −44,5°; Praha 0,83 | 14:22 UT, osa 38,2° / −45,0°; Praha 0,83 | 5 | 5 | 5 | 4 |  |
| 9 | **19** | Kometa | 10. 4. 837 | Halleyova kometa 837: nejtěsnější průlet komety kolem Země v dějinách (ohon přes půl oblohy) | 0,0334 AU, 10. 4. 12:13 UT | 0,0334 AU, 12:00 UT | 5 | 4 | 5 | 5 |  |
| 10 | **19** | Zatmění Měsíce | 1. 3. 1504 | Kolumbovo zatmění na Jamajce | 00:43 UT, velikost 1,12, úplné 54 min | 00:42 UT, velikost 1,10, úplné 48 min | 4 | 5 | 5 | 5 |  |
| 11 | **19** | Přechod | 7. 11. 1631 | První pozorovaný přechod Merkuru (Gassendi) | 2,41′, 07:14 UT | 2,44′, 07:20 UT | 4 | 5 | 5 | 5 |  |
| 12 | **19** | Zatmění Slunce | 3. 5. 1715 | Halleyovo zatmění (první mapa pásu totality) | 09:37 UT, osa 58,0° / 18,7°; Praha 0,89 | 09:36 UT, osa 59,4° / 17,9°; Praha 0,86 | 4 | 5 | 5 | 5 |  |
| 13 | **19** | Kometa | 13. 3. 1759 | První předpovězený návrat Halleyovy komety (Palitzsch, Clairaut) | 0,5845 AU, 13. 3. 01:29 UT | 0,5845 AU, 01:30 UT | 4 | 5 | 5 | 5 |  |
| 14 | **19** | Zatmění Slunce | 18. 8. 1868 | Zatmění, při kterém bylo objeveno helium | 05:13 UT, osa 9,7° / 101,9°; Praha 0,00 | 05:12 UT, osa 10,6° / 102,2°; Praha nevidět | 4 | 5 | 5 | 5 |  |
| 15 | **19** | Průlet | 13. 4. 2029 ▸ | Apophis proletí blíž než stacionární družice (pátek 13. 4. 2029) | 38 029 km, 13. 4. 21:46 UT | 38 011 km, 21:46 UT | 5 | 4 | 5 | 5 |  |
| 16 | **19** | Kometa | 28. 7. 2061 ▸ | Příští návrat Halleyovy komety | 0,5928 AU, 28. 7. 17:15 UT | 0,5928 AU, 17:17 UT | 5 | 4 | 5 | 5 |  |
| 17 | **19** | Zatmění Slunce | 7. 10. 2135 ▸ | Příští úplné zatmění v Česku | 08:57 UT, osa 21,3° / 57,8°; Praha 0,96 | 08:55 UT, osa 20,3° / 57,6°; Praha 0,99 | 5 | 4 | 5 | 5 |  |
| 18 | **18** | Zatmění Měsíce | 28. 8. 413 př. n. l. | Níkiovo zatmění (zkáza Athéňanů u Syrakus) | 20:54 UT, velikost 1,10, úplné 47 min | 20:55 UT, velikost 1,08, úplné 43 min | 4 | 5 | 5 | 4 |  |
| 19 | **18** | Zatmění Měsíce | 20. 9. 331 př. n. l. | Zatmění před bitvou u Gaugamél | 18:24 UT, velikost 1,18, úplné 60 min | 18:24 UT, velikost 1,21, úplné 64 min | 4 | 5 | 5 | 4 |  |
| 20 | **18** | Kometa | 24. 4. 1066 | Halleyova kometa 1066 (tapisérie z Bayeux, bitva u Hastingsu) | 0,1043 AU, 23. 4. 13:17 UT | přísluní 20. 3. 1066 | 5 | 5 | 4 | 4 |  |
| 21 | **18** | Zatmění Měsíce | 22. 5. 1453 | Zatmění při obléhání Konstantinopole | 17:18 UT, velikost 0,76, úplné 0 min | 17:16 UT, velikost 0,74, úplné 0 min | 3 | 5 | 5 | 5 |  |
| 22 | **18** | Konjunkce | 25. 8. 1563 | Konjunkce 1563: tabulky se spletly o měsíc a Tycho Brahe se rozhodl měřit sám | 6,78′, 25. 8. 17:57 UT | 6,80′ | 4 | 5 | 5 | 4 |  |
| 23 | **18** | Zatmění Slunce | 8. 7. 1842 | Zatmění 1842 (Vídeň, Baily, Stifter) | 07:06 UT, osa 49,8° / 83,5°; Praha 0,94 | 07:06 UT, osa 50,1° / 83,6°; Praha 0,95 | 4 | 4 | 5 | 5 |  |
| 24 | **18** | Přechod | 8. 6. 2004 | Přechod Venuše 2004 | 10,39′, 08:14 UT | 10,45′, 08:20 UT | 5 | 3 | 5 | 5 |  |
| 25 | **18** | Přechod | 6. 6. 2012 | Přechod Venuše 2012 | 9,28′, 01:21 UT | 9,24′, 01:29 UT | 5 | 3 | 5 | 5 |  |
| 26 | **18** | Konjunkce | 21. 12. 2020 | Velká konjunkce 21. 12. 2020 | 6,10′, 21. 12. 18:09 UT | 6,10′, 18:20 UT | 5 | 4 | 5 | 4 |  |
| 27 | **18** | Zatmění Slunce | 2. 8. 2027 ▸ | Zatmění 2. 8. 2027 (Luxor, 6 minut) | 10:07 UT, osa 25,9° / 33,3°; Praha 0,53 | 10:07 UT, osa 25,5° / 33,2°; Praha 0,52 | 5 | 3 | 5 | 5 |  |
| 28 | **18** | Zatmění Slunce | 3. 9. 2081 ▸ | Zatmění 3. 9. 2081 (střední Evropa) | 09:06 UT, osa 25,4° / 54,0°; Praha 0,95 | 09:05 UT, osa 24,6° / 53,6°; Praha 0,92 | 5 | 3 | 5 | 5 |  |
| 29 | **18** | Přechod | 11. 12. 2117 ▸ | Příští přechod Venuše | 12,01′, 02:42 UT | 12,06′, 02:48 UT | 5 | 3 | 5 | 5 |  |
| 30 | **18** | Zatmění Slunce | 16. 7. 2186 ▸ | Nejdelší úplné zatmění v pěti tisíciletích | 15:09 UT, osa 7,2° / −46,6°; Praha 0,00 | 15:08 UT, osa 7,4° / −46,5°; Praha nevidět | 5 | 3 | 5 | 5 |  |
| 31 | **17** | Konjunkce | 17. 6. 2 př. n. l. | Venuše a Jupiter splynuly v jednu hvězdu (2 př. n. l.) | 0,46′, 17. 6. 17:56 UT | jen datum | 5 | 5 | 4 | 3 |  |
| 32 | **17** | Supernova / nova | 4. 7. 1054 | SN 1054: zrod Krabí mlhoviny, 23 dní vidět ve dne | mimo model | Býk; −6 mag; 23 dní ve dne, 21 měsíců v noci | 5 | 5 | – | 3 |  |
| 33 | **17** | Seskupení | 15. 9. 1186 | Pět planet, Slunce a Měsíc ve Vahách (Toledský dopis, panika z konce světa) | rozpětí 11,5°, 15. 9. | jen datum | 5 | 5 | 4 | 3 |  |
| 34 | **17** | Supernova / nova | 11. 11. 1572 | Tychonova supernova 1572: konec neměnných nebes | mimo model | Kasiopeja; −4 mag; do března 1574 | 5 | 5 | – | 3 |  |
| 35 | **17** | Supernova / nova | 9. 10. 1604 | Keplerova supernova 1604: poslední v Galaxii, Kepler ji sledoval v Praze | mimo model | Hadonoš; −2,5 mag; 18 měsíců | 5 | 5 | – | 3 |  |
| 36 | **17** | Zákryt | 4. 1. 1613 | Galileo zakreslil Neptun vedle Jupiteru 234 let před objevem | 0,05′, 4. 1. 02:38 UT | jen datum | 5 | 5 | 4 | 3 |  |
| 37 | **17** | Zatmění Slunce | 12. 5. 1706 | Poslední úplné zatmění v Praze | 09:36 UT, osa 52,1° / 14,1°; Praha 0,99 | 09:35 UT, osa 51,5° / 15,2°; Praha úplné | 5 | 4 | 3 | 5 | model v Praze 0,987, NASA úplné (1,011) |
| 38 | **17** | Přechod | 6. 12. 1882 | Přechod Venuše 1882 | 10,66′, 17:00 UT | 10,62′, 17:06 UT | 4 | 3 | 5 | 5 |  |
| 39 | **17** | Supernova / nova | 24. 2. 1987 | SN 1987A: nejbližší supernova od vynálezu dalekohledu, zachycena neutrina | mimo model | Mečoun (Velké Magellanovo mračno); 2,9 mag; pouhým okem několik měsíců | 5 | 4 | – | 4 |  |
| 40 | **17** | Kometa | 25. 3. 1996 | Kometa Hjakutake těsně u Země (ohon přes 100° oblohy) | 0,1017 AU, 25. 3. 06:59 UT | 0,1017 AU, 07:02 UT | 4 | 3 | 5 | 5 |  |
| 41 | **17** | Průlet | 27. 8. 2003 | Mars nejblíž Zemi za 60 000 let | 0,3728 AU, 27. 8. 09:58 UT | 0,3727 AU, 09:46 UT | 4 | 3 | 5 | 5 |  |
| 42 | **17** | Průlet | 29. 10. 2025 | Mezihvězdná kometa 3I/ATLAS v přísluní | 1,3565 AU, 29. 10. 11:52 UT | 1,3520 AU, 10:36 UT | 4 | 4 | 4 | 5 | elementy v katalogu obnovit podle JPL |
| 43 | **17** | Zatmění Slunce | 12. 8. 2026 | Zatmění 12. 8. 2026 (Island, Španělsko) | 17:46 UT, osa 65,6° / −22,2°; Praha 0,90 | 17:46 UT, osa 65,2° / −25,2°; Praha 0,89 | 4 | 3 | 5 | 5 |  |
| 44 | **17** | Zatmění Měsíce | 31. 12. 2028 ▸ | Silvestrovské zatmění Měsíce | 16:52 UT, velikost 1,24, úplné 71 min | 16:52 UT, velikost 1,25, úplné 71 min | 4 | 3 | 5 | 5 |  |
| 45 | **17** | Zatmění Měsíce | 26. 6. 2029 ▸ | Nejhlubší zatmění Měsíce 21. století | 03:24 UT, velikost 1,85, úplné 103 min | 03:22 UT, velikost 1,84, úplné 102 min | 5 | 2 | 5 | 5 |  |
| 46 | **17** | Kometa | 5. 8. 2126 ▸ | Návrat komety Swift–Tuttle, matky Perseid | 0,1534 AU, 5. 8. 15:46 UT | 0,1534 AU, 15:50 UT | 4 | 3 | 5 | 5 |  |
| 47 | **16** | Konjunkce | 29. 5. 7 př. n. l. | Trojí konjunkce Jupiteru a Saturnu 7 př. n. l. (1. setkání; betlémská hvězda?) | 59′ / 59′ / 63′ (29. 5., 1. 10. a 5. 12.) | tři setkání: konec května, začátek října, začátek prosince | 4 | 5 | 4 | 3 |  |
| 48 | **16** | Supernova / nova | 1. 5. 1006 | SN 1006: nejjasnější hvězda dějin, vrhala stíny | mimo model | Vlk; −7,5 mag; přes rok | 5 | 4 | – | 3 |  |
| 49 | **16** | Zákryt | 12. 9. 1170 | Mars přešel přes Jupiter (viděl mnich Gervase v Canterbury) | 0,07′, 12. 9. 20:14 UT | jen datum | 5 | 4 | 4 | 3 |  |
| 50 | **16** | Zákryt | 13. 10. 1590 | Venuše zakryla Mars (viděl Michael Mästlin v Heidelbergu) | 0,11′, 13. 10. 04:51 UT | jen datum | 5 | 4 | 4 | 3 |  |
| 51 | **16** | Kometa | 18. 12. 1680 | Kirchova kometa 1680: první objevená dalekohledem, Newton na ní ověřil gravitaci | 1 277 024 km, 18. 12. 11:45 UT | 930 798 km, 11:42 UT | 4 | 5 | 3 | 4 | elementy v katalogu upravit podle JPL |
| 52 | **16** | Zákryt | 3. 1. 1818 | Venuše přešla přes Jupiter – poslední vzájemný zákryt planet | 0,19′, 3. 1. 21:53 UT | 21:52 UT | 5 | 3 | 4 | 4 |  |
| 53 | **16** | Seskupení | 5. 2. 1962 | Pět planet, Slunce a Měsíc v Kozorohu při úplném zatmění Slunce | rozpětí 16,1°, 5. 2. | jen datum | 5 | 4 | 4 | 3 |  |
| 54 | **16** | Zatmění Měsíce | 27. 7. 2018 | Nejdelší úplné zatmění Měsíce 21. století | 20:23 UT, velikost 1,62, úplné 104 min | 20:22 UT, velikost 1,61, úplné 103 min | 4 | 2 | 5 | 5 |  |
| 55 | **16** | Zatmění Slunce | 12. 8. 2045 ▸ | Zatmění 12. 8. 2045 (napříč USA, 6 minut) | 17:42 UT, osa 26,4° / −78,4°; Praha 0,00 | 17:41 UT, osa 25,9° / −78,5°; Praha nevidět | 4 | 2 | 5 | 5 |  |
| 56 | **16** | Zákryt | 22. 11. 2065 ▸ | Venuše přejde přes Jupiter – první vzájemný zákryt planet po 247 letech | 0,26′, 22. 11. 12:54 UT; 8° od Slunce | 12:45 UT | 5 | 3 | 4 | 4 |  |
| 57 | **16** | Zatmění Měsíce | 9. 6. 2123 ▸ | Nejdelší zatmění Měsíce 22. století | 05:03 UT, velikost 1,75, úplné 107 min | 05:02 UT, velikost 1,75, úplné 106 min | 4 | 2 | 5 | 5 |  |
| 58 | **15** | Zatmění Slunce | 3. 8. 431 př. n. l. | Zatmění z Thúkydida (peloponéská válka) | 14:52 UT, osa 68,2° / 8,3°; Praha 0,90 | 14:55 UT, osa 68,0° / 5,9°; Praha 0,92 | 3 | 4 | 4 | 4 |  |
| 59 | **15** | Zatmění Slunce | 2. 8. 1133 | Zatmění krále Jindřicha I. | 12:09 UT, osa 46,5° / 17,3°; Praha 1,00 | 12:09 UT, osa 45,8° / 16,5°; Praha 0,97 | 4 | 3 | 3 | 5 | model dává v Praze úplné, NASA 0,973 |
| 60 | **15** | Konjunkce | 4. 3. 1226 | Nejtěsnější konjunkce Jupiteru a Saturnu středověku | 2,21′, 5. 3. 07:41 UT | 2,10′ | 4 | 2 | 5 | 4 |  |
| 61 | **15** | Seskupení | 22. 3. 1345 | Mars, Jupiter a Saturn ve Vodnáři – pařížská fakulta jim přičetla černou smrt | rozpětí 2,0°, 5. 3. | jen datum | 4 | 5 | 4 | 2 | nejtěsněji 5. 3.; fakulta uvádí 20. 3. |
| 62 | **15** | Seskupení | 20. 2. 1524 | Všechny planety v Rybách – Evropa čekala potopu | rozpětí 12,0°, 17. 2. | jen datum | 4 | 5 | 4 | 2 |  |
| 63 | **15** | Zákryt | 28. 5. 1737 | Venuše zakryla Merkur (John Bevis, Greenwich) – jediný podrobně pozorovaný vzájemný zákryt planet | 0,63′, 28. 5. 21:44 UT | jen datum | 5 | 4 | 3 | 3 | ze středu Země 0,63′; zákryt viděn z Greenwiche |
| 64 | **15** | Průlet | 30. 1. 1931 | Eros 1931: průlet, ze kterého se změřila vzdálenost Slunce | 0,1622 AU, 28. 1. 10:31 UT | 0,1741 AU, 04:07 UT | 3 | 4 | 3 | 5 | chce elementy pro rok 1931 |
| 65 | **15** | Průlet | 15. 2. 2013 | Planetka Duende pod dráhou družic – v den čeljabinského meteoru | 2 040 006 km, 15. 2. 02:09 UT | 34 053 km, 19:26 UT | 4 | 5 | 1 | 5 | katalog má dráhu po průletu; chce elementy před ním |
| 66 | **15** | Přechod | 11. 11. 2019 | Přechod Merkuru 2019 | 1,26′, 15:13 UT | 1,26′, 15:20 UT | 3 | 2 | 5 | 5 |  |
| 67 | **15** | Přechod | 13. 11. 2032 ▸ | Příští přechod Merkuru | 9,52′, 08:48 UT | 9,54′, 08:54 UT | 3 | 2 | 5 | 5 |  |
| 68 | **15** | Seskupení | 8. 9. 2040 ▸ | Pět planet a srpek Měsíce v jednom zorném poli (8. 9. 2040) | rozpětí 9,5°, 8. 9. | jen datum | 5 | 3 | 4 | 3 |  |
| 69 | **15** | Konjunkce | 15. 3. 2080 ▸ | Velká konjunkce 2080 | 5,98′, 14. 3. 23:48 UT | 6,00′ | 4 | 2 | 5 | 4 |  |
| 70 | **15** | Průlet | 28. 8. 2287 ▸ | Mars ještě blíž než v roce 2003 | 0,3722 AU, 28. 8. 22:10 UT | 0,3723 AU, 22:20 UT | 3 | 2 | 5 | 5 |  |
| 71 | **14** | Seskupení | 5. 5. 2000 | Pět planet, Slunce a Měsíc pohromadě (květen 2000) | rozpětí 25,9°, 5. 5. | jen datum | 4 | 3 | 4 | 3 |  |
| 72 | **14** | Průlet | 14. 12. 2093 ▸ | Phaethon, otec Geminid, těsně u Země | 0,0235 AU, 14. 12. 12:20 UT | 0,0198 AU, 10:52 UT | 3 | 3 | 3 | 5 | chce elementy pro rok 2093 |
| 73 | **13** | Supernova / nova | 7. 12. 185 | SN 185: nejstarší zaznamenaná supernova (čínská „hvězda-host“) | mimo model | Kružítko / Kentaur; 8 měsíců | 3 | 4 | – | 3 |  |
| 74 | **13** | Supernova / nova | 11. 3. 1843 | Velká erupce Eta Carinae: na čas druhá nejjasnější hvězda oblohy | mimo model | Lodní kýl; −0,8 mag; jasná 1837–1856 | 4 | 3 | – | 3 |  |
| 75 | **13** | Supernova / nova | 9. 6. 1918 | Nova Aquilae 1918: nejjasnější nova éry dalekohledů | mimo model | Orel; −0,5 mag; týdny pouhým okem | 4 | 3 | – | 3 |  |
| 76 | **13** | Zákryt | 3. 12. 2133 ▸ | Venuše zakryje Merkur | 0,55′, 3. 12. 13:58 UT; 4° od Slunce | jen datum | 4 | 2 | 4 | 3 |  |
| 77 | **13** | Průlet | 25. 9. 2135 ▸ | Bennu proletí blíž než Měsíc | 1,2316 AU, 15. 9. 07:46 UT | 0,0014 AU, 07:49 UT | 4 | 3 | 1 | 5 | chce elementy pro rok 2135 |
| 78 | **12** | Seskupení | 24. 6. 2022 | Pět planet na ranní obloze v pořadí od Slunce | rozpětí 90,8°, 4. 6. | jen datum | 4 | 2 | 4 | 2 | nejužší 4. 6.; s Měsícem 24. 6. |
| 79 | **12** | Seskupení | 19. 5. 2161 ▸ | Všech osm planet na jedné straně Slunce | rozpětí 69,0°, 19. 5. | jen datum | 4 | 2 | 4 | 2 | úhel měřen od Slunce |
| 80 | **11** | Konjunkce | 16. 11. 2026 ▸ | Mars u Jupiteru 16. 11. 2026 (právě teď na ranní obloze) | 71,61′, 16. 11. 02:13 UT | jen datum | 3 | 2 | 4 | 2 | bez pramene – doplnit z ročenky |

## Prameny
- Zatmění Slunce a Měsíce: F. Espenak a J. Meeus, Five Millennium Catalog of Solar / Lunar Eclipses (NASA, eclipse.gsfc.nasa.gov);
  Praha z Besselových elementů téhož katalogu (`tools/model/besel.py`).
- Přechody: F. Espenak, Six Millennium Catalog of Venus Transits, Seven Century Catalog of Mercury Transits.
- Velké konjunkce: tabulka ve Wikipedii (Great conjunction). Zákryty: S. Albers 1979, Sky & Telescope 57, 220.
- Komety a průlety: JPL Horizons (elementy návratů, vzdálenost Marsu), JPL SBDB a Close-Approach Data, JPL CNEOS Historic Comet Close Approaches.
- Supernovy a novy: infoboxy Wikipedie (souřadnice, data); jasnosti ověřit při psaní karet (Green a Stephenson 2003).
- Úplný seznam s prameny u každé položky: `tools/data/kandidati.json`.

## Jak zopakovat
```
npx esbuild tools/test/probe_kandidati.mjs --bundle --platform=node --format=esm --outfile=/tmp/k.mjs && node /tmp/k.mjs
python3 -I tools/model/besel.py /tmp/nasa/bess.csv tools/data/kandidati.json   # Praha z Besselových elementů
```
