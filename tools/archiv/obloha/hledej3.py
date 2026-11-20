import json,csv,io,sys,re,urllib.parse,subprocess,os,hashlib
def get(u):
    f='cache/'+hashlib.md5(u.encode()).hexdigest()
    for _ in range(2):
        if os.path.exists(f) and os.path.getsize(f)>300: break
        subprocess.run(['curl','-s','-L','-m','45','-o',f,u])
    return open(f,encoding='utf8',errors='ignore').read() if os.path.exists(f) else ''
def dj(base,q):
    h=get((f'{base}/images/?search=' if 'eso.org' not in base else f'{base}/public/images/?search=')+urllib.parse.quote(q))
    m=re.search(r'var images = (\[.*?\]);',h,re.S)
    if not m: return []
    return [(e.group(1),e.group(2)[:int(sys.argv[2]) if len(sys.argv)>2 else 40]) for e in re.finditer(r"id: '([^']+)',\s*title: '((?:[^'\\]|\\.)*)'",m.group(1))]
K=json.load(open(sys.argv[1]))
CAT={}
for f in ('NGC.csv','addendum.csv'):
    for r in csv.DictReader(open(f,encoding='utf8'),delimiter=';'): CAT[r['Name']]=r
for k,(kat,q) in K.items():
    c=CAT.get(kat) if kat else None
    print(flush=True,end='');print(f"## {k} [{kat}] "+(f"{c['RA'][:8]} {c['Dec'][:9]} {c['Const']} maj={c['MajAx']} V={c['V-Mag']}" if c else ('NENÍ V KATALOGU' if kat else 'ručně')))
    for nm,base in ((('H','https://esahubble.org'),) if 'HUB' in __import__('os').environ else ())+(('E','https://www.eso.org'),('W','https://esawebb.org')):
        r=dj(base,q)[:3]
        if r: print('  ',nm,' | '.join(f'{a}: {b}' for a,b in r))
