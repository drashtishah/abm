/** Lifecycle tests for MuscleWorld. */
import { describe, it, expect } from 'vitest';
import { MuscleWorld } from './world.js';

const defaultConfig = {
  width: 800,
  height: 600,
  gridSize: 5, // small grid for fast tests
  intensity: 95,
  hoursOfSleep: 8,
  daysBetweenWorkouts: 5,
  slowTwitchPercent: 50,
  lift: 1,
  seed: 42,
};

describe('MuscleWorld', () => {
  it('setup creates one fiber per grid cell', () => {
    const w = new MuscleWorld({ ...defaultConfig });
    w.setup();
    expect(w.agents.length).toBe(25); // 5×5
    expect(w.agents.every(a => a.type === 'fiber')).toBe(true);
    expect(w.agents.every(a => a.alive)).toBe(true);
  });

  it('step advances tick by 1', () => {
    const w = new MuscleWorld({ ...defaultConfig });
    w.setup();
    expect(w.tick).toBe(0);
    w.step();
    expect(w.tick).toBe(1);
  });

  it('all fibers remain alive after 100 steps', () => {
    const w = new MuscleWorld({ ...defaultConfig });
    w.setup();
    for (let i = 0; i < 100; i++) w.step();
    expect(w.agents.every(a => a.alive)).toBe(true);
  });

  it('getPopulationCounts returns muscleMass, avgAnabolic, avgCatabolic', () => {
    const w = new MuscleWorld({ ...defaultConfig });
    w.setup();
    w.step();
    const counts = w.getPopulationCounts();
    expect(counts).toHaveProperty('muscleMass');
    expect(counts).toHaveProperty('avgAnabolic');
    expect(counts).toHaveProperty('avgCatabolic');
    expect(counts['muscleMass']).toBeGreaterThan(0);
    expect(counts['avgAnabolic']).toBeGreaterThan(0);
    expect(counts['avgCatabolic']).toBeGreaterThan(0);
  });

  it('reset restores initial state', () => {
    const w = new MuscleWorld({ ...defaultConfig });
    w.setup();
    for (let i = 0; i < 50; i++) w.step();
    expect(w.tick).toBe(50);

    w.reset();
    expect(w.tick).toBe(0);
    expect(w.populationHistory.length).toBe(0);
    expect(w.agents.length).toBe(25);
  });

  it('muscle mass increases over time with lifting enabled', () => {
    const w = new MuscleWorld({ ...defaultConfig });
    w.setup();
    const initial = w.getPopulationCounts()['muscleMass']!;

    for (let i = 0; i < 100; i++) w.step();
    const final = w.getPopulationCounts()['muscleMass']!;

    expect(final).toBeGreaterThan(initial);
  });

  it('no lifting produces less muscle growth than lifting', () => {
    const wLift = new MuscleWorld({ ...defaultConfig, lift: 1 });
    wLift.setup();
    const wNoLift = new MuscleWorld({ ...defaultConfig, lift: 0 });
    wNoLift.setup();

    for (let i = 0; i < 100; i++) {
      wLift.step();
      wNoLift.step();
    }

    const massLift = wLift.getPopulationCounts()['muscleMass']!;
    const massNoLift = wNoLift.getPopulationCounts()['muscleMass']!;
    expect(massLift).toBeGreaterThan(massNoLift);
  });

  it('fiber sizes stay within [1, maxSize] bounds', () => {
    const w = new MuscleWorld({ ...defaultConfig });
    w.setup();
    for (let i = 0; i < 200; i++) w.step();

    for (const a of w.agents) {
      const fs = a.meta['fiberSize'] as number;
      const ms = a.meta['maxSize'] as number;
      expect(fs).toBeGreaterThanOrEqual(1);
      expect(fs).toBeLessThanOrEqual(ms);
    }
  });

  it('populationHistory records entries each step', () => {
    const w = new MuscleWorld({ ...defaultConfig });
    w.setup();
    for (let i = 0; i < 10; i++) w.step();
    expect(w.populationHistory.length).toBe(10);
  });

  it('no NaN in agent fields after many steps', () => {
    const w = new MuscleWorld({ ...defaultConfig });
    w.setup();
    for (let i = 0; i < 200; i++) w.step();

    for (const a of w.agents) {
      expect(Number.isFinite(a.x)).toBe(true);
      expect(Number.isFinite(a.y)).toBe(true);
      expect(Number.isFinite(a.meta['fiberSize'] as number)).toBe(true);
    }
  });
});
