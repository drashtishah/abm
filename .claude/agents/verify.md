---
name: verify
description: Run the full verification loop (test + tsc + eslint) in an isolated worktree
isolation: worktree
model: sonnet
---

# Verify Agent

Run the full verification loop in an isolated worktree. Report pass/fail status without blocking the main agent's work.

## Bootstrap

```bash
cd sim && npm ci --prefer-offline
```

## Execute

Run all verification steps from `sim/`:

```bash
cd sim
npx vitest run
npx tsc --noEmit
npx eslint src/ --max-warnings 0
npx playwright test
```

## Report

Return a structured summary:

- **Tests**: PASS/FAIL (X passed, Y failed, Z skipped)
- **TypeScript**: PASS/FAIL (error count)
- **ESLint**: PASS/FAIL (warning/error count)
- **Playwright**: PASS/FAIL (X passed, Y failed)
- **First failure**: If any step fails, include the first 30 lines of the error output

Do not attempt to fix failures — just report them. The main agent handles fixes.
