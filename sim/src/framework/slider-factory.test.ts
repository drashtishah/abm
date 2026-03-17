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

const modelWithHidden: ModelDefinition = {
  id: 'test-hidden',
  name: 'Test Hidden',
  description: 'test',
  context: 'test',
  defaultConfig: { width: 800, height: 600, preyCount: 100 },
  configSchema: [
    { key: 'width', label: 'Width', min: 400, max: 1200, step: 100, default: 800, tier: 'hidden' as const },
    { key: 'height', label: 'Height', min: 300, max: 900, step: 100, default: 600, tier: 'hidden' as const },
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

  it('skips fields with tier hidden', () => {
    const world = makeWorld();
    world.config = { width: 800, height: 600, preyCount: 100 };
    createSliders(modelWithHidden, world, container);

    const sliders = container.querySelectorAll('input[type="range"]');
    expect(sliders).toHaveLength(1);

    const slider = sliders[0] as HTMLInputElement;
    expect(slider.id).toBe('slider-preyCount');
  });

  it('renders advanced tier fields alongside core fields', () => {
    const tieredModel: ModelDefinition = {
      id: 'test-tiers',
      name: 'Test Tiers',
      description: '',
      context: '',
      defaultConfig: { a: 1, b: 2 },
      configSchema: [
        { key: 'a', label: 'Core Param', min: 0, max: 10, step: 1, default: 1, tier: 'core' },
        { key: 'b', label: 'Advanced Param', min: 0, max: 10, step: 1, default: 2, tier: 'advanced' },
      ],
      agentTypes: [],
      createWorld: vi.fn() as unknown as ModelDefinition['createWorld'],
    };
    const world = makeWorld();
    world.config = { a: 1, b: 2 };
    createSliders(tieredModel, world, container);

    // Both fields rendered directly, no collapsible section
    const sliders = container.querySelectorAll('input[type="range"]');
    expect(sliders).toHaveLength(2);
    expect((sliders[0] as HTMLInputElement).id).toBe('slider-a');
    expect((sliders[1] as HTMLInputElement).id).toBe('slider-b');
    expect(container.querySelector('.advanced-toggle')).toBeNull();
    expect(container.querySelector('.advanced-params')).toBeNull();
  });

  it('renders info tooltip when field has info', () => {
    const infoModel: ModelDefinition = {
      id: 'test-info',
      name: 'Test Info',
      description: '',
      context: '',
      defaultConfig: { a: 1 },
      configSchema: [
        { key: 'a', label: 'Param A', min: 0, max: 10, step: 1, default: 1, info: 'Help text' },
      ],
      agentTypes: [],
      createWorld: vi.fn() as unknown as ModelDefinition['createWorld'],
    };
    const world = makeWorld();
    world.config = { a: 1 };
    createSliders(infoModel, world, container);

    const tooltip = container.querySelector('.info-tooltip');
    expect(tooltip).not.toBeNull();
    expect(tooltip!.textContent).toBe('Help text');

    const label = container.querySelector('label.has-info');
    expect(label).not.toBeNull();
    expect(label!.getAttribute('aria-describedby')).toBe('tooltip-a');
    // Tooltip is a child of the label (CSS hover reveals it)
    expect(label!.contains(tooltip)).toBe(true);
  });
});
