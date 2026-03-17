// Theme definition — all UI colors. Agent colors are model-specific, not themed.

export interface ThemeColors {
  bgPrimary: string;
  bgSurface: string;
  border: string;
  accentPrimary: string;
  accentSecondary: string;
  accentTertiary: string;
  textPrimary: string;
  textSecondary: string;
  colorGrass: string;
  colorGrassEaten: string;
  colorDanger: string;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  colors: ThemeColors;
  agentPalette?: string[];
}
