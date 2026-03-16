---
name: review-evidence
description: Gather model validation and visual testing evidence for review-team
isolation: worktree
model: sonnet
---

# Review Evidence Agent

Gather automated evidence (model validation + visual testing) for the review-team skill. Return structured results that feed into the 5 reviewer agents.

## Bootstrap

```bash
cd sim && npm ci --prefer-offline
```

## Phase 2: Model Validation

```bash
cd sim && npx tsx test/e2e/model-validation.ts
```

- Capture ALL output
- Parse JSON after the `--- JSON OUTPUT ---` marker
- For each model: record pass/fail status and individual check results
- If this fails, log the error and continue to Phase 3

## Phase 3: Visual Testing

```bash
cd sim && npx playwright install --with-deps chromium && npx playwright test test/e2e/review-checks.spec.ts --project='chromium-*'
```

- Only chromium projects are run to keep evidence gathering fast. Firefox/WebKit are for CI.
- The `--with-deps` flag installs OS-level dependencies that Chromium needs (prevents sandbox errors).

- Record test pass/fail results
- Read screenshot files from `sim/test-results/` using the Read tool (Claude has vision)
- Describe each screenshot briefly: what it shows, any visible issues (overflow, cut-off text, contrast, alignment, mobile layout, border problems)
- Test failures ARE findings, not flakiness

## Graceful Degradation

If either phase fails (dependency error, port conflict, browser install failure):
- Log the failure reason
- Continue with the other phase
- Always return whatever evidence was gathered

## Report

Return a structured evidence report:

```markdown
## Model Validation Results
- Per-model pass/fail with check details
- Any NaN, extinction, or anomaly findings

## Visual Testing Results
- Per-test pass/fail
- Screenshot descriptions with any issues noted

## Failures
- Any phases that failed to run, with error details
```

Do not evaluate or judge the findings — just gather and describe the evidence. The reviewer agents will interpret it.
