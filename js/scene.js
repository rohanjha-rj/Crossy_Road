// js/scene.js — Three.js scene, camera, renderer, lighting
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export let scene, camera, renderer, composer, fog, sun;
let timeOfDay = 0.15; // Start in daytime

export function initScene() {
  // ── Scene ──
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xB8E0FF);
  
  fog = new THREE.Fog(0xB8E0FF, 18, 42);
  scene.fog = fog;

  // ── Renderer ──
  renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('game-canvas'),
    antialias: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // ── Camera ──
  camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    120
  );
  camera.position.set(0, 10, 8);
  camera.lookAt(0, 0, 0);

  // ── Ambient light ──
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));

  // ── Sunlight (with shadows) ──
  sun = new THREE.DirectionalLight(0xfff8e1, 1.45);
  sun.position.set(7, 20, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near   = 1;
  sun.shadow.camera.far    = 90;
  sun.shadow.camera.left   = -28;
  sun.shadow.camera.right  =  28;
  sun.shadow.camera.top    =  28;
  sun.shadow.camera.bottom = -28;
  sun.shadow.bias = -0.0008;
  scene.add(sun);

  // ── Hemisphere (sky / ground bounce) ──
  scene.add(new THREE.HemisphereLight(0x87CEEB, 0x4a7c44, 0.48));

  // ── Post Processing (Bloom) ──
  composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.6, 0.5, 0.75);
  composer.addPass(bloomPass);

  // ── Resize handler ──
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  });
}

/** Biome styling hooks */
export function setFogColor(color) {
  const col = new THREE.Color(color);
  scene.background = col;
  scene.fog.color  = col;
}

export function setSunStyle(color, intensity) {
  sun.color.set(color);
  sun.intensity = intensity;
}

export function triggerBiomeSweep() {
  if (composer) {
    const bloom = composer.passes[1];
    bloom.strength = 1.5;
    setTimeout(() => { bloom.strength = 0.6; }, 200);
  }
}

/** Smoothly update sky / fog tint to create day/night cycle */
export function updateSkyColor(delta) {
  // We keep this automated but allow biomes to override intensity
  timeOfDay = (timeOfDay + delta * 0.01) % 1.0; 

  let r, g, b;
  if (timeOfDay < 0.4) {
    // Day
    [r, g, b] = [0.72, 0.88, 1.0];
    sun.intensity = 1.45;
  } else if (timeOfDay < 0.5) {
    // Dusk (Golden Hour into Night)
    const t = (timeOfDay - 0.4) / 0.1;
    r = 0.72 + t * (0.05 - 0.72);
    g = 0.88 + t * (0.05 - 0.88);
    b = 1.0  + t * (0.15 - 1.0);
    sun.intensity = 1.45 * (1 - t) + 0.1;
  } else if (timeOfDay < 0.9) {
    // Night
    [r, g, b] = [0.05, 0.05, 0.15];
    sun.intensity = 0.1;
  } else {
    // Dawn
    const t = (timeOfDay - 0.9) / 0.1;
    r = 0.05 + t * (0.72 - 0.05);
    g = 0.05 + t * (0.88 - 0.05);
    b = 0.15 + t * (1.0  - 0.15);
    sun.intensity = 0.1 + t * 1.35;
  }

  const col = new THREE.Color(r, g, b);
  scene.background = col;
  scene.fog.color = col;
}
