# Objekty na obloze za Sluneční soustavou (verze 2.0): sestaví src/data/obloha.json a obrázky dist/sky/.
#   python3 -I tools/data/obloha_build.py [pracovní složka, výchozí /tmp/obloha]
# Odkud se co bere:
#   poloha, úhlová velikost, jasnost, souhvězdí  – katalog OpenNGC (M. Verga, CC BY-SA 4.0), stahuje se z GitHubu
#   vzdálenost a zajímavosti                      – tiskové zprávy a popisy snímků ESO, ESA/Hubble, ESA/Webb (u každého objektu ve zdrojích)
#   fotografie                                    – archivy ESO, ESA/Hubble a ESA/Webb (CC BY 4.0), autor se čte ze stránky snímku
#   výřez „na naší obloze“                        – z dist/maps/milkyway.webp, tedy přesně to, co aplikace kreslí
# U čtyř objektů (M 16, h + χ Persei, M 7, M 11) se úhlová velikost z OpenNGC výrazně liší od jiných katalogů, proto ji karta neukazuje (vel=False).
# České texty jsou psané tady ve skriptu (ne v JSON).
# Hvězdy (verze 2.0):
#   poloha, jasnost, spektrální třída  – katalog Hipparcos (ESA 1997), archiv ESA (tabulka public.hipparcos)
#   paralaxa a z ní vzdálenost         – Hipparcos, nové zpracování (van Leeuwen 2007), tabulka public.hipparcos_newreduction;
#                                        vzdálenost = 3261,56 / paralaxa [mas] světelných let, poloha přepočtena vlastním pohybem na J2000
#   zajímavosti                        – úvodní odstavce hesel anglické Wikipedie (u každé hvězdy ve zdrojích) a stránky snímků ESO, ESA
#   okolí hvězdy                       – výřez z mapy hvězd NASA SVS „Deep Star Maps 2020“ (starmap_2020_16k.exr, 443 MB, stáhne se do pracovní složky)
import csv, json, math, os, re, subprocess, sys, html, hashlib, io, urllib.parse
from PIL import Image, ImageDraw, ImageEnhance

W = sys.argv[1] if len(sys.argv) > 1 else '/tmp/obloha'
os.makedirs(W, exist_ok=True)
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'dist', 'sky')
os.makedirs(OUT, exist_ok=True)
PAGE = {'E': 'https://www.eso.org/public/images/%s/', 'H': 'https://esahubble.org/images/%s/', 'W': 'https://esawebb.org/images/%s/', 'N': 'https://images.nasa.gov/details/%s',
        'EN': 'https://www.eso.org/public/news/%s/', 'HN': 'https://esahubble.org/news/%s/', 'WN': 'https://esawebb.org/news/%s/'}  # …N = tisková zpráva
CDN = {'E': 'https://cdn.eso.org/images/screen/%s.jpg', 'H': 'https://cdn.esahubble.org/archives/images/screen/%s.jpg', 'W': 'https://cdn.esawebb.org/archives/images/screen/%s.jpg', 'N': 'https://images-assets.nasa.gov/image/%s/%s~large.jpg'}
STAV = '20. 11. 2026'  # den, kdy byly údaje a odkazy ověřeny
ARCH = {'E': 'ESO', 'H': 'ESA/Hubble', 'W': 'ESA/Webb', 'N': 'NASA', 'S': 'NASA SVS', 'EN': 'ESO, tisková zpráva', 'HN': 'ESA/Hubble, tisková zpráva', 'WN': 'ESA/Webb, tisková zpráva'}
LIC = {'E': 'CC BY 4.0', 'H': 'CC BY 4.0', 'W': 'CC BY 4.0', 'N': 'volné užití s uvedením autora (zásady NASA/JPL)', 'S': 'volné užití s uvedením autora (zásady NASA)'}
SVS = 'https://svs.gsfc.nasa.gov/4851/'
SVS_EXR = 'https://svs.gsfc.nasa.gov/vis/a000000/a004800/a004851/starmap_2020_16k.exr'
SVS_AUTOR = 'NASA/Goddard Space Flight Center Scientific Visualization Studio. Gaia DR2: ESA/Gaia/DPAC'
MAXPX = 1000  # delší strana fotografií objektů přidaných ve verzi 2.0 (starší mají 1280)


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


SOUHV = {'And': 'Andromeda', 'Ori': 'Orion', 'Car': 'Lodní kýl', 'Sgr': 'Střelec', 'Se2': 'Had', 'Se1': 'Had', 'Cyg': 'Labuť', 'Mon': 'Jednorožec', 'Cen': 'Kentaur', 'Tuc': 'Tukan', 'Per': 'Perseus', 'Sco': 'Štír', 'Sct': 'Štít', 'Oph': 'Hadonoš', 'Dor': 'Mečoun', 'Cru': 'Jižní kříž', 'Tau': 'Býk', 'Tri': 'Trojúhelník', 'UMa': 'Velká medvědice', 'CVn': 'Honicí psi', 'Vir': 'Panna', 'Hya': 'Hydra', 'Scl': 'Sochař', 'Peg': 'Pegas', 'Crv': 'Havran', 'CMa': 'Velký pes', 'Cas': 'Kasiopeja', 'Lyr': 'Lyra', 'Vul': 'Lištička', 'Aqr': 'Vodnář', 'Dra': 'Drak', 'Her': 'Herkules', 'Pav': 'Páv', 'Ara': 'Oltář', 'Gem': 'Blíženci', 'Vel': 'Plachty'}
OPENNGC = ('Katalog OpenNGC (poloha, úhlová velikost, jasnost)', 'https://github.com/mattiaverga/OpenNGC')
_cz = re.search(r'CON_CZ = \{(.*?)\};', open(os.path.join(ROOT, 'src', 'data', 'connames.js'), encoding='utf8').read(), re.S).group(1)
for _k, _v in re.findall(r"(\w+): '([^']+)'", _cz):  # česká jména všech 88 souhvězdí, jak je používá aplikace
    SOUHV.setdefault(_k, _v)
SKUP = {'hvezda': 'Hvězdy', 'galaxie': 'Galaxie', 'mlhovina': 'Zářící mlhoviny', 'temna': 'Temné mlhoviny', 'zanik': 'Umírající hvězdy a jejich pozůstatky', 'kulova': 'Kulové hvězdokupy', 'otevrena': 'Otevřené hvězdokupy', 'stred': 'Střed Galaxie'}

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
    dict(id='kun', vid=1, cs='Koňská hlava', ozn='Barnard 33 · IC 434', kat='B033', druh='temna', typ='temná mlhovina před zářící mlhovinou', ly=1300,
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
    dict(id='amerika', vid=1, cs='Mlhovina Severní Amerika', ozn='NGC 7000', kat='NGC7000', druh='mlhovina', typ='zářící mlhovina', ly=2590, lytxt='asi 2 590 sv. l. (družice Gaia, 2020); starší odhady 1 500–2 000',
         lead='Velká mlhovina u hvězdy Deneb, která tvarem připomíná severoamerický kontinent i s Mexickým zálivem.',
         odst=[('Co to je', 'Mlhovina Severní Amerika je oblak zářícího vodíku v souhvězdí Labutě. Její vzdálenost byla dlouho nejistá; měření družice Gaia z roku 2020 dala asi 2 590 světelných let. „Mexický záliv“ není prázdné místo, ale tmavé mračno (L935).'),
               ('Co je na fotkách', 'Pozemní snímek z přehlídky oblohy Digitized Sky Survey 2 ukazuje celý „kontinent“; vpravo od něj je mlhovina Pelikán.'),
               ('Kde je na obloze', 'Blízko jasné hvězdy Deneb v Labuti. Z Česka je v létě skoro v nadhlavníku. Na naší fotce je to narůžovělá skvrna v pásu Mléčné dráhy.')],
         imgs=[('H', 'heic0510a', 'Celá mlhovina (pozemní snímek, Digitized Sky Survey 2)')],
         src=[('Wikipedia: North America Nebula (vzdálenost podle Kuhn a kol. 2020, Gaia)', 'https://en.wikipedia.org/wiki/North_America_Nebula')]),
    dict(id='rozeta', vid=1, cs='Mlhovina Rozeta', ozn='NGC 2237–2246', kat='NGC2237', druh='mlhovina', typ='zářící mlhovina s hvězdokupou uprostřed', ly=5200,
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
    dict(id='chi', vid=1, cs='Dvojitá hvězdokupa v Perseu', ozn='h + χ Persei · NGC 869 a 884', kat='NGC0869', kruh=0.5, vel=False, druh='otevrena', typ='dvě otevřené hvězdokupy vedle sebe', ly=7100, lytxt='asi 7 100 a 7 400 sv. l.',
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
    dict(id='m11', vid=1, cs='Hvězdokupa Divoká kachna', ozn='M 11 · NGC 6705', kat='NGC6705', vel=False, druh='otevrena', typ='otevřená hvězdokupa', ly=6000,
         lead='Jedna z nejbohatších otevřených hvězdokup, zasazená do jasného hvězdného oblaku ve Štítu.',
         odst=[('Co to je', 'Messier 11 leží asi 6 000 světelných let daleko. Patří k nejbohatším a nejhustším otevřeným hvězdokupám: na prostoru necelých 20 světelných let je téměř 3 000 hvězd. Jméno dostala podle nejjasnějších hvězd, které tvoří klín jako letící hejno kachen.'),
               ('Co je na fotkách', 'Snímek ESO ukazuje celou hvězdokupu, Hubble její hustý střed.'),
               ('Kde je na obloze', 'V malém souhvězdí Štítu pod Orlem. Z Česka je vidět v létě. Na naší fotce leží v jasném oblaku Mléčné dráhy ve Štítu.')],
         imgs=[('E', 'eso1430a', 'Celá hvězdokupa (ESO, La Silla)'), ('H', 'potw1912a', 'Střed hvězdokupy (Hubble)')],
         src=[('ESO: Wild Ducks Take Flight in Open Cluster (eso1430)', 'https://www.eso.org/public/news/eso1430/')]),
]

# ---------- objekty přidané ve verzi 1.8c (kratší zápis; zdroj = stránky snímků, ze kterých je vzdálenost a údaje v textu) ----------
def titul(k, i):
    m = re.search(r'<title>(.*?)</title>', get(PAGE[k] % i), re.S)
    return re.sub(r'\s+', ' ', html.unescape(m.group(1))).split(' | ')[0].strip().rstrip('*')


def N(id, cs, ozn, kat, druh, typ, ly, lead, txt, foto, imgs, zdroj, **kw):
    src = [zdr(z) for z in zdroj]
    return dict(id=id, cs=cs, ozn=ozn, kat=kat, druh=druh, typ=typ, ly=ly, lead=lead, txt=txt, foto=foto, imgs=imgs, src=src, **kw)


def zdr(z):
    k, i = z.split(':')
    return (f"{ARCH[k]}: {titul(k, i)} ({i})", PAGE[k] % i)


def N2(id, cs, ozn, kat, druh, typ, ly, lead, txt, imgs, zdroj, **kw):
    """Objekt přidaný ve verzi 2.0: menší fotografie (MAXPX), výchozí „na naší fotce není vidět“ (vid=0), dokud se neověří na výřezu."""
    kw.setdefault('vid', 0)
    return N(id, cs, ozn, kat, druh, typ, ly, lead, txt, kw.pop('foto', None), imgs, zdroj, nove=True, **kw)


O += [
    N('tarantule', 'Mlhovina Tarantule', '30 Doradus · NGC 2070', 'NGC2070', 'mlhovina', 'obří hvězdná porodnice v sousední galaxii', 170000,
      'Obrovská hvězdná porodnice ve Velkém Magellanově mračnu. Je tak jasná, že je vidět i na naší fotce jako světlá skvrna v sousední galaxii.',
      'Mlhovina Tarantule neleží v naší Galaxii, ale ve Velkém Magellanově mračnu, asi 170 000 světelných let daleko. Jméno dostala podle vláken plynu, která připomínají nohy pavouka.',
      'Webbova mozaika zabírá oblast širokou 340 světelných let. Snímek ESO ukazuje mlhovinu i s okolím, celý čtvereční stupeň oblohy.',
      [('W', 'weic2212a', 'Střed mlhoviny v infračerveném světle (Webb)'), ('E', 'eso0650a', 'Mlhovina a její okolí (ESO, La Silla)')], ['E:eso0650a', 'W:weic2212a'], kruh=0.35),
    N('trifid', 'Mlhovina Trifid', 'M 20 · NGC 6514', 'NGC6514', 'mlhovina', 'zářící, odrazná a temná mlhovina v jednom', 5500, lytxt='asi 5 500 sv. l. (ESO); Hubble uvádí 5 000',
      lead='Mlhovina rozdělená tmavými pruhy prachu na tři díly. Leží hned vedle Laguny.',
      txt='Trifid je továrna na hvězdy vzdálená asi 5 500 světelných let. Jméno znamená „rozdělená na tři“: zářící střed protínají tři tmavé pruhy prachu. Je vzácnou kombinací tří druhů mlhovin najednou: zářící (růžová), odrazné (modrá) a temné.',
      foto='Snímek ESO ukazuje celou mlhovinu, Hubble detail oblaku prachu, ve kterém vznikají hvězdy.',
      imgs=[('E', 'eso0930a', 'Celá mlhovina (ESO, La Silla)'), ('H', 'heic2608a', 'Detail oblaku prachu (Hubble)')], zdroj=['E:eso0930a', 'H:heic2608a'], kruh=0.25),
    N('omega', 'Mlhovina Omega', 'M 17 · NGC 6618 · Labuť', 'NGC6618', 'mlhovina', 'zářící mlhovina, hvězdná porodnice', 5500,
      'Jasná hvězdná porodnice ve Střelci, které se říká také Labuť.',
      'Mlhovina Omega je rozsáhlá oblast plynu, prachu a horkých mladých hvězd vzdálená asi 5 500 světelných let. Její nejjasnější část měří na obloze třetinu průměru Měsíce v úplňku, což odpovídá asi 15 světelným rokům.',
      'Snímek dalekohledu VST zachycuje celou mlhovinu i se slabými okraji, snímek z dalekohledu NTT její jasný střed.',
      [('E', 'eso1119a', 'Celá mlhovina (dalekohled VST)'), ('E', 'eso0925a', 'Jasný střed mlhoviny (dalekohled NTT)')], ['E:eso1119a', 'E:eso0925a'], kruh=0.2, vid=1),
    N('plamen', 'Mlhovina Plamen', 'NGC 2024', 'NGC2024', 'mlhovina', 'zářící mlhovina s ukrytou hvězdokupou', 1500,
      'Mlhovina hned u jedné z hvězd Orionova pásu, sousedka Koňské hlavy.',
      'Mlhovina Plamen je hvězdná porodnice vzdálená asi 1 500 světelných let. Ve viditelném světle je její střed úplně schovaný za prachem; infračervený dalekohled VISTA prachem prohlédl a ukázal hvězdokupu mladých hvězd uvnitř.',
      'První snímek je vůbec první zveřejněný snímek dalekohledu VISTA: vpravo dole je na něm vidět i obrys Koňské hlavy. Druhý ukazuje okolí mlhoviny v rádiových vlnách (APEX).',
      [('E', 'eso0949a', 'V infračerveném světle (dalekohled VISTA)'), ('E', 'eso2201a', 'Okolí v rádiových vlnách (APEX a VISTA)')], ['E:eso0949a'], kruh=0.25),
    N('kure', 'Mlhovina Běžící kuře', 'IC 2944', 'IC2944', 'mlhovina', 'zářící mlhovina s mladou hvězdokupou', 6500,
      'Růžová mlhovina v jižní Mléčné dráze, jejíž tvar někomu připomíná běžící kuře.',
      'Mlhovinu tvoří několik oblaků plynu a prachu vzdálených asi 6 500 světelných let. Rozsvěcují je mladé horké hvězdy uvnitř. V mlhovině plují malé tmavé chuchvalce prachu, takzvané Thackerayovy globule.',
      'Snímek dalekohledu VST má 1,5 miliardy bodů a zabírá na obloze plochu asi 25 úplňků. Hubble ukazuje Thackerayovy globule zblízka.',
      [('E', 'eso2320a', 'Celá mlhovina (dalekohled VST)'), ('H', 'opo0201a', 'Thackerayovy globule (Hubble)')], ['E:eso2320a', 'H:opo0201a'], kruh=0.6),
    N('tlapa', 'Mlhovina Kočičí tlapka', 'NGC 6334', 'NGC6334', 'mlhovina', 'zářící mlhovina, hvězdná porodnice', 5500, lytxt='asi 5 500 sv. l. (ESO); Webb uvádí 4 000',
      lead='Hvězdná porodnice ve Štíru, která vypadá jako otisk kočičí tlapky.',
      txt='Kočičí tlapka je rozsáhlá oblast zrodu hvězd. Může v ní být několik desítek tisíc hvězd, mnohé z nich zatím ukryté hluboko v prachu. Červená je proto, že modré a zelené světlo cestou k nám pohltí a rozptýlí prach.',
      foto='Snímek ESO ukazuje celou „tlapku“, Webb detail jednoho z jejích „polštářků“ v infračerveném světle.',
      imgs=[('E', 'eso1003a', 'Celá mlhovina (ESO, La Silla)'), ('W', 'weic2513a', 'Detail v infračerveném světle (Webb)')], zdroj=['E:eso1003a', 'W:weic2513a'], kruh=0.3, vid=1),
    N('humr', 'Mlhovina Humr', 'NGC 6357', 'NGC6357', 'mlhovina', 'zářící mlhovina, hvězdná porodnice', 8000,
      'Sousedka Kočičí tlapky: oblaka zářícího plynu kolem horkých mladých hvězd.',
      'Mlhovina Humr je hvězdná porodnice vzdálená asi 8 000 světelných let. Dalekohled VISTA ji vyfotil při přehlídce, která mapuje stavbu naší Galaxie.',
      'Infračervený snímek VISTA ukazuje zářící plyn a vlákna prachu. Druhý snímek zachycuje Humra i Kočičí tlapku najednou; patří k největším, jaké ESO kdy zveřejnila.',
      [('E', 'eso1309a', 'V infračerveném světle (dalekohled VISTA)'), ('E', 'eso1705a', 'Kočičí tlapka a Humr na jednom snímku (dalekohled VST)')], ['E:eso1309a', 'E:eso1705a'], kruh=0.3, vid=1),
    N('kreveta', 'Mlhovina Kreveta', 'IC 4628 · Gum 56', 'IC4628', 'mlhovina', 'zářící mlhovina, hvězdná porodnice', 6000,
      'Velká hvězdná porodnice v ocasu Štíra.',
      'Mlhovina Kreveta je spleť zářících oblaků plynu asi 6 000 světelných let daleko. Mezi oblaky jsou vidět shluky horkých, právě zrozených hvězd.',
      'Oba snímky pocházejí z dalekohledů ESO v Chile: první ukazuje celou mlhovinu, druhý její část zblízka.',
      [('E', 'eso1340a', 'Celá mlhovina (dalekohled VST)'), ('E', 'eso1535a', 'Část mlhoviny zblízka (ESO, La Silla)')], ['E:eso1340a', 'E:eso1535a'], kruh=0.6, vid=1),
    N('kuzel', 'Mlhovina Kužel a Vánoční stromeček', 'NGC 2264', 'NGC2264', 'mlhovina', 'zářící mlhovina s hvězdokupou', 2500, lytxt='asi 2 500 sv. l. (ESO 2022); starší údaj ESO 3 000',
      lead='Tmavý sloup prachu a nad ním hvězdokupa, jejíž hvězdy připomínají ozdoby na vánočním stromku.',
      txt='NGC 2264 je oblast zrodu hvězd vzdálená asi 2 500 světelných let. Mlhovina Kužel je sloup studeného plynu a prachu; takové sloupy vznikají v obřích mračnech, ze kterých se rodí nové hvězdy.',
      foto='Širší snímek ukazuje celou oblast i s modrými hvězdami Vánočního stromečku, druhý samotný Kužel, jak ho dalekohled VLT vyfotil k 60. výročí ESO.',
      imgs=[('E', 'eso0848a', 'Celá oblast s hvězdokupou (ESO, La Silla)'), ('E', 'eso2215a', 'Mlhovina Kužel (dalekohled VLT)')], zdroj=['E:eso2215a', 'E:eso0848a'], kruh=0.3, vid=0, mag=False),
    N('racek', 'Mlhovina Racek', 'IC 2177 · Sharpless 2-296', 'IC2177', 'mlhovina', 'zářící mlhovina, hvězdná porodnice', 3500,
      'Mlhovina, která vypadá jako racek v letu.',
      'Racek je horké a bouřlivé místo zrodu nových hvězd, asi 3 500 světelných let daleko. „Křídla“ tvoří oblak označovaný Sharpless 2-296; mezi zářícím plynem se táhnou tmavé pruhy prachu.',
      'Snímek dalekohledu VST ukazuje křídla i hlavu racka.',
      [('E', 'eso1913a', 'Celá mlhovina (dalekohled VST)')], ['E:eso1913a'], kruh=0.5, vid=0),
    N('bublina', 'Mlhovina Bublina', 'NGC 7635', 'NGC7635', 'mlhovina', 'zářící mlhovina', 8000,
      'Mlhovina ve tvaru velké bubliny.',
      'Mlhovina Bublina je zářící mlhovina vzdálená 8 000 světelných let. Hubbleův dalekohled ji vyfotil k 26. výročí svého pobytu ve vesmíru.',
      None, [('H', 'heic1608a', 'Bublina, snímek k 26. výročí Hubblu')], ['H:heic1608a'], vid=0),
    N('thor', 'Thorova přilba', 'NGC 2359', 'NGC2359', 'mlhovina', 'bublina plynu kolem hmotné hvězdy', 15000,
      'Mlhovina ve tvaru přilby s křídly.',
      'Thorova přilba leží asi 15 000 světelných let daleko a měří přes 30 světelných let. Je to bublina, kterou do okolního plynu vyfoukal vítr z hmotné hvězdy uprostřed.',
      'Snímek pořídil dalekohled VLT 5. října 2012, v den 50. výročí ESO.',
      [('E', 'eso1238a', 'Snímek k 50. výročí ESO (dalekohled VLT)')], ['E:eso1238a'], vid=0),
    N('dymka', 'Mlhovina Dýmka', 'Barnard 59 (náustek Dýmky)', None, 'temna', 'temná mlhovina', 600,
      'Dlouhý tmavý oblak prachu, který se rýsuje proti nejjasnější části Mléčné dráhy.',
      'Dýmka je rozsáhlé temné mračno mezihvězdného prachu vzdálené asi 600 světelných let. Kroužek označuje její „náustek“, mlhovinu Barnard 59. Prach zakrývá světlo hvězd za sebou, proto vypadá jako díra v Mléčné dráze.',
      'Podrobný snímek náustku pořídil dalekohled ESO na observatoři La Silla.',
      [('E', 'eso1233a', 'Náustek Dýmky, Barnard 59 (ESO, La Silla)')], ['E:eso1233a'], ra=257.8201, de=-27.3701, konst='Oph', kruh=1.2, vel=False,
      nase='Na naší fotce je vidět jako tmavý pruh před jasným středem Mléčné dráhy.', possrc=('ESO: poloha středu snímku eso1233a (Barnard 59)', 'https://www.eso.org/public/images/eso1233a/')),
    # ---- umírající hvězdy a jejich pozůstatky ----
    N('krab', 'Krabí mlhovina', 'M 1 · NGC 1952', 'NGC1952', 'zanik', 'pozůstatek výbuchu supernovy', 6500,
      'Rozpínající se trosky hvězdy, která vybuchla jako supernova. Uprostřed zůstal pulzar.',
      'Krabí mlhovina leží asi 6 500 světelných let daleko a patří k nejlépe prozkoumaným objektům na obloze. Uprostřed je pulzar: rychle rotující neutronová hvězda, jejíž magnetické pole tvaruje jemná modravá vlákna.',
      'Hubbleova mozaika z 24 snímků je nejpodrobnější pohled na celou mlhovinu. Webb ji ukazuje v infračerveném světle.',
      [('H', 'heic0515a', 'Celá mlhovina, nejpodrobnější snímek (Hubble)'), ('W', 'weic2417a', 'V infračerveném světle (Webb)')], ['H:heic0515a', 'W:weic2417a'], vid=0, mag=False),
    N('rasy', 'Řasová mlhovina', 'NGC 6960 · Čarodějnické koště', 'NGC6960', 'zanik', 'pozůstatek výbuchu supernovy', 2100,
      'Jemné závoje plynu: vnější slupka dávno vybuchlé hvězdy.',
      'Řasová mlhovina je známý pozůstatek supernovy vzdálený asi 2 100 světelných let. Kroužek označuje její západní část, které se říká Čarodějnické koště.',
      'Hubble vyfotil jen malý úsek vnější slupky.',
      [('H', 'heic1520a', 'Malý úsek mlhoviny (Hubble)')], ['H:heic1520a'], vid=0, kruh=0.6),
    N('prstenec', 'Prstencová mlhovina', 'M 57 · NGC 6720', 'NGC6720', 'zanik', 'planetární mlhovina', 2500,
      'Kroužek plynu, který kolem sebe odhodila umírající hvězda.',
      'Prstencová mlhovina leží asi 2 500 světelných let daleko. Ze Země vypadá jako jednoduchý ovál, ale podle Hubbleových měření má tvar pokřivené koblihy, jejíž střed vyplňuje řidší plyn.',
      None, [('H', 'heic1310a', 'Prstencová mlhovina (Hubble)')], ['H:heic1310a'], vid=0, mag=False),
    N('cinka', 'Mlhovina Činka', 'M 27 · NGC 6853', 'NGC6853', 'zanik', 'planetární mlhovina', 1200,
      'První planetární mlhovina, která kdy byla objevena.',
      'Činka je blízká planetární mlhovina, přes 1 200 světelných let daleko. Vznikla, když stará hvězda odhodila své vnější vrstvy; ty teď barevně září.',
      'Snímek dalekohledu VLT ukazuje celou mlhovinu, Hubble zářící uzlíky plynu uvnitř.',
      [('E', 'eso9846a', 'Celá mlhovina (dalekohled VLT)'), ('H', 'opo0306a', 'Uzlíky plynu zblízka (Hubble)')], ['H:opo0306a', 'E:eso9846a'], vid=0, mag=False),
    N('helix', 'Mlhovina Helix', 'NGC 7293', 'NGC7293', 'zanik', 'planetární mlhovina', 700,
      'Planetární mlhovina vzdálená jen asi 700 světelných let; vypadá jako obří oko.',
      'Helix je asi 700 světelných let daleko. Modrozelená záře uprostřed pochází z kyslíku, který rozsvěcuje ultrafialové záření ústřední hvězdy horké 120 000 °C. Řídkým plynem mlhoviny prosvítají i vzdálené galaxie.',
      'Snímek ESO ukazuje celou mlhovinu, Webb detail jejího okraje v infračerveném světle.',
      [('E', 'eso0907a', 'Celá mlhovina (ESO, La Silla)'), ('W', 'weic2601a', 'Detail okraje v infračerveném světle (Webb)')], ['E:eso0907a'], vid=0, mag=False),
    N('kocici', 'Mlhovina Kočičí oko', 'NGC 6543', 'NGC6543', 'zanik', 'planetární mlhovina', 3000,
      'Jedna z nejsložitějších planetárních mlhovin, jaké známe.',
      'Kočičí oko leží asi 3 000 světelných let daleko. Patří k prvním objeveným planetárním mlhovinám a zároveň k nejsložitějším. Planetární mlhovina vzniká, když hvězda podobná Slunci na konci života odhodí své vnější vrstvy.',
      None, [('H', 'heic0414a', 'Kočičí oko (Hubble)')], ['H:heic0414a'], vid=0, mag=False),
    N('motyl', 'Motýlí mlhovina', 'NGC 6302', 'NGC6302', 'zanik', 'planetární mlhovina', 4000,
      'Dvě „křídla“ rozžhaveného plynu kolem umírající hvězdy.',
      'Motýlí mlhovina je asi 4 000 světelných let daleko. Křídla jsou plyn horký téměř 20 000 °C, který se řítí prostorem rychlostí přes 950 000 km/h. Odhodila ho hvězda, která měla původně asi pětkrát větší hmotnost než Slunce.',
      'Hubbleův snímek je z roku 2009. Druhý obrázek srovnává pohled Hubblu s pohledem Webbu a radioteleskopu ALMA.',
      [('H', 'heic0910h', 'Motýlí mlhovina (Hubble)'), ('W', 'weic2517a', 'Hubble, Webb a ALMA vedle sebe')], ['H:heic0910h'], vid=0, mag=False),
    # ---- galaxie ----
    N('m33', 'Galaxie v Trojúhelníku', 'M 33 · NGC 598', 'NGC0598', 'galaxie', 'spirální galaxie', 3000000,
      'Druhá nejbližší velká galaxie po galaxii v Andromedě.',
      'Galaxie v Trojúhelníku je blízká spirální galaxie vzdálená asi 3 miliony světelných let, plná jasných hvězdokup a oblaků plynu a prachu.',
      'Hubbleova mozaika z 54 záběrů je druhý největší snímek, jaký Hubble kdy zveřejnil: ukazuje střed galaxie a miliony jednotlivých hvězd. Snímek dalekohledu VST zachycuje celou galaxii.',
      [('E', 'eso1424a', 'Celá galaxie (dalekohled VST)'), ('H', 'heic1901a', 'Střed a vnitřní ramena (Hubble)')], ['E:eso1424a', 'H:heic1901a'], vid=1,
      nase='Na naší fotce je vidět jen jako velmi slabá skvrnka.'),
    N('m81', 'Bodeho galaxie', 'M 81 · NGC 3031', 'NGC3031', 'galaxie', 'spirální galaxie', 11600000,
      'Učebnicová spirální galaxie ve Velké medvědici.',
      'M 81 je velká spirální galaxie vzdálená 11,6 milionu světelných let. Její ramena z hvězd, prachu a plynu se vinou až do samého jádra. Hubble v ní i na tu dálku rozliší jednotlivé hvězdy a hvězdokupy.',
      None, [('H', 'heic0710a', 'Nejostřejší snímek galaxie M 81 (Hubble)')], ['H:heic0710a'], vid=0),
    N('m82', 'Galaxie Doutník', 'M 82 · NGC 3034', 'NGC3034', 'galaxie', 'galaxie s bouřlivým zrodem hvězd', 13000000,
      'Galaxie, ve které se hvězdy rodí desetkrát rychleji než v Mléčné dráze.',
      'M 82 leží asi 13 milionů světelných let daleko, hned vedle galaxie M 81. Z jejího středu, kde vznikají nové hvězdy, vyrážejí ven chocholy zářícího vodíku.',
      'Hubbleova mozaika je nejostřejší širokoúhlý pohled na tuto galaxii. Druhý obrázek srovnává snímky Webbu a Hubblu.',
      [('H', 'heic0604a', 'Celá galaxie s výtrysky vodíku (Hubble)'), ('W', 'weic2410a', 'Střed galaxie: Webb a Hubble')], ['H:heic0604a'], vid=0),
    N('m51', 'Vírová galaxie', 'M 51 · NGC 5194', 'NGC5194', 'galaxie', 'spirální galaxie s průvodcem', 25000000,
      'Spirální galaxie viděná přesně shora, i se svou menší průvodkyní.',
      'Vírová galaxie leží asi 25 milionů světelných let daleko v souhvězdí Honicích psů. Protože se na ni díváme přímo shora a je poměrně blízko, slouží astronomům jako vzor spirální galaxie: v jejích ramenech se rodí hvězdy a jasné modré hvězdokupy.',
      None, [('H', 'heic0506a', 'Vírová galaxie a její průvodkyně (Hubble)')], ['H:heic0506a'], vid=0),
    N('m104', 'Galaxie Sombrero', 'M 104 · NGC 4594', 'NGC4594', 'galaxie', 'spirální galaxie viděná skoro z boku', 30000000,
      'Galaxie, která vypadá jako mexický klobouk.',
      'Sombrero je 30 milionů světelných let daleko a měří 50 000 světelných let. Díváme se na něj jen šest stupňů nad rovinou jeho disku, proto vyniká jasná střední výduť obtočená tmavým pruhem prachu. Jeho hmotnost odpovídá 800 miliardám Sluncí.',
      'Hubble ukazuje galaxii ve viditelném světle, Webb v infračerveném, kde svítí hlavně prach.',
      [('H', 'opo0328a', 'Ve viditelném světle (Hubble)'), ('W', 'weic2427a', 'V infračerveném světle (Webb)')], ['H:opo0328a'], vid=0),
    N('m87', 'Galaxie M 87', 'Messier 87 · NGC 4486', 'NGC4486', 'galaxie', 'obří eliptická galaxie s černou dírou', 55000000,
      'Galaxie, v jejímž středu lidé poprvé vyfotili stín černé díry.',
      'M 87 je obrovská eliptická galaxie vzdálená asi 55 milionů světelných let. V dubnu 2019 zveřejnila spolupráce Event Horizon Telescope první přímý obraz stínu obří černé díry v jejím středu; horizont událostí té černé díry měří necelých 40 miliard kilometrů.',
      'První snímek je slavný obraz stínu černé díry složený z měření osmi radioteleskopů po celé Zemi. Druhý ukazuje celou galaxii.',
      [('E', 'eso1907a', 'Stín černé díry ve středu M 87 (EHT, 2019)'), ('E', 'eso1907b', 'Celá galaxie (dalekohled VLT)')], ['E:eso1907b', 'E:eso1907a'], vid=0),
    N('cena', 'Centaurus A', 'NGC 5128', 'NGC5128', 'galaxie', 'zvláštní galaxie s pruhem prachu', 12000000, lytxt='asi 12 mil. sv. l. (ESO); Hubble uvádí 11',
      lead='Zvláštní galaxie přepásaná tmavým pruhem prachu.',
      txt='Centaurus A je asi 12 milionů světelných let daleko. Je známá dramatickými tmavými pruhy prachu, které protínají její jasné těleso.',
      foto='Snímek ESO vznikal přes 50 hodin a je nejspíš nejhlubším pohledem na tuto galaxii. Hubble ukazuje detail prachového pruhu.',
      imgs=[('E', 'eso1221a', 'Celá galaxie, expozice přes 50 hodin (ESO, La Silla)'), ('H', 'heic1110a', 'Detail prachového pruhu (Hubble)')], zdroj=['E:eso1221a', 'H:heic1110a'], vid=0),
    N('m83', 'Jižní větrník', 'M 83 · NGC 5236', 'NGC5236', 'galaxie', 'spirální galaxie s příčkou', 15000000,
      'Jedna z největších a nejbližších spirálních galaxií s příčkou.',
      'M 83 leží asi 15 milionů světelných let daleko. Podobá se Mléčné dráze: obě mají v jádru příčku z hvězd. M 83 je ale zhruba 2,5krát menší. Vybuchlo v ní už velké množství supernov.',
      'Hubble ukazuje jasné hvězdy a hustý prach v ramenech, snímek ESO celou galaxii.',
      [('E', 'eso0825a', 'Celá galaxie (ESO, La Silla)'), ('H', 'heic1403a', 'Ramena plná hvězd a prachu (Hubble)')], ['H:heic1403a', 'E:eso0825a'], vid=0),
    N('n253', 'Galaxie v Sochaři', 'NGC 253', 'NGC0253', 'galaxie', 'spirální galaxie s bouřlivým zrodem hvězd', 13000000,
      'Jasná spirální galaxie jižní oblohy, jedna z nejbližších.',
      'NGC 253 leží asi 13 milionů světelných let daleko v souhvězdí Sochaře. Je známá tím, že v ní bouřlivě vznikají nové hvězdy.',
      'V infračerveném světle dalekohledu VISTA prach ve spirálních ramenech skoro zprůhlední a objeví se chladné červené hvězdy.',
      [('E', 'eso1025a', 'V infračerveném světle (dalekohled VISTA)')], ['E:eso1025a'], vid=0),
    N('tykadla', 'Galaxie Tykadla', 'NGC 4038 a NGC 4039', 'NGC4038', 'galaxie', 'dvě srážející se galaxie', 65000000, lytxt='asi 65 mil. sv. l. (Hubble); ESO uvádí 75',
      lead='Dvě galaxie uprostřed srážky.',
      txt='Tykadla jsou dvojice galaxií vzdálená asi 65 milionů světelných let. Při srážce v nich vzniká mimořádné množství nových hvězd. Nakonec jejich jádra splynou a zůstane jedna velká eliptická galaxie.',
      foto='Hubbleův snímek ukazuje růžové oblasti zrodu hvězd. Druhý obrázek přidává měření radioteleskopu ALMA.',
      imgs=[('H', 'potw1345a', 'Srážka galaxií (Hubble)'), ('E', 'eso1137a', 'Hubble a radioteleskop ALMA dohromady')], zdroj=['H:potw1345a', 'E:eso1137a'], vid=0),
    N('quintet', 'Stephanův kvintet', 'NGC 7317–7320', 'NGC7318B', 'galaxie', 'skupina pěti galaxií', 290000000,
      'Pět galaxií těsně u sebe; čtyři z nich se navzájem přetahují gravitací.',
      'Čtyři galaxie kvintetu leží asi 290 milionů světelných let daleko. Pátá, NGC 7320, je ve skutečnosti v popředí: jen 40 milionů světelných let od nás.',
      'Webbova mozaika má přes 150 milionů bodů a vznikla z téměř tisíce snímků. Hubble ukazuje stejnou skupinu ve viditelném světle.',
      [('W', 'weic2208a', 'Kvintet v infračerveném světle (Webb)'), ('H', 'heic0910i', 'Ve viditelném světle (Hubble)')], ['W:weic2208a', 'H:heic0910i'], vid=0, vel=False, kruh=0.05),
    # ---- hvězdokupy ----
    N('m13', 'Kulová hvězdokupa v Herkulovi', 'M 13 · NGC 6205', 'NGC6205', 'kulova', 'kulová hvězdokupa', 25000,
      'Jedna z nejjasnějších a nejznámějších kulových hvězdokup.',
      'M 13 je koule stovek tisíc hvězd vzdálená 25 000 světelných let, široká asi 145 světelných let.',
      'Hubble se dívá přímo do přeplněného středu hvězdokupy.', [('H', 'potw1011a', 'Střed hvězdokupy (Hubble)')], ['H:potw1011a'], vid=0),
    N('m22', 'Kulová hvězdokupa M 22', 'Messier 22 · NGC 6656', 'NGC6656', 'kulova', 'kulová hvězdokupa', 10000,
      'Blízká kulová hvězdokupa ve Střelci.',
      'M 22 je hustě nahloučená skupina velmi starých hvězd asi 10 000 světelných let daleko. Kulové hvězdokupy jsou pozůstatky z raných dob vesmíru, staré obvykle 12 až 13 miliard let. V M 22 astronomové našli i šest těles velikosti planet, která neobíhají žádnou hvězdu.',
      'Hubble ukazuje střed hvězdokupy, dalekohled VISTA celou hvězdokupu v infračerveném světle.',
      [('H', 'potw1514a', 'Střed hvězdokupy (Hubble)'), ('E', 'eso2413d', 'V infračerveném světle (dalekohled VISTA)')], ['H:potw1514a', 'E:eso2413d'], vid=1, mag=False),
    N('m4', 'Kulová hvězdokupa M 4', 'Messier 4 · NGC 6121', 'NGC6121', 'kulova', 'kulová hvězdokupa', 7000,
      'Jedna z nejbližších kulových hvězdokup, hned vedle hvězdy Antares.',
      'M 4 je hustý shluk několika set tisíc hvězd asi 7 000 světelných let daleko. Astronomové mají podezření, že se v jejím středu skrývá černá díra střední hmotnosti, až 800krát těžší než Slunce.',
      None, [('H', 'potw1236a', 'Hvězdokupa M 4 (Hubble)')], ['H:potw1236a'], vid=1),
    N('m15', 'Kulová hvězdokupa M 15', 'Messier 15 · NGC 7078', 'NGC7078', 'kulova', 'kulová hvězdokupa', 35000,
      'Jedna z nejstarších a nejhustších kulových hvězdokup.',
      'M 15 leží asi 35 000 světelných let daleko v souhvězdí Pegasa a je stará kolem 12 miliard let. Většina její hmoty je soustředěná ve středu. Byla první hvězdokupou, ve které se našla planetární mlhovina.',
      None, [('H', 'heic1321a', 'Hvězdokupa M 15 (Hubble)')], ['H:heic1321a'], vid=0),
    N('n6752', 'Kulová hvězdokupa NGC 6752', 'NGC 6752', 'NGC6752', 'kulova', 'kulová hvězdokupa', 14000,
      'Jasná kulová hvězdokupa jižní oblohy v souhvězdí Páva.',
      'NGC 6752 leží asi 14 000 světelných let daleko. Pozorování dalekohledem VLT v ní překvapivě ukázala, že mnohé hvězdy na konci života neztrácejí hmotu tak, jak se čekalo.',
      None, [('E', 'eso1323a', 'Hvězdokupa NGC 6752 (ESO, La Silla)')], ['E:eso1323a'], vid=1),
    N('n6397', 'Kulová hvězdokupa NGC 6397', 'NGC 6397', 'NGC6397', 'kulova', 'kulová hvězdokupa', 8000, lytxt='asi 7 000 sv. l. (ESO) až 9 000 sv. l. (Hubble)',
      lead='Jedna z nejbližších kulových hvězdokup, v souhvězdí Oltáře.',
      txt='NGC 6397 je od nás jen 7 000 až 9 000 světelných let. Je domovem neobvyklé dvojice: rychle rotujícího pulzaru a nafouknuté červené hvězdy.',
      foto='Snímek ESO ukazuje celou hvězdokupu, Hubble její střed.',
      imgs=[('E', 'eso0425a', 'Celá hvězdokupa (ESO, La Silla)'), ('H', 'heic0608b', 'Střed hvězdokupy (Hubble)')], zdroj=['E:eso0425a', 'H:heic0608b'], vid=1),
    N('hyady', 'Hyády', 'Melotte 25 · Caldwell 41', 'C041', 'otevrena', 'otevřená hvězdokupa', 150,
      'Nejbližší hvězdokupa vůbec: tvoří „hlavu“ souhvězdí Býka.',
      'Hyády jsou od nás jen asi 150 světelných let. V atmosférách dvou jejich vyhaslých hvězd, bílých trpaslíků, našli astronomové stopy kamenných úlomků – známku, že kolem nich mohly obíhat planety podobné Zemi.',
      None, [('H', 'heic1309c', 'Hyády ze Země (pozemní snímek)')], ['H:heic1309c'], vid=0, kruh=2.7, nase='Na naší fotce nejsou jednotlivé hvězdy Hyád rozeznat; kroužek ukazuje, kde hvězdokupa leží.'),
    N('m35', 'Hvězdokupa M 35', 'Messier 35 · NGC 2168', 'NGC2168', 'otevrena', 'otevřená hvězdokupa', 2700,
      'Hvězdokupa v Blížencích, na obloze velká asi jako Měsíc v úplňku.',
      'M 35 leží asi 2 700 světelných let daleko a je rozptýlená v oblasti široké 24 světelných let. Převládají v ní mladé horké modré hvězdy. Hned vedle ní je na obloze mnohem hustší a starší hvězdokupa NGC 2158.',
      None, [('E', 'b10', 'M 35 a vedle ní NGC 2158 (ESO)')], ['E:b10'], vid=1, mag=False),
    N('klenotnice', 'Klenotnice', 'NGC 4755 · κ Crucis', 'NGC4755', 'otevrena', 'otevřená hvězdokupa', 6500,
      'Barevná hvězdokupa hned u Jižního kříže a Uhelného pytle.',
      'Klenotnice leží asi 6 500 světelných let daleko. Její hvězdy se velmi liší jasností: ty nejjasnější mají 15 až 20krát větší hmotnost než Slunce, ty nejslabší méně než polovinu.',
      'Dalekohledu VLT stačily na tento snímek expozice kolem dvou sekund. Hubble ukazuje střed hvězdokupy.',
      [('E', 'eso0940a', 'Klenotnice (dalekohled VLT)'), ('H', 'heic0913a', 'Střed hvězdokupy (Hubble)')], ['E:eso0940a', 'H:heic0913a'], vid=0, mag=False),
    N('n3532', 'Hvězdokupa NGC 3532', 'NGC 3532', 'NGC3532', 'otevrena', 'otevřená hvězdokupa', 1300,
      'Jasná a barevná hvězdokupa jižní Mléčné dráhy.',
      'NGC 3532 leží asi 1 300 světelných let daleko. Některé její hvězdy ještě září horkou namodralou barvou, ale mnohé z těch hmotnějších už se staly červenými obry a svítí sytě oranžově.',
      None, [('E', 'eso1439a', 'Hvězdokupa NGC 3532 (ESO, La Silla)')], ['E:eso1439a'], vid=2, kruh=0.4),
    N('n3603', 'Hvězdokupa NGC 3603', 'NGC 3603', 'NGC3603', 'otevrena', 'mladá hmotná hvězdokupa v mlhovině', 20000, lytxt='asi 20 000 sv. l. (Hubble); ESO uvádí 22 000',
      lead='Jedna z nejhmotnějších mladých hvězdokup v naší Galaxii.',
      txt='Hvězdokupa NGC 3603 vznikla při prudké vlně zrodu hvězd asi před milionem let. Horké modré hvězdy v jejím středu vyhloubily do okolního plynu obrovskou dutinu.',
      foto='Hubble ukazuje hvězdokupu a dutinu kolem ní, snímek ESO širší okolí.',
      imgs=[('H', 'heic0715a', 'Hvězdokupa a okolní plyn (Hubble)'), ('E', 'eso1005a', 'Širší okolí (dalekohled VLT)')], zdroj=['H:heic0715a', 'E:eso1005a'], vid=1, mag=False, kruh=0.25),
    N('wd2', 'Hvězdokupa Westerlund 2', 'Westerlund 2 · Gum 29', None, 'otevrena', 'mladá hmotná hvězdokupa v mlhovině', 20000,
      'Mladá hvězdokupa, kterou si Hubble vybral pro snímek ke svým 25. narozeninám.',
      'Westerlund 2 leží asi 20 000 světelných let daleko v souhvězdí Lodního kýlu, uprostřed mlhoviny, ze které vznikla.',
      'Výroční snímek skládá viditelné a infračervené světlo: hvězdokupa je uprostřed, kolem ní sloupy a stěny plynu.',
      [('H', 'heic1509a', 'Snímek k 25. výročí Hubblu')], ['H:heic1509a'], ra=156.0271, de=-57.7634, konst='Car', kruh=0.25, vel=False, vid=1,
      possrc=('ESA/Hubble: poloha středu snímku heic1509a', 'https://esahubble.org/images/heic1509a/')),
]

# ---------- objekty přidané ve verzi 2.0 (zdroj = stránky snímků a tiskové zprávy, ze kterých je vzdálenost a údaje v textu) ----------
def hms(t):
    a, b, c = [float(x) for x in t.split()]
    return (a + b / 60 + c / 3600) * 15


def dms(t):
    sg = -1 if t.strip().startswith('-') else 1
    a, b, c = [float(x) for x in t.strip().lstrip('+-').split()]
    return sg * (a + b / 60 + c / 3600)


O += [
    # --- zářící mlhoviny
    N2('m78', 'Mlhovina M 78', 'M 78 · NGC 2068', 'NGC2068', 'mlhovina', 'odrazná mlhovina', 1400,
       'Namodralá mlhovina v Orionu, která sama nesvítí.',
       'M 78 je odrazná mlhovina: oblak prachu, který nezáří vlastním světlem, jen odráží světlo blízkých hvězd. Leží asi 1 400 světelných let od nás.',
       [('E', 'eso1105a', 'Mlhovina M 78 (ESO, La Silla)')], ['E:eso1105a'], foto='Snímek pořídila širokoúhlá kamera na 2,2metrovém dalekohledu observatoře La Silla v Chile.'),
    N2('n1999', 'Mlhovina NGC 1999', 'NGC 1999', 'NGC1999', 'mlhovina', 'odrazná mlhovina', 1500,
       'Malá odrazná mlhovina v Orionu.',
       'NGC 1999 leží asi 1 500 světelných let daleko. Hubbleův dalekohled ji vyfotil jen pár týdnů poté, co ho astronauti v prosinci 1999 opravili.',
       [('H', 'opo0010a', 'Mlhovina NGC 1999 (Hubble)')], ['H:opo0010a']),
    N2('n3324', 'Mlhovina NGC 3324 (Kosmické útesy)', 'NGC 3324', 'NGC3324', 'mlhovina', 'zářící mlhovina, hvězdná porodnice', 7500, lytxt='asi 7 500 sv. l. (ESO); ESA/Webb uvádí 7 600',
       lead='Hvězdná porodnice v souhvězdí Lodního kýlu.',
       txt='Záření několika hmotných modrobílých hvězd vyhloubilo v okolním plynu a prachu dutinu a jejich ultrafialové světlo plyn rozsvěcuje. Okraj této dutiny ukazuje snímek dalekohledu Jamese Webba nazvaný „Kosmické útesy“.',
       imgs=[('W', 'weic2205a', '„Kosmické útesy“ v infračerveném světle (Webb)'), ('E', 'eso1207a', 'Celá mlhovina (ESO, La Silla)')], zdroj=['E:eso1207a', 'W:weic2205a']),
    N2('cra', 'Mlhovina NGC 6729', 'NGC 6729', 'NGC6729', 'mlhovina', 'oblast zrodu hvězd', 400,
       'Blízká hvězdná porodnice v souhvězdí Jižní koruny.',
       'Mladé hvězdy tu samy vidět nejsou, skrývá je prach. Hmota, kterou vyvrhují, ale naráží do okolního plynu rychlostí až milion kilometrů za hodinu.',
       [('E', 'eso1109a', 'Detail hvězdné porodnice (dalekohled VLT)')], ['E:eso1109a'], kruh=0.3),
    N2('n1333', 'Mlhovina NGC 1333', 'NGC 1333', 'NGC1333', 'mlhovina', 'oblast zrodu hvězd', 960,
       'Blízká hvězdná porodnice v Perseovi.',
       'NGC 1333 je součástí velkého molekulového mračna v Perseovi. Hubbleův dalekohled ji vyfotil ke 33. výročí svého startu; snímek skládá světlo od ultrafialového po blízké infračervené.',
       [('H', 'heic2304a', 'Snímek k 33. výročí (Hubble)'), ('W', 'potm2408a', 'V infračerveném světle (Webb)')], ['H:heic2304a', 'W:potm2408a'], kruh=0.2),
    N2('n604', 'Mlhovina NGC 604', 'NGC 604', 'NGC0604', 'mlhovina', 'obří hvězdná porodnice v sousední galaxii', 2730000, lytxt='2,73 milionu sv. l. (ESA/Webb, text); pole „Distance“ téže stránky uvádí zaokrouhleně 3 miliony',
       lead='Obří oblak plynu, ve kterém se rodí hvězdy. Neleží v Mléčné dráze, ale v sousední galaxii M 33.',
       txt='NGC 604 je obrovská oblast zrodu hvězd v galaxii v Trojúhelníku, 2,73 milionu světelných let od nás. Dalekohled Jamese Webba ji vyfotil v blízkém i ve středním infračerveném světle.',
       imgs=[('W', 'weic2407a', 'V blízkém infračerveném světle (Webb)')], zdroj=['W:weic2407a', 'H:heic1901b']),
    N2('reef', 'Mlhoviny NGC 2014 a NGC 2020', 'NGC 2014 · NGC 2020', 'NGC2014', 'mlhovina', 'hvězdná porodnice v sousední galaxii', 163000, lytxt='asi 163 000 sv. l. (ESA/Hubble); ESO uvádí 160 000',
       lead='Dvojice mlhovin ve Velkém Magellanově mračnu.',
       txt='Obří mlhovina NGC 2014 a její sousedka NGC 2020 jsou součástí rozsáhlé hvězdné porodnice v sousední galaxii. Podle ESA patří k nejfotogeničtějším porodnicím hvězd, jaké Hubbleův dalekohled za 30 let vyfotil.',
       imgs=[('H', 'heic2007a', 'Obě mlhoviny (Hubble)')], zdroj=['H:heic2007a', 'E:eso1335a']),
    N2('n2174', 'Mlhovina Opičí hlava', 'NGC 2174', 'NGC2174', 'mlhovina', 'zářící mlhovina, hvězdná porodnice', 6400, lytxt='asi 6 400 sv. l. (ESA/Hubble, text); pole „Distance“ téže stránky uvádí 6 500',
       lead='Hvězdná porodnice v Orionu, které se říká Opičí hlava.',
       txt='Oblast je plná mladých hvězd zabalených do zářícího plynu a prachu. Hubbleův dalekohled vyfotil její část ke 24. výročí svého pobytu na oběžné dráze.',
       imgs=[('H', 'heic1406a', 'Část mlhoviny v infračerveném světle (Hubble)')], zdroj=['H:heic1406a'], vel=False, kruh=0.3),
    N2('n2467', 'Mlhovina NGC 2467', 'NGC 2467', 'NGC2467', 'mlhovina', 'zářící mlhovina, hvězdná porodnice', 13000,
       'Velmi činná hvězdná porodnice v souhvězdí Lodní zádě.',
       'Oblast je stará nejvýš několik milionů let a hvězdy se v ní z velkých oblaků plynu a prachu rodí dál. Někomu připomíná barevného ducha, jinému hlavu mandrila.',
       [('E', 'eso0544a', 'Mlhovina a okolí (ESO, La Silla)'), ('H', 'heic1012a', 'Detail (Hubble)')], ['E:eso0544a', 'H:heic1012a'], kruh=0.25),
    N2('n6188', 'Mlhovina NGC 6188 a hvězdokupa NGC 6193', 'NGC 6188 · NGC 6193', 'NGC6188', 'mlhovina', 'zářící mlhovina s mladou hvězdokupou', 4000,
       'Mlhovina v souhvězdí Oltáře, kterou rozsvěcuje sousední hvězdokupa.',
       'Mlhovinu NGC 6188 rozzářilo záření nejjasnějších hvězd mladé hvězdokupy NGC 6193, která leží hned vedle. Obě patří k velké skupině mladých hvězd zvané Ara OB1.',
       [('E', 'eso1510a', 'Hvězdokupa a mlhovina (dalekohled VST)')], ['E:eso1510a', 'EN:eso1510'], vel=False, kruh=0.4),
    # --- temné mlhoviny
    N2('b68', 'Barnard 68', 'Barnard 68', None, 'temna', 'temná mlhovina (Bokova globule)', 500,
       'Malý oblak prachu, který vypadá jako díra v hvězdném poli.',
       'Barnard 68 je takzvaná Bokova globule. Je tak neprůhledná, že viditelné světlo hvězd za ní vůbec nepropustí. Hvězdy prosvítají jen v infračerveném světle, a proto jsou na složeném snímku červené.',
       [('E', 'eso0102b', 'Ve viditelném a infračerveném světle (ESO)')], ['E:eso0102b'],
       ra=hms('17 22 38.25'), de=dms('-23 49 34.4'), konst='Oph', possrc=('ESO: poloha středu snímku eso0102b', 'https://www.eso.org/public/images/eso0102b/'), kruh=0.15),
    N2('lupus3', 'Temné mračno Lupus 3', 'Lupus 3', None, 'temna', 'temná mlhovina, hvězdná porodnice', 600,
       'Tmavý oblak, ve kterém vznikají hvězdy, a vedle něj hvězdy, které se z něj už vynořily.',
       'Lupus 3 leží asi 600 světelných let od nás. Je pravděpodobné, že v podobné hvězdné porodnici se před více než čtyřmi miliardami let zrodilo i Slunce.',
       [('E', 'eso1303a', 'Temný oblak a mladé hvězdy (ESO, La Silla)')], ['E:eso1303a'],
       ra=hms('16 9 36.08'), de=dms('-39 2 59.2'), konst='Sco', possrc=('ESO: poloha středu snímku eso1303a', 'https://www.eso.org/public/images/eso1303a/'), kruh=0.4),
    # --- umírající hvězdy a jejich pozůstatky
    N2('n6888', 'Mlhovina Srpek', 'NGC 6888', 'NGC6888', 'zanik', 'obálka kolem Wolfovy–Rayetovy hvězdy', 4500,
       'Obálka plynu, kterou kolem sebe rozfoukala umírající hmotná hvězda.',
       'Hvězda WR 136 odhodila před 250 000 lety své vnější vrstvy a teď je silným hvězdným větrem trhá. Patří mezi Wolfovy–Rayetovy hvězdy: mimořádně horké, vzácné a krátce žijící.',
       [('H', 'opo0023a', 'Část mlhoviny (Hubble)')], ['H:opo0023a'], vel=False, kruh=0.17),
    N2('eskymak', 'Mlhovina Eskymák', 'NGC 2392', 'NGC2392', 'zanik', 'planetární mlhovina', 5000,
       'Zářící zbytky umírající hvězdy podobné Slunci.',
       'Planetární mlhovina v Blížencích: složitá stavba slupek a proudů plynu kolem dožívající hvězdy. Byl to jeden z prvních snímků, které Hubbleův dalekohled pořídil po opravě v prosinci 1999.',
       [('H', 'heic9910a', 'Mlhovina Eskymák (Hubble)')], ['H:heic9910a', 'HN:heic9910'], lysrc=1),
    N2('saturn_n', 'Mlhovina Saturn', 'NGC 7009', 'NGC7009', 'zanik', 'planetární mlhovina', 5000, lytxt='asi 5 000 sv. l. (ESO, 2017); starší údaj ESA/Hubble je 2 300',
       lead='Planetární mlhovina v souhvězdí Vodnáře.',
       txt='Mlhovina Saturn vypadá jako řada podivně tvarovaných bublin. Přístroj MUSE na dalekohledu VLT u ní poprvé zmapoval, kde uvnitř planetární mlhoviny leží prach.',
       imgs=[('E', 'eso1731a', 'Mlhovina Saturn (dalekohled VLT, přístroj MUSE)')], zdroj=['E:eso1731a', 'EN:eso1731', 'H:opo9738g'], lysrc=1),
    N2('ic418', 'Mlhovina Spirograf', 'IC 418', 'IC0418', 'zanik', 'planetární mlhovina', 2000,
       'Planetární mlhovina v souhvězdí Zajíce s jemnou kresbou.',
       'Hubbleův dalekohled v mlhovině odhalil jemné vzory, které připomínají obrazce ze spirografu. Jak vznikly, zatím není jisté.',
       [('H', 'opo0028a', 'Mlhovina Spirograf (Hubble)')], ['H:opo0028a']),
    N2('m76', 'Malá Činka', 'M 76 · NGC 650', 'NGC0650', 'zanik', 'planetární mlhovina', 3400,
       'Planetární mlhovina v Perseovi, oblíbený cíl amatérských astronomů.',
       'Název „planetární“ je zavádějící: s planetami nemá nic společného. Je to plyn odvržený dožívající hvězdou. Hubbleův dalekohled Malou Činku vyfotil ke 34. výročí svého startu.',
       [('H', 'heic2408a', 'Malá Činka (Hubble)')], ['H:heic2408a']),
    N2('casa', 'Cassiopeia A', 'Cas A', None, 'zanik', 'pozůstatek supernovy', 11000, lytxt='asi 11 000 sv. l. (ESA/Hubble); ESA/Webb uvádí 11 090',
       lead='Rozpínající se trosky hvězdy, která vybuchla jako supernova.',
       txt='Cassiopeia A je pozůstatek po výbuchu hmotné hvězdy v souhvězdí Kasiopeji. Barevná vlákna na snímcích jsou plyn, který hvězda při výbuchu rozmetala do okolí.',
       imgs=[('W', 'weic2330a', 'V blízkém infračerveném světle (Webb)'), ('H', 'heic0609a', 'Ve viditelném světle (Hubble)')], zdroj=['H:heic0609a', 'W:weic2330a'],
       ra=hms('23 23 26.10'), de=dms('58 48 53.5'), konst='Cas', possrc=('ESA/Hubble: poloha středu snímku heic0609a', 'https://esahubble.org/images/heic0609a/'), kruh=0.1),
    N2('vela', 'Pozůstatek supernovy v Plachtách', 'Vela SNR · mlhovina Tužka (NGC 2736)', None, 'zanik', 'pozůstatek supernovy', 800,
       'To, co zbylo po výbuchu hmotné hvězdy. Jeden z nejbližších pozůstatků supernov.',
       'Oranžová a růžová vlákna plynu jsou zbytky hvězdy, která vybuchla asi před 11 000 lety. Leží jen 800 světelných let od nás. Jeho malou částí je mlhovina Tužka.',
       [('E', 'eso2214a', 'Část pozůstatku (dalekohled VST, 554 milionů bodů)'), ('E', 'eso1236a', 'Mlhovina Tužka, NGC 2736 (ESO, La Silla)')], ['E:eso2214a', 'EN:eso2214', 'E:eso1236a'], lysrc=1,
       ra=hms('8 31 25.99'), de=dms('-43 59 12.3'), konst='Vel', possrc=('ESO: poloha středu snímku eso2214a', 'https://www.eso.org/public/images/eso2214a/'), kruh=2.0),
    N2('jprstenec', 'Jižní prstencová mlhovina', 'NGC 3132', 'NGC3132', 'zanik', 'planetární mlhovina', 2500, lytxt='asi 2 500 sv. l. (ESA/Webb); ESA/Hubble uvádí 2 000',
       lead='Planetární mlhovina v souhvězdí Plachet.',
       txt='Prstenec plynu odvrhla umírající hvězda uprostřed. Dalekohled Jamese Webba mlhovinu vyfotil dvěma kamerami: v blízkém a ve středním infračerveném světle.',
       imgs=[('W', 'weic2207a', 'Dvěma kamerami vedle sebe (Webb)'), ('H', 'opo9839a', 'Ve viditelném světle (Hubble)')], zdroj=['W:weic2207a', 'WN:weic2207', 'H:opo9839a'], lysrc=1),
    N2('meduza', 'Mlhovina Medúza', 'Abell 21 · Sharpless 2-274', None, 'zanik', 'planetární mlhovina', 1500,
       'Barevný oblak plynu, který kolem sebe odhodila dožívající hvězda.',
       'Když hvězda uprostřed mlhoviny dožívala, odhodila své vnější vrstvy do prostoru. Podobně jednou skončí i Slunce.',
       [('E', 'eso1520a', 'Mlhovina Medúza (dalekohled VLT)')], ['E:eso1520a'],
       ra=hms('7 29 11.33'), de=dms('13 15 57.0'), konst='Gem', possrc=('ESO: poloha středu snímku eso1520a', 'https://www.eso.org/public/images/eso1520a/'), kruh=0.1),
    N2('sn1987a', 'Supernova 1987A', 'SN 1987A', None, 'zanik', 'pozůstatek supernovy v sousední galaxii', 170000, lytxt='asi 170 000 sv. l. (ESA/Hubble); ESA/Webb uvádí 168 000',
       lead='Hvězda ve Velkém Magellanově mračnu, jejíž výbuch lidé spatřili 23. února 1987.',
       txt='Byla to jedna z nejjasnějších supernov od vynálezu dalekohledu před více než 400 lety. Hubbleův dalekohled ji sleduje od svého startu v roce 1990.',
       imgs=[('H', 'potw1142a', 'Okolí supernovy (Hubble)'), ('W', 'SN1987a-1', 'V infračerveném světle (Webb)')], zdroj=['H:potw1142a', 'W:SN1987a-1'],
       ra=hms('5 35 27.61'), de=dms('-69 16 7.9'), konst='Dor', possrc=('ESA/Hubble: poloha středu snímku potw1142a', 'https://esahubble.org/images/potw1142a/'), kruh=0.1),
    # --- galaxie a kupy galaxií
    N2('m101', 'Galaxie Větrník', 'M 101 · NGC 5457', 'NGC5457', 'galaxie', 'spirální galaxie', 23000000,
       'Velká spirální galaxie ve Velké medvědici, kterou vidíme shora.',
       'Větrník je jedním z nejznámějších příkladů galaxie s výraznými, pravidelnými spirálními rameny. Hubbleův snímek byl v době zveřejnění největším a nejpodrobnějším snímkem spirální galaxie, jaký dalekohled pořídil.',
       [('H', 'heic0602a', 'Celá galaxie (Hubble)')], ['H:heic0602a']),
    N2('m74', 'Galaxie Fantom', 'M 74 · NGC 628', 'NGC0628', 'galaxie', 'spirální galaxie', 32000000, lytxt='asi 32 milionů sv. l. (ESA/Webb); starší údaj ESA/Hubble je 25 milionů',
       lead='Spirální galaxie v Rybách, natočená k nám skoro přesně čelem.',
       txt='Díky tomu, že ji vidíme shora, jsou dobře vidět její spirální ramena. Růžové skvrny v nich jsou velké oblasti, kde vznikají nové hvězdy.',
       imgs=[('W', 'potm2208a', 'Střed galaxie v infračerveném světle (Webb)'), ('H', 'heic0719a', 'Ve viditelném světle (Hubble)')], zdroj=['W:potm2208a', 'H:heic0719a']),
    N2('m77', 'Galaxie M 77', 'M 77 · NGC 1068', 'NGC1068', 'galaxie', 'spirální galaxie s příčkou a aktivním jádrem', 45000000,
       'Spirální galaxie ve Velrybě, natočená k nám čelem.',
       'Na snímku vypadá klidně: třpytivá ramena protkaná pruhy prachu. Podle ESO ale snímek nic neprozradí o tom, jak bouřlivá galaxie ve skutečnosti je.',
       [('E', 'eso1720a', 'Galaxie M 77 (dalekohled VLT)')], ['E:eso1720a']),
    N2('m106', 'Galaxie M 106', 'M 106 · NGC 4258', 'NGC4258', 'galaxie', 'spirální galaxie', 23000000, lytxt='asi 23 milionů sv. l. (ESA/Webb); ESA/Hubble uvádí něco přes 20 milionů',
       lead='Poměrně blízká spirální galaxie v Honicích psech.',
       txt='Hubbleův snímek vznikl ve spolupráci s astronomy amatéry: Robert Gendler a Jay GaBany doplnili data dalekohledu vlastními pozorováními.',
       imgs=[('H', 'heic1302a', 'Galaxie M 106 (Hubble a amatérské snímky)'), ('W', 'potm2407a', 'Střed galaxie v infračerveném světle (Webb)')], zdroj=['W:potm2407a', 'H:heic1302a']),
    N2('lev3', 'Trojice galaxií ve Lvu', 'M 65 · M 66 · NGC 3628', None, 'galaxie', 'skupina tří spirálních galaxií', 35000000,
       'Tři jasné galaxie blízko sebe v souhvězdí Lva.',
       'Galaxie M 65, M 66 a NGC 3628 leží asi 35 milionů světelných let daleko. Největší z nich, M 66, vyfotil zblízka Hubbleův dalekohled.',
       [('E', 'eso1126a', 'Celá trojice (dalekohled VST)'), ('H', 'heic1006a', 'Galaxie M 66 (Hubble)')], ['E:eso1126a', 'H:heic1006a'],
       ra=hms('11 19 43.51'), de=dms('13 18 36.8'), konst='Leo', possrc=('ESO: poloha středu snímku eso1126a', 'https://www.eso.org/public/images/eso1126a/'), kruh=0.45),
    N2('n1365', 'Galaxie NGC 1365', 'NGC 1365', 'NGC1365', 'galaxie', 'spirální galaxie s příčkou', 60000000, lytxt='asi 60 milionů sv. l. (ESO); ESA/Webb uvádí 56 milionů',
       lead='Nápadná spirální galaxie s příčkou, člen kupy galaxií v Peci.',
       txt='Je to spirální galaxie s příčkou: středem jí prochází pás hvězd. Snímek pořídila infračervená kamera HAWK-I na dalekohledu VLT.',
       imgs=[('E', 'eso1038a', 'V infračerveném světle (dalekohled VLT)')], zdroj=['E:eso1038a', 'W:weic2306e']),
    N2('n300', 'Galaxie NGC 300', 'NGC 300', 'NGC0300', 'galaxie', 'spirální galaxie', 6000000,
       'Blízká spirální galaxie v souhvězdí Sochaře.',
       'Snímek vznikl z mnoha expozic pořízených během několika let. Astronomové díky nim sestavili neobvykle důkladný soupis hvězd v galaxii.',
       [('E', 'eso1037a', 'Galaxie NGC 300 (ESO, La Silla)')], ['E:eso1037a']),
    N2('n6744', 'Galaxie NGC 6744', 'NGC 6744', 'NGC6744', 'galaxie', 'spirální galaxie', 30000000,
       'Velká spirální galaxie, která se podobá naší Mléčné dráze.',
       'Kdybychom mohli Mléčnou dráhu vyfotit zvenčí, vypadala by nejspíš podobně. Snímek NGC 6744 proto působí jako pohlednice naší Galaxie poslaná z dálky.',
       [('E', 'eso1118a', 'Galaxie NGC 6744 (ESO, La Silla)')], ['E:eso1118a']),
    N2('n4565', 'Galaxie Jehla', 'NGC 4565', 'NGC4565', 'galaxie', 'spirální galaxie viděná z boku', 30000000,
       'Jedna z nejznámějších spirálních galaxií, které vidíme přesně z boku.',
       'Z boku vypadá galaxie jako tenká jehla se žlutavou výdutí uprostřed. Objevil ji roku 1785 William Herschel, objevitel Uranu.',
       [('E', 'eso0525a', 'Galaxie Jehla (dalekohled VLT)')], ['E:eso0525a']),
    N2('m63', 'Galaxie Slunečnice', 'M 63 · NGC 5055', 'NGC5055', 'galaxie', 'spirální galaxie', 35000000,
       'Spirální galaxie v Honicích psech, jejíž ramena připomínají květ slunečnice.',
       'Přezdívku dostala podle uspořádání spirálních ramen. Objevil ji roku 1779 Pierre Méchain a Charles Messier ji zařadil do svého katalogu jako 63. položku.',
       [('H', 'potw1536a', 'Galaxie Slunečnice (Hubble)')], ['H:potw1536a']),
    N2('m64', 'Galaxie Černé oko', 'M 64 · NGC 4826', 'NGC4826', 'galaxie', 'spirální galaxie', 18000000,
       'Galaxie s nápadným tmavým pásem prachu před jasným jádrem.',
       'Tmavý pás jí dal přezdívku Černé oko. Galaxie vznikla srážkou dvou galaxií; zůstal po ní nejen neobvyklý vzhled, ale i podivné pohyby uvnitř.',
       [('H', 'opo0404a', 'Střed galaxie (Hubble)')], ['H:opo0404a']),
    N2('kolo', 'Galaxie Kolo od vozu', 'Cartwheel · ESO 350-40', None, 'galaxie', 'prstencová galaxie', 500000000,
       'Vzácná galaxie ve tvaru kola v souhvězdí Sochaře.',
       'Galaxie leží asi 500 milionů světelných let daleko. Dalekohled Jamese Webba ji vyfotil dvěma kamerami najednou, v blízkém a ve středním infračerveném světle.',
       [('W', 'weic2211a', 'Kolo od vozu a dvě sousední galaxie (Webb)')], ['W:weic2211a', 'WN:weic2211'], lysrc=1,
       ra=hms('0 37 41.57'), de=dms('-33 42 47.0'), konst='Scl', possrc=('ESA/Webb: poloha středu snímku weic2211a', 'https://esawebb.org/images/weic2211a/'), kruh=0.1),
    N2('fornax', 'Kupa galaxií v Peci', 'Fornax Cluster', None, 'galaxie', 'kupa galaxií', 65000000,
       'Jedna z nejbližších kup galaxií za naší Místní skupinou.',
       'Kupy galaxií obsahují sto až tisíc galaxií a měří 5 až 30 milionů světelných let. Na snímku je vpravo dole spirální galaxie NGC 1365 a vlevo velká eliptická galaxie NGC 1399.',
       [('E', 'eso1612a', 'Střed kupy (dalekohled VST)')], ['E:eso1612a', 'EN:eso1612'], lysrc=1,
       ra=hms('3 35 31.23'), de=dms('-35 34 32.0'), konst='For', possrc=('ESO: poloha středu snímku eso1612a', 'https://www.eso.org/public/images/eso1612a/'), kruh=1.0),
    N2('coma', 'Kupa galaxií ve Vlasech Bereniky', 'Coma Cluster', None, 'galaxie', 'kupa galaxií', 300000000,
       'Obří kupa s tisíci galaxií.',
       'Celá kupa má tvar koule o průměru přes 20 milionů světelných let. Většina galaxií v jejím středu je eliptických: na snímku vypadají jako beztvaré zlatohnědé chomáče.',
       [('H', 'heic0813a', 'Část kupy (Hubble)')], ['H:heic0813a'],
       ra=hms('13 0 28.45'), de=dms('28 2 39.9'), konst='Com', possrc=('ESA/Hubble: poloha středu snímku heic0813a', 'https://esahubble.org/images/heic0813a/'), kruh=0.8),
    N2('pandora', 'Pandořina kupa', 'Abell 2744', None, 'galaxie', 'kupa galaxií', 3000000000,
       'Vzdálená obří kupa galaxií v souhvězdí Sochaře.',
       'Světlo z Pandořiny kupy k nám letí miliardy let. Dalekohled Jamese Webba ji vyfotil v infračerveném světle.',
       [('W', 'weic2305a', 'Pandořina kupa (Webb)')], ['W:weic2305a'],
       ra=hms('0 14 18.28'), de=dms('-30 22 44.5'), konst='Scl', possrc=('ESA/Webb: poloha středu snímku weic2305a', 'https://esawebb.org/images/weic2305a/'), kruh=0.1),
    N2('smacs', 'První hluboké pole dalekohledu Webb', 'SMACS 0723', None, 'galaxie', 'kupa galaxií a gravitační čočka', 4600000000, lytxt='kupu vidíme takovou, jaká byla před 4,6 miliardy let (ESA/Webb)',
       lead='Nejhlubší snímek vesmíru, jaký byl do té doby pořízen (rok 2022).',
       txt='Snímek ukazuje kupu galaxií SMACS 0723, jak vypadala před 4,6 miliardy let. Její hmotnost působí jako gravitační čočka: zvětšuje a deformuje ještě vzdálenější galaxie za ní. Některé z nich vidíme z doby, kdy byl vesmír mladší než miliarda let.',
       imgs=[('W', 'weic2209a', 'První hluboké pole (Webb)')], zdroj=['WN:weic2209', 'W:weic2209a'],
       ra=hms('7 23 8.56'), de=dms('-73 26 59.2'), konst='Vol', possrc=('ESA/Webb: poloha středu snímku weic2209a', 'https://esawebb.org/images/weic2209a/'), kruh=0.1),
    N2('q3c273', 'Kvasar 3C 273', '3C 273', None, 'galaxie', 'kvasar: zářivé jádro vzdálené galaxie', 2500000000, lytxt='světlo k nám letělo asi 2,5 miliardy let (ESA/Hubble, text); pole „Distance“ téže stránky uvádí 2 miliardy',
       lead='Jeden z nejjasnějších kvasarů na obloze.',
       txt='Kvasar je mimořádně zářivé jádro galaxie. 3C 273 sídlí v obří eliptické galaxii v souhvězdí Panny a jeho světlo k nám letělo asi 2,5 miliardy let.',
       imgs=[('H', 'potw1346a', 'Kvasar 3C 273 (Hubble)')], zdroj=['H:potw1346a'],
       ra=hms('12 29 6.57'), de=dms('2 3 10.5'), konst='Vir', possrc=('ESA/Hubble: poloha středu snímku potw1346a', 'https://esahubble.org/images/potw1346a/'), kruh=0.1),
    # --- kulové hvězdokupy
    N2('m3', 'Hvězdokupa M 3', 'M 3 · NGC 5272', 'NGC5272', 'kulova', 'kulová hvězdokupa', 34000,
       'Podle mnohých jedna z nejkrásnějších kulových hvězdokup.',
       'M 3 obsahuje půl milionu hvězd a je stará asi osm miliard let.',
       [('H', 'potw1914a', 'Střed hvězdokupy (Hubble)')], ['H:potw1914a']),
    N2('m5', 'Hvězdokupa M 5', 'M 5 · NGC 5904', 'NGC5904', 'kulova', 'kulová hvězdokupa', 25000,
       'Jedna z nejstarších kulových hvězdokup Mléčné dráhy.',
       'Většina hvězd v M 5 vznikla před více než 12 miliardami let. Hubbleův dalekohled v ní přesto našel i hvězdy, které vypadají nečekaně mladě.',
       [('H', 'potw1118a', 'Střed hvězdokupy (Hubble)')], ['H:potw1118a']),
    N2('m92', 'Hvězdokupa M 92', 'M 92 · NGC 6341', 'NGC6341', 'kulova', 'kulová hvězdokupa', 27000, lytxt='asi 27 000 sv. l. (ESA/Webb); ESA/Hubble uvádí 25 000',
       lead='Kulová hvězdokupa v Herkulovi.',
       txt='V M 92 je asi 300 000 hvězd namačkaných v kouli o průměru kolem 100 světelných let.',
       imgs=[('H', 'potw1449a', 'Střed hvězdokupy (Hubble)')], zdroj=['W:m92a', 'H:potw1449a']),
    N2('m54', 'Hvězdokupa M 54', 'M 54 · NGC 6715', 'NGC6715', 'kulova', 'kulová hvězdokupa v sousední galaxii', 90000,
       'Kulová hvězdokupa, která nepatří k Mléčné dráze.',
       'Vypadá jako mnoho jiných kulových hvězdokup, ale má tajemství: je součástí malé sousední galaxie, trpasličí galaxie ve Střelci.',
       [('E', 'eso1428a', 'Hvězdokupa M 54 (dalekohled VST)')], ['E:eso1428a']),
    N2('m55', 'Hvězdokupa M 55', 'M 55 · NGC 6809', 'NGC6809', 'kulova', 'kulová hvězdokupa', 17000,
       'Velká koule prastarých hvězd ve Střelci.',
       'Snímek je pořízený v infračerveném světle přehlídkovým dalekohledem VISTA na observatoři Paranal v Chile.',
       [('E', 'eso1220a', 'V infračerveném světle (dalekohled VISTA)')], ['E:eso1220a']),
    N2('n2808', 'Hvězdokupa NGC 2808', 'NGC 2808', 'NGC2808', 'kulova', 'kulová hvězdokupa', 30000,
       'Kulová hvězdokupa, ve které Hubbleův dalekohled našel tři generace hvězd.',
       'Astronomy to překvapilo: tři generace hvězd se neshodují s obrazem, který o kulových hvězdokupách do té doby měli.',
       [('H', 'heic0708a', 'Střed hvězdokupy (Hubble)')], ['H:heic0708a']),
    N2('terzan5', 'Hvězdokupa Terzan 5', 'Terzan 5', None, 'kulova', 'hvězdokupa ve středové výduti Galaxie', 19000,
       'Hvězdokupa ukrytá za hustými oblaky prachu směrem ke středu Galaxie.',
       'Čtyřicet let se považovala za obyčejnou kulovou hvězdokupu. Podle novějších výsledků je to spíš pozůstatek jednoho z prastarých stavebních kamenů středové výdutě Galaxie.',
       [('E', 'eso1630a', 'Hvězdokupa Terzan 5 (dalekohled VLT a Hubble)')], ['E:eso1630a', 'EN:eso1630'], lysrc=1,
       ra=hms('17 48 4.85'), de=dms('-24 46 55.5'), konst='Sgr', possrc=('ESO: poloha středu snímku eso1630a', 'https://www.eso.org/public/images/eso1630a/'), kruh=0.1),
    # --- otevřené hvězdokupy
    N2('m67', 'Hvězdokupa M 67', 'M 67 · NGC 2682', 'NGC2682', 'otevrena', 'stará otevřená hvězdokupa', 2500,
       'Stará otevřená hvězdokupa v souhvězdí Raka.',
       'Hvězdy v M 67 jsou přibližně stejně staré jako Slunce a mají i stejné chemické složení.',
       [('E', 'eso1402c', 'Hvězdokupa M 67 a okolí (Digitized Sky Survey 2)')], ['E:eso1402c']),
    N2('m47', 'Hvězdokupa M 47', 'M 47 · NGC 2422', 'NGC2422', 'otevrena', 'mladá otevřená hvězdokupa', 1600,
       'Mladá otevřená hvězdokupa s jasnými modrými hvězdami.',
       'Mezi modrými hvězdami září i několik červených obrů. Hvězdokupa je řídká: na ploše asi 12 světelných let je vidět jen kolem padesáti hvězd.',
       [('E', 'eso1441a', 'Hvězdokupa M 47 (ESO, La Silla)')], ['E:eso1441a', 'EN:eso1441'], lysrc=1),
    N2('n3766', 'Hvězdokupa NGC 3766', 'NGC 3766', 'NGC3766', 'otevrena', 'mladá otevřená hvězdokupa', 7000,
       'Skupina mladých hvězd v Kentauru.',
       'Pečlivá měření švýcarským dalekohledem na observatoři La Silla ukázala, že 36 hvězd této hvězdokupy patří k nové, dosud neznámé třídě proměnných hvězd.',
       [('E', 'eso1326a', 'Hvězdokupa NGC 3766 (ESO, La Silla)')], ['E:eso1326a']),
    N2('n6520', 'Hvězdokupa NGC 6520 a temný oblak Barnard 86', 'NGC 6520 · Barnard 86', 'NGC6520', 'otevrena', 'otevřená hvězdokupa a temná mlhovina', 6000,
       'Jasná hvězdokupa a hned vedle ní podivně tvarovaný temný oblak.',
       'Dvojice leží před nejjasnější částí Mléčné dráhy, kde je hvězd tolik, že mezi nimi skoro nezbývá tmavé nebe.',
       [('E', 'eso1307a', 'Hvězdokupa a temný oblak (ESO, La Silla)')], ['E:eso1307a']),
    N2('n3293', 'Hvězdokupa NGC 3293', 'NGC 3293', 'NGC3293', 'otevrena', 'mladá otevřená hvězdokupa', 8000,
       'Mladá hvězdokupa před oblaky zářícího plynu v Lodním kýlu.',
       'Ještě před deseti miliony let tu byl jen oblak plynu a prachu. Pak v něm začaly vznikat hvězdy a zbyla tato jasná skupina.',
       [('E', 'eso1422a', 'Hvězdokupa NGC 3293 (ESO, La Silla)')], ['E:eso1422a']),
    N2('arches', 'Hvězdokupa Arches', 'Arches Cluster', None, 'otevrena', 'hustá hvězdokupa mladých hmotných hvězd', 25000,
       'Hvězdokupa mladých, hmotných hvězd těsně u středu Galaxie.',
       'Na obloze leží jen asi pětinu stupně od středu Mléčné dráhy (vypočteno z polohy). Snímek je pořízený v infračerveném světle.',
       [('E', 'eso0921a', 'V infračerveném světle (dalekohled VLT)')], ['E:eso0921a'],
       ra=hms('17 45 50.52'), de=dms('-28 49 20.5'), konst='Sgr', possrc=('ESO: poloha středu snímku eso0921a', 'https://www.eso.org/public/images/eso0921a/'), kruh=0.05),
]

# ---------- hvězdy (verze 2.0) ----------
HVE = []


def HV(id, cs, ozn, hip, konst, typ, lead, txt, wiki, imgs=(), zdroj=(), **kw):
    """Hvězda: poloha, jasnost, spektrum a paralaxa se berou z katalogu Hipparcos podle čísla HIP; wiki = název hesla anglické Wikipedie."""
    HVE.append(dict(id=id, cs=cs, ozn=ozn, hip=hip, konst=konst, typ=typ, lead=lead, txt=txt, wiki=wiki, imgs=list(imgs), zdroj=list(zdroj), kw=kw))


# pořadí: 21 nejjasnějších hvězd noční oblohy podle jasnosti, potom další významné hvězdy
HV('sirius', 'Sirius', 'α Canis Majoris · HIP 32349', 32349, 'CMa', 'dvojhvězda: bílá hvězda a bílý trpaslík',
   'Nejjasnější hvězda noční oblohy. Září tolik hlavně proto, že je blízko: světlo od ní letí necelých devět let.',
   'Sirius je dvojhvězda. Kolem jasné bílé hvězdy Sirius A obíhá jednou za 50 let slabý průvodce Sirius B, bílý trpaslík; vzdálenost obou hvězd se při tom mění od 8 do 31 astronomických jednotek. Sirius se ke Sluneční soustavě pomalu blíží, takže bude v příštích 60 000 letech ještě o něco jasnější.',
   'Sirius', [('H', 'heic0516a', 'Sirius A a jeho průvodce Sirius B (Hubble)')], ['H:heic0516a'], iau='Sirius', magtxt='nejjasnější hvězda noční oblohy',
   foto='Na Hubbleově snímku je Sirius A záměrně přeexponovaný, aby byl vidět slabý Sirius B (tečka vlevo dole). Kříž a kroužky kolem hvězd nejsou skutečné, vytváří je dalekohled.')
HV('kanopus', 'Kanopus', 'α Carinae · Canopus · HIP 30438', 30438, 'Car', 'jasný obr',
   'Druhá nejjasnější hvězda noční oblohy. Patří jižní obloze.',
   'Kanopus je obří hvězda: svítí víc než 10 000krát silněji než Slunce, je asi 71krát větší a devětkrát až desetkrát hmotnější.',
   'Canopus', iau='Canopus', magtxt='2. nejjasnější hvězda noční oblohy', lypozn='Wikipedie uvádí kolem 310 sv. l.')
HV('alfacen', 'Alfa Centauri', 'α Centauri · Rigil Kentaurus a Toliman · HIP 71683', 71683, 'Cen', 'trojhvězda, nejbližší hvězdný systém',
   'Nejbližší hvězdy, které jsou vidět pouhým okem, a třetí nejjasnější „hvězda“ noční oblohy.',
   'Okem vypadá jako jedna hvězda, ve skutečnosti jsou to dvě hvězdy podobné Slunci: Rigil Kentaurus (A) a Toliman (B). Oběhnou se jednou za 79 let; nejblíž jsou si asi jako Saturn a Slunce, nejdál asi jako Pluto a Slunce. K systému patří i třetí hvězda, červený trpaslík Proxima Centauri, který je Slunci ze všech hvězd nejblíž.',
   'Alpha_Centauri', [('H', 'potw1635a', 'Alfa Centauri A a B (Hubble)')], ['H:potw1635a'], iau='Rigil Kentaurus',
   magtxt='jen složka A; obě hvězdy dohromady −0,27 mag (Wikipedie)')
HV('arktur', 'Arktur', 'α Boötis · Arcturus · HIP 69673', 69673, 'Boo', 'červený obr',
   'Nejjasnější hvězda severní poloviny oblohy a čtvrtá nejjasnější vůbec. Oranžový obr v souhvězdí Pastýře.',
   'Arktur je stárnoucí hvězda, asi 7 miliard let stará. Hmotností se podobá Slunci, ale když spotřeboval vodík ve svém jádru, nafoukl se na 25násobek jeho průměru a svítí asi 170krát víc.',
   'Arcturus', iau='Arcturus', magtxt='4. nejjasnější hvězda noční oblohy')
HV('vega', 'Vega', 'α Lyrae · HIP 91262', 91262, 'Lyr', 'bílá hvězda hlavní posloupnosti',
   'Pátá nejjasnější hvězda noční oblohy a jeden z vrcholů Letního trojúhelníku (s Denebem a Altairem).',
   'Vega je 2,1krát hmotnější než Slunce a má jen asi desetinu jeho stáří. Kolem roku 12 000 př. n. l. byla Polárkou a kolem roku 13 700 jí bude znovu, protože zemská osa se pomalu stáčí. Byla to první hvězda po Slunci, kterou se podařilo vyfotografovat, a podle její jasnosti se nastavovala stupnice hvězdných velikostí.',
   'Vega', iau='Vega', magtxt='5. nejjasnější hvězda noční oblohy')
HV('kapela', 'Kapela', 'α Aurigae · Capella · HIP 24608', 24608, 'Aur', 'čtyřhvězda: dva žlutí obři a dva červení trpaslíci',
   'Šestá nejjasnější hvězda noční oblohy. Jméno znamená latinsky „kozička“.',
   'Okem vypadá jako jedna hvězda, ale jsou to čtyři. Hlavní dvojici tvoří dva žlutí obři, každý asi 2,5krát hmotnější než Slunce. Jsou u sebe blíž než Země u Slunce a oběhnou se jednou za 104 dní. Daleko od nich obíhá dvojice malých červených trpaslíků.',
   'Capella', iau='Capella', magtxt='6. nejjasnější hvězda noční oblohy', sp=False)
HV('rigel', 'Rigel', 'β Orionis · HIP 24436', 24436, 'Ori', 'modrý veleobr',
   'Modrobílý veleobr v Orionu, obvykle sedmá nejjasnější hvězda noční oblohy.',
   'Rigel je nejméně čtyřhvězda, okem ale splývá v jediný bod. Hlavní hvězda má průměr přes sedmdesát Sluncí, povrch horký 12 100 K a je 18krát až 24krát hmotnější než Slunce. Je stará jen sedm až devět milionů let, a přesto už spotřebovala vodík v jádru. Skončí výbuchem supernovy.',
   'Rigel', iau='Rigel', magtxt='obvykle 7. nejjasnější hvězda noční oblohy', lypozn='Wikipedie uvádí přibližně 850 sv. l.')
HV('prokyon', 'Prokyon', 'α Canis Minoris · Procyon · HIP 37279', 37279, 'CMi', 'dvojhvězda: žlutobílá hvězda a bílý trpaslík',
   'Osmá nejjasnější hvězda noční oblohy a jeden z nejbližších sousedů Slunce.',
   'Stejně jako Sirius má i Prokyon slabého průvodce, bílého trpaslíka. Obě hvězdy se oběhnou jednou za necelých 41 let.',
   'Procyon', iau='Procyon', magtxt='obvykle 8. nejjasnější hvězda noční oblohy')
HV('achernar', 'Achernar', 'α Eridani · HIP 7588', 7588, 'Eri', 'horká modrobílá hvězda, která se rychle otáčí',
   'Devátá nejjasnější hvězda noční oblohy, nejjasnější v souhvězdí Eridanu.',
   'Z deseti nejjasnějších hvězd je Achernar nejteplejší a nejmodřejší. Otáčí se tak rychle, že není kulatý, ale zřetelně zploštělý. Ve vzdálenosti 7,35 astronomické jednotky kolem něj obíhá menší průvodce.',
   'Achernar', [('E', 'eso0316b', 'Zploštělý tvar Achernaru změřený propojenými dalekohledy VLTI (graf)')], ['E:eso0316b'], iau='Achernar', magtxt='9. nejjasnější hvězda noční oblohy',
   foto='První obrázek není fotografie, ale graf: obrys hvězdy, jak vyšel z měření interferometru VLTI.')
HV('betelgeuze', 'Betelgeuze', 'α Orionis · Betelgeuse · HIP 27989', 27989, 'Ori', 'červený veleobr',
   'Červený veleobr v Orionu. Jedna z největších hvězd, jaké jsou vidět pouhým okem.',
   'Kdyby Betelgeuze stála na místě Slunce, sahal by její povrch až za pás planetek: pohltila by dráhy Merkuru, Venuše, Země i Marsu. Její jasnost kolísá mezi 0,0 a 1,6 mag s hlavní periodou kolem 400 dní. Je mladší než 10 milionů let a skončí výbuchem supernovy, nejspíš během příštích 100 000 let.',
   'Betelgeuse', [('E', 'eso2109a', 'Povrch Betelgeuze před pohasnutím a během něj, 2019–2020 (dalekohled VLT)'), ('E', 'potw1726a', 'Betelgeuze v rádiových vlnách (ALMA)')], ['E:eso2109a', 'E:potw1726a'],
   iau='Betelgeuse', magtxt='proměnná: 0,0 až 1,6 mag', lypozn='vzdálenost se měří obtížně; Wikipedie uvádí 400 až 600 sv. l., ESO asi 600',
   foto='Čtveřice snímků z dalekohledu VLT ukazuje povrch hvězdy v lednu 2019 a pak během nečekaného pohasnutí na přelomu let 2019 a 2020.')
HV('hadar', 'Hadar', 'β Centauri · HIP 68702', 68702, 'Cen', 'trojhvězda',
   'Jedenáctá nejjasnější hvězda noční oblohy, druhá nejjasnější v Kentauru.',
   'Hadar je trojhvězda; její hlavní složka je horký modrobílý obr. Na obloze svítí hned vedle Alfy Centauri, ve skutečnosti je ale asi devadesátkrát dál (porovnání vzdáleností v této aplikaci).',
   'Beta_Centauri', iau='Hadar', magtxt='11. nejjasnější hvězda noční oblohy', lypozn='Wikipedie uvádí 361 sv. l. (z oběhu složek)')
HV('altair', 'Altair', 'α Aquilae · HIP 97649', 97649, 'Aql', 'bílá hvězda, která se rychle otáčí',
   'Dvanáctá nejjasnější hvězda noční oblohy a jeden z vrcholů Letního trojúhelníku (s Vegou a Denebem).',
   'Altair se na rovníku otáčí rychlostí asi 286 km/s. To není daleko od rychlosti, při které by se roztrhl (asi 400 km/s). Proto není kulatý, ale na pólech zploštělý; potvrdila to měření propojenými dalekohledy.',
   'Altair', iau='Altair', magtxt='12. nejjasnější hvězda noční oblohy')
HV('acrux', 'Acrux', 'α Crucis · HIP 60718', 60718, 'Cru', 'vícenásobná hvězda',
   'Nejjasnější hvězda Jižního kříže a nejjižnější z hvězd první velikosti.',
   'Okem jedna hvězda, v dalekohledu trojhvězda. Dvě nejjasnější složky jsou horké modrobílé hvězdy mnohokrát hmotnější a zářivější než Slunce.',
   'Acrux', iau='Acrux', magtxt='13. nejjasnější hvězda noční oblohy', lypozn='Wikipedie uvádí 348 sv. l.')
HV('aldebaran', 'Aldebaran', 'α Tauri · HIP 21421', 21421, 'Tau', 'červený obr',
   'Oranžový obr v souhvězdí Býka, obvykle čtrnáctá nejjasnější hvězda noční oblohy.',
   'Aldebaran má průměr asi 45 Sluncí, i když jeho hmotnost je podobná. Je přes šest miliard let starý a vodík v jádru už spotřeboval. Na obloze svítí před hvězdokupou Hyády, ale nepatří k ní. Jméno znamená arabsky „následovník“.',
   'Aldebaran', iau='Aldebaran', magtxt='kolísá: 0,75 až 0,95 mag (Wikipedie)')
HV('antares', 'Antares', 'α Scorpii · HIP 80763', 80763, 'Sco', 'červený veleobr',
   'Červené „srdce Štíra“. Jeden z největších veleobrů viditelných pouhým okem.',
   'Kdyby Antares stál na místě Slunce, sahal by až někam do pásu planetek. Je 13krát až 16krát hmotnější než Slunce a jeho jasnost pomalu a nepravidelně kolísá. Má horkého průvodce a osvětluje mlhoviny kolem hvězdy ró Ophiuchi, které má v popředí.',
   'Antares', [('E', 'eso1726a', 'Povrch Antara sestavený z měření propojených dalekohledů (VLTI)')], ['E:eso1726a'], iau='Antares', magtxt='proměnná: 0,6 až 1,6 mag (Wikipedie)',
   foto='Podle ESO to byl v době zveřejnění (2017) nejpodrobnější obraz povrchu jiné hvězdy než Slunce.')
HV('spika', 'Spika', 'α Virginis · Spica · HIP 65474', 65474, 'Vir', 'těsná dvojhvězda horkých modrobílých hvězd',
   'Nejjasnější hvězda Panny.',
   'Spika je dvojice hvězd, které jsou u sebe tak blízko, že nejsou kulaté, ale vejčité; rozlišit je lze jen rozborem jejich světla. Dál od nich obíhá třetí hvězda. S Arkturem patří Spika k Jarnímu trojúhelníku.',
   'Spica', iau='Spica', magtxt='jedna z 20 nejjasnějších hvězd')
HV('pollux', 'Pollux', 'β Geminorum · HIP 37826', 37826, 'Gem', 'oranžový obr s planetou',
   'Nejjasnější hvězda Blíženců a nejbližší obří hvězda u Slunce.',
   'V roce 2006 byla u Polluxe oznámena planeta, která později dostala jméno Thestias. Ačkoli nese řecké písmeno beta, je Pollux o půl magnitudy jasnější než sousední Kastor (alfa).',
   'Pollux_(star)', iau='Pollux')
HV('fomalhaut', 'Fomalhaut', 'α Piscis Austrini · HIP 113368', 113368, 'PsA', 'bílá hvězda s diskem prachu',
   'Nejjasnější hvězda souhvězdí Jižní ryby. Obklopuje ji disk prachu a trosek.',
   'Fomalhaut vyzařuje víc infračerveného světla, než by měl: prozradilo to disk prachu kolem něj. V disku se zdálo být vidět planetu (Fomalhaut b). Rozbory z let 2019 a 2023 ale ukázaly, že to planeta není, nýbrž rozpínající se oblak trosek po srážce dvou těles.',
   'Fomalhaut', [('W', 'weic2312a', 'Disk prachu v infračerveném světle (Webb)'), ('E', 'eso1216a', 'Prstenec prachu v rádiových vlnách (ALMA)')], ['W:weic2312a', 'E:eso1216a'], iau='Fomalhaut')
HV('deneb', 'Deneb', 'α Cygni · HIP 102098', 102098, 'Cyg', 'bílý veleobr',
   'Nejjasnější hvězda Labutě a vrchol Letního trojúhelníku. Patří k nejvzdálenějším jasným hvězdám na obloze.',
   'Deneb je veleobr přibližně 120 000krát zářivější než Slunce; o titul nejzářivější hvězdy první velikosti soupeří s Rigelem. Jeho vzdálenost je nejistá, a tím i skutečná svítivost.',
   'Deneb', iau='Deneb', magtxt='19. nejjasnější hvězda noční oblohy', lypozn='novější odhad podle Wikipedie je 2 030 sv. l.')
HV('mimosa', 'Mimosa', 'β Crucis · HIP 62434', 62434, 'Cru', 'trojhvězda',
   'Druhá nejjasnější hvězda Jižního kříže, dvacátá nejjasnější hvězda noční oblohy.',
   'Mimosa je trojhvězda. Její hlavní složka je horký modrobílý obr.',
   'Mimosa_(star)', iau='Mimosa', magtxt='20. nejjasnější hvězda noční oblohy')
HV('regulus', 'Regulus', 'α Leonis · HIP 49669', 49669, 'Leo', 'čtyřhvězda',
   'Nejjasnější hvězda Lva. Leží jen půl stupně od ekliptiky (vypočteno z polohy), takže kolem ní procházejí planety i Měsíc.',
   'Regulus vypadá jako jedna hvězda, ale je to čtyřhvězda uspořádaná do dvou párů. Hlavní modrobílá hvězda má těsného průvodce, ze kterého se stává bílý trpaslík. S pěti dalšími hvězdami tvoří Regulus obrazec zvaný Srp, hlavu Lva.',
   'Regulus', iau='Regulus')
HV('polarka', 'Polárka', 'α Ursae Minoris · Polaris · HIP 11767', 11767, 'UMi', 'žlutý veleobr, cefeida',
   'Hvězda, která ukazuje sever: leží necelý stupeň od severního nebeského pólu.',
   'Polárka je trojhvězda. Hlavní složka je žlutý veleobr a zároveň nejbližší cefeida, tedy hvězda, která pravidelně pulzuje; podle cefeid se měří vzdálenosti ve vesmíru. Vzdálenějšího průvodce objevil roku 1779 William Herschel. Polárkou je jen dočasně: zemská osa se pomalu stáčí a pól se od ní zase vzdálí.',
   'Polaris', [('H', 'opo0602a', 'Polárka a její průvodci (Hubble)')], ['H:opo0602a'], iau='Polaris', magtxt='kolísá kolem 1,98 mag (Wikipedie)',
   foto='Hubbleův dalekohled na těchto snímcích poprvé přímo zachytil těsného průvodce Polárky.')
HV('kastor', 'Kastor', 'α Geminorum · Castor · HIP 36850', 36850, 'Gem', 'šestihvězda',
   'Druhá nejjasnější hvězda Blíženců.',
   'Okem jedna hvězda, ve skutečnosti šest hvězd uspořádaných do tří párů.',
   'Castor_(star)', iau='Castor')
HV('mizar', 'Mizar a Alkor', 'ζ Ursae Majoris · HIP 65378', 65378, 'UMa', 'dvojice hvězd viditelná okem; dohromady šest hvězd',
   'Hvězda v oji Velkého vozu. Kdo má dobré oči, uvidí těsně vedle ní slabší hvězdičku Alkor.',
   'Mizar a Alkor jsou známá dvojice hvězd viditelná pouhým okem. Mizar sám je čtyřhvězda a Alkor dvojhvězda, takže dohromady jde o šest hvězd. Patří do skupiny hvězd, které se vesmírem pohybují společně (pohybová skupina Velké medvědice).',
   'Mizar', iau='Mizar', lypozn='Wikipedie uvádí pro Mizar a Alkor asi 83 sv. l.')
HV('algol', 'Algol', 'β Persei · HIP 14576', 14576, 'Per', 'zákrytová proměnná hvězda',
   '„Ďáblova hvězda“ v Perseovi: každé necelé tři dny na pár hodin zeslábne.',
   'Algol je trojhvězda. Dvě z jeho hvězd se navzájem pravidelně zakrývají: obvykle svítí stálou jasností 2,1 mag, ale jednou za 2,86 dne na zhruba deset hodin zeslábne na 3,4 mag. Byla to jedna z prvních objevených proměnných hvězd a dala jméno celé skupině zákrytových proměnných.',
   'Algol', iau='Algol', magtxt='kolísá: 2,1 až 3,4 mag (Wikipedie)')
HV('mira', 'Mira', 'ο Ceti · HIP 10826', 10826, 'Cet', 'pulzující červený obr',
   'Pulzující červený obr ve Velrybě, první objevená proměnná hvězda (kromě supernov).',
   'Mira je dvojhvězda: červený obr, který se pravidelně nafukuje a smršťuje, a bílý trpaslík. Podle ní se jmenuje celá skupina pulzujících hvězd, miridy.',
   'Mira', [('E', 'potw1447a', 'Mira A a její průvodce v rádiových vlnách (ALMA)')], ['E:potw1447a'], iau='Mira', magtxt='silně proměnná', lypozn='ESO uvádí asi 400 sv. l.', vid=1)
HV('albireo', 'Albireo', 'β Cygni · HIP 95947', 95947, 'Cyg', 'barevná dvojhvězda',
   'V malém dalekohledu jedna z nejhezčích dvojhvězd oblohy: žlutá hvězda s modrým průvodcem.',
   'Okem vypadá Albireo jako jediná hvězda třetí velikosti. Už malý dalekohled ji rozloží na dvě: jasnější žlutou (která je sama těsnou trojhvězdou) a slabší modrou.',
   'Albireo', iau='Albireo')
HV('proxima', 'Proxima Centauri', 'α Centauri C · HIP 70890', 70890, 'Cen', 'červený trpaslík, nejbližší hvězda',
   'Hvězda, která je Slunci nejblíž. Přesto je tak slabá, že ji bez dalekohledu neuvidíš.',
   'Proxima je malý červený trpaslík: má jen asi osminu hmotnosti Slunce a sedminu jeho průměru. Objevil ji roku 1915 Robert Innes. Patří k systému Alfa Centauri: kolem jeho dvou jasných hvězd obíhá jednou za asi 550 000 let a na obloze je od nich 2,2° daleko. Občas se prudce zjasní, je to eruptivní hvězda.',
   'Proxima_Centauri', [('H', 'potw1343a', 'Proxima Centauri (Hubble)')], ['H:potw1343a'], iau='Proxima Centauri', magtxt='okem vidět není (hranice je asi 6 mag)')
HV('barnard', 'Barnardova hvězda', "Barnard's Star · HIP 87937", 87937, 'Oph', 'červený trpaslík',
   'Po trojici Alfa Centauri nejbližší hvězda u Slunce. Okem vidět není.',
   'Barnardova hvězda je malý červený trpaslík se 16 % hmotnosti Slunce a 19 % jeho průměru. Je to nejbližší hvězda severní poloviny oblohy. Podle Wikipedie kolem ní obíhají čtyři malé planety, lehčí než Země.',
   "Barnard's_Star", iau="Barnard's Star", magtxt='okem vidět není (hranice je asi 6 mag)')
HV('thuban', 'Thuban', 'α Draconis · HIP 68756', 68756, 'Dra', 'dvojhvězda, dávná Polárka',
   'Nenápadná hvězda v Drakovi, která byla Polárkou ve 4. až 2. tisíciletí př. n. l.',
   'Zemská osa se pomalu stáčí, a tak se severní nebeský pól posouvá mezi hvězdami. Před pěti tisíci lety ukazoval k Thubanu, dnes k Polárce a kolem roku 13 700 bude poblíž Vegy.',
   'Thuban', iau='Thuban')
HV('alnilam', 'Alnilam', 'ε Orionis · HIP 26311', 26311, 'Ori', 'modrý veleobr',
   'Prostřední hvězda Orionova pásu.',
   'Alnilam je modrý veleobr asi 28krát hmotnější než Slunce a 270 000krát zářivější.',
   'Alnilam', iau='Alnilam', lypozn='paralaxa je na hranici přesnosti; Wikipedie uvádí asi 1 250 sv. l.')
HV('etacar', 'Eta Carinae', 'η Carinae', None, 'Car', 'dvojice mimořádně hmotných hvězd',
   'Jedna z nejzářivějších hvězd Galaxie. V roce 1843 byla druhou nejjasnější hvězdou na obloze.',
   'Eta Carinae jsou nejméně dvě hvězdy, které dohromady září víc než pětmilionkrát silněji než Slunce a oběhnou se jednou za 5,54 roku. Při „Velké erupci“, která začala roku 1837, se zjasnily tak, že v březnu 1843 překonaly všechny hvězdy kromě Siria; po roce 1856 zmizely očím. Od roku 1940 se zase zjasňují. Leží uvnitř mlhoviny Carina.',
   'Eta_Carinae', [('H', 'heic1912a', 'Plyn vyvržený při erupcích, v ultrafialovém světle (Hubble)'), ('E', 'eso0817a', 'V infračerveném světle (dalekohled VLT)')], ['H:heic1912a', 'E:eso0817a'],
   iau='Eta Carinae', ra=hms('10 45 3.66'), de=dms('-59 41 2.1'), possrc=('ESA/Hubble: poloha středu snímku heic1912a', 'https://esahubble.org/images/heic1912a/'),
   ly=7500, lysrc=1, vid=1, nase='Na obloze v aplikaci leží uvnitř mlhoviny Carina.')
HV('betapic', 'Beta Pictoris', 'β Pictoris · HIP 27321', 27321, 'Pic', 'mladá hvězda s diskem a planetami',
   'Mladá hvězda, kolem které se právě dotváří planetární soustava.',
   'Beta Pictoris je stará jen asi 23 milionů let. Obklopuje ji disk prachu a trosek, ve kterém obíhají tři potvrzené planety; všechny se podařilo přímo vyfotografovat.',
   'Beta_Pictoris', [('E', 'eso0842a', 'Disk a planeta v infračerveném světle (ESO)'), ('W', 'weic2401a', 'Disk trosek (Webb)')], ['E:eso0842a', 'W:weic2401a'], iau='Beta Pictoris',
   foto='Samotná hvězda je na snímcích zakrytá nebo odečtená, jinak by slabý disk přezářila.')
HV('peg51', '51 Pegasi', '51 Pegasi · Helvetios · HIP 113357', 113357, 'Peg', 'hvězda podobná Slunci s planetou',
   'U této hvězdy byla roku 1995 objevena první planeta obíhající kolem jiné hvězdy podobné Slunci.',
   'Planeta 51 Pegasi b je takzvaný horký Jupiter. O dvacet let později se stala i první exoplanetou, jejíž odražené světlo se podařilo přímo zachytit ve spektru. Hvězda má vlastní jméno Helvetios, planeta Dimidium.',
   '51_Pegasi', [('E', 'eso1517a', 'Planeta 51 Pegasi b (kresba, ne fotografie)')], ['E:eso1517a'], iau='Helvetios')
HV('deltacep', 'Delta Cephei', 'δ Cephei · HIP 110991', 110991, 'Cep', 'pulzující veleobr, vzor cefeid',
   'Hvězda, podle které se jmenují cefeidy: pulzující hvězdy, jimiž se měří vzdálenosti ve vesmíru.',
   'Delta Cephei pravidelně mění jasnost a je vzorem celé skupiny proměnných hvězd. Je součástí čtyřhvězdy.',
   'Delta_Cephei', iau='Delta Cephei', lypozn='Wikipedie uvádí asi 890 sv. l.', magtxt='proměnná (cefeida)')
HV('cyg61', '61 Cygni', '61 Cygni · HIP 104214', 104214, 'Cyg', 'dvojhvězda oranžových trpaslíků',
   'První hvězda, u které se podařilo změřit vzdálenost.',
   'Roku 1838 změřil Friedrich Bessel její paralaxu a vyšlo mu asi 10,4 světelného roku, velmi blízko dnešní hodnotě. Pozornost na sebe hvězda upoutala už roku 1804 tím, jak rychle se pohybuje po obloze: ze všech hvězd viditelných okem má největší vlastní pohyb. Jsou to dva oranžoví trpaslíci, kteří se oběhnou jednou za asi 659 let.',
   '61_Cygni', iau='61 Cygni', magtxt='jasnější složka; na tmavé obloze vidět okem')
HV('mucep', 'Granátová hvězda', 'μ Cephei · HIP 107259', 107259, 'Cep', 'červený veleobr',
   'Jedna z největších známých hvězd. Je sytě červená, odtud jméno.',
   'Kdyby stála na místě Slunce, pohltila by přinejmenším dráhu Marsu a pás planetek. Okem je vidět za dobrých podmínek jako hvězda čtvrté velikosti.',
   'Mu_Cephei', iau='Garnet Star', ly=3000, lyz='do ', lysrc=1,
   lytxt='nejistá: hvězda zřejmě patří k asociaci Cepheus OB2, která leží do 3 000 sv. l. (Wikipedie); paralaxa družice Hipparcos (0,55 ± 0,20 mas) je na hranici měřitelnosti')
HV('tauceti', 'Tau Ceti', 'τ Ceti · HIP 8102', 8102, 'Cet', 'hvězda podobná Slunci',
   'Nejbližší osamělá hvězda podobná Slunci.',
   'Tau Ceti má asi 78 % hmotnosti Slunce. Je klidná a stálá, proto se u ní často hledají planety; do roku 2025 ale žádná jednoznačně potvrzena nebyla. Obklopuje ji víc než desetkrát tolik prachu, než kolik je ho ve Sluneční soustavě. Z Tau Ceti by bylo Slunce vidět jako hvězda 2,6 mag v souhvězdí Pastýře.',
   'Tau_Ceti', iau='Tau Ceti')
HV('epseri', 'Epsilon Eridani', 'ε Eridani · Ran · HIP 16537', 16537, 'Eri', 'mladší oranžový trpaslík s planetou',
   'Třetí nejbližší hvězda viditelná pouhým okem.',
   'Epsilon Eridani je menší a chladnější než Slunce a má jen asi miliardu let. Je proto neklidnější: její hvězdný vítr je 30krát silnější než sluneční. Obíhá kolem ní obří planeta a disk trosek.',
   'Epsilon_Eridani', iau='Ran')
HV('epsind', 'Epsilon Indi', 'ε Indi · HIP 108870', 108870, 'Ind', 'oranžový trpaslík s planetou',
   'Blízká oranžová hvězda jižní oblohy, u které dalekohled Jamese Webba přímo vyfotil planetu.',
   'Planeta nese označení Epsilon Indi Ab. Na snímku je světlo samotné hvězdy zakryté, aby ji nepřezářilo.',
   None, [('W', 'weic2421a', 'Planeta Epsilon Indi Ab (Webb)')], ['W:weic2421a'], iau='Epsilon Indi')
HV('vycma', 'VY Canis Majoris', 'VY CMa · HIP 35793', 35793, 'CMa', 'červený hyperobr',
   'Jedna z největších známých hvězd Mléčné dráhy. Okem vidět není.',
   'VY Canis Majoris je 30krát až 40krát hmotnější než Slunce a 300 000krát zářivější. Kdyby stála na místě Slunce, sahala by až k dráze Jupiteru. Je na konci života a rychle ztrácí hmotu.',
   None, [('E', 'eso1546a', 'Okolí hvězdy (dalekohled VLT, přístroj SPHERE)')], ['E:eso1546a'], iau='VY Canis Majoris', ly=4000, lyz='asi ', lysrc=1,
   lytxt='asi 4 000 sv. l. (ESO); paralaxu této hvězdy družice Hipparcos spolehlivě nezměřila', magtxt='okem vidět není (hranice je asi 6 mag)')
HV('rscl', 'R Sculptoris', 'R Scl · HIP 6759', 6759, 'Scl', 'stárnoucí červený obr',
   'Stará hvězda, kolem které radioteleskopy našly nečekanou spirálu plynu.',
   'Spirálu v odvrženém plynu odhalila soustava radioteleskopů ALMA. Nic takového předtím u podobné hvězdy vidět nebylo; nejspíš ji způsobuje skrytý průvodce, který kolem hvězdy obíhá.',
   None, [('E', 'eso1239a', 'Spirála plynu kolem hvězdy (ALMA)')], ['E:eso1239a'], iau='R Sculptoris', ly=1500, lyz='asi ', lysrc=1,
   lytxt='asi 1 500 sv. l. (ESO); z paralaxy družice Hipparcos (3,76 ± 0,75 mas) vychází kolem 870', magtxt='proměnná, na hranici viditelnosti okem', vid=0)
HV('pi1gru', 'Pí¹ Gruis', 'π¹ Gruis · HIP 110478', 110478, 'Gru', 'stárnoucí červený obr',
   'První hvězda kromě Slunce, na jejímž povrchu byly přímo vidět obří bubliny horkého plynu.',
   'Dalekohled VLT na povrchu tohoto červeného obra přímo zachytil granulaci: buňky stoupajícího a klesajícího plynu. Každá zabírá víc než čtvrtinu průměru hvězdy a měří asi 120 milionů kilometrů.',
   None, [('E', 'eso1741a', 'Povrch hvězdy (dalekohled VLT, přístroj PIONIER)')], ['E:eso1741a'], iau='Pi1 Gruis', magtxt='proměnná, na hranici viditelnosti okem', vid=0)


def tap(q):
    return list(csv.DictReader(io.StringIO(get('https://gea.esac.esa.int/tap-server/tap/sync?REQUEST=doQuery&LANG=ADQL&FORMAT=csv&QUERY=' + urllib.parse.quote(q)))))


def cz(x, d=0):
    t = f'{x:,.{d}f}'.replace(',', ' ').replace('.', ',')
    return t.rstrip('0').rstrip(',') if d else t


def sig(x, n):
    k = n - 1 - int(math.floor(math.log10(abs(x))))
    return round(x, k) if k > 0 else float(int(round(x, k)))


BARVA = {'O': 'modrá, mimořádně horká', 'B': 'modrobílá, horká', 'A': 'bílá', 'F': 'žlutobílá', 'G': 'žlutá, podobná Slunci', 'K': 'oranžová', 'M': 'červená, chladná',
         'C': 'sytě červená (uhlíková)', 'S': 'červená, chladná', 'W': 'modrá, mimořádně horká'}


def spektrum(t):
    """Spektrální třída z katalogu Hipparcos, zbavená poznámek („A0m...“ → „A0“, „F7:Ib-IIv SB“ → „F7 Ib–II“)."""
    m = re.match(r'(sd)?([OBAFGKMCSW][CN]?\d?(?:\.\d)?)[:m]*\s*((?:Ia|Ib|IV|V|I{1,3})(?:[-/](?:Ia|Ib|IV|V|I{1,3}))?)?', t.strip())
    if not m:
        return None
    return ((m.group(1) or '') + m.group(2) + (' ' + m.group(3).replace('-', '–').replace('/', '–') if m.group(3) else '')).strip()


_ids = ','.join(str(h['hip']) for h in HVE if h['hip'])
HIP2 = {int(r['hip']): r for r in tap(f'SELECT hip, plx, e_plx, pm_ra, pm_de FROM public.hipparcos_newreduction WHERE hip IN ({_ids})')}
HIP1 = {int(r['hip']): r for r in tap(f'SELECT hip, ra, de, vmag, sptype FROM public.hipparcos WHERE hip IN ({_ids})')}
WIKI = 'https://en.wikipedia.org/wiki/'
N_RANK = 0
for h in HVE:
    kw, hip = h['kw'], h['hip']
    o = dict(id=h['id'], cs=h['cs'], ozn=h['ozn'], kat=None, druh='hvezda', typ=h['typ'], lead=h['lead'], txt=h['txt'], foto=kw.get('foto'), konst=h['konst'],
             vel=False, kruh=0.3, hvezda=True, nove=True, iau=kw.get('iau'))
    src = []
    if hip:
        a, b = HIP2[hip], HIP1[hip]
        plx, e = float(a['plx']), float(a['e_plx'])
        de0 = float(b['de'])
        # poloha katalogu platí pro epochu J1991,25; vlastním pohybem (mas za rok) se přepočte na J2000
        o['ra'] = (float(b['ra']) + float(a['pm_ra']) * 8.75 / 3.6e6 / math.cos(math.radians(de0))) % 360
        o['de'] = de0 + float(a['pm_de']) * 8.75 / 3.6e6
        o['magv'] = float(b['vmag'])
        o['sp'] = (kw['sp'] or None) if 'sp' in kw else spektrum(b['sptype'])
        src.append((f'Katalog Hipparcos, HIP {hip}: poloha, jasnost, spektrální třída (ESA 1997) a paralaxa z nového zpracování (F. van Leeuwen 2007)',
                    f'https://vizier.cfa.harvard.edu/viz-bin/VizieR-5?-source=I/311/hip2&HIP={hip}'))
        if 'ly' not in kw:
            if plx <= 0 or e / plx > 0.3:
                raise SystemExit(f"{h['id']}: paralaxa {plx} ± {e} mas nestačí, vzdálenost je třeba zadat ručně se zdrojem")
            rel = e / plx
            n = 3 if rel < 0.03 else 2
            ly, lo, hi = 3261.5638 / plx, 3261.5638 / (plx + e), 3261.5638 / (plx - e)
            o['ly'] = sig(ly, n) if ly >= 100 or rel >= 0.03 else round(ly, 1)
            if o['ly'] >= 100 or o['ly'] == int(o['ly']):
                o['ly'] = int(o['ly'])
            o['lyz'] = 'asi ' if rel >= 0.03 else None
            d = 1 if hi < 100 else 0
            t_lo, t_hi = (cz(lo, d) if d else cz(sig(lo, 3))), (cz(hi, d) if d else cz(sig(hi, 3)))
            o['lytxt'] = (f"z paralaxy {cz(plx, 2)} ± {cz(e, 2)} mas (družice Hipparcos, zpracování 2007) vychází " + (t_lo if t_lo == t_hi else f'{t_lo} až {t_hi}') + ' sv. l.'
                          + ('; ' + kw['lypozn'] if kw.get('lypozn') else ''))
            o['lysrc'] = 0
    else:
        o['ra'], o['de'], o['magv'], o['sp'] = kw['ra'], kw['de'], kw.get('magv'), kw.get('sp')
        src.append(('Poloha: ' + kw['possrc'][0], kw['possrc'][1]))
    for k in ('ly', 'lyz', 'lytxt', 'lysrc', 'nase', 'magtxt', 'prio'):
        if k in kw:
            o[k] = kw[k]
    if h['wiki']:
        src.append((f"Wikipedie (anglicky), heslo „{h['wiki'].replace('_', ' ')}“, úvodní odstavce (stav {STAV})", WIKI + urllib.parse.quote(h['wiki'])))
    src += [zdr(z) for z in h['zdroj']]
    o['src'] = src
    mg = o.get('magv')
    o['vid'] = kw.get('vid', 2 if mg is not None and mg <= 2.6 else 1 if mg is not None and mg <= 6.6 else 0)
    if 'prio' not in o:
        N_RANK += 1
        o['prio'] = (8 + 3 * N_RANK) if mg is not None and mg < 1.5 else (160 + N_RANK if o['vid'] == 2 else 330 + N_RANK if o['vid'] == 1 else 520 + N_RANK)
    o['barva'] = BARVA.get((o.get('sp') or '').replace('sd', '')[:1])
    if o['barva'] and o['sp'].startswith('G') and not o['sp'].endswith(' V'):
        o['barva'] = 'žlutá'  # „podobná Slunci“ platí jen pro hvězdy hlavní posloupnosti
    if 'nase' not in o:
        o['nase'] = ['Na obloze v aplikaci vidět není: je slabší, než kam sahá její katalog hvězd (asi 6,5 mag). Kroužek ukazuje místo, kde leží.',
                     'Na obloze v aplikaci je vidět jako slabší hvězda.', 'Na obloze v aplikaci patří k nejjasnějším hvězdám.'][o['vid']]
    cap = 'Okolí hvězdy na mapě hvězd, 12° × 12° (vykresleno z katalogů, ne fotografie)'
    o['imgs'] = h['imgs'] + [('S', h['id'], cap)]
    O.append(o)

_EXR = None


def hvezdna_mapa(ra, de, znacka, pole=12.0, n=720):
    """Výřez z mapy hvězd NASA SVS (rovníkové souřadnice, střed 0 h, rektascenze roste doleva) v gnómonické projekci, sever nahoře.
    Jas: 1 − exp(−3x), gama 2,2; kolem nejjasnějších hvězd přidaná slabá záře (jen pro vzhled). U slabších hvězd kroužek uprostřed."""
    global _EXR
    f = os.path.join(W, f'hvmapa_{ra:.4f}_{de:.4f}_{int(znacka)}.png')
    if os.path.exists(f):
        return Image.open(f).convert('RGB')
    import numpy as np
    from PIL import ImageFilter, ImageChops
    if _EXR is None:
        import OpenEXR
        fe = os.path.join(W, 'starmap_2020_16k.exr')
        if not os.path.exists(fe) or os.path.getsize(fe) < 4e8:
            subprocess.run(['curl', '-sS', '-L', '-m', '3000', '-o', fe, SVS_EXR], check=True)
        ch = OpenEXR.File(fe).parts[0].channels
        _EXR = ch['RGB'].pixels if 'RGB' in ch else np.dstack([ch[c].pixels for c in ('R', 'G', 'B')])
    a = _EXR
    H, Wd = a.shape[:2]
    r0, d0, t = math.radians(ra), math.radians(de), math.tan(math.radians(pole / 2))
    xs = np.linspace(-t, t, n)
    X, Y = np.meshgrid(-xs, xs[::-1])  # východ vlevo, sever nahoře (jako na obloze)
    rho = np.hypot(X, Y)
    rho[rho == 0] = 1e-12
    c = np.arctan(rho)
    sc, cc = np.sin(c), np.cos(c)
    dec = np.arcsin(np.clip(cc * math.sin(d0) + Y * sc * math.cos(d0) / rho, -1, 1))
    raa = r0 + np.arctan2(X * sc, rho * math.cos(d0) * cc - Y * math.sin(d0) * sc)
    u = (0.5 - raa / (2 * math.pi)) % 1.0 * Wd - 0.5
    v = np.clip((0.5 - dec / math.pi) * H - 0.5, 0, H - 1.001)
    u0, v0 = np.floor(u).astype(np.int64), np.floor(v).astype(np.int64)
    fu, fv = (u - u0)[..., None], (v - v0)[..., None]
    u1 = (u0 + 1) % Wd
    u0 %= Wd
    g = lambda vv, uu: a[vv, uu].astype(np.float32)
    x = (g(v0, u0) * (1 - fu) + g(v0, u1) * fu) * (1 - fv) + (g(v0 + 1, u0) * (1 - fu) + g(v0 + 1, u1) * fu) * fv
    y = np.clip(1 - np.exp(-np.clip(x, 0, None) * 3.0), 0, 1) ** (1 / 2.2)
    im = Image.fromarray((y * 255 + 0.5).astype(np.uint8))
    jasne = Image.fromarray((np.clip((y - 0.72) / 0.28, 0, 1) * 255).astype(np.uint8))
    for r, k in ((2.5, 1.6), (7, 3.0), (20, 5.0)):  # záře: rozmazaná jasná jádra, přičtená přes „screen“ (bez ořezu, aby neměla hrany)
        z = np.asarray(jasne.filter(ImageFilter.GaussianBlur(r)), dtype=np.float32) / 255 * k
        z = 1 - np.exp(-z)
        im = ImageChops.screen(im, Image.fromarray((z * 255).astype(np.uint8)))
    if znacka:
        d = ImageDraw.Draw(im, 'RGBA')
        d.ellipse((n / 2 - 17, n / 2 - 17, n / 2 + 17, n / 2 + 17), outline=(255, 231, 173, 190), width=1)
    im.save(f)
    return im


sky = Image.open(os.path.join(ROOT, 'dist', 'maps', 'milkyway.webp')).convert('RGB')
SW, SH = sky.size
big = Image.new('RGB', (SW * 3, SH))
for k in range(3):
    big.paste(sky, (k * SW, 0))


def vyrez(ra, de, pole, out):
    """Výřez z naší fotky oblohy (rovnoúhlá mapa v rovníkových souřadnicích: u = 0,25 − RA/360, v = 0,5 − Dec/180).
    Bez kroužku: kreslí ho až aplikace; stejný výřez slouží i jako začátek animace přiblížení."""
    x = ((0.25 - ra / 360) % 1) * SW + SW
    y = (0.5 - de / 180) * SH
    hw = pole / 2 / 360 * SW / max(0.2, math.cos(math.radians(de)))
    hh = pole / 2 / 180 * SH
    y0, y1 = max(0, y - hh), min(SH, y + hh)
    t = big.crop((int(x - hw), int(y0), int(x + hw), int(y1))).resize((320, max(1, int(320 * (y1 - y0) / (2 * hh)))), Image.LANCZOS)
    c = Image.new('RGB', (320, 320), (0, 0, 0))
    c.paste(t, (0, int(320 * (y0 - (y - hh)) / (2 * hh))))
    ImageEnhance.Brightness(c).enhance(1.45).save(out, 'WEBP', quality=82)


def nahled(im, out, stred=1.0):
    """Čtvercový náhled 112 × 112 bodů (seznam, pás fotografií ve scéně); u mapy hvězd jen střed, aby byla hvězda vidět."""
    w, h = im.size
    m = int(min(w, h) * stred)
    im.crop(((w - m) // 2, (h - m) // 2, (w - m) // 2 + m, (h - m) // 2 + m)).resize((112, 112), Image.LANCZOS).save(out, 'WEBP', quality=78)


res, total = [], 0
for n_o, o in enumerate(O):
    if o['kat']:
        r = CAT[o['kat']]
        ra, de = deg(r['RA'], True), deg(r['Dec'], False)
        maj = float(r['MajAx']) if r['MajAx'] else None
        mn = float(r['MinAx']) if r['MinAx'] else None
        # jasnost jen u galaxií a hvězdokup a jen vizuální (V); u mlhovin je údaj katalogu nespolehlivý
        mag = float(r['V-Mag']) if r['V-Mag'] and o['druh'] in ('galaxie', 'kulova', 'otevrena') else None
        konst = o.get('konst') or r['Const'] or {'B033': 'Ori', 'C099': 'Cru', 'ESO056-115': 'Dor', 'Mel022': 'Tau', 'C041': 'Tau'}.get(o['kat'], '')
    else:
        ra, de, maj, mn, mag, konst = o['ra'], o['de'], o.get('maj'), o.get('min'), o.get('magv'), o['konst']
    if o.get('mag') is False:
        mag = None
    size = (maj or 60) / 60
    kr = o.get('kruh', size / 2)  # poloměr kroužku ve stupních (kde katalog velikost neuvádí nebo je zjevně jiná než objekt na fotce)
    pole = max(18.0, min(44.0, max(size, 2 * kr) * 4))
    vyrez(ra, de, pole, os.path.join(OUT, o['id'] + '_nase.webp'))
    imgs = []
    for n, (k, i, cap) in enumerate(o['imgs']):
        if k == 'S':
            im = hvezdna_mapa(ra, de, mag is None or mag > 2.6)
        else:
            im = Image.open(io.BytesIO(get(CDN[k] % ((i, i) if k == 'N' else i), True))).convert('RGB')
        mx = MAXPX if o.get('nove') else 1280
        if max(im.size) > mx:
            im.thumbnail((mx, mx), Image.LANCZOS)
        fn = f"{o['id']}_{n + 1}.webp"
        im.save(os.path.join(OUT, fn), 'WEBP', quality=(70 if k == 'S' else 78) if o.get('nove') else 80, method=6)
        nahled(im, os.path.join(OUT, f"{o['id']}_{n + 1}t.webp"), 0.3 if k == 'S' else 1.0)
        total += os.path.getsize(os.path.join(OUT, fn))
        imgs.append({'f': fn, 't': f"{o['id']}_{n + 1}t.webp", 'w': im.size[0], 'h': im.size[1], 'cap': cap, 'autor': SVS_AUTOR if k == 'S' else credit(k, i), 'arch': ARCH[k], 'lic': LIC[k],
                     'url': SVS if k == 'S' else PAGE[k] % i})
    src = [{'t': t, 'u': u} for t, u in o['src']]
    if o['kat']:
        src.append({'t': OPENNGC[0], 'u': OPENNGC[1]})
    elif o.get('hvezda'):
        pass
    elif o.get('possrc'):
        src.append({'t': 'Poloha: ' + o['possrc'][0], 'u': o['possrc'][1]})
    if 'odst' in o:  # starší zápis (prvních 19 objektů): odstavce „Co to je“, „Co je na fotkách“, „Kde je na obloze“
        txt, foto = [o['odst'][0][1]], o['odst'][1][1]
        m = re.search(r'(Na naší fotce[^.]*\.)', o['odst'][2][1])
        nase = o.get('nase') or (m.group(1) if m else None)
    else:
        txt, foto, nase = (o['txt'] if isinstance(o['txt'], list) else [o['txt']]), o.get('foto'), o.get('nase')
    res.append({
        'id': o['id'], 'cs': o['cs'], 'ozn': o['ozn'], 'druh': o['druh'], 'typ': o['typ'], 'souhv': SOUHV[konst],
        'ra': round(ra, 4), 'de': round(de, 4), 'maj': maj, 'min': mn, 'mag': mag, 'pole': round(pole, 1), 'kr': round(kr, 2), 'vel': o.get('vel', True),
        'vid': o.get('vid', 2), 'prio': o.get('prio', (0 if o.get('vid', 2) == 2 else 200 if o.get('vid') == 1 else 400) + n_o),
        'ly': o['ly'], 'lyz': o.get('lyz'), 'lytxt': o.get('lytxt'), 'lysrc': o.get('lysrc', 0),
        'lead': o['lead'], 'txt': txt, 'foto': foto, 'nase': nase, 'imgs': imgs, 'src': src,
    })
    if o.get('hvezda'):
        res[-1].update({'sp': o.get('sp'), 'barva': o.get('barva'), 'iau': o.get('iau'), 'magtxt': o.get('magtxt')})
def _cisla(ly):
    """Jak může být vzdálenost zapsaná na anglické stránce zdroje."""
    v = []
    for jm, k in (('billion', 1e9), ('million', 1e6)):
        if ly >= k:
            x = ly / k
            v += [f'{x:g} {jm}', f'{x:.1f} {jm}', f'{x:.2f} {jm}']
            return v
    n = int(ly)
    return [str(n), f'{n:,}', f'{n:,}'.replace(',', ' '), f'{n:,}'.replace(',', '\u2009'), f'{n:,}'.replace(',', '\xa0')]


NEOVERENO = []
for o, r in zip(O, res):  # objekty verze 2.0 mimo hvězdy s paralaxou: vzdálenost musí být na některé zdrojové stránce
    if not o.get('nove') or (o.get('hvezda') and r['lysrc'] == 0 and 'paralaxy' in (r['lytxt'] or '')):
        continue
    t = ' '.join(re.sub(r'\s+', ' ', html.unescape(re.sub('<.*?>', ' ', get(x['u'])))) for x in r['src'] if 'vizier' not in x['u'] and 'github' not in x['u'])
    if not any(c in t for c in _cisla(r['ly'])):
        NEOVERENO.append(f"{r['id']}: {r['ly']}")
if NEOVERENO:
    print('POZOR, vzdálenost nenalezena na zdrojových stránkách:', '; '.join(NEOVERENO))
for f in os.listdir(OUT):  # soubory, které už žádný objekt nepoužívá
    if f.endswith('.webp') and not any(f == o['id'] + '_nase.webp' or any(f in (im['f'], im['t']) for im in o['imgs']) for o in res):
        os.remove(os.path.join(OUT, f))
json.dump({'stav': STAV, 'skupiny': SKUP, 'objekty': res}, open(os.path.join(ROOT, 'src', 'data', 'obloha.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
# přehled původu a licencí pro CREDITS (zdroje/OBLOHA.md)
md = ['# Objekty na obloze: původ fotografií a údajů', '',
      'Soubor vytváří `tools/data/obloha_build.py`; neupravovat ručně. Stav k ' + STAV + '.', '',
      '- Fotografie z archivů ESO, ESA/Hubble a ESA/Webb jsou pod licencí **CC BY 4.0** (uvést autora; úprava: zmenšení na nejvýš 1280 bodů, u objektů přidaných ve verzi 2.0 na 1000 bodů, a převod do WebP).',
      '- Výřezy „okolí hvězdy“ jsou z mapy hvězd **NASA SVS Deep Star Maps 2020** (' + SVS + '), autor: ' + SVS_AUTOR + '. Úprava: výřez 12° × 12° v gnómonické projekci, převod jasu, slabá záře kolem nejjasnějších hvězd, u slabších hvězd kroužek uprostřed.',
      '- Hvězdy: poloha, jasnost a spektrální třída z katalogu **Hipparcos** (ESA 1997), paralaxa z nového zpracování (F. van Leeuwen 2007), obojí z archivu ESA (https://gea.esac.esa.int/archive/, tabulky public.hipparcos a public.hipparcos_newreduction). Vzdálenost = 3261,56 / paralaxa v mas.',
      '- Zajímavosti o hvězdách: úvodní odstavce hesel anglické Wikipedie (CC BY-SA 4.0), vlastní shrnutí; odkaz na heslo je u každé hvězdy.',
      '- Fotografie z archivu NASA (JPL-Caltech) se smí volně užít s uvedením autora podle zásad NASA/JPL pro obrazové materiály.',
      '- Poloha, úhlová velikost a jasnost: katalog **OpenNGC** (Mattia Verga), licence CC BY-SA 4.0, https://github.com/mattiaverga/OpenNGC.',
      '- Výřezy „na naší obloze“ (`dist/sky/<id>_nase.webp`) jsou z panoramatu Mléčné dráhy Axela Mellingera (viz CREDITS.md), zesvětlené o 45 %.',
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
