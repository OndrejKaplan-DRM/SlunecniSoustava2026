// Chůze po povrchu (verze 2.3): po přistání se dá jít – W A S D nebo šipky, myš (klik do obrazu ji zamkne jako ve hře),
// Shift běh, mezerník nebo pravé tlačítko skok, levé tlačítko podržet = vzlet, Esc uvolní myš (podruhé vzlet).
// Mutace chodce z Oliverovy Planetky 8 (src/engine/controls.js: moonStep, walkStep): tíže tělesa, pomalejší „šouravý“ krok
// a klokaní poskoky při běhu na tělesech s malou tíží, klouzání po ledu (setrvačnost a malé tření), skok rychlejší než
// úniková rychlost = odlet do vesmíru, plynulé dosednutí kamery. Navíc: kolize s kameny (válec, na nízký kámen se dá
// vystoupit), sesouvání po příkrém svahu, poryvy větru podle hustoty vzduchu, houpání hlavy, dosed po skoku a otřesy na Io.
// „Feel“ (síla poryvů, houpání, otřesy) je v tabulce FEEL – doladí se v poslední iteraci.
import { B, SUN } from '../core/sim.js';
import { ATM } from '../data/krajiny.js';

const DEG = Math.PI / 180;
const G0 = 9.80665;
/* pocit podle tělesa: vítr = síla poryvů (0–1, podle hustoty vzduchu), třes = otřesy (Io: sopky), led = kluzký povrch */
const FEEL = {
  earth: { vitr: 1, smer: 250 },
  mars: { vitr: 0.45, smer: 200 } /* řídký vzduch, ale prachové víry a poryvy 2–30 m/s (Viking, NSSDCA) */,
  venus: { vitr: 0.55, smer: 90 } /* vítr u země jen 0,3–1 m/s, ale vzduch 65× hustší */,
  titan: { vitr: 0.35, smer: 270 },
  io: { vitr: 0, tres: 1 },
  europa: { led: 1 },
  enceladus: { led: 1 },
  ganymede: { led: 0.5 },
  callisto: { led: 0.3 },
  pluto: { led: 0.8 },
  triton: { led: 0.8 },
  eris: { led: 0.8 },
};
const KEYS = {
  KeyW: 'f',
  ArrowUp: 'f',
  KeyS: 'b',
  ArrowDown: 'b',
  KeyA: 'l',
  ArrowLeft: 'l',
  KeyD: 'r',
  ArrowRight: 'r',
  ShiftLeft: 'run',
  ShiftRight: 'run',
  Space: 'jump',
};

export function createChuze(S, A, ui) {
  const $ = (s) => document.querySelector(s),
    cv = $('#gl'),
    kid = () => document.body.classList.contains('kid'),
    touch = () => document.body.classList.contains('touch') || document.body.classList.contains('mob');
  const keys = {};
  let W = null; /* stav chodce pro aktuální přistání */
  let hint = false,
    holdT = 0;
  const can = () =>
    !!(S.surf && !S.surf.quiet && S.krajina && S.krajina.on() && S.krajina.walkable && S.krajina.walkable());

  function reset() {
    const q = S.surf;
    if (!q) return (W = null);
    const b = B[q.i],
      f = FEEL[b.id] || {};
    W = {
      i: q.i,
      x: 0,
      z: 0,
      feet: null,
      vy: 0,
      vx: 0,
      vz: 0,
      grounded: true,
      eye: null,
      g: Math.max(0.02, b.g || G0),
      vesc: b.vesc || 1e4,
      ice: f.led || 0,
      wind: ATM[b.id] && q.air !== false ? f.vitr || 0 : 0,
      windAz: (f.smer || 0) * DEG,
      tres: f.tres || 0,
      bob: 0,
      land: 0,
      landV: 0,
      gust: 0,
      roll: 0,
      escT: null,
      tremor: 0,
      nextTremor: 8 + Math.random() * 20,
      t: 0,
    };
  }
  S.bus.on('surf', (q) => {
    if (!q) {
      W = null;
      if (document.pointerLockElement === cv) document.exitPointerLock();
      for (const k in keys) keys[k] = false;
      return;
    }
    if (!W || W.i !== q.i || q.lat !== W.lat || q.lon !== W.lon) {
      reset();
      W.lat = q.lat;
      W.lon = q.lon;
      hint = false;
    }
  });

  /* --- klávesy: zachytit dřív než zbytek rozhraní (šipky tam otáčejí pohledem, mezerník pouští čas) --- */
  let lockOffT = 0;
  const onKey = (down) => (e) => {
    if (!can() || e.target.closest('input, select, textarea')) return;
    /* Esc se zamčenou myší jen uvolní myš (nevzlétat) */
    if (e.code === 'Escape' && (locked() || performance.now() - lockOffT < 400)) {
      e.stopImmediatePropagation();
      return;
    }
    const a = KEYS[e.code];
    if (!a) return;
    if (a === 'run') {
      keys.run = down;
      return;
    }
    e.preventDefault();
    e.stopImmediatePropagation();
    keys[a] = down;
    if (down && W) W.moved = true;
    if (down && !hint) showHint();
  };
  window.addEventListener('keydown', onKey(true), true);
  window.addEventListener('keyup', onKey(false), true);
  window.addEventListener('blur', () => {
    for (const k in keys) keys[k] = false;
  });

  /* --- myš: klik do obrazu zamkne kurzor (rozhlížení jako ve hře); pravé tlačítko skok; levé podržet = vzlet --- */
  const locked = () => document.pointerLockElement === cv;
  cv.addEventListener(
    'pointerdown',
    (e) => {
      if (!can() || touch()) return;
      if (!locked()) {
        /* myš se zamkne až po prvním kroku (do té doby klik a tah fungují jako dřív: rozhlížení, výběr na obloze) */
        if (e.button === 0 && W && W.moved && W.t > 0.5) {
          try {
            const r = cv.requestPointerLock();
            if (r && r.catch) r.catch(() => {});
          } catch (er) {
            /* prohlížeč zámek nedovolil – rozhlížení tahem dál funguje */
          }
        }
        return;
      }
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.button === 2) keys.jumpOnce = true;
      else if (e.button === 0) holdT = performance.now();
    },
    true
  );
  window.addEventListener(
    'pointerup',
    (e) => {
      if (e.button === 0) holdT = 0;
    },
    true
  );
  document.addEventListener('mousemove', (e) => {
    if (!locked() || !S.surf) return;
    const q = S.surf,
      k = (0.0022 * (q.fov || 68)) / 68;
    q.track = -1;
    q.az += e.movementX * k;
    q.el = Math.max(-1.45, Math.min(1.5, q.el - e.movementY * k));
    S.wake();
  });
  cv.addEventListener('contextmenu', (e) => {
    if (locked() || (can() && W && W.moved)) e.preventDefault();
  });
  document.addEventListener('pointerlockchange', () => {
    if (!locked()) lockOffT = performance.now();
    document.body.classList.toggle('fps', locked());
    if (locked() && !hint) showHint();
  });

  function showHint() {
    hint = true;
    const t = touch();
    ui.toast(
      kid()
        ? `🚶 Jdeme na procházku! ${t ? 'Táhni prstem a rozhlížej se.' : 'Klávesy W A S D nebo šipky, myš na rozhlížení, Shift = běh, mezerník = skok.'}`
        : `🚶 Chůze: W A S D / šipky, Shift běh, mezerník skok. Klik do obrazu zamkne myš (rozhlížení jako ve hře): pravé tlačítko skok, levé podržet = vzlet, Esc myš uvolní.`,
      7000
    );
  }

  /* výška země pod chodcem (stejná plocha, jakou krajina kreslí) a sklon (gradient po 0,6 m) */
  const ground = (x, z) => S.krajina.ground(x, z);
  const grad = (x, z, out) => {
    const d = 0.6;
    out[0] = (ground(x + d, z) - ground(x - d, z)) / (2 * d);
    out[1] = (ground(x, z + d) - ground(x, z - d)) / (2 * d);
    return out;
  };
  const gr = [0, 0];

  function step(dt) {
    if (!W || !S.surf || W.i !== S.surf.i || !can()) return;
    const q = S.surf;
    if (q.desc) return; /* během sestupu se nechodí */
    dt = Math.min(dt, 0.05);
    W.t += dt;
    const gz = W.g / G0;
    if (W.feet === null) {
      W.feet = ground(W.x, W.z);
      W.eye = W.feet;
    }
    /* --- vstup: směr podle azimutu pohledu (x = východ, z = jih) --- */
    let fx = (keys.f ? 1 : 0) - (keys.b ? 1 : 0),
      rx = (keys.r ? 1 : 0) - (keys.l ? 1 : 0);
    const il = Math.hypot(fx, rx);
    if (il > 1) {
      fx /= il;
      rx /= il;
    }
    const sa = Math.sin(q.az),
      ca = Math.cos(q.az),
      run = !!keys.run;
    /* rychlost: na Zemi 1,4 m/s chůze a 4,5 m/s běh; při malé tíži „šouravý“ krok (Froudovo číslo ~ v²/gL) a běh poskoky */
    const vWalk = Math.max(0.7, Math.min(1.45, 1.45 * Math.sqrt(gz))),
      vRun = gz > 0.5 ? 4.5 : Math.max(1.6, 4.5 * Math.sqrt(gz) * 1.6),
      vMax = run ? vRun : vWalk;
    const tx = (sa * fx + ca * rx) * vMax,
      tz = (-ca * fx + sa * rx) * vMax;
    /* tření: na zemi rychlá odezva, na ledu setrvačnost; ve vzduchu skoro žádné řízení */
    const fr = !W.grounded ? 0.6 : W.ice ? 1.2 - 0.6 * W.ice : 9;
    const kf = 1 - Math.exp(-fr * dt);
    W.vx += (tx - W.vx) * kf;
    W.vz += (tz - W.vz) * kf;
    /* svah: nad asi 35° (led 18°) chodec klouže dolů */
    if (W.grounded) {
      grad(W.x, W.z, gr);
      const sl = Math.hypot(gr[0], gr[1]),
        lim = W.ice ? 0.33 : 0.7;
      if (sl > lim) {
        const a = W.g * Math.min(1, (sl - lim) * 1.5);
        W.vx -= (gr[0] / sl) * a * dt;
        W.vz -= (gr[1] / sl) * a * dt;
      }
    }
    /* poryvy větru: pomalé kolísání síly a směru (šum ze sinů), tlačí chodce a naklání pohled */
    if (W.wind > 0) {
      const t = W.t,
        gs = Math.max(0, 0.55 * Math.sin(t * 0.37) + 0.35 * Math.sin(t * 1.13 + 1.7) + 0.25 * Math.sin(t * 2.9 + 0.4)),
        wa = W.windAz + 0.35 * Math.sin(t * 0.11);
      W.gust = gs * W.wind;
      const push = 0.35 * W.gust * (W.grounded ? 1 : 2.2);
      W.vx += Math.sin(wa) * push * dt;
      W.vz += -Math.cos(wa) * push * dt;
      const rollT = 0.012 * W.gust * Math.sin(t * 2.3) + 0.006 * W.gust;
      W.roll += (rollT - W.roll) * Math.min(1, dt * 3);
    } else W.roll *= Math.exp(-dt * 3);
    /* --- pohyb s kolizí (kameny jako válce; na nízký kámen se vystoupí) --- */
    const nx = W.x + W.vx * dt,
      nz = W.z + W.vz * dt;
    const ob = S.krajina.obstacles(nx, nz, 0.35);
    let ok = true,
      stand = -1e9;
    for (const o of ob) {
      if (o.top <= W.feet + 0.32) stand = Math.max(stand, o.top);
      else {
        ok = false;
        /* odstrčit ven z válce */
        const dx = nx - o.x,
          dz = nz - o.z,
          d = Math.hypot(dx, dz) || 1e-3,
          need = o.r + 0.35;
        if (d < need) {
          W.x = o.x + (dx / d) * need;
          W.z = o.z + (dz / d) * need;
          const vn = (W.vx * dx + W.vz * dz) / d;
          if (vn < 0) {
            W.vx -= (vn * dx) / d;
            W.vz -= (vn * dz) / d;
          }
        }
      }
    }
    if (ok) {
      W.x = nx;
      W.z = nz;
    }
    /* --- svisle: skok, tíže, dosed --- */
    let g0 = Math.max(ground(W.x, W.z), stand);
    const jump = keys.jump || keys.jumpOnce;
    keys.jumpOnce = false;
    const vJ = 2.8;
    if (W.escT !== null) {
      /* skok rychlejší než úniková rychlost: tíže chodce nezastaví, odlétá do vesmíru */
      W.escT += dt;
      W.vy += 0.4 * dt;
      W.feet += W.vy * dt;
      W.grounded = false;
      if (W.escT > 3.2) {
        W.escT = null;
        ui.toast(
          kid()
            ? `🚀 Uletěl(a) jsi! Tady je tíže tak malá, že tě jeden skok odnesl do vesmíru.`
            : `🚀 Odlet: úniková rychlost tu je jen ${W.vesc.toFixed(W.vesc < 1 ? 2 : 1).replace('.', ',')} m/s – skok tě poslal do vesmíru.`,
          6000
        );
        S.setSurf(null);
        S.bus.emit('surfOut');
        return;
      }
    } else {
      if (jump && W.grounded) {
        W.vy = vJ;
        W.grounded = false;
        A.play('jump');
        if (W.vesc < vJ * 1.05) W.escT = 0;
      } else if (W.grounded && run && il > 0 && gz < 0.4) {
        /* běh při malé tíži = klokaní poskoky (Apollo) */
        W.vy = 1.1 * Math.min(1, Math.sqrt(gz / 0.165));
        W.grounded = false;
      }
      if (W.grounded && W.vy <= 0 && g0 >= W.feet - 0.4) {
        W.feet = g0;
        W.vy = 0;
      } else {
        W.vy -= W.g * dt;
        W.feet += W.vy * dt;
        if (W.feet <= g0) {
          if (!W.grounded && W.vy < -1) {
            /* dosed: kamera se zhoupne úměrně rychlosti (při malé tíži pomaleji) */
            W.landV = Math.min(1.2, -W.vy * 0.12);
            A.play('step');
          }
          W.feet = g0;
          W.vy = 0;
          W.grounded = true;
        } else W.grounded = false;
      }
    }
    /* oko: vyhlazená výška (schody přes kameny), houpání při chůzi, dosed jako tlumená pružina */
    W.eye += (W.feet - W.eye) * Math.min(1, dt * (W.grounded ? 12 : 30));
    if (!W.grounded) W.eye = W.feet;
    const sp = Math.hypot(W.vx, W.vz);
    if (W.grounded && sp > 0.2) W.bob += dt * (sp / (0.75 * Math.max(0.6, Math.sqrt(gz))));
    const bobA = W.grounded ? Math.min(0.05, 0.022 * sp * Math.max(0.6, 1 / Math.sqrt(gz))) : 0;
    W.landV *= Math.exp(-dt * (2 + 5 * Math.sqrt(gz)));
    /* otřesy (Io: sopečná činnost): občas krátký třes */
    if (W.tres) {
      W.nextTremor -= dt;
      if (W.nextTremor < 0) {
        W.tremor = 1.6;
        W.nextTremor = 15 + Math.random() * 25;
        ui.toast(
          kid()
            ? '🌋 Země se třese – blízko je sopka!'
            : '🌋 Otřes – Io je sopečně nejčinnější těleso Sluneční soustavy.',
          3500
        );
      }
    }
    W.tremor = Math.max(0, W.tremor - dt);
    const tr = W.tremor > 0 ? 0.03 * Math.min(1, W.tremor) * (Math.random() - 0.5) : 0;
    /* jemné chvění při běhu po kamenitém povrchu */
    const vib = run && W.grounded && sp > 2 ? 0.004 * (Math.random() - 0.5) : 0;
    q.walk = {
      x: W.x,
      z: W.z,
      eye: W.eye + Math.abs(Math.sin(W.bob * Math.PI)) * bobA - W.landV * 0.25 + tr + vib,
      roll: W.roll + (W.grounded ? Math.sin(W.bob * Math.PI) * bobA * 0.5 : 0),
      ground: W.feet,
    };
    /* daleko od středu mřížky krajiny: postavit ji znovu kolem chodce */
    S.krajina.follow(W.x, W.z);
    /* levé tlačítko podržet 0,7 s = vzlet */
    if (holdT && performance.now() - holdT > 700) {
      holdT = 0;
      if (document.pointerLockElement === cv) document.exitPointerLock();
      S.setSurf(null);
      A.play('launch');
      ui.toast(kid() ? '🚀 Startujeme zpátky do vesmíru!' : '🚀 Vzlet – stoupáš zpátky na oběžnou dráhu.', 2600);
      return;
    }
    if (il > 0 || !W.grounded || sp > 0.05 || W.landV > 0.01 || W.wind > 0 || W.tremor > 0) S.wake();
  }
  S.ticks.push(step);
  /* ukazatel podržení levého tlačítka (kroužek uprostřed) */
  S.overlays.push((ctx, e) => {
    if (!holdT || !S.surf) return;
    const u = Math.min(1, (performance.now() - holdT) / 700);
    ctx.save();
    ctx.strokeStyle = 'rgba(140,190,255,0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(e.W / 2, e.H / 2, 18, -Math.PI / 2, -Math.PI / 2 + u * 2 * Math.PI);
    ctx.stroke();
    ctx.restore();
    S.wake();
  });
  return {
    state: () =>
      W ? { x: W.x, z: W.z, feet: W.feet, vy: W.vy, grounded: W.grounded, gust: W.gust, esc: W.escT } : null,
    /* zkoušky: stisk a uvolnění klávesy bez prohlížeče */
    key: (code, down) => {
      const a = KEYS[code];
      if (a) keys[a] = down;
    },
    jump: () => (keys.jumpOnce = true),
    sun: SUN,
  };
}
