#!/bin/bash
# Relentless - Universal AI Agent Orchestrator
# Usage: ./relentless.sh --feature <name> [--agent <name>] [--max-iterations <n>]
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
    -h|--help)
      echo "Relentless - Universal AI Agent Orchestrator"
      echo ""
      echo "Usage: $0 --feature <name> [options]"
      echo ""
      echo "Required:"
      echo "  -f, --feature <name>      Feature to run"
      echo ""
      echo "Options:"
      echo "  -a, --agent <name>        Agent to use (default: claude)"
      echo "                            Options: claude, amp, opencode, codex, droid, gemini, auto"
      echo "  -m, --max-iterations <n>  Maximum iterations (default: 20)"
      echo "  --dry-run                 Show what would execute without running"
      echo "  -h, --help                Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0 --feature ux-improvements                # Run with Claude Code"
      echo "  $0 --feature auth --agent amp               # Run with Amp"
      echo "  $0 --feature api --agent auto               # Smart routing"
      echo "  $0 --feature ui --max-iterations 30         # Run up to 30 iterations"
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

# Check if bun is available
if command -v bun &> /dev/null; then
  # Use TypeScript implementation
  cd "$PROJECT_DIR"
  exec bun run "${SCRIPT_DIR}/relentless.ts" run \
    --feature "$FEATURE" \
    --agent "$AGENT" \
    --max-iterations "$MAX_ITERATIONS" \
    $DRY_RUN
else
  echo "Bun not found, using bash fallback..."

  # Fallback to simple bash implementation
  FEATURE_DIR="${RELENTLESS_DIR}/features/${FEATURE}"
  PRD_FILE="${FEATURE_DIR}/prd.json"
  PROGRESS_FILE="${FEATURE_DIR}/progress.txt"
  PROMPT_FILE="${RELENTLESS_DIR}/prompt.md"

  if [ ! -d "$FEATURE_DIR" ]; then
    echo "Error: Feature '${FEATURE}' not found"
    echo ""
    echo "Available features:"
    ls -1 "${RELENTLESS_DIR}/features" 2>/dev/null | grep -v ".gitkeep" || echo "  (none)"
    exit 1
  fi

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
fi
