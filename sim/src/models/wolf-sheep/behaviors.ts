import type { Agent } from '../../framework/types.js';
import type { GrassPatch } from './agent.js';

/**
 * NetLogo `move` procedure: rt random 50, lt random 50, fd 1.
 * Heading stored in agent.meta.heading (degrees, 0 = north/up).
 * Step size scaled to one grid cell so encounter rates match NetLogo.
 */
export function move(
  agent: Agent,
  width: number,
  height: number,
  stepSize: number,
  random: () => number
): void {
  const heading = (agent.meta['heading'] as number) ?? 0;
  // rt random 50, lt random 50
  const turn = Math.floor(random() * 50) - Math.floor(random() * 50);
  const newHeading = ((heading + turn) % 360 + 360) % 360;
  agent.meta['heading'] = newHeading;

  // fd 1 — NetLogo heading: 0=north, 90=east. Convert to math angle.
  const rad = (90 - newHeading) * Math.PI / 180;
  agent.x += Math.cos(rad) * stepSize;
  agent.y -= Math.sin(rad) * stepSize; // canvas y is inverted

  // Wrap around edges (NetLogo default topology)
  agent.x = ((agent.x % width) + width) % width;
  agent.y = ((agent.y % height) + height) % height;
}

/** Sheep eats grass at its current patch. Returns energy gained. */
export function eatGrass(
  sheep: Agent,
  grass: readonly GrassPatch[],
  config: Record<string, number>
): number {
  const patch = findGrassPatchAt(sheep.x, sheep.y, grass, config);
  if (patch && patch.alive) {
    patch.alive = false;
    patch.regrowthTimer = config['grassRegrowthTime'] ?? 30;
    const gain = config['sheepGainFromFood'] ?? 4;
    sheep.energy += gain;
    return gain;
  }
  return 0;
}

/**
 * Wolf eats one random sheep on the same patch (NetLogo `one-of sheep-here`).
 * Returns the eaten sheep or null.
 */
export function eatSheep(
  wolf: Agent,
  sheepList: readonly Agent[],
  config: Record<string, number>,
  random: () => number
): Agent | null {
  const gridSize = config['grassGridSize'] ?? 20;
  const width = config['width'] ?? 800;
  const height = config['height'] ?? 600;
  const cellW = width / gridSize;
  const cellH = height / gridSize;

  const wx = Math.floor(wolf.x / cellW);
  const wy = Math.floor(wolf.y / cellH);

  // Find all alive sheep on the same patch
  const candidates: Agent[] = [];
  for (const s of sheepList) {
    if (!s.alive) continue;
    const sx = Math.floor(s.x / cellW);
    const sy = Math.floor(s.y / cellH);
    if (sx === wx && sy === wy) {
      candidates.push(s);
    }
  }

  if (candidates.length === 0) return null;

  // Pick one at random (NetLogo `one-of`)
  const prey = candidates[Math.floor(random() * candidates.length)]!;
  prey.alive = false;
  wolf.energy += config['wolfGainFromFood'] ?? 20;
  return prey;
}

/**
 * Reproduction: random-float 100 < reproduce-rate.
 * Halves parent energy, creates offspring at same position with random heading.
 */
export function tryReproduce(
  agent: Agent,
  reproduceRate: number,
  stepSize: number,
  width: number,
  height: number,
  random: () => number
): Agent | null {
  if (random() * 100 >= reproduceRate) return null;

  const childEnergy = agent.energy / 2;
  agent.energy = childEnergy;

  // NetLogo: hatch 1 [ rt random-float 360 fd 1 ]
  const childHeading = random() * 360;
  const rad = (90 - childHeading) * Math.PI / 180;
  let cx = agent.x + Math.cos(rad) * stepSize;
  let cy = agent.y - Math.sin(rad) * stepSize;
  cx = ((cx % width) + width) % width;
  cy = ((cy % height) + height) % height;

  return {
    id: -1, // assigned by world
    type: agent.type,
    x: cx,
    y: cy,
    vx: 0,
    vy: 0,
    radius: agent.radius,
    speed: agent.speed,
    energy: childEnergy,
    color: agent.color,
    alive: true,
    meta: { heading: childHeading },
  };
}

/** NetLogo `death`: agent dies when energy < 0 */
export function death(agent: Agent): boolean {
  if (agent.energy < 0) {
    agent.alive = false;
    return true;
  }
  return false;
}

/** NetLogo `grow-grass`: countdown on brown patches, regrow at 0 */
export function growGrass(patch: GrassPatch): void {
  if (!patch.alive) {
    if (patch.regrowthTimer <= 0) {
      patch.alive = true;
      patch.regrowthTimer = 0;
    } else {
      patch.regrowthTimer--;
    }
  }
}

/** O(1) grass patch lookup using grid index arithmetic */
export function findGrassPatchAt(
  x: number,
  y: number,
  grass: readonly GrassPatch[],
  config: Record<string, number>
): GrassPatch | null {
  const gridSize = config['grassGridSize'] ?? 20;
  const width = config['width'] ?? 800;
  const height = config['height'] ?? 600;
  const cellW = width / gridSize;
  const cellH = height / gridSize;
  const gx = Math.floor(x / cellW);
  const gy = Math.floor(y / cellH);
  if (gx < 0 || gx >= gridSize || gy < 0 || gy >= gridSize) return null;
  const idx = gy * gridSize + gx;
  return grass[idx] ?? null;
}
