import type { World } from './types.js';
import type { ModelDefinition } from './model-registry.js';

export function createSliders(
  model: ModelDefinition,
  world: World,
  container: HTMLElement
): void {
  container.innerHTML = '';

  for (const field of model.configSchema) {
    // Skip hidden fields — not user-configurable
    if (field.tier === 'hidden') continue;

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

    if (field.info) {
      const infoWrapper = document.createElement('span');
      infoWrapper.className = 'info-wrapper';

      const icon = document.createElement('span');
      icon.className = 'info-icon';
      icon.textContent = '\u24d8';
      icon.setAttribute('tabindex', '0');
      icon.setAttribute('role', 'button');
      icon.setAttribute('aria-label', `Info about ${field.label}`);

      const tooltip = document.createElement('span');
      tooltip.className = 'info-tooltip';
      tooltip.id = `tooltip-${field.key}`;
      tooltip.setAttribute('role', 'tooltip');
      tooltip.textContent = field.info;

      icon.setAttribute('aria-describedby', tooltip.id);

      // Dismiss on Escape
      icon.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          icon.blur();
        }
      });

      infoWrapper.appendChild(icon);
      infoWrapper.appendChild(tooltip);
      label.appendChild(infoWrapper);

      input.setAttribute('aria-describedby', `tooltip-${field.key}`);
    }

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
