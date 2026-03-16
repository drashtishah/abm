import './models/index.js';
import { listModels, getModel } from './framework/model-registry.js';
import type { ModelDefinition } from './framework/model-registry.js';
import type { World } from './framework/types.js';
import { render } from './framework/canvas-renderer.js';
import { renderStats, renderChart } from './framework/stats-overlay.js';
import { setupControls } from './framework/controls.js';
import { createSliders } from './framework/slider-factory.js';
import { exportCSV } from './framework/csv-export.js';

let currentModel: ModelDefinition;
let world: World;

const simCanvas = document.getElementById('sim-canvas') as HTMLCanvasElement;
const simCtx = simCanvas.getContext('2d')!;
const chartCanvas = document.getElementById('chart-canvas') as HTMLCanvasElement;
const chartCtx = chartCanvas.getContext('2d')!;
const modelSelect = document.getElementById('model-select') as HTMLSelectElement;
const sliderContainer = document.getElementById('slider-container')!;
const tickDisplay = document.getElementById('tick-display')!;
const popWolves = document.getElementById('pop-wolves')!;
const popSheep = document.getElementById('pop-sheep')!;
const popGrass = document.getElementById('pop-grass')!;
const modelContext = document.getElementById('model-context')!;
const attribution = document.getElementById('attribution')!;
const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
const speedValue = document.getElementById('speed-value')!;
const downloadBtn = document.getElementById('btn-download')!;

// Agent inspector
const inspectorEl = document.getElementById('agent-inspector')!;
const inspectorContent = document.getElementById('inspector-content')!;
const inspectorClose = document.getElementById('inspector-close')!;

// Populate model selector
const models = listModels();
for (const m of models) {
  const opt = document.createElement('option');
  opt.value = m.id;
  opt.textContent = m.name;
  modelSelect.appendChild(opt);
}

function loadModel(id: string): void {
  const def = getModel(id);
  if (!def) return;

  currentModel = def;
  world = def.createWorld({ ...def.defaultConfig });
  world.setup();

  // Update UI
  modelContext.textContent = def.context;
  attribution.innerHTML = def.credit
    ? `<p>${def.credit}</p>`
    : '';

  createSliders(def, world, sliderContainer);
  setupControls(world);

  // Set canvas size
  simCanvas.width = (world.config['width'] ?? 800);
  simCanvas.height = (world.config['height'] ?? 600);

  // Initial render
  render(simCtx, world, currentModel);
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

// Agent inspector on canvas click
simCanvas.addEventListener('click', (e) => {
  const rect = simCanvas.getBoundingClientRect();
  const scaleX = simCanvas.width / rect.width;
  const scaleY = simCanvas.height / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;

  // Find clicked agent
  let closest = null;
  let closestDist = Infinity;
  for (const agent of world.agents) {
    if (!agent.alive) continue;
    const dx = agent.x - mx;
    const dy = agent.y - my;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < agent.radius * 2 && d < closestDist) {
      closestDist = d;
      closest = agent;
    }
  }

  if (closest) {
    inspectorContent.innerHTML = `
      <strong>${closest.type} #${closest.id}</strong><br>
      x: ${closest.x.toFixed(1)}, y: ${closest.y.toFixed(1)}<br>
      energy: ${closest.energy.toFixed(1)}<br>
      speed: ${closest.speed}<br>
      alive: ${closest.alive}
    `;
    inspectorEl.style.display = 'block';
    inspectorEl.style.left = `${e.clientX + 10}px`;
    inspectorEl.style.top = `${e.clientY + 10}px`;
  } else {
    inspectorEl.style.display = 'none';
  }
});

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

// Animation loop
let frameCount = 0;

function loop(): void {
  const speed = parseInt(speedSlider.value, 10) || 1;

  if (world.running) {
    for (let i = 0; i < speed; i++) {
      world.step();
    }
  }

  // Render every frame
  render(simCtx, world, currentModel);
  renderStats(simCtx, world, currentModel);
  renderChart(chartCtx, world, currentModel);

  // Update UI counters
  const counts = world.getPopulationCounts();
  tickDisplay.textContent = `Tick: ${world.tick}`;
  popWolves.textContent = `Wolves: ${counts['wolves'] ?? 0}`;
  popSheep.textContent = `Sheep: ${counts['sheep'] ?? 0}`;
  popGrass.textContent = `Grass: ${counts['grass'] ?? 0}`;

  // Disable step button while running
  const stepBtn = document.getElementById('btn-step');
  if (stepBtn) {
    if (world.running) {
      stepBtn.setAttribute('disabled', '');
    } else {
      stepBtn.removeAttribute('disabled');
    }
  }

  frameCount++;
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
