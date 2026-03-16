---
name: research
description: >-
  ABM model research skill wrapping the global nlm skill with domain-specific
  overrides. Researches agent-based model concepts (Schelling, boids, SIR, etc.),
  evaluates feasibility against the framework, and produces model briefs that feed
  into the new-model-guide workflow. Trigger when exploring new model ideas or
  researching ABM literature.
---

## Prerequisites

Read `~/.claude/skills/nlm/SKILL.md` first — this skill follows the nlm research workflow (web research → notebook → source import → layered queries → brief) and overrides specific defaults for ABM domain use.

## ABM-Specific Overrides

### Output Path

All research output goes to `research/{model-slug}/` in the workspace root (not the nlm default).

```
research/
  flocking/
    nlm-notebook.md
    research-brief.md
    model-brief.md        ← ABM-specific deliverable (see below)
  schelling-segregation/
    ...
```

### Frontmatter Schema

Extend the nlm default frontmatter with ABM-specific fields:

```yaml
---
title: "{Model Name} — Research Brief"
subject: "{Model Name}"
date: YYYY-MM-DD
model_type: spatial | network | cellular-automaton | population | hybrid
agent_types:
  - name: "{agent type}"
    description: "{what this agent represents}"
emergent_phenomena:
  - "{description of emergent behavior}"
tags:
  - type/research-brief
  - domain/abm
  - subject/{slug}
---
```

### Query Templates

Replace nlm's generic Layer 2 queries with ABM-specific dimensions. See `references/query-templates.md` for the full set.

**Layer 1 — Broad understanding** (use nlm defaults):
- Overview of the model, its origins, and key publications

**Layer 2 — ABM-specific dimensions** (pick 3-5 relevant ones):
- **Agent rules**: "What are the individual agent decision rules in {model}? How do agents perceive their environment and choose actions?"
- **Emergent behavior**: "What emergent phenomena arise from {model}? How do micro-level agent rules produce macro-level patterns?"
- **Parameter sensitivity**: "Which parameters most strongly affect outcomes in {model}? What are typical ranges and their effects?"
- **Spatial dynamics**: "How does space/topology affect {model}? Grid vs. continuous, neighborhood size, boundary conditions?"
- **Validation**: "How has {model} been validated against real-world data? What empirical phenomena does it reproduce?"
- **Extensions**: "What notable extensions or variations of {model} exist? How have researchers adapted it?"

**Layer 3 — Synthesis** (use nlm defaults):
- Cross-reference and gaps analysis

### Post-Research: Feasibility Analysis

After the nlm research brief is complete, perform a feasibility analysis against the ABM framework:

1. **Read** `sim/src/framework/types.ts` — review `Agent`, `WorldState`, `World` interfaces
2. **Read** `sim/src/framework/base-world.ts` — review `BaseWorld` abstract class
3. **Evaluate** each dimension:
   - **Agent interface fit**: Can the model's agents be represented with `{id, type, x, y, vx, vy, radius, speed, energy, color, alive, meta}`? What goes in `meta`?
   - **World state fit**: Does `BaseWorld` support the model's tick logic? Need `extraState`?
   - **Behavior purity**: Can agent behaviors be pure functions (input → output, no side effects)?
   - **Config schema**: What parameters does the model need? Map to `configSchema` format.
   - **Visual representation**: How should agents render on canvas? Colors, shapes, sizes?

4. **Flag gaps**: If the framework needs extension (new interface fields, new base class methods), document what and why.

### Final Output: Model Brief

After research + feasibility, produce `research/{slug}/model-brief.md`:

```yaml
---
title: "{Model Name} — Model Brief"
date: YYYY-MM-DD
status: proposed | feasible | needs-extension | infeasible
tags:
  - type/model-brief
  - domain/abm
---
```

**Sections:**
1. **Overview** — What the model simulates, key reference papers
2. **Agent Types** — Each agent type with properties, decision rules, visual representation
3. **Behaviors** — Pure functions needed (list with input/output signatures)
4. **Config Schema** — Proposed parameters with types, defaults, ranges, descriptions
5. **Emergent Phenomena** — What to expect; how to validate the model works
6. **Feasibility** — Framework fit assessment from the analysis above
7. **Implementation Notes** — Suggested file structure, which `_template/` files to modify

This model brief feeds directly into the `code` skill's new-model workflow (`references/new-model-guide.md`).

## Known Models Catalog

See `references/model-catalog.md` for a curated list of ABM models with feasibility notes against this framework.
