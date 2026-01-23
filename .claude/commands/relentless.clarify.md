---
description: Identify and resolve ambiguities in feature specifications.
handoffs: 
  - label: Build Technical Plan
    agent: relentless.plan
    prompt: Create technical plan with clarifications
---

Load the clarify skill (`[skills_path]/clarify/SKILL.md`) and resolve specification ambiguities.

**Context:** $ARGUMENTS

The clarify skill will:
1. Scan spec.md for 9 types of ambiguities
2. Present clarification questions (max 5)
3. Update spec with answers
4. Save clarification log

Use this after creating spec if requirements are unclear.
