#!/usr/bin/env bash
# check-error-i18n.sh — ratchet check for unmigrated Error(w,…) call sites.
#
# Counts deprecated `Error(w,` calls (the non-localized helper in response.go)
# in the Go handler/middleware packages and compares against the baseline in
# tools/i18n-baseline.txt. Fails if the count has grown.
#
# Excludes apiError(w,…), writeJSONError(w,…), and http.Error(w,…) — those
# are localized replacements or intentional plain-text responses.
#
# Usage: bash tools/check-error-i18n.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BASELINE_FILE="$SCRIPT_DIR/i18n-baseline.txt"
HANDLER_DIR="$REPO_ROOT/server-source-code/internal/handler"
MIDDLEWARE_DIR="$REPO_ROOT/server-source-code/internal/middleware"

if [[ ! -f "$BASELINE_FILE" ]]; then
  echo "ERROR: Baseline file not found: $BASELINE_FILE"
  echo "Run the following to create it:"
  echo "  echo 0 > tools/i18n-baseline.txt"
  exit 1
fi

BASELINE=$(cat "$BASELINE_FILE" | tr -d '[:space:]')

# Count deprecated Error(w, call sites (not apiError/writeJSONError/http.Error)
CURRENT=$(grep -rnP '(?<![a-zA-Z0-9._])Error\(w,' "$HANDLER_DIR" "$MIDDLEWARE_DIR" 2>/dev/null | grep -v '_test.go' | wc -l | tr -d '[:space:]' || true)

echo "i18n ratchet: deprecated Error(w, call sites = $CURRENT (baseline = $BASELINE)"

if [ "$CURRENT" -gt "$BASELINE" ]; then
  echo "FAIL: Error(w, call sites grew from $BASELINE to $CURRENT."
  echo "Use ErrorKey(w, r, …) with a message catalog key instead."
  echo "If this growth is intentional (e.g. after a merge), update tools/i18n-baseline.txt."
  exit 1
fi

echo "PASS: no regression ($CURRENT ≤ $BASELINE)."
