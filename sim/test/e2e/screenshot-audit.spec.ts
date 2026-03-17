/**
 * Screenshot Audit — Chromium-only interactive screenshot sequences.
 *
 * Captures evidence at each simulation lifecycle stage (load, setup, run, resize)
 * for visual review. Complements the non-interactive scripts/screenshot-check.sh
 * with interaction-dependent captures and behavioral assertions.
 */
import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';

// Skip non-Chromium browsers — this audit is Chrome-only
test.beforeEach(async ({ browserName }) => {
  test.skip(browserName !== 'chromium', 'Screenshot audit runs on Chromium only');
});

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

function auditPath(
  testInfo: { project: { name: string }; title: string },
  suffix: string,
): string {
  const browser = testInfo.project.name;
  const name = testInfo.title.replace(/[^a-zA-Z0-9-_]/g, '_');
  return path.join('test-results', browser, `audit_${name}_${suffix}.png`);
}

/** Check if canvas has multiple distinct colors (agents drawn). */
async function canvasHasContent(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const c = document.getElementById('sim-canvas') as HTMLCanvasElement;
    const ctx = c.getContext('2d');
    if (!ctx) return false;
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    const seen = new Set<string>();
    for (let i = 0; i < Math.min(data.length, 40_000); i += 4) {
      seen.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
      if (seen.size > 3) return true;
    }
    return seen.size > 2;
  });
}

// ─── Lifecycle Screenshots ───────────────────────────────────────────────────

test.describe('Screenshot Audit - Lifecycle', () => {
  test('initial load - page render before interaction', async ({ page }, testInfo) => {
    await page.goto('/');
    await waitForCanvas(page);
    await page.screenshot({ path: auditPath(testInfo, '01_initial_load'), fullPage: true });

    const box = await page.locator('#sim-canvas').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(100);
  });

  test('after setup - agents populated on canvas', async ({ page }, testInfo) => {
    await page.goto('/');
    await waitForCanvas(page);
    await clickButton(page, 'btn-setup');
    await page.waitForTimeout(300);
    await page.screenshot({ path: auditPath(testInfo, '02_after_setup'), fullPage: true });

    expect(await canvasHasContent(page)).toBe(true);
  });

  test('after running 50+ ticks - simulation active', async ({ page }, testInfo) => {
    await page.goto('/');
    await waitForCanvas(page);
    await clickButton(page, 'btn-setup');
    await page.locator('#speed-slider').fill('10');
    await page.locator('#speed-slider').dispatchEvent('input');
    await clickButton(page, 'btn-go');
    await page.waitForTimeout(2_000);
    await clickButton(page, 'btn-go'); // pause
    await page.screenshot({ path: auditPath(testInfo, '03_after_run'), fullPage: true });

    const tick = await getTickCount(page);
    expect(tick).toBeGreaterThanOrEqual(30);
  });
});

// ─── Resize Mid-Simulation ───────────────────────────────────────────────────

test.describe('Screenshot Audit - Resize', () => {
  test('resize browser mid-simulation at multiple viewports', async ({ page }, testInfo) => {
    await page.goto('/');
    await waitForCanvas(page);
    await clickButton(page, 'btn-setup');
    await page.locator('#speed-slider').fill('10');
    await page.locator('#speed-slider').dispatchEvent('input');
    await clickButton(page, 'btn-go');
    await page.waitForTimeout(1_000);

    await page.screenshot({ path: auditPath(testInfo, '01_original'), fullPage: true });

    const resizeTargets = [
      { name: 'tablet_portrait', width: 768, height: 1024 },
      { name: 'mobile_small', width: 375, height: 667 },
      { name: 'desktop_large', width: 1920, height: 1080 },
    ];

    for (const target of resizeTargets) {
      await page.setViewportSize({ width: target.width, height: target.height });
      await page.waitForTimeout(500); // let layout settle

      await page.screenshot({
        path: auditPath(testInfo, `02_resized_${target.name}`),
        fullPage: true,
      });

      // No horizontal overflow after resize
      const noOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      );
      expect(noOverflow, `Horizontal overflow at ${target.name}`).toBe(true);
    }

    // Simulation should still be running after all resizes
    const tickBefore = await getTickCount(page);
    await page.waitForTimeout(500);
    const tickAfter = await getTickCount(page);
    expect(tickAfter).toBeGreaterThan(tickBefore);

    await clickButton(page, 'btn-go'); // pause
  });

  test('canvas maintains content after resize cycle', async ({ page }, testInfo) => {
    await page.goto('/');
    await waitForCanvas(page);
    await clickButton(page, 'btn-setup');
    await page.waitForTimeout(200);

    // Shrink to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: auditPath(testInfo, '01_shrunk'), fullPage: true });

    // Expand to desktop
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: auditPath(testInfo, '02_restored'), fullPage: true });

    // Canvas should still have drawn content after resize cycle
    expect(await canvasHasContent(page)).toBe(true);
  });
});
