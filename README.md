# Relentless

<div align="center">

<img src="Relentless.png" alt="Relentless Logo" width="280" />

**The AI Agent Orchestrator That Never Stops**

[![npm](https://img.shields.io/npm/v/@arvorco/relentless)](https://www.npmjs.com/package/@arvorco/relentless)
[![GitHub](https://img.shields.io/badge/GitHub-ArvorCo%2FRelentless-blue?logo=github)](https://github.com/ArvorCo/Relentless)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[Quick Start](#quick-start) · [Why Relentless?](#from-ralph-to-relentless) · [Supported Agents](#supported-agents) · [Documentation](#cli-reference)

</div>

---

## What's in a Name?

According to [Matt Pocock](https://x.com/mattpocockuk/status/2010636784116601226), if you're trying to sneak Ralph into the enterprise, just pretend it's an acronym:

> **R**elentless **A**gentic **L**ooping **P**rogramming **H**elper

So naturally, **RELENTLESS** is the recursive acronym:

> **R**ALPH **E**ndlessly **L**oops, **E**xecuting, **N**avigating **T**asks, **L**earning, **E**volving, **S**olving, **S**caling

It's recursive. We loop. That's kind of our thing.

---

## The Problem

You have an AI coding agent. It's brilliant — for about 15 minutes. Then it loses context, forgets what it was doing, or hits a rate limit. You babysit it, re-prompt it, copy-paste context back in. Rinse and repeat.

**What if it just... kept going?**

---

## The Solution

**Relentless** runs your AI agent in a loop until all tasks are complete. Each iteration spawns a fresh agent with clean context. Memory persists through git commits and progress files. When one agent hits a rate limit, another takes over.

```bash
npm install -g @arvorco/relentless
cd your-project
relentless init
relentless run --feature my-feature --tui
```

That's it. Go grab a coffee. Or lunch. Or sleep. Relentless will keep working.

---

## From Ralph to Relentless

### The Origin

[Geoffrey Huntley](https://x.com/GeoffreyHuntley) created the [Ralph Wiggum Pattern](https://ghuntley.com/ralph/) — a brilliantly simple idea: run an AI coding agent in a loop until all tasks are done. Watch [his original video](https://www.youtube.com/watch?v=4Nna09dG_c0) to understand the concept.

The pattern works. But we found it could work *better*.

### The Evolution

Ralph loops. **Relentless loops smarter.**

| Challenge | Ralph | Relentless |
|-----------|-------|------------|
| **Specs** | Manual PRDs, often vague | Structured specs inspired by [GitHub SpecKit](https://github.com/github/spec-kit) with interactive clarification and dependency ordering |
| **Agents** | Single agent (usually Claude) | Universal: Claude, Amp, OpenCode, Codex, Droid, Gemini — with automatic fallback on rate limits |
| **Cost** | Same model for everything | Route simple tasks to cheaper models, complex ones to capable models |
| **Tasks** | Can be too big or vague | 4-phase breakdown (Setup → Foundation → Stories → Polish) with 15-60 min task sizing |
| **Quality** | Hope it works | TDD enforced, E2E tests required, domain-specific checklists, cross-artifact analysis, constitution rules |

### The Philosophy

> *"Garbage in, garbage out — if your specs are vague, your agent will spin its wheels. And at $0.50 per iteration, those wheels get expensive fast."*

Relentless ensures you know exactly what "done" means before the first line of code is written.

---

## Quick Start

### 1. Install

```bash
npm install -g @arvorco/relentless
# or
bun install -g @arvorco/relentless
```

### 2. Initialize

```bash
cd your-project
relentless init
```

### 3. Create a Feature

**With Claude Code, Amp, or OpenCode** (recommended):
```bash
# Create constitution + personalized prompt (do this once per project)
/relentless.constitution

# Create feature
/relentless.specify Add user authentication with OAuth2
/relentless.plan I'm using React, TypeScript, PostgreSQL
/relentless.tasks
/relentless.checklist
```

**With Codex, Droid, or Gemini** (manual workflow):
```bash
relentless features create user-auth
# Then prompt your agent to create spec.md, plan.md, tasks.md
# Or reference .claude/skills/*/SKILL.md for format
```

### 4. Run

```bash
relentless convert relentless/features/001-user-auth/tasks.md --feature 001-user-auth
relentless run --feature 001-user-auth --tui
```

Watch the beautiful TUI as your agent works through each task, commits code, and marks stories complete.

---

## Key Features

### 🔄 Universal Agent Orchestration
Run Claude, Amp, OpenCode, Codex, Droid, or Gemini. Switch automatically when rate limits hit. Fall back gracefully. Recover when limits reset.

### 📋 Structured Specification System
No more vague PRDs. Interactive `/relentless.specify` creates comprehensive specs with acceptance criteria, dependencies, and success metrics. Inspired by [GitHub SpecKit](https://github.com/github/spec-kit).

### 🧪 Quality Enforcement
TDD is not optional. E2E tests are not optional. Every story must pass typecheck. Constitution rules (MUST/SHOULD) are enforced. Checklists are loaded into agent prompts.

### 💰 Cost-Aware Routing
Why use GPT-5-Pro or Opus 4.5 to rename a variable? Route tasks by complexity. Save money. Ship faster.

### 📊 Beautiful TUI
Real-time progress bars, dynamic story grid that adapts to terminal size, priority badges, phase indicators, research markers. Know exactly what's happening.

### 🔀 Dependency Management
Stories can depend on other stories. Relentless validates, detects circular dependencies, and executes in the correct order.

### 📝 Constitution + Prompt Generation
`/relentless.constitution` now creates **both** `constitution.md` (project rules) AND `prompt.md` (personalized agent instructions) by analyzing your project structure.

---

## Supported Agents

| Agent | Skills | Commands | Status |
|-------|--------|----------|--------|
| **Claude Code** | `.claude/skills/` | `/relentless.*` | ✅ Full support |
| **Amp** | `.amp/skills/` | `/relentless.*` | ✅ Full support |
| **OpenCode** | `.opencode/skill/` | `/relentless.*` | ✅ Full support |
| **Codex** | `.codex/skills/` | Manual | ✅ Skills installed |
| **Gemini** | `.gemini/GEMINI.md` | Manual | ✅ Instructions provided |
| **Droid** | Reference `.claude/skills/` | Manual | ✅ Works with prompting |

All agents get skills/instructions installed automatically via `relentless init`.

```bash
# Check what's installed
relentless agents list

# Health check
relentless agents doctor
```

---

## Project Structure

After `relentless init`:

```
your-project/
├── relentless/
│   ├── config.json              # Configuration
│   ├── constitution.md          # Project rules (MUST/SHOULD)
│   ├── prompt.md                # Personalized agent instructions
│   └── features/
│       └── 001-user-auth/
│           ├── spec.md          # Feature specification
│           ├── plan.md          # Technical plan
│           ├── tasks.md         # User stories
│           ├── checklist.md     # Quality checklist
│           ├── prd.json         # Orchestration state
│           └── progress.txt     # Learnings & context
├── .claude/
│   ├── skills/                  # 11 skills for Claude/Amp/OpenCode
│   └── commands/                # /relentless.* command wrappers
├── .amp/skills/                 # Copied for Amp
├── .opencode/skill/             # Copied for OpenCode (singular!)
├── .codex/skills/               # Copied for Codex
└── .gemini/GEMINI.md            # Instructions for Gemini
```

---

## The Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   /relentless.constitution  →  Project rules + prompt.md    │
│            ↓                                                │
│   /relentless.specify       →  Structured spec              │
│            ↓                                                │
│   /relentless.plan          →  Technical architecture       │
│            ↓                                                │
│   /relentless.tasks         →  Dependency-ordered stories   │
│            ↓                                                │
│   /relentless.checklist     →  Quality validation items     │
│            ↓                                                │
│   relentless run --tui      →  Agent loops until complete   │
│            ↓                                                │
│   ✅ Ship it                                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## CLI Reference

### Core Commands

```bash
relentless init                              # Initialize project
relentless run --feature <name> --tui        # Run orchestration
relentless status --feature <name>           # Show progress
relentless reset <story-id> --feature <name> # Re-run a story
```

### Feature Management

```bash
relentless features create <name>            # Create feature
relentless features create <name> --auto-number  # 001-name, 002-name...
relentless features list                     # List all features
relentless convert <file> --feature <name>   # Convert to JSON
```

### Analysis & Integration

```bash
relentless analyze --feature <name>          # Cross-artifact consistency
relentless issues --feature <name>           # Generate GitHub issues
relentless issues --feature <name> --dry-run # Preview issues
```

### Agent Management

```bash
relentless agents list                       # Show installed agents
relentless agents doctor                     # Health check
```

### Slash Commands (Claude/Amp/OpenCode)

```bash
/relentless.constitution    # Create project rules + prompt.md
/relentless.specify <desc>  # Create feature spec
/relentless.plan [context]  # Generate technical plan
/relentless.tasks           # Generate user stories
/relentless.checklist       # Generate quality checklist
/relentless.clarify         # Resolve ambiguities
/relentless.analyze         # Cross-artifact analysis
/relentless.implement       # Execute implementation
/relentless.taskstoissues   # Convert to GitHub issues
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
  "fallback": {
    "enabled": true,
    "priority": ["claude", "amp", "opencode", "codex", "gemini"],
    "autoRecovery": true
  },
  "execution": {
    "maxIterations": 20,
    "iterationDelay": 2000
  },
  "quality": {
    "requireTypecheck": true,
    "requireTests": true,
    "enforceConstitution": true
  }
}
```

---

## How It Works

### The Loop

1. **Fresh Context** — Each iteration spawns new agent with clean context
2. **Load Constitution** — Agent reads project rules (MUST/SHOULD)
3. **Load Checklist** — Quality gates included in agent prompt
4. **Find Next Story** — Pick story with `passes: false` and dependencies met
5. **Implement** — Agent codes, tests, commits
6. **Update PRD** — Mark story `passes: true`
7. **Update Progress** — Append learnings to `progress.txt`
8. **Repeat** — Until all stories pass or max iterations reached
9. **Complete** — Agent outputs `<promise>COMPLETE</promise>`

### Memory Persistence

Each iteration has access to:
- **Git history** — All commits from previous iterations
- **progress.txt** — YAML metadata + learnings
- **prd.json** — Task completion status
- **constitution.md** — Project rules
- **checklist.md** — Quality validation (now included in prompts!)

---

## Writing Good PRDs

### Right-Sized Stories

Each story should be completable in **one context window** (15-60 minutes).

**Good:** Add login endpoint, Create user form, Add email validation

**Too big:** Build authentication system, Refactor the API

### Acceptance Criteria

Make criteria **verifiable**:

**Good:** "Button shows confirmation dialog before deleting"

**Bad:** "Works correctly", "Good UX"

### Always Include

- `Typecheck passes` in every story
- `Tests pass` in every story
- `Verify in browser` for UI stories

---

## Troubleshooting

| Error | Solution |
|-------|----------|
| Feature not found | `relentless features create <name>` |
| PRD not found | `relentless convert <file> --feature <name>` |
| Max iterations reached | Increase `--max-iterations` or split stories |
| Skills not found | `relentless init --force` to reinstall |

---

## Development

```bash
git clone https://github.com/ArvorCo/Relentless.git
cd Relentless
bun install
bun run bin/relentless.ts --help
bun run typecheck
bun run lint
```

---

## References

- [Ralph Wiggum Pattern](https://ghuntley.com/ralph/) — Original concept by [Geoffrey Huntley](https://x.com/GeoffreyHuntley)
- [Geoffrey's Video](https://www.youtube.com/watch?v=4Nna09dG_c0) — Watch the pattern in action
- [GitHub SpecKit](https://github.com/github/spec-kit) — Inspiration for the specification system
- [Ralph by Snarktank](https://github.com/snarktank/ralph) — Reference implementation

---

## License

MIT License — see [LICENSE](./LICENSE) for details.

---

<div align="center">

**Built with 🔥 by [Arvor](https://arvor.co)**

*We don't stop. Ever.*

</div>
