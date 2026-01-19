/**
 * Model Registry Module
 *
 * Contains model profiles for all supported AI coding agents and harnesses.
 * Provides data structures and query functions for smart model routing.
 *
 * @module src/routing/registry
 */

import { z } from "zod";
import { HarnessNameSchema, type HarnessName } from "../config/schema";

/**
 * Model tier classification for cost-based routing.
 * - free: Zero-cost models (OpenCode Zen, Amp Free)
 * - cheap: Low-cost models (Haiku, GPT-5-2-Low, Gemini Flash)
 * - standard: Balanced cost/performance models (Sonnet, GPT-5-2-Medium)
 * - premium: High-quality models (Gemini Pro)
 * - sota: State-of-the-art models (Opus, GPT-5-2-High)
 */
export const ModelTierSchema = z.enum(["free", "cheap", "standard", "premium", "sota"]);
export type ModelTier = z.infer<typeof ModelTierSchema>;

/**
 * Complete profile for a model including capabilities, costs, and CLI usage.
 */
export const ModelProfileSchema = z.object({
  /** Unique identifier for the model (e.g., "opus-4.5") */
  id: z.string(),
  /** Human-readable display name (e.g., "Claude Opus 4.5") */
  displayName: z.string(),
  /** Harness that provides this model */
  harness: HarnessNameSchema,
  /** Cost tier for routing decisions */
  tier: ModelTierSchema,
  /** Input cost per million tokens (USD) */
  inputCost: z.number(),
  /** Output cost per million tokens (USD) */
  outputCost: z.number(),
  /** SWE-bench score (if available) */
  sweBenchScore: z.number().optional(),
  /** Maximum context window in tokens */
  contextWindow: z.number(),
  /** Tokens per second generation rate (if known) */
  tokensPerSecond: z.number().optional(),
  /** List of task types this model excels at */
  strengths: z.array(z.string()),
  /** List of known limitations */
  limitations: z.array(z.string()),
  /** CLI flag used to select this model */
  cliFlag: z.string(),
  /** CLI value to pass with the flag */
  cliValue: z.string(),
});
export type ModelProfile = z.infer<typeof ModelProfileSchema>;

/**
 * Profile for a harness (AI coding agent) including its available models.
 */
export const HarnessProfileSchema = z.object({
  /** Harness identifier */
  name: HarnessNameSchema,
  /** Human-readable display name */
  displayName: z.string(),
  /** Available models for this harness */
  models: z.array(ModelProfileSchema),
  /** Default model to use when none specified */
  defaultModel: z.string(),
  /** Whether the harness supports model selection */
  supportsModelSelection: z.boolean(),
  /** Method used to select models (flag, env, config) */
  modelSelectionMethod: z.enum(["flag", "env", "config"]),
});
export type HarnessProfile = z.infer<typeof HarnessProfileSchema>;

/**
 * Complete registry of all available models across all harnesses.
 * Ordered by harness, then by tier (SOTA first within each harness).
 */
export const MODEL_REGISTRY: ModelProfile[] = [
  // ============== Claude Models ==============
  {
    id: "opus-4.5",
    displayName: "Claude Opus 4.5",
    harness: "claude",
    tier: "sota",
    inputCost: 5.0,
    outputCost: 25.0,
    sweBenchScore: 80.9,
    contextWindow: 200000,
    strengths: ["code_review", "architecture", "debugging", "final_review", "complex_reasoning"],
    limitations: ["expensive", "slower_start"],
    cliFlag: "--model",
    cliValue: "claude-opus-4-5-20251101",
  },
  {
    id: "sonnet-4.5",
    displayName: "Claude Sonnet 4.5",
    harness: "claude",
    tier: "standard",
    inputCost: 3.0,
    outputCost: 15.0,
    contextWindow: 200000,
    strengths: ["frontend", "refactoring", "daily_coding", "balanced"],
    limitations: [],
    cliFlag: "--model",
    cliValue: "claude-sonnet-4-5-20251020",
  },
  {
    id: "haiku-4.5",
    displayName: "Claude Haiku 4.5",
    harness: "claude",
    tier: "cheap",
    inputCost: 1.0,
    outputCost: 5.0,
    sweBenchScore: 73.0,
    contextWindow: 200000,
    tokensPerSecond: 200,
    strengths: ["prototyping", "scaffolding", "simple_tasks", "fast"],
    limitations: ["less_reasoning"],
    cliFlag: "--model",
    cliValue: "claude-haiku-4-5-20251022",
  },

  // ============== Codex (OpenAI) Models ==============
  {
    id: "gpt-5-2-high",
    displayName: "GPT-5.2 High",
    harness: "codex",
    tier: "sota",
    inputCost: 1.75,
    outputCost: 14.0,
    sweBenchScore: 80.0,
    contextWindow: 128000,
    strengths: ["reasoning", "control_flow", "overnight_runs", "complex_logic"],
    limitations: [],
    cliFlag: "--model",
    cliValue: "gpt-5-2-high",
  },
  {
    id: "gpt-5-2-medium",
    displayName: "GPT-5.2 Medium",
    harness: "codex",
    tier: "standard",
    inputCost: 1.25,
    outputCost: 10.0,
    contextWindow: 128000,
    strengths: ["balanced", "good_review", "general_coding"],
    limitations: [],
    cliFlag: "--model",
    cliValue: "gpt-5-2-medium",
  },
  {
    id: "gpt-5-2-low",
    displayName: "GPT-5.2 Low",
    harness: "codex",
    tier: "cheap",
    inputCost: 0.75,
    outputCost: 6.0,
    contextWindow: 128000,
    strengths: ["fast", "simple_tasks", "cost_effective"],
    limitations: ["less_accuracy"],
    cliFlag: "--model",
    cliValue: "gpt-5-2-low",
  },

  // ============== Droid Models ==============
  {
    id: "glm-4.6",
    displayName: "GLM-4.6 (Droid)",
    harness: "droid",
    tier: "free",
    inputCost: 0.0,
    outputCost: 0.0,
    contextWindow: 128000,
    strengths: ["cheap", "multilingual", "tool_use", "free_tier"],
    limitations: ["less_sota"],
    cliFlag: "-m",
    cliValue: "glm-4.6",
  },
  {
    id: "droid-gemini-2-flash",
    displayName: "Gemini 2.0 Flash (via Droid)",
    harness: "droid",
    tier: "cheap",
    inputCost: 0.0,
    outputCost: 0.0,
    contextWindow: 128000,
    strengths: ["fast", "affordable", "good_balance"],
    limitations: [],
    cliFlag: "-m",
    cliValue: "gemini-2.0-flash",
  },
  {
    id: "droid-claude-3-5-sonnet",
    displayName: "Claude 3.5 Sonnet (via Droid)",
    harness: "droid",
    tier: "standard",
    inputCost: 2.0,
    outputCost: 10.0,
    contextWindow: 200000,
    strengths: ["balanced", "good_quality", "reliable"],
    limitations: [],
    cliFlag: "-m",
    cliValue: "claude-3-5-sonnet",
  },
  {
    id: "droid-gpt-4o",
    displayName: "GPT-4o (via Droid)",
    harness: "droid",
    tier: "standard",
    inputCost: 1.5,
    outputCost: 7.5,
    contextWindow: 128000,
    strengths: ["good_balance", "multimodal"],
    limitations: [],
    cliFlag: "-m",
    cliValue: "gpt-4o",
  },

  // ============== OpenCode Zen Models (Free Tier) ==============
  {
    id: "glm-4.7",
    displayName: "GLM-4.7",
    harness: "opencode",
    tier: "free",
    inputCost: 0.0,
    outputCost: 0.0,
    sweBenchScore: 73.8,
    contextWindow: 128000,
    strengths: ["multilingual", "backend", "tool_use", "agentic", "free"],
    limitations: ["complex_ui"],
    cliFlag: "--model",
    cliValue: "glm-4.7",
  },
  {
    id: "grok-code-fast-1",
    displayName: "Grok Code Fast 1",
    harness: "opencode",
    tier: "free",
    inputCost: 0.0,
    outputCost: 0.0,
    contextWindow: 128000,
    tokensPerSecond: 92,
    strengths: ["speed", "tool_calling", "agentic", "bug_fixes", "fastest"],
    limitations: ["tailwind_v3"],
    cliFlag: "--model",
    cliValue: "grok-code-fast-1",
  },
  {
    id: "minimax-m2.1",
    displayName: "MiniMax M2.1",
    harness: "opencode",
    tier: "free",
    inputCost: 0.0,
    outputCost: 0.0,
    contextWindow: 128000,
    strengths: ["fullstack", "web_mobile", "reviews", "free"],
    limitations: ["newer_less_docs"],
    cliFlag: "--model",
    cliValue: "minimax-m2.1",
  },

  // ============== Amp Models ==============
  {
    id: "amp-free",
    displayName: "Amp Free",
    harness: "amp",
    tier: "free",
    inputCost: 0.0,
    outputCost: 0.0,
    contextWindow: 128000,
    strengths: ["interactive", "refactoring", "smart_mode", "free_daily_grant"],
    limitations: ["context_caps", "no_execute_mode", "ads"],
    cliFlag: "AMP_MODE",
    cliValue: "free",
  },
  {
    id: "amp-smart",
    displayName: "Amp Smart",
    harness: "amp",
    tier: "standard",
    inputCost: 2.0,
    outputCost: 10.0,
    contextWindow: 128000,
    strengths: ["intelligent_routing", "best_available", "smart_mode"],
    limitations: [],
    cliFlag: "AMP_MODE",
    cliValue: "smart",
  },

  // ============== Gemini Models ==============
  {
    id: "gemini-3-pro",
    displayName: "Gemini 3 Pro",
    harness: "gemini",
    tier: "premium",
    inputCost: 3.0,
    outputCost: 15.0,
    contextWindow: 1000000,
    strengths: ["frontend_ui", "webdev_arena_leader", "algorithms", "long_context"],
    limitations: [],
    cliFlag: "--model",
    cliValue: "gemini-3-pro",
  },
  {
    id: "gemini-3-flash",
    displayName: "Gemini 3 Flash",
    harness: "gemini",
    tier: "cheap",
    inputCost: 0.5,
    outputCost: 3.0,
    contextWindow: 1000000,
    strengths: ["fast", "long_context", "simple_tasks", "affordable"],
    limitations: [],
    cliFlag: "--model",
    cliValue: "gemini-3-flash",
  },
];

/**
 * Profiles for all supported harnesses including their available models.
 */
export const HARNESS_PROFILES: HarnessProfile[] = [
  {
    name: "claude",
    displayName: "Claude Code",
    models: MODEL_REGISTRY.filter((m) => m.harness === "claude"),
    defaultModel: "sonnet-4.5",
    supportsModelSelection: true,
    modelSelectionMethod: "flag",
  },
  {
    name: "codex",
    displayName: "Codex CLI",
    models: MODEL_REGISTRY.filter((m) => m.harness === "codex"),
    defaultModel: "gpt-5-2-medium",
    supportsModelSelection: true,
    modelSelectionMethod: "flag",
  },
  {
    name: "droid",
    displayName: "Droid",
    models: MODEL_REGISTRY.filter((m) => m.harness === "droid"),
    defaultModel: "glm-4.6",
    supportsModelSelection: true,
    modelSelectionMethod: "flag",
  },
  {
    name: "opencode",
    displayName: "OpenCode Zen",
    models: MODEL_REGISTRY.filter((m) => m.harness === "opencode"),
    defaultModel: "glm-4.7",
    supportsModelSelection: true,
    modelSelectionMethod: "flag",
  },
  {
    name: "amp",
    displayName: "Amp",
    models: MODEL_REGISTRY.filter((m) => m.harness === "amp"),
    defaultModel: "amp-free",
    supportsModelSelection: true,
    modelSelectionMethod: "env",
  },
  {
    name: "gemini",
    displayName: "Gemini CLI",
    models: MODEL_REGISTRY.filter((m) => m.harness === "gemini"),
    defaultModel: "gemini-3-flash",
    supportsModelSelection: true,
    modelSelectionMethod: "flag",
  },
];

/**
 * Get a model profile by its ID.
 *
 * @param id - The model identifier (e.g., "opus-4.5")
 * @returns The model profile or undefined if not found
 */
export function getModelById(id: string): ModelProfile | undefined {
  return MODEL_REGISTRY.find((model) => model.id === id);
}

/**
 * Get all models available for a specific harness.
 * Models are ordered by tier (SOTA first, then premium, standard, cheap, free).
 *
 * @param harness - The harness name
 * @returns Array of model profiles for the harness
 */
export function getModelsByHarness(harness: HarnessName): ModelProfile[] {
  const tierOrder: ModelTier[] = ["sota", "premium", "standard", "cheap", "free"];
  return MODEL_REGISTRY.filter((model) => model.harness === harness).sort((a, b) => {
    return tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier);
  });
}

/**
 * Get all models of a specific tier across all harnesses.
 *
 * @param tier - The model tier
 * @returns Array of model profiles matching the tier
 */
export function getModelsByTier(tier: ModelTier): ModelProfile[] {
  return MODEL_REGISTRY.filter((model) => model.tier === tier);
}

/**
 * Get the default model ID for a harness.
 *
 * @param harness - The harness name
 * @returns The default model ID for the harness
 */
export function getDefaultModelForHarness(harness: HarnessName): string {
  const profile = HARNESS_PROFILES.find((h) => h.name === harness);
  return profile?.defaultModel ?? "";
}

/**
 * Get the harness that provides a specific model.
 *
 * @param modelId - The model identifier
 * @returns The harness name or undefined if model not found
 */
export function getHarnessForModel(modelId: string): HarnessName | undefined {
  const model = MODEL_REGISTRY.find((m) => m.id === modelId);
  return model?.harness;
}
