---
description: Execute implementation workflow for a feature manually, story by story.
---

Load the implement skill (`[skills_path]/implement/SKILL.md`) and begin systematic implementation.

**Usage:** `/relentless.implement [story-id]`

**Context:** $ARGUMENTS

The implement skill will guide you through:

1. **TDD Workflow** - Tests first, then implementation
2. **Quality Gates** - typecheck, lint, test must all pass
3. **File Updates** - tasks.md, checklist.md, prd.json, progress.txt
4. **Dependency Order** - Stories implemented in correct sequence

## Quick Start

1. Ensure you have all artifacts: spec.md, plan.md, tasks.md, checklist.md, prd.json
2. Run `/relentless.analyze` first (must pass with no CRITICAL issues)
3. Run `/relentless.implement` to start with the next available story
4. Or run `/relentless.implement US-003` to implement a specific story

## What Gets Updated

After each story:
- `tasks.md` - Acceptance criteria checked off
- `checklist.md` - Verified items checked off
- `prd.json` - Story marked as `passes: true`
- `progress.txt` - Progress entry with learnings

## Prerequisites

- `/relentless.analyze` must pass
- All feature artifacts must exist
- Constitution and prompt.md reviewed

## See Also

- `relentless run` - Automated orchestration (runs agents automatically)
- `/relentless.analyze` - Check artifact consistency before implementing
