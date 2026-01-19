# User Stories & Tasks: Smart Auto Model Routing

**Feature**: Smart Auto Model Routing
**Branch**: `002-smart-auto-model`
**Created**: 2026-01-19
**Total Stories**: 30
**Phases**: Foundation (8) → Stories (12) → Polish (4) + Review (6)

---

## Table of Contents

1. [Phase 0: Foundation](#phase-0-foundation) - US-001 to US-008
2. [Phase 1: Routing Intelligence](#phase-1-routing-intelligence) - US-009 to US-012
3. [Phase 2: Review Micro-Tasks](#phase-2-review-micro-tasks) - US-013 to US-020
4. [Phase 3: CLI & Integration](#phase-3-cli--integration) - US-021 to US-026
5. [Phase 4: Polish](#phase-4-polish) - US-027 to US-030

---

## Phase 0: Foundation

### US-001: Configuration Schema Extensions for Auto Mode

**Description:** As a Relentless developer, I want to extend the configuration schema with Zod schemas for AutoModeConfig, ModeModels, ReviewConfig, and EscalationConfig so that the system can validate and load auto-mode settings from relentless.config.yaml.

**Acceptance Criteria:**
- [ ] Create `ModeSchema` as `z.enum(["free", "cheap", "good", "genius"])` in `src/config/schema.ts`
- [ ] Create `ComplexitySchema` as `z.enum(["simple", "medium", "complex", "expert"])` for task complexity levels
- [ ] Create `HarnessNameSchema` as `z.enum(["claude", "codex", "droid", "opencode", "amp", "gemini"])`
- [ ] Create `ModeModelsSchema` with properties: `simple`, `medium`, `complex`, `expert` - each being `z.string()` for model names
- [ ] Create `ReviewTaskSchema` as `z.enum(["typecheck", "lint", "test", "security", "quality", "docs"])` for micro-task types
- [ ] Create `ReviewConfigSchema` with: `promptUser` (boolean), `defaultMode` (ModeSchema), `microTasks` (array), `maxRetries` (1-5)
- [ ] Create `EscalationConfigSchema` with: `enabled` (boolean), `maxAttempts` (1-5), `escalationPath` (Record<string, string>)
- [ ] Create `AutoModeConfigSchema` with: `enabled`, `defaultMode`, `fallbackOrder`, `modeModels`, `review`, `escalation`
- [ ] Export TypeScript types: `Mode`, `Complexity`, `HarnessName`, `ModeModels`, `ReviewConfig`, `EscalationConfig`, `AutoModeConfig`
- [ ] Add `autoMode` property to `RelentlessConfigSchema` using `AutoModeConfigSchema.default({})`
- [ ] Update `DEFAULT_CONFIG` to include sensible defaults for `autoMode` section
- [ ] All new schemas must have JSDoc comments explaining their purpose
- [ ] Run `bun run typecheck` with zero errors
- [ ] Run `bun run lint` with zero errors or warnings
- [ ] Create unit tests in `tests/config/schema.test.ts` covering all new schema validations

**Dependencies:** None (foundational story)
**Phase:** Foundation
**Priority:** 1
**Parallel:** No

---

### US-002: Model Registry Data Structure and Initial Data

**Description:** As a Relentless developer, I want to create a model registry data structure with Zod schemas and populate it with initial model data so that the routing system has comprehensive information about available models, their capabilities, costs, and CLI usage patterns.

**Acceptance Criteria:**
- [ ] Create new file `src/routing/registry.ts` for the model registry module
- [ ] Create `ModelTierSchema` as `z.enum(["free", "cheap", "standard", "premium", "sota"])`
- [ ] Create `ModelProfileSchema` with: `id`, `displayName`, `harness`, `tier`, `inputCost`, `outputCost`, `sweBenchScore`, `contextWindow`, `tokensPerSecond`, `strengths`, `limitations`, `cliFlag`, `cliValue`
- [ ] Create `HarnessProfileSchema` with: `name`, `displayName`, `models`, `defaultModel`, `supportsModelSelection`, `modelSelectionMethod`
- [ ] Export TypeScript types: `ModelTier`, `ModelProfile`, `HarnessProfile`
- [ ] Create and export `MODEL_REGISTRY` constant array containing all model profiles (15+ models across 6 harnesses)
- [ ] Create and export `HARNESS_PROFILES` constant array containing profiles for all 6 harnesses
- [ ] Create and export `getModelById(id: string): ModelProfile | undefined` function
- [ ] Create and export `getModelsByHarness(harness: HarnessName): ModelProfile[]` function
- [ ] Create and export `getModelsByTier(tier: ModelTier): ModelProfile[]` function
- [ ] Create and export `getDefaultModelForHarness(harness: HarnessName): string` function
- [ ] Create and export `getHarnessForModel(modelId: string): HarnessName | undefined` function
- [ ] All models in registry must have accurate cost data from plan.md
- [ ] Create `src/routing/index.ts` to export all routing module types and functions
- [ ] Run `bun run typecheck` with zero errors
- [ ] Run `bun run lint` with zero errors or warnings
- [ ] Create unit tests in `tests/routing/registry.test.ts` covering all registry functions

**Dependencies:** US-001 (requires HarnessNameSchema)
**Phase:** Foundation
**Priority:** 2
**Parallel:** No

---

### US-003: Verify Claude Adapter Model Selection Support

**Description:** As a Relentless developer, I want to verify that the Claude adapter already supports model selection via the `--model` flag so that I can confirm it as the reference implementation for other harness adapters.

**Acceptance Criteria:**
- [ ] Verify `src/agents/claude.ts` `invoke()` method checks for `options?.model` and passes `--model` flag
- [ ] Verify `invokeStream()` method also supports the `--model` flag when `options?.model` is present
- [ ] Verify `src/agents/types.ts` `InvokeOptions` interface includes `model?: string` property
- [ ] Add JSDoc comment to claude.ts documenting supported model values: `opus-4-5`, `sonnet-4-5`, `haiku-4-5`
- [ ] Create unit test in `tests/agents/claude.test.ts` verifying model flag is included when provided
- [ ] Create unit test verifying that model flag is NOT included when `options.model` is undefined
- [ ] Create unit test verifying model flag works with both `invoke()` and `invokeStream()` methods
- [ ] Document expected CLI command format: `claude --model <model> -p <prompt>`
- [ ] Run `bun run typecheck` with zero errors
- [ ] Run `bun run lint` with zero errors or warnings
- [ ] Run `bun test tests/agents/claude.test.ts` with all tests passing

**Dependencies:** None (verification of existing functionality)
**Phase:** Foundation
**Priority:** 3
**Parallel:** Yes (can run with US-004, US-005)

---

### US-004: Add Model Selection Support to Codex Adapter

**Description:** As a Relentless developer, I want to update the Codex adapter to support model selection via the `--model` flag so that the orchestrator can route tasks to specific GPT-5.2 model tiers (high, medium, low).

**Acceptance Criteria:**
- [ ] Modify `src/agents/codex.ts` `invoke()` method to check for `options?.model`
- [ ] When `options.model` is present, insert `--model` and the model value BEFORE the `-` stdin argument
- [ ] Resulting CLI command format: `codex exec --model <model> -`
- [ ] Add JSDoc documenting supported model values: `gpt-5-2-high`, `gpt-5-2-medium`, `gpt-5-2-low`
- [ ] If `options.model` is undefined, maintain existing behavior (no `--model` flag)
- [ ] Create unit test verifying spawn args include `--model` when `options.model` is provided
- [ ] Create unit test verifying spawn args do NOT include `--model` when `options.model` is undefined
- [ ] Create unit test verifying argument order: `["codex", "exec", "--model", "<model>", "-"]`
- [ ] Create unit test for each supported model tier (high, medium, low)
- [ ] Verify existing functionality (stdin prompt, stdout/stderr collection) is not affected
- [ ] Run `bun run typecheck` with zero errors
- [ ] Run `bun run lint` with zero errors or warnings
- [ ] Run `bun test tests/agents/codex.test.ts` with all tests passing
- [ ] Run `bun test` (full test suite) with all tests passing

**Dependencies:** US-003 (use Claude adapter as reference)
**Phase:** Foundation
**Priority:** 4
**Parallel:** Yes (can run with US-003, US-005)

---

### US-005: Add Model Selection Support to Droid Adapter

**Description:** As a Relentless developer, I want to update the Droid adapter to support model selection via the `-m` flag so that the orchestrator can route tasks to Droid's various models including GLM-4.6, Claude 3.5 Sonnet, and GPT-4o.

**Acceptance Criteria:**
- [ ] Modify `src/agents/droid.ts` `invoke()` method to check for `options?.model`
- [ ] When `options.model` is present, insert `-m` and model value BEFORE `--auto high`
- [ ] Resulting CLI command format: `droid exec -m <model> --auto high`
- [ ] Add JSDoc documenting models: `glm-4.6` (0.25x), `gemini-2.0-flash` (0.5x), `claude-3-5-sonnet` (2.0x), `gpt-4o` (1.5x)
- [ ] If `options.model` is undefined, maintain existing behavior (no `-m` flag)
- [ ] Create unit test verifying spawn args include `-m` when `options.model` is provided
- [ ] Create unit test verifying spawn args do NOT include `-m` when `options.model` is undefined
- [ ] Create unit test verifying argument order: `["droid", "exec", "-m", "<model>", "--auto", "high"]`
- [ ] Create unit test for each supported model (glm-4.6, gemini-2.0-flash, claude-3-5-sonnet, gpt-4o)
- [ ] Verify existing functionality (stdin prompt, `--auto high` flag) is not affected
- [ ] Verify short flag `-m` is used (not `--model`) per Droid CLI specification
- [ ] Run `bun run typecheck` with zero errors
- [ ] Run `bun run lint` with zero errors or warnings
- [ ] Run `bun test tests/agents/droid.test.ts` with all tests passing
- [ ] Run `bun test` (full test suite) with all tests passing

**Dependencies:** US-003 (use Claude adapter as reference)
**Phase:** Foundation
**Priority:** 5
**Parallel:** Yes (can run with US-003, US-004)

---

### US-006: Add Model Selection Support to OpenCode Adapter

**Description:** As a developer using Smart Auto Model Routing, I want the OpenCode adapter to support model selection via the `--model` flag so that tasks can be routed to specific free models (GLM-4.7, Grok Code Fast 1, MiniMax M2.1).

**Acceptance Criteria:**
- [ ] Modify `src/agents/opencode.ts` `invoke()` method to accept `options.model` parameter
- [ ] When `options.model` is provided, `--model <model>` flag is passed to CLI
- [ ] When `options.model` is omitted, no `--model` flag is passed (uses default)
- [ ] Command structure: `opencode run --model <model> "<prompt>"`
- [ ] Supports all OpenCode Zen models: `glm-4.7`, `grok-code-fast-1`, `minimax-m2.1`
- [ ] Model parameter is validated (non-empty string when provided)
- [ ] Error handling: Invalid model returns clear error message in output
- [ ] Unit tests written BEFORE implementation (TDD)
- [ ] Unit test: `invoke()` with model builds correct command args
- [ ] Unit test: `invoke()` without model omits `--model` flag
- [ ] Unit test: Different models produce different commands
- [ ] Typecheck passes: `bun run typecheck`
- [ ] Lint passes: `bun run lint`
- [ ] All tests pass: `bun test`

**Dependencies:** US-001 (Configuration Schema)
**Phase:** Foundation
**Priority:** 6
**Parallel:** Yes (can run with US-007, US-008)

---

### US-007: Add Model Selection Support to Amp Adapter

**Description:** As a developer using Smart Auto Model Routing, I want the Amp adapter to support model/mode selection via the `AMP_MODE` environment variable so that tasks can be routed to use Amp's free tier or smart mode.

**Acceptance Criteria:**
- [ ] Modify `src/agents/amp.ts` `invoke()` method to accept `options.model` parameter
- [ ] When `options.model` is provided, `AMP_MODE` environment variable is set
- [ ] When `options.model` is omitted, no `AMP_MODE` is set (uses Amp default)
- [ ] Environment variable is passed to `Bun.spawn()` via `env` option
- [ ] Environment inherits from `process.env` (preserves existing env vars)
- [ ] Supports Amp modes: `free`, `smart`
- [ ] Mode parameter is validated (non-empty string when provided)
- [ ] Error handling: Rate limit on free tier detected properly
- [ ] Unit tests written BEFORE implementation (TDD)
- [ ] Unit test: `invoke()` with model sets `AMP_MODE` environment variable
- [ ] Unit test: `invoke()` without model does not set `AMP_MODE`
- [ ] Unit test: Environment variable is correctly passed to spawn
- [ ] Unit test: Existing environment variables are preserved
- [ ] Typecheck passes: `bun run typecheck`
- [ ] Lint passes: `bun run lint`
- [ ] All tests pass: `bun test`

**Dependencies:** US-001 (Configuration Schema)
**Phase:** Foundation
**Priority:** 7
**Parallel:** Yes (can run with US-006, US-008)

---

### US-008: Add Model Selection Support to Gemini Adapter

**Description:** As a developer using Smart Auto Model Routing, I want to verify and enhance the Gemini adapter's `--model` flag support so that tasks can be routed to Gemini 3 Pro or Gemini 3 Flash models.

**Acceptance Criteria:**
- [ ] Verify `src/agents/gemini.ts` `invoke()` method correctly handles `options.model` parameter
- [ ] When `options.model` is provided, `--model <model>` flag is passed to CLI
- [ ] When `options.model` is omitted, no `--model` flag is passed (uses default)
- [ ] Command structure: `gemini --model <model> "<prompt>"`
- [ ] Supports all Gemini CLI models: `gemini-3-pro`, `gemini-3-flash`
- [ ] `--yolo` flag (dangerous mode) works correctly with `--model` flag
- [ ] Model parameter is validated (non-empty string when provided)
- [ ] Rate limit detection patterns cover Gemini-specific errors
- [ ] Unit tests written BEFORE implementation (TDD)
- [ ] Unit test: `invoke()` with model builds correct command args
- [ ] Unit test: `invoke()` without model omits `--model` flag
- [ ] Unit test: Combined `--model` and `--yolo` flags work correctly
- [ ] Unit test: Rate limit detection for Gemini errors
- [ ] Typecheck passes: `bun run typecheck`
- [ ] Lint passes: `bun run lint`
- [ ] All tests pass: `bun test`

**Dependencies:** US-001 (Configuration Schema)
**Phase:** Foundation
**Priority:** 8
**Parallel:** Yes (can run with US-006, US-007)

---

## Phase 1: Routing Intelligence

### US-009: Hybrid Complexity Classifier

**Description:** As a Relentless user, I want tasks to be automatically classified by complexity using a hybrid approach (fast heuristics + LLM fallback for ambiguous cases) so that routing decisions are both fast and accurate.

**Acceptance Criteria:**
- [ ] Classifier implements two-phase approach: heuristic analysis first, LLM fallback only when confidence < 0.8
- [ ] Heuristic phase completes in < 50ms for any task (no external API calls)
- [ ] Heuristic signals detect `simple` complexity for: "fix typo", "update docs", "add comment", "rename", "format"
- [ ] Heuristic signals detect `medium` complexity for: "implement", "add feature", "refactor", "test", "api", "endpoint"
- [ ] Heuristic signals detect `complex` complexity for: "architecture", "integrate", "migration", "security", "auth", "oauth"
- [ ] Heuristic signals detect `expert` complexity for: "redesign", "performance", "distributed", "concurrent", "parallel", "async"
- [ ] Pattern matching boosts confidence: README/docs files = simple, auth/jwt patterns = complex
- [ ] Classification result includes: `complexity`, `confidence` (0.0-1.0), `reasoning`, `usedLLM` boolean
- [ ] When confidence >= 0.8, heuristic result is used directly without LLM call
- [ ] When confidence < 0.8, LLM classifier is invoked using cheapest capable model (Haiku)
- [ ] LLM prompt includes task title, description, acceptance criteria, and heuristic suggestion
- [ ] LLM response is parsed as JSON with `complexity` and `reasoning` fields
- [ ] LLM classification sets confidence to 0.9 and `usedLLM: true`
- [ ] Classification function is exported from `src/routing/classifier.ts`
- [ ] Unit tests achieve 100% coverage of `classifyTask()` function with fixtures for all complexity levels

**Dependencies:** US-001 (Config Schema), US-002 (Model Registry)
**Phase:** Stories
**Priority:** 9
**Parallel:** No

---

### US-010: Mode-Model Matrix Router

**Description:** As a Relentless user, I want the system to route tasks to the optimal harness/model combination based on my selected mode and task complexity so that I can control the cost/quality tradeoff.

**Acceptance Criteria:**
- [ ] Router implements `MODE_MODEL_MATRIX` with 4 modes x 4 complexity levels = 16 routing rules
- [ ] `free` mode routes: simple→glm-4.7/opencode, medium→amp-free/amp, complex→gemini-3-flash/gemini, expert→glm-4.7/opencode
- [ ] `cheap` mode routes: simple→haiku-4.5/claude, medium→sonnet-4.5/claude, complex→gpt-5-2-medium/codex, expert→opus-4.5/claude
- [ ] `good` mode routes: simple→sonnet-4.5/claude, medium→sonnet-4.5/claude, complex→opus-4.5/claude, expert→opus-4.5/claude
- [ ] `genius` mode routes all complexity levels to opus-4.5/claude
- [ ] `routeTask()` function accepts `UserStory` and `AutoModeConfig`, returns `RoutingDecision`
- [ ] `RoutingDecision` includes: `harness`, `model`, `complexity`, `mode`, `estimatedCost`, `reasoning`
- [ ] Router calls classifier first to determine task complexity before matrix lookup
- [ ] Router checks harness availability via `getAvailableHarness()` before finalizing decision
- [ ] If configured harness unavailable, router consults `fallbackOrder` from config
- [ ] Estimated cost is calculated using model profile from registry (inputCost + outputCost x estimated tokens)
- [ ] Token estimation uses formula: `(title.length + description.length + criteria.length) / 4 * 1.5`
- [ ] All routing decisions are logged to progress.txt with timestamp and reasoning
- [ ] User can override mode via CLI flag `--mode <mode>` which overrides config.defaultMode
- [ ] Router function is exported from `src/routing/router.ts` with TypeScript types

**Dependencies:** US-002 (Model Registry), US-009 (Complexity Classifier)
**Phase:** Stories
**Priority:** 10
**Parallel:** No

---

### US-011: Cascade/Escalation Logic

**Description:** As a Relentless user, I want tasks that fail with a smaller model to automatically retry with a more capable model (cascade pattern) so that quality is maintained even when initial routing underestimates complexity.

**Acceptance Criteria:**
- [ ] `executeWithCascade()` wraps task execution with automatic retry/escalation logic
- [ ] Maximum escalation attempts configurable via `config.escalation.maxAttempts` (default: 3)
- [ ] Escalation path defined in `config.escalation.escalationPath` mapping current→next model
- [ ] Default escalation paths: haiku→sonnet, sonnet→opus, gpt-5-2-low→medium→high, glm-4.6→claude-3-5-sonnet, gemini-flash→gemini-pro
- [ ] Each attempt is recorded in `EscalationStep` with: attempt number, harness, model, result, error
- [ ] On task failure, system automatically escalates to next model in path without user intervention
- [ ] On successful execution, cascade returns immediately with `success: true` and final model info
- [ ] When escalation path exhausted (no next model), system tries next harness in fallbackOrder
- [ ] `EscalationResult` includes: `success`, `finalHarness`, `finalModel`, `attempts`, `escalations[]`
- [ ] User is notified (console log) when escalation occurs: "Escalating from {model} to {nextModel}"
- [ ] When max attempts reached and task still fails, mark task as `blocked` and notify user
- [ ] Escalation cost is tracked: `actualCost` includes all attempts, not just successful one
- [ ] Escalation can be disabled via `config.escalation.enabled: false`
- [ ] `free` mode escalates to `cheap` mode models when all free options exhausted
- [ ] Unit tests cover: single success, escalation success, max attempts failure, escalation disabled

**Dependencies:** US-010 (Router), US-002 (Model Registry)
**Phase:** Stories
**Priority:** 11
**Parallel:** No

---

### US-012: Harness Fallback Chain

**Description:** As a Relentless user, I want the system to automatically skip to the next harness in the fallback chain when the current harness is unavailable so that task execution continues seamlessly.

**Acceptance Criteria:**
- [ ] Fallback order configurable via `config.autoMode.fallbackOrder` array of harness names
- [ ] Default fallback order: claude → codex → droid → opencode → amp → gemini
- [ ] User can override fallback order via CLI flag `--fallback-order "harness1,harness2,..."`
- [ ] `getAvailableHarness()` function checks harness availability before routing
- [ ] Harness availability check includes: API key present, CLI tool installed, not rate-limited
- [ ] Rate limit detection recognizes: HTTP 429, "rate limit exceeded", "quota exhausted"
- [ ] When rate limit detected, harness is marked unavailable for cooldown period (default: 60 seconds)
- [ ] Missing API key detection checks environment variables for each harness
- [ ] When harness unavailable, system logs: "Harness {name} unavailable ({reason}), falling back to {next}"
- [ ] If all harnesses unavailable, task is marked as `blocked` with clear error message
- [ ] Fallback respects mode constraints: `free` mode only falls back to harnesses with free models
- [ ] Each harness fallback preserves complexity classification but selects appropriate model
- [ ] Fallback events are recorded in `EscalationStep` with `result: "rate_limited"` or `result: "unavailable"`
- [ ] Harness cooldown state is maintained in memory during session (not persisted)
- [ ] Integration test validates full fallback chain when each fails sequentially

**Dependencies:** US-002 (Model Registry), US-011 (Cascade Logic)
**Phase:** Stories
**Priority:** 12
**Parallel:** No

---

## Phase 2: Review Micro-Tasks

### US-013: Review Runner Framework

**Description:** As a developer, I want a review runner framework that orchestrates micro-tasks in isolation so that each review step runs in a fresh harness session without context compaction.

**Acceptance Criteria:**
- [ ] Create `src/review/runner.ts` as the main orchestration module
- [ ] Create `src/review/types.ts` for shared interfaces
- [ ] Load configured micro-tasks from `relentless.config.yaml` in correct order
- [ ] Spawn completely new harness process for each micro-task (no shared context)
- [ ] Log "✅ {task}: PASSED" on success, "❌ {task}: FAILED ({count} fixes needed)" on failure
- [ ] Queue fix tasks to `progress.txt` BEFORE proceeding to next micro-task
- [ ] Produce `ReviewSummary` with `tasksRun`, `tasksPassed`, `tasksFailed`, `fixTasksGenerated`
- [ ] Support `stopOnFailure` option to halt on first failure
- [ ] Catch exceptions, log error, mark task as failed, continue (unless `stopOnFailure`)
- [ ] Use mode-appropriate model for review (e.g., "genius" uses Opus 4.5)
- [ ] Fall back according to `fallbackOrder` if harness rate-limited
- [ ] Include total estimated and actual cost of review phase
- [ ] Log "🔍 Running {taskType} review..." before each task
- [ ] Display summary table with each task's status, issue count, and time taken
- [ ] Support retry via `maxRetries` config

**Dependencies:** US-002 (Model Registry), US-010 (Router)
**Phase:** Stories
**Priority:** 13
**Parallel:** No

---

### US-014: Typecheck Micro-Task

**Description:** As a developer, I want a typecheck micro-task that runs `bun run typecheck` in a fresh session, parses errors, and queues fixes so that TypeScript errors are caught systematically.

**Acceptance Criteria:**
- [ ] Create `src/review/tasks/typecheck.ts`
- [ ] Run `bun run typecheck` in project's working directory
- [ ] Return `success: true`, `errorCount: 0`, `fixTasks: []` when no errors
- [ ] Parse each error with `file`, `line`, `column`, `code`, and `message` fields
- [ ] Group errors by file when generating fix tasks
- [ ] Fix task format: `type: "typecheck_fix"`, `file`, `line`, `description: "Fix TypeScript error TS{code}: {message}"`, `priority: "high"`
- [ ] Return `success: false` with error details if command fails (e.g., bun not found)
- [ ] Report configuration error if no tsconfig.json exists
- [ ] Correctly parse errors from all referenced projects
- [ ] Log warnings but don't include in `fixTasks`
- [ ] Strip ANSI color codes before parsing
- [ ] Paginate/summarize for 100+ errors
- [ ] Include `duration` (execution time) and `command` in result
- [ ] Run in fresh session with ONLY typecheck prompt
- [ ] Include file path, line number, error code in fix prompt

**Dependencies:** US-013 (Review Runner Framework)
**Phase:** Stories
**Priority:** 14
**Parallel:** Yes (can run with US-015 through US-019)

---

### US-015: Lint Micro-Task

**Description:** As a developer, I want a lint micro-task that runs `bun run lint` in a fresh session, parses warnings/errors, and queues fixes so that code style issues are systematically addressed.

**Acceptance Criteria:**
- [ ] Create `src/review/tasks/lint.ts`
- [ ] Run `bun run lint --format json` in project's working directory
- [ ] Return `success: true`, `errorCount: 0`, `warningCount: 0` when no issues
- [ ] Parse each issue with `file`, `line`, `column`, `severity`, `rule`, `message`
- [ ] Warnings don't fail the check (`success: true`) but `warningCount` reflects count
- [ ] Fix task format: `type: "lint_fix"`, `file`, `line`, `rule`, `description`, `priority: "high"`
- [ ] Warnings are logged but NOT added to `fixTasks`
- [ ] Return `success: false` if lint command fails (e.g., eslint not installed)
- [ ] Report configuration error if no ESLint config exists
- [ ] Include `autoFixable: number` for issues that can be fixed with `--fix`
- [ ] Report parsing errors (invalid JS/TS) separately from lint violations
- [ ] Include `disabledRulesCount` for eslint-disable comments
- [ ] Include summary: total files scanned, total issues, breakdown by severity
- [ ] Run in fresh session with ONLY lint prompt
- [ ] Group multiple rule violations by file for efficient fixing
- [ ] Respect `relentless.config.yaml` lint configuration if present

**Dependencies:** US-013 (Review Runner Framework)
**Phase:** Stories
**Priority:** 15
**Parallel:** Yes (can run with US-014, US-016 through US-019)

---

### US-016: Test Micro-Task

**Description:** As a developer, I want a test micro-task that runs `bun test` in a fresh session, parses failures, and queues fixes so that failing tests are systematically addressed.

**Acceptance Criteria:**
- [ ] Create `src/review/tasks/test.ts`
- [ ] Run `bun test --reporter=json` in project's working directory
- [ ] Return `success: true`, `failedTests: 0`, `fixTasks: []` when all pass
- [ ] Parse each failure with `testFile`, `testName`, `suiteName`, `error`, `duration`
- [ ] Fix task format: `type: "test_fix"`, `file`, `testName`, `description`, `error`, `priority: "high"`
- [ ] Include stack trace in fix task description for runtime errors
- [ ] Return `success: false` with timeout error if test suite times out
- [ ] Report "No tests found" with `success: true`, `totalTests: 0` if no test files
- [ ] Fall back to standard output parsing if JSON reporter unavailable
- [ ] Include `skippedTests` count and list of skipped test names
- [ ] Report setup/teardown failures separately
- [ ] Run in fresh session with ONLY test prompt
- [ ] Each failing test gets its own fix task
- [ ] Include `coveragePercent` in result if available
- [ ] Include `totalTests`, `passedTests`, `failedTests`, `skippedTests`, `duration`
- [ ] Include `snapshotFailures` count if snapshot tests fail

**Dependencies:** US-013 (Review Runner Framework)
**Phase:** Stories
**Priority:** 16
**Parallel:** Yes (can run with US-014, US-015, US-017 through US-019)

---

### US-017: Security Micro-Task

**Description:** As a developer, I want a security micro-task that scans for OWASP top issues in a fresh session so that security issues are caught early.

**Acceptance Criteria:**
- [ ] Create `src/review/tasks/security.ts`
- [ ] Retrieve changed files from `git diff --name-only HEAD~1`
- [ ] Return `success: true`, `vulnerabilities: []`, `fixTasks: []` when no issues
- [ ] Detect hardcoded password: `type: "hardcoded_password"`, `severity: "critical"`
- [ ] Detect hardcoded API key: `type: "hardcoded_api_key"`, `severity: "critical"`
- [ ] Detect unsafe `eval()`: `type: "unsafe_eval"`, `severity: "high"`
- [ ] Detect `innerHTML` assignment: `type: "xss_risk"`, `severity: "high"`
- [ ] Detect `exec()` with string concatenation: `type: "command_injection_risk"`, `severity: "high"`
- [ ] Detect SQL string concatenation: `type: "sql_injection_risk"`, `severity: "critical"`
- [ ] Fix task for critical/high: `type: "security_fix"`, `file`, `description`, `priority: "critical"`
- [ ] Medium/low/info issues are logged as warnings only
- [ ] Allowlist files (e.g., test files) report with `severity: "info"` only
- [ ] Report total files scanned, issues by severity, OWASP category breakdown
- [ ] Run in fresh session with ONLY security prompt
- [ ] Include dependency vulnerabilities from `bun audit` if available
- [ ] Include `scannedFiles`, `vulnerabilities[]`, `fixTasks[]`, and summary

**Dependencies:** US-013 (Review Runner Framework)
**Phase:** Stories
**Priority:** 17
**Parallel:** Yes (can run with US-014 through US-016, US-018, US-019)

---

### US-018: Quality Micro-Task

**Description:** As a developer, I want a quality micro-task that checks for dead code, duplication, and complexity in a fresh session so that code quality issues are identified.

**Acceptance Criteria:**
- [ ] Create `src/review/tasks/quality.ts`
- [ ] Scan changed files from `git diff --name-only HEAD~1`
- [ ] Return `success: true`, `issues: []`, `fixTasks: []` when no issues
- [ ] Detect unused exports: `type: "dead_code"`, `file`, `symbol`, `message`
- [ ] Detect code duplication (>20 similar tokens): `type: "duplication"`, `files[]`, `similarity`
- [ ] Detect function complexity > 10: `type: "high_complexity"`, `file`, `function`, `score`
- [ ] Elevate complexity > 20 to high severity and generate fix task
- [ ] Dead code fix task: `type: "quality_fix"`, `description: "Remove unused export: {symbol}"`, `priority: "medium"`
- [ ] High complexity fix task: `type: "quality_fix"`, `description: "Refactor function {name}: complexity {score}"`, `priority: "medium"`
- [ ] Duplication is logged as advisory (no fix tasks, requires human judgment)
- [ ] Report file as "unparseable" and continue on parse error
- [ ] Run in fresh session with ONLY quality prompt
- [ ] Limit deep analysis to changed files only (performance)
- [ ] Include `deadCodeCount`, `duplications`, `complexityIssues`, `overallQualityScore`
- [ ] Skip quality checks for files with `// @relentless-ignore-quality` comment
- [ ] Group issues by type and show top 10 most impactful first

**Dependencies:** US-013 (Review Runner Framework)
**Phase:** Stories
**Priority:** 18
**Parallel:** Yes (can run with US-014 through US-017, US-019)

---

### US-019: Docs Micro-Task

**Description:** As a developer, I want a docs micro-task that checks if README and JSDoc need updates in a fresh session so that documentation stays in sync.

**Acceptance Criteria:**
- [ ] Create `src/review/tasks/docs.ts`
- [ ] Analyze changed files from `git diff --name-only HEAD~1`
- [ ] Return `success: true`, `issues: []` when no issues
- [ ] Detect new exports in index.ts without README update: `type: "missing_readme_update"`
- [ ] Detect new CLI commands in bin/ without README update: `type: "missing_readme_update"`
- [ ] Detect missing JSDoc on exported functions: `type: "missing_jsdoc"`, `file`, `function`
- [ ] Skip README checks if README.md was updated
- [ ] Missing README fix task: `type: "docs_fix"`, `description: "Update README to document new {exports|commands}"`, `priority: "low"`
- [ ] Missing JSDoc fix task: `type: "docs_fix"`, `file`, `function`, `description: "Add JSDoc for {function}"`, `priority: "low"`
- [ ] JSDoc issues are advisory (`success: true`), README issues block (`success: false`)
- [ ] Run in fresh session with ONLY docs prompt
- [ ] Exclude functions with `@internal` JSDoc tag from checks
- [ ] Include `readmeNeedsUpdate: boolean`, `missingJSDocCount`, `exportedFunctionsCount`
- [ ] Don't flag CLAUDE.md or AGENTS.md changes as "README not updated"
- [ ] Skip JSDoc checks for test files (*.test.ts, *.spec.ts)

**Dependencies:** US-013 (Review Runner Framework)
**Phase:** Stories
**Priority:** 19
**Parallel:** Yes (can run with US-014 through US-018)

---

### US-020: User Review Prompt

**Description:** As a developer, I want to be prompted before final review with mode selection options so that I can choose whether to run the review and at what quality level.

**Acceptance Criteria:**
- [ ] Create `src/review/prompt.ts`
- [ ] Display prompt when feature about to complete: "Run final review? [y/n]"
- [ ] On "y"/"yes", display mode selection: "Review mode? [free/cheap/good/genius] (default: good)"
- [ ] Pass selected mode to review runner and begin review
- [ ] On "n"/"no", log warning "⚠️ Skipping final review" and complete feature
- [ ] `--skip-review` flag skips prompt entirely and logs skip warning
- [ ] `--review-mode <mode>` flag skips mode selection and uses provided mode
- [ ] `--skip-review` takes precedence over `--review-mode` if both provided
- [ ] Display "Invalid mode" and re-prompt on invalid mode input
- [ ] Use "good" as default mode when Enter pressed without input
- [ ] Gracefully cancel on Ctrl+C and mark feature as incomplete
- [ ] In non-interactive mode (CI/CD), use `--review-mode` or default without prompting
- [ ] Display "Estimated review cost: ${cost}" for genius mode
- [ ] Display "Using free models - some checks may be less thorough" for free mode
- [ ] Include "Review: SKIPPED" in summary when review is skipped
- [ ] Include "Review: PASSED ({mode} mode, {tasks} checks)" or "Review: FAILED ({issues} issues)" in summary

**Dependencies:** US-013 (Review Runner Framework)
**Phase:** Stories
**Priority:** 20
**Parallel:** No

---

## Phase 3: CLI & Integration

### US-021: CLI --mode Flag Support

**Description:** As a developer, I want to specify a cost optimization mode via the `--mode` CLI flag so that I can control the cost/quality tradeoff.

**Acceptance Criteria:**
- [ ] CLI accepts `--mode` flag with values: `free`, `cheap`, `good`, `genius`
- [ ] `relentless run --feature auth --mode free` uses free tier models
- [ ] `relentless run --feature auth --mode cheap` uses low-cost models
- [ ] `relentless run --feature auth --mode good` uses balanced models
- [ ] `relentless run --feature auth --mode genius` uses SOTA models for all tasks
- [ ] Default mode is `good` when `--mode` flag not provided
- [ ] Invalid mode values display helpful error message with valid options
- [ ] Mode selection is logged to progress.txt for debugging
- [ ] Mode can be overridden per-execution even if config specifies a default
- [ ] `relentless run --help` displays mode options with descriptions and savings percentages
- [ ] Mode integrates with complexity classification for final harness/model pairing
- [ ] Unit tests verify mode parsing and validation with >90% coverage

**Dependencies:** US-001 (Auto Mode Config), US-002 (Model Registry)
**Phase:** Stories
**Priority:** 21
**Parallel:** Yes (can run with US-022, US-023)

---

### US-022: CLI --fallback-order Flag Support

**Description:** As a developer, I want to customize the harness fallback order via the `--fallback-order` CLI flag so that I can prioritize my preferred AI agents.

**Acceptance Criteria:**
- [ ] CLI accepts `--fallback-order` flag with comma-separated harness names
- [ ] `relentless run --feature auth --fallback-order "opencode,droid,claude"` uses specified order
- [ ] Valid harness names: `claude`, `codex`, `droid`, `opencode`, `amp`, `gemini`
- [ ] Default fallback order: claude > codex > droid > opencode > amp > gemini
- [ ] Invalid harness names display error with valid options listed
- [ ] Duplicate harness names are deduplicated with warning
- [ ] Partial fallback order (e.g., `--fallback-order "droid,claude"`) only uses specified harnesses
- [ ] Fallback order is logged to progress.txt when switching harnesses
- [ ] Can also be configured in `relentless.config.yaml` under `autoMode.fallbackOrder`
- [ ] CLI flag overrides config file fallback order
- [ ] `relentless run --help` explains fallback order purpose and default sequence
- [ ] Integration tests verify harness switching on simulated rate limit errors

**Dependencies:** US-002 (Model Registry), US-011 (Cascade Logic)
**Phase:** Stories
**Priority:** 22
**Parallel:** Yes (can run with US-021, US-023)

---

### US-023: CLI Review Control Flags

**Description:** As a developer, I want to control final review execution via `--skip-review` and `--review-mode` flags so that I can skip review or specify quality level.

**Acceptance Criteria:**
- [ ] CLI accepts `--skip-review` flag to bypass final review entirely
- [ ] `relentless run --feature auth --skip-review` completes without running review
- [ ] When `--skip-review` used, warning logged: "Final review skipped. Quality checks not performed."
- [ ] CLI accepts `--review-mode` flag with values: `free`, `cheap`, `good`, `genius`
- [ ] `relentless run --feature auth --review-mode genius` uses SOTA for all review tasks
- [ ] Default review mode is `good` when not specified
- [ ] `--skip-review` and `--review-mode` are mutually exclusive; error if both provided
- [ ] Review mode can differ from execution mode (e.g., `--mode cheap --review-mode genius`)
- [ ] Review configuration can be set in `relentless.config.yaml` under `autoMode.review`
- [ ] CLI flags override config file review settings
- [ ] `relentless run --help` explains review flags and their impact
- [ ] Unit tests verify flag parsing, mutual exclusivity, and default behavior

**Dependencies:** US-013 (Review Runner), US-021 (--mode flag)
**Phase:** Stories
**Priority:** 23
**Parallel:** Yes (can run with US-021, US-022)

---

### US-024: Cost Estimation Display Before Execution

**Description:** As a developer, I want to see estimated costs before execution starts so that I can make informed decisions about which mode to use.

**Acceptance Criteria:**
- [ ] Display estimated total cost before execution begins
- [ ] Show comparison with baseline: "Estimated cost: $2.50 (vs $8.75 without Auto Mode - 71% savings)"
- [ ] Cost breakdown shows per-story estimates with complexity level and assigned model
- [ ] `relentless estimate --feature auth --mode cheap` displays estimates without executing
- [ ] Estimate command shows comparison across all modes for informed selection
- [ ] Use token estimation based on story description length and complexity
- [ ] Model costs sourced from registry (inputCost/outputCost per MTok)
- [ ] Estimates include potential escalation overhead (10-15% buffer)
- [ ] Display harness/model assignments: "US-001: medium complexity -> claude/sonnet-4.5 (~$0.15)"
- [ ] Cost accuracy goal within 20% of actual execution cost
- [ ] Estimates logged to progress.txt for post-execution comparison
- [ ] Unit tests verify cost calculation formulas with known token counts

**Dependencies:** US-009 (Classifier), US-002 (Model Registry), US-021 (--mode flag)
**Phase:** Stories
**Priority:** 24
**Parallel:** No

---

### US-025: Cost Reporting After Execution

**Description:** As a developer, I want to see actual costs and savings percentage after execution completes so that I can track spending and validate auto mode value.

**Acceptance Criteria:**
- [ ] Display actual total cost after execution completes
- [ ] Show savings percentage: "Actual cost: $2.75 (saved 68% vs single-model execution)"
- [ ] Per-story breakdown: story ID, complexity, initial model, final model (if escalated), actual cost
- [ ] Show escalation costs clearly: "US-003: escalated haiku-4.5 -> sonnet-4.5 (+$0.20)"
- [ ] Compare estimated vs actual: "Estimated: $2.50, Actual: $2.75 (+10%)"
- [ ] Calculate and display total escalation overhead percentage
- [ ] Append cost report to progress.txt with timestamp
- [ ] `relentless report --feature auth` shows historical cost data
- [ ] Include tokens used (input/output) per story for detailed analysis
- [ ] Savings calculation uses same baseline (SOTA pricing) for fair comparison
- [ ] Include model utilization stats: "Free models: 40%, Cheap: 35%, SOTA: 25%"
- [ ] Integration tests verify cost tracking across full feature execution

**Dependencies:** US-024 (Cost Estimation), US-011 (Cascade)
**Phase:** Stories
**Priority:** 25
**Parallel:** No

---

### US-026: PRD.json Schema Extension for Routing Metadata

**Description:** As a developer, I want each story in prd.json to include routing metadata so that the orchestrator can make informed routing decisions and track execution history.

**Acceptance Criteria:**
- [ ] Each story includes optional `routing` object: complexity, harness, model, mode, estimatedCost, classificationReasoning
- [ ] Routing metadata populated during `/relentless.tasks` phase after complexity classification
- [ ] Example: `{"complexity": "medium", "harness": "claude", "model": "sonnet-4.5", "mode": "good", "estimatedCost": 0.15}`
- [ ] Each story includes optional `execution` object after execution: attempts, escalations, actualCost, actualHarness, actualModel
- [ ] Execution escalations array tracks each attempt: `[{"attempt": 1, "harness": "claude", "model": "haiku-4.5", "result": "failure"}]`
- [ ] Zod schema validates routing and execution objects with proper types
- [ ] When auto mode disabled, routing and execution objects are omitted
- [ ] Stories with `passes: true` retain execution history for cost reporting
- [ ] Schema supports backward compatibility: existing prd.json files without routing still parse
- [ ] TypeScript types exported: `ExtendedUserStory`, `RoutingMetadata`, `ExecutionHistory`
- [ ] Unit tests verify schema validation with valid/invalid routing metadata
- [ ] Generated TypeScript types include routing/execution interfaces

**Dependencies:** US-009 (Classifier), US-002 (Model Registry)
**Phase:** Stories
**Priority:** 26
**Parallel:** No

---

## Phase 4: Polish

### US-027: Unit Tests for Routing Module

**Description:** As a developer working on Relentless, I want comprehensive unit tests for the routing module so that the complexity classification and model routing logic is thoroughly validated.

**Acceptance Criteria:**
- [ ] Create `tests/routing/classifier.test.ts` with full coverage of `classifyTask()`
- [ ] Tests verify simple tasks classified as `simple` with >0.8 confidence
- [ ] Tests verify medium tasks classified as `medium`
- [ ] Tests verify complex tasks classified as `complex` or `expert`
- [ ] Tests verify expert tasks classified as `expert`
- [ ] Tests verify heuristic-only classification when confidence >= 0.8
- [ ] Tests verify LLM fallback when heuristic confidence < 0.8
- [ ] Tests mock LLM invocation to avoid external calls
- [ ] Create `tests/routing/router.test.ts` with full coverage of `routeTask()`
- [ ] Tests verify free mode routes simple tasks to opencode/glm-4.7
- [ ] Tests verify cheap mode routes simple tasks to claude/haiku-4.5
- [ ] Tests verify good mode routes complex tasks to claude/opus-4.5
- [ ] Tests verify genius mode routes all tasks to claude/opus-4.5
- [ ] Tests verify harness fallback when primary unavailable
- [ ] Tests verify cost estimation calculation correctness
- [ ] Create `tests/routing/cascade.test.ts` with full coverage of `executeWithCascade()`
- [ ] Tests verify successful execution on first attempt
- [ ] Tests verify escalation from Haiku to Sonnet on failure
- [ ] Tests verify escalation from Sonnet to Opus on subsequent failure
- [ ] Tests verify fallback to next harness on rate limit
- [ ] Tests verify max escalation reached marks task as blocked
- [ ] Tests use mocked adapters for deterministic results
- [ ] Create `tests/routing/registry.test.ts` for registry queries
- [ ] Test coverage for routing module exceeds 90%
- [ ] Typecheck and lint pass

**Dependencies:** US-002 (Registry), US-009 (Classifier), US-010 (Router), US-011 (Cascade)
**Phase:** Polish
**Priority:** 27
**Parallel:** No

---

### US-028: Integration Tests for Auto-Mode

**Description:** As a developer working on Relentless, I want integration tests for the complete auto-mode workflow so that end-to-end routing, escalation, and cost tracking is verified.

**Acceptance Criteria:**
- [ ] Create `tests/integration/auto-mode.test.ts` for full workflow testing
- [ ] Create test fixture PRD with mixed complexity tasks (simple, medium, complex, expert)
- [ ] Integration test: Feature runs with `--mode free` using free models primarily
- [ ] Integration test: Feature runs with `--mode cheap` achieving >50% savings vs genius
- [ ] Integration test: Feature runs with `--mode good` using balanced selection
- [ ] Integration test: Feature runs with `--mode genius` using Opus for all tasks
- [ ] Integration test: Cost estimation before execution within 20% of actual
- [ ] Integration test: Actual costs reported after execution match expected ranges
- [ ] Integration test: Escalation triggered correctly when task fails with smaller model
- [ ] Integration test: Escalation rate stays below 15% for well-classified tasks
- [ ] Integration test: Rate limit triggers harness fallback to next in order
- [ ] Integration test: `--fallback-order` CLI flag overrides default order
- [ ] Integration test: Config file `fallbackOrder` setting is respected
- [ ] Integration test: Final review micro-tasks run in isolated sessions
- [ ] Integration test: Routing decisions logged to progress.txt
- [ ] Integration test: prd.json updated with routing metadata after planning
- [ ] Integration test: prd.json updated with execution history after completion
- [ ] Tests use mock adapters to avoid real API calls
- [ ] Tests clean up temporary files and directories
- [ ] Test coverage for integration scenarios exceeds 80%
- [ ] All tests complete within 30 seconds
- [ ] Typecheck and lint pass

**Dependencies:** US-027 (Unit Tests), US-011 (Cascade), US-013 (Review Runner)
**Phase:** Polish
**Priority:** 28
**Parallel:** No

---

### US-029: Documentation Updates

**Description:** As a user of Relentless, I want clear documentation for Smart Auto Mode so that I can understand how to enable, configure, and use the cost-saving features.

**Acceptance Criteria:**
- [ ] README.md updated with Auto Mode feature highlight in introduction
- [ ] README.md includes "Save 50-75% with Smart Auto Mode" in feature list
- [ ] README.md has new "Auto Mode" section explaining four modes (free, cheap, good, genius)
- [ ] README.md includes cost savings table comparing modes with examples
- [ ] README.md documents `--mode` CLI flag usage with examples
- [ ] README.md documents `--fallback-order` CLI flag with default order
- [ ] README.md documents `--skip-review` and `--review-mode` flags
- [ ] CLI help text includes all new flags with descriptions
- [ ] CLI help text includes brief explanation of each mode's purpose
- [ ] Configuration example shows `autoMode` settings in `relentless.config.yaml`
- [ ] Configuration example includes `modeModels` customization for advanced users
- [ ] Configuration example includes `review.microTasks` customization options
- [ ] CLAUDE.md updated with Auto Mode implementation details
- [ ] CLAUDE.md documents routing module structure (`src/routing/`)
- [ ] CLAUDE.md documents review module structure (`src/review/`)
- [ ] CLAUDE.md documents testing patterns for routing and integration tests
- [ ] Cost breakdown example shows before/after for a real feature
- [ ] Model capability matrix included as reference
- [ ] Troubleshooting section added for common Auto Mode issues
- [ ] FAQ section answers common questions
- [ ] All documentation follows existing style
- [ ] No spelling or grammar errors
- [ ] All code examples are syntactically correct
- [ ] Links to spec and plan files added for contributors

**Dependencies:** All core functionality (US-001 through US-026)
**Phase:** Polish
**Priority:** 29
**Parallel:** Yes (can run with US-030)

---

### US-030: Init Command Update for Auto Mode

**Description:** As a new user setting up Relentless, I want to be asked about enabling Auto Mode during `relentless init` so that I can easily opt into cost savings.

**Acceptance Criteria:**
- [ ] `relentless init` prompts: "Enable Smart Auto Mode? (Saves 50-75% on costs) [Y/n]"
- [ ] Default answer is "Yes" (pressing Enter enables Auto Mode)
- [ ] If "Yes", follow-up prompt: "Default mode? [free/cheap/good/genius]" with `good` as default
- [ ] If "No", no follow-up prompt shown
- [ ] `relentless.config.yaml` generated with `autoMode.enabled: true` when opted in
- [ ] `relentless.config.yaml` generated with `autoMode.enabled: false` when opted out
- [ ] `relentless.config.yaml` includes `autoMode.defaultMode` set to user's choice
- [ ] Config includes commented examples of `fallbackOrder` and `modeModels`
- [ ] Init shows brief explanation of Auto Mode before prompting
- [ ] Init shows estimated savings percentage for selected mode
- [ ] `--yes` or `-y` flag auto-accepts defaults (enables Auto Mode with good mode)
- [ ] `--no-auto-mode` flag explicitly disables Auto Mode without prompting
- [ ] Existing projects get prompted to add Auto Mode config
- [ ] Prompt detects existing `autoMode` config and skips if present
- [ ] Help text for `relentless init --help` documents Auto Mode flags
- [ ] Unit tests verify prompt flow and config generation
- [ ] Unit tests verify `--yes` and `--no-auto-mode` flags
- [ ] Unit tests verify existing config detection
- [ ] Integration test: Fresh project init with Auto Mode generates correct config
- [ ] Integration test: Existing project with config skips Auto Mode prompt
- [ ] Config validation ensures generated YAML is valid
- [ ] No breaking changes to existing init workflow
- [ ] Typecheck and lint pass

**Dependencies:** US-029 (Documentation), Schema changes from Phase 0
**Phase:** Polish
**Priority:** 30
**Parallel:** Yes (can run with US-029)

---

## Summary

### Story Count by Phase

| Phase | Stories | Story IDs |
|-------|---------|-----------|
| Foundation | 8 | US-001 to US-008 |
| Routing Intelligence | 4 | US-009 to US-012 |
| Review Micro-Tasks | 8 | US-013 to US-020 |
| CLI & Integration | 6 | US-021 to US-026 |
| Polish | 4 | US-027 to US-030 |
| **Total** | **30** | |

### Dependency Graph

```
US-001 (Config Schema)
   │
   ├──► US-002 (Model Registry) ──► US-009 (Classifier) ──► US-010 (Router)
   │                                                              │
   │                                                              ▼
   ├──► US-003 (Claude Verify) ──┬──► US-004 (Codex)    US-011 (Cascade)
   │                             │                              │
   │                             ├──► US-005 (Droid)            ▼
   │                             │                      US-012 (Fallback)
   ├──► US-006 (OpenCode)        ├──► US-007 (Amp)
   │                             │
   └──► US-008 (Gemini)          └───────────────────────────────┐
                                                                  │
US-013 (Review Runner) ◄─────────────────────────────────────────┘
   │
   ├──► US-014 (Typecheck)  ─┐
   ├──► US-015 (Lint)        │
   ├──► US-016 (Test)        ├──► US-020 (User Prompt)
   ├──► US-017 (Security)    │
   ├──► US-018 (Quality)     │
   └──► US-019 (Docs)       ─┘

US-021 (--mode)    ─┬──► US-024 (Cost Estimate) ──► US-025 (Cost Report)
US-022 (--fallback)─┤
US-023 (--review)  ─┘

US-026 (PRD Schema) ──► US-027 (Unit Tests) ──► US-028 (Integration Tests)
                                    │
                                    ▼
                       US-029 (Docs) ──► US-030 (Init Update)
```

### Parallel Execution Opportunities

| Group | Stories | Description |
|-------|---------|-------------|
| A | US-003, US-004, US-005 | Harness adapter updates (Claude, Codex, Droid) |
| B | US-006, US-007, US-008 | Harness adapter updates (OpenCode, Amp, Gemini) |
| C | US-014 through US-019 | Review micro-tasks (can run in parallel) |
| D | US-021, US-022, US-023 | CLI flags (can run in parallel) |
| E | US-029, US-030 | Documentation and Init (can run in parallel) |

---

## Next Steps

1. Run `relentless convert tasks.md` to generate `prd.json`
2. Or run `/relentless.checklist` to generate validation checklist
3. Begin implementation with Phase 0: Foundation (US-001)
