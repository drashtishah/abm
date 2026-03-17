/**
 * Property-based tests for wolf-sheep behavior functions.
 * Validates invariants that must hold for ALL valid inputs.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { Agent } from '../../framework/types.js';
import { move, tryReproduce, death, findGrassPatchAt } from './behaviors.js';
import type { GrassPatch } from './agent.js';

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 0, type: 'wolf', x: 400, y: 300,
    vx: 0, vy: 0, radius: 6, speed: 1,
    energy: 50, color: '#ff2daa', alive: true,
    meta: { heading: 0 },
    ...overrides,
  };
}

describe('property: wolf-sheep behaviors', () => {
  it('move always wraps agent within world bounds', () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 2000 }),
      fc.integer({ min: 0, max: 2000 }),
      fc.integer({ min: 100, max: 2000 }),
      fc.integer({ min: 100, max: 2000 }),
      fc.integer({ min: 1, max: 50 }),
      (x, y, width, height, stepSize) => {
        const agent = makeAgent({ x, y });
        let callCount = 0;
        const rng = () => { callCount++; return (callCount * 0.37) % 1; };
        move(agent, width, height, stepSize, rng);
        expect(agent.x).toBeGreaterThanOrEqual(0);
        expect(agent.x).toBeLessThan(width);
        expect(agent.y).toBeGreaterThanOrEqual(0);
        expect(agent.y).toBeLessThan(height);
      }
    ), { numRuns: 200 });
  });

  it('move produces finite heading after any sequence', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 50 }),
      (steps) => {
        const agent = makeAgent();
        let callCount = 0;
        const rng = () => { callCount++; return (callCount * 0.618) % 1; };
        for (let i = 0; i < steps; i++) {
          move(agent, 800, 600, 10, rng);
        }
        expect(Number.isFinite(agent.meta['heading'] as number)).toBe(true);
        expect(Number.isFinite(agent.x)).toBe(true);
        expect(Number.isFinite(agent.y)).toBe(true);
      }
    ), { numRuns: 50 });
  });

  it('tryReproduce conserves energy: parent + child = original', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 1000 }),
      (energy) => {
        const agent = makeAgent({ energy });
        const originalEnergy = agent.energy;
        // Force reproduction to always happen by using rate > 100
        const child = tryReproduce(agent, 101, 10, 800, 600, () => 0);
        if (child) {
          const total = agent.energy + child.energy;
          expect(Math.abs(total - originalEnergy)).toBeLessThan(0.001);
        }
      }
    ), { numRuns: 100 });
  });

  it('tryReproduce child position is within world bounds', () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 800 }),
      fc.integer({ min: 0, max: 600 }),
      fc.integer({ min: 100, max: 2000 }),
      fc.integer({ min: 100, max: 2000 }),
      (x, y, width, height) => {
        const agent = makeAgent({ x, y, energy: 100 });
        let callCount = 0;
        const rng = () => { callCount++; return (callCount * 0.31) % 1; };
        // Force reproduction
        const child = tryReproduce(agent, 101, 10, width, height, rng);
        if (child) {
          expect(child.x).toBeGreaterThanOrEqual(0);
          expect(child.x).toBeLessThan(width);
          expect(child.y).toBeGreaterThanOrEqual(0);
          expect(child.y).toBeLessThan(height);
        }
      }
    ), { numRuns: 100 });
  });

  it('death sets alive=false iff energy < 0', () => {
    fc.assert(fc.property(
      fc.integer({ min: -1000, max: 1000 }),
      (energy) => {
        const agent = makeAgent({ energy });
        const died = death(agent);
        if (energy < 0) {
          expect(died).toBe(true);
          expect(agent.alive).toBe(false);
        } else {
          expect(died).toBe(false);
          expect(agent.alive).toBe(true);
        }
      }
    ), { numRuns: 200 });
  });

  it('findGrassPatchAt returns valid patch for in-bounds coordinates', () => {
    fc.assert(fc.property(
      fc.integer({ min: 5, max: 50 }),
      (gridSize) => {
        const config: Record<string, number> = {
          grassGridSize: gridSize,
          width: 800,
          height: 600,
        };
        const grass: GrassPatch[] = [];
        for (let y = 0; y < gridSize; y++) {
          for (let x = 0; x < gridSize; x++) {
            grass.push({ x, y, alive: true, regrowthTimer: 0 });
          }
        }
        // Test with coordinates well within bounds
        const patch = findGrassPatchAt(400, 300, grass, config);
        expect(patch).not.toBeNull();
      }
    ), { numRuns: 50 });
  });

  it('findGrassPatchAt returns null for out-of-bounds coordinates', () => {
    const config: Record<string, number> = {
      grassGridSize: 20,
      width: 800,
      height: 600,
    };
    const grass: GrassPatch[] = [];
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 20; x++) {
        grass.push({ x, y, alive: true, regrowthTimer: 0 });
      }
    }

    expect(findGrassPatchAt(-1, 300, grass, config)).toBeNull();
    expect(findGrassPatchAt(400, -1, grass, config)).toBeNull();
  });
});
