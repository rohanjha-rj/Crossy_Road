// js/particles.js
import * as THREE from 'three';
import { scene } from './scene.js';

export const particles = [];

export function spawnExplosion(x, y, z, color) {
  const pCount = 20;
  const geo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  const mat = new THREE.MeshLambertMaterial({ color });

  for (let i = 0; i < pCount; i++) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x + (Math.random()-0.5)*0.5, y + (Math.random()-0.5)*0.5, z + (Math.random()-0.5)*0.5);
    scene.add(mesh);

    particles.push({
      mesh,
      vx: (Math.random() - 0.5) * 15,
      vy: Math.random() * 15 + 5,
      vz: (Math.random() - 0.5) * 15,
      age: 0,
      lifespan: 1.0 + Math.random() * 0.5
    });
  }
}

export function spawnRain(x, z) {
  const geo = new THREE.BoxGeometry(0.05, 0.4, 0.05);
  const mat = new THREE.MeshBasicMaterial({ color: 0x88CCFF, transparent: true, opacity: 0.6 });
  const mesh = new THREE.Mesh(geo, mat);
  
  const rx = x + (Math.random() - 0.5) * 30;
  const rz = z + (Math.random() - 0.5) * 30;
  mesh.position.set(rx, 25, rz);
  scene.add(mesh);

  particles.push({
    mesh,
    vx: 0,
    vy: -25 - Math.random() * 10,
    vz: 0,
    age: 0,
    lifespan: 2.0,
    type: 'rain'
  });
}

export function spawnLandingPuff(x, y, z) {
  const geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
  const mat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.8 });
  
  for (let i = 0; i < 8; i++) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    scene.add(mesh);
    
    const angle = (i / 8) * Math.PI * 2;
    particles.push({
      mesh,
      vx: Math.cos(angle) * 3,
      vy: Math.random() * 2 + 1,
      vz: Math.sin(angle) * 3,
      age: 0,
      lifespan: 0.6,
      type: 'puff'
    });
  }
}

export function updateParticles(delta) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.age += delta;
    if (p.age >= p.lifespan) {
      scene.remove(p.mesh);
      particles.splice(i, 1);
      continue;
    }

    if (p.type !== 'rain') {
      p.vy -= 40 * delta; // gravity for normal particles
    }
    
    p.mesh.position.x += p.vx * delta;
    p.mesh.position.y += p.vy * delta;
    p.mesh.position.z += p.vz * delta;
    
    if (p.type !== 'rain' && p.mesh.position.y < 0.1) {
      p.mesh.position.y = 0.1;
      p.vy *= -0.5;
    }
    
    const scale = 1 - (p.age / p.lifespan);
    p.mesh.scale.set(scale, scale, scale);
    if (p.mesh.material.transparent) {
      p.mesh.material.opacity = scale * 0.8;
    }
  }
}
