---
name: tasks
description: "Generate dependency-ordered task breakdowns with phase structure. Use for planning implementation. Triggers on: break down tasks, generate task list, create implementation plan, dependency-ordered tasks."
---

# Dependency-Ordered Task Breakdown Skill

Generate comprehensive, dependency-ordered task breakdowns with phase structure to visualize implementation order and parallelize work effectively.

---

## The Job

1. Read the PRD from `relentless/features/[feature-name]/prd.json` or `prd.md`
2. Analyze user stories, dependencies, and acceptance criteria
3. Generate phase structure: Setup → Foundation → Stories → Polish
4. Create tasks with IDs (T001+), phase markers, story labels [US-X]
5. Mark parallel tasks with [P]
6. Ensure each story is independently testable
7. Save to `relentless/features/[feature-name]/tasks.md`

**Important:** This skill works with Claude Code, Amp, Gemini, and other AI coding agents.

---

## Step 1: Analyze PRD Structure

### Extract Key Information
- **User Stories**: Read all stories with their IDs, titles, descriptions, acceptance criteria
- **Dependencies**: Check for explicit dependencies between stories
- **Priority**: Note story priorities (if present)
- **Parallel Markers**: Check if stories are marked for parallel execution
- **Phases**: Look for explicit phase information in stories

### Infer Task Structure
- **Identify foundations**: Which stories must be completed first? (schema, core types, base components)
- **Group related work**: Which stories touch similar files/systems?
- **Detect parallels**: Which stories can be worked on simultaneously?
- **Find polish items**: Which stories are enhancements/refinements that can come last?

---

## Step 2: Phase Structure

Every task breakdown follows this 4-phase structure:

### Phase 0: Setup
**Purpose**: Prepare project structure, dependencies, configuration

**Typical tasks:**
- Install dependencies
- Create directory structure
- Set up configuration files
- Initialize templates
- Create type definitions

**Criteria for Setup tasks:**
- Required by ALL other phases
- No dependencies on business logic
- Quick to complete (< 30 minutes total)

### Phase 1: Foundation
**Purpose**: Core infrastructure, schemas, base utilities

**Typical tasks:**
- Database schema setup
- Core data models/types
- Base API endpoints
- Authentication/authorization
- Utility functions

**Criteria for Foundation tasks:**
- Referenced by multiple user stories
- Form the "platform" for feature work
- Usually maps to stories with many dependents

### Phase 2: Stories
**Purpose**: User-facing features from PRD

**Typical tasks:**
- Individual user story implementation
- Feature-specific UI components
- Feature-specific API routes
- Integration between components

**Criteria for Story tasks:**
- Maps 1:1 or 1:N to user stories
- Implements acceptance criteria
- Independently testable
- May have dependencies on Foundation

### Phase 3: Polish
**Purpose**: Refinements, optimizations, documentation

**Typical tasks:**
- Performance optimization
- Error handling improvements
- Accessibility enhancements
- Documentation
- Analytics/monitoring

**Criteria for Polish tasks:**
- Enhances existing functionality
- Not blocking for core feature
- Can be done after basic implementation works

---

## Step 3: Task Format

Each task follows this format:

```markdown
- [ ] **T[NNN]** [Phase X] [Story Label] Task description [Parallel Marker]
```

### Components:

1. **Task ID**: `T001`, `T002`, etc. (3-digit, zero-padded)
2. **Phase Marker**: `[Phase 0]`, `[Phase 1]`, `[Phase 2]`, `[Phase 3]`
3. **Story Label**: `[US-001]`, `[US-002]`, `[Setup]`, `[Polish]`
4. **Task Description**: Clear, actionable description (verb + object)
5. **Parallel Marker**: `[P]` if task can run in parallel with others in same phase

### Examples:

```markdown
- [ ] **T001** [Phase 0] [Setup] Install required dependencies (zod, commander, js-yaml)
- [ ] **T002** [Phase 0] [Setup] Create templates directory structure [P]
- [ ] **T003** [Phase 1] [US-001] Extend UserStory schema with dependencies field
- [ ] **T004** [Phase 1] [US-001] Implement validateDependencies() with circular detection
- [ ] **T005** [Phase 2] [US-003] Create constitution.md template [P]
- [ ] **T006** [Phase 2] [US-003] Update loader to parse constitution [P]
- [ ] **T007** [Phase 3] [Polish] Add comprehensive JSDoc comments to public APIs
```

---

## Step 4: Dependency Ordering Rules

### Within a Phase:
1. **Sequential by default**: Tasks should be done in order unless marked [P]
2. **Parallel markers**: Use `[P]` when tasks:
   - Touch completely different files
   - Have no shared dependencies
   - Can be verified independently
   - Don't conflict when tested together

3. **Dependency inference**: Task B depends on Task A if:
   - B uses code/types created in A
   - B tests functionality implemented in A
   - B's files import from A's files

### Cross-Phase Dependencies:
- **Phase 0 → Phase 1**: All Setup tasks must complete before Foundation starts
- **Phase 1 → Phase 2**: Foundation tasks must complete before their dependent Story tasks
- **Phase 2 → Phase 3**: Core functionality should work before Polish begins
- **Within Phase 2**: Respect user story dependencies from PRD

### Task Granularity:
- **Too small**: "Change variable name", "Add comment" (combine these)
- **Too large**: "Implement entire authentication system" (break into subtasks)
- **Just right**: "Create login form component", "Add JWT validation middleware"

**Rule of thumb**: Each task should take 15-60 minutes

---

## Step 5: Independent Testability

Each user story (Phase 2 tasks) must be independently testable:

### What does "independently testable" mean?
- Can run quality checks (typecheck, lint) after completing the story's tasks
- Can verify acceptance criteria without waiting for other stories
- Can commit the work without breaking existing functionality
- May depend on Foundation (Phase 1), but not on other Stories (Phase 2)

### How to ensure testability:
1. **Include test tasks**: For each story, add explicit testing tasks
2. **Stub external dependencies**: Create mock implementations for dependent stories not yet completed
3. **Incremental commits**: Break stories into sub-tasks that can each be committed
4. **Feature flags**: Suggest feature flags for incomplete integrations

### Example (testable story breakdown):

```markdown
## Phase 2: User Stories

### US-003: Constitution Management System

- [ ] **T015** [Phase 2] [US-003] Create constitution.md template in /templates
- [ ] **T016** [Phase 2] [US-003] Add constitution loader in config/loader.ts
- [ ] **T017** [Phase 2] [US-003] Add constitution validation (MUST/SHOULD format)
- [ ] **T018** [Phase 2] [US-003] Update runner to include constitution in prompt
- [ ] **T019** [Phase 2] [US-003] Update scaffolder to copy constitution template
- [ ] **T020** [Phase 2] [US-003] Run typecheck and lint (verify US-003 passes)
```

After T020, US-003 is complete and testable independently.

---

## Step 6: Tasks.md Template

```markdown
# Implementation Tasks: [Feature Name]

Generated: [Date]
Total Stories: [N]
Total Tasks: [N]

This task breakdown provides dependency-ordered implementation steps for [Feature Name].

---

## Overview

**Phases:**
- **Phase 0 (Setup)**: [N] tasks - Project structure and dependencies
- **Phase 1 (Foundation)**: [N] tasks - Core infrastructure
- **Phase 2 (Stories)**: [N] tasks - User-facing features
- **Phase 3 (Polish)**: [N] tasks - Refinements and optimization

**Parallelization:**
- [N] tasks marked [P] can run in parallel
- Estimated speedup: [X]x with parallel execution

**Testing Strategy:**
- Each story includes explicit test/verification tasks
- Quality checks (typecheck, lint) after each story
- Commit after each completed story

---

## Phase 0: Setup

**Purpose**: Prepare project structure, dependencies, and configuration

- [ ] **T001** [Phase 0] [Setup] Task description
- [ ] **T002** [Phase 0] [Setup] Task description [P]
...

---

## Phase 1: Foundation

**Purpose**: Core infrastructure that multiple stories depend on

**Dependencies**: Phase 0 must complete

- [ ] **T010** [Phase 1] [US-XXX] Task description
- [ ] **T011** [Phase 1] [US-XXX] Task description [P]
...

---

## Phase 2: User Stories

**Purpose**: Implement user-facing features from PRD

**Dependencies**: Phase 1 must complete

### US-001: [Story Title]

**Dependencies**: [US-XXX, US-YYY] or None
**Parallel**: [Yes/No]

- [ ] **T020** [Phase 2] [US-001] Task description
- [ ] **T021** [Phase 2] [US-001] Task description
- [ ] **T022** [Phase 2] [US-001] Run typecheck and lint (verify US-001 passes)

### US-002: [Story Title]

...

---

## Phase 3: Polish

**Purpose**: Refinements, optimizations, and documentation

**Dependencies**: Core functionality from Phase 2

- [ ] **T090** [Phase 3] [Polish] Task description
- [ ] **T091** [Phase 3] [Polish] Task description [P]
...

---

## Summary

**Total Tasks**: [N]
- Phase 0: [N] tasks
- Phase 1: [N] tasks
- Phase 2: [N] tasks
- Phase 3: [N] tasks

**Parallelization**:
- [N] tasks can run in parallel
- Sequential: ~[X] hours
- Parallel: ~[Y] hours (estimated)

**Critical Path**:
Phase 0 → Phase 1 (US-XXX) → Phase 2 (US-YYY) → Phase 3

**Testing Checkpoints**:
1. After each user story implementation
2. After each phase completion
3. Before moving to next phase
```

---

## Step 7: Examples

### Example 1: Simple Linear Feature (No Parallelization)

```markdown
# Implementation Tasks: Add Task Status

Generated: 2026-01-11
Total Stories: 3
Total Tasks: 15

---

## Phase 0: Setup

- [ ] **T001** [Phase 0] [Setup] Create migration file for status column
- [ ] **T002** [Phase 0] [Setup] Define StatusType type definition

---

## Phase 1: Foundation

**Dependencies**: Phase 0 must complete

- [ ] **T003** [Phase 1] [US-001] Add status column to tasks table
- [ ] **T004** [Phase 1] [US-001] Set default value to 'pending'
- [ ] **T005** [Phase 1] [US-001] Run migration and verify schema

---

## Phase 2: User Stories

**Dependencies**: Phase 1 must complete

### US-002: Display Status Badge

- [ ] **T006** [Phase 2] [US-002] Create StatusBadge component
- [ ] **T007** [Phase 2] [US-002] Add badge to TaskCard component
- [ ] **T008** [Phase 2] [US-002] Style badges (gray/blue/green)
- [ ] **T009** [Phase 2] [US-002] Run typecheck and lint

### US-003: Status Update Functionality

**Dependencies**: US-002

- [ ] **T010** [Phase 2] [US-003] Add status update server action
- [ ] **T011** [Phase 2] [US-003] Create status dropdown component
- [ ] **T012** [Phase 2] [US-003] Wire dropdown to update action
- [ ] **T013** [Phase 2] [US-003] Add optimistic UI update
- [ ] **T014** [Phase 2] [US-003] Run typecheck and lint

---

## Phase 3: Polish

- [ ] **T015** [Phase 3] [Polish] Add loading spinner during status update
```

### Example 2: Complex Feature with Parallelization

```markdown
# Implementation Tasks: GitHub Spec Kit Ideas Integration

Generated: 2026-01-11
Total Stories: 12
Total Tasks: 67

---

## Phase 0: Setup

- [ ] **T001** [Phase 0] [Setup] Install js-yaml dependency
- [ ] **T002** [Phase 0] [Setup] Create templates/ directory structure [P]
- [ ] **T003** [Phase 0] [Setup] Create skills/ directory for new skills [P]

---

## Phase 1: Foundation

**Dependencies**: Phase 0 must complete

- [ ] **T004** [Phase 1] [US-001] Extend UserStory schema with dependencies field
- [ ] **T005** [Phase 1] [US-001] Implement validateDependencies() function
- [ ] **T006** [Phase 1] [US-001] Update getNextStory() to respect dependencies
- [ ] **T007** [Phase 1] [US-001] Update parser to extract dependencies [P]
- [ ] **T008** [Phase 1] [US-003] Create progress metadata types [P]

---

## Phase 2: User Stories

**Dependencies**: Phase 1 must complete

### US-002: Constitution Management System

- [ ] **T009** [Phase 2] [US-002] Create constitution.md template
- [ ] **T010** [Phase 2] [US-002] Add constitution loader
- [ ] **T011** [Phase 2] [US-002] Add MUST/SHOULD validation
- [ ] **T012** [Phase 2] [US-002] Update runner to include constitution
- [ ] **T013** [Phase 2] [US-002] Update scaffolder to copy template
- [ ] **T014** [Phase 2] [US-002] Run typecheck and lint

### US-003: Enhanced Progress Tracking

**Dependencies**: US-002
**Parallel**: Can run parallel with US-004

- [ ] **T015** [Phase 2] [US-003] Implement parseProgress() with YAML support [P]
- [ ] **T016** [Phase 2] [US-003] Implement serializeProgress() [P]
- [ ] **T017** [Phase 2] [US-003] Add pattern extraction logic
- [ ] **T018** [Phase 2] [US-003] Update scaffolder to create YAML frontmatter
- [ ] **T019** [Phase 2] [US-003] Update runner to load and update metadata
- [ ] **T020** [Phase 2] [US-003] Run typecheck and lint

### US-004: Technical Planning Template

**Dependencies**: US-002
**Parallel**: Can run parallel with US-003

- [ ] **T021** [Phase 2] [US-004] Create plan.md template [P]
- [ ] **T022** [Phase 2] [US-004] Add CreateFeatureOptions interface [P]
- [ ] **T023** [Phase 2] [US-004] Update scaffolder for withPlan option
- [ ] **T024** [Phase 2] [US-004] Update runner to load plan.md
- [ ] **T025** [Phase 2] [US-004] Run typecheck and lint

...

---

## Phase 3: Polish

- [ ] **T065** [Phase 3] [Polish] Add comprehensive README examples
- [ ] **T066** [Phase 3] [Polish] Run final quality check (typecheck + lint)
- [ ] **T067** [Phase 3] [Polish] Create demo feature for testing

---

## Summary

**Total Tasks**: 67
- Phase 0: 3 tasks
- Phase 1: 5 tasks
- Phase 2: 55 tasks
- Phase 3: 4 tasks

**Parallelization**: 18 tasks marked [P]
```

---

## Step 8: Advanced Patterns

### Pattern 1: Story Dependencies
When US-003 depends on US-002:
```markdown
### US-002: Foundation Feature
- [ ] **T010** [Phase 2] [US-002] Implement core functionality
- [ ] **T011** [Phase 2] [US-002] Run tests

### US-003: Dependent Feature
**Dependencies**: US-002 must complete first
- [ ] **T012** [Phase 2] [US-003] Build on US-002 functionality
```

### Pattern 2: Circular Dependencies (Error Case)
If you detect circular dependencies (US-A depends on US-B, US-B depends on US-A):
```markdown
**⚠️ CIRCULAR DEPENDENCY DETECTED**

Stories US-A and US-B have circular dependencies. Cannot generate valid task order.

**Resolution needed:**
1. Identify which dependency is a "soft" dependency (can be implemented with a stub)
2. Break the cycle by implementing foundation in US-A, then US-B, then complete US-A
3. Update PRD to reflect correct dependency order
```

### Pattern 3: Multi-File Stories
When a story touches many files:
```markdown
### US-007: Complex Multi-File Feature

- [ ] **T040** [Phase 2] [US-007] Update schema types
- [ ] **T041** [Phase 2] [US-007] Add backend parser logic
- [ ] **T042** [Phase 2] [US-007] Update orchestrator runner
- [ ] **T043** [Phase 2] [US-007] Create CLI command
- [ ] **T044** [Phase 2] [US-007] Update documentation
- [ ] **T045** [Phase 2] [US-007] Run typecheck and lint
```

Break into logical sub-tasks but keep them grouped under the story.

### Pattern 4: Research Tasks
For stories marked with `research: true`:
```markdown
### US-009: Feature Requiring Research

**Research Phase**:
- [ ] **T050** [Phase 2] [US-009] Research existing patterns in codebase
- [ ] **T051** [Phase 2] [US-009] Document findings in research/us-009.md

**Implementation Phase**:
**Dependencies**: Research tasks must complete
- [ ] **T052** [Phase 2] [US-009] Implement based on research findings
- [ ] **T053** [Phase 2] [US-009] Run typecheck and lint
```

---

## Step 9: Quality Checklist

Before saving tasks.md, verify:

- [ ] All user stories from PRD are included
- [ ] Each story has at least one task in Phase 2
- [ ] Task IDs are sequential (T001, T002, T003...)
- [ ] Phase markers present on all tasks
- [ ] Story labels match PRD story IDs
- [ ] Dependencies explicitly noted where applicable
- [ ] Parallel markers [P] used appropriately (different files, no conflicts)
- [ ] Each story has a testing/verification task
- [ ] Setup phase covers all required dependencies
- [ ] Foundation phase covers shared infrastructure
- [ ] Polish phase includes only non-blocking enhancements
- [ ] Summary section has accurate counts
- [ ] Generated date included
- [ ] Saved to `relentless/features/[feature-name]/tasks.md`

---

## Step 10: Multi-Agent Support

This skill is designed to work with:
- **Claude Code**: Full support, can use Task tool for complex analysis
- **Amp**: Full support, analyze PRD structure automatically
- **Gemini**: Full support, infer dependencies from acceptance criteria
- **Codex**: Full support, generate tasks programmatically
- **Droid**: Full support, interactive clarification if dependencies unclear

The skill does NOT require agent-specific features - it only needs:
- File reading capability (read PRD)
- Dependency analysis (understand story relationships)
- Markdown file writing (save tasks.md)

---

## Common Pitfalls

### ❌ Avoid:
1. **Too many tasks**: Breaking "Add comma" into separate task
2. **Too few tasks**: "Implement entire feature" as one task
3. **Missing [P] markers**: Serializing tasks that could run in parallel
4. **Wrong phases**: Putting polish items in Foundation
5. **Missing test tasks**: Not explicitly including verification steps
6. **Ignoring dependencies**: Tasks in wrong order, causing blockers

### ✅ Do:
1. **Right-sized tasks**: 15-60 minutes each
2. **Clear dependencies**: Explicitly mark which tasks depend on others
3. **Parallel opportunities**: Use [P] for tasks on different files/systems
4. **Test after stories**: Include typecheck/lint tasks after each story
5. **Logical grouping**: Keep related tasks together under story headers
6. **Summary stats**: Provide total counts and parallelization estimates
