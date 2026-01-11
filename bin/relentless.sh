#!/bin/bash
# Relentless - Universal AI Agent Orchestrator
# Usage: ./relentless.sh --feature <name> [--agent <name>] [--max-iterations <n>]
#        ./relentless.sh --status --feature <name>
#        ./relentless.sh --reset <story-id> --feature <name>
#
# Agents: claude, amp, opencode, codex, droid, gemini, auto
# Default: claude

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RELENTLESS_DIR="${SCRIPT_DIR}/.."
PROJECT_DIR="${RELENTLESS_DIR}/.."

# Default values
AGENT="claude"
MAX_ITERATIONS=20
FEATURE=""
DRY_RUN=""
TUI=""
MODE="run"
RESET_STORY=""
CONVERT_FILE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -f|--feature)
      FEATURE="$2"
      shift 2
      ;;
    -a|--agent)
      AGENT="$2"
      shift 2
      ;;
    -m|--max-iterations)
      MAX_ITERATIONS="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN="--dry-run"
      shift
      ;;
    --tui)
      TUI="--tui"
      shift
      ;;
    -s|--status)
      MODE="status"
      shift
      ;;
    --reset)
      MODE="reset"
      RESET_STORY="$2"
      shift 2
      ;;
    --convert)
      MODE="convert"
      CONVERT_FILE="$2"
      shift 2
      ;;
    -h|--help)
      echo "Relentless - Universal AI Agent Orchestrator"
      echo ""
      echo "Usage: $0 --feature <name> [options]"
      echo ""
      echo "Required:"
      echo "  -f, --feature <name>      Feature to run"
      echo ""
      echo "Commands:"
      echo "  (default)                 Run the orchestration loop"
      echo "  -s, --status              Show status of all user stories"
      echo "  --reset <story-id>        Reset a story to incomplete"
      echo "  --convert <prd.md>        Convert PRD markdown to JSON"
      echo ""
      echo "Options:"
      echo "  -a, --agent <name>        Agent to use (default: claude)"
      echo "                            Options: claude, amp, opencode, codex, droid, gemini, auto"
      echo "  -m, --max-iterations <n>  Maximum iterations (default: 20)"
      echo "  --tui                     Use beautiful terminal UI interface"
      echo "  --dry-run                 Show what would execute without running"
      echo "  -h, --help                Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0 --feature ux-improvements                # Run with Claude Code"
      echo "  $0 --feature auth --agent amp               # Run with Amp"
      echo "  $0 --status --feature ux-improvements       # Show story status"
      echo "  $0 --reset US-005 --feature ux-improvements # Reset story to re-run"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Run with --help for usage"
      exit 1
      ;;
  esac
done

# Check feature is provided
if [ -z "$FEATURE" ]; then
  echo "Error: --feature is required"
  echo ""
  echo "Usage: $0 --feature <name> [options]"
  echo ""
  echo "Available features:"
  ls -1 "${RELENTLESS_DIR}/features" 2>/dev/null | grep -v ".gitkeep" || echo "  (none)"
  echo ""
  echo "Run with --help for more options"
  exit 1
fi

# Set up paths
FEATURE_DIR="${RELENTLESS_DIR}/features/${FEATURE}"
PRD_FILE="${FEATURE_DIR}/prd.json"
PROGRESS_FILE="${FEATURE_DIR}/progress.txt"
PROMPT_FILE="${RELENTLESS_DIR}/prompt.md"

# Check if bun is available AND TypeScript file exists (development mode)
if command -v bun &> /dev/null && [ -f "${SCRIPT_DIR}/relentless.ts" ]; then
  # Use TypeScript implementation (development)
  cd "$PROJECT_DIR"
  case $MODE in
    status)
      exec bun run "${SCRIPT_DIR}/relentless.ts" status --feature "$FEATURE"
      ;;
    reset)
      exec bun run "${SCRIPT_DIR}/relentless.ts" reset "$RESET_STORY" --feature "$FEATURE"
      ;;
    convert)
      exec bun run "${SCRIPT_DIR}/relentless.ts" convert "$CONVERT_FILE" --feature "$FEATURE"
      ;;
    run)
      exec bun run "${SCRIPT_DIR}/relentless.ts" run \
        --feature "$FEATURE" \
        --agent "$AGENT" \
        --max-iterations "$MAX_ITERATIONS" \
        $DRY_RUN $TUI
      ;;
  esac
fi

# Bash fallback (works everywhere)

# TUI requires bun/TypeScript
if [ -n "$TUI" ]; then
  echo "Error: --tui requires bun runtime"
  echo "Install bun: curl -fsSL https://bun.sh/install | bash"
  echo "Or run without --tui for standard output"
  exit 1
fi

# Convert requires bun/TypeScript
if [ "$MODE" = "convert" ]; then
  echo "Error: --convert requires bun runtime"
  echo "Install bun: curl -fsSL https://bun.sh/install | bash"
  exit 1
fi

if [ ! -d "$FEATURE_DIR" ]; then
  echo "Error: Feature '${FEATURE}' not found"
  echo ""
  echo "Available features:"
  ls -1 "${RELENTLESS_DIR}/features" 2>/dev/null | grep -v ".gitkeep" || echo "  (none)"
  exit 1
fi

# Handle status mode
if [ "$MODE" = "status" ]; then
  if ! command -v jq &> /dev/null; then
    echo "Error: jq is required for status command"
    echo "Install with: brew install jq"
    exit 1
  fi

  TOTAL=$(jq '.userStories | length' "$PRD_FILE")
  COMPLETED=$(jq '[.userStories[] | select(.passes == true)] | length' "$PRD_FILE")

  echo ""
  echo "Feature: $FEATURE"
  echo "Progress: $COMPLETED/$TOTAL stories complete"
  echo ""

  jq -r '.userStories[] | if .passes then "  ✓ \(.id)   \(.title)" else "  ○ \(.id)   \(.title)" end' "$PRD_FILE"
  echo ""
  exit 0
fi

# Handle reset mode
if [ "$MODE" = "reset" ]; then
  if ! command -v jq &> /dev/null; then
    echo "Error: jq is required for reset command"
    echo "Install with: brew install jq"
    exit 1
  fi

  if [ -z "$RESET_STORY" ]; then
    echo "Error: Story ID required for reset"
    echo "Usage: $0 --reset <story-id> --feature <name>"
    exit 1
  fi

  # Check if story exists
  STORY_EXISTS=$(jq --arg id "$RESET_STORY" '[.userStories[] | select(.id == $id)] | length' "$PRD_FILE")
  if [ "$STORY_EXISTS" = "0" ]; then
    echo "Error: Story '$RESET_STORY' not found"
    echo "Available stories:"
    jq -r '.userStories[].id' "$PRD_FILE" | sed 's/^/  /'
    exit 1
  fi

  # Get story info before reset
  STORY_TITLE=$(jq -r --arg id "$RESET_STORY" '.userStories[] | select(.id == $id) | .title' "$PRD_FILE")
  WAS_COMPLETE=$(jq -r --arg id "$RESET_STORY" '.userStories[] | select(.id == $id) | .passes' "$PRD_FILE")
  PREV_COMPLETED=$(jq '[.userStories[] | select(.passes == true)] | length' "$PRD_FILE")

  # Reset the story
  jq --arg id "$RESET_STORY" '(.userStories[] | select(.id == $id) | .passes) = false' "$PRD_FILE" > "${PRD_FILE}.tmp"
  mv "${PRD_FILE}.tmp" "$PRD_FILE"

  NEW_COMPLETED=$(jq '[.userStories[] | select(.passes == true)] | length' "$PRD_FILE")
  TOTAL=$(jq '.userStories | length' "$PRD_FILE")

  if [ "$WAS_COMPLETE" = "true" ]; then
    echo ""
    echo "✓ Reset $RESET_STORY ($STORY_TITLE) to incomplete"
    echo "  Feature: $FEATURE"
    echo "  Progress: $NEW_COMPLETED/$TOTAL stories complete (was $PREV_COMPLETED/$TOTAL)"
    echo ""
  else
    echo ""
    echo "○ $RESET_STORY ($STORY_TITLE) was already incomplete"
    echo ""
  fi
  exit 0
fi

# Run mode - continue with orchestration
if [ ! -f "$PRD_FILE" ]; then
  echo "Error: relentless/features/${FEATURE}/prd.json not found"
  echo "Convert a PRD first: relentless convert <prd.md> --feature ${FEATURE}"
  exit 1
fi

if [ ! -f "$PROMPT_FILE" ]; then
  echo "Error: relentless/prompt.md not found"
  echo "Run: bunx github:ArvorCo/Relentless init"
  exit 1
fi

# Initialize progress file if needed
if [ ! -f "$PROGRESS_FILE" ]; then
  echo "# Progress Log: ${FEATURE}" > "$PROGRESS_FILE"
  echo "Started: $(date)" >> "$PROGRESS_FILE"
  echo "" >> "$PROGRESS_FILE"
  echo "## Codebase Patterns" >> "$PROGRESS_FILE"
  echo "" >> "$PROGRESS_FILE"
  echo "---" >> "$PROGRESS_FILE"
fi

echo ""
echo "🚀 Relentless - Universal AI Agent Orchestrator"
echo "Feature: $FEATURE"
echo "Agent: $AGENT"
echo "Max iterations: $MAX_ITERATIONS"
echo ""

cd "$PROJECT_DIR"

for i in $(seq 1 $MAX_ITERATIONS); do
  echo ""
  echo "═══════════════════════════════════════════════════════"
  echo "  Relentless Iteration $i of $MAX_ITERATIONS"
  echo "  Feature: $FEATURE"
  echo "  Agent: $AGENT"
  echo "═══════════════════════════════════════════════════════"

  # Show progress status before starting
  if command -v jq &> /dev/null; then
    TOTAL=$(jq '.userStories | length' "$PRD_FILE")
    COMPLETED=$(jq '[.userStories[] | select(.passes == true)] | length' "$PRD_FILE")
    PENDING=$((TOTAL - COMPLETED))

    # Get next pending story
    NEXT_ID=$(jq -r '.userStories[] | select(.passes == false) | .id' "$PRD_FILE" | head -1)
    NEXT_TITLE=$(jq -r --arg id "$NEXT_ID" '.userStories[] | select(.id == $id) | .title' "$PRD_FILE")

    echo ""
    echo "  Progress: $COMPLETED/$TOTAL stories complete ($PENDING remaining)"
    if [ -n "$NEXT_ID" ] && [ "$NEXT_ID" != "null" ]; then
      echo "  Next: $NEXT_ID - $NEXT_TITLE"
    fi
    echo ""
  fi

  # Build prompt with feature path substitution
  PROMPT=$(cat "$PROMPT_FILE" | sed "s/<feature>/${FEATURE}/g")

  # Select agent command based on agent name
  case $AGENT in
    claude)
      OUTPUT=$(echo "$PROMPT" | claude -p --dangerously-skip-permissions 2>&1 | tee /dev/stderr) || true
      ;;
    amp)
      OUTPUT=$(echo "$PROMPT" | amp --dangerously-allow-all 2>&1 | tee /dev/stderr) || true
      ;;
    opencode)
      OUTPUT=$(opencode run "$PROMPT" 2>&1 | tee /dev/stderr) || true
      ;;
    codex)
      OUTPUT=$(echo "$PROMPT" | codex exec - 2>&1 | tee /dev/stderr) || true
      ;;
    droid)
      OUTPUT=$(echo "$PROMPT" | droid exec - 2>&1 | tee /dev/stderr) || true
      ;;
    gemini)
      OUTPUT=$(gemini --yolo "$PROMPT" 2>&1 | tee /dev/stderr) || true
      ;;
    auto)
      echo "Smart routing not available in bash fallback. Using Claude Code."
      OUTPUT=$(echo "$PROMPT" | claude -p --dangerously-skip-permissions 2>&1 | tee /dev/stderr) || true
      ;;
    *)
      echo "Unknown agent: $AGENT"
      exit 1
      ;;
  esac

  # Check for completion signal
  if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
    echo ""
    echo "🎉 Relentless completed all tasks!"
    echo "Completed at iteration $i of $MAX_ITERATIONS"
    exit 0
  fi

  echo "Iteration $i complete. Continuing..."
  sleep 2
done

echo ""
echo "⚠️ Relentless reached max iterations ($MAX_ITERATIONS) without completing all tasks."
echo "Check relentless/features/${FEATURE}/progress.txt for status."
exit 1
