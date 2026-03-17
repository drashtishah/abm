import type { World } from './types.js';
import type { ModelDefinition } from './model-registry.js';
import { getPopulationDisplay } from './model-registry.js';
import { getThemeColors } from './theme.js';
import { getThemedAgentColor } from './themes/theme-registry.js';

interface GrassPatch {
  alive: boolean;
}

function isGrassState(s: unknown): s is { grass: GrassPatch[] } {
  return s !== null && typeof s === 'object' && 'grass' in s;
}

/** Ratio-based patch grid — paired [channelA, channelB] values per cell, renderer applies theme colors */
interface PatchRatioState {
  patchRatios: Array<[number, number]>;
  patchGridSize: number;
}

function isPatchRatioState(s: unknown): s is PatchRatioState {
  return s !== null && typeof s === 'object' && 'patchRatios' in s && 'patchGridSize' in s;
}

/** Additive blend of two hex colors scaled by independent intensities. */
function blendColors(colorA: string, intensityA: number, colorB: string, intensityB: number): string {
  const parse = (hex: string) => {
    if (hex.length === 7) {
      return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
    }
    return [0, 0, 0];
  };
  const a = parse(colorA);
  const b = parse(colorB);
  const r = Math.min(255, Math.round(a[0]! * intensityA + b[0]! * intensityB));
  const g = Math.min(255, Math.round(a[1]! * intensityA + b[1]! * intensityB));
  const bl = Math.min(255, Math.round(a[2]! * intensityA + b[2]! * intensityB));
  return `rgb(${r},${g},${bl})`;
}

/** Scale a hex color by intensity (0=black, 1=full color). */
function scaleHexColor(hex: string, intensity: number): string {
  // Parse hex (#rrggbb or #rgb)
  let r = 0, g = 0, b = 0;
  if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  } else if (hex.length === 4) {
    r = parseInt(hex[1]! + hex[1]!, 16);
    g = parseInt(hex[2]! + hex[2]!, 16);
    b = parseInt(hex[3]! + hex[3]!, 16);
  } else {
    return hex; // Can't parse, return as-is
  }
  const t = Math.max(0, Math.min(1, intensity));
  return `rgb(${Math.round(r * t)},${Math.round(g * t)},${Math.round(b * t)})`;
}

export function render(
  ctx: CanvasRenderingContext2D,
  world: World,
  model: ModelDefinition
): void {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const colors = getThemeColors();

  ctx.fillStyle = colors.bgPrimary ?? '#0a0e27';
  ctx.fillRect(0, 0, w, h);

  // Draw grass grid if present
  if (isGrassState(world.extraState)) {
    const grass = world.extraState.grass;
    const gridSize = world.config['grassGridSize'] ?? 20;
    const cellW = w / gridSize;
    const cellH = h / gridSize;

    for (const patch of grass) {
      const p = patch as GrassPatch & { x: number; y: number };
      ctx.fillStyle = p.alive ? (colors.gridHigh ?? '#2a5a20') : (colors.gridLow ?? '#1a1200');
      ctx.fillRect(p.x * cellW, p.y * cellH, cellW, cellH);
    }
  }

  // Draw ratio-based patch grid (e.g., hormone environment) using theme colors
  // Two channels blended additively, matching NetLogo's approximate-rgb approach
  if (isPatchRatioState(world.extraState)) {
    const { patchRatios, patchGridSize } = world.extraState;
    const cellW = w / patchGridSize;
    const cellH = h / patchGridSize;

    // Channel A (e.g., anabolic) and channel B (e.g., catabolic) colors
    let colorA = colors.gridHigh ?? '#2a5a20';
    let colorB = colors.gridLow ?? '#1a1200';
    if (model.patchColorKeys) {
      const popEntries = getPopulationDisplay(model);
      const highIdx = popEntries.findIndex(e => e.key === model.patchColorKeys!.high);
      const lowIdx = popEntries.findIndex(e => e.key === model.patchColorKeys!.low);
      if (highIdx >= 0) colorA = getThemedAgentColor(highIdx, popEntries[highIdx]!.color);
      if (lowIdx >= 0) colorB = getThemedAgentColor(lowIdx, popEntries[lowIdx]!.color);
    }

    for (let i = 0; i < patchRatios.length; i++) {
      const gx = i % patchGridSize;
      const gy = Math.floor(i / patchGridSize);
      const [ratioA, ratioB] = patchRatios[i]!;
      ctx.fillStyle = blendColors(colorA, ratioA, colorB, ratioB);
      ctx.fillRect(gx * cellW, gy * cellH, cellW, cellH);
    }
  }

  // Build color and shape maps from model definition
  const colorMap = new Map<string, string>();
  const shapeMap = new Map<string, string>();
  for (let i = 0; i < model.agentTypes.length; i++) {
    const at = model.agentTypes[i]!;
    colorMap.set(at.type, getThemedAgentColor(i, at.color));
    shapeMap.set(at.type, at.shape);
  }

  // Scale factors for rendering agents
  const scaleX = w / (world.config['width'] ?? w);
  const scaleY = h / (world.config['height'] ?? h);
  const radiusScale = Math.min(scaleX, scaleY);

  // Draw alive agents with shape differentiation for color-blind support
  for (const agent of world.agents) {
    if (!agent.alive) continue;
    const cx = agent.x * scaleX;
    const cy = agent.y * scaleY;
    const r = agent.radius * radiusScale;
    const shape = shapeMap.get(agent.type) ?? 'circle';

    const baseColor = colorMap.get(agent.type) ?? agent.color ?? '#ffffff';
    // Apply per-agent colorIntensity (0=dim, 1=bright) if present
    const intensity = agent.meta['colorIntensity'] as number | undefined;
    ctx.fillStyle = intensity !== undefined ? scaleHexColor(baseColor, intensity) : baseColor;
    ctx.beginPath();

    if (shape === 'triangle') {
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx - r * 0.866, cy + r * 0.5);
      ctx.lineTo(cx + r * 0.866, cy + r * 0.5);
      ctx.closePath();
    } else if (shape === 'square') {
      ctx.rect(cx - r * 0.7, cy - r * 0.7, r * 1.4, r * 1.4);
    } else {
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
    }
    ctx.fill();
  }
}
