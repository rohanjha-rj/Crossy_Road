# 🐔 Crossy Road – Arcade Edition

A high-fidelity voxel arcade game built with **Three.js** and vanilla JavaScript. Navigate your hero through dangerous roads, rivers, and train tracks to set new records!

## 🕹️ Game Features

- **Procedural Generation:** Endless lanes generated with increasing difficulty.
- **Dynamic Biomes:** The world evolves as you progress (Day ➔ Sunset ➔ Midnight).
- **Hero Collection:** Unlock 6 unique characters (Chicken, Penguin, Robot, etc) via the Gacha system.
- **Atmospheric Effects:** Dynamic lighting, rain particles, and environmental flora.
- **Arcade Juice:** Proximity rumbles, cinematic deathcams and physical feedback.
- **Predator Eagle:** Don't stay idle for too long, or the eagle will take you!

## ⌨️ Controls

- **Movement:** `↑ ↓ ← →` or `W A S D`
- **Dash Forward:** Tap `Space` or `Enter`
- **Mobile/Touch:** Drag or Tap to navigate.

## 🛠️ Technology Stack

- **Graphics:** Three.js (WebGL rendering, PCFSoftShadowMap)
- **Engine:** Custom vanilla JS logic for procedurals and collisions.
- **Post-Processing:** UnrealBloomPass for atmosphere.
- **Audio:** Web Audio API for spatial sound effects.

## 📂 Project Structure

```text
├── assets/          # Sprites, models, and audio (if any)
├── css/
│   └── style.css    # Game UI and HUD styles
├── js/
│   ├── audio.js     # Web Audio API implementations
│   ├── collision.js # Hitbox logic
│   ├── main.js      # Game loop and initialization
│   ├── particles.js # Visual effect generators
│   ├── player.js    # Character controls and logic
│   ├── save.js      # LocalStorage save management
│   ├── scene.js     # Three.js scene setup
│   ├── score.js     # Milestone and scoring handlers
│   ├── ui.js        # DOM manipulations
│   └── world.js     # Procedural generation
├── index.html       # Entry point
└── README.md        # Project documentation
```

## 🚀 Getting Started

1. Clone the repository.
2. Open `index.html` in any modern web browser.
3. No build step required—pure vanilla power.

---
Built with ❤️ for a premium arcade experience.