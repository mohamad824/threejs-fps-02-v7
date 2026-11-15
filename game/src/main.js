// PILLAR COURT — boot, renderer, camera rig, input, and the fixed-step
// loop. Simulation ticks at 60 Hz from an accumulator; rendering only
// consumes state. The twist: a 5v5 plant/defuse siege in a bright
// residential district, where the crew plants its charge at the base of
// the plaza monument — between apartment blocks, crosswalks, and a
// stalled city bus.
import * as THREE from 'three';
import { createState } from './state.js';
import { setupMatch, startRound, tickSim, cycleWeapon, startReload, buyItem } from './sim.js';
import { buildDistrict } from './world.js';
import { buildCharacter, updateCharacter } from './characters.js';
import { buildViewmodel } from './viewmodel.js';
import { initFx, updateFx, throwGrenade } from './combat.js';
import { initHud, updateHud } from './hud.js';
import { applyStage, tickTableau } from './staging.js';
import { WEAPONS } from './data.js';

const params = new URLSearchParams(location.search);
const stageName = params.get('stage');
const seed = params.get('seed') ? parseInt(params.get('seed'), 10) : 1234;
const state = createState(seed);
const SIM_DT = 1 / 60;

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.06;
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 220);
camera.rotation.order = 'YXZ';
scene.add(camera);

const world = buildDistrict(scene, state.rng);
setupMatch(state);
for (const a of state.actors) scene.add(buildCharacter(a));
initFx(scene);
const vm = buildViewmodel(camera);

// Courier case prop: shown on the ground when dropped, planted, or defused.
const caseProp = new THREE.Group();
const caseBody = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.36, 0.4), new THREE.MeshLambertMaterial({ color: 0x8a6a2a }));
caseBody.castShadow = true;
caseProp.add(caseBody);
const caseLampMat = new THREE.MeshBasicMaterial({ color: 0xff5040 });
const caseLamp = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.1), caseLampMat);
caseLamp.position.set(0, 0.2, 0);
caseProp.add(caseLamp);
caseProp.visible = false;
scene.add(caseProp);

let muzzleWorld = new THREE.Vector3();
const _camTarget = new THREE.Vector3();

initHud(state, {
  start() {
    if (state.started) return;
    state.started = true;
    startRound(state);
    lockPointer();
  },
  closeBuy() { state.buyOpen = false; },
  restart() { location.reload(); },
});

if (stageName) {
  startRound(state);
  applyStage(state, stageName);
}
vm.setWeapon(WEAPONS[state.player.weapon].kind);

function lockPointer() {
  try {
    const p = renderer.domElement.requestPointerLock();
    if (p && p.catch) p.catch(() => {});
  } catch (e) { /* pointer lock unavailable; drag-look still works */ }
}

const keys = state.input.keys;
window.addEventListener('keydown', (e) => {
  if (e.code === 'Tab') { e.preventDefault(); state.scoreOpen = true; return; }
  keys[e.code] = true;
  if (!state.started) return;
  if (e.code === 'KeyB' && state.phase === 'buy' && !state.stage) state.buyOpen = !state.buyOpen;
  else if (e.code === 'KeyB' && state.stage) state.buyOpen = !state.buyOpen;
  if (e.code === 'KeyG') cycleWeapon(state);
  if (e.code === 'KeyR') startReload(state);
  if (e.code === 'KeyV') state.view.third = !state.view.third;
  if (e.code === 'KeyQ' && state.phase === 'live') throwGrenade(state, state.player, state.player.utilSel);
  if (e.code === 'Digit4') state.player.utilSel = 'frag';
  if (e.code === 'Digit5') state.player.utilSel = 'flash';
  if (e.code === 'Digit6') state.player.utilSel = 'smoke';
  if (e.code === 'Digit7') state.player.utilSel = 'flare';
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'Tab') { state.scoreOpen = false; return; }
  keys[e.code] = false;
});
let lookDX = 0, lookDY = 0;
window.addEventListener('mousemove', (e) => {
  if (!state.started) return;
  const locked = document.pointerLockElement === renderer.domElement;
  if (!locked && e.buttons !== 1) return;
  lookDX += e.movementX || 0;
  lookDY += e.movementY || 0;
});
renderer.domElement.addEventListener('mousedown', (e) => {
  if (!state.started) return;
  if (e.button !== 0) return;
  if (document.pointerLockElement !== renderer.domElement) lockPointer();
  state.input.firing = true;
  state.input.fireEdge = true;
});
window.addEventListener('mouseup', () => { state.input.firing = false; });
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function applyLook(dt) {
  const sens = 0.0021;
  state.view.yaw -= lookDX * sens;
  state.view.pitch -= lookDY * sens;
  state.view.pitch = Math.max(-1.2, Math.min(1.2, state.view.pitch));
  lookDX = 0; lookDY = 0;
  state.view.kick = Math.max(0, state.view.kick - dt * 0.9);
}

function updateCamera() {
  const p = state.player;
  const v = state.view;
  const focus = p.alive ? p : state.actors.find((a) => a.team === 'alder' && a.alive) || p;
  const eye = focus.crouched ? 1.15 : 1.62;
  if (!v.third && p.alive) {
    camera.position.set(p.x, p.y + eye, p.z);
    camera.rotation.set(v.pitch + v.kick * 0.05, v.yaw, 0);
    p.mesh.visible = false;
    vm.root.visible = true;
  } else {
    const back = 5.2, up = 1.5;
    const bx = focus.x + Math.sin(v.yaw) * back;
    const bz = focus.z + Math.cos(v.yaw) * back;
    camera.position.set(bx, focus.y + eye + up - 0.6, bz);
    _camTarget.set(focus.x, focus.y + 2.6, focus.z);
    camera.lookAt(_camTarget);
    p.mesh.visible = true;
    vm.root.visible = false;
  }
  vm.muzzle.getWorldPosition(muzzleWorld);
}

function updateChargeProp(t) {
  const c = state.charge;
  if (c.state === 'dropped' || c.planted || c.state === 'defused') {
    caseProp.visible = true;
    caseProp.position.set(c.x, 0.18, c.z);
    caseProp.rotation.y = t * 0.6;
    caseLampMat.color.set(c.planted ? (Math.sin(t * 8) > 0 ? 0xff5040 : 0x501010) : 0xffd27f);
  } else {
    caseProp.visible = false;
  }
}

let last = performance.now();
let acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  applyLook(dt);
  if (state.stageHold) {
    state.time += dt;
    for (let i = state.effects.numbers.length - 1; i >= 0; i--) {
      const n = state.effects.numbers[i];
      n.t += dt;
      if (n.t > n.life) state.effects.numbers.splice(i, 1);
    }
    if (state.hitmarkT > 0) state.hitmarkT -= dt;
    tickTableau(state, dt, vm, muzzleWorld);
  } else if (state.started && state.phase !== 'menu') {
    acc += dt;
    let steps = 0;
    while (acc >= SIM_DT && steps < 4) {
      tickSim(state, SIM_DT, world.colliders);
      acc -= SIM_DT;
      steps++;
    }
    if (steps === 4) acc = 0;
  }
  if (state.fired) { state.fired = false; vm.fire(); }
  if (state.reloadStarted) { state.reloadStarted = false; vm.startReload(WEAPONS[state.player.weapon].kind === 'sidearm' ? 1.5 : 2.1); }
  if (state.switched) { state.switched = false; vm.setWeapon(WEAPONS[state.player.weapon].kind); }
  for (const a of state.actors) {
    if (a.flashT > 0 && state.stageHold) a.flashT -= dt;
    updateCharacter(a, dt);
  }
  updateFx(dt, state);
  updateChargeProp(state.time);
  updateCamera();
  vm.update(dt, state.player.moving, 0, 0);
  updateHud(state, camera, dt);
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);

// Inert debug hook for play-testing. No gameplay reads it.
window.__pillar = {
  state,
  version: 'v7-pillar-court',
  start() { if (!state.started) { state.started = true; startRound(state); } },
  fire() { state.input.firing = true; state.input.fireEdge = true; },
  stopFire() { state.input.firing = false; },
  press(code) { keys[code] = true; setTimeout(() => { keys[code] = false; }, 120); },
  buy(id) { return buyItem(state, id); },
  snapshot() {
    return {
      phase: state.phase, round: state.round, scoreA: state.scoreA, scoreB: state.scoreB,
      hp: state.player.hp, mag: state.player.mag, reserve: state.player.reserve,
      weapon: state.player.weapon, funds: state.player.funds,
      aliveA: state.actors.filter((a) => a.team === 'alder' && a.alive).length,
      aliveB: state.actors.filter((a) => a.team === 'birch' && a.alive).length,
      planted: state.charge.planted, stage: state.stage, third: state.view.third,
    };
  },
};
