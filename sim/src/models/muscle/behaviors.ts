/**
 * Pure behavior functions for the Muscle Development model.
 * Faithfully translates NetLogo procedures — see inline comments for mapping.
 */
import type { Agent } from '../../framework/types.js';
import type { HormonePatch } from './agent.js';
import {
  ANABOLIC_MAX, ANABOLIC_MIN,
  CATABOLIC_MAX, CATABOLIC_MIN,
  HORMONE_DIFFUSE_RATE,
} from './agent.js';

/**
 * NetLogo perform-daily-activity: hormonal effect of lifestyle.
 * Each fiber adds to its patch's hormones proportional to log10(fiberSize).
 */
export function performDailyActivity(
  agents: readonly Agent[],
  hormones: HormonePatch[],
  gridSize: number
): void {
  for (const agent of agents) {
    if (!agent.alive) continue;
    const fiberSize = agent.meta['fiberSize'] as number;
    const idx = patchIndex(agent, gridSize);
    const logFs = Math.log10(Math.max(fiberSize, 1));
    hormones[idx]!.catabolic += 2.0 * logFs;
    hormones[idx]!.anabolic += 2.5 * logFs;
  }
}

/**
 * NetLogo lift-weights: hormonal effect of weight training.
 * Each fiber has intensity²/10000 chance of being recruited.
 */
export function liftWeights(
  agents: readonly Agent[],
  hormones: HormonePatch[],
  gridSize: number,
  intensity: number,
  random: () => number
): void {
  const threshold = (intensity / 100) * (intensity / 100);
  for (const agent of agents) {
    if (!agent.alive) continue;
    if (random() < threshold) {
      const fiberSize = agent.meta['fiberSize'] as number;
      const idx = patchIndex(agent, gridSize);
      const logFs = Math.log10(Math.max(fiberSize, 1));
      hormones[idx]!.anabolic += logFs * 55;
      hormones[idx]!.catabolic += logFs * 44;
    }
  }
}

/**
 * NetLogo sleep: hormonal recovery during sleep.
 * Reduces hormones proportional to log10(hormone) × hours.
 */
export function sleepRecover(
  hormones: HormonePatch[],
  hoursOfSleep: number
): void {
  for (const patch of hormones) {
    // Guard: log10 requires positive values
    const logC = Math.log10(Math.max(patch.catabolic, 1));
    const logA = Math.log10(Math.max(patch.anabolic, 1));
    patch.catabolic -= 0.5 * logC * hoursOfSleep;
    patch.anabolic -= 0.48 * logA * hoursOfSleep;
  }
}

/**
 * NetLogo grow: catabolic breaks down, anabolic builds up.
 * Net growth only when anabolic sufficiently exceeds catabolic.
 */
export function grow(agent: Agent, hormones: readonly HormonePatch[], gridSize: number): void {
  const idx = patchIndex(agent, gridSize);
  const patch = hormones[idx]!;
  let fiberSize = agent.meta['fiberSize'] as number;

  const logC = Math.log10(Math.max(patch.catabolic, 1));
  const logA = Math.log10(Math.max(patch.anabolic, 1));

  // NetLogo: set fiber-size (fiber-size - 0.20 * (log catabolic-hormone 10))
  fiberSize -= 0.20 * logC;
  // NetLogo: set fiber-size (fiber-size + 0.20 * min(list (log anabolic 10) (1.05 * log catabolic 10)))
  fiberSize += 0.20 * Math.min(logA, 1.05 * logC);

  agent.meta['fiberSize'] = fiberSize;
}

/**
 * NetLogo regulate-muscle-fibers: clamp fiber size, update visual properties.
 * scale-color red fiberSize (-0.5 * maxSize) (3 * maxSize)
 * size = max(0.2, min(1, fiberSize / 20))
 */
export function regulateFiber(agent: Agent): void {
  let fiberSize = agent.meta['fiberSize'] as number;
  const maxSize = agent.meta['maxSize'] as number;

  // Clamp to [1, maxSize]
  if (fiberSize < 1) fiberSize = 1;
  if (fiberSize > maxSize) fiberSize = maxSize;
  agent.meta['fiberSize'] = fiberSize;

  // Fiber growth ratio: 0 = minimum (size 1), 1 = at genetic max
  const growthRatio = Math.max(0, Math.min(1, (fiberSize - 1) / Math.max(maxSize - 1, 1)));

  // Larger fibers → darker (lower intensity) to show density/development
  // Range 0.3–1.0 so even max-size fibers remain visible
  agent.meta['colorIntensity'] = 1.0 - growthRatio * 0.7;

  // Visual size: small fibers are tiny dots, large fibers fill more of the cell
  // NetLogo: max(0.2, min(1, fiberSize / 20)) — we scale to pixel radius
  agent.radius = 1 + growthRatio * 7; // 1–8px range
}

/**
 * NetLogo diffuse: spread fraction of each patch's value to 8 neighbors.
 * Each neighbor gets (value × rate / 8), patch keeps (value × (1 - rate)).
 */
export function diffuse(
  grid: number[],
  gridSize: number,
  rate: number
): number[] {
  const n = gridSize * gridSize;
  const result: number[] = new Array(n).fill(0) as number[];
  const share = rate / 8;

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const idx = y * gridSize + x;
      const val = grid[idx]!;
      const keep = val * (1 - rate);
      const give = val * share;

      result[idx] = (result[idx] ?? 0) + keep;

      // 8 neighbors with wrapping (torus topology)
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = ((x + dx) % gridSize + gridSize) % gridSize;
          const ny = ((y + dy) % gridSize + gridSize) % gridSize;
          const nIdx = ny * gridSize + nx;
          result[nIdx] = (result[nIdx] ?? 0) + give;
        }
      }
    }
  }
  return result;
}

/**
 * NetLogo regulate-hormones: diffuse + clamp.
 * Returns paired [anabolicRatio, catabolicRatio] per patch for themed rendering.
 * NetLogo: approximate-rgb (catabolic/max*255) (anabolic/max*255) 0
 */
export function regulateHormones(
  hormones: HormonePatch[],
  gridSize: number
): Array<[number, number]> {
  // Extract flat arrays for diffusion
  const anabolicArr = hormones.map(p => p.anabolic);
  const catabolicArr = hormones.map(p => p.catabolic);

  // Diffuse
  const newAnabolic = diffuse(anabolicArr, gridSize, HORMONE_DIFFUSE_RATE);
  const newCatabolic = diffuse(catabolicArr, gridSize, HORMONE_DIFFUSE_RATE);

  const ratios: Array<[number, number]> = [];

  // Clamp and compute independent normalized levels
  for (let i = 0; i < hormones.length; i++) {
    let a = newAnabolic[i]!;
    let c = newCatabolic[i]!;

    // Clamp to bounds
    a = Math.min(a, ANABOLIC_MAX);
    a = Math.max(a, ANABOLIC_MIN);
    c = Math.min(c, CATABOLIC_MAX);
    c = Math.max(c, CATABOLIC_MIN);

    hormones[i]!.anabolic = a;
    hormones[i]!.catabolic = c;

    // Two independent channels, matching NetLogo's approximate-rgb
    ratios.push([a / ANABOLIC_MAX, c / CATABOLIC_MAX]);
  }

  return ratios;
}

/** Compute muscle mass = sum of fiber sizes / 100 (matches NetLogo chart scale) */
export function computeMuscleMass(agents: readonly Agent[]): number {
  let sum = 0;
  for (const a of agents) {
    if (a.alive) sum += a.meta['fiberSize'] as number;
  }
  return Math.round(sum / 10) / 10;
}

/** Compute average hormone value across all patches */
export function averageHormone(hormones: readonly HormonePatch[], key: 'anabolic' | 'catabolic'): number {
  if (hormones.length === 0) return 0;
  let sum = 0;
  for (const p of hormones) sum += p[key];
  return Math.round((sum / hormones.length) * 10) / 10;
}

/** Grid index for an agent based on its grid coordinates stored in meta */
function patchIndex(agent: Agent, gridSize: number): number {
  const gx = agent.meta['gx'] as number;
  const gy = agent.meta['gy'] as number;
  return gy * gridSize + gx;
}
