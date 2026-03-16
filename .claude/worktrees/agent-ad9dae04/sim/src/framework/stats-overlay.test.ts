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
    getPopulationCounts: vi.fn(() => ({ wolves: 30, sheep: 80, grass: 350 })),
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
    { type: 'wolves', color: '#ff2daa', radius: 4, shape: 'circle' },
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
      wolves: 50 - i,
      sheep: 100 + i,
      grass: 350,
    }));
    const world = makeWorld({ populationHistory: history });
    renderChart(ctx, world, model);

    expect(ctx.lineTo).toHaveBeenCalled();
  });
});
