# Výběr 256 zvuků z inventáře podle pravidel (kategorie, balíček, regulární výraz na jméno, kolik) → picks.json
import json, os, re
inv = json.load(open('inventory.json')); seen = set(); picks = []
def base(p): return os.path.splitext(os.path.basename(p))[0]
PREF = {'.wav': 0, '.flac': 1, '.ogg': 2, '.mp3': 3}
inv.sort(key=lambda i: (i['pack'], base(i['path']), PREF.get(os.path.splitext(i['path'])[1].lower(), 9), i['path']))
def take(cat, pack, rx, n=99, every=1):
    got = 0; k = 0
    for i in inv:
        if i['pack'] != pack or not re.search(rx, base(i['path'])): continue
        key = (pack, base(i['path']), i['dur'])
        if key in seen: continue
        k += 1
        if (k - 1) % every: continue
        seen.add(key); picks.append(dict(i, cat=cat)); got += 1
        if got >= n: break
    if got < n and n != 99: print('málo', cat, pack, rx, got, '/', n)
R = 'Rozhraní'; take(R, 'interface-sounds', r'^(click_001|bong_001|back_00[13]|close_00[24]|confirmation_00[1-4]|drop_00[24]|error_00[358]|glass_00[14]|glitch_00[14]|maximize_00[458]|minimize_00[45]|open_00[24]|pluck_00[12]|question_00[13]|scratch_004|scroll_00[13]|select_00[1367]|switch_00[136]|tick_00[14]|toggle_00[14])$')
take(R, 'interface-beeps', r'beep-(00|03|06|09|12|15)'); take(R, 'gui-sound-effects', r'^(click|load|misc_menu|misc_menu_3|negative|positive|save|sharp_echo)$')
P = 'Pípání a terminály'; take(P, '50-cc0-sci-fi-sfx', r'^(beep_0[1-3]|terminal_0[13579]|retro_beep_0[1-6])$'); take(P, '63-digital-sound-effects-lasers-phasers-space-etc', r'^(pepSound[1-5]|tone1|twoTone[12]|threeTone[12]|lowThreeTone|lowRandom|highUp|highDown|lowDown)$'); take(P, 'platformer-sounds-terminal-interaction-door-shots-bang-and-footsteps', r'beep_message')
L = 'Lasery a výboje'; take(L, '63-digital-sound-effects-lasers-phasers-space-etc', r'^(laser[1-9]|zap[12]|zapThreeTone(Up|Down)|zapTwoTone|phaserUp[147]|phaserDown[13])$'); take(L, 'sci-fi-sounds', r'^laser(Large_00[02]|Retro_00[03]|Small_00[04])$'); take(L, '50-cc0-sci-fi-sfx', r'^(retro_laser_0[12]|shoot_0[12])$')
E = 'Energie a přechody'; take(E, '63-digital-sound-effects-lasers-phasers-space-etc', r'^(powerUp(1|3|5|8|10|12)|phaseJump[135])$'); take(E, '50-cc0-sci-fi-sfx', r'^teleport'); take(E, 'sci-fi-sounds', r'^forceField_00[024]$'); take(E, 'space-ship-shield-sounds', r' - [1357]$'); take(E, 'energy-drain', r'PowerDrain', 1); take(E, 'warp-engine-engage-sound', r'16bit', 1)
D = 'Dveře, zámky, hydraulika'; take(D, 'sci-fi-sounds', r'^door(Open|Close)_00[02]$'); take(D, '100-cc0-sfx', r'^(door_0[12]|door_close_0[13]|door_open|microwave_door_(open|close)|key_open_01|switch_0[12])$'); take(D, '100-cc0-metal-and-wood-sfx', r'^(metal_open_01|metal_close_01|metal_slam_01|lock_open_01|door_open_01)$'); take(D, 'stone-door', r'.'); take(D, 'platformer-sounds-terminal-interaction-door-shots-bang-and-footsteps', r'^(door_open|cogs|boxopen)$'); take(D, '100-cc0-sfx-2', r'air_0[123]|lock_open|door_0[13]'); take(D, 'steam-release-sounds', r'#[1-4]'); take(D, 'door-open-door-close-set', r'Door(Open0[147]|Close0[258])')
M = 'Motory a pohony'; take(M, 'sci-fi-sounds', r'^(spaceEngine_00[02]|spaceEngineLarge_00[03]|spaceEngineLow_00[02]|spaceEngineSmall_00[03]|thrusterFire_00[024]|engineCircular_00[024])$'); take(M, '50-cc0-sci-fi-sfx', r'^rocket')
S = 'Stroje a smyčky'; take(S, '30-cc0-sfx-loops', r'^(machine_(0[13568]|09|11)|pump_0[12]|alarm_0[123]|saw|rolling)$'); take(S, '100-cc0-sfx-2', r'loop_machine_0[1-4]'); take(S, '50-cc0-sci-fi-sfx', r'loop_machine'); take(S, 'steam-boiler-sound-loop', r'.'); take(S, 'short-alarm', r'.'); take(S, '100-cc0-sfx', r'^machine_0[1-3]$')
A = 'Ambient a hukot'; take(A, 'droning-sound-effects', r'.'); take(A, 'space-winds', r'.'); take(A, 'space-ship-floating-sounds2', r'.'); take(A, '7-space-sounds', r'.'); take(A, 'dark-ambiences', r'.'); take(A, '4-atmospheric-ghostly-loops', r'.'); take(A, '30-cc0-sfx-loops', r'^(ambient_0[123]|noise_0[123])$'); take(A, '100-cc0-sfx-2', r'loop_ambient'); take(A, '50-cc0-sci-fi-sfx', r'loop_ambient'); take(A, '60-cc0-sci-fi-sfx', r'^sfx_(19[abc]|11[ac])$'); take(A, 'reversing-time-stuck-in-time', r'.', 1); take(A, 'wind1', r'wind[13]'); take(A, 'sci-fi-sounds', r'^computerNoise_00[013]$'); take(A, 'static', r'.'); take(A, 'radio-noise-1', r'.'); take(A, 'frequency-static-sound-effects', r'.'); take(A, 'dripping-water-loop', r'.')
K = 'Magnety a mechanismy'; take(K, 'atmospheric-interaction-sound-pack', r'.', 14, 3)
C = 'Kov, zvony, údery'; take(C, '100-cc0-sfx', r'^(bell_0[123]|gong_0[12]|metal_(04|05|08|12)|spring_0[126]|slam_0[17])$'); take(C, '100-cc0-metal-and-wood-sfx', r'^(metal_falling_01|metal_hit_0[13]|metal_sheet_0[36]|metal_spring_01|hammer_01)$'); take(C, 'sci-fi-sounds', r'^impactMetal_00[013]$'); take(C, 'metal-interactions', r'.'); take(C, 'impact', r'Impact(Metal|Stone)')
B = 'Bubny a výbuchy'; take(B, 'horde-war-drums-loop', r'.'); take(B, 'an-interesting-snare-drum-sound', r'.'); take(B, 'sci-fi-sounds', r'^(explosionCrunch_00[024]|lowFrequency_explosion_00[01])$'); take(B, 'muffled-distant-explosion', r'.'); take(B, 'mechanical-explosion', r'.'); take(B, '50-cc0-sci-fi-sfx', r'^(explosion_0[12]|retro_explosion)$'); take(B, '100-cc0-sfx-2', r'thunder')
V = 'Voda a bubliny'; take(V, 'bubble-sound-effects', r'.'); take(V, '40-cc0-water-splash-slime-sfx', r'^(bubble_0[12]|loop_bubbles_1|loop_water_0[12]|loop_rain|splash_0[157]|slime_0[39])$'); take(V, '30-cc0-sfx-loops', r'^water_'); take(V, '100-cc0-sfx-2', r'loop_water_0[13]')
W = 'Podivnosti'; take(W, '50-cc0-sci-fi-sfx', r'^(weird_0[1-5]|misc_(03|06|09|12))$'); take(W, '30-cc0-sfx-loops', r'^weird'); take(W, '100-cc0-sfx', r'^weird_0[245]$'); take(W, '63-digital-sound-effects-lasers-phasers-space-etc', r'^spaceTrash'); take(W, 'mystery-sting', r'.'); take(W, '100-cc0-sfx-2', r'misc_(12|22|28|37)'); take(W, 'sci-fi-sounds', r'^slime_001$')
take(W, '60-cc0-sci-fi-sfx', r'^sfx_(01a|03a|05a|06|08a|10a|13a|14a|16a|18a|21a|22a)$')
Q = {'Rozhraní': 26, 'Ambient a hukot': 34, 'Dveře, zámky, hydraulika': 26, 'Kov, zvony, údery': 20, 'Pípání a terminály': 20, 'Lasery a výboje': 18, 'Podivnosti': 26, 'Stroje a smyčky': 20, 'Energie a přechody': 16, 'Voda a bubliny': 14, 'Motory a pohony': 12, 'Magnety a mechanismy': 12, 'Bubny a výbuchy': 12}
out = []
for cat, q in Q.items():
    g = [p for p in picks if p['cat'] == cat]; n = len(g)
    idx = sorted(set(round(k * (n - 1) / (q - 1)) for k in range(q))) if n > q else range(n)
    out += [g[k] for k in idx]
picks = out
print('celkem', len(picks)); json.dump(picks, open('picks.json', 'w'), ensure_ascii=False, indent=0)
from collections import Counter; print(Counter(p['cat'] for p in picks)); print(len(set(p['pack'] for p in picks)), 'balíčků')
