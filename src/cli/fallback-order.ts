/**
 * CLI --fallback-order Flag Module
 *
 * Provides validation and help text for the `--fallback-order` CLI flag.
 * Used by the `relentless run` command to control harness fallback priority.
 *
 * Features:
 * - Fallback order validation (comma-separated harness names)
 * - Help text generation with descriptions
 * - Default fallback order handling
 * - Deduplication with warnings
 *
 * @module src/cli/fallback-order
 */

import type { HarnessName } from "../config/schema";

/**
 * Valid harness names for the --fallback-order flag
 */
export const VALID_HARNESSES: readonly HarnessName[] = [
  "claude",
  "codex",
  "droid",
  "opencode",
  "amp",
  "gemini",
];

/**
 * Default fallback order when --fallback-order flag is not provided
 *
 * Order: claude > codex > droid > opencode > amp > gemini
 * This order prioritizes Claude (most capable), then other paid options,
 * then free options like OpenCode and Amp.
 */
export const DEFAULT_FALLBACK_ORDER: readonly HarnessName[] = [
  "claude",
  "codex",
  "droid",
  "opencode",
  "amp",
  "gemini",
];

/**
 * Result of parsing fallback order flag
 */
export interface FallbackOrderResult {
  /** Whether the fallback order is valid */
  valid: boolean;
  /** The parsed fallback order (or default if undefined) */
  order?: HarnessName[];
  /** Error message if invalid */
  error?: string;
  /** Warning message (e.g., for duplicates) */
  warning?: string;
}

/**
 * Check if a string is a valid harness name
 *
 * @param value - The value to check
 * @returns True if the value is a valid harness name
 *
 * @example
 * ```typescript
 * isValidHarnessName("claude");   // true
 * isValidHarnessName("invalid");  // false
 * isValidHarnessName("CLAUDE");   // false (case-sensitive)
 * ```
 */
export function isValidHarnessName(value: string): value is HarnessName {
  return VALID_HARNESSES.includes(value as HarnessName);
}

/**
 * Parse and validate a fallback order flag value
 *
 * @param value - The value provided to --fallback-order flag (undefined if not provided)
 * @returns Parsed fallback order result with validation status
 *
 * @example
 * ```typescript
 * parseFallbackOrderValue("opencode,droid,claude");
 * // { valid: true, order: ["opencode", "droid", "claude"] }
 *
 * parseFallbackOrderValue(undefined);
 * // { valid: true, order: ["claude", "codex", "droid", "opencode", "amp", "gemini"] }
 *
 * parseFallbackOrderValue("invalid,claude");
 * // { valid: false, error: "Invalid harness: invalid. Valid harnesses: claude, codex, ..." }
 *
 * parseFallbackOrderValue("claude,claude,codex");
 * // { valid: true, order: ["claude", "codex"], warning: "Duplicate harnesses removed: claude" }
 * ```
 */
export function parseFallbackOrderValue(
  value: string | undefined
): FallbackOrderResult {
  // Handle undefined - use default order
  if (value === undefined) {
    return {
      valid: true,
      order: [...DEFAULT_FALLBACK_ORDER],
    };
  }

  // Trim whitespace
  const trimmed = value.trim();

  // Handle empty string
  if (trimmed === "") {
    return {
      valid: false,
      error: `Invalid fallback order: empty value. Valid harnesses: ${VALID_HARNESSES.join(", ")}`,
    };
  }

  // Split by comma and trim each harness name
  const harnesses = trimmed.split(",").map((h) => h.trim()).filter((h) => h !== "");

  // Check if we have any harnesses after filtering
  if (harnesses.length === 0) {
    return {
      valid: false,
      error: `Invalid fallback order: no valid harnesses found. Valid harnesses: ${VALID_HARNESSES.join(", ")}`,
    };
  }

  // Validate each harness name
  const invalidHarnesses: string[] = [];
  for (const harness of harnesses) {
    if (!isValidHarnessName(harness)) {
      invalidHarnesses.push(harness);
    }
  }

  if (invalidHarnesses.length > 0) {
    return {
      valid: false,
      error: `Invalid harness: "${invalidHarnesses.join(", ")}". Valid harnesses: ${VALID_HARNESSES.join(", ")}`,
    };
  }

  // Deduplicate and track removed duplicates
  const seen = new Set<HarnessName>();
  const uniqueHarnesses: HarnessName[] = [];
  const duplicates: string[] = [];

  for (const harness of harnesses as HarnessName[]) {
    if (seen.has(harness)) {
      duplicates.push(harness);
    } else {
      seen.add(harness);
      uniqueHarnesses.push(harness);
    }
  }

  const result: FallbackOrderResult = {
    valid: true,
    order: uniqueHarnesses,
  };

  // Add warning if duplicates were removed
  if (duplicates.length > 0) {
    result.warning = `Duplicate harnesses removed: ${duplicates.join(", ")}`;
  }

  return result;
}

/**
 * Get help text for the --fallback-order flag
 *
 * Generates formatted help text showing all harnesses and purpose,
 * suitable for display in CLI help output.
 *
 * @returns Multi-line help text for --fallback-order flag
 *
 * @example
 * ```typescript
 * console.log(getFallbackOrderHelpText());
 * // Fallback order for harness switching on rate limits:
 * //   Valid harnesses: claude, codex, droid, opencode, amp, gemini
 * //   Default: claude > codex > droid > opencode > amp > gemini
 * ```
 */
export function getFallbackOrderHelpText(): string {
  const lines = [
    "Fallback order for harness switching on rate limits:",
    `  Valid harnesses: ${VALID_HARNESSES.join(", ")}`,
    `  Default order: ${DEFAULT_FALLBACK_ORDER.join(" > ")}`,
  ];

  return lines.join("\n");
}

/**
 * Log fallback order selection to console
 *
 * @param order - The selected fallback order
 * @param logger - Logger function (defaults to console.log)
 */
export function logFallbackOrderSelection(
  order: HarnessName[],
  logger: (message: string) => void = console.log
): void {
  logger(`Fallback order: ${order.join(" > ")}`);
}
