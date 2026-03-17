import './models/index.js';
import { listModels, getModel, getPopulationDisplay } from './framework/model-registry.js';
import type { ModelDefinition, PopulationDisplayEntry } from './framework/model-registry.js';
import type { World } from './framework/types.js';
import { render } from './framework/canvas-renderer.js';
import { renderChart } from './framework/stats-overlay.js';
import { setupControls } from './framework/controls.js';
import { createSliders } from './framework/slider-factory.js';
import { exportCSV } from './framework/csv-export.js';
import { renderContextHTML } from './framework/context-renderer.js';
import './framework/themes/index.js';
import { listThemes, applyTheme, getSavedThemeId, getThemedAgentColor, getTheme } from './framework/themes/theme-registry.js';

let currentModel: ModelDefinition;
let world: World;

const simCanvas = document.getElementById('sim-canvas') as HTMLCanvasElement;
const simCtx = simCanvas.getContext('2d')!;
const chartCanvas = document.getElementById('chart-canvas') as HTMLCanvasElement;
const chartCtx = chartCanvas.getContext('2d')!;
const modelSelect = document.getElementById('model-select') as HTMLSelectElement;
const sliderContainer = document.getElementById('slider-container')!;
const tickDisplay = document.getElementById('tick-display')!;
const popContainer = document.getElementById('pop-counts')!;
const chartLegend = document.getElementById('chart-legend')!;
const modelContext = document.getElementById('model-context')!;

// Dynamic population display — populated on model load from populationDisplay config
let popElements = new Map<string, HTMLElement>();
let popDisplayEntries: PopulationDisplayEntry[] = [];

/** Resolve themed color for a population entry by its position in populationDisplay. */
function themedPopColor(entry: PopulationDisplayEntry, model: ModelDefinition): string {
  const entries = getPopulationDisplay(model);
  const idx = entries.findIndex(e => e.key === entry.key);
  return idx >= 0 ? getThemedAgentColor(idx, entry.color) : entry.color;
}

function buildPopulationDisplay(model: ModelDefinition): void {
  popContainer.textContent = '';
  popElements = new Map();
  popDisplayEntries = getPopulationDisplay(model);
  for (const entry of popDisplayEntries) {
    const span = document.createElement('span');
    span.style.color = themedPopColor(entry, model);
    span.setAttribute('data-pop-key', entry.key);
    span.textContent = `${entry.label}: 0`;
    popContainer.appendChild(span);
    popElements.set(entry.key, span);
  }
}

function buildChartLegend(model: ModelDefinition): void {
  chartLegend.textContent = '';
  const entries = getPopulationDisplay(model).filter(e => e.showInChart !== false);
  for (const entry of entries) {
    const span = document.createElement('span');
    span.className = 'legend-item';
    span.style.color = themedPopColor(entry, model);
    span.textContent = `\u25A0 ${entry.label}`;
    chartLegend.appendChild(span);
  }
}

/** Replace hardcoded colors in patternSvg with themed palette colors. */
function themedPatternSvg(svg: string, model: ModelDefinition): string {
  let result = svg;
  // Replace populationDisplay colors (covers chart line colors in SVG)
  const popEntries = getPopulationDisplay(model);
  for (let i = 0; i < popEntries.length; i++) {
    const original = popEntries[i]!.color;
    const themed = getThemedAgentColor(i, original);
    if (themed !== original) {
      result = result.split(original).join(themed);
    }
  }
  return result;
}

/** Rebuild all color-dependent UI elements for the current model and theme. */
function rebuildThemedColors(): void {
  if (!currentModel) return;
  buildPopulationDisplay(currentModel);
  buildChartLegend(currentModel);

  const contextColorMap = new Map<string, string>();
  const popEntries = getPopulationDisplay(currentModel);
  for (let i = 0; i < popEntries.length; i++) {
    const entry = popEntries[i]!;
    contextColorMap.set(entry.key, getThemedAgentColor(i, entry.color));
  }
  for (let i = 0; i < currentModel.agentTypes.length; i++) {
    const at = currentModel.agentTypes[i]!;
    if (!contextColorMap.has(at.type)) {
      contextColorMap.set(at.type, getThemedAgentColor(i, at.color));
    }
  }

  // Replace {color:N} placeholders with theme palette labels
  let contextText = currentModel.context;
  const theme = getTheme(getSavedThemeId());
  if (theme?.paletteLabels) {
    contextText = contextText.replace(/\{color:(\d+)\}/g, (_, idx) => {
      const i = parseInt(idx, 10);
      return theme.paletteLabels?.[i] ?? `color ${i}`;
    });
  }

  modelContext.innerHTML = renderContextHTML(contextText, contextColorMap);
  if (currentModel.challengeText || currentModel.patternSvg) {
    let challengeHTML = '<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">';
    if (currentModel.challengeText) {
      challengeHTML += `<div style="color:var(--accent-primary);font-size:13px;font-weight:600;line-height:1.4;margin-bottom:6px">${currentModel.challengeText}</div>`;
    }
    if (currentModel.patternSvg) {
      challengeHTML += themedPatternSvg(currentModel.patternSvg, currentModel);
    }
    challengeHTML += '</div>';
    modelContext.innerHTML += challengeHTML;
  }
}

const attribution = document.getElementById('attribution')!;
const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
const speedValue = document.getElementById('speed-value')!;
const downloadBtn = document.getElementById('btn-download')!;
const chartArea = document.querySelector('.chart-area') as HTMLElement;

// Agent inspector (close/escape handlers only)
const inspectorEl = document.getElementById('agent-inspector')!;
const inspectorClose = document.getElementById('inspector-close')!;

// Buffered canvas resize (Task 8: ResizeObserver race fix)
let pendingCanvasWidth = 0;
let pendingCanvasHeight = 0;

const canvasArea = simCanvas.parentElement ?? simCanvas;
const canvasResizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const { width, height } = entry.contentRect;
    if (width > 0 && height > 0) {
      pendingCanvasWidth = Math.floor(width);
      pendingCanvasHeight = Math.floor(height);
    }
  }
});
canvasResizeObserver.observe(canvasArea);

// Populate model selector
const models = listModels();
for (const m of models) {
  const opt = document.createElement('option');
  opt.value = m.id;
  opt.textContent = m.name;
  modelSelect.appendChild(opt);
}

// Tick display optimization (Task 11)
let lastRenderedTick = -1;
let animationHandle = 0;


function loadModel(id: string): void {
  const def = getModel(id);
  if (!def) return;

  // Cancel pending animation frame during model switch
  cancelAnimationFrame(animationHandle);

  currentModel = def;
  world = def.createWorld({ ...def.defaultConfig });
  world.setup();

  // Reset tick tracking for new model
  lastRenderedTick = -1;

  // Hide chart and disable CSV until simulation produces data
  chartArea.classList.remove('has-data');
  downloadBtn.setAttribute('disabled', '');

  // Build themed population display, chart legend, context, and pattern SVG
  rebuildThemedColors();

  attribution.innerHTML = def.credit
    ? `<p>${def.credit}</p>`
    : '';

  createSliders(def, world, sliderContainer);
  setupControls({
    world,
    defaultConfig: { ...def.defaultConfig },
    configSchema: def.configSchema,
    onReset: () => {
      // Sync slider UI to new randomized values from world.config
      for (const field of def.configSchema) {
        const slider = document.getElementById(`slider-${field.key}`) as HTMLInputElement | null;
        if (slider) {
          const val = String(world.config[field.key] ?? field.default);
          slider.value = val;
          const valueSpan = slider.parentElement?.querySelector('.slider-value');
          if (valueSpan) valueSpan.textContent = val;
        }
      }
    },
  });

  // Set canvas size to fill container (ResizeObserver keeps it updated)
  const canvasRect = canvasArea.getBoundingClientRect();
  simCanvas.width = Math.floor(canvasRect.width) || (world.config['width'] ?? 800);
  simCanvas.height = Math.floor(canvasRect.height) || (world.config['height'] ?? 600);

  // Agent inspector removed — canvas clicks have no action

  // Initial render + restart animation loop (cancelAnimationFrame above killed it)
  render(simCtx, world, currentModel);
  animationHandle = requestAnimationFrame(loop);
}

modelSelect.addEventListener('change', () => {
  loadModel(modelSelect.value);
});

// Speed slider
speedSlider.addEventListener('input', () => {
  const val = speedSlider.value;
  speedValue.textContent = val;
  speedSlider.setAttribute('aria-valuetext', `${val}x speed`);
});

// CSV download
downloadBtn.addEventListener('click', () => {
  exportCSV(world, currentModel);
});

// Inspector close button (not model-scoped)
inspectorClose.addEventListener('click', () => {
  inspectorEl.style.display = 'none';
});

// Drag handle for sidebar resizing
const dragHandle = document.getElementById('drag-handle')!;
const appEl = document.querySelector('.app') as HTMLElement;
let isDragging = false;

dragHandle.addEventListener('mousedown', () => {
  isDragging = true;
  dragHandle.classList.add('dragging');
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
});

document.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const minWidth = 200;
  const maxWidth = 500;
  const newWidth = Math.min(maxWidth, Math.max(minWidth, e.clientX));
  appEl.style.gridTemplateColumns = `${newWidth}px 4px 1fr`;
  dragHandle.setAttribute('aria-valuenow', String(newWidth));
});

document.addEventListener('mouseup', () => {
  if (!isDragging) return;
  isDragging = false;
  dragHandle.classList.remove('dragging');
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  resizeChart();
});

// Drag handle keyboard support
dragHandle.addEventListener('keydown', (e) => {
  const step = 20;
  const cols = appEl.style.gridTemplateColumns;
  const currentWidth = parseInt(cols) || 280;
  let newWidth = currentWidth;

  if (e.key === 'ArrowLeft') newWidth = Math.max(200, currentWidth - step);
  else if (e.key === 'ArrowRight') newWidth = Math.min(500, currentWidth + step);
  else return;

  e.preventDefault();
  appEl.style.gridTemplateColumns = `${newWidth}px 4px 1fr`;
  dragHandle.setAttribute('aria-valuenow', String(newWidth));
  resizeChart();
});

// Drag handle touch support
dragHandle.addEventListener('touchstart', (e) => {
  isDragging = true;
  dragHandle.classList.add('dragging');
  e.preventDefault();
}, { passive: false });

document.addEventListener('touchmove', (e) => {
  if (!isDragging) return;
  const touch = e.touches[0];
  if (!touch) return;
  const minWidth = 200;
  const maxWidth = 500;
  const newWidth = Math.min(maxWidth, Math.max(minWidth, touch.clientX));
  appEl.style.gridTemplateColumns = `${newWidth}px 4px 1fr`;
}, { passive: true });

document.addEventListener('touchend', () => {
  if (!isDragging) return;
  isDragging = false;
  dragHandle.classList.remove('dragging');
  resizeChart();
});

// Cancel drag on blur/visibility change
function cancelDrag(): void {
  if (!isDragging) return;
  isDragging = false;
  dragHandle.classList.remove('dragging');
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
}

window.addEventListener('blur', cancelDrag);
document.addEventListener('visibilitychange', cancelDrag);

// Chart drag handle for resizing chart height
const chartDragHandle = document.getElementById('chart-drag-handle')!;
let isChartDragging = false;
let chartDragStartY = 0;
let chartStartHeight = 200;

chartDragHandle.addEventListener('mousedown', (e) => {
  isChartDragging = true;
  chartDragStartY = e.clientY;
  chartStartHeight = chartArea.getBoundingClientRect().height;
  chartDragHandle.classList.add('dragging');
  document.body.style.cursor = 'row-resize';
  document.body.style.userSelect = 'none';
});

document.addEventListener('mousemove', (e) => {
  if (!isChartDragging) return;
  const delta = chartDragStartY - e.clientY;
  const newHeight = Math.min(400, Math.max(100, chartStartHeight + delta));
  chartArea.style.height = `${newHeight}px`;
  chartDragHandle.setAttribute('aria-valuenow', String(Math.round(newHeight)));
});

document.addEventListener('mouseup', () => {
  if (!isChartDragging) return;
  isChartDragging = false;
  chartDragHandle.classList.remove('dragging');
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  resizeChart();
});

// Chart drag keyboard support
chartDragHandle.addEventListener('keydown', (e) => {
  const step = 20;
  const currentHeight = chartArea.getBoundingClientRect().height;
  let newHeight = currentHeight;

  if (e.key === 'ArrowUp') newHeight = Math.min(400, currentHeight + step);
  else if (e.key === 'ArrowDown') newHeight = Math.max(100, currentHeight - step);
  else return;

  e.preventDefault();
  chartArea.style.height = `${newHeight}px`;
  chartDragHandle.setAttribute('aria-valuenow', String(Math.round(newHeight)));
  resizeChart();
});

// Chart drag touch support
chartDragHandle.addEventListener('touchstart', (e) => {
  isChartDragging = true;
  chartDragStartY = e.touches[0]!.clientY;
  chartStartHeight = chartArea.getBoundingClientRect().height;
  chartDragHandle.classList.add('dragging');
  e.preventDefault();
}, { passive: false });

document.addEventListener('touchmove', (e) => {
  if (!isChartDragging) return;
  const touch = e.touches[0];
  if (!touch) return;
  const delta = chartDragStartY - touch.clientY;
  const newHeight = Math.min(400, Math.max(100, chartStartHeight + delta));
  chartArea.style.height = `${newHeight}px`;
}, { passive: true });

document.addEventListener('touchend', () => {
  if (!isChartDragging) return;
  isChartDragging = false;
  chartDragHandle.classList.remove('dragging');
  resizeChart();
});

// Inspector keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && inspectorEl.style.display === 'block') {
    inspectorEl.style.display = 'none';
  }
});

inspectorClose.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    inspectorEl.style.display = 'none';
  }
});

// Resize chart canvas
function resizeChart(): void {
  const container = chartCanvas.parentElement;
  if (container) {
    chartCanvas.width = container.clientWidth;
    chartCanvas.height = container.clientHeight;
  }
}

window.addEventListener('resize', resizeChart);
resizeChart();

// Load first model
if (models[0]) {
  modelSelect.value = models[0].id;
  loadModel(models[0].id);
}

// Settings dropdown
const settingsBtn = document.getElementById('btn-settings')!;
const settingsDropdown = document.getElementById('settings-dropdown')!;
const themeListEl = document.getElementById('theme-list')!;

function populateThemeList(): void {
  themeListEl.textContent = '';
  const currentId = getSavedThemeId();
  for (const theme of listThemes()) {
    const el = document.createElement('div');
    el.className = 'theme-option' + (theme.id === currentId ? ' active' : '');
    el.textContent = theme.name;
    el.setAttribute('role', 'menuitem');
    el.setAttribute('data-theme-id', theme.id);
    el.addEventListener('click', () => {
      applyTheme(theme.id);
      rebuildThemedColors();
      populateThemeList();
    });
    themeListEl.appendChild(el);
  }
}

settingsBtn.addEventListener('click', () => {
  const isOpen = settingsDropdown.classList.toggle('open');
  settingsBtn.setAttribute('aria-expanded', String(isOpen));
  if (isOpen) populateThemeList();
});

// Close dropdown on outside click
document.addEventListener('click', (e) => {
  if (!(e.target as Element).closest('.settings-wrapper')) {
    settingsDropdown.classList.remove('open');
    settingsBtn.setAttribute('aria-expanded', 'false');
  }
});

// Apply saved theme on startup
applyTheme(getSavedThemeId());

// Animation loop
function loop(): void {
  // Skip work when tab is backgrounded (Task 7)
  if (document.visibilityState === 'hidden') {
    animationHandle = requestAnimationFrame(loop);
    return;
  }

  // Apply pending resize before any draw calls (Task 8)
  if (pendingCanvasWidth > 0 && pendingCanvasHeight > 0) {
    simCanvas.width = pendingCanvasWidth;
    simCanvas.height = pendingCanvasHeight;
    pendingCanvasWidth = 0;
    pendingCanvasHeight = 0;
  }

  const speed = parseInt(speedSlider.value, 10) || 1;

  if (world.running) {
    // Cap at 10 steps per frame to prevent jank on low-end hardware
    const effectiveSteps = Math.min(speed, 10);
    for (let i = 0; i < effectiveSteps; i++) {
      world.step();
    }
  }

  // Render every frame
  render(simCtx, world, currentModel);
  renderChart(chartCtx, world, currentModel);

  // Skip redundant DOM writes when paused (Task 11)
  if (world.tick !== lastRenderedTick) {
    const counts = world.getPopulationCounts();
    tickDisplay.textContent = `Tick: ${world.tick}`;
    for (const entry of popDisplayEntries) {
      const el = popElements.get(entry.key);
      if (el) el.textContent = `${entry.label}: ${counts[entry.key] ?? 0}`;
    }

    lastRenderedTick = world.tick;

    // Show chart once there's data, enable CSV download
    const hasData = world.populationHistory.length > 0;
    const wasHidden = !chartArea.classList.contains('has-data');
    chartArea.classList.toggle('has-data', hasData);
    if (hasData) {
      downloadBtn.removeAttribute('disabled');
      // Resize chart canvas when first shown (was 0 height while hidden)
      if (wasHidden) resizeChart();
    } else {
      downloadBtn.setAttribute('disabled', '');
    }
  }

  // Disable step button while running
  const stepBtn = document.getElementById('btn-step');
  if (stepBtn) {
    if (world.running) {
      stepBtn.setAttribute('disabled', '');
    } else {
      stepBtn.removeAttribute('disabled');
    }
  }

  animationHandle = requestAnimationFrame(loop);
}
