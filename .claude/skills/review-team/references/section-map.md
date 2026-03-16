---
title: Section Map
description: Maps data-section attribute values to their relevant source files for prompt generation.
---

## Section-to-File Mapping

Each `data-section` attribute in the playground mockup corresponds to one or more source files. When generating review prompts, these file references tell the `code` skill exactly which files to read and modify.

### Framework Sections (model-agnostic)

These sections reference framework files that don't change per model:

```
TITLE                → sim/index.html
TICK-DISPLAY         → sim/index.html, sim/src/main.ts
MODEL-SELECTOR       → sim/index.html, sim/src/main.ts, sim/src/framework/model-registry.ts
CONTROL-BUTTONS      → sim/index.html, sim/src/framework/controls.ts
SPEED-SLIDER         → sim/index.html, sim/src/main.ts
POPULATION-COUNTS    → sim/src/main.ts, sim/src/framework/stats-overlay.ts
DOWNLOAD-BTN         → sim/src/framework/csv-export.ts
ATTRIBUTION          → sim/index.html
SIMULATION-CANVAS    → sim/src/framework/canvas-renderer.ts
POPULATION-CHART     → sim/src/framework/stats-overlay.ts
AGENT-INSPECTOR      → sim/src/main.ts, sim/index.html
DRAG-HANDLE          → sim/index.html, sim/src/main.ts
```

### Model-Specific Sections

These sections reference files under the active model's directory. The review agent resolves `<active-model>` at runtime based on which models are registered in `sim/src/models/index.ts`.

```
MODEL-DESCRIPTION    → sim/index.html, sim/src/models/<active-model>/definition.ts
PARAMETER-SLIDERS    → sim/src/models/<active-model>/definition.ts, sim/src/framework/slider-factory.ts
SIMULATION-CANVAS    → sim/src/framework/canvas-renderer.ts, sim/src/models/<active-model>/world.ts
MODEL-VALIDATION     → sim/src/models/<active-model>/definition.ts (validate function)
```

### Resolving `<active-model>`

To find all registered models:
1. Read `sim/src/models/index.ts` — lists all imported model modules
2. Each model's `definition.ts` calls `registerModel()` with its `id`
3. Replace `<active-model>` with each model's directory name (e.g., `wolf-sheep`)

When reviewing, iterate through ALL registered models. Each model may have different:
- Parameter schemas (`configSchema`)
- Agent types and colors (`agentTypes`)
- Validation logic (`validate` function)
- World implementation (`world.ts`)

### E2E Test Sections

These sections reference the Playwright E2E test files used in Phase 3 visual testing:

```
E2E-REVIEW-CHECKS    → sim/test/e2e/review-checks.spec.ts
E2E-MODEL-VALIDATION → sim/test/e2e/model-validation.ts
E2E-CONFIG           → sim/playwright.config.ts
```

## Usage in Prompt Generation

The playground mockup's `sectionFiles` JavaScript object is derived from this mapping. When a user annotates a section, the generated prompt includes the relevant files so the implementing agent knows exactly where to look:

```
## PARAMETER-SLIDERS
Files: sim/src/models/<active-model>/definition.ts, sim/src/framework/slider-factory.ts

- [Comment 1 from review]
- [Comment 2 from review]
```

## Adding New Sections

When new UI elements are added to the simulator:
1. Choose a descriptive `SECTION-NAME` in UPPER-KEBAB-CASE
2. Add the `data-section` attribute to the mockup element
3. Add the mapping here with all relevant source files
4. Update the `sectionFiles` object in the playground HTML
