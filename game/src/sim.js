// Fixed-step simulation, kept apart from rendering. One tick advances
// movement, firing, bots, grenades, plant/defuse, and round flow by a
// constant dt; the renderer only consumes state.
import { WEAPONS, ECONOMY, ROUND, SITES, CHATTER, CHAPTERS } from './data.js';
import { makeActor } from './state.js';
import { assignBot, tickBot, alertNear } from './bots.js';
import { fireHitscan, tickGrenades, killActor } from './combat.js';
import { collideMove } from './move.js';

const SPAWNS_A = [[0, 29], [-3, 28], [3, 28], [-6, 29], [6, 29]];
const SPAWNS_B = [[0, -29], [-3, -28], [3, -28], [-6, -29], [6, -29]];

function giveAmmo(a, id) {
  const w = WEAPONS[id];
  a.ammo[id] = { mag: w.mag, reserve: w.reserve };
}

export function setupMatch(state) {
  const p = makeActor('YOU', 'ENTRY', 'alder', 'eclipse');
  p.ammo = {}; giveAmmo(p, 'eclipse');
  p.mag = WEAPONS.eclipse.mag; p.reserve = WEAPONS.eclipse.reserve;
  p.owned = ['eclipse'];
  state.player = p;
  const mates = [['MARA', 'comet'], ['TAMS', 'zenith'], ['RUE', 'comet'], ['COLE', 'nova']];
  const foes = [['FENN', 'nova'], ['ILSA', 'zenith'], ['PETRA', 'nova'], ['ORIN', 'comet'], ['DORIN', 'nova']];
  state.bots = [];
  for (const [name, w] of mates) {
    const b = makeActor(name, name === 'MARA' ? 'SUPPORT' : name === 'TAMS' ? 'SNIPER' : name === 'RUE' ? 'LURKER' : 'CARRIER', 'alder', w);
    b.ammo = {}; giveAmmo(b, w); b.mag = WEAPONS[w].mag; b.reserve = WEAPONS[w].reserve;
    state.bots.push(b);
  }
  for (const [name, w] of foes) {
    const b = makeActor(name, name === 'FENN' || name === 'PETRA' ? 'ANCHOR' : name === 'ILSA' ? 'SNIPER' : name === 'ORIN' ? 'ROAMER' : 'SUPPORT', 'birch', w);
    b.ammo = {}; giveAmmo(b, w); b.mag = WEAPONS[w].mag; b.reserve = WEAPONS[w].reserve;
    b.kit = name === 'FENN' || name === 'DORIN';
    state.bots.push(b);
  }
  state.actors = [p, ...state.bots];
}

export function chapterFor(state) {
  if (state.round >= 7 || state.scoreA >= 6 || state.scoreB >= 6) return 3;
  if (state.round >= 4) return 2;
  return 1;
}

export function startRound(state) {
  state.chapter = chapterFor(state);
  state.phase = 'buy'; state.phaseT = ROUND.buyTime;
  state.plant = { active: false, who: null, site: null, t: 0, need: ROUND.plantTime };
  state.defuse = { active: false, who: null, t: 0, need: ROUND.defuseTime };
  state.charge = { state: 'carried', site: null, x: 0, z: 0, fuse: 0, carrier: null, planted: false };
  state.grenades.length = 0;
  state.effects.smokes.length = 0; state.effects.flares.length = 0;
  state.effects.numbers.length = 0;
  const cole = state.bots.find((b) => b.name === 'COLE');
  let ai = 0, bi = 0;
  state.actors.forEach((a) => {
    a.hp = 100; a.alive = true; a.crouched = false;
    a.planting = 0; a.defusing = 0; a.blind = 0; a.spotted = 0; a.hearT = 0;
    a.hasCase = a === cole;
    a.reloading = 0; a.fireCd = 0; a.spread = 0;
    const sp = a.team === 'alder' ? SPAWNS_A[ai++] : SPAWNS_B[bi++];
    a.x = sp[0]; a.z = sp[1]; a.y = 0; a.vx = 0; a.vz = 0;
    a.yaw = a.team === 'alder' ? 0 : Math.PI;
    a.pitch = 0;
    if (a !== state.player) assignBot(a, state);
    if (a === cole) state.charge.carrier = cole;
  });
  state.player.yaw = 0; state.player.pitch = 0;
  state.view.yaw = 0; state.view.pitch = 0; state.view.third = false;
  const line = CHATTER.buy[(state.round - 1) % CHATTER.buy.length];
  pushChatter(state, line[0], line[1], line[2]);
  if (state.round === 4 || state.round === 7) {
    state.banner = CHAPTERS[state.chapter - 1].title; state.bannerT = 3.2;
  }
}

export function pushChatter(state, name, role, text) {
  state.chatter.unshift({ name, role, text, t: state.time });
  if (state.chatter.length > 4) state.chatter.length = 4;
}

function switchWeapon(state, id) {
  const p = state.player;
  if (!p.owned.includes(id) || p.weapon === id || p.reloading > 0) return;
  p.ammo[p.weapon] = { mag: p.mag, reserve: p.reserve };
  p.weapon = id;
  p.mag = p.ammo[id].mag; p.reserve = p.ammo[id].reserve;
  p.fireCd = 0.25;
  state.switched = true;
}

export function cycleWeapon(state) {
  const p = state.player;
  const i = p.owned.indexOf(p.weapon);
  switchWeapon(state, p.owned[(i + 1) % p.owned.length]);
}

export function buyItem(state, id) {
  const p = state.player;
  const prices = { nova: 2700, zenith: 3200, comet: 1500, eclipse: 500, ridge: 400, frag: 300, flash: 200, smoke: 300, flare: 150, vest: 650, kit: 400, ammo: 250, med: 350 };
  const price = prices[id];
  if (price === undefined || p.funds < price) return false;
  if (WEAPONS[id]) {
    const w = WEAPONS[id];
    if (w.kind === 'rifle' || w.kind === 'smg') {
      for (const owned of [...p.owned]) {
        const ow = WEAPONS[owned];
        if (ow && (ow.kind === 'rifle' || ow.kind === 'smg') && owned !== id) {
          p.owned.splice(p.owned.indexOf(owned), 1);
        }
      }
    }
    if (!p.owned.includes(id)) p.owned.push(id);
    giveAmmo(p, id);
    p.funds -= price;
    switchWeapon(state, id);
    return true;
  }
  if (id === 'frag' || id === 'flash' || id === 'smoke' || id === 'flare') {
    if (p.utilities[id] >= 2) return false;
    p.utilities[id]++; p.funds -= price; return true;
  }
  if (id === 'vest') { if (p.vest) return false; p.vest = true; p.armour = 100; p.funds -= price; return true; }
  if (id === 'kit') { if (p.kit) return false; p.kit = true; p.funds -= price; return true; }
  if (id === 'ammo') {
    for (const owned of p.owned) { const w = WEAPONS[owned]; if (w && isFinite(w.reserve)) p.ammo[owned].reserve = w.reserve; }
    p.reserve = p.ammo[p.weapon].reserve; p.funds -= price; return true;
  }
  if (id === 'med') { if (p.hp >= 100) return false; p.hp = Math.min(100, p.hp + 50); p.funds -= price; return true; }
  return false;
}

function endRound(state, winner, reason) {
  state.phase = 'end'; state.phaseT = ROUND.endTime;
  state.winner = winner; state.winReason = reason;
  if (winner === 'alder') state.scoreA++; else state.scoreB++;
  for (const a of state.actors) {
    a.funds += (a.team === winner ? ECONOMY.win : ECONOMY.loss);
  }
  state.banner = winner === 'alder' ? 'ROUND TO ALDER — ' + reason : 'ROUND TO BIRCH — ' + reason;
  state.bannerT = ROUND.endTime;
  state.view.third = true;
  if (state.scoreA >= ROUND.winAt || state.scoreB >= ROUND.winAt || state.round >= ROUND.maxRounds) {
    state.pendingOver = true;
  }
}

function playerFire(state, colliders) {
  const p = state.player;
  const w = WEAPONS[p.weapon];
  if (p.fireCd > 0 || p.reloading > 0 || !p.alive) return;
  if (w.kind === 'blade') {
    p.fireCd = 60 / w.rpm;
    state.fired = true;
    for (const a of state.actors) {
      if (a.team === p.team || !a.alive) continue;
      const d = Math.hypot(a.x - p.x, a.z - p.z);
      if (d > w.range) continue;
      const ang = Math.atan2(-(a.x - p.x), -(a.z - p.z));
      let diff = ang - p.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) > 0.7) continue;
      a.hp -= w.damage;
      state.effects.numbers.push({ x: a.x, y: a.y + 2.0, z: a.z, text: String(w.damage), head: false, t: 0, life: 0.9 });
      state.hitmarkT = 0.18;
      if (a.hp <= 0) killActor(state, a, p, false);
      break;
    }
    return;
  }
  if (p.mag <= 0) { startReload(state); return; }
  p.mag--;
  p.fireCd = 60 / w.rpm;
  state.stats.shots++;
  const movePen = Math.min(1, Math.hypot(p.vx, p.vz) / 5) * 0.014 + (p.onGround ? 0 : 0.02);
  const spread = w.spread + p.spread + movePen + (p.crouched ? -0.004 : 0);
  const yaw = p.yaw + state.rng.range(-spread, spread);
  const pitch = p.pitch + state.rng.range(-spread, spread) + p.spread * 0.4;
  const cp = Math.cos(pitch);
  const dir = { x: -Math.sin(yaw) * cp, y: Math.sin(pitch), z: -Math.cos(yaw) * cp };
  const eye = eyePos(p);
  fireHitscan(state, p, eye, dir, w, colliders);
  p.flashT = 0.06;
  p.spread = Math.min(0.05, p.spread + w.recoil * 0.55);
  state.view.pitch = Math.min(1.2, state.view.pitch + w.recoil * 0.55);
  state.view.kick += w.recoil * 2.2;
  state.fired = true;
  alertNear(state, p, 20);
  if (p.mag <= 0) state.emptyClick = true;
}

export function startReload(state) {
  const p = state.player;
  const w = WEAPONS[p.weapon];
  if (p.reloading > 0 || p.mag >= w.mag || p.reserve <= 0 || !isFinite(w.mag)) return;
  p.reloading = w.kind === 'sidearm' ? 1.5 : 2.1;
  state.reloadStarted = true;
}

export function eyePos(a) {
  return { x: a.x, y: a.y + (a.crouched ? 1.15 : 1.62), z: a.z };
}

function tickPlayer(state, dt, colliders) {
  const p = state.player;
  const inp = state.input;
  if (!p.alive) return;
  p.yaw = state.view.yaw; p.pitch = state.view.pitch;
  if (p.flashT > 0) p.flashT -= dt;
  if (p.fireCd > 0) p.fireCd -= dt;
  if (p.blind > 0) { p.blind -= dt; state.flashOverlay = Math.max(0, p.blind); }
  p.spread = Math.max(0, p.spread - dt * 0.03);
  if (p.reloading > 0) {
    p.reloading -= dt;
    if (p.reloading <= 0) {
      const w = WEAPONS[p.weapon];
      const need = w.mag - p.mag;
      const take = Math.min(need, p.reserve);
      p.mag += take; p.reserve -= take;
    }
  }
  const k = inp.keys;
  p.crouched = !!k['ControlLeft'] || !!k['ControlRight'];
  const speedMax = p.crouched ? 2.2 : (k['ShiftLeft'] || k['ShiftRight']) ? 2.6 : 5.2;
  let ix = 0, iz = 0;
  if (k['KeyW'] || k['ArrowUp']) iz -= 1;
  if (k['KeyS'] || k['ArrowDown']) iz += 1;
  if (k['KeyA'] || k['ArrowLeft']) ix -= 1;
  if (k['KeyD'] || k['ArrowRight']) ix += 1;
  const sy = Math.sin(p.yaw), cy = Math.cos(p.yaw);
  let tx = 0, tz = 0;
  if (ix || iz) {
    const l = Math.hypot(ix, iz);
    const fx = -sy, fz = -cy, rx = cy, rz = -sy;
    tx = (fx * -iz + rx * ix) / l * speedMax;
    tz = (fz * -iz + rz * ix) / l * speedMax;
  }
  const accel = p.onGround ? 34 : 7;
  p.vx += Math.max(-accel * dt, Math.min(accel * dt, tx - p.vx));
  p.vz += Math.max(-accel * dt, Math.min(accel * dt, tz - p.vz));
  collideMove(p, p.vx * dt, p.vz * dt, colliders);
  p.moving = Math.hypot(p.vx, p.vz) > 0.4;
  // Vertical: gravity, jump, landing.
  p.vy = p.vy || 0;
  if ((k['Space']) && p.onGround) { p.vy = 7.4; p.onGround = false; }
  p.vy -= 21 * dt;
  p.y += p.vy * dt;
  if (p.y <= 0) { p.y = 0; p.vy = 0; p.onGround = true; }
  // Firing: hold for auto, edge for semi.
  const w = WEAPONS[p.weapon];
  const wantFire = w.auto ? inp.firing : inp.fireEdge;
  if (wantFire && state.phase === 'live' && !state.buyOpen) playerFire(state, colliders);
  inp.fireEdge = false;
  // Case pickup.
  if (state.charge.state === 'dropped' && Math.hypot(p.x - state.charge.x, p.z - state.charge.z) < 1.1) {
    p.hasCase = true; state.charge.state = 'carried'; state.charge.carrier = p;
    pushChatter(state, 'YOU', 'ENTRY', 'Charter case recovered. Moving to the monument.');
  }
  // Planting with E held.
  if (k['KeyE'] && p.hasCase && state.phase === 'live') {
    for (const key of ['A', 'B']) {
      const site = SITES[key];
      if (Math.hypot(p.x - site.x, p.z - site.z) < site.radius && !state.plant.active) {
        state.plant.active = true; state.plant.who = p; state.plant.site = site; state.plant.t = 0;
        p.planting = 1;
      }
    }
  }
  if (!k['KeyE'] && state.plant.who === p) {
    state.plant.active = false; state.plant.who = null; state.plant.t = 0; p.planting = 0;
  }
}

function tickObjective(state, dt) {
  if (state.plant.active && state.plant.who) {
    const who = state.plant.who;
    if (!who.alive || Math.hypot(who.x - state.plant.site.x, who.z - state.plant.site.z) > state.plant.site.radius + 0.5) {
      state.plant.active = false; state.plant.who = null; state.plant.t = 0; who.planting = 0;
    } else {
      state.plant.t += dt;
      if (state.plant.t >= state.plant.need) {
        const site = state.plant.site;
        state.charge.planted = true; state.charge.state = 'planted';
        state.charge.site = site; state.charge.x = site.x; state.charge.z = site.z;
        state.charge.fuse = ROUND.fuseTime;
        who.hasCase = false; who.planting = 0;
        who.funds += ECONOMY.plant;
        state.plant.active = false; state.plant.who = null;
        state.banner = 'CHARGE PLANTED — SITE ' + site.id; state.bannerT = 2.5;
        for (const line of CHATTER.plant) pushChatter(state, line[0], line[1], line[2]);
      }
    }
  }
  if (state.defuse.active && state.defuse.who) {
    const who = state.defuse.who;
    if (!who.alive || Math.hypot(who.x - state.charge.x, who.z - state.charge.z) > 3) {
      state.defuse.active = false; state.defuse.who = null; state.defuse.t = 0; who.defusing = 0;
    } else {
      state.defuse.t += dt;
      if (state.defuse.t >= state.defuse.need) {
        who.defusing = 0; state.defuse.active = false;
        who.funds += ECONOMY.defuse;
        endRound(state, 'birch', 'CHARGE DEFUSED');
      }
    }
  }
  if (state.charge.planted && state.phase === 'live') {
    state.charge.fuse -= dt;
    if (state.charge.fuse <= 0) endRound(state, 'alder', 'CHARGE DETONATED');
  }
}

function checkElimination(state) {
  if (state.phase !== 'live') return;
  const aAlive = state.actors.some((a) => a.team === 'alder' && a.alive);
  const bAlive = state.actors.some((a) => a.team === 'birch' && a.alive);
  if (!bAlive) endRound(state, 'alder', 'ELIMINATION');
  else if (!aAlive && !state.charge.planted) endRound(state, 'birch', 'ELIMINATION');
}

export function tickSim(state, dt, colliders) {
  state.tick++;
  state.time += dt;
  if (state.bannerT > 0) state.bannerT -= dt;
  if (state.hitmarkT > 0) state.hitmarkT -= dt;
  if (state.damageT > 0) state.damageT -= dt;
  if (state.flashOverlay > 0 && state.player.blind <= 0) state.flashOverlay = Math.max(0, state.flashOverlay - dt * 1.5);
  for (const a of state.actors) if (a.spotted > 0) a.spotted -= dt;
  for (let i = state.effects.numbers.length - 1; i >= 0; i--) {
    const n = state.effects.numbers[i];
    n.t += dt;
    if (n.t > n.life) state.effects.numbers.splice(i, 1);
  }
  if (state.phase === 'buy') {
    state.phaseT -= dt;
    tickPlayer(state, dt, colliders);
    if (state.phaseT <= 0) {
      state.phase = 'live'; state.phaseT = ROUND.liveTime; state.buyOpen = false;
      state.banner = 'ROUND ' + state.round + ' — GO'; state.bannerT = 1.6;
    }
    return;
  }
  if (state.phase === 'live') {
    state.phaseT -= dt;
    tickPlayer(state, dt, colliders);
    for (const b of state.bots) tickBot(state, b, dt, colliders);
    separate(state);
    tickGrenades(state, dt, colliders);
    tickObjective(state, dt);
    checkElimination(state);
    if (state.phase === 'live' && state.phaseT <= 0 && !state.charge.planted) {
      endRound(state, 'birch', 'TIME EXPIRED — PLANT DENIED');
    }
    // Clutch chatter: one ALDER left, once per round.
    const aAlive = state.actors.filter((a) => a.team === 'alder' && a.alive);
    if (aAlive.length === 1 && !state.clutchSaid) {
      state.clutchSaid = true;
      const line = CHATTER.clutch[state.rng.int(0, 1)];
      pushChatter(state, line[0], line[1], line[2]);
    }
    return;
  }
  if (state.phase === 'end') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) {
      if (state.pendingOver) {
        state.phase = 'over'; state.matchOver = true;
        state.winner = state.scoreA > state.scoreB ? 'alder' : 'birch';
      } else {
        state.round++;
        state.clutchSaid = false;
        startRound(state);
      }
    }
    return;
  }
}

function separate(state) {
  const list = state.actors;
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (!a.alive) continue;
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j];
      if (!b.alive) continue;
      const dx = b.x - a.x, dz = b.z - a.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.01 && d < 0.8) {
        const push = (0.8 - d) / 2;
        const nx = dx / d, nz = dz / d;
        a.x -= nx * push; a.z -= nz * push;
        b.x += nx * push; b.z += nz * push;
      }
    }
  }
}
