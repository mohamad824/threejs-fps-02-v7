// First-person viewmodel: the player's own arms and gloved hands visibly
// gripping the held weapon. Never a floating gun. Each hand is aimed by
// exact math: the forearm pivot sits one arm-length back from the grip
// point along a chosen approach direction, so the glove lands exactly on
// the grip or fore-end and stays glued through recoil and reload.
// Rifle grips use both hands, the sidearm one hand, the blade rides low.
import * as THREE from 'three';
import { flashTexture } from './combat.js';

const UP = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3();

function bx(mat, w, h, d, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

function buildHand(glove) {
  // Dark glove built for the rear view: palm back faces the camera,
  // fingertips span wider than the grip so they peek past its sides and
  // below it, thumb out on the camera side. Sized to read at 300px.
  const hand = new THREE.Group();
  hand.add(bx(glove, 0.1, 0.1, 0.055, 0, 0, 0));
  for (let i = 0; i < 4; i++) {
    const f = bx(glove, 0.022, 0.09, 0.028, -0.042 + i * 0.028, -0.055, -0.035);
    f.rotation.x = -0.5;
    hand.add(f);
  }
  const thumb = bx(glove, 0.024, 0.07, 0.028, 0.058, -0.02, 0.01);
  thumb.rotation.set(-0.3, 0, -0.6);
  hand.add(thumb);
  return hand;
}

function buildArm(sleeve, glove) {
  // Pivot at the elbow; sleeve runs up local +Y. The hand is a
  // separate root-level group so its grip orientation is exact.
  const pivot = new THREE.Group();
  pivot.add(bx(sleeve, 0.1, 0.3, 0.11, 0, 0.15, 0));
  pivot.add(bx(glove, 0.104, 0.055, 0.114, 0, 0.3, 0));
  return { pivot };
}

function aimArm(arm, tx, ty, tz, dx, dy, dz) {
  _dir.set(dx, dy, dz).normalize();
  arm.pivot.position.set(tx - _dir.x * 0.42, ty - _dir.y * 0.42, tz - _dir.z * 0.42);
  arm.pivot.quaternion.setFromUnitVectors(UP, _dir);
}

export function buildViewmodel(camera) {
  const sleeve = new THREE.MeshLambertMaterial({ color: 0xd98f22, emissive: 0x3a2408 });
  const sleeveDark = new THREE.MeshLambertMaterial({ color: 0xa86a14, emissive: 0x2a1a04 });
  const glove = new THREE.MeshLambertMaterial({ color: 0x4a3b28, emissive: 0x17100a });
  const gunMat = new THREE.MeshLambertMaterial({ color: 0x565c66, emissive: 0x23262b });
  const gunDark = new THREE.MeshLambertMaterial({ color: 0x33373e, emissive: 0x17191c });
  const accent = new THREE.MeshBasicMaterial({ color: 0xffd27f });
  const steel = new THREE.MeshStandardMaterial({ color: 0xc8d4dc, metalness: 0.7, roughness: 0.35, emissive: 0x3a4048 });

  const root = new THREE.Group();
  camera.add(root);
  // Small fill light so the held weapon never renders as a black blob.
  const fill = new THREE.PointLight(0xfff2d8, 5, 2.5);
  fill.position.set(0, 0.1, -0.3);
  root.add(fill);

  const gunGroup = new THREE.Group();
  gunGroup.scale.setScalar(0.85);
  root.add(gunGroup);

  // Rifle / SMG build. Grip at local (0,-0.1,0.2), fore-end at (0,-0.08,-0.2).
  const rifle = new THREE.Group();
  rifle.add(bx(gunMat, 0.085, 0.11, 0.46, 0, 0, -0.05));
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.3, 10), gunDark);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.02, -0.41); rifle.add(barrel);
  rifle.add(bx(gunDark, 0.07, 0.18, 0.09, 0, -0.13, 0.0));
  const gripMesh = bx(gunDark, 0.07, 0.15, 0.09, 0, -0.11, 0.17);
  gripMesh.rotation.x = 0.25; rifle.add(gripMesh);
  rifle.add(bx(gunDark, 0.06, 0.09, 0.2, 0, -0.01, 0.26));
  rifle.add(bx(gunDark, 0.03, 0.05, 0.08, 0, 0.08, -0.13));
  rifle.add(bx(accent, 0.09, 0.02, 0.2, 0, 0.055, -0.1));
  rifle.add(bx(sleeveDark, 0.07, 0.08, 0.15, 0, -0.085, -0.22));
  const muzzleR = new THREE.Object3D(); muzzleR.position.set(0, 0.02, -0.57); rifle.add(muzzleR);
  gunGroup.add(rifle);

  // Sidearm: short slide, angled grip, one-hand hold.
  const sidearm = new THREE.Group();
  sidearm.add(bx(gunMat, 0.07, 0.08, 0.26, 0, 0.02, -0.05));
  sidearm.add(bx(gunDark, 0.06, 0.05, 0.22, 0, 0.075, -0.05));
  const grip2 = bx(gunDark, 0.06, 0.16, 0.08, 0, -0.09, 0.06);
  grip2.rotation.x = 0.3; sidearm.add(grip2);
  sidearm.add(bx(accent, 0.072, 0.02, 0.1, 0, 0.03, -0.1));
  const muzzleS = new THREE.Object3D(); muzzleS.position.set(0, 0.02, -0.2); sidearm.add(muzzleS);
  gunGroup.add(sidearm);

  // Blade: handle plus a flat steel edge, held low.
  const blade = new THREE.Group();
  blade.add(bx(gunDark, 0.05, 0.05, 0.16, 0, 0, 0.05));
  blade.add(bx(steel, 0.015, 0.07, 0.42, 0, 0.01, -0.24));
  blade.add(bx(accent, 0.06, 0.02, 0.03, 0, 0, -0.04));
  const muzzleB = new THREE.Object3D(); muzzleB.position.set(0, 0, -0.45); blade.add(muzzleB);
  gunGroup.add(blade);

  const flashMat = new THREE.MeshBasicMaterial({ map: flashTexture(), color: 0xffdf8a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), flashMat);
  flash.position.copy(muzzleR.position);
  gunGroup.add(flash);
  const flashLight = new THREE.PointLight(0xffc860, 0, 7);
  flashLight.position.copy(muzzleR.position);
  gunGroup.add(flashLight);

  const armR = buildArm(sleeve, glove);
  const armL = buildArm(sleeve, glove);
  const handR = buildHand(glove);
  const handL = buildHand(glove);
  handR.scale.setScalar(1.35);
  handL.scale.setScalar(1.35);
  root.add(armR.pivot, armL.pivot, handR, handL);

  const vm = {
    root, gunGroup, flashMat, flashLight, armR, armL,
    kind: 'rifle', kick: 0, kickVel: 0, reloadT: -1, reloadDur: 1,
    bobPhase: 0, flashT: 0, muzzle: muzzleR,
    setWeapon(kind) {
      vm.kind = kind;
      rifle.visible = kind === 'rifle' || kind === 'smg';
      sidearm.visible = kind === 'sidearm';
      blade.visible = kind === 'blade';
      vm.muzzle = kind === 'sidearm' ? muzzleS : kind === 'blade' ? muzzleB : muzzleR;
      flash.position.copy(vm.muzzle.position);
      flashLight.position.copy(vm.muzzle.position);
    },
    fire() { vm.kickVel += 2.6; vm.flashT = 0.2; },
    startReload(dur) { vm.reloadT = 0; vm.reloadDur = dur; },
  };

  function pose(dt, moving) {
    // Recoil spring: kick rises on fire, settles back.
    vm.kickVel += (-vm.kick * 42 - vm.kickVel * 9) * dt;
    vm.kick = Math.max(0, vm.kick + vm.kickVel * dt);
    if (vm.flashT > 0) vm.flashT -= dt;
    const f = vm.flashT > 0 ? 1 : 0;
    vm.flashMat.opacity = f * 0.95;
    vm.flashLight.intensity = f * 14;
    if (f) flash.rotation.z = vm.bobPhase * 7.3;
    if (moving) vm.bobPhase += dt * 7;
    const bobY = moving ? Math.sin(vm.bobPhase) * 0.006 : 0;
    const bobX = moving ? Math.cos(vm.bobPhase * 0.5) * 0.004 : 0;
    const k = vm.kick;

    let gx = 0.25, gy = -0.22 + bobY, gz = -0.70 + k * 0.09, rx = k * 0.14, ry = 0;
    // Hand targets in camera space, derived from the kicked gun position
    // so the grip never separates from the hands during recoil.
    let rT = [gx + 0.02, gy - 0.10, gz + 0.17], rD = [-0.35, 0.72, -0.55], rRot = [0.2, 0, -0.08];
    let lT = [gx + 0.01, gy - 0.12, gz - 0.30], lD = [0.5, 0.62, -0.3], lRot = [0.2, 0, 0.08];
    if (vm.kind === 'sidearm') {
      gx = 0.22; gy = -0.21 + bobY; gz = -0.60 + k * 0.07; rx = k * 0.2;
      rT = [gx + 0.01, gy - 0.09, gz + 0.05]; rD = [-0.3, 0.78, -0.5]; rRot = [0.25, 0, -0.08];
      lT = [-0.34, -0.62, -0.3]; lD = [0.15, 0.9, 0.35]; lRot = [0.3, 0, 0.3];
    } else if (vm.kind === 'blade') {
      gx = 0.3; gy = -0.27 + bobY; gz = -0.62; rx = 0.16 + k * 0.1; ry = -0.25;
      rT = [gx + 0.01, gy - 0.03, gz + 0.03]; rD = [-0.4, 0.68, -0.55]; rRot = [0.3, 0, -0.15];
      lT = [-0.34, -0.62, -0.3]; lD = [0.15, 0.9, 0.35]; lRot = [0.3, 0, 0.3];
    }
    if (vm.reloadT >= 0) {
      vm.reloadT += dt;
      const t = Math.min(1, vm.reloadT / vm.reloadDur);
      const dip = Math.sin(t * Math.PI);
      rx += dip * 0.5; gy -= dip * 0.06; gz += dip * 0.05;
      rT = [rT[0], rT[1] - dip * 0.06, rT[2] + dip * 0.05];
      // Support hand travels to the magazine during the reload.
      lT = [lT[0], lT[1] - dip * 0.09, lT[2] + dip * 0.28];
      if (t >= 1) vm.reloadT = -1;
    }
    gunGroup.position.set(gx + bobX, gy, gz);
    gunGroup.rotation.set(rx, ry, -0.1);
    handR.position.set(rT[0] + bobX, rT[1], rT[2]);
    handR.rotation.set(rRot[0], rRot[1], rRot[2]);
    handL.position.set(lT[0] + bobX, lT[1], lT[2]);
    handL.rotation.set(lRot[0], lRot[1], lRot[2]);
    aimArm(armR, rT[0] + bobX, rT[1] + 0.02, rT[2] + 0.03, rD[0], rD[1], rD[2]);
    aimArm(armL, lT[0] + bobX, lT[1] + 0.02, lT[2] + 0.03, lD[0], lD[1], lD[2]);
  }
  vm.update = pose;
  vm.setWeapon('rifle');
  return vm;
}
