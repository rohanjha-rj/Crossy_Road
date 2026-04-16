import * as THREE from 'three';
import { 
  initScene, getScene, getCamera, getRenderer, getComposer,
  updateSkyColor, setFogColor, setSunStyle, triggerBiomeSweep 
} from './scene.js';
import { initWorld, updateWorld, updateObstacles, getLane, resetWorld, lanes, spawnHighscoreMarker } from './world.js';
import { Player }        from './player.js';
import { checkCollisions } from './collision.js';
import { AudioManager }  from './audio.js';
import { ScoreManager }  from './score.js';
import { UIManager }     from './ui.js';
import { SaveManager }   from './save.js';
import { updateParticles, spawnExplosion, spawnRain, spawnLandingPuff } from './particles.js';

// ── Game states ────────────────────────────────────────────────────────────
const S = { MENU: 0, PLAYING: 1, DEAD: 2, PAUSED: 3 };
let state = S.MENU;

let player, audio, score, ui;
let deathTimer  = 0;
const DEATH_WAIT = 1.6;
let inputBuf = null;
let touchOrigin = null;
const warnedLanes = new Set();
let playerIdleTimer = 0;
let lastPlayerGridZ = 0;
let eagleMesh = null;
let hsMarker = null;

function init() {
  console.log("Main: Initializing...");
  try {
    initScene();
    
    // We get these once after initScene
    const scene = getScene();

    audio  = new AudioManager();
    score  = new ScoreManager();
    ui     = new UIManager();
    player = new Player();
    
    initWorld();

    ui.onPlay(() => startGame());
    ui.onRestart(startGame);
    ui.onHome(gotoMenu);

    ui.onPause(() => { if (state === S.PLAYING) { state = S.PAUSED; ui.showPause(); audio.stopBGM(); } });
    ui.onResume(() => { if (state === S.PAUSED) { state = S.PLAYING; ui.hidePause(); audio.startBGM(); } });
    ui.onPauseRestart(() => { ui.hidePause(); startGame(); });
    ui.onPauseHome(() => { ui.hidePause(); gotoMenu(); });

    ui.onRosterOpen(() => {
      ui.renderRoster(SaveManager.data, SaveManager.data.currentChar, (newChar) => {
         SaveManager.data.currentChar = newChar;
         SaveManager.save();
         scene.remove(player.mesh);
         player.mesh = player._buildMesh();
         scene.add(player.mesh);
         player._syncMesh();
         const charIconMap = { 'chicken': '🐔', 'penguin': '🐧', 'robot': '🤖' };
         const logoEl = document.getElementById('logo-chicken');
         if (logoEl) logoEl.textContent = charIconMap[newChar] || '🐔';
         ui.renderRoster(SaveManager.data, SaveManager.data.currentChar, () => {}); 
      });
      ui.showRoster();
    });
    ui.onRosterClose(() => ui.hideRoster());

    score.onUpdate = (cur, best) => ui.updateScore(cur, best);

    window.addEventListener('keydown', handleKey, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    SaveManager.load();
    ui.updateCoins(SaveManager.data.coins);
    ui.setMutedToggle(SaveManager.data.muted);
    audio.muted = SaveManager.data.muted;
    
    const charIconMap = { 'chicken': '🐔', 'penguin': '🐧', 'robot': '🤖' };
    const logoEl = document.getElementById('logo-chicken');
    if (logoEl) logoEl.textContent = charIconMap[SaveManager.data.currentChar] || '🐔';

    ui.onToggleSound(() => {
      SaveManager.setMuted(!SaveManager.data.muted);
      audio.muted = SaveManager.data.muted;
      ui.setMutedToggle(SaveManager.data.muted);
    });

    ui.onGachaOpen(() => ui.showGacha());
    ui.onGachaClose(() => ui.hideGacha());
    ui.onGachaRoll(() => {
      if (SaveManager.spendCoins(100)) {
        ui.startRolling();
        ui.updateCoins(SaveManager.data.coins);
        const chars = ['chicken', 'penguin', 'robot'];
        const names = ['CHICKEN', 'PENGUIN', 'ROBOT'];
        setTimeout(() => {
          const r = Math.floor(Math.random() * chars.length);
          SaveManager.unlockChar(chars[r]);
          SaveManager.data.currentChar = chars[r];
          SaveManager.save();
          ui.stopRolling();
          ui.setGachaPrize(names[r]);
          ui.updateGachaStatus('NEW CHARACTER!');
          audio.playCoin();
          if (logoEl) logoEl.textContent = charIconMap[chars[r]] || '🐔';
          scene.remove(player.mesh);
          player.mesh = player._buildMesh();
          scene.add(player.mesh);
          player._syncMesh();
        }, 1800);
      } else {
        ui.updateGachaStatus('NOT ENOUGH COINS!');
        audio.playDeath();
      }
    });

    ui.showStart();

    let prev = performance.now();
    (function loop(now) {
      requestAnimationFrame(loop);
      const delta = Math.min((now - prev) / 1000, 0.1);
      prev = now;
      try {
        update(delta);
        const composer = getComposer();
        const renderer = getRenderer();
        const sc = getScene();
        const cam = getCamera();
        if (composer) {
          composer.render();
        } else {
          renderer.render(sc, cam);
        }
      } catch (err) { console.error("Loop Err:", err); }
    })(performance.now());
    
    console.log("Main: Ready.");
  } catch (err) {
    console.error("BOOT ERR:", err);
    alert("Game Crash: " + err.message);
  }
}

function startGame() {
  const scene = getScene();
  console.log("Game: Starting...");
  if (hsMarker) { scene.remove(hsMarker); hsMarker = null; }
  
  resetWorld();
  initWorld(); 
  score.reset();
  player.reset();
  
  // Start in air
  player.worldY = 12;
  player.isHopping = true;
  player.hopProgress = 0.5;
  
  if (score.best > 0) hsMarker = spawnHighscoreMarker(score.best);

  state = S.PLAYING;
  ui.showGame(score.best);
  audio.startBGM();
}

function gotoMenu() {
  state = S.MENU;
  ui.showStart();
  audio.stopBGM();
}

function handleKey(e) {
  if (state === S.MENU && (e.key === ' ' || e.key === 'Enter')) {
    e.preventDefault(); startGame(); return;
  }
  if (e.key === 'Escape' || e.key === 'p') {
    if (state === S.PLAYING) { state = S.PAUSED; ui.showPause(); audio.stopBGM(); }
    else if (state === S.PAUSED) { state = S.PLAYING; ui.hidePause(); audio.startBGM(); }
    return;
  }
  if (state !== S.PLAYING) return;
  let dx = 0, dz = 0;
  switch (e.key) {
    case 'ArrowUp':    case 'w': dz =  1; break;
    case 'ArrowDown':  case 's': dz = -1; break;
    case 'ArrowLeft':  case 'a': dx = -1; break;
    case 'ArrowRight': case 'd': dx =  1; break;
    default: return;
  }
  e.preventDefault();
  if (player.isDead) return;
  if (!player.move(dx, dz)) inputBuf = { dx, dz };
}

function handleTouchStart(e) { touchOrigin = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }
function handleTouchEnd(e) {
  if (state === S.MENU) { startGame(); return; }
  if (state !== S.PLAYING || !touchOrigin) return;
  const dx = e.changedTouches[0].clientX - touchOrigin.x;
  const dy = e.changedTouches[0].clientY - touchOrigin.y;
  const ax = Math.abs(dx), ay = Math.abs(dy);
  touchOrigin = null;
  let mdx = 0, mdz = 0;
  if (ax < 14 && ay < 14) mdz = 1; else if (ax > ay) mdx = dx > 0 ? 1 : -1; else mdz = dy < 0 ? 1 : -1;
  if (player.isDead) return;
  if (!player.move(mdx, mdz)) inputBuf = { dx: mdx, dz: mdz };
}

function update(delta) {
  if (state === S.PAUSED) return; 

  if (state === S.PLAYING) {
    if (inputBuf && !player.isHopping && !player.isDead) {
      if (player.move(inputBuf.dx, inputBuf.dz)) inputBuf = null;
    }
    player.update(delta, audio);
    if (player.isDead) { triggerDeath(player.deathCause || 'water'); return; }

    if (player.gridZ !== lastPlayerGridZ) {
      lastPlayerGridZ = player.gridZ; playerIdleTimer = 0;
      player.warningShadow.material.opacity = 0; player.eagleWarned = false;
    } else {
      playerIdleTimer += delta;
      if (playerIdleTimer > 3.0 && !player.isDead) {
        const t = Math.min((playerIdleTimer - 3.0) / 3.0, 1.0);
        player.warningShadow.material.opacity = t * 0.45;
        player.warningShadow.scale.set(0.5+t*0.5, 0.5+t*0.5, 0.5+t*0.5);
        if (playerIdleTimer > 4.5 && !player.eagleWarned) { player.eagleWarned = true; audio.playEagleScreech(); }
      }
      if (playerIdleTimer > 6.5 && !player.isDead) triggerDeath('eagle');
    }

    updateObstacles(delta);
    if (!player.isHopping && !player.isDead) {
      const { dead, log, cause } = checkCollisions(player);
      if (dead) triggerDeath(cause); else player.ridingLog = log;
    }

    const oldScore = score.current;
    score.update(player.gridZ, getLane(player.gridZ)?.type);
    if (score.current > oldScore) {
       if (score.current % 50 === 0) {
          triggerBiomeSweep();
          if (score.current === 50) { setFogColor(0xFF8C00); setSunStyle(0xFFA500, 1.2); }
          else if (score.current === 100) { setFogColor(0x050515); setSunStyle(0x3366FF, 0.4); }
       }
       if (score.current % 5 === 0) { SaveManager.addCoins(5); ui.updateCoins(SaveManager.data.coins); }
       if (score.best > SaveManager.data.bestScore) { SaveManager.data.bestScore = score.best; SaveManager.save(); }
    }
    updateWorld(player.gridZ, score.current);
    _checkForProximityHazards(delta); 
    checkTrainWarnings();
    if (Math.random() < 0.05) spawnRain(player.worldX, player.worldZ);

  } else if (state === S.DEAD) {
    player.update(delta, null);
    updateObstacles(delta);
    deathTimer += delta;
    if (deathTimer >= DEATH_WAIT && !eagleMesh) {
      ui.showGameOver(score.current, score.best, score.nearMisses);
      audio.stopBGM();
      state = S.MENU;
    }
  }

  updateSkyColor(delta);
  updateCamera(delta);
  updateParticles(delta);

  if (eagleMesh) {
    const scene = getScene();
    if (player.eagleState === 'FALLING') {
      eagleMesh.position.y -= 120 * delta;
      if (eagleMesh.position.y <= player.worldY + 0.5) { player.eagleState = 'FLYING'; audio.playEagleScreech(); }
    } else if (player.eagleState === 'FLYING') {
      eagleMesh.position.y += 60 * delta;
      eagleMesh.position.z -= 40 * delta;
      player.worldY = eagleMesh.position.y - 0.5;
      player.worldZ = eagleMesh.position.z;
      player._syncMesh();
      if (eagleMesh.position.y > 60) { scene.remove(eagleMesh); eagleMesh = null; ui.showGameOver(score.current, score.best, score.nearMisses); }
    }
  }

  for (const lane of lanes) {
    if (lane.type === 'rail' && lane.isWarning && lane.warningMesh) {
      lane.warningTimer = (lane.warningTimer || 0) + delta;
      lane.warningMesh.material.opacity = (Math.sin(lane.warningTimer * 12) * 0.5 + 0.5) * 0.4;
      if (lane.warningTimer > 2.5) { lane.isWarning = false; lane.warningMesh.material.opacity = 0; }
    }
  }
}

function _checkForProximityHazards(delta) {
  for (let z = player.gridZ; z <= player.gridZ + 1; z++) {
    const lane = getLane(z);
    if (!lane || (lane.type !== 'road' && lane.type !== 'rail')) continue;
    for (const obs of lane.obstacles) {
      const dx = Math.abs(obs.worldX - player.worldX);
      const dz = Math.abs((z * 2.0) - player.worldZ);
      if (dx < 2.2 && dz < 1.0) {
        _cameraShake(0.12, 0.05);
        if (!obs._wasNearMiss) { score.addNearMiss(); obs._wasNearMiss = true; }
      }
    }
  }
}

function updateCamera(delta) {
  const camera = getCamera();
  if (!player || !camera) return;
  const px = player.worldX, pz = player.worldZ;
  let targetFov = 55 + Math.min(score.current * 0.1, 15);
  let camOffset = { x: 0, y: 11, z: 9 };
  if (state === S.DEAD) { targetFov = 40; camOffset = { x: px * 0.2, y: 6, z: 5 }; }
  
  camera.fov += (targetFov - camera.fov) * 0.1;
  camera.updateProjectionMatrix();
  const tx = px + camOffset.x, ty = camOffset.y, tz = pz + camOffset.z;
  camera.position.x += (tx - camera.position.x) * 0.1;
  camera.position.y += (ty - camera.position.y) * 0.1;
  camera.position.z += (tz - camera.position.z) * 0.1;
  camera.lookAt(px, 0.5, pz - 2.5);
}

function triggerDeath(cause) {
  const scene = getScene();
  player.die(cause);
  if (cause === 'water') {
    audio.playSplash(); spawnExplosion(player.worldX, 0, player.worldZ, 0xFFFFFF);
  } else if (cause === 'eagle') {
    eagleMesh = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.2, 2.5), new THREE.MeshLambertMaterial({ color: 0x332211 }));
    eagleMesh.position.set(player.worldX, 35, player.worldZ + 3);
    scene.add(eagleMesh);
    player.eagleState = 'FALLING';
  } else {
    audio.playDeath(); spawnExplosion(player.worldX, player.worldY + 0.5, player.worldZ, 0xFF4444);
  }
  player.mesh.visible = false;
  _cameraShake(6, 0.3);
  state = S.DEAD; deathTimer = 0; inputBuf = null;
}

function _cameraShake(mag, dur) {
  const camera = getCamera();
  if (!camera) return;
  let elapsed = 0;
  const tick = () => {
    elapsed += 0.016;
    if (elapsed >= dur) return;
    const decay = 1 - elapsed/dur;
    camera.position.x += (Math.random()-0.5)*mag*0.04*decay;
    camera.position.y += (Math.random()-0.5)*mag*0.02*decay;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function checkTrainWarnings() {
  for (const lane of lanes) {
    const dist = lane.gridZ - player.gridZ;
    if (dist < 0 || dist > 5) continue;
    for (const obs of lane.obstacles) {
      if ((obs.type === 'train' || obs.type === 'ambulance') && !obs.warningDone) {
        const approaching = (obs.direction > 0 && obs.worldX < player.worldX) || (obs.direction < 0 && obs.worldX > player.worldX);
        if (!approaching && dist > 1) continue;
        obs.warningDone = true;
        if (!warnedLanes.has(lane.gridZ)) {
          warnedLanes.add(lane.gridZ);
          if (obs.type === 'train') {
            audio.playTrainHorn(); lane.isWarning = true; lane.warningTimer = 0;
            for (const sig of lane.signals) {
              sig.material.color.set(0xFF1744); sig.material.emissive.set(0xFF1744);
              setTimeout(() => { sig.material.color.set(0x4CAF50); sig.material.emissive.set(0x4CAF50); }, 1600);
            }
          } else audio.playSiren();
        }
      }
    }
  }
}

init();
