import json,subprocess,urllib.parse,csv,io,sys
ST=[('sirius',32349,'Sirius'),('kanopus',30438,'Canopus'),('alfacen',71683,'Alpha Centauri'),('arktur',69673,'Arcturus'),('vega',91262,'Vega'),('kapela',24608,'Capella'),
('rigel',24436,'Rigel'),('prokyon',37279,'Procyon'),('achernar',7588,'Achernar'),('betelgeuze',27989,'Betelgeuse'),('hadar',68702,'Beta Centauri'),('altair',97649,'Altair'),
('acrux',60718,'Acrux'),('aldebaran',21421,'Aldebaran'),('antares',80763,'Antares'),('spika',65474,'Spica'),('pollux',37826,'Pollux (star)'),('fomalhaut',113368,'Fomalhaut'),
('deneb',102098,'Deneb'),('mimosa',62434,'Mimosa (star)'),('regulus',49669,'Regulus'),('polarka',11767,'Polaris'),('kastor',36850,'Castor (star)'),('mizar',65378,'Mizar'),
('algol',14576,'Algol'),('mira',10826,'Mira'),('albireo',95947,'Albireo'),('proxima',70890,'Proxima Centauri'),('barnard',87937,"Barnard's Star"),('thuban',68756,'Thuban'),
('betapic',27321,'Beta Pictoris'),('peg51',113357,'51 Pegasi'),('deltacep',110991,'Delta Cephei'),('cyg61',104214,'61 Cygni'),('mucep',107259,'Mu Cephei'),('tauceti',8102,'Tau Ceti'),
('epseri',16537,'Epsilon Eridani'),('alnilam',26311,'Alnilam'),('bellatrix',25336,'Bellatrix'),('dubhe',54061,'Dubhe'),('rdor',21479,'R Doradus'),('zetaoph',81377,'Zeta Ophiuchi'),
('epsind',108870,'Epsilon Indi'),('vycma',35793,'VY Canis Majoris'),('gamvel',39953,'Gamma Velorum'),('zetapup',39429,'Zeta Puppis'),('alcor',65477,'Alcor (star)'),('alfacenB',71681,'Alpha Centauri'),
('adhara',33579,'Adhara'),('shaula',85927,'Shaula'),('gacrux',61084,'Gacrux'),('alphard',46390,'Alphard'),('rscl',6759,'R Sculptoris'),('pi1gru',110478,'Pi1 Gruis'),('l2pup',34922,'L2 Puppis'),
('raqr',117054,'R Aquarii'),('rspup',40233,'RS Puppis'),('agcar',53461,'AG Carinae'),('pcyg',100044,'P Cygni'),('rhocas',117863,'Rho Cassiopeiae'),('epsaur',23416,'Epsilon Aurigae'),('ttau',20390,'T Tauri')]
def tap(q):
    r=subprocess.run(['curl','-sS','-m','90','-G','https://gea.esac.esa.int/tap-server/tap/sync','--data-urlencode','REQUEST=doQuery','--data-urlencode','LANG=ADQL','--data-urlencode','FORMAT=csv','--data-urlencode','QUERY='+q],capture_output=True,text=True)
    return list(csv.DictReader(io.StringIO(r.stdout)))
ids=','.join(str(h) for _,h,_ in ST)
A={int(r['hip']):r for r in tap(f'SELECT * FROM public.hipparcos_newreduction WHERE hip IN ({ids})')}
B={int(r['hip']):r for r in tap(f'SELECT * FROM public.hipparcos WHERE hip IN ({ids})')}
out={}
for k,h,w in ST:
    a=A.get(h); b=B.get(h)
    if not a or not b: print('CHYBI',k,h, bool(a), bool(b)); continue
    out[k]=dict(hip=h,wiki=w,plx=float(a['plx']),e_plx=float(a['e_plx']),ra=float(b.get('ra') or b.get('radeg') or 0),de=float(b.get('de') or b.get('dedeg') or 0),vmag=b.get('vmag'),sp=b.get('sptype'),bv=b.get('b_v'))
    o=out[k]; ly=3261.5638/o['plx'] if o['plx']>0 else None
    print(f"{k:11s} HIP {h:6d} plx {o['plx']:8.2f} ± {o['e_plx']:5.2f}  ly {ly and round(ly,1)}  V {o['vmag']}  {o['sp']}  ra {o['ra']:.3f} de {o['de']:.3f}")
json.dump(out,open('hip.json','w'),indent=1)
if len(sys.argv)>1: print(list(A[32349].keys())); print(list(B[32349].keys()))
