# ABM Simulator Architecture

Agent-based model (ABM) simulator with a pluggable model architecture. Each model is a self-contained module that registers itself with a shared framework.

## Directory Map

```
src/
  framework/     # Shared engine: types, base world, renderer, controls, registry
  models/        # Individual ABM models (wolf-sheep, _template, future models)
  utils/         # Pure utility functions (vec2 math)
  cli/           # Headless CLI runner for batch experiments
  main.ts        # Browser entry point
```

## Key Interfaces

1. **`ModelDefinition`** (`framework/model-registry.ts`) — Plugin contract. Defines id, config schema, agent types, world factory.
2. **`BaseWorld`** (`framework/base-world.ts`) — Abstract class with shared tick/population/reset logic. Models extend this.
3. **`Agent`** (`framework/types.ts`) — Universal agent shape: position, velocity, energy, type, alive flag.

## How to Add a New Model

1. Create `src/models/<name>/` directory
2. Copy `src/models/_template/` as starting point
3. Implement `ModelDefinition` in `definition.ts`
4. Implement behaviors as pure functions in `behaviors.ts`
5. Extend `BaseWorld` in `world.ts`
6. Import and call `registerModel()` in `src/models/index.ts`

## Rendering

- `framework/canvas-renderer.ts` — Draws agents by type/color from model's `agentTypes`
- `framework/stats-overlay.ts` — Population counts + line chart from `populationHistory`
- `framework/slider-factory.ts` — Auto-generates sliders from `configSchema`
