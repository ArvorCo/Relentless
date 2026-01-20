# Consistency Analysis Report

**Feature:** [feature-name]
**Date:** [date]
**Status:** [PASS | FAIL | WARNINGS]

---

## Summary

| Category | Status | Issues |
|----------|--------|--------|
| Completeness | ✅/❌ | [count] |
| TDD Compliance | ✅/❌ | [count] |
| Routing Validation | ✅/❌ | [count] |
| Quality Gates | ✅/❌ | [count] |
| Constitution | ✅/❌ | [count] |
| Dependencies | ✅/❌ | [count] |

---

## TDD Compliance

- [ ] Every story has test acceptance criteria
- [ ] Test specifications in plan.md
- [ ] Checklist includes test items
- [ ] Given/When/Then format used

**Issues Found:**
- [List any TDD gaps]

---

## Routing Validation

- [ ] Routing preference in spec.md
- [ ] Routing carried to plan.md
- [ ] prd.json has routing metadata for all stories
- [ ] Complexity classifications reasonable

**Stories with routing metadata:**
| Story ID | Complexity | Harness | Model | Mode | Cost |
|----------|------------|---------|-------|------|------|
| US-001 | [value] | [value] | [value] | [value] | [value] |

**Issues Found:**
- [List any routing gaps]

---

## Quality Gates

- [ ] Typecheck in acceptance criteria (0 errors)
- [ ] Lint in acceptance criteria (0 errors, 0 warnings)
- [ ] Test in acceptance criteria

**Issues Found:**
- [List any quality gate gaps]

---

## Critical Issues

### CRIT-001: [Issue Title]
**Location:** [file:line]
**Details:** [description of the issue]
**Impact:** [what breaks if not fixed]
**Fix:** [required action]

### CRIT-002: [Issue Title]
**Location:** [file:line]
**Details:** [description]
**Impact:** [what breaks]
**Fix:** [required action]

---

## Warnings

### WARN-001: [Issue Title]
**Location:** [file:line]
**Details:** [description]
**Suggestion:** [recommended fix]

### WARN-002: [Issue Title]
**Location:** [file:line]
**Details:** [description]
**Suggestion:** [recommended fix]

---

## Info

### INFO-001: [Issue Title]
**Location:** [file:line]
**Details:** [description]
**Suggestion:** [optional improvement]

---

## Completeness Matrix

| Spec Requirement | Plan Section | Task(s) | Checklist Item |
|------------------|--------------|---------|----------------|
| REQ-001: [name] | [section] | US-XXX | CHK-XXX |
| REQ-002: [name] | [section] | US-XXX | CHK-XXX |

---

## Recommendations

1. [Action item 1 - priority]
2. [Action item 2 - priority]
3. [Action item 3 - priority]

---

## Next Steps

**If PASS:**
- Ready for `/relentless.implement`
- All critical checks passed
- TDD, routing, and quality gates validated

**If FAIL:**
1. Fix all CRITICAL issues
2. Re-run `/relentless.analyze`
3. Proceed to implement only after PASS

**If WARNINGS:**
- Can proceed with caution
- Address warnings during implementation
- Document any deferred items

---

**Analysis completed by:** /relentless.analyze
**Timestamp:** [datetime]
