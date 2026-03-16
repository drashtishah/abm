import type { World } from './types.js';

export function setupControls(world: World): void {
  const setupBtn = document.getElementById('btn-setup');
  const goBtn = document.getElementById('btn-go');
  const stepBtn = document.getElementById('btn-step');
  const resetBtn = document.getElementById('btn-reset');

  if (setupBtn) {
    setupBtn.addEventListener('click', () => {
      world.reset();
    });
  }

  if (goBtn) {
    goBtn.addEventListener('click', () => {
      world.running = !world.running;
      goBtn.textContent = world.running ? 'Stop' : 'Go';
      goBtn.classList.toggle('active', world.running);
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
      world.reset();
      if (goBtn) {
        goBtn.textContent = 'Go';
        goBtn.classList.remove('active');
      }
    });
  }
}
