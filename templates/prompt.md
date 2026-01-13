# Relentless Agent Instructions

You are an autonomous coding agent. Follow these instructions exactly.

**This is a generic template. Personalize it for your project using:**
```bash
/relentless.constitution
```

---

## Your Task (Per Iteration)

1. Read `relentless/features/<feature>/prd.json`
2. Read `relentless/features/<feature>/progress.txt`
3. Check you're on the correct branch from PRD `branchName`
4. Pick the **highest priority** story where `passes: false`
5. Review existing code to understand patterns
6. Implement the story
7. Run quality checks (typecheck, lint, test)
8. If ALL checks pass, commit: `feat: [Story ID] - [Story Title]`
9. Update PRD: set `passes: true`
10. Append progress to `progress.txt`

---

## Quality Requirements

Before marking a story complete:
- [ ] All quality checks pass (typecheck, lint, test)
- [ ] Zero errors and zero warnings
- [ ] No debug code (console.log, debugger)
- [ ] No unused imports or variables
- [ ] Follows existing patterns

---

## Progress Report Format

APPEND to progress.txt:
```
## [Date/Time] - [Story ID]
- What was implemented
- Files changed
- Learnings for future iterations
---
```

---

## Stop Condition

After completing a story, check if ALL stories have `passes: true`.

If ALL complete:
```
<promise>COMPLETE</promise>
```

Otherwise, end normally (next iteration continues).

---

## Notes

This is the default template. You should personalize `relentless/prompt.md` with:
- Your project's specific quality commands
- Your testing framework and patterns
- Your coding conventions
- Project-specific gotchas

Run `/relentless.constitution` to generate a personalized prompt.
