// js/collision.js — AABB collision between player and lane obstacles
import { getLane } from './world.js';

/**
 * Check what is happening at the player's current grid position.
 * Returns { dead, log, cause } where:
 *   dead  — player should die immediately
 *   log   — log Object the player is riding (river lanes only)
 *   cause — 'car' | 'train' | 'water' | null
 */
export function checkCollisions(player) {
  const lane = getLane(player.gridZ);
  if (!lane) return { dead: false, log: null, cause: null };

  const px   = player.worldX;
  const pHW  = 0.27; // player half-width (collision box)

  // ── Road / Rail ── any vehicle overlapping player column = death
  if (lane.type === 'road' || lane.type === 'rail') {
    for (const obs of lane.obstacles) {
      if (px + pHW > obs.worldX - obs.halfWidth &&
          px - pHW < obs.worldX + obs.halfWidth) {
        return { dead: true, log: null, cause: obs.type };
      }
    }
    return { dead: false, log: null, cause: null };
  }

  // ── River ── player must be on a log, otherwise drown
  if (lane.type === 'river') {
    for (const obs of lane.obstacles) {
      if (px + pHW > obs.worldX - obs.halfWidth &&
          px - pHW < obs.worldX + obs.halfWidth) {
        return { dead: false, log: obs, cause: null };
      }
    }
    return { dead: true, log: null, cause: 'water' };
  }

  // ── Grass ── always safe
  return { dead: false, log: null, cause: null };
}
