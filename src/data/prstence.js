// Prstence obřích planet (verze 2.3): co to jsou ty „věnečky“ kolem Jupiteru, Saturnu, Uranu a Neptunu.
// Ondřej (25. 11. 2026): „Některé planety mají takové věnečky. Je to polární záře? Každé dítě se na to zeptá.“
// Odpověď: ne, polární záře je světlo v atmosféře u pólů; věnečky jsou prstence – placatý disk prachu a ledu kolem rovníku,
// který při pohledu šikmo vypadá jako ovál.
// Prameny (NASA Image and Video Library, popisy snímků): PIA00658 (Galileo 1996: hlavní prstenec Jupiteru svítí díky zrnkům
// mikrometrové velikosti, „halo“ sahá přes 27 000 km nad rovinu prstenců), ARC-1986-A86-7011 a PIA01976 (Voyager 2 1986:
// prstence Uranu jsou velmi tmavé a úzké – od asi 100 km u prstence ε po pár km; pastýřské měsíce po obou stranách prstence ε),
// PIA00142 (pruhy jemného prachu viditelné v protisvětle), PIA01493 a ARC-1989-A89-7042 (Voyager 2 1989: materiál vnějšího
// prstence Neptunu se shlukuje do oblouků, oblouk asi 50 000 km dlouhý); Saturn – data/slozeni.js.
// Z paměti (neověřeno ve zdrojích repa): objev prstenců Jupiteru Voyagerem 1 (1979), Uranu při zákrytu hvězdy (1977),
// poloměry hlavního prstence Jupiteru (1,72–1,81 poloměru planety), počet prstenců Uranu (13) a Neptunu (5) a jejich jména,
// vznik prachu z dopadů mikrometeoritů na malé vnitřní měsíce, tloušťka prstenců Saturnu (desítky metrů), udržení oblouků
// Neptunu měsícem Galatea.

export const PRSTENCE = {
  jupiter: {
    nazev: 'Prstence Jupiteru',
    kid:
      'To není polární záře, ale prstence! Kolem Jupiteru krouží tenký placatý kruh z drobounkého prachu – jako prstýnek. ' +
      'Prach vzniká, když do malých měsíčků u Jupiteru narážejí kamínky z vesmíru a vyrážejí z nich zrníčka. ' +
      'Kruh je placatý jako talíř, a protože se na něj díváš šikmo, vypadá jako ovál – věneček. ' +
      'Je skoro neviditelný, nejlíp svítí, když na něj Slunce svítí zezadu – jako prach v proužku světla v pokoji.',
    adult:
      'Nejde o polární záři: je to soustava tenkých prachových prstenců v rovině rovníku. Hlavní prstenec leží asi 1,7–1,8 poloměru ' +
      'planety od středu, pod ním je „halo“ a vně dva řídké pavučinové prstence až do asi 3,2 poloměru. Prach je velký jen mikrometry; ' +
      'vyrážejí ho dopady mikrometeoritů z malých vnitřních měsíců (Metis, Adrastea, Amalthea, Thebe). Je tmavý a řídký, ' +
      'jasně svítí jen v protisvětle (Galileo, PIA00658). Objevil je Voyager 1 v roce 1979.',
    kratce: 'tenké prachové (Voyager 1, 1979)',
  },
  saturn: {
    nazev: 'Prstence Saturnu',
    kid:
      'Saturnovy prstence jsou z ledu – od zrníček po kusy velké jako dům. Všechny krouží kolem planety jako miliardy malinkých měsíčků. ' +
      'Jsou obrovsky široké, ale tenké jako list papíru: když se na ně díváš přesně z boku, skoro zmizí.',
    adult:
      'Přes 95 % vodní led, od zrn po balvany velké jako dům; každý kus obíhá planetu jako malý měsíc. Prstence jsou široké stovky ' +
      'tisíc kilometrů, ale tlusté jen desítky metrů – při pohledu z boku (každých asi 15 let) skoro zmizí. Mezery (Cassiniho dělení) ' +
      'udržují gravitačně měsíce.',
    kratce: 'jasné ledové (A, B, C, Cassiniho dělení)',
  },
  uranus: {
    nazev: 'Prstence Uranu',
    kid:
      'Uran má úzké tmavé prstence – tmavé jako uhlí. Objevili je, když Uran zakryl hvězdu: hvězda párkrát mrkla už před planetou, ' +
      'protože ji zastínily prstence. Uran leží na boku, a tak jeho prstence stojí skoro „na výšku“.',
    adult:
      'Úzké a velmi tmavé prstence (od asi 100 km u prstence ε po pár kilometrů; Voyager 2, 1986). Objeveny roku 1977, když prstence ' +
      'na okamžik zastínily hvězdu, kterou pak zakryla planeta. Prstenec ε drží úzký dva „pastýřské“ měsíce, Cordelia a Ophelia ' +
      '(PIA01976). Mezi prstenci je jemný prach, vidět jen v protisvětle (PIA00142). Uran má osu skoro v rovině dráhy, proto jsou ' +
      'prstence kolem rovníku natočené „na výšku“.',
    kratce: 'úzké a tmavé (objeveny 1977)',
  },
  neptune: {
    nazev: 'Prstence Neptunu',
    kid:
      'Neptun má slabé tmavé prstence. Ve vnějším prstenci je prach nahrnutý do několika „oblouků“, jako když se na kruhové dráze ' +
      'udělá kolona. Poprvé je pořádně vyfotil Voyager 2 v roce 1989.',
    adult:
      'Pět hlavních tmavých prstenců pojmenovaných po objevitelích Neptunu (Galle, Le Verrier, Lassell, Arago, Adams). Ve vnějším ' +
      'prstenci Adams se materiál shlukuje do oblouků dlouhých až desítky tisíc kilometrů (Voyager 2, 1989; PIA01493) – nejspíš je ' +
      'drží gravitace blízkého měsíce Galatea. Látka je ztmavená zářením.',
    kratce: 'slabé, s oblouky (Voyager 2, 1989)',
  },
};
