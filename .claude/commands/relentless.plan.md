---
description: Generate technical implementation plan from feature specification.
handoffs: 
  - label: Generate Task Breakdown
    agent: relentless.tasks
    prompt: Generate tasks from plan
    send: true
  - label: Generate Quality Checklist
    agent: relentless.checklist
    prompt: Generate quality checklist
    send: true
---

Load the plan skill (`[skills_path]/plan/SKILL.md`) and create technical implementation plan.

**Context:** $ARGUMENTS

The plan skill will:
1. Read feature specification and constitution
2. Generate technical architecture and design
3. Define data models, APIs, and implementation strategy
4. Save to `relentless/features/NNN-feature/plan.md`
