#!/usr/bin/env bash
# validate-constitution.sh - Validate constitution.md structure
# Usage: validate-constitution.sh <path-to-constitution.md>
#
# Required structure:
# - Title: # ... Constitution or # Project Constitution
# - Version metadata: **Version:** X.Y.Z
# - At least one Principle section
# - Each principle must have MUST rules
# - Each principle must have SHOULD rules

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

FILE="${1:-}"

if [[ -z "$FILE" ]]; then
  echo "Usage: validate-constitution.sh <path-to-constitution.md>"
  exit 1
fi

if ! check_file "$FILE"; then
  exit 1
fi

header "Validating Constitution: $FILE"

# Check for title
info "Checking document structure..."

if grep -qE "^# .*Constitution" "$FILE" 2>/dev/null; then
  TITLE=$(grep -oE "^# .*Constitution.*" "$FILE" | head -1)
  pass "Title found: $TITLE"
else
  error "Missing constitution title (expected: # ... Constitution)"
fi

# Check for version metadata (either in title or as **Version:** X.Y.Z)
if grep -qE "v[0-9]+\.[0-9]+\.[0-9]+|\*\*Version:?\*\*:?\s*[0-9]+\.[0-9]+\.[0-9]+" "$FILE" 2>/dev/null; then
  VERSION=$(grep -oE "[0-9]+\.[0-9]+\.[0-9]+" "$FILE" | head -1)
  pass "Version found: $VERSION"
else
  error "Missing version (expected: **Version:** X.Y.Z or vX.Y.Z in title)"
fi

# Check for at least one Principle section (supports both ## Principle N and ### Principle N:)
PRINCIPLE_COUNT=$(count_pattern "$FILE" "^##+ Principle [0-9]+")
if [[ "$PRINCIPLE_COUNT" -ge 1 ]]; then
  pass "Found $PRINCIPLE_COUNT Principle section(s)"
else
  error "No Principle sections found (expected: ## Principle 1 or ### Principle 1:)"
fi

# Check for MUST rules (supports both ### MUST and **MUST:**)
info "Checking rule structure..."

MUST_COUNT=$(count_pattern "$FILE" "^### MUST|\*\*MUST:?\*\*:?")
if [[ "$MUST_COUNT" -ge 1 ]]; then
  pass "Found $MUST_COUNT MUST section(s)"
else
  error "No MUST sections found (expected: ### MUST or **MUST:**)"
fi

# Check for actual MUST rule content (lines starting with -)
MUST_RULE_COUNT=$(count_pattern "$FILE" "^- .*MUST")
if [[ "$MUST_RULE_COUNT" -ge 1 ]]; then
  pass "Found $MUST_RULE_COUNT MUST rule item(s)"
else
  warning "No explicit MUST rule items found (expected: - ... MUST ...)"
fi

# Check for SHOULD rules (supports both ### SHOULD and **SHOULD:**)
SHOULD_COUNT=$(count_pattern "$FILE" "^### SHOULD|\*\*SHOULD:?\*\*:?")
if [[ "$SHOULD_COUNT" -ge 1 ]]; then
  pass "Found $SHOULD_COUNT SHOULD section(s)"
else
  error "No SHOULD sections found (expected: ### SHOULD or **SHOULD:**)"
fi

# Check for actual SHOULD rule content
SHOULD_RULE_COUNT=$(count_pattern "$FILE" "^- .*SHOULD|^- .*should")
if [[ "$SHOULD_RULE_COUNT" -ge 1 ]]; then
  pass "Found $SHOULD_RULE_COUNT SHOULD rule item(s)"
else
  warning "No explicit SHOULD rule items in list format"
fi

# Check for optional but recommended sections
info "Checking optional sections..."

check_section_warn "$FILE" "^## Governance|^### Amendment" "Governance/Amendment section"
check_section_warn "$FILE" "Version History|^### Version" "Version History section"
check_section_warn "$FILE" "^## Preamble|^## Overview" "Preamble/Overview section"

# Check for Rationale explanations
RATIONALE_COUNT=$(count_pattern "$FILE" "\*\*Rationale:?\*\*:|Rationale:")
if [[ "$RATIONALE_COUNT" -ge 1 ]]; then
  pass "Found $RATIONALE_COUNT rationale explanation(s)"
else
  warning "No rationale explanations found (recommended for each principle)"
fi

# Check for placeholders
info "Checking for unfilled placeholders..."
check_no_placeholders "$FILE"

# Print summary
print_summary "constitution.md"
exit $?
