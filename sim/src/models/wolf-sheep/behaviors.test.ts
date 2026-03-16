import { describe, it, expect, beforeEach } from 'vitest';
import type { Agent } from '../../framework/types.js';
import type { GrassPatch } from './agent.js';
import { resetIdCounter, createGrassGrid } from './agent.js';
import {
  fleeFromNearest,
  chaseNearest,
  bounceOffWalls,
  checkCatch,
  tryReproduce,
  findGrassPatchAt,
} from './behaviors.js';
import { wolfSheepDef } from './definition.js';
import { distance } from '../../utils/vec2.js';

const config = { ...wolfSheepDef.defaultConfig };

/** Deterministic random that always returns the same value */
const fixedRandom = (value: number) => () => value;

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 0,
    type: 'wolf',
    x: 400,
    y: 300,
    vx: 0,
    vy: 0,
    radius: 4,
    speed: 2,
    energy: 40,
    color: '#000',
    alive: true,
    meta: {},
    ...overrides,
  };
}

function makeGrassPatch(overrides: Partial<GrassPatch> = {}): GrassPatch {
  return { x: 0, y: 0, alive: true, regrowthTimer: 0, ...overrides };
}

describe('behaviors', () => {
  beforeEach(() => {
    resetIdCounter();
  });

  it('sheep flees from nearby wolf', () => {
    const sheep = makeAgent({ type: 'sheep', x: 200, y: 200, speed: 1.5 });
    const wolf = makeAgent({ type: 'wolf', x: 210, y: 200 });
    const distBefore = distance(sheep, wolf);

    const vel = fleeFromNearest(sheep, [wolf], [], config, fixedRandom(0.5));
    sheep.vx = vel.vx;
    sheep.vy = vel.vy;
    sheep.x += sheep.vx;
    sheep.y += sheep.vy;

    const distAfter = distance(sheep, wolf);
    expect(distAfter).toBeGreaterThan(distBefore);
  });

  it('sheep moves toward grass when no wolf nearby', () => {
    const sheep = makeAgent({ type: 'sheep', x: 100, y: 100, speed: 1.5 });
    // Place grass patch far away so sheep moves toward it
    const grassPatch = makeGrassPatch({ x: 10, y: 10, alive: true });
    // No wolves nearby (wolf far outside flee radius)
    const wolf = makeAgent({ type: 'wolf', x: 700, y: 500 });

    const vel = fleeFromNearest(sheep, [wolf], [grassPatch], config, fixedRandom(0.5));

    // Grass cell center in world coords
    const cellW = config['width']! / config['grassGridSize']!;
    const cellH = config['height']! / config['grassGridSize']!;
    const gx = (grassPatch.x + 0.5) * cellW;
    const gy = (grassPatch.y + 0.5) * cellH;

    // Velocity should point toward grass patch
    const dx = gx - sheep.x;
    const dy = gy - sheep.y;
    // Dot product of velocity and direction to grass should be positive
    const dot = vel.vx * dx + vel.vy * dy;
    expect(dot).toBeGreaterThan(0);
  });

  it('sheep random walks when no wolf and no grass', () => {
    const sheep = makeAgent({ type: 'sheep', x: 400, y: 300, speed: 1.5 });
    // All grass dead
    const deadGrass = [makeGrassPatch({ alive: false })];
    // No wolves nearby
    const vel = fleeFromNearest(sheep, [], deadGrass, config, fixedRandom(0.5));
    const speed = Math.sqrt(vel.vx * vel.vx + vel.vy * vel.vy);
    expect(speed).toBeGreaterThan(0);
  });

  it('wolf chases nearest sheep', () => {
    const wolf = makeAgent({ type: 'wolf', x: 200, y: 200, speed: 2.0 });
    const sheep = makeAgent({ type: 'sheep', x: 250, y: 200 });
    const distBefore = distance(wolf, sheep);

    const vel = chaseNearest(wolf, [sheep], config, fixedRandom(0.5));
    wolf.vx = vel.vx;
    wolf.vy = vel.vy;
    wolf.x += wolf.vx;
    wolf.y += wolf.vy;

    const distAfter = distance(wolf, sheep);
    expect(distAfter).toBeLessThan(distBefore);
  });

  it('wolf with no sheep wanders', () => {
    const wolf = makeAgent({ type: 'wolf', x: 400, y: 300, speed: 2.0 });
    const vel = chaseNearest(wolf, [], config, fixedRandom(0.5));
    expect(typeof vel.vx).toBe('number');
    expect(typeof vel.vy).toBe('number');
    expect(Number.isFinite(vel.vx)).toBe(true);
    expect(Number.isFinite(vel.vy)).toBe(true);
  });

  it('bounceOffWalls reverses velocity at edges', () => {
    const width = config['width']!;
    const height = config['height']!;
    const agent = makeAgent({ type: 'wolf', x: width + 10, y: 300, vx: 5, vy: 0, radius: 4 });

    bounceOffWalls(agent, width, height);

    expect(agent.vx).toBeLessThan(0);
    expect(agent.x).toBeLessThanOrEqual(width - agent.radius);
  });

  it('bounceOffWalls no-op for centered agent', () => {
    const agent = makeAgent({ type: 'sheep', x: 400, y: 300, vx: 1, vy: -1, radius: 3 });
    const origX = agent.x;
    const origY = agent.y;
    const origVx = agent.vx;
    const origVy = agent.vy;

    bounceOffWalls(agent, config['width']!, config['height']!);

    expect(agent.x).toBe(origX);
    expect(agent.y).toBe(origY);
    expect(agent.vx).toBe(origVx);
    expect(agent.vy).toBe(origVy);
  });

  it('checkCatch true when overlapping', () => {
    const wolf = makeAgent({ type: 'wolf', x: 100, y: 100 });
    const sheep = makeAgent({ type: 'sheep', x: 100, y: 100 });
    expect(checkCatch(wolf, sheep, config['catchRadius']!)).toBe(true);
  });

  it('tryReproduce halves parent energy on success', () => {
    const agent = makeAgent({ type: 'wolf', energy: 100 });
    const reproConfig = {
      ...config,
      wolfReproduceThreshold: 50,
      wolfReproduceRate: 1.0, // guarantee reproduction
    };

    // Random returns 0 which is <= rate of 1.0, so reproduction succeeds
    const offspring = tryReproduce(agent, reproConfig, fixedRandom(0));

    expect(offspring).not.toBeNull();
    expect(agent.energy).toBe(50);
    expect(offspring!.energy).toBe(50);
  });

  it('findGrassPatchAt returns correct patch via O(1) index', () => {
    const grass = createGrassGrid(config);
    const gridSize = config['grassGridSize']!;
    const width = config['width']!;
    const height = config['height']!;
    const cellW = width / gridSize;
    const cellH = height / gridSize;

    // Look up the patch at grid position (3, 5) by world coordinate
    const worldX = (3 + 0.5) * cellW;
    const worldY = (5 + 0.5) * cellH;
    const patch = findGrassPatchAt(worldX, worldY, grass, config);

    expect(patch).not.toBeNull();
    expect(patch!.x).toBe(3);
    expect(patch!.y).toBe(5);
  });

  it('findGrassPatchAt returns null for out-of-bounds coordinates', () => {
    const grass = createGrassGrid(config);
    const patch = findGrassPatchAt(-10, -10, grass, config);
    expect(patch).toBeNull();
  });
});
