---
description: Create or update the project constitution - personalized governance and coding principles.
handoffs: 
  - label: Build Specification
    agent: relentless.specify
    prompt: Create a feature specification. I want to build...
---

Load the constitution skill and create or update the project constitution at `relentless/constitution.md`.

**Context:** $ARGUMENTS

The constitution skill (`.claude/skills/constitution/SKILL.md`) will guide you through:

## Process

1. **Gather Information**: Ask about project philosophy and standards
   - Project identity (name, languages, tech stack)
   - Testing approach (TDD, coverage requirements)
   - Code quality (linting, checks, reviews)
   - Architecture principles (patterns, modularity)
   - Version control (branches, commits, CI/CD)

2. **Generate Constitution**: Create personalized governance document
   - Load template from `.claude/skills/constitution/templates/constitution-template.md`
   - Replace all placeholders with concrete values from user answers
   - Ensure MUST/SHOULD rules are clear and testable
   - Set version 1.0.0 for new, increment semantically for updates
   - Add ratification date and governance procedures

3. **Validate**: Check completeness
   - No placeholder tokens remain
   - All dates in ISO format (YYYY-MM-DD)
   - Principles are declarative and testable
   - Version follows semver (X.Y.Z)

4. **Save**: Write to `relentless/constitution.md`

5. **Report**: Summarize what was created
   - Version number
   - Number of principles defined
   - Key MUST/SHOULD rules
   - Next steps: "Now create your first feature with `/relentless.specify`"

## Updating Existing Constitution

If `relentless/constitution.md` exists:
1. Load current version
2. Ask what needs to change
3. Increment version appropriately:
   - **MAJOR**: Breaking changes to principles
   - **MINOR**: New principles added
   - **PATCH**: Clarifications, typo fixes
4. Update LAST_AMENDED_DATE to today
5. Add amendment notes

## Key Points

- Constitution saved to `relentless/constitution.md` (project root level)
- Foundation for all feature work - reference during specification and planning
- Source of truth for project standards and governance
- MUST rules are enforced, SHOULD rules are best practices
- Follow the constitution skill's step-by-step process exactly

**After establishing your constitution, create your first feature with `/relentless.specify`**
