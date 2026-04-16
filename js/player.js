// js/player.js — Voxel chicken: movement, hop animation, log-riding, death
import * as THREE from 'three';
import { getScene }                              from './scene.js';
import { TILE_SIZE, GRID_MIN_X, GRID_MAX_X, getLane }  from './world.js';
import { SaveManager }                        from './save.js';
import { spawnExplosion, spawnLandingPuff } from './particles.js';

const HOP_DURATION = 0.16; 
const HOP_HEIGHT   = 0.88; 

export class Player {
  constructor() {
    this.gridX = 0; this.gridZ = 0;
    this.worldX = 0; this.worldY = 0; this.worldZ = 0;

    this.isHopping   = false;
    this.hopProgress = 0;      
    this.hopFromX    = 0; this.hopFromZ    = 0;
    this.hopToX      = 0; this.hopToZ      = 0;

    this.isDead    = false;
    this.deathTime = 0;
    this.ridingLog = null;
    this.targetRotY = 0;

    this.mesh   = this._buildMesh();
    this.shadow = this._buildShadow();
    this.warningShadow = this._buildWarningShadow(); 

    const scene = getScene();
    scene.add(this.mesh);
    scene.add(this.shadow);
    scene.add(this.warningShadow);

    this._syncMesh();
    this.ripples = []; 
  }

  _buildMesh() {
    const grp = new THREE.Group();
    const M = {
      yellow : new THREE.MeshLambertMaterial({ color: 0xFDD835 }),
      orange : new THREE.MeshLambertMaterial({ color: 0xFF8F00 }),
      dark   : new THREE.MeshLambertMaterial({ color: 0x1A1A2E }),
      red    : new THREE.MeshLambertMaterial({ color: 0xE53935 }),
      cream  : new THREE.MeshLambertMaterial({ color: 0xFFF9C4 }),
      wing   : new THREE.MeshLambertMaterial({ color: 0xF9A825 }),
    };

    const add = (geo, mat, x, y, z, opts = {}) => {
      const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
      if (opts.rx) m.rotation.x = opts.rx; if (opts.ry) m.rotation.y = opts.ry; if (opts.rz) m.rotation.z = opts.rz;
      m.castShadow = true; grp.add(m); return m;
    };

    const charType = SaveManager.data.currentChar;
    if (charType === 'penguin') {
      const Mz = { black: new THREE.MeshLambertMaterial({color:0x1A1A1A}), white: new THREE.MeshLambertMaterial({color:0xFFFFFF}), orange: new THREE.MeshLambertMaterial({color:0xFF8F00}) };
      add(new THREE.BoxGeometry(0.7,0.8,0.6), Mz.black, 0,0.45,0);
      add(new THREE.BoxGeometry(0.5,0.6,0.1), Mz.white, 0,0.45,-0.31);
      add(new THREE.BoxGeometry(0.6,0.5,0.6), Mz.black, 0,1.0,0);
      add(new THREE.BoxGeometry(0.4,0.3,0.1), Mz.white, 0,1.0,-0.31);
      add(new THREE.SphereGeometry(0.06,8,8), Mz.black, -0.1,1.05,-0.35);
      add(new THREE.SphereGeometry(0.06,8,8), Mz.black, 0.1,1.05,-0.35);
      add(new THREE.BoxGeometry(0.2,0.1,0.2), Mz.orange, 0,0.95,-0.4);
      add(new THREE.BoxGeometry(0.15,0.4,0.4), Mz.black, -0.42,0.5,0).rotation.z=0.2;
      add(new THREE.BoxGeometry(0.15,0.4,0.4), Mz.black, 0.42,0.5,0).rotation.z=-0.2;
      add(new THREE.BoxGeometry(0.25,0.08,0.35), Mz.orange, -0.2,0.04,-0.1);
      add(new THREE.BoxGeometry(0.25,0.08,0.35), Mz.orange, 0.2,0.04,-0.1);
    } else if (charType === 'robot') {
      const Mz = { gray: new THREE.MeshLambertMaterial({color:0x90A4AE}), blue: new THREE.MeshLambertMaterial({color:0x29B6F6}), red: new THREE.MeshLambertMaterial({color:0xF44336}) };
      add(new THREE.BoxGeometry(0.7,0.7,0.6), Mz.gray, 0,0.4,0);
      add(new THREE.BoxGeometry(0.4,0.3,0.1), Mz.blue, 0,0.4,-0.31);
      add(new THREE.BoxGeometry(0.6,0.5,0.6), Mz.gray, 0,0.9,0);
      add(new THREE.BoxGeometry(0.4,0.15,0.1), Mz.red, 0,1.0,-0.31);
      add(new THREE.CylinderGeometry(0.03,0.03,0.3), Mz.gray, 0,1.2,0);
      add(new THREE.SphereGeometry(0.08,8,8), Mz.red, 0,1.35,0);
      add(new THREE.BoxGeometry(0.2,0.2,0.8), Mz.gray, -0.45,0.1,0);
      add(new THREE.BoxGeometry(0.2,0.2,0.8), Mz.gray, 0.45,0.1,0);
    } else {
      add(new THREE.BoxGeometry(0.64,0.70,0.58), M.yellow, 0,0.43,0);
      add(new THREE.BoxGeometry(0.54,0.50,0.52), M.yellow, 0,0.92,0);
      add(new THREE.SphereGeometry(0.075,8,8), M.dark, -0.15,0.95,-0.27);
      add(new THREE.SphereGeometry(0.075,8,8), M.dark, 0.15,0.95,-0.27);
      add(new THREE.SphereGeometry(0.09,8,8), M.cream, -0.15,0.95,-0.25).scale.z=0.3;
      add(new THREE.SphereGeometry(0.09,8,8), M.cream, 0.15,0.95,-0.25).scale.z=0.3;
      add(new THREE.BoxGeometry(0.17,0.10,0.22), M.orange, 0,0.90,-0.37);
      add(new THREE.BoxGeometry(0.13,0.23,0.13), M.red, 0,1.20,0);
      add(new THREE.BoxGeometry(0.14,0.34,0.48), M.wing, -0.40,0.43,0).rotation.z=0.12;
      add(new THREE.BoxGeometry(0.14,0.34,0.48), M.wing, 0.40,0.43,0).rotation.z=-0.12;
      add(new THREE.BoxGeometry(0.09,0.20,0.09), M.orange, -0.15,0.10,0);
      add(new THREE.BoxGeometry(0.09,0.20,0.09), M.orange, 0.15,0.10,0);
      add(new THREE.BoxGeometry(0.20,0.07,0.32), M.orange, -0.15,0.04,-0.08);
      add(new THREE.BoxGeometry(0.20,0.07,0.32), M.orange, 0.15,0.04,-0.08);
    }
    return grp;
  }

  _buildShadow() {
    const geo = new THREE.CircleGeometry(0.38, 14);
    const mat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat); mesh.rotation.x = -Math.PI / 2; mesh.position.y = 0.015; return mesh;
  }

  _buildWarningShadow() {
    const geo = new THREE.CircleGeometry(4, 32);
    const mat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat); mesh.rotation.x = -Math.PI / 2; mesh.position.y = 0.02; return mesh;
  }

  move(dx, dz) {
    if (this.isHopping || this.isDead) return false;
    const nx = this.gridX + dx, nz = this.gridZ + dz;
    if (nx < GRID_MIN_X || nx > GRID_MAX_X || nz < 0) return false;
    const targetLane = getLane(nz);
    if (targetLane && targetLane.occupiedX && targetLane.occupiedX.has(nx)) return false;

    if (dx === 1) this.targetRotY = -Math.PI / 2;
    else if (dx === -1) this.targetRotY = Math.PI / 2;
    else if (dz === 1) this.targetRotY = 0;
    else if (dz === -1) this.targetRotY = Math.PI;

    this.hopFromX = this.worldX; this.hopFromZ = this.worldZ;
    this.hopToX = nx * TILE_SIZE; this.hopToZ = -nz * TILE_SIZE;
    this.gridX = nx; this.gridZ = nz;
    this.isHopping = true; this.hopProgress = 0; this.ridingLog = null;
    return true;
  }

  update(delta, audio) {
    let hopJustLanded = false;
    if (this.isDead) {
      if (this.eagleState === 'FLYING') return false;
      this.deathTime += delta;
      const t = Math.min(this.deathTime * 2.8, 1);
      this.mesh.scale.set(1 + t * 0.55, Math.max(0.01, 1 - t), 1 + t * 0.55);
      this.mesh.position.y = this.worldY - t * 0.25;
      return false;
    }

    let diff = this.targetRotY - this.mesh.rotation.y;
    diff = ((diff + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (diff < -Math.PI) diff += Math.PI * 2;
    this.mesh.rotation.y += diff * 0.38;

    if (this.isHopping) {
      this.hopProgress += delta / HOP_DURATION;
      if (this.hopProgress >= 1) {
        this.hopProgress = 1; this.isHopping = false; hopJustLanded = true;
        this._spawnRipple(); spawnLandingPuff(this.worldX, 0.1, this.worldZ);
      }
      const t = this.hopProgress;
      this.worldX = this.hopFromX + (this.hopToX - this.hopFromX) * t;
      this.worldZ = this.hopFromZ + (this.hopToZ - this.hopFromZ) * t;
      this.worldY = Math.sin(t * Math.PI) * HOP_HEIGHT;
      if (t < 0.15) { const s = t / 0.15; this.mesh.scale.set(1 - s * 0.14, 1 + s * 0.26, 1 - s * 0.14); }
      else if (t > 0.8) { const s = (t - 0.8) / 0.2; this.mesh.scale.set(1 + s * 0.22, 1 - s * 0.28, 1 + s * 0.22); }
      else { this.mesh.scale.set(0.88, 1.24, 0.88); }
    } else {
      this.mesh.scale.x += (1 - this.mesh.scale.x) * 0.35;
      this.mesh.scale.y += (1 - this.mesh.scale.y) * 0.35;
      this.mesh.scale.z += (1 - this.mesh.scale.z) * 0.35;
      this.worldY = 0;
      if (this.ridingLog) {
        this.worldX += this.ridingLog.direction * this.ridingLog.speed * delta;
        this.gridX = Math.round(this.worldX / TILE_SIZE);
        if (this.ridingLog.type === 'lilypad') {
           this.ridingLog.sinkTimer += delta;
           this.ridingLog.mesh.position.y = -Math.sin(Math.min(1, this.ridingLog.sinkTimer)) * 0.4;
           if (this.ridingLog.sinkTimer > 1.2) { this.die('water'); if (audio) audio.playSplash(); } 
           else { this.worldY = this.ridingLog.mesh.position.y; }
        }
        if (this.worldX < GRID_MIN_X * TILE_SIZE - 0.7 || this.worldX > GRID_MAX_X * TILE_SIZE + 0.7) {
          this.die('water'); if (audio) audio.playSplash();
        }
      }
    }
    if (hopJustLanded && audio) audio.playHop();
    this._syncMesh();
    this._updateRipples(delta);
    return hopJustLanded;
  }

  _spawnRipple() {
    const scene = getScene();
    const geo = new THREE.RingGeometry(0.3, 0.35, 32);
    const mat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat); mesh.rotation.x = -Math.PI / 2; mesh.position.set(this.worldX, 0.05, this.worldZ);
    scene.add(mesh);
    this.ripples.push({ mesh, age: 0, lifespan: 0.5 });
  }

  _updateRipples(delta) {
    const scene = getScene();
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i]; r.age += delta;
      if (r.age >= r.lifespan) { scene.remove(r.mesh); this.ripples.splice(i, 1); continue; }
      const t = r.age / r.lifespan; const s = 1 + t * 4; r.mesh.scale.set(s, s, s); r.mesh.material.opacity = (1 - t) * 0.6;
    }
  }

  _syncMesh() {
    this.mesh.position.set(this.worldX, this.worldY, this.worldZ);
    const sh = Math.max(0.25, 1 - this.worldY * 0.38);
    this.shadow.scale.set(sh, sh, sh); this.shadow.material.opacity = 0.18 * sh; this.shadow.position.set(this.worldX, 0.015, this.worldZ);
    this.warningShadow.position.set(this.worldX, 0.02, this.worldZ);
  }

  die(cause = 'car') { if (this.isDead) return; this.isDead = true; this.deathTime = 0; this.deathCause = cause; }

  reset() {
    this.gridX = 0; this.gridZ = 0; this.worldX = 0; this.worldY = 0; this.worldZ = 0;
    this.isHopping = false; this.hopProgress = 0; this.isDead = false; this.deathTime = 0; this.deathCause = null;
    this.ridingLog = null; this.targetRotY = 0; this.mesh.visible = true; this.mesh.scale.set(1, 1, 1);
    this.mesh.rotation.y = 0; this.warningShadow.material.opacity = 0; this.eagleState = null; this.eagleWarned = false;
    this._syncMesh();
  }
}
