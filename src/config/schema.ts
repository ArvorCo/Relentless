/**
 * Relentless Configuration Schema
 *
 * Defines the structure and validation for relentless.config.json
 */

import { z } from "zod";
// Agent and story types defined inline in Zod schemas below

// ============================================================================
// Auto Mode Configuration Schemas (US-001)
// ============================================================================

/**
 * Cost optimization mode for task routing.
 * - free: Use only free tier models (GLM-4.7, etc.)
 * - cheap: Use low-cost models for most tasks, escalate only when needed
 * - good: Balanced quality/cost with smart routing (default)
 * - genius: Use SOTA models (Opus 4.5, GPT-5.2) for all tasks
 */
export const ModeSchema = z.enum(["free", "cheap", "good", "genius"]);
export type Mode = z.infer<typeof ModeSchema>;

/**
 * Task complexity level for routing decisions.
 * - simple: Trivial tasks (typos, comments, renaming)
 * - medium: Standard tasks (features, tests, refactoring)
 * - complex: Advanced tasks (architecture, security, auth)
 * - expert: Highly complex tasks (performance, distributed systems)
 */
export const ComplexitySchema = z.enum(["simple", "medium", "complex", "expert"]);
export type Complexity = z.infer<typeof ComplexitySchema>;

/**
 * Supported AI harness/agent names.
 * Each harness corresponds to an AI coding tool with specific capabilities.
 */
export const HarnessNameSchema = z.enum(["claude", "codex", "droid", "opencode", "amp", "gemini"]);
export type HarnessName = z.infer<typeof HarnessNameSchema>;

/**
 * Model assignments for each complexity level within a mode.
 * Maps complexity levels to specific model identifiers.
 */
export const ModeModelsSchema = z.object({
  /** Model for simple tasks (e.g., haiku-4.5) */
  simple: z.string(),
  /** Model for medium tasks (e.g., sonnet-4.5) */
  medium: z.string(),
  /** Model for complex tasks (e.g., opus-4.5) */
  complex: z.string(),
  /** Model for expert tasks (e.g., opus-4.5) */
  expert: z.string(),
});
export type ModeModels = z.infer<typeof ModeModelsSchema>;

/**
 * Review micro-task types for the final review phase.
 * Each task runs in isolation to prevent context compaction.
 */
export const ReviewTaskSchema = z.enum(["typecheck", "lint", "test", "security", "quality", "docs"]);
export type ReviewTask = z.infer<typeof ReviewTaskSchema>;

/**
 * Configuration for the review phase.
 * Controls which micro-tasks run and how they behave.
 */
export const ReviewConfigSchema = z.object({
  /** Whether to prompt user before running review */
  promptUser: z.boolean().default(true),
  /** Default mode for review tasks */
  defaultMode: ModeSchema.default("good"),
  /** Ordered list of micro-tasks to run */
  microTasks: z.array(ReviewTaskSchema).default(["typecheck", "lint", "test", "security", "quality", "docs"]),
  /** Maximum retries for failed micro-tasks (1-5) */
  maxRetries: z.number().int().min(1).max(5).default(3),
});
export type ReviewConfig = z.infer<typeof ReviewConfigSchema>;

/**
 * Configuration for automatic model escalation on failure.
 * Allows tasks to retry with more capable models when initial routing fails.
 */
export const EscalationConfigSchema = z.object({
  /** Enable automatic escalation */
  enabled: z.boolean().default(true),
  /** Maximum escalation attempts before marking task as blocked (1-5) */
  maxAttempts: z.number().int().min(1).max(5).default(3),
  /** Maps current model to next model in escalation path */
  escalationPath: z.record(z.string(), z.string()).default({
    "haiku-4.5": "sonnet-4.5",
    "sonnet-4.5": "opus-4.5",
    "gpt-5.2-low": "gpt-5.2-medium",
    "gpt-5.2-medium": "gpt-5.2-high",
    "gpt-5.2-high": "gpt-5.2-xhigh",
    "grok-code-fast-1": "gpt-5.2-low",
    "gemini-3-flash": "gemini-3-pro",
  }),
});
export type EscalationConfig = z.infer<typeof EscalationConfigSchema>;

/**
 * Complete Auto Mode configuration.
 * Controls smart model routing for cost optimization.
 */
export const AutoModeConfigSchema = z.object({
  /** Enable auto mode routing */
  enabled: z.boolean().default(true),
  /** Default cost optimization mode */
  defaultMode: ModeSchema.default("good"),
  /** Harness fallback order when rate limited */
  fallbackOrder: z.array(HarnessNameSchema).default(["claude", "codex", "droid", "opencode", "amp", "gemini"]),
  /** Model assignments per complexity level */
  modeModels: ModeModelsSchema.default({
    simple: "haiku-4.5",
    medium: "sonnet-4.5",
    complex: "opus-4.5",
    expert: "opus-4.5",
  }),
  /** Review phase configuration */
  review: ReviewConfigSchema.default({}),
  /** Escalation configuration */
  escalation: EscalationConfigSchema.default({}),
});
export type AutoModeConfig = z.infer<typeof AutoModeConfigSchema>;

// ============================================================================
// Base Configuration Schemas
// ============================================================================

/**
 * Agent-specific configuration
 */
export const AgentConfigSchema = z.object({
  model: z.string().optional(),
  dangerouslyAllowAll: z.boolean().default(true),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;

/**
 * Routing rule for smart agent selection
 */
export const RoutingRuleSchema = z.object({
  storyType: z.enum(["database", "ui", "api", "test", "refactor", "docs", "general"]),
  agent: z.enum(["claude", "amp", "opencode", "codex", "droid", "gemini"]),
});

export type RoutingRule = z.infer<typeof RoutingRuleSchema>;

/**
 * Fallback configuration for automatic agent switching
 */
export const FallbackConfigSchema = z.object({
  /** Enable automatic fallback when rate limited */
  enabled: z.boolean().default(true),
  /** Priority order for agents (first = preferred) */
  priority: z.array(z.enum(["claude", "amp", "opencode", "codex", "droid", "gemini"]))
    .default(["claude", "codex", "amp", "opencode", "gemini"]),
  /** Automatically switch back when limits reset */
  autoRecovery: z.boolean().default(true),
  /** Delay (ms) before trying fallback agent */
  retryDelay: z.number().int().nonnegative().default(2000),
});

export type FallbackConfig = z.infer<typeof FallbackConfigSchema>;

/**
 * Execution configuration
 */
export const ExecutionConfigSchema = z.object({
  maxIterations: z.number().int().positive().default(20),
  iterationDelay: z.number().int().nonnegative().default(2000),
  timeout: z.number().int().positive().default(600000), // 10 minutes
});

export type ExecutionConfig = z.infer<typeof ExecutionConfigSchema>;

/**
 * Routing configuration
 */
export const RoutingConfigSchema = z.object({
  rules: z.array(RoutingRuleSchema).default([]),
  default: z.enum(["claude", "amp", "opencode", "codex", "droid", "gemini"]).default("claude"),
});

export type RoutingConfig = z.infer<typeof RoutingConfigSchema>;

/**
 * Complete Relentless configuration
 */
export const RelentlessConfigSchema = z.object({
  defaultAgent: z
    .enum(["auto", "claude", "amp", "opencode", "codex", "droid", "gemini"])
    .default("auto"),
  agents: z.record(
    z.enum(["claude", "amp", "opencode", "codex", "droid", "gemini"]),
    AgentConfigSchema
  ).default({}),
  routing: RoutingConfigSchema.default({}),
  fallback: FallbackConfigSchema.default({}),
  execution: ExecutionConfigSchema.default({}),
  prompt: z.object({
    path: z.string().default("prompt.md"),
  }).default({}),
  /** Auto mode configuration for smart model routing (US-001) */
  autoMode: AutoModeConfigSchema.default({}),
});

export type RelentlessConfig = z.infer<typeof RelentlessConfigSchema>;

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: RelentlessConfig = {
  defaultAgent: "auto",
  agents: {
    claude: { dangerouslyAllowAll: true },
    amp: { dangerouslyAllowAll: true },
    gemini: { dangerouslyAllowAll: true },
  },
  routing: {
    rules: [],
    default: "claude",
  },
  fallback: {
    enabled: true,
    priority: ["claude", "codex", "amp", "opencode", "gemini"],
    autoRecovery: true,
    retryDelay: 2000,
  },
  execution: {
    maxIterations: 20,
    iterationDelay: 2000,
    timeout: 600000,
  },
  prompt: {
    path: "prompt.md",
  },
  autoMode: {
    enabled: false,
    defaultMode: "good",
    fallbackOrder: ["claude", "codex", "droid", "opencode", "amp", "gemini"],
    modeModels: {
      simple: "haiku-4.5",
      medium: "sonnet-4.5",
      complex: "opus-4.5",
      expert: "opus-4.5",
    },
    review: {
      promptUser: true,
      defaultMode: "good",
      microTasks: ["typecheck", "lint", "test", "security", "quality", "docs"],
      maxRetries: 3,
    },
    escalation: {
      enabled: true,
      maxAttempts: 3,
      escalationPath: {
        "haiku-4.5": "sonnet-4.5",
        "sonnet-4.5": "opus-4.5",
        "gpt-5.2-low": "gpt-5.2-medium",
        "gpt-5.2-medium": "gpt-5.2-high",
        "gpt-5.2-high": "gpt-5.2-xhigh",
        "grok-code-fast-1": "gpt-5.2-low",
        "gemini-3-flash": "gemini-3-pro",
      },
    },
  },
};
