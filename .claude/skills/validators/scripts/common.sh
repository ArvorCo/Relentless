#!/usr/bin/env bash
# common.sh - Shared utilities for validators
# Source this file in all validators

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
ERRORS=0
WARNINGS=0
PASSED=0

# Output functions
error() {
  echo -e "${RED}✗ ERROR${NC}: $1"
  ERRORS=$((ERRORS + 1))
}

warning() {
  echo -e "${YELLOW}⚠ WARNING${NC}: $1"
  WARNINGS=$((WARNINGS + 1))
}

pass() {
  echo -e "${GREEN}✓${NC} $1"
  PASSED=$((PASSED + 1))
}

info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

header() {
  echo ""
  echo -e "${BLUE}━━━ $1 ━━━${NC}"
}

# Check if file exists
check_file() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    error "File not found: $file"
    return 1
  fi
  return 0
}

# Check if section exists in file
check_section() {
  local file="$1"
  local pattern="$2"
  local description="$3"

  if grep -qE "$pattern" "$file" 2>/dev/null; then
    pass "$description"
    return 0
  else
    error "Missing required section: $description"
    return 1
  fi
}

# Check if section exists (warning only - always returns 0)
check_section_warn() {
  local file="$1"
  local pattern="$2"
  local description="$3"

  if grep -qE "$pattern" "$file" 2>/dev/null; then
    pass "$description"
  else
    warning "Recommended section missing: $description"
  fi
  return 0  # Warnings don't fail validation
}

# Count occurrences of pattern
count_pattern() {
  local file="$1"
  local pattern="$2"
  local count

  # grep -c outputs the count but returns exit code 1 if count is 0
  # Use -- to prevent patterns starting with - being interpreted as options
  count=$(grep -cE -- "$pattern" "$file" 2>/dev/null) || true
  echo "${count:-0}"
}

# Check minimum occurrences of pattern
check_min_count() {
  local file="$1"
  local pattern="$2"
  local min_count="$3"
  local description="$4"

  local count
  count=$(count_pattern "$file" "$pattern")

  if [[ "$count" -ge "$min_count" ]]; then
    pass "$description (found $count)"
    return 0
  else
    error "$description (found $count, need at least $min_count)"
    return 1
  fi
}

# Check for placeholder text that wasn't filled in
check_no_placeholders() {
  local file="$1"
  local patterns=(
    '\[FEATURE.?NAME\]'
    '\[DATE\]'
    '\[NEEDS.?CLARIFICATION'
    '\[TODO\]'
    '\[TBD\]'
    '\[PLACEHOLDER\]'
    '\[Brief.?Title\]'
    '\[initial.?state\]'
    '\[action\]'
    '\[expected.?outcome\]'
    '\[specific.?capability'
    '\[Entity.?1\]'
    '\[Category.?[0-9]\]'
  )

  local found_placeholders=0
  for pattern in "${patterns[@]}"; do
    if grep -qE "$pattern" "$file" 2>/dev/null; then
      local matches
      matches=$(grep -oE "$pattern" "$file" | head -3 | tr '\n' ', ')
      warning "Unfilled placeholder found: $matches"
      found_placeholders=1
    fi
  done

  if [[ "$found_placeholders" -eq 0 ]]; then
    pass "No unfilled placeholders"
  fi

  return 0
}

# Print summary
print_summary() {
  local doc_type="$1"

  echo ""
  echo -e "${BLUE}━━━ Validation Summary for $doc_type ━━━${NC}"
  echo -e "  Passed:   ${GREEN}$PASSED${NC}"
  echo -e "  Warnings: ${YELLOW}$WARNINGS${NC}"
  echo -e "  Errors:   ${RED}$ERRORS${NC}"

  if [[ "$ERRORS" -gt 0 ]]; then
    echo ""
    echo -e "${RED}VALIDATION FAILED${NC}: $ERRORS error(s) found"
    return 1
  elif [[ "$WARNINGS" -gt 0 ]]; then
    echo ""
    echo -e "${YELLOW}VALIDATION PASSED WITH WARNINGS${NC}: $WARNINGS warning(s)"
    return 0
  else
    echo ""
    echo -e "${GREEN}VALIDATION PASSED${NC}: All checks passed"
    return 0
  fi
}

# Detect best available grep
detect_grep() {
  if command -v rg >/dev/null 2>&1; then
    echo "rg"
  else
    echo "grep"
  fi
}
