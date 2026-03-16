import { describe, it, expect, beforeEach } from 'vitest';
import type { Agent } from '../../framework/types.js';
import type { GrassPatch } from './agent.js';
import { resetIdCounter, createGrassGrid } from './agent.js';
import {
  move,
  eatGrass,
  eatSheep,
  tryReproduce,
  death,
  growGrass,
  findGrassPatchAt,
} from './behaviors.js';
import { wolfSheepDef } from './definition.js';

const config = { ...wolfSheepDef.defaultConfig };
const width = config['width']!;
const height = config['height']!;
const gridSize = config['grassGridSize']!;
const stepSize = Math.min(width / gridSize, height / gridSize);

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
    radius: 6,
    speed: 1,
    energy: 40,
    color: '#000',
    alive: true,
    meta: { heading: 0 },
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

  describe('move', () => {
    it('changes agent position', () => {
      const agent = makeAgent({ x: 400, y: 300 });
      move(agent, width, height, stepSize, fixedRandom(0.5));
      // Agent should have moved
      expect(agent.x !== 400 || agent.y !== 300).toBe(true);
    });

    it('updates heading in meta', () => {
      const agent = makeAgent({ meta: { heading: 90 } });
      move(agent, width, height, stepSize, fixedRandom(0.5));
      expect(typeof agent.meta['heading']).toBe('number');
    });

    it('wraps around edges', () => {
      // Agent near right edge heading east
      const agent = makeAgent({ x: width - 1, y: 300, meta: { heading: 90 } });
      move(agent, width, height, stepSize, fixedRandom(0)); // random(50) returns 0, no turn
      // Should wrap to left side
      expect(agent.x).toBeGreaterThanOrEqual(0);
      expect(agent.x).toBeLessThan(width);
    });

    it('keeps position in bounds after many steps', () => {
      const agent = makeAgent({ x: 100, y: 100 });
      let seed = 0.1;
      const rng = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
      for (let i = 0; i < 500; i++) {
        move(agent, width, height, stepSize, rng);
      }
      expect(agent.x).toBeGreaterThanOrEqual(0);
      expect(agent.x).toBeLessThan(width);
      expect(agent.y).toBeGreaterThanOrEqual(0);
      expect(agent.y).toBeLessThan(height);
    });
  });

  describe('eatGrass', () => {
    it('sheep gains energy from alive grass patch', () => {
      const cellW = width / gridSize;
      const cellH = height / gridSize;
      const sheep = makeAgent({ type: 'sheep', x: cellW * 0.5, y: cellH * 0.5, energy: 10 });
      const grass = [makeGrassPatch({ x: 0, y: 0, alive: true })];
      const gain = eatGrass(sheep, grass, config);
      expect(gain).toBe(config['sheepGainFromFood']);
      expect(sheep.energy).toBe(10 + config['sheepGainFromFood']!);
      expect(grass[0]!.alive).toBe(false);
    });

    it('returns 0 when grass is dead', () => {
      const cellW = width / gridSize;
      const cellH = height / gridSize;
      const sheep = makeAgent({ type: 'sheep', x: cellW * 0.5, y: cellH * 0.5, energy: 10 });
      const grass = [makeGrassPatch({ x: 0, y: 0, alive: false })];
      const gain = eatGrass(sheep, grass, config);
      expect(gain).toBe(0);
      expect(sheep.energy).toBe(10);
    });
  });

  describe('eatSheep', () => {
    it('wolf eats sheep on same patch', () => {
      const cellW = width / gridSize;
      const cellH = height / gridSize;
      const wolf = makeAgent({ type: 'wolf', x: cellW * 0.5, y: cellH * 0.5, energy: 10 });
      const sheep = makeAgent({ type: 'sheep', x: cellW * 0.5, y: cellH * 0.5 });
      const eaten = eatSheep(wolf, [sheep], config, fixedRandom(0));
      expect(eaten).toBe(sheep);
      expect(sheep.alive).toBe(false);
      expect(wolf.energy).toBe(10 + config['wolfGainFromFood']!);
    });

    it('returns null when no sheep on same patch', () => {
      const wolf = makeAgent({ type: 'wolf', x: 10, y: 10 });
      const sheep = makeAgent({ type: 'sheep', x: 700, y: 500 });
      const eaten = eatSheep(wolf, [sheep], config, fixedRandom(0));
      expect(eaten).toBeNull();
    });

    it('picks one random sheep when multiple on same patch', () => {
      const cellW = width / gridSize;
      const cellH = height / gridSize;
      const wolf = makeAgent({ type: 'wolf', x: cellW * 0.5, y: cellH * 0.5, energy: 10 });
      const s1 = makeAgent({ type: 'sheep', id: 1, x: cellW * 0.5, y: cellH * 0.5 });
      const s2 = makeAgent({ type: 'sheep', id: 2, x: cellW * 0.5, y: cellH * 0.5 });
      const eaten = eatSheep(wolf, [s1, s2], config, fixedRandom(0));
      expect(eaten).not.toBeNull();
      // One sheep should be dead, one alive
      const deadCount = [s1, s2].filter(s => !s.alive).length;
      expect(deadCount).toBe(1);
    });
  });

  describe('tryReproduce', () => {
    it('halves parent energy on success', () => {
      const agent = makeAgent({ type: 'wolf', energy: 100 });
      const offspring = tryReproduce(agent, 100, stepSize, width, height, fixedRandom(0));
      expect(offspring).not.toBeNull();
      expect(agent.energy).toBe(50);
      expect(offspring!.energy).toBe(50);
    });

    it('works with low energy (no threshold, matches NetLogo)', () => {
      const agent = makeAgent({ type: 'sheep', energy: 2 });
      const offspring = tryReproduce(agent, 100, stepSize, width, height, fixedRandom(0));
      expect(offspring).not.toBeNull();
      expect(agent.energy).toBe(1);
      expect(offspring!.energy).toBe(1);
    });

    it('returns null when dice roll fails', () => {
      const agent = makeAgent({ energy: 100 });
      // random returns 0.99, so 0.99*100 = 99 >= 5% → no reproduce
      const offspring = tryReproduce(agent, 5, stepSize, width, height, fixedRandom(0.99));
      expect(offspring).toBeNull();
      expect(agent.energy).toBe(100); // unchanged
    });

    it('offspring has random heading', () => {
      const agent = makeAgent({ energy: 100, meta: { heading: 0 } });
      const offspring = tryReproduce(agent, 100, stepSize, width, height, fixedRandom(0.25));
      expect(offspring).not.toBeNull();
      expect(offspring!.meta['heading']).toBe(0.25 * 360);
    });
  });

  describe('death', () => {
    it('kills agent with negative energy', () => {
      const agent = makeAgent({ energy: -1 });
      const died = death(agent);
      expect(died).toBe(true);
      expect(agent.alive).toBe(false);
    });

    it('does not kill agent with zero energy', () => {
      const agent = makeAgent({ energy: 0 });
      const died = death(agent);
      expect(died).toBe(false);
      expect(agent.alive).toBe(true);
    });

    it('does not kill agent with positive energy', () => {
      const agent = makeAgent({ energy: 10 });
      const died = death(agent);
      expect(died).toBe(false);
      expect(agent.alive).toBe(true);
    });
  });

  describe('growGrass', () => {
    it('regrows when timer reaches 0', () => {
      const patch = makeGrassPatch({ alive: false, regrowthTimer: 1 });
      growGrass(patch);
      // Timer decremented to 0, but regrowth happens next call
      expect(patch.regrowthTimer).toBe(0);
      expect(patch.alive).toBe(false);
      growGrass(patch);
      expect(patch.alive).toBe(true);
    });

    it('decrements timer on dead patch', () => {
      const patch = makeGrassPatch({ alive: false, regrowthTimer: 5 });
      growGrass(patch);
      expect(patch.regrowthTimer).toBe(4);
      expect(patch.alive).toBe(false);
    });

    it('does nothing to alive patch', () => {
      const patch = makeGrassPatch({ alive: true, regrowthTimer: 10 });
      growGrass(patch);
      expect(patch.alive).toBe(true);
      expect(patch.regrowthTimer).toBe(10);
    });
  });

  describe('findGrassPatchAt', () => {
    it('returns correct patch via O(1) index', () => {
      const grass = createGrassGrid(config, fixedRandom(0.8)); // all alive (0.8 > 0.5)
      const cellW = width / gridSize;
      const cellH = height / gridSize;
      const worldX = (3 + 0.5) * cellW;
      const worldY = (5 + 0.5) * cellH;
      const patch = findGrassPatchAt(worldX, worldY, grass, config);
      expect(patch).not.toBeNull();
      expect(patch!.x).toBe(3);
      expect(patch!.y).toBe(5);
    });

    it('returns null for out-of-bounds coordinates', () => {
      const grass = createGrassGrid(config, fixedRandom(0.8));
      const patch = findGrassPatchAt(-10, -10, grass, config);
      expect(patch).toBeNull();
    });
  });
});
