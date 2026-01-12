feat: fork Spec Kit commands as native Relentless with multi-agent support

Major refactoring to create Relentless-native commands with multi-tier agent support strategy.

## Breaking Changes
- All `/speckit.*` commands renamed to `/relentless.*`
- Directory structure changed from `.specify/specs/` to `relentless/features/`
- Constitution no longer copied as template, must be generated via `/relentless.constitution`
- Convert command now reads `tasks.md` instead of `spec.md` or `prd.md`

## New Features

### Skills Architecture
- Commands are now thin wrappers (~10-20 lines) that load skills
- Skills contain actual logic, templates, and scripts
- Each skill has comprehensive SKILL.md with step-by-step instructions
- 9 new skills created: constitution, specify, plan, tasks, checklist, clarify, analyze, implement, taskstoissues

### Multi-Tier Agent Support
**Tier 1 - Full Skills Support:**
- Claude Code, Amp, OpenCode
- Complete interactive workflow with `/relentless.*` commands
- Best user experience

**Tier 2 - Extensions (In Development):**
- Gemini
- Extensions-based workflow
- GEMINI_SETUP.md guide provided
- Current workaround: manual file creation + prompting

**Tier 3 - Manual/CLI:**
- Droid, Codex
- Manual file creation or prompt-based
- Can reference skill files in prompts
- All CLI commands work

### Key Improvements
- Personalized constitution generation (not copied template)
- tasks.md as source of truth for user stories
- Droid defaults to --auto high for autonomous operation
- Enhanced documentation with tier-specific workflows
- Gemini fully configured in default config

## Files Changed

### Deleted
- 9 old speckit command files

### Created
- 9 new relentless command files
- 9 comprehensive skills with templates and scripts
- GEMINI_SETUP.md - Gemini integration guide
- REFACTOR_SUMMARY.md - Technical details
- CHANGES_SUMMARY.md - Complete overview

### Modified
- bin/relentless.ts - Enhanced convert command (reads tasks.md, optional checklist merge)
- src/init/scaffolder.ts - Installs all 11 skills, removed constitution copying
- src/agents/droid.ts - Added --auto high default
- README.md - Updated workflows, agent support tiers, fixed all speckit references
- CLAUDE.md - Added refactoring context, updated key concepts
- Scripts and templates - Refactored paths from .specify/ to relentless/features/

## Documentation
- README.md fully updated with new workflows
- CLAUDE.md updated with refactoring context
- GEMINI_SETUP.md created for Gemini users
- Comprehensive summaries in REFACTOR_SUMMARY.md and CHANGES_SUMMARY.md
- Each skill has detailed SKILL.md documentation

## Migration Guide
For existing projects:
```bash
# Move specs to features
mv .specify/specs/* relentless/features/

# Rename spec.md → tasks.md if it contains user stories
cd relentless/features/NNN-feature
mv spec.md tasks.md

# Convert with new path
relentless convert relentless/features/NNN-feature/tasks.md --feature NNN-feature
```

## Next Steps
- Test complete workflow with each agent tier
- Implement checklist merging logic (marked as TODO)
- Create Gemini extensions conversion script
- Migration script for old projects

Co-authored-by: factory-droid[bot] <138933559+factory-droid[bot]@users.noreply.github.com>
