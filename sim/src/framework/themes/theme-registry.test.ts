import { describe, it, expect, beforeEach } from 'vitest';
import { registerTheme, getTheme, listThemes, _resetForTesting } from './theme-registry.js';
import type { ThemeDefinition } from './types.js';

const testTheme: ThemeDefinition = {
  id: 'test-theme',
  name: 'Test',
  colors: {
    bgPrimary: '#000',
    bgSurface: '#111',
    border: '#222',
    accentPrimary: '#0f0',
    accentSecondary: '#0ff',
    accentTertiary: '#f0f',
    textPrimary: '#fff',
    textSecondary: '#aaa',
    colorGrass: '#0a0',
    colorGrassEaten: '#010',
    colorDanger: '#f00',
  },
};

describe('theme-registry', () => {
  beforeEach(() => _resetForTesting());

  it('registers and retrieves a theme', () => {
    registerTheme(testTheme);
    expect(getTheme('test-theme')).toEqual(testTheme);
  });

  it('returns undefined for unknown theme', () => {
    expect(getTheme('nonexistent')).toBeUndefined();
  });

  it('lists all registered themes', () => {
    registerTheme(testTheme);
    const second = { ...testTheme, id: 'second', name: 'Second' };
    registerTheme(second);
    expect(listThemes()).toHaveLength(2);
  });

  it('cozy theme registers with all required colors and agent palette', async () => {
    await import('./cozy.js');
    const cozy = getTheme('cozy');
    expect(cozy).toBeDefined();
    expect(cozy!.name).toBe('Cozy');
    expect(cozy!.colors.bgPrimary).toBe('#FAF6F0');
    expect(cozy!.colors.colorGrass).toBe('#A3B898');
    expect(cozy!.agentPalette).toHaveLength(3);
  });
});
