---
title: Review Personas
description: >-
  Evaluation criteria for the 5-agent parallel review team.
  Each agent owns a distinct review perspective.
---

## Design Rationale

Teams with moderate cognitive diversity improve evaluation accuracy via independent parallel assessment (Surowiecki 2004, Hong & Page 2004). The 5 agents below cover orthogonal concerns with minimal overlap. Each runs as a separate agent — no roleplaying, real parallel execution.

Consolidated from 9 → 5 by merging overlapping concerns:
- **Architect**: unchanged
- **Domain Expert**: ABM Scientist + Data Analyst
- **UX & Accessibility**: Curious Human + Accessibility Advocate + Educator
- **Red Team**: unchanged
- **Performance**: Performance-Constrained User + AI Agent

## Agent Summary

| Agent | Focus | Applies to |
|-------|-------|-----------|
| Architect | Layer boundaries, duplication, patterns, framework rules | All changes |
| Domain Expert | ABM accuracy, parameter plausibility, reproducibility, data correctness | Model + engine changes |
| UX & Accessibility | Onboarding, clarity, WCAG 2.1 AA, keyboard nav, classroom readiness | UI changes |
| Red Team | Edge cases, error handling, stress scenarios, robustness | All changes |
| Performance | Render efficiency, memory, bundle size, DOM structure, automation | Engine + UI changes |

## Evidence Sources by Phase

| Agent | Code (Phase 1) | Model Validation (Phase 2) | Visual Testing (Phase 3) |
|-------|---------------|---------------------------|--------------------------|
| Architect | **Primary** | — | — |
| Domain Expert | **Primary** | **Primary**: per-model validation (oscillation, survival, variance) | — |
| UX & Accessibility | Secondary | — | **Primary**: viewport screenshots, focus order, contrast |
| Red Team | **Primary** | NaN/extinction baseline checks | Rapid-click, resize, edge case results |
| Performance | **Primary** | — | Memory growth, frame timing |

---

## Agent 1: Architect

**Definition file**: `.claude/agents/review-architect.md`

**Focus**: Layer boundaries, code duplication, design patterns, framework rules, state management.

**Evaluation criteria**:
1. Framework/model layer boundary respected? No framework → model imports?
2. New abstractions duplicating existing ones?
3. Established patterns followed (registration, pure behaviors)?
4. Circular dependencies?
5. State management correct — model state in BaseWorld subclass, no global mutable state?
6. Dead exports, unused imports, orphaned code?

---

## Agent 2: Domain Expert

**Definition file**: `.claude/agents/review-domain.md`

**Focus**: ABM science accuracy, parameter ranges, ecological plausibility, reproducibility, data completeness, numerical correctness.

**Evaluation criteria**:

*Science:*
1. Parameter names match standard ABM/ecological terminology?
2. Default values ecologically plausible (oscillation, not instant extinction)?
3. Model description accurately describes simulated dynamics?
4. Parameters tunable to reproduce known behaviors?

*Data & Reproducibility:*
5. Random seed support for deterministic runs?
6. CSV export complete (populations per tick + config)?
7. No floating-point drift or NaN accumulation?
8. RNG properly seeded (not unseeded Math.random)?
9. Boundary conditions correct and consistent?

---

## Agent 3: UX & Accessibility

**Definition file**: `.claude/agents/review-ux.md`

**Focus**: First-time experience, WCAG 2.1 AA, keyboard navigation, screen readers, contrast, classroom deployment.

**Evaluation criteria**:

*Onboarding:*
1. App purpose clear within 5 seconds?
2. Controls self-explanatory without docs?
3. Visual elements have clear meaning?
4. Adequate help text for newcomers?

*Accessibility:*
5. All controls keyboard-operable (Tab, Enter, Arrow)?
6. Canvas has ARIA descriptions / text alternatives?
7. Colors distinguishable for colorblind users?
8. Sliders announce value/min/max/label to screen readers?
9. Focus indicators visible?
10. Contrast ratios sufficient (4.5:1 normal, 3:1 large)?

*Education:*
11. URL-shareable starting configurations?
12. Parameter names understandable to a 16-year-old?
13. Model description explains science, not just mechanics?
14. Mobile-friendly layout, touch-friendly controls?

---

## Agent 4: Red Team

**Definition file**: `.claude/agents/review-redteam.md`

**Focus**: Edge cases, extreme values, race conditions, error states, stress testing.

**Evaluation criteria**:
1. Parameter extremes handled gracefully (0 wolves, max sheep, 0 regrowth)?
2. Browser resize mid-simulation safe?
3. Rapid button clicking handled?
4. Memory stable after 10,000 ticks?
5. NaN/Infinity recovery?
6. Empty state (all agents dead) handled in UI?
7. Population chart handles Y-axis overflow?
8. No uncaught exceptions or error swallowing?
9. requestAnimationFrame safe after teardown?
10. No race conditions between UI and simulation?

---

## Agent 5: Performance

**Definition file**: `.claude/agents/review-performance.md`

**Focus**: Frame rate, memory efficiency, bundle size, DOM structure, data attributes, programmatic control.

**Evaluation criteria**:

*Performance:*
1. Usable frame rate on low-end hardware?
2. Bundle size reasonable for 3G load?
3. Memory bounded over long runs?
4. Animation loop stops when tab backgrounded?
5. Chart redraws efficient (no jank)?
6. No unnecessary re-renders or DOM thrashing?

*Programmatic Access:*
7. Elements addressable via selectors / data-* attributes?
8. Simulation state readable from DOM?
9. DOM parameter names match code variable names?
10. Full programmatic control possible?
11. Semantic HTML (headings, labels, ARIA)?
12. Playwright parameter sweep feasible?

---

## Structured Output Format

Every reviewer agent returns findings in this format:

```
Section: <SECTION-NAME from section-map.md>
Issue: <Concise description>
Severity: critical | high | medium | low
Suggestion: <Specific, actionable fix>
```

The main session collects findings from all 5 agents, deduplicates, and compiles the tiered report.
