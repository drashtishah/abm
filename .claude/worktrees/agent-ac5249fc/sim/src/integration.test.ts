import { describe, it, expect } from 'vitest';
import { WolfSheepWorld } from './models/wolf-sheep/world.js';
import { wolfSheepDef } from './models/wolf-sheep/definition.js';

describe('integration', () => {
  it('all modules import without error', async () => {
    const world = await import('./models/wolf-sheep/world.js');
    const registry = await import('./framework/model-registry.js');
    const logger = await import('./framework/logger.js');
    expect(world.WolfSheepWorld).toBeDefined();
    expect(registry.registerModel).toBeDefined();
    expect(logger.log).toBeDefined();
  });

  it('world setup + 100 steps doesn\'t crash', () => {
    const world = new WolfSheepWorld({ ...wolfSheepDef.defaultConfig, seed: 42 });
    world.setup();
    for (let i = 0; i < 100; i++) {
      world.step();
    }
    expect(world.tick).toBe(100);
  });

  it('population dynamics emerge', () => {
    const config = { ...wolfSheepDef.defaultConfig, initialWolves: 10, initialSheep: 50, seed: 42 };
    const world = new WolfSheepWorld(config);
    world.setup();
    const initialSheep = world.agents.filter(a => a.type === 'sheep').length;
    for (let i = 0; i < 200; i++) {
      world.step();
    }
    const finalSheep = world.agents.filter(a => a.type === 'sheep' && a.alive).length;
    expect(finalSheep).not.toBe(initialSheep);
  });
});
