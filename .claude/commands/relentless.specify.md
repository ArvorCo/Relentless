---
description: Create feature specification from natural language description.
handoffs: 
  - label: Build Technical Plan
    agent: relentless.plan
    prompt: Create a plan for the spec. I am building with...
  - label: Clarify Requirements
    agent: relentless.clarify
    prompt: Clarify specification requirements
    send: true
---

Load the specify skill and create a feature specification in `relentless/features/NNN-feature-name/`.

**Feature Description:** $ARGUMENTS

The specify skill (`.claude/skills/specify/SKILL.md`) will guide you through:

## Process

1. **Create Feature Structure**
   - Generate short name (2-4 words) from description
   - Check existing branches to find next number
   - Run `.claude/skills/specify/scripts/bash/create-new-feature.sh --json "FEATURE_DESCRIPTION"`
   - Parse JSON output for BRANCH_NAME, SPEC_FILE, FEATURE_DIR

2. **Load Context**
   - Read `relentless/constitution.md` for governance rules
   - Note MUST/SHOULD requirements for specifications
   - Load spec template from `.claude/skills/specify/templates/spec.md`

3. **Generate Specification**
   - Extract key concepts: actors, actions, data, constraints
   - Make informed assumptions (document in Assumptions section)
   - Limit [NEEDS CLARIFICATION] markers to max 3 critical items
   - Write complete spec to SPEC_FILE

4. **Validate Quality**
   - All sections completed with concrete details
   - User scenarios are clear and testable
   - Functional requirements are measurable
   - Success criteria are defined
   - Assumptions documented

5. **Report Completion**
   - Feature number and name
   - Branch created
   - Spec file location
   - Next steps: `/relentless.plan` or `/relentless.clarify`

## Key Points

- **Branch naming**: `NNN-feature-name` (e.g., `003-user-auth`)
- **Directory structure**: `relentless/features/NNN-feature-name/`
- **Spec file**: `relentless/features/NNN-feature-name/spec.md`
- **Auto-numbering**: Script checks existing branches and uses next available number
- **Quality focus**: Make reasonable assumptions, minimize clarifications
- **Constitution compliance**: Follow project governance rules

## After Specification

- Run `/relentless.clarify` if ambiguities need resolving
- Run `/relentless.plan` to create technical implementation plan
- Run `/relentless.tasks` to generate user stories and tasks

**Follow the specify skill's step-by-step process exactly.**
