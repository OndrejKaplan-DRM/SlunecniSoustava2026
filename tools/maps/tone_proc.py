#!/usr/bin/env python3
"""Tělesa bez skutečné mapy (mk = proc): sjednotit odstín vymyšleného povrchu s okolními tělesy téže soustavy.
Malé měsíce Jupiteru a Neptunu byly hnědé („hlína“), kdežto sousedé se skutečnou mapou jsou šedí – působilo to, jako by šlo o úplně jiný druh těles.
Sytost barvy se sníží na podíl K (výchozí 0,35); jas se nemění. Upraví dist/maps/<id>.webp a barvu v src/data/cat.json. Spustit jen jednou."""
import json, os, sys, numpy as np
from PIL import Image
K = float(sys.argv[1]) if len(sys.argv) > 1 else 0.35
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'); cp = os.path.join(root, 'src', 'data', 'cat.json'); cat = json.load(open(cp)); n = 0
for b in cat['bodies']:
    if b.get('mk') != 'proc' or b.get('type') != 'moon' or b.get('parent') not in ('jupiter', 'neptune'): continue
    c = b['col']; L = .299 * c[0] + .587 * c[1] + .114 * c[2]; b['col'] = [round(L + (x - L) * K, 3) for x in c]
    f = os.path.join(root, 'dist', 'maps', b['id'] + '.webp')
    if os.path.exists(f):
        a = np.asarray(Image.open(f).convert('RGB'), np.float32); l = (a @ np.array([.299, .587, .114], np.float32))[..., None]
        Image.fromarray(np.clip(l + (a - l) * K + .5, 0, 255).astype(np.uint8)).save(f, 'WEBP', quality=90, method=6)
    n += 1
json.dump(cat, open(cp, 'w'), ensure_ascii=False, separators=(',', ':')); print('upraveno těles:', n)
