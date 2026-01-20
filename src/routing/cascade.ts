/**
 * Cascade/Escalation Logic Module
 *
 * Wraps task execution with automatic retry/escalation logic.
 * When a task fails with a smaller model, it automatically retries
 * with a more capable model from the escalation path.
 *
 * @module src/routing/cascade
 */

import { z } from "zod";
import type { AgentResult } from "../agents/types";
import type { EscalationConfig } from "../config/schema";
import type { UserStory } from "../prd/types";
import { getHarnessForModel } from "./registry";
import { calculateCost, estimateTokens } from "./router";

/**
 * Result of an individual escalation attempt
 */
export const EscalationStepSchema = z.object({
  /** Attempt number (1-based) */
  attempt: z.number().int().min(1),
  /** Harness used for this attempt */
  harness: z.string(),
  /** Model used for this attempt */
  model: z.string(),
  /** Result of the attempt: success, failure, or rate_limited */
  result: z.enum(["success", "failure", "rate_limited"]),
  /** Error message if the attempt failed */
  error: z.string().optional(),
  /** Cost of this attempt */
  cost: z.number().optional(),
  /** Duration in milliseconds */
  duration: z.number().optional(),
});

export type EscalationStep = z.infer<typeof EscalationStepSchema>;

/**
 * Result of the cascade execution
 */
export const EscalationResultSchema = z.object({
  /** Whether the task ultimately succeeded */
  success: z.boolean(),
  /** Final harness that executed the task (or last attempted) */
  finalHarness: z.string(),
  /** Final model that executed the task (or last attempted) */
  finalModel: z.string(),
  /** Total number of attempts made */
  attempts: z.number().int().min(1),
  /** List of all escalation steps */
  escalations: z.array(EscalationStepSchema),
  /** Total actual cost across all attempts */
  actualCost: z.number(),
  /** Whether the task was marked as blocked */
  blocked: z.boolean().optional(),
  /** Reason why the task was blocked */
  blockReason: z.string().optional(),
});

export type EscalationResult = z.infer<typeof EscalationResultSchema>;

/**
 * Function type for executing a task with a specific harness and model
 */
export type TaskExecutor = (
  harness: string,
  model: string,
  prompt: string
) => Promise<AgentResult>;

/**
 * Gets the next model in the escalation path
 *
 * @param currentModel - Current model ID
 * @param escalationPath - Map of current model to next model
 * @returns Next model ID or undefined if no next model exists
 */
export function getNextModel(
  currentModel: string,
  escalationPath: Record<string, string>
): string | undefined {
  return escalationPath[currentModel];
}

/**
 * Determines if a task result indicates failure
 *
 * @param result - Agent execution result
 * @returns Whether the task failed
 */
function isTaskFailure(result: AgentResult): boolean {
  return result.exitCode !== 0 || !result.isComplete;
}

/**
 * Determines the result type from an agent result
 *
 * @param result - Agent execution result
 * @returns Result type string
 */
function getResultType(
  result: AgentResult
): "success" | "failure" | "rate_limited" {
  if (result.rateLimited) {
    return "rate_limited";
  }
  if (isTaskFailure(result)) {
    return "failure";
  }
  return "success";
}

/**
 * Extracts error message from agent result
 *
 * @param result - Agent execution result
 * @returns Error message or undefined
 */
function extractErrorMessage(result: AgentResult): string | undefined {
  if (result.rateLimited) {
    return "Rate limit exceeded";
  }
  if (isTaskFailure(result)) {
    // Extract meaningful error from output
    const lines = result.output.split("\n");
    // Look for lines containing error-like patterns
    const errorLine = lines.find(
      (line) =>
        line.toLowerCase().includes("error") ||
        line.toLowerCase().includes("failed") ||
        line.toLowerCase().includes("exception")
    );
    return errorLine?.trim() || "Task execution failed";
  }
  return undefined;
}

/**
 * Executes a task with automatic cascade/escalation logic
 *
 * When a task fails with the initial model, this function automatically
 * escalates to more capable models according to the escalation path
 * until the task succeeds or max attempts is reached.
 *
 * @param story - User story being executed
 * @param initialHarness - Starting harness
 * @param initialModel - Starting model
 * @param prompt - Task prompt
 * @param config - Escalation configuration
 * @param executor - Function to execute the task
 * @returns Escalation result with success status and all attempts
 *
 * @example
 * ```typescript
 * const result = await executeWithCascade(
 *   story,
 *   "claude",
 *   "haiku-4.5",
 *   "Fix the bug",
 *   config,
 *   async (harness, model, prompt) => {
 *     const agent = getAgent(harness);
 *     return agent.invoke(prompt, { model });
 *   }
 * );
 *
 * if (result.success) {
 *   console.log(`Completed with ${result.finalModel}`);
 * } else if (result.blocked) {
 *   console.log(`Blocked: ${result.blockReason}`);
 * }
 * ```
 */
export async function executeWithCascade(
  story: UserStory,
  initialHarness: string,
  initialModel: string,
  prompt: string,
  config: EscalationConfig,
  executor: TaskExecutor
): Promise<EscalationResult> {
  const escalations: EscalationStep[] = [];
  let totalCost = 0;
  let currentHarness = initialHarness;
  let currentModel = initialModel;
  let attempt = 0;

  // Estimate tokens for cost calculation
  const estimatedTokens = estimateTokens(story);

  while (attempt < config.maxAttempts) {
    attempt++;

    // Execute the task
    const startTime = Date.now();
    const result = await executor(currentHarness, currentModel, prompt);
    const duration = Date.now() - startTime;

    // Calculate cost for this attempt
    const attemptCost = calculateCost(currentModel, estimatedTokens);
    totalCost += attemptCost;

    // Determine result type
    const resultType = getResultType(result);

    // Record the escalation step
    const step: EscalationStep = {
      attempt,
      harness: currentHarness,
      model: currentModel,
      result: resultType,
      cost: attemptCost,
      duration,
    };

    // Add error message if applicable
    if (resultType !== "success") {
      step.error = extractErrorMessage(result);
    }

    escalations.push(step);

    // If successful, return immediately
    if (resultType === "success") {
      return {
        success: true,
        finalHarness: currentHarness,
        finalModel: currentModel,
        attempts: attempt,
        escalations,
        actualCost: totalCost,
      };
    }

    // If escalation is disabled, don't retry
    if (!config.enabled) {
      return {
        success: false,
        finalHarness: currentHarness,
        finalModel: currentModel,
        attempts: attempt,
        escalations,
        actualCost: totalCost,
      };
    }

    // Try to get next model from escalation path
    const nextModel = getNextModel(currentModel, config.escalationPath);

    // If no next model, we're blocked
    if (!nextModel) {
      const reason =
        Object.keys(config.escalationPath).length === 0
          ? "no escalation path configured"
          : `no next model in escalation path for ${currentModel}`;

      // If this is the last attempt, mark as blocked
      if (attempt >= config.maxAttempts) {
        return {
          success: false,
          finalHarness: currentHarness,
          finalModel: currentModel,
          attempts: attempt,
          escalations,
          actualCost: totalCost,
          blocked: true,
          blockReason: `Task blocked: max attempts (${config.maxAttempts}) reached and ${reason}`,
        };
      }

      // Block immediately since no escalation possible
      return {
        success: false,
        finalHarness: currentHarness,
        finalModel: currentModel,
        attempts: attempt,
        escalations,
        actualCost: totalCost,
        blocked: true,
        blockReason: `Task blocked: ${reason}`,
      };
    }

    // Log escalation
    console.log(`Escalating from ${currentModel} to ${nextModel}`);

    // Update model (and possibly harness) for next attempt
    currentModel = nextModel;

    // Check if the next model belongs to a different harness
    const nextHarness = getHarnessForModel(nextModel);
    if (nextHarness) {
      currentHarness = nextHarness;
    }
  }

  // Max attempts reached
  return {
    success: false,
    finalHarness: currentHarness,
    finalModel: currentModel,
    attempts: attempt,
    escalations,
    actualCost: totalCost,
    blocked: true,
    blockReason: `Task blocked: max attempts (${config.maxAttempts}) reached`,
  };
}
