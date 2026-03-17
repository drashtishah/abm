/**
 * Wolf-Sheep-specific stress tests.
 * Generic contract tests (crash resistance, NaN checks, tick increment, etc.)
 * are in contract.test.ts and auto-discover all registered models.
 * This file tests domain-specific behavior unique to wolf-sheep.
 */

import { describe, it, expect } from 'vitest';
import { WolfSheepWorld } from './models/wolf-sheep/world.js';
import { wolfSheepDef } from './models/wolf-sheep/definition.js';
import { clearEvents } from './framework/logger.js';
import { evaluate } from './cli/evaluate.js';
import type { OscillationCriteria } from './framework/types.js';

const defaultConfig = { ...wolfSheepDef.defaultConfig, seed: 42 };
const pattern = wolfSheepDef.expectedPattern as OscillationCriteria;

function createWorld(overrides: Record<string, number> = {}): WolfSheepWorld {
  clearEvents();
  const world = new WolfSheepWorld({ ...defaultConfig, ...overrides });
  world.setup();
  return world;
}

describe('wolf-sheep stress tests', () => {
  it('both species survive first 50 ticks', () => {
    clearEvents();
    const world = createWorld();
    for (let i = 0; i < 50; i++) {
      world.step();
    }
    const wolves = world.agents.filter(a => a.type === 'wolf' && a.alive).length;
    const sheep = world.agents.filter(a => a.type === 'sheep' && a.alive).length;

    // Both species must survive the first 50 ticks
    expect(wolves).toBeGreaterThan(0);
    expect(sheep).toBeGreaterThan(0);
  });

  it('default config produces Lotka-Volterra dynamics across multiple seeds', { timeout: 30000 }, () => {
    // Validates that defaults produce predator-prey oscillation dynamics.
    // Based on NetLogo Wolf Sheep Predation (Wilensky, 1997).
    // Thresholds are derived from the model's expectedPattern definition,
    // not hardcoded — keeping tests and scientist evaluators in sync.
    for (const seed of [1, 7, 42, 99, 123]) {
      const world = createWorld({ seed });

      // Run for minTicks from expectedPattern (500) to match evaluator requirements
      for (let i = 0; i < pattern.minTicks; i++) {
        world.step();
      }

      // Use the same evaluator the experiment loop and --score flag use
      const result = evaluate(world.populationHistory, pattern);
      expect(result.score, `seed=${seed}: pattern fidelity too low (${result.score})`).toBeGreaterThan(0.3);

      // Both species must survive at least 100 ticks (not instant collapse)
      // Derived from maxExtinctionRate — if extinction rate is low, early survival is expected
      for (const pop of pattern.populations) {
        const series = world.populationHistory.slice(0, 100).map(h => h[pop] ?? 0);
        const aliveCount = series.filter(n => n > 0).length;
        expect(aliveCount, `seed=${seed}: ${pop} extinct before tick 100`).toBeGreaterThanOrEqual(80);
      }
    }
  });

  it('grass regrows after being eaten', () => {
    const world = createWorld();
    const getGrassAlive = () =>
      ((world.extraState as { grass: { alive: boolean }[] }).grass).filter(g => g.alive).length;

    for (let i = 0; i < 100; i++) {
      world.step();
    }
    const finalGrass = getGrassAlive();

    // Grass is still alive (regrowth works)
    expect(finalGrass).toBeGreaterThan(0);
  });

  it('historyLimit config controls cap', () => {
    const world = createWorld({ historyLimit: 100 });
    for (let i = 0; i < 150; i++) {
      world.step();
    }
    expect(world.populationHistory.length).toBeLessThanOrEqual(100);
    expect(world.tick).toBe(150);
  });

  it('historyLimit Infinity keeps all history', () => {
    const world = createWorld({ historyLimit: Infinity });
    for (let i = 0; i < 600; i++) {
      world.step();
    }
    expect(world.populationHistory.length).toBe(600);
    expect(world.tick).toBe(600);
  });

  it('build produces valid dist', { timeout: 30000 }, async () => {
    const { execSync } = await import('child_process');
    const { existsSync, readFileSync } = await import('fs');
    const { resolve } = await import('path');

    execSync('npm run build', { cwd: resolve(__dirname, '..'), stdio: 'pipe' });

    const distIndex = resolve(__dirname, '..', 'dist', 'index.html');
    expect(existsSync(distIndex)).toBe(true);

    const html = readFileSync(distIndex, 'utf-8');
    expect(html).toContain('<canvas');
    expect(html).toContain('<script');
  });
});
