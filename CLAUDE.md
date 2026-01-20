# Relentless - Universal AI Agent Orchestrator

## Overview

This is the Relentless codebase - a universal AI agent orchestrator that works with multiple AI coding agents (Claude Code, Amp, OpenCode, Codex, Droid, Gemini).

**Recent Major Updates (January 2026):**
- **v0.2.0**: Multi-agent skills installation - all 6 agents now get skills via `relentless init`
- Skills architecture: commands are thin wrappers, logic in `.claude/skills/`
- Agent-specific folders: `.amp/skills/`, `.opencode/skill/`, `.codex/skills/`, `.factory/skills/`, `.gemini/GEMINI.md`
- Full support: Claude, Amp, OpenCode | Manual workflow: Codex, Droid, Gemini

## Codebase Patterns

### Directory Structure

- `bin/` - CLI entry point (relentless.ts)
- `src/` - Core TypeScript implementation
  - `agents/` - Agent adapters for each AI coding agent
  - `config/` - Configuration schema and loading
  - `prd/` - PRD parsing and validation
  - `execution/` - Orchestration loop and routing
  - `init/` - Project initialization scaffolder
- `.claude/skills/` - Skills for Claude Code (also copied to other agents)
- `.claude/commands/` - Command wrappers that load skills

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

## Testing

Relentless follows Test-Driven Development (TDD). All new features must have tests written BEFORE implementation.

### Running Tests

```bash
# Run all tests
bun test

# Run tests with coverage report
bun test --coverage

# Run specific test file
bun test tests/queue/parser.test.ts

# Watch mode for development
bun test --watch
```

### Test File Structure

```
tests/
├── helpers/           # Shared test utilities
│   └── index.ts       # Temp dirs, file helpers, fixtures
├── queue/             # Queue module tests
│   └── parser.test.ts # Parser unit tests
├── integration/       # Integration tests (future)
└── e2e/              # End-to-end tests (future)
```

### Test File Naming Convention

- Unit tests: `*.test.ts` (placed alongside tests/ or near source)
- Integration tests: `tests/integration/*.test.ts`
- E2E tests: `tests/e2e/*.test.ts`

### TDD Workflow (Red-Green-Refactor)

1. **Red Phase**: Write failing tests that define expected behavior
   ```typescript
   it("should parse valid queue line", () => {
     const result = parseQueueLine("2026-01-13T10:00:00.000Z | Fix bug");
     expect(result).not.toBeNull();
     expect(result?.content).toBe("Fix bug");
   });
   ```

2. **Green Phase**: Write minimum code to pass tests
   ```typescript
   export function parseQueueLine(line: string): QueueItem | null {
     const match = line.match(/^(.+?) \| (.+)$/);
     if (!match) return null;
     return { timestamp: match[1], content: match[2] };
   }
   ```

3. **Refactor Phase**: Clean up while keeping tests green
   - Extract constants
   - Improve naming
   - Remove duplication

### Test Helpers

The `tests/helpers/` module provides utilities for testing:

```typescript
import {
  createTempDir,
  createTestFile,
  readTestFile,
  fixtures,
  mockTimestamp,
} from "../helpers";

// Create isolated temp directory
const { path, cleanup } = await createTempDir();

// Create test files
await createTestFile(path, ".queue.txt", "content");

// Generate fixtures
fixtures.validQueueLine("Fix the bug");  // "2026-01-13T10:00:00.000Z | Fix the bug"
fixtures.queueCommand("PAUSE");           // "[PAUSE]"
fixtures.queueCommand("SKIP", "US-003");  // "[SKIP US-003]"

// Always cleanup
await cleanup();
```

### Coverage Requirements

- Aim for >80% code coverage on new features
- Critical paths must have 100% coverage
- Edge cases and error conditions must be tested

### Important Files

- `bin/relentless.ts` - Main CLI entry point
- `src/agents/` - Agent adapters for each supported agent
- `src/init/scaffolder.ts` - Project initialization and skill installation
- `src/prd/parser.ts` - PRD markdown parser (reads tasks.md format)
- `.claude/skills/*/SKILL.md` - Skill implementations
- `.claude/skills/*/templates/` - Templates used by skills
- `.claude/commands/relentless.*.md` - Command wrappers
- `docs/` - Additional documentation (Gemini setup, etc.)

### Auto Mode (Smart Routing) Module

The Auto Mode feature provides intelligent task-to-model routing:

**Routing Module (`src/routing/`):**
- `classifier.ts` - Hybrid complexity classifier (heuristic + LLM fallback)
- `router.ts` - Mode-Model matrix router (free/cheap/good/genius × complexity)
- `cascade.ts` - Escalation logic (automatic retry with more capable models)
- `fallback.ts` - Harness fallback (rate limit handling, availability checks)
- `estimate.ts` - Cost estimation (per-story and feature-level)
- `report.ts` - Cost reporting (actual vs estimated, model utilization)
- `registry.ts` - Model registry (capabilities, pricing, harness mapping)

**CLI Flags (`src/cli/`):**
- `mode-flag.ts` - `--mode` flag parsing (free/cheap/good/genius)
- `fallback-order.ts` - `--fallback-order` flag parsing
- `review-flags.ts` - `--skip-review` and `--review-mode` flags

**Review Module (`src/review/`):**
- `types.ts` - Review schemas (micro-tasks, fix tasks, summary)
- Review micro-tasks: typecheck, lint, test, security, quality, docs

**Testing Patterns:**
- Unit tests: `tests/routing/*.test.ts` (267 tests, 96.98% coverage)
- Integration tests: `tests/integration/auto-mode.test.ts` (33 tests)
- Use `createMockAdapter()` for deterministic testing
- Use `createTestPRD()` fixture for mixed complexity tasks

### Documentation Guidelines

**Root Directory:**
Keep only essential files in the root:
- `README.md` - User-facing documentation
- `CLAUDE.md` - Developer/maintainer guide
- `AGENTS.md` - Symlink to CLAUDE.md
- `LICENSE` - MIT license

**docs/ Directory:**
All other documentation files should go in `docs/`:
- Setup guides (e.g., `docs/GEMINI_SETUP.md`)
- Internal documentation
- Architecture diagrams
- Development notes
- Never create temporary .md files in root (COMMIT_MESSAGE.md, RELEASE_READY.md, etc.)
- Always use `docs/` for any documentation beyond README and CLAUDE.md

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
- Includes: `bin/`, `src/`, `.claude/`, docs
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
