# Relentless - Universal AI Agent Orchestrator

## Overview

This is the Relentless codebase - a universal AI agent orchestrator that works with multiple AI coding agents (Claude Code, Amp, OpenCode, Codex, Droid, Gemini).

## Codebase Patterns

### Directory Structure

- `bin/` - CLI entry point (relentless.ts)
- `src/` - Core TypeScript implementation
  - `agents/` - Agent adapters for each AI coding agent
  - `config/` - Configuration schema and loading
  - `prd/` - PRD parsing and validation
  - `execution/` - Orchestration loop and routing
  - `init/` - Project initialization scaffolder
- `skills/` - Skills for agents that support them
- `templates/` - Templates copied to projects on init

### Key Concepts

1. **Agent Adapters**: Each AI agent has an adapter implementing `AgentAdapter` interface
2. **PRD Format**: User stories in `prd.json` with `passes: true/false` status
3. **Completion Signal**: `<promise>COMPLETE</promise>` indicates all stories done
4. **Progress Log**: `progress.txt` accumulates learnings across iterations

### Development Commands

```bash
# Install locally for development
bun install

# Run the orchestrator during development
bun run bin/relentless.ts run --feature <name>

# Type check
bun run typecheck

# Lint
bun run lint
```

### Testing Locally

```bash
# Test init command
mkdir /tmp/test && cd /tmp/test
bun run /path/to/relentless/bin/relentless.ts init

# Test with a simple PRD
cd /path/to/relentless
bun run bin/relentless.ts run --feature <name>
```

### Using the Global Binary

```bash
# Install globally
bun install -g .

# Run from anywhere
relentless init
relentless run --feature <name>
```

### Code Style

- TypeScript with strict mode
- Bun as runtime (no Node.js)
- Zod for schema validation
- Commander for CLI parsing

### Important Files

- `bin/relentless.ts` - Main CLI entry point
- `src/agents/types.ts` - AgentAdapter interface definition
- `src/orchestrator.ts` - Main execution loop
- `templates/prompt.md` - Default prompt template
