# ABM Simulator Architecture

Agent-based model (ABM) simulator with a pluggable model architecture. Each model is a self-contained module that registers itself with a shared framework.

## Directory Map

```
src/
  framework/        # Shared engine: types, base world, renderer, controls, registry
    themes/         # Theme definitions and registry
  models/           # Individual ABM models (wolf-sheep, muscle, _template)
  utils/            # Pure utility functions (vec2 math, PRNG)
  cli/              # Headless CLI runner for batch experiments
  main.ts           # Browser entry point + animation loop
```

## Key Interfaces

1. **`ModelDefinition`** (`framework/model-registry.ts`) — Plugin contract. Defines id, config schema, agent types, population display, world factory.
2. **`BaseWorld`** (`framework/base-world.ts`) — Abstract class with shared tick/population/reset logic. Models extend this.
3. **`Agent`** (`framework/types.ts`) — Universal agent shape: position, velocity, energy, type, alive flag, meta bag.
4. **`ThemeDefinition`** (`framework/themes/types.ts`) — UI colors + agent palette for canvas/chart theming.

## Layer Rule

- **Framework** (`src/framework/`) must NEVER import from `src/models/`.
- **Models** (`src/models/<name>/`) import framework types only.
- **Engine/model code** has zero DOM dependencies (verifiable via `npx tsx src/cli/run.ts`).

---

## Color System

**One source of truth: `populationDisplay` entries, themed via `agentPalette[index]`.**

Every color the user sees flows from `populationDisplay`. Themes remap these via the palette.

### How it works

1. Each model defines `populationDisplay` entries with `key`, `label`, and a **fallback `color`**.
2. Each theme defines an `agentPalette: string[]` — an ordered array of colors.
3. At runtime, `getThemedAgentColor(index, fallback)` returns `agentPalette[index]` if available, else the fallback.
4. The **index** is the entry's position in `populationDisplay` (0, 1, 2, ...).

### Where colors appear

| UI Element | Source | Themed via |
|---|---|---|
| **Output text** (sidebar) | `populationDisplay[i].color` | `getThemedAgentColor(i, color)` |
| **Chart lines** | `populationDisplay[i].color` | `getThemedAgentColor(i, color)` |
| **Chart legend** | same as chart lines | same |
| **Pattern SVG** | hardcoded fallback colors in SVG | `themedPatternSvg()` replaces with themed |
| **Canvas agents** | `agentTypes[i].color` | `getThemedAgentColor(i, color)` + `colorIntensity` |
| **Canvas grid patches** | `patchColorKeys.high/low` → popDisplay entries | `getThemedAgentColor(idx, color)` |
| **Grass grid** (wolf-sheep) | `colorGridHigh` / `colorGridLow` | Theme's `ThemeColors` |

### Critical rule

**All hardcoded colors in `patternSvg` must match a `populationDisplay` entry's fallback color** — `themedPatternSvg()` does string replacement to apply the active theme. If a color in the SVG doesn't match any entry, it won't be themed.

### Agent `colorIntensity`

For models with per-agent visual variation (e.g., muscle fibers that darken as they grow):

1. Behavior function sets `agent.meta['colorIntensity']` to a 0–1 value (0 = dark, 1 = bright).
2. The renderer applies this as a brightness multiplier to the themed agent color via `scaleHexColor()`.
3. This keeps behavior pure (no color/theme knowledge) while allowing per-agent visual variation.

### Canvas grid with two channels

For models needing two independent color channels (e.g., muscle hormone grid):

1. Store `patchRatios: Array<[number, number]>` in `extraState` — paired [channelA, channelB] per cell.
2. Set `patchColorKeys: { high: 'popKey1', low: 'popKey2' }` in the model definition.
3. The renderer looks up themed colors for those population keys and blends additively.
4. Follows NetLogo's `approximate-rgb` pattern: two independent channels, not a single interpolation.

---

## Adding a New Model

### Files to create in `src/models/<name>/`

| File | Purpose |
|---|---|
| `definition.ts` | `ModelDefinition` + `registerModel()` call |
| `world.ts` | `BaseWorld` subclass: `setup()`, `step()`, `getPopulationCounts()` |
| `agent.ts` | Agent factory functions, `resetIdCounter()` |
| `behaviors.ts` | Pure functions — no DOM, no side effects |
| `behaviors.test.ts` | Unit tests for each behavior |
| `world.test.ts` | Lifecycle + multi-tick tests |

### Registration

Add `import './<name>/definition.js';` to `src/models/index.ts`. Contract tests auto-discover via `listModels()`.

### Model description conventions

The `context` string should include:
1. **Opening line** — what the canvas shows (shapes, grid, what elements mean)
2. **Agent rules** — bulleted list with visual cues in parentheses: `Wolves (triangles) wander...`
3. **Emergent pattern** — what the rules produce, described in canvas terms
4. **No color references** — colors change per theme. Use "brighter/dimmer", "lush/eaten", shape names.

### populationDisplay ordering

**Index 0 = the main chart focus.** This gets `agentPalette[0]`, which should be the highest-contrast color in every theme. Design palettes accordingly.

### Tooltip format

```
What this parameter is
High → effect
Low → effect
```

Use plain language. Avoid jargon like "fiber recruitment probability" — say "how many fibers respond".

### Grid-based models (extraState)

If your model uses a grid background (like muscle hormones):

1. Store render data in `extraState` with `patchGridSize: number`.
2. For two-channel grids: `patchRatios: Array<[number, number]>` + `patchColorKeys` in definition.
3. For simple alive/dead grids: use the `grass` pattern (see wolf-sheep).
4. The renderer detects these via type guards — no model-specific code in framework.

---

## Adding a New Theme

### File: `src/framework/themes/<theme-id>.ts`

```typescript
import { registerTheme } from './theme-registry.js';

registerTheme({
  id: 'my-theme',
  name: 'My Theme',
  colors: {
    bgPrimary: '...',      // Main background
    bgSurface: '...',      // Cards/panels
    border: '...',         // Borders and dividers
    accentPrimary: '...',  // Buttons, active states
    accentSecondary: '...', // Secondary highlights
    accentTertiary: '...',  // Tertiary highlights
    textPrimary: '...',    // Main text (WCAG AA on bgPrimary)
    textSecondary: '...',  // Secondary text (3:1+ on bgPrimary)
    colorGridHigh: '...',  // Grid cell "active" (alive grass, anabolic)
    colorGridLow: '...',   // Grid cell "inactive" (eaten grass, catabolic)
    colorDanger: '...',    // Alert/danger indicators
  },
  agentPalette: ['...', '...', '...'],
});
```

### Register in `src/framework/themes/index.ts`

```typescript
import './<theme-id>.js';
```

### agentPalette design rules

The palette is an **ordered array** — index maps to `populationDisplay` position across ALL models:

| Index | Wolf-Sheep | Muscle | Rule |
|---|---|---|---|
| 0 | Wolf color | Muscle Mass line | **Must be highest-contrast on bgPrimary** — this is the main chart focus |
| 1 | Sheep color | Avg Anabolic line + grid high channel | Should be clearly distinct from [0] |
| 2 | Grass color | Avg Catabolic line + grid low channel | Third distinct color |

### Validation checklist

- [ ] All 11 `ThemeColors` defined (TypeScript enforces)
- [ ] `textPrimary` on `bgPrimary`: WCAG AA contrast (4.5:1+)
- [ ] `agentPalette[0]` is the most visible/contrasting color on `bgPrimary`
- [ ] `agentPalette` has at least 3 entries (covers all current models)
- [ ] `colorGridHigh` and `colorGridLow` are visually distinct on the canvas
- [ ] Light themes: sliders, checkboxes, scrollbars remain visible

---

## Naming Conventions

### Framework-level (model-agnostic)

| Name | Meaning | NOT |
|---|---|---|
| `colorGridHigh` | Grid cell active/alive/dominant state | ~~colorGrass~~ |
| `colorGridLow` | Grid cell inactive/dead/recessive state | ~~colorGrassEaten~~ |
| `agentPalette` | Ordered array of agent/population colors | ~~agentColors~~ |
| `populationDisplay` | What appears in output + chart | ~~agentTypes~~ for chart |
| `patchRatios` | Normalized 0–1 values for grid rendering | ~~patchColors~~ (model shouldn't know colors) |
| `patchColorKeys` | Maps grid channels to populationDisplay keys | — |
| `colorIntensity` | Per-agent brightness multiplier (0–1) | ~~agent.color~~ (theme-unaware) |

### Config keys (camelCase, descriptive)

- `gridSize`, `intensity`, `hoursOfSleep`, `daysBetweenWorkouts`
- NOT: `grid_size`, `hrs`, `daysRest`

### Section labels (UI)

- "Output" (not "Population" — model-agnostic)
- "Parameters", "Speed"

---

## Animation Loop

The animation loop lives in `main.ts`:

1. `loadModel()` creates world, sets up UI, and **starts the loop** via `requestAnimationFrame(loop)`.
2. `loop()` runs continuously: step (if running) → render canvas → render chart → update DOM.
3. On model switch, `loadModel()` cancels the current frame and restarts the loop.
4. `ResizeObserver` on the canvas container feeds `pendingCanvasWidth/Height` — applied at the start of each frame.

**Critical**: `loadModel()` must call `requestAnimationFrame(loop)` at the end — without this, switching models kills the loop permanently.
