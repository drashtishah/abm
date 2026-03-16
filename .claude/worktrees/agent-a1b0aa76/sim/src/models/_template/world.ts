import { BaseWorld } from '../../framework/base-world.js';
import { createAgent, resetIdCounter } from './agent.js';
import { randomWalk, bounceOffWalls } from './behaviors.js';

export class TemplateWorld extends BaseWorld {
  setup(): void {
    resetIdCounter();
    this.agents = [];
    this.tick = 0;
    this.populationHistory = [];

    const count = this.config['agentCount'] ?? 100;
    for (let i = 0; i < count; i++) {
      this.agents.push(createAgent(this.config));
    }
  }

  step(): void {
    const width = this.config['width'] ?? 800;
    const height = this.config['height'] ?? 600;

    for (const agent of this.agents) {
      if (!agent.alive) continue;
      const vel = randomWalk(agent, this.config);
      agent.vx = vel.vx;
      agent.vy = vel.vy;
      agent.x += agent.vx;
      agent.y += agent.vy;
      bounceOffWalls(agent, width, height);
    }

    this.recordPopulation();
  }

  getPopulationCounts(): Record<string, number> {
    return {
      agents: this.agents.filter(a => a.alive).length,
    };
  }
}
