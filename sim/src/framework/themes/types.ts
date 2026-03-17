// Theme definition — all UI colors. Agent colors use agentPalette, not themed properties.

export interface ThemeColors {
  bgPrimary: string;
  bgSurface: string;
  border: string;
  accentPrimary: string;
  accentSecondary: string;
  accentTertiary: string;
  textPrimary: string;
  textSecondary: string;
  /** Grid cell "active" state — alive grass, anabolic-dominant patch, etc. */
  colorGridHigh: string;
  /** Grid cell "inactive" state — eaten grass, catabolic-dominant patch, etc. */
  colorGridLow: string;
  colorDanger: string;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  colors: ThemeColors;
  agentPalette?: string[];
  /** Human-readable names for agentPalette colors, used in model descriptions via {color:N} */
  paletteLabels?: string[];
}
