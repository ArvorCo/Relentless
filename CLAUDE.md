# Relentless - Universal AI Agent Orchestrator

## Overview

This is the Relentless codebase - a universal AI agent orchestrator that works with multiple AI coding agents (Claude Code, Amp, OpenCode, Codex, Droid, Gemini).

**Recent Major Refactoring (January 2026):**
- Forked GitHub Spec Kit-inspired commands as native Relentless commands
- All `/speckit.*` commands renamed to `/relentless.*`
- Implemented skills architecture: commands are thin wrappers, logic in skills
- Multi-tier agent support: Full (Claude/Amp/OpenCode), Extensions (Gemini), Manual (Droid/Codex)
- See [REFACTOR_SUMMARY.md](./REFACTOR_SUMMARY.md) and [CHANGES_SUMMARY.md](./CHANGES_SUMMARY.md) for details

## Codebase Patterns

### Directory Structure

- `bin/` - CLI entry point (relentless.ts)
- `src/` - Core TypeScript implementation
  - `agents/` - Agent adapters for each AI coding agent
  - `config/` - Configuration schema and loading
  - `prd/` - PRD parsing and validation
  - `execution/` - Orchestration loop and routing
  - `init/` - Project initialization scaffolder
- `.claude/skills/` - Skills for Claude Code/Amp/OpenCode
- `.claude/commands/` - Command wrappers that load skills
- `templates/` - Templates copied to projects on init

### Key Concepts

1. **Agent Adapters**: Each AI agent has an adapter implementing `AgentAdapter` interface
2. **Skills Architecture**: Commands load skills which contain the actual logic and templates
3. **PRD Format**: User stories in `prd.json` with `passes: true/false` status (generated from `tasks.md`)
4. **Completion Signal**: `<promise>COMPLETE</promise>` indicates all stories done
5. **Progress Log**: `progress.txt` accumulates learnings across iterations
6. **Multi-Tier Agent Support**: Full skills support (Claude/Amp/OpenCode), Extensions (Gemini), Manual (Droid/Codex)

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
- `src/agents/` - Agent adapters for each supported agent
- `src/init/scaffolder.ts` - Project initialization and skill installation
- `src/prd/parser.ts` - PRD markdown parser (reads tasks.md format)
- `.claude/skills/*/SKILL.md` - Skill implementations
- `.claude/commands/relentless.*.md` - Command wrappers
- `templates/` - Default templates for constitution, plan, etc.
