#!/bin/bash
# golden-baseline.sh — Generate or check golden baselines
set -euo pipefail
cd "$(dirname "$0")/.."

case "${1:-check}" in
  check)  npx tsx src/cli/golden-check.ts ;;
  update) npx tsx src/cli/golden-check.ts --update ;;
  *)      echo "Usage: $0 [check|update]"; exit 1 ;;
esac
