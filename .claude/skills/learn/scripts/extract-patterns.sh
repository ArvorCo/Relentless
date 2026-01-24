#!/usr/bin/env bash
# extract-patterns.sh - Extract patterns from progress.txt
# Output: JSON array of pattern strings

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

# Extract patterns from "Learnings for Future Iterations" sections
# These are the most valuable learnings

patterns=()

# Method 1: Lines after "Learnings for Future Iterations" header
if [[ "$GREP_CMD" == "rg" ]]; then
  while IFS= read -r line; do
    # Remove leading "- " or "* " if present, skip empty and header lines
    cleaned=$(echo "$line" | sed -E 's/^[-*]\s*//' | tr -s ' ')
    # Skip lines that are just headers or empty
    if [[ -n "$cleaned" && ! "$cleaned" =~ ^\*\* && ! "$cleaned" =~ ^# && ! "$cleaned" =~ ^-- ]]; then
      patterns+=("$cleaned")
    fi
  done < <(rg -A6 'Learnings for Future Iterations' "$PROGRESS_FILE" 2>/dev/null | grep -E '^\s*[-*]\s' | head -20)
else
  while IFS= read -r line; do
    cleaned=$(echo "$line" | sed -E 's/^[-*]\s*//' | tr -s ' ')
    if [[ -n "$cleaned" && ! "$cleaned" =~ ^\*\* && ! "$cleaned" =~ ^# && ! "$cleaned" =~ ^-- ]]; then
      patterns+=("$cleaned")
    fi
  done < <(grep -A6 'Learnings for Future Iterations' "$PROGRESS_FILE" 2>/dev/null | grep -E '^\s*[-*]\s' | head -20)
fi

# Method 2: Also extract from "Learnings:" sections (older format)
if [[ "$GREP_CMD" == "rg" ]]; then
  while IFS= read -r line; do
    cleaned=$(echo "$line" | sed -E 's/^[-*]\s*//' | tr -s ' ')
    if [[ -n "$cleaned" && ! "$cleaned" =~ ^\*\* && ! "$cleaned" =~ ^# && ! "$cleaned" =~ ^-- ]]; then
      patterns+=("$cleaned")
    fi
  done < <(rg -A4 'Learnings:$' "$PROGRESS_FILE" 2>/dev/null | grep -E '^\s*[-*]\s' | head -10)
else
  while IFS= read -r line; do
    cleaned=$(echo "$line" | sed -E 's/^[-*]\s*//' | tr -s ' ')
    if [[ -n "$cleaned" && ! "$cleaned" =~ ^\*\* && ! "$cleaned" =~ ^# && ! "$cleaned" =~ ^-- ]]; then
      patterns+=("$cleaned")
    fi
  done < <(grep -A4 'Learnings:$' "$PROGRESS_FILE" 2>/dev/null | grep -E '^\s*[-*]\s' | head -10)
fi

# Output as JSON array (deduplicated, max 15)
if [[ ${#patterns[@]} -eq 0 ]]; then
  echo "[]"
else
  printf '%s\n' "${patterns[@]}" | sort -u | head -15 | to_json_array
fi
