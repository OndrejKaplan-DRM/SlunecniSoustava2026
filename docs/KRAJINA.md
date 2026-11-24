# Krajina a obloha z povrchu (verze 2.2, doladění 2.2b)

Zadání Ondřeje (24. 11. 2026): pohled z povrchu má mít realistický obzor místo „slepého povrchu koule“ – krajina, která na daném
tělese dává smysl, atmosféra (je / není, jak je tlustá, jak rozptyluje světlo), obloha (barva, den, noc, soumrak, lom světla, jak
prosvítají hvězdy a měsíce, Slunce), tělesa na obloze a světlo, které z nich dopadá. Tento dokument popisuje, jak to aplikace
počítá, z čeho vychází a co je jen ilustrace.

## 1. Pořadí kreslení (`src/render/krajina.js`)
1. **Scéna** (hvězdy, Mléčná dráha, Slunce, planety, měsíce) se vykreslí do pomocného obrazu.
2. **Obloha**: pro každý směr pohledu shader `SKY_FS` spočítá jas oblohy L a propustnost atmosféry T (ve čtvrtinovém rozlišení,
   dva obrazy najednou). Výpočet je jednonásobný rozptyl světla: 20 kroků po paprsku pohledu, z každého 6 kroků ke Slunci.
3. **Složení** (`COMP_FS`): obraz scény × T (zeslabení a zčervenání u obzoru) + L. Lom světla u obzoru posune obraz scény
   (Slunce a hvězdy jsou vidět výš, než skutečně jsou, kotouč u obzoru je zploštělý). Hvězda zmizí, když je slabší než jas oblohy
   kolem ní (práh kontrastu oka); kotouč Slunce je v obraze zesílený, ať po zeslabení zůstane jasnější než záře kolem.
4. **Krajina** (`src/render/teren.js`) se kreslí přes to, v metrech kolem pozorovatele, se stejným natočením kamery. Světlo: Slunce
   (barva a síla po průchodu atmosférou, stíny kamenů), světlo oblohy, světlo planety nebo měsíce nad obzorem (popelavý svit Země
   na Měsíci, Jupiter nad Io), vzdušná perspektiva (vzdálené kopce modrají a mizí v oparu) z téhož výpočtu oblohy.
5. **Expozice** se přizpůsobí světlu jako oko: jas bílé plochy = 0,25 + 0,06·log₁₀ E (E = osvětlení v násobcích pozemského
   poledne; poledne 100 %, Pluto v poledne asi 26 %); když je v záběru jasná obloha (západ Slunce), expozice se sníží – krajina
   potmavne, obloha zůstane barevná. Pod osvětlením asi jako úplněk se oko dál nepřizpůsobuje (jinak by noc zhnědla).
6. **Noční vidění (2.2b)**: chybějící světlo do noční úrovně (bílá plocha asi na desetině poledního jasu – odhad) doplní slabé
   namodralé „okolní světlo“ (oko přivyklé tmě, Purkyňův posun) a barvy se ztlumí. Jas je úměrný albedu: sníh a led září, tmavá půda
   skoro ne. Obloha s atmosférou dostane slabou noční záři (obzor je proti ní vidět), hvězdy ji nepočítají jako jas oblohy, takže
   nezmizí. **Přisvětlení ☀** násobí expozici krajiny ×1 až ×3,2 (obloha a hvězdy méně, √); po vzletu se vrátí původní hodnota.
7. **Stíny (2.2b)**: každý vrchol terénu ví, jestli vidí Slunce (pochod paprskem ke Slunci nad mřížkou do 70 km, měkký okraj asi 1°)
   – hory a hrany kráterů vrhají stín, kameny ve stínu jsou tmavé; stíny kamenů dál ze stínové mapy (do 110 m).
   **Regolit bez vzduchu** (Měsíc, Merkur, planetky, komety) se stínuje podle Lommela a Seeligera s opozičním zjasněním (proto Měsíc
   netmavne k okraji ani při nízkém Slunci jako na fotkách z Apolla); led a Io zčásti, Pluto, Země, Venuše, Titan a oblaka podle Lamberta.

Venuše a Titan pod oblaky mají místo výpočtu rozptylu „zataženou oblohu“: rovnoměrnou záři barvy podle snímků, Slunce ani hvězdy
nejsou vidět, krajinu osvětluje jen rozptýlené světlo (Venuše 3 %, Titan asi 10 % světla, které dopadá na horní vrstvu).
Tlačítko „☁ Nad oblaka“ přenese pozorovatele nad oblačnost (Venuše asi 70 km, odhad řídkého plynu nad oblaky).

## 2. Atmosféry (`src/data/krajiny.js`, `src/render/atmo.js`)
Koeficienty rozptylu v km⁻¹ u povrchu, výškové škály v km. Jas oblohy vychází v násobcích ozáření Sluncem nad atmosférou.

| Těleso | Plyn (Rayleigh) | Prach / opar (Mie) | Zdroj čísel |
|---|---|---|---|
| Země | 5,8 / 13,6 / 33,1 ·10⁻³, H = 8 km; ozon 1,2 / 1,88 / 0,085 ·10⁻³ ve vrstvě 10–40 km | 4,0·10⁻³, H = 1,2 km, g = 0,8 | Bruneton & Neyret 2008 (ozon v kanálu R zvýšený – viz rozhodnutí) |
| Mars | CO₂ 6,4 hPa, 210 K → 0,86 % hustoty Země, CO₂ rozptyluje 2,4× víc než vzduch | prach τ ≈ 0,5, H = 11 km; pohlcuje modrou; g = 0,6 / 0,72 / 0,88 | tlak a teplota NSSDCA; prach kalibrovaný na snímky Curiosity (PIA21842, PIA19400) |
| Titan | N₂ 1,5 baru, 94 K, H = 20 km | oranžový opar τ 4–10 | Huygens DISR (Tomasko a kol. 2005 – z paměti, neověřeno); pod oparem „zataženo“ |
| Jupiter, Saturn | H₂ (0,23× rozptyl vzduchu), pozorovatel nad oblaky u ~1 baru | slabý opar | odhad – oblohu zevnitř nikdo nevyfotil |
| Uran, Neptun | H₂ + metan pohlcuje červenou (obloha modrozelená / modrá) | slabý opar | odhad |
| Pluto, Triton | plyn zanedbatelný | modrý opar ve vrstvách | New Horizons (PIA19947) – odhad |
| Venuše | zatažená obloha, 3 % slunečního světla, barva podle Veněr 13 a 14 | – | Moroz 1983, Pieters a kol. 1986 (z paměti, neověřeno) |

Mnohonásobný rozptyl je přidaný jen přibližně (rovnoměrná záře úměrná světlu oblohy, za soumraku slábne). Čistý jednonásobný
Rayleighův rozptyl dává pozemskou oblohu asi 3× tmavší, než je skutečná (Preetham a kol. 1999: nadhlavník asi 8 000 cd/m²,
výpočet 1 300 cd/m²), proto má Země zesílení jasu oblohy 2,4 (`gain`).

Co vychází samo z výpočtu, bez kreslení „na míru“: modrá denní obloha a bělavý obzor; oranžové a červené Slunce u obzoru; soumrak
(horní vrstvy atmosféry jsou osvětlené, i když je Slunce pod obzorem; stín planety stoupá nad východním obzorem); modrofialový
nadhlavník za soumraku (ozon); žlutohnědá obloha Marsu a modrá záře kolem zapadajícího Slunce na Marsu; dlouhý marťanský soumrak;
modrozelená obloha Uranu; mizení hvězd ve dne.

**Lom světla**: Bennettův vzorec (34′ u obzoru na Zemi), na jiných tělesech úměrně hustotě a lomivosti plynu (Mars 1/50, Titan 4×,
obři asi 0,7×). Ukazuje se v obraze; tabulka poloh v panelu „Obloha odsud“ dál uvádí skutečné (geometrické) výšky a pro Zemi
v závorce výšku s lomem.

## 3. Krajina (`src/render/teren.js`)
Polární mřížka kolem pozorovatele (384 × 170 bodů, na telefonu a při nejnižší kvalitě vykreslování 256 × 130): jemná u nohou (35 cm), řídká u obzoru, do 150 km
(malá tělesa kus koule). Výšky = přesná koule (obzor je tam, kde má být) + reliéf:

| Typ | Kde | Reliéf a povrch |
|---|---|---|
| výšková mapa | Měsíc, Mars | **LOLA** (Měsíc) a **MOLA** (Mars): celé těleso 4 body na stupeň (7,6 a 14,8 km), kolem míst přistání a známých míst výřezy 16 bodů na stupeň (1,9 a 3,7 km); menší krátery a nerovnosti vymyšlené pod rozlišení mapy. Hadley Delta u Apolla 15 a Mount Sharp u Curiosity jsou na obzoru tam, kde na fotkách. |
| regolit | Měsíc, Merkur, Ceres a tmavá tělesa | krátery všech velikostí (hustota jako na nasyceném povrchu, N(>D) ~ D⁻²), drobné kameny, ojedinělé balvany |
| Mars | Mars | prachová pláň, tmavé čedičové kameny, barva půdy z mapy (méně sytá – na snímcích vozítek je hnědožlutá) |
| Země | Země | druh krajiny podle podrobné mapy v místě každého bodu: louky a lesy (stromy jen tady), poušť, led, moře; přistání v moři se posune na nejbližší pevninu (hledá se do 60°) |
| Venuše | pod oblaky | tmavé čedičové desky (Veněra 13 a 14), oranžové šero, dohlednost několik km |
| Titan | pláně; duny v rovníkovém pásu tam, kde je mapa tmavá | ledové oblázky 1–15 cm jako u Huygensu; lineární duny západ–východ (výška asi 90 m, rozestup 2,6 km) |
| led | světlé měsíce, Pluto, Triton | ledová pláň s krátery (Pluto: vyšší hory) |
| Europa | Europa, Enceladus | dvojité hřebeny |
| Io | Io | sirné pláně skoro bez kráterů |
| oblaka | Jupiter, Saturn, Uran, Neptun | oblačná vrstva (2.2b): mírné zvlnění do ~600 m na desítky km (sklon do ~8°) a drobné kupky; ojedinělé konvektivní věže (Jupiter 12–40 km vysoké a asi stejně široké, z několika kup, bílé vršky, vrhají stín – Juno PIA21647; Saturn řidší a nižší, Uran a Neptun skoro hladké – odhad); barva podle pásu na mapě planety; pozorovatel 1,5 km nad vrstvou; pevný povrch tu není |
| malé těleso, kometa | planetky, komety | silně zakřivené (obzor desítky až stovky metrů), velké balvany |

Barva půdy: mapa tělesa v místě každého bodu (podrobná mapa, kde je, mimo telefon), přepočtená tak, aby průměr odpovídal albedu
tělesa z katalogu (mapy jsou kvůli vzhledu zesvětlené). Stejné místo dá vždy stejnou krajinu (semínko ze souřadnic).

## 4. Zkoušky
- `node tools/test/t_krajina.mjs` – 50 kontrol (2.2b: navíc stavy tlačítka přistání v kartě, v ☰ a na liště včetně sestupu, kolečko dovnitř a ven,
  přisvětlení a jeho vrácení po vzletu, Grónsko v prosinci v noci – sníh a obzor vidět, přisvětlení zjasní, Pluto tmavší než poledne);
  dříve 34 kontrol: režim oblohy a typ krajiny pro 8 těles, stavba terénu (do 0,6 s, výšky konečné),
  Venuše nad oblaky, výškové mapy (Hadley Delta asi 2,9 km nad místem přistání Apolla 15, skutečně asi 3,5 km; Mount Sharp 4,7 km nad
  dnem Gale), přistání mimo moře, barvy oblohy z obrazu (Země ve dne modrá, při západu oranžová u obzoru, Mars žlutohnědá, Měsíc
  černá, Venuše oranžová), barva Slunce u obzoru, mizení hvězd ve dne, oslnění krajinou na Měsíci.
- `node tools/test/pristani_snimky.mjs <složka>` (2.2b) – tok přistání v 5 snímcích: karta, míření na Curiosity, sestup, povrch, vzlet kolečkem.
- `node tools/test/krajina_snimky.mjs <složka>` – 25 snímků (2.2b + Grónsko v noci, s přisvětlením, Měsíc ráno, věže na Jupiteru, Saturn, Neptun); (Země den / západ / soumrak / noc / poušť / lom u obzoru, Mars den /
  západ / Gale, Měsíc den / Hadley / popelavý svit, Venuše, Titan, Jupiter, Uran, Io, Pluto, Ceres).
- Polohy těles se nezměnily – `test:vernost` (996 případů proti JPL Horizons), `test:sceny`, `test:model` beze změny.

## 5. Co je ilustrace a co ne
- **Spočítané z fyziky**: barva a jas oblohy, soumrak, barva a zeslabení Slunce, lom, mizení hvězd, osvětlení krajiny
  (směr a barva Slunce, světlo oblohy a planet), stíny, vzdušná perspektiva. Parametry atmosfér jsou z měření (Země, Mars) nebo
  odhad (obři, nad oblaky Venuše a Titanu, Pluto).
- **Z měření**: velké tvary krajiny na Měsíci a Marsu (LOLA, MOLA), barva půdy (mapy těles), polohy všech těles.
- **Ilustrace**: drobný reliéf, krátery pod rozlišení map, kameny, stromy, duny, oblačné moře obřích planet, krajina na tělesech
  bez výškové mapy (včetně Země – ta má jen druh povrchu z mapy, ne skutečné hory).
- **Odhad (2.2b)**: úroveň nočního vidění (jak moc oko přivykne tmě), tvar a hustota věží v oblacích obrů (rozměr věží Jupiteru je
  z Juno, rozmístění vymyšlené).

## 7. Proč je oblačná vrstva obrů plošší, ale ne plochá (2.2b)
Ondřej: „povrch mraků možná nepatrně méně vertikálně členitý – pokud se vertikální členění skutečně nevyskytuje“. Skutečnost:
- Výšková škála atmosféry (NSSDCA): Jupiter 27 km, Saturn 59,5 km, Uran 27,7 km, Neptun 19–20 km, Země 8,5 km. Útvary v oblacích
  obrů jsou proto několikrát větší než pozemské a vrstva amoniakových oblaků mezi pásy je na desítkách kilometrů hladká.
- Ve verzi 2.2 byly kupy 1–3 km vysoké s roztečí 6 km – sklon přes 60°, „sněhové kopce“. To bylo špatně.
- Vertikální členění ale existuje ve větším měřítku: JunoCam (19. 5. 2017, PIA21647) ukazuje v jižní tropické zóně věže
  „asi 50 km široké a 50 km vysoké“, které vrhají stín na oblaka pod sebou; Juno je nazývá „pop-up clouds“ (PIA22687, PIA24303).
  Voyager 2 viděl na Neptunu stíny malých vyvýšených oblaků na hlubší vrstvě (68° j. š., PIA02220).
- Proto 2.2b: vrstva plošší (zvlnění stovky metrů, sklon do ~8°) a ojedinělé věže na obzoru. Hustota věží (asi jedna na
  40 000 km² na Jupiteru, tedy na dohled 150 km obvykle 1–3) je odhad; na snímku PIA21647 jich bylo neobvykle mnoho.

## 6. Srovnání se snímky sond
`docs/ref/krajina_srovnani.jpg` (vytváří `tools/test/krajina_srovnani.py`): snímek sondy vlevo, aplikace 2.2 vpravo – Hadley Delta
(Apollo 15), Mount Sharp (Curiosity), modrý západ Slunce na Marsu, Titan (Huygens), regolit (Apollo 17), Mars (Opportunity).
Mřížka 12 pohledů: `docs/ref/krajina_snimky.jpg`. Verze 2.2b: `docs/ref/krajina_snimky_2_2b.jpg` (noc v Grónsku, Pluto, Měsíc ráno, oblaka obrů) a tok přistání
`docs/ref/pristani_2_2b.jpg` (karta, míření, sestup, povrch, vzlet kolečkem).
