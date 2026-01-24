#!/usr/bin/env bash
# validate-tasks.sh - Validate tasks.md structure
# Usage: validate-tasks.sh <path-to-tasks.md>
#
# Required structure:
# - Title: # Implementation Tasks: [Feature Name]
# - At least one Phase section
# - User stories with [US-XXX] tags
# - Tasks under each user story
# - Complexity classifications
# - Dependencies properly formatted

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

FILE="${1:-}"

if [[ -z "$FILE" ]]; then
  echo "Usage: validate-tasks.sh <path-to-tasks.md>"
  exit 1
fi

if ! check_file "$FILE"; then
  exit 1
fi

header "Validating Tasks: $FILE"

# Check for proper title
info "Checking document structure..."

if grep -qE "^# (Implementation Tasks|User Stories):" "$FILE" 2>/dev/null; then
  FEATURE=$(grep -oE "^# (Implementation Tasks|User Stories): .+" "$FILE" | head -1)
  pass "Title found: $FEATURE"
else
  error "Missing title (expected: # Implementation Tasks: [Feature Name] or # User Stories: [Feature Name])"
fi

# Check for at least one Phase section
PHASE_COUNT=$(count_pattern "$FILE" "^## Phase [0-9]+")
if [[ "$PHASE_COUNT" -ge 1 ]]; then
  pass "Found $PHASE_COUNT Phase section(s)"
else
  error "No Phase sections found (expected: ## Phase 1: ..., ## Phase 2: ..., etc.)"
fi

# Check for user stories
info "Checking user stories..."

# Support both [US-XXX] and US-XXX: formats
US_COUNT=$(count_pattern "$FILE" "\[US-[0-9]+\]|^### US-[0-9]+:")
if [[ "$US_COUNT" -ge 1 ]]; then
  pass "Found $US_COUNT user story reference(s)"
else
  error "No user story tags found (expected: [US-001] or ### US-001:)"
fi

# Check for user story headings - both formats
US_HEADING_COUNT_BRACKET=$(count_pattern "$FILE" "^### \[US-[0-9]+\]")
US_HEADING_COUNT_COLON=$(count_pattern "$FILE" "^### US-[0-9]+:")
US_HEADING_COUNT=$((US_HEADING_COUNT_BRACKET + US_HEADING_COUNT_COLON))
if [[ "$US_HEADING_COUNT" -ge 1 ]]; then
  pass "Found $US_HEADING_COUNT user story heading(s)"
else
  error "No user story headings found (expected: ### [US-001] Title or ### US-001: Title)"
fi

# Check for complexity classifications
info "Checking metadata..."

COMPLEXITY_COUNT=$(count_pattern "$FILE" "\*\*Complexity\*\*:|Complexity:")
if [[ "$COMPLEXITY_COUNT" -ge 1 ]]; then
  pass "Found $COMPLEXITY_COUNT complexity classification(s)"
else
  warning "No complexity classifications found (recommended: **Complexity**: simple|medium|complex|expert)"
fi

# Check that complexities are valid values
if grep -qE "Complexity\*?\*?:\s*(simple|medium|complex|expert)" "$FILE" 2>/dev/null; then
  pass "Complexity values are valid (simple/medium/complex/expert)"
else
  if [[ "$COMPLEXITY_COUNT" -ge 1 ]]; then
    warning "Some complexity values may be invalid (expected: simple, medium, complex, expert)"
  fi
fi

# Check for Dependencies section or references
DEP_COUNT=$(count_pattern "$FILE" "\*\*Dependencies\*\*:|Depends on:|←")
if [[ "$DEP_COUNT" -ge 1 ]]; then
  pass "Found $DEP_COUNT dependency reference(s)"
else
  warning "No dependencies documented (use **Dependencies**: or ← symbol)"
fi

# Check for task checkboxes
info "Checking task structure..."

TASK_COUNT=$(count_pattern "$FILE" "^- \[ \]|^  - \[ \]|^    - \[ \]")
if [[ "$TASK_COUNT" -ge 1 ]]; then
  pass "Found $TASK_COUNT task checkbox(es)"
else
  error "No task checkboxes found (expected: - [ ] Task description)"
fi

# Check for acceptance criteria or test mentions
CRITERIA_COUNT=$(count_pattern "$FILE" "\*\*Acceptance\*\*|\*\*Test\*\*|acceptance criteria|Given.*When.*Then")
if [[ "$CRITERIA_COUNT" -ge 1 ]]; then
  pass "Found $CRITERIA_COUNT acceptance/test reference(s)"
else
  warning "No acceptance criteria found (recommended for testability)"
fi

# Check for Files to Create/Modify sections
info "Checking implementation guidance..."

FILES_SECTION=$(count_pattern "$FILE" "\*\*Files to|Files to Create|Files to Modify")
if [[ "$FILES_SECTION" -ge 1 ]]; then
  pass "Found file change documentation"
else
  warning "No 'Files to Create/Modify' documentation (recommended)"
fi

# Check for PRD conversion compatibility
info "Checking PRD conversion compatibility..."

# User stories need to have clear boundaries for prd.json conversion
# Looking for structured format: ### [US-XXX] Title or ### US-XXX: Title
if grep -qE "^### (\[US-[0-9]+\]|US-[0-9]+:)" "$FILE" 2>/dev/null; then
  pass "User stories have PRD-convertible format"
else
  error "User story format not PRD-convertible (need: ### [US-XXX] Title or ### US-XXX: Title)"
fi

# Check routing preference exists for prd.json
if grep -qE "Routing Preference|routing preference|Mode:|mode:" "$FILE" 2>/dev/null; then
  pass "Routing preference documented"
else
  warning "No routing preference found (will use defaults in prd.json)"
fi

# Check for placeholders
info "Checking for unfilled placeholders..."
check_no_placeholders "$FILE"

# Check for common issues
info "Checking for common issues..."

# Check for duplicate US numbers (handles both [US-XXX] and US-XXX: formats)
DUPLICATE_US=$(grep -oE "\[US-[0-9]+\]|### US-[0-9]+:" "$FILE" 2>/dev/null | grep -oE "US-[0-9]+" | sort | uniq -d)
if [[ -z "$DUPLICATE_US" ]]; then
  pass "No duplicate user story IDs"
else
  warning "Duplicate user story IDs found: $DUPLICATE_US"
fi

# Check US numbers are sequential (just a warning)
US_NUMBERS=$(grep -oE "US-[0-9]+" "$FILE" 2>/dev/null | grep -oE "[0-9]+" | sort -n | uniq)
EXPECTED_SEQ=1
SEQ_OK=true
for num in $US_NUMBERS; do
  # Use 10# to force base 10 (avoid octal interpretation of 008, 009)
  if [[ "$((10#$num))" -ne "$EXPECTED_SEQ" ]]; then
    SEQ_OK=false
    break
  fi
  EXPECTED_SEQ=$((EXPECTED_SEQ + 1))
done

if [[ "$SEQ_OK" == "true" ]]; then
  pass "User story IDs are sequential"
else
  warning "User story IDs are not sequential (gaps may exist)"
fi

# Print summary
print_summary "tasks.md"
exit $?
