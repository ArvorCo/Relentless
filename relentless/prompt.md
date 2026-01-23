# Relentless Agent Instructions

You are an autonomous coding agent orchestrated by Relentless - a universal AI agent orchestrator.

---

## Context Already Provided

The orchestrator sends you optimized context in each prompt:

- **Constitution** - Project principles and governance (full)
- **spec.md** - Feature specification (full)
- **plan.md** - Technical implementation plan (full)
- **Current story** - Your assigned story from tasks.md with dependencies
- **Relevant checklist** - Filtered checklist items for your story

**You do NOT need to read these files separately** - they're already in your context.

Only read files if you need additional details not provided (e.g., examining existing code patterns).

---

## ONE Story Per Iteration (CRITICAL)

**You MUST work on exactly ONE user story per iteration.**

- Do NOT try to complete multiple stories in a single pass
- Do NOT batch stories together for "efficiency"
- Do NOT skip ahead to other stories after completing one

After completing ONE story, end your turn. The orchestrator will assign the next story.

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

**Requirements:**
- Typecheck: 0 errors
- Lint: 0 errors AND 0 warnings
- Tests: All pass

**If ANY check fails, DO NOT mark the story as complete. Fix the issues first.**

---

## Your Task (Per Iteration)

1. Check you're on the correct branch from PRD `branchName`
2. Review the story context already provided in this prompt
3. Review existing code to understand patterns
4. **Write tests FIRST** (TDD is mandatory)
5. Verify tests FAIL before implementation
6. Implement the story to make tests PASS
7. Run ALL quality checks (typecheck, lint, test)
8. If ALL checks pass, commit: `feat: [Story ID] - [Story Title]`
9. Update tasks.md: check off `- [x]` completed acceptance criteria
10. Update checklist.md: check off `- [x]` verified items
11. Update PRD: set `passes: true`
12. Append progress to `progress.txt`
13. **STOP** - Do not continue to next story

---

## TDD Workflow (MANDATORY)

You MUST follow Test-Driven Development:

### Step 1: Write Failing Tests First (RED)
```bash
# Create test file if needed
# Write tests that define expected behavior
bun test  # Tests MUST fail (red phase)
```

### Step 2: Implement Minimum Code (GREEN)
```bash
# Write only enough code to pass tests
bun test  # Tests MUST pass (green phase)
```

### Step 3: Refactor
```bash
# Clean up while keeping tests green
bun test  # Tests MUST still pass
```

**Do NOT skip TDD. Tests are contracts that validate your implementation.**

---

## Research Phase (if story has `research: true`)

If the current story has `research: true` and no research file exists yet:

1. **Explore the codebase** - Find relevant files, patterns, and dependencies
2. **Document findings** in `relentless/features/<feature>/research/<story-id>.md`:
   - Existing patterns that should be followed
   - Files that will likely need modification
   - Dependencies and integration points
   - Potential gotchas or edge cases
   - Recommended implementation approach
3. **Do NOT implement** - only research and document
4. Save your findings to the research file and end your turn

---

## Routing Awareness

Stories in `prd.json` may have routing metadata:

```json
{
  "routing": {
    "complexity": "medium",
    "harness": "claude",
    "model": "sonnet-4.5",
    "estimatedCost": 0.0034
  }
}
```

**What this means:**
- **complexity**: How hard the task is (simple/medium/complex/expert)
- **harness/model**: Which AI was chosen for this task
- **estimatedCost**: Pre-execution cost estimate

After completion, execution history is saved for cost tracking.

---

## Checklist Validation

Before completing a story, verify against the checklist items provided:

- [ ] All acceptance criteria from tasks.md satisfied
- [ ] Tests written BEFORE implementation (TDD)
- [ ] Tests passing
- [ ] Typecheck passes (0 errors)
- [ ] Lint passes (0 errors AND 0 warnings)
- [ ] No debug code (console.log, debugger)
- [ ] No unused imports or variables
- [ ] Follows existing patterns

---

## Progress Report Format

APPEND to `progress.txt` after each story (never replace):

```markdown
## [Date] - [Story ID]: [Story Title]

**Completed:**
- What was implemented
- Key decisions made

**Files Changed:**
- path/to/file (new/modified)

**Tests Added:**
- path/to/test.file

**Learnings:**
- Patterns discovered
- Gotchas for future iterations

**Constitution Compliance:**
- [list principles followed]

---
```

---

## Project-Specific Patterns

### Directory Structure
```
relentless/
├── bin/              # CLI entry point (relentless.ts)
├── src/              # Core TypeScript implementation
│   ├── agents/       # Agent adapters (claude, amp, opencode, codex, droid, gemini)
│   ├── config/       # Configuration schema and loading
│   ├── prd/          # PRD parsing and validation
│   ├── execution/    # Orchestration loop, routing, and context-builder
│   ├── routing/      # Auto mode routing module
│   └── init/         # Project initialization scaffolder
├── tests/            # Test files
│   ├── helpers/      # Shared test utilities
│   ├── routing/      # Routing module tests
│   └── integration/  # Integration tests
├── .claude/          # Skills and commands
│   ├── skills/       # Skill implementations
│   └── commands/     # Command wrappers
└── relentless/       # Relentless workspace
    ├── config.json
    ├── constitution.md
    ├── prompt.md
    └── features/
```

### Key Technologies
- **Runtime:** Bun (NOT Node.js)
- **Language:** TypeScript (strict mode)
- **Validation:** Zod schemas
- **CLI:** Commander
- **Formatting:** Chalk
- **UI:** Ink (React for CLI)

### Test File Patterns
- Unit tests: `tests/**/*.test.ts`
- Integration tests: `tests/integration/`
- E2E tests: `tests/e2e/`
- Test helpers: `tests/helpers/`

---

## Common Mistakes to Avoid

1. **Doing multiple stories** - Complete exactly ONE story, then STOP
2. **Writing code before tests** - TDD is mandatory, tests come FIRST
3. **Ignoring lint warnings** - Zero warnings required, not just zero errors
4. **Marking incomplete stories done** - Only mark `passes: true` when ALL criteria met
5. **Not updating progress.txt** - Document learnings for future iterations
6. **Committing broken code** - All quality checks must pass before commit
7. **Using Node.js APIs** - Use Bun APIs instead
8. **Adding unnecessary dependencies** - Prefer built-in solutions

---

## Stop Condition

After completing a story, check if ALL stories have `passes: true`.

If ALL complete, output:
```
<promise>COMPLETE</promise>
```

Otherwise, end normally (next iteration continues with next story).

---

**Personalized for Relentless**
**Generated:** 2026-01-23
**Re-generate:** /relentless.constitution
