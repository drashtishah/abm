import type { Agent } from '../../framework/types.js';

export interface GrassPatch {
  x: number;
  y: number;
  alive: boolean;
  regrowthTimer: number;
}

let nextId = 0;

export function resetIdCounter(): void {
  nextId = 0;
}

export function createWolf(config: Record<string, number>, random: () => number): Agent {
  const w = config['width'] ?? 800;
  const h = config['height'] ?? 600;
  const radius = 6;
  const wolfGainFromFood = config['wolfGainFromFood'] ?? 20;
  return {
    id: nextId++,
    type: 'wolf',
    x: random() * w,
    y: random() * h,
    vx: 0,
    vy: 0,
    radius,
    speed: 1,
    // NetLogo: set energy random (2 * wolf-gain-from-food)
    energy: Math.floor(random() * 2 * wolfGainFromFood),
    color: '#ff2daa',
    alive: true,
    meta: { heading: random() * 360 },
  };
}

export function createSheep(config: Record<string, number>, random: () => number): Agent {
  const w = config['width'] ?? 800;
  const h = config['height'] ?? 600;
  const radius = 5;
  const sheepGainFromFood = config['sheepGainFromFood'] ?? 4;
  return {
    id: nextId++,
    type: 'sheep',
    x: random() * w,
    y: random() * h,
    vx: 0,
    vy: 0,
    radius,
    speed: 1,
    // NetLogo: set energy random (2 * sheep-gain-from-food)
    energy: Math.floor(random() * 2 * sheepGainFromFood),
    color: '#affff7',
    alive: true,
    meta: { heading: random() * 360 },
  };
}

/**
 * Create grass grid. In sheep-wolves-grass mode, patches start randomly
 * green or brown (NetLogo: set pcolor one-of [green brown]).
 * Green patches: regrowthTimer = grassRegrowthTime
 * Brown patches: regrowthTimer = random(grassRegrowthTime)
 */
export function createGrassGrid(
  config: Record<string, number>,
  random: () => number
): GrassPatch[] {
  const gridSize = config['grassGridSize'] ?? 20;
  const grassRegrowthTime = config['grassRegrowthTime'] ?? 30;
  const patches: GrassPatch[] = [];

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      // NetLogo: set pcolor one-of [ green brown ]
      const alive = random() < 0.5;
      patches.push({
        x,
        y,
        alive,
        regrowthTimer: alive
          ? grassRegrowthTime
          : Math.floor(random() * grassRegrowthTime),
      });
    }
  }
  return patches;
}
