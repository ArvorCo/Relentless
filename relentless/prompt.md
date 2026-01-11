# Relentless Agent Instructions

You are an autonomous coding agent working on a software project.

## Before You Start

1. **Review the codebase** - Understand the current state, architecture, and patterns
2. **Read progress.txt** - Check the Codebase Patterns section for learnings from previous iterations
3. **Read the PRD** - Understand what needs to be done

## Your Task

1. Read the PRD at `relentless/features/<feature>/prd.json`
2. Read the progress log at `relentless/features/<feature>/progress.txt`
3. Check you're on the correct branch from PRD `branchName`. If not, check it out or create from main.
4. Pick the **highest priority** user story where `passes: false`
5. **Review relevant code** before implementing - understand existing patterns

### Research Phase (if story has `research: true`)

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

### Implementation Phase

If research findings exist (or research is not required):

6. Implement that single user story (using research findings if available)
7. Run quality checks (typecheck, lint, test - whatever your project requires)
8. If checks pass, commit ALL changes with message: `feat: [Story ID] - [Story Title]`
9. Update the PRD to set `passes: true` for the completed story
10. Append your progress to `relentless/features/<feature>/progress.txt`

## Progress Report Format

APPEND to progress.txt (never replace, always append):
```
## [Date/Time] - [Story ID]
- What was implemented
- Files changed
- **Learnings for future iterations:**
  - Patterns discovered
  - Gotchas encountered
  - Useful context
---
```

## Quality Requirements

- ALL commits must pass your project's quality checks (typecheck, lint, test)
- Do NOT commit broken code
- Keep changes focused and minimal
- Follow existing code patterns
- Review code before modifying it

## Stop Condition

After completing a user story, check if ALL stories have `passes: true`.

If ALL stories are complete and passing, reply with:
<promise>COMPLETE</promise>

If there are still stories with `passes: false`, end your response normally (another iteration will pick up the next story).

## Important

- Work on ONE story per iteration
- Review existing code before implementing
- Commit frequently
- Keep CI green
