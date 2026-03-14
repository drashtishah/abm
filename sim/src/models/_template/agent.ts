import type { Agent } from '../../framework/types.js';

let nextId = 0;

export function resetIdCounter(): void {
  nextId = 0;
}

export function createAgent(config: Record<string, number>): Agent {
  const w = config['width'] ?? 800;
  const h = config['height'] ?? 600;
  const radius = 4;
  return {
    id: nextId++,
    type: 'agent',
    x: radius + Math.random() * (w - 2 * radius),
    y: radius + Math.random() * (h - 2 * radius),
    vx: 0,
    vy: 0,
    radius,
    speed: 1.0,
    energy: 100,
    color: '#66ff55',
    alive: true,
    meta: {},
  };
}
