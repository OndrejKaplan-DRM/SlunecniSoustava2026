import json,math,re
R='/home/claude/slunecnisoustava2026/'
K=json.load(open(R+'tools/data/kandidati.json')); M={r['id']:r for r in json.load(open('/tmp/kAll.json'))}
# Z = zajímavost úkazu, P = příběh, O = ověřitelnost pramenem (1–5)
ZPO={'s-0584':(5,5,4),'s-0430':(3,4,4),'s1133':(4,3,5),'s1415':(5,5,5),'s1706':(5,4,5),'s1715':(4,5,5),'s1842':(4,4,5),'s1868':(4,5,5),'s1919':(5,5,5),'s1999':(5,5,5),'s2026':(4,3,5),'s2027':(5,3,5),'s2045':(4,2,5),'s2081':(5,3,5),'s2135':(5,4,5),'s2186':(5,3,5),
'm-0412':(4,5,4),'m-0330':(4,5,4),'m1453':(3,5,5),'m1504':(4,5,5),'m2018':(4,2,5),'m2028':(4,3,5),'m2029':(5,2,5),'m2123':(4,2,5),
'pM1631':(4,5,5),'pV1639':(5,5,5),'pV1761':(5,5,5),'pV1769':(5,5,5),'pV1882':(4,3,5),'pV2004':(5,3,5),'pV2012':(5,3,5),'pM2019':(3,2,5),'pM2032':(3,2,5),'pV2117':(5,3,5),
'k-0006':(4,5,3),'k-0001':(5,5,3),'k1170':(5,4,3),'k1226':(4,2,4),'k1563':(4,5,4),'k1590':(5,4,3),'k1613':(5,5,3),'k1737':(5,4,3),'k1818':(5,3,4),'k2020':(5,4,4),'k2026':(3,2,2),'k2065':(5,3,4),'k2080':(4,2,4),'k2133':(4,2,3),
'g1186':(5,5,3),'g1345':(4,5,2),'g1524':(4,5,2),'g1962':(5,4,3),'g2000':(4,3,3),'g2022':(4,2,2),'g2040':(5,3,3),'g2161':(4,2,2),
'c837':(5,4,5),'c1066':(5,5,4),'c1680':(4,5,4),'c1759':(4,5,5),'c1910':(5,5,5),'c1996':(4,3,5),'c2061':(5,4,5),'c2126':(4,3,5),
'p1931':(3,4,5),'p2003':(4,3,5),'p2013':(4,5,5),'p2025':(4,4,5),'p2029':(5,4,5),'p2093':(3,3,5),'p2135':(4,3,5),'p2287':(3,2,5),
's2090':(4,2,5),'s2151':(4,2,5),'pM2039':(3,2,5),'pV2125':(5,2,5),'k2067':(4,2,4),'k2079':(4,2,4),'k2123':(5,2,3),'c2134':(5,3,5),
'h0185':(3,4,3),'h1006':(5,4,3),'h1054':(5,5,3),'h1572':(5,5,3),'h1604':(5,5,3),'h1843':(4,3,3),'h1918':(4,3,3),'h1987':(5,4,4)}
PZ={'s1133':'model dává v Praze úplné, NASA 0,973 – karta podle pramene','s1706':'model v Praze 0,987, NASA úplné – karta podle pramene','k1737':'ze středu Země 0,63′; zákryt viděn z Greenwiche','c1680':'řešič dráhy je u téměř parabolické komety v přísluní nepřesný – opravit','p1931':'elementy pro rok 1931 (JPL)','p2013':'elementy před průletem (JPL); model nepočítá přitažlivost Země, proto o 14 000 km dál','p2093':'elementy pro rok 2093 (JPL)','p2135':'elementy pro rok 2135 (JPL); JPL sám uvádí 195–213 tis. km','g1345':'nejtěsněji 5. 3.; fakulta uvádí 20. 3.','g2022':'nejužší 4. 6.; s Měsícem 24. 6.','k2026':'bez pramene – doplnit z ročenky','g2161':'úhel měřen od Slunce','s2090':'v Praze Slunce už pod obzorem'}
MO={'p2013':2,'c1680':3,'k1737':3}
MES=['','ledna','února','března','dubna','května','června','července','srpna','září','října','listopadu','prosince']
def den(d): 
    y,m,dd=d; return f"{dd}. {m}. {y if y>0 else str(1-y)+' př. n. l.'}"
def hm(s): return s[-5:]
def dm(s):
    a=s[:-6].split('-'); return f"{int(a[-1])}. {int(a[-2])}."
rows=[]; seen=set()
for c in K:
    i=c['id']; r=M.get(i,{}); ref=c.get('ref',{}); t=c['typ']; kat=''; mod=''; pr=''; m=None
    if i in('k-0006b','k-0006c'): continue
    if i=='k-0006a':
        i='k-0006'; kat='Konjunkce'; a,b,cc=M['k-0006a'],M['k-0006b'],M['k-0006c']
        mod=f"{a['sep']:.0f}′ / {b['sep']:.0f}′ / {cc['sep']:.0f}′ ({dm(a['kdy'])}, {dm(b['kdy'])} a {dm(cc['kdy'])})"; pr='tři setkání: konec května, začátek října, začátek prosince'; m=4
    elif t=='slunce':
        kat='Zatmění Slunce'; dlat=abs(r['lat']-ref['lat']); dlon=abs(r['lon']-ref['lon'])*math.cos(math.radians(ref['lat']))
        mod=f"{hm(r['kdy'])} UT, osa {r['lat']:.1f}° / {r['lon']:.1f}°; Praha {r['loc']['mag']:.2f}"
        pm=ref['misto']; pr=f"{hm(r['ref'])} UT, osa {ref['lat']:.1f}° / {ref['lon']:.1f}°; Praha {'pod obzorem' if pm['vyska']<0 and pm['faze']>0 else 'úplné' if pm['uplne'] else ('%.2f'%pm['faze']).replace('.',',') if pm['faze']>0 else 'nevidět'}"
        e=max(abs(r['dt'])/3,dlat/1.5,dlon/1.5); m=5 if e<=1 else 4 if e<=2 else 3
        if i in('s1133','s1706'): m=min(m,3)
    elif t=='mesic':
        kat='Zatmění Měsíce'; mod=f"{hm(r['kdy'])} UT, velikost {r['umag']:.2f}, úplné {r['tot']:.0f} min"; pr=f"{hm(r['ref'])} UT, velikost {ref['umag']:.2f}, úplné {ref['tot']:.0f} min"
        e=max(abs(r['dt'])/3,abs(r['umag']-ref['umag'])/0.04); m=5 if e<=1 else 4
    elif t=='dvojice':
        d=c.get('druh'); kat={'prechod':'Přechod','zakryt':'Zákryt','konjunkce':'Konjunkce'}[d]
        mod=f"{r['sep']:.2f}′, {dm(r['kdy'])} {hm(r['kdy'])} UT" if d!='prechod' else f"{r['sep']:.2f}′, {hm(r['kdy'])} UT"
        if ref.get('sep') is not None:
            pr=f"{ref['sep']:.2f}′"+(f", {hm(r['ref'])} UT" if c.get('ut') else ''); e=abs(r['sep']-ref['sep']); m=5 if e<=0.12 else 4
        else: pr=(f"{hm(r['ref'])} UT" if c.get('ut') else 'jen datum'); m=4
        if i=='k1737': m=3
        if d!='prechod' and r['elong']<15: mod+=f"; {r['elong']:.0f}° od Slunce"
    elif t=='skupina':
        kat='Seskupení'; mod=f"rozpětí {r['spread']:.1f}°, {dm(r['kdy'])}"; pr='jen datum'; m=4
    elif t=='blizko':
        kat='Kometa' if c.get('druh')=='kometa' else 'Průlet'
        big=r['km']>3e6; mod=(f"{r['au']:.4f} AU" if big else f"{r['km']:,.0f} km".replace(',',' '))+f", {dm(r['kdy'])} {hm(r['kdy'])} UT"
        if ref.get('au'):
            pr=(f"{ref['au']:.4f} AU" if big else f"{ref['au']*149597870.7:,.0f} km".replace(',',' '))+f", {hm(r['ref'])} UT"; e=abs(r['au']-ref['au'])/ref['au']; m=5 if e<=0.01 and abs(r['dt'])<30 else 4 if e<=0.05 else 3 if e<=0.2 else 1
            if i=='c1680': m=3
        else: pr='přísluní 20. 3. 1066'; m=4
    elif t=='hvezda':
        kat='Supernova / nova'; mod='mimo model'; pr=f"{c['souhvezdi']}; {'' if ref['mag'] is None else str(ref['mag']).replace('-','−').replace('.',',')+' mag; '}{ref['viditelnost']}"
    cz=lambda x: re.sub(r'(\d)\.(\d)',r'\1,\2',x).replace('-','−') if x else x
    mod,pr=cz(mod),cz(pr)
    m=MO.get(i,m)
    z,p,o=ZPO[i]
    tot=z+p+o+m if m else round((z+p+o)*20/15)
    y=c['datum'][0]; bud=(y,c['datum'][1],c['datum'][2])>(2026,11,13)
    rows.append(dict(id=i,kat=kat,datum=den(c['datum']),y=y,nazev=c['nazev'],mod=mod,pr=pr,Z=z,P=p,M=m,O=o,tot=tot,bud=bud,pozn=PZ.get(i,''),pramen=c['pramen'],nahr=bool(c.get('nahradnik'))))
# výběr 60: podle bodů ze všech 88 (80 kandidátů + 8 náhradníků do budoucnosti); při shodě bodů má přednost budoucí událost, potom silnější příběh
rows.sort(key=lambda r:(-r['tot'],not r['bud'],-r['P'],r['y']))
vyber=rows[:60]; ven=rows[60:]
# divoká karta (Ondřej, 14. 11. 2026): seskupení 8. 9. 2040 místo zatmění Slunce 2151
wa=next(r for r in ven if r['id']=='g2040'); wb=next(r for r in vyber if r['id']=='s2151')
ven.remove(wa); vyber.remove(wb); vyber.append(wa); ven.append(wb); wa['pozn']='divoká karta místo zatmění 2151'
# návrh 30 karet: nejsilnější příběh, potom body; strop na kategorii kvůli pestrosti
STROP={'Zatmění Slunce':8,'Přechod':4,'Kometa':5,'Zatmění Měsíce':4,'Supernova / nova':4,'Konjunkce':3,'Zákryt':2,'Průlet':3,'Seskupení':2}
karty=[]; cnt={}
for r in sorted(vyber,key=lambda r:(-r['P'],-r['tot'],-r['Z'],r['y'])):
    if len(karty)<30 and cnt.get(r['kat'],0)<STROP[r['kat']]: karty.append(r); cnt[r['kat']]=cnt.get(r['kat'],0)+1
karty.sort(key=lambda r:r['y'])
open('/tmp/karty.md','w').write('| # | Datum | Kategorie | Karta | Body | Příběh |\n|---|---|---|---|---|---|\n'+'\n'.join(f"| {n} | {r['datum']}{' ▸' if r['bud'] else ''} | {r['kat']} | {r['nazev']} | {r['tot']} | {r['P']} |" for n,r in enumerate(karty,1)))
print('KARTY',len(karty),cnt,'budoucích',sum(r['bud'] for r in karty))
vyber.sort(key=lambda r:(-r['tot'],r['y'])); ven.sort(key=lambda r:(-r['tot'],r['y']))
nahr=[r for r in rows if r['nahr']]
H=['| # | Body | Kategorie | Datum | Událost | Model | Pramen | Z | P | M | O | Poznámka |','|---|---|---|---|---|---|---|---|---|---|---|---|']
def tab(rs):
    L=list(H)
    for n,r in enumerate(rs,1):
        L.append(f"| {n} | **{r['tot']}** | {r['kat']} | {r['datum']}{' ▸' if r['bud'] else ''} | {r['nazev']}{' (náhradník)' if r['nahr'] else ''} | {r['mod']} | {r['pr']} | {r['Z']} | {r['P']} | {r['M'] or '–'} | {r['O']} | {r['pozn']} |")
    return '\n'.join(L)
open('/tmp/tab60.md','w').write(tab(vyber)); open('/tmp/tabven.md','w').write(tab(ven))
import collections
print('vybráno',len(vyber),'budoucích',sum(r['bud'] for r in vyber),'vyřazeno',len(ven))
print(collections.Counter(r['kat'] for r in vyber))
print('nejnižší body ve výběru',min(r['tot'] for r in vyber))
for n in nahr: print('náhradník',n['tot'],n['nazev'],'VE VÝBĚRU' if n in vyber else 'mimo')
for r in ven: print('  ven',r['tot'],r['datum'],r['nazev'][:60])
