#!/usr/bin/env bash
# validate.sh - Main validation orchestrator
# Usage:
#   validate.sh <feature-path>           # Validate all docs in feature directory
#   validate.sh <file.md>                # Validate single file (auto-detect type)
#   validate.sh --type=spec <file.md>    # Validate file as specific type
#   validate.sh --help                   # Show help
#
# Exit codes:
#   0 - All validations passed
#   1 - Validation errors found
#   2 - Usage error

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

show_help() {
  cat <<EOF
Relentless Document Validator

USAGE:
    validate.sh <feature-path>           Validate all docs in feature directory
    validate.sh <file.md>                Validate single file (auto-detect type)
    validate.sh --type=<type> <file.md>  Validate file as specific type
    validate.sh --help                   Show this help

TYPES:
    spec          Feature specification (spec.md)
    plan          Technical plan (plan.md)
    tasks         Implementation tasks (tasks.md)
    checklist     Quality checklist (checklist.md)
    constitution  Project constitution (constitution.md)
    prompt        Agent instructions (prompt.md)

EXAMPLES:
    # Validate all documents in a feature
    validate.sh relentless/features/001-queued-prompts

    # Validate a single spec file
    validate.sh relentless/features/001-queued-prompts/spec.md

    # Force validation as specific type
    validate.sh --type=spec my-document.md

EXIT CODES:
    0  All validations passed
    1  Validation errors found
    2  Usage error
EOF
}

# Detect document type from filename
detect_type() {
  local file="$1"
  local basename
  basename=$(basename "$file")

  case "$basename" in
    spec.md|*-spec.md|specification.md)
      echo "spec"
      ;;
    plan.md|*-plan.md|technical-plan.md)
      echo "plan"
      ;;
    tasks.md|*-tasks.md|implementation-tasks.md)
      echo "tasks"
      ;;
    checklist.md|*-checklist.md)
      echo "checklist"
      ;;
    constitution.md|*-constitution.md)
      echo "constitution"
      ;;
    prompt.md|*-prompt.md|agent-prompt.md)
      echo "prompt"
      ;;
    *)
      # Try to detect from content
      if grep -qE "^# Feature Specification:" "$file" 2>/dev/null; then
        echo "spec"
      elif grep -qE "^# (Technical )?Plan:" "$file" 2>/dev/null; then
        echo "plan"
      elif grep -qE "^# Implementation Tasks:" "$file" 2>/dev/null; then
        echo "tasks"
      elif grep -qE "^# .*Checklist:" "$file" 2>/dev/null; then
        echo "checklist"
      elif grep -qE "^# .*Constitution" "$file" 2>/dev/null; then
        echo "constitution"
      elif grep -qE "^# .*Agent.*Instructions|^# Relentless" "$file" 2>/dev/null; then
        echo "prompt"
      else
        echo "unknown"
      fi
      ;;
  esac
}

# Run validator for specific type
run_validator() {
  local type="$1"
  local file="$2"

  case "$type" in
    spec)
      "$SCRIPT_DIR/validate-spec.sh" "$file"
      ;;
    plan)
      "$SCRIPT_DIR/validate-plan.sh" "$file"
      ;;
    tasks)
      "$SCRIPT_DIR/validate-tasks.sh" "$file"
      ;;
    checklist)
      "$SCRIPT_DIR/validate-checklist.sh" "$file"
      ;;
    constitution)
      "$SCRIPT_DIR/validate-constitution.sh" "$file"
      ;;
    prompt)
      "$SCRIPT_DIR/validate-prompt.sh" "$file"
      ;;
    *)
      echo -e "${RED}Unknown document type: $type${NC}"
      return 2
      ;;
  esac
}

# Validate all documents in a feature directory
validate_feature() {
  local feature_path="$1"
  local exit_code=0

  echo -e "${BOLD}${BLUE}╔═══════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}${BLUE}║   Relentless Document Validator           ║${NC}"
  echo -e "${BOLD}${BLUE}╚═══════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "Feature: ${BOLD}$feature_path${NC}"
  echo ""

  # Find and validate each document type
  local docs_validated=0

  # spec.md
  if [[ -f "$feature_path/spec.md" ]]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    if ! run_validator "spec" "$feature_path/spec.md"; then
      exit_code=1
    fi
    ((docs_validated++))
  fi

  # plan.md
  if [[ -f "$feature_path/plan.md" ]]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    if ! run_validator "plan" "$feature_path/plan.md"; then
      exit_code=1
    fi
    ((docs_validated++))
  fi

  # tasks.md
  if [[ -f "$feature_path/tasks.md" ]]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    if ! run_validator "tasks" "$feature_path/tasks.md"; then
      exit_code=1
    fi
    ((docs_validated++))
  fi

  # checklist.md
  if [[ -f "$feature_path/checklist.md" ]]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    if ! run_validator "checklist" "$feature_path/checklist.md"; then
      exit_code=1
    fi
    ((docs_validated++))
  fi

  # Project-level constitution (check parent directories)
  local constitution_path=""
  if [[ -f "$feature_path/../../constitution.md" ]]; then
    constitution_path="$feature_path/../../constitution.md"
  elif [[ -f "$feature_path/../../../relentless/constitution.md" ]]; then
    constitution_path="$feature_path/../../../relentless/constitution.md"
  fi

  if [[ -n "$constitution_path" && -f "$constitution_path" ]]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    if ! run_validator "constitution" "$constitution_path"; then
      exit_code=1
    fi
    ((docs_validated++))
  fi

  # Project-level prompt.md (check parent directories)
  local prompt_path=""
  if [[ -f "$feature_path/../../prompt.md" ]]; then
    prompt_path="$feature_path/../../prompt.md"
  elif [[ -f "$feature_path/../../../relentless/prompt.md" ]]; then
    prompt_path="$feature_path/../../../relentless/prompt.md"
  fi

  if [[ -n "$prompt_path" && -f "$prompt_path" ]]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    if ! run_validator "prompt" "$prompt_path"; then
      exit_code=1
    fi
    ((docs_validated++))
  fi

  # Summary
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}Overall Summary${NC}"
  echo -e "Documents validated: $docs_validated"

  if [[ "$exit_code" -eq 0 ]]; then
    echo -e "${GREEN}${BOLD}✓ All documents passed validation${NC}"
  else
    echo -e "${RED}${BOLD}✗ Some documents have validation errors${NC}"
  fi

  return $exit_code
}

# Main
main() {
  local type=""
  local target=""

  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --help|-h)
        show_help
        exit 0
        ;;
      --type=*)
        type="${1#--type=}"
        shift
        ;;
      *)
        target="$1"
        shift
        ;;
    esac
  done

  if [[ -z "$target" ]]; then
    echo -e "${RED}Error: No target specified${NC}"
    echo ""
    show_help
    exit 2
  fi

  # Check if target exists
  if [[ ! -e "$target" ]]; then
    echo -e "${RED}Error: Target not found: $target${NC}"
    exit 2
  fi

  # Directory or file?
  if [[ -d "$target" ]]; then
    validate_feature "$target"
  elif [[ -f "$target" ]]; then
    # Validate single file
    if [[ -z "$type" ]]; then
      type=$(detect_type "$target")
    fi

    if [[ "$type" == "unknown" ]]; then
      echo -e "${RED}Error: Could not detect document type for: $target${NC}"
      echo "Use --type=<type> to specify the document type"
      exit 2
    fi

    echo -e "${BOLD}${BLUE}Validating $target as $type${NC}"
    run_validator "$type" "$target"
  else
    echo -e "${RED}Error: Target is neither a file nor directory: $target${NC}"
    exit 2
  fi
}

main "$@"
