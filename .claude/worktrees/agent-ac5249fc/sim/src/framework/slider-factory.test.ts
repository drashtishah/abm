// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSliders } from './slider-factory.js';
import type { World } from './types.js';
import type { ModelDefinition } from './model-registry.js';

function makeWorld(): World {
  return {
    agents: [],
    config: { preyCount: 100 },
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

const model: ModelDefinition = {
  id: 'test',
  name: 'Test',
  description: 'test',
  context: 'test',
  defaultConfig: { preyCount: 100 },
  configSchema: [
    { key: 'preyCount', label: 'Prey Count', min: 1, max: 200, step: 1, default: 100 },
  ],
  agentTypes: [],
  createWorld: vi.fn() as unknown as ModelDefinition['createWorld'],
};

describe('slider-factory', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('slider dispatches updateConfig', () => {
    const world = makeWorld();
    createSliders(model, world, container);

    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(slider).not.toBeNull();

    slider.value = '75';
    slider.dispatchEvent(new Event('input'));

    expect(world.updateConfig).toHaveBeenCalledWith({ preyCount: 75 });
  });

  it('slider label reflects value', () => {
    const world = makeWorld();
    createSliders(model, world, container);

    const valueSpan = container.querySelector('.slider-value');
    expect(valueSpan).not.toBeNull();
    expect(valueSpan!.textContent).toBe('100');

    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
    slider.value = '42';
    slider.dispatchEvent(new Event('input'));

    expect(valueSpan!.textContent).toBe('42');
  });
});
