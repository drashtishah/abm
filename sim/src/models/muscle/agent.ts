/** Muscle fiber factory and hormone grid setup — one fiber per grid cell, stationary. */
import type { Agent } from '../../framework/types.js';

/** Hormone state for a single grid cell (patch in NetLogo) */
export interface HormonePatch {
  anabolic: number;
  catabolic: number;
}

/** Constants matching NetLogo initialize-hormones */
export const ANABOLIC_MAX = 200;
export const ANABOLIC_MIN = 50;
export const CATABOLIC_MAX = 250;
export const CATABOLIC_MIN = 52;
export const HORMONE_DIFFUSE_RATE = 0.75;

let nextId = 0;

export function resetIdCounter(): void {
  nextId = 0;
}

/**
 * Create one muscle fiber agent at grid position (gx, gy).
 * NetLogo: sprout-muscle-fibers 1 [ set max-size 4; repeat 20 [...]; set fiber-size ... ]
 */
export function createFiber(
  gx: number,
  gy: number,
  width: number,
  height: number,
  gridSize: number,
  slowTwitchPercent: number,
  random: () => number
): Agent {
  const cellW = width / gridSize;
  const cellH = height / gridSize;

  // NetLogo: max-size starts at 4, incremented up to 20 times based on fast-twitch %
  let maxSize = 4;
  for (let i = 0; i < 20; i++) {
    if (random() * 100 > slowTwitchPercent) {
      maxSize += 1;
    }
  }

  // NetLogo: fiber-size (0.2 + random-float 0.4) * max-size
  const fiberSize = (0.2 + random() * 0.4) * maxSize;

  return {
    id: nextId++,
    type: 'fiber',
    // Center of grid cell
    x: (gx + 0.5) * cellW,
    y: (gy + 0.5) * cellH,
    vx: 0,
    vy: 0,
    radius: 4,
    speed: 0,
    energy: 0,
    color: '#ff0000',
    alive: true,
    meta: {
      fiberSize,
      maxSize,
      gx,
      gy,
    },
  };
}

/**
 * Create hormone grid — one patch per grid cell.
 * NetLogo: set anabolic-hormone 50, set catabolic-hormone 52
 */
export function createHormoneGrid(gridSize: number): HormonePatch[] {
  const patches: HormonePatch[] = [];
  for (let i = 0; i < gridSize * gridSize; i++) {
    patches.push({
      anabolic: ANABOLIC_MIN,
      catabolic: CATABOLIC_MIN,
    });
  }
  return patches;
}
