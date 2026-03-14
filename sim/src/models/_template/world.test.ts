import { describe, it, expect } from 'vitest';
import { TemplateWorld } from './world.js';

const defaultConfig = { width: 800, height: 600, agentCount: 50 };

describe('TemplateWorld', () => {
  it('setup creates correct agent count', () => {
    const w = new TemplateWorld({ ...defaultConfig });
    w.setup();
    expect(w.agents.length).toBe(50);
  });

  it('step moves agents', () => {
    const w = new TemplateWorld({ ...defaultConfig });
    w.setup();
    const before = w.agents.map(a => ({ x: a.x, y: a.y }));
    w.step();
    const moved = w.agents.some((a, i) => a.x !== before[i]!.x || a.y !== before[i]!.y);
    expect(moved).toBe(true);
  });

  it('reset restores initial state', () => {
    const w = new TemplateWorld({ ...defaultConfig });
    w.setup();
    for (let i = 0; i < 10; i++) w.step();
    w.reset();
    expect(w.tick).toBe(0);
    expect(w.agents.length).toBe(50);
  });

  it('populationHistory grows with ticks', () => {
    const w = new TemplateWorld({ ...defaultConfig });
    w.setup();
    for (let i = 0; i < 10; i++) w.step();
    expect(w.populationHistory.length).toBe(10);
  });
});
