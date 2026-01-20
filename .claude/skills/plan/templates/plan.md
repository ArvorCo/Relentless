# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Routing Preference**: auto: good | allow free: yes
<!-- Options: auto: free|cheap|good|genius | allow free: yes|no | OR specific: harness/model -->
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/relentless.plan` command. See `.claude/skills/plan/SKILL.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]
**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]
**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]
**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]
**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]
**Project Type**: [single/web/mobile - determines source structure]
**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]
**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]
**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Compliance

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**MUST Rules Checked:**
- [ ] TDD is mandatory - test specs defined in this plan
- [ ] Quality gates defined - typecheck, lint, test commands
- [ ] Routing preference carried from spec
- [ ] No `any` types planned (TypeScript)
- [ ] Error handling strategy defined
- [ ] Zero lint warnings policy enforced

**If any MUST rule cannot be satisfied, document the exception and remediation plan.**

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/relentless.plan command output)
├── research.md          # Phase 0 output (/relentless.plan command)
├── data-model.md        # Phase 1 output (/relentless.plan command)
├── quickstart.md        # Phase 1 output (/relentless.plan command)
├── contracts/           # Phase 1 output (/relentless.plan command)
└── tasks.md             # Phase 2 output (/relentless.tasks command - NOT created by /relentless.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Test Specifications (MANDATORY)

<!--
  TDD REQUIREMENT: This section is mandatory. Tests are written BEFORE implementation.
  The agent must create these test files first, verify they fail, then implement.
-->

### Test File Structure

```text
tests/
├── unit/
│   └── [component].test.ts
├── integration/
│   └── [feature].test.ts
└── e2e/
    └── [flow].test.ts
```

### Unit Tests

| Component | Test File | Functions to Test |
|-----------|-----------|-------------------|
| [Name] | `tests/unit/[name].test.ts` | [functions] |

### Integration Tests

| Flow | Test File | Scenarios |
|------|-----------|-----------|
| [Name] | `tests/integration/[name].test.ts` | [scenarios] |

### Mock Requirements

- [List mocks/fixtures needed]
- [Database mock approach]
- [External service mocks]

### Coverage Targets

- **Unit**: 80% minimum
- **Integration**: Key flows covered (happy path + error paths)
- **E2E**: Happy path + critical error scenarios

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

## Quality Gates

<!--
  These commands must pass before any story is considered complete.
  All three are mandatory - no exceptions.
-->

### Required Commands

```bash
# Type checking - 0 errors required
bun run typecheck

# Linting - 0 errors AND 0 warnings required
bun run lint

# Tests - all must pass
bun test
```

### Per-Story Checklist

Every story implementation must:
- [ ] Pass typecheck with 0 errors
- [ ] Pass lint with 0 errors AND 0 warnings
- [ ] Pass all existing tests
- [ ] Include new tests (written first, TDD style)
- [ ] Have no debug code (console.log, debugger)
- [ ] Have no unused imports or variables
