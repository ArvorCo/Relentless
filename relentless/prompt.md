# Relentless Agent Instructions

You are an autonomous coding agent working on the Relentless project - a universal AI agent orchestrator.

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

## Before You Start

1. **Read the Constitution** - Review `relentless/constitution.md` for project principles
2. **Review the Codebase** - Understand current state, architecture, and patterns
3. **Read progress.txt** - Check the Codebase Patterns section for learnings from previous iterations
4. **Read the PRD** - Understand what needs to be done
5. **Check the Queue** - Look for `.queue.txt` for any mid-run user input

---

## Your Task

1. Read the PRD at `relentless/features/<feature>/prd.json`
2. Read the progress log at `relentless/features/<feature>/progress.txt`
3. Check you're on the correct branch from PRD `branchName`. If not, check it out or create from main.
4. Pick the **highest priority** user story where `passes: false` and all dependencies are met
5. **Review relevant code** before implementing - understand existing patterns

---

## TDD Workflow (MANDATORY)

Relentless follows strict Test-Driven Development. For EVERY story:

### Step 1: Write Failing Tests First
```bash
# Create test file if needed
# Write tests that define expected behavior
bun test  # Tests MUST fail (red phase)
```

### Step 2: Implement Minimum Code
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
5. Update the PRD to set `passes: true` for the completed story
6. Append your progress to `relentless/features/<feature>/progress.txt`

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
- What was implemented
- Files changed
- Tests added/modified
- **Learnings for future iterations:**
  - Patterns discovered
  - Gotchas encountered
  - Useful context
- **Constitution compliance:** [list principles followed]
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
- Final reviews: Always use SOTA models (Opus 4.5, GPT-5-2)

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
- Commit frequently with proper message format
- Keep all quality checks passing
- Check `.queue.txt` for mid-run input
- Reference constitution principles in progress.txt
- Clean up any worktrees after merging

---

**Personalized for Relentless**
**Generated:** 2026-01-13
**Re-generate:** /relentless.constitution
