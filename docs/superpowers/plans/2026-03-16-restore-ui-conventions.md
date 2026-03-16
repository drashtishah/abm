# Restore UI Conventions Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore previously-established UI conventions: title naming ("Simulator" not "ABM Simulator"), structured model descriptions with micro-rules and expected pattern, parameter tooltips for all sliders, core/advanced parameter tiers, remove dead Show Energy toggle, CSS for context-renderer output, hide chart when empty, disable CSV button when no data, and differentiate Setup vs Reset behavior.

**Architecture:** Data changes to `definition.ts` (context string, info fields, tier assignments, remove showEnergy toggle), slider-factory update (core/advanced grouping with collapsible section), HTML/CSS additions in `index.html`, controls.ts update (Setup=rerun setup at tick 0, Reset=restore defaults), main.ts updates (chart visibility, CSV button state), and a reference doc update.

**Tech Stack:** TypeScript, HTML/CSS, Vitest

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `sim/index.html` | Modify | Title text + tooltip, CSS for context-renderer classes, CSS for advanced-params collapse |
| `sim/src/models/wolf-sheep/definition.ts` | Modify | Structured `context` string, `info` on all params, `tier` assignments, remove showEnergy toggle |
| `sim/src/framework/slider-factory.ts` | Modify | Group sliders by tier, render advanced params in collapsible `<details>` |
| `sim/src/framework/slider-factory.test.ts` | Modify | Add test for tier grouping + collapsible advanced section |
| `sim/src/framework/controls.ts` | Modify | Differentiate Setup (rerun at tick 0) vs Reset (restore defaults + rerun) |
| `sim/src/main.ts` | Modify | Chart visibility toggle, CSV button disabled state, pass defaultConfig to controls |
| `.claude/skills/code/references/agent-readable-output.md` | Modify | Update `<h1>` example from "ABM Simulator" to "Simulator" |

---

## Chunk 1: Title, CSS, and Reference Docs

### Task 1: Change Title from "ABM Simulator" to "Simulator"

**Files:**
- Modify: `sim/index.html:399`
- Modify: `sim/index.html:6`
- Modify: `.claude/skills/code/references/agent-readable-output.md:15`

- [ ] **Step 1: Update the `<h1>` text and add title tooltip**

In `sim/index.html`, change line 399:
```html
<!-- FROM -->
<h1>ABM Simulator</h1>

<!-- TO -->
<h1 title="Agent-based models: simple agent rules → emergent patterns">Simulator</h1>
```

- [ ] **Step 2: Update the page `<title>`**

In `sim/index.html`, change line 6:
```html
<!-- FROM -->
<title>Agent-Based Simulator — Wolf Sheep Predation</title>

<!-- TO -->
<title>Simulator</title>
```

- [ ] **Step 3: Update agent-readable-output reference**

In `.claude/skills/code/references/agent-readable-output.md`, change line 15:
```html
<!-- FROM -->
<h1 data-section="TITLE">ABM Simulator</h1>

<!-- TO -->
<h1 data-section="TITLE">Simulator</h1>
```

- [ ] **Step 4: Run tests**

Run: `cd sim && npx vitest run`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add sim/index.html .claude/skills/code/references/agent-readable-output.md
git commit -m "fix: rename title to 'Simulator' with tooltip, matching original mockup"
```

### Task 2: Add CSS for Context-Renderer Output and Advanced Parameters

The `context-renderer.ts` generates HTML with classes `context-heading`, `context-summary`, `rule-wolf`, `rule-sheep`, `rule-grass` — but no CSS exists. Also add styles for the advanced-params collapsible section.

**Files:**
- Modify: `sim/index.html` (add CSS after `.model-context` block, line ~136)

- [ ] **Step 1: Add CSS for context-renderer classes and advanced params**

In `sim/index.html`, after the `.model-context` rule (line ~136), add:

```css
    .model-context .context-heading {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-secondary);
      margin-top: 6px;
    }

    .model-context ul {
      list-style: none;
      padding: 0;
      margin: 4px 0;
    }

    .model-context li {
      padding: 2px 0 2px 12px;
      position: relative;
      font-size: 11px;
    }

    .model-context li::before {
      content: '•';
      position: absolute;
      left: 0;
    }

    .model-context li.rule-wolf::before { color: var(--color-wolf); }
    .model-context li.rule-sheep::before { color: var(--color-sheep); }
    .model-context li.rule-grass::before { color: var(--color-grass); }

    .model-context .context-summary {
      font-size: 10px;
      color: var(--accent-secondary);
      margin-top: 4px;
      font-style: italic;
    }

    .advanced-toggle {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-secondary);
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px 0;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .advanced-toggle:hover,
    .advanced-toggle:focus {
      color: var(--text-primary);
    }

    .advanced-params {
      overflow: hidden;
      max-height: 500px;
      transition: max-height 0.3s ease;
    }

    .advanced-params.collapsed {
      max-height: 0;
    }
```

- [ ] **Step 2: Run tests**

Run: `cd sim && npx vitest run`
Expected: All pass (CSS-only change)

- [ ] **Step 3: Commit**

```bash
git add sim/index.html
git commit -m "fix: add CSS for context-renderer classes and advanced parameter collapse"
```

---

## Chunk 2: Model Definition and Slider Factory

### Task 3: Rewrite Model Description with Structured Micro-Rules

Replace the dense paragraph in `context` with the structured format the context-renderer parses: intro line, bullet micro-rules per agent type, bridge sentence, and expected-pattern summary.

**Files:**
- Modify: `sim/src/models/wolf-sheep/definition.ts:9`

- [ ] **Step 1: Verify context-renderer tests pass (baseline)**

Run: `cd sim && npx vitest run context-renderer`
Expected: All pass

- [ ] **Step 2: Replace the `context` string**

In `sim/src/models/wolf-sheep/definition.ts`, replace the `context` field (line 9):

```typescript
  // FROM:
  context: 'The Lotka-Volterra predator-prey model is one of the foundational models in ecology. It demonstrates how two species populations naturally oscillate — when prey is abundant, predators thrive and grow; as predators increase, prey declines; without prey, predators starve; with fewer predators, prey rebounds. Adding grass as a resource creates a three-level food chain. Sheep boom → wolves thrive → sheep crash → wolves starve → cycle may repeat or populations may eventually go extinct.',

  // TO:
  context: `Classic predator-prey model.

Agent rules:
• Wolves chase nearest sheep. Catch one → gain energy.
• Sheep flee wolves. Eat grass → gain energy.
• All agents lose energy each step. Zero energy → die.
• Enough energy → chance to reproduce.
• Grass regrows after a delay.

These simple rules produce emergent oscillations:

Sheep boom → wolves thrive → sheep crash → wolves starve → repeat.`,
```

- [ ] **Step 3: Run tests**

Run: `cd sim && npx vitest run`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add sim/src/models/wolf-sheep/definition.ts
git commit -m "fix: rewrite model context with structured micro-rules for context-renderer"
```

### Task 4: Add Parameter Tooltips, Tier Assignments, and Remove showEnergy

Three changes to `definition.ts`: add `info` tooltips to all visible params, assign `tier: 'core'` or `tier: 'advanced'` to each, and remove the dead `showEnergy` toggle.

**Core parameters** (what beginners need): initial counts, speeds
**Advanced parameters** (for tuning): energy gains, reproduction, grass mechanics, radii

**Files:**
- Modify: `sim/src/models/wolf-sheep/definition.ts:31-58`

- [ ] **Step 1: Update configSchema with info and tier assignments**

In `sim/src/models/wolf-sheep/definition.ts`, replace the entire `configSchema` array:

```typescript
  configSchema: [
    { key: 'width', label: 'Width', min: 400, max: 1200, step: 100, default: 800, tier: 'hidden' },
    { key: 'height', label: 'Height', min: 300, max: 900, step: 100, default: 600, tier: 'hidden' },
    { key: 'initialWolves', label: 'Initial Wolves', min: 1, max: 200, step: 1, default: 30, info: 'Number of wolves at start', tier: 'core' },
    { key: 'initialSheep', label: 'Initial Sheep', min: 1, max: 200, step: 1, default: 100, info: 'Number of sheep at start', tier: 'core' },
    { key: 'wolfSpeed', label: 'Wolf Speed', min: 0.5, max: 5, step: 0.1, default: 1.8, info: 'How far a wolf moves each step', tier: 'core' },
    { key: 'sheepSpeed', label: 'Sheep Speed', min: 0.5, max: 5, step: 0.1, default: 1.5, info: 'How far a sheep moves each step', tier: 'core' },
    { key: 'wolfGainFromFood', label: 'Wolf Food Gain', min: 1, max: 50, step: 1, default: 20, info: 'Rule: wolf eats sheep → gains this much energy\nHigher → wolves survive longer', tier: 'advanced' },
    { key: 'sheepGainFromFood', label: 'Sheep Food Gain', min: 1, max: 20, step: 1, default: 5, info: 'Rule: sheep eats grass → gains this much energy\nHigher → sheep survive longer', tier: 'advanced' },
    { key: 'moveCost', label: 'Move Cost', min: 0.1, max: 5, step: 0.1, default: 0.5, info: 'Rule: every step costs this much energy\nHigher → agents starve faster', tier: 'advanced' },
    { key: 'wolfReproduceThreshold', label: 'Wolf Repro Threshold', min: 10, max: 100, step: 5, default: 60, info: 'Rule: wolf needs this much energy to reproduce\nHigher → harder to breed', tier: 'advanced' },
    { key: 'sheepReproduceThreshold', label: 'Sheep Repro Threshold', min: 10, max: 100, step: 5, default: 30, info: 'Rule: sheep needs this much energy to reproduce\nHigher → harder to breed', tier: 'advanced' },
    { key: 'wolfReproduceRate', label: 'Wolf Repro Rate', min: 0, max: 0.2, step: 0.01, default: 0.04, info: 'Rule: chance of reproducing each step\nHigher → faster wolf population growth', tier: 'advanced' },
    { key: 'sheepReproduceRate', label: 'Sheep Repro Rate', min: 0, max: 0.2, step: 0.01, default: 0.06, info: 'Rule: chance of reproducing each step\nHigher → faster sheep population growth', tier: 'advanced' },
    { key: 'grassRegrowthTime', label: 'Grass Regrowth', min: 1, max: 100, step: 1, default: 20, info: 'Rule: eaten grass regrows after this many steps\nHigher → slower grass recovery', tier: 'advanced' },
    { key: 'grassGridSize', label: 'Grass Grid Size', min: 10, max: 40, step: 1, default: 20, info: 'Grid resolution (N×N patches)\nHigher → more detailed grass landscape', tier: 'advanced' },
    { key: 'catchRadius', label: 'Catch Radius', min: 5, max: 30, step: 1, default: 8, info: 'Rule: wolf catches sheep within this distance\nHigher → easier to catch', tier: 'advanced' },
    { key: 'fleeRadius', label: 'Flee Radius', min: 10, max: 80, step: 1, default: 50, info: 'Rule: sheep detects wolf within this distance\nHigher → sheep flee earlier', tier: 'advanced' },
    { key: 'seed', label: 'Random Seed', min: 0, max: 99999, step: 1, default: 0, info: 'Seed for reproducible runs. 0 = random each time.', tier: 'advanced' },
  ],
```

- [ ] **Step 2: Remove showEnergy from toggles**

In `sim/src/models/wolf-sheep/definition.ts`, change the `toggles` array:

```typescript
  // FROM:
  toggles: [
    { key: 'showEnergy', label: 'Show Energy', default: false },
    { key: 'showGrass', label: 'Show Grass', default: true },
  ],

  // TO:
  toggles: [
    { key: 'showGrass', label: 'Show Grass', default: true },
  ],
```

- [ ] **Step 3: Run tests**

Run: `cd sim && npx vitest run`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add sim/src/models/wolf-sheep/definition.ts
git commit -m "fix: add tooltips + tier assignments to all params, remove dead showEnergy toggle"
```

### Task 5: Update Slider Factory to Group by Core/Advanced Tiers

The slider factory currently skips `hidden` fields but renders all others in a flat list. Update it to render `core` (and untiered) params first, then `advanced` params in a collapsible section.

**Files:**
- Modify: `sim/src/framework/slider-factory.ts`
- Modify: `sim/src/framework/slider-factory.test.ts`

- [ ] **Step 1: Write failing tests for tier grouping**

In `sim/src/framework/slider-factory.test.ts`, add tests:

```typescript
it('renders advanced params in collapsible section', () => {
  const model: ModelDefinition = {
    id: 'test',
    name: 'Test',
    description: '',
    context: '',
    defaultConfig: { a: 1, b: 2 },
    configSchema: [
      { key: 'a', label: 'Core Param', min: 0, max: 10, step: 1, default: 1, tier: 'core' },
      { key: 'b', label: 'Advanced Param', min: 0, max: 10, step: 1, default: 2, tier: 'advanced' },
    ],
    agentTypes: [],
    createWorld: vi.fn() as unknown as ModelDefinition['createWorld'],
  };
  const container = document.createElement('div');
  const world = { config: { a: 1, b: 2 }, updateConfig: vi.fn() } as unknown as World;
  createSliders(model, world, container);

  // Advanced toggle button exists
  const toggle = container.querySelector('.advanced-toggle');
  expect(toggle).not.toBeNull();
  expect(toggle!.textContent).toContain('Advanced');

  // Advanced params wrapper exists and starts collapsed
  const advParams = container.querySelector('.advanced-params');
  expect(advParams).not.toBeNull();
  expect(advParams!.classList.contains('collapsed')).toBe(true);

  // Core param is NOT inside advanced section
  const coreSlider = container.querySelector('#slider-a');
  expect(coreSlider).not.toBeNull();
  expect(coreSlider!.closest('.advanced-params')).toBeNull();

  // Advanced param IS inside advanced section
  const advSlider = container.querySelector('#slider-b');
  expect(advSlider).not.toBeNull();
  expect(advSlider!.closest('.advanced-params')).not.toBeNull();
});

it('toggle click expands and collapses advanced section', () => {
  const model: ModelDefinition = {
    id: 'test',
    name: 'Test',
    description: '',
    context: '',
    defaultConfig: { a: 1 },
    configSchema: [
      { key: 'a', label: 'Adv', min: 0, max: 10, step: 1, default: 1, tier: 'advanced' },
    ],
    agentTypes: [],
    createWorld: vi.fn() as unknown as ModelDefinition['createWorld'],
  };
  const container = document.createElement('div');
  const world = { config: { a: 1 }, updateConfig: vi.fn() } as unknown as World;
  createSliders(model, world, container);

  const toggle = container.querySelector('.advanced-toggle') as HTMLButtonElement;
  const advParams = container.querySelector('.advanced-params')!;

  expect(advParams.classList.contains('collapsed')).toBe(true);
  toggle.click();
  expect(advParams.classList.contains('collapsed')).toBe(false);
  toggle.click();
  expect(advParams.classList.contains('collapsed')).toBe(true);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd sim && npx vitest run slider-factory`
Expected: FAIL — no `.advanced-toggle` or `.advanced-params` elements exist yet

- [ ] **Step 3: Update slider-factory to group by tier**

In `sim/src/framework/slider-factory.ts`, replace the slider creation loop. The key change: split `configSchema` into core (tier undefined or 'core') and advanced arrays, render core first, then create a collapsible section for advanced.

```typescript
import type { World } from './types.js';
import type { ModelDefinition, ConfigField } from './model-registry.js';

function createSliderRow(
  field: ConfigField,
  world: World,
): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'slider-row';

  const label = document.createElement('label');
  label.textContent = field.label;
  label.htmlFor = `slider-${field.key}`;

  const input = document.createElement('input');
  input.type = 'range';
  input.id = `slider-${field.key}`;
  input.min = String(field.min);
  input.max = String(field.max);
  input.step = String(field.step);
  input.value = String(world.config[field.key] ?? field.default);

  const valueDisplay = document.createElement('span');
  valueDisplay.className = 'slider-value';
  valueDisplay.textContent = input.value;

  input.addEventListener('input', () => {
    valueDisplay.textContent = input.value;
    world.updateConfig({ [field.key]: Number(input.value) });
  });

  if (field.info) {
    const infoWrapper = document.createElement('span');
    infoWrapper.className = 'info-wrapper';

    const icon = document.createElement('span');
    icon.className = 'info-icon';
    icon.textContent = '\u24d8';
    icon.setAttribute('tabindex', '0');
    icon.setAttribute('role', 'button');
    icon.setAttribute('aria-label', `Info about ${field.label}`);

    const tooltip = document.createElement('span');
    tooltip.className = 'info-tooltip';
    tooltip.id = `tooltip-${field.key}`;
    tooltip.setAttribute('role', 'tooltip');
    tooltip.textContent = field.info;

    icon.setAttribute('aria-describedby', tooltip.id);

    icon.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        icon.blur();
      }
    });

    infoWrapper.appendChild(icon);
    infoWrapper.appendChild(tooltip);
    label.appendChild(infoWrapper);

    input.setAttribute('aria-describedby', `tooltip-${field.key}`);
  }

  wrapper.appendChild(label);
  wrapper.appendChild(input);
  wrapper.appendChild(valueDisplay);
  return wrapper;
}

export function createSliders(
  model: ModelDefinition,
  world: World,
  container: HTMLElement
): void {
  container.innerHTML = '';

  const coreFields = model.configSchema.filter(f => f.tier !== 'hidden' && f.tier !== 'advanced');
  const advancedFields = model.configSchema.filter(f => f.tier === 'advanced');

  // Render core sliders directly
  for (const field of coreFields) {
    container.appendChild(createSliderRow(field, world));
  }

  // Render advanced sliders in collapsible section
  if (advancedFields.length > 0) {
    const toggle = document.createElement('button');
    toggle.className = 'advanced-toggle';
    toggle.textContent = '▸ Advanced';
    toggle.setAttribute('aria-expanded', 'false');

    const advWrapper = document.createElement('div');
    advWrapper.className = 'advanced-params collapsed';

    toggle.addEventListener('click', () => {
      const isCollapsed = advWrapper.classList.toggle('collapsed');
      toggle.textContent = isCollapsed ? '▸ Advanced' : '▾ Advanced';
      toggle.setAttribute('aria-expanded', String(!isCollapsed));
    });

    for (const field of advancedFields) {
      advWrapper.appendChild(createSliderRow(field, world));
    }

    container.appendChild(toggle);
    container.appendChild(advWrapper);
  }

  // Toggles
  if (model.toggles) {
    for (const toggle of model.toggles) {
      const wrapper = document.createElement('div');
      wrapper.className = 'toggle-row';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `toggle-${toggle.key}`;
      checkbox.checked = toggle.default;

      const label = document.createElement('label');
      label.textContent = toggle.label;
      label.htmlFor = `toggle-${toggle.key}`;

      checkbox.addEventListener('change', () => {
        world.updateConfig({ [toggle.key]: checkbox.checked ? 1 : 0 });
      });

      wrapper.appendChild(checkbox);
      wrapper.appendChild(label);
      container.appendChild(wrapper);
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd sim && npx vitest run slider-factory`
Expected: All pass (including new tier grouping tests)

- [ ] **Step 5: Run full suite + lint**

Run: `cd sim && npx vitest run && npx tsc --noEmit && npx eslint src/ --max-warnings 0`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add sim/src/framework/slider-factory.ts sim/src/framework/slider-factory.test.ts
git commit -m "feat: group sliders by core/advanced tier with collapsible section"
```

---

## Chunk 3: Chart Visibility, CSV Button State, and Setup vs Reset

### Task 6: Hide Chart Area When No Data

The chart area (population chart) takes up 200px at the bottom even before any simulation has run. It should only appear once there's data to display.

**Files:**
- Modify: `sim/index.html` (CSS for `.chart-area` hidden by default)
- Modify: `sim/src/main.ts` (toggle chart visibility based on populationHistory)

- [ ] **Step 1: Add CSS to hide chart by default**

In `sim/index.html`, update the `.chart-area` rule:

```css
    .chart-area {
      grid-area: chart;
      border-top: 1px solid var(--border);
      padding: 0;
      display: none;
    }

    .chart-area.has-data {
      display: block;
    }
```

Also update the grid template to not reserve 200px for chart when hidden. Change `.app` grid-template-rows:

```css
    .app {
      /* FROM: grid-template-rows: auto 1fr 200px; */
      grid-template-rows: auto 1fr auto;
      /* ... rest stays the same */
    }
```

And add a fixed height when chart has data:

```css
    .chart-area.has-data {
      display: block;
      height: 200px;
    }
```

- [ ] **Step 2: Toggle chart visibility in the animation loop**

In `sim/src/main.ts`, inside the `loop()` function, after the tick display update block, add:

```typescript
  // Show chart area only when there's population data
  const chartArea = document.querySelector('.chart-area');
  if (chartArea) {
    chartArea.classList.toggle('has-data', world.populationHistory.length > 0);
  }
```

Cache the chart-area element at the top of `main.ts` alongside the other element lookups to avoid repeated `querySelector` calls:

```typescript
const chartArea = document.querySelector('.chart-area') as HTMLElement;
```

Then in the loop use:
```typescript
  chartArea.classList.toggle('has-data', world.populationHistory.length > 0);
```

And in `loadModel()`, ensure chart is hidden on model switch:
```typescript
  chartArea.classList.remove('has-data');
```

- [ ] **Step 3: Run tests**

Run: `cd sim && npx vitest run`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add sim/index.html sim/src/main.ts
git commit -m "fix: hide chart area until simulation produces data"
```

### Task 7: Disable CSV Button When No Data

The Download CSV button should be visually greyed out and non-functional when there's no population data to export.

**Files:**
- Modify: `sim/index.html` (CSS for disabled button)
- Modify: `sim/src/main.ts` (toggle disabled state)

- [ ] **Step 1: Add disabled style for download button**

In `sim/index.html`, add CSS:

```css
    button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      pointer-events: none;
    }
```

Check if a `button:disabled` rule already exists — if so, just verify it has appropriate styling.

- [ ] **Step 2: Start with button disabled**

In `sim/index.html`, change the download button:

```html
<!-- FROM -->
<button id="btn-download">Download CSV</button>

<!-- TO -->
<button id="btn-download" disabled>Download CSV</button>
```

- [ ] **Step 3: Toggle disabled state in animation loop**

In `sim/src/main.ts`, in the `loop()` function, after the chart visibility toggle:

```typescript
  // Enable CSV download only when there's data
  if (world.populationHistory.length > 0) {
    downloadBtn.removeAttribute('disabled');
  } else {
    downloadBtn.setAttribute('disabled', '');
  }
```

Also in `loadModel()`, re-disable it:
```typescript
  downloadBtn.setAttribute('disabled', '');
```

- [ ] **Step 4: Run tests**

Run: `cd sim && npx vitest run`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add sim/index.html sim/src/main.ts
git commit -m "fix: disable CSV download button when no simulation data exists"
```

### Task 8: Differentiate Setup vs Reset Behavior

Currently both Setup and Reset call `world.reset()` which does the same thing. The intended behavior:
- **Setup**: Re-initialize at tick 0 with current slider values (keeps user's parameter tweaks)
- **Reset**: Restore all parameters to defaults AND re-initialize at tick 0

**Files:**
- Modify: `sim/src/framework/controls.ts`
- Modify: `sim/src/main.ts` (pass defaultConfig to controls, reset sliders on Reset)

- [ ] **Step 1: Update controls.ts to accept defaultConfig and onReset callback**

In `sim/src/framework/controls.ts`:

```typescript
import type { World } from './types.js';

interface ControlsOptions {
  world: World;
  defaultConfig: Record<string, number>;
  onReset?: () => void;
}

export function setupControls({ world, defaultConfig, onReset }: ControlsOptions): void {
  const setupBtn = document.getElementById('btn-setup');
  const goBtn = document.getElementById('btn-go');
  const stepBtn = document.getElementById('btn-step');
  const resetBtn = document.getElementById('btn-reset');

  if (setupBtn) {
    setupBtn.addEventListener('click', () => {
      // Setup: re-initialize with CURRENT config (user's tweaks preserved)
      world.running = false;
      world.reset();
      if (goBtn) {
        goBtn.textContent = 'Go';
        goBtn.classList.remove('active');
        goBtn.setAttribute('aria-pressed', 'false');
      }
    });
  }

  if (goBtn) {
    goBtn.title = 'Run/stop the simulation continuously';
    goBtn.setAttribute('aria-pressed', 'false');
    goBtn.addEventListener('click', () => {
      world.running = !world.running;
      goBtn.textContent = world.running ? 'Stop' : 'Go';
      goBtn.classList.toggle('active', world.running);
      goBtn.setAttribute('aria-pressed', String(world.running));
    });
  }

  if (stepBtn) {
    stepBtn.addEventListener('click', () => {
      if (!world.running) {
        world.step();
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      // Reset: restore ALL config to defaults, then re-initialize
      world.updateConfig(defaultConfig);
      world.running = false;
      world.reset();
      if (goBtn) {
        goBtn.textContent = 'Go';
        goBtn.classList.remove('active');
        goBtn.setAttribute('aria-pressed', 'false');
      }
      // Callback to rebuild sliders with default values
      if (onReset) onReset();
    });
  }
}
```

- [ ] **Step 2: Update main.ts to pass defaultConfig and onReset**

In `sim/src/main.ts`, change the `setupControls` call in `loadModel()`:

```typescript
  // FROM:
  setupControls(world);

  // TO:
  setupControls({
    world,
    defaultConfig: { ...def.defaultConfig },
    onReset: () => {
      // Rebuild sliders to reflect restored defaults
      createSliders(def, world, sliderContainer);
    },
  });
```

- [ ] **Step 3: Run tests**

Run: `cd sim && npx vitest run`
Expected: All pass

- [ ] **Step 4: Run full suite + lint**

Run: `cd sim && npx vitest run && npx tsc --noEmit && npx eslint src/ --max-warnings 0`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add sim/src/framework/controls.ts sim/src/main.ts
git commit -m "fix: differentiate Setup (rerun with current params) vs Reset (restore defaults)"
```

### Task 9: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `cd sim && npx vitest run && npx tsc --noEmit && npx eslint src/ --max-warnings 0`
Expected: All pass

- [ ] **Step 2: Visual verification**

Start dev server and verify in browser:
1. Title reads "Simulator" with hover tooltip
2. Model description shows bullet-point micro-rules with colored bullets (wolf=pink, sheep=cyan, grass=green)
3. Bridge sentence "These simple rules produce emergent oscillations:" renders as styled summary
4. Expected-pattern summary styled in accent color
5. Only 4 core sliders visible by default (Initial Wolves, Initial Sheep, Wolf Speed, Sheep Speed)
6. "Advanced" toggle button is visible below core sliders
7. Clicking Advanced expands 13 more sliders (food gains, reproduction, grass, radii, seed)
8. Every slider shows an ⓘ info icon with tooltip on hover/focus
9. No "Show Energy" checkbox present
10. "Show Grass" checkbox still present and functional
11. Chart area is hidden on initial load — no empty 200px gap
12. After clicking Setup → Go and running a few ticks, chart appears with data
13. Download CSV button is greyed out on initial load
14. After simulation runs, Download CSV becomes clickable
15. Setup button: change a slider value, click Setup — simulation restarts at tick 0 with the changed value
16. Reset button: change a slider value, click Reset — slider snaps back to default, simulation restarts at tick 0

---

## Chunk 4: Parameter Tuning and Validation

### Task 10: Tune Default Parameters for Sustained Oscillations

The current defaults produce wolf extinction by tick ~160 every time — no oscillations ever emerge. Root causes:
- `wolfReproduceThreshold: 60` is too high (wolves rarely accumulate enough energy)
- `wolfReproduceRate: 0.04` is too low (even when threshold is met, reproduction is rare)
- `wolfGainFromFood: 20` is too low relative to movement costs + catch difficulty
- `initialWolves: 30` is too few (NetLogo uses 50)
- `fleeRadius: 50` makes hunting too hard combined with only slight speed advantage

**NetLogo canonical defaults** (Uri Wilensky, 1997): 50 wolves, 100 sheep, wolf-reproduce 5%, sheep-reproduce 4%, wolf-gain-from-food 20, sheep-gain-from-food 4, grass-regrowth-time ~30. But our continuous-space model with flee/catch mechanics needs different tuning.

**Files:**
- Modify: `sim/src/models/wolf-sheep/definition.ts` (defaultConfig + configSchema defaults)
- Modify: `sim/src/stress.test.ts` (tighten oscillation assertions)

- [ ] **Step 1: Write strict oscillation validation test**

In `sim/src/stress.test.ts`, replace the loose "Lotka-Volterra oscillation emerges" test with a strict one:

```typescript
it('default config produces sustained oscillations (wolves survive 500 ticks)', () => {
  const world = new WolfSheepWorld({ ...wolfSheepDef.defaultConfig, seed: 42 });
  world.setup();

  const wolvesHistory: number[] = [];
  const sheepHistory: number[] = [];

  for (let i = 0; i < 500; i++) {
    world.step();
    const counts = world.getPopulationCounts();
    wolvesHistory.push(counts['wolves'] ?? 0);
    sheepHistory.push(counts['sheep'] ?? 0);
  }

  // Wolves must survive the full 500 ticks
  const lastWolves = wolvesHistory[wolvesHistory.length - 1]!;
  expect(lastWolves).toBeGreaterThan(0);

  // Wolves must have at least 2 direction changes (oscillation, not monotonic decline)
  let wolfDirectionChanges = 0;
  for (let i = 2; i < wolvesHistory.length; i++) {
    const prev = wolvesHistory[i - 1]! - wolvesHistory[i - 2]!;
    const curr = wolvesHistory[i]! - wolvesHistory[i - 1]!;
    if ((prev > 0 && curr < 0) || (prev < 0 && curr > 0)) {
      wolfDirectionChanges++;
    }
  }
  expect(wolfDirectionChanges).toBeGreaterThanOrEqual(2);

  // Sheep must also survive
  const lastSheep = sheepHistory[sheepHistory.length - 1]!;
  expect(lastSheep).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run test to verify it fails with current defaults**

Run: `cd sim && npx vitest run stress`
Expected: FAIL — wolves extinct, zero direction changes

- [ ] **Step 3: Tune defaultConfig for oscillation**

In `sim/src/models/wolf-sheep/definition.ts`, update `defaultConfig`:

```typescript
  defaultConfig: {
    width: 800,
    height: 600,
    initialWolves: 50,           // was 30, NetLogo uses 50
    initialSheep: 100,
    wolfSpeed: 2.0,              // was 1.8, give wolves better chase ability
    sheepSpeed: 1.5,
    wolfGainFromFood: 30,        // was 20, wolves need more energy per kill
    sheepGainFromFood: 4,        // was 5, NetLogo uses 4
    moveCost: 0.5,
    wolfReproduceThreshold: 40,  // was 60, easier to breed
    sheepReproduceThreshold: 30,
    wolfReproduceRate: 0.08,     // was 0.04, NetLogo uses 0.05 but our hunting is harder
    sheepReproduceRate: 0.06,
    grassRegrowthTime: 30,       // was 20, NetLogo uses ~30
    grassGridSize: 20,
    catchRadius: 12,             // was 8, easier catches
    fleeRadius: 40,              // was 50, sheep detect wolves later
    seed: 0,
  },
```

Also update the matching `configSchema` default values to stay in sync.

- [ ] **Step 4: Run oscillation test across multiple seeds**

Run: `cd sim && npx vitest run stress`
Expected: PASS

If it fails on seed 42, try adjusting parameters and re-run. The defaults must produce oscillation on at least 3 different seeds (42, 123, 7) to be robust.

- [ ] **Step 5: Run full suite**

Run: `cd sim && npx vitest run && npx tsc --noEmit && npx eslint src/ --max-warnings 0`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add sim/src/models/wolf-sheep/definition.ts sim/src/stress.test.ts
git commit -m "fix: tune defaults for sustained oscillations, add strict validation test

Wolves were going extinct by tick 160 with old defaults. New defaults
produce sustained predator-prey oscillations matching NetLogo Wolf Sheep
Predation dynamics. Validation test requires wolf survival and direction
changes over 500 ticks."
```

---

## Chunk 5: Responsive Layout — Center and Fill Width

### Task 11: Fix Mobile/Responsive Layout

On narrow screens the sidebar content is left-aligned with no right border, and the controls don't fill the available width. Components should be centered with consistent edge padding, and controls should span the full width.

**Files:**
- Modify: `sim/index.html` (CSS media queries and base layout)

- [ ] **Step 1: Fix mobile layout CSS**

In `sim/index.html`, update the `@media (max-width: 768px)` block. Key changes:
- App should be single column, full width, centered
- Controls sidebar should span full width with consistent padding
- Buttons should stretch to fill available width
- Canvas should fill the width
- All content should have consistent edge margins

```css
    @media (max-width: 768px) {
      body { overflow: auto; height: auto; }

      .app {
        grid-template-columns: 1fr;
        grid-template-rows: auto auto minmax(300px, 50vh) auto;
        grid-template-areas:
          "header"
          "controls"
          "canvas"
          "chart";
        height: auto;
        max-width: 600px;
        margin: 0 auto;
      }

      .drag-handle { display: none; }

      .controls {
        border-right: none;
        border-bottom: 1px solid var(--border);
        padding: 12px 16px;
      }

      .button-group {
        display: flex;
        gap: 6px;
        width: 100%;
      }

      .button-group button {
        flex: 1;
      }

      .canvas-area {
        min-height: 300px;
      }

      #sim-canvas {
        width: 100%;
        aspect-ratio: 4/3;
      }
    }
```

- [ ] **Step 2: Add tablet breakpoint for intermediate widths**

```css
    @media (min-width: 769px) and (max-width: 1024px) {
      .app {
        grid-template-columns: 260px 4px 1fr;
      }

      .controls {
        padding: 10px 12px;
      }
    }
```

- [ ] **Step 3: Ensure desktop layout centers when viewport is very wide**

Add a max-width to the app container so it doesn't stretch infinitely on ultrawide monitors:

```css
    .app {
      /* existing rules... */
      max-width: 1600px;
      margin: 0 auto;
    }
```

- [ ] **Step 4: Run tests**

Run: `cd sim && npx vitest run`
Expected: All pass (CSS-only)

- [ ] **Step 5: Commit**

```bash
git add sim/index.html
git commit -m "fix: responsive layout — center app, full-width controls on mobile, edge padding"
```

### Task 12: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `cd sim && npx vitest run && npx tsc --noEmit && npx eslint src/ --max-warnings 0`
Expected: All pass

- [ ] **Step 2: Visual verification**

Start dev server and verify in browser:
1. Title reads "Simulator" with hover tooltip
2. Model description shows bullet-point micro-rules with colored bullets
3. Bridge sentence and expected-pattern summary are styled
4. Only 4 core sliders visible by default; Advanced toggle expands the rest
5. Every slider shows an ⓘ info icon with tooltip
6. No "Show Energy" checkbox; "Show Grass" still present
7. Chart area is hidden on initial load — no empty gap
8. After simulation runs, chart appears with data
9. Download CSV button greyed out initially, enabled after simulation runs
10. Setup: keeps user's slider tweaks, restarts at tick 0
11. Reset: snaps all sliders to defaults, restarts at tick 0
12. **Mobile (375px)**: app is centered, controls span full width, buttons stretch evenly, canvas fills width, no left-alignment gap
13. **Tablet (768px)**: sidebar and canvas proportioned correctly
14. **Desktop (1920px)**: app centered with max-width, not stretched to edges

## Verification

| Convention | Source of Truth | What to Check |
|------------|----------------|---------------|
| Title = "Simulator" | `abm-interface-mockup.html:522` | `<h1>` text in `index.html` |
| Title tooltip | `abm-interface-mockup.html:522` | `title` attribute on `<h1>` |
| Structured context with • bullets | `abm-interface-mockup.html:532-546`, `new-model-guide.md:31-37` | `context` field in `definition.ts` |
| Bridge sentence included | `abm-interface-mockup.html:541` | "These simple rules produce emergent oscillations:" in context |
| Context CSS classes styled | `context-renderer.ts` output | CSS for `.context-heading`, `.context-summary`, `.rule-*` in `index.html` |
| Info tooltips on all params | `abm-interface-mockup.html:652-666` | `info` field on every visible `configSchema` entry |
| Core/advanced tier split | `model-registry.ts` type, `review-checks.spec.ts:286-298` | `tier` field set, slider-factory groups by tier |
| showEnergy removed | Dead UI — no renderer reads it | Toggle array has only `showGrass` |
| Chart hidden when empty | User requirement | `.chart-area` hidden until `populationHistory.length > 0` |
| CSV disabled when no data | User requirement | `#btn-download` starts disabled, enabled after simulation runs |
| Setup vs Reset | User requirement | Setup=rerun with current config, Reset=restore defaults+rerun |
| Defaults produce oscillations | NetLogo Wolf Sheep Predation (Wilensky 1997) | Strict test: wolves survive 500 ticks with 2+ direction changes |
| Responsive centering | User screenshot feedback | Mobile: centered, full-width controls; Desktop: max-width with centering |
| Agent-readable ref updated | `.claude/skills/code/references/agent-readable-output.md` | `<h1>` example text |
