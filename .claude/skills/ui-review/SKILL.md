---
name: ui-review
description: >-
  Playground-based UI review workflow for the ABM simulator. Creates an interactive
  HTML mockup where users click elements to add comments, generating structured prompts
  with file references. For the multi-persona agent team review, use the `review-team`
  skill instead. Trigger: "review UI", "annotate mockup", "UI feedback", "update
  playground", "review the webpage".
---

## 1. When to Use

Activate this skill when the user says any of:
- "review UI", "annotate mockup", "UI feedback"
- "update playground", "review the webpage"
- Any request to visually inspect, critique, or annotate the simulator interface

For **agent team review** (9-persona review), use the `review-team` skill instead.

## 2. Playground Workflow

Create or update the mockup file at `.claude/skills/ui-review/abm-interface-mockup.html` — a single self-contained HTML file that mirrors the real simulator and lets users click on UI sections to add review comments.

### Requirements

- **Single HTML file**, dark theme, zero external dependencies (all CSS and JS inline)
- **Left panel**: Static mockup of the full simulator
  - Header with title and tick display
  - Model selector dropdown
  - Model description text
  - Controls sidebar with Play/Pause/Reset buttons and speed slider
  - All 16 `configSchema` parameters from `definition.ts` rendered as sliders with labels, values, min/max/step
  - Canvas area with fake rendered agents (colored dots for wolves, sheep, grass)
  - Population chart (static SVG or canvas sketch)
  - Population count badges
  - CSV download button
  - Agent inspector panel
  - Drag handle for canvas resizing
  - Attribution footer
- **Right panel**: Review panel with comment system
  - Click any element with a `data-section` attribute to select it
  - Selected section highlights with a visible border
  - Text input for adding comments per section
  - Comment list showing all annotations with section labels
  - Delete button per comment
- **Bottom-right**: Auto-generated prompt textarea
  - Prompt includes all comments grouped by section
  - Each section references its relevant source files (from `.claude/skills/review-team/references/section-map.md`)
  - Copy-to-clipboard button
- **CSS variables** must mirror the real app's theming (from `sim/index.html :root`)
- **Element structure** must match the real app's DOM hierarchy

### Data Attributes

Every annotatable element must have `data-section="SECTION-NAME"` matching the keys in `.claude/skills/review-team/references/section-map.md` (canonical source — shared with review-team skill):

```
TITLE, TICK-DISPLAY, MODEL-SELECTOR, MODEL-DESCRIPTION,
CONTROL-BUTTONS, SPEED-SLIDER, PARAMETER-SLIDERS, POPULATION-COUNTS,
DOWNLOAD-BTN, ATTRIBUTION, SIMULATION-CANVAS, POPULATION-CHART,
AGENT-INSPECTOR, DRAG-HANDLE
```

### File Mapping

Include a `sectionFiles` JavaScript object that maps each section to its source files:

```javascript
const sectionFiles = {
  'TITLE': ['sim/index.html'],
  'TICK-DISPLAY': ['sim/index.html', 'sim/src/main.ts'],
  // ... (see references/section-map.md for full mapping)
};
```

### After Creating/Updating

Always run `open <filename>.html` to open the mockup in the default browser for verification.

## 3. Agent Team Review

For the full 9-persona agent team review, use the `review-team` skill instead.
The playground's annotation output is compatible with the review-team report format.

## 4. Keeping the Mockup Updated

When the real simulator changes, the mockup must stay in sync:

1. Read `sim/src/models/wolf-sheep/definition.ts` — extract current `configSchema` (parameter names, types, defaults, min, max, step)
2. Read `sim/index.html` — extract current layout structure, CSS variables, element hierarchy
3. Update the mockup HTML to reflect any changes:
   - New or removed parameters become new or removed sliders
   - Layout changes are mirrored
   - New UI elements get a `data-section` attribute
4. Update `.claude/skills/review-team/references/section-map.md` if new sections are added
5. Run `open <filename>.html` to verify

## 5. Handoff

The generated prompt from either the playground or the agent team review is designed for direct consumption by the `code` skill:
- Each section references specific source files to read before editing
- Issues are grouped by section so changes can be scoped
- Severity levels help prioritize implementation order
- Suggestions are actionable and specific, not vague
