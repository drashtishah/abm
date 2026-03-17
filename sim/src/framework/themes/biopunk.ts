// Biopunk theme — the original color scheme.
import { registerTheme } from './theme-registry.js';

registerTheme({
  id: 'biopunk',
  name: 'Biopunk',
  colors: {
    bgPrimary: '#0a0e27',
    bgSurface: '#1a1f3a',
    border: '#2d3561',
    accentPrimary: '#66ff55',
    accentSecondary: '#00ffe5',
    accentTertiary: '#9b80f2',
    textPrimary: '#affff7',
    textSecondary: '#7da4bc',
    colorGridHigh: '#4a9e3a',
    colorGridLow: '#0a0a0a',
    colorDanger: '#ff1744',
  },
  agentPalette: ['#ff2daa', '#00ffe5', '#66ff55'],
  paletteLabels: ['pink', 'cyan', 'green'],
});
