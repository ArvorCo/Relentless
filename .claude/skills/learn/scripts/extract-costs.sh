#!/usr/bin/env bash
# extract-costs.sh - Extract cost data from prd.json
# Output: JSON object with cost statistics

set -euo pipefail

FEATURE_PATH="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$SCRIPT_DIR/common.sh"

if [[ -z "$FEATURE_PATH" ]]; then
  echo "{}"
  exit 0
fi

PRD_FILE="$FEATURE_PATH/prd.json"

if ! check_file "$PRD_FILE"; then
  echo "{}"
  exit 0
fi

# Check if jq is available
if ! command -v jq >/dev/null 2>&1; then
  # Minimal fallback without jq
  FEATURE_NAME=$(get_feature_name "$FEATURE_PATH")
  echo "{\"feature\": \"$FEATURE_NAME\", \"note\": \"jq not available for detailed extraction\"}"
  exit 0
fi

# Extract cost data using jq
jq '{
  feature: (.branchName // .project // "unknown"),
  totalStories: (.userStories | length),
  completedStories: ([.userStories[] | select(.passes == true)] | length),
  skippedStories: ([.userStories[] | select(.skipped == true)] | length),
  storiesWithRouting: ([.userStories[] | select(.routing != null)] | length),
  estimatedCost: ([.userStories[].routing.estimatedCost // 0] | add),
  actualCost: ([.userStories[].execution.actualCost // 0] | add),
  escalations: ([.userStories[] | select(.execution.attempts != null and .execution.attempts > 1)] | length),
  complexityBreakdown: {
    simple: ([.userStories[] | select(.routing.complexity == "simple")] | length),
    medium: ([.userStories[] | select(.routing.complexity == "medium")] | length),
    complex: ([.userStories[] | select(.routing.complexity == "complex")] | length),
    expert: ([.userStories[] | select(.routing.complexity == "expert")] | length)
  }
}' "$PRD_FILE" 2>/dev/null || echo "{}"
