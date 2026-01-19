/**
 * Review Prompt Module
 *
 * Handles interactive prompts for final review before feature completion.
 * Supports non-interactive mode for CI/CD environments.
 *
 * Features:
 * - Interactive prompts for review confirmation and mode selection
 * - --skip-review flag to bypass review entirely
 * - --review-mode flag to pre-select review mode
 * - Non-interactive mode for CI/CD environments
 * - Mode-specific messages (cost warnings, thoroughness notes)
 * - Graceful cancellation handling
 *
 * @module src/review/prompt
 */

import type { Mode } from "../config/schema";
import type { ReviewSummary } from "./types";

/**
 * Valid mode values for review
 */
const VALID_MODES: Mode[] = ["free", "cheap", "good", "genius"];

/**
 * Default mode when none specified
 */
const DEFAULT_MODE: Mode = "good";

/**
 * Options for the review prompt
 */
export interface ReviewPromptOptions {
  /** Skip the review entirely */
  skipReview?: boolean;
  /** Pre-selected review mode */
  reviewMode?: Mode;
  /** Non-interactive mode (CI/CD) */
  nonInteractive?: boolean;
  /** Custom input reader for testing */
  readInput?: () => Promise<string>;
  /** Custom logger */
  logger?: (message: string) => void;
  /** Review runner function */
  runReview?: (mode: Mode) => Promise<ReviewSummary>;
  /** Cost estimator function */
  estimateCost?: (mode: Mode) => number;
}

/**
 * Result of the review prompt
 */
export interface ReviewPromptResult {
  /** Whether review was run */
  reviewRan: boolean;
  /** Whether review was skipped */
  skipped: boolean;
  /** The mode used for review (if ran) */
  mode?: Mode;
  /** Whether the user cancelled */
  cancelled: boolean;
  /** Review summary (if ran) */
  summary?: ReviewSummary;
  /** Summary message for display */
  summaryMessage: string;
}

/**
 * Check if a string is a valid mode
 *
 * @param mode - The mode string to validate
 * @returns True if the mode is valid
 *
 * @example
 * ```typescript
 * isValidMode("good");   // true
 * isValidMode("fast");   // false
 * isValidMode("FREE");   // false (case-sensitive)
 * ```
 */
export function isValidMode(mode: string): mode is Mode {
  return VALID_MODES.includes(mode as Mode);
}

/**
 * Format a summary message based on the review result
 *
 * @param result - The review prompt result
 * @returns Formatted summary message
 *
 * @example
 * ```typescript
 * formatSummaryMessage({ skipped: true, ... });
 * // "Review: SKIPPED"
 *
 * formatSummaryMessage({ reviewRan: true, mode: "good", summary: { tasksRun: 6, ... } });
 * // "Review: PASSED (good mode, 6 checks)"
 * ```
 */
export function formatSummaryMessage(result: ReviewPromptResult): string {
  if (result.skipped) {
    return "Review: SKIPPED";
  }
  if (result.cancelled) {
    return "Review: cancelled";
  }
  if (result.reviewRan && result.summary) {
    if (result.summary.tasksFailed > 0) {
      return `Review: FAILED (${result.summary.fixTasksGenerated} issues)`;
    }
    return `Review: PASSED (${result.mode} mode, ${result.summary.tasksRun} checks)`;
  }
  return "";
}

/**
 * Display mode-specific messages before running review
 *
 * @param mode - The selected mode
 * @param logger - Logger function
 * @param estimateCost - Optional cost estimator function
 */
function displayModeMessages(
  mode: Mode,
  logger: (message: string) => void,
  estimateCost?: (mode: Mode) => number
): void {
  if (mode === "free") {
    logger("Using free models - some checks may be less thorough");
  }
  if (mode === "genius" && estimateCost) {
    const cost = estimateCost(mode);
    logger(`Estimated review cost: $${cost.toFixed(2)}`);
  }
}

/**
 * Default cost estimator based on mode
 *
 * @param mode - The review mode
 * @returns Estimated cost in dollars
 */
export function defaultEstimateCost(mode: Mode): number {
  const costs: Record<Mode, number> = {
    free: 0,
    cheap: 0.01,
    good: 0.03,
    genius: 0.15,
  };
  return costs[mode];
}

/**
 * Prompt the user for review options and run the review
 *
 * This function handles the complete review prompt flow:
 * 1. Check for --skip-review flag (skips everything)
 * 2. Check for --review-mode flag (skips mode selection)
 * 3. In non-interactive mode, use default mode without prompting
 * 4. In interactive mode, prompt for confirmation and mode selection
 * 5. Display mode-specific messages
 * 6. Run the review and return results
 *
 * @param options - Review prompt options
 * @returns Review prompt result with summary message
 *
 * @example
 * ```typescript
 * // Skip review entirely
 * const result = await promptForReview({ skipReview: true });
 * // { reviewRan: false, skipped: true, summaryMessage: "Review: SKIPPED" }
 *
 * // Run with pre-selected mode
 * const result = await promptForReview({ reviewMode: "genius" });
 * // { reviewRan: true, mode: "genius", ... }
 *
 * // Interactive mode
 * const result = await promptForReview({
 *   readInput: async () => readline.createInterface(...).question(...),
 *   logger: console.log,
 *   runReview: async (mode) => runReview({ mode }),
 * });
 * ```
 */
export async function promptForReview(
  options: ReviewPromptOptions
): Promise<ReviewPromptResult> {
  const logger = options.logger || console.log;

  // Handle --skip-review flag (takes precedence over --review-mode)
  if (options.skipReview) {
    logger("⚠️ Skipping final review");
    return {
      reviewRan: false,
      skipped: true,
      cancelled: false,
      summaryMessage: "Review: SKIPPED",
    };
  }

  // Determine the mode to use
  let mode: Mode;

  if (options.reviewMode) {
    // --review-mode flag provided
    mode = options.reviewMode;
  } else if (options.nonInteractive) {
    // Non-interactive mode (CI/CD): use default mode
    mode = DEFAULT_MODE;
  } else if (options.readInput) {
    // Interactive mode: prompt for confirmation and mode
    try {
      // First prompt: Run review?
      logger("Run final review? [y/n]");
      const confirm = await options.readInput();
      const confirmLower = confirm.toLowerCase().trim();

      if (confirmLower === "n" || confirmLower === "no") {
        logger("⚠️ Skipping final review");
        return {
          reviewRan: false,
          skipped: true,
          cancelled: false,
          summaryMessage: "Review: SKIPPED",
        };
      }

      // Second prompt: Mode selection
      logger("Review mode? [free/cheap/good/genius] (default: good)");
      let selectedMode = await options.readInput();
      selectedMode = selectedMode.trim();

      // Re-prompt on invalid input
      while (selectedMode !== "" && !isValidMode(selectedMode)) {
        logger("Invalid mode. Please choose: free, cheap, good, or genius");
        logger("Review mode? [free/cheap/good/genius] (default: good)");
        selectedMode = await options.readInput();
        selectedMode = selectedMode.trim();
      }

      // Use default if empty, otherwise use selected mode
      mode = selectedMode === "" ? DEFAULT_MODE : (selectedMode as Mode);
    } catch {
      // Handle Ctrl+C or other interruption
      return {
        reviewRan: false,
        skipped: false,
        cancelled: true,
        summaryMessage: "Review: cancelled",
      };
    }
  } else {
    // No input method provided, use default
    mode = DEFAULT_MODE;
  }

  // Display mode-specific messages
  displayModeMessages(mode, logger, options.estimateCost);

  // Run the review
  if (!options.runReview) {
    // No review runner provided, return without running
    return {
      reviewRan: false,
      skipped: false,
      cancelled: false,
      mode,
      summaryMessage: formatSummaryMessage({
        reviewRan: false,
        skipped: false,
        cancelled: false,
        mode,
        summaryMessage: "",
      }),
    };
  }

  const summary = await options.runReview(mode);

  const result: ReviewPromptResult = {
    reviewRan: true,
    skipped: false,
    cancelled: false,
    mode,
    summary,
    summaryMessage: "",
  };

  result.summaryMessage = formatSummaryMessage(result);

  return result;
}
