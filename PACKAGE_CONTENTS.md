# NPM Package Contents

## What's Included in @arvorco/relentless

When users install `@arvorco/relentless` from npm, they get:

### ✅ Core Functionality
- `bin/` - CLI entry point (relentless command)
- `src/` - Complete TypeScript source code
  - `agents/` - All agent adapters
  - `config/` - Configuration system
  - `prd/` - PRD parser and analyzer
  - `execution/` - Orchestration loop
  - `init/` - Project scaffolder
  - `tui/` - Beautiful terminal UI

### ✅ Skills & Commands (Critical!)
- `.claude/skills/` - All 11 skills for Claude/Amp/OpenCode
  - constitution, specify, plan, tasks, checklist, clarify, etc.
  - Each with SKILL.md, templates, and scripts
- `.claude/commands/` - All command wrappers

### ✅ Templates
- `templates/constitution.md` - Constitution template
- `templates/plan.md` - Plan template
- These get copied to user projects on `relentless init`

### ✅ Documentation
- `README.md` - Full documentation
- `GEMINI_SETUP.md` - Gemini integration guide
- `LICENSE` - MIT license
- `prd.json.example` - Example PRD format

### ✅ Configuration
- `package.json` - Package metadata
- `relentless/config.json` - Default config
- `eslint.config.js` - ESLint config (for package dev)

## ❌ What's Excluded (Repository Only)

### Development Files
- `.github/` - GitHub Actions workflows
- `scripts/` - Release and publishing scripts
- `.specify/` - Old directory structure (deprecated)
- `skills/` - Duplicate skills at root (deprecated)
- `ralph.sh` - Old script

### Maintainer Documentation
- `CLAUDE.md` - Development guidelines
- `AGENTS.md` - Development guidelines
- `COMMIT_MESSAGE.md` - Commit template
- `PUBLISHING.md` - Publishing guide
- `PUBLISHING_GUIDE.md` - Publishing workflow
- `REFACTOR_SUMMARY.md` - Technical refactoring details
- `CHANGES_SUMMARY.md` - Detailed changelog for devs

### Internal Features
- `relentless/features/ghsk-ideas/` - Our internal test feature
- `prompt.md` - Development prompt

### Build Artifacts
- `node_modules/` - Dependencies (users install these)
- `bun.lock`, `*.lock` - Lock files
- `*.log` - Log files
- `.DS_Store` - OS files

## Package Size

Total: ~260 KB unpacked
- Small enough to install quickly
- Large enough to include all needed functionality

## Verification

To see exactly what will be published:

```bash
npm pack --dry-run
```

This shows the tarball contents without actually creating the package.

## Why This Matters

**Users need:**
- Working CLI and source code ✅
- Skills for Claude/Amp/OpenCode ✅
- Templates for initialization ✅
- Clear documentation ✅

**Users don't need:**
- Our CI/CD workflows ❌
- Our release scripts ❌
- Our internal features ❌
- Maintainer documentation ❌

This keeps the package lean and professional while including everything users need to run Relentless.
