#!/usr/bin/env bash
# extract-session-context.sh - Extract relevant context from agent session files
# Usage: extract-session-context.sh <feature-path> [story-id]
# Output: JSON object with session excerpts related to the feature/story

set -euo pipefail

FEATURE_PATH="${1:-}"
STORY_ID="${2:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$SCRIPT_DIR/common.sh"

if [[ -z "$FEATURE_PATH" ]]; then
  echo "{\"error\": \"No feature path provided\"}"
  exit 0
fi

FEATURE_NAME=$(get_feature_name "$FEATURE_PATH")
GREP_CMD=$(detect_grep)

# Common session file locations
SESSION_PATHS=(
  "$HOME/.claude/projects/"
  "$HOME/.amp/sessions/"
  "$HOME/.opencode/sessions/"
  ".claude/sessions/"
)

# Build search patterns
PATTERNS=("$FEATURE_NAME")
[[ -n "$STORY_ID" ]] && PATTERNS+=("$STORY_ID")

# Search for relevant session content
excerpts=()

for session_dir in "${SESSION_PATHS[@]}"; do
  if [[ -d "$session_dir" ]]; then
    for pattern in "${PATTERNS[@]}"; do
      if [[ "$GREP_CMD" == "rg" ]]; then
        # Search JSONL files for content containing the pattern
        while IFS= read -r line; do
          # Extract just the relevant text (not full JSON)
          if command -v jq >/dev/null 2>&1; then
            excerpt=$(echo "$line" | jq -r '.content // .message // .text // empty' 2>/dev/null | head -c 500)
          else
            excerpt=$(echo "$line" | grep -oE '"(content|message|text)":"[^"]{0,500}"' | head -1)
          fi
          [[ -n "$excerpt" ]] && excerpts+=("$excerpt")
        done < <(rg -l "$pattern" "$session_dir" --glob "*.jsonl" 2>/dev/null | head -5 | xargs -I{} rg -m3 "$pattern" {} 2>/dev/null | head -10)
      else
        # Fallback grep search
        while IFS= read -r line; do
          excerpt=$(echo "$line" | head -c 500)
          [[ -n "$excerpt" ]] && excerpts+=("$excerpt")
        done < <(find "$session_dir" -name "*.jsonl" -type f 2>/dev/null | head -5 | xargs grep -l "$pattern" 2>/dev/null | head -3 | xargs -I{} grep -m3 "$pattern" {} 2>/dev/null | head -10)
      fi
    done
  fi
done

# Output as JSON
if command -v jq >/dev/null 2>&1; then
  jq -n \
    --arg feature "$FEATURE_NAME" \
    --arg story "${STORY_ID:-all}" \
    --argjson excerpts "$(printf '%s\n' "${excerpts[@]:-}" 2>/dev/null | head -10 | to_json_array)" \
    '{
      feature: $feature,
      story: $story,
      excerptCount: ($excerpts | length),
      excerpts: $excerpts,
      note: "Session excerpts containing feature/story references"
    }'
else
  echo "{\"feature\": \"$FEATURE_NAME\", \"story\": \"${STORY_ID:-all}\", \"excerptCount\": ${#excerpts[@]}}"
fi
