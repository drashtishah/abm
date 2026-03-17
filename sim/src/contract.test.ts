/**
 * Generic contract tests for all registered models.
 * Auto-discovers models via listModels() — registering a new model
 * automatically gets contract coverage with zero manual wiring.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import './models/index.js';
import { listModels } from './framework/model-registry.js';
import { clearEvents } from './framework/logger.js';
import { evaluate } from './cli/evaluate.js';
import type { World } from './framework/types.js';

for (const def of listModels()) {
  describe(`contract: ${def.name}`, () => {
    let world: World;

    beforeEach(() => {
      clearEvents();
      world = def.createWorld({ ...def.defaultConfig, seed: 42 });
      world.setup();
    });

    it('survives 1000 ticks without crash', { timeout: 30000 }, () => {
      for (let i = 0; i < 1000; i++) {
        world.step();
      }
      expect(world.tick).toBe(1000);
    });

    it('no NaN in alive agents after 500 steps', () => {
      for (let i = 0; i < 500; i++) {
        world.step();
      }
      const aliveAgents = world.agents.filter(a => a.alive);
      for (const a of aliveAgents) {
        expect(Number.isFinite(a.x), `agent ${a.id} x is NaN/Infinity`).toBe(true);
        expect(Number.isFinite(a.y), `agent ${a.id} y is NaN/Infinity`).toBe(true);
        expect(Number.isFinite(a.vx), `agent ${a.id} vx is NaN/Infinity`).toBe(true);
        expect(Number.isFinite(a.vy), `agent ${a.id} vy is NaN/Infinity`).toBe(true);
        expect(Number.isFinite(a.energy), `agent ${a.id} energy is NaN/Infinity`).toBe(true);
      }
    });

    it('population does not instantly collapse (first 50 ticks)', () => {
      for (let i = 0; i < 50; i++) {
        world.step();
      }
      const counts = world.getPopulationCounts();
      const totalAlive = Object.values(counts).reduce((sum, n) => sum + n, 0);
      expect(totalAlive, 'all agents died within 50 ticks').toBeGreaterThan(0);
    });

    it('populationHistory length respects historyLimit', () => {
      const limit = def.defaultConfig['historyLimit'] ?? 500;
      const ticksToRun = Number.isFinite(limit) ? limit + 50 : 100;
      for (let i = 0; i < ticksToRun; i++) {
        world.step();
      }
      if (Number.isFinite(limit)) {
        expect(world.populationHistory.length).toBeLessThanOrEqual(limit);
      }
      expect(world.tick).toBe(ticksToRun);
    });

    it('tick increments by exactly 1 per step', () => {
      expect(world.tick).toBe(0);
      for (let i = 1; i <= 10; i++) {
        world.step();
        expect(world.tick).toBe(i);
      }
    });

    it('getPopulationCounts returns non-negative values', () => {
      for (let i = 0; i < 100; i++) {
        world.step();
        const counts = world.getPopulationCounts();
        for (const [key, val] of Object.entries(counts)) {
          expect(val, `${key} is negative at tick ${i}`).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('reset restores initial tick to 0', () => {
      for (let i = 0; i < 10; i++) {
        world.step();
      }
      expect(world.tick).toBe(10);
      world.reset();
      expect(world.tick).toBe(0);
      expect(world.populationHistory.length).toBe(0);
    });

    if (def.expectedPattern) {
      it('produces expected pattern with default config', { timeout: 30000 }, () => {
        const pattern = def.expectedPattern!;
        for (let i = 0; i < pattern.minTicks; i++) {
          world.step();
        }
        const result = evaluate(world.populationHistory, pattern);
        expect(result.score, `pattern score too low: ${result.score}`).toBeGreaterThan(0.3);
      });
    }
  });
}
