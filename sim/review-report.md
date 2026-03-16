---
title: Review Report — ABM Simulator
date: 2026-03-16
change_type: mixed
reviewers: [Architect, Domain Expert, UX & Accessibility, Red Team, Performance]
evidence: [Model Validation, Visual Testing (Playwright)]
---

# Review Report — ABM Simulator (mixed change)

## Critical (must fix before shipping)

| # | Section | Issue | Suggestion | Reviewers | Evidence |
|---|---------|-------|------------|-----------|----------|
| 1 | SIMULATION-CANVAS (mobile) | Canvas hidden on all viewports < 1024px — 160/280 visual tests fail. Canvas element exists in DOM but collapsed to zero height | Add `min-height: 300px` to `.canvas-area` in mobile breakpoint; give the canvas grid row an explicit height instead of `auto` | UX, Evidence | Visual tests: tablet-portrait, mobile-large, mobile-small all FAIL |
| 2 | SIMULATION-CANVAS | Canvas has no `role`, no `aria-label` — screen readers announce nothing about the simulation | Add `role="img"` and dynamic `aria-label` updated each tick with population counts (WCAG 1.1.1) | UX | — |
| 3 | POPULATION-CHART | Chart canvas has no ARIA label, legend is canvas-only (inaccessible), no live region for milestones | Add `role="img"` + dynamic `aria-label`; render HTML legend with `<span>` elements; add `aria-live="polite"` status region | UX | — |
| 4 | PARAMETER-SLIDERS | Info tooltip (i icon) is keyboard and touch inaccessible — appears only on `:hover`, no `tabindex`, no `role` | Add `tabindex="0"`, `role="tooltip"`, show on `:focus-within`, handle Escape to dismiss (WCAG 2.1.1) | UX | — |
| 5 | PARAMETER-SLIDERS | `showGrass` toggle is dead UI — wired through config but `canvas-renderer.ts` never reads `config['showGrass']`, always draws grass unconditionally | Gate grass-drawing block with `world.config['showGrass'] !== 0` in canvas-renderer.ts | Architect, Performance | — |
| 6 | MODEL-VALIDATION | No seeded PRNG — all `Math.random()` calls are unseeded, making runs non-deterministic and irreproducible | Introduce a seeded PRNG (mulberry32/xoshiro128), pass seed through config, replace all `Math.random()` calls | Domain | Model validation passes but with lenient thresholds to absorb variance |
| 7 | SIMULATION-CANVAS | `findGrassPatchAt()` does O(N) linear scan through grass array instead of O(1) index lookup; with 200 sheep this is 80,000 comparisons per tick | Replace with direct index arithmetic: `const idx = gy * gridSize + gx; return grass[idx]` | Performance | — |
| 8 | SIMULATION-CANVAS | Dead agents never removed from `this.agents` array — grows monotonically, causing O(total-ever-created) iteration cost on every `step()` and `getPopulationCounts()` | Compact agents array periodically: `this.agents = this.agents.filter(a => a.alive)` at end of `step()` | Performance, Red Team | — |
| 9 | POPULATION-CHART | `populationHistory` grows without bound (one entry per tick, forever) — 7300+ entries confirmed in visual tests, will cause heap growth in long sessions | Cap at chart window size (500 entries) using shift/ring-buffer in `BaseWorld.recordPopulation()` | Performance, Red Team | Visual tests confirmed tick 7300+ |
| 10 | SIMULATION-CANVAS | Animation loop never pauses when tab is backgrounded — burns CPU/GPU continuously in hidden tabs | Guard `world.step()` with `document.visibilityState`; skip work when hidden, resume on visibility restore | Performance | — |

## Should Fix (user experience impact)

| # | Section | Issue | Suggestion | Reviewers | Evidence |
|---|---------|-------|------------|-----------|----------|
| 11 | DRAG-HANDLE | 4px wide with no visual affordance — nearly invisible, no grip dots or contrast | Widen hit area to 12px+ with transparent padding, add grip dots, `title="Drag to resize"` | UX | Visual tests: "extremely thin dark-blue vertical line" |
| 12 | DRAG-HANDLE | No keyboard support — no `tabindex`, `role`, or keyboard handler | Add `tabindex="0"`, `role="separator"`, `aria-orientation="vertical"`, handle ArrowLeft/ArrowRight | UX | — |
| 13 | DRAG-HANDLE | No touch support — mouse events only | Add parallel `touchstart`/`touchmove`/`touchend` listeners | UX | — |
| 14 | SIMULATION-CANVAS | Wolf/sheep colors similar luminance — problematic for protanopia/deuteranopia | Add shape differentiation (wolves as triangles, sheep as circles) — `definition.ts` already has `shape` field | UX | — |
| 15 | CONTROL-BUTTONS | Go button has no `aria-pressed` — screen readers don't announce toggle state | Add `aria-pressed` attribute, toggle in onclick handler | UX | — |
| 16 | MODEL-SELECTOR | `<select id="model-select">` has no visible label or `aria-label` | Add `aria-label="Select simulation model"` or visually-hidden `<label>` | UX | — |
| 17 | PARAMETER-SLIDERS | Sliders lack `aria-describedby` pointing to info tooltip | Assign `input.setAttribute('aria-describedby', tooltip.id)` when `field.info` exists | UX | — |
| 18 | DOWNLOAD-BTN | CSV export omits run configuration — researcher can't reconstruct experiment from CSV alone | Prepend metadata block with all `world.config` key-value pairs as comment rows | Domain | — |
| 19 | SIMULATION-CANVAS | Sidebar overflows vertically on desktop-standard (1280x800) and tablet-landscape — Population section cut off | Fix grid cell height with `height: 0; min-height: 0` (standard grid overflow fix); verify scroll indicators visible | UX, Evidence | Visual tests: Population section not visible without scrolling |
| 20 | MODEL-DESCRIPTION | Description claims sustained oscillation ("repeat") but both species go extinct by tick 500 | Either tune defaults for sustained coexistence or update description to state populations "may eventually go extinct" | Domain | Model validation: final wolves=0, sheep=0 |
| 21 | AGENT-INSPECTOR | Inspector panel may be broken — visual test shows no inspector visible after click; also not keyboard accessible, positioned with no viewport clamping | Verify feature e2e; add `role="dialog"`, `aria-label`; clamp position to viewport bounds | UX, Red Team | Visual test: no inspector panel visible |
| 22 | PARAMETER-SLIDERS | Slider labels wrap 2-3 lines at 280px sidebar width — visually cramped | Change grid to `auto 1fr auto` or stack labels above sliders; consider shorter label names | UX | Visual tests: confirmed multi-line wrapping |
| 23 | TICK-DISPLAY | `renderContextHTML` (45 lines) lives in `main.ts` instead of a framework utility — untestable, couples format to entry point | Extract to `framework/context-renderer.ts` as a pure function | Architect | — |
| 24 | MODEL-VALIDATION | `WolfSheepWorld.setup()` duplicates `this.tick = 0` and `this.populationHistory = []` already done by `BaseWorld.reset()` | Remove duplicate assignments; rely on `reset()` → `setup()` contract | Architect | — |
| 25 | PARAMETER-SLIDERS | `width`/`height` skipped via hardcoded key check in slider-factory — fragile implicit contract | Introduce `tier: 'hidden'` in ConfigField; skip by tier instead of key name | Architect, Performance | — |
| 26 | SIMULATION-CANVAS | ResizeObserver fires mid-frame — resize between render() and renderStats() causes TOCTOU race | Apply resize at start of `loop()` before any draw calls | Red Team | — |
| 27 | SPEED-SLIDER | Speed=50 runs 50 steps per frame — causes jank on low-end hardware | Cap effective speed or move stepping to a Worker thread | Performance | — |
| 28 | PARAMETER-SLIDERS | `moveCost` default is 0.5 in definition.ts but fallback is `?? 1` in world.ts — different energy dynamics when config key is missing | Change world.ts fallback from `?? 1` to `?? 0.5` to match defaultConfig | Domain | — |
| 29 | SIMULATION-CANVAS | Duplicated color cache pattern — `cachedColors` in canvas-renderer.ts and `cachedChartColors` in stats-overlay.ts | Extract single `getThemeColors()` utility in `framework/theme.ts` | Architect, Domain, Red Team, Performance | — |

## Nice-to-Have (polish)

| # | Section | Issue | Suggestion | Reviewers | Evidence |
|---|---------|-------|------------|-----------|----------|
| 30 | TITLE | Page title "Simulator" is vague; no subtitle or onboarding hint | Change to "Agent-Based Simulator — Wolf Sheep Predation"; add subtitle on first load | UX | — |
| 31 | CONTROL-BUTTONS | Step button not semantically disabled when simulation is running | Add `disabled` attribute when `world.running` is true | UX | — |
| 32 | SPEED-SLIDER | No `aria-valuetext` — screen readers announce raw number with no unit | Add `aria-valuetext` like "5x (skip frames)" | UX | — |
| 33 | TICK-DISPLAY | Tick counter updates DOM 60fps when paused with identical values | Skip DOM writes when `world.tick === lastRenderedTick` | Performance | — |
| 34 | TICK-DISPLAY | rAF loop never cancels — no teardown path if component destroyed | Store rAF handle; add `destroyed` flag checked at top of `loop()` | Red Team | — |
| 35 | MODEL-VALIDATION | Oscillation test comment says "neither population permanently collapses" but both go extinct | Update test comment to match actual guarantee, or tune params for true coexistence | Domain | Model validation: both species final=0 |
| 36 | DRAG-HANDLE | Stuck col-resize cursor if window loses focus during drag | Add `blur`/`visibilitychange` listener to cancel in-progress drag | Red Team | — |
| 37 | AGENT-INSPECTOR | `innerHTML` set from agent data without sanitization — fragile if future model uses HTML-special chars in type name | Use `textContent` or DOM methods instead of innerHTML template | Red Team | — |
| 38 | POPULATION-CHART | Hard-coded grass color `'#66ff55'` in stats-overlay duplicates CSS variable | Read from `--accent-primary` or add grass entry to `agentTypes` | Architect | — |
| 39 | E2E-CONFIG | `retries: 0` in playwright.config — transient infra failures kill entire suite | Set `retries: 1`; add `workers` cap for CI | Architect | — |
| 40 | CONTROL-BUTTONS | Event listeners accumulate on model switch (never removed) | Use AbortController to group and remove listeners on `loadModel()` | Red Team | — |

## Consensus Items (3+ reviewers)

- **Color cache duplication/staleness** (Architect, Domain, Red Team, Performance — 4 reviewers): Module-level mutable color caches in both `canvas-renderer.ts` and `stats-overlay.ts` are duplicated and never invalidated. Extract to a shared `theme.ts` utility.
- **Dead agents + populationHistory unbounded** (Performance, Red Team — high overlap): The `agents` array and `populationHistory` both grow without bound. Two separate performance/robustness issues with the same root cause: no cleanup of stale data.

## Model Validation Summary

| Model | Result | Details |
|-------|--------|---------|
| wolf-sheep | **PASS** (10/10) | 500 ticks, no NaN, no negatives, wolves survive 32%, sheep 17%, both eventually extinct but past tick 50. CV: wolves 2.056, sheep 3.007 |

## Visual Testing Summary

| Viewport | Result | Key Finding |
|----------|--------|-------------|
| Desktop-large (1920x1080) | **ALL PASS** | Layout correct, all elements visible |
| Desktop-standard (1280x800) | **ALL PASS** | Sidebar overflows vertically (Population cut off) |
| Tablet-landscape (1024x768) | **ALL PASS** | Sidebar bottom cut off |
| Tablet-portrait (768x1024) | **ALL FAIL** | Canvas hidden — collapsed to zero height |
| Mobile-large (430x932) | **ALL FAIL** | Canvas hidden |
| Mobile-small (375x667) | **ALL FAIL** | Canvas hidden |
| Mobile-standard (iPhone 13) | **ALL FAIL** | WebKit not installed (infra issue, not app) |

## Totals

- **Critical**: 10
- **Should Fix**: 19
- **Nice-to-Have**: 11
- **Total findings**: 40

The mobile/responsive canvas issue (#1) and the accessibility gaps (#2-4) are the highest-impact findings. Performance issues #7-10 will cause degradation on long-running sessions.
