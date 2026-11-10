# rozbalí archivy v raw/<balíček>/ do raw/<balíček>/x/ (jen běžné soubory, bez cest ven) a vypíše inventář zvuků s délkou
import os, zipfile, subprocess, json, sys
import py7zr
inv = []
for pk in sorted(os.listdir('raw')):
    d = os.path.join('raw', pk); x = os.path.join(d, 'x')
    for f in os.listdir(d):
        p = os.path.join(d, f)
        if os.path.isdir(p) or os.path.exists(x + '_' + f + '.done'): continue
        try:
            if f.lower().endswith('.zip'):
                z = zipfile.ZipFile(p); os.makedirs(x, exist_ok=True)
                for n in z.namelist():
                    if n.endswith('/') or '..' in n or n.startswith('/'): continue
                    t = os.path.join(x, n); os.makedirs(os.path.dirname(t), exist_ok=True); open(t, 'wb').write(z.read(n))
            elif f.lower().endswith('.7z'):
                os.makedirs(x, exist_ok=True); py7zr.SevenZipFile(p).extractall(x)
            else: continue
            open(x + '_' + f + '.done', 'w').close()
        except Exception as e: print('CHYBA', p, e, file=sys.stderr)
    for root, _, fs in os.walk(d):
        for f in fs:
            if f.lower().rsplit('.', 1)[-1] in ('wav', 'ogg', 'mp3', 'flac'):
                p = os.path.join(root, f)
                r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p], capture_output=True, text=True)
                try: dur = float(r.stdout.strip())
                except: continue
                inv.append(dict(pack=pk, path=p, dur=round(dur, 2)))
json.dump(inv, open('inventory.json', 'w'), ensure_ascii=False, indent=0)
from collections import Counter
c = Counter(i['pack'] for i in inv)
for k, v in c.items(): print(v, k)
print('celkem', len(inv))
