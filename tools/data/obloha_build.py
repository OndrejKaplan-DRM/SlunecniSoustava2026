# Objekty vzdáleného vesmíru na fotce Mléčné dráhy (verze 1.8b): sestaví src/data/obloha.json a obrázky dist/sky/.
#   python3 -I tools/data/obloha_build.py [pracovní složka, výchozí /tmp/obloha]
# Odkud se co bere:
#   poloha, úhlová velikost, jasnost, souhvězdí  – katalog OpenNGC (M. Verga, CC BY-SA 4.0), stahuje se z GitHubu
#   vzdálenost a zajímavosti                      – tiskové zprávy a popisy snímků ESO, ESA/Hubble, ESA/Webb (u každého objektu ve zdrojích)
#   fotografie                                    – archivy ESO, ESA/Hubble a ESA/Webb (CC BY 4.0), autor se čte ze stránky snímku
#   výřez „na naší obloze“                        – z dist/maps/milkyway.webp, tedy přesně to, co aplikace kreslí
# U čtyř objektů (M 16, h + χ Persei, M 7, M 11) se úhlová velikost z OpenNGC výrazně liší od jiných katalogů, proto ji karta neukazuje (vel=False).
# České texty jsou psané tady ve skriptu (ne v JSON). Vybrané jsou jen objekty, které jsou na naší fotce oblohy opravdu vidět.
import csv, json, math, os, re, subprocess, sys, html, hashlib, io
from PIL import Image, ImageDraw, ImageEnhance

W = sys.argv[1] if len(sys.argv) > 1 else '/tmp/obloha'
os.makedirs(W, exist_ok=True)
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'dist', 'sky')
os.makedirs(OUT, exist_ok=True)
PAGE = {'E': 'https://www.eso.org/public/images/%s/', 'H': 'https://esahubble.org/images/%s/', 'W': 'https://esawebb.org/images/%s/', 'N': 'https://images.nasa.gov/details/%s'}
CDN = {'E': 'https://cdn.eso.org/images/screen/%s.jpg', 'H': 'https://cdn.esahubble.org/archives/images/screen/%s.jpg', 'W': 'https://cdn.esawebb.org/archives/images/screen/%s.jpg', 'N': 'https://images-assets.nasa.gov/image/%s/%s~large.jpg'}
ARCH = {'E': 'ESO', 'H': 'ESA/Hubble', 'W': 'ESA/Webb', 'N': 'NASA'}
LIC = {'E': 'CC BY 4.0', 'H': 'CC BY 4.0', 'W': 'CC BY 4.0', 'N': 'volné užití s uvedením autora (zásady NASA/JPL)'}


def get(u, binary=False):
    f = os.path.join(W, hashlib.md5(u.encode()).hexdigest())
    if not os.path.exists(f) or os.path.getsize(f) < 200:
        subprocess.run(['curl', '-s', '-L', '-m', '90', '-o', f, u], check=False)
    return open(f, 'rb').read() if binary else open(f, encoding='utf8', errors='ignore').read()


def credit(k, i):
    if k == 'N':  # stránka NASA je aplikace, autora dává rozhraní archivu
        d = json.loads(get('https://images-api.nasa.gov/search?nasa_id=' + i))['collection']['items'][0]['data'][0]
        return d.get('secondary_creator') or 'NASA'
    h = get(PAGE[k] % i)
    m = re.search(r'<div class="credit">(.*?)</div>', h, re.S)
    c = re.sub(r'\s+', ' ', html.unescape(re.sub('<.*?>', '', m.group(1)))).strip() if m else ''
    if not c:
        raise SystemExit(f'chybí autor snímku {k}:{i}')
    return c


CAT = {}
for f in ('NGC.csv', 'addendum.csv'):
    t = get('https://raw.githubusercontent.com/mattiaverga/OpenNGC/master/database_files/' + f)
    for r in csv.DictReader(io.StringIO(t), delimiter=';'):
        CAT[r['Name']] = r


def deg(s, hours):
    sg = -1 if s.strip().startswith('-') else 1
    a, b, c = [float(x) for x in s.strip().lstrip('+-').split(':')]
    return sg * (a + b / 60 + c / 3600) * (15 if hours else 1)


SOUHV = {'And': 'Andromeda', 'Ori': 'Orion', 'Car': 'Lodní kýl', 'Sgr': 'Střelec', 'Se2': 'Had', 'Cyg': 'Labuť', 'Mon': 'Jednorožec', 'Cen': 'Kentaur', 'Tuc': 'Tukan', 'Per': 'Perseus', 'Sco': 'Štír', 'Sct': 'Štít', 'Oph': 'Hadonoš', 'Dor': 'Mečoun', 'Cru': 'Jižní kříž', 'Tau': 'Býk'}
OPENNGC = ('Katalog OpenNGC (poloha, úhlová velikost, jasnost)', 'https://github.com/mattiaverga/OpenNGC')
SKUP = {'galaxie': 'Galaxie', 'mlhovina': 'Zářící mlhoviny', 'temna': 'Temné mlhoviny', 'kulova': 'Kulové hvězdokupy', 'otevrena': 'Otevřené hvězdokupy', 'stred': 'Střed Galaxie'}

# id, jméno, označení, klíč v OpenNGC (nebo None a ruční poloha), druh, vzdálenost v sv. l., text vzdálenosti, index zdroje vzdálenosti
O = [
    dict(id='lmc', cs='Velké Magellanovo mračno', ozn='LMC', kat='ESO056-115', druh='galaxie', typ='trpasličí galaxie, souputník Mléčné dráhy', ly=163000,
         lead='Malá galaxie, která obíhá kolem naší Mléčné dráhy. Z jižní polokoule je vidět pouhým okem jako odtržený kus Mléčné dráhy.',
         odst=[('Co to je', 'Velké Magellanovo mračno je jeden z nejbližších galaktických sousedů: leží asi 163 000 světelných let od Země. Není součástí Mléčné dráhy, je to samostatná menší galaxie. Astronomové z přehlídky VMC v ní podrobně rozebrali asi 10 milionů jednotlivých hvězd a určili jejich stáří.'),
               ('Co je na fotkách', 'Infračervený snímek dalekohledu VISTA proniká prachem a ukazuje hvězdy v celé galaxii. Druhý snímek je mlhovina Tarantule, obří oblast zrodu hvězd uvnitř mračna.'),
               ('Kde je na obloze', 'V souhvězdích Mečouna a Tabulové hory, blízko jižního nebeského pólu. Z Česka nikdy nevychází nad obzor.')],
         imgs=[('E', 'eso1914a', 'Celé mračno v infračerveném světle (dalekohled VISTA)'), ('H', 'heic1105a', 'Mlhovina Tarantule uvnitř mračna (Hubble)')],
         src=[('ESO: The Large Magellanic Cloud revealed by VISTA (tisková zpráva eso1914)', 'https://www.eso.org/public/news/eso1914/')]),
    dict(id='smc', cs='Malé Magellanovo mračno', ozn='SMC · NGC 292', kat='NGC0292', druh='galaxie', typ='trpasličí galaxie, souputník Mléčné dráhy', ly=210000,
         lead='Menší z dvojice Magellanových mračen. I ono je samostatná trpasličí galaxie viditelná z jižní polokoule pouhým okem.',
         odst=[('Co to je', 'Malé Magellanovo mračno leží asi 210 000 světelných let od nás. Je nápadné i pro neozbrojené oko; hned vedle něj je na obloze vidět kulová hvězdokupa 47 Tucanae, která je ale mnohem blíž a patří k Mléčné dráze.'),
               ('Co je na fotkách', 'Snímek VISTA je největší infračervený snímek tohoto mračna, plný milionů hvězd. Hubble a Webb ukazují dvě hvězdné porodnice uvnitř: NGC 346 a NGC 602.'),
               ('Kde je na obloze', 'V souhvězdí Tukana, asi 17° od jižního nebeského pólu. Z Česka není vidět.')],
         imgs=[('E', 'eso1714a', 'Celé mračno v infračerveném světle (VISTA)'), ('H', 'heic0514a', 'Hvězdná porodnice NGC 346 (Hubble)'), ('W', 'weic2425a', 'Mladá hvězdokupa NGC 602 (Webb)')],
         src=[('ESO: VISTA peeks through the Small Magellanic Cloud’s dusty veil (eso1714)', 'https://www.eso.org/public/news/eso1714/'), ('ESA/Hubble: Young stars sculpt gas with powerful outflows (heic0514a)', 'https://esahubble.org/images/heic0514a/')], lysrc=1),
    dict(id='m31', cs='Galaxie v Andromedě', ozn='M 31 · NGC 224', kat='NGC0224', druh='galaxie', typ='spirální galaxie', ly=2500000,
         lead='Velká spirální galaxie v sousedství Mléčné dráhy. Za tmavé noci je vidět pouhým okem jako mlhavá skvrnka.',
         odst=[('Co to je', 'Galaxie v Andromedě je velká spirální galaxie vzdálená 2,5 milionu světelných let. Světlo, které z ní dnes vidíme, je na cestě 2,5 milionu let. Na obloze je šestkrát širší než Měsíc v úplňku, okem je ale vidět jen její jasný střed.'),
               ('Co je na fotkách', 'Hubbleova mozaika je jeden z největších snímků, jaké kdy dalekohled pořídil: 1,5 miliardy bodů, přes 100 milionů hvězd a tisíce hvězdokup v úseku disku dlouhém přes 40 000 světelných let. Druhý snímek ukazuje celou galaxii ze Země.'),
               ('Kde je na obloze', 'V souhvězdí Andromedy. Z Česka je na podzim vysoko na večerní obloze; na naší fotce je to malá protáhlá skvrnka stranou od pásu Mléčné dráhy.')],
         imgs=[('H', 'heic1502a', 'Část disku: přes 100 milionů hvězd (Hubble)'), ('H', 'heic1112e', 'Celá galaxie ze Země, s popisky')],
         src=[('ESA/Hubble: Sharpest ever view of the Andromeda Galaxy (heic1502)', 'https://esahubble.org/news/heic1502/')]),
    dict(id='m42', cs='Velká mlhovina v Orionu', ozn='M 42 · NGC 1976', kat='NGC1976', druh='mlhovina', typ='zářící mlhovina s mladou hvězdokupou', ly=1350, lytxt='asi 1 350 sv. l. (ESO); starší zdroje uvádějí 1 500',
         lead='Jedna z nejbližších hvězdných porodnic. V Orionově meči je vidět pouhým okem jako mlhavá hvězda.',
         odst=[('Co to je', 'Mlhovina v Orionu je oblak plynu a prachu, ve kterém se právě rodí hvězdy. Je to jedna z nejbližších porodnic lehkých i těžkých hvězd, vzdálená asi 1 350 světelných let. Plyn rozsvěcují mladé horké hvězdy uprostřed, známé jako Trapez.'),
               ('Co je na fotkách', 'Hubbleova mozaika je nejostřejší pohled na celou mlhovinu. Snímek dalekohledu VST ukazuje mlhovinu i s okolní hvězdokupou.'),
               ('Kde je na obloze', 'Pod třemi hvězdami Orionova pásu, v jeho „meči“. Z Česka je dobře vidět v zimě. Na naší fotce je to jasná bílá tečka s růžovým okolím.')],
         imgs=[('H', 'heic0601a', 'Celá mlhovina, nejostřejší pohled (Hubble)'), ('E', 'eso1723a', 'Mlhovina a hvězdokupa (dalekohled VST)')],
         src=[('ESO: The Orion Nebula and cluster from the VLT Survey Telescope (eso1723)', 'https://www.eso.org/public/news/eso1723/'), ('ESA/Hubble: Hubble’s sharpest view of the Orion Nebula (heic0601a)', 'https://esahubble.org/images/heic0601a/')]),
    dict(id='kun', cs='Koňská hlava', ozn='Barnard 33 · IC 434', kat='B033', druh='temna', typ='temná mlhovina před zářící mlhovinou', ly=1300,
         lead='Tmavý oblak prachu ve tvaru koňské hlavy, který se rýsuje proti růžově zářícímu plynu. Jedna z nejznámějších siluet na obloze.',
         odst=[('Co to je', 'Koňská hlava (Barnard 33) je hustý sloup prachu a plynu vzdálený zhruba 1 300 světelných let. Sama nesvítí; vidíme ji jen proto, že zakrývá zářící mlhovinu IC 434 za sebou. Záření okolních hvězd ji pomalu rozrušuje – astronomové odhadují, že jí zbývá asi pět milionů let.'),
               ('Co je na fotkách', 'Ve viditelném světle (VLT) je hlava černá. V infračerveném světle (Hubble, Webb) prach zprůhlední a je vidět jeho jemná stavba.'),
               ('Kde je na obloze', 'Těsně pod levou hvězdou Orionova pásu (Alnitak). Okem vidět není; na naší fotce je vidět růžová záře této oblasti hned nad mlhovinou v Orionu.')],
         imgs=[('E', 'eso0202a', 'Ve viditelném světle (dalekohled VLT)'), ('H', 'heic1307a', 'V infračerveném světle (Hubble)'), ('W', 'weic2411a', 'Detail „hřívy“ (Webb)')],
         src=[('ESA/Webb: Horsehead Nebula (weic2411a)', 'https://esawebb.org/images/weic2411a/'), ('ESA/Hubble: New infrared view of the Horsehead Nebula (heic1307)', 'https://esahubble.org/news/heic1307/')]),
    dict(id='carina', cs='Mlhovina Carina', ozn='NGC 3372', kat='NGC3372', druh='mlhovina', typ='zářící mlhovina, hvězdná porodnice', ly=7500,
         lead='Obrovská hvězdná porodnice na jižní obloze. Jsou v ní některé z nejjasnějších a nejhmotnějších známých hvězd.',
         odst=[('Co to je', 'Mlhovina Carina je obrovská hvězdná porodnice asi 7 500 světelných let daleko v souhvězdí Lodního kýlu. Patří k nejbližším oblastem, kde se rodí velmi hmotné hvězdy; nejznámější z nich je obří nestálá hvězda Eta Carinae.'),
               ('Co je na fotkách', 'Snímek VST ukazuje celou mlhovinu. Hubbleovo panorama zachycuje její střed. Webbovy „Kosmické útesy“ jsou okraj obří dutiny v NGC 3324, kterou do plynu vyhloubilo záření a vítr mladých hvězd.'),
               ('Kde je na obloze', 'V jižní části Mléčné dráhy, nedaleko Jižního kříže. Z Česka není vidět. Na naší fotce je to nápadná růžová skvrna v pásu Mléčné dráhy.')],
         imgs=[('E', 'eso1250a', 'Celá mlhovina (dalekohled VST)'), ('H', 'heic0707a', 'Střed mlhoviny (Hubble)'), ('W', 'weic2205a', '„Kosmické útesy“ na okraji NGC 3324 (Webb)')],
         src=[('ESO: The Carina Nebula imaged by the VLT Survey Telescope (eso1250)', 'https://www.eso.org/public/news/eso1250/'), ('ESA/Hubble: Star birth in the extreme (heic0707a)', 'https://esahubble.org/images/heic0707a/')]),
    dict(id='laguna', cs='Mlhovina Laguna', ozn='M 8 · NGC 6523', kat='NGC6523', druh='mlhovina', typ='zářící mlhovina, hvězdná porodnice', ly=4000,
         lead='Jasná mlhovina ve Střelci, směrem ke středu Galaxie. Rodí se v ní nové hvězdy.',
         odst=[('Co to je', 'Laguna je oblak plynu a prachu asi 4 000 světelných let daleko, ve kterém vznikají nové hvězdy. Celá mlhovina měří asi 55 × 20 světelných let.'),
               ('Co je na fotkách', 'Širokoúhlý snímek ESO ukazuje celou mlhovinu mezi hvězdami Mléčné dráhy. Hubbleův snímek k 28. výročí je jen malý výřez jejího středu, asi čtyři světelné roky napříč.'),
               ('Kde je na obloze', 'V souhvězdí Střelce, těsně nad „hubičkou čajové konvice“. Z Česka je v létě nízko nad jižním obzorem. Na naší fotce je to růžová tečka v nejjasnější části Mléčné dráhy.')],
         imgs=[('E', 'eso0936a', 'Celá mlhovina (ESO, projekt GigaGalaxy Zoom)'), ('H', 'heic1808a', 'Střed mlhoviny (Hubble)')],
         src=[('ESA/Hubble: Hubble’s 28th birthday picture: The Lagoon Nebula (heic1808a)', 'https://esahubble.org/images/heic1808a/')]),
    dict(id='orli', cs='Orlí mlhovina', ozn='M 16 · NGC 6611', kat='NGC6611', kruh=0.3, vel=False, druh='mlhovina', typ='zářící mlhovina s mladou hvězdokupou', ly=6500, lytxt='asi 6 500 sv. l. (Hubble, Webb); ESO uvádí 7 000',
         lead='Mlhovina, ve které leží slavné „Sloupy stvoření“ – jeden z nejznámějších snímků Hubbleova dalekohledu.',
         odst=[('Co to je', 'Orlí mlhovina je hvězdná porodnice vzdálená asi 6 500 světelných let. Záření a vítr mladých hmotných hvězd v ní vyřezávají z plynu a prachu dlouhé sloupy; v jejich hustých koncích vznikají další hvězdy.'),
               ('Co je na fotkách', 'Snímek ESO ukazuje celou mlhovinu, Sloupy stvoření jsou uprostřed. Hubble je vyfotil ve viditelném světle, Webb v infračerveném, kde prach zprůhlední a objeví se hvězdy uvnitř.'),
               ('Kde je na obloze', 'V souhvězdí Hada, v letní Mléčné dráze nad Střelcem. Na naší fotce je to jedna z růžových teček v jasném pásu.')],
         imgs=[('E', 'eso0926a', 'Celá mlhovina (ESO)'), ('H', 'heic1501a', 'Sloupy stvoření ve viditelném světle (Hubble)'), ('W', 'weic2216b', 'Sloupy stvoření v infračerveném světle (Webb)')],
         src=[('ESA/Hubble: New view of the Pillars of Creation (heic1501)', 'https://esahubble.org/news/heic1501/'), ('ESO: The Eagle Nebula (eso0926)', 'https://www.eso.org/public/news/eso0926/')]),
    dict(id='amerika', cs='Mlhovina Severní Amerika', ozn='NGC 7000', kat='NGC7000', druh='mlhovina', typ='zářící mlhovina', ly=2590, lytxt='asi 2 590 sv. l. (družice Gaia, 2020); starší odhady 1 500–2 000',
         lead='Velká mlhovina u hvězdy Deneb, která tvarem připomíná severoamerický kontinent i s Mexickým zálivem.',
         odst=[('Co to je', 'Mlhovina Severní Amerika je oblak zářícího vodíku v souhvězdí Labutě. Její vzdálenost byla dlouho nejistá; měření družice Gaia z roku 2020 dala asi 2 590 světelných let. „Mexický záliv“ není prázdné místo, ale tmavé mračno (L935).'),
               ('Co je na fotkách', 'Pozemní snímek z přehlídky oblohy Digitized Sky Survey 2 ukazuje celý „kontinent“; vpravo od něj je mlhovina Pelikán.'),
               ('Kde je na obloze', 'Blízko jasné hvězdy Deneb v Labuti. Z Česka je v létě skoro v nadhlavníku. Na naší fotce je to narůžovělá skvrna v pásu Mléčné dráhy.')],
         imgs=[('H', 'heic0510a', 'Celá mlhovina (pozemní snímek, Digitized Sky Survey 2)')],
         src=[('Wikipedia: North America Nebula (vzdálenost podle Kuhn a kol. 2020, Gaia)', 'https://en.wikipedia.org/wiki/North_America_Nebula')]),
    dict(id='rozeta', cs='Mlhovina Rozeta', ozn='NGC 2237–2246', kat='NGC2237', druh='mlhovina', typ='zářící mlhovina s hvězdokupou uprostřed', ly=5200,
         lead='Mlhovina ve tvaru růže s mladou hvězdokupou uprostřed.',
         odst=[('Co to je', 'Rozeta je velká hvězdná porodnice vzdálená asi 5 200 světelných let, široká kolem 100 světelných let. Plyn rozsvěcuje záření mladých hvězd v hvězdokupě uprostřed; stejné záření postupně rozrušuje a tvaruje tmavé oblaky prachu.'),
               ('Co je na fotkách', 'Přehledový snímek ukazuje celou „růži“. Hubbleův snímek k 35. výročí je malý výřez jejího okraje, jen asi čtyři světelné roky napříč: tmavé oblaky prachu proti zářícímu plynu.'),
               ('Kde je na obloze', 'V souhvězdí Jednorožce, vlevo od Orionu. Z Česka je vidět v zimě, okem ale ne. Na naší fotce je to slabá narůžovělá skvrnka.')],
         imgs=[('H', 'heic2505g', 'Celá mlhovina, vyznačen Hubbleův výřez'), ('H', 'heic2505f', 'Tmavé oblaky na okraji mlhoviny (Hubble)')],
         src=[('ESA/Hubble: Rosette Nebula (heic2505f)', 'https://esahubble.org/images/heic2505f/')]),
    dict(id='rhooph', cs='Mračna u ρ Ophiuchi', ozn='IC 4604', kat='IC4604', druh='mlhovina', typ='komplex zářících, odrazných a temných mlhovin', ly=390,
         lead='Nejbližší hvězdná porodnice: barevná mračna plynu a prachu u hvězdy Antares.',
         odst=[('Co to je', 'Komplex mračen u hvězdy ρ Ophiuchi je nejbližší oblast zrodu hvězd, jen asi 390 světelných let od nás. Díky tomu, že je tak blízko, nejsou mezi ním a námi žádné hvězdy v popředí a detaily jsou vidět velmi dobře.'),
               ('Co je na fotkách', 'Webbův snímek ukazuje malou část komplexu s výtrysky mladých hvězd. Širokoúhlý snímek ESO zachycuje celé okolí od barevných mračen u Antara až po střed Galaxie.'),
               ('Kde je na obloze', 'Na hranici Hadonoše a Štíra, hned u načervenalé hvězdy Antares. Z Česka je v létě nízko nad jihem. Na naší fotce je to nažloutlý oblak vybíhající z pásu Mléčné dráhy.')],
         imgs=[('W', 'weic2316a', 'Část komplexu s mladými hvězdami (Webb)'), ('E', 'eso0934a', 'Široké pole: od Antara po střed Galaxie (ESO/S. Guisard)')],
         src=[('ESA/Webb: Webb celebrates first year of science with close-up on birth of Sun-like stars (weic2316)', 'https://esawebb.org/news/weic2316/')]),
    dict(id='uhelny', cs='Uhelný pytel', ozn='Caldwell 99', kat='C099', kruh=3.0, druh='temna', typ='temná mlhovina', ly=600,
         lead='Tmavá „díra“ v jižní Mléčné dráze hned vedle Jižního kříže. Ve skutečnosti oblak prachu, který zakrývá hvězdy za sebou.',
         odst=[('Co to je', 'Uhelný pytel je jedna z nejnápadnějších temných mlhovin viditelných pouhým okem. Leží asi 600 světelných let daleko. Prach v něm pohlcuje světlo vzdálenějších hvězd, proto vypadá jako prázdné místo. Za miliony let se části mračna zhroutí a vzniknou z nich nové hvězdy.'),
               ('Co je na fotkách', 'Snímek ESO ukazuje jen malou část mlhoviny: tmavé šmouhy téměř zakrývají bohaté hvězdné pole za nimi.'),
               ('Kde je na obloze', 'V souhvězdí Jižního kříže. Z Česka není vidět. Na naší fotce je to tmavá skvrna v jasném pásu Mléčné dráhy.')],
         imgs=[('E', 'eso1539a', 'Část Uhelného pytle (ESO, La Silla)')],
         src=[('ESO: A Cosmic Sackful of Black Coal (eso1539)', 'https://www.eso.org/public/news/eso1539/')]),
    dict(id='stred', cs='Střed Galaxie', ozn='Sagittarius A*', kat=None, ra=266.41683, de=-29.00781, konst='Sgr', druh='stred', typ='střed Mléčné dráhy s obří černou dírou', ly=27000,
         lead='Směr ke středu naší Galaxie. Uprostřed sedí černá díra čtyřmilionkrát hmotnější než Slunce.',
         odst=[('Co to je', 'Střed Mléčné dráhy leží asi 27 000 světelných let od nás ve směru souhvězdí Střelce. Ve viditelném světle ho zakrývá prach, proto se pozoruje infračerveně a rádiově. Hvězdy tu obíhají kolem neviditelného tělesa Sagittarius A* – černé díry o hmotnosti čtyř milionů Sluncí.'),
               ('Co je na fotkách', 'Infračervené snímky VLT a Hubblu ukazují hvězdy nahuštěné kolem středu. Třetí obrázek je první snímek stínu černé díry, který v roce 2022 zveřejnila spolupráce Event Horizon Telescope; na obloze je velký asi jako kobliha na Měsíci.'),
               ('Kde je na obloze', 'Na hranici Střelce, Štíra a Hadonoše. Z Česka je v létě těsně nad jižním obzorem. Na naší fotce je to nejjasnější a nejširší část pásu Mléčné dráhy.')],
         imgs=[('E', 'eso0846a', 'Hvězdy u středu Galaxie v infračerveném světle (VLT)'), ('H', 'heic1606a', 'Střed Galaxie v infračerveném světle (Hubble)'), ('E', 'eso2208-eht-mwa', 'Stín černé díry Sagittarius A* (EHT, 2022)')],
         src=[('ESO: Astronomers reveal first image of the black hole at the heart of our galaxy (eso2208-eht-mw)', 'https://www.eso.org/public/news/eso2208-eht-mw/'), ('ESA/Hubble: The galactic centre (heic1606a)', 'https://esahubble.org/images/heic1606a/'), ('Poloha Sgr A*: Reid a Brunthaler 2004, Astrophysical Journal 616, 872', 'https://doi.org/10.1086/424960')]),
    dict(id='omegacen', cs='Omega Centauri', ozn='NGC 5139', kat='NGC5139', druh='kulova', typ='kulová hvězdokupa', ly=17700,
         lead='Obří kulová hvězdokupa s asi 10 miliony hvězd. Z jižní polokoule je vidět pouhým okem.',
         odst=[('Co to je', 'Omega Centauri je koule zhruba 10 milionů hvězd, které drží pohromadě gravitace. Leží 17 700 světelných let od Země. Je vidět pouhým okem a z tmavého místa vypadá skoro tak velká jako Měsíc v úplňku.'),
               ('Co je na fotkách', 'Snímek ESO ukazuje celou hvězdokupu. Hubble se dívá do jejího středu, kde jsou hvězdy namačkané nejhustěji.'),
               ('Kde je na obloze', 'V souhvězdí Kentaura na jižní obloze. Z Česka nevychází. Na naší fotce je to jasná tečka stranou od pásu Mléčné dráhy.')],
         imgs=[('E', 'eso0844a', 'Celá hvězdokupa (ESO, La Silla)'), ('H', 'heic2409a', 'Střed hvězdokupy (Hubble)')],
         src=[('ESA/Hubble: Omega Centauri (heic2409a)', 'https://esahubble.org/images/heic2409a/')]),
    dict(id='tuc47', cs='47 Tucanae', ozn='NGC 104', kat='NGC0104', druh='kulova', typ='kulová hvězdokupa', ly=15000,
         lead='Jedna z nejjasnějších a nejhmotnějších kulových hvězdokup. Na obloze leží hned vedle Malého Magellanova mračna.',
         odst=[('Co to je', '47 Tucanae je stará kulová hvězdokupa s miliony hvězd, vzdálená asi 15 000 světelných let. Je vidět pouhým okem. Na obloze sousedí s Malým Magellanovým mračnem, to je ale asi čtrnáctkrát dál.'),
               ('Co je na fotkách', 'Infračervený snímek dalekohledu VISTA ukazuje celou hvězdokupu, Hubble její barevný střed.'),
               ('Kde je na obloze', 'V souhvězdí Tukana u jižního nebeského pólu. Z Česka není vidět. Na naší fotce je to jasná tečka těsně vedle Malého Magellanova mračna.')],
         imgs=[('E', 'eso1302a', 'Celá hvězdokupa v infračerveném světle (VISTA)'), ('H', 'heic1510a', 'Střed hvězdokupy (Hubble)')],
         src=[('ESO: A Jumble of Exotic Stars – 47 Tucanae (eso1302)', 'https://www.eso.org/public/news/eso1302/')]),
    dict(id='plejady', cs='Plejády', ozn='M 45', kat='Mel022', druh='otevrena', typ='otevřená hvězdokupa', ly=440,
         lead='Nejznámější hvězdokupa na obloze, lidově Kuřátka nebo Sedm sester.',
         odst=[('Co to je', 'Plejády jsou skupina mladých modrých hvězd, které vznikly společně. Hubbleův dalekohled zpřesnil jejich vzdálenost na asi 440 světelných let. Modravý závoj kolem hvězd je mezihvězdný oblak prachu, který hvězdokupou právě prochází a odráží jejich světlo.'),
               ('Co je na fotkách', 'První snímek ukazuje celou hvězdokupu s modrým závojem prachu. Druhý je tmavý oblak, který odráží světlo hvězdy Merope, třetí ukazuje prach v infračerveném světle.'),
               ('Kde je na obloze', 'V souhvězdí Býka. Z Česka jsou krásně vidět od podzimu do jara. Na naší fotce je to malá modrá skvrnka.')],
         imgs=[('H', 'opo0420a', 'Celá hvězdokupa ze Země; čáry vyznačují pole, kde Hubble měřil vzdálenost'), ('H', 'opo0036a', 'Prach u hvězdy Merope (Hubble)'), ('N', 'PIA13121', 'Prach kolem hvězdokupy v infračerveném světle (družice WISE)')],
         src=[('ESA/Hubble: Hubble Refines Distance to the Pleiades Star Cluster (opo0420a)', 'https://esahubble.org/images/opo0420a/')]),
    dict(id='chi', cs='Dvojitá hvězdokupa v Perseu', ozn='h + χ Persei · NGC 869 a 884', kat='NGC0869', kruh=0.5, vel=False, druh='otevrena', typ='dvě otevřené hvězdokupy vedle sebe', ly=7100, lytxt='asi 7 100 a 7 400 sv. l.',
         lead='Dvě bohaté hvězdokupy těsně vedle sebe. Okem jsou vidět jako protáhlá mlhavá skvrnka mezi Perseem a Kasiopejou.',
         odst=[('Co to je', 'Hvězdokupy h a χ Persei leží asi 7 100 a 7 400 světelných let od Země. Na obloze jsou těsně vedle sebe; vznikly poměrně nedávno a vesmírem se pohybují společně. Už kolem roku 130 př. n. l. je zapsal řecký astronom Hipparchos.'),
               ('Co je na fotkách', 'Snímek zachycuje obě hvězdokupy najednou: převládají jasné modré hvězdy, mezi nimi je několik oranžových.'),
               ('Kde je na obloze', 'Mezi souhvězdími Persea a Kasiopeji. Z Česka nikdy nezapadají. Na naší fotce je to slabé zjasnění v severní Mléčné dráze.')],
         imgs=[('E', 'b02', 'Obě hvězdokupy (ESO/S. Brunier)')],
         src=[('ESO: The double cluster in Perseus (snímek b02)', 'https://www.eso.org/public/images/b02/')]),
    dict(id='m7', cs='Ptolemaiova hvězdokupa', ozn='M 7 · NGC 6475', kat='NGC6475', kruh=0.6, vel=False, druh='otevrena', typ='otevřená hvězdokupa', ly=800,
         lead='Jasná hvězdokupa u „žihadla“ Štíra, známá už ve starověku.',
         odst=[('Co to je', 'Messier 7 je skupina asi stovky hvězd vzdálená zhruba 800 světelných let. Je stará asi 200 milionů let a měří kolem 25 světelných let. Snadno ji najdeš pouhým okem; jako první ji kolem roku 130 popsal Klaudios Ptolemaios.'),
               ('Co je na fotkách', 'Snímek ESO ukazuje jasné modré hvězdy hvězdokupy před hustým pozadím slabých hvězd Mléčné dráhy.'),
               ('Kde je na obloze', 'V souhvězdí Štíra, u konce jeho ocasu. Z Česka je v létě těsně nad obzorem. Na naší fotce je to jasná skvrna na okraji nejjasnější části Mléčné dráhy.')],
         imgs=[('E', 'eso1406a', 'Celá hvězdokupa (ESO, La Silla)')],
         src=[('ESO: A Study in Scarlet – The star cluster Messier 7 (eso1406)', 'https://www.eso.org/public/news/eso1406/')]),
    dict(id='m11', cs='Hvězdokupa Divoká kachna', ozn='M 11 · NGC 6705', kat='NGC6705', vel=False, druh='otevrena', typ='otevřená hvězdokupa', ly=6000,
         lead='Jedna z nejbohatších otevřených hvězdokup, zasazená do jasného hvězdného oblaku ve Štítu.',
         odst=[('Co to je', 'Messier 11 leží asi 6 000 světelných let daleko. Patří k nejbohatším a nejhustším otevřeným hvězdokupám: na prostoru necelých 20 světelných let je téměř 3 000 hvězd. Jméno dostala podle nejjasnějších hvězd, které tvoří klín jako letící hejno kachen.'),
               ('Co je na fotkách', 'Snímek ESO ukazuje celou hvězdokupu, Hubble její hustý střed.'),
               ('Kde je na obloze', 'V malém souhvězdí Štítu pod Orlem. Z Česka je vidět v létě. Na naší fotce leží v jasném oblaku Mléčné dráhy ve Štítu.')],
         imgs=[('E', 'eso1430a', 'Celá hvězdokupa (ESO, La Silla)'), ('H', 'potw1912a', 'Střed hvězdokupy (Hubble)')],
         src=[('ESO: Wild Ducks Take Flight in Open Cluster (eso1430)', 'https://www.eso.org/public/news/eso1430/')]),
]

sky = Image.open(os.path.join(ROOT, 'dist', 'maps', 'milkyway.webp')).convert('RGB')
SW, SH = sky.size
big = Image.new('RGB', (SW * 3, SH))
for k in range(3):
    big.paste(sky, (k * SW, 0))


def vyrez(ra, de, pole, r_deg, out):
    """Výřez z naší fotky oblohy (rovnoúhlá mapa v rovníkových souřadnicích: u = 0,25 − RA/360, v = 0,5 − Dec/180)."""
    x = ((0.25 - ra / 360) % 1) * SW + SW
    y = (0.5 - de / 180) * SH
    hw = pole / 2 / 360 * SW / max(0.2, math.cos(math.radians(de)))
    hh = pole / 2 / 180 * SH
    y0, y1 = max(0, y - hh), min(SH, y + hh)
    t = big.crop((int(x - hw), int(y0), int(x + hw), int(y1))).resize((320, int(320 * (y1 - y0) / (2 * hh))), Image.LANCZOS)
    c = Image.new('RGB', (320, 320), (0, 0, 0))
    c.paste(t, (0, int(320 * (y0 - (y - hh)) / (2 * hh))))
    c = ImageEnhance.Brightness(c).enhance(1.45)
    d = ImageDraw.Draw(c)
    rr = max(14, r_deg / pole * 320)
    d.ellipse((160 - rr, 160 - rr, 160 + rr, 160 + rr), outline=(255, 214, 102), width=2)
    c.save(out, 'WEBP', quality=82)


res, total = [], 0
for o in O:
    if o['kat']:
        r = CAT[o['kat']]
        ra, de = deg(r['RA'], True), deg(r['Dec'], False)
        maj = float(r['MajAx']) if r['MajAx'] else None
        mn = float(r['MinAx']) if r['MinAx'] else None
        # jasnost jen u galaxií a hvězdokup a jen vizuální (V); u mlhovin je údaj katalogu nespolehlivý
        mag = float(r['V-Mag']) if r['V-Mag'] and o['druh'] in ('galaxie', 'kulova', 'otevrena') else None
        konst = r['Const'] or {'B033': 'Ori', 'C099': 'Cru', 'ESO056-115': 'Dor', 'Mel022': 'Tau'}.get(o['kat'], '')
    else:
        ra, de, maj, mn, mag, konst = o['ra'], o['de'], None, None, None, o['konst']
    size = (maj or 60) / 60
    kr = o.get('kruh', size / 2)  # poloměr kroužku ve stupních (u Uhelného pytle katalog velikost neuvádí)
    pole = max(18.0, min(44.0, size * 4))
    vyrez(ra, de, pole, kr, os.path.join(OUT, o['id'] + '_nase.webp'))
    imgs = []
    for n, (k, i, cap) in enumerate(o['imgs']):
        im = Image.open(io.BytesIO(get(CDN[k] % ((i, i) if k == 'N' else i), True))).convert('RGB')
        if max(im.size) > 1280:
            im.thumbnail((1280, 1280), Image.LANCZOS)
        fn = f"{o['id']}_{n + 1}.webp"
        im.save(os.path.join(OUT, fn), 'WEBP', quality=80, method=6)
        total += os.path.getsize(os.path.join(OUT, fn))
        imgs.append({'f': fn, 'w': im.size[0], 'h': im.size[1], 'cap': cap, 'autor': credit(k, i), 'arch': ARCH[k], 'lic': LIC[k], 'url': PAGE[k] % i})
    src = [{'t': t, 'u': u} for t, u in o['src']]
    if o['kat']:
        src.append({'t': OPENNGC[0], 'u': OPENNGC[1]})
    res.append({
        'id': o['id'], 'cs': o['cs'], 'ozn': o['ozn'], 'druh': o['druh'], 'typ': o['typ'], 'souhv': SOUHV[konst],
        'ra': round(ra, 4), 'de': round(de, 4), 'maj': maj, 'min': mn, 'mag': mag, 'pole': round(pole, 1), 'kr': round(kr, 2), 'vel': o.get('vel', True),
        'ly': o['ly'], 'lytxt': o.get('lytxt'), 'lysrc': o.get('lysrc', 0),
        'lead': o['lead'], 'odst': [{'h': h, 't': t} for h, t in o['odst']], 'imgs': imgs, 'src': src,
    })
json.dump({'skupiny': SKUP, 'objekty': res}, open(os.path.join(ROOT, 'src', 'data', 'obloha.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
# přehled původu a licencí pro CREDITS (zdroje/OBLOHA.md)
md = ['# Objekty na obloze: původ fotografií a údajů', '',
      'Soubor vytváří `tools/data/obloha_build.py`; neupravovat ručně. Stav k 19. 11. 2026.', '',
      '- Fotografie z archivů ESO, ESA/Hubble a ESA/Webb jsou pod licencí **CC BY 4.0** (uvést autora; úprava: zmenšení na nejvýš 1280 bodů a převod do WebP).',
      '- Fotografie z archivu NASA (JPL-Caltech) se smí volně užít s uvedením autora podle zásad NASA/JPL pro obrazové materiály.',
      '- Poloha, úhlová velikost a jasnost: katalog **OpenNGC** (Mattia Verga), licence CC BY-SA 4.0, https://github.com/mattiaverga/OpenNGC.',
      '- Výřezy „na naší obloze“ (`dist/sky/<id>_nase.webp`) jsou z panoramatu Mléčné dráhy Axela Mellingera (viz CREDITS.md), zesvětlené o 45 % a s dokresleným kroužkem.',
      '- České texty jsou vlastní shrnutí uvedených zdrojů.', '',
      '| Objekt | Soubor | Co je na snímku | Autor (podle archivu) | Archiv a licence | Stránka snímku |', '|---|---|---|---|---|---|']
for o in res:
    for im in o['imgs']:
        md.append(f"| {o['cs']} | `dist/sky/{im['f']}` | {im['cap']} | {im['autor']} | {im['arch']}, {im['lic']} | {im['url']} |")
md += ['', '## Zdroje údajů v textech', '']
for o in res:
    md.append(f"- **{o['cs']}** ({o['ozn']}): " + '; '.join(f"{x['t']} – {x['u']}" for x in o['src']))
open(os.path.join(ROOT, 'zdroje', 'OBLOHA.md'), 'w', encoding='utf8').write('\n'.join(md) + '\n')
print(len(res), 'objektů,', sum(len(o['imgs']) for o in res), 'fotografií,', round(total / 1e6, 2), 'MB; výřezů', len(res))
