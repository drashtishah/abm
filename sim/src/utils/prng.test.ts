import { describe, it, expect } from 'vitest';
import { mulberry32 } from './prng.js';

describe('mulberry32', () => {
  it('produces deterministic sequence for same seed', () => {
    const rng1 = mulberry32(42);
    const rng2 = mulberry32(42);
    const seq1 = Array.from({ length: 100 }, () => rng1());
    const seq2 = Array.from({ length: 100 }, () => rng2());
    expect(seq1).toEqual(seq2);
  });

  it('produces values in [0, 1)', () => {
    const rng = mulberry32(12345);
    for (let i = 0; i < 1000; i++) {
      const val = rng();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('different seeds produce different sequences', () => {
    const rng1 = mulberry32(1);
    const rng2 = mulberry32(2);
    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());
    expect(seq1).not.toEqual(seq2);
  });

  it('has reasonable distribution', () => {
    const rng = mulberry32(999);
    let below = 0;
    const n = 10000;
    for (let i = 0; i < n; i++) {
      if (rng() < 0.5) below++;
    }
    // Expect roughly 50/50 split within 5% tolerance
    expect(below / n).toBeGreaterThan(0.45);
    expect(below / n).toBeLessThan(0.55);
  });
});
