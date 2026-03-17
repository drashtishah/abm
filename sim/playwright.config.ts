import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  outputDir: './test-results',
  retries: process.env['CI'] ? 1 : 0,
  workers: process.env['CI'] ? 2 : undefined,
  timeout: 60_000,
  expect: { timeout: 10_000 },

  webServer: {
    command: 'npm run dev -- --port 5174',
    port: 5174,
    reuseExistingServer: true,
  },

  use: {
    baseURL: 'http://localhost:5174',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [
    // --- Chromium ---
    {
      name: 'chromium-desktop-large',
      use: { browserName: 'chromium', viewport: { width: 1920, height: 1080 } },
    },
    {
      name: 'chromium-desktop-standard',
      use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'chromium-tablet-landscape',
      use: { browserName: 'chromium', viewport: { width: 1024, height: 768 } },
    },
    {
      name: 'chromium-tablet-portrait',
      use: { browserName: 'chromium', viewport: { width: 768, height: 1024 } },
    },
    {
      name: 'chromium-mobile-large',
      use: { browserName: 'chromium', viewport: { width: 430, height: 932 }, isMobile: true },
    },
    {
      name: 'chromium-mobile-standard',
      use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, isMobile: true },
    },
    {
      name: 'chromium-mobile-small',
      use: { browserName: 'chromium', viewport: { width: 375, height: 667 }, isMobile: true },
    },

    // --- Firefox ---
    {
      name: 'firefox-desktop-large',
      use: { browserName: 'firefox', viewport: { width: 1920, height: 1080 } },
    },
    {
      name: 'firefox-desktop-standard',
      use: { browserName: 'firefox', viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'firefox-tablet-landscape',
      use: { browserName: 'firefox', viewport: { width: 1024, height: 768 } },
    },
    {
      name: 'firefox-tablet-portrait',
      use: { browserName: 'firefox', viewport: { width: 768, height: 1024 } },
    },
    {
      name: 'firefox-mobile-large',
      use: { browserName: 'firefox', viewport: { width: 430, height: 932 } },
    },
    {
      name: 'firefox-mobile-standard',
      use: { browserName: 'firefox', viewport: { width: 390, height: 844 } },
    },
    {
      name: 'firefox-mobile-small',
      use: { browserName: 'firefox', viewport: { width: 375, height: 667 } },
    },

    // --- WebKit ---
    {
      name: 'webkit-desktop-large',
      use: { browserName: 'webkit', viewport: { width: 1920, height: 1080 } },
    },
    {
      name: 'webkit-desktop-standard',
      use: { browserName: 'webkit', viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'webkit-tablet-landscape',
      use: { browserName: 'webkit', viewport: { width: 1024, height: 768 } },
    },
    {
      name: 'webkit-tablet-portrait',
      use: { browserName: 'webkit', viewport: { width: 768, height: 1024 } },
    },
    {
      name: 'webkit-mobile-large',
      use: { browserName: 'webkit', viewport: { width: 430, height: 932 }, isMobile: true },
    },
    {
      name: 'webkit-mobile-standard',
      use: { browserName: 'webkit', viewport: { width: 390, height: 844 }, isMobile: true },
    },
    {
      name: 'webkit-mobile-small',
      use: { browserName: 'webkit', viewport: { width: 375, height: 667 }, isMobile: true },
    },
  ],
});
