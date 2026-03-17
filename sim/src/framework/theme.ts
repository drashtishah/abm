// Shared CSS custom property reader — single cache for all rendering modules.

let cachedColors: Record<string, string> | null = null;

export function getThemeColors(): Record<string, string> {
  if (cachedColors) return cachedColors;
  const style = getComputedStyle(document.documentElement);
  cachedColors = {
    bgPrimary: style.getPropertyValue('--bg-primary').trim() || '#0a0e27',
    gridHigh: style.getPropertyValue('--color-grid-high').trim() || '#2a5a20',
    gridLow: style.getPropertyValue('--color-grid-low').trim() || '#0a0a0a',
    border: style.getPropertyValue('--border').trim() || '#2d3561',
    textSecondary: style.getPropertyValue('--text-secondary').trim() || '#7da4bc',
    accentPrimary: style.getPropertyValue('--accent-primary').trim() || '#66ff55',
  };
  return cachedColors;
}

export function invalidateThemeCache(): void {
  cachedColors = null;
}
