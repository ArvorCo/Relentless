# Project Constitution

## Overview

This document defines the governing principles, patterns, and constraints for this project. All agents and developers MUST follow these guidelines when working on the codebase.

## Core Principles

### Architecture

**MUST** follow these architectural patterns:
- Follow existing code structure and organization patterns
- Keep modules focused and single-purpose
- Use dependency injection where appropriate

**SHOULD** consider these best practices:
- Prefer composition over inheritance
- Keep functions small and focused
- Write self-documenting code

### Code Quality

**MUST** maintain these quality standards:
- All commits MUST pass typecheck with 0 errors
- All commits MUST pass lint with 0 warnings
- All new features MUST include appropriate tests
- All code MUST be formatted consistently

**SHOULD** strive for:
- High test coverage (aim for >80%)
- Clear, descriptive variable and function names
- Comprehensive error handling

### Version Control

**MUST** follow these Git practices:
- Write clear, descriptive commit messages
- Reference user story IDs in commits: `feat: [US-XXX] - Description`
- Keep commits focused and atomic
- Do not commit broken code

**SHOULD** maintain:
- Clean commit history
- Meaningful branch names
- Updated documentation with code changes

## Technology Stack

### Language & Runtime

- **TypeScript** - Primary language
- **Bun** - Runtime environment (not Node.js)
- **Zod** - Schema validation

### Key Libraries

- Commander - CLI parsing
- Chalk - Terminal formatting
- Execa - Process execution

## File Organization

```
project/
├── bin/              # CLI entry points
├── src/              # Source code
│   ├── agents/       # Agent adapters
│   ├── config/       # Configuration
│   ├── execution/    # Orchestration
│   ├── init/         # Project scaffolding
│   └── prd/          # PRD handling
├── templates/        # Template files
├── skills/           # Agent skills
└── relentless/       # Relentless workspace
    ├── config.json
    ├── prompt.md
    └── features/
```

## Coding Standards

### TypeScript

**MUST** follow:
- Use strict TypeScript mode
- Avoid `any` type - use `unknown` or proper types
- Export types alongside implementations
- Use Zod schemas for runtime validation

**SHOULD** prefer:
- Interface for public APIs
- Type for unions and intersections
- Explicit return types on public functions

### Error Handling

**MUST** implement:
- Descriptive error messages
- Proper error types
- Validation at system boundaries
- Graceful degradation where appropriate

**SHOULD** include:
- Context in error messages
- Recovery suggestions
- Logging for debugging

### Testing

**MUST** test:
- Core business logic
- Edge cases and error conditions
- Integration points
- CLI commands

**SHOULD** test:
- Helper functions
- Utilities
- Type guards

## Documentation

**MUST** document:
- Public APIs and interfaces
- Complex algorithms or logic
- Breaking changes in commits
- Setup and installation steps

**SHOULD** document:
- Configuration options
- Architecture decisions
- Common workflows
- Troubleshooting steps

## Security

**MUST** ensure:
- No secrets committed to git
- Proper input validation
- Safe file system operations
- Minimal permissions required

**SHOULD** consider:
- Rate limiting where appropriate
- Audit logs for sensitive operations
- Security updates for dependencies

## Performance

**MUST** maintain:
- Fast startup time (<1s)
- Responsive CLI commands
- Efficient file operations
- Minimal memory footprint

**SHOULD** optimize:
- Parallel operations where safe
- Caching for repeated operations
- Lazy loading of heavy modules

## Constraints

### Dependencies

**MUST NOT**:
- Add dependencies without justification
- Include deprecated packages
- Use packages with known security issues

**SHOULD**:
- Prefer built-in solutions over dependencies
- Keep dependencies minimal and focused
- Regularly update dependencies

### Backwards Compatibility

**MUST**:
- Maintain compatibility with existing PRDs
- Provide migration paths for breaking changes
- Version configuration formats

**SHOULD**:
- Deprecate features before removal
- Provide clear upgrade documentation
- Support at least 2 major versions

## Agent-Specific Guidelines

### For All Agents

**MUST**:
- Read progress.txt before starting work
- Work on ONE story per iteration
- Update PRD after completing a story
- Append learnings to progress.txt
- Run all quality checks before committing

**SHOULD**:
- Review existing code before modifying
- Follow established patterns
- Ask questions when unclear
- Document non-obvious decisions

### Iteration Workflow

1. Read PRD to find next incomplete story
2. Read progress.txt for context and patterns
3. Review relevant existing code
4. Implement the single story
5. Run typecheck and lint
6. Run tests if applicable
7. Commit with proper message format
8. Update PRD passes: true
9. Append to progress.txt
10. Check if all stories complete

## Review and Updates

This constitution should be:
- **Reviewed** at project milestones
- **Updated** when patterns emerge
- **Referenced** in code reviews
- **Enforced** in CI/CD pipelines

---

Last Updated: YYYY-MM-DD
Version: 1.0.0
