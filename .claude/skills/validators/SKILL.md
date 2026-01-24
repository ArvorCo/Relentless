# Validators Skill

## Purpose

Validate Relentless documents (spec.md, plan.md, tasks.md, checklist.md, constitution.md) to ensure they follow required structure and contain all mandatory sections.

## When to Use

Run validation **after generating any document** to catch structural issues early:

1. After `/relentless.specify` → validate spec.md
2. After `/relentless.plan` → validate plan.md
3. After `/relentless.tasks` → validate tasks.md
4. After `/relentless.checklist` → validate checklist.md
5. After `/relentless.constitution` → validate constitution.md

## Usage

### Validate Single Document

```bash
# Auto-detect type from filename
.claude/skills/validators/scripts/validate.sh path/to/spec.md

# Force specific type
.claude/skills/validators/scripts/validate.sh --type=spec path/to/document.md
```

### Validate All Documents in Feature

```bash
.claude/skills/validators/scripts/validate.sh relentless/features/001-feature-name
```

### Individual Validators

```bash
# Validate spec
.claude/skills/validators/scripts/validate-spec.sh path/to/spec.md

# Validate plan
.claude/skills/validators/scripts/validate-plan.sh path/to/plan.md

# Validate tasks
.claude/skills/validators/scripts/validate-tasks.sh path/to/tasks.md

# Validate checklist
.claude/skills/validators/scripts/validate-checklist.sh path/to/checklist.md

# Validate constitution
.claude/skills/validators/scripts/validate-constitution.sh path/to/constitution.md
```

## Validation Rules

### spec.md

| Rule | Type | Description |
|------|------|-------------|
| Title | ERROR | Must have `# Feature Specification: [Name]` |
| User Scenarios | ERROR | Must have `## User Scenarios & Testing` |
| User Stories | ERROR | Must have `### User Story N` sections |
| Priorities | ERROR | Must have `Priority: P1`, `P2`, etc. |
| Given/When/Then | ERROR | Must have TDD acceptance format |
| Requirements | ERROR | Must have `## Requirements` section |
| FR-XXX | ERROR | Must have functional requirements with FR-XXX format |
| Test Strategy | ERROR | Must have `## Test Strategy` section |
| Success Criteria | ERROR | Must have `## Success Criteria` section |

### plan.md

| Rule | Type | Description |
|------|------|-------------|
| Title | ERROR | Must have `# Technical Plan: [Name]` |
| Technical Context | ERROR | Must have `## Technical Context` |
| Constitution Compliance | ERROR | Must have `## Constitution Compliance` |
| Implementation | ERROR | Must have `## Implementation` or `## Architecture` |
| Test Specifications | ERROR | Must have `## Test` section |
| Quality Gates | ERROR | Must have `## Quality Gates` |

### tasks.md

| Rule | Type | Description |
|------|------|-------------|
| Title | ERROR | Must have `# Implementation Tasks: [Name]` |
| Phases | ERROR | Must have `## Phase N` sections |
| US Tags | ERROR | Must have `[US-XXX]` tags |
| US Headings | ERROR | Must have `### [US-XXX] Title` format |
| Task Checkboxes | ERROR | Must have `- [ ]` task items |
| Complexity | WARN | Should have `**Complexity**: simple/medium/complex/expert` |
| PRD Format | ERROR | Must be convertible to prd.json |

### checklist.md

| Rule | Type | Description |
|------|------|-------------|
| Title | ERROR | Must have `# [Type] Checklist: [Name]` |
| Quality Gates | ERROR | Must have `## 0. Quality Gates` (typecheck, lint, test) |
| TDD Compliance | ERROR | Must have `## 1. TDD Compliance` |
| Routing Compliance | ERROR | Must have `## 2. Routing Compliance` |
| CHK Items | ERROR | Must have at least 5 `CHK-XXX` items |
| Checkboxes | ERROR | Must have `- [ ]` or `- [x]` checkboxes |

### constitution.md

| Rule | Type | Description |
|------|------|-------------|
| Title + Version | ERROR | Must have `# Constitution vX.Y.Z` |
| Principles | ERROR | Must have `## Principle N` sections |
| MUST Rules | ERROR | Each principle must have `### MUST` section with rules |
| SHOULD Rules | ERROR | Each principle must have `### SHOULD` section with rules |

## Exit Codes

- `0` - All validations passed
- `1` - Validation errors found (document is incomplete)
- `2` - Usage error (bad arguments)

## Output Format

```
━━━ Validating Spec: path/to/spec.md ━━━
ℹ Checking document structure...
✓ Title found: Feature Name
✓ Feature branch documented
...
✗ ERROR: Missing Given/When/Then acceptance scenarios
⚠ WARNING: No edge cases documented
...

━━━ Validation Summary for spec.md ━━━
  Passed:   12
  Warnings: 2
  Errors:   1

VALIDATION FAILED: 1 error(s) found
```

## Integration with Skills

Skills should run validation after generating documents:

```bash
# In skill workflow after creating spec.md
echo "Validating generated spec..."
if ! .claude/skills/validators/scripts/validate-spec.sh "$FEATURE_PATH/spec.md"; then
  echo "Validation failed - please fix errors before proceeding"
  exit 1
fi
```

## Troubleshooting

### "VALIDATION FAILED" after document generation

1. Review the specific ERROR messages
2. Edit the document to add missing sections
3. Re-run validation
4. Repeat until all errors are fixed

### False Positives

Some warnings may not apply to your specific document. Warnings don't fail validation - they're recommendations.

### Adding Custom Validators

Create a new script in `.claude/skills/validators/scripts/` following the pattern:

```bash
#!/usr/bin/env bash
source "$SCRIPT_DIR/common.sh"
# ... your validation logic using check_section, check_min_count, etc.
print_summary "your-doc-type"
```
