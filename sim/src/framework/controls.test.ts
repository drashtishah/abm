import { describe, it, expect } from 'vitest';
import { randomizeConfig } from './controls.js';
import type { ConfigField } from './model-registry.js';

const schema: ConfigField[] = [
  { key: 'count', label: 'Count', min: 10, max: 100, step: 5, default: 50, tier: 'core' },
  { key: 'rate', label: 'Rate', min: 1, max: 20, step: 1, default: 5, tier: 'advanced' },
  { key: 'hidden', label: 'Hidden', min: 0, max: 10, step: 1, default: 0, tier: 'hidden' },
];

describe('randomizeConfig', () => {
  it('generates values within [min, max] for non-hidden fields', () => {
    const result = randomizeConfig(schema);
    expect(result['count']).toBeGreaterThanOrEqual(10);
    expect(result['count']).toBeLessThanOrEqual(100);
    expect(result['rate']).toBeGreaterThanOrEqual(1);
    expect(result['rate']).toBeLessThanOrEqual(20);
  });

  it('excludes hidden fields from randomization', () => {
    const result = randomizeConfig(schema);
    expect(result['hidden']).toBeUndefined();
  });

  it('snaps values to step increments from min', () => {
    for (let i = 0; i < 50; i++) {
      const result = randomizeConfig(schema);
      expect((result['count']! - 10) % 5).toBe(0);
    }
  });
});
