#!/usr/bin/env bash
# validate-prompt.sh - Validate prompt.md structure
# Usage: validate-prompt.sh <path-to-prompt.md>
#
# Required structure:
# - Title: # Relentless Agent Instructions or similar
# - Quality Gates section with bash commands
# - TDD Workflow section
# - Progress Report Format section

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

FILE="${1:-}"

if [[ -z "$FILE" ]]; then
  echo "Usage: validate-prompt.sh <path-to-prompt.md>"
  exit 1
fi

if ! check_file "$FILE"; then
  exit 1
fi

header "Validating Prompt: $FILE"

# Check for title
info "Checking document structure..."

if grep -qE "^# .*Agent.*Instructions|^# .*Prompt|^# Relentless" "$FILE" 2>/dev/null; then
  TITLE=$(grep -oE "^# .*" "$FILE" | head -1)
  pass "Title found: $TITLE"
else
  error "Missing prompt title (expected: # Relentless Agent Instructions or similar)"
fi

# Check for Quality Gates section
info "Checking required sections..."

if grep -qE "^##+ .*Quality Gates|^##+ Quality Commands" "$FILE" 2>/dev/null; then
  pass "Quality Gates section found"
else
  error "Missing Quality Gates section (expected: ## Quality Gates)"
fi

# Check for actual quality commands (bash code blocks)
BASH_BLOCKS=$(count_pattern "$FILE" '```bash')
if [[ "$BASH_BLOCKS" -ge 1 ]]; then
  pass "Found $BASH_BLOCKS bash code block(s) with quality commands"
else
  warning "No bash code blocks found (expected quality commands in bash blocks)"
fi

# Check for TDD Workflow section
if grep -qE "^##+ TDD|^##+ Test.Driven" "$FILE" 2>/dev/null; then
  pass "TDD Workflow section found"
else
  error "Missing TDD Workflow section (expected: ## TDD Workflow)"
fi

# Check for Progress Report section
if grep -qE "^##+ Progress|progress.txt" "$FILE" 2>/dev/null; then
  pass "Progress Report section found"
else
  warning "Missing Progress Report section"
fi

# Check for One Story rule
if grep -qE "ONE Story|one story|single story" "$FILE" 2>/dev/null; then
  pass "One Story Per Iteration rule found"
else
  warning "Missing One Story Per Iteration guidance"
fi

# Check for Stop Condition / completion signal
if grep -qE "Stop Condition|COMPLETE|promise" "$FILE" 2>/dev/null; then
  pass "Stop condition / completion signal documented"
else
  warning "Missing stop condition or completion signal documentation"
fi

# Check for version metadata
info "Checking metadata..."

if grep -qE "Template Version|Version:|Generated:" "$FILE" 2>/dev/null; then
  VERSION=$(grep -oE "[0-9]+\.[0-9]+\.[0-9]+" "$FILE" | head -1 || echo "unknown")
  pass "Version/metadata found: $VERSION"
else
  warning "No version metadata found"
fi

# Check for placeholders
info "Checking for unfilled placeholders..."
check_no_placeholders "$FILE"

# Check for common quality commands
info "Checking quality command patterns..."

TYPECHECK_FOUND=$(grep -c "typecheck\|tsc" "$FILE" 2>/dev/null) || true
LINT_FOUND=$(grep -c "lint\|eslint\|biome" "$FILE" 2>/dev/null) || true
TEST_FOUND=$(grep -c "test\|vitest\|jest\|bun test" "$FILE" 2>/dev/null) || true

if [[ "$TYPECHECK_FOUND" -ge 1 ]]; then
  pass "Typecheck command reference found"
else
  warning "No typecheck command mentioned"
fi

if [[ "$LINT_FOUND" -ge 1 ]]; then
  pass "Lint command reference found"
else
  warning "No lint command mentioned"
fi

if [[ "$TEST_FOUND" -ge 1 ]]; then
  pass "Test command reference found"
else
  warning "No test command mentioned"
fi

# Print summary
print_summary "prompt.md"
exit $?
