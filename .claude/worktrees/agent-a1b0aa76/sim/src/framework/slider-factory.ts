import type { World } from './types.js';
import type { ModelDefinition } from './model-registry.js';

export function createSliders(
  model: ModelDefinition,
  world: World,
  container: HTMLElement
): void {
  container.innerHTML = '';

  for (const field of model.configSchema) {
    // Skip width/height — not user-configurable
    if (field.key === 'width' || field.key === 'height') continue;

    const wrapper = document.createElement('div');
    wrapper.className = 'slider-row';

    const label = document.createElement('label');
    label.textContent = field.label;
    label.htmlFor = `slider-${field.key}`;

    const input = document.createElement('input');
    input.type = 'range';
    input.id = `slider-${field.key}`;
    input.min = String(field.min);
    input.max = String(field.max);
    input.step = String(field.step);
    input.value = String(world.config[field.key] ?? field.default);

    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'slider-value';
    valueDisplay.textContent = input.value;

    input.addEventListener('input', () => {
      valueDisplay.textContent = input.value;
      world.updateConfig({ [field.key]: Number(input.value) });
    });

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    wrapper.appendChild(valueDisplay);
    container.appendChild(wrapper);
  }

  // Toggles
  if (model.toggles) {
    for (const toggle of model.toggles) {
      const wrapper = document.createElement('div');
      wrapper.className = 'toggle-row';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `toggle-${toggle.key}`;
      checkbox.checked = toggle.default;

      const label = document.createElement('label');
      label.textContent = toggle.label;
      label.htmlFor = `toggle-${toggle.key}`;

      checkbox.addEventListener('change', () => {
        world.updateConfig({ [toggle.key]: checkbox.checked ? 1 : 0 });
      });

      wrapper.appendChild(checkbox);
      wrapper.appendChild(label);
      container.appendChild(wrapper);
    }
  }
}
