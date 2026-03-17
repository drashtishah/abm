import type { World } from './types.js';
import type { ModelDefinition } from './model-registry.js';
import { getPopulationDisplay } from './model-registry.js';
import { getThemeColors } from './theme.js';
import { getThemedAgentColor } from './themes/theme-registry.js';

export function renderStats(
  ctx: CanvasRenderingContext2D,
  world: World,
  model: ModelDefinition
): void {
  const colors: Record<string, string> = {};
  for (let i = 0; i < model.agentTypes.length; i++) {
    const at = model.agentTypes[i]!;
    colors[at.type] = getThemedAgentColor(i, at.color);
  }

  // Draw population counts top-left
  const statsThemeColors = getThemeColors();
  ctx.font = '14px "JetBrains Mono", "Fira Code", monospace';
  let y = 24;
  const counts = world.getPopulationCounts();
  for (const [key, value] of Object.entries(counts)) {
    ctx.fillStyle = colors[key] ?? statsThemeColors.textPrimary ?? '#affff7';
    ctx.fillText(`${key}: ${value}`, 12, y);
    y += 20;
  }

  // Draw tick counter
  const statsTheme = getThemeColors();
  ctx.fillStyle = statsTheme.textSecondary ?? '#7da4bc';
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
  const chartTheme = getThemeColors();
  ctx.fillStyle = chartTheme.bgPrimary ?? '#0a0e27';
  ctx.fillRect(0, 0, w, h);

  const history = world.populationHistory;
  if (history.length === 0) return;

  // Sliding window of last 500 ticks
  const windowSize = 500;
  const startIdx = Math.max(0, history.length - windowSize);
  const visible = history.slice(startIdx);

  // Chart keys: only show populations marked for charting in populationDisplay
  const firstEntry = visible[0];
  if (!firstEntry) return;
  const chartKeys = new Set(
    getPopulationDisplay(model)
      .filter(p => p.showInChart !== false)
      .map(p => p.key)
  );
  const keys = Object.keys(firstEntry).filter(k => chartKeys.has(k));

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
  ctx.strokeStyle = chartTheme.border ?? '#2d3561';
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
    ctx.fillStyle = chartTheme.textSecondary ?? '#7da4bc';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillText(String(labelVal), 4, gy + 4);
  }

  // X axis labels
  const tickStart = startIdx;
  const tickEnd = startIdx + visible.length;
  for (let t = Math.ceil(tickStart / 100) * 100; t < tickEnd; t += 100) {
    const xPos = marginLeft + ((t - tickStart) / Math.max(visible.length - 1, 1)) * chartW;
    ctx.fillStyle = chartTheme.textSecondary ?? '#7da4bc';
    ctx.fillText(String(t), xPos - 10, h - 5);
  }

  // Color map — population keys must match agent type names exactly
  const lineColors: Record<string, string> = {};
  for (let i = 0; i < model.agentTypes.length; i++) {
    const at = model.agentTypes[i]!;
    lineColors[at.type] = getThemedAgentColor(i, at.color);
  }
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
}
