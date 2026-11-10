# picks.json → /home/claude/s200/dist/zvuky/zNNN.mp3 + src/zvuky.json (seznam) + ZDROJE.md
import json, os, re, subprocess
picks = json.load(open('picks.json')); OUT = '/home/claude/s200/dist/zvuky'; os.makedirs(OUT, exist_ok=True); man = []; packs = {}
def run(a): return subprocess.run(['ffmpeg', '-nostdin', '-hide_banner', '-y'] + a, capture_output=True, text=True)
for n, p in enumerate(picks, 1):
    info = json.load(open(os.path.join('raw', p['pack'], '_info.json'))); packs[p['pack']] = info
    r = run(['-i', p['path'], '-af', 'volumedetect', '-f', 'null', '-']); m = re.search(r'max_volume: (-?[\d.]+) dB', r.stderr); gain = min(18.0, -2.0 - float(m.group(1))) if m else 0
    long = p['dur'] > 3.0; cut = min(p['dur'], 20.0)
    af = ['silenceremove=start_periods=1:start_threshold=-55dB', f'volume={gain:.1f}dB']
    if p['dur'] > 20.0: af += ['atrim=0:20', 'afade=t=out:st=18.5:d=1.5']
    fn = f'z{n:03d}.mp3'
    r = run(['-i', p['path'], '-af', ','.join(af), '-ar', '44100', '-ac', '2' if long else '1', '-map_metadata', '-1', '-c:a', 'libmp3lame'] + (['-b:a', '80k'] if long else ['-q:a', '5']) + [os.path.join(OUT, fn)])
    if r.returncode: print('CHYBA', p['path'], r.stderr[-200:]); continue
    d = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', os.path.join(OUT, fn)], capture_output=True, text=True).stdout.strip())
    man.append([n, p['cat'], os.path.splitext(os.path.basename(p['path']))[0].replace('.mp3', ''), round(d, 1), p['pack'], 1 if p['dur'] > 20 else 0])
pk = sorted(packs); json.dump({'packs': [[k, packs[k]['title'], (packs[k]['author'] or ['?'])[0]] for k in pk], 'list': [[m[0], m[1], m[2], m[3], pk.index(m[4]), m[5]] for m in man]}, open('/home/claude/s200/src/zvuky.json', 'w'), ensure_ascii=False, separators=(',', ':'))
with open('/home/claude/s200/zdroje/ZVUKY.md', 'w') as f:
    f.write('# Zvuková zkušebna – zdroje\n\nVšech 256 zvuků pochází z balíčků na opengameart.org s jedinou licencí **CC0 1.0** (ověřeno skriptem při stažení, balíčky s jinou nebo smíšenou licencí se přeskakují).\nÚpravy: oříznutí ticha na začátku, vyrovnání hlasitosti, délka nejvýš 20 s, převod do MP3.\n\n| Balíček | Autor | Odkaz | Použito |\n|---|---|---|---|\n')
    for k in pk: f.write(f"| {packs[k]['title']} | {(packs[k]['author'] or ['?'])[0]} | https://opengameart.org/content/{k} | {sum(1 for m in man if m[4] == k)} |\n")
print(len(man), 'souborů'); os.system(f'du -sh {OUT}')
