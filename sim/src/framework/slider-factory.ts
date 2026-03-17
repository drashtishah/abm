// Creates parameter sliders for all visible fields (hidden fields excluded).
import type { World } from './types.js';
import type { ModelDefinition, ConfigField } from './model-registry.js';

function createSliderRow(
  field: ConfigField,
  world: World,
): HTMLDivElement {
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
    label.classList.add('has-info');

    const tooltip = document.createElement('span');
    tooltip.className = 'info-tooltip';
    tooltip.id = `tooltip-${field.key}`;
    tooltip.setAttribute('role', 'tooltip');
    tooltip.textContent = field.info;

    label.setAttribute('aria-describedby', tooltip.id);

    label.appendChild(tooltip);

    input.setAttribute('aria-describedby', `tooltip-${field.key}`);
  }

  wrapper.appendChild(label);
  wrapper.appendChild(input);
  wrapper.appendChild(valueDisplay);
  return wrapper;
}

export function createSliders(
  model: ModelDefinition,
  world: World,
  container: HTMLElement
): void {
  container.innerHTML = '';

  const visibleFields = model.configSchema.filter(f => f.tier !== 'hidden');

  for (const field of visibleFields) {
    container.appendChild(createSliderRow(field, world));
  }

  // Toggles (with separator spacing)
  if (model.toggles && model.toggles.length > 0) {
    const separator = document.createElement('div');
    separator.className = 'toggle-separator';
    container.appendChild(separator);

    for (const tog of model.toggles) {
      const wrapper = document.createElement('div');
      wrapper.className = 'toggle-row';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `toggle-${tog.key}`;
      checkbox.checked = tog.default;

      const label = document.createElement('label');
      label.textContent = tog.label;
      label.htmlFor = `toggle-${tog.key}`;

      if (tog.info) {
        label.classList.add('has-info');

        const tooltip = document.createElement('span');
        tooltip.className = 'info-tooltip';
        tooltip.id = `tooltip-${tog.key}`;
        tooltip.setAttribute('role', 'tooltip');
        tooltip.textContent = tog.info;

        label.setAttribute('aria-describedby', tooltip.id);
        label.appendChild(tooltip);
      }

      checkbox.addEventListener('change', () => {
        world.updateConfig({ [tog.key]: checkbox.checked ? 1 : 0 });
      });

      wrapper.appendChild(checkbox);
      wrapper.appendChild(label);
      container.appendChild(wrapper);
    }
  }
}
