---
name: check-design
description: Analyze a proposed change for architecture violations, duplication, and layer boundary issues
isolation: worktree
---

# Check Design Agent

Perform an automated architecture review of a proposed change. Read the codebase and evaluate whether the change respects framework/model layer boundaries and reuses existing abstractions.

## Instructions

Given a description of the proposed change:

1. **Read** `.claude/skills/code/references/architecture.md` — understand the Mermaid diagram and data flow
2. **Read** `sim/src/framework/types.ts` — current interfaces
3. **Read** `sim/src/framework/base-world.ts` — current base class
4. **Search** for existing utilities and patterns that could be reused (use Glob + Grep)
5. **Evaluate** the solutioning gate:
   - Layer boundaries: Does the change require framework to import from models? (violation)
   - Duplication: Does similar functionality already exist?
   - Surface area: Is the change minimal or does it introduce speculative features?
   - Behavior purity: Are new behaviors pure functions?
   - DOM independence: Can engine/model code run headless?

## Report

Return a structured design review:

- **Layer impact**: Framework only / Model only / Cross-layer / New model
- **Files affected**: List with brief rationale
- **Interface changes needed**: Yes/No with details
- **Existing abstractions to reuse**: List any found
- **Solutioning gate**: PASS/FAIL for each criterion
- **Concerns**: Any issues or risks identified
- **Recommendation**: Proceed / Redesign (with suggestion)
