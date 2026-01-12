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

## Publishing to npm

### Package Information
- **Name:** `@arvorco/relentless`
- **Registry:** https://www.npmjs.com/package/@arvorco/relentless
- **Repository:** https://github.com/ArvorCo/Relentless

### Publishing Workflow

**Automated (Recommended):**
```bash
# Create a new release
./scripts/release.sh

# This will:
# 1. Prompt for version bump (patch/minor/major)
# 2. Update package.json
# 3. Run typecheck and lint
# 4. Create commit: chore(release): vX.Y.Z
# 5. Create git tag
# 6. Push to GitHub
# 7. GitHub Actions automatically publishes to npm
```

**Manual (Fallback):**
```bash
# Login to npm first
npm login

# Publish manually
./scripts/publish-manual.sh

# This gives full control over the process
```

### Version Numbers (Semver)
- **Patch** (0.1.0 → 0.1.1): Bug fixes, no new features
- **Minor** (0.1.0 → 0.2.0): New features, backward compatible
- **Major** (0.1.0 → 1.0.0): Breaking changes

### GitHub Actions
- **Workflow:** `.github/workflows/publish.yml`
- **Trigger:** Commits with `chore(release):` or `chore: release` in message
- **Actions:** Runs typecheck, lint, publishes to npm, creates GitHub release
- **Setup:** Requires `NPM_TOKEN` secret in GitHub repository settings

### What Gets Published
- Package size: ~60 KB compressed, ~230 KB unpacked
- Includes: `bin/`, `src/`, `.claude/`, `templates/`, docs
- Excludes: `.github/`, `scripts/`, dev docs, internal features
- See `PACKAGE_CONTENTS.md` for details

### Checklist Before Publishing
- [ ] All tests pass (`bun run typecheck`, `bun run lint`)
- [ ] Documentation is up to date
- [ ] No sensitive data in code
- [ ] Version number follows semver
- [ ] README has correct installation instructions
- [ ] Git working directory is clean

### Troubleshooting
- **"ENEEDAUTH"**: Run `npm login` first
- **"403 Forbidden"**: Check npm permissions for @arvorco scope
- **"Version exists"**: Bump version in package.json
- See `PUBLISHING_GUIDE.md` for complete troubleshooting

### After Publishing
Users install with:
```bash
npm install -g @arvorco/relentless
# or
bun install -g @arvorco/relentless
```
