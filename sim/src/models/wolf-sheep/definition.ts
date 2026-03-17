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
    initialWolves: 50,
    initialSheep: 100,
    wolfGainFromFood: 20,
    sheepGainFromFood: 4,
    wolfReproduceRate: 5,
    sheepReproduceRate: 4,
    grassRegrowthTime: 30,
    grassGridSize: 51,
    seed: 0,
  },
  configSchema: [
    { key: 'width', label: 'Width', min: 400, max: 1200, step: 100, default: 800, tier: 'hidden' },
    { key: 'height', label: 'Height', min: 300, max: 900, step: 100, default: 600, tier: 'hidden' },
    { key: 'initialSheep', label: 'Initial Sheep', min: 1, max: 250, step: 1, default: 100, info: 'Number of sheep at the start\nHigh → more food for wolves, longer cycles\nLow → wolves starve before breeding', tier: 'core' }, /* NetLogo default: 100 */
    { key: 'initialWolves', label: 'Initial Wolves', min: 1, max: 250, step: 1, default: 50, info: 'Number of wolves at the start\nHigh → wolves eat all sheep quickly\nLow → wolves may go extinct early', tier: 'core' }, /* NetLogo default: 50 */
    { key: 'sheepGainFromFood', label: 'Sheep Food Gain', min: 1, max: 50, step: 1, default: 4, info: 'Energy a sheep gains per grass patch eaten\nHigh → sheep thrive even with heavy predation\nLow → sheep depend on fast grass regrowth', tier: 'core' }, /* NetLogo default: 4 */
    { key: 'wolfGainFromFood', label: 'Wolf Food Gain', min: 1, max: 100, step: 1, default: 20, info: 'Energy a wolf gains per sheep eaten\nHigh → wolves live longer, population explodes\nLow → wolves starve between meals', tier: 'core' }, /* NetLogo default: 20 */
    { key: 'sheepReproduceRate', label: 'Sheep Breed %', min: 1, max: 20, step: 1, default: 4, info: 'Chance of breeding each step (energy halved)\nHigh → sheep recover quickly after predation\nLow → sheep can\'t outpace wolf hunting', tier: 'advanced' }, /* NetLogo default: 4 */
    { key: 'wolfReproduceRate', label: 'Wolf Breed %', min: 1, max: 20, step: 1, default: 5, info: 'Chance of breeding each step (energy halved)\nHigh → rapid wolf population growth\nLow → wolves decline faster than they breed', tier: 'advanced' }, /* NetLogo default: 5 */
    { key: 'grassRegrowthTime', label: 'Grass Regrowth', min: 1, max: 100, step: 1, default: 30, info: 'Steps until eaten grass grows back\nHigh → sheep starve in barren patches\nLow → unlimited food, sheep population explodes', tier: 'advanced' }, /* NetLogo default: 30 */
    { key: 'grassGridSize', label: 'Grass Grid Size', min: 10, max: 80, step: 1, default: 51, tier: 'hidden' }, /* NetLogo default: 51 */
    { key: 'seed', label: 'Random Seed', min: 0, max: 99999, step: 1, default: 0, info: 'Seed for reproducible runs. 0 = random each time.', tier: 'hidden' },
  ],
  agentTypes: [
    { type: 'wolf', color: '#ff2daa', radius: 6, shape: 'triangle' },
    { type: 'sheep', color: '#affff7', radius: 5, shape: 'circle' },
  ],
  populationDisplay: [
    { key: 'wolf', label: 'Wolves', color: '#ff2daa' },
    { key: 'sheep', label: 'Sheep', color: '#affff7' },
    { key: 'grass', label: 'Grass', color: '#66ff55', showInChart: false },
  ],
  toggles: [],
  expectedPattern: {
    type: 'oscillation',
    description: 'Lotka-Volterra predator-prey cycles',
    minTicks: 500,
    populations: ['wolf', 'sheep'],
    minCycles: 3,
    maxExtinctionRate: 0.1,
  },
  challengeText: 'Can you find the right combination of parameters to generate this pattern?',
  patternSvg: '<svg viewBox="0 0 200 45" style="width:100%;height:40px;display:block"><path d="M5,32 Q25,6 45,28 Q65,42 85,18 Q105,2 125,32 Q145,42 165,12 Q180,4 195,25" stroke="#affff7" fill="none" stroke-width="1.5" opacity="0.8"/><path d="M5,12 Q25,38 45,22 Q65,6 85,32 Q105,42 125,12 Q145,2 165,35 Q180,42 195,18" stroke="#ff2daa" fill="none" stroke-width="1.5" opacity="0.8"/></svg>',
  createWorld: (config: Record<string, number>) => new WolfSheepWorld(config),
};

registerModel(wolfSheepDef);
