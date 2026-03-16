---
title: Testing Strategy
description: Testing pyramid, patterns, and examples for the ABM simulator using Vitest and Playwright.
---

## Testing Pyramid

```
              +----------+
              | E2E (7)  |  Playwright — real browser, real canvas pixels
              +----------+
              | QA  (10) |  Vitest — stress, oscillation, build verification
              +----------+
              | UI  (12) |  Vitest + jsdom — renderer, controls, sliders, stats
              +----------+
              |Engine(26) |  Vitest — pure function unit tests, no DOM
              +----------+
              | Vec2 (8) |  Vitest — pure math (distance, normalize, sub)
              +----------+
```

Every layer has a clear boundary. Tests at each layer should not depend on layers above.

## Unit Test Patterns (Engine Layer)

### Behavior functions — pure input/output

```typescript
import { describe, it, expect } from 'vitest';
import { chaseNearest, bounceOffWalls, tryReproduce } from './behaviors.js';
import type { Agent } from '../../framework/types.js';

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 1, type: 'wolf', x: 100, y: 100, vx: 0, vy: 0,
    radius: 4, speed: 2, energy: 50, color: '#ff2daa',
    alive: true, meta: {},
    ...overrides,
  };
}

it('chaseNearest moves wolf toward sheep', () => {
  const wolf = makeAgent({ x: 0, y: 0, speed: 2 });
  const sheep = [makeAgent({ type: 'sheep', x: 10, y: 0 })];
  const vel = chaseNearest(wolf, sheep, {});
  expect(vel.vx).toBeGreaterThan(0);  // Moving toward sheep (positive x)
  expect(Math.abs(vel.vy)).toBeLessThan(0.01);  // No y component
});

it('bounceOffWalls reverses velocity at boundaries', () => {
  const agent = makeAgent({ x: -1, y: 50, vx: -2, vy: 0, radius: 4 });
  bounceOffWalls(agent, 800, 600);
  expect(agent.x).toBe(4);  // Clamped to radius
  expect(agent.vx).toBeGreaterThan(0);  // Reversed
});

it('tryReproduce returns null when energy below threshold', () => {
  const agent = makeAgent({ energy: 10 });
  const result = tryReproduce(agent, { wolfReproduceThreshold: 60, wolfReproduceRate: 1.0 });
  expect(result).toBeNull();
});
```

### Agent factory functions

```typescript
it('createWolf uses config values', () => {
  const wolf = createWolf({ width: 800, height: 600, wolfSpeed: 3.0, wolfGainFromFood: 25 });
  expect(wolf.type).toBe('wolf');
  expect(wolf.speed).toBe(3.0);
  expect(wolf.energy).toBe(50);  // 25 * 2
  expect(wolf.x).toBeGreaterThanOrEqual(wolf.radius);
  expect(wolf.x).toBeLessThanOrEqual(800 - wolf.radius);
});
```

### Vec2 math — exhaustive edge cases

```typescript
it('normalize returns unit vector', () => {
  const n = normalize({ x: 3, y: 4 });
  const mag = Math.sqrt(n.x * n.x + n.y * n.y);
  expect(mag).toBeCloseTo(1.0, 10);
});

it('normalize handles zero vector', () => {
  const n = normalize({ x: 0, y: 0 });
  expect(n.x).toBe(0);
  expect(n.y).toBe(0);
});
```

## UI Test Patterns (jsdom Layer)

### Canvas mock pattern

This is the established pattern for mocking `CanvasRenderingContext2D`. Use it consistently:

```typescript
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';

function makeCtx() {
  return {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
    fillRect: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    stroke: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    font: '',
    lineWidth: 1,
    canvas: { width: 800, height: 600 },
  } as unknown as CanvasRenderingContext2D;
}
```

The `as unknown as CanvasRenderingContext2D` assertion is the **only** permitted use of `as` in the codebase. It exists because mocking the full canvas API is impractical.

### Renderer tests — assert drawing calls

```typescript
it('render draws each alive agent', () => {
  const ctx = makeCtx();
  const agents = [
    makeAgent({ alive: true }),
    makeAgent({ alive: true }),
    makeAgent({ alive: false }),
  ];
  const world = makeWorld({ agents });
  render(ctx, world, model);
  expect(ctx.arc).toHaveBeenCalledTimes(2);  // Only alive agents
});

it('render scales positions to canvas size', () => {
  const ctx = makeCtx();
  ctx.canvas.width = 1600;
  ctx.canvas.height = 1200;
  const agents = [makeAgent({ x: 400, y: 300 })];
  const world = makeWorld({ agents, config: { width: 800, height: 600 } });
  render(ctx, world, model);
  const arcCalls = (ctx.arc as ReturnType<typeof vi.fn>).mock.calls;
  expect(arcCalls[0]![0]).toBe(800);  // 400 * (1600/800)
  expect(arcCalls[0]![1]).toBe(600);  // 300 * (1200/600)
});
```

### Controls tests — mock DOM elements

```typescript
// @vitest-environment jsdom
it('Go button sets world.running to true', () => {
  const world = makeWorld({ running: false });
  const goBtn = document.createElement('button');
  goBtn.id = 'btn-go';
  // ... setup controls
  goBtn.click();
  expect(world.running).toBe(true);
});
```

### Slider tests — verify config binding

```typescript
it('slider change updates world config', () => {
  const world = makeWorld();
  // Create slider for 'wolfSpeed'
  // Simulate input event with value '3.5'
  expect(world.config['wolfSpeed']).toBe(3.5);
});
```

## Integration Test Patterns

Located in `sim/src/integration.test.ts`:

```typescript
it('all modules import without error', async () => {
  const world = await import('./models/wolf-sheep/world.js');
  const registry = await import('./framework/model-registry.js');
  expect(world.WolfSheepWorld).toBeDefined();
  expect(registry.registerModel).toBeDefined();
});

it('world setup + 100 steps does not crash', () => {
  const world = new WolfSheepWorld({ ...wolfSheepDef.defaultConfig });
  world.setup();
  for (let i = 0; i < 100; i++) {
    world.step();
  }
  expect(world.tick).toBe(100);
});

it('population dynamics emerge', () => {
  const world = new WolfSheepWorld(config);
  world.setup();
  const initialSheep = world.agents.filter(a => a.type === 'sheep').length;
  for (let i = 0; i < 200; i++) world.step();
  const finalSheep = world.agents.filter(a => a.type === 'sheep' && a.alive).length;
  expect(finalSheep).not.toBe(initialSheep);  // Something changed
});
```

## Stress Test Patterns

Located in `sim/src/stress.test.ts`:

### 1000-tick stability

```typescript
it('200 agents for 1000 steps without crash', () => {
  const world = createWorld({ initialWolves: 100, initialSheep: 100 });
  for (let i = 0; i < 1000; i++) {
    world.step();
  }
  expect(world.tick).toBe(1000);
});
```

### NaN guard

```typescript
it('no NaN in agent positions after 500 steps', () => {
  const world = createWorld();
  for (let i = 0; i < 500; i++) world.step();
  for (const a of world.agents.filter(a => a.alive)) {
    expect(Number.isFinite(a.x)).toBe(true);
    expect(Number.isFinite(a.y)).toBe(true);
    expect(Number.isFinite(a.energy)).toBe(true);
  }
});
```

### Population bounds

```typescript
it('population does not instantly collapse', () => {
  const world = createWorld();
  for (let i = 0; i < 100; i++) world.step();
  const wolves = world.agents.filter(a => a.type === 'wolf' && a.alive).length;
  const sheep = world.agents.filter(a => a.type === 'sheep' && a.alive).length;
  expect(wolves).toBeGreaterThan(0);
  expect(sheep).toBeGreaterThan(0);
});
```

### Oscillation validation

```typescript
it('Lotka-Volterra oscillation emerges', () => {
  const world = createWorld();
  for (let i = 0; i < 500; i++) world.step();
  const sheepPops = world.populationHistory.map(h => h['sheep'] ?? 0);
  const minSheep = Math.min(...sheepPops);
  const maxSheep = Math.max(...sheepPops);
  expect(maxSheep - minSheep).toBeGreaterThan(10);  // Not flat
});
```

### Build verification

```typescript
it('build produces valid dist', async () => {
  const { execSync } = await import('child_process');
  const { existsSync, readFileSync } = await import('fs');
  execSync('npm run build', { cwd: resolve(__dirname, '..'), stdio: 'pipe' });
  const html = readFileSync(resolve(__dirname, '..', 'dist', 'index.html'), 'utf-8');
  expect(html).toContain('<canvas');
  expect(html).toContain('<script');
});
```

## Playwright E2E Patterns

### Configuration (`playwright.config.ts`)

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
});
```

### Smoke test

```typescript
import { test, expect } from '@playwright/test';

test('page loads and canvas is visible', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('#sim-canvas');
  await expect(canvas).toBeVisible();
});

test('clicking Go starts simulation', async ({ page }) => {
  await page.goto('/');
  await page.click('#btn-go');
  // Wait for tick to advance
  await expect(page.locator('#tick-display')).not.toHaveText('Tick: 0');
});
```

### Control interaction

```typescript
test('slider updates config', async ({ page }) => {
  await page.goto('/');
  const slider = page.locator('[data-param="wolfSpeed"]');
  await slider.fill('3.0');
  // Verify value display updated
  await expect(page.locator('[data-param="wolfSpeed"] + .slider-value')).toHaveText('3');
});
```

### Visual regression

```typescript
test('initial render matches baseline', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(500);  // Let initial render complete
  await expect(page.locator('.canvas-area')).toHaveScreenshot('initial-render.png', {
    maxDiffPixelRatio: 0.05,  // Allow 5% pixel diff for anti-aliasing
  });
});
```

Baselines stored in `sim/test/screenshots/`. Update with `npx playwright test --update-snapshots`.

### Canvas pixel inspection

```typescript
test('agents are rendered on canvas', async ({ page }) => {
  await page.goto('/');
  const hasPixels = await page.evaluate(() => {
    const canvas = document.getElementById('sim-canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    // Check that not all pixels are the same (something was drawn)
    const first = [data[0], data[1], data[2]];
    for (let i = 4; i < data.length; i += 4) {
      if (data[i] !== first[0] || data[i+1] !== first[1] || data[i+2] !== first[2]) {
        return true;
      }
    }
    return false;
  });
  expect(hasPixels).toBe(true);
});
```

## Bug-Fix Test Naming

Every bug fix must include a regression test that stays forever:

```typescript
it('regression: wolves do not teleport when all sheep are dead', () => {
  // Setup: kill all sheep
  // Act: step the world
  // Assert: wolf positions are within bounds
});

it('regression: grass regrowth timer does not go negative', () => {
  // Setup: world with fast regrowth
  // Act: step beyond regrowth time
  // Assert: all timers >= 0
});
```

The `regression:` prefix makes these tests easy to find and signals they must never be deleted.

## Contract Tests

Every registered model must pass this contract:

```typescript
for (const def of listModels()) {
  it(`${def.id} survives 1000 ticks with default config`, () => {
    const world = def.createWorld({ ...def.defaultConfig });
    world.setup();
    for (let i = 0; i < 1000; i++) {
      world.step();
    }
    expect(world.tick).toBe(1000);
    expect(world.populationHistory.length).toBe(1000);
    // No NaN in alive agents
    for (const a of world.agents.filter(a => a.alive)) {
      expect(Number.isFinite(a.x)).toBe(true);
      expect(Number.isFinite(a.y)).toBe(true);
      expect(Number.isFinite(a.energy)).toBe(true);
    }
  });
}
```
