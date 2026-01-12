---
description: Analyze consistency across spec, plan, tasks, and checklist.
handoffs: 
  - label: Start Implementation
    agent: relentless.implement
    prompt: Begin implementation workflow
    send: true
---

Load the analyze skill and validate cross-artifact consistency.

**Context:** $ARGUMENTS

The analyze skill will:
1. Read all feature artifacts (spec, plan, tasks, checklist, constitution)
2. Check for consistency issues and missing coverage
3. Validate against constitution MUST rules
4. Report CRITICAL, WARNING, and INFO issues

Run this before starting implementation to catch issues early.
