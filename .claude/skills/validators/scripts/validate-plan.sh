#!/usr/bin/env bash
# validate-plan.sh - Validate plan.md structure
# Usage: validate-plan.sh <path-to-plan.md>
#
# Required structure:
# - Title: # Technical Plan: [Feature Name]
# - Technical Context section
# - Constitution Compliance section
# - Implementation Plan/Architecture
# - Test Specifications section
# - Quality Gates section

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

FILE="${1:-}"

if [[ -z "$FILE" ]]; then
  echo "Usage: validate-plan.sh <path-to-plan.md>"
  exit 1
fi

if ! check_file "$FILE"; then
  exit 1
fi

header "Validating Plan: $FILE"

# Check for proper title
info "Checking document structure..."

if grep -qE "^# (Technical )?(Implementation )?Plan:" "$FILE" 2>/dev/null; then
  FEATURE=$(grep -oE "^# .+Plan: .+" "$FILE" | head -1)
  pass "Title found: $FEATURE"
else
  error "Missing title (expected: # Technical Plan: [Feature Name] or similar)"
fi

# Check for mandatory sections
info "Checking mandatory sections..."

# Technical Context/Overview
if grep -qE "^## Technical Context|^## Context|^## Current State|^## Technical Overview|^## Overview" "$FILE" 2>/dev/null; then
  pass "Technical Context/Overview section found"
else
  error "Missing Technical Context section (## Technical Context or ## Technical Overview)"
fi

# Constitution Compliance
if grep -qE "^## Constitution Compliance|^## Compliance|^## Constitution" "$FILE" 2>/dev/null; then
  pass "Constitution Compliance section found"
else
  error "Missing Constitution Compliance section (## Constitution Compliance)"
fi

# Check for principle references in compliance section
PRINCIPLE_REFS=$(count_pattern "$FILE" "Principle [0-9]+")
if [[ "$PRINCIPLE_REFS" -ge 1 ]]; then
  pass "Found $PRINCIPLE_REFS constitution principle reference(s)"
else
  warning "No principle references found (should reference Principle 1, 2, etc.)"
fi

# Implementation Plan/Architecture
if grep -qE "^## Implementation|^## Architecture|^## Design|^## Approach" "$FILE" 2>/dev/null; then
  pass "Implementation/Architecture section found"
else
  error "Missing Implementation section (## Implementation Plan or ## Architecture)"
fi

# Test Specifications
if grep -qE "^## Test|^## Testing|^## TDD" "$FILE" 2>/dev/null; then
  pass "Test Specifications section found"
else
  error "Missing Test section (## Test Specifications or ## Testing Strategy)"
fi

# Quality Gates (optional - quality checks may be documented elsewhere)
if grep -qE "^## Quality|^## Gates|^## Validation|^### Quality" "$FILE" 2>/dev/null; then
  pass "Quality Gates section found"
else
  warning "No explicit Quality Gates section (## Quality Gates)"
fi

# Check test strategy content
info "Checking test coverage..."

# Unit tests
if grep -qiE "unit test|unit-test" "$FILE" 2>/dev/null; then
  pass "Unit testing mentioned"
else
  warning "No unit testing strategy documented"
fi

# Integration tests
if grep -qiE "integration test|integration-test|e2e|end-to-end" "$FILE" 2>/dev/null; then
  pass "Integration/E2E testing mentioned"
else
  warning "No integration testing strategy documented"
fi

# Check quality gates content
info "Checking quality requirements..."

# Typecheck
if grep -qiE "typecheck|type-check|typescript" "$FILE" 2>/dev/null; then
  pass "Type checking documented"
else
  warning "No typecheck requirements documented"
fi

# Lint
if grep -qiE "lint|eslint" "$FILE" 2>/dev/null; then
  pass "Linting documented"
else
  warning "No linting requirements documented"
fi

# Check for optional but recommended sections
info "Checking optional sections..."

check_section_warn "$FILE" "^## Risk|^## Risks" "Risk Assessment section"
check_section_warn "$FILE" "^## Assumptions|^## Constraints" "Assumptions/Constraints section"
check_section_warn "$FILE" "^## Dependencies" "Dependencies section"
check_section_warn "$FILE" "^## Timeline|^## Milestones" "Timeline/Milestones section"

# Check for file change documentation
info "Checking implementation guidance..."

FILE_CHANGES=$(count_pattern "$FILE" "\.ts|\.tsx|\.js|\.jsx|\.md|\.json|\.sh")
if [[ "$FILE_CHANGES" -ge 3 ]]; then
  pass "File references found ($FILE_CHANGES files mentioned)"
else
  warning "Few file references found (plan should list files to create/modify)"
fi

# Check for code examples
CODE_BLOCKS=$(grep -c '```' "$FILE" 2>/dev/null || echo "0")
CODE_BLOCKS=$((CODE_BLOCKS / 2))
if [[ "$CODE_BLOCKS" -ge 1 ]]; then
  pass "Found $CODE_BLOCKS code block(s)"
else
  warning "No code examples found (recommended for technical plans)"
fi

# Check spec reference
info "Checking cross-references..."

if grep -qE "spec\.md|specification" "$FILE" 2>/dev/null; then
  pass "References spec.md"
else
  warning "No reference to spec.md found"
fi

# Check for placeholders
info "Checking for unfilled placeholders..."
check_no_placeholders "$FILE"

# Print summary
print_summary "plan.md"
exit $?
