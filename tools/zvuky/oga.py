# Hledání a stahování balíčků z opengameart.org – jen CC0. Použití: oga.py search <slovo> | info <slug> | get <slug>
import sys, re, os, urllib.request, urllib.parse, html, json
UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) s200-sound-picker'}
def get(u, binary=False):
    r = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60); d = r.read(); return d if binary else d.decode('utf8', 'replace')
def info(slug):
    p = get('https://opengameart.org/content/' + slug)
    lic = re.findall(r'class=\'license-name\'>([^<]+)<', p) or re.findall(r'license-name[^>]*>([^<]+)<', p)
    files = re.findall(r'href="(https://opengameart\.org/sites/default/files/[^"]+)"', p)
    files = [f for f in dict.fromkeys(files) if re.search(r'\.(zip|ogg|wav|mp3|flac|7z|rar)$', f, re.I)]
    title = html.unescape(re.search(r'<title>([^<|]+)', p).group(1).strip()); author = re.findall(r'class="username"[^>]*>([^<]+)<', p)
    return dict(slug=slug, title=title, license=sorted(set(lic)), author=author[:1], files=files)
cmd = sys.argv[1]
if cmd == 'search':
    q = urllib.parse.quote(sys.argv[2]); typ = sys.argv[3] if len(sys.argv) > 3 else '13'
    p = get(f'https://opengameart.org/art-search-advanced?keys={q}&field_art_type_tid%5B%5D={typ}&field_art_licenses_tid%5B%5D=4&sort_by=count&sort_order=DESC&items_per_page=48')
    seen = []
    for m in re.finditer(r'<span class="art-preview-title"><a href="/content/([^"]+)">([^<]+)</a>', p):
        if m.group(1) not in seen: seen.append(m.group(1)); print(m.group(1), '|', html.unescape(m.group(2)))
elif cmd == 'info':
    for s in sys.argv[2:]: print(json.dumps(info(s), ensure_ascii=False))
elif cmd == 'get':
    for s in sys.argv[2:]:
        i = info(s)
        if i['license'] != ['CC0']: print('PŘESKOČENO (licence)', s, i['license']); continue
        d = os.path.join('raw', s); os.makedirs(d, exist_ok=True); json.dump(i, open(os.path.join(d, '_info.json'), 'w'), ensure_ascii=False)
        for f in i['files']:
            fn = os.path.join(d, urllib.parse.unquote(f.rsplit('/', 1)[1]))
            if not os.path.exists(fn): open(fn, 'wb').write(get(f.replace(' ', '%20'), True))
            print('OK', fn, os.path.getsize(fn))
