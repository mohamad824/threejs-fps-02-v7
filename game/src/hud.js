// HUD: every DOM element is cached once and updated only when its text
// changes. The radar is a 2D canvas; damage numbers are pooled divs
// projected from world anchors each frame.
import { WEAPONS, BUY_ITEMS, CREW, CHAPTERS, SITES, ENDINGS } from './data.js';
import { buyItem } from './sim.js';
import * as THREE from 'three';

const el = {};
const last = {};
function setText(id, text) {
  if (last[id] !== text) { last[id] = text; el[id].textContent = text; }
}
function fmtTime(s) {
  const t = Math.max(0, Math.ceil(s));
  return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
}

let radarCtx = null;
let numPool = [];
const _v = new THREE.Vector3();

export function initHud(state, callbacks) {
  const ids = ['radar', 'scoreA', 'scoreB', 'timer', 'roundLabel', 'pipsA', 'pipsB', 'killfeed', 'chatter', 'objective', 'planline', 'casechip', 'plantwrap', 'plantlabel', 'plantfill', 'plantpct', 'plantring', 'healthnum', 'armourfill', 'funds', 'mates', 'wpname', 'wpammo', 'wpres', 'wpslots', 'wputils', 'crosshair', 'hitmark', 'banner', 'vignette', 'flashov', 'dmgnums', 'buymenu', 'buyfunds', 'buychapter', 'buycrew', 'buygrid', 'scoreboard', 'scoretable', 'startov', 'endov', 'endtitle', 'endtext', 'endstats', 'hint', 'hud', 'lowhp'];
  for (const id of ids) el[id] = document.getElementById(id);
  radarCtx = el.radar.getContext('2d');
  for (let i = 0; i < 10; i++) {
    const d = document.createElement('div');
    d.className = 'dmgnum';
    d.style.display = 'none';
    el.dmgnums.appendChild(d);
    numPool.push(d);
  }
  // Buy menu grid: 13 items, built once from the data table.
  for (const item of BUY_ITEMS) {
    const card = document.createElement('button');
    card.className = 'buyitem';
    card.innerHTML = '<span class="bi-tag"></span><span class="bi-label"></span><span class="bi-desc"></span><span class="bi-price"></span>';
    card.querySelector('.bi-tag').textContent = item.tag;
    card.querySelector('.bi-label').textContent = item.label;
    card.querySelector('.bi-desc').textContent = item.desc;
    card.querySelector('.bi-price').textContent = '$' + item.price;
    card.addEventListener('click', () => {
      if (buyItem(state, item.id)) refreshBuy(state);
    });
    card.dataset.item = item.id;
    el.buygrid.appendChild(card);
  }
  document.getElementById('buyclose').addEventListener('click', () => callbacks.closeBuy());
  document.getElementById('playbtn').addEventListener('click', () => callbacks.start());
  document.getElementById('againbtn').addEventListener('click', () => callbacks.restart());
  el.buycrew.innerHTML = '';
  for (const m of CREW) {
    const row = document.createElement('div');
    row.className = 'crewrow';
    row.innerHTML = '<b></b><span></span>';
    row.querySelector('b').textContent = m.name + ' · ' + m.role;
    row.querySelector('span').textContent = m.bio;
    el.buycrew.appendChild(row);
  }
  const chip = document.createElement('div');
  chip.className = 'casechip-buy';
  chip.id = 'buycase';
  chip.textContent = 'CASE — COLE (CARRIER)';
  el.buycrew.appendChild(chip);
  el.buycase = chip;
}

export function refreshBuy(state) {
  setText('buyfunds', '$' + state.player.funds);
  const ch = CHAPTERS[state.chapter - 1];
  setText('buychapter', ch.title + ' — ' + ch.line);
  for (const card of el.buygrid.children) {
    const item = BUY_ITEMS.find((b) => b.id === card.dataset.item);
    const owned = state.player.owned.includes(item.id);
    card.classList.toggle('owned', owned);
    card.classList.toggle('cant', state.player.funds < item.price && !owned);
  }
  const carrier = state.charge.carrier;
  el.buycase.textContent = state.charge.planted ? 'CASE — PLANTED AT SITE ' + state.charge.site.id
    : carrier ? 'CASE — ' + carrier.name + (carrier === state.player ? ' (YOU)' : ' (CARRIER)') : 'CASE — ON THE GROUND';
}

function drawRadar(state) {
  const g = radarCtx;
  const W = 168, H = 168;
  g.clearRect(0, 0, W, H);
  g.fillStyle = 'rgba(10,14,18,0.82)';
  g.fillRect(0, 0, W, H);
  const sx = (x) => (x + 47) / 94 * W;
  const sz = (z) => (z + 38) / 76 * H;
  g.fillStyle = '#5a5148';
  for (const [bx, bz, bw, bd] of [[-13, 12, 16, 10], [13, 12, 16, 10], [-13, -8, 16, 10], [13, -8, 16, 10], [-40, 12, 8, 12], [40, 12, 8, 12], [-40, -8, 8, 12], [40, -8, 8, 12]]) {
    g.fillRect(sx(bx - bw / 2), sz(bz - bd / 2), bw / 94 * W, bd / 76 * H);
  }
  g.strokeStyle = '#8a8478'; g.lineWidth = 5;
  for (const x of [-26, 0, 26]) { g.beginPath(); g.moveTo(sx(x), 0); g.lineTo(sx(x), H); g.stroke(); }
  for (const z of [22, 2, -20]) { g.beginPath(); g.moveTo(0, sz(z)); g.lineTo(W, sz(z)); g.stroke(); }
  g.fillStyle = '#b8281c';
  g.fillRect(sx(-6), sz(-7), 10, 4);
  for (const key of ['A', 'B']) {
    const s = SITES[key];
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.beginPath(); g.arc(sx(s.x), sz(s.z), 7, 0, 7); g.fill();
    g.fillStyle = '#111';
    g.font = 'bold 10px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(key, sx(s.x), sz(s.z));
  }
  for (const s of state.effects.smokes) {
    g.fillStyle = 'rgba(220,220,220,0.7)';
    g.beginPath(); g.arc(sx(s.x), sz(s.z), 7, 0, 7); g.fill();
  }
  for (const a of state.actors) {
    if (!a.alive) continue;
    if (a.team === 'birch' && a.spotted <= 0 && !state.stage) continue;
    g.fillStyle = a === state.player ? '#ffffff' : a.team === 'alder' ? '#f5a623' : '#3fa9ff';
    g.beginPath(); g.arc(sx(a.x), sz(a.z), a === state.player ? 4.5 : 3.5, 0, 7); g.fill();
  }
  const p = state.player;
  const px = sx(p.x), pz = sz(p.z);
  g.save();
  g.translate(px, pz);
  g.rotate(Math.atan2(-Math.sin(p.yaw), -Math.cos(p.yaw)) + Math.PI / 2);
  g.fillStyle = '#ffffff';
  g.beginPath(); g.moveTo(0, -7); g.lineTo(4.5, 5); g.lineTo(-4.5, 5); g.closePath(); g.fill();
  g.restore();
  if (state.charge.state === 'dropped' || state.charge.planted) {
    g.fillStyle = '#ffd27f';
    const cx = sx(state.charge.x), cz = sz(state.charge.z);
    g.save(); g.translate(cx, cz); g.rotate(Math.PI / 4);
    g.fillRect(-3.5, -3.5, 7, 7); g.restore();
  }
}

let radarT = 0;
export function updateHud(state, camera, dt) {
  const p = state.player;
  radarT += dt;
  if (radarT > 0.1) { radarT = 0; drawRadar(state); }
  setText('scoreA', String(state.scoreA));
  setText('scoreB', String(state.scoreB));
  const clock = state.charge.planted ? state.charge.fuse : state.phaseT;
  setText('timer', fmtTime(state.phase === 'over' ? 0 : clock));
  setText('roundLabel', 'ROUND ' + state.round + ' / ' + 13);
  setText('healthnum', String(Math.max(0, p.hp)));
  setText('funds', '$' + p.funds);
  el.armourfill.style.width = Math.max(0, p.armour) + '%';
  el.vignette.style.opacity = state.damageT > 0 ? 0.55 : p.hp <= 30 && p.alive ? 0.3 : 0;
  el.flashov.style.opacity = Math.min(1, state.flashOverlay);
  el.lowhp.style.display = p.hp <= 30 && p.alive ? 'block' : 'none';

  // Alive pips.
  let pa = '', pb = '';
  for (const a of state.actors) {
    if (a.team === 'alder') pa += '<i class="' + (a.alive ? 'on' : 'off') + '"></i>';
    else pb += '<i class="' + (a.alive ? 'on' : 'off') + '"></i>';
  }
  if (last.pips !== pa + '|' + pb) { last.pips = pa + '|' + pb; el.pipsA.innerHTML = pa; el.pipsB.innerHTML = pb; }

  // Objective + plan + case chip.
  let obj = 'PLANT THE CHARTER AT SITE A (MONUMENT) OR SITE B (GARDEN)';
  if (state.charge.planted) obj = 'CHARGE PLANTED AT SITE ' + state.charge.site.id + ' — DEFEND IT UNTIL DETONATION';
  else if (state.phase === 'buy') obj = 'BUY PHASE — GEAR UP, THEN TAKE THE DISTRICT';
  else if (state.phase === 'end') obj = state.winReason;
  setText('objective', obj);
  setText('planline', 'PLAN · ' + CHAPTERS[state.chapter - 1].plan);
  const carrier = state.charge.carrier;
  setText('casechip', state.charge.planted ? '◈ CASE PLANTED — SITE ' + state.charge.site.id
    : carrier ? '◈ CASE — ' + carrier.name + (carrier === p ? ' (YOU)' : '') : '◈ CASE DOWN — RECOVER IT');

  // Plant / defuse progress.
  const prog = state.plant.active ? { label: 'PLANTING THE CHARTER — ' + state.plant.who.name + ' · SITE ' + state.plant.site.id, t: state.plant.t, need: state.plant.need }
    : state.defuse.active ? { label: 'DEFUSING THE CHARGE — ' + state.defuse.who.name, t: state.defuse.t, need: state.defuse.need } : null;
  el.plantwrap.style.display = prog ? 'block' : 'none';
  if (prog) {
    setText('plantlabel', prog.label);
    const pct = Math.min(100, Math.round(prog.t / prog.need * 100));
    setText('plantpct', pct + '%');
    el.plantfill.style.width = pct + '%';
    el.plantring.style.background = 'conic-gradient(#ffd27f ' + pct + '%, rgba(255,255,255,0.2) ' + pct + '%)';
  }

  // Weapon panel (raised, compact — see index.html layout).
  const w = WEAPONS[p.weapon];
  setText('wpname', w.name);
  setText('wpammo', isFinite(w.mag) ? String(p.mag) : '—');
  setText('wpres', isFinite(w.mag) ? String(p.reserve) : '∞');
  let slots = '';
  for (const id of p.owned) slots += '<span class="' + (id === p.weapon ? 'sel' : '') + '">' + WEAPONS[id].name + '</span>';
  if (last.slots !== slots) { last.slots = slots; el.wpslots.innerHTML = slots; }
  let utils = '';
  for (const key of ['frag', 'flash', 'smoke', 'flare']) {
    utils += '<span class="' + (p.utilSel === key ? 'sel' : '') + '">' + key.toUpperCase() + ' ×' + p.utilities[key] + '</span>';
  }
  if (last.utils !== utils) { last.utils = utils; el.wputils.innerHTML = utils; }

  // Teammate list.
  let mates = '';
  for (const a of state.actors) {
    if (a.team !== 'alder' || a === p) continue;
    mates += '<div class="mate' + (a.alive ? '' : ' dead') + '"><b>' + a.name + '</b><span>' + a.role + '</span><i><em style="width:' + Math.max(0, a.hp) + '%"></em></i><s>' + Math.max(0, a.hp) + '</s></div>';
  }
  if (last.mates !== mates) { last.mates = mates; el.mates.innerHTML = mates; }

  // Killfeed.
  let kf = '';
  for (const k of state.killfeed) {
    kf += '<div><b class="' + k.team + '">' + k.killer + '</b>' + (k.head ? ' ◉ ' : ' ▸ ') + '<b>' + k.victim + '</b></div>';
  }
  if (last.kf !== kf) { last.kf = kf; el.killfeed.innerHTML = kf; }

  // Chatter.
  let ch = '';
  for (const c of state.chatter.slice(0, 3)) {
    ch += '<div><b>' + c.name + ' <s>' + c.role + '</s></b><span>' + c.text + '</span></div>';
  }
  if (last.ch !== ch) { last.ch = ch; el.chatter.innerHTML = ch; }

  // Crosshair spread + hitmarker.
  const spreadPx = 6 + (w.spread + p.spread + Math.min(1, Math.hypot(p.vx, p.vz) / 5) * 10 + (p.onGround ? 0 : 8)) * 260 + state.view.kick * 30;
  el.crosshair.style.setProperty('--gap', spreadPx.toFixed(1) + 'px');
  el.crosshair.style.display = (!state.buyOpen && !state.scoreOpen && state.started && p.alive && state.phase !== 'over') ? 'block' : 'none';
  el.hitmark.style.opacity = state.hitmarkT > 0 ? 1 : 0;

  // Banner.
  el.banner.style.display = state.bannerT > 0 && state.banner ? 'block' : 'none';
  if (state.bannerT > 0 && state.banner) setText('banner', state.banner);

  // Damage numbers: project pooled divs.
  const nums = state.effects.numbers;
  for (let i = 0; i < numPool.length; i++) {
    const d = numPool[i];
    const n = nums[i];
    if (!n) { d.style.display = 'none'; continue; }
    _v.set(n.x, n.y + n.t * 0.7, n.z).project(camera);
    if (_v.z > 1) { d.style.display = 'none'; continue; }
    d.style.display = 'block';
    d.style.left = ((_v.x * 0.5 + 0.5) * window.innerWidth) + 'px';
    d.style.top = ((-_v.y * 0.5 + 0.5) * window.innerHeight) + 'px';
    d.style.opacity = String(Math.max(0, 1 - n.t / n.life));
    if (d.textContent !== n.text) d.textContent = n.text;
    d.className = 'dmgnum' + (n.head ? ' head' : '');
  }

  // Overlays.
  el.buymenu.style.display = state.buyOpen ? 'flex' : 'none';
  if (state.buyOpen) refreshBuy(state);
  el.scoreboard.style.display = state.scoreOpen ? 'flex' : 'none';
  if (state.scoreOpen) renderScores(state);
  el.startov.style.display = state.started ? 'none' : 'flex';
  el.endov.style.display = state.phase === 'over' ? 'flex' : 'none';
  if (state.phase === 'over') {
    const won = state.winner === 'alder';
    setText('endtitle', won ? 'THE PLAZA STANDS' : 'THE FENCE STAYS UP');
    setText('endtext', won ? ENDINGS.win : ENDINGS.lose);
    setText('endstats', 'FINAL ' + state.scoreA + ' — ' + state.scoreB + '  ·  YOUR K/D ' + p.kills + '/' + p.deaths + '  ·  SHOTS ' + state.stats.shots + '  ·  HITS ' + state.stats.hits + '  ·  HEADSHOTS ' + state.stats.headshots);
  }
  el.hud.style.display = state.started ? 'block' : 'none';
}

function renderScores(state) {
  let rows = '';
  for (const team of ['alder', 'birch']) {
    rows += '<div class="sc-team ' + team + '">' + (team === 'alder' ? 'ALDER — ' + state.scoreA : 'BIRCH — ' + state.scoreB) + '</div>';
    for (const a of state.actors) {
      if (a.team !== team) continue;
      rows += '<div class="sc-row' + (a.alive ? '' : ' dead') + '"><b>' + a.name + '</b><span>' + a.role + '</span><s>' + a.kills + ' / ' + a.deaths + '</s><em>$' + a.funds + '</em><i>' + (a.alive ? Math.max(0, a.hp) + ' HP' : 'DOWN') + '</i></div>';
    }
  }
  if (last.scores !== rows) { last.scores = rows; el.scoretable.innerHTML = rows; }
}
