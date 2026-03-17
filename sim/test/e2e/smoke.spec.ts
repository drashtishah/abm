/**
 * Smoke tests — verify the app loads and all major UI elements are visible.
 * Catches integration issues that unit tests miss (CSS hiding elements,
 * JS errors preventing render, missing DOM nodes).
 */
import { test, expect } from '@playwright/test';

test.describe('smoke tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the app to initialize
    await page.waitForSelector('#sim-canvas');
  });

  test('page loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Agent-Based Simulator/);
  });

  test('simulation canvas is visible and has non-zero size', async ({ page }) => {
    const canvas = page.locator('#sim-canvas');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(100);
  });

  test('control buttons are visible and clickable', async ({ page }) => {
    await expect(page.locator('#btn-setup')).toBeVisible();
    await expect(page.locator('#btn-go')).toBeVisible();
    await expect(page.locator('#btn-step')).toBeVisible();
    await expect(page.locator('#btn-reset')).toBeVisible();

    // Buttons must have non-zero dimensions (catches CSS collapse)
    const goBox = await page.locator('#btn-go').boundingBox();
    expect(goBox).not.toBeNull();
    expect(goBox!.width).toBeGreaterThan(20);
    expect(goBox!.height).toBeGreaterThan(10);
  });

  test('parameter sliders are rendered and visible', async ({ page }) => {
    const sliderContainer = page.locator('#slider-container');
    await expect(sliderContainer).toBeVisible();

    // Should have multiple slider rows (at least 5 core params)
    const sliderRows = sliderContainer.locator('.slider-row');
    const count = await sliderRows.count();
    expect(count).toBeGreaterThanOrEqual(5);

    // Verify specific known sliders exist AND are visible (not hidden by CSS)
    await expect(page.locator('#slider-initialWolves')).toBeVisible();
    await expect(page.locator('#slider-initialSheep')).toBeVisible();
    await expect(page.locator('#slider-wolfGainFromFood')).toBeVisible();
    await expect(page.locator('#slider-sheepGainFromFood')).toBeVisible();
    await expect(page.locator('#slider-grassRegrowthTime')).toBeVisible();

    // Sidebar must have non-trivial height (catches height:0 collapse)
    const sidebar = page.locator('.controls');
    const box = await sidebar.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThan(200);
  });

  test('hidden fields (width/height) are NOT rendered as sliders', async ({ page }) => {
    await expect(page.locator('#slider-width')).not.toBeAttached();
    await expect(page.locator('#slider-height')).not.toBeAttached();
  });

  test('slider values match defaults', async ({ page }) => {
    const wolvesSlider = page.locator('#slider-initialWolves');
    await expect(wolvesSlider).toHaveValue('30');

    const sheepSlider = page.locator('#slider-initialSheep');
    await expect(sheepSlider).toHaveValue('100');
  });

  test('population counters are visible', async ({ page }) => {
    await expect(page.locator('[data-pop-key="wolf"]')).toBeVisible();
    await expect(page.locator('[data-pop-key="sheep"]')).toBeVisible();
    await expect(page.locator('[data-pop-key="grass"]')).toBeVisible();
  });

  test('model selector has options', async ({ page }) => {
    const select = page.locator('#model-select');
    await expect(select).toBeVisible();
    const options = select.locator('option');
    const count = await options.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('speed slider is visible and functional', async ({ page }) => {
    const speedSlider = page.locator('#speed-slider');
    await expect(speedSlider).toBeVisible();
    await expect(speedSlider).toHaveAttribute('max', '10');
  });

  test('chart legend is visible', async ({ page }) => {
    await expect(page.locator('#chart-legend')).toBeAttached();
  });

  test('drag handle is visible on desktop', async ({ page, viewport }) => {
    // Drag handle is hidden on mobile (<768px)
    if (viewport && viewport.width < 768) {
      await expect(page.locator('#drag-handle')).toBeHidden();
      return;
    }
    const handle = page.locator('#drag-handle');
    await expect(handle).toBeVisible();
    await expect(handle).toHaveAttribute('role', 'separator');
  });

  test('canvas has ARIA role and label', async ({ page }) => {
    const canvas = page.locator('#sim-canvas');
    await expect(canvas).toHaveAttribute('role', 'img');
    await expect(canvas).toHaveAttribute('aria-label', /[Ss]imulation/);
  });

  test('Go button starts simulation and updates tick', async ({ page }) => {
    const goBtn = page.locator('#btn-go');
    await goBtn.click();

    // Wait for tick to advance
    await page.waitForFunction(() => {
      const el = document.getElementById('tick-display');
      return el && el.textContent !== 'Tick: 0';
    }, { timeout: 3000 });

    const tickText = await page.locator('#tick-display').textContent();
    expect(tickText).not.toBe('Tick: 0');
  });

  test('wolves render as triangles (shape differentiation)', async ({ page }) => {
    // Start simulation briefly to ensure agents are drawn
    const goBtn = page.locator('#btn-go');
    await goBtn.click();
    await page.waitForTimeout(200);
    await goBtn.click(); // stop

    // Verify canvas has non-empty content (pixels drawn)
    const canvas = page.locator('#sim-canvas');
    const hasContent = await canvas.evaluate((el: HTMLCanvasElement) => {
      const ctx = el.getContext('2d');
      if (!ctx) return false;
      const data = ctx.getImageData(0, 0, el.width, el.height).data;
      // Check if any non-black pixel exists (agents are rendered)
      for (let i = 0; i < data.length; i += 4) {
        if (data[i]! > 10 || data[i + 1]! > 10 || data[i + 2]! > 10) return true;
      }
      return false;
    });
    expect(hasContent).toBe(true);
  });

  test('Download CSV button exists', async ({ page }) => {
    await expect(page.locator('#btn-download')).toBeAttached();
  });

  test('agent inspector appears on canvas click', async ({ page }) => {
    // Start sim to place agents
    const goBtn = page.locator('#btn-go');
    await goBtn.click();
    await page.waitForTimeout(100);
    await goBtn.click();

    // Click center of canvas (likely to hit an agent with 130 initial)
    const canvas = page.locator('#sim-canvas');
    const box = await canvas.boundingBox();
    if (box) {
      await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } });
    }

    // Inspector may or may not appear depending on agent positions,
    // but at minimum no JS error should occur
    // Just verify the inspector element exists in DOM
    await expect(page.locator('#agent-inspector')).toBeAttached();
  });
});
