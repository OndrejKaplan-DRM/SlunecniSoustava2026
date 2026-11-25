// Zajímavosti po přistání (verze 2.3). Po dosednutí se ukáže několik vět o tom, co je na tomto místě jiné než na Zemi.
// Přednost mají věci, které „prodají“ mimozemské přistání (zatažená obloha, modrý západ Slunce na Marsu, Slunce jako hvězda,
// planeta nad hlavou, měsíce na obloze, polární záře, odraz do vesmíru na malém tělese); teplota, tlak, složení vzduchu, tíže
// a úniková rychlost jsou v jednom řádku pod nimi „do zásoby“.
// Prameny: tíže a úniková rychlost z katalogu aplikace (NASA NSSDCA, JPL SSD), tlak, teplota a plyny z data/slozeni.js
// (NASA NSSDCA Fact Sheets), větry obřích planet a Marsu z NSSDCA Fact Sheets (staženo 25. 11. 2026), věže v oblacích Jupiteru
// PIA21647 (Juno), polární záře Země kolem geomagnetického pólu WMM2025. Úhlové velikosti a výšky nad obzorem počítá aplikace
// z poloh těles v okamžiku přistání. Z paměti (neověřeno ve zdrojích repa): výdrž sond Veněra na povrchu (Veněra 13 asi 127 min),
// jezera metanu a etanu na Titanu (Cassini), Jupiterova polární záře jako nejsilnější ve Sluneční soustavě.

const DEG = Math.PI / 180;
const cz = (v, d = 0) => v.toLocaleString('cs-CZ', { maximumFractionDigits: d, minimumFractionDigits: d });
const sig = (v) => (v >= 100 ? cz(v, 0) : v >= 10 ? cz(v, 1) : v >= 1 ? cz(v, 1) : cz(v, 2));
/* úhel jako text: stupně, nebo úhlové minuty a vteřiny */
const ang = (deg) => (deg >= 1 ? `${sig(deg)}°` : deg >= 1 / 60 ? `${cz(deg * 60, deg * 60 >= 10 ? 0 : 1)}′` : `${cz(deg * 3600, 0)}″`);

/* větry (NSSDCA Fact Sheets): rychlost v m/s a kde */
export const VITR = {
  jupiter: { max: 150, kde: 'do 30° od rovníku až 150 m/s, dál od rovníku do 40 m/s' },
  saturn: { max: 400, kde: 'do 30° od rovníku až 400 m/s, dál od rovníku do 150 m/s' },
  uranus: { max: 250, kde: 'až 250 m/s' },
  neptune: { max: 580, kde: 'až 580 m/s – nejrychlejší větry ve Sluneční soustavě' },
  mars: { max: 30, kde: 'běžně 2–10 m/s, při prachové bouři 17–30 m/s (měření landerů Viking)' },
  venus: { max: 1, kde: 'u povrchu jen 0,3–1 m/s, ale vzduch je 65× hustší než u nás' },
  earth: { max: 100, kde: 'do 100 m/s' },
};

/**
 * ctx = { id, cs, kid, typ (typ krajiny), g (m/s²), vesc (m/s), atm ({ tlak, teplota, plyny, zadna }),
 *   sunDeg (úhlový průměr Slunce °), sunE (osvětlení vůči Zemi), sunEl (výška Slunce °), opaque (zatažená obloha),
 *   parent ({ cs, deg, el, sync }), earth ({ el, deg } – z Měsíce), moons ([{ cs, deg, el }] nad obzorem),
 *   geomag (geomagnetická šířka °, jen Země), lat, relH (m nad okolím), deck (oblačné moře), small (malé těleso) }
 * Vrací { top: [věty s nejvyšší předností], data: řádek s čísly }.
 */
export function zajimavosti(c) {
  const k = c.kid,
    L = [];
  const add = (p, t) => L.push({ p, t });
  const gz = c.g / 9.80665;
  /* --- co nejvíc „prodá“ místo --- */
  if (c.deck)
    add(
      98,
      k
        ? `☁ Tady není žádná zem! Vznášíš se nad mraky – pod nimi je plyn, který je čím dál hustší a teplejší.`
        : `☁ Pevný povrch tu není: vznášíš se 1,5 km nad vrcholky oblaků. Pod nimi plyn houstne a hřeje, až přejde ${
            c.id === 'jupiter' || c.id === 'saturn'
              ? 'v tekutý kovový vodík'
              : 'v horký hustý „oceán“ vody, čpavku a metanu (model nitra)'
          }.`
    );
  if (c.deck && VITR[c.id])
    add(
      90,
      k
        ? `💨 Mraky tu letí rychleji než letadlo – až ${cz(VITR[c.id].max * 3.6, 0)} km/h!`
        : `💨 Větry: ${VITR[c.id].kde} (${cz(VITR[c.id].max * 3.6, 0)} km/h).`
    );
  if (c.id === 'jupiter' && c.deck)
    add(
      80,
      k
        ? `⛈ Občas z mraků vyroste věž vysoká jako 5 Mount Everestů – bouřkový mrak z ledu a čpavku.`
        : `⛈ Bílé věže nad oblaky jsou bouřkové mraky: sonda Juno je vyfotila asi 50 km široké a 50 km vysoké, vrhají stín na oblaka pod sebou.`
    );
  if (c.opaque)
    add(
      96,
      k
        ? `🌫 Nebe je pořád zatažené a neprůhledné – Slunce ani hvězdy odsud nikdy neuvidíš.`
        : `🌫 Obloha je zatažená a neprůhledná: Slunce ani hvězdy odsud nejsou vidět nikdy, jen rozptýlené světlo.`
    );
  if (c.small && c.vesc < 50)
    add(
      97,
      k
        ? `🚀 Tady skoro nic neváží! Kdybys silněji skočil(a), odletíš do vesmíru a už nespadneš zpátky.`
        : `🚀 Úniková rychlost jen ${sig(c.vesc)} m/s: silnějším odrazem bys odletěl(a) do vesmíru a už nespadl(a) zpět.`
    );
  if (c.id === 'mars') {
    if (c.sunEl > -4 && c.sunEl < 12)
      add(
        93,
        k
          ? `🌅 Na Marsu zapadá Slunce do modra! Jemný prach pouští modré světlo kolem Slunce.`
          : `🌅 Slunce u obzoru je obklopené modrou září: jemný prach rozptyluje modré světlo dopředu (snímky Curiosity, PIA19400).`
      );
    else
      add(
        78,
        k
          ? `🟠 Obloha je ve dne žlutohnědá jako karamel – barví ji prach. Při západu Slunce zmodrá.`
          : `🟠 Obloha je ve dne žlutohnědá (barví ji prach); kolem zapadajícího Slunce naopak zmodrá.`
      );
    if (c.relH > 15000)
      add(
        95,
        k
          ? `🏔 Stojíš na nejvyšší hoře Sluneční soustavy, ${cz(c.relH / 1000, 0)} km nad krajinou! Hora je ale tak široká a mírná, že to skoro nepoznáš.`
          : `🏔 Olympus Mons: jsi asi ${cz(c.relH / 1000, 0)} km nad okolní planinou, a přece to tu vypadá skoro jako rovina – svahy klesají jen o pár stupňů a úpatí sopky je až za obzorem.`
      );
  }
  if (c.id === 'titan')
    add(
      85,
      k
        ? `🟠 Vzduch je tu hustší než na Zemi, ale mrazivý (−180 °C) a bez kyslíku. V jezerech není voda, ale tekutý metan.`
        : `🟠 Atmosféra je hustší než pozemská (tlak 1,5 baru) a tíže sedmkrát menší; v jezerech je kapalný metan a etan.`
    );
  if (c.sunDeg && c.sunDeg < 0.12 && !c.opaque)
    add(
      90,
      k
        ? `⭐ Slunce je odsud jen malinkatá jasná tečka – vypadá spíš jako velmi jasná hvězda.`
        : `⭐ Slunce má jen ${ang(c.sunDeg)} – vypadá spíš jako velmi jasná hvězda; svítí ${cz(1 / Math.max(1e-9, c.sunE), 0)}× slaběji než u Země.`
    );
  else if (c.sunDeg > 0.9 && !c.opaque)
    add(
      84,
      k
        ? `☀ Slunce je tu ${sig(c.sunDeg / 0.533)}× větší než u nás a pálí ${sig(c.sunE)}× víc!`
        : `☀ Slunce má ${ang(c.sunDeg)} (ze Země 0,53°) a svítí ${sig(c.sunE)}× silněji než u Země.`
    );
  if (c.parent) {
    const p = c.parent,
      x = p.deg / 0.52;
    if (p.el > 0 && p.deg > 0.6)
      add(
        p.deg > 5 ? 94 : 86,
        k
          ? `🪐 Na obloze visí ${p.cs} – je ${cz(x, 0)}× větší než Měsíc v úplňku!${p.sync ? ' A pořád stojí na stejném místě.' : ''}`
          : `🪐 ${p.cs} má na obloze ${ang(p.deg)} – ${cz(x, 0)}× víc než Měsíc v úplňku ze Země.${p.sync ? ' Tento měsíc je k planetě natočený stále stejnou stranou, proto planeta na obloze stojí pořád na stejném místě.' : ''}`
      );
    else if (p.sync && p.el < -1)
      add(
        82,
        k
          ? `🙈 ${p.cs} odsud nikdy neuvidíš – jsi na straně, která se od ní stále odvrací.`
          : `🙈 ${p.cs} odsud neuvidíš nikdy: jsi na odvrácené polokouli měsíce, který k planetě míří stále stejnou stranou.`
      );
  }
  if (c.earth) {
    if (c.earth.el > 0)
      add(
        92,
        k
          ? `🌍 Země visí na obloze pořád na stejném místě, jen se mění její fáze – je ${cz(c.earth.deg / 0.52, 1)}× větší než Měsíc u nás.`
          : `🌍 Země stojí na měsíční obloze stále na stejném místě (asi ${ang(c.earth.deg)}), jen mění fáze a otáčí se.`
      );
    else
      add(
        90,
        k
          ? `🙈 Odsud Zemi nikdy neuvidíš – jsi na odvrácené straně Měsíce.`
          : `🙈 Odsud Zemi neuvidíš nikdy: jsi na odvrácené straně Měsíce (Země tu stojí stále pod obzorem).`
      );
  }
  if (c.moons && c.moons.length === 1 && c.moons[0].cs === 'Měsíc')
    add(70, `🌙 Měsíc je teď nad obzorem (${ang(c.moons[0].deg)}).`);
  else if (c.moons && c.moons.length) {
    const n = c.moons.length,
      names = c.moons
        .slice(0, 4)
        .map((m) => m.cs)
        .join(', ');
    add(
      70 + Math.min(12, n * 3),
      k
        ? `🌙 Teď je nad obzorem ${n === 1 ? 'jeden měsíc' : n + ' měsíce'}: ${names}.`
        : `🌙 Nad obzorem ${n === 1 ? 'je' : 'jsou'} teď ${n === 1 ? 'měsíc' : n + (n < 5 ? ' měsíce' : ' měsíců')}: ${c.moons
            .slice(0, 4)
            .map((m) => `${m.cs} (${ang(m.deg)})`)
            .join(', ')}.`
    );
  }
  if (c.id === 'earth' && c.geomag !== undefined && Math.abs(c.geomag) > 58 && Math.abs(c.geomag) < 80)
    add(
      88,
      k
        ? `💚 Jsi v kraji polárních září – za jasných nocí tu po nebi tančí zelené a červené závoje.`
        : `💚 Jsi v pásu polárních září (geomagnetická šířka ${cz(Math.abs(c.geomag), 0)}°): za jasných nocí tu svítí zelené a červené závoje.`
    );
  if ((c.id === 'jupiter' || c.id === 'saturn') && Math.abs(c.lat) > 60)
    add(
      86,
      k
        ? `💜 Nad pólem svítí obrovská polární záře – hlavně v ultrafialovém světle, které lidské oko nevidí.`
        : `💜 Nad pólem je ovál polární záře; ${c.id === 'jupiter' ? 'Jupiterova je nejsilnější ve Sluneční soustavě a ' : ''}svítí hlavně v ultrafialovém a infračerveném světle.`
    );
  if (c.id === 'venus')
    add(
      91,
      k
        ? `🔥 Je tu 464 °C a tlak jako v kilometrové hloubce oceánu – sonda Veněra tu vydržela jen asi dvě hodiny.`
        : `🔥 Tlak 92 barů (jako 900 m pod hladinou moře) a 464 °C ve dne i v noci; sondy Veněra tu vydržely jen desítky minut až dvě hodiny.`
    );
  if (c.id === 'moon' || c.id === 'mercury')
    add(
      72,
      k
        ? `⚫ Obloha je černá i ve dne – není tu vzduch, který by světlo rozptýlil.`
        : `⚫ Obloha je černá i v poledne: bez vzduchu se světlo nerozptyluje, stíny jsou ostré a černé.`
    );
  if (gz > 0.04 && gz < 0.5 && !c.deck)
    add(
      66,
      k
        ? `🦘 Tíže je tu ${sig(1 / gz)}× menší – skočíš ${sig(1 / gz)}× výš než doma.`
        : `🦘 Tíže ${sig(gz)} g: skok, který na Zemi měří 50 cm, tu dosáhne ${sig(0.5 / gz)} m.`
    );
  if (gz > 1.5)
    add(
      74,
      k
        ? `🏋 Vážil(a) bys tu ${sig(gz)}× víc než doma.`
        : `🏋 Tíže ${sig(gz)} g – na nohy by tě tlačila ${sig(gz)}× větší síla než na Zemi.`
    );
  L.sort((a, b) => b.p - a.p);
  /* --- řádek s čísly „do zásoby“ --- */
  const d = [];
  if (c.atm && !c.atm.zadna) {
    const cut = (t) => t.split(/;|\s\(|,\s/)[0].trim();
    if (c.atm.teplota) d.push(`🌡 ${cut(c.atm.teplota)}`);
    if (c.atm.tlak) d.push(`🌬 ${cut(c.atm.tlak)}`);
    if (c.atm.plyny && c.atm.plyny.length)
      d.push(
        c.atm.plyny
          .slice(0, 2)
          .map((p) => `${p[0].replace(/^[a-zá-ž ]+ /i, '')} ${p[1]}`)
          .join(', ')
      );
  } else d.push(k ? '🫥 Vzduch tu není.' : '🫥 Bez atmosféry');
  if (c.g) d.push(`⚖ ${c.g > 0.05 ? sig(gz) + ' g' : 'skoro žádná tíže'}`);
  if (c.vesc) d.push(`🚀 únik ${c.vesc >= 1000 ? sig(c.vesc / 1000) + ' km/s' : sig(c.vesc) + ' m/s'}`);
  return { top: L.slice(0, 3).map((x) => x.t), data: d.join(' · ') };
}
