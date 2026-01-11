# Relentless

<div align="center">

**Universal AI Agent Orchestrator**

[![GitHub](https://img.shields.io/badge/GitHub-ArvorCo%2FRelentless-blue?logo=github)](https://github.com/ArvorCo/Relentless)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

*Run any AI coding agent repeatedly until all tasks are complete.*

</div>

---

## Quick Start (30 seconds)

```bash
# 1. Clone and enter your project
cd your-project

# 2. Initialize Relentless
bun run github:ArvorCo/Relentless/bin/relentless.ts init

# 3. Create a feature and add your PRD
mkdir -p relentless/features/my-feature
# Write your PRD to relentless/features/my-feature/prd.md

# 4. Convert PRD to JSON
bun run github:ArvorCo/Relentless/bin/relentless.ts convert relentless/features/my-feature/prd.md --feature my-feature

# 5. Run Relentless
./relentless/bin/relentless.sh --feature my-feature
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

---

## Installation

### Prerequisites

- [Bun](https://bun.sh) runtime
- At least one AI coding agent installed (Claude Code, Amp, etc.)

```bash
# Install Bun (if needed)
curl -fsSL https://bun.sh/install | bash
```

### Option 1: Clone the Repository (Recommended)

```bash
git clone https://github.com/ArvorCo/Relentless.git
cd Relentless
bun install
```

### Option 2: Run Directly from GitHub

```bash
bun run github:ArvorCo/Relentless/bin/relentless.ts init
```

---

## Step-by-Step Guide

### Step 1: Initialize Relentless in Your Project

```bash
cd your-project
bun run /path/to/Relentless/bin/relentless.ts init
```

This creates:
```
your-project/
├── relentless/
│   ├── bin/
│   │   └── relentless.sh      # Orchestrator script
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
bun run /path/to/Relentless/bin/relentless.ts features create my-feature
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
bun run /path/to/Relentless/bin/relentless.ts convert relentless/features/my-feature/prd.md --feature my-feature
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
./relentless/bin/relentless.sh --feature my-feature
```

**Options:**
```bash
# Specify agent (default: claude)
./relentless/bin/relentless.sh --feature my-feature --agent amp

# Set max iterations (default: 20)
./relentless/bin/relentless.sh --feature my-feature --max-iterations 30

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
│   ├── bin/
│   │   └── relentless.sh          # Main orchestrator script
│   ├── config.json                # Relentless configuration
│   ├── prompt.md                  # Prompt template for agents
│   └── features/
│       └── my-feature/
│           ├── prd.md             # Your PRD (markdown)
│           ├── prd.json           # Converted PRD (JSON)
│           └── progress.txt       # Progress log
└── .claude/skills/                # Skills for Claude Code
    ├── prd/SKILL.md
    └── relentless/SKILL.md
```

---

## Supported Agents

| Agent | Command | Skills Support |
|-------|---------|----------------|
| **Claude Code** | `claude` | Full |
| **Amp** | `amp` | Full |
| **OpenCode** | `opencode` | Via agents |
| **Codex** | `codex` | Manual |
| **Droid** | `droid` | Prompting |
| **Gemini** | `gemini` | Extensions |

### Check Which Agents Are Installed

```bash
bun run /path/to/Relentless/bin/relentless.ts agents list
```

### Verify Agent Health

```bash
bun run /path/to/Relentless/bin/relentless.ts agents doctor
```

---

## CLI Commands

```bash
# Initialize Relentless in current project
relentless init

# Create a new feature
relentless features create <name>

# List all features
relentless features list

# Convert PRD markdown to JSON
relentless convert <prd.md> --feature <name>

# Run orchestration for a feature
relentless run --feature <name> [--agent <name>] [--max-iterations <n>]

# List installed agents
relentless agents list

# Check agent health
relentless agents doctor
```

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

---

## How It Works

1. **Fresh Context Each Iteration** - Each loop spawns a new agent instance with clean context
2. **Agent Reads PRD** - Finds the first story with `passes: false`
3. **Agent Implements** - Makes changes, runs tests, commits
4. **Agent Updates PRD** - Sets `passes: true` for completed story
5. **Agent Updates Progress** - Appends learnings to `progress.txt`
6. **Loop Continues** - Until all stories pass or max iterations reached
7. **Completion Signal** - Agent outputs `<promise>COMPLETE</promise>` when done

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

- [Ralph Wiggum Pattern](https://ghuntley.com/ralph/) - Original inspiration
- [GitHub Spec Kit](https://github.com/github/spec-kit) - PRD structure reference

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built by [Arvor](https://arvor.co)**

</div>
