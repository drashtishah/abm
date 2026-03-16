// Creates parameter sliders grouped by tier (core visible, advanced collapsible).
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
    const infoWrapper = document.createElement('span');
    infoWrapper.className = 'info-wrapper';

    const icon = document.createElement('span');
    icon.className = 'info-icon';
    icon.textContent = '\u2139';
    icon.setAttribute('tabindex', '0');
    icon.setAttribute('role', 'button');
    icon.setAttribute('aria-label', `Info about ${field.label}`);

    const tooltip = document.createElement('span');
    tooltip.className = 'info-tooltip';
    tooltip.id = `tooltip-${field.key}`;
    tooltip.setAttribute('role', 'tooltip');
    tooltip.textContent = field.info;

    icon.setAttribute('aria-describedby', tooltip.id);

    icon.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        icon.blur();
      }
    });

    // Position tooltip near icon, clamped to viewport
    function positionTooltip(): void {
      const rect = icon.getBoundingClientRect();
      const tooltipW = 250; // max-width from CSS
      let left = rect.left;
      let top = rect.top - 8;

      // Clamp horizontally
      if (left + tooltipW > window.innerWidth - 8) {
        left = window.innerWidth - tooltipW - 8;
      }
      if (left < 8) left = 8;

      tooltip.style.left = `${left}px`;
      // Show above the icon; measure after display
      tooltip.style.top = '';
      tooltip.style.bottom = `${window.innerHeight - top}px`;
    }

    icon.addEventListener('mouseenter', positionTooltip);
    icon.addEventListener('focus', positionTooltip);

    infoWrapper.appendChild(icon);
    infoWrapper.appendChild(tooltip);
    label.appendChild(infoWrapper);

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

  const coreFields = model.configSchema.filter(f => f.tier !== 'hidden' && f.tier !== 'advanced');
  const advancedFields = model.configSchema.filter(f => f.tier === 'advanced');

  // Render core sliders directly
  for (const field of coreFields) {
    container.appendChild(createSliderRow(field, world));
  }

  // Render advanced sliders in collapsible section
  if (advancedFields.length > 0) {
    const toggle = document.createElement('button');
    toggle.className = 'advanced-toggle';
    toggle.textContent = '\u25b8 Advanced';
    toggle.setAttribute('aria-expanded', 'false');

    const advWrapper = document.createElement('div');
    advWrapper.className = 'advanced-params collapsed';

    toggle.addEventListener('click', () => {
      const isCollapsed = advWrapper.classList.toggle('collapsed');
      toggle.textContent = isCollapsed ? '\u25b8 Advanced' : '\u25be Advanced';
      toggle.setAttribute('aria-expanded', String(!isCollapsed));
    });

    for (const field of advancedFields) {
      advWrapper.appendChild(createSliderRow(field, world));
    }

    container.appendChild(toggle);
    container.appendChild(advWrapper);
  }

  // Toggles
  if (model.toggles) {
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

      checkbox.addEventListener('change', () => {
        world.updateConfig({ [tog.key]: checkbox.checked ? 1 : 0 });
      });

      wrapper.appendChild(checkbox);
      wrapper.appendChild(label);
      container.appendChild(wrapper);
    }
  }
}
