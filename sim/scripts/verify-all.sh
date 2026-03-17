#!/bin/bash
# verify-all.sh — Full verification pipeline (code skill Phase 3)
# Runs all quality gates in sequence with clear output.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "=== Step 1/7: TypeScript ==="
npx tsc --noEmit

echo "=== Step 2/7: ESLint ==="
npx eslint src/ --max-warnings 0

echo "=== Step 3/7: Unit + Integration Tests ==="
npx vitest run

echo "=== Step 4/7: Property Tests ==="
npx vitest run --testPathPattern=property

echo "=== Step 5/7: Golden Baselines ==="
npx tsx src/cli/golden-check.ts

echo "=== Step 6/7: Dead Code ==="
npx knip

echo "=== Step 7/7: E2E (Playwright) ==="
npx playwright test

echo "=== ALL CHECKS PASSED ==="
