/** Unit tests for muscle development behavior functions. */
import { describe, it, expect } from 'vitest';
import type { Agent } from '../../framework/types.js';
import type { HormonePatch } from './agent.js';
import {
  ANABOLIC_MIN, CATABOLIC_MIN, ANABOLIC_MAX, CATABOLIC_MAX,
} from './agent.js';
import {
  performDailyActivity,
  liftWeights,
  sleepRecover,
  grow,
  regulateFiber,
  regulateHormones,
  diffuse,
  computeMuscleMass,
  averageHormone,
} from './behaviors.js';

function makeFiber(overrides: Partial<Agent> = {}, meta: Record<string, unknown> = {}): Agent {
  return {
    id: 0, type: 'fiber', x: 12, y: 12,
    vx: 0, vy: 0, radius: 4, speed: 0,
    energy: 0, color: '#cc0000', alive: true,
    meta: { fiberSize: 5, maxSize: 10, gx: 0, gy: 0, ...meta },
    ...overrides,
  };
}

function makeGrid(size: number, anabolic = ANABOLIC_MIN, catabolic = CATABOLIC_MIN): HormonePatch[] {
  return Array.from({ length: size * size }, () => ({ anabolic, catabolic }));
}

describe('performDailyActivity', () => {
  it('increases both hormones proportional to log10(fiberSize)', () => {
    const agent = makeFiber();
    const hormones = makeGrid(1);
    const before = { a: hormones[0]!.anabolic, c: hormones[0]!.catabolic };

    performDailyActivity([agent], hormones, 1);

    expect(hormones[0]!.anabolic).toBeGreaterThan(before.a);
    expect(hormones[0]!.catabolic).toBeGreaterThan(before.c);
    // Anabolic gets 2.5x multiplier vs catabolic 2.0x
    const deltaA = hormones[0]!.anabolic - before.a;
    const deltaC = hormones[0]!.catabolic - before.c;
    expect(deltaA / deltaC).toBeCloseTo(2.5 / 2.0, 5);
  });

  it('skips dead agents', () => {
    const agent = makeFiber({ alive: false });
    const hormones = makeGrid(1);
    const before = { ...hormones[0]! };

    performDailyActivity([agent], hormones, 1);

    expect(hormones[0]!.anabolic).toBe(before.anabolic);
    expect(hormones[0]!.catabolic).toBe(before.catabolic);
  });
});

describe('liftWeights', () => {
  it('boosts hormones when intensity is 100 and rng returns 0', () => {
    const agent = makeFiber();
    const hormones = makeGrid(1);
    const before = { a: hormones[0]!.anabolic, c: hormones[0]!.catabolic };

    // rng() < (100/100)^2 = 1.0, so always recruited
    liftWeights([agent], hormones, 1, 100, () => 0);

    expect(hormones[0]!.anabolic - before.a).toBeGreaterThan(0);
    expect(hormones[0]!.catabolic - before.c).toBeGreaterThan(0);
    // Anabolic boost is 55 vs catabolic 44
    const deltaA = hormones[0]!.anabolic - before.a;
    const deltaC = hormones[0]!.catabolic - before.c;
    expect(deltaA / deltaC).toBeCloseTo(55 / 44, 5);
  });

  it('does nothing when intensity is 0', () => {
    const agent = makeFiber();
    const hormones = makeGrid(1);
    const before = { ...hormones[0]! };

    // threshold = (0/100)^2 = 0, rng() >= 0 always
    liftWeights([agent], hormones, 1, 0, () => 0.5);

    expect(hormones[0]!.anabolic).toBe(before.anabolic);
    expect(hormones[0]!.catabolic).toBe(before.catabolic);
  });
});

describe('sleepRecover', () => {
  it('reduces both hormones', () => {
    const hormones = makeGrid(1, 100, 100);
    const before = { a: hormones[0]!.anabolic, c: hormones[0]!.catabolic };

    sleepRecover(hormones, 8);

    expect(hormones[0]!.anabolic).toBeLessThan(before.a);
    expect(hormones[0]!.catabolic).toBeLessThan(before.c);
  });

  it('reduces nothing with 0 hours of sleep', () => {
    const hormones = makeGrid(1, 100, 100);
    const before = { a: hormones[0]!.anabolic, c: hormones[0]!.catabolic };

    sleepRecover(hormones, 0);

    expect(hormones[0]!.anabolic).toBe(before.a);
    expect(hormones[0]!.catabolic).toBe(before.c);
  });
});

describe('grow', () => {
  it('increases fiber size when anabolic dominates', () => {
    const agent = makeFiber({}, { fiberSize: 5, maxSize: 20, gx: 0, gy: 0 });
    // High anabolic, low catabolic → net growth
    const hormones: HormonePatch[] = [{ anabolic: 180, catabolic: 60 }];
    const before = agent.meta['fiberSize'] as number;

    grow(agent, hormones, 1);

    expect(agent.meta['fiberSize'] as number).toBeGreaterThan(before);
  });

  it('decreases fiber size when catabolic dominates', () => {
    const agent = makeFiber({}, { fiberSize: 5, maxSize: 20, gx: 0, gy: 0 });
    // Low anabolic, high catabolic → net loss
    const hormones: HormonePatch[] = [{ anabolic: 55, catabolic: 240 }];
    const before = agent.meta['fiberSize'] as number;

    grow(agent, hormones, 1);

    expect(agent.meta['fiberSize'] as number).toBeLessThan(before);
  });
});

describe('regulateFiber', () => {
  it('clamps fiber size to [1, maxSize]', () => {
    const agent = makeFiber({}, { fiberSize: -5, maxSize: 10, gx: 0, gy: 0 });
    regulateFiber(agent);
    expect(agent.meta['fiberSize']).toBe(1);

    agent.meta['fiberSize'] = 99;
    regulateFiber(agent);
    expect(agent.meta['fiberSize']).toBe(10);
  });

  it('sets radius proportional to fiber size', () => {
    const small = makeFiber({}, { fiberSize: 1, maxSize: 20, gx: 0, gy: 0 });
    regulateFiber(small);
    const large = makeFiber({}, { fiberSize: 20, maxSize: 20, gx: 0, gy: 0 });
    regulateFiber(large);

    expect(large.radius).toBeGreaterThan(small.radius);
  });

  it('sets colorIntensity between 0 and 1', () => {
    const agent = makeFiber({}, { fiberSize: 5, maxSize: 10, gx: 0, gy: 0 });
    regulateFiber(agent);
    const intensity = agent.meta['colorIntensity'] as number;
    expect(intensity).toBeGreaterThanOrEqual(0);
    expect(intensity).toBeLessThanOrEqual(1);
  });

  it('larger fibers have lower colorIntensity (darker)', () => {
    const small = makeFiber({}, { fiberSize: 2, maxSize: 20, gx: 0, gy: 0 });
    regulateFiber(small);
    const large = makeFiber({}, { fiberSize: 18, maxSize: 20, gx: 0, gy: 0 });
    regulateFiber(large);
    // Larger fiber → higher t → lower (1-t) intensity → darker shade
    expect((large.meta['colorIntensity'] as number)).toBeLessThan(small.meta['colorIntensity'] as number);
  });
});

describe('diffuse', () => {
  it('conserves total value', () => {
    const grid = [100, 0, 0, 0];
    const result = diffuse(grid, 2, 0.75);
    const before = grid.reduce((a, b) => a + b, 0);
    const after = result.reduce((a, b) => a + b, 0);
    expect(after).toBeCloseTo(before, 10);
  });

  it('spreads value to neighbors', () => {
    // 3x3 grid, high value in center
    const grid = [0, 0, 0, 0, 100, 0, 0, 0, 0];
    const result = diffuse(grid, 3, 0.75);
    // Center should have less, neighbors should have some
    expect(result[4]).toBeLessThan(100);
    expect(result[0]).toBeGreaterThan(0);
  });

  it('wraps around edges (torus)', () => {
    // 3x3, value at corner (0,0) should spread to (2,2) via wrapping
    const grid = [100, 0, 0, 0, 0, 0, 0, 0, 0];
    const result = diffuse(grid, 3, 0.75);
    // Corner (2,2) should receive some from (0,0)
    expect(result[8]).toBeGreaterThan(0);
  });
});

describe('regulateHormones', () => {
  it('clamps hormones to bounds after diffusion', () => {
    const hormones = makeGrid(3, 300, 400); // above maximums
    regulateHormones(hormones, 3);

    for (const p of hormones) {
      expect(p.anabolic).toBeLessThanOrEqual(ANABOLIC_MAX);
      expect(p.anabolic).toBeGreaterThanOrEqual(ANABOLIC_MIN);
      expect(p.catabolic).toBeLessThanOrEqual(CATABOLIC_MAX);
      expect(p.catabolic).toBeGreaterThanOrEqual(CATABOLIC_MIN);
    }
  });

  it('returns paired [anabolic, catabolic] ratios between 0 and 1', () => {
    const hormones = makeGrid(2);
    const ratios = regulateHormones(hormones, 2);
    expect(ratios).toHaveLength(4);
    for (const [a, c] of ratios) {
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(1);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(1);
    }
  });
});

describe('computeMuscleMass', () => {
  it('sums fiber sizes of alive agents divided by 100', () => {
    const agents = [
      makeFiber({}, { fiberSize: 5 }),
      makeFiber({}, { fiberSize: 10 }),
      makeFiber({ alive: false }, { fiberSize: 100 }),
    ];
    // (5 + 10) / 100 = 0.15, rounded to 1 decimal = 0.2
    expect(computeMuscleMass(agents)).toBe(0.2);
  });
});

describe('averageHormone', () => {
  it('computes mean of specified hormone', () => {
    const hormones: HormonePatch[] = [
      { anabolic: 100, catabolic: 50 },
      { anabolic: 200, catabolic: 150 },
    ];
    expect(averageHormone(hormones, 'anabolic')).toBe(150);
    expect(averageHormone(hormones, 'catabolic')).toBe(100);
  });

  it('returns 0 for empty array', () => {
    expect(averageHormone([], 'anabolic')).toBe(0);
  });
});
