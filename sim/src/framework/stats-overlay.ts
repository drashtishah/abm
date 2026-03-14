import type { World } from './types.js';
import type { ModelDefinition } from './model-registry.js';

export function renderStats(
  ctx: CanvasRenderingContext2D,
  world: World,
  model: ModelDefinition
): void {
  const colors: Record<string, string> = {};
  for (const at of model.agentTypes) {
    colors[at.type] = at.color;
  }

  // Draw population counts top-left
  ctx.font = '14px "JetBrains Mono", "Fira Code", monospace';
  let y = 24;
  const counts = world.getPopulationCounts();
  for (const [key, value] of Object.entries(counts)) {
    ctx.fillStyle = colors[key] ?? '#affff7';
    ctx.fillText(`${key}: ${value}`, 12, y);
    y += 20;
  }

  // Draw tick counter
  ctx.fillStyle = '#7da4bc';
  ctx.fillText(`Tick: ${world.tick}`, 12, y);
}

export function renderChart(
  ctx: CanvasRenderingContext2D,
  world: World,
  model: ModelDefinition
): void {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  // Background
  ctx.fillStyle = '#0a0e27';
  ctx.fillRect(0, 0, w, h);

  const history = world.populationHistory;
  if (history.length === 0) return;

  // Sliding window of last 500 ticks
  const windowSize = 500;
  const startIdx = Math.max(0, history.length - windowSize);
  const visible = history.slice(startIdx);

  // Get all keys from first entry
  const firstEntry = visible[0];
  if (!firstEntry) return;
  const keys = Object.keys(firstEntry);

  // Find max value for Y scaling
  let maxVal = 0;
  for (const entry of visible) {
    for (const key of keys) {
      const v = entry[key];
      if (v !== undefined && v > maxVal) maxVal = v;
    }
  }
  maxVal = Math.ceil(maxVal * 1.1) || 1;

  // Chart margins
  const marginLeft = 50;
  const marginRight = 20;
  const marginTop = 20;
  const marginBottom = 30;
  const chartW = w - marginLeft - marginRight;
  const chartH = h - marginTop - marginBottom;

  // Draw grid lines
  ctx.strokeStyle = '#2d3561';
  ctx.lineWidth = 1;
  const numGridLines = 4;
  for (let i = 0; i <= numGridLines; i++) {
    const gy = marginTop + (chartH / numGridLines) * i;
    ctx.beginPath();
    ctx.moveTo(marginLeft, gy);
    ctx.lineTo(w - marginRight, gy);
    ctx.stroke();

    // Y axis labels
    const labelVal = Math.round(maxVal * (1 - i / numGridLines));
    ctx.fillStyle = '#7da4bc';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillText(String(labelVal), 4, gy + 4);
  }

  // X axis labels
  const tickStart = startIdx;
  const tickEnd = startIdx + visible.length;
  for (let t = Math.ceil(tickStart / 100) * 100; t < tickEnd; t += 100) {
    const xPos = marginLeft + ((t - tickStart) / Math.max(visible.length - 1, 1)) * chartW;
    ctx.fillStyle = '#7da4bc';
    ctx.fillText(String(t), xPos - 10, h - 5);
  }

  // Color map for lines
  const lineColors: Record<string, string> = {};
  for (const at of model.agentTypes) {
    lineColors[at.type] = at.color;
  }
  // Default grass color
  if (!lineColors['grass']) lineColors['grass'] = '#66ff55';

  // Draw lines
  for (const key of keys) {
    ctx.beginPath();
    ctx.strokeStyle = lineColors[key] ?? '#affff7';
    ctx.lineWidth = 2;

    for (let i = 0; i < visible.length; i++) {
      const entry = visible[i]!;
      const val = entry[key] ?? 0;
      const px = marginLeft + (i / Math.max(visible.length - 1, 1)) * chartW;
      const py = marginTop + chartH - (val / maxVal) * chartH;

      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
  }

  // Legend
  ctx.font = '12px "JetBrains Mono", monospace';
  let legendX = marginLeft;
  for (const key of keys) {
    ctx.fillStyle = lineColors[key] ?? '#affff7';
    ctx.fillRect(legendX, 6, 12, 12);
    ctx.fillText(key, legendX + 16, 16);
    legendX += key.length * 8 + 30;
  }
}
