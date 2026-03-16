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
  updateConfig(partial: Record<string, number>): void;
  getPopulationCounts(): Record<string, number>;
}
