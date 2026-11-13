import subprocess,json,re,sys
def curl(url,params):
    a=['curl','-sS','-m','90','-G',url]
    for k,v in params.items(): a+=['--data-urlencode',f'{k}={v}']
    return subprocess.run(a,capture_output=True,text=True).stdout
H='https://ssd.jpl.nasa.gov/api/horizons.api'
out={}
def elem(key,cmd,jd):
    t=curl(H,{'format':'text','COMMAND':f"'{cmd}'",'EPHEM_TYPE':'ELEMENTS','CENTER':"'500@10'",'TLIST':f"'{jd}'",'REF_PLANE':'ECLIPTIC','OUT_UNITS':'AU-D'})
    rec=re.search(r'Rec #:\s*(\d+)',t); b=t[t.find('$$SOE'):t.find('$$EOE')]
    g=lambda k: float(re.search(k+r'\s*=\s*([-+0-9.E]+)',b).group(1))
    try: out[key]=dict(rec=rec.group(1) if rec else None,e=g('EC'),q=g('QR'),i=g('IN'),O=g('OM'),w=g('W'),Tp=g('Tp'),epocha=jd)
    except Exception as ex: out[key]=dict(err=t[:400])
elem('halley837','DES=1P; CAP<838;',2026830.5)
elem('halley1066','DES=1P; CAP<1067;',2110480.5)
elem('halley1759','DES=1P; CAP<1760;',2363590.5)
elem('halley1910','DES=1P; CAP<1911;',2418780.5)
elem('halley2061','DES=1P; CAP;',2474030.5)
elem('swift2126','DES=109P; CAP;',2497770.5)
C='https://ssd-api.jpl.nasa.gov/cad.api'
def cad(key,des,d0,d1,dm,body='Earth',extra={}):
    p={'des':des,'date-min':d0,'date-max':d1,'dist-max':dm,'body':body}; p.update(extra)
    out[key]=json.loads(curl(C,p)).get('data')
cad('eros','433','1930-01-01','1932-01-01','0.3')
cad('duende','367943','2013-01-01','2013-12-31','0.01')
cad('apophis','99942','2029-01-01','2029-12-31','0.01')
cad('phaethon','3200','2093-01-01','2093-12-31','0.05')
cad('bennu','101955','2135-01-01','2135-12-31','0.01')
cad('hyakutake','C/1996 B2','1996-01-01','1996-12-31','0.3')
cad('atlas_mars','3I','2025-01-01','2026-12-31','0.5','Mars')
S='https://ssd-api.jpl.nasa.gov/sbdb.api'
for k,s in [('atlas3i','3I'),('kirch','C/1680 V1'),('hyak','C/1996 B2')]:
    j=json.loads(curl(S,{'sstr':s,'full-prec':'true'}))
    el={x['name']:x['value'] for x in j.get('orbit',{}).get('elements',[])}
    out['sb_'+k]=dict(name=j.get('object',{}).get('fullname'),q=el.get('q'),e=el.get('e'),tp=el.get('tp'),i=el.get('i'))
def mars(key,a,b,step):
    t=curl(H,{'format':'text','COMMAND':"'499'",'EPHEM_TYPE':'OBSERVER','CENTER':"'500@399'",'START_TIME':f"'{a}'",'STOP_TIME':f"'{b}'",'STEP_SIZE':f"'{step}'",'QUANTITIES':"'20'",'CSV_FORMAT':'YES'})
    best=None
    for l in t[t.find('$$SOE'):t.find('$$EOE')].split('\n')[1:]:
        f=[x.strip() for x in l.split(',')]
        if len(f)>4:
            d=float(f[3]); 
            if best is None or d<best[1]: best=(f[0],d)
    out[key]=dict(kdy=best[0],au=best[1],km=best[1]*149597870.7) if best else t[:300]
mars('mars2003','2003-08-27 00:00','2003-08-28 00:00','1m')
mars('mars2287','2287-08-20','2287-09-10','10m')
json.dump(out,open('/tmp/jpl/jpl.json','w'),indent=1); print(json.dumps(out,indent=1)[:6000])
