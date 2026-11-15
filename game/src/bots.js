// Bot brains: lane routes, hold positions, vision with line-of-sight and
// smoke checks, hearing, burst fire, and the plant / defuse objective.
// Bots react to the charge: carriers push to a site, defenders retake.
import { WAYPOINTS, ROUTES } from './world.js';
import { WEAPONS, SITES } from './data.js';
import { fireHitscan, losClear, smokeBlocks } from './combat.js';
import { collideMove } from './move.js';

function angleTo(ax, az, bx, bz) { return Math.atan2(-(bx - ax), -(bz - az)); }
function turnToward(a, target, rate, dt) {
  let d = target - a.yaw;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  const step = Math.max(-rate * dt, Math.min(rate * dt, d));
  a.yaw += step;
  return Math.abs(d) < 0.1;
}

const HOLDS = {
  FENN: { x: -22, z: -24, yaw: 2.6 },
  PETRA: { x: 22, z: -24, yaw: -2.6 },
  ILSA: { x: 3, z: -16, yaw: 0.15 },
  ORIN: { x: -6, z: -12, yaw: 0.6 },
  DORIN: { x: 6, z: -22, yaw: 0.1 },
  MARA: { x: -3, z: -11, yaw: -0.4 },
  TAMS: { x: 2, z: -9, yaw: -0.1 },
  RUE: { x: 24, z: -14, yaw: -2.9 },
  COLE: { x: -24, z: -19, yaw: 2.4 },
};

export function assignBot(bot, state) {
  const routeName = bot.name === 'COLE' ? 'A' : bot.name === 'RUE' ? 'B' : bot.name === 'MARA' || bot.name === 'TAMS' ? 'MID' : null;
  bot.ai = {
    route: routeName ? ROUTES[routeName].map((k) => WAYPOINTS[k]) : null,
    wp: 0, mode: routeName ? 'route' : 'hold',
    target: null, reactT: 0, burst: 0, pauseT: 0, scanT: state.rng.range(0, 3),
    hold: HOLDS[bot.name] || { x: bot.x, z: bot.z, yaw: bot.yaw },
    strafeDir: 1, strafeT: 0, investigate: null, plantWait: 0, defuseWait: 0,
  };
  if (bot.team === 'birch' && bot.name !== 'ORIN') {
    bot.x = bot.ai.hold.x; bot.z = bot.ai.hold.z; bot.yaw = bot.ai.hold.yaw;
  }
}

function perceive(state, bot, colliders) {
  const ai = bot.ai;
  let best = null, bestD = 1e9;
  for (const a of state.actors) {
    if (a.team === bot.team || !a.alive) continue;
    const dx = a.x - bot.x, dz = a.z - bot.z;
    const d = Math.hypot(dx, dz);
    if (d > 48) continue;
    const ang = angleTo(bot.x, bot.z, a.x, a.z);
    let diff = ang - bot.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const alerted = a.spotted > 0 || bot.hearT > 0 || d < 6;
    if (!alerted && Math.abs(diff) > 0.95) continue;
    if (!losClear(bot.x, bot.y + 1.5, bot.z, a.x, a.y + 1.2, a.z, colliders)) continue;
    if (smokeBlocks(bot.x, bot.z, a.x, a.z, state.effects.smokes)) continue;
    if (d < bestD) { bestD = d; best = a; }
  }
  if (best) {
    if (ai.target !== best) { ai.target = best; ai.reactT = state.rng.range(0.22, 0.5); }
    best.spotted = Math.max(best.spotted, 1.5);
  } else if (ai.target && (!ai.target.alive || state.time - bot.lastSeen > 2.5)) {
    ai.target = null;
  }
  if (ai.target) bot.lastSeen = state.time;
  return best;
}

function botShoot(state, bot, target, colliders, dt) {
  const ai = bot.ai;
  const w = WEAPONS[bot.weapon];
  const want = angleTo(bot.x, bot.z, target.x, target.z);
  turnToward(bot, want, 5.5, dt);
  bot.pitch = 0;
  if (ai.reactT > 0) { ai.reactT -= dt; return; }
  if (bot.fireCd > 0) return;
  if (ai.pauseT > 0) { ai.pauseT -= dt; return; }
  if (ai.burst <= 0) {
    ai.burst = w.auto ? state.rng.int(3, 5) : 1;
    ai.pauseT = w.auto ? state.rng.range(0.25, 0.5) : state.rng.range(0.4, 0.7);
  }
  ai.burst--;
  bot.fireCd = 60 / w.rpm;
  const acc = bot.role === 'SNIPER' ? 0.012 : bot.role === 'ANCHOR' ? 0.02 : 0.028;
  const moving = Math.hypot(bot.vx, bot.vz) > 0.5;
  const spread = acc * (moving ? 1.6 : 1) + (target.crouched ? 0.004 : 0);
  const dx = target.x - bot.x + state.rng.range(-spread, spread) * 20;
  const dz = target.z - bot.z + state.rng.range(-spread, spread) * 20;
  const dy = (target.y + 1.15 - (bot.y + 1.5)) + state.rng.range(-0.08, 0.08);
  const len = Math.hypot(dx, dy, dz);
  const res = fireHitscan(state, bot, { x: bot.x, y: bot.y + 1.5, z: bot.z }, { x: dx / len, y: dy / len, z: dz / len }, w, colliders);
  bot.flashT = 0.06;
  bot.hearT = 0;
  if (res.hit === state.player) state.damageT = 0.4;
  if (bot.mag > 0) bot.mag--;
  if (bot.mag <= 0 && bot.reserve > 0) {
    const take = Math.min(w.mag, bot.reserve);
    bot.mag = take; bot.reserve -= take; bot.fireCd = 1.4;
  }
  alertNear(state, bot, 18);
}

export function alertNear(state, from, radius) {
  for (const a of state.actors) {
    if (a === from || !a.alive || a.team === from.team) continue;
    if (Math.hypot(a.x - from.x, a.z - from.z) < radius) a.hearT = 2;
  }
}

function walkTo(state, bot, tx, tz, speed, colliders, dt) {
  const dx = tx - bot.x, dz = tz - bot.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.9) { bot.vx = 0; bot.vz = 0; bot.moving = false; return true; }
  const step = Math.min(d, speed * dt);
  const nx = (dx / d) * step, nz = (dz / d) * step;
  collideMove(bot, nx, nz, colliders);
  bot.vx = nx / dt; bot.vz = nz / dt; bot.moving = true;
  turnToward(bot, angleTo(bot.x, bot.z, tx, tz), 4.5, dt);
  return false;
}

export function tickBot(state, bot, dt, colliders) {
  const ai = bot.ai;
  if (!bot.alive || !ai) return;
  if (bot.blind > 0) { bot.blind -= dt; bot.moving = false; bot.vx = 0; bot.vz = 0; return; }
  if (bot.hearT > 0) bot.hearT -= dt;
  if (bot.fireCd > 0) bot.fireCd -= dt;
  if (bot.flashT > 0) bot.flashT -= dt;

  const target = perceive(state, bot, colliders);
  const charge = state.charge;

  // Objective: carrier pushes to a site and plants.
  if (bot.hasCase && charge.state === 'carried' && !target) {
    const site = SITES.A;
    const d = Math.hypot(bot.x - site.x, bot.z - site.z);
    if (d > site.radius * 0.7) {
      walkTo(state, bot, site.x, site.z, 3.6, colliders, dt);
      return;
    }
    ai.plantWait += dt;
    if (ai.plantWait > 0.4 && !state.plant.active) {
      state.plant.active = true; state.plant.who = bot; state.plant.site = site; state.plant.t = 0;
      bot.planting = 1;
    }
    bot.moving = false; bot.vx = 0; bot.vz = 0;
    return;
  }
  if (bot.planting) { bot.moving = false; return; }
  if (bot.defusing) { bot.moving = false; return; }

  // Defenders retake a planted charge.
  if (charge.planted && bot.team === 'birch' && !target) {
    const d = Math.hypot(bot.x - charge.x, bot.z - charge.z);
    if (d > 2.2) { walkTo(state, bot, charge.x, charge.z, 4.0, colliders, dt); return; }
    ai.defuseWait += dt;
    if (ai.defuseWait > 0.5 && !state.defuse.active) {
      state.defuse.active = true; state.defuse.who = bot; state.defuse.t = 0;
      state.defuse.need = bot.kit ? 3.5 : 5;
      bot.defusing = 1;
    }
    bot.moving = false; return;
  }

  // Attackers pick up a dropped case.
  if (charge.state === 'dropped' && bot.team === 'alder' && !target) {
    const d = Math.hypot(bot.x - charge.x, bot.z - charge.z);
    if (d > 1.0) { walkTo(state, bot, charge.x, charge.z, 4.0, colliders, dt); return; }
    bot.hasCase = true; charge.state = 'carried'; charge.carrier = bot;
    return;
  }

  if (target) {
    botShoot(state, bot, target, colliders, dt);
    // Strafe while engaged at close range; hold ground at long range.
    const d = Math.hypot(target.x - bot.x, target.z - bot.z);
    if (d < 18 && bot.role !== 'SNIPER') {
      ai.strafeT -= dt;
      if (ai.strafeT <= 0) { ai.strafeDir *= -1; ai.strafeT = state.rng.range(0.5, 1.1); }
      const px = -Math.cos(bot.yaw) * ai.strafeDir, pz = Math.sin(bot.yaw) * ai.strafeDir;
      collideMove(bot, px * 1.8 * dt, pz * 1.8 * dt, colliders);
      bot.vx = px * 1.8; bot.vz = pz * 1.8; bot.moving = true;
    } else { bot.vx = 0; bot.vz = 0; bot.moving = false; }
    return;
  }

  if (ai.mode === 'route' && ai.route) {
    const wp = ai.route[ai.wp];
    if (!wp) { ai.mode = 'hold'; return; }
    if (walkTo(state, bot, wp[0], wp[1], bot.role === 'SNIPER' ? 3.0 : 3.6, colliders, dt)) ai.wp++;
    return;
  }
  // Hold: scan the assigned angle, drift back to the hold point.
  const h = ai.hold;
  const d = Math.hypot(bot.x - h.x, bot.z - h.z);
  if (d > 1.5) { walkTo(state, bot, h.x, h.z, 3.2, colliders, dt); return; }
  bot.vx = 0; bot.vz = 0; bot.moving = false;
  ai.scanT += dt;
  bot.yaw = h.yaw + Math.sin(ai.scanT * 0.5) * 0.45;
}
