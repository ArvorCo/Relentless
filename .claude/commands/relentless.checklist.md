---
description: Generate quality validation checklist from feature artifacts.
---

Load the checklist skill (`[skills_path]/checklist/SKILL.md`) and generate quality validation checklist.

**Context:** $ARGUMENTS

The checklist skill will:
1. Read spec.md, plan.md, tasks.md, and constitution.md
2. Generate domain-specific validation items
3. Reference user stories and identify gaps
4. Save to `relentless/features/NNN-feature/checklist.md`

**Important:** Checklist items will be merged into prd.json acceptance criteria!
