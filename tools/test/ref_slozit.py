# Složí referenční listy: snímek modelu (tools/test/ref_snimky.mjs) vedle skutečné fotografie NASA (docs/ref/foto/),
# pod tím popisek s místem, časem a čísly model × JPL Horizons (tools/test/t_ref_sceny.mjs, výstup SCENY_JSON).
# Použití: python3 -I tools/test/ref_slozit.py <složka se snímky modelu> <výsledky t_ref_sceny.json> docs/ref
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

src, vys, out = sys.argv[1], sys.argv[2], sys.argv[3]
ref = {s['id']: s for s in json.load(open('tools/test/ref_sceny.json'))['sceny']}
res = {r['id']: r for r in json.load(open(vys))}
meta = json.load(open(os.path.join(src, 'meta.json')))
F = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
f1, f2, f3 = ImageFont.truetype(FB, 19), ImageFont.truetype(F, 15), ImageFont.truetype(F, 13)
JM = {'sun': 'Slunce', 'moon': 'Měsíc', 'earth': 'Země', 'phobos': 'Phobos', 'deimos': 'Deimos', 'venus': 'Venuše', 'mercury': 'Merkur',
      'jupiter': 'Jupiter', 'saturn': 'Saturn', 'mars': 'Mars', 'europa': 'Europa', 'ganymede': 'Ganymedes', 'io': 'Io'}
MISTO = {'mars': 'Mars', 'earth': 'Země', 'moon': 'Měsíc', 'io': 'Io'}
os.makedirs(out, exist_ok=True)
index = []


def ang(d):
    return f'{d * 3600:.1f}″' if d < 1 / 60 else f'{d * 60:.2f}′' if d < 1 else f'{d:.2f}°'


for m in meta:
    key, s = m['id'], ref[m['scena']]
    r = res.get(s['id'], {})
    im = Image.open(os.path.join(src, key + '.png')).convert('RGB')
    W, H = im.size
    foto = s.get('foto')
    if foto and m['fov'] < 5:  # úkaz zblízka: výřez kolem středu
        c = 420
        im = im.crop((W // 2 - c // 2, H // 2 - c // 2, W // 2 + c // 2, H // 2 + c // 2))
    elif foto:
        im = im.resize((int(W * 420 / H), 420))
    else:
        im = im.resize((960, int(H * 960 / W)))
    panes = [(im, 'model Sluneční soustava 200')]
    if foto and key == s['id']:
        p = os.path.join(out, 'foto', foto['nasa_id'] + '.jpg')
        if os.path.exists(p):
            ph = Image.open(p).convert('RGB')
            ph = ph.resize((int(ph.width * im.height / ph.height), im.height))
            panes.append((ph, f"skutečnost: NASA {foto['nasa_id']} ({foto['autor']})"))
    pd = os.path.join(out, 'foto', 'PIA17935.jpg')
    if key.endswith('_detail') and os.path.exists(pd):  # výřez Země a Měsíce z Marsu
        ph = Image.open(pd).convert('RGB')
        ph = ph.resize((int(ph.width * im.height / ph.height), im.height))
        panes.append((ph, 'skutečnost: NASA PIA17935 (NASA/JPL-Caltech/MSSS/TAMU)'))
    lines = [s['popis'] + (' – výřez' if key.endswith('_detail') else ''),
             f"{MISTO.get(s['c'], s['c'])} {abs(s['lat']):.2f}° {'s.' if s['lat'] >= 0 else 'j.'} š., {s['lon'] % 360:.2f}° v. d. · "
             f"{s['ut'] if key == s['id'] or not s.get('snimek') else s['ut']} UT · zorné pole {m['fov']}° na výšku"]
    if 'min_sep' in s and r.get('ukaz'):
        u = r['ukaz']
        lines.append(f"{JM.get(s['par'][0], s['par'][0])} × {JM.get(s['par'][1], s['par'][1])}: nejtěsněji {s['ut']} UT podle JPL Horizons "
                     f"({u['sep_hz']:.2f}′ mezi středy); model {u['dt']:+.0f} s, {u['sep_model']:.2f}′")
    if r.get('cile'):
        lines.append('poloha model × Horizons: ' + ', '.join(f"{JM.get(k, k)} {ang(v['chyba'])}" for k, v in r['cile'].items()))
    if foto:
        lines.append('Pozn.: ' + foto['pozn'])
    if s.get('snimek') and key == s['id']:
        lines.append(f"Snímek modelu v {s['snimek']} UT (nejtěsnější přiblížení nastalo až pod obzorem).")
    pw = sum(p[0].width for p in panes) + 12 * (len(panes) - 1)
    cw = max(pw, 960)
    ch = 34 + 22 * (len(lines) - 1) + 30
    g = Image.new('RGB', (cw + 24, panes[0][0].height + 24 + 18 + ch), (12, 14, 20))
    d = ImageDraw.Draw(g)
    x = 12
    for p, t in panes:
        g.paste(p, (x, 12))
        d.text((x, 12 + p.height + 3), t, font=f3, fill=(170, 180, 200))
        x += p.width + 12
    y = 12 + panes[0][0].height + 24
    d.text((12, y), lines[0], font=f1, fill=(255, 231, 173))
    y += 28
    for t in lines[1:]:
        d.text((12, y), t, font=f2, fill=(220, 226, 240))
        y += 22
    g.save(os.path.join(out, key + '.jpg'), quality=86)
    index.append((key, s, r))
    print(key, g.size)

# přehled do docs/REFERENCNI_SNIMKY.md
md = ['# Referenční snímky: model × skutečnost', '',
      'Každý list ukazuje pohled z povrchu v modelu (vlevo) a u úkazů ze sond skutečnou fotografii NASA (vpravo). Čísla pod snímkem '
      'porovnávají model s JPL Horizons (nezávislá efemerida NASA/JPL): úhel mezi směrem modelu a Horizons pro každé těleso a u úkazů '
      'čas a vzdálenost největšího přiblížení, které model najde sám. Fotografie mají přibližné místo a čas z popisu NASA; přesný okamžik '
      'úkazu je z Horizons. Staví `node tools/test/ref_snimky.mjs` → `SCENY_JSON=… npm run test:sceny` → `python3 -I tools/test/ref_slozit.py`.', '',
      '| Scéna | Kdy (UT) | Úkaz: model − Horizons | Poloha, nejhůř | Fotografie |', '|---|---|---|---|---|']
for key, s, r in index:
    u = r.get('ukaz')
    md.append(f"| [{s['popis']}{' (výřez)' if key.endswith('_detail') else ''}](ref/{key}.jpg) | {s['ut']} | "
              f"{(f'{u['dt']:+.0f} s, {u['sep_model']:.2f}′ × {u['sep_hz']:.2f}′') if u else '—'} | {ang(r['max']) if 'max' in r else '—'} | "
              f"{(s['foto']['nasa_id'] + ', ' + s['foto']['autor']) if s.get('foto') else '—'} |")
md += ['', 'Fotografie NASA jsou volná díla (NASA Image and Video Library, images.nasa.gov), uvedení autorů podle popisu snímku; '
       'v repu jsou jen zmenšené kopie pro porovnání, aplikace je nenačítá.', '']
open('docs/REFERENCNI_SNIMKY.md', 'w').write('\n'.join(md))
print('docs/REFERENCNI_SNIMKY.md')
