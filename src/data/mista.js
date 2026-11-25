// Místa na povrchu těles pro pohled z povrchu (verze 2.1) a popis oblohy těles.
// Souřadnice: [název, šířka (planetografická, + sever), východní délka 0–360° v soustavě IAU]. Západní délky starších map
// (Io, Europa, Titan, Merkur…) jsou přepočtené jako 360° − délka. Zdroje: přistávací místa – NASA (LRO/LROC pro Apollo,
// MRO/HiRISE pro vozítka na Marsu), ESA (Huygens), CNSA (Čchang-e 4, Ču-žung); útvary – IAU Gazetteer of Planetary Nomenclature.
export const PLACES = {
  earth: [
    ['Praha', 50.09, 14.42],
    ['Ondřejov – hvězdárna', 49.915, 14.781],
    ['Greenwich – nultý poledník', 51.477, 0],
    ['Severní pól', 90, 0],
    ['Tromsø – za polárním kruhem', 69.65, 18.96],
    ['Luxor – zatmění 2. 8. 2027', 25.69, 32.64],
    ['Rovník – Quito', -0.18, 281.53],
    ['Paranal – dalekohledy ESO', -24.627, 289.596],
    ['Mauna Kea – Havaj', 19.82, 204.53],
    ['Sydney', -33.87, 151.21],
    ['Jižní pól', -90, 0],
  ],
  moon: [
    ['Apollo 11 – Moře klidu', 0.674, 23.473],
    ['Apollo 15 – Hadley', 26.132, 3.634],
    ['Apollo 17 – Taurus-Littrow', 20.191, 30.772],
    ['Čchang-e 4 – odvrácená strana', -45.444, 177.599],
    ['Kráter Koperník', 9.62, 339.92],
    ['Kráter Tycho', -43.31, 348.64],
    ['Jižní pól – kráter Shackleton', -89.67, 129.8],
    ['Střed přivrácené strany', 0, 0],
    ['Střed odvrácené strany', 0, 180],
  ],
  mars: [
    ['Curiosity – kráter Gale', -4.59, 137.442],
    ['Perseverance – kráter Jezero', 18.445, 77.451],
    ['Spirit – kráter Gusev', -14.568, 175.473],
    ['Opportunity – Meridiani Planum', -1.946, 354.473],
    ['InSight – Elysium Planitia', 4.502, 135.623],
    ['Viking 1 – Chryse Planitia', 22.27, 312.05],
    ['Ču-žung – Utopia Planitia', 25.066, 109.925],
    ['Olympus Mons – vrchol (21,2 km)', 17.34, 226.97] /* 2.3: nejvyšší bod podle MOLA (dřív 18,65° / 226,2°, uvnitř kaldery) */,
    ['Olympus Mons – okraj kaldery', 18.15, 226.15, 90] /* 2.3: západní okraj, pohled na východ do kaldery 2–3 km hluboké */,
    ['Valles Marineris', -13.9, 300.8],
    ['Severní polární čepička', 88, 0],
  ],
  mercury: [
    ['Pánev Caloris', 30.5, 170.2],
    ['Kráter Prokofjev – led u severního pólu', 85.8, 62.9],
    ['Rovník, nultý poledník', 0, 0],
  ],
  venus: [
    ['Veněra 13 – první barevné snímky', -7.5, 303.0],
    ['Veněra 9 – první snímek povrchu', 31.01, 291.64],
    ['Maxwell Montes – nejvyšší hory', 65.2, 3.3],
  ],
  io: [
    ['Loki Patera – lávové jezero', 12.6, 51.1],
    ['Sopka Pele', -18.7, 104.7],
    ['Jupiter v nadhlavníku', 0, 0],
  ],
  europa: [
    ['Conamara Chaos', 9.7, 87.3],
    ['Jupiter v nadhlavníku', 0, 0],
    ['Odvrácená strana', 0, 180],
  ],
  ganymede: [
    ['Jupiter v nadhlavníku', 0, 0],
    ['Galileo Regio', 47, 231],
  ],
  callisto: [
    ['Pánev Valhalla', 14.7, 304],
    ['Jupiter v nadhlavníku', 0, 0],
  ],
  titan: [
    ['Huygens – místo přistání', -10.573, 167.665],
    ['Kraken Mare – moře z metanu', 68, 50],
    ['Ligeia Mare', 79, 112],
    ['Saturn v nadhlavníku', 0, 0],
  ],
  enceladus: [
    ['Tygří pruhy – gejzíry u jižního pólu', -82, 315],
    ['Saturn v nadhlavníku', 0, 0],
  ],
  mimas: [
    ['Kráter Herschel', -1.4, 248.1],
    ['Saturn v nadhlavníku', 0, 0],
  ],
  iapetus: [
    ['Rovníkový hřeben', 0, 180],
    ['Saturn v nadhlavníku', 0, 0],
  ],
  triton: [
    ['Neptun v nadhlavníku', 0, 0],
    ['Jižní polární čepička s gejzíry', -50, 0],
  ],
  pluto: [
    ['Sputnik Planitia – ledová pláň', 20, 180],
    ['Charon v nadhlavníku', 0, 0],
    ['Odvrácená strana – Charon tu není nikdy vidět', 0, 180],
  ],
  charon: [
    ['Pluto v nadhlavníku', 0, 0],
    ['Mordor Macula – červená čepička', 80, 0],
  ],
  ceres: [
    ['Kráter Occator – světlé skvrny', 19.82, 239.33],
    ['Ahuna Mons', -10.48, 316.2],
  ],
  vesta: [
    ['Pánev Rheasilvia – jižní pól', -75, 301],
    ['Rovník', 0, 0],
  ],
  phobos: [
    ['Kráter Stickney', 1, 311],
    ['Mars v nadhlavníku', 0, 0],
  ],
  deimos: [['Mars v nadhlavníku', 0, 0]],
  jupiter: [
    ['Rovník', 0, 0],
    ['Velká rudá skvrna', -22, -94] /* 2.3: stejné místo jako popisek na mapě (ui/extras.js), ne délka 0° */,
    ['Severní pól – polární záře', 85, 0],
  ],
  saturn: [
    ['Rovník – prstence jsou hranou', 0, 0],
    ['Střední šířky – prstence přes oblohu', 35, 0],
    ['Severní pól – šestiúhelník', 88, 0],
  ],
  uranus: [
    ['Rovník', 0, 0],
    ['Severní pól', 89, 0],
  ],
  neptune: [
    ['Rovník', 0, 0],
    ['Jižní polární oblast', -75, 0],
  ],
};
/* místa společná všem tělesům */
export const PLACES_ALL = [
  ['Rovník, nultý poledník', 0, 0],
  ['Severní pól', 90, 0],
  ['Jižní pól', -90, 0],
];

/* Obloha těles s atmosférou: barva v nadhlavníku (z) a u obzoru (h) ve dne, barva soumraku u obzoru (tw), síla k
   (o kolik denní obloha přesvítí hvězdy). opaque = z povrchu není přes oblaka nebo opar vidět vůbec nic (Venuše, Titan):
   zapnutý „vzduch“ tam znamená pohled zpod oblak, vypnutý pohled nad oblačností. Barvy jsou ilustrace podle snímků sond
   (Země, Mars: vozítka NASA; Venuše: Veněra 13; Titan: Huygens; Pluto: New Horizons); u obřích planet odhad. */
export const AIR = {
  earth: { z: [38, 92, 190], h: [150, 190, 238], tw: [240, 150, 85], k: 1 },
  /* Mars: přes den růžovohnědá obloha od prachu, kolem zapadajícího Slunce modravá (snímky vozítek NASA) */
  /* Mars: prach vysoko v atmosféře prodlouží soumrak – Spirit (sol 63) fotil hodinu před východem a Curiosity (sol 529) 80 min po západu
     ještě světlou oblohu; obloha proto slábne až do výšky Slunce −24° (pozemská do −13°). Odhad z těchto snímků, ne výpočet rozptylu. */
  mars: { z: [150, 118, 92], h: [205, 172, 138], tw: [120, 150, 200], k: 0.96, tw0: -24 },
  venus: { z: [196, 150, 70], h: [214, 172, 88], tw: [120, 80, 30], k: 1, opaque: true },
  titan: { z: [150, 96, 42], h: [182, 124, 56], tw: [90, 55, 25], k: 1, opaque: true },
  jupiter: { z: [34, 62, 120], h: [150, 158, 172], tw: [200, 150, 110], k: 0.9, odhad: true },
  saturn: { z: [58, 88, 140], h: [196, 186, 150], tw: [210, 170, 110], k: 0.9, odhad: true },
  uranus: { z: [56, 128, 160], h: [150, 200, 206], tw: [170, 190, 170], k: 0.88, odhad: true },
  neptune: { z: [28, 66, 156], h: [112, 150, 208], tw: [150, 160, 200], k: 0.88, odhad: true },
  pluto: { z: [2, 4, 9], h: [34, 58, 112], tw: [44, 74, 140], k: 0.1 },
  triton: { z: [1, 2, 4], h: [24, 30, 44], tw: [30, 38, 56], k: 0.05 },
};
/* jak obloha vypadá a proč (panel „Obloha odsud“) */
const SKYTXT = {
  earth:
    'Ve dne modrá: molekuly vzduchu rozptylují modré světlo asi 5× víc než červené (Rayleighův rozptyl). U obzoru je bledší, při západu Slunce oranžová až červená. V noci černá s hvězdami.',
  mars: 'Ve dne žlutohnědá až narůžovělá: barví ji jemný prach s oxidy železa. Kolem zapadajícího Slunce je naopak modrá záře – prach rozptyluje modré světlo dopředu (snímky vozítek Spirit, Curiosity a Perseverance).',
  venus:
    'Z povrchu žlutooranžová a rovnoměrně zatažená: asi 20 km silná vrstva oblak z kyseliny sírové propustí jen pár procent světla a husté ovzduší pohltí modrou. Slunce ani hvězdy odtud vidět nejsou (barevné snímky Veněry 13). Nad oblaky je obloha tmavá.',
  titan:
    'Z povrchu oranžovohnědá: opar z organických látek pohlcuje modré světlo. Je tam šero jako na Zemi krátce po západu Slunce; Slunce je jen světlejší skvrna a Saturn vidět není (snímky sondy Huygens). Nad oparem je obloha černá.',
  jupiter:
    'Nad oblaky nejspíš modrá: vodík rozptyluje světlo podobně jako pozemský vzduch. Slunce je pětkrát menší a 27× slabší než na Zemi. Odhad – žádná sonda tu oblohu zevnitř nevyfotila.',
  saturn:
    'Nad oblaky nejspíš modrá, u obzoru nažloutlá oparem (modrou oblohu severní polokoule fotila sonda Cassini zvenku). Slunce je asi 90× slabší než na Zemi. Odhad.',
  uranus: 'Nad oblaky nejspíš modrozelená: metan pohlcuje červené světlo. Slunce je asi 370× slabší než na Zemi. Odhad.',
  neptune:
    'Nad oblaky nejspíš sytě modrá: rozptyl ve vodíku a metan, který pohlcuje červené světlo. Slunce je asi 900× slabší než na Zemi. Odhad.',
  pluto:
    'Černá i ve dne, jen u obzoru namodralý opar (New Horizons). Slunce je odsud jen velmi jasná hvězda, asi 1 000–2 500× slabší než na Zemi – pořád ale mnohokrát jasnější než pozemský úplněk.',
  triton: 'Černá; atmosféra je asi 70 000× řidší než pozemská. U obzoru slabý opar a občas tmavé chocholy gejzírů.',
  moon: 'Černá i ve dne: není tu vzduch, který by světlo rozptyloval. Hvězdy jsou nad obzorem stále, ale oko oslněné osvětlenou krajinou je ve dne nevidí (proto nejsou na fotkách z Apolla).',
  io: 'Černá: sopečná atmosféra z oxidu siřičitého je příliš řídká. Velký kus oblohy přivrácené strany zabírá Jupiter.',
};
export const skyText = (b) =>
  SKYTXT[b.id] ||
  (b.type === 'comet'
    ? 'Černá; blízko Slunce ji může prozářit koma – oblak plynu a prachu kolem jádra.'
    : 'Černá i ve dne: těleso nemá atmosféru, která by světlo rozptylovala. Hvězdy jsou vidět stále.');
