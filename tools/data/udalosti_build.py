# Sestaví src/data/udalosti.json: ponechá ručně psaná zatmění Slunce (první verze) a přidá ostatní karty.
# Časy (jd, UT) a čísla „model“ bere z výstupu tools/test/probe_kandidati.mjs (--json), hodnoty „pramen“ z tools/data/kandidati.json.
# Spuštění: python3 -I tools/data/udalosti_build.py /tmp/kAll.json
import json, math, sys
K = {e['id']: e for e in json.load(open(sys.argv[1]))}
C = {e['id']: e for e in json.load(open('tools/data/kandidati.json'))}
OLD = [e for e in json.load(open('src/data/udalosti.json')) if e['id'] in ('s1415', 's1706', 's1919', 's1999', 's2026', 's2027', 's2135')]
MES = 'ledna února března dubna května června července srpna září října listopadu prosince'.split()


def greg(jd):
    z = math.floor(jd + 0.5)
    a = math.floor((z - 1867216.25) / 36524.25)
    A = z + 1 + a - a // 4
    return _ymd(A)


def jul(jd):
    return _ymd(math.floor(jd + 0.5))


def _ymd(A):
    B = A + 1524
    c = math.floor((B - 122.1) / 365.25)
    d = math.floor(365.25 * c)
    e = math.floor((B - d) / 30.6001)
    day = B - d - math.floor(30.6001 * e)
    mo = e - 1 if e < 14 else e - 13
    y = c - 4716 if mo > 2 else c - 4715
    return y, mo, day


def txt(ymd):
    y, m, d = ymd
    return '%d. %s %s' % (d, MES[m - 1], ('%d př. n. l.' % (1 - y)) if y <= 0 else str(y))


def jdJul(y, m, d, h=0.0):
    if m <= 2:
        y, m = y - 1, m + 12
    return math.floor(365.25 * (y + 4716)) + math.floor(30.6001 * (m + 1)) + d - 1524.5 + h / 24


def ut(jd):
    f = (jd + 0.5) % 1 * 24
    return '%d:%02d' % (int(f), int(round(f % 1 * 60)) % 60)


def rec(id, typ, ikona, nazev, podtitul, jd, okno, misto, text, perlicka, deti, shoda, pramen, cas, **kw):
    e = dict(id=id, typ=typ, ikona=ikona, nazev=nazev, podtitul=podtitul, jd=round(jd, 5), okno=okno, datum=txt(greg(jd)))
    if jd < 2299160.5:
        e['datumJul'] = txt(jul(jd))
    e.update(cas=cas, misto=misto, text=text, perlicka=perlicka, deti=deti, shoda=shoda, pramen=pramen)
    e.update(kw)
    return e


def radec(h, m, s, sign, dd, dm):
    return round((h + m / 60 + s / 3600) * 15, 4), round(sign * (dd + dm / 60), 4)


NASA_S = 'F. Espenak a J. Meeus: Five Millennium Catalog of Solar Eclipses (NASA); místní časy z Besselových elementů téhož katalogu.'
NASA_M = 'F. Espenak a J. Meeus: Five Millennium Catalog of Lunar Eclipses (NASA).'
SN = 'D. A. Green a F. R. Stephenson: Historical Supernovae (2003); přehled na Wikipedii. Jasnost v čase je náš zjednodušený průběh mezi doloženým maximem a koncem viditelnosti.'
N = []
# ---------- zatmění Slunce (místní okolnosti: tools/model/besel_misto.py) ----------
N.append(rec('s-0584', 'slunce', '🌑', 'Thalétovo zatmění', 'bitva, kterou ukončila tma', jdJul(-584, 5, 28, 15.9445), 0.04,
    'střední Anatolie, řeka Halys',
    'Lýdové a Médové spolu válčili šestým rokem, když se podle Hérodota uprostřed bitvy „den změnil v noc“. Obě vojska složila zbraně a uzavřela mír. Hérodotos dodává, že úkaz předpověděl Iónům Thalés z Milétu.',
    'Pokud je ztotožnění správné, jde o nejstarší událost dějin, kterou umíme určit na den. Jak mohl Thalés zatmění předpovědět, historici dodnes nevědí – a řada z nich o tom pochybuje.',
    'Dvě vojska spolu bojovala a najednou se uprostřed dne setmělo. Vojáci se tak lekli, že přestali bojovat a uzavřeli mír.',
    'Model: čas největší fáze o 2 minuty jinak než katalog NASA, osa stínu do 0,5°. V místě bitvy (odhad polohy) vychází z elementů NASA 97 % průměru Slunce, 9° nad obzorem. Před 2 600 lety ale neznáme přesně zpomalování rotace Země: nejistota desítek minut posouvá pás o stovky kilometrů, takže „úplné, nebo skoro úplné“ tady rozhodnout nejde.',
    NASA_S + ' Hérodotos, Dějiny I, 74.', 'největší fáze kolem 15:57 světového času, podvečer (nejistota desítky minut)', lat=39.9, lon=34.0, vyska=9000, telo='earth'))
N.append(rec('s1715', 'slunce', '🌑', 'Halleyovo zatmění', 'první mapa stínu vydaná předem', jdJul(1715, 4, 22, 9.1257), 0.035, 'Londýn',
    'Edmond Halley spočítal, kudy stín Měsíce projde Anglií, a mapu nechal vytisknout předem, aby se lidé nelekli. Zároveň poprosil veřejnost, aby mu změřila, jak dlouho tma trvala. V Londýně trvalo úplné zatmění přes tři minuty.',
    'Halley se spletl jen asi o čtyři minuty v čase a o zhruba 30 km na okraji pásu. Podle došlých měření pak mapu opravil – jeden z prvních projektů občanské vědy.',
    'Pan Halley dopředu nakreslil mapu, kudy přejde stín Měsíce. A měl skoro úplnou pravdu! Lidé mu pak psali, jak dlouho u nich byla tma.',
    'Model: největší fáze v Londýně vychází na 89 %, katalog NASA dává úplné zatmění. Pás úplného zatmění má model posunutý až o 100 km; časy a „úplné“ na kartě jsou z NASA.',
    NASA_S, 'úplné od 9:05:52 do 9:09:13 světového času (3 minuty 21 sekund)', lat=51.51, lon=-0.13, vyska=5000, telo='earth'))
N[-1]['datumJul'] = '22. dubna 1715 (v Anglii tehdy ještě platil juliánský kalendář)'
N.append(rec('s1868', 'slunce', '🌑', 'Zatmění, které našlo helium', 'prvek objevený dřív na Slunci než na Zemi', 2403562.5 + 4.1855 / 24, 0.04, 'Guntúr, Indie',
    'Francouz Pierre Janssen namířil při zatmění spektroskop na protuberance a uviděl jasně žlutou čáru, která nepatřila žádnému známému prvku. O dva měsíce později ji nezávisle našel Norman Lockyer a s chemikem Franklandem nový prvek nazvali helium – podle řeckého Hélios, Slunce.',
    'Na Zemi se helium podařilo najít až roku 1895, o 27 let později. Janssen navíc hned druhý den zjistil, že protuberance jdou spektroskopem pozorovat i bez zatmění.',
    'Při tomhle zatmění vědci uviděli ve světle Slunce žlutou čárku, kterou nikdo neznal. Tak objevili helium – plyn, kterým se dnes plní balónky.',
    'Model: čas největší fáze o 1 minutu jinak než katalog NASA, osa stínu do 1°. V Guntúru dává NASA úplné zatmění 5 minut 44 sekund.',
    NASA_S, 'úplné od 4:08:15 do 4:13:59 světového času (5 minut 44 sekund)', lat=16.30, lon=80.45, vyska=6000, telo='earth'))
# ---------- zatmění Měsíce ----------
def mes(id, nazev, podtitul, misto, lat, lon, text, perl, deti, extra=''):
    k, c = K[id], C[id]['ref']
    tot = 'úplná fáze %d minut' % round(c['tot']) if c['tot'] else 'částečné, Země zakryla %d %% průměru Měsíce' % round(c['umag'] * 100)
    return rec(id, 'mesic', '🌕', nazev, podtitul, k['t'], 0.085, misto, text, perl, deti,
        'Model: střed zatmění %s světového času, velikost %.2f%s. NASA: %s, velikost %.2f%s.%s' % (
            ut(k['t']), k['umag'], ', úplná fáze %d minut' % round(k['tot']) if k['tot'] else '',
            k['ref'][-5:], c['umag'], ', úplná fáze %d minut' % round(c['tot']) if c['tot'] else '', extra),
        NASA_M, 'střed zatmění %s světového času; %s' % (k['ref'][-5:].lstrip('0'), tot), lat=lat, lon=lon, vyska=9000, telo='moon')
N.append(mes('m-0412', 'Níkiovo zatmění', 'váhání, které stálo Athény vojsko', 'Syrakusy, Sicílie', 37.07, 15.29,
    'Athénské vojsko se po dvou letech neúspěšného obléhání Syrakus chystalo v noci odplout. Tu noc se zatměl Měsíc. Věštci žádali počkat „třikrát devět dní“ a velitel Níkiás poslechl. Syrakusané mezitím uzavřeli přístav a athénská výprava skončila zkázou.',
    'Historik Thúkydidés, současník událostí, k tomu suše poznamenal, že Níkiás byl „až příliš oddán věštění a podobným věcem“.',
    'Vojáci chtěli v noci odplout domů, ale Měsíc najednou ztmavl. Báli se a zůstali. To se jim nevyplatilo.'))
N.append(mes('m1453', 'Zatmění nad Konstantinopolí', 'týden před pádem města', 'Konstantinopol (Istanbul)', 41.01, 28.98,
    'Osmanské vojsko obléhalo Konstantinopol sedmým týdnem. Večer 22. května vyšel nad městem Měsíc už zčásti zatmělý – místo úplňku srpek. Obránci si vybavili staré proroctví, že město nepadne, dokud bude Měsíc na nebi celý. Za sedm dní, 29. května 1453, hradby padly.',
    'Tisíciletá Východořímská říše tím skončila. Mnoho učebnic právě tímto rokem končí středověk.',
    'Město bylo obklíčené a lidé čekali úplněk. Jenže Měsíc vyšel nakousnutý, protože na něj padl stín Země. Všichni se moc lekli.'))
N.append(mes('m1504', 'Kolumbovo zatmění', 'jak astronomické tabulky zachránily posádku', 'Jamajka', 18.4, -77.1,
    'Kryštof Kolumbus uvízl s posádkou na Jamajce a místní obyvatelé jim po půl roce přestali nosit jídlo. Kolumbus měl s sebou astronomické tabulky, které na večer 29. února předpovídaly zatmění Měsíce. Oznámil, že jeho Bůh se hněvá a vezme jim Měsíc. Když Měsíc zrudl, zásoby se vrátily.',
    'Podle vyprávění Kolumbova syna odměřoval admirál délku zatmění přesýpacími hodinami a „odpuštění“ ohlásil těsně před koncem úplné fáze.',
    'Námořník Kolumbus věděl z knížky, kdy se Měsíc zatmí. Lidem na ostrově řekl, že jim Měsíc schová – a ono se to opravdu stalo!',
    ' Na Jamajce byl tou dobou večer 29. února (rok 1504 byl přestupný).'))
# ---------- přechody přes Slunce ----------
def pre(id, nazev, podtitul, b, misto, text, perl, deti, pram):
    k, c = K[id], C[id]
    return rec(id, 'prechod', '☀️', nazev, podtitul, k['t'], 0.16 if b == 'venus' else 0.12, misto, text, perl, deti,
        'Model: nejmenší vzdálenost středů %.2f′ v %s světového času. Katalog: %.2f′ v %s. Model je soustavně o 6 minut napřed: ukazuje, kde tělesa skutečně jsou, a nepočítá dobu, po kterou k nám letí světlo.' % (
            k['sep'], ut(k['t']), c['ref']['sep'], c['ut']),
        pram, 'střed přechodu %s světového času' % c['ut'].lstrip('0'), a='sun', b=b, telo='sun')
N.append(pre('pM1631', 'První pozorovaný přechod Merkuru', 'Gassendi viděl, co Kepler předpověděl', 'mercury', 'Paříž',
    'Johannes Kepler spočítal, že 7. listopadu 1631 přejde Merkur přes Slunce. Sám se toho nedožil, zemřel rok předtím. V Paříži si Pierre Gassendi promítl Slunce dalekohledem na papír a mezi mraky uviděl drobnou černou tečku.',
    'Tečka byla tak malá, že ji Gassendi nejdřív pokládal za sluneční skvrnu. Do té doby si všichni mysleli, že planety jsou na obloze mnohem větší.',
    'Malá planeta Merkur přešla přesně před Sluncem. Vypadala jako maličká černá tečka. Poprvé v dějinách to někdo opravdu viděl.',
    'F. Espenak: Seven Century Catalog of Mercury Transits (NASA).'))
N.append(pre('pV1639', 'První pozorovaný přechod Venuše', 'dvacetiletý Horrocks opravil Keplera', 'venus', 'Much Hoole, Anglie',
    'Keplerovy tabulky tvrdily, že Venuše roku 1639 Slunce těsně mine. Mladý Jeremiah Horrocks si výpočet opravil a zjistil, že přechod nastane. Stihl o tom napsat jedinému člověku, příteli Williamu Crabtreemu. Přechod Venuše tak poprvé v dějinách viděli jen ti dva.',
    'Horrocks úkaz zachytil asi půl hodiny před západem Slunce. Z průměru černého kotoučku odhadl vzdálenost Slunce lépe než kdokoli před ním. Zemřel o dva roky později, ve dvaadvaceti.',
    'Mladý astronom Jeremiah si sám spočítal, že Venuše přejde před Sluncem. Měl pravdu! Viděl to jen on a jeho kamarád.',
    'F. Espenak: Six Millennium Catalog of Venus Transits (NASA).'))
N[-1]['datumJul'] = '24. listopadu 1639 (v Anglii tehdy ještě platil juliánský kalendář)'
N.append(pre('pV1761', 'Přechod Venuše 1761', 'Lomonosov objevil atmosféru Venuše', 'venus', 'Petrohrad',
    'Edmond Halley navrhl změřit přechodem Venuše vzdálenost Slunce, a tak roku 1761 vyrazily výpravy do celého světa – první velký mezinárodní vědecký projekt. Michail Lomonosov si v Petrohradu všiml, že když Venuše vstupovala na sluneční kotouč, obtáhl ji světlý lem. Usoudil správně, že planeta má hustou atmosféru.',
    'Válka výpravám nepřála: Francouz Le Gentil dorazil do Indie pozdě, počkal osm let na další přechod – a v rozhodující chvíli se zatáhlo.',
    'Venuše přešla před Sluncem jako černá tečka. Kolem ní se na chvilku rozsvítil proužek světla. Tak lidé zjistili, že Venuše má vzduch.',
    'F. Espenak: Six Millennium Catalog of Venus Transits (NASA).'))
N.append(pre('pV1769', 'Přechod Venuše 1769', 'Cook na Tahiti, Hell za polárním kruhem', 'venus', 'Tahiti',
    'Kapitán James Cook odplul na Tahiti hlavně kvůli tomuto dni; místu, odkud měřil, se dodnes říká Point Venus. Na opačném konci světa, ve Vardø na severu Norska, pozoroval jezuita Maximilian Hell, rodák z dnešního Slovenska. Z měření po celém světě vyšla vzdálenost Slunce asi 153 milionů km.',
    'Dnes víme, že je to 149,6 milionu km – tehdejší výsledek byl vedle jen o 2 %. Další přechod Venuše nastane až v prosinci 2117.',
    'Námořník Cook plul přes půl světa, aby viděl, jak Venuše přejde před Sluncem. Díky tomu lidé spočítali, jak je Slunce daleko.',
    'F. Espenak: Six Millennium Catalog of Venus Transits (NASA).'))
# ---------- konjunkce a zákryty ----------
def dvo(id, typn, ikona, nazev, podtitul, a, b, okno, misto, text, perl, deti, shoda, pram, cas):
    return rec(id, 'dvojice', ikona, nazev, podtitul, K[id]['t'], okno, misto, text, perl, deti, shoda, pram, cas, a=a, b=b, telo='sun', druh=typn)
k = K['k-0001']
N.append(dvo('k-0001', 'konjunkce', '✨', 'Venuše a Jupiter splynuly', 'jeden z kandidátů na betlémskou hvězdu', 'venus', 'jupiter', 3, 'Blízký východ, večerní obloha',
    'Večer 17. června roku 2 př. n. l. se dvě nejjasnější planety přiblížily tak, že je pouhé oko nerozlišilo. Nad západním obzorem zářil jediný mimořádně jasný bod. Astronom Roger Sinnott na tuto konjunkci upozornil roku 1968 jako na možné vysvětlení betlémské hvězdy.',
    'Jistotu nemá nikdo: jiní badatelé dávají přednost trojí konjunkci Jupiteru se Saturnem v roce 7 př. n. l. a datum Ježíšova narození samo není jisté.',
    'Dvě nejjasnější planety se na obloze dostaly tak blízko k sobě, že vypadaly jako jedna obrovská hvězda.',
    'Model: nejmenší vzdálenost středů %.2f′ (%d″) v %s světového času, při pohledu ze středu Země. Kotoučky obou planet mají v modelu dohromady poloměr 29″, takže se právě dotýkaly. Pramen uvádí datum a splynutí pro pouhé oko; přesný čas nejtěsnějšího přiblížení tak bereme z modelu.' % (k['sep'], round(k['sep'] * 60), ut(k['t'])),
    'R. W. Sinnott: Thoughts on the Star of Bethlehem, Sky & Telescope 36 (1968), 384.', 'nejtěsněji kolem %s světového času (podle modelu)' % ut(k['t'])))
k = K['k1563']
N.append(dvo('k1563', 'konjunkce', '✨', 'Konjunkce, která naštvala Tychona', 'tabulky se spletly o měsíc', 'jupiter', 'saturn', 12, 'Lipsko',
    'Šestnáctiletý student Tycho Brahe sledoval v Lipsku, jak se Jupiter blíží k Saturnu. Staré Alfonsinské tabulky určily den setkání s chybou celého měsíce, novější podle Koperníka o několik dní. Tycho se rozhodl, že nebe proměří sám a pořádně.',
    'Jeho pozdější měření byla desetkrát přesnější než cokoli předtím. Právě z nich Johannes Kepler v Praze odvodil zákony pohybu planet.',
    'Mladý Tycho se díval, jak se dvě planety potkají. Knížky to ale spletly o celý měsíc. Tak si řekl: budu měřit sám a líp!',
    'Model: nejmenší vzdálenost %.1f′ dne 25. 8. 1563 (juliánsky), %s světového času. Tabulka velkých konjunkcí (výpočet podle JPL Horizons): 6,8′.' % (k['sep'], ut(k['t'])),
    'Tabulka velkých konjunkcí (Wikipedia: Great conjunction; výpočet podle JPL Horizons).', 'nejblíž 25. srpna 1563 (juliánsky), vzdálenost 6,8′ – pětina průměru Měsíce'))
k = K['k1613']
N.append(dvo('k1613', 'zakryt', '🔭', 'Galileo a neznámý Neptun', 'planeta zakreslená 234 let před objevem', 'jupiter', 'neptune', 20, 'Padova / Florencie',
    'Galileo si v zimě 1612–1613 kreslil polohy Jupiterových měsíců. Do náčrtků z 28. prosince a z 27. a 28. ledna zanesl i slabou „stálici“. Byl to Neptun: planeta, kterou Jupiter začátkem ledna 1613 na obloze dokonce zakryl. Objevena byla až roku 1846.',
    'U jedné kresby si Galileo poznamenal, že se hvězda vůči sousední jakoby posunula. Dál to ale nesledoval. Na jeho záznamy přišli astronomové Kowal a Drake až roku 1980.',
    'Slavný Galileo si nakreslil malou hvězdičku vedle Jupiteru. Nevěděl, že je to planeta Neptun! Tu lidé objevili až o 234 let později.',
    'Model: středy Jupiteru a Neptunu se 4. 1. 1613 minuly o %.2f′ (%d″) v %s světového času; Jupiterův kotouček měl poloměr asi 22″, takže Neptun zakryl. Pramen potvrzuje zákryt a Galileovy zákresy.' % (k['sep'], round(k['sep'] * 60), ut(k['t'])),
    'C. T. Kowal a S. Drake: Galileo\'s observations of Neptune, Nature 287 (1980), 311.', 'zákryt 4. ledna 1613; Galileovy zákresy 28. 12. 1612 a 27.–28. 1. 1613'))
k = K['k2026']
N.append(dvo('k2026', 'konjunkce', '✨', 'Mars u Jupiteru', 'právě teď na ranní obloze', 'mars', 'jupiter', 8, 'celý svět, před svítáním',
    'V pondělí 16. listopadu 2026 ráno najdeš Mars a Jupiter těsně u sebe v souhvězdí Lva, nedaleko hvězdy Regulus. Jupiter je ten jasnější, krémově bílý; Mars je slabší a naoranžovělý. Dělí je 1,2°, tedy něco přes dva průměry Měsíce.',
    'Na obloze sousedé, ve skutečnosti ne: Mars je od nás tou dobou 195 milionů km, Jupiter 788 milionů km – čtyřikrát dál. Další setkání těchto dvou planet přijde v červenci 2029.',
    'Podívej se ráno před svítáním na oblohu! Jasný Jupiter a načervenalý Mars tam svítí hned vedle sebe.',
    'Model: nejmenší vzdálenost %.3f° dne 16. 11. 2026 v %s světového času. Astronomické přehledy: 1,193° ve 2:04. Shoda na tři platné číslice.' % (k['sep'] / 60, ut(k['t'])),
    'Star Walk (přehled konjunkcí 2026), Sky at Night Magazine, When the Curves Line Up (J. L. Hunt); stav k 14. 11. 2026.', 'nejblíž 16. listopadu 2026 ve 2:04 světového času (3:04 našeho času)'))
# ---------- seskupení ----------
def sku(id, nazev, podtitul, okno, misto, text, perl, deti, shoda, pram, cas):
    return rec(id, 'skupina', '🪐', nazev, podtitul, K[id]['t'], okno, misto, text, perl, deti, shoda, pram, cas, telesa=C[id]['telesa'], telo='sun')
k = K['g1186']
N.append(sku('g1186', 'Konec světa, který nepřišel', 'pět planet, Slunce a Měsíc ve Vahách', 6, 'Evropa',
    'Evropou koloval „Toledský dopis“: až se v září 1186 sejdou všechny planety ve znamení Vah, přijde vichřice, zemětřesení a zkáza. Kronikáři popisují paniku, půsty a procesí; někde si lidé kopali podzemní úkryty. Planety se opravdu sešly. Nestalo se nic.',
    'Úkaz nikdo neviděl. Mezi planetami totiž stálo i Slunce, takže se všechno odehrálo na denní obloze. Seskupení znali jen ti, kdo ho spočítali.',
    'Lidé se kdysi báli, že až se všechny planety sejdou na jednom místě, bude konec světa. Planety se sešly – a nestalo se vůbec nic.',
    'Model: Merkur, Venuše, Mars, Jupiter, Saturn, Slunce i Měsíc se 15. 9. 1186 (juliánsky) vešly do výseče %.1f° (kolem %s světového času). Prameny uvádějí datum a seskupení ve Vahách; rozpětí je z modelu.' % (k['spread'], ut(k['t'])),
    'J. Meeus: Mathematical Astronomy Morsels (1997); S. De Meis a J. Meeus, JBAA 104 (1994), 293.', '15. září 1186 (juliánsky); všech sedm těles ve výseči asi 12°'))
k = K['g2040']
N.append(sku('g2040', 'Pět planet v jednom okně', 'a k nim srpek Měsíce', 4, 'celý svět, po západu Slunce',
    'Večer 8. září 2040 se nad západním obzorem sejde Merkur, Venuše, Mars, Jupiter i Saturn a k nim úzký srpek Měsíce. Celá skupina se vejde do zorného pole většího triedru.',
    'Skupina bude jen 20 až 30° od Slunce, takže nízko nad obzorem a na krátkou chvíli za soumraku. Chce to volný západní obzor.',
    'Až budeš velký, uvidíš jednoho zářijového večera pět planet a Měsíc pohromadě na jednom kousku oblohy. Zapiš si to: 8. září 2040!',
    'Model: Merkur, Venuše, Mars, Jupiter, Saturn a Měsíc ve výseči %.1f° dne 8. 9. 2040 kolem %s světového času, %d až %d° od Slunce. Pramen uvádí datum; rozpětí je z modelu.' % (k['spread'], ut(k['t']), round(k['elMin']), round(k['elMax'])),
    'J. Meeus: Mathematical Astronomy Morsels (1997); S. De Meis a J. Meeus, JBAA 104 (1994), 293.', '8. září 2040 večer; pět planet a Měsíc ve výseči asi 9,5°'))
# ---------- komety a průlety ----------
AUK = 149597870.7
def bli(id, ikona, nazev, podtitul, a, okno, misto, text, perl, deti, shoda, pram, cas):
    c = C[id]
    kw = dict(a=a, b=c['b'], telo=c['b'])
    if 'el' in c:
        kw['el'] = {q: round(v, 9) for q, v in c['el'].items()}
    return rec(id, 'blizko', ikona, nazev, podtitul, K[id]['t'], okno, misto, text, perl, deti, shoda, pram, cas, **kw)
k = K['c837']
N.append(bli('c837', '☄️', 'Halleyova kometa těsně u Země', 'nejbližší průlet v dějinách', 'halley', 8, 'celý svět',
    'Na jaře roku 837 minula Halleyova kometa Zemi o pouhých 5 milionů km – třináctkrát dál, než je Měsíc. Tak blízko se k nám už nikdy potom nedostala. Čínští astronomové dynastie Tchang zapsali, že se její ohon táhl přes velkou část oblohy.',
    'Franský císař Ludvík Pobožný, syn Karla Velikého, v kometě viděl zlé znamení. Podle svého životopisce kvůli ní nařídil půsty a modlitby.',
    'Slavná kometa tehdy proletěla tak blízko Země jako nikdy jindy. Její ohon byl přes velký kus oblohy!',
    'Model s elementy tohoto návratu (JPL Horizons): nejblíž %.4f AU dne 10. 4. 837 (juliánsky). JPL CNEOS: 0,0334 AU. Dnešní dráha komety by tu nestačila – planety ji mezi návraty mění, proto si ukázka půjčuje dráhu z roku 837.' % k['au'],
    'JPL CNEOS: Historic Comet Close Approaches; JPL Horizons (elementy návratu, záznam 90000015).', 'nejblíž Zemi 10. dubna 837 (juliánsky): 0,0334 AU, tedy 5,0 milionu km'))
k = K['c1066']
N.append(bli('c1066', '☄️', 'Kometa na tapisérii z Bayeux', 'znamení před bitvou u Hastingsu', 'halley', 14, 'Anglie a Normandie',
    'Na jaře 1066 zazářila nad Anglií kometa. Král Harold nastoupil na trůn teprve v lednu a lidé v ní viděli zlé znamení. V říjnu Harold padl v bitvě u Hastingsu a Anglii ovládl Vilém Dobyvatel. Kometu vyšili na slavnou tapisérii z Bayeux: dav na ni ukazuje a nápis říká „Tito se diví hvězdě“.',
    'Že je to pořád táž kometa, která se vrací každých asi 76 let, zjistil až Edmond Halley o 640 let později.',
    'Lidé v Anglii uviděli na nebi kometu a báli se, co to znamená. Dokonce ji vyšili na dlouhý obraz z látky, který existuje dodnes.',
    'Model s elementy tohoto návratu (JPL Horizons): přísluní 20. 3. 1066, nejblíž Zemi %.3f AU kolem 23. 4. 1066 (juliánsky). Přísluní souhlasí s prací Yeomanse a Kianga; vzdálenost od Země je z modelu.' % k['au'],
    'D. K. Yeomans a T. Kiang, MNRAS 197 (1981), 633; JPL Horizons (elementy návratu, záznam 90000018).', 'přísluní 20. března 1066, nejblíž Zemi kolem 23. dubna 1066 (juliánsky)'))
k = K['c1759']
N.append(bli('c1759', '☄️', 'Kometa přiletěla podle výpočtu', 'první předpovězený návrat', 'halley', 10, 'Prohlis u Drážďan',
    'Edmond Halley roku 1705 usoudil, že komety z let 1531, 1607 a 1682 jsou jedno těleso, a předpověděl návrat na rok 1758. Nedožil se ho. O Vánocích 1758 kometu jako první našel saský sedlák a amatérský astronom Johann Georg Palitzsch. Přísluním prošla 13. března 1759.',
    'Francouzi Clairaut, Lalande a paní Lepautová předtím půl roku ručně počítali, jak kometu zdrží Jupiter a Saturn. Trefili se na měsíc. Kometa od té doby nese Halleyovo jméno.',
    'Pan Halley řekl: tahle kometa se vrátí za 76 let. Sám se toho nedožil. Ale kometa opravdu přiletěla – přesně jak spočítal!',
    'Model s elementy tohoto návratu: přísluní 13. 3. 1759 v %s světového času, %.4f AU od Slunce. JPL Horizons: 1:30, 0,5845 AU.' % (ut(k['t']), k['au']),
    'JPL Horizons (elementy návratu, záznam 90000027).', 'přísluní 13. března 1759, 0,58 AU od Slunce'))
k = K['c1910']
N.append(bli('c1910', '☄️', 'Země v ohonu komety', 'Halleyova kometa 1910 a první kometární panika', 'halley', 10, 'celý svět',
    'V květnu 1910 prošla Halleyova kometa mezi Zemí a Sluncem a Země se 18. až 19. května ocitla v jejím ohonu. Astronomové krátce předtím našli ve spektru ohonu jedovatý dikyan. Noviny z toho udělaly senzaci a obchodníci prodávali „pilulky proti kometě“ i plynové masky. Ohon je přitom tak řídký, že se nestalo nic.',
    'Mark Twain se narodil roku 1835, dva týdny po průchodu komety přísluním, a říkal, že s ní zase odejde. Zemřel 21. dubna 1910, den po dalším přísluní.',
    'Země tehdy proletěla ohonem komety. Lidé se báli, ale ohon je jen řidší než nejřidší mlha. Nikomu se nic nestalo.',
    'Model s elementy tohoto návratu: nejblíž Zemi %.4f AU dne 20. 5. 1910 v %s světového času. JPL: 0,1514 AU ve 12:50.' % (k['au'], ut(k['t'])),
    'JPL SBDB Close-Approach Data; JPL Horizons (elementy návratu, záznam 90000029).', 'nejblíž Zemi 20. května 1910: 0,151 AU, tedy 22,6 milionu km'))
k = K['p2029']
N.append(bli('p2029', '🪨', 'Apophis: pátek třináctého', 'planetka proletí pod stacionárními družicemi', 'apophis', 0.6, 'Evropa, Afrika, západní Asie',
    'V pátek 13. dubna 2029 večer proletí kolem Země planetka Apophis, velká asi 340 metrů. Mine nás ve vzdálenosti 38 000 km od středu Země, tedy necelých 32 000 km nad povrchem – blíž, než obíhají televizní družice. Z Evropy bude vidět pouhým okem jako hvězdička, která se pomalu sune oblohou.',
    'Po objevu roku 2004 vycházela krátce šance na srážku 2,7 %. Radarová měření z roku 2021 srážku vyloučila nejméně na sto let. Za planetkou se vydala sonda OSIRIS-APEX.',
    'Kolem Země proletí velký kámen z vesmíru. Nebude to nebezpečné, jen ho uvidíme jako hvězdičku, která se pohybuje.',
    'Model: nejblíž %s km od středu Země dne 13. 4. 2029 v %s světového času. JPL: 38 012 km ve 21:46. Před průletem a po něm je dráha v aplikaci jen přibližná: přitažlivost Země planetku při průletu znatelně odkloní a to model nepočítá.' % ('{:,}'.format(round(k['km'])).replace(',', ' '), ut(k['t'])),
    'JPL SBDB Close-Approach Data (stav k listopadu 2026).', 'nejblíž 13. dubna 2029 ve 21:46 světového času (23:46 našeho letního času)'))
k = K['c2061']
N.append(bli('c2061', '☄️', 'Halleyova kometa se vrací', 'příští návrat, lepší než roku 1986', 'halley', 14, 'celý svět',
    'Halleyova kometa je teď daleko za drahou Neptunu a už se vrací. Přísluním projde 28. července 2061. Na rozdíl od roku 1986, kdy byla při největší jasnosti schovaná za Sluncem, bude tentokrát na stejné straně Slunce jako Země – má být výrazně jasnější.',
    'Kdo se narodil kolem roku 1980, může ji stihnout dvakrát za život. Nejvzdálenějším bodem dráhy prošla kometa v prosinci 2023.',
    'Slavná kometa je teď hodně daleko, ale už letí zpátky. Přiletí v roce 2061. Kolik ti tehdy bude let?',
    'Model s elementy tohoto návratu: přísluní 28. 7. 2061 v %s světového času, %.4f AU od Slunce. JPL Horizons: 17:17, 0,5928 AU.' % (ut(k['t']), k['au']),
    'JPL Horizons (elementy návratu, záznam 90000030).', 'přísluní 28. července 2061, 0,59 AU od Slunce'))
# ---------- supernovy ----------
def hv(id, nazev, podtitul, ra, dec, mag, t0, t1, souhv, misto, text, perl, deti, cas, rise=20):
    e = rec(id, 'hvezda', '💥', nazev, podtitul, t0, round((t1 - t0) * 0.55, 1), misto, text, perl, deti,
        'Hvězdy model nepočítá, nejsou to tělesa Sluneční soustavy. Poloha na obloze je poloha dnešního pozůstatku po výbuchu; největší jasnost a doba viditelnosti jsou z historických záznamů. Průběh jasnosti mezi nimi je zjednodušený.',
        SN, cas, ra=ra, dec=dec, mag=mag, t0=round(t0, 1), t1=round(t1, 1), rise=rise, souhvezdi=souhv, telo='earth')
    return e
ra, dec = radec(5, 34, 32, 1, 22, 1)
N.append(hv('h1054', 'Hvězda-host roku 1054', 'zrod Krabí mlhoviny', ra, dec, -6, jdJul(1054, 7, 4), jdJul(1056, 4, 6), 'Býk', 'Čína, Japonsko, arabský svět',
    'Čínští dvorní astronomové zapsali 4. července 1054 novou „hvězdu-host“ u jižního rohu Býka. Byla jasnější než Venuše: 23 dní ji viděli i za bílého dne a v noci zůstala viditelná skoro dva roky. Vybuchla tam hvězda vzdálená asi 6 500 světelných let.',
    'Na tom místě je dnes Krabí mlhovina (M1), která se dál rozpíná rychlostí asi 1 500 km/s. Uprostřed zůstal pulsar – zbytek hvězdy o průměru města, který se otočí třicetkrát za sekundu.',
    'Na nebi se najednou rozsvítila nová hvězda. Byla tak jasná, že svítila i ve dne! To vybuchla veliká hvězda hodně daleko od nás.',
    'poprvé zaznamenána 4. července 1054; ve dne vidět 23 dní, v noci do dubna 1056'))
ra, dec = radec(0, 25, 18, 1, 64, 9)
N.append(hv('h1572', 'Tychonova nová hvězda', 'konec neměnných nebes', ra, dec, -4, jdJul(1572, 11, 11), jdJul(1574, 3, 15), 'Kasiopeja', 'Evropa',
    'Večer 11. listopadu 1572 uviděl Tycho Brahe v Kasiopeji hvězdu, která tam nepatřila, jasnou jako Venuše. Měřil ji měsíce a zjistil, že se vůči ostatním hvězdám ani nehne. Musela tedy být daleko za Měsícem, v říši, kterou Aristotelés pokládal za věčnou a neměnnou.',
    'Tycho o ní napsal knížku De nova stella – odtud slovo „nova“. V Praze stejnou hvězdu měřil císařský lékař Tadeáš Hájek z Hájku a došel ke stejnému závěru.',
    'Astronom Tycho uviděl na nebi hvězdu, která tam dřív nebyla. Lidé si mysleli, že se nebe nikdy nemění. Tycho dokázal, že ano.',
    'Tycho ji spatřil 11. listopadu 1572; pouhým okem vidět do března 1574'))
ra, dec = radec(17, 30, 42, -1, 21, 29)
N.append(hv('h1604', 'Keplerova supernova', 'zatím poslední v naší Galaxii', ra, dec, -2.5, jdJul(1604, 9, 29), jdJul(1606, 3, 20), 'Hadonoš', 'Praha',
    'V říjnu 1604 se v Hadonoši rozzářila nová hvězda, jasnější než Jupiter. Johannes Kepler, císařský matematik Rudolfa II., ji z Prahy sledoval celý rok, dokud nezmizela, a napsal o ní knihu De Stella Nova. Od té doby nikdo v naší Galaxii výbuch supernovy na vlastní oči neviděl.',
    'Hvězda vzplanula jen pár stupňů od vzácného setkání Marsu, Jupiteru a Saturnu, které astrologové dychtivě sledovali – proto si jí všimli hned. Statisticky má naše Galaxie na další supernovu už dávno nárok.',
    'V Praze se astronom Kepler díval na novou jasnou hvězdu. To vybuchla hvězda hodně daleko. Od té doby lidé takový výbuch v naší Galaxii neviděli.',
    'poprvé spatřena 9. října 1604; Kepler ji v Praze pozoroval od 17. října; vidět asi 18 měsíců'))
N[-1]['datumJul'] = '29. září 1604 (v Praze už platil gregoriánský kalendář: 9. října)'
out = OLD + N
out.sort(key=lambda e: e['jd'])
json.dump(out, open('src/data/udalosti.json', 'w'), ensure_ascii=False, indent=1)
print(len(out), 'karet')
for e in out:
    print(e['id'].ljust(8), e['typ'].ljust(8), e['datum'].ljust(28), (e.get('datumJul') or '')[:26].ljust(27), e['nazev'])
