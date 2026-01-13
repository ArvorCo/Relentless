---
name: implement
description: "Execute implementation workflow phase by phase. Use after analysis passes. Triggers on: start implementation, implement feature, begin coding."
---

# Implementation Workflow Executor

Guide systematic implementation of features using TDD and quality-first approach.

---

## The Job

Implement user stories one at a time, following strict TDD and updating all tracking files.

---

## Before You Start

1. **Read the Constitution** - Review `relentless/constitution.md` for project principles
2. **Read prompt.md** - Review `relentless/prompt.md` for workflow guidelines
3. **Read progress.txt** - Check learnings from previous iterations
4. **Review artifacts** - Ensure spec.md, plan.md, tasks.md, checklist.md exist
5. **Run `/relentless.analyze`** - Must pass with no CRITICAL issues

---

## CRITICAL: Quality Gates (Non-Negotiable)

Before marking ANY story as complete, ALL checks must pass:

```bash
# TypeScript strict mode check
bun run typecheck

# ESLint with zero warnings policy
bun run lint

# All tests must pass
bun test
```

**If ANY check fails, DO NOT mark the story as complete. Fix the issues first.**

---

## TDD Workflow (MANDATORY)

For EVERY story, follow strict Test-Driven Development:

### Step 1: Write Failing Tests First (RED)
```bash
# Create test file if needed
# Write tests that define expected behavior
bun test  # Tests MUST fail initially
```

### Step 2: Implement Minimum Code (GREEN)
```bash
# Write only enough code to pass tests
bun test  # Tests MUST pass
```

### Step 3: Refactor
```bash
# Clean up while keeping tests green
bun test  # Tests MUST still pass
```

**Do NOT skip TDD. Tests are contracts that validate your implementation.**

---

## Per-Story Implementation Flow

For each story (in dependency order):

### 1. Identify the Story
- Read `prd.json` to find the next story where `passes: false`
- Check dependencies are met (dependent stories have `passes: true`)
- Read the story's acceptance criteria

### 2. Find Relevant Checklist Items
- Open `checklist.md`
- Find items tagged with `[US-XXX]` for this story
- Note constitution compliance items `[Constitution]`

### 3. Implement with TDD
Follow the TDD workflow above for each acceptance criterion.

### 4. Update tasks.md
As you complete each criterion:
```markdown
# Change from:
- [ ] Criterion text

# To:
- [x] Criterion text
```

### 5. Update checklist.md
For each verified checklist item:
```markdown
# Change from:
- [ ] CHK-XXX [US-001] Description

# To:
- [x] CHK-XXX [US-001] Description
```

### 6. Run Quality Checks
```bash
bun run typecheck  # 0 errors required
bun run lint       # 0 warnings required
bun test           # All tests must pass
```

### 7. Commit Changes
```bash
git add -A
git commit -m "feat: US-XXX - Story Title"
```

### 8. Update prd.json
Set the story's `passes` field to `true`:
```json
{
  "id": "US-001",
  "title": "...",
  "passes": true,  // <- Change from false to true
  ...
}
```

### 9. Update progress.txt
Append progress entry:
```markdown
## [Date] - US-XXX: Story Title

**Implemented:**
- What was built
- Key decisions made

**Files Changed:**
- path/to/file.ts (new/modified)

**Tests Added:**
- path/to/file.test.ts

**Learnings:**
- Patterns discovered
- Gotchas encountered

**Constitution Compliance:**
- Principle N: How it was followed

---
```

---

## Example Per-Story Workflow

```markdown
**Current:** US-001: Test Infrastructure Setup

**Acceptance Criteria:**
- [ ] `bun test` command runs successfully
- [ ] Test files with pattern `*.test.ts` are auto-discovered
- [ ] `bun test --coverage` shows coverage report
- [ ] Typecheck passes
- [ ] Lint passes

**Relevant Checklist Items:**
- [ ] CHK-001 [US-001] `bun test` command executes successfully
- [ ] CHK-002 [US-001] Test files with `*.test.ts` pattern are auto-discovered
- [ ] CHK-007 [Constitution] Tests written BEFORE implementation

**Implementation Steps:**
1. Write a simple failing test first
2. Configure bun test runner
3. Verify test discovery works
4. Run `bun run typecheck` - must pass
5. Run `bun run lint` - must pass with 0 warnings
6. Update tasks.md - check off completed criteria
7. Update checklist.md - mark verified items
8. Commit: "feat: US-001 - Test Infrastructure Setup"
9. Update prd.json: set passes: true
10. Update progress.txt with learnings
```

---

## File Update Summary

After completing each story, these files MUST be updated:

| File | Update |
|------|--------|
| `tasks.md` | Check off `- [x]` completed acceptance criteria |
| `checklist.md` | Check off `- [x]` verified checklist items |
| `prd.json` | Set `"passes": true` for the story |
| `progress.txt` | Append progress entry with learnings |

---

## Implementation Phases

### Phase 0: Setup
- Infrastructure, tooling, configuration
- Usually US-001 type stories

### Phase 1: Foundation
- Data models, types, schemas
- Base utilities and helpers
- Core infrastructure

### Phase 2: User Stories
- Feature implementation
- Follow dependency order strictly

### Phase 3: Polish
- E2E tests
- Documentation
- Performance optimization

---

## Notes

- Work on ONE story at a time
- Follow dependency order strictly
- Never skip TDD - tests come FIRST
- Never skip quality checks
- Commit after each story
- Update ALL tracking files
- This is a guided workflow for manual implementation

---

*Reference: See `relentless/prompt.md` for additional guidelines*
*Reference: See `relentless/constitution.md` for project principles*
