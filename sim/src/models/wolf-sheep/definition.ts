import type { ModelDefinition } from '../../framework/model-registry.js';
import { registerModel } from '../../framework/model-registry.js';
import { WolfSheepWorld } from './world.js';

export const wolfSheepDef: ModelDefinition = {
  id: 'wolf-sheep',
  name: 'Wolf Sheep Predation',
  description: 'Classic Lotka-Volterra predator-prey dynamics with grass resource layer',
  context: `Classic predator-prey model.

Agent rules:
• Wolves wander randomly. Catch nearby sheep → gain energy.
• Sheep flee wolves. Eat grass → gain energy.
• All agents lose energy each step. Zero energy → die.
• Enough energy → chance to reproduce.
• Grass regrows after a delay.

These simple rules produce emergent oscillations:

Sheep boom → wolves thrive → sheep crash → wolves starve → repeat.`,
  credit: 'Based on <a href="https://ccl.northwestern.edu/netlogo/models/WolfSheepPredation" target="_blank">NetLogo Wolf Sheep Predation</a> by Uri Wilensky (1997). Center for Connected Learning and Computer-Based Modeling, Northwestern University, Evanston, IL.',
  defaultConfig: {
    width: 800,
    height: 600,
    initialWolves: 20,
    initialSheep: 200,
    wolfSpeed: 1.5,
    sheepSpeed: 1.0,
    wolfGainFromFood: 25,
    sheepGainFromFood: 4,
    moveCost: 0.3,
    wolfReproduceRate: 6,
    sheepReproduceRate: 5,
    grassRegrowthTime: 15,
    grassGridSize: 20,
    catchRadius: 5,
    fleeRadius: 30,
    seed: 0,
  },
  configSchema: [
    { key: 'width', label: 'Width', min: 400, max: 1200, step: 100, default: 800, tier: 'hidden' },
    { key: 'height', label: 'Height', min: 300, max: 900, step: 100, default: 600, tier: 'hidden' },
    { key: 'initialWolves', label: 'Initial Wolves', min: 1, max: 200, step: 1, default: 20, info: 'Number of wolves at the start\nHigh → wolves eat all sheep quickly\nLow → wolves may go extinct early', tier: 'core' },
    { key: 'initialSheep', label: 'Initial Sheep', min: 1, max: 200, step: 1, default: 200, info: 'Number of sheep at the start\nHigh → more food for wolves, longer cycles\nLow → wolves starve before breeding', tier: 'core' },
    { key: 'wolfSpeed', label: 'Wolf Speed', min: 0.5, max: 5, step: 0.1, default: 1.5, info: 'Distance a wolf moves each step\nHigh → wolves encounter sheep more often\nLow → wolves starve while wandering', tier: 'core' },
    { key: 'sheepSpeed', label: 'Sheep Speed', min: 0.5, max: 5, step: 0.1, default: 1.0, info: 'Distance a sheep moves each step\nHigh → sheep escape wolves more easily\nLow → sheep get caught more often', tier: 'core' },
    { key: 'wolfGainFromFood', label: 'Wolf Food Gain', min: 1, max: 50, step: 1, default: 25, info: 'Energy a wolf gains per sheep eaten\nHigh → wolves live longer, population explodes\nLow → wolves starve between meals', tier: 'advanced' },
    { key: 'sheepGainFromFood', label: 'Sheep Food Gain', min: 1, max: 20, step: 1, default: 4, info: 'Energy a sheep gains per grass patch eaten\nHigh → sheep thrive even with heavy predation\nLow → sheep depend on fast grass regrowth', tier: 'advanced' },
    { key: 'moveCost', label: 'Move Cost', min: 0.1, max: 5, step: 0.1, default: 0.3, info: 'Energy lost every step from moving\nHigh → short lifespans, fast population turnover\nLow → agents live longer, slower dynamics', tier: 'advanced' },
    { key: 'wolfReproduceRate', label: 'Wolf Breed %', min: 1, max: 20, step: 1, default: 6, info: 'Chance of breeding each step (energy halved)\nHigh → rapid wolf population growth\nLow → wolves decline faster than they breed', tier: 'advanced' },
    { key: 'sheepReproduceRate', label: 'Sheep Breed %', min: 1, max: 20, step: 1, default: 5, info: 'Chance of breeding each step (energy halved)\nHigh → sheep recover quickly after predation\nLow → sheep can\'t outpace wolf hunting', tier: 'advanced' },
    { key: 'grassRegrowthTime', label: 'Grass Regrowth', min: 1, max: 100, step: 1, default: 15, info: 'Steps until eaten grass grows back\nHigh → sheep starve in barren patches\nLow → unlimited food, sheep population explodes', tier: 'advanced' },
    { key: 'grassGridSize', label: 'Grass Grid Size', min: 10, max: 40, step: 1, default: 20, tier: 'hidden' },
    { key: 'catchRadius', label: 'Catch Radius', min: 1, max: 30, step: 1, default: 5, info: 'Distance at which a wolf catches a sheep\nHigh → wolves catch easily, sheep go extinct\nLow → wolves rarely catch, they starve', tier: 'advanced' },
    { key: 'fleeRadius', label: 'Flee Radius', min: 5, max: 80, step: 1, default: 30, info: 'Distance at which sheep detect wolves and flee\nHigh → sheep flee early but waste energy running\nLow → sheep only flee when wolves are very close', tier: 'advanced' },
    { key: 'seed', label: 'Random Seed', min: 0, max: 99999, step: 1, default: 0, info: 'Seed for reproducible runs. 0 = random each time.', tier: 'advanced' },
  ],
  agentTypes: [
    { type: 'wolf', color: '#ff2daa', radius: 6, shape: 'triangle' },
    { type: 'sheep', color: '#affff7', radius: 5, shape: 'circle' },
  ],
  toggles: [],
  createWorld: (config: Record<string, number>) => new WolfSheepWorld(config),
};

registerModel(wolfSheepDef);
