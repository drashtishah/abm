---
name: review-team
description: >-
  Run a 5-agent parallel review on ABM simulator changes. Spawns an evidence-gathering
  agent (model validation + visual testing) then 5 specialized reviewer agents in parallel
  (Architect, Domain Expert, UX & Accessibility, Red Team, Performance). Returns a structured
  review report with Critical/Should Fix/Nice-to-Have tiers. Trigger: "run review",
  "agent team review", "review changes", or automatically from the code skill Phase 4.
  IMPORTANT: No code changes are allowed while the review is running.
---

## Workflow

### 1. Collect Change Summary

Before spawning agents, gather:
- List of files changed (from git diff or session context)
- Brief description of each change
- Change type classification: `model` | `engine` | `UI` | `refactor` | `mixed`

### 2. Spawn Evidence Agent

Launch the `review-evidence` agent in a worktree to run model validation and visual testing:

```
Agent(
  subagent_type: "general-purpose",
  isolation: "worktree",
  run_in_background: true,
  prompt: "
    Follow the instructions in .claude/agents/review-evidence.md.
    Change type: <change type>
    Changed files: <file list>
  "
)
```

Wait for the evidence agent to complete. Capture its output — this feeds into the reviewer agents.

### 3. Spawn 5 Reviewer Agents in Parallel

Once evidence is gathered, launch all 5 reviewers simultaneously. Each agent reads code directly and receives the evidence summary in its prompt.

**All 5 agents use `run_in_background: true` and are launched in a single message for maximum parallelism. No worktree — reviewers are read-only.**

```
# Agent 1: Architect
Agent(
  subagent_type: "general-purpose",
  run_in_background: true,
  prompt: "
    Follow the instructions in .claude/agents/review-architect.md.
    Change type: <type>. Changed files: <list>.
    Read each changed file and evaluate.
  "
)

# Agent 2: Domain Expert
Agent(
  subagent_type: "general-purpose",
  run_in_background: true,
  prompt: "
    Follow the instructions in .claude/agents/review-domain.md.
    Change type: <type>. Changed files: <list>.
    Model validation evidence: <evidence agent Phase 2 output>
    Read each changed file and evaluate.
  "
)

# Agent 3: UX & Accessibility
Agent(
  subagent_type: "general-purpose",
  run_in_background: true,
  prompt: "
    Follow the instructions in .claude/agents/review-ux.md.
    Change type: <type>. Changed files: <list>.
    Visual testing evidence: <evidence agent Phase 3 output>
    Read each changed file and evaluate.
  "
)

# Agent 4: Red Team
Agent(
  subagent_type: "general-purpose",
  run_in_background: true,
  prompt: "
    Follow the instructions in .claude/agents/review-redteam.md.
    Change type: <type>. Changed files: <list>.
    Model validation evidence: <evidence agent Phase 2 output>
    Visual testing evidence: <evidence agent Phase 3 output>
    Read each changed file and evaluate.
  "
)

# Agent 5: Performance
Agent(
  subagent_type: "general-purpose",
  run_in_background: true,
  prompt: "
    Follow the instructions in .claude/agents/review-performance.md.
    Change type: <type>. Changed files: <list>.
    Visual testing evidence: <evidence agent Phase 3 output>
    Read each changed file and evaluate.
  "
)
```

### 4. Gate: No Edits During Review

**CRITICAL CONSTRAINT**: While any review agent is running, NO code changes may be made. The calling agent must:
- Stop all implementation work
- Inform the user the review is in progress
- Wait for ALL agents to complete before resuming

### 5. Synthesize Report

Once all 5 reviewers complete, the main session compiles the final report:

1. Collect all findings from the 5 agents
2. Deduplicate overlapping issues (same file + same problem = one finding)
3. Track which reviewers flagged each issue
4. Group by tier: Critical / Should Fix / Nice-to-Have
5. Highlight consensus items (3+ reviewers)
6. Include Model Validation Summary and Visual Testing Summary from the evidence agent

### 6. Save Report

Save the synthesized report to `sim/review-report.md` using the Write tool. The file must include:
- YAML frontmatter with `title`, `date` (YYYY-MM-DD), `change_type`, `reviewers`, and `evidence` fields
- The full tiered report (Critical / Should Fix / Nice-to-Have tables)
- Consensus Items, Model Validation Summary, Visual Testing Summary
- A Totals section with counts per tier

This file is the durable artifact of the review. Other agents (e.g., the `code` skill) read it directly. Each run overwrites the previous report.

### 7. Present Report

Present the structured report to the user. Do not silently consume it. The user decides which findings to act on.

### 8. Feed Into Code Skill

The review report is designed for direct consumption by the `code` skill Phase 2. Each finding includes:
- **Section** — maps to `references/section-map.md` file references
- **Issue** — concise problem description
- **Severity** — prioritization tier
- **Suggestion** — actionable fix
- **Reviewers** — which agents flagged it (consensus = higher priority)

## Agent Team Architecture

```
Main Session (orchestrator)
  │
  ├─ Phase 1: Evidence Agent (worktree, background)
  │    ├─ npm ci + model validation
  │    └─ playwright visual tests
  │
  ├─ Phase 2: 5 Reviewer Agents (parallel, background)
  │    ├─ Architect       → code structure, layers, patterns
  │    ├─ Domain Expert   → ABM science, data, reproducibility
  │    ├─ UX & A11y       → usability, WCAG, education
  │    ├─ Red Team        → edge cases, robustness, stress
  │    └─ Performance     → efficiency, memory, automation
  │
  └─ Phase 3: Synthesis (main session)
       └─ Deduplicate, tier, consensus → final report
```

## Reviewer Applicability by Change Type

Not all reviewers apply to every change type. Skip irrelevant agents to save tokens.

| Reviewer | model | engine | UI | refactor | mixed |
|----------|-------|--------|----|----------|-------|
| Architect | yes | yes | yes | yes | yes |
| Domain Expert | yes | yes | — | — | yes |
| UX & A11y | — | — | yes | — | yes |
| Red Team | yes | yes | yes | yes | yes |
| Performance | — | yes | yes | — | yes |

## Report Format

```markdown
## Critical (must fix before shipping)

| # | Section | Issue | Suggestion | Reviewers | Evidence |
|---|---------|-------|------------|-----------|----------|
| 1 | SECTION | Description | Fix | Names (count) | Phase source |

## Should Fix (user experience impact)

| # | Section | Issue | Suggestion | Reviewers | Evidence |
|---|---------|-------|------------|-----------|----------|

## Nice-to-Have (polish)

| # | Section | Issue | Suggestion | Reviewers | Evidence |
|---|---------|-------|------------|-----------|----------|

## Consensus Items (3+ reviewers, highest priority)

Bulleted list of issues flagged by 3 or more reviewers.

## Model Validation Summary

Per-model pass/fail with check details (from evidence agent).

## Visual Testing Summary

Key findings from screenshot analysis (from evidence agent).
```

## Graceful Degradation

- If the evidence agent fails, still spawn reviewers — they do Phase 1 (code-only) analysis without automated evidence
- If a reviewer agent fails, compile the report from the remaining agents
- Phase 1 (static analysis) findings always appear regardless of other failures

## Persona Reference

See `references/review-personas.md` for the 5 reviewer personas, their evaluation criteria, and evidence sources.

See `references/section-map.md` for the section-to-file mapping used in report output.
