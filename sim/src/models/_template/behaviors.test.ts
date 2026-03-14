import { describe, it, expect } from 'vitest';
import type { Agent } from '../../framework/types.js';
import { randomWalk, bounceOffWalls } from './behaviors.js';

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 0, type: 'agent', x: 400, y: 300,
    vx: 0, vy: 0, radius: 4, speed: 1.0,
    energy: 100, color: '#66ff55', alive: true, meta: {},
    ...overrides,
  };
}

describe('template behaviors', () => {
  it('randomWalk returns nonzero velocity', () => {
    const agent = makeAgent();
    const vel = randomWalk(agent, { width: 800, height: 600 });
    expect(vel.vx !== 0 || vel.vy !== 0).toBe(true);
  });

  it('bounceOffWalls clamps at right edge', () => {
    const agent = makeAgent({ x: 810, vx: 2 });
    bounceOffWalls(agent, 800, 600);
    expect(agent.x).toBeLessThanOrEqual(800 - agent.radius);
    expect(agent.vx).toBeLessThan(0);
  });

  it('bounceOffWalls no-op for centered agent', () => {
    const agent = makeAgent({ x: 400, y: 300, vx: 1, vy: 1 });
    const origX = agent.x;
    const origVx = agent.vx;
    bounceOffWalls(agent, 800, 600);
    expect(agent.x).toBe(origX);
    expect(agent.vx).toBe(origVx);
  });
});
