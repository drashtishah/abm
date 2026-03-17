// Psycho theme — visceral blood bath: near-black base, harsh crimson, bone and bruise.
import { registerTheme } from './theme-registry.js';

registerTheme({
  id: 'psycho',
  name: 'Psycho',
  colors: {
    bgPrimary: '#0C0404',       // near-black with blood tint
    bgSurface: '#1A0808',       // dried blood surface
    border: '#3D1111',          // dark crimson edge
    accentPrimary: '#CC1515',   // harsh blood red — violent, in-your-face
    accentSecondary: '#D4C4B0', // bone/flesh — victim pallor
    accentTertiary: '#8B3A62',  // bruise purple — blunt trauma
    textPrimary: '#F0E0E0',     // pale flesh white — 14:1 on bg (AAA)
    textSecondary: '#8A6666',   // graveyard gray with red tint — 4.2:1 (AA)
    colorGrass: '#990000',      // blood-soaked ground
    colorGrassEaten: '#0C0404', // consumed — nothing left
    colorDanger: '#FF1A1A',     // screaming red
  },
  agentPalette: ['#DD2424', '#D4C4B0', '#6D0000'],
});
