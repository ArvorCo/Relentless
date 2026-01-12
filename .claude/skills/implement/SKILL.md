---
name: implement
description: "Execute implementation workflow phase by phase. Use after analysis passes. Triggers on: start implementation, implement feature, begin coding."
---

# Implementation Workflow Executor

Guide systematic implementation of features using the task breakdown.

---

## The Job

Guide user through implementing tasks in correct order following dependencies.

---

## Prerequisites

Before starting:
- `/relentless.analyze` must pass (no CRITICAL issues)
- All artifacts exist (spec, plan, tasks, checklist)
- Constitution reviewed

---

## Implementation Flow

### Phase 0: Setup
1. Review `tasks.md` for setup tasks
2. Install dependencies
3. Create directory structure
4. Initialize configuration

### Phase 1: Foundation
1. Implement data models
2. Create base utilities
3. Set up infrastructure
4. Tests for foundation

### Phase 2: User Stories
For each story in dependency order:
1. Read story acceptance criteria
2. Implement functionality
3. Write tests
4. Run quality checks (typecheck, lint)
5. Verify against checklist
6. Commit changes
7. Mark story complete in prd.json

### Phase 3: Polish
1. Performance optimization
2. Error handling improvements
3. Documentation
4. Final quality checks

---

## Per-Story Workflow

```markdown
**Current:** US-001: Create User Registration Endpoint

**Acceptance Criteria:**
- [ ] POST /api/auth/register endpoint exists
- [ ] Email validation works
- [ ] Password requirements enforced
- [ ] Password hashed before storage
- [ ] Confirmation email sent
- [ ] Returns 201 with user ID
- [ ] Returns 400 for invalid input
- [ ] Typecheck passes
- [ ] Tests pass

**Checklist Items:**
- CHK-001: User table created
- CHK-006: Password hashing uses bcrypt
- CHK-011: Returns correct status codes

**Steps:**
1. Create endpoint handler
2. Implement validation
3. Add password hashing
4. Integrate email service
5. Write unit tests
6. Write integration tests
7. Run typecheck
8. Run tests
9. Verify checklist items
10. Commit with message: "feat: US-001 - Create User Registration Endpoint"
```

---

## Quality Gates

Before marking story complete:
- [ ] All acceptance criteria checked
- [ ] Typecheck passes
- [ ] Linter passes
- [ ] Tests pass
- [ ] Relevant checklist items verified
- [ ] Code committed

---

## Progress Tracking

Update `progress.txt` after each story:

```markdown
## 2026-01-11 - US-001
- Implemented user registration endpoint
- Added email validation and password hashing
- Email service integration working
- All tests passing

**Learnings:**
- Bcrypt cost factor 12 provides good balance
- Email validation regex from validator.js works well
- Nodemailer setup straightforward

**Files Changed:**
- src/api/auth/register.ts (new)
- src/services/user.service.ts (new)
- src/utils/password.ts (new)
- tests/auth/register.test.ts (new)

---
```

---

## Notes

- Work on ONE story at a time
- Follow dependency order
- Don't skip quality checks
- Commit frequently
- Update progress after each story
- This is a guided workflow, not automated
