// Theme registry — mirrors model-registry.ts pattern. Register themes, apply via CSS vars.
import type { ThemeDefinition } from './types.js';
import { invalidateThemeCache } from '../theme.js';

const themes = new Map<string, ThemeDefinition>();

export function registerTheme(def: ThemeDefinition): void {
  themes.set(def.id, def);
}

export function getTheme(id: string): ThemeDefinition | undefined {
  return themes.get(id);
}

export function listThemes(): ThemeDefinition[] {
  return Array.from(themes.values());
}

/** Convert camelCase to kebab-case: bgPrimary → bg-primary */
function toKebab(key: string): string {
  return key.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
}

/** Apply theme by setting CSS custom properties on :root. Persists to localStorage. */
export function applyTheme(id: string): void {
  let theme = themes.get(id);
  if (!theme) theme = themes.get('biopunk');
  if (!theme) {
    const first = themes.values().next();
    if (first.done) return;
    theme = first.value;
  }

  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme.colors)) {
    root.style.setProperty(`--${toKebab(key)}`, value);
  }

  localStorage.setItem('abm-theme', theme.id);
  invalidateThemeCache();
}

/** Get the currently applied theme ID from localStorage. */
export function getSavedThemeId(): string {
  return localStorage.getItem('abm-theme') ?? 'biopunk';
}

/** Resolve agent color: palette[index] > model default. Index is agent's position in model.agentTypes. */
export function getThemedAgentColor(agentIndex: number, fallback: string): string {
  const id = typeof localStorage !== 'undefined'
    ? (localStorage.getItem('abm-theme') ?? 'biopunk')
    : 'biopunk';
  const theme = themes.get(id);
  if (!theme?.agentPalette?.length) return fallback;
  return theme.agentPalette[agentIndex % theme.agentPalette.length] ?? fallback;
}

/** Test-only: clear registry */
export function _resetForTesting(): void {
  themes.clear();
}
