#!/usr/bin/env bash
# extract-learnings.sh - Main orchestrator for learning extraction
# Runs all extractors and outputs compact JSON

set -euo pipefail

FEATURE_PATH="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -z "$FEATURE_PATH" ]]; then
  echo "Usage: $0 <feature-path>" >&2
  exit 1
fi

if [[ ! -d "$FEATURE_PATH" ]]; then
  echo "Error: Feature path does not exist: $FEATURE_PATH" >&2
  exit 1
fi

# Check for available tools (prefer fast tools, fallback to standard)
HAS_RG=$(command -v rg >/dev/null 2>&1 && echo "true" || echo "false")
HAS_JQ=$(command -v jq >/dev/null 2>&1 && echo "true" || echo "false")

# Source common functions
source "$SCRIPT_DIR/common.sh"

# Extract all learnings
PATTERNS=$("$SCRIPT_DIR/extract-patterns.sh" "$FEATURE_PATH" 2>/dev/null || echo "[]")
COSTS=$("$SCRIPT_DIR/extract-costs.sh" "$FEATURE_PATH" 2>/dev/null || echo "{}")
FAILURES=$("$SCRIPT_DIR/extract-failures.sh" "$FEATURE_PATH" 2>/dev/null || echo "[]")
ERRORS=$("$SCRIPT_DIR/extract-errors.sh" "$FEATURE_PATH" 2>/dev/null || echo "[]")

# Output compact JSON
if [[ "$HAS_JQ" == "true" ]]; then
  jq -n \
    --argjson patterns "$PATTERNS" \
    --argjson costs "$COSTS" \
    --argjson failures "$FAILURES" \
    --argjson errors "$ERRORS" \
    '{
      patterns: $patterns,
      costs: $costs,
      failures: $failures,
      errors: $errors,
      extracted_at: (now | todate),
      tools: {
        ripgrep: (env.HAS_RG // "false"),
        jq: "true"
      }
    }'
else
  # Fallback without jq (minimal JSON)
  cat <<EOF
{
  "patterns": $PATTERNS,
  "costs": $COSTS,
  "failures": $FAILURES,
  "errors": $ERRORS,
  "extracted_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "tools": {
    "ripgrep": "$HAS_RG",
    "jq": "false"
  }
}
EOF
fi
