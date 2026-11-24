// Atmosféry a složení těles (verze 2.1). Tři úrovně: dětská karta (kid – jedna věta), dospělá karta (adult – jeden až dva řádky)
// a Superkarta (tlak, teplota, plyny s podíly, vrstvy nitra: kůra, plášť, jádro).
// Zdroje: atmosféry planet, Měsíce a Pluta – NASA NSSDCA Planetary Fact Sheets (D. R. Williams, stav 2024–2025), podíly objemově;
// CO₂ na Zemi – NOAA Global Monitoring Laboratory, roční průměry z observatoře Mauna Loa (1959–2025) a ledovcová jádra;
// nitra – seismologie (Země, Měsíc: Apollo; Mars: InSight 2021–2023), jinak modely z gravitačních měření sond (Juno, Cassini,
// MESSENGER, Dawn, Galileo, New Horizons). Co je model a ne měření, je tak napsáno. U malých těles bez vlastního záznamu se
// použije obecný popis podle druhu tělesa (a u planetek podle spektrální třídy, kde ji známe).
// Vrstvy: [název, rozsah, složení, stav / poznámka]. Plyny: [plyn, podíl].

export const CO2 = {
  /* roční průměry Mauna Loa, ppm (NOAA GML, soubor co2_annmean_mlo.txt, staženo 24. 11. 2026) */
  rada: [
    [1959, 315.98],
    [1970, 325.68],
    [1980, 338.76],
    [1990, 354.45],
    [2000, 369.71],
    [2010, 390.1],
    [2020, 414.21],
    [2025, 427.35],
  ],
  ted: 429 /* rok 2026: měsíční průměr 429,1 ppm v červenci 2026 (NOAA), roční průměr 2026 se čeká kolem 429 ppm */,
  pred: 280 /* před průmyslovou revolucí (ledovcová jádra) */,
  doba_ledova: 180,
};

const S = {
  sun: {
    atm: {
      druh: 'vrstvy žhavého plynu (plazmatu), žádný pevný povrch',
      tlak: 've fotosféře asi 0,1 baru',
      teplota: 'fotosféra 5 500 °C, chromosféra 4 000–20 000 °C, korona 1–2 miliony °C',
      plyny: [
        ['vodík H', '73,5 % hmotnosti (92 % atomů)'],
        ['helium He', '24,9 % hmotnosti (7,8 % atomů)'],
        ['kyslík O', '0,77 %'],
        ['uhlík C', '0,29 %'],
        ['železo Fe', '0,16 %'],
        ['neon Ne', '0,12 %'],
        ['dusík N', '0,09 %'],
        ['křemík Si, hořčík Mg, síra S', 'po 0,04–0,07 %'],
      ],
      pozn: ['Složení fotosféry podle spektra; těžších prvků než helium je dohromady asi 1,5 % hmotnosti.'],
      kid: 'Slunce je celé ze žhavého plynu: hlavně z vodíku a helia.',
      adult: 'Fotosféra: vodík 73,5 % a helium 24,9 % hmotnosti, zbytek (kyslík, uhlík, železo…) asi 1,5 %.',
    },
    nitro: {
      vrstvy: [
        ['Jádro', 'do 25 % poloměru', 'vodík se slučuje na helium; ve středu už je helia asi 64 % hmotnosti', '15,7 milionu °C, hustota 150 g/cm³'],
        ['Zářivá vrstva', '25–71 % poloměru', 'vodík a helium; energii nese záření', 'foton se ven prodírá desítky tisíc let'],
        ['Konvektivní vrstva', '71–100 % poloměru', 'vodík a helium; energii nese proudění', 'vršky proudů jsou granule'],
        ['Fotosféra', 'asi 500 km', 'viditelný „povrch“', '5 500 °C'],
      ],
      celek: 'vodík asi 73 %, helium 25 %, ostatní prvky 1,5 % (hmotnostně)',
      kid: 'Uvnitř Slunce se vodík mění na helium. Z toho je světlo a teplo.',
      adult: 'Jádro (termojaderná fúze, 15,7 mil. °C), zářivá a konvektivní vrstva, fotosféra, chromosféra a korona.',
    },
  },
  mercury: {
    atm: {
      druh: 'exosféra – skoro vakuum, atomy se navzájem nesrážejí',
      tlak: 'méně než 0,000 000 000 000 005 baru (5·10⁻¹⁵)',
      teplota: 'povrch ve dne 430 °C, v noci −180 °C',
      plyny: [
        ['sodík Na', 'nejvíc'],
        ['hořčík Mg', 'hodně'],
        ['kyslík O', 'méně'],
        ['vodík H, helium He', 'ze slunečního větru'],
        ['draslík K, vápník Ca', 'stopy'],
      ],
      pozn: ['Atomy vyráží z povrchu sluneční vítr, záření a dopady mikrometeoritů; celá „atmosféra“ váží méně než 10 tun.', 'Sodík tvoří za planetou slabý ohon dlouhý miliony km.'],
      kid: 'Merkur nemá skoro žádný vzduch, jen pár atomů sodíku a dalších prvků.',
      adult: 'Jen exosféra (sodík, hořčík, kyslík, vodík, helium, draslík), tlak pod 5·10⁻¹⁵ baru.',
    },
    nitro: {
      vrstvy: [
        ['Kůra', 'asi 35 km', 'křemičitany bohaté na hořčík a síru, chudé na železo; tmavý grafit', 'pevná'],
        ['Plášť', 'asi 400 km (s kůrou)', 'křemičitany', 'pevný, tenký'],
        ['Vnější jádro', 'do poloměru asi 2 020 km', 'tekuté železo se sírou nebo křemíkem', 'vyrábí slabé magnetické pole'],
        ['Vnitřní jádro', 'poloměr asi 1 000 km', 'pevné železo a nikl', 'odhad z rotace (MESSENGER)'],
      ],
      celek: 'asi 70 % kovů a 30 % křemičitanů hmotnostně – nejvíc železa ze všech planet',
      kid: 'Merkur je skoro celý z kovu: uvnitř má obrovskou železnou kouli.',
      adult: 'Železné jádro sahá do 83 % poloměru (2 020 z 2 440 km), nad ním jen asi 400 km křemičitanového pláště a kůry.',
    },
  },
  venus: {
    atm: {
      druh: 'velmi hustá atmosféra',
      tlak: '92 barů (jako 900 m pod hladinou moře)',
      teplota: '464 °C u povrchu, ve dne i v noci stejně',
      plyny: [
        ['oxid uhličitý CO₂', '96,5 %'],
        ['dusík N₂', '3,5 %'],
        ['oxid siřičitý SO₂', '150 ppm'],
        ['argon Ar', '70 ppm'],
        ['vodní pára H₂O', '20 ppm'],
        ['oxid uhelnatý CO', '17 ppm'],
        ['helium He', '12 ppm'],
        ['neon Ne', '7 ppm'],
      ],
      pozn: ['Oblaka z kapiček kyseliny sírové ve výšce 48–70 km; pod nimi je čirý, ale rozpálený vzduch.', 'Skleníkový jev ohřívá povrch asi o 500 °C.', 'Vzácných plynů je méně než 0,01 %.'],
      kid: 'Venuše má strašně hustý vzduch z oxidu uhličitého. Drží teplo jako peřina, proto je tam 464 °C.',
      adult: 'CO₂ 96,5 %, N₂ 3,5 %, stopy SO₂ a argonu; tlak 92 barů, 464 °C. Oblaka z kyseliny sírové.',
    },
    nitro: {
      vrstvy: [
        ['Kůra', '10–30 km (odhad)', 'čedič (sondy Veněra)', 'pevná, bez deskové tektoniky'],
        ['Plášť', 'asi 2 800 km', 'křemičitany hořčíku a železa', 'model'],
        ['Jádro', 'poloměr asi 3 000–3 500 km', 'železo a nikl', 'neví se, zda je tekuté – Venuše nemá vlastní magnetické pole'],
      ],
      celek: 'velmi podobné Zemi (železo, kyslík, křemík, hořčík); seismická měření zatím nejsou',
      kid: 'Uvnitř je Venuše nejspíš podobná Zemi: kámen a uprostřed železo.',
      adult: 'Čedičová kůra, křemičitanový plášť a železné jádro asi do poloviny poloměru (model, bez seismických měření).',
    },
  },
  earth: {
    atm: {
      druh: 'atmosféra s kyslíkem',
      tlak: '1 014 hPa (1 bar) u hladiny moře',
      teplota: 'průměr 15 °C u povrchu',
      plyny: [
        ['dusík N₂', '78,08 %'],
        ['kyslík O₂', '20,95 %'],
        ['argon Ar', '0,934 %'],
        ['oxid uhličitý CO₂', '0,043 % (429 ppm v roce 2026)'],
        ['neon Ne', '18,2 ppm'],
        ['helium He', '5,2 ppm'],
        ['metan CH₄', '1,9 ppm'],
        ['krypton Kr', '1,1 ppm'],
        ['vodík H₂', '0,55 ppm'],
        ['xenon Xe', '0,09 ppm'],
      ],
      pozn: [
        'Vzácné plyny (argon, neon, helium, krypton, xenon) tvoří dohromady 0,94 % suchého vzduchu – skoro všechno je argon. Vzniká rozpadem draslíku v horninách.',
        'Podíly platí pro suchý vzduch. Vodní páry je navíc 0 až 4 %, nejvíc v tropech u hladiny moře.',
        'Celá atmosféra váží 5,1·10¹⁸ kg, asi miliontinu hmotnosti Země. Polovina je pod výškou 5,5 km.',
      ],
      co2: true,
      kid: 'Vzduch je hlavně dusík (78 %) a kyslík (21 %), který dýcháme. Skoro 1 % je vzácný plyn argon.',
      adult: 'N₂ 78,08 %, O₂ 20,95 %, vzácné plyny 0,94 % (hlavně argon), CO₂ 0,043 % a roste; vodní pára 0–4 %.',
    },
    nitro: {
      vrstvy: [
        ['Kůra', 'oceánská 5–10 km, pevninská 30–70 km', 'kyslík 46 %, křemík 28 %, hliník 8 %, železo 6 %, vápník 4 %, sodík, hořčík a draslík po 2 %', 'pevná; čedič pod oceány, žula na pevninách'],
        ['Plášť', 'do hloubky 2 890 km', 'křemičitany hořčíku a železa (olivín, pyroxeny, hlouběji bridgmanit)', 'pevný, ale pomalu teče; 67 % hmotnosti Země'],
        ['Vnější jádro', '2 890–5 150 km', 'tekuté železo a nikl, asi 10 % lehčích prvků (síra, kyslík, křemík)', '4 000–5 000 °C; proudění vyrábí magnetické pole'],
        ['Vnitřní jádro', 'poloměr 1 220 km', 'pevné železo a nikl', 'asi 5 400 °C, tlak 3,6 milionu atmosfér'],
      ],
      celek: 'železo 32 %, kyslík 30 %, křemík 15 %, hořčík 14 %, síra 3 %, nikl 2 %, vápník 1,5 %, hliník 1,4 % (hmotnostně)',
      povrch: '71 % povrchu kryjí oceány (1,4·10²¹ kg vody, 0,02 % hmotnosti Země)',
      kid: 'Země má tenkou kamennou slupku, pod ní horký plášť a uprostřed železné jádro.',
      adult: 'Kůra (kyslík, křemík, hliník), křemičitanový plášť do 2 890 km, tekuté vnější a pevné vnitřní jádro ze železa a niklu.',
    },
  },
  moon: {
    atm: {
      druh: 'exosféra – skoro vakuum',
      tlak: '3·10⁻¹⁵ baru (v noci)',
      teplota: 'povrch na rovníku −180 až +120 °C',
      plyny: [
        ['helium He', 'asi 40 000 atomů v cm³'],
        ['neon Ne', 'asi 45 000 v cm³'],
        ['vodík H₂', 'asi 35 000 v cm³'],
        ['argon Ar', 'asi 32 000 v cm³'],
        ['metan, čpavek, CO₂', 'po 1 000 v cm³'],
      ],
      pozn: ['Odhady nočního stavu z přístrojů Apolla; pozemský vzduch má v cm³ asi 2,5·10¹⁹ molekul.', 'Celá měsíční „atmosféra“ váží asi 25 tun.'],
      kid: 'Na Měsíci není vzduch. Proto je tam ticho a nebe je černé i ve dne.',
      adult: 'Jen exosféra (helium, neon, vodík, argon), tlak 3·10⁻¹⁵ baru; celá váží asi 25 tun.',
    },
    nitro: {
      vrstvy: [
        ['Kůra', '34–43 km (sondy GRAIL)', 'světlé vysočiny: anortozit (živce s vápníkem a hliníkem); tmavá moře: čedič s železem a titanem', 'pevná; nahoře rozdrcená na prach (regolit)'],
        ['Plášť', 'asi 1 300 km', 'olivín a pyroxeny', 'pevný; dole částečně natavený'],
        ['Vnější jádro', 'poloměr asi 330 km', 'tekuté železo se sírou', 'ze seismometrů Apolla'],
        ['Vnitřní jádro', 'poloměr asi 240 km', 'pevné železo', 'jádro je jen 1–2 % hmotnosti Měsíce'],
      ],
      celek: 'kyslík asi 43 %, křemík 20 %, dál hořčík, železo, vápník, hliník a titan (v horninách povrchu); železa je mnohem méně než v Zemi',
      kid: 'Měsíc je kamenný. Tmavé skvrny jsou ztuhlá láva, světlá místa jsou starší hory.',
      adult: 'Kůra z anortozitu a čediče (34–43 km), křemičitanový plášť a malé železné jádro (poloměr asi 330 km).',
    },
  },
  mars: {
    atm: {
      druh: 'řídká atmosféra',
      tlak: '6,4 hPa (0,6 % pozemského), podle roční doby 4,0–8,7 hPa',
      teplota: 'průměr asi −60 °C; v létě u rovníku až +20 °C',
      plyny: [
        ['oxid uhličitý CO₂', '95,1 %'],
        ['dusík N₂', '2,59 %'],
        ['argon Ar', '1,94 %'],
        ['kyslík O₂', '0,16 %'],
        ['oxid uhelnatý CO', '0,06 %'],
        ['vodní pára H₂O', '210 ppm'],
        ['neon Ne', '2,5 ppm'],
        ['krypton Kr', '0,3 ppm'],
        ['xenon Xe', '0,08 ppm'],
      ],
      pozn: ['Vzácných plynů jsou skoro 2 % (argon) – dvakrát větší podíl než na Zemi.', 'V zimě čtvrtina atmosféry vymrzne na polárních čepičkách jako suchý led, proto tlak během roku kolísá.', 'Prach ve vzduchu barví denní oblohu do růžovohněda a západ Slunce do modra.'],
      kid: 'Mars má řídký vzduch z oxidu uhličitého. Dýchat se tam nedá.',
      adult: 'CO₂ 95,1 %, N₂ 2,6 %, argon 1,9 %, kyslíku jen 0,16 %; tlak 6,4 hPa (0,6 % pozemského).',
    },
    nitro: {
      vrstvy: [
        ['Kůra', '24–72 km (InSight)', 'čedič; na povrchu prach s oxidy železa (rez), sírany, jíly a chloristany', 'pevná'],
        ['Plášť', 'do hloubky asi 1 560 km', 'křemičitany hořčíku a železa', 'pevný; na dně nejspíš natavená vrstva'],
        ['Jádro', 'poloměr asi 1 650–1 830 km', 'tekuté železo a nikl s velkým podílem síry a dalších lehkých prvků', 'ze seismometru InSight (2021–2023); analýza z roku 2025 naznačuje i pevné vnitřní jádro'],
      ],
      celek: 'kyslík, křemík, železo a hořčík; povrch má víc než dvakrát tolik železa co zemská kůra, proto je červený',
      kid: 'Mars je kamenný a zrezivělý: v prachu je železo, které zčervenalo.',
      adult: 'Čedičová kůra (24–72 km), křemičitanový plášť a tekuté železné jádro bohaté na síru (poloměr asi 1 650–1 830 km, InSight).',
    },
  },
  jupiter: {
    atm: {
      druh: 'plynný obr – atmosféra plynule přechází v nitro',
      tlak: 'hladina 1 baru se bere jako „povrch“; hlouběji přes 1 000 barů',
      teplota: '−108 °C na hladině 1 baru',
      plyny: [
        ['vodík H₂', '89,8 %'],
        ['helium He', '10,2 %'],
        ['metan CH₄', '3 000 ppm'],
        ['čpavek NH₃', '260 ppm'],
        ['deuterovaný vodík HD', '28 ppm'],
        ['etan C₂H₆', '5,8 ppm'],
        ['vodní pára H₂O', '4 ppm (hlouběji víc)'],
      ],
      pozn: ['Tři patra oblak: nahoře led čpavku, pod ním hydrosulfid amonný, nejníž vodní led a kapky.', 'Vítr až 150 m/s (540 km/h).', 'Hmotnostně je helia asi 24 %.'],
      kid: 'Jupiter je celý z plynu, hlavně z vodíku a helia. Nedá se na něm přistát.',
      adult: 'H₂ 89,8 %, He 10,2 %, stopy metanu a čpavku. Oblaka z ledu čpavku, hydrosulfidu amonného a vody.',
    },
    nitro: {
      vrstvy: [
        ['Plynný obal', 'horních asi 15 % poloměru', 'molekulární vodík a helium', 'houstne do kapaliny, žádná hladina'],
        ['Kovový vodík', 'od hloubky asi 10 000 km dolů', 'vodík stlačený tak, že vede proud jako kov', 'vyrábí nejsilnější magnetické pole mezi planetami'],
        ['Rozptýlené jádro', 'asi vnitřní polovina poloměru', 'těžší prvky (hornina, led) rozmíchané v kovovém vodíku, 10–25 hmotností Země', 'podle měření gravitace sondou Juno; ve středu asi 20 000 °C'],
      ],
      celek: 'vodík asi 75 %, helium 24 %, těžší prvky kolem 1–5 % (hmotnostně)',
      kid: 'Hluboko v Jupiteru je vodík tak stlačený, že se chová jako tekutý kov.',
      adult: 'Bez pevného povrchu: plynný vodík a helium, pod nimi tekutý kovový vodík a rozptýlené jádro z těžších prvků (Juno).',
    },
  },
  saturn: {
    atm: {
      druh: 'plynný obr – atmosféra plynule přechází v nitro',
      tlak: 'hladina 1 baru se bere jako „povrch“',
      teplota: '−139 °C na hladině 1 baru',
      plyny: [
        ['vodík H₂', '96,3 %'],
        ['helium He', '3,25 %'],
        ['metan CH₄', '4 500 ppm'],
        ['čpavek NH₃', '125 ppm'],
        ['deuterovaný vodík HD', '110 ppm'],
        ['etan C₂H₆', '7 ppm'],
      ],
      pozn: ['Helia je v horních vrstvách málo: nejspíš prší do nitra v kapkách.', 'Vítr u rovníku až 400 m/s (1 400 km/h).', 'Oblaka z ledu čpavku, hlouběji hydrosulfid amonný a voda; nad nimi opar, proto je Saturn bledší než Jupiter.'],
      kid: 'Saturn je z vodíku a helia. Je tak lehký, že by plaval na vodě.',
      adult: 'H₂ 96,3 %, He 3,25 %, stopy metanu a čpavku; helium nejspíš prší do nitra.',
    },
    nitro: {
      vrstvy: [
        ['Plynný obal', 'asi horní polovina poloměru', 'molekulární vodík a helium', 'houstne do kapaliny'],
        ['Kovový vodík', 'pod hloubkou asi 30 000 km', 'tekutý kovový vodík s kapkami helia', 'slabší magnetické pole než u Jupiteru'],
        ['Rozptýlené jádro', 'až do 60 % poloměru', 'led a hornina rozmíchané ve vodíku, asi 17 hmotností Země', 'podle vln v prstencích (Cassini); ve středu asi 12 000 °C'],
      ],
      celek: 'vodík a helium; těžších prvků víc než u Jupiteru (asi pětina hmotnosti)',
      kid: 'Uvnitř Saturnu je horký stlačený vodík a hluboko kamenné a ledové jádro.',
      adult: 'Plynný vodík a helium, tekutý kovový vodík a velké rozptýlené jádro z ledu a horniny (asi 17 hmotností Země).',
    },
    prstence: 'Prstence: přes 95 % vodní led, od zrnek prachu po balvany velké jako dům.',
  },
  uranus: {
    atm: {
      druh: 'ledový obr – atmosféra plynule přechází v nitro',
      tlak: 'hladina 1 baru se bere jako „povrch“',
      teplota: '−197 °C na hladině 1 baru, výš až −224 °C (nejchladnější atmosféra planet)',
      plyny: [
        ['vodík H₂', '82,5 %'],
        ['helium He', '15,2 %'],
        ['metan CH₄', '2,3 %'],
        ['deuterovaný vodík HD', '148 ppm'],
      ],
      pozn: ['Metan pohlcuje červené světlo, proto je Uran modrozelený.', 'Oblaka z ledu metanu, hlouběji čpavek, sirovodík a voda.'],
      kid: 'Uran má vzduch z vodíku, helia a metanu. Metan ho barví do modrozelena.',
      adult: 'H₂ 82,5 %, He 15,2 %, metan 2,3 % (dává modrozelenou barvu).',
    },
    nitro: {
      vrstvy: [
        ['Plynný obal', 'asi horních 20 % poloměru', 'vodík, helium a metan', 'jen 0,5–1,5 hmotnosti Země'],
        ['Plášť z „ledů“', 'většina planety', 'horká hustá tekutina z vody, čpavku a metanu', 'asi 13 hmotností Země; vede proud a vyrábí šikmé magnetické pole'],
        ['Jádro', 'do asi 20 % poloměru', 'hornina a železo, asi 0,5 hmotnosti Země', 'model; ve středu asi 5 000 °C'],
      ],
      celek: 'voda, čpavek a metan tvoří většinu hmotnosti; vodíku a helia je jen asi desetina',
      kid: 'Pod vzduchem Uranu je horká kaše z vody, čpavku a metanu.',
      adult: 'Tenký obal vodíku a helia, pod ním horká tekutina z vody, čpavku a metanu a malé kamenné jádro (model).',
    },
  },
  neptune: {
    atm: {
      druh: 'ledový obr – atmosféra plynule přechází v nitro',
      tlak: 'hladina 1 baru se bere jako „povrch“',
      teplota: '−201 °C na hladině 1 baru',
      plyny: [
        ['vodík H₂', '80,0 %'],
        ['helium He', '19,0 %'],
        ['metan CH₄', '1,5 %'],
        ['deuterovaný vodík HD', '192 ppm'],
        ['etan C₂H₆', '1,5 ppm'],
      ],
      pozn: ['Nejrychlejší vítr ve Sluneční soustavě: až 580 m/s (2 100 km/h).', 'Modrou barvu dává metan; skutečný odstín je bledší, podobný Uranu.'],
      kid: 'Neptun má vzduch z vodíku, helia a metanu a fouká tam nejsilnější vítr.',
      adult: 'H₂ 80 %, He 19 %, metan 1,5 %; vítr až 580 m/s.',
    },
    nitro: {
      vrstvy: [
        ['Plynný obal', 'asi horních 10–20 % poloměru', 'vodík, helium a metan', '1–2 hmotnosti Země'],
        ['Plášť z „ledů“', 'většina planety', 'horká hustá tekutina z vody, čpavku a metanu', '10–15 hmotností Země'],
        ['Jádro', 'malé', 'hornina a železo, asi 1,2 hmotnosti Země', 'model; ve středu asi 5 100 °C'],
      ],
      celek: 'jako Uran: hlavně voda, čpavek a metan; Neptun ale vyzařuje 2,6× víc tepla, než dostává od Slunce',
      kid: 'Uvnitř Neptunu je horká kaše z vody, čpavku a metanu a malé kamenné jádro.',
      adult: 'Obal vodíku a helia, plášť z horké vody, čpavku a metanu, kamenné jádro (model).',
    },
  },
  pluto: {
    atm: {
      druh: 'velmi řídká atmosféra, která s roční dobou houstne a vymrzá',
      tlak: 'asi 0,013 hPa (13 mikrobarů, New Horizons 2015)',
      teplota: 'povrch −233 až −249 °C',
      plyny: [
        ['dusík N₂', '99 %'],
        ['metan CH₄', '0,5 %'],
        ['oxid uhelnatý CO', '0,05 %'],
      ],
      pozn: ['Namodralý opar ve dvaceti vrstvách až do výšky 200 km.', 'Jak se Pluto vzdaluje od Slunce, atmosféra pomalu vymrzá na povrch.'],
      kid: 'Pluto má slaboučký vzduch z dusíku, který v zimě zmrzne a spadne jako jinovatka.',
      adult: 'N₂ 99 %, metan 0,5 %, CO 0,05 %; tlak asi 13 mikrobarů, namodralý opar.',
    },
    nitro: {
      vrstvy: [
        ['Povrch', 'kilometry', 'led dusíku (Sputnik Planitia), metanu a CO; „skály“ z vodního ledu; červenohnědé tholiny', 'ledovce dusíku pomalu tečou'],
        ['Plášť', 'asi 300 km', 'vodní led, pod ním možná oceán kapalné vody', 'oceán je hypotéza z tvaru a prasklin'],
        ['Jádro', 'poloměr asi 850 km', 'hornina', 'asi 70 % průměru'],
      ],
      celek: 'asi 2/3 hornina, 1/3 led (hustota 1,85 g/cm³)',
      kid: 'Pluto je z kamene a ledu. Na povrchu má zmrzlý dusík a hory z vodního ledu.',
      adult: 'Kamenné jádro (asi 70 % průměru), plášť z vodního ledu, možná s oceánem; na povrchu led dusíku, metanu a CO.',
    },
  },
  ceres: {
    atm: {
      druh: 'občasná stopa vodní páry',
      plyny: [['vodní pára H₂O', 'asi 6 kg za sekundu (družice Herschel, 2014)']],
      kid: 'Ceres nemá vzduch, jen z ní občas unikne trocha vodní páry.',
      adult: 'Bez trvalé atmosféry; občasná exosféra z vodní páry.',
    },
    nitro: {
      vrstvy: [
        ['Kůra', 'asi 40 km', 'směs ledu, solí a jílů (do 30–40 % vodního ledu)', 'světlé skvrny v kráteru Occator jsou uhličitan sodný'],
        ['Plášť', 'do středu', 'hornina s vázanou vodou; na rozhraní možná zbytky solanky', 'model podle sondy Dawn'],
      ],
      celek: 'asi čtvrtina hmotnosti je voda (hustota 2,16 g/cm³)',
      kid: 'Ceres je z kamene a ledu. Světlé skvrny na ní jsou sůl.',
      adult: 'Kůra z ledu, solí a jílů, pod ní hornina s vázanou vodou; asi čtvrtina hmotnosti je voda (Dawn).',
    },
  },
  vesta: {
    nitro: {
      vrstvy: [
        ['Kůra', 'desítky km', 'čedič (ztuhlá láva)', 'úlomky dopadají na Zemi jako meteority HED'],
        ['Plášť', '', 'olivín a pyroxeny', 'odkrytý v obří pánvi Rheasilvia'],
        ['Jádro', 'poloměr asi 110 km', 'železo a nikl', 'podle sondy Dawn; rozbor z roku 2025 velké jádro zpochybňuje'],
      ],
      celek: 'kamenné těleso, které se kdysi celé roztavilo a rozvrstvilo jako malá planeta (hustota 3,46 g/cm³)',
      kid: 'Vesta je kamenná a kdysi byla celá roztavená jako láva.',
      adult: 'Rozvrstvená jako planeta: čedičová kůra, olivínový plášť a nejspíš železné jádro (Dawn).',
    },
  },
  io: {
    atm: {
      druh: 'řídká sopečná atmosféra',
      tlak: 'asi miliardtina baru, nad sopkami víc',
      teplota: 'povrch −160 °C, láva přes 1 300 °C',
      plyny: [
        ['oxid siřičitý SO₂', 'přes 90 %'],
        ['oxid sirnatý SO, síra, kyslík, chlorid sodný', 'stopy'],
      ],
      pozn: ['Když Io vstoupí do stínu Jupiteru, atmosféra zčásti vymrzne na povrch.', 'Tunu plynu za sekundu strhává magnetické pole Jupiteru do prstence plazmatu.'],
      kid: 'Io má slabý vzduch ze sopečného plynu, který páchne jako zapálená sirka.',
      adult: 'Řídká atmosféra z SO₂ (asi miliardtina baru) ze sopek a z jinovatky; ve stínu Jupiteru vymrzá.',
    },
    nitro: {
      vrstvy: [
        ['Kůra', 'desítky km', 'křemičitanové lávy pokryté sírou a jinovatkou SO₂', 'přes 400 činných sopek'],
        ['Plášť', '', 'křemičitany, zčásti natavené (magma)', 'ohřívají ho slapy Jupiteru'],
        ['Jádro', 'poloměr 350–900 km', 'železo nebo sulfid železa', 'model (Galileo, Juno)'],
      ],
      celek: 'hornina a kov, žádný led (hustota 3,53 g/cm³ – nejhustší měsíc)',
      kid: 'Io je kamenná a plná sopek. Žlutou barvu má od síry.',
      adult: 'Křemičitanová kůra pokrytá sírou, natavený plášť a železné jádro; bez ledu.',
    },
  },
  europa: {
    atm: {
      druh: 'exosféra',
      tlak: 'asi biliontina baru',
      plyny: [
        ['kyslík O₂', 'většina'],
        ['vodní pára H₂O, vodík', 'stopy'],
      ],
      pozn: ['Kyslík nevyrábí život: záření Jupiteru štěpí led na povrchu.'],
      kid: 'Europa má jen pár molekul kyslíku nad ledem.',
      adult: 'Exosféra z kyslíku (asi 10⁻¹² baru), který vzniká štěpením ledu zářením.',
    },
    nitro: {
      vrstvy: [
        ['Ledová slupka', '15–25 km (odhad)', 'vodní led se solemi (sírany, chlorid sodný)', 'rozpraskaná slapy'],
        ['Oceán', '60–150 km', 'slaná kapalná voda, asi dvakrát víc než ve všech pozemských oceánech', 'nepřímý důkaz z magnetických měření (Galileo)'],
        ['Plášť', '', 'křemičitany', 'dno oceánu je kamenné'],
        ['Jádro', '', 'železo', 'model'],
      ],
      celek: 'hlavně hornina a kov, voda a led asi 6–8 % hmotnosti',
      kid: 'Pod ledem Europy je nejspíš slaný oceán, větší než všechny pozemské dohromady.',
      adult: 'Ledová slupka (15–25 km), pod ní slaný oceán hluboký 60–150 km, kamenný plášť a železné jádro (model).',
    },
  },
  ganymede: {
    atm: {
      druh: 'exosféra',
      plyny: [
        ['kyslík O₂', 'většina'],
        ['vodní pára H₂O', 'u rovníku ze sublimace ledu (Hubble 2021)'],
      ],
      kid: 'Ganymed má jen stopy kyslíku a vodní páry.',
      adult: 'Řídká exosféra z kyslíku a vodní páry; polární záře díky vlastnímu magnetickému poli.',
    },
    nitro: {
      vrstvy: [
        ['Ledová slupka', 'asi 150 km', 'vodní led', ''],
        ['Oceán', 'asi 100 km', 'slaná voda mezi dvěma vrstvami ledu', 'podle kývání polárních září (Hubble 2015)'],
        ['Hlubší led a plášť', '', 'led pod vysokým tlakem, pod ním křemičitany', 'model'],
        ['Jádro', '', 'tekuté železo', 'vyrábí vlastní magnetické pole – jediný takový měsíc'],
      ],
      celek: 'zhruba půl hornina, půl voda a led (hustota 1,94 g/cm³)',
      kid: 'Ganymed je napůl z kamene a napůl z ledu a má schovaný oceán.',
      adult: 'Led, podpovrchový slaný oceán, kamenný plášť a tekuté železné jádro s vlastním magnetickým polem.',
    },
  },
  callisto: {
    atm: {
      druh: 'exosféra',
      plyny: [
        ['oxid uhličitý CO₂', 'asi 7·10⁻¹² baru'],
        ['kyslík O₂', 'stopy'],
      ],
      kid: 'Callisto má jen nepatrné stopy plynu.',
      adult: 'Nepatrná exosféra z CO₂ a kyslíku.',
    },
    nitro: {
      vrstvy: [
        ['Povrch', '', 'vodní led, hornina, zmrzlý CO₂ a tmavé organické látky', 'nejvíc kráterů ve Sluneční soustavě'],
        ['Nitro', '', 'směs ledu a horniny, jen slabě rozvrstvená', 'možná oceán v hloubce 100–200 km (Galileo)'],
      ],
      celek: 'asi půl hornina, půl led (hustota 1,83 g/cm³)',
      kid: 'Callisto je koule z ledu a kamení posetá krátery.',
      adult: 'Slabě rozvrstvená směs ledu a horniny; možná podpovrchový oceán.',
    },
  },
  titan: {
    atm: {
      druh: 'hustá atmosféra – jediný měsíc, který ji má',
      tlak: '1,45 baru (o polovinu víc než na Zemi)',
      teplota: '−179 °C u povrchu',
      plyny: [
        ['dusík N₂', 'asi 95 % u povrchu'],
        ['metan CH₄', 'asi 5 % u povrchu, výš 1,4 %'],
        ['vodík H₂', '0,1 %'],
        ['etan, acetylen, propan, kyanovodík', 'stopy'],
      ],
      pozn: ['Oranžový opar jsou tholiny – složité organické látky, které ze dusíku a metanu vyrábí sluneční světlo.', 'Metan tu dělá to, co voda na Zemi: mraky, déšť, řeky a jezera.', 'Atmosféra sahá desetkrát výš než pozemská; člověk s křídly by tu mohl létat vlastní silou.'],
      kid: 'Titan má hustý oranžový vzduch z dusíku. Místo vody tam prší metan.',
      adult: 'N₂ asi 95 %, metan asi 5 %; tlak 1,45 baru, −179 °C. Oranžový opar z organických látek.',
    },
    nitro: {
      vrstvy: [
        ['Povrch', '', 'vodní led tvrdý jako skála, duny z organického písku, jezera kapalného metanu a etanu', 'Huygens přistál 2005'],
        ['Ledová slupka', '50–100 km', 'vodní led', ''],
        ['Oceán', 'hloubka neznámá', 'voda nejspíš se čpavkem nebo solemi', 'podle slapových deformací (Cassini)'],
        ['Jádro', 'poloměr asi 2 000 km', 'hornina s vázanou vodou', 'model'],
      ],
      celek: 'asi půl hornina, půl voda a led (hustota 1,88 g/cm³)',
      kid: 'Pod oranžovým vzduchem je led, jezera z metanu a hluboko schovaný oceán.',
      adult: 'Ledová slupka, podpovrchový oceán a kamenné jádro; na povrchu jezera metanu a etanu.',
    },
  },
  enceladus: {
    atm: {
      druh: 'gejzíry – místní oblak páry nad jižním pólem',
      plyny: [
        ['vodní pára H₂O', '96–99 %'],
        ['vodík H₂, CO₂, metan, čpavek', 'po desetinách až jednotkách %'],
        ['zrnka ledu se solemi, křemíkem, fosfáty a organickými látkami', 'v gejzírech'],
      ],
      pozn: ['Asi 200 kg vody za sekundu; část napadá zpět jako sníh, část tvoří Saturnův prstenec E.'],
      kid: 'Z Enceladu stříkají gejzíry vody rovnou do vesmíru.',
      adult: 'Bez trvalé atmosféry; gejzíry u jižního pólu chrlí vodní páru se solemi, vodíkem a organickými látkami.',
    },
    nitro: {
      vrstvy: [
        ['Ledová slupka', '20–25 km, u jižního pólu jen asi 5 km', 'čistý vodní led', 'nejbělejší těleso soustavy (odráží 80–100 % světla)'],
        ['Oceán', 'asi 30 km', 'slaná zásaditá voda s vodíkem a fosfáty', 'celoplanetární; podle kývání měsíce (Cassini)'],
        ['Jádro', 'poloměr asi 190 km', 'pórovitá hornina', 'horké prameny na dně oceánu'],
      ],
      celek: 'asi 60 % hornina, 40 % voda a led (hustota 1,61 g/cm³)',
      kid: 'Pod ledem Enceladu je slaný oceán. Jeho voda stříká ven gejzíry.',
      adult: 'Ledová slupka, celoplanetární slaný oceán a pórovité kamenné jádro s horkými prameny (Cassini).',
    },
  },
  triton: {
    atm: {
      druh: 'velmi řídká atmosféra',
      tlak: 'asi 0,014 hPa (14 mikrobarů, Voyager 2 1989)',
      teplota: 'povrch −235 °C',
      plyny: [
        ['dusík N₂', 'přes 99 %'],
        ['metan CH₄, oxid uhelnatý CO', 'stopy'],
      ],
      pozn: ['Gejzíry dusíku vynášejí tmavý prach do výšky 8 km.'],
      kid: 'Triton má slaboučký vzduch z dusíku a gejzíry.',
      adult: 'Řídká dusíková atmosféra (asi 14 mikrobarů) se stopami metanu; gejzíry dusíku.',
    },
    nitro: {
      vrstvy: [
        ['Povrch', '', 'led dusíku, vody, CO₂ a metanu', 'málo kráterů – mladý povrch'],
        ['Plášť', '', 'vodní led, možná oceán', 'model'],
        ['Jádro', 'asi 2/3 hmotnosti', 'hornina a kov', 'model (hustota 2,06 g/cm³)'],
      ],
      celek: 'asi 65–70 % hornina, zbytek ledy',
      kid: 'Triton je z kamene a ledu a je to nejspíš zajatý příbuzný Pluta.',
      adult: 'Kamenné jádro (asi 2/3 hmotnosti) a ledový plášť; povrch z ledu dusíku, vody a CO₂.',
    },
  },
  charon: {
    nitro: {
      vrstvy: [
        ['Povrch', '', 'vodní led a hydráty čpavku; červená čepička z tholinů u severního pólu', 'metan uniklý z Pluta tu přimrzá a záření ho barví'],
        ['Plášť', '', 'vodní led', 'dávný oceán zamrzl a roztrhl kůru'],
        ['Jádro', '', 'hornina', 'model (hustota 1,70 g/cm³)'],
      ],
      celek: 'asi 55 % hornina, 45 % led',
      kid: 'Charon je z ledu a kamení a má červenou čepičku.',
      adult: 'Vodní led a hornina; červená polární čepička z organických látek z Plutovy atmosféry.',
    },
  },
  eris: {
    atm: {
      druh: 'nejspíš žádná – teď je daleko od Slunce a plyny leží zmrzlé na povrchu',
      kid: 'Eris je tak daleko a studená, že jí vzduch zmrzl a spadl na zem.',
      adult: 'Atmosféra nezjištěna; metan a dusík jsou nyní zmrzlé na povrchu (odráží 96 % světla).',
    },
    nitro: {
      celek: 'hlavně hornina s ledovým pláštěm (hustota 2,43 g/cm³); na povrchu led metanu a dusíku',
      kid: 'Eris je kamenná koule obalená zářivě bílým ledem.',
      adult: 'Kamenné nitro s ledovým pláštěm; povrch z ledu metanu a dusíku.',
    },
  },
  makemake: {
    nitro: {
      celek: 'led metanu, etanu a dusíku na povrchu, uvnitř led a hornina',
      kid: 'Makemake je ledový svět pokrytý zmrzlým metanem.',
      adult: 'Povrch z ledu metanu a etanu, načervenalý tholiny; uvnitř led a hornina.',
    },
  },
  haumea: {
    nitro: {
      celek: 'hornina pokrytá tenkou vrstvou krystalického vodního ledu (hustota asi 2 g/cm³)',
      kid: 'Haumea je kamenné vejce s ledovou slupkou, které se točí jednou za 4 hodiny.',
      adult: 'Kamenné těleso s tenkou slupkou vodního ledu; rychlá rotace ho protáhla do tvaru vejce.',
    },
  },
  phobos: {
    nitro: {
      celek: 'tmavá pórovitá hornina bohatá na uhlík, podobná planetkám tříd C a D (hustota 1,86 g/cm³)',
      kid: 'Phobos je tmavý kámen plný děr jako pemza.',
      adult: 'Tmavá pórovitá hornina bohatá na uhlík; uvnitř nejspíš dutiny nebo led.',
    },
  },
  deimos: {
    nitro: {
      celek: 'tmavá pórovitá hornina bohatá na uhlík (hustota 1,47 g/cm³), povrch zasypaný prachem',
      kid: 'Deimos je malý tmavý kámen zasypaný prachem.',
      adult: 'Tmavá pórovitá hornina bohatá na uhlík, pod silnou vrstvou prachu.',
    },
  },
  '67p': {
    atm: {
      druh: 'koma – oblak plynu a prachu, jen blízko Slunce',
      plyny: [
        ['vodní pára H₂O', 'většina'],
        ['oxid uhličitý CO₂, oxid uhelnatý CO', 'jednotky až desítky % vody'],
        ['kyslík O₂', 'asi 3,8 % vody (Rosetta) – nečekaný nález'],
        ['metanol, čpavek, sirovodík, glycin', 'stopy'],
      ],
      kid: 'U Slunce se z komety vypařuje led a kolem ní je oblak plynu a prachu.',
      adult: 'Koma: voda, CO₂, CO a molekulární kyslík (3,8 % vody); voda má 3× víc deuteria než pozemské oceány (Rosetta).',
    },
    nitro: {
      celek: 'prach, led a organické látky; 70–75 % objemu jsou dutiny (hustota 0,53 g/cm³)',
      kid: 'Kometa je špinavá sněhová koule lehčí než voda.',
      adult: 'Pórovitá směs prachu, ledu a organických látek, hustota jen 0,53 g/cm³ (Rosetta).',
    },
  },
  halley: {
    atm: {
      druh: 'koma – oblak plynu a prachu, jen blízko Slunce',
      plyny: [
        ['vodní pára H₂O', 'asi 80 %'],
        ['oxid uhelnatý CO', '10–17 %'],
        ['oxid uhličitý CO₂', '3–4 %'],
        ['metan, čpavek, kyanovodík', 'stopy'],
      ],
      kid: 'U Slunce se z komety vypařuje led a naroste jí ohon.',
      adult: 'Koma: voda asi 80 %, CO 10–17 %, CO₂ 3–4 % (sonda Giotto 1986).',
    },
    nitro: {
      celek: 'led, prach a organické látky; povrch tmavý jako uhlí (odráží 4 % světla)',
      kid: 'Jádro komety je černé jako uhlí a pod povrchem je led.',
      adult: 'Jádro z ledu, prachu a organických látek („CHON“ zrnka), albedo 0,04 (Giotto).',
    },
  },
  bennu: {
    nitro: {
      celek: 'hromada sutě: jíly s vázanou vodou, uhličitany, fosfáty a 4–5 % uhlíku; ve vzorcích aminokyseliny a všech pět bází DNA a RNA (OSIRIS-REx, 2023–2025)',
      kid: 'Bennu je hromada tmavých kamenů. Sonda z něj přivezla kousky na Zemi.',
      adult: 'Hromada sutě bohatá na uhlík a jíly s vázanou vodou; ve vzorcích OSIRIS-REx aminokyseliny a báze nukleových kyselin.',
    },
  },
  ryugu: {
    nitro: {
      celek: 'hromada sutě: tmavé jíly s vázanou vodou a uhlík; ve vzorcích aminokyseliny a uracil (Hajabusa 2)',
      kid: 'Ryugu je hromada tmavých kamenů ve tvaru káči.',
      adult: 'Hromada sutě z uhlíkatých jílů; vzorky sondy Hajabusa 2 obsahují aminokyseliny.',
    },
  },
  psyche: {
    nitro: {
      celek: 'neobvykle mnoho kovu (železo a nikl, odhad 30–60 % objemu) s křemičitany; hustota asi 4 g/cm³',
      kid: 'Psyche je planetka s velkým množstvím železa.',
      adult: 'Bohatá na kov (železo, nikl), možná odhalené jádro dávného tělesa; míří k ní sonda Psyche (přílet 2029).',
    },
  },
  itokawa: {
    nitro: {
      celek: 'hromada sutě z olivínu a pyroxenů, stejná hornina jako běžné kamenné meteority (chondrity LL); 40 % objemu dutiny',
      kid: 'Itokawa je hromada kamenů a štěrku, která drží pohromadě jen slabou tíží.',
      adult: 'Hromada sutě z křemičitanů (olivín, pyroxen), složením jako chondrity LL (vzorky Hajabusa 2010).',
    },
  },
};

/* spektrální třídy planetek, kde jsou známé (Tholen / SMASS) */
const TRIDA = {
  S: 'kamenná planetka třídy S: křemičitany (olivín, pyroxen) s příměsí železa a niklu',
  C: 'uhlíkatá planetka třídy C: tmavé jíly s vázanou vodou a uhlík',
  B: 'uhlíkatá planetka třídy B: tmavé jíly s vázanou vodou a uhlík',
  M: 'planetka třídy M: velký podíl kovu (železo, nikl)',
  V: 'čedičová planetka třídy V: ztuhlá láva',
  E: 'planetka třídy E: světlý křemičitan enstatit',
  D: 'velmi tmavá načervenalá planetka třídy D: uhlík, organické látky, možná led',
  P: 'velmi tmavá planetka třídy P: uhlík a organické látky, možná led',
  X: 'planetka třídy X: složení nejisté (kov nebo tmavý uhlíkatý materiál)',
};
const AST = {
  eros: 'S', gaspra: 'S', ida: 'S', juno: 'S', iris: 'S', hebe: 'S', flora: 'S', eunomia: 'S', didymos: 'S', apophis: 'S',
  icarus: 'S', massalia: 'S', melpomene: 'S', victoria: 'S', irene: 'S', astraea: 'S', harmonia: 'S', amphitrite: 'S',
  herculin: 'S', laetitia: 'S', parthenope: 'S', julia: 'S', nysa: 'E', steins: 'E',
  hygiea: 'C', mathilde: 'C', interamnia: 'B', pallas: 'B', davida: 'C', euphrosyne: 'C', fortuna: 'C', daphne: 'C',
  thisbe: 'B', egeria: 'C', themis: 'C', doris: 'C', diotima: 'C', hermione: 'C', bamberga: 'C', patientia: 'C', ursula: 'C',
  alauda: 'C', eugenia: 'C', elektra: 'C', hesperia: 'M', kleopatra: 'M', lutetia: 'X', kalliope: 'M',
  cybele: 'P', sylvia: 'P', phaethon: 'B',
};

/* obecné popisy podle druhu tělesa */
function generic(b) {
  const t = b.type;
  if (t === 'comet' || b.coma)
    return {
      atm: {
        druh: 'koma – oblak plynu a prachu, jen blízko Slunce',
        plyny: [
          ['vodní pára H₂O', 'většina'],
          ['oxid uhličitý CO₂, oxid uhelnatý CO', 'jednotky až desítky %'],
          ['metanol, čpavek, kyanovodík', 'stopy'],
        ],
        kid: 'U Slunce se z komety vypařuje led: kolem jádra je oblak plynu a prachu a za ním ohon.',
        adult: 'Daleko od Slunce žádná; blíž než asi 3 AU koma z vodní páry, CO₂, CO a prachu.',
      },
      nitro: {
        celek: 'led (voda, CO₂, CO), prach a organické látky; povrch tmavý, uvnitř hodně dutin',
        kid: 'Jádro komety je špinavá sněhová koule: led smíchaný s prachem.',
        adult: 'Jádro z ledu, prachu a organických látek („špinavá sněhová koule“).',
      },
    };
  if (t === 'asteroid') {
    const c = AST[b.id];
    return {
      nitro: {
        celek: c ? TRIDA[c] : 'hornina; přesné složení se nezná',
        kid: c === 'M' ? 'Tahle planetka má v sobě hodně železa.' : c === 'C' || c === 'B' ? 'Tmavá planetka z kamene a uhlíku.' : 'Kamenná planetka.',
        adult: c ? TRIDA[c][0].toUpperCase() + TRIDA[c].slice(1) + '.' : 'Kamenné těleso; spektrální třída v katalogu aplikace chybí.',
      },
    };
  }
  if (t === 'tno' || t === 'centaur' || t === 'dwarf')
    return {
      nitro: {
        celek: 'ledy (voda, metan, dusík) a hornina; povrch často načervenalý tholiny',
        kid: 'Ledové těleso z okraje Sluneční soustavy.',
        adult: 'Směs ledů (voda, metan) a horniny; povrch načervenalý organickými látkami.',
      },
    };
  if (t === 'interstellar')
    return {
      nitro: {
        celek: 'složení se zná jen ze spektra na dálku',
        kid: 'Návštěvník od jiné hvězdy.',
        adult: 'Těleso z jiné planetární soustavy; složení známé jen ze spektra.',
      },
    };
  if (t === 'moon') {
    const icy = ['saturn', 'uranus', 'neptune', 'pluto', 'haumea', 'eris', 'orcus', 'quaoar'].includes(b.parent),
      rho = b.rho;
    return {
      nitro: {
        celek: icy
          ? 'vodní led s příměsí horniny' + (rho ? ` (hustota ${String(rho).replace('.', ',')} g/cm³)` : '')
          : b.parent === 'jupiter'
            ? b.R > 60
              ? 'hornina, možná s ledem'
              : 'tmavá hornina – nejspíš zachycená planetka'
            : 'hornina',
        kid: icy ? 'Měsíc z ledu a kamení.' : 'Malý kamenný měsíc.',
        adult: icy ? 'Hlavně vodní led s příměsí horniny.' : 'Kamenné těleso bez atmosféry.',
      },
    };
  }
  return {};
}

const NONE = { druh: 'žádná', kid: '', adult: 'Bez atmosféry.' };
/** Složení tělesa b: { atm, nitro, prstence, vlastni } – atm.zadna = true, když těleso atmosféru nemá. */
export function slozeniOf(b) {
  const s = S[b.id],
    g = generic(b),
    atm = (s && s.atm) || g.atm || { ...NONE, zadna: true },
    nitro = (s && s.nitro) || g.nitro || null;
  return { atm, nitro, prstence: s && s.prstence, vlastni: !!s };
}
export const SLOZENI_ZDROJ =
  'Atmosféry: NASA NSSDCA Planetary Fact Sheets (2024–2025), podíly objemově. CO₂: NOAA GML, Mauna Loa. Nitra: seismologie (Země, Měsíc, Mars – InSight), jinak modely z měření sond.';
