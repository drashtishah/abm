// Wires control buttons to world lifecycle. Setup=rerun, Reset=randomize params.
import type { World } from './types.js';
import type { ConfigField } from './model-registry.js';

/** Generate random config values for non-hidden fields, snapped to step. */
export function randomizeConfig(schema: ConfigField[]): Record<string, number> {
  const config: Record<string, number> = {};
  for (const field of schema) {
    if (field.tier === 'hidden') continue;
    const steps = Math.floor((field.max - field.min) / field.step);
    const randomStep = Math.floor(Math.random() * (steps + 1));
    config[field.key] = field.min + randomStep * field.step;
  }
  return config;
}

export interface ControlsOptions {
  world: World;
  defaultConfig: Record<string, number>;
  configSchema?: ConfigField[];
  onReset?: () => void;
}

/** Strip all old listeners by replacing the element with a shallow clone. */
function replaceElement(id: string): HTMLElement | null {
  const el = document.getElementById(id);
  if (!el) return null;
  const fresh = el.cloneNode(true) as HTMLElement;
  el.replaceWith(fresh);
  return fresh;
}

export function setupControls(options: ControlsOptions): void {
  const { world, defaultConfig, onReset } = options;

  // Replace buttons to remove stale listeners from previous model
  const setupBtn = replaceElement('btn-setup');
  const goBtn = replaceElement('btn-go');
  const stepBtn = replaceElement('btn-step');
  const resetBtn = replaceElement('btn-reset');

  // Reset Go button to stopped state (fixes model-switch bug)
  if (goBtn) {
    goBtn.textContent = 'Go';
    goBtn.classList.remove('active');
    goBtn.title = 'Run/stop the simulation continuously';
    goBtn.setAttribute('aria-pressed', 'false');
  }

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
      // Reset: randomize config within schema bounds, or restore defaults
      const newConfig = options.configSchema
        ? randomizeConfig(options.configSchema)
        : defaultConfig;
      world.updateConfig(newConfig);
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
