# Doplní do tools/test/ref_povrch.json u případů z povrchu Země rozdíl TDB − UT (s), který Horizons v daném okamžiku použil.
# Důvod: po roce 2027 Horizons drží poslední známou hodnotu (69 s), model aplikace počítá s parabolou Espenaka a Meeuse
# (rok 3000: 4 400 s). Zkouška věrnosti pak u Země použije stejný rozdíl jako Horizons a měří jen geometrii;
# rozdíl obou odhadů ΔT vypisuje zvlášť. Použití: python3 -I tools/model/vernost/dt_zeme.py
import json, os, re, sys

sys.path.insert(0, os.path.dirname(__file__))
import hz

F = 'tools/test/ref_povrch.json'
ref = json.load(open(F))
memo = {}
for c in ref['pripady']:
    if c['c'] != 'earth':
        continue
    jd = c['jd']
    if jd not in memo:
        t = hz.ask({'COMMAND': '10', 'EPHEM_TYPE': 'OBSERVER', 'CENTER': '500@399', 'TLIST': f'{jd:.6f}', 'TLIST_TYPE': 'JD',
                    'TIME_TYPE': 'UT', 'QUANTITIES': '30', 'CSV_FORMAT': 'YES', 'CAL_FORMAT': 'JD'})
        r = hz.rows(t)
        memo[jd] = float(r[0].split(',')[3]) if r else None
        print(len(memo), jd, memo[jd], flush=True)
    c['dt'] = memo[jd]
json.dump(ref, open(F, 'w'), separators=(',', ':'))
print('hotovo', len(memo))
