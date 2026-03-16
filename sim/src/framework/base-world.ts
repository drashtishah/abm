import type { Agent, World } from './types.js';
import { mulberry32 } from '../utils/prng.js';

export abstract class BaseWorld implements World {
  agents: Agent[] = [];
  config: Record<string, number>;
  running = false;
  tick = 0;
  populationHistory: Record<string, number>[] = [];
  extraState?: unknown;

  private _random: () => number;

  constructor(config: Record<string, number>) {
    this.config = { ...config };
    this._random = mulberry32(config['seed'] || Date.now());
  }

  abstract setup(): void;
  abstract step(): void;
  abstract getPopulationCounts(): Record<string, number>;

  random(): number {
    return this._random();
  }

  reset(): void {
    this.tick = 0;
    this.populationHistory = [];
    this.running = false;
    this._random = mulberry32(this.config['seed'] || Date.now());
    this.setup();
  }

  updateConfig(partial: Record<string, number>): void {
    Object.assign(this.config, partial);
  }

  protected recordPopulation(): void {
    const maxHistory = 500;
    this.populationHistory.push(this.getPopulationCounts());
    if (this.populationHistory.length > maxHistory) {
      this.populationHistory.shift();
    }
    this.tick++;
  }
}
