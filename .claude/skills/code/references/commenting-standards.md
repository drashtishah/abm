---
title: Commenting Standards
description: Rules and examples for writing useful comments in the ABM simulator codebase.
---

## Principle

Code MUST be self-documenting first: clear names, small functions, explicit types. Comments exist only when the code alone cannot communicate intent. A comment that restates code is noise. A comment that explains a non-obvious decision is invaluable.

## Comment Types

### 1. File Headers

Every file gets a 1-3 line docstring at the top: purpose, key dependencies, critical constraints.

**Good** (from `sim/src/models/wolf-sheep/world.ts`):

```typescript
/**
 * Wolf-Sheep Predation World
 *
 * HARDCODED ASSUMPTIONS (not user-adjustable):
 * - Wolf radius = 4px, sheep radius = 3px (see agent.ts)
 * - Initial energy = gainFromFood x 2 (see agent.ts)
 * - Reproduction produces exactly 1 offspring
 * - Parent energy halved on reproduction (50/50 split, see behaviors.ts)
 * - Offspring spawns within +/-5px of parent
 * - Wolf eats at most 1 sheep per tick
 * - Wolves always chase nearest sheep (greedy, no randomness)
 * - Sheep flee nearest wolf; if none in range, seek nearest grass; else random walk
 * - All grass patches start alive (100% coverage at setup)
 * - Agents die when energy <= 0 (starvation)
 * - Boundary: bounce off walls (not wrap-around like original NetLogo)
 *
 * CONFIGURABLE via sliders (see definition.ts configSchema):
 * - initialWolves, initialSheep, wolfSpeed, sheepSpeed, ...
 */
```

This file header is exemplary because it documents what is hardcoded vs. configurable and where to find each. Future agents can immediately understand the model's constraints without reading every function.

**Bad**:

```typescript
// This file contains the wolf sheep world
```

### 2. Contract Comments

Used at framework-model boundaries to document lifecycle expectations, mutation rules, and ordering guarantees.

**Good** (from `sim/src/framework/base-world.ts` — documenting the contract subclasses must follow):

```typescript
/**
 * Abstract base for all simulation worlds.
 *
 * Subclass contract:
 * - setup(): Initialize this.agents and this.extraState. Called by reset().
 * - step(): Advance one tick. MUST call this.recordPopulation() at the end.
 * - getPopulationCounts(): Return current counts. Called by recordPopulation()
 *   and by the stats overlay every frame.
 *
 * Mutation rules:
 * - All state lives on `this` — no module-level mutable variables
 * - Use this.config['key'] with ?? fallback for every config read
 */
```

**Good** (at the top of `step()` in `world.ts` — documenting phase ordering):

```typescript
// Step execution order matters:
// 1. Move all agents (before interaction checks)
// 2. Sheep eat grass (position-dependent)
// 3. Wolves eat sheep (position-dependent, after movement)
// 4. Energy check (after all energy changes)
// 5. Reproduction (only alive agents)
// 6. Grass regrowth (independent of agents)
// 7. Record population (must be last)
```

### 3. Why Comments

Explain non-obvious decisions, tradeoffs, or constraints that the code cannot express.

**Good** (from `sim/src/models/wolf-sheep/behaviors.ts`):

```typescript
// Hardcoded: halve parent energy (50/50 split), produce exactly 1 offspring
// This matches the NetLogo reference model. Asymmetric splits were tested
// but destabilized oscillations within 200 ticks.
const childEnergy = agent.energy / 2;
agent.energy = childEnergy;
```

**Good** (explaining a non-obvious boundary check):

```typescript
// Clamp offspring position to world bounds — without this, offspring spawned
// near walls can end up outside the world and escape bounceOffWalls checks
offspring.x = Math.max(offspring.radius, Math.min(width - offspring.radius, offspring.x));
```

**Bad**:

```typescript
// Divide energy by 2
const childEnergy = agent.energy / 2;
```

### 4. Invariant Comments

Document rules the type system cannot enforce. These are critical for preventing regressions.

**Good**:

```typescript
// INVARIANT: recordPopulation() must be called exactly once per step(),
// always as the last operation. Calling it earlier gives incorrect counts.
// Calling it twice would double-count the tick.
this.recordPopulation();
```

**Good**:

```typescript
// INVARIANT: wolves eat at most 1 sheep per tick (the `break` below).
// Removing the break causes wolves to wipe out all nearby sheep instantly,
// collapsing the predator-prey cycle.
break; // One sheep per tick per wolf
```

**Good**:

```typescript
// INVARIANT: nextId must be monotonically increasing across setup and
// reproduction. Resetting it only happens in setup() via resetIdCounter().
offspring.id = this.nextId++;
```

### 5. TODO(agent) Markers

For deferred work that is not urgent but should be addressed when a trigger condition is met:

```typescript
// TODO(agent): Extract grass grid into a reusable framework-level Grid class
// when a second model needs grid-based resources.

// TODO(agent): Replace greedy nearest-sheep chase with configurable strategy
// (greedy, random, weighted) when we add the strategy selector UI.

// TODO(agent): Add memory profiling when agent count exceeds 1000 — the
// current filter-based population counting may become a bottleneck.
```

Rules for TODO(agent) markers:
- Always include a **trigger condition** (when should this be addressed?)
- Never use as an excuse to skip work that should be done now
- Review existing TODOs before starting related work — they may already describe what you need

## Anti-Patterns

### No "what" comments

```typescript
// BAD — restates the code
// Loop through all agents
for (const agent of aliveAgents) {

// BAD — restates the condition
// Check if energy is zero
if (agent.energy <= 0) {

// BAD — describes the obvious
// Create a new array
const newAgents: Agent[] = [];
```

### No commented-out code

```typescript
// BAD — dead code that will never be uncommented
// const oldSpeed = agent.speed * 0.8;
// agent.speed = oldSpeed;
```

If code is removed, it lives in git history. Do not leave commented-out code in the source.

### No redundant type narration

```typescript
// BAD — the types already say this
// wolves is an array of Agent objects filtered to type 'wolf'
const wolves = aliveAgents.filter(a => a.type === 'wolf');
```

## Summary

| Type | When to use | Example trigger |
|------|-------------|-----------------|
| File header | Every file | Creating or significantly restructuring a file |
| Contract comment | Framework-model boundary | Adding a new lifecycle hook or mutation rule |
| Why comment | Non-obvious decision | A line that would puzzle a reader in 3 months |
| Invariant comment | Rule types can't enforce | An ordering constraint, a uniqueness guarantee |
| TODO(agent) | Deferred improvement | Work that depends on a future condition |
