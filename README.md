# Relentless

![Relentless](ralph.webp)

**Relentless** is a universal AI agent orchestrator that runs any AI coding agent (Claude Code, Amp, OpenCode, Codex, Droid, Gemini) repeatedly until all PRD items are complete. Each iteration is a fresh agent instance with clean context. Memory persists via git history, `progress.txt`, and `prd.json`.

Evolved from [Ralph Wiggum](https://ghuntley.com/ralph/) to work with ANY AI coding agent.

## Features

- **Multi-Agent Support**: Works with Claude Code, Amp, OpenCode, Codex, Droid, and Gemini
- **Smart Routing**: Auto-selects the best agent for each story type with `--agent auto`
- **Zero-Friction Install**: `bunx relentless init` sets up everything
- **TypeScript/Bun**: Robust error handling and async capabilities
- **Skills**: PRD generation and conversion skills for agents that support them

## Quick Start

### 1. Install in Your Project

```bash
bunx relentless init
```

This creates:
- `relentless.config.json` - Configuration
- `prompt.md` - Agent instructions
- `CLAUDE.md` / `AGENTS.md` - Project agent documentation
- `progress.txt` - Progress log
- Skills in `.claude/skills/`

### 2. Create a PRD

```bash
# With Claude Code (has skills)
claude "Load the prd skill and create a PRD for adding user authentication"

# With any agent (using prompting)
bunx relentless prd "add user authentication" --agent codex
```

### 3. Convert PRD to JSON

```bash
# With Claude Code
claude "Load the relentless skill and convert tasks/prd-user-auth.md"

# With CLI
bunx relentless convert tasks/prd-user-auth.md
```

### 4. Run Relentless

```bash
# With Claude Code (default)
./bin/relentless.sh

# With a specific agent
./bin/relentless.sh --agent amp
./bin/relentless.sh --agent codex
./bin/relentless.sh --agent droid
./bin/relentless.sh --agent gemini

# Smart routing (auto-select best agent per story)
./bin/relentless.sh --agent auto

# Custom max iterations
./bin/relentless.sh --max-iterations 30
```

## Agent Capabilities

| Agent | Skills Support | Installation |
|-------|----------------|--------------|
| **Claude Code** | Full (`/plugin install`) | `bun install -g @anthropic-ai/claude-code` |
| **Amp** | Full (`amp skill add`) | `curl -fsSL https://ampcode.com/install.sh \| bash` |
| **OpenCode** | Via agents | `bun install -g opencode-ai` |
| **Codex** | Manual SKILL.md | `bun install -g @openai/codex` |
| **Droid** | Prompting only | `curl -fsSL https://app.factory.ai/cli \| sh` |
| **Gemini** | Extensions | `bun install -g gemini-cli` |

## CLI Commands

```bash
# Initialize in current project
bunx relentless init

# Run orchestration
bunx relentless run --agent claude --max-iterations 20

# Convert PRD markdown to JSON
bunx relentless convert tasks/prd-feature.md

# List available agents
bunx relentless agents list

# Check agent health
bunx relentless agents doctor
```

## Configuration

Create `relentless.config.json` in your project root:

```json
{
  "defaultAgent": "claude",
  "agents": {
    "claude": { "model": "sonnet", "dangerouslyAllowAll": true },
    "amp": { "model": "smart", "dangerouslyAllowAll": true }
  },
  "routing": {
    "rules": [
      { "storyType": "database", "agent": "claude" },
      { "storyType": "ui", "agent": "amp" }
    ],
    "default": "claude"
  },
  "execution": {
    "maxIterations": 20,
    "iterationDelay": 2000
  }
}
```

## Key Concepts

### Each Iteration = Fresh Context

Each iteration spawns a **new agent instance** with clean context. The only memory between iterations is:
- Git history (commits from previous iterations)
- `progress.txt` (learnings and context)
- `prd.json` (which stories are done)

### Small Tasks

Each PRD item should be small enough to complete in one context window. If a task is too big, the LLM runs out of context before finishing.

Right-sized stories:
- Add a database column and migration
- Add a UI component to an existing page
- Update a server action with new logic

Too big (split these):
- "Build the entire dashboard"
- "Add authentication"
- "Refactor the API"

### Stop Condition

When all stories have `passes: true`, the agent outputs `<promise>COMPLETE</promise>` and the loop exits.

## Development

```bash
# Install dependencies
bun install

# Run CLI
bun run bin/relentless.ts --help

# Type check
bun run typecheck

# Lint
bun run lint
```

## References

- [Ralph Wiggum Pattern](https://ghuntley.com/ralph/)
- [Amp Documentation](https://ampcode.com/manual)
- [Claude Code Documentation](https://docs.anthropic.com/claude-code)
- [OpenCode](https://opencode.ai/)
- [Codex CLI](https://developers.openai.com/codex/cli/)
- [Factory Droid](https://factory.ai/)
- [Gemini CLI](https://github.com/google-gemini/gemini-cli)

## License

MIT
