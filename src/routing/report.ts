/**
 * @fileoverview Cost Reporting Module (US-025)
 *
 * Provides functionality to track, analyze, and report actual execution costs
 * after feature completion. Includes savings calculations, escalation tracking,
 * model utilization statistics, and comparison with estimates.
 *
 * @example
 * ```typescript
 * import { generateCostReport, formatCostReport, saveCostReport } from "./report";
 *
 * const report = generateCostReport("my-feature", "good", executions, startTime, endTime);
 * console.log(formatCostReport(report));
 * await saveCostReport(report, "./progress.txt");
 * ```
 */

import { z } from "zod";
import { ModeSchema, ComplexitySchema, HarnessNameSchema } from "../config/schema";
import type { Mode, HarnessName } from "../config/schema";
import type { RoutingDecision } from "./router";
import type { EscalationResult } from "./cascade";

/**
 * Represents a single escalation event within a story execution
 */
export const EscalationEventSchema = z.object({
  /** Model that failed */
  fromModel: z.string(),
  /** Model escalated to */
  toModel: z.string(),
  /** Reason for escalation */
  reason: z.string(),
  /** Additional cost incurred from this escalation */
  additionalCost: z.number().nonnegative(),
});

export type EscalationEvent = z.infer<typeof EscalationEventSchema>;

/**
 * Tracks the execution details and costs for a single story
 */
export const StoryExecutionSchema = z.object({
  /** Story identifier (e.g., "US-001") */
  storyId: z.string(),
  /** Story title */
  title: z.string(),
  /** Classified complexity level */
  complexity: ComplexitySchema,
  /** Initial harness assigned */
  initialHarness: HarnessNameSchema,
  /** Initial model assigned */
  initialModel: z.string(),
  /** Final harness after any escalations */
  finalHarness: HarnessNameSchema,
  /** Final model after any escalations */
  finalModel: z.string(),
  /** Estimated cost before execution */
  estimatedCost: z.number().nonnegative(),
  /** Actual cost after execution */
  actualCost: z.number().nonnegative(),
  /** Input tokens used */
  inputTokens: z.number().int().nonnegative(),
  /** Output tokens used */
  outputTokens: z.number().int().nonnegative(),
  /** Whether escalation occurred */
  escalated: z.boolean(),
  /** Escalation events if any */
  escalations: z.array(EscalationEventSchema),
  /** Execution duration in milliseconds */
  duration: z.number().nonnegative(),
  /** Whether execution was successful */
  success: z.boolean(),
});

export type StoryExecution = z.infer<typeof StoryExecutionSchema>;

/**
 * Model tier utilization percentages
 */
export const ModelUtilizationSchema = z.object({
  /** Percentage of stories using free tier models */
  free: z.number().min(0).max(100),
  /** Percentage of stories using cheap tier models */
  cheap: z.number().min(0).max(100),
  /** Percentage of stories using standard tier models */
  standard: z.number().min(0).max(100),
  /** Percentage of stories using premium tier models */
  premium: z.number().min(0).max(100),
  /** Percentage of stories using SOTA tier models */
  sota: z.number().min(0).max(100),
});

export type ModelUtilization = z.infer<typeof ModelUtilizationSchema>;

/**
 * Cost comparison between estimated and actual
 */
export const CostComparisonSchema = z.object({
  /** Estimated cost */
  estimated: z.number().nonnegative(),
  /** Actual cost */
  actual: z.number().nonnegative(),
  /** Difference (actual - estimated) */
  difference: z.number(),
  /** Difference as percentage of estimated */
  differencePercent: z.number(),
  /** Whether actual exceeded estimate */
  overBudget: z.boolean(),
});

export type CostComparison = z.infer<typeof CostComparisonSchema>;

/**
 * Complete cost report for a feature execution
 */
export const FeatureCostReportSchema = z.object({
  /** Feature name */
  featureName: z.string(),
  /** Execution mode used */
  mode: ModeSchema,
  /** Execution start timestamp (ISO string) */
  startTime: z.string(),
  /** Execution end timestamp (ISO string) */
  endTime: z.string(),
  /** Individual story execution records */
  storyExecutions: z.array(StoryExecutionSchema),
  /** Total estimated cost */
  totalEstimatedCost: z.number().nonnegative(),
  /** Total actual cost */
  totalActualCost: z.number().nonnegative(),
  /** Baseline cost (using SOTA for all stories) */
  baselineCost: z.number().nonnegative(),
  /** Savings percentage vs baseline */
  savingsPercent: z.number(),
  /** Estimate accuracy percentage */
  estimateAccuracy: z.number(),
  /** Total input tokens across all stories */
  totalInputTokens: z.number().int().nonnegative(),
  /** Total output tokens across all stories */
  totalOutputTokens: z.number().int().nonnegative(),
  /** Number of stories that required escalation */
  escalationCount: z.number().int().nonnegative(),
  /** Escalation overhead as percentage of total cost */
  escalationOverheadPercent: z.number(),
  /** Model tier utilization breakdown */
  modelUtilization: ModelUtilizationSchema,
});

export type FeatureCostReport = z.infer<typeof FeatureCostReportSchema>;

/**
 * Historical cost entry parsed from progress.txt
 */
export interface HistoricalCostEntry {
  timestamp: string;
  mode: Mode;
  actualCost: number;
  savingsPercent: number;
}

/**
 * File system interface for dependency injection in tests
 */
export interface FileSystemInterface {
  writeFile: (path: string, content: string) => Promise<void>;
  readFile: (path: string) => Promise<string>;
}

/** Opus 4.5 pricing per MTok (SOTA baseline) */
const OPUS_INPUT_COST_PER_MTOK = 15;
const OPUS_OUTPUT_COST_PER_MTOK = 75;

/**
 * Map model IDs to their tier for utilization tracking
 */
const MODEL_TIER_MAP: Record<string, keyof ModelUtilization> = {
  // Free tier
  "glm-4.7": "free",
  "grok-code-fast-1": "free",
  "minimax-m2.1": "free",
  "amp-free": "free",
  "glm-4.6": "free",
  "gemini-2-flash": "free",
  // Cheap tier
  "haiku-4.5": "cheap",
  "gpt-5-2-low": "cheap",
  // Standard tier
  "sonnet-4.5": "standard",
  "gpt-5-2-medium": "standard",
  "claude-3-5-sonnet": "standard",
  "gpt-4o": "standard",
  // Premium tier
  "gpt-5-2-high": "premium",
  "gemini-3-pro": "premium",
  "gemini-3-flash": "premium",
  // SOTA tier
  "opus-4.5": "sota",
  "amp-smart": "sota",
};

/**
 * Creates a story execution record from routing decision and escalation result
 *
 * @param story - The story being executed
 * @param routingDecision - The routing decision from the router
 * @param escalationResult - The result from executeWithCascade
 * @param tokens - Token counts from execution
 * @param duration - Execution duration in milliseconds
 * @returns A complete story execution record
 */
export function createStoryExecution(
  story: { id: string; title: string },
  routingDecision: RoutingDecision,
  escalationResult: EscalationResult,
  tokens: { input: number; output: number },
  duration: number
): StoryExecution {
  // Build escalation events from escalation steps
  const escalations: EscalationEvent[] = [];

  // Track escalations from the escalation result
  if (escalationResult.escalations && escalationResult.escalations.length > 1) {
    for (let i = 0; i < escalationResult.escalations.length - 1; i++) {
      const current = escalationResult.escalations[i]!;
      const next = escalationResult.escalations[i + 1]!;
      if (current.result === "failure") {
        escalations.push({
          fromModel: current.model,
          toModel: next.model,
          reason: current.error || "Task failed",
          additionalCost: next.cost ?? 0,
        });
      }
    }
  }

  const escalated = escalationResult.finalModel !== routingDecision.model;

  return {
    storyId: story.id,
    title: story.title,
    complexity: routingDecision.complexity,
    initialHarness: routingDecision.harness,
    initialModel: routingDecision.model,
    finalHarness: (escalationResult.finalHarness as HarnessName) ?? routingDecision.harness,
    finalModel: escalationResult.finalModel ?? routingDecision.model,
    estimatedCost: routingDecision.estimatedCost,
    actualCost: escalationResult.actualCost ?? 0,
    inputTokens: tokens.input,
    outputTokens: tokens.output,
    escalated,
    escalations,
    duration,
    success: escalationResult.success,
  };
}

/**
 * Calculates the baseline cost using SOTA (Opus 4.5) pricing
 *
 * @param inputTokens - Total input tokens
 * @param outputTokens - Total output tokens
 * @returns Baseline cost in dollars
 */
export function getBaselineCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * OPUS_INPUT_COST_PER_MTOK;
  const outputCost = (outputTokens / 1_000_000) * OPUS_OUTPUT_COST_PER_MTOK;
  return inputCost + outputCost;
}

/**
 * Calculates model tier utilization percentages
 *
 * @param executions - Array of story executions
 * @returns Model utilization breakdown
 */
export function calculateModelUtilization(executions: StoryExecution[]): ModelUtilization {
  if (executions.length === 0) {
    return { free: 0, cheap: 0, standard: 0, premium: 0, sota: 0 };
  }

  const tierCounts: Record<keyof ModelUtilization, number> = {
    free: 0,
    cheap: 0,
    standard: 0,
    premium: 0,
    sota: 0,
  };

  for (const execution of executions) {
    const tier = MODEL_TIER_MAP[execution.finalModel] ?? "standard";
    tierCounts[tier]++;
  }

  const total = executions.length;
  return {
    free: (tierCounts.free / total) * 100,
    cheap: (tierCounts.cheap / total) * 100,
    standard: (tierCounts.standard / total) * 100,
    premium: (tierCounts.premium / total) * 100,
    sota: (tierCounts.sota / total) * 100,
  };
}

/**
 * Calculates the escalation overhead as a percentage of total cost
 *
 * @param executions - Array of story executions
 * @returns Escalation overhead percentage
 */
export function calculateEscalationOverhead(executions: StoryExecution[]): number {
  let totalCost = 0;
  let escalationCost = 0;

  for (const execution of executions) {
    totalCost += execution.actualCost;
    if (execution.escalated) {
      // Escalation cost is the difference between actual and estimated
      const overhead = execution.actualCost - execution.estimatedCost;
      if (overhead > 0) {
        escalationCost += overhead;
      }
    }
  }

  if (totalCost === 0) return 0;
  return (escalationCost / totalCost) * 100;
}

/**
 * Generates a complete cost report from story executions
 *
 * @param featureName - Name of the feature
 * @param mode - Execution mode used
 * @param executions - Array of story executions
 * @param startTime - Execution start timestamp
 * @param endTime - Execution end timestamp
 * @returns Complete feature cost report
 */
export function generateCostReport(
  featureName: string,
  mode: Mode,
  executions: StoryExecution[],
  startTime: string,
  endTime: string
): FeatureCostReport {
  // Calculate totals
  const totalEstimatedCost = executions.reduce((sum, e) => sum + e.estimatedCost, 0);
  const totalActualCost = executions.reduce((sum, e) => sum + e.actualCost, 0);
  const totalInputTokens = executions.reduce((sum, e) => sum + e.inputTokens, 0);
  const totalOutputTokens = executions.reduce((sum, e) => sum + e.outputTokens, 0);
  const escalationCount = executions.filter((e) => e.escalated).length;

  // Calculate baseline (SOTA) cost
  const baselineCost = getBaselineCost(totalInputTokens, totalOutputTokens);

  // Calculate savings
  const savingsPercent = baselineCost > 0
    ? ((baselineCost - totalActualCost) / baselineCost) * 100
    : 0;

  // Calculate estimate accuracy
  // Accuracy = 100 - (|actual - estimated| / estimated * 100)
  const estimateAccuracy = totalEstimatedCost > 0
    ? 100 - (Math.abs(totalActualCost - totalEstimatedCost) / totalEstimatedCost) * 100
    : 100;

  return {
    featureName,
    mode,
    startTime,
    endTime,
    storyExecutions: executions,
    totalEstimatedCost,
    totalActualCost,
    baselineCost,
    savingsPercent,
    estimateAccuracy,
    totalInputTokens,
    totalOutputTokens,
    escalationCount,
    escalationOverheadPercent: calculateEscalationOverhead(executions),
    modelUtilization: calculateModelUtilization(executions),
  };
}

/**
 * Formats a single story execution line
 *
 * @param execution - Story execution to format
 * @returns Formatted line string
 */
export function formatStoryLine(execution: StoryExecution): string {
  const modelInfo = execution.escalated
    ? `${execution.initialModel} -> ${execution.finalModel}`
    : execution.finalModel;

  return `${execution.storyId}: ${execution.complexity} complexity -> ${execution.finalHarness}/${modelInfo} ($${execution.actualCost.toFixed(2)})`;
}

/**
 * Formats escalation details for a story
 *
 * @param execution - Story execution with escalation
 * @returns Formatted escalation line
 */
export function formatEscalationLine(execution: StoryExecution): string {
  if (!execution.escalated || execution.escalations.length === 0) {
    return "";
  }

  const escalation = execution.escalations[0]!;
  return `${execution.storyId}: escalated ${escalation.fromModel} -> ${escalation.toModel} (+$${escalation.additionalCost.toFixed(2)})`;
}

/**
 * Formats the estimated vs actual comparison line
 *
 * @param estimated - Estimated cost
 * @param actual - Actual cost
 * @returns Formatted comparison line
 */
export function formatComparisonLine(estimated: number, actual: number): string {
  const difference = actual - estimated;
  const percentDiff = estimated > 0 ? (difference / estimated) * 100 : 0;
  const sign = difference >= 0 ? "+" : "";
  return `Estimated: $${estimated.toFixed(2)}, Actual: $${actual.toFixed(2)} (${sign}${Math.round(percentDiff)}%)`;
}

/**
 * Formats model utilization statistics
 *
 * @param utilization - Model utilization percentages
 * @returns Formatted utilization string
 */
export function formatUtilizationStats(utilization: ModelUtilization): string {
  const parts: string[] = [];

  if (utilization.free > 0) {
    parts.push(`Free models: ${Math.round(utilization.free)}%`);
  }
  if (utilization.cheap > 0) {
    parts.push(`Cheap: ${Math.round(utilization.cheap)}%`);
  }
  if (utilization.standard > 0) {
    parts.push(`Standard: ${Math.round(utilization.standard)}%`);
  }
  if (utilization.premium > 0) {
    parts.push(`Premium: ${Math.round(utilization.premium)}%`);
  }
  if (utilization.sota > 0) {
    parts.push(`SOTA: ${Math.round(utilization.sota)}%`);
  }

  return parts.join(", ") || "No model usage recorded";
}

/**
 * Formats a complete cost report for display
 *
 * @param report - Feature cost report to format
 * @returns Formatted multi-line report string
 */
export function formatCostReport(report: FeatureCostReport): string {
  const lines: string[] = [];

  // Header
  lines.push(`## Cost Report - ${report.endTime}`);
  lines.push(`Feature: ${report.featureName}`);
  lines.push(`Mode: ${report.mode}`);
  lines.push("");

  // Summary
  lines.push(`Actual cost: $${report.totalActualCost.toFixed(2)} (saved ${Math.round(report.savingsPercent)}% vs single-model execution)`);
  lines.push(formatComparisonLine(report.totalEstimatedCost, report.totalActualCost));
  lines.push("");

  // Tokens
  lines.push(`Total tokens: ${report.totalInputTokens.toLocaleString()} input, ${report.totalOutputTokens.toLocaleString()} output`);
  lines.push("");

  // Per-story breakdown
  lines.push("### Per-Story Breakdown");
  for (const execution of report.storyExecutions) {
    lines.push(formatStoryLine(execution));
  }
  lines.push("");

  // Escalations
  if (report.escalationCount > 0) {
    lines.push("### Escalations");
    for (const execution of report.storyExecutions) {
      if (execution.escalated) {
        lines.push(formatEscalationLine(execution));
      }
    }
    lines.push(`Escalation overhead: ${report.escalationOverheadPercent.toFixed(1)}%`);
    lines.push("");
  }

  // Model utilization
  lines.push("### Model utilization");
  lines.push(formatUtilizationStats(report.modelUtilization));

  return lines.join("\n");
}

/**
 * Saves a cost report to progress.txt, appending to existing content
 *
 * @param report - Feature cost report to save
 * @param progressPath - Path to progress.txt
 * @param fs - File system interface (for testing)
 */
export async function saveCostReport(
  report: FeatureCostReport,
  progressPath: string,
  fs?: FileSystemInterface
): Promise<void> {
  const fileSystem = fs ?? {
    writeFile: async (path: string, content: string) => {
      await Bun.write(path, content);
    },
    readFile: async (path: string) => {
      const file = Bun.file(path);
      return await file.text();
    },
  };

  // Read existing content
  let existingContent = "";
  try {
    existingContent = await fileSystem.readFile(progressPath);
  } catch {
    // File doesn't exist, start fresh
    existingContent = "";
  }

  // Format and append the report
  const formattedReport = formatCostReport(report);
  const separator = "\n---\n\n";
  const newContent = existingContent + separator + formattedReport + "\n";

  await fileSystem.writeFile(progressPath, newContent);
}

/**
 * Loads historical cost entries from progress.txt
 *
 * @param progressPath - Path to progress.txt
 * @param fs - File system interface (for testing)
 * @returns Array of historical cost entries
 */
export async function loadHistoricalCosts(
  progressPath: string,
  fs?: FileSystemInterface
): Promise<HistoricalCostEntry[]> {
  const fileSystem = fs ?? {
    writeFile: async (path: string, content: string) => {
      await Bun.write(path, content);
    },
    readFile: async (path: string) => {
      const file = Bun.file(path);
      return await file.text();
    },
  };

  let content: string;
  try {
    content = await fileSystem.readFile(progressPath);
  } catch {
    return [];
  }

  const entries: HistoricalCostEntry[] = [];

  // Pattern to match cost report sections
  const reportPattern = /## Cost Report - (\S+)\nFeature: .+\nMode: (\w+)[\s\S]*?Actual cost: \$([0-9.]+) \(saved (\d+)%/g;

  let match: RegExpExecArray | null;
  while ((match = reportPattern.exec(content)) !== null) {
    entries.push({
      timestamp: match[1]!,
      mode: match[2] as Mode,
      actualCost: parseFloat(match[3]!),
      savingsPercent: parseInt(match[4]!, 10),
    });
  }

  return entries;
}
