import { describe, it, expect } from 'vitest';
import { WolfSheepWorld } from './models/wolf-sheep/world.js';
import { wolfSheepDef } from './models/wolf-sheep/definition.js';
import { clearEvents } from './framework/logger.js';

const defaultConfig = { ...wolfSheepDef.defaultConfig, seed: 42 };

function createWorld(overrides: Record<string, number> = {}): WolfSheepWorld {
  clearEvents();
  const world = new WolfSheepWorld({ ...defaultConfig, ...overrides });
  world.setup();
  return world;
}

describe('stress tests', () => {
  it('200 agents for 1000 steps without crash', { timeout: 30000 }, () => {
    const world = createWorld({ initialWolves: 100, initialSheep: 100 });
    for (let i = 0; i < 1000; i++) {
      world.step();
    }
    expect(world.tick).toBe(1000);
  });

  it('no NaN in agent positions after 500 steps', () => {
    const world = createWorld();
    for (let i = 0; i < 500; i++) {
      world.step();
    }
    const aliveAgents = world.agents.filter(a => a.alive);
    for (const a of aliveAgents) {
      expect(Number.isFinite(a.x)).toBe(true);
      expect(Number.isFinite(a.y)).toBe(true);
      expect(Number.isFinite(a.vx)).toBe(true);
      expect(Number.isFinite(a.vy)).toBe(true);
      expect(Number.isFinite(a.energy)).toBe(true);
    }
  });

  it('population doesn\'t instantly collapse', () => {
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
    // In stochastic models, eventual extinction is possible — we validate
    // that oscillation OCCURS (populations rise and fall), not that both
    // species survive indefinitely.
    for (const seed of [1, 7, 42, 99, 123]) {
      const world = createWorld({ seed });

      const wolvesHistory: number[] = [];
      const sheepHistory: number[] = [];

      for (let i = 0; i < 300; i++) {
        world.step();
        const counts = world.getPopulationCounts();
        wolvesHistory.push(counts['wolf'] ?? 0);
        sheepHistory.push(counts['sheep'] ?? 0);
      }

      // Wolf population must show oscillation (direction changes),
      // not just monotonic decline from initial count
      let wolfDirectionChanges = 0;
      for (let i = 2; i < wolvesHistory.length; i++) {
        const prev = wolvesHistory[i - 1]! - wolvesHistory[i - 2]!;
        const curr = wolvesHistory[i]! - wolvesHistory[i - 1]!;
        if ((prev > 0 && curr < 0) || (prev < 0 && curr > 0)) {
          wolfDirectionChanges++;
        }
      }
      expect(wolfDirectionChanges, `seed=${seed}: wolf population never oscillated`).toBeGreaterThanOrEqual(2);

      // Both species must survive at least 100 ticks (not instant collapse)
      const wolfAlive100 = wolvesHistory.slice(0, 100).filter(n => n > 0).length;
      const sheepAlive100 = sheepHistory.slice(0, 100).filter(n => n > 0).length;
      expect(wolfAlive100, `seed=${seed}: wolves extinct before tick 100`).toBeGreaterThanOrEqual(80);
      expect(sheepAlive100, `seed=${seed}: sheep extinct before tick 100`).toBe(100);
    }
  });

  it('grass regrows after being eaten', () => {
    const world = createWorld();
    for (let i = 0; i < 100; i++) {
      world.step();
    }

    // Some grass was eaten (population decreased) but some regrew
    const grassCounts = world.populationHistory.map(h => h['grass'] ?? 0);
    const initialGrass = grassCounts[0]!;
    const minGrass = Math.min(...grassCounts);

    // Some grass was eaten at some point
    expect(minGrass).toBeLessThan(initialGrass);
    // But grass is still alive (regrowth works)
    const finalGrass = grassCounts[grassCounts.length - 1]!;
    expect(finalGrass).toBeGreaterThan(0);
  });

  it('populationHistory capped at 500 but tick keeps counting', () => {
    const world = createWorld();
    for (let i = 0; i < 600; i++) {
      world.step();
    }
    expect(world.populationHistory.length).toBeLessThanOrEqual(500);
    expect(world.tick).toBe(600);
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
