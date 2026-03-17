// Snowy Mountain theme — arctic frost: crisp whites, glacier blues, frozen abyss depths.
import { registerTheme } from './theme-registry.js';

registerTheme({
  id: 'snowy-mountain',
  name: 'Snowy Mountain',
  colors: {
    bgPrimary: '#EFF4F8',       // fresh snowfield — blue-white, zero warmth
    bgSurface: '#FFFFFF',       // pure snow surface
    border: '#C4D4E0',          // frost edge — cool silver-blue
    accentPrimary: '#3E89A0',   // glacier water — icy teal, bold
    accentSecondary: '#6AB6D9', // frozen lake reflection
    accentTertiary: '#1E5064',  // arctic deep — frozen abyss
    textPrimary: '#1A2E3B',     // midnight frost — 12:1 on snow (AAA)
    textSecondary: '#5A7488',   // slate ice — 4.5:1 on snow (AA)
    colorGridHigh: '#7BAFC4',   // frozen tundra blue-green
    colorGridLow: '#DDE8EF',   // wind-swept snowpack
    colorDanger: '#A83040',     // frostbite red — cold, not warm
  },
  agentPalette: ['#F2A65A', '#1E5064', '#5A9BB0'],
  paletteLabels: ['orange', 'dark blue', 'blue'],
});
