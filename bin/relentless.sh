#!/bin/bash
# Relentless - Universal AI Agent Orchestrator
# Usage: ./relentless.sh [--agent <name>] [--max-iterations <n>]
#
# Agents: claude, amp, opencode, codex, droid, gemini, auto
# Default: claude

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${SCRIPT_DIR}/.."

# Default values
AGENT="claude"
MAX_ITERATIONS=20
DRY_RUN=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
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
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  -a, --agent <name>        Agent to use (default: claude)"
      echo "                            Options: claude, amp, opencode, codex, droid, gemini, auto"
      echo "  -m, --max-iterations <n>  Maximum iterations (default: 20)"
      echo "  --dry-run                 Show what would execute without running"
      echo "  -h, --help                Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                        # Run with Claude Code"
      echo "  $0 --agent amp            # Run with Amp"
      echo "  $0 --agent auto           # Smart routing (auto-select agent)"
      echo "  $0 --max-iterations 30    # Run up to 30 iterations"
      exit 0
      ;;
    *)
      # If first arg is a number, treat as max_iterations (legacy support)
      if [[ $1 =~ ^[0-9]+$ ]]; then
        MAX_ITERATIONS="$1"
        shift
      else
        echo "Unknown option: $1"
        exit 1
      fi
      ;;
  esac
done

# Check if bun is available
if command -v bun &> /dev/null; then
  # Use TypeScript implementation
  exec bun run "${SCRIPT_DIR}/relentless.ts" run \
    --agent "$AGENT" \
    --max-iterations "$MAX_ITERATIONS" \
    $DRY_RUN
else
  echo "Bun not found, using bash fallback..."

  # Fallback to simple bash implementation
  PRD_FILE="${PROJECT_DIR}/prd.json"
  PROGRESS_FILE="${PROJECT_DIR}/progress.txt"
  PROMPT_FILE="${PROJECT_DIR}/prompt.md"

  if [ ! -f "$PRD_FILE" ]; then
    echo "Error: prd.json not found"
    exit 1
  fi

  if [ ! -f "$PROMPT_FILE" ]; then
    echo "Error: prompt.md not found"
    exit 1
  fi

  # Initialize progress file if needed
  if [ ! -f "$PROGRESS_FILE" ]; then
    echo "# Relentless Progress Log" > "$PROGRESS_FILE"
    echo "Started: $(date)" >> "$PROGRESS_FILE"
    echo "---" >> "$PROGRESS_FILE"
  fi

  echo ""
  echo "🚀 Relentless - Universal AI Agent Orchestrator"
  echo "Agent: $AGENT"
  echo "Max iterations: $MAX_ITERATIONS"
  echo ""

  for i in $(seq 1 $MAX_ITERATIONS); do
    echo ""
    echo "═══════════════════════════════════════════════════════"
    echo "  Relentless Iteration $i of $MAX_ITERATIONS"
    echo "  Agent: $AGENT"
    echo "═══════════════════════════════════════════════════════"

    # Select agent command based on agent name
    case $AGENT in
      claude)
        OUTPUT=$(cat "$PROMPT_FILE" | claude -p --dangerously-skip-permissions 2>&1 | tee /dev/stderr) || true
        ;;
      amp)
        OUTPUT=$(cat "$PROMPT_FILE" | amp --dangerously-allow-all 2>&1 | tee /dev/stderr) || true
        ;;
      opencode)
        OUTPUT=$(opencode run "$(cat "$PROMPT_FILE")" 2>&1 | tee /dev/stderr) || true
        ;;
      codex)
        OUTPUT=$(codex exec - < "$PROMPT_FILE" 2>&1 | tee /dev/stderr) || true
        ;;
      droid)
        OUTPUT=$(droid exec - < "$PROMPT_FILE" 2>&1 | tee /dev/stderr) || true
        ;;
      gemini)
        OUTPUT=$(gemini --yolo "$(cat "$PROMPT_FILE")" 2>&1 | tee /dev/stderr) || true
        ;;
      auto)
        echo "Smart routing not available in bash fallback. Using Claude Code."
        OUTPUT=$(cat "$PROMPT_FILE" | claude -p --dangerously-skip-permissions 2>&1 | tee /dev/stderr) || true
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
  echo "Check $PROGRESS_FILE for status."
  exit 1
fi
