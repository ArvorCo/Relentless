# Feature Specification: Smart Auto Model Routing

**Feature Branch**: `002-smart-auto-model`
**Created**: 2026-01-19
**Status**: Draft (User Clarifications Applied)
**Input**: User description: "Improve auto model routing to choose optimal models for each task, leveraging free/cheap models for simple tasks and SOTA models for complex reasoning, to save users money while maintaining quality"

---

## Overview

Smart Auto Model Routing enables Relentless to automatically select the optimal model/harness combination for each task based on complexity, cost, and quality requirements. The system provides **four opinionated modes** (`--mode free|cheap|good|genius`) that give users control over the cost/quality tradeoff.

**Value Proposition**: "Pay for intelligence only when you need it."

### Mode Options

| Mode | Description | Target Savings | Use Case |
|------|-------------|----------------|----------|
| `free` | Maximizes use of free models (GLM-4.7, Amp Free, Gemini Flash) | 80-90% | Prototyping, learning, tight budgets |
| `cheap` | Prioritizes low-cost models, escalates only when needed | 60-75% | Most development work |
| `good` | Balanced approach with proven models | 40-50% | Production features |
| `genius` | Uses SOTA models throughout | 0-20% | Critical/complex features |

### Harness Fallback Order

When a harness is unavailable (rate limits, missing API keys), the system falls back in this configurable order:

**Default**: Claude Code > Codex > Droid > OpenCode Zen > Amp > Gemini

**Rationale**: Droid is a top-tier harness with access to many models (including GLM-4.7, and others), so it ranks third. Each harness has its own model ecosystem that must be orchestrated independently.

Users can override with `--fallback-order` or in `relentless.config.yaml`.

---

## User Scenarios & Testing

### User Story 1 - Enable Auto Mode During Init (Priority: P1)

When a user runs `relentless init`, they can opt into Smart Auto Mode which will automatically route tasks to cost-optimal models throughout the feature lifecycle.

**Why this priority**: This is the entry point for the feature. Without opt-in capability, no routing can occur.

**Independent Test**: Run `relentless init` and verify the configuration file includes auto-routing preferences.

**Acceptance Scenarios**:

1. **Given** a new project, **When** user runs `relentless init`, **Then** they are asked "Enable Smart Auto Mode? (Saves 50-75% on costs)" with Yes/No options
2. **Given** user selects "Yes", **When** init completes, **Then** `relentless.config.yaml` contains `autoMode: enabled` and `costOptimization: balanced`
3. **Given** user selects "No", **When** init completes, **Then** `relentless.config.yaml` contains `autoMode: disabled` and user can manually specify models

---

### User Story 2 - Task Complexity Classification (Priority: P1)

During the `/relentless.plan` phase, each user story/task is classified by complexity level (simple, medium, complex, expert) which determines model routing.

**Why this priority**: Classification is the core intelligence of the routing system. Without accurate classification, routing cannot optimize costs effectively.

**Independent Test**: Run `/relentless.plan` on a sample PRD and verify each task receives a complexity classification with justification.

**Acceptance Scenarios**:

1. **Given** a task like "Fix typo in README", **When** planner analyzes it, **Then** complexity is classified as `simple` with reasoning documented
2. **Given** a task like "Implement OAuth2 authentication with refresh tokens", **When** planner analyzes it, **Then** complexity is classified as `complex` or `expert` with reasoning documented
3. **Given** any task classification, **When** plan is generated, **Then** `plan.md` includes complexity level and recommended harness/model for each story

---

### User Story 3 - Model Routing in PRD.json (Priority: P1)

The generated `prd.json` includes harness and model specifications for each user story, enabling the orchestrator to route tasks automatically.

**Why this priority**: PRD.json is the execution manifest. Without model routing metadata, the orchestrator cannot make routing decisions.

**Independent Test**: Generate `prd.json` from tasks and verify each story includes `harness`, `model`, and `complexity` fields.

**Acceptance Scenarios**:

1. **Given** a simple task, **When** `prd.json` is generated, **Then** story includes `{"harness": "opencode", "model": "glm-4.7", "complexity": "simple"}`
2. **Given** a complex task, **When** `prd.json` is generated, **Then** story includes `{"harness": "claude", "model": "opus-4.5", "complexity": "expert"}`
3. **Given** auto mode is disabled, **When** `prd.json` is generated, **Then** no routing metadata is included and default harness is used

---

### User Story 4 - Harness/Model Registry (Priority: P2)

Maintain a knowledge base of available harnesses, their models, capabilities, costs, and recommended use cases.

**Why this priority**: The registry provides the intelligence for routing decisions. Without it, the system cannot know which models are available or their strengths.

**Independent Test**: Query the registry for models suited to "frontend development" and verify appropriate models are returned with metadata.

**Acceptance Scenarios**:

1. **Given** the system starts, **When** registry is loaded, **Then** it contains all supported harnesses (Claude, Amp, OpenCode, Codex, Gemini, Droid) with their available models
2. **Given** a query for "free models", **When** registry is searched, **Then** it returns GLM-4.7, Grok Code Fast, Amp Free with their capabilities
3. **Given** a model capability query, **When** user asks "best for code review", **Then** registry returns Opus 4.5 and GPT-5.2 High with benchmark scores

---

### User Story 5 - Cost Estimation and Reporting (Priority: P2)

Before execution, show users an estimated cost breakdown. After execution, report actual costs vs. baseline (using single SOTA model).

**Why this priority**: Users need visibility into savings to trust and adopt auto mode. Cost reporting demonstrates value.

**Independent Test**: Run a feature with auto mode and verify cost estimate before and actual cost after are displayed with savings percentage.

**Acceptance Scenarios**:

1. **Given** a feature with 10 stories, **When** execution is about to start, **Then** display "Estimated cost: $2.50 (vs $8.75 without Auto Mode - 71% savings)"
2. **Given** execution completes, **When** summary is shown, **Then** display actual costs per story and total savings
3. **Given** a story fails and requires retry with larger model, **When** costs are reported, **Then** escalation costs are included in total

---

### User Story 6 - Model Escalation on Failure (Priority: P2)

When a task fails with a smaller model, automatically escalate to a more capable model (cascade pattern).

**Why this priority**: Ensures quality is maintained even when initial routing underestimates complexity.

**Independent Test**: Force a task to fail with a small model and verify it automatically retries with a larger model.

**Acceptance Scenarios**:

1. **Given** a task routed to Haiku, **When** it fails validation, **Then** system automatically retries with Sonnet
2. **Given** a task fails with Sonnet, **When** retry also fails, **Then** system escalates to Opus with notification to user
3. **Given** max escalation reached (Opus fails), **When** task still fails, **Then** mark as blocked and notify user for manual intervention

---

### User Story 7 - Configurable Final Review (Priority: P2)

Final review is recommended but configurable. User chooses whether to run review and which mode to use. Review tasks are broken into small, focused steps to avoid context compaction issues.

**Why this priority**: Gives users control over costs while maintaining quality options. Aligns with Constitution Principle 5 but respects user autonomy.

**Independent Test**: Complete a feature and verify user is prompted about review options.

**Acceptance Scenarios**:

1. **Given** all stories pass, **When** feature is about to complete, **Then** prompt user "Run final review? [yes/no] Mode? [free/cheap/good/genius]"
2. **Given** user opts for review, **When** review runs, **Then** it executes as separate micro-tasks: typecheck, lint, security scan, code quality, test coverage
3. **Given** each review micro-task, **When** it runs, **Then** it completes in a single harness session without context compaction
4. **Given** user skips review with `--skip-review`, **When** feature completes, **Then** log warning but allow completion
5. **Given** review finds issues, **When** micro-task completes, **Then** immediately report issue and queue fix before next review step

### User Story 7a - Review Micro-Tasks (Priority: P2)

Break final review into small, independently executable review steps to prevent context window bloat.

**Why this priority**: Long review sessions cause harness context compaction, losing important details.

**Independent Test**: Run final review and verify each check runs as a separate harness session.

**Review Micro-Tasks**:

1. **Typecheck Review**: Run `bun run typecheck`, report errors, queue fixes
2. **Lint Review**: Run `bun run lint`, report warnings/errors, queue fixes
3. **Test Review**: Run `bun test`, report failures, queue fixes
4. **Security Scan**: Check for common vulnerabilities (OWASP top 10), report issues
5. **Code Quality**: Check for dead code, duplications, complexity issues
6. **Documentation**: Verify README/docs updated if needed

Each runs in isolation, reports findings, and queues fix tasks before proceeding.

---

### User Story 8 - Documentation Updates (Priority: P3)

Update README, documentation, and marketing materials to promote Auto Mode as a cost-saving feature.

**Why this priority**: Adoption depends on awareness. Documentation drives feature discovery and trust.

**Independent Test**: Review README and verify Auto Mode is prominently featured with cost savings claims.

**Acceptance Scenarios**:

1. **Given** feature is complete, **When** README is updated, **Then** includes "Save 50-75% with Smart Auto Mode" in feature highlights
2. **Given** docs are updated, **When** user searches "cost", **Then** Auto Mode documentation appears with configuration instructions
3. **Given** a new user reads docs, **When** they reach configuration section, **Then** Auto Mode is explained with example cost breakdowns

---

### Edge Cases

- What happens when a free model becomes unavailable? System falls back to next cheapest option with user notification
- How does the system handle model rate limits? Queue and retry with exponential backoff, escalate if limits persist
- What if user's API keys are missing for routed model? Skip that model in routing, warn user of limited options
- How are parallel tasks routed? Each task independently routed based on its complexity

---

## Requirements

### Functional Requirements

- **FR-001**: System MUST support `--mode` flag with options: `free`, `cheap`, `good`, `genius`
- **FR-002**: System MUST use hybrid complexity classification (heuristics + LLM for ambiguous cases)
- **FR-003**: System MUST include routing metadata (harness, model, complexity, mode) in `prd.json`
- **FR-004**: System MUST maintain a harness/model registry with capabilities and costs for all 6 harnesses
- **FR-005**: System MUST display estimated costs before execution with mode comparison
- **FR-006**: System MUST report actual costs and savings percentage after execution
- **FR-007**: System MUST escalate to larger models when smaller models fail (cascade)
- **FR-008**: System MUST prompt user for final review preference (yes/no, mode selection)
- **FR-009**: System MUST break final review into micro-tasks (typecheck, lint, test, security, quality, docs)
- **FR-010**: System MUST support `--fallback-order` for harness priority configuration
- **FR-011**: System MUST gracefully handle harness unavailability with automatic fallback
- **FR-012**: System MUST log all routing decisions for debugging and optimization

### Key Entities

- **HarnessConfig**: Represents a harness (Claude, Amp, OpenCode, etc.) with available models, costs, and capabilities
- **ModelProfile**: Represents a model with name, tier (free/cheap/standard/premium/sota), capabilities, benchmarks, and cost per token
- **TaskClassification**: Represents complexity analysis result with level, reasoning, and recommended models
- **RoutingDecision**: Represents the final model selection for a task with justification and cost estimate
- **CostReport**: Represents execution costs with actual spend, baseline comparison, and savings percentage

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users enabling Auto Mode save at least 50% on average compared to single-model execution
- **SC-002**: Task success rate remains above 95% with Auto Mode (vs. single SOTA model baseline)
- **SC-003**: Cost estimates are within 20% accuracy of actual execution costs
- **SC-004**: Model escalation rate stays below 15% (indicating good initial classification)
- **SC-005**: Final review catches issues in less than 10% of features (indicating quality throughout)
- **SC-006**: Documentation updates result in 30% adoption rate of Auto Mode within 3 months

---

## Model Capability Matrix (Research-Backed)

Based on comprehensive research, the following matrix guides routing decisions:

### Free/Low-Cost Models

| Model | Harness | Strengths | Best For | Limitations |
|-------|---------|-----------|----------|-------------|
| GLM-4.7 | OpenCode | Multilingual (66.7%), SWE-bench (73.8%), Terminal ops | Backend code, tool use, agentic workflows | Complex UI replication |
| Grok Code Fast 1 | OpenCode | Speed (92 tok/s), Tool calling, Agentic | Quick iterations, bug fixes | Tailwind CSS v3 issues |
| MiniMax M2.1 | OpenCode | Full-stack (88.6 VIBE), Token efficiency | Web/mobile apps, reviews | Newer, less docs |
| Amp Free | Amp | $10/day grant, Smart mode core tech | Interactive coding, refactoring | Context window caps, no execute mode |

### Standard Models

| Model | Harness | Strengths | Best For | Cost |
|-------|---------|-----------|----------|------|
| Claude Sonnet 4.5 | Claude | Balanced, Frontend excellence, 1M context | Daily coding, multi-file refactoring | $3/$15 per MTok |
| Claude Haiku 4.5 | Claude | Speed (4-5x faster), 73% SWE-bench | Prototypes, scaffolding | $1/$5 per MTok |
| GPT-5.2 Codex Medium | Codex | Balanced reasoning, Good review | General development | ~$1.25/$10 per MTok |
| Gemini 3 Flash | Gemini | Fast, 1M context, Free tier | Simple tasks, search | $0.50/$3 per MTok |

### SOTA Models (Expert Tasks)

| Model | Harness | Strengths | Best For | Cost |
|-------|---------|-----------|----------|------|
| Claude Opus 4.5 | Claude | 80.9% SWE-bench, Best reviews (50% important) | Architecture, complex debugging, final review | $5/$25 per MTok |
| GPT-5.2 Codex High | Codex | 80% SWE-bench, Lowest control flow errors | Complex reasoning, overnight runs | ~$1.75/$14 per MTok |
| Gemini 3 Pro | Gemini | WebDev Arena leader, Competitive programming | Frontend/UI, algorithms | $2-4/$12-18 per MTok |

### Routing Heuristics

```
IF complexity == "simple" AND task_type IN ["formatting", "typo_fix", "doc_update"]:
    route_to(free_model)  # GLM-4.7, Grok Code Fast, Amp Free

ELIF complexity == "simple" AND task_type IN ["unit_test", "small_function"]:
    route_to(haiku_or_mini)  # Haiku 4.5, GPT-5.2 Low

ELIF complexity == "medium" AND task_type IN ["feature", "refactor", "api"]:
    route_to(sonnet_or_medium)  # Sonnet 4.5, GPT-5.2 Medium

ELIF complexity == "complex" AND task_type IN ["architecture", "security", "multi_system"]:
    route_to(sota_model)  # Opus 4.5, GPT-5.2 High

ELIF complexity == "expert" OR task_type == "final_review":
    route_to(sota_model)  # Always SOTA for expert tasks and reviews

ELIF task_type == "frontend_ui":
    route_to(gemini_3_pro)  # WebDev Arena leader

ON_FAILURE:
    escalate_to_next_tier()  # Cascade pattern
```

---

## Dependencies & Assumptions

### Dependencies

- OpenCode Zen API access for free models (GLM-4.7, Grok Code Fast, MiniMax)
- Amp Free tier access (ad-supported)
- Codex CLI with configured API key
- Claude Code with configured API key
- Gemini API access (optional, for frontend optimization)

### Assumptions

- Users have API keys for at least one SOTA model (required for final review)
- Free model availability may change; system should gracefully degrade
- Cost estimates are based on current pricing; may need periodic updates
- Task complexity classification is heuristic-based and may require tuning

---

## Out of Scope

- Real-time model performance monitoring (future enhancement)
- Dynamic pricing updates from provider APIs
- A/B testing different routing strategies
- User feedback loop for routing optimization
- Custom model fine-tuning or hosting
- Multi-region model routing for latency optimization

---

## Implementation Notes

### Constitution Alignment

This feature directly implements:
- **Principle 2**: Smart Model Routing (MUST evaluate complexity, route at planning time)
- **Principle 5**: Adaptive Final Review (MUST use SOTA for final review)
- **Principle 6**: Agent-Aware Best Practices (MUST maintain knowledge of capabilities)

### Skills to Modify

1. **Plan Skill**: Add complexity classification logic
2. **Tasks Skill**: Include routing metadata in generated tasks
3. **PRD Generation**: Add harness/model fields to `prd.json` schema
4. **Orchestrator**: Implement routing logic based on `prd.json` metadata

### Configuration Schema Addition

```yaml
# relentless.config.yaml
autoMode:
  enabled: true
  defaultMode: good  # free | cheap | good | genius
  fallbackOrder:
    - claude      # Best ecosystem, primary choice
    - codex       # Strong for reviews and reasoning
    - droid       # Top-tier with many models (GLM-4.7, etc.)
    - opencode    # Free models (GLM-4.7, Grok Code Fast)
    - amp         # $10/day free grant
    - gemini      # Good for frontend/UI

  # Mode-specific model mappings
  modeModels:
    free:
      simple: glm-4.7
      medium: amp-free
      complex: gemini-3-flash
      expert: glm-4.7  # Escalate to cheap mode if fails
    cheap:
      simple: haiku-4.5
      medium: sonnet-4.5
      complex: gpt-5.2-medium
      expert: opus-4.5
    good:
      simple: sonnet-4.5
      medium: sonnet-4.5
      complex: opus-4.5
      expert: opus-4.5
    genius:
      simple: opus-4.5
      medium: opus-4.5
      complex: opus-4.5
      expert: opus-4.5

  # Review configuration
  review:
    promptUser: true  # Ask before final review
    defaultMode: good  # Default mode for review
    microTasks:
      - typecheck
      - lint
      - test
      - security
      - quality
      - docs
```

### CLI Usage Examples

```bash
# Run with specific mode
relentless run --feature auth --mode cheap

# Override fallback order
relentless run --feature auth --fallback-order "opencode,claude,codex"

# Skip final review
relentless run --feature auth --skip-review

# Specify review mode
relentless run --feature auth --review-mode genius
```

---

## Research Sources

This specification was informed by comprehensive research including:

- OpenCode Zen documentation and model benchmarks
- Amp Free tier capabilities and limitations
- OpenAI Codex CLI and GPT-5.2 model tiers
- Claude Code model comparison (Opus/Sonnet/Haiku)
- Gemini 3 and GLM-4.7 coding capabilities
- Academic papers: MasRouter, RouteLLM, GraphRouter
- Production routing implementations and cost optimization guides
