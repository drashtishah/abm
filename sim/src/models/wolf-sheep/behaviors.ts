import type { Agent } from '../../framework/types.js';
import type { GrassPatch } from './agent.js';
import { distance, normalize, sub } from '../../utils/vec2.js';

export function fleeFromNearest(
  sheep: Agent,
  wolves: readonly Agent[],
  grass: readonly GrassPatch[],
  config: Record<string, number>,
  random: () => number
): { vx: number; vy: number } {
  const fleeRadius = config['fleeRadius'] ?? 40;
  const speed = sheep.speed;

  // Find nearest alive wolf within flee radius
  let nearestWolf: Agent | null = null;
  let nearestDist = Infinity;
  for (const w of wolves) {
    if (!w.alive) continue;
    const d = distance(sheep, w);
    if (d < fleeRadius && d < nearestDist) {
      nearestDist = d;
      nearestWolf = w;
    }
  }

  if (nearestWolf) {
    // Flee: move away from wolf
    const dir = sub(sheep, nearestWolf);
    const n = normalize(dir);
    return { vx: n.x * speed, vy: n.y * speed };
  }

  // No wolf nearby: move toward nearest alive grass
  let nearestGrass: GrassPatch | null = null;
  let nearestGrassDist = Infinity;
  const gridSize = config['grassGridSize'] ?? 20;
  const width = config['width'] ?? 800;
  const height = config['height'] ?? 600;
  const cellW = width / gridSize;
  const cellH = height / gridSize;

  for (const g of grass) {
    if (!g.alive) continue;
    const gx = (g.x + 0.5) * cellW;
    const gy = (g.y + 0.5) * cellH;
    const d = distance(sheep, { x: gx, y: gy });
    if (d < nearestGrassDist) {
      nearestGrassDist = d;
      nearestGrass = g;
    }
  }

  if (nearestGrass) {
    const gx = (nearestGrass.x + 0.5) * cellW;
    const gy = (nearestGrass.y + 0.5) * cellH;
    const dir = sub({ x: gx, y: gy }, sheep);
    const n = normalize(dir);
    return { vx: n.x * speed, vy: n.y * speed };
  }

  // Random walk
  const angle = random() * Math.PI * 2;
  return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
}

export function chaseNearest(
  wolf: Agent,
  sheepList: readonly Agent[],
  _config: Record<string, number>,
  random: () => number
): { vx: number; vy: number } {
  const speed = wolf.speed;

  let nearest: Agent | null = null;
  let nearestDist = Infinity;
  for (const s of sheepList) {
    if (!s.alive) continue;
    const d = distance(wolf, s);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = s;
    }
  }

  if (nearest) {
    const dir = sub(nearest, wolf);
    const n = normalize(dir);
    return { vx: n.x * speed, vy: n.y * speed };
  }

  // Random walk if no sheep
  const angle = random() * Math.PI * 2;
  return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
}

export function bounceOffWalls(
  agent: Agent,
  width: number,
  height: number
): void {
  const r = agent.radius;
  if (agent.x < r) { agent.x = r; agent.vx = Math.abs(agent.vx); }
  if (agent.x > width - r) { agent.x = width - r; agent.vx = -Math.abs(agent.vx); }
  if (agent.y < r) { agent.y = r; agent.vy = Math.abs(agent.vy); }
  if (agent.y > height - r) { agent.y = height - r; agent.vy = -Math.abs(agent.vy); }
}

export function checkCatch(
  wolf: Agent,
  sheep: Agent,
  catchRadius: number
): boolean {
  return distance(wolf, sheep) < catchRadius;
}

export function tryReproduce(
  agent: Agent,
  config: Record<string, number>,
  random: () => number
): Agent | null {
  const thresholdKey = agent.type === 'wolf' ? 'wolfReproduceThreshold' : 'sheepReproduceThreshold';
  const rateKey = agent.type === 'wolf' ? 'wolfReproduceRate' : 'sheepReproduceRate';
  const threshold = config[thresholdKey] ?? 50;
  const rate = config[rateKey] ?? 0.05;

  if (agent.energy < threshold) return null;
  if (random() > rate) return null;

  // Reproduce: halve parent energy, create offspring
  const childEnergy = agent.energy / 2;
  agent.energy = childEnergy;

  return {
    id: -1, // Will be assigned by world
    type: agent.type,
    x: agent.x + (random() - 0.5) * 10,
    y: agent.y + (random() - 0.5) * 10,
    vx: 0,
    vy: 0,
    radius: agent.radius,
    speed: agent.speed,
    energy: childEnergy,
    color: agent.color,
    alive: true,
    meta: {},
  };
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
