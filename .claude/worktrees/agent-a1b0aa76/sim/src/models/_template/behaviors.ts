import type { Agent } from '../../framework/types.js';

export function randomWalk(agent: Agent, _config: Record<string, number>): { vx: number; vy: number } {
  const angle = Math.random() * Math.PI * 2;
  return { vx: Math.cos(angle) * agent.speed, vy: Math.sin(angle) * agent.speed };
}

export function bounceOffWalls(agent: Agent, width: number, height: number): void {
  const r = agent.radius;
  if (agent.x < r) { agent.x = r; agent.vx = Math.abs(agent.vx); }
  if (agent.x > width - r) { agent.x = width - r; agent.vx = -Math.abs(agent.vx); }
  if (agent.y < r) { agent.y = r; agent.vy = Math.abs(agent.vy); }
  if (agent.y > height - r) { agent.y = height - r; agent.vy = -Math.abs(agent.vy); }
}
