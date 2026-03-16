import type { ModelDefinition } from '../../framework/model-registry.js';
import { registerModel } from '../../framework/model-registry.js';
import { WolfSheepWorld } from './world.js';

export const wolfSheepDef: ModelDefinition = {
  id: 'wolf-sheep',
  name: 'Wolf Sheep Predation',
  description: 'Classic Lotka-Volterra predator-prey dynamics with grass resource layer',
  context: 'The Lotka-Volterra predator-prey model is one of the foundational models in ecology. It demonstrates how two species populations naturally oscillate — when prey is abundant, predators thrive and grow; as predators increase, prey declines; without prey, predators starve; with fewer predators, prey rebounds. Adding grass as a resource creates a three-level food chain that produces stable oscillations matching real-world ecosystems.',
  credit: 'Based on NetLogo Wolf Sheep Predation by Uri Wilensky (1997). Center for Connected Learning and Computer-Based Modeling, Northwestern University, Evanston, IL.',
  defaultConfig: {
    width: 800,
    height: 600,
    initialWolves: 30,
    initialSheep: 100,
    wolfSpeed: 1.8,
    sheepSpeed: 1.5,
    wolfGainFromFood: 20,
    sheepGainFromFood: 5,
    moveCost: 0.5,
    wolfReproduceThreshold: 60,
    sheepReproduceThreshold: 30,
    wolfReproduceRate: 0.04,
    sheepReproduceRate: 0.06,
    grassRegrowthTime: 20,
    grassGridSize: 20,
    catchRadius: 8,
    fleeRadius: 50,
    seed: 0,
  },
  configSchema: [
    { key: 'width', label: 'Width', min: 400, max: 1200, step: 100, default: 800, tier: 'hidden' },
    { key: 'height', label: 'Height', min: 300, max: 900, step: 100, default: 600, tier: 'hidden' },
    { key: 'initialWolves', label: 'Initial Wolves', min: 1, max: 200, step: 1, default: 30 },
    { key: 'initialSheep', label: 'Initial Sheep', min: 1, max: 200, step: 1, default: 100 },
    { key: 'wolfSpeed', label: 'Wolf Speed', min: 0.5, max: 5, step: 0.1, default: 1.8 },
    { key: 'sheepSpeed', label: 'Sheep Speed', min: 0.5, max: 5, step: 0.1, default: 1.5 },
    { key: 'wolfGainFromFood', label: 'Wolf Food Gain', min: 1, max: 50, step: 1, default: 20 },
    { key: 'sheepGainFromFood', label: 'Sheep Food Gain', min: 1, max: 20, step: 1, default: 5 },
    { key: 'moveCost', label: 'Move Cost', min: 0.1, max: 5, step: 0.1, default: 0.5 },
    { key: 'wolfReproduceThreshold', label: 'Wolf Repro Threshold', min: 10, max: 100, step: 5, default: 60 },
    { key: 'sheepReproduceThreshold', label: 'Sheep Repro Threshold', min: 10, max: 100, step: 5, default: 30 },
    { key: 'wolfReproduceRate', label: 'Wolf Repro Rate', min: 0, max: 0.2, step: 0.01, default: 0.04 },
    { key: 'sheepReproduceRate', label: 'Sheep Repro Rate', min: 0, max: 0.2, step: 0.01, default: 0.06 },
    { key: 'grassRegrowthTime', label: 'Grass Regrowth', min: 1, max: 100, step: 1, default: 20 },
    { key: 'grassGridSize', label: 'Grass Grid Size', min: 10, max: 40, step: 1, default: 20 },
    { key: 'catchRadius', label: 'Catch Radius', min: 5, max: 30, step: 1, default: 8 },
    { key: 'fleeRadius', label: 'Flee Radius', min: 10, max: 80, step: 1, default: 50 },
    { key: 'seed', label: 'Random Seed', min: 0, max: 99999, step: 1, default: 0, info: 'Seed for reproducible runs. 0 = random each time.', tier: 'advanced' },
  ],
  agentTypes: [
    { type: 'wolf', color: '#ff2daa', radius: 4, shape: 'triangle' },
    { type: 'sheep', color: '#affff7', radius: 3, shape: 'circle' },
  ],
  toggles: [
    { key: 'showEnergy', label: 'Show Energy', default: false },
    { key: 'showGrass', label: 'Show Grass', default: true },
  ],
  createWorld: (config: Record<string, number>) => new WolfSheepWorld(config),
};

registerModel(wolfSheepDef);
