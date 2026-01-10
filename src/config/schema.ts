/**
 * Relentless Configuration Schema
 *
 * Defines the structure and validation for relentless.config.json
 */

import { z } from "zod";
import type { AgentName, StoryType } from "../agents/types";

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
  defaultAgent: z.enum(["claude", "amp", "opencode", "codex", "droid", "gemini"]).default("claude"),
  agents: z.record(
    z.enum(["claude", "amp", "opencode", "codex", "droid", "gemini"]),
    AgentConfigSchema
  ).default({}),
  routing: RoutingConfigSchema.default({}),
  execution: ExecutionConfigSchema.default({}),
  prompt: z.object({
    path: z.string().default("prompt.md"),
  }).default({}),
});

export type RelentlessConfig = z.infer<typeof RelentlessConfigSchema>;

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: RelentlessConfig = {
  defaultAgent: "claude",
  agents: {
    claude: { dangerouslyAllowAll: true },
    amp: { dangerouslyAllowAll: true },
    gemini: { dangerouslyAllowAll: true },
  },
  routing: {
    rules: [],
    default: "claude",
  },
  execution: {
    maxIterations: 20,
    iterationDelay: 2000,
    timeout: 600000,
  },
  prompt: {
    path: "prompt.md",
  },
};
