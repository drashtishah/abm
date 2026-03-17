// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderStats, renderChart } from './stats-overlay.js';
import type { World } from './types.js';
import type { ModelDefinition } from './model-registry.js';

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
    canvas: { width: 400, height: 200 },
  } as unknown as CanvasRenderingContext2D;
}

function makeWorld(overrides: Partial<World> = {}): World {
  return {
    agents: [],
    config: {},
    running: false,
    tick: 42,
    populationHistory: [],
    setup: vi.fn(),
    step: vi.fn(),
    reset: vi.fn(),
    updateConfig: vi.fn(),
    getPopulationCounts: vi.fn(() => ({ wolf: 30, sheep: 80, grass: 350 })),
    random: vi.fn(() => 0.5),
    ...overrides,
  };
}

const model: ModelDefinition = {
  id: 'test',
  name: 'Test',
  description: 'test',
  context: 'test',
  defaultConfig: {},
  configSchema: [],
  agentTypes: [
    { type: 'wolf', color: '#ff2daa', radius: 4, shape: 'circle' },
    { type: 'sheep', color: '#affff7', radius: 3, shape: 'circle' },
  ],
  createWorld: vi.fn() as unknown as ModelDefinition['createWorld'],
};

describe('stats-overlay', () => {
  it('renderStats shows population counts', () => {
    const ctx = makeCtx();
    const world = makeWorld();
    renderStats(ctx, world, model);

    const calls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls as unknown[][];
    const texts = calls.map(c => String(c[0]));
    expect(texts.some(t => t.includes('30'))).toBe(true);
    expect(texts.some(t => t.includes('80'))).toBe(true);
  });

  it('renderChart draws population graph', () => {
    const ctx = makeCtx();
    const history = Array.from({ length: 10 }, (_, i) => ({
      wolf: 50 - i,
      sheep: 100 + i,
      grass: 350,
    }));
    const world = makeWorld({ populationHistory: history });
    renderChart(ctx, world, model);

    expect(ctx.lineTo).toHaveBeenCalled();
  });

  it('chart uses agent type colors for population keys (singular→plural match)', () => {
    // Real model: agentTypes has type:"wolf", population key is "wolves"
    const realModel: ModelDefinition = {
      ...model,
      agentTypes: [
        { type: 'wolf', color: '#ff2daa', radius: 6, shape: 'triangle' },
        { type: 'sheep', color: '#affff7', radius: 5, shape: 'circle' },
      ],
    };

    // Track strokeStyle assignments
    const strokeCalls: string[] = [];
    const ctx = makeCtx();
    Object.defineProperty(ctx, 'strokeStyle', {
      set(v: string) { strokeCalls.push(v); },
      get() { return strokeCalls[strokeCalls.length - 1] ?? ''; },
      configurable: true,
    });

    const history = Array.from({ length: 10 }, () => ({
      wolf: 30,
      sheep: 100,
      grass: 200,
    }));
    const world = makeWorld({ populationHistory: history });
    renderChart(ctx, world, realModel);

    // Wolf line should use pink (#ff2daa) — "wolves".includes("wolf") matches
    expect(strokeCalls).toContain('#ff2daa');
  });

  it('chart excludes populations with showInChart: false', () => {
    const modelWithDisplay: ModelDefinition = {
      ...model,
      populationDisplay: [
        { key: 'wolf', label: 'Wolves', color: '#ff2daa' },
        { key: 'sheep', label: 'Sheep', color: '#affff7' },
        { key: 'grass', label: 'Grass', color: '#66ff55', showInChart: false },
      ],
    };

    const strokeCalls: string[] = [];
    const ctx = makeCtx();
    Object.defineProperty(ctx, 'strokeStyle', {
      set(v: string) { strokeCalls.push(v); },
      get() { return strokeCalls[strokeCalls.length - 1] ?? ''; },
      configurable: true,
    });

    const history = Array.from({ length: 10 }, () => ({
      wolf: 30,
      sheep: 100,
      grass: 200,
    }));
    const world = makeWorld({ populationHistory: history });
    renderChart(ctx, world, modelWithDisplay);

    // Wolf and sheep should be drawn, grass should not
    expect(strokeCalls).toContain('#ff2daa');
    expect(strokeCalls).toContain('#affff7');
  });

  it('chart uses populationDisplay colors when keys differ from agentTypes', () => {
    // Muscle model pattern: agentType is 'fiber' but population keys are 'muscleMass', etc.
    const muscleModel: ModelDefinition = {
      ...model,
      agentTypes: [
        { type: 'fiber', color: '#cc0000', radius: 4, shape: 'circle' },
      ],
      populationDisplay: [
        { key: 'muscleMass', label: 'Muscle Mass', color: '#ff4444' },
        { key: 'avgAnabolic', label: 'Avg Anabolic', color: '#44cc44' },
        { key: 'avgCatabolic', label: 'Avg Catabolic', color: '#cccc44' },
      ],
    };

    const strokeCalls: string[] = [];
    const ctx = makeCtx();
    Object.defineProperty(ctx, 'strokeStyle', {
      set(v: string) { strokeCalls.push(v); },
      get() { return strokeCalls[strokeCalls.length - 1] ?? ''; },
      configurable: true,
    });

    const history = Array.from({ length: 10 }, () => ({
      muscleMass: 5000,
      avgAnabolic: 100,
      avgCatabolic: 80,
    }));
    const world = makeWorld({ populationHistory: history });
    renderChart(ctx, world, muscleModel);

    // All three population lines should be drawn with their populationDisplay colors
    expect(strokeCalls).toContain('#ff4444');
    expect(strokeCalls).toContain('#44cc44');
    expect(strokeCalls).toContain('#cccc44');
  });

  it('stats overlay uses populationDisplay colors for non-agent-type keys', () => {
    const muscleModel: ModelDefinition = {
      ...model,
      agentTypes: [
        { type: 'fiber', color: '#cc0000', radius: 4, shape: 'circle' },
      ],
      populationDisplay: [
        { key: 'muscleMass', label: 'Muscle Mass', color: '#ff4444' },
      ],
    };

    const fillCalls: string[] = [];
    const ctx = makeCtx();
    Object.defineProperty(ctx, 'fillStyle', {
      set(v: string) { fillCalls.push(v); },
      get() { return fillCalls[fillCalls.length - 1] ?? ''; },
      configurable: true,
    });

    const world = makeWorld({
      getPopulationCounts: vi.fn(() => ({ muscleMass: 5000 })),
    });
    renderStats(ctx, world, muscleModel);

    // Should use populationDisplay color (#ff4444), not agent type color (#cc0000)
    expect(fillCalls).toContain('#ff4444');
    expect(fillCalls).not.toContain('#cc0000');
  });

  it('chart falls back to agentTypes when populationDisplay is undefined', () => {
    const strokeCalls: string[] = [];
    const ctx = makeCtx();
    Object.defineProperty(ctx, 'strokeStyle', {
      set(v: string) { strokeCalls.push(v); },
      get() { return strokeCalls[strokeCalls.length - 1] ?? ''; },
      configurable: true,
    });

    const history = Array.from({ length: 10 }, () => ({
      wolf: 30,
      sheep: 100,
      grass: 200,
    }));
    const world = makeWorld({ populationHistory: history });
    renderChart(ctx, world, model); // model has no populationDisplay

    // Should chart wolf and sheep (from agentTypes), not grass
    expect(strokeCalls).toContain('#ff2daa');
    expect(strokeCalls).toContain('#affff7');
  });
});
