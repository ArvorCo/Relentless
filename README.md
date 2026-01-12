# Relentless

<div align="center">

**Universal AI Agent Orchestrator**

[![GitHub](https://img.shields.io/badge/GitHub-ArvorCo%2FRelentless-blue?logo=github)](https://github.com/ArvorCo/Relentless)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

*Run any AI coding agent repeatedly until all tasks are complete.*

</div>

---

## Quick Start

### Choose Your Workflow

**For Claude Code, Amp, or OpenCode users** (Recommended - Full Skills Support):
```bash
# 1. Install Relentless globally
npm install -g @arvorco/relentless
# or with bun
bun install -g @arvorco/relentless
# or directly from GitHub
bun install -g github:ArvorCo/Relentless

# 2. Initialize in your project
cd your-project
relentless init

# 3. Create constitution (personalized governance)
/relentless.constitution

# 4. Create feature specification
/relentless.specify Add user authentication with OAuth2

# 5. Generate plan, tasks, and checklist
/relentless.plan I'm using React, TypeScript, PostgreSQL
/relentless.tasks
/relentless.checklist

# 6. Convert tasks to JSON and run
relentless convert relentless/features/003-user-auth/tasks.md --feature 003-user-auth
relentless run --feature 003-user-auth --tui
```

**For Droid, Codex, or other agents** (Manual Workflow):
```bash
# 1. Install and initialize
npm install -g @arvorco/relentless
# or
bun install -g @arvorco/relentless
cd your-project
relentless init

# 2. Create feature
relentless features create user-auth

# 3. Manually create or prompt agent to create files:
# - relentless/constitution.md
# - relentless/features/001-user-auth/spec.md
# - relentless/features/001-user-auth/plan.md
# - relentless/features/001-user-auth/tasks.md

# 4. Convert and run
relentless convert relentless/features/001-user-auth/tasks.md --feature 001-user-auth
relentless run --feature 001-user-auth --tui
```

See [Supported Agents](#supported-agents) section for detailed workflows per agent.

### Ralph Wiggum Method (Classic Workflow)

You can still use the original Ralph Wiggum workflow with direct PRD creation:

```bash
# 1. Install and initialize
bun install -g github:ArvorCo/Relentless
cd your-project
relentless init

# 2. Create PRD using prd skill (Claude/Amp only)
claude "Load the prd skill and create a PRD for user authentication"

# 3. Convert and run
relentless convert relentless/features/user-auth/prd.md --feature user-auth
relentless run --feature user-auth --tui
```

**Alternative: Create PRD manually**

Create `relentless/features/my-feature/prd.md`:
```markdown
# My Feature

## User Stories

### US-001: First Task
As a user, I want X so that Y.

**Acceptance Criteria:**
- Criterion 1
- Criterion 2
- Typecheck passes
```

That's it. Relentless will run your AI agent in a loop until all PRD stories are complete.

---

## What is Relentless?

Relentless is a universal AI agent orchestrator that runs any AI coding agent (Claude Code, Amp, OpenCode, Codex, Droid, Gemini) in an autonomous loop until all tasks are complete.

Each iteration spawns a **fresh agent instance** with clean context. Memory persists via:
- **Git history** - commits from previous iterations
- **progress.txt** - learnings and context notes
- **prd.json** - task completion status

Evolved from the [Ralph Wiggum Pattern](https://ghuntley.com/ralph/).

### Features

#### Core Orchestration
- **Beautiful TUI** - Real-time terminal interface with progress bars, story grid, and agent output
- **Intelligent Agent Fallback** - Automatically switches agents when rate limits are hit
- **Rate Limit Detection** - Detects limits for Claude, Codex, Amp, OpenCode, Gemini, and Droid
- **Auto-Recovery** - Switches back to preferred agent when limits reset
- **Auto-Numbered Branches** - Automatic feature numbering (001-feature, 002-feature, etc.)

#### Specification & Planning (Relentless Commands Integration)
- **Interactive Specification** - `/relentless.specify` command for creating feature specs from natural language
- **Technical Planning** - `/relentless.plan` command for generating implementation plans
- **Hierarchical Task Breakdown** - 4-phase structure (Setup → Foundation → Stories → Polish) with dependency ordering
- **Quality Checklists** - Domain-specific validation checklists generated from PRD requirements
- **Interactive Clarification** - Systematic ambiguity detection with targeted questions and multiple-choice options
- **Constitution Management** - Project-level principles, patterns, and constraints (MUST/SHOULD format)

#### Task & Dependency Management
- **Dependency-Ordered Execution** - Stories with dependencies are executed in correct order
- **Circular Dependency Detection** - Validates dependencies and prevents circular references
- **Parallel Task Markers** - Tasks marked with `[P]` can run simultaneously
- **Phase-Based Planning** - Tasks organized into Setup, Foundation, Stories, and Polish phases
- **Research Phase Support** - Stories can require research before implementation

#### Analysis & Integration
- **Cross-Artifact Analysis** - Consistency checks across PRD, JSON, progress, and constitution files
- **GitHub Issues Generation** - Convert user stories directly to GitHub issues via `gh` CLI
- **Progress Tracking** - YAML frontmatter metadata in progress.txt for machine-readable context

#### Skills for AI Agents
Five specialized skills for Claude Code, Amp, and other AI agents:
- **prd skill** - Generate comprehensive PRDs with acceptance criteria
- **tasks skill** - Create dependency-ordered task breakdowns
- **checklist skill** - Generate domain-specific quality checklists
- **clarify skill** - Identify and resolve PRD ambiguities
- **relentless skill** - Integration commands for orchestration

---

## Installation

### Prerequisites

- [Bun](https://bun.sh) runtime (recommended) or Node.js 20+
- At least one AI coding agent installed (Claude Code, Amp, etc.)

```bash
# Install Bun (recommended)
curl -fsSL https://bun.sh/install | bash
```

### Option 1: Install from npm (Recommended)

```bash
# Using npm
npm install -g @arvorco/relentless

# Using bun (faster)
bun install -g @arvorco/relentless

# Using bunx (no installation)
bunx @arvorco/relentless init
```

### Option 2: Install from GitHub

```bash
# Latest stable release
bun install -g github:ArvorCo/Relentless

# Or run directly
bunx github:ArvorCo/Relentless init
```

### Option 3: Clone for Development

```bash
git clone https://github.com/ArvorCo/Relentless.git
cd Relentless
bun install

# Run locally
bun run bin/relentless.ts --help
```

---

## Step-by-Step Guide

### Step 1: Initialize Relentless in Your Project

```bash
cd your-project
relentless init
```

This creates:
```
your-project/
├── relentless/
│   ├── config.json            # Configuration
│   ├── prompt.md              # Agent prompt template
│   └── features/              # Feature folders
│       └── .gitkeep
└── .claude/skills/            # Skills (for Claude Code)
    ├── prd/
    └── relentless/
```

### Step 2: Create a Feature

```bash
relentless features create my-feature
```

This creates:
```
relentless/features/my-feature/
└── progress.txt
```

### Step 3: Write Your PRD

Create `relentless/features/my-feature/prd.md`:

```markdown
# My Feature

## Overview
Description of what this feature does.

## User Stories

### US-001: First Story
**Description:** As a user, I want X so that Y.

**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Typecheck passes

### US-002: Second Story
**Description:** As a user, I want A so that B.

**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Typecheck passes
```

**Or use the prd skill with Claude Code:**
```bash
claude "Load the prd skill and create a PRD for adding user authentication"
```

### Step 4: Convert PRD to JSON

```bash
relentless convert relentless/features/my-feature/prd.md --feature my-feature
```

This generates `relentless/features/my-feature/prd.json`:
```json
{
  "project": "My Project",
  "branchName": "relentless/my-feature",
  "userStories": [
    {
      "id": "US-001",
      "title": "First Story",
      "passes": false
    }
  ]
}
```

### Step 5: Run the Orchestrator

```bash
relentless run --feature my-feature
```

**Options:**
```bash
# Run with beautiful terminal UI
relentless run --feature my-feature --tui

# Specify agent (default: claude)
relentless run --feature my-feature --agent amp

# Set max iterations (default: 20)
relentless run --feature my-feature --max-iterations 30

# Show status of all stories
relentless status --feature my-feature

# Reset a story to re-run it
relentless reset US-005 --feature my-feature

# Available agents: claude, amp, opencode, codex, droid, gemini, auto
```

The orchestrator will:
1. Read `prd.json` to find incomplete stories (`passes: false`)
2. Build a prompt from `prompt.md` with the feature context
3. Invoke the AI agent
4. Agent works on one story, commits, updates prd.json
5. Repeat until all stories have `passes: true`
6. Stop when agent outputs `<promise>COMPLETE</promise>`

---

## Project Structure

After initialization, your project will have:

```
your-project/
├── relentless/
│   ├── config.json                # Relentless configuration
│   ├── prompt.md                  # Prompt template for agents
│   └── features/
│       └── my-feature/            # or 001-my-feature with auto-numbering
│           ├── prd.md             # Your PRD (markdown)
│           ├── prd.json           # Converted PRD (JSON)
│           ├── progress.txt       # Progress log with YAML frontmatter
│           ├── plan.md            # Technical implementation plan (optional)
│           ├── tasks.md           # Dependency-ordered task breakdown (optional)
│           ├── checklist.md       # Quality validation checklist (optional)
│           ├── constitution.md    # Project coding principles (optional)
│           ├── clarification-log.md  # Ambiguity resolutions (optional)
│           └── research/          # Research findings (optional)
│               └── US-XXX.md
├── .claude/
│   ├── skills/                    # Skills for Claude Code
│   │   ├── prd/SKILL.md
│   │   ├── tasks/SKILL.md
│   │   ├── checklist/SKILL.md
│   │   ├── clarify/SKILL.md
│   │   └── relentless/SKILL.md
│   └── commands/                  # Relentless Commands commands
│       ├── relentless.specify.md
│       ├── relentless.plan.md
│       ├── relentless.tasks.md
│       ├── relentless.checklist.md
│       ├── relentless.clarify.md
│       ├── relentless.constitution.md
│       ├── relentless.analyze.md
│       ├── relentless.implement.md
│       └── relentless.taskstoissues.md
└── templates/                     # Templates copied from Relentless
    ├── prompt.md
    ├── plan.md
    ├── constitution.md
    └── progress.txt
```

**Note:** Files marked as "(optional)" are created when using the Relentless Commands workflow or specific CLI options (`--with-plan`, etc.).

---

## Supported Agents

Relentless works with multiple AI coding agents. Feature generation workflow varies by agent capabilities:

### Tier 1: Full Skills Support (Recommended)

Full `/relentless.*` command support with interactive workflows:

| Agent | Command | Status |
|-------|---------|--------|
| **Claude Code** | `claude` | ✅ Full skills support |
| **Amp** | `amp` | ✅ Full skills support |
| **OpenCode** | `opencode` | ✅ Full skills support |

**Workflow:**
```bash
/relentless.constitution
/relentless.specify Add user authentication
/relentless.plan
/relentless.tasks
/relentless.checklist
relentless convert tasks.md --feature 003-user-auth
relentless run --feature 003-user-auth --tui
```

### Tier 2: Extensions/Hybrid Support

Support through extensions or alternative mechanisms:

| Agent | Command | Status |
|-------|---------|--------|
| **Gemini** | `gemini` | 🔄 Extensions (see below) |

**Gemini Setup:** See [docs/GEMINI_SETUP.md](./docs/GEMINI_SETUP.md) for extensions integration guide.

### Tier 3: Manual/CLI Workflow

Use CLI commands and manual file creation:

| Agent | Command | Status |
|-------|---------|--------|
| **Droid** | `droid` | 📝 Manual workflow |
| **Codex** | `codex` | 📝 Manual workflow |

**Manual Workflow:**
```bash
# 1. Initialize and create feature structure
relentless init
relentless features create user-auth --with-plan

# 2. Create constitution manually or prompt agent
# Manual: Edit relentless/constitution.md
# Or prompt:
droid "Create relentless/constitution.md with governance rules for a TypeScript/React project with strict testing"

# 3. Create specification files by prompting agent
droid "Create relentless/features/001-user-auth/spec.md with feature specification for user authentication with OAuth2"

# 4. Create technical plan
droid "Create relentless/features/001-user-auth/plan.md with technical implementation plan using React, TypeScript, PostgreSQL"

# 5. Create user stories (most important!)
droid "Create relentless/features/001-user-auth/tasks.md with user stories in format:
### US-001: Title
**Description:** As a [user], I want [goal] so that [benefit].
**Acceptance Criteria:**
- [ ] Specific criterion
- [ ] Typecheck passes
- [ ] Tests pass"

# 6. Convert and run orchestration
relentless convert relentless/features/001-user-auth/tasks.md --feature 001-user-auth
relentless run --feature 001-user-auth --tui
```

**Pro Tip for Droid/Codex:** Reference the skill files for detailed instructions:
```bash
droid "Read .claude/skills/tasks/SKILL.md and create tasks.md following that format"
```

### Check Agent Availability

```bash
# List installed agents
relentless agents list

# Check agent health
relentless agents doctor
```

---

## CLI Commands

### Core Commands

```bash
# Initialize Relentless in current project
relentless init

# Run orchestration for a feature
relentless run --feature <name> [--agent <name>] [--max-iterations <n>] [--tui]

# Show status of all user stories
relentless status --feature <name>

# Reset a story to incomplete (to re-run it)
relentless reset <story-id> --feature <name>
```

### Feature Management

```bash
# Create a new feature (with optional auto-numbering)
relentless features create <name>
relentless features create <name> --auto-number  # Creates 001-<name>, 002-<name>, etc.
relentless features create <name> --with-plan    # Include plan.md template

# List all features
relentless features list

# Convert PRD markdown to JSON
relentless convert <prd.md> --feature <name>
relentless convert <prd.md> --feature <name> --auto-number

# Create PRD from natural language description
relentless prd "<feature description>"
```

### Analysis & Integration

```bash
# Analyze cross-artifact consistency (PRD, JSON, progress, constitution)
relentless analyze --feature <name>

# Generate GitHub issues from user stories
relentless issues --feature <name> [--dry-run] [--all]
```

### Agent Management

```bash
# List installed agents
relentless agents list

# Check agent health
relentless agents doctor
```

### Relentless Commands Commands (For Claude Code & Compatible Agents)

These commands are available when using Claude Code or other agents that support custom commands:

```bash
# Create or update feature specification
/relentless.specify <feature description>

# Generate technical implementation plan
/relentless.plan [options]

# Generate dependency-ordered task breakdown
/relentless.tasks

# Generate domain-specific quality checklist
/relentless.checklist

# Clarify ambiguities in PRD
/relentless.clarify

# Manage project constitution
/relentless.constitution

# Analyze cross-artifact consistency
/relentless.analyze

# Convert tasks to GitHub issues
/relentless.taskstoissues

# Execute implementation workflow
/relentless.implement
```

### Alternative: Run with bunx (No Installation)

```bash
# Initialize
bunx github:ArvorCo/Relentless init

# Run orchestration
bunx github:ArvorCo/Relentless run --feature <name>

# Check status
bunx github:ArvorCo/Relentless status --feature <name>
```

---

## Relentless Commands Integration (Optional but Recommended)

Relentless now includes comprehensive Relentless Commands-inspired features for structured specification, planning, and quality assurance. These features work with Claude Code and other compatible AI agents.

### Overview

The Relentless Commands workflow provides:
1. **Interactive Specification** - Natural language to structured specs
2. **Technical Planning** - Implementation design and architecture
3. **Hierarchical Task Breakdown** - Dependency-ordered, phase-structured tasks
4. **Quality Checklists** - Domain-specific validation
5. **Constitution Management** - Project-level coding principles

### Workflow

#### 1. Create Feature Specification

Use the `/relentless.specify` command to create a feature spec from a natural language description:

```bash
/relentless.specify Add user authentication with email/password and OAuth2 support
```

This will:
- Generate a short name for the feature (e.g., "user-auth")
- Check for existing branches and auto-number (e.g., "003-user-auth")
- Create a comprehensive specification with:
  - User scenarios and acceptance criteria
  - Functional requirements
  - Success criteria (measurable, technology-agnostic)
  - Key entities and data models
  - Dependencies and assumptions
- Validate specification quality with a checklist
- Identify ambiguities and present clarification questions (max 3)

**Optional: Clarify Ambiguities**

If the spec has unclear areas, use `/relentless.clarify` to systematically resolve them:

```bash
/relentless.clarify
```

This scans for 9 types of ambiguities:
- Behavioral (what happens when...)
- Data (required fields, validation)
- UI/UX (where, how, what style)
- Integration (which APIs, fallbacks)
- Permissions (who can do what)
- Performance (limits, pagination)
- Error handling (what errors, how displayed)
- State management (persistence)
- Edge cases (empty data, race conditions)

#### 2. Generate Technical Plan

Create an implementation plan using `/relentless.plan`:

```bash
/relentless.plan I'm building with React, TypeScript, and PostgreSQL
```

This generates:
- Technical architecture and design patterns
- Data models and API contracts
- Integration points and migration strategy
- Testing strategy (unit, integration, E2E)
- Security considerations
- Rollout and monitoring plan

Saved to: `relentless/features/<feature-name>/plan.md`

#### 3. Generate Task Breakdown

Break down the plan into dependency-ordered tasks:

```bash
/relentless.tasks
```

**Hierarchical 4-Phase Structure:**

```markdown
Phase 0: Setup
  - Install dependencies
  - Create directory structure
  - Initialize configuration

Phase 1: Foundation
  - Database schema
  - Core types and models
  - Base utilities

Phase 2: Stories
  - US-001: Feature implementation
  - US-002: UI components
  - US-003: API endpoints

Phase 3: Polish
  - Performance optimization
  - Documentation
  - Analytics
```

**Key Features:**
- **Task IDs**: T001, T002, T003 (sequential)
- **Phase Markers**: `[Phase 0]`, `[Phase 1]`, etc.
- **Story Labels**: `[US-001]`, `[US-002]`
- **Parallel Markers**: `[P]` for tasks that can run simultaneously
- **Dependencies**: Tasks ordered by dependencies
- **Testing**: Explicit verification tasks after each story

Example:
```markdown
- [ ] **T001** [Phase 0] [Setup] Install required dependencies (zod, commander)
- [ ] **T002** [Phase 1] [US-001] Create User schema with email field [P]
- [ ] **T003** [Phase 1] [US-001] Add password hashing utility [P]
- [ ] **T004** [Phase 2] [US-001] Implement login endpoint
- [ ] **T005** [Phase 2] [US-001] Run typecheck and lint (verify US-001)
```

Saved to: `relentless/features/<feature-name>/tasks.md`

#### 4. Generate Quality Checklist

Create a domain-specific quality checklist:

```bash
/relentless.checklist
```

This generates 20-40 validation items across 5-7 categories:
- Schema & Database
- Backend Logic
- Frontend Components
- Integration & Flow
- Testing & Validation
- Security & Permissions
- Performance & UX

**80% of items** reference specific PRD sections or identify gaps/ambiguities:
- `[US-001]` - References user story
- `[Gap]` - Missing specification
- `[Ambiguity]` - Unclear requirement
- `[Edge Case]` - Potential edge case

Saved to: `relentless/features/<feature-name>/checklist.md`

### Hierarchical Planning Details

#### Phase Structure

**Phase 0: Setup** (Infrastructure)
- Project structure and dependencies
- Configuration files
- Base templates and types
- Required by all other phases

**Phase 1: Foundation** (Core Platform)
- Database schemas and migrations
- Core data models and types
- Base API endpoints
- Authentication/authorization
- Utility functions
- Used by multiple user stories

**Phase 2: Stories** (User Features)
- Individual user story implementation
- Feature-specific UI components
- Feature-specific API routes
- Integration between components
- Independently testable

**Phase 3: Polish** (Refinement)
- Performance optimization
- Error handling improvements
- Accessibility enhancements
- Documentation and analytics

#### Dependency Management

**Story Dependencies in PRD:**

```json
{
  "id": "US-002",
  "title": "User Profile Page",
  "dependencies": ["US-001"],
  "passes": false
}
```

**Features:**
- **Validation**: Checks for missing or circular dependencies
- **Execution Order**: Stories run in dependency order
- **Independent Testing**: Each story is independently testable
- **Parallel Markers**: Stories without dependencies can run in parallel

#### Task Granularity

Each task should take 15-60 minutes:
- **Too small**: "Change variable name" (combine these)
- **Too large**: "Implement entire authentication" (break into subtasks)
- **Just right**: "Create login form component", "Add JWT validation middleware"

### Constitution Management

Create a project constitution to enforce coding standards:

```bash
/relentless.constitution
```

The constitution defines:
- **MUST** rules (enforced, blocking)
- **SHOULD** rules (best practices, warnings)

Categories:
- Architecture patterns
- Code quality standards
- Version control practices
- Technology stack constraints
- Security requirements
- Performance expectations

Saved to: `relentless/features/<feature-name>/constitution.md`

Agents check the constitution before implementing each story.

### Skills for AI Agents

Five skills are automatically installed in `.claude/skills/`:

**1. prd skill** - Generate PRDs
```bash
claude "Load the prd skill and create a PRD for user authentication"
```

**2. tasks skill** - Generate task breakdowns
```bash
claude "Load the tasks skill and generate tasks for the auth feature"
```

**3. checklist skill** - Generate quality checklists
```bash
claude "Load the checklist skill and create a checklist for the API feature"
```

**4. clarify skill** - Clarify ambiguities
```bash
claude "Load the clarify skill and identify ambiguities in the PRD"
```

**5. relentless skill** - Orchestration integration
```bash
claude "Load the relentless skill and show me the next incomplete story"
```

### Complete Workflow Example

```bash
# 1. Initialize project
relentless init

# 2. Create feature specification (Claude Code)
/relentless.specify Add user authentication with OAuth2 and 2FA support

# 3. Clarify any ambiguities (if needed)
/relentless.clarify

# 4. Generate technical plan
/relentless.plan I'm using React, Node.js, PostgreSQL

# 5. Generate task breakdown
/relentless.tasks

# 6. Generate quality checklist
/relentless.checklist

# 7. Convert spec to PRD for orchestration
relentless convert relentless/features/003-user-auth/spec.md --feature 003-user-auth

# 8. Run orchestration
relentless run --feature 003-user-auth --tui

# 9. Generate GitHub issues (optional)
relentless issues --feature 003-user-auth
```

---

## Quality Assurance Commands

### Analyze Cross-Artifact Consistency

Check for issues across your PRD, JSON, and progress files:

```bash
relentless analyze --feature my-feature
```

This checks for:
- **Schema Validation** - Missing required fields, invalid story IDs
- **Dependency Consistency** - Circular dependencies, missing dependencies
- **File Existence** - Missing prd.md, progress.txt, constitution.md
- **Story Completeness** - Stories with few acceptance criteria
- **Progress Log Sync** - Completed stories not mentioned in progress.txt

Example output:
```
╔═══════════════════════════════════════════════════════╗
║  Cross-Artifact Consistency Analysis                 ║
╚═══════════════════════════════════════════════════════╝

Feature: my-feature
Summary:
  Stories: 10/12 completed (2 pending)
  Issues: 3 total
    Critical: 0
    Warnings: 2
    Info: 1
```

### Generate GitHub Issues

Convert user stories directly to GitHub issues:

```bash
# Preview what would be created (dry run)
relentless issues --feature my-feature --dry-run

# Create issues for incomplete stories only
relentless issues --feature my-feature

# Create issues for all stories (including completed)
relentless issues --feature my-feature --all
```

**Requirements:**
- [GitHub CLI (gh)](https://cli.github.com/) must be installed and authenticated
- Git remote must be a GitHub repository

Each issue includes:
- Story title and description
- Acceptance criteria as checkboxes
- Labels based on story type (database, ui, api, etc.)
- Priority labels (high, medium, low)
- Dependencies listed

---

## Configuration

`relentless/config.json`:

```json
{
  "defaultAgent": "claude",
  "agents": {
    "claude": {
      "model": "sonnet",
      "dangerouslyAllowAll": true
    }
  },
  "fallback": {
    "enabled": true,
    "priority": ["claude", "codex", "amp", "opencode", "gemini"],
    "autoRecovery": true
  },
  "execution": {
    "maxIterations": 20,
    "iterationDelay": 2000
  }
}
```

---

## Writing Good PRDs

### Right-Sized Stories

Each story should be completable in **one context window**. If a task is too big, the agent runs out of context before finishing.

**Good story sizes:**
- Add a database column and migration
- Create a UI component
- Implement a single API endpoint

**Too big (split these):**
- "Build the entire dashboard"
- "Add authentication"
- "Refactor the API"

### Acceptance Criteria

Make criteria **verifiable**, not vague:

**Good:**
- "Button shows confirmation dialog before deleting"
- "Email field validates format on blur"
- "Typecheck passes"

**Bad:**
- "Works correctly"
- "Good UX"
- "Handles edge cases"

### Always Include

- `Typecheck passes` in every story
- `Verify in browser` for UI stories

### Advanced PRD Features

#### Story Dependencies

Stories can depend on other stories. Relentless ensures dependencies are completed first and validates for circular dependencies:

**In Markdown:**
```markdown
### US-002: Add User Profile Page
**Dependencies:** US-001
**Description:** Create user profile page showing user information.
```

**In prd.json:**
```json
{
  "id": "US-002",
  "title": "Add User Profile Page",
  "dependencies": ["US-001"],
  "passes": false
}
```

**Features:**
- Validates dependencies exist
- Detects circular dependencies (US-A → US-B → US-A)
- Executes in correct order
- Shows dependency errors in `relentless analyze`

#### Parallel Execution

Mark stories that can run simultaneously:

```json
{
  "id": "US-003",
  "title": "Add Analytics Dashboard",
  "parallel": true,
  "passes": false
}
```

Stories without dependencies and marked `parallel: true` can be implemented concurrently by different agent runs.

#### Phase Markers

Organize stories into phases for better task planning:

```json
{
  "id": "US-001",
  "title": "Create Database Schema",
  "phase": "Foundation",
  "passes": false
}
```

**Common phases:**
- `Setup` - Infrastructure and dependencies
- `Foundation` - Core platform and shared code
- `Stories` - User-facing features
- `Polish` - Optimizations and refinements

#### Research Phase

For complex stories requiring exploration before implementation:

**In Markdown:**
```markdown
### US-005: Integrate Payment Provider
**Research Required:** true
**Description:** Research best payment provider options before implementing.
```

**In prd.json:**
```json
{
  "id": "US-005",
  "title": "Integrate Payment Provider",
  "research": true,
  "passes": false
}
```

When `research: true`, Relentless will:
1. Run a research phase first to gather context
2. Save findings to `relentless/features/<feature>/research/US-005.md`
3. Then run the implementation phase with research context

---

## How It Works

### Core Orchestration Loop

1. **Fresh Context Each Iteration** - Each loop spawns a new agent instance with clean context
2. **Load Constitution** - Agent reads project coding principles and constraints (if present)
3. **Agent Reads PRD** - Finds the next story with `passes: false` that has dependencies met
4. **Dependency Validation** - Ensures all story dependencies are completed before execution
5. **Research Phase** (if needed) - Agent explores and documents findings for complex stories
6. **Agent Implements** - Makes changes, follows constitution rules, runs tests, commits
7. **Agent Updates PRD** - Sets `passes: true` for completed story
8. **Agent Updates Progress** - Appends learnings to `progress.txt` with YAML frontmatter
9. **Loop Continues** - Until all stories pass or max iterations reached
10. **Completion Signal** - Agent outputs `<promise>COMPLETE</promise>` when done

### Dependency Resolution

- **Before execution**: Validates all dependencies exist and no circular references
- **During execution**: Only selects stories where all dependencies have `passes: true`
- **Priority order**: Follows story priority while respecting dependencies
- **Parallel execution**: Stories marked `parallel: true` without dependencies can run concurrently

### Memory Persistence

Each agent iteration has access to:
- **Git history** - All commits from previous iterations
- **progress.txt** - YAML metadata + learnings and context notes
- **prd.json** - Task completion status and dependencies
- **constitution.md** - Project coding principles (MUST/SHOULD rules)
- **tasks.md** - Dependency-ordered task breakdown (if present)
- **checklist.md** - Quality validation checklist (if present)

---

## Troubleshooting

### Feature not found
```
Error: Feature 'my-feature' not found
```
Create the feature first:
```bash
bun run relentless.ts features create my-feature
```

### PRD not found
```
Error: relentless/features/my-feature/prd.json not found
```
Convert your PRD first:
```bash
bun run relentless.ts convert path/to/prd.md --feature my-feature
```

### Max iterations reached
```
Warning: Reached maximum iterations (20) without completion
```
Either increase `--max-iterations` or break stories into smaller tasks.

---

## Development

```bash
# Clone
git clone https://github.com/ArvorCo/Relentless.git
cd Relentless

# Install dependencies
bun install

# Run CLI locally
bun run bin/relentless.ts --help

# Type check
bun run typecheck

# Lint
bun run lint
```

---

## References

- [Ralph Wiggum Pattern](https://ghuntley.com/ralph/) - Original concept by Geoffrey Huntley
- [Ralph by Snarktank](https://github.com/snarktank/ralph) - Reference implementation that inspired Relentless
- [GitHub Relentless Commands](https://github.com/github/spec-kit) - Specification workflow and structure inspiration for hierarchical planning, quality checklists, and interactive clarification features

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built by [Arvor](https://arvor.co)**

</div>
