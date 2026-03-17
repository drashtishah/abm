/**
 * Property-based test template for model behaviors.
 * Copy this file when creating a new model. Customize the invariants
 * for your model's specific behavior functions.
 *
 * Generic contract tests (crash resistance, NaN checks, tick increment, etc.)
 * run automatically via contract.test.ts — no manual wiring needed.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { Agent } from '../../framework/types.js';
import { randomWalk, bounceOffWalls } from './behaviors.js';

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 0, type: 'agent', x: 400, y: 300,
    vx: 0, vy: 0, radius: 4, speed: 1.0,
    energy: 100, color: '#66ff55', alive: true, meta: {},
    ...overrides,
  };
}

describe('property: template behaviors', () => {
  it('bounceOffWalls keeps agent within bounds for any position', () => {
    fc.assert(fc.property(
      fc.integer({ min: -500, max: 1500 }),
      fc.integer({ min: -500, max: 1500 }),
      fc.integer({ min: -50, max: 50 }),
      fc.integer({ min: -50, max: 50 }),
      fc.integer({ min: 100, max: 2000 }),
      fc.integer({ min: 100, max: 2000 }),
      (x, y, vx, vy, width, height) => {
        const agent = makeAgent({ x, y, vx, vy, radius: 4 });
        bounceOffWalls(agent, width, height);
        expect(agent.x).toBeGreaterThanOrEqual(agent.radius);
        expect(agent.x).toBeLessThanOrEqual(width - agent.radius);
        expect(agent.y).toBeGreaterThanOrEqual(agent.radius);
        expect(agent.y).toBeLessThanOrEqual(height - agent.radius);
      }
    ), { numRuns: 200 });
  });

  it('randomWalk produces finite velocity', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 100 }),
      (speed) => {
        const agent = makeAgent({ speed });
        const vel = randomWalk(agent, { width: 800, height: 600 });
        expect(Number.isFinite(vel.vx)).toBe(true);
        expect(Number.isFinite(vel.vy)).toBe(true);
        // Velocity magnitude should equal speed
        const mag = Math.sqrt(vel.vx ** 2 + vel.vy ** 2);
        expect(mag).toBeCloseTo(speed, 5);
      }
    ), { numRuns: 100 });
  });
});
