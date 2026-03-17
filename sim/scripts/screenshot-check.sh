#!/bin/bash
# screenshot-check.sh — Quick viewport screenshots using Playwright CLI (Chromium only).
# Captures initial page render at all 7 viewport sizes matching playwright.config.ts.
# Requires dev server running on port 5174.
set -euo pipefail

URL="${1:-http://localhost:5174}"
OUT_DIR="screenshot-audit"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DIR="${OUT_DIR}/${TIMESTAMP}"

mkdir -p "$DIR"

# Viewport definitions matching playwright.config.ts
VIEWPORTS=(
  "desktop-large:1920,1080"
  "desktop-standard:1280,800"
  "tablet-landscape:1024,768"
  "tablet-portrait:768,1024"
  "mobile-large:430,932"
  "mobile-standard:390,844"
  "mobile-small:375,667"
)

echo "=== Screenshot Check (Chromium) ==="
echo "URL: $URL"
echo "Output: $DIR"
echo ""

FAILED=0
for entry in "${VIEWPORTS[@]}"; do
  NAME="${entry%%:*}"
  SIZE="${entry##*:}"
  FILE="${DIR}/${NAME}.png"
  printf "  %-20s (%s) ... " "$NAME" "$SIZE"
  if npx playwright screenshot \
    --browser cr \
    --viewport-size "$SIZE" \
    --wait-for-selector "#sim-canvas" \
    --wait-for-timeout 2000 \
    --full-page \
    "$URL" "$FILE" 2>/dev/null; then
    echo "OK"
  else
    echo "FAILED"
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "Screenshots saved to: $DIR"
if [ "$FAILED" -gt 0 ]; then
  echo "FAILED: $FAILED viewport(s) failed"
  exit 1
fi
echo "=== All 7 viewports captured ==="
