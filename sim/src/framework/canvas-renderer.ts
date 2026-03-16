import type { World } from './types.js';
import type { ModelDefinition } from './model-registry.js';
import { getThemeColors } from './theme.js';

interface GrassPatch {
  alive: boolean;
}

function isGrassState(s: unknown): s is { grass: GrassPatch[] } {
  return s !== null && typeof s === 'object' && 'grass' in s;
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
  if (isGrassState(world.extraState) && world.config['showGrass'] !== 0) {
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

  // Build color and shape maps from model definition
  const colorMap = new Map<string, string>();
  const shapeMap = new Map<string, string>();
  for (const at of model.agentTypes) {
    colorMap.set(at.type, at.color);
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

    ctx.fillStyle = colorMap.get(agent.type) ?? agent.color ?? '#ffffff';
    ctx.beginPath();

    if (shape === 'triangle') {
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx - r * 0.866, cy + r * 0.5);
      ctx.lineTo(cx + r * 0.866, cy + r * 0.5);
      ctx.closePath();
    } else {
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
    }
    ctx.fill();
  }
}
