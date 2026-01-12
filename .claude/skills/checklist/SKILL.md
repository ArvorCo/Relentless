---
name: checklist
description: "Generate quality validation checklist from spec, plan, and tasks. Use after creating tasks. Triggers on: create checklist, quality checklist, validation checklist."
---

# Quality Validation Checklist Generator

Generate domain-specific quality checklists to validate implementation completeness.

---

## The Job

1. Read spec.md, plan.md, and tasks.md
2. Extract quality requirements from constitution
3. Generate comprehensive checklist
4. Save to `checklist.md`

**Important:** Checklist items get merged into prd.json acceptance criteria!

---

## Step 1: Locate Feature Files

Verify these files exist:
- `relentless/features/NNN-feature/spec.md`
- `relentless/features/NNN-feature/plan.md`
- `relentless/features/NNN-feature/tasks.md`

---

## Step 2: Load Context

Read:
1. `relentless/constitution.md` - Quality standards and requirements
2. Feature files (spec, plan, tasks)
3. Identify the feature domain (auth, payments, dashboard, etc.)

---

## Step 3: Generate Checklist Categories

Create 5-7 categories based on feature domain:

**Common Categories:**
- Schema & Database
- Backend Logic
- Frontend Components (if applicable)
- API Integration
- Testing & Validation
- Security & Permissions
- Performance & UX
- Documentation

---

## Step 4: Generate Checklist Items

For each category, create 5-10 specific validation items:

**Format:**
```markdown
- [ ] CHK-001 [US-001] Specific, testable requirement
- [ ] CHK-002 [Gap] Missing specification identified
- [ ] CHK-003 [Ambiguity] Unclear requirement needs clarification
- [ ] CHK-004 [Edge Case] Potential edge case to handle
```

**Guidelines:**
- 80% of items should reference specific user stories `[US-XXX]`
- 20% should identify gaps, ambiguities, or edge cases
- Each item must be specific and testable
- Total: 20-40 items across all categories

---

## Step 5: Reference Constitution

Ensure checklist includes items for constitution MUST rules:
- Type safety requirements
- Testing coverage
- Security standards
- Performance expectations
- Code quality standards

---

## Step 6: Save & Report

1. Save to `relentless/features/NNN-feature/checklist.md`
2. Report:
   - Total checklist items: N
   - Items per category
   - Constitution compliance items: N
   - Gaps identified: N
   - Next step: `relentless convert tasks.md`

---

## Example Checklist

```markdown
# Quality Checklist: User Authentication

**Purpose:** Validate completeness of user authentication implementation
**Created:** 2026-01-11
**Feature:** [spec.md](./spec.md)

## Schema & Database

- [ ] CHK-001 [US-001] User table has all required fields (id, email, password_hash, confirmed, timestamps)
- [ ] CHK-002 [US-001] Email field has UNIQUE constraint
- [ ] CHK-003 [US-001] Indexes created on frequently queried fields (email)
- [ ] CHK-004 [Gap] Consider adding last_login_at timestamp for analytics
- [ ] CHK-005 [US-001] Migration script tested on clean database

## Backend Logic

- [ ] CHK-006 [US-001] Password hashing uses bcrypt with appropriate cost factor
- [ ] CHK-007 [US-001] Email validation prevents common typos and invalid formats
- [ ] CHK-008 [US-002] JWT tokens include user ID and expiration
- [ ] CHK-009 [US-002] Token verification handles expired tokens gracefully
- [ ] CHK-010 [Ambiguity] Password reset flow not specified - out of scope?

## API Integration

- [ ] CHK-011 [US-001] POST /api/auth/register returns 201 on success
- [ ] CHK-012 [US-001] Register endpoint returns 400 for invalid email
- [ ] CHK-013 [US-001] Register endpoint returns 409 for duplicate email
- [ ] CHK-014 [US-002] POST /api/auth/login returns 401 for wrong password
- [ ] CHK-015 [US-002] Login endpoint returns 403 for unconfirmed account
- [ ] CHK-016 [Edge Case] Rate limiting on auth endpoints to prevent brute force

## Testing & Validation

- [ ] CHK-017 [US-001] Unit tests for password hashing utility
- [ ] CHK-018 [US-001] Unit tests for email validation
- [ ] CHK-019 [US-002] Integration test for full registration flow
- [ ] CHK-020 [US-002] Integration test for login flow
- [ ] CHK-021 [US-003] E2E test for email confirmation
- [ ] CHK-022 [Constitution] Test coverage meets minimum 80% requirement

## Security & Permissions

- [ ] CHK-023 [US-001] Passwords never logged or exposed in errors
- [ ] CHK-024 [US-001] Password requirements enforced (min length, complexity)
- [ ] CHK-025 [US-002] JWT secret stored in environment variable, not code
- [ ] CHK-026 [US-002] Token expiration validated on every request
- [ ] CHK-027 [Gap] Consider adding account lockout after N failed attempts

## Performance & UX

- [ ] CHK-028 [US-001] Registration completes within 2 seconds
- [ ] CHK-029 [US-002] Login completes within 1 second
- [ ] CHK-030 [US-003] Confirmation email sent within 30 seconds
- [ ] CHK-031 [Edge Case] Graceful handling when email service is down

## Documentation

- [ ] CHK-032 API endpoints documented with examples
- [ ] CHK-033 Environment variables documented in README
- [ ] CHK-034 Database schema documented
```

---

## Notes

- Checklist items will be merged into acceptance criteria during convert
- Reference user stories with `[US-XXX]` tags
- Identify gaps and ambiguities with `[Gap]` and `[Ambiguity]` tags
- Each item must be independently verifiable
- Balance between comprehensiveness and practicality
