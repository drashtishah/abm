import type { ModelDefinition } from '../../framework/model-registry.js';
import { TemplateWorld } from './world.js';

export const templateDef: ModelDefinition = {
  id: 'template',
  name: 'Template Model',
  description: 'One-line description for the model selector dropdown',
  context: 'Why is this model scientifically important? What real-world phenomenon does it demonstrate? 2-3 concise sentences.',
  credit: 'Based on [Source Name] by [Author] ([Year]).',
  defaultConfig: {
    width: 800,
    height: 600,
    agentCount: 100,
  },
  configSchema: [
    { key: 'agentCount', label: 'Agents', min: 1, max: 500, step: 1, default: 100 },
  ],
  agentTypes: [
    { type: 'agent', color: '#66ff55', radius: 4, shape: 'circle' },
  ],
  // expectedPattern: {
  //   type: 'oscillation',  // oscillation | segregation | epidemic-curve | equilibrium
  //   description: 'Description of expected emergent behavior',
  //   minTicks: 500,
  //   populations: ['agent'],  // keys from getPopulationCounts()
  //   minCycles: 3,
  //   maxExtinctionRate: 0.1,
  // },
  createWorld: (config: Record<string, number>) => new TemplateWorld(config),
};

// To register: import and call registerModel(templateDef) in src/models/index.ts
