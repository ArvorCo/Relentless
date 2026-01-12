---
name: analyze
description: "Analyze consistency across spec, plan, tasks, and checklist. Use before implementation. Triggers on: analyze consistency, check artifacts, validate feature."
---

# Cross-Artifact Consistency Analyzer

Validate consistency across feature artifacts before implementation.

---

## The Job

1. Read all feature artifacts
2. Check for consistency issues
3. Validate against constitution
4. Report findings

---

## Files to Analyze

Required:
- `relentless/constitution.md`
- `relentless/features/NNN-feature/spec.md`
- `relentless/features/NNN-feature/plan.md`
- `relentless/features/NNN-feature/tasks.md`
- `relentless/features/NNN-feature/checklist.md`

Optional:
- `relentless/features/NNN-feature/prd.json`
- `relentless/features/NNN-feature/progress.txt`

---

## Validation Checks

### 1. Completeness
- [ ] All functional requirements from spec have tasks
- [ ] All tasks reference spec requirements
- [ ] Plan addresses all spec requirements
- [ ] Checklist covers all tasks

### 2. Constitution Compliance
- [ ] Plan follows MUST rules
- [ ] Tasks include required quality checks
- [ ] Testing requirements met
- [ ] Security requirements addressed

### 3. Dependency Consistency
- [ ] Task dependencies are valid (no circular refs)
- [ ] Referenced dependencies exist
- [ ] Dependency order makes sense

### 4. Scope Consistency
- [ ] Plan doesn't include out-of-scope items
- [ ] Tasks match plan scope
- [ ] No scope creep in checklist

### 5. Data Model Consistency
- [ ] Entities mentioned in spec are in plan
- [ ] Plan data models match spec requirements
- [ ] Tasks create required entities

### 6. API Consistency
- [ ] Endpoints in plan match spec scenarios
- [ ] Tasks implement all planned endpoints
- [ ] Checklist validates all endpoints

### 7. Testing Coverage
- [ ] Each task has test acceptance criteria
- [ ] Checklist includes test validation
- [ ] Test types match constitution requirements

---

## Issue Severity

**CRITICAL:** Blocks implementation
- Constitution MUST rule violations
- Circular dependencies
- Missing required artifacts

**WARNING:** Should fix before implementation
- Incomplete coverage of requirements
- Ambiguous acceptance criteria
- Missing test criteria

**INFO:** Nice to have
- Style inconsistencies
- Minor gaps in checklist
- Optimization opportunities

---

## Report Format

```markdown
# Consistency Analysis: Feature Name

**Date:** 2026-01-11
**Status:** PASS / ISSUES FOUND

## Summary
- Stories: N/M completed
- Issues: X total (Y critical, Z warnings, W info)

## Critical Issues

### CRIT-001: Circular Dependency
**Location:** tasks.md
**Details:** US-002 depends on US-003, US-003 depends on US-002
**Fix:** Remove circular dependency, reorder tasks

## Warnings

### WARN-001: Missing Test Coverage
**Location:** tasks.md, US-004
**Details:** No integration test in acceptance criteria
**Fix:** Add integration test requirement

## Info

### INFO-001: Checklist Gap
**Location:** checklist.md
**Details:** No performance validation for US-005
**Suggestion:** Add performance checklist item

## Recommendations

1. Fix all CRITICAL issues before proceeding
2. Address WARNINGS for better quality
3. Consider INFO items for completeness

**Next Steps:**
- If CRITICAL issues: Fix and re-run analysis
- If only WARNINGS: Proceed with caution
- If PASS: Ready for `/relentless.implement`
```

---

## Notes

- Run before starting implementation
- Constitution compliance is non-negotiable
- Fix critical issues immediately
- Warnings can sometimes be deferred
- Re-run after making fixes
