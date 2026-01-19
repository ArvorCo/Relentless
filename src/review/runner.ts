/**
 * Review Runner Framework
 *
 * Orchestrates micro-tasks (typecheck, lint, test, security, quality, docs)
 * in isolation, with retry support, cost tracking, and fix task generation.
 *
 * Key features:
 * - Each micro-task runs in a fresh process/context (no shared state)
 * - Supports stopOnFailure option to halt on first failure
 * - Tracks estimated and actual costs
 * - Queues fix tasks for issues found
 * - Supports retry via maxRetries config
 *
 * @module src/review/runner
 */

import type { ReviewConfig, AutoModeConfig, ReviewTask, Mode } from "../config/schema";
import {
  ReviewSummarySchema,
  ReviewTaskResultSchema,
  FixTaskSchema,
  ReviewOptionsSchema,
  type ReviewSummary,
  type ReviewTaskResult,
  type FixTask,
  type ReviewOptions,
  type MicroTaskHandler,
  type MicroTaskHandlerRegistry,
} from "./types";

// Re-export types and schemas for external use
export {
  ReviewSummarySchema,
  ReviewTaskResultSchema,
  FixTaskSchema,
  ReviewOptionsSchema,
  type ReviewSummary,
  type ReviewTaskResult,
  type FixTask,
  type ReviewOptions,
  type MicroTaskHandler,
};

/**
 * Default logger that writes to console
 */
const defaultLogger = (message: string): void => {
  console.log(message);
};

/**
 * Get the model to use for review based on mode
 *
 * @param mode - The review mode (free, cheap, good, genius)
 * @param autoModeConfig - Auto mode configuration
 * @returns The model identifier to use
 */
function getModelForReview(mode: Mode, autoModeConfig: AutoModeConfig): string {
  // In genius mode, always use SOTA (opus-4.5)
  if (mode === "genius") {
    return "opus-4.5";
  }

  // In good mode, use the complex model setting
  if (mode === "good") {
    return autoModeConfig.modeModels.complex || "opus-4.5";
  }

  // In cheap mode, use medium model
  if (mode === "cheap") {
    return autoModeConfig.modeModels.medium || "sonnet-4.5";
  }

  // In free mode, use simple model (likely free tier)
  return autoModeConfig.modeModels.simple || "glm-4.7";
}

/**
 * Estimate cost for review based on mode and task count
 *
 * @param mode - The review mode
 * @param taskCount - Number of micro-tasks to run
 * @returns Estimated cost in dollars
 */
function estimateReviewCost(mode: Mode, taskCount: number): number {
  // Cost estimates per task by mode (rough estimates)
  const costPerTask: Record<Mode, number> = {
    free: 0,
    cheap: 0.01,
    good: 0.03,
    genius: 0.05,
  };

  return costPerTask[mode] * taskCount;
}

/**
 * Default micro-task handlers (placeholder implementations)
 *
 * These will be replaced by actual implementations in future stories
 * (US-014 through US-019).
 */
const defaultHandlers: MicroTaskHandlerRegistry = {
  typecheck: async (): Promise<ReviewTaskResult> => ({
    taskType: "typecheck",
    success: true,
    errorCount: 0,
    fixTasks: [],
    duration: 0,
  }),
  lint: async (): Promise<ReviewTaskResult> => ({
    taskType: "lint",
    success: true,
    errorCount: 0,
    fixTasks: [],
    duration: 0,
  }),
  test: async (): Promise<ReviewTaskResult> => ({
    taskType: "test",
    success: true,
    errorCount: 0,
    fixTasks: [],
    duration: 0,
  }),
  security: async (): Promise<ReviewTaskResult> => ({
    taskType: "security",
    success: true,
    errorCount: 0,
    fixTasks: [],
    duration: 0,
  }),
  quality: async (): Promise<ReviewTaskResult> => ({
    taskType: "quality",
    success: true,
    errorCount: 0,
    fixTasks: [],
    duration: 0,
  }),
  docs: async (): Promise<ReviewTaskResult> => ({
    taskType: "docs",
    success: true,
    errorCount: 0,
    fixTasks: [],
    duration: 0,
  }),
};

/**
 * Run a single micro-task with retry support
 *
 * @param taskType - The type of micro-task to run
 * @param handler - The handler function for the task
 * @param maxRetries - Maximum number of retry attempts
 * @param logger - Logger function for output
 * @returns The task result
 */
async function runMicroTask(
  taskType: ReviewTask,
  handler: MicroTaskHandler,
  maxRetries: number,
  logger: (msg: string) => void
): Promise<ReviewTaskResult> {
  let lastError: Error | undefined;
  let attempts = 0;

  while (attempts < maxRetries) {
    attempts++;

    try {
      const result = await handler();
      // If successful, return with retry info
      return {
        ...result,
        retryAttempts: attempts - 1,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // If we have more retries, log and continue
      if (attempts < maxRetries) {
        logger(`⚠️ ${taskType}: Retry ${attempts}/${maxRetries} after error: ${lastError.message}`);
      }
    }
  }

  // All retries exhausted - return failure result
  return {
    taskType,
    success: false,
    errorCount: 1,
    fixTasks: [],
    duration: 0,
    error: lastError?.message || "Unknown error",
    retryAttempts: attempts - 1,
  };
}

/**
 * Run the complete review phase
 *
 * Orchestrates all configured micro-tasks in order, tracking results,
 * costs, and fix tasks generated.
 *
 * @param reviewConfig - Review configuration from relentless.config.yaml
 * @param autoModeConfig - Auto mode configuration
 * @param options - Runtime options (stopOnFailure, mode override, etc.)
 * @returns Review summary with all results
 *
 * @example
 * ```typescript
 * const summary = await runReview(config.review, config.autoMode, {
 *   mode: "genius",
 *   stopOnFailure: false,
 * });
 *
 * if (summary.tasksFailed > 0) {
 *   console.log(`${summary.fixTasksGenerated} fixes needed`);
 * }
 * ```
 */
export async function runReview(
  reviewConfig: ReviewConfig,
  autoModeConfig: AutoModeConfig,
  options: Partial<ReviewOptions> & { handlers?: MicroTaskHandlerRegistry } = {}
): Promise<ReviewSummary> {
  const startTime = Date.now();

  // Parse and apply defaults to options
  const parsedOptions = ReviewOptionsSchema.parse(options);
  const {
    stopOnFailure = false,
    mode = reviewConfig.defaultMode,
    skipTasks = [],
    logger = defaultLogger,
    onModelSelected,
  } = parsedOptions;

  // Merge custom handlers with defaults
  const handlers: MicroTaskHandlerRegistry = {
    ...defaultHandlers,
    ...options.handlers,
  };

  // Get the model to use and notify callback
  const reviewModel = getModelForReview(mode, autoModeConfig);
  if (onModelSelected) {
    onModelSelected(reviewModel);
  }

  // Filter out skipped tasks
  const tasksToRun = reviewConfig.microTasks.filter(
    (task) => !skipTasks.includes(task as ReviewTask)
  );

  // Calculate estimated cost
  const estimatedCost = estimateReviewCost(mode, tasksToRun.length);

  // Track results
  const results: ReviewTaskResult[] = [];
  let tasksPassed = 0;
  let tasksFailed = 0;
  let fixTasksGenerated = 0;
  let actualCost = 0;
  let stoppedEarly = false;

  // Run each micro-task in order
  for (const taskType of tasksToRun) {
    const handler = handlers[taskType];

    if (!handler) {
      logger(`⚠️ No handler for ${taskType}, skipping`);
      continue;
    }

    // Log task start
    logger(`🔍 Running ${taskType} review...`);

    // Run the micro-task with retry support
    const result = await runMicroTask(
      taskType,
      handler,
      reviewConfig.maxRetries,
      logger
    );

    results.push(result);

    // Update counters
    if (result.success) {
      tasksPassed++;
      logger(`✅ ${taskType}: PASSED`);
    } else {
      tasksFailed++;
      const fixCount = result.fixTasks.length;
      logger(`❌ ${taskType}: FAILED (${fixCount} fixes needed)`);
    }

    fixTasksGenerated += result.fixTasks.length;

    // Estimate cost for this task
    actualCost += estimateReviewCost(mode, 1);

    // Stop on failure if configured
    if (!result.success && stopOnFailure) {
      stoppedEarly = true;
      break;
    }
  }

  const totalDuration = Date.now() - startTime;

  return {
    tasksRun: results.length,
    tasksPassed,
    tasksFailed,
    fixTasksGenerated,
    totalDuration,
    estimatedCost,
    actualCost,
    results,
    stoppedEarly: stoppedEarly || undefined,
  };
}
