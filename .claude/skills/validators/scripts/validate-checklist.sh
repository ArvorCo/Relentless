#!/usr/bin/env bash
# validate-checklist.sh - Validate checklist.md structure
# Usage: validate-checklist.sh <path-to-checklist.md>
#
# Required structure:
# - Title: # [Type] Checklist: [Feature Name]
# - Quality Gates section (MANDATORY)
# - TDD Compliance section (MANDATORY)
# - Routing Compliance section (MANDATORY)
# - CHK-XXX numbered items
# - Checkboxes [ ] or [x]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

FILE="${1:-}"

if [[ -z "$FILE" ]]; then
  echo "Usage: validate-checklist.sh <path-to-checklist.md>"
  exit 1
fi

if ! check_file "$FILE"; then
  exit 1
fi

header "Validating Checklist: $FILE"

# Check for proper title
info "Checking document structure..."

if grep -qE "^# .*Checklist:" "$FILE" 2>/dev/null; then
  TITLE=$(grep -oE "^# .+Checklist: .+" "$FILE" | head -1)
  pass "Title found: $TITLE"
else
  error "Missing title (expected: # [Type] Checklist: [Feature Name])"
fi

# Check for Purpose
if grep -qE "\*\*Purpose\*\*:|\*\*Purpose:\*\*" "$FILE" 2>/dev/null; then
  pass "Purpose documented"
else
  warning "No purpose documented (recommended: **Purpose**: ...)"
fi

# Check mandatory sections
info "Checking mandatory sections..."

# Quality Gates - can be numbered (## 0.) or unnumbered, or part of another section
if grep -qE "^## 0\. Quality Gates|^## Quality Gates|^## Test Infrastructure" "$FILE" 2>/dev/null; then
  pass "Quality Gates/Test section found"
else
  warning "No explicit Quality Gates section (recommended: ## Quality Gates)"
fi

# Check Quality Gates content
if grep -qE "typecheck|type-check" "$FILE" 2>/dev/null; then
  pass "Typecheck gate present"
else
  error "Missing typecheck in Quality Gates"
fi

if grep -qE "lint" "$FILE" 2>/dev/null; then
  pass "Lint gate present"
else
  error "Missing lint in Quality Gates"
fi

if grep -qE "test|bun test" "$FILE" 2>/dev/null; then
  pass "Test gate present"
else
  error "Missing test in Quality Gates"
fi

# TDD Compliance - check for TDD-related content
if grep -qiE "^## .*TDD|TDD Compliance|tests.*before|written.*before" "$FILE" 2>/dev/null; then
  pass "TDD compliance content found"
else
  warning "No explicit TDD Compliance section (recommended for TDD enforcement)"
fi

# Routing Compliance - check for routing-related content
if grep -qiE "^## .*Routing|Routing Compliance|routing.*metadata|complexity" "$FILE" 2>/dev/null; then
  pass "Routing compliance content found"
else
  warning "No explicit Routing Compliance section (optional for non-routed features)"
fi

# Check CHK-XXX format
info "Checking checklist items..."

CHK_COUNT=$(count_pattern "$FILE" "CHK-[0-9]+")
if [[ "$CHK_COUNT" -ge 5 ]]; then
  pass "Found $CHK_COUNT checklist item(s) with CHK-XXX format"
else
  error "Insufficient checklist items (found $CHK_COUNT, need at least 5 CHK-XXX items)"
fi

# Check for checkboxes
UNCHECKED=$(count_pattern "$FILE" "- \[ \]")
CHECKED=$(count_pattern "$FILE" "- \[x\]|- \[X\]")
TOTAL_BOXES=$((UNCHECKED + CHECKED))

if [[ "$TOTAL_BOXES" -ge 5 ]]; then
  pass "Found $TOTAL_BOXES checkbox(es) ($CHECKED checked, $UNCHECKED unchecked)"
else
  error "Insufficient checkboxes (found $TOTAL_BOXES, need at least 5)"
fi

# Check CHK numbers are unique
info "Checking checklist consistency..."

CHK_NUMBERS=$(grep -oE "CHK-[0-9]+" "$FILE" 2>/dev/null | sort)
CHK_UNIQUE=$(echo "$CHK_NUMBERS" | uniq)
CHK_DUPLICATES=$(echo "$CHK_NUMBERS" | uniq -d)

if [[ -z "$CHK_DUPLICATES" ]]; then
  pass "All CHK-XXX IDs are unique"
else
  warning "Duplicate CHK IDs found: $CHK_DUPLICATES"
fi

# Check CHK numbers are sequential (starting from 001)
FIRST_CHK=$(echo "$CHK_UNIQUE" | head -1 | grep -oE "[0-9]+")
if [[ "$FIRST_CHK" == "001" || "$FIRST_CHK" == "1" ]]; then
  pass "CHK numbering starts at 001"
else
  warning "CHK numbering doesn't start at 001 (starts at CHK-$FIRST_CHK)"
fi

# Check for US-XXX references (optional but common)
info "Checking cross-references..."

US_REFS=$(count_pattern "$FILE" "\[US-[0-9]+\]")
if [[ "$US_REFS" -ge 1 ]]; then
  pass "Found $US_REFS user story reference(s) [US-XXX]"
else
  warning "No user story references found (checklist items can reference [US-XXX])"
fi

# Check for Gap/Ambiguity markers
GAP_COUNT=$(count_pattern "$FILE" "\[Gap\]|\[Ambiguity\]")
if [[ "$GAP_COUNT" -gt 0 ]]; then
  warning "Found $GAP_COUNT [Gap] or [Ambiguity] marker(s) - these should be resolved"
fi

# Check for sample/placeholder items that weren't replaced
info "Checking for sample items..."

SAMPLE_PATTERNS=(
  "First checklist item with clear action"
  "Second checklist item"
  "Third checklist item"
  "Another category item"
  "Item with specific criteria"
  "Final item in this category"
  "\[Category [0-9]\]"
)

SAMPLE_FOUND=0
for pattern in "${SAMPLE_PATTERNS[@]}"; do
  if grep -qE "$pattern" "$FILE" 2>/dev/null; then
    SAMPLE_FOUND=1
    warning "Sample item found: $pattern"
  fi
done

if [[ "$SAMPLE_FOUND" -eq 0 ]]; then
  pass "No sample/placeholder items found"
fi

# Check for placeholders
info "Checking for unfilled placeholders..."
check_no_placeholders "$FILE"

# Check section count
info "Checking structure completeness..."

SECTION_COUNT=$(count_pattern "$FILE" "^## ")
if [[ "$SECTION_COUNT" -ge 3 ]]; then
  pass "Found $SECTION_COUNT section(s)"
else
  error "Insufficient sections (need at least 3: Quality Gates, TDD, Routing)"
fi

# Print summary
print_summary "checklist.md"
exit $?
