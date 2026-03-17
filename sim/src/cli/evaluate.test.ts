import { describe, it, expect } from 'vitest';
import { evaluate } from './evaluate.js';
import type { ExpectedPattern } from '../framework/types.js';

const oscillationCriteria: ExpectedPattern = {
  type: 'oscillation',
  description: 'test oscillation',
  minTicks: 100,
  populations: ['predator', 'prey'],
  minCycles: 2,
  maxExtinctionRate: 0.1,
};

function makeSineHistory(ticks: number, period: number): Record<string, number>[] {
  const history: Record<string, number>[] = [];
  for (let t = 0; t < ticks; t++) {
    history.push({
      predator: Math.round(50 + 30 * Math.sin(2 * Math.PI * t / period)),
      prey: Math.round(50 + 30 * Math.cos(2 * Math.PI * t / period)),
    });
  }
  return history;
}

function makeFlatHistory(ticks: number, value: number): Record<string, number>[] {
  return Array.from({ length: ticks }, () => ({ predator: value, prey: value }));
}

describe('evaluate', () => {
  describe('oscillation', () => {
    it('scores clean sine waves highly', () => {
      const history = makeSineHistory(200, 50);
      const result = evaluate(history, oscillationCriteria);
      expect(result.score).toBeGreaterThan(0.7);
      expect(result.passed).toBe(true);
    });

    it('scores flat populations low', () => {
      const history = makeFlatHistory(200, 50);
      const result = evaluate(history, oscillationCriteria);
      expect(result.score).toBeLessThan(0.5);
      expect(result.passed).toBe(false);
    });

    it('returns 0 for too-short history', () => {
      const history = makeSineHistory(50, 25);
      const result = evaluate(history, oscillationCriteria);
      expect(result.score).toBe(0);
      expect(result.passed).toBe(false);
    });

    it('penalizes extinction', () => {
      const history = makeSineHistory(200, 50);
      // Force extinction at tick 150
      for (let i = 150; i < 200; i++) history[i]!['predator'] = 0;
      const result = evaluate(history, oscillationCriteria);
      // Score should be reduced due to extinction penalty
      const cleanResult = evaluate(makeSineHistory(200, 50), oscillationCriteria);
      expect(result.score).toBeLessThan(cleanResult.score);
    });
  });

  describe('equilibrium', () => {
    it('scores stable populations highly', () => {
      const criteria: ExpectedPattern = {
        type: 'equilibrium',
        description: 'test equilibrium',
        minTicks: 100,
        populations: ['a'],
        stabilizeByTick: 50,
        maxVariance: 10,
      };
      // Noisy start, then stable
      const history: Record<string, number>[] = [];
      for (let t = 0; t < 200; t++) {
        history.push({ a: t < 50 ? 50 + (t % 20) : 50 + (Math.random() < 0.5 ? 1 : -1) });
      }
      const result = evaluate(history, criteria);
      expect(result.score).toBeGreaterThan(0.7);
      expect(result.passed).toBe(true);
    });
  });

  describe('epidemic-curve', () => {
    it('scores peak-then-decline pattern', () => {
      const criteria: ExpectedPattern = {
        type: 'epidemic-curve',
        description: 'test epidemic',
        minTicks: 100,
        populations: ['infected'],
        peakWithinTicks: 80,
        mustDecline: true,
      };
      const history: Record<string, number>[] = [];
      for (let t = 0; t < 200; t++) {
        // Bell curve peaking at t=50
        history.push({ infected: Math.round(100 * Math.exp(-((t - 50) ** 2) / 500)) });
      }
      const result = evaluate(history, criteria);
      expect(result.score).toBeGreaterThan(0.6);
      expect(result.passed).toBe(true);
    });
  });

  describe('--score flag parsing', () => {
    it('parses --score flag', async () => {
      const { parseArgs } = await import('./args.js');
      const args = parseArgs(['--score']);
      expect(args.score).toBe(true);
    });

    it('score defaults to false', async () => {
      const { parseArgs } = await import('./args.js');
      const args = parseArgs([]);
      expect(args.score).toBe(false);
    });
  });
});
