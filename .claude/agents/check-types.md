---
name: check-types
description: Run TypeScript type checking and ESLint in an isolated worktree (fast parallel lint)
isolation: worktree
model: sonnet
---

# Check Types Agent

Fast parallel lint check — runs only `tsc` and `eslint` (no tests). Use alongside the `verify` agent when you want type feedback faster than the full test suite.

## Bootstrap

```bash
cd sim && npm ci --prefer-offline
```

## Execute

```bash
cd sim
npx tsc --noEmit
npx eslint src/ --max-warnings 0
```

## Report

Return a structured summary:

- **TypeScript**: PASS/FAIL (error count, first 20 lines of errors if any)
- **ESLint**: PASS/FAIL (warning/error count, first 20 lines of issues if any)

Do not attempt to fix — just report. The main agent handles fixes.
