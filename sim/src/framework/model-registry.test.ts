// Tests for model registry and populationDisplay resolution.
import { describe, it, expect } from 'vitest';
import { registerModel, getModel, listModels, getPopulationDisplay } from './model-registry.js';
import type { ModelDefinition } from './model-registry.js';

function makeDef(overrides: Partial<ModelDefinition> = {}): ModelDefinition {
  return {
    id: 'test-model',
    name: 'Test Model',
    description: 'A test model',
    context: 'test context',
    defaultConfig: {},
    configSchema: [],
    agentTypes: [
      { type: 'predator', color: '#ff0000', radius: 5, shape: 'triangle' },
      { type: 'prey', color: '#00ff00', radius: 4, shape: 'circle' },
    ],
    createWorld: () => { throw new Error('not implemented'); },
    ...overrides,
  };
}

describe('model-registry', () => {
  it('registerModel + getModel round-trip', () => {
    const def = makeDef({ id: 'roundtrip-test' });
    registerModel(def);
    expect(getModel('roundtrip-test')).toBe(def);
  });

  it('listModels returns registered models', () => {
    const models = listModels();
    expect(models.length).toBeGreaterThan(0);
    expect(models.some(m => m.id === 'roundtrip-test')).toBe(true);
  });

  it('getModel returns undefined for unknown id', () => {
    expect(getModel('nonexistent-model')).toBeUndefined();
  });
});

describe('getPopulationDisplay', () => {
  it('returns populationDisplay when defined', () => {
    const def = makeDef({
      populationDisplay: [
        { key: 'predator', label: 'Predators', color: '#ff0000' },
        { key: 'prey', label: 'Prey', color: '#00ff00' },
        { key: 'food', label: 'Food', color: '#00ff00', showInChart: false },
      ],
    });
    const display = getPopulationDisplay(def);
    expect(display).toHaveLength(3);
    expect(display[0]?.key).toBe('predator');
    expect(display[2]?.showInChart).toBe(false);
  });

  it('falls back to agentTypes when populationDisplay is undefined', () => {
    const def = makeDef();
    const display = getPopulationDisplay(def);
    expect(display).toHaveLength(2);
    expect(display[0]?.key).toBe('predator');
    expect(display[0]?.label).toBe('predator');
    expect(display[0]?.color).toBe('#ff0000');
  });

  it('fallback entries default showInChart to undefined (treated as true)', () => {
    const def = makeDef();
    const display = getPopulationDisplay(def);
    for (const entry of display) {
      expect(entry.showInChart).toBeUndefined();
    }
  });
});
