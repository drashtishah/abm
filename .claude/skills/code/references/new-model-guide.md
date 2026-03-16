---
title: New Model Guide
description: Step-by-step instructions for adding a new ABM model to the simulator.
---

## Overview

Every model lives in `sim/src/models/<name>/` and consists of 4 required files plus tests. A `_template/` directory exists at `sim/src/models/_template/` — copy it as a starting point.

## Step-by-Step

### 1. Create the model directory

```bash
cp -r sim/src/models/_template sim/src/models/<name>
```

### 2. Define the model (`definition.ts`)

Create a `ModelDefinition` and register it:

```typescript
import type { ModelDefinition } from '../../framework/model-registry.js';
import { registerModel } from '../../framework/model-registry.js';
import { MyWorld } from './world.js';

export const myModelDef: ModelDefinition = {
  id: '<name>',               // unique, kebab-case
  name: 'My Model Name',      // human-readable
  description: 'One-line summary of what this model simulates',
  context: `Multi-line explanation of the model dynamics.

Agent rules:
• Rule 1...
• Rule 2...

These rules produce emergent behavior X.`,
  credit: 'Optional attribution',
  defaultConfig: {
    width: 800,
    height: 600,
    // ... model-specific parameters
  },
  configSchema: [
    { key: 'width', label: 'Width', min: 400, max: 1200, step: 100, default: 800 },
    { key: 'height', label: 'Height', min: 300, max: 900, step: 100, default: 600 },
    // ... one ConfigField per user-adjustable parameter
    // Include `info` for non-obvious parameters:
    // { key: 'param', label: 'Param', min: 0, max: 100, step: 1, default: 50, info: 'Explanation' },
  ],
  agentTypes: [
    { type: 'predator', color: '#ff2daa', radius: 4, shape: 'circle' },
    { type: 'prey', color: '#affff7', radius: 3, shape: 'circle' },
  ],
  toggles: [
    // Optional boolean toggles for visual features
    // { key: 'showEnergy', label: 'Show Energy', default: false },
  ],
  createWorld: (config: Record<string, number>) => new MyWorld(config),
};

registerModel(myModelDef);
```

### 3. Implement the world (`world.ts`)

Extend `BaseWorld` and implement the three abstract methods:

```typescript
import { BaseWorld } from '../../framework/base-world.js';
import type { Agent } from '../../framework/types.js';

export class MyWorld extends BaseWorld {
  setup(): void {
    this.agents = [];
    this.tick = 0;
    this.populationHistory = [];
    // Spawn initial agents using factory functions from agent.ts
    // Initialize extraState if needed
  }

  step(): void {
    // 1. Move agents (use behavior functions from behaviors.ts)
    // 2. Agent interactions (eating, catching, etc.)
    // 3. Energy checks (mark dead agents)
    // 4. Reproduction
    // 5. Environment updates (regrowth, decay, etc.)
    // 6. MUST call this.recordPopulation() at end of step
    this.recordPopulation();
  }

  getPopulationCounts(): Record<string, number> {
    // Return counts of each alive agent type
    // Keys should match what the chart and stats overlay expect
    return {
      predators: this.agents.filter(a => a.type === 'predator' && a.alive).length,
      prey: this.agents.filter(a => a.type === 'prey' && a.alive).length,
    };
  }
}
```

Key rules:
- Call `this.recordPopulation()` at the **end** of every `step()`
- All state lives on `this` — no module-level mutable variables
- Use `this.config['paramName']` with `?? defaultValue` fallbacks
- Behaviors are pure functions — import them, do not inline complex logic

### 4. Create agent factories (`agent.ts`)

```typescript
import type { Agent } from '../../framework/types.js';

let nextId = 0;

export function resetIdCounter(): void {
  nextId = 0;
}

export function createPredator(config: Record<string, number>): Agent {
  const w = config['width'] ?? 800;
  const h = config['height'] ?? 600;
  return {
    id: nextId++,
    type: 'predator',
    x: Math.random() * w,
    y: Math.random() * h,
    vx: 0, vy: 0,
    radius: 4,
    speed: config['predatorSpeed'] ?? 2.0,
    energy: (config['predatorGainFromFood'] ?? 20) * 2,
    color: '#ff2daa',
    alive: true,
    meta: {},
  };
}
```

### 5. Write behavior functions (`behaviors.ts`)

All behaviors must be **pure functions** — no side effects, no DOM, no global state:

```typescript
import type { Agent } from '../../framework/types.js';

// Pure: takes input, returns new velocity — does NOT mutate agent
export function chaseBehavior(
  predator: Agent,
  targets: readonly Agent[],
  config: Record<string, number>,
): { vx: number; vy: number } {
  // ...
}
```

Use `readonly` arrays for parameters that should not be mutated. Import vec2 utilities from `../../utils/vec2.js`.

### 6. Register in the barrel import

Add your model to `sim/src/models/index.ts`:

```typescript
import './wolf-sheep/definition.js';
import './<name>/definition.js';  // ← add this line
```

This triggers `registerModel()` when the app loads.

### 7. Write tests

Every model needs at minimum:

**`behaviors.test.ts`** — Unit tests for each pure behavior function:
```typescript
it('chase moves toward nearest target', () => { ... });
it('flee moves away from nearest threat', () => { ... });
it('returns random walk when no targets', () => { ... });
```

**`world.test.ts`** — World lifecycle and multi-tick tests:
```typescript
it('setup creates correct number of agents', () => { ... });
it('step advances tick by 1', () => { ... });
it('reset restores initial state', () => { ... });
it('getPopulationCounts returns correct values', () => { ... });
```

**`agent.test.ts`** — Factory function tests:
```typescript
it('creates agent with correct type and config', () => { ... });
it('resets ID counter', () => { ... });
```

### 8. Contract test: 1000-tick survival

Add a stress test in `sim/src/stress.test.ts` (or a colocated file) that verifies the model survives with default config:

```typescript
it('<name> model survives 1000 ticks with default config', () => {
  const world = new MyWorld({ ...myModelDef.defaultConfig });
  world.setup();
  for (let i = 0; i < 1000; i++) {
    world.step();
  }
  expect(world.tick).toBe(1000);

  // No NaN in any alive agent
  for (const a of world.agents.filter(a => a.alive)) {
    expect(Number.isFinite(a.x)).toBe(true);
    expect(Number.isFinite(a.y)).toBe(true);
    expect(Number.isFinite(a.energy)).toBe(true);
  }

  // Population history is complete
  expect(world.populationHistory.length).toBe(1000);
});
```

### 9. Run the full suite

```bash
cd sim
npm run test -- --run        # unit + integration + stress
npx tsc --noEmit             # type checking
npm run test:e2e             # Playwright browser tests
```

All must pass before the model is considered complete.

## Checklist

- [ ] `definition.ts` — ModelDefinition with configSchema, agentTypes, createWorld
- [ ] `world.ts` — extends BaseWorld, implements setup/step/getPopulationCounts
- [ ] `agent.ts` — factory functions for each agent type
- [ ] `behaviors.ts` — pure behavior functions
- [ ] `models/index.ts` — barrel import updated
- [ ] `behaviors.test.ts` — unit tests for each behavior
- [ ] `world.test.ts` — lifecycle + multi-tick tests
- [ ] `agent.test.ts` — factory tests
- [ ] Contract test — 1000-tick survival with NaN checks
- [ ] Full suite passes (Vitest + tsc + Playwright)
- [ ] Architecture diagram updated in `references/architecture.md`
