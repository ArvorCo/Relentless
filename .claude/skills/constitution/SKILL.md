---
name: constitution
description: "Create or update the project constitution - personalized governance and coding principles. Use when starting a project or updating project standards. Triggers on: create constitution, update principles, set project rules."
---

# Project Constitution Generator

Create a personalized project constitution that defines your team's coding principles, patterns, and governance.

---

## The Job

1. Ask the user about their project's coding philosophy and standards
2. Generate a personalized constitution based on their answers
3. Save to `relentless/constitution.md`
4. Ensure consistency with project templates and documentation

**Important:** The constitution is the foundation for all feature work - create this before generating features.

---

## Step 1: Gather Project Information

Ask essential questions about the project:

**Project Identity:**
- Project name?
- Primary programming language(s)?
- Tech stack (frameworks, libraries)?

**Testing Philosophy:**
- Testing approach? (TDD, test after, pragmatic)
- Required test coverage?
- Testing frameworks preferred?

**Code Quality:**
- Linting/formatting tools?
- Required checks before commit? (typecheck, lint, test)
- Code review requirements?

**Architecture Principles:**
- Preferred patterns? (MVC, clean architecture, etc.)
- Modularity requirements?
- Performance expectations?

**Version Control:**
- Branch naming conventions?
- Commit message format?
- CI/CD requirements?

---

## Step 2: Generate Constitution

Load the template from `templates/constitution-template.md` and:

1. Replace all `[PLACEHOLDER]` tokens with concrete values from user answers
2. Add/remove principles based on project needs (template is a starting point)
3. Ensure each principle has:
   - **MUST** rules (enforced, blocking)
   - **SHOULD** rules (best practices, warnings)
   - Clear rationale
4. Set version to `1.0.0` for new constitutions
5. Set ratification date to today
6. Add governance section with amendment procedures

---

## Step 3: Validate & Save

Before saving:
- No `[PLACEHOLDER]` tokens remain (unless explicitly marked as TODO)
- All dates in ISO format (YYYY-MM-DD)
- Principles are declarative and testable
- Version format is semantic (X.Y.Z)

Save to: `relentless/constitution.md`

---

## Step 4: Report

Output summary:
- Constitution version created
- Number of principles defined
- Key MUST/SHOULD rules
- Next steps: "Now create your first feature with `/relentless.specify`"

---

## Updating Existing Constitution

If `relentless/constitution.md` exists:
1. Load current version
2. Ask what needs to change
3. Increment version appropriately:
   - **MAJOR**: Breaking changes to principles
   - **MINOR**: New principles added
   - **PATCH**: Clarifications, typo fixes
4. Update `LAST_AMENDED_DATE` to today
5. Add amendment notes at top

---

## Example Constitution Structure

```markdown
# Project Constitution

**Version:** 1.0.0  
**Ratified:** 2026-01-11  
**Last Amended:** 2026-01-11

## Principles

### Principle 1: Type Safety
**MUST:**
- All code must pass TypeScript strict mode
- No `any` types except in documented cases

**SHOULD:**
- Use Zod for runtime validation
- Prefer inference over explicit types

**Rationale:** Type safety prevents runtime errors and improves maintainability.

### Principle 2: Testing
**MUST:**
- All features must have unit tests
- CI must pass before merging

**SHOULD:**
- Aim for 80% coverage
- Write tests before implementation (TDD)

**Rationale:** Tests document behavior and prevent regressions.

## Governance

**Amendment Process:**
1. Propose changes via PR
2. Discuss with team
3. Update version semantically
4. Document rationale

**Compliance:**
- Constitution checked before each feature implementation
- Violations block PR merge
```
