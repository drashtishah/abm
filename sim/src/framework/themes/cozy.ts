// Cozy theme — hygge-inspired palette: oat cream, espresso text, sage & terracotta pastels.
import { registerTheme } from './theme-registry.js';

registerTheme({
  id: 'cozy',
  name: 'Cozy',
  colors: {
    bgPrimary: '#FAF6F0',       // oat cream — warm off-white like linen
    bgSurface: '#FFFCF8',       // warmer white for cards/panels
    border: '#E0D5C9',          // sand/taupe — visible on both bgs
    accentPrimary: '#7D9B76',   // deeper sage — 3.4:1 on cream, readable
    accentSecondary: '#C4917E', // dusty terracotta — warm candlelit tone
    accentTertiary: '#B8976E',  // honey/caramel — wool & wood warmth
    textPrimary: '#4A3F35',     // espresso — 8.5:1 on cream (WCAG AAA)
    textSecondary: '#7A6E62',   // warm taupe — 4.1:1 on cream (WCAG AA)
    colorGrass: '#A3B898',      // soft sage for canvas grid
    colorGrassEaten: '#E8E0D5', // warm beige — barren earth
    colorDanger: '#C47A6E',     // muted terracotta red — warm, not harsh
  },
  agentPalette: ['#7D6552', '#DEB5A6', '#8BAA82'],
});
