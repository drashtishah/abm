import { describe, it, expect, beforeEach } from 'vitest';
import { createWolf, createSheep, createGrassGrid, resetIdCounter } from './agent.js';
import { wolfSheepDef } from './definition.js';

const config = { ...wolfSheepDef.defaultConfig };

describe('agent', () => {
  beforeEach(() => {
    resetIdCounter();
  });

  it('createWolf returns valid wolf', () => {
    const wolf = createWolf(config);
    expect(wolf.type).toBe('wolf');
    expect(wolf.alive).toBe(true);
    expect(wolf.speed).toBeGreaterThan(0);
    expect(wolf.energy).toBeGreaterThan(0);
  });

  it('createSheep returns valid sheep', () => {
    const sheep = createSheep(config);
    expect(sheep.type).toBe('sheep');
    expect(sheep.alive).toBe(true);
    expect(sheep.energy).toBeGreaterThan(0);
  });

  it('agents spawn within bounds', () => {
    const w = config['width']!;
    const h = config['height']!;
    for (let i = 0; i < 50; i++) {
      const wolf = createWolf(config);
      expect(wolf.x).toBeGreaterThanOrEqual(wolf.radius);
      expect(wolf.x).toBeLessThanOrEqual(w - wolf.radius);
      expect(wolf.y).toBeGreaterThanOrEqual(wolf.radius);
      expect(wolf.y).toBeLessThanOrEqual(h - wolf.radius);

      const sheep = createSheep(config);
      expect(sheep.x).toBeGreaterThanOrEqual(sheep.radius);
      expect(sheep.x).toBeLessThanOrEqual(w - sheep.radius);
      expect(sheep.y).toBeGreaterThanOrEqual(sheep.radius);
      expect(sheep.y).toBeLessThanOrEqual(h - sheep.radius);
    }
  });

  it('factory generates unique ids', () => {
    const ids = new Set<number>();
    for (let i = 0; i < 100; i++) {
      const agent = i % 2 === 0 ? createWolf(config) : createSheep(config);
      ids.add(agent.id);
    }
    expect(ids.size).toBe(100);
  });

  it('createGrassGrid creates correct grid', () => {
    const gridSize = config['grassGridSize']!;
    const grass = createGrassGrid(config);
    expect(grass.length).toBe(gridSize * gridSize);
    for (const patch of grass) {
      expect(patch.alive).toBe(true);
    }
  });
});
