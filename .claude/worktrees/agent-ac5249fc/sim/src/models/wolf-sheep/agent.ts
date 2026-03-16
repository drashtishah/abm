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
  const radius = 4;
  return {
    id: nextId++,
    type: 'wolf',
    x: radius + random() * (w - 2 * radius),
    y: radius + random() * (h - 2 * radius),
    vx: 0,
    vy: 0,
    radius,
    speed: config['wolfSpeed'] ?? 2.0,
    energy: (config['wolfGainFromFood'] ?? 20) * 2,
    color: '#ff2daa',
    alive: true,
    meta: {},
  };
}

export function createSheep(config: Record<string, number>, random: () => number): Agent {
  const w = config['width'] ?? 800;
  const h = config['height'] ?? 600;
  const radius = 3;
  return {
    id: nextId++,
    type: 'sheep',
    x: radius + random() * (w - 2 * radius),
    y: radius + random() * (h - 2 * radius),
    vx: 0,
    vy: 0,
    radius,
    speed: config['sheepSpeed'] ?? 1.5,
    energy: (config['sheepGainFromFood'] ?? 4) * 2,
    color: '#affff7',
    alive: true,
    meta: {},
  };
}

export function createGrassGrid(config: Record<string, number>): GrassPatch[] {
  const gridSize = config['grassGridSize'] ?? 20;
  const patches: GrassPatch[] = [];
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      patches.push({ x, y, alive: true, regrowthTimer: 0 });
    }
  }
  return patches;
}
