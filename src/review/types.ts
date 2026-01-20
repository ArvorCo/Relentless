/**
 * Shared types and interfaces for the Review module
 *
 * This module defines the core types used by the review runner
 * and all micro-task implementations.
 *
 * @module src/review/types
 */

import { z } from "zod";

/**
 * Priority levels for fix tasks
 * - critical: Security vulnerabilities, data corruption risks
 * - high: TypeScript errors, failing tests
 * - medium: Lint warnings, code quality issues
 * - low: Documentation, style suggestions
 */
export const FixTaskPrioritySchema = z.enum(["critical", "high", "medium", "low"]);
export type FixTaskPriority = z.infer<typeof FixTaskPrioritySchema>;

/**
 * Fix task types corresponding to review micro-tasks
 */
export const FixTaskTypeSchema = z.enum([
  "typecheck_fix",
  "lint_fix",
  "test_fix",
  "security_fix",
  "quality_fix",
  "docs_fix",
]);
export type FixTaskType = z.infer<typeof FixTaskTypeSchema>;

/**
 * A fix task queued from a review micro-task
 *
 * Fix tasks are generated when micro-tasks find issues
 * and are queued to progress.txt for subsequent processing.
 */
export const FixTaskSchema = z.object({
  /** Type of fix task, corresponds to the micro-task that generated it */
  type: FixTaskTypeSchema,
  /** File path relative to project root */
  file: z.string(),
  /** Line number where the issue was found (optional) */
  line: z.number().int().positive().optional(),
  /** Column number (optional) */
  column: z.number().int().positive().optional(),
  /** Human-readable description of the issue and fix needed */
  description: z.string(),
  /** Priority level for ordering fix tasks */
  priority: FixTaskPrioritySchema,
  /** Specific rule or error code (optional, e.g., ESLint rule) */
  rule: z.string().optional(),
  /** Error code (optional, e.g., TS2339) */
  code: z.string().optional(),
});
export type FixTask = z.infer<typeof FixTaskSchema>;

/**
 * Result from running a single micro-task
 */
export const ReviewTaskResultSchema = z.object({
  /** Type of micro-task that was run */
  taskType: z.enum(["typecheck", "lint", "test", "security", "quality", "docs"]),
  /** Whether the task passed (no blocking issues) */
  success: z.boolean(),
  /** Number of errors/issues found */
  errorCount: z.number().int().min(0),
  /** Warning count (non-blocking) */
  warningCount: z.number().int().min(0).optional(),
  /** Fix tasks generated for issues found */
  fixTasks: z.array(FixTaskSchema),
  /** Duration in milliseconds */
  duration: z.number().min(0),
  /** Error message if task threw an exception */
  error: z.string().optional(),
  /** Number of retry attempts used */
  retryAttempts: z.number().int().min(0).optional(),
});
export type ReviewTaskResult = z.infer<typeof ReviewTaskResultSchema>;

/**
 * Summary of the complete review phase
 */
export const ReviewSummarySchema = z.object({
  /** Total number of micro-tasks run */
  tasksRun: z.number().int().min(0),
  /** Number of tasks that passed */
  tasksPassed: z.number().int().min(0),
  /** Number of tasks that failed */
  tasksFailed: z.number().int().min(0),
  /** Total fix tasks generated across all micro-tasks */
  fixTasksGenerated: z.number().int().min(0),
  /** Total duration of review phase in milliseconds */
  totalDuration: z.number().min(0),
  /** Estimated cost before running (based on mode and task count) */
  estimatedCost: z.number().min(0),
  /** Actual cost after running (based on model usage) */
  actualCost: z.number().min(0),
  /** Individual results for each micro-task */
  results: z.array(ReviewTaskResultSchema),
  /** Whether review was stopped early due to stopOnFailure */
  stoppedEarly: z.boolean().optional(),
});
export type ReviewSummary = z.infer<typeof ReviewSummarySchema>;

/**
 * Options for controlling review execution
 */
export const ReviewOptionsSchema = z.object({
  /** Stop on first failure instead of continuing */
  stopOnFailure: z.boolean().default(false),
  /** Mode override (defaults to config.defaultMode) */
  mode: z.enum(["free", "cheap", "good", "genius"]).default("good"),
  /** Micro-tasks to skip */
  skipTasks: z.array(z.enum(["typecheck", "lint", "test", "security", "quality", "docs"])).optional(),
  /** Custom handlers for testing (overrides default implementations) */
  handlers: z.record(z.string(), z.any()).optional(),
  /** Custom logger function */
  logger: z.function().args(z.string()).returns(z.unknown()).optional(),
  /** Callback when model is selected for review */
  onModelSelected: z.function().args(z.string()).returns(z.unknown()).optional(),
});
export type ReviewOptions = z.infer<typeof ReviewOptionsSchema>;

/**
 * Handler function for a micro-task
 *
 * Each micro-task (typecheck, lint, test, etc.) implements this interface.
 * The handler runs in a fresh process/context with no shared state.
 */
export type MicroTaskHandler = () => Promise<ReviewTaskResult>;

/**
 * Registry of micro-task handlers
 */
export type MicroTaskHandlerRegistry = Record<string, MicroTaskHandler>;
