// js/scene.js — Three.js scene, camera, renderer
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

let _scene, _camera, _renderer, _composer, _sun, _fog;
let timeOfDay = 0.15;

export function initScene() {
  console.log("Scene: Initializing components...");
  
  _scene = new THREE.Scene();
  _scene.background = new THREE.Color(0xB8E0FF);
  
  _fog = new THREE.Fog(0xB8E0FF, 20, 45);
  _scene.fog = _fog;

  _renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('game-canvas'),
    antialias: true,
    powerPreference: 'high-performance'
  });
  _renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  _renderer.setSize(window.innerWidth, window.innerHeight);
  _renderer.shadowMap.enabled = true;
  _renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  _camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  _camera.position.set(0, 12, 10);
  _camera.lookAt(0, 0, 0);

  // Lighting
  _scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  
  _sun = new THREE.DirectionalLight(0xfff8e1, 1.3);
  _sun.position.set(10, 20, 10);
  _sun.castShadow = true;
  _sun.shadow.mapSize.set(1024, 1024);
  _sun.shadow.camera.near = 1;
  _sun.shadow.camera.far = 100;
  _sun.shadow.camera.left = -30;
  _sun.shadow.camera.right = 30;
  _sun.shadow.camera.top = 30;
  _sun.shadow.camera.bottom = -30;
  _scene.add(_sun);

  _scene.add(new THREE.HemisphereLight(0x87CEEB, 0x4a7c44, 0.4));

  // Post processing
  try {
    _composer = new EffectComposer(_renderer);
    const renderPass = new RenderPass(_scene, _camera);
    _composer.addPass(renderPass);
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.5, 0.4, 0.8
    );
    _composer.addPass(bloom);
    console.log("Scene: Composer ready.");
  } catch (e) {
    console.warn("Scene: Composer failed.", e);
    _composer = null;
  }

  window.addEventListener('resize', () => {
    _camera.aspect = window.innerWidth / window.innerHeight;
    _camera.updateProjectionMatrix();
    _renderer.setSize(window.innerWidth, window.innerHeight);
    if (_composer) _composer.setSize(window.innerWidth, window.innerHeight);
  });
}

// Getters to ensure live bounds aren't broken by reassignment
export const getScene = () => _scene;
export const getCamera = () => _camera;
export const getRenderer = () => _renderer;
export const getComposer = () => _composer;
export const getSun = () => _sun;

// Direct exports for compatibility if needed, but getters are safer
export { _scene as scene, _camera as camera, _renderer as renderer, _composer as composer };

export function setFogColor(color) {
  const col = new THREE.Color(color);
  _scene.background = col;
  _scene.fog.color = col;
}

export function setSunStyle(color, intensity) {
  _sun.color.set(color);
  _sun.intensity = intensity;
}

export function triggerBiomeSweep() {
  if (_composer) {
    const bloom = _composer.passes[1];
    bloom.strength = 1.2;
    setTimeout(() => { bloom.strength = 0.5; }, 250);
  }
}

export function updateSkyColor(delta) {
  timeOfDay = (timeOfDay + delta * 0.005) % 1.0; 
  let r, g, b;
  if (timeOfDay < 0.4) { [r,g,b] = [0.7,0.85,1.0]; _sun.intensity=1.3; }
  else if (timeOfDay < 0.5) {
    const t = (timeOfDay - 0.4) / 0.1;
    r = 0.7 + t*(0.05-0.7); g = 0.85 + t*(0.05-0.85); b = 1.0 + t*(0.15-1.0);
    _sun.intensity = 1.3 * (1-t) + 0.1;
  } else if (timeOfDay < 0.9) { [r,g,b] = [0.05,0.05,0.15]; _sun.intensity=0.1; }
  else {
    const t = (timeOfDay - 0.9) / 0.1;
    r = 0.05+t*(0.7-0.05); g = 0.05+t*(0.85-0.05); b = 0.15+t*(1.0-0.15);
    _sun.intensity = 0.1 + t*1.2;
  }
  const col = new THREE.Color(r,g,b);
  _scene.background = col;
  _scene.fog.color = col;
}
