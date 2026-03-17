/**
 * TypeScript-native pattern evaluators for headless model scoring.
 * Simplified port of sim/science/scripts/evaluators.py — avoids Python dependency
 * for the tight experiment feedback loop. The Python version remains the reference
 * implementation for the full scientist pipeline (Morris/Sobol/Optimization).
 */

import type { ExpectedPattern } from '../framework/types.js';

export interface EvalResult {
  score: number;
  passed: boolean;
  details: Record<string, unknown>;
}

/**
 * Find peaks in a series using prominence-based detection.
 * Simplified version of scipy.signal.find_peaks with distance + prominence.
 */
function findPeaks(series: number[], minDistance: number, minProminence: number): number[] {
  const peaks: number[] = [];
  for (let i = 1; i < series.length - 1; i++) {
    if (series[i]! > series[i - 1]! && series[i]! > series[i + 1]!) {
      // Check distance from last peak
      if (peaks.length > 0 && i - peaks[peaks.length - 1]! < minDistance) continue;

      // Check prominence: how much the peak stands above surrounding valleys
      let leftMin = series[i]!;
      for (let j = i - 1; j >= Math.max(0, i - minDistance); j--) {
        leftMin = Math.min(leftMin, series[j]!);
      }
      let rightMin = series[i]!;
      for (let j = i + 1; j <= Math.min(series.length - 1, i + minDistance); j++) {
        rightMin = Math.min(rightMin, series[j]!);
      }
      const prominence = series[i]! - Math.max(leftMin, rightMin);
      if (prominence >= minProminence) {
        peaks.push(i);
      }
    }
  }
  return peaks;
}

/** Moving average smoothing (same kernel size as Python: 5). */
function smooth(series: number[], windowSize: number = 5): number[] {
  if (series.length <= windowSize) return [...series];
  const result: number[] = [];
  for (let i = 0; i <= series.length - windowSize; i++) {
    let sum = 0;
    for (let j = 0; j < windowSize; j++) sum += series[i + j]!;
    result.push(sum / windowSize);
  }
  return result;
}

function range(series: number[]): number {
  let min = Infinity;
  let max = -Infinity;
  for (const v of series) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return max - min;
}

function variance(series: number[]): number {
  if (series.length === 0) return 0;
  const mean = series.reduce((a, b) => a + b, 0) / series.length;
  return series.reduce((sum, v) => sum + (v - mean) ** 2, 0) / series.length;
}

/**
 * Evaluate oscillation pattern (Lotka-Volterra cycles).
 * Mirrors evaluators.py evaluate_oscillation().
 */
function evaluateOscillation(
  history: Record<string, number>[],
  criteria: { minCycles: number; maxExtinctionRate: number; populations: string[]; minTicks: number },
): EvalResult {
  if (history.length < criteria.minTicks) {
    return { score: 0, passed: false, details: { error: `only ${history.length} ticks, need ${criteria.minTicks}` } };
  }

  let extinct = false;
  const cycleCounts: number[] = [];

  for (const pop of criteria.populations) {
    const series = history.map(h => h[pop] ?? 0);

    // Check extinction
    if (series.some(v => v === 0)) extinct = true;

    // Smooth and find peaks
    const smoothed = series.length > 10 ? smooth(series) : series;
    const rawRange = range(series);
    const minProminence = Math.max(rawRange * 0.1, 1.0);
    const peaks = findPeaks(smoothed, 20, minProminence);
    cycleCounts.push(peaks.length);
  }

  const avgCycles = cycleCounts.length > 0 ? cycleCounts.reduce((a, b) => a + b, 0) / cycleCounts.length : 0;
  const cycleScore = Math.min(1.0, avgCycles / criteria.minCycles);
  const survivalScore = extinct ? 0.5 : 1.0;
  let score = cycleScore * 0.7 + survivalScore * 0.3;

  // Single replicate — extinction rate is 0 or 1
  const extinctionRate = extinct ? 1.0 : 0.0;
  if (extinctionRate > criteria.maxExtinctionRate) {
    score *= 0.5;
  }

  const passed = score > 0.5 && extinctionRate <= criteria.maxExtinctionRate;

  return {
    score: Math.round(score * 10000) / 10000,
    passed,
    details: { avgCycles, extinctionRate, cycleCounts },
  };
}

/** Evaluate equilibrium pattern (converge to steady state). */
function evaluateEquilibrium(
  history: Record<string, number>[],
  criteria: { stabilizeByTick: number; maxVariance: number; populations: string[]; minTicks: number },
): EvalResult {
  if (history.length < criteria.minTicks) {
    return { score: 0, passed: false, details: { error: `only ${history.length} ticks, need ${criteria.minTicks}` } };
  }

  const popScores: number[] = [];
  for (const pop of criteria.populations) {
    const series = history.map(h => h[pop] ?? 0);
    const tail = series.slice(criteria.stabilizeByTick);
    if (tail.length === 0) {
      popScores.push(0);
      continue;
    }
    const v = variance(tail);
    popScores.push(v <= criteria.maxVariance ? 1.0 : criteria.maxVariance / v);
  }

  const score = popScores.length > 0 ? popScores.reduce((a, b) => a + b, 0) / popScores.length : 0;
  return {
    score: Math.round(score * 10000) / 10000,
    passed: score > 0.7,
    details: { popScores },
  };
}

/** Evaluate epidemic curve pattern (single peak then decline). */
function evaluateEpidemicCurve(
  history: Record<string, number>[],
  criteria: { peakWithinTicks: number; mustDecline: boolean; populations: string[]; minTicks: number },
): EvalResult {
  if (history.length < criteria.minTicks) {
    return { score: 0, passed: false, details: { error: `only ${history.length} ticks, need ${criteria.minTicks}` } };
  }

  const popScores: number[] = [];
  for (const pop of criteria.populations) {
    const series = history.map(h => h[pop] ?? 0);
    let peakIdx = 0;
    let peakVal = series[0]!;
    for (let i = 1; i < series.length; i++) {
      if (series[i]! > peakVal) { peakVal = series[i]!; peakIdx = i; }
    }

    let score = 1.0;
    if (peakIdx > criteria.peakWithinTicks) {
      score *= criteria.peakWithinTicks / peakIdx;
    }
    if (criteria.mustDecline && peakIdx < series.length - 10) {
      const postPeak = series.slice(peakIdx);
      if (postPeak[postPeak.length - 1]! >= postPeak[0]! * 0.9) {
        score *= 0.3;
      }
    }
    popScores.push(score);
  }

  const score = popScores.length > 0 ? popScores.reduce((a, b) => a + b, 0) / popScores.length : 0;
  return {
    score: Math.round(score * 10000) / 10000,
    passed: score > 0.6,
    details: { popScores },
  };
}

/** Dispatch to the correct evaluator based on pattern type. */
export function evaluate(history: Record<string, number>[], pattern: ExpectedPattern): EvalResult {
  switch (pattern.type) {
    case 'oscillation':
      return evaluateOscillation(history, pattern);
    case 'equilibrium':
      return evaluateEquilibrium(history, pattern);
    case 'epidemic-curve':
      return evaluateEpidemicCurve(history, pattern);
    case 'segregation':
      return { score: 0, passed: false, details: { error: 'segregation evaluator requires spatial data' } };
  }
}
