#!/bin/sh
# snímky Slunce ve třech filtrech a vzdálenostech → $1/sheet.png
cd /home/claude/s200
H="document.body.insertAdjacentHTML('beforeend','<style>#top,#tools,#card,#dockwrap,#mini,#hud,#guide,#toast,#more,#quizbar,.quiz{display:none!important}</style>');"
AIM="(function(k){var S=S200.S,U=S.R[S200.sim.SUN].U,c=U.uCtr.value,l=Math.hypot(c.x,c.y,c.z),w=[-c.x/l,-c.y/l,-c.z/l],e=U.uRot.value.elements;var v=U.uAR.value[k];v.set(e[0]*w[0]+e[1]*w[1]+e[2]*w[2],e[3]*w[0]+e[4]*w[1]+e[5]*w[2],e[6]*w[0]+e[7]*w[1]+e[8]*w[2]);U.uAR.value[k]=v;})"
LIMB="(function(k){var S=S200.S,U=S.R[S200.sim.SUN].U,c=U.uCtr.value,l=Math.hypot(c.x,c.y,c.z),a=[-c.x/l,-c.y/l,-c.z/l],w=[a[2],0,-a[0]],n=Math.hypot(w[0],w[2]);w=[w[0]/n,0,w[2]/n];var e=U.uRot.value.elements;U.uAR.value[k].set(e[0]*w[0]+e[1]*w[1]+e[2]*w[2],e[3]*w[0]+e[4]*w[1]+e[5]*w[2],e[6]*w[0]+e[7]*w[1]+e[8]*w[2]);})"
Z="S200.S.cam.alt=S200.S.cam.altT=696000*"
node tools/test/shot.mjs "$1" "[[\"a\",\"document.querySelector('#sp-go').click(); $H S200.S.labMode=0; S200.S.orbMode=0; S200.S.jump(S200.sim.SUN); S200.S.setSunMode(0)\",4000],
[\"b\",\"$AIM(0); ${Z}0.35\",2500],[\"c\",\"${Z}0.04\",2500],[\"c2\",\"${Z}0.015\",2500],
[\"d\",\"${Z}1.8; S200.S.setSunMode(1)\",2500],[\"e\",\"${Z}0.35\",2500],
[\"f\",\"${Z}1.8; S200.S.setSunMode(2)\",2500],[\"g\",\"${Z}0.35\",2500],[\"h\",\"${Z}1.8; $LIMB(3); S200.S.flareNow(3)\",1700],[\"h2\",\"1\",900],[\"i\",\"${Z}8;S200.S.setSunMode(0)\",2500]]" 2>&1 | grep -v "GL Driver"
cd "$1" && python3 -c "
from PIL import Image
import glob
fs=sorted(glob.glob('?.jpg')+glob.glob('??.jpg')); s=Image.new('RGB',(1280,380*((len(fs)+1)//2)))
for k,f in enumerate(fs): s.paste(Image.open(f).resize((640,380)),((k%2)*640,(k//2)*380))
s.save('sheet.png')"
