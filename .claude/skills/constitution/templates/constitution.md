# Project Constitution

**Version:** 1.0.0
**Ratified:** [DATE]
**Last Amended:** [DATE]

---

## Overview

This document defines the governing principles, patterns, and constraints for this project. All AI agents and developers MUST follow these guidelines when working on the codebase.

**This is a generic template.** Customize it for your project using `/relentless.constitution`.

---

## Core Principles

### 1. Test-Driven Development (TDD)

**MUST:**
- Write tests BEFORE implementation code
- Verify tests FAIL before writing implementation
- All new features MUST have test coverage
- All bug fixes MUST include regression tests
- Tests MUST be part of acceptance criteria

**SHOULD:**
- Aim for >80% code coverage on critical paths
- Write integration tests for API endpoints
- Write E2E tests for user-facing flows
- Use descriptive test names that document behavior

**Rationale:** TDD ensures code correctness, documents behavior, and prevents regressions. Tests written first force clear thinking about requirements.

---

### 2. Quality Gates

**MUST:**
- All commits MUST pass typecheck with 0 errors
- All commits MUST pass lint with 0 errors AND 0 warnings
- All commits MUST pass tests
- No debug code in production (console.log, debugger)
- No unused imports or variables

**SHOULD:**
- Run quality checks locally before pushing
- Fix lint warnings immediately, don't accumulate debt
- Keep build times under reasonable limits

**Rationale:** Quality gates catch issues early and maintain codebase health over time.

---

### 3. Code Architecture

**MUST:**
- Follow existing code structure and organization patterns
- Keep modules focused and single-purpose
- Avoid circular dependencies
- Export types alongside implementations

**SHOULD:**
- Prefer composition over inheritance
- Keep functions small and focused (<50 lines)
- Write self-documenting code
- Use meaningful names (no abbreviations)

**Rationale:** Consistent architecture makes code predictable and maintainable.

---

### 4. Type Safety

**MUST:**
- Use strict TypeScript mode
- No `any` type except in documented exceptional cases
- Validate external input at system boundaries
- Export type definitions for public APIs

**SHOULD:**
- Use Zod or similar for runtime validation
- Prefer type inference over explicit annotations
- Use discriminated unions for state machines
- Document complex type constraints

**Rationale:** Type safety prevents runtime errors and improves developer experience.

---

### 5. Version Control

**MUST:**
- Write clear, descriptive commit messages
- Reference user story IDs: `feat: [US-XXX] - Description`
- Keep commits focused and atomic
- Never commit broken code
- Never commit secrets or credentials

**SHOULD:**
- Use conventional commit format
- Keep PR/MR size manageable (<500 lines)
- Update documentation with code changes
- Squash fixup commits before merge

**Rationale:** Good version control practices enable collaboration and debugging.

---

### 6. Error Handling

**MUST:**
- Handle all error cases explicitly
- Provide descriptive error messages
- Validate input at system boundaries
- Never swallow errors silently

**SHOULD:**
- Include context in error messages
- Use typed error classes
- Provide recovery suggestions
- Log errors with appropriate levels

**Rationale:** Proper error handling improves debugging and user experience.

---

### 7. Documentation

**MUST:**
- Document public APIs and interfaces
- Document breaking changes in commits
- Keep README updated with setup instructions
- Document non-obvious design decisions

**SHOULD:**
- Document configuration options
- Include usage examples
- Document troubleshooting steps
- Keep inline comments minimal but meaningful

**Rationale:** Documentation reduces onboarding time and prevents knowledge loss.

---

### 8. Security

**MUST:**
- Never commit secrets or credentials
- Validate and sanitize user input
- Use parameterized queries (no SQL injection)
- Follow principle of least privilege

**SHOULD:**
- Keep dependencies updated
- Run security audits periodically
- Use environment variables for configuration
- Implement rate limiting for APIs

**Rationale:** Security is non-negotiable and must be built in from the start.

---

## Technology Stack

**Customize this section for your project:**

### Language & Runtime
- [Language] - Primary language
- [Runtime] - Runtime environment

### Key Libraries
- [Library 1] - Purpose
- [Library 2] - Purpose
- [Library 3] - Purpose

### Quality Tools
- [Linter] - Code linting
- [Formatter] - Code formatting
- [Test Framework] - Testing

---

## File Organization

**Customize this section for your project:**

```
project/
├── src/              # Source code
│   ├── components/   # UI components (if applicable)
│   ├── services/     # Business logic
│   ├── utils/        # Utilities
│   └── types/        # Type definitions
├── tests/            # Test files
├── docs/             # Documentation
└── relentless/       # Relentless workspace
    ├── config.json   # Configuration
    ├── constitution.md
    ├── prompt.md
    └── features/     # Feature workspaces
```

---

## Agent-Specific Guidelines

### For All AI Agents

**MUST:**
- Read spec.md and plan.md BEFORE starting work
- Read only the relevant story section from tasks.md
- Work on ONE story per iteration
- Follow TDD - write tests first
- Run ALL quality checks before committing
- Update PRD after completing a story
- Append learnings to progress.txt

**SHOULD:**
- Review existing code patterns before modifying
- Ask questions when requirements are unclear
- Document non-obvious decisions
- Keep commits small and focused

### Iteration Workflow

1. Read spec.md, plan.md, checklist.md
2. Find your story in tasks.md (only read that section)
3. Review relevant existing code
4. Write tests FIRST (TDD)
5. Verify tests FAIL
6. Implement minimum code to pass tests
7. Run typecheck, lint, test
8. Commit with proper message format
9. Update PRD: `passes: true`
10. Append to progress.txt
11. Check if all stories complete

---

## Routing and Cost Optimization

When using Relentless Auto Mode:

**MUST:**
- Respect routing decisions in prd.json
- Report actual costs vs estimated costs
- Not override routing without explicit permission

**SHOULD:**
- Use appropriate model for task complexity
- Consider cost when choosing approaches
- Track and report token usage

**Modes:**
- `free` - Free tier models only (~95% savings)
- `cheap` - Budget models (~75% savings)
- `good` - Balanced quality/cost (~50% savings)
- `genius` - Premium models (no savings)

---

## Governance

### Amendment Process

1. Propose changes via PR
2. Discuss with team
3. Update version semantically:
   - **MAJOR**: Breaking changes to principles
   - **MINOR**: New principles added
   - **PATCH**: Clarifications, typo fixes
4. Update `Last Amended` date
5. Document rationale for change

### Compliance

- Constitution is checked before each feature implementation
- Violations should be flagged in code review
- Repeated violations require team discussion
- Emergency exceptions require documentation

### Review Schedule

- **Quarterly**: Full constitution review
- **Per Feature**: Relevance check
- **On Issues**: Investigate if constitution gap

---

## Customization Notes

This template should be customized with:

1. **Technology Stack** - Your specific languages, frameworks, tools
2. **File Organization** - Your project structure
3. **Quality Commands** - Your actual typecheck, lint, test commands
4. **Additional Principles** - Domain-specific rules

Run `/relentless.constitution` to generate a personalized version.

---

**Template Version:** 2.0.0
**Compatible with:** Relentless v0.2.0+
