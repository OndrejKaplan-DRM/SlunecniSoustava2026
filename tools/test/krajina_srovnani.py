# Srovnávací list: snímek sondy × pohled z povrchu v aplikaci (verze 2.2).
# Použití: python3 -I tools/test/krajina_srovnani.py <složka se snímky krajina_snimky.mjs> <výstup.jpg>
import sys, os
from PIL import Image, ImageDraw, ImageFont
kraj, out = sys.argv[1], sys.argv[2]
foto = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'zdroje', 'povrchy')
PARY = [
    ('as15-87-11748', 'mesic_hadley', 'Měsíc, Apollo 15: Hadley Delta na jihu', 'NASA/JSC AS15-87-11748'),
    ('PIA19912', 'mars_gale', 'Mars, Curiosity v kráteru Gale: Mount Sharp', 'NASA/JPL-Caltech/MSSS PIA19912 (barvy vyvážené na pozemské světlo)'),
    ('PIA19400', 'mars_zapad', 'Mars: západ Slunce, modrá záře', 'NASA/JPL-Caltech/MSSS/Texas A&M PIA19400'),
    ('PIA07232', 'titan', 'Titan, Huygens: oblázky a oranžový opar', 'ESA/NASA/JPL/Univ. of Arizona PIA07232'),
    ('as17-137-20979', 'mesic_den', 'Měsíc, Apollo 17: regolit ve dne', 'NASA/JSC AS17-137-20979'),
    ('PIA22074', 'mars_den', 'Mars, Opportunity: prachová pláň, obloha', 'NASA/JPL-Caltech/Cornell/ASU PIA22074'),
]
W, H = 560, 340
try:
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
    small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 12)
except Exception:
    font = small = ImageFont.load_default()
sheet = Image.new('RGB', (2 * W + 30, len(PARY) * (H + 46) + 10), (14, 16, 24))
d = ImageDraw.Draw(sheet)
for k, (f, r, t, c) in enumerate(PARY):
    y = 10 + k * (H + 46)
    d.text((10, y), t, fill=(255, 230, 160), font=font)
    for j, (path, lab) in enumerate([(os.path.join(foto, f + '.jpg'), 'snímek sondy: ' + c), (os.path.join(kraj, r + '.jpg'), 'aplikace 2.2 (' + r + ')')]):
        x = 10 + j * (W + 10)
        if os.path.exists(path):
            im = Image.open(path).convert('RGB')
            im.thumbnail((W, H))
            sheet.paste(im, (x + (W - im.width) // 2, y + 22 + (H - im.height) // 2))
        d.text((x, y + 24 + H), lab, fill=(190, 200, 220), font=small)
sheet.save(out, quality=86)
print(out, sheet.size)
