// js/world.js — Procedural lane generation, obstacle spawning & recycling
import * as THREE from 'three';
import { getScene } from './scene.js';

// ── Constants ──────────────────────────────────────────────────────────────
export const TILE_SIZE    = 2.0;
export const GRID_MIN_X   = -8;
export const GRID_MAX_X   =  8;
export const WORLD_WIDTH  = 80;  

// ── Shared Materials ───────────────────────────────────────────
const M = {
  grass   : [
    new THREE.MeshLambertMaterial({ color: 0x4CAF50 }),
    new THREE.MeshLambertMaterial({ color: 0x43A047 }),
    new THREE.MeshLambertMaterial({ color: 0x388E3C }),
    new THREE.MeshLambertMaterial({ color: 0x66BB6A }),
  ],
  safeLane  : new THREE.MeshLambertMaterial({ color: 0x81C784 }),
  road      : new THREE.MeshLambertMaterial({ color: 0x3D3D3D }),
  roadEdge  : new THREE.MeshLambertMaterial({ color: 0xFFCC02 }),
  roadDash  : new THREE.MeshLambertMaterial({ color: 0xEEEEEE, transparent: true, opacity: 0.5 }),
  river     : new THREE.MeshLambertMaterial({ color: 0x1565C0, transparent: true, opacity: 0.88 }),
  shimmer   : new THREE.MeshLambertMaterial({ color: 0x42A5F5, transparent: true, opacity: 0.38 }),
  rail      : new THREE.MeshLambertMaterial({ color: 0x37474F }),
  railSteel : new THREE.MeshLambertMaterial({ color: 0xB0BEC5 }),
  railTie   : new THREE.MeshLambertMaterial({ color: 0x5D4037 }),
  trunk     : new THREE.MeshLambertMaterial({ color: 0x6D4C41 }),
  foliage   : [
    new THREE.MeshLambertMaterial({ color: 0x2E7D32 }),
    new THREE.MeshLambertMaterial({ color: 0x33691E }),
    new THREE.MeshLambertMaterial({ color: 0x1B5E20 }),
    new THREE.MeshLambertMaterial({ color: 0x43A047 }),
  ],
  snow      : [new THREE.MeshLambertMaterial({ color: 0xECEFF1 }), new THREE.MeshLambertMaterial({ color: 0xCFD8DC })],
  sand      : [new THREE.MeshLambertMaterial({ color: 0xE0E0B0 }), new THREE.MeshLambertMaterial({ color: 0xD7CCC8 })],
  rock      : new THREE.MeshLambertMaterial({ color: 0x78909C }),
  log       : new THREE.MeshLambertMaterial({ color: 0x8D6E63 }),
  logEnd    : new THREE.MeshLambertMaterial({ color: 0xA1887F }),
  wheel     : new THREE.MeshLambertMaterial({ color: 0x212121 }),
  trainBody : new THREE.MeshLambertMaterial({ color: 0x37474F }),
  trainCab  : new THREE.MeshLambertMaterial({ color: 0xC62828 }),
  trainWin  : new THREE.MeshLambertMaterial({ color: 0xFFF8DC }),
  signalGrn : new THREE.MeshLambertMaterial({ color: 0x4CAF50, emissive: 0x4CAF50, emissiveIntensity: 0.5 }),
  signalRed : new THREE.MeshLambertMaterial({ color: 0xFF1744, emissive: 0xFF1744, emissiveIntensity: 0.6 }),
  signalPst : new THREE.MeshLambertMaterial({ color: 0x546E7A }),
  flower    : [
    new THREE.MeshLambertMaterial({ color: 0xFF80AB }), 
    new THREE.MeshLambertMaterial({ color: 0xFFD54F }), 
    new THREE.MeshLambertMaterial({ color: 0xB39DDB }), 
  ],
  bush      : new THREE.MeshLambertMaterial({ color: 0x2E7D32 }),
};

const CAR_COLORS = [0xF44336, 0x2196F3, 0xFFEB3B, 0xFF6F00, 0x9C27B0,
                    0x00BCD4, 0xE91E63, 0x4CAF50, 0xFF5722, 0x3F51B5];

export let lanes = [];
let nextLaneZ    = 0;
let currentScore = 0;

export function initWorld() {
  lanes        = [];
  nextLaneZ    = -12;
  currentScore = 0;
  for (let i = 0; i < 38; i++) _generateLane();
}

export function updateWorld(playerGridZ, score) {
  currentScore = score;
  while (nextLaneZ < playerGridZ + 24) _generateLane();
  for (let i = lanes.length - 1; i >= 0; i--) {
    if (lanes[i].gridZ < playerGridZ - 14) {
      _disposeLane(lanes[i]);
      lanes.splice(i, 1);
    }
  }
}

export function updateObstacles(delta) {
  const hw = WORLD_WIDTH / 2;
  for (const lane of lanes) {
    for (const obs of lane.obstacles) {
      obs.worldX += obs.direction * obs.speed * delta;
      const margin = obs.halfWidth + 1.5;
      if (obs.direction > 0 && obs.worldX - obs.halfWidth > hw + 1)
        obs.worldX = -hw - margin;
      else if (obs.direction < 0 && obs.worldX + obs.halfWidth < -hw - 1)
        obs.worldX = hw + margin;
      obs.mesh.position.x = obs.worldX;
    }
  }
}

export function getLane(gridZ) {
  return lanes.find(l => l.gridZ === gridZ);
}

export function spawnHighscoreMarker(zScore) {
  const scene = getScene();
  const zPos = -zScore * TILE_SIZE;
  const group = new THREE.Group();
  const lineGeo = new THREE.PlaneGeometry(WORLD_WIDTH, 0.4);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xFFD700, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
  const line = new THREE.Mesh(lineGeo, lineMat);
  line.rotation.x = -Math.PI / 2;
  line.position.y = 0.05;
  group.add(line);
  const troBox = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshLambertMaterial({ color: 0xFFD700 }));
  troBox.position.set(GRID_MIN_X - 1, 0.3, 0);
  group.add(troBox);
  group.position.z = zPos;
  scene.add(group);
  return group;
}

export function resetWorld() {
  const scene = getScene();
  for (const lane of lanes) {
    if (lane.group) {
        lane.group.children.forEach(c => {
            if (c.geometry) c.geometry.dispose();
            if (c.material) {
                if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
                else c.material.dispose();
            }
        });
        scene.remove(lane.group);
    }
  }
  lanes     = [];
  nextLaneZ = -12;
}

function _generateLane() {
  const scene = getScene();
  const gridZ = nextLaneZ++;
  const type  = _pickType(gridZ);
  const lane  = _buildLane(type, gridZ);
  lanes.push(lane);
  scene.add(lane.group);
}

function _pickType(gridZ) {
  if (gridZ <= 2) return 'grass';
  const last = lanes.length > 0 ? lanes[lanes.length - 1] : null;
  const r    = Math.random();
  
  // Difficulty Scaling: Higher score = less grass, more hazard lanes
  const grassProb = Math.max(0.12, 0.38 - (currentScore * 0.005));
  const roadProb  = Math.min(0.60, 0.45 + (currentScore * 0.003));
  
  if (currentScore < 8) {
    return r < grassProb ? 'grass' : 'road';
  } else if (currentScore < 22) {
    if (r < grassProb)  return 'grass';
    if (r < grassProb + roadProb)  return 'road';
    if (last && last.type === 'river') return Math.random() < 0.5 ? 'grass' : 'road';
    return 'river';
  } else {
    // Advanced difficulty: introduce rails more frequently
    if (r < grassProb)  return 'grass';
    if (r < grassProb + roadProb)  return 'road';
    if (last && last.type === 'river') return Math.random() < 0.5 ? 'grass' : 'road';
    if (r < 0.82)  return 'river';
    return 'rail';
  }
}

function _buildLane(type, gridZ) {
  const group = new THREE.Group();
  group.position.z = -gridZ * TILE_SIZE;
  const dir = Math.random() < 0.5 ? 1 : -1;
  let speed = 0;
  const obstacles = [];
  let signals = [];
  const occupiedX = new Set();
  if (type === 'grass') { _buildGrass(group, gridZ, occupiedX); } 
  else if (type === 'road') {
    const isFastLane = currentScore > 15 && Math.random() < 0.3;
    const speedMult = isFastLane ? 1.8 : 1.0;
    speed = (2.2 + Math.random() * 2.4 + currentScore * 0.06) * speedMult;
    speed = Math.min(speed, isFastLane ? 15 : 11);
    _buildRoad(group, dir, speed, obstacles, isFastLane);
  } else if (type === 'river') {
    speed = 1.3 + Math.random() * 1.4 + (currentScore * 0.015);
    speed = Math.min(speed, 5);
    _buildRiver(group, dir, speed, obstacles);
  } else if (type === 'rail') {
    speed = 14 + Math.random() * 6 + currentScore * 0.12;
    speed = Math.min(speed, 35);
    const res = _buildRail(group, dir, speed, obstacles, signals);
    var warningMesh = res.warningMesh;
    signals = res.signals;
  }
  for (const obs of obstacles) obs.speed = speed;
  if (gridZ > 0 && gridZ % 50 === 0) { _addRibbon(group); }
  return { gridZ, type, direction: dir, speed, group, obstacles, signals, occupiedX, warningMesh };
}

function _addRibbon(group) {
  const ribbonGeo = new THREE.BoxGeometry(WORLD_WIDTH, 0.1, 0.2);
  const ribbonMat = new THREE.MeshLambertMaterial({ color: 0xFF1744 });
  const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
  ribbon.position.y = 0.05;
  group.add(ribbon);
  const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 4);
  const poleMat = new THREE.MeshLambertMaterial({ color: 0xEEEEEE });
  [-10, 10].forEach(x => {
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(x, 2, 0);
    group.add(pole);
  });
}

function _disposeLane(lane) {
  const scene = getScene();
  scene.remove(lane.group);
  lane.group.traverse(obj => {
    if (obj.isMesh) {
      obj.geometry.dispose();
      if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
      else obj.material.dispose();
    }
  });
}

function _buildGrass(group, gridZ, occupiedX) {
  const isStart = gridZ === 0;
  let mats = M.grass;
  if (currentScore >= 100) mats = M.sand;
  else if (currentScore >= 50) mats = M.snow;
  const mat = isStart ? M.safeLane : mats[gridZ % mats.length];
  const ground = new THREE.Mesh(new THREE.BoxGeometry(WORLD_WIDTH, 0.22, TILE_SIZE), mat);
  ground.position.y = -0.11;
  ground.receiveShadow = true;
  group.add(ground);
  if (isStart) return;
  const playableCols = GRID_MAX_X - GRID_MIN_X + 1;
  const count = 2 + Math.floor(Math.random() * 3);
  let tries = 0;
  while (occupiedX.size < count && tries < 40) {
    tries++;
    const col = Math.floor(Math.random() * playableCols) + GRID_MIN_X;
    if (col === 0 && gridZ < 5 && gridZ > -12) continue;
    if (occupiedX.has(col)) continue;
    occupiedX.add(col);
    const x = col * TILE_SIZE;
    if (Math.random() < 0.6) { _addTree(group, x); } 
    else if (Math.random() < 0.7) { _addRock(group, x); } 
    else { Math.random() < 0.5 ? _addFlower(group, x) : _addBush(group, x); }
  }
}

function _addTree(group, x) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 0.46, 6), M.trunk);
  trunk.position.set(x, 0.23, 0); trunk.castShadow = true; group.add(trunk);
  const fm = M.foliage[Math.floor(Math.random() * M.foliage.length)];
  const c1 = new THREE.Mesh(new THREE.ConeGeometry(0.50, 0.68, 7), fm);
  c1.position.set(x, 0.80, 0); c1.castShadow = true; group.add(c1);
  const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.52, 7), fm);
  c2.position.set(x, 1.14, 0); c2.castShadow = true; group.add(c2);
}

function _addRock(group, x) {
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0), M.rock);
  rock.position.set(x, 0.18, 0);
  rock.rotation.set(Math.random(), Math.random() * Math.PI, Math.random());
  rock.castShadow = true; group.add(rock);
}

function _addFlower(group, x) {
  const grp = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.05), new THREE.MeshLambertMaterial({ color: 0x4CAF50 }));
  stem.position.y = 0.1; grp.add(stem);
  const mat = M.flower[Math.floor(Math.random() * M.flower.length)];
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.1, 0.25), mat);
  head.position.y = 0.2; grp.add(head);
  grp.position.set(x + (Math.random()-0.5), 0, (Math.random()-0.5) * 1.2); group.add(grp);
}

function _addBush(group, x) {
  const bush = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), M.bush);
  bush.position.set(x + (Math.random()-0.5), 0.2, (Math.random()-0.5) * 1.2);
  bush.castShadow = true; group.add(bush);
}

function _buildRoad(group, dir, speed, obstacles, isFastLane = false) {
  const roadMat = isFastLane ? new THREE.MeshLambertMaterial({ color: 0x222222 }) : M.road;
  const surf = new THREE.Mesh(new THREE.BoxGeometry(WORLD_WIDTH, 0.16, TILE_SIZE), roadMat);
  surf.position.y = -0.08; surf.receiveShadow = true; group.add(surf);
  
  const edgeColor = isFastLane ? 0xFF0000 : 0xFFCC02;
  const edgeGeo = new THREE.BoxGeometry(WORLD_WIDTH, 0.02, 0.06);
  const edgeMat = new THREE.MeshLambertMaterial({ color: edgeColor });
  [0.68, -0.68].forEach(z => { const e = new THREE.Mesh(edgeGeo, edgeMat); e.position.set(0, 0.01, z); group.add(e); });
  
  const dashGeo = new THREE.BoxGeometry(0.45, 0.01, 0.10);
  for (let i = GRID_MIN_X; i <= GRID_MAX_X; i++) {
    const d = new THREE.Mesh(dashGeo, M.roadDash); d.position.set(i * TILE_SIZE, 0.015, 0); group.add(d);
  }
  
  const isAmbulance = !isFastLane && Math.random() < 0.1 && currentScore > 10;
  if (isAmbulance) {
    speed = 28; const amb = _createAmbulance(dir);
    amb.worldX = dir > 0 ? -WORLD_WIDTH * 1.5 : WORLD_WIDTH * 1.5;
    amb.mesh.position.x = amb.worldX; group.add(amb.mesh); obstacles.push(amb);
  } else {
    // Dynamic Spacing: More score = potentially more cars & tighter/more random spacing
    const baseCars = isFastLane ? 1 : 2;
    const numCars = baseCars + Math.floor(Math.random() * (currentScore > 30 ? 4 : 3));
    const spread = WORLD_WIDTH / numCars;
    
    for (let i = 0; i < numCars; i++) {
      const useTruck = Math.random() < 0.3;
      const car = useTruck ? _createTruck(dir) : _createCar(dir);
      // More chaotic spacing
      const randomOffset = (Math.random() - 0.5) * spread * 0.7;
      car.worldX = -WORLD_WIDTH / 2 + spread * i + spread * 0.5 + randomOffset;
      car.mesh.position.x = car.worldX; group.add(car.mesh); obstacles.push(car);
    }
  }
}

function _createTruck(dir) {
  const color = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const cargoMat = new THREE.MeshLambertMaterial({ color: 0xEEEEEE });
  const grp = new THREE.Group();
  
  // Cab
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.9), bodyMat);
  cab.position.set(dir > 0 ? 0.8 : -0.8, 0.4, 0); cab.castShadow = true; grp.add(cab);
  
  // Cargo Bed/Container
  const cargo = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 0.95), cargoMat);
  cargo.position.set(dir > 0 ? -0.3 : 0.3, 0.5, 0); cargo.castShadow = true; grp.add(cargo);
  
  const wGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.15, 8);
  [[0.8,0.2,0.5], [0.8,0.2,-0.5], [-0.2,0.2,0.5], [-0.2,0.2,-0.5], [-0.8,0.2,0.5], [-0.8,0.2,-0.5]].forEach(([x, y, z]) => {
    const w = new THREE.Mesh(wGeo, M.wheel); w.rotation.x = Math.PI/2; 
    w.position.set(dir > 0 ? x : -x, y, z); grp.add(w);
  });
  
  if (dir < 0) grp.rotation.y = Math.PI;
  return { mesh: grp, worldX: 0, halfWidth: 1.2, direction: dir, speed: 0, type: 'truck' };
}

function _createAmbulance(dir) {
  const grp = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 0.9), new THREE.MeshLambertMaterial({ color: 0xFFFFFF }));
  body.position.y = 0.45; body.castShadow = true; grp.add(body);
  const redLight = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.3), new THREE.MeshLambertMaterial({ color: 0xFF0000, emissive: 0xFF0000, emissiveIntensity: 1 }));
  redLight.position.set(dir > 0 ? 0.3 : -0.3, 0.9, 0); grp.add(redLight);
  const blueLight = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.3), new THREE.MeshLambertMaterial({ color: 0x0000FF, emissive: 0x0000FF, emissiveIntensity: 1 }));
  blueLight.position.set(dir > 0 ? -0.3 : 0.3, 0.9, 0); grp.add(blueLight);
  const wGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.14, 8);
  [[0.5,0.18,0.5], [-0.5,0.18,0.5], [0.5,0.18,-0.5], [-0.5,0.18,-0.5]].forEach(([x, y, z]) => {
    const w = new THREE.Mesh(wGeo, M.wheel); w.rotation.x = Math.PI/2; w.position.set(x, y, z); grp.add(w);
  });
  return { mesh: grp, worldX: 0, halfWidth: 0.9, direction: dir, speed: 0, type: 'ambulance', warningDone: false };
}

function _createCar(dir) {
  const color = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const cabMat = new THREE.MeshLambertMaterial({ color: 0x78909C });
  const grp = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.40, 0.88), bodyMat);
  body.position.y = 0.24; body.castShadow = true; grp.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.28, 0.78), cabMat);
  cab.position.set(-0.05, 0.52, 0); grp.add(cab);
  const hlMat = new THREE.MeshLambertMaterial({ color: 0xFFFDE7 });
  const hlGeo = new THREE.BoxGeometry(0.10, 0.10, 0.16);
  [0.28, -0.28].forEach(z => { const hl = new THREE.Mesh(hlGeo, hlMat); hl.position.set(0.545, 0.24, z); grp.add(hl); });
  const tlMat = new THREE.MeshLambertMaterial({ color: 0xFF1744 });
  [0.28, -0.28].forEach(z => { const tl = new THREE.Mesh(hlGeo, tlMat); tl.position.set(-0.545, 0.24, z); grp.add(tl); });
  const wGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.12, 8);
  [[0.35,0.13,0.48],[-0.35,0.13,0.48],[0.35,0.13,-0.48],[-0.35,0.13,-0.48]].forEach(([x, y, z]) => {
    const w = new THREE.Mesh(wGeo, M.wheel); w.rotation.x = Math.PI/2; w.position.set(x, y, z); grp.add(w);
  });
  if (dir < 0) grp.rotation.y = Math.PI;
  return { mesh: grp, worldX: 0, halfWidth: 0.60, direction: dir, speed: 0, type: 'car' };
}

function _buildRiver(group, dir, speed, obstacles) {
  const water = new THREE.Mesh(new THREE.BoxGeometry(WORLD_WIDTH, 0.13, TILE_SIZE), M.river); water.position.y = -0.065; group.add(water);
  const sGeo = new THREE.BoxGeometry(0.38, 0.01, 0.14);
  for (let i = -4; i <= 4; i++) { const s = new THREE.Mesh(sGeo, M.shimmer); s.position.set(i * 1.75, 0.01, (Math.random() - 0.5) * 0.65); group.add(s); }
  const useLilyPads = Math.random() < 0.25;
  const numLogs = 2 + Math.floor(Math.random() * 2); const spread = WORLD_WIDTH / numLogs;
  for (let i = 0; i < numLogs; i++) {
    const log = useLilyPads ? _createLilyPad(dir) : _createLog(dir);
    log.worldX = -WORLD_WIDTH / 2 + spread * i + spread * 0.2 + Math.random() * spread * 0.6;
    log.mesh.position.x = log.worldX; group.add(log.mesh); obstacles.push(log);
  }
}

function _createLilyPad(dir) {
  const grp = new THREE.Group();
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.12, 12), new THREE.MeshLambertMaterial({ color: 0x4CAF50 }));
  pad.position.y = 0.06; grp.add(pad);
  if (Math.random() > 0.5) { const flower = new THREE.Mesh(new THREE.DodecahedronGeometry(0.15), new THREE.MeshLambertMaterial({ color: 0xFF69B4 })); flower.position.set(0.2, 0.15, 0.2); grp.add(flower); }
  return { mesh: grp, worldX: 0, halfWidth: 0.65, direction: dir, speed: 0, type: 'lilypad', sinkTimer: 0 };
}

function _createLog(dir) {
  const len = 1.85 + Math.random() * 1.8; const grp = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(len, 0.28, 0.92), M.log); body.position.y = 0.12; body.castShadow = true; grp.add(body);
  const capGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.14, 8);
  [len/2, -len/2].forEach(x => { const cap = new THREE.Mesh(capGeo, M.logEnd); cap.rotation.z = Math.PI/2; cap.position.set(x, 0.12, 0); grp.add(cap); });
  const grainGeo = new THREE.BoxGeometry(len, 0.01, 0.05); const grainMat = new THREE.MeshLambertMaterial({ color: 0x6D4C41, transparent: true, opacity: 0.45 });
  [-0.28, 0, 0.28].forEach(z => { const g = new THREE.Mesh(grainGeo, grainMat); g.position.set(0, 0.27, z); grp.add(g); });
  return { mesh: grp, worldX: 0, halfWidth: len / 2, direction: dir, speed: 0, type: 'log' };
}

function _buildRail(group, dir, speed, obstacles, signals) {
  const base = new THREE.Mesh(new THREE.BoxGeometry(WORLD_WIDTH, 0.16, TILE_SIZE), M.rail); base.position.y = -0.08; base.receiveShadow = true; group.add(base);
  const railGeo = new THREE.BoxGeometry(WORLD_WIDTH, 0.07, 0.075);
  [0.24, -0.24].forEach(z => { const r = new THREE.Mesh(railGeo, M.railSteel); r.position.set(0, 0.06, z); group.add(r); });
  const tieGeo = new THREE.BoxGeometry(0.18, 0.09, TILE_SIZE * 0.78);
  for (let i = GRID_MIN_X; i <= GRID_MAX_X; i++) { const tie = new THREE.Mesh(tieGeo, M.railTie); tie.position.set(i * TILE_SIZE * 0.78, 0.045, 0); group.add(tie); }
  const sigX = (dir > 0 ? GRID_MAX_X : GRID_MIN_X) * TILE_SIZE * 0.82;
  const sig = _addSignalPost(group, sigX); signals.push(sig);
  const warnMat = new THREE.MeshBasicMaterial({ color: 0xFF0000, transparent: true, opacity: 0, depthWrite: false });
  const warnGeo = new THREE.BoxGeometry(WORLD_WIDTH, 0.05, TILE_SIZE); const warnMesh = new THREE.Mesh(warnGeo, warnMat); warnMesh.position.y = 0.05; group.add(warnMesh);
  const train = _createTrain(dir); train.worldX = dir > 0 ? -WORLD_WIDTH * 1.6 : WORLD_WIDTH * 1.6; train.mesh.position.x = train.worldX; group.add(train.mesh); obstacles.push(train);
  return { warningMesh, signals };
}

function _addSignalPost(group, x) {
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.95, 6), M.signalPst); post.position.set(x, 0.47, -0.64); group.add(post);
  const light = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), M.signalGrn.clone()); light.position.set(x, 1.02, -0.64); light.userData.isSignal = true; group.add(light); return light;
}

function _createTrain(dir) {
  const len = 7.5 + Math.random() * 4.5; const grp = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(len, 0.88, 1.12), M.trainBody); body.position.y = 0.52; body.castShadow = true; grp.add(body);
  const cabOffset = dir > 0 ? len / 2 - 0.65 : -(len/2 - 0.65);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.96, 1.12), M.trainCab); cab.position.set(cabOffset, 0.56, 0); grp.add(cab);
  const wGeo = new THREE.BoxGeometry(0.02, 0.30, 0.30); const wFaceX = dir > 0 ? len / 2 + 0.01 : -(len/2 + 0.01);
  [0.22, -0.22].forEach(z => { const w = new THREE.Mesh(wGeo, M.trainWin); w.position.set(wFaceX, 0.58, z); grp.add(w); });
  const bwGeo = new THREE.BoxGeometry(0.01, 0.26, 0.28);
  for (let i = 0; i < 4; i++) { const bx = (i - 1.5) * (len / 5); [0.58,-0.58].forEach(z => { const bw = new THREE.Mesh(bwGeo, M.trainWin); bw.position.set(bx, 0.58, z); grp.add(bw); }); }
  const hlMat = new THREE.MeshLambertMaterial({ color: 0xFFFF00, emissive: 0xFFFF00, emissiveIntensity: 0.85 });
  const hl = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.24), hlMat); hl.position.set(dir > 0 ? len/2 + 0.06 : -(len/2 + 0.06), 0.52, 0); grp.add(hl);
  if (dir < 0) grp.rotation.y = Math.PI;
  return { mesh: grp, worldX: 0, halfWidth: len / 2 + 0.4, direction: dir, speed: 0, type: 'train', warningDone: false };
}
