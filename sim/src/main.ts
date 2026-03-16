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
  speedValue.textContent = speedSlider.value;
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
    inspectorContent.textContent = '';

    const title = document.createElement('strong');
    title.textContent = `${closest.type} #${closest.id}`;
    inspectorContent.appendChild(title);

    const details = [
      `x: ${closest.x.toFixed(1)}, y: ${closest.y.toFixed(1)}`,
      `energy: ${closest.energy.toFixed(1)}`,
      `speed: ${closest.speed}`,
      `alive: ${closest.alive}`,
    ];
    for (const line of details) {
      inspectorContent.appendChild(document.createElement('br'));
      inspectorContent.appendChild(document.createTextNode(line));
    }

    inspectorEl.style.display = 'block';

    // Clamp to viewport bounds
    const inspectorRect = inspectorEl.getBoundingClientRect();
    let left = e.clientX + 10;
    let top = e.clientY + 10;
    if (left + inspectorRect.width > window.innerWidth) {
      left = window.innerWidth - inspectorRect.width - 10;
    }
    if (top + inspectorRect.height > window.innerHeight) {
      top = window.innerHeight - inspectorRect.height - 10;
    }
    inspectorEl.style.left = `${left}px`;
    inspectorEl.style.top = `${top}px`;
  } else {
    inspectorEl.style.display = 'none';
  }
});

inspectorClose.addEventListener('click', () => {
  inspectorEl.style.display = 'none';
});

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

  frameCount++;
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
