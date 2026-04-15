// js/score.js — Score tracking + localStorage persistence
const HS_KEY = 'crossy_highscore_v2';

export class ScoreManager {
  constructor() {
    this.current = 0;
    this.highestZ = 0;
    this.nearMisses = 0;
    this.best    = parseInt(localStorage.getItem(HS_KEY) || '0', 10);
    /** @type {(current: number, best: number) => void} */
    this.onUpdate = null;
  }

  /** Call every frame with the player's current gridZ */
  update(gridZ, laneType) {
    // Only process if we've reached a NEW furthermost lane
    if (gridZ > this.highestZ) {
      this.highestZ = gridZ;

      // Only increment the score if this new lane is NOT grass
      if (laneType !== 'grass' && laneType !== undefined) {
        this.current++;
        
        // Update high score based on the new "hazard-only" count
        if (this.current > this.best) {
          this.best = this.current;
          localStorage.setItem(HS_KEY, String(this.best));
        }
      }
      
      if (this.onUpdate) this.onUpdate(this.current, this.best);
    }
  }

  reset() {
    this.current = 0;
    this.highestZ = 0;
    this.nearMisses = 0;
    if (this.onUpdate) this.onUpdate(0, this.best);
  }

  addNearMiss() {
    this.nearMisses++;
    if (this.onUpdate) this.onUpdate(this.current, this.best);
  }
}
