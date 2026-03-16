import type { Agent, World } from './types.js';

export abstract class BaseWorld implements World {
  agents: Agent[] = [];
  config: Record<string, number>;
  running = false;
  tick = 0;
  populationHistory: Record<string, number>[] = [];
  extraState?: unknown;

  constructor(config: Record<string, number>) {
    this.config = { ...config };
  }

  abstract setup(): void;
  abstract step(): void;
  abstract getPopulationCounts(): Record<string, number>;

  reset(): void {
    this.tick = 0;
    this.populationHistory = [];
    this.running = false;
    this.setup();
  }

  updateConfig(partial: Record<string, number>): void {
    Object.assign(this.config, partial);
  }

  protected recordPopulation(): void {
    this.populationHistory.push(this.getPopulationCounts());
    this.tick++;
  }
}
