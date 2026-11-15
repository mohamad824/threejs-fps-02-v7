// Hitscan combat: ray against wall boxes and body spheres, headshots,
// armour, falloff, tracers, sparks, and grenades. No allocations in the
// hot path: ray tests reuse module-level temporaries.
import * as THREE from 'three';
import { ECONOMY } from './data.js';

const _d = { x: 0, y: 0, z: 0 };
let fxScene = null;

// Procedural muzzle-flash starburst, drawn on a canvas: bright core,
// four spikes, soft falloff. Shared by the viewmodel and bot flashes.
let _flashTex = null;
export function flashTexture() {
  if (_flashTex) return _flashTex;
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255,250,220,1)');
  grad.addColorStop(0.35, 'rgba(255,210,110,0.9)');
  grad.addColorStop(1, 'rgba(255,160,40,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = 'rgba(255,244,200,0.95)';
  g.beginPath();
  g.moveTo(32, 0); g.lineTo(36, 28); g.lineTo(64, 32); g.lineTo(36, 36);
  g.lineTo(32, 64); g.lineTo(28, 36); g.lineTo(0, 32); g.lineTo(28, 28);
  g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,240,1)';
  g.beginPath(); g.arc(32, 32, 8, 0, 7); g.fill();
  _flashTex = new THREE.CanvasTexture(c);
  return _flashTex;
}
const tracerPool = [];
const sparkPool = [];
const smokeMeshes = [];
let flareLight = null;
let flareMesh = null;
let flareHalo = null;

export function initFx(scene) {
  fxScene = scene;
  const tGeo = new THREE.CylinderGeometry(0.03, 0.03, 1, 5);
  tGeo.rotateX(Math.PI / 2);
  for (let i = 0; i < 16; i++) {
    const m = new THREE.Mesh(tGeo, new THREE.MeshBasicMaterial({ color: 0xffd27f, transparent: true, opacity: 0, depthWrite: false }));
    m.visible = false; scene.add(m);
    tracerPool.push({ mesh: m, t: 0 });
  }
  const sGeo = new THREE.PlaneGeometry(0.22, 0.22);
  for (let i = 0; i < 48; i++) {
    const m = new THREE.Mesh(sGeo, new THREE.MeshBasicMaterial({ color: 0xffd27f, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    m.visible = false; scene.add(m);
    sparkPool.push({ mesh: m, t: 0, vx: 0, vy: 0, vz: 0 });
  }
  for (let i = 0; i < 4; i++) {
    const smokeMat = new THREE.MeshLambertMaterial({ color: 0xd8d8d8, transparent: true, opacity: 0.7, depthWrite: false });
    const g = new THREE.Group();
    for (let j = 0; j < 6; j++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(1.2, 10, 8), smokeMat);
      s.position.set((j % 3 - 1) * 1.5, 0.7 + (j % 2) * 0.8, (Math.floor(j / 3) - 0.5) * 2.0);
      g.add(s);
    }
    g.visible = false; scene.add(g);
    smokeMeshes.push(g);
  }
  flareLight = new THREE.PointLight(0xff5040, 0, 30);
  scene.add(flareLight);
  flareMesh = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff6040 }));
  flareMesh.visible = false; scene.add(flareMesh);
  flareHalo = new THREE.Mesh(new THREE.SphereGeometry(2.2, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff4030, transparent: true, opacity: 0.3, depthWrite: false }));
  flareHalo.visible = false; scene.add(flareHalo);
}

export function spawnTracer(from, to, team, life) {
  for (const t of tracerPool) {
    if (t.t > 0) continue;
    const m = t.mesh;
    const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
    const len = Math.hypot(dx, dy, dz);
    if (len < 0.2) return;
    m.position.set((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2);
    m.scale.set(1, 1, len);
    m.lookAt(to.x, to.y, to.z);
    m.material.color.set(team === 'birch' ? 0x7fd4ff : 0xffd27f);
    m.material.opacity = 0.95; m.visible = true;
    t.life = life || 0.09; t.t = t.life;
    return;
  }
}

let sparkSeed = 1;
function sparkRand() {
  sparkSeed = (sparkSeed * 16807) % 2147483647;
  return sparkSeed / 2147483647;
}

export function spawnSparks(p, n, color) {
  let made = 0;
  for (const s of sparkPool) {
    if (s.t > 0) continue;
    s.mesh.position.set(p.x, p.y, p.z);
    s.mesh.material.color.set(color || 0xffd27f);
    s.mesh.material.opacity = 1; s.mesh.visible = true;
    s.vx = (sparkRand() - 0.5) * 4; s.vy = sparkRand() * 3 + 1; s.vz = (sparkRand() - 0.5) * 4;
    s.t = 0.35;
    if (++made >= n) return;
  }
}

export function updateFx(dt, state) {
  for (const t of tracerPool) {
    if (t.t <= 0) continue;
    t.t -= dt;
    t.mesh.material.opacity = Math.max(0, t.t / (t.life || 0.09)) * 0.95;
    if (t.t <= 0) t.mesh.visible = false;
  }
  for (const s of sparkPool) {
    if (s.t <= 0) continue;
    s.t -= dt;
    s.vy -= 9 * dt;
    s.mesh.position.x += s.vx * dt; s.mesh.position.y += s.vy * dt; s.mesh.position.z += s.vz * dt;
    s.mesh.material.opacity = Math.max(0, s.t / 0.35);
    if (s.t <= 0) s.mesh.visible = false;
  }
  for (let i = 0; i < smokeMeshes.length; i++) {
    const sm = state.effects.smokes[i];
    const g = smokeMeshes[i];
    if (!sm) { g.visible = false; continue; }
    g.visible = true;
    g.position.set(sm.x, 0, sm.z);
    const grow = Math.min(1, sm.age * 1.4);
    g.scale.setScalar(0.5 + grow * 0.9);
    g.rotation.y += dt * 0.25;
    for (const child of g.children) child.material.opacity = 0.7 * Math.min(1, sm.life / 2);
  }
  const fl = state.effects.flares[0];
  if (fl) {
    flareLight.intensity = 60 * Math.min(1, fl.life / 2);
    flareLight.position.set(fl.x, fl.y, fl.z);
    flareMesh.visible = true;
    flareMesh.position.set(fl.x, fl.y, fl.z);
    flareHalo.visible = true;
    flareHalo.position.set(fl.x, fl.y, fl.z);
    flareHalo.scale.setScalar(1 + Math.sin(state.time * 6) * 0.15);
  } else {
    flareLight.intensity = 0; flareMesh.visible = false; flareHalo.visible = false;
  }
}

function rayAabb(ox, oy, oz, dx, dy, dz, c) {
  let tmin = 0, tmax = 1e9;
  if (Math.abs(dx) < 1e-9) { if (ox < c.minX || ox > c.maxX) return 1e9; }
  else { let a = (c.minX - ox) / dx, b = (c.maxX - ox) / dx; if (a > b) { const t = a; a = b; b = t; } tmin = Math.max(tmin, a); tmax = Math.min(tmax, b); }
  if (Math.abs(dz) < 1e-9) { if (oz < c.minZ || oz > c.maxZ) return 1e9; }
  else { let a = (c.minZ - oz) / dz, b = (c.maxZ - oz) / dz; if (a > b) { const t = a; a = b; b = t; } tmin = Math.max(tmin, a); tmax = Math.min(tmax, b); }
  if (tmax < tmin || tmax < 0) return 1e9;
  const t = tmin > 0 ? tmin : 0;
  const y = oy + dy * t;
  if (y < 0 || y > c.top) return 1e9;
  return t;
}

export function wallDistance(ox, oy, oz, dx, dy, dz, colliders, maxDist) {
  let best = maxDist;
  if (dy < -1e-6) { const tg = -oy / dy; if (tg > 0 && tg < best) best = tg; }
  for (const c of colliders) {
    const t = rayAabb(ox, oy, oz, dx, dy, dz, c);
    if (t < best) best = t;
  }
  return best;
}

function raySphere(ox, oy, oz, dx, dy, dz, cx, cy, cz, r) {
  const lx = cx - ox, ly = cy - oy, lz = cz - oz;
  const tca = lx * dx + ly * dy + lz * dz;
  if (tca < 0) return 1e9;
  const d2 = lx * lx + ly * ly + lz * lz - tca * tca;
  const r2 = r * r;
  if (d2 > r2) return 1e9;
  return tca - Math.sqrt(r2 - d2);
}

const SPHERES = [[1.55, 0.24, 1], [1.02, 0.42, 0], [0.42, 0.38, 0]];

export function fireHitscan(state, shooter, origin, dir, weapon, colliders) {
  const maxDist = weapon.range + 20;
  const wallT = wallDistance(origin.x, origin.y, origin.z, dir.x, dir.y, dir.z, colliders, maxDist);
  let bestT = wallT, bestActor = null, bestHead = false;
  for (const a of state.actors) {
    if (a === shooter || !a.alive) continue;
    if (a.team === shooter.team) continue;
    const drop = a.crouched ? 0.28 : 0;
    for (const [hy, r, isHead] of SPHERES) {
      const t = raySphere(origin.x, origin.y, origin.z, dir.x, dir.y, dir.z, a.x, a.y + hy - drop, a.z, r);
      if (t < bestT) { bestT = t; bestActor = a; bestHead = !!isHead; }
    }
  }
  const hx = origin.x + dir.x * bestT, hy = origin.y + dir.y * bestT, hz = origin.z + dir.z * bestT;
  _d.x = hx; _d.y = hy; _d.z = hz;
  spawnTracer(origin, _d, shooter.team);
  let damage = 0;
  if (bestActor) {
    const fall = Math.max(0.6, 1 - (bestT / weapon.range) * 0.4);
    damage = Math.round(weapon.damage * fall * (bestHead ? weapon.headMult : 1));
    if (bestActor.armour > 0) {
      const absorbed = Math.min(bestActor.armour, Math.round(damage * 0.5));
      bestActor.armour -= absorbed; damage -= absorbed;
    }
    bestActor.hp -= damage;
    bestActor.spotted = 3;
    spawnSparks(_d, 5, 0xff5040);
    state.effects.numbers.push({ x: bestActor.x, y: bestActor.y + 2.0, z: bestActor.z, text: String(damage) + (bestHead ? ' HEADSHOT' : ''), head: bestHead, t: 0, life: 0.9 });
    if (shooter === state.player) { state.hitmarkT = 0.18; state.stats.hits++; if (bestHead) state.stats.headshots++; }
    if (bestActor.hp <= 0) killActor(state, bestActor, shooter, bestHead);
  } else {
    spawnSparks(_d, 3, 0xffe9a0);
  }
  return { hit: bestActor, head: bestHead, damage, point: _d };
}

export function killActor(state, victim, killer, head) {
  victim.alive = false; victim.hp = 0; victim.deaths++;
  victim.planting = 0; victim.defusing = 0;
  if (killer && killer !== victim) { killer.kills++; killer.funds += ECONOMY.kill; }
  state.killfeed.unshift({ killer: killer ? killer.name : '—', victim: victim.name, head: !!head, team: killer ? killer.team : 'alder', t: state.time });
  if (state.killfeed.length > 5) state.killfeed.length = 5;
  if (victim.hasCase) {
    victim.hasCase = false;
    state.charge.state = 'dropped';
    state.charge.x = victim.x; state.charge.z = victim.z; state.charge.carrier = null;
  }
  if (victim === state.player) state.view.third = true;
}

export function throwGrenade(state, owner, kind) {
  if (owner.utilities[kind] <= 0) return false;
  owner.utilities[kind]--;
  const fx = -Math.sin(owner.yaw) * Math.cos(owner.pitch);
  const fz = -Math.cos(owner.yaw) * Math.cos(owner.pitch);
  const fy = Math.sin(owner.pitch) + 0.35;
  state.grenades.push({ kind, owner, x: owner.x, y: owner.y + 1.5, z: owner.z, vx: fx * 11, vy: fy * 9, vz: fz * 11, fuse: kind === 'frag' ? 1.6 : kind === 'flash' ? 1.1 : 1.2 });
  return true;
}

export function tickGrenades(state, dt, colliders) {
  for (let i = state.grenades.length - 1; i >= 0; i--) {
    const g = state.grenades[i];
    g.vy -= 16 * dt;
    g.x += g.vx * dt; g.y += g.vy * dt; g.z += g.vz * dt;
    if (g.y < 0.15) { g.y = 0.15; g.vy = -g.vy * 0.35; g.vx *= 0.6; g.vz *= 0.6; }
    if (g.x < -46 || g.x > 46) g.vx = -g.vx * 0.5;
    if (g.z < -37 || g.z > 37) g.vz = -g.vz * 0.5;
    g.fuse -= dt;
    if (g.fuse > 0) continue;
    state.grenades.splice(i, 1);
    if (g.kind === 'frag') {
      _d.x = g.x; _d.y = g.y + 0.4; _d.z = g.z;
      spawnSparks(_d, 14, 0xff8040);
      for (const a of state.actors) {
        if (!a.alive) continue;
        const dist = Math.hypot(a.x - g.x, a.z - g.z);
        if (dist > 5.5) continue;
        const dmg = Math.round(85 * (1 - dist / 6.5));
        a.hp -= dmg;
        state.effects.numbers.push({ x: a.x, y: a.y + 2.0, z: a.z, text: String(dmg), head: false, t: 0, life: 0.9 });
        if (a.hp <= 0) killActor(state, a, g.owner, false);
      }
      if (g.owner === state.player) state.hitmarkT = 0.18;
    } else if (g.kind === 'flash') {
      for (const a of state.actors) {
        if (!a.alive) continue;
        const dist = Math.hypot(a.x - g.x, a.z - g.z);
        if (dist > 16) continue;
        const facing = (-Math.sin(a.yaw)) * (g.x - a.x) + (-Math.cos(a.yaw)) * (g.z - a.z);
        if (facing > 0) a.blind = Math.max(a.blind, 2.2 * (1 - dist / 20));
      }
      if (state.player.blind > 0) state.flashOverlay = state.player.blind;
    } else if (g.kind === 'smoke') {
      state.effects.smokes.push({ x: g.x, z: g.z, age: 0, life: 12 });
      if (state.effects.smokes.length > 4) state.effects.smokes.shift();
    } else if (g.kind === 'flare') {
      state.effects.flares.push({ x: g.x, y: 14, z: g.z, life: 6 });
      for (const a of state.actors) if (a.team === 'birch' && a.alive) a.spotted = Math.max(a.spotted, 4);
    }
  }
  for (let i = state.effects.smokes.length - 1; i >= 0; i--) {
    const s = state.effects.smokes[i];
    s.age += dt; s.life -= dt;
    if (s.life <= 0) state.effects.smokes.splice(i, 1);
  }
  for (let i = state.effects.flares.length - 1; i >= 0; i--) {
    const f = state.effects.flares[i];
    f.life -= dt; f.y = Math.max(9, f.y - dt * 0.7);
    if (f.life <= 0) state.effects.flares.splice(i, 1);
  }
}

export function smokeBlocks(x1, z1, x2, z2, smokes) {
  for (const s of smokes) {
    const dx = x2 - x1, dz = z2 - z1;
    const len2 = dx * dx + dz * dz;
    let t = len2 > 0 ? ((s.x - x1) * dx + (s.z - z1) * dz) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    const px = x1 + dx * t, pz = z1 + dz * t;
    if (Math.hypot(px - s.x, pz - s.z) < 3.4) return true;
  }
  return false;
}

export function losClear(x1, y1, z1, x2, y2, z2, colliders) {
  const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1;
  const dist = Math.hypot(dx, dy, dz);
  if (dist < 0.01) return true;
  const w = wallDistance(x1, y1, z1, dx / dist, dy / dist, dz / dist, colliders, dist);
  return w >= dist - 0.05;
}
