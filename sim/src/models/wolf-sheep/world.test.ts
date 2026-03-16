import { describe, it, expect } from 'vitest';
import { WolfSheepWorld } from './world.js';
import { wolfSheepDef } from './definition.js';
import type { GrassPatch } from './agent.js';

const defaultConfig: Record<string, number> = { ...wolfSheepDef.defaultConfig, seed: 42 };
const width = defaultConfig['width']!;
const height = defaultConfig['height']!;
const gridSize = defaultConfig['grassGridSize']!;
const moveCost = defaultConfig['moveCost']!;
const sheepGainFromFood = defaultConfig['sheepGainFromFood']!;

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

  it('step moves agents', () => {
    const world = createWorld();
    const positionsBefore = world.agents.map(a => ({ x: a.x, y: a.y }));

    world.step();

    const moved = world.agents.some(
      (a, i) => a.x !== positionsBefore[i]!.x || a.y !== positionsBefore[i]!.y
    );
    expect(moved).toBe(true);
  });

  it('step costs energy', () => {
    const world = createWorld({ initialSheep: 0 });
    const wolf = world.agents.find(a => a.type === 'wolf')!;
    const wolfEnergyBefore = wolf.energy;
    world.step();
    expect(wolf.energy).toBe(wolfEnergyBefore - moveCost);
  });

  it('step keeps agents in bounds', () => {
    const world = createWorld();
    for (let i = 0; i < 100; i++) {
      world.step();
    }
    const aliveAgents = world.agents.filter(a => a.alive);
    for (const a of aliveAgents) {
      expect(a.x).toBeGreaterThanOrEqual(a.radius);
      expect(a.x).toBeLessThanOrEqual(width - a.radius);
      expect(a.y).toBeGreaterThanOrEqual(a.radius);
      expect(a.y).toBeLessThanOrEqual(height - a.radius);
    }
  });

  it('wolf eats sheep on overlap', () => {
    const world = createWorld({ initialWolves: 1, initialSheep: 1 });
    const wolf = world.agents.find(a => a.type === 'wolf')!;
    const sheep = world.agents.find(a => a.type === 'sheep')!;

    wolf.x = 400;
    wolf.y = 300;
    sheep.x = 400;
    sheep.y = 300;

    const wolfEnergyBefore = wolf.energy;

    world.step();

    expect(sheep.alive).toBe(false);
    expect(wolf.energy).toBeGreaterThan(wolfEnergyBefore - moveCost);
  });

  it('sheep eats grass', () => {
    const world = createWorld({ initialWolves: 0, initialSheep: 1 });
    const sheep = world.agents.find(a => a.type === 'sheep')!;
    const grass = getGrass(world);

    const cellW = width / gridSize;
    const cellH = height / gridSize;
    sheep.x = cellW * 0.5;
    sheep.y = cellH * 0.5;

    const patch = grass.find(g => g.x === 0 && g.y === 0)!;
    expect(patch.alive).toBe(true);

    const energyBefore = sheep.energy;

    world.step();

    expect(patch.alive).toBe(false);
    expect(sheep.energy).toBe(energyBefore - moveCost + sheepGainFromFood);
  });

  it('grass regrows after timer', () => {
    const world = createWorld();
    const grass = getGrass(world);
    const patch = grass[0]!;

    patch.alive = false;
    patch.regrowthTimer = 1;

    world.step();

    expect(patch.alive).toBe(true);
  });

  it('agent dies at zero energy', () => {
    const world = createWorld({ initialWolves: 1, initialSheep: 0 });
    const wolf = world.agents.find(a => a.type === 'wolf')!;

    wolf.energy = moveCost;

    world.step();

    expect(wolf.alive).toBe(false);
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

    // Force wolf to eat sheep
    wolf.x = 400;
    wolf.y = 300;
    sheep.x = 400;
    sheep.y = 300;

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
});
