# Relentless

<div align="center">

![Relentless](ralph.webp)

**Universal AI Agent Orchestrator**

[![GitHub](https://img.shields.io/badge/GitHub-ArvorCo%2FRelentless-blue?logo=github)](https://github.com/ArvorCo/Relentless)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Runtime-Bun-black?logo=bun)](https://bun.sh)

*Run any AI coding agent repeatedly until all tasks are complete.*

</div>

---

## What is Relentless?

**Relentless** is a universal AI agent orchestrator that runs any AI coding agent (Claude Code, Amp, OpenCode, Codex, Droid, Gemini) in an autonomous loop until all PRD (Product Requirements Document) items are complete.

Each iteration spawns a **fresh agent instance** with clean context. Memory persists across iterations via:
- **Git history** - commits from previous iterations
- **progress.txt** - learnings and context notes
- **prd.json** - task completion status

Evolved from the [Ralph Wiggum Pattern](https://ghuntley.com/ralph/) to work with ANY AI coding agent.

---

## Features

| Feature | Description |
|---------|-------------|
| **Multi-Agent Support** | Works with Claude Code, Amp, OpenCode, Codex, Droid, and Gemini |
| **Smart Routing** | Auto-selects the best agent for each story type with `--agent auto` |
| **Zero-Friction Install** | One command setup with `bunx relentless init` |
| **TypeScript/Bun** | Type-safe implementation with robust error handling |
| **Skills System** | PRD generation and conversion skills for compatible agents |

---

## Requirements

- [Bun](https://bun.sh) runtime (required)
- At least one AI coding agent installed (see [Supported Agents](#supported-agents))

### Install Bun

```bash
# macOS/Linux
curl -fsSL https://bun.sh/install | bash

# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"
```

---

## Installation

### Option 1: Run directly with bunx (Recommended)

```bash
# No installation needed - runs directly from GitHub
bunx github:ArvorCo/Relentless init
```

### Option 2: Install globally

```bash
# Install from GitHub
bun install -g github:ArvorCo/Relentless

# Now you can run from anywhere
relentless init
```

### Option 3: Clone and run locally

```bash
git clone https://github.com/ArvorCo/Relentless.git
cd Relentless
bun install
bun run bin/relentless.ts --help
```

---

## Quick Start

### Step 1: Initialize in Your Project

```bash
cd your-project
bunx github:ArvorCo/Relentless init
```

This creates:
```
your-project/
├── relentless.config.json  # Configuration
├── prompt.md               # Agent prompt template
├── CLAUDE.md               # Agent instructions
├── AGENTS.md               # Symlink to CLAUDE.md
├── progress.txt            # Progress log
└── .claude/skills/         # Skills (for Claude Code)
    ├── prd/
    └── relentless/
```

### Step 2: Create a PRD

Write your feature requirements in a markdown file:

```bash
# Using Claude Code with the prd skill
claude "Load the prd skill and create a PRD for adding user authentication"

# Or manually create tasks/prd-feature.md with your requirements
```

**Example PRD format** (`tasks/prd-auth.md`):

```markdown
# User Authentication

## Overview
Add secure user authentication to the application.

## User Stories

### Story 1: Login Form
Create a login form with email and password fields.

**Acceptance Criteria:**
- Email validation
- Password minimum 8 characters
- Error messages for invalid input

### Story 2: Session Management
Implement JWT-based session management.

**Acceptance Criteria:**
- Token stored in httpOnly cookie
- 24-hour expiration
- Refresh token support
```

### Step 3: Convert PRD to JSON

```bash
# Using CLI
bunx github:ArvorCo/Relentless convert tasks/prd-auth.md

# Or with Claude Code
claude "Load the relentless skill and convert tasks/prd-auth.md"
```

This generates `prd.json`:

```json
{
  "title": "User Authentication",
  "stories": [
    {
      "id": "story-1",
      "title": "Login Form",
      "description": "Create a login form with email and password fields.",
      "acceptance_criteria": ["Email validation", "Password minimum 8 characters", "Error messages"],
      "passes": false
    }
  ]
}
```

### Step 4: Run the Orchestrator

```bash
# Run with default agent (Claude Code)
./bin/relentless.sh

# Specify an agent
./bin/relentless.sh --agent claude
./bin/relentless.sh --agent amp
./bin/relentless.sh --agent codex

# Smart routing - auto-selects best agent per story type
./bin/relentless.sh --agent auto

# Set maximum iterations
./bin/relentless.sh --max-iterations 30
```

The orchestrator will:
1. Read `prd.json` to find incomplete stories
2. Build a prompt with story requirements
3. Invoke the AI agent
4. Detect completion via `<promise>COMPLETE</promise>` signal
5. Repeat until all stories pass or max iterations reached

---

## Supported Agents

| Agent | Skills Support | How to Install |
|-------|----------------|----------------|
| **Claude Code** | Full | `bun install -g @anthropic-ai/claude-code` |
| **Amp** | Full | `curl -fsSL https://ampcode.com/install.sh \| bash` |
| **OpenCode** | Via agents | `bun install -g opencode-ai` |
| **Codex** | Manual | `bun install -g @openai/codex` |
| **Droid** | Prompting | `curl -fsSL https://app.factory.ai/cli \| sh` |
| **Gemini** | Extensions | `bun install -g gemini-cli` |

### Check Installed Agents

```bash
bunx github:ArvorCo/Relentless agents list
```

### Verify Agent Health

```bash
bunx github:ArvorCo/Relentless agents doctor
```

---

## Configuration

Create `relentless.config.json` in your project root:

```json
{
  "defaultAgent": "claude",
  "agents": {
    "claude": {
      "model": "sonnet",
      "dangerouslyAllowAll": true
    },
    "amp": {
      "model": "smart",
      "dangerouslyAllowAll": true
    }
  },
  "routing": {
    "rules": [
      { "storyType": "database", "agent": "claude" },
      { "storyType": "ui", "agent": "amp" },
      { "storyType": "api", "agent": "claude" },
      { "storyType": "test", "agent": "codex" }
    ],
    "default": "claude"
  },
  "execution": {
    "maxIterations": 20,
    "iterationDelay": 2000
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultAgent` | string | `"claude"` | Agent to use when none specified |
| `agents.<name>.model` | string | varies | Model to use for the agent |
| `agents.<name>.dangerouslyAllowAll` | boolean | `false` | Skip permission prompts |
| `routing.rules` | array | `[]` | Rules for smart agent routing |
| `routing.default` | string | `"claude"` | Fallback agent for routing |
| `execution.maxIterations` | number | `20` | Maximum orchestration loops |
| `execution.iterationDelay` | number | `2000` | Delay between iterations (ms) |

---

## CLI Reference

```bash
# Initialize Relentless in current project
relentless init

# Run orchestration
relentless run [options]
  --agent <name>        Agent to use (claude, amp, opencode, codex, droid, gemini, auto)
  --max-iterations <n>  Maximum iterations (default: 20)

# Convert PRD markdown to JSON
relentless convert <path/to/prd.md>

# Generate PRD with an agent
relentless prd "feature description" --agent <name>

# List available agents
relentless agents list

# Check agent health
relentless agents doctor

# Show help
relentless --help
```

---

## Key Concepts

### Fresh Context Per Iteration

Each iteration spawns a **new agent instance** with clean context. This prevents context window exhaustion and allows the agent to approach each task fresh.

The only persistence between iterations:
- Git commits from previous work
- `progress.txt` with learnings
- `prd.json` with completion status

### Right-Sized Stories

Each PRD story should be small enough to complete in **one context window**. If a task is too big, the LLM runs out of context before finishing.

**Good story sizes:**
- Add a database column and migration
- Create a UI component
- Implement a single API endpoint
- Write tests for one module

**Too big (split these):**
- "Build the entire dashboard"
- "Add authentication"
- "Refactor the API"

### Completion Detection

When all stories have `passes: true`, the agent outputs:

```
<promise>COMPLETE</promise>
```

This signals the orchestrator to stop the loop.

---

## Smart Routing

With `--agent auto`, Relentless analyzes each story and routes it to the best-suited agent:

| Story Type | Keywords | Default Agent |
|------------|----------|---------------|
| Database | migration, schema, SQL, postgres | Claude Code |
| UI | component, button, form, CSS, React | Amp |
| API | endpoint, REST, GraphQL, route | Claude Code |
| Test | test, spec, coverage, jest | Codex |
| Refactor | refactor, cleanup, optimize | Claude Code |

Configure custom routing rules in `relentless.config.json`.

---

## Skills System

### For Claude Code

Skills are automatically installed to `.claude/skills/` during init:

```bash
# Use the PRD skill
claude "Load the prd skill and create a PRD for <feature>"

# Use the Relentless skill
claude "Load the relentless skill and convert <file>"
```

### For Other Agents

Agents without native skill support use embedded prompting via the CLI:

```bash
# Generate PRD with any agent
relentless prd "add user authentication" --agent codex

# Convert PRD to JSON (agent-agnostic)
relentless convert tasks/prd-feature.md
```

---

## Development

```bash
# Clone the repository
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

### Project Structure

```
Relentless/
├── bin/
│   ├── relentless.ts      # CLI entry point
│   └── relentless.sh      # Bash wrapper
├── src/
│   ├── agents/            # Agent adapters
│   ├── config/            # Configuration system
│   ├── execution/         # Orchestration runner
│   ├── init/              # Project scaffolder
│   └── prd/               # PRD parser
├── skills/
│   ├── prd/               # PRD generation skill
│   └── relentless/        # Conversion skill
└── templates/             # Project templates
```

---

## Troubleshooting

### Agent not found

```
Error: Agent 'claude' is not installed
```

**Solution:** Install the agent or choose a different one:
```bash
relentless agents list  # See what's available
relentless run --agent amp  # Use a different agent
```

### PRD not found

```
Error: prd.json not found
```

**Solution:** Create and convert a PRD first:
```bash
relentless convert tasks/your-prd.md
```

### Max iterations reached

```
Warning: Reached maximum iterations (20) without completion
```

**Solution:** Either increase `--max-iterations` or break your stories into smaller tasks.

---

## References

- [Ralph Wiggum Pattern](https://ghuntley.com/ralph/) - Original pattern that inspired Relentless
- [Claude Code](https://docs.anthropic.com/claude-code) - Anthropic's AI coding assistant
- [Amp](https://ampcode.com/manual) - Sourcegraph's AI coding agent
- [OpenCode](https://opencode.ai/) - Open source AI coding tool
- [Codex CLI](https://developers.openai.com/codex/cli/) - OpenAI's coding CLI
- [Factory Droid](https://factory.ai/) - Factory's AI coding agent
- [Gemini CLI](https://github.com/google-gemini/gemini-cli) - Google's AI CLI

---

## Contributing

Contributions are welcome! Please open an issue or submit a pull request at [github.com/ArvorCo/Relentless](https://github.com/ArvorCo/Relentless).

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built by [Arvor](https://arvor.co)**

</div>
