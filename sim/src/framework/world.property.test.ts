/**
 * Generic property-based tests for all registered models.
 * Uses fast-check to validate invariants that must hold for ALL valid inputs.
 * Auto-discovers models via listModels().
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import '../models/index.js';
import { listModels } from './model-registry.js';
import { clearEvents } from './logger.js';
import type { World } from './types.js';

for (const def of listModels()) {
  describe(`property: ${def.name}`, () => {
    let world: World;

    beforeEach(() => {
      clearEvents();
      world = def.createWorld({ ...def.defaultConfig, seed: 42 });
      world.setup();
    });

    it('population counts are never negative after any number of steps', { timeout: 30_000 }, () => {
      fc.assert(fc.property(
        fc.integer({ min: 1, max: 200 }),
        (steps) => {
          clearEvents();
          const w = def.createWorld({ ...def.defaultConfig, seed: 42 });
          w.setup();
          for (let i = 0; i < steps; i++) {
            w.step();
          }
          const counts = w.getPopulationCounts();
          for (const [key, val] of Object.entries(counts)) {
            expect(val, `${key} is negative at step ${steps}`).toBeGreaterThanOrEqual(0);
          }
        }
      ), { numRuns: 20 });
    });

    it('no NaN/Infinity in alive agent fields after any number of steps', { timeout: 30_000 }, () => {
      fc.assert(fc.property(
        fc.integer({ min: 1, max: 200 }),
        (steps) => {
          clearEvents();
          const w = def.createWorld({ ...def.defaultConfig, seed: 42 });
          w.setup();
          for (let i = 0; i < steps; i++) {
            w.step();
          }
          for (const a of w.agents.filter(a => a.alive)) {
            expect(Number.isFinite(a.x), `agent ${a.id} x`).toBe(true);
            expect(Number.isFinite(a.y), `agent ${a.id} y`).toBe(true);
            expect(Number.isFinite(a.energy), `agent ${a.id} energy`).toBe(true);
          }
        }
      ), { numRuns: 20 });
    });

    it('same seed produces identical population history (determinism)', () => {
      fc.assert(fc.property(
        fc.integer({ min: 1, max: 1000 }),
        (seed) => {
          clearEvents();
          const w1 = def.createWorld({ ...def.defaultConfig, seed });
          w1.setup();
          clearEvents();
          const w2 = def.createWorld({ ...def.defaultConfig, seed });
          w2.setup();

          for (let i = 0; i < 50; i++) {
            w1.step();
            w2.step();
          }

          expect(w1.populationHistory).toEqual(w2.populationHistory);
        }
      ), { numRuns: 10 });
    });

    it('tick increments by exactly 1 per step for any sequence length', () => {
      fc.assert(fc.property(
        fc.integer({ min: 1, max: 100 }),
        (steps) => {
          clearEvents();
          const w = def.createWorld({ ...def.defaultConfig, seed: 42 });
          w.setup();
          expect(w.tick).toBe(0);
          for (let i = 1; i <= steps; i++) {
            w.step();
            expect(w.tick).toBe(i);
          }
        }
      ), { numRuns: 10 });
    });
  });
}
