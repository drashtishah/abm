export interface Agent {
  id: number;
  type: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  speed: number;
  energy: number;
  color: string;
  alive: boolean;
  meta: Record<string, unknown>;
}

export interface WorldState {
  agents: Agent[];
  config: Record<string, number>;
  running: boolean;
  tick: number;
  populationHistory: Record<string, number>[];
  extraState?: unknown;
}

export interface World extends WorldState {
  setup(): void;
  step(): void;
  reset(): void;
  random(): number;
  updateConfig(partial: Record<string, number>): void;
  getPopulationCounts(): Record<string, number>;
}

// -- Expected pattern types for scientist skill --

export interface PatternCriteriaBase {
  description: string;
  minTicks: number;
  populations: string[];  // must match keys from getPopulationCounts()
}

export interface OscillationCriteria extends PatternCriteriaBase {
  type: 'oscillation';
  minCycles: number;
  maxExtinctionRate: number;
}

export interface SegregationCriteria extends PatternCriteriaBase {
  type: 'segregation';
  minClusterIndex: number;
}

export interface EpidemicCurveCriteria extends PatternCriteriaBase {
  type: 'epidemic-curve';
  peakWithinTicks: number;
  mustDecline: boolean;
}

export interface EquilibriumCriteria extends PatternCriteriaBase {
  type: 'equilibrium';
  stabilizeByTick: number;
  maxVariance: number;
}

export type ExpectedPattern =
  | OscillationCriteria
  | SegregationCriteria
  | EpidemicCurveCriteria
  | EquilibriumCriteria;
