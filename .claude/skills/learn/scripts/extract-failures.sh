#!/usr/bin/env bash
# extract-failures.sh - Extract failed checks from checklist.md
# Output: JSON array of unchecked items

set -euo pipefail

FEATURE_PATH="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$SCRIPT_DIR/common.sh"

if [[ -z "$FEATURE_PATH" ]]; then
  echo "[]"
  exit 0
fi

CHECKLIST_FILE="$FEATURE_PATH/checklist.md"

if ! check_file "$CHECKLIST_FILE"; then
  echo "[]"
  exit 0
fi

GREP_CMD=$(detect_grep)

# Extract unchecked items (- [ ] or * [ ])
failures=()

if [[ "$GREP_CMD" == "rg" ]]; then
  while IFS= read -r line; do
    # Clean up the line (remove checkbox prefix)
    cleaned=$(echo "$line" | sed -E 's/^\s*[-*]\s*\[ \]\s*//')
    [[ -n "$cleaned" ]] && failures+=("$cleaned")
  done < <(rg --no-filename '^\s*[-*]\s*\[ \]' "$CHECKLIST_FILE" 2>/dev/null | head -10)
else
  while IFS= read -r line; do
    cleaned=$(echo "$line" | sed -E 's/^\s*[-*]\s*\[ \]\s*//')
    [[ -n "$cleaned" ]] && failures+=("$cleaned")
  done < <(grep -E '^\s*[-*]\s*\[ \]' "$CHECKLIST_FILE" 2>/dev/null | head -10)
fi

# Output as JSON array
if [[ ${#failures[@]} -eq 0 ]]; then
  echo "[]"
else
  printf '%s\n' "${failures[@]}" | to_json_array
fi
