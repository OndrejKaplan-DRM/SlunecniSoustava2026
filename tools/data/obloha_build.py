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
STAV = '19. 11. 2026'  # den, kdy byly údaje a odkazy ověřeny
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


SOUHV = {'And': 'Andromeda', 'Ori': 'Orion', 'Car': 'Lodní kýl', 'Sgr': 'Střelec', 'Se2': 'Had', 'Se1': 'Had', 'Cyg': 'Labuť', 'Mon': 'Jednorožec', 'Cen': 'Kentaur', 'Tuc': 'Tukan', 'Per': 'Perseus', 'Sco': 'Štír', 'Sct': 'Štít', 'Oph': 'Hadonoš', 'Dor': 'Mečoun', 'Cru': 'Jižní kříž', 'Tau': 'Býk', 'Tri': 'Trojúhelník', 'UMa': 'Velká medvědice', 'CVn': 'Honicí psi', 'Vir': 'Panna', 'Hya': 'Hydra', 'Scl': 'Sochař', 'Peg': 'Pegas', 'Crv': 'Havran', 'CMa': 'Velký pes', 'Cas': 'Kasiopeja', 'Lyr': 'Lyra', 'Vul': 'Lištička', 'Aqr': 'Vodnář', 'Dra': 'Drak', 'Her': 'Herkules', 'Pav': 'Páv', 'Ara': 'Oltář', 'Gem': 'Blíženci', 'Vel': 'Plachty'}
OPENNGC = ('Katalog OpenNGC (poloha, úhlová velikost, jasnost)', 'https://github.com/mattiaverga/OpenNGC')
SKUP = {'galaxie': 'Galaxie', 'mlhovina': 'Zářící mlhoviny', 'temna': 'Temné mlhoviny', 'zanik': 'Umírající hvězdy a jejich pozůstatky', 'kulova': 'Kulové hvězdokupy', 'otevrena': 'Otevřené hvězdokupy', 'stred': 'Střed Galaxie'}

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
    src = [(f"{ARCH[z[0]]}: {titul(z[0], z[2:])} ({z[2:]})", PAGE[z[0]] % z[2:]) for z in zdroj]
    return dict(id=id, cs=cs, ozn=ozn, kat=kat, druh=druh, typ=typ, ly=ly, lead=lead, txt=txt, foto=foto, imgs=imgs, src=src, **kw)


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


def nahled(im, out):
    """Čtvercový náhled 112 × 112 bodů (seznam, pás fotografií ve scéně)."""
    w, h = im.size
    m = min(w, h)
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
        ra, de, maj, mn, mag, konst = o['ra'], o['de'], o.get('maj'), o.get('min'), None, o['konst']
    if o.get('mag') is False:
        mag = None
    size = (maj or 60) / 60
    kr = o.get('kruh', size / 2)  # poloměr kroužku ve stupních (kde katalog velikost neuvádí nebo je zjevně jiná než objekt na fotce)
    pole = max(18.0, min(44.0, max(size, 2 * kr) * 4))
    vyrez(ra, de, pole, os.path.join(OUT, o['id'] + '_nase.webp'))
    imgs = []
    for n, (k, i, cap) in enumerate(o['imgs']):
        im = Image.open(io.BytesIO(get(CDN[k] % ((i, i) if k == 'N' else i), True))).convert('RGB')
        if max(im.size) > 1280:
            im.thumbnail((1280, 1280), Image.LANCZOS)
        fn = f"{o['id']}_{n + 1}.webp"
        im.save(os.path.join(OUT, fn), 'WEBP', quality=80, method=6)
        nahled(im, os.path.join(OUT, f"{o['id']}_{n + 1}t.webp"))
        total += os.path.getsize(os.path.join(OUT, fn))
        imgs.append({'f': fn, 't': f"{o['id']}_{n + 1}t.webp", 'w': im.size[0], 'h': im.size[1], 'cap': cap, 'autor': credit(k, i), 'arch': ARCH[k], 'lic': LIC[k], 'url': PAGE[k] % i})
    src = [{'t': t, 'u': u} for t, u in o['src']]
    if o['kat']:
        src.append({'t': OPENNGC[0], 'u': OPENNGC[1]})
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
for f in os.listdir(OUT):  # soubory, které už žádný objekt nepoužívá
    if f.endswith('.webp') and not any(f == o['id'] + '_nase.webp' or any(f in (im['f'], im['t']) for im in o['imgs']) for o in res):
        os.remove(os.path.join(OUT, f))
json.dump({'stav': STAV, 'skupiny': SKUP, 'objekty': res}, open(os.path.join(ROOT, 'src', 'data', 'obloha.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
# přehled původu a licencí pro CREDITS (zdroje/OBLOHA.md)
md = ['# Objekty na obloze: původ fotografií a údajů', '',
      'Soubor vytváří `tools/data/obloha_build.py`; neupravovat ručně. Stav k ' + STAV + '.', '',
      '- Fotografie z archivů ESO, ESA/Hubble a ESA/Webb jsou pod licencí **CC BY 4.0** (uvést autora; úprava: zmenšení na nejvýš 1280 bodů a převod do WebP).',
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
