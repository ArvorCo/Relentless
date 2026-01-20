# Quality Validation Checklist: Smart Auto Model Routing

**Purpose:** Validate completeness and quality of Smart Auto Model Routing implementation
**Created:** 2026-01-19
**Feature:** [spec.md](./spec.md) | [plan.md](./plan.md) | [tasks.md](./tasks.md)
**Total Items:** 85

---

## 1. Functional Validation

### FR-001: Mode Flag Support
- [ ] **CHK-001** [US-021, FR-001] CLI accepts `--mode free` and routes to free models (GLM-4.7, Grok Code Fast 1, Amp Free)
- [ ] **CHK-002** [US-021, FR-001] CLI accepts `--mode cheap` and prioritizes low-cost models (Haiku 4.5, Gemini Flash, GPT-5.2 (reasoning-effort low))
- [ ] **CHK-003** [US-021, FR-001] CLI accepts `--mode good` and uses balanced models (Sonnet 4.5, GPT-5.2 (reasoning-effort medium))
- [ ] **CHK-004** [US-021, FR-001] CLI accepts `--mode genius` and uses SOTA models (Opus 4.5) for all tasks
- [ ] **CHK-005** [US-021, FR-001] Invalid mode values display helpful error with valid options

### FR-002: Hybrid Complexity Classification
- [ ] **CHK-006** [US-009, FR-002] Heuristics classify "fix typo in README" as `simple` with confidence >= 0.8
- [ ] **CHK-007** [US-009, FR-002] Heuristics classify "implement OAuth2 authentication" as `complex` or `expert`
- [ ] **CHK-008** [US-009, FR-002] LLM fallback invoked only when heuristic confidence < 0.8
- [ ] **CHK-009** [US-009, FR-002] Classification completes in < 50ms for heuristic-only cases
- [ ] **CHK-010** [US-009, FR-002] Classification result includes `complexity`, `confidence`, `reasoning`, `usedLLM`

### FR-003: Routing Metadata in prd.json
- [ ] **CHK-011** [US-026, FR-003] Each story in prd.json includes `routing` object with complexity, harness, model, mode
- [ ] **CHK-012** [US-026, FR-003] Routing metadata includes `estimatedCost` and `classificationReasoning`
- [ ] **CHK-013** [US-026, FR-003] Stories without auto mode omit routing object (backward compatible)
- [ ] **CHK-014** [US-026, FR-003] Zod schema validates routing metadata with proper types

### FR-004: Harness/Model Registry
- [ ] **CHK-015** [US-002, FR-004] Registry contains all 6 harnesses: Claude, Codex, Droid, OpenCode, Amp, Gemini
- [ ] **CHK-016** [US-002, FR-004] Registry contains 15+ models with accurate costs from spec
- [ ] **CHK-017** [US-002, FR-004] `getModelById()` returns correct model profile
- [ ] **CHK-018** [US-002, FR-004] `getModelsByTier()` filters models by tier (free, cheap, standard, premium, sota)
- [ ] **CHK-019** [US-002, FR-004] Registry includes CLI flags and values for each model

### FR-005: Cost Estimation Display
- [ ] **CHK-020** [US-024, FR-005] Estimated cost displayed before execution starts
- [ ] **CHK-021** [US-024, FR-005] Display includes mode comparison: "vs ${baseline} without Auto Mode - {savings}% savings"
- [ ] **CHK-022** [US-024, FR-005] Per-story estimates show complexity level and assigned model
- [ ] **CHK-023** [US-024, FR-005] `relentless estimate --feature <name>` displays estimates without executing

### FR-006: Cost Reporting After Execution
- [ ] **CHK-024** [US-025, FR-006] Actual total cost displayed after execution completes
- [ ] **CHK-025** [US-025, FR-006] Savings percentage shown: "saved {X}% vs single-model execution"
- [ ] **CHK-026** [US-025, FR-006] Per-story breakdown includes initial model, final model, actual cost
- [ ] **CHK-027** [US-025, FR-006] Escalation costs clearly shown: "escalated from {model} to {model} (+${cost})"
- [ ] **CHK-028** [US-025, FR-006] Cost report appended to progress.txt with timestamp

### FR-007: Model Escalation (Cascade)
- [ ] **CHK-029** [US-011, FR-007] Task failing with Haiku automatically retries with Sonnet
- [ ] **CHK-030** [US-011, FR-007] Task failing with Sonnet escalates to Opus with user notification
- [ ] **CHK-031** [US-011, FR-007] Max escalation reached marks task as `blocked` with clear message
- [ ] **CHK-032** [US-011, FR-007] Escalation paths configurable via `config.escalation.escalationPath`
- [ ] **CHK-033** [US-011, FR-007] Escalation can be disabled via `config.escalation.enabled: false`

### FR-008: User Review Prompt
- [ ] **CHK-034** [US-020, FR-008] Prompt displayed when feature about to complete: "Run final review? [y/n]"
- [ ] **CHK-035** [US-020, FR-008] Mode selection prompt: "Review mode? [free/cheap/good/genius]"
- [ ] **CHK-036** [US-020, FR-008] "No" skips review with warning logged
- [ ] **CHK-037** [US-020, FR-008] Default mode is "good" when Enter pressed without input

### FR-009: Review Micro-Tasks
- [ ] **CHK-038** [US-014, FR-009] Typecheck micro-task runs `bun run typecheck` and parses errors
- [ ] **CHK-039** [US-015, FR-009] Lint micro-task runs `bun run lint` and parses warnings/errors
- [ ] **CHK-040** [US-016, FR-009] Test micro-task runs `bun test` and parses failures
- [ ] **CHK-041** [US-017, FR-009] Security micro-task detects hardcoded passwords, API keys, eval(), innerHTML
- [ ] **CHK-042** [US-018, FR-009] Quality micro-task detects dead code, duplication, high complexity
- [ ] **CHK-043** [US-019, FR-009] Docs micro-task detects missing README updates and JSDoc
- [ ] **CHK-044** [US-013, FR-009] Each micro-task runs in fresh harness session (no shared context)

### FR-010: Fallback Order Configuration
- [ ] **CHK-045** [US-022, FR-010] CLI accepts `--fallback-order "harness1,harness2,..."` flag
- [ ] **CHK-046** [US-022, FR-010] Default fallback order: claude > codex > droid > opencode > amp > gemini
- [ ] **CHK-047** [US-022, FR-010] Fallback order configurable in `relentless.config.yaml`
- [ ] **CHK-048** [US-022, FR-010] CLI flag overrides config file fallback order

### FR-011: Graceful Harness Fallback
- [ ] **CHK-049** [US-012, FR-011] Rate limit (HTTP 429) triggers fallback to next harness
- [ ] **CHK-050** [US-012, FR-011] Missing API key detected and harness skipped with warning
- [ ] **CHK-051** [US-012, FR-011] Rate-limited harness marked unavailable for cooldown period (60s default)
- [ ] **CHK-052** [US-012, FR-011] If all harnesses unavailable, task marked as `blocked` with clear error

### FR-012: Routing Decision Logging
- [ ] **CHK-053** [US-010, FR-012] All routing decisions logged to progress.txt with timestamp
- [ ] **CHK-054** [US-010, FR-012] Routing log includes: task ID, complexity, mode, harness, model, reasoning
- [ ] **CHK-055** [US-012, FR-012] Harness fallback events logged: "Harness {name} unavailable ({reason}), falling back to {next}"

---

## 2. Success Criteria Validation

### SC-001: 50% Cost Savings
- [ ] **CHK-056** [SC-001] Users with Auto Mode enabled save at least 50% on average vs single-model
- [ ] **CHK-057** [SC-001] Integration test verifies `--mode cheap` achieves >50% savings vs genius mode
- [ ] **CHK-058** [SC-001] Cost comparison uses SOTA pricing as baseline ($5/$25 per MTok for Opus)

### SC-002: 95% Task Success Rate
- [ ] **CHK-059** [SC-002] Task success rate remains above 95% with Auto Mode enabled
- [ ] **CHK-060** [SC-002] Integration test tracks success/failure ratio across mixed complexity feature
- [ ] **CHK-061** [SC-002] Success rate tracked in cost report for analysis

### SC-003: Cost Estimate Accuracy (within 20%)
- [ ] **CHK-062** [SC-003] Estimated costs within 20% of actual execution costs
- [ ] **CHK-063** [SC-003] Integration test compares estimated vs actual and asserts <20% variance
- [ ] **CHK-064** [SC-003] Token estimation formula validated against real executions

### SC-004: Escalation Rate Below 15%
- [ ] **CHK-065** [SC-004] Model escalation rate stays below 15% for well-classified tasks
- [ ] **CHK-066** [SC-004] Escalation percentage included in cost report summary
- [ ] **CHK-067** [SC-004] High escalation rate (>20%) triggers warning in progress.txt

### SC-005: Review Catches <10% Issues
- [ ] **CHK-068** [SC-005] Final review catches issues in less than 10% of features
- [ ] **CHK-069** [SC-005] Review findings tracked over multiple features for trend analysis

### SC-006: 30% Adoption Rate
- [ ] **CHK-070** [SC-006] README prominently features "Save 50-75% with Smart Auto Mode"
- [ ] **CHK-071** [SC-006] `relentless init` prompts for Auto Mode enablement

---

## 3. Constitution Compliance

### Principle 1: Test-Driven Development (TDD)
- [ ] **CHK-072** [Constitution, US-027] Tests written BEFORE implementation for all routing module functions
- [ ] **CHK-073** [Constitution, US-027] Unit tests achieve >80% coverage on routing module
- [ ] **CHK-074** [Constitution, US-028] Integration tests exist for full auto-mode workflow
- [ ] **CHK-075** [Constitution, US-028] E2E test validates feature completion with Auto Mode

### Principle 2: Smart Model Routing
- [ ] **CHK-076** [Constitution] Planning phase evaluates task complexity before assigning models
- [ ] **CHK-077** [Constitution] Routing decisions made at planning time (in tasks.md/prd.json), not runtime
- [ ] **CHK-078** [Constitution] Model/harness performance history tracked in progress.txt
- [ ] **CHK-079** [Constitution] Simple tasks routable to cheaper/free models when user opts in
- [ ] **CHK-080** [Constitution] Complex tasks and final reviews use SOTA models

### Principle 5: Adaptive Final Review
- [ ] **CHK-081** [Constitution, US-020] Every feature has final review phase before completion
- [ ] **CHK-082** [Constitution, US-020] Review performed by SOTA model (Opus 4.5 in genius mode)
- [ ] **CHK-083** [Constitution, US-013] Review checks for: bugs, code quality, unnecessary artifacts, duplicate code

### Principle 6: Agent-Aware Best Practices
- [ ] **CHK-084** [Constitution, US-002] Up-to-date knowledge of each agent's capabilities in registry
- [ ] **CHK-085** [Constitution, US-012] Agent rate limits respected with intelligent fallback
- [ ] **CHK-086** [Constitution, US-012] Graceful degradation between agent tiers implemented

### Principle 7: Zero-Lint Policy
- [ ] **CHK-087** [Constitution] All new code passes `bun run lint` with zero warnings
- [ ] **CHK-088** [Constitution] All new code passes `bun run typecheck` with zero errors
- [ ] **CHK-089** [Constitution] No eslint-disable comments added to suppress issues

---

## 4. Integration Validation

### Harness Model Selection
- [ ] **CHK-090** [US-003] Claude adapter supports `--model` flag (opus-4-5, sonnet-4-5, haiku-4-5)
- [ ] **CHK-091** [US-004] Codex adapter supports `--model` flag (gpt-5.2-xhigh, high, medium, low)
- [ ] **CHK-092** [US-005] Droid adapter supports `-m` flag (gpt-5.2, claude-sonnet-4-5-20250929, gpt-5.1-codex)
- [ ] **CHK-093** [US-006] OpenCode adapter supports `--model` flag (glm-4.7, grok-code-fast-1, minimax-m2.1)
- [ ] **CHK-094** [US-007] Amp adapter supports `-m` CLI flag with `-x` execute mode (free, smart)
- [ ] **CHK-095** [US-008] Gemini adapter supports `--model` flag (gemini-3-pro, gemini-3-flash)

### Fallback Chain Integration
- [ ] **CHK-096** [US-012] Fallback chain tested: Claude fails -> Codex -> Droid -> OpenCode -> Amp -> Gemini
- [ ] **CHK-097** [US-012] Partial fallback order works (only specified harnesses used)
- [ ] **CHK-098** [US-012] Fallback preserves complexity classification but selects appropriate model

### Review Micro-Tasks Isolation
- [ ] **CHK-099** [US-013] Each review micro-task spawns completely new harness process
- [ ] **CHK-100** [US-013] No context shared between typecheck, lint, test, security, quality, docs tasks
- [ ] **CHK-101** [US-013] Fix tasks queued to progress.txt BEFORE proceeding to next micro-task

---

## 5. Edge Cases & Error Handling

### Rate Limit Handling
- [ ] **CHK-102** [Edge Case, US-012] HTTP 429 response triggers harness fallback
- [ ] **CHK-103** [Edge Case, US-012] "Rate limit exceeded" text in error triggers fallback
- [ ] **CHK-104** [Edge Case, US-012] "Quota exhausted" text in error triggers fallback
- [ ] **CHK-105** [Edge Case, US-012] Rate-limited harness has 60-second cooldown before retry

### Missing API Keys
- [ ] **CHK-106** [Edge Case, US-012] Missing ANTHROPIC_API_KEY skips Claude harness with warning
- [ ] **CHK-107** [Edge Case, US-012] Missing OPENAI_API_KEY skips Codex harness with warning
- [ ] **CHK-108** [Edge Case, US-012] System continues with available harnesses when some keys missing
- [ ] **CHK-109** [Edge Case] Clear error when NO API keys are configured for any harness

### Invalid Mode/Harness Names
- [ ] **CHK-110** [Edge Case, US-021] Invalid `--mode xyz` displays: "Invalid mode 'xyz'. Valid options: free, cheap, good, genius"
- [ ] **CHK-111** [Edge Case, US-022] Invalid harness in `--fallback-order` displays valid options
- [ ] **CHK-112** [Edge Case, US-022] Duplicate harnesses in fallback order deduplicated with warning

### Escalation Path Exhaustion
- [ ] **CHK-113** [Edge Case, US-011] Opus fails -> task marked as `blocked`
- [ ] **CHK-114** [Edge Case, US-011] Blocked task notifies user: "Task {id} requires manual intervention"
- [ ] **CHK-115** [Edge Case, US-011] Free mode exhausts free models -> escalates to cheap mode
- [ ] **CHK-116** [Edge Case, US-011] All harnesses exhausted -> clear error with troubleshooting steps

### Command Failures
- [ ] **CHK-117** [Edge Case, US-014] `bun run typecheck` command not found -> clear error
- [ ] **CHK-118** [Edge Case, US-015] ESLint not configured -> report configuration error
- [ ] **CHK-119** [Edge Case, US-016] Test timeout -> report timeout error with duration
- [ ] **CHK-120** [Edge Case, US-017] No changed files -> skip security scan gracefully

---

## 6. Documentation & UX

### README Updates
- [ ] **CHK-121** [US-029] README.md includes "Save 50-75% with Smart Auto Mode" in feature list
- [ ] **CHK-122** [US-029] README.md has "Auto Mode" section explaining four modes
- [ ] **CHK-123** [US-029] README.md includes cost savings table with examples
- [ ] **CHK-124** [US-029] README.md documents `--mode`, `--fallback-order`, `--skip-review`, `--review-mode` flags

### CLI Help Text
- [ ] **CHK-125** [US-021] `relentless run --help` displays `--mode` with descriptions and savings percentages
- [ ] **CHK-126** [US-022] `relentless run --help` explains `--fallback-order` purpose and default
- [ ] **CHK-127** [US-023] `relentless run --help` explains `--skip-review` and `--review-mode` impact
- [ ] **CHK-128** [US-024] `relentless estimate --help` explains estimation without execution

### Error Messages
- [ ] **CHK-129** [UX] Rate limit error includes: harness name, cooldown duration, fallback harness
- [ ] **CHK-130** [UX] Missing API key error includes: env var name, documentation link
- [ ] **CHK-131** [UX] Blocked task error includes: task ID, reason, suggested next steps
- [ ] **CHK-132** [UX] Cost estimate disclaimer: "Estimates may vary by +/- 20%"

### Developer Documentation
- [ ] **CHK-133** [US-029] CLAUDE.md documents routing module structure (`src/routing/`)
- [ ] **CHK-134** [US-029] CLAUDE.md documents review module structure (`src/review/`)
- [ ] **CHK-135** [US-029] CLAUDE.md documents testing patterns for routing and integration tests

---

## 7. Performance

### Classification Performance
- [ ] **CHK-136** [Performance] Heuristic classification completes in < 50ms
- [ ] **CHK-137** [Performance] LLM classification (when needed) completes in < 5 seconds
- [ ] **CHK-138** [Performance] Batch classification of 30 stories completes in < 2 seconds (heuristic-only)

### Routing Overhead
- [ ] **CHK-139** [Performance] Model selection adds < 100ms overhead per task
- [ ] **CHK-140** [Performance] Registry lookup is O(1) via Map/object indexing
- [ ] **CHK-141** [Performance] No noticeable delay in CLI startup due to registry loading

### Review Performance
- [ ] **CHK-142** [Performance] Each review micro-task completes in < 30 seconds
- [ ] **CHK-143** [Performance] Full review pipeline (6 tasks) completes in < 3 minutes
- [ ] **CHK-144** [Performance] Review summary displayed within 1 second of completion

---

## Summary

| Category | Items | Constitution | Gaps/Edge Cases |
|----------|-------|--------------|-----------------|
| Functional (FR-001 to FR-012) | 55 | - | - |
| Success Criteria (SC-001 to SC-006) | 16 | - | - |
| Constitution Compliance | 18 | 18 | - |
| Integration Validation | 12 | - | - |
| Edge Cases & Error Handling | 19 | - | 19 |
| Documentation & UX | 15 | - | - |
| Performance | 9 | - | - |
| **Total** | **144** | **18** | **19** |

---

## Next Steps

1. Run `relentless convert tasks.md` to generate `prd.json`
2. Begin implementation with Phase 0: Foundation (US-001)
3. Mark checklist items as complete during implementation
4. Final review verifies all checklist items pass

---

*This checklist validates Smart Auto Model Routing implementation against spec.md, plan.md, tasks.md, and constitution.md requirements.*
