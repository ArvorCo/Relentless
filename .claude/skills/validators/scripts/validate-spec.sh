#!/usr/bin/env bash
# validate-spec.sh - Validate spec.md structure
# Usage: validate-spec.sh <path-to-spec.md>
#
# Required structure:
# - Title: # Feature Specification: [Feature Name]
# - User Scenarios & Testing section (mandatory)
# - User stories with priorities (P1, P2, P3)
# - Given/When/Then acceptance scenarios
# - Functional Requirements section (mandatory) with FR-XXX items
# - Test Strategy section (mandatory)
# - Success Criteria section (mandatory)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

FILE="${1:-}"

if [[ -z "$FILE" ]]; then
  echo "Usage: validate-spec.sh <path-to-spec.md>"
  exit 1
fi

if ! check_file "$FILE"; then
  exit 1
fi

header "Validating Spec: $FILE"

# Check for proper title
info "Checking document structure..."

if grep -qE "^# Feature Specification:|^# Specification:|^# Spec:" "$FILE" 2>/dev/null; then
  FEATURE=$(grep -oE "^# (Feature )?Spec(ification)?: .+" "$FILE" | sed 's/^# \(Feature \)\?Spec\(ification\)\?: //')
  pass "Title found: $FEATURE"
else
  error "Missing title (expected: # Feature Specification: [Feature Name])"
fi

# Check for Feature Branch
if grep -qE "\*\*Feature Branch\*\*:|Feature Branch:" "$FILE" 2>/dev/null; then
  pass "Feature branch documented"
else
  warning "No feature branch documented (recommended: **Feature Branch**: \`feature-name\`)"
fi

# Check for Routing Preference
if grep -qE "\*\*Routing Preference\*\*:|Routing Preference:" "$FILE" 2>/dev/null; then
  pass "Routing preference documented"
else
  warning "No routing preference documented (affects PRD generation)"
fi

# Check mandatory sections
info "Checking mandatory sections..."

# User Scenarios & Testing
if grep -qE "^## User Scenarios|^## Scenarios|^## User Stories" "$FILE" 2>/dev/null; then
  pass "User Scenarios section found"
else
  error "Missing User Scenarios section (## User Scenarios & Testing)"
fi

# Functional Requirements
if grep -qE "^## Requirements|^## Functional Requirements|^### Functional Requirements" "$FILE" 2>/dev/null; then
  pass "Requirements section found"
else
  error "Missing Requirements section (## Requirements)"
fi

# Test Strategy (optional - may be in plan.md instead)
if grep -qE "^## Test Strategy|^## Testing Strategy|^## Test Plan" "$FILE" 2>/dev/null; then
  pass "Test Strategy section found"
else
  warning "No Test Strategy section (may be in plan.md instead)"
fi

# Success Criteria
if grep -qE "^## Success Criteria|^## Acceptance Criteria|^## Definition of Done" "$FILE" 2>/dev/null; then
  pass "Success Criteria section found"
else
  error "Missing Success Criteria section (## Success Criteria)"
fi

# Check user stories
info "Checking user story quality..."

# Count user stories
US_HEADING_COUNT=$(count_pattern "$FILE" "^### User Story [0-9]+")
if [[ "$US_HEADING_COUNT" -ge 1 ]]; then
  pass "Found $US_HEADING_COUNT user story section(s)"
else
  error "No user story sections found (expected: ### User Story 1 - Title)"
fi

# Check for priorities
PRIORITY_COUNT=$(count_pattern "$FILE" "\(Priority: P[0-9]+\)|\*\*Priority\*\*: P[0-9]+")
if [[ "$PRIORITY_COUNT" -ge 1 ]]; then
  pass "Found $PRIORITY_COUNT priority assignment(s)"
else
  error "No priorities found (user stories need Priority: P1, P2, P3, etc.)"
fi

# Check for P1 priority specifically
if grep -qE "Priority: P1|Priority\*\*: P1" "$FILE" 2>/dev/null; then
  pass "Has P1 (highest priority) story"
else
  warning "No P1 priority story found (at least one story should be P1)"
fi

# Check TDD format (Given/When/Then)
info "Checking TDD compliance..."

GIVEN_COUNT=$(count_pattern "$FILE" "\*\*Given\*\*|Given ")
WHEN_COUNT=$(count_pattern "$FILE" "\*\*When\*\*|When ")
THEN_COUNT=$(count_pattern "$FILE" "\*\*Then\*\*|Then ")

if [[ "$GIVEN_COUNT" -ge 1 && "$WHEN_COUNT" -ge 1 && "$THEN_COUNT" -ge 1 ]]; then
  pass "Given/When/Then format used ($GIVEN_COUNT/$WHEN_COUNT/$THEN_COUNT)"
else
  error "Missing Given/When/Then acceptance scenarios (TDD requirement)"
fi

# Check for acceptance scenarios heading
if grep -qE "\*\*Acceptance Scenarios\*\*:|^#### Acceptance" "$FILE" 2>/dev/null; then
  pass "Acceptance Scenarios documented"
else
  warning "No explicit 'Acceptance Scenarios' heading found"
fi

# Check functional requirements
info "Checking functional requirements..."

FR_COUNT=$(count_pattern "$FILE" "\*\*FR-[0-9]+\*\*:|FR-[0-9]+:")
if [[ "$FR_COUNT" -ge 3 ]]; then
  pass "Found $FR_COUNT functional requirement(s)"
else
  error "Insufficient functional requirements (expected at least 3 FR-XXX items)"
fi

# Check for MUST requirements
MUST_COUNT=$(count_pattern "$FILE" "System MUST|MUST")
if [[ "$MUST_COUNT" -ge 1 ]]; then
  pass "Found $MUST_COUNT MUST requirement(s)"
else
  warning "No MUST requirements found (FRs should use 'System MUST...')"
fi

# Check test strategy content
info "Checking test strategy quality..."

# Unit tests
if grep -qiE "^### Unit Test|unit test" "$FILE" 2>/dev/null; then
  pass "Unit test approach documented"
else
  warning "No unit test approach documented"
fi

# Integration tests
if grep -qiE "^### Integration Test|integration test" "$FILE" 2>/dev/null; then
  pass "Integration test approach documented"
else
  warning "No integration test approach documented"
fi

# Edge cases
if grep -qiE "^### Edge Case|edge case" "$FILE" 2>/dev/null; then
  pass "Edge case tests documented"
else
  warning "No edge case tests documented"
fi

# Check success criteria
info "Checking success criteria quality..."

SC_COUNT=$(count_pattern "$FILE" "\*\*SC-[0-9]+\*\*:|SC-[0-9]+:")
if [[ "$SC_COUNT" -ge 2 ]]; then
  pass "Found $SC_COUNT success criteria"
else
  warning "Few success criteria found (recommended at least 2 SC-XXX items)"
fi

# Check for measurable metrics
if grep -qiE "[0-9]+%|[0-9]+ seconds|[0-9]+ minutes|[0-9]+ users" "$FILE" 2>/dev/null; then
  pass "Measurable metrics found in criteria"
else
  warning "No measurable metrics found (success criteria should be quantifiable)"
fi

# Check for optional sections
info "Checking optional sections..."

check_section_warn "$FILE" "^### Edge Cases|^## Edge Cases" "Edge Cases section"
check_section_warn "$FILE" "^### Key Entities|^## Key Entities|^## Data Model" "Key Entities/Data Model section"
check_section_warn "$FILE" "^### Test Data|test data" "Test Data Requirements"

# Check for placeholders
info "Checking for unfilled placeholders..."
check_no_placeholders "$FILE"

# Check for common issues
info "Checking for common issues..."

# Check for [NEEDS CLARIFICATION] tags
CLARIFICATION_COUNT=$(count_pattern "$FILE" "\[NEEDS CLARIFICATION")
if [[ "$CLARIFICATION_COUNT" -gt 0 ]]; then
  warning "Found $CLARIFICATION_COUNT unresolved [NEEDS CLARIFICATION] tag(s)"
fi

# Print summary
print_summary "spec.md"
exit $?
