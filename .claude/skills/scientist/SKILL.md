---
name: scientist
description: Automated parameter analysis for ABM models — 3-phase sensitivity analysis (Morris → Sobol → optimization) with science journal and HTML reports
---

## Trigger

User says "run scientist on <model>", "investigate <model>", or invokes `/scientist <model>`.

## Workflow

### 1. VALIDATE MODEL

- Read definition via CLI: `cd sim && npx tsx src/cli/run.ts --model <name> --dump-definition`
- Parse the JSON output — check for `expectedPattern` field
- If `expectedPattern` is missing:
  1. Read the model's `context` and `description` fields
  2. Research the model's expected behavior (use the `research` skill if needed)
  3. Add `expectedPattern` to the model's `definition.ts`
  4. Run `cd sim && npx vitest run && npx tsc --noEmit` to verify
- Note the `configSchema` (tunable params) and `expectedPattern` criteria

### 2. SETUP ENVIRONMENT

```bash
cd sim/science
# Create venv if missing
[ -d .venv ] || python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Verify the CLI supports `--seed` and `--dump-definition`:
```bash
cd sim && npx tsx src/cli/run.ts --model wolf-sheep --dump-definition | head -5
```
If these flags don't exist, add them per the design spec.

### 3. PHASE 1: MORRIS SCREENING

```bash
cd sim/science
source .venv/bin/activate
python scripts/phase1_screening.py <model>
```

**After completion:**
- Read `<model>/analysis/phase1_results.json`
- Interpret the Morris indices:
  - Which parameters have high mu* (strong influence)?
  - Which have high sigma (strong interactions)?
  - Any surprises? (e.g., a "core" param with near-zero influence)
- Write the Phase 1 section in `<model>/journal.md`
- Select top 4-6 params for Phase 2

### 4. PHASE 2: SOBOL SENSITIVITY

```bash
python scripts/phase2_sensitivity.py <model> --params param1,param2,param3,...
```

**After completion:**
- Read `<model>/analysis/phase2_results.json`
- Interpret Sobol indices:
  - S1 (first-order): direct effect of each param
  - ST (total-order): direct + all interaction effects
  - S2 (second-order): pairwise interactions
  - Gap between S1 and ST reveals interaction strength
- Read the `recommended_bounds` — these narrow the search for Phase 3
- Write Phase 2 section in journal
- Note any surprising interactions

### 5. PHASE 3: OPTIMIZATION

```bash
python scripts/phase3_optimization.py <model> --phase2-results <model>/analysis/phase2_results.json
```

**After completion:**
- Read `<model>/analysis/phase3_results.json` and `phase3_best_config.json`
- Compare optimized params vs current `defaultConfig`
- Write Phase 3 section in journal including:
  - The recommended config table
  - Which params changed most and why (informed by Phase 1 & 2 insights)
  - The final pattern score

### 6. GENERATE REPORT

```bash
python scripts/report_generator.py <model>
```

Verify `<model>/report.html` exists and `index.html` was updated.

### 7. PRESENT FINDINGS

Summarize key findings to the user:
- Top influential parameters
- Notable interactions
- Optimized config vs defaults
- Best pattern score achieved

If the optimized config differs significantly from defaults:
> "The scientist found a better parameter configuration (score: X.XX vs current defaults). Should I update the model's `defaultConfig`?"

Commit all science artifacts:
```bash
git add sim/science/<model>/analysis/ sim/science/<model>/journal.md sim/science/<model>/report.html sim/science/index.html
```

## Journal Format

The journal is written by you (the agent) — not templated. Write genuine prose about what you observed.

```markdown
# <Model Name> — Science Journal

## Experiment Metadata
- Model: <id>
- Date: <date>
- Expected pattern: <description>

## Phase 1: Morris Screening
### Findings
- <ranked params with interpretations>
### Interesting observations
- <anything surprising>

## Phase 2: Sobol Analysis
### Findings
- <sensitivity indices interpretation>
### Interesting observations
- <notable interactions, non-linearities>

## Phase 3: Optimization
### Recommended config
| Parameter | Default | Optimized |
|-----------|---------|-----------|
| ... | ... | ... |
### Interesting observations
- <edge cases, phase transitions, etc.>
```

## Key Rules

- Seeds must be >= 1 (seed 0 falls back to Date.now() in BaseWorld)
- Each phase script handles its own CSV I/O — do not manually create experiment directories
- Phase scripts save progress incrementally — re-running skips completed runs
- If > 20% of runs in a phase fail, the script exits with an error — investigate before continuing
- The `evaluate()` function in `evaluators.py` dispatches to the correct pattern evaluator based on `expectedPattern.type`
