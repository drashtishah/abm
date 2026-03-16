// Wires control buttons to world lifecycle. Setup=rerun, Reset=restore defaults.
import type { World } from './types.js';

export interface ControlsOptions {
  world: World;
  defaultConfig: Record<string, number>;
  onReset?: () => void;
}

export function setupControls({ world, defaultConfig, onReset }: ControlsOptions): void {
  const setupBtn = document.getElementById('btn-setup');
  const goBtn = document.getElementById('btn-go');
  const stepBtn = document.getElementById('btn-step');
  const resetBtn = document.getElementById('btn-reset');

  if (setupBtn) {
    setupBtn.addEventListener('click', () => {
      // Setup: re-initialize with CURRENT config (user's tweaks preserved)
      world.running = false;
      world.reset();
      if (goBtn) {
        goBtn.textContent = 'Go';
        goBtn.classList.remove('active');
        goBtn.setAttribute('aria-pressed', 'false');
      }
    });
  }

  if (goBtn) {
    goBtn.title = 'Run/stop the simulation continuously';
    goBtn.setAttribute('aria-pressed', 'false');
    goBtn.addEventListener('click', () => {
      world.running = !world.running;
      goBtn.textContent = world.running ? 'Stop' : 'Go';
      goBtn.classList.toggle('active', world.running);
      goBtn.setAttribute('aria-pressed', String(world.running));
    });
  }

  if (stepBtn) {
    stepBtn.addEventListener('click', () => {
      if (!world.running) {
        world.step();
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      // Reset: restore ALL config to defaults, then re-initialize
      world.updateConfig(defaultConfig);
      world.running = false;
      world.reset();
      if (goBtn) {
        goBtn.textContent = 'Go';
        goBtn.classList.remove('active');
        goBtn.setAttribute('aria-pressed', 'false');
      }
      if (onReset) onReset();
    });
  }
}
