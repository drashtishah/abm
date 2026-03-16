#!/bin/bash
set -e
cd sim
echo "=== ESLint ==="
npx eslint src/ --max-warnings 0
echo "=== Knip (dead code) ==="
npx knip
echo "=== Type Coverage ==="
npx type-coverage --at-least 90
echo "=== All checks passed ==="
