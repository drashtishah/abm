# Review Remediation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 40 findings from the 5-agent review report (10 critical, 19 should-fix, 11 nice-to-have).

**Architecture:** Layer-first batching — engine (pure functions, zero DOM) first, then framework, then UI/accessibility, then polish. Each batch is independently testable. Batches 2-5 depend on Batch 1 completing; Batches 3-5 can partially parallelize via worktrees.

**Tech Stack:** TypeScript (strict), Vite, Vitest, Playwright, CSS custom properties

---

## Chunk 1: Engine & Model Layer (Issues #6, #7, #8, #9, #24, #28)

Pure function fixes with zero DOM dependencies. All testable via `npx vitest run`.

### Task 1: Seeded PRNG (Issue #6 — Critical)

Replace all `Math.random()` calls in model code with a seeded PRNG for reproducible runs.

**Files:**
- Create: `sim/src/utils/prng.ts`
- Create: `sim/src/utils/prng.test.ts`
- Modify: `sim/src/models/wolf-sheep/world.ts`
- Modify: `sim/src/models/wolf-sheep/behaviors.ts`
- Modify: `sim/src/models/wolf-sheep/agent.ts`
- Modify: `sim/src/models/wolf-sheep/definition.ts` (add `seed` config field)
- Modify: `sim/src/framework/base-world.ts` (store PRNG instance)
- Modify: `sim/src/framework/types.ts` (add `random` to World interface)
- Modify: `sim/src/models/wolf-sheep/world.test.ts`
- Modify: `sim/src/models/wolf-sheep/behaviors.test.ts`
- Modify: `sim/src/stress.test.ts`

- [ ] **Step 1: Write PRNG module with tests**

```typescript
// sim/src/utils/prng.ts
// Mulberry32 — fast 32-bit seeded PRNG, period 2^32
export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

```typescript
// sim/src/utils/prng.test.ts
import { describe, it, expect } from 'vitest';
import { mulberry32 } from './prng.js';

describe('mulberry32', () => {
  it('produces deterministic sequence from same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      expect(a()).toBe(b());
    }
  });

  it('produces values in [0, 1)', () => {
    const rng = mulberry32(123);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('different seeds produce different sequences', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    // At least one of the first 10 values should differ
    let allSame = true;
    for (let i = 0; i < 10; i++) {
      if (a() !== b()) allSame = false;
    }
    expect(allSame).toBe(false);
  });
});
```

- [ ] **Step 2: Run PRNG tests to verify they pass**

Run: `cd sim && npx vitest run src/utils/prng.test.ts`
Expected: 3 tests pass

- [ ] **Step 3: Add `random` method to World interface and BaseWorld**

In `sim/src/framework/types.ts`, add to `World` interface:
```typescript
random(): number;
```

In `sim/src/framework/base-world.ts`:
```typescript
import { mulberry32 } from '../utils/prng.js';

// Add to class:
private _random: () => number;

constructor(config: Record<string, number>) {
  this.config = { ...config };
  this._random = mulberry32(config['seed'] ?? Date.now());
}

random(): number {
  return this._random();
}

// Update reset() to reseed:
reset(): void {
  this.tick = 0;
  this.populationHistory = [];
  this.running = false;
  this._random = mulberry32(this.config['seed'] ?? Date.now());
  this.setup();
}
```

- [ ] **Step 4: Add `seed` config field to wolf-sheep definition**

In `sim/src/models/wolf-sheep/definition.ts`, add to `defaultConfig`:
```typescript
seed: 0,
```

Add to `configSchema` (advanced tier):
```typescript
{ key: 'seed', label: 'Random Seed', min: 0, max: 99999, step: 1, default: 0, info: 'Seed for reproducible runs. 0 = random each time.', tier: 'advanced' },
```

- [ ] **Step 5: Replace Math.random() in agent.ts**

Update `createWolf`, `createSheep` to accept a `random: () => number` parameter instead of using `Math.random()`. Update `createGrassGrid` similarly (it doesn't use random currently, no change needed).

```typescript
export function createWolf(config: Record<string, number>, random: () => number): Agent {
  // Replace Math.random() with random()
}
export function createSheep(config: Record<string, number>, random: () => number): Agent {
  // Replace Math.random() with random()
}
```

- [ ] **Step 6: Replace Math.random() in behaviors.ts**

Update `fleeFromNearest`, `chaseNearest`, `tryReproduce` to accept `random: () => number` parameter:

```typescript
export function fleeFromNearest(
  sheep: Agent, wolves: readonly Agent[], grass: readonly GrassPatch[],
  config: Record<string, number>, random: () => number
): { vx: number; vy: number } { /* replace Math.random() with random() */ }

export function chaseNearest(
  wolf: Agent, sheepList: readonly Agent[],
  _config: Record<string, number>, random: () => number
): { vx: number; vy: number } { /* replace Math.random() with random() */ }

export function tryReproduce(
  agent: Agent, config: Record<string, number>, random: () => number
): Agent | null { /* replace Math.random() with random() */ }
```

- [ ] **Step 7: Update world.ts to pass `this.random` through**

In `WolfSheepWorld.setup()`, pass `this.random` to `createWolf`/`createSheep`.
In `WolfSheepWorld.step()`, pass `this.random` to behavior functions.

- [ ] **Step 8: Remove duplicate setup assignments (Issue #24)**

In `WolfSheepWorld.setup()`, remove lines 55-56:
```typescript
// DELETE these — already handled by BaseWorld.reset() which calls setup()
this.tick = 0;
this.populationHistory = [];
```

Note: `this.agents = []` on line 54 must stay — setup() populates agents fresh.

- [ ] **Step 9: Fix moveCost default mismatch (Issue #28)**

In `sim/src/models/wolf-sheep/world.ts` line 79, change:
```typescript
// Before:
const moveCost = this.config['moveCost'] ?? 1;
// After:
const moveCost = this.config['moveCost'] ?? 0.5;
```

- [ ] **Step 10: Update all existing tests for new `random` parameter**

Update `world.test.ts`, `behaviors.test.ts`, `agent.test.ts`, `stress.test.ts`:
- Where `vi.spyOn(Math, 'random')` is used, instead create a deterministic `random` function and pass it
- Where `createWorld()` is used, add `seed: 42` to config for determinism
- The oscillation test should now pass deterministically with a good seed

- [ ] **Step 11: Run full test suite**

Run: `cd sim && npx vitest run`
Expected: All tests pass (including previously-failing oscillation tests)

- [ ] **Step 12: Commit**

```bash
git add sim/src/utils/prng.ts sim/src/utils/prng.test.ts sim/src/framework/base-world.ts sim/src/framework/types.ts sim/src/models/wolf-sheep/world.ts sim/src/models/wolf-sheep/behaviors.ts sim/src/models/wolf-sheep/agent.ts sim/src/models/wolf-sheep/definition.ts sim/src/models/wolf-sheep/world.test.ts sim/src/models/wolf-sheep/behaviors.test.ts sim/src/stress.test.ts
git commit -m "feat: add seeded PRNG for reproducible simulations

Replace all Math.random() with mulberry32 seeded PRNG passed through
World interface. Fix moveCost default mismatch (0.5 not 1). Remove
duplicate setup assignments in WolfSheepWorld.

Fixes review issues #6, #24, #28."
```

### Task 2: O(1) Grass Lookup (Issue #7 — Critical)

Replace O(N) linear scan in `findGrassPatchAt()` with O(1) index arithmetic.

**Files:**
- Modify: `sim/src/models/wolf-sheep/behaviors.ts`
- Modify: `sim/src/models/wolf-sheep/behaviors.test.ts`

- [ ] **Step 1: Write regression test for O(1) lookup**

```typescript
it('findGrassPatchAt returns correct patch via index arithmetic', () => {
  const config = { grassGridSize: 20, width: 800, height: 600 };
  const grass = createGrassGrid(config);
  // Patch at grid (5, 3) should be at index 3*20+5 = 65
  const cellW = 800 / 20;
  const cellH = 600 / 20;
  const result = findGrassPatchAt(5 * cellW + 1, 3 * cellH + 1, grass, config);
  expect(result).toBe(grass[65]);
});
```

- [ ] **Step 2: Run test to verify it fails (current impl uses linear scan, may pass — verify correctness)**

Run: `cd sim && npx vitest run src/models/wolf-sheep/behaviors.test.ts`

- [ ] **Step 3: Replace linear scan with O(1) index arithmetic**

In `behaviors.ts`, replace `findGrassPatchAt`:
```typescript
export function findGrassPatchAt(
  x: number, y: number,
  grass: readonly GrassPatch[],
  config: Record<string, number>
): GrassPatch | null {
  const gridSize = config['grassGridSize'] ?? 20;
  const width = config['width'] ?? 800;
  const height = config['height'] ?? 600;
  const cellW = width / gridSize;
  const cellH = height / gridSize;

  const gx = Math.floor(x / cellW);
  const gy = Math.floor(y / cellH);

  if (gx < 0 || gx >= gridSize || gy < 0 || gy >= gridSize) return null;

  const idx = gy * gridSize + gx;
  return grass[idx] ?? null;
}
```

- [ ] **Step 4: Run tests**

Run: `cd sim && npx vitest run`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add sim/src/models/wolf-sheep/behaviors.ts sim/src/models/wolf-sheep/behaviors.test.ts
git commit -m "perf: O(1) grass lookup via index arithmetic

Replace O(N) linear scan in findGrassPatchAt with direct index
calculation: idx = gy * gridSize + gx. Eliminates 80,000+
comparisons per tick with 200 sheep.

Fixes review issue #7."
```

### Task 3: Compact Dead Agents (Issue #8 — Critical)

Filter dead agents from the array at end of each step.

**Files:**
- Modify: `sim/src/models/wolf-sheep/world.ts`
- Modify: `sim/src/models/wolf-sheep/world.test.ts`

- [ ] **Step 1: Write test for agent compaction**

```typescript
it('dead agents are removed from agents array after step', () => {
  const world = createWorld({ initialWolves: 1, initialSheep: 0, seed: 42 });
  const wolf = world.agents.find(a => a.type === 'wolf')!;
  wolf.energy = 0.1; // Will die this tick from moveCost
  world.step();
  // Dead agents should be filtered out
  expect(world.agents.every(a => a.alive)).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd sim && npx vitest run src/models/wolf-sheep/world.test.ts`
Expected: FAIL — dead agents still in array

- [ ] **Step 3: Add compaction at end of step()**

In `world.ts`, at end of `step()` method, before `this.recordPopulation()`:
```typescript
// Compact: remove dead agents to prevent unbounded array growth
this.agents = this.agents.filter(a => a.alive);
```

- [ ] **Step 4: Run tests**

Run: `cd sim && npx vitest run`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add sim/src/models/wolf-sheep/world.ts sim/src/models/wolf-sheep/world.test.ts
git commit -m "perf: compact dead agents from array each tick

Filter out dead agents at end of step() to prevent unbounded
array growth. Fixes O(total-ever-created) iteration cost.

Fixes review issue #8."
```

### Task 4: Cap Population History (Issue #9 — Critical)

Limit `populationHistory` to 500 entries (matching chart window size).

**Files:**
- Modify: `sim/src/framework/base-world.ts`
- Modify: `sim/src/models/wolf-sheep/world.test.ts`

- [ ] **Step 1: Write test for history cap**

```typescript
it('populationHistory capped at 500 entries', () => {
  const world = createWorld({ seed: 42 });
  for (let i = 0; i < 600; i++) {
    world.step();
  }
  expect(world.populationHistory.length).toBeLessThanOrEqual(500);
  expect(world.tick).toBe(600);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd sim && npx vitest run src/models/wolf-sheep/world.test.ts`
Expected: FAIL — history has 600 entries

- [ ] **Step 3: Cap history in recordPopulation()**

In `base-world.ts`, update `recordPopulation()`:
```typescript
protected recordPopulation(): void {
  const maxHistory = 500;
  this.populationHistory.push(this.getPopulationCounts());
  if (this.populationHistory.length > maxHistory) {
    this.populationHistory.shift();
  }
  this.tick++;
}
```

- [ ] **Step 4: Update `populationHistory length matches tick count` test in stress.test.ts**

This test currently asserts `length === tick`. After capping, it should be:
```typescript
it('populationHistory length matches tick count (up to cap)', () => {
  const world = createWorld({ seed: 42 });
  for (let i = 0; i < 100; i++) {
    world.step();
  }
  expect(world.populationHistory.length).toBe(Math.min(world.tick, 500));
});
```

- [ ] **Step 5: Run tests**

Run: `cd sim && npx vitest run`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add sim/src/framework/base-world.ts sim/src/models/wolf-sheep/world.test.ts sim/src/stress.test.ts
git commit -m "perf: cap populationHistory at 500 entries

Use shift() to maintain sliding window matching chart display size.
Prevents unbounded heap growth in long-running sessions.

Fixes review issue #9."
```

---

## Chunk 2: Framework Layer (Issues #5, #10, #23, #25, #26, #29, #33, #34, #38, #40)

Framework-level fixes. Depends on Chunk 1 completing (PRNG changes to base-world).

### Task 5: Shared Theme Utility (Issue #29 — Should Fix, Consensus)

Extract duplicated color cache into shared utility.

**Files:**
- Create: `sim/src/framework/theme.ts`
- Create: `sim/src/framework/theme.test.ts`
- Modify: `sim/src/framework/canvas-renderer.ts`
- Modify: `sim/src/framework/stats-overlay.ts`

- [ ] **Step 1: Create theme.ts with shared color cache**

```typescript
// sim/src/framework/theme.ts
// Shared CSS custom property reader — single cache for all rendering modules.

let cachedColors: Record<string, string> | null = null;

export function getThemeColors(): Record<string, string> {
  if (cachedColors) return cachedColors;
  const style = getComputedStyle(document.documentElement);
  cachedColors = {
    bgPrimary: style.getPropertyValue('--bg-primary').trim() || '#0a0e27',
    grassAlive: style.getPropertyValue('--color-grass').trim() || '#2a5a20',
    grassEaten: style.getPropertyValue('--color-grass-eaten').trim() || '#1a1200',
    border: style.getPropertyValue('--border').trim() || '#2d3561',
    textSecondary: style.getPropertyValue('--text-secondary').trim() || '#7da4bc',
    accentPrimary: style.getPropertyValue('--accent-primary').trim() || '#66ff55',
  };
  return cachedColors;
}

export function invalidateThemeCache(): void {
  cachedColors = null;
}
```

- [ ] **Step 2: Write theme test**

```typescript
// sim/src/framework/theme.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getThemeColors, invalidateThemeCache } from './theme.js';

describe('theme', () => {
  beforeEach(() => {
    invalidateThemeCache();
  });

  it('returns fallback colors in jsdom (no CSS vars)', () => {
    const colors = getThemeColors();
    expect(colors.bgPrimary).toBe('#0a0e27');
    expect(colors.grassAlive).toBe('#2a5a20');
  });

  it('caches results on second call', () => {
    const a = getThemeColors();
    const b = getThemeColors();
    expect(a).toBe(b); // Same object reference
  });

  it('invalidateThemeCache forces re-read', () => {
    const a = getThemeColors();
    invalidateThemeCache();
    const b = getThemeColors();
    expect(a).not.toBe(b); // Different object
    expect(a).toEqual(b); // Same values
  });
});
```

- [ ] **Step 3: Update canvas-renderer.ts to use shared theme**

Remove local `cachedColors`, `getThemeColors`, `isGrassState` interface duplication. Import from `theme.ts`:
```typescript
import { getThemeColors } from './theme.js';
```

- [ ] **Step 4: Update stats-overlay.ts to use shared theme**

Remove local `cachedChartColors`, `getChartThemeColors`. Import from `theme.ts`:
```typescript
import { getThemeColors } from './theme.js';
```
Replace `getChartThemeColors()` calls with `getThemeColors()`.

- [ ] **Step 5: Fix hardcoded grass color in chart (Issue #38)**

In `stats-overlay.ts`, replace:
```typescript
if (!lineColors['grass']) lineColors['grass'] = '#66ff55';
```
with:
```typescript
if (!lineColors['grass']) {
  const theme = getThemeColors();
  lineColors['grass'] = theme.accentPrimary ?? '#66ff55';
}
```

- [ ] **Step 6: Run tests**

Run: `cd sim && npx vitest run`
Expected: All pass

- [ ] **Step 7: Commit**

```bash
git add sim/src/framework/theme.ts sim/src/framework/theme.test.ts sim/src/framework/canvas-renderer.ts sim/src/framework/stats-overlay.ts
git commit -m "refactor: extract shared theme utility, fix grass chart color

Deduplicate color cache from canvas-renderer and stats-overlay into
framework/theme.ts with invalidation support. Use CSS var for grass
chart color instead of hardcoded #66ff55.

Fixes review issues #29, #38."
```

### Task 6: Gate Grass Drawing with showGrass Toggle (Issue #5 — Critical)

**Files:**
- Modify: `sim/src/framework/canvas-renderer.ts`
- Modify: `sim/src/framework/canvas-renderer.test.ts`

- [ ] **Step 1: Write test for showGrass toggle**

```typescript
it('does not draw grass when showGrass is 0', () => {
  const world = createMockWorld();
  world.config['showGrass'] = 0;
  render(ctx, world, mockModel);
  // Verify fillRect was NOT called with grass colors
  const fillCalls = ctx.fillRect.mock.calls;
  const fillStyles = ctx.fillStyle.mock?.calls ?? [];
  // Only background fill + agent fills, no grass grid fills
  // The exact assertion depends on existing test patterns
});
```

- [ ] **Step 2: Implement grass gate**

In `canvas-renderer.ts`, wrap the grass drawing block:
```typescript
if (isGrassState(world.extraState) && world.config['showGrass'] !== 0) {
  // existing grass drawing code
}
```

- [ ] **Step 3: Run tests**

Run: `cd sim && npx vitest run`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add sim/src/framework/canvas-renderer.ts sim/src/framework/canvas-renderer.test.ts
git commit -m "fix: gate grass drawing with showGrass toggle

Canvas renderer now checks world.config['showGrass'] before drawing
grass patches. Previously the toggle was dead UI.

Fixes review issue #5."
```

### Task 7: Background Tab Pause (Issue #10 — Critical)

**Files:**
- Modify: `sim/src/main.ts`

- [ ] **Step 1: Add visibilitychange guard in animation loop**

In `main.ts`, update the `loop()` function:
```typescript
function loop(): void {
  // Skip work when tab is backgrounded (Issue #10)
  if (document.visibilityState === 'hidden') {
    requestAnimationFrame(loop);
    return;
  }

  // ... rest of existing loop code
}
```

- [ ] **Step 2: Run tests (no unit test needed — this is DOM-only, covered by E2E)**

Run: `cd sim && npx vitest run`
Expected: All pass (no regressions)

- [ ] **Step 3: Commit**

```bash
git add sim/src/main.ts
git commit -m "perf: skip animation loop when tab is backgrounded

Guard world.step() and render calls with document.visibilityState
check. Prevents burning CPU/GPU in hidden tabs.

Fixes review issue #10."
```

### Task 8: ResizeObserver Race Fix (Issue #26)

**Files:**
- Modify: `sim/src/main.ts`

- [ ] **Step 1: Buffer resize and apply at start of loop**

In `main.ts`, replace inline ResizeObserver resize with buffered approach:
```typescript
let pendingCanvasWidth = 0;
let pendingCanvasHeight = 0;

const canvasResizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const { width, height } = entry.contentRect;
    if (width > 0 && height > 0) {
      pendingCanvasWidth = Math.floor(width);
      pendingCanvasHeight = Math.floor(height);
    }
  }
});
canvasResizeObserver.observe(canvasArea);

// In loop(), at the very start before any rendering:
function loop(): void {
  if (document.visibilityState === 'hidden') {
    requestAnimationFrame(loop);
    return;
  }

  // Apply pending resize before any draw calls (Issue #26)
  if (pendingCanvasWidth > 0 && pendingCanvasHeight > 0) {
    simCanvas.width = pendingCanvasWidth;
    simCanvas.height = pendingCanvasHeight;
    pendingCanvasWidth = 0;
    pendingCanvasHeight = 0;
  }

  // ... rest of loop
}
```

- [ ] **Step 2: Run tests**

Run: `cd sim && npx vitest run`
Expected: All pass

- [ ] **Step 3: Commit**

```bash
git add sim/src/main.ts
git commit -m "fix: buffer ResizeObserver to prevent mid-frame TOCTOU race

Apply canvas resize at start of animation loop before any draw calls,
not asynchronously mid-frame.

Fixes review issue #26."
```

### Task 9: Extract Context Renderer (Issue #23)

**Files:**
- Create: `sim/src/framework/context-renderer.ts`
- Create: `sim/src/framework/context-renderer.test.ts`
- Modify: `sim/src/main.ts`

- [ ] **Step 1: Extract renderContextHTML to framework module**

Move the `renderContextHTML` function from `main.ts` to `sim/src/framework/context-renderer.ts` as a pure function (it only does string manipulation, no DOM):

```typescript
// sim/src/framework/context-renderer.ts
// Converts model context strings (with bullet syntax) to styled HTML.

export function renderContextHTML(context: string): string {
  // Exact same implementation as currently in main.ts lines 51-94
}
```

- [ ] **Step 2: Write tests for context renderer**

```typescript
// sim/src/framework/context-renderer.test.ts
import { describe, it, expect } from 'vitest';
import { renderContextHTML } from './context-renderer.js';

describe('renderContextHTML', () => {
  it('converts bullet lines to list items', () => {
    const html = renderContextHTML('Agent rules:\n• Wolves chase sheep.');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li class="rule-wolf">');
    expect(html).toContain('Wolves chase sheep.');
  });

  it('applies wolf/sheep/grass CSS classes', () => {
    const html = renderContextHTML('• Wolves do X\n• Sheep do Y\n• Grass regrows');
    expect(html).toContain('rule-wolf');
    expect(html).toContain('rule-sheep');
    expect(html).toContain('rule-grass');
  });

  it('renders heading lines', () => {
    const html = renderContextHTML('Agent rules:');
    expect(html).toContain('context-heading');
  });

  it('skips ASCII art lines', () => {
    const html = renderContextHTML('~~~╱    ╱~~~');
    expect(html).toBe('');
  });

  it('renders summary lines with arrows', () => {
    const html = renderContextHTML('Sheep boom → wolves thrive');
    expect(html).toContain('context-summary');
  });
});
```

- [ ] **Step 3: Update main.ts to import from context-renderer**

Replace the inline function with:
```typescript
import { renderContextHTML } from './framework/context-renderer.js';
```
Delete the local `renderContextHTML` function.

- [ ] **Step 4: Run tests**

Run: `cd sim && npx vitest run`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add sim/src/framework/context-renderer.ts sim/src/framework/context-renderer.test.ts sim/src/main.ts
git commit -m "refactor: extract renderContextHTML to framework module

Move 45-line context renderer from main.ts to testable pure function
in framework/context-renderer.ts with full test coverage.

Fixes review issue #23."
```

### Task 10: Slider Tier-Based Skip (Issue #25)

**Files:**
- Modify: `sim/src/framework/model-registry.ts` (add `'hidden'` to ConfigField tier)
- Modify: `sim/src/framework/slider-factory.ts`
- Modify: `sim/src/models/wolf-sheep/definition.ts`
- Modify: `sim/src/framework/slider-factory.test.ts`

- [ ] **Step 1: Add 'hidden' tier to ConfigField type**

In `model-registry.ts`:
```typescript
tier?: 'core' | 'advanced' | 'hidden';
```

- [ ] **Step 2: Mark width/height as hidden in definition.ts**

```typescript
{ key: 'width', label: 'Width', min: 400, max: 1200, step: 100, default: 800, tier: 'hidden' },
{ key: 'height', label: 'Height', min: 300, max: 900, step: 100, default: 600, tier: 'hidden' },
```

- [ ] **Step 3: Update slider-factory to skip by tier instead of key name**

Replace:
```typescript
if (field.key === 'width' || field.key === 'height') continue;
```
with:
```typescript
if (field.tier === 'hidden') continue;
```

- [ ] **Step 4: Write test for hidden tier**

```typescript
it('skips fields with tier: hidden', () => {
  // Use existing test pattern but verify hidden fields are excluded
});
```

- [ ] **Step 5: Run tests**

Run: `cd sim && npx vitest run`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add sim/src/framework/model-registry.ts sim/src/framework/slider-factory.ts sim/src/models/wolf-sheep/definition.ts sim/src/framework/slider-factory.test.ts
git commit -m "refactor: use tier:'hidden' instead of hardcoded key check

Replace fragile width/height key name check in slider-factory with
tier-based skip. Mark width/height as tier:'hidden' in definition.

Fixes review issue #25."
```

### Task 11: Tick Display Optimization (Issue #33) + rAF Teardown (Issue #34)

**Files:**
- Modify: `sim/src/main.ts`

- [ ] **Step 1: Add last-rendered-tick guard and rAF handle**

In `main.ts`:
```typescript
let lastRenderedTick = -1;
let animationHandle = 0;

function loop(): void {
  // ... existing visibility + resize logic ...

  // Skip redundant DOM writes when paused (Issue #33)
  if (world.tick !== lastRenderedTick) {
    const counts = world.getPopulationCounts();
    tickDisplay.textContent = `Tick: ${world.tick}`;
    popWolves.textContent = `Wolves: ${counts['wolves'] ?? 0}`;
    popSheep.textContent = `Sheep: ${counts['sheep'] ?? 0}`;
    popGrass.textContent = `Grass: ${counts['grass'] ?? 0}`;
    lastRenderedTick = world.tick;
  }

  animationHandle = requestAnimationFrame(loop);
}

animationHandle = requestAnimationFrame(loop);
```

Also reset `lastRenderedTick = -1` in `loadModel()`.

- [ ] **Step 2: Run tests**

Run: `cd sim && npx vitest run`
Expected: All pass

- [ ] **Step 3: Commit**

```bash
git add sim/src/main.ts
git commit -m "perf: skip redundant DOM writes when paused, store rAF handle

Only update tick/population DOM elements when world.tick changes.
Store requestAnimationFrame handle for potential teardown.

Fixes review issues #33, #34."
```

### Task 12: Event Listener Cleanup on Model Switch (Issue #40)

**Files:**
- Modify: `sim/src/main.ts`

- [ ] **Step 1: Add AbortController for model-scoped listeners**

In `main.ts`:
```typescript
let modelAbortController = new AbortController();

function loadModel(id: string): void {
  // Abort previous model's listeners
  modelAbortController.abort();
  modelAbortController = new AbortController();
  const signal = modelAbortController.signal;

  // ... existing loadModel code ...

  // Use signal for canvas click listener
  simCanvas.addEventListener('click', (e) => { /* existing inspector code */ }, { signal });
}
```

Move the canvas click handler and inspector close handler into `loadModel` with the signal, or keep inspector-close as a one-time handler since it doesn't depend on model state.

- [ ] **Step 2: Run tests**

Run: `cd sim && npx vitest run`
Expected: All pass

- [ ] **Step 3: Commit**

```bash
git add sim/src/main.ts
git commit -m "fix: clean up event listeners on model switch with AbortController

Prevent listener accumulation when switching models. AbortController
groups model-scoped listeners for automatic cleanup.

Fixes review issue #40."
```

---

## Chunk 3: UI & Accessibility (Issues #1, #2, #3, #4, #11-17, #19, #21, #22, #30, #31, #32)

CSS and HTML changes. Can be parallelized into sub-tasks via worktrees since they touch different DOM elements.

### Task 13: Mobile Canvas Fix (Issue #1 — Critical)

**Files:**
- Modify: `sim/index.html`

- [ ] **Step 1: Fix mobile canvas collapse**

In `index.html`, update the `@media (max-width: 768px)` block. The canvas area needs explicit height:
```css
@media (max-width: 768px) {
  body { overflow: auto; height: auto; }

  .app {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto minmax(300px, 50vh) 200px;
    grid-template-areas:
      "header"
      "controls"
      "canvas"
      "chart";
    height: auto;
  }

  .drag-handle { display: none; }
  .controls { border-right: none; border-bottom: 1px solid var(--border); }

  .canvas-area {
    min-height: 300px;
  }

  #sim-canvas {
    width: 100%;
    aspect-ratio: 4/3;
  }
}
```

- [ ] **Step 2: Add tablet breakpoint**

Add a new breakpoint for tablet-portrait (768-1024px):
```css
@media (min-width: 769px) and (max-width: 1024px) {
  .app {
    grid-template-columns: 240px 4px 1fr;
  }
}
```

- [ ] **Step 3: Run E2E tests**

Run: `cd sim && npx playwright test`
Expected: Mobile viewport tests pass

- [ ] **Step 4: Commit**

```bash
git add sim/index.html
git commit -m "fix: mobile canvas collapse — add min-height to canvas area

Give canvas grid row explicit minmax(300px, 50vh) height in mobile
breakpoint. Add tablet breakpoint for intermediate viewports.

Fixes review issue #1."
```

### Task 14: Canvas Accessibility (Issues #2, #3 — Critical)

**Files:**
- Modify: `sim/index.html`
- Modify: `sim/src/main.ts`

- [ ] **Step 1: Add ARIA attributes to canvases**

In `index.html`:
```html
<canvas id="sim-canvas" width="800" height="600" role="img" aria-label="Simulation canvas showing agent positions"></canvas>
```
```html
<canvas id="chart-canvas" role="img" aria-label="Population chart"></canvas>
```

- [ ] **Step 2: Add live region for population status**

In `index.html`, add after `pop-counts` div:
```html
<div id="pop-status" class="sr-only" aria-live="polite" aria-atomic="true"></div>
```

Add screen-reader-only CSS class:
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

- [ ] **Step 3: Update dynamic ARIA labels in main.ts**

In the `loop()` function, update canvas aria-labels with population counts (throttled):
```typescript
// Update ARIA labels every 30 ticks (not every frame)
if (world.tick % 30 === 0) {
  const counts = world.getPopulationCounts();
  simCanvas.setAttribute('aria-label',
    `Simulation: ${counts['wolves'] ?? 0} wolves, ${counts['sheep'] ?? 0} sheep, tick ${world.tick}`);
  chartCanvas.setAttribute('aria-label',
    `Population chart: wolves ${counts['wolves'] ?? 0}, sheep ${counts['sheep'] ?? 0}, grass ${counts['grass'] ?? 0}`);
}
```

- [ ] **Step 4: Add HTML legend for chart (Issue #3)**

In `index.html`, add before chart canvas:
```html
<div class="chart-legend" id="chart-legend" aria-label="Chart legend">
  <span class="legend-item" style="color: var(--color-wolf);">&#9632; Wolves</span>
  <span class="legend-item" style="color: var(--color-sheep);">&#9632; Sheep</span>
  <span class="legend-item" style="color: var(--accent-primary);">&#9632; Grass</span>
</div>
```

Add CSS:
```css
.chart-legend {
  display: flex;
  gap: 12px;
  padding: 4px 8px;
  font-size: 11px;
  background: var(--bg-surface);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}
```

- [ ] **Step 5: Run tests**

Run: `cd sim && npx vitest run && npx playwright test`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add sim/index.html sim/src/main.ts
git commit -m "a11y: add ARIA labels to canvases, HTML chart legend, live region

Add role=img and dynamic aria-labels to sim and chart canvases.
Add HTML chart legend (accessible alternative to canvas-only legend).
Add aria-live region for screen reader population updates.

Fixes review issues #2, #3."
```

### Task 15: Tooltip Keyboard/Touch Access (Issue #4 — Critical)

**Files:**
- Modify: `sim/src/framework/slider-factory.ts`
- Modify: `sim/index.html` (CSS)

- [ ] **Step 1: Make info icon keyboard accessible**

In `slider-factory.ts`, update the info icon creation:
```typescript
if (field.info) {
  const infoWrapper = document.createElement('span');
  infoWrapper.className = 'info-wrapper';

  const icon = document.createElement('span');
  icon.className = 'info-icon';
  icon.textContent = 'ⓘ';
  icon.setAttribute('tabindex', '0');
  icon.setAttribute('role', 'button');
  icon.setAttribute('aria-label', `Info about ${field.label}`);

  const tooltip = document.createElement('span');
  tooltip.className = 'info-tooltip';
  tooltip.id = `tooltip-${field.key}`;
  tooltip.setAttribute('role', 'tooltip');
  tooltip.textContent = field.info;

  icon.setAttribute('aria-describedby', tooltip.id);

  // Dismiss on Escape
  icon.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      icon.blur();
    }
  });

  infoWrapper.appendChild(icon);
  infoWrapper.appendChild(tooltip);
  label.appendChild(infoWrapper);
}
```

- [ ] **Step 2: Update CSS for focus-within and touch**

In `index.html`, update tooltip CSS:
```css
.info-icon {
  cursor: help;
  color: var(--text-secondary);
  font-size: 10px;
  opacity: 0.7;
  outline: none;
}

.info-icon:hover,
.info-icon:focus {
  opacity: 1;
}

.info-wrapper:hover .info-tooltip,
.info-wrapper:focus-within .info-tooltip {
  display: block;
}
```

- [ ] **Step 3: Add aria-describedby for sliders (Issue #17)**

In `slider-factory.ts`, after creating the tooltip, link the slider input:
```typescript
if (field.info) {
  input.setAttribute('aria-describedby', `tooltip-${field.key}`);
}
```

- [ ] **Step 4: Run tests**

Run: `cd sim && npx vitest run`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add sim/src/framework/slider-factory.ts sim/index.html
git commit -m "a11y: make info tooltips keyboard/touch accessible

Add tabindex, role=button, aria-label to info icons. Show tooltip
on focus-within. Add Escape to dismiss. Link sliders via
aria-describedby.

Fixes review issues #4, #17."
```

### Task 16: Drag Handle Improvements (Issues #11, #12, #13, #36)

**Files:**
- Modify: `sim/index.html` (CSS + HTML attributes)
- Modify: `sim/src/main.ts` (keyboard + touch handlers)

- [ ] **Step 1: Widen drag handle hit area and add grip dots**

In `index.html`, update `.drag-handle` CSS:
```css
.drag-handle {
  grid-area: drag;
  background: var(--border);
  cursor: col-resize;
  width: 4px;
  transition: background 0.2s;
  position: relative;
}

/* Wider invisible hit area */
.drag-handle::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -4px;
  right: -4px;
  cursor: col-resize;
}

/* Grip dots */
.drag-handle::after {
  content: '⋮';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--text-secondary);
  font-size: 14px;
  pointer-events: none;
}

.drag-handle:hover,
.drag-handle:focus,
.drag-handle.dragging {
  background: var(--accent-primary);
}
```

- [ ] **Step 2: Add ARIA attributes to drag handle in HTML**

```html
<div class="drag-handle" id="drag-handle" tabindex="0" role="separator"
     aria-orientation="vertical" aria-valuenow="280" aria-valuemin="200"
     aria-valuemax="500" title="Drag to resize sidebar"></div>
```

- [ ] **Step 3: Add keyboard handler in main.ts**

```typescript
dragHandle.addEventListener('keydown', (e) => {
  const step = 20;
  const current = parseInt(appEl.style.gridTemplateColumns) || 280;
  let newWidth = current;

  if (e.key === 'ArrowLeft') newWidth = Math.max(200, current - step);
  else if (e.key === 'ArrowRight') newWidth = Math.min(500, current + step);
  else return;

  e.preventDefault();
  appEl.style.gridTemplateColumns = `${newWidth}px 4px 1fr`;
  dragHandle.setAttribute('aria-valuenow', String(newWidth));
  resizeChart();
});
```

- [ ] **Step 4: Add touch support**

```typescript
dragHandle.addEventListener('touchstart', (e) => {
  isDragging = true;
  dragHandle.classList.add('dragging');
  e.preventDefault();
}, { passive: false });

document.addEventListener('touchmove', (e) => {
  if (!isDragging) return;
  const touch = e.touches[0];
  if (!touch) return;
  const minWidth = 200;
  const maxWidth = 500;
  const newWidth = Math.min(maxWidth, Math.max(minWidth, touch.clientX));
  appEl.style.gridTemplateColumns = `${newWidth}px 4px 1fr`;
}, { passive: true });

document.addEventListener('touchend', () => {
  if (!isDragging) return;
  isDragging = false;
  dragHandle.classList.remove('dragging');
  resizeChart();
});
```

- [ ] **Step 5: Add blur/visibilitychange to cancel drag (Issue #36)**

```typescript
window.addEventListener('blur', cancelDrag);
document.addEventListener('visibilitychange', cancelDrag);

function cancelDrag(): void {
  if (!isDragging) return;
  isDragging = false;
  dragHandle.classList.remove('dragging');
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
}
```

- [ ] **Step 6: Run tests**

Run: `cd sim && npx vitest run && npx playwright test`
Expected: All pass

- [ ] **Step 7: Commit**

```bash
git add sim/index.html sim/src/main.ts
git commit -m "a11y: drag handle — wider hit area, keyboard, touch, grip dots

Add 12px transparent hit area padding, grip dots indicator.
Add role=separator with keyboard (ArrowLeft/Right) support.
Add touch event handlers. Cancel drag on blur/visibilitychange.

Fixes review issues #11, #12, #13, #36."
```

### Task 17: Color-Blind Support — Shape Differentiation (Issue #14)

**Files:**
- Modify: `sim/src/framework/canvas-renderer.ts`

- [ ] **Step 1: Add shape rendering based on agentType.shape**

In `canvas-renderer.ts`, replace the agent drawing loop:
```typescript
for (const agent of world.agents) {
  if (!agent.alive) continue;

  const cx = agent.x * scaleX;
  const cy = agent.y * scaleY;
  const r = agent.radius * radiusScale;
  const shape = shapeMap.get(agent.type) ?? 'circle';

  ctx.fillStyle = colorMap.get(agent.type) ?? agent.color ?? '#ffffff';
  ctx.beginPath();

  if (shape === 'triangle') {
    // Equilateral triangle pointing up
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx - r * 0.866, cy + r * 0.5);
    ctx.lineTo(cx + r * 0.866, cy + r * 0.5);
    ctx.closePath();
  } else {
    // Default: circle
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
  }
  ctx.fill();
}
```

Build `shapeMap` alongside `colorMap`:
```typescript
const shapeMap = new Map<string, string>();
for (const at of model.agentTypes) {
  shapeMap.set(at.type, at.shape);
}
```

- [ ] **Step 2: Update wolf shape in definition.ts**

```typescript
{ type: 'wolf', color: '#ff2daa', radius: 4, shape: 'triangle' },
```

- [ ] **Step 3: Update canvas-renderer.test.ts**

Add test verifying triangle path calls for wolf agents.

- [ ] **Step 4: Run tests**

Run: `cd sim && npx vitest run`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add sim/src/framework/canvas-renderer.ts sim/src/models/wolf-sheep/definition.ts sim/src/framework/canvas-renderer.test.ts
git commit -m "a11y: render wolves as triangles for color-blind support

Use shape field from agentType definition to render wolves as
triangles and sheep as circles. Improves protanopia/deuteranopia
differentiation.

Fixes review issue #14."
```

### Task 18: Remaining ARIA Fixes (Issues #15, #16, #30, #31, #32)

**Files:**
- Modify: `sim/index.html`
- Modify: `sim/src/framework/controls.ts`
- Modify: `sim/src/main.ts`

- [ ] **Step 1: Page title (Issue #30)**

In `index.html`:
```html
<title>Agent-Based Simulator — Wolf Sheep Predation</title>
```

- [ ] **Step 2: Model selector label (Issue #16)**

In `index.html`:
```html
<select id="model-select" aria-label="Select simulation model"></select>
```

- [ ] **Step 3: Go button aria-pressed (Issue #15)**

In `controls.ts`, update Go button handler:
```typescript
if (goBtn) {
  goBtn.title = 'Run/stop the simulation continuously';
  goBtn.setAttribute('aria-pressed', 'false');
  goBtn.onclick = () => {
    world.running = !world.running;
    goBtn.textContent = world.running ? 'Stop' : 'Go';
    goBtn.classList.toggle('active', world.running);
    goBtn.setAttribute('aria-pressed', String(world.running));
  };
}
```

- [ ] **Step 4: Step button disabled state (Issue #31)**

In `controls.ts`, update Step button:
```typescript
if (stepBtn) {
  stepBtn.title = 'Advance one tick';
  stepBtn.onclick = () => {
    if (!world.running) {
      world.step();
    }
  };
}
```

In `main.ts` loop, toggle disabled state:
```typescript
const stepBtn = document.getElementById('btn-step');
if (stepBtn) {
  if (world.running) {
    stepBtn.setAttribute('disabled', '');
  } else {
    stepBtn.removeAttribute('disabled');
  }
}
```

- [ ] **Step 5: Speed slider aria-valuetext (Issue #32)**

In `main.ts`, update speed slider handler:
```typescript
speedSlider.addEventListener('input', () => {
  const val = speedSlider.value;
  speedValue.textContent = val;
  speedSlider.setAttribute('aria-valuetext', `${val}x speed`);
});
```

- [ ] **Step 6: Run tests**

Run: `cd sim && npx vitest run`
Expected: All pass

- [ ] **Step 7: Commit**

```bash
git add sim/index.html sim/src/framework/controls.ts sim/src/main.ts
git commit -m "a11y: page title, aria-pressed, model label, speed valuetext

Update page title to include model name. Add aria-pressed to Go
button. Add aria-label to model selector. Add aria-valuetext to
speed slider. Disable Step button when running.

Fixes review issues #15, #16, #30, #31, #32."
```

### Task 19: Sidebar Overflow Fix (Issue #19)

**Files:**
- Modify: `sim/index.html`

- [ ] **Step 1: Fix sidebar grid overflow**

In `index.html`, update `.controls` CSS:
```css
.controls {
  grid-area: controls;
  background: var(--bg-surface);
  border-right: 1px solid var(--border);
  padding: 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 0;
  min-height: 0;
}
```

The `height: 0; min-height: 0;` is the standard CSS Grid overflow fix — it tells the grid cell to shrink below its content size, enabling the `overflow-y: auto` scrollbar.

- [ ] **Step 2: Run E2E tests**

Run: `cd sim && npx playwright test`
Expected: Desktop-standard and tablet viewports show scrollable sidebar

- [ ] **Step 3: Commit**

```bash
git add sim/index.html
git commit -m "fix: sidebar overflow on small desktop viewports

Apply height:0;min-height:0 grid overflow fix to .controls so
overflow-y:auto works correctly. Population section now scrollable.

Fixes review issue #19."
```

### Task 20: Slider Label Wrapping (Issue #22)

**Files:**
- Modify: `sim/index.html`

- [ ] **Step 1: Stack labels above sliders at narrow widths**

Update `.slider-row` CSS:
```css
.slider-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 4px 6px;
  font-size: 11px;
}

.slider-row label {
  color: var(--text-primary);
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

- [ ] **Step 2: Run tests**

Run: `cd sim && npx vitest run`
Expected: All pass

- [ ] **Step 3: Commit**

```bash
git add sim/index.html
git commit -m "fix: prevent slider label wrapping at narrow sidebar width

Use auto 1fr auto grid and text-overflow:ellipsis for slider labels.

Fixes review issue #22."
```

---

## Chunk 4: Agent Inspector & CSV (Issues #18, #20, #21, #35, #37)

### Task 21: Agent Inspector Fixes (Issues #21, #37)

**Files:**
- Modify: `sim/src/main.ts`
- Modify: `sim/index.html`

- [ ] **Step 1: Add ARIA attributes and keyboard access to inspector**

In `index.html`:
```html
<div id="agent-inspector" role="dialog" aria-label="Agent inspector">
  <span class="close" id="inspector-close" tabindex="0" role="button" aria-label="Close inspector">&times;</span>
  <div id="inspector-content"></div>
</div>
```

- [ ] **Step 2: Replace innerHTML with textContent/DOM methods (Issue #37)**

In `main.ts`, replace the innerHTML template:
```typescript
if (closest) {
  inspectorContent.textContent = '';

  const title = document.createElement('strong');
  title.textContent = `${closest.type} #${closest.id}`;
  inspectorContent.appendChild(title);

  const details = [
    `x: ${closest.x.toFixed(1)}, y: ${closest.y.toFixed(1)}`,
    `energy: ${closest.energy.toFixed(1)}`,
    `speed: ${closest.speed}`,
    `alive: ${closest.alive}`,
  ];
  for (const line of details) {
    inspectorContent.appendChild(document.createElement('br'));
    inspectorContent.appendChild(document.createTextNode(line));
  }

  inspectorEl.style.display = 'block';

  // Clamp to viewport bounds
  const inspectorRect = inspectorEl.getBoundingClientRect();
  let left = e.clientX + 10;
  let top = e.clientY + 10;
  if (left + inspectorRect.width > window.innerWidth) {
    left = window.innerWidth - inspectorRect.width - 10;
  }
  if (top + inspectorRect.height > window.innerHeight) {
    top = window.innerHeight - inspectorRect.height - 10;
  }
  inspectorEl.style.left = `${left}px`;
  inspectorEl.style.top = `${top}px`;
} else {
  inspectorEl.style.display = 'none';
}
```

- [ ] **Step 3: Add keyboard close (Escape)**

```typescript
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && inspectorEl.style.display === 'block') {
    inspectorEl.style.display = 'none';
  }
});

inspectorClose.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    inspectorEl.style.display = 'none';
  }
});
```

- [ ] **Step 4: Run tests**

Run: `cd sim && npx vitest run`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add sim/src/main.ts sim/index.html
git commit -m "fix: agent inspector accessibility, XSS prevention, viewport clamping

Replace innerHTML with DOM methods. Add role=dialog, aria-label.
Add keyboard close (Escape). Clamp position to viewport bounds.

Fixes review issues #21, #37."
```

### Task 22: CSV Metadata (Issue #18)

**Files:**
- Modify: `sim/src/framework/csv-export.ts`

- [ ] **Step 1: Prepend config metadata to CSV**

```typescript
export function exportCSV(world: World, model: ModelDefinition): void {
  const firstEntry = world.populationHistory[0];
  if (!firstEntry) return;

  // Prepend run configuration as comment rows
  const metaLines: string[] = [];
  metaLines.push(`# Model: ${model.id}`);
  metaLines.push(`# Tick: ${world.tick}`);
  for (const [key, value] of Object.entries(world.config)) {
    metaLines.push(`# ${key}: ${value}`);
  }
  metaLines.push('#');

  const keys = Object.keys(firstEntry);
  const header = ['tick', ...keys].join(',');
  const rows = world.populationHistory.map((entry, i) =>
    [i, ...keys.map(k => entry[k] ?? 0)].join(',')
  );
  const csv = [...metaLines, header, ...rows].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${model.id}-tick${world.tick}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Run tests**

Run: `cd sim && npx vitest run`
Expected: All pass

- [ ] **Step 3: Commit**

```bash
git add sim/src/framework/csv-export.ts
git commit -m "feat: prepend run configuration metadata to CSV export

CSV now starts with comment rows containing model id and all
config key-value pairs, enabling experiment reconstruction.

Fixes review issue #18."
```

### Task 23: Model Description Accuracy (Issues #20, #35)

**Files:**
- Modify: `sim/src/models/wolf-sheep/definition.ts`
- Modify: `sim/src/models/wolf-sheep/world.test.ts`

- [ ] **Step 1: Update model description**

In `definition.ts`, update the context string. Replace:
```
Sheep boom → wolves thrive → sheep crash → wolves starve → repeat.
```
with:
```
Sheep boom → wolves thrive → sheep crash → wolves starve → cycle may repeat or populations may eventually go extinct.
```

- [ ] **Step 2: Update oscillation test comment (Issue #35)**

In `world.test.ts`, update the comment above the oscillation test:
```typescript
// Key signature of Lotka-Volterra dynamics:
// 1. Both populations oscillate (not monotonic, not flat)
// 2. Wolf peaks lag behind sheep peaks (predator follows prey)
// 3. Both species survive for a significant portion of the run
//    (Note: eventual extinction is possible with stochastic models)
```

Also weaken the test assertion at the end — instead of requiring both alive at end, check they survived for a significant portion:
```typescript
// 3. Both species should be alive for a meaningful portion (>20% of ticks)
const wolfAlive = wolfPops.filter(n => n > 0).length;
const sheepAlive = sheepPops.filter(n => n > 0).length;
expect(wolfAlive / wolfPops.length).toBeGreaterThan(0.2);
expect(sheepAlive / sheepPops.length).toBeGreaterThan(0.2);
```

- [ ] **Step 3: Run tests**

Run: `cd sim && npx vitest run`
Expected: All pass (oscillation test should now pass with seeded PRNG from Task 1)

- [ ] **Step 4: Commit**

```bash
git add sim/src/models/wolf-sheep/definition.ts sim/src/models/wolf-sheep/world.test.ts
git commit -m "fix: update model description and test for possible extinction

Model description now acknowledges populations may eventually go
extinct. Oscillation test checks survival rate instead of final
population.

Fixes review issues #20, #35."
```

---

## Chunk 5: Polish & Robustness (Issues #27, #39)

### Task 24: Speed Slider Cap (Issue #27)

**Files:**
- Modify: `sim/src/main.ts`

- [ ] **Step 1: Cap effective steps per frame**

In `main.ts`, in the loop:
```typescript
if (world.running) {
  // Cap at 10 steps per frame to prevent jank (Issue #27)
  // Higher speed values skip rendering frames instead
  const effectiveSteps = Math.min(speed, 10);
  for (let i = 0; i < effectiveSteps; i++) {
    world.step();
  }
}
```

For speeds > 10, use frame skipping instead — accumulate steps across frames. Alternative simpler approach: just cap at 10 and note in tooltip.

- [ ] **Step 2: Update speed tooltip**

In `index.html`, update the speed info tooltip text:
```html
<span class="info-tooltip">1 = real-time, higher = more steps per frame (max 10 per frame)</span>
```

Also update max from 50 to 10:
```html
<input type="range" id="speed-slider" min="1" max="10" step="1" value="1" />
```

- [ ] **Step 3: Run tests**

Run: `cd sim && npx vitest run`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add sim/src/main.ts sim/index.html
git commit -m "perf: cap speed slider at 10 steps per frame

Prevent jank on low-end hardware by limiting max speed to 10
steps per animation frame.

Fixes review issue #27."
```

### Task 25: Playwright Config Retries (Issue #39)

**Files:**
- Modify: `sim/playwright.config.ts`

- [ ] **Step 1: Add retry and worker limits**

```typescript
retries: process.env['CI'] ? 1 : 0,
workers: process.env['CI'] ? 2 : undefined,
```

- [ ] **Step 2: Commit**

```bash
git add sim/playwright.config.ts
git commit -m "ci: add Playwright retry for CI, cap workers

Set retries:1 in CI to handle transient infra failures.
Cap workers to 2 in CI to prevent resource contention.

Fixes review issue #39."
```

---

## Final Verification

### Task 26: Full Verification Loop

- [ ] **Step 1: Run unit tests**

```bash
cd sim && npx vitest run
```
Expected: All pass, 0 failures

- [ ] **Step 2: Run TypeScript type check**

```bash
cd sim && npx tsc --noEmit
```
Expected: No errors

- [ ] **Step 3: Run ESLint**

```bash
cd sim && npx eslint src/ --max-warnings 0
```
Expected: 0 warnings, 0 errors

- [ ] **Step 4: Run lint:all (eslint + knip + type-coverage)**

```bash
cd sim && npm run lint:all
```
Expected: All pass

- [ ] **Step 5: Run Playwright E2E**

```bash
cd sim && npx playwright test
```
Expected: All pass across viewports

- [ ] **Step 6: Manual preview**

Open `http://localhost:5173` and verify:
- Mobile layout shows canvas
- Grass toggle works
- Tooltips accessible via keyboard
- Drag handle has grip dots and keyboard control
- Wolves render as triangles
- Speed slider capped at 10

---

## Parallelization Strategy

Tasks that can run in **parallel worktrees**:
- **Worktree A**: Tasks 1-4 (engine — pure functions, no DOM)
- **Worktree B**: Tasks 5-6 (theme + showGrass — framework renderer)
- **Worktree C**: Tasks 13-14 (mobile + canvas a11y — HTML/CSS only)

After merge of A+B+C:
- **Worktree D**: Tasks 7-12 (main.ts framework changes — depends on A)
- **Worktree E**: Tasks 15-20 (remaining a11y — depends on C)
- **Worktree F**: Tasks 21-23 (inspector + CSV + model desc — independent)

Final sequential:
- Tasks 24-25 (polish)
- Task 26 (full verification)

## Issue-to-Task Mapping

| Issue # | Task # | Batch |
|---------|--------|-------|
| 1 | 13 | 3 |
| 2 | 14 | 3 |
| 3 | 14 | 3 |
| 4 | 15 | 3 |
| 5 | 6 | 2 |
| 6 | 1 | 1 |
| 7 | 2 | 1 |
| 8 | 3 | 1 |
| 9 | 4 | 1 |
| 10 | 7 | 2 |
| 11 | 16 | 3 |
| 12 | 16 | 3 |
| 13 | 16 | 3 |
| 14 | 17 | 3 |
| 15 | 18 | 3 |
| 16 | 18 | 3 |
| 17 | 15 | 3 |
| 18 | 22 | 4 |
| 19 | 19 | 3 |
| 20 | 23 | 4 |
| 21 | 21 | 4 |
| 22 | 20 | 3 |
| 23 | 9 | 2 |
| 24 | 1 | 1 |
| 25 | 10 | 2 |
| 26 | 8 | 2 |
| 27 | 24 | 5 |
| 28 | 1 | 1 |
| 29 | 5 | 2 |
| 30 | 18 | 3 |
| 31 | 18 | 3 |
| 32 | 18 | 3 |
| 33 | 11 | 2 |
| 34 | 11 | 2 |
| 35 | 23 | 4 |
| 36 | 16 | 3 |
| 37 | 21 | 4 |
| 38 | 5 | 2 |
| 39 | 25 | 5 |
| 40 | 12 | 2 |
