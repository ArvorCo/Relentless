/**
 * Cost Estimation Module
 *
 * Provides functions to estimate execution costs before running a feature,
 * compare costs across modes, and display formatted cost breakdowns.
 *
 * @module src/routing/estimate
 */

import { z } from "zod";
import type { Mode, AutoModeConfig, HarnessName, Complexity } from "../config/schema";
import type { UserStory, PRD } from "../prd/types";
import { routeTask, estimateTokens, calculateCost } from "./router";

/**
 * Escalation buffer percentage (10-15%) added to base cost to account
 * for potential model escalations during execution.
 */
export const ESCALATION_BUFFER_PERCENT = 0.12; // 12% buffer (middle of 10-15% range)

/**
 * Schema for a single story's cost estimate
 */
export const StoryEstimateSchema = z.object({
  storyId: z.string(),
  title: z.string(),
  complexity: z.enum(["simple", "medium", "complex", "expert"]),
  harness: z.enum(["claude", "codex", "droid", "opencode", "amp", "gemini"]),
  model: z.string(),
  estimatedCost: z.number(),
  estimatedTokens: z.number(),
  displayString: z.string(),
});

export type StoryEstimate = z.infer<typeof StoryEstimateSchema>;

/**
 * Schema for a complete feature cost estimate
 */
export const FeatureCostEstimateSchema = z.object({
  mode: z.enum(["free", "cheap", "good", "genius"]),
  totalEstimatedCost: z.number(),
  baseEstimatedCost: z.number(),
  baselineCost: z.number(),
  savingsPercent: z.number(),
  storyEstimates: z.array(StoryEstimateSchema),
});

export type FeatureCostEstimate = z.infer<typeof FeatureCostEstimateSchema>;

/**
 * Schema for mode comparison result
 */
export const ModeComparisonSchema = z.object({
  mode: z.enum(["free", "cheap", "good", "genius"]),
  totalCost: z.number(),
  savingsPercent: z.number(),
  description: z.string(),
});

export type ModeComparison = z.infer<typeof ModeComparisonSchema>;

/**
 * Estimate the cost for a single user story
 *
 * @param story - The user story to estimate
 * @param config - Auto mode configuration
 * @param mode - The cost optimization mode to use
 * @returns Estimate with complexity, harness, model, cost, and display string
 */
export async function estimateStoryCost(
  story: UserStory,
  config: AutoModeConfig,
  mode: Mode
): Promise<StoryEstimate> {
  // Use routeTask for complexity classification and model selection
  const routing = await routeTask(story, config, mode);

  // Calculate estimated tokens
  const tokens = estimateTokens(story);

  // Calculate cost using the selected model
  const cost = calculateCost(routing.model, tokens);

  // Format the display string
  // Format: "US-001: medium complexity -> claude/sonnet-4.5 (~$0.15)"
  const displayString = `${story.id}: ${routing.complexity} complexity -> ${routing.harness}/${routing.model} (~$${cost.toFixed(2)})`;

  return {
    storyId: story.id,
    title: story.title,
    complexity: routing.complexity as Complexity,
    harness: routing.harness as HarnessName,
    model: routing.model,
    estimatedCost: cost,
    estimatedTokens: tokens,
    displayString,
  };
}

/**
 * Estimate the total cost for all incomplete stories in a feature
 *
 * @param prd - The PRD containing user stories
 * @param config - Auto mode configuration
 * @param mode - The cost optimization mode to use
 * @returns Complete feature cost estimate with breakdown
 */
export async function estimateFeatureCost(
  prd: PRD,
  config: AutoModeConfig,
  mode: Mode
): Promise<FeatureCostEstimate> {
  // Filter to only incomplete stories
  const incompleteStories = prd.userStories.filter((story) => !story.passes);

  // Estimate each story
  const storyEstimates: StoryEstimate[] = [];
  for (const story of incompleteStories) {
    const estimate = await estimateStoryCost(story, config, mode);
    storyEstimates.push(estimate);
  }

  // Calculate base estimated cost (sum of all story costs)
  const baseEstimatedCost = storyEstimates.reduce((sum, est) => sum + est.estimatedCost, 0);

  // Add escalation buffer (10-15%)
  const totalEstimatedCost = baseEstimatedCost * (1 + ESCALATION_BUFFER_PERCENT);

  // Calculate baseline cost using genius mode (SOTA pricing)
  let baselineCost = 0;
  for (const story of incompleteStories) {
    const geniusEstimate = await estimateStoryCost(story, config, "genius");
    baselineCost += geniusEstimate.estimatedCost;
  }
  // Also add escalation buffer to baseline for fair comparison
  baselineCost = baselineCost * (1 + ESCALATION_BUFFER_PERCENT);

  // Calculate savings percentage
  let savingsPercent = 0;
  if (baselineCost > 0) {
    savingsPercent = Math.round(((baselineCost - totalEstimatedCost) / baselineCost) * 100);
  }
  // Genius mode has 0% savings (it IS the baseline)
  if (mode === "genius") {
    savingsPercent = 0;
  }

  return {
    mode,
    totalEstimatedCost,
    baseEstimatedCost,
    baselineCost,
    savingsPercent,
    storyEstimates,
  };
}

/**
 * Format a cost estimate for display
 *
 * @param estimate - The feature cost estimate
 * @returns Formatted string like "Estimated cost: $2.50 (vs $8.75 without Auto Mode - 71% savings)"
 */
export function formatCostEstimate(estimate: FeatureCostEstimate): string {
  const totalFormatted = `$${estimate.totalEstimatedCost.toFixed(2)}`;
  const baselineFormatted = `$${estimate.baselineCost.toFixed(2)}`;

  if (estimate.savingsPercent > 0) {
    return `Estimated cost: ${totalFormatted} (vs ${baselineFormatted} without Auto Mode - ${estimate.savingsPercent}% savings)`;
  } else if (estimate.totalEstimatedCost === 0) {
    return `Estimated cost: ${totalFormatted} (vs ${baselineFormatted} without Auto Mode - ${estimate.savingsPercent}% savings)`;
  } else {
    return `Estimated cost: ${totalFormatted} (using SOTA models)`;
  }
}

/**
 * Format a cost breakdown table showing per-story estimates
 *
 * @param estimates - Array of story estimates
 * @returns Formatted multi-line string showing breakdown
 */
export function formatCostBreakdown(estimates: StoryEstimate[]): string {
  const lines: string[] = [];
  lines.push("Cost Breakdown by Story:");
  lines.push("─".repeat(60));

  for (const est of estimates) {
    lines.push(est.displayString);
  }

  lines.push("─".repeat(60));

  return lines.join("\n");
}

/**
 * Compare costs across all modes for a feature
 *
 * @param prd - The PRD containing user stories
 * @param config - Auto mode configuration
 * @returns Array of mode comparisons with costs and savings
 */
export async function compareModes(prd: PRD, config: AutoModeConfig): Promise<ModeComparison[]> {
  const modes: Mode[] = ["free", "cheap", "good", "genius"];
  const comparisons: ModeComparison[] = [];

  // Calculate genius baseline first
  const geniusEstimate = await estimateFeatureCost(prd, config, "genius");
  const baselineCost = geniusEstimate.totalEstimatedCost;

  for (const mode of modes) {
    const estimate = await estimateFeatureCost(prd, config, mode);

    let savingsPercent = 0;
    if (baselineCost > 0 && mode !== "genius") {
      savingsPercent = Math.round(((baselineCost - estimate.totalEstimatedCost) / baselineCost) * 100);
    }

    const description = getModeDescription(mode);

    comparisons.push({
      mode,
      totalCost: estimate.totalEstimatedCost,
      savingsPercent,
      description,
    });
  }

  return comparisons;
}

/**
 * Get a human-readable description for a mode
 */
function getModeDescription(mode: Mode): string {
  switch (mode) {
    case "free":
      return "Free tier models - $0 cost, may be less thorough";
    case "cheap":
      return "Low-cost models - balanced cost/quality";
    case "good":
      return "Balanced models - recommended for most tasks";
    case "genius":
      return "SOTA models - highest quality, highest cost";
  }
}

/**
 * Format mode comparison for display
 *
 * @param comparisons - Array of mode comparisons
 * @returns Formatted multi-line string showing all modes
 */
export function formatModeComparison(comparisons: ModeComparison[]): string {
  const lines: string[] = [];
  lines.push("Mode Comparison:");
  lines.push("─".repeat(60));

  for (const comp of comparisons) {
    const costStr = `$${comp.totalCost.toFixed(2)}`.padStart(8);
    const savingsStr = comp.savingsPercent > 0 ? `${comp.savingsPercent}% savings` : "baseline";
    lines.push(`  ${comp.mode.padEnd(8)} ${costStr}  (${savingsStr})`);
  }

  lines.push("─".repeat(60));

  return lines.join("\n");
}
