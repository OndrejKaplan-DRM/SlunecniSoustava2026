import json,re,html,subprocess,os,hashlib,sys
PAGE={'E':'https://www.eso.org/public/images/%s/','H':'https://esahubble.org/images/%s/','W':'https://esawebb.org/images/%s/'}
def get(u):
    f='cache/'+hashlib.md5(u.encode()).hexdigest()
    for _ in range(2):
        if os.path.exists(f) and os.path.getsize(f)>2000: break
        subprocess.run(['curl','-s','-L','-m','45','-o',f,u])
    return open(f,encoding='utf8',errors='ignore').read() if os.path.exists(f) else ''
def clean(s): return re.sub(r'\s+',' ',html.unescape(re.sub('<.*?>',' ',s))).strip()
V=json.load(open(sys.argv[3] if len(sys.argv)>3 else 'vyber.json'))
N=int(sys.argv[1]) if len(sys.argv)>1 else 520
only=sys.argv[2].split(',') if len(sys.argv)>2 and sys.argv[2] else None
for k,L in V.items():
    if only and k not in only: continue
    print('##',k,flush=True)
    for n,x in enumerate(L):
        a,i=x.split(':'); h=get(PAGE[a]%i)
        t=re.search(r'<title>(.*?)</title>',h,re.S); t=clean(t.group(1))[:60] if t else 'NENALEZENO'
        body=re.sub(r'<script.*?</script>|<style.*?</style>','',h,flags=re.S)
        txt=clean(body)
        d=re.search(r'Distance:\s*([^A-Z]{3,40}?)(?= Constellation| Category| [A-Z])',txt)
        ra=re.search(r'Position \(RA\):\s*([\d ]+\.?\d*)',txt); de=re.search(r'Position \(Dec\):\s*([-+\d° \'".]+?)(?= Field| Orient)',txt)
        cr=re.search(r'<div class="credit">(.*?)</div>',h,re.S)
        # popis: text mezi nadpisem a "Credit"
        m=re.search(re.escape(t.split('|')[0].strip()[:25])+r'(.{80,}?)(Credit:|About the Image)',txt)
        desc=(m.group(1) if m else '')
        desc=re.sub(r'^.*?(?:100vw" /> |sizes="[^"]*" /> )','',desc)
        print(f"  {x} «{t}» D={d.group(1).strip() if d else '-'} RA={ra.group(1).strip() if ra else '-'} Dec={de.group(1).strip() if de else '-'}")
        ly=re.findall(r'[^.]{0,70}light[- ]years?[^.]{0,40}',txt)
        print('     ',desc[:N] if n==0 else desc[:N//3])
        if not d and ly: print('      LY:',' || '.join(ly[:3])[:330])
