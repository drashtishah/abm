// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { getThemeColors, invalidateThemeCache } from './theme.js';

describe('theme', () => {
  beforeEach(() => {
    invalidateThemeCache();
  });

  it('returns fallback colors in jsdom (no CSS vars)', () => {
    const colors = getThemeColors();
    expect(colors.bgPrimary).toBe('#0a0e27');
    expect(colors.grassAlive).toBe('#2a5a20');
  });

  it('caches results on second call', () => {
    const a = getThemeColors();
    const b = getThemeColors();
    expect(a).toBe(b);
  });

  it('invalidateThemeCache forces re-read', () => {
    const a = getThemeColors();
    invalidateThemeCache();
    const b = getThemeColors();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});
