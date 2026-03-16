// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render } from './canvas-renderer.js';
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
    closePath: vi.fn(),
    stroke: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    font: '',
    lineWidth: 1,
    canvas: { width: 800, height: 600 },
  } as unknown as CanvasRenderingContext2D;
}

function makeWorld(overrides: Partial<World> = {}): World {
  return {
    agents: [],
    config: {},
    running: false,
    tick: 0,
    populationHistory: [],
    extraState: undefined,
    setup: vi.fn(),
    step: vi.fn(),
    reset: vi.fn(),
    updateConfig: vi.fn(),
    getPopulationCounts: vi.fn(() => ({})),
    random: vi.fn(() => 0.5),
    ...overrides,
  };
}

const model: ModelDefinition = {
  id: 'test',
  name: 'Test Model',
  description: 'A test model',
  context: 'testing',
  defaultConfig: {},
  configSchema: [],
  agentTypes: [
    { type: 'wolf', color: '#ff4444', radius: 5, shape: 'circle' },
    { type: 'sheep', color: '#ffffff', radius: 4, shape: 'circle' },
  ],
  createWorld: vi.fn() as unknown as ModelDefinition['createWorld'],
};

describe('canvas-renderer', () => {
  it('render clears canvas', () => {
    const ctx = makeCtx();
    const world = makeWorld();
    render(ctx, world, model);

    expect(ctx.fillRect).toHaveBeenCalled();
    const firstCall = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(firstCall).toEqual([0, 0, 800, 600]);
  });

  it('render draws grass grid', () => {
    const ctx = makeCtx();
    const gs = 3;
    const grass = [];
    for (let y = 0; y < gs; y++) {
      for (let x = 0; x < gs; x++) {
        grass.push({ x, y, alive: true });
      }
    }
    const world = makeWorld({
      config: { grassGridSize: gs },
      extraState: { grass },
    });

    render(ctx, world, model);

    // 1 clear call + gridSize*gridSize grass patches
    expect(ctx.fillRect).toHaveBeenCalledTimes(1 + gs * gs);
  });

  it('render draws each alive agent', () => {
    const ctx = makeCtx();
    const agents = [
      ...Array.from({ length: 5 }, (_, i) => ({
        id: i, type: 'sheep', x: i * 10, y: i * 10, vx: 0, vy: 0,
        radius: 4, speed: 1, energy: 10, color: '#ffffff', alive: true, meta: {},
      })),
      ...Array.from({ length: 2 }, (_, i) => ({
        id: i + 5, type: 'wolf', x: i * 10, y: i * 10, vx: 0, vy: 0,
        radius: 5, speed: 1, energy: 0, color: '#ff4444', alive: false, meta: {},
      })),
    ];
    const world = makeWorld({ agents });

    render(ctx, world, model);

    expect(ctx.arc).toHaveBeenCalledTimes(5);
  });

  it('render uses correct colors', () => {
    const styles: string[] = [];
    const trackingCtx = {
      ...makeCtx(),
      set fillStyle(v: string) { styles.push(v); },
      get fillStyle() { return styles[styles.length - 1] ?? ''; },
    } as unknown as CanvasRenderingContext2D;

    const agents = [
      { id: 1, type: 'wolf', x: 10, y: 10, vx: 0, vy: 0, radius: 5, speed: 1, energy: 10, color: '#ff4444', alive: true, meta: {} },
      { id: 2, type: 'sheep', x: 20, y: 20, vx: 0, vy: 0, radius: 4, speed: 1, energy: 10, color: '#ffffff', alive: true, meta: {} },
    ];
    const world = makeWorld({ agents });

    render(trackingCtx, world, model);

    expect(styles).toContain('#ff4444');
    expect(styles).toContain('#ffffff');
  });

  it('render draws triangle for triangle-shaped agents', () => {
    const ctx = makeCtx();
    const triangleModel: ModelDefinition = {
      ...model,
      agentTypes: [
        { type: 'wolf', color: '#ff4444', radius: 5, shape: 'triangle' },
        { type: 'sheep', color: '#ffffff', radius: 4, shape: 'circle' },
      ],
    };
    const agents = [
      { id: 1, type: 'wolf', x: 100, y: 100, vx: 0, vy: 0, radius: 5, speed: 1, energy: 10, color: '#ff4444', alive: true, meta: {} },
      { id: 2, type: 'sheep', x: 200, y: 200, vx: 0, vy: 0, radius: 4, speed: 1, energy: 10, color: '#ffffff', alive: true, meta: {} },
    ];
    const world = makeWorld({ agents, config: { width: 800, height: 600 } });

    render(ctx, world, triangleModel);

    // Wolf is a triangle: moveTo + 2x lineTo + closePath, no arc
    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalledTimes(2);
    expect(ctx.closePath).toHaveBeenCalled();
    // Sheep is a circle: 1 arc call
    expect(ctx.arc).toHaveBeenCalledTimes(1);
  });

  it('render skips dead agents', () => {
    const ctx = makeCtx();
    const agents = [
      { id: 1, type: 'wolf', x: 10, y: 10, vx: 0, vy: 0, radius: 5, speed: 1, energy: 0, color: '#ff4444', alive: false, meta: {} },
    ];
    const world = makeWorld({ agents });

    render(ctx, world, model);

    expect(ctx.arc).not.toHaveBeenCalled();
  });
});
