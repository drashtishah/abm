---
title: Agent-Readable Output
description: Standards for making the ABM simulator UI programmatically accessible to AI agents, automated testing, and accessibility tools.
---

## Principle

The simulator must be usable not only by humans but also by AI agents and automated tools. Every piece of simulation state should be queryable from the DOM, and every control should be addressable via stable selectors.

## Data Attributes

All annotatable UI sections use `data-section` attributes for identification:

```html
<h1 data-section="TITLE">Simulator</h1>
<span data-section="TICK-DISPLAY" id="tick-display">Tick: 0</span>
<select data-section="MODEL-SELECTOR" id="model-select">...</select>
<pre data-section="MODEL-DESCRIPTION" id="model-context">...</pre>
<div data-section="CONTROL-BUTTONS">...</div>
<input data-section="SPEED-SLIDER" id="speed-slider" type="range">
<div data-section="PARAMETER-SLIDERS" id="slider-container">...</div>
<div data-section="POPULATION-COUNTS">...</div>
<button data-section="DOWNLOAD-BTN" id="btn-download">...</button>
<canvas data-section="SIMULATION-CANVAS" id="sim-canvas">...</canvas>
<canvas data-section="POPULATION-CHART" id="chart-canvas">...</canvas>
```

Parameter sliders use `data-param` matching the config key name:

```html
<input type="range" data-param="wolfSpeed" min="0.5" max="5" step="0.1" value="1.8">
<input type="range" data-param="initialWolves" min="1" max="200" step="1" value="30">
```

## Stable DOM IDs

These IDs are part of the public contract and must not be renamed without updating all references:

| Element | ID | Content Format |
|---------|-----|---------------|
| Simulation canvas | `#sim-canvas` | `<canvas>` element |
| Chart canvas | `#chart-canvas` | `<canvas>` element |
| Tick counter | `#tick-display` | `"Tick: {number}"` |
| Wolf count | `#pop-wolves` | `"Wolves: {number}"` |
| Sheep count | `#pop-sheep` | `"Sheep: {number}"` |
| Grass count | `#pop-grass` | `"Grass: {number}"` |
| Model selector | `#model-select` | `<select>` with `<option value="{id}">` |
| Model description | `#model-context` | `<pre>` with multi-line text |
| Speed slider | `#speed-slider` | `<input type="range">` |
| Speed value | `#speed-value` | Text showing current speed |
| Slider container | `#slider-container` | Contains all parameter sliders |
| Go button | `#btn-go` | Button text: "Go" |
| Stop button | `#btn-stop` | Button text: "Stop" |
| Step button | `#btn-step` | Button text: "Step" |
| Reset button | `#btn-reset` | Button text: "Reset" |
| Download button | `#btn-download` | CSV export trigger |
| Agent inspector | `#agent-inspector` | Popup with agent details |
| Inspector content | `#inspector-content` | Agent type, id, position, energy, speed |

## Semantic HTML

- Use `<label>` elements linked to sliders via `for` attribute
- Use `<h1>`, `<h2>`, `<h3>` in correct hierarchy
- Use `<button>` for actions, not styled `<div>` or `<span>`
- Use `<select>` with `<option>` for model selection
- Canvas elements should have ARIA descriptions:
  ```html
  <canvas id="sim-canvas" role="img" aria-label="Agent-based model simulation visualization">
  ```

## Reading Simulation State from the DOM

An AI agent or test can read the current state without accessing JavaScript internals:

```javascript
// Read tick count
const tick = parseInt(document.getElementById('tick-display').textContent.replace('Tick: ', ''));

// Read population counts
const wolves = parseInt(document.getElementById('pop-wolves').textContent.replace('Wolves: ', ''));
const sheep = parseInt(document.getElementById('pop-sheep').textContent.replace('Sheep: ', ''));

// Read a config value from a slider
const wolfSpeed = parseFloat(document.querySelector('[data-param="wolfSpeed"]').value);

// Check if simulation is running (via button state)
const goBtn = document.getElementById('btn-go');
const isRunning = goBtn.disabled; // or check for 'active' class

// Read current model
const modelId = document.getElementById('model-select').value;
```

## Playwright MCP Setup

For interactive verification of the live app, install the Playwright MCP server:

```bash
claude mcp add playwright npx @playwright/mcp@latest
```

This allows agents to:
- Browse to `localhost:5173` and screenshot the app
- Click buttons and drag sliders
- Inspect DOM elements and read their values
- Verify visual rendering matches expectations

## Verification Workflow

After any UI change, verify agent-readability:

1. **Attribute check**: Confirm all interactive elements have `data-section` or `data-param` attributes
2. **ID stability check**: Ensure no stable IDs were renamed or removed
3. **Semantic check**: Verify headings, labels, and ARIA attributes are correct
4. **State readability check**: Confirm population counts, tick, and config are readable from DOM
5. **Playwright test**: Run `npm run test:e2e` to verify automated interactions work

```bash
# Quick attribute audit (from sim/ directory)
# Verify data-section attributes exist in index.html
grep -c 'data-section' index.html

# Verify data-param attributes exist in slider output
# (Run dev server, then check in browser devtools or via Playwright)
```

## Web Fetch Verification

The Web Fetch tool can verify the HTML structure of the running app:

```
GET http://localhost:5173
```

Check for:
- All stable DOM IDs present
- `data-section` attributes on annotatable elements
- `data-param` attributes on slider inputs
- Proper `<label>` elements for form controls
- Canvas elements with ARIA attributes
