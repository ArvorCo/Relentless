/**
 * CLI Review Control Flags Module
 *
 * Provides validation and help text for the `--skip-review` and `--review-mode` CLI flags.
 * Used by the `relentless run` command to control final review behavior.
 *
 * Features:
 * - --skip-review flag to bypass review entirely
 * - --review-mode flag with values: free, cheap, good, genius
 * - Mutual exclusivity validation between the two flags
 * - Help text generation with descriptions
 *
 * @module src/cli/review-flags
 */

import type { Mode } from "../config/schema";

/**
 * Valid review mode values for the --review-mode flag
 */
export const VALID_REVIEW_MODES: readonly Mode[] = ["free", "cheap", "good", "genius"];

/**
 * Default review mode when --review-mode flag is not provided
 */
export const DEFAULT_REVIEW_MODE: Mode = "good";

/**
 * Options for parsing review flags
 */
export interface ReviewFlagsOptions {
  /** Whether --skip-review flag is set */
  skipReview?: boolean;
  /** Value of --review-mode flag */
  reviewMode?: string;
}

/**
 * Result of parsing review flags
 */
export interface ReviewFlagsResult {
  /** Whether the flags are valid */
  valid: boolean;
  /** Whether review should be skipped */
  skipReview?: boolean;
  /** The parsed review mode (undefined if skipped) */
  reviewMode?: Mode;
  /** Error message if invalid */
  error?: string;
  /** Warning message (e.g., for skip) */
  warningMessage?: string;
}

/**
 * Check if a string is a valid review mode value
 *
 * @param value - The value to check
 * @returns True if the value is a valid review mode
 *
 * @example
 * ```typescript
 * isValidReviewMode("genius"); // true
 * isValidReviewMode("fast");   // false
 * isValidReviewMode("GOOD");   // false (case-sensitive)
 * ```
 */
export function isValidReviewMode(value: string): value is Mode {
  return VALID_REVIEW_MODES.includes(value as Mode);
}

/**
 * Parse and validate review control flags
 *
 * @param options - The --skip-review and --review-mode flag values
 * @returns Parsed review flags result with validation status
 *
 * @example
 * ```typescript
 * parseReviewFlagsValue({ skipReview: true });
 * // { valid: true, skipReview: true, warningMessage: "..." }
 *
 * parseReviewFlagsValue({ reviewMode: "genius" });
 * // { valid: true, skipReview: false, reviewMode: "genius" }
 *
 * parseReviewFlagsValue({ skipReview: true, reviewMode: "genius" });
 * // { valid: false, error: "--skip-review and --review-mode are mutually exclusive" }
 *
 * parseReviewFlagsValue({});
 * // { valid: true, skipReview: false, reviewMode: "good" } (uses default)
 * ```
 */
export function parseReviewFlagsValue(options: ReviewFlagsOptions): ReviewFlagsResult {
  const { skipReview, reviewMode } = options;

  // Check for mutual exclusivity
  if (skipReview && reviewMode !== undefined) {
    return {
      valid: false,
      error: `--skip-review and --review-mode are mutually exclusive. Use one or the other.`,
    };
  }

  // Handle --skip-review flag
  if (skipReview) {
    return {
      valid: true,
      skipReview: true,
      warningMessage: "Final review skipped. Quality checks not performed.",
    };
  }

  // Handle --review-mode flag
  if (reviewMode !== undefined) {
    const trimmed = reviewMode.trim();

    // Validate mode
    if (!isValidReviewMode(trimmed)) {
      return {
        valid: false,
        error: `Invalid review mode: "${trimmed}". Valid modes: ${VALID_REVIEW_MODES.join(", ")}`,
      };
    }

    return {
      valid: true,
      skipReview: false,
      reviewMode: trimmed,
    };
  }

  // Default behavior - use default review mode
  return {
    valid: true,
    skipReview: false,
    reviewMode: DEFAULT_REVIEW_MODE,
  };
}

/**
 * Get help text for the review control flags
 *
 * Generates formatted help text showing both flags with descriptions,
 * suitable for display in CLI help output.
 *
 * @returns Multi-line help text for review flags
 *
 * @example
 * ```typescript
 * console.log(getReviewFlagsHelpText());
 * // Review control flags:
 * //   --skip-review    Bypass final review entirely (not recommended)
 * //   --review-mode    Set review quality mode (free, cheap, good, genius)
 * //                    Default: good
 * //   Note: These flags are mutually exclusive
 * ```
 */
export function getReviewFlagsHelpText(): string {
  const lines = [
    "Review control flags:",
    "  --skip-review    Bypass final review entirely (not recommended)",
    `  --review-mode    Set review quality mode (${VALID_REVIEW_MODES.join(", ")})`,
    `                   Default: ${DEFAULT_REVIEW_MODE}`,
    "  Note: These flags are mutually exclusive",
  ];

  return lines.join("\n");
}

/**
 * Parsed review flags for logging
 */
export interface ReviewFlagsSelection {
  skipReview: boolean;
  reviewMode: Mode | undefined;
}

/**
 * Log review flags selection to console
 *
 * @param selection - The parsed review flags selection
 * @param logger - Logger function (defaults to console.log)
 */
export function logReviewFlagsSelection(
  selection: ReviewFlagsSelection,
  logger: (message: string) => void = console.log
): void {
  if (selection.skipReview) {
    logger("Review: SKIPPED (warning: quality checks not performed)");
  } else if (selection.reviewMode) {
    logger(`Review mode: ${selection.reviewMode}`);
  }
}
