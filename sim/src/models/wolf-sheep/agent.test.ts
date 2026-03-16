import { describe, it, expect, beforeEach } from 'vitest';
import { createWolf, createSheep, createGrassGrid, resetIdCounter } from './agent.js';
import { wolfSheepDef } from './definition.js';
import { mulberry32 } from '../../utils/prng.js';

const config = { ...wolfSheepDef.defaultConfig };

describe('agent', () => {
  beforeEach(() => {
    resetIdCounter();
  });

  it('createWolf returns valid wolf with heading', () => {
    const random = mulberry32(42);
    const wolf = createWolf(config, random);
    expect(wolf.type).toBe('wolf');
    expect(wolf.alive).toBe(true);
    expect(wolf.speed).toBe(1);
    expect(wolf.energy).toBeGreaterThanOrEqual(0);
    expect(typeof wolf.meta['heading']).toBe('number');
  });

  it('createSheep returns valid sheep with heading', () => {
    const random = mulberry32(42);
    const sheep = createSheep(config, random);
    expect(sheep.type).toBe('sheep');
    expect(sheep.alive).toBe(true);
    expect(sheep.energy).toBeGreaterThanOrEqual(0);
    expect(typeof sheep.meta['heading']).toBe('number');
  });

  it('initial energy matches NetLogo formula: random(2 * gain)', () => {
    const random = mulberry32(42);
    const wolfGain = config['wolfGainFromFood']!;
    const sheepGain = config['sheepGainFromFood']!;

    for (let i = 0; i < 50; i++) {
      const wolf = createWolf(config, random);
      expect(wolf.energy).toBeGreaterThanOrEqual(0);
      expect(wolf.energy).toBeLessThan(2 * wolfGain);
      expect(Number.isInteger(wolf.energy)).toBe(true);

      const sheep = createSheep(config, random);
      expect(sheep.energy).toBeGreaterThanOrEqual(0);
      expect(sheep.energy).toBeLessThan(2 * sheepGain);
      expect(Number.isInteger(sheep.energy)).toBe(true);
    }
  });

  it('agents spawn within canvas bounds', () => {
    const w = config['width']!;
    const h = config['height']!;
    const random = mulberry32(42);
    for (let i = 0; i < 50; i++) {
      const wolf = createWolf(config, random);
      expect(wolf.x).toBeGreaterThanOrEqual(0);
      expect(wolf.x).toBeLessThanOrEqual(w);
      expect(wolf.y).toBeGreaterThanOrEqual(0);
      expect(wolf.y).toBeLessThanOrEqual(h);

      const sheep = createSheep(config, random);
      expect(sheep.x).toBeGreaterThanOrEqual(0);
      expect(sheep.x).toBeLessThanOrEqual(w);
      expect(sheep.y).toBeGreaterThanOrEqual(0);
      expect(sheep.y).toBeLessThanOrEqual(h);
    }
  });

  it('factory generates unique ids', () => {
    const random = mulberry32(42);
    const ids = new Set<number>();
    for (let i = 0; i < 100; i++) {
      const agent = i % 2 === 0 ? createWolf(config, random) : createSheep(config, random);
      ids.add(agent.id);
    }
    expect(ids.size).toBe(100);
  });

  it('createGrassGrid creates correct grid size', () => {
    const random = mulberry32(42);
    const gridSize = config['grassGridSize']!;
    const grass = createGrassGrid(config, random);
    expect(grass.length).toBe(gridSize * gridSize);
  });

  it('grass grid has random alive/dead patches', () => {
    const random = mulberry32(42);
    const grass = createGrassGrid(config, random);
    const alive = grass.filter(g => g.alive).length;
    const dead = grass.filter(g => !g.alive).length;
    expect(alive).toBeGreaterThan(0);
    expect(dead).toBeGreaterThan(0);
  });
});
