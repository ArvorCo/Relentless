#!/usr/bin/env bash
# extract-errors.sh - Extract error patterns from progress.txt
# Output: JSON array of error-related lines

set -euo pipefail

FEATURE_PATH="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$SCRIPT_DIR/common.sh"

if [[ -z "$FEATURE_PATH" ]]; then
  echo "[]"
  exit 0
fi

PROGRESS_FILE="$FEATURE_PATH/progress.txt"

if ! check_file "$PROGRESS_FILE"; then
  echo "[]"
  exit 0
fi

GREP_CMD=$(detect_grep)

# Extract error-related lines (case-insensitive)
errors=()

if [[ "$GREP_CMD" == "rg" ]]; then
  while IFS= read -r line; do
    # Clean up the line
    cleaned=$(echo "$line" | sed -E 's/^\s*[-*]\s*//' | tr -s ' ')
    [[ -n "$cleaned" ]] && errors+=("$cleaned")
  done < <(rg -i --no-filename '(error|failed|bug|fix|issue|problem|warning)' "$PROGRESS_FILE" 2>/dev/null | head -15)
else
  while IFS= read -r line; do
    cleaned=$(echo "$line" | sed -E 's/^\s*[-*]\s*//' | tr -s ' ')
    [[ -n "$cleaned" ]] && errors+=("$cleaned")
  done < <(grep -i -E '(error|failed|bug|fix|issue|problem|warning)' "$PROGRESS_FILE" 2>/dev/null | head -15)
fi

# Deduplicate and output as JSON array
if [[ ${#errors[@]} -eq 0 ]]; then
  echo "[]"
else
  printf '%s\n' "${errors[@]}" | sort -u | head -10 | to_json_array
fi
