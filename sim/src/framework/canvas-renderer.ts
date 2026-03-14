import type { World } from './types.js';
import type { ModelDefinition } from './model-registry.js';

interface GrassPatch {
  alive: boolean;
}

function isGrassState(s: unknown): s is { grass: GrassPatch[] } {
  return s !== null && typeof s === 'object' && 'grass' in s;
}

let cachedColors: Record<string, string> | null = null;

function getThemeColors(): Record<string, string> {
  if (cachedColors) return cachedColors;
  const style = getComputedStyle(document.documentElement);
  cachedColors = {
    bgPrimary: style.getPropertyValue('--bg-primary').trim() || '#0a0e27',
    grassAlive: style.getPropertyValue('--color-grass').trim() || '#2a5a20',
    grassEaten: style.getPropertyValue('--color-grass-eaten').trim() || '#1a1200',
  };
  return cachedColors;
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
      ctx.fillStyle = p.alive ? (colors.grassAlive ?? '#2a5a20') : (colors.grassEaten ?? '#1a1200');
      ctx.fillRect(p.x * cellW, p.y * cellH, cellW, cellH);
    }
  }

  // Build color map from model definition
  const colorMap = new Map<string, string>();
  for (const at of model.agentTypes) {
    colorMap.set(at.type, at.color);
  }

  // Draw alive agents
  for (const agent of world.agents) {
    if (!agent.alive) continue;

    ctx.beginPath();
    ctx.fillStyle = colorMap.get(agent.type) ?? agent.color ?? '#ffffff';
    ctx.arc(agent.x, agent.y, agent.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
