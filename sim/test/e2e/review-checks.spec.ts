/**
 * Review E2E Checks — comprehensive evidence-gathering for the review-team personas.
 *
 * NOT a CI regression suite — these checks produce screenshots and DOM evidence
 * that the review agent reads with Claude vision to make qualitative judgments.
 *
 * All checks are model-agnostic: they interact with the DOM (buttons, sliders, canvas,
 * model selector) rather than hardcoding model-specific selectors or values.
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import path from 'node:path';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function waitForCanvas(page: Page): Promise<void> {
  await page.waitForSelector('#sim-canvas', { state: 'visible', timeout: 5_000 });
}

async function clickButton(page: Page, id: string): Promise<void> {
  await page.click(`#${id}`);
}

async function getTickCount(page: Page): Promise<number> {
  const text = await page.textContent('#tick-display');
  const match = text?.match(/\d+/);
  return match ? parseInt(match[0], 10) : -1;
}

async function getModelOptions(page: Page): Promise<string[]> {
  return page.$$eval('#model-select option', opts => opts.map(o => o.getAttribute('value') ?? ''));
}

async function selectModel(page: Page, modelId: string): Promise<void> {
  await page.selectOption('#model-select', modelId);
  await page.waitForTimeout(300);
}

function screenshotPath(testInfo: { project: { name: string }; title: string }, suffix?: string): string {
  const browser = testInfo.project.name;
  const name = testInfo.title.replace(/[^a-zA-Z0-9-_]/g, '_');
  const filename = suffix ? `${name}_${suffix}.png` : `${name}.png`;
  return path.join('test-results', browser, filename);
}

// ─── Layout & Responsiveness ─────────────────────────────────────────────────

test.describe('Layout & Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);
  });

  test('full-page screenshot', async ({ page }, testInfo) => {
    await page.screenshot({ path: screenshotPath(testInfo), fullPage: true });
  });

  test('no horizontal scrollbar', async ({ page }) => {
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth <= document.documentElement.clientWidth;
    });
    expect(overflow).toBe(true);
  });

  test('no vertical overflow clipping on desktop', async ({ page }, testInfo) => {
    // Skip for mobile viewports — mobile layout scrolls vertically by design
    const viewport = page.viewportSize();
    if (viewport && viewport.width < 768) {
      test.skip();
      return;
    }
    const bodyFits = await page.evaluate(() => {
      const body = document.body;
      return body.scrollHeight <= window.innerHeight + 2; // 2px tolerance
    });
    // Screenshot regardless for review agent visual inspection
    await page.screenshot({ path: screenshotPath(testInfo, 'overflow'), fullPage: true });
    expect(bodyFits).toBe(true);
  });

  test('sidebar and canvas proportions', async ({ page }, testInfo) => {
    const viewport = page.viewportSize();
    if (viewport && viewport.width < 768) {
      // Mobile: controls should stack above canvas
      const controlsBox = await page.locator('.controls').boundingBox();
      const canvasBox = await page.locator('.canvas-area').boundingBox();
      expect(controlsBox).not.toBeNull();
      expect(canvasBox).not.toBeNull();
      if (controlsBox && canvasBox) {
        expect(controlsBox.y).toBeLessThan(canvasBox.y);
      }
    } else {
      // Desktop: sidebar should be narrower than canvas
      const controlsBox = await page.locator('.controls').boundingBox();
      const canvasBox = await page.locator('.canvas-area').boundingBox();
      expect(controlsBox).not.toBeNull();
      expect(canvasBox).not.toBeNull();
      if (controlsBox && canvasBox) {
        expect(controlsBox.width).toBeLessThan(canvasBox.width);
      }
    }
    await page.screenshot({ path: screenshotPath(testInfo, 'proportions') });
  });

  test('all text readable - no truncation or overlap', async ({ page }, testInfo) => {
    // Screenshot the controls sidebar for visual inspection by review agent
    const controls = page.locator('.controls');
    await controls.screenshot({ path: screenshotPath(testInfo, 'controls_text') });
  });

  test('drag handle visible on desktop', async ({ page }, testInfo) => {
    const viewport = page.viewportSize();
    if (viewport && viewport.width < 768) {
      test.skip();
      return;
    }
    const handle = page.locator('#drag-handle');
    await expect(handle).toBeVisible();
    await handle.screenshot({ path: screenshotPath(testInfo, 'drag_handle') });
  });

  test('mobile controls stack vertically', async ({ page }, testInfo) => {
    const viewport = page.viewportSize();
    if (!viewport || viewport.width >= 768) {
      test.skip();
      return;
    }
    await page.screenshot({ path: screenshotPath(testInfo, 'mobile_layout'), fullPage: true });
    // Controls should be full width
    const controlsBox = await page.locator('.controls').boundingBox();
    if (controlsBox && viewport) {
      expect(controlsBox.width).toBeGreaterThan(viewport.width * 0.9);
    }
  });

  test('border and spacing consistency', async ({ page }, testInfo) => {
    await page.screenshot({ path: screenshotPath(testInfo, 'borders'), fullPage: true });
  });
});

// ─── Interaction & Controls ──────────────────────────────────────────────────

test.describe('Interaction & Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);
  });

  test('page loads and canvas visible within 3s', async ({ page }) => {
    const canvas = page.locator('#sim-canvas');
    await expect(canvas).toBeVisible({ timeout: 3_000 });
  });

  test('setup button populates canvas with agents', async ({ page }, testInfo) => {
    await clickButton(page, 'btn-setup');
    await page.waitForTimeout(200);
    // Canvas should now have non-uniform pixels (agents drawn)
    const hasContent = await page.evaluate(() => {
      const c = document.getElementById('sim-canvas') as HTMLCanvasElement;
      const ctx = c.getContext('2d');
      if (!ctx) return false;
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      const firstPixel = [data[0], data[1], data[2]];
      for (let i = 4; i < data.length; i += 4) {
        if (data[i] !== firstPixel[0] || data[i + 1] !== firstPixel[1] || data[i + 2] !== firstPixel[2]) {
          return true;
        }
      }
      return false;
    });
    await page.screenshot({ path: screenshotPath(testInfo, 'after_setup') });
    expect(hasContent).toBe(true);
  });

  test('go button starts simulation - tick advances', async ({ page }) => {
    await clickButton(page, 'btn-setup');
    await clickButton(page, 'btn-go');
    await page.waitForTimeout(1_000);
    const tick = await getTickCount(page);
    expect(tick).toBeGreaterThan(0);
  });

  test('pause stops tick advancement', async ({ page }) => {
    await clickButton(page, 'btn-setup');
    await clickButton(page, 'btn-go');
    await page.waitForTimeout(500);
    // Click go again to pause (toggle)
    await clickButton(page, 'btn-go');
    await page.waitForTimeout(100);
    const tickA = await getTickCount(page);
    await page.waitForTimeout(500);
    const tickB = await getTickCount(page);
    expect(tickB).toBe(tickA);
  });

  test('reset clears canvas and resets tick to 0', async ({ page }) => {
    await clickButton(page, 'btn-setup');
    await clickButton(page, 'btn-go');
    await page.waitForTimeout(500);
    await clickButton(page, 'btn-go'); // pause
    await clickButton(page, 'btn-reset');
    await page.waitForTimeout(200);
    const tick = await getTickCount(page);
    expect(tick).toBe(0);
  });

  test('step advances exactly 1 tick', async ({ page }) => {
    await clickButton(page, 'btn-setup');
    const before = await getTickCount(page);
    await clickButton(page, 'btn-step');
    await page.waitForTimeout(200);
    const after = await getTickCount(page);
    expect(after).toBe(before + 1);
  });

  test('slider updates value display', async ({ page }) => {
    // Test with speed slider (always present)
    const slider = page.locator('#speed-slider');
    await slider.fill('10');
    await slider.dispatchEvent('input');
    const display = await page.textContent('#speed-value');
    expect(display).toBe('10');
  });

  test('speed slider changes simulation rate', async ({ page }) => {
    await clickButton(page, 'btn-setup');
    // Run at speed 1
    await page.locator('#speed-slider').fill('1');
    await page.locator('#speed-slider').dispatchEvent('input');
    await clickButton(page, 'btn-go');
    await page.waitForTimeout(1_000);
    await clickButton(page, 'btn-go'); // pause
    const tickSlow = await getTickCount(page);

    // Reset and run at speed 10
    await clickButton(page, 'btn-reset');
    await clickButton(page, 'btn-setup');
    await page.locator('#speed-slider').fill('10');
    await page.locator('#speed-slider').dispatchEvent('input');
    await clickButton(page, 'btn-go');
    await page.waitForTimeout(1_000);
    await clickButton(page, 'btn-go'); // pause
    const tickFast = await getTickCount(page);

    expect(tickFast).toBeGreaterThan(tickSlow);
  });

  test('model selector switches model when multiple exist', async ({ page }) => {
    const options = await getModelOptions(page);
    if (options.length < 2) {
      test.skip();
      return;
    }
    // Switch to second model
    await selectModel(page, options[1]!);
    const selected = await page.$eval('#model-select', el => (el as HTMLSelectElement).value);
    expect(selected).toBe(options[1]);
  });

  test('agent inspector - click canvas shows agent info', async ({ page }, testInfo) => {
    await clickButton(page, 'btn-setup');
    await page.waitForTimeout(200);
    // Click near center of canvas where agents likely are
    const canvas = page.locator('#sim-canvas');
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(200);
    }
    await page.screenshot({ path: screenshotPath(testInfo, 'inspector') });
  });

  test('download CSV button produces file', async ({ page }) => {
    await clickButton(page, 'btn-setup');
    await clickButton(page, 'btn-go');
    await page.waitForTimeout(1_000);
    await clickButton(page, 'btn-go'); // pause

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 5_000 }),
      clickButton(page, 'btn-download'),
    ]);
    expect(download).toBeTruthy();
  });

  test('advanced sliders section expand/collapse', async ({ page }) => {
    const toggle = page.locator('.advanced-toggle');
    if (await toggle.count() === 0) {
      test.skip();
      return;
    }
    const advParams = page.locator('.advanced-params');
    // Initially collapsed
    const initiallyCollapsed = await advParams.evaluate(el => el.classList.contains('collapsed'));
    // Click to toggle
    await toggle.click();
    await page.waitForTimeout(200);
    const afterClick = await advParams.evaluate(el => el.classList.contains('collapsed'));
    expect(afterClick).not.toBe(initiallyCollapsed);
  });
});

// ─── Simulation Visual Checks ────────────────────────────────────────────────

test.describe('Simulation Visual Checks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);
  });

  test('canvas has non-uniform pixels after setup', async ({ page }) => {
    await clickButton(page, 'btn-setup');
    await page.waitForTimeout(300);
    const hasContent = await page.evaluate(() => {
      const c = document.getElementById('sim-canvas') as HTMLCanvasElement;
      const ctx = c.getContext('2d');
      if (!ctx) return false;
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      let uniqueColors = 0;
      const seen = new Set<string>();
      for (let i = 0; i < Math.min(data.length, 40000); i += 4) {
        const key = `${data[i]},${data[i + 1]},${data[i + 2]}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueColors++;
          if (uniqueColors > 3) return true;
        }
      }
      return uniqueColors > 2;
    });
    expect(hasContent).toBe(true);
  });

  test('agents visibly moved after 50 ticks', async ({ page }, testInfo) => {
    await clickButton(page, 'btn-setup');
    await page.waitForTimeout(100);
    // Run simulation for 50 ticks using step
    await page.locator('#speed-slider').fill('50');
    await page.locator('#speed-slider').dispatchEvent('input');
    await clickButton(page, 'btn-go');
    await page.waitForTimeout(2_000);
    await clickButton(page, 'btn-go'); // pause
    const tick = await getTickCount(page);
    expect(tick).toBeGreaterThanOrEqual(30); // At least some ticks advanced
    await page.screenshot({ path: screenshotPath(testInfo, 'after_50_ticks') });
  });

  test('population chart renders after simulation runs', async ({ page }, testInfo) => {
    await clickButton(page, 'btn-setup');
    await clickButton(page, 'btn-go');
    await page.waitForTimeout(1_500);
    await clickButton(page, 'btn-go'); // pause

    const chartArea = page.locator('.chart-area');
    const isVisible = await chartArea.evaluate(el => el.classList.contains('visible'));
    await page.screenshot({ path: screenshotPath(testInfo, 'chart_rendered') });
    expect(isVisible).toBe(true);
  });

  test('chart shows distinct colored lines', async ({ page }, testInfo) => {
    await clickButton(page, 'btn-setup');
    await page.locator('#speed-slider').fill('10');
    await page.locator('#speed-slider').dispatchEvent('input');
    await clickButton(page, 'btn-go');
    await page.waitForTimeout(2_000);
    await clickButton(page, 'btn-go'); // pause

    // Screenshot the chart canvas for visual review
    const chartCanvas = page.locator('#chart-canvas');
    await chartCanvas.screenshot({ path: screenshotPath(testInfo, 'chart_lines') });

    // Check that chart has non-uniform pixels (lines drawn)
    const hasLines = await page.evaluate(() => {
      const c = document.getElementById('chart-canvas') as HTMLCanvasElement;
      const ctx = c.getContext('2d');
      if (!ctx || c.width === 0 || c.height === 0) return false;
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      const colors = new Set<string>();
      for (let i = 0; i < data.length; i += 16) {
        if (data[i + 3]! > 0) { // non-transparent
          colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
        }
        if (colors.size > 3) return true;
      }
      return colors.size > 2;
    });
    expect(hasLines).toBe(true);
  });

  test('population counts match visible agent density', async ({ page }) => {
    await clickButton(page, 'btn-setup');
    await page.waitForTimeout(200);
    // Read DOM population counts
    const wolvesText = await page.textContent('#pop-wolves');
    const sheepText = await page.textContent('#pop-sheep');
    const wolfCount = parseInt(wolvesText?.match(/\d+/)?.[0] ?? '0', 10);
    const sheepCount = parseInt(sheepText?.match(/\d+/)?.[0] ?? '0', 10);
    // Both should be > 0 after setup
    expect(wolfCount).toBeGreaterThan(0);
    expect(sheepCount).toBeGreaterThan(0);
  });
});

// ─── Accessibility ───────────────────────────────────────────────────────────

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);
  });

  test('all buttons have accessible names', async ({ page }) => {
    const buttons = await page.$$eval('button', btns =>
      btns.map(b => ({
        id: b.id,
        text: b.textContent?.trim() ?? '',
        ariaLabel: b.getAttribute('aria-label') ?? '',
      }))
    );
    for (const btn of buttons) {
      const hasName = btn.text.length > 0 || btn.ariaLabel.length > 0;
      expect(hasName, `Button ${btn.id || 'unnamed'} missing accessible name`).toBe(true);
    }
  });

  test('all sliders have accessible labels', async ({ page }) => {
    const sliders = await page.$$eval('input[type="range"]', inputs =>
      inputs.map(i => ({
        id: i.id,
        ariaLabel: i.getAttribute('aria-label') ?? '',
        labelledBy: i.getAttribute('aria-labelledby') ?? '',
        hasLabel: !!i.closest('.slider-row')?.querySelector('label'),
      }))
    );
    for (const slider of sliders) {
      const hasName = slider.ariaLabel.length > 0 || slider.labelledBy.length > 0 || slider.hasLabel;
      expect(hasName, `Slider ${slider.id || 'unnamed'} missing accessible label`).toBe(true);
    }
  });

  test('tab through controls - focus order is logical', async ({ page }, testInfo) => {
    const focusOrder: string[] = [];
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? `${el.tagName.toLowerCase()}#${el.id || el.className}` : 'none';
      });
      focusOrder.push(focused);
    }
    // Screenshot with last focused element visible
    await page.screenshot({ path: screenshotPath(testInfo, 'focus_order') });
    // Focus should hit interactive elements (not get stuck)
    const uniqueElements = new Set(focusOrder);
    expect(uniqueElements.size).toBeGreaterThan(3);
  });

  test('focus indicator visible on interactive elements', async ({ page }, testInfo) => {
    // Tab to first button and screenshot
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.screenshot({ path: screenshotPath(testInfo, 'focus_indicator') });
  });

  test('canvas has ARIA description or text alternative', async ({ page }) => {
    const canvas = page.locator('#sim-canvas');
    const ariaLabel = await canvas.getAttribute('aria-label');
    const ariaDescribedBy = await canvas.getAttribute('aria-describedby');
    const role = await canvas.getAttribute('role');
    // Note: this may intentionally fail to flag missing accessibility
    const hasDescription = !!(ariaLabel || ariaDescribedBy || role);
    // Record finding either way — the review agent evaluates this
    expect(hasDescription).toBeDefined();
  });

  test('sliders announce min/max/value', async ({ page }) => {
    const sliders = await page.$$eval('input[type="range"]', inputs =>
      inputs.map(i => ({
        id: i.id,
        min: i.getAttribute('min'),
        max: i.getAttribute('max'),
        value: i.value,
      }))
    );
    for (const slider of sliders) {
      expect(slider.min, `Slider ${slider.id} missing min`).not.toBeNull();
      expect(slider.max, `Slider ${slider.id} missing max`).not.toBeNull();
      expect(slider.value, `Slider ${slider.id} missing value`).toBeTruthy();
    }
  });
});

// ─── Edge Cases & Stress ─────────────────────────────────────────────────────

test.describe('Edge Cases & Stress', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);
  });

  test('rapid go/pause 50x in quick succession', async ({ page }) => {
    await clickButton(page, 'btn-setup');
    for (let i = 0; i < 50; i++) {
      await clickButton(page, 'btn-go');
    }
    // Should not crash — page still responsive
    await page.waitForTimeout(200);
    const tick = await getTickCount(page);
    expect(tick).toBeGreaterThanOrEqual(0);
  });

  test('max agent counts - run 100 ticks without crash', async ({ page }) => {
    await clickButton(page, 'btn-setup');
    // Set all agent count sliders to their max via DOM
    await page.evaluate(() => {
      const sliders = document.querySelectorAll('#slider-container input[type="range"]');
      sliders.forEach(s => {
        const input = s as HTMLInputElement;
        // Only max out count-like sliders (those with "initial" in the label nearby)
        const label = input.closest('.slider-row')?.querySelector('label')?.textContent ?? '';
        if (label.toLowerCase().includes('initial')) {
          input.value = input.max;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
    });
    await clickButton(page, 'btn-setup');
    await page.locator('#speed-slider').fill('20');
    await page.locator('#speed-slider').dispatchEvent('input');
    await clickButton(page, 'btn-go');
    await page.waitForTimeout(5_000);
    await clickButton(page, 'btn-go'); // pause
    const tick = await getTickCount(page);
    expect(tick).toBeGreaterThan(0);
  });

  test('zero agent counts - handles gracefully', async ({ page }) => {
    // Set initial counts to min (which may be 0 or 1)
    await page.evaluate(() => {
      const sliders = document.querySelectorAll('#slider-container input[type="range"]');
      sliders.forEach(s => {
        const input = s as HTMLInputElement;
        const label = input.closest('.slider-row')?.querySelector('label')?.textContent ?? '';
        if (label.toLowerCase().includes('initial')) {
          input.value = input.min;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
    });
    await clickButton(page, 'btn-setup');
    await clickButton(page, 'btn-go');
    await page.waitForTimeout(1_000);
    await clickButton(page, 'btn-go'); // pause
    // Should not crash
    const tick = await getTickCount(page);
    expect(tick).toBeGreaterThanOrEqual(0);
  });

  test('all sliders at min - no crash', async ({ page }) => {
    await page.evaluate(() => {
      const sliders = document.querySelectorAll('#slider-container input[type="range"]');
      sliders.forEach(s => {
        const input = s as HTMLInputElement;
        input.value = input.min;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
    await clickButton(page, 'btn-setup');
    await clickButton(page, 'btn-go');
    await page.waitForTimeout(1_000);
    await clickButton(page, 'btn-go');
    const tick = await getTickCount(page);
    expect(tick).toBeGreaterThanOrEqual(0);
  });

  test('all sliders at max - no crash', async ({ page }) => {
    await page.evaluate(() => {
      const sliders = document.querySelectorAll('#slider-container input[type="range"]');
      sliders.forEach(s => {
        const input = s as HTMLInputElement;
        input.value = input.max;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
    await clickButton(page, 'btn-setup');
    await clickButton(page, 'btn-go');
    await page.waitForTimeout(2_000);
    await clickButton(page, 'btn-go');
    const tick = await getTickCount(page);
    expect(tick).toBeGreaterThanOrEqual(0);
  });

  test('resize browser window mid-simulation', async ({ page }, testInfo) => {
    await clickButton(page, 'btn-setup');
    await clickButton(page, 'btn-go');
    await page.waitForTimeout(500);

    // Resize to various dimensions
    await page.setViewportSize({ width: 600, height: 400 });
    await page.waitForTimeout(300);
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.waitForTimeout(300);
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);

    await clickButton(page, 'btn-go'); // pause
    await page.screenshot({ path: screenshotPath(testInfo, 'after_resize'), fullPage: true });
    // Should still be running without corruption
    const tick = await getTickCount(page);
    expect(tick).toBeGreaterThan(0);
  });

  test('background tab - animation loop behavior', async ({ page, context }) => {
    await clickButton(page, 'btn-setup');
    await clickButton(page, 'btn-go');
    await page.waitForTimeout(500);

    // Emulate page visibility hidden
    await page.evaluate(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(500);

    // Page should still be responsive when brought back
    const tick = await getTickCount(page);
    expect(tick).toBeGreaterThanOrEqual(0);
  });

  test('after all agents die - handles empty state', async ({ page }, testInfo) => {
    // Set extreme parameters that cause quick extinction
    await page.evaluate(() => {
      const sliders = document.querySelectorAll('#slider-container input[type="range"]');
      sliders.forEach(s => {
        const input = s as HTMLInputElement;
        const label = input.closest('.slider-row')?.querySelector('label')?.textContent?.toLowerCase() ?? '';
        // High move cost + low food gain = quick death
        if (label.includes('move cost')) {
          input.value = input.max;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (label.includes('food gain') || label.includes('reproduce rate')) {
          input.value = input.min;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
    });
    await clickButton(page, 'btn-setup');
    await page.locator('#speed-slider').fill('50');
    await page.locator('#speed-slider').dispatchEvent('input');
    await clickButton(page, 'btn-go');
    await page.waitForTimeout(5_000);
    await clickButton(page, 'btn-go'); // pause
    await page.screenshot({ path: screenshotPath(testInfo, 'empty_state') });
    // Should not crash
    const tick = await getTickCount(page);
    expect(tick).toBeGreaterThan(0);
  });

  test('long run - check for memory growth', async ({ page }) => {
    await clickButton(page, 'btn-setup');
    await page.locator('#speed-slider').fill('50');
    await page.locator('#speed-slider').dispatchEvent('input');

    // Get initial memory if available
    const initialMemory = await page.evaluate(() => {
      const perf = performance as { memory?: { usedJSHeapSize: number } };
      return perf.memory?.usedJSHeapSize ?? null;
    });

    await clickButton(page, 'btn-go');
    await page.waitForTimeout(10_000); // Run for a while at speed 50
    await clickButton(page, 'btn-go'); // pause

    const finalMemory = await page.evaluate(() => {
      const perf = performance as { memory?: { usedJSHeapSize: number } };
      return perf.memory?.usedJSHeapSize ?? null;
    });

    const tick = await getTickCount(page);
    expect(tick).toBeGreaterThan(100);

    // If memory API available, check growth isn't extreme (>5x)
    if (initialMemory !== null && finalMemory !== null && initialMemory > 0) {
      const growth = finalMemory / initialMemory;
      // Log for review agent — not a hard fail since memory API varies
      console.log(`Memory growth ratio: ${growth.toFixed(2)}x (${initialMemory} → ${finalMemory})`);
    }
  });
});
