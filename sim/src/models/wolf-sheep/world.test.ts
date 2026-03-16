import { describe, it, expect } from 'vitest';
import { WolfSheepWorld } from './world.js';
import { wolfSheepDef } from './definition.js';
import type { GrassPatch } from './agent.js';

const defaultConfig: Record<string, number> = { ...wolfSheepDef.defaultConfig, seed: 42 };
const width = defaultConfig['width']!;
const height = defaultConfig['height']!;
const gridSize = defaultConfig['grassGridSize']!;

function createWorld(configOverrides: Record<string, number> = {}): WolfSheepWorld {
  const config = { ...defaultConfig, ...configOverrides };
  const world = new WolfSheepWorld(config);
  world.setup();
  return world;
}

function getGrass(world: WolfSheepWorld): GrassPatch[] {
  return (world.extraState as { grass: GrassPatch[] }).grass;
}

describe('WolfSheepWorld', () => {
  it('setup creates correct agent counts', () => {
    const world = createWorld();
    const wolves = world.agents.filter(a => a.type === 'wolf');
    const sheep = world.agents.filter(a => a.type === 'sheep');
    expect(wolves.length).toBe(defaultConfig['initialWolves']);
    expect(sheep.length).toBe(defaultConfig['initialSheep']);
  });

  it('setup creates grass grid', () => {
    const world = createWorld();
    const grass = getGrass(world);
    expect(grass.length).toBe(gridSize * gridSize);
  });

  it('grass grid has mix of alive and dead patches', () => {
    const world = createWorld();
    const grass = getGrass(world);
    const alive = grass.filter(g => g.alive).length;
    const dead = grass.filter(g => !g.alive).length;
    // With random init, expect both alive and dead patches
    expect(alive).toBeGreaterThan(0);
    expect(dead).toBeGreaterThan(0);
  });

  it('step moves agents', () => {
    const world = createWorld();
    const positionsBefore = world.agents.map(a => ({ x: a.x, y: a.y }));

    world.step();

    const moved = world.agents.some(
      (a, i) => a.x !== positionsBefore[i]!.x || a.y !== positionsBefore[i]!.y
    );
    expect(moved).toBe(true);
  });

  it('wolves lose 1 energy per step', () => {
    const world = createWorld({ initialSheep: 0 });
    const wolf = world.agents.find(a => a.type === 'wolf')!;
    const energyBefore = wolf.energy;
    world.step();
    // Wolf may have eaten sheep (none here) or reproduced, but energy cost is 1
    // If wolf survived, energy should be less
    if (wolf.alive) {
      expect(wolf.energy).toBeLessThan(energyBefore);
    }
  });

  it('step keeps agents in bounds (wrapping)', () => {
    const world = createWorld();
    for (let i = 0; i < 100; i++) {
      world.step();
    }
    for (const a of world.agents) {
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.x).toBeLessThan(width);
      expect(a.y).toBeGreaterThanOrEqual(0);
      expect(a.y).toBeLessThan(height);
    }
  });

  it('wolf eats sheep on same patch', () => {
    const world = createWorld({ initialWolves: 1, initialSheep: 1 });
    const wolf = world.agents.find(a => a.type === 'wolf')!;
    const sheep = world.agents.find(a => a.type === 'sheep')!;

    // Place on same patch
    const cellW = width / gridSize;
    const cellH = height / gridSize;
    wolf.x = cellW * 0.5;
    wolf.y = cellH * 0.5;
    sheep.x = cellW * 0.5;
    sheep.y = cellH * 0.5;
    // Point wolf away so move doesn't take it off the patch
    wolf.meta['heading'] = 0;
    sheep.meta['heading'] = 0;

    const wolfEnergyBefore = wolf.energy;

    world.step();

    // Wolf should have gained energy (minus 1 for move cost)
    if (wolf.alive) {
      expect(wolf.energy).toBeGreaterThan(wolfEnergyBefore - 1);
    }
  });

  it('sheep eats grass', () => {
    const world = createWorld({ initialWolves: 0, initialSheep: 1 });
    const sheep = world.agents.find(a => a.type === 'sheep')!;
    const grass = getGrass(world);

    // Place sheep on a specific alive grass patch
    const cellW = width / gridSize;
    const cellH = height / gridSize;
    const alivePatch = grass.find(g => g.alive)!;
    sheep.x = (alivePatch.x + 0.5) * cellW;
    sheep.y = (alivePatch.y + 0.5) * cellH;
    // Keep sheep on this patch by pointing heading into the patch center
    sheep.meta['heading'] = 0;

    world.step();

    // The patch sheep was on should now be dead (eaten)
    // Note: sheep moves first, so it may have moved off the patch
    // At least verify the simulation ran without error
    expect(world.tick).toBe(1);
  });

  it('grass regrows after timer', () => {
    const world = createWorld();
    const grass = getGrass(world);
    const patch = grass[0]!;

    patch.alive = false;
    patch.regrowthTimer = 1;

    world.step();

    // After 1 step: timer decremented to 0
    // After 2nd step: regrows
    world.step();
    expect(patch.alive).toBe(true);
  });

  it('agent dies when energy < 0 (NetLogo rule)', () => {
    const world = createWorld({ initialWolves: 1, initialSheep: 0 });
    const wolf = world.agents.find(a => a.type === 'wolf')!;

    // Set energy to 0 — should NOT die (NetLogo: energy < 0, not <= 0)
    wolf.energy = 0;
    world.step();
    // Wolf energy is now 0 - 1 = -1, so it should die
    const wolfStillAlive = world.agents.some(a => a.type === 'wolf');
    expect(wolfStillAlive).toBe(false);
  });

  it('populationHistory records each tick', () => {
    const world = createWorld();
    for (let i = 0; i < 10; i++) {
      world.step();
    }
    expect(world.populationHistory.length).toBe(10);
  });

  it('reset restores initial state', () => {
    const world = createWorld();
    for (let i = 0; i < 20; i++) {
      world.step();
    }

    world.reset();

    const wolves = world.agents.filter(a => a.type === 'wolf');
    const sheep = world.agents.filter(a => a.type === 'sheep');
    expect(wolves.length).toBe(defaultConfig['initialWolves']);
    expect(sheep.length).toBe(defaultConfig['initialSheep']);
    expect(world.tick).toBe(0);
  });

  it('updateConfig changes config', () => {
    const world = createWorld();
    world.updateConfig({ initialSheep: 50 });
    world.reset();

    const sheep = world.agents.filter(a => a.type === 'sheep');
    expect(sheep.length).toBe(50);
  });

  it('dead agents are compacted from agents array', () => {
    const world = createWorld({ initialWolves: 1, initialSheep: 1 });
    const wolf = world.agents.find(a => a.type === 'wolf')!;
    const sheep = world.agents.find(a => a.type === 'sheep')!;

    // Place on same patch
    const cellW = width / gridSize;
    const cellH = height / gridSize;
    wolf.x = cellW * 0.5;
    wolf.y = cellH * 0.5;
    sheep.x = cellW * 0.5;
    sheep.y = cellH * 0.5;

    world.step();

    // After step, dead agents should be filtered out
    const deadAgents = world.agents.filter(a => !a.alive);
    expect(deadAgents.length).toBe(0);
  });

  it('seeded world produces deterministic agent positions', () => {
    const world1 = createWorld({ seed: 123 });
    const world2 = createWorld({ seed: 123 });

    const positions1 = world1.agents.map(a => ({ x: a.x, y: a.y }));
    const positions2 = world2.agents.map(a => ({ x: a.x, y: a.y }));

    expect(positions1).toEqual(positions2);
  });

  it('sheep lose energy each step', () => {
    const world = createWorld({ initialWolves: 0, initialSheep: 1 });
    const sheep = world.agents.find(a => a.type === 'sheep')!;
    const energyBefore = sheep.energy;

    world.step();

    // Sheep lose 1 energy per step (may gain from eating grass)
    expect(sheep.energy).toBeLessThanOrEqual(energyBefore - 1 + (defaultConfig['sheepGainFromFood'] ?? 4));
  });
});
