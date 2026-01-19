/**
 * Mode-Model Matrix Router (US-010)
 *
 * Routes tasks to optimal harness/model combinations based on
 * user-selected cost optimization mode and task complexity.
 *
 * Key concepts:
 * - MODE_MODEL_MATRIX: 4 modes x 4 complexity levels = 16 routing rules
 * - routeTask(): Main function that classifies task and determines routing
 * - Token estimation: Formula-based cost prediction
 *
 * @module src/routing/router
 */

import { z } from "zod";
import type { UserStory } from "../prd/types";
import type { AutoModeConfig, Mode, Complexity, HarnessName } from "../config/schema";
import { HarnessNameSchema, ModeSchema, ComplexitySchema } from "../config/schema";
import { classifyTask } from "./classifier";
import { getModelById } from "./registry";

/**
 * A routing rule specifying harness and model for a mode/complexity combination.
 */
export const RoutingRuleSchema = z.object({
  /** Harness to use */
  harness: HarnessNameSchema,
  /** Model ID to use */
  model: z.string(),
});
export type RoutingRule = z.infer<typeof RoutingRuleSchema>;

/**
 * Complete routing decision including complexity, mode, cost, and reasoning.
 */
export const RoutingDecisionSchema = z.object({
  /** Selected harness */
  harness: HarnessNameSchema,
  /** Selected model ID */
  model: z.string(),
  /** Classified task complexity */
  complexity: ComplexitySchema,
  /** Active cost optimization mode */
  mode: ModeSchema,
  /** Estimated cost in USD based on token estimation */
  estimatedCost: z.number(),
  /** Human-readable explanation of routing decision */
  reasoning: z.string(),
});
export type RoutingDecision = z.infer<typeof RoutingDecisionSchema>;

/**
 * Mode-Model Matrix defining routing rules for each mode/complexity combination.
 *
 * 4 modes x 4 complexity levels = 16 routing rules:
 *
 * | Mode   | Simple           | Medium           | Complex          | Expert           |
 * |--------|------------------|------------------|------------------|------------------|
 * | free   | opencode/glm-4.7 | amp/amp-free     | gemini/flash     | opencode/glm-4.7 |
 * | cheap  | claude/haiku     | claude/sonnet    | codex/gpt-5-2-m  | claude/opus      |
 * | good   | claude/sonnet    | claude/sonnet    | claude/opus      | claude/opus      |
 * | genius | claude/opus      | claude/opus      | claude/opus      | claude/opus      |
 */
export const MODE_MODEL_MATRIX: Record<Mode, Record<Complexity, RoutingRule>> = {
  /**
   * Free mode: Use only zero-cost models.
   * Best for learning, experimentation, or tight budgets.
   */
  free: {
    simple: { harness: "opencode", model: "glm-4.7" },
    medium: { harness: "amp", model: "amp-free" },
    complex: { harness: "gemini", model: "gemini-3-flash" },
    expert: { harness: "opencode", model: "glm-4.7" },
  },

  /**
   * Cheap mode: Use low-cost models for most tasks, escalate only for expert tasks.
   * Saves 50-70% vs SOTA pricing.
   */
  cheap: {
    simple: { harness: "claude", model: "haiku-4.5" },
    medium: { harness: "claude", model: "sonnet-4.5" },
    complex: { harness: "codex", model: "gpt-5-2-medium" },
    expert: { harness: "claude", model: "opus-4.5" },
  },

  /**
   * Good mode: Balanced quality/cost with smart routing.
   * Default mode - good for most production work.
   */
  good: {
    simple: { harness: "claude", model: "sonnet-4.5" },
    medium: { harness: "claude", model: "sonnet-4.5" },
    complex: { harness: "claude", model: "opus-4.5" },
    expert: { harness: "claude", model: "opus-4.5" },
  },

  /**
   * Genius mode: Use SOTA models for all tasks.
   * Maximum quality, no cost optimization.
   */
  genius: {
    simple: { harness: "claude", model: "opus-4.5" },
    medium: { harness: "claude", model: "opus-4.5" },
    complex: { harness: "claude", model: "opus-4.5" },
    expert: { harness: "claude", model: "opus-4.5" },
  },
};

/**
 * Estimate the number of tokens needed for a task.
 *
 * Formula: (contentLength / 4) * 1.5
 * - Divide by 4: Average chars per token in English
 * - Multiply by 1.5: Account for agent response (input + output)
 *
 * @param story - The user story to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokens(story: UserStory): number {
  const title = story.title || "";
  const description = story.description || "";
  const criteria = (story.acceptanceCriteria || []).join(" ");

  const contentLength = title.length + description.length + criteria.length;

  // Formula: (content.length / 4) * 1.5
  // 4 chars per token average, 1.5x multiplier for agent response
  return Math.ceil((contentLength / 4) * 1.5);
}

/**
 * Calculate the estimated cost for a task based on model pricing.
 *
 * Cost formula: (inputTokens * inputCost + outputTokens * outputCost) / 1_000_000
 * - Assumes output is ~1.5x input for agent tasks
 * - Costs are per million tokens
 *
 * @param modelId - The model identifier
 * @param estimatedTokens - Estimated input token count
 * @returns Estimated cost in USD
 */
export function calculateCost(modelId: string, estimatedTokens: number): number {
  const model = getModelById(modelId);

  if (!model) {
    return 0;
  }

  // Free tier models have zero cost
  if (model.tier === "free") {
    return 0;
  }

  // Assume output is roughly 1.5x input for agent tasks
  const inputTokens = estimatedTokens;
  const outputTokens = Math.ceil(estimatedTokens * 1.5);

  // Costs are per million tokens
  const inputCost = (inputTokens * model.inputCost) / 1_000_000;
  const outputCost = (outputTokens * model.outputCost) / 1_000_000;

  return inputCost + outputCost;
}

/**
 * Route a task to the optimal harness/model combination.
 *
 * This function:
 * 1. Classifies the task complexity using the hybrid classifier
 * 2. Looks up the routing rule from MODE_MODEL_MATRIX
 * 3. Calculates estimated cost
 * 4. Returns a complete RoutingDecision
 *
 * @param story - The user story to route
 * @param config - Auto mode configuration
 * @param modeOverride - Optional mode to override config.defaultMode
 * @returns RoutingDecision with harness, model, complexity, mode, cost, and reasoning
 */
export async function routeTask(
  story: UserStory,
  config: AutoModeConfig,
  modeOverride?: Mode
): Promise<RoutingDecision> {
  // Determine the active mode
  const mode = modeOverride ?? config.defaultMode;

  // Classify task complexity
  const classification = await classifyTask(story);
  const complexity = classification.complexity;

  // Look up routing rule from matrix
  const rule = MODE_MODEL_MATRIX[mode][complexity];
  const harness = rule.harness;
  const model = rule.model;

  // Calculate estimated cost
  const tokens = estimateTokens(story);
  const estimatedCost = calculateCost(model, tokens);

  // Generate reasoning
  const reasoning = buildReasoning({
    complexity,
    mode,
    harness,
    model,
    classification,
    tokens,
    estimatedCost,
  });

  return {
    harness,
    model,
    complexity,
    mode,
    estimatedCost,
    reasoning,
  };
}

/**
 * Build a human-readable reasoning string for a routing decision.
 */
function buildReasoning(params: {
  complexity: Complexity;
  mode: Mode;
  harness: HarnessName;
  model: string;
  classification: { confidence: number; reasoning: string };
  tokens: number;
  estimatedCost: number;
}): string {
  const {
    complexity,
    mode,
    harness,
    model,
    classification,
    tokens,
    estimatedCost,
  } = params;

  const costStr = estimatedCost === 0 ? "free" : `$${estimatedCost.toFixed(4)}`;

  return (
    `Task classified as ${complexity} (confidence: ${(classification.confidence * 100).toFixed(0)}%). ` +
    `Using ${mode} mode, routing to ${harness}/${model}. ` +
    `Estimated tokens: ${tokens}, cost: ${costStr}.`
  );
}
