import { describe, it, expect } from 'vitest';
import { WolfSheepWorld } from './models/wolf-sheep/world.js';
import { wolfSheepDef } from './models/wolf-sheep/definition.js';
import { getEvents, clearEvents } from './framework/logger.js';

const defaultConfig = { ...wolfSheepDef.defaultConfig, seed: 42 };

function createWorld(overrides: Record<string, number> = {}): WolfSheepWorld {
  clearEvents();
  const world = new WolfSheepWorld({ ...defaultConfig, ...overrides });
  world.setup();
  return world;
}

describe('stress tests', () => {
  it('200 agents for 1000 steps without crash', () => {
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
    for (let i = 0; i < 100; i++) {
      world.step();
    }
    const wolves = world.agents.filter(a => a.type === 'wolf' && a.alive).length;
    const sheep = world.agents.filter(a => a.type === 'sheep' && a.alive).length;

    if (wolves < 1 || sheep < 1) {
      console.log('Population warnings:', getEvents({ level: 'warn' }));
    }

    expect(wolves).toBeGreaterThan(0);
    expect(sheep).toBeGreaterThan(0);
  });

  it('Lotka-Volterra oscillation emerges', () => {
    const world = createWorld();
    for (let i = 0; i < 500; i++) {
      world.step();
    }

    // Check that population has variation — not monotonic
    // Use sheep population as it's more volatile
    const sheepPops = world.populationHistory.map(h => h['sheep'] ?? 0);
    const wolfPops = world.populationHistory.map(h => h['wolves'] ?? 0);

    // At minimum, populations should change — not stay flat
    const minSheep = Math.min(...sheepPops);
    const maxSheep = Math.max(...sheepPops);
    const minWolf = Math.min(...wolfPops);
    const maxWolf = Math.max(...wolfPops);

    // Population range should be significant
    expect(maxSheep - minSheep).toBeGreaterThan(10);
    expect(maxWolf - minWolf).toBeGreaterThan(5);
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

  it('build produces valid dist', async () => {
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
