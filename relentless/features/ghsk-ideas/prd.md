# PRD: GitHub Spec Kit Ideas Integration

## Introduction

This feature integrates sophisticated specification-driven development capabilities from speckit into relentless while maintaining its agent-agnostic simplicity. The integration creates a professional, globally-installed binary with powerful enhancements for dependency-ordered tasks, constitution-based governance, quality checklists, consistency analysis, and enhanced orchestration.

## User Stories

### US-000: Single Binary with PATH Installation
**Description:** As a relentless user, I want relentless installed as a global binary in my PATH so that I can call it from anywhere without dealing with shell scripts.

**Acceptance Criteria:**
- [ ] package.json has "bin" field pointing to bin/relentless.ts
- [ ] bin/relentless.ts has #!/usr/bin/env bun shebang
- [ ] Binary can be installed globally via `bun install -g`
- [ ] relentless command available in PATH after install
- [ ] All commands work: init, run, convert, analyze, features, status, reset
- [ ] Shell script (bin/relentless.sh) completely removed
- [ ] Scaffolder no longer copies shell script
- [ ] Can call `relentless init` from any directory
- [ ] Can call `relentless run --feature <name>` from project root
- [ ] README.md fully reviewed and all shell script references replaced with binary commands
- [ ] CLAUDE.md reviewed and updated with new CLI usage patterns
- [ ] All documentation files searched and updated: replace ./relentless/bin/relentless.sh with relentless
- [ ] Scaffolder output messages updated to remove all shell script references
- [ ] All code comments reviewed and updated to remove shell script mentions
- [ ] Template files reviewed: prompt.md and other templates use binary commands
- [ ] All example commands updated to use relentless <action> --params format
- [ ] Installation instructions complete: document bun install -g and bunx relentless
- [ ] Skills documentation updated: prd and relentless skills reference binary
- [ ] Typecheck passes
- [ ] Linter passes (0 warnings)
- [ ] Verify in terminal: `which relentless` shows installed binary
- [ ] Verify documentation: grep for .sh and relentless.sh returns no results in docs

---

### US-001: Dependency-Ordered Task Schema
**Description:** As a developer, I want user stories to support dependencies, phases, and parallel execution markers so that I can express complex relationships between tasks.

**Acceptance Criteria:**
- [ ] UserStory schema extended with dependencies, parallel, phase fields
- [ ] getNextStory() respects dependencies and only returns stories with completed prerequisites
- [ ] validateDependencies() detects circular dependencies and throws error
- [ ] Parser extracts "Dependencies: US-001, US-002" from PRD markdown
- [ ] Typecheck passes
- [ ] Linter passes (0 warnings)

---

### US-002: Constitution Management System
**Description:** As a project lead, I want a constitution.md file containing project principles, patterns, and constraints so that all agents follow consistent guidelines.

**Acceptance Criteria:**
- [ ] Template created at /templates/constitution.md with clear structure
- [ ] Loader.ts reads and parses constitution.md
- [ ] Runner.ts includes constitution in prompt context
- [ ] Scaffolder copies constitution template during init
- [ ] Constitution validates principles (MUST/SHOULD format)
- [ ] Typecheck passes
- [ ] Linter passes (0 warnings)

---

### US-003: Enhanced Progress Tracking with Metadata
**Description:** As an agent, I want progress.txt to have structured YAML frontmatter so that I can access machine-readable context about patterns and blockers.

**Acceptance Criteria:**
- [ ] Progress.txt created with YAML frontmatter
- [ ] Runner updates frontmatter after each iteration (last_updated, stories_completed)
- [ ] Patterns array updated with learnings from progress log
- [ ] Prompt context includes parsed frontmatter patterns
- [ ] Typecheck passes
- [ ] Linter passes (0 warnings)

---

### US-004: Technical Planning Template
**Description:** As a developer, I want an optional plan.md template so that I can document technical design decisions before implementation.

**Acceptance Criteria:**
- [ ] Template created at /templates/plan.md with all sections
- [ ] Scaffolder supports `createFeature(name, {withPlan: true})`
- [ ] Plan.md copied to feature directory when flag enabled
- [ ] Prompt references plan.md if present in feature directory
- [ ] Typecheck passes
- [ ] Linter passes (0 warnings)

---

### US-005: Quality Checklist Generator Skill
**Description:** As a quality-focused developer, I want a skill that generates custom quality checklists based on my PRD so that I can ensure comprehensive requirement validation.

**Acceptance Criteria:**
- [ ] SKILL.md created with clear instructions for checklist generation
- [ ] Skill analyzes PRD and infers appropriate checklist domain
- [ ] Checklist has 20-40 items across 5-7 categories
- [ ] 80% of items reference specific spec sections or have [Gap]/[Ambiguity] markers
- [ ] Checklist saved to feature directory
- [ ] Skill works with Claude Code, Amp, Gemini
- [ ] Typecheck passes
- [ ] Linter passes (0 warnings)

---

### US-006: Cross-Artifact Consistency Analysis Command
**Description:** As a developer, I want an analyze command that checks consistency across PRD, JSON, and code so that I can catch errors early.

**Acceptance Criteria:**
- [ ] Command added to bin/relentless.ts with analyze subcommand
- [ ] Analyzer checks all 5 consistency categories
- [ ] Output includes severity ratings and recommendations
- [ ] Report includes coverage summary (stories completed/total per requirement)
- [ ] Analyzer handles missing files gracefully
- [ ] Typecheck passes
- [ ] Linter passes (0 warnings)
- [ ] Verify in terminal: Run analyze command and review output

---

### US-007: Interactive Clarification Skill
**Description:** As a PRD author, I want an interactive clarification skill that asks targeted questions about ambiguities so that I can create clearer specifications.

**Acceptance Criteria:**
- [ ] SKILL.md created with clarification workflow
- [ ] Skill scans PRD across 9 ambiguity categories
- [ ] Generates max 5 questions with multiple-choice options
- [ ] Adds [NEEDS CLARIFICATION] markers (max 3 per spec)
- [ ] Saves clarification-log.md with questions and answers
- [ ] Updates PRD in-place after each clarification
- [ ] Typecheck passes
- [ ] Linter passes (0 warnings)

---

### US-008: Dependency-Ordered Task Breakdown Skill
**Description:** As a developer, I want a skill that generates dependency-ordered task breakdowns with phase structure so that I can visualize implementation order.

**Acceptance Criteria:**
- [ ] SKILL.md created with task breakdown instructions
- [ ] Skill generates phase structure (Setup → Foundation → Stories → Polish)
- [ ] Tasks include IDs (T001+), phase markers, story labels [US1]
- [ ] Parallel tasks marked with [P]
- [ ] Each story independently testable
- [ ] Saves to tasks.md in feature directory
- [ ] Typecheck passes
- [ ] Linter passes (0 warnings)

---

### US-009: Research Phase Support
**Description:** As an agent, I want an optional research phase before implementation so that I can explore existing patterns and make better decisions.

**Acceptance Criteria:**
- [ ] UserStory schema has optional research field
- [ ] Runner detects research flag and runs two-phase execution
- [ ] Research phase saves findings to research/<story-id>.md
- [ ] Second phase includes research findings in prompt
- [ ] Prompt template updated with research instructions
- [ ] Typecheck passes
- [ ] Linter passes (0 warnings)

---

### US-010: Branch Management with Auto-Numbering
**Description:** As a developer, I want features to have auto-generated numbers (001-feature-name) so that I can track them in order.

**Acceptance Criteria:**
- [ ] Scaffolder supports createFeature with autoNumber option
- [ ] Feature directories created with 001- prefix when enabled
- [ ] PRD branchName auto-generated with number prefix
- [ ] listFeatures() returns numbered features correctly
- [ ] Existing features without numbers still work
- [ ] Typecheck passes
- [ ] Linter passes (0 warnings)

---

### US-011: GitHub Issues Generator
**Description:** As a team lead, I want to convert user stories to GitHub issues so that I can track work in GitHub Projects.

**Acceptance Criteria:**
- [ ] Command added to bin/relentless.ts
- [ ] Issues.ts creates GitHub issues via gh CLI
- [ ] Each story mapped to issue with proper formatting
- [ ] Labels inferred from story type (database, ui, api, etc.)
- [ ] Dependencies mapped to issue relationships
- [ ] Safety: validates git remote matches before creating issues
- [ ] Typecheck passes
- [ ] Linter passes (0 warnings)
- [ ] Verify in browser: Check created issues on GitHub
