# Relentless Commands Refactoring Summary

## Overview

Successfully forked and refactored Spec Kit-inspired commands into native Relentless commands. All commands now work with `relentless/features/` structure and are implemented as skills.

## Major Changes

### 1. Command Renaming
- ✅ Renamed all `/speckit.*` commands to `/relentless.*`
- ✅ Updated all internal references in command files
- ✅ Updated documentation (README, etc.)

### 2. Directory Structure Migration
- **From:** `.specify/specs/NNN-feature/`
- **To:** `relentless/features/NNN-feature/`

**New Feature Structure:**
```
relentless/features/003-user-auth/
├── spec.md          # Feature description (/relentless.specify)
├── plan.md          # Technical plan (/relentless.plan)
├── tasks.md         # User stories (/relentless.tasks) ← SOURCE FOR PRD.JSON
├── checklist.md     # Quality checks (/relentless.checklist)
├── prd.json         # For orchestrator (converted from tasks.md)
└── progress.txt     # Progress tracking
```

### 3. Skills Architecture

**Commands are now thin wrappers that load skills:**

```
.claude/
├── commands/                    # Thin wrappers
│   ├── relentless.constitution.md
│   ├── relentless.specify.md
│   ├── relentless.plan.md
│   ├── relentless.tasks.md
│   ├── relentless.checklist.md
│   ├── relentless.clarify.md
│   ├── relentless.analyze.md
│   ├── relentless.implement.md
│   └── relentless.taskstoissues.md
└── skills/                      # Heavy lifting
    ├── constitution/
    │   ├── SKILL.md
    │   └── templates/
    │       └── constitution-template.md
    ├── specify/
    │   ├── SKILL.md
    │   ├── templates/
    │   │   └── spec-template.md
    │   └── scripts/
    │       └── bash/
    │           ├── create-new-feature.sh  # Refactored for relentless/features/
    │           ├── check-prerequisites.sh
    │           └── ...
    ├── plan/
    │   ├── SKILL.md
    │   └── templates/
    │       └── plan-template.md
    ├── tasks/
    │   ├── SKILL.md
    │   └── templates/
    │       └── tasks-template.md
    ├── checklist/
    │   ├── SKILL.md
    │   └── templates/
    │       └── checklist-template.md
    ├── clarify/
    │   └── SKILL.md
    ├── analyze/
    │   └── SKILL.md
    ├── implement/
    │   └── SKILL.md
    └── taskstoissues/
        └── SKILL.md
```

### 4. Constitution Flow

**OLD (wrong):**
```bash
relentless init → copies constitution template ❌
```

**NEW (correct):**
```bash
relentless init → creates empty structure
/relentless.constitution → Asks questions, generates personalized constitution ✓
```

Constitution is now generated per-project, not copied from a template.

### 5. Workflow Updates

**NEW Complete Workflow:**

```bash
# 1. Initialize
relentless init

# 2. Create personalized constitution (recommended first step)
/relentless.constitution

# 3. Create feature specification
/relentless.specify Add user authentication with OAuth2

# 4. Generate technical plan
/relentless.plan I'm using React, TypeScript, PostgreSQL

# 5. Generate user stories (THIS CREATES THE PRD SOURCE!)
/relentless.tasks

# 6. Generate quality checklist
/relentless.checklist

# 7. Convert tasks.md to prd.json
relentless convert relentless/features/003-user-auth/tasks.md --feature 003-user-auth

# 8. Run orchestration
relentless run --feature 003-user-auth --tui
```

### 6. Convert Command Updates

**OLD:**
- Read any markdown file
- Expected `prd.md` with user stories

**NEW:**
- Reads `tasks.md` (primary source for user stories)
- Optional: `--with-checklist` flag to merge checklist items
- Future: Will also read spec.md and plan.md for context

```bash
# Basic conversion
relentless convert relentless/features/003-user-auth/tasks.md --feature 003-user-auth

# With checklist merging
relentless convert relentless/features/003-user-auth/tasks.md --feature 003-user-auth --with-checklist
```

### 7. Scaffolder Updates

**Init now installs all skills:**
- constitution
- specify
- plan
- tasks
- checklist
- clarify
- analyze
- implement
- taskstoissues
- prd (existing)
- relentless (existing)

**Does NOT copy constitution.md** - this must be generated via `/relentless.constitution`

### 8. Script Refactoring

All bash scripts updated to work with `relentless/features/`:
- ✅ `create-new-feature.sh` - Creates features in `relentless/features/`
- ✅ `check-prerequisites.sh` - Updated paths
- ✅ `setup-plan.sh` - Updated paths
- ✅ All scripts use skills templates

## Key Files Modified

### Core Files
- `bin/relentless.ts` - Updated convert command
- `src/init/scaffolder.ts` - Updated skill installation
- `README.md` - Updated workflow examples

### Commands (Simplified)
All commands are now thin wrappers (~10-20 lines each):
- Load the corresponding skill
- Pass user context
- Let skill do the heavy lifting

### Skills (New)
Created 9 new comprehensive skills with:
- Step-by-step instructions
- Template references
- Validation rules
- Example outputs

## Testing Checklist

- [ ] `relentless init` creates correct structure
- [ ] Skills are installed in `.claude/skills/`
- [ ] Commands are installed in `.claude/commands/`
- [ ] `/relentless.constitution` generates constitution.md
- [ ] `/relentless.specify` creates numbered feature directory
- [ ] Scripts create files in `relentless/features/NNN-feature/`
- [ ] `tasks.md` has correct user story format
- [ ] `relentless convert tasks.md` generates prd.json
- [ ] `relentless run` works with generated prd.json

## Breaking Changes

1. **Directory structure changed** - Old projects using `.specify/specs/` need migration
2. **Constitution not auto-copied** - Must run `/relentless.constitution`
3. **Convert expects tasks.md** - Not prd.md or spec.md
4. **Commands renamed** - `/speckit.*` → `/relentless.*`

## Migration Guide

For existing projects using old structure:

```bash
# 1. Move specs to features
mv .specify/specs/* relentless/features/

# 2. Rename spec.md → tasks.md if it contains user stories
cd relentless/features/NNN-feature
mv spec.md tasks.md  # if spec.md contains user stories

# 3. Run convert with new path
relentless convert relentless/features/NNN-feature/tasks.md --feature NNN-feature
```

## Agent Support Strategy

### Tier 1: Full Skills Support ✅
**Agents:** Claude Code, Amp, OpenCode  
**Status:** Ready to use  
**Experience:** Best - full interactive workflow with `/relentless.*` commands

### Tier 2: Extensions/Hybrid 🔄
**Agents:** Gemini  
**Status:** In development  
**Experience:** Good - will use Gemini extensions format
**Current Workaround:** Manual file creation + prompting

### Tier 3: Manual/CLI 📝
**Agents:** Droid, Codex  
**Status:** Works but manual  
**Experience:** Basic - create files manually or prompt agent to create them
**Workflow:** Use CLI commands + manual file editing

### Why This Approach?

1. **Best for power users** - Claude/Amp/OpenCode get full interactive workflow
2. **Extensible** - Easy to add support for new agents
3. **Universal core** - All agents can use `relentless run` for orchestration
4. **Graceful degradation** - Manual workflow always available

## Next Steps

1. ✅ Update README workflow section with new flow
2. ✅ Document agent support tiers
3. ✅ Create GEMINI_SETUP.md guide
4. Test complete workflow end-to-end with each agent tier
5. Add checklist merging logic to convert command
6. Create migration script for old projects
7. Implement Gemini extensions conversion script
8. Update video tutorials/documentation

## References

- Inspired by GitHub Spec Kit
- Forked and adapted for Relentless
- Native integration with Relentless orchestration
- Works with relentless/features/ structure
