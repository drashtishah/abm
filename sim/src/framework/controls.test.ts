// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupControls } from './controls.js';
import type { World } from './types.js';

function makeWorld(): World {
  return {
    agents: [],
    config: {},
    running: false,
    tick: 0,
    populationHistory: [],
    setup: vi.fn(),
    step: vi.fn(),
    reset: vi.fn(),
    updateConfig: vi.fn(),
    getPopulationCounts: vi.fn(() => ({})),
    random: vi.fn(() => 0.5),
  };
}

describe('controls', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button id="btn-setup">Setup</button>
      <button id="btn-go">Go</button>
      <button id="btn-step">Step</button>
      <button id="btn-reset">Reset</button>
    `;
  });

  it('play button sets running to true', () => {
    const world = makeWorld();
    setupControls(world);

    const goBtn = document.getElementById('btn-go')!;
    goBtn.click();

    expect(world.running).toBe(true);
  });

  it('pause button sets running to false', () => {
    const world = makeWorld();
    setupControls(world);

    const goBtn = document.getElementById('btn-go')!;
    goBtn.click(); // start
    goBtn.click(); // stop

    expect(world.running).toBe(false);
  });

  it('reset calls world.reset', () => {
    const world = makeWorld();
    setupControls(world);

    const resetBtn = document.getElementById('btn-reset')!;
    resetBtn.click();

    expect(world.reset).toHaveBeenCalled();
  });
});
