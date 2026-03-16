---
name: research-model
description: Research an ABM model concept using the nlm skill and produce a model brief
isolation: worktree
---

# Research Model Agent

Research an agent-based model concept and produce a structured model brief. Uses the `research` skill which wraps the global `nlm` skill with ABM-specific overrides.

## Instructions

1. Read `.claude/skills/research/SKILL.md` for the full workflow
2. Follow the research skill's phases:
   - **Phase 1**: Preliminary web research on the model
   - **Phase 2**: Create nlm notebook (if nlm is available)
   - **Phase 3**: Import sources and run research tasks
   - **Phase 4**: Query with ABM-specific templates from `references/query-templates.md`
   - **Phase 5**: Compile research brief
3. After the research brief, perform the **feasibility analysis** against framework interfaces
4. Produce the **model brief** (`research/{slug}/model-brief.md`)

## Report

Return to the main agent:
- Summary of key findings (3-5 bullet points)
- Feasibility rating: High / Medium / Low
- Any framework gaps that need extension
- Path to the full model brief file
