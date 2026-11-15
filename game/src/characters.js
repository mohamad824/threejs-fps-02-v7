// One articulated character builder shared by the player model and all
// nine bots: legs on hip pivots, torso plus vest, arms on shoulder pivots,
// head with helmet and visor, a held gun, and the courier case when the
// actor carries it. Forward is -Z; mesh.rotation.y is the actor yaw.
import * as THREE from 'three';
import { TEAM } from './data.js';
import { flashTexture } from './combat.js';

function tagTexture(name, role, team) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(8,10,14,0.72)';
  g.fillRect(0, 0, 256, 64);
  g.fillStyle = TEAM[team].css;
  g.fillRect(0, 0, 256, 9);
  if (team === 'birch') { g.strokeStyle = '#bfe8ff'; g.lineWidth = 4; g.strokeRect(2, 2, 252, 60); }
  g.fillStyle = '#ffffff';
  g.font = 'bold 30px Arial, sans-serif';
  g.textAlign = 'center';
  g.fillText(name, 128, 38);
  g.fillStyle = TEAM[team].css;
  g.font = 'bold 17px Arial, sans-serif';
  g.fillText(role, 128, 58);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function limb(mat, w, h, d, px, py, pz) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(px, py, pz);
  m.castShadow = true;
  return m;
}

export function buildCharacter(actor) {
  const team = TEAM[actor.team];
  const isBirch = actor.team === 'birch';
  const jacket = new THREE.MeshLambertMaterial({ color: isBirch ? 0x2b6cb8 : 0xc77f1a });
  const jacketDark = new THREE.MeshLambertMaterial({ color: isBirch ? 0x1d4e86 : 0x9a5f10 });
  const trousers = new THREE.MeshLambertMaterial({ color: isBirch ? 0x27313c : 0x4a3a26 });
  const skin = new THREE.MeshLambertMaterial({ color: 0xc9a17e });
  const helmetMat = new THREE.MeshLambertMaterial({ color: isBirch ? 0x3f6d9e : 0x7a5a26 });
  const trim = new THREE.MeshBasicMaterial({ color: isBirch ? 0x7fd4ff : 0xffd27f });
  const visor = new THREE.MeshBasicMaterial({ color: isBirch ? 0x9fe4ff : 0xffe9b0 });
  const gunMat = new THREE.MeshLambertMaterial({ color: 0x24262a });
  const vestMat = new THREE.MeshLambertMaterial({ color: isBirch ? 0x1a2c40 : 0x3a2c16 });

  const root = new THREE.Group();
  const parts = {};

  const legL = new THREE.Group(); legL.position.set(-0.16, 0.92, 0);
  legL.add(limb(trousers, 0.2, 0.88, 0.22, 0, -0.44, 0));
  legL.add(limb(gunMat, 0.21, 0.12, 0.3, 0, -0.86, -0.04));
  const legR = new THREE.Group(); legR.position.set(0.16, 0.92, 0);
  legR.add(limb(trousers, 0.2, 0.88, 0.22, 0, -0.44, 0));
  legR.add(limb(gunMat, 0.21, 0.12, 0.3, 0, -0.86, -0.04));
  root.add(legL, legR);
  parts.legL = legL; parts.legR = legR;

  const torso = new THREE.Group(); torso.position.y = 0.92;
  torso.add(limb(jacket, 0.56, 0.62, 0.32, 0, 0.31, 0));
  torso.add(limb(vestMat, 0.58, 0.4, 0.36, 0, 0.34, 0));
  torso.add(limb(trim, 0.58, 0.06, 0.37, 0, 0.12, 0));
  torso.add(limb(jacketDark, 0.6, 0.1, 0.34, 0, 0.6, 0));
  root.add(torso);
  parts.torso = torso;

  const armL = new THREE.Group(); armL.position.set(-0.36, 1.48, 0);
  armL.add(limb(jacket, 0.16, 0.5, 0.18, 0, -0.25, 0));
  armL.add(limb(skin, 0.15, 0.16, 0.16, 0, -0.55, 0));
  const armR = new THREE.Group(); armR.position.set(0.36, 1.48, 0);
  armR.add(limb(jacket, 0.16, 0.5, 0.18, 0, -0.25, 0));
  armR.add(limb(skin, 0.15, 0.16, 0.16, 0, -0.55, 0));
  root.add(armL, armR);
  parts.armL = armL; parts.armR = armR;

  const head = new THREE.Group(); head.position.y = 1.56;
  head.add(limb(skin, 0.3, 0.3, 0.3, 0, 0.15, 0));
  head.add(limb(helmetMat, 0.36, 0.18, 0.36, 0, 0.3, 0));
  head.add(limb(helmetMat, 0.36, 0.1, 0.36, 0, 0.24, 0));
  head.add(limb(trim, 0.37, 0.05, 0.37, 0, 0.2, 0));
  head.add(limb(visor, 0.26, 0.08, 0.05, 0, 0.16, -0.16));
  root.add(head);
  parts.head = head;

  const gun = new THREE.Group(); gun.position.set(0.2, 1.34, -0.42);
  gun.add(limb(gunMat, 0.09, 0.13, 0.62, 0, 0, 0));
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8), gunMat);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.02, -0.42); gun.add(barrel);
  gun.add(limb(gunMat, 0.07, 0.2, 0.1, 0, -0.14, 0.06));
  gun.add(limb(trim, 0.1, 0.04, 0.2, 0, 0.08, -0.1));
  root.add(gun);
  parts.gun = gun;

  const flashMat = new THREE.MeshBasicMaterial({ map: flashTexture(), color: 0xffe9a0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), flashMat);
  flash.position.set(0.2, 1.36, -0.95);
  root.add(flash);
  parts.flash = flash; parts.flashMat = flashMat;

  const caseG = new THREE.Group(); caseG.position.set(0, 1.2, 0.26);
  caseG.add(limb(new THREE.MeshLambertMaterial({ color: 0x8a6a2a }), 0.42, 0.3, 0.14, 0, 0, 0));
  caseG.add(limb(new THREE.MeshBasicMaterial({ color: 0xffd27f }), 0.42, 0.05, 0.15, 0, 0.08, 0));
  caseG.visible = false;
  root.add(caseG);
  parts.caseG = caseG;

  const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTexture(actor.name, actor.role, actor.team), depthTest: true, transparent: true }));
  tag.scale.set(2.1, 0.52, 1);
  tag.position.y = 2.28;
  root.add(tag);
  parts.tag = tag;

  actor.mesh = root;
  actor.parts = parts;
  return root;
}

export function updateCharacter(actor, dt) {
  const m = actor.mesh;
  if (!m) return;
  const p = actor.parts;
  m.position.set(actor.x, actor.y, actor.z);
  m.rotation.y = actor.yaw;
  p.caseG.visible = actor.hasCase && actor.alive;
  p.tag.visible = actor.alive;
  if (!actor.alive) {
    m.rotation.x = -Math.PI / 2 * 0.94;
    m.position.y = actor.y + 0.25;
    p.flashMat.opacity = 0;
    return;
  }
  m.rotation.x = 0;
  const speed = Math.hypot(actor.vx, actor.vz);
  if (speed > 0.3) actor.walkPhase += dt * speed * 1.7;
  const swing = Math.sin(actor.walkPhase) * Math.min(0.55, speed * 0.11);
  p.legL.rotation.x = swing;
  p.legR.rotation.x = -swing;
  const crouch = actor.crouched ? 0.28 : 0;
  m.position.y = actor.y - crouch;
  p.legL.rotation.x += crouch * 0.8;
  p.legR.rotation.x -= crouch * 0.4;
  // Aim pose: both arms forward toward the gun, slight bob while moving.
  const aimX = -1.32 + Math.sin(actor.walkPhase * 2) * 0.02 * Math.min(1, speed * 0.3);
  p.armR.rotation.x = aimX;
  p.armR.rotation.z = -0.18;
  p.armL.rotation.x = aimX + 0.12;
  p.armL.rotation.z = 0.42;
  p.head.rotation.x = actor.pitch * 0.35;
  p.flashMat.opacity = actor.flashT > 0 ? 0.95 : 0;
  if (actor.flashT > 0) p.flash.rotation.z = actor.walkPhase * 3.1;
}
