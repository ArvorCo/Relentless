# Changelog

All notable changes to Relentless will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-01-14

### Added
- **Queue System for Mid-Run User Guidance**: Inject prompts and commands while orchestration is running
- Queue file format (`.queue.txt`) with ISO timestamps
- Structured commands: `[PAUSE]`, `[SKIP US-XXX]`, `[PRIORITY US-XXX]`, `[ABORT]`
- Text prompts injected into agent context at iteration start
- CLI commands: `relentless queue add`, `queue list`, `queue remove`, `queue clear`
- TUI integration: `q` to add, `d+1-9` to delete, `D+y` to clear all
- Real-time queue panel with file watching
- Crash recovery and persistence (`.queue.processed.txt` audit trail)
- Concurrent-safe atomic writes with file locking
- 374 tests across 19 test files (unit, integration, E2E)
- Test helpers in `tests/helpers/` with fixtures and utilities

### Changed
- Runner now processes queue at start of each iteration
- TUI App includes QueuePanel, QueueInput, and QueueRemoval components

## [0.2.0] - 2026-01-13

### Added
- **Multi-agent skills installation**: All 6 agents now get skills installed automatically via `relentless init`
- Amp support: `.amp/skills/` with full skill support
- OpenCode support: `.opencode/skill/` and `.opencode/command/` (singular folder names!)
- Codex support: `.codex/skills/` and `~/.codex/prompts/` for user-level prompts
- Factory/Droid support: `.factory/skills/` and `.factory/commands/`
- Gemini support: `.gemini/GEMINI.md` context file with instructions
- Self-destruction prevention when running `relentless init -f` in Relentless project itself
- Landing page with Ralph Wiggum and "What's in a Name?" section

### Changed
- **BREAKING**: Skills now installed to agent-specific folders (previously Claude-only)
- README completely rewritten with cleaner design and better structure
- Added "What's in a Name?" section with RALPH/RELENTLESS acronyms
- Simplified Quick Start (4 steps)
- Updated Supported Agents table with correct folder paths

### Fixed
- Running `init -f` in the Relentless project no longer deletes source skills
- Added `.amp/`, `.codex/`, `.factory/`, `.gemini/`, `.opencode/` to `.gitignore`

## [0.1.27] - 2026-01-13

### Changed
- `prompt.md` no longer created by `relentless init` - generated only by `/relentless.constitution`
- Consolidated prompt generation into constitution skill for better customization

## [0.1.26] - 2026-01-13

### Fixed
- Protected `prompt.md` from being overwritten by `init -f` flag
- Added prompt template for constitution skill to generate personalized prompts

## [0.1.25] - 2026-01-13

### Changed
- Templates now consolidated inside skills directory
- Removed root `templates/` directory (moved to `.claude/skills/*/templates/`)

## [0.1.24] - 2026-01-13

### Fixed
- Minor stability improvements

## [0.1.23] - 2026-01-13

### Changed
- Skills made generic and project-agnostic
- Removed Relentless-specific references from skill templates
- Skills can now be used in any project without modification

## [0.1.22] - 2026-01-13

### Fixed
- Constitution parser now handles bullet-point format correctly
- MUST/SHOULD rules properly extracted from bulleted lists

## [0.1.21] - 2026-01-13

### Fixed
- `loadConstitution` now auto-finds constitution.md in relentless/ folder
- Progress file null checks prevent crashes on missing files
- Runner enhanced to load spec.md and tasks.md content for agent context

## [0.1.20] - 2026-01-13

### Added
- Constitution skill now creates **both** `constitution.md` AND `prompt.md` in one command
- Personalized `prompt.md` generation based on project structure analysis
- Automatic detection of quality commands from `package.json`
- Project-specific patterns extraction from README, AGENTS.md, and other docs
- TDD workflow guidance when tests are detected

### Changed
- **BREAKING WORKFLOW**: `/relentless.constitution` now generates both constitution and prompt files
- Simplified generic `prompt.md` template from ~3.5KB to ~1KB
- Updated README with new simplified workflow (init → constitution → specify)
- Removed separate `/relentless.prompt` skill (now integrated into constitution)

### Fixed
- Generic prompt template now properly encourages personalization
- Documentation now correctly reflects the simplified workflow

## [0.1.19] - 2026-01-12

### Added
- Dynamic story grid sizing based on terminal height
- Automatic calculation of available space for story display
- All stories now visible on large terminals (63+ rows)

### Changed
- Story grid adapts to terminal size automatically
- Removed static 8-row limitation
- Improved space utilization (shows 40+ story rows on large terminals)

### Fixed
- Hidden stories issue (only 16 of 23 stories were visible)
- Story grid now scales properly with terminal size

## [0.1.18] - 2026-01-12

### Added
- Rich story information display in TUI
- Priority badges with color coding (P1-P2 red, P3-P5 yellow, P6+ gray)
- Acceptance criteria count indicator `(Nc)` per story
- Research indicator emoji (🔍) for stories requiring investigation
- Phase badges showing story phase (Setup, Foundation, Stories, Polish)

### Changed
- Story titles now show 40 characters (increased from 25, 60% more context)
- Enhanced Story type with priority, criteriaCount, research, and phase fields
- Improved visual hierarchy with better use of available terminal width

### Fixed
- **CRITICAL**: TUI rendering artifacts completely resolved
- Removed all bordered components causing Ink reconciliation issues
- Simplified layout with text separators instead of borders (`── Title ──`)
- No more repeated empty borders or overlapping text

## [0.1.17] - 2026-01-12

### Fixed
- TUI scroll artifacts by constraining UI height to terminal dimensions
- Added terminal height awareness via `stdout.rows`
- Prevented UI from exceeding available terminal space

## [0.1.16] - 2026-01-12

### Fixed
- Terminal clearing before TUI start to prevent rendering artifacts
- Added ANSI escape codes to clear screen before Ink rendering

## [0.1.15] - 2026-01-12

### Fixed
- Newline rendering issues in TUI output
- Enhanced `addOutput()` to split and clean embedded newlines
- Removed `\n` prefixes from iteration messages

## [0.1.14] - 2026-01-12

### Fixed
- Empty line padding in TUI AgentOutput component
- Removed blank line padding that created visual artifacts

## [0.1.13] - 2026-01-12

### Added
- Checklist support in orchestration loop
- `checklist.md` now loaded and included in agent prompts
- Quality gates automatically presented to agents during execution

### Changed
- Agent prompts now include quality checklist after plan.md
- Improved guidance for agents with project-specific quality requirements

## [0.1.12] - 2026-01-12

### Fixed
- **CRITICAL**: Bash scripts now included in npm package
- Changed `.npmignore` from `scripts/` to `/scripts/` to only exclude root directory
- `/relentless.specify` command now works correctly (was failing with "script not found")
- Package now includes 5 essential bash scripts (47KB total)

## [0.1.11] - 2026-01-12

### Changed
- Repository cleanup: Removed ~170KB of obsolete files
- Removed obsolete `.specify/` directory (92KB)
- Removed duplicate `skills/` directory at root (64KB)
- Removed obsolete scripts: `ralph.sh`, `prompt.md`, `prd.json.example`
- Cleaned up `.npmignore` references to removed files

### Fixed
- Professional, lean codebase with clear structure

## [0.1.10] - 2026-01-11

### Fixed
- Version display now reads from `package.json` dynamically
- `relentless --version` now syncs automatically with releases
- Removed hardcoded version string

## [0.1.9] - 2026-01-11

### Fixed
- **CRITICAL**: `.claude/skills/` directory now included in npm package
- Added negation patterns to `.npmignore`: `!.claude/`, `!.claude/skills/`, `!.claude/commands/`
- `/relentless.constitution` and other skills now work after npm install
- Package grew from 54KB to 76KB with skills included

## [0.1.8] - 2026-01-11

### Added
- `--force` flag to `init` command for reinstalling/updating files
- Ability to overwrite existing relentless files with latest versions

### Fixed
- Improved path resolution for global installations
- Better error handling and diagnostics in init command

## [0.1.7] - 2026-01-11

### Changed
- Renamed "Legacy" to "Ralph Wiggum Method" in documentation

### Fixed
- Updated constitution command to use `.claude/skills/` paths
- Updated specify command to use new paths
- Removed obsolete `plan.old.md` command file

## [0.1.6] - 2026-01-11

### Fixed
- GitHub Actions: Added contents write permission for GitHub releases
- Updated to modern GitHub release action syntax

## [0.1.5] - 2026-01-11

### Changed
- Stopped tracking `package-lock.json` (npm package best practice)

## [0.1.4] - 2026-01-11

### Fixed
- Package-lock.json updates for consistency

## [0.1.2] - 2026-01-11

### Fixed
- Corrected bin path in `package.json`
- Fixed GitHub Actions workflow syntax

## [0.1.1] - 2026-01-11

### Fixed
- Initial bug fixes for npm publishing

## [0.1.0] - 2026-01-10

### Added - Initial Release

**Core Features:**
- Universal AI agent orchestrator supporting Claude Code, Amp, OpenCode, Codex, Droid, and Gemini
- Single binary installation with PATH setup
- Beautiful TUI interface with real-time progress tracking
- Intelligent agent fallback and rate limit detection
- Auto-recovery when rate limits reset

**Specification & Planning (Relentless Commands):**
- `/relentless.constitution` - Create project principles and governance
- `/relentless.specify` - Interactive feature specification from natural language
- `/relentless.plan` - Generate technical implementation plans
- `/relentless.tasks` - Create hierarchical task breakdown (4-phase structure)
- `/relentless.checklist` - Generate quality validation checklists
- `/relentless.clarify` - Interactive ambiguity resolution

**Task Management:**
- Dependency-ordered execution with circular dependency detection
- Parallel task markers for concurrent execution
- Phase-based planning (Setup → Foundation → Stories → Polish)
- Research phase support for investigation tasks

**CLI Commands:**
- `relentless init` - Initialize project structure
- `relentless run` - Execute orchestration loop
- `relentless convert` - Convert markdown PRDs to JSON
- `relentless features` - Manage feature directories
- `relentless analyze` - Cross-artifact consistency checking
- `relentless issues create` - Generate GitHub issues from stories

**Skills System:**
- Multi-tier agent support (Full/Extensions/Manual)
- Skills auto-installation for Claude Code, Amp, OpenCode
- Manual workflow support for Droid, Codex, Gemini

**Documentation:**
- Comprehensive README with quick start guides
- Agent-specific workflow documentation
- Architecture documentation
- MIT License

---

## Evolution from Ralph Wiggum

Relentless evolved from the [Ralph Wiggum Pattern](https://ghuntley.com/ralph/) created by Geoffrey Huntley. Key innovations:

- **Multi-agent support** - Works with any AI coding agent, not just Claude
- **Skills system** - Native commands instead of manual prompt engineering  
- **Beautiful TUI** - Real-time visualization vs text-only output
- **Intelligent fallback** - Automatic agent switching on rate limits
- **Structured workflow** - Constitution → Specify → Plan → Tasks → Run

---

## Links

- **GitHub**: https://github.com/ArvorCo/Relentless
- **npm Package**: https://www.npmjs.com/package/@arvorco/relentless
- **License**: MIT
- **Inspiration**: [Ralph Wiggum Pattern](https://ghuntley.com/ralph/) by Geoffrey Huntley

[Unreleased]: https://github.com/ArvorCo/Relentless/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/ArvorCo/Relentless/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/ArvorCo/Relentless/compare/v0.1.27...v0.2.0
[0.1.27]: https://github.com/ArvorCo/Relentless/compare/v0.1.26...v0.1.27
[0.1.26]: https://github.com/ArvorCo/Relentless/compare/v0.1.25...v0.1.26
[0.1.25]: https://github.com/ArvorCo/Relentless/compare/v0.1.24...v0.1.25
[0.1.24]: https://github.com/ArvorCo/Relentless/compare/v0.1.23...v0.1.24
[0.1.23]: https://github.com/ArvorCo/Relentless/compare/v0.1.22...v0.1.23
[0.1.22]: https://github.com/ArvorCo/Relentless/compare/v0.1.21...v0.1.22
[0.1.21]: https://github.com/ArvorCo/Relentless/compare/v0.1.20...v0.1.21
[0.1.20]: https://github.com/ArvorCo/Relentless/compare/v0.1.19...v0.1.20
[0.1.19]: https://github.com/ArvorCo/Relentless/compare/v0.1.18...v0.1.19
[0.1.18]: https://github.com/ArvorCo/Relentless/compare/v0.1.17...v0.1.18
[0.1.17]: https://github.com/ArvorCo/Relentless/compare/v0.1.16...v0.1.17
[0.1.16]: https://github.com/ArvorCo/Relentless/compare/v0.1.15...v0.1.16
[0.1.15]: https://github.com/ArvorCo/Relentless/compare/v0.1.14...v0.1.15
[0.1.14]: https://github.com/ArvorCo/Relentless/compare/v0.1.13...v0.1.14
[0.1.13]: https://github.com/ArvorCo/Relentless/compare/v0.1.12...v0.1.13
[0.1.12]: https://github.com/ArvorCo/Relentless/compare/v0.1.11...v0.1.12
[0.1.11]: https://github.com/ArvorCo/Relentless/compare/v0.1.10...v0.1.11
[0.1.10]: https://github.com/ArvorCo/Relentless/compare/v0.1.9...v0.1.10
[0.1.9]: https://github.com/ArvorCo/Relentless/compare/v0.1.8...v0.1.9
[0.1.8]: https://github.com/ArvorCo/Relentless/compare/v0.1.7...v0.1.8
[0.1.7]: https://github.com/ArvorCo/Relentless/compare/v0.1.6...v0.1.7
[0.1.6]: https://github.com/ArvorCo/Relentless/compare/v0.1.5...v0.1.6
[0.1.5]: https://github.com/ArvorCo/Relentless/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/ArvorCo/Relentless/compare/v0.1.2...v0.1.4
[0.1.2]: https://github.com/ArvorCo/Relentless/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/ArvorCo/Relentless/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/ArvorCo/Relentless/releases/tag/v0.1.0
