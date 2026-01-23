---
description: Generate dependency-ordered user stories and tasks from plan.
handoffs: 
  - label: Analyze Consistency
    agent: relentless.analyze
    prompt: Analyze cross-artifact consistency
    send: true
  - label: Start Implementation
    agent: relentless.implement
    prompt: Begin implementation
    send: true
---

Load the tasks skill (`[skills_path]/tasks/SKILL.md`) and generate user stories and implementation tasks.

**Context:** $ARGUMENTS

The tasks skill will:
1. Read spec.md and plan.md
2. Extract user stories from requirements
3. Break down into actionable tasks with acceptance criteria
4. Order by dependencies
5. Save to `relentless/features/NNN-feature/tasks.md`

**Important:** tasks.md contains the user stories that will be converted to prd.json!
