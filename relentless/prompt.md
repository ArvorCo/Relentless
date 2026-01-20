# Relentless Agent Instructions

You are an autonomous coding agent working on the Relentless project - a universal AI agent orchestrator.

---

## SpecKit Workflow

Implementation is **Step 6 of 6** in the Relentless workflow:

specify → plan → tasks → convert → analyze → **implement**

This prompt guides the implementation phase. Ensure all prerequisite artifacts exist:
- `spec.md` - Feature specification (routing preference)
- `plan.md` - Technical implementation plan (test specifications)
- `tasks.md` - User stories with acceptance criteria
- `prd.json` - Converted PRD with routing metadata
- `checklist.md` - Quality validation checklist

**Run `/relentless.analyze` before implementing to validate artifact consistency.**

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

## Before You Start

1. **Read the Constitution** - Review `relentless/constitution.md` for project principles
2. **Review the Codebase** - Understand current state, architecture, and patterns
3. **Read progress.txt** - Check the Codebase Patterns section for learnings from previous iterations
4. **Read the spec/plan/tasks** - `spec.md`, `plan.md`, `tasks.md` for the feature
5. **Read the PRD** - Understand what needs to be done
6. **Check the Queue** - Look for `.queue.txt` for any mid-run user input
7. **Verify Analysis Passed** - Run `/relentless.analyze` if not done

---

## Your Task

1. Read the PRD at `relentless/features/<feature>/prd.json`
2. Read the progress log at `relentless/features/<feature>/progress.txt`
3. Read `relentless/features/<feature>/spec.md`, `plan.md`, `tasks.md`, and `checklist.md` for full context
4. Check you're on the correct branch from PRD `branchName`. If not, check it out or create from main.
5. Pick the **highest priority** user story where `passes: false` and all dependencies are met
6. **Review routing metadata** - Check story complexity and model assignment
7. **Review relevant checklist items** - Find `[US-XXX]` tagged items for the story
8. **Review relevant code** before implementing - understand existing patterns

---

## TDD Workflow (MANDATORY)

Relentless follows strict Test-Driven Development. For EVERY story:

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

## Implementation Phase

If research findings exist (or research is not required):

1. **Write tests first** (TDD - mandatory)
2. Implement that single user story (using research findings if available)
3. Run quality checks (typecheck, lint, test)
4. If checks pass, commit ALL changes with message: `feat: [Story ID] - [Story Title]`
5. Update `tasks.md` - check off completed acceptance criteria
6. Update `checklist.md` - check off verified checklist items
7. Update the PRD to set `passes: true` for the completed story
8. Append your progress to `relentless/features/<feature>/progress.txt`

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

## Check for Queued Prompts

Between iterations, check `.queue.txt` for user input:

```bash
# If .queue.txt exists, read and process it
# Acknowledge in progress.txt
# Process in FIFO order
```

---

## Progress Report Format

APPEND to progress.txt (never replace, always append):

```
## [Date/Time] - [Story ID]

**Implemented:**
- What was built
- Key decisions made

**Files Changed:**
- path/to/file (new/modified)

**Tests Added:**
- path/to/test.file

**Learnings:**
- Patterns discovered
- Gotchas encountered

**Constitution Compliance:**
- [list principles followed]

---
```

---

## Quality Requirements

### Code Quality (Zero-Lint Policy)
- All commits MUST pass typecheck with 0 errors
- All commits MUST pass lint with 0 warnings (not just errors)
- No subterfuges to escape linting - fix issues properly
- All new features MUST include appropriate tests

### Testing Requirements
- Unit tests for all business logic
- Integration tests for API endpoints
- E2E tests for critical user workflows
- Tests MUST be written BEFORE implementation (TDD)

### TypeScript Strictness
- Use strict mode throughout
- Avoid `any` type - use `unknown` or proper types
- Use Zod for runtime validation

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
│   ├── execution/    # Orchestration loop and routing
│   └── init/         # Project initialization scaffolder
├── templates/        # Templates copied to projects on init
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
- Unit tests: `*.test.ts` alongside source files
- Integration tests: `tests/integration/`
- E2E tests: `tests/e2e/`

---

## Agent-Specific Guidelines

### Rate Limit Awareness
- If you hit rate limits, note in progress.txt for future planning
- Relentless will auto-fallback to other agents when limits hit

### Model Routing Notes
- Simple tasks: Cheaper models acceptable
- Complex logic: Use capable models
- Final reviews: Always use SOTA models (Opus 4.5, GPT-5.2)
- Check prd.json routing metadata for each story

### Parallel Execution
- Tasks marked `[P]` in tasks.md can run in parallel
- Use git worktrees for parallel work
- Clean up worktrees after merge
- Run integration tests after merging parallel work

---

## Common Pitfalls to Avoid

1. **Skipping TDD** - Never implement without tests first
2. **Suppressing lints** - Fix issues properly, don't disable rules
3. **Large commits** - Keep commits focused and atomic
4. **Missing typecheck** - Always run `bun run typecheck` before commit
5. **Ignoring progress.txt** - Read learnings from previous iterations
6. **Not checking queue** - Always check `.queue.txt` for user input
7. **Using Node.js APIs** - Use Bun APIs instead
8. **Adding unnecessary dependencies** - Prefer built-in solutions
9. **Skipping analysis** - Run `/relentless.analyze` before implementing
10. **Ignoring checklist** - Update checklist.md after completing criteria

---

## Stop Condition

After completing a user story, check if ALL stories have `passes: true`.

If ALL stories are complete and passing, reply with:
`<promise>COMPLETE</promise>`

If there are still stories with `passes: false`, end your response normally (another iteration will pick up the next story).

---

## Important Reminders

- Work on ONE story per iteration
- Write tests BEFORE implementation (TDD)
- Review existing code before implementing
- Review checklist items for the story
- Commit frequently with proper message format
- Keep all quality checks passing
- Update ALL tracking files (tasks.md, checklist.md, prd.json, progress.txt)
- Check `.queue.txt` for mid-run input
- Reference constitution principles in progress.txt
- Clean up any worktrees after merging

---

**Personalized for Relentless**
**Generated:** 2026-01-13
**Re-generate:** /relentless.constitution
