---
description: Convert tasks.md to prd.json with smart routing classification.
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

Load the convert skill and convert tasks.md to prd.json with routing.

**Context:** $ARGUMENTS

The convert skill will:
1. Locate tasks.md in the current feature directory
2. Validate story structure, dependencies, and TDD compliance
3. Run `relentless convert` with routing classification
4. Display routing summary (complexity, harness, model, cost)
5. Report next steps

**Important:** Routing is ALWAYS included by default. This enables intelligent cost optimization.
