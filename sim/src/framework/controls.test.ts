// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupControls } from './controls.js';
import type { World } from './types.js';

function makeWorld(): World {
  return {
    agents: [],
    config: { speed: 2 },
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

const defaultConfig = { speed: 1 };

describe('controls', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button id="btn-setup">Setup</button>
      <button id="btn-go">Go</button>
      <button id="btn-step">Step</button>
      <button id="btn-reset">Reset</button>
    `;
  });

  it('go button toggles running state', () => {
    const world = makeWorld();
    setupControls({ world, defaultConfig });

    const goBtn = document.getElementById('btn-go')!;
    goBtn.click();
    expect(world.running).toBe(true);

    goBtn.click();
    expect(world.running).toBe(false);
  });

  it('setup calls reset without changing config', () => {
    const world = makeWorld();
    setupControls({ world, defaultConfig });

    const setupBtn = document.getElementById('btn-setup')!;
    setupBtn.click();

    expect(world.reset).toHaveBeenCalled();
    // Config should NOT be overwritten with defaults
    expect(world.updateConfig).not.toHaveBeenCalled();
  });

  it('reset restores default config and calls reset', () => {
    const world = makeWorld();
    const onReset = vi.fn();
    setupControls({ world, defaultConfig, onReset });

    const resetBtn = document.getElementById('btn-reset')!;
    resetBtn.click();

    expect(world.updateConfig).toHaveBeenCalledWith(defaultConfig);
    expect(world.reset).toHaveBeenCalled();
    expect(onReset).toHaveBeenCalled();
  });

  it('step calls world.step when not running', () => {
    const world = makeWorld();
    setupControls({ world, defaultConfig });

    const stepBtn = document.getElementById('btn-step')!;
    stepBtn.click();

    expect(world.step).toHaveBeenCalled();
  });

  it('step does nothing when running', () => {
    const world = makeWorld();
    world.running = true;
    setupControls({ world, defaultConfig });

    const stepBtn = document.getElementById('btn-step')!;
    stepBtn.click();

    expect(world.step).not.toHaveBeenCalled();
  });
});
