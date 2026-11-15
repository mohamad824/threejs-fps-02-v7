// Harrow District: a dense residential neighbourhood in clear bright
// daylight. All geometry is procedural; facade window grids are drawn on
// small canvas textures. No fog, no haze: strong sun, visible shadows.
import * as THREE from 'three';
import { SITES } from './data.js';

const FACADES = [
  { base: '#f2e3c8', trim: '#d9c49a' },
  { base: '#e8a06a', trim: '#c97e4e' },
  { base: '#d8d5cc', trim: '#b3afa4' },
  { base: '#e3c98f', trim: '#c4a869' },
];

function facadeTexture(base, trim, floors, cols, rng) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 192;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 128, 192);
  g.fillStyle = trim; g.fillRect(0, 0, 128, 8); g.fillRect(0, 184, 128, 8);
  const ww = 128 / cols, wh = 176 / floors;
  for (let f = 0; f < floors; f++) {
    for (let i = 0; i < cols; i++) {
      const lit = rng.chance(0.22);
      g.fillStyle = lit ? '#ffe9a8' : '#2e3d4e';
      g.fillRect(i * ww + ww * 0.24, 10 + f * wh + wh * 0.22, ww * 0.52, wh * 0.5);
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.fillRect(i * ww + ww * 0.24, 10 + f * wh + wh * 0.22, ww * 0.52, 2);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function box(w, h, d, mat, x, y, z, parent, shadow) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  if (shadow !== false) { m.castShadow = true; m.receiveShadow = true; }
  parent.add(m);
  return m;
}

export function buildDistrict(scene, rng) {
  const colliders = [];
  const addCol = (x, z, w, d, top) => colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, top: top || 3 });
  scene.background = new THREE.Color(0x7db8e8);
  scene.fog = null;

  const hemi = new THREE.HemisphereLight(0xcfe6ff, 0x8a7a5e, 1.05);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d8, 2.4);
  sun.position.set(38, 62, 26);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -55; sun.shadow.camera.right = 55;
  sun.shadow.camera.top = 55; sun.shadow.camera.bottom = -55;
  sun.shadow.camera.near = 5; sun.shadow.camera.far = 160;
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  scene.add(sun.target);

  const grass = new THREE.MeshLambertMaterial({ color: 0x7fae56 });
  const asphalt = new THREE.MeshLambertMaterial({ color: 0x4a4a50 });
  const walk = new THREE.MeshLambertMaterial({ color: 0xcfc8b8 });
  const plazaMat = new THREE.MeshLambertMaterial({ color: 0xe6ddc8 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 100), grass);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);

  const street = (x, z, w, d) => {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(w, d), asphalt);
    s.rotation.x = -Math.PI / 2; s.position.set(x, 0.02, z); s.receiveShadow = true;
    scene.add(s);
  };
  street(-26, 0, 8, 64); street(0, 0, 8, 64); street(26, 0, 8, 64);
  street(0, 22, 72, 8); street(0, 2, 72, 8); street(0, -20, 72, 8);
  const pave = (x, z, w, d, mat) => {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat || walk);
    s.rotation.x = -Math.PI / 2; s.position.set(x, 0.03, z); s.receiveShadow = true;
    scene.add(s);
  };
  pave(-26, -21, 22, 15, plazaMat); pave(26, -21, 22, 15, plazaMat);
  pave(0, 28, 70, 7); pave(0, -30, 70, 7);

  // Bold white zebra crosswalks at the four main crossings.
  const stripeMat = new THREE.MeshBasicMaterial({ color: 0xf8f8f2 });
  function crosswalk(x, z, alongX) {
    for (let i = 0; i < 6; i++) {
      const off = (i - 2.5) * 1.25;
      const s = new THREE.Mesh(new THREE.PlaneGeometry(alongX ? 0.7 : 7.4, alongX ? 7.4 : 0.7), stripeMat);
      s.rotation.x = -Math.PI / 2;
      s.position.set(x + (alongX ? off : 0), 0.05, z + (alongX ? 0 : off));
      scene.add(s);
    }
  }
  crosswalk(0, 2, true); crosswalk(-26, 2, true); crosswalk(26, 2, true); crosswalk(0, -20, true);
  crosswalk(-8, 2, false); crosswalk(8, 2, false); crosswalk(-14, -20, true);

  // Apartment blocks: varied heights, facade colours, balconies.
  const balconyMat = new THREE.MeshLambertMaterial({ color: 0x8f8a7e });
  const railMat = new THREE.MeshLambertMaterial({ color: 0x3c3c40 });
  const blocks = [
    [-13, 12, 16, 10], [13, 12, 16, 10], [-8, -8, 8, 10], [13, -8, 16, 10],
    [-40, 12, 8, 12], [40, 12, 8, 12], [-40, -8, 8, 12], [40, -8, 8, 12],
    [-34, 33, 14, 8], [-13, 33, 14, 8], [8, 33, 14, 8], [30, 33, 14, 8],
    [-34, -33, 14, 8], [-13, -33, 14, 8], [8, -33, 14, 8], [30, -33, 8, 8],
    [-40, -21, 6, 10], [40, -21, 6, 10], [-40, 28, 8, 8], [40, 28, 8, 8],
  ];
  for (const [bx, bz, bw, bd] of blocks) {
    const h = rng.range(9, 17);
    const f = FACADES[rng.int(0, 3)];
    const tex = facadeTexture(f.base, f.trim, Math.max(3, Math.floor(h / 3)), Math.max(3, Math.floor(bw / 3)), rng);
    const mat = new THREE.MeshLambertMaterial({ map: tex });
    box(bw, h, bd, mat, bx, h / 2, bz, scene);
    box(bw + 0.5, 0.4, bd + 0.5, new THREE.MeshLambertMaterial({ color: 0x6e6252 }), bx, h + 0.2, bz, scene);
    const floors = Math.floor(h / 3);
    for (let fl = 1; fl < floors; fl++) {
      const n = Math.max(2, Math.floor(bw / 5));
      for (let i = 0; i < n; i++) {
        const ox = -bw / 2 + (i + 0.5) * (bw / n);
        box(1.7, 0.18, 0.9, balconyMat, bx + ox, fl * 3 + 0.1, bz + bd / 2 + 0.45, scene);
        box(1.7, 0.7, 0.08, railMat, bx + ox, fl * 3 + 0.5, bz + bd / 2 + 0.88, scene, false);
      }
    }
    addCol(bx, bz, bw, bd, h);
  }

  // Monument: plain stone column, stepped plinth, abstract octahedron
  // with a gold ring. No emblem, no figure, no symbols, no text.
  const stone = new THREE.MeshLambertMaterial({ color: 0xe8e0cc });
  const stoneDark = new THREE.MeshLambertMaterial({ color: 0xc9bfa4 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd9a520, metalness: 0.85, roughness: 0.3, emissive: 0x442a00 });
  const mon = new THREE.Group(); mon.position.set(SITES.A.x, 0, SITES.A.z);
  box(6, 0.5, 6, stoneDark, 0, 0.25, 0, mon);
  box(4.6, 0.5, 4.6, stone, 0, 0.75, 0, mon);
  box(3.2, 0.6, 3.2, stoneDark, 0, 1.3, 0, mon);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.05, 7.2, 12), stone);
  shaft.position.y = 5.2; shaft.castShadow = true; shaft.receiveShadow = true; mon.add(shaft);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.0, 0.6, 12), stoneDark);
  cap.position.y = 9.0; cap.castShadow = true; mon.add(cap);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.9), new THREE.MeshStandardMaterial({ color: 0x7fc4e8, metalness: 0.3, roughness: 0.25, emissive: 0x1a3a4a }));
  gem.position.y = 10.2; gem.castShadow = true; mon.add(gem);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.12, 10, 28), gold);
  ring.position.y = 10.2; ring.rotation.x = Math.PI / 2.4; ring.castShadow = true; mon.add(ring);
  scene.add(mon);
  addCol(SITES.A.x, SITES.A.z, 3.4, 3.4, 10);

  // Demolition fence panels around the plaza edge (the story's fence).
  const fenceMat = new THREE.MeshLambertMaterial({ color: 0xe86a1e });
  const fenceWhite = new THREE.MeshLambertMaterial({ color: 0xf0ead8 });
  for (let i = 0; i < 7; i++) {
    const fx = -36 + i * 3.2, fz = -27.5;
    box(2.8, 1.1, 0.15, i % 2 ? fenceWhite : fenceMat, fx, 0.85, fz, scene);
    box(0.15, 1.5, 0.15, railMat, fx - 1.3, 0.75, fz, scene, false);
    box(0.15, 1.5, 0.15, railMat, fx + 1.3, 0.75, fz, scene, false);
  }

  // Garden court B: low walls, planters, trees, a stone bench ring.
  const planterMat = new THREE.MeshLambertMaterial({ color: 0x9a6b4a });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x4e8a34 });
  const leafMat2 = new THREE.MeshLambertMaterial({ color: 0x5fa03e });
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2c });
  function tree(x, z, s) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * s, 0.26 * s, 2.2 * s, 7), trunkMat);
    trunk.position.y = 1.1 * s; trunk.castShadow = true; g.add(trunk);
    for (const [ox, oy, oz, r, m] of [[0, 2.9, 0, 1.5, leafMat], [0.7, 2.4, 0.3, 1.0, leafMat2], [-0.6, 2.5, -0.3, 0.95, leafMat2]]) {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(r * s, 10, 8), m);
      ball.position.set(ox * s, oy * s, oz * s); ball.castShadow = true; g.add(ball);
    }
    scene.add(g); addCol(x, z, 0.7, 0.7, 3);
  }
  function planter(x, z, w, d) {
    box(w, 0.7, d, planterMat, x, 0.35, z, scene);
    box(w - 0.3, 0.35, d - 0.3, leafMat2, x, 0.85, z, scene, false);
    addCol(x, z, w, d, 1);
  }
  planter(22, -24, 3, 1.4); planter(30, -24, 3, 1.4); planter(22, -18, 3, 1.4); planter(30, -18, 3, 1.4);
  tree(22.5, -26.5, 1.1); tree(29.5, -26.5, 1.0); tree(33, -21, 1.2); tree(19, -21, 1.0);
  box(2.6, 0.5, 0.9, stoneDark, 26, 0.25, -24.5, scene);
  addCol(26, -24.5, 2.6, 0.9, 0.6);

  // Street trees, lamps, planters along the avenues.
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x2e2e33 });
  const lampHead = new THREE.MeshBasicMaterial({ color: 0xfff6d8 });
  function lamp(x, z) {
    box(0.18, 4.6, 0.18, lampMat, x, 2.3, z, scene);
    box(0.7, 0.18, 0.3, lampMat, x, 4.6, z, scene, false);
    box(0.4, 0.16, 0.24, lampHead, x, 4.5, z, scene, false);
    addCol(x, z, 0.3, 0.3, 4.6);
  }
  for (const [x, z] of [[-5, 8], [5, -4], [-5, -14], [5, 16], [-31, 8], [-21, -14], [21, 8], [31, -14], [-31, -14], [21, -4]]) lamp(x, z);
  for (const [x, z, s] of [[-5, 14, 1], [5, 8, 1.1], [-5, -10, 1], [5, -16, 0.9], [-21, 8, 1], [-31, -8, 1.1], [21, 14, 1], [31, 8, 1], [-8, 26, 1], [8, 26, 1.1], [-33, -25, 1], [33, -25, 1]]) tree(x, z, s);
  planter(-5, 24.5, 2.4, 1.1); planter(5, 24.5, 2.4, 1.1); planter(-5, -1, 2.4, 1.1); planter(31, 2, 1.1, 2.4);

  // Pocket park west of Main: opens the diagonal sightline from the mid
  // connector to the monument, and gives the A lane low cover.
  tree(-19, -3.5, 1.0); tree(-12, -13, 1.1); tree(-20, -5, 0.9);
  planter(-15, -9, 2.4, 1.1); planter(-19, -5, 1.1, 2.4);
  box(2.2, 0.5, 0.8, stoneDark, -13.5, 0.25, -12, scene);
  addCol(-13.5, -12, 2.2, 0.8, 0.6);

  // Parked cars in varied colours.
  const carCols = [0xc23b2e, 0x2e6fc2, 0xe8e4da, 0x3a3f45, 0xd9a520, 0x4a7a5a];
  function car(x, z, yaw, col) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw;
    const body = new THREE.MeshLambertMaterial({ color: col });
    box(4.2, 0.75, 1.8, body, 0, 0.55, 0, g);
    box(2.1, 0.65, 1.6, new THREE.MeshLambertMaterial({ color: 0x9fc4d8 }), -0.2, 1.2, 0, g);
    const wheel = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    for (const [wx, wz] of [[-1.4, 0.9], [1.4, 0.9], [-1.4, -0.9], [1.4, -0.9]]) {
      const wgeo = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 10), wheel);
      wgeo.rotation.x = Math.PI / 2; wgeo.position.set(wx, 0.34, wz); g.add(wgeo);
    }
    scene.add(g);
    const c = Math.abs(Math.cos(yaw)), s = Math.abs(Math.sin(yaw));
    addCol(x, z, 4.2 * c + 1.8 * s, 4.2 * s + 1.8 * c, 1.6);
  }
  car(-29, 10, 0.03, carCols[0]); car(-23, -6, -0.02, carCols[1]); car(23, 12, 0.05, carCols[2]);
  car(29, -8, 0, carCols[3]); car(-8, 25, Math.PI / 2, carCols[4]); car(10, 19, Math.PI / 2 + 0.04, carCols[5]);
  car(-2.8, -13, 0.02, carCols[2]);

  // The stalled #12 city bus: distinct red body, cream roof band, dark
  // windows. It blocks the middle of Main street and anchors the mid lane.
  const bus = new THREE.Group(); bus.position.set(-1.2, 0, -5.5); bus.rotation.y = 0.14;
  const busRed = new THREE.MeshLambertMaterial({ color: 0xb8281c });
  const busCream = new THREE.MeshLambertMaterial({ color: 0xf2e8d0 });
  box(10.5, 1.9, 2.6, busRed, 0, 1.35, 0, bus);
  box(10.6, 0.55, 2.65, busCream, 0, 2.55, 0, bus);
  box(10.6, 0.5, 2.65, busRed, 0, 2.95, 0, bus);
  const winMat = new THREE.MeshLambertMaterial({ color: 0x2b3a46 });
  for (let i = 0; i < 5; i++) {
    box(1.5, 0.8, 0.06, winMat, -3.8 + i * 1.9, 1.85, 1.32, bus, false);
    box(1.5, 0.8, 0.06, winMat, -3.8 + i * 1.9, 1.85, -1.32, bus, false);
  }
  box(0.06, 1.1, 2.2, winMat, 5.28, 1.7, 0, bus, false);
  const busWheel = new THREE.MeshLambertMaterial({ color: 0x141414 });
  for (const [wx, wz] of [[-3.4, 1.32], [3.4, 1.32], [-3.4, -1.32], [3.4, -1.32]]) {
    const wgeo = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 12), busWheel);
    wgeo.rotation.x = Math.PI / 2; wgeo.position.set(wx, 0.5, wz); bus.add(wgeo);
  }
  scene.add(bus);
  addCol(-1.2, -5.5, 10.6, 3.0, 3.2);

  // Crates and barriers as mid-street cover.
  const crateMat = new THREE.MeshLambertMaterial({ color: 0xa8845a });
  const crateMat2 = new THREE.MeshLambertMaterial({ color: 0x7d9a6a });
  function crate(x, z, s, mat) { box(s, s, s, mat, x, s / 2, z, scene); addCol(x, z, s, s, s); }
  crate(-22, -12, 1.3, crateMat); crate(-20.6, -12.4, 1.0, crateMat2);
  crate(22, -12, 1.3, crateMat2); crate(-3, -15, 1.3, crateMat); crate(3.4, -15, 1.0, crateMat2);
  crate(-29, -14, 1.2, crateMat); crate(29, -15, 1.2, crateMat);
  crate(-8, 8, 1.2, crateMat2); crate(8, -2, 1.2, crateMat);

  // Perimeter: low brick walls keep the fight inside the district.
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x9a7a5e });
  box(96, 2.2, 1, wallMat, 0, 1.1, 38, scene); box(96, 2.2, 1, wallMat, 0, 1.1, -38, scene);
  box(1, 2.2, 76, wallMat, -47, 1.1, 0, scene); box(1, 2.2, 76, wallMat, 47, 1.1, 0, scene);
  addCol(0, 38, 96, 1, 2.2); addCol(0, -38, 96, 1, 2.2); addCol(-47, 0, 1, 76, 2.2); addCol(47, 0, 1, 76, 2.2);

  // Site marker rings on the ground (team-neutral, readable from above).
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 });
  for (const s of [SITES.A, SITES.B]) {
    const r = new THREE.Mesh(new THREE.RingGeometry(s.radius - 0.25, s.radius, 40), ringMat);
    r.rotation.x = -Math.PI / 2; r.position.set(s.x, 0.06, s.z); scene.add(r);
  }

  return { colliders, sun, monument: mon, bus };
}

export const WAYPOINTS = {
  alderSpawn: [0, 28], alderWest: [-26, 22], alderEast: [26, 22],
  midA: [-26, 2], midM: [0, 2], midB: [26, 2],
  busSouth: [0, -1], busNorth: [-2, -11],
  plazaGate: [-26, -12], plaza: [-26, -19], courtGate: [26, -12], court: [26, -19],
  midNorth: [0, -14], plazaRow: [0, -20], birchSpawn: [0, -30],
  aCorner: [-19, -20], bCorner: [19, -20], aMid: [-26, -6], bMid: [26, -6],
};
export const ROUTES = {
  A: ['alderSpawn', 'alderWest', 'midA', 'aMid', 'plazaGate', 'plaza'],
  MID: ['alderSpawn', 'midM', 'busSouth', 'busNorth', 'midNorth', 'plazaRow'],
  B: ['alderSpawn', 'alderEast', 'midB', 'bMid', 'courtGate', 'court'],
  DEF_A: ['birchSpawn', 'aCorner', 'plaza'],
  DEF_B: ['birchSpawn', 'bCorner', 'court'],
  DEF_MID: ['birchSpawn', 'midNorth', 'busNorth'],
};
